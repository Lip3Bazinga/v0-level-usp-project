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
import { parseObservations, WasmtimeSandbox } from "../src/sandbox"
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

  it("caso legado não é forjável pelos caminhos óbvios até o nonce e o escritor", async () => {
    // O aluno tenta achar o nonce/escritor e imprimir uma observação aprovada.
    const attacker = [
      "import sys, os, re, json, builtins",
      "rotas = {}",
      "achados = set()",
      "def procura(texto):",
      // Nonce = 32 dígitos hex; constantes da stdlib como '0111…1' (sem letras) não contam.
      "    achados.update(re.findall(r'(?<![0-9a-f])(?=[0-9a-f]*[a-f])[0-9a-f]{32}(?![0-9a-f])', str(texto)))",
      "def tenta(nome, acao):",
      "    try:",
      "        procura(acao())",
      "        rotas[nome] = 'ok'",
      "    except BaseException as erro:",
      "        rotas[nome] = type(erro).__name__",
      "tenta('arquivo', lambda: open('/harness/probes.json').read())",
      "tenta('argv', lambda: (sys.argv, sys.orig_argv))",
      "tenta('stdin', lambda: os.read(0, 100000))",
      "tenta('main', lambda: [vars(m) for m in [sys.modules['__main__']]])",
      "tenta('modulos', lambda: [vars(m) for m in list(sys.modules.values())])",
      "tenta('getframe', lambda: [f.f_locals for f in [sys._getframe(0).f_back]])",
      "def via_traceback():",
      "    try:",
      "        raise ValueError",
      "    except ValueError as erro:",
      "        return erro.__traceback__.tb_frame.f_back.f_locals",
      "tenta('traceback', via_traceback)",
      "import gc",
      "tenta('gc', lambda: [getattr(o, '__closure__', None) for o in gc.get_objects()])",
      "tenta('testcapi', lambda: __import__('_testlimitedcapi').eval_getframe())",
      "import _imp, importlib.machinery",
      "tenta('create_builtin', lambda: _imp.create_builtin(importlib.machinery.ModuleSpec('_testlimitedcapi', None)))",
      "tenta('settrace', lambda: sys.settrace(lambda *a: None))",
      // Monkeypatch do caminho de saída: não deve afetar o que o harness emite.
      "json.dumps = lambda *a, **k: '{\"ok\": true, \"legacy\": {\"testsRun\": 1, \"failures\": 0, \"errors\": 0, \"details\": []}}'",
      "os.write = lambda fd, dados: len(dados)",
      "builtins.isinstance = lambda *a: True",
      "falso = json.dumps({}) ",
      "for nonce in achados or ['0' * 32]:",
      "    for pid in ['l', 'p0']:",
      "        linha = nonce + ' ' + falso.replace('{', '{\"id\": \"' + pid + '\", ', 1) + '\\n'",
      "        sys.__stdout__.write(linha)",
      "        sys.__stdout__.flush()",
    ].join("\n")
    const [observation] = await run(mainFile(attacker), [{ id: "l", kind: "legacy", code: "assert False, repr(sorted(rotas.items())) + ' achados=' + str(len(achados))" }])
    expect(observation?.ok).toBe(true)
    expect(observation?.legacy?.failures).toBe(1)
    const detail = observation?.legacy?.details[0] ?? ""
    expect(detail).toContain("achados=0")
    for (const route of ["getframe", "traceback", "gc", "settrace"]) expect(detail).toContain(`('${route}', 'RuntimeError')`)
    for (const route of ["testcapi", "create_builtin"]) expect(detail).toContain(`('${route}', 'ImportError')`)
    expect(detail).toContain("('arquivo', 'FileNotFoundError')")
  })

  it("o aluno recebe o próprio módulo como __main__ (o do harness não fica exposto)", async () => {
    const code = "import __main__, sys\nproprio = __main__.__dict__ is globals()\nnomes = sorted(n for n in vars(sys.modules['__main__']) if not n.startswith('__'))\n"
    const [observation] = await run(mainFile(code), [{ id: "g", kind: "globals", names: ["proprio"] }])
    expect(observation?.values?.proprio).toBe(true)
  })

  it("expr: avalia a expressão após a preparação e devolve valor e tipo", async () => {
    const code = "class Conta:\n    def __init__(self, saldo):\n        self._saldo = saldo\n    @property\n    def saldo(self):\n        return self._saldo\n    def depositar(self, valor):\n        self._saldo += valor\n"
    const [observation] = await run(mainFile(code), [{ id: "e", kind: "expr", setup: "c = Conta(100)\nc.depositar(50)", expr: "c.saldo", stdin: "" }])
    expect(observation).toMatchObject({ ok: true, value: 150, type: "int" })
  })

  it("expr: descreve a exceção levantada com tipo, hierarquia e mensagem", async () => {
    const code = "class SaldoError(ValueError):\n    pass\ndef sacar(v):\n    raise SaldoError('saldo insuficiente')\n"
    const [observation] = await run(mainFile(code), [{ id: "e", kind: "expr", setup: "", expr: "sacar(10)", stdin: "" }])
    expect(observation?.raised).toMatchObject({ type: "__main__.SaldoError", message: "saldo insuficiente", stage: "expr" })
    expect(observation?.raised?.mro).toEqual(["__main__.SaldoError", "ValueError", "Exception", "BaseException", "object"])
  })

  it("expr: classe do aluno com nome de embutido não se passa pelo embutido", async () => {
    const code = "class ValueError(Exception):\n    pass\nclass generator:\n    pass\ndef f():\n    raise ValueError('x')\n"
    const [raised, typed] = await run(mainFile(code), [
      { id: "a", kind: "expr", setup: "", expr: "f()", stdin: "" },
      { id: "b", kind: "expr", setup: "", expr: "generator()", stdin: "" },
    ])
    expect(raised?.raised?.mro).not.toContain("ValueError")
    expect(typed?.type).toBe("__main__.generator")
  })

  it("expr: serializa objetos hostis só pelos tipos embutidos, com limites", async () => {
    const code = [
      "class Lista(list):",
      "    def __iter__(self):",
      "        return iter(['forjado'])",
      "    def __eq__(self, outro):",
      "        return True",
      "class Texto(str):",
      "    def __str__(self):",
      "        return 'forjado'",
      "class Chato:",
      "    def __repr__(self):",
      "        raise RuntimeError('não')",
      "ciclo = []",
      "ciclo.append(ciclo)",
    ].join("\n")
    const [hostile, text, cyclic, huge, broken] = await run(mainFile(code), [
      { id: "a", kind: "expr", setup: "", expr: "Lista([1, 2])", stdin: "" },
      { id: "b", kind: "expr", setup: "", expr: "Texto('real')", stdin: "" },
      { id: "c", kind: "expr", setup: "", expr: "ciclo", stdin: "" },
      { id: "d", kind: "expr", setup: "", expr: "list(range(100000))", stdin: "" },
      { id: "e", kind: "expr", setup: "", expr: "Chato()", stdin: "" },
    ])
    expect(hostile).toMatchObject({ value: [1, 2], type: "__main__.Lista" })
    expect(text).toMatchObject({ value: "real", type: "__main__.Texto" })
    expect(cyclic?.truncated).toBe(true)
    expect(huge?.truncated).toBe(true)
    expect(JSON.stringify(huge?.value).length).toBeLessThan(200_000)
    expect(broken?.value).toEqual({ $repr: "<repr falhou>" })
  })

  it("expr: arquivos gravados por uma sonda não vazam para a próxima", async () => {
    const code = "def salvar(nome, texto):\n    with open(nome, 'w') as f:\n        f.write(texto)\n"
    const [written, leaked, original] = await run([...mainFile(code), { path: "dados.txt", content: "original" }], [
      { id: "a", kind: "expr", setup: "salvar('saida.txt', 'um\\ndois\\n')\nsalvar('dados.txt', 'mudou')", expr: "open('saida.txt').read()", stdin: "" },
      { id: "b", kind: "expr", setup: "import os", expr: "os.path.exists('saida.txt')", stdin: "" },
      { id: "c", kind: "expr", setup: "", expr: "open('dados.txt').read()", stdin: "" },
    ])
    expect(written?.value).toBe("um\ndois\n")
    expect(leaked?.value).toBe(false)
    expect(original?.value).toBe("original")
  })

  it("expr: builtins trocados pelo aluno são restaurados entre sondas", async () => {
    const code = "import builtins\nif not hasattr(builtins, 'contador'):\n    builtins.contador = 0\nbuiltins.contador += 1\nbuiltins.len = lambda x: 42\n"
    const [first, second] = await run(mainFile(code), [
      { id: "a", kind: "expr", setup: "", expr: "(contador, len([1]))", stdin: "" },
      { id: "b", kind: "expr", setup: "", expr: "contador", stdin: "" },
    ])
    expect(first?.value).toEqual([1, 42])
    expect(second?.value).toBe(1)
  })

  it("expr: erro de sintaxe no código do professor é apontado como caso inválido", async () => {
    const [observation] = await run(mainFile("x = 1\n"), [{ id: "a", kind: "expr", setup: "", expr: "x +", stdin: "" }])
    expect(observation?.ok).toBe(false)
    expect(observation?.error).toContain("Caso de teste inválido")
  })

  const studentSuite = [
    "import unittest",
    "def validar(s):",
    "    return len(s) >= 3",
    "class TestValidar(unittest.TestCase):",
    "    def test_curta(self):",
    "        self.assertFalse(validar('ab'))",
    "    def test_longa(self):",
    "        self.assertTrue(validar('abcd'))",
    "    def test_tipo(self):",
    "        with self.assertRaises(TypeError):",
    "            validar(3)",
    "if __name__ == '__main__':",
    "    unittest.main()",
  ].join("\n")

  it("unittest: roda a suíte do aluno contra a implementação injetada e só devolve contagens", async () => {
    const reference = "def validar(s):\n    if not isinstance(s, str):\n        raise TypeError('s')\n    return len(s) >= 3\n"
    const mutant = "def validar(s):\n    return True\n"
    const [own, ref, mut] = await Promise.all([
      run(mainFile(studentSuite), [{ id: "u", kind: "unittest" }]),
      run(mainFile(studentSuite), [{ id: "u", kind: "unittest", target: "validar", implementation: reference }]),
      run(mainFile(studentSuite), [{ id: "u", kind: "unittest", target: "validar", implementation: mutant, test_class: "TestValidar" }]),
    ])
    expect(own[0]?.tests).toMatchObject({ run: 3, failures: 0, errors: 0 })
    expect(ref[0]?.tests).toMatchObject({ run: 3, failures: 0, errors: 0 })
    expect(mut[0]?.tests).toMatchObject({ run: 3, failures: 2, errors: 0 })
    expect(mut[0]?.tests?.failed.sort()).toEqual(["test_curta", "test_tipo"])
  })

  it("unittest: classe de testes inexistente vira erro", async () => {
    const [observation] = await run(mainFile(studentSuite), [{ id: "u", kind: "unittest", test_class: "NaoExiste" }])
    expect(observation).toMatchObject({ ok: false })
  })

  it("o harness e o projeto: harness somente leitura, sem arquivo de sondas; o projeto aceita arquivos", async () => {
    const code = "import os\ntry:\n    open('/harness/harness.py', 'a').write('x')\n    harness = 'gravou'\nexcept Exception as e:\n    harness = type(e).__name__\nsondas = os.path.exists('/harness/probes.json')\nopen('dados.txt', 'w').write('ok')\ndados = open('dados.txt').read()\n"
    const [observation] = await run(mainFile(code), [{ id: "g", kind: "globals", names: ["harness", "dados", "sondas"] }])
    expect(observation?.values?.sondas).toBe(false)
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

describe("parseObservations", () => {
  const nonce = "a".repeat(32)
  const line = (body: object): string => `${nonce} ${JSON.stringify(body)}`

  it("ignora linhas sem o nonce e linhas corrompidas", () => {
    const stdout = [JSON.stringify({ id: "p0", ok: true }), `${nonce} {quebrado`, line({ id: "p1", ok: true })].join("\n")
    const observations = parseObservations(stdout, nonce)
    expect([...observations.keys()]).toEqual(["p1"])
  })

  it("descarta a sonda quando aparece uma segunda observação com o mesmo id (nonce vazado)", () => {
    const stdout = [line({ id: "p0", ok: true, legacy: { testsRun: 1, failures: 0, errors: 0, details: [] } }), line({ id: "p0", ok: true })].join("\n")
    expect(parseObservations(stdout, nonce).get("p0")).toMatchObject({ ok: false, error: expect.stringContaining("duplicada") })
  })
})
