import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { randomUUID } from "node:crypto"
import { existsSync } from "node:fs"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { eq, sql } from "drizzle-orm"
import { courses, lessonProgress, submissions, uploads } from "@levelusp/db"
import type { ApiErrorBody, Course, Lesson, LessonMetrics, LessonWithTests, Module, TestCase } from "@levelusp/contracts"
import { agent, bodyOf, createLesson, createTestApp, queryRows, signUp, type Agent, type TestContext } from "./harness"

const cases: TestCase[] = [{ id: "c1", kind: "call", function: "soma", args: [2, 3], kwargs: {}, expected: 5 }]
const SECRET = "valor-secreto-do-gabarito"
const secretCases: TestCase[] = [{ id: "s1", kind: "io", stdin: "", expected_stdout: SECRET, match: "trimmed" }]

async function newCourse(author: Agent, body: Record<string, unknown> = {}): Promise<Course> {
  const response = await author.post("/api/courses", { title: "Python do zero", description: "curso", ...body })
  expect(response.status).toBe(201)
  return bodyOf<Course>(response)
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
      const { agent: studentAgent } = await signUp(ctx.app)
      expect((await studentAgent.post("/api/courses", { title: "Meu curso" })).status).toBe(403)
      expect((await agent(ctx.app).post("/api/courses", { title: "Meu curso" })).status).toBe(401)
    })

    it("professor cria rascunho em seu nome; rascunho é invisível para os outros", async () => {
      const teacher = await signUp(ctx.app, "teacher", ctx.db)
      const course = await newCourse(teacher.agent)
      expect(course).toMatchObject({ published: false, created_by: teacher.id, lesson_count: 0 })

      const { agent: studentAgent } = await signUp(ctx.app)
      const anonymous = agent(ctx.app)
      expect((await studentAgent.get(`/api/courses/${course.id}`)).status).toBe(404)
      expect((await anonymous.get(`/api/courses/${course.id}`)).status).toBe(404)
      expect((await anonymous.get(`/api/courses/${course.id}/lessons`)).status).toBe(404)
      expect((await anonymous.get("/api/courses")).body).toEqual([])

      expect((await teacher.agent.get(`/api/courses/${course.id}`)).status).toBe(200)
      const admin = await signUp(ctx.app, "admin", ctx.db)
      expect((await admin.agent.get(`/api/courses/${course.id}`)).status).toBe(200)
    })

    it("professor não edita, publica nem exclui curso de outro", async () => {
      const courseOwner = await signUp(ctx.app, "teacher", ctx.db)
      const otherTeacher = await signUp(ctx.app, "teacher", ctx.db)
      const course = await newCourse(courseOwner.agent)

      // Rascunho de outro: nem existe para ele.
      expect((await otherTeacher.agent.patch(`/api/courses/${course.id}`, { title: "Invadido" })).status).toBe(404)
      await courseOwner.agent.patch(`/api/courses/${course.id}/publish`, { published: true })
      // Publicado: existe, mas não é dele.
      expect((await otherTeacher.agent.patch(`/api/courses/${course.id}`, { title: "Invadido" })).status).toBe(403)
      expect((await otherTeacher.agent.patch(`/api/courses/${course.id}/publish`, { published: false })).status).toBe(403)
      expect((await otherTeacher.agent.delete(`/api/courses/${course.id}`)).status).toBe(403)

      const admin = await signUp(ctx.app, "admin", ctx.db)
      const edited = await admin.agent.patch(`/api/courses/${course.id}`, { title: "Ajustado pelo admin" })
      expect(edited.status).toBe(200)
      expect(bodyOf<Course>(edited).title).toBe("Ajustado pelo admin")
    })

    it("PATCH altera só os campos enviados", async () => {
      const teacher = await signUp(ctx.app, "teacher", ctx.db)
      const course = await newCourse(teacher.agent, { level: "avancado", tags: ["python"], estimated_hours: 12 })
      const response = await teacher.agent.patch(`/api/courses/${course.id}`, { title: "Novo título" })
      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({ title: "Novo título", level: "avancado", tags: ["python"], estimated_hours: 12, description: "curso" })
    })

    it("valida a entrada com o schema do contrato", async () => {
      const teacher = await signUp(ctx.app, "teacher", ctx.db)
      const response = await teacher.agent.post("/api/courses", { title: "x", level: "expert" })
      expect(response.status).toBe(400)
      expect(bodyOf<ApiErrorBody>(response).code).toBe("VALIDATION")
    })

    it("/teacher/courses: professor vê os seus; admin vê todos; aluno 403", async () => {
      const firstTeacher = await signUp(ctx.app, "teacher", ctx.db)
      const secondTeacher = await signUp(ctx.app, "teacher", ctx.db)
      const firstCourse = await newCourse(firstTeacher.agent, { title: "Curso A" })
      await newCourse(secondTeacher.agent, { title: "Curso B" })
      const mine = await firstTeacher.agent.get("/api/teacher/courses")
      expect(bodyOf<Course[]>(mine).map((course) => course.id)).toEqual([firstCourse.id])
      const admin = await signUp(ctx.app, "admin", ctx.db)
      expect((await admin.agent.get("/api/teacher/courses")).body).toHaveLength(2)
      const { agent: studentAgent } = await signUp(ctx.app)
      expect((await studentAgent.get("/api/teacher/courses")).status).toBe(403)
    })

    it("excluir curso remove a capa do disco e desvincula as lições", async () => {
      const teacher = await signUp(ctx.app, "teacher", ctx.db)
      const dir = "/tmp/levelusp-test-uploads"
      await mkdir(dir, { recursive: true })
      const name = `${randomUUID()}.png`
      await writeFile(path.join(dir, name), "png")
      await ctx.db.insert(uploads).values({ name, ownerId: teacher.id, bytes: 3 })
      const course = await newCourse(teacher.agent, { cover_image_url: `/api/files/${name}` })
      const lesson = await createLesson(ctx.db, { courseId: course.id, createdBy: teacher.id })

      expect((await teacher.agent.delete(`/api/courses/${course.id}`)).status).toBe(204)
      expect(existsSync(path.join(dir, name))).toBe(false)
      expect(await ctx.db.query.courses.findFirst({ where: eq(courses.id, course.id) })).toBeUndefined()
      expect(bodyOf<Lesson>(await teacher.agent.get(`/api/lessons/${lesson.id}`)).course_id).toBeNull()
    })
  })

  describe("cursos — listagem e lições", () => {
    it("lista publicados com lesson_count (só publicadas) e enrolled apenas com sessão", async () => {
      const teacher = await signUp(ctx.app, "teacher", ctx.db)
      const course = await newCourse(teacher.agent)
      await teacher.agent.patch(`/api/courses/${course.id}/publish`, { published: true })
      await createLesson(ctx.db, { courseId: course.id, createdBy: teacher.id })
      await createLesson(ctx.db, { courseId: course.id, createdBy: teacher.id })
      await createLesson(ctx.db, { courseId: course.id, createdBy: teacher.id, published: false })

      const anonymous = await agent(ctx.app).get("/api/courses")
      expect(anonymous.status).toBe(200)
      expect(anonymous.body).toHaveLength(1)
      expect(bodyOf<Course[]>(anonymous)[0]?.lesson_count).toBe(2)
      expect(bodyOf<Course[]>(anonymous)[0]).not.toHaveProperty("enrolled")

      const { agent: studentAgent } = await signUp(ctx.app)
      expect(bodyOf<Course[]>(await studentAgent.get("/api/courses"))[0]?.enrolled).toBe(false)
      await studentAgent.post(`/api/courses/${course.id}/enrollment`)
      expect(bodyOf<Course[]>(await studentAgent.get("/api/courses"))[0]?.enrolled).toBe(true)
      expect((await studentAgent.get(`/api/courses/${course.id}`)).body).toMatchObject({ enrolled: true, lesson_count: 2 })
    })

    it("aluno vê só lições publicadas do curso; dono vê todas — nunca com gabarito", async () => {
      const teacher = await signUp(ctx.app, "teacher", ctx.db)
      const course = await newCourse(teacher.agent)
      await teacher.agent.patch(`/api/courses/${course.id}/publish`, { published: true })
      await createLesson(ctx.db, { courseId: course.id, createdBy: teacher.id, order: 2, title: "Segunda", testCases: secretCases })
      await createLesson(ctx.db, { courseId: course.id, createdBy: teacher.id, order: 1, title: "Primeira", testCases: secretCases })
      await createLesson(ctx.db, { courseId: course.id, createdBy: teacher.id, order: 3, published: false, testCases: secretCases })

      const anonymous = await agent(ctx.app).get(`/api/courses/${course.id}/lessons`)
      expect(bodyOf<Lesson[]>(anonymous).map((lesson) => lesson.title)).toEqual(["Primeira", "Segunda"])
      const owner = await teacher.agent.get(`/api/courses/${course.id}/lessons`)
      expect(owner.body).toHaveLength(3)
      for (const response of [anonymous, owner]) {
        expect(JSON.stringify(response.body)).not.toContain(SECRET)
        for (const lesson of response.body) expect(lesson).not.toHaveProperty("test_cases")
      }
    })

    it("reordena as lições numa transação e recusa ids de fora ou repetidos", async () => {
      const teacher = await signUp(ctx.app, "teacher", ctx.db)
      const course = await newCourse(teacher.agent)
      const firstLesson = await createLesson(ctx.db, { courseId: course.id, createdBy: teacher.id, order: 1 })
      const secondLesson = await createLesson(ctx.db, { courseId: course.id, createdBy: teacher.id, order: 2 })
      const thirdLesson = await createLesson(ctx.db, { courseId: course.id, createdBy: teacher.id, order: 3 })
      const outsideLesson = await createLesson(ctx.db, { createdBy: teacher.id })

      const response = await teacher.agent.put(`/api/courses/${course.id}/lessons/order`, { lesson_ids: [thirdLesson.id, firstLesson.id, secondLesson.id] })
      expect(response.status).toBe(204)
      const list = await teacher.agent.get(`/api/courses/${course.id}/lessons`)
      expect(bodyOf<Lesson[]>(list).map((lesson) => [lesson.id, lesson.order])).toEqual([[thirdLesson.id, 1], [firstLesson.id, 2], [secondLesson.id, 3]])

      const foreign = await teacher.agent.put(`/api/courses/${course.id}/lessons/order`, { lesson_ids: [firstLesson.id, outsideLesson.id] })
      expect(foreign.status).toBe(400)
      expect(bodyOf<ApiErrorBody>(foreign).code).toBe("LESSON_NOT_IN_COURSE")
      const duplicateResponse = await teacher.agent.put(`/api/courses/${course.id}/lessons/order`, { lesson_ids: [firstLesson.id, firstLesson.id] })
      expect(duplicateResponse.status).toBe(400)
      // Nada mudou depois das tentativas recusadas.
      const again = await teacher.agent.get(`/api/courses/${course.id}/lessons`)
      expect(bodyOf<Lesson[]>(again).map((lesson) => lesson.id)).toEqual([thirdLesson.id, firstLesson.id, secondLesson.id])

      const otherTeacher = await signUp(ctx.app, "teacher", ctx.db)
      await teacher.agent.patch(`/api/courses/${course.id}/publish`, { published: true })
      expect((await otherTeacher.agent.put(`/api/courses/${course.id}/lessons/order`, { lesson_ids: [firstLesson.id] })).status).toBe(403)
    })

    it("anexa lição própria ao fim do curso e desanexa", async () => {
      const teacher = await signUp(ctx.app, "teacher", ctx.db)
      const course = await newCourse(teacher.agent)
      await createLesson(ctx.db, { courseId: course.id, createdBy: teacher.id, order: 4 })
      const standaloneLesson = await createLesson(ctx.db, { createdBy: teacher.id })

      expect((await teacher.agent.post(`/api/courses/${course.id}/lessons`, { lesson_id: standaloneLesson.id })).status).toBe(204)
      let lessonView = bodyOf<Lesson>(await teacher.agent.get(`/api/lessons/${standaloneLesson.id}`))
      expect(lessonView).toMatchObject({ course_id: course.id, order: 5 })

      expect((await teacher.agent.delete(`/api/courses/${course.id}/lessons/${standaloneLesson.id}`)).status).toBe(204)
      lessonView = bodyOf<Lesson>(await teacher.agent.get(`/api/lessons/${standaloneLesson.id}`))
      expect(lessonView.course_id).toBeNull()
      expect((await teacher.agent.delete(`/api/courses/${course.id}/lessons/${standaloneLesson.id}`)).status).toBe(404)

      // Lição de outro professor não pode ser anexada.
      const otherTeacher = await signUp(ctx.app, "teacher", ctx.db)
      const foreignLesson = await createLesson(ctx.db, { createdBy: otherTeacher.id })
      expect((await teacher.agent.post(`/api/courses/${course.id}/lessons`, { lesson_id: foreignLesson.id })).status).toBe(403)
    })
  })

  describe("matrícula", () => {
    it("matricula e desmatricula em curso publicado; rascunho responde 404", async () => {
      const teacher = await signUp(ctx.app, "teacher", ctx.db)
      const course = await newCourse(teacher.agent)
      const { agent: studentAgent } = await signUp(ctx.app)

      expect((await studentAgent.post(`/api/courses/${course.id}/enrollment`)).status).toBe(404)
      await teacher.agent.patch(`/api/courses/${course.id}/publish`, { published: true })
      expect((await studentAgent.post(`/api/courses/${course.id}/enrollment`)).status).toBe(204)
      expect((await studentAgent.post(`/api/courses/${course.id}/enrollment`)).status).toBe(204) // idempotente
      expect((await studentAgent.get("/api/me/enrollments")).body).toEqual([course.id])

      expect((await studentAgent.delete(`/api/courses/${course.id}/enrollment`)).status).toBe(204)
      expect((await studentAgent.get("/api/me/enrollments")).body).toEqual([])
      expect((await agent(ctx.app).post(`/api/courses/${course.id}/enrollment`)).status).toBe(401)
    })
  })

  describe("lições", () => {
    it("GET /lessons/:id e listagens nunca trazem o gabarito; authoring só para o dono", async () => {
      const teacher = await signUp(ctx.app, "teacher", ctx.db)
      const lesson = await createLesson(ctx.db, { createdBy: teacher.id, testCases: secretCases })
      const { agent: studentAgent } = await signUp(ctx.app)

      for (const url of [`/api/lessons/${lesson.id}`, "/api/lessons", "/api/lessons/summaries"]) {
        const response = await studentAgent.get(url)
        expect(response.status).toBe(200)
        expect(JSON.stringify(response.body)).not.toContain(SECRET)
        expect(JSON.stringify(response.body)).not.toContain("test_cases")
      }
      // Nem o dono recebe gabarito pela rota do aluno.
      expect((await teacher.agent.get(`/api/lessons/${lesson.id}`)).body).not.toHaveProperty("test_cases")

      const auth = await teacher.agent.get(`/api/lessons/${lesson.id}/authoring`)
      expect(auth.status).toBe(200)
      expect(bodyOf<LessonWithTests>(auth).test_cases).toEqual(secretCases)

      const otherTeacher = await signUp(ctx.app, "teacher", ctx.db)
      expect((await otherTeacher.agent.get(`/api/lessons/${lesson.id}/authoring`)).status).toBe(403)
      expect((await studentAgent.get(`/api/lessons/${lesson.id}/authoring`)).status).toBe(403)
    })

    it("rascunho é invisível para quem não é dono ou admin", async () => {
      const teacher = await signUp(ctx.app, "teacher", ctx.db)
      const draft = await createLesson(ctx.db, { createdBy: teacher.id, published: false, testCases: cases })
      const { agent: studentAgent } = await signUp(ctx.app)
      expect((await studentAgent.get(`/api/lessons/${draft.id}`)).status).toBe(404)
      expect((await agent(ctx.app).get(`/api/lessons/${draft.id}`)).status).toBe(404)
      expect((await studentAgent.get("/api/lessons")).body).toEqual([])
      expect((await teacher.agent.get(`/api/lessons/${draft.id}`)).status).toBe(200)
      const otherTeacher = await signUp(ctx.app, "teacher", ctx.db)
      expect((await otherTeacher.agent.patch(`/api/lessons/${draft.id}`, { title: "Invadida" })).status).toBe(404)
    })

    it("cria rascunho com slug único e devolve LessonWithTests ao autor", async () => {
      const teacher = await signUp(ctx.app, "teacher", ctx.db)
      const body = { title: "Funções em Python", test_cases: cases }
      const firstCreated = await teacher.agent.post("/api/lessons", body)
      expect(firstCreated.status).toBe(201)
      expect(firstCreated.body).toMatchObject({ slug: "funcoes-em-python", published: false, created_by: teacher.id, test_cases: cases })
      const secondCreated = await teacher.agent.post("/api/lessons", body)
      expect(bodyOf<LessonWithTests>(secondCreated).slug).toBe("funcoes-em-python-2")

      const { agent: studentAgent } = await signUp(ctx.app)
      expect((await studentAgent.post("/api/lessons", body)).status).toBe(403)
      expect((await teacher.agent.post("/api/lessons", { title: "ok", lesson_type: "video" })).status).toBe(400)
    })

    it("não vincula lição a curso de outro professor", async () => {
      const courseOwner = await signUp(ctx.app, "teacher", ctx.db)
      const course = await newCourse(courseOwner.agent)
      await courseOwner.agent.patch(`/api/courses/${course.id}/publish`, { published: true })
      const otherTeacher = await signUp(ctx.app, "teacher", ctx.db)
      expect((await otherTeacher.agent.post("/api/lessons", { title: "Intrusa", course_id: course.id })).status).toBe(403)
    })

    it("PATCH altera só os campos enviados e mantém o gabarito", async () => {
      const teacher = await signUp(ctx.app, "teacher", ctx.db)
      const created = bodyOf<LessonWithTests>(await teacher.agent.post("/api/lessons", { title: "Laços", xp_reward: 80, test_cases: cases }))
      const response = await teacher.agent.patch(`/api/lessons/${created.id}`, { description: "nova descrição" })
      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({ title: "Laços", xp_reward: 80, description: "nova descrição", test_cases: cases })
    })

    it("publicar lição de código exige casos de teste (422 NO_TESTS)", async () => {
      const teacher = await signUp(ctx.app, "teacher", ctx.db)
      const untestedLesson = bodyOf<LessonWithTests>(await teacher.agent.post("/api/lessons", { title: "Sem gabarito" }))
      const response = await teacher.agent.patch(`/api/lessons/${untestedLesson.id}/publish`, { published: true })
      expect(response.status).toBe(422)
      expect(bodyOf<ApiErrorBody>(response).code).toBe("NO_TESTS")

      const testedLesson = bodyOf<LessonWithTests>(await teacher.agent.post("/api/lessons", { title: "Com gabarito", test_cases: cases }))
      const publishResponse = await teacher.agent.patch(`/api/lessons/${testedLesson.id}/publish`, { published: true })
      expect(publishResponse.status).toBe(200)
      expect(bodyOf<Lesson>(publishResponse).published).toBe(true)
      expect(publishResponse.body).not.toHaveProperty("test_cases")

      // Lição publicada não pode perder o gabarito.
      const wipe = await teacher.agent.patch(`/api/lessons/${testedLesson.id}`, { test_cases: [] })
      expect(wipe.status).toBe(422)

      const theoryLesson = bodyOf<LessonWithTests>(await teacher.agent.post("/api/lessons", { title: "Teoria", lesson_type: "theory" }))
      expect((await teacher.agent.patch(`/api/lessons/${theoryLesson.id}/publish`, { published: true })).status).toBe(200)
    })

    it("publicar quiz exige ao menos uma questão (422 NO_QUESTIONS)", async () => {
      const teacher = await signUp(ctx.app, "teacher", ctx.db)
      const quiz = bodyOf<LessonWithTests>(await teacher.agent.post("/api/lessons", { title: "Quiz de listas", lesson_type: "quiz" }))
      const response = await teacher.agent.patch(`/api/lessons/${quiz.id}/publish`, { published: true })
      expect(response.status).toBe(422)
      expect(bodyOf<ApiErrorBody>(response).code).toBe("NO_QUESTIONS")
    })

    it("dono exclui sua lição; outro professor não", async () => {
      const teacher = await signUp(ctx.app, "teacher", ctx.db)
      const lesson = await createLesson(ctx.db, { createdBy: teacher.id, testCases: cases })
      const otherTeacher = await signUp(ctx.app, "teacher", ctx.db)
      expect((await otherTeacher.agent.delete(`/api/lessons/${lesson.id}`)).status).toBe(403)
      expect((await teacher.agent.delete(`/api/lessons/${lesson.id}`)).status).toBe(204)
      expect((await teacher.agent.get(`/api/lessons/${lesson.id}`)).status).toBe(404)
    })

    it("/teacher/lessons e /teacher/metrics mostram só as lições do professor", async () => {
      const teacher = await signUp(ctx.app, "teacher", ctx.db)
      const otherTeacher = await signUp(ctx.app, "teacher", ctx.db)
      const mine = await createLesson(ctx.db, { createdBy: teacher.id, testCases: secretCases })
      const empty = await createLesson(ctx.db, { createdBy: teacher.id, published: false })
      await createLesson(ctx.db, { createdBy: otherTeacher.id })

      const firstStudent = await signUp(ctx.app)
      const secondStudent = await signUp(ctx.app)
      await ctx.db.insert(lessonProgress).values([
        { userId: firstStudent.id, lessonId: mine.id, status: "completed" },
        { userId: secondStudent.id, lessonId: mine.id, status: "in_progress" },
      ])
      const files = [{ path: "main.py", content: "" }]
      await ctx.db.insert(submissions).values([
        { userId: firstStudent.id, lessonId: mine.id, files, status: "graded", passed: true },
        { userId: secondStudent.id, lessonId: mine.id, files, status: "graded", passed: false },
        { userId: secondStudent.id, lessonId: mine.id, files, status: "graded", passed: false },
        { userId: secondStudent.id, lessonId: mine.id, files, status: "graded", passed: false },
      ])

      const lessons = await teacher.agent.get("/api/teacher/lessons")
      expect(bodyOf<Lesson[]>(lessons).map((lesson) => lesson.id).sort()).toEqual([mine.id, empty.id].sort())
      expect(JSON.stringify(lessons.body)).not.toContain(SECRET)

      const metrics = await teacher.agent.get("/api/teacher/metrics")
      expect(metrics.status).toBe(200)
      const byId = Object.fromEntries(bodyOf<LessonMetrics[]>(metrics).map((entry) => [entry.lesson_id, entry]))
      expect(Object.keys(byId)).toHaveLength(2)
      expect(byId[mine.id]).toEqual({ lesson_id: mine.id, started: 2, completed: 1, submissions: 4, pass_rate: 0.25 })
      expect(byId[empty.id]).toEqual({ lesson_id: empty.id, started: 0, completed: 0, submissions: 0, pass_rate: null })

      const { agent: studentAgent } = await signUp(ctx.app)
      expect((await studentAgent.get("/api/teacher/metrics")).status).toBe(403)
    })
  })

  describe("módulos", () => {
    it("admin faz CRUD; professor não; contagem só de lições publicadas", async () => {
      const admin = await signUp(ctx.app, "admin", ctx.db)
      const teacher = await signUp(ctx.app, "teacher", ctx.db)
      expect((await teacher.agent.post("/api/modules", { title: "Básico" })).status).toBe(403)

      const created = await admin.agent.post("/api/modules", { title: "Básico", sort_order: 2 })
      expect(created.status).toBe(201)
      const second = bodyOf<Module>(await admin.agent.post("/api/modules", { title: "Avançado", sort_order: 1 }))
      const createdModule = bodyOf<Module>(created)

      const patched = await admin.agent.patch(`/api/modules/${createdModule.id}`, { description: "fundamentos" })
      expect(patched.body).toMatchObject({ title: "Básico", description: "fundamentos", sort_order: 2 })

      const list = await agent(ctx.app).get("/api/modules")
      expect(bodyOf<Module[]>(list).map((entry) => entry.title)).toEqual(["Avançado", "Básico"])

      await createLesson(ctx.db, { moduleId: createdModule.id })
      await createLesson(ctx.db, { moduleId: createdModule.id })
      await createLesson(ctx.db, { moduleId: createdModule.id, published: false })
      const counts = await agent(ctx.app).get("/api/modules/lesson-counts")
      expect(counts.body).toEqual({ [createdModule.id]: 2 })

      expect((await admin.agent.delete(`/api/modules/${second.id}`)).status).toBe(204)
      expect((await admin.agent.delete(`/api/modules/${second.id}`)).status).toBe(404)
      const audit = await queryRows<{ action: string }>(ctx.db, sql`select action from audit_log order by created_at`)
      expect(audit.map((entry) => entry.action)).toContain("module.delete")
    })
  })
})
