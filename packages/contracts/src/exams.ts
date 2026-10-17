import { z } from "zod"
import { answerSheetSchema, CORRECT_INDEX_OUT_OF_RANGE, correctIndexWithinOptions, multipleChoiceFields, type AnswerSheetResult } from "./questions"
import { patchSchemaOf } from "./schema"

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
  answers: answerSheetSchema,
})
export type ExamSubmitInput = z.infer<typeof examSubmitSchema>

export type ExamResult = AnswerSheetResult

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

/** Prova na listagem administrativa do banco de questões. */
export interface AdminExamSummary {
  id: string
  course_id: string
  course_title: string
  title: string
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

const examQuestionObjectSchema = z.object({
  ...multipleChoiceFields,
  topic: z.string().trim().max(120).default(""),
  sort_order: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
})

export const examQuestionInputSchema = examQuestionObjectSchema.refine(correctIndexWithinOptions, CORRECT_INDEX_OUT_OF_RANGE)
export type ExamQuestionInput = z.infer<typeof examQuestionInputSchema>
/** PATCH sem defaults; o limite do correct_index é checado na API contra as opções gravadas. */
export const examQuestionUpdateSchema = patchSchemaOf(examQuestionObjectSchema)
export type ExamQuestionUpdateInput = z.infer<typeof examQuestionUpdateSchema>
