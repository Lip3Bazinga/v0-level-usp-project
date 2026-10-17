// ── Linhas de banco legadas (Supabase) ────────────────────────────────────────
// Usadas apenas pela camada antiga (pastas supabase/ e server/ de src/lib) enquanto ela não
// for removida. Código novo não deve depender delas.

export interface ExamRow {
  id: string
  course_id: string
  title: string
  description: string
  time_limit_minutes: number
  cooldown_minutes: number
  active: boolean
  created_at: string
}

export interface ExamQuestionRow {
  id: string
  exam_id: string
  prompt: string
  options: string[]
  correct_index: number
  explanation: string
  topic: string
  sort_order: number
  active: boolean
  created_at: string
}

export interface ExamAttemptRow {
  id: string
  exam_id: string
  user_id: string
  question_ids: string[]
  answers: Record<string, number>
  score: number | null
  passed: boolean | null
  started_at: string
  submitted_at: string | null
  created_at: string
}

export interface CertificateRow {
  id: string
  user_id: string
  course_id: string
  verification_code: string
  exam_score: number | null
  project_status: "passed" | "waived"
  issued_at: string
}

// ── DTOs da API de prova/certificação: fonte única em @levelusp/contracts ─────
export type {
  ExamStatus,
  ExamQuestion,
  ExamStart,
  ExamResult,
  CertificateIssue,
  MyCertificate,
  CertificateVerification,
} from "@levelusp/contracts"
