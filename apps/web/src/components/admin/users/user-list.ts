import type { Profile, UserRole } from "@levelusp/contracts"

export const USER_SORTS = [
  { id: "xp-desc", label: "Maior XP" },
  { id: "xp-asc", label: "Menor XP" },
  { id: "name", label: "Nome (A→Z)" },
  { id: "lessons", label: "Mais lições" },
  { id: "recent", label: "Mais recentes" },
] as const

export type UserSortId = (typeof USER_SORTS)[number]["id"]

export const USER_SORT_IDS: readonly UserSortId[] = USER_SORTS.map((sort) => sort.id)

const USER_COMPARATORS: Record<UserSortId, (first: Profile, second: Profile) => number> = {
  "xp-desc": (first, second) => second.total_xp - first.total_xp,
  "xp-asc": (first, second) => first.total_xp - second.total_xp,
  name: (first, second) => first.full_name.localeCompare(second.full_name),
  lessons: (first, second) => second.lessons_completed - first.lessons_completed,
  recent: (first, second) => new Date(second.created_at).getTime() - new Date(first.created_at).getTime(),
}

export type RoleFilter = UserRole | "all"

export interface UserListQuery {
  search: string
  role: RoleFilter
  sort: UserSortId
}

function matchesSearch(user: Profile, search: string): boolean {
  const term = search.toLowerCase()
  return [user.full_name, user.email, user.username].some((field) => (field ?? "").toLowerCase().includes(term))
}

/** Usuários que casam com a busca (nome, e-mail ou username) e o papel, na ordem escolhida. */
export function filterUsers(users: Profile[], { search, role, sort }: UserListQuery): Profile[] {
  return users
    .filter((user) => (!search || matchesSearch(user, search)) && (role === "all" || user.role === role))
    .sort(USER_COMPARATORS[sort])
}

export function countByRole(users: Profile[]): Record<RoleFilter, number> {
  const counts: Record<RoleFilter, number> = { all: users.length, student: 0, teacher: 0, admin: 0 }
  for (const user of users) counts[user.role] += 1
  return counts
}

export interface BulkActionOutcome {
  updated: Profile[]
  failedCount: number
  /** Primeira falha, para a mensagem do aviso. */
  firstError: unknown
}

/** Executa a ação para cada id em paralelo e separa sucessos de falhas. */
export async function runForEachUser(userIds: string[], action: (userId: string) => Promise<Profile>): Promise<BulkActionOutcome> {
  const results = await Promise.allSettled(userIds.map(action))
  const updated: Profile[] = []
  let firstError: unknown = null
  for (const result of results) {
    if (result.status === "fulfilled") updated.push(result.value)
    else firstError ??= result.reason
  }
  return { updated, failedCount: results.length - updated.length, firstError }
}

/** Linha da planilha de usuários; as chaves viram os cabeçalhos do CSV (`type`: o CSV exige assinatura de índice). */
export type UserCsvRow = {
  id: string
  nome: string
  username: string
  email: string
  papel: Profile["role"]
  nivel: number
  xp: number
  licoes: number
  streak: number
  suspenso: "sim" | "não"
  criado_em: string
}

/** Linhas da exportação CSV (cabeçalhos em pt-BR, sem acento, como as planilhas antigas). */
export function toUserCsvRows(users: Profile[]): UserCsvRow[] {
  return users.map((user) => ({
    id: user.id,
    nome: user.full_name,
    username: user.username ?? "",
    email: user.email,
    papel: user.role,
    nivel: user.level,
    xp: user.total_xp,
    licoes: user.lessons_completed,
    streak: user.current_streak,
    suspenso: user.suspended ? "sim" : "não",
    criado_em: user.created_at,
  }))
}
