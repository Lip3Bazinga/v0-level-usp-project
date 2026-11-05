import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import { expect } from "vitest"
import type { ContentProblem } from "../../../scripts/content/source-map"

/** Pedaços de conteúdo válido que cada teste altera num ponto só. */

/** Problema esperado: arquivo (opcional), linha e um trecho (ou padrão) da mensagem. */
export interface ExpectedProblem {
  file?: string
  line: number | null
  message: string | RegExp
}

/** Confere um problema campo a campo (a mensagem por trecho ou padrão). */
export function expectProblem(problem: ContentProblem | undefined, expected: ExpectedProblem): void {
  expect(problem).toBeDefined()
  if (!problem) return
  if (expected.file !== undefined) expect(problem.file).toBe(expected.file)
  expect(problem.line).toBe(expected.line)
  if (typeof expected.message === "string") expect(problem.message).toContain(expected.message)
  else expect(problem.message).toMatch(expected.message)
}

/** Confere a lista inteira de problemas, na ordem. */
export function expectProblems(problems: readonly ContentProblem[], expected: readonly ExpectedProblem[]): void {
  expect(problems.map((problem) => `${problem.file}:${problem.line ?? "-"}`)).toHaveLength(expected.length)
  expected.forEach((item, index) => expectProblem(problems[index], item))
}

/** Pasta do curso de exemplo versionado (`content/exemplo`), relativa ao cwd do vitest (`apps/api`). */
export const EXAMPLE_DIR = path.resolve(process.cwd(), "../../content/exemplo")

/** Narrativa com mais de 200 caracteres, como o lint exige de um passo de leitura. */
export const LONG_NARRATIVE =
  "Um programa é uma lista de instruções que o computador executa de cima para baixo, uma de cada vez. " +
  "Em Python cada linha costuma ser uma instrução: o interpretador lê a primeira, executa, passa para a segunda e assim por diante até o fim do arquivo."

/** Cabeçalho YAML de uma lição; `extra` acrescenta ou substitui chaves (`null` remove). */
export function frontmatter(extra: Record<string, string | null> = {}): string {
  const base: Record<string, string | null> = {
    slug: "licao-teste",
    titulo: "Lição de teste",
    descricao: "Uma lição usada nos testes.",
    tipo: "guiada",
    objetivos: "\n  - Aprender a testar",
    ...extra,
  }
  const lines = Object.entries(base)
    .filter((entry): entry is [string, string] => entry[1] !== null)
    .map(([key, value]) => `${key}: ${value}`)
  return `---\n${lines.join("\n")}\n---\n`
}

/** Passo de leitura válido. */
export function readingStep(number = 1, narrative = LONG_NARRATIVE): string {
  return `## Passo ${number} · Leitura · O que é um programa\n\n${narrative}\n`
}

/** Partes de um passo de exercício; cada uma pode ser trocada ou removida (`null`). */
export interface ExerciseParts {
  number?: number
  title?: string
  narrative?: string
  instructions?: string | null
  starter?: string | null
  solution?: string | null
  hints?: string | null
  verification?: string | null
  wrong?: string | null
}

const DEFAULT_EXERCISE: Required<ExerciseParts> = {
  number: 2,
  title: "Seu primeiro print",
  narrative: "Escreva um programa de uma linha.",
  instructions: "1. Use `print()` para exibir `Olá, mundo!`.\n   Dica: o texto vai entre aspas.\n2. Não esqueça a exclamação.",
  starter: "```python\n# Escreva seu código abaixo\n```",
  solution: "```python\nprint(\"Olá, mundo!\")\n```",
  hints: "1. `print` recebe o texto entre aspas.\n2. Cada `print` escreve em uma linha nova.",
  verification:
    "```json\n[\n  { \"id\": \"saida\", \"checkpoint\": 1, \"kind\": \"io\", \"expected_stdout\": \"Olá, mundo!\", \"match\": \"contains\", \"name\": \"Exibe Olá, mundo!\" },\n" +
    "  { \"id\": \"usa-print\", \"checkpoint\": 2, \"kind\": \"source\", \"rule\": { \"type\": \"calls\", \"name\": \"print\" } }\n]\n```",
  wrong: "```python name=\"sem aspas\"\nprint(Olá, mundo!)\n```\n```python name=\"texto diferente\"\nprint(\"Ola mundo\")\n```",
}

