"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { useEditor, EditorContent, type Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Color from "@tiptap/extension-color"
import Image from "@tiptap/extension-image"
import Link from "@tiptap/extension-link"
import TextAlign from "@tiptap/extension-text-align"
import Highlight from "@tiptap/extension-highlight"
import Placeholder from "@tiptap/extension-placeholder"
import {
  ColorPicker, EmojiPicker, FontSizePicker, StrokeIcon, ToolbarButton, ToolbarDivider, UrlPopover,
} from "./rich-text-toolbar"

const TEXT_COLORS = [
  "#000000", "#374151", "#6B7280", "#EF4444", "#F97316", "#EAB308",
  "#22C55E", "#3B82F6", "#8B5CF6", "#EC4899", "#7C3AED", "#0EA5E9",
]

const DEFAULT_FONT_SIZE = "16px"
const DEFAULT_TEXT_COLOR = "#000000"
const HIGHLIGHT_COLOR = "#FEF08A"
const ACCEPTED_IMAGE_TYPES = "image/png,image/jpeg,image/webp,image/gif"

const ICON_PATHS = {
  bulletList: "M4 6h16M4 10h16M4 14h16M4 18h16",
  orderedList: "M7 6h13M7 12h13M7 18h13M3 6h.01M3 12h.01M3 18h.01",
  codeBlock: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4",
  alignLeft: "M3 6h18M3 10h12M3 14h18M3 18h12",
  alignCenter: "M3 6h18M6 10h12M3 14h18M6 18h12",
  link: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1",
  image: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
  undo: "M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6",
  redo: "M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6",
}

/** Botão liga/desliga da barra: título, se está ativo na seleção e o comando. */
interface ToggleAction {
  title: string
  label: ReactNode
  isActive: (editor: Editor) => boolean
  run: (editor: Editor) => void
}

const HEADING_ACTIONS: readonly ToggleAction[] = ([1, 2, 3] as const).map((level) => ({
  title: `Título ${level}`,
  label: `H${level}`,
  isActive: (editor) => editor.isActive("heading", { level }),
  run: (editor) => editor.chain().focus().toggleHeading({ level }).run(),
}))

const TEXT_STYLE_ACTIONS: readonly ToggleAction[] = [
  { title: "Negrito (Ctrl+B)", label: <strong>B</strong>, isActive: (editor) => editor.isActive("bold"), run: (editor) => editor.chain().focus().toggleBold().run() },
  { title: "Itálico (Ctrl+I)", label: <em>I</em>, isActive: (editor) => editor.isActive("italic"), run: (editor) => editor.chain().focus().toggleItalic().run() },
  {
    title: "Sublinhado (Ctrl+U)",
    label: <span className="underline">U</span>,
    isActive: (editor) => editor.isActive("underline"),
    run: (editor) => editor.chain().focus().toggleUnderline().run(),
  },
  {
    title: "Tachado",
    label: <span className="line-through">S</span>,
    isActive: (editor) => editor.isActive("strike"),
    run: (editor) => editor.chain().focus().toggleStrike().run(),
  },
]

