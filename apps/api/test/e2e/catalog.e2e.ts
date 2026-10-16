import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { randomUUID } from "node:crypto"
import { existsSync } from "node:fs"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { eq, sql } from "drizzle-orm"
import { courses, lessonProgress, submissions, uploads } from "@levelusp/db"
import type { TestCase } from "@levelusp/contracts"
import { agent, createLesson, createTestApp, signUp, type Agent, type TestContext } from "./harness"

const cases: TestCase[] = [{ id: "c1", kind: "call", function: "soma", args: [2, 3], kwargs: {}, expected: 5 }]
const SECRET = "valor-secreto-do-gabarito"
const secretCases: TestCase[] = [{ id: "s1", kind: "io", stdin: "", expected_stdout: SECRET, match: "trimmed" }]

async function newCourse(a: Agent, body: Record<string, unknown> = {}) {
  const res = await a.post("/api/courses", { title: "Python do zero", description: "curso", ...body })
  expect(res.status).toBe(201)
  return res.body as { id: string; published: boolean; created_by: string }
}

describe("Catálogo (e2e)", () => {
  let ctx: TestContext
  beforeAll(async () => {
    ctx = await createTestApp()
  })
  afterAll(() => ctx.close())
  beforeEach(() => ctx.reset())

  describe("cursos — autorização", () => {
    it("aluno não cria curso (403) e anônimo precisa de login (401)", async () => {
      const { agent: aluno } = await signUp(ctx.app)
      expect((await aluno.post("/api/courses", { title: "Meu curso" })).status).toBe(403)
      expect((await agent(ctx.app).post("/api/courses", { title: "Meu curso" })).status).toBe(401)
    })

    it("professor cria rascunho em seu nome; rascunho é invisível para os outros", async () => {
      const prof = await signUp(ctx.app, "teacher", ctx.db)
      const course = await newCourse(prof.agent)
      expect(course).toMatchObject({ published: false, created_by: prof.id, lesson_count: 0 })

      const { agent: aluno } = await signUp(ctx.app)
      const anon = agent(ctx.app)
      expect((await aluno.get(`/api/courses/${course.id}`)).status).toBe(404)
      expect((await anon.get(`/api/courses/${course.id}`)).status).toBe(404)
      expect((await anon.get(`/api/courses/${course.id}/lessons`)).status).toBe(404)
      expect((await anon.get("/api/courses")).body).toEqual([])

      expect((await prof.agent.get(`/api/courses/${course.id}`)).status).toBe(200)
      const admin = await signUp(ctx.app, "admin", ctx.db)
      expect((await admin.agent.get(`/api/courses/${course.id}`)).status).toBe(200)
    })

    it("professor não edita, publica nem exclui curso de outro", async () => {
      const dono = await signUp(ctx.app, "teacher", ctx.db)
      const outro = await signUp(ctx.app, "teacher", ctx.db)
      const course = await newCourse(dono.agent)

      // Rascunho de outro: nem existe para ele.
      expect((await outro.agent.patch(`/api/courses/${course.id}`, { title: "Invadido" })).status).toBe(404)
      await dono.agent.patch(`/api/courses/${course.id}/publish`, { published: true })
      // Publicado: existe, mas não é dele.
      expect((await outro.agent.patch(`/api/courses/${course.id}`, { title: "Invadido" })).status).toBe(403)
      expect((await outro.agent.patch(`/api/courses/${course.id}/publish`, { published: false })).status).toBe(403)
      expect((await outro.agent.delete(`/api/courses/${course.id}`)).status).toBe(403)

      const admin = await signUp(ctx.app, "admin", ctx.db)
      const edited = await admin.agent.patch(`/api/courses/${course.id}`, { title: "Ajustado pelo admin" })
      expect(edited.status).toBe(200)
      expect(edited.body.title).toBe("Ajustado pelo admin")
    })

    it("PATCH altera só os campos enviados", async () => {
      const prof = await signUp(ctx.app, "teacher", ctx.db)
      const course = await newCourse(prof.agent, { level: "avancado", tags: ["python"], estimated_hours: 12 })
      const res = await prof.agent.patch(`/api/courses/${course.id}`, { title: "Novo título" })
      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({ title: "Novo título", level: "avancado", tags: ["python"], estimated_hours: 12, description: "curso" })
    })

    it("valida a entrada com o schema do contrato", async () => {
      const prof = await signUp(ctx.app, "teacher", ctx.db)
      const res = await prof.agent.post("/api/courses", { title: "x", level: "expert" })
      expect(res.status).toBe(400)
      expect(res.body.code).toBe("VALIDATION")
    })

    it("/teacher/courses: professor vê os seus; admin vê todos; aluno 403", async () => {
      const a = await signUp(ctx.app, "teacher", ctx.db)
      const b = await signUp(ctx.app, "teacher", ctx.db)
      const ca = await newCourse(a.agent, { title: "Curso A" })
      await newCourse(b.agent, { title: "Curso B" })
      const mine = await a.agent.get("/api/teacher/courses")
      expect(mine.body.map((c: { id: string }) => c.id)).toEqual([ca.id])
      const admin = await signUp(ctx.app, "admin", ctx.db)
      expect((await admin.agent.get("/api/teacher/courses")).body).toHaveLength(2)
      const { agent: aluno } = await signUp(ctx.app)
      expect((await aluno.get("/api/teacher/courses")).status).toBe(403)
    })

    it("excluir curso remove a capa do disco e desvincula as lições", async () => {
      const prof = await signUp(ctx.app, "teacher", ctx.db)
      const dir = "/tmp/levelusp-test-uploads"
      await mkdir(dir, { recursive: true })
      const name = `${randomUUID()}.png`
      await writeFile(path.join(dir, name), "png")
      await ctx.db.insert(uploads).values({ name, ownerId: prof.id, bytes: 3 })
      const course = await newCourse(prof.agent, { cover_image_url: `/api/files/${name}` })
      const lesson = await createLesson(ctx.db, { courseId: course.id, createdBy: prof.id })

      expect((await prof.agent.delete(`/api/courses/${course.id}`)).status).toBe(204)
      expect(existsSync(path.join(dir, name))).toBe(false)
      expect(await ctx.db.query.courses.findFirst({ where: eq(courses.id, course.id) })).toBeUndefined()
      expect((await prof.agent.get(`/api/lessons/${lesson.id}`)).body.course_id).toBeNull()
    })
  })

  describe("cursos — listagem e lições", () => {
    it("lista publicados com lesson_count (só publicadas) e enrolled apenas com sessão", async () => {
      const prof = await signUp(ctx.app, "teacher", ctx.db)
      const course = await newCourse(prof.agent)
      await prof.agent.patch(`/api/courses/${course.id}/publish`, { published: true })
      await createLesson(ctx.db, { courseId: course.id, createdBy: prof.id })
      await createLesson(ctx.db, { courseId: course.id, createdBy: prof.id })
      await createLesson(ctx.db, { courseId: course.id, createdBy: prof.id, published: false })

      const anon = await agent(ctx.app).get("/api/courses")
      expect(anon.status).toBe(200)
      expect(anon.body).toHaveLength(1)
      expect(anon.body[0].lesson_count).toBe(2)
      expect(anon.body[0]).not.toHaveProperty("enrolled")

      const { agent: aluno } = await signUp(ctx.app)
      expect((await aluno.get("/api/courses")).body[0].enrolled).toBe(false)
      await aluno.post(`/api/courses/${course.id}/enrollment`)
      expect((await aluno.get("/api/courses")).body[0].enrolled).toBe(true)
      expect((await aluno.get(`/api/courses/${course.id}`)).body).toMatchObject({ enrolled: true, lesson_count: 2 })
    })

    it("aluno vê só lições publicadas do curso; dono vê todas — nunca com gabarito", async () => {
      const prof = await signUp(ctx.app, "teacher", ctx.db)
      const course = await newCourse(prof.agent)
      await prof.agent.patch(`/api/courses/${course.id}/publish`, { published: true })
      await createLesson(ctx.db, { courseId: course.id, createdBy: prof.id, order: 2, title: "Segunda", testCases: secretCases })
      await createLesson(ctx.db, { courseId: course.id, createdBy: prof.id, order: 1, title: "Primeira", testCases: secretCases })
      await createLesson(ctx.db, { courseId: course.id, createdBy: prof.id, order: 3, published: false, testCases: secretCases })

      const anon = await agent(ctx.app).get(`/api/courses/${course.id}/lessons`)
      expect(anon.body.map((l: { title: string }) => l.title)).toEqual(["Primeira", "Segunda"])
      const owner = await prof.agent.get(`/api/courses/${course.id}/lessons`)
      expect(owner.body).toHaveLength(3)
      for (const res of [anon, owner]) {
        expect(JSON.stringify(res.body)).not.toContain(SECRET)
        for (const l of res.body) expect(l).not.toHaveProperty("test_cases")
      }
    })

    it("reordena as lições numa transação e recusa ids de fora ou repetidos", async () => {
      const prof = await signUp(ctx.app, "teacher", ctx.db)
      const course = await newCourse(prof.agent)
      const l1 = await createLesson(ctx.db, { courseId: course.id, createdBy: prof.id, order: 1 })
      const l2 = await createLesson(ctx.db, { courseId: course.id, createdBy: prof.id, order: 2 })
      const l3 = await createLesson(ctx.db, { courseId: course.id, createdBy: prof.id, order: 3 })
      const fora = await createLesson(ctx.db, { createdBy: prof.id })

      const res = await prof.agent.put(`/api/courses/${course.id}/lessons/order`, { lesson_ids: [l3.id, l1.id, l2.id] })
      expect(res.status).toBe(204)
      const list = await prof.agent.get(`/api/courses/${course.id}/lessons`)
      expect(list.body.map((l: { id: string; order: number }) => [l.id, l.order])).toEqual([[l3.id, 1], [l1.id, 2], [l2.id, 3]])

      const foreign = await prof.agent.put(`/api/courses/${course.id}/lessons/order`, { lesson_ids: [l1.id, fora.id] })
      expect(foreign.status).toBe(400)
      expect(foreign.body.code).toBe("LESSON_NOT_IN_COURSE")
      const dup = await prof.agent.put(`/api/courses/${course.id}/lessons/order`, { lesson_ids: [l1.id, l1.id] })
      expect(dup.status).toBe(400)
      // Nada mudou depois das tentativas recusadas.
      const again = await prof.agent.get(`/api/courses/${course.id}/lessons`)
      expect(again.body.map((l: { id: string }) => l.id)).toEqual([l3.id, l1.id, l2.id])

      const outro = await signUp(ctx.app, "teacher", ctx.db)
      await prof.agent.patch(`/api/courses/${course.id}/publish`, { published: true })
      expect((await outro.agent.put(`/api/courses/${course.id}/lessons/order`, { lesson_ids: [l1.id] })).status).toBe(403)
    })

    it("anexa lição própria ao fim do curso e desanexa", async () => {
      const prof = await signUp(ctx.app, "teacher", ctx.db)
      const course = await newCourse(prof.agent)
      await createLesson(ctx.db, { courseId: course.id, createdBy: prof.id, order: 4 })
      const avulsa = await createLesson(ctx.db, { createdBy: prof.id })

      expect((await prof.agent.post(`/api/courses/${course.id}/lessons`, { lesson_id: avulsa.id })).status).toBe(204)
      let row = (await prof.agent.get(`/api/lessons/${avulsa.id}`)).body
      expect(row).toMatchObject({ course_id: course.id, order: 5 })

      expect((await prof.agent.delete(`/api/courses/${course.id}/lessons/${avulsa.id}`)).status).toBe(204)
      row = (await prof.agent.get(`/api/lessons/${avulsa.id}`)).body
      expect(row.course_id).toBeNull()
      expect((await prof.agent.delete(`/api/courses/${course.id}/lessons/${avulsa.id}`)).status).toBe(404)

      // Lição de outro professor não pode ser anexada.
      const outro = await signUp(ctx.app, "teacher", ctx.db)
      const alheia = await createLesson(ctx.db, { createdBy: outro.id })
      expect((await prof.agent.post(`/api/courses/${course.id}/lessons`, { lesson_id: alheia.id })).status).toBe(403)
    })
  })

  describe("matrícula", () => {
    it("matricula e desmatricula em curso publicado; rascunho responde 404", async () => {
      const prof = await signUp(ctx.app, "teacher", ctx.db)
      const course = await newCourse(prof.agent)
      const { agent: aluno } = await signUp(ctx.app)

      expect((await aluno.post(`/api/courses/${course.id}/enrollment`)).status).toBe(404)
      await prof.agent.patch(`/api/courses/${course.id}/publish`, { published: true })
      expect((await aluno.post(`/api/courses/${course.id}/enrollment`)).status).toBe(204)
      expect((await aluno.post(`/api/courses/${course.id}/enrollment`)).status).toBe(204) // idempotente
      expect((await aluno.get("/api/me/enrollments")).body).toEqual([course.id])

      expect((await aluno.delete(`/api/courses/${course.id}/enrollment`)).status).toBe(204)
      expect((await aluno.get("/api/me/enrollments")).body).toEqual([])
      expect((await agent(ctx.app).post(`/api/courses/${course.id}/enrollment`)).status).toBe(401)
    })
  })

  describe("lições", () => {
    it("GET /lessons/:id e listagens nunca trazem o gabarito; authoring só para o dono", async () => {
      const prof = await signUp(ctx.app, "teacher", ctx.db)
      const lesson = await createLesson(ctx.db, { createdBy: prof.id, testCases: secretCases })
      const { agent: aluno } = await signUp(ctx.app)

      for (const url of [`/api/lessons/${lesson.id}`, "/api/lessons", "/api/lessons/summaries"]) {
        const res = await aluno.get(url)
        expect(res.status).toBe(200)
        expect(JSON.stringify(res.body)).not.toContain(SECRET)
        expect(JSON.stringify(res.body)).not.toContain("test_cases")
      }
      // Nem o dono recebe gabarito pela rota do aluno.
      expect((await prof.agent.get(`/api/lessons/${lesson.id}`)).body).not.toHaveProperty("test_cases")

      const auth = await prof.agent.get(`/api/lessons/${lesson.id}/authoring`)
      expect(auth.status).toBe(200)
      expect(auth.body.test_cases).toEqual(secretCases)

      const outro = await signUp(ctx.app, "teacher", ctx.db)
      expect((await outro.agent.get(`/api/lessons/${lesson.id}/authoring`)).status).toBe(403)
      expect((await aluno.get(`/api/lessons/${lesson.id}/authoring`)).status).toBe(403)
    })

    it("rascunho é invisível para quem não é dono ou admin", async () => {
      const prof = await signUp(ctx.app, "teacher", ctx.db)
      const draft = await createLesson(ctx.db, { createdBy: prof.id, published: false, testCases: cases })
      const { agent: aluno } = await signUp(ctx.app)
      expect((await aluno.get(`/api/lessons/${draft.id}`)).status).toBe(404)
      expect((await agent(ctx.app).get(`/api/lessons/${draft.id}`)).status).toBe(404)
      expect((await aluno.get("/api/lessons")).body).toEqual([])
      expect((await prof.agent.get(`/api/lessons/${draft.id}`)).status).toBe(200)
      const outro = await signUp(ctx.app, "teacher", ctx.db)
      expect((await outro.agent.patch(`/api/lessons/${draft.id}`, { title: "Invadida" })).status).toBe(404)
    })

    it("cria rascunho com slug único e devolve LessonWithTests ao autor", async () => {
      const prof = await signUp(ctx.app, "teacher", ctx.db)
      const body = { title: "Funções em Python", test_cases: cases }
      const a = await prof.agent.post("/api/lessons", body)
      expect(a.status).toBe(201)
      expect(a.body).toMatchObject({ slug: "funcoes-em-python", published: false, created_by: prof.id, test_cases: cases })
      const b = await prof.agent.post("/api/lessons", body)
      expect(b.body.slug).toBe("funcoes-em-python-2")

      const { agent: aluno } = await signUp(ctx.app)
      expect((await aluno.post("/api/lessons", body)).status).toBe(403)
      expect((await prof.agent.post("/api/lessons", { title: "ok", lesson_type: "video" })).status).toBe(400)
    })

    it("não vincula lição a curso de outro professor", async () => {
      const dono = await signUp(ctx.app, "teacher", ctx.db)
      const course = await newCourse(dono.agent)
      await dono.agent.patch(`/api/courses/${course.id}/publish`, { published: true })
      const outro = await signUp(ctx.app, "teacher", ctx.db)
      expect((await outro.agent.post("/api/lessons", { title: "Intrusa", course_id: course.id })).status).toBe(403)
    })

    it("PATCH altera só os campos enviados e mantém o gabarito", async () => {
      const prof = await signUp(ctx.app, "teacher", ctx.db)
      const created = (await prof.agent.post("/api/lessons", { title: "Laços", xp_reward: 80, test_cases: cases })).body
      const res = await prof.agent.patch(`/api/lessons/${created.id}`, { description: "nova descrição" })
      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({ title: "Laços", xp_reward: 80, description: "nova descrição", test_cases: cases })
    })

    it("publicar lição de código exige casos de teste (422 NO_TESTS)", async () => {
      const prof = await signUp(ctx.app, "teacher", ctx.db)
      const semTestes = (await prof.agent.post("/api/lessons", { title: "Sem gabarito" })).body
      const res = await prof.agent.patch(`/api/lessons/${semTestes.id}/publish`, { published: true })
      expect(res.status).toBe(422)
      expect(res.body.code).toBe("NO_TESTS")

      const ok = (await prof.agent.post("/api/lessons", { title: "Com gabarito", test_cases: cases })).body
      const pub = await prof.agent.patch(`/api/lessons/${ok.id}/publish`, { published: true })
      expect(pub.status).toBe(200)
      expect(pub.body.published).toBe(true)
      expect(pub.body).not.toHaveProperty("test_cases")

      // Lição publicada não pode perder o gabarito.
      const wipe = await prof.agent.patch(`/api/lessons/${ok.id}`, { test_cases: [] })
      expect(wipe.status).toBe(422)

      const teoria = (await prof.agent.post("/api/lessons", { title: "Teoria", lesson_type: "theory" })).body
      expect((await prof.agent.patch(`/api/lessons/${teoria.id}/publish`, { published: true })).status).toBe(200)
    })

    it("publicar quiz exige ao menos uma questão (422 NO_QUESTIONS)", async () => {
      const prof = await signUp(ctx.app, "teacher", ctx.db)
      const quiz = (await prof.agent.post("/api/lessons", { title: "Quiz de listas", lesson_type: "quiz" })).body
      const res = await prof.agent.patch(`/api/lessons/${quiz.id}/publish`, { published: true })
      expect(res.status).toBe(422)
      expect(res.body.code).toBe("NO_QUESTIONS")
    })

    it("dono exclui sua lição; outro professor não", async () => {
      const prof = await signUp(ctx.app, "teacher", ctx.db)
      const lesson = await createLesson(ctx.db, { createdBy: prof.id, testCases: cases })
      const outro = await signUp(ctx.app, "teacher", ctx.db)
      expect((await outro.agent.delete(`/api/lessons/${lesson.id}`)).status).toBe(403)
      expect((await prof.agent.delete(`/api/lessons/${lesson.id}`)).status).toBe(204)
      expect((await prof.agent.get(`/api/lessons/${lesson.id}`)).status).toBe(404)
    })

    it("/teacher/lessons e /teacher/metrics mostram só as lições do professor", async () => {
      const prof = await signUp(ctx.app, "teacher", ctx.db)
      const outro = await signUp(ctx.app, "teacher", ctx.db)
      const mine = await createLesson(ctx.db, { createdBy: prof.id, testCases: secretCases })
      const empty = await createLesson(ctx.db, { createdBy: prof.id, published: false })
      await createLesson(ctx.db, { createdBy: outro.id })

      const a1 = await signUp(ctx.app)
      const a2 = await signUp(ctx.app)
      await ctx.db.insert(lessonProgress).values([
        { userId: a1.id, lessonId: mine.id, status: "completed" },
        { userId: a2.id, lessonId: mine.id, status: "in_progress" },
      ])
      const files = [{ path: "main.py", content: "" }]
      await ctx.db.insert(submissions).values([
        { userId: a1.id, lessonId: mine.id, files, status: "graded", passed: true },
        { userId: a2.id, lessonId: mine.id, files, status: "graded", passed: false },
        { userId: a2.id, lessonId: mine.id, files, status: "graded", passed: false },
        { userId: a2.id, lessonId: mine.id, files, status: "graded", passed: false },
      ])

      const lessons = await prof.agent.get("/api/teacher/lessons")
      expect(lessons.body.map((l: { id: string }) => l.id).sort()).toEqual([mine.id, empty.id].sort())
      expect(JSON.stringify(lessons.body)).not.toContain(SECRET)

      const metrics = await prof.agent.get("/api/teacher/metrics")
      expect(metrics.status).toBe(200)
      const byId = Object.fromEntries(metrics.body.map((m: { lesson_id: string }) => [m.lesson_id, m]))
      expect(Object.keys(byId)).toHaveLength(2)
      expect(byId[mine.id]).toEqual({ lesson_id: mine.id, started: 2, completed: 1, submissions: 4, pass_rate: 0.25 })
      expect(byId[empty.id]).toEqual({ lesson_id: empty.id, started: 0, completed: 0, submissions: 0, pass_rate: null })

      const { agent: aluno } = await signUp(ctx.app)
      expect((await aluno.get("/api/teacher/metrics")).status).toBe(403)
    })
  })

  describe("módulos", () => {
    it("admin faz CRUD; professor não; contagem só de lições publicadas", async () => {
      const admin = await signUp(ctx.app, "admin", ctx.db)
      const prof = await signUp(ctx.app, "teacher", ctx.db)
      expect((await prof.agent.post("/api/modules", { title: "Básico" })).status).toBe(403)

      const created = await admin.agent.post("/api/modules", { title: "Básico", sort_order: 2 })
      expect(created.status).toBe(201)
      const second = (await admin.agent.post("/api/modules", { title: "Avançado", sort_order: 1 })).body
      const mod = created.body as { id: string }

      const patched = await admin.agent.patch(`/api/modules/${mod.id}`, { description: "fundamentos" })
      expect(patched.body).toMatchObject({ title: "Básico", description: "fundamentos", sort_order: 2 })

      const list = await agent(ctx.app).get("/api/modules")
      expect(list.body.map((m: { title: string }) => m.title)).toEqual(["Avançado", "Básico"])

      await createLesson(ctx.db, { moduleId: mod.id })
      await createLesson(ctx.db, { moduleId: mod.id })
      await createLesson(ctx.db, { moduleId: mod.id, published: false })
      const counts = await agent(ctx.app).get("/api/modules/lesson-counts")
      expect(counts.body).toEqual({ [mod.id]: 2 })

      expect((await admin.agent.delete(`/api/modules/${second.id}`)).status).toBe(204)
      expect((await admin.agent.delete(`/api/modules/${second.id}`)).status).toBe(404)
      const audit = await ctx.db.execute(sql`select action from audit_log order by created_at`)
      expect(audit.rows.map((r) => (r as { action: string }).action)).toContain("module.delete")
    })
  })
})
