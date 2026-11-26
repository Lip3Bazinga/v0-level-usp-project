import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Lesson, LessonStep, LessonStepsProgress, LessonSummary, Profile, StepOutcome, StepPredictResult, StepSubmitResult } from "@levelusp/contracts"
import * as api from "@/lib/api"
import type * as LibApi from "@/lib/api"
import type { ProjectTrace } from "@/lib/python/project-execution"
import { requestTrace } from "@/lib/python/trace-client"
import { swalToast } from "@/lib/swal"
import { GuidedLessonLayout } from "./guided-lesson-layout"

const push = vi.fn()
const applyCompletion = vi.fn().mockResolvedValue(undefined)
const execute = vi.fn()
const profile: Partial<Profile> = { id: "u1", level: 1, experiment_condition: null }

vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }) }))
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => ({ profile, user: { id: "u1" } }) }))
/** Lições que o aluno já concluiu (só o aviso de projeto bloqueado olha para isto). */
const completedLessons = new Set<string>()
const isCompleted = (lessonId: string): boolean => completedLessons.has(lessonId)
vi.mock("@/contexts/progress-context", () => ({ useProgress: () => ({ applyCompletion, isCompleted, isLoading: false }) }))
vi.mock("@/hooks/use-python", () => ({ usePython: () => ({ status: "ready", isExecuting: false, isInstalling: false, execute, stop: vi.fn() }) }))
// O Pyodide não roda no jsdom: o visualizador recebe um registro pronto.
vi.mock("@/lib/python/trace-client", () => ({ requestTrace: vi.fn() }))
vi.mock("@/lib/swal", () => ({ swalToast: vi.fn(), swalConfirm: vi.fn() }))
vi.mock("@/lib/events", () => ({ trackEvent: vi.fn() }))
// O editor real (CodeMirror via next/dynamic) não roda no jsdom: um textarea e o botão Visualizar fazem o papel dele.
vi.mock("next/dynamic", () => ({
  default: () =>
    function FakeEditor(props: { tabs: { path: string; content: string }[]; onContentChange: (path: string, content: string) => void; onVisualize?: () => void }): React.JSX.Element {
      return (
        <div>
          <textarea aria-label="Editor de código" value={props.tabs[0]?.content ?? ""} onChange={(event) => props.onContentChange("main.py", event.target.value)} />
          <button type="button" onClick={props.onVisualize}>Visualizar</button>
        </div>
      )
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
  submitStepArrangement: vi.fn(),
  submitStepPrediction: vi.fn(),
  revealStepHint: vi.fn(),
  fetchRevealedStepHints: vi.fn(),
  revealStepSolution: vi.fn(),
  submitStepQuiz: vi.fn(),
}))

function step(id: string, order: number, kind: LessonStep["kind"], extra: Partial<LessonStep> = {}): LessonStep {
  return {
    id, lesson_id: "l1", order, kind, title: `Passo ${id}`, narrative_markdown: `Texto do passo ${id}`, starter_files: [], checkpoints: [],
    test_case_count: 1, hint_count: 0, quiz_questions: [], xp: 10, exercise_mode: "codigo", parsons_lines: [], ...extra,
  }
}

const BLANKS_STEP = step("lacunas", 1, "exercicio", {
  exercise_mode: "lacunas",
  starter_files: [{ path: "main.py", content: "def media(notas):\n    total = ___\n    for nota in notas:\n        total += ___\n    return total / ___\n" }],
  checkpoints: [{ id: 1, instruction: "Comece o acumulador em zero" }],
})

// A ordem abaixo é a que a API entrega (embaralhada, com dois distratores): a tela não pode mudá-la.
const PARSONS_LINES = [
  { id: "l1", text: 'return "aprovado"' },
  { id: "l2", text: "if media > 6:" },
  { id: "l3", text: "def situacao(notas):" },
  { id: "l4", text: 'return "reprovado"' },
  { id: "l5", text: "return aprovado" },
  { id: "l6", text: "if media >= 6:" },
  { id: "l7", text: "media = sum(notas) / len(notas)" },
]
const PARSONS_STEP = step("ordenar", 1, "exercicio", { exercise_mode: "ordenar", parsons_lines: PARSONS_LINES, hint_count: 1 })

const PREDICTION_CODE = "total = 0\nfor nota in [7, 9]:\n    total += nota\n    print(total)\n"
const PREDICTION_STEP = step("previsao", 1, "previsao", { starter_files: [{ path: "main.py", content: PREDICTION_CODE }], hint_count: 2, test_case_count: 0 })

const CODE_STEP = step("codigo", 1, "exercicio", { starter_files: [{ path: "main.py", content: "total = 0\nprint(total)\n" }] })

function lessonWith(steps: LessonStep[]): Lesson {
  return {
    id: "l1", title: "Média", description: "", slug: "media", module: "Módulo 1", order: 1, difficulty: "iniciante", content_markdown: "",
    starter_code: "", starter_files: [], checkpoints: [], libraries: [], xp_reward: 100, time_limit: 20, lesson_type: "guided", quiz_passing_score: 70,
    course_id: "c1", module_id: "m1", published: true, created_at: "", updated_at: "", runtime: "python", is_project: false, objectives: [],
    solution_after_attempts: 2, steps, run_button_min_level: 1,
  }
}

const NOT_COMPLETED: StepOutcome = { step_completed: false, xp_awarded: 0, lesson_completed: false, granted_badges: [], level_up: false, new_level: 0 }
const COMPLETED: StepOutcome = { ...NOT_COMPLETED, step_completed: true, xp_awarded: 10, new_level: 1 }
const EMPTY_PROGRESS: LessonStepsProgress = { lesson_id: "l1", status: "in_progress", steps: [] }

const submitResult = (stepId: string, passed: boolean, attempts: number): StepSubmitResult => ({
  ...(passed ? COMPLETED : NOT_COMPLETED), step_id: stepId, passed, attempts, solution_available: attempts >= 2,
  cases: [{ id: "a", name: "Caso principal", passed, message: passed ? null : "saída diferente", hint: null, checkpoint: 1 }],
})
const predictResult = (passed: boolean, attempts: number, extra: Partial<StepPredictResult> = {}): StepPredictResult => ({
  ...(passed ? COMPLETED : NOT_COMPLETED), step_id: "previsao", passed, attempts, solution_available: attempts >= 2, ...extra,
})

const renderPlayer = (steps: LessonStep[]): ReturnType<typeof render> => render(<GuidedLessonLayout lesson={lessonWith(steps)} allLessons={[]} currentIndex={0} />)
const answerList = (): HTMLElement => within(screen.getByRole("region", { name: "Sua resposta" })).getByRole("list")
const answerTexts = (): string[] => within(answerList()).getAllByRole("listitem").map((item) => item.querySelector("code")?.lastChild?.textContent ?? "")
const add = (text: string): Promise<void> => userEvent.click(screen.getByRole("button", { name: `Adicionar à resposta: ${text}` }))

describe("player: exercício de lacunas", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    vi.mocked(api.fetchMyLessonStepsProgress).mockResolvedValue(EMPTY_PROGRESS)
    vi.mocked(api.fetchRevealedStepHints).mockResolvedValue([])
  })

  it("mostra um campo por lacuna, sem editor livre, e envia o código montado ao verificar", async () => {
    vi.mocked(api.submitStep).mockResolvedValue(submitResult("lacunas", true, 0))
    renderPlayer([BLANKS_STEP])
    const blanks = await screen.findByRole("group", { name: "Código com 3 lacunas para completar" })
    expect(screen.queryByLabelText("Editor de código")).toBeNull()
    expect(within(blanks).getAllByRole("textbox")).toHaveLength(3)

    await userEvent.type(screen.getByRole("textbox", { name: "Lacuna 1 de 3" }), "0")
    await userEvent.type(screen.getByRole("textbox", { name: "Lacuna 2 de 3" }), "nota")
    await userEvent.type(screen.getByRole("textbox", { name: "Lacuna 3 de 3" }), "len(notas)")
    await userEvent.click(screen.getByRole("button", { name: "Verificar" }))

    const assembled = "def media(notas):\n    total = 0\n    for nota in notas:\n        total += nota\n    return total / len(notas)\n"
    expect(api.submitStep).toHaveBeenCalledWith("l1", "lacunas", [{ path: "main.py", content: assembled }])
    expect(api.submitStepArrangement).not.toHaveBeenCalled()
    expect(await screen.findByLabelText("Certo")).toBeInTheDocument()
    expect(await screen.findByRole("button", { name: /Continuar/ })).toBeInTheDocument()
  })

  it("Executar roda o código montado e o rascunho das lacunas volta ao reabrir o passo", async () => {
    const first = renderPlayer([BLANKS_STEP])
    await userEvent.type(await screen.findByRole("textbox", { name: "Lacuna 1 de 3" }), "0")
    await userEvent.click(screen.getByRole("button", { name: "Executar" }))
    expect(execute).toHaveBeenCalledWith(
      { files: [{ path: "main.py", content: "def media(notas):\n    total = 0\n    for nota in notas:\n        total += ___\n    return total / ___\n" }], entryPath: "main.py", stdin: "" },
      expect.anything(),
    )
    expect(JSON.parse(window.localStorage.getItem("lvl:passo:lacunas:lacunas") ?? "null")).toEqual(["0", "", ""])

    first.unmount()
    renderPlayer([BLANKS_STEP])
    expect(await screen.findByRole("textbox", { name: "Lacuna 1 de 3" })).toHaveValue("0")

    await userEvent.click(screen.getByRole("button", { name: "Recomeçar" }))
    expect(screen.getByRole("textbox", { name: "Lacuna 1 de 3" })).toHaveValue("")
    expect(window.localStorage.getItem("lvl:passo:lacunas:lacunas")).toBeNull()
  })

  it("reprovado mostra o que não passou e, depois das tentativas, a solução como texto (sem copiar para o editor)", async () => {
    vi.mocked(api.submitStep).mockResolvedValueOnce(submitResult("lacunas", false, 1)).mockResolvedValueOnce(submitResult("lacunas", false, 2))
    vi.mocked(api.revealStepSolution).mockResolvedValue({ files: [{ path: "main.py", content: "total = 0 # solução" }], expected_output: null })
    renderPlayer([BLANKS_STEP])
    const verify = await screen.findByRole("button", { name: "Verificar" })
    await userEvent.click(verify)
    expect(await screen.findByText("saída diferente")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Ver solução/ })).toBeNull()
    await userEvent.click(verify)
    await userEvent.click(await screen.findByRole("button", { name: /Ver solução/ }))
    expect(await screen.findByText("total = 0 # solução")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Copiar para o editor" })).toBeNull()
    expect(applyCompletion).not.toHaveBeenCalled()
  })
})

