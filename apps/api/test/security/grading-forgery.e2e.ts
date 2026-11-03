/**
 * Classe 2 no nível do VEREDITO: submissões trapaceiras contra o executor real e
 * o motor de correção da API (o mesmo de produção). Cada técnica precisa ser
 * reprovada — ou, quando a garantia documentada diz que não dá para impedir,
 * o teste mostra exatamente a fronteira ("só aprova quem conhece a resposta").
 * Requer o executor no ar: RUNNER_URL (padrão http://localhost:8081) e RUNNER_TOKEN.
 */
import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import {
  DEFAULT_ENTRY_FILE, DEFAULT_RUNNER_LIMITS, testCasesSchema,
  type GradeResult, type ProjectFile, type RunnerResult, type TestCase,
} from "@levelusp/contracts"
import { buildProbes, grade } from "@/modules/grading/grading.domain"

interface SeedLesson {
  order: number
  title: string
  reference_solution: ProjectFile[]
  test_cases: TestCase[]
}

const runnerUrl = process.env.RUNNER_URL ?? "http://localhost:8081"
const runnerToken = process.env.RUNNER_TOKEN ?? ""
const HEALTH_TIMEOUT_MS = 2_000
/** Checagem síncrona (o `describe.skipIf` precisa do valor na coleta): um `node -e` faz o GET. */
function isRunnerHealthy(): boolean {
  if (runnerToken === "") return false
  const probe = `fetch(${JSON.stringify(new URL("/healthz", runnerUrl).href)}).then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))`
  return spawnSync(process.execPath, ["-e", probe], { timeout: HEALTH_TIMEOUT_MS }).status === 0
}
const isRunnerUp = isRunnerHealthy()

const seedPath = path.resolve(process.cwd(), "../../packages/db/seed/python-completo.json")
const lessons = (JSON.parse(readFileSync(seedPath, "utf8")) as { lessons: SeedLesson[] }).lessons
const lessonByOrder = (order: number): SeedLesson => {
  const lesson = lessons.find((candidate) => candidate.order === order)
  if (!lesson) throw new Error(`lição ${order} ausente do seed`)
  return lesson
}

