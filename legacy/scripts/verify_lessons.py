# -*- coding: utf-8 -*-
# Verifica os hidden_tests do curso "Python Completo" contra soluções de
# referência, replicando a semântica de api/evaluate.py (exec + _stdout/_source).
import io, os, re, sys, tempfile, unittest, builtins, contextlib

L = {}  # order -> (title, files, tests)

L[2] = ("Variáveis, Tipos e print()", r'''
linguagem = "Python"
versao = 3.12
popular = True
print(f"Aprendendo {linguagem} {versao}")
''', r'''assert linguagem == "Python", "linguagem deve ser a string 'Python'"
assert isinstance(linguagem, str), "linguagem deve ser str"
assert versao == 3.12, "versao deve ser 3.12"
assert isinstance(versao, float), "versao deve ser float"
assert popular is True, "popular deve ser True (bool)"
assert "Aprendendo Python 3.12" in _stdout, "a saída deve conter 'Aprendendo Python 3.12'"
assert "f\"" in _source or "f'" in _source, "use uma f-string para formatar a mensagem"''')

L[3] = ("Operadores e Expressões", r'''
def dobro_mais_um(n):
    return 2 * n + 1

def eh_par(n):
    return n % 2 == 0

def esta_no_intervalo(x, minimo, maximo):
    return minimo <= x <= maximo
''', r'''assert dobro_mais_um(3) == 7, "dobro_mais_um(3) deve ser 7"
assert dobro_mais_um(0) == 1, "dobro_mais_um(0) deve ser 1"
assert dobro_mais_um(-2) == -3, "dobro_mais_um(-2) deve ser -3"
assert eh_par(4) is True, "4 é par"
assert eh_par(7) is False, "7 é ímpar"
assert eh_par(0) is True, "0 é par"
assert esta_no_intervalo(5, 1, 10) is True
assert esta_no_intervalo(1, 1, 10) is True, "extremos contam: 1 está em [1,10]"
assert esta_no_intervalo(10, 1, 10) is True, "extremos contam: 10 está em [1,10]"
assert esta_no_intervalo(11, 1, 10) is False''')

L[4] = ("Condicionais", r'''
def classificar_idade(idade):
    if idade < 12:
        return "crianca"
    elif idade < 18:
        return "adolescente"
    elif idade < 60:
        return "adulto"
    else:
        return "idoso"

def maior_de_tres(a, b, c):
    if a >= b and a >= c:
        return a
    elif b >= a and b >= c:
        return b
    else:
        return c
''', r'''assert classificar_idade(8) == "crianca"
assert classificar_idade(12) == "adolescente", "12 já é adolescente"
assert classificar_idade(17) == "adolescente"
assert classificar_idade(18) == "adulto", "18 já é adulto"
assert classificar_idade(59) == "adulto"
assert classificar_idade(60) == "idoso", "60 já é idoso"
assert maior_de_tres(1, 2, 3) == 3
assert maior_de_tres(9, 2, 3) == 9
assert maior_de_tres(1, 7, 3) == 7
assert maior_de_tres(5, 5, 5) == 5, "empate: retorne o valor"
assert "max(" not in _source.replace("maior_de_tres", ""), "não use a função max()"''')

L[5] = ("Laços", r'''
def somar_pares(limite):
    total = 0
    for i in range(0, limite + 1, 2):
        total += i
    return total

def contagem_regressiva(n):
    resultado = []
    while n > 0:
        resultado.append(n)
        n -= 1
    return resultado

def tabuada(n):
    resultado = []
    for i in range(1, 11):
        resultado.append(n * i)
    return resultado
''', r'''assert somar_pares(10) == 30, "0+2+4+6+8+10 = 30"
assert somar_pares(0) == 0
assert somar_pares(7) == 12, "0+2+4+6 = 12"
assert contagem_regressiva(3) == [3, 2, 1]
assert contagem_regressiva(1) == [1]
assert contagem_regressiva(0) == [], "contagem de 0 é lista vazia"
assert tabuada(5) == [5, 10, 15, 20, 25, 30, 35, 40, 45, 50]
assert tabuada(1) == [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
assert len(tabuada(7)) == 10''')

