import { describe, expect, it } from "vitest"
import { addFile, parseProjectFiles, removeFile, renameEntry, resolveStarterFiles } from "./project-files"

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

describe("operações de arquivo do projeto", () => {
  const files = [
    { path: "main.py", content: "" },
    { path: "utils/a.py", content: "a" },
    { path: "utils/b.py", content: "b" },
  ]

  it("cria arquivo com caminho normalizado e recusa duplicado ou extensão inválida", () => {
    expect(addFile(files, "  /novo.py")).toEqual({ ok: true, files: [...files, { path: "novo.py", content: "" }] })
    expect(addFile(files, "main.py")).toEqual({ ok: false, error: "Já existe um arquivo com esse nome." })
    expect(addFile(files, "script.sh")).toMatchObject({ ok: false })
  })

  it("renomeia uma pasta levando todos os arquivos dela", () => {
    const change = renameEntry(files, "utils", "lib")
    expect(change.ok && change.files.map((file) => file.path)).toEqual(["main.py", "lib/a.py", "lib/b.py"])
  })

  it("protege o main.py contra renomear e excluir", () => {
    expect(renameEntry(files, "main.py", "app.py")).toEqual({ ok: false, error: "main.py não pode ser renomeado." })
    expect(removeFile(files, "main.py")).toEqual({ ok: false, error: "main.py não pode ser excluído." })
  })
})
