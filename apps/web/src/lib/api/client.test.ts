import { afterEach, describe, expect, it, vi } from "vitest"
import { api, ApiError, errorMessage, getOrNull } from "./client"

function mockFetch(status: number, body?: unknown) {
  const fn = vi.fn().mockResolvedValue(new Response(body === undefined ? null : JSON.stringify(body), { status }))
  vi.stubGlobal("fetch", fn)
  return fn
}

afterEach(() => vi.unstubAllGlobals())

describe("cliente da API", () => {
  it("usa caminho relativo /api e envia o cabeçalho anti-CSRF em mutações", async () => {
    const fetchMock = mockFetch(200, { ok: true })
    await api.post("/auth/sign-in", { email: "a@b.c" })
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe("/api/auth/sign-in")
    expect(init.headers["x-levelusp-csrf"]).toBe("1")
    expect(init.credentials).toBe("same-origin")
  })

  it("não envia o cabeçalho anti-CSRF em GET", async () => {
    const fetchMock = mockFetch(200, [])
    await api.get("/courses", { query: { limit: 5, skip: undefined } })
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe("/api/courses?limit=5")
    expect(init.headers["x-levelusp-csrf"]).toBeUndefined()
  })

  it("converte erros da API em ApiError com a mensagem do servidor", async () => {
    mockFetch(409, { statusCode: 409, code: "EMAIL_TAKEN", message: "Já existe uma conta com este e-mail." })
    const err = await api.post("/auth/sign-up", {}).catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({ status: 409, code: "EMAIL_TAKEN" })
    expect(errorMessage(err)).toBe("Já existe uma conta com este e-mail.")
  })

  it("trata 204 sem corpo", async () => {
    mockFetch(204)
    await expect(api.delete("/me/notes/1")).resolves.toBeUndefined()
  })

  it("getOrNull devolve null em 404", async () => {
    mockFetch(404, { statusCode: 404, code: "NOT_FOUND", message: "x" })
    await expect(getOrNull("/lessons/1")).resolves.toBeNull()
  })

  it("falha de rede vira ApiError NETWORK", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")))
    await expect(api.get("/x")).rejects.toMatchObject({ code: "NETWORK", status: 0 })
  })
})