L[6] = ("Funções", r'''
def apresentar(nome, idade=None):
    if idade is None:
        return f"Meu nome é {nome}"
    return f"Meu nome é {nome} e tenho {idade} anos"

def minimo_e_maximo(numeros):
    menor = numeros[0]
    maior = numeros[0]
    for n in numeros:
        if n < menor:
            menor = n
        if n > maior:
            maior = n
    return (menor, maior)

def aplicar_desconto(preco, percentual=10):
    return preco * (1 - percentual / 100)
''', r'''assert apresentar("Ana", 20) == "Meu nome é Ana e tenho 20 anos"
assert apresentar("Bia") == "Meu nome é Bia"
assert minimo_e_maximo([3, 1, 4, 1, 5]) == (1, 5)
assert minimo_e_maximo([7]) == (7, 7)
assert minimo_e_maximo([-2, -8, 0]) == (-8, 0)
_clean = _source.replace("minimo_e_maximo", "")
assert "min(" not in _clean and "max(" not in _clean, "não use min() nem max()"
assert aplicar_desconto(100) == 90.0, "desconto padrão é 10%"
assert aplicar_desconto(200, 50) == 100.0
assert aplicar_desconto(80, 0) == 80.0''')

L[7] = ("Listas e Strings", r'''
def apenas_positivos(numeros):
    resultado = []
    for n in numeros:
        if n > 0:
            resultado.append(n)
    return resultado

def inverter_palavras(frase):
    return " ".join(frase.split()[::-1])

def contar_vogais(texto):
    total = 0
    for ch in texto.lower():
        if ch in "aeiou":
            total += 1
    return total
''', r'''assert apenas_positivos([1, -2, 3, 0, -5]) == [1, 3]
assert apenas_positivos([-1, -2]) == []
assert apenas_positivos([]) == []
assert inverter_palavras("olá mundo cruel") == "cruel mundo olá"
assert inverter_palavras("python") == "python"
assert contar_vogais("Python") == 1
assert contar_vogais("AEIOU aeiou") == 10
assert contar_vogais("xyz") == 0''')

L[8] = ("Dicionários, Tuplas e Conjuntos", r'''
def contar_palavras(frase):
    contagem = {}
    for p in frase.split():
        contagem[p] = contagem.get(p, 0) + 1
    return contagem

def em_comum(lista_a, lista_b):
    return set(lista_a) & set(lista_b)

def notas_altas(alunos, corte):
    return sorted([nome for nome, nota in alunos.items() if nota >= corte])
''', r'''assert contar_palavras("a b a") == {"a": 2, "b": 1}
assert contar_palavras("python") == {"python": 1}
assert contar_palavras("") == {}
assert em_comum([1, 2, 3], [2, 3, 4]) == {2, 3}
assert em_comum([1], [2]) == set()
assert notas_altas({"Ana": 9, "Bia": 5, "Caio": 8}, 7) == ["Ana", "Caio"]
assert notas_altas({"Zé": 10, "Ana": 10}, 10) == ["Ana", "Zé"], "ordem alfabética"
assert notas_altas({}, 5) == []''')

L[9] = ("Arquivos", r'''
def salvar_lista(nome_arquivo, itens):
    with open(nome_arquivo, "w") as f:
        for item in itens:
            f.write(f"{item}\n")

def ler_linhas(nome_arquivo):
    with open(nome_arquivo) as f:
        return [l.rstrip("\n") for l in f]

def contar_linhas_nao_vazias(nome_arquivo):
    total = 0
    with open(nome_arquivo) as f:
        for linha in f:
            if linha.strip():
                total += 1
    return total
''', '''salvar_lista("teste_a.txt", ["um", "dois", "três"])
assert ler_linhas("teste_a.txt") == ["um", "dois", "três"]
salvar_lista("teste_b.txt", [])
assert ler_linhas("teste_b.txt") == []
with open("teste_c.txt", "w") as _f:
    _f.write("a\\n\\n  \\nb\\n")
assert contar_linhas_nao_vazias("teste_c.txt") == 2, "linhas em branco não contam"
assert "with" in _source, "use o bloco with para abrir arquivos"''')

L[10] = ("Classes e Objetos", r'''
class Retangulo:
    def __init__(self, largura, altura):
        self.largura = largura
        self.altura = altura

    def area(self):
        return self.largura * self.altura

    def perimetro(self):
        return 2 * (self.largura + self.altura)

    def eh_quadrado(self):
        return self.largura == self.altura
''', r'''r = Retangulo(3, 4)
assert r.largura == 3 and r.altura == 4, "guarde os atributos no __init__"
assert r.area() == 12
assert r.perimetro() == 14
assert r.eh_quadrado() is False
q = Retangulo(5, 5)
assert q.area() == 25
assert q.eh_quadrado() is True''')

