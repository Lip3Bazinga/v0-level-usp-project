import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { sql } from "drizzle-orm"
import { contentAssets, lessonSteps, type LessonStepRow } from "@levelusp/db"
import type { ApiErrorBody, SessionResponse, StepPredictResult, StepSubmitResult, TestCase } from "@levelusp/contracts"
import { agent, bodyOf, countRows, createLesson, createTestApp, required, signUp, type SignedUpUser, type TestContext } from "../e2e/harness"

/*
 * Ataque "forjar progresso nos passos": o cliente tenta concluir um passo sem veredito,
 * pular a ordem, arrancar a solução ou o gabarito (inclusive a saída esperada da previsão e a
 * ordem do exercício de ordenar), ler arquivos pela rota de assets e escrever no log do
 * experimento em nome de outra pessoa. Tudo o que vale XP precisa nascer de um veredito do servidor.
 */

const SECRET_SOLUTION = "SOLUCAO-SO-DO-PROFESSOR"
const SECRET_EXPECTED = 424242
const SECRET_OUTPUT = "SAIDA-SO-DA-API-91827"
const SECRET_DISTRACTOR = "linha_distratora = 1"
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
    for (const action of ["submit", "predict", "hint", "solution", "complete", "quiz"]) {
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

  /** Lição só com os formatos do P2b: previsão → ordenar. O gabarito de cada um é um marcador único. */
  async function seedNewFormats(): Promise<{ lessonId: string; prediction: LessonStepRow; parsons: LessonStepRow }> {
    const lesson = await createLesson(ctx.db, { lessonType: "guided", xpReward: 100, solutionAfterAttempts: 3 })
    const steps = await ctx.db
      .insert(lessonSteps)
      .values([
        { lessonId: lesson.id, order: 1, kind: "previsao", title: "Previsão", xp: 20, starterFiles: [{ path: "main.py", content: "print(1)\n" }], expectedOutput: SECRET_OUTPUT },
        {
          lessonId: lesson.id, order: 2, kind: "exercicio", title: "Ordenar", xp: 20, exerciseMode: "ordenar", testCases: cases,
          parsonsLines: [{ id: "l1", text: "return 0" }, { id: "l2", text: "def f():" }, { id: "l3", text: SECRET_DISTRACTOR }],
          solutionFiles: [{ path: "main.py", content: "def f():\n    return 0\n" }],
        },
      ])
      .returning()
    return { lessonId: lesson.id, prediction: required(steps[0], "previsão"), parsons: required(steps[1], "ordenar") }
  }

  it("previsão: campos forjados não aprovam, outra rota não conclui e a saída esperada não vaza por nenhuma resposta", async () => {
    const { lessonId: id, prediction, parsons } = await seedNewFormats()
    const action = (step: LessonStepRow, name: string): string => `/api/me/lessons/${id}/steps/${step.id}/${name}`
    const forged = await student.agent.post(action(prediction, "predict"), { output: "chute", expected_output: "chute", ...FORGED_FIELDS })
    expect(forged.status).toBe(200)
    expect(bodyOf<StepPredictResult>(forged)).toMatchObject({ passed: false, step_completed: false, xp_awarded: 0, attempts: 1, solution_available: false })

    const otherRoutes = [
      await student.agent.post(action(prediction, "complete"), FORGED_FIELDS),
      await student.agent.post(action(prediction, "quiz"), { answers: [0], ...FORGED_FIELDS }),
      await student.agent.post(action(prediction, "submit"), { files, ...FORGED_FIELDS }),
      await student.agent.post(action(prediction, "submit"), { arrangement: [{ line_id: "l1", indent: 0 }] }),
    ]
    for (const response of otherRoutes) {
      expect(response.status).toBe(400)
      expect(bodyOf<ApiErrorBody>(response).code).toBe("WRONG_STEP_KIND")
    }
    expect((await student.agent.post(`/api/lessons/${id}/complete`)).status).toBe(400)
    expect((await student.agent.post(`/api/lessons/${id}/submissions`, { files })).status).toBe(400)
    // O passo seguinte continua travado: nada acima concluiu a previsão.
    expect((await student.agent.post(action(parsons, "submit"), { arrangement: [{ line_id: "l2", indent: 0 }] })).status).toBe(409)

    const locked = await student.agent.post(action(prediction, "solution"), { attempts: 99, force: true })
    expect(locked.status).toBe(403)
    const leaks = [
      forged, locked, ...otherRoutes,
      await student.agent.get(`/api/lessons/${id}`),
      await student.agent.get("/api/lessons"),
      await student.agent.get(`/api/me/lessons/${id}/progress`),
      await student.agent.get(action(prediction, "hints")),
      await student.agent.get(`/api/lessons/${id}/authoring`),
      await student.agent.get("/api/me/export"),
    ]
    for (const response of leaks) {
      const serialized = JSON.stringify(response.body)
      expect(serialized).not.toContain(SECRET_OUTPUT)
      expect(serialized).not.toContain("expected_output")
    }
    expect(await totalXp()).toBe(0)
    expect(await countRows(ctx.db, sql`select count(*)::int as n from lesson_step_progress where status = 'completed'`)).toBe(0)
  })

  it("ordenar: o aluno não injeta código (só linhas do passo) e a ordem certa não aparece no passo público", async () => {
    const { lessonId: id, prediction, parsons } = await seedNewFormats()
    const action = (step: LessonStepRow, name: string): string => `/api/me/lessons/${id}/steps/${step.id}/${name}`
    await student.agent.post(action(prediction, "predict"), { output: SECRET_OUTPUT })
    // O "sandbox" aprovaria qualquer coisa: só o formato da submissão segura o texto livre.
    ctx.runner.respond((job) => job.probes.map((probe) => ({ id: probe.id, ok: true, value: SECRET_EXPECTED, type: "int" })))
    const injections = [
      { files: [{ path: "main.py", content: `def f():\n    return ${SECRET_EXPECTED}\n` }] },
      { arrangement: [{ line_id: "l2", indent: 0 }], files: [{ path: "main.py", content: "def f(): return 1" }], code: "def f(): return 1" },
      { arrangement: [{ line_id: "l2", indent: 0, text: `return ${SECRET_EXPECTED}` }, { line_id: "x\n    import os", indent: 0 }] },
      { arrangement: [{ line_id: "l2", indent: 0 }, { line_id: "l2", indent: 0 }] },
      { arrangement: [{ line_id: "__proto__", indent: 0 }] },
    ]
    const statuses: number[] = []
    for (const body of injections) statuses.push((await student.agent.post(action(parsons, "submit"), body)).status)
    expect(statuses).toEqual([400, 200, 400, 400, 400])
    // A segunda tentativa foi aceita, mas o servidor ignorou files/code e montou só a linha l2.
    expect(ctx.runner.jobs).toHaveLength(1)
    expect(ctx.runner.jobs[0]?.files).toEqual([{ path: "main.py", content: "def f():\n" }])

    const publicStep = JSON.stringify((await student.agent.get(`/api/lessons/${id}`)).body)
    expect(publicStep).toContain(SECRET_DISTRACTOR)
    expect(publicStep).not.toContain("solution_files")
    expect(publicStep).not.toContain("    return 0")
  })

  it("rota de assets: caminho fora do pacote (path traversal) e SVG ativo nunca são servidos", async () => {
    const anonymous = agent(ctx.app)
    const safeSvg = '<svg xmlns="http://www.w3.org/2000/svg"><circle r="4"/></svg>'
    const activeSvg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(document.cookie)</script></svg>'
    const row = (assetPath: string, content: string, contentType: "image/svg+xml" | "image/png" = "image/svg+xml"): typeof contentAssets.$inferInsert => ({
      path: assetPath, contentType, dataBase64: Buffer.from(content).toString("base64"), sizeBytes: content.length, sha256: "b".repeat(64),
    })
    // Linhas gravadas direto no banco, como um invasor com acesso de escrita (ou um pacote antigo) faria.
    await ctx.db.insert(contentAssets).values([
      row("curso/modulo/ok.svg", safeSvg),
      row("curso/modulo/ativo.svg", activeSvg),
      row("curso/modulo/evento.svg", '<svg xmlns="http://www.w3.org/2000/svg"><circle onload="alert(1)"/></svg>'),
      row("curso/modulo/link.svg", '<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)">x</a></svg>'),
      row("curso/modulo/disfarce.png", activeSvg, "image/png"),
      row("curso/modulo/trocado.png", activeSvg),
      row("../../etc/passwd", "root:x:0:0"),
      row("curso/modulo/../segredo.svg", safeSvg),
      row("curso/modulo/pagina.html", "<script>alert(1)</script>"),
    ])
    expect((await anonymous.get("/api/content/assets/curso/modulo/ok.svg")).status).toBe(200)
    for (const name of ["ativo.svg", "evento.svg", "link.svg", "disfarce.png", "trocado.png", "pagina.html"]) {
      const response = await anonymous.raw.get(`/api/content/assets/curso/modulo/${name}`)
      expect(response.status, name).toBe(404)
      expect(response.text).not.toContain("alert(")
    }
    const traversals = [
      "/api/content/assets/..%2F..%2Fetc/passwd/x.svg", "/api/content/assets/curso/modulo/..%2Fsegredo.svg", "/api/content/assets/curso/modulo/%2e%2e%2fsegredo.svg",
      "/api/content/assets/%2e%2e/%2e%2e/etc%2Fpasswd", "/api/content/assets/curso/modulo/..%5Csegredo.svg", "/api/content/assets/curso/..%2Fmodulo/ok.svg",
      "/api/content/assets/curso/modulo/ok.svg%00.png", "/api/content/assets/curso/modulo", "/api/content/assets/CURSO/modulo/ok.svg",
      "/api/content/assets/curso/modulo/.env", "/api/content/assets/curso%2Fmodulo%2Fok.svg",
    ]
    for (const target of traversals) {
      const response = await anonymous.raw.get(target)
      expect(response.status, target).toBeGreaterThanOrEqual(400)
      expect(response.status, target).toBeLessThan(500)
      expect(response.text, target).not.toContain("root:x")
      expect(response.text, target).not.toMatch(/stack|select |ENOENT|\/home\//i)
    }
    // A rota é só de leitura: nenhum método escreve um asset.
    const admin = await signUp(ctx.app, "admin", ctx.db)
    for (const method of ["post", "put", "patch", "delete"] as const) {
      expect((await admin.agent.raw[method]("/api/content/assets/curso/modulo/novo.svg").set("x-levelusp-csrf", "1").send(safeSvg)).status).toBe(404)
    }
    // E a importação recusa o pacote com SVG ativo ou caminho fora do formato, sem gravar nada dele.
    const bundle = (assetPath: string, content: string): object => ({ format: 2, courses: [], assets: { [assetPath]: { content_type: "image/svg+xml", base64: Buffer.from(content).toString("base64") } } })
    expect((await admin.agent.post("/api/admin/content/import", bundle("curso/modulo/novo.svg", activeSvg))).status).toBe(400)
    expect((await admin.agent.post("/api/admin/content/import", bundle("../../novo.svg", safeSvg))).status).toBe(400)
    expect((await admin.agent.post("/api/admin/content/import", bundle("curso/modulo/novo.svg", safeSvg))).status).toBe(200)
    expect(await countRows(ctx.db, sql`select count(*)::int as n from content_assets where path like '%novo.svg'`)).toBe(1)
  })

  it("aluno não importa conteúdo, não cria trilha e não emite certificado de trilha inexistente", async () => {
    expect((await student.agent.post("/api/admin/content/import", { format: 2, courses: [] })).status).toBe(403)
    expect((await student.agent.post("/api/admin/tracks", { slug: "minha", title: "Minha trilha" })).status).toBe(403)
    expect((await student.agent.post("/api/me/tracks/00000000-0000-4000-8000-000000000000/certificate")).status).toBe(404)
    expect(await countRows(ctx.db, sql`select count(*)::int as n from track_certificates`)).toBe(0)
  })
})