async function gradeOnRunner(files: ProjectFile[], rawCases: TestCase[]): Promise<GradeResult> {
  const cases = testCasesSchema.parse(rawCases)
  const response = await fetch(new URL("/v1/run", runnerUrl), {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${runnerToken}` },
    body: JSON.stringify({ files, entry: DEFAULT_ENTRY_FILE, probes: buildProbes(cases), limits: DEFAULT_RUNNER_LIMITS }),
  })
  if (!response.ok) throw new Error(`executor respondeu ${response.status}`)
  const result = (await response.json()) as RunnerResult
  return grade(cases, result.observations, result.durationMs)
}

const main = (...lines: string[]): ProjectFile[] => [{ path: "main.py", content: lines.join("\n") + "\n" }]
const passedCount = (result: GradeResult): number => result.cases.filter((testCase) => testCase.passed).length

// ── Forjador universal ──────────────────────────────────────────────────────

const PYTHON_WORDS = new Set([
  "False", "None", "True", "and", "as", "assert", "async", "await", "break", "class", "continue", "def", "del", "elif", "else",
  "except", "finally", "for", "from", "global", "if", "import", "in", "is", "lambda", "nonlocal", "not", "or", "pass", "raise",
  "return", "try", "while", "with", "yield", "print", "len", "list", "dict", "set", "tuple", "str", "int", "float", "bool",
  "isinstance", "issubclass", "type", "open", "range", "sorted", "sum", "min", "max", "next", "iter", "setattr", "getattr",
  "hasattr", "repr", "abs", "round", "map", "filter", "zip", "enumerate", "any", "all", "Exception", "ValueError", "TypeError",
  "KeyError", "IndexError", "AttributeError", "ZeroDivisionError", "RuntimeError", "StopIteration", "self", "os", "sys", "json",
  "read", "write", "splitlines", "close", "path", "exists", "append", "items", "keys", "values", "split", "join", "strip", "lower", "upper",
])

/** Nomes que o enunciado revela (funções, classes, variáveis citadas pelos casos). */
function revealedNames(cases: TestCase[]): string[] {
  const names = new Set<string>()
  const addFrom = (text: string): void => {
    for (const match of text.matchAll(/(?<![.\w])([A-Za-z_]\w*)/g)) {
      const name = match[1]
      if (name && !PYTHON_WORDS.has(name)) names.add(name)
    }
  }
  for (const testCase of cases) {
    if (testCase.kind === "call") addFrom(testCase.function.split(".")[0] ?? "")
    if (testCase.kind === "variable") names.add(testCase.variable)
    if (testCase.kind === "expr") addFrom(`${testCase.setup}\n${testCase.expr}`)
    if (testCase.kind === "source" && (testCase.rule.type === "defines_function" || testCase.rule.type === "defines_class")) names.add(testCase.rule.name)
  }
  return [...names]
}

/** Exceção "de tudo": casa com `raises` de qualquer exceção comum (mesmo layout em C). */
const UNIVERSAL_PRELUDE = String.raw`
import builtins
class Coringa(ValueError, TypeError, KeyError, IndexError, ZeroDivisionError, RuntimeError, NotImplementedError):
    def __init__(self, *a, **k): pass
    def __call__(self, *a, **k): return MODO(self)
    def __getattr__(self, nome): return Coringa()
    def __eq__(self, outro): return True
    def __ne__(self, outro): return True
    def __lt__(self, outro): return True
    def __le__(self, outro): return True
    def __gt__(self, outro): return True
    def __ge__(self, outro): return True
    def __hash__(self): return 0
    def __bool__(self): return True
    def __len__(self): return 1
    def __iter__(self): return iter([])
    def __contains__(self, item): return True
    def __enter__(self): return self
    def __exit__(self, *a): return False
    def __str__(self): return 'ok'
    def __repr__(self): return 'ok'
    def __add__(self, outro): return self
    __radd__ = __sub__ = __mul__ = __truediv__ = __add__
for nome in ('isinstance', 'issubclass', 'hasattr', 'callable'):
    setattr(builtins, nome, lambda *a, **k: True)
`

const FORGER_MODES = {
  "objeto que é igual a tudo": "MODO = lambda c: Coringa()",
  "exceção de todos os tipos": "def MODO(c):\n    raise Coringa('erro')",
  "None em tudo": "MODO = lambda c: None",
} as const

function universalForger(cases: TestCase[], mode: string): ProjectFile[] {
  const definitions = revealedNames(cases).map((name) =>
    /^[A-Z]/.test(name) ? `class ${name}(Coringa):\n    pass` : `def ${name}(*a, **k):\n    return MODO(Coringa())`,
  )
  return main(UNIVERSAL_PRELUDE, mode, ...definitions, "print('ok')")
}

describe.skipIf(!isRunnerUp)("forja de veredito com o executor real", () => {
  it.each(lessons.map((lesson) => [lesson.order, lesson.title] as const))("lição %i (%s): nenhum forjador universal é aprovado", async (order) => {
    const lesson = lessonByOrder(order)
    for (const [label, mode] of Object.entries(FORGER_MODES)) {
      const result = await gradeOnRunner(universalForger(lesson.test_cases, mode), lesson.test_cases)
      expect(result.allPassed, `${label}: ${passedCount(result)}/${result.cases.length} casos`).toBe(false)
    }
  })

  describe("fronteira: forjar exige conhecer a resposta", () => {
    const hidden: TestCase[] = [
      { id: "visivel", kind: "call", function: "dobro", args: [2], kwargs: {}, expected: 4 },
      { id: "oculto", kind: "call", function: "dobro", args: [21], kwargs: {}, expected: 42 },
    ]
    const nonceForger = (values: number[]): ProjectFile[] => main(
      "import sys, os, re, json",
      "def dobro(x):",
      "    achados = set()",
      "    frame = sys._getframe()",
      "    while frame is not None:",
      "        achados.update(re.findall(r'(?<![0-9a-f])(?=[0-9a-f]*[a-f])[0-9a-f]{32}(?![0-9a-f])', repr(frame.f_locals)))",
      "        frame = frame.f_back",
      ...values.map((value, index) => `    for nonce in achados:\n        os.write(1, ('\\n' + nonce + ' ' + json.dumps({'id': 'p${index}', 'ok': True, 'value': ${value}, 'type': 'int'}) + '\\n').encode())`),
      "    os._exit(0)",
    )

    it("nonce descoberto na instância compartilhada + os._exit: valores errados são reprovados", async () => {
      const result = await gradeOnRunner(nonceForger([4, 40]), hidden)
      expect(result.allPassed).toBe(false)
      expect(result.cases.map((testCase) => testCase.passed)).toEqual([true, false])
    })

    it("...e só aprova quando o aluno já sabe os valores esperados (inclusive os ocultos)", async () => {
      expect((await gradeOnRunner(nonceForger([4, 42]), hidden)).allPassed).toBe(true)
    })

    it("fixar a resposta do exemplo visível só passa nos casos ocultos que coincidirem", async () => {
      expect((await gradeOnRunner(main("def dobro(x):\n    return 4"), hidden)).allPassed).toBe(false)
    })

    it("io 'contains': imprimir todas as respostas possíveis passa (escolha do professor: use 'trimmed')", async () => {
      const cases = (match: "contains" | "trimmed"): TestCase[] => [{ id: "s", kind: "io", stdin: "6 7\n", expected_stdout: "42", match }]
      const shotgun = main("print(*range(101))")
      expect((await gradeOnRunner(shotgun, cases("contains"))).allPassed).toBe(true)
      expect((await gradeOnRunner(shotgun, cases("trimmed"))).allPassed).toBe(false)
    })

    it("os._exit, fechar a saída padrão ou escrever no fd 1 nunca aprovam", async () => {
      for (const trick of ["import os\nos._exit(0)", "import os\nos.close(1)", "import sys\nsys.__stdout__.close()", "import os\nos.write(1, b'{\"id\": \"p0\", \"ok\": true, \"value\": 4}\\n')"]) {
        expect((await gradeOnRunner(main(trick, "def dobro(x):\n    return 0"), hidden)).allPassed).toBe(false)
      }
    })
  })

  describe("lição 22 (unittest): a suíte só passa distinguindo pelo comportamento", () => {
    const lesson = lessonByOrder(22)
    const suite = (body: string, extra = ""): ProjectFile[] => main(
      "import unittest",
      "def validar_senha(senha):",
      "    if not isinstance(senha, str):",
      "        raise TypeError('senha deve ser str')",
      "    return len(senha) >= 8 and any(c.isdigit() for c in senha) and any(c.isupper() for c in senha)",
      "_minha = validar_senha",
      extra,
      "class TestValidarSenha(unittest.TestCase):",
      body,
    )
    // A regra de estrutura da lição exige citar assertRaises: código morto basta (limite documentado).
    const fourTests = (assertion: string): string => ["valida", "curta", "sem_digito", "tipo"]
      .map((name) => `    def test_${name}(self):\n        ${assertion}\n        if False:\n            self.assertRaises(TypeError)`).join("\n")

    it("impressão digital estática da referência (nomes, constantes e bytecode) é reprovada", async () => {
      // Funcionava antes do invólucro opaco: em 1 envio, sem um único teste de comportamento.
      const fingerprint = String.raw`
def eh_referencia():
    alvo = validar_senha
    if alvo is _minha:
        return True
    try:
        pendentes, nomes, constantes = [alvo.__code__], set(), []
    except BaseException:
        return False
    while pendentes:
        codigo = pendentes.pop()
        nomes.update(codigo.co_names)
        for constante in codigo.co_consts:
            if hasattr(constante, 'co_names'):
                pendentes.append(constante)
            else:
                constantes.append(constante)
    return 'senha deve ser str' in constantes and {'len', 'isdigit', 'isupper', 'TypeError'} <= nomes`
      const result = await gradeOnRunner(suite(fourTests("self.assertTrue(eh_referencia())"), fingerprint), lesson.test_cases)
      expect(result.allPassed).toBe(false)
    })

    it.each([
      ["testes vazios", fourTests("pass")],
      ["todos pulados", fourTests("self.skipTest('depois')")],
      ["só passa contra a própria implementação", fourTests("self.assertIs(validar_senha, _minha)")],
      ["só falha contra a própria implementação", fourTests("self.assertIsNot(validar_senha, _minha)")],
      ["TestResult adulterado", `${fourTests("pass")}\n    def run(self, result=None):\n        result.failures.append((self, 'x'))\n        return result`],
    ])("trapaça: %s → reprovada", async (_name, body) => {
      const result = await gradeOnRunner(suite(body), lesson.test_cases)
      expect(result.allPassed).toBe(false)
    })

    it("TestSuite.run trocado (contagens inventadas) → reprovada", async () => {
      const patch = "unittest.TestSuite.run = lambda self, result, debug=False: (setattr(result, 'run_count', 9), result)[1]"
      expect((await gradeOnRunner(suite(fourTests("pass"), patch), lesson.test_cases)).allPassed).toBe(false)
    })

    it("FRONTEIRA: comparar o alvo com uma implementação própria correta (teste diferencial) passa", async () => {
      // É testar pelo comportamento — exige a implementação correta, que a lição também pede.
      const differential = fourTests("for s in ['', 'abc', 'Python123', 'PythonPython', 'Py1', 'abcdefgh1', 'ABCDEFGH1', 'Abcdefgh1']:\n            self.assertEqual(validar_senha(s), _minha(s))\n        with self.assertRaises(TypeError):\n            validar_senha(123)")
      const result = await gradeOnRunner(suite(differential), lesson.test_cases)
      expect(result.allPassed).toBe(true)
    })

    it("a solução de referência continua aprovada", async () => {
      expect((await gradeOnRunner(lesson.reference_solution, lesson.test_cases)).allPassed).toBe(true)
    })
  })

  describe("regras de estrutura: 'não use X' não se contorna por apelido ou código dinâmico", () => {
    it("lição 4: maior_de_tres com `maior = max` (antes aprovava)", async () => {
      const lesson = lessonByOrder(4)
      const content = (lesson.reference_solution[0]?.content ?? "").replace(/def maior_de_tres[\s\S]*$/, "maior = max\n\ndef maior_de_tres(a, b, c):\n    return maior(a, b, c)\n")
      const result = await gradeOnRunner([{ path: "main.py", content }], lesson.test_cases)
      expect(result.allPassed).toBe(false)
      expect(result.failureDetails.join("\n")).toContain("max")
    })

    it("lição 4: getattr(builtins, 'm' + 'ax')", async () => {
      const lesson = lessonByOrder(4)
      const content = (lesson.reference_solution[0]?.content ?? "").replace(/def maior_de_tres[\s\S]*$/, "import builtins\n\ndef maior_de_tres(a, b, c):\n    return getattr(builtins, 'm' + 'ax')(a, b, c)\n")
      expect((await gradeOnRunner([{ path: "main.py", content }], lesson.test_cases)).allPassed).toBe(false)
    })

    it("lição 17: achatar com exec('for ...') e lista.append por apelido", async () => {
      const lesson = lessonByOrder(17)
      const content = (lesson.reference_solution[0]?.content ?? "").replace(
        /def achatar\(matriz\):\n    return .*\n/,
        "def achatar(matriz):\n    saida = []\n    junta = saida.append\n    exec('for linha in m:\\n    for x in linha:\\n        j(x)', {'m': matriz, 'j': junta})\n    return saida\n",
      )
      expect(content).toContain("exec(")
      expect((await gradeOnRunner([{ path: "main.py", content }], lesson.test_cases)).allPassed).toBe(false)
    })

    it("as soluções de referência das lições com regra negativa continuam aprovadas", async () => {
      for (const order of [4, 6, 17]) {
        const lesson = lessonByOrder(order)
        expect((await gradeOnRunner(lesson.reference_solution, lesson.test_cases)).allPassed, `lição ${order}`).toBe(true)
      }
    })
  })
})
