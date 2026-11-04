import { act, renderHook, waitFor, type RenderHookResult } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Profile } from "@levelusp/contracts"
import * as api from "@/lib/api"
import { ApiError } from "@/lib/api"
import { AuthProvider, useAuth, type AuthContextValue } from "./auth-context"
import type * as LibApi from "@/lib/api"

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof LibApi>()),
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

function renderAuth(): RenderHookResult<AuthContextValue, unknown> {
  return renderHook(() => useAuth(), { wrapper: AuthProvider })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("AuthProvider", () => {
  it("carrega a sessão atual a partir do cookie (GET /auth/me)", async () => {
    fetchSession.mockResolvedValue({ user: profile })
    const { result } = renderAuth()
    expect(result.current.isLoading).toBe(true)
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.user).toEqual({ id: profile.id, email: "ana@usp.br" })
    expect(result.current.profile?.full_name).toBe("Ana Souza")
  })

  it("trata ausência de sessão como deslogado", async () => {
    fetchSession.mockResolvedValue(null)
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.user).toBeNull()
  })

  it("trata falha ao ler a sessão como deslogado", async () => {
    fetchSession.mockRejectedValue(new ApiError(0, "NETWORK", "Sem conexão."))
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.user).toBeNull()
  })

  it("login com sucesso define o perfil e devolve a sequência diária", async () => {
    fetchSession.mockResolvedValue(null)
    const streak = { streak: 4, increased: true, reset: false }
    signIn.mockResolvedValue({ user: profile, streak })
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    let signInResult: Awaited<ReturnType<typeof result.current.signIn>> | undefined
    await act(async () => {
      signInResult = await result.current.signIn(" ana@usp.br ", "segredo123456")
    })

    expect(signIn).toHaveBeenCalledWith({ email: "ana@usp.br", password: "segredo123456" })
    expect(signInResult).toEqual({ ok: true, streak })
    expect(result.current.user?.id).toBe(profile.id)
  })

  it("login com erro devolve a mensagem da API e mantém deslogado", async () => {
    fetchSession.mockResolvedValue(null)
    signIn.mockRejectedValue(new ApiError(401, "INVALID_CREDENTIALS", "E-mail ou senha incorretos."))
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    let signInResult: Awaited<ReturnType<typeof result.current.signIn>> | undefined
    await act(async () => {
      signInResult = await result.current.signIn("ana@usp.br", "errada")
    })

    expect(signInResult).toEqual({ ok: false, error: "E-mail ou senha incorretos." })
    expect(result.current.user).toBeNull()
  })

  it("logout chama a API e limpa o estado, mesmo se a API falhar", async () => {
    fetchSession.mockResolvedValue({ user: profile })
    signOut.mockRejectedValue(new ApiError(401, "UNAUTHENTICATED", "Sessão expirada."))
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.user?.id).toBe(profile.id))

    await act(async () => {
      await result.current.signOut()
    })

    expect(signOut).toHaveBeenCalledTimes(1)
    expect(result.current.user).toBeNull()
  })

  it("useAuth fora do provider lança erro claro", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    expect(() => renderHook(() => useAuth())).toThrow("useAuth deve ser usado dentro de AuthProvider")
    consoleError.mockRestore()
  })
})
