import Link from "next/link"
import { GraduationCap } from "lucide-react"
import { DIFFICULTIES, LESSON_TYPES, type Course, type Difficulty, type LessonType, type Module } from "@levelusp/contracts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DIFFICULTY_LABELS, ROUTES } from "@/lib/constants"
import { cn } from "@/lib/utils"
import type { LessonFormState } from "./lesson-form"
import { INPUT_CLASS, LABEL_CLASS } from "./panel"

const DIFFICULTY_DOT_CLASSES: Record<Difficulty, string> = {
  iniciante: "bg-success",
  intermediario: "bg-warning",
  avancado: "bg-destructive",
}

const LESSON_TYPE_OPTIONS: Record<LessonType, { label: string; description: string }> = {
  coding: { label: "💻 Com IDE", description: "Aluno escreve código" },
  theory: { label: "📖 Teórica", description: "Só leitura, sem IDE" },
  quiz: { label: "❓ Questionário", description: "Múltipla escolha" },
}

/** Valores especiais do seletor (os demais são ids). */
const NO_COURSE = "none"
const NO_MODULE = "__none__"
const LEGACY_MODULE = "__legacy__"

const SELECT_TRIGGER_CLASS = "h-12 rounded-xl border-2 border-border focus:border-level-purple focus:ring-0"

const LIMITS = {
  quizPassingScore: { min: 1, max: 100 },
} as const

/** Inteiro digitado no campo, ou `fallback` quando vazio/inválido. */
function parseIntegerOr(text: string, fallback: number): number {
  return Number.parseInt(text, 10) || fallback
}

interface ConfigTabProps {
  form: LessonFormState
  onChange: (changes: Partial<LessonFormState>) => void
  courses: Course[]
  modules: Module[]
}

