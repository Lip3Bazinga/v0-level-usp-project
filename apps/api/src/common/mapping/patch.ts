/** Valor de um campo que foi enviado (pode ser `null`, nunca `undefined`). */
export type Present<T> = Exclude<T, undefined>

/**
 * Como cada campo da entrada vira colunas do banco. Declarar todos os campos
 * (`-?`) faz o compilador acusar quando o contrato ganha um campo novo.
 */
export type PatchMapping<Input extends object, Columns extends object> = {
  [Field in keyof Input]-?: (value: Present<Input[Field]>) => Partial<Columns>
}

/**
 * Monta o `SET` de um PATCH só com os campos presentes na entrada, na ordem
 * do mapeamento. Campos ausentes não são tocados (nem com valor padrão).
 */
export function buildPatch<Input extends object, Columns extends object>(
  input: Input,
  mapping: PatchMapping<Input, Columns>,
): Partial<Columns> {
  const patch: Partial<Columns> = {}
  for (const field in mapping) applyField(patch, input, mapping, field)
  return patch
}

function applyField<Input extends object, Columns extends object, Field extends keyof Input>(
  patch: Partial<Columns>,
  input: Input,
  mapping: PatchMapping<Input, Columns>,
  field: Field,
): void {
  const value = input[field]
  if (isPresent(value)) Object.assign(patch, mapping[field](value))
}

function isPresent<T>(value: T): value is Present<T> {
  return value !== undefined
}

/** Lista os campos efetivamente enviados (para auditoria e validação de PATCH vazio). */
export function presentFields(input: object): string[] {
  return Object.entries(input).flatMap(([field, value]) => (value === undefined ? [] : [field]))
}
