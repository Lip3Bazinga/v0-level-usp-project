"use client"

import { createContext, useContext } from "react"

const NO_LIBRARIES: readonly string[] = []

const LessonLibrariesContext = createContext<readonly string[]>(NO_LIBRARIES)

interface LessonLibrariesProviderProps {
  /** `lesson.libraries` (numpy, pandas…); `null` = só a biblioteca padrão. */
  libraries: readonly string[] | null
  children: React.ReactNode
}

/**
 * Disponibiliza as bibliotecas da lição para os blocos da narrativa que executam Python no
 * navegador (o visualizador de ```python visualizar), que não recebem a lição por props.
 */
export function LessonLibrariesProvider({ libraries, children }: LessonLibrariesProviderProps): React.JSX.Element {
  return <LessonLibrariesContext value={libraries ?? NO_LIBRARIES}>{children}</LessonLibrariesContext>
}

/** Bibliotecas da lição aberta; fora de uma lição, lista vazia. */
export function useLessonLibraries(): readonly string[] {
  return useContext(LessonLibrariesContext)
}
