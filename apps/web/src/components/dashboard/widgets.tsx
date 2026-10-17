"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Flame, Zap, Trophy, CheckCircle2, Sparkles, Lock, type LucideIcon } from "lucide-react"
import type { Badge, BadgeCriteriaType, BadgeRarity, LessonProgress, Profile } from "@levelusp/contracts"
import { BadgeIcon } from "@/components/design-system/badge-icon"
import { useAsyncResource } from "@/hooks/use-async-resource"
import { fetchBadges, fetchUserBadges } from "@/lib/api"
import { formatNumber, localDateKey, todayKey, PLATFORM_TIMEZONE, toClampedPercent } from "@/lib/utils"

/** Conjunto de dias (YYYY-MM-DD) com pelo menos uma lição concluída. */
export function useStudyDays(progressByLessonId: ReadonlyMap<string, LessonProgress>): Set<string> {
  return useMemo(() => {
    const days = new Set<string>()
    progressByLessonId.forEach((progress) => {
      if (progress.status === "completed" && progress.completed_at) days.add(localDateKey(progress.completed_at))
    })
    return days
  }, [progressByLessonId])
}

const COUNT_UP_DURATION_MS = 900
const LESSONS_COUNT_UP_DURATION_MS = 700

/** Conta de 0 até `target` com desaceleração no fim (ease-out cúbico). */
function useCountUp(target: number, durationMs = COUNT_UP_DURATION_MS): number {
  const [value, setValue] = useState(0)
  useEffect(() => {
    let animationFrame = 0
    let startTime: number | null = null
    const tick = (now: number) => {
      startTime ??= now
      const progress = Math.min(1, (now - startTime) / durationMs)
      setValue(Math.round(target * (1 - Math.pow(1 - progress, 3))))
      if (progress < 1) animationFrame = requestAnimationFrame(tick)
    }
    animationFrame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animationFrame)
  }, [target, durationMs])
  return value
}

interface StatCardsProps {
  streak: number
  totalXp: number
  lessonsCompleted: number
  level: number
}

interface StatItem {
  label: string
  value: number
  icon: LucideIcon
  iconClassName: string
  backgroundClassName: string
  ringClassName: string
}

