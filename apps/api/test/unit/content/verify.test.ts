import { createServer, type Server } from "node:http"
import { contentBundleSchema, type AstFeatures, type BundleStep, type ContentBundle, type Json, type ProbeObservation, type RunnerJob, type RunnerResult, type SourceRule, type TestCase } from "@levelusp/contracts"
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { buildProbes } from "../../../src/modules/grading/grading.domain"
import { validateBundle } from "../../../scripts/content/bundle"
import { compileContent } from "../../../scripts/content/compiler"
import { buildVerifyJob, createHttpRunner, createPool, formatLessonHeading, formatVerdict, listExerciseTargets, resolveStarter, verifyBundle, verifyStep, wrongSolutionFiles, type StepRunner } from "../../../scripts/content/verify"
import { EXAMPLE_DIR, exerciseStep, frontmatter, validTree, writeTree, type TempTree } from "./fixtures"

/** Pacote validado a partir de uma árvore em disco. */
function bundleOf(contentDir: string): ContentBundle {
  const validation = validateBundle(compileContent({ contentDir }), "2026-11-05T00:00:00.000Z")
  if (!validation.bundle) throw new Error(validation.problems.map((problem) => problem.message).join("\n"))
  return validation.bundle
}

/** Características de AST que satisfazem a regra (o executor falso "sabe" o gabarito; só vale nos testes). */
function satisfy(rule: SourceRule, features: AstFeatures): void {
  switch (rule.type) {
    case "uses":
      features.constructs.push(rule.construct)
      if (rule.function !== undefined) features.function_constructs[rule.function] = [rule.construct]
      break
    case "calls":
      features.calls.push(rule.name)
      break
    case "defines_function":
      features.functions.push(rule.name)
      break
    case "defines_class":
      features.classes.push(rule.name)
      break
    case "imports":
      features.imports.push(rule.module)
      break
    case "decorator":
      features.decorators.push(rule.name)
      break
    case "catches":
      features.handlers.push(rule.exception)
      break
    case "not_uses":
    case "not_calls":
      break
  }
}

/** Observações que APROVAM todos os casos (derivadas do gabarito, só para os testes). */
function passingObservations(cases: TestCase[], job: RunnerJob): ProbeObservation[] {
  const features: AstFeatures = { constructs: [], calls: [], functions: [], classes: [], imports: [], recursive_functions: [], decorators: [], handlers: [], function_constructs: {} }
  const values: Record<string, Json> = {}
  const types: Record<string, string> = {}
  const observations: ProbeObservation[] = []
  for (const testCase of cases) {
    switch (testCase.kind) {
      case "io":
        observations.push({ id: `run:${testCase.id}`, ok: true, stdout: `${testCase.expected_stdout}\n` })
        break
      case "call":
        observations.push({ id: `call:${testCase.id}`, ok: true, value: testCase.expected, ...(testCase.type === undefined ? {} : { type: testCase.type }) })
        break
      case "variable":
        values[testCase.variable] = testCase.expected
        if (testCase.type !== undefined) types[testCase.variable] = testCase.type
        break
      case "source":
        satisfy(testCase.rule, features)
        break
      case "expr":
        observations.push({ id: `expr:${testCase.id}`, ok: true, ...(testCase.expected === undefined ? {} : { value: testCase.expected }), ...(testCase.type === undefined ? {} : { type: testCase.type }) })
        break
      case "unittest":
      case "legacy":
        throw new Error(`caso ${testCase.kind} não simulado`)
    }
  }
  for (const probe of job.probes) {
    if (probe.kind === "globals") observations.push({ id: probe.id, ok: true, values, types, missing: [] })
    if (probe.kind === "ast") observations.push({ id: probe.id, ok: true, features })
  }
  return observations
}

/** Toda sonda falha: nenhum caso passa. */
function failingObservations(job: RunnerJob): ProbeObservation[] {
  return job.probes.map((probe) => ({ id: probe.id, ok: false, error: "NameError: nome não definido" }))
}

type Policy = "coerente" | "aprova-tudo" | "reprova-tudo" | "quebrado"

const probeIds = (cases: TestCase[]): string => JSON.stringify(buildProbes(cases).map((probe) => probe.id))

