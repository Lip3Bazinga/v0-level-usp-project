import type { ReactNode } from "react"
import {
  EXPR_CHECKS, EXPR_CHECK_LABELS, EXPR_TYPE_SUGGESTIONS, MATCH_LABELS, MATCH_MODES, type DraftErrors, type TestCaseDraft,
} from "./drafts"
import { JsonInput, SelectField, TextArea, TextInput } from "./form-fields"

interface ExprFieldsProps {
  draft: TestCaseDraft
  errors: DraftErrors
  disabled?: boolean
  set: (changes: Partial<TestCaseDraft>) => void
}

/** Campos do caso "Avaliar expressão": preparação, expressão e o que verificar. */
export function ExprFields({ draft, errors, disabled, set }: ExprFieldsProps): ReactNode {
  const fieldId = (name: string): string => `${draft.key}-${name}`
  return (
    <div className="space-y-3">
      <TextArea
        id={fieldId("setup")}
        label="Preparação (opcional, roda depois do main.py)"
        value={draft.setup}
        mono
        rows={4}
        placeholder={'conta = ContaBancaria("Ana", 100)\nconta.depositar(50)'}
        disabled={disabled}
        error={errors.setup}
        onChange={(setup) => set({ setup })}
      />
      <TextInput
        id={fieldId("expression")}
        label="Expressão avaliada"
        value={draft.expression}
        mono
        placeholder="conta.saldo"
        disabled={disabled}
        error={errors.expression}
        onChange={(expression) => set({ expression })}
      />
      <SelectField
        id={fieldId("check")}
        label="O que verificar"
        value={draft.exprCheck}
        options={EXPR_CHECKS}
        labels={EXPR_CHECK_LABELS}
        disabled={disabled}
        onChange={(exprCheck) => set({ exprCheck })}
      />
      {draft.exprCheck === "raises" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput
            id={fieldId("raises")}
            label="Exceção esperada (subclasses valem)"
            value={draft.raises}
            mono
            placeholder="ValueError"
            disabled={disabled}
            error={errors.raises}
            onChange={(raises) => set({ raises })}
          />
          <TextInput
            id={fieldId("message")}
            label="A mensagem contém (opcional)"
            value={draft.messageContains}
            placeholder="saldo insuficiente"
            disabled={disabled}
            error={errors.messageContains}
            onChange={(messageContains) => set({ messageContains })}
          />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-[1fr_170px_150px]">
          <JsonInput
            id={fieldId("expected")}
            label="Valor esperado (JSON, opcional)"
            value={draft.expected}
            placeholder="150"
            disabled={disabled}
            error={errors.expected}
            onChange={(expected) => set({ expected })}
          />
          <TextInput
            id={fieldId("type")}
            label="Tipo (opcional)"
            value={draft.typeName}
            mono
            list={fieldId("type-options")}
            placeholder="int, generator, Tarefa"
            disabled={disabled}
            error={errors.typeName}
            onChange={(typeName) => set({ typeName })}
          />
          <datalist id={fieldId("type-options")}>
            {EXPR_TYPE_SUGGESTIONS.map((typeName) => <option key={typeName} value={typeName} />)}
          </datalist>
          <TextInput
            id={fieldId("tolerance")}
            label="Tolerância (floats)"
            value={draft.tolerance}
            mono
            placeholder="0.001"
            disabled={disabled}
            error={errors.tolerance}
            onChange={(tolerance) => set({ tolerance })}
          />
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <TextArea
          id={fieldId("stdout")}
          label="Saída impressa esperada (opcional)"
          value={draft.expectedStdout}
          placeholder="Carrinho: 2 itens"
          disabled={disabled}
          error={errors.expectedStdout}
          onChange={(expectedStdout) => set({ expectedStdout })}
        />
        <TextArea
          id={fieldId("stdin")}
          label="Entrada (stdin, opcional)"
          value={draft.stdin}
          placeholder={"Ana\n20"}
          disabled={disabled}
          error={errors.stdin}
          onChange={(stdin) => set({ stdin })}
        />
      </div>
      {draft.expectedStdout && (
        <SelectField
          id={fieldId("match")}
          label="Como comparar a saída"
          value={draft.match}
          options={MATCH_MODES}
          labels={MATCH_LABELS}
          disabled={disabled}
          onChange={(match) => set({ match })}
        />
      )}
      <p className="text-xs text-muted-foreground">
        A preparação e a expressão rodam no sandbox, junto com o código do aluno; o valor esperado fica só no
        servidor. Valores são comparados depois de convertidos para JSON (tuplas viram listas; use o tipo para exigir
        tuple, set...).
      </p>
    </div>
  )
}
