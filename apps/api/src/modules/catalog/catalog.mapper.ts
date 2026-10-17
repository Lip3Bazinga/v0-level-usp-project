import type { Course, Lesson, LessonSummary, LessonWithTests, Module } from "@levelusp/contracts"
import type { courses, lessons, modules } from "@levelusp/db"

type ModuleRow = typeof modules.$inferSelect
type CourseRow = typeof courses.$inferSelect
type LessonRow = typeof lessons.$inferSelect
/** Linha de lição SEM o gabarito — o que as consultas do aluno selecionam. */
export type PublicLessonRow = Omit<LessonRow, "testCases">

export function toModule(r: ModuleRow): Module {
  return { id: r.id, title: r.title, description: r.description, icon: r.icon, color: r.color, sort_order: r.sortOrder, created_at: r.createdAt }
}

export function toCourse(r: CourseRow, extra: { lessonCount?: number; enrolled?: boolean } = {}): Course {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    long_description: r.longDescription,
    cover_image_url: r.coverImageUrl,
    level: r.level,
    tags: r.tags,
    total_xp: r.totalXp,
    estimated_hours: r.estimatedHours,
    published: r.published,
    created_by: r.createdBy,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
    final_project_title: r.finalProjectTitle,
    final_project_description: r.finalProjectDescription,
    final_project_starter_code: r.finalProjectStarterCode,
    ...(extra.lessonCount !== undefined ? { lesson_count: extra.lessonCount } : {}),
    ...(extra.enrolled !== undefined ? { enrolled: extra.enrolled } : {}),
  }
}

/**
 * Lição como o ALUNO vê. Lista os campos um a um (sem spread) para que o
 * gabarito nunca seja serializado por acidente, mesmo recebendo a linha cheia.
 */
export function toLesson(r: PublicLessonRow): Lesson {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    slug: r.slug,
    module: r.module,
    order: r.order,
    difficulty: r.difficulty,
    content_markdown: r.contentMarkdown,
    starter_code: r.starterCode,
    starter_files: r.starterFiles,
    checkpoints: r.checkpoints,
    libraries: r.libraries,
    xp_reward: r.xpReward,
    time_limit: r.timeLimit,
    lesson_type: r.lessonType,
    quiz_passing_score: r.quizPassingScore,
    course_id: r.courseId,
    module_id: r.moduleId,
    created_by: r.createdBy,
    published: r.published,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  }
}

/** Lição com gabarito — SOMENTE para o dono ou admin (telas de autoria). */
export function toLessonWithTests(r: LessonRow): LessonWithTests {
  return { ...toLesson(r), test_cases: r.testCases }
}

export function toLessonSummary(r: Pick<PublicLessonRow, "id" | "title" | "slug" | "module" | "moduleId" | "order" | "difficulty" | "lessonType" | "xpReward" | "courseId" | "published">): LessonSummary {
  return {
    id: r.id,
    title: r.title,
    slug: r.slug,
    module: r.module,
    module_id: r.moduleId,
    order: r.order,
    difficulty: r.difficulty,
    lesson_type: r.lessonType,
    xp_reward: r.xpReward,
    course_id: r.courseId,
    published: r.published,
  }
}
