import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { eq, sql } from "drizzle-orm"
import { lessonQuizQuestions, profiles } from "@levelusp/db"
import type { ApiErrorBody, CertificateIssue, ExamStart, LessonCompletion, PublicProfile, QuizResult } from "@levelusp/contracts"
import { bodyOf, countRows, createLesson, createTestApp, required, signUp, type SignedUpUser, type TestContext } from "../e2e/harness"
import { answersFor, completeLessons, drawnQuestionIds, seedCourseWithExam } from "../e2e/exam-fixtures"

/*
 * Lógica de negócio (OWASP API6:2023 — fluxos sensíveis): ganhar XP, badges,
 * certificado ou nota sem veredito do servidor; repetir ou disparar em paralelo
 * conclusões, quizzes, provas e certificados; extrair o gabarito; números absurdos.
 */

const SECRET_EXPLANATION = "EXPLICACAO-SECRETA"
const PARALLEL_REQUESTS = 15

async function totalXpOf(ctx: TestContext, userId: string): Promise<number> {
  return required(await ctx.db.query.profiles.findFirst({ where: eq(profiles.id, userId) }), "perfil").totalXp
}

describe("Lógica de negócio sob ataque", () => {
  let ctx: TestContext
  let student: SignedUpUser

  beforeAll(async () => {
    ctx = await createTestApp()
  })
  afterAll(() => ctx.close())
  beforeEach(async () => {
    await ctx.reset()
    student = await signUp(ctx.app)
  })

  describe("XP e conclusão", () => {
    it("conclusão de teoria em rajada paralela credita XP uma única vez", async () => {
      const lesson = await createLesson(ctx.db, { lessonType: "theory", xpReward: 40 })
      const responses = await Promise.all(Array.from({ length: PARALLEL_REQUESTS }, () => student.agent.post(`/api/lessons/${lesson.id}/complete`)))
      expect(responses.every((response) => response.status === 200)).toBe(true)
      const credited = responses.map((response) => bodyOf<LessonCompletion>(response).xp_awarded).filter((xp) => xp > 0)
      expect(credited).toEqual([40])
      expect(await totalXpOf(ctx, student.id)).toBe(40)
      expect(await countRows(ctx.db, sql`select count(*)::int as n from lesson_progress where user_id = ${student.id}`)).toBe(1)
    })

    it("não existe atalho: exercício de código e quiz não se concluem por /complete", async () => {
      const coding = await createLesson(ctx.db, { testCases: [{ id: "c1", kind: "io", stdin: "", expected_stdout: "1", match: "trimmed" }] })
      const quiz = await createLesson(ctx.db, { lessonType: "quiz" })
      expect((await student.agent.post(`/api/lessons/${coding.id}/complete`)).status).toBe(400)
      expect((await student.agent.post(`/api/lessons/${quiz.id}/complete`)).status).toBe(400)
      expect(await totalXpOf(ctx, student.id)).toBe(0)
    })

    it("submissão reprovada pelo servidor não credita nada, mesmo com campos de aprovação no corpo", async () => {
      const coding = await createLesson(ctx.db, { testCases: [{ id: "c1", kind: "io", stdin: "", expected_stdout: "esperado", match: "trimmed" }] })
      ctx.runner.respond((job) => job.probes.map((probe) => ({ id: probe.id, ok: true, stdout: "outra coisa" })))
      const response = await student.agent.post(`/api/lessons/${coding.id}/submissions`, {
        files: [{ path: "main.py", content: "print('outra coisa')" }],
        allPassed: true,
        passed: true,
        lesson_completed: true,
        xp_awarded: 9999,
      })
      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({ allPassed: false, lesson_completed: false, xp_awarded: 0 })
      expect(await totalXpOf(ctx, student.id)).toBe(0)
    })

    it("prévia de rascunho (professor dono) não gera XP", async () => {
      const teacher = await signUp(ctx.app, "teacher", ctx.db)
      const draft = await createLesson(ctx.db, { lessonType: "theory", published: false, createdBy: teacher.id, xpReward: 5000 })
      const response = await teacher.agent.post(`/api/lessons/${draft.id}/complete`)
      expect(bodyOf<LessonCompletion>(response).xp_awarded).toBe(0)
      expect(await totalXpOf(ctx, teacher.id)).toBe(0)
    })

    it("sequência (streak) não sobe com logins repetidos no mesmo dia", async () => {
      for (let login = 0; login < 5; login++) {
        await student.agent.post("/api/auth/sign-in", { email: student.email, password: student.password })
      }
      const stored = required(await ctx.db.query.profiles.findFirst({ where: eq(profiles.id, student.id) }), "perfil")
      expect(stored.currentStreak).toBe(1)
    })
  })

  describe("quiz", () => {
    async function seedQuiz(): Promise<string> {
      const lesson = await createLesson(ctx.db, { lessonType: "quiz", xpReward: 30, quizPassingScore: 100 })
      await ctx.db.insert(lessonQuizQuestions).values([
        { lessonId: lesson.id, prompt: "1+1?", options: ["1", "2", "3"], correctIndex: 1, explanation: SECRET_EXPLANATION, sortOrder: 0 },
        { lessonId: lesson.id, prompt: "2+2?", options: ["4", "5", "6"], correctIndex: 0, explanation: SECRET_EXPLANATION, sortOrder: 1 },
      ])
      return lesson.id
    }

    it("questões públicas e reprovação não trazem gabarito nem explicação", async () => {
      const lessonId = await seedQuiz()
      const listed = await student.agent.get(`/api/lessons/${lessonId}/quiz`)
      expect(JSON.stringify(listed.body)).not.toMatch(/correct|EXPLICACAO-SECRETA/)
      const questionIds = (await ctx.db.select().from(lessonQuizQuestions).where(eq(lessonQuizQuestions.lessonId, lessonId))).map((question) => question.id)
      const failed = bodyOf<QuizResult>(await student.agent.post(`/api/lessons/${lessonId}/quiz/submissions`, { answers: Object.fromEntries(questionIds.map((id) => [id, 2])) }))
      expect(failed.passed).toBe(false)
      expect(failed.review).toEqual([])
      expect(JSON.stringify(failed)).not.toContain(SECRET_EXPLANATION)
    })

    it("aprovação repetida e em paralelo credita XP uma única vez", async () => {
      const lessonId = await seedQuiz()
      const questions = await ctx.db.select().from(lessonQuizQuestions).where(eq(lessonQuizQuestions.lessonId, lessonId))
      const answers = Object.fromEntries(questions.map((question) => [question.id, question.correctIndex]))
      const responses = await Promise.all(Array.from({ length: 8 }, () => student.agent.post(`/api/lessons/${lessonId}/quiz/submissions`, { answers })))
      const credited = responses.filter((response) => response.status === 200).map((response) => bodyOf<QuizResult>(response).xp_awarded)
      expect(credited.filter((xp) => xp > 0)).toEqual([30])
      expect(await totalXpOf(ctx, student.id)).toBe(30)
    })

    it("respostas com índice negativo, enorme ou chave que não é UUID são recusadas", async () => {
      const lessonId = await seedQuiz()
      for (const answers of [{ "00000000-0000-4000-8000-000000000000": -1 }, { "00000000-0000-4000-8000-000000000000": 1e9 }, { "' OR 1=1 --": 0 }, { "00000000-0000-4000-8000-000000000000": 1.5 }]) {
        expect((await student.agent.post(`/api/lessons/${lessonId}/quiz/submissions`, { answers })).status).toBe(400)
      }
    })
  })

  describe("prova final", () => {
    it("início e status não trazem gabarito; reprovação não revela quais questões errou", async () => {
      const fixture = await seedCourseWithExam(ctx, { questions: 4 })
      await completeLessons(ctx, student.id, fixture.lessonIds)
      const status = await student.agent.get(`/api/courses/${fixture.courseId}/exam`)
      expect(JSON.stringify(status.body)).not.toMatch(/correct|Explicação/)
      const start = await student.agent.post(`/api/courses/${fixture.courseId}/exam/attempts`)
      expect(JSON.stringify(start.body)).not.toMatch(/correct|Explicação/)
      const attempt = bodyOf<ExamStart>(start)
      const failed = await student.agent.post(`/api/courses/${fixture.courseId}/exam/submit`, { attemptId: attempt.attemptId, answers: answersFor(drawnQuestionIds(attempt), fixture.answerKey, false) })
      expect(failed.body).toMatchObject({ passed: false, review: [] })
      expect(JSON.stringify(failed.body)).not.toMatch(/correct_index|correctIndex|Explicação/)
    })

    it("envio repetido e paralelo da mesma tentativa corrige uma única vez", async () => {
      const fixture = await seedCourseWithExam(ctx, { questions: 4 })
      await completeLessons(ctx, student.id, fixture.lessonIds)
      const attempt = bodyOf<ExamStart>(await student.agent.post(`/api/courses/${fixture.courseId}/exam/attempts`))
      const wrong = answersFor(drawnQuestionIds(attempt), fixture.answerKey, false)
      const right = answersFor(drawnQuestionIds(attempt), fixture.answerKey, true)
      // A primeira (errada) fecha a tentativa; a "segunda chance" com o gabarito descoberto não vale.
      const responses = await Promise.all([wrong, right, right, right].map((answers) => student.agent.post(`/api/courses/${fixture.courseId}/exam/submit`, { attemptId: attempt.attemptId, answers })))
      expect(responses.filter((response) => response.status === 200)).toHaveLength(1)
      expect(responses.filter((response) => response.status === 409).every((response) => bodyOf<ApiErrorBody>(response).code === "ALREADY_SUBMITTED")).toBe(true)
      expect(await countRows(ctx.db, sql`select count(*)::int as n from exam_attempts where user_id = ${student.id} and submitted_at is not null`)).toBe(1)
    })

    it("início em paralelo abre uma única tentativa (sem multiplicar sorteios para vasculhar o banco)", async () => {
      const fixture = await seedCourseWithExam(ctx, { questions: 6, questionsPerAttempt: 2 })
      await completeLessons(ctx, student.id, fixture.lessonIds)
      const responses = await Promise.all(Array.from({ length: 6 }, () => student.agent.post(`/api/courses/${fixture.courseId}/exam/attempts`)))
      const attemptIds = new Set(responses.filter((response) => response.status === 200).map((response) => bodyOf<ExamStart>(response).attemptId))
      expect(attemptIds.size).toBe(1)
      expect(await countRows(ctx.db, sql`select count(*)::int as n from exam_attempts where user_id = ${student.id}`)).toBe(1)
    })

    it("respostas a questões fora da tentativa não contam (nota não passa de 100)", async () => {
      const fixture = await seedCourseWithExam(ctx, { questions: 6, questionsPerAttempt: 2 })
      await completeLessons(ctx, student.id, fixture.lessonIds)
      const attempt = bodyOf<ExamStart>(await student.agent.post(`/api/courses/${fixture.courseId}/exam/attempts`))
      const everything = answersFor([...fixture.answerKey.keys()], fixture.answerKey, true)
      const drawn = new Set(drawnQuestionIds(attempt))
      const onlyOutside = Object.fromEntries(Object.entries(everything).filter(([id]) => !drawn.has(id)))
      const result = await student.agent.post(`/api/courses/${fixture.courseId}/exam/submit`, { attemptId: attempt.attemptId, answers: onlyOutside })
      expect(result.body).toMatchObject({ score: 0, passed: false, total: 2 })
    })

    it("certificado: emissão em paralelo gera um único certificado; sem aprovação, nenhum", async () => {
      const fixture = await seedCourseWithExam(ctx, { questions: 2 })
      await completeLessons(ctx, student.id, fixture.lessonIds)
      expect((await student.agent.post(`/api/courses/${fixture.courseId}/certificate`)).status).toBe(403)
      const attempt = bodyOf<ExamStart>(await student.agent.post(`/api/courses/${fixture.courseId}/exam/attempts`))
      await student.agent.post(`/api/courses/${fixture.courseId}/exam/submit`, { attemptId: attempt.attemptId, answers: answersFor(drawnQuestionIds(attempt), fixture.answerKey, true) })
      const responses = await Promise.all(Array.from({ length: 10 }, () => student.agent.post(`/api/courses/${fixture.courseId}/certificate`)))
      expect(responses.every((response) => response.status === 200)).toBe(true)
      const codes = new Set(responses.map((response) => bodyOf<CertificateIssue>(response).verificationCode))
      expect(codes.size).toBe(1)
      expect(await countRows(ctx.db, sql`select count(*)::int as n from certificates where user_id = ${student.id}`)).toBe(1)
    })
  })

  describe("ranking e números absurdos", () => {
    it("professores, admins e suspensos não aparecem no ranking", async () => {
      const teacher = await signUp(ctx.app, "teacher", ctx.db)
      const suspended = await signUp(ctx.app)
      await ctx.db.update(profiles).set({ totalXp: 1_000_000 }).where(eq(profiles.id, teacher.id))
      await ctx.db.update(profiles).set({ totalXp: 1_000_000, suspended: true }).where(eq(profiles.id, suspended.id))
      const ranking = bodyOf<PublicProfile[]>(await student.agent.get("/api/leaderboard"))
      expect(ranking.map((profile) => profile.id)).not.toContain(teacher.id)
      expect(ranking.map((profile) => profile.id)).not.toContain(suspended.id)
      expect(JSON.stringify(ranking)).not.toContain("@usp.br")
    })

    it("limites e números fora da faixa são recusados (sem 500)", async () => {
      for (const limit of ["-1", "0", "100000000000", "abc", "1e309", "NaN"]) {
        expect((await student.agent.get(`/api/leaderboard?limit=${limit}`)).status).toBe(400)
      }
      const teacher = await signUp(ctx.app, "teacher", ctx.db)
      const absurd = [{ xp_reward: -50 }, { xp_reward: 1e12 }, { quiz_passing_score: 0 }, { quiz_passing_score: 101 }, { time_limit: -1 }, { order: 2 ** 53 }]
      for (const fields of absurd) {
        const response = await teacher.agent.post("/api/lessons", { title: "Números", ...fields })
        expect(response.status).toBe(400)
      }
      expect((await teacher.agent.post("/api/courses", { title: "Horas", estimated_hours: Number.MAX_SAFE_INTEGER })).status).toBe(400)
    })
  })
})