/** Executor falso: aprova só os projetos iguais à solução de referência do passo (ou segue a política). */
function fakeRunner(bundle: ContentBundle, policy: Policy = "coerente"): StepRunner & { jobs: RunnerJob[] } {
  const steps = bundle.courses.flatMap((course) => course.modules.flatMap((module) => module.lessons.flatMap((lesson) => lesson.steps)))
  const jobs: RunnerJob[] = []
  return {
    jobs,
    run(job: RunnerJob): Promise<RunnerResult> {
      jobs.push(job)
      if (policy === "quebrado") return Promise.reject(new Error("executor respondeu 503: busy"))
      const jobProbeIds = JSON.stringify(job.probes.map((probe) => probe.id))
      const step = steps.find((candidate) => candidate.kind === "exercicio" && probeIds(candidate.test_cases) === jobProbeIds)
      const isSolution = step !== undefined && JSON.stringify(step.solution_files) === JSON.stringify(job.files)
      const shouldPass = policy === "aprova-tudo" || (policy === "coerente" && isSolution)
      const observations = shouldPass ? passingObservations(step?.test_cases ?? [], job) : failingObservations(job)
      return Promise.resolve({ observations, engine: { python: "fake", runtime: job.runtime ?? "python" }, durationMs: 7 })
    },
  }
}

describe("verifyBundle com o executor falso", () => {
  const bundle = bundleOf(EXAMPLE_DIR)

  it("aprova o content/exemplo quando o executor é coerente, enviando runtime python sem bibliotecas", async () => {
    const runner = fakeRunner(bundle)
    const reports: string[] = []
    const { summary } = await verifyBundle(bundle, runner, {}, (report) => reports.push(formatLessonHeading(report)))
    expect(summary).toEqual({ lessons: 3, steps: 4, failed: 0, errors: 0 })
    expect(reports).toEqual([
      "curso-exemplo / exemplo-m1-primeiros-passos / exemplo-m1-01-ola-python — Olá, Python (python)",
      "curso-exemplo / exemplo-m1-primeiros-passos / exemplo-m1-02-funcoes-basicas — Funções básicas (python)",
      "curso-exemplo / exemplo-m1-primeiros-passos / exemplo-m1-03-recursos-de-apresentacao — Média de notas (todos os recursos) (python)",
    ])
    // solução + código inicial (ou ordem embaralhada) + soluções erradas: (1 + 1 + 3) + (1 + 1 + 4) + (1 + 1 + 2) + (1 + 1 + 2)
    expect(runner.jobs).toHaveLength(19)
    expect(runner.jobs.every((job) => job.runtime === "python" && !("libraries" in job))).toBe(true)
  })

  it("acusa solução errada e código inicial aprovados, listando os casos que passaram", async () => {
    const { reports, summary } = await verifyBundle(bundle, fakeRunner(bundle, "aprova-tudo"), { lesson: "exemplo-m1-01-ola-python" })
    expect(summary).toEqual({ lessons: 1, steps: 1, failed: 1, errors: 0 })
    const [verdict] = reports[0]?.verdicts ?? []
    if (!verdict) throw new Error("sem veredito")
    expect(verdict.status).toBe("falha")
    expect(verdict.details).toEqual([
      "código inicial APROVADO sem o aluno fazer nada (casos que passaram: saida, duas-linhas, usa-print)",
      'solução errada APROVADA: "sem aspas" (casos que passaram quando deviam falhar: saida, duas-linhas, usa-print)',
      'solução errada APROVADA: "texto diferente" (casos que passaram quando deviam falhar: saida, duas-linhas, usa-print)',
      'solução errada APROVADA: "tudo em uma linha" (casos que passaram quando deviam falhar: saida, duas-linhas, usa-print)',
    ])
    expect(formatVerdict(verdict)[0]).toMatch(/^ {2}FALHA passo 02 · Seu primeiro print +solução=aprovada inicial=APROVADO erradas=0\/3 reprovadas \(strong, \d+ ms\)$/)
  })

  it("acusa solução de referência reprovada com os casos que falharam", async () => {
    const { reports } = await verifyBundle(bundle, fakeRunner(bundle, "reprova-tudo"), { course: "curso-exemplo", lesson: "exemplo-m1-02-funcoes-basicas" })
    const [verdict] = reports[0]?.verdicts ?? []
    if (!verdict) throw new Error("sem veredito")
    expect(verdict.status).toBe("falha")
    expect(verdict.details[0]).toBe("solução de referência REPROVADA:")
    expect(verdict.details[1]).toContain("dobro(4) é 8")
    expect(verdict.details.at(-1)).toBe("  … e mais 2")
    expect(formatVerdict(verdict)[0]).toContain("solução=REPROVADA inicial=reprovado erradas=4/4 reprovadas")
  })

  it("marca erro de executor sem derrubar a verificação", async () => {
    const { summary, reports } = await verifyBundle(bundle, fakeRunner(bundle, "quebrado"))
    expect(summary).toEqual({ lessons: 3, steps: 4, failed: 0, errors: 4 })
    const [verdict] = reports[0]?.verdicts ?? []
    if (!verdict) throw new Error("sem veredito")
    expect(verdict.details).toEqual(["executor: executor respondeu 503: busy"])
    expect(formatVerdict(verdict)).toEqual([expect.stringMatching(/^ {2}ERRO {2}passo 02 · Seu primeiro print/), "        executor: executor respondeu 503: busy"])
  })

  it("filtro sem correspondência devolve zero passos", async () => {
    const { summary } = await verifyBundle(bundle, fakeRunner(bundle), { course: "inexistente" })
    expect(summary).toEqual({ lessons: 0, steps: 0, failed: 0, errors: 0 })
  })
})

