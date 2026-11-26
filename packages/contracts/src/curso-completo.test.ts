import { describe, expect, it } from "vitest"
import {
  CLIENT_EVENT_TYPES, contentBundleSchema, eventsBatchSchema, EVENT_TYPES, LESSON_TYPES, lessonInputSchema, lessonStepSchema, lessonStepsSchema,
  lessonUpdateSchema, levelForXp, MAX_EVENT_PAYLOAD_BYTES, MAX_EVENTS_PER_BATCH, SUBMISSION_STATUSES, testCasesSchema, trackUpdateSchema,
  xpForLevel,
} from "./index"

const EXERCISE_STEP = {
  order: 1,
  kind: "exercicio",
  title: "Seu primeiro print",
  checkpoints: [{ id: 1, instruction: "Use print()" }, { id: 2, instruction: "Exiba seu nome" }],
  test_cases: [{ id: "saida", kind: "io", expected_stdout: "Olá, mundo!", match: "contains", checkpoint: 1 }],
  hints: ["print recebe o texto entre aspas"],
}

describe("curva de XP", () => {
  it("xpForLevel segue 250·(n−1)·(n+2): 0, 1000, 2500, 4500, 7000", () => {
    expect([1, 2, 3, 4, 5].map(xpForLevel)).toEqual([0, 1000, 2500, 4500, 7000])
    expect(xpForLevel(0)).toBe(0)
    expect(xpForLevel(-3)).toBe(0)
  })

  it("levelForXp é a inversa, com nível mínimo 1", () => {
    expect(levelForXp(0)).toBe(1)
    expect(levelForXp(999)).toBe(1)
    expect(levelForXp(1000)).toBe(2)
    expect(levelForXp(2499)).toBe(2)
    expect(levelForXp(2500)).toBe(3)
    expect(levelForXp(4500)).toBe(4)
    expect(levelForXp(6999)).toBe(4)
    expect(levelForXp(7000)).toBe(5)
    expect(levelForXp(-50)).toBe(1)
    expect(levelForXp(Number.NaN)).toBe(1)
  })

  it("as duas funções são coerentes em toda a faixa útil", () => {
    for (let level = 1; level <= 60; level++) {
      expect(levelForXp(xpForLevel(level))).toBe(level)
      expect(levelForXp(xpForLevel(level + 1) - 1)).toBe(level)
    }
  })
})

describe("passos de lição", () => {
  it("tipos de lição incluem guided e submissões aceitam error", () => {
    expect(LESSON_TYPES).toContain("guided")
    expect(SUBMISSION_STATUSES).toEqual(["graded", "error"])
  })

  it("aplica os padrões do passo (narrativa, arquivos, dicas, xp 10)", () => {
    const step = lessonStepSchema.parse(EXERCISE_STEP)
    expect(step).toMatchObject({ narrative_markdown: "", starter_files: [], solution_files: [], quiz_questions: [], xp: 10 })
    expect(step.test_cases[0]).toMatchObject({ checkpoint: 1, stdin: "" })
  })

  it("exige casos no exercício, questões no quiz e checkpoints existentes", () => {
    expect(lessonStepSchema.safeParse({ ...EXERCISE_STEP, test_cases: [] }).error?.issues[0]?.path).toEqual(["test_cases"])
    expect(lessonStepSchema.safeParse({ order: 1, kind: "quiz", title: "Fixando" }).error?.issues[0]?.path).toEqual(["quiz_questions"])
    const orphan = { ...EXERCISE_STEP, test_cases: [{ id: "x", kind: "source", rule: { type: "calls", name: "print" }, checkpoint: 9 }] }
    expect(lessonStepSchema.safeParse(orphan).error?.issues[0]?.path).toEqual(["test_cases", 0, "checkpoint"])
    expect(lessonStepSchema.safeParse({ order: 1, kind: "leitura", title: "Intro" }).success).toBe(true)
  })

  it("limita as dicas a 3 e o gabarito do quiz às alternativas", () => {
    expect(lessonStepSchema.safeParse({ ...EXERCISE_STEP, hints: ["a", "b", "c", "d"] }).success).toBe(false)
    const quiz = { order: 1, kind: "quiz", title: "Q", quiz_questions: [{ prompt: "P?", options: ["a", "b"], correct_index: 2 }] }
    expect(lessonStepSchema.safeParse(quiz).error?.issues[0]?.path).toEqual(["quiz_questions", 0, "correct_index"])
  })

  it("a lista de passos precisa estar numerada 1..n", () => {
    expect(lessonStepsSchema.safeParse([{ ...EXERCISE_STEP, order: 2 }]).error?.issues[0]?.path).toEqual([0, "order"])
    expect(lessonStepsSchema.safeParse([EXERCISE_STEP, { order: 2, kind: "leitura", title: "Fim" }]).success).toBe(true)
  })

  it("caso de teste aceita checkpoint inteiro a partir de 1", () => {
    expect(testCasesSchema.safeParse([{ id: "a", kind: "call", function: "f", expected: 1, checkpoint: 0 }]).success).toBe(false)
    expect(testCasesSchema.safeParse([{ id: "a", kind: "call", function: "f", expected: 1, checkpoint: 2 }]).success).toBe(true)
  })

  it("campos novos da lição são opcionais na criação e no PATCH", () => {
    const created = lessonInputSchema.parse({ title: "Lição" })
    expect(created).not.toHaveProperty("runtime")
    expect(created).not.toHaveProperty("steps")
    const guided = lessonInputSchema.parse({ title: "Guiada", lesson_type: "guided", runtime: "python-dados", objectives: ["ler"], steps: [EXERCISE_STEP] })
    expect(guided.steps?.length).toBe(1)
    expect(lessonInputSchema.safeParse({ title: "x".repeat(10), solution_after_attempts: 21 }).success).toBe(false)
    expect(lessonInputSchema.safeParse({ title: "x".repeat(10), objectives: Array.from({ length: 11 }, () => "o") }).success).toBe(false)
    expect(lessonUpdateSchema.parse({ is_project: true })).toEqual({ is_project: true })
  })
})

