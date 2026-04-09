"use client"

import { useState } from "react"
import {
  FolderOpen,
  Folder,
  FileText,
  FileCode,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Plus,
  Search,
} from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface FileItem {
  id: string
  name: string
  type: "file" | "folder"
  children?: FileItem[]
  language?: string
}

interface FileExplorerProps {
  files: FileItem[]
  activeFileId: string
  onFileSelect: (fileId: string) => void
}

const getFileIcon = (name: string, type: string) => {
  if (type === "folder") return null
  
  const ext = name.split(".").pop()?.toLowerCase()
  switch (ext) {
    case "py":
      return <span className="text-xs">🐍</span>
    case "csv":
      return <span className="text-xs">📊</span>
    case "json":
      return <span className="text-xs">📋</span>
    case "md":
      return <span className="text-xs">📝</span>
    default:
      return <FileText className="h-4 w-4 text-muted-foreground" />
  }
}

function FileTreeItem({
  item,
  level = 0,
  activeFileId,
  onFileSelect,
}: {
  item: FileItem
  level?: number
  activeFileId: string
  onFileSelect: (fileId: string) => void
}) {
  const [isOpen, setIsOpen] = useState(true)
  const isFolder = item.type === "folder"
  const isActive = item.id === activeFileId

  return (
    <div>
      <button
        onClick={() => {
          if (isFolder) {
            setIsOpen(!isOpen)
          } else {
            onFileSelect(item.id)
          }
        }}
        className={`group flex w-full items-center gap-1 px-2 py-1 text-sm transition-colors hover:bg-secondary ${
          isActive ? "bg-primary/10 text-primary" : "text-foreground"
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        {isFolder ? (
          <>
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            {isOpen ? (
              <FolderOpen className="h-4 w-4 text-accent" />
            ) : (
              <Folder className="h-4 w-4 text-accent" />
            )}
          </>
        ) : (
          <>
            <span className="w-4" />
            {getFileIcon(item.name, item.type)}
          </>
        )}
        <span className="flex-1 truncate text-left">{item.name}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 opacity-0 group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem>Renomear</DropdownMenuItem>
            <DropdownMenuItem>Duplicar</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">Excluir</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </button>
      {isFolder && isOpen && item.children && (
        <div>
          {item.children.map((child) => (
            <FileTreeItem
              key={child.id}
              item={child}
              level={level + 1}
              activeFileId={activeFileId}
              onFileSelect={onFileSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function FileExplorer({ files, activeFileId, onFileSelect }: FileExplorerProps) {
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <div className="flex h-full flex-col bg-sidebar">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-sidebar-border px-3 py-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Arquivos
        </span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="border-b border-sidebar-border p-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar..."
            className="h-7 bg-sidebar-accent pl-7 text-xs"
          />
        </div>
      </div>

      {/* File tree */}
      <ScrollArea className="flex-1">
        <div className="py-1">
          {files.map((file) => (
            <FileTreeItem
              key={file.id}
              item={file}
              activeFileId={activeFileId}
              onFileSelect={onFileSelect}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-sidebar-border px-3 py-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileCode className="h-3.5 w-3.5" />
          <span>3 arquivos</span>
        </div>
      </div>
    </div>
  )
}
