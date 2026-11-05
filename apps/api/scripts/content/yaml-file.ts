import { readFileSync } from "node:fs"
import { isMap, isScalar, LineCounter, parseDocument, type Document, type Pair, type YAMLMap } from "yaml"
import type { ZodType } from "zod"
import type { ContentProblem } from "./source-map"

/**
 * YAML do conteúdo (`curso.yaml`, `modulo.yaml`, `prova.yaml`, trilhas e o
 * cabeçalho das lições) com as linhas de cada chave, tradução das chaves
 * pt-BR para os nomes do pacote e validação com o schema do pacote.
 */

/** Caminho dentro do YAML: chaves e índices de lista. */
export type YamlPath = readonly (string | number)[]

/** Documento YAML lido, com acesso à linha de qualquer caminho. */
export interface YamlFile {
  file: string
  data: unknown
  /** Linha em que o valor no caminho começa; undefined quando o caminho não existe. */
  lineOf(path: YamlPath): number | undefined
  /** Linha da CHAVE (não do valor) no mapa indicado pelo caminho. */
  keyLineOf(path: YamlPath, key: string): number | undefined
}

/** Erro de sintaxe do YAML, já com a linha. */
export class YamlSyntaxError extends Error {
  constructor(
    readonly file: string,
    readonly line: number | null,
    message: string,
  ) {
    super(message)
    this.name = "YamlSyntaxError"
  }
}

/** Linha (1-based, já deslocada) em que um nó do documento começa. */
function nodeLine(node: unknown, lineCounter: LineCounter, offset: number): number | undefined {
  if (typeof node !== "object" || node === null || !("range" in node)) return undefined
  const { range } = node
  if (!Array.isArray(range)) return undefined
  const start: unknown = range[0]
  return typeof start === "number" ? lineCounter.linePos(start).line + offset : undefined
}

function findPair(map: YAMLMap, key: string): Pair | undefined {
  return map.items.find((pair) => isScalar(pair.key) && pair.key.value === key)
}

/**
 * Lê um texto YAML. `firstLine` é a linha do arquivo em que o texto começa
 * (o cabeçalho de uma lição começa na linha 2, depois do `---`).
 *
 * @throws YamlSyntaxError quando o YAML não pode ser lido (chave repetida inclusive).
 */
export function parseYamlText(text: string, file: string, firstLine = 1): YamlFile {
  const lineCounter = new LineCounter()
  const offset = firstLine - 1
  const document: Document = parseDocument(text, { lineCounter, uniqueKeys: true })
  const [firstError] = document.errors
  if (firstError) {
    const line = firstError.linePos?.[0]?.line
    throw new YamlSyntaxError(file, line === undefined ? null : line + offset, `YAML inválido: ${firstError.message.split("\n")[0] ?? firstError.code}`)
  }
  const data: unknown = document.toJS()
  return {
    file,
    data,
    lineOf: (path) => nodeLine(document.getIn(path, true), lineCounter, offset),
    keyLineOf: (path, key) => {
      const map: unknown = path.length === 0 ? document.contents : document.getIn(path, true)
      if (!isMap(map)) return undefined
      return nodeLine(findPair(map, key)?.key, lineCounter, offset)
    },
  }
}

/**
 * Lê um arquivo YAML do disco; `file` é o nome exibido nos erros.
 *
 * @throws YamlSyntaxError quando o YAML não pode ser lido.
 */
export function readYamlFile(absolutePath: string, file: string): YamlFile {
  return parseYamlText(readFileSync(absolutePath, "utf8"), file)
}

/** Tradução de uma chave pt-BR: o nome no pacote e, para listas de mapas, as chaves dos itens. */
export interface KeySpec {
  name: string
  items?: KeySpecMap
}

/** Chave pt-BR do YAML → nome no pacote (texto) ou especificação com itens. */
export type KeySpecMap = Readonly<Record<string, string | KeySpec>>

function specOf(entry: string | KeySpec): KeySpec {
  return typeof entry === "string" ? { name: entry } : entry
}

/** Chave pt-BR cujo nome traduzido é `name`. */
function sourceKeyFor(spec: KeySpecMap, name: string): string | undefined {
  return Object.keys(spec).find((key) => specOf(spec[key] ?? "").name === name)
}

interface TranslateOptions {
  yaml: YamlFile
  spec: KeySpecMap
  problems: ContentProblem[]
}

function translateMap(value: unknown, path: YamlPath, { yaml, spec, problems }: TranslateOptions): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    const message = path.length === 0 ? "o arquivo precisa ser um mapa YAML (chave: valor)" : `esperado um mapa (chave: valor) em ${path.join(".")}`
    problems.push({ file: yaml.file, line: yaml.lineOf(path) ?? null, message })
    return null
  }
  const translated: Record<string, unknown> = {}
  for (const [key, raw] of Object.entries(value)) {
    const entry = spec[key]
    if (entry === undefined) {
      problems.push({ file: yaml.file, line: yaml.keyLineOf(path, key) ?? null, message: `chave desconhecida: ${key} (aceitas: ${Object.keys(spec).join(", ")})` })
      continue
    }
    const { name, items } = specOf(entry)
    if (items && Array.isArray(raw)) {
      translated[name] = raw.map((item: unknown, index) => translateMap(item, [...path, key, index], { yaml, spec: items, problems }))
      continue
    }
    translated[name] = raw
  }
  return translated
}

/**
 * Traduz as chaves pt-BR do YAML para os nomes do pacote. Chave desconhecida é
 * problema (apontando a linha), para pegar erro de digitação.
 */
export function translateYamlKeys(yaml: YamlFile, spec: KeySpecMap, problems: ContentProblem[]): Record<string, unknown> | null {
  return translateMap(yaml.data, [], { yaml, spec, problems })
}

function withoutSymbols(path: readonly PropertyKey[]): (string | number)[] {
  return path.filter((segment): segment is string | number => typeof segment !== "symbol")
}

/** Caminho de um problema do schema (nomes do pacote) de volta às chaves do YAML. */
export function toYamlPath(path: readonly PropertyKey[], spec: KeySpecMap): YamlPath {
  const [head, ...rest] = path
  if (typeof head !== "string") return withoutSymbols(path)
  const sourceKey = sourceKeyFor(spec, head)
  if (sourceKey === undefined) return withoutSymbols(path)
  const entry = specOf(spec[sourceKey] ?? head)
  const [index, ...deeper] = rest
  if (entry.items && typeof index === "number") return [sourceKey, index, ...toYamlPath(deeper, entry.items)]
  return [sourceKey, ...withoutSymbols(rest)]
}

/**
 * Valida o objeto traduzido com o schema do pacote; cada problema aponta a
 * linha da chave original no YAML.
 *
 * @returns o valor com os padrões do schema aplicados, ou null com os problemas registrados.
 */
export function validateYaml<T>(yaml: YamlFile, value: unknown, schema: ZodType<T>, spec: KeySpecMap, problems: ContentProblem[]): T | null {
  const parsed = schema.safeParse(value)
  if (parsed.success) return parsed.data
  for (const issue of parsed.error.issues) {
    const yamlPath = toYamlPath(issue.path, spec)
    const line = yaml.lineOf(yamlPath) ?? (yamlPath.length > 0 ? yaml.lineOf(yamlPath.slice(0, -1)) : undefined) ?? null
    const label = yamlPath.length === 0 ? "" : `${yamlPath.join(".")}: `
    problems.push({ file: yaml.file, line, message: `${label}${issue.message}` })
  }
  return null
}
