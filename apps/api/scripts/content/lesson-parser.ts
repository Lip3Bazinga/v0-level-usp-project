import { z } from "zod"
import {
  bundleLessonSchema, DEFAULT_ENTRY_FILE, DEFAULT_STEP_XP, nonEmpty, projectPathSchema, testCasesSchema,
  type BundleLesson, type BundleStep, type Checkpoint, type LessonType, type ProjectFile, type StepKind, type StepQuizQuestionInput, type TestCase, type WrongSolution,
} from "@levelusp/contracts"
import { fenceContent, MarkdownSyntaxError, parseNumberedList, parseQuestion, rawText, scanMarkdown, toSourceLines, type FencedBlock, type MarkdownNode, type SourceLine } from "./markdown"
import type { ContentProblem, SourceMap } from "./source-map"
import { parseYamlText, translateYamlKeys, validateYaml, YamlSyntaxError, type KeySpecMap } from "./yaml-file"

/**
 * Lição `.lvl.md` (docs/v2/curso-e-passos.md §6.1) → lição do pacote (§6.2).
 * O arquivo tem um cabeçalho YAML entre `---` e passos `## Passo N · Tipo · Título`;
 * cada passo de exercício tem as seções `### Instruções`, `### Código inicial`,
 * `### Solução`, `### Dicas`, `### Verificação` e `### Soluções erradas`;
 * cada passo de quiz tem uma ou mais `### Pergunta`. Problemas apontam
 * `arquivo:linha`; um arquivo com qualquer problema não entra no pacote.
 */

/** Chaves do cabeçalho da lição → campos do pacote. */
export const FRONTMATTER_KEYS: KeySpecMap = {
  slug: "slug",
  titulo: "title",
  descricao: "description",
  dificuldade: "difficulty",
  tipo: "lesson_type",
  runtime: "runtime",
  bibliotecas: "libraries",
  xp: "xp_reward",
  tempo_min: "time_limit",
  publicada: "published",
  projeto: "is_project",
  solucao_apos_tentativas: "solution_after_attempts",
  objetivos: "objectives",
  nota_minima_quiz: "quiz_passing_score",
}

/** `tipo` do cabeçalho → `lesson_type` do pacote. */
export const LESSON_TYPE_BY_TIPO: Readonly<Record<string, LessonType>> = {
  guiada: "guided",
  pratica: "coding",
  leitura: "theory",
  quiz: "quiz",
}

/** Tipo de passo exigido por cada tipo de lição clássica (sem passos no banco). */
const STEP_KIND_BY_LESSON_TYPE: Readonly<Record<Exclude<LessonType, "guided">, StepKind>> = {
  coding: "exercicio",
  theory: "leitura",
  quiz: "quiz",
}

const KIND_LABELS: Readonly<Record<StepKind, string>> = { leitura: "Leitura", exercicio: "Exercício", quiz: "Quiz" }

/** Seções `###` conhecidas, pelo nome normalizado (sem acentos, minúsculas). */
type SectionName = "instrucoes" | "codigo inicial" | "solucao" | "dicas" | "verificacao" | "solucoes erradas" | "pergunta"

const SECTION_LABELS: Readonly<Record<SectionName, string>> = {
  instrucoes: "Instruções",
  "codigo inicial": "Código inicial",
  solucao: "Solução",
  dicas: "Dicas",
  verificacao: "Verificação",
  "solucoes erradas": "Soluções erradas",
  pergunta: "Pergunta",
}

const SECTIONS_BY_KIND: Readonly<Record<StepKind, readonly SectionName[]>> = {
  leitura: [],
  exercicio: ["instrucoes", "codigo inicial", "solucao", "dicas", "verificacao", "solucoes erradas"],
  quiz: ["pergunta"],
}

const STEP_HEADING = /^##\s/
const SECTION_HEADING = /^###\s+(.+?)\s*$/
const SUBSECTION_HEADING = /^####/
const STEP_HEADER = /^##\s+passo\s+(\d+)\s*[·\-—–]\s*([^·\-—–]+?)\s*[·\-—–]\s*(.+?)\s*$/i
const FRONTMATTER_DELIMITER = "---"
const LANGUAGE_PYTHON = "python"
const LANGUAGE_JSON = "json"
const ATTRIBUTE_PATH = "path"
const ATTRIBUTE_NAME = "name"

