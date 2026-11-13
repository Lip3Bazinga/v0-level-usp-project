import { MAX_EVENTS_PER_BATCH, type EventInput, type EventType, type Json } from "@levelusp/contracts"
import { api, isApiError } from "@/lib/api"

/**
 * Fila de eventos de uso do experimento de gamificação. Os eventos saem em lote para
 * `POST /me/events` a cada {@link FLUSH_INTERVAL_MS} ou quando a fila chega a
 * {@link FLUSH_BATCH_SIZE}; ao sair da página (`pagehide`), o que restou vai num `fetch` com `keepalive`.
 * O payload leva só identificadores e números — NUNCA o código do aluno.
 */

/** Intervalo entre envios de lote. */
export const FLUSH_INTERVAL_MS = 5_000
/** Tamanho da fila que dispara o envio imediato. */
export const FLUSH_BATCH_SIZE = 20
/** Teto da fila quando o envio falha repetidamente (os mais antigos são descartados). */
const MAX_QUEUED_EVENTS = 200
const EVENTS_URL = "/api/me/events"
const CSRF_HEADER = "x-levelusp-csrf"
/** Chaves que poderiam carregar código ou texto do aluno: são removidas do payload. */
const FORBIDDEN_PAYLOAD_KEYS: ReadonlySet<string> = new Set(["code", "files", "content", "source", "stdout", "stderr", "answer_text"])

let queue: EventInput[] = []
let timer: ReturnType<typeof setTimeout> | null = null
let isPageHideBound = false

/** Tira do payload qualquer chave que possa conter código do aluno. */
export function sanitizeEventPayload(payload: Record<string, Json>): Record<string, Json> {
  return Object.fromEntries(Object.entries(payload).filter(([key]) => !FORBIDDEN_PAYLOAD_KEYS.has(key)))
}

/** Eventos na fila aguardando envio (para os testes). */
export function queuedEventCount(): number {
  return queue.length
}

/** Esvazia a fila e cancela o envio agendado (para os testes). */
export function resetEventQueue(): void {
  queue = []
  if (timer !== null) clearTimeout(timer)
  timer = null
}

/**
 * Envia o que está na fila, em lotes de até `MAX_EVENTS_PER_BATCH`. Falha de rede devolve
 * os eventos à fila; 401/429/400 descartam o lote (não adianta insistir).
 */
export async function flushEvents(): Promise<void> {
  if (timer !== null) clearTimeout(timer)
  timer = null
  while (queue.length > 0) {
    const batch = queue.slice(0, MAX_EVENTS_PER_BATCH)
    queue = queue.slice(batch.length)
    try {
      await api.post<undefined, { events: EventInput[] }>("/me/events", { events: batch })
    } catch (error) {
      if (!isApiError(error)) queue = [...batch, ...queue].slice(-MAX_QUEUED_EVENTS)
      return
    }
  }
}

/**
 * Último envio ao sair da página. Usa `fetch` com `keepalive` em vez de `sendBeacon`: o
 * beacon não aceita cabeçalhos e a API recusa escrita sem o cabeçalho anti-CSRF; o
 * `keepalive` sobrevive ao descarregamento da página do mesmo jeito.
 */
function flushOnPageHide(): void {
  if (queue.length === 0 || typeof fetch !== "function") return
  const batch = queue.slice(0, MAX_EVENTS_PER_BATCH)
  queue = queue.slice(batch.length)
  void fetch(EVENTS_URL, {
    method: "POST",
    keepalive: true,
    credentials: "same-origin",
    headers: { "content-type": "application/json", [CSRF_HEADER]: "1" },
    body: JSON.stringify({ events: batch }),
  }).catch(() => {
    // A página está fechando: não há o que fazer com a falha.
  })
}

function bindPageHide(): void {
  if (isPageHideBound || typeof window === "undefined") return
  isPageHideBound = true
  window.addEventListener("pagehide", flushOnPageHide)
}

/**
 * Enfileira um evento de uso. Não lança nem espera: telemetria nunca atrapalha a tela.
 *
 * @param payload identificadores e números (lição, passo, nota). Chaves de código são descartadas.
 */
export function trackEvent(type: EventType, payload: Record<string, Json> = {}): void {
  queue.push({ type, payload: sanitizeEventPayload(payload) })
  if (queue.length > MAX_QUEUED_EVENTS) queue = queue.slice(-MAX_QUEUED_EVENTS)
  bindPageHide()
  if (queue.length >= FLUSH_BATCH_SIZE) {
    void flushEvents()
    return
  }
  timer ??= setTimeout(() => void flushEvents(), FLUSH_INTERVAL_MS)
}
