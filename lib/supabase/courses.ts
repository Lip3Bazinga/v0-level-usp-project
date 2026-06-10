import { createClient } from "@/lib/supabase/client"
import { PUBLIC_LESSON_FIELDS } from "@/lib/supabase/lessons"
import type { Course, Lesson } from "@/lib/supabase/types"

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type CourseFormData = {
  title: string
  description: string
  long_description: string
  level: "iniciante" | "intermediario" | "avancado"
  tags: string[]
  estimated_hours: number
  published: boolean
  final_project_title: string
  final_project_description: string
  final_project_starter_code: string
  final_project_tests: string
  cover_image_url?: string | null
}

// ── Leitura pública ───────────────────────────────────────────────────────────

/** Retorna todos os cursos publicados com contagem de lições. */
export async function fetchPublishedCourses(): Promise<Course[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("courses" as never)
    .select("*, lessons(count)")
    .eq("published", true)
    .order("title")
  if (error) throw error

  return (data ?? []).map((row: any) => ({
    ...row,
    lesson_count: row.lessons?.[0]?.count ?? 0,
  })) as Course[]
}

/** Retorna um curso pelo id (sem filtro de published — para o editor do professor). */
export async function fetchCourseByIdRaw(courseId: string): Promise<Course | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("courses" as never)
    .select("*, lessons(count)")
    .eq("id", courseId)
    .single()
  if (error || !data) return null
  const row = data as any
  return { ...row, lesson_count: row.lessons?.[0]?.count ?? 0 } as Course
}

/** Retorna um curso publicado pelo id, com lições e dados de matrícula do usuário. */
export async function fetchCourseById(
  courseId: string,
  userId?: string
): Promise<{ course: Course; lessons: Lesson[]; enrolled: boolean } | null> {
  const supabase = createClient()

  const { data: course, error: courseErr } = await supabase
    .from("courses" as never)
    .select("*, lessons(count)")
    .eq("id", courseId)
    .eq("published", true)
    .single()

  if (courseErr || !course) return null

  const { data: lessons } = await supabase
    .from("lessons")
    .select(PUBLIC_LESSON_FIELDS)
    .eq("course_id", courseId)
    .eq("published", true)
    .order("order")

  let enrolled = false
  if (userId) {
    const { data: enrollment } = await supabase
      .from("enrollments" as never)
      .select("id")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .maybeSingle()
    enrolled = !!enrollment
  }

  const courseAny = course as any
  return {
    course: {
      ...courseAny,
      lesson_count: courseAny.lessons?.[0]?.count ?? 0,
      enrolled,
    } as Course,
    lessons: (lessons ?? []) as Lesson[],
    enrolled,
  }
}

/** Retorna cursos criados pelo professor (publicados ou não). */
export async function fetchTeacherCourses(userId: string): Promise<Course[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("courses" as never)
    .select("*, lessons(count)")
    .eq("created_by", userId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []).map((row: any) => ({
    ...row,
    lesson_count: row.lessons?.[0]?.count ?? 0,
  })) as Course[]
}

/** IDs dos cursos em que o usuário está matriculado. */
export async function fetchUserEnrollments(userId: string): Promise<string[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from("enrollments" as never)
    .select("course_id")
    .eq("user_id", userId)
  return (data ?? []).map((e: any) => e.course_id)
}

// ── CRUD de cursos ────────────────────────────────────────────────────────────

/** Cria um novo curso e retorna o registro. */
export async function createCourse(
  data: CourseFormData,
  userId: string
): Promise<Course> {
  const supabase = createClient()
  const { data: created, error } = await supabase
    .from("courses" as never)
    .insert({ ...data, created_by: userId } as never)
    .select()
    .single()
  if (error) throw error
  return created as Course
}

/** Atualiza um curso existente. */
export async function updateCourse(
  courseId: string,
  data: Partial<CourseFormData>
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("courses" as never)
    .update({ ...data, updated_at: new Date().toISOString() } as never)
    .eq("id", courseId)
  if (error) throw error
}

/** Faz upload da imagem de capa e retorna a URL pública. */
export async function uploadCourseCover(
  courseId: string,
  file: File
): Promise<string> {
  const supabase = createClient()
  const ext = file.name.split(".").pop()
  const path = `${courseId}/cover.${ext}`

  const { error } = await supabase.storage
    .from("course-covers")
    .upload(path, file, { upsert: true })
  if (error) throw error

  const { data } = supabase.storage.from("course-covers").getPublicUrl(path)
  return data.publicUrl
}

/** Exclui um curso permanentemente. */
export async function deleteCourse(courseId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("courses" as never)
    .delete()
    .eq("id", courseId)
  if (error) throw error
}

/** Alterna o estado publicado/rascunho. */
export async function toggleCoursePublished(
  courseId: string,
  published: boolean
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("courses" as never)
    .update({ published } as never)
    .eq("id", courseId)
  if (error) throw error
}

// ── Matrícula ─────────────────────────────────────────────────────────────────

export async function enrollInCourse(userId: string, courseId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("enrollments" as never)
    .insert({ user_id: userId, course_id: courseId } as never)
  if (error && !(error as any).message?.includes("duplicate")) throw error
}

export async function unenrollFromCourse(userId: string, courseId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("enrollments" as never)
    .delete()
    .eq("user_id", userId)
    .eq("course_id", courseId)
  if (error) throw error
}

// ── Lições de um curso (para o editor) ───────────────────────────────────────

/** Todas as lições de um curso (publicadas ou não), ordenadas por order. */
export async function fetchCourseLessons(courseId: string): Promise<Lesson[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("lessons")
    .select(PUBLIC_LESSON_FIELDS)
    .eq("course_id", courseId)
    .order("order")
  if (error) throw error
  return (data ?? []) as Lesson[]
}

/** Reordena as lições de um curso via RPC. */
export async function reorderLessons(courseId: string, lessonIds: string[]): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.rpc("reorder_lessons" as never, {
    p_course_id: courseId,
    p_lesson_ids: lessonIds,
  } as never)
  if (error) throw error
}

/** Desvincula uma lição do curso (set course_id = null). */
export async function removeLessonFromCourse(lessonId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("lessons")
    .update({ course_id: null } as never)
    .eq("id", lessonId)
  if (error) throw error
}

/** Vincula uma lição avulsa a um curso. */
export async function addLessonToCourse(lessonId: string, courseId: string, order: number): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("lessons")
    .update({ course_id: courseId, order } as never)
    .eq("id", lessonId)
  if (error) throw error
}
