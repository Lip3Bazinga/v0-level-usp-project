import { describe, expect, it } from "vitest"
import { libraryManifestEntrySchema } from "@levelusp/contracts"
import { buildManifestSnippet } from "./library.domain"

const BASE = { libraryName: "XGBoost", displayName: "XGBoost", description: "Gradient boosting.", category: "ml", browser: true } as const

/** Interpreta o literal do snippet (sem o comentário e a vírgula final) como a entrada do manifesto. */
function parseSnippet(snippet: string): unknown {
  const literal = snippet
    .replace(/ \/\/ troque pela[^\n]*/, "")
    .replace(/(\n\s*)([a-z_]+):/g, '$1"$2":')
    .trim()
    .replace(/,$/, "")
    .replace(/,(\s*})/g, "$1")
  return JSON.parse(literal)
}

describe("buildManifestSnippet", () => {
  it("gera a entrada do manifesto com o nome normalizado e a versão pendente", () => {
    const entry = parseSnippet(buildManifestSnippet({ ...BASE, libraryName: "Scikit_Image" }))
    expect(entry).toMatchObject({ name: "scikit-image", version: "?", category: "ml", browser: true, engines: ["python-dados"], pyodide_profile: "ml" })
  })

  it("o rascunho ainda não passa no schema do manifesto: a versão '?' obriga a preencher a do lock", () => {
    const result = libraryManifestEntrySchema.safeParse(parseSnippet(buildManifestSnippet(BASE)))
    expect(result.success).toBe(false)
    expect(libraryManifestEntrySchema.safeParse({ ...(parseSnippet(buildManifestSnippet(BASE)) as object), version: "3.1.1" }).success).toBe(true)
  })

  it("sem navegador, não oferece motor nem perfil", () => {
    expect(parseSnippet(buildManifestSnippet({ ...BASE, browser: false }))).toMatchObject({ browser: false, engines: [], pyodide_profile: null })
  })

  it("usa o nome quando faltam nome de exibição e descrição", () => {
    expect(parseSnippet(buildManifestSnippet({ ...BASE, displayName: null, description: "  " }))).toMatchObject({ display_name: "xgboost", description: "xgboost" })
  })

  it("texto do pedido com aspas e quebras de linha não escapa do literal", () => {
    const hostile = 'x", engines: ["python"], //\n}, { name: "malicioso'
    const entry = parseSnippet(buildManifestSnippet({ ...BASE, description: hostile })) as { description: string; engines: string[]; name: string }
    expect(entry.description).toBe(hostile)
    expect(entry.engines).toEqual(["python-dados"])
    expect(entry.name).toBe("xgboost")
  })
})
