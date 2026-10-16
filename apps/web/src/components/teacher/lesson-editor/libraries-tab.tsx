import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, Package, Plus, X } from "lucide-react"
import type { LibraryCatalog, LibraryCategory, LibraryRequest } from "@levelusp/contracts"
import { Badge } from "@/components/ui/badge"
import { errorMessage, fetchLibraryCatalog, fetchMyLibraryRequests } from "@/lib/api"
import { LibraryRequestModal } from "./library-request-modal"
import { EditorPanel } from "./panel"

const CATEGORY_LABELS: Record<LibraryCategory, string> = {
  "data-science": "Ciência de Dados",
  ml: "Machine Learning",
  "deep-learning": "Deep Learning",
  visualization: "Visualização",
  math: "Matemática",
  general: "Geral",
}
const CATEGORY_ORDER: LibraryCategory[] = ["data-science", "ml", "deep-learning", "visualization", "math", "general"]

export function LibrariesTab({ selected, onChange, onToast }: {
  selected: string[]
  onChange: (libs: string[]) => void
  onToast: (message: string) => void
}) {
  const [catalog, setCatalog] = useState<LibraryCatalog[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [requests, setRequests] = useState<LibraryRequest[]>([])
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchLibraryCatalog()
      .then((c) => !cancelled && setCatalog(c))
      .catch((err) => !cancelled && setLoadError(errorMessage(err, "Não foi possível carregar o catálogo.")))
      .finally(() => !cancelled && setLoading(false))
    fetchMyLibraryRequests()
      .then((r) => !cancelled && setRequests(r))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const byCategory = useMemo(
    () =>
      CATEGORY_ORDER.map((cat) => [cat, catalog.filter((l) => l.category === cat)] as const).filter(([, libs]) => libs.length),
    [catalog],
  )
  const pending = requests.filter((r) => r.status === "pending")
  const toggle = (name: string) => onChange(selected.includes(name) ? selected.filter((n) => n !== name) : [...selected, name])

  return (
    <EditorPanel
      icon={Package}
      title="Bibliotecas Python"
      subtitle={loading ? "Carregando catálogo..." : `${catalog.length} disponíveis`}
      action={
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 rounded-xl border-2 border-dashed border-level-purple bg-level-purple-subtle px-3 py-2 text-xs font-semibold text-level-purple transition-colors hover:bg-level-purple-light"
        >
          <Plus className="h-3.5 w-3.5" /> Solicitar nova
        </button>
      }
    >
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-muted/50" />)}
        </div>
      ) : loadError ? (
        <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{loadError}</p>
      ) : (
        <div className="space-y-4">
          {byCategory.map(([cat, libs]) => (
            <div key={cat}>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{CATEGORY_LABELS[cat]}</p>
              <div className="grid grid-cols-2 gap-2">
                {libs.map((lib) => {
                  const on = selected.includes(lib.name)
                  return (
                    <button
                      key={lib.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(lib.name)}
                      className={`flex items-center gap-2.5 rounded-xl border-2 p-2.5 text-left transition-all ${
                        on ? "border-level-purple bg-level-purple-light" : "border-border bg-white hover:border-level-purple-medium hover:bg-level-purple-subtle"
                      }`}
                    >
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${on ? "bg-level-purple" : "bg-level-purple-subtle"}`}>
                        {on ? <CheckCircle2 className="h-3.5 w-3.5 text-white" /> : <Plus className="h-3.5 w-3.5 text-level-purple" />}
                      </div>
                      <div className="min-w-0">
                        <p className={`truncate text-xs font-semibold ${on ? "text-level-purple-dark" : "text-foreground"}`}>{lib.display_name}</p>
                        {lib.pyodide_native && <p className="text-[10px] font-medium text-emerald-600">nativo</p>}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {selected.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
          {selected.map((name) => (
            <Badge key={name} className="flex items-center gap-1 border-0 bg-level-purple px-3 py-1 text-white">
              {catalog.find((l) => l.name === name)?.display_name ?? name}
              <button type="button" aria-label={`Remover ${name}`} onClick={() => toggle(name)} className="ml-1 rounded-full p-0.5 transition-colors hover:bg-white/20">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {pending.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="mb-1.5 text-xs font-bold text-amber-700">Requisições pendentes</p>
          {pending.map((r) => (
            <div key={r.id} className="flex items-center gap-2 text-xs text-amber-700">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              <span className="font-medium">{r.library_name}</span>
              <span className="text-amber-500">· aguardando aprovação</span>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <LibraryRequestModal
          onClose={() => setShowModal(false)}
          onCreated={(req) => {
            setRequests((prev) => [req, ...prev])
            setShowModal(false)
            onToast("Solicitação enviada ao admin.")
          }}
        />
      )}
    </EditorPanel>
  )
}
