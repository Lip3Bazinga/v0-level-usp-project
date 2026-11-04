"use client"

import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from "react"
import type { LessonInput, LessonWithTests, QuizQuestionFull, TestCase } from "@levelusp/contracts"
import {
  createLesson, fetchLessonForAuthoring, fetchQuizForAuthoring, getErrorMessage, replaceQuizQuestions, setLessonPublished,
  updateLesson,
} from "@/lib/api"
import { definedProps } from "@/lib/utils"
import { compileDrafts, draftsFromCases, type TestCaseDraft } from "../test-cases-editor"
import type { CompiledDrafts } from "../test-cases/drafts"
import {
  DEFAULT_FORM, DEFAULT_TEST_CASES, diffLessonInput, formFromLesson, toLessonInput, toQuizInputs, validateLessonForm,
  validateQuiz, type LessonFormState,
} from "./lesson-form"

/** Lição carregada para edição: com gabarito e, nos questionários, as questões. */
export interface EditableLesson {
  lesson: LessonWithTests
  quiz: QuizQuestionFull[]
  /** Falha ao buscar as questões: o editor abre mesmo assim, com o aviso. */
  quizError: string | null
}

/** `null` quando a lição não existe (ou não é do professor). */
export async function loadLessonForEditing(lessonId: string): Promise<EditableLesson | null> {
  const lesson = await fetchLessonForAuthoring(lessonId)
  if (!lesson) return null
  if (lesson.lesson_type !== "quiz") return { lesson, quiz: [], quizError: null }
  try {
    return { lesson, quiz: await fetchQuizForAuthoring(lesson.id), quizError: null }
  } catch (error) {
    return { lesson, quiz: [], quizError: getErrorMessage(error, "Não foi possível carregar as questões do questionário.") }
  }
}

export type SaveResult =
  | { ok: true; lessonId: string; created: boolean; published: boolean; publishError?: string }
  | { ok: false; title: string; message: string; focusTests?: boolean }

const NO_TEST_CASES: TestCase[] = []

interface SavedLesson {
  id: string
  created: boolean
}

function serializeQuiz(questions: QuizQuestionFull[]): string {
  return JSON.stringify(toQuizInputs(questions))
}

interface LessonEditorOptions {
  /** Chamado quando uma lição nova é criada no primeiro salvamento. */
  onCreated?: (lessonId: string) => void
}
export interface UseLessonEditorResult {
  lessonId: string | null
  form: LessonFormState
  patchForm: (changes: Partial<LessonFormState>) => void
  drafts: TestCaseDraft[]
  setDrafts: Dispatch<SetStateAction<TestCaseDraft[]>>
  compiled: CompiledDrafts
  quiz: QuizQuestionFull[]
  setQuiz: Dispatch<SetStateAction<QuizQuestionFull[]>>
  published: boolean
  loadError: string | null
  isSaving: boolean
  isDirty: boolean
  save: (publish?: boolean) => Promise<SaveResult>
}

/**
 * Estado e ações do editor de lição: parte da lição carregada (ou de uma nova),
 * salva com POST/PATCH (só campos alterados), grava o questionário e
 * publica/despublica.
 */