describe("experimento", () => {
  it("lote de eventos respeita a lista fechada, o tamanho do lote e o payload", () => {
    expect(eventsBatchSchema.parse({ events: [{ type: "lesson_viewed" }] }).events[0]).toEqual({ type: "lesson_viewed", payload: {} })
    expect(eventsBatchSchema.safeParse({ events: [{ type: "page_scrolled" }] }).success).toBe(false)
    expect(eventsBatchSchema.safeParse({ events: [] }).success).toBe(false)
    const tooMany = Array.from({ length: MAX_EVENTS_PER_BATCH + 1 }, () => ({ type: CLIENT_EVENT_TYPES[0] }))
    expect(eventsBatchSchema.safeParse({ events: tooMany }).success).toBe(false)
    const bigPayload = { note: "x".repeat(MAX_EVENT_PAYLOAD_BYTES) }
    expect(eventsBatchSchema.safeParse({ events: [{ type: "lesson_viewed", payload: bigPayload }] }).success).toBe(false)
    expect(eventsBatchSchema.safeParse({ events: [{ type: "lesson_viewed", payload: { lesson_id: "abc", xp: 10 } }] }).success).toBe(true)
  })

  it("o cliente só envia os tipos de uso; os que o servidor decide são recusados, e um deles derruba o lote inteiro", () => {
    expect(CLIENT_EVENT_TYPES).toEqual(["lesson_viewed"])
    for (const type of EVENT_TYPES) {
      const isClientType = (CLIENT_EVENT_TYPES as readonly string[]).includes(type)
      expect(eventsBatchSchema.safeParse({ events: [{ type }] }).success).toBe(isClientType)
    }
    expect(eventsBatchSchema.safeParse({ events: [{ type: "lesson_viewed" }, { type: "lesson_completed" }] }).success).toBe(false)
  })

  it("PATCH de trilha não aplica defaults", () => {
    expect(trackUpdateSchema.parse({ title: "Trilha nova" })).toEqual({ title: "Trilha nova" })
  })
})

describe("pacote de conteúdo (formato 2)", () => {
  const lesson = (slug: string, overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    slug, title: `Lição ${slug}`, lesson_type: "guided", steps: [EXERCISE_STEP], ...overrides,
  })
  const bundle = (lessons: Record<string, unknown>[], tracks: Record<string, unknown>[] = []): Record<string, unknown> => ({
    format: 2,
    tracks,
    courses: [{ slug: "n1", title: "Nível 1", modules: [{ slug: "m1", title: "Módulo 1", lessons }] }],
  })

  it("aceita um pacote mínimo com os padrões aplicados", () => {
    const parsed = contentBundleSchema.parse(bundle([lesson("l1")], [{ slug: "python-ia", title: "Trilha", courses: ["n1"] }]))
    expect(parsed.courses[0]).toMatchObject({ prerequisite: null, sequential: false, exam: null, published: false })
    expect(parsed.courses[0]?.modules[0]?.lessons[0]).toMatchObject({ runtime: "python", solution_after_attempts: 3, is_project: false, published: true })
    expect(parsed.tracks[0]).toMatchObject({ certificate_title: "", published: false })
  })

  it("lição clássica tem exatamente um passo do tipo correspondente", () => {
    const quizStep = { order: 1, kind: "quiz", title: "Q", quiz_questions: [{ prompt: "P?", options: ["a", "b"], correct_index: 0 }] }
    expect(contentBundleSchema.safeParse(bundle([lesson("l1", { lesson_type: "quiz", steps: [quizStep] })])).success).toBe(true)
    expect(contentBundleSchema.safeParse(bundle([lesson("l1", { lesson_type: "coding", steps: [quizStep] })])).success).toBe(false)
    expect(contentBundleSchema.safeParse(bundle([lesson("l1", { lesson_type: "theory", steps: [EXERCISE_STEP, { ...quizStep, order: 2 }] })])).success).toBe(false)
  })

  it("recusa slugs repetidos e formato desconhecido", () => {
    expect(contentBundleSchema.safeParse(bundle([lesson("l1"), lesson("l1")])).error?.issues[0]?.message).toMatch(/slug de lição repetido/)
    expect(contentBundleSchema.safeParse({ ...bundle([lesson("l1")]), format: 1 }).success).toBe(false)
  })

  it("soluções erradas são aceitas no passo do pacote", () => {
    const step = { ...EXERCISE_STEP, wrong_solutions: [{ name: "sem aspas", files: [{ path: "main.py", content: "print(Olá)" }] }] }
    const parsed = contentBundleSchema.parse(bundle([lesson("l1", { steps: [step] })]))
    expect(parsed.courses[0]?.modules[0]?.lessons[0]?.steps[0]?.wrong_solutions).toHaveLength(1)
  })
})
