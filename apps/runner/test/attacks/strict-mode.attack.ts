/**
 * Classe 2 (forja de veredito), modo estrito: as instâncias `unittest`/`legacy`
 * produzem um veredito que nasce DENTRO do sandbox (contagens), então o aluno
 * não pode alcançar o nonce nem o escritor de observações. Cada rota conhecida
 * até um frame do harness, ao gc ou a módulos de teste da C-API é tentada; o
 * relatório volta pela mensagem de um assert legado.
 */
import { describe, expect, it } from "vitest"
import { ATTACKER_PRELUDE, createSandbox, isPythonAvailable, mainFile, reportOf, reportProbe, runOne } from "./support"

const sandbox = createSandbox()

/** Rotas até frames (o f_back de qualquer frame leva a `_run_harness`, onde mora o nonce). */
const FRAME_ROUTES = String.raw`
import inspect, traceback, signal, types, importlib, importlib.machinery, importlib.util
tenta('sys._getframe', lambda: sobe(sys._getframe()))
tenta('sys._current_frames', lambda: [sobe(f) for f in sys._current_frames().values()])
tenta('inspect.currentframe', lambda: sobe(inspect.currentframe()))
tenta('inspect.stack', lambda: inspect.stack())
tenta('traceback.walk_stack', lambda: [sobe(f) for f, _ in traceback.walk_stack(None)])
def erro_com_traceback():
    try:
        raise ValueError('x')
    except ValueError as erro:
        return erro.__traceback__
tenta('tb_frame', lambda: sobe(erro_com_traceback().tb_frame))
tenta('tb_frame via descritor', lambda: sobe(types.TracebackType.__dict__['tb_frame'].__get__(erro_com_traceback())))
tenta('tb_frame via object.__getattribute__', lambda: sobe(object.__getattribute__(erro_com_traceback(), 'tb_frame')))
tenta('traceback.extract_tb', lambda: traceback.extract_tb(erro_com_traceback()))
def gerador():
    yield 1
tenta('gi_frame', lambda: sobe(gerador().gi_frame))
async def corrotina():
    return 1
tenta('cr_frame', lambda: sobe(corrotina().cr_frame))
async def assincrono():
    yield 1
tenta('ag_frame', lambda: sobe(assincrono().ag_frame))
tenta('inspect.getgeneratorlocals', lambda: inspect.getgeneratorlocals(gerador()))
frames_do_sinal = []
tenta('signal.signal', lambda: (signal.signal(signal.SIGINT, lambda n, f: frames_do_sinal.append(f)), signal.raise_signal(signal.SIGINT), [sobe(f) for f in frames_do_sinal]))
def via_signal_cru():
    import _signal
    _signal.signal(2, lambda n, f: frames_do_sinal.append(f))
    _signal.raise_signal(2)
    return [sobe(f) for f in frames_do_sinal]
tenta('_signal.signal', via_signal_cru)
tenta('_signal recriado', lambda: sys.modules['_imp'].create_builtin(importlib.machinery.ModuleSpec('_signal', None)))
def via_lixo_do_gc(preparo=None):
    if preparo:
        preparo()
    def vitima():
        try:
            raise ValueError('x')
        except ValueError as erro:
            guardado = erro
    vitima()
    gc.set_debug(gc.DEBUG_SAVEALL)
    gc.collect()
    return [sobe(o) for o in gc.garbage if type(o).__name__ == 'frame']
tenta('gc.DEBUG_SAVEALL', via_lixo_do_gc)
tenta('gc recarregado', lambda: via_lixo_do_gc(lambda: importlib.reload(gc)))
def gc_reimportado():
    del sys.modules['gc']
    novo = importlib.import_module('gc')
    novo.set_debug(novo.DEBUG_SAVEALL)
tenta('gc reimportado', gc_reimportado)
tenta('gc recriado (create_builtin)', lambda: sys.modules['_imp'].create_builtin(importlib.machinery.ModuleSpec('gc', None)).set_debug(32))
tenta('gc reexecutado (exec_builtin)', lambda: (sys.modules['_imp'].exec_builtin(gc), gc.set_debug(gc.DEBUG_SAVEALL)))
tenta('gc.set_debug fechado', lambda: [c.cell_contents for c in (gc.set_debug.__closure__ or ())])
tenta('gc.get_objects', lambda: [o for o in gc.get_objects() if type(o).__name__ == 'frame'])
tenta('gc.get_referrers', lambda: gc.get_referrers(sys.modules))
tenta('gc.get_referents', lambda: gc.get_referents(sys.modules))
tenta('sys.settrace', lambda: sys.settrace(lambda f, e, a: sobe(f)))
tenta('sys.setprofile', lambda: sys.setprofile(lambda f, e, a: sobe(f)))
import threading
frames_do_trace = []
def rastreador(f, e, a):
    frames_do_trace.append(f)
    return rastreador
def via_threading():
    threading.settrace_all_threads(rastreador)
    (lambda: 1)()
    [sobe(f) for f in frames_do_trace]
    rotas['frames via threading'] = len(frames_do_trace)
tenta('threading.settrace_all_threads', via_threading)
tenta('sys.monitoring', lambda: (sys.monitoring.use_tool_id(3, 'x'), sys.monitoring.register_callback(3, sys.monitoring.events.PY_START, lambda *a: None)))
tenta('__code__', lambda: (lambda: 0).__code__)
`

