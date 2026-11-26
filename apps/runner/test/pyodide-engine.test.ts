/**
 * Motor python-dados (Pyodide): unitários da seleção de perfil e das políticas, e a
 * integração real (workers do Node com a distribuição de `PYODIDE_DIR`): sondas `io`,
 * `call`, `expr`, tempo limite, estouro de memória, readiness e `POST /v1/run`.
 */
import type { Server } from "node:http"
import type { AddressInfo } from "node:net"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { ProbeObservation, RunnerJob } from "@levelusp/contracts"
import { EngineRequestError, InsufficientMemoryError, type Engine } from "../src/engine"
import { Executor } from "../src/executor"
import { MemoryBudget } from "../src/memory-budget"
import { normalizeLibraryName, PYODIDE_PROFILES, resolveProfile } from "../src/pyodide-profiles"
import { Semaphore } from "../src/semaphore"
import { buildServer } from "../src/server"
import { RunnerStats } from "../src/stats"
import type { PyodideEngine } from "../src/pyodide-engine"
import { createPyodideEngine, exprProbe, globalsProbe, isPyodideAvailable, mainFile, runOne, runProbe, runProbes, SHORT_LIMITS, waitForWarm } from "./pyodide-support"
import { parseWarmPool } from "../src/config"

describe("perfis do motor Pyodide", () => {
  it("escolhe `dados` para numpy/pandas (ou nada) e `ml` para qualquer biblioteca de ML", () => {
    expect(resolveProfile([])).toBe("dados")
    expect(resolveProfile(["numpy", "Pandas"])).toBe("dados")
    expect(resolveProfile(["numpy", "scikit-learn"])).toBe("ml")
    expect(resolveProfile(["sklearn"])).toBe("ml")
    expect(resolveProfile(["matplotlib"])).toBe("ml")
    expect(resolveProfile(["statsmodels", "pandas"])).toBe("ml")
    expect(resolveProfile(["scipy"])).toBe("ml")
  })

  it("biblioteca desconhecida é erro de pedido (400) com a lista das disponíveis", () => {
    expect(() => resolveProfile(["numpy", "tensorflow"])).toThrow(EngineRequestError)
    expect(() => resolveProfile(["tensorflow"])).toThrow(/tensorflow.*numpy/)
  })

  it("normaliza nomes como no pyodide-lock.json e o perfil ml contém o dados", () => {
    expect(normalizeLibraryName(" Scikit_Learn ")).toBe("scikit-learn")
    expect(PYODIDE_PROFILES.ml.packages).toEqual(expect.arrayContaining([...PYODIDE_PROFILES.dados.packages]))
  })

  it("RUNNER_PYODIDE_WARM aceita um número ou perfil:n", () => {
    expect(parseWarmPool("2")).toEqual({ dados: 2, ml: 2 })
    expect(parseWarmPool("dados:1, ml:0")).toEqual({ dados: 1, ml: 0 })
    expect(() => parseWarmPool("x:1")).toThrow(/RUNNER_PYODIDE_WARM/)
    expect(() => parseWarmPool("dados:um")).toThrow(/RUNNER_PYODIDE_WARM/)
  })
})

describe("PyodideEngine: orçamento menor que o peso do perfil", () => {
  it("o autoteste da partida falha na hora com o motivo, sem esperar memória para sempre nem deixar lote bloqueado", async () => {
    const budget = new MemoryBudget(100)
    const engine = createPyodideEngine({ warm: { dados: 1, ml: 0 }, budget, memoryMb: { dados: 256, ml: 1229 } })
    try {
      await engine.start()
      expect(engine.readiness.ready).toBe(false)
      expect(engine.readiness.reason).toMatch(/Memória insuficiente.*pyodide:dados.*256 MB.*100 MB/)
      expect(budget.snapshot()).toEqual({ limitMb: 100, usedMb: 0, peakUsedMb: 0, blocked: 0 })
      expect(engine.stats()).toMatchObject({ booted: 0, peakLive: 0 })
    } finally {
      await engine.shutdown()
    }
  })

  it("a duração inicial de um lote inclui o aquecimento só na política fresh sem worker pronto", () => {
    const fresh = createPyodideEngine({ policy: { dados: "fresh", ml: "reuse" } })
    expect(fresh.cost({ runtime: "python-dados", libraries: ["numpy"] })).toEqual({ key: "pyodide:dados", memoryMb: 256, initialBatchMs: 1_000 + PYODIDE_PROFILES.dados.initialBootMs })
    expect(fresh.cost({ runtime: "python-dados", libraries: ["scikit-learn"] })).toEqual({ key: "pyodide:ml", memoryMb: 1229, initialBatchMs: 1_000 })
  })
})

