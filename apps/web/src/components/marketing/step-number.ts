/** Rótulo de etapa com dois dígitos a partir do índice: 0 → "01". */
export function formatStepNumber(index: number): string {
  return String(index + 1).padStart(2, "0")
}
