import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { sql } from "drizzle-orm"
import { courses, libraryCatalog, notifications } from "@levelusp/db"
import { agent, createLesson, createTestApp, signUp, type TestContext } from "./harness"

const count = async (ctx: TestContext, q: ReturnType<typeof sql>) => ((await ctx.db.execute(q)).rows[0] as { n: number }).n

describe("Notas, notificações, bibliotecas e solicitações de professor (e2e)", () => {
  let ctx: TestContext
  beforeAll(async () => {
    ctx = await createTestApp()
  })
  afterAll(() => ctx.close())
  beforeEach(() => ctx.reset())

  describe("notas", () => {
    it("CRUD do dono com título da lição/curso vinculados", async () => {
      const { agent: a, id } = await signUp(ctx.app)
      const lesson = await createLesson(ctx.db, { title: "Funções" })
      const [course] = await ctx.db.insert(courses).values({ title: "Python 1", published: true }).returning()

      const created = await a.post("/api/me/notes", { title: "Resumo", content: "def f(): ...", lesson_id: lesson.id, course_id: course!.id })
      expect(created.status).toBe(201)
      expect(created.body).toMatchObject({ user_id: id, title: "Resumo", lesson_title: "Funções", course_title: "Python 1" })

      const list = await a.get("/api/me/notes")
      expect(list.body).toHaveLength(1)
      expect(list.body[0]).toMatchObject({ lesson_title: "Funções", course_title: "Python 1" })

      const upd = await a.patch(`/api/me/notes/${created.body.id}`, { content: "novo" })
      expect(upd.status).toBe(200)
      expect(upd.body).toMatchObject({ title: "Resumo", content: "novo" })

      expect((await a.delete(`/api/me/notes/${created.body.id}`)).status).toBe(204)
      expect((await a.get("/api/me/notes")).body).toEqual([])
    })

    it("notas são isoladas por dono: outro usuário recebe 404", async () => {
      const owner = await signUp(ctx.app)
      const other = await signUp(ctx.app)
      const note = (await owner.agent.post("/api/me/notes", { title: "Minha", content: "segredo" })).body
      expect((await other.agent.get("/api/me/notes")).body).toEqual([])
      expect((await other.agent.patch(`/api/me/notes/${note.id}`, { content: "hack" })).status).toBe(404)
      expect((await other.agent.delete(`/api/me/notes/${note.id}`)).status).toBe(404)
      const still = (await owner.agent.get("/api/me/notes")).body
      expect(still).toHaveLength(1)
      expect(still[0].content).toBe("segredo")
      expect((await agent(ctx.app).get("/api/me/notes")).status).toBe(401)
    })

    it("não vincula nota a lição inexistente ou rascunho alheio", async () => {
      const { agent: a } = await signUp(ctx.app)
      const draft = await createLesson(ctx.db, { title: "Rascunho secreto", published: false })
      expect((await a.post("/api/me/notes", { content: "x", lesson_id: draft.id })).status).toBe(404)
      expect((await a.post("/api/me/notes", { content: "x", lesson_id: "00000000-0000-4000-8000-000000000000" })).status).toBe(404)
      expect((await a.post("/api/me/notes", { content: "x", lesson_id: "abc" })).status).toBe(400)
    })
  })

  describe("notificações", () => {
    it("lista só as próprias, marca como lida e marca todas", async () => {
      const u = await signUp(ctx.app)
      const other = await signUp(ctx.app)
      const [n1] = await ctx.db.insert(notifications).values({ userId: u.id, title: "Oi" }).returning()
      await ctx.db.insert(notifications).values({ userId: u.id, title: "Olá", kind: "success" })
      const [foreign] = await ctx.db.insert(notifications).values({ userId: other.id, title: "Alheia" }).returning()

      const list = await u.agent.get("/api/me/notifications?limit=10")
      expect(list.status).toBe(200)
      expect(list.body).toHaveLength(2)
      expect(list.body.every((n: { user_id: string }) => n.user_id === u.id)).toBe(true)

      expect((await u.agent.post(`/api/me/notifications/${n1!.id}/read`)).status).toBe(204)
      expect((await u.agent.post(`/api/me/notifications/${foreign!.id}/read`)).status).toBe(404)
      expect(await count(ctx, sql`select count(*)::int as n from notifications where read`)).toBe(1)

      expect((await u.agent.post("/api/me/notifications/read-all")).status).toBe(204)
      expect(await count(ctx, sql`select count(*)::int as n from notifications where user_id = ${u.id} and not read`)).toBe(0)
      expect(await count(ctx, sql`select count(*)::int as n from notifications where user_id = ${other.id} and not read`)).toBe(1)
    })
  })

  describe("bibliotecas", () => {
    it("catálogo público mostra só as ativas; admin vê todas e alterna", async () => {
      const admin = await signUp(ctx.app, "admin", ctx.db)
      const [np] = await ctx.db.insert(libraryCatalog).values({ name: "numpy", displayName: "NumPy", category: "data-science" }).returning()
      await ctx.db.insert(libraryCatalog).values({ name: "velha", displayName: "Velha", active: false })
      const pub = await agent(ctx.app).get("/api/library")
      expect(pub.status).toBe(200)
      expect(pub.body.map((l: { name: string }) => l.name)).toEqual(["numpy"])
      expect((await admin.agent.get("/api/admin/library")).body).toHaveLength(2)

      expect((await admin.agent.patch(`/api/admin/library/${np!.id}`, { active: false })).status).toBe(204)
      expect((await agent(ctx.app).get("/api/library")).body).toEqual([])
      expect(await count(ctx, sql`select count(*)::int as n from audit_log where action = 'library.deactivate'`)).toBe(1)
    })

    it("professor solicita; admin aprova e a biblioteca entra no catálogo", async () => {
      const student = await signUp(ctx.app)
      const teacher = await signUp(ctx.app, "teacher", ctx.db)
      const admin = await signUp(ctx.app, "admin", ctx.db)
      const input = { library_name: "pandas", display_name: "Pandas", use_case: "Aula de dados" }
      expect((await student.agent.post("/api/library/requests", input)).status).toBe(403)

      const req = await teacher.agent.post("/api/library/requests", input)
      expect(req.status).toBe(201)
      expect(req.body).toMatchObject({ requested_by: teacher.id, status: "pending", library_name: "pandas" })
      expect((await teacher.agent.post("/api/library/requests", input)).status).toBe(409)
      expect((await teacher.agent.get("/api/me/library/requests")).body).toHaveLength(1)

      const all = await admin.agent.get("/api/admin/library/requests")
      expect(all.body[0]).toMatchObject({ id: req.body.id, requester_name: expect.any(String) })

      const review = await admin.agent.post(`/api/admin/library/requests/${req.body.id}/review`, {
        status: "approved",
        review_notes: "ok",
        catalog: { display_name: "Pandas", category: "data-science" },
      })
      expect(review.status).toBe(200)
      expect(review.body).toMatchObject({ status: "approved", reviewed_by: admin.id, review_notes: "ok" })
      expect((await agent(ctx.app).get("/api/library")).body).toEqual([expect.objectContaining({ name: "pandas", display_name: "Pandas", added_by: admin.id })])
      expect(await count(ctx, sql`select count(*)::int as n from notifications where user_id = ${teacher.id}`)).toBe(1)
      expect(await count(ctx, sql`select count(*)::int as n from audit_log where action = 'library.approve'`)).toBe(1)

      const again = await admin.agent.post(`/api/admin/library/requests/${req.body.id}/review`, { status: "rejected" })
      expect(again.status).toBe(409)
    })
  })

  describe("solicitação de professor", () => {
    it("uma pendente por usuário; aprovação muda o papel, notifica e audita", async () => {
      const u = await signUp(ctx.app)
      const admin = await signUp(ctx.app, "admin", ctx.db)

      const none = await u.agent.get("/api/me/teacher-request")
      expect(none.status).toBe(200)
      expect(none.body).toBeNull()

      const body = { institution: "IME-USP", motivation: "Quero criar exercícios para minha turma." }
      const created = await u.agent.post("/api/me/teacher-request", body)
      expect(created.status).toBe(201)
      expect(created.body).toMatchObject({ user_id: u.id, email: u.email, status: "pending", institution: "IME-USP" })

      const dup = await u.agent.post("/api/me/teacher-request", body)
      expect(dup.status).toBe(409)
      expect(dup.body.code).toBe("REQUEST_PENDING")
      expect((await u.agent.get("/api/me/teacher-request")).body.id).toBe(created.body.id)

      expect((await u.agent.post(`/api/admin/teacher-approvals/${created.body.id}/approve`, {})).status).toBe(403)
      const pending = await admin.agent.get("/api/admin/teacher-approvals?status=pending")
      expect(pending.body.map((a: { id: string }) => a.id)).toEqual([created.body.id])

      expect((await admin.agent.post(`/api/admin/teacher-approvals/${created.body.id}/approve`, { note: "Bem-vinda!" })).status).toBe(204)
      expect((await u.agent.get("/api/auth/me")).body.user.role).toBe("teacher")
      const mine = (await u.agent.get("/api/me/teacher-request")).body
      expect(mine).toMatchObject({ status: "approved", reviewed_by: admin.id, review_note: "Bem-vinda!" })
      expect(mine.reviewed_at).toBeTruthy()
      const notes = (await u.agent.get("/api/me/notifications")).body
      expect(notes).toEqual([expect.objectContaining({ kind: "success", title: expect.stringMatching(/professor/i) })])
      expect(await count(ctx, sql`select count(*)::int as n from audit_log where action = 'teacher.approve'`)).toBe(1)

      expect((await admin.agent.post(`/api/admin/teacher-approvals/${created.body.id}/reject`)).status).toBe(409)
      expect((await u.agent.post("/api/me/teacher-request", body)).status).toBe(409)
      expect((await admin.agent.get("/api/admin/teacher-approvals")).body).toEqual([])
      expect((await admin.agent.get("/api/admin/teacher-approvals?status=all")).body).toHaveLength(1)
    })

    it("rejeição mantém o papel e permite nova solicitação", async () => {
      const u = await signUp(ctx.app)
      const admin = await signUp(ctx.app, "admin", ctx.db)
      const body = { motivation: "Quero ensinar Python na escola." }
      const first = (await u.agent.post("/api/me/teacher-request", body)).body
      expect((await admin.agent.post(`/api/admin/teacher-approvals/${first.id}/reject`, { note: "Faltam dados" })).status).toBe(204)
      expect((await u.agent.get("/api/auth/me")).body.user.role).toBe("student")
      expect((await u.agent.get("/api/me/teacher-request")).body).toMatchObject({ status: "rejected", review_note: "Faltam dados" })
      expect((await u.agent.post("/api/me/teacher-request", body)).status).toBe(201)
      expect((await u.agent.post("/api/me/teacher-request", { motivation: "curta" })).status).toBe(400)
    })
  })
})