export function useLessonEditor(initial: EditableLesson | null, { onCreated }: LessonEditorOptions = {}): UseLessonEditorResult {
  const [lessonId, setLessonId] = useState<string | null>(initial?.lesson.id ?? null)
  const [form, setForm] = useState<LessonFormState>(() => (initial ? formFromLesson(initial.lesson) : DEFAULT_FORM))
  const [drafts, setDrafts] = useState<TestCaseDraft[]>(() => draftsFromCases(initial ? initial.lesson.test_cases : DEFAULT_TEST_CASES))
  const [quiz, setQuiz] = useState<QuizQuestionFull[]>(initial?.quiz ?? [])
  const [published, setPublished] = useState(initial?.lesson.published ?? false)
  const [isSaving, setIsSaving] = useState(false)

  // Versão salva: base do diff do PATCH e do aviso de alterações pendentes.
  const [baseline, setBaseline] = useState<LessonInput | null>(() =>
    initial ? toLessonInput(formFromLesson(initial.lesson), initial.lesson.test_cases) : null,
  )
  const [quizBaseline, setQuizBaseline] = useState(() => serializeQuiz(initial?.quiz ?? []))

  const patchForm = useCallback((changes: Partial<LessonFormState>) => setForm((current) => ({ ...current, ...changes })), [])

  const compiled = useMemo(() => compileDrafts(drafts), [drafts])

  // Só lições de código usam o gabarito; nas demais, mantém o que já estava salvo (nada para lição nova).
  const casesToSend: TestCase[] = form.lesson_type === "coding" ? compiled.cases : baseline?.test_cases ?? NO_TEST_CASES

  const isDirty = useMemo(() => {
    if (!baseline) return true
    if (form.lesson_type === "coding" && !compiled.valid) return true
    if (Object.keys(diffLessonInput(baseline, toLessonInput(form, casesToSend))).length) return true
    return form.lesson_type === "quiz" && serializeQuiz(quiz) !== quizBaseline
  }, [baseline, form, compiled.valid, casesToSend, quiz, quizBaseline])

  const validate = (): SaveResult | null => {
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
    const quizError = form.lesson_type === "quiz" ? validateQuiz(quiz) : null
    return quizError ? { ok: false, title: "Questionário incompleto", message: quizError } : null
  }

  /** Cria a lição ou envia só o que mudou. Devolve o id e se ela foi criada agora. */
  const persistLesson = async (): Promise<SavedLesson> => {
    const input = toLessonInput(form, casesToSend)
    if (!lessonId) {
      const { id } = await createLesson(input)
      setLessonId(id)
      setBaseline(input)
      onCreated?.(id)
      return { id, created: true }
    }
    const changes = baseline ? diffLessonInput(baseline, input) : input
    if (Object.keys(changes).length) await updateLesson(lessonId, changes)
    setBaseline(input)
    return { id: lessonId, created: false }
  }

  /** As questões ficam em tabela própria (o gabarito nunca vai ao aluno). */
  const persistQuiz = async ({ id, created }: SavedLesson): Promise<void> => {
    if (form.lesson_type !== "quiz") return
    const inputs = toQuizInputs(quiz)
    if (!created && JSON.stringify(inputs) === quizBaseline) return
    const savedQuestions = await replaceQuizQuestions(id, inputs)
    setQuiz(savedQuestions)
    setQuizBaseline(serializeQuiz(savedQuestions))
  }

  /**
   * Salva a lição. `publish` = true/false publica/despublica depois de salvar;
   * omitido, mantém o estado atual de publicação.
   */
  const save = async (publish?: boolean): Promise<SaveResult> => {
    const invalid = validate()
    if (invalid) return invalid

    setIsSaving(true)
    const fail = (message: string): SaveResult => {
      setIsSaving(false)
      return { ok: false, title: "Erro ao salvar", message }
    }
    let saved: SavedLesson
    try {
      saved = await persistLesson()
    } catch (error) {
      return fail(getErrorMessage(error))
    }
    try {
      await persistQuiz(saved)
    } catch (error) {
      const message = getErrorMessage(error)
      return fail(saved.created ? `A lição foi criada como rascunho, mas o questionário não foi salvo: ${message}` : message)
    }

    // Publicação separada: a API recusa publicar lição de código sem casos.
    let publishError: string | undefined
    let isPublished = saved.created ? false : published
    if (publish !== undefined && publish !== isPublished) {
      try {
        isPublished = (await setLessonPublished(saved.id, publish)).published
      } catch (error) {
        publishError = getErrorMessage(error)
      }
    }
    setPublished(isPublished)
    setIsSaving(false)
    return { ok: true, lessonId: saved.id, created: saved.created, published: isPublished, ...definedProps({ publishError }) }
  }

  return {
    lessonId,
    form,
    patchForm,
    drafts,
    setDrafts,
    compiled,
    quiz,
    setQuiz,
    published,
    loadError: initial?.quizError ?? null,
    isSaving,
    isDirty,
    save,
  }
}

export type LessonEditor = ReturnType<typeof useLessonEditor>
