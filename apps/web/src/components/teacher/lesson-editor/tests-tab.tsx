import { AlertCircle, FlaskConical } from "lucide-react"
import { TestCasesEditor, type TestCaseDraft } from "../test-cases-editor"
import { EditorPanel } from "./panel"

export function TestsTab({ drafts, onChange, published }: {
  drafts: TestCaseDraft[]
  onChange: (drafts: TestCaseDraft[]) => void
  published: boolean
}) {
  return (
    <EditorPanel icon={FlaskConical} title="Casos de teste" subtitle="Como a resposta do aluno é corrigida">
      {drafts.length === 0 && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {published
            ? "Uma lição publicada precisa de pelo menos um caso de teste — o servidor vai recusar salvar sem casos."
            : "Sem casos de teste a lição pode ser salva como rascunho, mas não pode ser publicada."}
        </div>
      )}
      <TestCasesEditor value={drafts} onChange={onChange} />
    </EditorPanel>
  )
}
