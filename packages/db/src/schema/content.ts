import { sql } from "drizzle-orm"
import { boolean, check, index, integer, jsonb, pgTable, text, unique, uuid, type AnyPgColumn } from "drizzle-orm/pg-core"
import {
  DEFAULT_EXERCISE_MODE, DEFAULT_SOLUTION_AFTER_ATTEMPTS, DEFAULT_STEP_XP, DIFFICULTIES, EXERCISE_MODES, LESSON_RUNTIMES, LESSON_TYPES, STEP_KINDS,
  type Checkpoint, type ParsonsLine, type ProjectFile, type StepQuizQuestionInput, type TestCase,
} from "@levelusp/contracts"
import { profiles } from "./profiles"
import { createdAt, id, isOneOf, updatedAt } from "./_helpers"

/** Content-Types aceitos em `content_assets` (os mesmos do pacote de conteúdo). */
const CONTENT_ASSET_CONTENT_TYPES = ["image/svg+xml", "image/png", "image/jpeg", "image/webp", "image/gif"] as const

export const courses = pgTable(
  "courses",
  {
    id: id(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    longDescription: text("long_description").notNull().default(""),
    coverImageUrl: text("cover_image_url"),
    level: text("level", { enum: DIFFICULTIES }).notNull().default("iniciante"),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    totalXp: integer("total_xp").notNull().default(0),
    estimatedHours: integer("estimated_hours").notNull().default(0),
    published: boolean("published").notNull().default(false),
    createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
    finalProjectTitle: text("final_project_title"),
    finalProjectDescription: text("final_project_description"),
    finalProjectStarterCode: text("final_project_starter_code").default(""),
    /** Chave do upsert do conteúdo (pacote v2); null nos cursos criados pela UI antiga. */
    slug: text("slug").unique(),
    /** Nível N exige o certificado do curso apontado (null libera). */
    prerequisiteCourseId: uuid("prerequisite_course_id").references((): AnyPgColumn => courses.id, { onDelete: "set null" }),
    /** Lições só podem ser abertas na ordem. */
    sequential: boolean("sequential").notNull().default(false),
    /** Nível do jogador que libera o "Executar" nas lições do curso; null = `RUN_BUTTON_MIN_LEVEL` do contrato. */
    runButtonMinLevel: integer("run_button_min_level"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check("courses_level_check", isOneOf(table.level, DIFFICULTIES)),
    check("courses_run_button_min_level_check", sql`${table.runButtonMinLevel} >= 1`),
    index("courses_published_idx").on(table.published),
  ],
)

/** Linha de `courses` (`totalXp` é recalculado pela API, não editado). */
export type CourseRow = typeof courses.$inferSelect
/** Valores para inserir ou atualizar em `courses`. */
export type CourseInsert = typeof courses.$inferInsert

export const modules = pgTable(
  "modules",
  {
    id: id(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    icon: text("icon").notNull().default("BookOpen"),
    color: text("color").notNull().default("bg-level-purple"),
    sortOrder: integer("sort_order").notNull().default(0),
    /** Curso dono do módulo; null nos módulos "globais" antigos (válidos até a migração do conteúdo). */
    courseId: uuid("course_id").references(() => courses.id, { onDelete: "cascade" }),
    /** Único dentro do curso (chave do upsert do conteúdo). */
    slug: text("slug"),
    createdAt: createdAt(),
  },
  (table) => [unique("modules_course_id_slug_key").on(table.courseId, table.slug)],
)

/** Linha de `modules`. */
export type ModuleRow = typeof modules.$inferSelect
/** Valores para inserir em `modules` (colunas com default são opcionais). */
export type ModuleInsert = typeof modules.$inferInsert

export const lessons = pgTable(
  "lessons",
  {
    id: id(),
    title: text("title").notNull(),
    slug: text("slug").unique(),
    module: text("module").notNull().default(""),
    moduleId: uuid("module_id").references(() => modules.id, { onDelete: "set null" }),
    order: integer("order").notNull().default(1),
    difficulty: text("difficulty", { enum: DIFFICULTIES }).notNull().default("iniciante"),
    description: text("description").notNull().default(""),
    contentMarkdown: text("content_markdown").notNull().default(""),
    starterCode: text("starter_code").notNull().default(""),
    starterFiles: jsonb("starter_files").$type<ProjectFile[]>().notNull().default([]),
    checkpoints: jsonb("checkpoints").$type<Checkpoint[]>().notNull().default([]),
    /** Gabarito declarativo. NUNCA sai da API para o aluno. */
    testCases: jsonb("test_cases").$type<TestCase[]>().notNull().default([]),
    libraries: text("libraries").array().notNull().default(sql`'{}'::text[]`),
    lessonType: text("lesson_type", { enum: LESSON_TYPES }).notNull().default("coding"),
    quizPassingScore: integer("quiz_passing_score").notNull().default(70),
    xpReward: integer("xp_reward").notNull().default(50),
    /** Tempo estimado de estudo, em minutos (informativo; não limita a correção). */
    timeLimit: integer("time_limit").notNull().default(10),
    published: boolean("published").notNull().default(false),
    courseId: uuid("course_id").references(() => courses.id, { onDelete: "set null" }),
    createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
    /** Motor da correção: CPython WASI (`python`) ou Pyodide com bibliotecas de dados (`python-dados`). */
    runtime: text("runtime", { enum: LESSON_RUNTIMES }).notNull().default("python"),
    /** Projeto do nível: conta para o certificado do curso. */
    isProject: boolean("is_project").notNull().default(false),
    objectives: text("objectives").array().notNull().default(sql`'{}'::text[]`),
    /** Solução de referência. NUNCA sai para o aluno antes da regra de liberação. */
    solutionFiles: jsonb("solution_files").$type<ProjectFile[]>().notNull().default([]),
    /** Verificações reprovadas de um passo antes de liberar a solução (0 = nunca). */
    solutionAfterAttempts: integer("solution_after_attempts").notNull().default(DEFAULT_SOLUTION_AFTER_ATTEMPTS),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check("lessons_difficulty_check", isOneOf(table.difficulty, DIFFICULTIES)),
    check("lessons_type_check", isOneOf(table.lessonType, LESSON_TYPES)),
    check("lessons_quiz_passing_score_check", sql`${table.quizPassingScore} between 1 and 100`),
    check("lessons_xp_reward_check", sql`${table.xpReward} >= 0`),
    check("lessons_runtime_check", isOneOf(table.runtime, LESSON_RUNTIMES)),
    check("lessons_solution_after_attempts_check", sql`${table.solutionAfterAttempts} >= 0`),
    index("lessons_course_published_order_idx").on(table.courseId, table.published, table.order),
  ],
)

/**
 * Linha completa de `lessons`, COM o gabarito em `testCases` e a solução em `solutionFiles`:
 * respostas ao aluno usam as colunas públicas.
 */
export type LessonRow = typeof lessons.$inferSelect
/** Valores para inserir ou atualizar em `lessons`. */
export type LessonInsert = typeof lessons.$inferInsert

export const lessonQuizQuestions = pgTable(
  "lesson_quiz_questions",
  {
    id: id(),
    lessonId: uuid("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
    prompt: text("prompt").notNull(),
    options: jsonb("options").$type<string[]>().notNull().default([]),
    correctIndex: integer("correct_index").notNull(),
    explanation: text("explanation").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (table) => [
    check("lesson_quiz_questions_correct_index_check", sql`${table.correctIndex} >= 0`),
    index("lesson_quiz_questions_lesson_idx").on(table.lessonId, table.sortOrder),
  ],
)

/** Questão de quiz de lição, com o gabarito (`correctIndex`). */
export type LessonQuizQuestionRow = typeof lessonQuizQuestions.$inferSelect
/** Valores para inserir em `lesson_quiz_questions`. */
export type LessonQuizQuestionInsert = typeof lessonQuizQuestions.$inferInsert

/**
 * Passos de uma lição guiada (formato Codecademy). `solutionFiles`, `testCases`, `expectedOutput`
 * e o `correct_index` de `quizQuestions` são gabarito: NUNCA saem da API para o aluno.
 */
export const lessonSteps = pgTable(
  "lesson_steps",
  {
    id: id(),
    lessonId: uuid("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
    order: integer("order").notNull(),
    kind: text("kind", { enum: STEP_KINDS }).notNull(),
    title: text("title").notNull(),
    narrativeMarkdown: text("narrative_markdown").notNull().default(""),
    starterFiles: jsonb("starter_files").$type<ProjectFile[]>().notNull().default([]),
    /** Solução de referência do passo (privada até a regra de liberação). */
    solutionFiles: jsonb("solution_files").$type<ProjectFile[]>().notNull().default([]),
    checkpoints: jsonb("checkpoints").$type<Checkpoint[]>().notNull().default([]),
    /** Casos corrigidos ao verificar o passo (privados). */
    testCases: jsonb("test_cases").$type<TestCase[]>().notNull().default([]),
    /** Até 3 dicas, reveladas uma a uma. */
    hints: text("hints").array().notNull().default(sql`'{}'::text[]`),
    /** Questões do passo de quiz, com gabarito (privado). */
    quizQuestions: jsonb("quiz_questions").$type<StepQuizQuestionInput[]>().notNull().default([]),
    xp: integer("xp").notNull().default(DEFAULT_STEP_XP),
    /** Como o exercício é respondido: escrevendo o código, preenchendo lacunas ou ordenando linhas. */
    exerciseMode: text("exercise_mode", { enum: EXERCISE_MODES }).notNull().default(DEFAULT_EXERCISE_MODE),
    /** Linhas embaralhadas do exercício `ordenar` (públicas; a ordem certa é a de `solutionFiles`). */
    parsonsLines: jsonb("parsons_lines").$type<ParsonsLine[]>().notNull().default([]),
    /** Saída esperada do passo `previsao` (privada: a comparação é feita na API). */
    expectedOutput: text("expected_output").notNull().default(""),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique("lesson_steps_lesson_id_order_key").on(table.lessonId, table.order),
    check("lesson_steps_order_check", sql`${table.order} >= 1`),
    check("lesson_steps_kind_check", isOneOf(table.kind, STEP_KINDS)),
    check("lesson_steps_exercise_mode_check", isOneOf(table.exerciseMode, EXERCISE_MODES)),
    check("lesson_steps_xp_check", sql`${table.xp} >= 0`),
  ],
)

/** Linha completa de `lesson_steps`, COM o gabarito: o DTO público do passo é montado campo a campo. */
export type LessonStepRow = typeof lessonSteps.$inferSelect
/** Valores para inserir ou atualizar em `lesson_steps`. */
export type LessonStepInsert = typeof lessonSteps.$inferInsert

/**
 * Imagens do conteúdo (pacote compilado → banco), servidas pela rota pública de assets.
 * `path` é `<slug do curso>/<slug do módulo>/<arquivo>`; o conteúdo fica em base64.
 */
export const contentAssets = pgTable(
  "content_assets",
  {
    id: id(),
    path: text("path").notNull().unique(),
    contentType: text("content_type", { enum: CONTENT_ASSET_CONTENT_TYPES }).notNull(),
    dataBase64: text("data_base64").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    /** SHA-256 do conteúdo (hex): ETag e versão da URL. */
    sha256: text("sha256").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check("content_assets_content_type_check", isOneOf(table.contentType, CONTENT_ASSET_CONTENT_TYPES)),
    check("content_assets_size_bytes_check", sql`${table.sizeBytes} > 0`),
  ],
)

/** Linha de `content_assets` (com o conteúdo em base64). */
export type ContentAssetRow = typeof contentAssets.$inferSelect
/** Valores para inserir ou atualizar em `content_assets`. */
export type ContentAssetInsert = typeof contentAssets.$inferInsert
