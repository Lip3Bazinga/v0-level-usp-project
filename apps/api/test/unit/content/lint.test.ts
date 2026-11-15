import { afterEach, describe, expect, it } from "vitest"
import { compileContent } from "../../../scripts/content/compiler"
import { lintContent } from "../../../scripts/content/lint"
import { formatProblemReport, summarizeProblems } from "../../../scripts/content/report"
import { formatProblem, type ContentProblem } from "../../../scripts/content/source-map"
import { COURSE_YAML, exerciseStep, frontmatter, guidedLesson, practiceLesson, quizStep, readingStep, TRACK_YAML, validTree, writeTree, type TempTree } from "./fixtures"

const GUIDED = "cursos/curso-teste/m1/01-guiada.lvl.md"
const PRACTICE = "cursos/curso-teste/m1/02-pratica.lvl.md"

let tree: TempTree | null = null
afterEach(() => {
  tree?.cleanup()
  tree = null
})

/** Compila a árvore válida com os arquivos trocados e devolve só os problemas (parse + lint). */
function lint(overrides: Record<string, string>): string[] {
  tree = writeTree({ ...validTree(), ...overrides })
  const compiled = compileContent({ contentDir: tree.dir })
  const problems: ContentProblem[] = [...compiled.problems, ...lintContent(compiled)]
  return problems.map(formatProblem)
}

const lineOf = (text: string, needle: string): number => text.split("\n").findIndex((line) => line.includes(needle)) + 1

