import Link from "next/link"
import { GraduationCap } from "lucide-react"
import type { Course, Module } from "@levelusp/contracts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { LessonFormState } from "./lesson-form"
import { inputClass, labelClass } from "./panel"

const DIFFICULTIES = [
  { value: "iniciante", label: "Iniciante", color: "bg-success" },
  { value: "intermediario", label: "Intermediário", color: "bg-warning" },
  { value: "avancado", label: "Avançado", color: "bg-destructive" },
] as const

const LESSON_TYPES = [
  { value: "coding", label: "💻 Com IDE", desc: "Aluno escreve código" },
  { value: "theory", label: "📖 Teórica", desc: "Só leitura, sem IDE" },
  { value: "quiz", label: "❓ Questionário", desc: "Múltipla escolha" },
] as const

const NO_MODULE = "__none__"
const LEGACY_MODULE = "__legacy__"

export function ConfigTab({ form, patch, courses, modules }: {
  form: LessonFormState
  patch: (p: Partial<LessonFormState>) => void
  courses: Course[]
  modules: Module[]
}) {
  const moduleValue = form.module_id ?? (form.module ? LEGACY_MODULE : NO_MODULE)
  const selectTrigger = "h-12 rounded-xl border-2 border-border focus:border-level-purple focus:ring-0"

  return (
    <div className="mx-auto max-w-3xl space-y-5 rounded-2xl border-2 border-border bg-white p-6">
      <div className="space-y-2">
        <label htmlFor="lesson-title" className={labelClass}>
          Título <span className="text-destructive">*</span>
        </label>
        <input
          id="lesson-title"
          type="text"
          value={form.title}
          maxLength={160}
          onChange={(e) => patch({ title: e.target.value })}
          placeholder="Ex: Introdução a Variáveis em Python"
          className={inputClass}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="lesson-description" className={labelClass}>
          Descrição curta <span className="text-xs font-normal text-muted-foreground">(resumo da lição)</span>
        </label>
        <input
          id="lesson-description"
          type="text"
          value={form.description}
          maxLength={1000}
          onChange={(e) => patch({ description: e.target.value })}
          placeholder="Ex: Aprenda a declarar variáveis e os tipos básicos do Python"
          className={inputClass}
        />
      </div>

      <div className="space-y-2">
        <label className={`${labelClass} flex items-center gap-2`}>
          <GraduationCap className="h-4 w-4 text-level-purple" />
          Curso <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
        </label>
        {courses.length === 0 ? (
          <div className="flex items-center gap-2 rounded-xl border-2 border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
            <GraduationCap className="h-4 w-4 shrink-0" />
            Nenhum curso criado ainda.{" "}
            <Link href="/teacher/curso/new" className="font-medium text-level-purple hover:underline">
              Criar um curso
            </Link>
          </div>
        ) : (
          <Select value={form.course_id ?? "none"} onValueChange={(v) => patch({ course_id: v === "none" ? null : v })}>
            <SelectTrigger className={selectTrigger}>
              <SelectValue placeholder="Selecionar curso..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <span className="text-muted-foreground">Sem curso (lição avulsa)</span>
              </SelectItem>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <div className="flex items-center gap-2">
                    <span>{c.title}</span>
                    {!c.published && (
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">Rascunho</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {form.course_id && (
          <p className="text-xs text-muted-foreground">Esta lição aparecerá na página do curso selecionado.</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="lesson-order" className={labelClass}>Ordem</label>
          <input
            id="lesson-order"
            type="number"
            value={form.order}
            onChange={(e) => patch({ order: parseInt(e.target.value) || 1 })}
            min={1}
            className={inputClass}
          />
        </div>
        <div className="space-y-2">
          <label className={labelClass}>Módulo</label>
          <Select
            value={moduleValue}
            onValueChange={(v) => {
              if (v === NO_MODULE) patch({ module_id: null, module: "" })
              else if (v !== LEGACY_MODULE) patch({ module_id: v, module: modules.find((m) => m.id === v)?.title ?? "" })
            }}
          >
            <SelectTrigger className={selectTrigger}>
              <SelectValue placeholder="Selecionar módulo..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_MODULE}>
                <span className="text-muted-foreground">Sem módulo</span>
              </SelectItem>
              {!form.module_id && form.module && (
                <SelectItem value={LEGACY_MODULE}>{form.module}</SelectItem>
              )}
              {modules.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <span className={labelClass}>Dificuldade</span>
        <div className="flex gap-2">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.value}
              type="button"
              aria-pressed={form.difficulty === d.value}
              onClick={() => patch({ difficulty: d.value })}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                form.difficulty === d.value
                  ? "bg-level-purple text-white"
                  : "bg-level-purple-subtle text-level-purple-dark hover:bg-level-purple-light"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${d.color}`} />
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <span className={labelClass}>Tipo de aula</span>
        <div className="flex gap-2">
          {LESSON_TYPES.map((t) => {
            const active = form.lesson_type === t.value
            return (
              <button
                key={t.value}
                type="button"
                aria-pressed={active}
                onClick={() => patch({ lesson_type: t.value })}
                className={`flex-1 rounded-xl border-2 px-4 py-2.5 text-left text-sm transition-all ${
                  active ? "border-level-purple bg-level-purple text-white" : "border-border bg-white text-level-purple-dark hover:border-level-purple"
                }`}
              >
                <span className="font-medium">{t.label}</span>
                <p className={`mt-0.5 text-xs ${active ? "text-white/80" : "text-muted-foreground"}`}>{t.desc}</p>
              </button>
            )
          })}
        </div>
      </div>

      {form.lesson_type === "quiz" && (
        <div className="space-y-2">
          <label htmlFor="lesson-quiz-score" className={labelClass}>Nota mínima para concluir</label>
          <div className="relative max-w-[200px]">
            <input
              id="lesson-quiz-score"
              type="number"
              value={form.quiz_passing_score}
              onChange={(e) => patch({ quiz_passing_score: Math.min(100, Math.max(1, parseInt(e.target.value) || 1)) })}
              min={1}
              max={100}
              step={5}
              className={`${inputClass} pr-10`}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-level-purple">%</span>
          </div>
          <p className="text-xs text-muted-foreground">
            O aluno pode refazer quantas vezes quiser; o XP é creditado uma única vez ao atingir a nota.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="lesson-xp" className={labelClass}>Recompensa XP</label>
          <div className="relative">
            <input
              id="lesson-xp"
              type="number"
              value={form.xp_reward}
              onChange={(e) => patch({ xp_reward: parseInt(e.target.value) || 0 })}
              min={0}
              max={5000}
              step={10}
              className={`${inputClass} pr-12`}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-level-purple">XP</span>
          </div>
        </div>
        <div className="space-y-2">
          <label htmlFor="lesson-time" className={labelClass}>Tempo estimado</label>
          <div className="relative">
            <input
              id="lesson-time"
              type="number"
              value={form.time_limit}
              onChange={(e) => patch({ time_limit: parseInt(e.target.value) || 1 })}
              min={1}
              max={300}
              step={5}
              className={`${inputClass} pr-12`}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">min</span>
          </div>
        </div>
      </div>
    </div>
  )
}
