import {
  BLANK_PATTERN, BLANK_TOKEN, checkLibraries, DEFAULT_ENTRY_FILE, isParsonsSolutionOrder, MAX_PARSONS_LINES, MAX_STEP_HINTS, PARSONS_INDENT_WIDTH, parsonsSolutionLines, runtimeSupportsProbe,
  type BundleCourse, type BundleLesson, type BundleModule, type BundleStep, type BundleTrack, type ProjectFile,
} from "@levelusp/contracts"
import type { CompiledContent } from "./compiler"
import { problemAt, type ContentProblem, type SourceMap } from "./source-map"

/**
 * Lint do conteúdo (`pnpm content:check`), sem executar código: regras de
 * docs/v2/curso-e-passos.md §6.3 sobre o pacote compilado. Cada problema
 * aponta o arquivo e a linha mais próxima do que está errado.
 */

/** Menor título aceito (lições, passos, módulos, cursos e trilhas). */
export const MIN_TITLE_LENGTH = 3
/** Narrativa mínima de um passo de leitura, em caracteres. */
export const MIN_READING_NARRATIVE_LENGTH = 200
/** Menor número de alternativas de uma pergunta. */
export const MIN_QUIZ_OPTIONS = 2
/** Menor número de linhas da solução de um exercício `ordenar` (com menos, a ordem é óbvia). */
export const MIN_PARSONS_SOLUTION_LINES = 3

/** Marcadores de texto provisório que nunca podem ir para o aluno. */
const PLACEHOLDER_PATTERNS: readonly { pattern: RegExp; label: string }[] = [
  { pattern: /\bTODO\b/, label: "TODO" },
  { pattern: /\bem breve\b/i, label: "Em breve" },
  { pattern: /\blorem\b/i, label: "lorem" },
]

const KIND_LABELS = { leitura: "Leitura", exercicio: "Exercício", quiz: "Quiz", previsao: "Previsão" } as const

interface LintContext {
  locations: SourceMap
  problems: ContentProblem[]
}

function fileOf(ctx: LintContext, target: object): string {
  return ctx.locations.get(target)?.file ?? "(origem desconhecida)"
}

/** Problema apontando a linha do campo (ou a do objeto). */
function flag(ctx: LintContext, target: object, field: string | null, message: string): void {
  const location = field === null ? ctx.locations.get(target) : ctx.locations.getField(target, field)
  ctx.problems.push(problemAt(location, fileOf(ctx, target), message))
}

function describeStep(step: BundleStep): string {
  return `passo ${step.order} (${KIND_LABELS[step.kind]} · ${step.title})`
}

function checkTitle(ctx: LintContext, target: { title: string }, label: string): void {
  if (target.title.trim().length < MIN_TITLE_LENGTH) flag(ctx, target, "title", `${label} com título curto demais: "${target.title}" (mínimo ${MIN_TITLE_LENGTH} caracteres)`)
}

function checkPlaceholders(ctx: LintContext, target: object, field: string | null, texts: readonly string[], label: string): void {
  for (const { pattern, label: marker } of PLACEHOLDER_PATTERNS) {
    if (texts.some((text) => pattern.test(text))) flag(ctx, target, field, `${label} contém texto provisório ("${marker}")`)
  }
}

interface SlugOwner {
  kind: string
  slug: string
  target: object
}

