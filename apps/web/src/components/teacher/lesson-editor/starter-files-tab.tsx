import { useState } from "react"
import { Code2, Plus, X } from "lucide-react"
import type { ProjectFile } from "@levelusp/contracts"
import { isValidStarterPath } from "./lesson-form"
import { addButtonClass, EditorPanel } from "./panel"

const FILE_ICON: Record<string, string> = { py: "🐍", txt: "📄", csv: "📊", json: "🧾", md: "📝" }

export function StarterFilesTab({ files, onChange, onError }: {
  files: ProjectFile[]
  onChange: (files: ProjectFile[]) => void
  onError: (message: string) => void
}) {
  const list = files.length ? files : [{ path: "main.py", content: "" }]
  const [activePath, setActivePath] = useState("main.py")
  const active = list.find((f) => f.path === activePath) ?? list[0]!

  const add = () => {
    const name = window.prompt("Nome do arquivo (ex: utils.py, dados.csv ou pasta/mod.py):")
    if (!name) return
    const path = name.trim().replace(/^\/+/, "")
    if (!isValidStarterPath(path)) {
      onError("Nome de arquivo inválido. Use letras, números, _ - / e termine com .py, .txt, .csv, .json ou .md.")
      return
    }
    if (list.some((f) => f.path === path)) {
      onError("Já existe um arquivo com esse nome.")
      return
    }
    if (list.length >= 30) {
      onError("Limite de 30 arquivos por exercício.")
      return
    }
    onChange([...list, { path, content: "" }])
    setActivePath(path)
  }

  const remove = (path: string) => {
    if (path === "main.py") return
    onChange(list.filter((f) => f.path !== path))
    setActivePath("main.py")
  }

  return (
    <EditorPanel
      icon={Code2}
      title="Arquivos do Exercício"
      subtitle="Arquivos que o aluno recebe ao abrir a lição (main.py é obrigatório)"
      action={
        <button type="button" onClick={add} className={addButtonClass}>
          <Plus className="h-4 w-4" /> Arquivo
        </button>
      }
    >
      <div className="overflow-hidden rounded-xl border-2 border-border">
        <div className="flex items-center overflow-x-auto bg-[#1E1E2E] px-2 pt-2">
          {list.map((f) => (
            <div
              key={f.path}
              onClick={() => setActivePath(f.path)}
              className={`group flex cursor-pointer items-center gap-2 rounded-t-lg px-3 py-1.5 text-xs transition-colors ${
                f.path === active.path ? "bg-[#2d2d3d] text-white" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <span>{FILE_ICON[f.path.split(".").pop() ?? ""] ?? "📄"}</span>
              <span>{f.path}</span>
              {f.path !== "main.py" && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    remove(f.path)
                  }}
                  className="rounded p-0.5 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  title="Remover arquivo"
                  aria-label={`Remover ${f.path}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
        <textarea
          aria-label={`Conteúdo de ${active.path}`}
          value={active.content}
          onChange={(e) => onChange(list.map((f) => (f.path === active.path ? { ...f, content: e.target.value } : f)))}
          rows={14}
          spellCheck={false}
          className="w-full resize-y border-0 bg-[#1E1E2E] px-4 py-3 font-mono text-sm text-gray-300 focus:outline-none"
        />
      </div>
    </EditorPanel>
  )
}
