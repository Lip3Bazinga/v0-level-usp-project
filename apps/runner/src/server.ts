import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http"
import { timingSafeEqual } from "node:crypto"
import { runnerJobSchema } from "@levelusp/contracts"
import type { Executor } from "./executor.js"
import { QueueFullError } from "./semaphore.js"

const MAX_BODY = 1_000_000

export interface ServerDeps {
  executor: Executor
  token: string
  log: (level: "info" | "warn" | "error", msg: string, extra?: Record<string, unknown>) => void
}

/** HTTP mínimo (sem framework): menos superfície num serviço que roda código não confiável. */
export function buildServer({ executor, token, log }: ServerDeps): Server {
  const expected = Buffer.from(`Bearer ${token}`)

  return createServer(async (req, res) => {
    try {
      if (req.method === "GET" && req.url === "/healthz") return send(res, 200, { status: "ok" })
      if (req.method !== "POST" || req.url !== "/v1/run") return send(res, 404, { error: "not_found" })

      const auth = Buffer.from(req.headers.authorization ?? "")
      if (auth.length !== expected.length || !timingSafeEqual(auth, expected)) return send(res, 401, { error: "unauthorized" })

      const body = await readBody(req)
      const parsed = runnerJobSchema.safeParse(body)
      if (!parsed.success) return send(res, 400, { error: "invalid_job", issues: parsed.error.issues.slice(0, 5) })

      const result = await executor.execute(parsed.data)
      log("info", "job executado", { probes: parsed.data.probes.length, ms: result.durationMs })
      return send(res, 200, result)
    } catch (err) {
      if (err instanceof QueueFullError) return send(res, 503, { error: "busy" })
      if (err instanceof BodyTooLargeError) return send(res, 413, { error: "too_large" })
      if (err instanceof SyntaxError) return send(res, 400, { error: "invalid_json" })
      log("error", "falha no executor", { error: String(err) })
      return send(res, 500, { error: "internal" })
    }
  })
}

class BodyTooLargeError extends Error {}

async function readBody(req: IncomingMessage): Promise<unknown> {
  let size = 0
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    size += (chunk as Buffer).length
    if (size > MAX_BODY) throw new BodyTooLargeError()
    chunks.push(chunk as Buffer)
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"))
}

function send(res: ServerResponse, status: number, payload: unknown) {
  const body = JSON.stringify(payload)
  res.writeHead(status, { "content-type": "application/json", "content-length": Buffer.byteLength(body) })
  res.end(body)
}
