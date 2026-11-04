import { describe, expect, it } from "vitest"
import { endpointLabel, percentileOf, summarize } from "./metrics"
import { parseProcStat, sumProcessTree, type ProcStat } from "./monitor"
import { parseOptions, parseProcessList } from "./options"
import { renderMarkdown, verifyReport, type LoadReport } from "./report"
import { Random } from "./rng"
import { assertTargetsAllowed, isLocalHostname, UnauthorizedTargetError } from "./safety"
import { studentAddress } from "./scenarios"
import { attemptKind, lessonWeight, matchLessons, readSeedLessons, type SeedLesson } from "./seed"
import { parseRetryAfter } from "./http"
import { extractStaticAssets, retryWaitSeconds, type VerifyOutcome } from "./student"

describe("segurança do alvo", () => {
  it("aceita só a própria máquina sem autorização", () => {
    expect(isLocalHostname("localhost")).toBe(true)
    expect(isLocalHostname("127.0.0.1")).toBe(true)
    expect(isLocalHostname("127.8.9.10")).toBe(true)
    expect(isLocalHostname("[::1]")).toBe(true)
    expect(isLocalHostname("api.localhost")).toBe(true)
    expect(isLocalHostname("levelusp.exemplo.usp.br")).toBe(false)
    expect(isLocalHostname("10.0.0.5")).toBe(false)
    expect(isLocalHostname("127.0.0.1.nip.io")).toBe(false)
  })

  it("recusa alvo externo (inclusive banco) sem --alvo-autorizado", () => {
    expect(() => assertTargetsAllowed(["http://localhost:3000", "postgres://u:p@localhost:5432/db"], false)).not.toThrow()
    expect(() => assertTargetsAllowed(["http://localhost:3000", "https://levelusp.exemplo.usp.br"], false)).toThrow(UnauthorizedTargetError)
    expect(() => assertTargetsAllowed(["postgres://u:p@db.exemplo.com:5432/db"], false)).toThrow(/db\.exemplo\.com/)
    expect(() => assertTargetsAllowed(["https://levelusp.exemplo.usp.br"], true)).not.toThrow()
  })
})

describe("percentis", () => {
  it("usa o posto mais próximo (sempre um valor observado)", () => {
    const values = Array.from({ length: 100 }, (_unused, index) => index + 1)
    expect(percentileOf(values, 50)).toBe(50)
    expect(percentileOf(values, 95)).toBe(95)
    expect(percentileOf(values, 99)).toBe(99)
    expect(percentileOf([7], 99)).toBe(7)
    expect(percentileOf([], 95)).toBe(0)
  })

  it("resume amostras fora de ordem", () => {
    expect(summarize([30, 10, 20])).toEqual({ count: 3, mean: 20, p50: 20, p95: 30, p99: 30, max: 30 })
  })

  it("agrupa ids, chunks e arquivos do Pyodide no rótulo do endpoint", () => {
    expect(endpointLabel("GET", "/api/lessons/3f2b8c1e-1d2a-4b5c-8d9e-0a1b2c3d4e5f/snapshot")).toBe("GET /api/lessons/:id/snapshot")
    expect(endpointLabel("GET", "/api/me/notifications?limit=30")).toBe("GET /api/me/notifications")
    expect(endpointLabel("GET", "/_next/static/chunks/abc123.js")).toBe("GET /_next/static/*")
    expect(endpointLabel("GET", "/pyodide/v314.0.7/pyodide.asm.wasm")).toBe("GET /pyodide/:versao/pyodide.asm.wasm")
  })
})

