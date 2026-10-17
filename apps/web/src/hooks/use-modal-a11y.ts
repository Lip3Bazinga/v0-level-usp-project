"use client"

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react"

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(", ")

const AUTOFOCUS_SELECTOR = "[data-autofocus]"

function getActiveElement(): HTMLElement | null {
  return document.activeElement instanceof HTMLElement ? document.activeElement : null
}

/** Itens que recebem Tab agora: os ocultos (`display: none`) ficam de fora, exceto o focado. */
function getTabbableItems(dialog: HTMLElement): HTMLElement[] {
  const activeElement = getActiveElement()
  return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (item) => item.offsetParent !== null || item === activeElement,
  )
}

/** Foca `[data-autofocus]`, senão o primeiro item focável, senão o próprio diálogo. */
function focusInitialElement(dialog: HTMLElement) {
  if (dialog.contains(document.activeElement)) return
  const initial = dialog.querySelector<HTMLElement>(AUTOFOCUS_SELECTOR) ?? dialog.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
  if (initial) {
    initial.focus()
    return
  }
  if (!dialog.hasAttribute("tabindex")) dialog.setAttribute("tabindex", "-1")
  dialog.focus()
}

/** Outro diálogo modal aberto por cima (ex.: a confirmação do `swalConfirm`) cuida do próprio teclado. */
function isInsideAnotherModal(target: EventTarget | null, dialog: HTMLElement): boolean {
  const modal = target instanceof Element ? target.closest('[aria-modal="true"]') : null
  return modal !== null && modal !== dialog && !dialog.contains(modal)
}

/** Leva o foco do fim para o começo (e vice-versa) para o Tab não sair do diálogo. */
function trapTabKey(event: KeyboardEvent, dialog: HTMLElement) {
  const items = getTabbableItems(dialog)
  if (items.length === 0) {
    event.preventDefault()
    return
  }
  const firstItem = items[0]
  const lastItem = items[items.length - 1]
  const activeElement = getActiveElement()
  const isFocusOutside = !dialog.contains(activeElement)
  if (event.shiftKey && (activeElement === firstItem || isFocusOutside)) {
    event.preventDefault()
    lastItem.focus()
  } else if (!event.shiftKey && (activeElement === lastItem || isFocusOutside)) {
    event.preventDefault()
    firstItem.focus()
  }
}

/**
 * Acessibilidade mínima para diálogos feitos à mão (WCAG 2.1.2 e 2.4.3): ao abrir, move
 * o foco para dentro do diálogo e prende o Tab nele; Esc fecha (quando há `onClose`); ao
 * fechar, devolve o foco a quem abriu.
 *
 * @example
 * const dialogRef = useModalA11y<HTMLDivElement>(isOpen, handleClose)
 * <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="titulo">…</div>
 */
export function useModalA11y<TElement extends HTMLElement>(isOpen: boolean, onClose?: () => void): RefObject<TElement | null> {
  const dialogRef = useRef<TElement>(null)
  const onCloseRef = useRef(onClose)

  useLayoutEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!isOpen) return
    const previouslyFocused = getActiveElement()
    // O conteúdo ainda está montando (AnimatePresence/portal) quando o efeito roda.
    const focusFrame = requestAnimationFrame(() => {
      if (dialogRef.current) focusInitialElement(dialogRef.current)
    })

    const handleKeyDown = (event: KeyboardEvent) => {
      const dialog = dialogRef.current
      if (!dialog || isInsideAnotherModal(event.target, dialog)) return
      const close = onCloseRef.current
      if (event.key === "Escape" && close) {
        event.stopPropagation()
        close()
        return
      }
      if (event.key === "Tab") trapTabKey(event, dialog)
    }
    document.addEventListener("keydown", handleKeyDown, true)

    return () => {
      cancelAnimationFrame(focusFrame)
      document.removeEventListener("keydown", handleKeyDown, true)
      if (previouslyFocused && document.contains(previouslyFocused)) previouslyFocused.focus()
    }
  }, [isOpen])

  return dialogRef
}
