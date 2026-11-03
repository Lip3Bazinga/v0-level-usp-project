import { describe, expect, it, vi } from "vitest"
import { isTransientMailError, withRetry } from "./mail-retry"

const noWait = (): Promise<void> => Promise.resolve()

function smtpError(fields: { code?: string; responseCode?: number }): Error {
  return Object.assign(new Error("falha simulada"), fields)
}

describe("isTransientMailError", () => {
  it("repete falhas de rede e respostas SMTP 4xx", () => {
    expect(isTransientMailError(smtpError({ code: "ETIMEDOUT" }))).toBe(true)
    expect(isTransientMailError(smtpError({ code: "ECONNECTION" }))).toBe(true)
    expect(isTransientMailError(smtpError({ code: "EENVELOPE", responseCode: 451 }))).toBe(true)
  })

  it("não repete erros definitivos (autenticação, 5xx, TLS)", () => {
    expect(isTransientMailError(smtpError({ code: "EAUTH", responseCode: 535 }))).toBe(false)
    expect(isTransientMailError(smtpError({ code: "EENVELOPE", responseCode: 550 }))).toBe(false)
    expect(isTransientMailError(smtpError({ code: "ETLS" }))).toBe(false)
    expect(isTransientMailError("texto")).toBe(false)
  })
})

describe("withRetry", () => {
  it("tenta de novo com espera exponencial até dar certo", async () => {
    const sleep = vi.fn(noWait)
    const operation = vi.fn<() => Promise<string>>()
      .mockRejectedValueOnce(smtpError({ code: "ETIMEDOUT" }))
      .mockRejectedValueOnce(smtpError({ responseCode: 421 }))
      .mockResolvedValue("ok")
    await expect(withRetry(operation, { maxAttempts: 3, baseDelayMs: 100, shouldRetry: isTransientMailError, sleep })).resolves.toBe("ok")
    expect(operation).toHaveBeenCalledTimes(3)
    expect(sleep.mock.calls).toEqual([[100], [200]])
  })

  it("desiste ao esgotar as tentativas e repassa o último erro", async () => {
    const lastError = smtpError({ code: "ECONNECTION" })
    const operation = vi.fn<() => Promise<string>>().mockRejectedValue(lastError)
    await expect(withRetry(operation, { maxAttempts: 2, baseDelayMs: 1, shouldRetry: () => true, sleep: noWait })).rejects.toBe(lastError)
    expect(operation).toHaveBeenCalledTimes(2)
  })

  it("não repete erro definitivo", async () => {
    const operation = vi.fn<() => Promise<string>>().mockRejectedValue(smtpError({ responseCode: 535 }))
    await expect(withRetry(operation, { maxAttempts: 5, baseDelayMs: 1, shouldRetry: isTransientMailError, sleep: noWait })).rejects.toThrow()
    expect(operation).toHaveBeenCalledTimes(1)
  })
})
