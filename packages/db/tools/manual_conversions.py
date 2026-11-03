"""
Conversões manuais dos gabaritos legados do curso Python Completo.

O conversor automático (convert_legacy_tests.py) só traduz asserts simples
(`f(literais) == literal`). O que sobra — objetos, exceções, arquivos, context
managers, generators, decorators, pacotes e a lição de unittest — era um caso
"legacy", que roda dentro do sandbox junto com o código do aluno. Aqui cada
bloco legado é reescrito à mão em casos declarativos que checam a MESMA coisa
(as dicas reaproveitam as mensagens dos asserts originais):

  CASES[ordem]           casos que substituem o caso legado da lição;
  PATCHES[ordem]         ajustes em casos gerados automaticamente (ex.: o
                         assert original comparava com uma tupla, então o
                         retorno precisa ser tuple, não list);
  WRONG_SOLUTIONS[ordem] soluções erradas plausíveis (trocas pontuais na
                         solução de referência) que a verificação do seed
                         exige REPROVADAS — prova de que os casos novos não são
                         mais fracos que os asserts antigos.
"""

FLOAT_TOLERANCE = 1e-6


def with_extras(case, hint=None, **extras):
    if hint:
        case["hint"] = hint
    case.update({key: value for key, value in extras.items() if value is not None})
    return case


def expr(case_id, name, expression, setup="", hint=None, **expectations):
    """Caso `expr`: preparação opcional + expressão; expectativas: expected/type/raises/..."""
    case = {"id": case_id, "kind": "expr", "name": name, "expr": expression}
    if setup:
        case["setup"] = setup
    return with_extras(case, hint, **expectations)


def call(case_id, function, args, expected, hint=None, **extras):
    name = "%s(%s)" % (function, ", ".join(repr_json(arg) for arg in args))
    case = {"id": case_id, "kind": "call", "function": function, "args": args, "kwargs": {}, "expected": expected, "name": name}
    return with_extras(case, hint, **extras)


def source(case_id, name, rule, hint=None):
    return with_extras({"id": case_id, "kind": "source", "name": name, "rule": rule}, hint)


def suite(case_id, name, expect, hint=None, implementation=None, **extras):
    case = {"id": case_id, "kind": "unittest", "name": name, "expect": expect}
    if implementation is not None:
        case["target"] = "validar_senha"
        case["implementation"] = implementation
    return with_extras(case, hint, **extras)


def repr_json(value):
    if isinstance(value, str):
        return '"%s"' % value
    return repr(value)


def wrong(name, *replacements, path="main.py"):
    """Solução errada = referência com trocas (texto antigo -> novo) em um arquivo."""
    return {"name": name, "path": path, "replacements": list(replacements)}


# ── Lição 22: implementações contra as quais a suíte do aluno roda ──────────

PASSWORD_REFERENCE = '''def validar_senha(senha):
    if not isinstance(senha, str):
        raise TypeError("senha deve ser str")
    return (
        len(senha) >= 8
        and any(c.isdigit() for c in senha)
        and any(c.isupper() for c in senha)
    )
'''
PASSWORD_ACCEPTS_ALL = '''def validar_senha(senha):
    return True
'''
PASSWORD_REJECTS_ALL = '''def validar_senha(senha):
    if not isinstance(senha, str):
        raise TypeError("senha deve ser str")
    return False
'''
PASSWORD_IGNORES_DIGITS = '''def validar_senha(senha):
    if not isinstance(senha, str):
        raise TypeError("senha deve ser str")
    return len(senha) >= 8 and any(c.isupper() for c in senha)
'''
PASSWORD_IGNORES_LENGTH = '''def validar_senha(senha):
    if not isinstance(senha, str):
        raise TypeError("senha deve ser str")
    return any(c.isdigit() for c in senha) and any(c.isupper() for c in senha)
'''
PASSWORD_NO_TYPE_ERROR = '''def validar_senha(senha):
    if not isinstance(senha, str):
        return False
    return (
        len(senha) >= 8
        and any(c.isdigit() for c in senha)
        and any(c.isupper() for c in senha)
    )
'''

# ── Lição 24: gerenciador com três tarefas, como no setUp do teste original ──

TASK_MANAGER_SETUP = '''g = Gerenciador()
t1 = Tarefa("A", 1)
t2 = Tarefa("B", 3)
t3 = Tarefa("C", 5)
for t in (t1, t2, t3):
    g.adicionar(t)'''

ACCOUNT_SETUP = 'c = ContaBancaria("Ana", 100)'
CART_SETUP = '''c = Carrinho()
c.adicionar("caneta", 2.5)
c.adicionar("caderno", 10.0)
c2 = Carrinho()
c2.adicionar("caneta", 2.5)
c2.adicionar("caderno", 10.0)'''
STUDENTS_SETUP = '_alunos = [{"nome": "Ana", "nota": 9}, {"nome": "Bia", "nota": 5}, {"nome": "Caio", "nota": 7}]'

