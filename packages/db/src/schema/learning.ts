import { sql } from "drizzle-orm"
import { boolean, check, index, integer, jsonb, pgTable, text, unique, uuid } from "drizzle-orm/pg-core"
import type { GradeResult, ProjectFile } from "@levelusp/contracts"
import { profiles } from "./profiles"
import { courses, lessons } from "./content"
import { createdAt, id, tstz, updatedAt } from "./_helpers"

export const enrollments = pgTable(
  "enrollments",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    enrolledAt: tstz("enrolled_at").notNull().defaultNow(),
  },
  (t) => [unique("enrollments_user_id_course_id_key").on(t.userId, t.courseId), index("enrollments_course_idx").on(t.courseId)],
)

export const lessonProgress = pgTable(
  "lesson_progress",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
    status: text("status", { enum: ["not_started", "in_progress", "completed"] }).notNull().default("not_started"),
    codeSnapshot: text("code_snapshot"),
    score: integer("score"),
    xpEarned: integer("xp_earned").notNull().default(0),
    completedAt: tstz("completed_at"),
    createdAt: createdAt(),
  },
  (t) => [
    unique("lesson_progress_user_id_lesson_id_key").on(t.userId, t.lessonId),
    index("lesson_progress_lesson_idx").on(t.lessonId, t.status),
    index("lesson_progress_user_completed_idx").on(t.userId, t.completedAt),
    check("lesson_progress_status_check", sql`${t.status} in ('not_started','in_progress','completed')`),
  ],
)

/** Cada clique em "Verificar": trilha de auditoria da nota e base das métricas do professor. */
export const submissions = pgTable(
  "submissions",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
    files: jsonb("files").$type<ProjectFile[]>().notNull(),
    status: text("status", { enum: ["graded", "error"] }).notNull(),
    passed: boolean("passed").notNull().default(false),
    result: jsonb("result").$type<GradeResult | null>(),
    engine: text("engine"),
    durationMs: integer("duration_ms"),
    createdAt: createdAt(),
  },
  (t) => [index("submissions_user_lesson_idx").on(t.userId, t.lessonId, t.createdAt), index("submissions_lesson_idx").on(t.lessonId)],
)

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
  (t) => [index("idx_notes_user").on(t.userId, t.updatedAt)],
)
