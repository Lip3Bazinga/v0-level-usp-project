import { Injectable, Logger } from "@nestjs/common"
import type { ExamResult, ExamStart, ExamStatus, ExamSubmitInput } from "@levelusp/contracts"
import { AppError, Conflict, NotFound, Unprocessable } from "@/common/errors/app-error"
import type { AuthUser } from "@/common/http/request"
import { RateLimitService } from "@/common/rate-limit/rate-limit.service"
import {
  SUBMIT_GRACE_MS,
  acceptsSubmission,
  attemptExpiresAt,
  cooldownUntil,
  drawQuestions,
  examEligibility,
  gradeExam,
  isInProgress,
  questionsPerAttempt,
  summarizeAttempts,
} from "./exams.domain"
import { toAttemptLike, toExamQuestion, toRules } from "./exams.mapper"
import { ExamsRepository, type ExamRow } from "./exams.repository"

/** Início e envio da prova: 10 por hora por aluno (mesmo limite do sistema antigo). */
const EXAM_LIMIT = 10
const EXAM_WINDOW_MS = 60 * 60_000

@Injectable()
export class ExamsService {
  private readonly logger = new Logger(ExamsService.name)

  constructor(
    private readonly repo: ExamsRepository,
    private readonly rateLimit: RateLimitService,
  ) {}

  /** Status da prova: metadados, elegibilidade e tentativas. Nunca devolve questões. */
  async status(user: AuthUser, courseId: string, now = new Date()): Promise<ExamStatus> {
    const { exam } = await this.examOf(user, courseId)
    const [eligibility, attempts, activeCount] = await Promise.all([
      this.eligibility(user.id, courseId),
      this.repo.attempts(exam.id, user.id),
      this.repo.activeQuestionCount(exam.id),
    ])
    const s = summarizeAttempts(attempts.map(toAttemptLike), toRules(exam), now)
    return {
      exam: {
        title: exam.title,
        description: exam.description,
        passingScore: exam.passingScore,
        timeLimitMinutes: exam.timeLimitMinutes,
        cooldownMinutes: exam.cooldownMinutes,
        questionCount: questionsPerAttempt(activeCount, exam.questionsPerAttempt),
      },
      eligible: eligibility.eligible,
      lessonsRemaining: eligibility.remaining,
      lessonsTotal: eligibility.total,
      attemptsCount: s.attemptsCount,
      bestScore: s.bestScore,
      passed: s.passed,
      passedScore: s.passedScore,
      cooldownUntil: s.cooldownUntil,
      inProgressAttemptId: s.inProgress?.id ?? null,
      inProgressExpiresAt: s.inProgress?.expiresAt ?? null,
    }
  }

  /** Inicia uma tentativa (ou retoma a aberta). Questões vão SEM gabarito. */
  async start(user: AuthUser, courseId: string): Promise<ExamStart> {
    this.rateLimit.consume(`exam-start:${user.id}`, EXAM_LIMIT, EXAM_WINDOW_MS, "Muitas tentativas de iniciar a prova. Aguarde alguns minutos.")
    const { exam } = await this.examOf(user, courseId)
    const eligibility = await this.eligibility(user.id, courseId)
    if (!eligibility.eligible) {
      throw new AppError(403, "NOT_ELIGIBLE", `Conclua todas as lições antes da prova (faltam ${eligibility.remaining}).`)
    }
    const rules = toRules(exam)

    return this.repo.transaction(async (tx) => {
      await this.repo.lockAttempts(tx, user.id, exam.id)
      const now = new Date()
      const rows = await this.repo.attempts(exam.id, user.id, tx)
      const attempts = rows.map(toAttemptLike)

      if (attempts.some((a) => a.submittedAt !== null && a.passed)) throw Conflict("Você já foi aprovado nesta prova.", "ALREADY_PASSED")
      const cooldown = cooldownUntil(attempts, rules, now)
      if (cooldown) {
        throw new AppError(429, "COOLDOWN", `Aguarde o intervalo entre tentativas. Nova tentativa liberada em ${cooldown.toISOString()}.`, [
          { path: "cooldownUntil", message: cooldown.toISOString() },
        ])
      }

      // Retoma a tentativa aberta, com as mesmas questões e na mesma ordem.
      const open = attempts.find((a) => isInProgress(a, rules, now))
      if (open) {
        const questionIds = rows.find((r) => r.id === open.id)?.questionIds ?? []
        const questions = await this.repo.publicQuestions(exam.id, questionIds, tx)
        return {
          attemptId: open.id,
          expiresAt: attemptExpiresAt(open, rules).toISOString(),
          timeLimitMinutes: exam.timeLimitMinutes,
          questions: questions.map(toExamQuestion),
          resumed: true,
        }
      }

      // Abandonadas além da tolerância viram reprovação registrada.
      await this.repo.closeStaleAttempts(tx, exam.id, user.id, exam.timeLimitMinutes, new Date(now.getTime() - exam.timeLimitMinutes * 60_000 - SUBMIT_GRACE_MS))

      const pool = await this.repo.activeQuestionIds(exam.id, tx)
      if (!pool.length) throw Unprocessable("Esta prova ainda não tem questões cadastradas.", "NO_QUESTIONS")
      const drawn = drawQuestions(pool, exam.questionsPerAttempt)
      const created = toAttemptLike(await this.repo.insertAttempt(tx, exam.id, user.id, drawn))
      const questions = await this.repo.publicQuestions(exam.id, drawn, tx)
      this.logger.log({ userId: user.id, examId: exam.id, attemptId: created.id, questions: drawn.length }, "tentativa de prova iniciada")
      return {
        attemptId: created.id,
        expiresAt: attemptExpiresAt(created, rules).toISOString(),
        timeLimitMinutes: exam.timeLimitMinutes,
        questions: questions.map(toExamQuestion),
        resumed: false,
      }
    })
  }

