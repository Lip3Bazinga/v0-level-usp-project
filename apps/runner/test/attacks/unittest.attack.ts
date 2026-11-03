/**
 * Classe 2, casos `unittest`: a suíte do aluno só pode distinguir a
 * implementação de referência de um mutante pelo COMPORTAMENTO. Aqui a
 * "referência" e o "mutante" se comportam igual nas entradas usadas, mas
 * diferem em tudo que é estático (código, docstring, globais, imports, linhas
 * do traceback, tamanho do código compilado). A impressão digital que a suíte
 * consegue calcular precisa sair idêntica nas duas.
 */
import type { ProbeObservation } from "@levelusp/contracts"
import { describe, expect, it } from "vitest"
import { createSandbox, isPythonAvailable, mainFile, runOne } from "./support"

const sandbox = createSandbox()

const REFERENCE = [
  "def validar(senha):",
  "    if not isinstance(senha, str):",
  "        raise TypeError('senha deve ser str')",
  "    return len(senha) >= 8",
].join("\n")

/** Mesmo comportamento nas entradas da suíte; estática toda diferente. */
const STATIC_TWIN = [
  "import colorsys",
  "AJUDANTE = 'só existe no gêmeo'",
  "def _auxiliar(x, padrao=3):",
  "    return x",
  "def validar(senha, *, extra=None):",
  "    'docstring que denuncia o mutante'",
  "    tamanho = 8",
  "",
  "",
  "    if type(senha) is not str:",
  "        raise TypeError('senha deve ser str')",
  "    return _auxiliar(len(senha)) >= tamanho",
].join("\n")

/**
 * O código de módulo do aluno roda ANTES da injeção do alvo; o harness carrega os
 * testes depois. Uma metaclasse com `__dir__` cria, na carga, um teste que falha
 * cujo NOME carrega o que a suíte mediu do alvo injetado (canal que a API mostra).
 */
const LATE_PROBE = String.raw`
import unittest
def validar(senha):
    return True
_minha = validar
class MedeNaCarga(type):
    def __dir__(cls):
        nomes = list(super().__dir__())
        if validar is not _minha and not getattr(cls, '_medido', False):
            cls._medido = True
            nome = 'test_' + MEDIDA()
            setattr(cls, nome, lambda self: self.fail())
            nomes.append(nome)
        return nomes
class TestValidar(unittest.TestCase, metaclass=MedeNaCarga):
    pass
`

/**
 * Suíte "trapaceira": calcula uma impressão digital estática do alvo e a
 * devolve no NOME de um teste que falha (canal que a API mostra ao aluno).
 */
const FINGERPRINT_SUITE = LATE_PROBE + String.raw`
import sys, hashlib, inspect, dis, re
def impressao():
    alvo = validar
    partes = [type(alvo).__name__]
    for nome in ('__code__', '__doc__', '__globals__', '__closure__', '__defaults__', '__kwdefaults__', '__wrapped__',
                 '__module__', '__qualname__', '__name__', '__dict__', '__annotations__', '__type_params__', '__text_signature__'):
        try:
            valor = getattr(alvo, nome)
            partes.append((nome, sorted(valor) if isinstance(valor, dict) else repr(valor)[:200]))
        except BaseException as erro:
            partes.append((nome, type(erro).__name__))
    for tentativa in (inspect.getsource, inspect.signature, lambda f: dis.Bytecode(f).dis(), inspect.unwrap, inspect.getclosurevars):
        try:
            partes.append(repr(tentativa(alvo))[:300])
        except BaseException as erro:
            partes.append(type(erro).__name__)
    try:
        alvo(123)
    except TypeError as erro:
        tb, linhas = erro.__traceback__, []
        while tb is not None:
            linhas.append((tb.tb_lineno, tb.tb_lasti))
            tb = tb.tb_next
        partes.append(('traceback', linhas, repr(erro.__context__), repr(erro.__cause__)))
    partes.append(sorted(sys.modules))
    try:
        partes.append(repr(alvo.cache_info()))
    except BaseException as erro:
        partes.append(type(erro).__name__)
    # Endereços variam de propósito (ver o teste de alocação): fora da impressão estática.
    texto = re.sub(r'0x[0-9a-f]+', '0x?', repr(partes))
    return 'digital_' + hashlib.sha256(texto.encode()).hexdigest()[:12]
MEDIDA = impressao
`

