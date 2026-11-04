import { createServer, type Server } from "node:http"
import type { AddressInfo } from "node:net"
import { afterEach, describe, expect, it } from "vitest"
import type { RunnerJob } from "@levelusp/contracts"
import type { Env } from "@/config/env"
import { AppError } from "@/common/errors/app-error"
import { busyMessage, parseRetryAfter, RunnerClient } from "./runner.client"

const job: RunnerJob = { files: [{ path: "main.py", content: "x = 1\n" }], entry: "main.py", probes: [{ id: "p0", kind: "globals", names: ["x"] }], limits: { timeoutMs: 2_000, memoryMb: 64 } }

describe("RunnerClient: executor ocupado", () => {
  let server: Server | null = null

  afterEach(async () => {
    await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()))
    server = null
  })

  async function clientAnswering(status: number, headers: Record<string, string>, body: string): Promise<RunnerClient> {
    server = createServer((_request, response) => {
      response.writeHead(status, { "content-type": "application/json", ...headers })
      response.end(body)
    })
    await new Promise<void>((resolve) => server?.listen(0, "127.0.0.1", resolve))
    const port = (server.address() as AddressInfo).port
    return new RunnerClient({ RUNNER_URL: `http://127.0.0.1:${port}`, RUNNER_TOKEN: "t".repeat(32) } as Env)
  }

  it("repassa a espera sugerida pelo executor (Retry-After) com mensagem clara", async () => {
    const client = await clientAnswering(503, { "retry-after": "12" }, JSON.stringify({ error: "busy", retryAfterSeconds: 12 }))
    const error = await client.run(job).catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(AppError)
    expect(error).toMatchObject({ statusCode: 503, code: "RUNNER_BUSY", retryAfterSeconds: 12 })
    expect((error as AppError).message).toBe(busyMessage(12))
  })

  it("sem Retry-After (executor antigo), sugere a espera padrão", async () => {
    const client = await clientAnswering(503, {}, JSON.stringify({ error: "busy" }))
    await expect(client.run(job)).rejects.toMatchObject({ code: "RUNNER_BUSY", retryAfterSeconds: 10 })
  })

  it("interpreta o Retry-After só como segundos inteiros, com teto", () => {
    expect(parseRetryAfter("5")).toBe(5)
    expect(parseRetryAfter("999")).toBe(120)
    expect(parseRetryAfter("0")).toBe(10)
    expect(parseRetryAfter("Wed, 21 Oct 2026 07:28:00 GMT")).toBe(10)
    expect(parseRetryAfter(null)).toBe(10)
    expect(busyMessage(8)).toMatch(/8 s/)
    expect(busyMessage(8)).toMatch(/não contou/)
  })
})
