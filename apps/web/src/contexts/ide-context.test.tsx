import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Lesson, Profile } from "@levelusp/contracts"
import type * as LibApi from "@/lib/api"
import { IDEProvider, useIDE } from "./ide-context"

const execute = vi.fn()
const auth: { profile: Partial<Profile>; user: { id: string }; isLoading: boolean } = { profile: {}, user: { id: "u1" }, isLoading: false }

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => auth }))
vi.mock("@/contexts/progress-context", () => ({ useProgress: () => ({ applyCompletion: vi.fn() }) }))
vi.mock("@/hooks/use-python", () => ({ usePython: () => ({ status: "ready", isExecuting: false, isInstalling: false, execute, stop: vi.fn() }) }))
vi.mock("@/lib/swal", () => ({ swalConfirm: vi.fn() }))
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof LibApi>()),
  fetchProgressSnapshot: vi.fn().mockResolvedValue(null),
  updateProgressSnapshot: vi.fn().mockResolvedValue(undefined),
}))

const LOCK_MESSAGE = "Executar libera no nível 10; até lá, use o terminal: python main.py"

const LESSON: Lesson = {
  id: "l1", title: "Clássica", description: "", slug: "classica", module: "Módulo 1", order: 1, difficulty: "iniciante", content_markdown: "",
  starter_code: "", starter_files: [{ path: "main.py", content: "print(1)\n" }], checkpoints: [], libraries: [], xp_reward: 50, time_limit: 10,
  lesson_type: "coding", quiz_passing_score: 70, course_id: "c1", module_id: null, published: true, created_at: "", updated_at: "", runtime: "python",
  is_project: false, objectives: [], solution_after_attempts: 3, steps: [],
}

function Probe(): React.JSX.Element {
  const { runLockedMessage, canVerify, consoleOutputs } = useIDE()
  return (
    <div>
      <p data-testid="lock">{runLockedMessage ?? "liberado"}</p>
      <p data-testid="can-verify">{String(canVerify)}</p>
      <ul>{consoleOutputs.map((output) => <li key={output.id}>{output.message}</li>)}</ul>
    </div>
  )
}

const renderIde = (lesson: Lesson = LESSON): ReturnType<typeof render> => render(<IDEProvider lesson={lesson}><Probe /></IDEProvider>)
const pressRunShortcut = (): boolean => fireEvent.keyDown(window, { key: "Enter", ctrlKey: true })

describe("IDEProvider — Executar por nível", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    auth.profile = { id: "u1", role: "student", level: 1, experiment_condition: null }
  })

  it("abaixo do nível, o atalho Ctrl+Enter não executa e o console explica o motivo", () => {
    renderIde()
    expect(screen.getByTestId("lock")).toHaveTextContent(LOCK_MESSAGE)
    pressRunShortcut()
    expect(execute).not.toHaveBeenCalled()
    expect(screen.getByRole("listitem")).toHaveTextContent(LOCK_MESSAGE)
  })

  it("bloqueado, o Verificar não depende de uma execução pelo botão", () => {
    renderIde()
    expect(screen.getByTestId("can-verify")).toHaveTextContent("true")
  })

  it("no nível do limite, o atalho executa e o Verificar volta a pedir uma execução", () => {
    auth.profile = { ...auth.profile, level: 10 }
    renderIde()
    expect(screen.getByTestId("lock")).toHaveTextContent("liberado")
    expect(screen.getByTestId("can-verify")).toHaveTextContent("false")
    pressRunShortcut()
    expect(execute).toHaveBeenCalledTimes(1)
  })

  it("respeita o limite do curso que vem com a lição", () => {
    renderIde({ ...LESSON, run_button_min_level: 1 })
    pressRunShortcut()
    expect(execute).toHaveBeenCalledTimes(1)
  })
})
