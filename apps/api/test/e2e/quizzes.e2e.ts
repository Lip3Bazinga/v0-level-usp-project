import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import type { QuizQuestionFull } from "@levelusp/contracts"
import { agent, createLesson, createTestApp, signUp, type Agent, type TestContext } from "./harness"

const questions = [
  { prompt: "Qual função mostra texto na tela?", options: ["input", "print", "len"], correct_index: 1, explanation: "print escreve na saída." },
  { prompt: "Qual tipo é imutável?", options: ["list", "dict", "tuple"], correct_index: 2, explanation: "Tuplas são imutáveis." },
  { prompt: "Quanto é 2 ** 3?", options: ["6", "8", "9"], correct_index: 1, explanation: "Potência: 2³ = 8." },
  { prompt: "Qual palavra define função?", options: ["def", "fun", "func"], correct_index: 0, explanation: "Usa-se def." },
]

describe("Quiz de lição (e2e)", () => {
  let ctx: TestContext
  beforeAll(async () => {
    ctx = await createTestApp()
  })
  afterAll(() => ctx.close())
  beforeEach(() => ctx.reset())

  /** Professor dono + lição de quiz publicada (70%) com as 4 questões. */
  async function setupQuiz(opts: { published?: boolean; xpReward?: number } = {}) {
    const prof = await signUp(ctx.app, "teacher", ctx.db)
    const lesson = await createLesson(ctx.db, {
      createdBy: prof.id,
      lessonType: "quiz",
      quizPassingScore: 70,
      xpReward: opts.xpReward ?? 40,
      published: opts.published ?? true,
    })
    const put = await prof.agent.put(`/api/lessons/${lesson.id}/quiz`, { questions })
    expect(put.status).toBe(200)
    return { prof, lesson, full: put.body as QuizQuestionFull[] }
  }

  const answersFor = (full: QuizQuestionFull[], correct: number) =>
    Object.fromEntries(full.map((q, i) => [q.id, i < correct ? q.correct_index : (q.correct_index + 1) % q.options.length]))

  it("aluno recebe as questões sem gabarito nem explicação", async () => {
    const { lesson } = await setupQuiz()
    const { agent: aluno } = await signUp(ctx.app)
    const res = await aluno.get(`/api/lessons/${lesson.id}/quiz`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(4)
    for (const q of res.body) expect(Object.keys(q).sort()).toEqual(["id", "options", "prompt"])
    expect(JSON.stringify(res.body)).not.toContain("correct_index")
    expect(JSON.stringify(res.body)).not.toContain("imutáveis")
    expect((await agent(ctx.app).get(`/api/lessons/${lesson.id}/quiz`)).status).toBe(401)
  })

  it("gabarito só para o professor dono (ou admin)", async () => {
    const { prof, lesson } = await setupQuiz()
    const own = await prof.agent.get(`/api/lessons/${lesson.id}/quiz/authoring`)
    expect(own.status).toBe(200)
    expect(own.body.map((q: QuizQuestionFull) => q.correct_index)).toEqual([1, 2, 1, 0])

    const outro = await signUp(ctx.app, "teacher", ctx.db)
    expect((await outro.agent.get(`/api/lessons/${lesson.id}/quiz/authoring`)).status).toBe(403)
    expect((await outro.agent.put(`/api/lessons/${lesson.id}/quiz`, { questions })).status).toBe(403)
    const { agent: aluno } = await signUp(ctx.app)
    expect((await aluno.get(`/api/lessons/${lesson.id}/quiz/authoring`)).status).toBe(403)
    const admin = await signUp(ctx.app, "admin", ctx.db)
    expect((await admin.agent.get(`/api/lessons/${lesson.id}/quiz/authoring`)).status).toBe(200)
  })

  it("PUT substitui todas as questões, com sort_order pela posição", async () => {
    const { prof, lesson, full } = await setupQuiz()
    expect(full.map((q) => q.sort_order)).toEqual([0, 1, 2, 3])
    const res = await prof.agent.put(`/api/lessons/${lesson.id}/quiz`, { questions: [questions[3], questions[0]] })
    expect(res.status).toBe(200)
    expect(res.body.map((q: QuizQuestionFull) => [q.prompt, q.sort_order])).toEqual([
      [questions[3]!.prompt, 0],
      [questions[0]!.prompt, 1],
    ])
    const after = await prof.agent.get(`/api/lessons/${lesson.id}/quiz/authoring`)
    expect(after.body).toHaveLength(2)
    expect(after.body.some((q: QuizQuestionFull) => full.some((old) => old.id === q.id))).toBe(false)
  })

  it("recusa gabarito fora das opções e esvaziar um quiz publicado", async () => {
    const { prof, lesson } = await setupQuiz()
    const bad = await prof.agent.put(`/api/lessons/${lesson.id}/quiz`, { questions: [{ ...questions[0], correct_index: 5 }] })
    expect(bad.status).toBe(400)
    const empty = await prof.agent.put(`/api/lessons/${lesson.id}/quiz`, { questions: [] })
    expect(empty.status).toBe(422)
    expect(empty.body.code).toBe("NO_QUESTIONS")
  })

  it("aprovação corrige no servidor e credita XP uma única vez", async () => {
    const { lesson, full } = await setupQuiz({ xpReward: 40 })
    const { agent: aluno } = await signUp(ctx.app)

    const first = await aluno.post(`/api/lessons/${lesson.id}/quiz/submissions`, { answers: answersFor(full, 3) })
    expect(first.status).toBe(200)
    expect(first.body).toMatchObject({ score: 75, passed: true, passingScore: 70, correctCount: 3, total: 4, xp_awarded: 40, lesson_completed: true })
    expect(first.body.review).toHaveLength(4)
    expect(first.body.review[0]).toEqual({ questionId: full[0]!.id, correct: true, explanation: "print escreve na saída." })
    expect(first.body.review[3].correct).toBe(false)

    const second = await aluno.post(`/api/lessons/${lesson.id}/quiz/submissions`, { answers: answersFor(full, 4) })
    expect(second.body).toMatchObject({ score: 100, passed: true, xp_awarded: 0 })

    const me = await aluno.get("/api/auth/me")
    expect(me.body.user).toMatchObject({ total_xp: 40, lessons_completed: 1 })
    const progress = await aluno.get("/api/me/progress")
    expect(progress.body[0]).toMatchObject({ lesson_id: lesson.id, status: "completed", score: 75 })
  })

  it("reprovação não credita XP nem conclui a lição", async () => {
    const { lesson, full } = await setupQuiz()
    const { agent: aluno } = await signUp(ctx.app)
    const res = await aluno.post(`/api/lessons/${lesson.id}/quiz/submissions`, { answers: answersFor(full, 2) })
    expect(res.body).toMatchObject({ score: 50, passed: false, xp_awarded: 0, lesson_completed: false })
    expect((await aluno.get("/api/auth/me")).body.user.total_xp).toBe(0)
    expect((await aluno.get("/api/me/progress/completed")).body).toEqual([])
  })

  it("rascunho: aluno não vê (404); prévia do dono não credita XP", async () => {
    const { prof, lesson, full } = await setupQuiz({ published: false })
    const { agent: aluno } = await signUp(ctx.app)
    expect((await aluno.get(`/api/lessons/${lesson.id}/quiz`)).status).toBe(404)
    expect((await aluno.post(`/api/lessons/${lesson.id}/quiz/submissions`, { answers: answersFor(full, 4) })).status).toBe(404)

    const preview = await prof.agent.post(`/api/lessons/${lesson.id}/quiz/submissions`, { answers: answersFor(full, 4) })
    expect(preview.body).toMatchObject({ passed: true, xp_awarded: 0, lesson_completed: false })
  })

  it("lição que não é quiz responde 422; quiz sem questões também", async () => {
    const coding = await createLesson(ctx.db, { lessonType: "coding" })
    const { agent: aluno } = await signUp(ctx.app)
    const res = await aluno.get(`/api/lessons/${coding.id}/quiz`)
    expect(res.status).toBe(422)
    expect(res.body.code).toBe("NOT_A_QUIZ")

    const vazio = await createLesson(ctx.db, { lessonType: "quiz" })
    const sub = await aluno.post(`/api/lessons/${vazio.id}/quiz/submissions`, { answers: {} })
    expect(sub.status).toBe(422)
  })

  it("publicar a lição de quiz funciona depois de cadastrar questões", async () => {
    const { prof, lesson } = await setupQuiz({ published: false })
    const res = await prof.agent.patch(`/api/lessons/${lesson.id}/publish`, { published: true })
    expect(res.status).toBe(200)
  })

  it("limita 10 envios por minuto", async () => {
    const { lesson, full } = await setupQuiz()
    const { agent: aluno }: { agent: Agent } = await signUp(ctx.app)
    const statuses: number[] = []
    for (let i = 0; i < 11; i++) {
      statuses.push((await aluno.post(`/api/lessons/${lesson.id}/quiz/submissions`, { answers: answersFor(full, 0) })).status)
    }
    expect(statuses.slice(0, 10).every((s) => s === 200)).toBe(true)
    expect(statuses[10]).toBe(429)
  })
})
