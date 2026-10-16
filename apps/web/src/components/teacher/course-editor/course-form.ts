import type { Course, CourseInput, CourseUpdateInput, Difficulty } from "@levelusp/contracts"

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

export function formFromCourse(c: Course): CourseFormState {
  return {
    title: c.title,
    description: c.description ?? "",
    long_description: c.long_description ?? "",
    level: c.level,
    tags: c.tags ?? [],
    estimated_hours: c.estimated_hours ?? 0,
    final_project_title: c.final_project_title ?? "",
    final_project_description: c.final_project_description ?? "",
    final_project_starter_code: c.final_project_starter_code ?? "",
    cover_image_url: c.cover_image_url ?? null,
  }
}

const orNull = (s: string) => (s.trim() ? s : null)

export function toCourseInput(f: CourseFormState): CourseInput {
  return {
    title: f.title.trim(),
    description: f.description.trim(),
    long_description: f.long_description.trim(),
    cover_image_url: f.cover_image_url,
    level: f.level,
    tags: f.tags,
    estimated_hours: Math.max(0, Math.min(1000, Math.round(f.estimated_hours || 0))),
    final_project_title: orNull(f.final_project_title.trim()),
    final_project_description: orNull(f.final_project_description),
    final_project_starter_code: orNull(f.final_project_starter_code),
  }
}

/** Só os campos alterados (PATCH). */
export function diffCourseInput(before: CourseInput, after: CourseInput): CourseUpdateInput {
  const patch: Record<string, unknown> = {}
  for (const key of Object.keys(after) as (keyof CourseInput)[]) {
    if (JSON.stringify(before[key] ?? null) !== JSON.stringify(after[key] ?? null)) patch[key] = after[key]
  }
  return patch as CourseUpdateInput
}

export function validateCourseForm(f: CourseFormState): string | null {
  if (f.title.trim().length < 3) return "O título do curso precisa ter pelo menos 3 caracteres."
  if (f.description.trim().length > 500) return "A descrição curta pode ter no máximo 500 caracteres."
  return null
}
