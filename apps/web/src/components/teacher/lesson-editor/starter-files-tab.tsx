import { useState } from "react"
import { Code2, Plus, X } from "lucide-react"
import type { ProjectFile } from "@levelusp/contracts"
import { MAIN_FILE_PATH } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { isValidStarterPath } from "./lesson-form"
import { ADD_BUTTON_CLASS, EditorPanel } from "./panel"

const MAX_STARTER_FILES = 30
const DEFAULT_FILE_ICON = "📄"
const FILE_ICONS: Record<string, string> = { py: "🐍", txt: "📄", csv: "📊", json: "🧾", md: "📝" }

function fileIcon(path: string): string {
  return FILE_ICONS[path.split(".").pop() ?? ""] ?? DEFAULT_FILE_ICON
}

/** Erro ao adicionar `path`, ou `null` quando pode. */
function validateNewFile(path: string, files: ProjectFile[]): string | null {
  if (!isValidStarterPath(path)) return "Nome de arquivo inválido. Use letras, números, _ - / e termine com .py, .txt, .csv, .json ou .md."
  if (files.some((file) => file.path === path)) return "Já existe um arquivo com esse nome."
  if (files.length >= MAX_STARTER_FILES) return "Limite de 30 arquivos por exercício."
  return null
}

interface StarterFilesTabProps {
  files: ProjectFile[]
  onChange: (files: ProjectFile[]) => void
  onError: (message: string) => void
}

export function StarterFilesTab({ files, onChange, onError }: StarterFilesTabProps) {
  const fileList = files.length ? files : [{ path: MAIN_FILE_PATH, content: "" }]
  const [activePath, setActivePath] = useState(MAIN_FILE_PATH)
  const activeFile = fileList.find((file) => file.path === activePath) ?? fileList[0]

  const handleAdd = () => {
    const name = window.prompt("Nome do arquivo (ex: utils.py, dados.csv ou pasta/mod.py):")
    if (!name) return
    const path = name.trim().replace(/^\/+/, "")
    const problem = validateNewFile(path, fileList)
    if (problem) {
      onError(problem)
      return
    }
    onChange([...fileList, { path, content: "" }])
    setActivePath(path)
  }

  const handleRemove = (path: string) => {
    if (path === MAIN_FILE_PATH) return
    onChange(fileList.filter((file) => file.path !== path))
    setActivePath(MAIN_FILE_PATH)
  }

  const handleContentChange = (content: string) =>
    onChange(fileList.map((file) => (file.path === activeFile.path ? { ...file, content } : file)))

  return (
    <EditorPanel
      icon={Code2}
      title="Arquivos do Exercício"
      subtitle="Arquivos que o aluno recebe ao abrir a lição (main.py é obrigatório)"
      action={
        <button type="button" onClick={handleAdd} className={ADD_BUTTON_CLASS}>
          <Plus className="h-4 w-4" /> Arquivo
        </button>
      }
    >
      <div className="overflow-hidden rounded-xl border-2 border-border">
        <div className="flex items-center overflow-x-auto bg-[#1E1E2E] px-2 pt-2">
          {fileList.map((file) => (
            <div
              key={file.path}
              onClick={() => setActivePath(file.path)}
              className={cn(
                "group flex cursor-pointer items-center gap-2 rounded-t-lg px-3 py-1.5 text-xs transition-colors",
                file.path === activeFile.path ? "bg-[#2d2d3d] text-white" : "text-gray-400 hover:text-gray-200",
              )}
            >
              <span>{fileIcon(file.path)}</span>
              <span>{file.path}</span>
              {file.path !== MAIN_FILE_PATH && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    handleRemove(file.path)
                  }}
                  className="rounded p-0.5 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  title="Remover arquivo"
                  aria-label={`Remover ${file.path}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
        <textarea
          aria-label={`Conteúdo de ${activeFile.path}`}
          value={activeFile.content}
          onChange={(event) => handleContentChange(event.target.value)}
          rows={14}
          spellCheck={false}
          className="w-full resize-y border-0 bg-[#1E1E2E] px-4 py-3 font-mono text-sm text-gray-300 focus:outline-none"
        />
      </div>
    </EditorPanel>
  )
}
