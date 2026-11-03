import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, HelpCircle, Plus, Trash2, X } from "lucide-react"
import type { QuizQuestionFull } from "@levelusp/contracts"
import { cn, moveItem, removeChoiceAt, type MoveDirection } from "@/lib/utils"
import { ADD_BUTTON_CLASS, EditorPanel, MINI_LABEL_CLASS, SMALL_INPUT_CLASS } from "./panel"

const MIN_OPTIONS = 2
const MAX_OPTIONS = 8
const ORDER_BUTTON_CLASS =
  "flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"

type QuestionsUpdate = (update: (questions: QuizQuestionFull[]) => QuizQuestionFull[]) => void

/** "A", "B", "C"… */
function optionLetter(index: number): string {
  return String.fromCharCode("A".charCodeAt(0) + index)
}

function newQuestion(position: number): QuizQuestionFull {
  // Id provisório só para a chave do React; a API devolve os ids definitivos ao salvar.
  return { id: `novo-${Date.now()}-${position}`, prompt: "", options: ["", ""], correct_index: 0, explanation: "", sort_order: position }
}

interface QuizTabProps {
  questions: QuizQuestionFull[]
  onChange: QuestionsUpdate
  passingScore: number
}

export function QuizTab({ questions, onChange, passingScore }: QuizTabProps): React.JSX.Element {
  const handleAdd = (): void => onChange((current) => [...current, newQuestion(current.length)])
  const handleUpdate = (questionId: string, changes: Partial<QuizQuestionFull>): void =>
    onChange((current) => current.map((question) => (question.id === questionId ? { ...question, ...changes } : question)))
  const handleRemove = (questionId: string): void => onChange((current) => current.filter((question) => question.id !== questionId))
  const handleMove = (index: number, direction: MoveDirection): void => onChange((current) => moveItem(current, index, direction))

  return (
    <EditorPanel
      icon={HelpCircle}
      title="Questões"
      subtitle={`Múltipla escolha · correção no servidor · nota mínima ${passingScore}%`}
      action={
        <button type="button" onClick={handleAdd} className={ADD_BUTTON_CLASS}>
          <Plus className="h-4 w-4" /> Adicionar questão
        </button>
      }
    >
      <div className="mb-4 flex items-start gap-2 rounded-xl bg-level-purple-subtle px-4 py-3">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-level-purple" />
        <p className="text-xs text-level-purple-dark">
          O gabarito e as explicações ficam protegidos no servidor e{" "}
          <strong>nunca são enviados ao navegador do aluno</strong> — a correção acontece apenas no servidor.
        </p>
      </div>

      {questions.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border py-8 text-center">
          <HelpCircle className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nenhuma questão ainda. Adicione a primeira pergunta do questionário.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((question, index) => (
            <QuestionCard
              key={question.id}
              question={question}
              index={index}
              isLast={index === questions.length - 1}
              onChange={(changes) => handleUpdate(question.id, changes)}
              onRemove={() => handleRemove(question.id)}
              onMove={(direction) => handleMove(index, direction)}
            />
          ))}
        </div>
      )}
    </EditorPanel>
  )
}

interface QuestionCardProps {
  question: QuizQuestionFull
  index: number
  isLast: boolean
  onChange: (changes: Partial<QuizQuestionFull>) => void
  onRemove: () => void
  onMove: (direction: MoveDirection) => void
}

function QuestionCard({ question, index, isLast, onChange, onRemove, onMove }: QuestionCardProps): React.JSX.Element {
  const setOption = (optionIndex: number, value: string): void =>
    onChange({ options: question.options.map((option, position) => (position === optionIndex ? value : option)) })

  return (
    <div className="rounded-xl border-2 border-border p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-level-purple">Questão {index + 1}</span>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Mover para cima" onClick={() => onMove(-1)} disabled={index === 0} className={ORDER_BUTTON_CLASS}>
            <ChevronUp className="h-4 w-4" />
          </button>
          <button type="button" aria-label="Mover para baixo" onClick={() => onMove(1)} disabled={isLast} className={ORDER_BUTTON_CLASS}>
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Remover questão"
            onClick={onRemove}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label htmlFor={`quiz-prompt-${question.id}`} className={MINI_LABEL_CLASS}>Enunciado</label>
          <textarea
            id={`quiz-prompt-${question.id}`}
            value={question.prompt}
            onChange={(event) => onChange({ prompt: event.target.value })}
            rows={2}
            placeholder="Ex: Qual é o resultado de len('Python')?"
            className={cn(SMALL_INPUT_CLASS, "resize-none")}
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Alternativas — clique no círculo para marcar a correta
            </span>
            <button
              type="button"
              onClick={() => onChange({ options: [...question.options, ""] })}
              disabled={question.options.length >= MAX_OPTIONS}
              className="text-xs font-semibold text-level-purple hover:underline disabled:opacity-40"
            >
              + alternativa
            </button>
          </div>
          <div className="space-y-2">
            {question.options.map((option, optionIndex) => {
              const isCorrect = question.correct_index === optionIndex
              const letter = optionLetter(optionIndex)
              return (
                <div key={optionIndex} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onChange({ correct_index: optionIndex })}
                    title="Marcar como correta"
                    aria-label={`Marcar alternativa ${letter} como correta`}
                    aria-pressed={isCorrect}
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                      isCorrect ? "border-success bg-success text-white" : "border-border text-transparent hover:border-success",
                    )}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                  <input
                    value={option}
                    onChange={(event) => setOption(optionIndex, event.target.value)}
                    placeholder={`Alternativa ${letter}`}
                    aria-label={`Alternativa ${letter}${isCorrect ? " (correta)" : ""}`}
                    className={cn(
                      "w-full rounded-xl border-2 px-3 py-2 text-sm focus:outline-none",
                      isCorrect ? "border-success/50 bg-success/5 focus:border-success" : "border-border focus:border-level-purple",
                    )}
                  />
                  <button
                    type="button"
                    aria-label="Remover alternativa"
                    onClick={() => onChange(removeChoiceAt(question, optionIndex))}
                    disabled={question.options.length <= MIN_OPTIONS}
                    className={cn(ORDER_BUTTON_CLASS, "shrink-0")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <label htmlFor={`quiz-expl-${question.id}`} className={MINI_LABEL_CLASS}>Explicação (mostrada após a correção)</label>
          <input
            id={`quiz-expl-${question.id}`}
            value={question.explanation}
            onChange={(event) => onChange({ explanation: event.target.value })}
            placeholder="Ex: len() conta os caracteres da string, e 'Python' tem 6."
            className={SMALL_INPUT_CLASS}
          />
        </div>
      </div>
    </div>
  )
}
