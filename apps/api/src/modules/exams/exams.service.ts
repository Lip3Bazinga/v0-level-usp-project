import { Injectable, Logger } from "@nestjs/common"
import type { ExamResult, ExamStart, ExamStatus, ExamSubmitInput } from "@levelusp/contracts"
import type { ExamRow, DbTransaction } from "@levelusp/db"
import { canViewContent } from "@/common/authorization/ownership"
import { Conflict, Forbidden, NotFound, TooManyRequests, Unprocessable } from "@/common/errors/app-error"
import type { AuthUser } from "@/common/http/request"
import { RATE_LIMITS } from "@/common/rate-limit/rate-limit.policies"
import { RateLimitService } from "@/common/rate-limit/rate-limit.service"
import { TransactionRunner } from "@/infra/database/database.module"
import { NotificationsService } from "../notifications/notifications.service"
import {
  acceptsSubmission, attemptExpiresAt, cooldownUntil, drawQuestions, examEligibility, gradeExam, isInProgress,
  questionsPerAttempt, staleAttemptCutoff, summarizeAttempts, type AttemptLike, type ExamEligibility, type LessonForEligibility,
} from "./exams.domain"
import { toAttemptLike, toExamStart, toRules } from "./exams.mapper"
import { ExamsRepository, type ExamCourseRow } from "./exams.repository"

export interface CertificateRequirements {
  course: { id: string; title: string }
  lessonsTotal: number
  lessonsRemaining: number
  hasExam: boolean
  /** Nota da melhor tentativa aprovada; null se ainda não foi aprovado. */
  passedScore: number | null
}

interface CourseCompletion {
  lessons: LessonForEligibility[]
  completed: Set<string>
}

@Injectable()
export class ExamsService {
  private readonly logger = new Logger(ExamsService.name)

  constructor(
    private readonly repo: ExamsRepository,
    private readonly transactions: TransactionRunner,
    private readonly notifications: NotificationsService,
    private readonly rateLimit: RateLimitService,
  ) {}

