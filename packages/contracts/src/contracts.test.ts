import { describe, expect, it } from "vitest"
import {
  courseUpdateSchema, deleteAccountSchema, examQuestionUpdateSchema, lessonInputSchema, limitQuerySchema, nonEmpty, optionalBodySchema,
  projectFileSchema, quizQuestionInputSchema, signUpSchema, testCasesSchema,
} from "./index"

describe("contratos", () => {
  it("recusa ids de caso duplicados", () => {
    const parsed = testCasesSchema.safeParse([
      { id: "a", kind: "call", function: "f", expected: 1 },
      { id: "a", kind: "call", function: "g", expected: 2 },
    ])
    expect(parsed.success).toBe(false)
  })

  it("aplica defaults nos casos (args/kwargs vazios, match trimmed)", () => {
    const [call, io] = testCasesSchema.parse([
      { id: "a", kind: "call", function: "f", expected: 1 },
      { id: "b", kind: "io", expected_stdout: "ok" },
    ])
    expect(call).toMatchObject({ args: [], kwargs: {} })
    expect(io).toMatchObject({ stdin: "", match: "trimmed" })
  })

  it("caso expr exige alguma expectativa e não mistura valor com exceção", () => {
    const parse = (extra: Record<string, unknown>): boolean =>
      testCasesSchema.safeParse([{ id: "e", kind: "expr", expr: "conta.saldo", ...extra }]).success
    expect(parse({})).toBe(false)
    expect(parse({ expected: 100 })).toBe(true)
    expect(parse({ expected: null })).toBe(true)
    expect(parse({ type: "generator" })).toBe(true)
    expect(parse({ raises: "ValueError", message_contains: "insuficiente" })).toBe(true)
    expect(parse({ raises: "ValueError", expected: 1 })).toBe(false)
    expect(parse({ expected: 1, message_contains: "x" })).toBe(false)
    expect(parse({ expected_stdout: "oi" })).toBe(true)
    expect(parse({ type: "não é nome" })).toBe(false)
  })

  it("caso expr recebe defaults de preparação, stdin e comparação", () => {
    const [exprCase] = testCasesSchema.parse([{ id: "e", kind: "expr", expr: "x", expected: 1 }])
    expect(exprCase).toMatchObject({ setup: "", stdin: "", match: "trimmed" })
  })

  it("caso unittest exige implementação e nome substituído juntos", () => {
    const parse = (extra: Record<string, unknown>): boolean =>
      testCasesSchema.safeParse([{ id: "u", kind: "unittest", expect: "fail", ...extra }]).success
    expect(parse({})).toBe(true)
    expect(parse({ target: "validar", implementation: "def validar(s):\n    return True\n" })).toBe(true)
    expect(parse({ target: "validar" })).toBe(false)
    expect(parse({ implementation: "def validar(s): ..." })).toBe(false)
    expect(parse({ expect: "talvez" })).toBe(false)
    expect(parse({ min_tests: 0 })).toBe(false)
  })

  it("novas regras de estrutura: decorator, catches e yield", () => {
    const rules = [
      { type: "decorator", name: "property" },
      { type: "catches", exception: "ValueError" },
      { type: "uses", construct: "yield" },
    ]
    const parsed = testCasesSchema.safeParse(rules.map((rule, index) => ({ id: `s${index}`, kind: "source", rule })))
    expect(parsed.success).toBe(true)
  })

  it("PATCH parcial não preenche defaults (não apaga campos não enviados)", () => {
    expect(courseUpdateSchema.parse({ title: "Novo título" })).toEqual({ title: "Novo título" })
    expect(examQuestionUpdateSchema.parse({ topic: "Laços" })).toEqual({ topic: "Laços" })
  })

  it("bloqueia caminhos de arquivo perigosos", () => {
    expect(projectFileSchema.safeParse({ path: "../segredo.py", content: "" }).success).toBe(false)
    expect(projectFileSchema.safeParse({ path: "/etc/passwd.py", content: "" }).success).toBe(false)
    expect(projectFileSchema.safeParse({ path: "utils/mat.py", content: "" }).success).toBe(true)
    // \u0000 quebraria a gravação em jsonb (500) — recusado na validação.
    expect(projectFileSchema.safeParse({ path: "main.py", content: "print(1)\u0000" }).success).toBe(false)
  })

  it("política de senha exige 10+ caracteres com letra e número", () => {
    expect(signUpSchema.safeParse({ email: "a@usp.br", password: "curta1", full_name: "A" }).success).toBe(false)
    expect(signUpSchema.safeParse({ email: "a@usp.br", password: "somenteletras", full_name: "A" }).success).toBe(false)
    expect(signUpSchema.safeParse({ email: "A@USP.br", password: "senhaForte123", full_name: "A" }).data?.email).toBe("a@usp.br")
  })

  it("lição nova vem com valores padrão seguros", () => {
    expect(lessonInputSchema.parse({ title: "Lição" })).toMatchObject({ lesson_type: "coding", test_cases: [], xp_reward: 50 })
  })

  it("gabarito da questão precisa apontar para uma alternativa existente", () => {
    const question = { prompt: "2 + 2?", options: ["3", "4"] }
    expect(quizQuestionInputSchema.safeParse({ ...question, correct_index: 1 }).success).toBe(true)
    expect(quizQuestionInputSchema.safeParse({ ...question, correct_index: 2 }).error?.issues[0]?.path).toEqual(["correct_index"])
  })

  it("limite de listagem converte o texto da query e respeita o teto", () => {
    const schema = limitQuerySchema({ defaultLimit: 20, maxLimit: 100 })
    expect(schema.parse({})).toEqual({ limit: 20 })
    expect(schema.parse({ limit: "7" })).toEqual({ limit: 7 })
    expect(schema.safeParse({ limit: "101" }).success).toBe(false)
  })

  it("corpo ausente vira objeto vazio antes da validação", () => {
    const schema = optionalBodySchema(deleteAccountSchema)
    expect(schema.safeParse(undefined).error?.issues[0]?.path).toEqual(["password"])
    expect(schema.parse({ password: "x" })).toEqual({ password: "x" })
  })
})

describe("nonEmpty", () => {
  it("texto vazio, null e undefined contam como ausentes", () => {
    expect(nonEmpty("")).toBeUndefined()
    expect(nonEmpty(null)).toBeUndefined()
    expect(nonEmpty(undefined)).toBeUndefined()
    expect(nonEmpty(" ")).toBe(" ")
    expect(nonEmpty("Laços")).toBe("Laços")
  })
})
