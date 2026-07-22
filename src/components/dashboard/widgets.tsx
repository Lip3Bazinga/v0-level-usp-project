"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { motion } from "framer-motion"
import { Flame, Zap, Trophy, CheckCircle2, Sparkles, Lock } from "lucide-react"
import { fetchAllBadges, fetchUserBadges } from "@/lib/supabase/badges"
import { badgeIcon } from "@/lib/badge-icons"
import type { Badge, LessonProgress, Profile } from "@/lib/supabase/types"
import { localDateKey, todayKey, PLATFORM_TIMEZONE } from "@/lib/utils/date"

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Conjunto de dias (YYYY-MM-DD) com pelo menos uma lição concluída. */
export function useStudyDays(progressMap: Map<string, LessonProgress>): Set<string> {
  return useMemo(() => {
    const days = new Set<string>()
    progressMap.forEach((p) => {
      if (p.status === "completed" && p.completed_at) days.add(localDateKey(p.completed_at))
    })
    return days
  }, [progressMap])
}

// ── Contador animado ──────────────────────────────────────────────────────────

function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(0)
  const startRef = useRef<number | null>(null)
  useEffect(() => {
    let raf: number
    const tick = (t: number) => {
      if (startRef.current === null) startRef.current = t
      const k = Math.min(1, (t - startRef.current) / durationMs)
      const eased = 1 - Math.pow(1 - k, 3)
      setValue(Math.round(target * eased))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    startRef.current = null
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, durationMs])
  return value
}

// ── Cards de stats ────────────────────────────────────────────────────────────

interface StatCardsProps {
  streak: number
  totalXp: number
  lessonsCompleted: number
  level: number
}