/** Campos planos da lição (o cabeçalho), com os padrões do schema do pacote. */
const lessonFieldsSchema = z.object(bundleLessonSchema.shape).omit({ steps: true })
type LessonFields = z.infer<typeof lessonFieldsSchema>

/** Resultado da leitura de um arquivo: a lição (só quando não há problemas) e os problemas. */
export interface ParsedLessonFile {
  lesson: BundleLesson | null
  problems: ContentProblem[]
}

/** Interrompe a leitura do arquivo depois de um problema já registrado. */
class ParseAbort extends Error {}

interface ParseContext {
  file: string
  problems: ContentProblem[]
  locations: SourceMap
}

function report(ctx: ParseContext, line: number | null, message: string): void {
  ctx.problems.push({ file: ctx.file, line, message })
}

function fail(ctx: ParseContext, line: number | null, message: string): never {
  report(ctx, line, message)
  throw new ParseAbort(message)
}

/** Sem acentos, minúsculo e com espaços simples: compara nomes de seção e de tipo de passo. */
export function normalizeName(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

const STEP_KIND_BY_NAME: Readonly<Record<string, StepKind>> = { leitura: "leitura", exercicio: "exercicio", quiz: "quiz" }

interface StepHeader {
  line: number
  number: number
  kind: StepKind
  title: string
}

function parseStepHeader(ctx: ParseContext, line: number, text: string): StepHeader {
  const match = STEP_HEADER.exec(text)
  if (!match) fail(ctx, line, `cabeçalho de passo inválido: "${text}" (use "## Passo N · Leitura|Exercício|Quiz · Título")`)
  const [, number, kindText, title] = match
  const kind = STEP_KIND_BY_NAME[normalizeName(kindText ?? "")]
  if (kind === undefined) fail(ctx, line, `tipo de passo desconhecido: "${kindText ?? ""}" (use Leitura, Exercício ou Quiz)`)
  return { line, number: Number(number ?? "0"), kind, title: (title ?? "").trim() }
}

interface Section {
  name: SectionName
  line: number
  nodes: MarkdownNode[]
}

interface StepBlock {
  header: StepHeader
  narrative: MarkdownNode[]
  sections: Section[]
}

/** Divide o corpo em passos (`## `) e cada passo em narrativa + seções (`### `). */
function splitSteps(ctx: ParseContext, nodes: readonly MarkdownNode[]): StepBlock[] {
  const steps: StepBlock[] = []
  let current: StepBlock | null = null
  for (const node of nodes) {
    const isText = node.kind === "text"
    if (isText && STEP_HEADING.test(node.text)) {
      current = { header: parseStepHeader(ctx, node.line, node.text), narrative: [], sections: [] }
      steps.push(current)
      continue
    }
    if (!current) {
      if (isText && node.text.trim() === "") continue
      fail(ctx, node.line, "conteúdo fora de um passo: tudo depois do cabeçalho precisa estar sob um \"## Passo N · …\"")
    }
    const sectionMatch = isText && !SUBSECTION_HEADING.test(node.text) ? SECTION_HEADING.exec(node.text) : null
    if (sectionMatch) {
      const name = normalizeName(sectionMatch[1] ?? "")
      if (!isSectionName(name)) fail(ctx, node.line, `seção desconhecida: "### ${sectionMatch[1] ?? ""}" (seções aceitas: ${describeSections(current.header.kind)}; para subtítulos na narrativa use ####)`)
      current.sections.push({ name, line: node.line, nodes: [] })
      continue
    }
    const section = current.sections[current.sections.length - 1]
    if (section) section.nodes.push(node)
    else current.narrative.push(node)
  }
  return steps
}

function isSectionName(name: string): name is SectionName {
  return Object.hasOwn(SECTION_LABELS, name)
}

function describeSections(kind: StepKind): string {
  const names = SECTIONS_BY_KIND[kind].map((name) => `### ${SECTION_LABELS[name]}`)
  return names.length === 0 ? `nenhuma em passo ${KIND_LABELS[kind]}` : names.join(", ")
}

/** Rejeita seções que não valem para o tipo do passo e repetições (Pergunta pode repetir). */
function checkSections(ctx: ParseContext, step: StepBlock): void {
  const allowed = SECTIONS_BY_KIND[step.header.kind]
  const seen = new Set<SectionName>()
  for (const section of step.sections) {
    if (!allowed.includes(section.name)) {
      fail(ctx, section.line, `a seção ### ${SECTION_LABELS[section.name]} não vale em passo ${KIND_LABELS[step.header.kind]} (aceitas: ${describeSections(step.header.kind)})`)
    }
    if (seen.has(section.name) && section.name !== "pergunta") fail(ctx, section.line, `seção ### ${SECTION_LABELS[section.name]} repetida no passo ${step.header.number}`)
    seen.add(section.name)
  }
}

/** Blocos de código de uma seção; texto solto e bloco aberto são erros. */
function fencesOf(ctx: ParseContext, section: Section): FencedBlock[] {
  const fences: FencedBlock[] = []
  for (const node of section.nodes) {
    if (node.kind === "text") {
      if (node.text.trim() !== "") fail(ctx, node.line, `texto solto na seção ### ${SECTION_LABELS[section.name]}: só blocos de código (\`\`\`python ou \`\`\`text path=…)`)
      continue
    }
    if (!node.closed) fail(ctx, node.line, "bloco de código sem fechamento (```)")
    fences.push(node)
  }
  return fences
}

/** Caminho do arquivo que o bloco representa: `python` → main.py; outros exigem `path=`. */
function filePathOf(ctx: ParseContext, fence: FencedBlock, extraAttributes: readonly string[]): string {
  for (const attribute of Object.keys(fence.attributes)) {
    if (attribute !== ATTRIBUTE_PATH && !extraAttributes.includes(attribute)) {
      fail(ctx, fence.line, `atributo desconhecido no bloco de código: ${attribute} (aceitos: ${[ATTRIBUTE_PATH, ...extraAttributes].join(", ")})`)
    }
  }
  const explicitPath = fence.attributes[ATTRIBUTE_PATH]
  if (explicitPath === undefined) {
    if (fence.language === LANGUAGE_PYTHON) return DEFAULT_ENTRY_FILE
    fail(ctx, fence.line, `bloco \`\`\`${nonEmpty(fence.language) ?? "(sem linguagem)"} precisa de path= (ex.: \`\`\`text path=dados.csv); só \`\`\`python pode omitir (vira ${DEFAULT_ENTRY_FILE})`)
  }
  const parsed = projectPathSchema.safeParse(explicitPath)
  if (!parsed.success) fail(ctx, fence.line, `path inválido "${explicitPath}": use um caminho relativo terminado em .py, .txt, .csv, .json ou .md`)
  return parsed.data
}

/** Arquivos de uma seção de código (Código inicial / Solução). */
function parseFiles(ctx: ParseContext, section: Section): ProjectFile[] {
  const files: ProjectFile[] = []
  for (const fence of fencesOf(ctx, section)) {
    const filePath = filePathOf(ctx, fence, [])
    if (files.some((file) => file.path === filePath)) fail(ctx, fence.line, `arquivo repetido na seção ### ${SECTION_LABELS[section.name]}: ${filePath}`)
    files.push({ path: filePath, content: fenceContent(fence) })
  }
  if (files.length === 0) fail(ctx, section.line, `a seção ### ${SECTION_LABELS[section.name]} está sem bloco de código`)
  return files
}

/** `### Soluções erradas`: blocos `name="…"`; blocos seguidos com o mesmo nome formam uma solução de vários arquivos. */
function parseWrongSolutions(ctx: ParseContext, section: Section): WrongSolution[] {
  const solutions: WrongSolution[] = []
  for (const fence of fencesOf(ctx, section)) {
    const name = fence.attributes[ATTRIBUTE_NAME]?.trim()
    if (name === undefined || name === "") fail(ctx, fence.line, 'bloco sem nome em ### Soluções erradas: use ```python name="descrição do erro"')
    const filePath = filePathOf(ctx, fence, [ATTRIBUTE_NAME])
    const current = solutions[solutions.length - 1]
    if (current?.name === name) {
      if (current.files.some((file) => file.path === filePath)) fail(ctx, fence.line, `arquivo repetido na solução errada "${name}": ${filePath}`)
      current.files.push({ path: filePath, content: fenceContent(fence) })
      continue
    }
    if (solutions.some((solution) => solution.name === name)) fail(ctx, fence.line, `solução errada repetida: "${name}" (blocos da mesma solução precisam vir seguidos)`)
    const solution: WrongSolution = { name, files: [{ path: filePath, content: fenceContent(fence) }] }
    ctx.locations.set(solution, { file: ctx.file, line: fence.line })
    solutions.push(solution)
  }
  return solutions
}

/** Linha, dentro do bloco JSON, em que o caso de índice `index` declara o `id` (aproximação útil). */
function caseLine(fence: FencedBlock, rawCases: unknown, index: number): number {
  const rawCase: unknown = Array.isArray(rawCases) ? rawCases[index] : undefined
  const id = typeof rawCase === "object" && rawCase !== null && "id" in rawCase ? rawCase.id : undefined
  if (typeof id !== "string") return fence.line
  const pattern = new RegExp(`"id"\\s*:\\s*${JSON.stringify(id)}`)
  const bodyIndex = fence.body.findIndex((line) => pattern.test(line))
  return bodyIndex === -1 ? fence.line : fence.line + 1 + bodyIndex
}

/** `### Verificação`: um único bloco ```json com `TestCase[]`, validado pelo schema do gabarito. */
function parseTestCases(ctx: ParseContext, section: Section): TestCase[] {
  const fences = fencesOf(ctx, section)
  const [fence] = fences
  if (!fence || fences.length !== 1) fail(ctx, section.line, "### Verificação precisa de exatamente um bloco ```json com a lista de casos")
  if (fence.language !== LANGUAGE_JSON || Object.keys(fence.attributes).length > 0) fail(ctx, fence.line, "o bloco de ### Verificação precisa ser ```json (sem atributos)")
  let rawCases: unknown
  try {
    rawCases = JSON.parse(fence.body.join("\n"))
  } catch (error) {
    fail(ctx, fence.line, `JSON inválido em ### Verificação: ${error instanceof Error ? error.message : String(error)}`)
  }
  if (!Array.isArray(rawCases)) fail(ctx, fence.line, "### Verificação precisa ser uma lista JSON de casos ([ { \"id\": …, \"kind\": … } ])")
  const parsed = testCasesSchema.safeParse(rawCases)
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const [index, ...rest] = issue.path
      const line = typeof index === "number" ? caseLine(fence, rawCases, index) : fence.line
      const label = typeof index === "number" ? `caso ${index + 1}${rest.length ? ` (${rest.map(String).join(".")})` : ""}: ` : ""
      report(ctx, line, `${label}${issue.message}`)
    }
    throw new ParseAbort("casos inválidos")
  }
  parsed.data.forEach((testCase, index) => ctx.locations.set(testCase, { file: ctx.file, line: caseLine(fence, rawCases, index) }))
  return parsed.data
}

