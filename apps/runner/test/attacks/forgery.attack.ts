/**
 * Classe 2 (forja de veredito) no nível das OBSERVAÇÕES: o que o host recebe
 * quando o aluno devolve objetos hostis, troca builtins, mexe na saída padrão,
 * mata o processo no meio, finge tipos de exceção ou descobre o nonce numa
 * instância compartilhada. O veredito em si é testado na API
 * (`apps/api/test/security/grading-forgery.e2e.ts`).
 */
import { describe, expect, it } from "vitest"
import { ATTACKER_PRELUDE, createSandbox, exprProbe, globalsProbe, isPythonAvailable, mainFile, runOne, runProbe, runProbes } from "./support"

const sandbox = createSandbox()

describe.skipIf(!isPythonAvailable)("forja: valores hostis viram o valor REAL da classe base", () => {
  it("subclasses com __eq__/__hash__/__repr__/__iter__/__len__/__class__ mentirosos", async () => {
    const code = String.raw`
class Int(int):
    def __eq__(self, outro): return True
    __hash__ = int.__hash__
    def __repr__(self): return '42'
    def __index__(self): return 42
class Str(str):
    def __eq__(self, outro): return True
    def __str__(self): return 'forjado'
    def __len__(self): return 0
class Lista(list):
    def __iter__(self): return iter(['forjado'])
    def __len__(self): return 1
    def __getitem__(self, i): return 'forjado'
class Dic(dict):
    def items(self): return [('forjado', 1)]
    def keys(self): return ['forjado']
    def __iter__(self): return iter(['forjado'])
class Mentiroso:
    __class__ = int
    def __eq__(self, outro): return True
    def __repr__(self): return '42'
class Meta(type):
    def __instancecheck__(cls, obj): return True
    def __eq__(cls, outro): return True
    __hash__ = type.__hash__
class Fantasma(metaclass=Meta):
    pass
`
    const [integer, text, list, dict, liar, ghost] = await runProbes(sandbox, mainFile(code), [
      exprProbe("Int(7)", "", "a"),
      exprProbe("Str('real')", "", "b"),
      exprProbe("Lista([1, 2])", "", "c"),
      exprProbe("Dic({'k': 2})", "", "d"),
      exprProbe("Mentiroso()", "", "e"),
      exprProbe("Fantasma()", "", "f"),
    ])
    expect(integer).toMatchObject({ value: 7, type: "__main__.Int" })
    expect(text).toMatchObject({ value: "real", type: "__main__.Str" })
    expect(list).toMatchObject({ value: [1, 2], type: "__main__.Lista" })
    expect(dict).toMatchObject({ value: { k: 2 }, type: "__main__.Dic" })
    // __class__ mentiroso engana isinstance(), não type(): o tipo é a classe real e o valor vira $repr.
    expect(liar?.type).toBe("__main__.Mentiroso")
    expect(liar?.value).toEqual({ $repr: "42" })
    expect(ghost?.type).toBe("__main__.Fantasma")
  })

  it("bool × int, NaN, ±inf, -0.0, inteiros enormes, recursivos e geradores sem fim", async () => {
    const code = "import itertools\nciclo = {}\nciclo['eu'] = ciclo\ndef sem_fim():\n    while True:\n        yield 1\n"
    const observations = await runProbes(sandbox, mainFile(code), [
      exprProbe("True", "", "a"), exprProbe("1", "", "b"), exprProbe("float('nan')", "", "c"),
      exprProbe("float('-inf')", "", "d"), exprProbe("-0.0", "", "e"), exprProbe("2 ** 64", "", "f"),
      exprProbe("ciclo", "", "g"), exprProbe("sem_fim()", "", "h"), exprProbe("itertools.count()", "", "i"),
    ])
    const [bool, int, nan, inf, negZero, big, cyclic, generator, counter] = observations
    expect(bool).toMatchObject({ value: true, type: "bool" })
    expect(int).toMatchObject({ value: 1, type: "int" })
    expect(nan?.value).toEqual({ $float: "nan" })
    expect(inf?.value).toEqual({ $float: "-inf" })
    expect(negZero).toMatchObject({ type: "float" })
    expect(big?.value).toEqual({ $int: "18446744073709551616" })
    expect(cyclic?.truncated).toBe(true)
    expect(generator?.type).toBe("generator")
    expect(generator?.value).toMatchObject({ $repr: expect.stringContaining("generator") as unknown })
    expect(counter?.type).toBe("itertools.count")
  })
})

