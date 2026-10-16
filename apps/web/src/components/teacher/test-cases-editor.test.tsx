import { useState } from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { TestCase } from "@levelusp/contracts"
import { TestCasesEditor, compileDrafts, draftsFromCases, type TestCaseDraft } from "./test-cases-editor"
import { compileDraft, emptyDraft } from "./test-cases/drafts"
import { failurePreview } from "./test-cases/preview"

/** Reproduz o uso no editor de lição: o botão salvar fica bloqueado se houver erro. */
function Harness({ initial = [], onSave }: { initial?: TestCase[]; onSave: (cases: TestCase[]) => void }) {
  const [drafts, setDrafts] = useState<TestCaseDraft[]>(() => draftsFromCases(initial))
  const compiled = compileDrafts(drafts)
  return (
    <>
      <TestCasesEditor value={drafts} onChange={setDrafts} />
      <button type="button" disabled={!compiled.valid} onClick={() => onSave(compiled.cases)}>
        Salvar lição
      </button>
    </>
  )
}

const CALL: TestCase = { kind: "call", id: "a", name: "positivos", function: "soma", args: [2, 3], kwargs: {}, expected: 5 }
const IO: TestCase = { kind: "io", id: "b", stdin: "Ana", expected_stdout: "Olá, Ana", match: "trimmed" }

describe("TestCasesEditor", () => {
  it("adiciona um caso de chamada de função e salva o TestCase correspondente", async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<Harness onSave={onSave} />)

    expect(screen.getByText(/Nenhum caso de teste ainda/)).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Adicionar caso: Chamar função" }))

    const card = screen.getByRole("region", { name: "Caso 1" })
    await user.type(within(card).getByLabelText("Função"), "soma")
    const args = within(card).getByLabelText("Argumentos (lista JSON)")
    await user.clear(args)
    await user.click(args)
    await user.paste("[2, 3]")
    await user.click(within(card).getByLabelText("Retorno esperado (JSON)"))
    await user.paste("5")
    await user.type(within(card).getByLabelText("Nome exibido ao aluno"), "soma simples")

    // prévia do que o aluno verá
    expect(within(card).getByText(/soma\(2, 3\) retornou <valor do aluno>, que não é o esperado/)).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Salvar lição" }))
    expect(onSave).toHaveBeenCalledWith([
      { kind: "call", id: "caso-1", name: "soma simples", function: "soma", args: [2, 3], kwargs: {}, expected: 5 },
    ])
  })

  it("JSON inválido mostra o erro no campo e bloqueia o salvamento", async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<Harness initial={[CALL]} onSave={onSave} />)

    const card = screen.getByRole("region", { name: "Caso 1" })
    const expected = within(card).getByLabelText("Retorno esperado (JSON)")
    await user.clear(expected)
    await user.type(expected, "True")

    expect(within(card).getByText(/JSON inválido/)).toBeInTheDocument()
    expect(within(card).getByText(/use true\/false\/null/)).toBeInTheDocument()
    expect(expected).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByText(/1 erro\(s\) — corrija antes de salvar/)).toBeInTheDocument()

    const save = screen.getByRole("button", { name: "Salvar lição" })
    expect(save).toBeDisabled()
    await user.click(save)
    expect(onSave).not.toHaveBeenCalled()

    // corrigir libera o salvamento
    await user.clear(expected)
    await user.type(expected, "true")
    expect(within(card).queryByText(/JSON inválido/)).not.toBeInTheDocument()
    expect(save).toBeEnabled()
  })

  it("argumentos precisam ser uma lista JSON", async () => {
    const user = userEvent.setup()
    render(<Harness initial={[CALL]} onSave={vi.fn()} />)
    const card = screen.getByRole("region", { name: "Caso 1" })
    const args = within(card).getByLabelText("Argumentos (lista JSON)")
    await user.clear(args)
    await user.type(args, "2")
    expect(within(card).getByText(/devem ser uma lista JSON/)).toBeInTheDocument()
  })

  it("trocar o tipo do caso mostra os campos do novo tipo e preserva nome e id", async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<Harness initial={[CALL]} onSave={onSave} />)

    const card = screen.getByRole("region", { name: "Caso 1" })
    await user.selectOptions(within(card).getByLabelText("Tipo do caso"), "io")

    expect(within(card).queryByLabelText("Função")).not.toBeInTheDocument()
    const stdout = within(card).getByLabelText("Saída esperada")
    expect(within(card).getByText("Informe a saída esperada.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Salvar lição" })).toBeDisabled()

    await user.type(stdout, "8")
    await user.click(screen.getByRole("button", { name: "Salvar lição" }))
    expect(onSave).toHaveBeenCalledWith([
      { kind: "io", id: "a", name: "positivos", stdin: "", expected_stdout: "8", match: "trimmed" },
    ])
  })

  it("remove um caso", async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<Harness initial={[CALL, IO]} onSave={onSave} />)

    expect(screen.getAllByRole("region")).toHaveLength(2)
    await user.click(screen.getByRole("button", { name: "Remover Caso 1" }))

    expect(screen.getAllByRole("region")).toHaveLength(1)
    const remaining = screen.getByRole("region", { name: "Caso 1" })
    expect(within(remaining).getByLabelText("Saída esperada")).toHaveValue("Olá, Ana")
    await user.click(screen.getByRole("button", { name: "Salvar lição" }))
    expect(onSave).toHaveBeenCalledWith([IO])
  })

  it("reordena casos", async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<Harness initial={[CALL, IO]} onSave={onSave} />)
    await user.click(screen.getByRole("button", { name: "Mover Caso 2 para cima" }))
    await user.click(screen.getByRole("button", { name: "Salvar lição" }))
    expect(onSave).toHaveBeenCalledWith([IO, CALL])
  })

  it("avisa sobre testes legados", () => {
    render(<Harness initial={[{ kind: "legacy", id: "old", code: "assert soma(1, 1) == 2" }]} onSave={vi.fn()} />)
    expect(screen.getByRole("note")).toHaveTextContent(/formato legado/)
    expect(screen.getByText(/correção é mais fraca/)).toBeInTheDocument()
  })

  it("aponta identificadores repetidos", () => {
    const { errors, valid } = compileDrafts(draftsFromCases([CALL, { ...IO, id: "a" }]))
    expect(valid).toBe(false)
    expect(Object.values(errors).some((e) => e.id?.includes("repetido"))).toBe(true)
  })
})

