"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import type { PublicProfile } from "@levelusp/contracts"
import { fetchLeaderboard } from "@/lib/api"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
  Loader2,
} from "lucide-react"
import { getInitials } from "@/lib/utils"


function getRankIcon(rank: number) {
  if (rank === 1) return <Crown className="h-6 w-6 text-yellow-500" />
  if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />
  if (rank === 3) return <Medal className="h-6 w-6 text-amber-600" />
  return <span className="text-sm font-bold text-muted-foreground">{rank}</span>
}

export default function LeaderboardPage() {
  const { profile } = useAuth()
  const [users, setUsers] = useState<PublicProfile[]>([])
  const [loading, setLoading] = useState(true)
  // Falha da API ≠ ranking vazio: antes dizia "Nenhum estudante ainda".
  const [loadError, setLoadError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setLoadError(false)
      try {
        setUsers(await fetchLeaderboard())
      } catch {
        setUsers([])
        setLoadError(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [reloadKey])

  const top3 = users.slice(0, 3)

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-8">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-level-purple">
              <Rocket className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-level-purple-dark">LevelUSP</span>
          </Link>

          <nav aria-label="Navegação principal" className="hidden lg:flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-level-purple transition-colors">
              <BookOpen className="h-4 w-4" /> Aprender
            </Link>
            <Link href="/leaderboard" className="flex items-center gap-2 text-sm font-medium text-level-purple">
              <Trophy className="h-4 w-4" /> Ranking
            </Link>
            <Link href={`/perfil/${profile?.username || "me"}`} className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-level-purple transition-colors">
              <User className="h-4 w-4" /> Perfil
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {profile && (
              <>
                <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-level-purple px-3 py-1.5 text-white">
                  <Zap className="h-4 w-4 text-yellow-300" />
                  <span className="text-xs font-bold">{(profile.total_xp ?? 0).toLocaleString("pt-BR")} XP</span>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-linear-to-r from-orange-500 to-red-500 px-3 py-1.5 text-white">
                  <Flame className="h-4 w-4 text-yellow-300" />
                  <span className="text-xs font-bold">{profile.current_streak ?? 0}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-level-purple-dark">Ranking Global</h1>
          <p className="mt-2 text-muted-foreground">Os melhores estudantes da plataforma</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-level-purple" />
            <p className="text-sm text-muted-foreground">Carregando ranking...</p>
          </div>
        ) : loadError ? (
          <div role="alert" className="mx-auto max-w-md rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center">
            <p className="text-base font-semibold text-red-800">Não foi possível carregar o ranking.</p>
            <p className="mt-1 text-sm text-red-700">Verifique sua conexão e tente novamente.</p>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="mt-4 rounded-xl bg-level-purple px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-level-purple-dark"
            >
              Tentar novamente
            </button>
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center">
            <Trophy className="mx-auto h-16 w-16 text-muted-foreground/30" />
            <h2 className="mt-4 text-lg font-semibold text-level-purple-dark">Nenhum estudante ainda</h2>
            <p className="mt-2 text-sm text-muted-foreground">Seja o primeiro a aparecer no ranking!</p>
          </div>
        ) : (
          <>
            {/* Top 3 Podium */}
            {top3.length >= 3 && (
              <div className="mb-10 flex items-end justify-center gap-4">
                {/* 2nd place */}
                <div className="flex flex-col items-center">
                  <Avatar className="h-16 w-16 border-4 border-gray-300">
                    <AvatarFallback className="bg-gray-100 text-lg font-bold text-gray-600">
                      {getInitials(top3[1].full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="mt-2 text-center">
                    <Medal className="mx-auto h-6 w-6 text-gray-400" />
                    <p className="text-sm font-bold text-level-purple-dark">{top3[1].full_name.split(" ")[0]}</p>
                    <p className="text-xs text-muted-foreground">{top3[1].total_xp.toLocaleString("pt-BR")} XP</p>
                  </div>
                  <div className="mt-2 h-20 w-24 rounded-t-xl bg-gray-200" />
                </div>

                {/* 1st place */}
                <div className="flex flex-col items-center">
                  <Avatar className="h-20 w-20 border-4 border-yellow-400 ring-4 ring-yellow-100">
                    <AvatarFallback className="bg-yellow-50 text-xl font-bold text-yellow-700">
                      {getInitials(top3[0].full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="mt-2 text-center">
                    <Crown className="mx-auto h-7 w-7 text-yellow-500" />
                    <p className="text-sm font-bold text-level-purple-dark">{top3[0].full_name.split(" ")[0]}</p>
                    <p className="text-xs text-muted-foreground">{top3[0].total_xp.toLocaleString("pt-BR")} XP</p>
                  </div>
                  <div className="mt-2 h-28 w-24 rounded-t-xl bg-yellow-200" />
                </div>

                {/* 3rd place */}
                <div className="flex flex-col items-center">
                  <Avatar className="h-16 w-16 border-4 border-amber-500">
                    <AvatarFallback className="bg-amber-50 text-lg font-bold text-amber-700">
                      {getInitials(top3[2].full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="mt-2 text-center">
                    <Medal className="mx-auto h-6 w-6 text-amber-600" />
                    <p className="text-sm font-bold text-level-purple-dark">{top3[2].full_name.split(" ")[0]}</p>
                    <p className="text-xs text-muted-foreground">{top3[2].total_xp.toLocaleString("pt-BR")} XP</p>
                  </div>
                  <div className="mt-2 h-16 w-24 rounded-t-xl bg-amber-200" />
                </div>
              </div>
            )}

            {/* Full Leaderboard Table */}
            <div className="rounded-2xl border border-border bg-white overflow-hidden">
              <div className="grid grid-cols-[32px_1fr_64px_48px] gap-2 border-b border-border bg-muted/50 px-3 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:grid-cols-[48px_1fr_100px_96px] sm:gap-4 sm:px-4">
                <span>#</span>
                <span>Estudante</span>
                <span className="text-right">XP<span className="hidden sm:inline"> Total</span></span>
                <span className="text-right"><span className="sm:hidden" aria-hidden="true">Seq.</span><span className="sr-only sm:not-sr-only">Sequência</span></span>
              </div>

              {users.map((entry, index) => {
                const rank = index + 1
                const isCurrentUser = profile?.id === entry.id

                return (
                  <Link
                    key={entry.id}
                    href={`/perfil/${entry.username}`}
                    className={`grid grid-cols-[32px_1fr_64px_48px] gap-2 items-center px-3 py-3 sm:grid-cols-[48px_1fr_100px_96px] sm:gap-4 sm:px-4 transition-colors hover:bg-level-purple-subtle/50 ${
                      isCurrentUser ? "bg-level-purple-light/50 border-l-4 border-level-purple" : "border-b border-border"
                    }`}
                  >
                    <div className="flex h-8 w-8 items-center justify-center">
                      {getRankIcon(rank)}
                    </div>

                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback className={`text-xs font-bold ${isCurrentUser ? "bg-level-purple text-white" : "bg-level-purple-light text-level-purple-dark"}`}>
                          {getInitials(entry.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {entry.full_name}
                          {isCurrentUser && <span className="ml-2 text-xs text-level-purple">(você)</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">Nível {entry.level}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-semibold text-level-purple-dark">
                        {entry.total_xp.toLocaleString("pt-BR")}
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-1">
                      <Flame className="h-4 w-4 text-orange-500" />
                      <span className="text-sm text-muted-foreground">{entry.current_streak}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </main>

      {/* Mobile Navigation */}
      <nav aria-label="Navegação principal" className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-white lg:hidden">
        <div className="flex items-center justify-around py-2">
          <Link href="/dashboard" className="flex flex-col items-center gap-1 px-4 py-2 text-muted-foreground">
            <BookOpen className="h-5 w-5" />
            <span className="text-xs font-medium">Aprender</span>
          </Link>
          <Link href="/leaderboard" className="flex flex-col items-center gap-1 px-4 py-2 text-level-purple">
            <Trophy className="h-5 w-5" />
            <span className="text-xs font-medium">Ranking</span>
          </Link>
          <Link href={`/perfil/${profile?.username || "me"}`} className="flex flex-col items-center gap-1 px-4 py-2 text-muted-foreground">
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
