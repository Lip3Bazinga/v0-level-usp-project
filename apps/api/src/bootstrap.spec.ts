import { createServer } from "node:http"
import { describe, expect, it } from "vitest"
import { configureHttpServer, HEADERS_TIMEOUT_MS, KEEP_ALIVE_TIMEOUT_MS } from "./bootstrap"

/** Tempo ocioso do agente keep-alive padrão do Node (usado pelo proxy do Next). */
const NODE_AGENT_IDLE_MS = 5_000

describe("configureHttpServer", () => {
  it("mantém conexões ociosas mais tempo que o proxy (quem fecha primeiro é o cliente)", () => {
    const server = createServer()
    configureHttpServer(server)
    expect(server.keepAliveTimeout).toBe(KEEP_ALIVE_TIMEOUT_MS)
    expect(server.keepAliveTimeout).toBeGreaterThan(NODE_AGENT_IDLE_MS)
    expect(server.headersTimeout).toBe(HEADERS_TIMEOUT_MS)
    expect(server.headersTimeout).toBeGreaterThan(server.keepAliveTimeout)
  })
})
