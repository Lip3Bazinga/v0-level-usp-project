import type { ApiErrorBody } from "@levelusp/contracts"

/**
 * Cliente HTTP da API LevelUSP.
 *
 * - Sempre mesma origem (`/api/*`): o Next.js repassa para a API (rewrite),
 *   então o cookie de sessão é de primeira parte e httpOnly — nenhum token
 *   fica acessível ao JavaScript.
 * - Envia o cabeçalho anti-CSRF exigido pela API em métodos que alteram estado.
 * - Converte erros em `ApiError` com mensagem pt-BR pronta para exibir.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly issues?: ApiErrorBody["issues"],
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export const CSRF_HEADER = "x-levelusp-csrf"

/** Base: no navegador, relativa; no servidor (SSR), a URL interna da API. */
function baseUrl(): string {
  if (typeof window !== "undefined") return ""
  return process.env.API_INTERNAL_URL ?? "http://localhost:4000"
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

export interface RequestOptions {
  body?: unknown
  query?: Record<string, string | number | boolean | undefined | null>
  signal?: AbortSignal
  /** Cabeçalhos extras (ex.: cookie repassado no SSR). */
  headers?: Record<string, string>
}

export async function apiRequest<T>(method: Method, path: string, opts: RequestOptions = {}): Promise<T> {
  const url = new URL(`/api${path}`, baseUrl() || "http://placeholder")
  for (const [k, v] of Object.entries(opts.query ?? {})) if (v !== undefined && v !== null) url.searchParams.set(k, String(v))
  const target = baseUrl() ? url.toString() : `${url.pathname}${url.search}`

  const isForm = typeof FormData !== "undefined" && opts.body instanceof FormData
  const headers: Record<string, string> = { accept: "application/json", ...opts.headers }
  if (method !== "GET") headers[CSRF_HEADER] = "1"
  if (opts.body !== undefined && !isForm) headers["content-type"] = "application/json"

  let res: Response
  try {
    res = await fetch(target, {
      method,
      headers,
      body: opts.body === undefined ? undefined : isForm ? (opts.body as FormData) : JSON.stringify(opts.body),
      credentials: "same-origin",
      cache: "no-store",
      signal: opts.signal,
    })
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err
    throw new ApiError(0, "NETWORK", "Sem conexão com o servidor. Verifique sua internet.")
  }

  if (res.status === 204) return undefined as T
  const text = await res.text()
  const data = text ? safeJson(text) : undefined
  if (!res.ok) {
    const body = (data ?? {}) as Partial<ApiErrorBody>
    throw new ApiError(res.status, body.code ?? "HTTP_ERROR", body.message ?? "Não foi possível concluir a ação.", body.issues)
  }
  return data as T
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) => apiRequest<T>("GET", path, opts),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) => apiRequest<T>("POST", path, { ...opts, body: body ?? {} }),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) => apiRequest<T>("PUT", path, { ...opts, body: body ?? {} }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) => apiRequest<T>("PATCH", path, { ...opts, body: body ?? {} }),
  delete: <T>(path: string, body?: unknown, opts?: RequestOptions) => apiRequest<T>("DELETE", path, { ...opts, body }),
}

/** Mensagem amigável a partir de qualquer erro (para toasts). */
export function errorMessage(err: unknown, fallback = "Algo deu errado. Tente novamente."): string {
  if (err instanceof ApiError) return err.message
  return fallback
}

/** GET que devolve null em 404 (útil para "pode não existir"). */
export async function getOrNull<T>(path: string, opts?: RequestOptions): Promise<T | null> {
  try {
    return await api.get<T>(path, opts)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}
