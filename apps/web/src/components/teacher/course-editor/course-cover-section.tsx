"use client"

import { useRef, type ChangeEvent } from "react"
import { ImageIcon, Loader2, Trash2, Upload } from "lucide-react"
import { EditorSection } from "./editor-section"

const ACCEPTED_IMAGE_TYPES = "image/png,image/jpeg,image/webp"

interface CourseCoverSectionProps {
  coverPreview: string | null
  isUploading: boolean
  onSelectFile: (file: File) => void
  onRemove: () => void
}

export function CourseCoverSection({ coverPreview, isUploading, onSelectFile, onRemove }: CourseCoverSectionProps): React.JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const openFilePicker = (): void => fileInputRef.current?.click()

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0]
    // Limpa o campo para que escolher o mesmo arquivo de novo dispare outro envio.
    event.target.value = ""
    if (file) onSelectFile(file)
  }

  return (
    <EditorSection icon={ImageIcon} title="Imagem de Capa" subtitle="Banner do curso e cards do catálogo">
      <input ref={fileInputRef} type="file" accept={ACCEPTED_IMAGE_TYPES} className="hidden" onChange={handleFileChange} />
      {coverPreview ? (
        <div className="group relative overflow-hidden rounded-xl border-2 border-border">
          {/* eslint-disable-next-line @next/next/no-img-element -- prévia local (blob:) ou capa enviada, sem domínio fixo para o next/image */}
          <img src={coverPreview} alt="Capa" className="h-48 w-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={openFilePicker}
              className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-gray-900"
            >
              <Upload className="h-3.5 w-3.5" /> Trocar
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white"
            >
              <Trash2 className="h-3.5 w-3.5" /> Remover
            </button>
          </div>
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={openFilePicker}
          className="flex h-44 w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/30 transition-colors hover:border-level-purple hover:bg-level-purple-subtle"
        >
          {isUploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-level-purple" />
          ) : (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-level-purple-light">
                <Upload className="h-6 w-6 text-level-purple" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-level-purple-dark">Clique para fazer upload</p>
                <p className="text-xs text-muted-foreground">PNG, JPG ou WebP • máx. 5MB</p>
              </div>
            </>
          )}
        </button>
      )}
    </EditorSection>
  )
}
