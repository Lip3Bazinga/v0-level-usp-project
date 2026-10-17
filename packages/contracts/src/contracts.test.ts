import { describe, expect, it } from "vitest"
import { courseUpdateSchema, lessonInputSchema, projectFileSchema, signUpSchema, testCasesSchema } from "./index"

describe("contratos", () => {
  it("recusa ids de caso duplicados", () => {
    const r = testCasesSchema.safeParse([
      { id: "a", kind: "call", function: "f", expected: 1 },
      { id: "a", kind: "call", function: "g", expected: 2 },
    ])
    expect(r.success).toBe(false)
  })

  it("aplica defaults nos casos (args/kwargs vazios, match trimmed)", () => {
    const [call, io] = testCasesSchema.parse([
      { id: "a", kind: "call", function: "f", expected: 1 },
      { id: "b", kind: "io", expected_stdout: "ok" },
    ])
    expect(call).toMatchObject({ args: [], kwargs: {} })
    expect(io).toMatchObject({ stdin: "", match: "trimmed" })
  })

  it("PATCH parcial não preenche defaults (não apaga campos não enviados)", () => {
    expect(courseUpdateSchema.parse({ title: "Novo título" })).toEqual({ title: "Novo título" })
  })

  it("bloqueia caminhos de arquivo perigosos", () => {
    expect(projectFileSchema.safeParse({ path: "../segredo.py", content: "" }).success).toBe(false)
    expect(projectFileSchema.safeParse({ path: "/etc/passwd.py", content: "" }).success).toBe(false)
    expect(projectFileSchema.safeParse({ path: "utils/mat.py", content: "" }).success).toBe(true)
  })

  it("política de senha exige 10+ caracteres com letra e número", () => {
    expect(signUpSchema.safeParse({ email: "a@usp.br", password: "curta1", full_name: "A" }).success).toBe(false)
    expect(signUpSchema.safeParse({ email: "a@usp.br", password: "somenteletras", full_name: "A" }).success).toBe(false)
    expect(signUpSchema.safeParse({ email: "A@USP.br", password: "senhaForte123", full_name: "A" }).data?.email).toBe("a@usp.br")
  })

  it("lição nova vem com valores padrão seguros", () => {
    expect(lessonInputSchema.parse({ title: "Lição" })).toMatchObject({ lesson_type: "coding", test_cases: [], xp_reward: 50 })
  })
})
