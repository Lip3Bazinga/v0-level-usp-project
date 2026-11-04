"use client"

import { useState } from "react"
import { CheckCircle2, ChevronDown, GraduationCap, Loader2, Pencil, Plus, Trash2, X } from "lucide-react"
import type { AdminExamQuestion, ExamQuestionInput } from "@levelusp/contracts"
import { useAsyncResource } from "@/hooks/use-async-resource"
import { createExamQuestion, fetchAdminExamQuestions, fetchAdminExams, getErrorMessage, updateExamQuestion } from "@/lib/api"
import type { OnToast } from "@/lib/types"
import { cn, removeChoiceAt } from "@/lib/utils"
import { PanelSpinner } from "./panel-spinner"

// Banco de questões da prova final. O gabarito só aparece aqui (rotas /admin):
// a API nunca envia correct_index ao aluno.

const MIN_PROMPT_LENGTH = 10
const MIN_OPTIONS = 2
const MAX_OPTIONS = 8
const DEFAULT_OPTION_COUNT = 4

type QuestionEditor = { mode: "create"; form: ExamQuestionInput } | { mode: "edit"; questionId: string; form: ExamQuestionInput }

function emptyQuestion(sortOrder: number): ExamQuestionInput {
  return {
    prompt: "",
    options: Array.from({ length: DEFAULT_OPTION_COUNT }, () => ""),
    correct_index: 0,
    explanation: "",
    topic: "",
    sort_order: sortOrder,
    active: true,
  }
}

function toQuestionInput(question: AdminExamQuestion): ExamQuestionInput {
  return {
    prompt: question.prompt,
    options: [...question.options],
    correct_index: question.correct_index,
    explanation: question.explanation,
    topic: question.topic,
    sort_order: question.sort_order,
    active: question.active,
  }
}

/** Primeira mensagem de erro do formulário, ou `null` quando pode salvar. */
export function validateExamQuestion(form: ExamQuestionInput): string | null {
  if (form.prompt.trim().length < MIN_PROMPT_LENGTH) return "Enunciado muito curto"
  if (form.options.some((option) => !option.trim())) return "Preencha todas as alternativas"
  if (form.correct_index >= form.options.length) return "Marque a alternativa correta"
  return null
}

interface ExamQuestionsPageProps {
  onToast: OnToast
}