describe("verifyStep: código inicial herdado, python-dados e soluções erradas ausentes", () => {
  let tree: TempTree | null = null
  afterEach(() => {
    tree?.cleanup()
    tree = null
  })

  it("usa a solução do exercício anterior como código inicial de um passo guiado sem Código inicial", async () => {
    const continuing =
      `${frontmatter({ runtime: "python-dados", bibliotecas: "[numpy]" })}\n${exerciseStep({ number: 1 })}\n` +
      exerciseStep({ number: 2, starter: null, title: "Continuação", solution: '```python\nprint("Olá, mundo!")\nprint("de novo")\n```' })
    tree = writeTree({ ...validTree(), "cursos/curso-teste/m1/01-guiada.lvl.md": continuing })
    const bundle = bundleOf(tree.dir)
    const targets = listExerciseTargets(bundle, { lesson: "licao-teste" })
    expect(targets.map((target) => target.starter?.inheritedFrom ?? null)).toEqual([null, 1])
    const lesson = targets[0]?.lesson
    const [first, second] = lesson?.steps ?? []
    if (!lesson || !first || !second) throw new Error("lição inválida")
    expect(resolveStarter(lesson, second)).toEqual({ files: first.solution_files, inheritedFrom: 1 })
    expect(buildVerifyJob(lesson, first.solution_files, first.test_cases)).toMatchObject({ runtime: "python-dados", libraries: ["numpy"], entry: "main.py", limits: { timeoutMs: 10_000, memoryMb: 128 } })

    const runner = fakeRunner(bundle, "aprova-tudo")
    const target = targets[1]
    if (!target) throw new Error("passo 2 ausente")
    const verdict = await verifyStep(target, runner)
    expect(verdict.details[0]).toBe("código inicial herdado do passo 1 APROVADO sem o aluno fazer nada (casos que passaram: saida, usa-print)")
    expect(runner.jobs.some((job) => JSON.stringify(job.files) === JSON.stringify(first.solution_files))).toBe(true)
    expect(runner.jobs.every((job) => job.runtime === "python-dados" && JSON.stringify(job.libraries) === '["numpy"]')).toBe(true)
  })

  it("passo sem soluções erradas falha mesmo com solução e código inicial coerentes", async () => {
    tree = writeTree(validTree())
    const bundle = bundleOf(tree.dir)
    const [target] = listExerciseTargets(bundle, { lesson: "pratica-teste" })
    if (!target) throw new Error("passo ausente")
    const stripped = { ...target, step: { ...target.step, wrong_solutions: [] } }
    const verdict = await verifyStep(stripped, fakeRunner(bundle))
    expect(verdict.status).toBe("falha")
    expect(verdict.details).toEqual(["sem soluções erradas: adicione ao menos uma em ### Soluções erradas"])
    expect(formatVerdict(verdict)[0]).toContain("inicial=reprovado erradas=0/0 reprovadas")
  })

  it("passo sem código inicial e sem exercício anterior sai como não verificado", async () => {
    tree = writeTree(validTree())
    const bundle = bundleOf(tree.dir)
    const [target] = listExerciseTargets(bundle, { lesson: "pratica-teste" })
    if (!target) throw new Error("passo ausente")
    const verdict = await verifyStep({ ...target, starter: null }, fakeRunner(bundle))
    expect(verdict.status).toBe("ok")
    expect(formatVerdict(verdict)[0]).toContain("inicial=não verificado")
  })
})

