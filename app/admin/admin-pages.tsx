"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import {
  BarChart3, TrendingUp, Users, BookOpen, Zap, Flame, Trophy,
  Search, Download, Shield, Check, X, AlertTriangle, Clock,
  Layers, Edit3, Eye, Plus, Globe, Settings, Lock,
  Activity, Flag, History, Loader2, GraduationCap, Star, EyeOff, Trash2,
} from "lucide-react"
import type { Lesson, TeacherApproval, AuditLog, Course } from "@/lib/supabase/types"
import {
  fetchPendingApprovals, approveTeacher, rejectTeacher,
  fetchAuditLog,
} from "@/lib/supabase/admin"
import {
  fetchPublishedCourses,
  fetchTeacherCourses,
  toggleCoursePublished,
  deleteCourse,
} from "@/lib/supabase/courses"
import { useAuth } from "@/contexts/auth-context"

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}

// ── Shared atoms ──────────────────────────────────────────────────────────────

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={cn("relative h-6 w-11 rounded-full transition-colors", on ? "bg-success" : "bg-border")}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
          on ? "left-5" : "left-0.5",
        )}
      />
    </button>
  )
}

function DiffBadge({ d }: { d: string }) {
  const map: Record<string, string> = {
    iniciante: "bg-success/10 text-success",
    intermediario: "bg-warning/10 text-warning",
    avancado: "bg-destructive/10 text-destructive",
  }
  const label =
    d === "iniciante" ? "Iniciante" : d === "intermediario" ? "Intermediário" : "Avançado"
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold", map[d])}>
      {label}
    </span>
  )
}

function PubBadge({ published }: { published: boolean }) {
  if (published)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
        Publicada
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
      Rascunho
    </span>
  )
}

