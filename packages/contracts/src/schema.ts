import { z } from "zod"

type WithoutDefault<T> = T extends z.ZodDefault<infer Inner> ? Inner : T

export type PatchShape<S extends z.ZodRawShape> = { [K in keyof S]: z.ZodOptional<WithoutDefault<S[K]>> }

/**
 * Versão "PATCH" de um schema de criação: todos os campos opcionais e SEM os
 * valores padrão. (`.partial()` do Zod 4 ainda aplica `.default()`, o que
 * faria um PATCH com só `title` sobrescrever os demais campos com o padrão.)
 */
export function patchSchemaOf<S extends z.ZodRawShape>(schema: z.ZodObject<S>): z.ZodObject<PatchShape<S>> {
  const shape: Record<string, z.ZodType> = {}
  for (const [key, field] of Object.entries(schema.shape)) {
    shape[key] = withoutDefault(key, field).optional()
  }
  // O laço acima produz exatamente PatchShape<S> (mesmas chaves, sem default,
  // opcionais); o TypeScript não acompanha a construção dinâmica do objeto.
  return z.object(shape) as z.ZodObject<PatchShape<S>>
}

function withoutDefault(key: string, field: z.core.$ZodType): z.ZodType {
  const inner = field instanceof z.ZodDefault ? field.removeDefault() : field
  if (!(inner instanceof z.ZodType)) throw new TypeError(`O campo "${key}" não é um schema Zod suportado`)
  return inner
}

/**
 * Corpo opcional em métodos como DELETE/POST sem payload: ausente vira `{}`
 * e a validação do schema decide o que é obrigatório.
 */
export function optionalBodySchema<T extends z.ZodType>(schema: T) {
  return z.preprocess((body) => body ?? {}, schema)
}
