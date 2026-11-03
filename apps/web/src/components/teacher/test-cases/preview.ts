import type { CallCase, ExprCase, Json, SourceRule, TestCase, UnittestCase } from "@levelusp/contracts"
import { CONSTRUCT_LABELS } from "./drafts"

/*
 * Prévia (no navegador do professor) da mensagem que o aluno verá quando o
 * caso falhar. Espelha as mensagens montadas pela API em
 * `apps/api/src/modules/grading/grading.domain.ts`; é só ilustrativa: o valor
 * "obtido" é um exemplo, pois depende do código de cada aluno.
 */

const DEFAULT_REPR_LENGTH = 120
const SHORT_REPR_LENGTH = 40
const MAX_EXPRESSION_LENGTH = 60

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

function inFunction(functionName: string | undefined): string {
  return functionName === undefined ? "" : ` na função ${functionName}`
}

function describeRule(rule: SourceRule): string {
  switch (rule.type) {
    case "uses": return `use ${CONSTRUCT_LABELS[rule.construct] ?? rule.construct}${inFunction(rule.function)}`
    case "not_uses": return `não use ${CONSTRUCT_LABELS[rule.construct] ?? rule.construct}${inFunction(rule.function)}`
    case "calls": return `use a função ${rule.name}()`
    case "not_calls": return `não use a função ${rule.name}()`
    case "defines_function": return `defina a função ${rule.name}`
    case "defines_class": return `defina a classe ${rule.name}`
    case "imports": return `importe o módulo ${rule.module}`
    case "decorator": return `use o decorator @${rule.name}`
    case "catches": return `capture ${rule.exception} com except`
  }
}

export function caseLabel(testCase: Pick<TestCase, "id" | "name">): string {
  return testCase.name ?? `Teste ${testCase.id}`
}

export function callSignature(testCase: CallCase): string {
  const parts = [
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- casos do seed/importação são gravados sem passar pelo schema (campos com default podem faltar)
    ...(testCase.args ?? []).map((argument) => pyRepr(argument, SHORT_REPR_LENGTH)),
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- casos do seed/importação são gravados sem passar pelo schema (campos com default podem faltar)
    ...Object.entries(testCase.kwargs ?? {}).map(([name, value]) => `${name}=${pyRepr(value, SHORT_REPR_LENGTH)}`),
  ]
  return `${testCase.function}(${parts.join(", ")})`
}

/** Expressão encurtada numa linha, como a API mostra ao aluno. */
export function expressionLabel(testCase: Pick<ExprCase, "expr">): string {
  const expression = testCase.expr.replace(/\s+/g, " ")
  return expression.length > MAX_EXPRESSION_LENGTH ? `${expression.slice(0, MAX_EXPRESSION_LENGTH - 1)}…` : expression
}

function exprFailureMessage(testCase: ExprCase): string {
  const subject = expressionLabel(testCase)
  if (testCase.raises !== undefined) {
    return `${subject} deveria levantar ${testCase.raises}, mas não levantou nenhuma exceção`
  }
  if (testCase.expected === undefined && testCase.type !== undefined) {
    return `${subject} deveria ser do tipo ${testCase.type}, mas é <tipo do aluno>`
  }
  if (testCase.expected === undefined) return "o que foi impresso não é o esperado"
  return testCase.reveal
    ? `${subject} → <valor do aluno>; esperado ${pyRepr(testCase.expected)}`
    : `${subject} → <valor do aluno>, que não é o esperado`
}

function unittestFailureMessage(testCase: UnittestCase): string {
  const target = testCase.implementation === undefined ? "a sua implementação" : "esta implementação"
  return testCase.expect === "pass"
    ? `seus testes falharam contra ${target} (<testes que falharam>)`
    : `seus testes passaram contra ${target}, mas ela tem um defeito que eles deveriam detectar`
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
    case "expr":
      return exprFailureMessage(testCase)
    case "unittest":
      return unittestFailureMessage(testCase)
    case "legacy":
      return "mensagem do assert/unittest que falhou (ou \"Resposta incorreta.\")"
  }
}

/** Mensagem de falha que o aluno veria (com um valor "obtido" fictício). */
export function failurePreview(testCase: TestCase): { title: string; message: string } {
  const message = failureMessage(testCase)
  return { title: caseLabel(testCase), message: testCase.hint ? `${message} — dica: ${testCase.hint}` : message }
}
