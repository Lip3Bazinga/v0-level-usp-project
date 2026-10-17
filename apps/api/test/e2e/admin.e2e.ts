import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { sql } from "drizzle-orm"
import { badges, lessonProgress, profiles, submissions, userBadges } from "@levelusp/db"
import { agent, createLesson, createTestApp, signUp, type TestContext } from "./harness"

const count = async (ctx: TestContext, q: ReturnType<typeof sql>) => ((await ctx.db.execute(q)).rows[0] as { n: number }).n
const auditActions = async (ctx: TestContext) =>
  (await ctx.db.execute(sql`select action, severity, target from audit_log order by created_at`)).rows as { action: string; severity: string; target: string }[]

describe("Administração (e2e)", () => {
  let ctx: TestContext
  beforeAll(async () => {
    ctx = await createTestApp()
  })
  afterAll(() => ctx.close())
  beforeEach(() => ctx.reset())

  it("aluno e professor recebem 403 em /admin/*; anônimo recebe 401", async () => {
    const student = await signUp(ctx.app)
    const teacher = await signUp(ctx.app, "teacher", ctx.db)
    const target = await signUp(ctx.app)
    for (const u of [student, teacher]) {
      const calls = [
        () => u.agent.get("/api/admin/users"),
        () => u.agent.get("/api/admin/metrics"),
        () => u.agent.get("/api/admin/analytics"),
        () => u.agent.get("/api/admin/audit"),
        () => u.agent.get("/api/admin/settings"),
        () => u.agent.get("/api/admin/teacher-approvals"),
        () => u.agent.get("/api/admin/library"),
        () => u.agent.get(`/api/admin/users/${target.id}/export`),
        () => u.agent.patch(`/api/admin/users/${target.id}`, { role: "admin" }),
        () => u.agent.delete(`/api/admin/users/${target.id}`),
        () => u.agent.post(`/api/admin/users/${target.id}/reset-progress`),
        () => u.agent.post("/api/admin/sessions/invalidate", {}),
        () => u.agent.post("/api/admin/badges", { id: "x1", name: "X", criteria_type: "manual" }),
      ]
      for (const call of calls) expect((await call()).status).toBe(403)
    }
    expect((await agent(ctx.app).get("/api/admin/users")).status).toBe(401)
    // Nada mudou
    const t = await ctx.db.query.profiles.findFirst({ where: sql`${profiles.id} = ${target.id}` })
    expect(t?.role).toBe("student")
  })

  it("lista usuários e altera papel de outra pessoa com auditoria", async () => {
    const admin = await signUp(ctx.app, "admin", ctx.db)
    const u = await signUp(ctx.app)
    const list = await admin.agent.get("/api/admin/users")
    expect(list.status).toBe(200)
    expect(list.body.map((p: { id: string }) => p.id).sort()).toEqual([admin.id, u.id].sort())

    const res = await admin.agent.patch(`/api/admin/users/${u.id}`, { role: "teacher", full_name: "Novo Nome" })
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ id: u.id, role: "teacher", full_name: "Novo Nome" })
    expect((await u.agent.get("/api/auth/me")).body.user.role).toBe("teacher")
    const actions = await auditActions(ctx)
    expect(actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: "user.role_change", severity: "warning" }),
        expect.objectContaining({ action: "user.update" }),
      ]),
    )
  })

  it("valida a entrada e recusa nome de usuário já usado", async () => {
    const admin = await signUp(ctx.app, "admin", ctx.db)
    const u1 = await signUp(ctx.app)
    const u2 = await signUp(ctx.app)
    await admin.agent.patch(`/api/admin/users/${u1.id}`, { username: "fulano" })
    expect((await admin.agent.patch(`/api/admin/users/${u2.id}`, { username: "fulano" })).status).toBe(409)
    expect((await admin.agent.patch(`/api/admin/users/${u2.id}`, { role: "root" })).status).toBe(400)
    expect((await admin.agent.patch(`/api/admin/users/${u2.id}`, {})).status).toBe(400)
    expect((await admin.agent.patch("/api/admin/users/nao-e-uuid", { role: "student" })).status).toBe(404)
    expect((await admin.agent.patch("/api/admin/users/00000000-0000-4000-8000-000000000000", { role: "student" })).status).toBe(404)
  })

  it("admin não pode se rebaixar, se suspender nem se excluir", async () => {
    const admin = await signUp(ctx.app, "admin", ctx.db)
    expect((await admin.agent.patch(`/api/admin/users/${admin.id}`, { role: "student" })).status).toBe(403)
    expect((await admin.agent.patch(`/api/admin/users/${admin.id}`, { suspended: true })).status).toBe(403)
    expect((await admin.agent.delete(`/api/admin/users/${admin.id}`)).status).toBe(403)
    const me = await admin.agent.get("/api/auth/me")
    expect(me.status).toBe(200)
    expect(me.body.user).toMatchObject({ role: "admin", suspended: false })
    // Editar o próprio nome continua permitido
    expect((await admin.agent.patch(`/api/admin/users/${admin.id}`, { full_name: "Coordenação" })).status).toBe(200)
  })

  it("suspensão derruba a sessão do usuário imediatamente", async () => {
    const admin = await signUp(ctx.app, "admin", ctx.db)
    const u = await signUp(ctx.app)
    expect((await u.agent.get("/api/auth/me")).status).toBe(200)
    const res = await admin.agent.patch(`/api/admin/users/${u.id}`, { suspended: true })
    expect(res.status).toBe(200)
    expect(res.body.suspended).toBe(true)
    expect(await count(ctx, sql`select count(*)::int as n from sessions where user_id = ${u.id} and revoked_at is null`)).toBe(0)
    expect((await u.agent.get("/api/auth/me")).status).toBe(401)
    expect((await agent(ctx.app).post("/api/auth/sign-in", { email: u.email, password: u.password })).status).toBe(403)
    expect((await auditActions(ctx)).map((a) => a.action)).toContain("user.suspend")

    // Reativar devolve o acesso
    await admin.agent.patch(`/api/admin/users/${u.id}`, { suspended: false })
    expect((await agent(ctx.app).post("/api/auth/sign-in", { email: u.email, password: u.password })).status).toBe(200)
  })

  it("resetar progresso zera XP, nível, sequências e apaga progresso/submissões/badges", async () => {
    const admin = await signUp(ctx.app, "admin", ctx.db)
    const u = await signUp(ctx.app)
    const lesson = await createLesson(ctx.db)
    await ctx.db.insert(badges).values({ id: "b1", name: "B1", criteriaType: "manual" })
    await ctx.db.insert(lessonProgress).values({ userId: u.id, lessonId: lesson.id, status: "completed", xpEarned: 50, completedAt: new Date().toISOString() })
    await ctx.db.insert(submissions).values({ userId: u.id, lessonId: lesson.id, files: [], status: "graded", passed: true })
    await ctx.db.insert(userBadges).values({ userId: u.id, badgeId: "b1" })
    await ctx.db
      .update(profiles)
      .set({ totalXp: 2500, level: 3, currentStreak: 4, maxStreak: 9, lessonsCompleted: 7, coursesCompleted: 1 })
      .where(sql`${profiles.id} = ${u.id}`)

    expect((await admin.agent.post(`/api/admin/users/${u.id}/reset-progress`)).status).toBe(204)

    const me = (await u.agent.get("/api/auth/me")).body.user
    expect(me).toMatchObject({ total_xp: 0, level: 1, current_streak: 0, max_streak: 0, lessons_completed: 0, courses_completed: 0 })
    expect(await count(ctx, sql`select count(*)::int as n from lesson_progress where user_id = ${u.id}`)).toBe(0)
    expect(await count(ctx, sql`select count(*)::int as n from submissions where user_id = ${u.id}`)).toBe(0)
    expect(await count(ctx, sql`select count(*)::int as n from user_badges where user_id = ${u.id}`)).toBe(0)
    expect(await auditActions(ctx)).toContainEqual(expect.objectContaining({ action: "user.reset_progress", severity: "danger" }))
  })

  it("convite cria a conta sem senha e envia link para definir a senha", async () => {
    const admin = await signUp(ctx.app, "admin", ctx.db)
    const res = await admin.agent.post("/api/admin/users/invite", { email: "Convidada@USP.br", full_name: "Convidada" })
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ email: "convidada@usp.br", full_name: "Convidada", role: "student", username: "convidada" })
    const creds = await ctx.db.execute(sql`select password_hash from users where id = ${res.body.id}`)
    expect((creds.rows[0] as { password_hash: string | null }).password_hash).toBeNull()

    expect(ctx.mail.sent).toHaveLength(1)
    expect(ctx.mail.sent[0]!.to).toBe("convidada@usp.br")
    const token = decodeURIComponent(ctx.mail.sent[0]!.text.match(/token=([^\s]+)/)![1]!)
    // Sem senha ainda: login falha
    expect((await agent(ctx.app).post("/api/auth/sign-in", { email: "convidada@usp.br", password: "qualquer123456" })).status).toBe(401)
    expect((await agent(ctx.app).post("/api/auth/password/reset", { token, password: "senhaNova12345" })).status).toBe(200)
    expect((await agent(ctx.app).post("/api/auth/sign-in", { email: "convidada@usp.br", password: "senhaNova12345" })).status).toBe(200)

    const dup = await admin.agent.post("/api/admin/users/invite", { email: "convidada@usp.br" })
    expect(dup.status).toBe(409)
    expect(dup.body.code).toBe("EMAIL_TAKEN")
    expect((await auditActions(ctx)).map((a) => a.action)).toContain("user.invite")
  })

  it("envia link de redefinição de senha para o usuário", async () => {
    const admin = await signUp(ctx.app, "admin", ctx.db)
    const u = await signUp(ctx.app)
    expect((await admin.agent.post(`/api/admin/users/${u.id}/password-reset`)).status).toBe(202)
    expect(ctx.mail.sent.map((m) => m.to)).toEqual([u.email])
    expect(ctx.mail.sent[0]!.text).toMatch(/token=/)
    expect((await admin.agent.post("/api/admin/users/00000000-0000-4000-8000-000000000000/password-reset")).status).toBe(404)
  })

  it("exclui outro usuário (cascata) com auditoria de severidade danger", async () => {
    const admin = await signUp(ctx.app, "admin", ctx.db)
    const u = await signUp(ctx.app)
    expect((await admin.agent.delete(`/api/admin/users/${u.id}`)).status).toBe(204)
    expect(await count(ctx, sql`select count(*)::int as n from users where id = ${u.id}`)).toBe(0)
    expect(await count(ctx, sql`select count(*)::int as n from profiles where id = ${u.id}`)).toBe(0)
    expect((await u.agent.get("/api/auth/me")).status).toBe(401)
    expect(await auditActions(ctx)).toContainEqual(expect.objectContaining({ action: "user.delete", severity: "danger", target: u.email }))
    expect((await admin.agent.delete(`/api/admin/users/${u.id}`)).status).toBe(404)
  })

  it("invalida as sessões de um usuário ou de todos", async () => {
    const admin = await signUp(ctx.app, "admin", ctx.db)
    const u1 = await signUp(ctx.app)
    const u2 = await signUp(ctx.app)
    expect((await admin.agent.post("/api/admin/sessions/invalidate", { user_id: u1.id })).status).toBe(204)
    expect((await u1.agent.get("/api/auth/me")).status).toBe(401)
    expect((await u2.agent.get("/api/auth/me")).status).toBe(200)

    expect((await admin.agent.post("/api/admin/sessions/invalidate", {})).status).toBe(204)
    expect((await u2.agent.get("/api/auth/me")).status).toBe(401)
    expect((await admin.agent.get("/api/auth/me")).status).toBe(401)
    expect(await count(ctx, sql`select count(*)::int as n from sessions where revoked_at is null`)).toBe(0)
    const actions = await auditActions(ctx)
    expect(actions).toContainEqual(expect.objectContaining({ action: "sessions.invalidate_user", severity: "danger" }))
    expect(actions).toContainEqual(expect.objectContaining({ action: "sessions.invalidate_all", severity: "danger" }))
  })

  it("exporta os dados de um usuário (LGPD) sem hash de senha", async () => {
    const admin = await signUp(ctx.app, "admin", ctx.db)
    const u = await signUp(ctx.app)
    const res = await admin.agent.get(`/api/admin/users/${u.id}/export`)
    expect(res.status).toBe(200)
    expect(res.body.profile.id).toBe(u.id)
    const raw = JSON.stringify(res.body)
    expect(raw).not.toMatch(/password_hash|passwordHash|\$argon2/)
    expect((await auditActions(ctx)).map((a) => a.action)).toContain("user.export")
  })

  it("métricas, atividade e analytics refletem as conclusões", async () => {
    const admin = await signUp(ctx.app, "admin", ctx.db)
    const u = await signUp(ctx.app)
    await signUp(ctx.app, "teacher", ctx.db)
    const l1 = await createLesson(ctx.db, { title: "Variáveis" })
    const l2 = await createLesson(ctx.db, { title: "Laços", published: false })
    const now = new Date().toISOString()
    await ctx.db.insert(lessonProgress).values([
      { userId: u.id, lessonId: l1.id, status: "completed", xpEarned: 50, completedAt: now },
      { userId: admin.id, lessonId: l1.id, status: "completed", xpEarned: 50, completedAt: now },
      { userId: u.id, lessonId: l2.id, status: "in_progress" },
    ])
    await ctx.db.update(profiles).set({ totalXp: 100 }).where(sql`${profiles.id} = ${u.id}`)

    const m = (await admin.agent.get("/api/admin/metrics")).body
    expect(m).toMatchObject({
      totalUsers: 3, totalStudents: 1, totalTeachers: 1, totalAdmins: 1, totalLessons: 2, publishedLessons: 1,
      totalCompletions: 2, pendingApprovals: 0, totalXpAwarded: 100,
    })

    const daily = (await admin.agent.get("/api/admin/activity/daily")).body as number[]
    expect(daily).toHaveLength(30)
    expect(daily.at(-1)).toBe(2)

    const recent = (await admin.agent.get("/api/admin/activity/recent")).body
    expect(recent).toHaveLength(2)
    expect(recent[0]).toMatchObject({ lesson_title: "Variáveis", xp_earned: 50 })

    const a = (await admin.agent.get("/api/admin/analytics")).body
    expect(a.dailyActiveUsers).toHaveLength(30)
    expect(a.dailyActiveUsers.at(-1)).toBe(2)
    expect(a.completionsByDay.at(-1)).toBe(2)
    expect(a.topLessons).toEqual([{ lesson_id: l1.id, title: "Variáveis", completions: 2 }])
    expect(a.roleDistribution).toEqual(
      expect.arrayContaining([{ role: "admin", count: 1 }, { role: "student", count: 1 }, { role: "teacher", count: 1 }]),
    )
    expect(a).toMatchObject({ dau: 2, wau: 2, mau: 2, totalUsers: 3, funnelStarted: 2, funnelCompleted5: 0, funnelStreak7: 0, averageXp: 100 })
    expect(a.retention7d).toBe(0)
  })

  it("lista todas as lições sem gabarito", async () => {
    const admin = await signUp(ctx.app, "admin", ctx.db)
    await createLesson(ctx.db, {
      title: "Rascunho",
      published: false,
      testCases: [{ id: "c1", kind: "call", function: "f", args: [], kwargs: {}, expected: 42 }],
    })
    const res = await admin.agent.get("/api/admin/lessons")
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0]).toMatchObject({ title: "Rascunho", published: false })
    expect(JSON.stringify(res.body)).not.toMatch(/test_cases|testCases|expected/)
  })

  it("configurações: PUT faz upsert só das chaves enviadas", async () => {
    const admin = await signUp(ctx.app, "admin", ctx.db)
    expect((await admin.agent.get("/api/admin/settings")).body).toEqual({})
    await admin.agent.put("/api/admin/settings", { "signup.open": true, "site.banner": "Olá", limite: 3 })
    const res = await admin.agent.put("/api/admin/settings", { "site.banner": null, limite: 5 })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ "signup.open": true, "site.banner": null, limite: 5 })
    expect((await admin.agent.get("/api/admin/settings")).body).toEqual(res.body)
    expect((await admin.agent.put("/api/admin/settings", { "Chave Inválida!": 1 })).status).toBe(400)
    expect((await auditActions(ctx)).filter((a) => a.action === "settings.update")).toHaveLength(2)
  })

  it("lista a trilha de auditoria", async () => {
    const admin = await signUp(ctx.app, "admin", ctx.db)
    const u = await signUp(ctx.app)
    await admin.agent.patch(`/api/admin/users/${u.id}`, { role: "teacher" })
    const res = await admin.agent.get("/api/admin/audit?limit=10")
    expect(res.status).toBe(200)
    expect(res.body[0]).toMatchObject({ action: "user.role_change", actor_id: admin.id, severity: "warning" })
  })

  it("CRUD de badges; PATCH parcial preserva os demais campos", async () => {
    const admin = await signUp(ctx.app, "admin", ctx.db)
    const created = await admin.agent.post("/api/admin/badges", {
      id: "maratona", name: "Maratona", description: "7 dias seguidos", icon: "Flame", rarity: "epic",
      criteria_type: "current_streak", criteria_value: 7,
    })
    expect(created.status).toBe(201)
    expect(created.body).toMatchObject({ id: "maratona", rarity: "epic", active: true })
    expect((await admin.agent.post("/api/admin/badges", { id: "maratona", name: "X", criteria_type: "manual" })).status).toBe(409)

    const upd = await admin.agent.patch("/api/admin/badges/maratona", { name: "Maratonista" })
    expect(upd.status).toBe(200)
    expect(upd.body).toMatchObject({ name: "Maratonista", description: "7 dias seguidos", icon: "Flame", rarity: "epic", criteria_value: 7 })
    expect((await admin.agent.patch("/api/admin/badges/nao-existe", { name: "X" })).status).toBe(404)
    expect((await admin.agent.patch("/api/admin/badges/ID_INVALIDO", { name: "X" })).status).toBe(404)

    expect((await admin.agent.delete("/api/admin/badges/maratona")).status).toBe(204)
    expect((await agent(ctx.app).get("/api/badges")).body).toEqual([])
    const actions = await auditActions(ctx)
    expect(actions.map((a) => a.action)).toEqual(["badge.create", "badge.update", "badge.delete"])
    expect(actions[2]!.severity).toBe("danger")
  })
})
