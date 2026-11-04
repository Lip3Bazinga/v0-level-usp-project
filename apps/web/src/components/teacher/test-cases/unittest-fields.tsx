import type { ReactNode } from "react"
import { UNITTEST_EXPECTATIONS } from "@levelusp/contracts"
import {
  SUITE_EXPECTATION_LABELS, SUITE_TARGETS, SUITE_TARGET_LABELS, type DraftErrors, type TestCaseDraft,
} from "./drafts"
import { SelectField, TextArea, TextInput } from "./form-fields"

interface UnittestFieldsProps {
  draft: TestCaseDraft
  errors: DraftErrors
  disabled?: boolean | undefined
  set: (changes: Partial<TestCaseDraft>) => void
}

/** Campos do caso "Testes do aluno": contra qual implementação a suíte roda e o resultado esperado. */
export function UnittestFields({ draft, errors, disabled, set }: UnittestFieldsProps): ReactNode {
  const fieldId = (name: string): string => `${draft.key}-${name}`
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          id={fieldId("suite-target")}
          label="Rodar os testes do aluno contra"
          value={draft.suiteTarget}
          options={SUITE_TARGETS}
          labels={SUITE_TARGET_LABELS}
          disabled={disabled}
          onChange={(suiteTarget) => set({ suiteTarget })}
        />
        <SelectField
          id={fieldId("suite-expect")}
          label="Resultado esperado"
          value={draft.suiteExpect}
          options={UNITTEST_EXPECTATIONS}
          labels={SUITE_EXPECTATION_LABELS}
          disabled={disabled}
          onChange={(suiteExpect) => set({ suiteExpect })}
        />
      </div>
      {draft.suiteTarget === "teacher" && (
        <>
          <TextInput
            id={fieldId("target")}
            label="Nome substituído no main.py do aluno"
            value={draft.target}
            mono
            placeholder="validar_senha"
            disabled={disabled}
            error={errors.target}
            onChange={(target) => set({ target })}
          />
          <TextArea
            id={fieldId("implementation")}
            label="Implementação (deve definir o nome acima)"
            value={draft.implementation}
            mono
            rows={6}
            placeholder={"def validar_senha(senha):\n    return True  # mutante: aceita tudo"}
            disabled={disabled}
            error={errors.implementation}
            onChange={(implementation) => set({ implementation })}
          />
        </>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <TextInput
          id={fieldId("test-class")}
          label="Classe de testes (opcional)"
          value={draft.testClass}
          mono
          placeholder="TestValidarSenha"
          disabled={disabled}
          error={errors.testClass}
          onChange={(testClass) => set({ testClass })}
        />
        <TextInput
          id={fieldId("min-tests")}
          label="Mínimo de testes (opcional)"
          value={draft.minTests}
          mono
          placeholder="4"
          disabled={disabled}
          error={errors.minTests}
          onChange={(minTests) => set({ minTests })}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Crie um caso com a implementação correta (deve passar) e um caso para cada mutante com defeito (deve ser
        reprovado). O executor devolve só quantos testes rodaram e falharam; quem decide é o servidor.
      </p>
    </div>
  )
}