/** Slugs únicos entre trilhas, cursos, módulos e lições, todos juntos. */
function checkUniqueSlugs(ctx: LintContext, owners: readonly SlugOwner[]): void {
  const firstOwner = new Map<string, SlugOwner>()
  for (const owner of owners) {
    const first = firstOwner.get(owner.slug)
    if (!first) {
      firstOwner.set(owner.slug, owner)
      continue
    }
    const where = ctx.locations.getField(first.target, "slug")
    flag(ctx, owner.target, "slug", `slug repetido: ${owner.slug} (${owner.kind}; já usado por ${first.kind} em ${where ? `${where.file}:${where.line}` : "outro arquivo"})`)
  }
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** O arquivo da solução é o do código inicial com cada lacuna trocada por um trecho não vazio da mesma linha. */
export function fillsBlanks(starter: string, solution: string): boolean {
  const pieces = starter.trimEnd().split(BLANK_PATTERN).map(escapeRegExp)
  return new RegExp(`^${pieces.join("[^\\n]+?")}$`).test(solution.trimEnd())
}

/** `modo: lacunas`: há lacunas no código inicial e a solução é o código inicial com elas preenchidas. */
function checkBlanksExercise(ctx: LintContext, step: BundleStep, label: string): void {
  const withBlanks = step.starter_files.filter((file) => file.content.search(BLANK_PATTERN) !== -1)
  if (withBlanks.length === 0) {
    flag(ctx, step, "starter_files", `${label} (modo lacunas) sem nenhuma lacuna: marque com ${BLANK_TOKEN} os trechos que o aluno completa em ### Código inicial`)
    return
  }
  const solutionByPath = new Map(step.solution_files.map((file): [string, ProjectFile] => [file.path, file]))
  for (const starter of step.starter_files) {
    const solution = solutionByPath.get(starter.path)
    if (!solution) flag(ctx, step, "solution_files", `${label} (modo lacunas): a solução não tem o arquivo ${starter.path} do código inicial`)
    else if (!fillsBlanks(starter.content, solution.content)) {
      flag(ctx, step, "solution_files", `${label} (modo lacunas): a solução de ${starter.path} não é o código inicial com as lacunas preenchidas (fora das lacunas os dois precisam ser idênticos)`)
    }
  }
  if (step.solution_files.length !== step.starter_files.length) flag(ctx, step, "solution_files", `${label} (modo lacunas): a solução tem arquivos que não estão no código inicial`)
  if (step.solution_files.some((file) => file.content.search(BLANK_PATTERN) !== -1)) flag(ctx, step, "solution_files", `${label} (modo lacunas): a solução ainda tem lacunas (${BLANK_TOKEN})`)
}

/** `modo: ordenar`: solução num único main.py com indentação regular; linhas suficientes, distintas dos distratores e embaralhadas. */
function checkParsonsExercise(ctx: LintContext, step: BundleStep, label: string): void {
  const [solution] = step.solution_files
  if (!solution) return
  if (step.solution_files.length !== 1 || solution.path !== DEFAULT_ENTRY_FILE) {
    flag(ctx, step, "solution_files", `${label} (modo ordenar): a solução precisa ser um único bloco \`\`\`python (${DEFAULT_ENTRY_FILE})`)
    return
  }
  const solutionLines = parsonsSolutionLines(solution.content)
  if (solutionLines.length < MIN_PARSONS_SOLUTION_LINES) {
    flag(ctx, step, "solution_files", `${label} (modo ordenar): a solução tem ${solutionLines.length} linha(s) de código; mínimo ${MIN_PARSONS_SOLUTION_LINES}`)
  }
  if (solutionLines.some((line) => line.indent === null)) {
    flag(ctx, step, "solution_files", `${label} (modo ordenar): a solução precisa indentar com múltiplos de ${PARSONS_INDENT_WIDTH} espaços (sem tabulação), porque o aluno indenta por níveis`)
  }
  if (step.parsons_lines.length > MAX_PARSONS_LINES) flag(ctx, step, "parsons_lines", `${label} (modo ordenar): ${step.parsons_lines.length} linhas com os distratores (máximo ${MAX_PARSONS_LINES})`)
  const solutionTexts = solutionLines.map((line) => line.text)
  const distractors = step.parsons_lines.map((line) => line.text)
  for (const text of solutionTexts) {
    const index = distractors.indexOf(text)
    if (index !== -1) distractors.splice(index, 1)
  }
  for (const distractor of distractors) {
    if (solutionTexts.includes(distractor)) flag(ctx, step, "parsons_lines", `${label} (modo ordenar): o distrator "${distractor}" é igual a uma linha da solução`)
  }
  if (new Set(solutionTexts).size < 2) flag(ctx, step, "solution_files", `${label} (modo ordenar): a solução precisa de pelo menos duas linhas diferentes`)
  else if (isParsonsSolutionOrder(step.parsons_lines, solution.content)) flag(ctx, step, "parsons_lines", `${label} (modo ordenar): as linhas saíram na ordem da solução`)
}

function checkExerciseStep(ctx: LintContext, lesson: BundleLesson, step: BundleStep, hasPreviousExercise: boolean): void {
  const label = describeStep(step)
  if (step.exercise_mode !== "codigo" && lesson.lesson_type !== "guided") flag(ctx, step, null, `${label}: modo ${step.exercise_mode} só vale em lição guiada (tipo: guiada)`)
  if (step.exercise_mode === "lacunas") checkBlanksExercise(ctx, step, label)
  if (step.exercise_mode === "ordenar") checkParsonsExercise(ctx, step, label)
  if (step.checkpoints.length === 0) flag(ctx, step, null, `${label} sem ### Instruções`)
  if (step.starter_files.length === 0 && step.exercise_mode !== "ordenar" && !(lesson.lesson_type === "guided" && hasPreviousExercise)) {
    flag(ctx, step, null, `${label} sem ### Código inicial (só pode faltar num passo de lição guiada que continua um exercício anterior)`)
  }
  if (step.solution_files.length === 0) flag(ctx, step, null, `${label} sem ### Solução`)
  if (step.test_cases.length === 0) flag(ctx, step, null, `${label} sem ### Verificação (nenhum caso de teste)`)
  if (step.wrong_solutions.length === 0) flag(ctx, step, null, `${label} sem ### Soluções erradas (precisa de pelo menos uma, que a verificação deve reprovar)`)
  if (step.hints.length > MAX_STEP_HINTS) flag(ctx, step, "hints", `${label} com ${step.hints.length} dicas (máximo ${MAX_STEP_HINTS})`)
  const checkpointIds = new Set(step.checkpoints.map((checkpoint) => checkpoint.id))
  for (const testCase of step.test_cases) {
    if (testCase.checkpoint !== undefined && !checkpointIds.has(testCase.checkpoint)) {
      flag(ctx, testCase, null, `${label}: o caso "${testCase.id}" aponta o checkpoint ${testCase.checkpoint}, que não existe nas instruções (há ${step.checkpoints.length})`)
    }
    if (testCase.kind === "io" && testCase.expected_stdout.trim() === "") {
      flag(ctx, testCase, null, `${label}: o caso "${testCase.id}" (io) está com expected_stdout vazio`)
    }
    if (testCase.kind === "unittest" && !runtimeSupportsProbe(lesson.runtime, testCase.kind)) {
      flag(ctx, testCase, null, `${label}: o caso "${testCase.id}" é unittest, que o runtime ${lesson.runtime} não aceita (sem modo estrito, a referência do professor ficaria ao alcance do aluno); use io, call, variable, source ou expr`)
    }
    if (testCase.kind === "legacy") {
      flag(ctx, testCase, null, `${label}: o caso "${testCase.id}" é legacy (roda dentro do sandbox); use io, call, variable, source, expr ou unittest`)
    }
  }
  checkPlaceholders(ctx, step, "checkpoints", step.checkpoints.flatMap((checkpoint) => [checkpoint.instruction, checkpoint.hint ?? ""]), `${label}: instruções`)
  checkPlaceholders(ctx, step, "hints", step.hints, `${label}: dicas`)
}

function checkQuizStep(ctx: LintContext, step: BundleStep): void {
  const label = describeStep(step)
  if (step.quiz_questions.length === 0) flag(ctx, step, null, `${label} sem ### Pergunta`)
  step.quiz_questions.forEach((question, index) => {
    if (question.options.length < MIN_QUIZ_OPTIONS) flag(ctx, question, null, `${label}: a pergunta ${index + 1} tem ${question.options.length} alternativa(s); mínimo ${MIN_QUIZ_OPTIONS}`)
    if (question.correct_index < 0 || question.correct_index >= question.options.length) flag(ctx, question, null, `${label}: a pergunta ${index + 1} não tem alternativa correta válida`)
    checkPlaceholders(ctx, question, null, [question.prompt, question.explanation, ...question.options], `${label}: pergunta ${index + 1}`)
  })
}

/** Passo `Previsão`: tem o código a ler (`main.py`) e até 3 dicas; a saída esperada é gerada no build. */
function checkPredictionStep(ctx: LintContext, step: BundleStep): void {
  const label = describeStep(step)
  if (!step.starter_files.some((file) => file.path === DEFAULT_ENTRY_FILE)) flag(ctx, step, null, `${label} sem ### Código (o programa que o aluno lê)`)
  if (step.narrative_markdown.trim() === "") flag(ctx, step, null, `${label} sem enunciado: escreva, antes de ### Código, o que o aluno deve prever`)
  if (step.hints.length > MAX_STEP_HINTS) flag(ctx, step, "hints", `${label} com ${step.hints.length} dicas (máximo ${MAX_STEP_HINTS})`)
  checkPlaceholders(ctx, step, "hints", step.hints, `${label}: dicas`)
}

function checkReadingStep(ctx: LintContext, step: BundleStep): void {
  const length = step.narrative_markdown.trim().length
  if (length < MIN_READING_NARRATIVE_LENGTH) flag(ctx, step, null, `${describeStep(step)} com narrativa curta demais (${length} caracteres; mínimo ${MIN_READING_NARRATIVE_LENGTH})`)
}

function checkStep(ctx: LintContext, lesson: BundleLesson, step: BundleStep, hasPreviousExercise: boolean): void {
  checkTitle(ctx, step, `passo ${step.order}`)
  checkPlaceholders(ctx, step, "title", [step.title, step.narrative_markdown], `${describeStep(step)}: narrativa`)
  switch (step.kind) {
    case "exercicio":
      checkExerciseStep(ctx, lesson, step, hasPreviousExercise)
      break
    case "quiz":
      checkQuizStep(ctx, step)
      break
    case "leitura":
      checkReadingStep(ctx, step)
      break
    case "previsao":
      checkPredictionStep(ctx, step)
      break
  }
}

/** Toda biblioteca da lição precisa estar no manifesto (`library-manifest.ts`) para o runtime dela. */
function checkLessonLibraries(ctx: LintContext, lesson: BundleLesson): void {
  const { pending, unavailable } = checkLibraries(lesson.runtime, lesson.libraries)
  if (pending.length > 0) {
    flag(ctx, lesson, "libraries", `biblioteca fora do manifesto: ${pending.join(", ")} (confira o nome ou peça a liberação: docs/v2/motores-e-ide.md)`)
  }
  if (unavailable.length > 0) {
    flag(ctx, lesson, "libraries", `biblioteca sem motor para o runtime ${lesson.runtime}: ${unavailable.join(", ")}`)
  }
}

function checkLesson(ctx: LintContext, lesson: BundleLesson): void {
  checkTitle(ctx, lesson, "lição")
  checkPlaceholders(ctx, lesson, "title", [lesson.title, lesson.description, ...lesson.objectives], `lição ${lesson.slug}`)
  if (lesson.published && lesson.objectives.length === 0) flag(ctx, lesson, "objectives", `lição publicada sem objetivos (objetivos: liste ao menos um)`)
  if (lesson.runtime !== "python" && lesson.libraries.length === 0) flag(ctx, lesson, "runtime", `runtime ${lesson.runtime} exige bibliotecas (ex.: [numpy, pandas])`)
  if (lesson.runtime === "python" && lesson.libraries.length > 0) flag(ctx, lesson, "libraries", "runtime python não aceita bibliotecas (use runtime: python-dados ou bibliotecas: [])")
  else checkLessonLibraries(ctx, lesson)
  let hasPreviousExercise = false
  for (const step of lesson.steps) {
    checkStep(ctx, lesson, step, hasPreviousExercise)
    if (step.kind === "exercicio") hasPreviousExercise = true
  }
}

function checkModule(ctx: LintContext, module: BundleModule): void {
  checkTitle(ctx, module, "módulo")
  checkPlaceholders(ctx, module, "title", [module.title, module.description], `módulo ${module.slug}`)
  for (const lesson of module.lessons) checkLesson(ctx, lesson)
}

function checkCourse(ctx: LintContext, course: BundleCourse, courseSlugs: ReadonlySet<string>): void {
  checkTitle(ctx, course, "curso")
  checkPlaceholders(ctx, course, "title", [course.title, course.description, course.long_description], `curso ${course.slug}`)
  if (course.prerequisite !== null && !courseSlugs.has(course.prerequisite)) flag(ctx, course, "prerequisite", `prerequisito aponta um curso inexistente: ${course.prerequisite}`)
  if (course.prerequisite === course.slug) flag(ctx, course, "prerequisite", "um curso não pode ser pré-requisito de si mesmo")
  const seenOrders = new Map<number, BundleModule>()
  for (const module of course.modules) {
    const clash = seenOrders.get(module.sort_order)
    if (clash) flag(ctx, module, "sort_order", `ordem ${module.sort_order} repetida no curso (também no módulo ${clash.slug})`)
    seenOrders.set(module.sort_order, module)
    checkModule(ctx, module)
  }
  if (course.exam) {
    checkPlaceholders(ctx, course.exam, "title", [course.exam.title, course.exam.description], "prova")
    course.exam.questions.forEach((question, index) => {
      checkPlaceholders(ctx, question, null, [question.prompt, question.explanation, ...question.options], `questão ${index + 1} da prova`)
    })
  }
}

function checkTrack(ctx: LintContext, track: BundleTrack, courseSlugs: ReadonlySet<string>): void {
  checkTitle(ctx, track, "trilha")
  checkPlaceholders(ctx, track, "title", [track.title, track.description, track.certificate_title], `trilha ${track.slug}`)
  for (const slug of track.courses) {
    if (!courseSlugs.has(slug)) flag(ctx, track, "courses", `a trilha cita um curso inexistente: ${slug}`)
  }
}

/** Aplica todas as regras ao conteúdo compilado e devolve os problemas (vazio = conteúdo OK). */
export function lintContent(compiled: CompiledContent): ContentProblem[] {
  const ctx: LintContext = { locations: compiled.locations, problems: [] }
  const { tracks, courses } = compiled.bundle
  const courseSlugs = new Set(courses.map((course) => course.slug))
  const owners: SlugOwner[] = [
    ...tracks.map((track) => ({ kind: "trilha", slug: track.slug, target: track })),
    ...courses.map((course) => ({ kind: "curso", slug: course.slug, target: course })),
    ...courses.flatMap((course) => course.modules.map((module) => ({ kind: "módulo", slug: module.slug, target: module }))),
    ...courses.flatMap((course) => course.modules.flatMap((module) => module.lessons.map((lesson) => ({ kind: "lição", slug: lesson.slug, target: lesson })))),
  ]
  checkUniqueSlugs(ctx, owners)
  for (const track of tracks) checkTrack(ctx, track, courseSlugs)
  for (const course of courses) checkCourse(ctx, course, courseSlugs)
  return ctx.problems
}
