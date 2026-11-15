import { z } from "zod"
import { difficultySchema, slugSchema } from "./common"
import { bundleAssetsSchema } from "./content-assets"
import { projectFileSchema } from "./files"
import { DEFAULT_SOLUTION_AFTER_ATTEMPTS, lessonRuntimeSchema, lessonTypeSchema, MAX_LESSON_OBJECTIVES, MAX_SOLUTION_AFTER_ATTEMPTS, type LessonType } from "./lessons"
import { CORRECT_INDEX_OUT_OF_RANGE, correctIndexWithinOptions, multipleChoiceFields } from "./questions"
import { checkStepContent, checkStepOrders, DEFAULT_EXERCISE_MODE, lessonStepFields, MAX_LESSON_STEPS, type ExerciseMode, type StepKind } from "./steps"

/**
 * Pacote compilado de conteúdo (`pnpm content:build` → `packages/db/seed/*.json`),
 * formato 2 (docs/v2/curso-e-passos.md §6.2). O seed e `POST /admin/content/import`
 * validam o pacote com {@link contentBundleSchema} e fazem upsert por `slug`.
 * `wrong_solutions` existe só para a verificação do conteúdo e nunca é gravado.
 * `assets` leva as imagens das narrativas (ver `content-assets.ts`).
 */

/** Versão do formato aceita por {@link contentBundleSchema}. */
export const CONTENT_BUNDLE_FORMAT = 2

/** Solução errada de um passo: deve REPROVAR na verificação (`pnpm content:verify`). */
export const wrongSolutionSchema = z.object({
  name: z.string().trim().min(1).max(160),
  files: z.array(projectFileSchema).min(1).max(30),
})
/** Solução errada já validada. */
export type WrongSolution = z.infer<typeof wrongSolutionSchema>

export const bundleStepSchema = z
  .object({ ...lessonStepFields, wrong_solutions: z.array(wrongSolutionSchema).max(20).default([]) })
  .superRefine(checkStepContent)
/** Passo do pacote: o passo do professor mais as soluções erradas. */
export type BundleStep = z.infer<typeof bundleStepSchema>

/** Tipo de passo que uma lição clássica (sem passos no banco) carrega no pacote. */
export const FLAT_STEP_KIND_BY_LESSON_TYPE: Readonly<Record<Exclude<LessonType, "guided">, StepKind>> = {
  coding: "exercicio",
  theory: "leitura",
  quiz: "quiz",
}

interface LessonShape {
  lesson_type: LessonType
  steps: readonly { kind: StepKind; exercise_mode: ExerciseMode }[]
}

/**
 * Lição guiada tem ≥ 1 passo; lição clássica tem exatamente UM passo, do tipo correspondente
 * (`coding` ↔ `exercicio`, `theory` ↔ `leitura`, `quiz` ↔ `quiz`), que vira os campos planos.
 */
function checkLessonSteps(lesson: LessonShape, ctx: z.RefinementCtx): void {
  if (lesson.lesson_type === "guided") {
    if (lesson.steps.length === 0) ctx.addIssue({ code: "custom", path: ["steps"], message: "lição guiada precisa de pelo menos um passo" })
    return
  }
  const [onlyStep] = lesson.steps
  if (lesson.steps.length !== 1 || !onlyStep) {
    ctx.addIssue({ code: "custom", path: ["steps"], message: `lição ${lesson.lesson_type} precisa de exatamente um passo (veio ${lesson.steps.length})` })
    return
  }
  const expectedKind = FLAT_STEP_KIND_BY_LESSON_TYPE[lesson.lesson_type]
  if (onlyStep.kind !== expectedKind) {
    ctx.addIssue({ code: "custom", path: ["steps", 0, "kind"], message: `lição ${lesson.lesson_type} exige um passo ${expectedKind}, veio ${onlyStep.kind}` })
  }
  // A lição clássica não guarda o modo do exercício: lacunas e ordenar só existem em passos de lição guiada.
  if (onlyStep.exercise_mode !== DEFAULT_EXERCISE_MODE) {
    ctx.addIssue({ code: "custom", path: ["steps", 0, "exercise_mode"], message: `o modo ${onlyStep.exercise_mode} só vale em lição guiada` })
  }
}

export const bundleLessonSchema = z
  .object({
    slug: slugSchema,
    title: z.string().trim().min(3).max(160),
    description: z.string().trim().max(1000).default(""),
    difficulty: difficultySchema.default("iniciante"),
    lesson_type: lessonTypeSchema,
    runtime: lessonRuntimeSchema.default("python"),
    libraries: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
    xp_reward: z.number().int().min(0).max(5000).default(50),
    /** Tempo estimado de estudo, em minutos. */
    time_limit: z.number().int().min(1).max(300).default(10),
    published: z.boolean().default(true),
    is_project: z.boolean().default(false),
    solution_after_attempts: z.number().int().min(0).max(MAX_SOLUTION_AFTER_ATTEMPTS).default(DEFAULT_SOLUTION_AFTER_ATTEMPTS),
    objectives: z.array(z.string().trim().min(1).max(300)).max(MAX_LESSON_OBJECTIVES).default([]),
    quiz_passing_score: z.number().int().min(1).max(100).default(70),
    steps: z.array(bundleStepSchema).min(1).max(MAX_LESSON_STEPS).superRefine(checkStepOrders),
  })
  .superRefine(checkLessonSteps)
/** Lição do pacote, com os padrões aplicados. */
export type BundleLesson = z.infer<typeof bundleLessonSchema>

