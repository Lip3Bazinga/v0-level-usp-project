"use client"

import { useState, useMemo } from "react"
import {
  FolderOpen, Folder, FileText, FileCode, ChevronRight, ChevronDown,
  MoreHorizontal, FilePlus, Search, Pencil, Trash2,
} from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { ProjectFile } from "@/lib/supabase/types"
import { MAIN_FILE } from "@/contexts/ide-context"

// ── Árvore derivada dos paths ─────────────────────────────────────────────────

interface TreeNode {
  name: string
  path: string          // path completo (para arquivos) ou prefixo (para pastas)
  type: "file" | "folder"
  children: TreeNode[]
}

function buildTree(files: ProjectFile[]): TreeNode[] {
  const root: TreeNode = { name: "", path: "", type: "folder", children: [] }

  for (const file of files) {
    const segments = file.path.split("/").filter(Boolean)
    let node = root
    let acc = ""
    segments.forEach((seg, i) => {
      acc = acc ? `${acc}/${seg}` : seg
      const isFile = i === segments.length - 1
      let child = node.children.find((c) => c.name === seg && c.type === (isFile ? "file" : "folder"))
      if (!child) {
        child = { name: seg, path: acc, type: isFile ? "file" : "folder", children: [] }
        node.children.push(child)
      }
      node = child
    })
  }

  // Pastas antes de arquivos, ambos em ordem alfabética
  const sort = (nodes: TreeNode[]): TreeNode[] => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    nodes.forEach((n) => sort(n.children))
    return nodes
  }
  return sort(root.children)
}

const getFileIcon = (name: string) => {
  const ext = name.split(".").pop()?.toLowerCase()
  switch (ext) {
    case "py":   return <span className="text-xs">🐍</span>
    case "csv":  return <span className="text-xs">📊</span>
    case "json": return <span className="text-xs">📋</span>
    case "md":   return <span className="text-xs">📝</span>
    default:     return <FileText className="h-4 w-4 text-muted-foreground" />
  }
}

// ── Item da árvore ────────────────────────────────────────────────────────────

interface ItemProps {
  node: TreeNode
  level: number
  activePath: string
  readOnly: boolean
  onSelect: (path: string) => void
  onRename: (path: string) => void
  onDelete: (path: string) => void
}

function TreeItem({ node, level, activePath, readOnly, onSelect, onRename, onDelete }: ItemProps) {
  const [open, setOpen] = useState(true)
  const isFolder = node.type === "folder"
  const isActive = node.path === activePath
  const isMain = node.path === MAIN_FILE

  return (
    <div>
      <div
        onClick={() => (isFolder ? setOpen((v) => !v) : onSelect(node.path))}
        className={`group flex w-full cursor-pointer items-center gap-1 px-2 py-1.5 text-sm transition-colors hover:bg-level-purple-light ${
          isActive ? "bg-level-purple-light text-level-purple-dark" : "text-foreground"
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        {isFolder ? (
          <>
            {open ? <ChevronDown className="h-4 w-4 text-level-purple" /> : <ChevronRight className="h-4 w-4 text-level-purple" />}
            {open ? <FolderOpen className="h-4 w-4 text-level-purple" /> : <Folder className="h-4 w-4 text-level-purple" />}
          </>
        ) : (
          <>
            <span className="w-4" />
            {getFileIcon(node.name)}
          </>
        )}
        <span className="flex-1 truncate text-left">{node.name}</span>

        {!readOnly && !isFolder && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost" size="icon"
                className="h-5 w-5 opacity-0 group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => onRename(node.path)} disabled={isMain}>
                <Pencil className="mr-2 h-3.5 w-3.5" /> Renomear
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(node.path)} disabled={isMain}>
                <Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {isFolder && open && node.children.map((child) => (
        <TreeItem
          key={child.path}
          node={child}
          level={level + 1}
          activePath={activePath}
          readOnly={readOnly}
          onSelect={onSelect}
          onRename={onRename}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

interface FileExplorerProps {
  files: ProjectFile[]
  activePath: string
  onSelect: (path: string) => void
  onCreate?: (path: string) => { ok: boolean; error?: string }
  onRename?: (oldPath: string, newPath: string) => { ok: boolean; error?: string }
  onDelete?: (path: string) => { ok: boolean; error?: string }
  /** Sem operações de edição (modo leitura). */
  readOnly?: boolean
}

export function FileExplorer({
  files, activePath, onSelect, onCreate, onRename, onDelete, readOnly = false,
}: FileExplorerProps) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    if (!query.trim()) return files
    const q = query.toLowerCase()
    return files.filter((f) => f.path.toLowerCase().includes(q))
  }, [files, query])

  const tree = useMemo(() => buildTree(filtered), [filtered])

  const handleNewFile = () => {
    if (!onCreate) return
    const name = window.prompt("Nome do novo arquivo (ex: utils.py ou pasta/mod.py):")
    if (!name) return
    const res = onCreate(name)
    if (!res.ok) window.alert(res.error ?? "Não foi possível criar o arquivo.")
  }

  const handleRename = (path: string) => {
    if (!onRename) return
    const next = window.prompt("Novo nome do arquivo:", path)
    if (!next || next === path) return
    const res = onRename(path, next)
    if (!res.ok) window.alert(res.error ?? "Não foi possível renomear.")
  }

  const handleDelete = (path: string) => {
    if (!onDelete) return
    if (!window.confirm(`Excluir "${path}"? Esta ação não pode ser desfeita.`)) return
    const res = onDelete(path)
    if (!res.ok) window.alert(res.error ?? "Não foi possível excluir.")
  }

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-level-purple-dark">Arquivos</span>
        {!readOnly && onCreate && (
          <Button
            variant="ghost" size="icon"
            className="h-6 w-6 hover:bg-level-purple-light hover:text-level-purple"
            onClick={handleNewFile}
            title="Novo arquivo"
          >
            <FilePlus className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="border-b border-border p-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar..."
            className="h-7 bg-level-purple-subtle pl-7 text-xs border-0 focus-visible:ring-level-purple"
          />
        </div>
      </div>

      {/* Tree */}
      <ScrollArea className="flex-1">
        <div className="py-1">
          {tree.length === 0 ? (
            <p className="px-3 py-4 text-xs text-muted-foreground">Nenhum arquivo.</p>
          ) : (
            tree.map((node) => (
              <TreeItem
                key={node.path}
                node={node}
                level={0}
                activePath={activePath}
                readOnly={readOnly}
                onSelect={onSelect}
                onRename={handleRename}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-border px-3 py-2 bg-level-purple-subtle">
        <div className="flex items-center gap-2 text-xs text-level-purple-dark">
          <FileCode className="h-3.5 w-3.5 text-level-purple" />
          <span>{files.length} {files.length === 1 ? "arquivo" : "arquivos"}</span>
        </div>
      </div>
    </div>
  )
}