const LIST_ACTIONS: readonly ToggleAction[] = [
  {
    title: "Lista com marcadores",
    label: <StrokeIcon path={ICON_PATHS.bulletList} />,
    isActive: (editor) => editor.isActive("bulletList"),
    run: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    title: "Lista numerada",
    label: <StrokeIcon path={ICON_PATHS.orderedList} />,
    isActive: (editor) => editor.isActive("orderedList"),
    run: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
]

const CODE_ACTIONS: readonly ToggleAction[] = [
  {
    title: "Código inline (`)",
    label: <span className="font-mono text-[11px]">`c`</span>,
    isActive: (editor) => editor.isActive("code"),
    run: (editor) => editor.chain().focus().toggleCode().run(),
  },
  {
    title: "Bloco de código",
    label: <StrokeIcon path={ICON_PATHS.codeBlock} />,
    isActive: (editor) => editor.isActive("codeBlock"),
    run: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    title: "Citação / Blockquote",
    label: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" />
      </svg>
    ),
    isActive: (editor) => editor.isActive("blockquote"),
    run: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
]

const ALIGN_ACTIONS: readonly ToggleAction[] = [
  {
    title: "Alinhar esquerda",
    label: <StrokeIcon path={ICON_PATHS.alignLeft} />,
    isActive: (editor) => editor.isActive({ textAlign: "left" }),
    run: (editor) => editor.chain().focus().setTextAlign("left").run(),
  },
  {
    title: "Centralizar",
    label: <StrokeIcon path={ICON_PATHS.alignCenter} />,
    isActive: (editor) => editor.isActive({ textAlign: "center" }),
    run: (editor) => editor.chain().focus().setTextAlign("center").run(),
  },
]

function ToggleActions({ editor, actions }: { editor: Editor; actions: readonly ToggleAction[] }): React.JSX.Element[] {
  return actions.map((action) => (
    <ToolbarButton key={action.title} title={action.title} isActive={action.isActive(editor)} onClick={() => action.run(editor)}>
      {action.label}
    </ToolbarButton>
  ))
}

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
  /**
   * Envia um arquivo de imagem e devolve a URL pública (ex.: `uploadImage` de
   * `@/lib/api`). Sem ele, só é possível inserir imagem por URL.
   */
  onUploadImage?: (file: File) => Promise<string>
  /** Chamado quando o upload falha (mensagem pronta para exibir). */
  onUploadError?: (message: string) => void
}