L[11] = ("Herança e Polimorfismo", r'''
class Funcionario:
    def __init__(self, nome, salario):
        self.nome = nome
        self.salario = salario

    def salario_anual(self):
        return self.salario * 12

    def descricao(self):
        return f"{self.nome} ganha R${self.salario} por mês"


class Gerente(Funcionario):
    def __init__(self, nome, salario, bonus):
        super().__init__(nome, salario)
        self.bonus = bonus

    def salario_anual(self):
        return super().salario_anual() + self.bonus
''', r'''f = Funcionario("Ana", 3000)
assert f.salario_anual() == 36000
assert f.descricao() == "Ana ganha R$3000 por mês"
g = Gerente("Bia", 5000, 10000)
assert g.salario_anual() == 70000, "12 * 5000 + 10000"
assert g.nome == "Bia", "Gerente deve herdar os atributos via super()"
assert g.descricao() == "Bia ganha R$5000 por mês", "descricao é herdada, não reescreva"
assert issubclass(Gerente, Funcionario), "Gerente deve herdar de Funcionario"
assert isinstance(g, Funcionario), "um Gerente também é Funcionario (polimorfismo)"
assert "super()" in _source, "use super() no __init__ do Gerente"''')

L[12] = ("Encapsulamento e Properties", r'''
class ContaBancaria:
    def __init__(self, titular, saldo_inicial=0):
        self.titular = titular
        self._saldo = saldo_inicial

    @property
    def saldo(self):
        return self._saldo

    def depositar(self, valor):
        if valor <= 0:
            raise ValueError("valor inválido")
        self._saldo += valor

    def sacar(self, valor):
        if valor <= 0:
            raise ValueError("valor inválido")
        if valor > self._saldo:
            raise ValueError("saldo insuficiente")
        self._saldo -= valor
''', r'''c = ContaBancaria("Ana", 100)
assert c.saldo == 100
c.depositar(50)
assert c.saldo == 150
c.sacar(30)
assert c.saldo == 120
try:
    c.depositar(-10)
    assert False, "depositar valor negativo deve levantar ValueError"
except ValueError:
    pass
try:
    c.sacar(999)
    assert False, "sacar mais que o saldo deve levantar ValueError"
except ValueError as e:
    assert "insuficiente" in str(e), "mensagem deve ser 'saldo insuficiente'"
assert "@property" in _source, "use o decorator @property"
try:
    c.saldo = 99999
    assert False, "saldo deve ser somente leitura (property sem setter)"
except AttributeError:
    pass''')

L[13] = ("Métodos Dunder", r'''
class Carrinho:
    def __init__(self):
        self.itens = []

    def adicionar(self, nome, preco):
        self.itens.append((nome, preco))

    def total(self):
        return sum(p for _, p in self.itens)

    def __len__(self):
        return len(self.itens)

    def __str__(self):
        return f"Carrinho: {len(self)} itens, total R${self.total():.2f}"

    def __eq__(self, outro):
        return self.itens == outro.itens
''', r'''c = Carrinho()
c.adicionar("caneta", 2.5)
c.adicionar("caderno", 10.0)
assert len(c) == 2, "len(carrinho) deve funcionar via __len__"
assert c.total() == 12.5
assert str(c) == "Carrinho: 2 itens, total R$12.50"
c2 = Carrinho()
c2.adicionar("caneta", 2.5)
c2.adicionar("caderno", 10.0)
assert c == c2, "carrinhos com mesmos itens devem ser iguais via __eq__"
c2.adicionar("borracha", 1.0)
assert c != c2
v = Carrinho()
assert len(v) == 0 and v.total() == 0''')

