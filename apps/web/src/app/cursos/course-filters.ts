import type { Course, Difficulty } from "@levelusp/contracts"
import { DIFFICULTY_LABELS } from "@/lib/constants"

export type LevelFilter = "all" | Difficulty

export const LEVEL_FILTERS: readonly { value: LevelFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "iniciante", label: DIFFICULTY_LABELS.iniciante },
  { value: "intermediario", label: DIFFICULTY_LABELS.intermediario },
  { value: "avancado", label: DIFFICULTY_LABELS.avancado },
]

type FilterableCourse = Pick<Course, "title" | "description" | "level">

/** Busca por título ou descrição, sem diferenciar maiúsculas, combinada ao filtro de nível. */
export function filterCourses<TCourse extends FilterableCourse>(
  courses: readonly TCourse[],
  searchText: string,
  level: LevelFilter,
): TCourse[] {
  const query = searchText.toLowerCase()
  return courses.filter(
    (course) =>
      (course.title.toLowerCase().includes(query) || course.description.toLowerCase().includes(query)) &&
      (level === "all" || course.level === level),
  )
}
