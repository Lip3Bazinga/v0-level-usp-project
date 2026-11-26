import { useState } from "react"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { DraftStepVerifyInput, DraftStepVerifyResult, LessonStepInput } from "@levelusp/contracts"
import { ApiError } from "@/lib/api"
import type { GabaritoLesson, WrongSolutionsByStep } from "./gabarito-test"
import { GabaritoTestPanel } from "./gabarito-test-panel"
import { createStep } from "./steps-form"

const first: LessonStepInput = { ...createStep("exercicio", 1), title: "Diga olá" }
const second: LessonStepInput = { ...createStep("exercicio", 3), title: "Some dois números" }
const lesson: GabaritoLesson = { runtime: "python", libraries: [], steps: [first, createStep("leitura", 2), second] }

const coherent = (order: number, extra: Partial<DraftStepVerifyResult> = {}): DraftStepVerifyResult => ({
  order,
  status: "ok",
  solution: { passed: true, as_expected: true, failed_cases: [] },
  starter: { passed: false, as_expected: true, failed_cases: [], inherited_from: null, shuffled_order: false },
  wrong_solutions: [],
  details: [],
  ...extra,
})

const verify = vi.fn<(input: DraftStepVerifyInput) => Promise<DraftStepVerifyResult>>()
let latestWrong: WrongSolutionsByStep = {}

function Harness({ current = lesson }: { current?: GabaritoLesson }): React.JSX.Element {
  const [wrongSolutions, setWrongSolutions] = useState<WrongSolutionsByStep>({})
  const handleChange = (next: WrongSolutionsByStep): void => {
    latestWrong = next
    setWrongSolutions(next)
  }
  return <GabaritoTestPanel lesson={current} wrongSolutions={wrongSolutions} onWrongSolutionsChange={handleChange} verify={verify} />
}

const stepItem = (title: string): HTMLElement => {
  const item = screen.getByRole("heading", { name: new RegExp(title) }).closest("li")
  if (!item) throw new Error(`passo "${title}" não está no painel`)
  return item
}

