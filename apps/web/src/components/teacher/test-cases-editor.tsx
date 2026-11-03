"use client"

import { useMemo, useState, type ReactNode } from "react"
import {
  AlertTriangle, ChevronDown, ChevronRight, ChevronUp, Code2, Eye, FlaskConical, Plus, ShieldCheck, Terminal, Trash2,
  Variable, Workflow, type LucideIcon,
} from "lucide-react"
import { cn, isOneOf, moveItem, type MoveDirection } from "@/lib/utils"
import {
  ALL_KINDS, CONSTRUCT_LABELS, CREATABLE_KINDS, KIND_DESCRIPTIONS, KIND_LABELS, MATCH_LABELS, MATCH_MODES, PY_TYPES, RULE_LABELS,
  RULE_TYPES, changeDraftKind, changeRuleType, compileDraft, compileDrafts, constructsFor, emptyDraft, isConstructRule, isMatchMode,
  nextCaseId, type DraftErrors, type TestCaseDraft, type TestCaseKind,
} from "./test-cases/drafts"
import { callSignature, failurePreview, pyRepr } from "./test-cases/preview"

export type { TestCaseDraft } from "./test-cases/drafts"
export { compileDrafts, draftsFromCases } from "./test-cases/drafts"

const KIND_ICONS: Record<TestCaseKind, LucideIcon> = {
  call: Workflow,
  io: Terminal,
  variable: Variable,
  source: Code2,
  legacy: AlertTriangle,
}

interface TestCasesEditorProps {
  value: TestCaseDraft[]
  onChange: (drafts: TestCaseDraft[]) => void
  disabled?: boolean
}

/**
 * Editor do gabarito declarativo de uma lição de código.
 *
 * Controlado por rascunhos (`TestCaseDraft[]`): o componente pai guarda a lista
 * e usa `compileDrafts` para obter os `TestCase[]` válidos na hora de salvar —
 * se houver qualquer erro, o salvamento deve ser bloqueado.
 */
