import { Injectable } from "@nestjs/common"
import {
  assembleParsonsCode, DEFAULT_ENTRY_FILE,
  type HintReveal, type LessonStepsProgress, type ProjectFile, type SolutionReveal, type StepCompleteResult, type StepKind, type StepPredictResult,
  type StepQuizResult, type StepSubmitInput, type StepSubmitResult,
} from "@levelusp/contracts"
import type { LessonStepProgressRow, LessonStepRow } from "@levelusp/db"
import { canViewContent } from "@/common/authorization/ownership"
import { BadRequest, Conflict, Forbidden, NotFound } from "@/common/errors/app-error"
import type { AuthUser } from "@/common/http/request"
import { RATE_LIMITS } from "@/common/rate-limit/rate-limit.policies"
import { RateLimitService } from "@/common/rate-limit/rate-limit.service"
import { LessonStepsRepository } from "../catalog/lesson-steps.repository"
import { EventsService } from "../experiment/events.service"
import { GamificationService, type StepCompletionOutcome } from "../gamification/gamification.service"
import { hasEntryFile } from "./learning.domain"
import { findBlockingStep, gradeStepQuiz, isSolutionAvailable, matchesPrediction, toStepCases } from "./steps.domain"
import { toLessonStepProgress, toStepOutcome } from "./steps.mapper"
import { StepsRepository, type GuidedLessonRow } from "./steps.repository"
import { SubmissionGrader } from "./submission-grader"

const STEP_KIND_LABELS: Readonly<Record<StepKind, string>> = { leitura: "de leitura", exercicio: "de exercício", quiz: "de quiz", previsao: "de previsão" }
/** Passos que têm solução a revelar: os arquivos do exercício ou a saída esperada da previsão. */
const STEPS_WITH_SOLUTION: readonly StepKind[] = ["exercicio", "previsao"]

/** Lição, passo e progresso já validados para uma ação do aluno. */
interface StepContext {
  lesson: GuidedLessonRow
  step: LessonStepRow
  progress: LessonStepProgressRow | undefined
}

/**
 * Lição guiada em passos (formato Codecademy): verificar exercício, prever a saída de um
 * código, revelar dica, ver a solução depois das tentativas, concluir leitura e responder quiz. Todo veredito é do
 * servidor; XP e conclusão passam pelo `GamificationService`.
 */
@Injectable()
export class StepsService {
  constructor(
    private readonly repo: StepsRepository,
    private readonly steps: LessonStepsRepository,
    private readonly grader: SubmissionGrader,
    private readonly gamification: GamificationService,
    private readonly rateLimit: RateLimitService,
    private readonly events: EventsService,
  ) {}

  /**
   * Progresso do usuário na lição, passo a passo.
   *
   * @throws AppError 404 lição inexistente ou rascunho de outra pessoa.
   */
  async getMyProgress(user: AuthUser, lessonId: string): Promise<LessonStepsProgress> {
    await this.findVisibleLesson(user, lessonId)
    const [status, progress] = await Promise.all([this.repo.findLessonStatus(user.id, lessonId), this.repo.listProgress(user.id, lessonId)])
    return { lesson_id: lessonId, status: status ?? "not_started", steps: progress.map(toLessonStepProgress) }
  }

