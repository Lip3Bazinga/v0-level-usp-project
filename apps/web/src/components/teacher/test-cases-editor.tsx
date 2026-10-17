"use client"

import { useMemo, useState, type ReactNode } from "react"
import {
  AlertTriangle, ChevronDown, ChevronRight, ChevronUp, Code2, Eye, FlaskConical,
  Plus, ShieldCheck, Terminal, Trash2, Variable, Workflow,
} from "lucide-react"
import type { TestCase } from "@levelusp/contracts"
import { cn } from "@/lib/utils"
import {
  changeDraftKind, changeRuleType, compileDraft, compileDrafts, CONSTRUCT_LABELS, CREATABLE_KINDS, emptyDraft,
  KIND_DESCRIPTIONS, KIND_LABELS, MATCH_LABELS, nextCaseId, NOT_USES_CONSTRUCTS, PY_TYPES, RULE_LABELS,
  USES_CONSTRUCTS, type DraftErrors, type TestCaseDraft,
} from "./test-cases/drafts"
import { callSignature, failurePreview, pyRepr } from "./test-cases/preview"

export type { TestCaseDraft } from "./test-cases/drafts"
export { compileDrafts, draftsFromCases } from "./test-cases/drafts"

const KIND_ICONS: Record<TestCase["kind"], typeof Code2> = {
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
export function TestCasesEditor({ value, onChange, disabled }: TestCasesEditorProps) {
  const compiled = useMemo(() => compileDrafts(value), [value])
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const hasLegacy = value.some((d) => d.kind === "legacy")

  const update = (key: string, next: TestCaseDraft) => onChange(value.map((d) => (d.key === key ? next : d)))
  const add = (kind: TestCase["kind"]) => onChange([...value, emptyDraft(kind, nextCaseId(value))])
  const remove = (key: string) => onChange(value.filter((d) => d.key !== key))
  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir
    if (target < 0 || target >= value.length) return
    const copy = [...value]
    ;[copy[index], copy[target]] = [copy[target]!, copy[index]!]
    onChange(copy)
  }
  const toggleCollapsed = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
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
          {value.map((d, i) => (
            <li key={d.key}>
              <CaseCard
                draft={d}
                index={i}
                total={value.length}
                errors={compiled.errors[d.key] ?? {}}
                collapsed={collapsed.has(d.key)}
                disabled={disabled}
                onToggle={() => toggleCollapsed(d.key)}
                onChange={(next) => update(d.key, next)}
                onRemove={() => remove(d.key)}
                onMove={(dir) => move(i, dir)}
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
              onClick={() => add(kind)}
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

// ── Cartão de um caso ────────────────────────────────────────────────────────

interface CaseCardProps {
  draft: TestCaseDraft
  index: number
  total: number
  errors: DraftErrors
  collapsed: boolean
  disabled?: boolean
  onToggle: () => void
  onChange: (d: TestCaseDraft) => void
  onRemove: () => void
  onMove: (dir: -1 | 1) => void
}

function CaseCard({ draft: d, index, total, errors, collapsed, disabled, onToggle, onChange, onRemove, onMove }: CaseCardProps) {
  const set = (patch: Partial<TestCaseDraft>) => onChange({ ...d, ...patch })
  const hasErrors = Object.keys(errors).length > 0
  const Icon = KIND_ICONS[d.kind]
  const label = `Caso ${index + 1}`

  return (
    <section
      aria-label={label}
      className={cn(
        "rounded-xl border-2 bg-white",
        hasErrors ? "border-destructive/50" : d.kind === "legacy" ? "border-warning/50" : "border-border",
      )}
    >
      <header className="flex items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? `Expandir ${label}` : `Recolher ${label}`}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <span className="text-xs font-bold uppercase tracking-wider text-level-purple">{label}</span>
        <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          <Icon className="h-3 w-3" /> {KIND_LABELS[d.kind]}
        </span>
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">{summarize(d)}</span>
        {hasErrors && <span className="text-[11px] font-semibold text-destructive">com erro</span>}
        <div className="flex items-center gap-1">
          <IconButton label={`Mover ${label} para cima`} onClick={() => onMove(-1)} disabled={disabled || index === 0}>
            <ChevronUp className="h-4 w-4" />
          </IconButton>
          <IconButton label={`Mover ${label} para baixo`} onClick={() => onMove(1)} disabled={disabled || index === total - 1}>
            <ChevronDown className="h-4 w-4" />
          </IconButton>
          <IconButton label={`Remover ${label}`} onClick={onRemove} disabled={disabled} danger>
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </div>
      </header>

      {!collapsed && (
        <div className="space-y-4 border-t border-border px-4 py-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_160px]">
            <Field label="Tipo do caso" htmlFor={`${d.key}-kind`}>
              <select
                id={`${d.key}-kind`}
                value={d.kind}
                disabled={disabled}
                onChange={(e) => onChange(changeDraftKind(d, e.target.value as TestCase["kind"]))}
                className={inputClass()}
              >
                {(d.kind === "legacy" ? [...CREATABLE_KINDS, "legacy" as const] : CREATABLE_KINDS).map((k) => (
                  <option key={k} value={k}>{KIND_LABELS[k]}</option>
                ))}
              </select>
            </Field>
            <TextInput
              id={`${d.key}-name`}
              label="Nome exibido ao aluno"
              value={d.name}
              placeholder="Ex.: soma de números negativos"
              disabled={disabled}
              error={errors.name}
              onChange={(name) => set({ name })}
            />
            <TextInput
              id={`${d.key}-id`}
              label="Identificador"
              value={d.id}
              mono
              disabled={disabled}
              error={errors.id}
              onChange={(id) => set({ id })}
            />
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">{KIND_DESCRIPTIONS[d.kind]}</p>

          <KindFields draft={d} errors={errors} disabled={disabled} set={set} onChange={onChange} />

          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <TextInput
              id={`${d.key}-hint`}
              label="Dica em caso de falha (opcional)"
              value={d.hint}
              placeholder="Ex.: lembre que a função deve usar return, não print"
              disabled={disabled}
              error={errors.hint}
              onChange={(hint) => set({ hint })}
            />
            {d.kind !== "source" && d.kind !== "legacy" && (
              <label className="flex items-center gap-2 pb-2.5 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={d.reveal}
                  disabled={disabled}
                  onChange={(e) => set({ reveal: e.target.checked })}
                  className="h-4 w-4 accent-level-purple"
                />
                Mostrar o valor esperado ao aluno
              </label>
            )}
          </div>

          <FailurePreview draft={d} hasErrors={hasErrors} />
        </div>
      )}
    </section>
  )
}

function KindFields({ draft: d, errors, disabled, set, onChange }: {
  draft: TestCaseDraft
  errors: DraftErrors
  disabled?: boolean
  set: (patch: Partial<TestCaseDraft>) => void
  onChange: (d: TestCaseDraft) => void
}) {
  switch (d.kind) {
    case "call":
      return (
        <div className="space-y-3">
          <TextInput
            id={`${d.key}-fn`}
            label="Função"
            value={d.fn}
            mono
            placeholder="soma   ou   Conta.depositar"
            disabled={disabled}
            error={errors.fn}
            onChange={(fn) => set({ fn })}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <JsonInput
              id={`${d.key}-args`}
              label="Argumentos (lista JSON)"
              value={d.args}
              placeholder="[2, 3]"
              disabled={disabled}
              error={errors.args}
              onChange={(args) => set({ args })}
            />
            <JsonInput
              id={`${d.key}-kwargs`}
              label="Argumentos nomeados (objeto JSON, opcional)"
              value={d.kwargs}
              placeholder='{"arredondar": true}'
              disabled={disabled}
              error={errors.kwargs}
              onChange={(kwargs) => set({ kwargs })}
            />
          </div>
          <ExpectedFields draft={d} errors={errors} disabled={disabled} set={set} expectedLabel="Retorno esperado (JSON)" />
        </div>
      )
    case "io":
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextArea
              id={`${d.key}-stdin`}
              label="Entrada (stdin, uma linha por input())"
              value={d.stdin}
              placeholder={"Ana\n20"}
              disabled={disabled}
              error={errors.stdin}
              onChange={(stdin) => set({ stdin })}
            />
            <TextArea
              id={`${d.key}-stdout`}
              label="Saída esperada"
              value={d.expectedStdout}
              placeholder="Olá, Ana! Você tem 20 anos."
              disabled={disabled}
              error={errors.expectedStdout}
              onChange={(expectedStdout) => set({ expectedStdout })}
            />
          </div>
          <Field label="Como comparar a saída" htmlFor={`${d.key}-match`}>
            <select
              id={`${d.key}-match`}
              value={d.match}
              disabled={disabled}
              onChange={(e) => set({ match: e.target.value as TestCaseDraft["match"] })}
              className={inputClass()}
            >
              {(Object.keys(MATCH_LABELS) as TestCaseDraft["match"][]).map((m) => (
                <option key={m} value={m}>{MATCH_LABELS[m]}</option>
              ))}
            </select>
          </Field>
        </div>
      )
    case "variable":
      return (
        <div className="space-y-3">
          <TextInput
            id={`${d.key}-variable`}
            label="Variável global"
            value={d.variable}
            mono
            placeholder="total"
            disabled={disabled}
            error={errors.variable}
            onChange={(variable) => set({ variable })}
          />
          <ExpectedFields draft={d} errors={errors} disabled={disabled} set={set} expectedLabel="Valor esperado (JSON)" />
        </div>
      )
    case "source": {
      const constructRule = d.ruleType === "uses" || d.ruleType === "not_uses"
      const constructs = d.ruleType === "not_uses" ? NOT_USES_CONSTRUCTS : USES_CONSTRUCTS
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Regra" htmlFor={`${d.key}-rule`} error={errors.ruleType}>
            <select
              id={`${d.key}-rule`}
              value={d.ruleType}
              disabled={disabled}
              onChange={(e) => onChange(changeRuleType(d, e.target.value as TestCaseDraft["ruleType"]))}
              className={inputClass(!!errors.ruleType)}
            >
              {(Object.keys(RULE_LABELS) as TestCaseDraft["ruleType"][]).map((r) => (
                <option key={r} value={r}>{RULE_LABELS[r]}</option>
              ))}
            </select>
          </Field>
          {constructRule ? (
            <Field label="Construção" htmlFor={`${d.key}-rule-value`} error={errors.ruleValue}>
              <select
                id={`${d.key}-rule-value`}
                value={d.ruleValue}
                disabled={disabled}
                onChange={(e) => set({ ruleValue: e.target.value })}
                className={inputClass(!!errors.ruleValue)}
              >
                {constructs.map((c) => (
                  <option key={c} value={c}>{CONSTRUCT_LABELS[c] ?? c}</option>
                ))}
              </select>
            </Field>
          ) : (
            <TextInput
              id={`${d.key}-rule-value`}
              label={d.ruleType === "imports" ? "Módulo" : d.ruleType === "defines_class" ? "Classe" : "Função"}
              value={d.ruleValue}
              mono
              placeholder={d.ruleType === "imports" ? "math" : d.ruleType === "defines_class" ? "Conta" : "sorted"}
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
          id={`${d.key}-code`}
          label="Código do teste (assert/unittest)"
          value={d.code}
          mono
          rows={8}
          disabled={disabled}
          error={errors.code}
          onChange={(code) => set({ code })}
        />
      )
  }
}

function ExpectedFields({ draft: d, errors, disabled, set, expectedLabel }: {
  draft: TestCaseDraft
  errors: DraftErrors
  disabled?: boolean
  set: (patch: Partial<TestCaseDraft>) => void
  expectedLabel: string
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_150px_150px]">
      <JsonInput
        id={`${d.key}-expected`}
        label={expectedLabel}
        value={d.expected}
        placeholder="5"
        disabled={disabled}
        error={errors.expected}
        onChange={(expected) => set({ expected })}
      />
      <Field label="Tipo Python (opcional)" htmlFor={`${d.key}-type`} error={errors.pyType}>
        <select
          id={`${d.key}-type`}
          value={d.pyType}
          disabled={disabled}
          onChange={(e) => set({ pyType: e.target.value as TestCaseDraft["pyType"] })}
          className={inputClass(!!errors.pyType)}
        >
          <option value="">Qualquer</option>
          {PY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </Field>
      <TextInput
        id={`${d.key}-tolerance`}
        label="Tolerância (floats)"
        value={d.tolerance}
        mono
        placeholder="0.001"
        disabled={disabled}
        error={errors.tolerance}
        onChange={(tolerance) => set({ tolerance })}
      />
    </div>
  )
}

function FailurePreview({ draft, hasErrors }: { draft: TestCaseDraft; hasErrors: boolean }) {
  const compiled = hasErrors ? null : compileDraft(draft).testCase
  return (
    <div className="rounded-xl border border-dashed border-level-purple/30 bg-[#FCFBFF] px-4 py-3">
      <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <Eye className="h-3.5 w-3.5 text-level-purple" /> O que o aluno verá se este caso falhar
      </p>
      {compiled ? (
        <p className="text-sm text-foreground">
          <span className="font-semibold text-destructive">✗ {failurePreview(compiled).title}:</span>{" "}
          <span className="font-mono text-xs">{failurePreview(compiled).message}</span>
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">Corrija os campos destacados para ver a prévia.</p>
      )}
    </div>
  )
}

/** Resumo de uma linha mostrado no cabeçalho do cartão. */
function summarize(d: TestCaseDraft): string {
  const c = compileDraft(d).testCase
  if (d.name.trim()) return d.name.trim()
  if (!c) return ""
  switch (c.kind) {
    case "call": return `${callSignature(c)} == ${pyRepr(c.expected, 40)}`
    case "io": return `stdin → ${JSON.stringify(c.expected_stdout).slice(0, 50)}`
    case "variable": return `${c.variable} == ${pyRepr(c.expected, 40)}`
    case "source": return failurePreview(c).message
    case "legacy": return c.code.split("\n")[0] ?? ""
  }
}

// ── Campos ───────────────────────────────────────────────────────────────────

function inputClass(error?: boolean, mono?: boolean) {
  return cn(
    "w-full rounded-xl border-2 bg-white px-3 py-2 text-sm focus:outline-none disabled:bg-muted",
    error ? "border-destructive focus:border-destructive" : "border-border focus:border-level-purple",
    mono && "font-mono",
  )
}

function Field({ label, htmlFor, error, children }: { label: string; htmlFor: string; error?: string; children: ReactNode }) {
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

function FieldError({ id, message }: { id: string; message: string }) {
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
  onChange: (v: string) => void
  placeholder?: string
  error?: string
  disabled?: boolean
  mono?: boolean
}

function TextInput({ id, label, value, onChange, placeholder, error, disabled, mono }: InputProps) {
  return (
    <Field label={label} htmlFor={id} error={error}>
      <input
        id={id}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass(!!error, mono)}
      />
    </Field>
  )
}

function JsonInput(props: InputProps) {
  return <TextInput {...props} mono />
}

function TextArea({ id, label, value, onChange, placeholder, error, disabled, mono, rows = 3 }: InputProps & { rows?: number }) {
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
        onChange={(e) => onChange(e.target.value)}
        className={cn(inputClass(!!error, true), "resize-y", !mono && "font-mono")}
      />
    </Field>
  )
}

function IconButton({ label, onClick, disabled, danger, children }: {
  label: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-lg disabled:cursor-not-allowed disabled:opacity-30",
        danger ? "text-destructive hover:bg-destructive/10" : "text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  )
}