export function StatCards({ streak, totalXp, lessonsCompleted, level }: StatCardsProps) {
  const xp = useCountUp(totalXp)
  const lessons = useCountUp(lessonsCompleted, 700)
  const items = [
    { label: "Dias seguidos", value: streak, icon: Flame, fg: "text-orange-500", bg: "bg-orange-50", ring: "ring-orange-100" },
    { label: "XP total", value: xp, icon: Zap, fg: "text-level-purple", bg: "bg-level-purple-light", ring: "ring-purple-100" },
    { label: "Lições", value: lessons, icon: CheckCircle2, fg: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-100" },
    { label: "Nível", value: level, icon: Trophy, fg: "text-amber-500", bg: "bg-amber-50", ring: "ring-amber-100" },
  ]
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 * i, duration: 0.35, ease: "easeOut" }}
          className={`flex items-center gap-3 rounded-2xl border border-border bg-white p-3 shadow-sm ring-4 ${s.ring}`}
        >
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.bg}`}>
            <s.icon className={`h-5 w-5 ${s.fg}`} />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-extrabold leading-none text-foreground tabular-nums">
              {s.value.toLocaleString("pt-BR")}
            </p>
            <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground">{s.label}</p>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// ── Meta diária (anel) ────────────────────────────────────────────────────────

const DAILY_GOAL = 1

export function DailyGoalRing({ studyDays }: { studyDays: Set<string> }) {
  const done = studyDays.has(todayKey()) ? DAILY_GOAL : 0
  const pct = Math.min(1, done / DAILY_GOAL)
  const R = 30
  const C = 2 * Math.PI * R

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-white p-4 shadow-sm">
      <div className="relative h-[76px] w-[76px] shrink-0">
        <svg viewBox="0 0 76 76" className="h-full w-full -rotate-90">
          <circle cx="38" cy="38" r={R} fill="none" stroke="#EDE9FE" strokeWidth="8" />
          <motion.circle
            cx="38" cy="38" r={R} fill="none"
            stroke={pct >= 1 ? "#10B981" : "#7C3AED"}
            strokeWidth="8" strokeLinecap="round"
            strokeDasharray={C}
            initial={{ strokeDashoffset: C }}
            animate={{ strokeDashoffset: C * (1 - pct) }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {pct >= 1 ? (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 1.1 }}>
              <Sparkles className="h-6 w-6 text-emerald-500" />
            </motion.div>
          ) : (
            <span className="text-sm font-extrabold text-level-purple-dark">{done}/{DAILY_GOAL}</span>
          )}
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-foreground">Meta diária</p>
        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
          {pct >= 1
            ? "Meta concluída! Streak garantido por hoje."
            : `Complete ${DAILY_GOAL} lição hoje para manter o streak.`}
        </p>
      </div>
    </div>
  )
}

// ── Mapa de atividade semanal ─────────────────────────────────────────────────

export function WeeklyActivity({ studyDays }: { studyDays: Set<string> }) {
  const days = useMemo(() => {
    const out: { key: string; label: string; isToday: boolean }[] = []
    const now = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      const key = d.toLocaleDateString("sv-SE", { timeZone: PLATFORM_TIMEZONE })
      const label = d.toLocaleDateString("pt-BR", { weekday: "narrow", timeZone: PLATFORM_TIMEZONE }).toUpperCase()
      out.push({ key, label, isToday: i === 0 })
    }
    return out
  }, [])

  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <p className="mb-3 text-sm font-bold text-foreground">Sua semana</p>
      <div className="flex items-center justify-between">
        {days.map((d, i) => {
          const studied = studyDays.has(d.key)
          return (
            <div key={d.key} className="flex flex-col items-center gap-1.5">
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.06 * i, type: "spring", stiffness: 300, damping: 20 }}
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  studied
                    ? "bg-gradient-to-br from-orange-400 to-red-500 shadow-md shadow-orange-200"
                    : d.isToday
                    ? "border-2 border-dashed border-level-purple-medium bg-level-purple-subtle"
                    : "bg-muted"
                }`}
              >
                {studied && <Flame className="h-4 w-4 text-white" />}
              </motion.div>
              <span className={`text-[10px] font-bold ${d.isToday ? "text-level-purple" : "text-muted-foreground"}`}>
                {d.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Próxima conquista ─────────────────────────────────────────────────────────

const RARITY_STYLE: Record<string, string> = {
  common: "from-slate-400 to-slate-500",
  rare: "from-sky-400 to-blue-600",
  epic: "from-violet-400 to-purple-600",
  legendary: "from-amber-400 to-orange-500",
}

function badgeCurrent(b: Badge, profile: Profile): number {
  const p = profile as unknown as Record<string, number>
  switch (b.criteria_type) {
    case "total_xp": return p.total_xp ?? 0
    case "current_streak": return p.current_streak ?? 0
    case "max_streak": return p.max_streak ?? 0
    case "lessons_completed": return p.lessons_completed ?? 0
    case "courses_completed": return p.courses_completed ?? 0
    default: return 0
  }
}

export function NextBadge({ profile }: { profile: Profile | null }) {
  const [next, setNext] = useState<{ badge: Badge; current: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    let alive = true
    Promise.all([fetchAllBadges(), fetchUserBadges(profile.id)])
      .then(([all, mine]) => {
        if (!alive) return
        const owned = new Set(mine.map((m) => m.badge_id))
        const candidates = all
          .filter((b) => b.active && b.criteria_type !== "manual" && !owned.has(b.id) && b.criteria_value > 0)
          .map((b) => ({ badge: b, current: Math.min(badgeCurrent(b, profile), b.criteria_value) }))
          .sort((a, b) => b.current / b.badge.criteria_value - a.current / a.badge.criteria_value)
        setNext(candidates[0] ?? null)
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [profile])

  if (loading || !next) {
    return loading ? (
      <div className="h-[104px] animate-pulse rounded-2xl border border-border bg-muted/40" />
    ) : null
  }

  const { badge, current } = next
  const Icon = badgeIcon(badge.icon)
  const pct = Math.round((current / badge.criteria_value) * 100)
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
        <div className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${RARITY_STYLE[badge.rarity] ?? RARITY_STYLE.common} opacity-90`}>
          <Icon className="h-6 w-6 text-white" />
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
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }}
              />
            </div>
            <span className="shrink-0 text-[11px] font-bold text-level-purple tabular-nums">
              {current.toLocaleString("pt-BR")}/{badge.criteria_value.toLocaleString("pt-BR")}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {remaining > 0 ? `Faltam ${remaining.toLocaleString("pt-BR")} para desbloquear` : "Quase lá!"}
          </p>
        </div>
      </div>
    </motion.div>
  )
}
