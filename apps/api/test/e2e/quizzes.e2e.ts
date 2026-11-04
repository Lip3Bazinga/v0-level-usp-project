import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import type { ApiErrorBody, LessonProgress, QuizQuestionFull, QuizQuestionPublic, QuizResult, SessionResponse } from "@levelusp/contracts"
import type { LessonRow } from "@levelusp/db"
import { agent, bodyOf, createLesson, createTestApp, signUp, type Agent, type SignedUpUser, type TestContext } from "./harness"

const questions = [
  { prompt: "Qual função mostra texto na tela?", options: ["input", "print", "len"], correct_index: 1, explanation: "print escreve na saída." },
  { prompt: "Qual tipo é imutável?", options: ["list", "dict", "tuple"], correct_index: 2, explanation: "Tuplas são imutáveis." },
  { prompt: "Quanto é 2 ** 3?", options: ["6", "8", "9"], correct_index: 1, explanation: "Potência: 2³ = 8." },
  { prompt: "Qual palavra define função?", options: ["def", "fun", "func"], correct_index: 0, explanation: "Usa-se def." },
]

/** Professor dono, a lição de quiz criada e as questões salvas (com gabarito). */
interface QuizSetup {
  teacher: SignedUpUser
  lesson: LessonRow
  full: QuizQuestionFull[]
}

