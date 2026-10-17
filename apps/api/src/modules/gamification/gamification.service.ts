import { Injectable } from "@nestjs/common"
import type { GrantedBadge, StreakResult } from "@levelusp/contracts"
import { saoPauloDate } from "@/common/time/time"
import { TransactionRunner, type DbOrTx } from "@/infra/database/database.module"
import { NotificationsService } from "../notifications/notifications.service"
import { toGrantedBadge } from "./badge.mapper"
import { eligibleBadges, levelForXp, nextStreak, type PlayerStats } from "./gamification.domain"
import { GamificationRepository } from "./gamification.repository"

export interface CompletionOutcome {
  /** false quando a lição já estava concluída (XP não é creditado de novo). */
  newlyCompleted: boolean
  xpAwarded: number
  levelUp: boolean
  newLevel: number
  newBadges: GrantedBadge[]
  courseCompleted: boolean
}

export interface CompletionOptions {
  score?: number | null
}

const NO_STREAK: StreakResult = { streak: 0, increased: false, reset: false }

/**
 * Única porta de entrada para XP, nível, sequência e badges. Nenhum outro
 * módulo (nem o cliente) escreve esses campos — fim do "award_xp" chamável
 * pelo navegador.
 */
@Injectable()
export class GamificationService {
  constructor(
    private readonly repo: GamificationRepository,
    private readonly transactions: TransactionRunner,
    private readonly notifications: NotificationsService,
  ) {}

  /** Registra atividade do dia (login ou conclusão) e atualiza a sequência. */
  async touchStreak(userId: string, tx?: DbOrTx): Promise<StreakResult> {
    const current = await this.repo.lockStreak(userId, tx)
    if (!current) return { ...NO_STREAK }
    const today = saoPauloDate()
    const result = nextStreak(current.lastActivityDate, today, current.currentStreak)
    if (current.lastActivityDate !== today) await this.repo.updateStreak({ userId, streak: result.streak, today }, tx)
    return result
  }

  /**
   * Conclui uma lição de forma idempotente e credita o XP real da lição.
   * Deve ser chamada SOMENTE depois de um veredito do servidor.
   */
  completeLesson(userId: string, lessonId: string, options: CompletionOptions = {}): Promise<CompletionOutcome> {
    return this.transactions.run(async (tx) => {
      const lesson = await this.repo.findLessonReward(lessonId, tx)
      if (!lesson) throw new Error(`lição ${lessonId} inexistente`)

      // Trava o perfil ANTES de ler o progresso: todas as conclusões do mesmo
      // aluno ficam serializadas, mesmo quando a linha de progresso ainda não
      // existe (FOR UPDATE numa linha inexistente não trava nada).
      const before = await this.repo.lockProgression(userId, tx)
      if (!before) throw new Error(`perfil ${userId} inexistente`)
      if ((await this.repo.findProgressStatus(userId, lessonId, tx)) === "completed") {
        return { newlyCompleted: false, xpAwarded: 0, levelUp: false, newLevel: before.level, newBadges: [], courseCompleted: false }
      }

      await this.repo.markCompleted({ userId, lessonId, xpEarned: lesson.xpReward, score: options.score ?? null }, tx)
      const totalXp = before.totalXp + lesson.xpReward
      const newLevel = levelForXp(totalXp)
      await this.repo.creditLesson({ userId, totalXp, level: newLevel }, tx)
      await this.touchStreak(userId, tx)

      const courseCompleted = lesson.courseId ? await this.markCourseIfCompleted(userId, lesson.courseId, tx) : false
      const newBadges = await this.grantBadges(userId, tx)
      return { newlyCompleted: true, xpAwarded: lesson.xpReward, levelUp: newLevel > before.level, newLevel, newBadges, courseCompleted }
    })
  }

  /** Concede badges automáticos elegíveis; devolve só os novos. */
  private async grantBadges(userId: string, tx: DbOrTx): Promise<GrantedBadge[]> {
    const profile = await this.repo.findProfile(userId, tx)
    if (!profile) return []
    const rules = await this.repo.listBadgeRules(tx)
    const stats: PlayerStats = {
      total_xp: profile.totalXp,
      current_streak: profile.currentStreak,
      max_streak: profile.maxStreak,
      lessons_completed: profile.lessonsCompleted,
      courses_completed: profile.coursesCompleted,
    }
    const earnedIds = eligibleBadges(stats, rules, await this.repo.listOwnedBadgeIds(userId, tx))
    if (!earnedIds.length) return []
    await this.repo.grantBadges(userId, earnedIds, tx)
    const earned = rules.filter((rule) => earnedIds.includes(rule.id))
    await this.notifications.notifyMany(
      userId,
      earned.map((badge) => ({ title: `Nova conquista: ${badge.name}`, body: badge.description, kind: "success", href: "/perfil" })),
      tx,
    )
    return earned.map(toGrantedBadge)
  }

  /** Conta o curso como concluído quando todas as lições publicadas estão feitas. */
  private async markCourseIfCompleted(userId: string, courseId: string, tx: DbOrTx): Promise<boolean> {
    const publishedIds = (await this.repo.listPublishedLessonIds(courseId, tx)).map((lesson) => lesson.id)
    if (!publishedIds.length) return false
    if ((await this.repo.countCompleted(userId, publishedIds, tx)) < publishedIds.length) return false
    await this.repo.incrementCoursesCompleted(userId, tx)
    const courseTitle = await this.repo.findCourseTitle(courseId, tx)
    await this.notifications.notify(
      userId,
      {
        title: "Curso concluído!",
        body: `Você concluiu todas as lições de ${courseTitle ?? "um curso"}. A prova final está liberada.`,
        kind: "success",
        href: `/cursos/${courseId}`,
      },
      tx,
    )
    return true
  }
}