function parseCheckpoints(ctx: ParseContext, section: Section): Checkpoint[] {
  const items = parseNumberedList(section.nodes, "### Instruções")
  if (items.length === 0) fail(ctx, section.line, "### Instruções está vazia: liste o que o aluno precisa fazer (1. …, 2. …)")
  return items.map((item) => {
    const checkpoint: Checkpoint = { id: item.number, instruction: item.text, ...(item.hint === null ? {} : { hint: item.hint }) }
    ctx.locations.set(checkpoint, { file: ctx.file, line: item.line })
    return checkpoint
  })
}

function parseHints(ctx: ParseContext, section: Section): string[] {
  const items = parseNumberedList(section.nodes, "### Dicas")
  for (const item of items) {
    if (item.hint !== null) fail(ctx, item.line, 'a sublinha "Dica:" só vale em ### Instruções; em ### Dicas cada item numerado já é uma dica')
    if (item.text === "") fail(ctx, item.line, "dica vazia em ### Dicas")
  }
  return items.map((item) => item.text)
}

function parseQuizQuestion(ctx: ParseContext, section: Section): StepQuizQuestionInput {
  const parsed = parseQuestion(section.nodes)
  if (parsed.prompt === "") fail(ctx, section.line, "pergunta sem enunciado: escreva o texto antes das alternativas")
  if (parsed.options.length === 0) fail(ctx, section.line, "pergunta sem alternativas: use linhas \"- [ ] texto\" e marque a correta com \"- [x]\"")
  const emptyOption = parsed.options.find((option) => option.text === "")
  if (emptyOption) fail(ctx, emptyOption.line, "alternativa sem texto")
  const correct = parsed.options.flatMap((option, index) => (option.checked ? [index] : []))
  const [correctIndex] = correct
  if (correctIndex === undefined || correct.length !== 1) {
    fail(ctx, section.line, `a pergunta precisa de exatamente uma alternativa marcada com [x] (veio ${correct.length})`)
  }
  const question: StepQuizQuestionInput = { prompt: parsed.prompt, options: parsed.options.map((option) => option.text), correct_index: correctIndex, explanation: parsed.explanation }
  ctx.locations.set(question, { file: ctx.file, line: section.line })
  return question
}

