import { brotliDecompressSync, gunzipSync, inflateSync } from "node:zlib"
import { Agent, request } from "undici"
import { endpointLabel, type MetricsRecorder } from "./metrics"

/** Tempo máximo de uma requisição (o Verificar pode esperar a fila do executor). */
const REQUEST_TIMEOUT_MS = 120_000
const CSRF_HEADER = "x-levelusp-csrf"
const SESSION_COOKIE = "lvl_session"
const MUTATING_METHODS: ReadonlySet<string> = new Set(["POST", "PUT", "PATCH", "DELETE"])

/** Pool de conexões compartilhado pelos alunos virtuais (keep-alive, como o navegador). */
export function createAgent(connections: number): Agent {
  return new Agent({ connections, keepAliveTimeout: 10_000, headersTimeout: REQUEST_TIMEOUT_MS, bodyTimeout: REQUEST_TIMEOUT_MS })
}

/** Resposta lida: status, corpo decodificado (só quando pedido) e código de erro da API. */
export interface HttpResult<T> {
  status: number
  ms: number
  /** Corpo JSON, quando `json: true` e a resposta é JSON; senão `null`. */
  body: T | null
  /** Corpo como texto, quando `text: true`; senão `null`. */
  text: string | null
  /** `code` do erro da API (`RUNNER_BUSY`, `RATE_LIMITED`…). */
  code?: string
  /** Espera sugerida pelo servidor (`Retry-After`, em segundos), quando veio. */
  retryAfterSeconds?: number
  /** Bytes recebidos no fio (comprimidos, se o servidor comprimiu). */
  bytes: number
}

/** Opções de uma requisição. */
export interface RequestOptions {
  body?: unknown
  /** Lê e decodifica o corpo como JSON (senão o corpo é só contado e descartado). */
  json?: boolean
  /** Devolve o corpo descomprimido como texto (ex.: HTML, para achar os JS/CSS). */
  text?: boolean
  /** Rótulo do endpoint no relatório (padrão: método + rota com ids trocados por `:id`). */
  label?: string
  /** Cabeçalhos extras (ex.: `rsc: 1` na navegação do App Router). */
  headers?: Record<string, string>
}

/**
 * Cliente HTTP de um aluno virtual: guarda o cookie de sessão, manda o cabeçalho anti-CSRF
 * nos métodos que alteram estado e pede compressão como um navegador. Cada requisição vira
 * uma amostra no coletor da fase atual.
 */
export class StudentHttp {
  private session: string | null = null
  private metrics: MetricsRecorder

  /**
   * Cliente sem sessão; o cookie chega no cadastro ou no login.
   *
   * @param origin origem da web (telas e, sem `apiOrigin`, também `/api/*` pelo rewrite).
   * @param apiOrigin origem da API para chamadas diretas a `/api/*`; null = pela web.
   * @param forwardedFor X-Forwarded-For do aluno (simula IPs diferentes); null = sem cabeçalho.
   */
  constructor(
    private readonly origin: string,
    private readonly apiOrigin: string | null,
    private readonly agent: Agent,
    metrics: MetricsRecorder,
    private readonly forwardedFor: string | null,
  ) {
    this.metrics = metrics
  }

  /** Troca o coletor (ex.: da preparação para a medição). */
  useMetrics(metrics: MetricsRecorder): void {
    this.metrics = metrics
  }

  /** Há cookie de sessão? */
  get isLoggedIn(): boolean {
    return this.session !== null
  }

  /** Faz a requisição, registra a amostra e devolve status, tempo e (opcional) o JSON. */
  async send<T>(method: string, path: string, options: RequestOptions = {}): Promise<HttpResult<T>> {
    const headers: Record<string, string> = {
      "accept-encoding": "gzip, deflate, br",
      "user-agent": "levelusp-load/1.0",
      ...options.headers,
    }
    if (this.session) headers.cookie = `${SESSION_COOKIE}=${this.session}`
    if (this.forwardedFor) headers["x-forwarded-for"] = this.forwardedFor
    if (MUTATING_METHODS.has(method)) headers[CSRF_HEADER] = "1"
    let payload: string | undefined
    if (options.body !== undefined) {
      payload = JSON.stringify(options.body)
      headers["content-type"] = "application/json"
    }
    const label = options.label ?? endpointLabel(method, path)
    const startedAt = performance.now()
    try {
      const origin = this.apiOrigin !== null && path.startsWith("/api/") ? this.apiOrigin : this.origin
      const response = await request(new URL(path, origin), { method, headers, body: payload ?? null, dispatcher: this.agent })
      this.storeSession(response.headers["set-cookie"])
      const raw = await readBody(response.body)
      const ms = performance.now() - startedAt
      const encoding = headerText(response.headers["content-encoding"])
      const isJson = headerText(response.headers["content-type"])?.includes("application/json") ?? false
      const parsed = isJson && (options.json === true || response.statusCode >= 400) ? parseJson(decode(raw, encoding)) : null
      const code = response.statusCode >= 400 ? errorCode(parsed) : undefined
      const text = options.text === true ? decode(raw, encoding).toString("utf8") : null
      const retryAfterSeconds = parseRetryAfter(headerText(response.headers["retry-after"]))
      this.metrics.record({ endpoint: label, status: response.statusCode, ms, bytes: raw.length, ...(code ? { code } : {}) })
      return {
        status: response.statusCode,
        ms,
        body: options.json === true ? (parsed as T | null) : null,
        text,
        bytes: raw.length,
        ...(code ? { code } : {}),
        ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }),
      }
    } catch {
      const ms = performance.now() - startedAt
      this.metrics.record({ endpoint: label, status: 0, ms, bytes: 0, code: "NETWORK" })
      return { status: 0, ms, body: null, text: null, bytes: 0, code: "NETWORK" }
    }
  }

  private storeSession(setCookie: string | string[] | undefined): void {
    for (const cookie of [setCookie ?? []].flat()) {
      const [pair = ""] = cookie.split(";")
      const separator = pair.indexOf("=")
      if (pair.slice(0, separator).trim() !== SESSION_COOKIE) continue
      const value = pair.slice(separator + 1).trim()
      this.session = value === "" ? null : value
    }
  }
}

async function readBody(body: AsyncIterable<Buffer>): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of body) chunks.push(chunk)
  return Buffer.concat(chunks)
}

/** `Retry-After` em segundos inteiros; ausente ou em outro formato → `undefined`. */
export function parseRetryAfter(value: string | undefined): number | undefined {
  if (value === undefined || !/^\d+$/.test(value.trim())) return undefined
  return Number(value.trim())
}

function headerText(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value.join(",") : value
}

/** Descomprime como o navegador faria (só quando o corpo é lido). */
export function decode(raw: Buffer, encoding: string | undefined): Buffer {
  switch (encoding?.trim()) {
    case "gzip":
      return gunzipSync(raw)
    case "br":
      return brotliDecompressSync(raw)
    case "deflate":
      return inflateSync(raw)
    default:
      return raw
  }
}

function parseJson(raw: Buffer): unknown {
  try {
    return JSON.parse(raw.toString("utf8"))
  } catch {
    return null
  }
}

function errorCode(body: unknown): string | undefined {
  if (typeof body !== "object" || body === null || !("code" in body)) return undefined
  return typeof body.code === "string" ? body.code : undefined
}
