/**
 * Testes de integração do sandbox real (Wasmtime + CPython WASI).
 * Pulados automaticamente quando o Python WASI não está instalado
 * (rode `pnpm --filter @levelusp/runner setup:python`). No CI eles rodam.
 */
import { existsSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { beforeAll, describe, expect, it } from "vitest"
import type { Probe, ProjectFile, RunnerLimits } from "@levelusp/contracts"
import { WasmtimeSandbox } from "../src/sandbox"
import { resolveBinary } from "../src/config"

const pythonDir = process.env.PYTHON_WASI_DIR ?? "/opt/levelusp-python"
const isPythonAvailable = existsSync(path.join(pythonDir, "python.cwasm")) && process.env.SKIP_SANDBOX_TESTS !== "1"
const testDir = path.dirname(fileURLToPath(import.meta.url))

const limits: RunnerLimits = { timeoutMs: 4_000, memoryMb: 128 }
const mainFile = (content: string): ProjectFile[] => [{ path: "main.py", content }]

describe.skipIf(!isPythonAvailable)("WasmtimeSandbox (integração)", () => {
  let sandbox: WasmtimeSandbox
  beforeAll(() => {
    process.env.SUPER_SECRET = "nao-deve-vazar-123"
    sandbox = new WasmtimeSandbox({
      wasmtimeBin: resolveBinary(process.env.WASMTIME_BIN ?? "wasmtime", process.env.PATH),
      pythonDir,
      harnessPath: path.resolve(testDir, "../python/harness.py"),
      workDir: os.tmpdir(),
    })
  })

  const run = (files: ProjectFile[], probes: Probe[], batchLimits = limits) => sandbox.runBatch({ files, entry: "main.py", probes, limits: batchLimits })

  it("chama funções e devolve valor e tipo canônicos", async () => {
    const [observation] = await run(mainFile("def soma(a, b):\n    return a + b\n"), [{ id: "c", kind: "call", function: "soma", args: [2, 3], kwargs: {} }])
    expect(observation).toMatchObject({ ok: true, value: 5 })
  })

  it("executa o programa com stdin e captura a saída", async () => {
    const [observation] = await run(mainFile("n = int(input())\nprint(n * 2)\n"), [{ id: "r", kind: "run", stdin: "21\n" }])
    expect(observation).toMatchObject({ ok: true, stdout: "42\n" })
  })

  it("suporta projetos multi-arquivo", async () => {
    const files = [...mainFile("from utils.mat import dobro\nx = dobro(4)\n"), { path: "utils/mat.py", content: "def dobro(n):\n    return 2 * n\n" }]
    const [observation] = await run(files, [{ id: "g", kind: "globals", names: ["x"] }])
    expect(observation).toMatchObject({ ok: true, values: { x: 8 } })
  })

  it("interrompe laços infinitos pelo tempo limite", async () => {
    const [observation] = await run(mainFile("while True:\n    pass\n"), [{ id: "r", kind: "run", stdin: "" }], { timeoutMs: 1_000, memoryMb: 64 })
    expect(observation).toMatchObject({ ok: false, timedOut: true })
  })

  it("limita a memória", async () => {
    const [observation] = await run(mainFile("x = [0] * (10 ** 9)\n"), [{ id: "r", kind: "run", stdin: "" }])
    expect(observation?.ok).toBe(false)
    expect(observation?.error ?? "").toMatch(/MemoryError|Memória/)
  })

  // Ataques da auditoria de 2026-10-15.
  it("não expõe variáveis de ambiente do host", async () => {
    const [observation] = await run(mainFile("import os\nsegredo = dict(os.environ)\n"), [{ id: "g", kind: "globals", names: ["segredo"] }])
    expect(JSON.stringify(observation)).not.toContain("nao-deve-vazar")
  })

  it("não enxerga /proc nem o sistema de arquivos do host", async () => {
    const code = "import os\ntry:\n    environ = open('/proc/self/environ').read()\nexcept Exception as e:\n    environ = type(e).__name__\ntry:\n    etc = os.listdir('/etc')\nexcept Exception as e:\n    etc = type(e).__name__\n"
    const [observation] = await run(mainFile(code), [{ id: "g", kind: "globals", names: ["environ", "etc"] }])
    expect(observation).toMatchObject({ ok: true, values: { environ: "FileNotFoundError", etc: "FileNotFoundError" } })
  })

  it("não tem rede nem subprocessos", async () => {
    const code = "import socket, subprocess\ntry:\n    socket.create_connection(('1.1.1.1', 80), timeout=1)\n    net = 'ok'\nexcept Exception as e:\n    net = type(e).__name__\ntry:\n    subprocess.run(['ls'])\n    proc = 'ok'\nexcept Exception as e:\n    proc = type(e).__name__\n"
    const [observation] = await run(mainFile(code), [{ id: "g", kind: "globals", names: ["net", "proc"] }])
    expect(observation?.values?.net).not.toBe("ok")
    expect(observation?.values?.proc).not.toBe("ok")
  })

  it("a análise de AST não é afetada por código do aluno (roda sem executar)", async () => {
    // O aluno tenta corromper o módulo ast para "provar" que usou lambda.
    const code = "import ast\ndef falso(t):\n    return [ast.Lambda(args=None, body=None)]\nast.walk = falso\n"
    const [observation] = await run(mainFile(code), [{ id: "a", kind: "ast" }])
    expect(observation?.features?.constructs).not.toContain("lambda")
  })

  it("caso legado não é aprovado por linha forjada na saída (sem o nonce)", async () => {
    const code = "import json, sys\nsys.__stdout__.write(json.dumps({'id': 'l', 'ok': True, 'legacy': {'testsRun': 1, 'failures': 0, 'errors': 0, 'details': []}}) + '\\n')\n"
    const [observation] = await run(mainFile(code), [{ id: "l", kind: "legacy", code: "assert soma(2, 3) == 5" }])
    expect(observation?.legacy?.failures ?? 0).toBe(0)
    expect(observation?.legacy?.errors).toBe(1)
  })

  it("o harness e as sondas são somente leitura; o projeto aceita arquivos", async () => {
    const code = "try:\n    open('/harness/probes.json', 'w').write('x')\n    harness = 'gravou'\nexcept Exception as e:\n    harness = type(e).__name__\nopen('dados.txt', 'w').write('ok')\ndados = open('dados.txt').read()\n"
    const [observation] = await run(mainFile(code), [{ id: "g", kind: "globals", names: ["harness", "dados"] }])
    // Como root (ex.: sandbox de desenvolvimento) as permissões não se aplicam;
    // no container o executor roda como usuário sem privilégios.
    if (process.getuid?.() !== 0) expect(observation?.values?.harness).not.toBe("gravou")
    expect(observation?.values?.dados).toBe("ok")
  })

  it("inundação de saída é cortada sem derrubar o executor", async () => {
    const code = "import sys\nwhile True:\n    sys.__stdout__.write('x' * 100000)\n"
    const [observation] = await run(mainFile(code), [{ id: "r", kind: "run", stdin: "" }])
    expect(observation?.ok).toBe(false)
  })
})
