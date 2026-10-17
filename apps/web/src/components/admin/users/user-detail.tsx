"use client"

import { useState } from "react"
import {
  Activity, AlertTriangle, Award, Ban, BookOpen, CheckCircle2, ChevronLeft, ChevronRight, Download, Flame, Key, Loader2,
  LogOut, RefreshCw, Shield, Trash2, Trophy, Zap, type LucideIcon,
} from "lucide-react"
import type { Badge, Profile } from "@levelusp/contracts"
import { BadgeIcon } from "@/components/design-system/badge-icon"
import { RoleBadge } from "@/components/ui/badges"
import { useAsyncResource } from "@/hooks/use-async-resource"
import {
  deleteUser, fetchBadges, fetchUserBadges, fetchUserDataExport, getErrorMessage, invalidateSessions, resetUserProgress,
  sendPasswordReset, setUserSuspended,
} from "@/lib/api"
import type { OnToast } from "@/lib/types"
import { cn, formatDate, formatNumber, formatTimeAgo, indexBy, todayKey } from "@/lib/utils"
import { AdminModal, ModalCancelButton } from "../admin-modal"
import type { ListUpdate } from "../use-admin-dashboard"
import { UserAvatar } from "./user-avatar"

const VISIBLE_BADGE_COUNT = 8

const DOTTED_BACKGROUND = {
  backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)",
  backgroundSize: "18px 18px",
}

type ActionTone = "info" | "warning" | "danger"
type UserActionId = "reset-password" | "suspend" | "unsuspend" | "end-sessions" | "reset-progress" | "export" | "delete"

interface UserAction {
  id: UserActionId
  label: string
  description: string
  icon: LucideIcon
  tone: ActionTone
}

const ACTION_TONE_CLASSES: Record<ActionTone, { border: string; icon: string }> = {
  info: { border: "border-info/20 hover:bg-info/5", icon: "bg-info/10 text-info" },
  warning: { border: "border-warning/20 hover:bg-warning/5", icon: "bg-warning/10 text-warning" },
  danger: { border: "border-destructive/30 hover:bg-destructive/5", icon: "bg-destructive/10 text-destructive" },
}

const CONFIRM_TONE_CLASSES: Record<ActionTone, string> = {
  info: "bg-level-purple",
  warning: "bg-warning",
  danger: "bg-destructive",
}

/** Ações do painel do usuário; suspender e reativar se alternam conforme o estado da conta. */
function userActions(isSuspended: boolean): UserAction[] {
  return [
    { id: "reset-password", label: "Enviar reset de senha", icon: Key, tone: "info", description: "Envia e-mail com link de redefinição" },
    isSuspended
      ? { id: "unsuspend", label: "Reativar conta", icon: CheckCircle2, tone: "info", description: "Libera o login novamente" }
      : { id: "suspend", label: "Suspender conta", icon: Ban, tone: "warning", description: "Bloqueia o login e encerra as sessões" },
    { id: "end-sessions", label: "Encerrar sessões", icon: LogOut, tone: "info", description: "Desconecta o usuário de todos os dispositivos" },
    { id: "reset-progress", label: "Resetar progresso", icon: RefreshCw, tone: "warning", description: "Zera XP, nível e lições" },
    { id: "export", label: "Exportar dados (LGPD)", icon: Download, tone: "info", description: "Baixa um JSON com todos os dados" },
    { id: "delete", label: "Excluir conta permanentemente", icon: Trash2, tone: "danger", description: "Remove conta e progresso" },
  ]
}

const RESET_PROGRESS: Pick<Profile, "total_xp" | "level" | "lessons_completed" | "current_streak" | "max_streak" | "courses_completed"> = {
  total_xp: 0,
  level: 1,
  lessons_completed: 0,
  current_streak: 0,
  max_streak: 0,
  courses_completed: 0,
}

/** Baixa um objeto como arquivo JSON. */
function downloadJson(data: unknown, filename: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }))
  const link = Object.assign(document.createElement("a"), { href: url, download: filename })
  link.click()
  URL.revokeObjectURL(url)
}

interface EarnedBadge {
  badge: Badge
  earnedAt: string
}

/** Badges do usuário, das mais recentes para as mais antigas; falha na busca mostra a lista vazia. */
async function loadEarnedBadges(userId: string): Promise<EarnedBadge[]> {
  try {
    const [userBadges, catalog] = await Promise.all([fetchUserBadges(userId), fetchBadges()])
    const badgesById = indexBy(catalog, (badge) => badge.id)
    return userBadges
      .flatMap((userBadge) => {
        const badge = badgesById.get(userBadge.badge_id)
        return badge ? [{ badge, earnedAt: userBadge.earned_at }] : []
      })
      .sort((first, second) => second.earnedAt.localeCompare(first.earnedAt))
  } catch {
    return []
  }
}

