import { HOUR_MS, MINUTE_MS } from "../time/time"

/** Limite por usuário/alvo: `limit` ações a cada `windowMs`, contadas por `scope:id`. */
export interface RateLimitPolicy {
  scope: string
  limit: number
  windowMs: number
  /** Mensagem do 429; sem ela vale a padrão de TooManyRequests. */
  message?: string
}

const TRY_LATER = "Muitas solicitações seguidas. Tente mais tarde."

export const RATE_LIMITS = {
  accountDeletion: { scope: "account.delete", limit: 5, windowMs: 15 * MINUTE_MS },
  dataExport: { scope: "account.export", limit: 10, windowMs: HOUR_MS },
  imageUpload: { scope: "upload", limit: 30, windowMs: HOUR_MS, message: "Limite de envios de imagem atingido. Tente mais tarde." },
  /** Mesmo limite do avaliador antigo. */
  codeSubmission: { scope: "submit", limit: 12, windowMs: MINUTE_MS, message: "Muitas verificações seguidas. Aguarde um instante." },
  theoryCompletion: { scope: "theory", limit: 30, windowMs: MINUTE_MS },
  quizSubmission: { scope: "quiz", limit: 10, windowMs: MINUTE_MS, message: "Muitos envios seguidos. Aguarde um instante." },
  /** Início e envio da prova: mesmo limite do sistema antigo. */
  examStart: { scope: "exam-start", limit: 10, windowMs: HOUR_MS, message: "Muitas tentativas de iniciar a prova. Aguarde alguns minutos." },
  examSubmission: { scope: "exam-submit", limit: 10, windowMs: HOUR_MS, message: "Muitos envios de prova seguidos. Aguarde alguns minutos." },
  libraryRequest: { scope: "library.request", limit: 20, windowMs: HOUR_MS, message: TRY_LATER },
  teacherRequest: { scope: "teacher.request", limit: 5, windowMs: HOUR_MS, message: TRY_LATER },
  adminPasswordReset: { scope: "admin.password_reset", limit: 5, windowMs: HOUR_MS, message: "Muitos links enviados para esta conta. Aguarde um pouco." },
  adminInvite: { scope: "admin.invite", limit: 50, windowMs: HOUR_MS, message: "Muitos convites seguidos. Aguarde um pouco." },
} as const satisfies Record<string, RateLimitPolicy>

/**
 * Limites por IP (ThrottlerGuard). Generosos porque laboratórios inteiros saem
 * pelo mesmo IP da universidade (NAT); a proteção principal é por conta.
 */
export const IP_THROTTLE = {
  windowMs: MINUTE_MS,
  globalLimit: 1200,
  /** Rotas de credencial; o bloqueio após 10 senhas erradas protege cada conta. */
  credentialLimit: 60,
  accountDeletionLimit: 10,
} as const
