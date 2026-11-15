import path from "node:path"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { eq, sql } from "drizzle-orm"
import { contentAssets, lessonSteps, lessons, type LessonStepRow } from "@levelusp/db"
import type {
  ApiErrorBody, ContentImportSummary, Lesson, LessonStepsProgress, LessonWithTests, SessionResponse, SolutionReveal, StepPredictResult, StepSubmitResult, TestCase,
} from "@levelusp/contracts"
import { validateBundle } from "../../scripts/content/bundle"
import { compileContent } from "../../scripts/content/compiler"
import { agent, bodyOf, countRows, createLesson, createTestApp, required, signUp, type SignedUpUser, type TestContext } from "./harness"

/** Marcadores que só existem no gabarito: se aparecerem numa resposta ao aluno, vazaram. */
const SECRET_OUTPUT = "7\n16\nSAIDA_SECRETA_DA_PREVISAO"
const SECRET_OUTPUT_MARK = "SAIDA_SECRETA_DA_PREVISAO"
const PARSONS_SOLUTION = "def dobro(n):\n    resultado = 2 * n\n    return resultado\n"
const PARSONS_LINES = [
  { id: "l1", text: "return resultado" },
  { id: "l2", text: "def dobro(n):" },
  { id: "l3", text: "return n" },
  { id: "l4", text: "resultado = 2 * n" },
]
const SOLUTION_ARRANGEMENT = [{ line_id: "l2", indent: 0 }, { line_id: "l4", indent: 1 }, { line_id: "l1", indent: 1 }]
const cases: TestCase[] = [{ id: "c1", kind: "call", function: "dobro", args: [4], kwargs: {}, expected: 424_242 }]
const PREDICTION_XP = 20
const SAFE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>'
const ASSET_PATH = "curso-p2b/modulo-p2b/desenho.svg"
const ASSET_URL = `/api/content/assets/${ASSET_PATH}`

const base64 = (text: string): string => Buffer.from(text).toString("base64")

function bundleWith(assets: Record<string, { content_type: string; base64: string }>): object {
  const reading = { order: 1, kind: "leitura", title: "Leia", narrative_markdown: `![Desenho](${ASSET_URL})` }
  const prediction = { order: 2, kind: "previsao", title: "Preveja", starter_files: [{ path: "main.py", content: "print(7)\n" }], expected_output: SECRET_OUTPUT }
  const parsons = { order: 3, kind: "exercicio", title: "Ordene", exercise_mode: "ordenar", solution_files: [{ path: "main.py", content: PARSONS_SOLUTION }], parsons_lines: PARSONS_LINES, test_cases: cases }
  const lesson = { slug: "licao-p2b", title: "Lição P2b", lesson_type: "guided", steps: [reading, prediction, parsons] }
  return { format: 2, courses: [{ slug: "curso-p2b", title: "Curso P2b", published: true, modules: [{ slug: "modulo-p2b", title: "Módulo", lessons: [lesson] }] }], assets }
}