describe.skipIf(!isPyodideAvailable)("PyodideEngine (integração, política fresh)", () => {
  let engine: PyodideEngine
  beforeAll(async () => {
    engine = createPyodideEngine({ warm: { dados: 1, ml: 0 } })
    await engine.start()
  })
  afterAll(() => engine.shutdown())

  it("o autoteste da partida deixa o motor pronto e informa os perfis e o pool", () => {
    expect(engine.readiness).toMatchObject({ ready: true, reason: "", policy: { dados: "fresh", ml: "fresh" }, profiles: ["dados", "ml"] })
    expect(engine.versions.python).toMatch(/^3\.14\.\d+ \(Pyodide\)$/)
    expect(engine.versions.runtime).toMatch(/^pyodide 314/)
  })

  it("roda io, call e expr com numpy e pandas (valores canônicos, tolerância é da API)", async () => {
    const files = mainFile(
      "import sys",
      "import numpy as np",
      "import pandas as pd",
      "def media(valores):",
      "    return float(np.mean(valores))",
      "df = pd.DataFrame({'nota': [7.5, 8.0, 9.5]})",
      "entrada = sys.stdin.readline().strip()",
      "if entrada:",
      "    print('media', round(df['nota'].mean(), 2), int(entrada))",
    )
    const [io, call, expr, raised] = await runProbes(engine, files, [
      { id: "io", kind: "run", stdin: "3\n" },
      { id: "call", kind: "call", function: "media", args: [[1, 2, 3, 4]], kwargs: {} },
      exprProbe("round(float(df['nota'].std()), 4)", "", "expr"),
      exprProbe("df['coluna_inexistente']", "", "raised"),
    ])
    expect(io).toMatchObject({ ok: true, stdout: "media 8.33 3\n" })
    expect(call).toMatchObject({ ok: true, value: 2.5, type: "float" })
    expect(expr).toMatchObject({ ok: true, value: 1.0408, type: "float" })
    expect(raised?.raised).toMatchObject({ type: "KeyError", stage: "expr" })
  })

  it("o bloco __main__ só roda na sonda run: call, globals e expr carregam o main.py como módulo `main`", async () => {
    const files = mainFile(
      "import numpy as np",
      "nome = __name__",
      "treinou = False",
      "def media(valores):",
      "    return float(np.mean(valores))",
      "if __name__ == '__main__':",
      "    treinou = True",
      "    print('treino', media([1, 3]))",
    )
    const [io, call, globals, expr] = await runProbes(engine, files, [
      { id: "io", kind: "run", stdin: "" },
      { id: "call", kind: "call", function: "media", args: [[1, 2, 3]], kwargs: {} },
      { id: "globals", kind: "globals", names: ["nome", "treinou"] },
      exprProbe("[__name__, treinou]", "", "expr"),
    ])
    expect(io).toMatchObject({ ok: true, stdout: "treino 2.0\n" })
    expect(call).toMatchObject({ ok: true, value: 2, stdout: "" })
    expect(globals).toMatchObject({ ok: true, values: { nome: "main", treinou: false }, stdout: "" })
    expect(expr).toMatchObject({ ok: true, value: ["main", false], stdout: "" })
  })

  it("valores do numpy chegam como $repr e arquivos do projeto ficam em /work", async () => {
    const files = [...mainFile("import os", "from dados import leitor", "linhas = leitor.contar('dados/tabela.csv')", "cwd = os.getcwd()"), { path: "dados/__init__.py", content: "" }, { path: "dados/leitor.py", content: "def contar(caminho):\n    return open(caminho).read().count('\\n')\n" }, { path: "dados/tabela.csv", content: "a,b\n1,2\n3,4\n" }]
    const observation = await runOne(engine, files, globalsProbe("linhas", "cwd"))
    expect(observation).toMatchObject({ ok: true, values: { linhas: 3, cwd: "/work" } })
    const numpyValue = await runOne(engine, mainFile("import numpy as np", "x = np.int64(6)", "y = np.array([1, 2]).tolist()"), globalsProbe("x", "y"))
    expect(numpyValue.values?.y).toEqual([1, 2])
    expect(numpyValue.types?.x).toBe("numpy.int64")
    expect(numpyValue.values?.x).toMatchObject({ $repr: "np.int64(6)" })
  })

  it("a análise de estrutura (ast) de um job python-dados roda no WASI, sem gastar worker", async () => {
    const executor = new Executor({ python: fakeWasi(), "python-dados": engine }, new Semaphore(2, 10))
    const result = await executor.execute({ files: mainFile("import numpy as np", "x = [i for i in range(3)]"), entry: "main.py", probes: [{ id: "a", kind: "ast" }, globalsProbe("x")], limits: SHORT_LIMITS, runtime: "python-dados", libraries: ["numpy"] })
    expect(result.engine.runtime).toMatch(/^pyodide/)
    expect(result.observations[0]).toMatchObject({ id: "a", ok: true, error: "wasi-falso" })
    expect(result.observations[1]).toMatchObject({ id: "g", ok: true, values: { x: [0, 1, 2] } })
  })

  it("laço infinito é interrompido no tempo limite e o serviço continua", async () => {
    await waitForWarm(engine, "dados")
    const startedAt = performance.now()
    const [first, second] = await runProbes(engine, mainFile("while True:\n    pass"), [exprProbe("1", "", "a"), runProbe()], { timeoutMs: 1_000, memoryMb: 64 })
    expect(performance.now() - startedAt).toBeLessThan(4_500)
    expect(first).toMatchObject({ ok: false, timedOut: true })
    expect(second).toMatchObject({ ok: false, timedOut: true })
    expect(await runOne(engine, mainFile("x = 1"), globalsProbe("x"))).toMatchObject({ ok: true, values: { x: 1 } })
  })

  it("alocação gigante vira MemoryError limpo (em cada sonda, que reexecuta o main.py), o worker é descartado e o serviço continua", async () => {
    const [run, after] = await runProbes(engine, mainFile("partes = []", "while True:", "    partes.append(bytearray(10 ** 7))"), [runProbe(), exprProbe("1 + 1", "", "e")])
    expect(run).toMatchObject({ ok: false, error: "MemoryError" })
    expect(after).toMatchObject({ ok: false, error: "MemoryError" })
    const numpy = await runOne(engine, mainFile("import numpy as np", "try:", "    x = np.ones(10 ** 9)", "    erro = None", "except (MemoryError, ValueError) as e:", "    erro = type(e).__name__"), globalsProbe("erro"))
    expect(["MemoryError", "ValueError"]).toContain(numpy.values?.erro)
    expect(await runOne(engine, mainFile("x = 2"), globalsProbe("x"))).toMatchObject({ ok: true, values: { x: 2 } })
    const stats = engine.stats()
    expect(typeof stats.batches).toBe("number")
    expect(typeof stats.recycled).toBe("number")
  })

  it("estouro do heap de JS do worker vira falha limpa, não derruba o executor", async () => {
    const tiny = createPyodideEngine({ jsHeapMb: 256, maxHeapMb: 1_024 })
    try {
      const observation = await runOne(tiny, mainFile("import numpy as np", "x = [np.zeros(10 ** 6) for _ in range(400)]"), globalsProbe("x"), { timeoutMs: 20_000, memoryMb: 128 })
      expect(observation.ok).toBe(false)
      expect(observation.error).toMatch(/Memória|MemoryError|inesperada/)
    } finally {
      await tiny.shutdown()
    }
  })

  it("stats e readiness contam lotes e workers", async () => {
    const stats = engine.stats()
    expect(stats).toMatchObject({ policy: { dados: "fresh", ml: "fresh" }, warm: { ml: 0 } })
    expect(typeof stats.batches).toBe("number")
    expect(engine.warmupMs({ runtime: "python-dados", libraries: ["scikit-learn"] })).toBeGreaterThan(0)
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(engine.readiness.warm.dados).toBeLessThanOrEqual(1)
  })
})

