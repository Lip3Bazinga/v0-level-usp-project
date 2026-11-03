import { useMemo, useState } from "react"
import { CheckCircle2, Package, Plus, X } from "lucide-react"
import { LIBRARY_CATEGORIES, type LibraryCatalog, type LibraryCategory, type LibraryRequest } from "@levelusp/contracts"
import { Badge } from "@/components/ui/badge"
import { useAsyncResource } from "@/hooks/use-async-resource"
import { fetchLibraryCatalog, fetchMyLibraryRequests } from "@/lib/api"
import { LIBRARY_CATEGORY_LABELS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { LibraryRequestModal } from "./library-request-modal"
import { EditorPanel } from "./panel"

const PLACEHOLDER_COUNT = 3
const NO_LIBRARIES: LibraryCatalog[] = []

/** Os pedidos do professor só mostram o que está pendente; sem eles a aba funciona normalmente. */
async function loadMyRequests(): Promise<LibraryRequest[]> {
  try {
    return await fetchMyLibraryRequests()
  } catch {
    return []
  }
}

interface LibraryGroup {
  category: LibraryCategory
  libraries: LibraryCatalog[]
}

function groupByCategory(catalog: LibraryCatalog[]): LibraryGroup[] {
  return LIBRARY_CATEGORIES.map((category) => ({
    category,
    libraries: catalog.filter((library) => library.category === category),
  })).filter((group) => group.libraries.length > 0)
}

interface LibrariesTabProps {
  selected: string[]
  onChange: (libraries: string[]) => void
  onToast: (message: string) => void
}

export function LibrariesTab({ selected, onChange, onToast }: LibrariesTabProps): React.JSX.Element {
  const catalog = useAsyncResource(() => fetchLibraryCatalog(), [], { errorMessage: "Não foi possível carregar o catálogo." })
  const requests = useAsyncResource(loadMyRequests, [])
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false)

  const libraries = catalog.status === "success" ? catalog.data : NO_LIBRARIES
  const groups = useMemo(() => groupByCategory(libraries), [libraries])
  const pendingRequests = requests.status === "success" ? requests.data.filter((request) => request.status === "pending") : []

  const handleToggle = (name: string): void => onChange(selected.includes(name) ? selected.filter((item) => item !== name) : [...selected, name])

  const handleRequestCreated = (created: LibraryRequest): void => {
    requests.setData((current) => [created, ...current])
    setIsRequestModalOpen(false)
    onToast("Solicitação enviada ao admin.")
  }

  return (
    <EditorPanel
      icon={Package}
      title="Bibliotecas Python"
      subtitle={catalog.status === "loading" ? "Carregando catálogo..." : `${libraries.length} disponíveis`}
      action={
        <button
          type="button"
          onClick={() => setIsRequestModalOpen(true)}
          className="flex items-center gap-1.5 rounded-xl border-2 border-dashed border-level-purple bg-level-purple-subtle px-3 py-2 text-xs font-semibold text-level-purple transition-colors hover:bg-level-purple-light"
        >
          <Plus className="h-3.5 w-3.5" /> Solicitar nova
        </button>
      }
    >
      {catalog.status === "loading" ? (
        <div className="space-y-2">
          {Array.from({ length: PLACEHOLDER_COUNT }, (_, index) => (
            <div key={index} className="h-12 animate-pulse rounded-xl bg-muted/50" />
          ))}
        </div>
      ) : catalog.status === "error" ? (
        <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{catalog.error}</p>
      ) : (
        <div className="space-y-4">
          {groups.map(({ category, libraries: categoryLibraries }) => (
            <div key={category}>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{LIBRARY_CATEGORY_LABELS[category]}</p>
              <div className="grid grid-cols-2 gap-2">
                {categoryLibraries.map((library) => (
                  <LibraryOption
                    key={library.id}
                    library={library}
                    isSelected={selected.includes(library.name)}
                    onToggle={() => handleToggle(library.name)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {selected.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
          {selected.map((name) => (
            <Badge key={name} className="flex items-center gap-1 border-0 bg-level-purple px-3 py-1 text-white">
              {libraries.find((library) => library.name === name)?.display_name ?? name}
              <button
                type="button"
                aria-label={`Remover ${name}`}
                onClick={() => handleToggle(name)}
                className="ml-1 rounded-full p-0.5 transition-colors hover:bg-white/20"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {pendingRequests.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="mb-1.5 text-xs font-bold text-amber-700">Requisições pendentes</p>
          {pendingRequests.map((request) => (
            <div key={request.id} className="flex items-center gap-2 text-xs text-amber-700">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              <span className="font-medium">{request.library_name}</span>
              <span className="text-amber-500">· aguardando aprovação</span>
            </div>
          ))}
        </div>
      )}

      {isRequestModalOpen && <LibraryRequestModal onClose={() => setIsRequestModalOpen(false)} onCreated={handleRequestCreated} />}
    </EditorPanel>
  )
}

interface LibraryOptionProps {
  library: LibraryCatalog
  isSelected: boolean
  onToggle: () => void
}

function LibraryOption({ library, isSelected, onToggle }: LibraryOptionProps): React.JSX.Element {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onToggle}
      className={cn(
        "flex items-center gap-2.5 rounded-xl border-2 p-2.5 text-left transition-all",
        isSelected ? "border-level-purple bg-level-purple-light" : "border-border bg-white hover:border-level-purple-medium hover:bg-level-purple-subtle",
      )}
    >
      <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", isSelected ? "bg-level-purple" : "bg-level-purple-subtle")}>
        {isSelected ? <CheckCircle2 className="h-3.5 w-3.5 text-white" /> : <Plus className="h-3.5 w-3.5 text-level-purple" />}
      </div>
      <div className="min-w-0">
        <p className={cn("truncate text-xs font-semibold", isSelected ? "text-level-purple-dark" : "text-foreground")}>{library.display_name}</p>
        {library.pyodide_native && <p className="text-[10px] font-medium text-emerald-600">nativo</p>}
      </div>
    </button>
  )
}
