/** Cliente HTTP da API do LevelUSP para os scripts de medição (fetch nativo, cookie de sessão e CSRF). */
import { randomBytes } from "node:crypto"

const CSRF_HEADER = "x-levelusp-csrf"
const MUTATING_METHODS: ReadonlySet<string> = new Set(["POST", "PUT", "PATCH", "DELETE"])

/** Resposta lida: status, tempo total (envio ao último byte) e corpo JSON, quando houver. */
export interface ApiResponse<T> {
  status: number
  ms: number
  body: T | null
  /** `code` do erro da API (`RUNNER_BUSY`, `RATE_LIMITED`…); `NETWORK`/`TIMEOUT` nas falhas de rede. */
  code: string | null
  /** `Retry-After` em segundos, quando veio. */
  retryAfterSeconds: number | null
}

/** Opções de um cliente. */
export interface ApiClientOptions {
  /** `X-Forwarded-For` fixo do aluno virtual (a API confia no primeiro salto): evita o limite por IP. */
  forwardedFor?: string
  /** Prazo de cada requisição (a correção espera a fila do executor). */
  timeoutMs?: number
}

/** Um aluno virtual: guarda os cookies e manda o cabeçalho anti-CSRF nos métodos que alteram estado. */
export class ApiClient {
  readonly baseUrl: string
  private readonly cookies = new Map<string, string>()
  private readonly forwardedFor: string | null
  private readonly timeoutMs: number

  constructor(baseUrl: string, options: ApiClientOptions = {}) {
    this.baseUrl = baseUrl.replace(/\/+$/, "")
    this.forwardedFor = options.forwardedFor ?? null
    this.timeoutMs = options.timeoutMs ?? 120_000
  }

  /** Há cookie de sessão? */
  get hasSession(): boolean {
    return this.cookies.size > 0
  }

  /** Faz a requisição; nunca rejeita (falha de rede vira `status: 0`). */
  async request<T>(method: string, route: string, body?: unknown): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = { accept: "application/json", "user-agent": "levelusp-bench/1.0" }
    if (this.cookies.size > 0) headers.cookie = [...this.cookies].map(([name, value]) => `${name}=${value}`).join("; ")
    if (this.forwardedFor !== null) headers["x-forwarded-for"] = this.forwardedFor
    if (MUTATING_METHODS.has(method)) headers[CSRF_HEADER] = "1"
    if (body !== undefined) headers["content-type"] = "application/json"
    const startedAt = performance.now()
    try {
      const response = await fetch(`${this.baseUrl}${route}`, {
        method,
        headers,
        body: body === undefined ? null : JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeoutMs),
      })
      this.storeCookies(response.headers.getSetCookie())
      const text = await response.text()
      const ms = performance.now() - startedAt
      const parsed = parseJson(text)
      const retryAfter = Number(response.headers.get("retry-after"))
      return {
        status: response.status,
        ms,
        body: response.ok ? (parsed as T | null) : null,
        code: response.ok ? null : errorCode(parsed),
        retryAfterSeconds: Number.isInteger(retryAfter) && retryAfter > 0 ? retryAfter : null,
      }
    } catch (error) {
      const ms = performance.now() - startedAt
      const timedOut = error instanceof DOMException && error.name === "TimeoutError"
      return { status: 0, ms, body: null, code: timedOut ? "TIMEOUT" : "NETWORK", retryAfterSeconds: null }
    }
  }

  /**
   * Cria a conta (cadastro) e deixa a sessão no cliente.
   *
   * @throws Error se o cadastro for recusado.
   */
  async signUp(credentials: Credentials): Promise<void> {
    const response = await this.request<{ user: { id: string } }>("POST", "/api/auth/sign-up", {
      email: credentials.email,
      password: credentials.password,
      full_name: credentials.fullName,
    })
    if (response.status !== 201) throw new Error(`cadastro recusado (${response.status} ${response.code ?? ""})`.trim())
  }

  private storeCookies(setCookies: readonly string[]): void {
    for (const cookie of setCookies) {
      const [pair = ""] = cookie.split(";")
      const separator = pair.indexOf("=")
      if (separator <= 0) continue
      const name = pair.slice(0, separator).trim()
      const value = pair.slice(separator + 1).trim()
      if (value === "") this.cookies.delete(name)
      else this.cookies.set(name, value)
    }
  }
}

/** Credenciais de um aluno descartável. */
export interface Credentials {
  email: string
  password: string
  fullName: string
}

/**
 * Credenciais novas para um aluno descartável: e-mail no domínio reservado `.invalid` (nunca
 * entregável) e senha aleatória que existe só na memória do processo (cumpre a política: 10+, letra e número).
 */
export function newCredentials(label: string): Credentials {
  const unique = randomBytes(6).toString("hex")
  return {
    email: `bench.${label}.${unique}@bench.invalid`,
    password: `Bn${randomBytes(12).toString("hex")}9`,
    fullName: `Aluno Bench ${label}`,
  }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function errorCode(body: unknown): string | null {
  if (typeof body !== "object" || body === null || !("code" in body)) return null
  return typeof body.code === "string" ? body.code : null
}
