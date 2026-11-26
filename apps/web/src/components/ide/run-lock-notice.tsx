import { Lock } from "lucide-react"

interface RunLockNoticeProps {
  /** Usado no `aria-describedby` do botão "Executar" bloqueado. */
  id: string
  message: string
}

/** Faixa que explica por que o "Executar" está bloqueado e aponta o terminal. */
export function RunLockNotice({ id, message }: RunLockNoticeProps): React.JSX.Element {
  return (
    <p id={id} role="note" className="flex items-center gap-2 border-b border-border bg-level-purple-light px-3 py-1.5 text-xs font-medium text-level-purple-dark">
      <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {message}
    </p>
  )
}