CASES = {
    4: [
        source("fonte11", "Não usa max()", {"type": "not_calls", "name": "max"}, hint="não use a função max()"),
    ],
    5: [
        call("chamada9", "tabuada", [7], [7, 14, 21, 28, 35, 42, 49, 56, 63, 70], hint="a tabuada tem 10 múltiplos"),
    ],
    6: [
        source("fonte6", "Não usa min()", {"type": "not_calls", "name": "min"}, hint="não use min() nem max()"),
        source("fonte7", "Não usa max()", {"type": "not_calls", "name": "max"}, hint="não use min() nem max()"),
        call("chamada8", "aplicar_desconto", [100], 90.0, hint="desconto padrão é 10%", tolerance=FLOAT_TOLERANCE),
        call("chamada9", "aplicar_desconto", [200, 50], 100.0, tolerance=FLOAT_TOLERANCE),
        call("chamada10", "aplicar_desconto", [80, 0], 80.0, tolerance=FLOAT_TOLERANCE),
    ],
    8: [
        call("chamada7", "em_comum", [[1, 2, 3], [2, 3, 4]], [2, 3], type="set", hint="devolva um set com os elementos em comum"),
        call("chamada8", "em_comum", [[1], [2]], [], type="set", hint="sem elementos em comum: set() vazio"),
    ],
    9: [
        expr("arquivo1", "salvar_lista e ler_linhas (ida e volta)", 'ler_linhas("teste_a.txt")',
             setup='salvar_lista("teste_a.txt", ["um", "dois", "três"])', expected=["um", "dois", "três"], type="list"),
        expr("arquivo2", "Lista vazia gera arquivo vazio", 'ler_linhas("teste_b.txt")',
             setup='salvar_lista("teste_b.txt", [])', expected=[], type="list"),
        expr("arquivo3", "salvar_lista grava um item por linha", 'open("teste_d.txt", encoding="utf-8").read().splitlines()',
             setup='salvar_lista("teste_d.txt", ["x", "y"])', expected=["x", "y"], hint="cada item em uma linha do arquivo"),
        expr("arquivo4", "ler_linhas lê um arquivo existente", 'ler_linhas("teste_e.txt")',
             setup='with open("teste_e.txt", "w", encoding="utf-8") as _f:\n    _f.write("p\\nq\\n")',
             expected=["p", "q"], hint="remova o \\n do fim de cada linha"),
        expr("arquivo5", "contar_linhas_nao_vazias", 'contar_linhas_nao_vazias("teste_c.txt")',
             setup='with open("teste_c.txt", "w") as _f:\n    _f.write("a\\n\\n  \\nb\\n")', expected=2,
             hint="linhas em branco não contam"),
        source("fonte6", "Usa with para abrir arquivos", {"type": "uses", "construct": "with"}, hint="use o bloco with para abrir arquivos"),
    ],
    10: [
        expr("objeto1", "Atributos guardados no __init__", "(r.largura, r.altura)", setup="r = Retangulo(3, 4)",
             expected=[3, 4], hint="guarde os atributos no __init__"),
        expr("objeto2", "area() de 3x4", "Retangulo(3, 4).area()", expected=12),
        expr("objeto3", "perimetro() de 3x4", "Retangulo(3, 4).perimetro()", expected=14),
        expr("objeto4", "3x4 não é quadrado", "Retangulo(3, 4).eh_quadrado()", expected=False, type="bool"),
        expr("objeto5", "area() de 5x5", "Retangulo(5, 5).area()", expected=25),
        expr("objeto6", "5x5 é quadrado", "Retangulo(5, 5).eh_quadrado()", expected=True, type="bool"),
    ],
    11: [
        expr("heranca1", "salario_anual do Funcionario", 'Funcionario("Ana", 3000).salario_anual()', expected=36000),
        expr("heranca2", "descricao do Funcionario", 'Funcionario("Ana", 3000).descricao()', expected="Ana ganha R$3000 por mês"),
        expr("heranca3", "salario_anual do Gerente", 'Gerente("Bia", 5000, 10000).salario_anual()', expected=70000,
             hint="12 * 5000 + 10000"),
        expr("heranca4", "Gerente herda os atributos", 'Gerente("Bia", 5000, 10000).nome', expected="Bia",
             hint="Gerente deve herdar os atributos via super()"),
        expr("heranca5", "descricao herdada pelo Gerente", 'Gerente("Bia", 5000, 10000).descricao()',
             expected="Bia ganha R$5000 por mês", hint="descricao é herdada, não reescreva"),
        expr("heranca6", "Gerente é subclasse de Funcionario", "issubclass(Gerente, Funcionario)", expected=True,
             type="bool", hint="Gerente deve herdar de Funcionario"),
        expr("heranca7", "Um Gerente também é Funcionario", 'isinstance(Gerente("Bia", 5000, 10000), Funcionario)',
             expected=True, type="bool", hint="um Gerente também é Funcionario (polimorfismo)"),
        source("fonte8", "Usa super()", {"type": "calls", "name": "super"}, hint="use super() no __init__ do Gerente"),
    ],
    12: [
        expr("conta1", "Saldo inicial", "c.saldo", setup=ACCOUNT_SETUP, expected=100),
        expr("conta2", "depositar soma ao saldo", "c.saldo", setup=ACCOUNT_SETUP + "\nc.depositar(50)", expected=150),
        expr("conta3", "sacar desconta do saldo", "c.saldo", setup=ACCOUNT_SETUP + "\nc.depositar(50)\nc.sacar(30)", expected=120),
        expr("conta4", "Depósito negativo é recusado", "c.depositar(-10)", setup=ACCOUNT_SETUP, raises="ValueError",
             hint="depositar valor negativo deve levantar ValueError"),
        expr("conta5", "Saque acima do saldo é recusado", "c.sacar(999)", setup=ACCOUNT_SETUP, raises="ValueError",
             message_contains="insuficiente", hint="sacar mais que o saldo deve levantar ValueError('saldo insuficiente')"),
        expr("conta6", "saldo é somente leitura", 'setattr(c, "saldo", 99999)', setup=ACCOUNT_SETUP, raises="AttributeError",
             hint="saldo deve ser somente leitura (property sem setter)"),
        source("fonte7", "Usa @property", {"type": "decorator", "name": "property"}, hint="use o decorator @property"),
    ],
    13: [
        expr("dunder1", "len() do carrinho", "len(c)", setup=CART_SETUP, expected=2, hint="len(carrinho) deve funcionar via __len__"),
        expr("dunder2", "total()", "c.total()", setup=CART_SETUP, expected=12.5),
        expr("dunder3", "str() do carrinho", "str(c)", setup=CART_SETUP, expected="Carrinho: 2 itens, total R$12.50"),
        expr("dunder4", "Carrinhos iguais", "bool(c == c2)", setup=CART_SETUP, expected=True,
             hint="carrinhos com mesmos itens devem ser iguais via __eq__"),
        expr("dunder5", "Carrinhos diferentes", "bool(c != c2)", setup=CART_SETUP + '\nc2.adicionar("borracha", 1.0)', expected=True),
        expr("dunder6", "Carrinho vazio", "(len(v), v.total())", setup="v = Carrinho()", expected=[0, 0]),
    ],
    14: [
        source("fonte9", "Captura ValueError", {"type": "catches", "exception": "ValueError"}, hint="capture ValueError especificamente"),
        source("fonte10", "Captura ZeroDivisionError", {"type": "catches", "exception": "ZeroDivisionError"},
               hint="capture ZeroDivisionError especificamente"),
        source("fonte11", "Captura KeyError", {"type": "catches", "exception": "KeyError"}, hint="capture KeyError especificamente"),
    ],
    15: [
        expr("excecao1", "NomeCurtoError é uma Exception", "issubclass(NomeCurtoError, Exception)", expected=True, type="bool"),
        expr("excecao2", "IdadeInvalidaError é uma Exception", "issubclass(IdadeInvalidaError, Exception)", expected=True, type="bool"),
        call("chamada3", "registrar_usuario", ["Ana", 20], {"nome": "Ana", "idade": 20}),
        expr("excecao4", "Nome curto", 'registrar_usuario("Al", 20)', raises="NomeCurtoError",
             hint="nome com 2 letras deve levantar NomeCurtoError"),
        expr("excecao5", "Idade negativa", 'registrar_usuario("Carlos", -1)', raises="IdadeInvalidaError",
             hint="idade negativa deve levantar IdadeInvalidaError"),
        expr("excecao6", "Idade acima de 130", 'registrar_usuario("Carlos", 131)', raises="IdadeInvalidaError",
             hint="idade 131 deve levantar IdadeInvalidaError"),
        expr("excecao7", "Idade 0 é válida", 'registrar_usuario("Bia", 0)["idade"]', expected=0, hint="0 é idade válida"),
        expr("excecao8", "Idade 130 é válida", 'registrar_usuario("Zoe", 130)["idade"]', expected=130, hint="130 é idade válida"),
    ],
    16: [
        expr("contexto1", "Eventos do bloco with", "s.eventos",
             setup='with Sessao("db") as s:\n    s.registrar("consulta executada")',
             expected=["abriu: db", "consulta executada", "fechou: db"]),
        expr("contexto2", "A exceção continua subindo", "None",
             setup='s2 = Sessao("api")\nwith s2:\n    raise ValueError("boom")', raises="ValueError",
             hint="a exceção deve continuar subindo (não retorne True no __exit__)"),
        expr("contexto3", "__exit__ roda mesmo com exceção", "s2.eventos",
             setup='s2 = Sessao("api")\ntry:\n    with s2:\n        raise ValueError("boom")\nexcept ValueError:\n    pass',
             expected=["abriu: api", "fechou: api"], hint="__exit__ deve rodar mesmo com exceção"),
        source("fonte4", "Define __enter__", {"type": "defines_function", "name": "__enter__"}),
        source("fonte5", "Define __exit__", {"type": "defines_function", "name": "__exit__"}),
    ],
    17: [
        source("fonte7", "quadrados_dos_impares usa list comprehension",
               {"type": "uses", "construct": "list_comprehension", "function": "quadrados_dos_impares"},
               hint="use comprehensions (com for) nas três funções"),
        source("fonte8", "mapa_de_tamanhos usa dict comprehension",
               {"type": "uses", "construct": "dict_comprehension", "function": "mapa_de_tamanhos"},
               hint="use comprehensions (com for) nas três funções"),
        source("fonte9", "achatar usa list comprehension", {"type": "uses", "construct": "list_comprehension", "function": "achatar"},
               hint="use comprehensions (com for) nas três funções"),
        source("fonte10", "Sem laço for comum", {"type": "not_uses", "construct": "for"}, hint="use comprehensions em vez de laços for"),
        source("fonte11", "Sem append", {"type": "not_calls", "name": "append"}, hint="sem append — use comprehensions"),
    ],
    18: [
        expr("funcional1", "apenas_aprovados", '[a["nome"] for a in apenas_aprovados(_alunos)]', setup=STUDENTS_SETUP,
             expected=["Ana", "Caio"]),
        expr("funcional2", "ordenar_por_nota (maior primeiro)", '[a["nome"] for a in ordenar_por_nota(_alunos)]',
             setup=STUDENTS_SETUP, expected=["Ana", "Caio", "Bia"]),
        source("fonte5", "Usa lambda", {"type": "uses", "construct": "lambda"}, hint="use lambda"),
        source("fonte6", "Usa map()", {"type": "calls", "name": "map"}, hint="use map() na conversão"),
        source("fonte7", "Usa filter()", {"type": "calls", "name": "filter"}, hint="use filter() nos aprovados"),
    ],
    19: [
        expr("decorator1", "contar_chamadas conta as chamadas", "somar.chamadas", setup="somar(2, 3)\nsomar(1, 1)\nsomar(0, 0)",
             expected=3, hint="wrapper.chamadas deve contar as chamadas"),
        call("chamada3", "raiz_aproximada", [9], 3.0, tolerance=FLOAT_TOLERANCE),
        expr("decorator4", "validar_positivos recusa negativos", "raiz_aproximada(-4)", raises="ValueError",
             hint="argumento negativo deve levantar ValueError"),
        expr("decorator5", "contar_chamadas funciona em qualquer função", "_nula.chamadas",
             setup="@contar_chamadas\ndef _nula():\n    return None\n_nula()", expected=1,
             hint="o decorator deve funcionar em qualquer função"),
    ],
    20: [
        expr("gerador1", "pares_ate é um generator", "pares_ate(4)", type="generator",
             hint="use yield — a função deve ser um generator"),
        expr("gerador2", "pares_ate(8)", "list(pares_ate(8))", expected=[0, 2, 4, 6, 8]),
        expr("gerador3", "pares_ate(0)", "list(pares_ate(0))", expected=[0]),
        expr("gerador4", "fibonacci(6)", "list(fibonacci(6))", expected=[0, 1, 1, 2, 3, 5]),
        expr("gerador5", "fibonacci(1)", "list(fibonacci(1))", expected=[0]),
        expr("gerador6", "fibonacci(0)", "list(fibonacci(0))", expected=[]),
        expr("gerador7", "numerar a partir de 1", 'list(numerar(["a", "b", "c"]))', expected=[[1, "a"], [2, "b"], [3, "c"]]),
        expr("gerador8", "numerar produz tuplas", 'sorted({type(par).__name__ for par in numerar(["a", "b"])})', expected=["tuple"],
             hint="cada item deve ser uma tupla (posição, valor)"),
        expr("gerador9", "numerar([])", "list(numerar([]))", expected=[]),
        expr("gerador10", "next() avança o generator", "[next(g), next(g)]", setup="g = pares_ate(100)", expected=[0, 2],
             hint="next() deve funcionar"),
        source("fonte11", "Usa yield", {"type": "uses", "construct": "yield"}, hint="use yield"),
    ],
    21: [
        expr("modulo1", "utils.texto.gritar", 'gritar("oi")', setup="from utils.texto import gritar", expected="OI!"),
        expr("modulo2", "eh_titulo com maiúscula", 'eh_titulo("Python")', setup="from utils.texto import eh_titulo",
             expected=True, type="bool"),
        expr("modulo3", "eh_titulo com minúscula", 'eh_titulo("python")', setup="from utils.texto import eh_titulo",
             expected=False, type="bool"),
        expr("modulo4", "utils.numeros.dobro", "dobro(21)", setup="from utils.numeros import dobro", expected=42),
        expr("modulo5", "utils.numeros.media", "media([2, 4])", setup="from utils.numeros import media", expected=3.0),
        expr("modulo6", "media de lista vazia", "media([])", setup="from utils.numeros import media", expected=0.0),
        call("chamada7", "relatorio", ["Ana", [1, 2, 3]], {"titulo": "ANA!", "valido": True, "dobros": [2, 4, 6], "media": 2.0}),
        source("fonte8", "main.py usa o pacote utils", {"type": "imports", "module": "utils"}, hint="importe as funções do pacote utils"),
    ],
    22: [
        suite("suite1", "Seus testes passam com a implementação correta", "pass", implementation=PASSWORD_REFERENCE,
              test_class="TestValidarSenha", min_tests=4,
              hint="implemente os 4 métodos de teste; eles devem passar contra a implementação correta"),
        suite("suite2", "Seus testes passam com a sua validar_senha", "pass", test_class="TestValidarSenha",
              hint="sua validar_senha e seus testes precisam concordar"),
        suite("suite3", "Detecta implementação que aceita tudo", "fail", implementation=PASSWORD_ACCEPTS_ALL,
              test_class="TestValidarSenha", hint="seus testes devem REPROVAR uma implementação quebrada (que aceita tudo)"),
        suite("suite4", "Detecta implementação que recusa tudo", "fail", implementation=PASSWORD_REJECTS_ALL,
              test_class="TestValidarSenha", hint="teste uma senha válida com assertTrue (ou assertEqual)"),
        suite("suite5", "Detecta quem ignora o dígito", "fail", implementation=PASSWORD_IGNORES_DIGITS,
              test_class="TestValidarSenha", hint="test_senha_sem_digito deve usar uma senha longa, com maiúscula e sem dígito"),
        suite("suite6", "Detecta quem ignora o tamanho", "fail", implementation=PASSWORD_IGNORES_LENGTH,
              test_class="TestValidarSenha", hint="test_senha_curta deve usar uma senha curta com dígito e maiúscula (ex.: 'Py1')"),
        suite("suite7", "Detecta quem não levanta TypeError", "fail", implementation=PASSWORD_NO_TYPE_ERROR,
              test_class="TestValidarSenha", hint="use assertRaises(TypeError) no teste de tipo"),
        source("fonte8", "Usa assertRaises", {"type": "calls", "name": "assertRaises"}, hint="use assertRaises no teste de tipo"),
    ],
    24: [
        expr("tarefa1", "Criação de Tarefa", "(t.titulo, t.prioridade, bool(t.concluida))", setup='t = Tarefa("Estudar", 3)',
             expected=["Estudar", 3, False]),
        expr("tarefa2", "Prioridade padrão", 'Tarefa("X").prioridade', expected=1),
        expr("tarefa3", "Título vazio é inválido", 'Tarefa("")', raises="TarefaInvalidaError"),
        expr("tarefa4", "Título que não é texto é inválido", "Tarefa(123)", raises="TarefaInvalidaError"),
        expr("tarefa5", "Prioridade 0 é inválida", 'Tarefa("X", 0)', raises="TarefaInvalidaError"),
        expr("tarefa6", "Prioridade 6 é inválida", 'Tarefa("X", 6)', raises="TarefaInvalidaError"),
        expr("tarefa7", "str() de tarefa pendente", 'str(Tarefa("Ler"))', expected="[ ] Ler"),
        expr("tarefa8", "concluir() e str() de tarefa concluída", "(bool(t.concluida), str(t))",
             setup='t = Tarefa("Ler")\nt.concluir()', expected=[True, "[X] Ler"]),
        expr("tarefa9", "TarefaInvalidaError é uma Exception", "issubclass(TarefaInvalidaError, Exception)", expected=True, type="bool"),
        expr("gerenciador1", "len() do gerenciador", "(len(g), len(Gerenciador()))", setup=TASK_MANAGER_SETUP, expected=[3, 0]),
        expr("gerenciador2", "pendentes", "(len(g.pendentes), t1 in g.pendentes)", setup=TASK_MANAGER_SETUP + "\nt1.concluir()",
             expected=[2, False]),
        expr("gerenciador3", "progresso sem tarefas concluídas", "(g.progresso, Gerenciador().progresso)",
             setup=TASK_MANAGER_SETUP, expected=[0.0, 0.0]),
        expr("gerenciador4", "progresso com 1 de 3 concluídas", "g.progresso", setup=TASK_MANAGER_SETUP + "\nt1.concluir()",
             expected=33.33, tolerance=0.05),
        expr("gerenciador5", "por_prioridade é um generator", "g.por_prioridade(3)", setup=TASK_MANAGER_SETUP, type="generator"),
        expr("gerenciador6", "por_prioridade(3) devolve as tarefas certas",
             "([t.titulo for t in g.por_prioridade(3)], list(g.por_prioridade(3)) == [t2, t3])",
             setup=TASK_MANAGER_SETUP, expected=[["B", "C"], True]),
        expr("gerenciador7", "concluir_todas: progresso 100", "g.progresso", setup=TASK_MANAGER_SETUP + "\ng.concluir_todas()",
             expected=100.0),
        expr("gerenciador8", "concluir_todas: nenhuma pendente", "g.pendentes", setup=TASK_MANAGER_SETUP + "\ng.concluir_todas()",
             expected=[], type="list"),
    ],
}