function useLessonEditor({ value, onChange, placeholder }: Pick<RichTextEditorProps, "value" | "onChange"> & { placeholder: string }): Editor {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // O StarterKit v3 já inclui Link e Underline; eles são configurados abaixo.
        // Sem desligar aqui, o TipTap avisa "Duplicate extension names" no console.
        link: false,
        underline: false,
        codeBlock: {
          HTMLAttributes: { class: "relative rounded-xl bg-[#1e1e2e] px-4 py-3 font-mono text-sm text-gray-100 my-3 overflow-x-auto" },
        },
        code: {
          HTMLAttributes: { class: "rounded bg-level-purple-subtle px-1.5 py-0.5 font-mono text-[11px] text-level-purple-dark" },
        },
        blockquote: {
          HTMLAttributes: { class: "border-l-4 border-level-purple pl-4 italic text-muted-foreground my-3" },
        },
      }),
      Underline,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Image.configure({ HTMLAttributes: { class: "rounded-xl max-w-full my-4 shadow-sm" } }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-level-purple underline hover:text-level-purple-dark" },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate({ editor: updatedEditor }) {
      onChange(updatedEditor.getHTML())
    },
    editorProps: {
      attributes: {
        class: "prose-lesson focus:outline-none min-h-[inherit] px-5 py-4 text-sm leading-relaxed",
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": placeholder,
      },
    },
  })

  // Conteúdo trocado por fora (ex.: lição carregada depois de montar o editor).
  useEffect(() => {
    if (editor.getHTML() === value) return
    // TipTap v3: o 2º argumento é um objeto de opções; sem emitir update, o onChange não volta em laço.
    editor.commands.setContent(value, { emitUpdate: false })
  }, [value, editor])

  return editor
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Escreva o conteúdo da aula aqui…",
  minHeight = 320,
  onUploadImage,
  onUploadError,
}: RichTextEditorProps): React.JSX.Element | null {
  const editor = useLessonEditor({ value, onChange, placeholder })
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE)
  const [textColor, setTextColor] = useState(DEFAULT_TEXT_COLOR)
  const [imageUrl, setImageUrl] = useState("")
  const [isImageInputOpen, setIsImageInputOpen] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [linkUrl, setLinkUrl] = useState("")
  const [isLinkInputOpen, setIsLinkInputOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)


  const applyFontSize = (size: string): void => {
    setFontSize(size)
    editor.chain().focus().setMark("textStyle", { fontSize: size }).run()
  }

  const applyColor = (color: string): void => {
    setTextColor(color)
    editor.chain().focus().setColor(color).run()
  }


  const insertImage = (): void => {
    const url = imageUrl.trim()
    if (!url) return
    editor.chain().focus().setImage({ src: url }).run()
    setImageUrl("")
    setIsImageInputOpen(false)
  }

  const uploadAndInsertImage = async (file: File | undefined): Promise<void> => {
    if (!file || !onUploadImage) return
    setIsUploadingImage(true)
    try {
      const url = await onUploadImage(file)
      editor.chain().focus().setImage({ src: url }).run()
      setIsImageInputOpen(false)
    } catch (error) {
      onUploadError?.(error instanceof Error ? error.message : "Não foi possível enviar a imagem.")
    } finally {
      setIsUploadingImage(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const insertLink = (): void => {
    const url = linkUrl.trim()
    setIsLinkInputOpen(false)
    if (!url) {
      editor.chain().focus().unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
    setLinkUrl("")
  }

  return (
    <div className="overflow-hidden rounded-xl border-2 border-border bg-white transition-colors focus-within:border-level-purple">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-[#F7F5FF] px-2 py-1.5">
        <ToggleActions editor={editor} actions={HEADING_ACTIONS} />
        <ToolbarDivider />
        <ToggleActions editor={editor} actions={TEXT_STYLE_ACTIONS} />
        <ToolbarDivider />

        <FontSizePicker value={fontSize} onChange={applyFontSize} />
        <div className="flex items-center gap-0.5">
          <div className="flex flex-wrap gap-0.5">
            {TEXT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                title={color}
                onClick={() => applyColor(color)}
                className="h-4 w-4 rounded-sm border border-white/50 shadow-sm transition-transform hover:scale-110"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <ColorPicker value={textColor} onChange={applyColor} title="Cor personalizada" />
        </div>
        <ToolbarButton title="Destacar texto" isActive={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight({ color: HIGHLIGHT_COLOR }).run()}>
          <span style={{ backgroundColor: HIGHLIGHT_COLOR }} className="rounded px-0.5 text-[10px] text-black">
            A
          </span>
        </ToolbarButton>
        <ToolbarDivider />

        <ToggleActions editor={editor} actions={LIST_ACTIONS} />
        <ToolbarDivider />
        <ToggleActions editor={editor} actions={CODE_ACTIONS} />
        <ToolbarDivider />
        <ToggleActions editor={editor} actions={ALIGN_ACTIONS} />
        <ToolbarDivider />

        <div className="relative">
          <ToolbarButton
            title="Inserir link"
            isActive={editor.isActive("link") || isLinkInputOpen}
            onClick={() => setIsLinkInputOpen((current) => !current)}
          >
            <StrokeIcon path={ICON_PATHS.link} />
          </ToolbarButton>
          {isLinkInputOpen && (
            <UrlPopover value={linkUrl} onChange={setLinkUrl} onConfirm={insertLink} placeholder="https://…" inputClassName="w-48" />
          )}
        </div>

        <div className="relative">
          <ToolbarButton title="Inserir imagem" isActive={isImageInputOpen} onClick={() => setIsImageInputOpen((current) => !current)}>
            <StrokeIcon path={ICON_PATHS.image} />
          </ToolbarButton>
          {isImageInputOpen && (
            <UrlPopover value={imageUrl} onChange={setImageUrl} onConfirm={insertImage} placeholder="URL da imagem…" inputClassName="w-52">
              {onUploadImage && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_IMAGE_TYPES}
                    className="hidden"
                    onChange={(event) => void uploadAndInsertImage(event.target.files?.[0])}
                  />
                  <button
                    type="button"
                    disabled={isUploadingImage}
                    onClick={() => fileInputRef.current?.click()}
                    className="whitespace-nowrap rounded-lg border border-level-purple px-2 py-1 text-xs text-level-purple hover:bg-level-purple-subtle disabled:opacity-50"
                  >
                    {isUploadingImage ? "Enviando…" : "Enviar arquivo"}
                  </button>
                </>
              )}
            </UrlPopover>
          )}
        </div>

        <EmojiPicker onPick={(emoji) => editor.chain().focus().insertContent(emoji).run()} />
        <ToolbarDivider />

        <ToolbarButton title="Desfazer (Ctrl+Z)" isDisabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
          <StrokeIcon path={ICON_PATHS.undo} />
        </ToolbarButton>
        <ToolbarButton title="Refazer (Ctrl+Y)" isDisabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
          <StrokeIcon path={ICON_PATHS.redo} />
        </ToolbarButton>
      </div>

      <EditorContent editor={editor} style={{ minHeight }} className="cursor-text" onClick={() => editor.commands.focus()} />
    </div>
  )
}
