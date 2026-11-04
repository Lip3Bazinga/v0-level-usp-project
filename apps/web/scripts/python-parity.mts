/**
 * Teste diferencial de paridade: "Executar" (Pyodide, navegador) × "Verificar"
 * (CPython WASI, executor oficial).
 *
 * Para cada lição do seed `python-completo`, roda a solução de referência e o
 * esqueleto inicial nos dois runtimes — execução simples do main.py e uma vez
 * por entrada de caso `io` — e compara stdout, stderr e o erro ("Tipo: mensagem").
 * Depois roda casos de borda que caracterizam diferenças conhecidas entre os
 * runtimes (módulos, versão de patch etc.).
 *
 * O lado Pyodide usa o MESMO harness do Web Worker (src/lib/python/project-execution.ts),
 * carregado do pacote npm `pyodide` fixado no package.json.
 *
 * Uso: RUNNER_URL=http://localhost:8081 RUNNER_TOKEN=... pnpm --filter @levelusp/web test:paridade
 *      PARITY_REPORT=caminho.md grava o relatório em Markdown além de imprimi-lo.
 * Sai com código 1 se houver divergência não documentada em EXPECTED_DIVERGENCES.
 */
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import type { ProjectFile, RunnerResult } from "@levelusp/contracts"
import { loadPyodide } from "pyodide"
import { z } from "zod"
import { createProjectRunner, readPythonVersion, type ProjectRunner } from "../src/lib/python/project-execution"

const WEB_ROOT = path.resolve(import.meta.dirname, "..")
const SEED_PATH = path.resolve(WEB_ROOT, "../../packages/db/seed/python-completo.json")
const RUNNER_URL = process.env.RUNNER_URL ?? "http://localhost:8081"
const RUNNER_TOKEN = process.env.RUNNER_TOKEN ?? ""
const RUNNER_LIMITS = { timeoutMs: 10_000, memoryMb: 128 }
const ENTRY = "main.py"

const seedSchema = z.object({
  lessons: z.array(
    z.object({
      order: z.number(),
      title: z.string(),
      starter_files: z.array(z.object({ path: z.string(), content: z.string() })),
      reference_solution: z.array(z.object({ path: z.string(), content: z.string() })),
      test_cases: z.array(z.object({ kind: z.string(), stdin: z.string().optional() }).passthrough()),
    }),
  ),
})

interface Scenario {
  id: string
  group: "lição" | "borda"
  label: string
  variant: string
  files: ProjectFile[]
  stdin: string
}

/** O que cada runtime observou numa execução simples do arquivo de entrada. */
interface Observation {
  stdout: string
  stderr: string
  error: string | null
}

interface Comparison {
  scenario: Scenario
  browser: Observation
  server: Observation
  differences: string[]
}

const singleFile = (content: string): ProjectFile[] => [{ path: ENTRY, content }]

/**
 * Casos de borda: recursos que um aluno usa e que dependem do runtime. Os que
 * divergem de propósito estão em EXPECTED_DIVERGENCES, com o motivo.
 */
