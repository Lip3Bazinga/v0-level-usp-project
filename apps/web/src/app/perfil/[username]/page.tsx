"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Trophy, Zap, Flame, Settings, ChevronLeft, Calendar, BookOpen, Share2, Edit3, User, Loader2, Award, Download } from "lucide-react"
import type { ActivityDay, MyCertificate, PublicProfile } from "@levelusp/contracts"
import { useAuth } from "@/contexts/auth-context"
import { useAsyncResource } from "@/hooks/use-async-resource"
import {
  certificatePdfUrl,
  fetchBadges,
  fetchMyCertificates,
  fetchProfileByUsername,
  fetchUserActivity,
  fetchUserBadges,
  isAbortError,
} from "@/lib/api"
import { ROUTES } from "@/lib/constants"
import { swalToast } from "@/lib/swal"
import { computeLevelProgress, formatDate, formatNumber, formatPercent, formatXp, getInitials } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { BrandLogo } from "@/components/design-system/brand-logo"
import { StudentHeaderBar } from "@/components/dashboard/student-shell"
import { StatCard } from "@/components/profile/stat-card"
import { ActivityMap } from "@/components/profile/activity-map"
import { BadgesSection } from "@/components/profile/badges-section"
import { toDisplayBadges, type DisplayBadge } from "@/components/profile/display-badges"

/** Rota do próprio perfil quando o username ainda não é conhecido. */
const OWN_PROFILE_SLUG = "me"
const NO_ACTIVITY: ActivityDay[] = []
const NO_BADGES: DisplayBadge[] = []
const NO_CERTIFICATES: MyCertificate[] = []

/** Compartilhamento nativo no celular; nos demais, copia o link do perfil. */
async function shareProfileLink(): Promise<void> {
  const url = window.location.href
  try {
    if (typeof navigator.share === "function") {
      await navigator.share({ title: "Perfil no LevelUSP", url })
      return
    }
    await navigator.clipboard.writeText(url)
    swalToast({ title: "Link do perfil copiado!", icon: "success" })
  } catch (error) {
    if (!isAbortError(error)) swalToast({ title: "Não foi possível copiar o link.", icon: "error" })
  }
}

async function loadDisplayBadges(userId: string): Promise<DisplayBadge[]> {
  const [catalog, earnedBadges] = await Promise.all([fetchBadges(), fetchUserBadges(userId)])
  return toDisplayBadges(catalog, earnedBadges)
}
interface UseDisplayedProfileResult {
  user: PublicProfile | null
  isLoading: boolean
  isOwnProfile: boolean
  currentUserId: string | undefined
}

/** Perfil exibido: o do usuário logado vem da sessão; o de outra pessoa, da API. */
function useDisplayedProfile(username: string): UseDisplayedProfileResult {
  const router = useRouter()
  const { profile: currentUser, isLoading: isAuthLoading } = useAuth()
  const isOwnProfile = username === OWN_PROFILE_SLUG || username === currentUser?.username
  const shouldFetch = !isAuthLoading && !isOwnProfile
  const otherProfile = useAsyncResource(
    () => (shouldFetch ? fetchProfileByUsername(username).catch(() => null) : Promise.resolve(null)),
    [username, shouldFetch],
  )
  const isSignedOutOnOwnProfile = !isAuthLoading && username === OWN_PROFILE_SLUG && !currentUser

  useEffect(() => {
    if (isSignedOutOnOwnProfile) router.replace(ROUTES.loginWithNext(ROUTES.profile()))
  }, [isSignedOutOnOwnProfile, router])

  const user: PublicProfile | null = isOwnProfile ? (currentUser ?? null) : otherProfile.status === "success" ? otherProfile.data : null
  const isLoading = isAuthLoading || isSignedOutOnOwnProfile || (shouldFetch && otherProfile.status === "loading")
  return { user, isLoading, isOwnProfile, currentUserId: currentUser?.id }
}

