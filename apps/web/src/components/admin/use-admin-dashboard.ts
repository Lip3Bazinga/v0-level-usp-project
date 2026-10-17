"use client"

import { useCallback } from "react"
import type { Course, Lesson, PlatformMetrics, Profile, RecentActivity } from "@levelusp/contracts"
import { useAsyncResource, type AsyncResource } from "@/hooks/use-async-resource"
import {
  HTTP_STATUS, fetchAdminLessons, fetchAdminUsers, fetchDailyActivity, fetchPlatformMetrics, fetchRecentActivity,
  fetchTeacherCourses, getErrorMessage, isApiError,
} from "@/lib/api"

const RECENT_ACTIVITY_LIMIT = 10

/** Dados que o painel inteiro compartilha (visão geral, usuários, lições e busca ⌘K). */
export interface AdminDashboard {
  metrics: PlatformMetrics
  users: Profile[]
  lessons: Lesson[]
  activity: RecentActivity[]
  dailyCompletions: number[]
}

/** A API é quem autoriza: um 403 vira tela de acesso restrito, não erro genérico. */
export type AdminDashboardLoad =
  | { access: "granted"; dashboard: AdminDashboard }
  | { access: "denied"; message: string }

export type ListUpdate<TItem> = (update: (items: TItem[]) => TItem[]) => void

async function loadAdminDashboard(): Promise<AdminDashboardLoad> {
  try {
    const [metrics, users, lessons, activity, dailyCompletions] = await Promise.all([
      fetchPlatformMetrics(),
      fetchAdminUsers(),
      fetchAdminLessons(),
      fetchRecentActivity(RECENT_ACTIVITY_LIMIT),
      fetchDailyActivity(),
    ])
    return { access: "granted", dashboard: { metrics, users, lessons, activity, dailyCompletions } }
  } catch (error) {
    if (isApiError(error, HTTP_STATUS.FORBIDDEN)) return { access: "denied", message: getErrorMessage(error) }
    throw error
  }
}

interface AdminDashboardState {
  /** `null` enquanto não há permissão para buscar (sessão carregando ou usuário sem papel de admin). */
  resource: AsyncResource<AdminDashboardLoad | null>
  /** Só alimenta a busca ⌘K; uma falha aqui não bloqueia o painel. */
  courses: Course[]
  updateUsers: ListUpdate<Profile>
  updateLessons: ListUpdate<Lesson>
}

export function useAdminDashboard(canLoad: boolean): AdminDashboardState {
  const resource = useAsyncResource(async () => (canLoad ? loadAdminDashboard() : null), [canLoad], {
    errorMessage: "Erro ao carregar os dados do painel.",
  })
  const courses = useAsyncResource(async () => (canLoad ? fetchTeacherCourses() : []), [canLoad])
  const { setData } = resource

  const updateDashboard = useCallback(
    (update: (dashboard: AdminDashboard) => AdminDashboard) =>
      setData((load) => (load?.access === "granted" ? { ...load, dashboard: update(load.dashboard) } : load)),
    [setData],
  )
  const updateUsers = useCallback<ListUpdate<Profile>>(
    (update) => updateDashboard((dashboard) => ({ ...dashboard, users: update(dashboard.users) })),
    [updateDashboard],
  )
  const updateLessons = useCallback<ListUpdate<Lesson>>(
    (update) => updateDashboard((dashboard) => ({ ...dashboard, lessons: update(dashboard.lessons) })),
    [updateDashboard],
  )

  return { resource, courses: courses.status === "success" ? courses.data : [], updateUsers, updateLessons }
}
