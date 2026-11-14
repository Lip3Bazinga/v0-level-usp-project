import { useState } from "react"
import { fireEvent, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"
import { isParsonsSolutionOrder, type LessonStepInput } from "@levelusp/contracts"
import { validateSteps } from "./steps-form"
import { StepsTab } from "./steps-tab"

let latest: LessonStepInput[] = []

function Harness(): React.JSX.Element {
  const [steps, setSteps] = useState<LessonStepInput[]>([])
  const handleChange = (next: LessonStepInput[]): void => {
    latest = next
    setSteps(next)
  }
  return <StepsTab steps={steps} onChange={handleChange} />
}

describe("aba Passos do editor do professor", () => {
  beforeEach(() => {
    latest = []
  })

  it("cria e edita um passo de Previsão (código, saída esperada e dicas)", async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole("button", { name: "Previsão" }))
    expect(latest[0]?.kind).toBe("previsao")

    fireEvent.change(screen.getByLabelText(/Código que o aluno lê/), { target: { value: "for i in range(2):\n    print(i)\n" } })
    fireEvent.change(screen.getByLabelText(/Saída esperada/), { target: { value: "0\n1" } })
    fireEvent.change(screen.getByLabelText(/Dicas/), { target: { value: "range(2) gera 0 e 1\n\nO print roda duas vezes" } })

    expect(latest[0]).toMatchObject({
      kind: "previsao",
      starter_files: [{ path: "main.py", content: "for i in range(2):\n    print(i)\n" }],
      expected_output: "0\n1",
      hints: ["range(2) gera 0 e 1", "O print roda duas vezes"],
      exercise_mode: "codigo",
    })
    expect(validateSteps(latest)).toBeNull()
    // Previsão não tem casos de teste nem solução em arquivo.
    expect(screen.queryByLabelText(/Casos de teste/)).toBeNull()
  })

  it("exercício: escolhe o modo lacunas e conta as lacunas do código inicial", async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole("button", { name: "Exercício" }))
    await userEvent.selectOptions(screen.getByLabelText("Como o aluno responde"), "lacunas")
    expect(latest[0]?.exercise_mode).toBe("lacunas")
    expect(screen.getByText(/Lacunas encontradas: 0/)).toBeInTheDocument()
    expect(validateSteps(latest)).toMatch(/precisa de pelo menos uma lacuna/)

    fireEvent.change(screen.getByLabelText(/Código inicial/), { target: { value: "print(___ + ___)\n" } })
    expect(screen.getByText(/Lacunas encontradas: 2/)).toBeInTheDocument()
    expect(validateSteps(latest)).toBeNull()
  })

  it("exercício: no modo ordenar as linhas saem da solução e dos distratores, já embaralhadas", async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole("button", { name: "Exercício" }))
    await userEvent.selectOptions(screen.getByLabelText("Como o aluno responde"), "ordenar")
    expect(screen.queryByLabelText(/Código inicial/)).toBeNull()

    const solution = "def dobro(x):\n    y = x * 2\n    return y\n"
    fireEvent.change(screen.getByLabelText(/^Solução/), { target: { value: solution } })
    fireEvent.change(screen.getByLabelText(/Distratores/), { target: { value: "return x\ny = x + 2" } })

    const step = latest[0]
    expect(step?.exercise_mode).toBe("ordenar")
    expect(step?.starter_files).toEqual([])
    expect(step?.parsons_lines.map((line) => line.text).sort()).toEqual(["def dobro(x):", "return x", "return y", "y = x * 2", "y = x + 2"])
    expect(isParsonsSolutionOrder(step?.parsons_lines ?? [], solution)).toBe(false)
    expect(within(screen.getByRole("list", { name: "Linhas que o aluno recebe" })).getAllByRole("listitem")).toHaveLength(5)
    expect(validateSteps(latest)).toBeNull()

    // Mudar a solução mantém os distratores já digitados.
    fireEvent.change(screen.getByLabelText(/^Solução/), { target: { value: "def dobro(x):\n    return x * 2\n" } })
    expect(latest[0]?.parsons_lines.map((line) => line.text).sort()).toEqual(["def dobro(x):", "return x", "return x * 2", "y = x + 2"])

    await userEvent.selectOptions(screen.getByLabelText("Como o aluno responde"), "codigo")
    expect(latest[0]?.parsons_lines).toEqual([])
  })
})