interface UserDetailProps {
  user: Profile
  users: Profile[]
  updateUsers: ListUpdate<Profile>
  onBack: () => void
  onToast: OnToast
}

export function UserDetail({ user, users, updateUsers, onBack, onToast }: UserDetailProps) {
  const [tab, setTab] = useState<"overview" | "actions">("overview")
  const [pendingAction, setPendingAction] = useState<UserAction | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const earnedBadges = useAsyncResource(() => loadEarnedBadges(user.id), [user.id])
  const current = users.find((item) => item.id === user.id) ?? user
  const actions = userActions(current.suspended)

  const replaceUser = (updated: Profile) => updateUsers((list) => list.map((item) => (item.id === updated.id ? updated : item)))

  const actionHandlers: Record<UserActionId, () => Promise<void>> = {
    "reset-password": async () => {
      await sendPasswordReset(current.id)
      onToast("E-mail de redefinição enviado", "success")
    },
    suspend: async () => {
      replaceUser(await setUserSuspended(current.id, true))
      onToast("Conta suspensa", "warning")
    },
    unsuspend: async () => {
      replaceUser(await setUserSuspended(current.id, false))
      onToast("Conta reativada", "success")
    },
    "end-sessions": async () => {
      await invalidateSessions(current.id)
      onToast("Sessões encerradas", "success")
    },
    "reset-progress": async () => {
      await resetUserProgress(current.id)
      updateUsers((list) => list.map((item) => (item.id === current.id ? { ...item, ...RESET_PROGRESS } : item)))
      onToast("Progresso zerado", "success")
    },
    export: async () => {
      const data = await fetchUserDataExport(current.id)
      downloadJson(data, `lgpd-${current.username ?? current.id}-${todayKey()}.json`)
      onToast("Arquivo LGPD gerado", "success")
    },
    delete: async () => {
      await deleteUser(current.id)
      updateUsers((list) => list.filter((item) => item.id !== current.id))
      onToast("Conta excluída", "danger")
      onBack()
    },
  }

  const handleConfirm = async (action: UserAction) => {
    setIsBusy(true)
    try {
      await actionHandlers[action.id]()
    } catch (error) {
      onToast(getErrorMessage(error, "Erro ao executar ação"), "danger")
    } finally {
      setIsBusy(false)
      setPendingAction(null)
    }
  }

  return (
    <div className="space-y-5 p-6">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-level-purple">
        <ChevronLeft className="h-3.5 w-3.5" /> Voltar para usuários
      </button>

      <UserProfileCard user={current} />

      <div className="flex items-center gap-0 border-b border-border">
        {[
          { id: "overview" as const, label: "Visão geral" },
          { id: "actions" as const, label: "Ações admin" },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              "border-b-2 px-4 py-2.5 text-sm font-bold transition-colors",
              tab === item.id ? "border-level-purple text-level-purple" : "border-transparent text-muted-foreground hover:text-level-purple",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <EarnedBadgesCard earnedBadges={earnedBadges.status === "success" ? earnedBadges.data : null} />}

      {tab === "actions" && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4 text-level-purple" />
              <p className="text-sm font-extrabold text-level-purple-dark">Ações administrativas</p>
            </div>
            <div className="space-y-2">
              {actions
                .filter((action) => action.tone !== "danger")
                .map((action) => (
                  <RegularActionButton key={action.id} action={action} onSelect={() => setPendingAction(action)} />
                ))}
            </div>
          </div>

          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <p className="text-sm font-extrabold text-destructive">Zona de perigo</p>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">Ações irreversíveis. Todas requerem confirmação.</p>
            {actions
              .filter((action) => action.tone === "danger")
              .map((action) => (
                <DangerActionButton key={action.id} action={action} onSelect={() => setPendingAction(action)} />
              ))}
          </div>
        </div>
      )}

      {pendingAction && (
        <AdminModal
          title={pendingAction.label}
          icon={<AlertTriangle className="h-5 w-5" />}
          onClose={() => setPendingAction(null)}
          footer={
            <>
              <ModalCancelButton onClick={() => setPendingAction(null)} disabled={isBusy} />
              <button
                onClick={() => handleConfirm(pendingAction)}
                disabled={isBusy}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-50",
                  CONFIRM_TONE_CLASSES[pendingAction.tone],
                )}
              >
                {isBusy && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirmar ação
              </button>
            </>
          }
        >
          <p className="text-sm text-foreground">
            Você está prestes a executar <b>{pendingAction.label.toLowerCase()}</b> em <b>{current.full_name}</b>.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">Esta ação será registrada no log de auditoria com seu nome e data/hora.</p>
        </AdminModal>
      )}
    </div>
  )
}

