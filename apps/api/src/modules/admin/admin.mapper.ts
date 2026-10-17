import type { Lesson } from "@levelusp/contracts"
import type { AdminLessonRow } from "./admin.repository"

/** Lição sem gabarito (a linha já vem sem `test_cases`). */
export function toLesson(r: AdminLessonRow): Lesson {
  return {
    id: r.id, title: r.title, description: r.description, slug: r.slug, module: r.module, order: r.order, difficulty: r.difficulty,
    content_markdown: r.contentMarkdown, starter_code: r.starterCode, starter_files: r.starterFiles, checkpoints: r.checkpoints,
    libraries: r.libraries, xp_reward: r.xpReward, time_limit: r.timeLimit, lesson_type: r.lessonType,
    quiz_passing_score: r.quizPassingScore, course_id: r.courseId, module_id: r.moduleId, created_by: r.createdBy,
    published: r.published, created_at: r.createdAt, updated_at: r.updatedAt,
  }
}