describe("wrongSolutionFiles", () => {
  const step = {
    solution_files: [
      { path: "main.py", content: "import util\nprint(util.dobro(2))\n" },
      { path: "util.py", content: "def dobro(x):\n    return 2 * x\n" },
      { path: "dados.txt", content: "1\n2\n" },
    ],
  } as unknown as BundleStep

  it("herda da solução os arquivos que a errada não declara e troca os que ela declara", () => {
    const files = wrongSolutionFiles(step, [{ path: "util.py", content: "def dobro(x):\n    return x + 2\n" }])
    expect(files.map((file) => file.path).sort()).toEqual(["dados.txt", "main.py", "util.py"])
    expect(files.find((file) => file.path === "util.py")?.content).toContain("x + 2")
  })

  it("aceita arquivo novo que só a errada tem", () => {
    expect(wrongSolutionFiles(step, [{ path: "extra.py", content: "" }])).toHaveLength(4)
  })
})

describe("createPool", () => {
  it("nunca passa do limite de tarefas simultâneas", async () => {
    const schedule = createPool(2)
    let active = 0
    let peak = 0
    const task = async (): Promise<void> => {
      active++
      peak = Math.max(peak, active)
      await new Promise((resolve) => setTimeout(resolve, 5))
      active--
    }
    await Promise.all(Array.from({ length: 6 }, () => schedule(task)))
    expect(peak).toBe(2)
  })
})

interface FakeResponse {
  status: number
  body: string
  headers?: Record<string, string>
}

describe("createHttpRunner contra um executor HTTP local", () => {
  let server: Server
  let url = ""
  let requests: { authorization: string | undefined; body: string }[] = []
  let responses: FakeResponse[] = []

  beforeAll(async () => {
    server = createServer((request, response) => {
      let body = ""
      request.on("data", (chunk: Buffer) => {
        body += chunk.toString()
      })
      request.on("end", () => {
        requests.push({ authorization: request.headers.authorization, body })
        const next = responses.shift() ?? { status: 200, body: JSON.stringify({ observations: [], engine: { python: "3.14", runtime: "wasi" }, durationMs: 3 }) }
        response.writeHead(next.status, { "content-type": "application/json", ...next.headers })
        response.end(next.body)
      })
    })
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
    const address = server.address()
    if (address === null || typeof address === "string") throw new Error("servidor sem porta")
    url = `http://127.0.0.1:${address.port}`
  })
  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  })
  afterEach(() => {
    requests = []
    responses = []
  })

  const job: RunnerJob = { files: [{ path: "main.py", content: "print(1)\n" }], entry: "main.py", probes: [{ id: "run:a", kind: "run", stdin: "" }], limits: { timeoutMs: 10_000, memoryMb: 128 }, runtime: "python" }

  it("envia o job com o token e devolve o resultado", async () => {
    const result = await createHttpRunner(url, "segredo").run(job)
    expect(result).toEqual({ observations: [], engine: { python: "3.14", runtime: "wasi" }, durationMs: 3 })
    expect(requests).toEqual([{ authorization: "Bearer segredo", body: JSON.stringify(job) }])
  })

  it("espera o Retry-After e tenta de novo quando o executor está ocupado", async () => {
    responses = [{ status: 503, body: '{"error":"busy"}', headers: { "retry-after": "2" } }]
    const waits: number[] = []
    const runner = createHttpRunner(url, "segredo", {
      wait: (ms) => {
        waits.push(ms)
        return Promise.resolve()
      },
    })
    await expect(runner.run(job)).resolves.toMatchObject({ durationMs: 3 })
    expect(waits).toEqual([2_000])
    expect(requests).toHaveLength(2)
  })

  it("falha com a resposta do executor em erro ou fora do contrato", async () => {
    responses = [{ status: 500, body: "quebrou" }]
    await expect(createHttpRunner(url, "segredo").run(job)).rejects.toThrow("executor respondeu 500: quebrou")
    responses = [{ status: 200, body: '{"sem":"observacoes"}' }]
    await expect(createHttpRunner(url, "segredo").run(job)).rejects.toThrow("fora do formato esperado")
  })
})

describe("contentBundleSchema", () => {
  it("o pacote do exemplo passa inteiro pelo schema do seed", () => {
    expect(() => contentBundleSchema.parse(bundleOf(EXAMPLE_DIR))).not.toThrow()
  })
})
