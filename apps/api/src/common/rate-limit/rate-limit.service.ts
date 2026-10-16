import { Injectable } from "@nestjs/common"
import { TooManyRequests } from "../errors/app-error"

/**
 * Limite por usuário e ação (janela deslizante em memória). Suficiente para
 * uma instância da API; com várias réplicas, trocar por Redis/Postgres.
 */
@Injectable()
export class RateLimitService {
  private readonly hits = new Map<string, number[]>()

  consume(key: string, limit: number, windowMs: number, message?: string): void {
    const now = Date.now()
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < windowMs)
    if (recent.length >= limit) {
      this.hits.set(key, recent)
      throw TooManyRequests(message)
    }
    recent.push(now)
    this.hits.set(key, recent)
    if (this.hits.size > 50_000) this.sweep(now, windowMs)
  }

  private sweep(now: number, windowMs: number) {
    for (const [k, v] of this.hits) if (!v.some((t) => now - t < windowMs)) this.hits.delete(k)
  }
}
