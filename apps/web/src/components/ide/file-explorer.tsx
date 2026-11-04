"use client"

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react"
import {
  FolderOpen, Folder, FileText, FileCode, ChevronRight, ChevronDown,
  MoreHorizontal, FilePlus, FolderPlus, Search, Pencil, Trash2, X,
} from "lucide-react"
import type { ProjectFile } from "@levelusp/contracts"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MAIN_FILE_PATH } from "@/lib/constants"
import { buildTree, type FileOperationResult, type TreeNode, cn } from "@/lib/utils"
import { swalConfirm, swalWarning } from "@/lib/swal"
import { toNewFilePath, toNewFolderPlaceholderPath, toRenamedPath } from "./file-explorer-paths"

type FileDialogMode = "create-file" | "create-folder" | "rename"

type FileOperation<TArgs extends unknown[]> = (...args: TArgs) => FileOperationResult

const FILE_EMOJIS: Record<string, string> = { py: "🐍", csv: "📊", json: "📋", md: "📝" }
const TREE_INDENT_PX = 12
const TREE_BASE_PADDING_PX = 8

const DIALOG_COPY: Record<FileDialogMode, { title: string; icon: ReactNode; placeholder: string }> = {
  "create-file": {
    title: "Novo Arquivo",
    icon: <FilePlus className="h-5 w-5 text-level-purple" />,
    placeholder: "ex: utils.py ou pasta/helpers.py",
  },
  "create-folder": {
    title: "Nova Pasta",
    icon: <FolderPlus className="h-5 w-5 text-level-purple" />,
    placeholder: "ex: modelos",
  },
  rename: {
    title: "Renomear",
    icon: <Pencil className="h-5 w-5 text-level-purple" />,
    placeholder: "Novo nome",
  },
}

function FileIcon({ name }: { name: string }) {
  const extension = name.split(".").pop()?.toLowerCase() ?? ""
  const emoji = FILE_EMOJIS[extension]
  return emoji ? <span className="text-xs">{emoji}</span> : <FileText className="h-4 w-4 text-muted-foreground" />
}

interface FileDialogProps {
  mode: FileDialogMode
  initialValue: string
  onConfirm: (value: string) => void
  onClose: () => void
}

