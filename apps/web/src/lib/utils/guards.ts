/**
 * `true` quando `value` é um dos `options`. Estreita o tipo de valores vindos do DOM
 * (`<select>`, `localStorage`) para a união literal, sem `value as T`.
 *
 * @example
 * const SORTS = ["name", "recent"] as const
 * if (isOneOf(SORTS, event.target.value)) setSort(event.target.value)
 */
export function isOneOf<TOption extends string>(options: readonly TOption[], value: string | null | undefined): value is TOption {
  return options.some((option) => option === value)
}
