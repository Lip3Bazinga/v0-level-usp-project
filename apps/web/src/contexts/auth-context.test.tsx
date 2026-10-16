import { act, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Profile } from "@levelusp/contracts"
import * as api from "@/lib/api"
import { ApiError } from "@/lib/api/client"
import { AuthProvider, useAuth } from "./auth-context"

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  fetchSession: vi.fn(),
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
}))

const fetchSession = vi.mocked(api.fetchSession)
const signIn = vi.mocked(api.signIn)
const signOut = vi.mocked(api.signOut)

const profile: Profile = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "ana@usp.br",
  full_name: "Ana Souza",
  username: "ana",
  avatar_url: null,
  bio: null,
  role: "student",
  level: 2,
  total_xp: 1500,
  current_streak: 3,
  max_streak: 5,
  courses_completed: 0,
  lessons_completed: 4,
  last_login_date: null,
  suspended: false,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
}

/** Expõe o contexto para o teste interagir com ele. */
let ctx: ReturnType<typeof useAuth>
function Probe() {
  ctx = useAuth()
  return (
    <div>
      <span data-testid="loading">{String(ctx.isLoading)}</span>
      <span data-testid="user">{ctx.user ? `${ctx.user.id}|${ctx.user.email}` : "anon"}</span>
      <span data-testid="name">{ctx.profile?.full_name ?? ""}</span>
    </div>
  )
}

function renderWithProvider() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("AuthProvider", () => {
  it("carrega a sessão atual a partir do cookie (GET /auth/me)", async () => {
    fetchSession.mockResolvedValue({ user: profile })
    renderWithProvider()
    expect(screen.getByTestId("loading")).toHaveTextContent("true")
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"))
    expect(screen.getByTestId("user")).toHaveTextContent(`${profile.id}|ana@usp.br`)
    expect(screen.getByTestId("name")).toHaveTextContent("Ana Souza")
  })

  it("trata ausência de sessão como deslogado", async () => {
    fetchSession.mockResolvedValue(null)
    renderWithProvider()
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"))
    expect(screen.getByTestId("user")).toHaveTextContent("anon")
  })

  it("login com sucesso define o perfil e devolve a sequência diária", async () => {
    fetchSession.mockResolvedValue(null)
    signIn.mockResolvedValue({ user: profile, streak: { streak: 4, increased: true, reset: false } })
    renderWithProvider()
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"))

    let result: Awaited<ReturnType<typeof ctx.signIn>> | undefined
    await act(async () => {
      result = await ctx.signIn(" ana@usp.br ", "segredo123456")
    })

    expect(signIn).toHaveBeenCalledWith({ email: "ana@usp.br", password: "segredo123456" })
    expect(result).toEqual({ error: null, streakResult: { streakUpdated: true, newStreak: 4 } })
    expect(screen.getByTestId("user")).toHaveTextContent(profile.id)
  })

  it("login com erro devolve a mensagem da API e mantém deslogado", async () => {
    fetchSession.mockResolvedValue(null)
    signIn.mockRejectedValue(new ApiError(401, "INVALID_CREDENTIALS", "E-mail ou senha incorretos."))
    renderWithProvider()
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"))

    let result: Awaited<ReturnType<typeof ctx.signIn>> | undefined
    await act(async () => {
      result = await ctx.signIn("ana@usp.br", "errada")
    })

    expect(result).toEqual({ error: "E-mail ou senha incorretos." })
    expect(screen.getByTestId("user")).toHaveTextContent("anon")
  })

  it("logout chama a API e limpa o estado, mesmo se a API falhar", async () => {
    fetchSession.mockResolvedValue({ user: profile })
    signOut.mockRejectedValue(new ApiError(401, "UNAUTHENTICATED", "Sessão expirada."))
    renderWithProvider()
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent(profile.id))

    await act(async () => {
      await ctx.signOut()
    })

    expect(signOut).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId("user")).toHaveTextContent("anon")
  })

  it("useAuth fora do provider lança erro claro", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    expect(() => render(<Probe />)).toThrow("useAuth deve ser usado dentro de AuthProvider")
    spy.mockRestore()
  })
})