const EDGE_CASES: ReadonlyArray<{ id: string; label: string; code: string; stdin?: string; files?: ProjectFile[] }> = [
  { id: "fstring-pep701", label: "f-string aninhada (PEP 701, UX-29)", code: "print(f\"{'a' + f\"{1}\"}\")" },
  { id: "dunder-main", label: "__name__ == '__main__'", code: "if __name__ == '__main__':\n    print('principal')" },
  { id: "input-stdin", label: "input() com entrada", code: "nome = input('Nome: ')\nprint(f'Olá, {nome}!')", stdin: "Ana\n" },
  { id: "input-sem-stdin", label: "input() sem entrada", code: "nome = input('Nome: ')\nprint(nome)" },
  { id: "exit-builtin", label: "exit() (builtin do módulo site)", code: "print('antes')\nexit()\nprint('depois')" },
  { id: "sys-exit-0", label: "sys.exit(0)", code: "import sys\nprint('fim')\nsys.exit(0)" },
  { id: "sys-exit-3", label: "sys.exit(3)", code: "import sys\nsys.exit(3)" },
  { id: "syntax-colon", label: "SyntaxError sem dois-pontos", code: "if True\n    print(1)" },
  { id: "syntax-string", label: "SyntaxError string aberta", code: "print('abc" },
  { id: "indentation", label: "IndentationError", code: "if True:\nprint(1)" },
  { id: "name-error", label: "NameError com sugestão", code: "pritn('x')" },
  { id: "zero-division", label: "ZeroDivisionError", code: "print(1 / 0)" },
  { id: "recursion", label: "RecursionError", code: "def f(n):\n    return f(n + 1)\nf(0)" },
  { id: "int-str-limit", label: "limite de conversão int→str", code: "print(len(str(10 ** 5000)))" },
  { id: "float-repr", label: "repr de float e round", code: "print(0.1 + 0.2, round(2.675, 2), 1e16, 2 ** 0.5)" },
  { id: "stderr", label: "print em sys.stderr", code: "import sys\nprint('saída')\nprint('aviso', file=sys.stderr)" },
  { id: "version-minor", label: "versão major.minor", code: "import sys\nprint(sys.version_info[:2])" },
  { id: "version-patch", label: "versão de patch", code: "import platform\nprint(platform.python_version())" },
  { id: "cwd-file", label: "__file__, cwd e arquivo gravado", code: "import os\nprint(__file__, os.getcwd())\nwith open('dados.txt', 'w') as f:\n    f.write('ok')\nprint(open('dados.txt').read(), sorted(os.listdir('.')))" },
  {
    id: "stdlib",
    label: "módulos da biblioteca padrão usados nas lições",
    code: "import abc, collections, contextlib, copy, csv, dataclasses, datetime, decimal, enum, fractions, functools, heapq, io, itertools, json, math, operator, os, pathlib, random, re, statistics, string, sys, textwrap, time, typing, unittest\nprint('ok')",
  },
  { id: "random-seed", label: "random com semente", code: "import random\nrandom.seed(42)\nprint(random.randint(1, 100), random.random())" },
  { id: "sqlite3", label: "import sqlite3", code: "import sqlite3\nprint(sqlite3.connect(':memory:').execute('select 1').fetchone())" },
  { id: "zoneinfo", label: "zoneinfo (fusos horários)", code: "from zoneinfo import ZoneInfo\nprint(ZoneInfo('America/Sao_Paulo'))" },
  { id: "threading", label: "threading.Thread", code: "import threading\nt = threading.Thread(target=print, args=('thread',))\nt.start()\nt.join()" },
  { id: "subprocess", label: "subprocess", code: "import subprocess\nprint(subprocess.run(['echo', 'oi']).returncode)" },
  { id: "numpy", label: "import numpy (pacote extra)", code: "import numpy\nprint(numpy.__version__)" },
  { id: "recursion-limit", label: "sys.getrecursionlimit()", code: "import sys\nprint(sys.getrecursionlimit())" },
  { id: "time-sleep", label: "time.sleep", code: "import time\ntime.sleep(0.01)\nprint('acordou')" },
  {
    id: "imports-projeto",
    label: "import de pacote do projeto (sem __init__.py)",
    code: "from utilidades.texto import grita\nprint(grita('oi'))",
    files: [{ path: "utilidades/texto.py", content: "def grita(texto):\n    return texto.upper() + '!'\n" }],
  },
]

/**
 * Divergências conhecidas e aceitas (o teste falha se aparecer outra). Cada uma
 * está explicada em docs/v2/paridade-python.md.
 */
const EXPECTED_DIVERGENCES: Readonly<Record<string, string>> = {
  "borda:version-patch": "patch do CPython: Pyodide 314.0.7 embute 3.14.2; o executor WASI usa 3.14.0",
  "borda:sqlite3": "o CPython WASI do executor não tem o módulo _sqlite3",
  "borda:zoneinfo": "nenhum dos dois tem a base de fusos (tzdata); só a mensagem difere",
  "borda:subprocess": "nenhum dos dois cria processos; só o errno e a mensagem diferem",
}

