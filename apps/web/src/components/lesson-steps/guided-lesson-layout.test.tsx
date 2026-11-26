import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Lesson, LessonStep, LessonStepsProgress, Profile, StepOutcome, StepSubmitResult } from "@levelusp/contracts"
import * as api from "@/lib/api"
import type * as LibApi from "@/lib/api"
import { GuidedLessonLayout } from "./guided-lesson-layout"

const push = vi.fn()
const applyCompletion = vi.fn().mockResolvedValue(undefined)
let profile: Partial<Profile> = { id: "u1", level: 1, experiment_condition: null }

vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }) }))
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => ({ profile, user: { id: "u1" } }) }))
vi.mock("@/contexts/progress-context", () => ({ useProgress: () => ({ applyCompletion, isCompleted: () => false }) }))
vi.mock("@/hooks/use-python", () => ({ usePython: () => ({ status: "ready", isExecuting: false, isInstalling: false, execute: vi.fn(), stop: vi.fn() }) }))
vi.mock("@/lib/swal", () => ({ swalToast: vi.fn(), swalConfirm: vi.fn() }))
vi.mock("@/lib/events", () => ({ trackEvent: vi.fn() }))
// O editor real (CodeMirror via next/dynamic) não roda no jsdom: um textarea faz o papel dele.
vi.mock("next/dynamic", () => ({
  default: () =>
    function FakeEditor(props: { tabs: { path: string; content: string }[]; onContentChange: (path: string, content: string) => void }): React.JSX.Element {
      return <textarea aria-label="Editor de código" value={props.tabs[0]?.content ?? ""} onChange={(event) => props.onContentChange("main.py", event.target.value)} />
    },
}))
vi.mock("@/components/ide/success-feedback", () => ({
  getLevelUpTransition: () => null,
  SuccessFeedback: ({ isOpen, xpEarned }: { isOpen: boolean; xpEarned: number }) => (isOpen ? <div role="dialog">Lição concluída! +{xpEarned} XP</div> : null),
}))
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof LibApi>()),
  fetchMyLessonStepsProgress: vi.fn(),
  completeReadingStep: vi.fn(),
  submitStep: vi.fn(),
  revealStepHint: vi.fn(),
  fetchRevealedStepHints: vi.fn(),
  revealStepSolution: vi.fn(),
  submitStepQuiz: vi.fn(),
}))

function step(id: string, order: number, kind: LessonStep["kind"], extra: Partial<LessonStep> = {}): LessonStep {
  return {
    id, lesson_id: "l1", order, kind, title: `Passo ${id}`, narrative_markdown: `Texto do passo ${id}`, starter_files: [], checkpoints: [],
    test_case_count: 0, hint_count: 0, quiz_questions: [], xp: 10, exercise_mode: "codigo", parsons_lines: [], ...extra,
  }
}

const STEPS: LessonStep[] = [
  step("leitura", 1, "leitura"),
  step("exercicio", 2, "exercicio", {
    starter_files: [{ path: "main.py", content: "# comece aqui" }],
    checkpoints: [{ id: 1, instruction: "Defina soma" }, { id: 2, instruction: "Imprima o total" }],
    test_case_count: 2, hint_count: 2,
  }),
  step("quiz", 3, "quiz", { quiz_questions: [{ prompt: "Quanto é 1 + 1?", options: ["1", "2"] }] }),
]

const LESSON: Lesson = {
  id: "l1", title: "Funções", description: "", slug: "funcoes", module: "Módulo 6", order: 1, difficulty: "iniciante", content_markdown: "",
  starter_code: "", starter_files: [], checkpoints: [], libraries: [], xp_reward: 100, time_limit: 20, lesson_type: "guided", quiz_passing_score: 70,
  course_id: "c1", module_id: "m1", published: true, created_at: "", updated_at: "", runtime: "python", is_project: false, objectives: [],
  solution_after_attempts: 3, steps: STEPS, run_button_min_level: 1,
}

const NOT_COMPLETED: StepOutcome = { step_completed: false, xp_awarded: 0, lesson_completed: false, granted_badges: [], level_up: false, new_level: 0 }
const COMPLETED: StepOutcome = { ...NOT_COMPLETED, step_completed: true, xp_awarded: 10, new_level: 1 }

