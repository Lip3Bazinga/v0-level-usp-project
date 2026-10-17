"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { BookOpen, Clock, Lock, Star } from "lucide-react"
import type { Lesson } from "@levelusp/contracts"
import type { CourseFormState } from "./course-form"

const GRADIENTS: Record<string, string> = {
  iniciante: "from-violet-500 to-purple-700",
  intermediario: "from-amber-500 to-orange-600",
  avancado: "from-rose-500 to-red-700",
}
export const LEVEL_COLOR: Record<string, string> = {
  iniciante: "bg-green-100 text-green-700",
  intermediario: "bg-yellow-100 text-yellow-700",
  avancado: "bg-red-100 text-red-700",
}
export const LEVEL_LABEL: Record<string, string> = {
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  avancado: "Avançado",
}

/** Prévia ao vivo da página pública do curso. */
export function CoursePreview({ form, coverPreview, lessons }: {
  form: CourseFormState
  coverPreview: string | null
  lessons: Lesson[]
}) {
  const gradient = GRADIENTS[form.level] ?? "from-violet-500 to-purple-700"
  const hasFinalProject = !!form.final_project_title.trim()

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-level-purple/30 bg-background shadow-xl">
      <div className="flex items-center justify-between border-b border-level-purple/20 bg-level-purple-subtle px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-level-purple" />
          <span className="text-xs font-semibold text-level-purple">Preview ao vivo</span>
        </div>
        <span className="text-[10px] text-muted-foreground">Atualiza em tempo real</span>
      </div>

      <div className={`relative flex flex-col items-start justify-end bg-linear-to-br ${gradient} p-5 text-white`} style={{ minHeight: 160 }}>
        {coverPreview && <img src={coverPreview} alt="Capa" className="absolute inset-0 h-full w-full object-cover opacity-30" />}
        <div className="relative z-10 w-full">
          <div className="mb-2 flex flex-wrap gap-1.5">
            <span className={`rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold ${LEVEL_COLOR[form.level]}`}>
              {LEVEL_LABEL[form.level]}
            </span>
            {form.tags.slice(0, 2).map((t) => (
              <span key={t} className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium">{t}</span>
            ))}
          </div>
          <h1 className="text-lg font-bold leading-tight">{form.title || "Título do Curso"}</h1>
          <p className="mt-0.5 line-clamp-2 text-xs text-white/80">{form.description || "Descrição curta..."}</p>
          <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-white/70">
            <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{lessons.length} lições</span>
            {form.estimated_hours > 0 && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{form.estimated_hours}h</span>}
          </div>
        </div>
      </div>

      <div className="border-b border-border bg-white px-4 py-3">
        <button type="button" tabIndex={-1} className="w-full rounded-lg bg-level-purple py-2 text-xs font-bold text-white opacity-80">
          Matricular-se — Grátis
        </button>
      </div>

      {form.long_description && (
        <div className="border-b border-border px-4 py-3">
          <h3 className="mb-1.5 text-xs font-bold text-level-purple-dark">Sobre este curso</h3>
          <div className="prose prose-xs line-clamp-4 max-w-none text-[11px] text-muted-foreground">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{form.long_description}</ReactMarkdown>
          </div>
        </div>
      )}

      {lessons.length > 0 && (
        <div className="border-b border-border px-4 py-3">
          <h3 className="mb-2 text-xs font-bold text-level-purple-dark">
            Conteúdo <span className="font-normal text-muted-foreground">({lessons.length} lições{hasFinalProject ? " + projeto" : ""})</span>
          </h3>
          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
            {lessons.slice(0, 4).map((l, i) => (
              <div key={l.id} className="flex items-center gap-2 px-3 py-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-bold text-muted-foreground">{i + 1}</span>
                <span className="flex-1 truncate text-[11px] text-muted-foreground">{l.title}</span>
                <Lock className="h-3 w-3 shrink-0 text-muted-foreground/50" />
              </div>
            ))}
            {lessons.length > 4 && <div className="px-3 py-1.5 text-center text-[10px] text-muted-foreground">+ {lessons.length - 4} mais</div>}
          </div>
        </div>
      )}

      {hasFinalProject && (
        <div className="px-4 py-3">
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
            <div className="mb-1 flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 text-yellow-500" />
              <span className="text-xs font-bold text-level-purple-dark">Projeto Final</span>
            </div>
            <p className="line-clamp-2 text-[11px] text-muted-foreground">{form.final_project_title}</p>
          </div>
        </div>
      )}
    </div>
  )
}
