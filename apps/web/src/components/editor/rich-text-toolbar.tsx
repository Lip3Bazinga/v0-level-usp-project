"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react"
import { cn } from "@/lib/utils"

const EMOJIS = [
  "😀", "😂", "🤔", "👍", "👎", "✅", "❌", "⚠️", "💡", "🔥", "⭐", "🎉",
  "📌", "📝", "🔑", "🔒", "💻", "🖥️", "🐍", "🔢", "🔤", "📊", "📈", "🧮",
  "🎯", "🚀", "🛠️", "🔧", "📚", "📖", "✏️", "🖊️", "🧠", "💾", "☁️", "⚡",
]

const FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px"]

interface ToolbarButtonProps {
  isActive?: boolean
  isDisabled?: boolean
  onClick: () => void
  title: string
  children: ReactNode
}

export function ToolbarButton({ isActive, isDisabled, onClick, title, children }: ToolbarButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      title={title}
      disabled={isDisabled}
      onClick={onClick}
      className={cn(
        "flex h-7 min-w-[28px] items-center justify-center rounded-md px-1.5 text-xs transition-colors",
        isActive ? "bg-level-purple text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground",
        "disabled:opacity-40",
      )}
    >
      {children}
    </button>
  )
}

export function ToolbarDivider(): React.JSX.Element {
  return <div className="mx-0.5 h-5 w-px bg-border" />
}

/** Ícone de traço da barra de ferramentas, a partir de um caminho SVG 24×24. */
export function StrokeIcon({ path }: { path: string }): React.JSX.Element {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
    </svg>
  )
}

/** Fecha um menu suspenso quando o usuário clica fora dele. */
function useCloseOnOutsideClick(containerRef: RefObject<HTMLElement | null>, onClose: () => void): void {
  useEffect(() => {
    const handleMouseDown = (event: MouseEvent): void => {
      const container = containerRef.current
      if (container && event.target instanceof Node && !container.contains(event.target)) onClose()
    }
    document.addEventListener("mousedown", handleMouseDown)
    return () => document.removeEventListener("mousedown", handleMouseDown)
  }, [containerRef, onClose])
}
interface UseDropdownResult {
  isOpen: boolean
  toggle: () => void
  close: () => void
}

/** Estado de abrir/fechar de um menu suspenso que se fecha ao clicar fora de `containerRef`. */
function useDropdown(containerRef: RefObject<HTMLElement | null>): UseDropdownResult {
  const [isOpen, setIsOpen] = useState(false)
  const close = useCallback(() => setIsOpen(false), [])
  useCloseOnOutsideClick(containerRef, close)
  return { isOpen, toggle: () => setIsOpen((current) => !current), close }
}

export function EmojiPicker({ onPick }: { onPick: (emoji: string) => void }): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdown = useDropdown(containerRef)
  return (
    <div className="relative" ref={containerRef}>
      <ToolbarButton title="Emoji" onClick={dropdown.toggle} isActive={dropdown.isOpen}>
        😀
      </ToolbarButton>
      {dropdown.isOpen && (
        <div className="absolute left-0 top-9 z-50 grid grid-cols-8 gap-0.5 rounded-xl border border-border bg-white p-2 shadow-lg">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onPick(emoji)
                dropdown.close()
              }}
              className="flex h-7 w-7 items-center justify-center rounded-md text-base transition-colors hover:bg-muted"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function FontSizePicker({ value, onChange }: { value: string; onChange: (size: string) => void }): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdown = useDropdown(containerRef)
  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={dropdown.toggle}
        className="flex h-7 items-center gap-1 rounded-md border border-border px-2 text-xs text-foreground transition-colors hover:border-level-purple"
      >
        {value}
        <svg className="h-3 w-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {dropdown.isOpen && (
        <div className="absolute left-0 top-9 z-50 w-24 overflow-hidden rounded-xl border border-border bg-white shadow-lg">
          {FONT_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => {
                onChange(size)
                dropdown.close()
              }}
              className={cn(
                "w-full px-3 py-1.5 text-left text-xs transition-colors hover:bg-muted",
                size === value ? "font-semibold text-level-purple" : "text-foreground",
              )}
            >
              {size}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  title: string
}

export function ColorPicker({ value, onChange, title }: ColorPickerProps): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div className="relative">
      <button
        type="button"
        title={title}
        onClick={() => inputRef.current?.click()}
        className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-md border border-border transition-colors hover:border-level-purple"
        style={{ background: `linear-gradient(135deg, ${value} 50%, transparent 50%)` }}
      >
        <span className="sr-only">{title}</span>
      </button>
      <input ref={inputRef} type="color" value={value} onChange={(event) => onChange(event.target.value)} className="sr-only" />
    </div>
  )
}

interface UrlPopoverProps {
  value: string
  onChange: (value: string) => void
  onConfirm: () => void
  placeholder: string
  inputClassName: string
  /** Ações extras ao lado do OK (ex.: enviar arquivo). */
  children?: ReactNode
}

/** Campo de URL que aparece sob o botão da barra (link e imagem); Enter confirma. */
export function UrlPopover({ value, onChange, onConfirm, placeholder, inputClassName, children }: UrlPopoverProps): React.JSX.Element {
  return (
    <div className="absolute left-0 top-9 z-50 flex gap-1 rounded-xl border border-border bg-white p-2 shadow-lg">
      <input
        autoFocus
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") onConfirm()
        }}
        placeholder={placeholder}
        className={cn(
          "rounded-lg border border-border px-2 py-1 text-xs focus:border-level-purple focus:outline-none",
          inputClassName,
        )}
      />
      <button type="button" onClick={onConfirm} className="rounded-lg bg-level-purple px-2 py-1 text-xs text-white hover:bg-level-purple-dark">
        OK
      </button>
      {children}
    </div>
  )
}
