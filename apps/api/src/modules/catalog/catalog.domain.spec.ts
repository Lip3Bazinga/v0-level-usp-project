import { describe, expect, it } from "vitest"
import { canSetRunButtonLevel, checkReorder, generateSlug, nextOrder, passRate, pickUniqueSlug, publishBlocker, withRandomSuffix, type PublishCandidate } from "./catalog.domain"

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
  it("desempata corridas com um sufixo aleatório curto", () => {
    expect(withRandomSuffix("listas", () => 0.5)).toBe("listas-i")
    expect(withRandomSuffix("listas")).toMatch(/^listas-[a-z0-9]{1,6}$/)
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

/** Lição sem bibliotecas no motor padrão; cada teste troca só o que importa. */
const candidate = (overrides: Partial<PublishCandidate>): PublishCandidate => ({
  lessonType: "theory", testCaseCount: 0, quizQuestionCount: 0, stepCount: 0, runtime: "python", libraries: [], ...overrides,
})

describe("publishBlocker", () => {
  it("lição de código exige casos de teste", () => {
    expect(publishBlocker(candidate({ lessonType: "coding" }))?.code).toBe("NO_TESTS")
    expect(publishBlocker(candidate({ lessonType: "coding", testCaseCount: 2 }))).toBeNull()
  })
  it("quiz exige ao menos uma questão", () => {
    expect(publishBlocker(candidate({ lessonType: "quiz" }))?.code).toBe("NO_QUESTIONS")
    expect(publishBlocker(candidate({ lessonType: "quiz", quizQuestionCount: 1 }))).toBeNull()
  })
  it("lição guiada exige ao menos um passo", () => {
    expect(publishBlocker(candidate({ lessonType: "guided" }))?.code).toBe("NO_STEPS")
    expect(publishBlocker(candidate({ lessonType: "guided", stepCount: 3 }))).toBeNull()
  })
  it("teoria publica sem requisitos", () => {
    expect(publishBlocker(candidate({ lessonType: "theory" }))).toBeNull()
  })
  it("biblioteca fora do manifesto (pendente) impede a publicação, com os nomes na mensagem", () => {
    const blocker = publishBlocker(candidate({ runtime: "python-dados", libraries: ["numpy", "xgboost", "lightgbm"] }))
    expect(blocker?.code).toBe("LIBRARY_PENDING")
    expect(blocker?.message).toContain("xgboost, lightgbm")
    expect(blocker?.message).not.toContain("numpy")
  })
  it("biblioteca do manifesto publica no motor que a oferece; em outro motor é recusada", () => {
    expect(publishBlocker(candidate({ runtime: "python-dados", libraries: ["numpy", "sklearn", "Pandas"] }))).toBeNull()
    expect(publishBlocker(candidate({ runtime: "python", libraries: ["numpy"] }))?.code).toBe("LIBRARY_RUNTIME")
  })
  it("os bloqueios de conteúdo vêm antes dos de biblioteca", () => {
    expect(publishBlocker(candidate({ lessonType: "coding", runtime: "python-dados", libraries: ["xgboost"] }))?.code).toBe("NO_TESTS")
  })
})

describe("passRate", () => {
  it("é null sem submissões", () => {
    expect(passRate(0, 0)).toBeNull()
    expect(passRate(1, 4)).toBe(0.25)
  })
})

describe("canSetRunButtonLevel", () => {
  it("admin muda o limite, inclusive de volta para o padrão (null)", () => {
    expect(canSetRunButtonLevel("admin", 4, null)).toBe(true)
    expect(canSetRunButtonLevel("admin", null, 4)).toBe(true)
  })
  it("professor só pode omitir o campo ou reenviar o valor atual", () => {
    expect(canSetRunButtonLevel("teacher", undefined, 4)).toBe(true)
    expect(canSetRunButtonLevel("teacher", 4, 4)).toBe(true)
    expect(canSetRunButtonLevel("teacher", null, null)).toBe(true)
    expect(canSetRunButtonLevel("teacher", 1, null)).toBe(false)
    expect(canSetRunButtonLevel("teacher", null, 4)).toBe(false)
  })
})
