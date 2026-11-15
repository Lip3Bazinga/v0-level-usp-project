import { afterEach, describe, expect, it } from "vitest"
import type { ProbeObservation, RunnerJob, RunnerResult } from "@levelusp/contracts"
import { normalizePredictionOutput } from "../../../src/modules/learning/steps.domain"
import { validateBundle } from "../../../scripts/content/bundle"
import { compileContent } from "../../../scripts/content/compiler"
import { shuffleParsonsLines } from "../../../scripts/content/lesson-parser"
import { fillsBlanks, lintContent } from "../../../scripts/content/lint"
import { describeUnusableOutput, generatePredictions, listVisualizeBlocks, verifySnippets, type SnippetRunner } from "../../../scripts/content/predictions"
import { formatProblem } from "../../../scripts/content/source-map"
import { listExerciseTargets, resolveSolution, verifyStep, type StepRunner } from "../../../scripts/content/verify"
import { exerciseStep, frontmatter, readingStep, validTree, writeTree, type TempTree } from "./fixtures"

const LESSON = "cursos/curso-teste/m1/03-formatos.lvl.md"
const SOLUTION = "```python\ndef dobro(n):\n    resultado = 2 * n\n    return resultado\n```"
const CASES = '```json\n[{ "id": "dobro-4", "checkpoint": 1, "kind": "call", "function": "dobro", "args": [4], "expected": 8, "name": "dobro(4) é 8" }]\n```'
const WRONG = '```python name="soma 2"\ndef dobro(n):\n    return n + 2\n```'
const INSTRUCTIONS = "1. Defina `dobro(n)`."

let tree: TempTree | null = null
afterEach(() => {
  tree?.cleanup()
  tree = null
})

function compile(steps: string): ReturnType<typeof compileContent> {
  tree?.cleanup()
  tree = writeTree({ ...validTree(), [LESSON]: `${frontmatter({ slug: "licao-formatos" })}\n${readingStep(1)}\n${steps}` })
  return compileContent({ contentDir: tree.dir })
}

function problemsOf(steps: string): string[] {
  const compiled = compile(steps)
  return [...compiled.problems, ...lintContent(compiled)].map((problem) => formatProblem(problem).replace(/^[^:]+:\d+: /, ""))
}

const blanks = (starter: string, solution = SOLUTION): string =>
  exerciseStep({ narrative: "modo: lacunas\n\nComplete.", instructions: INSTRUCTIONS, starter, solution, verification: CASES, wrong: WRONG, hints: null })

/** Passo `ordenar`: sem código inicial, com a seção de distratores depois da solução. */
function parsons(distractors: string | null = "```python\nreturn n\n```", solution = SOLUTION): string {
  const step = exerciseStep({ narrative: "modo: ordenar\n\nOrdene.", instructions: INSTRUCTIONS, starter: null, solution, verification: CASES, wrong: WRONG, hints: null })
  return distractors === null ? step : step.replace("\n### Verificação", `\n### Distratores\n${distractors}\n\n### Verificação`)
}

const prediction = (extra = ""): string =>
  `## Passo 2 · Previsão · O que imprime\n\nDigite a saída do programa.\n\n### Código\n\`\`\`python\nfor n in [1, 2]:\n    print(n * 2)\n\`\`\`\n${extra}`

