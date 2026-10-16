import { randomInt } from "node:crypto"

/**
 * Regras puras da prova final (porte de apps/web/src/lib/server/exam.ts e das
 * rotas /api/exam/*). Sem banco nem relógio implícito: `now` sempre explícito.
 */

/** Tolerância além do tempo limite para latência de rede no envio. */
export const SUBMIT_GRACE_MS = 30_000

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

export function attemptExpiresAt(attempt: Pick<AttemptLike, "startedAt">, exam: Pick<ExamRules, "timeLimitMinutes">): Date {
  return new Date(new Date(attempt.startedAt).getTime() + exam.timeLimitMinutes * 60_000)
}

/** Tentativa aberta e dentro do tempo (pode ser retomada). */
export function isInProgress(attempt: AttemptLike, exam: Pick<ExamRules, "timeLimitMinutes">, now: Date): boolean {
  return attempt.submittedAt === null && attemptExpiresAt(attempt, exam).getTime() > now.getTime()
}

/** Ainda aceita envio: aberta e dentro do tempo + tolerância. */
export function acceptsSubmission(attempt: AttemptLike, exam: Pick<ExamRules, "timeLimitMinutes">, now: Date): boolean {
  return attempt.submittedAt === null && now.getTime() <= attemptExpiresAt(attempt, exam).getTime() + SUBMIT_GRACE_MS
}

/**
 * Tentativa abandonada (aberta e com o tempo esgotado) conta como reprovada
 * com nota 0, encerrada no instante em que expirou — assim o cooldown vale
 * também para quem abre a prova, vê as questões e deixa o tempo acabar.
 */
export function closeExpired<T extends AttemptLike>(attempts: T[], exam: Pick<ExamRules, "timeLimitMinutes">, now: Date): T[] {
  return attempts.map((a) => {
    if (a.submittedAt !== null || isInProgress(a, exam, now)) return a
    return { ...a, submittedAt: attemptExpiresAt(a, exam).toISOString(), score: 0, passed: false }
  })
}

/** Mais recente primeiro (pela hora de início). */
function byStartDesc<T extends AttemptLike>(attempts: T[]): T[] {
  return [...attempts].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
}

/** Fim do cooldown a partir da última tentativa encerrada e reprovada (null = liberado). */
export function cooldownUntil(attempts: AttemptLike[], exam: Pick<ExamRules, "cooldownMinutes" | "timeLimitMinutes">, now: Date): Date | null {
  const lastSubmitted = byStartDesc(closeExpired(attempts, exam, now)).find((a) => a.submittedAt !== null)
  if (!lastSubmitted || lastSubmitted.passed) return null
  const until = new Date(new Date(lastSubmitted.submittedAt!).getTime() + exam.cooldownMinutes * 60_000)
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

/** Resumo das tentativas para o status da prova. */
export function summarizeAttempts(attempts: AttemptLike[], exam: ExamRules, now: Date): AttemptsSummary {
  const closed = byStartDesc(closeExpired(attempts, exam, now))
  const submitted = closed.filter((a) => a.submittedAt !== null)
  const passedAttempt = submitted.find((a) => a.passed)
  const bestScore = submitted.reduce<number | null>((best, a) => (a.score !== null && (best === null || a.score > best) ? a.score : best), null)
  const open = closed.find((a) => isInProgress(a, exam, now))
  const cooldown = cooldownUntil(attempts, exam, now)
  return {
    attemptsCount: submitted.length,
    bestScore,
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
export function drawQuestions<T>(items: T[], count: number | null, rand: (max: number) => number = randomInt): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1)
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a.slice(0, questionsPerAttempt(a.length, count))
}

export interface GradableQuestion {
  id: string
  correctIndex: number
  explanation: string
}

export interface GradeOutcome {
  score: number
  passed: boolean
  correctCount: number
  total: number
  /** Só as respostas a questões da tentativa (o resto é descartado). */
  answers: Record<string, number>
  review: { questionId: string; correct: boolean; explanation: string }[]
}

/** Nota em 0–100 com duas casas decimais. */
export function scoreOf(correct: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((correct / total) * 10_000) / 100
}

/** Corrige no servidor apenas as questões sorteadas para a tentativa, na ordem dela. */
export function gradeExam(questions: GradableQuestion[], answers: Record<string, number>, passingScore: number): GradeOutcome {
  let correct = 0
  const sanitized: Record<string, number> = {}
  const review = questions.map((q) => {
    const given = Object.prototype.hasOwnProperty.call(answers, q.id) ? answers[q.id] : undefined
    if (typeof given === "number" && Number.isInteger(given)) sanitized[q.id] = given
    const ok = given === q.correctIndex
    if (ok) correct++
    return { questionId: q.id, correct: ok, explanation: q.explanation }
  })
  const score = scoreOf(correct, questions.length)
  return { score, passed: score >= passingScore, correctCount: correct, total: questions.length, answers: sanitized, review }
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

/** Elegibilidade: todas as lições publicadas do curso (fora o módulo de certificação) concluídas. */
export function examEligibility(lessons: LessonForEligibility[], completed: ReadonlySet<string>) {
  const required = lessons.filter((l) => !isCertificationModule(l.module) && !isCertificationModule(l.moduleTitle))
  const remaining = required.filter((l) => !completed.has(l.id)).length
  return { eligible: required.length > 0 && remaining === 0, remaining, total: required.length }
}
