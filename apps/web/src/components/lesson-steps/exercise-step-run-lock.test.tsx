import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Lesson, LessonStep, Profile } from "@levelusp/contracts"
import type * as LibApi from "@/lib/api"
import { ExerciseStep } from "./exercise-step"
import { RunButtonGateProvider, useRunButtonGate } from "./run-button-gate"

const execute = vi.fn()
const auth: { profile: Partial<Profile>; isLoading: boolean } = { profile: {}, isLoading: false }

vi.mock("@/contexts/auth-context", () => ({ useAuth: () => auth }))
vi.mock("@/hooks/use-python", () => ({ usePython: () => ({ status: "ready", isExecuting: false, isInstalling: false, execute, stop: vi.fn() }) }))
vi.mock("@/lib/python/trace-client", () => ({ requestTrace: vi.fn() }))
vi.mock("@/lib/api", async (importOriginal) => ({ ...(await importOriginal<typeof LibApi>()), fetchRevealedStepHints: vi.fn().mockResolvedValue([]) }))
// O editor (CodeMirror) e o terminal (xterm.js) reais não rodam no jsdom: cada um vira um substituto mínimo.
vi.mock("next/dynamic", () => ({
  default: () =>
    function FakeDynamic(props: { tabs?: unknown; onRun?: () => void; runLockedMessage?: string | null }): React.JSX.Element {
      if (props.tabs === undefined) return <div data-testid="terminal-panel">terminal</div>
      return (
        <div>
          <button type="button" onClick={props.onRun}>Rodar pelo editor</button>
          {props.runLockedMessage && <p data-testid="editor-lock">{props.runLockedMessage}</p>}
        </div>
      )
    },
}))

const LOCK_MESSAGE = "Executar libera no nível 10; até lá, use o terminal: python main.py"
const MAIN = { path: "main.py", content: "total = ___\nprint(total)\n" }

function step(mode: LessonStep["exercise_mode"]): LessonStep {
  return {
    id: "s1", lesson_id: "l1", order: 1, kind: "exercicio", title: "Passo", narrative_markdown: "Texto", starter_files: [MAIN], checkpoints: [],
    test_case_count: 1, hint_count: 0, quiz_questions: [], xp: 10, exercise_mode: mode, parsons_lines: [],
  }
}

const LESSON: Pick<Lesson, "id" | "libraries" | "solution_after_attempts"> = { id: "l1", libraries: [], solution_after_attempts: 2 }

function bareExercise(mode: LessonStep["exercise_mode"]): React.JSX.Element {
  return (
    <ExerciseStep lesson={LESSON} step={step(mode)} initialFiles={[MAIN]} progress={undefined} onProgress={vi.fn()} onVerified={vi.fn()} onContinue={vi.fn()} onUnauthorized={vi.fn()} />
  )
}

/** O que o player do aluno faz: calcula o bloqueio pelo nível do contexto e o entrega ao passo. */
function GatedExercise({ mode, courseMinLevel }: { mode: LessonStep["exercise_mode"]; courseMinLevel: number | null | undefined }): React.JSX.Element {
  const gate = useRunButtonGate(courseMinLevel)
  return <RunButtonGateProvider gate={gate}>{bareExercise(mode)}</RunButtonGateProvider>
}

function exercise(mode: LessonStep["exercise_mode"], lessonExtra: { run_button_min_level?: number | null } = {}): React.JSX.Element {
  return <GatedExercise mode={mode} courseMinLevel={lessonExtra.run_button_min_level} />
}

describe("ExerciseStep — Executar por nível", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    auth.profile = { id: "u1", role: "student", level: 1, experiment_condition: null }
  })

  it("abaixo do nível: Executar bloqueado com o motivo, terminal aberto e Verificar disponível", async () => {
    render(exercise("lacunas"))
    const run = screen.getByRole("button", { name: "Executar" })
    expect(run).toBeDisabled()
    expect(screen.getByRole("note")).toHaveTextContent(LOCK_MESSAGE)
    expect(screen.getByRole("tab", { name: "Terminal" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByTestId("terminal-panel")).toBeVisible()
    expect(screen.getByRole("button", { name: "Verificar" })).toBeEnabled()
    await userEvent.click(run)
    expect(execute).not.toHaveBeenCalled()
  })

  it("libera sem recarregar quando o nível do contexto alcança o limite", async () => {
    const view = render(exercise("lacunas", { run_button_min_level: 2 }))
    expect(screen.getByRole("button", { name: "Executar" })).toBeDisabled()
    expect(screen.getByRole("note")).toHaveTextContent("Executar libera no nível 2")

    auth.profile = { ...auth.profile, level: 2 }
    view.rerender(exercise("lacunas", { run_button_min_level: 2 }))
    expect(screen.queryByRole("note")).toBeNull()
    await userEvent.click(screen.getByRole("button", { name: "Executar" }))
    expect(execute).toHaveBeenCalledTimes(1)
    // A aba em que o aluno estava não muda sozinha.
    expect(screen.getByRole("tab", { name: "Terminal" })).toHaveAttribute("aria-selected", "true")
  })

  it("curso com limite 1: Executar liberado e a aba inicial é o Console", async () => {
    render(exercise("lacunas", { run_button_min_level: 1 }))
    expect(screen.getByRole("tab", { name: "Console" })).toHaveAttribute("aria-selected", "true")
    expect(screen.queryByTestId("terminal-panel")).toBeNull()
    await userEvent.click(screen.getByRole("button", { name: "Executar" }))
    expect(execute).toHaveBeenCalledTimes(1)
  })

  it("professor vê o Executar mesmo no nível 1", async () => {
    auth.profile = { ...auth.profile, role: "teacher" }
    render(exercise("lacunas"))
    expect(screen.queryByRole("note")).toBeNull()
    await userEvent.click(screen.getByRole("button", { name: "Executar" }))
    expect(execute).toHaveBeenCalledTimes(1)
  })

  it("sem o provedor do player (prévia do professor), o Executar fica liberado", async () => {
    render(bareExercise("lacunas"))
    expect(screen.queryByRole("note")).toBeNull()
    await userEvent.click(screen.getByRole("button", { name: "Executar" }))
    expect(execute).toHaveBeenCalledTimes(1)
  })

  it("modo código: o editor recebe o motivo e o onRun não executa enquanto bloqueado", async () => {
    render(exercise("codigo"))
    expect(await screen.findByTestId("editor-lock")).toHaveTextContent(LOCK_MESSAGE)
    await userEvent.click(screen.getByRole("button", { name: "Rodar pelo editor" }))
    expect(execute).not.toHaveBeenCalled()
  })
})
