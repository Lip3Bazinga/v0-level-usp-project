import { Injectable } from "@nestjs/common"
import { TooManyRequests } from "../errors/app-error"
import type { RateLimitPolicy } from "./rate-limit.policies"

/** Acima disso, chaves sem acesso recente são descartadas (evita crescer sem limite). */
const MAX_TRACKED_KEYS = 50_000

/**
 * Limite por usuário e ação (janela deslizante em memória). Suficiente para
 * uma instância da API; com várias réplicas, trocar por Redis/Postgres.
 */
@Injectable()
export class RateLimitService {
  private readonly hitsByKey = new Map<string, number[]>()

  /** Registra uma ação de `subjectId` (usuário ou alvo) ou lança 429 se passou do limite. */
  consume(policy: RateLimitPolicy, subjectId: string): void {
    const key = `${policy.scope}:${subjectId}`
    const now = Date.now()
    const recentHits = (this.hitsByKey.get(key) ?? []).filter((hitAt) => now - hitAt < policy.windowMs)
    if (recentHits.length >= policy.limit) {
      this.hitsByKey.set(key, recentHits)
      throw TooManyRequests(policy.message)
    }
    recentHits.push(now)
    this.hitsByKey.set(key, recentHits)
    if (this.hitsByKey.size > MAX_TRACKED_KEYS) this.sweep(now, policy.windowMs)
  }

  /**
   * Devolve a última ação registrada de `subjectId` (ex.: o Verificar que não rodou porque o
   * corretor estava ocupado). Sem ação registrada, não faz nada.
   */
  refund(policy: RateLimitPolicy, subjectId: string): void {
    this.hitsByKey.get(`${policy.scope}:${subjectId}`)?.pop()
  }

  private sweep(now: number, windowMs: number): void {
    for (const [key, hits] of this.hitsByKey) {
      if (!hits.some((hitAt) => now - hitAt < windowMs)) this.hitsByKey.delete(key)
    }
  }
}