interface UserProfileCardProps {
  user: Profile
}

function UserProfileCard({ user }: UserProfileCardProps) {
  const stats = [
    { icon: Trophy, label: "Nível", value: String(user.level), colorClass: "bg-warning/10 text-warning" },
    { icon: Zap, label: "XP", value: formatNumber(user.total_xp), colorClass: "bg-level-purple-light text-level-purple" },
    { icon: Flame, label: "Streak", value: `${user.current_streak}d`, colorClass: "bg-warning/10 text-warning" },
    { icon: BookOpen, label: "Lições", value: String(user.lessons_completed), colorClass: "bg-info/10 text-info" },
    { icon: Activity, label: "Cadastro", value: formatDate(user.created_at), colorClass: "bg-success/10 text-success", isSmall: true },
  ]

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-white">
      <div className="relative h-28 bg-linear-to-br from-level-purple-dark via-level-purple to-level-purple-medium">
        <div className="absolute inset-0 opacity-30" style={DOTTED_BACKGROUND} />
      </div>
      <div className="relative px-6 pb-6">
        <div className="-mt-12 flex items-end gap-4">
          <div className="rounded-2xl bg-white p-1.5 shadow-sm">
            <UserAvatar name={user.full_name} role={user.role} sizePx={88} />
          </div>
          <div className="min-w-0 flex-1 pb-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-extrabold text-level-purple-dark">{user.full_name}</h2>
              <RoleBadge role={user.role} />
              {user.suspended && <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-bold text-warning">Suspensa</span>}
            </div>
            <p className="text-sm text-muted-foreground">
              {user.username ? `@${user.username} · ` : ""}
              {user.email}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Ingressou em {formatDate(user.created_at, "long")}</p>
          </div>
          {user.last_login_date && <p className="pb-2 text-xs text-muted-foreground">Último acesso {formatTimeAgo(user.last_login_date)}</p>}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="rounded-xl border border-border p-3">
                <div className={cn("mb-1.5 inline-flex h-8 w-8 items-center justify-center rounded-lg", stat.colorClass)}>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                <p className={cn("font-extrabold text-level-purple-dark", stat.isSmall ? "text-sm" : "text-xl")}>{stat.value}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

interface EarnedBadgesCardProps {
  /** `null` enquanto carrega. */
  earnedBadges: EarnedBadge[] | null
}

function EarnedBadgesCard({ earnedBadges }: EarnedBadgesCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <p className="mb-3 text-sm font-extrabold text-level-purple-dark">Conquistas</p>
      {earnedBadges === null ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-level-purple" />
        </div>
      ) : earnedBadges.length === 0 ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Award className="h-4 w-4 text-muted-foreground/40" /> Nenhuma badge conquistada ainda.
        </p>
      ) : (
        <div className="space-y-2">
          {earnedBadges.slice(0, VISIBLE_BADGE_COUNT).map(({ badge, earnedAt }) => (
            <div key={badge.id} className="flex items-center gap-3 rounded-xl p-2 hover:bg-muted">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-level-purple-light text-level-purple">
                <BadgeIcon name={badge.icon} className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground">{badge.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">{badge.description}</p>
              </div>
              <span className="text-[11px] text-muted-foreground">{formatTimeAgo(earnedAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface ActionButtonProps {
  action: UserAction
  onSelect: () => void
}

function RegularActionButton({ action, onSelect }: ActionButtonProps) {
  const Icon = action.icon
  const tone = ACTION_TONE_CLASSES[action.tone]
  return (
    <button onClick={onSelect} className={cn("flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-all", tone.border)}>
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", tone.icon)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-level-purple-dark">{action.label}</p>
        <p className="text-[11px] text-muted-foreground">{action.description}</p>
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
    </button>
  )
}

function DangerActionButton({ action, onSelect }: ActionButtonProps) {
  const Icon = action.icon
  return (
    <button
      onClick={onSelect}
      className="group flex w-full items-center gap-3 rounded-xl border-2 border-destructive/30 bg-white p-3 text-left transition-all hover:border-destructive hover:bg-destructive hover:text-white"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/10 text-destructive group-hover:bg-white/20 group-hover:text-white">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{action.label}</p>
        <p className="text-[11px] opacity-70">{action.description}</p>
      </div>
      <ChevronRight className="h-3.5 w-3.5" />
    </button>
  )
}
