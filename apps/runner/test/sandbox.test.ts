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
import type { Probe, ProjectFile } from "@levelusp/contracts"
import { WasmtimeSandbox } from "../src/sandbox"
import { resolveBinary } from "../src/config"

const pythonDir = process.env.PYTHON_WASI_DIR ?? "/opt/levelusp-python"
const available = existsSync(path.join(pythonDir, "python.cwasm")) && process.env.SKIP_SANDBOX_TESTS !== "1"
const here = path.dirname(fileURLToPath(import.meta.url))

const limits = { timeoutMs: 4_000, memoryMb: 128 }
const main = (content: string): ProjectFile[] => [{ path: "main.py", content }]

describe.skipIf(!available)("WasmtimeSandbox (integração)", () => {
  let sandbox: WasmtimeSandbox
  beforeAll(() => {
    process.env.SUPER_SECRET = "nao-deve-vazar-123"
    sandbox = new WasmtimeSandbox({
      wasmtimeBin: resolveBinary(process.env.WASMTIME_BIN ?? "wasmtime", process.env.PATH),
      pythonDir,
      harnessPath: path.resolve(here, "../python/harness.py"),
      workDir: os.tmpdir(),
    })
  })

  const run = (files: ProjectFile[], probes: Probe[]) => sandbox.runBatch(files, "main.py", probes, limits)

  it("chama funções e devolve valor e tipo canônicos", async () => {
    const [obs] = await run(main("def soma(a, b):\n    return a + b\n"), [{ id: "c", kind: "call", function: "soma", args: [2, 3], kwargs: {} }])
    expect(obs).toMatchObject({ ok: true, value: 5 })
  })

  it("executa o programa com stdin e captura a saída", async () => {
    const [obs] = await run(main("n = int(input())\nprint(n * 2)\n"), [{ id: "r", kind: "run", stdin: "21\n" }])
    expect(obs).toMatchObject({ ok: true, stdout: "42\n" })
  })

  it("suporta projetos multi-arquivo", async () => {
    const files = [...main("from utils.mat import dobro\nx = dobro(4)\n"), { path: "utils/mat.py", content: "def dobro(n):\n    return 2 * n\n" }]
    const [obs] = await run(files, [{ id: "g", kind: "globals", names: ["x"] }])
    expect(obs).toMatchObject({ ok: true, values: { x: 8 } })
  })

  it("interrompe laços infinitos pelo tempo limite", async () => {
    const [obs] = await sandbox.runBatch(main("while True:\n    pass\n"), "main.py", [{ id: "r", kind: "run", stdin: "" }], { timeoutMs: 1_000, memoryMb: 64 })
    expect(obs).toMatchObject({ ok: false, timedOut: true })
  })

  it("limita a memória", async () => {
    const [obs] = await run(main("x = [0] * (10 ** 9)\n"), [{ id: "r", kind: "run", stdin: "" }])
    expect(obs?.ok).toBe(false)
    expect(obs?.error ?? "").toMatch(/MemoryError|Memória/)
  })

  // ── Ataques da auditoria de 2026-10-15 ─────────────────────────────────────
  it("não expõe variáveis de ambiente do host", async () => {
    const [obs] = await run(main("import os\nsegredo = dict(os.environ)\n"), [{ id: "g", kind: "globals", names: ["segredo"] }])
    expect(JSON.stringify(obs)).not.toContain("nao-deve-vazar")
  })

  it("não enxerga /proc nem o sistema de arquivos do host", async () => {
    const code = "import os\ntry:\n    r = open('/proc/self/environ').read()\nexcept Exception as e:\n    r = type(e).__name__\ntry:\n    h = os.listdir('/etc')\nexcept Exception as e:\n    h = type(e).__name__\n"
    const [obs] = await run(main(code), [{ id: "g", kind: "globals", names: ["r", "h"] }])
    expect(obs).toMatchObject({ ok: true, values: { r: "FileNotFoundError", h: "FileNotFoundError" } })
  })

  it("não tem rede nem subprocessos", async () => {
    const code = "import socket, subprocess\ntry:\n    socket.create_connection(('1.1.1.1', 80), timeout=1)\n    net = 'ok'\nexcept Exception as e:\n    net = type(e).__name__\ntry:\n    subprocess.run(['ls'])\n    proc = 'ok'\nexcept Exception as e:\n    proc = type(e).__name__\n"
    const [obs] = await run(main(code), [{ id: "g", kind: "globals", names: ["net", "proc"] }])
    expect(obs?.values?.net).not.toBe("ok")
    expect(obs?.values?.proc).not.toBe("ok")
  })

  it("a análise de AST não é afetada por código do aluno (roda sem executar)", async () => {
    // O aluno tenta corromper o módulo ast para "provar" que usou lambda.
    const code = "import ast\ndef falso(t):\n    return [ast.Lambda(args=None, body=None)]\nast.walk = falso\n"
    const sandboxObs = await sandbox.runBatch(main(code), "main.py", [{ id: "a", kind: "ast" }], limits)
    expect(sandboxObs[0]?.features?.constructs).not.toContain("lambda")
  })
})
