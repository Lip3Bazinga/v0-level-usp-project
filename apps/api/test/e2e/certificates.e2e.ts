import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { eq, sql } from "drizzle-orm"
import { certificates, notifications } from "@levelusp/db"
import { agent, countRows, createLesson, createTestApp, signUp, type TestContext } from "./harness"
import { answersFor, completeLessons, drawnQuestionIds, missQuestions, seedCourseWithExam, type ExamFixture } from "./exam-fixtures"

const PUBLIC_BASE_URL = "https://levelusp.teste.example"

describe("Certificados (e2e)", () => {
  let ctx: TestContext
  beforeAll(async () => {
    ctx = await createTestApp({ PUBLIC_BASE_URL })
  })
  afterAll(() => ctx.close())
  beforeEach(() => ctx.reset())

  /** Aluno que concluiu as lições e foi aprovado na prova pelo fluxo real. */
  async function approvedStudent(fixture: ExamFixture) {
    const student = await signUp(ctx.app)
    await completeLessons(ctx, student.id, fixture.lessonIds)
    const start = await student.agent.post(`/api/courses/${fixture.courseId}/exam/attempts`)
    expect(start.status).toBe(200)
    const ids = drawnQuestionIds(start.body)
    // Erra 1 de 4: nota 75.
    const answers = missQuestions(answersFor(ids, fixture.answerKey, true), fixture.answerKey, ids.slice(0, 1))
    const submit = await student.agent.post(`/api/courses/${fixture.courseId}/exam/submit`, { attemptId: start.body.attemptId, answers })
    expect(submit.body).toMatchObject({ passed: true, score: 75 })
    return student
  }

  it("fluxo completo: emite, lista, verifica publicamente e gera o PDF", async () => {
    const fixture = await seedCourseWithExam(ctx, { title: "Python do Zero" })
    const student = await approvedStudent(fixture)

    expect((await student.agent.get(`/api/courses/${fixture.courseId}/certificate`)).body).toBeNull()

    const issued = await student.agent.post(`/api/courses/${fixture.courseId}/certificate`)
    expect(issued.status).toBe(200)
    expect(issued.body).toMatchObject({ issued: true, alreadyIssued: false, examScore: 75 })
    const code = issued.body.verificationCode as string
    expect(code).toMatch(/^LVL-[A-Z2-9]{4}-[A-Z2-9]{4}$/)
    expect(new Date(issued.body.issuedAt).toISOString()).toBe(issued.body.issuedAt)

    // Idempotente.
    const again = await student.agent.post(`/api/courses/${fixture.courseId}/certificate`)
    expect(again.body).toMatchObject({ issued: true, alreadyIssued: true, verificationCode: code, examScore: 75 })
    expect(await countRows(ctx.db, sql`select count(*)::int as n from certificates`)).toBe(1)

    const mine = await student.agent.get(`/api/courses/${fixture.courseId}/certificate`)
    expect(mine.body).toEqual({ verification_code: code, issued_at: issued.body.issuedAt, exam_score: 75, course_id: fixture.courseId, course_title: "Python do Zero" })
    expect((await student.agent.get("/api/me/certificates")).body).toEqual([mine.body])

    // Verificação pública, sem login e sem e-mail.
    const anonymous = agent(ctx.app)
    const verify = await anonymous.get(`/api/certificates/${code.toLowerCase()}`)
    expect(verify.status).toBe(200)
    expect(verify.body).toEqual({
      valid: true,
      verification_code: code,
      student_name: expect.stringMatching(/^Usuário/),
      course_title: "Python do Zero",
      issued_at: issued.body.issuedAt,
      exam_score: 75,
    })
    expect(JSON.stringify(verify.body)).not.toContain(student.email)

    const pdf = await anonymous.get(`/api/certificates/${code}/pdf`).buffer(true).parse((stream, done) => {
      const chunks: Buffer[] = []
      stream.on("data", (chunk: Buffer) => chunks.push(chunk))
      stream.on("end", () => done(null, Buffer.concat(chunks)))
    })
    expect(pdf.status).toBe(200)
    expect(pdf.headers["content-type"]).toBe("application/pdf")
    expect(pdf.headers["content-disposition"]).toContain(`certificado-levelusp-${code}.pdf`)
    const body: Buffer = pdf.body
    expect(body.subarray(0, 4).toString()).toBe("%PDF")
    expect(body.length).toBeGreaterThan(1000)
    // Link de verificação (anotação clicável) aponta para a origem pública configurada (UX-02).
    expect(body.toString("latin1")).toContain(`/URI (${PUBLIC_BASE_URL}/certificado/${code})`)
    expect(body.toString("latin1")).not.toContain("localhost")

    // Auditoria e notificação da emissão.
    const audit = await ctx.db.execute(sql`select action, target from audit_log`)
    expect(audit.rows).toEqual([{ action: "certificate.issued", target: fixture.courseId }])
    const notes = await ctx.db.select().from(notifications).where(eq(notifications.userId, student.id))
    expect(notes.some((x) => x.href === `/certificado/${code}`)).toBe(true)
  })

  it("código inexistente → valid:false com 200; PDF → 404", async () => {
    const anonymous = agent(ctx.app)
    const response = await anonymous.get("/api/certificates/LVL-ZZZZ-ZZZZ")
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ valid: false, verification_code: "LVL-ZZZZ-ZZZZ", student_name: null, course_title: null, issued_at: null, exam_score: null })
    expect((await anonymous.get("/api/certificates/codigo%20estranho%27")).body.valid).toBe(false)
    expect((await anonymous.get("/api/certificates/LVL-ZZZZ-ZZZZ/pdf")).status).toBe(404)
  })

  it("verifica códigos legados importados", async () => {
    const fixture = await seedCourseWithExam(ctx)
    const { id } = await signUp(ctx.app)
    await ctx.db.insert(certificates).values({ userId: id, courseId: fixture.courseId, verificationCode: "LU-ABCDE-12345", examScore: 90 })
    const response = await agent(ctx.app).get("/api/certificates/lu-abcde-12345")
    expect(response.body).toMatchObject({ valid: true, verification_code: "LU-ABCDE-12345", exam_score: 90 })
  })

  it("sem aprovação na prova não emite", async () => {
    const fixture = await seedCourseWithExam(ctx)
    const student = await signUp(ctx.app)
    await completeLessons(ctx, student.id, fixture.lessonIds)
    const response = await student.agent.post(`/api/courses/${fixture.courseId}/certificate`)
    expect(response.status).toBe(403)
    expect(response.body.code).toBe("EXAM_NOT_PASSED")
    expect((await student.agent.get("/api/me/certificates")).body).toEqual([])
  })

  it("com projeto final pendente não emite (mesmo aprovado na prova)", async () => {
    const fixture = await seedCourseWithExam(ctx)
    const student = await approvedStudent(fixture)
    // Projeto final no módulo de certificação: não bloqueia a prova, mas bloqueia o certificado.
    await createLesson(ctx.db, { title: "Projeto final", courseId: fixture.courseId, module: "Certificação", lessonType: "coding" })
    const response = await student.agent.post(`/api/courses/${fixture.courseId}/certificate`)
    expect(response.status).toBe(403)
    expect(response.body.code).toBe("NOT_ELIGIBLE")
    const status = await student.agent.get(`/api/courses/${fixture.courseId}/exam`)
    expect(status.body).toMatchObject({ eligible: true, lessonsRemaining: 0, lessonsTotal: 2 })
  })

  it("rotas do aluno exigem login", async () => {
    const fixture = await seedCourseWithExam(ctx)
    const anonymous = agent(ctx.app)
    expect((await anonymous.get("/api/me/certificates")).status).toBe(401)
    expect((await anonymous.get(`/api/courses/${fixture.courseId}/certificate`)).status).toBe(401)
    expect((await anonymous.post(`/api/courses/${fixture.courseId}/certificate`)).status).toBe(401)
  })
})
