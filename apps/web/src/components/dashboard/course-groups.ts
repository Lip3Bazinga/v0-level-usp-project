import type { Course, Lesson, LessonProgress } from "@levelusp/contracts"

type OrderedLesson = Pick<Lesson, "order">

export interface CourseGroup<TCourse = Course, TLesson = Lesson> {
  course: TCourse
  lessons: TLesson[]
}

export interface ModuleGroup<TLesson = Lesson> {
  name: string
  lessons: TLesson[]
}

/** Lições sem módulo caem neste grupo na trilha do curso. */
export const DEFAULT_MODULE_NAME = "Módulo 1"

const byOrder = (first: OrderedLesson, second: OrderedLesson): number => first.order - second.order

function groupBy<TItem, TKey>(items: readonly TItem[], getKey: (item: TItem) => TKey): Map<TKey, TItem[]> {
  const groups = new Map<TKey, TItem[]>()
  for (const item of items) {
    const key = getKey(item)
    const group = groups.get(key)
    if (group) group.push(item)
    else groups.set(key, [item])
  }
  return groups
}

/**
 * Cursos (na ordem do catálogo) que têm ao menos uma lição publicada, cada um com
 * suas lições em ordem. Lições avulsas, sem curso, não entram no painel.
 */
export function groupLessonsByCourse<
  TCourse extends Pick<Course, "id">,
  TLesson extends Pick<Lesson, "course_id" | "order">,
>(courses: readonly TCourse[], lessons: readonly TLesson[]): CourseGroup<TCourse, TLesson>[] {
  const lessonsByCourse = groupBy(lessons, (lesson) => lesson.course_id)
  return courses.flatMap((course) => {
    const courseLessons = lessonsByCourse.get(course.id)
    return courseLessons ? [{ course, lessons: courseLessons.sort(byOrder) }] : []
  })
}

/** Módulos na ordem em que aparecem, cada um com as lições em ordem. */
export function groupLessonsByModule<TLesson extends Pick<Lesson, "module" | "order">>(
  lessons: readonly TLesson[],
): ModuleGroup<TLesson>[] {
  const lessonsByModule = groupBy(lessons, (lesson) => lesson.module || DEFAULT_MODULE_NAME)
  return Array.from(lessonsByModule, ([name, moduleLessons]) => ({ name, lessons: moduleLessons.sort(byOrder) }))
}

export function countCompletedLessons(progressByLessonId: ReadonlyMap<string, Pick<LessonProgress, "status">>): number {
  let completedCount = 0
  progressByLessonId.forEach((progress) => {
    if (progress.status === "completed") completedCount++
  })
  return completedCount
}

/** XP que o aluno já ganhou nas lições informadas. */
export function sumEarnedXp(
  lessons: readonly Pick<Lesson, "id">[],
  progressByLessonId: ReadonlyMap<string, Pick<LessonProgress, "xp_earned">>,
): number {
  return lessons.reduce((total, lesson) => total + (progressByLessonId.get(lesson.id)?.xp_earned ?? 0), 0)
}
