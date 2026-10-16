import { Injectable, Logger } from "@nestjs/common"
import type { LessonProgress, ProjectFile, SubmissionResult } from "@levelusp/contracts"
import { BadRequest, NotFound, Unprocessable } from "@/common/errors/app-error"
import type { AuthUser } from "@/common/http/request"
import { RateLimitService } from "@/common/rate-limit/rate-limit.service"
import { GamificationService } from "../gamification/gamification.service"
import { GradingService } from "../grading/grading.service"
import { LearningRepository } from "./learning.repository"

/** 12 verificações por minuto por aluno (mesmo limite do avaliador antigo). */
const SUBMIT_LIMIT = 12
const SUBMIT_WINDOW_MS = 60_000

@Injectable()
export class LearningService {
  private readonly logger = new Logger(LearningService.name)

  constructor(
    private readonly repo: LearningRepository,
    private readonly grading: GradingService,
    private readonly gamification: GamificationService,
    private readonly rateLimit: RateLimitService,
  ) {}

  myProgress(userId: string): Promise<LessonProgress[]> {
    return this.repo.progressOf(userId)
  }

  async completedLessonIds(userId: string): Promise<string[]> {
    return (await this.repo.progressOf(userId)).filter((p) => p.status === "completed").map((p) => p.lesson_id)
  }

  async getSnapshot(user: AuthUser, lessonId: string): Promise<{ files: ProjectFile[] | null }> {
    await this.accessibleLesson(user, lessonId)
    const raw = await this.repo.snapshot(user.id, lessonId)
    return { files: parseSnapshot(raw) }
  }

  async saveSnapshot(user: AuthUser, lessonId: string, files: ProjectFile[]): Promise<void> {
    await this.accessibleLesson(user, lessonId)
    await this.repo.saveSnapshot(user.id, lessonId, files)
  }

  /**
   * "Verificar resposta": corrige no executor isolado e, se aprovado, conclui
   * a lição e credita XP — tudo no servidor, a partir do veredito do servidor.
   */
  async submit(user: AuthUser, lessonId: string, files: ProjectFile[]): Promise<SubmissionResult> {
    const lesson = await this.accessibleLesson(user, lessonId)
    if (lesson.lessonType !== "coding") throw BadRequest("Esta lição não tem exercício de código.")
    if (!lesson.testCases.length) throw Unprocessable("Esta lição ainda não tem gabarito. Avise o professor.", "NO_TESTS")
    if (!files.some((f) => f.path === "main.py")) throw BadRequest("O projeto precisa de um arquivo main.py.")
    this.rateLimit.consume(`submit:${user.id}`, SUBMIT_LIMIT, SUBMIT_WINDOW_MS, "Muitas verificações seguidas. Aguarde um instante.")

    const result = await this.grading.grade(files, lesson.testCases)
    const { engine, ...gradeResult } = result
    const submissionId = await this.repo.insertSubmission({
      userId: user.id,
      lessonId,
      files,
      status: "graded",
      passed: result.allPassed,
      result: gradeResult,
      engine,
      durationMs: result.durationMs,
    })

    // Prévia do professor numa lição não publicada não credita XP.
    const counts = result.allPassed && lesson.published
    const outcome = counts ? await this.gamification.completeLesson(user.id, lessonId, { score: 100 }) : null
    if (counts) await this.repo.saveSnapshot(user.id, lessonId, files)
    this.logger.log({ userId: user.id, lessonId, passed: result.allPassed, ms: result.durationMs }, "submissão corrigida")

    return {
      ...gradeResult,
      submission_id: submissionId,
      lesson_completed: counts,
      xp_awarded: outcome?.xpAwarded ?? 0,
      new_badges: outcome?.newBadges ?? [],
      level_up: outcome?.levelUp ?? false,
      new_level: outcome?.newLevel ?? 0,
    }
  }

  /** Lições teóricas não têm avaliação: concluir = ter lido. */
  async completeTheory(user: AuthUser, lessonId: string) {
    const lesson = await this.accessibleLesson(user, lessonId)
    if (lesson.lessonType !== "theory") throw BadRequest("Só lições teóricas podem ser concluídas sem avaliação.")
    if (!lesson.published) return { lesson_completed: false, xp_awarded: 0, new_badges: [], level_up: false, new_level: 0 }
    const o = await this.gamification.completeLesson(user.id, lessonId)
    return { lesson_completed: true, xp_awarded: o.xpAwarded, new_badges: o.newBadges, level_up: o.levelUp, new_level: o.newLevel }
  }

  /** Publicada para todos; rascunho só para o autor e admins. */
  private async accessibleLesson(user: AuthUser, lessonId: string) {
    const lesson = await this.repo.findLessonForGrading(lessonId)
    if (!lesson) throw NotFound("Lição")
    if (!lesson.published && lesson.createdBy !== user.id && user.role !== "admin") throw NotFound("Lição")
    return lesson
  }
}

/** Snapshot salvo como JSON de ProjectFile[] (ou string de código legado). */
export function parseSnapshot(raw: string | null): ProjectFile[] | null {
  if (!raw?.trim()) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      const files = parsed.filter((f): f is ProjectFile => typeof f?.path === "string" && typeof f?.content === "string")
      return files.length ? files : null
    }
  } catch {
    return [{ path: "main.py", content: raw }]
  }
  return null
}
