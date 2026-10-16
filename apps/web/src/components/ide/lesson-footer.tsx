"use client"

import { useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface LessonFooterProps {
  currentIndex: number   // 0-based
  total: number
  onPrev: () => void
  onNext: () => void
}

export function LessonFooter({ currentIndex, total, onPrev, onNext }: LessonFooterProps) {
  const isFirst = currentIndex <= 0
  const isLast = currentIndex >= total - 1

  // Atalhos de teclado: Alt+, (voltar) e Alt+. (próximo)
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.altKey && e.key === ",") { e.preventDefault(); onPrev() }
      if (e.altKey && e.key === ".") { e.preventDefault(); onNext() }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onPrev, onNext])

  return (
    <footer className="flex h-12 shrink-0 items-center justify-between border-t border-border bg-white px-4">
      {/* Contador de progresso */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-semibold text-level-purple-dark">
          {currentIndex + 1}
        </span>
        <span className="text-xs text-gray-400">/</span>
        <span className="text-xs text-gray-400">{total}</span>
      </div>

      {/* Barra de progresso mini */}
      <div className="hidden flex-1 items-center px-6 sm:flex">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-level-purple transition-all duration-500"
            style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Botões de navegação */}
      <div className="flex items-center gap-2">
        <button
          onClick={onPrev}
          disabled={isFirst}
          title="Voltar (Alt+,)"
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-level-purple hover:text-level-purple disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Voltar
        </button>
        <button
          onClick={onNext}
          disabled={isLast}
          title="Próximo (Alt+.)"
          className="flex items-center gap-1.5 rounded-lg bg-level-purple px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-level-purple-medium disabled:cursor-not-allowed disabled:opacity-40"
        >
          Próximo
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </footer>
  )
}
