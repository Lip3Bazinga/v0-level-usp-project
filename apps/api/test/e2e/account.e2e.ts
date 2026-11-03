import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { sql } from "drizzle-orm"
import { badges, enrollments, courses, lessonProgress, submissions, userBadges } from "@levelusp/db"
import type { ApiErrorBody, UserDataExport } from "@levelusp/contracts"
import { agent, bodyOf, countRows, CSRF_HEADER_NAME, createLesson, createTestApp, queryRows, signUp, type TestContext } from "./harness"
import { requireRow } from "@/common/database/rows"

describe("Conta e LGPD (e2e)", () => {
  let ctx: TestContext
  beforeAll(async () => {
    ctx = await createTestApp()
  })
  afterAll(() => ctx.close())
  beforeEach(() => ctx.reset())

  it("exporta todos os dados do usuário, sem hashes nem tokens", async () => {
    const user = await signUp(ctx.app)
    const other = await signUp(ctx.app)
    const lesson = await createLesson(ctx.db, { title: "Listas" })
    const course = requireRow(await ctx.db.insert(courses).values({ title: "Curso A", published: true }).returning(), "courses")
    await ctx.db.insert(enrollments).values({ userId: user.id, courseId: course.id })
    await ctx.db.insert(lessonProgress).values({ userId: user.id, lessonId: lesson.id, status: "completed", xpEarned: 50, completedAt: new Date().toISOString() })
    await ctx.db.insert(submissions).values({ userId: user.id, lessonId: lesson.id, files: [{ path: "main.py", content: "print(1)" }], status: "graded", passed: true })
    await ctx.db.insert(badges).values({ id: "b1", name: "B1", criteriaType: "manual" })
    await ctx.db.insert(userBadges).values({ userId: user.id, badgeId: "b1" })
    await user.agent.post("/api/me/notes", { title: "Minha nota", content: "conteúdo" })
    await other.agent.post("/api/me/notes", { title: "Nota alheia", content: "x" })
    await user.agent.post("/api/me/teacher-request", { motivation: "Quero ajudar meus colegas." })

    const response = await user.agent.get("/api/me/export")
    expect(response.status).toBe(200)
    expect(response.headers["content-disposition"]).toMatch(/attachment/)
    const body = bodyOf<UserDataExport>(response)
    expect(body.profile).toMatchObject({ id: user.id, email: user.email })
    expect(body.account).toMatchObject({ email: user.email })
    expect(body.lesson_progress).toHaveLength(1)
    expect(body.submissions).toHaveLength(1)
    expect(body.submissions[0]?.files[0]?.content).toBe("print(1)")
    expect(body.notes).toEqual([expect.objectContaining({ title: "Minha nota" })])
    expect(body.enrollments).toEqual([expect.objectContaining({ course_id: course.id, course_title: "Curso A" })])
    expect(body.badges).toEqual([expect.objectContaining({ badge_id: "b1" })])
    expect(body.certificates).toEqual([])
    expect(body.teacher_requests).toHaveLength(1)
    expect(body.sessions.length).toBeGreaterThan(0)

    const raw = JSON.stringify(body)
    expect(raw).not.toMatch(/password_hash|passwordHash|token_hash|\$argon2/)
    expect(raw).not.toContain("Nota alheia")
    const secrets = await queryRows<{ password_hash: string; session_id: string }>(
      ctx.db,
      sql`select users.password_hash, sessions.id as session_id from users join sessions on sessions.user_id = users.id where users.id = ${user.id}`,
    )
    for (const secret of secrets) {
      expect(raw).not.toContain(secret.password_hash)
      expect(raw).not.toContain(secret.session_id)
    }
  })

  it("exportação exige login", async () => {
    expect((await agent(ctx.app).get("/api/me/export")).status).toBe(401)
  })

  it("DELETE /me com senha errada responde 400 e não apaga nada", async () => {
    const user = await signUp(ctx.app)
    const wrong = await user.agent.raw.delete("/api/me").set(CSRF_HEADER_NAME, "1").send({ password: "senhaErrada999" })
    expect(wrong.status).toBe(400)
    expect(bodyOf<ApiErrorBody>(wrong).code).toBe("INVALID_PASSWORD")
    const missing = await user.agent.delete("/api/me")
    expect(missing.status).toBe(400)
    expect(await countRows(ctx.db, sql`select count(*)::int as n from users where id = ${user.id}`)).toBe(1)
    expect((await user.agent.get("/api/auth/me")).status).toBe(200)
  })

  it("DELETE /me exige o cabeçalho anti-CSRF", async () => {
    const user = await signUp(ctx.app)
    const response = await user.agent.raw.delete("/api/me").send({ password: user.password })
    expect(response.status).toBe(403)
    expect(await countRows(ctx.db, sql`select count(*)::int as n from users where id = ${user.id}`)).toBe(1)
  })

  it("DELETE /me com a senha certa apaga a conta em cascata e limpa o cookie", async () => {
    const user = await signUp(ctx.app)
    const keep = await signUp(ctx.app)
    await user.agent.post("/api/me/notes", { content: "vai sumir" })
    await keep.agent.post("/api/me/notes", { content: "fica" })

    const response = await user.agent.raw.delete("/api/me").set(CSRF_HEADER_NAME, "1").send({ password: user.password })
    expect(response.status).toBe(204)
    expect(response.headers["set-cookie"]?.[0] ?? "").toMatch(/lvl_session=;/)

    expect(await countRows(ctx.db, sql`select count(*)::int as n from users where id = ${user.id}`)).toBe(0)
    expect(await countRows(ctx.db, sql`select count(*)::int as n from profiles where id = ${user.id}`)).toBe(0)
    expect(await countRows(ctx.db, sql`select count(*)::int as n from sessions where user_id = ${user.id}`)).toBe(0)
    expect(await countRows(ctx.db, sql`select count(*)::int as n from notes`)).toBe(1)
    expect((await user.agent.get("/api/auth/me")).status).toBe(401)
    expect((await agent(ctx.app).post("/api/auth/sign-in", { email: user.email, password: user.password })).status).toBe(401)
  })

  it("o único administrador não pode apagar a própria conta", async () => {
    const admin = await signUp(ctx.app, "admin", ctx.db)
    const response = await admin.agent.raw.delete("/api/me").set(CSRF_HEADER_NAME, "1").send({ password: admin.password })
    expect(response.status).toBe(409)
    expect(bodyOf<ApiErrorBody>(response).code).toBe("LAST_ADMIN")
    await signUp(ctx.app, "admin", ctx.db)
    expect((await admin.agent.raw.delete("/api/me").set(CSRF_HEADER_NAME, "1").send({ password: admin.password })).status).toBe(204)
  })
})
