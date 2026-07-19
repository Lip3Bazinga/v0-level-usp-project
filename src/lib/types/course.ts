export interface Module {
  id: string
  title: string
  description: string
  icon: string
  color: string
  sort_order: number
  created_at: string
}

export interface Course {
  id: string
  title: string
  description: string
  long_description: string
  cover_image_url: string | null
  level: "iniciante" | "intermediario" | "avancado"
  tags: string[]
  total_xp: number
  estimated_hours: number
  published: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  // projeto final
  final_project_title: string | null
  final_project_description: string | null
  final_project_starter_code: string | null
  final_project_tests: string | null
  // join fields (populated manually when needed)
  lesson_count?: number
  enrolled?: boolean
}

export interface Enrollment {
  id: string
  user_id: string
  course_id: string
  enrolled_at: string
}
