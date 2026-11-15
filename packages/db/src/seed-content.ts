/**
 * Pacote de conteúdo (formato 2, docs/v2/curso-e-passos.md §6.2) → linhas do banco.
 * Só funções puras: quem grava (seed, importação do admin) resolve os ids e chama
 * {@link importContentBundle} em `content-import.ts`. `wrong_solutions` existe só para
 * a verificação do conteúdo e nunca vira linha.
 */
import { createHash } from "node:crypto"
import {
  decodeBase64, DEFAULT_ENTRY_FILE, FLAT_STEP_KIND_BY_LESSON_TYPE,
  type BundleCourse, type BundleExam, type BundleLesson, type BundleModule, type BundleStep, type BundleTrack, type ContentBundle,
} from "@levelusp/contracts"
import type {
  ContentAssetInsert, CourseInsert, ExamInsert, ExamQuestionInsert, LessonInsert, LessonQuizQuestionInsert, LessonStepInsert, ModuleInsert, TrackCourseInsert, TrackInsert,
} from "./schema/index"

/** Problema do pacote que o schema não detecta sozinho (ex.: pré-requisito que não existe em lugar nenhum). */
export class ContentBundleError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ContentBundleError"
  }
}

/** Trilha → linha de `tracks` (os cursos entram por {@link toTrackCourseInserts}). */
export function toTrackInsert(track: BundleTrack): TrackInsert {
  return {
    slug: track.slug,
    title: track.title,
    description: track.description,
    icon: track.icon,
    color: track.color,
    sortOrder: track.sort_order,
    published: track.published,
    certificateTitle: track.certificate_title,
  }
}

/**
 * Vínculos curso ↔ trilha na ordem do pacote (`position` a partir de 1).
 *
 * @throws ContentBundleError quando um slug da trilha não está no mapa (nem no pacote nem no banco).
 */
export function toTrackCourseInserts(track: BundleTrack, trackId: string, courseIdBySlug: ReadonlyMap<string, string>): TrackCourseInsert[] {
  return track.courses.map((slug, index) => {
    const courseId = courseIdBySlug.get(slug)
    if (!courseId) throw new ContentBundleError(`trilha "${track.slug}": curso "${slug}" não existe no pacote nem no banco`)
    return { trackId, courseId, position: index + 1 }
  })
}

/**
 * Curso → linha de `courses`. O pré-requisito fica de fora: é resolvido por slug depois
 * que todos os cursos do pacote existem ({@link resolvePrerequisiteId}).
 */
export function toCourseInsert(course: BundleCourse, authorId: string | null): CourseInsert {
  return {
    slug: course.slug,
    title: course.title,
    description: course.description,
    longDescription: course.long_description,
    level: course.level,
    tags: course.tags,
    estimatedHours: course.estimated_hours,
    published: course.published,
    sequential: course.sequential,
    createdBy: authorId,
  }
}

/**
 * Id do curso pré-requisito (null quando o curso é liberado).
 *
 * @throws ContentBundleError quando o slug do pré-requisito não está no mapa.
 */
export function resolvePrerequisiteId(course: BundleCourse, courseIdBySlug: ReadonlyMap<string, string>): string | null {
  if (course.prerequisite === null) return null
  const prerequisiteId = courseIdBySlug.get(course.prerequisite)
  if (!prerequisiteId) throw new ContentBundleError(`curso "${course.slug}": pré-requisito "${course.prerequisite}" não existe no pacote nem no banco`)
  if (prerequisiteId === courseIdBySlug.get(course.slug)) throw new ContentBundleError(`curso "${course.slug}" não pode ser pré-requisito de si mesmo`)
  return prerequisiteId
}

/** Prova do curso → linha de `exams` (as questões vêm de {@link toExamQuestionInserts}). */
export function toExamInsert(exam: BundleExam, courseId: string): ExamInsert {
  return {
    courseId,
    title: exam.title,
    description: exam.description,
    passingScore: exam.passing_score,
    timeLimitMinutes: exam.time_limit_minutes,
    cooldownMinutes: exam.cooldown_minutes,
    questionsPerAttempt: exam.questions_per_attempt,
    active: true,
  }
}

/** Questões da prova, numeradas pela posição no pacote. */
export function toExamQuestionInserts(exam: BundleExam, examId: string): ExamQuestionInsert[] {
  return exam.questions.map((question, index) => ({
    examId,
    prompt: question.prompt,
    options: question.options,
    correctIndex: question.correct_index,
    explanation: question.explanation,
    topic: question.topic,
    sortOrder: index,
    active: true,
  }))
}

/** Módulo → linha de `modules`, sempre com o curso dono. */
export function toModuleInsert(module: BundleModule, courseId: string): ModuleInsert {
  return {
    slug: module.slug,
    title: module.title,
    description: module.description,
    icon: module.icon,
    color: module.color,
    sortOrder: module.sort_order,
    courseId,
  }
}

/** Lição do curso com a posição dela (1..n, módulo a módulo, na ordem do pacote). */
export interface CourseLessonEntry {
  module: BundleModule
  lesson: BundleLesson
  order: number
}

