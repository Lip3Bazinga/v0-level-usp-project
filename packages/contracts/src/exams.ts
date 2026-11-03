import { z } from "zod"
import { answerSheetSchema, CORRECT_INDEX_OUT_OF_RANGE, correctIndexWithinOptions, multipleChoiceFields, type AnswerSheetResult } from "./questions"
import { patchSchemaOf } from "./schema"

/**
 * Situação do aluno diante da prova final do curso (`GET /courses/:id/exam`).
 * Tempos em minutos; datas ISO 8601. `inProgress*` aponta a tentativa aberta que pode ser retomada.
 */
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

/** Tentativa iniciada ou retomada (`resumed`) da prova final; as questões vêm sem gabarito. */
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
/** Corpo de `POST /courses/:id/exam/submit`: a tentativa e as respostas por questão. */
export type ExamSubmitInput = z.infer<typeof examSubmitSchema>

/** Correção da prova final (mesmo formato da folha de respostas do quiz). */
export type ExamResult = AnswerSheetResult

/** Resposta de `POST /courses/:id/certificate`; idempotente (`alreadyIssued` na segunda chamada). */
export interface CertificateIssue {
  issued: boolean
  alreadyIssued: boolean
  verificationCode: string
  issuedAt: string
  examScore: number
}

/** Certificado do aluno logado (`GET /me/certificates`, `GET /courses/:id/certificate`). */
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
/** Corpo de `POST /admin/exams/:examId/questions`; `correct_index` precisa cair numa das opções. */
export type ExamQuestionInput = z.infer<typeof examQuestionInputSchema>
/** PATCH sem defaults; o limite do correct_index é checado na API contra as opções gravadas. */
export const examQuestionUpdateSchema = patchSchemaOf(examQuestionObjectSchema)
/** Corpo de `PATCH /admin/exam-questions/:id`. */
export type ExamQuestionUpdateInput = z.infer<typeof examQuestionUpdateSchema>
