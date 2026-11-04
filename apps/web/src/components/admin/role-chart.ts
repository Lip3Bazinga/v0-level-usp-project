import { USER_ROLES, type UserRole } from "@levelusp/contracts"
import { isOneOf } from "@/lib/utils"
import type { ChartSlice } from "./charts"

const ROLE_CHART_META: Record<UserRole, { label: string; color: string }> = {
  student: { label: "Alunos", color: "#7C3AED" },
  teacher: { label: "Professores", color: "#A78BFA" },
  admin: { label: "Admins", color: "#EF4444" },
}

/** Cor de papéis que a interface ainda não conhece. */
const UNKNOWN_ROLE_COLOR = "#94A3B8"

/** Fatia do gráfico de distribuição por papel; papéis desconhecidos aparecem pelo nome cru. */
export function roleSlice(role: string, count: number): ChartSlice {
  if (!isOneOf(USER_ROLES, role)) return { name: role, value: count, color: UNKNOWN_ROLE_COLOR }
  const { label, color } = ROLE_CHART_META[role]
  return { name: label, value: count, color }
}
