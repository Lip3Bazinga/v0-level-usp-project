"use client"

import { useState, useEffect } from "react"
import { AlertTriangle, Loader2, Trophy } from "lucide-react"
import type { AnalyticsMetrics } from "@levelusp/contracts"
import { cn } from "@/lib/utils"
import { errorMessage, fetchAnalyticsMetrics } from "@/lib/api"
import { Donut, SparkBar } from "./charts"

const ROLE_META: Record<string, { label: string; color: string }> = {
  student: { label: "Alunos", color: "#7C3AED" },
  teacher: { label: "Professores", color: "#A78BFA" },
  admin: { label: "Admins", color: "#EF4444" },
}

const pct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0)
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

function DailyChart({ title, subtitle, data, color }: { title: string; subtitle: string; data: number[]; color: string }) {
  const peak = Math.max(0, ...data)
  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-extrabold text-level-purple-dark">{title}</p>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-extrabold text-level-purple-dark">{sum(data).toLocaleString("pt-BR")}</p>
          <p className="text-[10px] text-muted-foreground">pico {peak}/dia</p>
        </div>
      </div>
      <SparkBar data={data.length ? data : [0]} color={color} height={90} width={7} gap={3} />
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{data.length} dias atrás</span>
        <span>hoje</span>
      </div>
    </div>
  )
}

export function AnalyticsPage() {
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAnalyticsMetrics()
      .then(setMetrics)
      .catch((err) => setError(errorMessage(err, "Não foi possível carregar as métricas.")))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-level-purple" />
      </div>
    )
  }

  if (error || !metrics) {
    return (
      <div className="p-6">
        <div role="alert" className="flex items-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error ?? "Sem dados."}
        </div>
      </div>
    )
  }

  const { totalUsers, dau, wau, mau } = metrics
  const dauMau = mau > 0 ? ((dau / mau) * 100).toFixed(1) : "—"

  const funnelSteps = [
    { label: "Usuários cadastrados", value: totalUsers, pct: 100 },
    { label: "Concluiu a 1ª lição", value: metrics.funnelStarted, pct: pct(metrics.funnelStarted, totalUsers) },
    { label: "Concluiu 5+ lições", value: metrics.funnelCompleted5, pct: pct(metrics.funnelCompleted5, totalUsers) },
    { label: "Sequência de 7+ dias", value: metrics.funnelStreak7, pct: pct(metrics.funnelStreak7, totalUsers) },
  ]

  const roleData = metrics.roleDistribution.map((r) => ({
    name: ROLE_META[r.role]?.label ?? r.role,
    value: r.count,
    color: ROLE_META[r.role]?.color ?? "#94A3B8",
  }))
  const maxTop = Math.max(1, ...metrics.topLessons.map((l) => l.completions))

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-xl font-extrabold text-level-purple-dark">Analytics</h2>
        <p className="text-sm text-muted-foreground">Métricas de engajamento e aprendizado (fuso de São Paulo)</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[
          { label: "DAU", value: dau.toLocaleString("pt-BR"), sub: "ativos nas últimas 24 h", color: "text-level-purple" },
          { label: "WAU", value: wau.toLocaleString("pt-BR"), sub: "ativos nos últimos 7 dias", color: "text-level-purple-medium" },
          { label: "MAU", value: mau.toLocaleString("pt-BR"), sub: "ativos nos últimos 30 dias", color: "text-level-purple-dark" },
          { label: "DAU/MAU", value: `${dauMau}%`, sub: "stickiness", color: "text-warning" },
          { label: "Retenção 7d", value: `${metrics.retention7d}%`, sub: "contas com 7+ dias ativas na semana", color: "text-success" },
          { label: "XP médio", value: metrics.averageXp.toLocaleString("pt-BR"), sub: "por aluno", color: "text-info" },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-border bg-white p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{k.label}</p>
            <p className={cn("mt-1 text-3xl font-extrabold", k.color)}>{k.value}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DailyChart
          title="Usuários ativos por dia"
          subtitle="Alunos distintos que concluíram alguma lição"
          data={metrics.dailyActiveUsers}
          color="#7C3AED"
        />
        <DailyChart title="Conclusões por dia" subtitle="Lições concluídas" data={metrics.completionsByDay} color="#10B981" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-white p-5 lg:col-span-2">
          <p className="mb-4 text-sm font-extrabold text-level-purple-dark">Funil de aprendizado</p>
          <div className="space-y-2">
            {funnelSteps.map((s) => (
              <div key={s.label}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">{s.label}</span>
                  <span className="text-xs font-bold text-level-purple-dark">
                    {s.value.toLocaleString("pt-BR")} <span className="font-semibold text-muted-foreground">· {s.pct}%</span>
                  </span>
                </div>
                <div className="h-7 overflow-hidden rounded-lg bg-level-purple-subtle/50">
                  <div
                    className="flex h-full items-center rounded-lg bg-linear-to-br from-level-purple-dark via-level-purple to-level-purple-medium px-2"
                    style={{ width: `${Math.max(s.pct, 2)}%` }}
                  >
                    {s.pct > 10 && <span className="text-[10px] font-bold text-white">{s.pct}%</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-white p-5">
          <p className="mb-3 text-sm font-extrabold text-level-purple-dark">Distribuição por papel</p>
          <div className="flex items-center justify-between gap-4">
            <Donut data={roleData} size={120} thickness={14} label="usuários" />
            <ul className="space-y-2 text-xs">
              {roleData.map((r) => (
                <li key={r.name} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: r.color }} />
                  <span className="text-muted-foreground">{r.name}</span>
                  <span className="font-bold text-level-purple-dark">{r.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-white p-5">
        <p className="mb-3 flex items-center gap-2 text-sm font-extrabold text-level-purple-dark">
          <Trophy className="h-4 w-4 text-warning" /> Lições mais concluídas
        </p>
        {metrics.topLessons.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma conclusão registrada ainda.</p>
        ) : (
          <ol className="space-y-2">
            {metrics.topLessons.map((l, i) => (
              <li key={l.lesson_id} className="flex items-center gap-3">
                <span className="w-5 text-right font-mono text-xs text-muted-foreground">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-semibold text-foreground">{l.title}</span>
                    <span className="text-xs font-bold text-level-purple-dark">{l.completions.toLocaleString("pt-BR")}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-level-purple-subtle">
                    <div className="h-full rounded-full bg-level-purple" style={{ width: `${(l.completions / maxTop) * 100}%` }} />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
