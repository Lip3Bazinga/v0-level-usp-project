"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import TextStyle from "@tiptap/extension-text-style"
import Color from "@tiptap/extension-color"
import Image from "@tiptap/extension-image"
import Link from "@tiptap/extension-link"
import TextAlign from "@tiptap/extension-text-align"
import Highlight from "@tiptap/extension-highlight"
import Placeholder from "@tiptap/extension-placeholder"

// ── Emoji data (subset) ────────────────────────────────────────────────────────
const EMOJIS = [
  "😀","😂","🤔","👍","👎","✅","❌","⚠️","💡","🔥","⭐","🎉",
  "📌","📝","🔑","🔒","💻","🖥️","🐍","🔢","🔤","📊","📈","🧮",
  "🎯","🚀","🛠️","🔧","📚","📖","✏️","🖊️","🧠","💾","☁️","⚡",
]

const FONT_SIZES = ["12px","14px","16px","18px","20px","24px","28px","32px"]

const TEXT_COLORS = [
  "#000000","#374151","#6B7280","#EF4444","#F97316","#EAB308",
  "#22C55E","#3B82F6","#8B5CF6","#EC4899","#7C3AED","#0EA5E9",
]

// ── ToolbarButton ──────────────────────────────────────────────────────────────
function TB({
  active, disabled, onClick, title, children,
}: {
  active?: boolean
  disabled?: boolean
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-7 min-w-[28px] items-center justify-center rounded-md px-1.5 text-xs transition-colors ${
        active
          ? "bg-level-purple text-white"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      } disabled:opacity-40`}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="mx-0.5 h-5 w-px bg-border" />
}

// ── Emoji picker (simple dropdown) ────────────────────────────────────────────
function EmojiPicker({ onPick }: { onPick: (e: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <TB title="Emoji" onClick={() => setOpen((v) => !v)} active={open}>
        😀
      </TB>
      {open && (
        <div className="absolute left-0 top-9 z-50 grid grid-cols-8 gap-0.5 rounded-xl border border-border bg-white p-2 shadow-lg">
          {EMOJIS.map((em) => (
            <button
              key={em}
              type="button"
              onClick={() => { onPick(em); setOpen(false) }}
              className="flex h-7 w-7 items-center justify-center rounded-md text-base hover:bg-muted transition-colors"
            >
              {em}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Font size dropdown ─────────────────────────────────────────────────────────
function FontSizePicker({
  value,
  onChange,
}: {
  value: string
  onChange: (s: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 items-center gap-1 rounded-md border border-border px-2 text-xs text-foreground hover:border-level-purple transition-colors"
      >
        {value}
        <svg className="h-3 w-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-9 z-50 w-24 overflow-hidden rounded-xl border border-border bg-white shadow-lg">
          {FONT_SIZES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { onChange(s); setOpen(false) }}
              className={`w-full px-3 py-1.5 text-left text-xs transition-colors hover:bg-muted ${
                s === value ? "font-semibold text-level-purple" : "text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Color picker ───────────────────────────────────────────────────────────────
function ColorPicker({
  value,
  onChange,
  title,
}: {
  value: string
  onChange: (c: string) => void
  title: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div className="relative">
      <button
        type="button"
        title={title}
        onClick={() => inputRef.current?.click()}
        className="flex h-7 w-7 items-center justify-center rounded-md border border-border hover:border-level-purple transition-colors overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${value} 50%, transparent 50%)` }}
      >
        <span className="sr-only">{title}</span>
      </button>
      <input
        ref={inputRef}
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
      />
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Escreva o conteúdo da aula aqui…",
  minHeight = 320,
}: RichTextEditorProps) {
  const [fontSize, setFontSize] = useState("16px")
  const [textColor, setTextColor] = useState("#000000")
  const [highlightColor, setHighlightColor] = useState("#FEF08A")
  const [imageUrl, setImageUrl] = useState("")
  const [showImageInput, setShowImageInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState("")
  const [showLinkInput, setShowLinkInput] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: {
          HTMLAttributes: {
            class: "relative rounded-xl bg-[#1e1e2e] px-4 py-3 font-mono text-sm text-gray-100 my-3 overflow-x-auto",
          },
        },
        code: {
          HTMLAttributes: {
            class: "rounded bg-level-purple-subtle px-1.5 py-0.5 font-mono text-[11px] text-level-purple-dark",
          },
        },
        blockquote: {
          HTMLAttributes: {
            class: "border-l-4 border-level-purple pl-4 italic text-muted-foreground my-3",
          },
        },
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Image.configure({
        HTMLAttributes: { class: "rounded-xl max-w-full my-4 shadow-sm" },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-level-purple underline hover:text-level-purple-dark" },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate({ editor }) {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: "prose-lesson focus:outline-none min-h-[inherit] px-5 py-4 text-sm leading-relaxed",
      },
    },
  })

  // Sync external value (e.g. when lesson loads)
  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    if (current !== value) {
      editor.commands.setContent(value, false)
    }
  }, [value, editor])

  const applyFontSize = useCallback(
    (size: string) => {
      setFontSize(size)
      editor?.chain().focus().setMark("textStyle", { fontSize: size }).run()
    },
    [editor]
  )

  const applyColor = useCallback(
    (color: string) => {
      setTextColor(color)
      editor?.chain().focus().setColor(color).run()
    },
    [editor]
  )

  const applyHighlight = useCallback(
    (color: string) => {
      setHighlightColor(color)
      editor?.chain().focus().toggleHighlight({ color }).run()
    },
    [editor]
  )

  const insertImage = useCallback(() => {
    const url = imageUrl.trim()
    if (!url) return
    editor?.chain().focus().setImage({ src: url }).run()
    setImageUrl("")
    setShowImageInput(false)
  }, [editor, imageUrl])

  const insertLink = useCallback(() => {
    const url = linkUrl.trim()
    if (!url) { editor?.chain().focus().unsetLink().run(); setShowLinkInput(false); return }
    editor?.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
    setLinkUrl("")
    setShowLinkInput(false)
  }, [editor, linkUrl])

  const insertEmoji = useCallback(
    (emoji: string) => {
      editor?.chain().focus().insertContent(emoji).run()
    },
    [editor]
  )

  if (!editor) return null

  return (
    <div className="overflow-hidden rounded-xl border-2 border-border bg-white transition-colors focus-within:border-level-purple">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-[#F7F5FF] px-2 py-1.5">
        {/* Headings */}
        <TB title="Título 1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
          H1
        </TB>
        <TB title="Título 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          H2
        </TB>
        <TB title="Título 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          H3
        </TB>

        <Divider />

        {/* Bold / Italic / Underline / Strike */}
        <TB title="Negrito (Ctrl+B)" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <strong>B</strong>
        </TB>
        <TB title="Itálico (Ctrl+I)" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <em>I</em>
        </TB>
        <TB title="Sublinhado (Ctrl+U)" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <span className="underline">U</span>
        </TB>
        <TB title="Tachado" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <span className="line-through">S</span>
        </TB>

        <Divider />

        {/* Tamanho da fonte */}
        <FontSizePicker value={fontSize} onChange={applyFontSize} />

        {/* Cor do texto */}
        <div className="flex items-center gap-0.5">
          <div className="flex flex-wrap gap-0.5">
            {TEXT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                title={c}
                onClick={() => applyColor(c)}
                className="h-4 w-4 rounded-sm border border-white/50 shadow-sm hover:scale-110 transition-transform"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <ColorPicker value={textColor} onChange={applyColor} title="Cor personalizada" />
        </div>

        {/* Destaque */}
        <TB title="Destacar texto" active={editor.isActive("highlight")} onClick={() => applyHighlight(highlightColor)}>
          <span style={{ backgroundColor: highlightColor }} className="px-0.5 rounded text-[10px] text-black">A</span>
        </TB>

        <Divider />

        {/* Listas */}
        <TB title="Lista com marcadores" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
          </svg>
        </TB>
        <TB title="Lista numerada" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 6h13M7 12h13M7 18h13M3 6h.01M3 12h.01M3 18h.01"/>
          </svg>
        </TB>

        <Divider />

        {/* Código */}
        <TB title="Código inline (`)" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}>
          <span className="font-mono text-[11px]">`c`</span>
        </TB>
        <TB title="Bloco de código" active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
          </svg>
        </TB>
        <TB title="Citação / Blockquote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/>
          </svg>
        </TB>

        <Divider />

        {/* Alinhamento */}
        <TB title="Alinhar esquerda" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6h18M3 10h12M3 14h18M3 18h12"/>
          </svg>
        </TB>
        <TB title="Centralizar" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6h18M6 10h12M3 14h18M6 18h12"/>
          </svg>
        </TB>

        <Divider />

        {/* Link */}
        <div className="relative">
          <TB title="Inserir link" active={editor.isActive("link") || showLinkInput} onClick={() => setShowLinkInput((v) => !v)}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
            </svg>
          </TB>
          {showLinkInput && (
            <div className="absolute left-0 top-9 z-50 flex gap-1 rounded-xl border border-border bg-white p-2 shadow-lg">
              <input
                autoFocus
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") insertLink() }}
                placeholder="https://…"
                className="w-48 rounded-lg border border-border px-2 py-1 text-xs focus:border-level-purple focus:outline-none"
              />
              <button type="button" onClick={insertLink} className="rounded-lg bg-level-purple px-2 py-1 text-xs text-white hover:bg-level-purple-dark">OK</button>
            </div>
          )}
        </div>

        {/* Imagem por URL */}
        <div className="relative">
          <TB title="Inserir imagem" active={showImageInput} onClick={() => setShowImageInput((v) => !v)}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
          </TB>
          {showImageInput && (
            <div className="absolute left-0 top-9 z-50 flex gap-1 rounded-xl border border-border bg-white p-2 shadow-lg">
              <input
                autoFocus
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") insertImage() }}
                placeholder="URL da imagem…"
                className="w-52 rounded-lg border border-border px-2 py-1 text-xs focus:border-level-purple focus:outline-none"
              />
              <button type="button" onClick={insertImage} className="rounded-lg bg-level-purple px-2 py-1 text-xs text-white hover:bg-level-purple-dark">OK</button>
            </div>
          )}
        </div>

        {/* Emoji */}
        <EmojiPicker onPick={insertEmoji} />

        <Divider />

        {/* Desfazer / Refazer */}
        <TB title="Desfazer (Ctrl+Z)" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
          </svg>
        </TB>
        <TB title="Refazer (Ctrl+Y)" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6"/>
          </svg>
        </TB>
      </div>

      {/* ── Editor area ── */}
      <EditorContent
        editor={editor}
        style={{ minHeight }}
        className="cursor-text"
        onClick={() => editor.commands.focus()}
      />
    </div>
  )
}
