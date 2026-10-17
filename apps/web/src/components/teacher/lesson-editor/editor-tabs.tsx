import {
  Code2, FileText, FlaskConical, HelpCircle, ListChecks, Package, Settings, type LucideIcon,
} from "lucide-react"
import { LESSON_TYPES, type LessonType } from "@levelusp/contracts"
import { cn } from "@/lib/utils"

export type EditorTabId = "config" | "conteudo" | "questoes" | "exercicio" | "testes" | "checkpoints" | "libs"

interface EditorTab {
  id: EditorTabId
  label: string
  icon: LucideIcon
  types: readonly LessonType[]
}

export const EDITOR_TABS: readonly EditorTab[] = [
  { id: "config", label: "Configurações", icon: Settings, types: LESSON_TYPES },
  { id: "conteudo", label: "Conteúdo", icon: FileText, types: LESSON_TYPES },
  { id: "questoes", label: "Questões", icon: HelpCircle, types: ["quiz"] },
  { id: "exercicio", label: "Exercício", icon: Code2, types: ["coding"] },
  { id: "testes", label: "Testes", icon: FlaskConical, types: ["coding"] },
  { id: "checkpoints", label: "Checkpoints", icon: ListChecks, types: ["coding"] },
  { id: "libs", label: "Bibliotecas", icon: Package, types: ["coding"] },
]

export function isTabVisible(id: EditorTabId, type: LessonType): boolean {
  return EDITOR_TABS.find((tab) => tab.id === id)?.types.includes(type) ?? false
}

export interface TabBadge {
  text: string
  isDanger?: boolean
}

interface EditorTabsNavProps {
  current: EditorTabId
  lessonType: LessonType
  onChange: (id: EditorTabId) => void
  /** Marcador por aba (ex.: número de erros nos testes). */
  badges?: Partial<Record<EditorTabId, TabBadge>>
}

export function EditorTabsNav({ current, lessonType, onChange, badges }: EditorTabsNavProps) {
  return (
    <div className="sticky top-16 z-40 -mx-4 mb-8 border-b border-border bg-white/95 px-4 backdrop-blur sm:-mx-6 sm:px-6">
      <div role="tablist" className="flex items-center gap-1 overflow-x-auto">
        {EDITOR_TABS.filter((tab) => tab.types.includes(lessonType)).map((tab) => {
          const isActive = current === tab.id
          const Icon = tab.icon
          const badge = badges?.[tab.id]
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              className={cn(
                "relative flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors",
                isActive ? "text-level-purple" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {badge && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                    badge.isDanger ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground",
                  )}
                >
                  {badge.text}
                </span>
              )}
              {isActive && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-level-purple" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
