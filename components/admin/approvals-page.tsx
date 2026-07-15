"use client"

import { useState, useEffect } from "react"
import { Clock, Shield, Check, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { fetchPendingApprovals, approveTeacher, rejectTeacher } from "@/lib/supabase/admin"
import { useAuth } from "@/contexts/auth-context"
import type { TeacherApproval } from "@/lib/supabase/types"

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `há ${mins}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `há ${hrs}h`
  return `há ${Math.floor(hrs / 24)}d`
}

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("")
}

interface ApprovalsPageProps {
  onToast: (msg: string, kind?: "success" | "danger" | "info" | "warning") => void
}

export function ApprovalsPage({ onToast }: ApprovalsPageProps) {
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

  return (
    <div className="space-y-5 p-6">
      <div>
        <h2 className="text-xl font-extrabold text-level-purple-dark">Aprovações de professor</h2>
        <p className="text-sm text-muted-foreground">{approvals.length} pedido(s) aguardando revisão</p>
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
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Motivação</p>
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

      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-level-purple-dark/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
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
