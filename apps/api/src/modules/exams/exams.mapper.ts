import type { AdminExamQuestion, AdminExamSummary, ExamQuestion, ExamStart } from "@levelusp/contracts"
import type { ExamAttemptRow, ExamQuestionRow, ExamRow } from "@levelusp/db"
import { toIsoTimestamp } from "@/common/time/time"
import { attemptExpiresAt, type AttemptLike, type ExamRules } from "./exams.domain"

export interface ExamSummaryRow {
  id: string
  courseId: string
  courseTitle: string
  title: string
}

export type PublicExamQuestionRow = Pick<ExamQuestionRow, "id" | "prompt" | "options">

export function toRules(exam: ExamRow): ExamRules {
  return {
    passingScore: exam.passingScore,
    timeLimitMinutes: exam.timeLimitMinutes,
    cooldownMinutes: exam.cooldownMinutes,
    questionsPerAttempt: exam.questionsPerAttempt,
  }
}

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

export interface ExamStartParts {
  attempt: AttemptLike
  exam: ExamRow
  questions: PublicExamQuestionRow[]
  /** true quando devolve a tentativa já aberta em vez de criar outra. */
  resumed: boolean
}

export function toExamStart({ attempt, exam, questions, resumed }: ExamStartParts): ExamStart {
  return {
    attemptId: attempt.id,
    expiresAt: attemptExpiresAt(attempt, exam).toISOString(),
    timeLimitMinutes: exam.timeLimitMinutes,
    questions: questions.map(toExamQuestion),
    resumed,
  }
}

export function toAdminExamSummary(exam: ExamSummaryRow): AdminExamSummary {
  return { id: exam.id, course_id: exam.courseId, course_title: exam.courseTitle, title: exam.title }
}

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
