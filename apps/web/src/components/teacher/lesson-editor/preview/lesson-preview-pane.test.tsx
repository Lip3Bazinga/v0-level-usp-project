import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { LessonStepInput } from "@levelusp/contracts"
import * as api from "@/lib/api"
import type * as LibApi from "@/lib/api"
import * as events from "@/lib/events"
import { isValidMermaidDiagram } from "@/lib/mermaid"
import { DEFAULT_FORM, type LessonFormState } from "../lesson-form"
import { createStep, parsonsContentChanges } from "../steps-form"
import { LessonPreviewPane } from "./lesson-preview-pane"

let pythonStdout = ""
const execute = vi.fn()

// Sem `useAuth`/`useProgress` mockados: se a prévia os usasse, o teste quebraria (não há provedor).
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))
vi.mock("@/hooks/use-python", () => ({ usePython: () => ({ status: "ready", isExecuting: false, isInstalling: false, execute, stop: vi.fn() }) }))
vi.mock("@/lib/events", () => ({ trackEvent: vi.fn() }))
vi.mock("@/lib/mermaid", () => ({ isValidMermaidDiagram: vi.fn().mockResolvedValue(true), renderMermaidDiagram: vi.fn().mockResolvedValue(null) }))
// O editor real (CodeMirror via next/dynamic) não roda no jsdom: um textarea faz o papel dele.
vi.mock("next/dynamic", () => ({
  default: () =>
    function FakeEditor(props: { tabs: { path: string; content: string }[]; onContentChange: (path: string, content: string) => void }): React.JSX.Element {
      return <textarea aria-label="Editor de código" value={props.tabs[0]?.content ?? ""} onChange={(event) => props.onContentChange("main.py", event.target.value)} />
    },
}))
// Markdown simples; um texto "BOOM" derruba a renderização para testar o isolamento de erro.
vi.mock("@/components/lesson-steps/step-markdown", () => ({
  StepMarkdown: ({ content }: { content: string }): React.JSX.Element => {
    if (content.includes("BOOM")) throw new Error("conteúdo quebrado")
    return <div>{content}</div>
  },
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
  submitDraftStep: vi.fn(),
}))

const FORBIDDEN_CALLS = [
  api.fetchMyLessonStepsProgress, api.completeReadingStep, api.submitStep, api.submitStepArrangement, api.submitStepPrediction,
  api.revealStepHint, api.fetchRevealedStepHints, api.revealStepSolution, api.submitStepQuiz, events.trackEvent,
]

const reading: LessonStepInput = { ...createStep("leitura", 1), title: "Introdução", narrative_markdown: "Texto de leitura" }
const exercise: LessonStepInput = { ...createStep("exercicio", 2), title: "Exercício soma", hints: ["Dica um", "Dica dois"] }
const prediction: LessonStepInput = {
  ...createStep("previsao", 3), title: "Previsão laço", starter_files: [{ path: "main.py", content: "print(0)\nprint(1)\n" }], expected_output: "0\n1",
}
const quiz: LessonStepInput = {
  ...createStep("quiz", 4),
  title: "Quiz final",
  quiz_questions: [{ prompt: "Qual é a certa?", options: ["Alternativa A", "Alternativa B"], correct_index: 1, explanation: "Porque B é a certa." }],
}

function formWith(steps: LessonStepInput[], extra: Partial<LessonFormState> = {}): LessonFormState {
  return { ...DEFAULT_FORM, lesson_type: "guided", title: "Aula de teste", steps, ...extra }
}

const renderPane = (steps: LessonStepInput[], activeStepIndex = 0): ReturnType<typeof render> =>
  render(<LessonPreviewPane form={formWith(steps)} activeStepIndex={activeStepIndex} lessonId="l1" />)

function expectNoServerCalls(): void {
  for (const call of FORBIDDEN_CALLS) expect(call).not.toHaveBeenCalled()
}

