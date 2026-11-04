import { boolean, check, index, integer, jsonb, pgTable, text, unique, uuid } from "drizzle-orm/pg-core"
import { LESSON_STATUSES, type GradeResult, type ProjectFile } from "@levelusp/contracts"
import { profiles } from "./profiles"
import { courses, lessons } from "./content"
import { createdAt, id, isOneOf, timestampTz, updatedAt } from "./_helpers"

const SUBMISSION_STATUSES = ["graded", "error"] as const

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

/** Cada clique em "Verificar": trilha de auditoria da nota e base das métricas do professor. */
export const submissions = pgTable(
  "submissions",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
    files: jsonb("files").$type<ProjectFile[]>().notNull(),
    status: text("status", { enum: SUBMISSION_STATUSES }).notNull(),
    passed: boolean("passed").notNull().default(false),
    result: jsonb("result").$type<GradeResult | null>(),
    engine: text("engine"),
    durationMs: integer("duration_ms"),
    createdAt: createdAt(),
  },
  (table) => [index("submissions_user_lesson_idx").on(table.userId, table.lessonId, table.createdAt), index("submissions_lesson_idx").on(table.lessonId)],
)

/** Submissão de código e o veredito guardado. */
export type SubmissionRow = typeof submissions.$inferSelect
/** Valores para gravar uma submissão. */
export type SubmissionInsert = typeof submissions.$inferInsert

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
