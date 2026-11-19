"use client"

import { useId, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { ArrowLeft, Eye, EyeOff, PanelRight } from "lucide-react"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useModalA11y } from "@/hooks/use-modal-a11y"
import {
  clampPreviewWidth, PREVIEW_WIDTH_MAX, PREVIEW_WIDTH_MIN, readPreviewHidden, readPreviewWidth, writePreviewHidden, writePreviewWidth,
} from "@/lib/utils/preview-layout"
import { ADD_BUTTON_CLASS } from "../panel"

/** A partir desta largura a prévia fica ao lado do editor; abaixo, abre em tela cheia. */
const SIDE_BY_SIDE_QUERY = "(min-width: 1280px)"
/** Quanto cada seta do teclado move o divisor, em pontos percentuais. */
const KEYBOARD_STEP = 5

interface PreviewSplitLayoutProps {
  /** Conteúdo do editor (abas, formulário). Sempre renderizado, na mesma posição da árvore. */
  editor: ReactNode
  /** Prévia da aula. Renderizada UMA vez: ao lado (≥ 1280 px), na tela cheia (< 1280 px) ou nenhuma (escondida/fechada). */
  preview: ReactNode
}

/**
 * Layout da tela de edição de lição com prévia.
 * - ≥ 1280 px: editor à esquerda e prévia à direita, com divisor arrastável (ou por teclado) e botão
 *   para esconder a prévia; largura e preferência ficam no `localStorage`.
 * - < 1280 px: só o editor, com o botão "Pré-visualizar" que abre a prévia em tela cheia
 *   (diálogo modal com "Voltar ao editor").
 */
export function PreviewSplitLayout({ editor, preview }: PreviewSplitLayoutProps): React.JSX.Element {
  const isSideBySide = useMediaQuery(SIDE_BY_SIDE_QUERY)
  const [isHidden, setIsHidden] = useState(readPreviewHidden)
  const [editorWidth, setEditorWidth] = useState(readPreviewWidth)
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false)
  const rowRef = useRef<HTMLDivElement>(null)
  const dragWidthRef = useRef<number | null>(null)
  const editorId = useId()
  const previewId = useId()

  // Ao alargar a janela a tela cheia não faz mais sentido; fechar evita reabri-la ao estreitar de novo.
  if (isSideBySide && isFullscreenOpen) setIsFullscreenOpen(false)

  const toggleHidden = (): void => {
    const next = !isHidden
    setIsHidden(next)
    writePreviewHidden(next)
  }

  const commitWidth = (width: number): void => {
    const clamped = clampPreviewWidth(width)
    setEditorWidth(clamped)
    writePreviewWidth(clamped)
  }

  const handleSeparatorKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === "ArrowLeft") commitWidth(editorWidth - KEYBOARD_STEP)
    else if (event.key === "ArrowRight") commitWidth(editorWidth + KEYBOARD_STEP)
    else if (event.key === "Home") commitWidth(PREVIEW_WIDTH_MIN)
    else if (event.key === "End") commitWidth(PREVIEW_WIDTH_MAX)
    else return
    event.preventDefault()
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    event.currentTarget.setPointerCapture(event.pointerId)
    dragWidthRef.current = editorWidth
    event.preventDefault()
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    const row = rowRef.current
    if (dragWidthRef.current === null || !row) return
    const bounds = row.getBoundingClientRect()
    if (bounds.width <= 0) return
    const width = clampPreviewWidth(((event.clientX - bounds.left) / bounds.width) * 100)
    dragWidthRef.current = width
    setEditorWidth(width)
  }

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>): void => {
    const finalWidth = dragWidthRef.current
    if (finalWidth === null) return
    dragWidthRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    writePreviewWidth(finalWidth)
  }

  const showSidePreview = isSideBySide && !isHidden
  const showFullscreen = !isSideBySide && isFullscreenOpen

  return (
    <div>
      <div className="mb-3 flex justify-end">
        {isSideBySide ? (
          <button type="button" onClick={toggleHidden} aria-controls={previewId} aria-expanded={!isHidden} className={ADD_BUTTON_CLASS}>
            {isHidden ? <Eye className="h-4 w-4" aria-hidden="true" /> : <EyeOff className="h-4 w-4" aria-hidden="true" />}
            {isHidden ? "Mostrar prévia" : "Esconder prévia"}
          </button>
        ) : (
          <button type="button" onClick={() => setIsFullscreenOpen(true)} aria-haspopup="dialog" className={ADD_BUTTON_CLASS}>
            <PanelRight className="h-4 w-4" aria-hidden="true" /> Pré-visualizar
          </button>
        )}
      </div>

      <div ref={rowRef} className={isSideBySide ? "flex items-start" : undefined}>
        <div
          id={editorId}
          className="min-w-0"
          style={showSidePreview ? { flex: `0 0 ${editorWidth}%`, maxWidth: `${editorWidth}%` } : isSideBySide ? { flex: "1 1 0%" } : undefined}
        >
          {editor}
        </div>
        {showSidePreview && (
          <>
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Redimensionar editor e prévia"
              aria-controls={editorId}
              aria-valuenow={Math.round(editorWidth)}
              aria-valuemin={PREVIEW_WIDTH_MIN}
              aria-valuemax={PREVIEW_WIDTH_MAX}
              tabIndex={0}
              onKeyDown={handleSeparatorKeyDown}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerEnd}
              onPointerCancel={handlePointerEnd}
              className="group mx-1 flex w-3 shrink-0 cursor-col-resize touch-none items-stretch justify-center self-stretch rounded focus-visible:outline-2 focus-visible:outline-level-purple"
            >
              <span className="my-2 w-1 rounded-full bg-border transition-colors group-hover:bg-level-purple group-focus-visible:bg-level-purple" />
            </div>
            <section
              id={previewId}
              aria-label="Prévia da aula"
              className="sticky top-4 max-h-[calc(100vh-2rem)] min-w-0 flex-1 overflow-y-auto rounded-2xl border-2 border-border bg-white p-4"
            >
              {preview}
            </section>
          </>
        )}
      </div>

      {showFullscreen && createPortal(<FullscreenPreview onClose={() => setIsFullscreenOpen(false)}>{preview}</FullscreenPreview>, document.body)}
    </div>
  )
}

interface FullscreenPreviewProps {
  onClose: () => void
  children: ReactNode
}

/** Prévia em tela cheia (abaixo de 1280 px): diálogo modal com foco preso e Esc para voltar. */
function FullscreenPreview({ onClose, children }: FullscreenPreviewProps): React.JSX.Element {
  const dialogRef = useModalA11y<HTMLDivElement>(true, onClose)
  const titleId = useId()
  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center gap-3 border-b-2 border-border bg-white px-4 py-3">
        <button type="button" onClick={onClose} data-autofocus className={ADD_BUTTON_CLASS}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Voltar ao editor
        </button>
        <h2 id={titleId} className="text-base font-semibold text-level-purple-dark">Prévia da aula</h2>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
    </div>
  )
}