export function ExamQuestionsPage({ onToast }: ExamQuestionsPageProps): React.JSX.Element {
  const exams = useAsyncResource(() => fetchAdminExams(), [], { errorMessage: "Erro ao carregar as provas" })
  const [chosenExamId, setChosenExamId] = useState<string | null>(null)
  const examList = exams.status === "success" ? exams.data : []
  const examId = chosenExamId ?? examList[0]?.id ?? ""

  const questions = useAsyncResource(async () => (examId ? fetchAdminExamQuestions(examId) : []), [examId], {
    errorMessage: "Erro ao carregar questões",
  })
  const [editor, setEditor] = useState<QuestionEditor | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const questionList = questions.status === "success" ? questions.data : []
  const activeCount = questionList.filter((question) => question.active).length
  const isLoading = exams.status === "loading" || (examId !== "" && questions.status === "loading")
  const loadError = exams.status === "error" ? exams.error : questions.status === "error" ? questions.error : null

  const replaceQuestion = (updated: AdminExamQuestion): void =>
    questions.setData((current) => current.map((question) => (question.id === updated.id ? updated : question)))

  const handleSave = async (): Promise<void> => {
    if (!editor) return
    const invalid = validateExamQuestion(editor.form)
    if (invalid) {
      onToast(invalid, "error")
      return
    }
    setIsSaving(true)
    try {
      if (editor.mode === "create") {
        const created = await createExamQuestion(examId, editor.form)
        questions.setData((current) => [...current, created])
        onToast("Questão criada")
      } else {
        replaceQuestion(await updateExamQuestion(editor.questionId, editor.form))
        onToast("Questão atualizada")
      }
      setEditor(null)
    } catch (error) {
      onToast(getErrorMessage(error, "Erro ao salvar"), "error")
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleActive = async (question: AdminExamQuestion): Promise<void> => {
    const setActive = (active: boolean): void =>
      questions.setData((current) => current.map((item) => (item.id === question.id ? { ...item, active } : item)))
    setActive(!question.active)
    try {
      await updateExamQuestion(question.id, { active: !question.active })
      onToast(question.active ? "Questão desativada" : "Questão ativada")
    } catch (error) {
      setActive(question.active)
      onToast(getErrorMessage(error, "Erro ao atualizar"), "error")
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-level-purple-dark">Questões da Prova</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Banco de questões da prova final — o gabarito nunca é visível para alunos</p>
        </div>
        <button
          onClick={() => setEditor({ mode: "create", form: emptyQuestion(questionList.length + 1) })}
          disabled={!examId}
          className="flex items-center gap-2 rounded-xl bg-level-purple px-4 py-2.5 text-sm font-semibold text-white hover:bg-level-purple-dark transition-colors disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Nova questão
        </button>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative">
          <select
            aria-label="Prova"
            value={examId}
            onChange={(event) => setChosenExamId(event.target.value)}
            className="appearance-none rounded-xl border border-border bg-white py-2.5 pl-4 pr-10 text-sm font-medium focus:border-level-purple focus:outline-none"
          >
            {examList.map((exam) => (
              <option key={exam.id} value={exam.id}>{exam.course_title} — {exam.title}</option>
            ))}
            {!examList.length && <option value="">Nenhuma prova cadastrada</option>}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
        <span className="text-xs text-muted-foreground">
          {questionList.length} questões · {activeCount} ativas na prova
        </span>
      </div>

      {editor && (
        <QuestionForm
          editor={editor}
          isSaving={isSaving}
          onChange={(form) => setEditor({ ...editor, form })}
          onCancel={() => setEditor(null)}
          onSave={() => void handleSave()}
        />
      )}

      {loadError && (
        <p role="alert" className="mb-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{loadError}</p>
      )}

      {isLoading ? (
        <PanelSpinner className="py-16" />
      ) : !questionList.length ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          <GraduationCap className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
          Nenhuma questão nesta prova ainda.
        </div>
      ) : (
        <div className="space-y-3">
          {questionList.map((question, position) => (
            <QuestionCard
              key={question.id}
              question={question}
              position={position}
              onEdit={() => setEditor({ mode: "edit", questionId: question.id, form: toQuestionInput(question) })}
              onToggleActive={() => void handleToggleActive(question)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface QuestionFormProps {
  editor: QuestionEditor
  isSaving: boolean
  onChange: (form: ExamQuestionInput) => void
  onCancel: () => void
  onSave: () => void
}

function QuestionForm({ editor, isSaving, onChange, onCancel, onSave }: QuestionFormProps): React.JSX.Element {
  const { form } = editor
  const patch = (changes: Partial<ExamQuestionInput>): void => onChange({ ...form, ...changes })
  const setOption = (index: number, value: string): void =>
    patch({ options: form.options.map((option, optionIndex) => (optionIndex === index ? value : option)) })

  return (
    <div className="mb-6 rounded-2xl border-2 border-level-purple bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold text-level-purple-dark">{editor.mode === "create" ? "Nova questão" : "Editar questão"}</h2>
        <button onClick={onCancel} aria-label="Fechar formulário" className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <label htmlFor="exam-question-prompt" className="mb-1 block text-xs font-semibold text-muted-foreground">Enunciado</label>
      <textarea
        id="exam-question-prompt"
        value={form.prompt}
        onChange={(event) => patch({ prompt: event.target.value })}
        rows={3}
        className="mb-4 w-full rounded-xl border border-border p-3 text-sm focus:border-level-purple focus:outline-none"
        placeholder="Ex.: Qual é o resultado de 7 // 2 em Python?"
      />

      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">Alternativas (marque a correta)</span>
        <button
          type="button"
          disabled={form.options.length >= MAX_OPTIONS}
          onClick={() => patch({ options: [...form.options, ""] })}
          className="text-xs font-semibold text-level-purple hover:underline disabled:opacity-40"
        >
          + alternativa
        </button>
      </div>
      <div className="mb-4 space-y-2">
        {form.options.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type="radio"
              name="correta"
              aria-label={`Alternativa ${index + 1} é a correta`}
              checked={form.correct_index === index}
              onChange={() => patch({ correct_index: index })}
              className="accent-level-purple"
            />
            <input
              aria-label={`Alternativa ${index + 1}`}
              value={option}
              onChange={(event) => setOption(index, event.target.value)}
              className="flex-1 rounded-lg border border-border px-3 py-2 font-mono text-xs focus:border-level-purple focus:outline-none"
              placeholder={`Alternativa ${index + 1}`}
            />
            <button
              type="button"
              aria-label={`Remover alternativa ${index + 1}`}
              disabled={form.options.length <= MIN_OPTIONS}
              onClick={() => onChange(removeChoiceAt(form, index))}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      <label htmlFor="exam-question-explanation" className="mb-1 block text-xs font-semibold text-muted-foreground">
        Explicação (mostrada a quem erra, após entregar a prova)
      </label>
      <textarea
        id="exam-question-explanation"
        value={form.explanation}
        onChange={(event) => patch({ explanation: event.target.value })}
        rows={2}
        className="mb-4 w-full rounded-xl border border-border p-3 text-sm focus:border-level-purple focus:outline-none"
      />

      <div className="mb-4 flex flex-wrap gap-4">
        <div>
          <label htmlFor="exam-question-topic" className="mb-1 block text-xs font-semibold text-muted-foreground">Tópico</label>
          <input
            id="exam-question-topic"
            value={form.topic}
            onChange={(event) => patch({ topic: event.target.value })}
            className="rounded-lg border border-border px-3 py-2 text-sm focus:border-level-purple focus:outline-none"
            placeholder="ex.: poo, funcional"
          />
        </div>
        <div>
          <label htmlFor="exam-question-order" className="mb-1 block text-xs font-semibold text-muted-foreground">Ordem</label>
          <input
            id="exam-question-order"
            type="number"
            value={form.sort_order}
            onChange={(event) => patch({ sort_order: Number(event.target.value) })}
            className="w-24 rounded-lg border border-border px-3 py-2 text-sm focus:border-level-purple focus:outline-none"
          />
        </div>
      </div>

      <button
        onClick={onSave}
        disabled={isSaving}
        className="flex items-center gap-2 rounded-xl bg-level-purple px-5 py-2.5 text-sm font-semibold text-white hover:bg-level-purple-dark transition-colors disabled:opacity-50"
      >
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        Salvar questão
      </button>
    </div>
  )
}

interface QuestionCardProps {
  question: AdminExamQuestion
  position: number
  onEdit: () => void
  onToggleActive: () => void
}

function QuestionCard({ question, position, onEdit, onToggleActive }: QuestionCardProps): React.JSX.Element {
  return (
    <div className={cn("rounded-2xl border border-border bg-white p-4", !question.active && "opacity-60")}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-level-purple-subtle text-xs font-bold text-level-purple">
          {position + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-level-purple-dark whitespace-pre-wrap">{question.prompt}</p>
          <div className="mt-2 space-y-1">
            {question.options.map((option, index) => {
              const isCorrect = index === question.correct_index
              return (
                <p key={index} className={cn("font-mono text-xs", isCorrect ? "font-bold text-green-700" : "text-muted-foreground")}>
                  {isCorrect ? "✓ " : "· "}
                  {option}
                </p>
              )
            })}
          </div>
          {question.topic && (
            <span className="mt-2 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              {question.topic}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={onEdit}
            className="rounded-lg border border-border p-2 text-muted-foreground hover:text-level-purple hover:border-level-purple transition-colors"
            title="Editar"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onToggleActive}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
              question.active ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-muted text-muted-foreground hover:bg-muted/70",
            )}
          >
            {question.active ? "Ativa" : "Inativa"}
          </button>
        </div>
      </div>
    </div>
  )
}
