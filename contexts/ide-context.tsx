"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  type ReactNode,
} from "react"
import { useRouter } from "next/navigation"
import { usePython } from "@/hooks/use-python"
import { parsePythonError } from "@/lib/parse-python-error"
import { evaluateOnServer } from "@/lib/evaluate"
import { useProgress } from "@/contexts/progress-context"
import { useAuth } from "@/contexts/auth-context"
import {
  resolveStarterFiles,
  fetchProgressSnapshot,
  saveProgressSnapshot,
} from "@/lib/supabase/lessons"
import type { ConsoleOutput } from "@/components/ide/console-panel"
import type { Lesson, ProjectFile } from "@/lib/supabase/types"

// ── Tipos ─────────────────────────────────────────────────────────────────────

export const MAIN_FILE = "main.py"

export interface IDEContextValue {
  // Arquivos (fonte de verdade: path → content)
  files: ProjectFile[]
  activePath: string
  openPaths: string[]
  setActivePath: (path: string) => void
  openFile: (path: string) => void
  closeTab: (path: string) => void
  onContentChange: (path: string, content: string) => void
  // Operações de arquivo
  createFile: (path: string) => { ok: boolean; error?: string }
  renameFile: (oldPath: string, newPath: string) => { ok: boolean; error?: string }
  deleteFile: (path: string) => { ok: boolean; error?: string }
  // Console
  consoleOutputs: ConsoleOutput[]
  clearConsole: () => void
  addOutput: (type: ConsoleOutput["type"], message: string) => void
  // Pyodide
  pythonStatus: ReturnType<typeof usePython>["status"]
  isExecuting: boolean
  isInstalling: boolean
  stop: () => void
  // Ações
  run: () => void
  reset: () => void
  verify: () => Promise<void>
  runConsoleCommand: (cmd: string) => void
  // Estado de progresso da lição
  hasRun: boolean
  hasOutput: boolean
  lessonProgress: number
  allPassed: boolean
  isVerifying: boolean
  showSuccess: boolean
  setShowSuccess: (v: boolean) => void
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function normalizePath(path: string): string {
  return path.trim().replace(/^\/+/, "").replace(/\/+/g, "/")
}

function isValidPath(path: string): boolean {
  const p = normalizePath(path)
  if (!p || p.endsWith("/")) return false
  // Aceita arquivos .py, .txt, .json, .csv, .md e .gitkeep (marcador de pasta vazia)
  if (!/^[\w\-./]+(\.py|\.txt|\.json|\.csv|\.md|\.gitkeep)$/.test(p)) return false
  if (p.includes("..")) return false
  return true
}

// ── Context ───────────────────────────────────────────────────────────────────

const IDEContext = createContext<IDEContextValue | null>(null)

/**
 * Encapsula todo o estado da IDE de uma lição: projeto multi-arquivo, console,
 * execução Pyodide e verificação dos testes ocultos. A página de lição consome
 * via useIDE(), ficando responsável apenas pelo layout.
 */
export function IDEProvider({ lesson, children }: { lesson: Lesson; children: ReactNode }) {
  const router = useRouter()
  const { markCompleted } = useProgress()
  const { user } = useAuth()
  const { status: pythonStatus, isExecuting, isInstalling, execute, installPackages, stop } = usePython()

  // ── Arquivos ────────────────────────────────────────────────────────────────
  const [files, setFiles] = useState<ProjectFile[]>(() => resolveStarterFiles(lesson))
  const [activePath, setActivePath] = useState(MAIN_FILE)
  const [openPaths, setOpenPaths] = useState<string[]>([MAIN_FILE])

  // Carrega snapshot salvo do aluno (se houver) ao montar
  useEffect(() => {
    let cancelled = false
    async function loadSnapshot() {
      if (!user?.id) return
      try {
        const snap = await fetchProgressSnapshot(user.id, lesson.id)
        if (!cancelled && snap && snap.length) {
          setFiles(snap)
          const hasMain = snap.some((f) => f.path === MAIN_FILE)
          const first = hasMain ? MAIN_FILE : snap[0].path
          setActivePath(first)
          setOpenPaths([first])
        }
      } catch { /* mantém starter_files */ }
    }
    loadSnapshot()
    return () => { cancelled = true }
  }, [lesson.id, user?.id])

  // ── Persistência (debounced) ────────────────────────────────────────────────
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scheduleSave = useCallback((nextFiles: ProjectFile[]) => {
    if (!user?.id) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveProgressSnapshot(user.id, lesson.id, nextFiles).catch(() => {})
    }, 1500)
  }, [user?.id, lesson.id])

  useEffect(() => {
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [])

  // ── Console ─────────────────────────────────────────────────────────────────
  const [consoleOutputs, setConsoleOutputs] = useState<ConsoleOutput[]>([])

  const addOutput = useCallback((type: ConsoleOutput["type"], message: string) => {
    setConsoleOutputs((prev) => [
      ...prev,
      { id: crypto.randomUUID(), type, message, timestamp: new Date() },
    ])
  }, [])

  const clearConsole = useCallback(() => setConsoleOutputs([]), [])

  // ── Progresso dinâmico ──────────────────────────────────────────────────────
  const [hasRun, setHasRun] = useState(false)
  const [hasOutput, setHasOutput] = useState(false)
  const [lessonProgress, setLessonProgress] = useState(0)
  const [allPassed, setAllPassed] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const lessonCompletedRef = useRef(false)

  // Instala pacotes quando o Pyodide fica pronto
  useEffect(() => {
    if (pythonStatus === "ready" && lesson.libraries?.length) {
      addOutput("info", `Instalando pacotes: ${lesson.libraries.join(", ")}...`)
      installPackages(lesson.libraries)
    }
  }, [pythonStatus, lesson.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Mensagens de status do Pyodide
  useEffect(() => {
    if (pythonStatus === "loading") {
      setConsoleOutputs([{ id: crypto.randomUUID(), type: "info", message: "Inicializando Python no navegador...", timestamp: new Date() }])
    } else if (pythonStatus === "ready") {
      setConsoleOutputs((prev) => [...prev, { id: crypto.randomUUID(), type: "success", message: "Python pronto! Você pode executar seu código.", timestamp: new Date() }])
    } else if (pythonStatus === "error") {
      setConsoleOutputs((prev) => [...prev, { id: crypto.randomUUID(), type: "error", message: "Erro ao carregar Python. Verifique sua conexão e recarregue a página.", timestamp: new Date() }])
    }
  }, [pythonStatus])

  // ── Abas ────────────────────────────────────────────────────────────────────
  const openFile = useCallback((path: string) => {
    setOpenPaths((prev) => (prev.includes(path) ? prev : [...prev, path]))
    setActivePath(path)
  }, [])

  const closeTab = useCallback((path: string) => {
    setOpenPaths((prev) => {
      const next = prev.filter((p) => p !== path)
      // Se fechou a aba ativa, ativa a vizinha
      setActivePath((cur) => (cur === path ? (next[next.length - 1] ?? MAIN_FILE) : cur))
      return next.length ? next : [MAIN_FILE]
    })
  }, [])

  // ── Edição de conteúdo ──────────────────────────────────────────────────────
  const onContentChange = useCallback((path: string, content: string) => {
    setFiles((prev) => {
      const next = prev.map((f) => (f.path === path ? { ...f, content } : f))
      scheduleSave(next)
      return next
    })
  }, [scheduleSave])

  // ── Operações de arquivo ────────────────────────────────────────────────────
  const createFile = useCallback((rawPath: string): { ok: boolean; error?: string } => {
    const path = normalizePath(rawPath)
    if (!isValidPath(path)) return { ok: false, error: "Nome inválido. Use apenas letras, números, e extensões .py .txt .json .csv .md" }
    let result: { ok: boolean; error?: string } = { ok: true }
    setFiles((prev) => {
      if (prev.some((f) => f.path === path)) {
        result = { ok: false, error: "Já existe um arquivo com esse nome." }
        return prev
      }
      const next = [...prev, { path, content: "" }]
      scheduleSave(next)
      return next
    })
    if (result.ok) openFile(path)
    return result
  }, [openFile, scheduleSave])

  const renameFile = useCallback((oldPath: string, rawNew: string): { ok: boolean; error?: string } => {
    if (oldPath === MAIN_FILE) return { ok: false, error: "main.py não pode ser renomeado." }
    const newPath = normalizePath(rawNew)

    // Verifica se é uma pasta (sem extensão) ou arquivo
    const isFolder = !oldPath.includes(".")
    if (!isFolder && !isValidPath(newPath)) return { ok: false, error: "Nome inválido." }

    let result: { ok: boolean; error?: string } = { ok: true }
    setFiles((prev) => {
      if (!isFolder && prev.some((f) => f.path === newPath)) {
        result = { ok: false, error: "Já existe um arquivo com esse nome." }
        return prev
      }
      // Para pastas: substitui prefixo em todos os filhos
      const next = isFolder
        ? prev.map((f) => f.path.startsWith(oldPath + "/")
            ? { ...f, path: newPath + f.path.slice(oldPath.length) }
            : f)
        : prev.map((f) => (f.path === oldPath ? { ...f, path: newPath } : f))
      scheduleSave(next)
      return next
    })
    if (result.ok) {
      if (isFolder) {
        setOpenPaths((prev) => prev.map((p) => p.startsWith(oldPath + "/") ? newPath + p.slice(oldPath.length) : p))
        setActivePath((cur) => cur.startsWith(oldPath + "/") ? newPath + cur.slice(oldPath.length) : cur)
      } else {
        setOpenPaths((prev) => prev.map((p) => (p === oldPath ? newPath : p)))
        setActivePath((cur) => (cur === oldPath ? newPath : cur))
      }
    }
    return result
  }, [scheduleSave])

  const deleteFile = useCallback((path: string): { ok: boolean; error?: string } => {
    if (path === MAIN_FILE) return { ok: false, error: "main.py não pode ser excluído." }
    setFiles((prev) => {
      const next = prev.filter((f) => f.path !== path)
      scheduleSave(next)
      return next
    })
    setOpenPaths((prev) => {
      const next = prev.filter((p) => p !== path)
      setActivePath((cur) => (cur === path ? (next[next.length - 1] ?? MAIN_FILE) : cur))
      return next.length ? next : [MAIN_FILE]
    })
    return { ok: true }
  }, [scheduleSave])

  // ── Reset ───────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    const starter = resolveStarterFiles(lesson)
    setFiles(starter)
    setActivePath(MAIN_FILE)
    setOpenPaths([MAIN_FILE])
    setConsoleOutputs([{ id: crypto.randomUUID(), type: "info", message: "Projeto resetado para o estado inicial.", timestamp: new Date() }])
    setHasRun(false)
    setHasOutput(false)
    lessonCompletedRef.current = false
    scheduleSave(starter)
  }, [lesson, scheduleSave])

  // ── Executar ────────────────────────────────────────────────────────────────
  const run = useCallback(() => {
    if (pythonStatus === "loading") {
      addOutput("warning", "O runtime Python ainda está carregando. Aguarde...")
      return
    }
    if (pythonStatus !== "ready") return
    if (isInstalling) {
      addOutput("warning", "Aguarde a instalação dos pacotes terminar antes de executar.")
      return
    }

    // Roda o ARQUIVO ATIVO (a aba aberta), não necessariamente o main.py.
    // Os demais arquivos continuam disponíveis para import.
    const entryPath = files.some((f) => f.path === activePath) ? activePath : MAIN_FILE
    if (!files.some((f) => f.path === entryPath)) {
      addOutput("error", "Nenhum arquivo selecionado para executar.")
      return
    }

    setHasRun(true)
    setLessonProgress((p) => Math.max(p, 40))
    setConsoleOutputs([{ id: crypto.randomUUID(), type: "info", message: `Executando ${entryPath}...`, timestamp: new Date() }])

    execute("", {
      files,
      entryPath,
      onResult: (result) => {
        let producedOutput = false
        if (result.stdout) {
          const lines = result.stdout.split("\n").filter((l) => l.length > 0)
          lines.forEach((l) => addOutput("output", l))
          if (lines.length) producedOutput = true
        }
        result.figures?.forEach((b64, i) => {
          producedOutput = true
          setConsoleOutputs((prev) => [...prev, {
            id: crypto.randomUUID(),
            type: "figure",
            message: `Figura ${i + 1}`,
            timestamp: new Date(),
            figureB64: b64,
          }])
        })
        if (result.stderr) {
          const parsed = parsePythonError(result.stderr)
          addOutput("error", `${parsed.title}: ${parsed.explanation}`)
          addOutput("warning", `Erro original: ${parsed.original}`)
          addOutput("warning", `💡 Dica: ${parsed.hint}`)
          setHasOutput(false)
        } else {
          if (producedOutput) {
            addOutput("success", "✓ Código executado com sucesso!")
            setHasOutput(true)
          } else {
            // Aviso amigável: arquivo só define funções/classes, sem saída
            addOutput("info", `✓ ${entryPath} executado sem erros — este arquivo não produziu saída (provavelmente só define funções). Use print() para ver resultados, ou rode o main.py.`)
            setHasOutput(false)
          }
          setLessonProgress((p) => Math.max(p, 60))
        }
      },
      onError: (error) => {
        const parsed = parsePythonError(error)
        addOutput("error", `${parsed.title}: ${parsed.explanation}`)
        addOutput("warning", `Erro original: ${parsed.original}`)
        addOutput("warning", `💡 Dica: ${parsed.hint}`)
        setHasOutput(false)
      },
    })
  }, [files, activePath, pythonStatus, isInstalling, execute, addOutput])

  // ── Verificar ───────────────────────────────────────────────────────────────
  const verify = useCallback(async () => {
    if (lessonCompletedRef.current) {
      addOutput("info", "Você já completou essa lição! Avance para a próxima.")
      return
    }
    if (isInstalling) {
      addOutput("warning", "Aguarde a instalação dos pacotes terminar antes de verificar.")
      return
    }

    addOutput("info", "🔬 Verificando sua solução com testes ocultos...")
    setIsVerifying(true)

    const res = await evaluateOnServer(lesson.id, files)
    setIsVerifying(false)

    if (!res.ok) {
      switch (res.error.type) {
        case "unauthenticated": router.push("/login"); return
        case "not_found": addOutput("error", "Lição não encontrada no servidor."); return
        case "timeout": addOutput("error", res.error.message); return
        case "server_error": addOutput("error", res.error.message); return
        case "network_error": addOutput("error", "Erro de conexão ao verificar. Verifique sua internet e tente novamente."); return
      }
      return
    }

    const result = res.result
    if (result.allPassed) {
      addOutput("success", `✓ Todos os testes passaram! +${lesson.xp_reward} XP conquistado!`)
      lessonCompletedRef.current = true
      setAllPassed(true)
      setLessonProgress(100)
      setShowSuccess(true)
      try {
        await markCompleted(lesson.id, lesson.xp_reward)
      } catch { /* silencioso */ }
    } else {
      const failCount = result.failures + result.errors
      addOutput("error", `${failCount} de ${result.testsRun} testes falharam.`)
      result.failureDetails.forEach((msg) => addOutput("warning", msg))
      addOutput("info", "Continue tentando! Leia o feedback acima e ajuste seu código.")
      setLessonProgress((p) => Math.max(p, 70))
    }
  }, [files, isInstalling, lesson.id, lesson.xp_reward, addOutput, markCompleted, router])

  // ── Comando avulso no console ───────────────────────────────────────────────
  const runConsoleCommand = useCallback((cmd: string) => {
    if (pythonStatus !== "ready") {
      addOutput("warning", "Python ainda não está pronto.")
      return
    }
    addOutput("info", `>>> ${cmd}`)
    execute(cmd, {
      onResult: (r) => {
        if (r.stdout) r.stdout.split("\n").filter(Boolean).forEach((l) => addOutput("output", l))
        if (r.stderr) addOutput("error", r.stderr.trim())
      },
      onError: (e) => addOutput("error", e),
    })
  }, [pythonStatus, execute, addOutput])

  // ── Atalhos de teclado ──────────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); run() }
      if (e.altKey && e.key === "g") { e.preventDefault(); reset() }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [run, reset])

  const value = useMemo<IDEContextValue>(
    () => ({
      files, activePath, openPaths, setActivePath, openFile, closeTab, onContentChange,
      createFile, renameFile, deleteFile,
      consoleOutputs, clearConsole, addOutput,
      pythonStatus, isExecuting, isInstalling, stop,
      run, reset, verify, runConsoleCommand,
      hasRun, hasOutput, lessonProgress, allPassed,
      isVerifying: isVerifying || isInstalling,
      showSuccess, setShowSuccess,
    }),
    [
      files, activePath, openPaths, setActivePath, openFile, closeTab, onContentChange,
      createFile, renameFile, deleteFile,