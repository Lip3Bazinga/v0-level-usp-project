import { describe, expect, it } from "vitest"
import { normalizeName, parseLessonFile, type ParsedLessonFile } from "../../../scripts/content/lesson-parser"
import { SourceMap } from "../../../scripts/content/source-map"
import { exerciseStep, frontmatter, guidedLesson, practiceLesson, quizStep, readingStep } from "./fixtures"

const FILE = "cursos/c/m/01-teste.lvl.md"

function parse(text: string): ParsedLessonFile & { locations: SourceMap } {
  const locations = new SourceMap()
  return { ...parseLessonFile(text, FILE, locations), locations }
}

/** O único problema do arquivo, com a linha. */
function onlyProblem(text: string): { line: number | null; message: string } {
  const { lesson, problems } = parse(text)
  expect(lesson).toBeNull()
  expect(problems).toHaveLength(1)
  const [problem] = problems
  if (!problem) throw new Error("sem problema")
  expect(problem.file).toBe(FILE)
  return { line: problem.line, message: problem.message }
}

/** O único problema do arquivo está na linha e contém (ou casa com) a mensagem. */
function expectOnly(text: string, line: number, message: string | RegExp): void {
  const problem = onlyProblem(text)
  expect(problem.line).toBe(line)
  if (typeof message === "string") expect(problem.message).toContain(message)
  else expect(problem.message).toMatch(message)
}

const lineOf = (text: string, needle: string): number => text.split("\n").findIndex((line) => line.includes(needle)) + 1