/** Rotas até código nativo de teste (`_testcapi` & cia. devolvem frames e lêem memória). */
const NATIVE_ROUTES = String.raw`
import importlib, importlib.machinery, importlib.util
tenta('import _ctypes', lambda: __import__('_ctypes'))
for nome in ['_testcapi', '_testinternalcapi', '_testlimitedcapi', '_testbuffer', '_xxtestfuzz']:
    tenta('import ' + nome, lambda nome=nome: __import__(nome))
    tenta('import_module ' + nome, lambda nome=nome: importlib.import_module(nome))
    tenta('create_builtin ' + nome, lambda nome=nome: sys.modules['_imp'].create_builtin(importlib.machinery.ModuleSpec(nome, None)))
    tenta('module_from_spec ' + nome, lambda nome=nome: importlib.util.module_from_spec(importlib.machinery.ModuleSpec(nome, importlib.machinery.BuiltinImporter)))
fechado = [c.cell_contents for c in (sys.modules['_imp'].create_builtin.__closure__ or ())]
rotas['fecho de _imp.create_builtin'] = repr(fechado)
`

/**
 * Varredura de tudo que é alcançável por atributos públicos a partir de
 * sys.modules, builtins e de todas as classes vivas (object.__subclasses__):
 * dicionários de módulos e classes, fechos de funções (inclusive as que o
 * harness instala), métodos ligados e coleções. Procura o nonce em cada texto.
 */
const REACHABILITY_SCAN = String.raw`
def varre(limite=150000):
    vistos, fila = set(), list(sys.modules.values()) + [builtins]
    pilha = [object]
    while pilha:
        classe = pilha.pop()
        fila.append(classe)
        try:
            pilha.extend(type.__subclasses__(classe))
        except BaseException:
            pass
    textos = 0
    while fila and len(vistos) < limite:
        atual = fila.pop()
        if id(atual) in vistos:
            continue
        vistos.add(id(atual))
        if type(atual) is str:
            textos += 1
            if len(atual) == 32:
                procura(atual)
            continue
        vizinhos = []
        try:
            if isinstance(atual, dict) or type(atual).__name__ == 'mappingproxy':
                vizinhos += list(atual.keys()) + list(atual.values())
            elif isinstance(atual, (list, tuple, set, frozenset)):
                vizinhos += list(atual)
            for nome in ('__dict__', '__closure__', '__wrapped__', '__func__', '__self__', '__defaults__', '__kwdefaults__'):
                try:
                    vizinhos.append(object.__getattribute__(atual, nome))
                except BaseException:
                    pass
            if type(atual).__name__ == 'cell':
                vizinhos.append(atual.cell_contents)
        except BaseException:
            pass
        fila.extend(vizinhos)
    return len(vistos), textos
tenta('varredura', lambda: rotas.__setitem__('alcançados', varre()))
`

const ROUTE_REPORT = "repr(sorted(rotas.items())) + ' achados=' + str(len(achados))"

