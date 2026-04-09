"use client"

import * as React from "react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { 
  Trophy, 
  Zap, 
  Flame, 
  Settings, 
  ChevronLeft, 
  Calendar,
  BookOpen,
  Target,
  Share2,
  Edit3,
} from "lucide-react"
import { StatCard } from "@/components/profile/stat-card"
import { ActivityMap, generateMockActivityData } from "@/components/profile/activity-map"
import { BadgesSection, mockBadges } from "@/components/profile/badges-section"

export default function ProfilePage() {
  const activityData = React.useMemo(() => generateMockActivityData(), [])
  
  // Mock user data
  const user = {
    name: "João Silva",
    username: "@joaosilva",
    avatarUrl: "",
    bio: "Estudante de Ciência da Computação na USP. Apaixonado por Python e Machine Learning.",
    level: 24,
    totalXP: 45780,
    xpToNextLevel: 50000,
    maxStreak: 47,
    currentStreak: 12,
    coursesCompleted: 8,
    lessonsCompleted: 156,
    joinedAt: new Date("2024-01-01"),
  }

  const progressToNextLevel = ((user.totalXP % 2000) / 2000) * 100

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="hover:bg-level-purple-light">
                <ChevronLeft className="h-5 w-5 text-level-purple" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-level-purple">
                <span className="text-sm font-bold text-white">L</span>
              </div>
              <span className="text-lg font-bold text-level-purple-dark">LevelUSP</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="hover:bg-level-purple-light">
              <Share2 className="h-5 w-5 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon" className="hover:bg-level-purple-light">
              <Settings className="h-5 w-5 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Profile Header Section */}
        <section className="mb-8">
          <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
            {/* Avatar */}
            <div className="relative">
              <Avatar className="h-32 w-32 border-4 border-level-purple ring-4 ring-level-purple-light">
                <AvatarImage src={user.avatarUrl} alt={user.name} />
                <AvatarFallback className="bg-level-purple-light text-3xl font-bold text-level-purple-dark">
                  {user.name.split(" ").map((n) => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              
              {/* Level badge */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-level-purple px-4 py-1 shadow-lg">
                <span className="text-sm font-bold text-white">Nível {user.level}</span>
              </div>
              
              {/* Edit button */}
              <button className="absolute -right-1 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md transition-colors hover:bg-level-purple-light">
                <Edit3 className="h-4 w-4 text-level-purple" />
              </button>
            </div>

            {/* User Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="mb-1 text-2xl font-bold text-level-purple-dark">{user.name}</h1>
              <p className="mb-3 text-muted-foreground">{user.username}</p>
              <p className="mb-4 max-w-xl text-sm text-foreground">{user.bio}</p>
              
              {/* Quick stats inline */}
              <div className="flex flex-wrap items-center justify-center gap-4 md:justify-start">
                <div className="flex items-center gap-2 rounded-full bg-level-purple-light px-4 py-2">
                  <Calendar className="h-4 w-4 text-level-purple" />
                  <span className="text-sm text-level-purple-dark">
                    Membro desde {user.joinedAt.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-success/10 px-4 py-2">
                  <Flame className="h-4 w-4 text-success" />
                  <span className="text-sm text-success">
                    {user.currentStreak} dias de streak
                  </span>
                </div>
              </div>

              {/* XP Progress to next level */}
              <div className="mt-6 max-w-md">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progresso para o Nível {user.level + 1}</span>
                  <span className="font-medium text-level-purple">
                    {user.totalXP.toLocaleString()}/{user.xpToNextLevel.toLocaleString()} XP
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-level-purple-subtle">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-level-purple to-level-purple-medium transition-all duration-500"
                    style={{ width: `${progressToNextLevel}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Cards */}
        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Nível Atual"
            value={user.level}
            icon={Trophy}
            iconColor="text-level-purple"
            trend={{ value: 8, isPositive: true }}
          />
          <StatCard
            label="Total XP"
            value={user.totalXP}
            icon={Zap}
            iconColor="text-yellow-500"
            trend={{ value: 12, isPositive: true }}
          />
          <StatCard
            label="Maior Streak"
            value={`${user.maxStreak} dias`}
            icon={Flame}
            iconColor="text-orange-500"
          />
          <StatCard
            label="Cursos Completos"
            value={user.coursesCompleted}
            icon={BookOpen}
            iconColor="text-success"
          />
        </section>

        {/* Activity Map */}
        <section className="mb-8">
          <ActivityMap data={activityData} />
        </section>

        {/* Additional Stats */}
        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-white p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-level-purple-light">
                <BookOpen className="h-6 w-6 text-level-purple" />
              </div>
              <div>
                <p className="text-2xl font-bold text-level-purple-dark">{user.lessonsCompleted}</p>
                <p className="text-sm text-muted-foreground">Lições Completadas</p>
              </div>
            </div>
          </div>
          
          <div className="rounded-2xl border border-border bg-white p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-level-purple-light">
                <Target className="h-6 w-6 text-level-purple" />
              </div>
              <div>
                <p className="text-2xl font-bold text-level-purple-dark">89%</p>
                <p className="text-sm text-muted-foreground">Taxa de Acerto</p>
              </div>
            </div>
          </div>
          
          <div className="rounded-2xl border border-border bg-white p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-level-purple-light">
                <Zap className="h-6 w-6 text-level-purple" />
              </div>
              <div>
                <p className="text-2xl font-bold text-level-purple-dark">287</p>
                <p className="text-sm text-muted-foreground">XP Médio por Dia</p>
              </div>
            </div>
          </div>
        </section>

        {/* Badges Section */}
        <section className="mb-8">
          <BadgesSection badges={mockBadges} />
        </section>

        {/* Recent Activity */}
        <section className="mb-8">
          <div className="rounded-2xl border border-border bg-white p-6">
            <h3 className="mb-4 text-lg font-bold text-level-purple-dark">Atividade Recente</h3>
            <div className="space-y-4">
              {[
                { action: "Completou a lição", item: "Variáveis em Python", xp: 120, time: "2 horas atrás" },
                { action: "Desbloqueou badge", item: "Semana de Fogo", xp: 0, time: "Ontem" },
                { action: "Completou o quiz", item: "Tipos de Dados", xp: 85, time: "Ontem" },
                { action: "Iniciou o curso", item: "Machine Learning Básico", xp: 50, time: "3 dias atrás" },
              ].map((activity, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl bg-muted/50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-level-purple-light">
                      {activity.xp > 0 ? (
                        <Zap className="h-5 w-5 text-level-purple" />
                      ) : (
                        <Trophy className="h-5 w-5 text-level-purple" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {activity.action}: <span className="text-level-purple">{activity.item}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                  {activity.xp > 0 && (
                    <span className="rounded-full bg-level-purple px-3 py-1 text-sm font-bold text-white">
                      +{activity.xp} XP
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
