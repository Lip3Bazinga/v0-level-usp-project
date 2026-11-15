/**
 * Importação de um pacote de conteúdo (formato 2) com upsert por `slug`: o seed e
 * `POST /admin/content/import` usam a mesma função. Idempotente: rodar duas vezes
 * com o mesmo pacote deixa o banco igual; ids de cursos, módulos, lições e passos
 * são preservados (o progresso dos alunos aponta para eles).
 */
import { and, asc, eq, gt, inArray, like, notInArray, or } from "drizzle-orm"
import type { BundleCourse, BundleExam, BundleLesson, BundleTrack, ContentBundle } from "@levelusp/contracts"
import type { DbExecutor } from "./index"
import {
  contentAssets, courses, examQuestions, exams, lessonQuizQuestions, lessonSteps, lessons, modules, trackCourses, tracks,
} from "./schema/index"
import {
  ContentBundleError, listCourseLessons, resolvePrerequisiteId, toContentAssetInserts, toCourseInsert, toExamInsert, toExamQuestionInserts, toLessonInsert,
  toLessonQuizQuestionInserts, toLessonStepInserts, toModuleInsert, toTrackCourseInserts, toTrackInsert, type LessonPlacement,
} from "./seed-content"

/** Quem assina o conteúdo criado (`created_by` só é gravado na criação, nunca sobrescrito). */
export interface ImportContentOptions {
  authorId: string | null
}

/** Quantas linhas de cada tipo o pacote tocou (criadas ou atualizadas). */
export interface ImportContentSummary {
  tracks: number
  courses: number
  modules: number
  lessons: number
  steps: number
  assets: number
}

/** Linha devolvida pelos upserts: só o id interessa para encadear as dependências. */
interface IdRow {
  id: string
}

function idOf(rows: IdRow[], what: string): string {
  const [row] = rows
  if (!row) throw new ContentBundleError(`upsert de ${what} não devolveu a linha gravada`)
  return row.id
}

/**
 * Grava o pacote inteiro no executor recebido (passe uma transação para tudo-ou-nada).
 * Ordem: cursos → pré-requisitos → provas → módulos → lições (quiz, passos) → trilhas → assets.
 *
 * @throws ContentBundleError quando um slug referenciado (pré-requisito, curso da trilha) não existe no pacote nem no banco.
 */
export async function importContentBundle(executor: DbExecutor, bundle: ContentBundle, options: ImportContentOptions): Promise<ImportContentSummary> {
  const summary: ImportContentSummary = { tracks: 0, courses: 0, modules: 0, lessons: 0, steps: 0, assets: 0 }
  const courseIdBySlug = new Map<string, string>()
  for (const course of bundle.courses) {
    courseIdBySlug.set(course.slug, await upsertCourse(executor, course, options.authorId))
    summary.courses++
  }
  await resolveKnownSlugs(executor, courseIdBySlug, bundle.courses.flatMap((course) => (course.prerequisite === null ? [] : [course.prerequisite])))
  for (const course of bundle.courses) {
    const courseId = courseIdBySlug.get(course.slug)
    if (!courseId) throw new ContentBundleError(`curso "${course.slug}" sem id depois do upsert`)
    await executor.update(courses).set({ prerequisiteCourseId: resolvePrerequisiteId(course, courseIdBySlug) }).where(eq(courses.id, courseId))
    if (course.exam) await upsertExam(executor, course.exam, courseId)
    await importCourseContent(executor, course, courseId, options.authorId, summary)
  }
  await resolveKnownSlugs(executor, courseIdBySlug, bundle.tracks.flatMap((track) => track.courses))
  for (const track of bundle.tracks) {
    await upsertTrack(executor, track, courseIdBySlug)
    summary.tracks++
  }
  summary.assets = await replaceCourseAssets(executor, bundle)
  return summary
}

/** Escapa `%`, `_` e `\\` para usar um texto como prefixo literal num LIKE. */
function likePrefix(prefix: string): string {
  return `${prefix.replace(/[\\%_]/g, (character) => `\\${character}`)}%`
}

/**
 * Assets: upsert pelo caminho; os que pertencem a um curso do pacote (`<slug do curso>/…`) e
 * não vieram nele são apagados, para a reimportação refletir a pasta `assets/` atual.
 */
async function replaceCourseAssets(executor: DbExecutor, bundle: ContentBundle): Promise<number> {
  const rows = toContentAssetInserts(bundle.assets)
  for (const row of rows) {
    const { path: _path, ...updatable } = row
    await executor.insert(contentAssets).values(row).onConflictDoUpdate({ target: contentAssets.path, set: updatable })
  }
  const ownedByBundle = or(...bundle.courses.map((course) => like(contentAssets.path, likePrefix(`${course.slug}/`))))
  if (ownedByBundle) {
    const kept = rows.map((row) => row.path)
    await executor.delete(contentAssets).where(kept.length > 0 ? and(ownedByBundle, notInArray(contentAssets.path, kept)) : ownedByBundle)
  }
  return rows.length
}

/** Completa o mapa slug → id com cursos que já existem no banco (fora do pacote). */
async function resolveKnownSlugs(executor: DbExecutor, courseIdBySlug: Map<string, string>, slugs: string[]): Promise<void> {
  const missing = [...new Set(slugs)].filter((slug) => !courseIdBySlug.has(slug))
  if (missing.length === 0) return
  const found = await executor.select({ id: courses.id, slug: courses.slug }).from(courses).where(inArray(courses.slug, missing))
  for (const course of found) {
    if (course.slug !== null) courseIdBySlug.set(course.slug, course.id)
  }
}

