import { sql } from "drizzle-orm"
import { boolean, check, index, integer, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core"
import type { Checkpoint, ProjectFile, TestCase } from "@levelusp/contracts"
import { profiles } from "./profiles"
import { createdAt, id, updatedAt } from "./_helpers"

const levels = ["iniciante", "intermediario", "avancado"] as const

export const modules = pgTable("modules", {
  id: id(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  icon: text("icon").notNull().default("BookOpen"),
  color: text("color").notNull().default("bg-level-purple"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
})

export const courses = pgTable(
  "courses",
  {
    id: id(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    longDescription: text("long_description").notNull().default(""),
    coverImageUrl: text("cover_image_url"),
    level: text("level", { enum: levels }).notNull().default("iniciante"),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    totalXp: integer("total_xp").notNull().default(0),
    estimatedHours: integer("estimated_hours").notNull().default(0),
    published: boolean("published").notNull().default(false),
    createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
    finalProjectTitle: text("final_project_title"),
    finalProjectDescription: text("final_project_description"),
    finalProjectStarterCode: text("final_project_starter_code").default(""),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("courses_level_check", sql`${t.level} in ('iniciante','intermediario','avancado')`),
    index("courses_published_idx").on(t.published),
  ],
)

export const lessons = pgTable(
  "lessons",
  {
    id: id(),
    title: text("title").notNull(),
    slug: text("slug").unique(),
    module: text("module").notNull().default(""),
    moduleId: uuid("module_id").references(() => modules.id, { onDelete: "set null" }),
    order: integer("order").notNull().default(1),
    difficulty: text("difficulty", { enum: levels }).notNull().default("iniciante"),
    description: text("description").notNull().default(""),
    contentMarkdown: text("content_markdown").notNull().default(""),
    starterCode: text("starter_code").notNull().default(""),
    starterFiles: jsonb("starter_files").$type<ProjectFile[]>().notNull().default([]),
    checkpoints: jsonb("checkpoints").$type<Checkpoint[]>().notNull().default([]),
    /** Gabarito declarativo. NUNCA sai da API para o aluno. */
    testCases: jsonb("test_cases").$type<TestCase[]>().notNull().default([]),
    libraries: text("libraries").array().notNull().default(sql`'{}'::text[]`),
    lessonType: text("lesson_type", { enum: ["coding", "theory", "quiz"] }).notNull().default("coding"),
    quizPassingScore: integer("quiz_passing_score").notNull().default(70),
    xpReward: integer("xp_reward").notNull().default(50),
    /** Tempo máximo de execução na correção, em segundos. */
    timeLimit: integer("time_limit").notNull().default(10),
    published: boolean("published").notNull().default(false),
    courseId: uuid("course_id").references(() => courses.id, { onDelete: "set null" }),
    createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("lessons_difficulty_check", sql`${t.difficulty} in ('iniciante','intermediario','avancado')`),
    check("lessons_type_check", sql`${t.lessonType} in ('coding','theory','quiz')`),
    check("lessons_quiz_passing_score_check", sql`${t.quizPassingScore} between 1 and 100`),
    check("lessons_xp_reward_check", sql`${t.xpReward} >= 0`),
    index("lessons_course_published_order_idx").on(t.courseId, t.published, t.order),
  ],
)

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
  (t) => [
    check("lesson_quiz_questions_correct_index_check", sql`${t.correctIndex} >= 0`),
    index("lesson_quiz_questions_lesson_idx").on(t.lessonId, t.sortOrder),
  ],
)
