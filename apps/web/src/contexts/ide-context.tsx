"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import type { Lesson, ProjectFile, SubmissionResult } from "@levelusp/contracts"
import { useAuth } from "@/contexts/auth-context"
import { useProgress } from "@/contexts/progress-context"
import { usePython, type ExecutionResult, type PyodideStatus } from "@/hooks/use-python"
import { fetchProgressSnapshot, HTTP_STATUS, isApiError, saveProgressSnapshot, submitLessonCode } from "@/lib/api"
import { CONSOLE_COMMAND_FILE_PATH, MAIN_FILE_PATH, ROUTES, SNAPSHOT_SAVE_DEBOUNCE_MS } from "@/lib/constants"
import type { ConsoleOutput, ConsoleOutputType } from "@/lib/types"
import {
  addFile,
  closeTab as closeEditorTab,
  createEditorTabs,
  hasFile,
  normalizePath,
  openTab,
  pickEntryFile,
  removeFile,
  renameEntry,
  renameTabs,
  resolveStarterFiles,
  updateFileContent,
  type EditorTabs,
  type FileOperationResult,
} from "@/lib/utils"
import {
  pythonErrorLines,
  stdoutLines,
  toConsoleOutput,
  verificationErrorLine,
  verificationFailureLines,
  verificationSuccessLine,
  type ConsoleLine,
} from "@/lib/utils/ide-feedback"

/** Barra de progresso da lição: marcos atingidos a cada etapa do exercício. */
const LESSON_PROGRESS = {
  ran: 40,
  ranWithoutErrors: 60,
  verifiedWithFailures: 70,
  passed: 100,
} as const

export interface IDEFilesState {
  /** Fonte da verdade do projeto do aluno. */
  files: ProjectFile[]
  activePath: string
  openPaths: string[]
}

export interface IDEFileActions {
  setActivePath: (path: string) => void
  openFile: (path: string) => void
  closeTab: (path: string) => void
  updateFileContent: (path: string, content: string) => void
  createFile: (path: string) => FileOperationResult
  renameFile: (oldPath: string, newPath: string) => FileOperationResult
  deleteFile: (path: string) => FileOperationResult
}

export interface IDEConsole {
  consoleOutputs: ConsoleOutput[]
  clearConsole: () => void
  addOutput: (type: ConsoleOutputType, message: string) => void
  runConsoleCommand: (command: string) => void
}

export interface IDERuntime {
  pythonStatus: PyodideStatus
  isExecuting: boolean
  isInstalling: boolean
  stop: () => void
  run: () => void
  reset: () => void
  verify: () => Promise<void>
}

export interface IDELessonState {
  hasRun: boolean
  hasOutput: boolean
  /** A última execução terminou sem erros e o código não mudou desde então. */
  canVerify: boolean
  lessonProgress: number
  allPassed: boolean
  isVerifying: boolean
  /** Último veredito do servidor (XP, nível e badges já creditados pela API). */
  lastResult: SubmissionResult | null
  /** Nível antes da última conclusão, para a animação de subida de nível. */
  levelBefore: number | null
  showSuccess: boolean
  setShowSuccess: (isOpen: boolean) => void
}

export type IDEContextValue = IDEFilesState & IDEFileActions & IDEConsole & IDERuntime & IDELessonState

const IDEContext = createContext<IDEContextValue | null>(null)

function useConsoleOutputs() {
  const [consoleOutputs, setConsoleOutputs] = useState<ConsoleOutput[]>([])
  const appendLines = useCallback(
    (lines: readonly ConsoleLine[]) => setConsoleOutputs((current) => [...current, ...lines.map(toConsoleOutput)]),
    [],
  )
  const replaceWithLine = useCallback((line: ConsoleLine) => setConsoleOutputs([toConsoleOutput(line)]), [])
  const addOutput = useCallback(
    (type: ConsoleOutputType, message: string) => appendLines([{ type, message }]),
    [appendLines],
  )
  const clearConsole = useCallback(() => setConsoleOutputs([]), [])
  return { consoleOutputs, appendLines, replaceWithLine, addOutput, clearConsole }
}