function emptyStep(header: StepHeader, narrative: string): BundleStep {
  return {
    order: header.number,
    kind: header.kind,
    title: header.title,
    narrative_markdown: narrative,
    starter_files: [],
    solution_files: [],
    checkpoints: [],
    test_cases: [],
    hints: [],
    quiz_questions: [],
    wrong_solutions: [],
    xp: DEFAULT_STEP_XP,
  }
}

/** Monta o passo do pacote a partir das seções; seções ausentes ficam vazias (o lint cobra as obrigatórias). */
function buildStep(ctx: ParseContext, block: StepBlock): BundleStep {
  checkSections(ctx, block)
  const step = emptyStep(block.header, rawText(block.narrative))
  ctx.locations.set(step, { file: ctx.file, line: block.header.line })
  for (const section of block.sections) {
    ctx.locations.setField(step, FIELD_BY_SECTION[section.name], section.line)
    switch (section.name) {
      case "instrucoes":
        step.checkpoints = parseCheckpoints(ctx, section)
        break
      case "codigo inicial":
        step.starter_files = parseFiles(ctx, section)
        break
      case "solucao":
        step.solution_files = parseFiles(ctx, section)
        break
      case "dicas":
        step.hints = parseHints(ctx, section)
        break
      case "verificacao":
        step.test_cases = parseTestCases(ctx, section)
        break
      case "solucoes erradas":
        step.wrong_solutions = parseWrongSolutions(ctx, section)
        break
      case "pergunta":
        step.quiz_questions.push(parseQuizQuestion(ctx, section))
        break
    }
  }
  return step
}

