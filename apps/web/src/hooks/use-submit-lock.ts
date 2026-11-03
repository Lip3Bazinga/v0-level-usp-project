"use client"

import { useCallback, useRef, useState } from "react"

/** Trava de envio e o estado para desabilitar o botão. */
export interface SubmitLock {
  isSubmitting: boolean
  /** Trava o envio; devolve `false` se já havia um em andamento (o chamador deve desistir). */
  acquire: () => boolean
  release: () => void
}

/**
 * Trava síncrona contra duplo envio de formulário. O `isSubmitting` sozinho não basta:
 * ele só desabilita o botão no próximo render, e um duplo clique dispara dois `submit`
 * antes disso. A ref fecha essa janela.
 */
export function useSubmitLock(): SubmitLock {
  const isLockedRef = useRef(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const acquire = useCallback(() => {
    if (isLockedRef.current) return false
    isLockedRef.current = true
    setIsSubmitting(true)
    return true
  }, [])

  const release = useCallback(() => {
    isLockedRef.current = false
    setIsSubmitting(false)
  }, [])

  return { isSubmitting, acquire, release }
}
