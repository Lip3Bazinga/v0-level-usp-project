import { Injectable, Logger } from "@nestjs/common"
import type { LessonCompletion, LessonProgress, LessonSnapshot, ProjectFile, SubmissionResult } from "@levelusp/contracts"
import { canViewContent } from "@/common/authorization/ownership"
import { BadRequest, NotFound, Unprocessable } from "@/common/errors/app-error"
import type { AuthUser } from "@/common/http/request"
import { RATE_LIMITS } from "@/common/rate-limit/rate-limit.policies"
import { RateLimitService } from "@/common/rate-limit/rate-limit.service"
import { GamificationService } from "../gamification/gamification.service"
import { GradingService } from "../grading/grading.service"
import { hasEntryFile, parseSnapshot } from "./learning.domain"
import { toLessonCompletion, toLessonProgress } from "./learning.mapper"
import { LearningRepository, type GradableLessonRow } from "./learning.repository"

/** Exercício aprovado pelo corretor vale nota cheia (a nota parcial é só do quiz). */
const FULL_SCORE = 100

/** Submissão de código (correção no servidor), conclusão de lições teóricas, progresso e rascunhos. */
@Injectable()
export class LearningService {
  private readonly logger = new Logger(LearningService.name)

  constructor(
    private readonly repo: LearningRepository,
    private readonly grading: GradingService,
    private readonly gamification: GamificationService,
    private readonly rateLimit: RateLimitService,
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
   * a lição e credita XP — tudo no servidor, a partir do veredito do servidor.
   */
  async submit(user: AuthUser, lessonId: string, files: ProjectFile[]): Promise<SubmissionResult> {
    const lesson = await this.findAccessibleLesson(user, lessonId)
    if (lesson.lessonType !== "coding") throw BadRequest("Esta lição não tem exercício de código.")
    if (!lesson.testCases.length) throw Unprocessable("Esta lição ainda não tem gabarito. Avise o professor.", "NO_TESTS")
    if (!hasEntryFile(files)) throw BadRequest("O projeto precisa de um arquivo main.py.")
    this.rateLimit.consume(RATE_LIMITS.codeSubmission, user.id)

    const { engine, ...gradeResult } = await this.grading.grade(files, lesson.testCases)
    const submissionId = await this.repo.createSubmission({
      userId: user.id,
      lessonId,
      files,
      status: "graded",
      passed: gradeResult.allPassed,
      result: gradeResult,
      engine,
      durationMs: gradeResult.durationMs,
    })

    // Prévia do professor numa lição não publicada não credita XP.
    const shouldCredit = gradeResult.allPassed && lesson.published
    const outcome = shouldCredit ? await this.gamification.completeLesson(user.id, lessonId, { score: FULL_SCORE }) : null
    if (shouldCredit) await this.repo.upsertSnapshot(user.id, lessonId, files)
    this.logger.log({ userId: user.id, lessonId, passed: gradeResult.allPassed, ms: gradeResult.durationMs }, "submissão corrigida")

    return { ...gradeResult, submission_id: submissionId, ...toLessonCompletion(outcome) }
  }

  /** Lições teóricas não têm avaliação: concluir = ter lido. */
  async completeTheory(user: AuthUser, lessonId: string): Promise<LessonCompletion> {
    this.rateLimit.consume(RATE_LIMITS.theoryCompletion, user.id)
    const lesson = await this.findAccessibleLesson(user, lessonId)
    if (lesson.lessonType !== "theory") throw BadRequest("Só lições teóricas podem ser concluídas sem avaliação.")
    if (!lesson.published) return toLessonCompletion(null)
    return toLessonCompletion(await this.gamification.completeLesson(user.id, lessonId))
  }

  /** Publicada para todos; rascunho só para o autor e admins. */
  private async findAccessibleLesson(user: AuthUser, lessonId: string): Promise<GradableLessonRow> {
    const lesson = await this.repo.findLessonForGrading(lessonId)
    if (!lesson || !canViewContent(user, lesson)) throw NotFound("Lição")
    return lesson
  }
}
