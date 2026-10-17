import type { ProjectFile } from "@levelusp/contracts"

/** Nó da árvore de arquivos derivada dos paths de um projeto multi-arquivo. */
export interface TreeNode {
  name: string
  path: string
  type: "file" | "folder"
  children: TreeNode[]
}

/**
 * Árvore de pastas implícitas nos caminhos, ordenada com pastas antes de
 * arquivos e cada grupo em ordem alfabética.
 */
export function buildTree(files: ProjectFile[]): TreeNode[] {
  const root: TreeNode = { name: "", path: "", type: "folder", children: [] }

  for (const file of files) {
    const segments = file.path.split("/").filter(Boolean)
    let node = root
    let accumulatedPath = ""
    segments.forEach((segment, index) => {
      accumulatedPath = accumulatedPath ? `${accumulatedPath}/${segment}` : segment
      const isFile = index === segments.length - 1
      let child = node.children.find(
        (candidate) => candidate.name === segment && candidate.type === (isFile ? "file" : "folder"),
      )
      if (!child) {
        child = { name: segment, path: accumulatedPath, type: isFile ? "file" : "folder", children: [] }
        node.children.push(child)
      }
      node = child
    })
  }

  const sortNodes = (nodes: TreeNode[]): TreeNode[] => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    nodes.forEach((node) => sortNodes(node.children))
    return nodes
  }
  return sortNodes(root.children)
}
