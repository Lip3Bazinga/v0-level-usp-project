import { randomBytes } from "node:crypto"
import { STRICT_PROBE_KINDS, type Probe, type ProbeObservation } from "@levelusp/contracts"

/**
 * Protocolo entre o host e o harness (`python/harness.py`), comum aos dois motores:
 * o lote entra pela entrada padrão do convidado como JSON (nonce, entrada, modo e
 * sondas com ids posicionais) e as observações voltam pela saída padrão, uma por
 * linha, prefixadas pelo nonce.
 */

const NONCE_BYTES = 16
/**
 * Uma observação legítima tem no máximo ~1,2 MB (valor + stdout + stderr, 64 000
 * caracteres cada, escapados em ASCII) e profundidade ~70 (20 níveis de valor,
 * pares de `$dict`). Linhas maiores ou mais fundas só vêm de quem forjou o nonce.
 */
const MAX_OBSERVATION_LINE_CHARS = 4 * 1024 * 1024
const MAX_OBSERVATION_DEPTH = 256

/** O que o harness lê da entrada padrão (antes de qualquer código do aluno). */
export interface GuestJob {
  nonce: string
  entry: string
  strict: boolean
  probes: Probe[]
}

/**
 * Monta o lote como o harness o lê: nonce aleatório desta execução, modo estrito se
 * alguma sonda exige e sondas com ids posicionais (`p0`, `p1`...), para que nem o id
 * do caso chegue ao sandbox.
 */
export function prepareGuestJob(probes: Probe[], entry: string): GuestJob {
  return {
    nonce: randomBytes(NONCE_BYTES).toString("hex"),
    entry,
    strict: probes.some((probe) => STRICT_PROBE_KINDS.has(probe.kind)),
    probes: probes.map((probe, index) => ({ ...probe, id: positionalId(index) })),
  }
}

/** Como a instância terminou; decide a mensagem das sondas que ficaram sem observação. */
export interface BatchOutcome {
  timedOut: boolean
  /** O host matou a instância por excesso de saída. */
  overflowed: boolean
  /** O host matou a instância por excesso de disco (bytes ou arquivos no projeto). */
  diskExceeded: boolean
  /** Diagnóstico da falha (stderr do Wasmtime, erro do worker) para classificar a mensagem. */
  stderr: string
}

/**
 * Casa as observações emitidas (`parseObservations`) com as sondas pedidas: devolve uma
 * por sonda, com o id original, e uma falha explicada (tempo, saída, disco, memória,
 * recursão, "terminou de forma inesperada") para as que ficaram sem observação.
 */
export function collectObservations(probes: Probe[], observed: ReadonlyMap<string, ProbeObservation>, outcome: BatchOutcome): ProbeObservation[] {
  return probes.map((probe, index) => {
    const observation = observed.get(positionalId(index))
    return observation ? { ...observation, id: probe.id } : missingObservation(probe.id, outcome)
  })
}

function positionalId(index: number): string {
  return `p${index}`
}

function isObservation(value: unknown): value is ProbeObservation {
  return typeof value === "object" && value !== null && "id" in value && typeof value.id === "string"
}

/**
 * Aceita só linhas com o nonce desta execução. O harness emite exatamente uma
 * observação por sonda: uma segunda linha com o mesmo id só pode ter vindo de
 * quem descobriu o nonce, então a sonda inteira é invalidada.
 */
export function parseObservations(stdout: string, nonce: string): Map<string, ProbeObservation> {
  const observations = new Map<string, ProbeObservation>()
  const duplicated = new Set<string>()
  const prefix = `${nonce} `
  for (const line of stdout.split("\n")) {
    if (!line.startsWith(prefix) || line.length > MAX_OBSERVATION_LINE_CHARS) continue
    const observation = parseJsonLine(line.slice(prefix.length))
    if (!isObservation(observation)) continue
    if (observations.has(observation.id)) duplicated.add(observation.id)
    else observations.set(observation.id, observation)
  }
  for (const id of duplicated) observations.set(id, { id, ok: false, error: "Observação duplicada: resultado descartado." })
  return observations
}

/** Linha corrompida (ex.: escrita interrompida pelo timeout) ou funda demais vira undefined e é ignorada. */
function parseJsonLine(text: string): unknown {
  if (jsonNestingDepth(text) > MAX_OBSERVATION_DEPTH) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

/** Profundidade máxima de `[`/`{` fora de strings, em uma passada (antes do JSON.parse recursivo dos consumidores). */
export function jsonNestingDepth(text: string): number {
  let depth = 0
  let maxDepth = 0
  let isInString = false
  for (let index = 0; index < text.length; index++) {
    const char = text[index]
    if (isInString) {
      if (char === "\\") index++
      else if (char === '"') isInString = false
    } else if (char === '"') isInString = true
    else if (char === "[" || char === "{") maxDepth = Math.max(maxDepth, ++depth)
    else if (char === "]" || char === "}") depth--
  }
  return maxDepth
}

function missingObservation(probeId: string, outcome: BatchOutcome): ProbeObservation {
  if (outcome.diskExceeded) return { id: probeId, ok: false, error: "Disco excedido: o programa gravou arquivos demais no projeto." }
  if (outcome.overflowed) return { id: probeId, ok: false, error: "Saída grande demais: o programa imprimiu dados demais." }
  if (outcome.timedOut) return { id: probeId, ok: false, timedOut: true, error: "Tempo limite excedido (verifique laços infinitos)." }
  return { id: probeId, ok: false, error: describeCrash(outcome.stderr) }
}

/** Mensagem segura para o aluno a partir do diagnóstico da instância (nunca o texto cru). */
export function describeCrash(stderr: string): string {
  if (/memory|out of bounds|grow/i.test(stderr)) return "Memória insuficiente: o programa usou mais memória do que o permitido."
  if (/stack overflow|call stack exhausted|RecursionError/i.test(stderr)) return "Recursão profunda demais (estouro de pilha)."
  return "O programa terminou de forma inesperada."
}
