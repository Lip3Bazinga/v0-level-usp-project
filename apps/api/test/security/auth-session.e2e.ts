import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { eq, sql } from "drizzle-orm"
import { passwordResetTokens, users } from "@levelusp/db"
import type { ApiErrorBody } from "@levelusp/contracts"
import { agent, bodyOf, countRows, createTestApp, CSRF_HEADER_NAME, queryRows, required, signUp, TEST_PASSWORD, type TestContext } from "../e2e/harness"
import { createCast, listRegisteredRoutes, concretePath, sessionCookieFrom, signInCookie } from "./support"

/*
 * Autenticação e sessão: força bruta (inclusive em paralelo), fixação e
 * revogação de sessão, tokens de redefinição, enumeração de usuários,
 * CSRF e contorno do limite por IP com X-Forwarded-For forjado.
 */

const MAX_FAILED_LOGINS = 10
const WRONG_PASSWORD = "senhaErrada999"

/** Corpo de erro sem o id de correlação (único por requisição). */
function withoutRequestId(body: ApiErrorBody): Omit<ApiErrorBody, "requestId"> {
  const { requestId: _requestId, ...rest } = body
  return rest
}

/** Token do último e-mail de redefinição/convite capturado pelo FakeMail. */
function lastMailedToken(ctx: TestContext): string {
  const text = required(ctx.mail.sent.at(-1)?.text, "e-mail enviado")
  return decodeURIComponent(required(/token=([^\s]+)/.exec(text)?.[1], "token no link"))
}