/** Lições do curso na ordem de leitura; `order` é a posição no curso (o que a API usa para navegar). */
export function listCourseLessons(course: BundleCourse): CourseLessonEntry[] {
  const entries: CourseLessonEntry[] = []
  for (const module of course.modules) {
    for (const lesson of module.lessons) entries.push({ module, lesson, order: entries.length + 1 })
  }
  return entries
}

/** O único passo de uma lição clássica (`coding`/`theory`/`quiz`); null numa lição guiada. */
export function flatStepOf(lesson: BundleLesson): BundleStep | null {
  if (lesson.lesson_type === "guided") return null
  const [onlyStep] = lesson.steps
  if (!onlyStep || lesson.steps.length !== 1 || onlyStep.kind !== FLAT_STEP_KIND_BY_LESSON_TYPE[lesson.lesson_type]) {
    throw new ContentBundleError(`lição "${lesson.slug}" (${lesson.lesson_type}) precisa de exatamente um passo ${FLAT_STEP_KIND_BY_LESSON_TYPE[lesson.lesson_type]}`)
  }
  return onlyStep
}

/** Onde a lição entra: curso, módulo (id e nome legado), posição e autor. */
export interface LessonPlacement {
  courseId: string
  moduleId: string
  moduleTitle: string
  order: number
  authorId: string | null
}

/**
 * Lição → linha de `lessons`. Numa lição clássica, os campos planos (`starter_files`,
 * `starter_code`, `checkpoints`, `test_cases`, `solution_files`, `content_markdown`) vêm do
 * único passo, como o compilador do conteúdo descreve (§6.1); numa guiada ficam vazios e
 * o conteúdo mora em `lesson_steps` ({@link toLessonStepInserts}).
 */
export function toLessonInsert(lesson: BundleLesson, placement: LessonPlacement): LessonInsert {
  const flatStep = flatStepOf(lesson)
  return {
    slug: lesson.slug,
    title: lesson.title,
    description: lesson.description,
    module: placement.moduleTitle,
    moduleId: placement.moduleId,
    courseId: placement.courseId,
    order: placement.order,
    difficulty: lesson.difficulty,
    lessonType: lesson.lesson_type,
    runtime: lesson.runtime,
    libraries: lesson.libraries,
    xpReward: lesson.xp_reward,
    timeLimit: lesson.time_limit,
    published: lesson.published,
    isProject: lesson.is_project,
    objectives: lesson.objectives,
    solutionAfterAttempts: lesson.solution_after_attempts,
    quizPassingScore: lesson.quiz_passing_score,
    contentMarkdown: flatStep?.narrative_markdown ?? "",
    starterFiles: flatStep?.starter_files ?? [],
    starterCode: flatStep?.starter_files.find((file) => file.path === DEFAULT_ENTRY_FILE)?.content ?? "",
    checkpoints: flatStep?.checkpoints ?? [],
    testCases: flatStep?.test_cases ?? [],
    solutionFiles: flatStep?.solution_files ?? [],
    createdBy: placement.authorId,
  }
}

/** Passos de uma lição guiada → linhas de `lesson_steps`; vazio numa lição clássica (o passo virou os campos planos). */
export function toLessonStepInserts(lesson: BundleLesson, lessonId: string): LessonStepInsert[] {
  if (lesson.lesson_type !== "guided") return []
  return lesson.steps.map((step) => ({
    lessonId,
    order: step.order,
    kind: step.kind,
    title: step.title,
    narrativeMarkdown: step.narrative_markdown,
    starterFiles: step.starter_files,
    solutionFiles: step.solution_files,
    checkpoints: step.checkpoints,
    testCases: step.test_cases,
    hints: step.hints,
    quizQuestions: step.quiz_questions,
    xp: step.xp,
    exerciseMode: step.exercise_mode,
    parsonsLines: step.parsons_lines,
    expectedOutput: step.expected_output,
  }))
}

/**
 * Assets do pacote → linhas de `content_assets` (tamanho e SHA-256 calculados aqui).
 *
 * @throws ContentBundleError quando o base64 de um asset não decodifica (o schema do pacote já recusa antes).
 */
export function toContentAssetInserts(assets: ContentBundle["assets"]): ContentAssetInsert[] {
  return Object.entries(assets).map(([assetPath, asset]) => {
    const bytes = decodeBase64(asset.base64)
    if (bytes === null) throw new ContentBundleError(`asset "${assetPath}" com base64 inválido`)
    return {
      path: assetPath,
      contentType: asset.content_type,
      dataBase64: asset.base64,
      sizeBytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    }
  })
}

/** Questões do quiz de uma lição clássica `quiz` → linhas de `lesson_quiz_questions`; vazio nos demais tipos. */
export function toLessonQuizQuestionInserts(lesson: BundleLesson, lessonId: string): LessonQuizQuestionInsert[] {
  const flatStep = flatStepOf(lesson)
  if (!flatStep || flatStep.kind !== "quiz") return []
  return flatStep.quiz_questions.map((question, index) => ({
    lessonId,
    prompt: question.prompt,
    options: question.options,
    correctIndex: question.correct_index,
    explanation: question.explanation,
    sortOrder: index,
  }))
}
