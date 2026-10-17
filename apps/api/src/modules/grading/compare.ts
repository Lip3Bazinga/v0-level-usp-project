import type { Json } from "@levelusp/contracts"

const DEFAULT_TOLERANCE = 1e-9
/** Tolerância relativa mínima: absorve o erro de arredondamento em números grandes. */
const RELATIVE_EPSILON = 1e-12
const DEFAULT_REPR_LENGTH = 120

/**
 * Igualdade entre o valor esperado (JSON escrito pelo professor) e o valor
 * observado (JSON canônico produzido no sandbox). Números aceitam tolerância.
 * Valores especiais do harness: {"$float":"nan"|"inf"}, {"$int":"..."},
 * {"$repr":"..."}, {"$dict":[[k,v],...]}.
 */
export function jsonEquals(expected: Json, actual: Json, tolerance = DEFAULT_TOLERANCE): boolean {
  if (typeof expected === "number" && typeof actual === "number") return numbersEqual(expected, actual, tolerance)
  if (expected === null || actual === null || typeof expected !== "object" || typeof actual !== "object") {
    return expected === actual
  }
  if (Array.isArray(expected) || Array.isArray(actual)) {
    if (!Array.isArray(expected) || !Array.isArray(actual) || expected.length !== actual.length) return false
    return expected.every((item, index) => {
      const actualItem = actual[index]
      return actualItem !== undefined && jsonEquals(item, actualItem, tolerance)
    })
  }
  const expectedKeys = Object.keys(expected)
  if (expectedKeys.length !== Object.keys(actual).length) return false
  return expectedKeys.every((key) => {
    const expectedValue = expected[key]
    const actualValue = actual[key]
    return expectedValue !== undefined && actualValue !== undefined && jsonEquals(expectedValue, actualValue, tolerance)
  })
}

function numbersEqual(expected: number, actual: number, tolerance: number): boolean {
  if (Number.isInteger(expected) && Number.isInteger(actual)) return expected === actual
  return Math.abs(expected - actual) <= Math.max(tolerance, RELATIVE_EPSILON * Math.max(Math.abs(expected), Math.abs(actual)))
}

/** Representação curta estilo Python para mensagens ao aluno. */
export function pyRepr(value: Json | undefined, maxLength = DEFAULT_REPR_LENGTH): string {
  const text = renderPython(value)
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text
}

function renderPython(value: Json | undefined): string {
  if (value === undefined) return "?"
  if (value === null) return "None"
  if (value === true) return "True"
  if (value === false) return "False"
  if (typeof value === "string") return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`
  if (typeof value === "number") return String(value)
  if (Array.isArray(value)) return `[${value.map(renderPython).join(", ")}]`
  if ("$repr" in value && typeof value.$repr === "string") return value.$repr
  if ("$float" in value) return String(value.$float)
  if ("$int" in value) return String(value.$int)
  return `{${Object.entries(value).map(([key, item]) => `'${key}': ${renderPython(item)}`).join(", ")}}`
}

/** Normaliza saída de texto para comparação "trimmed": fim de linha e espaços à direita. */
export function normalizeOutput(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+$/, ""))
    .join("\n")
    .trim()
}