describe("player: exercício de ordenar (pelos botões, sem arrastar)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    vi.mocked(api.fetchMyLessonStepsProgress).mockResolvedValue(EMPTY_PROGRESS)
    vi.mocked(api.fetchRevealedStepHints).mockResolvedValue([])
  })

  it("mostra as linhas na ordem em que a API entregou, sem reembaralhar", async () => {
    renderPlayer([PARSONS_STEP])
    const source = await screen.findByRole("region", { name: "Linhas disponíveis" })
    expect(within(source).getAllByRole("listitem").map((item) => item.querySelector("code")?.textContent)).toEqual(PARSONS_LINES.map((line) => line.text))
    expect(screen.queryByLabelText("Editor de código")).toBeNull()
  })

  it("adiciona, reordena, indenta e envia só as posições (line_id e indent)", async () => {
    vi.mocked(api.submitStepArrangement).mockResolvedValue(submitResult("ordenar", true, 0))
    renderPlayer([PARSONS_STEP])
    await screen.findByRole("region", { name: "Linhas disponíveis" })

    await add("media = sum(notas) / len(notas)")
    await add("def situacao(notas):")
    await add("if media >= 6:")
    await add('return "aprovado"')
    await add('return "reprovado"')
    await add("return aprovado")
    expect(answerTexts()).toEqual(["media = sum(notas) / len(notas)", "def situacao(notas):", "if media >= 6:", 'return "aprovado"', 'return "reprovado"', "return aprovado"])

    // Sobe o `def` para o topo: o foco continua na mesma linha, que agora não pode mais subir.
    await userEvent.click(screen.getByRole("button", { name: "Subir a linha 2: def situacao(notas):" }))
    expect(answerTexts().slice(0, 2)).toEqual(["def situacao(notas):", "media = sum(notas) / len(notas)"])
    expect(screen.getByRole("button", { name: "Subir a linha 1: def situacao(notas):" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Descer a linha 1: def situacao(notas):" })).toHaveFocus()

    // Desce e sobe de novo pelo teclado.
    await userEvent.keyboard("{Enter}")
    expect(answerTexts()[1]).toBe("def situacao(notas):")
    expect(screen.getByRole("button", { name: "Descer a linha 2: def situacao(notas):" })).toHaveFocus()
    await userEvent.click(screen.getByRole("button", { name: "Subir a linha 2: def situacao(notas):" }))

    // Tira o distrator da resposta: ele volta para as linhas disponíveis.
    await userEvent.click(screen.getByRole("button", { name: "Remover da resposta a linha 6: return aprovado" }))
    expect(within(screen.getByRole("region", { name: "Linhas disponíveis" })).getByText("return aprovado")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Indentar a linha 2: media = sum(notas) / len(notas)" }))
    await userEvent.click(screen.getByRole("button", { name: "Indentar a linha 3: if media >= 6:" }))
    const indentReturn = screen.getByRole("button", { name: 'Indentar a linha 4: return "aprovado"' })
    await userEvent.click(indentReturn)
    await userEvent.click(indentReturn)
    await userEvent.click(indentReturn)
    await userEvent.click(screen.getByRole("button", { name: 'Desindentar a linha 4: return "aprovado"' }))
    await userEvent.click(screen.getByRole("button", { name: 'Indentar a linha 5: return "reprovado"' }))
    expect(screen.getByRole("button", { name: "Desindentar a linha 1: def situacao(notas):" })).toBeDisabled()

    const arrangement = [
      { line_id: "l3", indent: 0 }, { line_id: "l7", indent: 1 }, { line_id: "l6", indent: 1 }, { line_id: "l1", indent: 2 }, { line_id: "l4", indent: 1 },
    ]
    expect(JSON.parse(window.localStorage.getItem("lvl:passo:ordenar:ordem") ?? "null")).toEqual(arrangement)

    await userEvent.click(screen.getByRole("button", { name: "Executar" }))
    expect(execute).toHaveBeenCalledWith(
      {
        files: [{ path: "main.py", content: 'def situacao(notas):\n    media = sum(notas) / len(notas)\n    if media >= 6:\n        return "aprovado"\n    return "reprovado"\n' }],
        entryPath: "main.py", stdin: "",
      },
      expect.anything(),
    )

    await userEvent.click(screen.getByRole("button", { name: "Verificar" }))
    expect(api.submitStepArrangement).toHaveBeenCalledWith("l1", "ordenar", arrangement)
    expect(api.submitStep).not.toHaveBeenCalled()
    expect(await screen.findByRole("button", { name: /Continuar/ })).toBeInTheDocument()
    expect(applyCompletion).toHaveBeenCalledWith("l1", expect.objectContaining({ xp_awarded: 10 }))
  })

  it("não envia resposta vazia e mostra a mensagem da API quando o arranjo é recusado", async () => {
    vi.mocked(api.submitStepArrangement).mockRejectedValue(new api.ApiError(400, "INVALID_ARRANGEMENT", "As linhas enviadas não pertencem a este passo."))
    renderPlayer([PARSONS_STEP])
    await userEvent.click(await screen.findByRole("button", { name: "Verificar" }))
    expect(api.submitStepArrangement).not.toHaveBeenCalled()
    expect(screen.getByRole("alert")).toHaveTextContent("Leve pelo menos uma linha para a sua resposta")

    await add("def situacao(notas):")
    await userEvent.click(screen.getByRole("button", { name: "Verificar" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("As linhas enviadas não pertencem a este passo.")
    expect(applyCompletion).not.toHaveBeenCalled()
  })

  it("a solução liberada aparece como texto; o arranjo guardado volta ao reabrir", async () => {
    window.localStorage.setItem("lvl:passo:ordenar:ordem", JSON.stringify([{ line_id: "l3", indent: 0 }, { line_id: "inexistente", indent: 0 }, { line_id: "l7", indent: 1 }]))
    vi.mocked(api.fetchMyLessonStepsProgress).mockResolvedValue({
      ...EMPTY_PROGRESS,
      steps: [{ step_id: "ordenar", status: "in_progress", attempts: 2, hints_revealed: 0, solution_viewed: false, xp_awarded: 0, completed_at: null }],
    })
    vi.mocked(api.revealStepSolution).mockResolvedValue({ files: [{ path: "main.py", content: "def situacao(notas):\n    ..." }], expected_output: null })
    renderPlayer([PARSONS_STEP])
    await screen.findByRole("region", { name: "Sua resposta" })
    expect(answerTexts()).toEqual(["def situacao(notas):", "media = sum(notas) / len(notas)"])
    await userEvent.click(screen.getByRole("button", { name: /Ver solução/ }))
    expect(await screen.findByText(/def situacao\(notas\):\s+\.\.\./)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Copiar para o editor" })).toBeNull()
  })
})

describe("player: passo de previsão", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    vi.mocked(api.fetchMyLessonStepsProgress).mockResolvedValue(EMPTY_PROGRESS)
    vi.mocked(api.fetchRevealedStepHints).mockResolvedValue([])
  })

  it("mostra o código somente leitura, sem Executar nem Visualizar, e aparece na lista de passos", async () => {
    renderPlayer([PREDICTION_STEP])
    expect(await screen.findByLabelText("Código do passo (somente leitura)")).toHaveTextContent("for nota in [7, 9]:")
    expect(screen.getByRole("button", { name: /Passo 1: Passo previsao \(Previsão, passo atual\)/ })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Executar/ })).toBeNull()
    expect(screen.queryByRole("button", { name: /Visualizar/ })).toBeNull()
    expect(screen.queryByLabelText("Editor de código")).toBeNull()
    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled()
  })

  it("erro → dica → saída esperada depois das tentativas → acerto conclui a lição", async () => {
    vi.mocked(api.submitStepPrediction)
      .mockResolvedValueOnce(predictResult(false, 1))
      .mockResolvedValueOnce(predictResult(false, 2))
      .mockResolvedValueOnce(predictResult(true, 2, { xp_awarded: 5, lesson_completed: true }))
    vi.mocked(api.revealStepHint).mockResolvedValue({ index: 0, text: "O print está dentro do laço." })
    vi.mocked(api.revealStepSolution).mockResolvedValue({ files: [], expected_output: "7\n16" })
    renderPlayer([PREDICTION_STEP])
    const answer = await screen.findByRole("textbox", { name: "O que este código imprime?" })
    const send = screen.getByRole("button", { name: "Enviar" })

    await userEvent.type(answer, "16")
    await userEvent.click(send)
    expect(api.submitStepPrediction).toHaveBeenLastCalledWith("l1", "previsao", "16")
    expect(await screen.findByText(/Ainda não é isso\..*Tentativas até agora: 1\./)).toBeInTheDocument()
    // Nenhuma pista da resposta: nem a saída certa nem diferenças.
    expect(screen.queryByText("Saída esperada")).toBeNull()
    expect(screen.queryByRole("button", { name: /Ver solução/ })).toBeNull()
    expect(screen.getByText(/depois de 2 tentativas \(1 até agora\)/)).toBeInTheDocument()
    expect(api.revealStepSolution).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole("button", { name: "Dica (0/2)" }))
    expect(await screen.findByText("O print está dentro do laço.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Dica (1/2)" })).toBeEnabled()

    await userEvent.click(send)
    expect(await screen.findByText(/Tentativas até agora: 2\./)).toBeInTheDocument()
    await userEvent.click(await screen.findByRole("button", { name: /Ver solução/ }))
    expect(await screen.findByText("Saída esperada")).toBeInTheDocument()
    // Ver a saída não conclui o passo: o aluno ainda precisa enviá-la.
    expect(applyCompletion).not.toHaveBeenCalled()
    expect(screen.queryByRole("button", { name: /Continuar/ })).toBeNull()

    await userEvent.click(screen.getByRole("button", { name: "Copiar para a resposta" }))
    expect(answer).toHaveValue("7\n16")
    await userEvent.click(send)
    expect(api.submitStepPrediction).toHaveBeenLastCalledWith("l1", "previsao", "7\n16")
    expect(await screen.findByText(/Isso mesmo!/)).toBeInTheDocument()
    expect(await screen.findByRole("dialog")).toHaveTextContent("+5 XP")
    expect(applyCompletion).toHaveBeenCalledWith("l1", expect.objectContaining({ xp_awarded: 5, lesson_completed: true }))
    expect(screen.getByRole("button", { name: /Continuar/ })).toBeInTheDocument()
  })

  it("limite de envios (429) mostra a mensagem da API; sessão expirada leva ao login", async () => {
    vi.mocked(api.submitStepPrediction)
      .mockRejectedValueOnce(new api.ApiError(429, "RATE_LIMITED", "Muitas tentativas. Aguarde um minuto."))
      .mockRejectedValueOnce(new api.ApiError(401, "UNAUTHENTICATED", "Faça login para continuar."))
    renderPlayer([PREDICTION_STEP])
    await userEvent.type(await screen.findByRole("textbox", { name: "O que este código imprime?" }), "7")
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Muitas tentativas. Aguarde um minuto.")
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }))
    expect(push).toHaveBeenCalledWith("/login?next=%2Flesson%2Fl1")
  })
})

