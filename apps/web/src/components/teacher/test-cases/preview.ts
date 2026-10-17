import type { Json, SourceRule, TestCase } from "@levelusp/contracts"
import { CONSTRUCT_LABELS } from "./drafts"

/**
 * Prévia (no navegador do professor) da mensagem que o aluno verá quando o
 * caso falhar. Espelha as mensagens montadas pela API em
 * `apps/api/src/modules/grading/grading.domain.ts` — é só ilustrativa: o valor
 * "obtido" é um exemplo, pois depende do código de cada aluno.
 */

/** Representação curta estilo Python (mesma regra da API). */
export function pyRepr(v: Json | undefined, max = 120): string {
  const s = render(v)
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}

function render(v: Json | undefined): string {
  if (v === undefined) return "?"
  if (v === null) return "None"
  if (v === true) return "True"
  if (v === false) return "False"
  if (typeof v === "string") return `'${v.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`
  if (typeof v === "number") return String(v)
  if (Array.isArray(v)) return `[${v.map(render).join(", ")}]`
  return `{${Object.entries(v).map(([k, x]) => `'${k}': ${render(x)}`).join(", ")}}`
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

export function caseLabel(c: Pick<TestCase, "id" | "name">): string {
  return c.name ?? `Teste ${c.id}`
}

export function callSignature(c: Extract<TestCase, { kind: "call" }>): string {
  const parts = [
    ...(c.args ?? []).map((a) => pyRepr(a, 40)),
    ...Object.entries(c.kwargs ?? {}).map(([k, v]) => `${k}=${pyRepr(v, 40)}`),
  ]
  return `${c.function}(${parts.join(", ")})`
}

/** Mensagem de falha que o aluno veria (com um valor "obtido" fictício). */
export function failurePreview(c: TestCase): { title: string; message: string } {
  let message: string
  switch (c.kind) {
    case "call": {
      const call = callSignature(c)
      message = c.reveal
        ? `${call} retornou <valor do aluno>; esperado ${pyRepr(c.expected)}`
        : `${call} retornou <valor do aluno>, que não é o esperado`
      break
    }
    case "io":
      message = c.reveal
        ? `esperado ${JSON.stringify(c.expected_stdout)}, obtido "<saída do aluno>"`
        : "a saída do programa não é a esperada"
      break
    case "variable":
      message = c.reveal
        ? `${c.variable} = <valor do aluno>; esperado ${pyRepr(c.expected)}`
        : `${c.variable} = <valor do aluno>, que não é o esperado`
      break
    case "source":
      message = describeRule(c.rule)
      break
    case "legacy":
      message = "mensagem do assert/unittest que falhou (ou \"Resposta incorreta.\")"
      break
  }
  if (c.hint) message += ` — dica: ${c.hint}`
  return { title: caseLabel(c), message }
}
