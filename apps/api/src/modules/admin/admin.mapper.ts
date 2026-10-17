import type { AnalyticsMetrics, RecentActivity } from "@levelusp/contracts"
import { percentage } from "./admin.domain"

export interface RecentCompletionRow {
  id: string
  userName: string
  lessonTitle: string
  xpEarned: number
  completedAt: string | null
}

/** `type` (e não interface): o `db.execute<T>` do Drizzle exige assinatura de índice. */
export type AnalyticsTotalsRow = {
  dau: number
  wau: number
  mau: number
  total_users: number
  average_xp: number
  retention_base: number
  retention_active: number
  streak7: number
  started: number
  completed5: number
}

export interface TopLessonRow {
  lessonId: string
  title: string
  completions: number
}

/** A consulta filtra `completed_at is not null`; o tipo da coluna continua anulável. */
export function toRecentActivity(completion: RecentCompletionRow): RecentActivity[] {
  if (completion.completedAt === null) return []
  return [{ id: completion.id, user_name: completion.userName, lesson_title: completion.lessonTitle, xp_earned: completion.xpEarned, completed_at: completion.completedAt }]
}

export function toTopLesson(lesson: TopLessonRow): AnalyticsMetrics["topLessons"][number] {
  return { lesson_id: lesson.lessonId, title: lesson.title, completions: lesson.completions }
}

type AnalyticsTotals = Omit<AnalyticsMetrics, "dailyActiveUsers" | "completionsByDay" | "topLessons" | "roleDistribution">

export function toAnalyticsTotals(totals: AnalyticsTotalsRow): AnalyticsTotals {
  return {
    averageXp: totals.average_xp,
    retention7d: percentage(totals.retention_active, totals.retention_base),
    dau: totals.dau,
    wau: totals.wau,
    mau: totals.mau,
    totalUsers: totals.total_users,
    funnelStarted: totals.started,
    funnelCompleted5: totals.completed5,
    funnelStreak7: totals.streak7,
  }
}