describe.skipIf(!isPythonAvailable)("forja: exceções e tipos fingidos", () => {
  it("classe chamada ValueError, __qualname__/__module__ adulterados e __str__ hostil não viram o embutido", async () => {
    const code = String.raw`
class ValueError(Exception):
    pass
class Disfarce(Exception):
    pass
Disfarce.__qualname__ = 'ValueError'
Disfarce.__module__ = 'builtins'
class Hostil(Exception):
    def __str__(self): raise RuntimeError('não')
    @property
    def args(self): raise RuntimeError('não')
def a(): raise ValueError('x')
def b(): raise Disfarce('y')
def c(): raise Hostil()
`
    const [shadow, disguised, hostile] = await runProbes(sandbox, mainFile(code), [exprProbe("a()", "", "a"), exprProbe("b()", "", "b"), exprProbe("c()", "", "c")])
    expect(shadow?.raised?.type).toBe("__main__.ValueError")
    expect(shadow?.raised?.mro).not.toContain("ValueError")
    expect(disguised?.raised?.type).toBe("builtins.ValueError")
    expect(disguised?.raised?.mro).not.toContain("ValueError")
    expect(hostile?.raised?.message).toBe("<mensagem ilegível>")
  })

  it("SystemExit, KeyboardInterrupt, GeneratorExit e BaseException na sonda viram exceção observada", async () => {
    const code = "def sai(e):\n    raise e\n"
    const observations = await runProbes(sandbox, mainFile(code), [
      exprProbe("sai(SystemExit(0))", "", "a"), exprProbe("sai(KeyboardInterrupt())", "", "b"),
      exprProbe("sai(GeneratorExit())", "", "c"), exprProbe("sai(BaseException('b'))", "", "d"),
      exprProbe("1 + 1", "", "z"),
    ])
    expect(observations.map((observation) => observation.raised?.type)).toEqual(["SystemExit", "KeyboardInterrupt", "GeneratorExit", "BaseException", undefined])
    // A sonda seguinte continua íntegra.
    expect(observations[4]).toMatchObject({ ok: true, value: 2 })
  })
})

describe.skipIf(!isPythonAvailable)("forja: saída padrão e processo", () => {
  it("linhas falsas sem o nonce, escrita direta no fd 1, troca e fechamento do sys.stdout não forjam", async () => {
    const fake = "import json, os, sys\nfalso = json.dumps({'id': 'p0', 'ok': True, 'value': 42})\n"
    const variants = [
      `${fake}print(falso)\nprint('0' * 32 + ' ' + falso)`,
      `${fake}os.write(1, ('\\n' + falso + '\\n').encode())`,
      `${fake}sys.stdout = sys.__stdout__\nprint('f' * 32 + ' ' + falso)`,
      `${fake}sys.__stdout__.close()\nsys.stdout.close()`,
      `${fake}os.close(1)`,
    ]
    for (const code of variants) {
      const observation = await runOne(sandbox, mainFile(code, "def f():\n    return 1"), { id: "c", kind: "call", function: "f", args: [], kwargs: {} })
      expect(observation.value).not.toBe(42)
    }
  })

  it("os._exit no meio do lote só tira observações (viram falha), nunca aprova", async () => {
    const code = "import os\ndef f(x):\n    if x == 2:\n        os._exit(0)\n    return x\n"
    const observations = await runProbes(sandbox, mainFile(code), [1, 2, 3].map((value, index) => ({ id: `c${index}`, kind: "call", function: "f", args: [value], kwargs: {} })))
    expect(observations.map((observation) => observation.ok)).toEqual([true, false, false])
    expect(observations[1]?.error).toBeDefined()
  })

  it("LIMITE DOCUMENTADO: numa instância compartilhada o aluno acha o nonce e escreve a observação que quiser", async () => {
    // Fora do modo estrito os frames não são bloqueados: quem descobre o nonce controla
    // a observação — o mesmo poder de "devolver o valor que quiser". A API só aprova se o
    // valor forjado for o ESPERADO, que nunca entra no sandbox (ver grading-forgery.e2e.ts).
    const code = [
      ...ATTACKER_PRELUDE,
      "import json",
      "def f():",
      "    sobe(sys._getframe())",
      "    for nonce in achados:",
      "        os.write(1, ('\\n' + nonce + ' ' + json.dumps({'id': 'p0', 'ok': True, 'value': 42, 'type': 'int'}) + '\\n').encode())",
      "    os._exit(0)",
    ].join("\n")
    const observation = await runOne(sandbox, mainFile(code), { id: "c", kind: "call", function: "f", args: [], kwargs: {} })
    expect(observation).toMatchObject({ ok: true, value: 42 })
  })
})