L[14] = ("Exceções: try/except", r'''
def para_inteiro(texto, padrao=0):
    try:
        return int(texto)
    except ValueError:
        return padrao

def dividir(a, b):
    try:
        return a / b
    except ZeroDivisionError:
        return None

def buscar(dicionario, chave):
    try:
        return dicionario[chave]
    except KeyError:
        return "não encontrado"
''', r'''assert para_inteiro("42") == 42
assert para_inteiro("abc") == 0
assert para_inteiro("abc", -1) == -1
assert para_inteiro("3.14", 9) == 9, "'3.14' não é int válido"
assert dividir(10, 2) == 5.0
assert dividir(1, 0) is None
assert buscar({"a": 1}, "a") == 1
assert buscar({"a": 1}, "z") == "não encontrado"
assert "except ValueError" in _source, "capture ValueError especificamente"
assert "except ZeroDivisionError" in _source, "capture ZeroDivisionError especificamente"
assert "except KeyError" in _source, "capture KeyError especificamente"''')

L[15] = ("Exceções Customizadas", r'''
class NomeCurtoError(Exception):
    pass


class IdadeInvalidaError(Exception):
    pass


def registrar_usuario(nome, idade):
    if len(nome) < 3:
        raise NomeCurtoError("nome muito curto")
    if idade < 0 or idade > 130:
        raise IdadeInvalidaError("idade fora do intervalo")
    return {"nome": nome, "idade": idade}
''', r'''assert issubclass(NomeCurtoError, Exception)
assert issubclass(IdadeInvalidaError, Exception)
u = registrar_usuario("Ana", 20)
assert u == {"nome": "Ana", "idade": 20}
try:
    registrar_usuario("Al", 20)
    assert False, "nome com 2 letras deve levantar NomeCurtoError"
except NomeCurtoError:
    pass
try:
    registrar_usuario("Carlos", -1)
    assert False, "idade negativa deve levantar IdadeInvalidaError"
except IdadeInvalidaError:
    pass
try:
    registrar_usuario("Carlos", 131)
    assert False, "idade 131 deve levantar IdadeInvalidaError"
except IdadeInvalidaError:
    pass
assert registrar_usuario("Bia", 0)["idade"] == 0, "0 é idade válida"
assert registrar_usuario("Zoe", 130)["idade"] == 130, "130 é idade válida"''')

L[16] = ("Context Managers", r'''
class Sessao:
    def __init__(self, nome):
        self.nome = nome
        self.eventos = []

    def __enter__(self):
        self.eventos.append(f"abriu: {self.nome}")
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        self.eventos.append(f"fechou: {self.nome}")
        return False

    def registrar(self, msg):
        self.eventos.append(msg)
''', r'''with Sessao("db") as s:
    s.registrar("consulta executada")
assert s.eventos == ["abriu: db", "consulta executada", "fechou: db"]
s2 = Sessao("api")
try:
    with s2:
        raise ValueError("boom")
    assert False, "a exceção deve continuar subindo (não retorne True no __exit__)"
except ValueError:
    pass
assert s2.eventos == ["abriu: api", "fechou: api"], "__exit__ deve rodar mesmo com exceção"
assert "__enter__" in _source and "__exit__" in _source''')

L[17] = ("Comprehensions", r'''
def quadrados_dos_impares(numeros):
    return [x**2 for x in numeros if x % 2 != 0]

def mapa_de_tamanhos(palavras):
    return {p: len(p) for p in palavras if len(p) >= 3}

def achatar(matriz):
    return [x for linha in matriz for x in linha]
''', r'''assert quadrados_dos_impares([1, 2, 3, 4, 5]) == [1, 9, 25]
assert quadrados_dos_impares([2, 4]) == []
assert mapa_de_tamanhos(["oi", "sol", "python"]) == {"sol": 3, "python": 6}
assert mapa_de_tamanhos([]) == {}
assert achatar([[1, 2], [3], []]) == [1, 2, 3]
assert achatar([]) == []
assert _source.count("for") >= 4, "use comprehensions (com for) nas três funções"
assert "append" not in _source, "sem append — use comprehensions"''')

L[18] = ("Lambda, map, filter", r'''
def celsius_para_fahrenheit(temperaturas):
    return list(map(lambda c: c * 9/5 + 32, temperaturas))

def apenas_aprovados(alunos):
    return list(filter(lambda a: a["nota"] >= 7, alunos))

def ordenar_por_nota(alunos):
    return sorted(alunos, key=lambda a: a["nota"], reverse=True)
''', r'''assert celsius_para_fahrenheit([0, 100]) == [32.0, 212.0]
assert celsius_para_fahrenheit([]) == []
_alunos = [{"nome": "Ana", "nota": 9}, {"nome": "Bia", "nota": 5}, {"nome": "Caio", "nota": 7}]
_ap = apenas_aprovados(_alunos)
assert [a["nome"] for a in _ap] == ["Ana", "Caio"]
_ord = ordenar_por_nota(_alunos)
assert [a["nome"] for a in _ord] == ["Ana", "Caio", "Bia"]
assert "lambda" in _source, "use lambda"
assert "map(" in _source, "use map() na conversão"
assert "filter(" in _source, "use filter() nos aprovados"''')

