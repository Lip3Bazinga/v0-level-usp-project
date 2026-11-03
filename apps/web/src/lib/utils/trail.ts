import type { Lesson, LessonProgress } from "@levelusp/contracts"

/** Situação de uma lição na trilha do curso. */
export type TrailStatus = "completed" | "in-progress" | "locked"

/**
 * Situação de cada lição de uma trilha ordenada: a lição só desbloqueia depois
 * que a anterior foi concluída, mas o que já foi concluído continua concluído.
 */
export function computeTrailStatuses(
  sortedLessons: readonly Pick<Lesson, "id">[],
  progressByLessonId: ReadonlyMap<string, Pick<LessonProgress, "status">>,
): TrailStatus[] {
  let canUnlockNext = true
  return sortedLessons.map((lesson) => {
    if (progressByLessonId.get(lesson.id)?.status === "completed") return "completed"
    if (!canUnlockNext) return "locked"
    canUnlockNext = false
    return "in-progress"
  })
}

