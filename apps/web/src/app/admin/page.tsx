"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertTriangle, Loader2, ShieldAlert } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { AdminConsole } from "@/components/admin/admin-console"
import { useAdminDashboard } from "@/components/admin/use-admin-dashboard"
import { ROUTES } from "@/lib/constants"

const NOT_ADMIN_MESSAGE = "Sua conta não tem permissão para acessar o painel administrativo."

export default function AdminPage(): React.JSX.Element {
  // "Tentar novamente" remonta a tela: a busca recomeça do estado de carregamento.
  const [attempt, setAttempt] = useState(0)
  return <AdminScreen key={attempt} onRetry={() => setAttempt((previous) => previous + 1)} />
}

interface AdminScreenProps {
  onRetry: () => void
}

function AdminScreen({ onRetry }: AdminScreenProps): React.JSX.Element {
  const router = useRouter()
  const { profile, isLoading: isAuthLoading } = useAuth()
  const profileId = profile?.id
  const isAdmin = profile?.role === "admin"
  // A guarda no front só evita uma tela quebrada; quem autoriza é a API (403).
  const { resource, courses, updateUsers, updateLessons } = useAdminDashboard(!isAuthLoading && isAdmin)

  useEffect(() => {
    if (!isAuthLoading && !profileId) router.replace(ROUTES.login)
  }, [isAuthLoading, profileId, router])

  if (!isAuthLoading && profile && !isAdmin) return <RestrictedAccess message={NOT_ADMIN_MESSAGE} />
  if (resource.status === "success" && resource.data?.access === "denied") return <RestrictedAccess message={resource.data.message} />
  if (resource.status === "error") return <DashboardLoadError message={resource.error} onRetry={onRetry} />
  if (!profile || resource.status !== "success" || resource.data?.access !== "granted") return <DashboardLoading />

  return (
    <AdminConsole
      dashboard={resource.data.dashboard}
      courses={courses}
      profile={profile}
      updateUsers={updateUsers}
      updateLessons={updateLessons}
    />
  )
}

interface RestrictedAccessProps {
  message: string
}

function RestrictedAccess({ message }: RestrictedAccessProps): React.JSX.Element {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-white px-6 text-center">
      <ShieldAlert className="h-16 w-16 text-muted-foreground/30" />
      <h2 className="text-lg font-semibold text-level-purple-dark">Acesso restrito a administradores</h2>
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
      <Link
        href={ROUTES.dashboard}
        className="rounded-xl bg-level-purple px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-level-purple-dark"
      >
        Voltar ao painel
      </Link>
    </div>
  )
}

interface DashboardLoadErrorProps {
  message: string
  onRetry: () => void
}

function DashboardLoadError({ message, onRetry }: DashboardLoadErrorProps): React.JSX.Element {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <AlertTriangle className="h-10 w-10 text-amber-500" />
      <p className="text-sm font-semibold text-level-purple-dark">Não foi possível carregar o painel</p>
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
      <button
        onClick={onRetry}
        className="rounded-xl bg-level-purple px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-level-purple-dark"
      >
        Tentar novamente
      </button>
    </div>
  )
}

function DashboardLoading(): React.JSX.Element {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-level-purple" />
      <p className="text-sm text-muted-foreground">Carregando painel admin...</p>
    </div>
  )
}
