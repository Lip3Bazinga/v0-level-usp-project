import { MS_PER_HOUR, MS_PER_MINUTE } from "../time/time"

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
  accountDeletion: { scope: "account.delete", limit: 5, windowMs: 15 * MS_PER_MINUTE },
  dataExport: { scope: "account.export", limit: 10, windowMs: MS_PER_HOUR },
  imageUpload: { scope: "upload", limit: 30, windowMs: MS_PER_HOUR, message: "Limite de envios de imagem atingido. Tente mais tarde." },
  /** Mesmo limite do avaliador antigo. */
  codeSubmission: { scope: "submit", limit: 12, windowMs: MS_PER_MINUTE, message: "Muitas verificações seguidas. Aguarde um instante." },
  theoryCompletion: { scope: "theory", limit: 30, windowMs: MS_PER_MINUTE },
  quizSubmission: { scope: "quiz", limit: 10, windowMs: MS_PER_MINUTE, message: "Muitos envios seguidos. Aguarde um instante." },
  /** Início e envio da prova: mesmo limite do sistema antigo. */
  examStart: { scope: "exam-start", limit: 10, windowMs: MS_PER_HOUR, message: "Muitas tentativas de iniciar a prova. Aguarde alguns minutos." },
  examSubmission: { scope: "exam-submit", limit: 10, windowMs: MS_PER_HOUR, message: "Muitos envios de prova seguidos. Aguarde alguns minutos." },
  libraryRequest: { scope: "library.request", limit: 20, windowMs: MS_PER_HOUR, message: TRY_LATER },
  teacherRequest: { scope: "teacher.request", limit: 5, windowMs: MS_PER_HOUR, message: TRY_LATER },
  adminPasswordReset: { scope: "admin.password_reset", limit: 5, windowMs: MS_PER_HOUR, message: "Muitos links enviados para esta conta. Aguarde um pouco." },
  adminInvite: { scope: "admin.invite", limit: 50, windowMs: MS_PER_HOUR, message: "Muitos convites seguidos. Aguarde um pouco." },
} as const satisfies Record<string, RateLimitPolicy>

/**
 * Limites por IP (ThrottlerGuard). Generosos porque laboratórios inteiros saem
 * pelo mesmo IP da universidade (NAT); a proteção principal é por conta.
 */
export const IP_THROTTLE = {
  windowMs: MS_PER_MINUTE,
  globalLimit: 1200,
  /** Rotas de credencial; o bloqueio após 10 senhas erradas protege cada conta. */
  credentialLimit: 60,
  accountDeletionLimit: 10,
} as const
