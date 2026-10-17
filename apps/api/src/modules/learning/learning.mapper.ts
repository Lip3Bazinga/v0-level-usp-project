import type { LessonCompletion, LessonProgress } from "@levelusp/contracts"
import type { LessonProgressRow } from "@levelusp/db"
import type { CompletionOutcome } from "../gamification/gamification.service"

export function toLessonProgress(progress: LessonProgressRow): LessonProgress {
  return {
    id: progress.id,
    user_id: progress.userId,
    lesson_id: progress.lessonId,
    status: progress.status,
    code_snapshot: progress.codeSnapshot,
    score: progress.score,
    xp_earned: progress.xpEarned,
    completed_at: progress.completedAt,
    created_at: progress.createdAt,
  }
}

/** `null`: a lição não foi concluída nesta ação (reprovação ou prévia sem crédito). */
export function toLessonCompletion(outcome: CompletionOutcome | null): LessonCompletion {
  return {
    lesson_completed: outcome !== null,
    xp_awarded: outcome?.xpAwarded ?? 0,
    new_badges: outcome?.newBadges ?? [],
    level_up: outcome?.levelUp ?? false,
    new_level: outcome?.newLevel ?? 0,
  }
}
