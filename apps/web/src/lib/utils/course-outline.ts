import type { Lesson } from "@levelusp/contracts"
import type { TrailStatus } from "./trail"

/** Lição com a situação do aluno e a posição dela na ordem do curso (1 = primeira). */
export interface OutlineLesson {
  lesson: Lesson
  status: TrailStatus
  position: number
}

/** Módulo do curso com as lições na ordem. */
export interface OutlineModule {
  /** Chave estável para a lista (id do módulo, ou o título quando a lição não tem módulo). */
  key: string
  title: string
  lessons: OutlineLesson[]
  completedCount: number
}

/** Página do curso organizada: módulos com as lições comuns e, à parte, os projetos do nível. */
export interface CourseOutline {
  modules: OutlineModule[]
  projects: OutlineLesson[]
  /** Lições comuns (fora os projetos) que o aluno ainda não concluiu: é o que trava o projeto. */
  pendingBeforeProject: number
}

const UNTITLED_MODULE = "Lições"

/**
 * Agrupa as lições do curso por módulo, mantendo a ordem do curso, e separa as lições de
 * projeto (`is_project`), que têm seção própria e só abrem com as demais concluídas.
 * `statuses[i]` é a situação da lição `lessons[i]`.
 */
export function buildCourseOutline(lessons: readonly Lesson[], statuses: readonly TrailStatus[]): CourseOutline {
  const modules: OutlineModule[] = []
  const projects: OutlineLesson[] = []
  let pendingBeforeProject = 0
  lessons.forEach((lesson, index) => {
    const entry: OutlineLesson = { lesson, status: statuses[index] ?? "locked", position: index + 1 }
    if (lesson.is_project) {
      projects.push(entry)
      return
    }
    if (entry.status !== "completed") pendingBeforeProject++
    const key = lesson.module_id ?? lesson.module
    let group = modules.find((candidate) => candidate.key === key)
    if (!group) {
      group = { key, title: lesson.module.trim() || UNTITLED_MODULE, lessons: [], completedCount: 0 }
      modules.push(group)
    }
    group.lessons.push(entry)
    if (entry.status === "completed") group.completedCount++
  })
  return { modules, projects, pendingBeforeProject }
}
