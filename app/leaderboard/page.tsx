"use client"

import Link from "next/link"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { XPBadge } from "@/components/design-system/xp-badge"
import { StreakCounter } from "@/components/design-system/streak-counter"
import {
  Rocket,
  Trophy,
  Medal,
  Crown,
  Flame,
  Zap,
  BookOpen,
  User,
  Settings,
  ChevronUp,
  ChevronDown,
  Minus,
} from "lucide-react"

// Mock leaderboard data
const leaderboardData = [
  { rank: 1, name: "Ana Beatriz", username: "anabeatriz", xp: 78450, level: 32, streak: 45, change: "up" as const },
  { rank: 2, name: "Carlos Eduardo", username: "carlosedu", xp: 72100, level: 30, streak: 38, change: "up" as const },
  { rank: 3, name: "Maria Clara", username: "mariaclara", xp: 68920, level: 29, streak: 22, change: "down" as const },
  { rank: 4, name: "Pedro Henrique", username: "pedroh", xp: 61500, level: 27, streak: 31, change: "same" as const },
  { rank: 5, name: "Julia Santos", username: "juliasantos", xp: 58200, level: 26, streak: 19, change: "up" as const },
  { rank: 6, name: "Lucas Oliveira", username: "lucasoliv", xp: 54800, level: 25, streak: 15, change: "down" as const },
  { rank: 7, name: "Fernanda Lima", username: "fernandal", xp: 51300, level: 24, streak: 28, change: "up" as const },
  { rank: 8, name: "Joao Silva", username: "joaosilva", xp: 45780, level: 24, streak: 12, change: "up" as const, isCurrentUser: true },
  { rank: 9, name: "Gabriela Souza", username: "gabisouza", xp: 43200, level: 23, streak: 8, change: "down" as const },
  { rank: 10, name: "Rafael Costa", username: "rafaelc", xp: 40100, level: 22, streak: 14, change: "same" as const },
  { rank: 11, name: "Isabela Ferreira", username: "isabelaf", xp: 38500, level: 21, streak: 10, change: "up" as const },
  { rank: 12, name: "Thiago Almeida", username: "thiagoa", xp: 35200, level: 20, streak: 6, change: "down" as const },
  { rank: 13, name: "Camila Rodrigues", username: "camilar", xp: 32800, level: 19, streak: 17, change: "up" as const },
  { rank: 14, name: "Matheus Pereira", username: "matheusp", xp: 30100, level: 18, streak: 4, change: "same" as const },
  { rank: 15, name: "Larissa Dias", username: "larid", xp: 28400, level: 17, streak: 9, change: "down" as const },
]

function getRankIcon(rank: number) {
  if (rank === 1) return <Crown className="h-6 w-6 text-yellow-500" />
  if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />
  if (rank === 3) return <Medal className="h-6 w-6 text-amber-600" />
  return <span className="text-sm font-bold text-muted-foreground">{rank}</span>
}

function getChangeIcon(change: "up" | "down" | "same") {
  if (change === "up") return <ChevronUp className="h-4 w-4 text-success" />
  if (change === "down") return <ChevronDown className="h-4 w-4 text-destructive" />
  return <Minus className="h-4 w-4 text-muted-foreground" />
}

