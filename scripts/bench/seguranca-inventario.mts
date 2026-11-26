/**
 * Inventário ESTÁTICO dos ataques do LevelUSP para o TCC (Fase D, item 4). Lê o código-fonte
 * dos testes de `pnpm test:attacks` e `pnpm test:security` e conta os casos; NÃO executa
 * nada (nem o executor, nem o banco, nem o navegador). Quantos casos foram bloqueados só se
 * sabe rodando as suítes: este arquivo mostra o que está CODIFICADO, não o resultado.
 *
 * Regra de contagem (uma linha do CSV = um arquivo, ou um grupo `describe` do arquivo):
 *  - cada chamada `it(...)`/`test(...)` vale 1 caso;
 *  - `it.each(tabela)`/`test.each(tabela)` vale o número REAL de linhas da tabela literal
 *    (elementos de primeiro nível do array); quando a tabela é calculada (ex.: uma linha por
 *    lição do seed), usa-se o tamanho da fonte dela (ver `DYNAMIC_TABLES`);
 *  - `it.skip`/`it.todo`/`test.skip` não contam; `describe.skipIf` (suíte que se pula sem
 *    executor/Pyodide) conta normalmente: o inventário é do que existe, não do que rodou;
 *  - laços `for` dentro de um caso (várias cargas SQLi, XSS, caminhos...) NÃO multiplicam:
 *    o caso conta 1, então o total é um piso do número de tentativas de ataque;
 *  - casos cujo título começa com marcador de limite documentado (`LIMITE`/`FRONTEIRA`) são
 *    contados à parte (`limites_documentados`): mostram o que o sistema NÃO impede de propósito;
 *  - `forja_veredito=sim` marca os grupos cujo objetivo é forjar veredito, progresso ou observações
 *    (classe 2 da suíte do executor e as forjas de passo/veredito da API).
 *
 * Colunas: arquivo, categoria, motor, casos, suite, forja_veredito, limites_documentados.
 * Motores: `python/WASI`, `python-dados/Pyodide`, `API`, `web`, `cadeia-de-suprimentos`.
 *
 * Reproduzir (da raiz do repositório):
 *   pnpm --filter @levelusp/api exec tsx ../../scripts/bench/seguranca-inventario.mts [--out docs/tcc/dados/seguranca-inventario.csv]
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { parseArgs } from "node:util"

const REPO_ROOT = path.resolve(import.meta.dirname, "../..")

type Motor = "python/WASI" | "python-dados/Pyodide" | "API" | "web" | "cadeia-de-suprimentos"
type Suite = "test:attacks" | "test:security"

/** Como um arquivo entra no inventário. */
interface FileSpec {
  /** Caminho relativo à raiz do repositório. */
  file: string
  suite: Suite
  motor: Motor
  /** Categoria fixa do arquivo, ou `describe` para uma linha por grupo `describe` de primeiro nível. */
  categoria: string | "describe"
  /** `forja_veredito=sim` para o arquivo todo (booleano) ou para as categorias que casam com o padrão. */
  forja: boolean | RegExp
}

/**
 * Os arquivos das suítes. `test:attacks` = ataques com executor real (API: `grading-*.e2e.ts`;
 * runner: `test/attacks`); `test:security` = e2e adversariais da API (PostgreSQL real), Playwright da web
 * e testes da cadeia de suprimentos. `grading-forgery.e2e.ts` também casa com o glob do projeto
 * `security` da API, mas só roda com executor no ar; entra uma vez só, em `test:attacks`.
 */