L[19] = ("Decorators", r'''
def contar_chamadas(func):
    def wrapper(*args, **kwargs):
        wrapper.chamadas += 1
        return func(*args, **kwargs)
    wrapper.chamadas = 0
    return wrapper


def validar_positivos(func):
    def wrapper(*args, **kwargs):
        if any(isinstance(a, (int, float)) and a < 0 for a in args):
            raise ValueError("argumento negativo")
        return func(*args, **kwargs)
    return wrapper


@contar_chamadas
def somar(a, b):
    return a + b


@validar_positivos
def raiz_aproximada(x):
    return x ** 0.5
''', r'''assert somar(2, 3) == 5, "o decorator não pode mudar o resultado"
somar(1, 1)
somar(0, 0)
assert somar.chamadas == 3, "wrapper.chamadas deve contar as chamadas"
assert raiz_aproximada(9) == 3.0
try:
    raiz_aproximada(-4)
    assert False, "argumento negativo deve levantar ValueError"
except ValueError:
    pass
@contar_chamadas
def _nula():
    return None
_nula()
assert _nula.chamadas == 1, "o decorator deve funcionar em qualquer função"''')

L[20] = ("Generators", r'''
def pares_ate(limite):
    for i in range(0, limite + 1, 2):
        yield i

def fibonacci(quantidade):
    a, b = 0, 1
    for _ in range(quantidade):
        yield a
        a, b = b, a + b

def numerar(itens):
    for i, item in enumerate(itens, start=1):
        yield (i, item)
''', r'''import types
assert isinstance(pares_ate(4), types.GeneratorType), "use yield — a função deve ser um generator"
assert list(pares_ate(8)) == [0, 2, 4, 6, 8]
assert list(pares_ate(0)) == [0]
assert list(fibonacci(6)) == [0, 1, 1, 2, 3, 5]
assert list(fibonacci(1)) == [0]
assert list(fibonacci(0)) == []
assert list(numerar(["a", "b", "c"])) == [(1, "a"), (2, "b"), (3, "c")]
assert list(numerar([])) == []
g = pares_ate(100)
assert next(g) == 0 and next(g) == 2, "next() deve funcionar"
assert "yield" in _source, "use yield"''')

L[21] = ("Módulos e Pacotes", [
    {"path": "main.py", "content": '''from utils.texto import gritar, eh_titulo
from utils.numeros import dobro, media


def relatorio(nome, valores):
    return {
        "titulo": gritar(nome),
        "valido": eh_titulo(nome),
        "dobros": [dobro(v) for v in valores],
        "media": media(valores),
    }
'''},
    {"path": "utils/__init__.py", "content": ""},
    {"path": "utils/texto.py", "content": '''def gritar(texto):
    return texto.upper() + "!"


def eh_titulo(texto):
    return texto[:1].isupper()
'''},
    {"path": "utils/numeros.py", "content": '''def dobro(n):
    return 2 * n


def media(valores):
    if not valores:
        return 0.0
    return sum(valores) / len(valores)
'''},
], r'''from utils.texto import gritar, eh_titulo
from utils.numeros import dobro, media
assert gritar("oi") == "OI!"
assert eh_titulo("Python") is True
assert eh_titulo("python") is False
assert dobro(21) == 42
assert media([2, 4]) == 3.0
assert media([]) == 0.0
r = relatorio("Ana", [1, 2, 3])
assert r == {"titulo": "ANA!", "valido": True, "dobros": [2, 4, 6], "media": 2.0}''')