describe.skipIf(!isPythonAvailable)("forja: estado entre sondas da mesma instância", () => {
  it("builtins, módulos novos, sys.path, recursão, cwd e arquivos voltam ao estado inicial", async () => {
    const code = String.raw`
import builtins, sys, os, json
contagem = getattr(builtins, 'contagem', 0) + 1
builtins.contagem = contagem
builtins.len = lambda x: 99
sys.modules['falso'] = type(sys)('falso')
sys.path.insert(0, '/tmp')
sys.setrecursionlimit(50)
os.makedirs('sub', exist_ok=True)
open('rastro.txt', 'a').write('x')
os.chdir('sub')
json.marca = getattr(json, 'marca', 0) + 1
`
    const [first, second] = await runProbes(sandbox, mainFile(code), [
      exprProbe("(contagem, len([1]), 'falso' in sys.modules, sys.path[0], sys.getrecursionlimit() > 50, open('../rastro.txt').read())", "", "a"),
      exprProbe("(contagem, len([1]), sys.path[:2], os.getcwd(), open('/work/rastro.txt').read(), json.marca)", "", "b"),
    ])
    expect(first?.value).toEqual([1, 99, true, "/tmp", false, "x"])
    expect(second?.value).toEqual([1, 99, ["/tmp", "/work"], "/work/sub", "x", 2])
  })
})

describe.skipIf(!isPythonAvailable)("forja: regras de estrutura (AST)", () => {
  it("apelidos e busca dinâmica aparecem nas construções (nomes citados e 'dynamic')", async () => {
    const code = String.raw`
import builtins
maior = max
def a(x):
    return maior(x)
def b(x):
    return getattr(builtins, 'm' + 'ax')(x)
def c(xs):
    exec('for x in xs: pass')
    lista = []
    junta = lista.append
    junta(1)
`
    const observation = await runOne(sandbox, mainFile(code), { id: "a", kind: "ast" })
    const features = observation.features
    expect(features?.calls).not.toContain("max")
    expect(features?.names).toEqual(expect.arrayContaining(["max", "append", "getattr", "exec", "builtins"]))
    expect(features?.dynamic).toEqual(expect.arrayContaining(["getattr", "exec", "builtins"]))
    expect(features?.constructs).not.toContain("for")
  })

  it("código morto satisfaz regra positiva (limite documentado: a AST não executa)", async () => {
    const observation = await runOne(sandbox, mainFile("if False:\n    for _ in []:\n        lambda: 0\n"), { id: "a", kind: "ast" })
    expect(observation.features?.constructs).toEqual(expect.arrayContaining(["for", "lambda"]))
  })

  it("o código do aluno não roda na análise (não forja construções)", async () => {
    const code = "import ast\ndef falso(t):\n    return [ast.Lambda(args=None, body=None)]\nast.walk = falso\nraise SystemExit"
    const observation = await runOne(sandbox, mainFile(code), { id: "a", kind: "ast" })
    expect(observation.features?.constructs).not.toContain("lambda")
  })
})

describe.skipIf(!isPythonAvailable)("forja: builtins trocados afetam só o próprio caso", () => {
  it("isinstance/type/len/print/open/range/sorted trocados mudam o que a expressão do professor vê", async () => {
    const code = String.raw`
import builtins
builtins.isinstance = lambda *a: True
builtins.issubclass = lambda *a: True
builtins.len = lambda x: 3
builtins.sorted = lambda x, **k: [1, 2, 3]
builtins.range = lambda *a: [7]
builtins.print = lambda *a, **k: None
`
    const observation = await runOne(sandbox, mainFile(code), exprProbe("(isinstance(1, str), issubclass(int, str), len([]), sorted([3]), list(range(5)), type(1).__name__)"))
    // Limite documentado: o professor recebe o que o aluno quis. Só aprova se coincidir
    // com o esperado — que o aluno precisaria conhecer (ver grading-forgery.e2e.ts).
    expect(observation.value).toEqual([true, true, 3, [1, 2, 3], [7], "int"])
    // ...e a serialização do harness não é afetada (usa referências capturadas).
    const honest = await runOne(sandbox, mainFile(code), globalsProbe("builtins"))
    expect(honest.ok).toBe(true)
  })

  it("rodar o programa com stdin: o aluno só controla a própria saída", async () => {
    const observation = await runOne(sandbox, mainFile("import sys\nprint(sys.stdin.read().upper())"), runProbe("abc"))
    expect(observation).toMatchObject({ ok: true, stdout: "ABC\n" })
  })
})
