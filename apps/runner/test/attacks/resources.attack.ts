/**
 * Classe 1 (abuso de recursos): memória, CPU (inclusive em finalizadores e
 * atexit), recursão, inundação de saída, disco, filas e limpeza dos jobs. O
 * executor tem de continuar de pé e devolver uma observação de falha — nunca
 * uma aprovação, nunca travar.
 */
import type { Server } from "node:http"
import type { AddressInfo } from "node:net"
import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import path from "node:path"
import type { Probe, RunnerJob } from "@levelusp/contracts"
import { afterAll, describe, expect, it } from "vitest"
import { Executor, type BatchRunner } from "../../src/executor"
import { buildWasmtimeArgs, isWithinDiskQuota, jsonNestingDepth, parseObservations } from "../../src/sandbox"
import { Semaphore } from "../../src/semaphore"
import { buildServer } from "../../src/server"
import { createSandbox, exprProbe, globalsProbe, isPythonAvailable, jobsRoot, leftoverJobDirs, mainFile, runOne, runProbe, runProbes } from "./support"

const sandbox = createSandbox({ maxJobDiskBytes: 8 * 1024 * 1024 })
const QUICK = { timeoutMs: 1_500, memoryMb: 64 }
/** Folga para o processo morrer e o host juntar a saída. */
const KILL_SLACK_MS = 4_000

async function timed<T>(action: () => Promise<T>): Promise<{ value: T; ms: number }> {
  const startedAt = performance.now()
  const value = await action()
  return { value, ms: performance.now() - startedAt }
}

describe.skipIf(!isPythonAvailable)("abuso de recursos: memória e CPU", () => {
  it.each([
    ["bytearray de 1 GB", "x = bytearray(10 ** 9)"],
    ["texto de 10 GB", "x = 'a' * 10 ** 10"],
    ["lista que cresce", "x = []\nwhile True:\n    x.append([0] * 10000)"],
    ["dicionário aninhado profundo", "d = {}\natual = d\nfor _ in range(10 ** 7):\n    atual['x'] = {}\n    atual = atual['x']"],
  ])("memória: %s vira falha, não derruba o executor", async (_name, code) => {
    const observation = await runOne(sandbox, mainFile(code), runProbe(), QUICK)
    expect(observation.ok).toBe(false)
    expect(observation.error ?? (observation.timedOut ? "tempo" : "")).toMatch(/MemoryError|Memória|tempo|Tempo|OverflowError|terminou|Recursão/)
  })

  it.each([
    ["laço infinito", "while True:\n    pass"],
    ["laço em __del__", "class X:\n    def __del__(self):\n        while True:\n            pass\nX()"],
    ["laço no atexit", "import atexit\natexit.register(lambda: [None for _ in iter(int, 1)])\nprint('fim')"],
    ["laço em __repr__ chamado pelo harness", "class X:\n    def __repr__(self):\n        while True:\n            pass\nvalor = X()"],
    ["laço engolindo KeyboardInterrupt/SystemExit", "while True:\n    try:\n        while True:\n            pass\n    except BaseException:\n        pass"],
    ["número gigante", "x = 10 ** (10 ** 9)"],
  ])("CPU: %s termina no tempo limite", async (_name, code) => {
    const { value: observation, ms } = await timed(() => runOne(sandbox, mainFile(code), globalsProbe("valor"), QUICK))
    expect(ms).toBeLessThan(QUICK.timeoutMs + KILL_SLACK_MS)
    // O atexit roda depois da observação: ela sai, e o processo morre no tempo limite.
    if (code.includes("atexit")) expect(observation.ok).toBe(true)
    else expect(observation.ok).toBe(false)
  })

  it("recursão infinita (inclusive com o limite de recursão no máximo) vira erro, não fuga", async () => {
    const [plain, raised] = await runProbes(sandbox, mainFile("import sys", "def f(n):\n    return f(n + 1)"), [
      exprProbe("f(0)"),
      exprProbe("f(0)", "sys.setrecursionlimit(10 ** 8)", "e2"),
    ], QUICK)
    expect(plain?.raised?.type).toBe("RecursionError")
    expect(raised?.ok === false || raised?.raised !== undefined).toBe(true)
  })
})