describe("player: Visualizar no exercício de código", () => {
  const TRACE: ProjectTrace = {
    steps: [
      { line: 1, event: "line", function_name: null, globals: [], locals: null, stdout_length: 0 },
      { line: 2, event: "line", function_name: null, globals: [{ name: "total", value: "5" }], locals: null, stdout_length: 0 },
    ],
    stdout: "", error: null, truncated: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    vi.mocked(api.fetchMyLessonStepsProgress).mockResolvedValue(EMPTY_PROGRESS)
    vi.mocked(api.fetchRevealedStepHints).mockResolvedValue([])
  })

  it("usa o código que está no editor, sem chamar a API, e volta ao editor ao fechar", async () => {
    vi.mocked(requestTrace).mockResolvedValue(TRACE)
    renderPlayer([CODE_STEP])
    const editor = await screen.findByLabelText("Editor de código")
    await userEvent.clear(editor)
    await userEvent.type(editor, "total = 5")
    await userEvent.click(screen.getByRole("button", { name: "Visualizar" }))
    expect(requestTrace).toHaveBeenCalledWith({ files: [{ path: "main.py", content: "total = 5" }], entryPath: "main.py", stdin: "", packages: [] })
    expect(await screen.findByRole("group", { name: /Visualizador de execução/ })).toBeInTheDocument()
    expect(screen.queryByLabelText("Editor de código")).toBeNull()
    expect(api.submitStep).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole("button", { name: "Fechar o visualizador" }))
    expect(screen.getByLabelText("Editor de código")).toHaveValue("total = 5")
  })
})