const SPECS: readonly FileSpec[] = [
  // test:attacks — executor python/WASI
  { file: "apps/runner/test/attacks/escape.attack.ts", suite: "test:attacks", motor: "python/WASI", categoria: "describe", forja: false },
  { file: "apps/runner/test/attacks/forgery.attack.ts", suite: "test:attacks", motor: "python/WASI", categoria: "describe", forja: true },
  { file: "apps/runner/test/attacks/resources.attack.ts", suite: "test:attacks", motor: "python/WASI", categoria: "describe", forja: false },
  { file: "apps/runner/test/attacks/strict-mode.attack.ts", suite: "test:attacks", motor: "python/WASI", categoria: "describe", forja: true },
  { file: "apps/runner/test/attacks/unittest.attack.ts", suite: "test:attacks", motor: "python/WASI", categoria: "describe", forja: true },
  // test:attacks — executor python-dados (Pyodide)
  { file: "apps/runner/test/attacks/pyodide.attack.ts", suite: "test:attacks", motor: "python-dados/Pyodide", categoria: "describe", forja: /nonce/i },
  // test:attacks — veredito na API contra o executor real (as lições do seed são python/WASI)
  { file: "apps/api/test/security/grading-forgery.e2e.ts", suite: "test:attacks", motor: "python/WASI", categoria: "forja de veredito (API + executor real)", forja: true },
  // test:security — API
  { file: "apps/api/test/security/auth-session.e2e.ts", suite: "test:security", motor: "API", categoria: "autenticação, sessão e CSRF", forja: false },
  { file: "apps/api/test/security/bola-idor.e2e.ts", suite: "test:security", motor: "API", categoria: "autorização de objeto (BOLA/IDOR)", forja: false },
  { file: "apps/api/test/security/business-logic.e2e.ts", suite: "test:security", motor: "API", categoria: "lógica de negócio (XP, quiz, prova)", forja: false },
  { file: "apps/api/test/security/injection.e2e.ts", suite: "test:security", motor: "API", categoria: "injeção e entradas hostis", forja: false },
  { file: "apps/api/test/security/insecure-defaults.e2e.ts", suite: "test:security", motor: "API", categoria: "configuração insegura", forja: false },
  { file: "apps/api/test/security/mass-assignment.e2e.ts", suite: "test:security", motor: "API", categoria: "mass assignment", forja: false },
  { file: "apps/api/test/security/route-matrix.e2e.ts", suite: "test:security", motor: "API", categoria: "matriz de autorização das rotas", forja: false },
  { file: "apps/api/test/security/steps-forgery.e2e.ts", suite: "test:security", motor: "API", categoria: "forja de progresso e vazamento de gabarito (passos)", forja: true },
  { file: "apps/api/test/security/uploads.e2e.ts", suite: "test:security", motor: "API", categoria: "uploads", forja: false },
  // test:security — web (Playwright)
  { file: "apps/web/e2e/security/web-attacks.spec.ts", suite: "test:security", motor: "web", categoria: "describe", forja: false },
  // test:security — cadeia de suprimentos
  { file: "packages/security/src/bundle-scan.test.ts", suite: "test:security", motor: "cadeia-de-suprimentos", categoria: "describe", forja: false },
  { file: "packages/security/src/supply-chain.test.ts", suite: "test:security", motor: "cadeia-de-suprimentos", categoria: "describe", forja: false },
]

/** Tabelas `it.each` calculadas em tempo de execução: arquivo → função que dá o nº de linhas. */
const DYNAMIC_TABLES: Readonly<Record<string, () => number>> = {
  // `lessons.map(...)` sobre as lições do seed legado (um caso por lição).
  "apps/api/test/security/grading-forgery.e2e.ts": () => {
    const seed = JSON.parse(readFileSync(path.join(REPO_ROOT, "packages/db/seed/python-completo.json"), "utf8")) as { lessons: unknown[] }
    return seed.lessons.length
  },
}

/** Um caso (ou tabela) encontrado no arquivo. */
interface FoundCase {
  title: string
  rows: number
  group: string
}

/**
 * Cópia do texto com o CONTEÚDO de comentários, strings, templates e regex trocado por
 * espaços (mantendo aspas, quebras de linha e o tamanho). Assim, `it(` dentro de um código
 * Python embutido ou `{`/`)` dentro de uma string não confundem a análise estrutural.
 */
