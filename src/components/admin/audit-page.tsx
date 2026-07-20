"use client"

import { useState, useEffect } from "react"
import { Search, Download, Activity, AlertTriangle, X, History, Loader2 } from "lucide-react"
import { fetchAuditLog, exportToCsv } from "@/lib/supabase/admin"
import type { AuditLog } from "@/lib/supabase/types"
import { timeAgo } from "@/lib/utils"
import { cn } from "@/lib/utils"


const TONE_CLASSES: Record<string, string> = {
  info:    "bg-info/10 text-info",
  warning: "bg-warning/10 text-warning",
  danger:  "bg-destructive/10 text-destructive",
}

const SEVERITY_ICON: Record<string, typeof Activity> = {
  info:    Activity,
  warning: AlertTriangle,
  danger:  X,
}

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
          <button
            onClick={() => exportToCsv(
              filtered.map((a) => ({
                data: a.created_at,
                ator: a.actor_name,
                acao: a.action,
                alvo: a.target,
                severidade: a.severity,
              })),
              `audit-log-${new Date().toISOString().slice(0, 10)}.csv`,
            )}
            disabled={filtered.length === 0}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted disabled:opacity-50"
          >
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
            const Icon = SEVERITY_ICON[a.severity] ?? Activity
            return (
              <div key={a.id} className="flex items-center gap-4 p-3 hover:bg-muted/20">
                <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", TONE_CLASSES[a.severity])}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">
                    <b className="text-level-purple-dark">{a.actor_name}</b> {a.action}{" "}
                    <b>{a.target}</b>
                  </p>
                  <p className="font-mono text-[11px] text-muted-foreground">{timeAgo(a.created_at)}</p>
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
