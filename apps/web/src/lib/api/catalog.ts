import type {
  AttachLessonInput, Course, CourseInput, CourseUpdateInput, Lesson, LessonInput, LessonMetrics, LessonSummary,
  LessonUpdateInput, LessonWithTests, Module, ModuleInput, ModuleUpdateInput, PublishInput, ReorderLessonsInput,
} from "@levelusp/contracts"
import { api, HTTP_STATUS, nullOnStatus } from "./client"

/** Módulos temáticos pela ordem de exibição. */
export const fetchModules = (): Promise<Module[]> => api.get<Module[]>("/modules")
/** Cria um módulo (admin). */
export const createModule = (input: ModuleInput): Promise<Module> => api.post<Module>("/modules", input)
/** Atualiza os campos enviados do módulo (admin). */
export const updateModule = (moduleId: string, input: ModuleUpdateInput): Promise<Module> => api.patch<Module>(`/modules/${moduleId}`, input)
/** Apaga o módulo (admin); as lições continuam, sem módulo. */
export const deleteModule = (moduleId: string): Promise<void> => api.delete(`/modules/${moduleId}`)

/** Cursos publicados; com sessão, cada um diz se o usuário está matriculado. */
export const fetchPublishedCourses = (): Promise<Course[]> => api.get<Course[]>("/courses")
/** Curso pelo id; `null` quando não existe ou o usuário não pode vê-lo. */
export const fetchCourse = (courseId: string): Promise<Course | null> => nullOnStatus(api.get<Course>(`/courses/${courseId}`), HTTP_STATUS.NOT_FOUND)
/** Lições do curso: publicadas para o aluno, todas para o dono e admins. */
export const fetchCourseLessons = (courseId: string): Promise<Lesson[]> => api.get<Lesson[]>(`/courses/${courseId}/lessons`)

/** Curso e suas lições, carregados juntos. */
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

/** Cursos do professor (admin: todos), inclusive rascunhos. */
export const fetchTeacherCourses = (): Promise<Course[]> => api.get<Course[]>("/teacher/courses")
/** Ids dos cursos em que o usuário está matriculado. */
export const fetchMyEnrollments = (): Promise<string[]> => api.get<string[]>("/me/enrollments")
/** Cria o curso como rascunho. */
export const createCourse = (input: CourseInput): Promise<Course> => api.post<Course>("/courses", input)
/** Atualiza os campos enviados do curso. */
export const updateCourse = (courseId: string, input: CourseUpdateInput): Promise<Course> => api.patch<Course>(`/courses/${courseId}`, input)
/** Apaga o curso; as lições ficam avulsas. */
export const deleteCourse = (courseId: string): Promise<void> => api.delete(`/courses/${courseId}`)
/** Publica ou despublica o curso. */
export const setCoursePublished = (courseId: string, published: boolean): Promise<Course> =>
  api.patch<Course, PublishInput>(`/courses/${courseId}/publish`, { published })
/** Matricula o usuário (idempotente). */
export const enrollInCourse = (courseId: string): Promise<void> => api.post<void>(`/courses/${courseId}/enrollment`)
/** Cancela a matrícula (o progresso nas lições continua). */
export const unenrollFromCourse = (courseId: string): Promise<void> => api.delete(`/courses/${courseId}/enrollment`)
/** Grava a nova ordem das lições; a lista precisa ter todas as lições do curso, sem repetir. */
export const reorderCourseLessons = (courseId: string, lessonIds: string[]): Promise<void> =>
  api.put<void, ReorderLessonsInput>(`/courses/${courseId}/lessons/order`, { lesson_ids: lessonIds })
/** Anexa uma lição avulsa do professor ao curso (sem `order`, vai para o fim). */
export const addLessonToCourse = (courseId: string, lessonId: string, order?: number): Promise<void> =>
  api.post<void, AttachLessonInput>(`/courses/${courseId}/lessons`, { lesson_id: lessonId, order })
/** Tira a lição do curso; ela continua existindo, avulsa. */
export const removeLessonFromCourse = (courseId: string, lessonId: string): Promise<void> =>
  api.delete(`/courses/${courseId}/lessons/${lessonId}`)

/** Resumo das lições publicadas (trilhas e listas). */
export const fetchPublishedLessonSummaries = (): Promise<LessonSummary[]> => api.get<LessonSummary[]>("/lessons/summaries")
/** Lições publicadas, sem gabarito. */
export const fetchPublishedLessons = (): Promise<Lesson[]> => api.get<Lesson[]>("/lessons")
/** Lição pelo id; `null` quando não existe ou não está publicada para o aluno. */
export const fetchLesson = (lessonId: string): Promise<Lesson | null> => nullOnStatus(api.get<Lesson>(`/lessons/${lessonId}`), HTTP_STATUS.NOT_FOUND)
/** Lição com gabarito: só o professor dono ou um admin recebem. */
export const fetchLessonForAuthoring = (lessonId: string): Promise<LessonWithTests | null> =>
  nullOnStatus(api.get<LessonWithTests>(`/lessons/${lessonId}/authoring`), HTTP_STATUS.NOT_FOUND)
/** Lições do professor (admin: todas), sem gabarito. */
export const fetchTeacherLessons = (): Promise<Lesson[]> => api.get<Lesson[]>("/teacher/lessons")
/** Métricas das lições do professor. */
export const fetchTeacherMetrics = (): Promise<LessonMetrics[]> => api.get<LessonMetrics[]>("/teacher/metrics")
/** Cria a lição como rascunho; devolve com o gabarito. */
export const createLesson = (input: LessonInput): Promise<LessonWithTests> => api.post<LessonWithTests>("/lessons", input)
/** Atualiza os campos enviados; lição publicada não pode ficar sem gabarito ou sem questões (422). */
export const updateLesson = (lessonId: string, input: LessonUpdateInput): Promise<LessonWithTests> =>
  api.patch<LessonWithTests>(`/lessons/${lessonId}`, input)
/** Apaga a lição. */
export const deleteLesson = (lessonId: string): Promise<void> => api.delete(`/lessons/${lessonId}`)
/** Publica ou despublica a lição (422 se o aluno não conseguiria concluí-la). */
export const setLessonPublished = (lessonId: string, published: boolean): Promise<Lesson> =>
  api.patch<Lesson, PublishInput>(`/lessons/${lessonId}/publish`, { published })
