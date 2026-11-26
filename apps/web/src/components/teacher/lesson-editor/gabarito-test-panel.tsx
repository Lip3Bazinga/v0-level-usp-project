"use client"

import { FlaskConical, Loader2, Play, Plus, Trash2 } from "lucide-react"
import { MAX_DRAFT_WRONG_SOLUTIONS, type DraftProjectVerdict, type DraftStepVerifyResult, type LessonStepInput } from "@levelusp/contracts"
import { cn } from "@/lib/utils"
import {
  exerciseSteps, requestSignature,
  type GabaritoLesson, type StepTestState, type WrongSolutionDraft, type WrongSolutionsByStep,
} from "./gabarito-test"
import { ADD_BUTTON_CLASS, EditorPanel, MINI_LABEL_CLASS, SMALL_INPUT_CLASS } from "./panel"
import { useGabaritoTest, type VerifyDraftStep } from "./use-gabarito-test"

const TEXTAREA_CLASS = `${SMALL_INPUT_CLASS} font-mono`
const NO_DRAFTS: readonly WrongSolutionDraft[] = []

interface GabaritoTestPanelProps {
  /** Estado NÃO salvo do formulário: o teste usa o que está na tela agora. */
  lesson: GabaritoLesson
  /** Soluções erradas por passo; ficam com a tela do editor para sobreviver à troca de aba. */
  wrongSolutions: WrongSolutionsByStep
  onWrongSolutionsChange: (wrongSolutions: WrongSolutionsByStep) => void
  /** Chamada à API que testa um passo (trocada nos testes). */
  verify?: VerifyDraftStep
}

/**
 * "Testar gabarito": roda no corretor cada passo de exercício do rascunho (mesmo sem salvar) e
 * mostra, por passo, se a solução de referência aprovou e se o código inicial e as soluções
 * erradas reprovaram, com o motivo quando não. As soluções erradas são digitadas aqui, valem só
 * para o teste e nunca são salvas.
 */
export function GabaritoTestPanel({ lesson, wrongSolutions, onWrongSolutionsChange, verify }: GabaritoTestPanelProps): React.JSX.Element {
  const test = useGabaritoTest(verify)
  const targets = exerciseSteps(lesson.steps)
  const finished = targets.map((step) => test.states[step.order]).filter((state) => state?.status === "done" || state?.status === "error")
  const coherent = finished.filter((state) => state.status === "done" && state.result.status === "ok").length

  const setDrafts = (order: number, drafts: readonly WrongSolutionDraft[]): void => onWrongSolutionsChange({ ...wrongSolutions, [order]: drafts })

  return (
    <EditorPanel
      icon={FlaskConical}
      title="Testar gabarito"
      subtitle="Roda no corretor o que está na tela, mesmo sem salvar: a solução de referência precisa aprovar; o código inicial e as soluções erradas precisam reprovar."
      action={
        <button type="button" onClick={() => void test.run(lesson, wrongSolutions)} disabled={test.isRunning || targets.length === 0} className={ADD_BUTTON_CLASS}>
          {test.isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {test.isRunning ? "Testando..." : "Testar gabarito"}
        </button>
      }
    >
      <p role="status" aria-live="polite" className="mb-3 text-sm text-muted-foreground">
        {test.progress
          ? `Testando o passo ${test.progress.current} de ${test.progress.total}...`
          : finished.length > 0
            ? `${coherent} de ${targets.length} passo(s) de exercício com o gabarito coerente.`
            : ""}
      </p>
      {targets.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Nenhum passo de exercício para testar.</p>
      ) : (
        <ol aria-label="Resultado do teste por passo" className="space-y-3">
          {targets.map((step) => {
            const drafts = wrongSolutions[step.order] ?? NO_DRAFTS
            return (
              <li key={step.order} className="space-y-2 rounded-xl border-2 border-border p-3">
                <StepResult step={step} state={test.states[step.order]} signature={requestSignature(lesson, step, drafts)} />
                <WrongSolutionsEditor step={step} drafts={drafts} onChange={(next) => setDrafts(step.order, next)} isDisabled={test.isRunning} />
              </li>
            )
          })}
        </ol>
      )}
    </EditorPanel>
  )
}

const BADGES: Readonly<Record<"ok" | "falha" | "error" | "running" | "pending" | "skipped", { text: string; className: string }>> = {
  ok: { text: "Gabarito coerente", className: "bg-success/10 text-success" },
  falha: { text: "Gabarito com problema", className: "bg-destructive/10 text-destructive" },
  error: { text: "Não foi possível testar", className: "bg-destructive/10 text-destructive" },
  running: { text: "Testando...", className: "bg-level-purple-light text-level-purple-dark" },
  pending: { text: "Na fila", className: "bg-muted text-muted-foreground" },
  skipped: { text: "Não testado", className: "bg-muted text-muted-foreground" },
}

function badgeOf(state: StepTestState): { text: string; className: string } {
  return BADGES[state.status === "done" ? state.result.status : state.status]
}

interface StepResultProps {
  step: LessonStepInput
  /** undefined enquanto o passo nunca foi testado. */
  state: StepTestState | undefined
  /** Assinatura do que o teste usaria agora (para avisar que o resultado ficou velho). */
  signature: string
}

function StepResult({ step, state, signature }: StepResultProps): React.JSX.Element {
  const badge = state ? badgeOf(state) : null
  const isStale = (state?.status === "done" || state?.status === "error") && state.signature !== signature
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-level-purple-dark">{step.order}. {step.title}</h3>
        {badge && <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", badge.className)}>{badge.text}</span>}
      </div>
      {isStale && <p className="text-xs text-amber-800">O passo mudou depois deste teste: teste de novo para conferir.</p>}
      {state?.status === "error" && <p role="alert" className="text-sm text-destructive">{state.message}</p>}
      {state?.status === "done" && <Verdicts result={state.result} />}
    </div>
  )
}

