import type { ApiErrorBody } from "@levelusp/contracts"
import { resolveServerApiBaseUrl } from "@/lib/config/server-urls"

/*
 * Cliente HTTP da API. O navegador sempre chama a mesma origem (`/api/*`) e o
 * Next.js repassa para a API: assim o cookie de sessão é de primeira parte e
 * httpOnly, e nenhum token fica acessível ao JavaScript.
 */

export const HTTP_STATUS = {
  /** Falha antes de haver resposta (sem rede, servidor fora do ar). */
  NETWORK_ERROR: 0,
  NO_CONTENT: 204,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  REQUEST_TIMEOUT: 408,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
} as const

const NETWORK_ERROR_MESSAGE = "Sem conexão com o servidor. Verifique sua internet."
const DEFAULT_ERROR_MESSAGE = "Não foi possível concluir a ação."
const DEFAULT_FALLBACK_MESSAGE = "Algo deu errado. Tente novamente."

/** A API recusa métodos que alteram estado sem este cabeçalho (proteção anti-CSRF). */
const CSRF_HEADER = "x-levelusp-csrf"

/** Erro de uma chamada à API, com a mensagem pt-BR do servidor pronta para exibir. */
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

/** `true` para qualquer `ApiError` ou, se `status` for informado, só para aquele status. */
export function isApiError(error: unknown, status?: number): error is ApiError {
  if (!(error instanceof ApiError)) return false
  return status === undefined || error.status === status
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError"
}

/** Mensagem amigável de qualquer erro: a do servidor quando houver, senão `fallback`. */
export function getErrorMessage(error: unknown, fallback = DEFAULT_FALLBACK_MESSAGE): string {
  return error instanceof ApiError ? error.message : fallback
}

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
export type QueryParams = Record<string, string | number | boolean | null | undefined>

/** Corpo enviado nas mutações sem dados: a API espera sempre um objeto JSON. */
type EmptyBody = Record<string, never>
const EMPTY_BODY: EmptyBody = {}

export interface RequestOptions<TBody = undefined> {
  body?: TBody
  query?: QueryParams
  signal?: AbortSignal
  /** Cabeçalhos extras (ex.: cookie repassado na renderização no servidor). */
  headers?: Record<string, string>
}

type ReadOptions = Omit<RequestOptions, "body">

/** No navegador a URL é relativa; no servidor (SSR) é a URL interna da API (ver `resolveServerApiBaseUrl`). */
function apiBaseUrl(): string {
  if (typeof window !== "undefined") return ""
  return resolveServerApiBaseUrl(process.env)
}

function buildUrl(path: string, query: QueryParams = {}): string {
  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) searchParams.set(key, String(value))
  }
  const queryString = searchParams.toString()
  return `${apiBaseUrl()}/api${path}${queryString ? `?${queryString}` : ""}`
}

function buildHeaders(method: HttpMethod, hasJsonBody: boolean, extraHeaders: Record<string, string> = {}) {
  const headers: Record<string, string> = { accept: "application/json", ...extraHeaders }
  if (method !== "GET") headers[CSRF_HEADER] = "1"
  if (hasJsonBody) headers["content-type"] = "application/json"
  return headers
}

function parseJson(text: string): unknown {
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

type ValidationIssue = NonNullable<ApiErrorBody["issues"]>[number]

function isValidationIssue(value: unknown): value is ValidationIssue {
  if (typeof value !== "object" || value === null) return false
  return "path" in value && typeof value.path === "string" && "message" in value && typeof value.message === "string"
}

/** Lê o corpo de erro padrão da API sem confiar nele: proxies podem devolver HTML ou nada. */
function toApiError(status: number, body: unknown): ApiError {
  if (typeof body !== "object" || body === null) return new ApiError(status, "HTTP_ERROR", DEFAULT_ERROR_MESSAGE)
  const code = "code" in body && typeof body.code === "string" ? body.code : "HTTP_ERROR"
  const message = "message" in body && typeof body.message === "string" ? body.message : DEFAULT_ERROR_MESSAGE
  const issues = "issues" in body && Array.isArray(body.issues) ? body.issues.filter(isValidationIssue) : undefined
  return new ApiError(status, code, message, issues)
}

/**
 * Faz a chamada e devolve o corpo já interpretado. Lança `ApiError` em resposta
 * de erro ou falha de rede; um cancelamento via `signal` propaga o `AbortError`.
 */
export async function request<TResponse, TBody = undefined>(
  method: HttpMethod,
  path: string,
  { body, query, signal, headers }: RequestOptions<TBody> = {},
): Promise<TResponse> {
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData
  const hasJsonBody = body !== undefined && !isFormData

  let response: Response
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers: buildHeaders(method, hasJsonBody, headers),
      body: isFormData ? body : hasJsonBody ? JSON.stringify(body) : undefined,
      credentials: "same-origin",
      cache: "no-store",
      signal,
    })
  } catch (error) {
    if (isAbortError(error)) throw error
    throw new ApiError(HTTP_STATUS.NETWORK_ERROR, "NETWORK", NETWORK_ERROR_MESSAGE)
  }

  // Asserções abaixo: o formato da resposta é garantido pelo contrato em
  // @levelusp/contracts; o cliente não revalida o que a própria API serializou.
  if (response.status === HTTP_STATUS.NO_CONTENT) return undefined as TResponse
  const data = parseJson(await response.text())
  if (!response.ok) throw toApiError(response.status, data)
  return data as TResponse
}

/**
 * Atalhos por método. `TResponse` é o tipo devolvido pela API; `TBody` é inferido
 * do argumento ou informado para amarrar o corpo ao schema do contrato.
 */
export const api = {
  get: <TResponse>(path: string, options?: ReadOptions) => request<TResponse>("GET", path, options),
  post: <TResponse, TBody extends object = object>(path: string, body?: TBody, options?: ReadOptions) =>
    request<TResponse, TBody | EmptyBody>("POST", path, { ...options, body: body ?? EMPTY_BODY }),
  put: <TResponse, TBody extends object = object>(path: string, body?: TBody, options?: ReadOptions) =>
    request<TResponse, TBody | EmptyBody>("PUT", path, { ...options, body: body ?? EMPTY_BODY }),
  patch: <TResponse, TBody extends object = object>(path: string, body?: TBody, options?: ReadOptions) =>
    request<TResponse, TBody | EmptyBody>("PATCH", path, { ...options, body: body ?? EMPTY_BODY }),
  delete: <TResponse = void, TBody extends object = object>(path: string, body?: TBody, options?: ReadOptions) =>
    request<TResponse, TBody>("DELETE", path, { ...options, body }),
}

/** Converte um status de erro esperado (ex.: 404 "não existe") em `null`; os demais continuam lançando. */
export async function nullOnStatus<T>(promise: Promise<T>, status: number): Promise<T | null> {
  try {
    return await promise
  } catch (error) {
    if (isApiError(error, status)) return null
    throw error
  }
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError }

/** Para telas que tratam o erro como dado (ex.: mostrar a mensagem no lugar do conteúdo). */
export async function toApiResult<T>(promise: Promise<T>): Promise<ApiResult<T>> {
  try {
    return { ok: true, data: await promise }
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, error }
    return { ok: false, error: new ApiError(HTTP_STATUS.NETWORK_ERROR, "NETWORK", NETWORK_ERROR_MESSAGE) }
  }
}
