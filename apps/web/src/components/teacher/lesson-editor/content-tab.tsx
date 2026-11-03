import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import { LessonContentPreview } from "@/components/editor/lesson-content-preview"
import { getErrorMessage, uploadImage } from "@/lib/api"

const EDITOR_MIN_HEIGHT_PX = 420

/** Envia a imagem colada/inserida no editor; o erro já sai com a mensagem para o professor. */
async function uploadContentImage(file: File): Promise<string> {
  try {
    return await uploadImage(file)
  } catch (error) {
    throw new Error(getErrorMessage(error, "Não foi possível enviar a imagem."))
  }
}

interface ContentTabProps {
  title: string
  moduleTitle: string
  content: string
  onChange: (html: string) => void
  onError: (message: string) => void
}

export function ContentTab({ title, moduleTitle, content, onChange, onError }: ContentTabProps): React.JSX.Element {
  const [isPreviewVisible, setIsPreviewVisible] = useState(true)

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
          onClick={() => setIsPreviewVisible((wasVisible) => !wasVisible)}
          className="flex items-center gap-2 rounded-xl border-2 border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-level-purple hover:text-level-purple"
        >
          {isPreviewVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {isPreviewVisible ? "Ocultar pré-visualização" : "Mostrar pré-visualização"}
        </button>
      </div>

      <div className={isPreviewVisible ? "grid gap-6 lg:grid-cols-2" : ""}>
        <div className="min-w-0">
          <RichTextEditor
            value={content}
            onChange={onChange}
            placeholder="Escreva o conteúdo da aula aqui. Use a barra de ferramentas para formatar texto, inserir imagens, emojis e blocos de código…"
            minHeight={EDITOR_MIN_HEIGHT_PX}
            onUploadImage={uploadContentImage}
            onUploadError={onError}
          />
        </div>

        {isPreviewVisible && (
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Eye className="h-3.5 w-3.5 text-level-purple" />
              Pré-visualização — como o aluno vê
            </div>
            <div className="min-h-[420px] rounded-2xl border-2 border-dashed border-level-purple/30 bg-[#FCFBFF] p-5">
              {moduleTitle && <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-level-purple">{moduleTitle}</p>}
              <h2 className="mb-4 text-xl font-bold leading-tight text-level-purple-dark">{title || "Título da lição"}</h2>
              <LessonContentPreview content={content} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
