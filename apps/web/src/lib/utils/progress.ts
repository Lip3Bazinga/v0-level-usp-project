import type { LessonProgress, Profile } from "@levelusp/contracts"
import { computeLevelProgress, toClampedPercent } from "./gamification"

export interface LessonCompletion {
  lessonId: string
  userId: string
  xpAwarded: number
  /** ISO 8601 do momento da conclusão. */
  completedAt: string
}

/**
 * Reflete localmente uma conclusão já gravada pela API, para trilhas e cadeados
 * atualizarem na hora, antes de a lista real ser buscada de novo.
 */
export function applyLessonCompletion(progress: readonly LessonProgress[], completion: LessonCompletion): LessonProgress[] {
  const { lessonId, userId, xpAwarded, completedAt } = completion
  if (!progress.some((entry) => entry.lesson_id === lessonId)) {
    return [
      ...progress,
      {
        id: `local-${lessonId}`,
        user_id: userId,
        lesson_id: lessonId,
        status: "completed",
        code_snapshot: null,
        score: null,
        xp_earned: xpAwarded,
        completed_at: completedAt,
        created_at: completedAt,
      },
    ]
  }
  return progress.map((entry) =>
    entry.lesson_id === lessonId
      ? { ...entry, status: "completed", xp_earned: entry.xp_earned + xpAwarded, completed_at: completedAt }
      : entry,
  )
}

export interface GamificationSummary {
  level: number
  totalXp: number
  streak: number
  maxStreak: number
  xpInLevel: number
  xpCeil: number
  /** 0–100. Calculado sobre o XP total do próximo nível (`xpCeil`), não sobre a faixa do nível. */
  xpProgress: number
}

type GamificationFields = Pick<Profile, "level" | "total_xp" | "current_streak" | "max_streak">

export function summarizeGamification(profile: GamificationFields | null): GamificationSummary {
  const level = profile?.level ?? 1
  const totalXp = profile?.total_xp ?? 0
  const { xpCeil, xpInLevel } = computeLevelProgress(totalXp, level)
  return {
    level,
    totalXp,
    streak: profile?.current_streak ?? 0,
    maxStreak: profile?.max_streak ?? 0,
    xpInLevel,
    xpCeil,
    xpProgress: toClampedPercent(xpInLevel, xpCeil),
  }
}