describe.skipIf(!isPythonAvailable)("modo estrito: rotas até o nonce", () => {
  it("frames: getframe, tracebacks, geradores, sinais, lixo do gc e trace/monitoring estão fechados", async () => {
    const code = [...ATTACKER_PRELUDE, FRAME_ROUTES].join("\n")
    const report = reportOf(await runOne(sandbox, mainFile(code), reportProbe(ROUTE_REPORT)))
    expect(report).toContain("achados=0")
    const routes = [
      "sys._getframe", "sys._current_frames", "inspect.currentframe", "inspect.stack", "traceback.walk_stack", "tb_frame",
      "tb_frame via descritor", "tb_frame via object.__getattribute__", "traceback.extract_tb", "gi_frame", "cr_frame",
      "ag_frame", "inspect.getgeneratorlocals", "signal.signal", "_signal.signal", "gc.DEBUG_SAVEALL", "gc recarregado",
      "gc.get_objects", "gc.get_referrers", "gc.get_referents", "sys.settrace", "sys.setprofile",
      "sys.monitoring", "__code__",
    ]
    for (const route of routes) expect(report).toContain(`('${route}', 'RuntimeError')`)
    // Sem threads no WASI: o gancho só valeria para threads novas, que não existem.
    expect(report).toMatch(/\('threading.settrace_all_threads', '(RuntimeError|ok)'\)/)
    expect(report).not.toMatch(/'frames via threading', [1-9]/)
    // Recriar gc/_signal devolveria as funções originais: recusado.
    expect(report).toContain("('gc recriado (create_builtin)', 'ImportError')")
    expect(report).toContain("('_signal recriado', 'ImportError')")
    // Reimportar/reexecutar o gc devolve o MESMO set_debug protegido (ou falha ao recriar).
    expect(report).toMatch(/\('gc reimportado', '(RuntimeError|ImportError|ModuleNotFoundError)'\)/)
    expect(report).toContain("('gc reexecutado (exec_builtin)', 'RuntimeError')")
    // As substitutas não guardam a original no fecho.
    expect(report).toContain("('gc.set_debug fechado', 'ok')")
  })

  it("módulos de teste da C-API e _ctypes não carregam por nenhum caminho de importação", async () => {
    const code = [...ATTACKER_PRELUDE, NATIVE_ROUTES].join("\n")
    const report = reportOf(await runOne(sandbox, mainFile(code), reportProbe("repr(sorted(rotas.items()))")))
    for (const name of ["_testcapi", "_testinternalcapi", "_testlimitedcapi", "_testbuffer", "_xxtestfuzz"]) {
      for (const route of ["import", "import_module", "create_builtin", "module_from_spec"]) {
        expect(report).toMatch(new RegExp(String.raw`\('${route} ${name}', '(ImportError|ModuleNotFoundError)'\)`))
      }
    }
    expect(report).toMatch(/\('import _ctypes', '(ImportError|ModuleNotFoundError)'\)/)
    // `_imp` continua importável (já está em sys.modules), mas create_builtin é o
    // invólucro do harness, cujo fecho só tem sys.audit (o original fica no hook).
    expect(report).toContain("('fecho de _imp.create_builtin', '[<built-in function audit>]')")
  })

  it("nada alcançável por atributos (módulos, classes, fechos do harness) contém o nonce", async () => {
    const code = [...ATTACKER_PRELUDE, REACHABILITY_SCAN].join("\n")
    const report = reportOf(await runOne(sandbox, mainFile(code), reportProbe(ROUTE_REPORT), { timeoutMs: 20_000, memoryMb: 256 }))
    expect(report).toContain("('varredura', 'ok')")
    expect(report).toContain("achados=0")
    // A varredura foi de verdade (dezenas de milhares de objetos).
    const reached = /'alcançados', \((\d+), (\d+)\)/.exec(report)
    expect(Number(reached?.[1])).toBeGreaterThan(10_000)
  })

  it("unittest: com todas as rotas, a observação forjada (run=999) não chega ao host", async () => {
    const forger = [
      ...ATTACKER_PRELUDE,
      FRAME_ROUTES,
      "import unittest, json",
      "class TestForja(unittest.TestCase):",
      "    def test_forja(self):",
      "        falso = json.dumps({'id': 'p0', 'ok': True, 'tests': {'run': 999, 'failures': 0, 'errors': 0, 'skipped': 0, 'failed': []}})",
      "        for nonce in achados or ['0' * 32]:",
      "            os.write(1, ('\\n' + nonce + ' ' + falso + '\\n').encode())",
      "        if achados:",
      "            os._exit(0)",
    ].join("\n")
    const observation = await runOne(sandbox, mainFile(forger), { id: "u", kind: "unittest", target: "f", implementation: "def f():\n    return 1\n" })
    expect(observation.tests?.run).not.toBe(999)
    expect(observation.error ?? "").not.toContain("duplicada")
    expect(observation.tests?.run).toBe(1)
  })

  it("um audit hook do aluno não vê o código nem o exec da implementação do professor", async () => {
    const code = [
      "import sys, unittest",
      "vistos = []",
      "def gancho(evento, args):",
      "    if evento in ('exec', 'compile'):",
      "        vistos.append(evento)",
      "sys.addaudithook(gancho)",
      "class T(unittest.TestCase):",
      "    def test_relata(self):",
      "        self.assertEqual(vistos, [])",
    ].join("\n")
    const observation = await runOne(sandbox, mainFile(code), { id: "u", kind: "unittest", target: "f", implementation: "def f():\n    return 1\n" })
    expect(observation.tests).toMatchObject({ run: 1, failures: 0, errors: 0 })
  })
})
