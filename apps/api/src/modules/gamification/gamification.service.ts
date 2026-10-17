import { Injectable } from "@nestjs/common"
import { and, asc, count, eq, inArray, sql } from "drizzle-orm"
import { badges, courses, lessonProgress, lessons, notifications, profiles, userBadges } from "@levelusp/db"
import type { GrantedBadge, StreakResult } from "@levelusp/contracts"
import { InjectDb, type Database, type DbOrTx } from "@/infra/database/database.module"
import { eligibleBadges, levelForXp, nextStreak, saoPauloDate } from "./gamification.domain"

export interface CompletionOutcome {
  /** false quando a lição já estava concluída (XP não é creditado de novo). */
  newlyCompleted: boolean
  xpAwarded: number
  levelUp: boolean
  newLevel: number
  newBadges: GrantedBadge[]
  courseCompleted: boolean
}

/**
 * Única porta de entrada para XP, nível, sequência e badges. Nenhum outro
 * módulo (nem o cliente) escreve esses campos — fim do "award_xp" chamável
 * pelo navegador.
 */
@Injectable()
export class GamificationService {
  constructor(@InjectDb() private readonly db: Database) {}

  /** Registra atividade do dia (login ou conclusão) e atualiza a sequência. */
  async touchStreak(userId: string, tx: DbOrTx = this.db): Promise<StreakResult> {
    const [p] = await tx
      .select({ last: profiles.lastLoginDate, current: profiles.currentStreak })
      .from(profiles)
      .where(eq(profiles.id, userId))
      .for("update")
    if (!p) return { streak: 0, increased: false, reset: false }
    const today = saoPauloDate()
    const result = nextStreak(p.last, today, p.current)
    if (p.last !== today) {
      await tx
        .update(profiles)
        .set({ currentStreak: result.streak, maxStreak: sql`greatest(${profiles.maxStreak}, ${result.streak})`, lastLoginDate: today })
        .where(eq(profiles.id, userId))
    }
    return result
  }

  /**
   * Conclui uma lição de forma idempotente e credita o XP real da lição.
   * Deve ser chamada SOMENTE depois de um veredito do servidor.
   */
  async completeLesson(userId: string, lessonId: string, opts: { score?: number | null } = {}): Promise<CompletionOutcome> {
    return this.db.transaction(async (tx) => {
      const lesson = await tx.query.lessons.findFirst({
        where: eq(lessons.id, lessonId),
        columns: { id: true, xpReward: true, courseId: true },
      })
      if (!lesson) throw new Error(`lição ${lessonId} inexistente`)

      // Trava o perfil ANTES de ler o progresso: todas as conclusões do mesmo
      // aluno ficam serializadas, mesmo quando a linha de progresso ainda não
      // existe (FOR UPDATE numa linha inexistente não trava nada).
      const [before] = await tx.select({ xp: profiles.totalXp, level: profiles.level }).from(profiles).where(eq(profiles.id, userId)).for("update")
      if (!before) throw new Error(`perfil ${userId} inexistente`)
      const [prev] = await tx
        .select({ status: lessonProgress.status })
        .from(lessonProgress)
        .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.lessonId, lessonId)))

      if (prev?.status === "completed") {
        return { newlyCompleted: false, xpAwarded: 0, levelUp: false, newLevel: before.level, newBadges: [], courseCompleted: false }
      }

      await tx
        .insert(lessonProgress)
        .values({ userId, lessonId, status: "completed", xpEarned: lesson.xpReward, score: opts.score ?? null, completedAt: sql`now()` })
        .onConflictDoUpdate({
          target: [lessonProgress.userId, lessonProgress.lessonId],
          set: { status: "completed", xpEarned: lesson.xpReward, score: opts.score ?? null, completedAt: sql`now()` },
        })

      const newXp = before.xp + lesson.xpReward
      const newLevel = levelForXp(newXp)
      await tx
        .update(profiles)
        .set({ totalXp: newXp, level: newLevel, lessonsCompleted: sql`${profiles.lessonsCompleted} + 1` })
        .where(eq(profiles.id, userId))
      await this.touchStreak(userId, tx)

      const courseCompleted = lesson.courseId ? await this.markCourseIfCompleted(tx, userId, lesson.courseId) : false
      const newBadges = await this.grantBadges(userId, tx)

      return { newlyCompleted: true, xpAwarded: lesson.xpReward, levelUp: newLevel > before.level, newLevel, newBadges, courseCompleted }
    })
  }

  /** Concede badges automáticos elegíveis; devolve só os novos. */
  async grantBadges(userId: string, tx: DbOrTx = this.db): Promise<GrantedBadge[]> {
    const stats = await tx.query.profiles.findFirst({ where: eq(profiles.id, userId) })
    if (!stats) return []
    const rules = await tx.select().from(badges).orderBy(asc(badges.sortOrder))
    const owned = new Set((await tx.select({ id: userBadges.badgeId }).from(userBadges).where(eq(userBadges.userId, userId))).map((r) => r.id))
    const ids = eligibleBadges(
      {
        total_xp: stats.totalXp,
        current_streak: stats.currentStreak,
        max_streak: stats.maxStreak,
        lessons_completed: stats.lessonsCompleted,
        courses_completed: stats.coursesCompleted,
      },
      rules,
      owned,
    )
    if (!ids.length) return []
    await tx.insert(userBadges).values(ids.map((badgeId) => ({ userId, badgeId }))).onConflictDoNothing()
    const granted = rules.filter((r) => ids.includes(r.id))
    await tx.insert(notifications).values(
      granted.map((b) => ({ userId, title: `Nova conquista: ${b.name}`, body: b.description, kind: "success" as const, href: "/perfil" })),
    )
    return granted.map((b) => ({ id: b.id, name: b.name, icon: b.icon, rarity: b.rarity }))
  }

  /** Conta o curso como concluído quando todas as lições publicadas estão feitas. */
  private async markCourseIfCompleted(tx: DbOrTx, userId: string, courseId: string): Promise<boolean> {
    const published = await tx
      .select({ id: lessons.id })
      .from(lessons)
      .where(and(eq(lessons.courseId, courseId), eq(lessons.published, true)))
    if (!published.length) return false
    const [done] = await tx
      .select({ n: count() })
      .from(lessonProgress)
      .where(
        and(
          eq(lessonProgress.userId, userId),
          eq(lessonProgress.status, "completed"),
          inArray(lessonProgress.lessonId, published.map((l) => l.id)),
        ),
      )
    if ((done?.n ?? 0) < published.length) return false
    await tx.update(profiles).set({ coursesCompleted: sql`${profiles.coursesCompleted} + 1` }).where(eq(profiles.id, userId))
    const course = await tx.query.courses.findFirst({ where: eq(courses.id, courseId), columns: { title: true } })
    await tx.insert(notifications).values({
      userId,
      title: "Curso concluído!",
      body: `Você concluiu todas as lições de ${course?.title ?? "um curso"}. A prova final está liberada.`,
      kind: "success",
      href: `/cursos/${courseId}`,
    })
    return true
  }
}
