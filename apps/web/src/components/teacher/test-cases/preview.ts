import type { CallCase, Json, SourceRule, TestCase } from "@levelusp/contracts"
import { CONSTRUCT_LABELS } from "./drafts"

/*
 * Prévia (no navegador do professor) da mensagem que o aluno verá quando o
 * caso falhar. Espelha as mensagens montadas pela API em
 * `apps/api/src/modules/grading/grading.domain.ts`; é só ilustrativa: o valor
 * "obtido" é um exemplo, pois depende do código de cada aluno.
 */

const DEFAULT_REPR_LENGTH = 120
const SHORT_REPR_LENGTH = 40

/** Representação curta estilo Python (mesma regra da API). */
export function pyRepr(value: Json | undefined, maxLength = DEFAULT_REPR_LENGTH): string {
  const text = render(value)
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text
}

function render(value: Json | undefined): string {
  if (value === undefined) return "?"
  if (value === null) return "None"
  if (value === true) return "True"
  if (value === false) return "False"
  if (typeof value === "string") return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`
  if (typeof value === "number") return String(value)
  if (Array.isArray(value)) return `[${value.map(render).join(", ")}]`
  return `{${Object.entries(value).map(([key, item]) => `'${key}': ${render(item)}`).join(", ")}}`
}

function describeRule(rule: SourceRule): string {
  switch (rule.type) {
    case "uses": return `use ${CONSTRUCT_LABELS[rule.construct] ?? rule.construct}`
    case "not_uses": return `não use ${CONSTRUCT_LABELS[rule.construct] ?? rule.construct}`
    case "calls": return `use a função ${rule.name}()`
    case "not_calls": return `não use a função ${rule.name}()`
    case "defines_function": return `defina a função ${rule.name}`
    case "defines_class": return `defina a classe ${rule.name}`
    case "imports": return `importe o módulo ${rule.module}`
  }
}

export function caseLabel(testCase: Pick<TestCase, "id" | "name">): string {
  return testCase.name ?? `Teste ${testCase.id}`
}

export function callSignature(testCase: CallCase): string {
  const parts = [
    ...(testCase.args ?? []).map((argument) => pyRepr(argument, SHORT_REPR_LENGTH)),
    ...Object.entries(testCase.kwargs ?? {}).map(([name, value]) => `${name}=${pyRepr(value, SHORT_REPR_LENGTH)}`),
  ]
  return `${testCase.function}(${parts.join(", ")})`
}

function failureMessage(testCase: TestCase): string {
  switch (testCase.kind) {
    case "call": {
      const call = callSignature(testCase)
      return testCase.reveal
        ? `${call} retornou <valor do aluno>; esperado ${pyRepr(testCase.expected)}`
        : `${call} retornou <valor do aluno>, que não é o esperado`
    }
    case "io":
      return testCase.reveal
        ? `esperado ${JSON.stringify(testCase.expected_stdout)}, obtido "<saída do aluno>"`
        : "a saída do programa não é a esperada"
    case "variable":
      return testCase.reveal
        ? `${testCase.variable} = <valor do aluno>; esperado ${pyRepr(testCase.expected)}`
        : `${testCase.variable} = <valor do aluno>, que não é o esperado`
    case "source":
      return describeRule(testCase.rule)
    case "legacy":
      return "mensagem do assert/unittest que falhou (ou \"Resposta incorreta.\")"
  }
}

/** Mensagem de falha que o aluno veria (com um valor "obtido" fictício). */
export function failurePreview(testCase: TestCase): { title: string; message: string } {
  const message = failureMessage(testCase)
  return { title: caseLabel(testCase), message: testCase.hint ? `${message} — dica: ${testCase.hint}` : message }
}
