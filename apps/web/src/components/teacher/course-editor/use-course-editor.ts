"use client"

import { useState } from "react"
import type { Course, CourseInput } from "@levelusp/contracts"
import { createCourse, getErrorMessage, setCoursePublished, updateCourse, uploadImage } from "@/lib/api"
import { MAX_COVER_IMAGE_BYTES } from "@/lib/constants"
import { EMPTY_COURSE_FORM, diffCourseInput, formFromCourse, toCourseInput, validateCourseForm, type CourseFormState } from "./course-form"

export type CourseSaveResult =
  | { ok: true; created: boolean; publishSkipped: boolean }
  | { ok: false; title: string; message: string }

interface CourseEditorOptions {
  /** Chamado quando um curso novo é criado no primeiro salvamento. */
  onCreated?: (courseId: string) => void
}

/**
 * Estado e ações do editor de curso: parte do curso carregado (ou de um novo), salva
 * com POST/PATCH (só campos alterados), publica/despublica e cuida da capa.
 */
export function useCourseEditor(initial: Course | null, { onCreated }: CourseEditorOptions = {}) {
  const [form, setForm] = useState<CourseFormState>(() => (initial ? formFromCourse(initial) : EMPTY_COURSE_FORM))
  const [courseId, setCourseId] = useState<string | null>(initial?.id ?? null)
  const [isPublished, setIsPublished] = useState(initial?.published ?? false)
  const [coverPreview, setCoverPreview] = useState<string | null>(initial?.cover_image_url ?? null)
  // Versão salva: base do diff do PATCH.
  const [baseline, setBaseline] = useState<CourseInput | null>(() => (initial ? toCourseInput(formFromCourse(initial)) : null))
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const patchForm = (changes: Partial<CourseFormState>) => setForm((current) => ({ ...current, ...changes }))
  const patchBaseline = (changes: Partial<CourseInput>) => setBaseline((current) => (current ? { ...current, ...changes } : current))

  /** Cria o curso (rascunho) ou envia só os campos alterados. Devolve o id. */
  const persist = async (): Promise<string> => {
    const input = toCourseInput(form)
    if (!courseId) {
      const created = await createCourse(input)
      setCourseId(created.id)
      setIsPublished(created.published)
      setBaseline(input)
      onCreated?.(created.id)
      return created.id
    }
    const changes = baseline ? diffCourseInput(baseline, input) : input
    if (Object.keys(changes).length) await updateCourse(courseId, changes)
    setBaseline(input)
    return courseId
  }

  /**
   * Salva o curso. `publish` = true/false publica/despublica depois de salvar;
   * publicar sem lições (`lessonCount` = 0) salva como rascunho (`publishSkipped`).
   */
  const save = async (publish: boolean | undefined, lessonCount: number): Promise<CourseSaveResult> => {
    const invalid = validateCourseForm(form)
    if (invalid) return { ok: false, title: "Verifique os dados do curso", message: invalid }

    setIsSaving(true)
    setError(null)
    const isCreating = !courseId
    try {
      const id = await persist()
      let publishSkipped = false
      if (publish !== undefined && publish !== isPublished) {
        if (publish && lessonCount === 0) publishSkipped = true
        else setIsPublished((await setCoursePublished(id, publish)).published)
      }
      return { ok: true, created: isCreating, publishSkipped }
    } catch (saveError) {
      const message = getErrorMessage(saveError)
      setError(message)
      return { ok: false, title: "Erro ao salvar", message }
    } finally {
      setIsSaving(false)
    }
  }

  const uploadCover = async (file: File) => {
    if (file.size > MAX_COVER_IMAGE_BYTES) {
      setError("A imagem deve ter no máximo 5 MB.")
      return
    }
    if (!courseId && validateCourseForm(form)) {
      setError("Preencha o título (3+ caracteres) para salvar o curso antes de enviar a capa.")
      return
    }
    const previousPreview = coverPreview
    setCoverPreview(URL.createObjectURL(file))
    setIsUploading(true)
    setError(null)
    try {
      const id = await persist()
      const url = await uploadImage(file)
      await updateCourse(id, { cover_image_url: url })
      patchForm({ cover_image_url: url })
      patchBaseline({ cover_image_url: url })
      setCoverPreview(url)
    } catch (uploadError) {
      setCoverPreview(previousPreview)
      setError(`Erro no envio da capa: ${getErrorMessage(uploadError)}`)
    } finally {
      setIsUploading(false)
    }
  }

  const removeCover = async () => {
    const previous = { url: form.cover_image_url, preview: coverPreview }
    patchForm({ cover_image_url: null })
    setCoverPreview(null)
    if (!courseId) return
    try {
      await updateCourse(courseId, { cover_image_url: null })
      patchBaseline({ cover_image_url: null })
    } catch (removeError) {
      patchForm({ cover_image_url: previous.url })
      setCoverPreview(previous.preview)
      setError(`Erro ao remover a capa: ${getErrorMessage(removeError)}`)
    }
  }

  return {
    form,
    patchForm,
    courseId,
    isPublished,
    coverPreview,
    isSaving,
    isUploading,
    error,
    setError,
    save,
    uploadCover,
    removeCover,
  }
}