export function ConfigTab({ form, onChange: patch, courses, modules }: ConfigTabProps) {
  const moduleValue = form.module_id ?? (form.module ? LEGACY_MODULE : NO_MODULE)

  const handleModuleChange = (value: string) => {
    if (value === NO_MODULE) patch({ module_id: null, module: "" })
    // O módulo legado (só título) não é uma escolha nova: mantém como está.
    else if (value !== LEGACY_MODULE) patch({ module_id: value, module: modules.find((item) => item.id === value)?.title ?? "" })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 rounded-2xl border-2 border-border bg-white p-6">
      <div className="space-y-2">
        <label htmlFor="lesson-title" className={LABEL_CLASS}>
          Título <span className="text-destructive">*</span>
        </label>
        <input
          id="lesson-title"
          type="text"
          value={form.title}
          maxLength={160}
          onChange={(event) => patch({ title: event.target.value })}
          placeholder="Ex: Introdução a Variáveis em Python"
          className={INPUT_CLASS}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="lesson-description" className={LABEL_CLASS}>
          Descrição curta <span className="text-xs font-normal text-muted-foreground">(resumo da lição)</span>
        </label>
        <input
          id="lesson-description"
          type="text"
          value={form.description}
          maxLength={1000}
          onChange={(event) => patch({ description: event.target.value })}
          placeholder="Ex: Aprenda a declarar variáveis e os tipos básicos do Python"
          className={INPUT_CLASS}
        />
      </div>

      <div className="space-y-2">
        <label className={cn(LABEL_CLASS, "flex items-center gap-2")}>
          <GraduationCap className="h-4 w-4 text-level-purple" />
          Curso <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
        </label>
        {courses.length === 0 ? (
          <div className="flex items-center gap-2 rounded-xl border-2 border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
            <GraduationCap className="h-4 w-4 shrink-0" />
            Nenhum curso criado ainda.{" "}
            <Link href={ROUTES.teacherNewCourse} className="font-medium text-level-purple hover:underline">
              Criar um curso
            </Link>
          </div>
        ) : (
          <Select value={form.course_id ?? NO_COURSE} onValueChange={(value) => patch({ course_id: value === NO_COURSE ? null : value })}>
            <SelectTrigger aria-label="Curso" className={SELECT_TRIGGER_CLASS}>
              <SelectValue placeholder="Selecionar curso..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_COURSE}>
                <span className="text-muted-foreground">Sem curso (lição avulsa)</span>
              </SelectItem>
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  <div className="flex items-center gap-2">
                    <span>{course.title}</span>
                    {!course.published && (
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
          <label htmlFor="lesson-order" className={LABEL_CLASS}>Ordem</label>
          <input
            id="lesson-order"
            type="number"
            value={form.order}
            onChange={(event) => patch({ order: parseIntegerOr(event.target.value, 1) })}
            min={1}
            className={INPUT_CLASS}
          />
        </div>
        <div className="space-y-2">
          <label className={LABEL_CLASS}>Módulo</label>
          <Select value={moduleValue} onValueChange={handleModuleChange}>
            <SelectTrigger aria-label="Módulo" className={SELECT_TRIGGER_CLASS}>
              <SelectValue placeholder="Selecionar módulo..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_MODULE}>
                <span className="text-muted-foreground">Sem módulo</span>
              </SelectItem>
              {!form.module_id && form.module && (
                <SelectItem value={LEGACY_MODULE}>{form.module}</SelectItem>
              )}
              {modules.map((learningModule) => (
                <SelectItem key={learningModule.id} value={learningModule.id}>{learningModule.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <span className={LABEL_CLASS}>Dificuldade</span>
        <div className="flex flex-wrap gap-2">
          {DIFFICULTIES.map((difficulty) => (
            <button
              key={difficulty}
              type="button"
              aria-pressed={form.difficulty === difficulty}
              onClick={() => patch({ difficulty })}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all",
                form.difficulty === difficulty
                  ? "bg-level-purple text-white"
                  : "bg-level-purple-subtle text-level-purple-dark hover:bg-level-purple-light",
              )}
            >
              <span className={cn("h-2 w-2 rounded-full", DIFFICULTY_DOT_CLASSES[difficulty])} />
              {DIFFICULTY_LABELS[difficulty]}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <span className={LABEL_CLASS}>Tipo de lição</span>
        <div className="flex flex-col gap-2 sm:flex-row">
          {LESSON_TYPES.map((lessonType) => {
            const isActive = form.lesson_type === lessonType
            const { label, description } = LESSON_TYPE_OPTIONS[lessonType]
            return (
              <button
                key={lessonType}
                type="button"
                aria-pressed={isActive}
                onClick={() => patch({ lesson_type: lessonType })}
                className={cn(
                  "flex-1 rounded-xl border-2 px-4 py-2.5 text-left text-sm transition-all",
                  isActive ? "border-level-purple bg-level-purple text-white" : "border-border bg-white text-level-purple-dark hover:border-level-purple",
                )}
              >
                <span className="font-medium">{label}</span>
                <p className={cn("mt-0.5 text-xs", isActive ? "text-white/90" : "text-muted-foreground")}>{description}</p>
              </button>
            )
          })}
        </div>
      </div>

      {form.lesson_type === "quiz" && (
        <div className="space-y-2">
          <label htmlFor="lesson-quiz-score" className={LABEL_CLASS}>Nota mínima para concluir</label>
          <div className="relative max-w-[200px]">
            <input
              id="lesson-quiz-score"
              type="number"
              value={form.quiz_passing_score}
              onChange={(event) => {
                const { min, max } = LIMITS.quizPassingScore
                patch({ quiz_passing_score: Math.min(max, Math.max(min, parseIntegerOr(event.target.value, min))) })
              }}
              min={1}
              max={100}
              step={5}
              className={cn(INPUT_CLASS, "pr-10")}
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
          <label htmlFor="lesson-xp" className={LABEL_CLASS}>Recompensa XP</label>
          <div className="relative">
            <input
              id="lesson-xp"
              type="number"
              value={form.xp_reward}
              onChange={(event) => patch({ xp_reward: parseIntegerOr(event.target.value, 0) })}
              min={0}
              max={5000}
              step={10}
              className={cn(INPUT_CLASS, "pr-12")}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-level-purple">XP</span>
          </div>
        </div>
        <div className="space-y-2">
          <label htmlFor="lesson-time" className={LABEL_CLASS}>Tempo estimado</label>
          <div className="relative">
            <input
              id="lesson-time"
              type="number"
              value={form.time_limit}
              onChange={(event) => patch({ time_limit: parseIntegerOr(event.target.value, 1) })}
              min={1}
              max={300}
              step={5}
              className={cn(INPUT_CLASS, "pr-12")}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">min</span>
          </div>
        </div>
      </div>
    </div>
  )
}
