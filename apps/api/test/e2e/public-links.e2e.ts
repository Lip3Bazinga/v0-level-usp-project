import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { agent, createTestApp, signUp, type TestContext } from "./harness"

/** Origem pública de produção simulada: todo link absoluto que a API gera deve usá-la. */
const PUBLIC_BASE_URL = "https://levelusp.exemplo.usp.br"
const SMTP_INTERNAL_ERROR = "connect ECONNREFUSED 10.0.0.5:587 (smtp-interno.exemplo)"

function linkIn(text: string | undefined): string {
  const match = text?.match(/https?:\/\/\S+/)
  if (!match) throw new Error(`sem link no e-mail: ${text}`)
  return match[0]
}

describe("Links públicos e falhas de e-mail (e2e)", () => {
  let ctx: TestContext
  beforeAll(async () => {
    // APP_ORIGIN (nome antigo) também definido: PUBLIC_BASE_URL deve prevalecer.
    ctx = await createTestApp({ PUBLIC_BASE_URL: `${PUBLIC_BASE_URL}/`, APP_ORIGIN: "http://localhost:3000" })
  })
  afterAll(() => ctx.close())
  beforeEach(() => ctx.reset())

  it("e-mail de redefinição de senha aponta para PUBLIC_BASE_URL", async () => {
    const { email } = await signUp(ctx.app)
    expect((await agent(ctx.app).post("/api/auth/password/forgot", { email })).status).toBe(202)
    await expect.poll(() => ctx.mail.sent.length).toBe(1)
    expect(linkIn(ctx.mail.sent[0]?.text)).toMatch(new RegExp(`^${PUBLIC_BASE_URL}/redefinir-senha\\?token=[^\\s]+$`))
  })

  it("e-mail de convite aponta para PUBLIC_BASE_URL", async () => {
    const admin = await signUp(ctx.app, "admin", ctx.db)
    expect((await admin.agent.post("/api/admin/users/invite", { email: "convidada@usp.br" })).status).toBe(201)
    expect(linkIn(ctx.mail.sent[0]?.text)).toMatch(new RegExp(`^${PUBLIC_BASE_URL}/redefinir-senha\\?token=`))
  })

  it("SMTP fora do ar não muda a resposta do 'esqueci minha senha'", async () => {
    const { email } = await signUp(ctx.app)
    ctx.mail.failWith(new Error(SMTP_INTERNAL_ERROR))
    const response = await agent(ctx.app).post("/api/auth/password/forgot", { email })
    expect(response.status).toBe(202)
    expect(JSON.stringify(response.body ?? {})).not.toContain("ECONNREFUSED")
  })

  it("convite com SMTP fora do ar: 503 com mensagem segura, sem detalhe interno", async () => {
    const admin = await signUp(ctx.app, "admin", ctx.db)
    ctx.mail.failWith(new Error(SMTP_INTERNAL_ERROR))
    const response = await admin.agent.post("/api/admin/users/invite", { email: "convidado@usp.br" })
    expect(response.status).toBe(503)
    expect(response.body).toMatchObject({ code: "MAIL_UNAVAILABLE", message: expect.stringContaining("Esqueci minha senha") })
    const serialized = JSON.stringify(response.body)
    expect(serialized).not.toContain("ECONNREFUSED")
    expect(serialized).not.toContain("smtp-interno")
  })
})
