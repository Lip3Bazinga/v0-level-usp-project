import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { Response } from "supertest"
import type { ApiErrorBody } from "@levelusp/contracts"
import { agent, bodyOf, createTestApp, CSRF_HEADER_NAME, signUp, type Agent, type TestContext } from "../e2e/harness"
import { concretePath, createCast, listRegisteredRoutes, routeKey, signInCookie, type Cast, type RegisteredRoute } from "./support"

/*
 * Ataque "autorização só na interface" (falha típica de apps gerados por IA):
 * a matriz é montada a partir das rotas REALMENTE registradas no Express. Uma
 * rota nova sem classificação aqui quebra o teste — quem a criou precisa
 * decidir, conscientemente, quem pode chamá-la.
 */

type Access = "public" | "user" | "teacher" | "admin"

/** Montagens de middleware (CSRF) que o Express lista como rotas `all`. */
const MIDDLEWARE_MOUNTS = new Set(["/api", "/api{/*splat}"])

const PUBLIC_ROUTES = [
  "GET /api/health/live",
  "GET /api/health/ready",
  "POST /api/auth/sign-up",
  "POST /api/auth/sign-in",
  "POST /api/auth/password/forgot",
  "POST /api/auth/password/reset",
  "GET /api/leaderboard",
  "GET /api/users/by-username/:username",
  "GET /api/users/:id/activity",
  "GET /api/users/:id/badges",
  "GET /api/badges",
  "GET /api/modules",
  "GET /api/modules/lesson-counts",
  "GET /api/courses",
  "GET /api/courses/:id",
  "GET /api/courses/:id/lessons",
  "GET /api/lessons/summaries",
  "GET /api/lessons",
  "GET /api/lessons/:id",
  "GET /api/certificates/:code",
  "GET /api/certificates/:code/pdf",
  "GET /api/library",
  "GET /api/files/:name",
] as const

const USER_ROUTES = [
  "POST /api/uploads/images",
  "POST /api/auth/sign-out",
  "GET /api/auth/me",
  "POST /api/auth/password/change",
  "PATCH /api/me/profile",
  "DELETE /api/me",
  "GET /api/me/export",
  "POST /api/courses/:id/enrollment",
  "DELETE /api/courses/:id/enrollment",
  "GET /api/me/enrollments",
  "GET /api/me/progress",
  "GET /api/me/progress/completed",
  "GET /api/lessons/:id/snapshot",
  "PUT /api/lessons/:id/snapshot",
  "POST /api/lessons/:id/submissions",
  "POST /api/lessons/:id/complete",
  "GET /api/lessons/:id/quiz",
  "POST /api/lessons/:id/quiz/submissions",
  "GET /api/courses/:id/exam",
  "POST /api/courses/:id/exam/attempts",
  "POST /api/courses/:id/exam/submit",
  "POST /api/courses/:id/certificate",
  "GET /api/courses/:id/certificate",
  "GET /api/me/certificates",
  "GET /api/me/notes",
  "POST /api/me/notes",
  "PATCH /api/me/notes/:id",
  "DELETE /api/me/notes/:id",
  "GET /api/me/notifications",
  "POST /api/me/notifications/read-all",
  "POST /api/me/notifications/:id/read",
  "POST /api/me/teacher-request",
  "GET /api/me/teacher-request",
] as const

const TEACHER_ROUTES = [
  "GET /api/teacher/courses",
  "POST /api/courses",
  "PATCH /api/courses/:id",
  "DELETE /api/courses/:id",
  "PATCH /api/courses/:id/publish",
  "PUT /api/courses/:id/lessons/order",
  "POST /api/courses/:id/lessons",
  "DELETE /api/courses/:id/lessons/:lessonId",
  "GET /api/teacher/lessons",
  "GET /api/teacher/metrics",
  "GET /api/lessons/:id/authoring",
  "POST /api/lessons",
  "PATCH /api/lessons/:id",
  "DELETE /api/lessons/:id",
  "PATCH /api/lessons/:id/publish",
  "GET /api/lessons/:id/quiz/authoring",
  "PUT /api/lessons/:id/quiz",
  "POST /api/library/requests",
  "GET /api/me/library/requests",
] as const

const ADMIN_ROUTES = [
  "POST /api/modules",
  "PATCH /api/modules/:id",
  "DELETE /api/modules/:id",
  "GET /api/admin/exams",
  "GET /api/admin/exams/:examId/questions",
  "POST /api/admin/exams/:examId/questions",
  "PATCH /api/admin/exam-questions/:id",
  "GET /api/admin/library",
  "PATCH /api/admin/library/:id",
  "GET /api/admin/library/requests",
  "POST /api/admin/library/requests/:id/review",
  "GET /api/admin/teacher-approvals",
  "POST /api/admin/teacher-approvals/:id/approve",
  "POST /api/admin/teacher-approvals/:id/reject",
  "GET /api/admin/users",
  "POST /api/admin/users/invite",
  "PATCH /api/admin/users/:id",
  "DELETE /api/admin/users/:id",
  "POST /api/admin/users/:id/reset-progress",
  "POST /api/admin/users/:id/password-reset",
  "GET /api/admin/users/:id/export",
  "POST /api/admin/sessions/invalidate",
  "GET /api/admin/metrics",
  "GET /api/admin/activity/recent",
  "GET /api/admin/activity/daily",
  "GET /api/admin/analytics",
  "GET /api/admin/lessons",
  "GET /api/admin/settings",
  "PUT /api/admin/settings",
  "GET /api/admin/audit",
  "GET /api/admin/badges",
  "POST /api/admin/badges",
  "PATCH /api/admin/badges/:id",
  "DELETE /api/admin/badges/:id",
] as const