describe("modo: lacunas", () => {
  it("compila com exercise_mode lacunas e a narrativa sem a linha do modo", () => {
    const compiled = compile(blanks("```python\ndef dobro(n):\n    resultado = ___ * n\n    return ___\n```"))
    expect([...compiled.problems, ...lintContent(compiled)]).toEqual([])
    const step = compiled.bundle.courses[0]?.modules[0]?.lessons[2]?.steps[1]
    expect(step).toMatchObject({ exercise_mode: "lacunas", narrative_markdown: "Complete.", parsons_lines: [] })
    expect(step?.starter_files[0]?.content).toContain("___")
    expect(validateBundle(compiled, "2026-11-14T00:00:00.000Z").problems).toEqual([])
  })

  it("exige ao menos uma lacuna e que a solução seja o código inicial preenchido", () => {
    expect(problemsOf(blanks("```python\ndef dobro(n):\n    pass\n```"))).toEqual([expect.stringContaining("(modo lacunas) sem nenhuma lacuna")])
    expect(problemsOf(blanks("```python\ndef dobro(numero):\n    resultado = ___ * numero\n    return ___\n```"))).toEqual([
      expect.stringContaining("(modo lacunas): a solução de main.py não é o código inicial com as lacunas preenchidas"),
    ])
    expect(problemsOf(blanks("```python\ndef dobro(n):\n    resultado = ___\n    return ___\n```", "```python\ndef dobro(n):\n    resultado = ___\n    return 2 * n\n```"))).toEqual([
      expect.stringContaining("(modo lacunas): a solução ainda tem lacunas"),
    ])
  })

  it("fillsBlanks: cada lacuna vira um trecho não vazio da mesma linha", () => {
    expect(fillsBlanks("x = ___\nprint(___)\n", "x = 10\nprint(x + 1)\n")).toBe(true)
    expect(fillsBlanks("x = ___\n", "x = \n")).toBe(false)
    expect(fillsBlanks("x = ___\n", "x = 1\ny = 2\n")).toBe(false)
    expect(fillsBlanks("f(___)[0] + a.b*c\n", "f(lista)[0] + a.b*c\n")).toBe(true)
    expect(fillsBlanks("f(___)[0] + a.b*c\n", "f(lista)[0] + aXb*c\n")).toBe(false)
  })

  it("modo desconhecido e modo fora de lição guiada são recusados", () => {
    expect(problemsOf(exerciseStep({ narrative: "modo: arrastar\n\nTexto." }))).toEqual([expect.stringContaining('modo de exercício desconhecido: "arrastar" (use codigo, lacunas, ordenar)')])
    tree?.cleanup()
    const practice = `${frontmatter({ slug: "pratica-lacunas", tipo: "pratica" })}\n${blanks("```python\ndef dobro(n):\n    resultado = ___ * n\n    return ___\n```").replace("## Passo 2", "## Passo 1")}`
    tree = writeTree({ ...validTree(), [LESSON]: practice })
    const compiled = compileContent({ contentDir: tree.dir })
    expect(lintContent(compiled).map((problem) => problem.message)).toEqual([expect.stringContaining("modo lacunas só vale em lição guiada")])
  })
})

describe("modo: ordenar (Parsons)", () => {
  it("entrega as linhas embaralhadas, sem indentação, com os distratores, e nunca na ordem da solução", () => {
    const compiled = compile(parsons())
    expect([...compiled.problems, ...lintContent(compiled)]).toEqual([])
    const step = compiled.bundle.courses[0]?.modules[0]?.lessons[2]?.steps[1]
    expect(step).toMatchObject({ exercise_mode: "ordenar", starter_files: [], narrative_markdown: "Ordene." })
    const texts = step?.parsons_lines.map((line) => line.text) ?? []
    expect([...texts].sort()).toEqual(["def dobro(n):", "resultado = 2 * n", "return n", "return resultado"])
    expect(texts.filter((text) => text !== "return n")).not.toEqual(["def dobro(n):", "resultado = 2 * n", "return resultado"])
    expect(step?.parsons_lines.map((line) => line.id)).toEqual(["l1", "l2", "l3", "l4"])
    expect(validateBundle(compiled, "2026-11-14T00:00:00.000Z").problems).toEqual([])
  })

  it("o embaralhamento é determinístico pela semente e muda com ela", () => {
    const source = "a = 1\nb = 2\nc = 3\nd = 4\ne = 5\nf = 6\n"
    const first = shuffleParsonsLines(source, ["x = 0"], "licao:2")
    expect(shuffleParsonsLines(source, ["x = 0"], "licao:2")).toEqual(first)
    const seeds = Array.from({ length: 30 }, (_unused, index) => shuffleParsonsLines(source, [], `licao:${index}`).map((line) => line.text).join("|"))
    expect(new Set(seeds).size).toBeGreaterThan(20)
    expect(seeds).not.toContain("a = 1|b = 2|c = 3|d = 4|e = 5|f = 6")
  })

  it("recusa código inicial, distratores fora do modo, distrator igual à solução e indentação irregular", () => {
    const withStarter = exerciseStep({ narrative: "modo: ordenar\n\nOrdene.", instructions: INSTRUCTIONS, solution: SOLUTION, verification: CASES, wrong: WRONG })
    expect(problemsOf(withStarter)).toEqual([expect.stringContaining("exercício com modo: ordenar não tem ### Código inicial")])
    expect(problemsOf(parsons().replace("modo: ordenar\n\n", ""))).toEqual([expect.stringContaining("### Distratores só vale em exercício com modo: ordenar")])
    expect(problemsOf(parsons("```python\nreturn resultado\n```"))).toEqual([expect.stringContaining('o distrator "return resultado" é igual a uma linha da solução')])
    expect(problemsOf(parsons(null, "```python\ndef dobro(n):\n  resultado = 2 * n\n  return resultado\n```"))).toEqual([
      expect.stringContaining("(modo ordenar): a solução precisa indentar com múltiplos de 4 espaços"),
    ])
    expect(problemsOf(parsons(null, "```python\ndef dobro(n):\n    return 2 * n\n```"))).toEqual([expect.stringContaining("(modo ordenar): a solução tem 2 linha(s) de código; mínimo 3")])
  })

  it("verify: a solução montada aprova e a ordem embaralhada precisa reprovar", async () => {
    const validation = validateBundle(compile(parsons()), "2026-11-14T00:00:00.000Z")
    if (!validation.bundle) throw new Error("pacote inválido")
    const [target] = listExerciseTargets(validation.bundle, { lesson: "licao-formatos" })
    if (!target) throw new Error("passo ausente")
    expect(target.starter).toMatchObject({ isShuffledOrder: true, inheritedFrom: null })
    expect(target.starter?.files[0]?.content.split("\n").filter(Boolean)).toEqual(target.step.parsons_lines.map((line) => line.text))
    expect(resolveSolution(target.step)).toEqual([{ path: "main.py", content: "def dobro(n):\n    resultado = 2 * n\n    return resultado\n" }])

    const jobs: RunnerJob[] = []
    const approveAll: StepRunner = {
      run(job) {
        jobs.push(job)
        return Promise.resolve({ observations: [{ id: "call:dobro-4", ok: true, value: 8, type: "int" }], engine: { python: "fake", runtime: "python" }, durationMs: 1 })
      },
    }
    const verdict = await verifyStep(target, approveAll)
    expect(verdict.status).toBe("falha")
    expect(verdict.details[0]).toBe("a ordem embaralhada (linhas como o aluno recebe, sem indentação) foi APROVADA (casos que passaram: dobro-4)")
    expect(jobs[0]?.files).toEqual(resolveSolution(target.step))
  })
})

