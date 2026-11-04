import { afterEach, describe, expect, it, vi, type Mock } from "vitest"
import { api, ApiError, getErrorMessage, HTTP_STATUS, isApiError, nullOnStatus, toApiResult } from "./client"

type FetchMock = Mock<typeof fetch>

function mockFetch(status: number, body?: unknown): FetchMock {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
    new Response(body === undefined ? null : JSON.stringify(body), { status }),
  )
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

interface RecordedCall {
  url: Parameters<typeof fetch>[0] | undefined
  headers: Headers
  init: RequestInit | undefined
}

function lastCall(fetchMock: FetchMock): RecordedCall {
  const [url, init] = fetchMock.mock.lastCall ?? []
  return { url, headers: new Headers(init?.headers), init }
}

afterEach(() => vi.unstubAllGlobals())

describe("cliente da API", () => {
  it("usa caminho relativo /api e envia o cabeçalho anti-CSRF em mutações", async () => {
    const fetchMock = mockFetch(200, { ok: true })
    await api.post("/auth/sign-in", { email: "a@b.c" })
    const { url, headers, init } = lastCall(fetchMock)
    expect(url).toBe("/api/auth/sign-in")
    expect(headers.get("x-levelusp-csrf")).toBe("1")
    expect(init?.credentials).toBe("same-origin")
  })

  it("não envia o cabeçalho anti-CSRF em GET e ignora parâmetros vazios", async () => {
    const fetchMock = mockFetch(200, [])
    await api.get("/courses", { query: { limit: 5, skip: undefined } })
    const { url, headers } = lastCall(fetchMock)
    expect(url).toBe("/api/courses?limit=5")
    expect(headers.get("x-levelusp-csrf")).toBeNull()
  })

  it("converte erros da API em ApiError com a mensagem do servidor", async () => {
    mockFetch(409, { statusCode: 409, code: "EMAIL_TAKEN", message: "Já existe uma conta com este e-mail." })
    const error = await api.post("/auth/sign-up", {}).catch((rejection: unknown) => rejection)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 409, code: "EMAIL_TAKEN" })
    expect(getErrorMessage(error)).toBe("Já existe uma conta com este e-mail.")
    expect(isApiError(error, HTTP_STATUS.CONFLICT)).toBe(true)
    expect(isApiError(error, HTTP_STATUS.NOT_FOUND)).toBe(false)
  })

  it("usa mensagem genérica quando o corpo de erro não é o da API", async () => {
    mockFetch(502, "Bad Gateway")
    await expect(api.get("/x")).rejects.toMatchObject({ status: 502, code: "HTTP_ERROR" })
  })

  it("trata 204 sem corpo", async () => {
    mockFetch(204)
    await expect(api.delete("/me/notes/1")).resolves.toBeUndefined()
  })

  it("nullOnStatus devolve null só para o status esperado", async () => {
    mockFetch(404, { statusCode: 404, code: "NOT_FOUND", message: "x" })
    await expect(nullOnStatus(api.get("/lessons/1"), HTTP_STATUS.NOT_FOUND)).resolves.toBeNull()
    mockFetch(500, { statusCode: 500, code: "INTERNAL", message: "x" })
    await expect(nullOnStatus(api.get("/lessons/1"), HTTP_STATUS.NOT_FOUND)).rejects.toBeInstanceOf(ApiError)
  })

  it("falha de rede vira ApiError NETWORK", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")))
    await expect(api.get("/x")).rejects.toMatchObject({ code: "NETWORK", status: HTTP_STATUS.NETWORK_ERROR })
  })

  it("toApiResult transforma o erro em dado", async () => {
    mockFetch(403, { statusCode: 403, code: "FORBIDDEN", message: "Sem permissão." })
    const result = await toApiResult(api.get("/admin/users"))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatchObject({ status: 403, message: "Sem permissão." })
  })
})
