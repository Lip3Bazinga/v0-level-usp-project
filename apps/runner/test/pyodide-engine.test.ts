/**
 * Motor python-dados (Pyodide): unitários da seleção de perfil e das políticas, e a
 * integração real (workers do Node com a distribuição de `PYODIDE_DIR`): sondas `io`,
 * `call`, `expr`, tempo limite, estouro de memória, readiness e `POST /v1/run`.
 */
import type { Server } from "node:http"
import type { AddressInfo } from "node:net"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { ProbeObservation, RunnerJob } from "@levelusp/contracts"
import { EngineRequestError, type Engine } from "../src/engine"
import { Executor } from "../src/executor"
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

describe.skipIf(!isPyodideAvailable)("PyodideEngine (integração, política fresh)", () => {
  let engine: PyodideEngine
  beforeAll(async () => {
    engine = createPyodideEngine({ warm: { dados: 1, ml: 0 } })
    await engine.start()
  })
  afterAll(() => engine.shutdown())

  it("o autoteste da partida deixa o motor pronto e informa os perfis e o pool", () => {
    expect(engine.readiness).toMatchObject({ ready: true, reason: "", policy: "fresh", profiles: ["dados", "ml"] })
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
    expect(stats).toMatchObject({ policy: "fresh", warm: { ml: 0 } })
    expect(typeof stats.batches).toBe("number")
    expect(engine.warmupMs({ runtime: "python-dados", libraries: ["scikit-learn"] })).toBeGreaterThan(0)
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(engine.readiness.warm.dados).toBeLessThanOrEqual(1)
  })
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
    const health = (await (await fetch(`${base}/healthz`)).json()) as { status: string; pyodide: { ready: boolean; profiles: string[]; warm: Record<string, number> } }
    expect(health.status).toBe("ok")
    expect(health.pyodide).toMatchObject({ ready: true, profiles: ["dados", "ml"], warm: { ml: 0 } })
    const stats = (await (await fetch(`${base}/v1/stats`, { headers: { authorization: `Bearer ${token}` } })).json()) as { engines: Record<string, Record<string, unknown>> }
    expect(stats.engines.pyodide).toMatchObject({ policy: "fresh" })
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
    warmupMs: () => 0,
    stats: () => ({ batches: 0 }),
    run: (batch) => Promise.resolve(batch.probes.map((probe) => ({ id: probe.id, ok: true, error: "wasi-falso" }))),
  }
}