describe("painel Testar gabarito", () => {
  beforeEach(() => {
    verify.mockReset()
    latestWrong = {}
  })

  it("testa um passo de exercício por vez, mostra o andamento e o resultado de cada um", async () => {
    let finishFirst: (result: DraftStepVerifyResult) => void = () => undefined
    verify.mockImplementationOnce(() => new Promise((resolve) => { finishFirst = resolve })).mockResolvedValueOnce(coherent(3))
    render(<Harness />)

    await userEvent.click(screen.getByRole("button", { name: "Testar gabarito" }))
    expect(screen.getByRole("status")).toHaveTextContent("Testando o passo 1 de 2...")
    expect(screen.getByRole("button", { name: "Testando..." })).toBeDisabled()
    expect(within(stepItem("Diga olá")).getByText("Testando...")).toBeInTheDocument()
    expect(within(stepItem("Some dois números")).getByText("Na fila")).toBeInTheDocument()
    // O segundo passo só vai à API depois da resposta do primeiro (o corretor é compartilhado).
    expect(verify).toHaveBeenCalledTimes(1)

    finishFirst(coherent(1))
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("2 de 2 passo(s) de exercício com o gabarito coerente."))
    expect(verify).toHaveBeenCalledTimes(2)
    expect(verify.mock.calls.map(([input]) => input.step.order)).toEqual([1, 3])
    const item = within(stepItem("Diga olá"))
    expect(item.getByText("Gabarito coerente")).toBeInTheDocument()
    expect(item.getByText("aprovou, como esperado")).toBeInTheDocument()
    expect(item.getByText("reprovou, como esperado")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Testar gabarito" })).toBeEnabled()
  })

  it("mostra o motivo quando o gabarito está incoerente", async () => {
    verify
      .mockResolvedValueOnce(coherent(1, {
        status: "falha",
        solution: { passed: false, as_expected: false, failed_cases: [{ id: "saida", name: "Saída do programa", passed: false, message: "A saída não contém o esperado." }] },
        starter: { passed: true, as_expected: false, failed_cases: [], inherited_from: null, shuffled_order: false },
        details: ["solução de referência REPROVADA:", "  saida: A saída não contém o esperado.", "código inicial APROVADO sem o aluno fazer nada (casos que passaram: saida)"],
      }))
      .mockResolvedValueOnce(coherent(3, { starter: null }))
    render(<Harness />)
    await userEvent.click(screen.getByRole("button", { name: "Testar gabarito" }))

    const item = within(await waitFor(() => stepItem("Diga olá")))
    expect(await item.findByText("Gabarito com problema")).toBeInTheDocument()
    expect(item.getByText("REPROVOU (devia aprovar)")).toBeInTheDocument()
    expect(item.getByText("APROVOU (devia reprovar)")).toBeInTheDocument()
    expect(item.getByText("Saída do programa: A saída não contém o esperado.")).toBeInTheDocument()
    expect(item.getByText(/código inicial APROVADO sem o aluno fazer nada/)).toBeInTheDocument()
    expect(within(stepItem("Some dois números")).getByText(/não há código inicial para testar/)).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent("1 de 2 passo(s)")
  })

  it("soluções erradas ficam só na memória do painel e vão no pedido do passo", async () => {
    verify.mockImplementation((input) => Promise.resolve(coherent(input.step.order, {
      wrong_solutions: input.step.wrong_solutions.map((wrong) => ({ name: wrong.name, passed: false, as_expected: true, failed_cases: [] })),
    })))
    render(<Harness />)
    expect(screen.getAllByText(/usadas só neste teste, não são salvas/)).toHaveLength(2)

    await userEvent.click(screen.getByRole("button", { name: "Adicionar solução errada ao passo 3" }))
    const item = within(stepItem("Some dois números"))
    fireEvent.change(item.getByLabelText("Nome (qual é o erro)"), { target: { value: "subtrai" } })
    fireEvent.change(item.getByLabelText("Código (main.py)"), { target: { value: "print(1 - 1)\n" } })
    expect(latestWrong).toEqual({ 3: [{ name: "subtrai", code: "print(1 - 1)\n" }] })

    await userEvent.click(screen.getByRole("button", { name: "Testar gabarito" }))
    expect(await item.findByText("Solução errada “subtrai”:")).toBeInTheDocument()
    expect(verify.mock.calls[0]?.[0].step.wrong_solutions).toEqual([])
    expect(verify.mock.calls[1]?.[0].step.wrong_solutions).toEqual([{ name: "subtrai", files: [{ path: "main.py", content: "print(1 - 1)\n" }] }])

    // Mudou a solução errada depois do teste: o resultado mostrado está velho.
    fireEvent.change(item.getByLabelText("Código (main.py)"), { target: { value: "print(0)\n" } })
    expect(item.getByText(/O passo mudou depois deste teste/)).toBeInTheDocument()
  })

  it("um clique duplo dispara um teste só", async () => {
    verify.mockImplementation((input) => Promise.resolve(coherent(input.step.order)))
    render(<Harness />)
    const button = screen.getByRole("button", { name: "Testar gabarito" })
    fireEvent.click(button)
    fireEvent.click(button)
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("2 de 2"))
    expect(verify).toHaveBeenCalledTimes(2)
  })

  it("passo incompleto é recusado sem pedido; os outros são testados", async () => {
    verify.mockResolvedValue(coherent(3))
    render(<Harness current={{ ...lesson, steps: [{ ...first, test_cases: [] }, second] }} />)
    await userEvent.click(screen.getByRole("button", { name: "Testar gabarito" }))

    expect(await within(stepItem("Diga olá")).findByRole("alert")).toHaveTextContent("precisa de pelo menos um caso de teste")
    await waitFor(() => expect(within(stepItem("Some dois números")).getByText("Gabarito coerente")).toBeInTheDocument())
    expect(verify).toHaveBeenCalledTimes(1)
  })

  it("limite de pedidos interrompe o teste: os passos seguintes ficam como não testados", async () => {
    verify.mockRejectedValueOnce(new ApiError(429, "RATE_LIMITED", "Muitos testes de gabarito seguidos. Aguarde um instante."))
    render(<Harness />)
    await userEvent.click(screen.getByRole("button", { name: "Testar gabarito" }))

    expect(await within(stepItem("Diga olá")).findByRole("alert")).toHaveTextContent("Muitos testes de gabarito seguidos")
    expect(within(stepItem("Some dois números")).getByText("Não testado")).toBeInTheDocument()
    expect(verify).toHaveBeenCalledTimes(1)
    expect(screen.getByRole("button", { name: "Testar gabarito" })).toBeEnabled()
  })

  it("sem passos de exercício não há o que testar", () => {
    render(<Harness current={{ ...lesson, steps: [createStep("leitura", 1)] }} />)
    expect(screen.getByText("Nenhum passo de exercício para testar.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Testar gabarito" })).toBeDisabled()
  })
})
