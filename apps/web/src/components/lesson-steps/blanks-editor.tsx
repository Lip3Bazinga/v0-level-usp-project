"use client"

import { Fragment } from "react"
import { normalizeBlankAnswer, splitBlanks } from "@/lib/utils/exercise-modes"

const MIN_BLANK_SIZE = 4

interface BlanksEditorProps {
  /** `main.py` inicial do passo, com as lacunas (`___`). */
  source: string
  /** Resposta de cada lacuna, na ordem em que aparecem no código. */
  answers: readonly string[]
  onChange: (answers: string[]) => void
}

/**
 * Exercício de lacunas: o código inicial somente leitura, com um campo de texto de uma linha no
 * lugar de cada `___`. O Tab anda de lacuna em lacuna, na ordem do código.
 */
export function BlanksEditor({ source, answers, onChange }: BlanksEditorProps): React.JSX.Element {
  const segments = splitBlanks(source.replace(/\n$/, ""))
  const blankCount = segments.length - 1

  const handleChange = (blankIndex: number, text: string): void => {
    onChange(Array.from({ length: blankCount }, (_unused, index) => (index === blankIndex ? normalizeBlankAnswer(text) : (answers[index] ?? ""))))
  }

  return (
    <div role="group" aria-label={`Código com ${blankCount} ${blankCount === 1 ? "lacuna" : "lacunas"} para completar`} className="h-full overflow-auto whitespace-pre bg-[#282c34] p-4 font-mono text-sm leading-8 text-gray-100">
      {segments.map((segment, index) => (
        <Fragment key={index}>
          {index > 0 && (
            <input
              type="text"
              value={answers[index - 1] ?? ""}
              onChange={(event) => handleChange(index - 1, event.target.value)}
              aria-label={`Lacuna ${index} de ${blankCount}`}
              size={Math.max(MIN_BLANK_SIZE, (answers[index - 1] ?? "").length + 1)}
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              className="mx-0.5 rounded border-2 border-level-purple bg-white px-1.5 py-0.5 font-mono text-sm text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-300"
            />
          )}
          <span>{segment}</span>
        </Fragment>
      ))}
    </div>
  )
}