L[22] = ("unittest", r'''
import unittest


def validar_senha(senha):
    if not isinstance(senha, str):
        raise TypeError("senha deve ser str")
    return (
        len(senha) >= 8
        and any(c.isdigit() for c in senha)
        and any(c.isupper() for c in senha)
    )


class TestValidarSenha(unittest.TestCase):
    def test_senha_valida(self):
        self.assertTrue(validar_senha("Python123"))

    def test_senha_curta(self):
        self.assertFalse(validar_senha("Py1"))

    def test_senha_sem_digito(self):
        self.assertFalse(validar_senha("PythonPython"))

    def test_tipo_errado(self):
        with self.assertRaises(TypeError):
            validar_senha(123)
''', r'''import unittest as _ut
_suite = _ut.TestLoader().loadTestsFromTestCase(TestValidarSenha)
assert _suite.countTestCases() >= 4, "implemente os 4 métodos de teste"
import io as _io
_res = _ut.TextTestRunner(stream=_io.StringIO()).run(_suite)
assert _res.wasSuccessful(), "seus testes devem passar contra a implementação correta"
assert "assertRaises" in _source, "use assertRaises no teste de tipo"
assert "assertTrue" in _source or "assertEqual" in _source
_bad_calls = 0
def _quebrada(senha):
    return True
import types as _types
_g = dict(globals())
_g["validar_senha"] = _quebrada
_src_tests = _source.split("class TestValidarSenha")[1]
_ns2 = {"unittest": _ut, "validar_senha": _quebrada}
exec("import unittest\nclass TestValidarSenha(unittest.TestCase):" + _src_tests.split(":", 1)[1], _ns2)
_suite2 = _ut.TestLoader().loadTestsFromTestCase(_ns2["TestValidarSenha"])
_res2 = _ut.TextTestRunner(stream=_io.StringIO()).run(_suite2)
assert not _res2.wasSuccessful(), "seus testes devem REPROVAR uma implementação quebrada (que aceita tudo)"''')

L[24] = ("Projeto Final", r'''
class TarefaInvalidaError(Exception):
    pass


class Tarefa:
    def __init__(self, titulo, prioridade=1):
        if not isinstance(titulo, str) or not titulo.strip():
            raise TarefaInvalidaError("título inválido")
        if not isinstance(prioridade, int) or prioridade < 1 or prioridade > 5:
            raise TarefaInvalidaError("prioridade inválida")
        self.titulo = titulo
        self.prioridade = prioridade
        self.concluida = False

    def concluir(self):
        self.concluida = True

    def __str__(self):
        marca = "X" if self.concluida else " "
        return f"[{marca}] {self.titulo}"


class Gerenciador:
    def __init__(self):
        self._tarefas = []

    def adicionar(self, tarefa):
        self._tarefas.append(tarefa)

    def __len__(self):
        return len(self._tarefas)

    @property
    def pendentes(self):
        return [t for t in self._tarefas if not t.concluida]

    @property
    def progresso(self):
        if not self._tarefas:
            return 0.0
        concluidas = sum(1 for t in self._tarefas if t.concluida)
        return 100 * concluidas / len(self._tarefas)

    def por_prioridade(self, minima):
        for t in self._tarefas:
            if t.prioridade >= minima:
                yield t

    def concluir_todas(self):
        for t in self._tarefas:
            t.concluir()
''', r'''import unittest
import types


class TestTarefa(unittest.TestCase):
    def test_criacao_valida(self):
        t = Tarefa("Estudar", 3)
        self.assertEqual(t.titulo, "Estudar")
        self.assertEqual(t.prioridade, 3)
        self.assertFalse(t.concluida)

    def test_prioridade_padrao(self):
        self.assertEqual(Tarefa("X").prioridade, 1)

    def test_titulo_invalido(self):
        with self.assertRaises(TarefaInvalidaError):
            Tarefa("")
        with self.assertRaises(TarefaInvalidaError):
            Tarefa(123)

    def test_prioridade_invalida(self):
        with self.assertRaises(TarefaInvalidaError):
            Tarefa("X", 0)
        with self.assertRaises(TarefaInvalidaError):
            Tarefa("X", 6)

    def test_concluir_e_str(self):
        t = Tarefa("Ler")
        self.assertEqual(str(t), "[ ] Ler")
        t.concluir()
        self.assertTrue(t.concluida)
        self.assertEqual(str(t), "[X] Ler")

    def test_excecao_customizada(self):
        self.assertTrue(issubclass(TarefaInvalidaError, Exception))


class TestGerenciador(unittest.TestCase):
    def setUp(self):
        self.g = Gerenciador()
        self.t1 = Tarefa("A", 1)
        self.t2 = Tarefa("B", 3)
        self.t3 = Tarefa("C", 5)
        for t in (self.t1, self.t2, self.t3):
            self.g.adicionar(t)

    def test_len(self):
        self.assertEqual(len(self.g), 3)
        self.assertEqual(len(Gerenciador()), 0)

    def test_pendentes(self):
        self.t1.concluir()
        pend = self.g.pendentes
        self.assertEqual(len(pend), 2)
        self.assertNotIn(self.t1, pend)

    def test_progresso(self):
        self.assertEqual(self.g.progresso, 0.0)
        self.t1.concluir()
        self.assertAlmostEqual(self.g.progresso, 100 / 3, places=1)
        self.assertEqual(Gerenciador().progresso, 0.0)

    def test_por_prioridade_generator(self):
        gen = self.g.por_prioridade(3)
        self.assertIsInstance(gen, types.GeneratorType)
        result = list(gen)
        self.assertEqual(result, [self.t2, self.t3])

    def test_concluir_todas(self):
        self.g.concluir_todas()
        self.assertEqual(self.g.progresso, 100.0)
        self.assertEqual(self.g.pendentes, [])''')


