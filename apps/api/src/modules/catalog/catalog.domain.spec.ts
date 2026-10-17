import { describe, expect, it } from "vitest"
import { canManage, canView, checkReorder, generateSlug, nextOrder, passRate, pickUniqueSlug, publishBlocker } from "./catalog.domain"

const teacher = { id: "t1", role: "teacher" as const }
const admin = { id: "a1", role: "admin" as const }
const student = { id: "s1", role: "student" as const }

describe("canManage / canView", () => {
  it("dono e admin gerenciam; outros não", () => {
    expect(canManage(teacher, "t1")).toBe(true)
    expect(canManage(admin, "t1")).toBe(true)
    expect(canManage(student, "t1")).toBe(false)
    expect(canManage(undefined, "t1")).toBe(false)
  })
  it("recurso sem dono só é gerenciável por admin", () => {
    expect(canManage(teacher, null)).toBe(false)
    expect(canManage(admin, null)).toBe(true)
  })
  it("rascunho é invisível para quem não é dono", () => {
    expect(canView(undefined, true, "t1")).toBe(true)
    expect(canView(student, false, "t1")).toBe(false)
    expect(canView(undefined, false, "t1")).toBe(false)
    expect(canView(teacher, false, "t1")).toBe(true)
  })
})

describe("generateSlug / pickUniqueSlug", () => {
  it("remove acentos e símbolos", () => {
    expect(generateSlug("  Funções & Laços em Python!  ")).toBe("funcoes-lacos-em-python")
    expect(generateSlug("Introdução — Variáveis")).toBe("introducao-variaveis")
  })
  it("título sem caracteres válidos vira slug padrão", () => {
    expect(pickUniqueSlug(generateSlug("!!!"), [])).toBe("licao")
  })
  it("acrescenta sufixo numérico quando o slug já existe", () => {
    expect(pickUniqueSlug("listas", [])).toBe("listas")
    expect(pickUniqueSlug("listas", ["listas"])).toBe("listas-2")
    expect(pickUniqueSlug("listas", ["listas", "listas-2", "listas-3"])).toBe("listas-4")
  })
})

describe("checkReorder", () => {
  const course = new Set(["a", "b", "c"])
  it("aceita permutação das lições do curso", () => {
    expect(checkReorder(["c", "a", "b"], course)).toEqual({ ok: true })
  })
  it("recusa ids repetidos e lições de fora", () => {
    expect(checkReorder(["a", "a"], course)).toEqual({ ok: false, reason: "DUPLICATE" })
    expect(checkReorder(["a", "x"], course)).toEqual({ ok: false, reason: "FOREIGN" })
  })
})

describe("nextOrder", () => {
  it("vai para o fim", () => {
    expect(nextOrder([])).toBe(1)
    expect(nextOrder([1, 5, 3])).toBe(6)
  })
})

describe("publishBlocker", () => {
  it("lição de código exige casos de teste", () => {
    expect(publishBlocker({ lessonType: "coding", testCaseCount: 0, quizQuestionCount: 0 })?.code).toBe("NO_TESTS")
    expect(publishBlocker({ lessonType: "coding", testCaseCount: 2, quizQuestionCount: 0 })).toBeNull()
  })
  it("quiz exige ao menos uma questão", () => {
    expect(publishBlocker({ lessonType: "quiz", testCaseCount: 0, quizQuestionCount: 0 })?.code).toBe("NO_QUESTIONS")
    expect(publishBlocker({ lessonType: "quiz", testCaseCount: 0, quizQuestionCount: 1 })).toBeNull()
  })
  it("teoria publica sem requisitos", () => {
    expect(publishBlocker({ lessonType: "theory", testCaseCount: 0, quizQuestionCount: 0 })).toBeNull()
  })
})

describe("passRate", () => {
  it("é null sem submissões", () => {
    expect(passRate(0, 0)).toBeNull()
    expect(passRate(1, 4)).toBe(0.25)
  })
})
