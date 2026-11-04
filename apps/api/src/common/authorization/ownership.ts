import type { UserRole } from "@levelusp/contracts"

/** Quem está agindo (o mínimo para decidir autorização de dono). */
export interface Actor {
  id: string
  role: UserRole
}

/** Recurso com dono e estado de publicação (cursos, lições). */
export interface OwnedContent {
  published: boolean
  createdBy: string | null
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

export function canViewContent(actor: Actor | undefined, content: OwnedContent): boolean {
  return canView(actor, content.published, content.createdBy)
}

/** Filtro de dono nas listagens de autoria: admin vê tudo (`null`), professor só o que é seu. */
export function ownerScope(actor: Actor): string | null {
  return actor.role === "admin" ? null : actor.id
}
