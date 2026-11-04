import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http"
import type { AddressInfo } from "node:net"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createAgent } from "./http"
import { Random } from "./rng"
import { runBurst, runSteadyClass, type PhaseSettings } from "./scenarios"
import type { LoadLesson } from "./seed"

const LESSON: LoadLesson = {
  id: "11111111-1111-4111-8111-111111111111",
  position: 1,
  title: "Variáveis",
  starter: [{ path: "main.py", content: "# esqueleto\n" }],
  reference: [{ path: "main.py", content: "print('ok')\n" }],
  wrong: [[{ path: "main.py", content: "print('errado')\n" }]],
  weight: 1,
}

interface FakeServerState {
  submissions: number
  /** Responde 503 RUNNER_BUSY às primeiras N submissões (simula fila cheia). */
  busyFirst: number
  csrfMissing: number
  sessionMissing: number
  forwardedFor: Set<string>
}

/** API + web falsas, só com o que os cenários usam. */
function fakeStack(state: FakeServerState): Server {
  let users = 0
  const json = (response: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}): void => {
    response.writeHead(status, { "content-type": "application/json", ...headers })
    response.end(JSON.stringify(body))
  }
  return createServer((request: IncomingMessage, response: ServerResponse) => {
    const url = new URL(request.url ?? "/", "http://fake")
    const mutating = request.method !== "GET"
    if (mutating && request.headers["x-levelusp-csrf"] !== "1") state.csrfMissing++
    const forwarded = request.headers["x-forwarded-for"]
    if (typeof forwarded === "string") state.forwardedFor.add(forwarded)
    request.resume()
    request.on("end", () => {
      if (url.pathname === "/api/auth/sign-up") {
        users++
        return json(response, 201, { user: { id: `00000000-0000-4000-8000-${String(users).padStart(12, "0")}` } }, { "set-cookie": `lvl_session=s${users}; Path=/; HttpOnly` })
      }
      if (url.pathname.startsWith("/api/") && !request.headers.cookie?.includes("lvl_session=")) state.sessionMissing++
      if (url.pathname.endsWith("/submissions")) {
        state.submissions++
        if (state.submissions <= state.busyFirst) return json(response, 503, { statusCode: 503, code: "RUNNER_BUSY", message: "ocupado" })
        return json(response, 200, { allPassed: true, durationMs: 120 })
      }
      if (url.pathname.startsWith("/api/")) return mutating ? json(response, 204, {}) : json(response, 200, [])
      response.writeHead(200, { "content-type": "text/html" })
      response.end('<html><script src="/_next/static/chunks/app.js"></script></html>')
    })
  })
}

describe("cenários contra um servidor falso", () => {
  const state: FakeServerState = { submissions: 0, busyFirst: 0, csrfMissing: 0, sessionMissing: 0, forwardedFor: new Set() }
  let server: Server
  let origin = ""

  beforeAll(async () => {
    server = fakeStack(state)
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
    origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  const settings = (): PhaseSettings => ({
    origin,
    apiOrigin: null,
    agent: createAgent(16),
    random: new Random(3),
    lessons: [LESSON],
    courseId: "22222222-2222-4222-8222-222222222222",
    accountPrefix: "teste",
    password: "Senha12345",
    ipPerStudent: true,
    downloadAssets: true,
    pyodideVersion: null,
    retry: { maxRetries: 2, minWaitSeconds: 0.01, maxWaitSeconds: 0.02 },
  })

  it("rajada: todos clicam, quem pega 503 insiste e o relatório separa preparação e medição", async () => {
    state.submissions = 0
    state.busyFirst = 2
    const result = await runBurst({ ...settings(), students: 4, lesson: LESSON, windowSeconds: 0.05, waves: 1, pauseSeconds: 0, setupConcurrency: 2 })
    expect(result.verifications).toHaveLength(4)
    expect(result.verifications.every((outcome) => outcome.status === 200)).toBe(true)
    expect(result.verifications.reduce((sum, outcome) => sum + outcome.retries, 0)).toBe(2)
    const endpoints = result.metrics.byEndpoint().map((endpoint) => endpoint.endpoint)
    expect(endpoints).toContain("POST /api/lessons/:id/submissions (Verificar)")
    expect(endpoints).not.toContain("POST /api/auth/sign-up")
    expect(result.preparation.byEndpoint().map((endpoint) => endpoint.endpoint)).toEqual(expect.arrayContaining(["POST /api/auth/sign-up", "GET /_next/static/*", "GET /lesson/{lesson} (HTML)"]))
    expect(result.waveMakespans).toHaveLength(1)
    expect(state.csrfMissing).toBe(0)
    expect(state.sessionMissing).toBe(0)
    expect(state.forwardedFor.size).toBe(4)
  })

  it("turma: a sessão percorre telas, autosave e Verificar e termina no prazo", async () => {
    state.busyFirst = 0
    const startedAt = performance.now()
    const result = await runSteadyClass({ ...settings(), students: 3, simulatedMinutes: 30, compression: 600, rampSeconds: 0.1 })
    expect(performance.now() - startedAt).toBeLessThan(10_000)
    expect(result.failedLogins).toBe(0)
    expect(result.verifications.length).toBeGreaterThan(0)
    const endpoints = result.metrics.byEndpoint().map((endpoint) => endpoint.endpoint)
    expect(endpoints).toEqual(expect.arrayContaining(["PUT /api/lessons/:id/snapshot", "GET /dashboard (HTML)", "GET /api/auth/me", "POST /api/courses/:id/enrollment"]))
  })
})
