/**
 * Suíte adversarial do motor python-dados (Pyodide em workers do Node). O código do aluno
 * roda DENTRO do worker, então os ataques visam sair do interpretador para o host (JS,
 * rede, processo, `ctypes`/`emscripten_run_script`), ler o nonce do harness, gravar fora de
 * `/work` e, na política `reuse`, contaminar o lote seguinte. Os ataques devem FALHAR (ser
 * bloqueados); o que passa está documentado como resíduo em docs/v2/seguranca.md.
 *
 * Roda com a distribuição de `PYODIDE_DIR`; sem ela a suíte é pulada (no CI é instalada).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { PyodideEngine } from "../../src/pyodide-engine"
import { createPyodideEngine, exprProbe, globalsProbe, isBlocked, isPyodideAvailable, mainFile, reportOf, reportProbe, runOne, runProbes, tryAll } from "../pyodide-support"

const SLOW_LIMITS = { timeoutMs: 8_000, memoryMb: 128 }

/** Roda `tryAll` num lote `dados` e devolve o dicionário `resultados`. */
async function attempt(engine: PyodideEngine, attempts: Record<string, string>, prelude?: string[]): Promise<Record<string, string>> {
  const observation = await runOne(engine, mainFile(...tryAll(attempts, prelude)), globalsProbe("resultados"), SLOW_LIMITS)
  expect(observation.ok, JSON.stringify(observation)).toBe(true)
  return (observation.values?.resultados ?? {}) as Record<string, string>
}

describe.skipIf(!isPyodideAvailable)("Pyodide: fuga para o JavaScript e o host", () => {
  let engine: PyodideEngine
  beforeAll(async () => {
    engine = createPyodideEngine({ warm: { dados: 1, ml: 0 } })
    await engine.start()
  })
  afterAll(() => engine.shutdown())

  it("import js e import pyodide_js estão bloqueados por qualquer caminho", async () => {
    const results = await attempt(engine, {
      import_js: "__import__('js')",
      from_js: "__import__('builtins').__import__('js')",
      import_pyodide_js: "__import__('pyodide_js')",
      pyodide_js_api: "__import__('pyodide_js._api', fromlist=['config'])",
      importlib_js: "__import__('importlib').import_module('js')",
      register: "__import__('pyodide').ffi.register_js_module('x', object())",
    })
    for (const [name, result] of Object.entries(results)) expect(isBlocked(result), `${name}: ${result}`).toBe(true)
  })

  it("nenhuma fábrica de JsProxy sobrou (to_js, create_proxy, run_js, run_sync)", async () => {
    const results = await attempt(engine, {
      to_js: "__import__('pyodide').ffi.to_js([1])",
      create_proxy: "__import__('pyodide').ffi.create_proxy(object())",
      run_js: "__import__('pyodide').code.run_js('globalThis')",
      run_sync: "__import__('pyodide').ffi.run_sync",
      core_to_js: "__import__('_pyodide_core').to_js",
    })
    for (const [name, result] of Object.entries(results)) expect(isBlocked(result), `${name}: ${result}`).toBe(true)
  })

  it("não há JsProxy alcançável por varredura do gc (que daria .constructor → Function do host)", async () => {
    const observation = await runOne(engine, mainFile(
      "import gc",
      "from pyodide.ffi import JsProxy",
      "achados = []",
      "for obj in gc.get_objects():",
      "    if isinstance(obj, JsProxy):",
      "        achados.append(type(obj).__name__)",
      "    elif type(obj) is dict:",
      "        achados.extend('dict:' + repr(k)[:40] for k, v in list(obj.items()) if isinstance(v, JsProxy))",
      "total = len(achados)",
    ), globalsProbe("total", "achados"), SLOW_LIMITS)
    expect(observation).toMatchObject({ ok: true, values: { total: 0 } })
  })

  it("globalThis/process/require/fetch e geração de código do host não são alcançáveis via ctypes", async () => {
    const results = await attempt(engine, {
      ctypes: "__import__('ctypes')",
      _ctypes: "__import__('_ctypes')",
      cdll: "__import__('ctypes').CDLL(None)",
      run_script: "__import__('ctypes').CDLL(None).emscripten_run_script(b'globalThis.PWNED = 1')",
    })
    for (const [name, result] of Object.entries(results)) expect(isBlocked(result), `${name}: ${result}`).toBe(true)
    // E o canário do JS: se algo tivesse rodado no host, PWNED existiria.
    const canary = await runOne(engine, mainFile("x = 1"), globalsProbe("x"))
    expect(canary.ok).toBe(true)
  })

  it("sem egresso de rede, subprocessos, fork ou threads (os stubs do Emscripten não executam nada)", async () => {
    const results = await attempt(engine, {
      conexao: "__import__('socket').create_connection(('1.1.1.1', 80), timeout=1)",
      urllib: "__import__('urllib.request', fromlist=['urlopen']).urlopen('http://example.com', timeout=1)",
      subprocess: "__import__('subprocess').run(['ls'])",
      popen: "__import__('os').popen('ls').read()",
      fork: "__import__('os').fork()",
      thread: "__import__('threading').Thread(target=lambda: None).start()",
    })
    for (const [name, result] of Object.entries(results)) expect(isBlocked(result), `${name}: ${result}`).toBe(true)
  })
})

