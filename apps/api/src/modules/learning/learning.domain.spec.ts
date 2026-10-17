import { describe, expect, it } from "vitest"
import { hasEntryFile, parseSnapshot } from "./learning.domain"

describe("parseSnapshot", () => {
  it("lê o projeto salvo como JSON e descarta itens malformados", () => {
    const raw = JSON.stringify([{ path: "main.py", content: "print(1)" }, { path: 3 }, null])
    expect(parseSnapshot(raw)).toEqual([{ path: "main.py", content: "print(1)" }])
  })

  it("código legado (texto puro) vira o main.py do projeto", () => {
    expect(parseSnapshot("print('oi')")).toEqual([{ path: "main.py", content: "print('oi')" }])
  })

  it("vazio ou JSON que não é lista de arquivos não tem snapshot", () => {
    expect(parseSnapshot(null)).toBeNull()
    expect(parseSnapshot("   ")).toBeNull()
    expect(parseSnapshot('{"path": "main.py"}')).toBeNull()
    expect(parseSnapshot("[]")).toBeNull()
  })
})

describe("hasEntryFile", () => {
  it("exige o main.py no projeto", () => {
    expect(hasEntryFile([{ path: "utils.py", content: "" }])).toBe(false)
    expect(hasEntryFile([{ path: "main.py", content: "" }])).toBe(true)
  })
})
