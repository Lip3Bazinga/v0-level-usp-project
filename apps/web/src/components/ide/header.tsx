"use client"

import { useEffect, useRef, type RefObject } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Flame, Zap, Trophy, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { AccountMenuContent } from "@/components/dashboard/student-shell"
import { useAuth } from "@/contexts/auth-context"
import { useTransientFlag } from "@/hooks/use-transient-value"
import { computeLevelProgress, formatNumber, formatXp, getInitials } from "@/lib/utils"
import { ROUTES, XP_PULSE_DURATION_MS } from "@/lib/constants"

interface HeaderProps {
  lessonTitle: string
  lessonProgress: number
  /** Alvo das partículas de XP do feedback de sucesso. */
  xpBadgeRef?: RefObject<HTMLDivElement | null>
}

export function Header({ lessonTitle, lessonProgress, xpBadgeRef }: HeaderProps): React.JSX.Element {
  const { profile } = useAuth()
  const level = profile?.level ?? 1
  const totalXp = profile?.total_xp ?? 0
  const streak = profile?.current_streak ?? 0
  const initials = profile?.full_name ? getInitials(profile.full_name) : "?"

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-white px-3 sm:px-4">
      <div className="flex items-center gap-2 sm:gap-4">
        <Link href={ROUTES.dashboard} aria-label="LevelUSP Voltar ao painel" className="flex items-center gap-2 rounded-xl">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-level-purple">
            <span className="text-sm font-bold text-white" aria-hidden="true">L</span>
          </div>
          <div className="hidden flex-col sm:flex">
            <span className="text-sm font-bold text-level-purple-dark">LevelUSP</span>
            <span className="text-[10px] text-muted-foreground">Voltar ao painel</span>
          </div>
        </Link>
        <div className="hidden h-6 w-px bg-border md:block" />
        <div className="hidden md:block">
          <span className="text-sm font-medium text-level-purple-dark">{lessonTitle}</span>
        </div>
      </div>

      <div className="hidden flex-1 items-center justify-center gap-3 px-8 md:flex">
        <div className="flex items-center gap-2 rounded-full bg-level-purple-light px-3 py-1">
          <Trophy className="h-4 w-4 text-level-purple" />
          <span className="text-xs font-semibold text-level-purple-dark">Nível {level}</span>
        </div>
        <div className="relative w-64">
          <div className="h-3 w-full overflow-hidden rounded-full bg-level-purple-subtle">
            <div
              className="h-full rounded-full bg-linear-to-r from-level-purple to-level-purple-medium transition-all duration-500"
              style={{ width: `${lessonProgress}%` }}
            />
          </div>
          <span className="absolute right-0 top-4 text-[10px] font-medium text-level-purple">{lessonProgress}% da lição</span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <XpPill totalXp={totalXp} level={level} badgeRef={xpBadgeRef} />
        <StreakPill streak={streak} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              aria-label={`Menu da conta (${initials})`}
              className="flex items-center gap-2 rounded-full px-2 hover:bg-level-purple-light"
            >
              <Avatar className="h-8 w-8 border-2 border-level-purple">
                <AvatarFallback className="bg-level-purple-light text-xs font-bold text-level-purple-dark">{initials}</AvatarFallback>
              </Avatar>
              <ChevronDown className="h-4 w-4 text-level-purple" />
            </Button>
          </DropdownMenuTrigger>
          <AccountMenuContent hasDashboardLink />
        </DropdownMenu>
      </div>
    </header>
  )
}

/** Pulsa quando o XP muda durante a sessão (não na primeira carga do perfil). */
function useXpPulse(totalXp: number): boolean {
  const pulse = useTransientFlag(XP_PULSE_DURATION_MS)
  const { activate } = pulse
  const previousXpRef = useRef(totalXp)

  useEffect(() => {
    const previousXp = previousXpRef.current
    previousXpRef.current = totalXp
    if (totalXp !== previousXp && previousXp !== 0) activate()
  }, [totalXp, activate])

  return pulse.isActive
}

interface XpPillProps {
  totalXp: number
  level: number
  badgeRef?: RefObject<HTMLDivElement | null> | undefined | undefined
}

function XpPill({ totalXp, level, badgeRef }: XpPillProps): React.JSX.Element {
  const isPulsing = useXpPulse(totalXp)
  const { xpInLevel, xpLevelRange, levelPercent } = computeLevelProgress(totalXp, level)

  return (
    <motion.div
      ref={badgeRef}
      animate={isPulsing ? { scale: [1, 1.18, 1] } : {}}
      transition={{ duration: 0.4, ease: "easeInOut" }}
      className="relative flex items-center"
      title={`${xpInLevel} / ${xpLevelRange} XP neste nível`}
    >
      <div className="flex flex-col gap-1 rounded-full bg-level-purple px-3 py-1.5 text-white">
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <Zap className="h-3.5 w-3.5 shrink-0 text-yellow-300" />
          <span className="text-xs font-bold leading-none">
            {formatNumber(xpInLevel)}
            <span className="font-normal opacity-95">/{formatXp(xpLevelRange)}</span>
          </span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/25">
          <motion.div
            className="h-full rounded-full bg-yellow-300"
            initial={{ width: 0 }}
            animate={{ width: `${levelPercent}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
      </div>

      <AnimatePresence>
        {isPulsing && (
          <motion.div
            initial={{ opacity: 0, y: 0, scale: 0.8 }}
            animate={{ opacity: 1, y: -28, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.7 }}
            transition={{ duration: 0.6 }}
            className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-full bg-yellow-400 px-2 py-0.5 text-[10px] font-black text-yellow-900 shadow-lg"
          >
            +XP!
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function StreakPill({ streak }: { streak: number }): React.JSX.Element {
  const hasStreak = streak > 0
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-linear-to-r from-orange-500 to-red-500 px-3 py-1.5 text-white">
      <motion.div
        animate={hasStreak ? { scale: [1, 1.2, 1], rotate: [-5, 5, 0] } : {}}
        transition={{ duration: 0.6, repeat: hasStreak ? Infinity : 0, repeatDelay: 3 }}
      >
        <Flame className="h-4 w-4 text-yellow-300" />
      </motion.div>
      <span className="whitespace-nowrap text-xs font-bold leading-none">
        {streak} <span className="font-normal opacity-80">{streak === 1 ? "dia" : "dias"}</span>
      </span>
    </div>
  )
}
