"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { LessonInput, QuizQuestionFull } from "@levelusp/contracts"
import {
  createLesson, errorMessage, fetchLessonForAuthoring, fetchQuizQuestionsForTeacher, replaceQuizQuestions,
  toggleLessonPublished, updateLesson,
} from "@/lib/api"
import { compileDrafts, draftsFromCases, type TestCaseDraft } from "../test-cases-editor"
import {
  DEFAULT_FORM, DEFAULT_TEST_CASES, diffLessonInput, formFromLesson, toLessonInput, toQuizInputs, validateLessonForm,
  validateQuiz, type LessonFormState,
} from "./lesson-form"

export type SaveResult =
  | { ok: true; lessonId: string; created: boolean; published: boolean; publishError?: string }
  | { ok: false; title: string; message: string; focusTests?: boolean }

/**
 * Estado e ações do editor de lição: carrega a lição com gabarito
 * (`/lessons/:id/authoring`), salva com POST/PATCH (só campos alterados),
 * grava o questionário e publica/despublica.
 */
export function useLessonEditor(idParam: string) {
  const isNew = idParam === "new"
  // Id criado nesta sessão do editor: a URL é trocada para /teacher/edit/<id>
  // sem recarregar a lição (o estado local já é a versão salva).
  const createdId = useRef<string | null>(null)
  const [lessonId, setLessonId] = useState<string | null>(isNew ? null : idParam)
  const [form, setForm] = useState<LessonFormState>(DEFAULT_FORM)
  const [drafts, setDrafts] = useState<TestCaseDraft[]>(() => (isNew ? draftsFromCases(DEFAULT_TEST_CASES) : []))
  const [quiz, setQuiz] = useState<QuizQuestionFull[]>([])
  const [published, setPublished] = useState(false)
  const [loading, setLoading] = useState(!isNew)
  const [quizLoading, setQuizLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Versão salva (base do diff do PATCH e do aviso de alterações pendentes).
  const baseline = useRef<LessonInput | null>(null)
  const quizBaseline = useRef<string>("[]")
  const [baselineVersion, setBaselineVersion] = useState(0)

  useEffect(() => {
    if (isNew || idParam === createdId.current) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setLoadError(null)
      try {
        const lesson = await fetchLessonForAuthoring(idParam)
        if (cancelled) return
        if (!lesson) {
          setLoadError("Lição não encontrada.")
          return
        }
        const f = formFromLesson(lesson)
        setForm(f)
        setDrafts(draftsFromCases(lesson.test_cases))
        setPublished(lesson.published)
        baseline.current = toLessonInput(f, lesson.test_cases ?? [])
        setBaselineVersion((v) => v + 1)
        if (lesson.lesson_type === "quiz") {
          setQuizLoading(true)
          try {
            const questions = await fetchQuizQuestionsForTeacher(lesson.id)
            if (cancelled) return
            setQuiz(questions)
            quizBaseline.current = JSON.stringify(toQuizInputs(questions))
          } catch (err) {
            if (!cancelled) setLoadError(errorMessage(err, "Não foi possível carregar as questões do questionário."))
          } finally {
            if (!cancelled) setQuizLoading(false)
          }
        }
      } catch (err) {
        if (!cancelled) setLoadError(errorMessage(err, "Não foi possível carregar a lição."))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [idParam, isNew])

  const patchForm = useCallback((patch: Partial<LessonFormState>) => setForm((prev) => ({ ...prev, ...patch })), [])

  const compiled = useMemo(() => compileDrafts(drafts), [drafts])

  /**
   * Casos enviados à API: só lições de código usam o gabarito; nas demais,
   * mantém o que já estava salvo (nada para lição nova).
   */
  const casesToSend = useCallback(
    () => (form.lesson_type === "coding" ? compiled.cases : baseline.current?.test_cases ?? []),
    [form.lesson_type, compiled],
  )

  const dirty = useMemo(() => {
    void baselineVersion
    if (!baseline.current) return true
    if (form.lesson_type === "coding" && !compiled.valid) return true
    const now = toLessonInput(form, casesToSend())
    if (Object.keys(diffLessonInput(baseline.current, now)).length) return true
    return form.lesson_type === "quiz" && JSON.stringify(toQuizInputs(quiz)) !== quizBaseline.current
  }, [form, compiled, quiz, baselineVersion, casesToSend])

  /**
   * Salva a lição. `publish` = true/false publica/despublica depois de salvar;
   * omitido, mantém o estado atual de publicação.
   */
  const save = useCallback(
    async (publish?: boolean): Promise<SaveResult> => {
      const formError = validateLessonForm(form)
      if (formError) return { ok: false, title: "Verifique os dados da lição", message: formError }
      if (form.lesson_type === "coding" && !compiled.valid) {
        return {
          ok: false,
          title: "Casos de teste com erro",
          message: `Corrija ${compiled.errorCount} erro(s) na aba Testes antes de salvar.`,
          focusTests: true,
        }
      }
      if (form.lesson_type === "quiz") {
        const quizError = validateQuiz(quiz)
        if (quizError) return { ok: false, title: "Questionário incompleto", message: quizError }
      }

      setSaving(true)
      let id = lessonId
      let created = false
      try {
        const input = toLessonInput(form, casesToSend())
        if (!id) {
          const lesson = await createLesson(input)
          id = lesson.id
          created = true
          createdId.current = id
          setLessonId(id)
        } else {
          const patch = baseline.current ? diffLessonInput(baseline.current, input) : input
          if (Object.keys(patch).length) await updateLesson(id, patch)
        }
        baseline.current = input

        // As questões ficam em tabela própria (gabarito nunca vai ao aluno).
        if (form.lesson_type === "quiz") {
          const inputs = toQuizInputs(quiz)
          const serialized = JSON.stringify(inputs)
          if (created || serialized !== quizBaseline.current) {
            const saved = await replaceQuizQuestions(id, inputs)
            setQuiz(saved)
            quizBaseline.current = JSON.stringify(toQuizInputs(saved))
          }
        }
        setBaselineVersion((v) => v + 1)
      } catch (err) {
        setSaving(false)
        return {
          ok: false,
          title: "Erro ao salvar",
          message: created
            ? `A lição foi criada como rascunho, mas o questionário não foi salvo: ${errorMessage(err)}`
            : errorMessage(err),
        }
      }

      // Publicação separada: a API recusa publicar lição de código sem casos.
      let publishError: string | undefined
      let isPublished = created ? false : published
      if (publish !== undefined && publish !== isPublished) {
        try {
          const lesson = await toggleLessonPublished(id, publish)
          isPublished = lesson.published
        } catch (err) {
          publishError = errorMessage(err)
        }
      }
      setPublished(isPublished)
      setSaving(false)
      return { ok: true, lessonId: id, created, published: isPublished, publishError }
    },
    [form, compiled, quiz, lessonId, published, casesToSend],
  )

  return {
    isNew,
    lessonId,
    form,
    patchForm,
    drafts,
    setDrafts,
    compiled,
    quiz,
    setQuiz,
    quizLoading,
    published,
    loading,
    loadError,
    saving,
    dirty,
    save,
  }
}

export type LessonEditor = ReturnType<typeof useLessonEditor>
