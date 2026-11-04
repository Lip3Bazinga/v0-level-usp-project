/** Chaves de `T` cujo valor pode ser `undefined`. */
type OptionalKeys<T> = { [K in keyof T]-?: undefined extends T[K] ? K : never }[keyof T]

/** `T` com as chaves que aceitam `undefined` viradas opcionais (e sem `undefined` no valor). */
export type DefinedProps<T> = { [K in Exclude<keyof T, OptionalKeys<T>>]: T[K] } & {
  [K in OptionalKeys<T>]?: Exclude<T[K], undefined>
}

/**
 * Copia só as chaves com valor definido. Serve para repassar props opcionais a
 * componentes de bibliotecas (framer-motion, Radix) e a APIs (`RequestInit`) cujos
 * tipos não aceitam `undefined` explícito com `exactOptionalPropertyTypes`; para o
 * React e o DOM, chave ausente e chave `undefined` são equivalentes.
 *
 * @example <motion.div {...definedProps({ className, whileHover })} />
 */
export function definedProps<T extends object>(props: T): DefinedProps<T> {
  const entries = Object.entries(props).filter(([, value]) => value !== undefined)
  // Object.fromEntries perde as chaves; o filtro acima garante exatamente DefinedProps<T>.
  return Object.fromEntries(entries) as DefinedProps<T>
}
