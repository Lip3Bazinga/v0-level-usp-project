import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { eq, sql } from "drizzle-orm"
import { examAttempts, notifications } from "@levelusp/db"
import { agent, createTestApp, signUp, type TestContext } from "./harness"
import { answersFor, completeLessons, seedCourseWithExam } from "./exam-fixtures"

describe("Prova final (e2e)", () => {
  let ctx: TestContext
  beforeAll(async () => {
    ctx = await createTestApp()
  })
  afterAll(() => ctx.close())
  beforeEach(() => ctx.reset())

  async function eligibleStudent(opts: Parameters<typeof seedCourseWithExam>[1] = {}) {
    const fx = await seedCourseWithExam(ctx, opts)
    const student = await signUp(ctx.app)
    await completeLessons(ctx, student.id, fx.lessonIds)
    return { fx, student }
  }

  it("exige login", async () => {
    const fx = await seedCourseWithExam(ctx)
    expect((await agent(ctx.app).get(`/api/courses/${fx.courseId}/exam`)).status).toBe(401)
  })

  it("aluno sem lições concluídas não é elegível e não pode iniciar", async () => {
    const fx = await seedCourseWithExam(ctx)
    const { agent: a, id } = await signUp(ctx.app)
    await completeLessons(ctx, id, fx.lessonIds.slice(0, 1))

    const status = await a.get(`/api/courses/${fx.courseId}/exam`)
    expect(status.status).toBe(200)
    expect(status.body).toMatchObject({
      eligible: false,
      lessonsRemaining: 1,
      lessonsTotal: 2,
      attemptsCount: 0,
      passed: false,
      inProgressAttemptId: null,
      exam: { title: "Prova final", passingScore: 70, timeLimitMinutes: 45, cooldownMinutes: 60, questionCount: 4 },
    })

    const start = await a.post(`/api/courses/${fx.courseId}/exam/attempts`)
    expect(start.status).toBe(403)
    expect(start.body.code).toBe("NOT_ELIGIBLE")
  })

  it("curso sem prova responde 404", async () => {
    const { agent: a } = await signUp(ctx.app)
    expect((await a.get(`/api/courses/00000000-0000-4000-8000-000000000000/exam`)).status).toBe(404)
  })

  it("questões do aluno nunca trazem gabarito nem explicação", async () => {
    const { fx, student } = await eligibleStudent()
    const res = await student.agent.post(`/api/courses/${fx.courseId}/exam/attempts`)
    expect(res.status).toBe(200)
    expect(res.body.questions).toHaveLength(4)
    for (const q of res.body.questions) expect(Object.keys(q).sort()).toEqual(["id", "options", "prompt"])
    const raw = JSON.stringify(res.body)
    expect(raw).not.toMatch(/correct|explanation|Explicação/i)
    const status = JSON.stringify((await student.agent.get(`/api/courses/${fx.courseId}/exam`)).body)
    expect(status).not.toMatch(/correct_index|Questão/)
  })

  it("fluxo completo: inicia, envia, aprova e notifica", async () => {
    const { fx, student } = await eligibleStudent()
    const start = await student.agent.post(`/api/courses/${fx.courseId}/exam/attempts`)
    expect(start.body).toMatchObject({ resumed: false, timeLimitMinutes: 45 })
    const ids = start.body.questions.map((q: { id: string }) => q.id) as string[]
    expect(new Date(start.body.expiresAt).getTime()).toBeGreaterThan(Date.now() + 44 * 60_000)

    const statusDuring = await student.agent.get(`/api/courses/${fx.courseId}/exam`)
    expect(statusDuring.body).toMatchObject({ eligible: true, inProgressAttemptId: start.body.attemptId, inProgressExpiresAt: start.body.expiresAt })

    const res = await student.agent.post(`/api/courses/${fx.courseId}/exam/submit`, { attemptId: start.body.attemptId, answers: answersFor(ids, fx.answerKey, true) })
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ score: 100, passed: true, passingScore: 70, correctCount: 4, total: 4 })
    expect(res.body.review).toHaveLength(4)
    expect(res.body.review[0]).toEqual({ questionId: ids[0], correct: true, explanation: expect.stringContaining("Explicação") })

    const status = await student.agent.get(`/api/courses/${fx.courseId}/exam`)
    expect(status.body).toMatchObject({ passed: true, passedScore: 100, bestScore: 100, attemptsCount: 1, cooldownUntil: null, inProgressAttemptId: null })

    const notes = await ctx.db.select().from(notifications).where(eq(notifications.userId, student.id))
    expect(notes.some((n) => n.title.startsWith("Prova aprovada"))).toBe(true)

    // Aprovado não refaz a prova.
    const again = await student.agent.post(`/api/courses/${fx.courseId}/exam/attempts`)
    expect(again.status).toBe(409)
  })

  it("corrige só as questões sorteadas e grava respostas saneadas", async () => {
    const { fx, student } = await eligibleStudent({ questions: 6, questionsPerAttempt: 3 })
    const status = await student.agent.get(`/api/courses/${fx.courseId}/exam`)
    expect(status.body.exam.questionCount).toBe(3)
    const start = await student.agent.post(`/api/courses/${fx.courseId}/exam/attempts`)
    const ids = start.body.questions.map((q: { id: string }) => q.id) as string[]
    expect(ids).toHaveLength(3)
    const others = [...fx.answerKey.keys()].filter((id) => !ids.includes(id))
    // Responde certo as questões que NÃO foram sorteadas: não contam.
    const answers = { ...answersFor(ids, fx.answerKey, false), ...answersFor(others, fx.answerKey, true) }
    const res = await student.agent.post(`/api/courses/${fx.courseId}/exam/submit`, { attemptId: start.body.attemptId, answers })
    expect(res.body).toMatchObject({ score: 0, passed: false, correctCount: 0, total: 3 })
    const [row] = await ctx.db.select().from(examAttempts).where(eq(examAttempts.id, start.body.attemptId))
    expect(Object.keys(row!.answers).sort()).toEqual([...ids].sort())
  })

  it("reprovação gera cooldown", async () => {
    const { fx, student } = await eligibleStudent()
    const start = await student.agent.post(`/api/courses/${fx.courseId}/exam/attempts`)
    const ids = start.body.questions.map((q: { id: string }) => q.id) as string[]
    const answers = answersFor(ids, fx.answerKey, true)
    answers[ids[0]!] = (fx.answerKey.get(ids[0]!)! + 1) % 4
    answers[ids[1]!] = (fx.answerKey.get(ids[1]!)! + 1) % 4
    const res = await student.agent.post(`/api/courses/${fx.courseId}/exam/submit`, { attemptId: start.body.attemptId, answers })
    expect(res.body).toMatchObject({ score: 50, passed: false, correctCount: 2 })

    const status = await student.agent.get(`/api/courses/${fx.courseId}/exam`)
    expect(status.body).toMatchObject({ passed: false, bestScore: 50, attemptsCount: 1 })
    const until = new Date(status.body.cooldownUntil).getTime()
    expect(until).toBeGreaterThan(Date.now() + 59 * 60_000)

    const retry = await student.agent.post(`/api/courses/${fx.courseId}/exam/attempts`)
    expect(retry.status).toBe(429)
    expect(retry.body.code).toBe("COOLDOWN")
    expect(retry.body.message).toContain(status.body.cooldownUntil)

    // Passado o intervalo, libera nova tentativa.
    await ctx.db.execute(sql`update exam_attempts set submitted_at = submitted_at - interval '61 minutes' where id = ${start.body.attemptId}`)
    const later = await student.agent.post(`/api/courses/${fx.courseId}/exam/attempts`)
    expect(later.status).toBe(200)
    expect(later.body.resumed).toBe(false)
  })

  it("retoma a tentativa em andamento com as mesmas questões", async () => {
    const { fx, student } = await eligibleStudent()
    const first = await student.agent.post(`/api/courses/${fx.courseId}/exam/attempts`)
    const second = await student.agent.post(`/api/courses/${fx.courseId}/exam/attempts`)
    expect(second.status).toBe(200)
    expect(second.body).toMatchObject({ attemptId: first.body.attemptId, resumed: true, expiresAt: first.body.expiresAt })
    expect(second.body.questions).toEqual(first.body.questions)
    const n = ((await ctx.db.execute(sql`select count(*)::int as n from exam_attempts`)).rows[0] as { n: number }).n
    expect(n).toBe(1)
  })

  it("tentativa de outro usuário responde 404", async () => {
    const { fx, student } = await eligibleStudent()
    const start = await student.agent.post(`/api/courses/${fx.courseId}/exam/attempts`)
    const intruder = await signUp(ctx.app)
    await completeLessons(ctx, intruder.id, fx.lessonIds)
    const res = await intruder.agent.post(`/api/courses/${fx.courseId}/exam/submit`, { attemptId: start.body.attemptId, answers: {} })
    expect(res.status).toBe(404)
    const [row] = await ctx.db.select().from(examAttempts).where(eq(examAttempts.id, start.body.attemptId))
    expect(row!.submittedAt).toBeNull()
  })

  it("submissão dupla responde 409 e não altera a nota", async () => {
    const { fx, student } = await eligibleStudent()
    const start = await student.agent.post(`/api/courses/${fx.courseId}/exam/attempts`)
    const ids = start.body.questions.map((q: { id: string }) => q.id) as string[]
    const wrong = await student.agent.post(`/api/courses/${fx.courseId}/exam/submit`, { attemptId: start.body.attemptId, answers: answersFor(ids, fx.answerKey, false) })
    expect(wrong.body.passed).toBe(false)
    const again = await student.agent.post(`/api/courses/${fx.courseId}/exam/submit`, { attemptId: start.body.attemptId, answers: answersFor(ids, fx.answerKey, true) })
    expect(again.status).toBe(409)
    expect(again.body.code).toBe("ALREADY_SUBMITTED")
    const [row] = await ctx.db.select().from(examAttempts).where(eq(examAttempts.id, start.body.attemptId))
    expect(row).toMatchObject({ score: 0, passed: false })
  })

  it("envios simultâneos gravam uma única nota", async () => {
    const { fx, student } = await eligibleStudent()
    const start = await student.agent.post(`/api/courses/${fx.courseId}/exam/attempts`)
    const ids = start.body.questions.map((q: { id: string }) => q.id) as string[]
    const body = { attemptId: start.body.attemptId, answers: answersFor(ids, fx.answerKey, true) }
    const results = await Promise.all([1, 2, 3].map(() => student.agent.post(`/api/courses/${fx.courseId}/exam/submit`, body)))
    expect(results.filter((r) => r.status === 200)).toHaveLength(1)
    expect(results.filter((r) => r.status === 409)).toHaveLength(2)
  })

  it("tentativa expirada vira nota 0 e entra em cooldown", async () => {
    const { fx, student } = await eligibleStudent()
    const start = await student.agent.post(`/api/courses/${fx.courseId}/exam/attempts`)
    const ids = start.body.questions.map((q: { id: string }) => q.id) as string[]
    await ctx.db.execute(sql`update exam_attempts set started_at = now() - interval '46 minutes' where id = ${start.body.attemptId}`)
    const res = await student.agent.post(`/api/courses/${fx.courseId}/exam/submit`, { attemptId: start.body.attemptId, answers: answersFor(ids, fx.answerKey, true) })
    expect(res.status).toBe(409)
    expect(res.body.code).toBe("EXAM_EXPIRED")
    const [row] = await ctx.db.select().from(examAttempts).where(eq(examAttempts.id, start.body.attemptId))
    expect(row).toMatchObject({ score: 0, passed: false })
    const status = await student.agent.get(`/api/courses/${fx.courseId}/exam`)
    expect(status.body.cooldownUntil).not.toBeNull()
    expect((await student.agent.post(`/api/courses/${fx.courseId}/exam/attempts`)).status).toBe(429)
  })

  it("aceita envio dentro da tolerância de 30 s", async () => {
    const { fx, student } = await eligibleStudent()
    const start = await student.agent.post(`/api/courses/${fx.courseId}/exam/attempts`)
    const ids = start.body.questions.map((q: { id: string }) => q.id) as string[]
    await ctx.db.execute(sql`update exam_attempts set started_at = now() - interval '45 minutes 10 seconds' where id = ${start.body.attemptId}`)
    const res = await student.agent.post(`/api/courses/${fx.courseId}/exam/submit`, { attemptId: start.body.attemptId, answers: answersFor(ids, fx.answerKey, true) })
    expect(res.status).toBe(200)
    expect(res.body.passed).toBe(true)
  })

  it("abandonar a prova (deixar expirar sem enviar) também gera cooldown", async () => {
    const { fx, student } = await eligibleStudent()
    const start = await student.agent.post(`/api/courses/${fx.courseId}/exam/attempts`)
    await ctx.db.execute(sql`update exam_attempts set started_at = now() - interval '50 minutes' where id = ${start.body.attemptId}`)
    const status = await student.agent.get(`/api/courses/${fx.courseId}/exam`)
    expect(status.body).toMatchObject({ inProgressAttemptId: null, attemptsCount: 1, bestScore: 0 })
    expect(status.body.cooldownUntil).not.toBeNull()
    expect((await student.agent.post(`/api/courses/${fx.courseId}/exam/attempts`)).status).toBe(429)
  })

  it("valida o corpo do envio", async () => {
    const { fx, student } = await eligibleStudent()
    const res = await student.agent.post(`/api/courses/${fx.courseId}/exam/submit`, { attemptId: "x", answers: {} })
    expect(res.status).toBe(400)
  })

  it("limita 10 inícios de prova por hora", async () => {
    const { fx, student } = await eligibleStudent()
    const statuses: number[] = []
    for (let i = 0; i < 11; i++) statuses.push((await student.agent.post(`/api/courses/${fx.courseId}/exam/attempts`)).status)
    expect(statuses.slice(0, 10).every((s) => s === 200)).toBe(true)
    expect(statuses[10]).toBe(429)
  })

  describe("administração do banco de questões", () => {
    it("aluno não acessa", async () => {
      const fx = await seedCourseWithExam(ctx)
      const { agent: a } = await signUp(ctx.app)
      expect((await a.get("/api/admin/exams")).status).toBe(403)
      expect((await a.get(`/api/admin/exams/${fx.examId}/questions`)).status).toBe(403)
    })

    it("admin lista, cria e edita questões com auditoria", async () => {
      const fx = await seedCourseWithExam(ctx, { title: "Curso Admin" })
      const admin = await signUp(ctx.app, "admin", ctx.db)

      const list = await admin.agent.get("/api/admin/exams")
      expect(list.body).toEqual([{ id: fx.examId, course_id: fx.courseId, course_title: "Curso Admin", title: "Prova final" }])

      const qs = await admin.agent.get(`/api/admin/exams/${fx.examId}/questions`)
      expect(qs.body).toHaveLength(4)
      expect(qs.body[0]).toHaveProperty("correct_index")

      const created = await admin.agent.post(`/api/admin/exams/${fx.examId}/questions`, { prompt: "Nova?", options: ["x", "y"], correct_index: 1 })
      expect(created.status).toBe(201)
      expect(created.body).toMatchObject({ exam_id: fx.examId, prompt: "Nova?", correct_index: 1, active: true, explanation: "" })

      const bad = await admin.agent.post(`/api/admin/exams/${fx.examId}/questions`, { prompt: "Ruim", options: ["x", "y"], correct_index: 5 })
      expect(bad.status).toBe(400)

      const patched = await admin.agent.patch(`/api/admin/exam-questions/${created.body.id}`, { active: false, explanation: "porque sim" })
      expect(patched.status).toBe(200)
      expect(patched.body).toMatchObject({ active: false, explanation: "porque sim", correct_index: 1 })

      const outOfRange = await admin.agent.patch(`/api/admin/exam-questions/${created.body.id}`, { correct_index: 2 })
      expect(outOfRange.status).toBe(400)

      expect((await admin.agent.patch(`/api/admin/exam-questions/00000000-0000-4000-8000-000000000000`, { active: true })).status).toBe(404)
      expect((await admin.agent.get(`/api/admin/exams/00000000-0000-4000-8000-000000000000/questions`)).status).toBe(404)

      const audit = await ctx.db.execute(sql`select action from audit_log order by created_at`)
      expect((audit.rows as { action: string }[]).map((r) => r.action)).toEqual(["exam_question.created", "exam_question.updated"])

      // Questão desativada não entra no sorteio.
      const status = await (await signUp(ctx.app)).agent.get(`/api/courses/${fx.courseId}/exam`)
      expect(status.body.exam.questionCount).toBe(4)
    })
  })
})