function SettingRow({
  label,
  hint,
  children,
  danger,
}: {
  label: string
  hint: string
  children: React.ReactNode
  danger?: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-6 rounded-2xl border p-4 bg-white",
        danger ? "border-destructive/30" : "border-border",
      )}
    >
      <div className="min-w-0">
        <p className={cn("text-sm font-bold", danger ? "text-destructive" : "text-level-purple-dark")}>{label}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
      </div>
      <div className="w-56 shrink-0 flex justify-end">{children}</div>
    </div>
  )
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export function AnalyticsPage() {
  const funnelSteps = [
    { label: "Visitou plataforma", value: 1284, pct: 100 },
    { label: "Iniciou primeira lição", value: 892, pct: 69 },
    { label: "Completou primeira lição", value: 641, pct: 50 },
    { label: "Completou 5+ lições", value: 312, pct: 24 },
    { label: "Streak de 7+ dias", value: 147, pct: 11 },
  ]

  const pyErrors = [
    { type: "NameError", count: 342, pct: 85 },
    { type: "IndentationError", count: 218, pct: 54 },
    { type: "TypeError", count: 187, pct: 46 },
    { type: "SyntaxError", count: 124, pct: 31 },
    { type: "IndexError", count: 76, pct: 19 },
  ]

  const cohorts = [
    { w: "8 sem atrás", n: 98, r: [100, 68, 54, 42, 38, 34, 31, 28] },
    { w: "7 sem atrás", n: 112, r: [100, 72, 58, 48, 40, 36, 33, null] },
    { w: "6 sem atrás", n: 134, r: [100, 74, 60, 50, 42, 38, null, null] },
    { w: "5 sem atrás", n: 127, r: [100, 71, 57, 45, 39, null, null, null] },
    { w: "4 sem atrás", n: 156, r: [100, 76, 62, 52, null, null, null, null] },
    { w: "3 sem atrás", n: 142, r: [100, 73, 59, null, null, null, null, null] },
    { w: "2 sem atrás", n: 189, r: [100, 78, null, null, null, null, null, null] },
    { w: "1 sem atrás", n: 147, r: [100, null, null, null, null, null, null, null] },
  ]

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-xl font-extrabold text-level-purple-dark">Analytics</h2>
        <p className="text-sm text-muted-foreground">Métricas de engajamento e aprendizado</p>
      </div>

      {/* DAU/WAU/MAU */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "DAU", value: "147", sub: "+12 vs ontem", color: "text-level-purple" },
          { label: "WAU", value: "624", sub: "+8% vs semana passada", color: "text-level-purple-medium" },
          { label: "MAU", value: "1.089", sub: "85% de retenção", color: "text-level-purple-dark" },
          { label: "DAU/MAU", value: "13,5%", sub: "stickiness", color: "text-warning" },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-border bg-white p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{k.label}</p>
            <p className={cn("mt-1 text-3xl font-extrabold", k.color)}>{k.value}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Funnel + Errors */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-white p-5">
          <p className="mb-4 text-sm font-extrabold text-level-purple-dark">Funil de aprendizado</p>
          <div className="space-y-2">
            {funnelSteps.map((s) => (
              <div key={s.label}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">{s.label}</span>
                  <span className="text-xs font-bold text-level-purple-dark">
                    {s.value.toLocaleString("pt-BR")}{" "}
                    <span className="font-semibold text-muted-foreground">· {s.pct}%</span>
                  </span>
                </div>
                <div className="h-7 overflow-hidden rounded-lg bg-level-purple-subtle/50">
                  <div
                    className="flex h-full items-center rounded-lg bg-linear-to-br from-level-purple-dark via-level-purple to-level-purple-medium px-2"
                    style={{ width: `${s.pct}%` }}
                  >
                    {s.pct > 15 && (
                      <span className="text-[10px] font-bold text-white">{s.pct}%</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-white p-5">
          <p className="mb-4 text-sm font-extrabold text-level-purple-dark">
            Top erros Python · últimos 7 dias
          </p>
          <div className="space-y-2">
            {pyErrors.map((e) => (
              <div key={e.type} className="flex items-center gap-3">
                <div className="w-36 font-mono text-xs font-bold text-destructive">{e.type}</div>
                <div className="h-5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-linear-to-r from-destructive to-warning"
                    style={{ width: `${e.pct}%` }}
                  />
                </div>
                <div className="w-12 text-right text-xs font-bold text-foreground">{e.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cohort retention */}
      <div className="rounded-2xl border border-border bg-white p-5">
        <p className="mb-1 text-sm font-extrabold text-level-purple-dark">
          Retenção por coorte (últimas 8 semanas)
        </p>
        <p className="mb-4 text-[11px] text-muted-foreground">
          % de usuários ativos N semanas após o signup
        </p>
        <div className="overflow-x-auto">
          <table className="text-xs">
            <thead>
              <tr className="text-muted-foreground">
                <th className="p-2 text-left font-bold">Coorte</th>
                <th className="p-2 font-bold">Novos</th>
                {["S0", "S1", "S2", "S3", "S4", "S5", "S6", "S7"].map((w) => (
                  <th key={w} className="p-2 font-bold">{w}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cohorts.map((c, i) => (
                <tr key={i}>
                  <td className="whitespace-nowrap p-2 font-semibold text-foreground">{c.w}</td>
                  <td className="p-2 font-bold text-level-purple-dark">{c.n}</td>
                  {c.r.map((v, j) => {
                    if (v === null)
                      return (
                        <td key={j} className="p-1">
                          <div className="h-8 w-14 rounded bg-muted/50" />
                        </td>
                      )
                    const intensity = v / 100
                    return (
                      <td key={j} className="p-1">
                        <div
                          className="flex h-8 w-14 items-center justify-center rounded font-bold"
                          style={{
                            background: `rgba(124, 58, 237, ${intensity})`,
                            color: intensity > 0.5 ? "white" : "#4C1D95",
                          }}
                        >
                          {v}%
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Modules ───────────────────────────────────────────────────────────────────

export function ModulesPage({
  lessons,
  onToast,
}: {
  lessons: Lesson[]
  onToast: (msg: string, kind?: "success" | "danger" | "info") => void
}) {
  const modules = useMemo(() => {
    const map: Record<string, Lesson[]> = {}
    lessons.forEach((l) => {
      ;(map[l.module] ||= []).push(l)
    })
    return Object.entries(map)
  }, [lessons])

  const gradients = [
    "from-level-purple to-level-purple-medium",
    "from-warning to-destructive",
    "from-success to-info",
    "from-info to-level-purple",
    "from-level-purple-dark to-level-purple",
    "from-warning to-success",
  ]

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-level-purple-dark">Módulos &amp; trilhas</h2>
          <p className="text-sm text-muted-foreground">Agrupe lições em jornadas de aprendizado</p>
        </div>
        <button
          onClick={() => onToast("Novo módulo criado", "success")}
          className="btn-3d flex items-center gap-2 rounded-xl bg-level-purple px-4 py-2 text-sm font-bold text-white"
        >
          <Plus className="h-4 w-4" /> Novo módulo
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {modules.map(([name, list], i) => {
          const published = list.filter((l) => l.published).length
          const totalXp = list.reduce((s, l) => s + l.xp_reward, 0)
          return (
            <div key={name} className="overflow-hidden rounded-2xl border border-border bg-white">
              <div
                className={cn(
                  "relative h-20 bg-linear-to-br px-5 py-4 text-white",
                  gradients[i % gradients.length],
                )}
              >
                <div
                  className="absolute inset-0 opacity-30"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)",
                    backgroundSize: "18px 18px",
                  }}
                />
                <div className="relative flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">
                      Módulo {String.fromCharCode(65 + i)}
                    </p>
                    <p className="text-lg font-extrabold">{name}</p>
                  </div>
                  <Layers className="h-7 w-7 opacity-60" />
                </div>
              </div>
              <div className="p-5">
                <div className="mb-3 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    <b className="text-foreground">{list.length}</b> lições
                  </span>
                  <span className="text-success">
                    <b>{published}</b> publicadas
                  </span>
                  <span>
                    <b className="text-foreground">{totalXp}</b> XP total
                  </span>
                </div>
                <div className="space-y-1">
                  {list.slice(0, 4).map((l) => (
                    <div
                      key={l.id}
                      className="flex items-center gap-2 rounded-lg p-2 text-xs hover:bg-muted"
                    >
                      <span className="w-6 font-mono text-muted-foreground">
                        {l.order.toString().padStart(2, "0")}
                      </span>
                      <span className="flex-1 truncate font-semibold text-foreground">{l.title}</span>
                      <PubBadge published={l.published} />
                    </div>
                  ))}
                  {list.length > 4 && (
                    <p className="pl-8 text-[11px] text-muted-foreground">+{list.length - 4} mais</p>
                  )}
                </div>
                <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
                  <button className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground hover:bg-muted">
                    <Edit3 className="h-3 w-3" /> Editar
                  </button>
                  <button className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-level-purple-subtle px-3 py-1.5 text-xs font-bold text-level-purple">
                    <Eye className="h-3 w-3" /> Pré-visualizar
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Approvals ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `há ${mins}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `há ${hrs}h`
  return `há ${Math.floor(hrs / 24)}d`
}

export function ApprovalsPage({
  onToast,
}: {
  onToast: (msg: string, kind?: "success" | "danger" | "info" | "warning") => void
}) {
  const { profile } = useAuth()
  const [approvals, setApprovals] = useState<TeacherApproval[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")

  useEffect(() => {
    fetchPendingApprovals()
      .then(setApprovals)
      .catch(() => onToast("Erro ao carregar aprovações", "danger"))
      .finally(() => setLoadingData(false))
  }, [])

  const approve = async (approval: TeacherApproval) => {
    try {
      await approveTeacher(approval.id, profile!.id, approval.user_id)
      setApprovals((prev) => prev.filter((a) => a.id !== approval.id))
      onToast(`${approval.name} aprovado(a) como professor(a)`, "success")
    } catch {
      onToast("Erro ao aprovar", "danger")
    }
  }

  const reject = async () => {
    if (!rejectingId || !profile) return
    try {
      await rejectTeacher(rejectingId, profile.id, rejectReason)
      setApprovals((prev) => prev.filter((a) => a.id !== rejectingId))
      setRejectingId(null)
      setRejectReason("")
      onToast("Solicitação rejeitada", "danger")
    } catch {
      onToast("Erro ao rejeitar", "danger")
    }
  }

  function getInitials(name: string) {
    return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("")
  }

  return (
    <div className="space-y-5 p-6">
      <div>
        <h2 className="text-xl font-extrabold text-level-purple-dark">Aprovações de professor</h2>
        <p className="text-sm text-muted-foreground">
          {approvals.length} pedido(s) aguardando revisão
        </p>
      </div>

      {loadingData && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-level-purple" />
        </div>
      )}

      {!loadingData && approvals.length === 0 && (
        <div className="rounded-2xl border border-dashed border-level-purple-medium bg-level-purple-subtle/30 py-16 text-center">
          <Shield className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-semibold text-muted-foreground">Nenhuma aprovação pendente</p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {approvals.map((p) => (
          <div key={p.id} className="overflow-hidden rounded-2xl border border-warning/30 bg-white">
            <div className="flex items-center justify-between border-b border-warning/20 bg-warning/5 px-5 py-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-warning">
                <Clock className="h-3 w-3" /> Aguardando {timeAgo(p.submitted_at)}
              </span>
              <span className="text-[10px] text-muted-foreground">ID · {p.id.slice(0, 8)}</span>
            </div>
            <div className="p-5">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-level-purple-light text-sm font-extrabold text-level-purple-dark">
                  {getInitials(p.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-extrabold text-level-purple-dark">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.email}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{p.institution}</p>
                </div>
              </div>

              <div className="mb-4 space-y-2">
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Motivação
                  </p>
                  <p className="rounded-xl bg-muted/50 p-3 text-xs leading-relaxed text-foreground">
                    {p.motivation || "—"}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-[11px]">
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Check className="h-3 w-3 text-success" /> Email institucional verificado
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRejectingId(p.id)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-bold text-muted-foreground hover:border-destructive hover:bg-destructive hover:text-white"
                >
                  <X className="h-4 w-4" /> Rejeitar
                </button>
                <button
                  onClick={() => approve(p)}
                  className="btn-3d flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-success px-3 py-2 text-sm font-bold text-white"
                  style={{ ["--btn-3d-shadow" as string]: "#059669" }}
                >
                  <Check className="h-4 w-4" /> Aprovar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Reject modal */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-level-purple-dark/40 p-4 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border bg-level-purple-subtle/50 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-level-purple text-white">
                  <X className="h-5 w-5" />
                </div>
                <p className="text-base font-extrabold text-level-purple-dark">Rejeitar solicitação</p>
              </div>
              <button
                onClick={() => setRejectingId(null)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-level-purple-light"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6">
              <p className="mb-3 text-sm text-foreground">
                Explique brevemente o motivo (o usuário receberá por email):
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="h-24 w-full rounded-xl border border-border bg-white p-3 text-sm focus:border-level-purple focus:outline-none"
                placeholder="Ex: Documento não corresponde à instituição informada..."
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-border bg-muted/30 px-6 py-4">
              <button
                onClick={() => setRejectingId(null)}
                className="rounded-xl border border-border px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-white"
              >
                Cancelar
              </button>
              <button
                onClick={reject}
                className="rounded-xl bg-destructive px-4 py-2 text-sm font-bold text-white"
              >
                Rejeitar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Audit log ─────────────────────────────────────────────────────────────────

export function AuditPage() {
  const [q, setQ] = useState("")
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    fetchAuditLog(100)
      .then(setLogs)
      .catch(() => {})
      .finally(() => setLoadingData(false))
  }, [])

  const filtered = logs.filter(
    (a) =>
      !q ||
      a.actor_name.toLowerCase().includes(q.toLowerCase()) ||
      a.target.toLowerCase().includes(q.toLowerCase()) ||
      a.action.toLowerCase().includes(q.toLowerCase()),
  )

  const tones: Record<string, string> = {
    info:    "bg-info/10 text-info",
    warning: "bg-warning/10 text-warning",
    danger:  "bg-destructive/10 text-destructive",
  }

  const severityIcon: Record<string, typeof Activity> = {
    info:    Activity,
    warning: AlertTriangle,
    danger:  X,
  }

  return (
    <div className="space-y-5 p-6">
      <div>
        <h2 className="text-xl font-extrabold text-level-purple-dark">Logs · auditoria</h2>
        <p className="text-sm text-muted-foreground">Rastro de todas as ações administrativas</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/20 p-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar ação, usuário, alvo..."
              className="w-full rounded-xl border border-border bg-white py-2 pl-9 pr-3 text-sm focus:border-level-purple focus:outline-none"
            />
          </div>
          <button className="flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted">
            <Download className="h-3.5 w-3.5" /> Exportar
          </button>
        </div>

        {loadingData && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-level-purple" />
          </div>
        )}

        <div className="divide-y divide-border">
          {filtered.map((a) => {
            const Icon = severityIcon[a.severity] ?? Activity
            return (
              <div key={a.id} className="flex items-center gap-4 p-3 hover:bg-muted/20">
                <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", tones[a.severity])}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">
                    <b className="text-level-purple-dark">{a.actor_name}</b> {a.action}{" "}
                    <b>{a.target}</b>
                  </p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {timeAgo(a.created_at)}
                  </p>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <History className="mx-auto h-10 w-10 text-muted-foreground/30" />
              <p className="mt-3 text-sm font-semibold text-muted-foreground">Nenhum evento encontrado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Settings ──────────────────────────────────────────────────────────────────

const FEATURE_FLAGS = [
  { key: "new_ide", label: "Novo editor IDE", desc: "Editor Monaco com auto-complete Python", on: true },
  { key: "peer_review", label: "Revisão entre pares", desc: "Alunos podem revisar código uns dos outros", on: false },
  { key: "ai_hints", label: "Dicas com IA (Claude)", desc: "Sugestões contextualizadas em lições", on: true },
  { key: "leaderboard_weekly", label: "Ranking semanal", desc: "Reset do leaderboard toda segunda", on: true },
  { key: "streak_freeze", label: "Streak freeze", desc: "Usuários podem congelar streak por 1 dia", on: false },
  { key: "dark_mode", label: "Dark mode global", desc: "Tema escuro em todas as páginas", on: false },
]

const INTEGRATIONS = [
  { name: "Supabase", desc: "Banco de dados e auth", connected: true, icon: "🗄️" },
  { name: "Google OAuth", desc: "Login com Google", connected: true, icon: "🔐" },
  { name: "GitHub OAuth", desc: "Login com GitHub", connected: true, icon: "⚡" },
  { name: "SendGrid", desc: "Envio de emails", connected: false, icon: "📧" },
  { name: "Discord", desc: "Notificações", connected: false, icon: "💬" },
  { name: "Pyodide", desc: "Runtime Python no navegador", connected: true, icon: "🐍" },
]

export function SettingsPage({
  onToast,
}: {
  onToast: (msg: string, kind?: "success" | "danger" | "info") => void
}) {
  const [tab, setTab] = useState("general")
  const [flags, setFlags] = useState(FEATURE_FLAGS)

  const tabs = [
    { id: "general", label: "Geral", Icon: Settings },
    { id: "gamification", label: "Gamificação", Icon: Trophy },
    { id: "integrations", label: "Integrações", Icon: Globe },
    { id: "flags", label: "Feature flags", Icon: Flag },
    { id: "security", label: "Segurança", Icon: Lock },
  ]

  return (
    <div className="space-y-5 p-6">
      <div>
        <h2 className="text-xl font-extrabold text-level-purple-dark">Ajustes da plataforma</h2>
        <p className="text-sm text-muted-foreground">Configurações globais do LevelUSP</p>
      </div>

      <div className="flex items-center gap-0 border-b border-border">
        {tabs.map((t) => {
          const Icon = t.Icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-bold transition-colors",
                tab === t.id
                  ? "border-level-purple text-level-purple"
                  : "border-transparent text-muted-foreground hover:text-level-purple",
              )}
            >
              <Icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          )
        })}
      </div>

      {tab === "general" && (
        <div className="max-w-2xl space-y-4">
          <SettingRow label="Nome da plataforma" hint="Exibido em emails e abas">
            <input
              defaultValue="LevelUSP"
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm font-bold focus:border-level-purple focus:outline-none"
            />
          </SettingRow>
          <SettingRow label="Email de suporte" hint="Usado para respostas automáticas">
            <input
              defaultValue="suporte@levelusp.br"
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm font-bold focus:border-level-purple focus:outline-none"
            />
          </SettingRow>
          <SettingRow label="Permitir cadastro público" hint="Qualquer um pode criar conta">
            <Toggle on={true} onChange={() => {}} />
          </SettingRow>
          <SettingRow label="Exigir verificação de email" hint="Bloqueia acesso até confirmar">
            <Toggle on={true} onChange={() => {}} />
          </SettingRow>
          <SettingRow label="Modo manutenção" hint="Exibe tela de manutenção a todos (menos admins)" danger>
            <Toggle on={false} onChange={() => {}} />
          </SettingRow>
        </div>
      )}

      {tab === "gamification" && (
        <div className="max-w-2xl space-y-4">
          <SettingRow label="XP necessário por nível" hint="Régua progressiva. Atual: 1000 XP/nível">
            <input
              type="number"
              defaultValue="1000"
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm font-bold focus:border-level-purple focus:outline-none"
            />
          </SettingRow>
          <SettingRow
            label="Multiplicador de streak"
            hint="XP × este valor para cada dia consecutivo (após 3)"
          >
            <input
              type="number"
              step="0.1"
              defaultValue="1.2"
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm font-bold focus:border-level-purple focus:outline-none"
            />
          </SettingRow>
          <SettingRow label="Habilitar leaderboard global" hint="Alunos veem ranking público">
            <Toggle on={true} onChange={() => {}} />
          </SettingRow>
          <SettingRow label="Mostrar badges de conquistas" hint="Ícones de troféus no perfil">
            <Toggle on={true} onChange={() => {}} />
          </SettingRow>
        </div>
      )}

      {tab === "integrations" && (
        <div className="grid max-w-3xl gap-3 md:grid-cols-2">
          {INTEGRATIONS.map((it) => (
            <div
              key={it.name}
              className="flex items-center gap-3 rounded-2xl border border-border bg-white p-4"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-xl">
                {it.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold text-level-purple-dark">{it.name}</p>
                <p className="text-[11px] text-muted-foreground">{it.desc}</p>
              </div>
              {it.connected ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-bold text-success">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                  Conectado
                </span>
              ) : (
                <button className="rounded-lg bg-level-purple px-3 py-1.5 text-xs font-bold text-white">
                  Conectar
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "flags" && (
        <div className="max-w-2xl space-y-3">
          {flags.map((f) => (
            <div
              key={f.key}
              className="flex items-center justify-between rounded-2xl border border-border bg-white p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-level-purple-dark">{f.label}</p>
                <p className="text-[11px] text-muted-foreground">{f.desc}</p>
              </div>
              <Toggle
                on={f.on}
                onChange={(v) =>
                  setFlags((prev) => prev.map((x) => (x.key === f.key ? { ...x, on: v } : x)))
                }
              />
            </div>
          ))}
        </div>
      )}

      {tab === "security" && (
        <div className="max-w-2xl space-y-4">
          <SettingRow label="2FA obrigatório para admins" hint="Exige autenticação de dois fatores">
            <Toggle on={true} onChange={() => {}} />
          </SettingRow>
          <SettingRow label="Tempo de sessão (minutos)" hint="Logout automático após inatividade">
            <input
              type="number"
              defaultValue="60"
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm font-bold focus:border-level-purple focus:outline-none"
            />
          </SettingRow>
          <SettingRow label="Rate limit · submissões/min" hint="Por usuário, por endpoint">
            <input
              type="number"
              defaultValue="10"
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm font-bold focus:border-level-purple focus:outline-none"
            />
          </SettingRow>
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
            <p className="mb-1 text-sm font-extrabold text-destructive">Zona de perigo</p>
            <p className="mb-4 text-xs text-muted-foreground">Ações que afetam toda a plataforma.</p>
            <div className="flex gap-2">
              <button className="rounded-xl border border-destructive bg-white px-3 py-2 text-sm font-bold text-destructive hover:bg-destructive hover:text-white">
                Invalidar todas as sessões
              </button>
              <button className="rounded-xl border border-destructive bg-white px-3 py-2 text-sm font-bold text-destructive hover:bg-destructive hover:text-white">
                Rotar chaves API
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="sticky bottom-0 -mx-6 flex items-center justify-between border-t border-border bg-white/90 px-6 py-4 backdrop-blur">
        <p className="text-xs text-muted-foreground">Alterações são registradas no log de auditoria</p>
        <button
          onClick={() => onToast("Configurações salvas", "success")}
          className="btn-3d rounded-xl bg-level-purple px-5 py-2 text-sm font-bold text-white"
        >
          Salvar alterações
        </button>
      </div>
    </div>
  )
}

// ── Cursos (admin) ────────────────────────────────────────────────────────────

const LEVEL_LABEL: Record<string, string> = {
  iniciante:     "Iniciante",
  intermediario: "Intermediário",
  avancado:      "Avançado",
}

const LEVEL_COLOR: Record<string, string> = {
  iniciante:     "bg-green-100 text-green-700",
  intermediario: "bg-yellow-100 text-yellow-700",
  avancado:      "bg-red-100 text-red-700",
}

export function CoursesAdminPage({ onToast }: { onToast: (msg: string, kind?: string) => void }) {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState("")
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        // Admin vê todos os cursos — busca publicados + não publicados
        // Como não há fetchAllCourses, usamos fetchPublishedCourses como base
        // e complementamos com não publicados via supabase direto
        const { createClient } = await import("@/lib/supabase/client")
        const sb = createClient()
        const { data } = await sb
          .from("courses" as never)
          .select("*, lessons(count)")
          .order("created_at", { ascending: false })
        setCourses(
          (data ?? []).map((r: any) => ({ ...r, lesson_count: r.lessons?.[0]?.count ?? 0 })) as Course[]
        )
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = courses.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.description.toLowerCase().includes(search.toLowerCase())
  )

  const handleToggle = async (course: Course) => {
    setTogglingId(course.id)
    try {
      await toggleCoursePublished(course.id, !course.published)
      setCourses((prev) => prev.map((c) => c.id === course.id ? { ...c, published: !course.published } : c))
      onToast(course.published ? "Curso despublicado" : "Curso publicado", "success")
    } catch {
      onToast("Erro ao alterar status", "danger")
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async (course: Course) => {
    if (!confirm(`Excluir "${course.title}" permanentemente?`)) return
    setDeletingId(course.id)
    try {
      await deleteCourse(course.id)
      setCourses((prev) => prev.filter((c) => c.id !== course.id))
      onToast("Curso excluído", "success")
    } catch {
      onToast("Erro ao excluir", "danger")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cursos..."
            className="w-full rounded-xl border border-border bg-white pl-9 pr-4 py-2.5 text-sm focus:border-level-purple focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{courses.filter((c) => c.published).length} publicados</span>
          <span>·</span>
          <span>{courses.filter((c) => !c.published).length} rascunhos</span>
          <span>·</span>
          <span>{courses.length} total</span>
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-hidden rounded-2xl border border-border bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-level-purple" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <p className="mt-3 text-sm font-medium text-level-purple-dark">Nenhum curso encontrado</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((course) => (
              <div key={course.id} className="flex items-center gap-4 p-4 hover:bg-muted/20 transition-colors">
                {/* Thumb */}
                <div className="shrink-0">
                  {course.cover_image_url ? (
                    <img src={course.cover_image_url} alt={course.title} className="h-12 w-12 rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-level-purple-subtle">
                      <GraduationCap className="h-6 w-6 text-level-purple/60" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-level-purple-dark truncate">{course.title}</p>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", LEVEL_COLOR[course.level])}>
                      {LEVEL_LABEL[course.level]}
                    </span>
                    {course.published ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">Publicado</span>
                    ) : (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">Rascunho</span>
                    )}
                    {course.final_project_title && (
                      <span className="flex items-center gap-0.5 rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-semibold text-yellow-700">
                        <Star className="h-2.5 w-2.5" /> Projeto final
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground truncate max-w-md">{course.description}</p>
                  <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{course.lesson_count ?? 0} lições</span>
                    <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-yellow-500" />{course.total_xp} XP</span>
                    {course.estimated_hours > 0 && (
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{course.estimated_hours}h</span>
                    )}
                  </div>
                </div>

                {/* Ações */}
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => handleToggle(course)}
                    disabled={togglingId === course.id}
                    title={course.published ? "Despublicar" : "Publicar"}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                      course.published
                        ? "text-green-600 hover:bg-green-50"
                        : "text-muted-foreground hover:bg-level-purple-light hover:text-level-purple"
                    )}
                  >
                    {togglingId === course.id ? <Loader2 className="h-4 w-4 animate-spin" /> :
                     course.published ? <Globe className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  {course.published && (
                    <Link href={`/cursos/${course.id}`} target="_blank">
                      <button title="Ver página" className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-level-purple-light hover:text-level-purple transition-colors">
                        <Eye className="h-4 w-4" />
                      </button>
                    </Link>
                  )}
                  <Link href={`/teacher/curso/${course.id}`}>
                    <button title="Editar" className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-level-purple-light hover:text-level-purple transition-colors">
                      <Edit3 className="h-4 w-4" />
                    </button>
                  </Link>
                  <button
                    onClick={() => handleDelete(course)}
                    disabled={deletingId === course.id}
                    title="Excluir"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    {deletingId === course.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
