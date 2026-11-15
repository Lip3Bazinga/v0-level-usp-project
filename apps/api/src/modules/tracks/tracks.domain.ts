import type { TrackCourseStatus } from "@levelusp/contracts"

/** O que o aluno já fez num curso da trilha (tudo false sem sessão). */
export interface CourseStanding {
  enrolled: boolean
  /** Tem alguma lição do curso iniciada ou concluída. */
  started: boolean
  /** 100 % das lições publicadas concluídas (`course_completions`). */
  completed: boolean
  certified: boolean
  /** O curso pré-requisito já tem certificado (true quando não há pré-requisito). */
  prerequisiteCertified: boolean
}

/**
 * Situação do aluno num curso da trilha. O que ele já conquistou vale mais que a trava:
 * `certified` > `completed` > `in_progress`; só um curso sem atividade fica `locked`
 * quando o pré-requisito ainda não tem certificado.
 */
export function trackCourseStatus(standing: CourseStanding): TrackCourseStatus {
  if (standing.certified) return "certified"
  if (standing.completed) return "completed"
  if (standing.enrolled || standing.started) return standing.prerequisiteCertified ? "in_progress" : "locked"
  return standing.prerequisiteCertified ? "available" : "locked"
}

/** A trilha só dá certificado com TODOS os cursos certificados (trilha vazia nunca certifica). */
export function isTrackCertifiable(courseIds: readonly string[], certifiedCourseIds: ReadonlySet<string>): boolean {
  return courseIds.length > 0 && courseIds.every((id) => certifiedCourseIds.has(id))
}
