import { normalizeLibraryName, type LibraryCategory, type ReviewLibraryRequestInput } from "@levelusp/contracts"
import type { LibraryRequestRow } from "@levelusp/db"

/** Versão ainda não conferida: o teste do manifesto recusa `"?"`, então a entrada não entra sem a versão do pyodide-lock. */
export const UNKNOWN_VERSION = "?"

/** Dados do pedido (e da revisão) que viram o rascunho da entrada do manifesto. */
export interface ManifestSnippetInput {
  libraryName: string
  displayName: string | null
  description: string | null
  category: LibraryCategory
  /** Disponível no Pyodide do navegador (padrão: sim, é o único motor do servidor com bibliotecas). */
  browser: boolean
}

/** Dados do rascunho: o pedido do professor, ajustado pelo que o admin informou ao aprovar (`catalog`). */
export function snippetInput(request: LibraryRequestRow, catalog: ReviewLibraryRequestInput["catalog"]): ManifestSnippetInput {
  return {
    libraryName: request.libraryName,
    displayName: catalog?.display_name ?? request.displayName,
    description: catalog?.description ?? request.description,
    category: catalog?.category ?? "general",
    browser: catalog?.pyodide_native ?? true,
  }
}

/** Texto padrão da notificação ao professor (o admin pode escrever o próprio em `review_notes`). */
export function reviewNotification(isApproved: boolean, isInManifest: boolean): string {
  if (!isApproved) return "Sua solicitação foi recusada."
  if (isInManifest) return "Sua solicitação foi aprovada e a biblioteca já está disponível no catálogo."
  return "Sua solicitação foi aprovada. A biblioteca entra no catálogo na próxima atualização da plataforma; depois disso você poderá publicar a lição."
}

/**
 * Rascunho da entrada de `LIBRARY_MANIFEST` para o PR que libera a biblioteca. Textos saem como literais
 * JSON (aspas e quebras escapadas), então nada do pedido consegue fechar o literal e injetar código.
 */
export function buildManifestSnippet(input: ManifestSnippetInput): string {
  const name = normalizeLibraryName(input.libraryName)
  const text = (value: string | null, fallback: string): string => JSON.stringify((value ?? "").trim() || fallback)
  return [
    "  {",
    `    name: ${JSON.stringify(name)},`,
    `    version: ${JSON.stringify(UNKNOWN_VERSION)}, // troque pela versão do pacote no pyodide-lock.json`,
    "    aliases: [],",
    `    display_name: ${text(input.displayName, name)},`,
    `    description: ${text(input.description, name)},`,
    `    category: ${JSON.stringify(input.category)},`,
    `    browser: ${input.browser},`,
    `    engines: ${input.browser ? '["python-dados"]' : "[]"},`,
    `    pyodide_profile: ${input.browser ? '"ml"' : "null"},`,
    "  },",
  ].join("\n")
}
