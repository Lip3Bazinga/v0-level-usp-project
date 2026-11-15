import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { StudentShell } from "./student-shell"

let condition: "gamificada" | "controle" | null = null
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock("@/hooks/use-sign-out", () => ({ useSignOut: () => vi.fn() }))
vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    profile: { id: "u1", full_name: "Ana Lima", username: "ana", role: "student", total_xp: 1234, current_streak: 7, experiment_condition: condition },
    isLoading: false,
  }),
}))

describe("moldura do aluno e a condição experimental", () => {
  beforeEach(() => {
    condition = null
  })

  it("fora do grupo controle mostra XP, sequência, ranking e Trilhas", () => {
    render(<StudentShell screen="dashboard">conteúdo</StudentShell>)
    expect(screen.getByText("1.234 XP")).toBeInTheDocument()
    expect(screen.getByText("7")).toBeInTheDocument()
    expect(screen.getAllByRole("link", { name: /Ranking/ }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole("link", { name: /Trilhas/ })[0]).toHaveAttribute("href", "/trilhas")
  })

  it("no grupo controle some o XP, a sequência e o ranking; a navegação de estudo continua", () => {
    condition = "controle"
    render(<StudentShell screen="dashboard">conteúdo</StudentShell>)
    expect(screen.queryByText("1.234 XP")).toBeNull()
    expect(screen.queryByText("7")).toBeNull()
    expect(screen.queryByRole("link", { name: /Ranking/ })).toBeNull()
    expect(screen.getAllByRole("link", { name: /Trilhas/ }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole("link", { name: /Cursos/ }).length).toBeGreaterThan(0)
  })
})
