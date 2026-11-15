"use client"

import { useId, useState } from "react"
import { ChevronDown, ChevronRight, Keyboard } from "lucide-react"
import { countStdinLines } from "@/lib/utils/stdin"

interface StdinFieldProps {
  value: string
  onChange: (value: string) => void
  /** O código chama `input()`: o campo já aparece aberto (o aluno ainda pode fechá-lo). */
  isSuggested: boolean
}

const VISIBLE_ROWS = 3

/**
 * Campo "Entrada (stdin)" do Executar e do Visualizar: o navegador roda o programa sem teclado,
 * então cada `input()` lê uma linha deste texto. Não vai para a API: no Verificar as entradas
 * são as dos casos de teste.
 */
export function StdinField({ value, onChange, isSuggested }: StdinFieldProps): React.JSX.Element {
  const fieldId = useId()
  // null: o aluno ainda não abriu nem fechou — segue o código (aberto se ele chama input() ou se já há texto).
  const [userChoice, setUserChoice] = useState<boolean | null>(null)
  const isOpen = userChoice ?? (isSuggested || value !== "")
  const lineCount = countStdinLines(value)
  const ToggleIcon = isOpen ? ChevronDown : ChevronRight

  return (
    <div className="shrink-0 border-t border-border bg-gray-50">
      <button
        type="button"
        onClick={() => setUserChoice(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={fieldId}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-semibold text-level-purple-dark hover:bg-level-purple-light"
      >
        <ToggleIcon className="h-3.5 w-3.5" aria-hidden="true" />
        <Keyboard className="h-3.5 w-3.5" aria-hidden="true" />
        Entrada (stdin)
        {lineCount > 0 && <span className="font-normal text-muted-foreground">{lineCount === 1 ? "1 linha" : `${lineCount} linhas`}</span>}
      </button>
      <div id={fieldId} hidden={!isOpen} className="px-3 pb-2">
        <p id={`${fieldId}-ajuda`} className="mb-1 text-xs text-muted-foreground">
          Escreva uma linha para cada <code className="font-mono">input()</code> do programa. O Executar e o Visualizar leem daqui.
        </p>
        <textarea
          aria-label="Entrada (stdin)"
          aria-describedby={`${fieldId}-ajuda`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={VISIBLE_ROWS}
          spellCheck={false}
          autoComplete="off"
          placeholder={"Ana\n20"}
          className="w-full resize-y rounded-lg border border-border bg-white px-2 py-1.5 font-mono text-sm text-foreground outline-none focus:border-level-purple"
        />
      </div>
    </div>
  )
}
