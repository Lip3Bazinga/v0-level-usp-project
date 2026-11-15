import { Injectable } from "@nestjs/common"
import type { LessonCompletion, LessonProgress, LessonSnapshot, ProjectFile, SubmissionResult } from "@levelusp/contracts"
import { canViewContent } from "@/common/authorization/ownership"
import { BadRequest, Forbidden, NotFound, Unprocessable } from "@/common/errors/app-error"
import type { AuthUser } from "@/common/http/request"
import { RATE_LIMITS } from "@/common/rate-limit/rate-limit.policies"
import { RateLimitService } from "@/common/rate-limit/rate-limit.service"
import { GamificationService } from "../gamification/gamification.service"
import { EventsService } from "../experiment/events.service"
import { hasEntryFile, parseSnapshot } from "./learning.domain"
import { toLessonCompletion, toLessonProgress } from "./learning.mapper"
import { LearningRepository, type GradableLessonRow } from "./learning.repository"
import { StepsRepository } from "./steps.repository"
import { SubmissionGrader } from "./submission-grader"

/** Exercício aprovado pelo corretor vale nota cheia (a nota parcial é só do quiz). */
const FULL_SCORE = 100

/** Submissão de código (correção no servidor), conclusão de lições teóricas, progresso e rascunhos. */
@Injectable()
export class LearningService {
  constructor(
    private readonly repo: LearningRepository,
    private readonly stepsRepo: StepsRepository,
    private readonly grader: SubmissionGrader,
    private readonly gamification: GamificationService,
    private readonly rateLimit: RateLimitService,
    private readonly events: EventsService,
  ) {}

  /** Progresso do usuário em todas as lições. */
  async listMyProgress(userId: string): Promise<LessonProgress[]> {
    return (await this.repo.listProgress(userId)).map(toLessonProgress)
  }

  /** Ids das lições que o usuário concluiu. */
  async listMyCompletedLessonIds(userId: string): Promise<string[]> {
    const progress = await this.repo.listProgress(userId)
    return progress.filter((lesson) => lesson.status === "completed").map((lesson) => lesson.lessonId)
  }

  /**
   * Rascunho do usuário na lição; null quando nunca salvou (rascunho legado em texto vira o main.py).
   *
   * @throws AppError 404 quando a lição não existe ou não é visível.
   */
  async getSnapshot(user: AuthUser, lessonId: string): Promise<LessonSnapshot> {
    await this.findAccessibleLesson(user, lessonId)
    return { files: parseSnapshot(await this.repo.findSnapshot(user.id, lessonId)) }
  }

  /**
   * Salva o rascunho sem rebaixar uma lição já concluída.
   *
   * @throws AppError 404 quando a lição não existe ou não é visível.
   */
  async updateSnapshot(user: AuthUser, lessonId: string, files: ProjectFile[]): Promise<void> {
    await this.findAccessibleLesson(user, lessonId)
    await this.repo.upsertSnapshot(user.id, lessonId, files)
  }

  /**
   * "Verificar resposta": corrige no executor isolado e, se aprovado, conclui
   * a lição e credita XP — tudo no servidor, a partir do veredito do servidor. Falha do
   * executor responde 503 e grava a submissão com `status: "error"` (não conta como tentativa).
   *
   * @throws AppError 404 lição; 400 lição sem exercício ou projeto sem `main.py`; 422 `NO_TESTS`;
   *         403 `PROJECT_LOCKED`; 429 limites; 503 executor indisponível.
   */
  async submit(user: AuthUser, lessonId: string, files: ProjectFile[]): Promise<SubmissionResult> {
    const lesson = await this.findAccessibleLesson(user, lessonId)
    if (lesson.lessonType !== "coding") throw BadRequest("Esta lição não tem exercício de código.")
    if (!lesson.testCases.length) throw Unprocessable("Esta lição ainda não tem gabarito. Avise o professor.", "NO_TESTS")
    if (!hasEntryFile(files)) throw BadRequest("O projeto precisa de um arquivo main.py.")
    await this.assertProjectUnlocked(user.id, lesson)
    const { submissionId, result: gradeResult } = await this.grader.grade({
      userId: user.id, lessonId, stepId: null, files, testCases: lesson.testCases, engine: { runtime: lesson.runtime, libraries: lesson.libraries },
    })

    // Prévia do professor numa lição não publicada não credita XP.
    const shouldCredit = gradeResult.allPassed && lesson.published
    const outcome = shouldCredit ? await this.gamification.completeLesson(user.id, lessonId, { score: FULL_SCORE }) : null
    if (shouldCredit) await this.repo.upsertSnapshot(user.id, lessonId, files)
    if (outcome?.newlyCompleted) await this.events.record(user.id, "lesson_completed", { lesson_id: lessonId })

    return { ...gradeResult, submission_id: submissionId, ...toLessonCompletion(outcome) }
  }

  /** Lições teóricas não têm avaliação: concluir = ter lido. */
  async completeTheory(user: AuthUser, lessonId: string): Promise<LessonCompletion> {
    this.rateLimit.consume(RATE_LIMITS.theoryCompletion, user.id)
    const lesson = await this.findAccessibleLesson(user, lessonId)
    if (lesson.lessonType !== "theory") throw BadRequest("Só lições teóricas podem ser concluídas sem avaliação.")
    if (!lesson.published) return toLessonCompletion(null)
    await this.assertProjectUnlocked(user.id, lesson)
    const outcome = await this.gamification.completeLesson(user.id, lessonId)
    if (outcome.newlyCompleted) await this.events.record(user.id, "lesson_completed", { lesson_id: lessonId })
    return toLessonCompletion(outcome)
  }

  /** O projeto do nível só abre com as demais lições publicadas do curso concluídas. */
  private async assertProjectUnlocked(userId: string, lesson: GradableLessonRow): Promise<void> {
    if (!lesson.isProject || !lesson.courseId || !lesson.published) return
    const pending = await this.stepsRepo.countPendingLessonsBeforeProject(userId, lesson.courseId, lesson.id)
    if (pending > 0) throw Forbidden(`Conclua as outras lições do curso antes do projeto (faltam ${pending}).`, "PROJECT_LOCKED")
  }

  /** Publicada para todos; rascunho só para o autor e admins. */
  private async findAccessibleLesson(user: AuthUser, lessonId: string): Promise<GradableLessonRow> {
    const lesson = await this.repo.findLessonForGrading(lessonId)
    if (!lesson || !canViewContent(user, lesson)) throw NotFound("Lição")
    return lesson
  }
}
