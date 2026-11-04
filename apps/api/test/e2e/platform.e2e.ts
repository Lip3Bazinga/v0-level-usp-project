import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { sql } from "drizzle-orm"
import { courses, libraryCatalog, notifications } from "@levelusp/db"
import type { ApiErrorBody, LibraryCatalog, LibraryRequest, Note, Notification, SessionResponse, TeacherApproval } from "@levelusp/contracts"
import { agent, bodyOf, countRows, createLesson, createTestApp, signUp, type TestContext } from "./harness"
import { requireRow } from "@/common/database/rows"

describe("Notas, notificações, bibliotecas e solicitações de professor (e2e)", () => {
  let ctx: TestContext
  beforeAll(async () => {
    ctx = await createTestApp()
  })
  afterAll(() => ctx.close())
  beforeEach(() => ctx.reset())

  describe("notas", () => {
    it("CRUD do dono com título da lição/curso vinculados", async () => {
      const { agent: userAgent, id } = await signUp(ctx.app)
      const lesson = await createLesson(ctx.db, { title: "Funções" })
      const course = requireRow(await ctx.db.insert(courses).values({ title: "Python 1", published: true }).returning(), "courses")

      const created = await userAgent.post("/api/me/notes", { title: "Resumo", content: "def f(): ...", lesson_id: lesson.id, course_id: course.id })
      expect(created.status).toBe(201)
      expect(created.body).toMatchObject({ user_id: id, title: "Resumo", lesson_title: "Funções", course_title: "Python 1" })

      const list = await userAgent.get("/api/me/notes")
      expect(list.body).toHaveLength(1)
      expect(bodyOf<Note[]>(list)[0]).toMatchObject({ lesson_title: "Funções", course_title: "Python 1" })

      const updated = await userAgent.patch(`/api/me/notes/${bodyOf<Note>(created).id}`, { content: "novo" })
      expect(updated.status).toBe(200)
      expect(updated.body).toMatchObject({ title: "Resumo", content: "novo" })

      expect((await userAgent.delete(`/api/me/notes/${bodyOf<Note>(created).id}`)).status).toBe(204)
      expect((await userAgent.get("/api/me/notes")).body).toEqual([])
    })

    it("notas são isoladas por dono: outro usuário recebe 404", async () => {
      const owner = await signUp(ctx.app)
      const other = await signUp(ctx.app)
      const note = bodyOf<Note>(await owner.agent.post("/api/me/notes", { title: "Minha", content: "segredo" }))
      expect((await other.agent.get("/api/me/notes")).body).toEqual([])
      expect((await other.agent.patch(`/api/me/notes/${note.id}`, { content: "hack" })).status).toBe(404)
      expect((await other.agent.delete(`/api/me/notes/${note.id}`)).status).toBe(404)
      const still = bodyOf<Note[]>(await owner.agent.get("/api/me/notes"))
      expect(still).toHaveLength(1)
      expect(still[0]?.content).toBe("segredo")
      expect((await agent(ctx.app).get("/api/me/notes")).status).toBe(401)
    })

    it("não vincula nota a lição inexistente ou rascunho alheio", async () => {
      const { agent: userAgent } = await signUp(ctx.app)
      const draft = await createLesson(ctx.db, { title: "Rascunho secreto", published: false })
      expect((await userAgent.post("/api/me/notes", { content: "x", lesson_id: draft.id })).status).toBe(404)
      expect((await userAgent.post("/api/me/notes", { content: "x", lesson_id: "00000000-0000-4000-8000-000000000000" })).status).toBe(404)
      expect((await userAgent.post("/api/me/notes", { content: "x", lesson_id: "abc" })).status).toBe(400)
    })
  })

  describe("notificações", () => {
    it("lista só as próprias, marca como lida e marca todas", async () => {
      const user = await signUp(ctx.app)
      const other = await signUp(ctx.app)
      const ownNotification = requireRow(await ctx.db.insert(notifications).values({ userId: user.id, title: "Oi" }).returning(), "notifications")
      await ctx.db.insert(notifications).values({ userId: user.id, title: "Olá", kind: "success" })
      const foreignNotification = requireRow(await ctx.db.insert(notifications).values({ userId: other.id, title: "Alheia" }).returning(), "notifications")

      const list = await user.agent.get("/api/me/notifications?limit=10")
      expect(list.status).toBe(200)
      expect(list.body).toHaveLength(2)
      expect(bodyOf<Notification[]>(list).every((notification) => notification.user_id === user.id)).toBe(true)

      expect((await user.agent.post(`/api/me/notifications/${ownNotification.id}/read`)).status).toBe(204)
      expect((await user.agent.post(`/api/me/notifications/${foreignNotification.id}/read`)).status).toBe(404)
      expect(await countRows(ctx.db, sql`select count(*)::int as n from notifications where read`)).toBe(1)

      expect((await user.agent.post("/api/me/notifications/read-all")).status).toBe(204)
      expect(await countRows(ctx.db, sql`select count(*)::int as n from notifications where user_id = ${user.id} and not read`)).toBe(0)
      expect(await countRows(ctx.db, sql`select count(*)::int as n from notifications where user_id = ${other.id} and not read`)).toBe(1)
    })
  })

  describe("bibliotecas", () => {
    it("catálogo público mostra só as ativas; admin vê todas e alterna", async () => {
      const admin = await signUp(ctx.app, "admin", ctx.db)
      const numpy = requireRow(await ctx.db.insert(libraryCatalog).values({ name: "numpy", displayName: "NumPy", category: "data-science" }).returning(), "library_catalog")
      await ctx.db.insert(libraryCatalog).values({ name: "velha", displayName: "Velha", active: false })
      const publicCatalog = await agent(ctx.app).get("/api/library")
      expect(publicCatalog.status).toBe(200)
      expect(bodyOf<LibraryCatalog[]>(publicCatalog).map((library) => library.name)).toEqual(["numpy"])
      expect((await admin.agent.get("/api/admin/library")).body).toHaveLength(2)

      expect((await admin.agent.patch(`/api/admin/library/${numpy.id}`, { active: false })).status).toBe(204)
      expect((await agent(ctx.app).get("/api/library")).body).toEqual([])
      expect(await countRows(ctx.db, sql`select count(*)::int as n from audit_log where action = 'library.deactivate'`)).toBe(1)
    })

    it("professor solicita; admin aprova e a biblioteca entra no catálogo", async () => {
      const student = await signUp(ctx.app)
      const teacher = await signUp(ctx.app, "teacher", ctx.db)
      const admin = await signUp(ctx.app, "admin", ctx.db)
      const input = { library_name: "pandas", display_name: "Pandas", use_case: "Aula de dados" }
      expect((await student.agent.post("/api/library/requests", input)).status).toBe(403)

      const libraryRequest = await teacher.agent.post("/api/library/requests", input)
      expect(libraryRequest.status).toBe(201)
      expect(libraryRequest.body).toMatchObject({ requested_by: teacher.id, status: "pending", library_name: "pandas" })
      expect((await teacher.agent.post("/api/library/requests", input)).status).toBe(409)
      expect((await teacher.agent.get("/api/me/library/requests")).body).toHaveLength(1)

      const all = await admin.agent.get("/api/admin/library/requests")
      const requested = bodyOf<LibraryRequest>(libraryRequest)
      const [listed] = bodyOf<LibraryRequest[]>(all)
      expect(listed?.id).toBe(requested.id)
      expect(listed?.requester_name).toEqual(expect.any(String))

      const review = await admin.agent.post(`/api/admin/library/requests/${requested.id}/review`, {
        status: "approved",
        review_notes: "ok",
        catalog: { display_name: "Pandas", category: "data-science" },
      })
      expect(review.status).toBe(200)
      expect(review.body).toMatchObject({ status: "approved", reviewed_by: admin.id, review_notes: "ok" })
      expect((await agent(ctx.app).get("/api/library")).body).toEqual([expect.objectContaining({ name: "pandas", display_name: "Pandas", added_by: admin.id })])
      expect(await countRows(ctx.db, sql`select count(*)::int as n from notifications where user_id = ${teacher.id}`)).toBe(1)
      expect(await countRows(ctx.db, sql`select count(*)::int as n from audit_log where action = 'library.approve'`)).toBe(1)

      const again = await admin.agent.post(`/api/admin/library/requests/${requested.id}/review`, { status: "rejected" })
      expect(again.status).toBe(409)
    })
  })

  describe("solicitação de professor", () => {
    it("uma pendente por usuário; aprovação muda o papel, notifica e audita", async () => {
      const user = await signUp(ctx.app)
      const admin = await signUp(ctx.app, "admin", ctx.db)

      const none = await user.agent.get("/api/me/teacher-request")
      expect(none.status).toBe(200)
      expect(none.body).toBeNull()

      const body = { institution: "IME-USP", motivation: "Quero criar exercícios para minha turma." }
      const created = await user.agent.post("/api/me/teacher-request", body)
      expect(created.status).toBe(201)
      expect(created.body).toMatchObject({ user_id: user.id, email: user.email, status: "pending", institution: "IME-USP" })

      const duplicate = await user.agent.post("/api/me/teacher-request", body)
      expect(duplicate.status).toBe(409)
      expect(bodyOf<ApiErrorBody>(duplicate).code).toBe("REQUEST_PENDING")
      const request = bodyOf<TeacherApproval>(created)
      expect(bodyOf<TeacherApproval>(await user.agent.get("/api/me/teacher-request")).id).toBe(request.id)

      expect((await user.agent.post(`/api/admin/teacher-approvals/${request.id}/approve`, {})).status).toBe(403)
      const pending = await admin.agent.get("/api/admin/teacher-approvals?status=pending")
      expect(bodyOf<TeacherApproval[]>(pending).map((approval) => approval.id)).toEqual([request.id])

      expect((await admin.agent.post(`/api/admin/teacher-approvals/${request.id}/approve`, { note: "Bem-vinda!" })).status).toBe(204)
      expect(bodyOf<SessionResponse>(await user.agent.get("/api/auth/me")).user.role).toBe("teacher")
      const mine = bodyOf<TeacherApproval>(await user.agent.get("/api/me/teacher-request"))
      expect(mine).toMatchObject({ status: "approved", reviewed_by: admin.id, review_note: "Bem-vinda!" })
      expect(mine.reviewed_at).toBeTruthy()
      const notes = bodyOf<Notification[]>(await user.agent.get("/api/me/notifications"))
      expect(notes).toHaveLength(1)
      expect(notes[0]?.kind).toBe("success")
      expect(notes[0]?.title).toMatch(/professor/i)
      expect(await countRows(ctx.db, sql`select count(*)::int as n from audit_log where action = 'teacher.approve'`)).toBe(1)

      expect((await admin.agent.post(`/api/admin/teacher-approvals/${request.id}/reject`)).status).toBe(409)
      expect((await user.agent.post("/api/me/teacher-request", body)).status).toBe(409)
      expect((await admin.agent.get("/api/admin/teacher-approvals")).body).toEqual([])
      expect((await admin.agent.get("/api/admin/teacher-approvals?status=all")).body).toHaveLength(1)
    })

    it("rejeição mantém o papel e permite nova solicitação", async () => {
      const user = await signUp(ctx.app)
      const admin = await signUp(ctx.app, "admin", ctx.db)
      const body = { motivation: "Quero ensinar Python na escola." }
      const first = bodyOf<TeacherApproval>(await user.agent.post("/api/me/teacher-request", body))
      expect((await admin.agent.post(`/api/admin/teacher-approvals/${first.id}/reject`, { note: "Faltam dados" })).status).toBe(204)
      expect(bodyOf<SessionResponse>(await user.agent.get("/api/auth/me")).user.role).toBe("student")
      expect((await user.agent.get("/api/me/teacher-request")).body).toMatchObject({ status: "rejected", review_note: "Faltam dados" })
      expect((await user.agent.post("/api/me/teacher-request", body)).status).toBe(201)
      expect((await user.agent.post("/api/me/teacher-request", { motivation: "curta" })).status).toBe(400)
    })
  })
})