PATCHES = {
    6: {
        # assert minimo_e_maximo(...) == (1, 5): uma lista não seria igual à tupla.
        "chamada3": {"type": "tuple"},
        "chamada4": {"type": "tuple"},
        "chamada5": {"type": "tuple"},
    },
}

WRONG_SOLUTIONS = {
    2: [
        wrong("versao como texto", ("versao = 3.12", 'versao = "3.12"')),
        wrong("sem f-string", ('print(f"Aprendendo {linguagem} {versao}")', 'print("Aprendendo " + linguagem + " " + str(versao))')),
    ],
    3: [
        wrong("eh_par devolve int", ("return n % 2 == 0", "return 1 if n % 2 == 0 else 0")),
        wrong("intervalo aberto", ("return minimo <= x <= maximo", "return minimo < x < maximo")),
    ],
    4: [
        wrong("maior_de_tres com max()", ("    if a >= b and a >= c:\n        return a\n    elif b >= a and b >= c:\n        return b\n    else:\n        return c",
                                          "    return max(a, b, c)")),
        wrong("12 ainda é criança", ("if idade < 12:", "if idade <= 12:")),
    ],
    5: [
        wrong("tabuada só até 9", ("for i in range(1, 11):", "for i in range(1, 10):")),
        wrong("contagem inclui o zero", ("while n > 0:", "while n >= 0:")),
        wrong("somar_pares sem o limite", ("range(0, limite + 1, 2)", "range(0, limite, 2)")),
    ],
    6: [
        wrong("minimo_e_maximo devolve lista", ("return (menor, maior)", "return [menor, maior]")),
        wrong("usa min() e max()", ("    menor = numeros[0]\n    maior = numeros[0]\n    for n in numeros:\n        if n < menor:\n            menor = n\n        if n > maior:\n            maior = n\n    return (menor, maior)",
                                     "    return (min(numeros), max(numeros))")),
        wrong("desconto padrão errado", ("percentual=10", "percentual=20")),
    ],
    7: [
        wrong("zero conta como positivo", ("if n > 0:", "if n >= 0:")),
        wrong("vogais só minúsculas", ("for ch in texto.lower():", "for ch in texto:")),
    ],
    8: [
        wrong("em_comum devolve lista", ("return set(lista_a) & set(lista_b)", "return sorted(set(lista_a) & set(lista_b))")),
        wrong("em_comum faz a união", ("return set(lista_a) & set(lista_b)", "return set(lista_a) | set(lista_b)")),
        wrong("notas_altas sem ordenar", ("return sorted([nome for nome, nota in alunos.items() if nota >= corte])",
                                          "return [nome for nome, nota in alunos.items() if nota >= corte]")),
    ],
    9: [
        wrong("ler_linhas mantém o \\n", ('return [l.rstrip("\\n") for l in f]', "return list(f)")),
        wrong("salvar_lista sem quebra de linha", ('f.write(f"{item}\\n")', "f.write(item)")),
        wrong("abre arquivos sem with", ('    with open(nome_arquivo, "w") as f:\n        for item in itens:\n            f.write(f"{item}\\n")',
                                         '    f = open(nome_arquivo, "w")\n    for item in itens:\n        f.write(f"{item}\\n")\n    f.close()'),
              ('    with open(nome_arquivo) as f:\n        return [l.rstrip("\\n") for l in f]',
               '    f = open(nome_arquivo)\n    linhas = [l.rstrip("\\n") for l in f]\n    f.close()\n    return linhas'),
              ("    with open(nome_arquivo) as f:\n        for linha in f:\n            if linha.strip():\n                total += 1",
               "    f = open(nome_arquivo)\n    for linha in f:\n        if linha.strip():\n            total += 1\n    f.close()")),
        wrong("salvar e ler em JSON (formato errado)", ('    with open(nome_arquivo, "w") as f:\n        for item in itens:\n            f.write(f"{item}\\n")',
                                                         '    import json\n    with open(nome_arquivo, "w") as f:\n        json.dump(itens, f)'),
              ('    with open(nome_arquivo) as f:\n        return [l.rstrip("\\n") for l in f]',
               '    import json\n    with open(nome_arquivo) as f:\n        texto = f.read()\n    try:\n        return json.loads(texto)\n    except ValueError:\n        return [l for l in texto.split("\\n") if l]')),
        wrong("conta linhas em branco", ("            if linha.strip():\n                total += 1", "            total += 1")),
    ],
    10: [
        wrong("perímetro sem dobrar", ("return 2 * (self.largura + self.altura)", "return self.largura + self.altura")),
        wrong("eh_quadrado devolve int", ("return self.largura == self.altura", "return int(self.largura == self.altura)")),
        wrong("atributos com outro nome", ("        self.largura = largura\n        self.altura = altura",
                                           "        self.l = largura\n        self.a = altura\n        self.largura_x = largura"),
              ("return self.largura * self.altura", "return self.l * self.a"),
              ("return 2 * (self.largura + self.altura)", "return 2 * (self.l + self.a)"),
              ("return self.largura == self.altura", "return self.l == self.a")),
    ],
    11: [
        wrong("Gerente não herda (classe copiada)", ("class Gerente(Funcionario):\n    def __init__(self, nome, salario, bonus):\n        super().__init__(nome, salario)\n        self.bonus = bonus\n\n    def salario_anual(self):\n        return super().salario_anual() + self.bonus",
                                                     "class Gerente:\n    def __init__(self, nome, salario, bonus):\n        self.nome = nome\n        self.salario = salario\n        self.bonus = bonus\n\n    def salario_anual(self):\n        return self.salario * 12 + self.bonus\n\n    def descricao(self):\n        return f\"{self.nome} ganha R${self.salario} por mês\"")),
        wrong("Gerente esquece o bônus", ("return super().salario_anual() + self.bonus", "return super().salario_anual()")),
        wrong("Gerente sem super() no __init__", ("        super().__init__(nome, salario)\n        self.bonus = bonus",
                                                  "        self.salario = salario\n        self.bonus = bonus")),
    ],
    12: [
        wrong("saldo é atributo público", ("    @property\n    def saldo(self):\n        return self._saldo\n", ""),
              ("self._saldo = saldo_inicial", "self._saldo = saldo_inicial\n        self.saldo = saldo_inicial"),
              ("self._saldo += valor", "self._saldo += valor\n        self.saldo = self._saldo"),
              ("self._saldo -= valor", "self._saldo -= valor\n        self.saldo = self._saldo")),
        wrong("aceita depósito negativo", ("        if valor <= 0:\n            raise ValueError(\"valor inválido\")\n        self._saldo += valor",
                                           "        self._saldo += valor")),
        wrong("mensagem de saque errada", ('raise ValueError("saldo insuficiente")', 'raise ValueError("sem dinheiro")')),
        wrong("property com setter", ("    def depositar(self, valor):",
                                      "    @saldo.setter\n    def saldo(self, valor):\n        self._saldo = valor\n\n    def depositar(self, valor):")),
    ],
    13: [
        wrong("sem __eq__ (compara identidade)", ("    def __eq__(self, outro):\n        return self.itens == outro.itens\n", "")),
        wrong("__eq__ sempre verdadeiro", ("return self.itens == outro.itens", "return True")),
        wrong("total sem duas casas", ("total R${self.total():.2f}", "total R${self.total()}")),
        wrong("sem __len__", ("    def __len__(self):\n        return len(self.itens)\n", ""),
              ("{len(self)} itens", "{len(self.itens)} itens")),
    ],
    14: [
        wrong("except genérico", ("    except ValueError:\n        return padrao", "    except Exception:\n        return padrao")),
        wrong("if no lugar do try", ("    try:\n        return a / b\n    except ZeroDivisionError:\n        return None",
                                     "    if b == 0:\n        return None\n    return a / b")),
        wrong("dict.get no lugar do try", ("    try:\n        return dicionario[chave]\n    except KeyError:\n        return \"não encontrado\"",
                                           "    return dicionario.get(chave, \"não encontrado\")")),
    ],
    15: [
        wrong("idade 0 recusada", ("if idade < 0 or idade > 130:", "if idade <= 0 or idade > 130:")),
        wrong("ValueError no lugar da exceção customizada", ('raise NomeCurtoError("nome muito curto")', 'raise ValueError("nome muito curto")')),
        wrong("exceções sem herdar de Exception", ("class NomeCurtoError(Exception):\n    pass", "class NomeCurtoError:\n    pass")),
        wrong("idade 130 recusada", ("idade > 130", "idade >= 130")),
    ],
    16: [
        wrong("__exit__ engole a exceção", ("        self.eventos.append(f\"fechou: {self.nome}\")\n        return False",
                                            "        self.eventos.append(f\"fechou: {self.nome}\")\n        return True")),
        wrong("__enter__ não devolve self", ("        self.eventos.append(f\"abriu: {self.nome}\")\n        return self",
                                             "        self.eventos.append(f\"abriu: {self.nome}\")")),
        wrong("__exit__ não registra", ("        self.eventos.append(f\"fechou: {self.nome}\")\n", "")),
    ],
    17: [
        wrong("laço com append", ("    return [x**2 for x in numeros if x % 2 != 0]",
                                  "    resultado = []\n    for x in numeros:\n        if x % 2 != 0:\n            resultado.append(x**2)\n    return resultado")),
        wrong("achatar com sum()", ("    return [x for linha in matriz for x in linha]", "    return sum(matriz, [])")),
        wrong("mapa com dict()", ("    return {p: len(p) for p in palavras if len(p) >= 3}",
                                  "    return dict(zip([p for p in palavras if len(p) >= 3], [len(p) for p in palavras if len(p) >= 3]))")),
    ],
    18: [
        wrong("aprovados com list comprehension", ('return list(filter(lambda a: a["nota"] >= 7, alunos))',
                                                   'return [a for a in alunos if a["nota"] >= 7]')),
        wrong("ordem crescente", ('return sorted(alunos, key=lambda a: a["nota"], reverse=True)', 'return sorted(alunos, key=lambda a: a["nota"])')),
        wrong("nota 7 reprovada", ('a["nota"] >= 7', 'a["nota"] > 7')),
    ],
    19: [
        wrong("contador em variável global", ("    def wrapper(*args, **kwargs):\n        wrapper.chamadas += 1\n        return func(*args, **kwargs)\n    wrapper.chamadas = 0\n    return wrapper",
                                              "    def wrapper(*args, **kwargs):\n        global total_chamadas\n        total_chamadas += 1\n        return func(*args, **kwargs)\n    return wrapper"),
              ("def validar_positivos(func):", "total_chamadas = 0\n\n\ndef validar_positivos(func):")),
        wrong("validar_positivos não levanta", ('            raise ValueError("argumento negativo")', "            return None")),
        wrong("contador começa em 1", ("    wrapper.chamadas = 0", "    wrapper.chamadas = 1")),
    ],
    20: [
        wrong("pares_ate devolve lista", ("    for i in range(0, limite + 1, 2):\n        yield i", "    return list(range(0, limite + 1, 2))")),
        wrong("fibonacci começa em 1", ("    a, b = 0, 1", "    a, b = 1, 1")),
        wrong("numerar produz listas", ("yield (i, item)", "yield [i, item]")),
        wrong("numerar a partir de 0", ("enumerate(itens, start=1)", "enumerate(itens)")),
    ],
    21: [
        wrong("gritar sem exclamação", ('return texto.upper() + "!"', "return texto.upper()"), path="utils/texto.py"),
        wrong("media de lista vazia quebra", ("    if not valores:\n        return 0.0\n", ""), path="utils/numeros.py"),
        wrong("dobro eleva ao quadrado", ("return 2 * n", "return n * n"), path="utils/numeros.py"),
    ],
    22: [
        wrong("testes vazios", ('        self.assertFalse(validar_senha("Py1"))', "        pass"),
              ('        self.assertFalse(validar_senha("PythonPython"))', "        pass"),
              ("        with self.assertRaises(TypeError):\n            validar_senha(123)", "        pass")),
        wrong("validar_senha sem checar dígito", ("        and any(c.isdigit() for c in senha)\n", "")),
        wrong("só três testes", ("    def test_tipo_errado(self):\n        with self.assertRaises(TypeError):\n            validar_senha(123)\n", "")),
        wrong("teste de tipo com assertFalse", ("        with self.assertRaises(TypeError):\n            validar_senha(123)",
                                                "        self.assertFalse(validar_senha(123))")),
        wrong("senha curta sem dígito nem maiúscula", ('validar_senha("Py1")', 'validar_senha("abc")')),
    ],
    24: [
        wrong("prioridade 6 aceita", ("prioridade > 5", "prioridade > 6")),
        wrong("progresso de 0 a 1", ("return 100 * concluidas / len(self._tarefas)", "return concluidas / len(self._tarefas)")),
        wrong("por_prioridade devolve lista", ("        for t in self._tarefas:\n            if t.prioridade >= minima:\n                yield t",
                                               "        return [t for t in self._tarefas if t.prioridade >= minima]")),
        wrong("marca minúscula", ('marca = "X" if self.concluida else " "', 'marca = "x" if self.concluida else " "')),
        wrong("título numérico aceito", ("not isinstance(titulo, str) or not titulo.strip()", "not str(titulo).strip()")),
    ],
}
