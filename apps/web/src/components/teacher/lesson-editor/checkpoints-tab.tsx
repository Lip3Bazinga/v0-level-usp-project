import { ChevronDown, ChevronUp, ListChecks, Plus, Trash2 } from "lucide-react"
import type { Checkpoint } from "@levelusp/contracts"
import { moveItem, type MoveDirection } from "@/lib/utils/list-editing"
import { ADD_BUTTON_CLASS, EditorPanel, MINI_LABEL_CLASS, SMALL_INPUT_CLASS } from "./panel"

const MAX_CHECKPOINTS = 50
const MAX_TEXT_LENGTH = 2000
const ORDER_BUTTON_CLASS = "flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-30"

function nextCheckpointId(checkpoints: Checkpoint[]): number {
  return checkpoints.length ? Math.max(...checkpoints.map((checkpoint) => checkpoint.id)) + 1 : 1
}

interface CheckpointsTabProps {
  checkpoints: Checkpoint[]
  onChange: (next: Checkpoint[]) => void
}

export function CheckpointsTab({ checkpoints, onChange }: CheckpointsTabProps) {
  const handleAdd = () => onChange([...checkpoints, { id: nextCheckpointId(checkpoints), instruction: "", hint: "" }])
  const handleUpdate = (checkpointId: number, changes: Partial<Checkpoint>) =>
    onChange(checkpoints.map((checkpoint) => (checkpoint.id === checkpointId ? { ...checkpoint, ...changes } : checkpoint)))
  const handleRemove = (checkpointId: number) => onChange(checkpoints.filter((checkpoint) => checkpoint.id !== checkpointId))
  const handleMove = (index: number, direction: MoveDirection) => onChange(moveItem(checkpoints, index, direction))

  return (
    <EditorPanel
      icon={ListChecks}
      title="Instruções (Checkpoints)"
      subtitle="Passos guiados que o aluno vê no painel da lição"
      action={
        <button type="button" onClick={handleAdd} disabled={checkpoints.length >= MAX_CHECKPOINTS} className={ADD_BUTTON_CLASS}>
          <Plus className="h-4 w-4" /> Adicionar passo
        </button>
      }
    >
      {checkpoints.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border py-8 text-center">
          <ListChecks className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nenhum passo ainda. Adicione instruções para guiar o aluno.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {checkpoints.map((checkpoint, index) => (
            <div key={checkpoint.id} className="rounded-xl border-2 border-border p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-level-purple">Passo {index + 1}</span>
                <div className="flex items-center gap-1">
                  <button type="button" aria-label="Mover para cima" onClick={() => handleMove(index, -1)} disabled={index === 0} className={ORDER_BUTTON_CLASS}>
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Mover para baixo"
                    onClick={() => handleMove(index, 1)}
                    disabled={index === checkpoints.length - 1}
                    className={ORDER_BUTTON_CLASS}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Remover passo"
                    onClick={() => handleRemove(checkpoint.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <label htmlFor={`checkpoint-${checkpoint.id}-instruction`} className={MINI_LABEL_CLASS}>Instrução</label>
                  <textarea
                    id={`checkpoint-${checkpoint.id}-instruction`}
                    value={checkpoint.instruction}
                    maxLength={MAX_TEXT_LENGTH}
                    onChange={(event) => handleUpdate(checkpoint.id, { instruction: event.target.value })}
                    rows={2}
                    placeholder="Ex: Defina a função soma(a, b) que retorna a + b"
                    className={`${SMALL_INPUT_CLASS} resize-none`}
                  />
                </div>
                <div>
                  <label htmlFor={`checkpoint-${checkpoint.id}-hint`} className={MINI_LABEL_CLASS}>Dica (opcional)</label>
                  <input
                    id={`checkpoint-${checkpoint.id}-hint`}
                    value={checkpoint.hint ?? ""}
                    maxLength={MAX_TEXT_LENGTH}
                    onChange={(event) => handleUpdate(checkpoint.id, { hint: event.target.value })}
                    placeholder="Ex: Use return a + b"
                    className={SMALL_INPUT_CLASS}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </EditorPanel>
  )
}
