/**
 * Medição de conteúdo para o TCC (Fase D, item 5). ESTÁTICA: compila os arquivos
 * `.lvl.md` do pacote `content/` com o compilador de `apps/api/scripts/content/` e
 * conta o que está declarado. Não executa Python nem fala com o executor.
 *
 * Gera `docs/tcc/dados/conteudo.csv` (uma linha por curso, só os cursos com slug
 * do pacote; o curso legado sem slug não existe no pacote) e uma linha `total`.
 *
 * Colunas:
 *  - passos_*: passos por tipo (leitura, exercicio, quiz, previsao);
 *  - exercicios: passos do tipo exercício (= passos_exercicio);
 *  - casos_*: casos de teste dos exercícios por `kind` (io, call, variable, source, expr, unittest, legacy);
 *  - solucoes_erradas_declaradas: itens de `wrong_solutions` declarados nos exercícios;
 *  - verificadas_em_execucao: sempre "nao" aqui. Que a solução errada REPROVA só é provado
 *    por `pnpm content:verify`, que usa o executor; este script só conta as declaradas;
 *  - quiz_perguntas: perguntas dos passos de quiz; prova_perguntas: banco de questões da prova do curso.
 *
 * Reproduzir (da raiz do repositório, sem o executor):
 *   pnpm --filter @levelusp/contracts build
 *   pnpm --filter @levelusp/api exec tsx ../../scripts/bench/conteudo.mts [--content content] [--out docs/tcc/dados/conteudo.csv]
 */
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { parseArgs } from "node:util"
import { usePortugueseMessages } from "../../apps/api/scripts/content/cli"
import { compileContent } from "../../apps/api/scripts/content/compiler"

const REPO_ROOT = path.resolve(import.meta.dirname, "../..")
const STEP_KINDS = ["leitura", "exercicio", "quiz", "previsao"] as const
const CASE_KINDS = ["io", "call", "variable", "source", "expr", "unittest", "legacy"] as const

/** Contadores de um curso (ou do total). */
interface Counts {
  modulos: number
  licoes: number
  passos: Record<string, number>
  casos: Record<string, number>
  solucoesErradas: number
  quizPerguntas: number
  provaPerguntas: number
}

/** Contadores zerados. */
function emptyCounts(): Counts {
  return {
    modulos: 0,
    licoes: 0,
    passos: Object.fromEntries(STEP_KINDS.map((kind) => [kind, 0])),
    casos: Object.fromEntries(CASE_KINDS.map((kind) => [kind, 0])),
    solucoesErradas: 0,
    quizPerguntas: 0,
    provaPerguntas: 0,
  }
}

/** Soma `other` em `into`. */
function add(into: Counts, other: Counts): void {
  into.modulos += other.modulos
  into.licoes += other.licoes
  into.solucoesErradas += other.solucoesErradas
  into.quizPerguntas += other.quizPerguntas
  into.provaPerguntas += other.provaPerguntas
  for (const key of Object.keys(other.passos)) into.passos[key] = (into.passos[key] ?? 0) + (other.passos[key] ?? 0)
  for (const key of Object.keys(other.casos)) into.casos[key] = (into.casos[key] ?? 0) + (other.casos[key] ?? 0)
}

/** Linha de cabeçalho do CSV. */
const HEADER = [
  "curso", "modulos", "licoes", "passos_total",
  ...STEP_KINDS.map((kind) => `passos_${kind}`),
  "exercicios", "casos_total",
  ...CASE_KINDS.map((kind) => `casos_${kind}`),
  "solucoes_erradas_declaradas", "verificadas_em_execucao", "quiz_perguntas", "prova_perguntas",
]

/** Monta a linha do CSV de um conjunto de contadores. */
function toRow(label: string, counts: Counts): (string | number)[] {
  const stepsTotal = Object.values(counts.passos).reduce((sum, value) => sum + value, 0)
  const casesTotal = Object.values(counts.casos).reduce((sum, value) => sum + value, 0)
  return [
    label, counts.modulos, counts.licoes, stepsTotal,
    ...STEP_KINDS.map((kind) => counts.passos[kind] ?? 0),
    counts.passos.exercicio ?? 0, casesTotal,
    ...CASE_KINDS.map((kind) => counts.casos[kind] ?? 0),
    counts.solucoesErradas, "nao", counts.quizPerguntas, counts.provaPerguntas,
  ]
}

usePortugueseMessages()
const { values } = parseArgs({ options: { content: { type: "string" }, out: { type: "string" } }, strict: true })
const baseDir = process.env.INIT_CWD ?? process.cwd()
const contentDir = path.resolve(baseDir, values.content ?? path.join(REPO_ROOT, "content"))
const outPath = path.resolve(baseDir, values.out ?? path.join(REPO_ROOT, "docs/tcc/dados/conteudo.csv"))

const compiled = compileContent({ contentDir, displayRoot: REPO_ROOT })
if (compiled.problems.length > 0) {
  console.error(`o conteúdo tem ${compiled.problems.length} problema(s); rode pnpm content:check antes de medir`)
  process.exit(1)
}

const total = emptyCounts()
const rows: (string | number)[][] = []
for (const course of compiled.bundle.courses) {
  const counts = emptyCounts()
  counts.provaPerguntas = course.exam?.questions.length ?? 0
  counts.modulos = course.modules.length
  for (const module of course.modules) {
    for (const lesson of module.lessons) {
      counts.licoes += 1
      for (const step of lesson.steps) {
        counts.passos[step.kind] = (counts.passos[step.kind] ?? 0) + 1
        if (step.kind === "quiz") counts.quizPerguntas += step.quiz_questions.length
        if (step.kind !== "exercicio") continue
        counts.solucoesErradas += step.wrong_solutions.length
        for (const testCase of step.test_cases) counts.casos[testCase.kind] = (counts.casos[testCase.kind] ?? 0) + 1
      }
    }
  }
  add(total, counts)
  rows.push(toRow(course.slug, counts))
}
rows.push(toRow("total", total))

mkdirSync(path.dirname(outPath), { recursive: true })
writeFileSync(outPath, `${[HEADER, ...rows].map((cells) => cells.join(",")).join("\n")}\n`, "utf8")
console.log(`${rows.length - 1} cursos medidos; CSV em ${path.relative(REPO_ROOT, outPath)}`)