/** Passo de exercício válido; `parts` troca seções (string) ou as remove (`null`). */
export function exerciseStep(parts: ExerciseParts = {}): string {
  const merged = { ...DEFAULT_EXERCISE, ...parts }
  const section = (name: string, body: string | null): string => (body === null ? "" : `\n### ${name}\n${body}\n`)
  return (
    `## Passo ${merged.number} · Exercício · ${merged.title}\n\n${merged.narrative}\n` +
    section("Instruções", merged.instructions) +
    section("Código inicial", merged.starter) +
    section("Solução", merged.solution) +
    section("Dicas", merged.hints) +
    section("Verificação", merged.verification) +
    section("Soluções erradas", merged.wrong)
  )
}

/** Passo de quiz válido com uma pergunta (ou as perguntas informadas). */
export function quizStep(number = 3, questions = ["Qual função exibe texto?\n- [ ] `show()`\n- [x] `print()`\n- [ ] `echo()`\n> `print()` escreve na saída padrão."]): string {
  return `## Passo ${number} · Quiz · Fixando\n${questions.map((question) => `\n### Pergunta\n${question}\n`).join("")}`
}

/** Lição guiada completa e válida (leitura, exercício e quiz). */
export function guidedLesson(extra: Record<string, string | null> = {}): string {
  return `${frontmatter(extra)}\n${readingStep(1)}\n${exerciseStep({ number: 2 })}\n${quizStep(3)}`
}

/** Lição prática clássica (um único passo de exercício). */
export function practiceLesson(extra: Record<string, string | null> = {}): string {
  return `${frontmatter({ slug: "pratica-teste", titulo: "Prática de teste", tipo: "pratica", ...extra })}\n${exerciseStep({ number: 1 })}`
}

export const TRACK_YAML = "slug: trilha-teste\ntitulo: Trilha de teste\ndescricao: Uma trilha.\nordem: 1\npublicada: true\ncursos:\n  - curso-teste\n"
export const COURSE_YAML = "slug: curso-teste\ntitulo: Curso de teste\ndescricao: Um curso.\nnivel: iniciante\nordem: 1\npublicado: true\nprerequisito: null\n"
export const MODULE_YAML = "slug: modulo-teste\ntitulo: Módulo de teste\ndescricao: Um módulo.\nordem: 1\n"
export const EXAM_YAML =
  "titulo: Prova de teste\nnota_minima: 70\nquestoes:\n  - enunciado: Quanto é 1 + 1?\n    opcoes: [\"1\", \"2\"]\n    correta: 1\n    explicacao: Dois.\n    topico: Soma\n"

/** Árvore de conteúdo mínima e válida (caminhos relativos à raiz do conteúdo). */
export function validTree(): Record<string, string> {
  return {
    "trilhas/teste.yaml": TRACK_YAML,
    "cursos/curso-teste/curso.yaml": COURSE_YAML,
    "cursos/curso-teste/prova.yaml": EXAM_YAML,
    "cursos/curso-teste/m1/modulo.yaml": MODULE_YAML,
    "cursos/curso-teste/m1/01-guiada.lvl.md": guidedLesson(),
    "cursos/curso-teste/m1/02-pratica.lvl.md": practiceLesson(),
  }
}

/** Árvore de conteúdo temporária em disco; chame `cleanup()` ao final. */
export interface TempTree {
  dir: string
  cleanup(): void
}

/** Grava os arquivos numa pasta temporária e devolve a raiz. */
export function writeTree(files: Record<string, string>): TempTree {
  const dir = mkdtempSync(path.join(os.tmpdir(), "levelusp-conteudo-"))
  for (const [relative, content] of Object.entries(files)) {
    const absolute = path.join(dir, relative)
    mkdirSync(path.dirname(absolute), { recursive: true })
    writeFileSync(absolute, content)
  }
  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) }
}
