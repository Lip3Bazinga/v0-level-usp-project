"use client"

import { useState } from "react"
import { Activity, AlertTriangle, Download, History, Search, X, type LucideIcon } from "lucide-react"
import type { AuditLog, AuditSeverity } from "@levelusp/contracts"
import { useAsyncResource } from "@/hooks/use-async-resource"
import { fetchAuditLog } from "@/lib/api"
import { cn, downloadCsv, formatDateTime, formatTimeAgo, todayKey } from "@/lib/utils"
import { PanelSpinner } from "./panel-spinner"

const AUDIT_PAGE_SIZE = 200

const SEVERITY_STYLES: Record<AuditSeverity, { icon: LucideIcon; toneClass: string }> = {
  info: { icon: Activity, toneClass: "bg-info/10 text-info" },
  warning: { icon: AlertTriangle, toneClass: "bg-warning/10 text-warning" },
  danger: { icon: X, toneClass: "bg-destructive/10 text-destructive" },
}

function matchesQuery(log: AuditLog, query: string): boolean {
  const term = query.toLowerCase()
  return [log.actor_name, log.target, log.action].some((field) => field.toLowerCase().includes(term))
}

function exportAuditLog(logs: AuditLog[]) {
  downloadCsv(
    logs.map((log) => ({
      data: log.created_at,
      ator: log.actor_name,
      acao: log.action,
      alvo: log.target,
      severidade: log.severity,
    })),
    `audit-log-${todayKey()}.csv`,
  )
}

export function AuditPage() {
  const [query, setQuery] = useState("")
  const auditLog = useAsyncResource(() => fetchAuditLog(AUDIT_PAGE_SIZE), [], {
    errorMessage: "Não foi possível carregar o log de auditoria.",
  })
  const logs = auditLog.status === "success" ? auditLog.data : []
  const filtered = query ? logs.filter((log) => matchesQuery(log, query)) : logs

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
              aria-label="Buscar no log de auditoria"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar ação, usuário, alvo..."
              className="w-full rounded-xl border border-border bg-white py-2 pl-9 pr-3 text-sm focus:border-level-purple focus:outline-none"
            />
          </div>
          <button
            onClick={() => exportAuditLog(filtered)}
            disabled={filtered.length === 0}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" /> Exportar
          </button>
        </div>

        {auditLog.status === "error" && (
          <p role="alert" className="border-b border-border bg-destructive/5 px-4 py-3 text-sm text-destructive">{auditLog.error}</p>
        )}

        {auditLog.status === "loading" && <PanelSpinner className="py-12" />}

        <div className="divide-y divide-border">
          {filtered.map((log) => (
            <AuditLogRow key={log.id} log={log} />
          ))}
          {auditLog.status !== "loading" && filtered.length === 0 && (
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

interface AuditLogRowProps {
  log: AuditLog
}

function AuditLogRow({ log }: AuditLogRowProps) {
  const { icon: Icon, toneClass } = SEVERITY_STYLES[log.severity]
  return (
    <div className="flex items-center gap-4 p-3 hover:bg-muted/20">
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", toneClass)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground">
          <b className="text-level-purple-dark">{log.actor_name}</b> {log.action} <b>{log.target}</b>
        </p>
        <p className="font-mono text-[11px] text-muted-foreground" title={formatDateTime(log.created_at)}>
          {formatTimeAgo(log.created_at)}
        </p>
      </div>
    </div>
  )
}
