import type {
  AttachLessonInput, Course, CourseInput, CourseUpdateInput, Lesson, LessonInput, LessonMetrics, LessonSummary,
  LessonUpdateInput, LessonWithTests, Module, ModuleInput, ModuleUpdateInput, PublishInput, ReorderLessonsInput,
} from "@levelusp/contracts"
import { api, HTTP_STATUS, nullOnStatus } from "./client"

export const fetchModules = () => api.get<Module[]>("/modules")
export const createModule = (input: ModuleInput) => api.post<Module>("/modules", input)
export const updateModule = (moduleId: string, input: ModuleUpdateInput) => api.patch<Module>(`/modules/${moduleId}`, input)
export const deleteModule = (moduleId: string) => api.delete(`/modules/${moduleId}`)

export const fetchPublishedCourses = () => api.get<Course[]>("/courses")
/** Curso pelo id; `null` quando não existe ou o usuário não pode vê-lo. */
export const fetchCourse = (courseId: string) => nullOnStatus(api.get<Course>(`/courses/${courseId}`), HTTP_STATUS.NOT_FOUND)
export const fetchCourseLessons = (courseId: string) => api.get<Lesson[]>(`/courses/${courseId}/lessons`)

export interface CourseWithLessons {
  course: Course
  lessons: Lesson[]
  enrolled: boolean
}

/** Curso, suas lições e se o usuário da sessão está matriculado. */
export async function fetchCourseWithLessons(courseId: string): Promise<CourseWithLessons | null> {
  const course = await fetchCourse(courseId)
  if (!course) return null
  const lessons = await fetchCourseLessons(courseId)
  return { course, lessons, enrolled: Boolean(course.enrolled) }
}

export const fetchTeacherCourses = () => api.get<Course[]>("/teacher/courses")
export const fetchMyEnrollments = () => api.get<string[]>("/me/enrollments")
export const createCourse = (input: CourseInput) => api.post<Course>("/courses", input)
export const updateCourse = (courseId: string, input: CourseUpdateInput) => api.patch<Course>(`/courses/${courseId}`, input)
export const deleteCourse = (courseId: string) => api.delete(`/courses/${courseId}`)
export const setCoursePublished = (courseId: string, published: boolean) =>
  api.patch<Course, PublishInput>(`/courses/${courseId}/publish`, { published })
export const enrollInCourse = (courseId: string) => api.post<void>(`/courses/${courseId}/enrollment`)
export const unenrollFromCourse = (courseId: string) => api.delete(`/courses/${courseId}/enrollment`)
export const reorderCourseLessons = (courseId: string, lessonIds: string[]) =>
  api.put<void, ReorderLessonsInput>(`/courses/${courseId}/lessons/order`, { lesson_ids: lessonIds })
export const addLessonToCourse = (courseId: string, lessonId: string, order?: number) =>
  api.post<void, AttachLessonInput>(`/courses/${courseId}/lessons`, { lesson_id: lessonId, order })
export const removeLessonFromCourse = (courseId: string, lessonId: string) =>
  api.delete(`/courses/${courseId}/lessons/${lessonId}`)

export const fetchPublishedLessonSummaries = () => api.get<LessonSummary[]>("/lessons/summaries")
export const fetchPublishedLessons = () => api.get<Lesson[]>("/lessons")
/** Lição pelo id; `null` quando não existe ou não está publicada para o aluno. */
export const fetchLesson = (lessonId: string) => nullOnStatus(api.get<Lesson>(`/lessons/${lessonId}`), HTTP_STATUS.NOT_FOUND)
/** Lição com gabarito: só o professor dono ou um admin recebem. */
export const fetchLessonForAuthoring = (lessonId: string) =>
  nullOnStatus(api.get<LessonWithTests>(`/lessons/${lessonId}/authoring`), HTTP_STATUS.NOT_FOUND)
export const fetchTeacherLessons = () => api.get<Lesson[]>("/teacher/lessons")
export const fetchTeacherMetrics = () => api.get<LessonMetrics[]>("/teacher/metrics")
export const createLesson = (input: LessonInput) => api.post<LessonWithTests>("/lessons", input)
export const updateLesson = (lessonId: string, input: LessonUpdateInput) =>
  api.patch<LessonWithTests>(`/lessons/${lessonId}`, input)
export const deleteLesson = (lessonId: string) => api.delete(`/lessons/${lessonId}`)
export const setLessonPublished = (lessonId: string, published: boolean) =>
  api.patch<Lesson, PublishInput>(`/lessons/${lessonId}/publish`, { published })
