"use client"

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  useMemo,
  type ReactNode,
} from "react"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/contexts/toast-context"
import { useNotifications } from "@/contexts/notification-context"
import {
  fetchPublishedLessons,
  fetchUserProgress,
  awardXp,
} from "@/lib/supabase/lessons"
import { grantBadges } from "@/lib/supabase/badges"
import { createClient } from "@/lib/supabase/client"
import type { Lesson, LessonProgress } from "@/lib/supabase/types"

// ── Helpers de gamificação ────────────────────────────────────────────────────

export function xpForLevel(level: number): number {
  return level * 1000
}

export interface Gamification {
  level: number
  totalXp: number
  streak: number
  maxStreak: number
  xpInLevel: number
  xpCeil: number
  xpProgress: number // 0–100
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface ProgressContextValue {
  lessons: Lesson[]
  progressMap: Map<string, LessonProgress>
  isLoading: boolean
  error: string | null
  gamification: Gamification
  refresh: () => Promise<void>
  /** Credita XP, marca a lição concluída e atualiza perfil + progresso. */
  markCompleted: (lessonId: string, xp: number) => Promise<void>
  isCompleted: (lessonId: string) => boolean
  /** Avalia critérios e concede badges novas (toast + notificação). */
  awardBadges: () => Promise<void>
}

// ── Context ───────────────────────────────────────────────────────────────────

const ProgressContext = createContext<ProgressContextValue | null>(null)

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { profile, refreshProfile } = useAuth()
  const toast = useToast()
  const { refresh: refreshNotifications } = useNotifications()
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [progressList, setProgressList] = useState<LessonProgress[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const profileId = profile?.id

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [fetchedLessons, fetchedProgress] = await Promise.all([
        fetchPublishedLessons(),
        profileId ? fetchUserProgress(profileId) : Promise.resolve([]),
      ])
      setLessons(fetchedLessons)
      setProgressList(fetchedProgress)
    } catch {
      setError("Não foi possível carregar as lições. Tente novamente.")
    } finally {
      setIsLoading(false)
    }
  }, [profileId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const progressMap = useMemo(
    () => new Map(progressList.map((p) => [p.lesson_id, p])),
    [progressList],
  )

  // Concede badges novas, exibe toast e registra notificação para cada uma.
  const awardBadges = useCallback(async () => {
    if (!profileId) return
    try {
      const granted = await grantBadges(profileId)
      if (!granted.length) return
      const supabase = createClient()
      for (const b of granted) {
        toast.alertSuccess("Nova conquista! 🏅", b.name)
      }
      // Registra no histórico de notificações (Fase 1)
      await supabase.from("notifications").insert(
        granted.map((b) => ({
          user_id: profileId,
          title: `Conquista desbloqueada: ${b.name}`,
          body: b.description,
          kind: "success" as const,
          href: "/perfil/me",
        })) as never,
      )
      refreshNotifications()
    } catch { /* concessão de badges não deve quebrar o fluxo principal */ }
  }, [profileId, toast, refreshNotifications])

  const markCompleted = useCallback(
    async (lessonId: string, xp: number) => {
      if (!profileId) return
      await awardXp(profileId, lessonId, xp)
      // Perfil precisa estar atualizado ANTES de avaliar critérios de badge
      await Promise.all([refreshProfile(), refresh()])
      await awardBadges()
    },
    [profileId, refreshProfile, refresh, awardBadges],
  )

  const isCompleted = useCallback(
    (lessonId: string) => progressMap.get(lessonId)?.status === "completed",
    [progressMap],
  )

  // Concede badges já elegíveis quando o perfil carrega (ex: streak de login,
  // ou primeira visita após implantar as badges). Idempotente via RPC.
  useEffect(() => {
    if (profileId) awardBadges()
  }, [profileId, awardBadges])

  const gamification = useMemo<Gamification>(() => {
    const level = profile?.level ?? 1
    const totalXp = profile?.total_xp ?? 0
    const streak = profile?.current_streak ?? 0
    const maxStreak = profile?.max_streak ?? 0
    const xpFloor = xpForLevel(level - 1)
    const xpCeil = xpForLevel(level)
    const xpInLevel = totalXp - xpFloor
    const xpProgress = xpCeil > 0 ? Math.min(100, Math.round((xpInLevel / xpCeil) * 100)) : 0
    return { level, totalXp, streak, maxStreak, xpInLevel, xpCeil, xpProgress }
  }, [profile?.level, profile?.total_xp, profile?.current_streak, profile?.max_streak])

  const value = useMemo<ProgressContextValue>(
    () => ({ lessons, progressMap, isLoading, error, gamification, refresh, markCompleted, isCompleted, awardBadges }),
    [lessons, progressMap, isLoading, error, gamification, refresh, markCompleted, isCompleted, awardBadges],
  )

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext)
  if (!ctx) throw new Error("useProgress deve ser usado dentro de ProgressProvider")
  return ctx
}