export function TestCasesEditor({ value, onChange, disabled }: TestCasesEditorProps): React.JSX.Element {
  const compiled = useMemo(() => compileDrafts(value), [value])
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(new Set())
  const hasLegacy = value.some((draft) => draft.kind === "legacy")

  const handleUpdate = (key: string, next: TestCaseDraft): void => onChange(value.map((draft) => (draft.key === key ? next : draft)))
  const handleAdd = (kind: TestCaseKind): void => onChange([...value, emptyDraft(kind, nextCaseId(value))])
  const handleRemove = (key: string): void => onChange(value.filter((draft) => draft.key !== key))
  const handleMove = (index: number, direction: MoveDirection): void => onChange(moveItem(value, index, direction))
  const handleToggleCollapsed = (key: string): void =>
    setCollapsedKeys((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-xl bg-level-purple-subtle px-4 py-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-level-purple" />
        <div className="text-sm text-level-purple-dark">
          <p className="font-medium">Gabarito protegido</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Os valores esperados ficam só no servidor. O código do aluno roda isolado e recebe apenas as
            entradas; a comparação com o gabarito é feita fora dele. Valores são escritos em JSON:
            <code className="mx-1 rounded bg-level-purple/10 px-1">5</code>
            <code className="mr-1 rounded bg-level-purple/10 px-1">&quot;texto&quot;</code>
            <code className="mr-1 rounded bg-level-purple/10 px-1">[1, 2]</code>
            <code className="mr-1 rounded bg-level-purple/10 px-1">true</code>
            <code className="rounded bg-level-purple/10 px-1">null</code>.
          </p>
        </div>
      </div>

      {hasLegacy && (
        <div role="note" className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p className="text-sm text-foreground">
            <strong>Há testes no formato legado (assert/unittest).</strong>{" "}
            Eles rodam junto com o código do aluno, então a correção é mais fraca (o aluno poderia
            interferir no resultado). Sugerimos convertê-los em casos de <em>Chamar função</em>,{" "}
            <em>Entrada e saída</em> ou <em>Valor de variável</em>.
          </p>
        </div>
      )}

      {value.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border py-8 text-center">
          <FlaskConical className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nenhum caso de teste ainda.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Lições de código só podem ser publicadas com pelo menos um caso.
          </p>
        </div>
      ) : (
        <ol className="space-y-3">
          {value.map((draft, index) => (
            <li key={draft.key}>
              <CaseCard
                draft={draft}
                index={index}
                total={value.length}
                errors={compiled.errors[draft.key] ?? {}}
                isCollapsed={collapsedKeys.has(draft.key)}
                disabled={disabled}
                onToggle={() => handleToggleCollapsed(draft.key)}
                onChange={(next) => handleUpdate(draft.key, next)}
                onRemove={() => handleRemove(draft.key)}
                onMove={(direction) => handleMove(index, direction)}
              />
            </li>
          ))}
        </ol>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {CREATABLE_KINDS.map((kind) => {
          const Icon = KIND_ICONS[kind]
          return (
            <button
              key={kind}
              type="button"
              disabled={disabled}
              onClick={() => handleAdd(kind)}
              aria-label={`Adicionar caso: ${KIND_LABELS[kind]}`}
              title={KIND_DESCRIPTIONS[kind]}
              className="flex items-center gap-1.5 rounded-xl border-2 border-level-purple bg-level-purple-subtle px-3 py-2 text-sm font-semibold text-level-purple transition-colors hover:bg-level-purple-light disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              <Icon className="h-3.5 w-3.5" />
              {KIND_LABELS[kind]}
            </button>
          )
        })}
      </div>

      <p
        aria-live="polite"
        className={cn("text-xs font-medium", compiled.valid ? "text-muted-foreground" : "text-destructive")}
      >
        {value.length} caso(s) de teste
        {!compiled.valid && ` · ${compiled.errorCount} erro(s) — corrija antes de salvar`}
      </p>
    </div>
  )
}

interface CaseCardProps {
  draft: TestCaseDraft
  index: number
  total: number
  errors: DraftErrors
  isCollapsed: boolean
  disabled?: boolean | undefined
  onToggle: () => void
  onChange: (draft: TestCaseDraft) => void
  onRemove: () => void
  onMove: (direction: MoveDirection) => void
}

function CaseCard({ draft, index, total, errors, isCollapsed, disabled, onToggle, onChange, onRemove, onMove }: CaseCardProps): React.JSX.Element {
  const set = (changes: Partial<TestCaseDraft>): void => onChange({ ...draft, ...changes })
  const hasErrors = Object.keys(errors).length > 0
  const Icon = KIND_ICONS[draft.kind]
  const label = `Caso ${index + 1}`
  const kindOptions = draft.kind === "legacy" ? ALL_KINDS : CREATABLE_KINDS

  return (
    <section
      aria-label={label}
      className={cn(
        "rounded-xl border-2 bg-white",
        hasErrors ? "border-destructive/50" : draft.kind === "legacy" ? "border-warning/50" : "border-border",
      )}
    >
      <header className="flex items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? `Expandir ${label}` : `Recolher ${label}`}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <span className="text-xs font-bold uppercase tracking-wider text-level-purple">{label}</span>
        <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          <Icon className="h-3 w-3" /> {KIND_LABELS[draft.kind]}
        </span>
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">{summarizeDraft(draft)}</span>
        {hasErrors && <span className="text-[11px] font-semibold text-destructive">com erro</span>}
        <div className="flex items-center gap-1">
          <IconButton label={`Mover ${label} para cima`} onClick={() => onMove(-1)} disabled={disabled || index === 0}>
            <ChevronUp className="h-4 w-4" />
          </IconButton>
          <IconButton label={`Mover ${label} para baixo`} onClick={() => onMove(1)} disabled={disabled || index === total - 1}>
            <ChevronDown className="h-4 w-4" />
          </IconButton>
          <IconButton label={`Remover ${label}`} onClick={onRemove} disabled={disabled} isDanger>
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </div>
      </header>

      {!isCollapsed && (
        <div className="space-y-4 border-t border-border px-4 py-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_160px]">
            <Field label="Tipo do caso" htmlFor={`${draft.key}-kind`}>
              <select
                id={`${draft.key}-kind`}
                value={draft.kind}
                disabled={disabled}
                onChange={(event) => {
                  if (isOneOf(kindOptions, event.target.value)) onChange(changeDraftKind(draft, event.target.value))
                }}
                className={inputClass()}
              >
                {kindOptions.map((kind) => (
                  <option key={kind} value={kind}>{KIND_LABELS[kind]}</option>
                ))}
              </select>
            </Field>
            <TextInput
              id={`${draft.key}-name`}
              label="Nome exibido ao aluno"
              value={draft.name}
              placeholder="Ex.: soma de números negativos"
              disabled={disabled}
              error={errors.name}
              onChange={(name) => set({ name })}
            />
            <TextInput
              id={`${draft.key}-id`}
              label="Identificador"
              value={draft.id}
              mono
              disabled={disabled}
              error={errors.id}
              onChange={(id) => set({ id })}
            />
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">{KIND_DESCRIPTIONS[draft.kind]}</p>

          <KindFields draft={draft} errors={errors} disabled={disabled} set={set} onChange={onChange} />

          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <TextInput
              id={`${draft.key}-hint`}
              label="Dica em caso de falha (opcional)"
              value={draft.hint}
              placeholder="Ex.: lembre que a função deve usar return, não print"
              disabled={disabled}
              error={errors.hint}
              onChange={(hint) => set({ hint })}
            />
            {draft.kind !== "source" && draft.kind !== "legacy" && (
              <label className="flex items-center gap-2 pb-2.5 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={draft.reveal}
                  disabled={disabled}
                  onChange={(event) => set({ reveal: event.target.checked })}
                  className="h-4 w-4 accent-level-purple"
                />
                Mostrar o valor esperado ao aluno
              </label>
            )}
          </div>

          <FailurePreview draft={draft} hasErrors={hasErrors} />
        </div>
      )}
    </section>
  )
}

interface KindFieldsProps {
  draft: TestCaseDraft
  errors: DraftErrors
  disabled?: boolean | undefined
  set: (changes: Partial<TestCaseDraft>) => void
  onChange: (draft: TestCaseDraft) => void
}

function KindFields({ draft, errors, disabled, set, onChange }: KindFieldsProps): React.JSX.Element {
  switch (draft.kind) {
    case "call":
      return (
        <div className="space-y-3">
          <TextInput
            id={`${draft.key}-fn`}
            label="Função"
            value={draft.fn}
            mono
            placeholder="soma   ou   Conta.depositar"
            disabled={disabled}
            error={errors.fn}
            onChange={(fn) => set({ fn })}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <JsonInput
              id={`${draft.key}-args`}
              label="Argumentos (lista JSON)"
              value={draft.args}
              placeholder="[2, 3]"
              disabled={disabled}
              error={errors.args}
              onChange={(args) => set({ args })}
            />
            <JsonInput
              id={`${draft.key}-kwargs`}
              label="Argumentos nomeados (objeto JSON, opcional)"
              value={draft.kwargs}
              placeholder='{"arredondar": true}'
              disabled={disabled}
              error={errors.kwargs}
              onChange={(kwargs) => set({ kwargs })}
            />
          </div>
          <ExpectedFields draft={draft} errors={errors} disabled={disabled} set={set} expectedLabel="Retorno esperado (JSON)" />
        </div>
      )
    case "io":
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextArea
              id={`${draft.key}-stdin`}
              label="Entrada (stdin, uma linha por input())"
              value={draft.stdin}
              placeholder={"Ana\n20"}
              disabled={disabled}
              error={errors.stdin}
              onChange={(stdin) => set({ stdin })}
            />
            <TextArea
              id={`${draft.key}-stdout`}
              label="Saída esperada"
              value={draft.expectedStdout}
              placeholder="Olá, Ana! Você tem 20 anos."
              disabled={disabled}
              error={errors.expectedStdout}
              onChange={(expectedStdout) => set({ expectedStdout })}
            />
          </div>
          <Field label="Como comparar a saída" htmlFor={`${draft.key}-match`}>
            <select
              id={`${draft.key}-match`}
              value={draft.match}
              disabled={disabled}
              onChange={(event) => {
                if (isMatchMode(event.target.value)) set({ match: event.target.value })
              }}
              className={inputClass()}
            >
              {MATCH_MODES.map((mode) => (
                <option key={mode} value={mode}>{MATCH_LABELS[mode]}</option>
              ))}
            </select>
          </Field>
        </div>
      )
    case "variable":
      return (
        <div className="space-y-3">
          <TextInput
            id={`${draft.key}-variable`}
            label="Variável global"
            value={draft.variable}
            mono
            placeholder="total"
            disabled={disabled}
            error={errors.variable}
            onChange={(variable) => set({ variable })}
          />
          <ExpectedFields draft={draft} errors={errors} disabled={disabled} set={set} expectedLabel="Valor esperado (JSON)" />
        </div>
      )
    case "source": {
      const constructs = isConstructRule(draft.ruleType) ? constructsFor(draft.ruleType) : null
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Regra" htmlFor={`${draft.key}-rule`} error={errors.ruleType}>
            <select
              id={`${draft.key}-rule`}
              value={draft.ruleType}
              disabled={disabled}
              onChange={(event) => {
                if (isOneOf(RULE_TYPES, event.target.value)) onChange(changeRuleType(draft, event.target.value))
              }}
              className={inputClass(!!errors.ruleType)}
            >
              {RULE_TYPES.map((ruleType) => (
                <option key={ruleType} value={ruleType}>{RULE_LABELS[ruleType]}</option>
              ))}
            </select>
          </Field>
          {constructs ? (
            <Field label="Construção" htmlFor={`${draft.key}-rule-value`} error={errors.ruleValue}>
              <select
                id={`${draft.key}-rule-value`}
                value={draft.ruleValue}
                disabled={disabled}
                onChange={(event) => set({ ruleValue: event.target.value })}
                className={inputClass(!!errors.ruleValue)}
              >
                {constructs.map((construct) => (
                  <option key={construct} value={construct}>{CONSTRUCT_LABELS[construct] ?? construct}</option>
                ))}
              </select>
            </Field>
          ) : (
            <TextInput
              id={`${draft.key}-rule-value`}
              label={draft.ruleType === "imports" ? "Módulo" : draft.ruleType === "defines_class" ? "Classe" : "Função"}
              value={draft.ruleValue}
              mono
              placeholder={draft.ruleType === "imports" ? "math" : draft.ruleType === "defines_class" ? "Conta" : "sorted"}
              disabled={disabled}
              error={errors.ruleValue}
              onChange={(ruleValue) => set({ ruleValue })}
            />
          )}
        </div>
      )
    }
    case "legacy":
      return (
        <TextArea
          id={`${draft.key}-code`}
          label="Código do teste (assert/unittest)"
          value={draft.code}
          mono
          rows={8}
          disabled={disabled}
          error={errors.code}
          onChange={(code) => set({ code })}
        />
      )
  }
}