describe.skipIf(!isPyodideAvailable)("Pyodide: sistema de arquivos e nonce", () => {
  let engine: PyodideEngine
  beforeAll(async () => {
    engine = createPyodideEngine({ warm: { dados: 1, ml: 0 } })
    await engine.start()
  })
  afterAll(() => engine.shutdown())

  // Escrever + fechar (o flush do MEMFS é que recusa; o buffer de append descarta os dados).
  const writeThenClose = (path: string): string => `(lambda h: (h.write('x'), h.flush(), h.close()))(open(${JSON.stringify(path)}, 'a'))`

  it("o harness é somente leitura (escrever/flush, chmod, renomear, apagar falham); segue legível", async () => {
    const results = await attempt(engine, {
      escrita: writeThenClose("/harness/harness.py"),
      chmod_escrita: `(__import__('os').chmod('/harness/harness.py', 0o777), ${writeThenClose("/harness/harness.py")})`,
      novo: "open('/harness/evil.py', 'w').write('x')",
      apaga: "__import__('os').remove('/harness/harness.py')",
      renomeia: "__import__('os').rename('/harness/harness.py', '/harness/outro.py')",
      leitura: "len(open('/harness/harness.py').read())",
    })
    for (const name of ["escrita", "chmod_escrita", "novo", "apaga", "renomeia"]) expect(isBlocked(results[name]), `${name}: ${results[name]}`).toBe(true)
    expect(results.leitura).toMatch(/^ok:\d+/)
  })

  it("a stdlib e os site-packages são somente leitura (não dá para trocar numpy/__init__.py)", async () => {
    const results = await attempt(engine, {
      stdlib: writeThenClose("/lib/python3.14/site-packages/numpy/__init__.py"),
      stdlib_w: "open('/lib/python3.14/site-packages/numpy/__init__.py', 'w').write('x')",
      novo_pacote: "open('/lib/python3.14/site-packages/evil.py', 'w').write('x')",
      mkdir: "__import__('os').mkdir('/lib/python3.14/site-packages/evil')",
      json: writeThenClose("/lib/python314.zip"),
    })
    for (const [name, result] of Object.entries(results)) expect(isBlocked(result), `${name}: ${result}`).toBe(true)
    expect(await runOne(engine, mainFile("import numpy as np", "ok = float(np.mean([2, 4]))"), globalsProbe("ok"))).toMatchObject({ ok: true, values: { ok: 3 } })
  })

  it("escrever em /work, /tmp e /home é permitido (o aluno precisa de arquivos de trabalho)", async () => {
    const results = await attempt(engine, {
      work: "open('saida.txt', 'w').write('ok')",
      tmp: "open('/tmp/saida.txt', 'w').write('ok')",
      home: "open('/home/pyodide/x.txt', 'w').write('ok')",
    })
    for (const [name, result] of Object.entries(results)) expect(result.startsWith("ok:"), `${name}: ${result}`).toBe(true)
  })

  it("nonce e lote: sem probes.json, sem nonce em argv/ambiente/stdin e o modo estrito fecha frames/gc", async () => {
    const results = await attempt(engine, {
      argv: "(__import__('sys').argv, getattr(__import__('sys'), 'orig_argv', None))",
      ambiente: "dict(__import__('os').environ)",
      stdin: "__import__('os').read(0, 100000)",
      harness_dir: "__import__('os').listdir('/harness')",
    }, ["import sys, os"])
    expect(results.ambiente).toBe("ok:{}")
    expect(results.harness_dir).toBe("ok:['harness.py']")
    expect(results.stdin).toMatch(/^ok:b''|OSError|ValueError/)

    // Modo estrito (sonda legacy): as rotas até um frame do harness ficam fechadas.
    const strict = await runOne(engine, mainFile(
      "import sys, gc",
      "rotas = {}",
      "def tenta(nome, acao):",
      "    try:",
      "        acao(); rotas[nome] = 'ok'",
      "    except BaseException as erro:",
      "        rotas[nome] = type(erro).__name__",
      "tenta('getframe', lambda: sys._getframe().f_back)",
      "tenta('gc_objects', lambda: gc.get_objects())",
      "tenta('settrace', lambda: sys.settrace(lambda *a: None))",
      "tenta('audithook', lambda: sys.addaudithook(lambda *a: None))",
    ), reportProbe("repr(sorted(rotas.items()))"), SLOW_LIMITS)
    const report = reportOf(strict)
    expect(report).toContain("('getframe', 'RuntimeError')")
    expect(report).toContain("('gc_objects', 'RuntimeError')")
    expect(report).toContain("('settrace', 'RuntimeError')")
  })
})

