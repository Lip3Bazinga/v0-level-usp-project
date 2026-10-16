import { ChevronDown, ChevronUp, ListChecks, Plus, Trash2 } from "lucide-react"
import type { Checkpoint } from "@levelusp/contracts"
import { addButtonClass, EditorPanel, miniLabelClass, smallInputClass } from "./panel"

export function CheckpointsTab({ checkpoints, onChange }: {
  checkpoints: Checkpoint[]
  onChange: (next: Checkpoint[]) => void
}) {
  const add = () =>
    onChange([
      ...checkpoints,
      { id: checkpoints.length ? Math.max(...checkpoints.map((c) => c.id)) + 1 : 1, instruction: "", hint: "" },
    ])
  const update = (id: number, patch: Partial<Checkpoint>) => onChange(checkpoints.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  const remove = (id: number) => onChange(checkpoints.filter((c) => c.id !== id))
  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir
    if (target < 0 || target >= checkpoints.length) return
    const copy = [...checkpoints]
    ;[copy[idx], copy[target]] = [copy[target]!, copy[idx]!]
    onChange(copy)
  }

  return (
    <EditorPanel
      icon={ListChecks}
      title="Instruções (Checkpoints)"
      subtitle="Passos guiados que o aluno vê no painel da lição"
      action={
        <button type="button" onClick={add} disabled={checkpoints.length >= 50} className={addButtonClass}>
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
          {checkpoints.map((cp, idx) => (
            <div key={cp.id} className="rounded-xl border-2 border-border p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-level-purple">Passo {idx + 1}</span>
                <div className="flex items-center gap-1">
                  <button type="button" aria-label="Mover para cima" onClick={() => move(idx, -1)} disabled={idx === 0}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-30">
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button type="button" aria-label="Mover para baixo" onClick={() => move(idx, 1)} disabled={idx === checkpoints.length - 1}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-30">
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button type="button" aria-label="Remover passo" onClick={() => remove(cp.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <label className={miniLabelClass}>Instrução</label>
                  <textarea
                    value={cp.instruction}
                    maxLength={2000}
                    onChange={(e) => update(cp.id, { instruction: e.target.value })}
                    rows={2}
                    placeholder="Ex: Defina a função soma(a, b) que retorna a + b"
                    className={`${smallInputClass} resize-none`}
                  />
                </div>
                <div>
                  <label className={miniLabelClass}>Dica (opcional)</label>
                  <input
                    value={cp.hint ?? ""}
                    maxLength={2000}
                    onChange={(e) => update(cp.id, { hint: e.target.value })}
                    placeholder="Ex: Use return a + b"
                    className={smallInputClass}
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