function starterLabel(starter: NonNullable<DraftStepVerifyResult["starter"]>): string {
  if (starter.shuffled_order) return "Ordem embaralhada (como o aluno recebe)"
  return starter.inherited_from === null ? "Código inicial" : `Código inicial (herdado do passo ${starter.inherited_from})`
}

function Verdicts({ result }: { result: DraftStepVerifyResult }): React.JSX.Element {
  return (
    <div className="space-y-2">
      <ul className="space-y-1 text-sm">
        {result.solution && <VerdictRow label="Solução de referência" verdict={result.solution} shouldPass />}
        {result.starter
          ? <VerdictRow label={starterLabel(result.starter)} verdict={result.starter} shouldPass={false} />
          : result.solution && <li className="text-muted-foreground">Código inicial: não há código inicial para testar.</li>}
        {result.wrong_solutions.map((wrong, index) => (
          <VerdictRow key={`${index}-${wrong.name}`} label={`Solução errada “${wrong.name}”`} verdict={wrong} shouldPass={false} />
        ))}
      </ul>
      {result.details.length > 0 && (
        <div className="rounded-lg bg-destructive/5 p-2">
          <p className={MINI_LABEL_CLASS}>Motivo</p>
          <ul className="space-y-0.5 text-xs text-red-800">
            {result.details.map((detail, index) => <li key={index} className="whitespace-pre-wrap">{detail}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}

interface VerdictRowProps {
  label: string
  verdict: DraftProjectVerdict
  /** O esperado para este projeto: só a solução de referência deve aprovar. */
  shouldPass: boolean
}

function verdictText(verdict: DraftProjectVerdict, shouldPass: boolean): string {
  if (verdict.as_expected) return verdict.passed ? "aprovou, como esperado" : "reprovou, como esperado"
  return shouldPass ? "REPROVOU (devia aprovar)" : "APROVOU (devia reprovar)"
}

function VerdictRow({ label, verdict, shouldPass }: VerdictRowProps): React.JSX.Element {
  // Os casos que falharam só explicam um problema quando o projeto devia aprovar.
  const failedCases = shouldPass && !verdict.as_expected ? verdict.failed_cases : []
  return (
    <li>
      <span className="font-medium text-foreground">{label}: </span>
      <span className={cn("font-semibold", verdict.as_expected ? "text-success" : "text-destructive")}>{verdictText(verdict, shouldPass)}</span>
      {failedCases.length > 0 && (
        <ul className="ml-4 list-disc text-xs text-muted-foreground">
          {failedCases.map((failed) => <li key={failed.id}>{failed.name}{failed.message ? `: ${failed.message}` : ""}</li>)}
        </ul>
      )}
    </li>
  )
}

interface WrongSolutionsEditorProps {
  step: LessonStepInput
  drafts: readonly WrongSolutionDraft[]
  onChange: (drafts: readonly WrongSolutionDraft[]) => void
  isDisabled: boolean
}

function WrongSolutionsEditor({ step, drafts, onChange, isDisabled }: WrongSolutionsEditorProps): React.JSX.Element {
  const patchDraft = (index: number, changes: Partial<WrongSolutionDraft>): void => {
    onChange(drafts.map((draft, position) => (position === index ? { ...draft, ...changes } : draft)))
  }
  const fieldId = (index: number, name: string): string => `gabarito-${step.order}-errada-${index}-${name}`
  return (
    <details className="rounded-lg bg-muted/40 px-3 py-2">
      <summary className="cursor-pointer text-xs font-semibold text-level-purple-dark">
        Soluções erradas ({drafts.length}) — usadas só neste teste, não são salvas
      </summary>
      <div className="mt-2 space-y-3">
        <p className="text-xs text-muted-foreground">
          Opcional. Cada uma troca o main.py da solução de referência por um código com um erro comum; o teste confere que os casos a reprovam.
        </p>
        {drafts.map((draft, index) => (
          <fieldset key={index} disabled={isDisabled} className="space-y-2 rounded-lg border border-border bg-white p-2">
            <legend className="px-1 text-xs font-bold text-level-purple-dark">Solução errada {index + 1}</legend>
            <div>
              <label htmlFor={fieldId(index, "nome")} className={MINI_LABEL_CLASS}>Nome (qual é o erro)</label>
              <input id={fieldId(index, "nome")} value={draft.name} maxLength={160} onChange={(event) => patchDraft(index, { name: event.target.value })} className={SMALL_INPUT_CLASS} />
            </div>
            <div>
              <label htmlFor={fieldId(index, "codigo")} className={MINI_LABEL_CLASS}>Código (main.py)</label>
              <textarea id={fieldId(index, "codigo")} rows={5} spellCheck={false} value={draft.code} onChange={(event) => patchDraft(index, { code: event.target.value })} className={TEXTAREA_CLASS} />
            </div>
            <button type="button" onClick={() => onChange(drafts.filter((_draft, position) => position !== index))} className="flex items-center gap-1 text-xs font-semibold text-destructive">
              <Trash2 className="h-3.5 w-3.5" /> Remover
            </button>
          </fieldset>
        ))}
        <button
          type="button"
          onClick={() => onChange([...drafts, { name: "", code: "" }])}
          disabled={isDisabled || drafts.length >= MAX_DRAFT_WRONG_SOLUTIONS}
          aria-label={`Adicionar solução errada ao passo ${step.order}`}
          className={ADD_BUTTON_CLASS}
        >
          <Plus className="h-4 w-4" /> Solução errada
        </button>
      </div>
    </details>
  )
}
