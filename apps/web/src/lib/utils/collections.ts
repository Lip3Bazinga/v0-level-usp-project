/** Lista com pelo menos um item: `list[0]` é `T`, não `T | undefined`. */
export type NonEmptyArray<T> = readonly [T, ...T[]]

/** Indexa itens por uma chave; em chaves repetidas vence o último item. */
export function indexBy<TItem, TKey>(items: readonly TItem[], getKey: (item: TItem) => TKey): Map<TKey, TItem> {
  return new Map(items.map((item) => [getKey(item), item]))
}

/** Estreita a lista para {@link NonEmptyArray}; depois do guard o primeiro item é garantido. */
export function isNonEmpty<TItem>(items: readonly TItem[]): items is NonEmptyArray<TItem> {
  return items.length > 0
}

/** Último item de uma lista que não pode estar vazia. */
export function lastOf<TItem>(items: NonEmptyArray<TItem>): TItem {
  return items[items.length - 1] ?? items[0]
}

/**
 * Item na posição `index` tratando a lista como circular (paletas de cores que se
 * repetem): índices além do fim recomeçam do início; negativos contam do fim.
 */
export function cycleItem<TItem>(items: NonEmptyArray<TItem>, index: number): TItem {
  const position = ((index % items.length) + items.length) % items.length
  return items[position] ?? items[0]
}