interface ExpectedFieldsProps {
  draft: TestCaseDraft
  errors: DraftErrors
  disabled?: boolean | undefined
  set: (changes: Partial<TestCaseDraft>) => void
  expectedLabel: string
}

function ExpectedFields({ draft, errors, disabled, set, expectedLabel }: ExpectedFieldsProps): React.JSX.Element {
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_150px_150px]">
      <JsonInput
        id={`${draft.key}-expected`}
        label={expectedLabel}
        value={draft.expected}
        placeholder="5"
        disabled={disabled}
        error={errors.expected}
        onChange={(expected) => set({ expected })}
      />
      <Field label="Tipo Python (opcional)" htmlFor={`${draft.key}-type`} error={errors.pyType}>
        <select
          id={`${draft.key}-type`}
          value={draft.pyType}
          disabled={disabled}
          onChange={(event) => {
            const { value } = event.target
            if (value === "" || isOneOf(PY_TYPES, value)) set({ pyType: value })
          }}
          className={inputClass(!!errors.pyType)}
        >
          <option value="">Qualquer</option>
          {PY_TYPES.map((pyType) => (
            <option key={pyType} value={pyType}>{pyType}</option>
          ))}
        </select>
      </Field>
      <TextInput
        id={`${draft.key}-tolerance`}
        label="Tolerância (floats)"
        value={draft.tolerance}
        mono
        placeholder="0.001"
        disabled={disabled}
        error={errors.tolerance}
        onChange={(tolerance) => set({ tolerance })}
      />
    </div>
  )
}

