import { MAX_STEP_HINTS, type BundleCourse, type BundleLesson, type BundleModule, type BundleStep, type BundleTrack } from "@levelusp/contracts"
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

/** Marcadores de texto provisório que nunca podem ir para o aluno. */
const PLACEHOLDER_PATTERNS: readonly { pattern: RegExp; label: string }[] = [
  { pattern: /\bTODO\b/, label: "TODO" },
  { pattern: /\bem breve\b/i, label: "Em breve" },
  { pattern: /\blorem\b/i, label: "lorem" },
]

const KIND_LABELS = { leitura: "Leitura", exercicio: "Exercício", quiz: "Quiz" } as const

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

function checkExerciseStep(ctx: LintContext, lesson: BundleLesson, step: BundleStep, hasPreviousExercise: boolean): void {
  const label = describeStep(step)
  if (step.checkpoints.length === 0) flag(ctx, step, null, `${label} sem ### Instruções`)
  if (step.starter_files.length === 0 && !(lesson.lesson_type === "guided" && hasPreviousExercise)) {
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
  }
}

function checkLesson(ctx: LintContext, lesson: BundleLesson): void {
  checkTitle(ctx, lesson, "lição")
  checkPlaceholders(ctx, lesson, "title", [lesson.title, lesson.description, ...lesson.objectives], `lição ${lesson.slug}`)
  if (lesson.published && lesson.objectives.length === 0) flag(ctx, lesson, "objectives", `lição publicada sem objetivos (objetivos: liste ao menos um)`)
  if (lesson.runtime === "python-dados" && lesson.libraries.length === 0) flag(ctx, lesson, "runtime", "runtime python-dados exige bibliotecas (ex.: [numpy, pandas])")
  if (lesson.runtime === "python" && lesson.libraries.length > 0) flag(ctx, lesson, "libraries", "runtime python não aceita bibliotecas (use runtime: python-dados ou bibliotecas: [])")
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