export const bundleModuleSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).default(""),
  icon: z.string().trim().max(60).default("BookOpen"),
  color: z.string().trim().max(60).default("bg-level-purple"),
  sort_order: z.number().int().min(0).default(0),
  lessons: z.array(bundleLessonSchema).max(200),
})
/** Módulo do pacote (sempre dentro de um curso). */
export type BundleModule = z.infer<typeof bundleModuleSchema>

export const bundleExamQuestionSchema = z
  .object({ ...multipleChoiceFields, topic: z.string().trim().max(120).default("") })
  .refine(correctIndexWithinOptions, CORRECT_INDEX_OUT_OF_RANGE)
/** Questão da prova no pacote (com gabarito). */
export type BundleExamQuestion = z.infer<typeof bundleExamQuestionSchema>

export const bundleExamSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).default(""),
  passing_score: z.number().int().min(1).max(100).default(70),
  time_limit_minutes: z.number().int().min(1).max(600).default(45),
  cooldown_minutes: z.number().int().min(0).max(10_080).default(60),
  /** Questões sorteadas por tentativa (null = todas). */
  questions_per_attempt: z.number().int().min(1).max(200).nullable().default(null),
  questions: z.array(bundleExamQuestionSchema).min(1).max(500),
})
/** Prova do curso no pacote. */
export type BundleExam = z.infer<typeof bundleExamSchema>

export const bundleCourseSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(500).default(""),
  long_description: z.string().trim().max(20_000).default(""),
  level: difficultySchema.default("iniciante"),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  estimated_hours: z.number().int().min(0).max(1000).default(0),
  /** Posição do curso (nível) na trilha; informativo, a ordem real é a lista `courses` da trilha. */
  order: z.number().int().min(0).default(0),
  published: z.boolean().default(false),
  /** Slug do curso cujo certificado libera este (null = liberado). */
  prerequisite: slugSchema.nullable().default(null),
  sequential: z.boolean().default(false),
  exam: bundleExamSchema.nullable().default(null),
  modules: z.array(bundleModuleSchema).max(100),
})
/** Curso (nível certificável) do pacote. */
export type BundleCourse = z.infer<typeof bundleCourseSchema>

export const bundleTrackSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(2000).default(""),
  icon: z.string().trim().max(60).default("BookOpen"),
  color: z.string().trim().max(60).default("bg-level-purple"),
  sort_order: z.number().int().min(0).default(0),
  published: z.boolean().default(false),
  certificate_title: z.string().trim().max(160).default(""),
  /** Slugs dos cursos na ordem da trilha. */
  courses: z.array(slugSchema).max(50).refine((slugs) => new Set(slugs).size === slugs.length, "curso repetido na trilha"),
})
/** Trilha do pacote. */
export type BundleTrack = z.infer<typeof bundleTrackSchema>

/** Valor com o caminho de onde ele veio no pacote (para apontar o erro no lugar certo). */
interface LocatedSlug {
  slug: string
  path: (string | number)[]
}

function addDuplicateIssues(items: readonly LocatedSlug[], ctx: z.RefinementCtx, label: string): void {
  const seen = new Set<string>()
  for (const { slug, path } of items) {
    if (seen.has(slug)) ctx.addIssue({ code: "custom", path, message: `${label} repetido: ${slug}` })
    seen.add(slug)
  }
}

/** Slugs únicos: trilhas entre si, cursos entre si, módulos dentro do curso e lições em todo o pacote. */
function checkUniqueSlugs(bundle: { tracks: readonly BundleTrack[]; courses: readonly BundleCourse[] }, ctx: z.RefinementCtx): void {
  addDuplicateIssues(bundle.tracks.map((track, index) => ({ slug: track.slug, path: ["tracks", index, "slug"] })), ctx, "slug de trilha")
  addDuplicateIssues(bundle.courses.map((course, index) => ({ slug: course.slug, path: ["courses", index, "slug"] })), ctx, "slug de curso")
  const lessons: LocatedSlug[] = []
  bundle.courses.forEach((course, courseIndex) => {
    const coursePath = ["courses", courseIndex, "modules"]
    addDuplicateIssues(course.modules.map((module, index) => ({ slug: module.slug, path: [...coursePath, index, "slug"] })), ctx, "slug de módulo")
    course.modules.forEach((module, moduleIndex) => {
      module.lessons.forEach((lesson, lessonIndex) => {
        lessons.push({ slug: lesson.slug, path: [...coursePath, moduleIndex, "lessons", lessonIndex, "slug"] })
      })
    })
  })
  addDuplicateIssues(lessons, ctx, "slug de lição")
}

export const contentBundleSchema = z
  .object({
    format: z.literal(CONTENT_BUNDLE_FORMAT),
    generated_at: z.string().max(64).optional(),
    tracks: z.array(bundleTrackSchema).max(50).default([]),
    courses: z.array(bundleCourseSchema).max(100),
    /** Imagens citadas nas narrativas: `<curso>/<módulo>/<arquivo>` → tipo e conteúdo em base64. */
    assets: bundleAssetsSchema.default({}),
  })
  .superRefine(checkUniqueSlugs)
/** Resposta de `POST /admin/content/import`: quantas linhas de cada tipo o pacote criou ou atualizou. */
export interface ContentImportSummary {
  tracks: number
  courses: number
  modules: number
  lessons: number
  steps: number
  assets: number
}

/** Pacote inteiro, validado: o que o seed e a importação do admin consomem. */
export type ContentBundle = z.infer<typeof contentBundleSchema>
