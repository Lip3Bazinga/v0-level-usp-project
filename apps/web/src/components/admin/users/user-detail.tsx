"use client"

import { useEffect, useState } from "react"
import {
  ChevronLeft, ChevronRight, Trophy, Zap, Flame, BookOpen, Activity,
  Shield, Key, Ban, RefreshCw, Download, Trash2, AlertTriangle, LogOut, CheckCircle2, Award,
} from "lucide-react"
import { RoleBadge } from "@/components/ui/badges"
import { X, Loader2 } from "lucide-react"
import type { Badge, Profile, UserBadge } from "@levelusp/contracts"
import {
  deleteUser, errorMessage, exportUserDataLGPD, fetchAllBadges, fetchUserBadges, invalidateSessions, resetUserProgress,
  sendPasswordReset, setUserSuspended,
} from "@/lib/api"
import { badgeIcon } from "@/lib/badge-icons"
import { getInitials, timeAgo } from "@/lib/utils"
import { cn } from "@/lib/utils"
import type { OnToast } from "@/lib/types/ui"

/** Baixa um objeto como arquivo JSON. */
function downloadJson(data: unknown, filename: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }))
  const a = Object.assign(document.createElement("a"), { href: url, download: filename })
  a.click()
  URL.revokeObjectURL(url)
}


function AvatarInitials({ name, role, size = 36 }: { name: string; role: string; size?: number }) {
  const bg =
    role === "admin"
      ? "bg-destructive/10 text-destructive"
      : role === "teacher"
        ? "bg-level-purple-light text-level-purple-dark"
        : "bg-level-purple-subtle text-level-purple"
  return (
    <div
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-bold", bg)}
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {getInitials(name)}
    </div>
  )
}

function adminActions(suspended: boolean) {
  return [
    { id: "reset-pw", label: "Enviar reset de senha",         Icon: Key,       tone: "info",    desc: "Envia e-mail com link de redefinição" },
    suspended
      ? { id: "unsuspend", label: "Reativar conta",           Icon: CheckCircle2, tone: "info", desc: "Libera o login novamente" }
      : { id: "suspend",   label: "Suspender conta",          Icon: Ban,       tone: "warning", desc: "Bloqueia o login e encerra as sessões" },
    { id: "sessions", label: "Encerrar sessões",              Icon: LogOut,    tone: "info",    desc: "Desconecta o usuário de todos os dispositivos" },
    { id: "reset-xp", label: "Resetar progresso",             Icon: RefreshCw, tone: "warning", desc: "Zera XP, nível e lições" },
    { id: "export",   label: "Exportar dados (LGPD)",         Icon: Download,  tone: "info",    desc: "Baixa um JSON com todos os dados" },
    { id: "delete",   label: "Excluir conta permanentemente", Icon: Trash2,    tone: "danger",  desc: "Remove conta e progresso" },
  ]
}

interface UserDetailProps {
  user: Profile
  users: Profile[]
  setUsers: (u: Profile[] | ((p: Profile[]) => Profile[])) => void
  onBack: () => void
  onToast: OnToast
}

