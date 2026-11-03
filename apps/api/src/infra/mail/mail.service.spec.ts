import { Logger } from "@nestjs/common"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { loadEnv, type Env } from "@/config/env"
import { MailService } from "./mail.service"
import type { MailTransport, OutgoingMail } from "./mail.transport"

function testEnv(overrides: NodeJS.ProcessEnv = {}): Env {
  return loadEnv({
    DATABASE_URL: "postgres://x@localhost/x",
    RUNNER_TOKEN: "token-de-teste-com-24-caracteres",
    MAIL_FROM: "LevelUSP <nao-responda@levelusp.usp.br>",
    MAIL_MAX_ATTEMPTS: "3",
    ...overrides,
  })
}

class FakeTransport implements MailTransport {
  readonly sent: OutgoingMail[] = []
  private readonly failures: Error[]

  constructor(failures: Error[] = []) {
    this.failures = [...failures]
  }

  async sendMail(message: OutgoingMail): Promise<unknown> {
    const failure = this.failures.shift()
    if (failure) throw failure
    this.sent.push(message)
    return { accepted: [message.to] }
  }

  async verify(): Promise<unknown> {
    return true
  }
}

const MESSAGE = { to: "aluna@usp.br", subject: "Assunto", text: "Corpo" }

describe("MailService", () => {
  // Os avisos esperados (nova tentativa, SMTP ausente) não poluem a saída dos testes.
  beforeAll(() => Logger.overrideLogger(false))
  afterAll(() => Logger.overrideLogger(["log", "error", "warn", "debug", "verbose", "fatal"]))
  afterEach(() => {
    vi.useRealTimers()
  })

  it("envia com o remetente configurado", async () => {
    const transport = new FakeTransport()
    await new MailService(testEnv(), transport).send(MESSAGE)
    expect(transport.sent).toEqual([{ from: "LevelUSP <nao-responda@levelusp.usp.br>", ...MESSAGE }])
  })

  it("repete falha temporária do SMTP e entrega na tentativa seguinte", async () => {
    vi.useFakeTimers()
    const transport = new FakeTransport([Object.assign(new Error("timeout"), { code: "ETIMEDOUT" })])
    const sending = new MailService(testEnv(), transport).send(MESSAGE)
    await vi.advanceTimersByTimeAsync(1_000)
    await sending
    expect(transport.sent).toHaveLength(1)
  })

  it("não repete erro definitivo e o repassa a quem chamou", async () => {
    const authError = Object.assign(new Error("535 credenciais inválidas"), { code: "EAUTH", responseCode: 535 })
    const transport = new FakeTransport([authError])
    await expect(new MailService(testEnv(), transport).send(MESSAGE)).rejects.toBe(authError)
    expect(transport.sent).toHaveLength(0)
  })

  it("sem SMTP só registra no log e não falha", async () => {
    const service = new MailService(testEnv(), null)
    expect(service.isConfigured).toBe(false)
    await expect(service.send(MESSAGE)).resolves.toBeUndefined()
  })
})
