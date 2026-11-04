import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface PanelSpinnerProps {
  /** Altura/espaçamento do bloco; o padrão ocupa o lugar de uma seção inteira. */
  className?: string
}

/** Indicador de carregamento centralizado das seções do painel. */
export function PanelSpinner({ className = "h-64" }: PanelSpinnerProps) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <Loader2 className="h-8 w-8 animate-spin text-level-purple" />
    </div>
  )
}
