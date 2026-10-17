import type { Course, CourseInput, CourseUpdateInput, Difficulty } from "@levelusp/contracts"
import { diffChangedFields } from "@/lib/utils"

const MIN_TITLE_LENGTH = 3
const MAX_DESCRIPTION_LENGTH = 500
const MAX_ESTIMATED_HOURS = 1000
export const MAX_TAGS = 20
export const MAX_TAG_LENGTH = 40

export interface CourseFormState {
  title: string
  description: string
  long_description: string
  level: Difficulty
  tags: string[]
  estimated_hours: number
  final_project_title: string
  final_project_description: string
  final_project_starter_code: string
  cover_image_url: string | null
}

export const EMPTY_COURSE_FORM: CourseFormState = {
  title: "",
  description: "",
  long_description: "",
  level: "iniciante",
  tags: [],
  estimated_hours: 0,
  final_project_title: "",
  final_project_description: "",
  final_project_starter_code: "",
  cover_image_url: null,
}

export function formFromCourse(course: Course): CourseFormState {
  return {
    title: course.title,
    description: course.description ?? "",
    long_description: course.long_description ?? "",
    level: course.level,
    tags: course.tags ?? [],
    estimated_hours: course.estimated_hours ?? 0,
    final_project_title: course.final_project_title ?? "",
    final_project_description: course.final_project_description ?? "",
    final_project_starter_code: course.final_project_starter_code ?? "",
    cover_image_url: course.cover_image_url ?? null,
  }
}

/** Texto vazio (só espaços) vira `null`, que a API grava como "sem valor". */
function textOrNull(text: string): string | null {
  return text.trim() ? text : null
}

export function toCourseInput(form: CourseFormState): CourseInput {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    long_description: form.long_description.trim(),
    cover_image_url: form.cover_image_url,
    level: form.level,
    tags: form.tags,
    estimated_hours: Math.max(0, Math.min(MAX_ESTIMATED_HOURS, Math.round(form.estimated_hours || 0))),
    final_project_title: textOrNull(form.final_project_title.trim()),
    final_project_description: textOrNull(form.final_project_description),
    final_project_starter_code: textOrNull(form.final_project_starter_code),
  }
}

/** Só os campos alterados (PATCH). */
export function diffCourseInput(before: CourseInput, after: CourseInput): CourseUpdateInput {
  return diffChangedFields(before, after)
}

export function validateCourseForm(form: CourseFormState): string | null {
  if (form.title.trim().length < MIN_TITLE_LENGTH) return "O título do curso precisa ter pelo menos 3 caracteres."
  if (form.description.trim().length > MAX_DESCRIPTION_LENGTH) return "A descrição curta pode ter no máximo 500 caracteres."
  return null
}

/** Lista de tags com `rawTag` acrescentada, se for nova e couber no limite; senão, a lista intacta. */
export function addTag(tags: string[], rawTag: string): string[] {
  const tag = rawTag.trim()
  if (!tag || tags.includes(tag) || tags.length >= MAX_TAGS) return tags
  return [...tags, tag.slice(0, MAX_TAG_LENGTH)]
}
