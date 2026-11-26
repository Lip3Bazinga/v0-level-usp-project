"use client"

import { useState } from "react"
import { Play } from "lucide-react"
import { MAX_RUN_BUTTON_LEVEL, MIN_RUN_BUTTON_LEVEL, RUN_BUTTON_MIN_LEVEL, type Course } from "@levelusp/contracts"
import { AdminModal, ModalCancelButton, ModalSubmitButton } from "./admin-modal"

const FIELD_CLASS = "w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-level-purple focus:outline-none disabled:bg-muted/40"
const LABEL_CLASS = "mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground"

/** Resultado de ler o formulário: o valor para o PATCH (`null` = padrão da plataforma) ou o erro a mostrar. */
export type RunLevelParse = { ok: true; value: number | null } | { ok: false; error: string }

/** Valida o nível digitado; com "usar o padrão" marcado o valor é `null`. */
export function parseRunLevel(usesDefault: boolean, rawLevel: string): RunLevelParse {
  if (usesDefault) return { ok: true, value: null }
  const level = Number(rawLevel.trim())
  if (rawLevel.trim() === "" || !Number.isInteger(level) || level < MIN_RUN_BUTTON_LEVEL || level > MAX_RUN_BUTTON_LEVEL) {
    return { ok: false, error: `Informe um nível inteiro de ${MIN_RUN_BUTTON_LEVEL} a ${MAX_RUN_BUTTON_LEVEL}.` }
  }
  return { ok: true, value: level }
}

/** Como o limite do curso aparece na lista: o nível, "sempre liberado" (1) ou o padrão. */
export function runLevelLabel(level: number | null): string {
  if (level === null) return `Executar no nível ${RUN_BUTTON_MIN_LEVEL} (padrão)`
  return level <= MIN_RUN_BUTTON_LEVEL ? "Executar sempre liberado" : `Executar no nível ${level}`
}

interface RunLevelModalProps {
  course: Pick<Course, "id" | "title" | "run_button_min_level">
  onClose: () => void
  /** Grava o limite (`null` = padrão); a página cuida do aviso de sucesso ou erro. */
  onSave: (level: number | null) => Promise<void>
}

/** Ajuste, pelo admin, do nível do jogador que libera o botão "Executar" nas lições de um curso. */
export function RunLevelModal({ course, onClose, onSave }: RunLevelModalProps): React.JSX.Element {
  const [usesDefault, setUsesDefault] = useState(course.run_button_min_level === null)
  const [rawLevel, setRawLevel] = useState(String(course.run_button_min_level ?? RUN_BUTTON_MIN_LEVEL))
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async (): Promise<void> => {
    const parsed = parseRunLevel(usesDefault, rawLevel)
    if (!parsed.ok) {
      setError(parsed.error)
      return
    }
    setError(null)
    setIsSaving(true)
    try {
      await onSave(parsed.value)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AdminModal
      title="Nível do Executar"
      accessibleName={`Nível do Executar de ${course.title}`}
      icon={<Play className="h-5 w-5" />}
      bodyClassName="space-y-4 p-6"
      onClose={onClose}
      footer={
        <>
          <ModalCancelButton onClick={onClose} disabled={isSaving} />
          <ModalSubmitButton onClick={() => void handleSave()} isBusy={isSaving}>Salvar</ModalSubmitButton>
        </>
      }
    >
      <p className="text-sm text-muted-foreground">
        Nas lições de <strong className="text-level-purple-dark">{course.title}</strong>, o botão Executar só fica liberado quando o aluno chega a este
        nível; antes disso ele roda o código pelo terminal (<code className="font-mono">python main.py</code>). Professores e admins sempre veem o botão.
      </p>
      <label className="flex items-center gap-2 text-sm text-level-purple-dark">
        <input type="checkbox" checked={usesDefault} onChange={(event) => setUsesDefault(event.target.checked)} className="h-4 w-4 accent-level-purple" />
        Usar o padrão da plataforma (nível {RUN_BUTTON_MIN_LEVEL})
      </label>
      <div>
        <label htmlFor="run-level" className={LABEL_CLASS}>Nível que libera o Executar</label>
        <input
          id="run-level"
          type="number"
          inputMode="numeric"
          min={MIN_RUN_BUTTON_LEVEL}
          max={MAX_RUN_BUTTON_LEVEL}
          step={1}
          value={rawLevel}
          disabled={usesDefault}
          onChange={(event) => setRawLevel(event.target.value)}
          aria-describedby="run-level-help"
          className={FIELD_CLASS}
        />
        <p id="run-level-help" className="mt-1 text-xs text-muted-foreground">Use {MIN_RUN_BUTTON_LEVEL} para deixar o Executar sempre liberado neste curso.</p>
      </div>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </AdminModal>
  )
}
