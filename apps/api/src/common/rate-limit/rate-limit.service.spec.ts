import { describe, expect, it } from "vitest"
import { AppError } from "../errors/app-error"
import { RATE_LIMITS } from "./rate-limit.policies"
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

  it("teto diário de verificações conta por aluno e lição (contra adivinhação por força bruta)", () => {
    const rateLimit = new RateLimitService()
    const policy = RATE_LIMITS.codeSubmissionPerLessonDay
    for (let attempt = 0; attempt < policy.limit; attempt++) rateLimit.consume(policy, "aluno:licao-1")
    expect(() => rateLimit.consume(policy, "aluno:licao-1")).toThrow(expect.objectContaining({ statusCode: 429 }))
    expect(() => rateLimit.consume(policy, "aluno:licao-2")).not.toThrow()
  })

  it("devolve a última ação (Verificar que não rodou porque o corretor estava ocupado)", () => {
    const rateLimit = new RateLimitService()
    rateLimit.consume(policy, "u1")
    rateLimit.consume(policy, "u1")
    rateLimit.refund(policy, "u1")
    expect(() => rateLimit.consume(policy, "u1")).not.toThrow()
    expect(() => rateLimit.consume(policy, "u1")).toThrow(expect.objectContaining({ statusCode: 429 }))
    expect(() => rateLimit.refund(policy, "sem-registro")).not.toThrow()
  })
})