export default function LeaderboardPage() {
  const top3 = leaderboardData.slice(0, 3)
  const rest = leaderboardData.slice(3)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-level-purple">
              <Rocket className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-level-purple-dark">LevelUSP</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-level-purple transition-colors">
              <BookOpen className="h-4 w-4" />
              Aprender
            </Link>
            <Link href="/leaderboard" className="flex items-center gap-2 text-sm font-medium text-level-purple">
              <Trophy className="h-4 w-4" />
              Ranking
            </Link>
            <Link href="/perfil/me" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-level-purple transition-colors">
              <User className="h-4 w-4" />
              Perfil
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <XPBadge type="xp" value="2,450" size="sm" />
            <StreakCounter days={7} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-level-purple-dark">Ranking Global</h1>
          <p className="mt-2 text-muted-foreground">Os melhores estudantes da plataforma</p>
        </div>

        {/* Top 3 Podium */}
        <div className="mb-10 flex items-end justify-center gap-4">
          {/* 2nd place */}
          <div className="flex flex-col items-center">
            <Avatar className="h-16 w-16 border-4 border-gray-300">
              <AvatarFallback className="bg-gray-100 text-lg font-bold text-gray-600">
                {top3[1].name.split(" ").map((n) => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <div className="mt-2 text-center">
              <Medal className="mx-auto h-6 w-6 text-gray-400" />
              <p className="text-sm font-bold text-level-purple-dark">{top3[1].name.split(" ")[0]}</p>
              <p className="text-xs text-muted-foreground">{top3[1].xp.toLocaleString()} XP</p>
            </div>
            <div className="mt-2 h-20 w-24 rounded-t-xl bg-gray-200" />
          </div>

          {/* 1st place */}
          <div className="flex flex-col items-center">
            <Avatar className="h-20 w-20 border-4 border-yellow-400 ring-4 ring-yellow-100">
              <AvatarFallback className="bg-yellow-50 text-xl font-bold text-yellow-700">
                {top3[0].name.split(" ").map((n) => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <div className="mt-2 text-center">
              <Crown className="mx-auto h-7 w-7 text-yellow-500" />
              <p className="text-sm font-bold text-level-purple-dark">{top3[0].name.split(" ")[0]}</p>
              <p className="text-xs text-muted-foreground">{top3[0].xp.toLocaleString()} XP</p>
            </div>
            <div className="mt-2 h-28 w-24 rounded-t-xl bg-yellow-200" />
          </div>

          {/* 3rd place */}
          <div className="flex flex-col items-center">
            <Avatar className="h-16 w-16 border-4 border-amber-500">
              <AvatarFallback className="bg-amber-50 text-lg font-bold text-amber-700">
                {top3[2].name.split(" ").map((n) => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <div className="mt-2 text-center">
              <Medal className="mx-auto h-6 w-6 text-amber-600" />
              <p className="text-sm font-bold text-level-purple-dark">{top3[2].name.split(" ")[0]}</p>
              <p className="text-xs text-muted-foreground">{top3[2].xp.toLocaleString()} XP</p>
            </div>
            <div className="mt-2 h-16 w-24 rounded-t-xl bg-amber-200" />
          </div>
        </div>

        {/* Full Leaderboard Table */}
        <div className="rounded-2xl border border-border bg-white overflow-hidden">
          <div className="grid grid-cols-[48px_1fr_100px_80px_60px] gap-4 border-b border-border bg-muted/50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span>#</span>
            <span>Estudante</span>
            <span className="text-right">XP Total</span>
            <span className="text-right">Streak</span>
            <span className="text-right">Var.</span>
          </div>

          {leaderboardData.map((entry) => (
            <Link
              key={entry.rank}
              href={`/perfil/${entry.username}`}
              className={`grid grid-cols-[48px_1fr_100px_80px_60px] gap-4 items-center px-4 py-3 transition-colors hover:bg-level-purple-subtle/50 ${
                entry.isCurrentUser ? "bg-level-purple-light/50 border-l-4 border-level-purple" : "border-b border-border"
              }`}
            >
              <div className="flex h-8 w-8 items-center justify-center">
                {getRankIcon(entry.rank)}
              </div>

              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback className={`text-xs font-bold ${entry.isCurrentUser ? "bg-level-purple text-white" : "bg-level-purple-light text-level-purple-dark"}`}>
                    {entry.name.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {entry.name}
                    {entry.isCurrentUser && <span className="ml-2 text-xs text-level-purple">(voce)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">Nivel {entry.level}</p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-sm font-semibold text-level-purple-dark">
                  {entry.xp.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-end gap-1">
                <Flame className="h-4 w-4 text-orange-500" />
                <span className="text-sm text-muted-foreground">{entry.streak}</span>
              </div>

              <div className="flex justify-end">
                {getChangeIcon(entry.change)}
              </div>
            </Link>
          ))}
        </div>
      </main>

      {/* Mobile Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-white md:hidden">
        <div className="flex items-center justify-around py-2">
          <Link href="/dashboard" className="flex flex-col items-center gap-1 px-4 py-2 text-muted-foreground">
            <BookOpen className="h-5 w-5" />
            <span className="text-xs font-medium">Aprender</span>
          </Link>
          <Link href="/leaderboard" className="flex flex-col items-center gap-1 px-4 py-2 text-level-purple">
            <Trophy className="h-5 w-5" />
            <span className="text-xs font-medium">Ranking</span>
          </Link>
          <Link href="/perfil/me" className="flex flex-col items-center gap-1 px-4 py-2 text-muted-foreground">
            <User className="h-5 w-5" />
            <span className="text-xs font-medium">Perfil</span>
          </Link>
          <Link href="/settings" className="flex flex-col items-center gap-1 px-4 py-2 text-muted-foreground">
            <Settings className="h-5 w-5" />
            <span className="text-xs font-medium">Config</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}
