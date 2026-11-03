import type { LessonType } from "@levelusp/contracts"

/** Slug usado quando o título não tem nenhum caractere aproveitável. */
export const DEFAULT_SLUG = "licao"
const MAX_SLUG_LENGTH = 80
const COMBINING_MARKS = /[̀-ͯ]/g

/**
 * Slug legível a partir do título (mesma regra do front antigo):
 * minúsculas, sem acentos, só [a-z0-9-].
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-$/, "")
}

/** Primeiro slug livre: `base`, `base-2`, `base-3`… */
export function pickUniqueSlug(base: string, taken: Iterable<string>): string {
  const root = base || DEFAULT_SLUG
  const used = new Set(taken)
  if (!used.has(root)) return root
  for (let suffix = 2; ; suffix++) {
    const candidate = `${root}-${suffix}`
    if (!used.has(candidate)) return candidate
  }
}

/** Desempate de corrida entre duas criações com o mesmo título: sufixo aleatório curto. */
export function withRandomSuffix(slug: string, random: () => number = Math.random): string {
  return `${slug}-${random().toString(36).slice(2, 8)}`
}

/** Resultado de {@link checkReorder}: válido ou o motivo da recusa. */
export type ReorderCheck = { ok: true } | { ok: false; reason: "DUPLICATE" | "FOREIGN" }

/** A nova ordem só pode conter lições do curso, cada uma uma única vez. */
export function checkReorder(requested: readonly string[], courseLessonIds: ReadonlySet<string>): ReorderCheck {
  if (new Set(requested).size !== requested.length) return { ok: false, reason: "DUPLICATE" }
  if (requested.some((id) => !courseLessonIds.has(id))) return { ok: false, reason: "FOREIGN" }
  return { ok: true }
}

/** Posição para uma lição anexada ao fim do curso. */
export function nextOrder(orders: readonly number[]): number {
  return orders.length ? Math.max(...orders) + 1 : 1
}

/** Por que uma lição ainda não pode ser publicada (o `code` vai na resposta 422). */
export interface PublishBlocker {
  code: "NO_TESTS" | "NO_QUESTIONS"
  message: string
}

/** O que {@link publishBlocker} precisa saber da lição. */
export interface PublishCandidate {
  lessonType: LessonType
  testCaseCount: number
  quizQuestionCount: number
}

/**
 * Uma lição só pode ficar publicada se o aluno conseguir concluí-la:
 * exercício de código precisa de gabarito; quiz precisa de questões.
 */
export function publishBlocker(lesson: PublishCandidate): PublishBlocker | null {
  if (lesson.lessonType === "coding" && lesson.testCaseCount === 0) {
    return { code: "NO_TESTS", message: "Cadastre ao menos um caso de teste antes de publicar a lição." }
  }
  if (lesson.lessonType === "quiz" && lesson.quizQuestionCount === 0) {
    return { code: "NO_QUESTIONS", message: "Cadastre ao menos uma questão antes de publicar o quiz." }
  }
  return null
}

/** Taxa de aprovação (0–1) das submissões; null quando não há submissões. */
export function passRate(passed: number, total: number): number | null {
  return total > 0 ? passed / total : null
}