function progressWith(completed: string[], attempts: Record<string, number> = {}): LessonStepsProgress {
  const ids = [...new Set([...completed, ...Object.keys(attempts)])]
  return {
    lesson_id: "l1",
    status: "in_progress",
    steps: ids.map((id) => ({
      step_id: id, status: completed.includes(id) ? "completed" : "in_progress", attempts: attempts[id] ?? 0, hints_revealed: 0, solution_viewed: false,
      xp_awarded: completed.includes(id) ? 10 : 0, completed_at: null,
    })),
  }
}

function failed(attempts: number): StepSubmitResult {
  return {
    ...NOT_COMPLETED, step_id: "exercicio", passed: false, attempts, solution_available: attempts >= 3,
    cases: [
      { id: "a", name: "Define soma", passed: true, message: null, hint: null, checkpoint: 1 },
      { id: "b", name: "Imprime o total", passed: false, message: "saída diferente", hint: "use print", checkpoint: 2 },
    ],
  }
}

const renderPlayer = (): ReturnType<typeof render> => render(<GuidedLessonLayout lesson={LESSON} allLessons={[]} currentIndex={0} />)

describe("player de passos da lição guiada", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    profile = { id: "u1", level: 1, experiment_condition: null }
    vi.mocked(api.fetchMyLessonStepsProgress).mockResolvedValue(progressWith([]))
    vi.mocked(api.fetchRevealedStepHints).mockResolvedValue([])
  })

  it("abre no primeiro passo pendente e trava os seguintes", async () => {
    renderPlayer()
    expect(await screen.findByRole("heading", { name: "Passo leitura" })).toBeInTheDocument()
    const list = screen.getByRole("navigation", { name: "Passos da lição" })
    expect(within(list).getByRole("button", { name: /Passo 1: .*passo atual/ })).toBeEnabled()
    expect(within(list).getByRole("button", { name: /Passo 2: .*bloqueado/ })).toBeDisabled()
    expect(within(list).getByRole("button", { name: /Passo 3: .*bloqueado/ })).toBeDisabled()
  })

  it("leitura: Continuar conclui pela API e avança para o exercício", async () => {
    vi.mocked(api.completeReadingStep).mockResolvedValue({ ...COMPLETED, step_id: "leitura" })
    renderPlayer()
    await userEvent.click(await screen.findByRole("button", { name: /Continuar/ }))
    expect(api.completeReadingStep).toHaveBeenCalledWith("l1", "leitura")
    expect(await screen.findByRole("heading", { name: "Passo exercicio" })).toBeInTheDocument()
    expect(applyCompletion).toHaveBeenCalledWith("l1", expect.objectContaining({ xp_awarded: 10, lesson_completed: false }))
    expect(screen.getByLabelText("Editor de código")).toHaveValue("# comece aqui")
  })

  it("exercício: marca ✓/✗ por instrução, mostra a dica do caso e só libera a solução após 3 tentativas", async () => {
    vi.mocked(api.fetchMyLessonStepsProgress).mockResolvedValue(progressWith(["leitura"]))
    vi.mocked(api.submitStep).mockResolvedValueOnce(failed(1)).mockResolvedValueOnce(failed(2)).mockResolvedValueOnce(failed(3))
    vi.mocked(api.revealStepHint).mockResolvedValue({ index: 0, text: "Comece pelo def" })
    vi.mocked(api.revealStepSolution).mockResolvedValue({ files: [{ path: "main.py", content: "print(soma(1, 2))" }], expected_output: null })
    renderPlayer()
    const verify = await screen.findByRole("button", { name: "Verificar" })

    await userEvent.click(verify)
    expect(await screen.findByLabelText("Certo")).toBeInTheDocument()
    expect(screen.getByLabelText("Ainda não")).toBeInTheDocument()
    expect(screen.getByText("Dica: use print")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Ver solução/ })).toBeNull()
    expect(screen.getByText(/depois de 3 tentativas \(1 até agora\)/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Dica (0/2)" }))
    expect(await screen.findByText("Comece pelo def")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Dica (1/2)" })).toBeEnabled()

    await userEvent.click(verify)
    await userEvent.click(verify)
    await userEvent.click(await screen.findByRole("button", { name: /Ver solução/ }))
    expect(await screen.findByText("print(soma(1, 2))")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Copiar para o editor" }))
    expect(screen.getByLabelText("Editor de código")).toHaveValue("print(soma(1, 2))")
    // Nada foi concluído sem veredito de aprovação.
    expect(applyCompletion).not.toHaveBeenCalled()
  })

  it("exercício aprovado libera o Continuar e guarda o rascunho por passo", async () => {
    vi.mocked(api.fetchMyLessonStepsProgress).mockResolvedValue(progressWith(["leitura"]))
    vi.mocked(api.submitStep).mockResolvedValue({ ...COMPLETED, step_id: "exercicio", passed: true, attempts: 0, solution_available: false, cases: [] })
    renderPlayer()
    await userEvent.type(await screen.findByLabelText("Editor de código"), "x")
    expect(window.localStorage.getItem("lvl:passo:exercicio")).toContain("# comece aquix")
    await userEvent.click(screen.getByRole("button", { name: "Verificar" }))
    await userEvent.click(await screen.findByRole("button", { name: /Continuar/ }))
    expect(await screen.findByRole("heading", { name: "Passo quiz" })).toBeInTheDocument()
  })

  it("quiz: reprovado permite tentar de novo; aprovado no último passo mostra a comemoração", async () => {
    vi.mocked(api.fetchMyLessonStepsProgress).mockResolvedValue(progressWith(["leitura", "exercicio"]))
    vi.mocked(api.submitStepQuiz)
      .mockResolvedValueOnce({ ...NOT_COMPLETED, step_id: "quiz", score: 0, passed: false, passing_score: 70, correct_count: 0, total: 1, review: [{ index: 0, correct: false, explanation: "" }] })
      .mockResolvedValueOnce({ ...COMPLETED, xp_awarded: 110, lesson_completed: true, step_id: "quiz", score: 100, passed: true, passing_score: 70, correct_count: 1, total: 1, review: [{ index: 0, correct: true, explanation: "Um mais um é dois." }] })
    renderPlayer()
    const submit = await screen.findByRole("button", { name: "Enviar respostas" })
    expect(submit).toBeDisabled()
    await userEvent.click(screen.getByRole("radio", { name: /A\s*1/ }))
    await userEvent.click(submit)
    expect(await screen.findByText(/Você acertou 0 de 1/)).toBeInTheDocument()
    expect(screen.queryByRole("dialog")).toBeNull()

    await userEvent.click(screen.getByRole("button", { name: /Tentar de novo/ }))
    await userEvent.click(screen.getByRole("radio", { name: /B\s*2/ }))
    await userEvent.click(screen.getByRole("button", { name: "Enviar respostas" }))
    expect(api.submitStepQuiz).toHaveBeenLastCalledWith("l1", "quiz", [1])
    expect(await screen.findByText("Um mais um é dois.")).toBeInTheDocument()
    expect(await screen.findByRole("dialog")).toHaveTextContent("+110 XP")
  })

  it("condição controle: a comemoração não mostra XP", async () => {
    profile = { id: "u1", level: 1, experiment_condition: "controle" }
    vi.mocked(api.fetchMyLessonStepsProgress).mockResolvedValue(progressWith(["leitura", "exercicio"]))
    vi.mocked(api.submitStepQuiz).mockResolvedValue({ ...COMPLETED, xp_awarded: 110, lesson_completed: true, step_id: "quiz", score: 100, passed: true, passing_score: 70, correct_count: 1, total: 1, review: [] })
    renderPlayer()
    await userEvent.click(await screen.findByRole("radio", { name: /B\s*2/ }))
    await userEvent.click(screen.getByRole("button", { name: "Enviar respostas" }))
    expect(await screen.findByRole("dialog")).toHaveTextContent("+0 XP")
  })

  it("visitante sem sessão vê a lição e é levado ao login na primeira ação", async () => {
    vi.mocked(api.fetchMyLessonStepsProgress).mockRejectedValue(new api.ApiError(401, "UNAUTHENTICATED", "Faça login para continuar."))
    vi.mocked(api.completeReadingStep).mockRejectedValue(new api.ApiError(401, "UNAUTHENTICATED", "Faça login para continuar."))
    renderPlayer()
    await userEvent.click(await screen.findByRole("button", { name: /Continuar/ }))
    await waitFor(() => expect(push).toHaveBeenCalledWith("/login?next=%2Flesson%2Fl1"))
  })
})
