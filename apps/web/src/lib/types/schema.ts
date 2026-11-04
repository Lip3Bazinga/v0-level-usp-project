/**
 * Tipo de entrada de um schema de @levelusp/contracts, lido pela interface
 * Standard Schema. Evita importar o `zod` da web, que está numa versão diferente
 * da usada pelos contratos.
 */
export type SchemaInput<TSchema extends { readonly "~standard": { readonly types?: { readonly input: unknown } | undefined } }> =
  NonNullable<TSchema["~standard"]["types"]>["input"]
