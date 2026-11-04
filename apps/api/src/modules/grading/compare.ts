import type { Json } from "@levelusp/contracts"

const DEFAULT_TOLERANCE = 1e-9
/** Tolerância relativa mínima: absorve o erro de arredondamento em números grandes. */
const RELATIVE_EPSILON = 1e-12
const DEFAULT_REPR_LENGTH = 120
/**
 * O harness entrega no máximo ~70 níveis (20 de valor, pares de `$dict`); acima
 * disso o valor não veio dele e a comparação falha em vez de estourar a pilha.
 */
const MAX_COMPARE_DEPTH = 128

/**
 * Igualdade entre o valor esperado (JSON escrito pelo professor) e o valor
 * observado (JSON canônico produzido no sandbox). Números aceitam tolerância.
 * Valores especiais do harness: {"$float":"nan"|"inf"}, {"$int":"..."},
 * {"$repr":"..."}, {"$dict":[[k,v],...]}.
 */
export function jsonEquals(expected: Json, actual: Json, tolerance = DEFAULT_TOLERANCE): boolean {
  return jsonEqualsAt(expected, actual, tolerance, 0)
}

function jsonEqualsAt(expected: Json, actual: Json, tolerance: number, depth: number): boolean {
  if (depth > MAX_COMPARE_DEPTH) return false
  if (typeof expected === "number" && typeof actual === "number") return numbersEqual(expected, actual, tolerance)
  if (expected === null || actual === null || typeof expected !== "object" || typeof actual !== "object") {
    return expected === actual
  }
  if (Array.isArray(expected) || Array.isArray(actual)) {
    if (!Array.isArray(expected) || !Array.isArray(actual) || expected.length !== actual.length) return false
    return expected.every((item, index) => {
      const actualItem = actual[index]
      return actualItem !== undefined && jsonEqualsAt(item, actualItem, tolerance, depth + 1)
    })
  }
  const expectedKeys = Object.keys(expected)
  if (expectedKeys.length !== Object.keys(actual).length) return false
  // Só chaves PRÓPRIAS: `actual["__proto__"]`/`["constructor"]` não podem vir do protótipo.
  return expectedKeys.every((key) => {
    if (!Object.hasOwn(actual, key)) return false
    const expectedValue = expected[key]
    const actualValue = actual[key]
    return expectedValue !== undefined && actualValue !== undefined && jsonEqualsAt(expectedValue, actualValue, tolerance, depth + 1)
  })
}

function numbersEqual(expected: number, actual: number, tolerance: number): boolean {
  // Acima de 2^53 o número observado é float (inteiros grandes chegam como {"$int"}): vale a tolerância.
  if (Number.isSafeInteger(expected) && Number.isSafeInteger(actual)) return expected === actual
  return Math.abs(expected - actual) <= Math.max(tolerance, RELATIVE_EPSILON * Math.max(Math.abs(expected), Math.abs(actual)))
}

/** Representação curta estilo Python para mensagens ao aluno. */
export function pyRepr(value: Json | undefined, maxLength = DEFAULT_REPR_LENGTH): string {
  const text = renderPython(value, 0)
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text
}

function renderPython(value: Json | undefined, depth: number): string {
  if (value === undefined) return "?"
  if (depth > MAX_COMPARE_DEPTH) return "…"
  if (value === null) return "None"
  if (value === true) return "True"
  if (value === false) return "False"
  if (typeof value === "string") return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`
  if (typeof value === "number") return String(value)
  if (Array.isArray(value)) return `[${value.map((item) => renderPython(item, depth + 1)).join(", ")}]`
  if ("$repr" in value && typeof value.$repr === "string") return value.$repr
  if ("$float" in value) return String(value.$float)
  if ("$int" in value) return String(value.$int)
  return `{${Object.entries(value).map(([key, item]) => `'${key}': ${renderPython(item, depth + 1)}`).join(", ")}}`
}

/**
 * Normaliza saída de texto para comparação "trimmed": fim de linha e espaços à direita.
 * Linear de propósito: `/\s+$/` numa linha de 64 000 espaços seguidos de "x" (saída do
 * ALUNO) é quadrático no V8 e travava o event loop por segundos.
 */
export function normalizeOutput(text: string): string {
  return text.replaceAll("\r\n", "\n").split("\n").map((line) => line.trimEnd()).join("\n").trim()
}
