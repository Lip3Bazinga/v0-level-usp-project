import { MINUTE_MS } from "@/common/time/time"

export const MAX_FAILED_LOGINS = 10
export const LOCK_DURATION_MS = 15 * MINUTE_MS

/** Estado de bloqueio da credencial, como está no banco. */
export interface LoginLockState {
  failedLoginCount: number
  lockedUntil: string | null
}

export interface FailedLoginUpdate {
  failures: number
  lockedUntil: string | null
}

export function isLocked(state: LoginLockState, now: number): boolean {
  return state.lockedUntil !== null && new Date(state.lockedUntil).getTime() > now
}

/**
 * Próximo estado após uma senha errada (numa conta não bloqueada). Bloqueio
 * vencido zera a contagem — senão 1 erro a cada 15 min bloquearia para sempre.
 */
export function registerFailedLogin(state: LoginLockState, now: number): FailedLoginUpdate {
  const priorFailures = state.lockedUntil ? 0 : state.failedLoginCount
  const failures = priorFailures + 1
  return { failures, lockedUntil: failures >= MAX_FAILED_LOGINS ? new Date(now + LOCK_DURATION_MS).toISOString() : null }
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
