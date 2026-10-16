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
import type { GrantedBadge, Lesson, LessonProgress } from "@levelusp/contracts"
import { useAuth } from "@/contexts/auth-context"
import { useNotifications } from "@/contexts/notification-context"
import { fetchPublishedLessons, fetchUserProgress, type CompletionResult } from "@/lib/api"
import { xpForLevel } from "@/lib/utils"
import { BadgeEarnedModal } from "@/components/gamification/badge-earned-modal"

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface Gamification {
  level: number
  totalXp: number
  streak: number
  maxStreak: number
  xpInLevel: number
  xpCeil: number
  xpProgress: number // 0–100
}

/**
 * Resultado de conclusão vindo da API (submissão de código, quiz ou lição
 * teórica). Só `lesson_completed` e `xp_awarded` são garantidos; quiz não
 * informa badges/nível.
 */
export type CompletionLike = Pick<CompletionResult, "lesson_completed" | "xp_awarded"> &
  Partial<Pick<CompletionResult, "new_badges" | "level_up" | "new_level">>

export interface ProgressContextValue {
  lessons: Lesson[]
  progressMap: Map<string, LessonProgress>
  isLoading: boolean
  error: string | null
  gamification: Gamification
  refresh: () => Promise<void>
  isCompleted: (lessonId: string) => boolean
  /**
   * Aplica um resultado de conclusão JÁ GRAVADO pela API: atualiza progresso e
   * perfil locais e enfileira a animação das badges novas. XP, nível, sequência
   * e badges são decididos só no servidor — o cliente apenas exibe.
   */
  applyCompletion: (lessonId: string, result: CompletionLike) => Promise<void>
}

// ── Context ───────────────────────────────────────────────────────────────────

const ProgressContext = createContext<ProgressContextValue | null>(null)

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { profile, refreshProfile } = useAuth()
  const { refresh: refreshNotifications } = useNotifications()
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [progressList, setProgressList] = useState<LessonProgress[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [badgeQueue, setBadgeQueue] = useState<GrantedBadge[]>([])

  const profileId = profile?.id

  const load = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!silent) setIsLoading(true)
      setError(null)
      try {
        const [fetchedLessons, fetchedProgress] = await Promise.all([
          fetchPublishedLessons(),
          profileId ? fetchUserProgress() : Promise.resolve([] as LessonProgress[]),
        ])
        setLessons(fetchedLessons)
        setProgressList(fetchedProgress)
      } catch {
        if (!silent) setError("Não foi possível carregar as lições. Tente novamente.")
      } finally {
        if (!silent) setIsLoading(false)
      }
    },
    [profileId],
  )

  const refresh = useCallback(() => load(), [load])

  useEffect(() => {
    load()
  }, [load])

  const progressMap = useMemo(
    () => new Map(progressList.map((p) => [p.lesson_id, p])),
    [progressList],
  )

  const applyCompletion = useCallback(
    async (lessonId: string, result: CompletionLike) => {
      if (result.lesson_completed && profileId) {
        // Reflete a conclusão imediatamente (trilhas/cadeados), antes do refetch.
        setProgressList((prev) => {
          const now = new Date().toISOString()
          const existing = prev.find((p) => p.lesson_id === lessonId)
          if (existing) {
            return prev.map((p) =>
              p.lesson_id === lessonId
                ? { ...p, status: "completed", xp_earned: p.xp_earned + result.xp_awarded, completed_at: now }
                : p,
            )
          }
          return [
            ...prev,
            {
              id: `local-${lessonId}`,
              user_id: profileId,
              lesson_id: lessonId,
              status: "completed",
              code_snapshot: null,
              score: null,
              xp_earned: result.xp_awarded,
              completed_at: now,
              created_at: now,
            },
          ]
        })
      }
      if (result.new_badges?.length) {
        setBadgeQueue((prev) => [...prev, ...result.new_badges!])
      }
      // Perfil (XP/nível/sequência), progresso real e notificações geradas pela API.
      await Promise.all([refreshProfile(), load({ silent: true }), refreshNotifications()])
    },
    [profileId, refreshProfile, load, refreshNotifications],
  )

  const isCompleted = useCallback(
    (lessonId: string) => progressMap.get(lessonId)?.status === "completed",
    [progressMap],
  )

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
    () => ({ lessons, progressMap, isLoading, error, gamification, refresh, isCompleted, applyCompletion }),
    [lessons, progressMap, isLoading, error, gamification, refresh, isCompleted, applyCompletion],
  )

  const currentBadge = badgeQueue[0]
  // Callback estável: o modal reinicia o timer/confete quando onClose muda.
  const dismissBadge = useCallback(() => setBadgeQueue((prev) => prev.slice(1)), [])

  return (
    <ProgressContext.Provider value={value}>
      {children}
      <BadgeEarnedModal
        show={!!currentBadge}
        badgeName={currentBadge?.name ?? ""}
        badgeIcon={currentBadge?.icon}
        onClose={dismissBadge}
      />
    </ProgressContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext)
  if (!ctx) throw new Error("useProgress deve ser usado dentro de ProgressProvider")
  return ctx
}
