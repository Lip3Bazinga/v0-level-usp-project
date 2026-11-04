"use client"

import { useEffect, useRef } from "react"

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'

/**
 * Acessibilidade mínima para diálogos feitos à mão (WCAG 2.1.2 / 2.4.3):
 * - move o foco para dentro do diálogo ao abrir;
 * - mantém o Tab preso dentro dele;
 * - Esc fecha (quando `onClose` é passado);
 * - devolve o foco ao elemento que abriu o diálogo ao fechar.
 *
 * Uso: `const ref = useModalA11y<HTMLDivElement>(open, onClose)` e
 * `<div ref={ref} role="dialog" aria-modal="true" aria-labelledby=...>`.
 */
export function useModalA11y<T extends HTMLElement>(open: boolean, onClose?: () => void) {
  const ref = useRef<T>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null

    // Espera o conteúdo montar (AnimatePresence/portal) antes de focar.
    const raf = requestAnimationFrame(() => {
      const root = ref.current
      if (!root || root.contains(document.activeElement)) return
      const first = root.querySelector<HTMLElement>("[data-autofocus]") ?? root.querySelector<HTMLElement>(FOCUSABLE)
      if (first) first.focus()
      else {
        if (!root.hasAttribute("tabindex")) root.setAttribute("tabindex", "-1")
        root.focus()
      }
    })

    const onKeyDown = (e: KeyboardEvent) => {
      const root = ref.current
      if (!root) return
      if (e.key === "Escape" && onCloseRef.current) {
        e.stopPropagation()
        onCloseRef.current()
        return
      }
      if (e.key !== "Tab") return
      const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      )
      if (items.length === 0) {
        e.preventDefault()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (e.shiftKey && (active === first || !root.contains(active))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (active === last || !root.contains(active))) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener("keydown", onKeyDown, true)

    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener("keydown", onKeyDown, true)
      if (previous && document.contains(previous)) previous.focus()
    }
  }, [open])

  return ref
}