interface FailurePreviewProps {
  draft: TestCaseDraft
  hasErrors: boolean
}

function FailurePreview({ draft, hasErrors }: FailurePreviewProps): React.JSX.Element {
  const compiled = hasErrors ? null : compileDraft(draft).testCase
  const preview = compiled ? failurePreview(compiled) : null
  return (
    <div className="rounded-xl border border-dashed border-level-purple/30 bg-[#FCFBFF] px-4 py-3">
      <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <Eye className="h-3.5 w-3.5 text-level-purple" /> O que o aluno verá se este caso falhar
      </p>
      {preview ? (
        <p className="text-sm text-foreground">
          <span className="font-semibold text-destructive">✗ {preview.title}:</span>{" "}
          <span className="font-mono text-xs">{preview.message}</span>
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">Corrija os campos destacados para ver a prévia.</p>
      )}
    </div>
  )
}

const SUMMARY_VALUE_LENGTH = 40
const SUMMARY_STDOUT_LENGTH = 50

/** Resumo de uma linha mostrado no cabeçalho do cartão. */
function summarizeDraft(draft: TestCaseDraft): string {
  if (draft.name.trim()) return draft.name.trim()
  const testCase = compileDraft(draft).testCase
  if (!testCase) return ""
  switch (testCase.kind) {
    case "call": return `${callSignature(testCase)} == ${pyRepr(testCase.expected, SUMMARY_VALUE_LENGTH)}`
    case "io": return `stdin → ${JSON.stringify(testCase.expected_stdout).slice(0, SUMMARY_STDOUT_LENGTH)}`
    case "variable": return `${testCase.variable} == ${pyRepr(testCase.expected, SUMMARY_VALUE_LENGTH)}`
    case "source": return failurePreview(testCase).message
    case "legacy": return testCase.code.split("\n")[0] ?? ""
  }
}

