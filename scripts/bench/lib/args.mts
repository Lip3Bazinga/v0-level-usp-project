/**
 * Leitura mínima de argumentos de linha de comando (`--chave valor` ou `--flag`), sem dependências.
 * Chave desconhecida é erro: um erro de digitação não pode virar uma medição com o padrão errado.
 */

export interface Args {
  readonly options: ReadonlyMap<string, string | true>
  readonly positional: readonly string[]
}

/** Separa as opções (`--nome valor`, `--nome=valor`, `--flag`) dos argumentos posicionais. */
export function parseArgs(argv: readonly string[]): Args {
  const options = new Map<string, string | true>()
  const positional: string[] = []
  for (let index = 0; index < argv.length; index++) {
    const current = argv[index] ?? ""
    if (!current.startsWith("--")) {
      positional.push(current)
      continue
    }
    const body = current.slice(2)
    const equals = body.indexOf("=")
    if (equals >= 0) {
      options.set(body.slice(0, equals), body.slice(equals + 1))
      continue
    }
    const next = argv[index + 1]
    if (next !== undefined && !next.startsWith("--")) {
      options.set(body, next)
      index++
    } else {
      options.set(body, true)
    }
  }
  return { options, positional }
}

/** Falha se alguma opção não está em `known` (mostra as aceitas). */
export function rejectUnknown(args: Args, known: readonly string[]): void {
  const unknown = [...args.options.keys()].filter((key) => !known.includes(key))
  if (unknown.length > 0) {
    throw new Error(`opção desconhecida: ${unknown.map((key) => `--${key}`).join(", ")}. Aceitas: ${known.map((key) => `--${key}`).join(" ")}`)
  }
}

/** Texto da opção; ausente ou sem valor devolve `fallback`. */
export function stringOption(args: Args, name: string, fallback: string): string {
  const value = args.options.get(name)
  return typeof value === "string" ? value : fallback
}

/** Texto opcional: `undefined` quando a opção não foi dada. */
export function optionalStringOption(args: Args, name: string): string | undefined {
  const value = args.options.get(name)
  return typeof value === "string" ? value : undefined
}

/** `--flag` presente (ou `--flag true`). */
export function flagOption(args: Args, name: string): boolean {
  const value = args.options.get(name)
  return value === true || value === "true" || value === "1"
}

/** Número (inteiro ou decimal); inválido é erro. */
export function numberOption(args: Args, name: string, fallback: number): number {
  const value = args.options.get(name)
  if (typeof value !== "string") return fallback
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) throw new Error(`--${name} precisa ser um número (recebi "${value}")`)
  return parsed
}

/** Número opcional: `undefined` quando a opção não foi dada. */
export function optionalNumberOption(args: Args, name: string): number | undefined {
  return args.options.has(name) ? numberOption(args, name, 0) : undefined
}

/** Lista separada por vírgulas. */
export function listOption(args: Args, name: string, fallback: readonly string[]): string[] {
  const value = args.options.get(name)
  if (typeof value !== "string") return [...fallback]
  return value.split(",").map((item) => item.trim()).filter((item) => item !== "")
}

/** Faixa `min-max` (ex.: `30-60`); aceita também um número só (`45` = 45-45). */
export function rangeOption(args: Args, name: string, fallback: readonly [number, number]): [number, number] {
  const value = args.options.get(name)
  if (typeof value !== "string") return [fallback[0], fallback[1]]
  const match = /^(\d+(?:\.\d+)?)(?:-(\d+(?:\.\d+)?))?$/.exec(value.trim())
  if (!match) throw new Error(`--${name} precisa ser "min-max" (ex.: 30-60); recebi "${value}"`)
  const low = Number(match[1])
  const high = Number(match[2] ?? match[1])
  if (high < low) throw new Error(`--${name}: o máximo (${high}) é menor que o mínimo (${low})`)
  return [low, high]
}