const MATRIX: ReadonlyMap<string, Access> = new Map<string, Access>([
  ...PUBLIC_ROUTES.map((key): [string, Access] => [key, "public"]),
  ...USER_ROUTES.map((key): [string, Access] => [key, "user"]),
  ...TEACHER_ROUTES.map((key): [string, Access] => [key, "teacher"]),
  ...ADMIN_ROUTES.map((key): [string, Access] => [key, "admin"]),
])

/** Rotas que encerram a sessão de quem chama: a prova positiva usa uma conta descartável. */
const SESSION_ENDING_ROUTES = new Set(["POST /api/auth/sign-out"])

const ROLE_DENIED_MESSAGE = "Você não tem permissão para esta ação."

function send(client: Agent, route: RegisteredRoute): Promise<Response> {
  const url = concretePath(route.path)
  switch (route.method) {
    case "GET":
      return client.get(url).then((response) => response)
    case "POST":
      return client.post(url, {}).then((response) => response)
    case "PUT":
      return client.put(url, {}).then((response) => response)
    case "PATCH":
      return client.patch(url, {}).then((response) => response)
    case "DELETE":
      return client.delete(url).then((response) => response)
    default:
      throw new Error(`método sem cliente no teste: ${route.method}`)
  }
}

function isRoleDenied(response: Response): boolean {
  return response.status === 403 && bodyOf<ApiErrorBody>(response).message === ROLE_DENIED_MESSAGE
}

describe("Matriz de autorização gerada das rotas registradas (ataque: autorização só na UI)", () => {
  let ctx: TestContext
  let cast: Cast
  let routes: RegisteredRoute[]

  beforeAll(async () => {
    ctx = await createTestApp()
    await ctx.reset()
    cast = await createCast(ctx)
    routes = listRegisteredRoutes(ctx.app).filter((route) => !MIDDLEWARE_MOUNTS.has(route.path))
  })
  afterAll(() => ctx.close())

  it("toda rota registrada está classificada (rota nova sem decisão de acesso quebra o teste)", () => {
    const unclassified = routes.map(routeKey).filter((key) => !MATRIX.has(key))
    expect(unclassified).toEqual([])
  })

  it("a matriz não tem rota fantasma (classificação de rota que não existe mais)", () => {
    const registered = new Set(routes.map(routeKey))
    expect([...MATRIX.keys()].filter((key) => !registered.has(key))).toEqual([])
  })

  it("sem sessão: 401 em tudo que não está na lista explícita de rotas públicas", async () => {
    const anonymous = agent(ctx.app)
    const violations: string[] = []
    for (const route of routes) {
      const access = MATRIX.get(routeKey(route))
      const response = await send(anonymous, route)
      if (access === "public" && (response.status === 401 || response.status === 403)) violations.push(`${routeKey(route)} pública respondeu ${response.status}`)
      if (access !== "public" && response.status !== 401) violations.push(`${routeKey(route)} sem sessão respondeu ${response.status}`)
    }
    expect(violations).toEqual([])
  })

  it("cookie de sessão forjado ou revogado não abre rota protegida", async () => {
    const anonymous = agent(ctx.app)
    const revoked = await signUp(ctx.app)
    const revokedCookie = await signInCookie(ctx.app, revoked.email, revoked.password)
    expect(revokedCookie).toMatch(/lvl_session=.{40,}/)
    expect((await anonymous.raw.post("/api/auth/sign-out").set("Cookie", revokedCookie).set(CSRF_HEADER_NAME, "1")).status).toBe(204)
    const cookies = ["lvl_session=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", `lvl_session=${"A".repeat(4000)}`, "lvl_session=", revokedCookie, "lvl_session[]=x"]
    for (const cookie of cookies) {
      expect((await anonymous.raw.get("/api/auth/me").set("Cookie", cookie)).status).toBe(401)
      expect((await anonymous.raw.get("/api/admin/users").set("Cookie", cookie)).status).toBe(401)
    }
  })

  it("aluno recebe 403 em toda rota de professor e de admin", async () => {
    const violations: string[] = []
    for (const route of routes) {
      const access = MATRIX.get(routeKey(route))
      if (access !== "teacher" && access !== "admin") continue
      const response = await send(cast.studentA.agent, route)
      if (!isRoleDenied(response)) violations.push(`${routeKey(route)} → ${response.status}`)
    }
    expect(violations).toEqual([])
  })

  it("professor recebe 403 em toda rota de admin", async () => {
    const violations: string[] = []
    for (const route of routes) {
      if (MATRIX.get(routeKey(route)) !== "admin") continue
      const response = await send(cast.teacherA.agent, route)
      if (!isRoleDenied(response)) violations.push(`${routeKey(route)} → ${response.status}`)
    }
    expect(violations).toEqual([])
  })

  it("o papel mínimo de cada rota passa pela autorização (a matriz não está fechada demais)", async () => {
    const violations: string[] = []
    for (const route of routes) {
      const access = MATRIX.get(routeKey(route))
      if (access !== "user" && access !== "teacher") continue
      const caller = SESSION_ENDING_ROUTES.has(routeKey(route))
        ? await signUp(ctx.app)
        : access === "teacher"
          ? cast.teacherB
          : cast.studentB
      const response = await send(caller.agent, route)
      if (response.status === 401 || isRoleDenied(response)) violations.push(`${routeKey(route)} → ${response.status}`)
    }
    expect(violations).toEqual([])
  })

  it("método não registrado numa rota existente não vira atalho (TRACE/PUT inesperado)", async () => {
    const anonymous = agent(ctx.app)
    expect((await anonymous.raw.trace("/api/admin/users")).status).not.toBe(200)
    expect((await anonymous.put("/api/admin/users")).status).toBe(404)
    expect((await anonymous.delete("/api/admin/audit")).status).toBe(404)
  })
})
