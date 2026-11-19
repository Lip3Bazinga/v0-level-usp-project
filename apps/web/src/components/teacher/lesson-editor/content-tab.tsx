import { RichTextEditor } from "@/components/editor/rich-text-editor"
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
  content: string
  onChange: (html: string) => void
  onError: (message: string) => void
}

/**
 * Aba de conteúdo da aula. A pré-visualização não fica mais aqui: é o painel de prévia da tela
 * (`LessonPreviewPane`), que mostra a aula como o aluno vê, ao lado do editor.
 */
export function ContentTab({ content, onChange, onError }: ContentTabProps): React.JSX.Element {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-level-purple-dark">Conteúdo da aula</h2>
        <p className="text-sm text-muted-foreground">Escreva aqui; a prévia ao lado mostra como o aluno verá a aula.</p>
      </div>
      <RichTextEditor
        value={content}
        onChange={onChange}
        placeholder="Escreva o conteúdo da aula aqui. Use a barra de ferramentas para formatar texto, inserir imagens, emojis e blocos de código…"
        minHeight={EDITOR_MIN_HEIGHT_PX}
        onUploadImage={uploadContentImage}
        onUploadError={onError}
      />
    </div>
  )
}
