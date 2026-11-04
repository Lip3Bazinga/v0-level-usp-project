import { describe, expect, it } from "vitest"
import {
  acceptsSubmission,
  attemptExpiresAt,
  cooldownUntil,
  drawQuestions,
  examEligibility,
  gradeExam,
  isCertificationModule,
  isInProgress,
  questionsPerAttempt,
  scoreOf,
  summarizeAttempts,
  type AttemptLike,
  type ExamRules,
} from "./exams.domain"

const exam: ExamRules = { passingScore: 70, timeLimitMinutes: 45, cooldownMinutes: 60, questionsPerAttempt: null }
const T0 = "2026-10-16T12:00:00.000Z"
const at = (iso: string): Date => new Date(iso)
const minutesAfter = (iso: string, minutes: number): Date => new Date(new Date(iso).getTime() + minutes * 60_000)

function attempt(overrides: Partial<AttemptLike> = {}): AttemptLike {
  return { id: "a1", startedAt: T0, submittedAt: null, score: null, passed: null, ...overrides }
}

describe("expiração", () => {
  it("expira em started_at + tempo limite", () => {
    expect(attemptExpiresAt(attempt(), exam).toISOString()).toBe("2026-10-16T12:45:00.000Z")
  })
  it("está em andamento só antes de expirar e se não foi enviada", () => {
    expect(isInProgress(attempt(), exam, minutesAfter(T0, 44))).toBe(true)
    expect(isInProgress(attempt(), exam, minutesAfter(T0, 45))).toBe(false)
    expect(isInProgress(attempt({ submittedAt: T0 }), exam, minutesAfter(T0, 1))).toBe(false)
  })
  it("aceita envio até 30 s depois do limite", () => {
    expect(acceptsSubmission(attempt(), exam, new Date(minutesAfter(T0, 45).getTime() + 30_000))).toBe(true)
    expect(acceptsSubmission(attempt(), exam, new Date(minutesAfter(T0, 45).getTime() + 30_001))).toBe(false)
    expect(acceptsSubmission(attempt({ submittedAt: T0 }), exam, at(T0))).toBe(false)
  })
})

describe("cooldown", () => {
  it("sem tentativas enviadas não há cooldown", () => {
    expect(cooldownUntil([], exam, at(T0))).toBeNull()
    expect(cooldownUntil([attempt()], exam, minutesAfter(T0, 5))).toBeNull()
  })
  it("conta a partir do envio da última reprovação", () => {
    const failed = attempt({ submittedAt: minutesAfter(T0, 10).toISOString(), score: 40, passed: false })
    expect(cooldownUntil([failed], exam, minutesAfter(T0, 20))?.toISOString()).toBe(minutesAfter(T0, 70).toISOString())
    expect(cooldownUntil([failed], exam, minutesAfter(T0, 70))).toBeNull()
  })
  it("aprovação não gera cooldown", () => {
    const approved = attempt({ submittedAt: minutesAfter(T0, 10).toISOString(), score: 90, passed: true })
    expect(cooldownUntil([approved], exam, minutesAfter(T0, 11))).toBeNull()
  })
  it("usa a tentativa mais recente, não a primeira da lista", () => {
    const old = attempt({ id: "old", startedAt: "2026-10-15T08:00:00.000Z", submittedAt: "2026-10-15T08:10:00.000Z", score: 10, passed: false })
    const recent = attempt({ id: "new", submittedAt: minutesAfter(T0, 10).toISOString(), score: 20, passed: false })
    expect(cooldownUntil([old, recent], exam, minutesAfter(T0, 11))?.toISOString()).toBe(minutesAfter(T0, 70).toISOString())
  })
  it("tentativa abandonada conta como reprovada a partir de quando expirou", () => {
    expect(cooldownUntil([attempt()], exam, minutesAfter(T0, 50))?.toISOString()).toBe(minutesAfter(T0, 105).toISOString())
  })
  it("cooldown zero libera imediatamente", () => {
    const failed = attempt({ submittedAt: minutesAfter(T0, 10).toISOString(), score: 0, passed: false })
    expect(cooldownUntil([failed], { ...exam, cooldownMinutes: 0 }, minutesAfter(T0, 10))).toBeNull()
  })
})

