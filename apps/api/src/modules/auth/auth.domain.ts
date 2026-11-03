import { MS_PER_MINUTE } from "@/common/time/time"

/**
 * Bloqueio por senhas erradas: ao atingir `MAX_FAILED_LOGINS`, a conta fica
 * bloqueada por `LOCK_DURATION_MS`; bloqueio vencido recomeça a contagem (senão
 * 1 erro a cada 15 min bloquearia para sempre). A contagem é feita no banco, num
 * UPDATE atômico (`AuthRepository.recordFailedLogin`), para valer sob tentativas paralelas.
 */
export const MAX_FAILED_LOGINS = 10
export const LOCK_DURATION_MS = 15 * MS_PER_MINUTE

/** Estado de bloqueio da credencial, como está no banco. */
export interface LoginLockState {
  failedLoginCount: number
  lockedUntil: string | null
}

/** Se a conta está bloqueada por falhas de login no instante `now` (ms). */
export function isLocked(state: LoginLockState, now: number): boolean {
  return state.lockedUntil !== null && new Date(state.lockedUntil).getTime() > now
}

const MAX_USERNAME_BASE_LENGTH = 24
const MIN_USERNAME_LENGTH = 3
const FALLBACK_USERNAME = "aluno"
const SUFFIX_MIN = 1000
const SUFFIX_RANGE = 9000

/** Username a partir do e-mail, como fazia o gatilho handle_new_user do Supabase. */
export function usernameBaseFromEmail(email: string): string {
  return (email.split("@")[0] ?? FALLBACK_USERNAME)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .slice(0, MAX_USERNAME_BASE_LENGTH)
    .padEnd(MIN_USERNAME_LENGTH, "_")
}

/** Candidato alternativo quando o username base já existe: base + 4 dígitos. */
export function usernameWithSuffix(base: string, random: () => number = Math.random): string {
  return `${base}${Math.floor(SUFFIX_MIN + random() * SUFFIX_RANGE)}`
}

/** Parte do e-mail usada como nome quando o convite não traz um. */
export function displayNameFromEmail(email: string): string {
  return email.split("@")[0] ?? ""
}
