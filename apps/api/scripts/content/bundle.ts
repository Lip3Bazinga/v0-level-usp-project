import { contentBundleSchema, type ContentBundle } from "@levelusp/contracts"
import type { CompiledContent } from "./compiler"
import type { ContentProblem, SourceMap } from "./source-map"

/**
 * Validação final do pacote com `contentBundleSchema` (a mesma do seed e da
 * importação do admin) e gravação em JSON estável.
 */

/** Pacote validado (com `generated_at`) ou os problemas que impedem a validação. */
export interface BundleValidation {
  bundle: ContentBundle | null
  problems: ContentProblem[]
}

/** Lê uma propriedade de um valor desconhecido sem asserções de tipo. */
function propertyOf(value: unknown, key: PropertyKey): unknown {
  if (typeof value !== "object" || value === null) return undefined
  const property: unknown = Reflect.get(value, key)
  return property
}

/**
 * Traduz o caminho de um problema do schema (`courses.0.modules.1.lessons.2.steps.0.hints`)
 * para o arquivo e a linha do objeto mais próximo, com o resto do caminho como rótulo.
 */
export function locateIssue(root: unknown, path: readonly PropertyKey[], locations: SourceMap): { file: string; line: number | null; label: string } {
  let current: unknown = root
  let located: object | null = null
  let remainder: PropertyKey[] = []
  for (const segment of path) {
    current = propertyOf(current, segment)
    if (typeof current === "object" && current !== null && locations.get(current)) {
      located = current
      remainder = []
    } else {
      remainder.push(segment)
    }
  }
  const label = remainder.map(String).join(".")
  if (!located) return { file: "(pacote)", line: null, label: path.map(String).join(".") }
  const [firstSegment] = remainder
  const location = (firstSegment === undefined ? undefined : locations.getField(located, String(firstSegment))) ?? locations.get(located)
  return { file: location?.file ?? "(pacote)", line: location?.line ?? null, label }
}

/** Valida o pacote compilado; problemas apontam `arquivo:linha` sempre que o objeto tem origem conhecida. */
export function validateBundle(compiled: CompiledContent, generatedAt: string): BundleValidation {
  const candidate = { ...compiled.bundle, generated_at: generatedAt }
  const parsed = contentBundleSchema.safeParse(candidate)
  if (parsed.success) return { bundle: parsed.data, problems: [] }
  const problems = parsed.error.issues.map((issue): ContentProblem => {
    const { file, line, label } = locateIssue(candidate, issue.path, compiled.locations)
    return { file, line, message: label ? `${label}: ${issue.message}` : issue.message }
  })
  return { bundle: null, problems }
}

/** JSON com dois espaços e quebra final: diffs pequenos e estáveis entre compilações. */
export function serializeBundle(bundle: ContentBundle): string {
  return `${JSON.stringify(bundle, null, 2)}\n`
}
