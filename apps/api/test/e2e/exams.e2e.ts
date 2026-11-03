import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { eq, sql } from "drizzle-orm"
import { examAttempts, notifications } from "@levelusp/db"
import type { AdminExamQuestion, ApiErrorBody, ExamResult, ExamStart, ExamStatus } from "@levelusp/contracts"
import { agent, bodyOf, countRows, createTestApp, queryRows, required, signUp, type SignedUpUser, type TestContext } from "./harness"
import {
  answersFor, completeLessons, drawnQuestionIds, missQuestions, seedCourseWithExam, type ExamFixture, type ExamFixtureOptions,
} from "./exam-fixtures"

/** Aluno que concluiu todas as lições do curso da prova. */
interface EligibleStudent {
  fixture: ExamFixture
  student: SignedUpUser
}

describe("Prova final (e2e)", () => {
  let ctx: TestContext
  beforeAll(async () => {
    ctx = await createTestApp()
  })
  afterAll(() => ctx.close())
  beforeEach(() => ctx.reset())

  async function eligibleStudent(opts: ExamFixtureOptions = {}): Promise<EligibleStudent> {
    const fixture = await seedCourseWithExam(ctx, opts)
    const student = await signUp(ctx.app)
    await completeLessons(ctx, student.id, fixture.lessonIds)
    return { fixture, student }
  }

  it("exige login", async () => {
    const fixture = await seedCourseWithExam(ctx)
    expect((await agent(ctx.app).get(`/api/courses/${fixture.courseId}/exam`)).status).toBe(401)
  })

  it("aluno sem lições concluídas não é elegível e não pode iniciar", async () => {
    const fixture = await seedCourseWithExam(ctx)
    const { agent: a, id } = await signUp(ctx.app)
    await completeLessons(ctx, id, fixture.lessonIds.slice(0, 1))

    const status = await a.get(`/api/courses/${fixture.courseId}/exam`)
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

    const start = await a.post(`/api/courses/${fixture.courseId}/exam/attempts`)
    expect(start.status).toBe(403)
    expect(bodyOf<ApiErrorBody>(start).code).toBe("NOT_ELIGIBLE")
  })

  it("curso sem prova responde 404", async () => {
    const { agent: a } = await signUp(ctx.app)
    expect((await a.get(`/api/courses/00000000-0000-4000-8000-000000000000/exam`)).status).toBe(404)
  })

  it("questões do aluno nunca trazem gabarito nem explicação", async () => {
    const { fixture, student } = await eligibleStudent()
    const response = await student.agent.post(`/api/courses/${fixture.courseId}/exam/attempts`)
    expect(response.status).toBe(200)
    const { questions } = bodyOf<ExamStart>(response)
    expect(questions).toHaveLength(4)
    for (const question of questions) expect(Object.keys(question).sort()).toEqual(["id", "options", "prompt"])
    const raw = JSON.stringify(response.body)
    expect(raw).not.toMatch(/correct|explanation|Explicação/i)
    const status = JSON.stringify((await student.agent.get(`/api/courses/${fixture.courseId}/exam`)).body)
    expect(status).not.toMatch(/correct_index|Questão/)
  })

  it("fluxo completo: inicia, envia, aprova e notifica", async () => {
    const { fixture, student } = await eligibleStudent()
    const start = await student.agent.post(`/api/courses/${fixture.courseId}/exam/attempts`)
    const started = bodyOf<ExamStart>(start)
    expect(start.body).toMatchObject({ resumed: false, timeLimitMinutes: 45 })
    const ids = drawnQuestionIds(started)
    expect(new Date(started.expiresAt).getTime()).toBeGreaterThan(Date.now() + 44 * 60_000)

    const statusDuring = await student.agent.get(`/api/courses/${fixture.courseId}/exam`)
    expect(statusDuring.body).toMatchObject({ eligible: true, inProgressAttemptId: started.attemptId, inProgressExpiresAt: started.expiresAt })

    const response = await student.agent.post(`/api/courses/${fixture.courseId}/exam/submit`, { attemptId: started.attemptId, answers: answersFor(ids, fixture.answerKey, true) })
    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ score: 100, passed: true, passingScore: 70, correctCount: 4, total: 4 })
    const { review } = bodyOf<ExamResult>(response)
    expect(review).toHaveLength(4)
    const [firstReview] = review
    expect(firstReview?.explanation).toContain("Explicação")
    expect(firstReview).toEqual({ questionId: ids[0], correct: true, explanation: firstReview?.explanation })

    const status = await student.agent.get(`/api/courses/${fixture.courseId}/exam`)
    expect(status.body).toMatchObject({ passed: true, passedScore: 100, bestScore: 100, attemptsCount: 1, cooldownUntil: null, inProgressAttemptId: null })

    const notes = await ctx.db.select().from(notifications).where(eq(notifications.userId, student.id))
    expect(notes.some((notification) => notification.title.startsWith("Prova aprovada"))).toBe(true)

    // Aprovado não refaz a prova.
    const again = await student.agent.post(`/api/courses/${fixture.courseId}/exam/attempts`)
    expect(again.status).toBe(409)
  })

  it("corrige só as questões sorteadas e grava respostas saneadas", async () => {
    const { fixture, student } = await eligibleStudent({ questions: 6, questionsPerAttempt: 3 })
    const status = await student.agent.get(`/api/courses/${fixture.courseId}/exam`)
    expect(bodyOf<ExamStatus>(status).exam.questionCount).toBe(3)
    const start = await student.agent.post(`/api/courses/${fixture.courseId}/exam/attempts`)
    const started = bodyOf<ExamStart>(start)
    const ids = drawnQuestionIds(started)
    expect(ids).toHaveLength(3)
    const others = [...fixture.answerKey.keys()].filter((id) => !ids.includes(id))
    // Responde certo as questões que NÃO foram sorteadas: não contam.
    const answers = { ...answersFor(ids, fixture.answerKey, false), ...answersFor(others, fixture.answerKey, true) }
    const response = await student.agent.post(`/api/courses/${fixture.courseId}/exam/submit`, { attemptId: started.attemptId, answers })
    expect(response.body).toMatchObject({ score: 0, passed: false, correctCount: 0, total: 3 })
    const [attempt] = await ctx.db.select().from(examAttempts).where(eq(examAttempts.id, started.attemptId))
    expect(Object.keys(attempt?.answers ?? {}).sort()).toEqual([...ids].sort())
  })

  it("reprovação gera cooldown", async () => {
    const { fixture, student } = await eligibleStudent()
    const start = await student.agent.post(`/api/courses/${fixture.courseId}/exam/attempts`)
    const started = bodyOf<ExamStart>(start)
    const ids = drawnQuestionIds(started)
    const answers = missQuestions(answersFor(ids, fixture.answerKey, true), fixture.answerKey, ids.slice(0, 2))
    const response = await student.agent.post(`/api/courses/${fixture.courseId}/exam/submit`, { attemptId: started.attemptId, answers })
    expect(response.body).toMatchObject({ score: 50, passed: false, correctCount: 2 })

    const status = await student.agent.get(`/api/courses/${fixture.courseId}/exam`)
    expect(status.body).toMatchObject({ passed: false, bestScore: 50, attemptsCount: 1 })
    const until = new Date(required(bodyOf<ExamStatus>(status).cooldownUntil, "fim do intervalo entre tentativas")).getTime()
    expect(until).toBeGreaterThan(Date.now() + 59 * 60_000)

    const retry = await student.agent.post(`/api/courses/${fixture.courseId}/exam/attempts`)
    expect(retry.status).toBe(429)
    expect(bodyOf<ApiErrorBody>(retry).code).toBe("COOLDOWN")
    expect(bodyOf<ApiErrorBody>(retry).message).toContain(bodyOf<ExamStatus>(status).cooldownUntil)

    // Passado o intervalo, libera nova tentativa.
    await ctx.db.execute(sql`update exam_attempts set submitted_at = submitted_at - interval '61 minutes' where id = ${started.attemptId}`)
    const later = await student.agent.post(`/api/courses/${fixture.courseId}/exam/attempts`)
    expect(later.status).toBe(200)
    expect(bodyOf<ExamStart>(later).resumed).toBe(false)
  })

  it("retoma a tentativa em andamento com as mesmas questões", async () => {
    const { fixture, student } = await eligibleStudent()
    const first = await student.agent.post(`/api/courses/${fixture.courseId}/exam/attempts`)
    const second = await student.agent.post(`/api/courses/${fixture.courseId}/exam/attempts`)
    expect(second.status).toBe(200)
    const firstStart = bodyOf<ExamStart>(first)
    expect(second.body).toMatchObject({ attemptId: firstStart.attemptId, resumed: true, expiresAt: firstStart.expiresAt })
    expect(bodyOf<ExamStart>(second).questions).toEqual(firstStart.questions)
    expect(await countRows(ctx.db, sql`select count(*)::int as n from exam_attempts`)).toBe(1)
  })

  it("tentativa de outro usuário responde 404", async () => {
    const { fixture, student } = await eligibleStudent()
    const start = await student.agent.post(`/api/courses/${fixture.courseId}/exam/attempts`)
    const started = bodyOf<ExamStart>(start)
    const intruder = await signUp(ctx.app)
    await completeLessons(ctx, intruder.id, fixture.lessonIds)
    const response = await intruder.agent.post(`/api/courses/${fixture.courseId}/exam/submit`, { attemptId: started.attemptId, answers: {} })
    expect(response.status).toBe(404)
    const [attempt] = await ctx.db.select().from(examAttempts).where(eq(examAttempts.id, started.attemptId))
    expect(attempt).toBeDefined()
    expect(attempt?.submittedAt).toBeNull()
  })

  it("submissão dupla responde 409 e não altera a nota", async () => {
    const { fixture, student } = await eligibleStudent()
    const start = await student.agent.post(`/api/courses/${fixture.courseId}/exam/attempts`)
    const started = bodyOf<ExamStart>(start)
    const ids = drawnQuestionIds(started)
    const wrong = await student.agent.post(`/api/courses/${fixture.courseId}/exam/submit`, { attemptId: started.attemptId, answers: answersFor(ids, fixture.answerKey, false) })
    expect(bodyOf<ExamResult>(wrong).passed).toBe(false)
    const again = await student.agent.post(`/api/courses/${fixture.courseId}/exam/submit`, { attemptId: started.attemptId, answers: answersFor(ids, fixture.answerKey, true) })
    expect(again.status).toBe(409)
    expect(bodyOf<ApiErrorBody>(again).code).toBe("ALREADY_SUBMITTED")
    const [row] = await ctx.db.select().from(examAttempts).where(eq(examAttempts.id, started.attemptId))
    expect(row).toMatchObject({ score: 0, passed: false })
  })

  it("envios simultâneos gravam uma única nota", async () => {
    const { fixture, student } = await eligibleStudent()
    const start = await student.agent.post(`/api/courses/${fixture.courseId}/exam/attempts`)
    const started = bodyOf<ExamStart>(start)
    const ids = drawnQuestionIds(started)
    const body = { attemptId: started.attemptId, answers: answersFor(ids, fixture.answerKey, true) }
    const results = await Promise.all([1, 2, 3].map(() => student.agent.post(`/api/courses/${fixture.courseId}/exam/submit`, body)))
    expect(results.filter((r) => r.status === 200)).toHaveLength(1)
    expect(results.filter((r) => r.status === 409)).toHaveLength(2)
  })

  it("tentativa expirada vira nota 0 e entra em cooldown", async () => {
    const { fixture, student } = await eligibleStudent()
    const start = await student.agent.post(`/api/courses/${fixture.courseId}/exam/attempts`)
    const started = bodyOf<ExamStart>(start)
    const ids = drawnQuestionIds(started)
    await ctx.db.execute(sql`update exam_attempts set started_at = now() - interval '46 minutes' where id = ${started.attemptId}`)
    const response = await student.agent.post(`/api/courses/${fixture.courseId}/exam/submit`, { attemptId: started.attemptId, answers: answersFor(ids, fixture.answerKey, true) })
    expect(response.status).toBe(409)
    expect(bodyOf<ApiErrorBody>(response).code).toBe("EXAM_EXPIRED")
    const [row] = await ctx.db.select().from(examAttempts).where(eq(examAttempts.id, started.attemptId))
    expect(row).toMatchObject({ score: 0, passed: false })
    const status = await student.agent.get(`/api/courses/${fixture.courseId}/exam`)
    expect(bodyOf<ExamStatus>(status).cooldownUntil).not.toBeNull()
    expect((await student.agent.post(`/api/courses/${fixture.courseId}/exam/attempts`)).status).toBe(429)
  })

  it("aceita envio dentro da tolerância de 30 s", async () => {
    const { fixture, student } = await eligibleStudent()
    const start = await student.agent.post(`/api/courses/${fixture.courseId}/exam/attempts`)
    const started = bodyOf<ExamStart>(start)
    const ids = drawnQuestionIds(started)
    await ctx.db.execute(sql`update exam_attempts set started_at = now() - interval '45 minutes 10 seconds' where id = ${started.attemptId}`)
    const response = await student.agent.post(`/api/courses/${fixture.courseId}/exam/submit`, { attemptId: started.attemptId, answers: answersFor(ids, fixture.answerKey, true) })
    expect(response.status).toBe(200)
    expect(bodyOf<ExamResult>(response).passed).toBe(true)
  })

  it("abandonar a prova (deixar expirar sem enviar) também gera cooldown", async () => {
    const { fixture, student } = await eligibleStudent()
    const start = await student.agent.post(`/api/courses/${fixture.courseId}/exam/attempts`)
    const started = bodyOf<ExamStart>(start)
    await ctx.db.execute(sql`update exam_attempts set started_at = now() - interval '50 minutes' where id = ${started.attemptId}`)
    const status = await student.agent.get(`/api/courses/${fixture.courseId}/exam`)
    expect(status.body).toMatchObject({ inProgressAttemptId: null, attemptsCount: 1, bestScore: 0 })
    expect(bodyOf<ExamStatus>(status).cooldownUntil).not.toBeNull()
    expect((await student.agent.post(`/api/courses/${fixture.courseId}/exam/attempts`)).status).toBe(429)
  })

  it("valida o corpo do envio", async () => {
    const { fixture, student } = await eligibleStudent()
    const response = await student.agent.post(`/api/courses/${fixture.courseId}/exam/submit`, { attemptId: "x", answers: {} })
    expect(response.status).toBe(400)
  })

  it("limita 10 inícios de prova por hora", async () => {
    const { fixture, student } = await eligibleStudent()
    const statuses: number[] = []
    for (let i = 0; i < 11; i++) statuses.push((await student.agent.post(`/api/courses/${fixture.courseId}/exam/attempts`)).status)
    expect(statuses.slice(0, 10).every((s) => s === 200)).toBe(true)
    expect(statuses[10]).toBe(429)
  })

  describe("administração do banco de questões", () => {
    it("aluno não acessa", async () => {
      const fixture = await seedCourseWithExam(ctx)
      const { agent: a } = await signUp(ctx.app)
      expect((await a.get("/api/admin/exams")).status).toBe(403)
      expect((await a.get(`/api/admin/exams/${fixture.examId}/questions`)).status).toBe(403)
    })

    it("admin lista, cria e edita questões com auditoria", async () => {
      const fixture = await seedCourseWithExam(ctx, { title: "Curso Admin" })
      const admin = await signUp(ctx.app, "admin", ctx.db)

      const list = await admin.agent.get("/api/admin/exams")
      expect(list.body).toEqual([{ id: fixture.examId, course_id: fixture.courseId, course_title: "Curso Admin", title: "Prova final" }])

      const questions = await admin.agent.get(`/api/admin/exams/${fixture.examId}/questions`)
      expect(questions.body).toHaveLength(4)
      expect(bodyOf<AdminExamQuestion[]>(questions)[0]).toHaveProperty("correct_index")

      const created = await admin.agent.post(`/api/admin/exams/${fixture.examId}/questions`, { prompt: "Nova?", options: ["x", "y"], correct_index: 1 })
      expect(created.status).toBe(201)
      expect(created.body).toMatchObject({ exam_id: fixture.examId, prompt: "Nova?", correct_index: 1, active: true, explanation: "" })

      const bad = await admin.agent.post(`/api/admin/exams/${fixture.examId}/questions`, { prompt: "Ruim", options: ["x", "y"], correct_index: 5 })
      expect(bad.status).toBe(400)

      const patched = await admin.agent.patch(`/api/admin/exam-questions/${bodyOf<AdminExamQuestion>(created).id}`, { active: false, explanation: "porque sim" })
      expect(patched.status).toBe(200)
      expect(patched.body).toMatchObject({ active: false, explanation: "porque sim", correct_index: 1 })

      const outOfRange = await admin.agent.patch(`/api/admin/exam-questions/${bodyOf<AdminExamQuestion>(created).id}`, { correct_index: 2 })
      expect(outOfRange.status).toBe(400)

      expect((await admin.agent.patch(`/api/admin/exam-questions/00000000-0000-4000-8000-000000000000`, { active: true })).status).toBe(404)
      expect((await admin.agent.get(`/api/admin/exams/00000000-0000-4000-8000-000000000000/questions`)).status).toBe(404)

      const audit = await queryRows<{ action: string }>(ctx.db, sql`select action from audit_log order by created_at`)
      expect(audit.map((entry) => entry.action)).toEqual(["exam_question.created", "exam_question.updated"])

      // Questão desativada não entra no sorteio.
      const status = await (await signUp(ctx.app)).agent.get(`/api/courses/${fixture.courseId}/exam`)
      expect(bodyOf<ExamStatus>(status).exam.questionCount).toBe(4)
    })
  })
})