  /** Corrige no servidor, só sobre as questões sorteadas para a tentativa. */
  async submit(user: AuthUser, courseId: string, input: ExamSubmitInput): Promise<ExamResult> {
    this.rateLimit.consume(`exam-submit:${user.id}`, EXAM_LIMIT, EXAM_WINDOW_MS, "Muitos envios de prova seguidos. Aguarde alguns minutos.")
    const { exam } = await this.examOf(user, courseId)
    const row = await this.repo.findAttempt(input.attemptId, user.id, exam.id)
    if (!row) throw NotFound("Tentativa")
    const attempt = toAttemptLike(row)
    const rules = toRules(exam)
    if (attempt.submittedAt !== null) throw Conflict("Esta tentativa já foi enviada.", "ALREADY_SUBMITTED")

    if (!acceptsSubmission(attempt, rules, new Date())) {
      // Expirada: nota 0 e cooldown normal a partir do fim do prazo.
      await this.repo.finalizeAttempt(row.id, { answers: {}, score: 0, passed: false, submittedAt: attemptExpiresAt(attempt, rules).toISOString() })
      throw Conflict("Tempo esgotado — a tentativa expirou. Tente novamente.", "EXAM_EXPIRED")
    }

    const questions = await this.repo.questionsForGrading(exam.id, row.questionIds)
    if (!questions.length) throw Unprocessable("Esta tentativa não tem questões válidas.", "NO_QUESTIONS")
    const graded = gradeExam(questions, input.answers, exam.passingScore)

    const saved = await this.repo.finalizeAttempt(row.id, { answers: graded.answers, score: graded.score, passed: graded.passed })
    if (!saved) throw Conflict("Esta tentativa já foi enviada.", "ALREADY_SUBMITTED")
    this.logger.log({ userId: user.id, examId: exam.id, attemptId: row.id, score: graded.score, passed: graded.passed }, "prova corrigida")

    if (graded.passed) await this.notifyPassed(user.id, courseId, graded.score)

    return {
      score: graded.score,
      passed: graded.passed,
      passingScore: exam.passingScore,
      correctCount: graded.correctCount,
      total: graded.total,
      // Correção por questão só após aprovar: antes disso, revelar quais
      // questões estão certas vaza o gabarito entre tentativas.
      review: graded.passed ? graded.review : [],
    }
  }

  /**
   * Condições do certificado (usado pelo módulo de certificados): todas as
   * lições publicadas concluídas (inclui o projeto final) e prova aprovada.
   */
  async certificateRequirements(user: AuthUser, courseId: string) {
    const course = await this.visibleCourse(user, courseId)
    const lessons = await this.repo.publishedLessons(courseId)
    const done = await this.repo.completedAmong(user.id, lessons.map((l) => l.id))
    const remaining = lessons.filter((l) => !done.has(l.id)).length
    const exam = await this.repo.findActiveExamByCourse(courseId)
    const passed = exam ? await this.repo.passedAttempt(exam.id, user.id) : null
    return {
      course,
      lessonsTotal: lessons.length,
      lessonsRemaining: remaining,
      hasExam: Boolean(exam),
      passedScore: passed ? Number(passed.score ?? 0) : null,
    }
  }

  /** Curso visível + prova ativa; 404 genérico caso contrário. */
  private async examOf(user: AuthUser, courseId: string): Promise<{ exam: ExamRow }> {
    await this.visibleCourse(user, courseId)
    const exam = await this.repo.findActiveExamByCourse(courseId)
    if (!exam) throw NotFound("Prova final deste curso")
    return { exam }
  }

  /** Curso publicado para todos; rascunho só para o autor e admins. */
  private async visibleCourse(user: AuthUser, courseId: string) {
    const course = await this.repo.findCourse(courseId)
    if (!course) throw NotFound("Curso")
    if (!course.published && course.createdBy !== user.id && user.role !== "admin") throw NotFound("Curso")
    return course
  }

  private async eligibility(userId: string, courseId: string) {
    const lessons = await this.repo.publishedLessons(courseId)
    const done = await this.repo.completedAmong(userId, lessons.map((l) => l.id))
    return examEligibility(lessons, done)
  }

  /** Notificação é melhor-esforço: nunca derruba a resposta da correção. */
  private async notifyPassed(userId: string, courseId: string, score: number) {
    try {
      const lessons = await this.repo.publishedLessons(courseId)
      const done = await this.repo.completedAmong(userId, lessons.map((l) => l.id))
      const pending = lessons.some((l) => !done.has(l.id))
      const next = pending ? "Agora conclua o projeto final para emitir seu certificado." : "Seu certificado já pode ser emitido."
      await this.repo.notify({
        userId,
        title: "Prova aprovada! 🎉",
        body: `Você tirou ${score.toLocaleString("pt-BR")} na prova final. ${next}`,
        kind: "success",
        href: `/cursos/${courseId}`,
      })
    } catch (err) {
      this.logger.warn({ err, userId, courseId }, "falha ao notificar aprovação na prova")
    }
  }
}
