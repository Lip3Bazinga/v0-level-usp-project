"use client"

import { useState } from "react"
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Clock, Loader2, Package, Search, X } from "lucide-react"
import {
  LIBRARY_CATEGORIES, type LibraryCatalog, type LibraryCategory, type LibraryRequest, type LibraryRequestStatus,
} from "@levelusp/contracts"
import { LoadErrorAlert } from "@/components/design-system/load-error-alert"
import { useAsyncResource } from "@/hooks/use-async-resource"
import {
  fetchAdminLibraryCatalog, fetchAdminLibraryRequests, getErrorMessage, reviewLibraryRequest, setLibraryCatalogActive,
} from "@/lib/api"
import { LIBRARY_CATEGORY_LABELS } from "@/lib/constants"
import type { OnToast } from "@/lib/types"
import { cn, formatDate, isOneOf } from "@/lib/utils"
import { PanelSpinner } from "./panel-spinner"

const STATUS_STYLES: Record<LibraryRequestStatus, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "bg-amber-100 text-amber-700" },
  approved: { label: "Aprovado", className: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Rejeitado", className: "bg-red-100 text-red-700" },
}

const PYODIDE_OPTIONS = [
  { isNative: true, label: "Sim (nativo)" },
  { isNative: false, label: "Não (micropip)" },
] as const

const LABEL_CLASS = "mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground"

type LibrariesTab = "requests" | "catalog"

interface LibrariesData {
  requests: LibraryRequest[]
  catalog: LibraryCatalog[]
}

interface ApprovalOptions {
  category: LibraryCategory
  isPyodideNative: boolean
  notes: string
}

async function loadLibraries(): Promise<LibrariesData> {
  const [requests, catalog] = await Promise.all([fetchAdminLibraryRequests(), fetchAdminLibraryCatalog()])
  return { requests, catalog }
}

interface LibrariesPageProps {
  onToast: OnToast
}

