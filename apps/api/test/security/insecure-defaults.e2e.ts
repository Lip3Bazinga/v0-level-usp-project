import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { isLocalDatabaseUrl, PUBLIC_DEMO_PASSWORD, resolveDemoPassword } from "@levelusp/db"
import type { ApiErrorBody, SubmissionResult } from "@levelusp/contracts"
import { loadEnv } from "@/config/env"
import { agent, bodyOf, createLesson, createTestApp, signUp, type TestContext } from "../e2e/harness"
import { signInCookie } from "./support"

/*
 * Padrões inseguros (OWASP A05:2021 / API8:2023): cabeçalhos, Swagger e
 * depuração expostos, erros verbosos, segredos fracos aceitos na partida,
 * credenciais de demonstração e flags do cookie em produção.
 */

const PROD_ENV = {
  APP_ENV: "prod",
  PUBLIC_BASE_URL: "https://levelusp.teste.example",
  RUNNER_TOKEN: "f3a9c1d7e2b84a6c9d0e1f2a3b4c5d6e",
  TRUST_PROXY: "true",
}

describe("Padrões inseguros", () => {
  describe("com os valores que produção assume", () => {
    let ctx: TestContext
    beforeAll(async () => {
      // O banco de teste usa senha trivial (recusada com APP_ENV=prod); por isso a aplicação sobe com
      // os mesmos valores que prod assume por padrão — os padrões em si são provados em "configuração validada na partida".
      ctx = await createTestApp({ PUBLIC_BASE_URL: PROD_ENV.PUBLIC_BASE_URL, COOKIE_SECURE: "true", SWAGGER_ENABLED: "false", TRUST_PROXY: "true" })
    })
    afterAll(() => ctx.close())

    it("Swagger e o JSON da especificação não existem", async () => {
      for (const path of ["/api/docs", "/api/docs/", "/api/docs-json", "/api/docs/swagger-ui-init.js", "/api-json", "/swagger"]) {
        expect((await agent(ctx.app).get(path)).status).toBe(404)
      }
    })

    it("cookie de sessão sai com Secure, HttpOnly e SameSite=Lax", async () => {
      const response = await agent(ctx.app).post("/api/auth/sign-up", { email: "prod@usp.br", password: "senhaForte123", full_name: "Prod" })
      const cookie = String(response.headers["set-cookie"]?.[0] ?? "")
      expect(cookie).toMatch(/lvl_session=/)
      expect(cookie).toMatch(/;\s*Secure/i)
      expect(cookie).toMatch(/;\s*HttpOnly/i)
      expect(cookie).toMatch(/;\s*SameSite=Lax/i)
      expect(cookie).toMatch(/;\s*Path=\//i)
      expect(cookie).not.toMatch(/Domain=/i)
    })

    it("cabeçalhos de segurança da API (helmet) e nenhum X-Powered-By", async () => {
      const response = await agent(ctx.app).get("/api/courses")
      expect(response.headers["x-powered-by"]).toBeUndefined()
      expect(response.headers["content-security-policy"]).toMatch(/default-src 'none'/)
      expect(response.headers["content-security-policy"]).toMatch(/frame-ancestors 'none'/)
      expect(response.headers["x-content-type-options"]).toBe("nosniff")
      expect(response.headers["x-frame-options"]).toBe("SAMEORIGIN")
      expect(response.headers["strict-transport-security"]).toMatch(/max-age=\d+/)
      expect(response.headers["referrer-policy"]).toBe("no-referrer")
      expect(response.headers["cross-origin-resource-policy"]).toBe("same-site")
    })

    it("exportação LGPD não fica em cache compartilhado", async () => {
      // Cookie Secure não volta por http no supertest: reenviamos o token à mão.
      const user = await signUp(ctx.app)
      const cookie = await signInCookie(ctx.app, user.email, user.password)
      const exported = await agent(ctx.app).raw.get("/api/me/export").set("Cookie", cookie)
      expect(exported.status).toBe(200)
      expect(exported.headers["cache-control"]).toBe("no-store")
      expect(exported.headers["content-disposition"]).toMatch(/^attachment/)
    })
  })

  describe("erros", () => {
    let ctx: TestContext
    beforeAll(async () => {
      ctx = await createTestApp({ COOKIE_SECURE: "false" })
      await ctx.reset()
    })
    afterAll(() => ctx.close())

    it("exceção interna vira 500 genérico: sem stack, caminho, SQL nem mensagem interna", async () => {
      const student = await signUp(ctx.app)
      const lesson = await createLesson(ctx.db, { testCases: [{ id: "c1", kind: "io", stdin: "", expected_stdout: "1", match: "trimmed" }] })
      ctx.runner.respond(() => {
        throw new Error("SEGREDO INTERNO: falha em /app/dist/infra/runner.js:42 select * from users")
      })
      const response = await student.agent.post(`/api/lessons/${lesson.id}/submissions`, { files: [{ path: "main.py", content: "print(1)" }] })
      expect(response.status).toBeGreaterThanOrEqual(500)
      const body = bodyOf<ApiErrorBody | SubmissionResult>(response)
      expect(JSON.stringify(body)).not.toMatch(/SEGREDO|\/app\/|select \*|at [A-Za-z]+ \(|\.js:\d+/)
      expect(response.headers["content-type"]).toMatch(/^application\/json/)
    })

    it("cadastro concorrente com o mesmo e-mail nunca vaza erro do banco (unique violation)", async () => {
      const email = `corrida${Date.now()}@usp.br`
      const responses = await Promise.all(Array.from({ length: 6 }, () => agent(ctx.app).post("/api/auth/sign-up", { email, password: "senhaForte123", full_name: "Corrida" })))
      const statuses = responses.map((response) => response.status)
      expect(statuses.filter((status) => status === 201)).toHaveLength(1)
      expect(statuses.every((status) => status === 201 || status === 409)).toBe(true)
      for (const response of responses) expect(JSON.stringify(response.body)).not.toMatch(/duplicate key|users_email|constraint/i)
    })

    it("readiness não expõe URL do banco, hosts internos nem segredos", async () => {
      const response = await agent(ctx.app).get("/api/health/ready")
      expect(JSON.stringify(response.body)).not.toMatch(/postgres:\/\/|runner-token|localhost:5432|RUNNER_URL/)
    })
  })

  describe("configuração validada na partida", () => {
    const base = { DATABASE_URL: "postgres://levelusp:Xk3v9QmLp2Rt7Wz@db:5432/levelusp", ...PROD_ENV }

    it("produção recusa token do executor publicado no repositório, senha trivial do banco e URL http", () => {
      expect(() => loadEnv({ ...base, RUNNER_TOKEN: "dev-runner-token-0123456789abcdef" })).toThrow(/RUNNER_TOKEN/)
      expect(() => loadEnv({ ...base, RUNNER_TOKEN: "curto" })).toThrow(/RUNNER_TOKEN/)
      expect(() => loadEnv({ ...base, DATABASE_URL: "postgres://levelusp:levelusp@db:5432/levelusp" })).toThrow(/DATABASE_URL/)
      expect(() => loadEnv({ ...base, PUBLIC_BASE_URL: "http://levelusp.teste.example" })).toThrow(/https/)
      expect(() => loadEnv({ ...base, DATABASE_URL: "" })).toThrow(/DATABASE_URL/)
    })

    it("padrões de produção: cookie Secure, Swagger desligado, TLS obrigatório no SMTP", () => {
      const env = loadEnv({ ...base, PUBLIC_BASE_URL: "https://levelusp.teste.example" })
      expect(env).toMatchObject({ COOKIE_SECURE: true, SWAGGER_ENABLED: false, SMTP_REQUIRE_TLS: true })
    })

    it("seed: senha pública de demonstração só em banco local; servidor exige senha própria", () => {
      expect(isLocalDatabaseUrl("postgres://u:p@localhost:5432/x")).toBe(true)
      expect(isLocalDatabaseUrl("postgres://u:p@postgres:5432/x")).toBe(false)
      expect(resolveDemoPassword("postgres://u:p@127.0.0.1:5432/x", undefined)).toBe(PUBLIC_DEMO_PASSWORD)
      expect(() => resolveDemoPassword("postgres://u:p@postgres:5432/x", undefined)).toThrow(/SEED_DEMO_PASSWORD/)
      expect(() => resolveDemoPassword("postgres://u:p@postgres:5432/x", "")).toThrow(/SEED_DEMO_PASSWORD/)
      expect(() => resolveDemoPassword("postgres://u:p@postgres:5432/x", "curta")).toThrow(/12\+/)
      expect(resolveDemoPassword("postgres://u:p@postgres:5432/x", "senhaDemoLongaDoServidor")).toBe("senhaDemoLongaDoServidor")
    })
  })
})