describe.skipIf(!isPyodideAvailable)("Pyodide: recursos", () => {
  let engine: PyodideEngine
  beforeAll(async () => {
    engine = createPyodideEngine({ warm: { dados: 1, ml: 0 }, maxJobDiskBytes: 4 * 1024 * 1024 })
    await engine.start()
  })
  afterAll(() => engine.shutdown())

  it("laço infinito é interrompido no tempo limite e o serviço continua", async () => {
    const observation = await runOne(engine, mainFile("while True:\n    pass"), exprProbe("1"), { timeoutMs: 1_200, memoryMb: 64 })
    expect(observation).toMatchObject({ ok: false, timedOut: true })
    expect(await runOne(engine, mainFile("x = 7"), globalsProbe("x"))).toMatchObject({ ok: true, values: { x: 7 } })
  })

  it("alocar além do teto de heap vira MemoryError, nunca crescimento sem fim", async () => {
    const observation = await runOne(engine, mainFile("resto = []", "while True:", "    resto.append(bytearray(10 ** 7))"), exprProbe("1"), SLOW_LIMITS)
    expect(observation.ok).toBe(false)
    expect(observation.error ?? "").toMatch(/MemoryError|Memória|inesperada/)
  })

  it("encher o disco de /work é cortado pela cota do lote", async () => {
    const observation = await runOne(engine, mainFile("with open('grande.bin', 'wb') as f:", "    for _ in range(100):", "        f.write(b'x' * 10 ** 6)"), exprProbe("1"), SLOW_LIMITS)
    expect(observation.ok).toBe(false)
  })

  it("inundar o stdout é cortado e não derruba o worker", async () => {
    const observations = await runProbes(engine, mainFile("for _ in range(10 ** 7):", "    print('x' * 1000)"), [{ id: "r", kind: "run", stdin: "" }, exprProbe("1 + 1", "", "e")], SLOW_LIMITS)
    const flood = observations[0]
    const after = observations[1]
    expect(flood?.ok).toBe(false)
    expect(after?.ok === false || after?.value === 2).toBe(true)
  })
})

describe.skipIf(!isPyodideAvailable)("Pyodide: contaminação entre lotes (política reuse)", () => {
  let engine: PyodideEngine
  beforeAll(async () => {
    engine = createPyodideEngine({ policy: "reuse", warm: { dados: 1, ml: 0 }, recycleAfter: 50 })
    await engine.start()
  })
  afterAll(() => engine.shutdown())

  it("um lote que adultera numpy/pandas/builtins não afeta o lote seguinte (restauração ou reciclagem)", async () => {
    const tamper = await runOne(engine, mainFile(
      "import numpy as np, pandas as pd, builtins",
      "np.mean = lambda *a, **k: 999",
      "pd.DataFrame.sum = lambda self, *a, **k: -1",
      "builtins.len = lambda x: 0",
      "np.cumsum.__doc__ = 'adulterado'",
      "resultado = float(np.mean([1, 2, 3]))",
    ), globalsProbe("resultado"))
    expect(tamper.values?.resultado).toBe(999)
    const clean = await runOne(engine, mainFile(
      "import numpy as np, pandas as pd",
      "media = float(np.mean([1, 2, 3]))",
      "soma = int(pd.DataFrame({'a': [1, 2, 3]}).sum().iloc[0])",
      "tamanho = len([1, 2, 3])",
    ), globalsProbe("media", "soma", "tamanho"))
    expect(clean).toMatchObject({ ok: true, values: { media: 2, soma: 6, tamanho: 3 } })
  })

  it("um audit hook ou trace instalado num lote não persiste para o seguinte", async () => {
    await runOne(engine, mainFile("import sys", "try:", "    sys.addaudithook(lambda e, a: None)", "except BaseException:", "    pass", "sys.settrace(lambda *a: None)"), globalsProbe("sys"))
    const observation = await runOne(engine, mainFile("import sys", "tem_trace = sys.gettrace() is not None"), globalsProbe("tem_trace"))
    expect(observation).toMatchObject({ ok: true, values: { tem_trace: false } })
  })

  it("arquivos criados em /work por um lote somem no lote seguinte", async () => {
    await runOne(engine, mainFile("open('vazou.txt', 'w').write('segredo')"), globalsProbe("open"))
    const observation = await runOne(engine, mainFile("import os", "existe = os.path.exists('vazou.txt')", "entradas = sorted(os.listdir('.'))"), globalsProbe("existe", "entradas"))
    expect(observation.values?.existe).toBe(false)
    expect(observation.values?.entradas).toEqual(["main.py"])
  })
})
