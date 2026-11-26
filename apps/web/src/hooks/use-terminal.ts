"use client"

import { useCallback, useEffect, useRef, useState, type RefObject } from "react"
import type { ProjectFile } from "@levelusp/contracts"
import { createTerminalClient, type TerminalClient } from "@/lib/python/terminal-client"
import { TerminalSession, type TerminalPhase } from "@/lib/terminal/terminal-session"

/** Opções do `useTerminal`. */
export interface UseTerminalOptions {
  /** Arquivos do projeto; cada comando usa os que estiverem aqui no momento em que é digitado. */
  files: readonly ProjectFile[]
  /** Cliente do Pyodide (os testes passam um de mentira). Padrão: o worker compartilhado da aba. */
  client?: TerminalClient
  /** Foca o terminal ao abrir. */
  autoFocus?: boolean
}

/** Estado e comandos do terminal devolvidos por `useTerminal`. */
export interface UseTerminalResult {
  /** Elemento onde o xterm.js é montado. */
  containerRef: RefObject<HTMLDivElement | null>
  /** O xterm.js já foi carregado (ele é baixado sob demanda). */
  isLoaded: boolean
  /** Fase da sessão: esperando comando, rodando ou esperando `input()`. */
  phase: TerminalPhase
  /** Gráficos do matplotlib do último comando que gerou algum (PNG em base64). */
  figures: readonly string[]
  /** Interrompe o que está rodando (o mesmo que Ctrl+C). */
  stop: () => void
  /** Esconde os gráficos do painel. */
  clearFigures: () => void
  /** Dá o foco ao terminal. */
  focus: () => void
}

const TERMINAL_FONT_SIZE_PX = 13
const TERMINAL_SCROLLBACK_LINES = 2000
const TERMINAL_THEME = {
  background: "#111827",
  foreground: "#e5e7eb",
  cursor: "#a78bfa",
  selectionBackground: "#4c1d95",
}
const TEXTAREA_LABEL = "Terminal do Python. Digite um comando e pressione Enter. Tab leva o foco para fora do terminal."
const PROMPT_LABEL = "Entrada do terminal"
const TOO_MUCH_OUTPUT_LABEL = "Muita saída para ler em voz alta. Use as setas para navegar pelo texto."

/**
 * Terminal do navegador: xterm.js (carregado sob demanda, fora do bundle inicial) ligado a uma
 * {@link TerminalSession} sobre o Pyodide do worker compartilhado. Atribua `containerRef` a um
 * elemento com altura definida. O resultado é só pedagógico: a correção oficial acontece no servidor.
 *
 * Acessibilidade: o xterm roda em modo leitor de tela e a tecla Tab sempre leva o foco para
 * fora (nunca prende o teclado); Ctrl+C e o botão "Parar" interrompem o programa.
 */
export function useTerminal({ files, client, autoFocus = false }: UseTerminalOptions): UseTerminalResult {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const filesRef = useRef(files)
  const sessionRef = useRef<TerminalSession | null>(null)
  const focusRef = useRef<() => void>(() => undefined)
  const [clientInstance] = useState<TerminalClient>(() => client ?? createTerminalClient())
  const [isLoaded, setIsLoaded] = useState(false)
  const [phase, setPhase] = useState<TerminalPhase>("busy")
  const [figures, setFigures] = useState<readonly string[]>([])

  useEffect(() => {
    filesRef.current = files
  }, [files])

  useEffect(() => {
    let isCancelled = false
    let teardown = (): void => undefined

    const mount = async (): Promise<void> => {
      const [{ Terminal }, { FitAddon }] = await Promise.all([import("@xterm/xterm"), import("@xterm/addon-fit")])
      const container = containerRef.current
      if (isCancelled || !container) return

      Terminal.strings.promptLabel = PROMPT_LABEL
      Terminal.strings.tooMuchOutput = TOO_MUCH_OUTPUT_LABEL
      const terminal = new Terminal({
        convertEol: false,
        cursorBlink: true,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        fontSize: TERMINAL_FONT_SIZE_PX,
        scrollback: TERMINAL_SCROLLBACK_LINES,
        screenReaderMode: true,
        theme: TERMINAL_THEME,
      })
      const fitAddon = new FitAddon()
      terminal.loadAddon(fitAddon)
      terminal.open(container)
      terminal.textarea?.setAttribute("aria-label", TEXTAREA_LABEL)
      // Tab nunca é capturado: sem isso o teclado ficaria preso dentro do terminal (WCAG 2.1.2).
      terminal.attachCustomKeyEventHandler((event) => event.key !== "Tab")

      const fit = (): void => {
        try {
          fitAddon.fit()
        } catch {
          // Contêiner escondido (aba inativa): o ResizeObserver chama de novo ao reaparecer.
        }
      }
      fit()
      const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(fit)
      observer?.observe(container)

      const session = new TerminalSession({
        screen: { write: (text) => terminal.write(text) },
        client: clientInstance,
        getFiles: () => filesRef.current,
        onFigures: setFigures,
        onPhaseChange: setPhase,
      })
      const dataSubscription = terminal.onData((data) => session.handleData(data))
      sessionRef.current = session
      focusRef.current = () => terminal.focus()
      session.start()
      if (autoFocus) terminal.focus()
      setIsLoaded(true)

      teardown = (): void => {
        dataSubscription.dispose()
        observer?.disconnect()
        session.dispose()
        terminal.dispose()
        sessionRef.current = null
        focusRef.current = () => undefined
      }
    }

    void mount()
    return () => {
      isCancelled = true
      teardown()
    }
  }, [clientInstance, autoFocus])

  const stop = useCallback(() => sessionRef.current?.interrupt(), [])
  const clearFigures = useCallback(() => setFigures([]), [])
  const focus = useCallback(() => focusRef.current(), [])

  return { containerRef, isLoaded, phase, figures, stop, clearFigures, focus }
}
