import type {
  Course, CourseInput, CourseUpdateInput, Lesson, LessonInput, LessonMetrics, LessonSummary, LessonUpdateInput,
  LessonWithTests, Module, ModuleInput,
} from "@levelusp/contracts"
import { api, getOrNull } from "./client"

// ── Módulos ──────────────────────────────────────────────────────────────────
export const fetchModules = () => api.get<Module[]>("/modules")
export const fetchModuleLessonCounts = () => api.get<Record<string, number>>("/modules/lesson-counts")
export const createModule = (data: ModuleInput) => api.post<Module>("/modules", data)
export const updateModule = (id: string, data: Partial<ModuleInput>) => api.patch<Module>(`/modules/${id}`, data)
export const deleteModule = (id: string) => api.delete<void>(`/modules/${id}`)

// ── Cursos ───────────────────────────────────────────────────────────────────
export const fetchPublishedCourses = () => api.get<Course[]>("/courses")
export const fetchCourseByIdRaw = (courseId: string) => getOrNull<Course>(`/courses/${courseId}`)

/** Curso + lições + matrícula (o usuário vem da sessão). */
export async function fetchCourseById(courseId: string): Promise<{ course: Course; lessons: Lesson[]; enrolled: boolean } | null> {
  const course = await getOrNull<Course>(`/courses/${courseId}`)
  if (!course) return null
  const lessons = await api.get<Lesson[]>(`/courses/${courseId}/lessons`)
  return { course, lessons, enrolled: Boolean(course.enrolled) }
}

export const fetchTeacherCourses = () => api.get<Course[]>("/teacher/courses")
export const fetchUserEnrollments = () => api.get<string[]>("/me/enrollments")
export const createCourse = (data: CourseInput) => api.post<Course>("/courses", data)
export const updateCourse = (courseId: string, data: CourseUpdateInput) => api.patch<Course>(`/courses/${courseId}`, data)
export const deleteCourse = (courseId: string) => api.delete<void>(`/courses/${courseId}`)
export const toggleCoursePublished = (courseId: string, published: boolean) => api.patch<Course>(`/courses/${courseId}/publish`, { published })
export const enrollInCourse = (courseId: string) => api.post<void>(`/courses/${courseId}/enrollment`)
export const unenrollFromCourse = (courseId: string) => api.delete<void>(`/courses/${courseId}/enrollment`)
export const fetchCourseLessons = (courseId: string) => api.get<Lesson[]>(`/courses/${courseId}/lessons`)
export const reorderLessons = (courseId: string, lessonIds: string[]) => api.put<void>(`/courses/${courseId}/lessons/order`, { lesson_ids: lessonIds })
export const addLessonToCourse = (lessonId: string, courseId: string, order?: number) => api.post<void>(`/courses/${courseId}/lessons`, { lesson_id: lessonId, order })
export const removeLessonFromCourse = (lessonId: string, courseId: string) => api.delete<void>(`/courses/${courseId}/lessons/${lessonId}`)

// ── Lições ───────────────────────────────────────────────────────────────────
export const fetchPublishedLessonSummaries = () => api.get<LessonSummary[]>("/lessons/summaries")
export const fetchPublishedLessons = () => api.get<Lesson[]>("/lessons")
export const fetchLessonById = (id: string) => getOrNull<Lesson>(`/lessons/${id}`)
/** Lição com gabarito — só o professor dono ou admin. */
export const fetchLessonForAuthoring = (id: string) => getOrNull<LessonWithTests>(`/lessons/${id}/authoring`)
export const fetchTeacherLessons = () => api.get<Lesson[]>("/teacher/lessons")
export const fetchTeacherMetrics = () => api.get<LessonMetrics[]>("/teacher/metrics")
export const createLesson = (data: LessonInput) => api.post<LessonWithTests>("/lessons", data)
export const updateLesson = (id: string, data: LessonUpdateInput) => api.patch<LessonWithTests>(`/lessons/${id}`, data)
export const deleteLesson = (id: string) => api.delete<void>(`/lessons/${id}`)
export const toggleLessonPublished = (id: string, published: boolean) => api.patch<Lesson>(`/lessons/${id}/publish`, { published })