export function UserDetail({ user, users, setUsers, onBack, onToast }: UserDetailProps) {
  const [tab, setTab] = useState("overview")
  const [confirmAction, setConfirmAction] = useState<{ id: string; label: string; tone: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const current = users.find((u) => u.id === user.id) || user
  const actions = adminActions(current.suspended)
  const dangerActions = actions.filter((a) => a.tone === "danger")
  const regularActions = actions.filter((a) => a.tone !== "danger")

  const [earned, setEarned] = useState<{ badge: Badge; earned_at: string }[] | null>(null)
  useEffect(() => {
    let cancelled = false
    Promise.all([fetchUserBadges(user.id), fetchAllBadges()])
      .then(([mine, all]: [UserBadge[], Badge[]]) => {
        if (cancelled) return
        const byId = new Map(all.map((b) => [b.id, b]))
        setEarned(
          mine
            .map((ub) => ({ badge: byId.get(ub.badge_id), earned_at: ub.earned_at }))
            .filter((x): x is { badge: Badge; earned_at: string } => !!x.badge)
            .sort((a, b) => b.earned_at.localeCompare(a.earned_at)),
        )
      })
      .catch(() => !cancelled && setEarned([]))
    return () => {
      cancelled = true
    }
  }, [user.id])

  const replaceUser = (updated: Profile) => setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))

  const applyAction = async (id: string) => {
    setBusy(true)
    try {
      switch (id) {
        case "reset-pw":
          await sendPasswordReset(current.id)
          onToast("E-mail de redefinição enviado", "success")
          break
        case "suspend":
          replaceUser(await setUserSuspended(current.id, true))
          onToast("Conta suspensa", "warning")
          break
        case "unsuspend":
          replaceUser(await setUserSuspended(current.id, false))
          onToast("Conta reativada", "success")
          break
        case "sessions":
          await invalidateSessions(current.id)
          onToast("Sessões encerradas", "success")
          break
        case "reset-xp":
          await resetUserProgress(current.id)
          setUsers((prev) =>
            prev.map((u) =>
              u.id === current.id
                ? { ...u, total_xp: 0, level: 1, lessons_completed: 0, current_streak: 0, max_streak: 0, courses_completed: 0 }
                : u,
            ),
          )
          onToast("Progresso zerado", "success")
          break
        case "export": {
          const data = await exportUserDataLGPD(current.id)
          downloadJson(data, `lgpd-${current.username ?? current.id}-${new Date().toISOString().slice(0, 10)}.json`)
          onToast("Arquivo LGPD gerado", "success")
          break
        }
        case "delete":
          await deleteUser(current.id)
          setUsers((prev) => prev.filter((u) => u.id !== current.id))
          onToast("Conta excluída", "danger")
          setConfirmAction(null)
          onBack()
          return
      }
    } catch (e) {
      onToast(errorMessage(e, "Erro ao executar ação"), "danger")
    } finally {
      setBusy(false)
      setConfirmAction(null)
    }
  }

  return (
    <div className="space-y-5 p-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-level-purple"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Voltar para usuários
      </button>

      <div className="overflow-hidden rounded-3xl border border-border bg-white">
        <div className="relative h-28 bg-linear-to-br from-level-purple-dark via-level-purple to-level-purple-medium">
          <div
            className="absolute inset-0 opacity-30"
            style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)", backgroundSize: "18px 18px" }}
          />
        </div>
        <div className="relative px-6 pb-6">
          <div className="-mt-12 flex items-end gap-4">
            <div className="rounded-2xl bg-white p-1.5 shadow-sm">
              <AvatarInitials name={current.full_name} role={current.role} size={88} />
            </div>
            <div className="min-w-0 flex-1 pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-extrabold text-level-purple-dark">{current.full_name}</h2>
                <RoleBadge role={current.role} />
                {current.suspended && (
                  <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-bold text-warning">Suspensa</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{current.username ? `@${current.username} · ` : ""}{current.email}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Ingressou em{" "}
                {new Date(current.created_at).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
            {current.last_login_date && (
              <p className="pb-2 text-xs text-muted-foreground">Último acesso {timeAgo(current.last_login_date)}</p>
            )}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
            {[
              { Icon: Trophy,   label: "Nível",    value: String(current.level),                                              color: "text-warning",      bg: "bg-warning/10" },
              { Icon: Zap,      label: "XP",       value: current.total_xp.toLocaleString("pt-BR"),                           color: "text-level-purple", bg: "bg-level-purple-light" },
              { Icon: Flame,    label: "Streak",   value: `${current.current_streak}d`,                                       color: "text-warning",      bg: "bg-warning/10" },
              { Icon: BookOpen, label: "Lições",   value: String(current.lessons_completed),                                  color: "text-info",         bg: "bg-info/10" },
              { Icon: Activity, label: "Cadastro", value: new Date(current.created_at).toLocaleDateString("pt-BR"),           color: "text-success",      bg: "bg-success/10", small: true },
            ].map((s, i) => (
              <div key={i} className="rounded-xl border border-border p-3">
                <div className={cn("mb-1.5 inline-flex h-8 w-8 items-center justify-center rounded-lg", s.bg, s.color)}>
                  <s.Icon className="h-4 w-4" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <p className={cn("font-extrabold text-level-purple-dark", s.small ? "text-sm" : "text-xl")}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-0 border-b border-border">
        {[{ id: "overview", label: "Visão geral" }, { id: "actions", label: "Ações admin" }].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "border-b-2 px-4 py-2.5 text-sm font-bold transition-colors",
              tab === t.id ? "border-level-purple text-level-purple" : "border-transparent text-muted-foreground hover:text-level-purple",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="rounded-2xl border border-border bg-white p-5">
          <p className="mb-3 text-sm font-extrabold text-level-purple-dark">Conquistas</p>
          {earned === null ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-level-purple" /></div>
          ) : earned.length === 0 ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Award className="h-4 w-4 text-muted-foreground/40" /> Nenhuma badge conquistada ainda.
            </p>
          ) : (
            <div className="space-y-2">
              {earned.slice(0, 8).map(({ badge, earned_at }) => {
                const Icon = badgeIcon(badge.icon)
                return (
                  <div key={badge.id} className="flex items-center gap-3 rounded-xl p-2 hover:bg-muted">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-level-purple-light text-level-purple">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground">{badge.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{badge.description}</p>
                    </div>
                    <span className="text-[11px] text-muted-foreground">{timeAgo(earned_at)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === "actions" && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4 text-level-purple" />
              <p className="text-sm font-extrabold text-level-purple-dark">Ações administrativas</p>
            </div>
            <div className="space-y-2">
              {regularActions.map((a) => {
                const toneBorder: Record<string, string> = { info: "border-info/20 hover:bg-info/5",    warning: "border-warning/20 hover:bg-warning/5" }
                const toneIcon:   Record<string, string> = { info: "bg-info/10 text-info",              warning: "bg-warning/10 text-warning" }
                return (
                  <button
                    key={a.id}
                    onClick={() => setConfirmAction({ id: a.id, label: a.label, tone: a.tone })}
                    className={cn("flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-all", toneBorder[a.tone])}
                  >
                    <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", toneIcon[a.tone])}>
                      <a.Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-level-purple-dark">{a.label}</p>
                      <p className="text-[11px] text-muted-foreground">{a.desc}</p>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <p className="text-sm font-extrabold text-destructive">Zona de perigo</p>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">Ações irreversíveis. Todas requerem confirmação.</p>
            {dangerActions.map((a) => (
              <button
                key={a.id}
                onClick={() => setConfirmAction({ id: a.id, label: a.label, tone: a.tone })}
                className="group flex w-full items-center gap-3 rounded-xl border-2 border-destructive/30 bg-white p-3 text-left transition-all hover:border-destructive hover:bg-destructive hover:text-white"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/10 text-destructive group-hover:bg-white/20 group-hover:text-white">
                  <a.Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{a.label}</p>
                  <p className="text-[11px] opacity-70">{a.desc}</p>
                </div>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        </div>
      )}

      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-level-purple-dark/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-border bg-level-purple-subtle/50 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-level-purple text-white">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <p className="text-base font-extrabold text-level-purple-dark">{confirmAction.label}</p>
              </div>
              <button onClick={() => setConfirmAction(null)} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-level-purple-light">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-foreground">
                Você está prestes a executar <b>{confirmAction.label.toLowerCase()}</b> em{" "}
                <b>{current.full_name}</b>.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Esta ação será registrada no log de auditoria com seu nome e data/hora.
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-border bg-muted/30 px-6 py-4">
              <button
                onClick={() => setConfirmAction(null)}
                disabled={busy}
                className="rounded-xl border border-border px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-white disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => applyAction(confirmAction.id)}
                disabled={busy}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-50",
                  confirmAction.tone === "danger" ? "bg-destructive" : confirmAction.tone === "warning" ? "bg-warning" : "bg-level-purple",
                )}
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirmar ação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