function maskNonCode(source: string): string {
  const out = source.split("")
  const blank = (from: number, to: number): void => {
    for (let k = from; k < to; k += 1) if (out[k] !== "\n") out[k] = " "
  }
  /** Mascara um template começando em `start` (a crase); devolve o índice depois da crase final. */
  const maskTemplate = (start: number): number => {
    let i = start + 1
    while (i < source.length && source[i] !== "`") {
      if (source[i] === "\\") i += 2
      else if (source[i] === "$" && source[i + 1] === "{") {
        let depth = 1
        i += 2
        while (i < source.length && depth > 0) {
          if (source[i] === "`") i = maskTemplate(i)
          else {
            if (source[i] === "{") depth += 1
            else if (source[i] === "}") depth -= 1
            i += 1
          }
        }
      } else i += 1
    }
    blank(start + 1, i)
    return i + 1
  }
  const regexStarters = new Set(["(", ",", "=", ":", "[", "!", "&", "|", "?", "{", "}", ";", "+", "-", "*", "%", "<", ">", "~", "^"])
  let lastSignificant = ""
  let i = 0
  while (i < source.length) {
    const ch = source[i] as string
    const next = source[i + 1]
    if (ch === "/" && next === "/") {
      const end = source.indexOf("\n", i)
      const stop = end === -1 ? source.length : end
      blank(i, stop)
      i = stop
    } else if (ch === "/" && next === "*") {
      const end = source.indexOf("*/", i + 2)
      const stop = end === -1 ? source.length : end + 2
      blank(i, stop)
      i = stop
    } else if (ch === '"' || ch === "'") {
      let j = i + 1
      while (j < source.length && source[j] !== ch && source[j] !== "\n") j += source[j] === "\\" ? 2 : 1
      blank(i + 1, j)
      i = j + 1
      lastSignificant = ch
    } else if (ch === "`") {
      i = maskTemplate(i)
      lastSignificant = "`"
    } else if (ch === "/" && (lastSignificant === "" || regexStarters.has(lastSignificant))) {
      let j = i + 1
      let inClass = false
      while (j < source.length && source[j] !== "\n" && (inClass || source[j] !== "/")) {
        if (source[j] === "\\") j += 1
        else if (source[j] === "[") inClass = true
        else if (source[j] === "]") inClass = false
        j += 1
      }
      blank(i + 1, j)
      i = j + 1
      lastSignificant = "/"
    } else {
      if (!/\s/.test(ch)) lastSignificant = ch
      i += 1
    }
  }
  return out.join("")
}

/** Índice do `)`/`]`/`}` que fecha o delimitador aberto em `open` (texto já mascarado). */
function closingIndex(masked: string, open: number): number {
  const pairs: Record<string, string> = { "(": ")", "[": "]", "{": "}" }
  const stack: string[] = []
  for (let i = open; i < masked.length; i += 1) {
    const ch = masked[i] as string
    if (ch in pairs) stack.push(pairs[ch] as string)
    else if (ch === ")" || ch === "]" || ch === "}") {
      if (stack.pop() !== ch) throw new Error(`delimitador desbalanceado em ${i}`)
      if (stack.length === 0) return i
    }
  }
  throw new Error(`delimitador aberto em ${open} não fecha`)
}

/** Elementos de primeiro nível de um array literal (texto mascarado, do `[` ao `]`). */
function countArrayRows(masked: string): number {
  let depth = 0
  let rows = 0
  let hasContent = false
  for (const ch of masked.slice(1, -1)) {
    if ("([{".includes(ch)) depth += 1
    else if (")]}".includes(ch)) depth -= 1
    if (depth === 0 && ch === ",") {
      if (hasContent) rows += 1
      hasContent = false
    } else if (!/\s/.test(ch)) hasContent = true
  }
  return hasContent ? rows + 1 : rows
}

/** Primeiro argumento de texto (aspas simples/duplas/crase) que começa em `from`, lido do texto original. */
function readTitle(original: string, masked: string, from: number): string {
  let i = from
  while (/\s/.test(masked[i] ?? "")) i += 1
  const quote = masked[i]
  if (quote !== '"' && quote !== "'" && quote !== "`") return "(título calculado)"
  const end = masked.indexOf(quote, i + 1)
  return original.slice(i + 1, end)
}