describe("Autenticação e sessão sob ataque", () => {
  let ctx: TestContext
  beforeAll(async () => {
    ctx = await createTestApp()
  })
  afterAll(() => ctx.close())
  beforeEach(() => ctx.reset())

  describe("força bruta", () => {
    it("bloqueia a conta após 10 senhas erradas e a resposta não revela o bloqueio", async () => {
      const victim = await signUp(ctx.app)
      const attacker = agent(ctx.app)
      const bodies = new Set<string>()
      for (let attempt = 0; attempt < MAX_FAILED_LOGINS + 2; attempt++) {
        const response = await attacker.post("/api/auth/sign-in", { email: victim.email, password: WRONG_PASSWORD })
        expect(response.status).toBe(401)
        bodies.add(JSON.stringify(withoutRequestId(bodyOf<ApiErrorBody>(response))))
      }
      expect(bodies.size).toBe(1)
      expect((await attacker.post("/api/auth/sign-in", { email: victim.email, password: TEST_PASSWORD })).status).toBe(401)
    })

    it("tentativas em PARALELO também bloqueiam (sem corrida no contador de falhas)", async () => {
      const victim = await signUp(ctx.app)
      const parallelAttempts = 3 * MAX_FAILED_LOGINS
      const responses = await Promise.all(
        Array.from({ length: parallelAttempts }, () => agent(ctx.app).post("/api/auth/sign-in", { email: victim.email, password: WRONG_PASSWORD })),
      )
      expect(responses.every((response) => response.status === 401)).toBe(true)
      const [state] = await queryRows<{ failed_login_count: number; locked: boolean }>(
        ctx.db,
        sql`select failed_login_count, locked_until > now() as locked from users where id = ${victim.id}`,
      )
      expect(state?.locked).toBe(true)
      expect(state?.failed_login_count).toBeGreaterThanOrEqual(MAX_FAILED_LOGINS)
      // Mesmo com a senha certa: a conta segue bloqueada.
      expect((await agent(ctx.app).post("/api/auth/sign-in", { email: victim.email, password: TEST_PASSWORD })).status).toBe(401)
    })

    it("senha certa enviada junto da rajada que atinge o limite não entra", async () => {
      const victim = await signUp(ctx.app)
      await ctx.db.update(users).set({ failedLoginCount: MAX_FAILED_LOGINS - 1 }).where(eq(users.id, victim.id))
      // A 10ª senha errada fecha a conta; a certa, logo depois, já encontra o bloqueio.
      await agent(ctx.app).post("/api/auth/sign-in", { email: victim.email, password: WRONG_PASSWORD })
      expect((await agent(ctx.app).post("/api/auth/sign-in", { email: victim.email, password: TEST_PASSWORD })).status).toBe(401)
    })
  })

  describe("enumeração de usuários", () => {
    it("login: e-mail inexistente e senha errada respondem igual", async () => {
      const victim = await signUp(ctx.app)
      const wrongPassword = await agent(ctx.app).post("/api/auth/sign-in", { email: victim.email, password: WRONG_PASSWORD })
      const unknownEmail = await agent(ctx.app).post("/api/auth/sign-in", { email: "ninguem@usp.br", password: WRONG_PASSWORD })
      expect(unknownEmail.status).toBe(wrongPassword.status)
      expect(withoutRequestId(bodyOf<ApiErrorBody>(unknownEmail))).toEqual(withoutRequestId(bodyOf<ApiErrorBody>(wrongPassword)))
    })

    it("esqueci a senha: mesma resposta e nenhum token na resposta", async () => {
      const victim = await signUp(ctx.app)
      const known = await agent(ctx.app).post("/api/auth/password/forgot", { email: victim.email })
      const unknown = await agent(ctx.app).post("/api/auth/password/forgot", { email: "ninguem@usp.br" })
      expect(known.status).toBe(202)
      expect(unknown.status).toBe(202)
      expect(known.body).toEqual(unknown.body)
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(JSON.stringify(known.body)).not.toContain(lastMailedToken(ctx))
    })

    it("conta convidada (sem senha) não aceita login com senha nenhuma", async () => {
      const cast = await createCast(ctx)
      expect((await cast.admin.agent.post("/api/admin/users/invite", { email: "convidado@usp.br" })).status).toBe(201)
      for (const password of ["", " ", "null", "undefined", TEST_PASSWORD]) {
        expect((await agent(ctx.app).post("/api/auth/sign-in", { email: "convidado@usp.br", password })).status).toBeGreaterThanOrEqual(400)
      }
    })
  })

  describe("sessão", () => {
    it("fixação: cookie plantado antes do login é descartado e não autentica", async () => {
      const victim = await signUp(ctx.app)
      const planted = "lvl_session=TokenPlantadoPeloAtacante0000000000000000000"
      const login = await agent(ctx.app).raw.post("/api/auth/sign-in").set(CSRF_HEADER_NAME, "1").set("Cookie", planted).send({ email: victim.email, password: TEST_PASSWORD })
      expect(login.status).toBe(200)
      const issued = sessionCookieFrom(login.headers["set-cookie"])
      expect(issued).not.toBe(planted)
      expect((await agent(ctx.app).raw.get("/api/auth/me").set("Cookie", planted)).status).toBe(401)
      expect((await agent(ctx.app).raw.get("/api/auth/me").set("Cookie", issued)).status).toBe(200)
    })

    it("logout revoga o token no servidor (cookie copiado não funciona mais)", async () => {
      const victim = await signUp(ctx.app)
      const stolen = await signInCookie(ctx.app, victim.email, victim.password)
      const attacker = agent(ctx.app)
      expect((await attacker.raw.get("/api/auth/me").set("Cookie", stolen)).status).toBe(200)
      expect((await attacker.raw.post("/api/auth/sign-out").set(CSRF_HEADER_NAME, "1").set("Cookie", stolen)).status).toBe(204)
      expect((await attacker.raw.get("/api/auth/me").set("Cookie", stolen)).status).toBe(401)
    })

    it("troca de senha derruba as outras sessões (a do atacante) e mantém a atual", async () => {
      const victim = await signUp(ctx.app)
      const stolen = await signInCookie(ctx.app, victim.email, victim.password)
      expect((await victim.agent.post("/api/auth/password/change", { current_password: victim.password, new_password: "novaSenha456" })).status).toBe(200)
      expect((await agent(ctx.app).raw.get("/api/auth/me").set("Cookie", stolen)).status).toBe(401)
      expect((await victim.agent.get("/api/auth/me")).status).toBe(200)
    })

    it("suspensão e invalidação administrativa derrubam a sessão na hora", async () => {
      const cast = await createCast(ctx)
      const stolen = await signInCookie(ctx.app, cast.studentA.email, cast.studentA.password)
      expect((await cast.admin.agent.patch(`/api/admin/users/${cast.studentA.id}`, { suspended: true })).status).toBe(200)
      expect((await agent(ctx.app).raw.get("/api/auth/me").set("Cookie", stolen)).status).toBe(401)
      expect((await cast.studentA.agent.get("/api/auth/me")).status).toBe(401)
      expect((await agent(ctx.app).post("/api/auth/sign-in", { email: cast.studentA.email, password: cast.studentA.password })).status).toBe(403)

      const other = await signInCookie(ctx.app, cast.studentB.email, cast.studentB.password)
      expect((await cast.admin.agent.post("/api/admin/sessions/invalidate", { user_id: cast.studentB.id })).status).toBe(204)
      expect((await agent(ctx.app).raw.get("/api/auth/me").set("Cookie", other)).status).toBe(401)
    })

    it("rebaixamento de papel vale na próxima requisição (papel não fica no cookie)", async () => {
      const cast = await createCast(ctx)
      expect((await cast.teacherA.agent.get("/api/teacher/courses")).status).toBe(200)
      expect((await cast.admin.agent.patch(`/api/admin/users/${cast.teacherA.id}`, { role: "student" })).status).toBe(200)
      expect((await cast.teacherA.agent.get("/api/teacher/courses")).status).toBe(403)
    })
  })

  describe("redefinição de senha", () => {
    it("token é de uso único, guardado só como hash, e redefinir derruba todas as sessões", async () => {
      const victim = await signUp(ctx.app)
      const session = await signInCookie(ctx.app, victim.email, victim.password)
      await agent(ctx.app).post("/api/auth/password/forgot", { email: victim.email })
      await new Promise((resolve) => setTimeout(resolve, 50))
      const token = lastMailedToken(ctx)
      expect(await countRows(ctx.db, sql`select count(*)::int as n from password_reset_tokens where token_hash = ${token}`)).toBe(0)
      expect((await agent(ctx.app).post("/api/auth/password/reset", { token, password: "novaSenha456" })).status).toBe(200)
      expect((await agent(ctx.app).post("/api/auth/password/reset", { token, password: "outraSenha789" })).status).toBe(400)
      expect((await agent(ctx.app).raw.get("/api/auth/me").set("Cookie", session)).status).toBe(401)
    })

    it("token expirado é recusado", async () => {
      const victim = await signUp(ctx.app)
      await agent(ctx.app).post("/api/auth/password/forgot", { email: victim.email })
      await new Promise((resolve) => setTimeout(resolve, 50))
      const token = lastMailedToken(ctx)
      await ctx.db.update(passwordResetTokens).set({ expiresAt: sql`now() - interval '1 minute'` }).where(eq(passwordResetTokens.userId, victim.id))
      const response = await agent(ctx.app).post("/api/auth/password/reset", { token, password: "novaSenha456" })
      expect(response.status).toBe(400)
      expect(bodyOf<ApiErrorBody>(response).code).toBe("INVALID_TOKEN")
    })

    it("links antigos morrem quando a senha muda (link vazado não redefine de novo)", async () => {
      const victim = await signUp(ctx.app)
      await agent(ctx.app).post("/api/auth/password/forgot", { email: victim.email })
      await new Promise((resolve) => setTimeout(resolve, 50))
      const leakedToken = lastMailedToken(ctx)
      await agent(ctx.app).post("/api/auth/password/forgot", { email: victim.email })
      await new Promise((resolve) => setTimeout(resolve, 50))
      const freshToken = lastMailedToken(ctx)
      expect(freshToken).not.toBe(leakedToken)
      expect((await agent(ctx.app).post("/api/auth/password/reset", { token: freshToken, password: "novaSenha456" })).status).toBe(200)
      expect((await agent(ctx.app).post("/api/auth/password/reset", { token: leakedToken, password: "doAtacante789" })).status).toBe(400)

      // O mesmo vale para a troca de senha com a senha atual.
      await agent(ctx.app).post("/api/auth/password/forgot", { email: victim.email })
      await new Promise((resolve) => setTimeout(resolve, 50))
      const pendingToken = lastMailedToken(ctx)
      const session = agent(ctx.app)
      await session.post("/api/auth/sign-in", { email: victim.email, password: "novaSenha456" })
      expect((await session.post("/api/auth/password/change", { current_password: "novaSenha456", new_password: "terceiraSenha123" })).status).toBe(200)
      expect((await agent(ctx.app).post("/api/auth/password/reset", { token: pendingToken, password: "doAtacante789" })).status).toBe(400)
    })

    it("token forjado, truncado ou com SQL não passa", async () => {
      for (const token of ["a", "' OR '1'='1", "x".repeat(43), "%00", "../../etc/passwd"]) {
        const response = await agent(ctx.app).post("/api/auth/password/reset", { token, password: "novaSenha456" })
        expect(response.status).toBe(400)
      }
    })
  })

  describe("CSRF", () => {
    it("toda rota que altera estado exige o cabeçalho anti-CSRF exato (inclusive com sessão válida)", async () => {
      const victim = await signUp(ctx.app)
      const routes = listRegisteredRoutes(ctx.app).filter((route) => route.method !== "GET" && route.path.startsWith("/api/") && !route.path.includes("{"))
      expect(routes.length).toBeGreaterThan(50)
      const violations: string[] = []
      for (const route of routes) {
        const url = concretePath(route.path)
        for (const headerValue of [undefined, "0", "true"]) {
          let request = victim.agent.raw[route.method === "DELETE" ? "delete" : route.method === "PUT" ? "put" : route.method === "PATCH" ? "patch" : "post"](url)
          if (headerValue !== undefined) request = request.set(CSRF_HEADER_NAME, headerValue)
          // Formulário HTML forjado: text/plain é "simple request" (sem preflight).
          const response = await request.set("Content-Type", "text/plain").send("email=a@usp.br")
          if (response.status !== 403 || bodyOf<ApiErrorBody>(response).code !== "CSRF") violations.push(`${route.method} ${route.path} (${headerValue ?? "sem cabeçalho"}) → ${response.status}`)
        }
      }
      expect(violations).toEqual([])
      expect((await victim.agent.get("/api/auth/me")).status).toBe(200)
    })

    it("a API não habilita CORS: origem estranha não recebe Access-Control-Allow-*", async () => {
      const preflight = await agent(ctx.app).raw.options("/api/auth/sign-in").set("Origin", "https://evil.example").set("Access-Control-Request-Method", "POST").set("Access-Control-Request-Headers", CSRF_HEADER_NAME)
      expect(preflight.headers["access-control-allow-origin"]).toBeUndefined()
      expect(preflight.headers["access-control-allow-credentials"]).toBeUndefined()
      const simple = await agent(ctx.app).raw.get("/api/courses").set("Origin", "https://evil.example")
      expect(simple.headers["access-control-allow-origin"]).toBeUndefined()
    })
  })
})