describe.skipIf(!isPyodideAvailable)("PyodideEngine (integração, fila do pool)", () => {
  const files = mainFile("import numpy as np", "valor = int(np.sum([1, 2]))")

  it("lotes simultâneos sem worker ocioso recebem um worker cada (nenhum espera por um que já tem dono)", async () => {
    // Sem pool aquecido (como o perfil ml no padrão): antes, o segundo lote esperava para sempre.
    const engine = createPyodideEngine({ warm: { dados: 0, ml: 0 } })
    try {
      const observations = await Promise.all([1, 2, 3].map(() => runOne(engine, files, globalsProbe("valor"))))
      expect(observations.map((observation) => observation.values?.valor)).toEqual([3, 3, 3])
      expect(engine.stats()).toMatchObject({ batches: 3, booted: 3, bootFailures: 0 })
    } finally {
      await engine.shutdown()
    }
  }, 90_000)

  it("reuse: o lote que chega durante a restauração espera por ela em vez de aquecer outro worker", async () => {
    const engine = createPyodideEngine({ policy: "reuse", warm: { dados: 0, ml: 0 }, recycleAfter: 10 })
    try {
      for (let index = 0; index < 3; index++) {
        // Um logo depois do outro: o worker do lote anterior ainda está sendo restaurado.
        expect((await runOne(engine, files, globalsProbe("valor"))).values?.valor).toBe(3)
      }
      expect(engine.stats()).toMatchObject({ batches: 3, booted: 1, recycled: 0, resetFailures: 0 })
    } finally {
      await engine.shutdown()
    }
  }, 90_000)
})

