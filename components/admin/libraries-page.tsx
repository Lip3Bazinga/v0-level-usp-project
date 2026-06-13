"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Package, CheckCircle2, X, Clock, ChevronDown, ChevronUp,
  Plus, AlertCircle, Search, Loader2, ExternalLink,
} from "lucide-react"
import {
  fetchAllLibraryRequests,
  reviewLibraryRequest,
  approveAndAddToLibrary,
  fetchLibraryCatalog,
} from "@/lib/supabase/libraries"
import type { LibraryCatalog, LibraryRequest } from "@/lib/supabase/types"
import { useAuth } from "@/contexts/auth-context"

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_STYLE = {
  pending:  "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
}
const STATUS_LABEL = { pending: "Pendente", approved: "Aprovado", rejected: "Rejeitado" }

const CATEGORY_OPTIONS = [
  { value: "data-science",  label: "Ciência de Dados" },
  { value: "ml",            label: "Machine Learning" },
  { value: "deep-learning", label: "Deep Learning" },
  { value: "visualization", label: "Visualização" },
  { value: "math",          label: "Matemática" },
  { value: "general",       label: "Geral" },
] as const

// ── Linha de requisição ───────────────────────────────────────────────────────

interface RequestRowProps {
  req: LibraryRequest
  onApprove: (req: LibraryRequest, opts: { category: LibraryCatalog["category"]; pyodide_native: boolean; notes: string }) => Promise<void>
  onReject: (req: LibraryRequest, notes: string) => Promise<void>
}

