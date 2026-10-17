"use client"

import { useEffect, useLayoutEffect, useRef } from "react"
import confetti from "canvas-confetti"

export type ConfettiOptions = NonNullable<Parameters<typeof confetti>[0]>

/** Confete que respeita `prefers-reduced-motion`: sem o sistema pedir, ninguém fica sem animação. */
export function fireConfetti(options: ConfettiOptions): void {
  void confetti({ disableForReducedMotion: true, ...options })
}

/** Rajadas disparadas juntas depois de `delayMs`, para o efeito em ondas. */
export function fireConfettiAfter(delayMs: number, ...bursts: readonly ConfettiOptions[]): void {
  setTimeout(() => bursts.forEach(fireConfetti), delayMs)
}

interface CelebrationOptions {
  /** Efeito disparado a cada abertura (confete). */
  celebrate: () => void
  onClose: () => void
  /** Fecha sozinho depois desse tempo; sem ele, só fecha pela ação do usuário. */
  autoCloseMs?: number
}

/**
 * Comemora ao abrir e agenda o fechamento automático. `onClose` é lido por ref:
 * quem passa uma função nova a cada renderização não reinicia o prazo nem
 * dispara o confete de novo.
 */
export function useCelebration(isOpen: boolean, { celebrate, onClose, autoCloseMs }: CelebrationOptions): void {
  const onCloseRef = useRef(onClose)
  const celebrateRef = useRef(celebrate)

  useLayoutEffect(() => {
    onCloseRef.current = onClose
    celebrateRef.current = celebrate
  })

  useEffect(() => {
    if (!isOpen) return
    celebrateRef.current()
    if (autoCloseMs === undefined) return
    const timer = setTimeout(() => onCloseRef.current(), autoCloseMs)
    return () => clearTimeout(timer)
  }, [isOpen, autoCloseMs])
}
