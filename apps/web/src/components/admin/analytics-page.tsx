"use client"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { fetchAnalyticsMetrics, type AnalyticsMetrics } from "@/lib/supabase/admin"

export function AnalyticsPage() {
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null)
  const [loadingMetrics, setLoadingMetrics] = useState(true)

  useEffect(() => {
    fetchAnalyticsMetrics()
      .then(setMetrics)
      .catch(() => {})
      .finally(() => setLoadingMetrics(false))
  }, [])

  const totalUsers = metrics?.totalUsers ?? 0
  const dau = metrics?.dau ?? 0
  const wau = metrics?.wau ?? 0
  const mau = metrics?.mau ?? 0
  const dauMau = mau > 0 ? ((dau / mau) * 100).toFixed(1) : "—"

  const funnelSteps = metrics
    ? [
        { label: "Usuários cadastrados", value: totalUsers, pct: 100 },
        { label: "Completou 1ª lição",   value: metrics.funnelStarted,    pct: totalUsers > 0 ? Math.round((metrics.funnelStarted    / totalUsers) * 100) : 0 },
        { label: "Completou 5+ lições",  value: metrics.funnelCompleted5, pct: totalUsers > 0 ? Math.round((metrics.funnelCompleted5 / totalUsers) * 100) : 0 },
        { label: "Streak de 7+ dias",    value: metrics.funnelStreak7,    pct: totalUsers > 0 ? Math.round((metrics.funnelStreak7    / totalUsers) * 100) : 0 },
      ]
    : []

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-xl font-extrabold text-level-purple-dark">Analytics</h2>
        <p className="text-sm text-muted-foreground">Métricas de engajamento e aprendizado</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {loadingMetrics ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-white p-5 animate-pulse">
              <div className="h-3 w-12 rounded bg-muted mb-2" />
              <div className="h-8 w-20 rounded bg-muted mb-1" />
              <div className="h-3 w-28 rounded bg-muted" />
            </div>
          ))
        ) : (
          [
            { label: "DAU",     value: dau.toLocaleString("pt-BR"),   sub: "usuários ativos hoje",            color: "text-level-purple" },
            { label: "WAU",     value: wau.toLocaleString("pt-BR"),   sub: "usuários ativos nos últimos 7d",  color: "text-level-purple-medium" },
            { label: "MAU",     value: mau.toLocaleString("pt-BR"),   sub: "usuários ativos nos últimos 30d", color: "text-level-purple-dark" },
            { label: "DAU/MAU", value: `${dauMau}%`,                  sub: "stickiness",                      color: "text-warning" },
          ].map((k) => (
            <div key={k.label} className="rounded-2xl border border-border bg-white p-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{k.label}</p>
              <p className={cn("mt-1 text-3xl font-extrabold", k.color)}>{k.value}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{k.sub}</p>
            </div>
          ))
        )}
      </div>

      <div className="rounded-2xl border border-border bg-white p-5">
        <p className="mb-4 text-sm font-extrabold text-level-purple-dark">Funil de aprendizado</p>
        {loadingMetrics ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-level-purple" />
          </div>
        ) : (
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
                    style={{ width: `${Math.max(s.pct, 2)}%` }}
                  >
                    {s.pct > 10 && (
                      <span className="text-[10px] font-bold text-white">{s.pct}%</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