async function loadSeedScenarios(): Promise<Scenario[]> {
  const seed = seedSchema.parse(JSON.parse(await readFile(SEED_PATH, "utf8")))
  const scenarios: Scenario[] = []
  for (const lesson of seed.lessons) {
    const inputs = new Set<string>([""])
    for (const testCase of lesson.test_cases) if (testCase.kind === "io") inputs.add(testCase.stdin ?? "")
    const variants: Array<[string, ProjectFile[]]> = [
      ["solução", lesson.reference_solution],
      ["esqueleto", lesson.starter_files],
    ]
    for (const [variant, files] of variants) {
      for (const stdin of inputs) {
        scenarios.push({
          id: `licao-${lesson.order}:${variant}:${JSON.stringify(stdin)}`,
          group: "lição",
          label: `${String(lesson.order).padStart(2, "0")} ${lesson.title}`,
          variant,
          files,
          stdin,
        })
      }
    }
  }
  return scenarios
}

function edgeScenarios(): Scenario[] {
  return EDGE_CASES.map((edgeCase) => ({
    id: `borda:${edgeCase.id}`,
    group: "borda",
    label: edgeCase.label,
    variant: "—",
    files: [...singleFile(edgeCase.code), ...(edgeCase.files ?? [])],
    stdin: edgeCase.stdin ?? "",
  }))
}

const runnerResponseSchema = z.object({
  observations: z.array(
    z.object({
      id: z.string(),
      stdout: z.string().nullish(),
      stderr: z.string().nullish(),
      error: z.string().nullish(),
      timedOut: z.boolean().optional(),
    }),
  ),
  engine: z.object({ python: z.string(), runtime: z.string() }),
})

async function runOnServer(scenario: Scenario): Promise<{ observation: Observation; engine: RunnerResult["engine"] }> {
  const response = await fetch(new URL("/v1/run", RUNNER_URL), {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${RUNNER_TOKEN}` },
    body: JSON.stringify({
      files: scenario.files,
      entry: ENTRY,
      probes: [{ id: "run", kind: "run", stdin: scenario.stdin }],
      limits: RUNNER_LIMITS,
    }),
  })
  if (!response.ok) throw new Error(`executor respondeu ${response.status}: ${await response.text()}`)
  const result = runnerResponseSchema.parse(await response.json())
  const probe = result.observations[0]
  if (!probe) throw new Error("executor não devolveu observação")
  const error = probe.timedOut ? "Tempo esgotado" : (probe.error ?? null)
  return { observation: { stdout: probe.stdout ?? "", stderr: probe.stderr ?? "", error }, engine: result.engine }
}

function runInBrowserRuntime(runProject: ProjectRunner, scenario: Scenario): Observation {
  const result = runProject({ files: scenario.files, entryPath: ENTRY, stdin: scenario.stdin })
  return { stdout: result.stdout, stderr: result.stderr, error: result.error?.summary ?? null }
}

function compare(scenario: Scenario, browser: Observation, server: Observation): Comparison {
  const differences: string[] = []
  if (browser.stdout !== server.stdout) differences.push("stdout")
  if (browser.stderr !== server.stderr) differences.push("stderr")
  if (browser.error !== server.error) differences.push("exceção")
  return { scenario, browser, server, differences }
}

function cell(text: string | null): string {
  if (text === null || text === "") return "—"
  const singleLine = text.length > 70 ? `${text.slice(0, 67)}...` : text
  return `\`${singleLine.replace(/\n/g, "⏎").replace(/\|/g, "\\|").replace(/`/g, "'")}\``
}

function verdict(comparison: Comparison): string {
  if (!comparison.differences.length) return "igual"
  return EXPECTED_DIVERGENCES[comparison.scenario.id] ? "diverge (documentado)" : "**DIVERGE**"
}