/** Executor falso para sondas `run`: devolve a saída programada para cada `main.py`. */
function outputRunner(outputs: (source: string) => Partial<ProbeObservation> | Error): SnippetRunner & { sources: string[] } {
  const sources: string[] = []
  return {
    sources,
    run(job: RunnerJob): Promise<RunnerResult> {
      const source = job.files.find((file) => file.path === "main.py")?.content ?? ""
      sources.push(source)
      const outcome = outputs(source)
      if (outcome instanceof Error) return Promise.reject(outcome)
      const observations = job.probes.map((probe): ProbeObservation => ({ id: probe.id, ok: true, stdout: "", ...outcome }))
      return Promise.resolve({ observations, engine: { python: "fake", runtime: "python" }, durationMs: 1 })
    },
  }
}

describe("passo Previsão", () => {
  it("compila com o código em starter_files e sem saída esperada (ela nasce no build)", () => {
    const compiled = compile(prediction("\n### Dicas\n1. O laço roda duas vezes.\n"))
    expect([...compiled.problems, ...lintContent(compiled)]).toEqual([])
    const step = compiled.bundle.courses[0]?.modules[0]?.lessons[2]?.steps[1]
    expect(step).toMatchObject({ kind: "previsao", expected_output: "", hints: ["O laço roda duas vezes."], test_cases: [], solution_files: [] })
    expect(step?.starter_files).toEqual([{ path: "main.py", content: "for n in [1, 2]:\n    print(n * 2)\n" }])
    // Sem a saída gerada o pacote NÃO valida: não há como publicar uma previsão sem gabarito.
    expect(validateBundle(compiled, "2026-11-14T00:00:00.000Z").problems.map((problem) => problem.message)).toEqual([expect.stringContaining("um passo de previsão precisa da saída esperada")])
  })

  it("generatePredictions grava a saída real do executor, normalizada, e o pacote passa a validar", async () => {
    const compiled = compile(prediction())
    const runner = outputRunner(() => ({ stdout: "2  \n4\n\n\n" }))
    expect(await generatePredictions(compiled, runner)).toEqual([])
    expect(runner.sources).toEqual(["for n in [1, 2]:\n    print(n * 2)\n"])
    expect(compiled.bundle.courses[0]?.modules[0]?.lessons[2]?.steps[1]?.expected_output).toBe("2\n4")
    expect(validateBundle(compiled, "2026-11-14T00:00:00.000Z").problems).toEqual([])
  })

  it("a ### Saída esperada escrita só confere: divergência da execução real é problema com arquivo:linha", async () => {
    const text = prediction("\n### Saída esperada\n```text\n2\n5\n```\n")
    const compiled = compile(text)
    expect(compiled.bundle.courses[0]?.modules[0]?.lessons[2]?.steps[1]?.expected_output).toBe("2\n5")
    const problems = await generatePredictions(compiled, outputRunner(() => ({ stdout: "2\n4\n" })))
    expect(problems).toHaveLength(1)
    expect(problems[0]?.file).toBe(LESSON)
    expect(problems[0]?.message).toContain('a ### Saída esperada escrita não bate com a saída real do programa ("2\\n4")')
    // A saída gravada é sempre a da execução, nunca a digitada pelo autor.
    expect(compiled.bundle.courses[0]?.modules[0]?.lessons[2]?.steps[1]?.expected_output).toBe("2\n4")
  })

  it("erro do programa, saída vazia, saída longa e executor fora do ar viram problemas, sem inventar saída", async () => {
    const cases: [Parameters<typeof outputRunner>[0], string][] = [
      [() => ({ ok: false, error: "ZeroDivisionError: division by zero" }), "o programa terminou com erro: ZeroDivisionError: division by zero"],
      [() => ({ stdout: "\n" }), "o programa não imprime nada"],
      [() => ({ stdout: Array.from({ length: 30 }, (_unused, index) => String(index)).join("\n") }), "a saída tem 30 linhas (máximo 20"],
      [() => ({ timedOut: true }), "o programa estourou o tempo limite"],
      [() => new Error("executor respondeu 503: busy"), "executor: executor respondeu 503: busy"],
    ]
    for (const [outputs, message] of cases) {
      const compiled = compile(prediction())
      const problems = await generatePredictions(compiled, outputRunner(outputs))
      expect(problems.map((problem) => problem.message)).toEqual([expect.stringContaining(message)])
      expect(validateBundle(compiled, "2026-11-14T00:00:00.000Z").bundle?.courses[0]?.modules[0]?.lessons[2]?.steps[1]?.expected_output ?? "").not.toBe("2\n4")
    }
    expect(describeUnusableOutput("x".repeat(5000))).toContain("5000 caracteres")
  })

  it("exige ### Código, recusa input() e seções de exercício", () => {
    expect(problemsOf("## Passo 2 · Previsão · Sem código\n\nDigite a saída.\n")).toEqual([expect.stringContaining("sem ### Código")])
    expect(problemsOf(prediction().replace("for n in [1, 2]:\n    print(n * 2)", "print(input())"))).toEqual([expect.stringContaining("código da previsão: não pode chamar input()")])
    expect(problemsOf(`${prediction()}\n### Solução\n\`\`\`python\nprint(1)\n\`\`\`\n`)).toEqual([expect.stringContaining("a seção ### Solução não vale em passo Previsão")])
  })

  it("verifySnippets: a previsão precisa se reproduzir e o bloco visualizar precisa rodar", async () => {
    const steps = `${prediction()}\n## Passo 3 · Leitura · Com visualizador\n\n${"Texto de leitura com tamanho suficiente para o lint. ".repeat(5)}\n\n\`\`\`python visualizar\nx = 1\nprint(x)\n\`\`\`\n`
    const compiled = compile(steps)
    expect(await generatePredictions(compiled, outputRunner(() => ({ stdout: "2\n4\n" })))).toEqual([])
    const bundle = validateBundle(compiled, "2026-11-14T00:00:00.000Z").bundle
    if (!bundle) throw new Error("pacote inválido")
    expect(listVisualizeBlocks(bundle.courses[0]?.modules[0]?.lessons[2]?.steps[2]?.narrative_markdown ?? "")).toEqual([{ index: 1, code: "x = 1\nprint(x)\n" }])

    const stable = await verifySnippets(bundle, outputRunner((source) => ({ stdout: source.startsWith("for") ? "2 \n4\n" : "1\n" })), { lesson: "licao-formatos" })
    expect(stable.map((verdict) => [verdict.label, verdict.status])).toEqual([["previsão", "ok"], ["bloco visualizar 1", "ok"]])
    const flaky = await verifySnippets(bundle, outputRunner((source) => (source.startsWith("for") ? { stdout: "2\n5\n" } : { ok: false, error: "NameError: x" })), { lesson: "licao-formatos" })
    expect(flaky.map((verdict) => [verdict.status, verdict.detail])).toEqual([
      ["falha", expect.stringContaining("difere da saída esperada gravada")],
      ["falha", "o programa terminou com erro: NameError: x"],
    ])
    const down = await verifySnippets(bundle, outputRunner(() => new Error("fora do ar")), { lesson: "licao-formatos" })
    expect(down.map((verdict) => verdict.status)).toEqual(["erro", "erro"])
  })

  it("normalizePredictionOutput ignora só o fim das linhas e as linhas em branco do fim", () => {
    expect(normalizePredictionOutput("a  \r\nb\t\n\n \n")).toBe("a\nb")
    expect(normalizePredictionOutput("  a\n\nb")).toBe("  a\n\nb")
  })
})