describe("summarizeAttempts", () => {
  it("resume melhor nota, aprovação e tentativa em andamento", () => {
    const summary = summarizeAttempts(
      [
        attempt({ id: "f", startedAt: "2026-10-15T08:00:00.000Z", submittedAt: "2026-10-15T08:10:00.000Z", score: 50, passed: false }),
        attempt({ id: "p", startedAt: "2026-10-15T10:00:00.000Z", submittedAt: "2026-10-15T10:10:00.000Z", score: 80, passed: true }),
        attempt({ id: "open" }),
      ],
      exam,
      minutesAfter(T0, 1),
    )
    expect(summary).toEqual({
      attemptsCount: 2,
      bestScore: 80,
      passed: true,
      passedScore: 80,
      cooldownUntil: null,
      inProgress: { id: "open", expiresAt: "2026-10-16T12:45:00.000Z" },
    })
  })
  it("abandonada entra como nota 0", () => {
    const summary = summarizeAttempts([attempt()], exam, minutesAfter(T0, 46))
    expect(summary).toMatchObject({ attemptsCount: 1, bestScore: 0, passed: false, inProgress: null })
  })
})

describe("nota e correção", () => {
  it("calcula a nota com duas casas", () => {
    expect(scoreOf(2, 3)).toBe(66.67)
    expect(scoreOf(7, 10)).toBe(70)
    expect(scoreOf(0, 0)).toBe(0)
  })
  it("corrige só as questões da tentativa e descarta respostas alheias", () => {
    const questions = [
      { id: "q1", correctIndex: 1, explanation: "e1" },
      { id: "q2", correctIndex: 0, explanation: "e2" },
      { id: "q3", correctIndex: 2, explanation: "e3" },
    ]
    const result = gradeExam(questions, { q1: 1, q2: 3, intrusa: 0 }, 60)
    expect(result).toMatchObject({ score: 33.33, passed: false, correctCount: 1, total: 3, answers: { q1: 1, q2: 3 } })
    expect(result.review.map((item) => item.correct)).toEqual([true, false, false])
  })
  it("aprova com nota igual à mínima", () => {
    const questions = Array.from({ length: 10 }, (_, index) => ({ id: `q${index}`, correctIndex: 0, explanation: "" }))
    const answers = Object.fromEntries(questions.slice(0, 7).map((question) => [question.id, 0]))
    expect(gradeExam(questions, answers, 70)).toMatchObject({ score: 70, passed: true })
  })
  it("não confunde chaves herdadas de Object.prototype", () => {
    const result = gradeExam([{ id: "toString", correctIndex: 0, explanation: "" }], {}, 70)
    expect(result.correctCount).toBe(0)
  })
})

describe("sorteio", () => {
  it("usa todas as questões quando não há limite", () => {
    expect(questionsPerAttempt(12, null)).toBe(12)
    expect(questionsPerAttempt(12, 5)).toBe(5)
    expect(questionsPerAttempt(3, 5)).toBe(3)
  })
  it("embaralha sem repetir e respeita a quantidade", () => {
    const ids = Array.from({ length: 20 }, (_, index) => index)
    const drawn = drawQuestions(ids, 8)
    expect(drawn).toHaveLength(8)
    expect(new Set(drawn).size).toBe(8)
    expect(drawQuestions(ids, null).sort((first, second) => first - second)).toEqual(ids)
  })
})

describe("elegibilidade", () => {
  const lessons = [
    { id: "l1", module: "Básico", moduleTitle: null },
    { id: "l2", module: "", moduleTitle: "Intermediário" },
    { id: "proj", module: "Certificação", moduleTitle: null },
  ]
  it("ignora o módulo de certificação", () => {
    expect(isCertificationModule("CERTIFICACAO final")).toBe(true)
    expect(isCertificationModule("Básico")).toBe(false)
    expect(examEligibility(lessons, new Set(["l1", "l2"]))).toEqual({ eligible: true, remaining: 0, total: 2 })
  })
  it("conta as lições que faltam", () => {
    expect(examEligibility(lessons, new Set(["l1"]))).toEqual({ eligible: false, remaining: 1, total: 2 })
  })
  it("curso sem lições não libera a prova", () => {
    expect(examEligibility([], new Set())).toEqual({ eligible: false, remaining: 0, total: 0 })
  })
})
