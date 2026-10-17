import type { LessonType, UserRole } from "@levelusp/contracts"

/** Quem está agindo (o mínimo para decidir autorização de dono). */
export interface Actor {
  id: string
  role: UserRole
}

/** Dono do recurso ou admin. */
export function canManage(actor: Actor | undefined, ownerId: string | null): boolean {
  if (!actor) return false
  return actor.role === "admin" || (ownerId !== null && ownerId === actor.id)
}

/** Publicado é visível para todos; rascunho só para o dono e admins. */
export function canView(actor: Actor | undefined, published: boolean, ownerId: string | null): boolean {
  return published || canManage(actor, ownerId)
}

/**
 * Slug legível a partir do título (mesma regra do front antigo):
 * minúsculas, sem acentos, só [a-z0-9-].
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)
    .replace(/-$/, "")
}

/** Primeiro slug livre: `base`, `base-2`, `base-3`… */
export function pickUniqueSlug(base: string, taken: Iterable<string>): string {
  const root = base || "licao"
  const used = new Set(taken)
  if (!used.has(root)) return root
  for (let i = 2; ; i++) {
    const candidate = `${root}-${i}`
    if (!used.has(candidate)) return candidate
  }
}

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

export interface PublishBlocker {
  code: "NO_TESTS" | "NO_QUESTIONS"
  message: string
}

/**
 * Uma lição só pode ficar publicada se o aluno conseguir concluí-la:
 * exercício de código precisa de gabarito; quiz precisa de questões.
 */
export function publishBlocker(lesson: { lessonType: LessonType; testCaseCount: number; quizQuestionCount: number }): PublishBlocker | null {
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