const FIELD_BY_SECTION: Readonly<Record<SectionName, keyof BundleStep>> = {
  instrucoes: "checkpoints",
  "codigo inicial": "starter_files",
  solucao: "solution_files",
  dicas: "hints",
  verificacao: "test_cases",
  "solucoes erradas": "wrong_solutions",
  pergunta: "quiz_questions",
}

interface Frontmatter {
  yamlText: string
  /** Linha da primeira linha do YAML. */
  firstLine: number
  /** Linha do `---` de fechamento. */
  endLine: number
}

/** O cabeçalho YAML entre o `---` da primeira linha e o próximo `---`. */
function extractFrontmatter(ctx: ParseContext, lines: readonly SourceLine[]): Frontmatter {
  const [first] = lines
  if (!first || first.text.trim() !== FRONTMATTER_DELIMITER) fail(ctx, 1, "o arquivo precisa começar com o cabeçalho YAML entre linhas ---")
  const closing = lines.slice(1).find((line) => line.text.trim() === FRONTMATTER_DELIMITER)
  if (!closing) fail(ctx, 1, "cabeçalho YAML sem o --- de fechamento")
  const yamlLines = lines.slice(1, closing.number - 1)
  return { yamlText: yamlLines.map((line) => line.text).join("\n"), firstLine: 2, endLine: closing.number }
}

interface ParsedFrontmatter {
  fields: LessonFields
  /** Linha de cada campo do pacote presente no cabeçalho. */
  fieldLines: Map<string, number>
}

