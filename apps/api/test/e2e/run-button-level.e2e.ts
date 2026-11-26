import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { sql } from "drizzle-orm"
import type { ApiErrorBody, Course, Lesson } from "@levelusp/contracts"
import { agent, bodyOf, createLesson, createTestApp, queryRows, signUp, type Agent, type TestContext } from "./harness"

interface RunLevelAudit {
  action: string
  target: string
  meta: { from: number | null; to: number | null }
}

const AUDIT_ACTION = "course.run_button_min_level"

async function newCourse(author: Agent, body: Record<string, unknown> = {}): Promise<Course> {
  const response = await author.post("/api/courses", { title: "Python do zero", description: "curso", ...body })
  expect(response.status).toBe(201)
  return bodyOf<Course>(response)
}

describe("Executar por nível — limite do curso (e2e)", () => {
  let ctx: TestContext
  beforeAll(async () => {
    ctx = await createTestApp()
  })
  afterAll(() => ctx.close())
  beforeEach(() => ctx.reset())

  const runLevelAudits = (): Promise<RunLevelAudit[]> =>
    queryRows<RunLevelAudit>(ctx.db, sql`select action, target, meta from audit_log where action = ${AUDIT_ACTION} order by created_at`)

  it("professor não cria curso já com o limite (403), mas cria sem ele ou com null", async () => {
    const teacher = await signUp(ctx.app, "teacher", ctx.db)
    const refused = await teacher.agent.post("/api/courses", { title: "Curso com limite", run_button_min_level: 3 })
    expect(refused.status).toBe(403)
    expect(bodyOf<ApiErrorBody>(refused).message).toContain("admin")

    expect((await newCourse(teacher.agent)).run_button_min_level).toBeNull()
    expect((await newCourse(teacher.agent, { run_button_min_level: null })).run_button_min_level).toBeNull()
    expect(await runLevelAudits()).toEqual([])
  })

  it("professor dono não muda o limite (403), mas reenviar o valor atual passa", async () => {
    const teacher = await signUp(ctx.app, "teacher", ctx.db)
    const admin = await signUp(ctx.app, "admin", ctx.db)
    const course = await newCourse(teacher.agent)

    expect((await teacher.agent.patch(`/api/courses/${course.id}`, { run_button_min_level: 2 })).status).toBe(403)
    const sameNull = await teacher.agent.patch(`/api/courses/${course.id}`, { title: "Renomeado", run_button_min_level: null })
    expect(sameNull.status).toBe(200)
    expect(bodyOf<Course>(sameNull)).toMatchObject({ title: "Renomeado", run_button_min_level: null })

    expect((await admin.agent.patch(`/api/courses/${course.id}`, { run_button_min_level: 4 })).status).toBe(200)
    expect((await teacher.agent.patch(`/api/courses/${course.id}`, { run_button_min_level: null })).status).toBe(403)
    expect((await teacher.agent.patch(`/api/courses/${course.id}`, { run_button_min_level: 5 })).status).toBe(403)
    const sameValue = await teacher.agent.patch(`/api/courses/${course.id}`, { description: "nova", run_button_min_level: 4 })
    expect(sameValue.status).toBe(200)
    expect(bodyOf<Course>(sameValue)).toMatchObject({ description: "nova", run_button_min_level: 4 })

    // Só a mudança do admin foi auditada: as tentativas recusadas e o reenvio não geram registro.
    expect((await runLevelAudits()).map((entry) => ({ target: entry.target, from: entry.meta.from, to: entry.meta.to }))).toEqual([
      { target: `course:${course.id}`, from: null, to: 4 },
    ])
  })

  it("admin altera o limite, que chega em GET /lessons/:id, e a mudança é auditada", async () => {
    const teacher = await signUp(ctx.app, "teacher", ctx.db)
    const admin = await signUp(ctx.app, "admin", ctx.db)
    const course = await newCourse(teacher.agent)
    const lesson = await createLesson(ctx.db, { courseId: course.id, createdBy: teacher.id, published: true })
    const loose = await createLesson(ctx.db, { createdBy: teacher.id, published: true })
    const anonymous = agent(ctx.app)

    expect(bodyOf<Lesson>(await anonymous.get(`/api/lessons/${lesson.id}`)).run_button_min_level).toBeNull()

    const raised = await admin.agent.patch(`/api/courses/${course.id}`, { run_button_min_level: 4 })
    expect(raised.status).toBe(200)
    expect(bodyOf<Course>(raised).run_button_min_level).toBe(4)
    expect(bodyOf<Lesson>(await anonymous.get(`/api/lessons/${lesson.id}`)).run_button_min_level).toBe(4)
    // Lição avulsa não tem curso: segue no padrão (null).
    expect(bodyOf<Lesson>(await anonymous.get(`/api/lessons/${loose.id}`)).run_button_min_level).toBeNull()

    // Reenviar o mesmo valor não audita de novo; voltar ao padrão audita.
    expect((await admin.agent.patch(`/api/courses/${course.id}`, { run_button_min_level: 4 })).status).toBe(200)
    expect((await admin.agent.patch(`/api/courses/${course.id}`, { run_button_min_level: null })).status).toBe(200)
    expect(bodyOf<Lesson>(await anonymous.get(`/api/lessons/${lesson.id}`)).run_button_min_level).toBeNull()

    expect((await runLevelAudits()).map((entry) => ({ target: entry.target, from: entry.meta.from, to: entry.meta.to }))).toEqual([
      { target: `course:${course.id}`, from: null, to: 4 },
      { target: `course:${course.id}`, from: 4, to: null },
    ])
  })

  it("admin que cria o curso já com o limite também gera o registro de auditoria", async () => {
    const admin = await signUp(ctx.app, "admin", ctx.db)
    const course = await newCourse(admin.agent, { run_button_min_level: 1 })
    expect(course.run_button_min_level).toBe(1)
    expect((await runLevelAudits()).map((entry) => ({ target: entry.target, from: entry.meta.from, to: entry.meta.to }))).toEqual([
      { target: `course:${course.id}`, from: null, to: 1 },
    ])

    await newCourse(admin.agent)
    expect(await runLevelAudits()).toHaveLength(1)
  })

  it("valor fora de 1 a 100 é recusado na validação (400)", async () => {
    const admin = await signUp(ctx.app, "admin", ctx.db)
    const course = await newCourse(admin.agent)
    for (const value of [0, 101, 2.5]) {
      expect((await admin.agent.patch(`/api/courses/${course.id}`, { run_button_min_level: value })).status).toBe(400)
    }
  })
})