function RequestRow({ req, onApprove, onReject }: RequestRowProps) {
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState("")
  const [category, setCategory] = useState<LibraryCatalog["category"]>("general")
  const [pyodideNative, setPyodideNative] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleApprove = async () => {
    setLoading(true)
    await onApprove(req, { category, pyodide_native: pyodideNative, notes })
    setLoading(false)
  }

  const handleReject = async () => {
    setLoading(true)
    await onReject(req, notes)
    setLoading(false)
  }

  return (
    <div className="rounded-2xl border border-border bg-white overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-4 p-4 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-level-purple-subtle">
          <Package className="h-5 w-5 text-level-purple" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-foreground">{req.library_name}</span>
            {req.display_name && (
              <span className="text-sm text-muted-foreground">({req.display_name})</span>
            )}
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[req.status]}`}>
              {STATUS_LABEL[req.status]}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Por {req.requester_name} · {new Date(req.created_at).toLocaleDateString("pt-BR")}
          </p>
          {req.use_case && (
            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{req.use_case}</p>
          )}
        </div>
        {req.status === "pending" && (
          <span className="shrink-0 rounded-full bg-amber-100 p-1.5">
            <Clock className="h-3.5 w-3.5 text-amber-600" />
          </span>
        )}
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="border-t border-border px-4 pb-4 pt-3">
          {req.use_case && (
            <div className="mb-3 rounded-xl bg-muted/40 px-3 py-2.5 text-sm text-foreground">
              <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Justificativa</p>
              {req.use_case}
            </div>
          )}

          {req.status === "pending" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Categoria (se aprovar)
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as LibraryCatalog["category"])}
                    className="w-full rounded-xl border-2 border-border px-3 py-2 text-sm focus:border-level-purple focus:outline-none"
                  >
                    {CATEGORY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Suporte nativo Pyodide?
                  </label>
                  <div className="flex gap-2 pt-1">
                    {[{ v: true, l: "Sim (nativo)" }, { v: false, l: "Não (micropip)" }].map(({ v, l }) => (
                      <button
                        key={String(v)}
                        type="button"
                        onClick={() => setPyodideNative(v)}
                        className={`flex-1 rounded-xl border-2 px-2 py-1.5 text-xs font-medium transition-all ${
                          pyodideNative === v
                            ? "border-level-purple bg-level-purple text-white"
                            : "border-border text-foreground hover:border-level-purple"
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Notas de revisão (opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Ex: Aprovado — disponível no Pyodide 0.25 nativo"
                  className="w-full rounded-xl border-2 border-border px-3 py-2 text-sm focus:border-level-purple focus:outline-none resize-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleReject}
                  disabled={loading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-destructive/30 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50 transition-colors"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                  Rejeitar
                </button>
                <button
                  onClick={handleApprove}
                  disabled={loading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Aprovar + adicionar ao catálogo
                </button>
              </div>
            </div>
          )}

          {req.status !== "pending" && req.review_notes && (
            <div className="rounded-xl bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <span className="font-bold">Nota: </span>{req.review_notes}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Catálogo tab ──────────────────────────────────────────────────────────────

function CatalogView({ catalog, onToggle }: { catalog: LibraryCatalog[]; onToggle: (id: string, active: boolean) => void }) {
  const [search, setSearch] = useState("")
  const filtered = catalog.filter(
    (l) =>
      l.display_name.toLowerCase().includes(search.toLowerCase()) ||
      l.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar biblioteca..."
          className="w-full rounded-xl border-2 border-border pl-9 pr-4 py-2.5 text-sm focus:border-level-purple focus:outline-none"
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {filtered.map((lib) => (
          <div key={lib.id} className="flex items-center gap-3 rounded-xl border border-border bg-white p-3">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${lib.active ? "bg-level-purple" : "bg-muted"}`}>
              <Package className={`h-4 w-4 ${lib.active ? "text-white" : "text-muted-foreground"}`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{lib.display_name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-medium text-muted-foreground">{lib.name}</span>
                {lib.pyodide_native && (
                  <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">nativo</span>
                )}
              </div>
            </div>
            <button
              onClick={() => onToggle(lib.id, !lib.active)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                lib.active
                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {lib.active ? "Ativo" : "Inativo"}
            </button>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          <Package className="mx-auto mb-2 h-8 w-8 opacity-30" />
          <p className="text-sm">Nenhuma biblioteca encontrada</p>
        </div>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export function LibrariesAdminPage({ onToast }: { onToast: (msg: string, kind?: string) => void }) {
  const { profile } = useAuth()
  const [tab, setTab] = useState<"requests" | "catalog">("requests")
  const [requests, setRequests] = useState<LibraryRequest[]>([])
  const [catalog, setCatalog] = useState<LibraryCatalog[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [reqs, cat] = await Promise.all([fetchAllLibraryRequests(), fetchLibraryCatalog()])
      setRequests(reqs)
      setCatalog(cat)
    } catch {
      onToast("Erro ao carregar dados", "danger")
    } finally {
      setLoading(false)
    }
  }, [onToast])

  useEffect(() => { load() }, [load])

  const handleApprove = async (
    req: LibraryRequest,
    opts: { category: LibraryCatalog["category"]; pyodide_native: boolean; notes: string }
  ) => {
    if (!profile?.id) return
    try {
      await approveAndAddToLibrary(req.id, profile.id, opts.notes || undefined, {
        name: req.library_name,
        display_name: req.display_name || req.library_name,
        description: req.description || undefined,
        category: opts.category,
        pyodide_native: opts.pyodide_native,
      })
      setRequests((prev) => prev.map((r) => r.id === req.id ? { ...r, status: "approved" as const } : r))
      onToast(`✓ ${req.library_name} aprovada e adicionada ao catálogo`)
      load()
    } catch {
      onToast("Erro ao aprovar requisição", "danger")
    }
  }

  const handleReject = async (req: LibraryRequest, notes: string) => {
    if (!profile?.id) return
    try {
      await reviewLibraryRequest(req.id, profile.id, "rejected", notes || undefined)
      setRequests((prev) => prev.map((r) => r.id === req.id ? { ...r, status: "rejected" as const } : r))
      onToast(`Requisição de ${req.library_name} rejeitada`, "warning")
    } catch {
      onToast("Erro ao rejeitar requisição", "danger")
    }
  }

  const handleToggleCatalog = async (id: string, active: boolean) => {
    // Optimistic update
    setCatalog((prev) => prev.map((l) => l.id === id ? { ...l, active } : l))
    // TODO: implement toggleLibraryCatalog in lib (admin-only update)
    onToast(active ? "Biblioteca ativada" : "Biblioteca desativada")
  }

  const pending = requests.filter((r) => r.status === "pending")
  const reviewed = requests.filter((r) => r.status !== "pending")

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-level-purple-dark">Bibliotecas Python</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Gerencie o catálogo de pacotes disponíveis e revise solicitações de professores
          </p>
        </div>
        {pending.length > 0 && (
          <div className="flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-2 ring-1 ring-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-700">{pending.length} pendente{pending.length > 1 ? "s" : ""}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-2xl border border-border bg-muted/30 p-1">
        {([
          { id: "requests", label: "Requisições", count: pending.length },
          { id: "catalog",  label: "Catálogo",    count: catalog.length },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold transition-colors ${
              tab === t.id ? "bg-white text-level-purple-dark shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                tab === t.id && t.id === "requests" ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-level-purple" />
        </div>
      ) : tab === "catalog" ? (
        <CatalogView catalog={catalog} onToggle={handleToggleCatalog} />
      ) : (
        <div className="space-y-3">
          {pending.length > 0 && (
            <>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-600">Aguardando revisão</p>
              {pending.map((r) => (
                <RequestRow key={r.id} req={r} onApprove={handleApprove} onReject={handleReject} />
              ))}
            </>
          )}
          {reviewed.length > 0 && (
            <>
              <p className="mt-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Revisadas ({reviewed.length})
              </p>
              {reviewed.map((r) => (
                <RequestRow key={r.id} req={r} onApprove={handleApprove} onReject={handleReject} />
              ))}
            </>
          )}
          {requests.length === 0 && (
            <div className="py-16 text-center">
              <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground">Nenhuma requisição ainda</p>
              <p className="mt-1 text-xs text-muted-foreground">Professores podem solicitar bibliotecas no editor de lições</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
