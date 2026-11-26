import type { Course, Lesson, LessonMetrics, LessonStep, LessonStepInput, LessonSummary, LessonWithTests, Module } from "@levelusp/contracts"
import type { CourseRow, LessonRow, ModuleRow } from "@levelusp/db"
import { passRate } from "./catalog.domain"
import type { LessonSummaryRow, PublicLessonRow } from "./lesson-columns"

/** Campos agregados do curso; `enrolled` só existe quando há usuário logado. */
export interface CourseAggregates {
  lessonCount?: number
  enrolled?: boolean
}

/** Curso com a contagem de lições publicadas e a matrícula do usuário (null sem sessão). */
export interface CourseWithAggregatesRow {
  course: CourseRow
  lessonCount: number
  /** null quando a consulta não tinha usuário logado. */
  enrolled: boolean | null
}

/** Métricas agregadas de uma lição (taxa de aprovação null quando não há submissões). */
export interface LessonMetricsRow {
  lessonId: string
  started: number
  completed: number
  submissions: number
  passed: number
}

/** Módulo no formato do contrato. */
export function toModule(module: ModuleRow): Module {
  return {
    id: module.id,
    title: module.title,
    description: module.description,
    icon: module.icon,
    color: module.color,
    sort_order: module.sortOrder,
    created_at: module.createdAt,
    course_id: module.courseId,
    slug: module.slug,
  }
}

/** Curso no formato do contrato; os agregados só entram quando informados. */
export function toCourse(course: CourseRow, aggregates: CourseAggregates = {}): Course {
  return {
    id: course.id,
    title: course.title,
    description: course.description,
    long_description: course.longDescription,
    cover_image_url: course.coverImageUrl,
    level: course.level,
    tags: course.tags,
    total_xp: course.totalXp,
    estimated_hours: course.estimatedHours,
    published: course.published,
    created_by: course.createdBy,
    created_at: course.createdAt,
    updated_at: course.updatedAt,
    final_project_title: course.finalProjectTitle,
    final_project_description: course.finalProjectDescription,
    final_project_starter_code: course.finalProjectStarterCode,
    slug: course.slug,
    prerequisite_course_id: course.prerequisiteCourseId,
    sequential: course.sequential,
    run_button_min_level: course.runButtonMinLevel,
    ...(aggregates.lessonCount !== undefined ? { lesson_count: aggregates.lessonCount } : {}),
    ...(aggregates.enrolled !== undefined ? { enrolled: aggregates.enrolled } : {}),
  }
}

/** Curso da listagem do catálogo; sem sessão, `enrolled` fica de fora da resposta. */
export function toCourseWithAggregates({ course, lessonCount, enrolled }: CourseWithAggregatesRow): Course {
  return toCourse(course, { lessonCount, ...(enrolled === null ? {} : { enrolled }) })
}

/** Lição como o ALUNO vê, sem passos (listagens e lições clássicas); ver {@link toLessonWithSteps}. */
export function toLesson(lesson: PublicLessonRow): Lesson {
  return toLessonWithSteps(lesson, [])
}

/**
 * Lição como o ALUNO vê. Lista os campos um a um (sem spread) para que o
 * gabarito (`testCases`, `solutionFiles`) nunca seja serializado por acidente,
 * mesmo recebendo a linha cheia. `steps` são os passos públicos da lição guiada
 * (já sem gabarito), carregados por quem monta a resposta. `runButtonMinLevel` é o limite do
 * curso da lição para o "Executar"; só entra na resposta quando informado.
 */
export function toLessonWithSteps(lesson: PublicLessonRow, steps: LessonStep[], runButtonMinLevel?: number | null): Lesson {
  return {
    id: lesson.id,
    title: lesson.title,
    description: lesson.description,
    slug: lesson.slug,
    module: lesson.module,
    order: lesson.order,
    difficulty: lesson.difficulty,
    content_markdown: lesson.contentMarkdown,
    starter_code: lesson.starterCode,
    starter_files: lesson.starterFiles,
    checkpoints: lesson.checkpoints,
    libraries: lesson.libraries,
    xp_reward: lesson.xpReward,
    time_limit: lesson.timeLimit,
    lesson_type: lesson.lessonType,
    quiz_passing_score: lesson.quizPassingScore,
    course_id: lesson.courseId,
    module_id: lesson.moduleId,
    published: lesson.published,
    created_at: lesson.createdAt,
    updated_at: lesson.updatedAt,
    runtime: lesson.runtime,
    is_project: lesson.isProject,
    objectives: lesson.objectives,
    solution_after_attempts: lesson.solutionAfterAttempts,
    steps,
    ...(runButtonMinLevel !== undefined ? { run_button_min_level: runButtonMinLevel } : {}),
  }
}

/** Lição com gabarito e solução de referência — SOMENTE para o dono ou admin (telas de autoria). */
export function toLessonWithTests(lesson: LessonRow, steps: LessonStep[] = [], authoringSteps: LessonStepInput[] = []): LessonWithTests {
  return {
    ...toLessonWithSteps(lesson, steps),
    test_cases: lesson.testCases,
    solution_files: lesson.solutionFiles,
    created_by: lesson.createdBy,
    authoring_steps: authoringSteps,
  }
}

/** Lição resumida para listas e trilhas. */
export function toLessonSummary(lesson: LessonSummaryRow): LessonSummary {
  return {
    id: lesson.id,
    title: lesson.title,
    slug: lesson.slug,
    module: lesson.module,
    module_id: lesson.moduleId,
    order: lesson.order,
    difficulty: lesson.difficulty,
    lesson_type: lesson.lessonType,
    xp_reward: lesson.xpReward,
    course_id: lesson.courseId,
    published: lesson.published,
    is_project: lesson.isProject,
  }
}

/** Métricas de uma lição para o painel do professor. */
export function toLessonMetrics(metrics: LessonMetricsRow): LessonMetrics {
  return {
    lesson_id: metrics.lessonId,
    started: metrics.started,
    completed: metrics.completed,
    submissions: metrics.submissions,
    pass_rate: passRate(metrics.passed, metrics.submissions),
  }
}
