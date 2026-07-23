"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import {
  FolderOpen, Folder, FileText, FileCode, ChevronRight, ChevronDown,
  MoreHorizontal, FilePlus, FolderPlus, Search, Pencil, Trash2, X,
} from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { ProjectFile } from "@/lib/types"
import { MAIN_FILE } from "@/contexts/ide-context"
import { buildTree, type TreeNode } from "@/lib/utils/file-tree"

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

// ── Modal estilizado ──────────────────────────────────────────────────────────

type ModalMode = "create-file" | "create-folder" | "rename" | null

interface FileModalProps {
  mode: ModalMode
  initialValue?: string
  onConfirm: (value: string) => void
  onClose: () => void
}

function FileModal({ mode, initialValue = "", onConfirm, onClose }: FileModalProps) {
  const [value, setValue] = useState(initialValue)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  if (!mode) return null

  const titles: Record<NonNullable<ModalMode>, string> = {
    "create-file":   "Novo Arquivo",
    "create-folder": "Nova Pasta",
    "rename":        "Renomear",
  }
  const icons: Record<NonNullable<ModalMode>, React.ReactNode> = {
    "create-file":   <FilePlus className="h-5 w-5 text-level-purple" />,
    "create-folder": <FolderPlus className="h-5 w-5 text-level-purple" />,
    "rename":        <Pencil className="h-5 w-5 text-level-purple" />,
  }
  const placeholders: Record<NonNullable<ModalMode>, string> = {
    "create-file":   "ex: utils.py ou pasta/helpers.py",
    "create-folder": "ex: modelos",
    "rename":        "Novo nome",
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const v = value.trim()
    if (v) onConfirm(v)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-4 w-full max-w-sm rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-level-purple-light">
              {icons[mode]}
            </div>
            <h3 className="text-sm font-bold text-level-purple-dark">{titles[mode]}</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-gray-100 hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholders[mode]}
            className="w-full rounded-xl border-2 border-border bg-level-purple-subtle/30 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-level-purple focus:outline-none transition-colors"
          />
          {mode === "create-file" && (
            <p className="mt-2 text-xs text-muted-foreground">
              Use <code className="text-level-purple">/</code> para subpastas:{" "}
              <code className="text-level-purple">pasta/arquivo.py</code>
            </p>
          )}

          <div className="mt-4 flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border-2 border-border py-2.5 text-sm font-medium text-muted-foreground hover:border-level-purple hover:text-level-purple transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!value.trim()}
              className="btn-3d flex-1 rounded-xl bg-level-purple py-2.5 text-sm font-semibold text-white hover:bg-level-purple-medium transition-colors disabled:opacity-50"
            >
              Confirmar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Item da árvore ────────────────────────────────────────────────────────────

interface ItemProps {
  node: TreeNode
  level: number
  activePath: string
  readOnly: boolean
  onSelect: (path: string) => void
  onRename: (node: TreeNode) => void
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

        {!readOnly && (
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
              <DropdownMenuItem onClick={() => onRename(node)} disabled={isMain && !isFolder}>
                <Pencil className="mr-2 h-3.5 w-3.5" /> Renomear
              </DropdownMenuItem>
              {!isFolder && (
                <DropdownMenuItem className="text-destructive" onClick={() => onDelete(node.path)} disabled={isMain}>
                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir
                </DropdownMenuItem>
              )}
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
  readOnly?: boolean
}

export function FileExplorer({
  files, activePath, onSelect, onCreate, onRename, onDelete, readOnly = false,
}: FileExplorerProps) {
  const [query, setQuery] = useState("")
  const [modal, setModal] = useState<{ mode: ModalMode; node?: TreeNode }>({ mode: null })
  const [modalError, setModalError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!query.trim()) return files
    const q = query.toLowerCase()
    return files.filter((f) => f.path.toLowerCase().includes(q))
  }, [files, query])

  const tree = useMemo(() => buildTree(filtered), [filtered])

  const openModal = (mode: ModalMode, node?: TreeNode) => {
    setModalError(null)
    setModal({ mode, node })
  }

  const handleModalConfirm = (value: string) => {
    const { mode, node } = modal

    if (mode === "create-file") {
      if (!onCreate) return
      const path = value.trim().replace(/^\/+/, "")
      const res = onCreate(path)
      if (!res.ok) { setModalError(res.error ?? "Não foi possível criar o arquivo."); return }
    }

    if (mode === "create-folder") {
      if (!onCreate) return
      const folderPath = value.trim().replace(/^\/+/, "").replace(/\/+$/, "")
      const res = onCreate(`${folderPath}/.gitkeep`)
      if (!res.ok) { setModalError(res.error ?? "Não foi possível criar a pasta."); return }
    }

    if (mode === "rename" && node) {
      if (!onRename) return
      const oldPath = node.path
      let newPath: string

      if (node.type === "folder") {
        const newFolderName = value.trim().replace(/\/+/g, "")
        const parts = oldPath.split("/")
        parts[parts.length - 1] = newFolderName
        newPath = parts.join("/")
      } else {
        const parent = oldPath.includes("/") ? oldPath.split("/").slice(0, -1).join("/") : ""
        newPath = parent ? `${parent}/${value.trim()}` : value.trim()
      }

      if (newPath === oldPath) { setModal({ mode: null }); return }
      const res = onRename(oldPath, newPath)
      if (!res.ok) { setModalError(res.error ?? "Não foi possível renomear."); return }
    }

    setModal({ mode: null })
  }

  const handleDelete = (path: string) => {
    if (!onDelete) return
    if (!window.confirm(`Excluir "${path}"? Esta ação não pode ser desfeita.`)) return
    const res = onDelete(path)
    if (!res.ok) window.alert(res.error ?? "Não foi possível excluir.")
  }

  return (
    <div className="relative flex h-full flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-level-purple-dark">Arquivos</span>
        {!readOnly && (
          <div className="flex items-center gap-1">
            {onCreate && (
              <>
                <Button
                  variant="ghost" size="icon"
                  className="h-6 w-6 hover:bg-level-purple-light hover:text-level-purple"
                  onClick={() => openModal("create-file")}
                  title="Novo arquivo"
                >
                  <FilePlus className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost" size="icon"
                  className="h-6 w-6 hover:bg-level-purple-light hover:text-level-purple"
                  onClick={() => openModal("create-folder")}
                  title="Nova pasta"
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
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
                onRename={(n) => openModal("rename", n)}
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

      {/* Modal */}
      {modal.mode && (
        <FileModal
          mode={modal.mode}
          initialValue={modal.node?.name ?? ""}
          onConfirm={handleModalConfirm}
          onClose={() => setModal({ mode: null })}
        />
      )}

      {/* Erro inline */}
      {modalError && (
        <div className="absolute bottom-14 left-2 right-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {modalError}
          <button onClick={() => setModalError(null)} className="ml-2 underline">ok</button>
        </div>
      )}
    </div>
  )
}
