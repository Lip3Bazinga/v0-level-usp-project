import { nonEmpty } from "@levelusp/contracts"
import runtimeManifest from "./pyodide-runtime.json"

/*
 * De onde o navegador carrega o Python do botão "Executar".
 *
 * - Núcleo (pyodide.mjs, .wasm, stdlib, lock): servido pelo próprio site em
 *   /pyodide/v<versão>/, copiado do pacote npm no build (scripts/copy-pyodide.mts).
 *   Sem CDN de terceiros no caminho do "Executar".
 * - Pacotes extras das lições (numpy, matplotlib…): não vêm no pacote npm; são
 *   baixados do CDN oficial na MESMA versão do núcleo. Configurável por
 *   NEXT_PUBLIC_PYODIDE_PACKAGE_BASE_URL (ex.: um espelho próprio dos wheels).
 *
 * O next.config.mjs deriva a CSP destas mesmas variáveis.
 */

/** Versão do pacote `pyodide` (esquema novo: 314.x = Python 3.14). */
export const PYODIDE_VERSION = runtimeManifest.version

/** Versão do CPython embutida no Pyodide (o executor do servidor também é 3.14). */
export const BROWSER_PYTHON_VERSION = runtimeManifest.python

/** "3.14" — o que a interface mostra. */
export const BROWSER_PYTHON_MINOR_VERSION = BROWSER_PYTHON_VERSION.split(".").slice(0, 2).join(".")

export const DEFAULT_PYODIDE_INDEX_URL = `/pyodide/v${PYODIDE_VERSION}/`
export const DEFAULT_PYODIDE_PACKAGE_BASE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`

function withTrailingSlash(url: string): string {
  return url.endsWith("/") ? url : `${url}/`
}

/** URL (com "/" no fim) da pasta do núcleo do Pyodide; padrão: cópia servida pelo próprio site. */
export function pyodideIndexUrl(): string {
  return withTrailingSlash(nonEmpty(process.env.NEXT_PUBLIC_PYODIDE_INDEX_URL?.trim()) ?? DEFAULT_PYODIDE_INDEX_URL)
}

/** URL (com "/" no fim) de onde vêm os wheels dos pacotes extras (numpy, matplotlib…). */
export function pyodidePackageBaseUrl(): string {
  return withTrailingSlash(nonEmpty(process.env.NEXT_PUBLIC_PYODIDE_PACKAGE_BASE_URL?.trim()) ?? DEFAULT_PYODIDE_PACKAGE_BASE_URL)
}