describe("parseLessonFile: casos felizes", () => {
  it("compila uma lição guiada com leitura, exercício e quiz", () => {
    const text = guidedLesson()
    const { lesson, problems } = parse(text)
    expect(problems).toEqual([])
    expect(lesson).toMatchObject({
      slug: "licao-teste",
      title: "Lição de teste",
      description: "Uma lição usada nos testes.",
      lesson_type: "guided",
      difficulty: "iniciante",
      runtime: "python",
      libraries: [],
      xp_reward: 50,
      time_limit: 10,
      published: true,
      is_project: false,
      solution_after_attempts: 3,
      objectives: ["Aprender a testar"],
      quiz_passing_score: 70,
    })
    expect(lesson?.steps.map((step) => [step.order, step.kind, step.title])).toEqual([
      [1, "leitura", "O que é um programa"],
      [2, "exercicio", "Seu primeiro print"],
      [3, "quiz", "Fixando"],
    ])
    const [reading, exercise, quiz] = lesson?.steps ?? []
    expect(reading?.narrative_markdown.startsWith("Um programa é uma lista")).toBe(true)
    expect(exercise).toMatchObject({
      narrative_markdown: "Escreva um programa de uma linha.",
      starter_files: [{ path: "main.py", content: "# Escreva seu código abaixo\n" }],
      solution_files: [{ path: "main.py", content: 'print("Olá, mundo!")\n' }],
      checkpoints: [
        { id: 1, instruction: "Use `print()` para exibir `Olá, mundo!`.", hint: "o texto vai entre aspas." },
        { id: 2, instruction: "Não esqueça a exclamação." },
      ],
      hints: ["`print` recebe o texto entre aspas.", "Cada `print` escreve em uma linha nova."],
      wrong_solutions: [
        { name: "sem aspas", files: [{ path: "main.py", content: "print(Olá, mundo!)\n" }] },
        { name: "texto diferente", files: [{ path: "main.py", content: 'print("Ola mundo")\n' }] },
      ],
      xp: 10,
    })
    expect(exercise?.test_cases).toEqual([
      { id: "saida", checkpoint: 1, kind: "io", stdin: "", expected_stdout: "Olá, mundo!", match: "contains", name: "Exibe Olá, mundo!" },
      { id: "usa-print", checkpoint: 2, kind: "source", rule: { type: "calls", name: "print" } },
    ])
    expect(quiz?.quiz_questions).toEqual([
      { prompt: "Qual função exibe texto?", options: ["`show()`", "`print()`", "`echo()`"], correct_index: 1, explanation: "`print()` escreve na saída padrão." },
    ])
  })

  it("compila uma lição prática como coding com um único passo de exercício", () => {
    const { lesson, problems } = parse(practiceLesson())
    expect(problems).toEqual([])
    expect(lesson?.lesson_type).toBe("coding")
    expect(lesson?.steps.map((step) => step.kind)).toEqual(["exercicio"])
  })

  it("compila leitura e quiz clássicos", () => {
    const reading = parse(`${frontmatter({ tipo: "leitura" })}\n${readingStep(1)}`)
    expect(reading.problems).toEqual([])
    expect(reading.lesson?.lesson_type).toBe("theory")
    const quiz = parse(`${frontmatter({ tipo: "quiz" })}\n${quizStep(1)}`)
    expect(quiz.problems).toEqual([])
    expect(quiz.lesson?.lesson_type).toBe("quiz")
    expect(quiz.lesson?.steps[0]?.quiz_questions).toHaveLength(1)
  })

  it("aceita - ou — no cabeçalho do passo e Exercicio sem acento", () => {
    const text = `${frontmatter()}\n## Passo 1 - Leitura - Título um\n\n${"x".repeat(10)}\n\n## Passo 2 — exercicio — Título dois\n${exerciseStep({ number: 2 }).split("\n").slice(1).join("\n")}`
    const { lesson, problems } = parse(text)
    expect(problems).toEqual([])
    expect(lesson?.steps.map((step) => [step.kind, step.title])).toEqual([["leitura", "Título um"], ["exercicio", "Título dois"]])
  })

  it("mapeia o cabeçalho inteiro, inclusive python-dados com bibliotecas", () => {
    const extra = {
      dificuldade: "avancado",
      runtime: "python-dados",
      bibliotecas: "[numpy, pandas]",
      xp: "150",
      tempo_min: "40",
      publicada: "false",
      projeto: "true",
      solucao_apos_tentativas: "0",
      nota_minima_quiz: "80",
    }
    const { lesson, problems } = parse(guidedLesson(extra))
    expect(problems).toEqual([])
    expect(lesson).toMatchObject({
      difficulty: "avancado",
      runtime: "python-dados",
      libraries: ["numpy", "pandas"],
      xp_reward: 150,
      time_limit: 40,
      published: false,
      is_project: true,
      solution_after_attempts: 0,
      quiz_passing_score: 80,
    })
  })

  it("lê blocos com path= (outros arquivos e dados) e agrupa blocos seguidos da mesma solução errada", () => {
    const starter = "```python\nimport utils\n```\n```python path=utils.py\ndef f():\n    pass\n```\n```text path=dados.csv\na,b\n1,2\n```"
    const wrong = '```python name="dois arquivos"\nimport utils\n```\n```python name="dois arquivos" path=utils.py\ndef f():\n    return 0\n```\n```python name="outro"\nprint(1)\n```'
    const { lesson, problems } = parse(`${frontmatter({ tipo: "pratica" })}\n${exerciseStep({ number: 1, starter, wrong })}`)
    expect(problems).toEqual([])
    const [step] = lesson?.steps ?? []
    expect(step?.starter_files.map((file) => file.path)).toEqual(["main.py", "utils.py", "dados.csv"])
    expect(step?.starter_files[2]?.content).toBe("a,b\n1,2\n")
    expect(step?.wrong_solutions.map((solution) => [solution.name, solution.files.map((file) => file.path)])).toEqual([
      ["dois arquivos", ["main.py", "utils.py"]],
      ["outro", ["main.py"]],
    ])
  })

  it("registra onde cada objeto nasceu: campos do cabeçalho, passos, checkpoints, casos e perguntas", () => {
    const text = guidedLesson()
    const { lesson, locations } = parse(text)
    if (!lesson) throw new Error("lição inválida")
    expect(locations.get(lesson)).toEqual({ file: FILE, line: 1 })
    expect(locations.getField(lesson, "title")).toEqual({ file: FILE, line: lineOf(text, "titulo:") })
    expect(locations.getField(lesson, "objectives")).toEqual({ file: FILE, line: lineOf(text, "objetivos:") })
    const [reading, exercise, quiz] = lesson.steps
    expect(locations.get(reading ?? {})).toEqual({ file: FILE, line: lineOf(text, "## Passo 1") })
    expect(locations.get(exercise ?? {})).toEqual({ file: FILE, line: lineOf(text, "## Passo 2") })
    expect(locations.getField(exercise ?? {}, "hints")).toEqual({ file: FILE, line: lineOf(text, "### Dicas") })
    expect(locations.get(exercise?.checkpoints[1] ?? {})).toEqual({ file: FILE, line: lineOf(text, "2. Não esqueça") })
    expect(locations.get(exercise?.test_cases[1] ?? {})).toEqual({ file: FILE, line: lineOf(text, '"id": "usa-print"') })
    expect(locations.get(exercise?.wrong_solutions[1] ?? {})).toEqual({ file: FILE, line: lineOf(text, 'name="texto diferente"') })
    expect(locations.get(quiz?.quiz_questions[0] ?? {})).toEqual({ file: FILE, line: lineOf(text, "### Pergunta") })
  })

  it("normaliza nomes de seção e de tipo sem acentos", () => {
    expect(normalizeName("  Soluções   Erradas ")).toBe("solucoes erradas")
    expect(normalizeName("EXERCÍCIO")).toBe("exercicio")
  })
})