describe.skipIf(!isPythonAvailable)("abuso de recursos: saída e canal de observações", () => {
  it.each([
    ["stdout via print", "while True:\n    print('x' * 100000)"],
    ["fd 1 direto", "import os\nwhile True:\n    os.write(1, b'x' * 100000)"],
    ["stderr", "import sys\nwhile True:\n    sys.__stderr__.write('x' * 100000)"],
    ["linha única gigante", "import os\nos.write(1, b'y' * (20 * 1024 * 1024))"],
  ])("inundação: %s é cortada sem aprovar nada", async (_name, code) => {
    const { value: observation, ms } = await timed(() => runOne(sandbox, mainFile(code), runProbe(), QUICK))
    expect(ms).toBeLessThan(QUICK.timeoutMs + KILL_SLACK_MS)
    if (observation.ok) {
      // Saída capturada pelo harness: limitada a 64 000 caracteres.
      expect(observation.truncated).toBe(true)
      expect((observation.stdout ?? "").length).toBeLessThanOrEqual(64_000)
    }
  })

  it("UTF-8 inválido, surrogates e bytes nulos na saída e nos valores viram JSON válido", async () => {
    const code = [
      "import os, sys",
      "print('\\udcff \\ud800 \\x00 fim')",
      "os.write(1, b'\\xff\\xfe\\xc3')",
      "valor = {'\\ud800': '\\x00\\udfff', 'ok': '\\u00e9'}",
    ].join("\n")
    const [run, globals] = await runProbes(sandbox, mainFile(code), [runProbe(), globalsProbe("valor")])
    expect(run?.ok).toBe(true)
    expect(run?.stdout).toContain("fim")
    expect(globals?.values?.valor).toMatchObject({ ok: "é" })
  })

  it("valores 'bomba' do aluno (aninhamento, tamanho, inteiro gigante) são truncados no harness", async () => {
    const code = [
      "import sys",
      "sys.set_int_max_str_digits(0)",
      "fundo = []",
      "atual = fundo",
      "for _ in range(100000):",
      "    novo = []",
      "    atual.append(novo)",
      "    atual = novo",
      "largo = {str(i): list(range(50)) for i in range(5000)}",
      "gigante = 10 ** 100000",
      "texto = 'z' * 10 ** 6",
    ].join("\n")
    const observation = await runOne(sandbox, mainFile(code), globalsProbe("fundo", "largo", "gigante", "texto"))
    expect(observation.ok).toBe(true)
    expect(JSON.stringify(observation).length).toBeLessThan(400_000)
    expect(jsonNestingDepth(JSON.stringify(observation))).toBeLessThan(80)
    expect(observation.values?.gigante).toEqual({ $int: "<inteiro grande demais>" })
  })

  it("linhas com o nonce mas gigantes ou fundas demais são descartadas pelo host", () => {
    const nonce = "f".repeat(32)
    const deep = `${nonce} {"id":"p0","ok":true,"value":${"[".repeat(10_000)}${"]".repeat(10_000)}}`
    const huge = `${nonce} {"id":"p1","ok":true,"stdout":"${"x".repeat(5 * 1024 * 1024)}"}`
    const fine = `${nonce} {"id":"p2","ok":true,"value":[[["a]]]["]]]}`
    const observations = parseObservations([deep, huge, fine].join("\n"), nonce)
    expect([...observations.keys()]).toEqual(["p2"])
  })
})

describe.skipIf(!isPythonAvailable)("abuso de recursos: disco e limpeza", () => {
  it.each([
    ["um arquivo enorme", "with open('grande.bin', 'wb') as f:\n    while True:\n        f.write(b'x' * (1 << 20))"],
    ["milhares de arquivos", "i = 0\nwhile True:\n    open('f%d' % i, 'w').close()\n    i += 1"],
    ["muitas pastas", "import os\ni = 0\nwhile True:\n    os.makedirs('d%d/e/f' % i)\n    i += 1"],
  ])("disco: %s mata o lote pela cota", async (_name, code) => {
    const { value: observation, ms } = await timed(() => runOne(sandbox, mainFile(code), runProbe(), { timeoutMs: 8_000, memoryMb: 64 }))
    expect(observation.ok).toBe(false)
    expect(observation.error).toContain("Disco excedido")
    expect(ms).toBeLessThan(8_000)
  })

  it("isWithinDiskQuota mede bytes e entradas sem seguir links", async () => {
    const root = path.join(jobsRoot, "medida")
    mkdirSync(path.join(root, "sub"), { recursive: true })
    writeFileSync(path.join(root, "sub", "a.bin"), Buffer.alloc(2048))
    expect(await isWithinDiskQuota(root, 4096)).toBe(true)
    expect(await isWithinDiskQuota(root, 1024)).toBe(false)
    expect(await isWithinDiskQuota(path.join(root, "nao-existe"), 1)).toBe(true)
    rmSync(root, { recursive: true, force: true })
  })

  it("nenhuma pasta de job sobra depois de timeout, kill por saída, kill por disco e erro", async () => {
    const before = leftoverJobDirs().filter((name) => name.startsWith("lvl-job-"))
    expect(before).toEqual([])
    await Promise.all([
      runOne(sandbox, mainFile("while True:\n    pass"), runProbe(), { timeoutMs: 800, memoryMb: 64 }),
      runOne(sandbox, mainFile("import os\nwhile True:\n    os.write(1, b'x' * 100000)"), runProbe(), QUICK),
      runOne(sandbox, mainFile("open('g', 'wb').write(b'x' * (64 << 20))"), runProbe(), QUICK),
      runOne(sandbox, mainFile("raise SystemExit(3)"), runProbe(), QUICK),
    ])
    expect(leftoverJobDirs().filter((name) => name.startsWith("lvl-job-"))).toEqual([])
  })
})

