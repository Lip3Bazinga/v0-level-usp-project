import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { ConsoleTerminalTabs } from "./console-terminal-tabs"

const mounted = vi.hoisted(() => ({ count: 0 }))

// O painel real (xterm.js + Pyodide) é testado em terminal-panel.test.tsx.
vi.mock("next/dynamic", () => ({
  default: () =>
    function FakeTerminalPanel(props: { files: readonly { path: string }[] }): React.JSX.Element {
      mounted.count += 1
      return <div data-testid="terminal-panel">Terminal com {props.files.length} arquivo(s)</div>
    },
}))

const FILES = [{ path: "main.py", content: "" }]

describe("ConsoleTerminalTabs", () => {
  it("abre no Console e só monta o terminal quando a aba é aberta", async () => {
    mounted.count = 0
    render(<ConsoleTerminalTabs files={FILES} console={<p>saída do console</p>} />)
    expect(screen.getByRole("tab", { name: "Console" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByText("saída do console")).toBeVisible()
    expect(screen.queryByTestId("terminal-panel")).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole("tab", { name: "Terminal" }))
    expect(screen.getByTestId("terminal-panel")).toBeVisible()
    expect(screen.getByRole("tab", { name: "Terminal" })).toHaveAttribute("aria-selected", "true")
  })

  it("mantém o console e o terminal montados ao alternar (sem perder histórico)", async () => {
    render(<ConsoleTerminalTabs files={FILES} console={<p>saída do console</p>} />)
    await userEvent.click(screen.getByRole("tab", { name: "Terminal" }))
    await userEvent.click(screen.getByRole("tab", { name: "Console" }))
    expect(screen.getByText("saída do console")).toBeVisible()
    expect(screen.getByTestId("terminal-panel")).not.toBeVisible()
  })

  it("troca de aba com as setas e leva o foco junto", async () => {
    render(<ConsoleTerminalTabs files={FILES} console={<p>x</p>} />)
    screen.getByRole("tab", { name: "Console" }).focus()
    await userEvent.keyboard("{ArrowRight}")
    expect(screen.getByRole("tab", { name: "Terminal" })).toHaveFocus()
    expect(screen.getByRole("tab", { name: "Terminal" })).toHaveAttribute("aria-selected", "true")
    await userEvent.keyboard("{ArrowLeft}")
    expect(screen.getByRole("tab", { name: "Console" })).toHaveFocus()
  })

  it("liga cada aba ao seu painel (aria-controls / aria-labelledby)", () => {
    render(<ConsoleTerminalTabs files={FILES} console={<p>x</p>} />)
    const tab = screen.getByRole("tab", { name: "Console" })
    const panel = screen.getByRole("tabpanel", { name: "Console" })
    expect(tab.getAttribute("aria-controls")).toBe(panel.id)
  })

  it("com o terminal preferido, abre direto no Terminal", () => {
    render(<ConsoleTerminalTabs files={FILES} console={<p>saída do console</p>} isTerminalPreferred />)
    expect(screen.getByRole("tab", { name: "Terminal" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByTestId("terminal-panel")).toBeVisible()
    expect(screen.getByText("saída do console")).not.toBeVisible()
  })

  it("passa para o Terminal quando ele vira o preferido e não volta sozinho ao Console", () => {
    const view = render(<ConsoleTerminalTabs files={FILES} console={<p>x</p>} />)
    expect(screen.getByRole("tab", { name: "Console" })).toHaveAttribute("aria-selected", "true")
    view.rerender(<ConsoleTerminalTabs files={FILES} console={<p>x</p>} isTerminalPreferred />)
    expect(screen.getByRole("tab", { name: "Terminal" })).toHaveAttribute("aria-selected", "true")
    view.rerender(<ConsoleTerminalTabs files={FILES} console={<p>x</p>} />)
    expect(screen.getByRole("tab", { name: "Terminal" })).toHaveAttribute("aria-selected", "true")
  })
})