describe("prévia da lição no editor do professor", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    pythonStdout = "0\n1\n"
    execute.mockImplementation((_request: unknown, handlers: { onResult: (result: unknown) => void }) => {
      handlers.onResult({ stdout: pythonStdout, stderr: "", error: null, figures: [], truncated: false })
    })
    vi.mocked(isValidMermaidDiagram).mockResolvedValue(true)
  })

  it("leitura: mostra o texto e o Continuar só avança, sem tocar na API", async () => {
    renderPane([reading, exercise])
    expect(screen.getByRole("heading", { name: "Introdução" })).toBeInTheDocument()
    expect(screen.getByText("Texto de leitura")).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 2, name: "Aula de teste" })).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: /Continuar/ }))
    expect(await screen.findByRole("heading", { name: "Exercício soma" })).toBeInTheDocument()
    expectNoServerCalls()
  })

  it("todos os passos ficam livres na lista (nenhum travado) e o ativo começa no que o professor edita", () => {
    renderPane([reading, exercise, quiz], 2)
    const list = screen.getByRole("navigation", { name: "Passos da lição" })
    expect(within(list).getByRole("button", { name: /Passo 4: .*passo atual/ })).toBeEnabled()
    expect(within(list).getByRole("button", { name: /Passo 1: .*disponível/ })).toBeEnabled()
    expect(screen.getByRole("heading", { name: "Quiz final" })).toBeInTheDocument()
  })

  it("o passo ativo acompanha a prop quando o professor muda de passo", () => {
    const { rerender } = renderPane([reading, exercise, quiz], 0)
    expect(screen.getByRole("heading", { name: "Introdução" })).toBeInTheDocument()
    rerender(<LessonPreviewPane form={formWith([reading, exercise, quiz])} activeStepIndex={1} lessonId="l1" />)
    expect(screen.getByRole("heading", { name: "Exercício soma" })).toBeInTheDocument()
  })

  it("mostra o estado NÃO salvo: texto editado aparece sem recarregar", () => {
    const { rerender } = renderPane([reading])
    rerender(<LessonPreviewPane form={formWith([{ ...reading, narrative_markdown: "Texto novo" }])} activeStepIndex={0} lessonId="l1" />)
    expect(screen.getByText("Texto novo")).toBeInTheDocument()
  })

  it("exercício (código): Verificar corrige o rascunho pela API, sem as rotas do aluno; dicas e solução sem limite", async () => {
    vi.mocked(api.submitDraftStep)
      .mockRejectedValueOnce(new api.ApiError(503, "RUNNER_UNAVAILABLE", "O corretor está fora do ar."))
      .mockResolvedValueOnce({
        step_completed: false, xp_awarded: 0, lesson_completed: false, granted_badges: [], level_up: false, new_level: 0,
        step_id: "rascunho-2", passed: true, attempts: 0, solution_available: true,
        cases: [{ id: "saida", name: "Saída", passed: true, message: null, hint: null, checkpoint: 1 }],
      })
    renderPane([exercise])
    expect(screen.getByLabelText("Editor de código")).toHaveValue("# Escreva seu código abaixo\n")

    await userEvent.click(screen.getByRole("button", { name: "Verificar" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("O corretor está fora do ar.")

    await userEvent.click(screen.getByRole("button", { name: "Verificar" }))
    await waitFor(() => expect(api.submitDraftStep).toHaveBeenCalledTimes(2))
    expect(api.submitDraftStep).toHaveBeenLastCalledWith({
      runtime: DEFAULT_FORM.runtime,
      libraries: DEFAULT_FORM.libraries,
      step: { ...exercise, wrong_solutions: [] },
      files: [{ path: "main.py", content: "# Escreva seu código abaixo\n" }],
    })
    expect(api.submitStep).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole("button", { name: "Dica (0/2)" }))
    expect(await screen.findByText("Dica um")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Dica (1/2)" }))
    expect(await screen.findByText("Dica dois")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Dica (2/2)" })).toBeDisabled()

    // Sem tentativa nenhuma, a solução já está liberada e não há contagem regressiva.
    await userEvent.click(screen.getByRole("button", { name: /Ver solução/ }))
    expect(await screen.findByText('print("Olá, mundo!")')).toBeInTheDocument()
    expect(screen.queryByText(/A solução fica disponível/)).toBeNull()
    expectNoServerCalls()
  })

  it("exercício: o rascunho não vai para o localStorage do aluno", async () => {
    renderPane([exercise])
    await userEvent.type(screen.getByLabelText("Editor de código"), "x")
    expect(screen.getByLabelText("Editor de código")).toHaveValue("# Escreva seu código abaixo\nx")
    expect(window.localStorage.length).toBe(0)
  })

  it("exercício de lacunas e de ordenar renderizam", () => {
    const blanks: LessonStepInput = { ...exercise, exercise_mode: "lacunas", starter_files: [{ path: "main.py", content: 'print("___")\n' }] }
    const arrange: LessonStepInput = { ...exercise, exercise_mode: "ordenar", starter_files: [], ...parsonsContentChanges("a = 1\nprint(a)\n", []) }
    const { unmount } = renderPane([blanks])
    expect(screen.getByText("Complete as lacunas")).toBeInTheDocument()
    unmount()
    renderPane([arrange])
    expect(screen.getByText("Ordene as linhas")).toBeInTheDocument()
  })

  it("exercício: Executar roda no Python do navegador", async () => {
    renderPane([{ ...exercise, exercise_mode: "lacunas", starter_files: [{ path: "main.py", content: 'print("___")\n' }] }])
    await userEvent.click(screen.getByRole("button", { name: /Executar/ }))
    expect(execute).toHaveBeenCalledTimes(1)
    expectNoServerCalls()
  })

  it("previsão: roda o código no navegador e compara com o que o professor digita", async () => {
    renderPane([prediction])
    const answer = screen.getByLabelText("O que este código imprime?")

    await userEvent.type(answer, "0")
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }))
    expect(await screen.findByText(/Ainda não é isso/)).toBeInTheDocument()

    await userEvent.clear(answer)
    await userEvent.type(answer, "0{Enter}1")
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }))
    expect(await screen.findByText(/Isso mesmo/)).toBeInTheDocument()
    expect(execute).toHaveBeenCalledTimes(2)

    await userEvent.click(screen.getByRole("button", { name: /Ver solução/ }))
    expect(await screen.findByText("Saída esperada")).toBeInTheDocument()
    expectNoServerCalls()
  })

  it("quiz: corrige localmente, mostra a correta e a explicação, e permite tentar de novo", async () => {
    renderPane([quiz])
    await userEvent.click(screen.getByRole("radio", { name: /Alternativa A/ }))
    await userEvent.click(screen.getByRole("button", { name: "Enviar respostas" }))
    expect(await screen.findByText(/Você acertou 0 de 1/)).toBeInTheDocument()
    expect(screen.getByText("Alternativa correta")).toBeInTheDocument()
    expect(screen.getByText("Porque B é a certa.")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: /Tentar de novo/ }))
    await userEvent.click(screen.getByRole("radio", { name: /Alternativa B/ }))
    await userEvent.click(screen.getByRole("button", { name: "Enviar respostas" }))
    expect(await screen.findByText(/Aprovado: 1 de 1/)).toBeInTheDocument()
    expectNoServerCalls()
  })

  it("avisos de conteúdo (imagem sem alt, KaTeX, campos) aparecem no bloco de status", () => {
    renderPane([{ ...reading, narrative_markdown: "![](a.png) e $\\frac{1$" }, { ...exercise, solution_files: [] }])
    const status = screen.getByRole("status", { name: "Avisos de conteúdo" })
    expect(status).toHaveTextContent("sem texto alternativo")
    expect(status).toHaveTextContent("Fórmula KaTeX inválida")
  })

  it("aviso de campo obrigatório do passo ativo", () => {
    renderPane([{ ...exercise, solution_files: [] }])
    expect(screen.getByRole("status", { name: "Avisos de conteúdo" })).toHaveTextContent("sem solução de referência")
  })

  it("Mermaid inválido vira aviso (checado de forma assíncrona)", async () => {
    vi.mocked(isValidMermaidDiagram).mockResolvedValue(false)
    renderPane([{ ...reading, narrative_markdown: "```mermaid\ngraph ???\n```" }])
    await waitFor(() => expect(screen.getByRole("status", { name: "Avisos de conteúdo" })).toHaveTextContent("Mermaid inválido"))
  })

  it("erro de renderização do passo cai no aviso, sem derrubar a prévia", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined)
    renderPane([{ ...reading, narrative_markdown: "BOOM" }, exercise])
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível mostrar este passo na prévia")
    expect(screen.getByRole("navigation", { name: "Passos da lição" })).toBeInTheDocument()
    spy.mockRestore()
  })

  it("lição sem passos mostra o conteúdo da tela de lição atual", () => {
    render(<LessonPreviewPane form={formWith([], { content_markdown: "# Conteúdo clássico" })} activeStepIndex={0} lessonId={null} />)
    expect(screen.getByRole("heading", { name: "Conteúdo clássico" })).toBeInTheDocument()
    expect(screen.queryByRole("navigation", { name: "Passos da lição" })).toBeNull()
  })

  it("lição que não é guiada também usa a tela de lição atual", () => {
    render(<LessonPreviewPane form={formWith([reading], { lesson_type: "coding", content_markdown: "Instruções do exercício" })} activeStepIndex={0} lessonId={null} />)
    expect(screen.getByText("Instruções do exercício")).toBeInTheDocument()
  })
})
