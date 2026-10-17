import { sql } from "drizzle-orm"
import { boolean, check, index, integer, jsonb, numeric, pgTable, text, unique, uuid } from "drizzle-orm/pg-core"
import { profiles } from "./profiles"
import { courses } from "./content"
import { createdAt, id, tstz } from "./_helpers"

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
  (t) => [
    check("exams_passing_score_check", sql`${t.passingScore} between 1 and 100`),
    check("exams_time_limit_minutes_check", sql`${t.timeLimitMinutes} > 0`),
    check("exams_cooldown_minutes_check", sql`${t.cooldownMinutes} >= 0`),
  ],
)

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
  (t) => [check("exam_questions_correct_index_check", sql`${t.correctIndex} >= 0`), index("exam_questions_exam_idx").on(t.examId)],
)

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
    startedAt: tstz("started_at").notNull().defaultNow(),
    submittedAt: tstz("submitted_at"),
    createdAt: createdAt(),
  },
  (t) => [index("exam_attempts_user_exam_idx").on(t.userId, t.examId, t.startedAt.desc())],
)

export const certificates = pgTable(
  "certificates",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    verificationCode: text("verification_code").notNull().unique(),
    examScore: numeric("exam_score", { precision: 5, scale: 2, mode: "number" }),
    projectStatus: text("project_status", { enum: ["passed", "waived"] }).notNull().default("passed"),
    issuedAt: tstz("issued_at").notNull().defaultNow(),
  },
  (t) => [
    unique("certificates_user_id_course_id_key").on(t.userId, t.courseId),
    check("certificates_project_status_check", sql`${t.projectStatus} in ('passed','waived')`),
  ],
)
