"use client"

import { useState } from "react"
import { FileText, Plus, X } from "lucide-react"
import { DIFFICULTIES, type Difficulty } from "@levelusp/contracts"
import { DIFFICULTY_BADGE_CLASSES, DIFFICULTY_LABELS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { addTag, type CourseFormState } from "./course-form"
import { EditorSection, FIELD_CLASS, LABEL_CLASS } from "./editor-section"

const MAX_TITLE_LENGTH = 160
const MAX_DESCRIPTION_LENGTH = 500
const MAX_ESTIMATED_HOURS = 1000

/** Cor do ponto de cada nível: a cor de fundo do selo de dificuldade. */
function levelDotClass(level: Difficulty): string {
  return DIFFICULTY_BADGE_CLASSES[level].split(" ")[0] ?? ""
}

interface CourseBasicsSectionProps {
  form: CourseFormState
  onChange: (changes: Partial<CourseFormState>) => void
}

export function CourseBasicsSection({ form, onChange }: CourseBasicsSectionProps): React.JSX.Element {
  const [tagDraft, setTagDraft] = useState("")

  const handleAddTag = (): void => {
    onChange({ tags: addTag(form.tags, tagDraft) })
    setTagDraft("")
  }

  return (
    <EditorSection icon={FileText} title="Informações Básicas" subtitle="Dados exibidos no catálogo">
      <div className="space-y-4">
        <div>
          <label htmlFor="course-title" className={LABEL_CLASS}>
            Título <span className="text-destructive">*</span>
          </label>
          <input
            id="course-title"
            value={form.title}
            maxLength={MAX_TITLE_LENGTH}
            onChange={(event) => onChange({ title: event.target.value })}
            placeholder="Ex: Python Básico"
            className={FIELD_CLASS}
          />
        </div>
        <div>
          <label htmlFor="course-description" className={LABEL_CLASS}>
            Descrição curta <span className="ml-1 text-xs font-normal text-muted-foreground">(card do catálogo)</span>
          </label>
          <textarea
            id="course-description"
            value={form.description}
            maxLength={MAX_DESCRIPTION_LENGTH}
            onChange={(event) => onChange({ description: event.target.value })}
            rows={2}
            placeholder="Uma frase que resume o curso..."
            className={cn(FIELD_CLASS, "resize-none")}
          />
        </div>
        <div>
          <label htmlFor="course-long" className={LABEL_CLASS}>
            Descrição longa <span className="ml-1 text-xs font-normal text-muted-foreground">(Markdown)</span>
          </label>
          <textarea
            id="course-long"
            value={form.long_description}
            onChange={(event) => onChange({ long_description: event.target.value })}
            rows={5}
            placeholder="Pré-requisitos, metodologia, o que o aluno vai aprender..."
            className={cn(FIELD_CLASS, "resize-none font-mono")}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className={LABEL_CLASS}>Nível</span>
            <div className="flex flex-col gap-2">
              {DIFFICULTIES.map((level) => (
                <button
                  key={level}
                  type="button"
                  aria-pressed={form.level === level}
                  onClick={() => onChange({ level })}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-left text-sm font-medium transition-all",
                    form.level === level
                      ? "border-level-purple bg-level-purple text-white"
                      : "border-border hover:border-level-purple hover:bg-level-purple-subtle",
                  )}
                >
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", levelDotClass(level))} />
                  {DIFFICULTY_LABELS[level]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="course-hours" className={LABEL_CLASS}>Horas estimadas</label>
            <input
              id="course-hours"
              type="number"
              value={form.estimated_hours}
              onChange={(event) => onChange({ estimated_hours: Number(event.target.value) })}
              min={0}
              max={MAX_ESTIMATED_HOURS}
              className={FIELD_CLASS}
            />
          </div>
        </div>
        <div>
          <label htmlFor="course-tag" className={LABEL_CLASS}>Tags</label>
          <div className="flex gap-2">
            <input
              id="course-tag"
              value={tagDraft}
              onChange={(event) => setTagDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return
                event.preventDefault()
                handleAddTag()
              }}
              placeholder="Ex: python, iniciante..."
              className={cn(FIELD_CLASS, "flex-1")}
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="flex items-center gap-1 rounded-xl bg-level-purple px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-level-purple-dark"
            >
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>
          {form.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {form.tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 rounded-full bg-level-purple-light px-3 py-1 text-xs font-medium text-level-purple-dark">
                  {tag}
                  <button
                    type="button"
                    aria-label={`Remover tag ${tag}`}
                    onClick={() => onChange({ tags: form.tags.filter((item) => item !== tag) })}
                    className="hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </EditorSection>
  )
}
