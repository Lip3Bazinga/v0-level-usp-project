import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { sql } from "drizzle-orm"
import { lessonSteps, type LessonStepRow } from "@levelusp/db"
import type { ApiErrorBody, SessionResponse, StepSubmitResult, TestCase } from "@levelusp/contracts"
import { bodyOf, countRows, createLesson, createTestApp, required, signUp, type SignedUpUser, type TestContext } from "../e2e/harness"

/*
 * Ataque "forjar progresso nos passos": o cliente tenta concluir um passo sem veredito,
 * pular a ordem, arrancar a solução ou o gabarito, e escrever no log do experimento em
 * nome de outra pessoa. Tudo o que vale XP precisa nascer de um veredito do servidor.
 */

const SECRET_SOLUTION = "SOLUCAO-SO-DO-PROFESSOR"
const SECRET_EXPECTED = 424242
const cases: TestCase[] = [{ id: "c1", kind: "call", function: "f", args: [], kwargs: {}, expected: SECRET_EXPECTED }]
const files = [{ path: "main.py", content: "def f():\n    return 0\n" }]
/** Campos que um cliente malicioso acrescenta esperando que o servidor os grave. */
const FORGED_FIELDS = { passed: true, allPassed: true, xp_awarded: 9999, step_completed: true, attempts: 99, solution_viewed: false, status: "completed", user_id: "00000000-0000-4000-8000-000000000001" }

