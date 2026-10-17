import {
  Code2, FileText, FlaskConical, HelpCircle, ListChecks, Package, Settings, type LucideIcon,
} from "lucide-react"
import type { LessonType } from "@levelusp/contracts"

export type EditorTabId = "config" | "conteudo" | "questoes" | "exercicio" | "testes" | "checkpoints" | "libs"

interface EditorTab {
  id: EditorTabId
  label: string
  icon: LucideIcon
  types: readonly LessonType[]
}

const ALL: readonly LessonType[] = ["coding", "theory", "quiz"]

export const EDITOR_TABS: readonly EditorTab[] = [
  { id: "config", label: "Configurações", icon: Settings, types: ALL },
  { id: "conteudo", label: "Conteúdo", icon: FileText, types: ALL },
  { id: "questoes", label: "Questões", icon: HelpCircle, types: ["quiz"] },
  { id: "exercicio", label: "Exercício", icon: Code2, types: ["coding"] },
  { id: "testes", label: "Testes", icon: FlaskConical, types: ["coding"] },
  { id: "checkpoints", label: "Checkpoints", icon: ListChecks, types: ["coding"] },
  { id: "libs", label: "Bibliotecas", icon: Package, types: ["coding"] },
]

export function isTabVisible(id: EditorTabId, type: LessonType): boolean {
  return EDITOR_TABS.find((t) => t.id === id)?.types.includes(type) ?? false
}

export function EditorTabsNav({ current, lessonType, onChange, badges }: {
  current: EditorTabId
  lessonType: LessonType
  onChange: (id: EditorTabId) => void
  /** Marcador por aba (ex.: número de erros nos testes). */
  badges?: Partial<Record<EditorTabId, { text: string; danger?: boolean }>>
}) {
  return (
    <div className="sticky top-16 z-40 -mx-6 mb-8 border-b border-border bg-white/95 px-6 backdrop-blur">
      <div role="tablist" className="flex items-center gap-1 overflow-x-auto">
        {EDITOR_TABS.filter((t) => t.types.includes(lessonType)).map((tab) => {
          const active = current === tab.id
          const Icon = tab.icon
          const badge = badges?.[tab.id]
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(tab.id)}
              className={`relative flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors ${
                active ? "text-level-purple" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {badge && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    badge.danger ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {badge.text}
                </span>
              )}
              {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-level-purple" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
