/** Indexa itens por uma chave; em chaves repetidas vence o último item. */
export function indexBy<TItem, TKey>(items: readonly TItem[], getKey: (item: TItem) => TKey): Map<TKey, TItem> {
  return new Map(items.map((item) => [getKey(item), item]))
}
