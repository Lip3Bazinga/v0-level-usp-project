"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { createClient } from "@/lib/supabase/client"
import type { Profile } from "@/lib/supabase/types"
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
  User,
  Rocket,
  Loader2,
} from "lucide-react"
import { StatCard } from "@/components/profile/stat-card"
import { ActivityMap } from "@/components/profile/activity-map"
import type { ActivityDay } from "@/components/profile/activity-map"
import { BadgesSection, type DisplayBadge } from "@/components/profile/badges-section"
import { fetchUserActivity } from "@/lib/supabase/lessons"
import { fetchAllBadges, fetchUserBadges } from "@/lib/supabase/badges"

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("")
}

function xpForLevel(level: number) { return level * 1000 }

export default function ProfilePage() {
  const params = useParams()
  const router = useRouter()
  const username = params.username as string
  const { profile: currentUser, isLoading: authLoading } = useAuth()

  const [user, setUser] = React.useState<Profile | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [activityData, setActivityData] = React.useState<ActivityDay[]>([])
  const [badges, setBadges] = React.useState<DisplayBadge[]>([])

  const isOwnProfile = username === "me" || username === currentUser?.username

  const currentUsername = currentUser?.username
  const currentUserId = currentUser?.id
  React.useEffect(() => {
    if (authLoading) return

    async function load() {
      setLoading(true)

      let resolvedUser: Profile | null = null

      if (username === "me") {
        if (!currentUser) {
          router.replace("/login?redirect=/perfil/me")
          return
        }
        resolvedUser = currentUser
      } else if (currentUsername && username === currentUsername) {
        resolvedUser = currentUser
      } else {
        const supabase = createClient()
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("username", username)
          .maybeSingle()
        resolvedUser = data ? (data as Profile) : null
      }

      setUser(resolvedUser)
      setLoading(false)

      if (resolvedUser) {
        fetchUserActivity(resolvedUser.id)
          .then(setActivityData)
          .catch(() => setActivityData([]))

        // Badges: catálogo + conquistas do dono do perfil (públicas)
        Promise.all([fetchAllBadges(), fetchUserBadges(resolvedUser.id)])
          .then(([catalog, earned]) => {
            const earnedMap = new Map(earned.map((e) => [e.badge_id, e.earned_at]))
            setBadges(
              catalog.map((b) => ({
                ...b,
                isEarned: earnedMap.has(b.id),
                earnedAt: earnedMap.has(b.id) ? new Date(earnedMap.get(b.id)!) : undefined,
              })),
            )
          })
          .catch(() => setBadges([]))
      }
    }
    load()
  // currentUsername e currentUserId são primitivos — não causam re-execução
  // desnecessária quando o objeto currentUser é recriado.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, currentUsername, currentUserId, authLoading, router])

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-white">
        <Loader2 className="h-10 w-10 animate-spin text-level-purple" />
        <p className="text-sm text-muted-foreground">Carregando perfil...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-white">
        <User className="h-16 w-16 text-muted-foreground/30" />
        <h2 className="text-lg font-semibold text-level-purple-dark">Perfil nao encontrado</h2>
        <p className="text-sm text-muted-foreground">O usuario @{username} nao existe.</p>
        <button
          onClick={() => router.push("/dashboard")}
          className="rounded-xl bg-level-purple px-6 py-2.5 text-sm font-semibold text-white hover:bg-level-purple-dark transition-colors"
        >
          Voltar ao Dashboard
        </button>
      </div>
    )
  }

  const level = user.level
  const totalXp = user.total_xp
  const xpFloor = xpForLevel(level - 1)
  const xpCeil = xpForLevel(level)
  const xpInLevel = totalXp - xpFloor
  const progressToNextLevel = xpCeil > 0 ? Math.min(100, Math.round((xpInLevel / xpCeil) * 100)) : 0

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" className="hover:bg-level-purple-light">
                <ChevronLeft className="h-5 w-5 text-level-purple" />
              </Button>
            </Link>
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-level-purple">
                <Rocket className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-level-purple-dark">LevelUSP</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="hover:bg-level-purple-light">
              <Share2 className="h-5 w-5 text-muted-foreground" />
            </Button>
            {isOwnProfile && (
              <Link href="/settings">
                <Button variant="ghost" size="icon" className="hover:bg-level-purple-light">
                  <Settings className="h-5 w-5 text-muted-foreground" />
                </Button>
              </Link>
            )}
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
                <AvatarImage src={user.avatar_url ?? ""} alt={user.full_name} />
                <AvatarFallback className="bg-level-purple-light text-3xl font-bold text-level-purple-dark">
                  {getInitials(user.full_name)}
                </AvatarFallback>
              </Avatar>

              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-level-purple px-4 py-1 shadow-lg">
                <span className="text-sm font-bold text-white">Nivel {level}</span>
              </div>

              {isOwnProfile && (
                <Link href="/settings">
                  <button className="absolute -right-1 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md transition-colors hover:bg-level-purple-light">
                    <Edit3 className="h-4 w-4 text-level-purple" />
                  </button>
                </Link>
              )}
            </div>

            {/* User Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="mb-1 text-2xl font-bold text-level-purple-dark">{user.full_name}</h1>
              <p className="mb-3 text-muted-foreground">@{user.username}</p>
              {user.bio && <p className="mb-4 max-w-xl text-sm text-foreground">{user.bio}</p>}

              <div className="flex flex-wrap items-center justify-center gap-4 md:justify-start">
                <div className="flex items-center gap-2 rounded-full bg-level-purple-light px-4 py-2">
                  <Calendar className="h-4 w-4 text-level-purple" />
                  <span className="text-sm text-level-purple-dark">
                    Membro desde {new Date(user.created_at).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-success/10 px-4 py-2">
                  <Flame className="h-4 w-4 text-success" />
                  <span className="text-sm text-success">
                    {user.current_streak} dias de streak
                  </span>
                </div>
              </div>

              <div className="mt-6 max-w-md">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progresso para o Nivel {level + 1}</span>
                  <span className="font-medium text-level-purple">
                    {xpInLevel.toLocaleString("pt-BR")}/{xpCeil.toLocaleString("pt-BR")} XP
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-level-purple-subtle">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-level-purple to-level-purple-medium transition-all duration-500"
                    style={{ width: `${progressToNextLevel}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Cards */}
        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Nivel Atual" value={level} icon={Trophy} iconColor="text-level-purple" />
          <StatCard label="Total XP" value={totalXp.toLocaleString("pt-BR")} icon={Zap} iconColor="text-yellow-500" />
          <StatCard label="Maior Streak" value={`${user.max_streak} dias`} icon={Flame} iconColor="text-orange-500" />
          <StatCard label="Licoes Completas" value={user.lessons_completed} icon={BookOpen} iconColor="text-success" />
        </section>

        {/* Activity Map */}
        <section className="mb-8">
          <ActivityMap data={activityData} />
        </section>

        {/* Badges Section */}
        <section className="mb-8">
          <BadgesSection badges={badges} />
        </section>
      </main>
    </div>
  )
}
