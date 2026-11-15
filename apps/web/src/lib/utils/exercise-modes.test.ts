import { beforeEach, describe, expect, it } from "vitest"
import { MAX_PARSONS_INDENT, parsonsArrangementSchema, type ParsonsLine } from "@levelusp/contracts"
import {
  arrangementFiles, availableLines, clearArrangementDraft, clearBlanksDraft, countBlanks, fillBlanks, fillBlanksInFiles, indentLine, moveLine, placeLine,
  readArrangementDraft, readBlanksDraft, sanitizePlacements, splitBlanks, unplaceLine, writeArrangementDraft, writeBlanksDraft,
} from "./exercise-modes"

const SOURCE = "def media(notas):\n    total = ___\n    for nota in notas:\n        total += ____\n    return total / ___\n"

describe("exercício de lacunas", () => {
  it("separa o código nas lacunas (três ou mais sublinhados)", () => {
    expect(countBlanks(SOURCE)).toBe(3)
    expect(splitBlanks("a = ___ + ___")).toEqual(["a = ", " + ", ""])
    expect(countBlanks("nome_do__aluno = 1")).toBe(0)
  })

  it("monta o código trocando cada lacuna pela resposta da mesma posição", () => {
    expect(fillBlanks(SOURCE, ["0", "nota", "len(notas)"])).toBe("def media(notas):\n    total = 0\n    for nota in notas:\n        total += nota\n    return total / len(notas)\n")
  })

  it("lacuna sem resposta continua marcada e a resposta nunca quebra a linha", () => {
    expect(fillBlanks("a = ___ + ___", ["1"])).toBe("a = 1 + ___")
    expect(fillBlanks("a = ___", ["  "])).toBe("a = ___")
    expect(fillBlanks("a = ___", ["1\nimport os"])).toBe("a = 1 import os")
  })

  it("só o main.py recebe as respostas; os outros arquivos vão como estão", () => {
    const files = [{ path: "main.py", content: "x = ___" }, { path: "dados.txt", content: "___" }]
    expect(fillBlanksInFiles(files, ["5"])).toEqual([{ path: "main.py", content: "x = 5" }, { path: "dados.txt", content: "___" }])
  })
})

describe("rascunho das lacunas", () => {
  beforeEach(() => window.localStorage.clear())

  it("guarda por passo e ajusta ao número de lacunas atual", () => {
    writeBlanksDraft("p1", ["0", "nota"])
    expect(readBlanksDraft("p1", 3)).toEqual(["0", "nota", ""])
    expect(readBlanksDraft("p1", 1)).toEqual(["0"])
    expect(readBlanksDraft("p2", 2)).toEqual(["", ""])
    clearBlanksDraft("p1")
    expect(readBlanksDraft("p1", 2)).toEqual(["", ""])
  })

  it("ignora rascunho corrompido", () => {
    window.localStorage.setItem("lvl:passo:p1:lacunas", "{não é json")
    expect(readBlanksDraft("p1", 1)).toEqual([""])
    window.localStorage.setItem("lvl:passo:p1:lacunas", JSON.stringify([1, null]))
    expect(readBlanksDraft("p1", 2)).toEqual(["", ""])
  })
})

const LINES: ParsonsLine[] = [
  { id: "a", text: 'return "aprovado"' },
  { id: "b", text: "def situacao(notas):" },
  { id: "c", text: "if media > 6:" },
  { id: "d", text: "if media >= 6:" },
]

