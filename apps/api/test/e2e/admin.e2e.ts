import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { sql } from "drizzle-orm"
import { badges, lessonProgress, profiles, submissions, userBadges } from "@levelusp/db"
import type {
  AnalyticsMetrics, ApiErrorBody, AuditLog, Lesson, PlatformMetrics, Profile, RecentActivity, SessionResponse, UserDataExport,
} from "@levelusp/contracts"
import { agent, bodyOf, countRows, createLesson, createTestApp, queryRows, required, signUp, type TestContext } from "./harness"

interface AuditEntry {
  action: string
  severity: string
  target: string
}

const auditActions = (ctx: TestContext): Promise<AuditEntry[]> =>
  queryRows<AuditEntry>(ctx.db, sql`select action, severity, target from audit_log order by created_at`)

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
    for (const nonAdmin of [student, teacher]) {
      const calls = [
        () => nonAdmin.agent.get("/api/admin/users"),
        () => nonAdmin.agent.get("/api/admin/metrics"),
        () => nonAdmin.agent.get("/api/admin/analytics"),
        () => nonAdmin.agent.get("/api/admin/audit"),
        () => nonAdmin.agent.get("/api/admin/settings"),
        () => nonAdmin.agent.get("/api/admin/teacher-approvals"),
        () => nonAdmin.agent.get("/api/admin/library"),
        () => nonAdmin.agent.get(`/api/admin/users/${target.id}/export`),
        () => nonAdmin.agent.patch(`/api/admin/users/${target.id}`, { role: "admin" }),
        () => nonAdmin.agent.delete(`/api/admin/users/${target.id}`),
        () => nonAdmin.agent.post(`/api/admin/users/${target.id}/reset-progress`),
        () => nonAdmin.agent.post("/api/admin/sessions/invalidate", {}),
        () => nonAdmin.agent.post("/api/admin/badges", { id: "x1", name: "X", criteria_type: "manual" }),
      ]
      for (const call of calls) expect((await call()).status).toBe(403)
    }
    expect((await agent(ctx.app).get("/api/admin/users")).status).toBe(401)
    // Nada mudou
    const targetProfile = await ctx.db.query.profiles.findFirst({ where: sql`${profiles.id} = ${target.id}` })
    expect(targetProfile?.role).toBe("student")
  })

  it("lista usuários e altera papel de outra pessoa com auditoria", async () => {
    const admin = await signUp(ctx.app, "admin", ctx.db)
    const user = await signUp(ctx.app)
    const list = await admin.agent.get("/api/admin/users")
    expect(list.status).toBe(200)
    expect(bodyOf<Profile[]>(list).map((profile) => profile.id).sort()).toEqual([admin.id, user.id].sort())

    const response = await admin.agent.patch(`/api/admin/users/${user.id}`, { role: "teacher", full_name: "Novo Nome" })
    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ id: user.id, role: "teacher", full_name: "Novo Nome" })
    expect(bodyOf<SessionResponse>(await user.agent.get("/api/auth/me")).user.role).toBe("teacher")
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
    const firstUser = await signUp(ctx.app)
    const secondUser = await signUp(ctx.app)
    await admin.agent.patch(`/api/admin/users/${firstUser.id}`, { username: "fulano" })
    expect((await admin.agent.patch(`/api/admin/users/${secondUser.id}`, { username: "fulano" })).status).toBe(409)
    expect((await admin.agent.patch(`/api/admin/users/${secondUser.id}`, { role: "root" })).status).toBe(400)
    expect((await admin.agent.patch(`/api/admin/users/${secondUser.id}`, {})).status).toBe(400)
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
    expect(bodyOf<SessionResponse>(me).user).toMatchObject({ role: "admin", suspended: false })
    // Editar o próprio nome continua permitido
    expect((await admin.agent.patch(`/api/admin/users/${admin.id}`, { full_name: "Coordenação" })).status).toBe(200)
  })

  it("suspensão derruba a sessão do usuário imediatamente", async () => {
    const admin = await signUp(ctx.app, "admin", ctx.db)
    const user = await signUp(ctx.app)
    expect((await user.agent.get("/api/auth/me")).status).toBe(200)
    const response = await admin.agent.patch(`/api/admin/users/${user.id}`, { suspended: true })
    expect(response.status).toBe(200)
    expect(bodyOf<Profile>(response).suspended).toBe(true)
    expect(await countRows(ctx.db, sql`select count(*)::int as n from sessions where user_id = ${user.id} and revoked_at is null`)).toBe(0)
    expect((await user.agent.get("/api/auth/me")).status).toBe(401)
    expect((await agent(ctx.app).post("/api/auth/sign-in", { email: user.email, password: user.password })).status).toBe(403)
    expect((await auditActions(ctx)).map((entry) => entry.action)).toContain("user.suspend")

    // Reativar devolve o acesso
    await admin.agent.patch(`/api/admin/users/${user.id}`, { suspended: false })
    expect((await agent(ctx.app).post("/api/auth/sign-in", { email: user.email, password: user.password })).status).toBe(200)
  })

  it("resetar progresso zera XP, nível, sequências e apaga progresso/submissões/badges", async () => {
    const admin = await signUp(ctx.app, "admin", ctx.db)
    const user = await signUp(ctx.app)
    const lesson = await createLesson(ctx.db)
    await ctx.db.insert(badges).values({ id: "b1", name: "B1", criteriaType: "manual" })
    await ctx.db.insert(lessonProgress).values({ userId: user.id, lessonId: lesson.id, status: "completed", xpEarned: 50, completedAt: new Date().toISOString() })
    await ctx.db.insert(submissions).values({ userId: user.id, lessonId: lesson.id, files: [], status: "graded", passed: true })
    await ctx.db.insert(userBadges).values({ userId: user.id, badgeId: "b1" })
    await ctx.db
      .update(profiles)
      .set({ totalXp: 2500, level: 3, currentStreak: 4, maxStreak: 9, lessonsCompleted: 7, coursesCompleted: 1 })
      .where(sql`${profiles.id} = ${user.id}`)

    expect((await admin.agent.post(`/api/admin/users/${user.id}/reset-progress`)).status).toBe(204)

    const me = bodyOf<SessionResponse>(await user.agent.get("/api/auth/me")).user
    expect(me).toMatchObject({ total_xp: 0, level: 1, current_streak: 0, max_streak: 0, lessons_completed: 0, courses_completed: 0 })
    expect(await countRows(ctx.db, sql`select count(*)::int as n from lesson_progress where user_id = ${user.id}`)).toBe(0)
    expect(await countRows(ctx.db, sql`select count(*)::int as n from submissions where user_id = ${user.id}`)).toBe(0)
    expect(await countRows(ctx.db, sql`select count(*)::int as n from user_badges where user_id = ${user.id}`)).toBe(0)
    expect(await auditActions(ctx)).toContainEqual(expect.objectContaining({ action: "user.reset_progress", severity: "danger" }))
  })

  it("convite cria a conta sem senha e envia link para definir a senha", async () => {
    const admin = await signUp(ctx.app, "admin", ctx.db)
    const response = await admin.agent.post("/api/admin/users/invite", { email: "Convidada@USP.br", full_name: "Convidada" })
    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({ email: "convidada@usp.br", full_name: "Convidada", role: "student", username: "convidada" })
    const [credentials] = await queryRows<{ password_hash: string | null }>(ctx.db, sql`select password_hash from users where id = ${bodyOf<Profile>(response).id}`)
    expect(credentials?.password_hash).toBeNull()

    expect(ctx.mail.sent).toHaveLength(1)
    const invitation = required(ctx.mail.sent[0], "e-mail de convite")
    expect(invitation.to).toBe("convidada@usp.br")
    const token = decodeURIComponent(required(invitation.text.match(/token=([^\s]+)/)?.[1], "token no link"))
    // Sem senha ainda: login falha
    expect((await agent(ctx.app).post("/api/auth/sign-in", { email: "convidada@usp.br", password: "qualquer123456" })).status).toBe(401)
    expect((await agent(ctx.app).post("/api/auth/password/reset", { token, password: "senhaNova12345" })).status).toBe(200)
    expect((await agent(ctx.app).post("/api/auth/sign-in", { email: "convidada@usp.br", password: "senhaNova12345" })).status).toBe(200)

    const duplicate = await admin.agent.post("/api/admin/users/invite", { email: "convidada@usp.br" })
    expect(duplicate.status).toBe(409)
    expect(bodyOf<ApiErrorBody>(duplicate).code).toBe("EMAIL_TAKEN")
    expect((await auditActions(ctx)).map((entry) => entry.action)).toContain("user.invite")
  })

  it("envia link de redefinição de senha para o usuário", async () => {
    const admin = await signUp(ctx.app, "admin", ctx.db)
    const user = await signUp(ctx.app)
    expect((await admin.agent.post(`/api/admin/users/${user.id}/password-reset`)).status).toBe(202)
    expect(ctx.mail.sent.map((message) => message.to)).toEqual([user.email])
    expect(ctx.mail.sent[0]?.text).toMatch(/token=/)
    expect((await admin.agent.post("/api/admin/users/00000000-0000-4000-8000-000000000000/password-reset")).status).toBe(404)
  })

  it("exclui outro usuário (cascata) com auditoria de severidade danger", async () => {
    const admin = await signUp(ctx.app, "admin", ctx.db)
    const user = await signUp(ctx.app)
    expect((await admin.agent.delete(`/api/admin/users/${user.id}`)).status).toBe(204)
    expect(await countRows(ctx.db, sql`select count(*)::int as n from users where id = ${user.id}`)).toBe(0)
    expect(await countRows(ctx.db, sql`select count(*)::int as n from profiles where id = ${user.id}`)).toBe(0)
    expect((await user.agent.get("/api/auth/me")).status).toBe(401)
    expect(await auditActions(ctx)).toContainEqual(expect.objectContaining({ action: "user.delete", severity: "danger", target: user.email }))
    expect((await admin.agent.delete(`/api/admin/users/${user.id}`)).status).toBe(404)
  })

  it("invalida as sessões de um usuário ou de todos", async () => {
    const admin = await signUp(ctx.app, "admin", ctx.db)
    const firstUser = await signUp(ctx.app)
    const secondUser = await signUp(ctx.app)
    expect((await admin.agent.post("/api/admin/sessions/invalidate", { user_id: firstUser.id })).status).toBe(204)
    expect((await firstUser.agent.get("/api/auth/me")).status).toBe(401)
    expect((await secondUser.agent.get("/api/auth/me")).status).toBe(200)

    expect((await admin.agent.post("/api/admin/sessions/invalidate", {})).status).toBe(204)
    expect((await secondUser.agent.get("/api/auth/me")).status).toBe(401)
    expect((await admin.agent.get("/api/auth/me")).status).toBe(401)
    expect(await countRows(ctx.db, sql`select count(*)::int as n from sessions where revoked_at is null`)).toBe(0)
    const actions = await auditActions(ctx)
    expect(actions).toContainEqual(expect.objectContaining({ action: "sessions.invalidate_user", severity: "danger" }))
    expect(actions).toContainEqual(expect.objectContaining({ action: "sessions.invalidate_all", severity: "danger" }))
  })

  it("exporta os dados de um usuário (LGPD) sem hash de senha", async () => {
    const admin = await signUp(ctx.app, "admin", ctx.db)
    const user = await signUp(ctx.app)
    const response = await admin.agent.get(`/api/admin/users/${user.id}/export`)
    expect(response.status).toBe(200)
    expect(bodyOf<UserDataExport>(response).profile.id).toBe(user.id)
    const raw = JSON.stringify(response.body)
    expect(raw).not.toMatch(/password_hash|passwordHash|\$argon2/)
    expect((await auditActions(ctx)).map((entry) => entry.action)).toContain("user.export")
  })

  it("métricas, atividade e analytics refletem as conclusões", async () => {
    const admin = await signUp(ctx.app, "admin", ctx.db)
    const user = await signUp(ctx.app)
    await signUp(ctx.app, "teacher", ctx.db)
    const publishedLesson = await createLesson(ctx.db, { title: "Variáveis" })
    const draftLesson = await createLesson(ctx.db, { title: "Laços", published: false })
    const now = new Date().toISOString()
    await ctx.db.insert(lessonProgress).values([
      { userId: user.id, lessonId: publishedLesson.id, status: "completed", xpEarned: 50, completedAt: now },
      { userId: admin.id, lessonId: publishedLesson.id, status: "completed", xpEarned: 50, completedAt: now },
      { userId: user.id, lessonId: draftLesson.id, status: "in_progress" },
    ])
    await ctx.db.update(profiles).set({ totalXp: 100 }).where(sql`${profiles.id} = ${user.id}`)

    const metrics = bodyOf<PlatformMetrics>(await admin.agent.get("/api/admin/metrics"))
    expect(metrics).toMatchObject({
      totalUsers: 3, totalStudents: 1, totalTeachers: 1, totalAdmins: 1, totalLessons: 2, publishedLessons: 1,
      totalCompletions: 2, pendingApprovals: 0, totalXpAwarded: 100,
    })

    const daily = bodyOf<number[]>(await admin.agent.get("/api/admin/activity/daily"))
    expect(daily).toHaveLength(30)
    expect(daily.at(-1)).toBe(2)

    const recent = bodyOf<RecentActivity[]>(await admin.agent.get("/api/admin/activity/recent"))
    expect(recent).toHaveLength(2)
    expect(recent[0]).toMatchObject({ lesson_title: "Variáveis", xp_earned: 50 })

    const analytics = bodyOf<AnalyticsMetrics>(await admin.agent.get("/api/admin/analytics"))
    expect(analytics.dailyActiveUsers).toHaveLength(30)
    expect(analytics.dailyActiveUsers.at(-1)).toBe(2)
    expect(analytics.completionsByDay.at(-1)).toBe(2)
    expect(analytics.topLessons).toEqual([{ lesson_id: publishedLesson.id, title: "Variáveis", completions: 2 }])
    expect(analytics.roleDistribution).toEqual(
      expect.arrayContaining([{ role: "admin", count: 1 }, { role: "student", count: 1 }, { role: "teacher", count: 1 }]),
    )
    expect(analytics).toMatchObject({ dau: 2, wau: 2, mau: 2, totalUsers: 3, funnelStarted: 2, funnelCompleted5: 0, funnelStreak7: 0, averageXp: 100 })
    expect(analytics.retention7d).toBe(0)
  })

  it("lista todas as lições sem gabarito", async () => {
    const admin = await signUp(ctx.app, "admin", ctx.db)
    await createLesson(ctx.db, {
      title: "Rascunho",
      published: false,
      testCases: [{ id: "c1", kind: "call", function: "f", args: [], kwargs: {}, expected: 42 }],
    })
    const response = await admin.agent.get("/api/admin/lessons")
    expect(response.status).toBe(200)
    expect(response.body).toHaveLength(1)
    expect(bodyOf<Lesson[]>(response)[0]).toMatchObject({ title: "Rascunho", published: false })
    expect(JSON.stringify(response.body)).not.toMatch(/test_cases|testCases|expected/)
  })

  it("configurações: PUT faz upsert só das chaves enviadas", async () => {
    const admin = await signUp(ctx.app, "admin", ctx.db)
    expect((await admin.agent.get("/api/admin/settings")).body).toEqual({})
    await admin.agent.put("/api/admin/settings", { "signup.open": true, "site.banner": "Olá", limite: 3 })
    const response = await admin.agent.put("/api/admin/settings", { "site.banner": null, limite: 5 })
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ "signup.open": true, "site.banner": null, limite: 5 })
    expect((await admin.agent.get("/api/admin/settings")).body).toEqual(response.body)
    expect((await admin.agent.put("/api/admin/settings", { "Chave Inválida!": 1 })).status).toBe(400)
    expect((await auditActions(ctx)).filter((entry) => entry.action === "settings.update")).toHaveLength(2)
  })

  it("lista a trilha de auditoria", async () => {
    const admin = await signUp(ctx.app, "admin", ctx.db)
    const user = await signUp(ctx.app)
    await admin.agent.patch(`/api/admin/users/${user.id}`, { role: "teacher" })
    const response = await admin.agent.get("/api/admin/audit?limit=10")
    expect(response.status).toBe(200)
    expect(bodyOf<AuditLog[]>(response)[0]).toMatchObject({ action: "user.role_change", actor_id: admin.id, severity: "warning" })
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

    const updated = await admin.agent.patch("/api/admin/badges/maratona", { name: "Maratonista" })
    expect(updated.status).toBe(200)
    expect(updated.body).toMatchObject({ name: "Maratonista", description: "7 dias seguidos", icon: "Flame", rarity: "epic", criteria_value: 7 })
    expect((await admin.agent.patch("/api/admin/badges/nao-existe", { name: "X" })).status).toBe(404)
    expect((await admin.agent.patch("/api/admin/badges/ID_INVALIDO", { name: "X" })).status).toBe(404)

    expect((await admin.agent.delete("/api/admin/badges/maratona")).status).toBe(204)
    expect((await agent(ctx.app).get("/api/badges")).body).toEqual([])
    const actions = await auditActions(ctx)
    expect(actions.map((entry) => entry.action)).toEqual(["badge.create", "badge.update", "badge.delete"])
    expect(actions[2]?.severity).toBe("danger")
  })
})
