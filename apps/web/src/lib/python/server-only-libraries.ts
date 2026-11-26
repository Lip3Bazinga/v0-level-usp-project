import { splitBrowserLibraries } from "@levelusp/contracts"

/**
 * Aviso para lições cujo motor de correção tem bibliotecas que o Pyodide do navegador não tem
 * (hoje só o PyTorch, do runtime `python-completo`): o Executar e o terminal rodam no navegador e
 * não conseguem importá-las; só o Verificar (correção no servidor) roda esse código.
 *
 * @returns o texto do aviso, ou `null` quando o navegador carrega todas as bibliotecas da lição.
 */
export function serverOnlyLibrariesNotice(libraries: readonly string[] | null | undefined): string | null {
  const { serverOnly } = splitBrowserLibraries(libraries ?? [])
  if (serverOnly.length === 0) return null
  const subject = serverOnly.length === 1 ? `${serverOnly[0]} só existe` : `${serverOnly.join(", ")} só existem`
  return `${subject} na correção do servidor: o Executar e o terminal rodam no seu navegador e não conseguem importar. Use Verificar para rodar o código que depende disso.`
}
