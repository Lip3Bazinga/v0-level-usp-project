import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { RunToolbar } from "./run-toolbar"

const LOCK_MESSAGE = "Executar libera no nível 10; até lá, use o terminal: python main.py"

function renderToolbar(runLockedMessage?: string | null): { onRun: ReturnType<typeof vi.fn> } {
  const onRun = vi.fn()
  render(
    <RunToolbar title="Complete as lacunas" isRunning={false} isTracing={false} onRun={onRun} onStop={vi.fn()} onVisualize={vi.fn()} onReset={vi.fn()} runLockedMessage={runLockedMessage} />,
  )
  return { onRun }
}

describe("RunToolbar", () => {
  it("liberado: o Executar chama onRun e não há aviso", async () => {
    const { onRun } = renderToolbar(null)
    await userEvent.click(screen.getByRole("button", { name: "Executar" }))
    expect(onRun).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole("note")).toBeNull()
  })

  it("bloqueado: o Executar fica desabilitado, descrito pelo motivo, e os outros botões seguem ativos", async () => {
    const { onRun } = renderToolbar(LOCK_MESSAGE)
    const run = screen.getByRole("button", { name: "Executar" })
    expect(run).toBeDisabled()
    expect(run).toHaveAccessibleDescription(LOCK_MESSAGE)
    expect(screen.getByRole("note")).toHaveTextContent(LOCK_MESSAGE)
    await userEvent.click(run)
    expect(onRun).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: "Visualizar" })).toBeEnabled()
    expect(screen.getByRole("button", { name: "Recomeçar" })).toBeEnabled()
  })
})