  /**
   * "Verificar" de um passo de exercício: corrige só os casos do passo, no motor da lição.
   * Aprovado conclui o passo (XP pela metade se a solução foi vista) e, se era o último,
   * a lição. Reprovado soma uma tentativa; falha do executor (503) não soma. No exercício
   * `ordenar` o corpo traz `arrangement` e o servidor monta o `main.py` só com as linhas do passo.
   *
   * @throws AppError 404 lição/passo; 400 passo de outro tipo, projeto sem `main.py`, `WRONG_SUBMISSION_FORMAT`
   *         (corpo que não é o do modo do exercício) ou `INVALID_ARRANGEMENT` (linha inexistente ou repetida);
   *         409 `STEP_LOCKED`; 403 `PROJECT_LOCKED`; 429 limites; 503 executor indisponível.
   */
  async submit(user: AuthUser, lessonId: string, stepId: string, input: StepSubmitInput): Promise<StepSubmitResult> {
    const { lesson, step, progress } = await this.loadContext(user, lessonId, stepId, ["exercicio"])
    const files = submittedFiles(step, input)
    if (!hasEntryFile(files)) throw BadRequest("O projeto precisa de um arquivo main.py.")
    const { result } = await this.grader.grade({
      userId: user.id, lessonId, stepId, files, testCases: step.testCases, engine: { runtime: lesson.runtime, libraries: lesson.libraries },
    })

    const outcome = result.allPassed ? await this.gamification.completeStep(user.id, stepId, lesson.published) : null
    const attempts = result.allPassed ? (progress?.attempts ?? 0) : await this.repo.incrementAttempts(user.id, stepId)
    await this.events.record(user.id, "step_submitted", { lesson_id: lessonId, step_id: stepId, passed: result.allPassed, attempts })
    await this.recordCompletion(user.id, lessonId, stepId, outcome)
    return {
      ...toStepOutcome(outcome),
      step_id: stepId,
      passed: result.allPassed,
      cases: toStepCases(result.cases, step.testCases),
      attempts,
      solution_available: isSolutionAvailable(attempts, lesson.solutionAfterAttempts),
    }
  }

  /**
   * Passo de previsão: compara a saída digitada com a esperada (ignorando espaços no fim das
   * linhas e linhas em branco no fim). Acertou conclui o passo (metade do XP se a saída esperada
   * foi vista); errou soma uma tentativa. A resposta não traz a saída esperada nem as diferenças.
   *
   * @throws AppError 404 lição/passo; 400 `WRONG_STEP_KIND`; 409 `STEP_LOCKED`; 403 `PROJECT_LOCKED`; 429 limites.
   */
  async predict(user: AuthUser, lessonId: string, stepId: string, output: string): Promise<StepPredictResult> {
    this.rateLimit.consume(RATE_LIMITS.predictionSubmission, user.id)
    const { lesson, step, progress } = await this.loadContext(user, lessonId, stepId, ["previsao"])
    this.rateLimit.consume(RATE_LIMITS.predictionPerStepDay, `${user.id}:${stepId}`)
    // Passo sem gabarito gravado (não deveria existir: o schema exige) nunca aprova.
    const passed = step.expectedOutput.trim() !== "" && matchesPrediction(step.expectedOutput, output)
    const outcome = passed ? await this.gamification.completeStep(user.id, stepId, lesson.published) : null
    const attempts = passed ? (progress?.attempts ?? 0) : await this.repo.incrementAttempts(user.id, stepId)
    await this.events.record(user.id, "step_submitted", { lesson_id: lessonId, step_id: stepId, kind: "previsao", passed, attempts })
    await this.recordCompletion(user.id, lessonId, stepId, outcome)
    return { ...toStepOutcome(outcome), step_id: stepId, passed, attempts, solution_available: isSolutionAvailable(attempts, lesson.solutionAfterAttempts) }
  }

  /**
   * Revela a próxima dica do passo (uma por chamada).
   *
   * @throws AppError 404 lição/passo; 409 `STEP_LOCKED` ou `NO_MORE_HINTS` quando todas já foram reveladas.
   */
  async revealHint(user: AuthUser, lessonId: string, stepId: string): Promise<HintReveal> {
    this.rateLimit.consume(RATE_LIMITS.stepReveal, user.id)
    const { step } = await this.loadContext(user, lessonId, stepId)
    const index = await this.repo.revealNextHint(user.id, stepId, step.hints.length)
    const text = index === null ? undefined : step.hints[index]
    if (index === null || text === undefined) throw Conflict("Este passo não tem mais dicas.", "NO_MORE_HINTS")
    await this.events.record(user.id, "hint_revealed", { lesson_id: lessonId, step_id: stepId, index })
    return { index, text }
  }

  /**
   * Dicas que o usuário já revelou neste passo (para a tela reabrir com elas).
   *
   * @throws AppError 404 lição/passo.
   */
  async listRevealedHints(user: AuthUser, lessonId: string, stepId: string): Promise<HintReveal[]> {
    await this.findVisibleLesson(user, lessonId)
    const step = await this.steps.findInLesson(lessonId, stepId)
    if (!step) throw NotFound("Passo")
    const revealed = (await this.repo.findProgress(user.id, stepId))?.hintsRevealed ?? 0
    return step.hints.slice(0, revealed).map((text, index) => ({ index, text }))
  }

