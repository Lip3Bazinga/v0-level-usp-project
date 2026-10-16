import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { sql } from "drizzle-orm"
import { badges, enrollments, courses, lessonProgress, submissions, userBadges } from "@levelusp/db"
import { agent, createLesson, createTestApp, signUp, type TestContext } from "./harness"

const count = async (ctx: TestContext, q: ReturnType<typeof sql>) => ((await ctx.db.execute(q)).rows[0] as { n: number }).n

describe("Conta e LGPD (e2e)", () => {
  let ctx: TestContext
  beforeAll(async () => {
    ctx = await createTestApp()
  })
  afterAll(() => ctx.close())
  beforeEach(() => ctx.reset())

  it("exporta todos os dados do usuário, sem hashes nem tokens", async () => {
    const u = await signUp(ctx.app)
    const other = await signUp(ctx.app)
    const lesson = await createLesson(ctx.db, { title: "Listas" })
    const [course] = await ctx.db.insert(courses).values({ title: "Curso A", published: true }).returning()
    await ctx.db.insert(enrollments).values({ userId: u.id, courseId: course!.id })
    await ctx.db.insert(lessonProgress).values({ userId: u.id, lessonId: lesson.id, status: "completed", xpEarned: 50, completedAt: new Date().toISOString() })
    await ctx.db.insert(submissions).values({ userId: u.id, lessonId: lesson.id, files: [{ path: "main.py", content: "print(1)" }], status: "graded", passed: true })
    await ctx.db.insert(badges).values({ id: "b1", name: "B1", criteriaType: "manual" })
    await ctx.db.insert(userBadges).values({ userId: u.id, badgeId: "b1" })
    await u.agent.post("/api/me/notes", { title: "Minha nota", content: "conteúdo" })
    await other.agent.post("/api/me/notes", { title: "Nota alheia", content: "x" })
    await u.agent.post("/api/me/teacher-request", { motivation: "Quero ajudar meus colegas." })

    const res = await u.agent.get("/api/me/export")
    expect(res.status).toBe(200)
    expect(res.headers["content-disposition"]).toMatch(/attachment/)
    const body = res.body
    expect(body.profile).toMatchObject({ id: u.id, email: u.email })
    expect(body.account).toMatchObject({ email: u.email })
    expect(body.lesson_progress).toHaveLength(1)
    expect(body.submissions).toHaveLength(1)
    expect(body.submissions[0].files[0].content).toBe("print(1)")
    expect(body.notes).toEqual([expect.objectContaining({ title: "Minha nota" })])
    expect(body.enrollments).toEqual([expect.objectContaining({ course_id: course!.id, course_title: "Curso A" })])
    expect(body.badges).toEqual([expect.objectContaining({ badge_id: "b1" })])
    expect(body.certificates).toEqual([])
    expect(body.teacher_requests).toHaveLength(1)
    expect(body.sessions.length).toBeGreaterThan(0)

    const raw = JSON.stringify(body)
    expect(raw).not.toMatch(/password_hash|passwordHash|token_hash|\$argon2/)
    expect(raw).not.toContain("Nota alheia")
    const secrets = await ctx.db.execute(sql`select u.password_hash, s.id from users u join sessions s on s.user_id = u.id where u.id = ${u.id}`)
    for (const row of secrets.rows as { password_hash: string; id: string }[]) {
      expect(raw).not.toContain(row.password_hash)
      expect(raw).not.toContain(row.id)
    }
  })

  it("exportação exige login", async () => {
    expect((await agent(ctx.app).get("/api/me/export")).status).toBe(401)
  })

  it("DELETE /me com senha errada responde 400 e não apaga nada", async () => {
    const u = await signUp(ctx.app)
    const wrong = await u.agent.raw.delete("/api/me").set("x-levelusp-csrf", "1").send({ password: "senhaErrada999" })
    expect(wrong.status).toBe(400)
    expect(wrong.body.code).toBe("INVALID_PASSWORD")
    const missing = await u.agent.delete("/api/me")
    expect(missing.status).toBe(400)
    expect(await count(ctx, sql`select count(*)::int as n from users where id = ${u.id}`)).toBe(1)
    expect((await u.agent.get("/api/auth/me")).status).toBe(200)
  })

  it("DELETE /me exige o cabeçalho anti-CSRF", async () => {
    const u = await signUp(ctx.app)
    const res = await u.agent.raw.delete("/api/me").send({ password: u.password })
    expect(res.status).toBe(403)
    expect(await count(ctx, sql`select count(*)::int as n from users where id = ${u.id}`)).toBe(1)
  })

  it("DELETE /me com a senha certa apaga a conta em cascata e limpa o cookie", async () => {
    const u = await signUp(ctx.app)
    const keep = await signUp(ctx.app)
    await u.agent.post("/api/me/notes", { content: "vai sumir" })
    await keep.agent.post("/api/me/notes", { content: "fica" })

    const res = await u.agent.raw.delete("/api/me").set("x-levelusp-csrf", "1").send({ password: u.password })
    expect(res.status).toBe(204)
    expect(res.headers["set-cookie"]?.[0] ?? "").toMatch(/lvl_session=;/)

    expect(await count(ctx, sql`select count(*)::int as n from users where id = ${u.id}`)).toBe(0)
    expect(await count(ctx, sql`select count(*)::int as n from profiles where id = ${u.id}`)).toBe(0)
    expect(await count(ctx, sql`select count(*)::int as n from sessions where user_id = ${u.id}`)).toBe(0)
    expect(await count(ctx, sql`select count(*)::int as n from notes`)).toBe(1)
    expect((await u.agent.get("/api/auth/me")).status).toBe(401)
    expect((await agent(ctx.app).post("/api/auth/sign-in", { email: u.email, password: u.password })).status).toBe(401)
  })

  it("o único administrador não pode apagar a própria conta", async () => {
    const admin = await signUp(ctx.app, "admin", ctx.db)
    const res = await admin.agent.raw.delete("/api/me").set("x-levelusp-csrf", "1").send({ password: admin.password })
    expect(res.status).toBe(409)
    expect(res.body.code).toBe("LAST_ADMIN")
    await signUp(ctx.app, "admin", ctx.db)
    expect((await admin.agent.raw.delete("/api/me").set("x-levelusp-csrf", "1").send({ password: admin.password })).status).toBe(204)
  })
})