export function StatCards({ streak, totalXp, lessonsCompleted, level }: StatCardsProps) {
  const animatedXp = useCountUp(totalXp)
  const animatedLessons = useCountUp(lessonsCompleted, LESSONS_COUNT_UP_DURATION_MS)
  const items: StatItem[] = [
    { label: "Dias seguidos", value: streak, icon: Flame, iconClassName: "text-orange-500", backgroundClassName: "bg-orange-50", ringClassName: "ring-orange-100" },
    { label: "XP total", value: animatedXp, icon: Zap, iconClassName: "text-level-purple", backgroundClassName: "bg-level-purple-light", ringClassName: "ring-purple-100" },
    { label: "Lições", value: animatedLessons, icon: CheckCircle2, iconClassName: "text-emerald-600", backgroundClassName: "bg-emerald-50", ringClassName: "ring-emerald-100" },
    { label: "Nível", value: level, icon: Trophy, iconClassName: "text-amber-500", backgroundClassName: "bg-amber-50", ringClassName: "ring-amber-100" },
  ]
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item, index) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 * index, duration: 0.35, ease: "easeOut" }}
          className={`flex items-center gap-3 rounded-2xl border border-border bg-white p-3 shadow-sm ring-4 ${item.ringClassName}`}
        >
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.backgroundClassName}`}>
            <item.icon className={`h-5 w-5 ${item.iconClassName}`} />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-extrabold leading-none tabular-nums text-foreground">{formatNumber(item.value)}</p>
            <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground">{item.label}</p>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

/** Lições por dia para manter a sequência. */
const DAILY_GOAL = 1
const GOAL_RING_RADIUS = 30
const GOAL_RING_CIRCUMFERENCE = 2 * Math.PI * GOAL_RING_RADIUS

export function DailyGoalRing({ studyDays }: { studyDays: Set<string> }) {
  const doneToday = studyDays.has(todayKey()) ? DAILY_GOAL : 0
  const goalFraction = Math.min(1, doneToday / DAILY_GOAL)
  const isGoalMet = goalFraction >= 1

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-white p-4 shadow-sm">
      <div className="relative h-[76px] w-[76px] shrink-0">
        <svg viewBox="0 0 76 76" className="h-full w-full -rotate-90">
          <circle cx="38" cy="38" r={GOAL_RING_RADIUS} fill="none" stroke="#EDE9FE" strokeWidth="8" />
          <motion.circle
            cx="38"
            cy="38"
            r={GOAL_RING_RADIUS}
            fill="none"
            stroke={isGoalMet ? "#10B981" : "#7C3AED"}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={GOAL_RING_CIRCUMFERENCE}
            initial={{ strokeDashoffset: GOAL_RING_CIRCUMFERENCE }}
            animate={{ strokeDashoffset: GOAL_RING_CIRCUMFERENCE * (1 - goalFraction) }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {isGoalMet ? (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 1.1 }}>
              <Sparkles className="h-6 w-6 text-emerald-500" />
            </motion.div>
          ) : (
            <span className="text-sm font-extrabold text-level-purple-dark">
              {doneToday}/{DAILY_GOAL}
            </span>
          )}
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-foreground">Meta diária</p>
        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
          {isGoalMet ? "Meta concluída! Streak garantido por hoje." : `Complete ${DAILY_GOAL} lição hoje para manter a sequência.`}
        </p>
      </div>
    </div>
  )
}

const WEEK_LENGTH_DAYS = 7

interface WeekDay {
  key: string
  label: string
  isToday: boolean
}

/** Os últimos 7 dias no fuso da plataforma, terminando hoje. */
function lastSevenDays(now = new Date()): WeekDay[] {
  return Array.from({ length: WEEK_LENGTH_DAYS }, (_, index) => {
    const daysAgo = WEEK_LENGTH_DAYS - 1 - index
    const date = new Date(now)
    date.setDate(now.getDate() - daysAgo)
    return {
      key: localDateKey(date),
      label: date.toLocaleDateString("pt-BR", { weekday: "narrow", timeZone: PLATFORM_TIMEZONE }).toUpperCase(),
      isToday: daysAgo === 0,
    }
  })
}

export function WeeklyActivity({ studyDays }: { studyDays: Set<string> }) {
  const days = useMemo(() => lastSevenDays(), [])

  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <p className="mb-3 text-sm font-bold text-foreground">Sua semana</p>
      <div className="flex items-center justify-between">
        {days.map((day, index) => {
          const hasStudied = studyDays.has(day.key)
          return (
            <div key={day.key} className="flex flex-col items-center gap-1.5">
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.06 * index, type: "spring", stiffness: 300, damping: 20 }}
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  hasStudied
                    ? "bg-gradient-to-br from-orange-400 to-red-500 shadow-md shadow-orange-200"
                    : day.isToday
                      ? "border-2 border-dashed border-level-purple-medium bg-level-purple-subtle"
                      : "bg-muted"
                }`}
              >
                {hasStudied && <Flame className="h-4 w-4 text-white" />}
              </motion.div>
              <span className={`text-[10px] font-bold ${day.isToday ? "text-level-purple" : "text-muted-foreground"}`}>{day.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const RARITY_GRADIENTS: Record<BadgeRarity, string> = {
  common: "from-slate-400 to-slate-500",
  rare: "from-sky-400 to-blue-600",
  epic: "from-violet-400 to-purple-600",
  legendary: "from-amber-400 to-orange-500",
}

type ProgressFields = Pick<Profile, "total_xp" | "current_streak" | "max_streak" | "lessons_completed" | "courses_completed">

/** Valor atual do aluno para cada critério automático de badge. */
const CRITERIA_PROGRESS: Record<Exclude<BadgeCriteriaType, "manual">, (profile: ProgressFields) => number> = {
  total_xp: (profile) => profile.total_xp,
  current_streak: (profile) => profile.current_streak,
  max_streak: (profile) => profile.max_streak,
  lessons_completed: (profile) => profile.lessons_completed,
  courses_completed: (profile) => profile.courses_completed,
}

interface BadgeProgress {
  badge: Badge
  current: number
}

/** A badge ainda não conquistada mais próxima de ser desbloqueada (maior fração do critério). */
export function pickNextBadge(catalog: readonly Badge[], ownedBadgeIds: ReadonlySet<string>, profile: ProgressFields): BadgeProgress | null {
  const candidates = catalog.flatMap((badge): BadgeProgress[] => {
    const { criteria_type: criteriaType } = badge
    if (!badge.active || criteriaType === "manual" || ownedBadgeIds.has(badge.id) || badge.criteria_value <= 0) return []
    return [{ badge, current: Math.min(CRITERIA_PROGRESS[criteriaType](profile), badge.criteria_value) }]
  })
  const fraction = ({ badge, current }: BadgeProgress) => current / badge.criteria_value
  return candidates.sort((first, second) => fraction(second) - fraction(first))[0] ?? null
}

interface BadgeCatalogState {
  catalog: Badge[]
  ownedBadgeIds: Set<string>
}

async function loadBadgeCatalogState(userId: string): Promise<BadgeCatalogState> {
  const [catalog, ownedBadges] = await Promise.all([fetchBadges(), fetchUserBadges(userId)])
  return { catalog, ownedBadgeIds: new Set(ownedBadges.map((owned) => owned.badge_id)) }
}

export function NextBadge({ profile }: { profile: Profile | null }) {
  const profileId = profile?.id
  // O progresso vem do perfil na renderização; só o catálogo e as conquistas vêm da API.
  const badgeState = useAsyncResource(
    () => (profileId ? loadBadgeCatalogState(profileId) : Promise.resolve(null)),
    [profileId],
  )

  if (!profile || badgeState.status === "loading" || (badgeState.status === "success" && !badgeState.data)) {
    return <div className="h-[104px] animate-pulse rounded-2xl border border-border bg-muted/40" />
  }
  if (badgeState.status === "error" || !badgeState.data) return null

  const next = pickNextBadge(badgeState.data.catalog, badgeState.data.ownedBadgeIds, profile)
  if (!next) return null
  return <NextBadgeCard badge={next.badge} current={next.current} />
}

function NextBadgeCard({ badge, current }: BadgeProgress) {
  const progressPercent = toClampedPercent(current, badge.criteria_value)
  const remaining = badge.criteria_value - current

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="rounded-2xl border border-border bg-white p-4 shadow-sm"
    >
      <p className="mb-3 text-sm font-bold text-foreground">Próxima conquista</p>
      <div className="flex items-center gap-3">
        <div
          className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${RARITY_GRADIENTS[badge.rarity]} opacity-90`}
        >
          <BadgeIcon name={badge.icon} className="h-6 w-6 text-white" />
          <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-muted">
            <Lock className="h-2.5 w-2.5 text-muted-foreground" />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{badge.name}</p>
          <p className="truncate text-xs text-muted-foreground">{badge.description}</p>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-level-purple-medium to-level-purple"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }}
              />
            </div>
            <span className="shrink-0 text-[11px] font-bold tabular-nums text-level-purple">
              {formatNumber(current)}/{formatNumber(badge.criteria_value)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {remaining > 0 ? `Faltam ${formatNumber(remaining)} para desbloquear` : "Quase lá!"}
          </p>
        </div>
      </div>
    </motion.div>
  )
}