/** Lê e valida o cabeçalho, guardando a linha de cada campo. */
function parseFrontmatter(ctx: ParseContext, frontmatter: Frontmatter): ParsedFrontmatter {
  let yaml
  try {
    yaml = parseYamlText(frontmatter.yamlText, ctx.file, frontmatter.firstLine)
  } catch (error) {
    if (error instanceof YamlSyntaxError) fail(ctx, error.line ?? frontmatter.firstLine, error.message)
    throw error
  }
  const translated = translateYamlKeys(yaml, FRONTMATTER_KEYS, ctx.problems)
  if (!translated) throw new ParseAbort("cabeçalho inválido")
  const tipo = translated.lesson_type
  if (tipo !== undefined) {
    const lessonType = typeof tipo === "string" ? LESSON_TYPE_BY_TIPO[tipo] : undefined
    if (lessonType === undefined) fail(ctx, yaml.lineOf(["tipo"]) ?? frontmatter.firstLine, `tipo inválido: ${String(tipo)} (use ${Object.keys(LESSON_TYPE_BY_TIPO).join(", ")})`)
    translated.lesson_type = lessonType
  }
  const fields = validateYaml(yaml, translated, lessonFieldsSchema, FRONTMATTER_KEYS, ctx.problems)
  if (!fields) throw new ParseAbort("cabeçalho inválido")
  const fieldLines = new Map<string, number>()
  for (const [sourceKey, entry] of Object.entries(FRONTMATTER_KEYS)) {
    const line = yaml.keyLineOf([], sourceKey)
    if (line !== undefined) fieldLines.set(typeof entry === "string" ? entry : entry.name, line)
  }
  return { fields, fieldLines }
}

/** Lição guiada tem ≥ 1 passo; lição clássica tem exatamente um passo, do tipo do `tipo`. */
function checkLessonSteps(ctx: ParseContext, lessonType: LessonType, steps: readonly StepBlock[], lastLine: number): void {
  if (lessonType === "guided") {
    if (steps.length === 0) fail(ctx, lastLine, "lição guiada sem passos: adicione ao menos um \"## Passo 1 · …\"")
    return
  }
  const tipo = Object.keys(LESSON_TYPE_BY_TIPO).find((key) => LESSON_TYPE_BY_TIPO[key] === lessonType) ?? lessonType
  const expectedKind = STEP_KIND_BY_LESSON_TYPE[lessonType]
  const [onlyStep, secondStep] = steps
  if (!onlyStep) fail(ctx, lastLine, `lição do tipo ${tipo} precisa de exatamente um passo ${KIND_LABELS[expectedKind]}`)
  if (secondStep) fail(ctx, secondStep.header.line, `lição do tipo ${tipo} aceita um único passo (${KIND_LABELS[expectedKind]}); para vários passos use tipo: guiada`)
  if (onlyStep.header.kind !== expectedKind) {
    fail(ctx, onlyStep.header.line, `lição do tipo ${tipo} exige um passo ${KIND_LABELS[expectedKind]}, veio ${KIND_LABELS[onlyStep.header.kind]}`)
  }
}

function checkStepNumbers(ctx: ParseContext, steps: readonly StepBlock[]): void {
  steps.forEach((step, index) => {
    if (step.header.number !== index + 1) fail(ctx, step.header.line, `passo numerado ${step.header.number}; esperado ${index + 1} (numere em sequência a partir de 1)`)
    if (step.header.title === "") fail(ctx, step.header.line, "passo sem título")
  })
}

/**
 * Lê uma lição `.lvl.md`. `file` é o nome exibido nos problemas; os objetos
 * criados (lição, passos, checkpoints, casos, perguntas, soluções erradas)
 * ficam registrados em `locations`.
 */
export function parseLessonFile(text: string, file: string, locations: SourceMap): ParsedLessonFile {
  const ctx: ParseContext = { file, problems: [], locations }
  try {
    const lines = toSourceLines(text)
    const frontmatter = extractFrontmatter(ctx, lines)
    const { fields, fieldLines } = parseFrontmatter(ctx, frontmatter)
    const blocks = splitSteps(ctx, scanMarkdown(lines.slice(frontmatter.endLine)))
    checkStepNumbers(ctx, blocks)
    checkLessonSteps(ctx, fields.lesson_type, blocks, lines.length)
    const steps = blocks.map((block) => buildStep(ctx, block))
    if (ctx.problems.length > 0) return { lesson: null, problems: ctx.problems }
    const lesson: BundleLesson = { ...fields, steps }
    locations.set(lesson, { file, line: 1 })
    for (const [field, line] of fieldLines) locations.setField(lesson, field, line)
    return { lesson, problems: [] }
  } catch (error) {
    if (error instanceof MarkdownSyntaxError) report(ctx, error.line, error.message)
    else if (!(error instanceof ParseAbort)) throw error
    return { lesson: null, problems: ctx.problems }
  }
}
