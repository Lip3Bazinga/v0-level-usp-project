import type { InputHTMLAttributes, ReactNode } from "react"
import { AlertCircle, Eye, EyeOff, type LucideIcon } from "lucide-react"
import { LevelButton } from "@/components/design-system/level-button"
import { Spinner } from "@/components/design-system/spinner"
import { cn } from "@/lib/utils"

const INPUT_CLASS =
  "w-full rounded-xl border-2 border-border bg-white pl-11 py-3 text-foreground placeholder:text-muted-foreground focus:border-level-purple focus:outline-none transition-colors"

type NativeInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "id" | "className" | "value" | "onChange"
>

interface AuthFieldProps extends NativeInputProps {
  id: string
  label: string
  icon: LucideIcon
  value: string
  onValueChange: (value: string) => void
  /** Elemento ao lado do rótulo (ex.: "Esqueci minha senha"); fica entre o rótulo e o campo na ordem do Tab. */
  labelAction?: ReactNode
  /** Texto de ajuda abaixo do campo, ligado por `aria-describedby` (id `<id>-hint`). */
  hint?: string
  /** Controle dentro do campo, à direita (ex.: mostrar senha). */
  trailing?: ReactNode
  /** Reserva espaço à direita para `trailing` mesmo quando ele não é renderizado. */
  hasTrailingSpace?: boolean
}

/** Campo de texto das telas de autenticação: rótulo, ícone à esquerda e dica opcional. */
export function AuthField({
  id,
  label,
  icon: Icon,
  value,
  onValueChange,
  labelAction,
  hint,
  trailing,
  hasTrailingSpace = Boolean(trailing),
  ...inputProps
}: AuthFieldProps): React.JSX.Element {
  const hintId = hint ? `${id}-hint` : undefined
  const labelElement = (
    <label htmlFor={id} className="text-sm font-medium text-level-purple-dark">
      {label}
    </label>
  )

  return (
    <div className="space-y-2">
      {labelAction ? (
        <div className="flex items-center justify-between">
          {labelElement}
          {labelAction}
        </div>
      ) : (
        labelElement
      )}
      <div className="relative">
        <Icon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          id={id}
          aria-describedby={hintId}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          className={cn(INPUT_CLASS, hasTrailingSpace ? "pr-12" : "pr-4")}
          {...inputProps}
        />
        {trailing}
      </div>
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  )
}

interface PasswordVisibilityToggleProps {
  isVisible: boolean
  onToggle: () => void
}

function PasswordVisibilityToggle({ isVisible, onToggle }: PasswordVisibilityToggleProps): React.JSX.Element {
  return (
    <button
      type="button"
      aria-label={isVisible ? "Ocultar senha" : "Mostrar senha"}
      aria-pressed={isVisible}
      onClick={onToggle}
      className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground transition-colors"
    >
      {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  )
}

interface PasswordFieldProps extends Omit<
  AuthFieldProps,
  "type" | "trailing" | "hasTrailingSpace"
> {
  isVisible: boolean
  /** Sem esta prop o campo não tem botão próprio (ex.: confirmação que segue o campo principal). */
  onToggleVisibility?: () => void
}

/** Campo de senha com botão de mostrar/ocultar; o espaço do botão é sempre reservado. */
export function PasswordField({
  isVisible,
  onToggleVisibility,
  ...fieldProps
}: PasswordFieldProps): React.JSX.Element {
  return (
    <AuthField
      {...fieldProps}
      type={isVisible ? "text" : "password"}
      hasTrailingSpace
      trailing={
        onToggleVisibility && (
          <PasswordVisibilityToggle isVisible={isVisible} onToggle={onToggleVisibility} />
        )
      }
    />
  )
}

export function FormErrorAlert({ message }: { message: string }): React.JSX.Element {
  return (
    <div
      role="alert"
      className="flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-red-700"
    >
      <AlertCircle className="h-4 w-4 shrink-0" />
      {message}
    </div>
  )
}

interface AuthSubmitButtonProps {
  isSubmitting: boolean
  submittingLabel: string
  children: string
  hasSpinner?: boolean
}

export function AuthSubmitButton({
  isSubmitting,
  submittingLabel,
  children,
  hasSpinner = false,
}: AuthSubmitButtonProps): React.JSX.Element {
  const label = isSubmitting ? submittingLabel : children
  return (
    <LevelButton variant="primary" size="lg" disabled={isSubmitting} className="w-full">
      {isSubmitting && hasSpinner ? (
        <span className="flex items-center gap-2">
          <Spinner />
          {label}
        </span>
      ) : (
        label
      )}
    </LevelButton>
  )
}
