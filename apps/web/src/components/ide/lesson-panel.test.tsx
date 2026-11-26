import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { LessonPanel } from "./lesson-panel"

const base = { moduleName: "M", title: "T", content: "Conteúdo", onVerify: vi.fn() }

describe("LessonPanel — botão Verificar", () => {
  it("lição sem checkpoints não aparece como verificada antes da correção", () => {
    render(<LessonPanel {...base} checkpoints={[]} canVerify={false} isVerified={false} />)
    const btn = screen.getByRole("button", { name: /Verificar Resposta/ })
    expect(btn).toBeDisabled()
    expect(screen.queryByText(/Resposta Verificada/)).toBeNull()
  })

  it("habilita depois de executar sem erros", () => {
    render(<LessonPanel {...base} checkpoints={[]} canVerify isVerified={false} />)
    expect(screen.getByRole("button", { name: /Verificar Resposta/ })).toBeEnabled()
  })

  it("mostra verificada quando o servidor aprovou", () => {
    render(<LessonPanel {...base} checkpoints={[]} canVerify isVerified />)
    expect(screen.getByRole("button", { name: /Resposta Verificada/ })).toBeInTheDocument()
  })
})

describe("LessonPanel — Executar bloqueado", () => {
  it("troca a orientação do Executar pelo motivo do bloqueio", () => {
    const message = "Executar libera no nível 10; até lá, use o terminal: python main.py"
    render(<LessonPanel {...base} checkpoints={[]} canVerify isVerified={false} runLockedMessage={message} />)
    expect(screen.getByText(message)).toBeInTheDocument()
    expect(screen.queryByText(/pressione Ctrl\+Enter/)).toBeNull()
  })
})
