import { cn } from "@/lib/utils"

type SpinnerTone = "light" | "brand"

interface SpinnerProps {
  /** `light`: sobre botões coloridos; `brand`: sobre fundo claro ou escuro neutro. */
  tone?: SpinnerTone
  className?: string
}

const TONE_CLASS: Record<SpinnerTone, string> = {
  light: "border-white",
  brand: "border-level-purple",
}

/** Anel girando de 16px usado dentro de botões e linhas de status enquanto algo processa. */
export function Spinner({ tone = "light", className }: SpinnerProps) {
  // A cor do anel vem antes de `border-t-transparent`: no `cn` a última classe de borda vence.
  return (
    <span
      aria-hidden="true"
      className={cn("h-4 w-4 animate-spin rounded-full border-2", TONE_CLASS[tone], "border-t-transparent", className)}
    />
  )
}