describe("seed e escolha de código", () => {
  const seed: SeedLesson[] = [
    { order: 2, title: "A", starter_files: [{ path: "main.py", content: "" }], reference_solution: [{ path: "main.py", content: "ok" }], wrong_solutions: [{ name: "x", files: [{ path: "main.py", content: "x" }] }] },
    { order: 3, title: "B", starter_files: [], reference_solution: [], wrong_solutions: [] },
  ]

  it("casa lições pelo título, na ordem do curso, respeitando o recorte", () => {
    const api = [
      { id: "id-b", title: "B", order: 3, lesson_type: "coding" },
      { id: "id-t", title: "Teoria", order: 1, lesson_type: "theory" },
      { id: "id-a", title: "A", order: 2, lesson_type: "coding" },
    ]
    expect(matchLessons(seed, api).map((lesson) => [lesson.id, lesson.position])).toEqual([["id-a", 1], ["id-b", 2]])
    expect(matchLessons(seed, api, [2, 2]).map((lesson) => lesson.id)).toEqual(["id-b"])
  })

  it("dá mais peso às primeiras lições", () => {
    expect(lessonWeight(1)).toBe(1)
    expect(lessonWeight(5)).toBeCloseTo(0.5)
    expect(lessonWeight(2)).toBeGreaterThan(lessonWeight(10))
  })

  it("erra mais na primeira tentativa e acerta depois", () => {
    expect(attemptKind(1, 0.05)).toBe("starter")
    expect(attemptKind(1, 0.3)).toBe("wrong")
    expect(attemptKind(1, 0.7)).toBe("reference")
    expect(attemptKind(2, 0.3)).toBe("wrong")
    expect(attemptKind(2, 0.5)).toBe("reference")
    expect(attemptKind(9, 0.11)).toBe("reference")
  })

  it("lê o seed real com referência e soluções erradas", () => {
    const lessons = readSeedLessons()
    expect(lessons.length).toBeGreaterThanOrEqual(22)
    expect(lessons.every((lesson) => lesson.reference_solution.length > 0)).toBe(true)
    expect(lessons.reduce((sum, lesson) => sum + lesson.wrong_solutions.length, 0)).toBeGreaterThanOrEqual(72)
  })
})

describe("opções", () => {
  it("aplica os padrões", () => {
    const options = parseOptions([], {})
    expect(options).toMatchObject({ scenario: "turma", target: "http://localhost:3000", students: [40], simulatedMinutes: 20, compression: 4, authorizedTarget: false, downloadAssets: true, pyodide: false })
  })

  it("lê etapas, faixas e processos", () => {
    const options = parseOptions(["--", "--cenario", "rajada", "--alunos", "20,40,80", "--licoes", "1-8", "--espera-reenvio", "2-4", "--monitorar", "api=10,web=11"], {})
    expect(options.students).toEqual([20, 40, 80])
    expect(options.lessonRange).toEqual([1, 8])
    expect(options.retryWait).toEqual([2, 4])
    expect(options.processes).toEqual({ api: 10, web: 11 })
  })

  it("recusa valores inválidos com mensagem clara", () => {
    expect(() => parseOptions(["--cenario", "prova"], {})).toThrow(/--cenario/)
    expect(() => parseOptions(["--alunos", "0"], {})).toThrow(/--alunos/)
    expect(() => parseOptions(["--licoes", "8-1"], {})).toThrow(/--licoes/)
    expect(() => parseProcessList("api=abc")).toThrow(/--monitorar/)
    expect(() => parseOptions(["--desconhecida"], {})).toThrow()
  })
})

describe("monitor de processos", () => {
  it("lê /proc/<pid>/stat mesmo com espaços e parênteses no nome", () => {
    const line = "123 (node (worker) x) S 1 123 123 0 -1 4194560 100 0 0 0 250 50 7 3 20 0 11 0 1000 123456789 2048 18446744073709551615"
    expect(parseProcStat(line)).toEqual({ pid: 123, ppid: 1, cpuTicks: 300, childCpuTicks: 10, rssBytes: 2048 * 4096 })
    expect(parseProcStat("lixo")).toBeNull()
  })

  it("soma a árvore (raiz, filhos vivos e filhos já recolhidos)", () => {
    const stats: ProcStat[] = [
      { pid: 10, ppid: 1, cpuTicks: 100, childCpuTicks: 40, rssBytes: 1000 },
      { pid: 11, ppid: 10, cpuTicks: 5, childCpuTicks: 0, rssBytes: 200 },
      { pid: 12, ppid: 11, cpuTicks: 1, childCpuTicks: 0, rssBytes: 50 },
      { pid: 99, ppid: 1, cpuTicks: 999, childCpuTicks: 0, rssBytes: 999 },
    ]
    expect(sumProcessTree(stats, 10)).toEqual({ cpuTicks: 146, rssBytes: 1250, processes: 3 })
    expect(sumProcessTree(stats, 404)).toBeNull()
  })
})