describe("rascunhos de casos", () => {
  it("ida e volta caso → rascunho → caso é estável para todos os tipos", () => {
    const cases: TestCase[] = [
      { ...CALL, type: "int", tolerance: 0.01, reveal: true, hint: "use return" },
      IO,
      { kind: "variable", id: "v", variable: "total", expected: [1, "a", null] },
      { kind: "source", id: "s", rule: { type: "not_uses", construct: "for" } },
      { kind: "source", id: "s2", rule: { type: "imports", module: "math" } },
      { kind: "legacy", id: "l", code: "assert True" },
    ]
    expect(compileDrafts(draftsFromCases(cases)).cases).toEqual(cases)
  })

  it("valida nome de função", () => {
    const d = { ...emptyDraft("call", "x"), fn: "1soma", expected: "1" }
    expect(compileDraft(d).errors.fn).toMatch(/nome Python válido/)
  })

  it("prévia revela o esperado somente com reveal", () => {
    expect(failurePreview({ ...CALL, reveal: true }).message).toContain("esperado 5")
    expect(failurePreview(CALL).message).not.toContain("esperado 5")
    expect(failurePreview({ kind: "source", id: "s", rule: { type: "uses", construct: "recursion" }, hint: "chame a si mesma" }).message)
      .toBe("use recursão — dica: chame a si mesma")
  })
})
