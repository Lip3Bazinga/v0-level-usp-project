"use client"

import { useId, useState, type KeyboardEvent, type ReactNode } from "react"
import dynamic from "next/dynamic"
import type { ProjectFile } from "@levelusp/contracts"
import { Spinner } from "@/components/design-system/spinner"
import { cn } from "@/lib/utils"

// O xterm.js e o Pyodide do terminal pesam e só existem no navegador: carregados na primeira vez
// que a aba "Terminal" é aberta, fora do bundle inicial da lição.
const TerminalPanel = dynamic(() => import("./terminal-panel").then((module) => module.TerminalPanel), {
  ssr: false,
  loading: () => (
    <div role="status" className="flex h-full items-center justify-center gap-2 bg-gray-900 text-sm text-gray-400">
      <Spinner tone="brand" /> Abrindo o terminal…
    </div>
  ),
})

type TabId = "console" | "terminal"

const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: "console", label: "Console" },
  { id: "terminal", label: "Terminal" },
]

interface ConsoleTerminalTabsProps {
  /** O console da lição (ConsolePanel e o campo de entrada); fica montado mesmo com o terminal aberto. */
  console: ReactNode
  /** Arquivos do projeto que o terminal enxerga. */
  files: readonly ProjectFile[]
  /** Abre já no Terminal, e passa para ele quando vira `true` (o "Executar" está bloqueado). */
  isTerminalPreferred?: boolean
}

/**
 * Ponto de encaixe do terminal no player: duas abas, "Console" (o de sempre) e "Terminal". O
 * terminal só é carregado e montado quando a aba é aberta pela primeira vez e depois fica
 * montado (escondido), para não perder o histórico nem o REPL ao alternar. Com
 * `isTerminalPreferred` o terminal é a aba inicial; deixar de ser preferido não troca a aba.
 */
export function ConsoleTerminalTabs({ console: consoleNode, files, isTerminalPreferred = false }: ConsoleTerminalTabsProps): React.JSX.Element {
  const baseId = useId()
  const [active, setActive] = useState<TabId>(isTerminalPreferred ? "terminal" : "console")
  const [hasOpenedTerminal, setHasOpenedTerminal] = useState(isTerminalPreferred)
  const [wasTerminalPreferred, setWasTerminalPreferred] = useState(isTerminalPreferred)

  // O bloqueio pode chegar depois da primeira renderização (a sessão ainda carregava).
  if (isTerminalPreferred !== wasTerminalPreferred) {
    setWasTerminalPreferred(isTerminalPreferred)
    if (isTerminalPreferred) {
      setActive("terminal")
      setHasOpenedTerminal(true)
    }
  }

  const select = (id: TabId): void => {
    setActive(id)
    if (id === "terminal") setHasOpenedTerminal(true)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
    event.preventDefault()
    const next = active === "console" ? "terminal" : "console"
    select(next)
    document.getElementById(`${baseId}-tab-${next}`)?.focus()
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div role="tablist" aria-label="Console e terminal" className="flex gap-1 border-b border-border bg-white px-2 pt-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            id={`${baseId}-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            aria-controls={`${baseId}-panel-${tab.id}`}
            tabIndex={active === tab.id ? 0 : -1}
            onClick={() => select(tab.id)}
            onKeyDown={handleKeyDown}
            className={cn(
              "rounded-t-lg px-3 py-1.5 text-xs font-semibold",
              active === tab.id ? "bg-level-purple-light text-level-purple" : "text-muted-foreground hover:text-level-purple",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div id={`${baseId}-panel-console`} role="tabpanel" aria-labelledby={`${baseId}-tab-console`} hidden={active !== "console"} className="min-h-0 flex-1">
        {consoleNode}
      </div>
      <div id={`${baseId}-panel-terminal`} role="tabpanel" aria-labelledby={`${baseId}-tab-terminal`} hidden={active !== "terminal"} className="min-h-0 flex-1">
        {hasOpenedTerminal && <TerminalPanel files={files} autoFocus />}
      </div>
    </div>
  )
}