describe("parseLessonFile: erros apontam arquivo:linha", () => {
  it("exige o cabeçalho YAML", () => {
    expectOnly("## Passo 1 · Leitura · X\n", 1, "cabeçalho YAML")
    expectOnly("---\nslug: x\n", 1, "sem o --- de fechamento")
  })

  it("recusa chave desconhecida no cabeçalho, na linha da chave", () => {
    const text = guidedLesson({ xpp: "10" })
    expectOnly(text, lineOf(text, "xpp:"), "chave desconhecida: xpp")
  })

  it("recusa tipo inválido e valores fora do schema, na linha do campo", () => {
    const badType = guidedLesson({ tipo: "guiado" })
    expectOnly(badType, lineOf(badType, "tipo:"), "tipo inválido: guiado (use guiada, pratica, leitura, quiz)")
    const badXp = guidedLesson({ xp: "muito" })
    expectOnly(badXp, lineOf(badXp, "xp:"), /^xp: /)
    const badSlug = guidedLesson({ slug: "Maiúsculo" })
    expect(onlyProblem(badSlug).line).toBe(lineOf(badSlug, "slug:"))
  })

  it("aponta YAML mal formado no cabeçalho", () => {
    const text = "---\nslug: a\ntitulo: [\n---\n"
    const problem = onlyProblem(text)
    expect(problem.message).toContain("YAML inválido")
    expect(problem.line).toBeGreaterThanOrEqual(3)
  })

  it("exige passos numerados em sequência e cabeçalho no formato", () => {
    const text = `${frontmatter()}\n${readingStep(1)}\n${readingStep(3)}`
    expectOnly(text, lineOf(text, "## Passo 3"), "passo numerado 3; esperado 2 (numere em sequência a partir de 1)")
    const badHeader = `${frontmatter()}\n## Introdução\n`
    expectOnly(badHeader, lineOf(badHeader, "## Introdução"), "cabeçalho de passo inválido")
    const badKind = `${frontmatter()}\n## Passo 1 · Teoria · X\n`
    expectOnly(badKind, lineOf(badKind, "## Passo 1"), "tipo de passo desconhecido")
  })

  it("recusa conteúdo antes do primeiro passo", () => {
    const text = `${frontmatter()}\nTexto solto\n${readingStep(1)}`
    expectOnly(text, lineOf(text, "Texto solto"), "conteúdo fora de um passo")
  })

  it("recusa seção desconhecida, seção fora do tipo do passo e seção repetida", () => {
    const unknown = `${frontmatter({ tipo: "pratica" })}\n${exerciseStep({ number: 1 })}\n### Resumo\nx\n`
    expectOnly(unknown, lineOf(unknown, "### Resumo"), "seção desconhecida")
    const wrongKind = `${frontmatter({ tipo: "leitura" })}\n${readingStep(1)}\n### Dicas\n1. x\n`
    expectOnly(wrongKind, lineOf(wrongKind, "### Dicas"), "não vale em passo Leitura")
    const repeated = `${frontmatter({ tipo: "pratica" })}\n${exerciseStep({ number: 1 })}\n### Dicas\n1. de novo\n`
    expectOnly(repeated, repeated.split("\n").lastIndexOf("### Dicas") + 1, "seção ### Dicas repetida no passo 1")
  })

  it("aponta JSON inválido e casos fora do schema na linha do caso", () => {
    const broken = `${frontmatter({ tipo: "pratica" })}\n${exerciseStep({ number: 1, verification: "```json\n[ { \"id\": \"a\", }\n```" })}`
    expectOnly(broken, lineOf(broken, "```json"), "JSON inválido")
    const verification = '```json\n[\n  { "id": "ok", "kind": "io", "expected_stdout": "x" },\n  { "id": "ruim", "kind": "io" }\n]\n```'
    const invalid = `${frontmatter({ tipo: "pratica" })}\n${exerciseStep({ number: 1, verification })}`
    expectOnly(invalid, lineOf(invalid, '"id": "ruim"'), /^caso 2 \(expected_stdout\): /)
    const notList = `${frontmatter({ tipo: "pratica" })}\n${exerciseStep({ number: 1, verification: '```json\n{ "id": "a" }\n```' })}`
    expect(onlyProblem(notList).message).toContain("lista JSON")
  })

  it("exige exatamente uma alternativa correta por pergunta", () => {
    const twoCorrect = `${frontmatter({ tipo: "quiz" })}\n${quizStep(1, ["Enunciado\n- [x] a\n- [x] b"])}`
    expectOnly(twoCorrect, lineOf(twoCorrect, "### Pergunta"), "a pergunta precisa de exatamente uma alternativa marcada com [x] (veio 2)")
    const none = `${frontmatter({ tipo: "quiz" })}\n${quizStep(1, ["Enunciado\n- [ ] a\n- [ ] b"])}`
    expect(onlyProblem(none).message).toContain("(veio 0)")
  })

  it("recusa bloco sem nome em Soluções erradas, bloco sem path e path inválido", () => {
    const noName = `${frontmatter({ tipo: "pratica" })}\n${exerciseStep({ number: 1, wrong: "```python\nprint(1)\n```" })}`
    expectOnly(noName, lineOf(noName, "### Soluções erradas") + 1, "bloco sem nome")
    const noPath = `${frontmatter({ tipo: "pratica" })}\n${exerciseStep({ number: 1, starter: "```text\na,b\n```" })}`
    expect(onlyProblem(noPath).message).toContain("precisa de path=")
    const badPath = `${frontmatter({ tipo: "pratica" })}\n${exerciseStep({ number: 1, starter: "```python path=../fora.py\nx\n```" })}`
    expect(onlyProblem(badPath).message).toContain('path inválido "../fora.py"')
  })

  it("recusa bloco sem fechamento e texto solto em seção de código", () => {
    const unclosed = `${frontmatter({ tipo: "pratica" })}\n${exerciseStep({ number: 1, wrong: '```python name="aberto"\nprint(1)' })}`
    expectOnly(unclosed, lineOf(unclosed, 'name="aberto"'), "bloco de código sem fechamento (```)")
    const loose = `${frontmatter({ tipo: "pratica" })}\n${exerciseStep({ number: 1, solution: "texto\n```python\nprint(1)\n```" })}`
    expect(onlyProblem(loose).message).toContain("texto solto na seção ### Solução")
  })

  it("exige um único passo do tipo certo nas lições clássicas e ao menos um passo na guiada", () => {
    const two = `${frontmatter({ tipo: "leitura" })}\n${readingStep(1)}\n${readingStep(2)}`
    expectOnly(two, lineOf(two, "## Passo 2"), "aceita um único passo")
    const wrongKind = `${frontmatter({ tipo: "pratica" })}\n${readingStep(1)}`
    expectOnly(wrongKind, lineOf(wrongKind, "## Passo 1"), "lição do tipo pratica exige um passo Exercício, veio Leitura")
    expect(onlyProblem(frontmatter()).message).toContain("lição guiada sem passos")
  })
})