/**
 * Salva o projeto na API um pouco depois da última edição do aluno. Só edições
 * feitas na tela disparam o salvamento (marcadas por `markEdited`): carregar o
 * snapshot ou os arquivos iniciais não grava nada.
 */
function useSnapshotAutosave(lessonId: string, userId: string | undefined, files: ProjectFile[]) {
  const hasLocalEditsRef = useRef(false)
  useEffect(() => {
    if (!userId || !hasLocalEditsRef.current) return
    const timer = setTimeout(() => {
      saveProgressSnapshot(lessonId, files).catch(() => {})
    }, SNAPSHOT_SAVE_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [lessonId, userId, files])
  return useCallback(() => {
    hasLocalEditsRef.current = true
  }, [])
}

/**
 * Estado da IDE de uma lição: projeto multi-arquivo, console, execução no
 * navegador (Pyodide) e verificação no servidor. A página só cuida do layout.
 */
export function IDEProvider({ lesson, children }: { lesson: Lesson; children: ReactNode }) {
  const router = useRouter()
  const { applyCompletion } = useProgress()
  const { user, profile } = useAuth()
  const userId = user?.id
  const { consoleOutputs, appendLines, replaceWithLine, addOutput, clearConsole } = useConsoleOutputs()

  const [files, setFiles] = useState<ProjectFile[]>(() => resolveStarterFiles(lesson))
  const [tabs, setTabs] = useState<EditorTabs>(() => createEditorTabs())
  const markEdited = useSnapshotAutosave(lesson.id, userId, files)

  const [hasRun, setHasRun] = useState(false)
  const [hasOutput, setHasOutput] = useState(false)
  const [runSucceeded, setRunSucceeded] = useState(false)
  const [lessonProgress, setLessonProgress] = useState(0)
  const [allPassed, setAllPassed] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [lastResult, setLastResult] = useState<SubmissionResult | null>(null)
  const [levelBefore, setLevelBefore] = useState<number | null>(null)
  const isLessonCompletedRef = useRef(false)

  const reachProgress = useCallback((milestone: number) => setLessonProgress((current) => Math.max(current, milestone)), [])

  const libraries = lesson.libraries
  const handlePythonStatus = useCallback(
    (status: PyodideStatus) => {
      if (status === "loading") replaceWithLine({ type: "info", message: "Inicializando Python no navegador..." })
      if (status === "ready") {
        if (libraries?.length) addOutput("info", `Instalando pacotes: ${libraries.join(", ")}...`)
        addOutput("success", "Python pronto! Você pode executar seu código.")
      }
      if (status === "error") {
        addOutput("error", "Erro ao carregar Python. Verifique sua conexão e recarregue a página.")
      }
    },
    [libraries, addOutput, replaceWithLine],
  )
  const { status: pythonStatus, isExecuting, isInstalling, execute, stop } = usePython({
    packages: libraries,
    onStatusChange: handlePythonStatus,
  })

  useEffect(() => {
    if (!userId) return
    let isCurrent = true
    fetchProgressSnapshot(lesson.id)
      .then((snapshot) => {
        if (!isCurrent || !snapshot?.length) return
        setFiles(snapshot)
        setTabs(createEditorTabs(pickEntryFile(snapshot)))
      })
      .catch(() => {
        // Sem snapshot legível, o aluno continua com os arquivos iniciais da lição.
      })
    return () => {
      isCurrent = false
    }
  }, [lesson.id, userId])

  const commitFiles = useCallback(
    (nextFiles: ProjectFile[]) => {
      markEdited()
      setRunSucceeded(false)
      setFiles(nextFiles)
    },
    [markEdited],
  )

  const setActivePath = useCallback((path: string) => setTabs((current) => ({ ...current, activePath: path })), [])
  const openFile = useCallback((path: string) => setTabs((current) => openTab(current, path)), [])
  const closeTab = useCallback((path: string) => setTabs((current) => closeEditorTab(current, path)), [])

  const handleContentChange = useCallback(
    (path: string, content: string) => {
      markEdited()
      setRunSucceeded(false)
      setFiles((current) => updateFileContent(current, path, content))
    },
    [markEdited],
  )

  const createFile = useCallback(
    (rawPath: string): FileOperationResult => {
      const change = addFile(files, rawPath)
      if (!change.ok) return change
      commitFiles(change.files)
      openFile(normalizePath(rawPath))
      return { ok: true }
    },
    [files, commitFiles, openFile],
  )

  const renameFile = useCallback(
    (oldPath: string, rawNewPath: string): FileOperationResult => {
      const change = renameEntry(files, oldPath, rawNewPath)
      if (!change.ok) return change
      commitFiles(change.files)
      setTabs((current) => renameTabs(current, oldPath, normalizePath(rawNewPath)))
      return { ok: true }
    },
    [files, commitFiles],
  )

  const deleteFile = useCallback(
    (path: string): FileOperationResult => {
      const change = removeFile(files, path)
      if (!change.ok) return change
      commitFiles(change.files)
      closeTab(path)
      return { ok: true }
    },
    [files, commitFiles, closeTab],
  )

  const reset = useCallback(() => {
    commitFiles(resolveStarterFiles(lesson))
    setTabs(createEditorTabs())
    replaceWithLine({ type: "info", message: "Projeto resetado para o estado inicial." })
    setHasRun(false)
    setHasOutput(false)
    isLessonCompletedRef.current = false
  }, [lesson, commitFiles, replaceWithLine])

  const handleRunResult = useCallback(
    (entryPath: string, result: ExecutionResult) => {
      const outputLines = stdoutLines(result.stdout)
      const figureLines: ConsoleLine[] = result.figures.map((figureB64, index) => ({
        type: "figure",
        message: `Figura ${index + 1}`,
        figureB64,
      }))
      appendLines([...outputLines, ...figureLines])

      if (result.stderr) {
        appendLines(pythonErrorLines(result.stderr))
        setHasOutput(false)
        setRunSucceeded(false)
        return
      }

      const producedOutput = outputLines.length > 0 || figureLines.length > 0
      setRunSucceeded(true)
      setHasOutput(producedOutput)
      addOutput(
        producedOutput ? "success" : "info",
        producedOutput
          ? "✓ Código executado com sucesso!"
          : `✓ ${entryPath} executado sem erros — este arquivo não produziu saída (provavelmente só define funções). Use print() para ver resultados, ou rode o main.py.`,
      )
      reachProgress(LESSON_PROGRESS.ranWithoutErrors)
    },
    [appendLines, addOutput, reachProgress],
  )

  const handleRunError = useCallback(
    (rawError: string) => {
      appendLines(pythonErrorLines(rawError))
      setHasOutput(false)
      setRunSucceeded(false)
    },
    [appendLines],
  )

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

    // Executa a aba aberta, não necessariamente o main.py; os demais arquivos ficam disponíveis para import.
    const entryPath = hasFile(files, tabs.activePath) ? tabs.activePath : MAIN_FILE_PATH
    if (!hasFile(files, entryPath)) {
      addOutput("error", "Nenhum arquivo selecionado para executar.")
      return
    }

    setHasRun(true)
    reachProgress(LESSON_PROGRESS.ran)
    replaceWithLine({ type: "info", message: `Executando ${entryPath}...` })
    execute(
      { files, entryPath },
      { onResult: (result) => handleRunResult(entryPath, result), onError: handleRunError },
    )
  }, [files, tabs.activePath, pythonStatus, isInstalling, execute, addOutput, replaceWithLine, reachProgress, handleRunResult, handleRunError])

  const handleVerificationResult = useCallback(
    async (result: SubmissionResult, levelAtStart: number | null) => {
      setLastResult(result)
      if (!result.allPassed) {
        appendLines(verificationFailureLines(result))
        reachProgress(LESSON_PROGRESS.verifiedWithFailures)
        return
      }
      appendLines([verificationSuccessLine(result)])
      isLessonCompletedRef.current = true
      setLevelBefore(levelAtStart)
      setAllPassed(true)
      setLessonProgress(LESSON_PROGRESS.passed)
      setShowSuccess(true)
      try {
        // A conclusão e o XP já foram gravados pela API; aqui só refletimos na interface.
        await applyCompletion(lesson.id, result)
      } catch {
        // A celebração já apareceu; uma falha ao atualizar o painel não deve interrompê-la.
      }
    },
    [appendLines, reachProgress, applyCompletion, lesson.id],
  )

  const verify = useCallback(async () => {
    if (isLessonCompletedRef.current) {
      addOutput("info", "Você já completou essa lição! Avance para a próxima.")
      return
    }
    if (isInstalling) {
      addOutput("warning", "Aguarde a instalação dos pacotes terminar antes de verificar.")
      return
    }
    if (!runSucceeded) {
      addOutput("warning", "Execute seu código sem erros antes de verificar a resposta (Ctrl+Enter).")
      return
    }

    addOutput("info", "🔬 Verificando sua solução com testes ocultos...")
    setIsVerifying(true)
    const levelAtStart = profile?.level ?? null
    try {
      const result = await submitLessonCode(lesson.id, files)
      setIsVerifying(false)
      await handleVerificationResult(result, levelAtStart)
    } catch (error) {
      setIsVerifying(false)
      if (isApiError(error, HTTP_STATUS.UNAUTHORIZED)) {
        router.push(ROUTES.loginWithNext(ROUTES.lesson(lesson.id)))
        return
      }
      appendLines([verificationErrorLine(error)])
    }
  }, [files, isInstalling, runSucceeded, lesson.id, profile?.level, addOutput, appendLines, handleVerificationResult, router])

  const runConsoleCommand = useCallback(
    (command: string) => {
      if (pythonStatus !== "ready") {
        addOutput("warning", "Python ainda não está pronto.")
        return
      }
      addOutput("info", `>>> ${command}`)
      // O comando roda junto com os arquivos do projeto para poder importá-los.
      execute(
        { files: [...files, { path: CONSOLE_COMMAND_FILE_PATH, content: command }], entryPath: CONSOLE_COMMAND_FILE_PATH },
        {
          onResult: (result) => {
            if (result.stdout) appendLines(stdoutLines(result.stdout))
            if (result.stderr) addOutput("error", result.stderr.trim())
          },
          onError: (message) => addOutput("error", message),
        },
      )
    },
    [pythonStatus, files, execute, addOutput, appendLines],
  )

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault()
        run()
      }
      if (event.altKey && event.key === "g") {
        event.preventDefault()
        reset()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [run, reset])

  const value = useMemo<IDEContextValue>(
    () => ({
      files,
      activePath: tabs.activePath,
      openPaths: tabs.openPaths,
      setActivePath,
      openFile,
      closeTab,
      updateFileContent: handleContentChange,
      createFile,
      renameFile,
      deleteFile,
      consoleOutputs,
      clearConsole,
      addOutput,
      runConsoleCommand,
      pythonStatus,
      isExecuting,
      isInstalling,
      stop,
      run,
      reset,
      verify,
      hasRun,
      hasOutput,
      canVerify: runSucceeded,
      lessonProgress,
      allPassed,
      isVerifying: isVerifying || isInstalling,
      lastResult,
      levelBefore,
      showSuccess,
      setShowSuccess,
    }),
    [
      files, tabs, setActivePath, openFile, closeTab, handleContentChange, createFile, renameFile, deleteFile,
      consoleOutputs, clearConsole, addOutput, runConsoleCommand, pythonStatus, isExecuting, isInstalling, stop,
      run, reset, verify, hasRun, hasOutput, runSucceeded, lessonProgress, allPassed, isVerifying, lastResult,
      levelBefore, showSuccess,
    ],
  )

  return <IDEContext.Provider value={value}>{children}</IDEContext.Provider>
}

export function useIDE(): IDEContextValue {
  const context = useContext(IDEContext)
  if (!context) throw new Error("useIDE deve ser usado dentro de IDEProvider")
  return context
}