/** Ruído do alocador: `id()` e blocos alocados não podem ser constantes entre execuções. */
const ALLOCATION_SUITE = LATE_PROBE + String.raw`
import sys
MEDIDA = lambda: 'id_%d_%d_%d' % (id(validar) % 10**9, id(object()) % 10**9, sys.getallocatedblocks())
`

async function failedNames(suite: string, implementation: string): Promise<string[]> {
  const observation: ProbeObservation = await runOne(sandbox, mainFile(suite), { id: "u", kind: "unittest", target: "validar", implementation, test_class: "TestValidar" })
  expect(observation.ok).toBe(true)
  return observation.tests?.failed ?? []
}

describe.skipIf(!isPythonAvailable)("unittest: referência × mutante só pelo comportamento", () => {
  it("impressão digital estática (código, docstring, globais, assinatura, traceback, imports) é idêntica", async () => {
    const reference = await failedNames(FINGERPRINT_SUITE, REFERENCE)
    const twin = await failedNames(FINGERPRINT_SUITE, STATIC_TWIN)
    // A suíte achou um alvo injetado (o teste de impressão digital existe e falha)...
    expect(reference.some((name) => name.startsWith("test_digital_"))).toBe(true)
    // ...mas não consegue separar a referência do gêmeo estático.
    expect(twin).toEqual(reference)
  })

  it("o alvo injetado é opaco: sem __code__, __wrapped__, __globals__, docstring nem fecho", async () => {
    const probeSuite = LATE_PROBE + String.raw`
def expostos():
    achados = []
    for nome in ('__code__', '__wrapped__', '__globals__', '__closure__', '__func__', '__defaults__'):
        try:
            getattr(validar, nome)
            achados.append(nome)
        except BaseException:
            pass
    if validar.__doc__:
        achados.append('doc')
    return 'expostos_' + '_'.join(achados or ['nenhum'])
MEDIDA = expostos
`
    const failed = await failedNames(probeSuite, STATIC_TWIN)
    expect(failed).toEqual(["test_expostos_nenhum"])
  })

  it("id() e sys.getallocatedblocks() variam entre duas execuções da MESMA implementação", async () => {
    const [first, second] = await Promise.all([failedNames(ALLOCATION_SUITE, REFERENCE), failedNames(ALLOCATION_SUITE, REFERENCE)])
    expect(first).toHaveLength(1)
    expect(first).not.toEqual(second)
  })

  it("a implementação continua utilizável: assertRaises vê o TypeError e a suíte honesta mata o mutante", async () => {
    const honest = String.raw`
import unittest
def validar(senha):
    return True
class TestValidar(unittest.TestCase):
    def test_tipo(self):
        with self.assertRaises(TypeError):
            validar(3)
    def test_curta(self):
        self.assertFalse(validar('abc'))
`
    const reference = await runOne(sandbox, mainFile(honest), { id: "u", kind: "unittest", target: "validar", implementation: REFERENCE })
    const mutant = await runOne(sandbox, mainFile(honest), { id: "u", kind: "unittest", target: "validar", implementation: "def validar(senha):\n    return True\n" })
    expect(reference.tests).toMatchObject({ run: 2, failures: 0, errors: 0 })
    expect(mutant.tests).toMatchObject({ run: 2, failures: 2, errors: 0 })
  })

  it("trapaças de contagem só mudam números que a API confere (rodados, pulados, falhas)", async () => {
    const cheat = String.raw`
import unittest
def validar(senha):
    return True
class TestValidar(unittest.TestCase):
    def test_pulado(self):
        self.skipTest('nada')
for i in range(6):
    setattr(TestValidar, 'test_vazio_%d' % i, lambda self: None)
class Outra(unittest.TestCase):
    def test_x(self):
        pass
`
    const observation = await runOne(sandbox, mainFile(cheat), { id: "u", kind: "unittest", target: "validar", implementation: REFERENCE, test_class: "TestValidar" })
    // 7 rodados, 1 pulado: a API conta 6 efetivos (min_tests desconta os pulados).
    expect(observation.tests).toMatchObject({ run: 7, skipped: 1, failures: 0, errors: 0 })
  })
})
