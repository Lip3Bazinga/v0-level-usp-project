"use client"

import { useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import type { Lesson, LessonSummary } from "@levelusp/contracts"
import { ROUTES } from "@/lib/constants"

type NavigableLesson = Pick<Lesson, "id" | "course_id">

/** Onde a lição está dentro do curso e para onde os botões anterior/próxima levam. */
export interface LessonPosition {
  /** Posição (base 0) da lição entre as lições do mesmo curso. */
  positionInCourse: number
  /** Total de lições do curso (no mínimo 1, para barras de progresso). */
  courseLessonCount: number
  previousLessonId: string | null
  nextLessonId: string | null
  /** Última lição de um curso: o "próximo" passo é a página do curso (certificado). */
  isCourseEnd: boolean
  /** Saída da lição: a página do curso ou, para lição avulsa, o painel. */
  exitRoute: string
}

/**
 * Anterior/próxima só navegam dentro do mesmo curso: `allLessons` é a lista global
 * de lições publicadas, em que a vizinha pode pertencer a outro curso.
 */
export function getLessonPosition(
  allLessons: readonly LessonSummary[],
  currentIndex: number,
  lesson: NavigableLesson,
): LessonPosition {
  const courseLessons = allLessons.filter((summary) => summary.course_id === lesson.course_id)
  const indexInCourse = courseLessons.findIndex((summary) => summary.id === lesson.id)
  const previousLesson = allLessons[currentIndex - 1]
  const nextLesson = allLessons[currentIndex + 1]
  const nextLessonId = nextLesson?.course_id === lesson.course_id ? nextLesson.id : null

  return {
    positionInCourse: indexInCourse >= 0 ? indexInCourse : currentIndex,
    courseLessonCount: courseLessons.length || 1,
    previousLessonId: previousLesson?.course_id === lesson.course_id ? previousLesson.id : null,
    nextLessonId,
    isCourseEnd: nextLessonId === null && Boolean(lesson.course_id),
    exitRoute: lesson.course_id ? ROUTES.course(lesson.course_id) : ROUTES.dashboard,
  }
}

/** Posição da lição no curso e as ações de ir para a anterior, a próxima ou sair. */
export interface LessonNavigation extends LessonPosition {
  hasPreviousLesson: boolean
  hasNextLesson: boolean
  goToPrevious: () => void
  /** Próxima lição do curso; no fim do curso, a página do curso (ou o painel). */
  goToNext: () => void
  goToExit: () => void
}

/** Navegação anterior/próxima comum às lições de código, teoria e questionário. */
export function useLessonNavigation(
  allLessons: readonly LessonSummary[],
  currentIndex: number,
  lesson: NavigableLesson,
): LessonNavigation {
  const router = useRouter()
  const position = useMemo(
    () => getLessonPosition(allLessons, currentIndex, lesson),
    [allLessons, currentIndex, lesson],
  )
  const { previousLessonId, nextLessonId, exitRoute } = position

  const goToPrevious = useCallback(() => {
    if (previousLessonId) router.push(ROUTES.lesson(previousLessonId))
  }, [previousLessonId, router])

  const goToNext = useCallback(() => {
    router.push(nextLessonId ? ROUTES.lesson(nextLessonId) : exitRoute)
  }, [nextLessonId, exitRoute, router])

  const goToExit = useCallback(() => router.push(exitRoute), [exitRoute, router])

  return {
    ...position,
    hasPreviousLesson: previousLessonId !== null,
    hasNextLesson: nextLessonId !== null,
    goToPrevious,
    goToNext,
    goToExit,
  }
}
