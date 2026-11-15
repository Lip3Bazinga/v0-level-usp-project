import type { TrackCourse, TrackCourseStatus } from "@levelusp/contracts"

/** Rótulo pt-BR da situação do aluno num curso da trilha. */
export const TRACK_COURSE_STATUS_LABELS: Readonly<Record<TrackCourseStatus, string>> = {
  locked: "Bloqueado",
  available: "Disponível",
  in_progress: "Em andamento",
  completed: "Lições concluídas",
  certified: "Certificado",
}

/** Resumo do andamento do aluno numa trilha. */
export interface TrackSummary {
  total: number
  certified: number
  /** 0–100: cursos certificados sobre o total. */
  percent: number
  /** Curso em que o aluno deve continuar: o primeiro não certificado que não está bloqueado. */
  nextCourse: TrackCourse | null
  /** Todos os cursos certificados: o certificado da trilha pode ser emitido. */
  isCertifiable: boolean
}

/** Resume o andamento na trilha a partir da situação de cada curso (trilha vazia nunca é certificável). */
export function summarizeTrack(courses: readonly TrackCourse[]): TrackSummary {
  const certified = courses.filter((course) => course.student_status === "certified").length
  const nextCourse = courses.find((course) => course.student_status !== "certified" && course.student_status !== "locked") ?? null
  return {
    total: courses.length,
    certified,
    percent: courses.length ? Math.round((certified / courses.length) * 100) : 0,
    nextCourse,
    isCertifiable: courses.length > 0 && certified === courses.length,
  }
}

/** Título do curso que trava `course` (o pré-requisito), se estiver na mesma trilha. */
export function prerequisiteTitle(course: TrackCourse, courses: readonly TrackCourse[]): string | null {
  if (course.prerequisite_course_id === null) return null
  return courses.find((candidate) => candidate.id === course.prerequisite_course_id)?.title ?? null
}