def evaluate(files, test_code):
    ns = {"__name__": "__main__"}
    tmp = tempfile.mkdtemp(prefix="verify_")
    entry_src = None
    for f in files:
        full = os.path.join(tmp, f["path"])
        os.makedirs(os.path.dirname(full), exist_ok=True)
        with open(full, "w", encoding="utf-8") as fh:
            fh.write(f["content"])
        if f["path"] == "main.py" or entry_src is None:
            entry_src = f["content"]
    sys.path.insert(0, tmp)
    old_cwd = os.getcwd()
    os.chdir(tmp)
    cap = io.StringIO()
    try:
        with contextlib.redirect_stdout(cap):
            exec(compile(entry_src, "main.py", "exec"), ns)
    except Exception as e:
        return False, ["EXEC ERROR: %s: %s" % (type(e).__name__, e)]
    finally:
        pass
    ns["_stdout"] = cap.getvalue()
    ns["_source"] = entry_src
    ns["AssertionError"] = builtins.AssertionError
    ns["unittest"] = unittest
    ns["__builtins__"] = builtins

    is_ut = bool(re.search(r"class\s+\w+\s*\(\s*unittest\.TestCase\s*\)", test_code))
    try:
        if is_ut:
            exec(compile(test_code, "<tests>", "exec"), ns)
            suite = unittest.TestSuite()
            loader = unittest.TestLoader()
            for obj in list(ns.values()):
                try:
                    if isinstance(obj, type) and issubclass(obj, unittest.TestCase) and obj is not unittest.TestCase:
                        suite.addTests(loader.loadTestsFromTestCase(obj))
                except Exception:
                    pass
            buf = io.StringIO()
            res = unittest.TextTestRunner(stream=buf, verbosity=2).run(suite)
            ok = res.wasSuccessful() and res.testsRun > 0
            details = ["%s: %s" % (t.id(), tb.strip().splitlines()[-1]) for t, tb in res.failures + res.errors]
            return ok, details
        else:
            with contextlib.redirect_stdout(io.StringIO()):
                exec(compile(test_code, "<tests>", "exec"), ns)
            return True, []
    except AssertionError as ae:
        return False, ["ASSERT FAIL: %s" % ae]
    except Exception as ge:
        return False, ["TEST ERROR: %s: %s" % (type(ge).__name__, ge)]
    finally:
        try:
            sys.path.remove(tmp)
        except ValueError:
            pass
        os.chdir(old_cwd)
        for m in [k for k, v in list(sys.modules.items())
                  if getattr(v, "__file__", None) and str(getattr(v, "__file__")).startswith(tmp)]:
            del sys.modules[m]


failed = 0
for order in sorted(L):
    title, sol, tests = L[order]
    files = sol if isinstance(sol, list) else [{"path": "main.py", "content": sol}]
    ok, details = evaluate(files, tests)
    if not ok:
        failed += 1
    print("[%s] %02d %s" % ("PASS" if ok else "FAIL", order, title))
    for d in details[:5]:
        print("        %s" % d)

print()
print("TODAS PASSARAM" if failed == 0 else "%d LIÇÕES FALHARAM" % failed)
sys.exit(1 if failed else 0)
