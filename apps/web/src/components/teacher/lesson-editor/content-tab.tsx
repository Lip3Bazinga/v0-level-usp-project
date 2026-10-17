import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import { LessonContentPreview } from "@/components/editor/lesson-content-preview"
import { errorMessage, uploadImage } from "@/lib/api"

export function ContentTab({ title, module, content, onChange, onError }: {
  title: string
  module: string
  content: string
  onChange: (html: string) => void
  onError: (message: string) => void
}) {
  const [showPreview, setShowPreview] = useState(true)

  const upload = async (file: File) => {
    try {
      return await uploadImage(file)
    } catch (err) {
      throw new Error(errorMessage(err, "Não foi possível enviar a imagem."))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-level-purple-dark">Conteúdo da aula</h2>
          <p className="text-sm text-muted-foreground">
            Escreva à esquerda; a pré-visualização mostra exatamente como o aluno verá.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          className="flex items-center gap-2 rounded-xl border-2 border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-level-purple hover:text-level-purple"
        >
          {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {showPreview ? "Ocultar pré-visualização" : "Mostrar pré-visualização"}
        </button>
      </div>

      <div className={showPreview ? "grid gap-6 lg:grid-cols-2" : ""}>
        <div className="min-w-0">
          <RichTextEditor
            value={content}
            onChange={onChange}
            placeholder="Escreva o conteúdo da aula aqui. Use a barra de ferramentas para formatar texto, inserir imagens, emojis e blocos de código…"
            minHeight={420}
            onUploadImage={upload}
            onUploadError={onError}
          />
        </div>

        {showPreview && (
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Eye className="h-3.5 w-3.5 text-level-purple" />
              Pré-visualização — como o aluno vê
            </div>
            <div className="min-h-[420px] rounded-2xl border-2 border-dashed border-level-purple/30 bg-[#FCFBFF] p-5">
              {module && <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-level-purple">{module}</p>}
              <h2 className="mb-4 text-xl font-bold leading-tight text-level-purple-dark">{title || "Título da lição"}</h2>
              <LessonContentPreview content={content} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
