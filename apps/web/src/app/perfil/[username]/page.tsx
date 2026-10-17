"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import type { ActivityDay, MyCertificate, PublicProfile } from "@levelusp/contracts"
import {
  certificatePdfUrl,
  fetchBadges,
  fetchMyCertificates,
  fetchProfileByUsername,
  fetchUserActivity,
  fetchUserBadges,
  isAbortError,
} from "@/lib/api"
import { swalToast } from "@/lib/swal"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Trophy, Zap, Flame, Settings, ChevronLeft, Calendar, BookOpen, Share2, Edit3, User, Rocket, Loader2, Award,
  Download,
} from "lucide-react"
import { StatCard } from "@/components/profile/stat-card"
import { ActivityMap } from "@/components/profile/activity-map"
import { BadgesSection, type DisplayBadge } from "@/components/profile/badges-section"
import { computeLevelProgress, formatDate, formatNumber, formatPercent, formatXp, getInitials } from "@/lib/utils"
import { ROUTES } from "@/lib/constants"

export default function ProfilePage() {
  const params = useParams()
  const router = useRouter()
  const username = params.username as string
  const { profile: currentUser, isLoading: authLoading } = useAuth()

  const [user, setUser] = React.useState<PublicProfile | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [activityData, setActivityData] = React.useState<ActivityDay[]>([])
  const [badges, setBadges] = React.useState<DisplayBadge[]>([])
  const [certificates, setCertificates] = React.useState<MyCertificate[]>([])

  const isOwnProfile = username === "me" || username === currentUser?.username

  // Compartilhamento nativo no celular; nos demais, copia o link do perfil.
  const handleShare = async () => {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: "Perfil no LevelUSP", url })
        return
      }
      await navigator.clipboard.writeText(url)
      swalToast({ title: "Link do perfil copiado!", icon: "success" })
    } catch (error) {
      if (!isAbortError(error)) swalToast({ title: "Não foi possível copiar o link.", icon: "error" })
    }
  }

  const currentUsername = currentUser?.username
  const currentUserId = currentUser?.id

  // Certificados só do próprio usuário (a API usa a sessão)
  React.useEffect(() => {
    if (!isOwnProfile || !currentUserId) return
    let cancelled = false
    fetchMyCertificates()
      .then((certs) => { if (!cancelled) setCertificates(certs) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [isOwnProfile, currentUserId])

  React.useEffect(() => {
    if (authLoading) return

    async function load() {
      setLoading(true)

      let resolvedUser: PublicProfile | null = null

      if (username === "me") {
        if (!currentUser) {
          router.replace(ROUTES.loginWithNext(ROUTES.profile()))
          return
        }
        resolvedUser = currentUser
      } else if (currentUsername && username === currentUsername) {
        resolvedUser = currentUser
      } else {
        resolvedUser = await fetchProfileByUsername(username).catch(() => null)
      }

      setUser(resolvedUser)
      setLoading(false)

      if (resolvedUser) {
        fetchUserActivity(resolvedUser.id)
          .then(setActivityData)
          .catch(() => setActivityData([]))

        // Badges: catálogo + conquistas do dono do perfil (públicas)
        Promise.all([fetchBadges(), fetchUserBadges(resolvedUser.id)])
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
        <h2 className="text-lg font-semibold text-level-purple-dark">Perfil não encontrado</h2>
        <p className="text-sm text-muted-foreground">O usuário @{username} não existe.</p>
        <button
          onClick={() => router.push(ROUTES.dashboard)}
          className="rounded-xl bg-level-purple px-6 py-2.5 text-sm font-semibold text-white hover:bg-level-purple-dark transition-colors"
        >
          Voltar ao painel
        </button>
      </div>
    )
  }

  const level = user.level
  const totalXp = user.total_xp
  const { xpInLevel, xpLevelRange, levelPercent: progressToNextLevel } = computeLevelProgress(totalXp, level)

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="icon" className="hover:bg-level-purple-light">
              <Link href={ROUTES.dashboard} aria-label="Voltar ao painel">
                <ChevronLeft className="h-5 w-5 text-level-purple" />
              </Link>
            </Button>
            <Link href={ROUTES.dashboard} className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-level-purple">
                <Rocket className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-level-purple-dark">LevelUSP</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="hover:bg-level-purple-light" onClick={handleShare} aria-label="Compartilhar perfil">
              <Share2 className="h-5 w-5 text-muted-foreground" />
            </Button>
            {isOwnProfile && (
              <Button asChild variant="ghost" size="icon" className="hover:bg-level-purple-light">
                <Link href={ROUTES.settings} aria-label="Configurações">
                  <Settings className="h-5 w-5 text-muted-foreground" />
                </Link>
              </Button>
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
                <span className="whitespace-nowrap text-sm font-bold text-white">Nível {level}</span>
              </div>

              {isOwnProfile && (
                <Link
                  href={ROUTES.settings}
                  aria-label="Editar perfil"
                  className="absolute -right-1 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md transition-colors hover:bg-level-purple-light"
                >
                  <Edit3 className="h-4 w-4 text-level-purple" />
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
                    Membro desde {formatDate(user.created_at, "monthYear")}
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-orange-50 px-4 py-2">
                  <Flame className="h-4 w-4 text-orange-600" />
                  <span className="text-sm text-orange-800">
                    {user.current_streak} {user.current_streak === 1 ? "dia" : "dias"} de sequência
                  </span>
                </div>
              </div>

              <div className="mt-6 max-w-md">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progresso para o Nível {level + 1}</span>
                  <span className="font-medium text-level-purple">
                    {formatNumber(xpInLevel)}/{formatXp(xpLevelRange)}
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
          <StatCard label="Nível Atual" value={level} icon={Trophy} iconColor="text-level-purple" />
          <StatCard label="Total XP" value={formatNumber(totalXp)} icon={Zap} iconColor="text-yellow-500" />
          <StatCard label="Maior sequência" value={`${user.max_streak} dias`} icon={Flame} iconColor="text-orange-500" />
          <StatCard label="Lições concluídas" value={user.lessons_completed} icon={BookOpen} iconColor="text-success" />
        </section>

        {/* Activity Map */}
        <section className="mb-8">
          <ActivityMap data={activityData} />
        </section>

        {/* Meus certificados (apenas o próprio usuário) */}
        {isOwnProfile && (
          <section className="mb-8">
            <div className="rounded-2xl border border-border bg-white p-6">
              <div className="mb-4 flex items-center gap-2">
                <Award className="h-5 w-5 text-level-purple" />
                <h2 className="text-lg font-bold text-level-purple-dark">Meus certificados</h2>
              </div>
              {certificates.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Conclua um curso com prova final para ganhar seu primeiro certificado. 🎓
                </p>
              ) : (
                <div className="space-y-3">
                  {certificates.map((cert) => (
                    <div
                      key={cert.verification_code}
                      className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-level-purple-dark truncate">{cert.course_title}</p>
                        <p className="text-xs text-muted-foreground">
                          Emitido em {formatDate(cert.issued_at, "long")}
                          {" · "}Prova: {formatPercent(cert.exam_score)}
                          {" · "}Código: <span className="font-mono">{cert.verification_code}</span>
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Link
                          href={ROUTES.certificate(cert.verification_code)}
                          className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-level-purple hover:bg-level-purple-subtle transition-colors"
                        >
                          Verificar
                        </Link>
                        <a
                          href={certificatePdfUrl(cert.verification_code)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 rounded-lg bg-level-purple px-3 py-1.5 text-xs font-semibold text-white hover:bg-level-purple-dark transition-colors"
                        >
                          <Download className="h-3 w-3" />
                          PDF
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Badges Section */}
        <section className="mb-8">
          <BadgesSection badges={badges} />
        </section>
      </main>
    </div>
  )
}
