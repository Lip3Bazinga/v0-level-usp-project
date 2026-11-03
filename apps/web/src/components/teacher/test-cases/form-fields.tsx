import type { ReactNode } from "react"
import { cn, isOneOf } from "@/lib/utils"

/** Campos de formulário do editor de casos de teste (rótulo, erro acessível, estilo da marca). */

export function inputClass(hasError?: boolean, isMono?: boolean): string {
  return cn(
    "w-full rounded-xl border-2 bg-white px-3 py-2 text-sm focus:outline-none disabled:bg-muted",
    hasError ? "border-destructive focus:border-destructive" : "border-border focus:border-level-purple",
    isMono && "font-mono",
  )
}

interface FieldProps {
  label: string
  htmlFor: string
  error?: string | undefined
  children: ReactNode
}

export function Field({ label, htmlFor, error, children }: FieldProps): ReactNode {
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

function FieldError({ id, message }: FieldErrorProps): ReactNode {
  return (
    <p id={id} className="mt-1 text-xs font-medium text-destructive">
      {message}
    </p>
  )
}

export interface InputProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string | undefined
  error?: string | undefined
  disabled?: boolean | undefined
  mono?: boolean
  /** Id de um `<datalist>` com sugestões. */
  list?: string | undefined
}

export function TextInput({ id, label, value, onChange, placeholder, error, disabled, mono, list }: InputProps): ReactNode {
  return (
    <Field label={label} htmlFor={id} error={error}>
      <input
        id={id}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        list={list}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass(!!error, mono)}
      />
    </Field>
  )
}

export function JsonInput(props: InputProps): ReactNode {
  return <TextInput {...props} mono />
}

interface TextAreaProps extends InputProps {
  rows?: number
}

export function TextArea({ id, label, value, onChange, placeholder, error, disabled, mono, rows = 3 }: TextAreaProps): ReactNode {
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

interface SelectFieldProps<TOption extends string> {
  id: string
  label: string
  value: TOption
  options: readonly TOption[]
  labels: Record<TOption, string>
  onChange: (value: TOption) => void
  error?: string | undefined
  disabled?: boolean | undefined
}

/** Seletor de opções fixas: só repassa valores da lista (o DOM devolve string). */
export function SelectField<TOption extends string>({ id, label, value, options, labels, onChange, error, disabled }: SelectFieldProps<TOption>): ReactNode {
  return (
    <Field label={label} htmlFor={id} error={error}>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => {
          if (isOneOf(options, event.target.value)) onChange(event.target.value)
        }}
        className={inputClass(!!error)}
      >
        {options.map((option) => (
          <option key={option} value={option}>{labels[option]}</option>
        ))}
      </select>
    </Field>
  )
}
