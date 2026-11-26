/*
 * DADOS PROVISÓRIOS do `pip list` do terminal.
 *
 * O manifesto único de bibliotecas (nome, versão, disponível no navegador e motores do servidor)
 * está sendo feito em paralelo (Fase F, item 1: content/ + packages/contracts + API). Até ele
 * chegar, o terminal lê esta lista, isolada neste arquivo.
 *
 * LIGAÇÃO FUTURA: quando o manifesto existir em `@levelusp/contracts`, troque só o corpo de
 * `listBrowserLibraries` (mantendo a assinatura) para filtrar as entradas com `browser: true`.
 * Nenhum outro arquivo do terminal conhece esta lista. As versões abaixo são as do
 * `pyodide-lock.json` da versão fixada em `pyodide-runtime.json`; um teste confere.
 */

/** Biblioteca instalável no Python do navegador. */
export interface BrowserLibrary {
  /** Nome como no PyPI (minúsculas). */
  name: string
  version: string
}

const PROVISIONAL_BROWSER_LIBRARIES: readonly BrowserLibrary[] = [
  { name: "matplotlib", version: "3.10.8" },
  { name: "numpy", version: "2.4.6" },
  { name: "pandas", version: "3.0.2" },
  { name: "pillow", version: "12.2.0" },
  { name: "scikit-learn", version: "1.8.0" },
  { name: "scipy", version: "1.18.0" },
  { name: "sympy", version: "1.14.0" },
]

/** Bibliotecas que o aluno pode usar no navegador, em ordem alfabética (o que o `pip list` mostra). */
export function listBrowserLibraries(): readonly BrowserLibrary[] {
  return PROVISIONAL_BROWSER_LIBRARIES
}
