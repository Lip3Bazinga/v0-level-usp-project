/** Passo pedagógico de uma lição (instrução + dica opcional). */
export interface Checkpoint {
  id: number
  instruction: string
  hint?: string
}

/** Arquivo de um projeto multi-arquivo. Pastas são implícitas pelo path. */
export interface ProjectFile {
  path: string      // ex: "main.py", "utils/helpers.py"
  content: string
}

export interface Lesson {
  id: string
  title: string
  description: string
  slug: string | null
  module: string
  order: number
  difficulty: "iniciante" | "intermediario" | "avancado"
  content_markdown: string
  starter_code: string
  starter_files: ProjectFile[]
  hidden_tests?: string
  checkpoints: Checkpoint[]
  libraries: string[] | null
  xp_reward: number
  time_limit: number
  lesson_type: "coding" | "theory"
  course_id: string | null
  module_id: string | null
  created_by: string | null
  published: boolean
  created_at: string
  updated_at: string
}

export interface LessonProgress {
  id: string
  user_id: string
  lesson_id: string
  status: "not_started" | "in_progress" | "completed"
  code_snapshot: string | null
  score: number | null
  xp_earned: number
  completed_at: string | null
  created_at: string
}

/** Um dia no mapa de atividade do perfil (contribution graph). */
export interface ActivityDay {
  date: Date
  xp: number
  activities: number
}
