import { randomInt } from "node:crypto"
import type { AnswerSheet, AnswerSheetResult } from "@levelusp/contracts"
import { reviewAnswers, type GradableQuestion } from "@/common/scoring/answer-sheet"
import { MINUTE_MS, SECOND_MS } from "@/common/time/time"

/**
 * Regras puras da prova final (porte de apps/web/src/lib/server/exam.ts e das
 * rotas /api/exam/*). Sem banco nem relógio implícito: `now` sempre explícito.
 */

/** Tolerância além do tempo limite para latência de rede no envio. */
export const SUBMIT_GRACE_MS = 30 * SECOND_MS

export interface ExamRules {
  passingScore: number
  timeLimitMinutes: number
  cooldownMinutes: number
  questionsPerAttempt: number | null
}

export interface AttemptLike {
  id: string
  startedAt: string
  submittedAt: string | null
  score: number | null
  passed: boolean | null
}

type TimeLimit = Pick<ExamRules, "timeLimitMinutes">

export function attemptExpiresAt(attempt: Pick<AttemptLike, "startedAt">, exam: TimeLimit): Date {
  return new Date(new Date(attempt.startedAt).getTime() + exam.timeLimitMinutes * MINUTE_MS)
}

/** Tentativa aberta e dentro do tempo (pode ser retomada). */
export function isInProgress(attempt: AttemptLike, exam: TimeLimit, now: Date): boolean {
  return attempt.submittedAt === null && attemptExpiresAt(attempt, exam).getTime() > now.getTime()
}

/** Ainda aceita envio: aberta e dentro do tempo + tolerância. */
export function acceptsSubmission(attempt: AttemptLike, exam: TimeLimit, now: Date): boolean {
  return attempt.submittedAt === null && now.getTime() <= attemptExpiresAt(attempt, exam).getTime() + SUBMIT_GRACE_MS
}

/** Início mais antigo de uma tentativa aberta que ainda aceita envio; antes disso, está abandonada. */
export function staleAttemptCutoff(exam: TimeLimit, now: Date): Date {
  return new Date(now.getTime() - exam.timeLimitMinutes * MINUTE_MS - SUBMIT_GRACE_MS)
}

/**
 * Tentativa abandonada (aberta e com o tempo esgotado) conta como reprovada
 * com nota 0, encerrada no instante em que expirou — assim o cooldown vale
 * também para quem abre a prova, vê as questões e deixa o tempo acabar.
 */
export function closeExpired<T extends AttemptLike>(attempts: T[], exam: TimeLimit, now: Date): T[] {
  return attempts.map((attempt) => {
    if (attempt.submittedAt !== null || isInProgress(attempt, exam, now)) return attempt
    return { ...attempt, submittedAt: attemptExpiresAt(attempt, exam).toISOString(), score: 0, passed: false }
  })
}

/** Mais recente primeiro (pela hora de início). */
function newestFirst<T extends AttemptLike>(attempts: T[]): T[] {
  return [...attempts].sort((first, second) => new Date(second.startedAt).getTime() - new Date(first.startedAt).getTime())
}

/** Fim do cooldown a partir da última tentativa encerrada e reprovada (null = liberado). */
export function cooldownUntil(attempts: AttemptLike[], exam: Pick<ExamRules, "cooldownMinutes" | "timeLimitMinutes">, now: Date): Date | null {
  const lastSubmitted = newestFirst(closeExpired(attempts, exam, now)).find((attempt) => attempt.submittedAt !== null)
  if (!lastSubmitted?.submittedAt || lastSubmitted.passed) return null
  const until = new Date(new Date(lastSubmitted.submittedAt).getTime() + exam.cooldownMinutes * MINUTE_MS)
  return until.getTime() > now.getTime() ? until : null
}

export interface AttemptsSummary {
  attemptsCount: number
  bestScore: number | null
  passed: boolean
  passedScore: number | null
  cooldownUntil: string | null
  inProgress: { id: string; expiresAt: string } | null
}

function bestScoreOf(attempts: AttemptLike[]): number | null {
  return attempts.reduce<number | null>((best, attempt) => (attempt.score !== null && (best === null || attempt.score > best) ? attempt.score : best), null)
}

/** Resumo das tentativas para o status da prova. */
export function summarizeAttempts(attempts: AttemptLike[], exam: ExamRules, now: Date): AttemptsSummary {
  const closed = newestFirst(closeExpired(attempts, exam, now))
  const submitted = closed.filter((attempt) => attempt.submittedAt !== null)
  const passedAttempt = submitted.find((attempt) => attempt.passed)
  const open = closed.find((attempt) => isInProgress(attempt, exam, now))
  const cooldown = cooldownUntil(attempts, exam, now)
  return {
    attemptsCount: submitted.length,
    bestScore: bestScoreOf(submitted),
    passed: Boolean(passedAttempt),
    passedScore: passedAttempt ? (passedAttempt.score ?? 0) : null,
    cooldownUntil: cooldown ? cooldown.toISOString() : null,
    inProgress: open ? { id: open.id, expiresAt: attemptExpiresAt(open, exam).toISOString() } : null,
  }
}

/** Quantas questões cada tentativa terá. */
export function questionsPerAttempt(activeCount: number, configured: number | null): number {
  if (configured === null || configured <= 0) return activeCount
  return Math.min(configured, activeCount)
}

/** Embaralha (Fisher–Yates com gerador criptográfico) e sorteia `count` itens. */
export function drawQuestions<T>(items: readonly T[], count: number | null, randomBelow: (max: number) => number = randomInt): T[] {
  const shuffled = [...items]
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = randomBelow(index + 1)
    const current = shuffled[index]
    const swapped = shuffled[swapIndex]
    if (current === undefined || swapped === undefined) continue
    shuffled[index] = swapped
    shuffled[swapIndex] = current
  }
  return shuffled.slice(0, questionsPerAttempt(shuffled.length, count))
}

export interface ExamGrade extends Omit<AnswerSheetResult, "passingScore"> {
  /** Só as respostas a questões da tentativa (o resto é descartado). */
  answers: AnswerSheet
}

/** Nota em 0–100 com duas casas decimais. */
export function scoreOf(correct: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((correct / total) * 10_000) / 100
}

/** Corrige no servidor apenas as questões sorteadas para a tentativa, na ordem dela. */
export function gradeExam(questions: readonly GradableQuestion[], answers: Readonly<AnswerSheet>, passingScore: number): ExamGrade {
  const { review, correctCount, answeredQuestions } = reviewAnswers(questions, answers)
  const score = scoreOf(correctCount, questions.length)
  return { score, passed: score >= passingScore, correctCount, total: questions.length, answers: answeredQuestions, review }
}

/**
 * Lições do módulo de certificação (projeto final) não contam para liberar a
 * prova — o projeto é feito depois dela. Compara sem acento e sem caixa.
 */
export function isCertificationModule(name: string | null | undefined): boolean {
  if (!name) return false
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().includes("certificacao")
}

export interface LessonForEligibility {
  id: string
  module: string | null
  moduleTitle: string | null
}

export interface ExamEligibility {
  eligible: boolean
  remaining: number
  total: number
}

/** Elegibilidade: todas as lições publicadas do curso (fora o módulo de certificação) concluídas. */
export function examEligibility(lessons: LessonForEligibility[], completed: ReadonlySet<string>): ExamEligibility {
  const required = lessons.filter((lesson) => !isCertificationModule(lesson.module) && !isCertificationModule(lesson.moduleTitle))
  const remaining = required.filter((lesson) => !completed.has(lesson.id)).length
  return { eligible: required.length > 0 && remaining === 0, remaining, total: required.length }
}
