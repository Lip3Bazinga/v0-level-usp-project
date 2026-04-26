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

interface HeaderProps {
  lessonTitle: string
  lessonProgress: number
  xpBadgeRef?: React.RefObject<HTMLDivElement | null>
}

/** XP necessário para completar o nível atual (régua simples: 1000 XP por nível). */
function xpForLevel(level: number) {
  return level * 1000
}

/** Retorna as iniciais do nome completo (ex: "João Silva" → "JS"). */
function getInitials(fullName: string) {
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("")
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

  // SVG circle arc for XP border fill
  const radius = 22
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (xpPct / 100) * circumference

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-white px-4">
      {/* Logo e Título */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-level-purple">
            <span className="text-sm font-bold text-white">L</span>
          </div>
          <div className="flex flex-col">
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
      <div className="flex items-center gap-3">
        {/* XP Badge with animated circular border */}
        <motion.div
          ref={resolvedRef as React.RefObject<HTMLDivElement>}
          animate={xpPulse ? { scale: [1, 1.18, 1] } : {}}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="relative flex items-center"
          title={`${xpInLevel} / ${xpCeil - xpFloor} XP neste nível`}
        >
          {/* SVG circular border */}
          <svg
            width="52"
            height="52"
            viewBox="0 0 52 52"
            className="absolute -left-0.5 -top-0.5"
            style={{ transform: "rotate(-90deg)" }}
          >
            {/* Background track */}
            <circle
              cx="26"
              cy="26"
              r={radius}
              fill="none"
              stroke="rgba(250, 204, 21, 0.2)"
              strokeWidth="3"
            />
            {/* Progress arc */}
            <motion.circle
              cx="26"
              cy="26"
              r={radius}
              fill="none"
              stroke="#FACC15"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: dashOffset }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              style={{ filter: "drop-shadow(0 0 4px #FACC15)" }}
            />
          </svg>

          {/* Badge content */}
          <div className="flex items-center gap-1.5 rounded-full bg-level-purple px-3 py-1.5 text-white">
            <Zap className="h-4 w-4 text-yellow-300" />
            <div className="flex flex-col">
              <span className="text-xs font-bold">{xpInLevel.toLocaleString("pt-BR")}</span>
              <span className="text-[9px] opacity-80">/{(xpCeil - xpFloor).toLocaleString("pt-BR")} XP</span>
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
          <div className="flex flex-col">
            <span className="text-xs font-bold">{streak}</span>
            <span className="text-[9px] opacity-80">dias</span>
          </div>
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
