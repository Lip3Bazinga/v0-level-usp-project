import { z } from "zod"

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

/** Questão como enviada ao aluno (sem gabarito). */
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

export const examSubmitSchema = z.object({
  attemptId: z.uuid(),
  answers: z.record(z.uuid(), z.number().int().min(0).max(20)),
})
export type ExamSubmitInput = z.infer<typeof examSubmitSchema>

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

export interface MyCertificate {
  verification_code: string
  issued_at: string
  exam_score: number
  course_id: string
  course_title: string
}

/** Verificação pública de certificado (sem dados sensíveis). */
export interface CertificateVerification {
  valid: boolean
  verification_code: string
  student_name: string | null
  course_title: string | null
  issued_at: string | null
  exam_score: number | null
}

/** Questão de prova como o admin vê (inclui gabarito). */
export interface AdminExamQuestion {
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

export const examQuestionInputSchema = z
  .object({
    prompt: z.string().trim().min(1).max(2000),
    options: z.array(z.string().trim().min(1).max(500)).min(2).max(8),
    correct_index: z.number().int().min(0),
    explanation: z.string().trim().max(2000).default(""),
    topic: z.string().trim().max(120).default(""),
    sort_order: z.number().int().min(0).default(0),
    active: z.boolean().default(true),
  })
  .refine((q) => q.correct_index < q.options.length, {
    message: "correct_index fora das opções",
    path: ["correct_index"],
  })
export type ExamQuestionInput = z.infer<typeof examQuestionInputSchema>
export const examQuestionUpdateSchema = z
  .object({
    prompt: z.string().trim().min(1).max(2000),
    options: z.array(z.string().trim().min(1).max(500)).min(2).max(8),
    correct_index: z.number().int().min(0),
    explanation: z.string().trim().max(2000),
    topic: z.string().trim().max(120),
    sort_order: z.number().int().min(0),
    active: z.boolean(),
  })
  .partial()
export type ExamQuestionUpdateInput = z.infer<typeof examQuestionUpdateSchema>
