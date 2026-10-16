import type { AdminExamQuestion, ExamQuestion } from "@levelusp/contracts"
import type { AttemptLike, ExamRules } from "./exams.domain"
import type { AttemptRow, ExamRow, QuestionRow } from "./exams.repository"

/** Timestamps do Postgres ("2026-10-16 12:00:00+00") → ISO 8601. */
export function toIso(value: string): string {
  return new Date(value).toISOString()
}

export function toRules(e: ExamRow): ExamRules {
  return {
    passingScore: e.passingScore,
    timeLimitMinutes: e.timeLimitMinutes,
    cooldownMinutes: e.cooldownMinutes,
    questionsPerAttempt: e.questionsPerAttempt,
  }
}

export function toAttemptLike(a: AttemptRow): AttemptLike {
  return {
    id: a.id,
    startedAt: toIso(a.startedAt),
    submittedAt: a.submittedAt ? toIso(a.submittedAt) : null,
    score: a.score === null ? null : Number(a.score),
    passed: a.passed,
  }
}

/** Questão para o aluno: só id, enunciado e alternativas. */
export function toExamQuestion(q: { id: string; prompt: string; options: string[] }): ExamQuestion {
  return { id: q.id, prompt: q.prompt, options: [...q.options] }
}

export function toAdminQuestion(q: QuestionRow): AdminExamQuestion {
  return {
    id: q.id,
    exam_id: q.examId,
    prompt: q.prompt,
    options: q.options,
    correct_index: q.correctIndex,
    explanation: q.explanation,
    topic: q.topic,
    sort_order: q.sortOrder,
    active: q.active,
    created_at: q.createdAt,
  }
}
