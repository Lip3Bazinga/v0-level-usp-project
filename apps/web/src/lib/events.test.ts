import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api, ApiError } from "@/lib/api"
import { FLUSH_BATCH_SIZE, FLUSH_INTERVAL_MS, flushEvents, queuedEventCount, resetEventQueue, sanitizeEventPayload, trackEvent } from "./events"

describe("fila de eventos do experimento", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    resetEventQueue()
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it("nunca leva o código do aluno no payload", () => {
    expect(sanitizeEventPayload({ lesson_id: "l1", code: "print(1)", files: [], content: "x", stdout: "1", attempts: 2 })).toEqual({ lesson_id: "l1", attempts: 2 })
  })

  it("envia em lote depois do intervalo", async () => {
    const post = vi.spyOn(api, "post").mockResolvedValue(undefined)
    trackEvent("lesson_viewed", { lesson_id: "l1" })
    trackEvent("step_completed", { step_id: "s1", code: "segredo" })
    expect(post).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS)
    expect(post).toHaveBeenCalledTimes(1)
    expect(post).toHaveBeenCalledWith("/me/events", {
      events: [
        { type: "lesson_viewed", payload: { lesson_id: "l1" } },
        { type: "step_completed", payload: { step_id: "s1" } },
      ],
    })
    expect(queuedEventCount()).toBe(0)
  })

  it("envia na hora ao juntar 20 eventos", async () => {
    const post = vi.spyOn(api, "post").mockResolvedValue(undefined)
    for (let index = 0; index < FLUSH_BATCH_SIZE; index++) trackEvent("lesson_viewed", { n: index })
    await vi.advanceTimersByTimeAsync(0)
    expect(post).toHaveBeenCalledTimes(1)
  })

  it("falha de rede devolve os eventos à fila; recusa da API descarta", async () => {
    const post = vi.spyOn(api, "post").mockRejectedValueOnce(new TypeError("rede"))
    trackEvent("login")
    await flushEvents()
    expect(queuedEventCount()).toBe(1)

    post.mockRejectedValueOnce(new ApiError(429, "RATE_LIMITED", "Muitas solicitações"))
    await flushEvents()
    expect(queuedEventCount()).toBe(0)
  })

  it("ao sair da página manda o resto com keepalive e o cabeçalho anti-CSRF", () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal("fetch", fetchMock)
    trackEvent("lesson_viewed", { lesson_id: "l9" })
    window.dispatchEvent(new Event("pagehide"))
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/me/events",
      expect.objectContaining({ method: "POST", keepalive: true, headers: expect.objectContaining({ "x-levelusp-csrf": "1" }) as unknown }),
    )
    expect(queuedEventCount()).toBe(0)
    vi.unstubAllGlobals()
  })
})
