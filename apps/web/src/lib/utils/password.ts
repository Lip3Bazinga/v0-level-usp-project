import { passwordSchema } from "@levelusp/contracts"

/** Mínimo da política de senha, lido do schema compartilhado com a API. */
export const PASSWORD_MIN_LENGTH = passwordSchema.minLength ?? undefined

const INVALID_PASSWORD_MESSAGE = "Senha inválida."

/**
 * Primeira violação da política de senha (a mesma que a API aplica), ou `null` se a
 * senha é aceitável. Validar no navegador evita uma ida à API só para ouvir "não".
 */
export function getPasswordPolicyError(password: string): string | null {
  const result = passwordSchema.safeParse(password)
  if (result.success) return null
  return result.error.issues[0]?.message ?? INVALID_PASSWORD_MESSAGE
}
