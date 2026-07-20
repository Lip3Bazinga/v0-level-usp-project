// ── Linhas de banco (tabelas exams/exam_questions/exam_attempts/certificates) ──
// Nunca expor exam_questions.correct_index ao cliente — RLS + grants por coluna
// garantem isso no banco; aqui é só o tipo da linha (usado no servidor).

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

// ── DTOs das APIs de prova/certificação (contrato cliente↔servidor) ─────────────

export interface ExamStatus {
  exam: {
    title: string
    description: string
    passingScore: number
    timeLimitMinutes: number
    cooldownMinutes: number
    questionCount: number
  }
  eligible: boolean
  lessonsRemaining: number
  lessonsTotal: number
  attemptsCount: number
  bestScore: number | null
  passed: boolean
  passedScore: number | null
  cooldownUntil: string | null
  inProgressAttemptId: string | null
  inProgressExpiresAt: string | null
}

/** Questão como enviada ao cliente (sem correct_index/explanation). */
export interface ExamQuestion {
  id: string
  prompt: string
  options: string[]
}

export interface ExamStart {
  attemptId: string
  expiresAt: string
  timeLimitMinutes: number
  questions: ExamQuestion[]
  resumed: boolean
}

export interface ExamResult {
  score: number
  passed: boolean
  passingScore: number
  correctCount: number
  total: number
  review: { questionId: string; correct: boolean; explanation: string }[]
}

export interface CertificateIssue {
  issued: boolean
  alreadyIssued: boolean
  verificationCode: string
  issuedAt: string
  examScore: number
}

/** Resumo de certificado do usuário (subset de CertificateRow + título do curso). */
export interface MyCertificate {
  verification_code: string
  issued_at: string
  exam_score: number
  course_id: string
  course_title: string
}
