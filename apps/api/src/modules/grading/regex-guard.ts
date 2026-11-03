import { Script, createContext, type Context } from "node:vm"

/**
 * Expressões regulares do professor (`match: "regex"`) rodam na API contra a
 * saída do ALUNO. O motor do V8 faz backtracking: um padrão como `^(a+)+$` e uma
 * saída `aaaa…b` de 64 000 caracteres travariam o event loop da API para todos
 * os usuários (ReDoS). Por isso cada comparação roda num contexto `vm` com
 * `timeout` (o V8 interrompe o backtracking) e a correção inteira tem um
 * orçamento de tempo. Estourou = não casou (a correção falha fechada).
 *
 * Alternativas descartadas: `re2` é addon nativo (build e superfície maiores);
 * a flag `--enable-experimental-regexp-engine` muda o processo inteiro; um
 * worker por comparação custa ~30 ms. A validação no cadastro (`isLikelyCatastrophicRegex`
 * em `@levelusp/contracts`) recusa os padrões perigosos mais comuns, e este guarda
 * cobre o resto.
 */

/** Tempo máximo de UMA comparação por regex. */
export const REGEX_MATCH_TIMEOUT_MS = 50
/** Tempo total de regex por correção (um gabarito pode ter até 100 casos). */
export const REGEX_GRADING_BUDGET_MS = 250

/** Orçamento de tempo de regex de uma correção; consumido por `testRegexWithinBudget`. */
export interface RegexBudget {
  remainingMs: number
}

/** Orçamento novo, para uma correção. */
export function createRegexBudget(totalMs = REGEX_GRADING_BUDGET_MS): RegexBudget {
  return { remainingMs: totalMs }
}

interface MatchSandbox extends Context {
  regex?: RegExp | undefined
  input?: string | undefined
}

const MATCH_SCRIPT = new Script("regex.test(input)")
let sharedSandbox: MatchSandbox | null = null

function matchSandbox(): MatchSandbox {
  sharedSandbox ??= createContext(Object.create(null) as MatchSandbox)
  return sharedSandbox
}

/**
 * `new RegExp(pattern, "m").test(input)` com tempo limitado. Padrão inválido,
 * tempo esgotado ou orçamento zerado devolvem `false`.
 */
export function testRegexWithinBudget(pattern: string, input: string, budget: RegexBudget): boolean {
  const timeout = Math.min(REGEX_MATCH_TIMEOUT_MS, Math.floor(budget.remainingMs))
  if (timeout <= 0) return false
  let regex: RegExp
  try {
    regex = new RegExp(pattern, "m")
  } catch {
    return false
  }
  const sandbox = matchSandbox()
  sandbox.regex = regex
  sandbox.input = input
  const startedAt = performance.now()
  try {
    return MATCH_SCRIPT.runInContext(sandbox, { timeout }) === true
  } catch {
    return false
  } finally {
    budget.remainingMs -= performance.now() - startedAt
    sandbox.regex = undefined
    sandbox.input = undefined
  }
}
