import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, HelpCircle, Plus, Trash2, X } from "lucide-react"
import type { QuizQuestionFull } from "@levelusp/contracts"
import { addButtonClass, EditorPanel, miniLabelClass, smallInputClass } from "./panel"

type Updater = (fn: (prev: QuizQuestionFull[]) => QuizQuestionFull[]) => void

function moveItem<T>(list: T[], index: number, dir: -1 | 1): T[] {
  const target = index + dir
  if (index < 0 || target < 0 || target >= list.length) return list
  const copy = [...list]
  ;[copy[index], copy[target]] = [copy[target]!, copy[index]!]
  return copy
}

export function QuizTab({ questions, setQuestions, passingScore, loading }: {
  questions: QuizQuestionFull[]
  setQuestions: Updater
  passingScore: number
  loading: boolean
}) {
  const add = () =>
    setQuestions((prev) => [
      ...prev,
      { id: `novo-${Date.now()}-${prev.length}`, prompt: "", options: ["", ""], correct_index: 0, explanation: "", sort_order: prev.length },
    ])
  const update = (id: string, patch: Partial<QuizQuestionFull>) =>
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)))
  const remove = (id: string) => setQuestions((prev) => prev.filter((q) => q.id !== id))
  const move = (index: number, dir: -1 | 1) => setQuestions((prev) => moveItem(prev, index, dir))
  const setOption = (q: QuizQuestionFull, i: number, value: string) =>
    update(q.id, { options: q.options.map((o, j) => (j === i ? value : o)) })
  const removeOption = (q: QuizQuestionFull, i: number) => {
    if (q.options.length <= 2) return
    const correct_index = q.correct_index === i ? 0 : q.correct_index > i ? q.correct_index - 1 : q.correct_index
    update(q.id, { options: q.options.filter((_, j) => j !== i), correct_index })
  }

  return (
    <EditorPanel
      icon={HelpCircle}
      title="Questões"
      subtitle={`Múltipla escolha · correção no servidor · nota mínima ${passingScore}%`}
      action={
        <button type="button" onClick={add} className={addButtonClass}>
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

      {loading ? (
        <div className="space-y-2">
          {[0, 1].map((i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-muted/50" />)}
        </div>
      ) : questions.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border py-8 text-center">
          <HelpCircle className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nenhuma questão ainda. Adicione a primeira pergunta do questionário.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <div key={q.id} className="rounded-xl border-2 border-border p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-level-purple">Questão {idx + 1}</span>
                <div className="flex items-center gap-1">
                  <button type="button" aria-label="Mover para cima" onClick={() => move(idx, -1)} disabled={idx === 0}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30">
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button type="button" aria-label="Mover para baixo" onClick={() => move(idx, 1)} disabled={idx === questions.length - 1}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30">
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button type="button" aria-label="Remover questão" onClick={() => remove(q.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className={miniLabelClass}>Enunciado</label>
                  <textarea
                    value={q.prompt}
                    onChange={(e) => update(q.id, { prompt: e.target.value })}
                    rows={2}
                    placeholder="Ex: Qual é o resultado de len('Python')?"
                    className={`${smallInputClass} resize-none`}
                  />
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Alternativas — clique no círculo para marcar a correta
                    </span>
                    <button
                      type="button"
                      onClick={() => update(q.id, { options: [...q.options, ""] })}
                      disabled={q.options.length >= 8}
                      className="text-xs font-semibold text-level-purple hover:underline disabled:opacity-40"
                    >
                      + alternativa
                    </button>
                  </div>
                  <div className="space-y-2">
                    {q.options.map((opt, oi) => {
                      const correct = q.correct_index === oi
                      return (
                        <div key={oi} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => update(q.id, { correct_index: oi })}
                            title="Marcar como correta"
                            aria-pressed={correct}
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                              correct ? "border-success bg-success text-white" : "border-border text-transparent hover:border-success"
                            }`}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                          <input
                            value={opt}
                            onChange={(e) => setOption(q, oi, e.target.value)}
                            placeholder={`Alternativa ${String.fromCharCode(65 + oi)}`}
                            className={`w-full rounded-xl border-2 px-3 py-2 text-sm focus:outline-none ${
                              correct ? "border-success/50 bg-success/5 focus:border-success" : "border-border focus:border-level-purple"
                            }`}
                          />
                          <button
                            type="button"
                            aria-label="Remover alternativa"
                            onClick={() => removeOption(q, oi)}
                            disabled={q.options.length <= 2}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label className={miniLabelClass}>Explicação (mostrada após a correção)</label>
                  <input
                    value={q.explanation}
                    onChange={(e) => update(q.id, { explanation: e.target.value })}
                    placeholder="Ex: len() conta os caracteres da string, e 'Python' tem 6."
                    className={smallInputClass}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </EditorPanel>
  )
}
