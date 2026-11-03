export type MoveDirection = -1 | 1

/** Troca o item `index` com o vizinho na direção pedida; fora dos limites devolve a mesma lista. */
export function moveItem<TItem>(items: readonly TItem[], index: number, direction: MoveDirection): TItem[] {
  const target = index + direction
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) return [...items]
  const reordered = [...items]
  // Vizinhos: tirar o item e reinseri-lo na posição do vizinho é a troca dos dois.
  reordered.splice(target, 0, ...reordered.splice(index, 1))
  return reordered
}

interface MultipleChoice {
  options: string[]
  correct_index: number
}

/**
 * Remove a alternativa `index` de uma questão de múltipla escolha mantendo o gabarito na
 * mesma alternativa; se a removida era a correta, a primeira passa a ser.
 */
export function removeChoiceAt<TQuestion extends MultipleChoice>(question: TQuestion, index: number): TQuestion {
  const options = question.options.filter((_, optionIndex) => optionIndex !== index)
  const { correct_index: correctIndex } = question
  const nextCorrectIndex = correctIndex === index ? 0 : correctIndex > index ? correctIndex - 1 : correctIndex
  return { ...question, options, correct_index: nextCorrectIndex }
}
