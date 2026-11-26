import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { RUN_BUTTON_MIN_LEVEL } from "@levelusp/contracts"
import { parseRunLevel, runLevelLabel, RunLevelModal } from "./run-level-modal"

const COURSE = { id: "c1", title: "Nível 1 — Fundamentos", run_button_min_level: null }

describe("parseRunLevel / runLevelLabel", () => {
  it("padrão marcado vira null; nível válido vira número", () => {
    expect(parseRunLevel(true, "qualquer")).toEqual({ ok: true, value: null })
    expect(parseRunLevel(false, " 4 ")).toEqual({ ok: true, value: 4 })
  })

  it("recusa vazio, fração, zero e acima do teto", () => {
    for (const raw of ["", "2.5", "0", "101", "abc"]) expect(parseRunLevel(false, raw).ok).toBe(false)
  })

  it("descreve o limite na lista de cursos", () => {
    expect(runLevelLabel(null)).toBe(`Executar no nível ${RUN_BUTTON_MIN_LEVEL} (padrão)`)
    expect(runLevelLabel(1)).toBe("Executar sempre liberado")
    expect(runLevelLabel(4)).toBe("Executar no nível 4")
  })
})

describe("RunLevelModal", () => {
  it("abre no padrão quando o curso não tem limite e salva o nível digitado", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<RunLevelModal course={COURSE} onClose={vi.fn()} onSave={onSave} />)
    const field = screen.getByLabelText("Nível que libera o Executar")
    expect(field).toBeDisabled()
    await userEvent.click(screen.getByRole("checkbox", { name: /Usar o padrão da plataforma/ }))
    await userEvent.clear(field)
    await userEvent.type(field, "4")
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    expect(onSave).toHaveBeenCalledWith(4)
  })

  it("voltar ao padrão salva null", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<RunLevelModal course={{ ...COURSE, run_button_min_level: 4 }} onClose={vi.fn()} onSave={onSave} />)
    expect(screen.getByLabelText("Nível que libera o Executar")).toHaveValue(4)
    await userEvent.click(screen.getByRole("checkbox", { name: /Usar o padrão da plataforma/ }))
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    expect(onSave).toHaveBeenCalledWith(null)
  })

  it("nível inválido mostra o erro e não salva", async () => {
    const onSave = vi.fn()
    render(<RunLevelModal course={{ ...COURSE, run_button_min_level: 4 }} onClose={vi.fn()} onSave={onSave} />)
    const field = screen.getByLabelText("Nível que libera o Executar")
    await userEvent.clear(field)
    await userEvent.type(field, "0")
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    expect(screen.getByRole("alert")).toHaveTextContent("Informe um nível inteiro de 1 a 100.")
    expect(onSave).not.toHaveBeenCalled()
  })
})
