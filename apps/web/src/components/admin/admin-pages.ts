import { STORAGE_KEYS } from "@/lib/constants"
import { isOneOf } from "@/lib/utils"

export const ADMIN_PAGE_IDS = [
  "overview",
  "analytics",
  "courses",
  "lessons",
  "modules",
  "badges",
  "users",
  "approvals",
  "audit",
  "libraries",
  "exams",
  "settings",
] as const

export type AdminPageId = (typeof ADMIN_PAGE_IDS)[number]

export const DEFAULT_ADMIN_PAGE: AdminPageId = "overview"

export const ADMIN_PAGE_TITLES: Record<AdminPageId, string> = {
  overview: "Visão geral",
  analytics: "Analytics",
  courses: "Cursos",
  lessons: "Lições",
  exams: "Prova Final",
  modules: "Módulos & trilhas",
  badges: "Badges",
  users: "Usuários",
  approvals: "Aprovações pendentes",
  audit: "Logs · auditoria",
  libraries: "Bibliotecas Python",
  settings: "Configurações",
}

export function isAdminPageId(value: string | null | undefined): value is AdminPageId {
  return isOneOf(ADMIN_PAGE_IDS, value)
}

/** Seção aberta por último neste navegador (preferência de UI). */
export function readStoredAdminPage(): AdminPageId {
  if (typeof window === "undefined") return DEFAULT_ADMIN_PAGE
  const stored = localStorage.getItem(STORAGE_KEYS.adminActivePage)
  return isAdminPageId(stored) ? stored : DEFAULT_ADMIN_PAGE
}

export function storeAdminPage(page: AdminPageId): void {
  localStorage.setItem(STORAGE_KEYS.adminActivePage, page)
}
