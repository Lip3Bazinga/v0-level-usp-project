/**
 * Novas tentativas de envio de e-mail. Só falhas temporárias são repetidas
 * (rede, tempo esgotado, respostas SMTP 4xx); credencial errada, destinatário
 * recusado (5xx) ou TLS inválido falham na hora — repetir não ajudaria.
 */

/** Códigos do nodemailer/Node para problemas de rede que costumam passar sozinhos. */
const TRANSIENT_ERROR_CODES: ReadonlySet<string> = new Set([
  "ECONNECTION",
  "ETIMEDOUT",
  "ESOCKET",
  "EDNS",
  "ECONNRESET",
  "ECONNREFUSED",
  "EAI_AGAIN",
])

const SMTP_TRANSIENT_MIN = 400
const SMTP_TRANSIENT_MAX = 499

function readProperty(error: unknown, key: string): unknown {
  return typeof error === "object" && error !== null && key in error ? Reflect.get(error, key) : undefined
}

/**
 * Diz se vale tentar de novo: respostas SMTP 4xx (falha temporária) ou erro de
 * rede conhecido. Erros 5xx e de autenticação são definitivos.
 */
export function isTransientMailError(error: unknown): boolean {
  const responseCode = readProperty(error, "responseCode")
  if (typeof responseCode === "number") return responseCode >= SMTP_TRANSIENT_MIN && responseCode <= SMTP_TRANSIENT_MAX
  const code = readProperty(error, "code")
  return typeof code === "string" && TRANSIENT_ERROR_CODES.has(code)
}

/** Política de novas tentativas do envio de e-mail. */
export interface RetryOptions {
  maxAttempts: number
  /** Espera antes da 2ª tentativa; dobra a cada nova tentativa. */
  baseDelayMs: number
  shouldRetry: (error: unknown) => boolean
  onRetry?: (error: unknown, failedAttempt: number) => void
  sleep?: (delayMs: number) => Promise<void>
}

const defaultSleep = (delayMs: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, delayMs))

/** Executa `operation` até dar certo, esgotar as tentativas ou surgir erro definitivo. */
export async function withRetry<T>(operation: () => Promise<T>, options: RetryOptions): Promise<T> {
  const sleep = options.sleep ?? defaultSleep
  for (let attempt = 1; ; attempt++) {
    try {
      return await operation()
    } catch (error) {
      if (attempt >= options.maxAttempts || !options.shouldRetry(error)) throw error
      options.onRetry?.(error, attempt)
      await sleep(options.baseDelayMs * 2 ** (attempt - 1))
    }
  }
}