describe("Quiz de lição (e2e)", () => {
  let ctx: TestContext
  beforeAll(async () => {
    ctx = await createTestApp()
  })
  afterAll(() => ctx.close())
  beforeEach(() => ctx.reset())

  /** Professor dono + lição de quiz publicada (70%) com as 4 questões. */
  async function setupQuiz(options: { published?: boolean; xpReward?: number } = {}): Promise<QuizSetup> {
    const teacher = await signUp(ctx.app, "teacher", ctx.db)
    const lesson = await createLesson(ctx.db, {
      createdBy: teacher.id,
      lessonType: "quiz",
      quizPassingScore: 70,
      xpReward: options.xpReward ?? 40,
      published: options.published ?? true,
    })
    const saved = await teacher.agent.put(`/api/lessons/${lesson.id}/quiz`, { questions })
    expect(saved.status).toBe(200)
    const full = bodyOf<QuizQuestionFull[]>(saved)
    return { teacher, lesson, full }
  }

  const answersFor = (full: QuizQuestionFull[], correct: number): Record<string, number> =>
    Object.fromEntries(full.map((question, position) => [question.id, position < correct ? question.correct_index : (question.correct_index + 1) % question.options.length]))

  it("aluno recebe as questões sem gabarito nem explicação", async () => {
    const { lesson } = await setupQuiz()
    const { agent: studentAgent } = await signUp(ctx.app)
    const response = await studentAgent.get(`/api/lessons/${lesson.id}/quiz`)
    expect(response.status).toBe(200)
    expect(response.body).toHaveLength(4)
    for (const question of bodyOf<QuizQuestionPublic[]>(response)) expect(Object.keys(question).sort()).toEqual(["id", "options", "prompt"])
    expect(JSON.stringify(response.body)).not.toContain("correct_index")
    expect(JSON.stringify(response.body)).not.toContain("imutáveis")
    expect((await agent(ctx.app).get(`/api/lessons/${lesson.id}/quiz`)).status).toBe(401)
  })

  it("gabarito só para o professor dono (ou admin)", async () => {
    const { teacher, lesson } = await setupQuiz()
    const authoring = await teacher.agent.get(`/api/lessons/${lesson.id}/quiz/authoring`)
    expect(authoring.status).toBe(200)
    expect(bodyOf<QuizQuestionFull[]>(authoring).map((question) => question.correct_index)).toEqual([1, 2, 1, 0])

    const otherTeacher = await signUp(ctx.app, "teacher", ctx.db)
    expect((await otherTeacher.agent.get(`/api/lessons/${lesson.id}/quiz/authoring`)).status).toBe(403)
    expect((await otherTeacher.agent.put(`/api/lessons/${lesson.id}/quiz`, { questions })).status).toBe(403)
    const { agent: studentAgent } = await signUp(ctx.app)
    expect((await studentAgent.get(`/api/lessons/${lesson.id}/quiz/authoring`)).status).toBe(403)
    const admin = await signUp(ctx.app, "admin", ctx.db)
    expect((await admin.agent.get(`/api/lessons/${lesson.id}/quiz/authoring`)).status).toBe(200)
  })

  it("PUT substitui todas as questões, com sort_order pela posição", async () => {
    const { teacher, lesson, full } = await setupQuiz()
    expect(full.map((question) => question.sort_order)).toEqual([0, 1, 2, 3])
    const response = await teacher.agent.put(`/api/lessons/${lesson.id}/quiz`, { questions: [questions[3], questions[0]] })
    expect(response.status).toBe(200)
    expect(bodyOf<QuizQuestionFull[]>(response).map((question) => [question.prompt, question.sort_order])).toEqual([
      [questions[3]?.prompt, 0],
      [questions[0]?.prompt, 1],
    ])
    const after = await teacher.agent.get(`/api/lessons/${lesson.id}/quiz/authoring`)
    expect(after.body).toHaveLength(2)
    expect(bodyOf<QuizQuestionFull[]>(after).some((question) => full.some((old) => old.id === question.id))).toBe(false)
  })

  it("recusa gabarito fora das opções e esvaziar um quiz publicado", async () => {
    const { teacher, lesson } = await setupQuiz()
    const bad = await teacher.agent.put(`/api/lessons/${lesson.id}/quiz`, { questions: [{ ...questions[0], correct_index: 5 }] })
    expect(bad.status).toBe(400)
    const empty = await teacher.agent.put(`/api/lessons/${lesson.id}/quiz`, { questions: [] })
    expect(empty.status).toBe(422)
    expect(bodyOf<ApiErrorBody>(empty).code).toBe("NO_QUESTIONS")
  })

  it("aprovação corrige no servidor e credita XP uma única vez", async () => {
    const { lesson, full } = await setupQuiz({ xpReward: 40 })
    const { agent: studentAgent } = await signUp(ctx.app)

    const first = await studentAgent.post(`/api/lessons/${lesson.id}/quiz/submissions`, { answers: answersFor(full, 3) })
    expect(first.status).toBe(200)
    expect(first.body).toMatchObject({ score: 75, passed: true, passingScore: 70, correctCount: 3, total: 4, xp_awarded: 40, lesson_completed: true })
    const result = bodyOf<QuizResult>(first)
    expect(result.review).toHaveLength(4)
    expect(result.review[0]).toEqual({ questionId: full[0]?.id, correct: true, explanation: "print escreve na saída." })
    expect(result.review[3]?.correct).toBe(false)

    const second = await studentAgent.post(`/api/lessons/${lesson.id}/quiz/submissions`, { answers: answersFor(full, 4) })
    expect(second.body).toMatchObject({ score: 100, passed: true, xp_awarded: 0 })

    const me = await studentAgent.get("/api/auth/me")
    expect(bodyOf<SessionResponse>(me).user).toMatchObject({ total_xp: 40, lessons_completed: 1 })
    const progress = await studentAgent.get("/api/me/progress")
    expect(bodyOf<LessonProgress[]>(progress)[0]).toMatchObject({ lesson_id: lesson.id, status: "completed", score: 75 })
  })

  it("reprovação não credita XP nem conclui a lição", async () => {
    const { lesson, full } = await setupQuiz()
    const { agent: studentAgent } = await signUp(ctx.app)
    const response = await studentAgent.post(`/api/lessons/${lesson.id}/quiz/submissions`, { answers: answersFor(full, 2) })
    expect(response.body).toMatchObject({ score: 50, passed: false, xp_awarded: 0, lesson_completed: false })
    expect(bodyOf<SessionResponse>(await studentAgent.get("/api/auth/me")).user.total_xp).toBe(0)
    expect((await studentAgent.get("/api/me/progress/completed")).body).toEqual([])
  })

  it("rascunho: aluno não vê (404); prévia do dono não credita XP", async () => {
    const { teacher, lesson, full } = await setupQuiz({ published: false })
    const { agent: studentAgent } = await signUp(ctx.app)
    expect((await studentAgent.get(`/api/lessons/${lesson.id}/quiz`)).status).toBe(404)
    expect((await studentAgent.post(`/api/lessons/${lesson.id}/quiz/submissions`, { answers: answersFor(full, 4) })).status).toBe(404)

    const preview = await teacher.agent.post(`/api/lessons/${lesson.id}/quiz/submissions`, { answers: answersFor(full, 4) })
    expect(preview.body).toMatchObject({ passed: true, xp_awarded: 0, lesson_completed: false })
  })

  it("lição que não é quiz responde 422; quiz sem questões também", async () => {
    const coding = await createLesson(ctx.db, { lessonType: "coding" })
    const { agent: studentAgent } = await signUp(ctx.app)
    const response = await studentAgent.get(`/api/lessons/${coding.id}/quiz`)
    expect(response.status).toBe(422)
    expect(bodyOf<ApiErrorBody>(response).code).toBe("NOT_A_QUIZ")

    const emptyQuiz = await createLesson(ctx.db, { lessonType: "quiz" })
    const submission = await studentAgent.post(`/api/lessons/${emptyQuiz.id}/quiz/submissions`, { answers: {} })
    expect(submission.status).toBe(422)
  })

  it("publicar a lição de quiz funciona depois de cadastrar questões", async () => {
    const { teacher, lesson } = await setupQuiz({ published: false })
    const response = await teacher.agent.patch(`/api/lessons/${lesson.id}/publish`, { published: true })
    expect(response.status).toBe(200)
  })

  it("limita 10 envios por minuto", async () => {
    const { lesson, full } = await setupQuiz()
    const { agent: studentAgent }: { agent: Agent } = await signUp(ctx.app)
    const statuses: number[] = []
    for (let i = 0; i < 11; i++) {
      statuses.push((await studentAgent.post(`/api/lessons/${lesson.id}/quiz/submissions`, { answers: answersFor(full, 0) })).status)
    }
    expect(statuses.slice(0, 10).every((s) => s === 200)).toBe(true)
    expect(statuses[10]).toBe(429)
  })
})