function FileDialog({ mode, initialValue, onConfirm, onClose }: FileDialogProps) {
  const [value, setValue] = useState(initialValue)
  const inputRef = useRef<HTMLInputElement>(null)
  const copy = DIALOG_COPY[mode]

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const trimmedValue = value.trim()
    if (trimmedValue) onConfirm(trimmedValue)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="mx-4 w-full max-w-sm rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-level-purple-light">{copy.icon}</div>
            <h3 className="text-sm font-bold text-level-purple-dark">{copy.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-gray-100 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={copy.placeholder}
            className="w-full rounded-xl border-2 border-border bg-level-purple-subtle/30 px-4 py-3 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus:border-level-purple focus:outline-none"
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
              className="flex-1 rounded-xl border-2 border-border py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-level-purple hover:text-level-purple"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!value.trim()}
              className="btn-3d flex-1 rounded-xl bg-level-purple py-2.5 text-sm font-semibold text-white transition-colors hover:bg-level-purple-dark disabled:opacity-50"
            >
              Confirmar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface TreeItemProps {
  node: TreeNode
  depth: number
  activePath: string
  isReadOnly: boolean
  onSelect: (path: string) => void
  onRename: (node: TreeNode) => void
  onDelete: (path: string) => void
}

function TreeItem({ node, depth, activePath, isReadOnly, onSelect, onRename, onDelete }: TreeItemProps) {
  const [isOpen, setIsOpen] = useState(true)
  const isFolder = node.type === "folder"
  const isActive = node.path === activePath
  const isMainFile = node.path === MAIN_FILE_PATH

  return (
    <div>
      <div
        onClick={() => (isFolder ? setIsOpen((current) => !current) : onSelect(node.path))}
        className={cn(
          "group flex w-full cursor-pointer items-center gap-1 px-2 py-1.5 text-sm transition-colors hover:bg-level-purple-light",
          isActive ? "bg-level-purple-light text-level-purple-dark" : "text-foreground",
        )}
        style={{ paddingLeft: `${depth * TREE_INDENT_PX + TREE_BASE_PADDING_PX}px` }}
      >
        {isFolder ? (
          <>
            {isOpen ? <ChevronDown className="h-4 w-4 text-level-purple" /> : <ChevronRight className="h-4 w-4 text-level-purple" />}
            {isOpen ? <FolderOpen className="h-4 w-4 text-level-purple" /> : <Folder className="h-4 w-4 text-level-purple" />}
          </>
        ) : (
          <>
            <span className="w-4" />
            <FileIcon name={node.name} />
          </>
        )}
        <span className="flex-1 truncate text-left">{node.name}</span>

        {!isReadOnly && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Ações de ${node.name}`}
                className="h-5 w-5 opacity-0 focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
                onClick={(event) => event.stopPropagation()}
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => onRename(node)} disabled={isMainFile && !isFolder}>
                <Pencil className="mr-2 h-3.5 w-3.5" /> Renomear
              </DropdownMenuItem>
              {!isFolder && (
                <DropdownMenuItem className="text-destructive" onClick={() => onDelete(node.path)} disabled={isMainFile}>
                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {isFolder &&
        isOpen &&
        node.children.map((child) => (
          <TreeItem
            key={child.path}
            node={child}
            depth={depth + 1}
            activePath={activePath}
            isReadOnly={isReadOnly}
            onSelect={onSelect}
            onRename={onRename}
            onDelete={onDelete}
          />
        ))}
    </div>
  )
}

interface FileExplorerProps {
  files: ProjectFile[]
  activePath: string
  onSelect: (path: string) => void
  onCreate?: FileOperation<[path: string]>
  onRename?: FileOperation<[oldPath: string, newPath: string]>
  onDelete?: FileOperation<[path: string]>
  isReadOnly?: boolean
}

interface OpenDialog {
  mode: FileDialogMode
  /** Item sendo renomeado. */
  node?: TreeNode
}

export function FileExplorer({ files, activePath, onSelect, onCreate, onRename, onDelete, isReadOnly = false }: FileExplorerProps) {
  const [searchText, setSearchText] = useState("")
  const [dialog, setDialog] = useState<OpenDialog | null>(null)
  const [operationError, setOperationError] = useState<string | null>(null)

  const tree = useMemo(() => {
    const query = searchText.trim().toLowerCase()
    return buildTree(query ? files.filter((file) => file.path.toLowerCase().includes(query)) : files)
  }, [files, searchText])

  const openDialog = (mode: FileDialogMode, node?: TreeNode) => {
    setOperationError(null)
    setDialog({ mode, node })
  }

  /** Fecha o diálogo, ou mostra o motivo da recusa e o mantém aberto. */
  const finishOperation = (result: FileOperationResult | undefined) => {
    if (result && !result.ok) {
      setOperationError(result.error)
      return
    }
    setDialog(null)
  }

  const handleDialogConfirm = (value: string) => {
    if (!dialog) return
    const { mode, node } = dialog
    if (mode === "create-file") {
      finishOperation(onCreate?.(toNewFilePath(value)))
    } else if (mode === "create-folder") {
      finishOperation(onCreate?.(toNewFolderPlaceholderPath(value)))
    } else if (node) {
      const newPath = toRenamedPath(node, value)
      finishOperation(newPath === node.path ? undefined : onRename?.(node.path, newPath))
    }
  }

  const handleDelete = async (path: string) => {
    if (!onDelete) return
    const isConfirmed = await swalConfirm({
      title: `Excluir "${path}"?`,
      text: "Esta ação não pode ser desfeita.",
      confirmText: "Excluir",
      danger: true,
    })
    if (!isConfirmed) return
    const result = onDelete(path)
    if (!result.ok) void swalWarning({ title: "Não foi possível excluir", text: result.error })
  }

  return (
    <div className="relative flex h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-level-purple-dark">Arquivos</span>
        {!isReadOnly && onCreate && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:bg-level-purple-light hover:text-level-purple"
              onClick={() => openDialog("create-file")}
              title="Novo arquivo"
            >
              <FilePlus className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:bg-level-purple-light hover:text-level-purple"
              onClick={() => openDialog("create-folder")}
              title="Nova pasta"
            >
              <FolderPlus className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      <div className="border-b border-border p-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Buscar..."
            className="h-7 border-0 bg-level-purple-subtle pl-7 text-xs focus-visible:ring-level-purple"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="py-1">
          {tree.length === 0 ? (
            <p className="px-3 py-4 text-xs text-muted-foreground">Nenhum arquivo.</p>
          ) : (
            tree.map((node) => (
              <TreeItem
                key={node.path}
                node={node}
                depth={0}
                activePath={activePath}
                isReadOnly={isReadOnly}
                onSelect={onSelect}
                onRename={(renamedNode) => openDialog("rename", renamedNode)}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </ScrollArea>

      <div className="border-t border-border bg-level-purple-subtle px-3 py-2">
        <div className="flex items-center gap-2 text-xs text-level-purple-dark">
          <FileCode className="h-3.5 w-3.5 text-level-purple" />
          <span>
            {files.length} {files.length === 1 ? "arquivo" : "arquivos"}
          </span>
        </div>
      </div>

      {dialog && (
        <FileDialog
          mode={dialog.mode}
          initialValue={dialog.node?.name ?? ""}
          onConfirm={handleDialogConfirm}
          onClose={() => setDialog(null)}
        />
      )}

      {operationError && (
        <div className="absolute bottom-14 left-2 right-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {operationError}
          <button onClick={() => setOperationError(null)} className="ml-2 underline">
            ok
          </button>
        </div>
      )}
    </div>
  )
}
