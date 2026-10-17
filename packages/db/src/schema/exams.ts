import { sql } from "drizzle-orm"
import { boolean, check, index, integer, jsonb, numeric, pgTable, text, unique, uuid } from "drizzle-orm/pg-core"
import { profiles } from "./profiles"
import { courses } from "./content"
import { createdAt, id, isOneOf, timestampTz } from "./_helpers"

const CERTIFICATE_PROJECT_STATUSES = ["passed", "waived"] as const

export const exams = pgTable(
  "exams",
  {
    id: id(),
    courseId: uuid("course_id").notNull().unique().references(() => courses.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    passingScore: integer("passing_score").notNull().default(70),
    timeLimitMinutes: integer("time_limit_minutes").notNull().default(45),
    cooldownMinutes: integer("cooldown_minutes").notNull().default(60),
    /** Quantas questões sortear por tentativa (null = todas). */
    questionsPerAttempt: integer("questions_per_attempt"),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
  },
  (table) => [
    check("exams_passing_score_check", sql`${table.passingScore} between 1 and 100`),
    check("exams_time_limit_minutes_check", sql`${table.timeLimitMinutes} > 0`),
    check("exams_cooldown_minutes_check", sql`${table.cooldownMinutes} >= 0`),
  ],
)

export type ExamRow = typeof exams.$inferSelect

export const examQuestions = pgTable(
  "exam_questions",
  {
    id: id(),
    examId: uuid("exam_id").notNull().references(() => exams.id, { onDelete: "cascade" }),
    prompt: text("prompt").notNull(),
    options: jsonb("options").$type<string[]>().notNull().default([]),
    correctIndex: integer("correct_index").notNull(),
    explanation: text("explanation").notNull().default(""),
    topic: text("topic").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
  },
  (table) => [check("exam_questions_correct_index_check", sql`${table.correctIndex} >= 0`), index("exam_questions_exam_idx").on(table.examId)],
)

export type ExamQuestionRow = typeof examQuestions.$inferSelect
export type ExamQuestionInsert = typeof examQuestions.$inferInsert

export const examAttempts = pgTable(
  "exam_attempts",
  {
    id: id(),
    examId: uuid("exam_id").notNull().references(() => exams.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    questionIds: uuid("question_ids").array().notNull().default(sql`'{}'::uuid[]`),
    answers: jsonb("answers").$type<Record<string, number>>().notNull().default({}),
    score: numeric("score", { precision: 5, scale: 2, mode: "number" }),
    passed: boolean("passed"),
    startedAt: timestampTz("started_at").notNull().defaultNow(),
    submittedAt: timestampTz("submitted_at"),
    createdAt: createdAt(),
  },
  (table) => [index("exam_attempts_user_exam_idx").on(table.userId, table.examId, table.startedAt.desc())],
)

export type ExamAttemptRow = typeof examAttempts.$inferSelect

export const certificates = pgTable(
  "certificates",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    verificationCode: text("verification_code").notNull().unique(),
    examScore: numeric("exam_score", { precision: 5, scale: 2, mode: "number" }),
    projectStatus: text("project_status", { enum: CERTIFICATE_PROJECT_STATUSES }).notNull().default("passed"),
    issuedAt: timestampTz("issued_at").notNull().defaultNow(),
  },
  (table) => [
    unique("certificates_user_id_course_id_key").on(table.userId, table.courseId),
    check("certificates_project_status_check", isOneOf(table.projectStatus, CERTIFICATE_PROJECT_STATUSES)),
  ],
)