describe.skipIf(!isPyodideAvailable)("PyodideEngine (integração, política reuse)", () => {
  let engine: PyodideEngine
  beforeAll(async () => {
    engine = createPyodideEngine({ policy: "reuse", warm: { dados: 1, ml: 0 }, recycleAfter: 3 })
    await engine.start()
  })
  afterAll(() => engine.shutdown())

  it("o mesmo worker atende lotes seguidos com o interpretador restaurado e é reciclado após N", async () => {
    const before = engine.stats()
    for (let index = 0; index < 4; index++) {
      const observation = await runOne(engine, mainFile("import numpy as np, sys", `sys.path.append('/x${index}')`, "np.mean = lambda *a, **k: 42", "valor = int(np.mean([1, 2, 3]))", "caminhos = len(sys.path)"), globalsProbe("valor", "caminhos"))
      expect(observation.values?.valor).toBe(42)
    }
    const probe = await runOne(engine, mainFile("import numpy as np, sys", "valor = float(np.mean([1, 2, 3]))", "sujo = any(p.startswith('/x') for p in sys.path)"), globalsProbe("valor", "sujo"))
    expect(probe).toMatchObject({ ok: true, values: { valor: 2, sujo: false } })
    const after = engine.stats()
    const booted = Number(after.booted) - Number(before.booted)
    // 5 lotes em workers reaproveitados: com recycleAfter=3, no máximo 2 aquecimentos extras.
    expect(booted).toBeLessThanOrEqual(3)
    expect(Number(after.recycled)).toBeGreaterThanOrEqual(1)
  })

  it("lote estrito (unittest) usa worker dedicado e descartado, e funciona", async () => {
    const files = mainFile("import unittest", "def soma(a, b):", "    return a + b", "class T(unittest.TestCase):", "    def test_soma(self):", "        self.assertEqual(soma(2, 3), 5)")
    const observation = await runOne(engine, files, { id: "u", kind: "unittest", target: "soma", implementation: "def soma(a, b):\n    return a + b" })
    expect(observation).toMatchObject({ ok: true, tests: { run: 1, failures: 0, errors: 0 } })
  })
})

