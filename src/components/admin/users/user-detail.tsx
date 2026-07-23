"use client"

import { useState } from "react"
import {
  ChevronLeft, ChevronRight, Trophy, Zap, Flame, BookOpen, Activity,
  Star, Shield, Key, Ban, RefreshCw, Download, Trash2, AlertTriangle, Mail,
} from "lucide-react"
import { RoleBadge } from "@/components/ui/badges"
import { X, Loader2 } from "lucide-react"
import {
  sendPasswordReset, setUserSuspended, resetUserProgress,
  exportUserDataLGPD, deleteUser,
} from "@/lib/supabase/admin"
import type { Profile } from "@/lib/supabase/types"
import { getInitials } from "@/lib/utils"
import { cn } from "@/lib/utils"
import type { OnToast } from "@/lib/types"


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

const ADMIN_ACTIONS = [
  { id: "reset-pw", label: "Enviar reset de senha",        Icon: Key,       tone: "info",    desc: "Envia email com link de reset" },
  { id: "suspend",  label: "Suspender conta",              Icon: Ban,       tone: "warning", desc: "Bloqueia login temporariamente" },
  { id: "reset-xp", label: "Resetar progresso",            Icon: RefreshCw, tone: "warning", desc: "Zera XP, nível e lições" },
  { id: "export",   label: "Exportar dados (LGPD)",        Icon: Download,  tone: "info",    desc: "Gera JSON com todos os dados" },
  { id: "delete",   label: "Excluir conta permanentemente", Icon: Trash2,    tone: "danger",  desc: "Remove conta e progresso" },
]

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

  const applyAction = async (id: string) => {
    setBusy(true)
    try {
      switch (id) {
        case "reset-pw":
          await sendPasswordReset(current.email)
          onToast("Email de redefinição enviado", "success")
          break
        case "suspend":
          await setUserSuspended(current.id, true)
          setUsers((prev) => prev.map((u) => (u.id === current.id ? { ...u, suspended: true } : u)))
          onToast("Conta suspensa", "warning")
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
        case "export":
          await exportUserDataLGPD(current.id)
          onToast("Arquivo LGPD gerado", "success")
          break
        case "delete":
          await deleteUser(current.id)
          setUsers((prev) => prev.filter((u) => u.id !== current.id))
          onToast("Conta excluída", "danger")
          setConfirmAction(null)
          onBack()
          return
      }
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Erro ao executar ação", "danger")
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
              </div>
              <p className="text-sm text-muted-foreground">@{current.username} · {current.email}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Ingressou em{" "}
                {new Date(current.created_at).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
            <div className="flex items-center gap-2 pb-2">
              <button className="flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted">
                <Mail className="h-3.5 w-3.5" /> Enviar mensagem
              </button>
            </div>
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
          <p className="mb-3 text-sm font-extrabold text-level-purple-dark">Conquistas recentes</p>
          <div className="space-y-2">
            {[
              { Icon: Flame,   label: `Streak de ${current.current_streak} dias`, color: "text-warning bg-warning/10" },
              { Icon: Trophy,  label: `Nível ${current.level} atingido`,           color: "text-level-purple bg-level-purple-light" },
              { Icon: Star,    label: "Primeira lição avançada",                    color: "text-success bg-success/10" },
            ].map((a, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl p-2 hover:bg-muted">
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", a.color)}>
                  <a.Icon className="h-4 w-4" />
                </div>
                <p className="text-xs font-semibold text-foreground">{a.label}</p>
              </div>
            ))}
          </div>
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
              {ADMIN_ACTIONS.slice(0, 4).map((a) => {
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
            {ADMIN_ACTIONS.slice(4).map((a) => (
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
