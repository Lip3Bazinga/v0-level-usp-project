import { Injectable } from "@nestjs/common"
import { and, asc, count, eq, inArray, sql } from "drizzle-orm"
import { badges, courses, lessonProgress, lessons, profiles, userBadges } from "@levelusp/db"
import { InjectDb, type Database } from "@/infra/database/database.module"
import type { DbTransaction, DbExecutor, LessonRow, ProfileRow, BadgeRow } from "@levelusp/db"

/** Conclusão a gravar; `score` só nos questionários. */
export interface CompletionRecord {
  userId: string
  lessonId: string
  xpEarned: number
  score: number | null
}

/** Novo valor da sequência e o dia (São Paulo) da atividade. */
export interface StreakUpdate {
  userId: string
  streak: number
  /** Data civil (yyyy-mm-dd) da atividade. */
  today: string
}

/** XP total e nível depois de creditar uma lição. */
export interface ProgressionUpdate {
  userId: string
  totalXp: number
  level: number
}

/** Escritas de XP, nível, sequência e badges — usadas SOMENTE pelo GamificationService. */
/** Estado da sequência diária: último dia com atividade (São Paulo) e dias seguidos. */
export interface StreakRow {
  lastActivityDate: string | null
  currentStreak: number
}

/** Escrita de XP, nível, sequência, conclusões e badges. Só o GamificationService usa. */
@Injectable()
export class GamificationRepository {
  constructor(@InjectDb() private readonly db: Database) {}

  /** XP e curso da lição (o XP vem do banco, nunca do cliente). */
  findLessonReward(lessonId: string, executor: DbExecutor = this.db): Promise<Pick<LessonRow, "id" | "courseId" | "xpReward"> | undefined> {
    return executor.query.lessons.findFirst({ where: eq(lessons.id, lessonId), columns: { id: true, xpReward: true, courseId: true } })
  }

  /** FOR UPDATE: serializa as conclusões do mesmo aluno, mesmo sem linha de progresso ainda. */
  async lockProgression(userId: string, tx: DbTransaction): Promise<Pick<ProfileRow, "totalXp" | "level"> | undefined> {
    const [progression] = await tx.select({ totalXp: profiles.totalXp, level: profiles.level }).from(profiles).where(eq(profiles.id, userId)).for("update")
    return progression
  }

  /** Lê a sequência com `FOR UPDATE`; a trava só segura dentro de uma transação. */
  async lockStreak(userId: string, executor: DbExecutor = this.db): Promise<StreakRow | undefined> {
    const [streak] = await executor
      .select({ lastActivityDate: profiles.lastLoginDate, currentStreak: profiles.currentStreak })
      .from(profiles)
      .where(eq(profiles.id, userId))
      .for("update")
    return streak
  }

  /** Grava a sequência do dia e mantém o recorde (`max_streak`). */
  async updateStreak({ userId, streak, today }: StreakUpdate, executor: DbExecutor = this.db): Promise<void> {
    await executor
      .update(profiles)
      .set({ currentStreak: streak, maxStreak: sql`greatest(${profiles.maxStreak}, ${streak})`, lastLoginDate: today })
      .where(eq(profiles.id, userId))
  }

  /** Situação do aluno na lição, ou `undefined` se nunca abriu. */
  async findProgressStatus(userId: string, lessonId: string, executor: DbExecutor = this.db): Promise<"not_started" | "in_progress" | "completed" | undefined> {
    const [progress] = await executor
      .select({ status: lessonProgress.status })
      .from(lessonProgress)
      .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.lessonId, lessonId)))
    return progress?.status
  }

  /** Marca a lição como concluída (insere ou atualiza o progresso). */
  async markCompleted({ userId, lessonId, xpEarned, score }: CompletionRecord, executor: DbExecutor = this.db): Promise<void> {
    const completion = { status: "completed" as const, xpEarned, score, completedAt: sql`now()` }
    await executor
      .insert(lessonProgress)
      .values({ userId, lessonId, ...completion })
      .onConflictDoUpdate({ target: [lessonProgress.userId, lessonProgress.lessonId], set: completion })
  }

  /** Grava o novo XP e nível e soma uma lição concluída. */
  async creditLesson({ userId, totalXp, level }: ProgressionUpdate, executor: DbExecutor = this.db): Promise<void> {
    await executor
      .update(profiles)
      .set({ totalXp, level, lessonsCompleted: sql`${profiles.lessonsCompleted} + 1` })
      .where(eq(profiles.id, userId))
  }

  /** Ids das lições publicadas do curso. */
  listPublishedLessonIds(courseId: string, executor: DbExecutor = this.db): Promise<Pick<LessonRow, "id">[]> {
    return executor.select({ id: lessons.id }).from(lessons).where(and(eq(lessons.courseId, courseId), eq(lessons.published, true)))
  }

  /** Quantas das lições informadas o aluno concluiu. */
  async countCompleted(userId: string, lessonIds: string[], executor: DbExecutor = this.db): Promise<number> {
    const [completed] = await executor
      .select({ total: count() })
      .from(lessonProgress)
      .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.status, "completed"), inArray(lessonProgress.lessonId, lessonIds)))
    return completed?.total ?? 0
  }

  /** Soma um curso concluído ao perfil. */
  async incrementCoursesCompleted(userId: string, executor: DbExecutor = this.db): Promise<void> {
    await executor.update(profiles).set({ coursesCompleted: sql`${profiles.coursesCompleted} + 1` }).where(eq(profiles.id, userId))
  }

  /** Título do curso, para a notificação de conclusão. */
  async findCourseTitle(courseId: string, executor: DbExecutor = this.db): Promise<string | undefined> {
    const course = await executor.query.courses.findFirst({ where: eq(courses.id, courseId), columns: { title: true } })
    return course?.title
  }

  /** Perfil com os contadores usados nos critérios de badge. */
  findProfile(userId: string, executor: DbExecutor = this.db): Promise<ProfileRow | undefined> {
    return executor.query.profiles.findFirst({ where: eq(profiles.id, userId) })
  }

  /** Catálogo de badges na ordem de exibição. */
  listBadgeRules(executor: DbExecutor = this.db): Promise<BadgeRow[]> {
    return executor.select().from(badges).orderBy(asc(badges.sortOrder))
  }

  /** Badges que o usuário já tem. */
  async listOwnedBadgeIds(userId: string, executor: DbExecutor = this.db): Promise<Set<string>> {
    const owned = await executor.select({ badgeId: userBadges.badgeId }).from(userBadges).where(eq(userBadges.userId, userId))
    return new Set(owned.map((userBadge) => userBadge.badgeId))
  }

  /** Concede os badges; os que o usuário já tem são ignorados. */
  async grantBadges(userId: string, badgeIds: string[], executor: DbExecutor = this.db): Promise<void> {
    await executor.insert(userBadges).values(badgeIds.map((badgeId) => ({ userId, badgeId }))).onConflictDoNothing()
  }
}
