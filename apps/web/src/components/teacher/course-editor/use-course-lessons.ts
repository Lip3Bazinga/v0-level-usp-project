"use client"

import { useState } from "react"
import { arrayMove } from "@dnd-kit/sortable"
import type { Lesson } from "@levelusp/contracts"
import { useAsyncResource } from "@/hooks/use-async-resource"
import {
  addLessonToCourse, fetchCourseLessons, fetchTeacherLessons, getErrorMessage, removeLessonFromCourse, reorderCourseLessons,
} from "@/lib/api"

interface CourseLessonsData {
  /** Lições do curso, na ordem da trilha. */
  courseLessons: Lesson[]
  /** Lições avulsas do professor, que podem ser anexadas ao curso. */
  freeLessons: Lesson[]
}

const NO_LESSONS: CourseLessonsData = { courseLessons: [], freeLessons: [] }

async function loadCourseLessons(courseId: string): Promise<CourseLessonsData> {
  const [inCourse, mine] = await Promise.all([fetchCourseLessons(courseId), fetchTeacherLessons()])
  const courseLessons = [...inCourse].sort((first, second) => first.order - second.order)
  const courseLessonIds = new Set(courseLessons.map((lesson) => lesson.id))
  return { courseLessons, freeLessons: mine.filter((lesson) => !courseLessonIds.has(lesson.id) && lesson.course_id === null) }
}
export interface UseCourseLessonsResult {
  isLoading: boolean
  loadError: string | null
  reload: () => Promise<void>
  courseLessons: Lesson[]
  freeLessons: Lesson[]
  removingId: string | null
  addingId: string | null
  isReordering: boolean
  reorder: (activeId: string, overId: string) => Promise<void>
  remove: (lessonId: string) => Promise<void>
  add: (lesson: Lesson) => Promise<void>
}

/**
 * Lições de um curso: reordenar (salvo na hora, com volta atrás se falhar), remover
 * e anexar lições avulsas. Sem `courseId` (curso ainda não salvo) a lista fica vazia.
 */
export function useCourseLessons(courseId: string | null, onError: (message: string) => void): UseCourseLessonsResult {
  const resource = useAsyncResource(async () => (courseId ? loadCourseLessons(courseId) : NO_LESSONS), [courseId], {
    errorMessage: "Não foi possível carregar as lições do curso.",
  })
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [isReordering, setIsReordering] = useState(false)
  const { courseLessons, freeLessons } = resource.status === "success" ? resource.data : NO_LESSONS

  const setCourseLessons = (next: Lesson[]): void => resource.setData((current) => ({ ...current, courseLessons: next }))

  const reorder = async (activeId: string, overId: string): Promise<void> => {
    if (!courseId || activeId === overId) return
    const previous = courseLessons
    const reordered = arrayMove(
      previous,
      previous.findIndex((lesson) => lesson.id === activeId),
      previous.findIndex((lesson) => lesson.id === overId),
    )
    setCourseLessons(reordered)
    setIsReordering(true)
    try {
      await reorderCourseLessons(courseId, reordered.map((lesson) => lesson.id))
    } catch (error) {
      setCourseLessons(previous)
      onError(`Erro ao salvar a nova ordem: ${getErrorMessage(error)}`)
    } finally {
      setIsReordering(false)
    }
  }

  const remove = async (lessonId: string): Promise<void> => {
    if (!courseId) return
    setRemovingId(lessonId)
    try {
      await removeLessonFromCourse(courseId, lessonId)
      resource.setData((current) => {
        const removed = current.courseLessons.find((lesson) => lesson.id === lessonId)
        return {
          courseLessons: current.courseLessons.filter((lesson) => lesson.id !== lessonId),
          freeLessons: removed ? [...current.freeLessons, { ...removed, course_id: null }] : current.freeLessons,
        }
      })
    } catch (error) {
      onError(`Erro ao remover lição: ${getErrorMessage(error)}`)
    } finally {
      setRemovingId(null)
    }
  }

  const add = async (lesson: Lesson): Promise<void> => {
    if (!courseId) return
    setAddingId(lesson.id)
    try {
      const order = courseLessons.length + 1
      await addLessonToCourse(courseId, lesson.id, order)
      resource.setData((current) => ({
        courseLessons: [...current.courseLessons, { ...lesson, course_id: courseId, order }],
        freeLessons: current.freeLessons.filter((item) => item.id !== lesson.id),
      }))
    } catch (error) {
      onError(`Erro ao adicionar lição: ${getErrorMessage(error)}`)
    } finally {
      setAddingId(null)
    }
  }

  return {
    isLoading: resource.status === "loading",
    loadError: resource.status === "error" ? resource.error : null,
    reload: resource.reload,
    courseLessons,
    freeLessons,
    removingId,
    addingId,
    isReordering,
    reorder,
    remove,
    add,
  }
}

export type CourseLessons = ReturnType<typeof useCourseLessons>
