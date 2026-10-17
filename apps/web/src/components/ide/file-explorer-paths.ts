import type { TreeNode } from "@/lib/utils"

/** Arquivo vazio que materializa uma pasta (o projeto só guarda arquivos). */
const FOLDER_PLACEHOLDER_FILE = ".gitkeep"

const LEADING_SLASHES = /^\/+/
const TRAILING_SLASHES = /\/+$/

/** Caminho digitado para um novo arquivo, sem barra inicial. */
export function toNewFilePath(input: string): string {
  return input.trim().replace(LEADING_SLASHES, "")
}

/** Caminho do arquivo-marcador de uma nova pasta. */
export function toNewFolderPlaceholderPath(input: string): string {
  const folderPath = input.trim().replace(LEADING_SLASHES, "").replace(TRAILING_SLASHES, "")
  return `${folderPath}/${FOLDER_PLACEHOLDER_FILE}`
}

/**
 * Novo caminho ao renomear: o item continua na mesma pasta-mãe. No nome de pasta as
 * barras são descartadas (renomear não move a pasta).
 */
export function toRenamedPath(node: Pick<TreeNode, "path" | "type">, input: string): string {
  const segments = node.path.split("/")
  const newName = node.type === "folder" ? input.trim().replace(/\/+/g, "") : input.trim()
  return [...segments.slice(0, -1), newName].join("/")
}
