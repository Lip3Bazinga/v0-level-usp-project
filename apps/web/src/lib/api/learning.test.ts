import { describe, expect, it } from "vitest"
import { computeModuleStatuses, parseProjectFiles, resolveStarterFiles } from "./learning"

describe("parseProjectFiles", () => {
  const fallback = [{ path: "main.py", content: "# padrão" }]

  it("aceita um array de ProjectFile e descarta itens inválidos", () => {
    const raw = [
      { path: "main.py", content: "print(1)" },
      { path: 1, content: "x" },
      null,
      { path: "utils/a.py", content: "" },
    ]
    expect(parseProjectFiles(raw)).toEqual([
      { path: "main.py", content: "print(1)" },
      { path: "utils/a.py", content: "" },
    ])
  })

  it("usa o fallback quando o array não tem nenhum arquivo válido", () => {
    expect(parseProjectFiles([{ nope: true }], fallback)).toBe(fallback)
  })

  it("interpreta string JSON", () => {
    expect(parseProjectFiles(JSON.stringify([{ path: "a.py", content: "x = 1" }]))).toEqual([
      { path: "a.py", content: "x = 1" },
    ])
  })

  it("trata string que não é JSON como código legado em main.py", () => {
    expect(parseProjectFiles("print('olá')")).toEqual([{ path: "main.py", content: "print('olá')" }])
  })

  it("usa o fallback para vazio, null e tipos inesperados", () => {
    expect(parseProjectFiles("   ", fallback)).toBe(fallback)
    expect(parseProjectFiles(null, fallback)).toBe(fallback)
    expect(parseProjectFiles(42, fallback)).toBe(fallback)
    expect(parseProjectFiles(undefined)).toEqual([])
  })
})

describe("resolveStarterFiles", () => {
  it("prefere starter_files do professor", () => {
    const files = [{ path: "main.py", content: "a" }, { path: "b.py", content: "b" }]
    expect(resolveStarterFiles({ starter_files: files, starter_code: "ignorado" })).toEqual(files)
  })

  it("cai para starter_code em main.py quando não há arquivos", () => {
    expect(resolveStarterFiles({ starter_files: [], starter_code: "print(1)" })).toEqual([
      { path: "main.py", content: "print(1)" },
    ])
  })
})

describe("computeModuleStatuses", () => {
  const lessons = [{ id: "l1" }, { id: "l2" }, { id: "l3" }, { id: "l4" }]

  it("sem progresso: só a primeira lição fica disponível", () => {
    expect(computeModuleStatuses(lessons, new Map())).toEqual(["in-progress", "locked", "locked", "locked"])
  })

  it("libera a lição seguinte à última concluída", () => {
    const progress = new Map([
      ["l1", { status: "completed" as const }],
      ["l2", { status: "in_progress" as const }],
    ])
    expect(computeModuleStatuses(lessons, progress)).toEqual(["completed", "in-progress", "locked", "locked"])
  })

  it("lições concluídas continuam concluídas mesmo depois de uma bloqueada", () => {
    const progress = new Map([
      ["l1", { status: "completed" as const }],
      ["l3", { status: "completed" as const }],
    ])
    expect(computeModuleStatuses(lessons, progress)).toEqual(["completed", "in-progress", "completed", "locked"])
  })

  it("tudo concluído e lista vazia", () => {
    const all = new Map(lessons.map((l) => [l.id, { status: "completed" as const }]))
    expect(computeModuleStatuses(lessons, all)).toEqual(["completed", "completed", "completed", "completed"])
    expect(computeModuleStatuses([], new Map())).toEqual([])
  })
})
