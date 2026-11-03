import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { z } from "zod"
import { and, eq } from "drizzle-orm"
import * as contracts from "@levelusp/contracts"
import { courses, lessonProgress, lessons, libraryRequests, notes, profiles, teacherApprovals, users } from "@levelusp/db"
import type { Course, LessonWithTests, Note, Profile, SessionResponse } from "@levelusp/contracts"
import { agent, bodyOf, createLesson, createTestApp, required, type TestContext } from "../e2e/harness"
import { createCast, type Cast } from "./support"

/*
 * Mass assignment / over-posting (OWASP API3:2023): o atacante manda campos
 * que a tela não tem (papel, XP, dono, status, datas). Política do projeto:
 * schemas Zod `z.object` REMOVEM chaves desconhecidas (strip) e cada service
 * monta a gravação campo a campo; aqui provamos que nada disso chega ao banco.
 */

/** Campos privilegiados que um cliente nunca deve conseguir gravar. */
const PRIVILEGED_FIELDS = {
  id: "00000000-0000-4000-8000-000000000001",
  role: "admin",
  is_admin: true,
  admin: true,
  xp: 999_999,
  total_xp: 999_999,
  level: 99,
  current_streak: 365,
  max_streak: 365,
  lessons_completed: 500,
  courses_completed: 50,
  suspended: false,
  email_verified: true,
  email_verified_at: "2020-01-01T00:00:00.000Z",
  password_hash: "$argon2id$v=19$m=19456,t=2,p=1$forjado",
  user_id: "00000000-0000-4000-8000-000000000002",
  owner_id: "00000000-0000-4000-8000-000000000002",
  created_by: "00000000-0000-4000-8000-000000000002",
  requested_by: "00000000-0000-4000-8000-000000000002",
  reviewed_by: "00000000-0000-4000-8000-000000000002",
  status: "approved",
  completed: true,
  published: true,
  passed: true,
  score: 100,
  created_at: "2000-01-01T00:00:00.000Z",
  updated_at: "2000-01-01T00:00:00.000Z",
} as const

