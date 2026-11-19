"use client"

import { useCallback, useSyncExternalStore } from "react"

function getServerSnapshot(): boolean {
  return false
}

/**
 * Acompanha uma media query CSS (`"(min-width: 1280px)"`). Seguro para SSR: no servidor e na
 * hidratação devolve `false` e só passa a refletir `window.matchMedia` depois que o componente
 * monta (sem divergência de HTML). Sem `matchMedia` no ambiente, devolve sempre `false`.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void): (() => void) => {
      if (typeof window.matchMedia !== "function") return () => undefined
      const list = window.matchMedia(query)
      list.addEventListener("change", onChange)
      return () => list.removeEventListener("change", onChange)
    },
    [query],
  )
  const getSnapshot = useCallback((): boolean => typeof window.matchMedia === "function" && window.matchMedia(query).matches, [query])
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
