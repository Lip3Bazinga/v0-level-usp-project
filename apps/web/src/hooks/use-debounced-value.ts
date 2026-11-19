"use client"

import { useEffect, useState } from "react"

/**
 * Devolve `value` só depois de `delayMs` sem mudanças: a prévia da aula acompanha o que o
 * professor digita sem renderizar a cada tecla. Na primeira renderização devolve `value` na hora;
 * o temporizador pendente é cancelado a cada mudança e ao desmontar.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