describe("abuso de recursos: limites do Wasmtime aplicados", () => {
  it("fuel, memória, tempo, sem ambiente, sem rede/DNS e só três diretórios", () => {
    const args = buildWasmtimeArgs({ pythonDir: "/py", harnessDir: "/j/harness", workDir: "/j/work" }, { timeoutMs: 2_000, memoryMb: 64 })
    expect(args).toContain("fuel=30000000000,max-memory-size=67108864,timeout=2000ms")
    expect(args).toContain("inherit-env=n,inherit-network=n,tcp=n,udp=n,allow-ip-name-lookup=n")
    expect(args.filter((arg) => arg === "--dir")).toHaveLength(3)
    expect(args).toEqual(expect.arrayContaining(["/py/lib::/lib", "/j/harness::/harness", "/j/work::/work"]))
    expect(args.join(" ")).not.toMatch(/--env|inherit-env=y|-S\s+cli=n|wasi-threads|threads=y|http|inherit-network=y/)
  })
})

/** Executor real atrás do servidor HTTP: fila, 503 e cancelamento. */
describe.skipIf(!isPythonAvailable)("abuso de recursos: concorrência", () => {
  const ranJobs: number[] = []
  const counting: BatchRunner = {
    runBatch: (batch) => {
      ranJobs.push(batch.probes.length)
      return sandbox.runBatch(batch)
    },
  }
  const token = "t".repeat(32)
  const server: Server = buildServer({ executor: new Executor(counting, new Semaphore(1, 1)), token, log: () => undefined })
  const ready = new Promise<string>((resolve) => server.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${(server.address() as AddressInfo).port}`)))
  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())))

  const job = (code: string, probes: Probe[] = [runProbe()]): RunnerJob => ({ files: mainFile(code), entry: "main.py", probes, limits: { timeoutMs: 1_500, memoryMb: 64 } })
  const post = async (body: RunnerJob, signal?: AbortSignal): Promise<number> => {
    const response = await fetch(`${await ready}/v1/run`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
      ...(signal ? { signal } : {}),
    })
    await response.text()
    return response.status
  }

  it("muitos jobs simultâneos: 1 roda, 1 espera, o resto recebe 503 (sem fila infinita)", async () => {
    const statuses = await Promise.all(Array.from({ length: 5 }, () => post(job("while True:\n    pass"))))
    expect(statuses.filter((status) => status === 200)).toHaveLength(2)
    expect(statuses.filter((status) => status === 503)).toHaveLength(3)
  })

  it("job cancelado enquanto espera na fila não executa e libera o lugar", async () => {
    ranJobs.length = 0
    const running = post(job("while True:\n    pass"))
    await new Promise((resolve) => setTimeout(resolve, 200))
    const abort = new AbortController()
    const queued = post(job("x = 1", [globalsProbe("x"), globalsProbe("x"), globalsProbe("x")]), abort.signal).catch(() => 0)
    await new Promise((resolve) => setTimeout(resolve, 100))
    abort.abort()
    expect(await queued).toBe(0)
    expect(await running).toBe(200)
    // O lugar na fila voltou: um novo job é aceito e roda.
    expect(await post(job("x = 2", [globalsProbe("x")]))).toBe(200)
    // O job cancelado (3 sondas) nunca chegou ao sandbox.
    expect(ranJobs).not.toContain(3)
  })
})