  /**
   * Solução de referência do passo: só depois de `solution_after_attempts` verificações
   * reprovadas (0 = nunca) ou com o passo já concluído. Ver antes de concluir marca
   * `solution_viewed` (o passo passa a valer metade do XP) e NÃO conclui o passo. No exercício
   * saem os arquivos da solução; na previsão, a saída esperada (o aluno ainda precisa enviá-la).
   *
   * @throws AppError 404 lição/passo; 400 passo sem solução (leitura, quiz); 409 `STEP_LOCKED`; 403 `SOLUTION_LOCKED`.
   */
  async revealSolution(user: AuthUser, lessonId: string, stepId: string): Promise<SolutionReveal> {
    this.rateLimit.consume(RATE_LIMITS.stepReveal, user.id)
    const { lesson, step, progress } = await this.loadContext(user, lessonId, stepId, STEPS_WITH_SOLUTION)
    const isCompleted = progress?.status === "completed"
    if (!isCompleted && !progress?.solutionViewed && !isSolutionAvailable(progress?.attempts ?? 0, lesson.solutionAfterAttempts)) {
      throw Forbidden(solutionLockedMessage(progress?.attempts ?? 0, lesson.solutionAfterAttempts), "SOLUTION_LOCKED")
    }
    if (!isCompleted && !progress?.solutionViewed) {
      await this.repo.markSolutionViewed(user.id, stepId)
      await this.events.record(user.id, "solution_viewed", { lesson_id: lessonId, step_id: stepId, attempts: progress?.attempts ?? 0 })
    }
    return step.kind === "previsao" ? { files: [], expected_output: step.expectedOutput } : { files: step.solutionFiles, expected_output: null }
  }

  /**
   * Conclui um passo de leitura (não há avaliação: concluir = ter lido).
   *
   * @throws AppError 404 lição/passo; 400 passo de outro tipo; 409 `STEP_LOCKED`; 403 `PROJECT_LOCKED`.
   */
  async complete(user: AuthUser, lessonId: string, stepId: string): Promise<StepCompleteResult> {
    this.rateLimit.consume(RATE_LIMITS.theoryCompletion, user.id)
    const { lesson } = await this.loadContext(user, lessonId, stepId, ["leitura"])
    const outcome = await this.gamification.completeStep(user.id, stepId, lesson.published)
    await this.recordCompletion(user.id, lessonId, stepId, outcome)
    return { ...toStepOutcome(outcome), step_id: stepId }
  }

  /**
   * Corrige o quiz do passo; aprovado (nota ≥ `quiz_passing_score` da lição) conclui o passo.
   *
   * @throws AppError 404 lição/passo; 400 passo de outro tipo; 409 `STEP_LOCKED`; 403 `PROJECT_LOCKED`; 429 limite.
   */
  async submitQuiz(user: AuthUser, lessonId: string, stepId: string, answers: number[]): Promise<StepQuizResult> {
    this.rateLimit.consume(RATE_LIMITS.quizSubmission, user.id)
    const { lesson, step } = await this.loadContext(user, lessonId, stepId, ["quiz"])
    const grade = gradeStepQuiz(step.quizQuestions, answers, lesson.quizPassingScore)
    const outcome = grade.passed ? await this.gamification.completeStep(user.id, stepId, lesson.published) : null
    if (!grade.passed) await this.repo.incrementAttempts(user.id, stepId)
    await this.events.record(user.id, "quiz_answered", { lesson_id: lessonId, step_id: stepId, score: grade.score, passed: grade.passed })
    await this.recordCompletion(user.id, lessonId, stepId, outcome)
    return {
      ...toStepOutcome(outcome),
      step_id: stepId,
      score: grade.score,
      passed: grade.passed,
      passing_score: lesson.quizPassingScore,
      correct_count: grade.correctCount,
      total: grade.total,
      review: grade.review,
    }
  }

