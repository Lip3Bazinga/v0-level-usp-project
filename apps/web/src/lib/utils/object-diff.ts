/** Chaves próprias de um objeto com o tipo preservado (`Object.keys` devolve `string[]`). */
function ownKeys<TObject extends object>(value: TObject): (keyof TObject)[] {
  // Seguro aqui: só é usado com objetos montados pelo próprio formulário, sem chaves extras.
  return Object.keys(value) as (keyof TObject)[]
}

/**
 * Campos de `after` cujo valor difere de `before`, comparando por JSON (listas e objetos
 * aninhados contam como iguais quando têm o mesmo conteúdo). Base dos PATCH que enviam
 * só o que mudou. `undefined` e `null` são tratados como o mesmo valor.
 */
export function diffChangedFields<TObject extends object>(before: TObject, after: TObject): Partial<TObject> {
  const changes: Partial<TObject> = {}
  for (const key of ownKeys(after)) {
    if (JSON.stringify(before[key] ?? null) !== JSON.stringify(after[key] ?? null)) changes[key] = after[key]
  }
  return changes
}
