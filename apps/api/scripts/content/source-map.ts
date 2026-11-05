/**
 * Localização de origem do conteúdo compilado: todo objeto do pacote (trilha,
 * curso, módulo, lição, passo, caso, questão) lembra de que arquivo e linha
 * veio, para que o lint e a validação do schema apontem `arquivo:linha`.
 */

/** Arquivo (como exibido ao autor) e linha, 1-based. */
export interface SourceLocation {
  file: string
  line: number
}

/** Problema encontrado no conteúdo; `line` é null quando o problema é do arquivo inteiro. */
export interface ContentProblem {
  file: string
  line: number | null
  message: string
}

/** `arquivo:linha: causa` (ou `arquivo: causa` sem linha). */
export function formatProblem(problem: ContentProblem): string {
  return problem.line === null ? `${problem.file}: ${problem.message}` : `${problem.file}:${problem.line}: ${problem.message}`
}

/** Ordena por arquivo e linha, para o relatório ser estável entre execuções. */
export function sortProblems(problems: readonly ContentProblem[]): ContentProblem[] {
  return [...problems].sort((left, right) => left.file.localeCompare(right.file) || (left.line ?? 0) - (right.line ?? 0))
}

/**
 * Objetos compilados → onde nasceram. Guarda também a linha de campos
 * individuais (chaves do YAML e do cabeçalho da lição), para que um erro em
 * `titulo` aponte a linha do `titulo`, não a do arquivo.
 */
export class SourceMap {
  private readonly objects = new WeakMap<object, SourceLocation>()
  private readonly fields = new WeakMap<object, Map<string, number>>()

  /** Registra onde `target` foi escrito. */
  set(target: object, location: SourceLocation): void {
    this.objects.set(target, location)
  }

  /** Registra a linha de um campo de `target` (o arquivo é o do próprio objeto). */
  setField(target: object, field: string, line: number): void {
    const lines = this.fields.get(target) ?? new Map<string, number>()
    lines.set(field, line)
    this.fields.set(target, lines)
  }

  /** Onde `target` foi escrito, se conhecido. */
  get(target: object): SourceLocation | undefined {
    return this.objects.get(target)
  }

  /** Dá a `target` a localização (e as linhas de campo) de `source`, ao montar um objeto a partir de outro. */
  copy(source: object, target: object): void {
    const location = this.objects.get(source)
    if (location) this.objects.set(target, location)
    const lines = this.fields.get(source)
    if (lines) this.fields.set(target, new Map(lines))
  }

  /** Linha do campo, ou a do objeto quando o campo não tem linha própria. */
  getField(target: object, field: string): SourceLocation | undefined {
    const location = this.objects.get(target)
    if (!location) return undefined
    const line = this.fields.get(target)?.get(field)
    return line === undefined ? location : { file: location.file, line }
  }
}

/** Monta um problema a partir de uma localização conhecida. */
export function problemAt(location: SourceLocation | undefined, fallbackFile: string, message: string): ContentProblem {
  return location ? { file: location.file, line: location.line, message } : { file: fallbackFile, line: null, message }
}