describe("exercício de ordenar", () => {
  it("as linhas disponíveis mantêm a ordem em que a API entregou", () => {
    expect(availableLines(LINES, []).map((line) => line.id)).toEqual(["a", "b", "c", "d"])
    expect(availableLines(LINES, [{ line_id: "b", indent: 0 }]).map((line) => line.id)).toEqual(["a", "c", "d"])
  })

  it("adiciona no fim ou numa posição, sem duplicar, e devolve à origem", () => {
    const first = placeLine([], "b")
    const second = placeLine(first, "a")
    expect(second).toEqual([{ line_id: "b", indent: 0 }, { line_id: "a", indent: 0 }])
    expect(placeLine(second, "d", 1).map((item) => item.line_id)).toEqual(["b", "d", "a"])
    expect(placeLine(second, "a", 0)).toEqual([{ line_id: "a", indent: 0 }, { line_id: "b", indent: 0 }])
    expect(unplaceLine(second, "b")).toEqual([{ line_id: "a", indent: 0 }])
  })

  it("mover uma linha já posicionada mantém a indentação dela", () => {
    const placements = [{ line_id: "b", indent: 0 }, { line_id: "d", indent: 1 }, { line_id: "a", indent: 2 }]
    expect(placeLine(placements, "a", 0)).toEqual([{ line_id: "a", indent: 2 }, { line_id: "b", indent: 0 }, { line_id: "d", indent: 1 }])
    expect(placeLine(placements, "b", 2).map((item) => item.line_id)).toEqual(["d", "a", "b"])
  })

  it("sobe, desce e não sai das pontas", () => {
    const placements = [{ line_id: "b", indent: 0 }, { line_id: "a", indent: 0 }]
    expect(moveLine(placements, "a", -1).map((item) => item.line_id)).toEqual(["a", "b"])
    expect(moveLine(placements, "a", 1).map((item) => item.line_id)).toEqual(["b", "a"])
    expect(moveLine(placements, "b", -1).map((item) => item.line_id)).toEqual(["b", "a"])
  })

  it("a indentação fica entre 0 e o máximo do contrato", () => {
    const placements = [{ line_id: "a", indent: 0 }]
    expect(indentLine(placements, "a", -1)).toEqual([{ line_id: "a", indent: 0 }])
    expect(indentLine(placements, "a", 2)).toEqual([{ line_id: "a", indent: 2 }])
    expect(indentLine(placements, "a", 99)).toEqual([{ line_id: "a", indent: MAX_PARSONS_INDENT }])
  })

  it("monta o main.py com 4 espaços por nível, só para executar", () => {
    const placements = [{ line_id: "b", indent: 0 }, { line_id: "d", indent: 1 }, { line_id: "a", indent: 2 }]
    expect(arrangementFiles(LINES, placements)).toEqual([{ path: "main.py", content: 'def situacao(notas):\n    if media >= 6:\n        return "aprovado"\n' }])
    expect(arrangementFiles(LINES, [])).toBeNull()
    // O que vai para a API passa no schema do contrato.
    expect(parsonsArrangementSchema.safeParse(placements).success).toBe(true)
  })

  it("valida o arranjo guardado: linha desconhecida, repetida ou malformada sai; indentação é limitada", () => {
    const raw = [{ line_id: "b", indent: 0 }, { line_id: "zz", indent: 0 }, { line_id: "b", indent: 1 }, { line_id: "a", indent: 40 }, { line_id: "c" }, "d", null, { line_id: "d", indent: -2 }]
    expect(sanitizePlacements(LINES, raw)).toEqual([{ line_id: "b", indent: 0 }, { line_id: "a", indent: MAX_PARSONS_INDENT }, { line_id: "d", indent: 0 }])
    expect(sanitizePlacements(LINES, "nada")).toEqual([])
  })
})

describe("rascunho do arranjo", () => {
  beforeEach(() => window.localStorage.clear())

  it("guarda a resposta do aluno por passo e a confere contra as linhas atuais", () => {
    writeArrangementDraft("p3", [{ line_id: "b", indent: 0 }, { line_id: "a", indent: 2 }])
    expect(readArrangementDraft("p3", LINES)).toEqual([{ line_id: "b", indent: 0 }, { line_id: "a", indent: 2 }])
    expect(readArrangementDraft("p3", LINES.slice(1))).toEqual([{ line_id: "b", indent: 0 }])
    expect(readArrangementDraft("outro", LINES)).toEqual([])
    clearArrangementDraft("p3")
    expect(readArrangementDraft("p3", LINES)).toEqual([])
  })
})