describe("lintContent", () => {
  it("aprova a árvore válida", () => {
    expect(lint({})).toEqual([])
  })

  it("slugs únicos entre trilhas, cursos, módulos e lições", () => {
    const duplicateLesson = practiceLesson({ slug: "licao-teste" })
    expect(lint({ [PRACTICE]: duplicateLesson })).toEqual([`${PRACTICE}:${lineOf(duplicateLesson, "slug:")}: slug repetido: licao-teste (lição; já usado por lição em ${GUIDED}:2)`])
    expect(lint({ "cursos/curso-teste/m1/modulo.yaml": "slug: curso-teste\ntitulo: Módulo\nordem: 1\n" })).toEqual([
      expect.stringContaining("cursos/curso-teste/m1/modulo.yaml:1: slug repetido: curso-teste (módulo; já usado por curso em cursos/curso-teste/curso.yaml:1)"),
    ])
    expect(lint({ "trilhas/teste.yaml": TRACK_YAML.replace("slug: trilha-teste", "slug: licao-teste") })).toEqual([
      `${GUIDED}:2: slug repetido: licao-teste (lição; já usado por trilha em trilhas/teste.yaml:1)`,
    ])
  })

  it("passos numerados em sequência", () => {
    const text = `${frontmatter()}\n${readingStep(1)}\n${readingStep(3)}`
    expect(lint({ [GUIDED]: text })).toEqual([`${GUIDED}:${lineOf(text, "## Passo 3")}: passo numerado 3; esperado 2 (numere em sequência a partir de 1)`])
  })

  it("exercício precisa de instruções, código inicial, solução, verificação e ≥ 1 solução errada", () => {
    const missing = `${frontmatter({ slug: "pratica-teste", tipo: "pratica" })}\n${exerciseStep({ number: 1, instructions: null, starter: null, solution: null, verification: null, wrong: null })}`
    const line = lineOf(missing, "## Passo 1")
    expect(lint({ [PRACTICE]: missing })).toEqual([
      `${PRACTICE}:${line}: passo 1 (Exercício · Seu primeiro print) sem ### Instruções`,
      `${PRACTICE}:${line}: passo 1 (Exercício · Seu primeiro print) sem ### Código inicial (só pode faltar num passo de lição guiada que continua um exercício anterior)`,
      `${PRACTICE}:${line}: passo 1 (Exercício · Seu primeiro print) sem ### Solução`,
      `${PRACTICE}:${line}: passo 1 (Exercício · Seu primeiro print) sem ### Verificação (nenhum caso de teste)`,
      `${PRACTICE}:${line}: passo 1 (Exercício · Seu primeiro print) sem ### Soluções erradas (precisa de pelo menos uma, que a verificação deve reprovar)`,
    ])
  })

  it("código inicial pode faltar só num passo guiado que continua um exercício anterior", () => {
    const continuing = `${frontmatter()}\n${exerciseStep({ number: 1 })}\n${exerciseStep({ number: 2, starter: null, title: "Continuação" })}`
    expect(lint({ [GUIDED]: continuing })).toEqual([])
    const first = `${frontmatter()}\n${exerciseStep({ number: 1, starter: null })}`
    expect(lint({ [GUIDED]: first })).toEqual([expect.stringContaining("sem ### Código inicial")])
  })

  it("dicas ≤ 3", () => {
    const text = `${frontmatter({ slug: "pratica-teste", tipo: "pratica" })}\n${exerciseStep({ number: 1, hints: "1. a\n2. b\n3. c\n4. d" })}`
    expect(lint({ [PRACTICE]: text })).toEqual([`${PRACTICE}:${lineOf(text, "### Dicas")}: passo 1 (Exercício · Seu primeiro print) com 4 dicas (máximo 3)`])
  })

  it("quiz com exatamente uma correta e ≥ 2 opções", () => {
    const oneOption = `${frontmatter({ slug: "pratica-teste", tipo: "quiz" })}\n${quizStep(1, ["Enunciado\n- [x] única"])}`
    expect(lint({ [PRACTICE]: oneOption })).toEqual([`${PRACTICE}:${lineOf(oneOption, "### Pergunta")}: passo 1 (Quiz · Fixando): a pergunta 1 tem 1 alternativa(s); mínimo 2`])
    const twoCorrect = `${frontmatter({ slug: "pratica-teste", tipo: "quiz" })}\n${quizStep(1, ["Enunciado\n- [x] a\n- [x] b"])}`
    expect(lint({ [PRACTICE]: twoCorrect })).toEqual([expect.stringContaining("exatamente uma alternativa marcada com [x] (veio 2)")])
    const noQuestion = `${frontmatter({ slug: "pratica-teste", tipo: "quiz" })}\n## Passo 1 · Quiz · Vazio\n`
    expect(lint({ [PRACTICE]: noQuestion })).toEqual([expect.stringContaining("passo 1 (Quiz · Vazio) sem ### Pergunta")])
  })

  it("checkpoint de cada caso referencia uma instrução existente", () => {
    const verification = '```json\n[\n  { "id": "a", "kind": "io", "expected_stdout": "x", "checkpoint": 1 },\n  { "id": "b", "kind": "io", "expected_stdout": "x", "checkpoint": 7 }\n]\n```'
    const text = `${frontmatter({ slug: "pratica-teste", tipo: "pratica" })}\n${exerciseStep({ number: 1, verification })}`
    expect(lint({ [PRACTICE]: text })).toEqual([`${PRACTICE}:${lineOf(text, '"id": "b"')}: passo 1 (Exercício · Seu primeiro print): o caso "b" aponta o checkpoint 7, que não existe nas instruções (há 2)`])
  })

  it("runtime python-dados exige bibliotecas; runtime python exige nenhuma", () => {
    const noLibraries = guidedLesson({ runtime: "python-dados" })
    expect(lint({ [GUIDED]: noLibraries })).toEqual([`${GUIDED}:${lineOf(noLibraries, "runtime:")}: runtime python-dados exige bibliotecas (ex.: [numpy, pandas])`])
    const withLibraries = guidedLesson({ bibliotecas: "[numpy]" })
    expect(lint({ [GUIDED]: withLibraries })).toEqual([`${GUIDED}:${lineOf(withLibraries, "bibliotecas:")}: runtime python não aceita bibliotecas (use runtime: python-dados ou bibliotecas: [])`])
  })

  it("nenhum texto TODO, Em breve ou lorem", () => {
    const todo = `${frontmatter()}\n${readingStep(1, `${"x".repeat(200)} TODO revisar`)}`
    expect(lint({ [GUIDED]: todo })).toEqual([`${GUIDED}:${lineOf(todo, "## Passo 1")}: passo 1 (Leitura · O que é um programa): narrativa contém texto provisório ("TODO")`])
    const soon = guidedLesson({ descricao: "Em breve." })
    expect(lint({ [GUIDED]: soon })).toEqual([expect.stringContaining('lição licao-teste contém texto provisório ("Em breve")')])
    expect(lint({ "cursos/curso-teste/curso.yaml": COURSE_YAML.replace("Um curso.", "Lorem ipsum.") })).toEqual([expect.stringContaining('curso curso-teste contém texto provisório ("lorem")')])
    const hint = `${frontmatter({ slug: "pratica-teste", tipo: "pratica" })}\n${exerciseStep({ number: 1, hints: "1. TODO" })}`
    expect(lint({ [PRACTICE]: hint })).toEqual([expect.stringContaining('dicas contém texto provisório ("TODO")')])
    const question = `${frontmatter({ slug: "pratica-teste", tipo: "quiz" })}\n${quizStep(1, ["Em breve?\n- [x] a\n- [ ] b"])}`
    expect(lint({ [PRACTICE]: question })).toEqual([expect.stringContaining('pergunta 1 contém texto provisório ("Em breve")')])
  })

  it("a palavra todo em minúsculas e código com TODO não são texto provisório", () => {
    const text = `${frontmatter({ slug: "pratica-teste", tipo: "pratica" })}\n${exerciseStep({ number: 1, narrative: "Some todo mundo.", starter: "```python\n# TODO: implemente\n```" })}`
    expect(lint({ [PRACTICE]: text })).toEqual([])
  })

  it("objetivos ≥ 1 para lições publicadas", () => {
    const published = guidedLesson({ objetivos: null })
    expect(lint({ [GUIDED]: published })).toEqual([`${GUIDED}:1: lição publicada sem objetivos (objetivos: liste ao menos um)`])
    expect(lint({ [GUIDED]: guidedLesson({ objetivos: null, publicada: "false" }) })).toEqual([])
  })

  it("todo caso io tem expected_stdout", () => {
    const verification = '```json\n[ { "id": "vazio", "kind": "io", "expected_stdout": "  " } ]\n```'
    const text = `${frontmatter({ slug: "pratica-teste", tipo: "pratica" })}\n${exerciseStep({ number: 1, verification })}`
    expect(lint({ [PRACTICE]: text })).toEqual([`${PRACTICE}:${lineOf(text, '"id": "vazio"')}: passo 1 (Exercício · Seu primeiro print): o caso "vazio" (io) está com expected_stdout vazio`])
  })

  it("casos legacy não entram no conteúdo novo", () => {
    const verification = '```json\n[ { "id": "antigo", "kind": "legacy", "code": "assert True" } ]\n```'
    const text = `${frontmatter({ slug: "pratica-teste", tipo: "pratica" })}\n${exerciseStep({ number: 1, verification })}`
    expect(lint({ [PRACTICE]: text })).toEqual([`${PRACTICE}:${lineOf(text, '"id": "antigo"')}: passo 1 (Exercício · Seu primeiro print): o caso "antigo" é legacy (roda dentro do sandbox); use io, call, variable, source, expr ou unittest`])
  })

  it("títulos com ≥ 3 caracteres", () => {
    const shortStep = `${frontmatter()}\n${readingStep(1).replace("O que é um programa", "Oi")}`
    expect(lint({ [GUIDED]: shortStep })).toEqual([`${GUIDED}:${lineOf(shortStep, "## Passo 1")}: passo 1 com título curto demais: "Oi" (mínimo 3 caracteres)`])
    expect(lint({ "cursos/curso-teste/m1/modulo.yaml": "slug: modulo-teste\ntitulo: Ab\nordem: 1\n" })).toEqual([expect.stringContaining("modulo.yaml:2: módulo com título curto demais")])
    const shortLesson = guidedLesson({ titulo: "Ab" })
    expect(lint({ [GUIDED]: shortLesson })).toEqual([expect.stringMatching(/01-guiada\.lvl\.md:3: titulo: /)])
  })

  it("narrativa de passo de leitura com ≥ 200 caracteres", () => {
    const text = `${frontmatter()}\n${readingStep(1, "Curta.")}`
    expect(lint({ [GUIDED]: text })).toEqual([`${GUIDED}:${lineOf(text, "## Passo 1")}: passo 1 (Leitura · O que é um programa) com narrativa curta demais (6 caracteres; mínimo 200)`])
  })

  it("trilha cita só cursos existentes e pré-requisito existe", () => {
    expect(lint({ "trilhas/teste.yaml": TRACK_YAML.replace("- curso-teste", "- curso-fantasma") })).toEqual([`trilhas/teste.yaml:6: a trilha cita um curso inexistente: curso-fantasma`])
    expect(lint({ "cursos/curso-teste/curso.yaml": COURSE_YAML.replace("prerequisito: null", "prerequisito: curso-fantasma") })).toEqual([
      "cursos/curso-teste/curso.yaml:7: prerequisito aponta um curso inexistente: curso-fantasma",
    ])
  })

  it("ordem dos módulos não se repete no curso", () => {
    expect(lint({ "cursos/curso-teste/m2/modulo.yaml": "slug: modulo-dois\ntitulo: Módulo dois\nordem: 1\n" })).toEqual([
      "cursos/curso-teste/m1/modulo.yaml:4: ordem 1 repetida no curso (também no módulo modulo-dois)",
    ])
  })

  it("o relatório agrupa por arquivo e resume", () => {
    const problems: ContentProblem[] = [
      { file: "b.yaml", line: 3, message: "três" },
      { file: "a.lvl.md", line: 9, message: "nove" },
      { file: "a.lvl.md", line: 2, message: "dois" },
      { file: "b.yaml", line: null, message: "arquivo" },
    ]
    expect(formatProblemReport(problems)).toEqual(["a.lvl.md", "  2: dois", "  9: nove", "", "b.yaml", "  -: arquivo", "  3: três"])
    expect(summarizeProblems(problems)).toBe("4 problema(s) em 2 arquivo(s)")
  })
})
