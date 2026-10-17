import { useState } from "react"
import { Loader2, Plus, X } from "lucide-react"
import type { LibraryRequest } from "@levelusp/contracts"
import { useModalA11y } from "@/hooks/use-modal-a11y"
import { createLibraryRequest, getErrorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { MINI_LABEL_CLASS } from "./panel"

const FIELD_CLASS = "w-full rounded-xl border-2 border-border px-3 py-2.5 text-sm focus:border-level-purple focus:outline-none"

interface LibraryRequestModalProps {
  onClose: () => void
  onCreated: (request: LibraryRequest) => void
}

export function LibraryRequestModal({ onClose, onCreated }: LibraryRequestModalProps) {
  const [name, setName] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [useCase, setUseCase] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dialogRef = useModalA11y<HTMLDivElement>(true, onClose)

  const handleSend = async () => {
    if (!name.trim()) return
    setIsSending(true)
    setError(null)
    try {
      const created = await createLibraryRequest({
        library_name: name.trim(),
        display_name: displayName.trim() || undefined,
        use_case: useCase.trim() || undefined,
      })
      onCreated(created)
    } catch (sendError) {
      setError(getErrorMessage(sendError, "Não foi possível enviar a solicitação."))
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Solicitar nova biblioteca" className="w-full max-w-md rounded-3xl border border-border bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-level-purple-dark">Solicitar nova biblioteca</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              O admin receberá sua solicitação e avaliará a inclusão no catálogo.
            </p>
          </div>
          <button type="button" aria-label="Fechar" onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="lib-req-name" className={MINI_LABEL_CLASS}>
              Nome do pacote pip <span className="text-destructive">*</span>
            </label>
            <input id="lib-req-name" data-autofocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex: xgboost, torchvision" className={FIELD_CLASS} />
          </div>
          <div>
            <label htmlFor="lib-req-display" className={MINI_LABEL_CLASS}>Nome amigável</label>
            <input id="lib-req-display" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Ex: XGBoost, TorchVision" className={FIELD_CLASS} />
          </div>
          <div>
            <label htmlFor="lib-req-use" className={MINI_LABEL_CLASS}>Justificativa pedagógica</label>
            <textarea
              id="lib-req-use"
              value={useCase}
              onChange={(event) => setUseCase(event.target.value)}
              rows={3}
              placeholder="Para qual tópico/módulo precisa desta biblioteca? O que os alunos farão com ela?"
              className={cn(FIELD_CLASS, "resize-none")}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="mt-5 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border-2 border-border py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={isSending || !name.trim()}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-level-purple py-2.5 text-sm font-semibold text-white transition-colors hover:bg-level-purple-dark disabled:opacity-50"
          >
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Enviar solicitação
          </button>
        </div>
      </div>
    </div>
  )
}
