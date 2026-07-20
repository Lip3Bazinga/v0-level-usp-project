"use client"

import { useRef, useEffect, useState } from "react"
import { Flame, Zap, Trophy, ChevronDown, User, Settings, LogOut } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { motion, AnimatePresence } from "framer-motion"
import { getInitials, xpForLevel } from "@/lib/utils"

interface HeaderProps {
  lessonTitle: string
  lessonProgress: number
  xpBadgeRef?: React.RefObject<HTMLDivElement | null>
}



export function Header({ lessonTitle, lessonProgress, xpBadgeRef }: HeaderProps) {
  const router = useRouter()
  const { profile, signOut } = useAuth()
  const internalBadgeRef = useRef<HTMLDivElement>(null)
  const resolvedRef = xpBadgeRef ?? internalBadgeRef

  // Gamificação derivada do perfil
  const level = profile?.level ?? 1
  const totalXp = profile?.total_xp ?? 0
  const streak = profile?.current_streak ?? 0
  const xpFloor = xpForLevel(level - 1)     // XP acumulado no início do nível atual
  const xpCeil = xpForLevel(level)           // XP necessário para o próximo nível
  const xpInLevel = totalXp - xpFloor       // XP acumulado dentro do nível atual
  const xpPct = Math.min(100, Math.round((xpInLevel / (xpCeil - xpFloor)) * 100))
  const initials = profile?.full_name ? getInitials(profile.full_name) : "?"

  // Pulse animation on xp change
  const [xpPulse, setXpPulse] = useState(false)
  const prevTotalXp = useRef(totalXp)
  useEffect(() => {
    if (totalXp !== prevTotalXp.current && prevTotalXp.current !== 0) {
      setXpPulse(true)
      const t = setTimeout(() => setXpPulse(false), 900)
      prevTotalXp.current = totalXp
      return () => clearTimeout(t)
    }
    prevTotalXp.current = totalXp
  }, [totalXp])

  const handleSignOut = async () => {
    await signOut()
    window.location.href = "/login"
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-white px-3 sm:px-4">
      {/* Logo e Título */}
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-level-purple">
            <span className="text-sm font-bold text-white">L</span>
          </div>
          <div className="hidden flex-col sm:flex">
            <span className="text-sm font-bold text-level-purple-dark">LevelUSP</span>
            <span className="text-[10px] text-muted-foreground">100% Gratuito</span>
          </div>
        </div>
        <div className="hidden h-6 w-px bg-border md:block" />
        <div className="hidden md:block">
          <span className="text-sm font-medium text-level-purple-dark">{lessonTitle}</span>
        </div>
      </div>

      {/* Barra de progresso central */}
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
          <span className="absolute right-0 top-4 text-[10px] font-medium text-level-purple">
            {lessonProgress}% completo
          </span>
        </div>
      </div>

      {/* Gamificação e Perfil */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* XP Badge with animated circular border */}
        <motion.div
          ref={resolvedRef as React.RefObject<HTMLDivElement>}
          animate={xpPulse ? { scale: [1, 1.18, 1] } : {}}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="relative flex items-center"
          title={`${xpInLevel} / ${xpCeil - xpFloor} XP neste nível`}
        >
          {/* Pill de XP: linha única + barra fina de progresso do nível */}
          <div className="flex flex-col gap-1 rounded-full bg-level-purple px-3 py-1.5 text-white">
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <Zap className="h-3.5 w-3.5 shrink-0 text-yellow-300" />
              <span className="text-xs font-bold leading-none">
                {xpInLevel.toLocaleString("pt-BR")}
                <span className="font-normal opacity-80">/{(xpCeil - xpFloor).toLocaleString("pt-BR")} XP</span>
              </span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-white/25">
              <motion.div
                className="h-full rounded-full bg-yellow-300"
                initial={{ width: 0 }}
                animate={{ width: `${xpPct}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* XP gain pop */}
          <AnimatePresence>
            {xpPulse && (
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

        {/* Streak */}
        <div className="flex items-center gap-1.5 rounded-full bg-linear-to-r from-orange-500 to-red-500 px-3 py-1.5 text-white">
          <motion.div
            animate={streak > 0 ? { scale: [1, 1.2, 1], rotate: [-5, 5, 0] } : {}}
            transition={{ duration: 0.6, repeat: streak > 0 ? Infinity : 0, repeatDelay: 3 }}
          >
            <Flame className="h-4 w-4 text-yellow-300" />
          </motion.div>
          <span className="whitespace-nowrap text-xs font-bold leading-none">
            {streak} <span className="font-normal opacity-80">{streak === 1 ? "dia" : "dias"}</span>
          </span>
        </div>

        {/* Avatar/Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 rounded-full px-2 hover:bg-level-purple-light">
              <Avatar className="h-8 w-8 border-2 border-level-purple">
                <AvatarFallback className="bg-level-purple-light text-level-purple-dark text-xs font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="h-4 w-4 text-level-purple" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => router.push(`/perfil/${profile?.username || "me"}`)}>
              <User className="mr-2 h-4 w-4" />
              Meu Perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