describe("player: campo Entrada (stdin)", () => {
  const INPUT_CODE = "nome = input()\nprint(nome)\n"
  const stdinField = (): HTMLElement => screen.getByRole("textbox", { name: "Entrada (stdin)" })
  const stdinToggle = (): HTMLElement => screen.getByRole("button", { name: /Entrada \(stdin\)/ })

  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    vi.mocked(api.fetchMyLessonStepsProgress).mockResolvedValue(EMPTY_PROGRESS)
    vi.mocked(api.fetchRevealedStepHints).mockResolvedValue([])
  })

  it("código: abre sozinho quando o programa chama input() e o Visualizar lê a entrada digitada", async () => {
    vi.mocked(requestTrace).mockResolvedValue({ steps: [], stdout: "", error: null, truncated: false })
    renderPlayer([step("codigo", 1, "exercicio", { starter_files: [{ path: "main.py", content: INPUT_CODE }] })])
    await screen.findByLabelText("Editor de código")
    expect(stdinToggle()).toHaveAttribute("aria-expanded", "true")
    await userEvent.type(stdinField(), "Ana{Enter}20")
    expect(stdinToggle()).toHaveTextContent("2 linhas")
    await userEvent.click(screen.getByRole("button", { name: "Visualizar" }))
    expect(requestTrace).toHaveBeenCalledWith({ files: [{ path: "main.py", content: INPUT_CODE }], entryPath: "main.py", stdin: "Ana\n20", packages: [] })
  })

  it("código: fica fechado sem input(), abre quando o aluno escreve input() e pode ser fechado à mão", async () => {
    renderPlayer([CODE_STEP])
    const editor = await screen.findByLabelText("Editor de código")
    expect(stdinToggle()).toHaveAttribute("aria-expanded", "false")
    await userEvent.type(editor, "x = input()")
    expect(stdinToggle()).toHaveAttribute("aria-expanded", "true")
    await userEvent.click(stdinToggle())
    expect(stdinToggle()).toHaveAttribute("aria-expanded", "false")
  })

  it("lacunas: o Executar manda a entrada junto com o código montado", async () => {
    renderPlayer([step("lacunas", 1, "exercicio", { exercise_mode: "lacunas", starter_files: [{ path: "main.py", content: "nome = ___()\nprint(nome)\n" }] })])
    const blank = await screen.findByRole("textbox", { name: "Lacuna 1 de 1" })
    expect(stdinToggle()).toHaveAttribute("aria-expanded", "false")
    await userEvent.type(blank, "input")
    expect(stdinToggle()).toHaveAttribute("aria-expanded", "true")
    await userEvent.type(stdinField(), "Ana")
    await userEvent.click(screen.getByRole("button", { name: "Executar" }))
    expect(execute).toHaveBeenCalledWith({ files: [{ path: "main.py", content: INPUT_CODE }], entryPath: "main.py", stdin: "Ana" }, expect.anything())
  })

  it("ordenar: já abre se alguma linha do banco chama input() e o Executar manda a entrada", async () => {
    renderPlayer([step("ordenar", 1, "exercicio", { exercise_mode: "ordenar", parsons_lines: [{ id: "a", text: "print(nome)" }, { id: "b", text: "nome = input()" }] })])
    await screen.findByRole("button", { name: "Adicionar à resposta: nome = input()" })
    expect(stdinToggle()).toHaveAttribute("aria-expanded", "true")
    await add("nome = input()")
    await add("print(nome)")
    await userEvent.type(stdinField(), "Bia")
    await userEvent.click(screen.getByRole("button", { name: "Executar" }))
    expect(execute).toHaveBeenCalledWith({ files: [{ path: "main.py", content: INPUT_CODE }], entryPath: "main.py", stdin: "Bia" }, expect.anything())
  })

  it("a entrada não vai para a API no Verificar", async () => {
    vi.mocked(api.submitStep).mockResolvedValue(submitResult("codigo", true, 0))
    renderPlayer([step("codigo", 1, "exercicio", { starter_files: [{ path: "main.py", content: INPUT_CODE }] })])
    await screen.findByLabelText("Editor de código")
    await userEvent.type(stdinField(), "Ana")
    await userEvent.click(screen.getByRole("button", { name: "Verificar" }))
    expect(api.submitStep).toHaveBeenCalledWith("l1", "codigo", [{ path: "main.py", content: INPUT_CODE }])
  })
})

