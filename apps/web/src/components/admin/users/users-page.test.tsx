import { useState } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { Profile } from "@levelusp/contracts"
import { ApiError, setUserSuspended, updateUserProfile, updateUserRole } from "@/lib/api"
import { UsersPageEnhanced } from "./users-page"

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  updateUserRole: vi.fn(),
  setUserSuspended: vi.fn(),
  updateUserProfile: vi.fn(),
  deleteUser: vi.fn(),
  inviteUser: vi.fn(),
}))

function profile(over: Partial<Profile>): Profile {
  return {
    id: "u", email: "u@usp.br", full_name: "Usuário", username: "usuario", avatar_url: null, bio: null, role: "student",
    level: 1, total_xp: 0, current_streak: 0, max_streak: 0, courses_completed: 0, lessons_completed: 0,
    last_login_date: null, suspended: false, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
    ...over,
  }
}

const ANA = profile({ id: "ana", full_name: "Ana Souza", email: "ana@usp.br", username: "ana", total_xp: 900 })
const BETO = profile({ id: "beto", full_name: "Beto Lima", email: "beto@usp.br", username: "beto", total_xp: 300 })
const ADMIN = profile({ id: "adm", full_name: "Admin Root", email: "adm@usp.br", username: "adm", role: "admin", total_xp: 10 })

function Harness({ onToast }: { onToast: (msg: string, kind?: string) => void }) {
  const [users, setUsers] = useState<Profile[]>([ANA, BETO, ADMIN])
  return <UsersPageEnhanced users={users} setUsers={setUsers} onToast={onToast} currentUserId="adm" />
}

const rowOf = (name: string) => screen.getByText(name).closest("tr")!

describe("UsersPageEnhanced (admin)", () => {
  beforeEach(() => vi.clearAllMocks())

  it("lista os usuários com papel e filtra pela busca", async () => {
    const user = userEvent.setup()
    render(<Harness onToast={vi.fn()} />)

    expect(screen.getByText("Ana Souza")).toBeInTheDocument()
    expect(screen.getByText("Beto Lima")).toBeInTheDocument()
    expect(within(rowOf("Admin Root")).getByText("Admin")).toBeInTheDocument()
    expect(screen.getByText("3 de 3 usuários")).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText(/Buscar por nome/), "beto")
    expect(screen.queryByText("Ana Souza")).not.toBeInTheDocument()
    expect(screen.getByText("1 de 3 usuários")).toBeInTheDocument()
  })

  it("altera o papel em massa com updateUserRole e usa o perfil devolvido pela API", async () => {
    const user = userEvent.setup()
    const onToast = vi.fn()
    vi.mocked(updateUserRole).mockImplementation(async (id, role) => ({ ...[ANA, BETO].find((u) => u.id === id)!, role }))
    render(<Harness onToast={onToast} />)

    await user.click(screen.getByLabelText("Selecionar Ana Souza"))
    await user.click(screen.getByLabelText("Selecionar Beto Lima"))
    await user.click(screen.getByRole("button", { name: /Alterar role/ }))
    await user.click(screen.getByRole("button", { name: /Professor Criar e editar lições/ }))

    expect(updateUserRole).toHaveBeenCalledTimes(2)
    expect(updateUserRole).toHaveBeenCalledWith("ana", "teacher")
    expect(updateUserRole).toHaveBeenCalledWith("beto", "teacher")
    expect(within(rowOf("Ana Souza")).getByText("Professor")).toBeInTheDocument()
    expect(onToast).toHaveBeenCalledWith("2 usuário(s) agora com papel de professor", "success")
  })

  it("suspende em massa com setUserSuspended, ignorando a própria conta", async () => {
    const user = userEvent.setup()
    const onToast = vi.fn()
    vi.mocked(setUserSuspended).mockImplementation(async (id, suspended) => ({ ...BETO, id, suspended }))
    render(<Harness onToast={onToast} />)

    await user.click(screen.getByLabelText("Selecionar Beto Lima"))
    await user.click(screen.getByLabelText("Selecionar Admin Root"))
    await user.click(screen.getByRole("button", { name: /Suspender/ }))

    expect(setUserSuspended).toHaveBeenCalledTimes(1)
    expect(setUserSuspended).toHaveBeenCalledWith("beto", true)
    expect(within(rowOf("Beto Lima")).getByText("suspenso")).toBeInTheDocument()
    expect(onToast).toHaveBeenCalledWith("Sua própria conta foi ignorada na ação em massa", "info")
    expect(onToast).toHaveBeenCalledWith("1 usuário(s) suspenso(s)", "warning")
  })

  it("mostra a mensagem da API quando a ação é recusada (403)", async () => {
    const user = userEvent.setup()
    const onToast = vi.fn()
    vi.mocked(setUserSuspended).mockRejectedValue(new ApiError(403, "FORBIDDEN", "Acesso restrito a administradores."))
    render(<Harness onToast={onToast} />)

    await user.click(screen.getByLabelText("Selecionar Ana Souza"))
    await user.click(screen.getByRole("button", { name: /Suspender/ }))

    expect(onToast).toHaveBeenCalledWith("1 não suspenso(s): Acesso restrito a administradores.", "danger")
    expect(within(rowOf("Ana Souza")).queryByText("suspenso")).not.toBeInTheDocument()
  })

  it("edita o usuário enviando só os campos alterados", async () => {
    const user = userEvent.setup()
    const onToast = vi.fn()
    vi.mocked(updateUserProfile).mockImplementation(async (id, patch) => ({ ...ANA, ...patch, bio: patch.bio ?? null }))
    render(<Harness onToast={onToast} />)

    await user.click(within(rowOf("Ana Souza")).getByTitle("Editar"))
    const dialog = screen.getByRole("dialog", { name: "Editar Ana Souza" })
    const name = within(dialog).getByLabelText("Nome completo")
    await user.clear(name)
    await user.type(name, "Ana S. Souza")
    await user.click(within(dialog).getByRole("button", { name: "Professor" }))
    await user.click(within(dialog).getByRole("button", { name: "Salvar alterações" }))

    expect(updateUserProfile).toHaveBeenCalledWith("ana", { full_name: "Ana S. Souza", role: "teacher" })
    expect(screen.getByText("Ana S. Souza")).toBeInTheDocument()
    expect(onToast).toHaveBeenCalledWith("Usuário atualizado", "success")
  })
})
