import { Star } from "lucide-react"
import type { CourseFormState } from "./course-form"
import { EditorSection, FIELD_CLASS, LABEL_CLASS } from "./editor-section"

const MAX_TITLE_LENGTH = 160

interface CourseFinalProjectSectionProps {
  form: CourseFormState
  onChange: (changes: Partial<CourseFormState>) => void
}

export function CourseFinalProjectSection({ form, onChange }: CourseFinalProjectSectionProps) {
  return (
    <EditorSection icon={Star} title="Projeto Final" subtitle="Desafio integrador — desbloqueado após todas as lições">
      <div className="space-y-4">
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3">
          <Star className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-xs text-amber-700">Aparece destacado na página do curso. O aluno só acessa após completar todas as lições.</p>
        </div>
        <div>
          <label htmlFor="course-final-title" className={LABEL_CLASS}>Título do Projeto</label>
          <input
            id="course-final-title"
            value={form.final_project_title}
            maxLength={MAX_TITLE_LENGTH}
            onChange={(event) => onChange({ final_project_title: event.target.value })}
            placeholder="Ex: Sistema de Análise de Dados"
            className={FIELD_CLASS}
          />
        </div>
        <div>
          <label htmlFor="course-final-desc" className={LABEL_CLASS}>Descrição</label>
          <textarea
            id="course-final-desc"
            value={form.final_project_description}
            onChange={(event) => onChange({ final_project_description: event.target.value })}
            rows={3}
            placeholder="O que o aluno deve construir..."
            className={`${FIELD_CLASS} resize-none`}
          />
        </div>
        <div>
          <label htmlFor="course-final-code" className={LABEL_CLASS}>
            Código Inicial <span className="ml-1 text-xs font-normal text-muted-foreground">(starter code)</span>
          </label>
          <div className="overflow-hidden rounded-xl border-2 border-border">
            <div className="bg-[#1E1E2E] px-4 py-2">
              <span className="text-xs font-medium text-gray-400">projeto_final.py</span>
            </div>
            <textarea
              id="course-final-code"
              value={form.final_project_starter_code}
              onChange={(event) => onChange({ final_project_starter_code: event.target.value })}
              rows={7}
              spellCheck={false}
              placeholder="# Código inicial do projeto final..."
              className="w-full resize-none border-0 bg-[#1E1E2E] px-4 py-3 font-mono text-sm text-gray-300 outline-none"
            />
          </div>
        </div>
      </div>
    </EditorSection>
  )
}
