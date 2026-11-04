import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { sql } from "drizzle-orm"
import { profiles, sessions } from "@levelusp/db"
import type { ApiErrorBody, SessionResponse } from "@levelusp/contracts"
import { agent, bodyOf, countRows, createTestApp, queryRows, required, signUp, type TestContext } from "./harness"

describe("Autenticação (e2e)", () => {
  let ctx: TestContext
  beforeAll(async () => {
    ctx = await createTestApp()
  })
  afterAll(() => ctx.close())
  beforeEach(() => ctx.reset())

  it("cadastra, cria perfil e abre sessão com cookie httpOnly", async () => {
    const visitor = agent(ctx.app)
    const response = await visitor.post("/api/auth/sign-up", { email: "Ana@USP.br", password: "senhaForte123", full_name: "Ana" })
    expect(response.status).toBe(201)
    expect(bodyOf<SessionResponse>(response).user).toMatchObject({ email: "ana@usp.br", username: "ana", role: "student", current_streak: 1 })
    const cookie = response.headers["set-cookie"]?.[0] ?? ""
    expect(cookie).toMatch(/lvl_session=/)
    expect(cookie).toMatch(/HttpOnly/i)
    expect(cookie).toMatch(/SameSite=Lax/i)
    const me = await visitor.get("/api/auth/me")
    expect(me.status).toBe(200)
    expect(bodyOf<SessionResponse>(me).user.email).toBe("ana@usp.br")
  })

  it("guarda só o hash do token e da senha", async () => {
    const { id } = await signUp(ctx.app)
    const [stored] = await queryRows<{ password_hash: string; session_id: string }>(
      ctx.db,
      sql`select users.password_hash, sessions.id as session_id from users join sessions on sessions.user_id = users.id where users.id = ${id}`,
    )
    expect(stored?.password_hash).toMatch(/^\$argon2id\$/)
    expect(stored?.session_id).toMatch(/^[0-9a-f]{64}$/)
  })

  it("recusa e-mail duplicado e senha fraca", async () => {
    const { email } = await signUp(ctx.app)
    const duplicate = await agent(ctx.app).post("/api/auth/sign-up", { email, password: "senhaForte123", full_name: "X" })
    expect(duplicate.status).toBe(409)
    expect(bodyOf<ApiErrorBody>(duplicate).code).toBe("EMAIL_TAKEN")
    const weak = await agent(ctx.app).post("/api/auth/sign-up", { email: "b@usp.br", password: "123", full_name: "B" })
    expect(weak.status).toBe(400)
    expect(bodyOf<ApiErrorBody>(weak).code).toBe("VALIDATION")
  })

  it("exige o cabeçalho anti-CSRF em requisições que alteram estado", async () => {
    const response = await agent(ctx.app).raw.post("/api/auth/sign-in").send({ email: "a@usp.br", password: "x" })
    expect(response.status).toBe(403)
    expect(bodyOf<ApiErrorBody>(response).code).toBe("CSRF")
  })

  it("rotas protegidas respondem 401 sem sessão", async () => {
    const response = await agent(ctx.app).get("/api/auth/me")
    expect(response.status).toBe(401)
    expect(response.body).toMatchObject({ code: "UNAUTHENTICATED" })
  })

  it("login com senha errada não revela se o e-mail existe", async () => {
    const { email } = await signUp(ctx.app)
    const wrong = await agent(ctx.app).post("/api/auth/sign-in", { email, password: "errada123456" })
    const missing = await agent(ctx.app).post("/api/auth/sign-in", { email: "ninguem@usp.br", password: "errada123456" })
    expect(wrong.status).toBe(401)
    expect(missing.status).toBe(401)
    expect(bodyOf<ApiErrorBody>(wrong).message).toBe(bodyOf<ApiErrorBody>(missing).message)
  })

  it("logout revoga a sessão no servidor", async () => {
    const { agent: userAgent } = await signUp(ctx.app)
    expect((await userAgent.post("/api/auth/sign-out")).status).toBe(204)
    expect((await userAgent.get("/api/auth/me")).status).toBe(401)
    expect(await countRows(ctx.db, sql`select count(*)::int as n from sessions where revoked_at is null`)).toBe(0)
  })

  it("conta suspensa perde o acesso imediatamente", async () => {
    const { agent: userAgent, id, email, password } = await signUp(ctx.app)
    await ctx.db.update(profiles).set({ suspended: true }).where(sql`${profiles.id} = ${id}`)
    expect((await userAgent.get("/api/auth/me")).status).toBe(401)
    const again = await agent(ctx.app).post("/api/auth/sign-in", { email, password })
    expect(again.status).toBe(403)
  })

  it("redefine a senha com token de uso único e derruba as sessões antigas", async () => {
    const { agent: userAgent, email } = await signUp(ctx.app)
    await agent(ctx.app).post("/api/auth/password/forgot", { email })
    const token = decodeURIComponent(required(ctx.mail.sent[0]?.text.match(/token=([^\s]+)/)?.[1], "token no link"))
    const reset = await agent(ctx.app).post("/api/auth/password/reset", { token, password: "novaSenha456" })
    expect(reset.status).toBe(200)
    expect((await userAgent.get("/api/auth/me")).status).toBe(401)
    const reuse = await agent(ctx.app).post("/api/auth/password/reset", { token, password: "outraSenha789" })
    expect(reuse.status).toBe(400)
    expect((await agent(ctx.app).post("/api/auth/sign-in", { email, password: "novaSenha456" })).status).toBe(200)
  })

  it("pedido de redefinição para e-mail inexistente responde igual", async () => {
    const response = await agent(ctx.app).post("/api/auth/password/forgot", { email: "fantasma@usp.br" })
    expect(response.status).toBe(202)
    expect(ctx.mail.sent).toHaveLength(0)
  })

  it("bloqueia a conta após 10 senhas erradas, sem revelar o bloqueio", async () => {
    const { email, password } = await signUp(ctx.app)
    for (let i = 0; i < 10; i++) await agent(ctx.app).post("/api/auth/sign-in", { email, password: "errada123456" })
    const blocked = await agent(ctx.app).post("/api/auth/sign-in", { email, password })
    expect(blocked.status).toBe(401)
    const missing = await agent(ctx.app).post("/api/auth/sign-in", { email: "ninguem@usp.br", password })
    expect(bodyOf<ApiErrorBody>(blocked).message).toBe(bodyOf<ApiErrorBody>(missing).message)
  })

  it("bloqueio vencido zera a contagem (um erro não bloqueia de novo)", async () => {
    const { email, password } = await signUp(ctx.app)
    for (let i = 0; i < 10; i++) await agent(ctx.app).post("/api/auth/sign-in", { email, password: "errada123456" })
    await ctx.db.execute(sql`update users set locked_until = now() - interval '1 minute' where lower(email) = ${email}`)
    await agent(ctx.app).post("/api/auth/sign-in", { email, password: "errada123456" })
    expect((await agent(ctx.app).post("/api/auth/sign-in", { email, password })).status).toBe(200)
  })

  it("limita tentativas de login por IP", async () => {
    const strict = await createTestApp({ AUTH_THROTTLE_LIMIT: "3" })
    try {
      const statuses: number[] = []
      for (let attempt = 0; attempt < 4; attempt++) statuses.push((await agent(strict.app).post("/api/auth/sign-in", { email: "x@usp.br", password: "y" })).status)
      expect(statuses.at(-1)).toBe(429)
    } finally {
      await strict.close()
      process.env.AUTH_THROTTLE_LIMIT = "1000"
    }
  })

  it("sessões ficam associadas ao usuário certo", async () => {
    const firstUser = await signUp(ctx.app)
    const secondUser = await signUp(ctx.app)
    expect(bodyOf<SessionResponse>(await firstUser.agent.get("/api/auth/me")).user.id).toBe(firstUser.id)
    expect(bodyOf<SessionResponse>(await secondUser.agent.get("/api/auth/me")).user.id).toBe(secondUser.id)
    expect(await ctx.db.select().from(sessions)).toHaveLength(2)
  })
})
