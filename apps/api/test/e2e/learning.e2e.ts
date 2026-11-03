import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { sql } from "drizzle-orm"
import { badges } from "@levelusp/db"
import type { LessonCompletion, LessonProgress, LessonSnapshot, SessionResponse, SubmissionResult, TestCase } from "@levelusp/contracts"
import { bodyOf, countRows, createLesson, createTestApp, signUp, type TestContext } from "./harness"

const files = [{ path: "main.py", content: "def soma(a, b):\n    return a + b\n" }]
const cases: TestCase[] = [
  { id: "c1", kind: "call", function: "soma", args: [2, 3], kwargs: {}, expected: 5 },
  { id: "c2", kind: "call", function: "soma", args: [-1, 1], kwargs: {}, expected: 0 },
]

describe("Correção e progresso (e2e)", () => {
  let ctx: TestContext
  beforeAll(async () => {
    ctx = await createTestApp()
  })
  afterAll(() => ctx.close())
  beforeEach(() => ctx.reset())

  it("o executor recebe as entradas, mas nunca os valores esperados", async () => {
    const lesson = await createLesson(ctx.db, { testCases: cases })
    const { agent } = await signUp(ctx.app)
    await agent.post(`/api/lessons/${lesson.id}/submissions`, { files })
    const sent = JSON.stringify(ctx.runner.jobs[0])
    expect(sent).toContain("soma")
    expect(sent).not.toContain("expected")
  })

  it("aprovação conclui a lição e credita XP uma única vez", async () => {
    const lesson = await createLesson(ctx.db, { testCases: cases, xpReward: 120 })
    const { agent } = await signUp(ctx.app)
    ctx.runner.respond((job) => job.probes.map((probe) => ({ id: probe.id, ok: true, value: probe.id === "call:c1" ? 5 : 0, type: "int" })))

    const first = await agent.post(`/api/lessons/${lesson.id}/submissions`, { files })
    expect(first.status).toBe(200)
    expect(first.body).toMatchObject({ allPassed: true, lesson_completed: true, xp_awarded: 120, strength: "strong" })

    const second = await agent.post(`/api/lessons/${lesson.id}/submissions`, { files })
    expect(second.body).toMatchObject({ allPassed: true, xp_awarded: 0 })

    const me = await agent.get("/api/auth/me")
    expect(bodyOf<SessionResponse>(me).user).toMatchObject({ total_xp: 120, lessons_completed: 1 })
    const completed = await agent.get("/api/me/progress/completed")
    expect(completed.body).toEqual([lesson.id])
  })

  it("reprovação registra a submissão sem creditar XP", async () => {
    const lesson = await createLesson(ctx.db, { testCases: cases })
    const { agent } = await signUp(ctx.app)
    ctx.runner.respond((job) => job.probes.map((probe) => ({ id: probe.id, ok: true, value: 999 })))
    const response = await agent.post(`/api/lessons/${lesson.id}/submissions`, { files })
    expect(response.body).toMatchObject({ allPassed: false, xp_awarded: 0, lesson_completed: false })
    expect(bodyOf<SubmissionResult>(response).failureDetails[0]).not.toContain("5")
    expect(await countRows(ctx.db, sql`select count(*)::int as n from submissions where passed = false`)).toBe(1)
    expect(bodyOf<SessionResponse>(await agent.get("/api/auth/me")).user.total_xp).toBe(0)
  })

  it("concede badges ao atingir o critério", async () => {
    await ctx.db.insert(badges).values({ id: "primeira", name: "Primeira lição", criteriaType: "lessons_completed", criteriaValue: 1 })
    const lesson = await createLesson(ctx.db, { testCases: cases.slice(0, 1) })
    const { agent } = await signUp(ctx.app)
    ctx.runner.respond((job) => job.probes.map((probe) => ({ id: probe.id, ok: true, value: 5 })))
    const response = await agent.post(`/api/lessons/${lesson.id}/submissions`, { files })
    expect(bodyOf<SubmissionResult>(response).new_badges).toEqual([expect.objectContaining({ id: "primeira" })])
  })

  it("lição não publicada é invisível para alunos", async () => {
    const lesson = await createLesson(ctx.db, { testCases: cases, published: false })
    const { agent } = await signUp(ctx.app)
    const response = await agent.post(`/api/lessons/${lesson.id}/submissions`, { files })
    expect(response.status).toBe(404)
  })

  it("lição sem gabarito responde 422 em vez de aprovar", async () => {
    const lesson = await createLesson(ctx.db, { testCases: [] })
    const { agent } = await signUp(ctx.app)
    const response = await agent.post(`/api/lessons/${lesson.id}/submissions`, { files })
    expect(response.status).toBe(422)
  })

  it("recusa caminhos de arquivo perigosos", async () => {
    const lesson = await createLesson(ctx.db, { testCases: cases })
    const { agent } = await signUp(ctx.app)
    const response = await agent.post(`/api/lessons/${lesson.id}/submissions`, { files: [{ path: "../../etc/passwd.py", content: "" }] })
    expect(response.status).toBe(400)
  })

  it("limita 12 verificações por minuto", async () => {
    const lesson = await createLesson(ctx.db, { testCases: cases })
    const { agent } = await signUp(ctx.app)
    const statuses: number[] = []
    for (let i = 0; i < 13; i++) statuses.push((await agent.post(`/api/lessons/${lesson.id}/submissions`, { files })).status)
    expect(statuses.slice(0, 12).every((s) => s === 200)).toBe(true)
    expect(statuses[12]).toBe(429)
  })

  it("salva e recupera o código do aluno sem rebaixar lição concluída", async () => {
    const lesson = await createLesson(ctx.db, { testCases: cases })
    const { agent } = await signUp(ctx.app)
    ctx.runner.respond((job) => job.probes.map((probe) => ({ id: probe.id, ok: true, value: probe.id === "call:c1" ? 5 : 0 })))
    await agent.post(`/api/lessons/${lesson.id}/submissions`, { files })
    expect((await agent.put(`/api/lessons/${lesson.id}/snapshot`, { files: [{ path: "main.py", content: "# novo" }] })).status).toBe(204)
    const snapshot = await agent.get(`/api/lessons/${lesson.id}/snapshot`)
    expect(bodyOf<LessonSnapshot>(snapshot).files?.[0]?.content).toBe("# novo")
    const progress = await agent.get("/api/me/progress")
    expect(bodyOf<LessonProgress[]>(progress)[0]?.status).toBe("completed")
  })

  it("lição teórica é concluída sem avaliação", async () => {
    const lesson = await createLesson(ctx.db, { lessonType: "theory", xpReward: 30 })
    const { agent } = await signUp(ctx.app)
    const response = await agent.post(`/api/lessons/${lesson.id}/complete`)
    expect(response.body).toMatchObject({ lesson_completed: true, xp_awarded: 30 })
    const coding = await createLesson(ctx.db, { testCases: cases })
    expect((await agent.post(`/api/lessons/${coding.id}/complete`)).status).toBe(400)
  })

  it("conclusões simultâneas creditam XP uma única vez (sem corrida)", async () => {
    const lesson = await createLesson(ctx.db, { lessonType: "theory", xpReward: 100 })
    const { agent } = await signUp(ctx.app)
    const results = await Promise.all(Array.from({ length: 10 }, () => agent.post(`/api/lessons/${lesson.id}/complete`)))
    expect(results.every((r) => r.status === 200)).toBe(true)
    expect(results.filter((result) => bodyOf<LessonCompletion>(result).xp_awarded === 100)).toHaveLength(1)
    const me = await agent.get("/api/auth/me")
    expect(bodyOf<SessionResponse>(me).user).toMatchObject({ total_xp: 100, lessons_completed: 1 })
  })
})