describe("player: projeto do nível bloqueado", () => {
  const summary = (id: string, title: string, extra: Partial<LessonSummary> = {}): LessonSummary => ({
    id, title, slug: id, module: "Módulo 1", module_id: "m1", order: 1, difficulty: "iniciante", lesson_type: "guided", xp_reward: 10, course_id: "c1", published: true, is_project: false, ...extra,
  })
  const COURSE: LessonSummary[] = [
    summary("a", "Olá, Python"),
    summary("b", "Variáveis"),
    summary("rascunho", "Lição em rascunho", { published: false }),
    summary("outro", "Lição de outro curso", { course_id: "c2" }),
    summary("l1", "Gerenciador de tarefas", { is_project: true }),
  ]
  const renderProject = (isProject = true): ReturnType<typeof render> =>
    render(<GuidedLessonLayout lesson={{ ...lessonWith([step("leitura", 1, "leitura")]), is_project: isProject }} allLessons={COURSE} currentIndex={4} />)
  const notice = (): HTMLElement | null => screen.queryByRole("region", { name: "Projeto bloqueado" })
  const noticeLinks = (): (string | null)[][] => {
    const region = screen.getByRole("region", { name: "Projeto bloqueado" })
    return within(region).getAllByRole("link").map((link) => [link.textContent, link.getAttribute("href")])
  }

  beforeEach(() => {
    vi.clearAllMocks()
    completedLessons.clear()
    window.localStorage.clear()
    vi.mocked(api.fetchMyLessonStepsProgress).mockResolvedValue(EMPTY_PROGRESS)
  })

  it("mostra um aviso fixo com a lição que falta e o link para ela", async () => {
    completedLessons.add("a")
    renderProject()
    await screen.findByRole("heading", { name: "Passo leitura" })
    expect(notice()).toHaveTextContent("Falta 1 lição do curso para liberar o projeto.")
    expect(noticeLinks()).toEqual([["Variáveis", "/lesson/b"]])
  })

  it("lista todas as pendentes na ordem do curso, sem rascunhos, outros cursos nem o próprio projeto", async () => {
    renderProject()
    await screen.findByRole("heading", { name: "Passo leitura" })
    expect(notice()).toHaveTextContent("Faltam 2 lições do curso para liberar o projeto.")
    expect(noticeLinks()).toEqual([["Olá, Python", "/lesson/a"], ["Variáveis", "/lesson/b"]])
  })

  it("a recusa da API (PROJECT_LOCKED) não vira aviso passageiro: o aviso fixo continua na página", async () => {
    vi.mocked(api.completeReadingStep).mockRejectedValue(new api.ApiError(403, "PROJECT_LOCKED", "Conclua as outras lições do curso antes do projeto (faltam 2)."))
    renderProject()
    await userEvent.click(await screen.findByRole("button", { name: /Continuar/ }))
    expect(api.completeReadingStep).toHaveBeenCalled()
    expect(swalToast).not.toHaveBeenCalled()
    expect(notice()).not.toBeNull()
  })

  it("some com tudo concluído e não aparece em lição comum", async () => {
    completedLessons.add("a").add("b")
    const project = renderProject()
    await screen.findByRole("heading", { name: "Passo leitura" })
    expect(notice()).toBeNull()
    project.unmount()

    completedLessons.clear()
    renderProject(false)
    await screen.findByRole("heading", { name: "Passo leitura" })
    expect(notice()).toBeNull()
  })
})
