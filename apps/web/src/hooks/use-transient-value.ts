"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export interface TransientValue<T> {
  value: T | null
  /** Mostra `nextValue` por `durationMs` e depois volta a `null`; chamar de novo reinicia o prazo. */
  show: (nextValue: T) => void
  clear: () => void
}

/**
 * Valor que some sozinho depois de um tempo: "Salvo!", "Copiado", toasts locais,
 * pulsos de animação. Cancela o temporizador pendente ao desmontar.
 */
export function useTransientValue<T>(durationMs: number): TransientValue<T> {
  const [value, setValue] = useState<T | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancelTimer = useCallback(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current)
    timerRef.current = null
  }, [])

  const clear = useCallback(() => {
    cancelTimer()
    setValue(null)
  }, [cancelTimer])

  const show = useCallback(
    (nextValue: T) => {
      cancelTimer()
      setValue(nextValue)
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        setValue(null)
      }, durationMs)
    },
    [cancelTimer, durationMs],
  )

  useEffect(() => cancelTimer, [cancelTimer])

  return { value, show, clear }
}

/** Versão booleana de `useTransientValue` para indicadores do tipo liga/desliga. */
export function useTransientFlag(durationMs: number): { isActive: boolean; activate: () => void } {
  const { value, show } = useTransientValue<true>(durationMs)
  const activate = useCallback(() => show(true), [show])
  return { isActive: value === true, activate }
}
