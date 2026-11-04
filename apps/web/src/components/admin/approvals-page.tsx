"use client"

import { useState, type CSSProperties } from "react"
import { Check, Clock, Loader2, Shield, X } from "lucide-react"
import type { TeacherApproval } from "@levelusp/contracts"
import { useAsyncResource } from "@/hooks/use-async-resource"
import { approveTeacher, fetchTeacherApprovals, getErrorMessage, rejectTeacher } from "@/lib/api"
import type { OnToast } from "@/lib/types"
import { formatTimeAgo, getInitials } from "@/lib/utils"
import { AdminModal, ModalCancelButton } from "./admin-modal"
import { PanelSpinner } from "./panel-spinner"

const SHORT_ID_LENGTH = 8
const MAX_REJECT_REASON_LENGTH = 1000
/** Sombra do `btn-3d` no tom do verde de sucesso (a variável CSS é lida pela classe). */
const APPROVE_BUTTON_STYLE: CSSProperties & Record<"--btn-3d-shadow", string> = { "--btn-3d-shadow": "#059669" }

interface ApprovalsPageProps {
  onToast: OnToast
}

export function ApprovalsPage({ onToast }: ApprovalsPageProps): React.JSX.Element {
  const approvals = useAsyncResource(() => fetchTeacherApprovals("pending"), [], {
    errorMessage: "Erro ao carregar aprovações",
  })
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<TeacherApproval | null>(null)
  const pending = approvals.status === "success" ? approvals.data : []

  const removeApproval = (approvalId: string): void =>
    approvals.setData((current) => current.filter((approval) => approval.id !== approvalId))

  const handleApprove = async (approval: TeacherApproval): Promise<void> => {
    setBusyId(approval.id)
    try {
      await approveTeacher(approval.id)
      removeApproval(approval.id)
      onToast(`${approval.name} aprovado(a) como professor(a)`, "success")
    } catch (error) {
      onToast(getErrorMessage(error, "Erro ao aprovar"), "error")
    } finally {
      setBusyId(null)
    }
  }

  const handleReject = async (approval: TeacherApproval, reason: string): Promise<void> => {
    setBusyId(approval.id)
    try {
      await rejectTeacher(approval.id, reason.trim() || undefined)
      removeApproval(approval.id)
      setRejecting(null)
      onToast("Solicitação rejeitada", "error")
    } catch (error) {
      onToast(getErrorMessage(error, "Erro ao rejeitar"), "error")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-5 p-6">
      <div>
        <h2 className="text-xl font-extrabold text-level-purple-dark">Aprovações de professor</h2>
        <p className="text-sm text-muted-foreground">{pending.length} pedido(s) aguardando revisão</p>
      </div>

      {approvals.status === "loading" && <PanelSpinner className="py-16" />}

      {approvals.status === "error" && (
        <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{approvals.error}</p>
      )}

      {approvals.status === "success" && pending.length === 0 && (
        <div className="rounded-2xl border border-dashed border-level-purple-medium bg-level-purple-subtle/30 py-16 text-center">
          <Shield className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-semibold text-muted-foreground">Nenhuma aprovação pendente</p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {pending.map((approval) => (
          <ApprovalCard
            key={approval.id}
            approval={approval}
            isBusy={busyId === approval.id}
            onApprove={() => void handleApprove(approval)}
            onReject={() => setRejecting(approval)}
          />
        ))}
      </div>

      {rejecting && (
        <RejectApprovalModal
          isBusy={busyId === rejecting.id}
          onClose={() => setRejecting(null)}
          onConfirm={(reason) => void handleReject(rejecting, reason)}
        />
      )}
    </div>
  )
}

interface ApprovalCardProps {
  approval: TeacherApproval
  isBusy: boolean
  onApprove: () => void
  onReject: () => void
}

function ApprovalCard({ approval, isBusy, onApprove, onReject }: ApprovalCardProps): React.JSX.Element {
  return (
    <div className="overflow-hidden rounded-2xl border border-warning/30 bg-white">
      <div className="flex items-center justify-between border-b border-warning/20 bg-warning/5 px-5 py-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-warning">
          <Clock className="h-3 w-3" /> Aguardando {formatTimeAgo(approval.submitted_at)}
        </span>
        <span className="text-[10px] text-muted-foreground">ID · {approval.id.slice(0, SHORT_ID_LENGTH)}</span>
      </div>
      <div className="p-5">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-level-purple-light text-sm font-extrabold text-level-purple-dark">
            {getInitials(approval.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-extrabold text-level-purple-dark">{approval.name}</p>
            <p className="text-xs text-muted-foreground">{approval.email}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{approval.institution}</p>
          </div>
        </div>

        <div className="mb-4 space-y-2">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Motivação</p>
            <p className="rounded-xl bg-muted/50 p-3 text-xs leading-relaxed text-foreground">{approval.motivation || "—"}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onReject}
            disabled={isBusy}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-bold text-muted-foreground hover:border-destructive hover:bg-destructive hover:text-white"
          >
            <X className="h-4 w-4" /> Rejeitar
          </button>
          <button
            onClick={onApprove}
            disabled={isBusy}
            className="btn-3d flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-success px-3 py-2 text-sm font-bold text-white"
            style={APPROVE_BUTTON_STYLE}
          >
            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Aprovar
          </button>
        </div>
      </div>
    </div>
  )
}

interface RejectApprovalModalProps {
  isBusy: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
}

function RejectApprovalModal({ isBusy, onClose, onConfirm }: RejectApprovalModalProps): React.JSX.Element {
  const [reason, setReason] = useState("")
  return (
    <AdminModal
      title="Rejeitar solicitação"
      icon={<X className="h-5 w-5" />}
      onClose={onClose}
      footer={
        <>
          <ModalCancelButton onClick={onClose} />
          <button
            onClick={() => onConfirm(reason)}
            disabled={isBusy}
            className="rounded-xl bg-destructive px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            Rejeitar
          </button>
        </>
      }
    >
      <label htmlFor="reject-reason" className="mb-3 block text-sm text-foreground">
        Explique brevemente o motivo (opcional — fica registrado na solicitação):
      </label>
      <textarea
        id="reject-reason"
        data-autofocus
        value={reason}
        maxLength={MAX_REJECT_REASON_LENGTH}
        onChange={(event) => setReason(event.target.value)}
        className="h-24 w-full rounded-xl border border-border bg-white p-3 text-sm focus:border-level-purple focus:outline-none"
        placeholder="Ex: Documento não corresponde à instituição informada..."
      />
    </AdminModal>
  )
}