export function LibrariesPage({ onToast }: LibrariesPageProps) {
  const [tab, setTab] = useState<LibrariesTab>("requests")
  const libraries = useAsyncResource(loadLibraries, [], { errorMessage: "Erro ao carregar dados" })
  const { requests, catalog } = libraries.status === "success" ? libraries.data : { requests: [], catalog: [] }
  const pending = requests.filter((request) => request.status === "pending")
  const reviewed = requests.filter((request) => request.status !== "pending")

  const applyReview = (reviewedRequest: LibraryRequest) =>
    libraries.setData((current) => ({
      ...current,
      requests: current.requests.map((request) =>
        request.id === reviewedRequest.id ? { ...request, ...reviewedRequest, requester_name: request.requester_name } : request,
      ),
    }))

  const setCatalogActive = (libraryId: string, active: boolean) =>
    libraries.setData((current) => ({
      ...current,
      catalog: current.catalog.map((library) => (library.id === libraryId ? { ...library, active } : library)),
    }))

  const handleApprove = async (request: LibraryRequest, { category, isPyodideNative, notes }: ApprovalOptions) => {
    try {
      // A API aprova e inclui no catálogo na mesma operação.
      const reviewedRequest = await reviewLibraryRequest(request.id, {
        status: "approved",
        review_notes: notes.trim() || undefined,
        catalog: {
          display_name: request.display_name || request.library_name,
          description: request.description || null,
          category,
          pyodide_native: isPyodideNative,
        },
      })
      applyReview(reviewedRequest)
      onToast(`✓ ${request.library_name} aprovada e adicionada ao catálogo`)
      void libraries.reload()
    } catch (error) {
      onToast(getErrorMessage(error, "Erro ao aprovar requisição"), "error")
    }
  }

  const handleReject = async (request: LibraryRequest, notes: string) => {
    try {
      applyReview(await reviewLibraryRequest(request.id, { status: "rejected", review_notes: notes.trim() || undefined }))
      onToast(`Requisição de ${request.library_name} rejeitada`, "warning")
    } catch (error) {
      onToast(getErrorMessage(error, "Erro ao rejeitar requisição"), "error")
    }
  }

  const handleToggleCatalog = async (libraryId: string, active: boolean) => {
    setCatalogActive(libraryId, active)
    try {
      await setLibraryCatalogActive(libraryId, active)
      onToast(active ? "Biblioteca ativada" : "Biblioteca desativada")
    } catch (error) {
      setCatalogActive(libraryId, !active)
      onToast(getErrorMessage(error, "Erro ao atualizar biblioteca"), "error")
    }
  }

  const tabs = [
    { id: "requests", label: "Requisições", count: pending.length },
    { id: "catalog", label: "Catálogo", count: catalog.length },
  ] as const

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-level-purple-dark">Bibliotecas Python</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Gerencie o catálogo de pacotes disponíveis e revise solicitações de professores</p>
        </div>
        {pending.length > 0 && (
          <div className="flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-2 ring-1 ring-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-700">
              {pending.length} pendente{pending.length > 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      <div className="mb-6 flex gap-1 rounded-2xl border border-border bg-muted/30 p-1">
        {tabs.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold transition-colors",
              tab === item.id ? "bg-white text-level-purple-dark shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
            {item.count > 0 && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                  tab === item.id && item.id === "requests" ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground",
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {libraries.status === "loading" ? (
        <PanelSpinner className="py-16" />
      ) : libraries.status === "error" ? (
        <LoadErrorAlert message={libraries.error} onRetry={() => void libraries.reload()} />
      ) : tab === "catalog" ? (
        <CatalogView catalog={catalog} onToggle={handleToggleCatalog} />
      ) : (
        <div className="space-y-3">
          {pending.length > 0 && (
            <>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-600">Aguardando revisão</p>
              {pending.map((request) => (
                <RequestRow key={request.id} request={request} onApprove={handleApprove} onReject={handleReject} />
              ))}
            </>
          )}
          {reviewed.length > 0 && (
            <>
              <p className="mt-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Revisadas ({reviewed.length})</p>
              {reviewed.map((request) => (
                <RequestRow key={request.id} request={request} onApprove={handleApprove} onReject={handleReject} />
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

interface RequestRowProps {
  request: LibraryRequest
  onApprove: (request: LibraryRequest, options: ApprovalOptions) => Promise<void>
  onReject: (request: LibraryRequest, notes: string) => Promise<void>
}

function RequestRow({ request, onApprove, onReject }: RequestRowProps) {
  const [isOpen, setIsOpen] = useState(false)
  const status = STATUS_STYLES[request.status]
  const isPending = request.status === "pending"

  return (
    <div className="rounded-2xl border border-border bg-white overflow-hidden">
      <button
        onClick={() => setIsOpen((wasOpen) => !wasOpen)}
        aria-expanded={isOpen}
        className="flex w-full items-start gap-4 p-4 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-level-purple-subtle">
          <Package className="h-5 w-5 text-level-purple" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-foreground">{request.library_name}</span>
            {request.display_name && <span className="text-sm text-muted-foreground">({request.display_name})</span>}
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", status.className)}>{status.label}</span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Por {request.requester_name ?? "professor"} · {formatDate(request.created_at)}
          </p>
          {request.use_case && <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{request.use_case}</p>}
        </div>
        {isPending && (
          <span className="shrink-0 rounded-full bg-amber-100 p-1.5">
            <Clock className="h-3.5 w-3.5 text-amber-600" />
          </span>
        )}
        {isOpen ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </button>

      {isOpen && (
        <div className="border-t border-border px-4 pb-4 pt-3">
          {request.use_case && (
            <div className="mb-3 rounded-xl bg-muted/40 px-3 py-2.5 text-sm text-foreground">
              <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Justificativa</p>
              {request.use_case}
            </div>
          )}

          {isPending && <ReviewForm request={request} onApprove={onApprove} onReject={onReject} />}

          {!isPending && request.review_notes && (
            <div className="rounded-xl bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <span className="font-bold">Nota: </span>
              {request.review_notes}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ReviewForm({ request, onApprove, onReject }: RequestRowProps) {
  const [notes, setNotes] = useState("")
  const [category, setCategory] = useState<LibraryCategory>("general")
  const [isPyodideNative, setIsPyodideNative] = useState(false)
  const [isReviewing, setIsReviewing] = useState(false)
  const fieldId = `library-request-${request.id}`

  const review = async (action: () => Promise<void>) => {
    setIsReviewing(true)
    await action()
    setIsReviewing(false)
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${fieldId}-category`} className={LABEL_CLASS}>Categoria (se aprovar)</label>
          <select
            id={`${fieldId}-category`}
            value={category}
            onChange={(event) => {
              if (isOneOf(LIBRARY_CATEGORIES, event.target.value)) setCategory(event.target.value)
            }}
            className="w-full rounded-xl border-2 border-border px-3 py-2 text-sm focus:border-level-purple focus:outline-none"
          >
            {LIBRARY_CATEGORIES.map((option) => (
              <option key={option} value={option}>{LIBRARY_CATEGORY_LABELS[option]}</option>
            ))}
          </select>
        </div>
        <div>
          <span className={LABEL_CLASS}>Suporte nativo Pyodide?</span>
          <div className="flex gap-2 pt-1">
            {PYODIDE_OPTIONS.map((option) => (
              <button
                key={String(option.isNative)}
                type="button"
                aria-pressed={isPyodideNative === option.isNative}
                onClick={() => setIsPyodideNative(option.isNative)}
                className={cn(
                  "flex-1 rounded-xl border-2 px-2 py-1.5 text-xs font-medium transition-all",
                  isPyodideNative === option.isNative
                    ? "border-level-purple bg-level-purple text-white"
                    : "border-border text-foreground hover:border-level-purple",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label htmlFor={`${fieldId}-notes`} className={LABEL_CLASS}>Notas de revisão (opcional)</label>
        <textarea
          id={`${fieldId}-notes`}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={2}
          placeholder="Ex: Aprovado — disponível no Pyodide 0.25 nativo"
          className="w-full rounded-xl border-2 border-border px-3 py-2 text-sm focus:border-level-purple focus:outline-none resize-none"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => review(() => onReject(request, notes))}
          disabled={isReviewing}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-destructive/30 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50 transition-colors"
        >
          {isReviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
          Rejeitar
        </button>
        <button
          onClick={() => review(() => onApprove(request, { category, isPyodideNative, notes }))}
          disabled={isReviewing}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {isReviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Aprovar + adicionar ao catálogo
        </button>
      </div>
    </div>
  )
}

interface CatalogViewProps {
  catalog: LibraryCatalog[]
  onToggle: (libraryId: string, active: boolean) => void
}

function CatalogView({ catalog, onToggle }: CatalogViewProps) {
  const [search, setSearch] = useState("")
  const term = search.toLowerCase()
  const filtered = catalog.filter(
    (library) => library.display_name.toLowerCase().includes(term) || library.name.toLowerCase().includes(term),
  )

  return (
    <div>
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          aria-label="Buscar biblioteca"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar biblioteca..."
          className="w-full rounded-xl border-2 border-border pl-9 pr-4 py-2.5 text-sm focus:border-level-purple focus:outline-none"
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {filtered.map((library) => (
          <div key={library.id} className="flex items-center gap-3 rounded-xl border border-border bg-white p-3">
            <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", library.active ? "bg-level-purple" : "bg-muted")}>
              <Package className={cn("h-4 w-4", library.active ? "text-white" : "text-muted-foreground")} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{library.display_name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-medium text-muted-foreground">{library.name}</span>
                {library.pyodide_native && (
                  <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">nativo</span>
                )}
              </div>
            </div>
            <button
              onClick={() => onToggle(library.id, !library.active)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                library.active ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {library.active ? "Ativo" : "Inativo"}
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
