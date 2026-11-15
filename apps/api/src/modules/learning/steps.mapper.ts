import type { LessonStepProgress, StepOutcome } from "@levelusp/contracts"
import type { LessonStepProgressRow } from "@levelusp/db"
import { toIsoTimestamp } from "@/common/time/time"
import type { StepCompletionOutcome } from "../gamification/gamification.service"

/** Progresso do passo no formato do contrato. */
export function toLessonStepProgress(progress: LessonStepProgressRow): LessonStepProgress {
  return {
    step_id: progress.stepId,
    status: progress.status,
    attempts: progress.attempts,
    hints_revealed: progress.hintsRevealed,
    solution_viewed: progress.solutionViewed,
    xp_awarded: progress.xpAwarded,
    completed_at: progress.completedAt === null ? null : toIsoTimestamp(progress.completedAt),
  }
}

/** `null`: o passo não foi concluído nesta ação (reprovação). */
export function toStepOutcome(outcome: StepCompletionOutcome | null): StepOutcome {
  return {
    step_completed: outcome !== null,
    xp_awarded: outcome?.xpAwarded ?? 0,
    lesson_completed: outcome?.lessonCompleted ?? false,
    granted_badges: outcome?.newBadges ?? [],
    level_up: outcome?.levelUp ?? false,
    new_level: outcome?.newLevel ?? 0,
  }
}
