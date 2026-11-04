import { describe, expect, it } from "vitest"
import { buildServer, type RunnerReadiness } from "../src/server"
import type { JobExecutor } from "../src/executor"

const noopExecutor: JobExecutor = { execute: () => Promise.reject(new Error("não usado")) }
const noopLog = (): void => undefined

async function healthz(readiness: RunnerReadiness | undefined): Promise<{ status: number; body: string }> {
  const server = buildServer({ executor: noopExecutor, token: "t".repeat(24), log: noopLog, ...(readiness ? { readiness } : {}) })
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const address = server.address()
  const port = typeof address === "object" && address ? address.port : 0
  try {
    const response = await fetch(`http://127.0.0.1:${port}/healthz`)
    return { status: response.status, body: await response.text() }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}

describe("/healthz e o autoteste do sandbox", () => {
  it("responde 503 com o motivo enquanto o autoteste não passou", async () => {
    const result = await healthz({ ready: false, reason: "módulo incompatível com a CPU" })
    expect(result.status).toBe(503)
    expect(result.body).toContain("módulo incompatível com a CPU")
  })

  it("responde 200 depois do autoteste aprovado e sem autoteste configurado", async () => {
    expect((await healthz({ ready: true, reason: "" })).status).toBe(200)
    expect((await healthz(undefined)).status).toBe(200)
  })
})
