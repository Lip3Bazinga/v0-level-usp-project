"use client"

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

interface HeaderProps {
  xp: number
  maxXp: number
  streak: number
  level: number
  lessonTitle: string
  lessonProgress: number
}

export function Header({ xp, maxXp, streak, level, lessonTitle, lessonProgress }: HeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
      {/* Logo e Título */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">L</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-foreground">LevelUSP</span>
            <span className="text-[10px] text-muted-foreground">100% Gratuito</span>
          </div>
        </div>
        <div className="hidden h-6 w-px bg-border md:block" />
        <div className="hidden md:block">
          <span className="text-sm font-medium text-foreground">{lessonTitle}</span>
        </div>
      </div>

      {/* Barra de progresso central */}
      <div className="hidden flex-1 items-center justify-center gap-3 px-8 md:flex">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-accent" />
          <span className="text-xs font-medium text-muted-foreground">Nível {level}</span>
        </div>
        <div className="relative w-64">
          <Progress value={lessonProgress} className="h-2" />
          <span className="absolute right-0 top-3 text-[10px] text-muted-foreground">
            {lessonProgress}% completo
          </span>
        </div>
      </div>

      {/* Gamificação e Perfil */}
      <div className="flex items-center gap-3">
        {/* XP */}
        <div className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5">
          <Zap className="h-4 w-4 text-primary" />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-foreground">{xp.toLocaleString()}</span>
            <span className="text-[9px] text-muted-foreground">/{maxXp.toLocaleString()} XP</span>
          </div>
        </div>

        {/* Streak */}
        <div className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5">
          <Flame className="h-4 w-4 text-accent" />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-foreground">{streak}</span>
            <span className="text-[9px] text-muted-foreground">dias</span>
          </div>
        </div>

        {/* Avatar/Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  JS
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Meu Perfil
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
