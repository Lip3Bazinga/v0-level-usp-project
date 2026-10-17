"use client"

import { useState } from "react"
import type { Course, Lesson } from "@levelusp/contracts"
import { deleteCourse, deleteLesson, getErrorMessage, setCoursePublished, setLessonPublished } from "@/lib/api"
import { swalConfirm, swalError, swalToast } from "@/lib/swal"
import type { TeacherContent } from "./use-teacher-dashboard"

type ContentUpdate = (update: (content: TeacherContent | null) => TeacherContent | null) => void

/** Item com operação em andamento (para o indicador no botão). */
export interface PendingItems {
  togglingLessonId: string | null
  deletingLessonId: string | null
  togglingCourseId: string | null
  deletingCourseId: string | null
}

export interface TeacherContentActions {
  pending: PendingItems
  toggleLessonPublished: (lesson: Lesson) => Promise<void>
  deleteLessonWithConfirm: (lesson: Lesson) => Promise<void>
  toggleCoursePublished: (course: Course) => Promise<void>
  deleteCourseWithConfirm: (course: Course) => Promise<void>
}

const NO_PENDING: PendingItems = { togglingLessonId: null, deletingLessonId: null, togglingCourseId: null, deletingCourseId: null }

/** Publicar, despublicar e excluir lições e cursos do painel do professor, sempre com confirmação. */
export function useTeacherContentActions(setContent: ContentUpdate): TeacherContentActions {
  const [pending, setPending] = useState<PendingItems>(NO_PENDING)
  const markPending = (changes: Partial<PendingItems>) => setPending((current) => ({ ...current, ...changes }))

  const updateLessons = (update: (lessons: Lesson[]) => Lesson[]) =>
    setContent((content) => (content ? { ...content, lessons: update(content.lessons) } : content))
  const updateCourses = (update: (courses: Course[]) => Course[]) =>
    setContent((content) => (content ? { ...content, courses: update(content.courses) } : content))

  const toggleLessonPublished = async (lesson: Lesson) => {
    const confirmed = await swalConfirm({
      title: `Deseja ${lesson.published ? "despublicar" : "publicar"} esta lição?`,
      text: lesson.published ? "A lição ficará invisível para os alunos." : "A lição ficará disponível para todos os alunos.",
      confirmText: lesson.published ? "Despublicar" : "Publicar",
      icon: "question",
    })
    if (!confirmed) return

    markPending({ togglingLessonId: lesson.id })
    try {
      const updated = await setLessonPublished(lesson.id, !lesson.published)
      updateLessons((lessons) => lessons.map((item) => (item.id === lesson.id ? { ...item, published: updated.published } : item)))
      swalToast({ title: lesson.published ? "Lição despublicada." : "Lição publicada!", icon: "success" })
    } catch (error) {
      // Ex.: a API recusa publicar lição de código sem casos de teste.
      await swalError({ title: "Não foi possível alterar a lição", text: getErrorMessage(error) })
    } finally {
      markPending({ togglingLessonId: null })
    }
  }

  const deleteLessonWithConfirm = async (lesson: Lesson) => {
    const confirmed = await swalConfirm({
      title: "Excluir lição?",
      text: `A lição "${lesson.title}" será excluída permanentemente. O progresso dos alunos também será removido.`,
      confirmText: "Excluir",
      danger: true,
    })
    if (!confirmed) return

    markPending({ deletingLessonId: lesson.id })
    try {
      await deleteLesson(lesson.id)
      updateLessons((lessons) => lessons.filter((item) => item.id !== lesson.id))
      swalToast({ title: "Lição excluída.", icon: "success" })
    } catch (error) {
      await swalError({ title: "Erro ao excluir lição", text: getErrorMessage(error) })
    } finally {
      markPending({ deletingLessonId: null })
    }
  }

  const toggleCoursePublished = async (course: Course) => {
    // Curso publicado sem lição aparece na vitrine e aceita matrícula, mas não
    // tem o que entregar ao aluno. Despublicar segue sempre permitido.
    if (!course.published && (course.lesson_count ?? 0) === 0) {
      await swalError({ text: "Este curso ainda não tem lições. Adicione ao menos uma lição antes de publicar." })
      return
    }
    const confirmed = await swalConfirm({
      title: `Deseja ${course.published ? "despublicar" : "publicar"} este curso?`,
      text: course.published ? "O curso ficará invisível para os alunos." : "O curso ficará visível para todos os alunos matriculados.",
      confirmText: course.published ? "Despublicar" : "Publicar",
      icon: "question",
    })
    if (!confirmed) return

    markPending({ togglingCourseId: course.id })
    try {
      await setCoursePublished(course.id, !course.published)
      updateCourses((courses) => courses.map((item) => (item.id === course.id ? { ...item, published: !course.published } : item)))
      swalToast({ title: course.published ? "Curso despublicado." : "Curso publicado!", icon: "success" })
    } catch (error) {
      await swalError({ title: "Não foi possível alterar o curso", text: getErrorMessage(error) })
    } finally {
      markPending({ togglingCourseId: null })
    }
  }

  const deleteCourseWithConfirm = async (course: Course) => {
    const confirmed = await swalConfirm({
      title: "Excluir curso?",
      text: `O curso "${course.title}" será excluído permanentemente. Esta ação não pode ser desfeita.`,
      confirmText: "Excluir",
      danger: true,
    })
    if (!confirmed) return

    markPending({ deletingCourseId: course.id })
    try {
      await deleteCourse(course.id)
      updateCourses((courses) => courses.filter((item) => item.id !== course.id))
      swalToast({ title: "Curso excluído.", icon: "success" })
    } catch (error) {
      await swalError({ title: "Erro ao excluir curso", text: getErrorMessage(error) })
    } finally {
      markPending({ deletingCourseId: null })
    }
  }

  return { pending, toggleLessonPublished, deleteLessonWithConfirm, toggleCoursePublished, deleteCourseWithConfirm }
}
