import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http"
import { timingSafeEqual } from "node:crypto"
import { runnerJobSchema } from "@levelusp/contracts"
import type { JobExecutor } from "./executor.js"
import type { Logger } from "./logger.js"
import { CancelledError, QueueFullError } from "./semaphore.js"
import type { RunnerStats } from "./stats.js"

const MAX_BODY_BYTES = 1_000_000
/** Só as primeiras falhas de validação: o suficiente para depurar a API. */
const MAX_REPORTED_ISSUES = 5

/** Dependências do servidor HTTP: o executor, o token esperado da API, o log e (opcional) os contadores. */
export interface ServerDeps {
  executor: JobExecutor
  token: string
  log: Logger
  /** Contadores servidos em `GET /v1/stats` (mesmo token da API); sem eles a rota responde 404. */
  stats?: RunnerStats
  /** Resultado do autoteste da partida; sem ele `/healthz` responde sempre ok. */
  readiness?: RunnerReadiness
}

/** Estado do autoteste do sandbox: enquanto `ready` for falso, `/healthz` responde 503 com o motivo. */
export interface RunnerReadiness {
  ready: boolean
  reason: string
}

class BodyTooLargeError extends Error {}

/** HTTP mínimo (sem framework): menos superfície num serviço que roda código não confiável. */
export function buildServer({ executor, token, log, stats, readiness }: ServerDeps): Server {
  const expectedAuthorization = Buffer.from(`Bearer ${token}`)

  const isAuthorized = (request: IncomingMessage): boolean => {
    const authorization = Buffer.from(request.headers.authorization ?? "")
    return authorization.length === expectedAuthorization.length && timingSafeEqual(authorization, expectedAuthorization)
  }

  const runJob = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    const parsed = runnerJobSchema.safeParse(await readJsonBody(request))
    if (!parsed.success) return sendJson(response, 400, { error: "invalid_job", issues: parsed.error.issues.slice(0, MAX_REPORTED_ISSUES) })

    // Cliente (API) desistiu, ex.: por timeout: não executa lotes ainda na fila.
    const abort = new AbortController()
    response.on("close", () => {
      if (!response.writableFinished) abort.abort()
    })
    const result = await executor.execute(parsed.data, abort.signal)
    log("info", "job executado", { probes: parsed.data.probes.length, ms: result.durationMs })
    return sendJson(response, 200, result)
  }

  // Toda falha vira resposta HTTP dentro do try/catch: a promessa nunca rejeita.
  const handleRequest = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    try {
      if (request.method === "GET" && request.url === "/healthz") {
        if (readiness && !readiness.ready) return sendJson(response, 503, { status: "unavailable", reason: readiness.reason })
        return sendJson(response, 200, { status: "ok" })
      }
      if (request.method === "GET" && request.url === "/v1/stats" && stats) {
        if (!isAuthorized(request)) return sendJson(response, 401, { error: "unauthorized" })
        return sendJson(response, 200, stats.snapshot())
      }
      if (request.method !== "POST" || request.url !== "/v1/run") return sendJson(response, 404, { error: "not_found" })
      if (!isAuthorized(request)) return sendJson(response, 401, { error: "unauthorized" })
      return await runJob(request, response)
    } catch (error) {
      if (error instanceof QueueFullError) {
        stats?.recordRejected()
        const retryAfterSeconds = error.retryAfterSeconds
        if (retryAfterSeconds === undefined) return sendJson(response, 503, { error: "busy" })
        return sendJson(response, 503, { error: "busy", retryAfterSeconds }, { "retry-after": String(retryAfterSeconds) })
      }
      if (error instanceof CancelledError) {
        stats?.recordCancelled()
        return void response.destroy()
      }
      if (error instanceof BodyTooLargeError) return sendJson(response, 413, { error: "too_large" })
      if (error instanceof SyntaxError) return sendJson(response, 400, { error: "invalid_json" })
      stats?.recordFailed()
      log("error", "falha no executor", { error: String(error) })
      return sendJson(response, 500, { error: "internal" })
    }
  }

  return createServer((request, response) => void handleRequest(request, response))
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  let size = 0
  const chunks: Buffer[] = []
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk))
    size += buffer.length
    if (size > MAX_BODY_BYTES) throw new BodyTooLargeError()
    chunks.push(buffer)
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"))
}

function sendJson(response: ServerResponse, status: number, payload: unknown, headers: Record<string, string> = {}): void {
  const body = JSON.stringify(payload)
  response.writeHead(status, { ...headers, "content-type": "application/json", "content-length": Buffer.byteLength(body) })
  response.end(body)
}