function inputClass(error?: boolean, mono?: boolean): string {
  return cn(
    "w-full rounded-xl border-2 bg-white px-3 py-2 text-sm focus:outline-none disabled:bg-muted",
    error ? "border-destructive focus:border-destructive" : "border-border focus:border-level-purple",
    mono && "font-mono",
  )
}

interface FieldProps {
  label: string
  htmlFor: string
  error?: string | undefined
  children: ReactNode
}

function Field({ label, htmlFor, error, children }: FieldProps): React.JSX.Element {
  return (
    <div className="min-w-0">
      <label htmlFor={htmlFor} className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
      {error && <FieldError id={`${htmlFor}-error`} message={error} />}
    </div>
  )
}

interface FieldErrorProps {
  id: string
  message: string
}

function FieldError({ id, message }: FieldErrorProps): React.JSX.Element {
  return (
    <p id={id} className="mt-1 text-xs font-medium text-destructive">
      {message}
    </p>
  )
}

interface InputProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  error?: string | undefined
  disabled?: boolean | undefined
  mono?: boolean
}

function TextInput({ id, label, value, onChange, placeholder, error, disabled, mono }: InputProps): React.JSX.Element {
  return (
    <Field label={label} htmlFor={id} error={error}>
      <input
        id={id}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass(!!error, mono)}
      />
    </Field>
  )
}

function JsonInput(props: InputProps): React.JSX.Element {
  return <TextInput {...props} mono />
}

interface TextAreaProps extends InputProps {
  rows?: number
}

function TextArea({ id, label, value, onChange, placeholder, error, disabled, mono, rows = 3 }: TextAreaProps): React.JSX.Element {
  return (
    <Field label={label} htmlFor={id} error={error}>
      <textarea
        id={id}
        value={value}
        rows={rows}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={cn(inputClass(!!error, true), "resize-y", !mono && "font-mono")}
      />
    </Field>
  )
}

interface IconButtonProps {
  label: string
  onClick: () => void
  disabled?: boolean | undefined
  isDanger?: boolean
  children: ReactNode
}

function IconButton({ label, onClick, disabled, isDanger, children }: IconButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-lg disabled:cursor-not-allowed disabled:opacity-30",
        isDanger ? "text-destructive hover:bg-destructive/10" : "text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  )
}
