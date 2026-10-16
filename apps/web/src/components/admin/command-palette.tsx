"use client"

import { useEffect, useMemo, useState } from "react"
import { Search, Users, BookOpen, GraduationCap, X } from "lucide-react"
import type { Profile, Lesson } from "@/lib/supabase/types"

export interface CommandTarget {
  id: string
  label: string
  sublabel: string
  kind: "user" | "lesson" | "course"
  href?: string
  page?: string
}

interface CommandPaletteProps {
  users: Profile[]
  lessons: Lesson[]
  courses: { id: string; title: string }[]
  onNavigate: (page: string) => void
}

const KIND_META = {
  user: { Icon: Users, label: "Usuário" },
  lesson: { Icon: BookOpen, label: "Lição" },
  course: { Icon: GraduationCap, label: "Curso" },
}

/** Command palette do admin (⌘K). Busca usuários, lições e cursos. */
export function CommandPalette({ users, lessons, courses, onNavigate }: CommandPaletteProps) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")

  // Atalho ⌘K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // Expõe um abridor global simples para o input do TopBar
  useEffect(() => {
    ; (window as unknown as { __openAdminSearch?: () => void }).__openAdminSearch = () => setOpen(true)
    return () => { delete (window as unknown as { __openAdminSearch?: () => void }).__openAdminSearch }
  }, [])

  const results = useMemo<CommandTarget[]>(() => {
    const term = q.trim().toLowerCase()
    if (!term) return []
    const out: CommandTarget[] = []
    for (const u of users) {
      if (u.full_name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term) || (u.username ?? "").toLowerCase().includes(term)) {
        out.push({ id: u.id, label: u.full_name, sublabel: u.email, kind: "user", page: "users" })
      }
    }

    for (const l of lessons) {
      if (l.title.toLowerCase().includes(term) || l.module.toLowerCase().includes(term)) {
        out.push({ id: l.id, label: l.title, sublabel: l.module, kind: "lesson", page: "lessons", href: `/teacher/edit/${l.id}` })
      }
    }
    for (const c of courses) {
      if (c.title.toLowerCase().includes(term)) {
        out.push({ id: c.id, label: c.title, sublabel: "Curso", kind: "course", page: "courses", href: `/teacher/curso/${c.id}` })
      }
    }
    return out.slice(0, 20)
  }, [q, users, lessons, courses])

  if (!open) return null

  const handleSelect = (t: CommandTarget) => {
    setOpen(false)
    setQ("")
    if (t.href) window.open(t.href, "_blank")
    else if (t.page) onNavigate(t.page)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-level-purple-dark/40 p-4 pt-[12vh] backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar usuário, lição, curso..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <button onClick={() => setOpen(false)} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {q.trim() === "" ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">Digite para buscar em usuários, lições e cursos.</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">Nenhum resultado para “{q}”.</p>
          ) : (
            results.map((t) => {
              const { Icon, label } = KIND_META[t.kind]
              return (
                <button
                  key={`${t.kind}-${t.id}`}
                  onClick={() => handleSelect(t)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-level-purple-subtle/50"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-level-purple-light text-level-purple">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-level-purple-dark">{t.label}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{t.sublabel}</p>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">{label}</span>
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
