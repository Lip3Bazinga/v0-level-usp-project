import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { eq, sql } from "drizzle-orm"
import { certificates, notifications } from "@levelusp/db"
import { agent, createLesson, createTestApp, signUp, type TestContext } from "./harness"
import { answersFor, completeLessons, seedCourseWithExam, type ExamFixture } from "./exam-fixtures"

const APP_ORIGIN = "https://levelusp.teste.example"

describe("Certificados (e2e)", () => {
  let ctx: TestContext
  beforeAll(async () => {
    ctx = await createTestApp({ APP_ORIGIN })
  })
  afterAll(() => ctx.close())
  beforeEach(() => ctx.reset())

  /** Aluno que concluiu as lições e foi aprovado na prova pelo fluxo real. */
  async function approvedStudent(fx: ExamFixture) {
    const student = await signUp(ctx.app)
    await completeLessons(ctx, student.id, fx.lessonIds)
    const start = await student.agent.post(`/api/courses/${fx.courseId}/exam/attempts`)
    expect(start.status).toBe(200)
    const ids = start.body.questions.map((q: { id: string }) => q.id) as string[]
    const answers = answersFor(ids, fx.answerKey, true)
    answers[ids[0]!] = (fx.answerKey.get(ids[0]!)! + 1) % 4 // 3 de 4 = 75
    const submit = await student.agent.post(`/api/courses/${fx.courseId}/exam/submit`, { attemptId: start.body.attemptId, answers })
    expect(submit.body).toMatchObject({ passed: true, score: 75 })
    return student
  }

  it("fluxo completo: emite, lista, verifica publicamente e gera o PDF", async () => {
    const fx = await seedCourseWithExam(ctx, { title: "Python do Zero" })
    const student = await approvedStudent(fx)

    expect((await student.agent.get(`/api/courses/${fx.courseId}/certificate`)).body).toBeNull()

    const issued = await student.agent.post(`/api/courses/${fx.courseId}/certificate`)
    expect(issued.status).toBe(200)
    expect(issued.body).toMatchObject({ issued: true, alreadyIssued: false, examScore: 75 })
    const code = issued.body.verificationCode as string
    expect(code).toMatch(/^LVL-[A-Z2-9]{4}-[A-Z2-9]{4}$/)
    expect(new Date(issued.body.issuedAt).toISOString()).toBe(issued.body.issuedAt)

    // Idempotente.
    const again = await student.agent.post(`/api/courses/${fx.courseId}/certificate`)
    expect(again.body).toMatchObject({ issued: true, alreadyIssued: true, verificationCode: code, examScore: 75 })
    const n = ((await ctx.db.execute(sql`select count(*)::int as n from certificates`)).rows[0] as { n: number }).n
    expect(n).toBe(1)

    const mine = await student.agent.get(`/api/courses/${fx.courseId}/certificate`)
    expect(mine.body).toEqual({ verification_code: code, issued_at: issued.body.issuedAt, exam_score: 75, course_id: fx.courseId, course_title: "Python do Zero" })
    expect((await student.agent.get("/api/me/certificates")).body).toEqual([mine.body])

    // Verificação pública, sem login e sem e-mail.
    const anon = agent(ctx.app)
    const verify = await anon.get(`/api/certificates/${code.toLowerCase()}`)
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

    const pdf = await anon.get(`/api/certificates/${code}/pdf`).buffer(true).parse((res, cb) => {
      const chunks: Buffer[] = []
      res.on("data", (c: Buffer) => chunks.push(c))
      res.on("end", () => cb(null, Buffer.concat(chunks)))
    })
    expect(pdf.status).toBe(200)
    expect(pdf.headers["content-type"]).toBe("application/pdf")
    expect(pdf.headers["content-disposition"]).toContain(`certificado-levelusp-${code}.pdf`)
    const body = pdf.body as Buffer
    expect(body.subarray(0, 4).toString()).toBe("%PDF")
    expect(body.length).toBeGreaterThan(1000)

    // Auditoria e notificação da emissão.
    const audit = await ctx.db.execute(sql`select action, target from audit_log`)
    expect(audit.rows).toEqual([{ action: "certificate.issued", target: fx.courseId }])
    const notes = await ctx.db.select().from(notifications).where(eq(notifications.userId, student.id))
    expect(notes.some((x) => x.href === `/certificado/${code}`)).toBe(true)
  })

  it("código inexistente → valid:false com 200; PDF → 404", async () => {
    const anon = agent(ctx.app)
    const res = await anon.get("/api/certificates/LVL-ZZZZ-ZZZZ")
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ valid: false, verification_code: "LVL-ZZZZ-ZZZZ", student_name: null, course_title: null, issued_at: null, exam_score: null })
    expect((await anon.get("/api/certificates/codigo%20estranho%27")).body.valid).toBe(false)
    expect((await anon.get("/api/certificates/LVL-ZZZZ-ZZZZ/pdf")).status).toBe(404)
  })

  it("verifica códigos legados importados", async () => {
    const fx = await seedCourseWithExam(ctx)
    const { id } = await signUp(ctx.app)
    await ctx.db.insert(certificates).values({ userId: id, courseId: fx.courseId, verificationCode: "LU-ABCDE-12345", examScore: 90 })
    const res = await agent(ctx.app).get("/api/certificates/lu-abcde-12345")
    expect(res.body).toMatchObject({ valid: true, verification_code: "LU-ABCDE-12345", exam_score: 90 })
  })

  it("sem aprovação na prova não emite", async () => {
    const fx = await seedCourseWithExam(ctx)
    const student = await signUp(ctx.app)
    await completeLessons(ctx, student.id, fx.lessonIds)
    const res = await student.agent.post(`/api/courses/${fx.courseId}/certificate`)
    expect(res.status).toBe(403)
    expect(res.body.code).toBe("EXAM_NOT_PASSED")
    expect((await student.agent.get("/api/me/certificates")).body).toEqual([])
  })

  it("com projeto final pendente não emite (mesmo aprovado na prova)", async () => {
    const fx = await seedCourseWithExam(ctx)
    const student = await approvedStudent(fx)
    // Projeto final no módulo de certificação: não bloqueia a prova, mas bloqueia o certificado.
    await createLesson(ctx.db, { title: "Projeto final", courseId: fx.courseId, module: "Certificação", lessonType: "coding" })
    const res = await student.agent.post(`/api/courses/${fx.courseId}/certificate`)
    expect(res.status).toBe(403)
    expect(res.body.code).toBe("NOT_ELIGIBLE")
    const status = await student.agent.get(`/api/courses/${fx.courseId}/exam`)
    expect(status.body).toMatchObject({ eligible: true, lessonsRemaining: 0, lessonsTotal: 2 })
  })

  it("rotas do aluno exigem login", async () => {
    const fx = await seedCourseWithExam(ctx)
    const anon = agent(ctx.app)
    expect((await anon.get("/api/me/certificates")).status).toBe(401)
    expect((await anon.get(`/api/courses/${fx.courseId}/certificate`)).status).toBe(401)
    expect((await anon.post(`/api/courses/${fx.courseId}/certificate`)).status).toBe(401)
  })
})