async function upsertCourse(executor: DbExecutor, course: BundleCourse, authorId: string | null): Promise<string> {
  const row = toCourseInsert(course, authorId)
  const { createdBy: _author, slug: _slug, ...updatable } = row
  const rows = await executor
    .insert(courses)
    .values(row)
    .onConflictDoUpdate({ target: courses.slug, set: updatable })
    .returning({ id: courses.id })
  return idOf(rows, `curso "${course.slug}"`)
}

/**
 * Prova: uma por curso. As questões são atualizadas NA POSIÇÃO (ids preservados, porque
 * `exam_attempts.question_ids` aponta para elas); as que sobram ficam inativas.
 */
async function upsertExam(executor: DbExecutor, exam: BundleExam, courseId: string): Promise<void> {
  const row = toExamInsert(exam, courseId)
  const { courseId: _course, ...updatable } = row
  const examId = idOf(
    await executor.insert(exams).values(row).onConflictDoUpdate({ target: exams.courseId, set: updatable }).returning({ id: exams.id }),
    "prova",
  )
  const existing = await executor
    .select({ id: examQuestions.id })
    .from(examQuestions)
    .where(eq(examQuestions.examId, examId))
    .orderBy(asc(examQuestions.sortOrder), asc(examQuestions.createdAt))
  const questions = toExamQuestionInserts(exam, examId)
  for (const [index, question] of questions.entries()) {
    const current = existing[index]
    if (current) await executor.update(examQuestions).set(question).where(eq(examQuestions.id, current.id))
    else await executor.insert(examQuestions).values(question)
  }
  const leftovers = existing.slice(questions.length).map((question) => question.id)
  if (leftovers.length > 0) await executor.update(examQuestions).set({ active: false }).where(inArray(examQuestions.id, leftovers))
}

async function importCourseContent(executor: DbExecutor, course: BundleCourse, courseId: string, authorId: string | null, summary: ImportContentSummary): Promise<void> {
  const moduleIdBySlug = new Map<string, string>()
  for (const module of course.modules) {
    const row = toModuleInsert(module, courseId)
    const rows = await executor
      .insert(modules)
      .values(row)
      .onConflictDoUpdate({ target: [modules.courseId, modules.slug], set: row })
      .returning({ id: modules.id })
    moduleIdBySlug.set(module.slug, idOf(rows, `módulo "${module.slug}"`))
    summary.modules++
  }
  for (const { module, lesson, order } of listCourseLessons(course)) {
    const moduleId = moduleIdBySlug.get(module.slug)
    if (!moduleId) throw new ContentBundleError(`módulo "${module.slug}" sem id depois do upsert`)
    const lessonId = await upsertLesson(executor, lesson, { courseId, moduleId, moduleTitle: module.title, order, authorId })
    await replaceLessonQuiz(executor, lesson, lessonId)
    summary.steps += await replaceLessonSteps(executor, lesson, lessonId)
    summary.lessons++
  }
}

async function upsertLesson(executor: DbExecutor, lesson: BundleLesson, placement: LessonPlacement): Promise<string> {
  const row = toLessonInsert(lesson, placement)
  const { createdBy: _author, slug: _slug, ...updatable } = row
  const rows = await executor
    .insert(lessons)
    .values(row)
    .onConflictDoUpdate({ target: lessons.slug, set: updatable })
    .returning({ id: lessons.id })
  return idOf(rows, `lição "${lesson.slug}"`)
}

/** Quiz de lição clássica: substituído por inteiro (nada no banco guarda o id da questão de quiz). */
async function replaceLessonQuiz(executor: DbExecutor, lesson: BundleLesson, lessonId: string): Promise<void> {
  await executor.delete(lessonQuizQuestions).where(eq(lessonQuizQuestions.lessonId, lessonId))
  const questions = toLessonQuizQuestionInserts(lesson, lessonId)
  if (questions.length > 0) await executor.insert(lessonQuizQuestions).values(questions)
}

/**
 * Passos: atualizados pela chave (lição, ordem) para manter o id (o progresso e as
 * submissões apontam para ele); os que sobram são apagados. Lição clássica fica sem passos.
 */
async function replaceLessonSteps(executor: DbExecutor, lesson: BundleLesson, lessonId: string): Promise<number> {
  const steps = toLessonStepInserts(lesson, lessonId)
  for (const step of steps) {
    await executor.insert(lessonSteps).values(step).onConflictDoUpdate({ target: [lessonSteps.lessonId, lessonSteps.order], set: step })
  }
  await executor.delete(lessonSteps).where(and(eq(lessonSteps.lessonId, lessonId), gt(lessonSteps.order, steps.length)))
  return steps.length
}

async function upsertTrack(executor: DbExecutor, track: BundleTrack, courseIdBySlug: ReadonlyMap<string, string>): Promise<void> {
  const row = toTrackInsert(track)
  const { slug: _slug, ...updatable } = row
  const trackId = idOf(
    await executor.insert(tracks).values(row).onConflictDoUpdate({ target: tracks.slug, set: updatable }).returning({ id: tracks.id }),
    `trilha "${track.slug}"`,
  )
  const links = toTrackCourseInserts(track, trackId, courseIdBySlug)
  await executor.delete(trackCourses).where(eq(trackCourses.trackId, trackId))
  if (links.length > 0) await executor.insert(trackCourses).values(links)
}
