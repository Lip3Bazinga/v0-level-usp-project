"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { Trophy, Medal, Crown, Flame, Loader2 } from "lucide-react"
import type { PublicProfile } from "@levelusp/contracts"
import { useAuth } from "@/contexts/auth-context"
import { useAsyncResource } from "@/hooks/use-async-resource"
import { fetchLeaderboard } from "@/lib/api"
import { ROUTES } from "@/lib/constants"
import { formatNumber, formatXp, getInitials, cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { LoadErrorAlert } from "@/components/design-system/load-error-alert"
import { StudentShell } from "@/components/dashboard/student-shell"

const NO_USERS: PublicProfile[] = []
const PODIUM_SIZE = 3
const ROW_GRID_CLASS = "grid grid-cols-[32px_1fr_64px_48px] gap-2 px-3 sm:grid-cols-[48px_1fr_100px_96px] sm:gap-4 sm:px-4"

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="h-6 w-6 text-yellow-500" />
  if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />
  if (rank === 3) return <Medal className="h-6 w-6 text-amber-600" />
  return <span className="text-sm font-bold text-muted-foreground">{rank}</span>
}

export default function LeaderboardPage() {
  const leaderboard = useAsyncResource(() => fetchLeaderboard(), [])
  const users = leaderboard.status === "success" ? leaderboard.data : NO_USERS

  return (
    <StudentShell screen="leaderboard">
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-level-purple-dark">Ranking Global</h1>
          <p className="mt-2 text-muted-foreground">Os melhores estudantes da plataforma</p>
        </div>

        {leaderboard.status === "loading" ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20">
            <Loader2 className="h-10 w-10 animate-spin text-level-purple" />
            <p className="text-sm text-muted-foreground">Carregando ranking...</p>
          </div>
        ) : leaderboard.status === "error" ? (
          <LoadErrorAlert message="Não foi possível carregar o ranking." onRetry={() => void leaderboard.reload()} />
        ) : users.length === 0 ? (
          <div className="py-16 text-center">
            <Trophy className="mx-auto h-16 w-16 text-muted-foreground/30" />
            <h2 className="mt-4 text-lg font-semibold text-level-purple-dark">Nenhum estudante ainda</h2>
            <p className="mt-2 text-sm text-muted-foreground">Seja o primeiro a aparecer no ranking!</p>
          </div>
        ) : (
          <>
            {users.length >= PODIUM_SIZE && <Podium first={users[0]} second={users[1]} third={users[2]} />}
            <LeaderboardTable users={users} />
          </>
        )}
      </main>
    </StudentShell>
  )
}

interface PodiumProps {
  first: PublicProfile
  second: PublicProfile
  third: PublicProfile
}

function Podium({ first, second, third }: PodiumProps) {
  return (
    <div className="mb-10 flex items-end justify-center gap-4">
      <PodiumPlace
        entry={second}
        avatarClassName="h-16 w-16 border-4 border-gray-300"
        fallbackClassName="bg-gray-100 text-lg font-bold text-gray-600"
        icon={<Medal className="mx-auto h-6 w-6 text-gray-400" />}
        standClassName="h-20 bg-gray-200"
      />
      <PodiumPlace
        entry={first}
        avatarClassName="h-20 w-20 border-4 border-yellow-400 ring-4 ring-yellow-100"
        fallbackClassName="bg-yellow-50 text-xl font-bold text-yellow-700"
        icon={<Crown className="mx-auto h-7 w-7 text-yellow-500" />}
        standClassName="h-28 bg-yellow-200"
      />
      <PodiumPlace
        entry={third}
        avatarClassName="h-16 w-16 border-4 border-amber-500"
        fallbackClassName="bg-amber-50 text-lg font-bold text-amber-700"
        icon={<Medal className="mx-auto h-6 w-6 text-amber-600" />}
        standClassName="h-16 bg-amber-200"
      />
    </div>
  )
}

interface PodiumPlaceProps {
  entry: PublicProfile
  avatarClassName: string
  fallbackClassName: string
  icon: ReactNode
  standClassName: string
}

function PodiumPlace({ entry, avatarClassName, fallbackClassName, icon, standClassName }: PodiumPlaceProps) {
  return (
    <div className="flex flex-col items-center">
      <Avatar className={avatarClassName}>
        <AvatarFallback className={fallbackClassName}>{getInitials(entry.full_name)}</AvatarFallback>
      </Avatar>
      <div className="mt-2 text-center">
        {icon}
        <p className="text-sm font-bold text-level-purple-dark">{entry.full_name.split(" ")[0]}</p>
        <p className="text-xs text-muted-foreground">{formatXp(entry.total_xp)}</p>
      </div>
      <div className={cn("mt-2 w-24 rounded-t-xl", standClassName)} />
    </div>
  )
}

function LeaderboardTable({ users }: { users: readonly PublicProfile[] }) {
  const { profile } = useAuth()
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white">
      <div className={cn(
        ROW_GRID_CLASS,
        "border-b border-border bg-muted/50 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground",
      )}>
        <span>#</span>
        <span>Estudante</span>
        <span className="text-right">XP<span className="hidden sm:inline"> Total</span></span>
        <span className="text-right">
          <span className="sm:hidden" aria-hidden="true">Seq.</span>
          <span className="sr-only sm:not-sr-only">Sequência</span>
        </span>
      </div>

      {users.map((entry, index) => {
        const isCurrentUser = profile?.id === entry.id
        return (
          <Link
            key={entry.id}
            href={ROUTES.profile(entry.username)}
            className={cn(
              ROW_GRID_CLASS,
              "items-center py-3 transition-colors hover:bg-level-purple-subtle/50",
              isCurrentUser ? "border-l-4 border-level-purple bg-level-purple-light/50" : "border-b border-border",
            )}
          >
            <div className="flex h-8 w-8 items-center justify-center">
              <RankIcon rank={index + 1} />
            </div>

            <div className="flex min-w-0 items-center gap-3">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback
                  className={cn(
                    "text-xs font-bold",
                    isCurrentUser ? "bg-level-purple text-white" : "bg-level-purple-light text-level-purple-dark",
                  )}
                >
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
              <span className="text-sm font-semibold text-level-purple-dark">{formatNumber(entry.total_xp)}</span>
            </div>

            <div className="flex items-center justify-end gap-1">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">{entry.current_streak}</span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