describe("Limite por IP e X-Forwarded-For forjado", () => {
  const ATTEMPTS_ALLOWED = 5
  const previousLimit = process.env.AUTH_THROTTLE_LIMIT

  afterEach(() => {
    process.env.AUTH_THROTTLE_LIMIT = previousLimit
  })

  async function attempts(ctx: TestContext, forwardedFor: (attempt: number) => string | undefined): Promise<number[]> {
    const statuses: number[] = []
    for (let attempt = 0; attempt < ATTEMPTS_ALLOWED + 3; attempt++) {
      let request = agent(ctx.app).raw.post("/api/auth/sign-in").set(CSRF_HEADER_NAME, "1")
      const header = forwardedFor(attempt)
      if (header !== undefined) request = request.set("X-Forwarded-For", header)
      statuses.push((await request.send({ email: `alvo${attempt}@usp.br`, password: WRONG_PASSWORD })).status)
    }
    return statuses
  }

  it("atrás do proxy (TRUST_PROXY=true): trocar o X-Forwarded-For do cliente não zera o limite", async () => {
    // Topologia real: Cloudflare/Caddy acrescentam o IP verdadeiro à DIREITA; o Next repassa o
    // cabeçalho sem alterar (verificado em docs/v2/seguranca.md). O que o cliente forja fica à esquerda.
    const ctx = await createTestApp({ TRUST_PROXY: "true" })
    try {
      process.env.AUTH_THROTTLE_LIMIT = String(ATTEMPTS_ALLOWED)
      const statuses = await attempts(ctx, (attempt) => `10.0.${attempt}.1, 198.51.100.${attempt}, 203.0.113.7`)
      expect(statuses.slice(0, ATTEMPTS_ALLOWED).every((status) => status === 401)).toBe(true)
      expect(statuses.slice(ATTEMPTS_ALLOWED)).toEqual([429, 429, 429])
    } finally {
      await ctx.close()
    }
  })

  it("sem proxy confiável (TRUST_PROXY=false): o cabeçalho é ignorado por completo", async () => {
    const ctx = await createTestApp({ TRUST_PROXY: "false" })
    try {
      process.env.AUTH_THROTTLE_LIMIT = String(ATTEMPTS_ALLOWED)
      const statuses = await attempts(ctx, (attempt) => `198.51.100.${attempt}`)
      expect(statuses.slice(ATTEMPTS_ALLOWED)).toEqual([429, 429, 429])
    } finally {
      await ctx.close()
    }
  })
})
