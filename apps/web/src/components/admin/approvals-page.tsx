"use client"

import { useState, useEffect } from "react"
import { Clock, Shield, Check, X, Loader2 } from "lucide-react"
import type { TeacherApproval } from "@levelusp/contracts"
import { approveTeacher, errorMessage, fetchPendingApprovals, rejectTeacher } from "@/lib/api"
import { getInitials, timeAgo } from "@/lib/utils"
import type { OnToast } from "@/lib/types/ui"



interface ApprovalsPageProps {
  onToast: OnToast
}

export function ApprovalsPage({ onToast }: ApprovalsPageProps) {
  const [approvals, setApprovals] = useState<TeacherApproval[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")

  useEffect(() => {
    fetchPendingApprovals("pending")
      .then(setApprovals)
      .catch((err) => setLoadError(errorMessage(err, "Erro ao carregar aprovações")))
      .finally(() => setLoadingData(false))
  }, [])

  const approve = async (approval: TeacherApproval) => {
    setBusyId(approval.id)
    try {
      await approveTeacher(approval.id)
      setApprovals((prev) => prev.filter((a) => a.id !== approval.id))
      onToast(`${approval.name} aprovado(a) como professor(a)`, "success")
    } catch (err) {
      onToast(errorMessage(err, "Erro ao aprovar"), "danger")
    } finally {
      setBusyId(null)
    }
  }

  const reject = async () => {
    if (!rejectingId) return
    const id = rejectingId
    setBusyId(id)
    try {
      await rejectTeacher(id, rejectReason.trim() || undefined)
      setApprovals((prev) => prev.filter((a) => a.id !== id))
      setRejectingId(null)
      setRejectReason("")
      onToast("Solicitação rejeitada", "danger")
    } catch (err) {
      onToast(errorMessage(err, "Erro ao rejeitar"), "danger")
    } finally {
      setBusyId(null)
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

      {loadError && (
        <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{loadError}</p>
      )}

      {!loadingData && !loadError && approvals.length === 0 && (
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
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRejectingId(p.id)}
                  disabled={busyId === p.id}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-bold text-muted-foreground hover:border-destructive hover:bg-destructive hover:text-white"
                >
                  <X className="h-4 w-4" /> Rejeitar
                </button>
                <button
                  onClick={() => approve(p)}
                  disabled={busyId === p.id}
                  className="btn-3d flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-success px-3 py-2 text-sm font-bold text-white"
                  style={{ ["--btn-3d-shadow" as string]: "#059669" }}
                >
                  {busyId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Aprovar
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
                Explique brevemente o motivo (opcional — fica registrado na solicitação):
              </p>
              <textarea
                value={rejectReason}
                maxLength={1000}
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
                disabled={busyId === rejectingId}
                className="rounded-xl bg-destructive px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
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