describe("P2b: previsão, ordenar, lacunas e assets do conteúdo (e2e)", () => {
  let ctx: TestContext
  let student: SignedUpUser
  let lessonId: string
  let prediction: LessonStepRow
  let parsons: LessonStepRow
  let blanks: LessonStepRow

  beforeAll(async () => {
    ctx = await createTestApp()
  })
  afterAll(() => ctx.close())
  beforeEach(async () => {
    await ctx.reset()
    student = await signUp(ctx.app)
    const lesson = await createLesson(ctx.db, { title: "Recursos novos", lessonType: "guided", xpReward: 0, solutionAfterAttempts: 3 })
    lessonId = lesson.id
    const steps = await ctx.db
      .insert(lessonSteps)
      .values([
        { lessonId, order: 1, kind: "previsao", title: "Preveja", xp: PREDICTION_XP, starterFiles: [{ path: "main.py", content: "print(7)\n" }], expectedOutput: SECRET_OUTPUT, hints: ["uma dica"] },
        { lessonId, order: 2, kind: "exercicio", title: "Ordene", xp: 10, exerciseMode: "ordenar", parsonsLines: PARSONS_LINES, solutionFiles: [{ path: "main.py", content: PARSONS_SOLUTION }], testCases: cases },
        { lessonId, order: 3, kind: "exercicio", title: "Complete", xp: 10, exerciseMode: "lacunas", starterFiles: [{ path: "main.py", content: "def dobro(n):\n    return ___ * n\n" }], solutionFiles: [{ path: "main.py", content: "def dobro(n):\n    return 2 * n\n" }], testCases: cases },
      ])
      .returning()
    prediction = required(steps[0], "previsão")
    parsons = required(steps[1], "ordenar")
    blanks = required(steps[2], "lacunas")
    ctx.runner.respond((job) => job.probes.map((probe) => ({ id: probe.id, ok: true, value: 0, type: "int" })))
  })

  const url = (step: LessonStepRow, action: string): string => `/api/me/lessons/${lessonId}/steps/${step.id}/${action}`
  const passSubmissions = (): void => ctx.runner.respond((job) => job.probes.map((probe) => ({ id: probe.id, ok: true, value: 424_242, type: "int" })))

  async function totalXp(): Promise<number> {
    return bodyOf<SessionResponse>(await student.agent.get("/api/auth/me")).user.total_xp
  }

  it("GET /lessons/:id traz exercise_mode e as linhas embaralhadas, sem saída esperada, solução nem ordem certa", async () => {
    const response = await agent(ctx.app).get(`/api/lessons/${lessonId}`)
    expect(response.status).toBe(200)
    const steps = bodyOf<Lesson>(response).steps
    expect(steps.map((step) => [step.kind, step.exercise_mode, step.parsons_lines.length])).toEqual([["previsao", "codigo", 0], ["exercicio", "ordenar", 4], ["exercicio", "lacunas", 0]])
    expect(steps[0]?.starter_files).toEqual([{ path: "main.py", content: "print(7)\n" }])
    expect(steps[1]?.parsons_lines).toEqual(PARSONS_LINES)
    expect(steps[1]?.starter_files).toEqual([])
    expect(steps[2]?.starter_files[0]?.content).toContain("___")
    const serialized = JSON.stringify(response.body)
    for (const leak of ["expected_output", SECRET_OUTPUT_MARK, "solution_files", "test_cases", "424242", "    resultado = 2 * n", "return 2 * n"]) expect(serialized).not.toContain(leak)
  })

  it("previsão: erro soma tentativa sem revelar nada; acerto ignora espaços no fim e conclui com XP", async () => {
    const wrong = await student.agent.post(url(prediction, "predict"), { output: "7\n16\noutra coisa" })
    expect(wrong.status).toBe(200)
    expect(bodyOf<StepPredictResult>(wrong)).toEqual({
      step_id: prediction.id, passed: false, attempts: 1, solution_available: false,
      step_completed: false, xp_awarded: 0, lesson_completed: false, granted_badges: [], level_up: false, new_level: 0,
    })
    expect(JSON.stringify(wrong.body)).not.toContain(SECRET_OUTPUT_MARK)
    // Maiúsculas/minúsculas e linha a menos continuam erradas.
    expect(bodyOf<StepPredictResult>(await student.agent.post(url(prediction, "predict"), { output: SECRET_OUTPUT.toLowerCase() })).passed).toBe(false)
    expect(bodyOf<StepPredictResult>(await student.agent.post(url(prediction, "predict"), { output: "7\n16" })).passed).toBe(false)
    expect(await totalXp()).toBe(0)

    const right = bodyOf<StepPredictResult>(await student.agent.post(url(prediction, "predict"), { output: `7  \r\n16\t\r\n${SECRET_OUTPUT_MARK}\n\n  \n` }))
    expect(right).toMatchObject({ passed: true, step_completed: true, xp_awarded: PREDICTION_XP, attempts: 3 })
    expect(await totalXp()).toBe(PREDICTION_XP)
    // Reenviar um passo concluído não credita de novo.
    expect(bodyOf<StepPredictResult>(await student.agent.post(url(prediction, "predict"), { output: SECRET_OUTPUT }))).toMatchObject({ passed: true, xp_awarded: 0 })
    expect(await totalXp()).toBe(PREDICTION_XP)
    // A previsão não roda código nem grava submissão; o evento do experimento registra cada envio.
    expect(ctx.runner.jobs).toHaveLength(0)
    expect(await countRows(ctx.db, sql`select count(*)::int as n from submissions`)).toBe(0)
    expect(await countRows(ctx.db, sql`select count(*)::int as n from events where type = 'step_submitted' and payload->>'kind' = 'previsao'`)).toBe(5)
    expect(await countRows(ctx.db, sql`select count(*)::int as n from events where type = 'step_completed'`)).toBe(1)
  })

  it("previsão: a saída esperada só sai por Ver solução depois das tentativas, não conclui o passo e vale metade do XP", async () => {
    const early = await student.agent.post(url(prediction, "solution"))
    expect(early.status).toBe(403)
    expect(bodyOf<ApiErrorBody>(early).code).toBe("SOLUTION_LOCKED")
    expect(JSON.stringify(early.body)).not.toContain(SECRET_OUTPUT_MARK)
    for (let attempt = 1; attempt <= 3; attempt++) {
      const failed = bodyOf<StepPredictResult>(await student.agent.post(url(prediction, "predict"), { output: "errado" }))
      expect(failed).toMatchObject({ passed: false, attempts: attempt, solution_available: attempt >= 3 })
    }
    const revealed = await student.agent.post(url(prediction, "solution"))
    expect(revealed.status).toBe(200)
    expect(bodyOf<SolutionReveal>(revealed)).toEqual({ files: [], expected_output: SECRET_OUTPUT })
    const progress = bodyOf<LessonStepsProgress>(await student.agent.get(`/api/me/lessons/${lessonId}/progress`))
    expect(progress.steps).toEqual([expect.objectContaining({ step_id: prediction.id, status: "in_progress", solution_viewed: true, attempts: 3, xp_awarded: 0 })])
    expect(await totalXp()).toBe(0)

    const sent = bodyOf<StepPredictResult>(await student.agent.post(url(prediction, "predict"), { output: SECRET_OUTPUT }))
    expect(sent).toMatchObject({ passed: true, step_completed: true, xp_awarded: PREDICTION_XP / 2 })
    expect(await totalXp()).toBe(PREDICTION_XP / 2)
    expect(await countRows(ctx.db, sql`select count(*)::int as n from events where type = 'solution_viewed'`)).toBe(1)
  })

  it("previsão: cada tipo de passo só aceita a própria rota, a ordem vale e o corpo é validado", async () => {
    expect(bodyOf<ApiErrorBody>(await student.agent.post(url(parsons, "submit"), { arrangement: SOLUTION_ARRANGEMENT })).code).toBe("STEP_LOCKED")
    for (const [action, body] of [["submit", { files: [{ path: "main.py", content: "print(7)" }] }], ["complete", {}], ["quiz", { answers: [0] }]] as const) {
      const response = await student.agent.post(url(prediction, action), body)
      expect(response.status).toBe(400)
      expect(bodyOf<ApiErrorBody>(response).code).toBe("WRONG_STEP_KIND")
    }
    expect((await student.agent.post(url(prediction, "predict"), {})).status).toBe(400)
    expect((await student.agent.post(url(prediction, "predict"), { output: 7 })).status).toBe(400)
    expect((await student.agent.post(url(prediction, "predict"), { output: "x".repeat(10_001) })).status).toBe(400)
    await student.agent.post(url(prediction, "predict"), { output: SECRET_OUTPUT })
    const onExercise = await student.agent.post(url(parsons, "predict"), { output: "x" })
    expect(onExercise.status).toBe(400)
    expect(bodyOf<ApiErrorBody>(onExercise).code).toBe("WRONG_STEP_KIND")
    expect((await agent(ctx.app).post(url(prediction, "predict"), { output: "x" })).status).toBe(401)
  })

  it("previsão: o limite por minuto devolve 429 antes de qualquer comparação", async () => {
    const statuses: number[] = []
    for (let attempt = 0; attempt < 14; attempt++) statuses.push((await student.agent.post(url(prediction, "predict"), { output: "errado" })).status)
    expect(statuses.filter((status) => status === 200)).toHaveLength(12)
    expect(statuses.slice(12)).toEqual([429, 429])
  })

  it("ordenar: o servidor monta o main.py com as linhas do passo e corrige pelos casos", async () => {
    await student.agent.post(url(prediction, "predict"), { output: SECRET_OUTPUT })
    const shuffled = await student.agent.post(url(parsons, "submit"), { arrangement: PARSONS_LINES.map((line) => ({ line_id: line.id, indent: 0 })) })
    expect(bodyOf<StepSubmitResult>(shuffled)).toMatchObject({ passed: false, attempts: 1, step_completed: false })
    expect(ctx.runner.jobs.at(-1)?.files).toEqual([{ path: "main.py", content: "return resultado\ndef dobro(n):\nreturn n\nresultado = 2 * n\n" }])

    passSubmissions()
    const solved = await student.agent.post(url(parsons, "submit"), { arrangement: SOLUTION_ARRANGEMENT })
    expect(bodyOf<StepSubmitResult>(solved)).toMatchObject({ passed: true, step_completed: true, xp_awarded: 10 })
    expect(ctx.runner.jobs.at(-1)?.files).toEqual([{ path: "main.py", content: PARSONS_SOLUTION }])
    expect(JSON.stringify(solved.body)).not.toContain("424242")
    expect(await countRows(ctx.db, sql`select count(*)::int as n from submissions where step_id = ${parsons.id}`)).toBe(2)
  })

  it("ordenar: texto livre, linha inexistente ou repetida e indentação fora da faixa são recusados sem rodar nada", async () => {
    await student.agent.post(url(prediction, "predict"), { output: SECRET_OUTPUT })
    passSubmissions()
    const freeText = await student.agent.post(url(parsons, "submit"), { files: [{ path: "main.py", content: PARSONS_SOLUTION }] })
    expect(freeText.status).toBe(400)
    expect(bodyOf<ApiErrorBody>(freeText).code).toBe("WRONG_SUBMISSION_FORMAT")
    for (const arrangement of [[{ line_id: "l9", indent: 0 }], [{ line_id: "l1", indent: 0 }, { line_id: "l1", indent: 1 }]]) {
      const response = await student.agent.post(url(parsons, "submit"), { arrangement })
      expect(response.status).toBe(400)
      expect(bodyOf<ApiErrorBody>(response).code).toBe("INVALID_ARRANGEMENT")
    }
    expect((await student.agent.post(url(parsons, "submit"), { arrangement: [{ line_id: "l1", indent: 99 }] })).status).toBe(400)
    expect((await student.agent.post(url(parsons, "submit"), { arrangement: [] })).status).toBe(400)
    expect((await student.agent.post(url(parsons, "submit"), {})).status).toBe(400)
    expect(ctx.runner.jobs).toHaveLength(0)
    expect(await totalXp()).toBe(PREDICTION_XP)

    // Exercício de lacunas é corrigido pelo código enviado; uma lista de linhas não serve.
    await student.agent.post(url(parsons, "submit"), { arrangement: SOLUTION_ARRANGEMENT })
    const wrongFormat = await student.agent.post(url(blanks, "submit"), { arrangement: SOLUTION_ARRANGEMENT })
    expect(bodyOf<ApiErrorBody>(wrongFormat).code).toBe("WRONG_SUBMISSION_FORMAT")
    const filled = await student.agent.post(url(blanks, "submit"), { files: [{ path: "main.py", content: "def dobro(n):\n    return 2 * n\n" }] })
    expect(bodyOf<StepSubmitResult>(filled)).toMatchObject({ passed: true, step_completed: true, lesson_completed: true })
  })

  it("professor grava previsão e ordenar pela API: o gabarito fica na autoria e a validação recusa passo incoerente", async () => {
    const teacher = await signUp(ctx.app, "teacher", ctx.db)
    const steps = [
      { order: 1, kind: "previsao", title: "Preveja", starter_files: [{ path: "main.py", content: "print(7)\n" }], expected_output: SECRET_OUTPUT },
      { order: 2, kind: "exercicio", title: "Ordene", exercise_mode: "ordenar", solution_files: [{ path: "main.py", content: PARSONS_SOLUTION }], parsons_lines: PARSONS_LINES, test_cases: cases },
    ]
    const created = await teacher.agent.post("/api/lessons", { title: "Guiada com previsão", lesson_type: "guided", steps })
    expect(created.status).toBe(201)
    const authored = bodyOf<LessonWithTests>(created)
    expect(authored.authoring_steps.map((step) => [step.kind, step.exercise_mode, step.expected_output, step.parsons_lines.length])).toEqual([
      ["previsao", "codigo", SECRET_OUTPUT, 0],
      ["exercicio", "ordenar", "", 4],
    ])
    expect(JSON.stringify(authored.steps)).not.toContain(SECRET_OUTPUT_MARK)
    expect((await teacher.agent.patch(`/api/lessons/${authored.id}/publish`, { published: true })).status).toBe(200)
    expect(JSON.stringify((await student.agent.get(`/api/lessons/${authored.id}`)).body)).not.toContain(SECRET_OUTPUT_MARK)
    expect((await student.agent.get(`/api/lessons/${authored.id}/authoring`)).status).toBe(403)

    const invalid = [
      [{ ...steps[0], expected_output: "" }],
      [{ ...steps[1], order: 1, parsons_lines: [PARSONS_LINES[1], PARSONS_LINES[2], PARSONS_LINES[3], PARSONS_LINES[0]] }],
      [{ ...steps[1], order: 1, parsons_lines: PARSONS_LINES.slice(0, 2) }],
      [{ order: 1, kind: "leitura", title: "Leia", expected_output: "x" }],
    ]
    for (const invalidSteps of invalid) expect((await teacher.agent.patch(`/api/lessons/${authored.id}`, { steps: invalidSteps })).status).toBe(400)
  })

  it("importação grava os assets e a rota pública os serve com tipo, nosniff, CSP e cache; reimportar sem o arquivo o apaga", async () => {
    const admin = await signUp(ctx.app, "admin", ctx.db)
    const first = await admin.agent.post("/api/admin/content/import", bundleWith({ [ASSET_PATH]: { content_type: "image/svg+xml", base64: base64(SAFE_SVG) } }))
    expect(first.status).toBe(200)
    expect(bodyOf<ContentImportSummary>(first)).toMatchObject({ courses: 1, lessons: 1, steps: 3, assets: 1 })

    const anonymous = agent(ctx.app)
    const served = await anonymous.raw.get(ASSET_URL).buffer(true).parse((response, done) => {
      const chunks: Buffer[] = []
      response.on("data", (chunk: Buffer) => chunks.push(chunk))
      response.on("end", () => done(null, Buffer.concat(chunks)))
    })
    expect(served.status).toBe(200)
    expect(Buffer.isBuffer(served.body) ? served.body.toString("utf8") : "").toBe(SAFE_SVG)
    expect(served.headers["content-type"]).toBe("image/svg+xml")
    expect(served.headers["x-content-type-options"]).toBe("nosniff")
    expect(served.headers["content-security-policy"]).toBe("default-src 'none'; style-src 'unsafe-inline'; sandbox")
    expect(served.headers["cache-control"]).toBe("public, max-age=300, must-revalidate")
    const etag = String(served.headers.etag)
    expect(etag).toMatch(/^"[0-9a-f]{64}"$/)
    // Com a versão (hash) certa na URL o cache é longo; com versão errada, curto.
    expect((await anonymous.raw.get(`${ASSET_URL}?v=${etag.slice(1, 13)}`)).headers["cache-control"]).toBe("public, max-age=31536000, immutable")
    expect((await anonymous.raw.get(`${ASSET_URL}?v=000000000000`)).headers["cache-control"]).toBe("public, max-age=300, must-revalidate")
    expect((await anonymous.raw.get(ASSET_URL).set("If-None-Match", etag)).status).toBe(304)

    // A lição importada sai para o aluno sem a saída esperada e com as linhas do ordenar.
    const lesson = required(await ctx.db.query.lessons.findFirst({ where: eq(lessons.slug, "licao-p2b") }), "lição importada")
    const publicLesson = await anonymous.get(`/api/lessons/${lesson.id}`)
    expect(bodyOf<Lesson>(publicLesson).steps.map((step) => step.kind)).toEqual(["leitura", "previsao", "exercicio"])
    expect(bodyOf<Lesson>(publicLesson).steps[0]?.narrative_markdown).toBe(`![Desenho](${ASSET_URL})`)
    expect(JSON.stringify(publicLesson.body)).not.toContain(SECRET_OUTPUT_MARK)

    // Idempotente; e o asset que saiu do pacote some do banco (os de outros cursos ficam).
    await ctx.db.insert(contentAssets).values({ path: "outro-curso/modulo/x.svg", contentType: "image/svg+xml", dataBase64: base64(SAFE_SVG), sizeBytes: SAFE_SVG.length, sha256: "a".repeat(64) })
    await admin.agent.post("/api/admin/content/import", bundleWith({ [ASSET_PATH]: { content_type: "image/svg+xml", base64: base64(SAFE_SVG) } }))
    expect(await countRows(ctx.db, sql`select count(*)::int as n from content_assets`)).toBe(2)
    expect(bodyOf<ContentImportSummary>(await admin.agent.post("/api/admin/content/import", bundleWith({}))).assets).toBe(0)
    expect((await anonymous.get(ASSET_URL)).status).toBe(404)
    expect((await anonymous.get("/api/content/assets/outro-curso/modulo/x.svg")).status).toBe(200)
  })

  it("o conteúdo de exemplo compilado (com todos os recursos) importa inteiro e serve a imagem citada na narrativa", async () => {
    const compiled = compileContent({ contentDir: path.resolve(process.cwd(), "../../content/exemplo") })
    const bundle = required(validateBundle(compiled, "2026-11-14T00:00:00.000Z").bundle, "pacote do exemplo")
    const admin = await signUp(ctx.app, "admin", ctx.db)
    const imported = await admin.agent.post("/api/admin/content/import", bundle)
    expect(bodyOf<ContentImportSummary>(imported)).toMatchObject({ lessons: 3, assets: 1 })
    const lesson = required(await ctx.db.query.lessons.findFirst({ where: eq(lessons.slug, "exemplo-m1-03-recursos-de-apresentacao") }), "lição-modelo")
    const publicLesson = await agent(ctx.app).get(`/api/lessons/${lesson.id}`)
    const steps = bodyOf<Lesson>(publicLesson).steps
    expect(steps.map((step) => [step.kind, step.exercise_mode])).toEqual([["leitura", "codigo"], ["exercicio", "lacunas"], ["exercicio", "ordenar"], ["previsao", "codigo"], ["quiz", "codigo"]])
    for (const leak of ["expected_output", "média: 7.0", "solution_files", "wrong_solutions", "correct_index"]) expect(JSON.stringify(publicLesson.body)).not.toContain(leak)
    const imageUrl = required(/\]\((\/api\/content\/assets\/[^)]+)\)/.exec(steps[0]?.narrative_markdown ?? "")?.[1], "URL da imagem na narrativa")
    const image = await agent(ctx.app).raw.get(imageUrl)
    expect(image.status).toBe(200)
    expect(image.headers["content-type"]).toBe("image/svg+xml")
    expect(image.headers["cache-control"]).toBe("public, max-age=31536000, immutable")
  })
})