  /** Eventos do experimento de uma conclusão nova (reenvio de passo já concluído não gera evento). */
  private async recordCompletion(userId: string, lessonId: string, stepId: string, outcome: StepCompletionOutcome | null): Promise<void> {
    if (!outcome?.newlyCompleted) return
    await this.events.record(userId, "step_completed", { lesson_id: lessonId, step_id: stepId, xp: outcome.xpAwarded })
    if (outcome.lessonCompleted) await this.events.record(userId, "lesson_completed", { lesson_id: lessonId })
  }

  /**
   * Valida a ação: lição visível, passo da lição (e de um dos tipos esperados), projeto liberado e
   * passos anteriores concluídos. Depois matricula o aluno no curso e marca a lição como iniciada.
   */
  private async loadContext(user: AuthUser, lessonId: string, stepId: string, expectedKinds?: readonly StepKind[]): Promise<StepContext> {
    const lesson = await this.findVisibleLesson(user, lessonId)
    const steps = await this.steps.listByLesson(lessonId)
    const step = steps.find((candidate) => candidate.id === stepId)
    if (!step) throw NotFound("Passo")
    if (expectedKinds && !expectedKinds.includes(step.kind)) {
      throw BadRequest(`Este passo não é ${expectedKinds.map((kind) => STEP_KIND_LABELS[kind]).join(" nem ")}.`, "WRONG_STEP_KIND")
    }
    await this.assertProjectUnlocked(user.id, lesson)

    const progress = await this.repo.listProgress(user.id, lessonId)
    const completedIds = new Set(progress.filter((item) => item.status === "completed").map((item) => item.stepId))
    const blocking = findBlockingStep(steps, completedIds, step)
    if (blocking) throw Conflict(`Conclua antes o passo ${blocking.order} (${blocking.title}).`, "STEP_LOCKED")

    if (lesson.published) {
      if (lesson.courseId) await this.repo.enroll(user.id, lesson.courseId)
      await this.repo.markLessonStarted(user.id, lessonId)
    }
    return { lesson, step, progress: progress.find((item) => item.stepId === stepId) }
  }

  /** O projeto do nível só abre com as demais lições publicadas do curso concluídas. */
  private async assertProjectUnlocked(userId: string, lesson: GuidedLessonRow): Promise<void> {
    if (!lesson.isProject || !lesson.courseId || !lesson.published) return
    const pending = await this.repo.countPendingLessonsBeforeProject(userId, lesson.courseId, lesson.id)
    if (pending > 0) throw Forbidden(`Conclua as outras lições do curso antes do projeto (faltam ${pending}).`, "PROJECT_LOCKED")
  }

  /** Publicada para todos; rascunho só para o autor e admins. */
  private async findVisibleLesson(user: AuthUser, lessonId: string): Promise<GuidedLessonRow> {
    const lesson = await this.repo.findLesson(lessonId)
    if (!lesson || !canViewContent(user, lesson)) throw NotFound("Lição")
    return lesson
  }
}

/**
 * Projeto a corrigir conforme o modo do exercício: `ordenar` aceita só `arrangement` (o código
 * é montado com as linhas do passo, então o aluno não envia texto livre); os demais, só `files`.
 */
function submittedFiles(step: LessonStepRow, input: StepSubmitInput): ProjectFile[] {
  if (step.exerciseMode !== "ordenar") {
    if (!input.files) throw BadRequest("Este exercício é corrigido pelo código: envie os arquivos do projeto.", "WRONG_SUBMISSION_FORMAT")
    return input.files
  }
  if (!input.arrangement) throw BadRequest("Este exercício é de ordenar: envie as linhas na ordem escolhida.", "WRONG_SUBMISSION_FORMAT")
  const content = assembleParsonsCode(step.parsonsLines, input.arrangement)
  if (content === null) throw BadRequest("A ordem enviada cita uma linha que não é deste passo ou repete uma linha.", "INVALID_ARRANGEMENT")
  return [{ path: DEFAULT_ENTRY_FILE, content }]
}

function solutionLockedMessage(attempts: number, solutionAfterAttempts: number): string {
  if (solutionAfterAttempts === 0) return "Esta lição não libera a solução. Use as dicas e tente de novo."
  const remaining = solutionAfterAttempts - attempts
  return `A solução é liberada depois de ${solutionAfterAttempts} tentativas (faltam ${remaining}).`
}