describe("Passos sob ataque (forja de progresso, salto de ordem, vazamento de gabarito)", () => {
  let ctx: TestContext
  let student: SignedUpUser
  let lessonId: string
  let exercise: LessonStepRow
  let quiz: LessonStepRow

  beforeAll(async () => {
    ctx = await createTestApp()
  })
  afterAll(() => ctx.close())
  beforeEach(async () => {
    await ctx.reset()
    student = await signUp(ctx.app)
    const lesson = await createLesson(ctx.db, { lessonType: "guided", xpReward: 100, solutionAfterAttempts: 3 })
    lessonId = lesson.id
    const steps = await ctx.db
      .insert(lessonSteps)
      .values([
        { lessonId, order: 1, kind: "exercicio", title: "Exercício", xp: 20, testCases: cases, solutionFiles: [{ path: "main.py", content: SECRET_SOLUTION }], hints: ["uma dica"] },
        { lessonId, order: 2, kind: "quiz", title: "Quiz", xp: 20, quizQuestions: [{ prompt: "?", options: ["a", "b"], correct_index: 1, explanation: "porque sim" }] },
      ])
      .returning()
    exercise = required(steps[0], "exercício")
    quiz = required(steps[1], "quiz")
    // O "sandbox" devolve um valor errado: nenhuma verificação passa de verdade nestes testes.
    ctx.runner.respond((job) => job.probes.map((probe) => ({ id: probe.id, ok: true, value: 0, type: "int" })))
  })

  const url = (step: LessonStepRow, action: string): string => `/api/me/lessons/${lessonId}/steps/${step.id}/${action}`

  async function totalXp(): Promise<number> {
    return bodyOf<SessionResponse>(await student.agent.get("/api/auth/me")).user.total_xp
  }

  it("campos forjados no corpo do Verificar não aprovam nem dão XP", async () => {
    const response = await student.agent.post(url(exercise, "submit"), { files, ...FORGED_FIELDS })
    expect(response.status).toBe(200)
    expect(bodyOf<StepSubmitResult>(response)).toMatchObject({ passed: false, step_completed: false, xp_awarded: 0, attempts: 1, solution_available: false })
    expect(await totalXp()).toBe(0)
    expect(await countRows(ctx.db, sql`select count(*)::int as n from lesson_step_progress where status = 'completed'`)).toBe(0)
  })

  it("exercício não pode ser concluído pela rota de leitura nem pela de quiz", async () => {
    for (const [action, body] of [["complete", FORGED_FIELDS], ["quiz", { answers: [1], ...FORGED_FIELDS }]] as const) {
      const response = await student.agent.post(url(exercise, action), body)
      expect(response.status).toBe(400)
      expect(bodyOf<ApiErrorBody>(response).code).toBe("WRONG_STEP_KIND")
    }
    expect(await totalXp()).toBe(0)
  })

  it("não dá para pular o exercício e responder o quiz (nem concluir a lição pelas rotas clássicas)", async () => {
    expect((await student.agent.post(url(quiz, "quiz"), { answers: [1] })).status).toBe(409)
    expect((await student.agent.post(`/api/lessons/${lessonId}/complete`)).status).toBe(400)
    expect((await student.agent.post(`/api/lessons/${lessonId}/submissions`, { files })).status).toBe(400)
    expect((await student.agent.post(`/api/lessons/${lessonId}/quiz/submissions`, { answers: {} })).status).toBeGreaterThanOrEqual(400)
    expect(await totalXp()).toBe(0)
    expect(await countRows(ctx.db, sql`select count(*)::int as n from lesson_progress where status = 'completed'`)).toBe(0)
  })

  it("a solução não sai antes das tentativas, por nenhuma rota do aluno", async () => {
    const locked = await student.agent.post(url(exercise, "solution"), { attempts: 99, force: true })
    expect(locked.status).toBe(403)
    const leaks = [
      locked,
      await student.agent.get(`/api/lessons/${lessonId}`),
      await student.agent.get(`/api/me/lessons/${lessonId}/progress`),
      await student.agent.get(url(exercise, "hints")),
      await student.agent.post(url(exercise, "submit"), { files }),
      await student.agent.get(`/api/lessons/${lessonId}/authoring`),
    ]
    for (const response of leaks) {
      const serialized = JSON.stringify(response.body)
      expect(serialized).not.toContain(SECRET_SOLUTION)
      expect(serialized).not.toContain(String(SECRET_EXPECTED))
      expect(serialized).not.toContain("correct_index")
    }
  })

  it("dicas além das cadastradas não existem, e o contador não passa do total", async () => {
    expect((await student.agent.post(url(exercise, "hint"))).status).toBe(200)
    for (let extra = 0; extra < 3; extra++) expect((await student.agent.post(url(exercise, "hint"))).status).toBe(409)
    expect(await countRows(ctx.db, sql`select hints_revealed as n from lesson_step_progress where step_id = ${exercise.id}`)).toBe(1)
  })

  it("passo de lição não publicada é invisível para o aluno", async () => {
    const draft = await createLesson(ctx.db, { lessonType: "guided", published: false })
    const [draftStep] = await ctx.db.insert(lessonSteps).values({ lessonId: draft.id, order: 1, kind: "leitura", title: "Rascunho", xp: 50 }).returning()
    const stepId = required(draftStep, "passo do rascunho").id
    for (const action of ["complete", "hint", "solution"]) {
      expect((await student.agent.post(`/api/me/lessons/${draft.id}/steps/${stepId}/${action}`)).status).toBe(404)
    }
    expect((await student.agent.get(`/api/me/lessons/${draft.id}/progress`)).status).toBe(404)
    expect(await totalXp()).toBe(0)
  })

  it("sem o cabeçalho anti-CSRF nenhuma ação de passo é aceita", async () => {
    for (const action of ["submit", "hint", "solution", "complete", "quiz"]) {
      const response = await student.agent.raw.post(url(exercise, action)).send({ files })
      expect(response.status).toBe(403)
    }
    expect(await countRows(ctx.db, sql`select count(*)::int as n from lesson_step_progress`)).toBe(0)
  })

  it("o log do experimento é só de inserção e sempre em nome da sessão", async () => {
    const other = await signUp(ctx.app)
    await student.agent.post("/api/me/events", { events: [{ type: "lesson_viewed", payload: {}, user_id: other.id, id: 1 }] })
    expect(await countRows(ctx.db, sql`select count(*)::int as n from events where user_id = ${other.id} and type = 'lesson_viewed'`)).toBe(0)
    expect(await countRows(ctx.db, sql`select count(*)::int as n from events where user_id = ${student.id} and type = 'lesson_viewed'`)).toBe(1)
    // Tipos que o servidor decide (aprovação, certificado) também passam pela lista, mas não mudam progresso algum.
    await student.agent.post("/api/me/events", { events: [{ type: "lesson_completed", payload: { lesson_id: lessonId } }] })
    expect(await totalXp()).toBe(0)
    expect((await student.agent.put("/api/me/events", {})).status).toBe(404)
    expect((await student.agent.patch("/api/me/events", {})).status).toBe(404)
    expect((await student.agent.delete("/api/me/events")).status).toBe(404)
    // Payload gigante é recusado na validação.
    const huge = await student.agent.post("/api/me/events", { events: [{ type: "login", payload: { blob: "x".repeat(5000) } }] })
    expect(huge.status).toBe(400)
  })

  it("aluno não importa conteúdo, não cria trilha e não emite certificado de trilha inexistente", async () => {
    expect((await student.agent.post("/api/admin/content/import", { format: 2, courses: [] })).status).toBe(403)
    expect((await student.agent.post("/api/admin/tracks", { slug: "minha", title: "Minha trilha" })).status).toBe(403)
    expect((await student.agent.post("/api/me/tracks/00000000-0000-4000-8000-000000000000/certificate")).status).toBe(404)
    expect(await countRows(ctx.db, sql`select count(*)::int as n from track_certificates`)).toBe(0)
  })
})