  /** Status da prova: metadados, elegibilidade e tentativas. Nunca devolve questões. */
  async getStatus(user: AuthUser, courseId: string, now = new Date()): Promise<ExamStatus> {
    const exam = await this.findExamOf(user, courseId)
    const [eligibility, attempts, activeCount] = await Promise.all([
      this.eligibility(user.id, courseId),
      this.repo.listAttempts({ examId: exam.id, userId: user.id }),
      this.repo.countActiveQuestions(exam.id),
    ])
    const summary = summarizeAttempts(attempts.map(toAttemptLike), toRules(exam), now)
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
      attemptsCount: summary.attemptsCount,
      bestScore: summary.bestScore,
      passed: summary.passed,
      passedScore: summary.passedScore,
      cooldownUntil: summary.cooldownUntil,
      inProgressAttemptId: summary.inProgress?.id ?? null,
      inProgressExpiresAt: summary.inProgress?.expiresAt ?? null,
    }
  }

  /** Inicia uma tentativa (ou retoma a aberta). Questões vão SEM gabarito. */
  async start(user: AuthUser, courseId: string): Promise<ExamStart> {
    this.rateLimit.consume(RATE_LIMITS.examStart, user.id)
    const exam = await this.findExamOf(user, courseId)
    const eligibility = await this.eligibility(user.id, courseId)
    if (!eligibility.eligible) throw Forbidden(`Conclua todas as lições antes da prova (faltam ${eligibility.remaining}).`, "NOT_ELIGIBLE")

    return this.transactions.run(async (tx: DbTransaction) => {
      const owner = { examId: exam.id, userId: user.id }
      await this.repo.lockAttempts(owner, tx)
      const now = new Date()
      const attemptRows = await this.repo.listAttempts(owner, tx)
      const attempts = attemptRows.map(toAttemptLike)
      this.assertCanStart(attempts, exam, now)

      // Retoma a tentativa aberta, com as mesmas questões e na mesma ordem.
      const open = attempts.find((attempt) => isInProgress(attempt, exam, now))
      if (open) {
        const questionIds = attemptRows.find((attemptRow) => attemptRow.id === open.id)?.questionIds ?? []
        return toExamStart({ attempt: open, exam, questions: await this.repo.listPublicQuestions(exam.id, questionIds, tx), resumed: true })
      }
      return this.createAttempt(user, exam, now, tx)
    })
  }

  /** Corrige no servidor, só sobre as questões sorteadas para a tentativa. */
  async submit(user: AuthUser, courseId: string, input: ExamSubmitInput): Promise<ExamResult> {
    this.rateLimit.consume(RATE_LIMITS.examSubmission, user.id)
    const exam = await this.findExamOf(user, courseId)
    const attemptRow = await this.repo.findAttempt(input.attemptId, { examId: exam.id, userId: user.id })
    if (!attemptRow) throw NotFound("Tentativa")
    const attempt = toAttemptLike(attemptRow)
    if (attempt.submittedAt !== null) throw Conflict("Esta tentativa já foi enviada.", "ALREADY_SUBMITTED")

    if (!acceptsSubmission(attempt, exam, new Date())) {
      // Expirada: nota 0 e cooldown normal a partir do fim do prazo.
      await this.repo.finalizeAttempt(attemptRow.id, { answers: {}, score: 0, passed: false, submittedAt: attemptExpiresAt(attempt, exam).toISOString() })
      throw Conflict("Tempo esgotado — a tentativa expirou. Tente novamente.", "EXAM_EXPIRED")
    }

    const questions = await this.repo.listQuestionsForGrading(exam.id, attemptRow.questionIds)
    if (!questions.length) throw Unprocessable("Esta tentativa não tem questões válidas.", "NO_QUESTIONS")
    const examGrade = gradeExam(questions, input.answers, exam.passingScore)

    const saved = await this.repo.finalizeAttempt(attemptRow.id, { answers: examGrade.answers, score: examGrade.score, passed: examGrade.passed })
    if (!saved) throw Conflict("Esta tentativa já foi enviada.", "ALREADY_SUBMITTED")
    this.logger.log({ userId: user.id, examId: exam.id, attemptId: attemptRow.id, score: examGrade.score, passed: examGrade.passed }, "prova corrigida")

    if (examGrade.passed) await this.notifyPassed(user.id, courseId, examGrade.score)

    return {
      score: examGrade.score,
      passed: examGrade.passed,
      passingScore: exam.passingScore,
      correctCount: examGrade.correctCount,
      total: examGrade.total,
      // Correção por questão só após aprovar: antes disso, revelar quais
      // questões estão certas vaza o gabarito entre tentativas.
      review: examGrade.passed ? examGrade.review : [],
    }
  }

  /**
   * Condições do certificado (usado pelo módulo de certificados): todas as
   * lições publicadas concluídas (inclui o projeto final) e prova aprovada.
   */
  async getCertificateRequirements(user: AuthUser, courseId: string): Promise<CertificateRequirements> {
    const course = await this.findVisibleCourse(user, courseId)
    const { lessons, completed } = await this.courseCompletion(user.id, courseId)
    const exam = await this.repo.findActiveExamByCourse(courseId)
    const passed = exam ? await this.repo.findPassedAttempt({ examId: exam.id, userId: user.id }) : null
    return {
      course,
      lessonsTotal: lessons.length,
      lessonsRemaining: lessons.filter((lesson) => !completed.has(lesson.id)).length,
      hasExam: Boolean(exam),
      passedScore: passed ? Number(passed.score ?? 0) : null,
    }
  }

  private assertCanStart(attempts: AttemptLike[], exam: ExamRow, now: Date): void {
    if (attempts.some((attempt) => attempt.submittedAt !== null && attempt.passed)) throw Conflict("Você já foi aprovado nesta prova.", "ALREADY_PASSED")
    const cooldown = cooldownUntil(attempts, exam, now)
    if (!cooldown) return
    const until = cooldown.toISOString()
    throw TooManyRequests(`Aguarde o intervalo entre tentativas. Nova tentativa liberada em ${until}.`, "COOLDOWN", [{ path: "cooldownUntil", message: until }])
  }

  private async createAttempt(user: AuthUser, exam: ExamRow, now: Date, tx: DbTransaction): Promise<ExamStart> {
    const owner = { examId: exam.id, userId: user.id }
    // Abandonadas além da tolerância viram reprovação registrada.
    await this.repo.closeStaleAttempts({ ...owner, timeLimitMinutes: exam.timeLimitMinutes, startedBefore: staleAttemptCutoff(exam, now) }, tx)

    const pool = await this.repo.listActiveQuestionIds(exam.id, tx)
    if (!pool.length) throw Unprocessable("Esta prova ainda não tem questões cadastradas.", "NO_QUESTIONS")
    const drawn = drawQuestions(pool, exam.questionsPerAttempt)
    const created = toAttemptLike(await this.repo.createAttempt({ ...owner, questionIds: drawn }, tx))
    const questions = await this.repo.listPublicQuestions(exam.id, drawn, tx)
    this.logger.log({ userId: user.id, examId: exam.id, attemptId: created.id, questions: drawn.length }, "tentativa de prova iniciada")
    return toExamStart({ attempt: created, exam, questions, resumed: false })
  }

  /** Curso visível + prova ativa; 404 genérico caso contrário. */
  private async findExamOf(user: AuthUser, courseId: string): Promise<ExamRow> {
    await this.findVisibleCourse(user, courseId)
    const exam = await this.repo.findActiveExamByCourse(courseId)
    if (!exam) throw NotFound("Prova final deste curso")
    return exam
  }

  /** Curso publicado para todos; rascunho só para o autor e admins. */
  private async findVisibleCourse(user: AuthUser, courseId: string): Promise<ExamCourseRow> {
    const course = await this.repo.findCourse(courseId)
    if (!course || !canViewContent(user, course)) throw NotFound("Curso")
    return course
  }

  private async courseCompletion(userId: string, courseId: string): Promise<CourseCompletion> {
    const lessons = await this.repo.listPublishedLessons(courseId)
    const completed = await this.repo.listCompletedLessonIds(userId, lessons.map((lesson) => lesson.id))
    return { lessons, completed }
  }

  private async eligibility(userId: string, courseId: string): Promise<ExamEligibility> {
    const { lessons, completed } = await this.courseCompletion(userId, courseId)
    return examEligibility(lessons, completed)
  }

  /** Notificação é melhor-esforço: nunca derruba a resposta da correção. */
  private async notifyPassed(userId: string, courseId: string, score: number): Promise<void> {
    try {
      const { lessons, completed } = await this.courseCompletion(userId, courseId)
      const hasPendingLessons = lessons.some((lesson) => !completed.has(lesson.id))
      const nextStep = hasPendingLessons ? "Agora conclua o projeto final para emitir seu certificado." : "Seu certificado já pode ser emitido."
      await this.notifications.notify(userId, {
        title: "Prova aprovada! 🎉",
        body: `Você tirou ${score.toLocaleString("pt-BR")} na prova final. ${nextStep}`,
        kind: "success",
        href: `/cursos/${courseId}`,
      })
    } catch (error) {
      this.logger.warn({ err: error, userId, courseId }, "falha ao notificar aprovação na prova")
    }
  }
}
