/** Nota do aluno (tabela `notes`). Campos `*_title` vêm de joins opcionais. */
export interface Note {
  id: string
  user_id: string
  lesson_id: string | null
  course_id: string | null
  title: string | null
  content: string
  created_at: string
  updated_at: string
  // joins (populados quando a query inclui lessons/courses)
  lesson_title?: string
  course_title?: string
}
