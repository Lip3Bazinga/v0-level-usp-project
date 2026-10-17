import { describe, expect, it } from "vitest"
import { AppError } from "../errors/app-error"
import { RateLimitService } from "./rate-limit.service"

const policy = { scope: "teste", limit: 2, windowMs: 60_000, message: "Calma." }

describe("RateLimitService", () => {
  it("bloqueia com 429 ao passar do limite, separado por usuário", () => {
    const rateLimit = new RateLimitService()
    rateLimit.consume(policy, "u1")
    rateLimit.consume(policy, "u1")
    expect(() => rateLimit.consume(policy, "u1")).toThrow(expect.objectContaining({ statusCode: 429, message: "Calma." }))
    expect(() => rateLimit.consume(policy, "u2")).not.toThrow()
  })

  it("usa a mensagem padrão quando a política não define uma", () => {
    const rateLimit = new RateLimitService()
    const strict = { scope: "estrito", limit: 0, windowMs: 1_000 }
    expect(() => rateLimit.consume(strict, "u1")).toThrow(AppError)
  })
})
