import { sql } from "drizzle-orm"
import { boolean, check, index, integer, jsonb, pgTable, text, unique, uuid } from "drizzle-orm/pg-core"
import { LESSON_STATUSES, STEP_PROGRESS_STATUSES, SUBMISSION_STATUSES, type GradeResult, type ProjectFile } from "@levelusp/contracts"
import { profiles } from "./profiles"
import { courses, lessons, lessonSteps } from "./content"
import { createdAt, id, isOneOf, timestampTz, updatedAt } from "./_helpers"

export const enrollments = pgTable(
  "enrollments",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    enrolledAt: timestampTz("enrolled_at").notNull().defaultNow(),
  },
  (table) => [unique("enrollments_user_id_course_id_key").on(table.userId, table.courseId), index("enrollments_course_idx").on(table.courseId)],
)

/** Matrícula de um aluno num curso. */
export type EnrollmentRow = typeof enrollments.$inferSelect

export const lessonProgress = pgTable(
  "lesson_progress",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
    status: text("status", { enum: LESSON_STATUSES }).notNull().default("not_started"),
    codeSnapshot: text("code_snapshot"),
    score: integer("score"),
    xpEarned: integer("xp_earned").notNull().default(0),
    completedAt: timestampTz("completed_at"),
    createdAt: createdAt(),
  },
  (table) => [
    unique("lesson_progress_user_id_lesson_id_key").on(table.userId, table.lessonId),
    index("lesson_progress_lesson_idx").on(table.lessonId, table.status),
    index("lesson_progress_user_completed_idx").on(table.userId, table.completedAt),
    check("lesson_progress_status_check", isOneOf(table.status, LESSON_STATUSES)),
  ],
)

/** Progresso do aluno numa lição; só o GamificationService grava a conclusão. */
export type LessonProgressRow = typeof lessonProgress.$inferSelect

/**
 * Progresso do aluno num passo. Um passo `exercicio` conclui quando TODOS os casos passam;
 * a lição conclui quando todos os passos estão `completed`. Só o GamificationService grava.
 */
export const lessonStepProgress = pgTable(
  "lesson_step_progress",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    stepId: uuid("step_id").notNull().references(() => lessonSteps.id, { onDelete: "cascade" }),
    status: text("status", { enum: STEP_PROGRESS_STATUSES }).notNull().default("in_progress"),
    /** Verificações reprovadas (falha de infraestrutura não conta). */
    attempts: integer("attempts").notNull().default(0),
    hintsRevealed: integer("hints_revealed").notNull().default(0),
    /** Viu a solução (ou a saída esperada) antes de concluir: o passo passa a valer metade do XP. */
    solutionViewed: boolean("solution_viewed").notNull().default(false),
    xpAwarded: integer("xp_awarded").notNull().default(0),
    completedAt: timestampTz("completed_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique("lesson_step_progress_user_id_step_id_key").on(table.userId, table.stepId),
    index("lesson_step_progress_step_idx").on(table.stepId, table.status),
    check("lesson_step_progress_status_check", isOneOf(table.status, STEP_PROGRESS_STATUSES)),
    check("lesson_step_progress_attempts_check", sql`${table.attempts} >= 0`),
    check("lesson_step_progress_hints_revealed_check", sql`${table.hintsRevealed} >= 0`),
  ],
)

/** Progresso do aluno num passo (tentativas, dicas, solução vista, XP). */
export type LessonStepProgressRow = typeof lessonStepProgress.$inferSelect
/** Valores para inserir ou atualizar em `lesson_step_progress`. */
export type LessonStepProgressInsert = typeof lessonStepProgress.$inferInsert

/**
 * Cada clique em "Verificar": trilha de auditoria da nota e base das métricas do professor.
 * `status = 'error'` marca falha de infraestrutura (executor indisponível, timeout do host):
 * não conta como tentativa nem como reprovação.
 */
export const submissions = pgTable(
  "submissions",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
    /** Passo verificado; null nas lições sem passos (e quando o passo foi apagado). */
    stepId: uuid("step_id").references(() => lessonSteps.id, { onDelete: "set null" }),
    files: jsonb("files").$type<ProjectFile[]>().notNull(),
    status: text("status", { enum: SUBMISSION_STATUSES }).notNull(),
    passed: boolean("passed").notNull().default(false),
    result: jsonb("result").$type<GradeResult | null>(),
    engine: text("engine"),
    durationMs: integer("duration_ms"),
    createdAt: createdAt(),
  },
  (table) => [
    index("submissions_user_lesson_idx").on(table.userId, table.lessonId, table.createdAt),
    index("submissions_lesson_idx").on(table.lessonId),
    index("submissions_step_idx").on(table.stepId),
    check("submissions_status_check", isOneOf(table.status, SUBMISSION_STATUSES)),
  ],
)

/** Submissão de código e o veredito guardado. */
export type SubmissionRow = typeof submissions.$inferSelect
/** Valores para gravar uma submissão. */
export type SubmissionInsert = typeof submissions.$inferInsert

/** Conclusão de curso: 100 % das lições publicadas feitas (pré-condição do certificado). */
export const courseCompletions = pgTable(
  "course_completions",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    completedAt: timestampTz("completed_at").notNull().defaultNow(),
  },
  (table) => [unique("course_completions_user_id_course_id_key").on(table.userId, table.courseId)],
)

/** Conclusão de curso registrada (uma por aluno e curso). */
export type CourseCompletionRow = typeof courseCompletions.$inferSelect

export const notes = pgTable(
  "notes",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id").references(() => lessons.id, { onDelete: "set null" }),
    courseId: uuid("course_id").references(() => courses.id, { onDelete: "set null" }),
    title: text("title"),
    content: text("content").notNull().default(""),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("idx_notes_user").on(table.userId, table.updatedAt)],
)

/** Anotação do aluno. */
export type NoteRow = typeof notes.$inferSelect
/** Valores para inserir ou atualizar em `notes`. */
export type NoteInsert = typeof notes.$inferInsert
