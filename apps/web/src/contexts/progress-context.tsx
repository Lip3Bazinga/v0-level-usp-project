"use client"

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"
import type { GrantedBadge, Lesson, LessonProgress } from "@levelusp/contracts"
import { BadgeEarnedModal } from "@/components/gamification/badge-earned-modal"
import { useAuth } from "@/contexts/auth-context"
import { useNotifications } from "@/contexts/notification-context"
import { useAsyncResource } from "@/hooks/use-async-resource"
import { fetchMyProgress, fetchPublishedLessons, type CompletionResult } from "@/lib/api"
import { applyLessonCompletion, indexBy, summarizeGamification, type GamificationSummary } from "@/lib/utils"

/**
 * Resultado de uma conclusão (submissão de código, quiz ou lição teórica). Só
 * `lesson_completed` e `xp_awarded` são garantidos: o quiz não informa badges nem nível.
 */
export type CompletionLike = Pick<CompletionResult, "lesson_completed" | "xp_awarded"> &
  Partial<Pick<CompletionResult, "new_badges" | "level_up" | "new_level">>

export interface ProgressState {
  lessons: Lesson[]
  progressMap: Map<string, LessonProgress>
  isLoading: boolean
  error: string | null
  gamification: GamificationSummary
}

export interface ProgressActions {
  isCompleted: (lessonId: string) => boolean
  /**
   * Aplica uma conclusão JÁ GRAVADA pela API: atualiza o progresso local, enfileira
   * a animação das badges novas e busca perfil, progresso e notificações de novo.
   * XP, nível, sequência e badges são decididos só no servidor.
   */
  applyCompletion: (lessonId: string, result: CompletionLike) => Promise<void>
}

export type ProgressContextValue = ProgressState & ProgressActions

interface ProgressData {
  lessons: Lesson[]
  progress: LessonProgress[]
}

const LOAD_ERROR_MESSAGE = "Não foi possível carregar as lições. Tente novamente."
const NO_LESSONS: Lesson[] = []
const NO_PROGRESS: LessonProgress[] = []

const ProgressContext = createContext<ProgressContextValue | null>(null)

async function loadProgressData(profileId: string | undefined): Promise<ProgressData> {
  const [lessons, progress] = await Promise.all([
    fetchPublishedLessons(),
    profileId ? fetchMyProgress() : Promise.resolve(NO_PROGRESS),
  ])
  return { lessons, progress }
}

export function ProgressProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const { profile, refreshProfile } = useAuth()
  const { refresh: refreshNotifications } = useNotifications()
  const [badgeQueue, setBadgeQueue] = useState<GrantedBadge[]>([])

  const profileId = profile?.id
  const resource = useAsyncResource(() => loadProgressData(profileId), [profileId], {
    errorMessage: () => LOAD_ERROR_MESSAGE,
  })
  const { reload, setData } = resource
  const data = resource.status === "success" ? resource.data : null
  const lessons = data?.lessons ?? NO_LESSONS
  const progressMap = useMemo(() => indexBy(data?.progress ?? NO_PROGRESS, (entry) => entry.lesson_id), [data])

  const applyCompletion = useCallback(
    async (lessonId: string, result: CompletionLike) => {
      if (result.lesson_completed && profileId) {
        const completion = {
          lessonId,
          userId: profileId,
          xpAwarded: result.xp_awarded,
          completedAt: new Date().toISOString(),
        }
        setData((current) => ({ ...current, progress: applyLessonCompletion(current.progress, completion) }))
      }
      const newBadges = result.new_badges ?? []
      if (newBadges.length) setBadgeQueue((queue) => [...queue, ...newBadges])
      await Promise.all([refreshProfile(), reload(), refreshNotifications()])
    },
    [profileId, setData, refreshProfile, reload, refreshNotifications],
  )

  const isCompleted = useCallback(
    (lessonId: string) => progressMap.get(lessonId)?.status === "completed",
    [progressMap],
  )

  const gamification = useMemo(() => summarizeGamification(profile), [profile])
  const isLoading = resource.status === "loading"
  const error = resource.status === "error" ? resource.error : null

  const value = useMemo<ProgressContextValue>(
    () => ({
      lessons,
      progressMap,
      isLoading,
      error,
      gamification,
      isCompleted,
      applyCompletion,
    }),
    [lessons, progressMap, isLoading, error, gamification, isCompleted, applyCompletion],
  )

  const currentBadge = badgeQueue[0]
  // Callback estável: o modal reinicia o timer e o confete quando `onClose` muda.
  const dismissBadge = useCallback(() => setBadgeQueue((queue) => queue.slice(1)), [])

  return (
    <ProgressContext.Provider value={value}>
      {children}
      <BadgeEarnedModal
        isOpen={Boolean(currentBadge)}
        badgeName={currentBadge?.name ?? ""}
        badgeIcon={currentBadge?.icon}
        onClose={dismissBadge}
      />
    </ProgressContext.Provider>
  )
}

export function useProgress(): ProgressContextValue {
  const context = useContext(ProgressContext)
  if (!context) throw new Error("useProgress deve ser usado dentro de ProgressProvider")
  return context
}