function renderReport(comparisons: Comparison[], versions: { browser: string; server: string }): string {
  const lessonRows = comparisons
    .filter((comparison) => comparison.scenario.group === "lição")
    .map((comparison) => {
      const { scenario, browser } = comparison
      const outcome = browser.error ? cell(browser.error.split(":")[0] ?? browser.error) : "ok"
      return `| ${scenario.label} | ${scenario.variant} | ${cell(JSON.stringify(scenario.stdin))} | ${outcome} | ${verdict(comparison)} |`
    })
  const edgeRows = comparisons
    .filter((comparison) => comparison.scenario.group === "borda")
    .map((comparison) => {
      const { scenario, browser, server } = comparison
      const shown = (observation: Observation): string => cell(observation.error ?? observation.stdout + observation.stderr)
      const reason = EXPECTED_DIVERGENCES[scenario.id] ?? ""
      return `| ${scenario.label} | ${shown(browser)} | ${shown(server)} | ${verdict(comparison)} | ${comparison.differences.length ? reason : ""} |`
    })
  const unexpected = comparisons.filter((comparison) => comparison.differences.length && !EXPECTED_DIVERGENCES[comparison.scenario.id])
  return [
    "# Paridade Executar × Verificar",
    "",
    `- Navegador: Pyodide (Python ${versions.browser}), harness \`src/lib/python/project-execution.ts\``,
    `- Servidor: executor oficial (Python ${versions.server}), sonda \`run\``,
    `- Comparados: stdout, stderr e erro (\`Tipo: mensagem\`). Divergências inesperadas: **${unexpected.length}**`,
    "",
    "## Lições do seed (`python-completo`)",
    "",
    "| Lição | Variante | stdin | Resultado no navegador | Paridade |",
    "|---|---|---|---|---|",
    ...lessonRows,
    "",
    "## Casos de borda",
    "",
    "| Caso | Navegador | Servidor | Paridade | Motivo |",
    "|---|---|---|---|---|",
    ...edgeRows,
    "",
  ].join("\n")
}

function describeDifference(comparison: Comparison): string {
  const lines = [`- ${comparison.scenario.id} (${comparison.differences.join(", ")})`]
  for (const field of ["stdout", "stderr", "error"] as const) {
    if (comparison.browser[field] !== comparison.server[field]) {
      lines.push(`    navegador ${field}: ${JSON.stringify(comparison.browser[field])}`)
      lines.push(`    servidor  ${field}: ${JSON.stringify(comparison.server[field])}`)
    }
  }
  return lines.join("\n")
}

function minorVersion(version: string): string {
  return version.split(".").slice(0, 2).join(".")
}

async function main(): Promise<void> {
  if (!RUNNER_TOKEN) throw new Error("defina RUNNER_TOKEN (e RUNNER_URL, se não for http://localhost:8081)")
  const pyodide = await loadPyodide()
  const runProject = createProjectRunner(pyodide)
  const browserVersion = readPythonVersion(pyodide)

  const scenarios = [...(await loadSeedScenarios()), ...edgeScenarios()]
  const comparisons: Comparison[] = []
  let serverVersion = "?"
  for (const scenario of scenarios) {
    const server = await runOnServer(scenario)
    serverVersion = server.engine.python
    comparisons.push(compare(scenario, runInBrowserRuntime(runProject, scenario), server.observation))
  }

  const report = renderReport(comparisons, { browser: browserVersion, server: serverVersion })
  console.log(report)
  if (process.env.PARITY_REPORT) await writeFile(process.env.PARITY_REPORT, report)

  const divergent = comparisons.filter((comparison) => comparison.differences.length)
  if (divergent.length) console.log(`Detalhes das divergências:\n${divergent.map(describeDifference).join("\n")}\n`)

  const staleExpectations = Object.keys(EXPECTED_DIVERGENCES).filter(
    (id) => !divergent.some((comparison) => comparison.scenario.id === id),
  )
  if (staleExpectations.length) console.log(`Aviso: divergências documentadas que não ocorreram mais: ${staleExpectations.join(", ")}`)

  const failures: string[] = []
  if (minorVersion(browserVersion) !== minorVersion(serverVersion.split(" ")[0] ?? serverVersion)) {
    failures.push(`versões diferentes: navegador ${browserVersion}, servidor ${serverVersion}`)
  }
  const unexpected = divergent.filter((comparison) => !EXPECTED_DIVERGENCES[comparison.scenario.id])
  if (unexpected.length) failures.push(`${unexpected.length} divergência(s) não documentada(s)`)
  if (failures.length) throw new Error(failures.join("; "))
  console.log(`PARIDADE OK: ${comparisons.length} execuções comparadas.`)
}

main().catch((error: unknown) => {
  console.error(`FALHA NA PARIDADE: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