describe.skipIf(!isPyodideAvailable)("PyodideEngine (integração, orçamento de memória)", () => {
  const files = mainFile("import numpy as np", "valor = int(np.sum([1, 2]))")
  /** Pesos dos testes: o orçamento é dado em "workers dados" de 256 MB. */
  const memoryMb = { dados: 256, ml: 1229 }
  const idleSettled = async (engine: PyodideEngine, budget: MemoryBudget, expectedUsedMb: number): Promise<void> => {
    const deadline = Date.now() + 30_000
    while (budget.usedMb !== expectedUsedMb || engine.readiness.warm.dados * memoryMb.dados !== expectedUsedMb) {
      if (Date.now() > deadline) throw new Error(`orçamento não assentou em ${expectedUsedMb} MB (usado: ${budget.usedMb})`)
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
  }

  it("6 jobs simultâneos com orçamento de 2 workers: nunca mais de 2 workers vivos e todos terminam", async () => {
    const budget = new MemoryBudget(2 * memoryMb.dados)
    const semaphore = new Semaphore(6, 50, budget)
    const engine = createPyodideEngine({ warm: { dados: 0, ml: 0 }, budget, memoryMb })
    const executor = new Executor({ python: fakeWasi(), "python-dados": engine }, semaphore, { budget, maxQueueWaitMs: 110_000 })
    try {
      const job: RunnerJob = { files, entry: "main.py", runtime: "python-dados", libraries: ["numpy"], probes: [globalsProbe("valor")], limits: SHORT_LIMITS }
      const pending = Array.from({ length: 6 }, () => executor.execute(job))
      // Os dois primeiros reservaram um worker cada; os outros quatro esperam memória na fila.
      expect(semaphore.active).toBe(2)
      expect(budget.snapshot()).toEqual({ limitMb: 512, usedMb: 512, peakUsedMb: 512, blocked: 4 })
      const results = await Promise.all(pending)
      expect(results.map((result) => result.observations[0]?.values?.valor)).toEqual([3, 3, 3, 3, 3, 3])
      expect(engine.stats()).toMatchObject({ batches: 6, booted: 6, bootFailures: 0, peakLive: 2 })
      expect(budget.peakUsedMb).toBe(512)
      expect(budget.blocked).toBe(0)
      await idleSettled(engine, budget, 0)
    } finally {
      await engine.shutdown()
    }
    expect(budget.usedMb).toBe(0)
  }, 120_000)

  it("sem reserva do executor (run direto), o motor espera memória por conta própria: pico ≤ 2 workers", async () => {
    const budget = new MemoryBudget(2 * memoryMb.dados)
    const engine = createPyodideEngine({ warm: { dados: 1, ml: 0 }, budget, memoryMb })
    try {
      const observations = await Promise.all(Array.from({ length: 6 }, () => runOne(engine, files, globalsProbe("valor"))))
      expect(observations.map((observation) => observation.values?.valor)).toEqual([3, 3, 3, 3, 3, 3])
      expect(Number(engine.stats().peakLive)).toBeLessThanOrEqual(2)
      expect(budget.peakUsedMb).toBeLessThanOrEqual(512)
      expect(budget.blocked).toBe(0)
      // Sem lote à espera, o pool aquecido (especulativo) volta: 1 worker ocioso segurando 256 MB.
      await idleSettled(engine, budget, memoryMb.dados)
    } finally {
      await engine.shutdown()
    }
    expect(budget.usedMb).toBe(0)
  }, 120_000)

  it("worker ocioso é cache: sem memória para um lote, o ocioso é despejado e o pool volta depois", async () => {
    // Orçamento de 1 worker, todo ocupado pelo aquecido. O lote estrito (unittest) na política
    // reuse exige um worker dedicado: só cabe se o ocioso sair.
    const budget = new MemoryBudget(memoryMb.dados)
    const engine = createPyodideEngine({ policy: "reuse", warm: { dados: 1, ml: 0 }, budget, memoryMb })
    try {
      await engine.start()
      expect(engine.readiness.ready).toBe(true)
      await idleSettled(engine, budget, memoryMb.dados)
      const unittestFiles = mainFile("import unittest", "def soma(a, b):", "    return a + b", "class T(unittest.TestCase):", "    def test_soma(self):", "        self.assertEqual(soma(2, 3), 5)")
      const observation = await runOne(engine, unittestFiles, { id: "u", kind: "unittest", target: "soma", implementation: "def soma(a, b):\n    return a + b" })
      expect(observation).toMatchObject({ ok: true, tests: { run: 1, failures: 0, errors: 0 } })
      expect(engine.stats()).toMatchObject({ evicted: 1, peakLive: 1 })
      expect(budget.peakUsedMb).toBe(memoryMb.dados)
      await idleSettled(engine, budget, memoryMb.dados)
    } finally {
      await engine.shutdown()
    }
    expect(budget.usedMb).toBe(0)
  }, 120_000)

  it("política por perfil: dados em reuse reaproveita o mesmo worker (que segue vivo e contado), ml fica em fresh", async () => {
    const budget = new MemoryBudget(2 * memoryMb.dados)
    const engine = createPyodideEngine({ policy: { dados: "reuse", ml: "fresh" }, warm: { dados: 0, ml: 0 }, recycleAfter: 10, budget, memoryMb })
    try {
      expect(engine.readiness.policy).toEqual({ dados: "reuse", ml: "fresh" })
      for (let index = 0; index < 3; index++) expect((await runOne(engine, files, globalsProbe("valor"))).values?.valor).toBe(3)
      await idleSettled(engine, budget, memoryMb.dados)
      expect(engine.stats()).toMatchObject({ batches: 3, booted: 1, recycled: 0, evicted: 0, peakLive: 1, policy: { dados: "reuse", ml: "fresh" }, live: { dados: 1, ml: 0 } })
      // Emprestar o worker não aquece um substituto: o pool continua com 1 vivo.
      expect(budget.peakUsedMb).toBe(memoryMb.dados)
    } finally {
      await engine.shutdown()
    }
    expect(budget.usedMb).toBe(0)
  }, 120_000)

  it("exceção depois de obter o worker (lote que não pode ser enviado a ele) devolve o worker e a reserva", async () => {
    const budget = new MemoryBudget(memoryMb.dados)
    const engine = createPyodideEngine({ warm: { dados: 0, ml: 0 }, budget, memoryMb })
    try {
      // Uma função não atravessa o postMessage: `worker.run` lança depois de o worker estar pronto.
      const unsendable = [{ path: "main.py", content: (() => 1) as unknown as string }]
      await expect(runOne(engine, unsendable, globalsProbe("valor"))).rejects.toThrow()
      await idleSettled(engine, budget, 0)
      expect(engine.stats()).toMatchObject({ booted: 1, live: { dados: 0 } })
      // O orçamento de 1 worker voltou inteiro: o lote seguinte roda.
      expect((await runOne(engine, files, globalsProbe("valor"))).values?.valor).toBe(3)
    } finally {
      await engine.shutdown()
    }
    expect(budget.usedMb).toBe(0)
  }, 120_000)

  it("perfil que pesa mais que o orçamento é recusado no accept (501), sem aquecer nada", () => {
    const budget = new MemoryBudget(1000)
    const engine = createPyodideEngine({ warm: { dados: 0, ml: 0 }, budget, memoryMb })
    expect(() => engine.accept({ runtime: "python-dados", libraries: ["scikit-learn"] })).toThrow(InsufficientMemoryError)
    expect(() => engine.accept({ runtime: "python-dados", libraries: ["numpy"] })).not.toThrow()
    expect(engine.cost({ runtime: "python-dados", libraries: ["scikit-learn"] })).toMatchObject({ key: "pyodide:ml", memoryMb: 1229 })
    expect(engine.cost({ runtime: "python-dados", libraries: [] })).toMatchObject({ key: "pyodide:dados", memoryMb: 256 })
    expect(budget.usedMb).toBe(0)
  })
})

describe.skipIf(!isPyodideAvailable)("servidor: job python-dados por POST /v1/run", () => {
  let engine: PyodideEngine
  let server: Server
  let base = ""
  const token = "t".repeat(32)
  beforeAll(async () => {
    engine = createPyodideEngine({ warm: { dados: 1, ml: 0 } })
    await engine.start()
    const semaphore = new Semaphore(2, 10)
    const wasi = fakeWasi()
    const stats = new RunnerStats(semaphore, [wasi, engine])
    const executor = new Executor({ python: wasi, "python-dados": engine }, semaphore, { stats })
    server = buildServer({ executor, token, log: () => undefined, readiness: wasi.readiness, pyodideReadiness: engine.readiness, stats })
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })
  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()))
    await engine.shutdown()
  })

  const post = (body: unknown): Promise<Response> =>
    fetch(`${base}/v1/run`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify(body) })

  it("corrige com numpy e pandas e informa o motor", async () => {
    const job: RunnerJob = {
      files: mainFile("import pandas as pd", "def maior(valores):", "    return float(pd.Series(valores).max())"),
      entry: "main.py",
      probes: [{ id: "c", kind: "call", function: "maior", args: [[1, 9, 3]], kwargs: {} }],
      limits: SHORT_LIMITS,
      runtime: "python-dados",
      libraries: ["pandas"],
    }
    const response = await post(job)
    expect(response.status).toBe(200)
    const result = (await response.json()) as { observations: ProbeObservation[]; engine: { python: string; runtime: string } }
    expect(result.observations[0]).toMatchObject({ id: "c", ok: true, value: 9 })
    expect(result.engine.runtime).toMatch(/^pyodide 314/)
  })

  it("biblioteca desconhecida responde 400 e motor desligado responde 501", async () => {
    const job = { files: mainFile("x = 1"), probes: [globalsProbe("x")], runtime: "python-dados", libraries: ["torch"] }
    const response = await post(job)
    expect(response.status).toBe(400)
    const body = (await response.json()) as { error: string; message: string }
    expect(body.error).toBe("unknown_library")
    expect(body.message).toContain("torch")
    const withoutPyodide = buildServer({ executor: new Executor({ python: fakeWasi() }, new Semaphore(1, 1)), token, log: () => undefined })
    await new Promise<void>((resolve) => withoutPyodide.listen(0, "127.0.0.1", resolve))
    try {
      const refused = await fetch(`http://127.0.0.1:${(withoutPyodide.address() as AddressInfo).port}/v1/run`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ ...job, libraries: ["numpy"] }) })
      expect(refused.status).toBe(501)
      expect(await refused.json()).toMatchObject({ error: "runtime_unavailable" })
    } finally {
      await new Promise<void>((resolve) => withoutPyodide.close(() => resolve()))
    }
  })

  it("/healthz informa o motor Pyodide e /v1/stats traz os contadores por motor", async () => {
    const health = (await (await fetch(`${base}/healthz`)).json()) as { status: string; pyodide: { ready: boolean; policy: Record<string, string>; profiles: string[]; warm: Record<string, number> } }
    expect(health.status).toBe("ok")
    expect(health.pyodide).toMatchObject({ ready: true, profiles: ["dados", "ml"], warm: { ml: 0 } })
    const stats = (await (await fetch(`${base}/v1/stats`, { headers: { authorization: `Bearer ${token}` } })).json()) as { engines: Record<string, Record<string, unknown>>; memory: Record<string, unknown> }
    expect(health.pyodide.policy).toEqual({ dados: "fresh", ml: "fresh" })
    expect(stats.engines.pyodide).toMatchObject({ policy: { dados: "fresh", ml: "fresh" } })
    expect(stats.memory).toMatchObject({ limitMb: null, blocked: 0 })
    expect(stats.engines.wasi).toBeDefined()
  })
})

/** Motor WASI falso para os testes do executor: responde ok e marca a observação. */
function fakeWasi(): Engine {
  return {
    name: "wasi",
    versions: { python: "3.14 (falso)", runtime: "falso" },
    readiness: { ready: true, reason: "" },
    accept: () => undefined,
    cost: () => ({ key: "wasi", memoryMb: 0 }),
    warmupMs: () => 0,
    stats: () => ({ batches: 0 }),
    run: (batch) => Promise.resolve(batch.probes.map((probe) => ({ id: probe.id, ok: true, error: "wasi-falso" }))),
  }
}
