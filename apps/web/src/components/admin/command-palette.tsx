"use client"

import { useEffect, useMemo, useState } from "react"
import { BookOpen, GraduationCap, Search, Users, X } from "lucide-react"
import type { Course, Lesson, Profile } from "@levelusp/contracts"
import { useModalA11y } from "@/hooks/use-modal-a11y"
import { ROUTES } from "@/lib/constants"
import type { AdminPageId } from "./admin-pages"

type CommandKind = "user" | "lesson" | "course"

export interface CommandTarget {
  id: string
  label: string
  sublabel: string
  kind: CommandKind
  page: AdminPageId
  /** Quando presente, abre em nova aba em vez de trocar de seção. */
  href?: string
}

interface CommandSources {
  users: Pick<Profile, "id" | "full_name" | "email" | "username">[]
  lessons: Pick<Lesson, "id" | "title" | "module">[]
  courses: Pick<Course, "id" | "title">[]
}

interface CommandPaletteProps extends CommandSources {
  onNavigate: (page: AdminPageId) => void
}

const OPEN_ADMIN_SEARCH_EVENT = "levelusp:open-admin-search"
const MAX_RESULTS = 20

/** Abre a paleta de comandos de qualquer lugar do painel. */
export function openAdminSearch(): void {
  window.dispatchEvent(new Event(OPEN_ADMIN_SEARCH_EVENT))
}

const KIND_META = {
  user: { Icon: Users, label: "Usuário" },
  lesson: { Icon: BookOpen, label: "Lição" },
  course: { Icon: GraduationCap, label: "Curso" },
} as const satisfies Record<CommandKind, unknown>

function includesTerm(term: string, ...fields: (string | null)[]): boolean {
  return fields.some((field) => (field ?? "").toLowerCase().includes(term))
}

/** Usuários, lições e cursos cujo texto contém a busca, nessa ordem. */
export function searchCommandTargets(query: string, { users, lessons, courses }: CommandSources): CommandTarget[] {
  const term = query.trim().toLowerCase()
  if (!term) return []
  const userTargets = users
    .filter((user) => includesTerm(term, user.full_name, user.email, user.username))
    .map((user): CommandTarget => ({ id: user.id, label: user.full_name, sublabel: user.email, kind: "user", page: "users" }))
  const lessonTargets = lessons
    .filter((lesson) => includesTerm(term, lesson.title, lesson.module))
    .map((lesson): CommandTarget => ({
      id: lesson.id,
      label: lesson.title,
      sublabel: lesson.module || "Lição",
      kind: "lesson",
      page: "lessons",
      href: ROUTES.teacherLesson(lesson.id),
    }))
  const courseTargets = courses
    .filter((course) => includesTerm(term, course.title))
    .map((course): CommandTarget => ({
      id: course.id,
      label: course.title,
      sublabel: "Curso",
      kind: "course",
      page: "courses",
      href: ROUTES.teacherCourse(course.id),
    }))
  return [...userTargets, ...lessonTargets, ...courseTargets].slice(0, MAX_RESULTS)
}

/** Command palette do admin (⌘K). Busca usuários, lições e cursos. */
export function CommandPalette({ users, lessons, courses, onNavigate }: CommandPaletteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const close = () => setIsOpen(false)
  const dialogRef = useModalA11y<HTMLDivElement>(isOpen, close)

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setIsOpen((wasOpen) => !wasOpen)
      }
    }
    window.addEventListener("keydown", handleShortcut)
    return () => window.removeEventListener("keydown", handleShortcut)
  }, [])

  // O campo de busca do TopBar fica em outra árvore; um evento de janela evita prop drilling.
  useEffect(() => {
    const handleOpenRequest = () => setIsOpen(true)
    window.addEventListener(OPEN_ADMIN_SEARCH_EVENT, handleOpenRequest)
    return () => window.removeEventListener(OPEN_ADMIN_SEARCH_EVENT, handleOpenRequest)
  }, [])

  const results = useMemo(() => searchCommandTargets(query, { users, lessons, courses }), [query, users, lessons, courses])

  if (!isOpen) return null

  const handleSelect = (target: CommandTarget) => {
    setIsOpen(false)
    setQuery("")
    if (target.href) window.open(target.href, "_blank")
    else onNavigate(target.page)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-level-purple-dark/40 p-4 pt-[12vh] backdrop-blur-sm" onClick={close}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Buscar no painel"
        className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            // Foco imediato (sem esperar o quadro do useModalA11y) para não perder o que já foi digitado após ⌘K.
            autoFocus
            aria-label="Buscar usuário, lição ou curso"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar usuário, lição, curso..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            type="button"
            aria-label="Fechar busca"
            onClick={close}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {query.trim() === "" ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">Digite para buscar em usuários, lições e cursos.</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">Nenhum resultado para “{query}”.</p>
          ) : (
            results.map((target) => <CommandResult key={`${target.kind}-${target.id}`} target={target} onSelect={handleSelect} />)
          )}
        </div>
      </div>
    </div>
  )
}

interface CommandResultProps {
  target: CommandTarget
  onSelect: (target: CommandTarget) => void
}

function CommandResult({ target, onSelect }: CommandResultProps) {
  const { Icon, label } = KIND_META[target.kind]
  return (
    <button
      onClick={() => onSelect(target)}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-level-purple-subtle/50"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-level-purple-light text-level-purple">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-level-purple-dark">{target.label}</p>
        <p className="truncate text-[11px] text-muted-foreground">{target.sublabel}</p>
      </div>
      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">{label}</span>
    </button>
  )
}
