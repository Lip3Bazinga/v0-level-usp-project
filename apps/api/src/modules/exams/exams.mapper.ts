import type { AdminExamQuestion, AdminExamSummary, ExamQuestion, ExamStart } from "@levelusp/contracts"
import type { ExamAttemptRow, ExamQuestionRow, ExamRow } from "@levelusp/db"
import { toIsoTimestamp } from "@/common/time/time"
import { attemptExpiresAt, type AttemptLike, type ExamRules } from "./exams.domain"

/** Prova com o título do curso, para a listagem administrativa. */
export interface ExamSummaryRow {
  id: string
  courseId: string
  courseTitle: string
  title: string
}

/** Questão da prova sem gabarito nem explicação. */
export type PublicExamQuestionRow = Pick<ExamQuestionRow, "id" | "prompt" | "options">

/** Regras da prova para as funções de domínio. */
export function toRules(exam: ExamRow): ExamRules {
  return {
    passingScore: exam.passingScore,
    timeLimitMinutes: exam.timeLimitMinutes,
    cooldownMinutes: exam.cooldownMinutes,
    questionsPerAttempt: exam.questionsPerAttempt,
  }
}

/** Tentativa no formato que as regras de domínio usam. */
export function toAttemptLike(attempt: ExamAttemptRow): AttemptLike {
  return {
    id: attempt.id,
    startedAt: toIsoTimestamp(attempt.startedAt),
    submittedAt: attempt.submittedAt ? toIsoTimestamp(attempt.submittedAt) : null,
    score: attempt.score === null ? null : Number(attempt.score),
    passed: attempt.passed,
  }
}

/** Questão para o aluno: só id, enunciado e alternativas. */
export function toExamQuestion(question: PublicExamQuestionRow): ExamQuestion {
  return { id: question.id, prompt: question.prompt, options: [...question.options] }
}

/** Peças da resposta de início (ou retomada) de tentativa. */
export interface ExamStartParts {
  attempt: AttemptLike
  exam: ExamRow
  questions: PublicExamQuestionRow[]
  /** true quando devolve a tentativa já aberta em vez de criar outra. */
  resumed: boolean
}

/** Tentativa iniciada no formato do contrato; o prazo vem das regras da prova. */
export function toExamStart({ attempt, exam, questions, resumed }: ExamStartParts): ExamStart {
  return {
    attemptId: attempt.id,
    expiresAt: attemptExpiresAt(attempt, exam).toISOString(),
    timeLimitMinutes: exam.timeLimitMinutes,
    questions: questions.map(toExamQuestion),
    resumed,
  }
}

/** Prova na listagem administrativa. */
export function toAdminExamSummary(exam: ExamSummaryRow): AdminExamSummary {
  return { id: exam.id, course_id: exam.courseId, course_title: exam.courseTitle, title: exam.title }
}

/** Questão com gabarito, para o admin. */
export function toAdminQuestion(question: ExamQuestionRow): AdminExamQuestion {
  return {
    id: question.id,
    exam_id: question.examId,
    prompt: question.prompt,
    options: question.options,
    correct_index: question.correctIndex,
    explanation: question.explanation,
    topic: question.topic,
    sort_order: question.sortOrder,
    active: question.active,
    created_at: question.createdAt,
  }
}
