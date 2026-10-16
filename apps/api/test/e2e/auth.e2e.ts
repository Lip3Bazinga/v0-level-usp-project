import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { sql } from "drizzle-orm"
import { profiles, sessions } from "@levelusp/db"
import { agent, createTestApp, signUp, type TestContext } from "./harness"

describe("Autenticação (e2e)", () => {
  let ctx: TestContext
  beforeAll(async () => {
    ctx = await createTestApp()
  })
  afterAll(() => ctx.close())
  beforeEach(() => ctx.reset())

  it("cadastra, cria perfil e abre sessão com cookie httpOnly", async () => {
    const a = agent(ctx.app)
    const res = await a.post("/api/auth/sign-up", { email: "Ana@USP.br", password: "senhaForte123", full_name: "Ana" })
    expect(res.status).toBe(201)
    expect(res.body.user).toMatchObject({ email: "ana@usp.br", username: "ana", role: "student", current_streak: 1 })
    const cookie = res.headers["set-cookie"]?.[0] ?? ""
    expect(cookie).toMatch(/lvl_session=/)
    expect(cookie).toMatch(/HttpOnly/i)
    expect(cookie).toMatch(/SameSite=Lax/i)
    const me = await a.get("/api/auth/me")
    expect(me.status).toBe(200)
    expect(me.body.user.email).toBe("ana@usp.br")
  })

  it("guarda só o hash do token e da senha", async () => {
    const { id } = await signUp(ctx.app)
    const rows = await ctx.db.execute(sql`select u.password_hash, s.id from users u join sessions s on s.user_id = u.id where u.id = ${id}`)
    const row = rows.rows[0] as { password_hash: string; id: string }
    expect(row.password_hash).toMatch(/^\$argon2id\$/)
    expect(row.id).toMatch(/^[0-9a-f]{64}$/)
  })

  it("recusa e-mail duplicado e senha fraca", async () => {
    const { email } = await signUp(ctx.app)
    const dup = await agent(ctx.app).post("/api/auth/sign-up", { email, password: "senhaForte123", full_name: "X" })
    expect(dup.status).toBe(409)
    expect(dup.body.code).toBe("EMAIL_TAKEN")
    const weak = await agent(ctx.app).post("/api/auth/sign-up", { email: "b@usp.br", password: "123", full_name: "B" })
    expect(weak.status).toBe(400)
    expect(weak.body.code).toBe("VALIDATION")
  })

  it("exige o cabeçalho anti-CSRF em requisições que alteram estado", async () => {
    const res = await agent(ctx.app).raw.post("/api/auth/sign-in").send({ email: "a@usp.br", password: "x" })
    expect(res.status).toBe(403)
    expect(res.body.code).toBe("CSRF")
  })

  it("rotas protegidas respondem 401 sem sessão", async () => {
    const res = await agent(ctx.app).get("/api/auth/me")
    expect(res.status).toBe(401)
    expect(res.body).toMatchObject({ code: "UNAUTHENTICATED" })
  })

  it("login com senha errada não revela se o e-mail existe", async () => {
    const { email } = await signUp(ctx.app)
    const wrong = await agent(ctx.app).post("/api/auth/sign-in", { email, password: "errada123456" })
    const missing = await agent(ctx.app).post("/api/auth/sign-in", { email: "ninguem@usp.br", password: "errada123456" })
    expect(wrong.status).toBe(401)
    expect(missing.status).toBe(401)
    expect(wrong.body.message).toBe(missing.body.message)
  })

  it("logout revoga a sessão no servidor", async () => {
    const { agent: a } = await signUp(ctx.app)
    expect((await a.post("/api/auth/sign-out")).status).toBe(204)
    expect((await a.get("/api/auth/me")).status).toBe(401)
    const active = await ctx.db.execute(sql`select count(*)::int as n from sessions where revoked_at is null`)
    expect((active.rows[0] as { n: number }).n).toBe(0)
  })

  it("conta suspensa perde o acesso imediatamente", async () => {
    const { agent: a, id, email, password } = await signUp(ctx.app)
    await ctx.db.update(profiles).set({ suspended: true }).where(sql`${profiles.id} = ${id}`)
    expect((await a.get("/api/auth/me")).status).toBe(401)
    const again = await agent(ctx.app).post("/api/auth/sign-in", { email, password })
    expect(again.status).toBe(403)
  })

  it("redefine a senha com token de uso único e derruba as sessões antigas", async () => {
    const { agent: a, email } = await signUp(ctx.app)
    await agent(ctx.app).post("/api/auth/password/forgot", { email })
    const link = ctx.mail.sent[0]?.text.match(/token=([^\s]+)/)?.[1]
    expect(link).toBeTruthy()
    const token = decodeURIComponent(link!)
    const ok = await agent(ctx.app).post("/api/auth/password/reset", { token, password: "novaSenha456" })
    expect(ok.status).toBe(200)
    expect((await a.get("/api/auth/me")).status).toBe(401)
    const reuse = await agent(ctx.app).post("/api/auth/password/reset", { token, password: "outraSenha789" })
    expect(reuse.status).toBe(400)
    expect((await agent(ctx.app).post("/api/auth/sign-in", { email, password: "novaSenha456" })).status).toBe(200)
  })

  it("pedido de redefinição para e-mail inexistente responde igual", async () => {
    const res = await agent(ctx.app).post("/api/auth/password/forgot", { email: "fantasma@usp.br" })
    expect(res.status).toBe(202)
    expect(ctx.mail.sent).toHaveLength(0)
  })

  it("bloqueia a conta após 10 senhas erradas", async () => {
    const { email, password } = await signUp(ctx.app)
    for (let i = 0; i < 10; i++) {
      const r = await agent(ctx.app).post("/api/auth/sign-in", { email, password: "errada123456" })
      if (r.status === 429) break
    }
    const res = await agent(ctx.app).post("/api/auth/sign-in", { email, password })
    expect(res.status).toBe(429)
  })

  it("limita tentativas de login por IP", async () => {
    const strict = await createTestApp({ AUTH_THROTTLE_LIMIT: "3" })
    try {
      const statuses: number[] = []
      for (let i = 0; i < 4; i++) statuses.push((await agent(strict.app).post("/api/auth/sign-in", { email: "x@usp.br", password: "y" })).status)
      expect(statuses.at(-1)).toBe(429)
    } finally {
      await strict.close()
      process.env.AUTH_THROTTLE_LIMIT = "1000"
    }
  })

  it("sessões ficam associadas ao usuário certo", async () => {
    const u1 = await signUp(ctx.app)
    const u2 = await signUp(ctx.app)
    expect((await u1.agent.get("/api/auth/me")).body.user.id).toBe(u1.id)
    expect((await u2.agent.get("/api/auth/me")).body.user.id).toBe(u2.id)
    const n = await ctx.db.select().from(sessions)
    expect(n).toHaveLength(2)
  })
})