export default function ProfilePage(): React.JSX.Element {
  const { username } = useParams<{ username: string }>()
  const router = useRouter()
  const { user, isLoading, isOwnProfile, currentUserId } = useDisplayedProfile(username)
  const userId = user?.id

  const activity = useAsyncResource(
    () => (userId ? fetchUserActivity(userId).catch(() => NO_ACTIVITY) : Promise.resolve(NO_ACTIVITY)),
    [userId],
  )
  const badges = useAsyncResource(
    () => (userId ? loadDisplayBadges(userId).catch(() => NO_BADGES) : Promise.resolve(NO_BADGES)),
    [userId],
  )
  // Certificados só do próprio usuário (a API usa a sessão).
  const canSeeCertificates = isOwnProfile && Boolean(currentUserId)
  const certificates = useAsyncResource(
    () => (canSeeCertificates ? fetchMyCertificates().catch(() => NO_CERTIFICATES) : Promise.resolve(NO_CERTIFICATES)),
    [canSeeCertificates],
  )

  if (isLoading) {
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
          className="rounded-xl bg-level-purple px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-level-purple-dark"
        >
          Voltar ao painel
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <StudentHeaderBar>
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon" className="hover:bg-level-purple-light">
            <Link href={ROUTES.dashboard} aria-label="Voltar ao painel">
              <ChevronLeft className="h-5 w-5 text-level-purple" />
            </Link>
          </Button>
          <BrandLogo href={ROUTES.dashboard} size="sm" />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="hover:bg-level-purple-light" onClick={() => void shareProfileLink()} aria-label="Compartilhar perfil">
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
      </StudentHeaderBar>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <ProfileHeroSection user={user} isOwnProfile={isOwnProfile} />

        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Nível Atual" value={user.level} icon={Trophy} iconColor="text-level-purple" />
          <StatCard label="Total XP" value={formatNumber(user.total_xp)} icon={Zap} iconColor="text-yellow-500" />
          <StatCard label="Maior sequência" value={`${user.max_streak} dias`} icon={Flame} iconColor="text-orange-500" />
          <StatCard label="Lições concluídas" value={user.lessons_completed} icon={BookOpen} iconColor="text-success" />
        </section>

        <section className="mb-8">
          <ActivityMap data={activity.status === "success" ? activity.data : NO_ACTIVITY} />
        </section>

        {isOwnProfile && (
          <section className="mb-8">
            <CertificatesSection certificates={certificates.status === "success" ? certificates.data : NO_CERTIFICATES} />
          </section>
        )}

        <section className="mb-8">
          <BadgesSection badges={badges.status === "success" ? badges.data : NO_BADGES} />
        </section>
      </main>
    </div>
  )
}

function ProfileHeroSection({ user, isOwnProfile }: { user: PublicProfile; isOwnProfile: boolean }): React.JSX.Element {
  const { xpInLevel, xpLevelRange, levelPercent } = computeLevelProgress(user.total_xp, user.level)
  return (
    <section className="mb-8">
      <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
        <div className="relative">
          <Avatar className="h-32 w-32 border-4 border-level-purple ring-4 ring-level-purple-light">
            <AvatarImage src={user.avatar_url ?? ""} alt={user.full_name} />
            <AvatarFallback className="bg-level-purple-light text-3xl font-bold text-level-purple-dark">
              {getInitials(user.full_name)}
            </AvatarFallback>
          </Avatar>

          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-level-purple px-4 py-1 shadow-lg">
            <span className="whitespace-nowrap text-sm font-bold text-white">Nível {user.level}</span>
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

        <div className="flex-1 text-center md:text-left">
          <h1 className="mb-1 text-2xl font-bold text-level-purple-dark">{user.full_name}</h1>
          <p className="mb-3 text-muted-foreground">@{user.username}</p>
          {user.bio && <p className="mb-4 max-w-xl text-sm text-foreground">{user.bio}</p>}

          <div className="flex flex-wrap items-center justify-center gap-4 md:justify-start">
            <div className="flex items-center gap-2 rounded-full bg-level-purple-light px-4 py-2">
              <Calendar className="h-4 w-4 text-level-purple" />
              <span className="text-sm text-level-purple-dark">Membro desde {formatDate(user.created_at, "monthYear")}</span>
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
              <span className="text-muted-foreground">Progresso para o Nível {user.level + 1}</span>
              <span className="font-medium text-level-purple">
                {formatNumber(xpInLevel)}/{formatXp(xpLevelRange)}
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-level-purple-subtle">
              <div
                className="h-full rounded-full bg-linear-to-r from-level-purple to-level-purple-medium transition-all duration-500"
                style={{ width: `${levelPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function CertificatesSection({ certificates }: { certificates: readonly MyCertificate[] }): React.JSX.Element {
  return (
    <div className="rounded-2xl border border-border bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <Award className="h-5 w-5 text-level-purple" />
        <h2 className="text-lg font-bold text-level-purple-dark">Meus certificados</h2>
      </div>
      {certificates.length === 0 ? (
        <p className="text-sm text-muted-foreground">Conclua um curso com prova final para ganhar seu primeiro certificado. 🎓</p>
      ) : (
        <div className="space-y-3">
          {certificates.map((certificate) => (
            <div key={certificate.verification_code} className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-level-purple-dark">{certificate.course_title}</p>
                <p className="text-xs text-muted-foreground">
                  Emitido em {formatDate(certificate.issued_at, "long")}
                  {" · "}Prova: {formatPercent(certificate.exam_score)}
                  {" · "}Código: <span className="font-mono">{certificate.verification_code}</span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href={ROUTES.certificate(certificate.verification_code)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-level-purple transition-colors hover:bg-level-purple-subtle"
                >
                  Verificar
                </Link>
                <a
                  href={certificatePdfUrl(certificate.verification_code)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-lg bg-level-purple px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-level-purple-dark"
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
  )
}