const CALL = /(?<![\w.$])(test\.describe|describe|it|test)((?:\.(?:skipIf|runIf|each|skip|todo|only|concurrent|sequential|fails))*)\s*\(/g

/** Percorre o arquivo e devolve os casos, cada um com o grupo `describe` de primeiro nível em que está. */
function findCases(spec: FileSpec): FoundCase[] {
  const original = readFileSync(path.join(REPO_ROOT, spec.file), "utf8")
  const masked = maskNonCode(original)
  const found: FoundCase[] = []
  /** Grupos de primeiro nível: [início, fim, título]. */
  const groups: [number, number, string][] = []
  const calls: { kind: string; modifiers: string; open: number; index: number }[] = []
  for (const match of masked.matchAll(CALL)) {
    calls.push({ kind: match[1] as string, modifiers: match[2] as string, open: (match.index ?? 0) + match[0].length - 1, index: match.index ?? 0 })
  }
  let skipUntil = -1
  for (const call of calls) {
    if (call.index < skipUntil) continue
    const modifiers = call.modifiers.split(".").filter((part) => part !== "")
    // `describe.skipIf(cond)("título", fn)`: a chamada que traz o título é a segunda.
    const hasPrefixCall = modifiers.some((part) => part === "skipIf" || part === "runIf" || part === "each")
    const firstClose = closingIndex(masked, call.open)
    const titleOpen = hasPrefixCall ? masked.indexOf("(", firstClose) + 1 : call.open + 1
    const titleCallOpen = hasPrefixCall ? masked.indexOf("(", firstClose) : call.open
    if (call.kind === "describe" || call.kind === "test.describe") {
      groups.push([call.index, closingIndex(masked, titleCallOpen), readTitle(original, masked, titleOpen)])
      continue
    }
    if (modifiers.includes("skip") || modifiers.includes("todo")) {
      skipUntil = closingIndex(masked, titleCallOpen)
      continue
    }
    let rows = 1
    if (modifiers.includes("each")) {
      const table = masked.slice(call.open + 1, firstClose).trim()
      if (table.startsWith("[") && table.endsWith("]") && !/\.map\(/.test(table.slice(0, 40))) rows = countArrayRows(table)
      else {
        const resolver = DYNAMIC_TABLES[spec.file]
        if (resolver === undefined) throw new Error(`${spec.file}: tabela it.each calculada sem resolvedor em DYNAMIC_TABLES`)
        rows = resolver()
      }
    }
    skipUntil = closingIndex(masked, titleCallOpen)
    const outermost = groups.filter(([start, end]) => call.index > start && call.index < end).at(0)
    found.push({ title: readTitle(original, masked, titleOpen), rows, group: outermost?.[2] ?? "(sem describe)" })
  }
  return found
}

/** Linha do CSV. */
interface Row {
  arquivo: string
  categoria: string
  motor: Motor
  casos: number
  suite: Suite
  forja: boolean
  limites: number
}

/** Escapa um campo CSV (vírgula, aspas e quebra de linha). */
function csvField(value: string | number): string {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

const { values } = parseArgs({ options: { out: { type: "string" } }, strict: true })
const outPath = path.resolve(process.env.INIT_CWD ?? process.cwd(), values.out ?? path.join(REPO_ROOT, "docs/tcc/dados/seguranca-inventario.csv"))

const rows: Row[] = []
for (const spec of SPECS) {
  const cases = findCases(spec)
  const byCategory = new Map<string, FoundCase[]>()
  for (const found of cases) {
    const category = spec.categoria === "describe" ? found.group : spec.categoria
    byCategory.set(category, [...(byCategory.get(category) ?? []), found])
  }
  for (const [categoria, group] of byCategory) {
    rows.push({
      arquivo: spec.file,
      categoria,
      motor: spec.motor,
      casos: group.reduce((sum, found) => sum + found.rows, 0),
      suite: spec.suite,
      forja: typeof spec.forja === "boolean" ? spec.forja : spec.forja.test(categoria),
      limites: group.filter((found) => /^(LIMITE|FRONTEIRA)\b/.test(found.title)).reduce((sum, found) => sum + found.rows, 0),
    })
  }
}

const header = ["arquivo", "categoria", "motor", "casos", "suite", "forja_veredito", "limites_documentados"]
const lines = [header, ...rows.map((row) => [row.arquivo, row.categoria, row.motor, row.casos, row.suite, row.forja ? "sim" : "nao", row.limites])]
mkdirSync(path.dirname(outPath), { recursive: true })
writeFileSync(outPath, `${lines.map((cells) => cells.map(csvField).join(",")).join("\n")}\n`, "utf8")

/** Soma `casos` agrupando por uma chave. */
function sumBy(key: (row: Row) => string): [string, number][] {
  const totals = new Map<string, number>()
  for (const row of rows) totals.set(key(row), (totals.get(key(row)) ?? 0) + row.casos)
  return [...totals]
}
console.log(`${rows.length} grupos; CSV em ${path.relative(REPO_ROOT, outPath)}`)
console.log(`total de casos: ${rows.reduce((sum, row) => sum + row.casos, 0)}`)
for (const [label, key] of [["suite", (row: Row) => row.suite], ["motor", (row: Row) => row.motor], ["forja_veredito", (row: Row) => (row.forja ? "sim" : "nao")]] as const) {
  console.log(`por ${label}: ${sumBy(key).map(([name, total]) => `${name}=${total}`).join("; ")}`)
}
console.log(`limites documentados: ${rows.reduce((sum, row) => sum + row.limites, 0)}`)