describe("relatório", () => {
  const outcomes: VerifyOutcome[] = [
    { kind: "reference", status: 200, ms: 300, passed: true, runnerMs: 250, retries: 0, totalMs: 300 },
    { kind: "wrong", status: 200, ms: 500, passed: false, runnerMs: 400, retries: 1, totalMs: 5_500 },
    { kind: "reference", status: 503, code: "RUNNER_BUSY", ms: 5, passed: false, runnerMs: null, retries: 2, totalMs: 9_000 },
  ]

  it("separa aprovados, reenvios e desistências", () => {
    const report = verifyReport(outcomes)
    expect(report).toMatchObject({ count: 3, passed: 1, retries: 3, gaveUp: 1, statuses: { "200": 2, "503 RUNNER_BUSY": 1 } })
    expect(report.clickToVerdictGraded.max).toBe(5_500)
    expect(report.runnerMs.p50).toBe(250)
  })

  it("gera o Markdown com a visão geral", () => {
    const report: LoadReport = {
      tool: "levelusp-load",
      scenario: "rajada",
      target: "http://localhost:3000",
      startedAt: "2026-11-03T00:00:00.000Z",
      finishedAt: "2026-11-03T00:01:00.000Z",
      settings: {},
      steps: [{
        students: 3, equivalentStudents: 3, seconds: 10, requests: 3, throughputRps: 0.3, errorRate: 0.33, rate429: 0, rate503: 0.33, failedLogins: 0,
        endpoints: [], verify: verifyReport(outcomes), waveMakespans: [9.5], preparation: null,
        monitor: { host: { cpus: 2, cpuMeanPct: 50, cpuPeakPct: 120, memoryTotalMb: 8000, generatorCpuPct: 3, generatorCpuSeconds: 0.3 }, processes: [], runner: null, queries: null },
      }],
    }
    const markdown = renderMarkdown(report)
    expect(markdown).toContain("| 3 | 3 | 10 s |")
    expect(markdown).toContain("Ondas: última correção a 9.5 s")
  })
})

describe("utilidades", () => {
  it("o gerador com semente é reproduzível e os derivados são independentes", () => {
    const sequence = (random: Random): number[] => Array.from({ length: 5 }, () => random.next())
    expect(sequence(new Random(7))).toEqual(sequence(new Random(7)))
    expect(sequence(new Random(7).fork(1))).not.toEqual(sequence(new Random(7).fork(2)))
    const random = new Random(1)
    const picks = Array.from({ length: 2000 }, () => random.weighted(["a", "b"], (item) => (item === "a" ? 3 : 1)))
    expect(picks.filter((pick) => pick === "a").length / picks.length).toBeGreaterThan(0.7)
  })

  it("extrai JS/CSS do HTML sem repetir", () => {
    const html = '<link rel="stylesheet" href="/_next/static/css/a.css"/><script src="/_next/static/chunks/b.js" async></script><script src="/_next/static/chunks/b.js"></script><script src="https://cdn.exemplo/x.js"></script>'
    expect(extractStaticAssets(html)).toEqual(["/_next/static/css/a.css", "/_next/static/chunks/b.js"])
  })

  it("espera o que o Retry-After pede (com atraso humano) ou um tempo aleatório sem ele", () => {
    const policy = { maxRetries: 2, minWaitSeconds: 3, maxWaitSeconds: 6 }
    const random = new Random(5)
    expect(parseRetryAfter("12")).toBe(12)
    expect(parseRetryAfter("Wed, 21 Oct 2026 07:28:00 GMT")).toBeUndefined()
    const suggested = retryWaitSeconds(12, policy, random)
    expect(suggested).toBeGreaterThanOrEqual(12)
    expect(suggested).toBeLessThan(15)
    expect(retryWaitSeconds(500, policy, random)).toBe(60)
    const free = retryWaitSeconds(undefined, policy, random)
    expect(free).toBeGreaterThanOrEqual(3)
    expect(free).toBeLessThan(6)
  })

  it("gera um IP privado distinto por aluno", () => {
    expect(studentAddress(0)).toBe("10.0.0.1")
    expect(studentAddress(255)).toBe("10.0.1.0")
    expect(new Set(Array.from({ length: 500 }, (_unused, index) => studentAddress(index))).size).toBe(500)
  })
})