describe("Mass assignment: campos extras são descartados em toda rota de escrita", () => {
  let ctx: TestContext
  let cast: Cast

  beforeAll(async () => {
    ctx = await createTestApp()
  })
  afterAll(() => ctx.close())
  beforeEach(async () => {
    await ctx.reset()
    cast = await createCast(ctx)
  })

  it("política: nenhum schema de objeto exportado pelos contratos aceita chaves desconhecidas (passthrough/loose)", () => {
    const loose: string[] = []
    for (const [name, value] of Object.entries(contracts)) {
      if (!(value instanceof z.ZodObject)) continue
      const catchall: unknown = value.def.catchall
      if (catchall !== undefined && !(catchall instanceof z.ZodNever)) loose.push(name)
    }
    expect(loose).toEqual([])
  })

  it("cadastro: role/xp/nível/verificação enviados no corpo são ignorados", async () => {
    const response = await agent(ctx.app).post("/api/auth/sign-up", { email: "atacante@usp.br", password: "senhaForte123", full_name: "Atacante", ...PRIVILEGED_FIELDS })
    expect(response.status).toBe(201)
    const { user } = bodyOf<SessionResponse>(response)
    expect(user).toMatchObject({ role: "student", total_xp: 0, level: 1, lessons_completed: 0, suspended: false })
    expect(user.id).not.toBe(PRIVILEGED_FIELDS.id)
    const credential = required(await ctx.db.query.users.findFirst({ where: eq(users.id, user.id) }), "credencial")
    expect(credential.emailVerifiedAt).toBeNull()
    expect(credential.passwordHash).not.toBe(PRIVILEGED_FIELDS.password_hash)
  })

  it("perfil: PATCH /me/profile não promove, não dá XP nem reativa conta", async () => {
    const response = await cast.studentA.agent.patch("/api/me/profile", { bio: "oi", ...PRIVILEGED_FIELDS })
    expect(response.status).toBe(200)
    const profile = bodyOf<Profile>(response)
    expect(profile).toMatchObject({ role: "student", total_xp: 0, level: 1, current_streak: 1, bio: "oi" })
    const stored = required(await ctx.db.query.profiles.findFirst({ where: eq(profiles.id, cast.studentA.id) }), "perfil")
    expect(stored.role).toBe("student")
    expect(stored.totalXp).toBe(0)
    expect(new Date(stored.createdAt).getFullYear()).toBeGreaterThan(2000)
  })

  it("admin: PATCH /admin/users/:id não grava XP, e-mail nem hash de senha", async () => {
    const response = await cast.admin.agent.patch(`/api/admin/users/${cast.studentA.id}`, { full_name: "Novo Nome", email: "outro@usp.br", ...PRIVILEGED_FIELDS, role: "student" })
    expect(response.status).toBe(200)
    const stored = required(await ctx.db.query.profiles.findFirst({ where: eq(profiles.id, cast.studentA.id) }), "perfil")
    expect(stored).toMatchObject({ fullName: "Novo Nome", email: cast.studentA.email, totalXp: 0, level: 1 })
  })

  it("curso: dono e publicação vêm da sessão e do fluxo de publicação, não do corpo", async () => {
    const created = await cast.teacherB.agent.post("/api/courses", { title: "Curso honesto", ...PRIVILEGED_FIELDS, level: "iniciante", created_by: cast.teacherA.id })
    expect(created.status).toBe(201)
    const course = bodyOf<Course>(created)
    const stored = required(await ctx.db.query.courses.findFirst({ where: eq(courses.id, course.id) }), "curso")
    expect(stored).toMatchObject({ createdBy: cast.teacherB.id, published: false })
    await cast.teacherB.agent.patch(`/api/courses/${course.id}`, { title: "Curso honesto 2", created_by: cast.teacherA.id, published: true })
    const updated = required(await ctx.db.query.courses.findFirst({ where: eq(courses.id, course.id) }), "curso")
    expect(updated).toMatchObject({ createdBy: cast.teacherB.id, published: false, title: "Curso honesto 2" })
  })

  it("lição: nasce rascunho do próprio professor, slug gerado no servidor", async () => {
    const created = await cast.teacherB.agent.post("/api/lessons", { title: "Lição honesta", slug: "slug-forjado", ...PRIVILEGED_FIELDS })
    expect(created.status).toBe(201)
    const lesson = bodyOf<LessonWithTests>(created)
    const stored = required(await ctx.db.query.lessons.findFirst({ where: eq(lessons.id, lesson.id) }), "lição")
    expect(stored).toMatchObject({ createdBy: cast.teacherB.id, published: false })
    expect(stored.slug).not.toBe("slug-forjado")
    await cast.teacherB.agent.patch(`/api/lessons/${lesson.id}`, { title: "Lição honesta 2", created_by: cast.teacherA.id, published: true })
    const updated = required(await ctx.db.query.lessons.findFirst({ where: eq(lessons.id, lesson.id) }), "lição")
    expect(updated).toMatchObject({ createdBy: cast.teacherB.id, published: false })
  })

  it("nota: user_id no corpo não cria nem move nota para outra pessoa", async () => {
    const created = bodyOf<Note>(await cast.studentB.agent.post("/api/me/notes", { content: "minha", user_id: cast.studentA.id }))
    const stored = required(await ctx.db.query.notes.findFirst({ where: eq(notes.id, created.id) }), "nota")
    expect(stored.userId).toBe(cast.studentB.id)
    await cast.studentB.agent.patch(`/api/me/notes/${created.id}`, { content: "editada", user_id: cast.studentA.id })
    expect(required(await ctx.db.query.notes.findFirst({ where: eq(notes.id, created.id) }), "nota").userId).toBe(cast.studentB.id)
  })

  it("solicitação de professor: aluno não se auto-aprova com status/reviewed_by", async () => {
    const response = await cast.studentB.agent.post("/api/me/teacher-request", { institution: "USP", motivation: "Quero ensinar Python aos colegas.", ...PRIVILEGED_FIELDS })
    expect(response.status).toBe(201)
    const stored = required(await ctx.db.query.teacherApprovals.findFirst({ where: eq(teacherApprovals.userId, cast.studentB.id) }), "solicitação")
    expect(stored).toMatchObject({ status: "pending", reviewedBy: null, email: cast.studentB.email })
    const profile = required(await ctx.db.query.profiles.findFirst({ where: eq(profiles.id, cast.studentB.id) }), "perfil")
    expect(profile.role).toBe("student")
  })

  it("pedido de biblioteca: professor não aprova o próprio pedido", async () => {
    const response = await cast.teacherB.agent.post("/api/library/requests", { library_name: "requests", ...PRIVILEGED_FIELDS })
    expect(response.status).toBe(201)
    const stored = required(await ctx.db.query.libraryRequests.findFirst({ where: eq(libraryRequests.requestedBy, cast.teacherB.id) }), "pedido")
    expect(stored).toMatchObject({ status: "pending", reviewedBy: null })
  })

  it("rascunho de código: status/completed no corpo não concluem a lição", async () => {
    const lesson = await createLesson(ctx.db, { title: "Exercício" })
    const response = await cast.studentB.agent.put(`/api/lessons/${lesson.id}/snapshot`, { files: [{ path: "main.py", content: "print(1)" }], ...PRIVILEGED_FIELDS, status: "completed" })
    expect(response.status).toBe(204)
    const progress = await ctx.db.query.lessonProgress.findFirst({ where: and(eq(lessonProgress.userId, cast.studentB.id), eq(lessonProgress.lessonId, lesson.id)) })
    expect(progress?.status).not.toBe("completed")
    expect(required(await ctx.db.query.profiles.findFirst({ where: eq(profiles.id, cast.studentB.id) }), "perfil").totalXp).toBe(0)
  })
})
