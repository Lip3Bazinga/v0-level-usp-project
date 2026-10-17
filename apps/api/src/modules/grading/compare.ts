import type { Json } from "@levelusp/contracts"

/**
 * Igualdade entre o valor esperado (JSON escrito pelo professor) e o valor
 * observado (JSON canônico produzido no sandbox). Números aceitam tolerância.
 * Valores especiais do harness: {"$float":"nan"|"inf"}, {"$int":"..."},
 * {"$repr":"..."}, {"$dict":[[k,v],...]}.
 */
export function jsonEquals(expected: Json, actual: Json, tolerance = 1e-9): boolean {
  if (typeof expected === "number" && typeof actual === "number") {
    if (Number.isInteger(expected) && Number.isInteger(actual)) return expected === actual
    return Math.abs(expected - actual) <= Math.max(tolerance, 1e-12 * Math.max(Math.abs(expected), Math.abs(actual)))
  }
  if (expected === null || actual === null || typeof expected !== "object" || typeof actual !== "object") {
    return expected === actual
  }
  if (Array.isArray(expected) || Array.isArray(actual)) {
    if (!Array.isArray(expected) || !Array.isArray(actual) || expected.length !== actual.length) return false
    return expected.every((e, i) => jsonEquals(e, actual[i] as Json, tolerance))
  }
  const ek = Object.keys(expected)
  const ak = Object.keys(actual)
  if (ek.length !== ak.length) return false
  return ek.every((k) => k in actual && jsonEquals(expected[k] as Json, actual[k] as Json, tolerance))
}

/** Representação curta estilo Python para mensagens ao aluno. */
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
  if ("$repr" in v && typeof v.$repr === "string") return v.$repr
  if ("$float" in v) return String(v.$float)
  if ("$int" in v) return String(v.$int)
  return `{${Object.entries(v).map(([k, x]) => `'${k}': ${render(x)}`).join(", ")}}`
}

/** Normaliza saída de texto para comparação "trimmed": fim de linha e espaços à direita. */
export function normalizeOutput(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.replace(/\s+$/, ""))
    .join("\n")
    .trim()
}
