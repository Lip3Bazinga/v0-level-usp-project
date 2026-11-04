"use client"

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"
import type { GrantedBadge, LessonProgress, LessonSummary } from "@levelusp/contracts"
import { BadgeEarnedModal } from "@/components/gamification/badge-earned-modal"
import { useAuth } from "@/contexts/auth-context"
import { useNotifications } from "@/contexts/notification-context"
import { useAsyncResource } from "@/hooks/use-async-resource"
import { fetchMyProgress, fetchPublishedLessonSummaries, type CompletionResult } from "@/lib/api"
import { applyLessonCompletion, indexBy, summarizeGamification, type GamificationSummary } from "@/lib/utils"

/**
 * Resultado de uma conclusão (submissão de código, quiz ou lição teórica). Só
 * `lesson_completed` e `xp_awarded` são garantidos: o quiz não informa badges nem nível.
 */
export type CompletionLike = Pick<CompletionResult, "lesson_completed" | "xp_awarded"> &
  Partial<Pick<CompletionResult, "new_badges" | "level_up" | "new_level">>

export interface ProgressState {
  /** Lições publicadas (resumo: o painel não precisa do enunciado nem dos arquivos). */
  lessons: LessonSummary[]
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

const LOAD_ERROR_MESSAGE = "Não foi possível carregar as lições. Tente novamente."
const NO_LESSONS: LessonSummary[] = []
const NO_PROGRESS: LessonProgress[] = []
const loadErrorMessage = (): string => LOAD_ERROR_MESSAGE

const ProgressContext = createContext<ProgressContextValue | null>(null)

export function ProgressProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const { profile, refreshProfile } = useAuth()
  const { refresh: refreshNotifications } = useNotifications()
  const [badgeQueue, setBadgeQueue] = useState<GrantedBadge[]>([])

  const profileId = profile?.id
  // A lista de lições não depende de quem está logado: busca uma vez, só o resumo (o painel
  // não usa enunciado nem arquivos). Atrelada ao perfil, cada página carregada buscaria a lista
  // de novo quando a sessão chega.
  const lessonsResource = useAsyncResource(fetchPublishedLessonSummaries, [], { errorMessage: loadErrorMessage })
  const progressResource = useAsyncResource(() => (profileId ? fetchMyProgress() : Promise.resolve(NO_PROGRESS)), [profileId], {
    errorMessage: loadErrorMessage,
  })
  const { reload, setData } = progressResource
  const lessons = lessonsResource.status === "success" ? lessonsResource.data : NO_LESSONS
  const progress = progressResource.status === "success" ? progressResource.data : NO_PROGRESS
  const progressMap = useMemo(() => indexBy(progress, (entry) => entry.lesson_id), [progress])

  const applyCompletion = useCallback(
    async (lessonId: string, result: CompletionLike) => {
      if (result.lesson_completed && profileId) {
        const completion = {
          lessonId,
          userId: profileId,
          xpAwarded: result.xp_awarded,
          completedAt: new Date().toISOString(),
        }
        setData((current) => applyLessonCompletion(current, completion))
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
  const isLoading = lessonsResource.status === "loading" || progressResource.status === "loading"
  const error = lessonsResource.status === "error" ? lessonsResource.error : progressResource.status === "error" ? progressResource.error : null

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
