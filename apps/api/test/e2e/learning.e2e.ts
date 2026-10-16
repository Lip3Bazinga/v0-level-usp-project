import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { sql } from "drizzle-orm"
import { badges } from "@levelusp/db"
import type { TestCase } from "@levelusp/contracts"
import { createLesson, createTestApp, signUp, type TestContext } from "./harness"

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
    ctx.runner.respond((job) => job.probes.map((p) => ({ id: p.id, ok: true, value: p.id === "call:c1" ? 5 : 0, type: "int" })))

    const first = await agent.post(`/api/lessons/${lesson.id}/submissions`, { files })
    expect(first.status).toBe(200)
    expect(first.body).toMatchObject({ allPassed: true, lesson_completed: true, xp_awarded: 120, strength: "strong" })

    const second = await agent.post(`/api/lessons/${lesson.id}/submissions`, { files })
    expect(second.body).toMatchObject({ allPassed: true, xp_awarded: 0 })

    const me = await agent.get("/api/auth/me")
    expect(me.body.user).toMatchObject({ total_xp: 120, lessons_completed: 1 })
    const completed = await agent.get("/api/me/progress/completed")
    expect(completed.body).toEqual([lesson.id])
  })

  it("reprovação registra a submissão sem creditar XP", async () => {
    const lesson = await createLesson(ctx.db, { testCases: cases })
    const { agent } = await signUp(ctx.app)
    ctx.runner.respond((job) => job.probes.map((p) => ({ id: p.id, ok: true, value: 999 })))
    const res = await agent.post(`/api/lessons/${lesson.id}/submissions`, { files })
    expect(res.body).toMatchObject({ allPassed: false, xp_awarded: 0, lesson_completed: false })
    expect(res.body.failureDetails[0]).not.toContain("5")
    const subs = await ctx.db.execute(sql`select count(*)::int as n from submissions where passed = false`)
    expect((subs.rows[0] as { n: number }).n).toBe(1)
    expect((await agent.get("/api/auth/me")).body.user.total_xp).toBe(0)
  })

  it("concede badges ao atingir o critério", async () => {
    await ctx.db.insert(badges).values({ id: "primeira", name: "Primeira lição", criteriaType: "lessons_completed", criteriaValue: 1 })
    const lesson = await createLesson(ctx.db, { testCases: [cases[0]!] })
    const { agent } = await signUp(ctx.app)
    ctx.runner.respond((job) => job.probes.map((p) => ({ id: p.id, ok: true, value: 5 })))
    const res = await agent.post(`/api/lessons/${lesson.id}/submissions`, { files })
    expect(res.body.new_badges).toEqual([expect.objectContaining({ id: "primeira" })])
  })

  it("lição não publicada é invisível para alunos", async () => {
    const lesson = await createLesson(ctx.db, { testCases: cases, published: false })
    const { agent } = await signUp(ctx.app)
    const res = await agent.post(`/api/lessons/${lesson.id}/submissions`, { files })
    expect(res.status).toBe(404)
  })

  it("lição sem gabarito responde 422 em vez de aprovar", async () => {
    const lesson = await createLesson(ctx.db, { testCases: [] })
    const { agent } = await signUp(ctx.app)
    const res = await agent.post(`/api/lessons/${lesson.id}/submissions`, { files })
    expect(res.status).toBe(422)
  })

  it("recusa caminhos de arquivo perigosos", async () => {
    const lesson = await createLesson(ctx.db, { testCases: cases })
    const { agent } = await signUp(ctx.app)
    const res = await agent.post(`/api/lessons/${lesson.id}/submissions`, { files: [{ path: "../../etc/passwd.py", content: "" }] })
    expect(res.status).toBe(400)
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
    ctx.runner.respond((job) => job.probes.map((p) => ({ id: p.id, ok: true, value: p.id === "call:c1" ? 5 : 0 })))
    await agent.post(`/api/lessons/${lesson.id}/submissions`, { files })
    expect((await agent.put(`/api/lessons/${lesson.id}/snapshot`, { files: [{ path: "main.py", content: "# novo" }] })).status).toBe(204)
    const snap = await agent.get(`/api/lessons/${lesson.id}/snapshot`)
    expect(snap.body.files[0].content).toBe("# novo")
    const progress = await agent.get("/api/me/progress")
    expect(progress.body[0].status).toBe("completed")
  })

  it("lição teórica é concluída sem avaliação", async () => {
    const lesson = await createLesson(ctx.db, { lessonType: "theory", xpReward: 30 })
    const { agent } = await signUp(ctx.app)
    const res = await agent.post(`/api/lessons/${lesson.id}/complete`)
    expect(res.body).toMatchObject({ lesson_completed: true, xp_awarded: 30 })
    const coding = await createLesson(ctx.db, { testCases: cases })
    expect((await agent.post(`/api/lessons/${coding.id}/complete`)).status).toBe(400)
  })
})
