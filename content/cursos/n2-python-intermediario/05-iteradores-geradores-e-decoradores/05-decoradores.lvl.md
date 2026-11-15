---
slug: n2-m5-05-decoradores
titulo: Decoradores
descricao: 'Funções que embrulham funções: @cronometrar, @registrar, @cache, functools.wraps e decoradores com parâmetros.'
dificuldade: intermediario
tipo: guiada
runtime: python
bibliotecas: []
xp: 130
tempo_min: 55
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Escrever um decorador que envolve uma função preservando nome e docstring com functools.wraps
- Explicar a equivalência entre @d e f = d(f)
- Criar decoradores com parâmetros e usar lru_cache em funções caras
---

## Passo 1 · Leitura · Embrulhar uma função

O sistema da biblioteca tem funções para emprestar, devolver e renovar livros, e agora a coordenação quer medir quanto tempo cada uma leva. Copiar as mesmas linhas de cronômetro para dentro de cada função espalha código repetido, e mistura medir com emprestar. A lição anterior dá a saída: uma função que **recebe** uma função e **devolve** outra, que faz o trabalho extra em volta da original.

```python
import time


def cronometrar(funcao):
    def envolucro(*args, **kwargs):
        inicio = time.perf_counter()
        resultado = funcao(*args, **kwargs)
        print(funcao.__name__, "levou", time.perf_counter() - inicio)
        return resultado
    return envolucro
```

`envolucro` é uma closure: ela captura `funcao`. Os parâmetros `*args, **kwargs` significam "aceite quaisquer argumentos", e `funcao(*args, **kwargs)` os repassa exatamente como chegaram; a próxima lição explica essa notação em detalhes. Com isso, o mesmo `cronometrar` serve para funções de qualquer assinatura.

Para usar, troca-se a função pela versão embrulhada:

```python
def emprestar(livro, aluno):
    ...

emprestar = cronometrar(emprestar)
```

Como esse padrão é muito comum, o Python tem uma sintaxe para ele. As duas formas são **exatamente** equivalentes:

```python
@cronometrar
def emprestar(livro, aluno):
    ...
```

`@cronometrar` acima do `def` significa: defina a função e, logo em seguida, faça `emprestar = cronometrar(emprestar)`. Uma função usada assim é um **decorador**. Você já usou alguns: `@property`, `@dataclass` e `@contextmanager` são decoradores.

Repare no momento: o decorador roda **uma vez**, quando o `def` é executado, e não a cada chamada. A cada chamada, quem roda é o `envolucro`.

#### O erro comum: envolucro sem return

```python
def envolucro(*args, **kwargs):
    funcao(*args, **kwargs)     # chama, mas joga o resultado fora
```

O envolucro roda a função original e devolve `None`. Toda função decorada passa a devolver `None`, e o defeito aparece longe, em quem usa o resultado. O envolucro precisa de `return` com o valor da função original.

## Passo 2 · Previsão · Quando cada parte roda

O decorador `anunciar` imprime em três momentos: quando decora, antes e depois de cada chamada. Leia o programa sem executar e digite exatamente o que ele imprime.

### Código
```python
def anunciar(funcao):
    print("decorando", funcao.__name__)
    def envolucro(*args, **kwargs):
        print("antes")
        resultado = funcao(*args, **kwargs)
        print("depois")
        return resultado
    return envolucro


@anunciar
def dobro(x):
    return x * 2


print("início")
print(dobro(4))
print(dobro.__name__)
```

### Dicas
1. `@anunciar` roda `anunciar(dobro)` no momento do `def`, antes de qualquer outra linha do programa.
2. `print(dobro(4))` só imprime depois que o envolucro termina.
3. Depois da decoração, o nome `dobro` aponta para outra função. Qual é o nome dela?

### Saída esperada
```text
decorando dobro
início
antes
depois
8
envolucro
```

## Passo 3 · Exercício · registrar com functools.wraps
modo: lacunas

A previsão mostrou um efeito colateral: depois de decorada, `dobro.__name__` virou `envolucro`, e a docstring também se perde. Mensagens de erro, registros e ferramentas de teste passam a mostrar o nome errado. O decorador `wraps`, do `functools`, conserta isso: aplicado ao envolucro, ele copia nome, docstring e outros dados da função original.

```python
@wraps(funcao)
def envolucro(*args, **kwargs):
    ...
```

O decorador `registrar` anota, na lista global `chamadas`, o nome de cada função decorada a cada vez que ela é chamada. Complete as três lacunas (`___`).

### Instruções
1. Aplique ao envolucro o decorador que preserva o nome e a docstring da função original.
2. O envolucro devolve o resultado da função original, com todos os argumentos repassados.
3. `registrar` devolve o envolucro, sem chamá-lo.

### Código inicial
```python
from functools import wraps

chamadas = []


def registrar(funcao):
    @___(funcao)
    def envolucro(*args, **kwargs):
        chamadas.append(funcao.__name__)
        return ___(*args, **kwargs)
    return ___


@registrar
def somar(a, b):
    """Soma dois números."""
    return a + b
```

### Solução
```python
from functools import wraps

chamadas = []


def registrar(funcao):
    @wraps(funcao)
    def envolucro(*args, **kwargs):
        chamadas.append(funcao.__name__)
        return funcao(*args, **kwargs)
    return envolucro


@registrar
def somar(a, b):
    """Soma dois números."""
    return a + b
```

### Dicas
1. `wraps` recebe a função original entre parênteses.
2. Dentro do envolucro, a função original se chama `funcao`.
3. Devolver o envolucro é escrever o nome dele, sem parênteses.

### Verificação
```json
[
  { "id": "nome-doc", "checkpoint": 1, "kind": "expr", "expr": "[somar.__name__, somar.__doc__]", "expected": ["somar", "Soma dois números."],
    "name": "somar decorada mantém o nome e a docstring", "hint": "Use @wraps(funcao) no envolucro." },
  { "id": "nome-outra", "checkpoint": 1, "kind": "expr",
    "setup": "@registrar\ndef media(a, b):\n    \"\"\"Média de dois números.\"\"\"\n    return (a + b) / 2",
    "expr": "[media.__name__, media.__doc__]", "expected": ["media", "Média de dois números."],
    "name": "Outra função decorada também mantém nome e docstring" },
  { "id": "usa-wraps", "checkpoint": 1, "kind": "source", "rule": { "type": "decorator", "name": "wraps" },
    "name": "O envolucro usa @wraps" },
  { "id": "retorno", "checkpoint": 2, "kind": "expr", "setup": "chamadas.clear()\nr = somar(2, 3)",
    "expr": "[r, chamadas]", "expected": [5, ["somar"]],
    "name": "somar(2, 3) devolve 5 e é registrada", "hint": "O envolucro precisa devolver o resultado da função original." },
  { "id": "nomeados", "checkpoint": 2, "kind": "expr",
    "setup": "chamadas.clear()\n@registrar\ndef saudar(nome, final=\"!\"):\n    return \"Olá, \" + nome + final\nx = saudar(\"Ana\")\ny = saudar(\"Bia\", final=\".\")\nz = somar(a=1, b=4)",
    "expr": "[x, y, z, chamadas]", "expected": ["Olá, Ana!", "Olá, Bia.", 5, ["saudar", "saudar", "somar"]],
    "name": "Repassa argumentos posicionais e nomeados", "hint": "Repasse *args e **kwargs." },
  { "id": "decorar-nao-chama", "checkpoint": 3, "kind": "expr",
    "setup": "chamadas.clear()\n@registrar\ndef triplo(x):\n    return 3 * x",
    "expr": "[list(chamadas), callable(triplo), triplo(4)]", "expected": [[], true, 12],
    "name": "Decorar não chama a função; ela continua chamável", "hint": "registrar devolve o envolucro, sem parênteses." }
]
```

### Soluções erradas
```python name="sem wraps"
from functools import wraps

chamadas = []


def registrar(funcao):
    def envolucro(*args, **kwargs):
        chamadas.append(funcao.__name__)
        return funcao(*args, **kwargs)
    return envolucro


@registrar
def somar(a, b):
    """Soma dois números."""
    return a + b
```
```python name="envolucro sem return"
from functools import wraps

chamadas = []


def registrar(funcao):
    @wraps(funcao)
    def envolucro(*args, **kwargs):
        chamadas.append(funcao.__name__)
        funcao(*args, **kwargs)
    return envolucro


@registrar
def somar(a, b):
    """Soma dois números."""
    return a + b
```
```python name="envolucro sem **kwargs"
from functools import wraps

chamadas = []


def registrar(funcao):
    @wraps(funcao)
    def envolucro(*args):
        chamadas.append(funcao.__name__)
        return funcao(*args)
    return envolucro


@registrar
def somar(a, b):
    """Soma dois números."""
    return a + b
```
```python name="registra ao decorar, não a cada chamada"
from functools import wraps

chamadas = []


def registrar(funcao):
    chamadas.append(funcao.__name__)

    @wraps(funcao)
    def envolucro(*args, **kwargs):
        return funcao(*args, **kwargs)
    return envolucro


@registrar
def somar(a, b):
    """Soma dois números."""
    return a + b
```

## Passo 4 · Leitura · Decoradores com parâmetros

Às vezes o decorador precisa de uma configuração: quantas vezes repetir, qual limite aceitar. `@repetir(3)` parece uma chamada com argumento, e é: primeiro roda `repetir(3)`, e o **resultado** dela é o decorador aplicado à função. Por isso são três funções, uma dentro da outra:

```python
from functools import wraps


def repetir(n):                       # 1. recebe a configuração
    def decorador(funcao):            # 2. recebe a função
        @wraps(funcao)
        def envolucro(*args, **kwargs):   # 3. roda a cada chamada
            for _ in range(n):
                resultado = funcao(*args, **kwargs)
            return resultado
        return envolucro
    return decorador


@repetir(3)
def tocar_sinal():
    print("trim!")
```

`@repetir(3)` acima do `def` equivale a `tocar_sinal = repetir(3)(tocar_sinal)`. Cada nível captura o que veio de fora: `envolucro` enxerga `funcao` e `n`.

#### O erro comum: esquecer os parênteses

Com `@repetir` sem `(3)`, o Python faz `tocar_sinal = repetir(tocar_sinal)`. A função vira o `n`, e `tocar_sinal` passa a ser o `decorador` do meio. Nada quebra na definição; o erro aparece só na chamada:

```
TypeError: repetir.<locals>.decorador() missing 1 required positional argument: 'funcao'
```

Ao ver um `decorador()` reclamando de `funcao` faltando, procure um decorador com parâmetros usado sem parênteses.

#### Empilhar decoradores

Vários decoradores podem ser empilhados. Eles são aplicados **de baixo para cima**, o mais próximo do `def` primeiro:

```python
@cronometrar
@repetir(3)
def tocar_sinal():
    ...
```

equivale a `tocar_sinal = cronometrar(repetir(3)(tocar_sinal))`. Na chamada, o envolucro de fora (`cronometrar`) roda primeiro e mede as três repetições juntas. Invertendo a ordem, o `cronometrar` ficaria por dentro e mediria cada repetição separadamente. A ordem muda o comportamento: leia a pilha como camadas de uma cebola, de fora para dentro.

#### Decoradores em métodos

Os mesmos decoradores servem para métodos de uma classe. Um envolucro com `*args, **kwargs` não precisa de mudança nenhuma: o `self` chega como o primeiro item de `args` e é repassado junto com o resto. O `@property` do módulo 1 é exatamente isso, um decorador aplicado a um método.

## Passo 5 · Exercício · tentar_novamente(vezes)

Uma consulta ao servidor de matrículas às vezes falha por instabilidade da rede e funciona na tentativa seguinte. Escreva o decorador com parâmetro `tentar_novamente(vezes)`:

```python
@tentar_novamente(3)
def consultar_vagas(disciplina):
    ...
```

- O envolucro chama a função. Se ela levantar uma exceção (qualquer `Exception`), tenta de novo, até `vezes` tentativas **no total**.
- Na primeira tentativa que der certo, devolve o resultado, sem tentar mais.
- Se todas falharem, deixa a exceção da última tentativa subir: quem chamou precisa saber que não deu.
- `tentar_novamente(0)` (ou menos) é um erro de configuração: levanta `ValueError` já ao criar o decorador.

### Instruções
1. Escreva os três níveis: `tentar_novamente(vezes)` → `decorador(funcao)` → `envolucro(*args, **kwargs)`, com `@wraps`.
2. O envolucro faz até `vezes` tentativas e devolve o resultado da primeira que der certo.
3. Se todas falharem, a exceção da última tentativa sobe para quem chamou.
   Dica: dentro de um `except`, um `raise` sozinho relança a exceção que está sendo tratada.
4. `vezes` menor que 1 levanta `ValueError` na chamada `tentar_novamente(vezes)`.

### Código inicial
```python
from functools import wraps


def tentar_novamente(vezes):
    pass
```

### Solução
```python
from functools import wraps


def tentar_novamente(vezes):
    if vezes < 1:
        raise ValueError("vezes precisa ser pelo menos 1")

    def decorador(funcao):
        @wraps(funcao)
        def envolucro(*args, **kwargs):
            for tentativa in range(1, vezes + 1):
                try:
                    return funcao(*args, **kwargs)
                except Exception:
                    if tentativa == vezes:
                        raise

        return envolucro

    return decorador
```

### Dicas
1. O `return` dentro do `try` é o que encerra as tentativas quando dá certo.
2. Conte as tentativas com cuidado: `vezes` é o total, incluindo a primeira.
3. Engolir o erro da última tentativa e devolver `None` esconde a falha de quem chamou.

### Verificação
```json
[
  { "id": "nome", "checkpoint": 1, "kind": "expr",
    "setup": "@tentar_novamente(2)\ndef consultar():\n    \"\"\"Consulta as vagas.\"\"\"\n    return 10",
    "expr": "[consultar.__name__, consultar.__doc__, consultar()]", "expected": ["consultar", "Consulta as vagas.", 10],
    "name": "A função decorada mantém nome, docstring e resultado", "hint": "Use @wraps(funcao) no envolucro." },
  { "id": "argumentos", "checkpoint": 1, "kind": "expr",
    "setup": "@tentar_novamente(2)\ndef dividir(a, b):\n    return a / b",
    "expr": "dividir(9, b=3)", "expected": 3.0, "name": "Repassa argumentos posicionais e nomeados" },
  { "id": "recupera", "checkpoint": 2, "kind": "expr",
    "setup": "tentativas = []\n@tentar_novamente(3)\ndef instavel():\n    tentativas.append(1)\n    if len(tentativas) < 3:\n        raise ConnectionError(\"rede caiu\")\n    return \"ok\"",
    "expr": "[instavel(), len(tentativas)]", "expected": ["ok", 3],
    "name": "Falha duas vezes e acerta na terceira tentativa", "hint": "vezes é o total de tentativas, incluindo a primeira." },
  { "id": "primeira", "checkpoint": 2, "kind": "expr",
    "setup": "tentativas = []\n@tentar_novamente(5)\ndef estavel():\n    tentativas.append(1)\n    return 42",
    "expr": "[estavel(), len(tentativas)]", "expected": [42, 1],
    "name": "Dando certo de primeira, não tenta de novo", "hint": "Devolva assim que uma tentativa der certo." },
  { "id": "desiste-conta", "checkpoint": 3, "kind": "expr",
    "setup": "tentativas = []\n@tentar_novamente(4)\ndef fora_do_ar():\n    tentativas.append(1)\n    raise ConnectionError(\"rede caiu\")\ntry:\n    fora_do_ar()\nexcept ConnectionError:\n    pass",
    "expr": "len(tentativas)", "expected": 4, "name": "Com tudo falhando, faz exatamente 4 tentativas" },
  { "id": "desiste-relanca", "checkpoint": 3, "kind": "expr",
    "setup": "@tentar_novamente(2)\ndef fora_do_ar():\n    raise ConnectionError(\"rede caiu\")",
    "expr": "fora_do_ar()", "raises": "ConnectionError", "message_contains": "rede caiu",
    "name": "Depois da última tentativa, a exceção sobe para quem chamou", "hint": "Não engula o erro da última tentativa." },
  { "id": "uma-vez", "checkpoint": 3, "kind": "expr",
    "setup": "tentativas = []\n@tentar_novamente(1)\ndef falha():\n    tentativas.append(1)\n    raise KeyError(\"x\")\ntry:\n    falha()\nexcept KeyError:\n    pass",
    "expr": "len(tentativas)", "expected": 1, "name": "Com vezes = 1, tenta só uma vez e relança" },
  { "id": "zero", "checkpoint": 4, "kind": "expr", "expr": "tentar_novamente(0)", "raises": "ValueError",
    "name": "tentar_novamente(0) levanta ValueError", "hint": "Confira vezes no primeiro nível, antes de criar o decorador." },
  { "id": "usa-wraps", "checkpoint": 1, "kind": "source", "rule": { "type": "decorator", "name": "wraps" },
    "name": "O envolucro usa @wraps" }
]
```

### Soluções erradas
```python name="uma tentativa a menos"
from functools import wraps


def tentar_novamente(vezes):
    if vezes < 1:
        raise ValueError("vezes precisa ser pelo menos 1")

    def decorador(funcao):
        @wraps(funcao)
        def envolucro(*args, **kwargs):
            for tentativa in range(1, vezes):
                try:
                    return funcao(*args, **kwargs)
                except Exception:
                    if tentativa == vezes - 1:
                        raise

        return envolucro

    return decorador
```
```python name="engole o erro da última tentativa"
from functools import wraps


def tentar_novamente(vezes):
    if vezes < 1:
        raise ValueError("vezes precisa ser pelo menos 1")

    def decorador(funcao):
        @wraps(funcao)
        def envolucro(*args, **kwargs):
            for _ in range(vezes):
                try:
                    return funcao(*args, **kwargs)
                except Exception:
                    pass
            return None

        return envolucro

    return decorador
```
```python name="tenta todas as vezes mesmo quando dá certo"
from functools import wraps


def tentar_novamente(vezes):
    if vezes < 1:
        raise ValueError("vezes precisa ser pelo menos 1")

    def decorador(funcao):
        @wraps(funcao)
        def envolucro(*args, **kwargs):
            erro = None
            resultado = None
            for _ in range(vezes):
                try:
                    resultado = funcao(*args, **kwargs)
                    erro = None
                except Exception as e:
                    erro = e
            if erro is not None:
                raise erro
            return resultado

        return envolucro

    return decorador
```
```python name="não valida vezes"
from functools import wraps


def tentar_novamente(vezes):
    def decorador(funcao):
        @wraps(funcao)
        def envolucro(*args, **kwargs):
            for tentativa in range(1, vezes + 1):
                try:
                    return funcao(*args, **kwargs)
                except Exception:
                    if tentativa == vezes:
                        raise

        return envolucro

    return decorador
```

## Passo 6 · Exercício · memoizar: lembrar resultados

A função `fibonacci` recursiva do Nível 1 recalcula os mesmos valores milhões de vezes: `fibonacci(30)` chama `fibonacci(2)` mais de 300 mil vezes, e `fibonacci(80)` não termina em tempo útil. Mas o resultado para o mesmo `n` é sempre o mesmo. **Memoizar** é guardar cada resultado já calculado num dicionário e, na próxima chamada com os mesmos argumentos, devolver o guardado em vez de calcular de novo.

Isso não tem nada de específico do Fibonacci, então é um decorador. A biblioteca padrão já tem um pronto, `functools.lru_cache`:

```python
from functools import lru_cache


@lru_cache(maxsize=None)
def fibonacci(n):
    ...
```

Escreva a sua versão, `memoizar`, sem `lru_cache`. Considere que as funções decoradas recebem só argumentos posicionais. A tupla `args` serve de chave do dicionário.

### Instruções
1. `memoizar(funcao)` devolve um envolucro, com `@wraps`, que guarda num dicionário o resultado de cada combinação de argumentos já calculada.
2. Uma chamada repetida devolve o resultado guardado sem executar a função de novo, mesmo quando o resultado é `0`, `None` ou outro valor falso.
3. Cada função decorada tem o seu próprio dicionário: duas funções diferentes não misturam resultados.
   Dica: crie o dicionário dentro de `memoizar`, não fora.

### Código inicial
```python
from functools import wraps


def memoizar(funcao):
    pass


@memoizar
def fibonacci(n):
    if n < 2:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)
```

### Solução
```python
from functools import wraps


def memoizar(funcao):
    guardados = {}

    @wraps(funcao)
    def envolucro(*args):
        if args not in guardados:
            guardados[args] = funcao(*args)
        return guardados[args]

    return envolucro


@memoizar
def fibonacci(n):
    if n < 2:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)
```

### Dicas
1. A chave é a tupla inteira `args`, não só o primeiro argumento.
2. Pergunte se a chave está no dicionário com `in`; olhar se o valor guardado é verdadeiro falha quando o resultado é `0`.
3. Um dicionário criado dentro de `memoizar` nasce de novo para cada função decorada, e cada envolucro captura o seu.

### Verificação
```json
[
  { "id": "fib-10", "checkpoint": 1, "kind": "expr", "expr": "fibonacci(10)", "expected": 55,
    "name": "fibonacci(10) é 55", "hint": "O envolucro precisa devolver o resultado." },
  { "id": "fib-80", "checkpoint": 1, "kind": "expr", "expr": "str(fibonacci(80))", "expected": "23416728348467685",
    "name": "fibonacci(80) termina rápido", "hint": "Sem guardar os resultados, a recursão recalcula os mesmos valores sem fim." },
  { "id": "nome", "checkpoint": 1, "kind": "expr", "expr": "fibonacci.__name__", "expected": "fibonacci",
    "name": "fibonacci decorada mantém o nome", "hint": "Use @wraps(funcao)." },
  { "id": "nao-repete", "checkpoint": 2, "kind": "expr",
    "setup": "execucoes = []\n@memoizar\ndef dezena(x):\n    execucoes.append(x)\n    return x * 10\nr = [dezena(2), dezena(3), dezena(2), dezena(2)]",
    "expr": "[r, execucoes]", "expected": [[20, 30, 20, 20], [2, 3]],
    "name": "Chamadas repetidas não executam a função de novo" },
  { "id": "varios-argumentos", "checkpoint": 2, "kind": "expr",
    "setup": "@memoizar\ndef potencia(b, e):\n    return b ** e",
    "expr": "[potencia(2, 3), potencia(2, 4), potencia(3, 2)]", "expected": [8, 16, 9],
    "name": "A chave considera todos os argumentos", "hint": "Use a tupla args inteira como chave." },
  { "id": "valor-falso", "checkpoint": 2, "kind": "expr",
    "setup": "execucoes = []\n@memoizar\ndef saldo(conta):\n    execucoes.append(conta)\n    return 0\nr = [saldo(\"Ana\"), saldo(\"Ana\"), saldo(\"Ana\")]",
    "expr": "[r, execucoes]", "expected": [[0, 0, 0], ["Ana"]],
    "name": "Um resultado 0 também fica guardado", "hint": "Verifique se a chave está no dicionário, não se o valor é verdadeiro." },
  { "id": "independentes", "checkpoint": 3, "kind": "expr",
    "setup": "@memoizar\ndef dobro(x):\n    return 2 * x\n@memoizar\ndef triplo(x):\n    return 3 * x",
    "expr": "[dobro(5), triplo(5), dobro(5), triplo(5)]", "expected": [10, 15, 10, 15],
    "name": "Duas funções decoradas não misturam resultados", "hint": "Cada função decorada precisa do seu próprio dicionário." }
]
```

### Soluções erradas
```python name="dicionário único para todas as funções"
from functools import wraps

guardados = {}


def memoizar(funcao):
    @wraps(funcao)
    def envolucro(*args):
        if args not in guardados:
            guardados[args] = funcao(*args)
        return guardados[args]

    return envolucro


@memoizar
def fibonacci(n):
    if n < 2:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)
```
```python name="chave só com o primeiro argumento"
from functools import wraps


def memoizar(funcao):
    guardados = {}

    @wraps(funcao)
    def envolucro(*args):
        if args[0] not in guardados:
            guardados[args[0]] = funcao(*args)
        return guardados[args[0]]

    return envolucro


@memoizar
def fibonacci(n):
    if n < 2:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)
```
```python name="testa o valor guardado em vez da chave"
from functools import wraps


def memoizar(funcao):
    guardados = {}

    @wraps(funcao)
    def envolucro(*args):
        if not guardados.get(args):
            guardados[args] = funcao(*args)
        return guardados[args]

    return envolucro


@memoizar
def fibonacci(n):
    if n < 2:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)
```
```python name="sem wraps"
from functools import wraps


def memoizar(funcao):
    guardados = {}

    def envolucro(*args):
        if args not in guardados:
            guardados[args] = funcao(*args)
        return guardados[args]

    return envolucro


@memoizar
def fibonacci(n):
    if n < 2:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)
```

## Passo 7 · Quiz · Decoradores

### Pergunta
O que este programa imprime?
```python
def negrito(f):
    def envolucro():
        return "<b>" + f() + "</b>"
    return envolucro


def italico(f):
    def envolucro():
        return "<i>" + f() + "</i>"
    return envolucro


@negrito
@italico
def titulo():
    return "Python"


print(titulo())
```
- [x] `<b><i>Python</i></b>`
- [ ] `<i><b>Python</b></i>`
- [ ] `<b>Python</b><i>Python</i>`
- [ ] `Python`
> Os decoradores são aplicados de baixo para cima: `titulo = negrito(italico(titulo))`. O `italico` embrulha a função original e o `negrito` embrulha o resultado, então o `<b>` fica por fora.

### Pergunta
Um decorador sem `@wraps` é aplicado a `def calcular_frete(peso): ...`. O que `calcular_frete.__name__` passa a valer?
- [ ] `"calcular_frete"`, porque o nome é definido no `def`
- [x] O nome da função interna do decorador, como `"envolucro"`
- [ ] O nome do decorador
- [ ] `None`, porque a função decorada não tem nome
> Depois de `calcular_frete = decorador(calcular_frete)`, o nome aponta para o envolucro, que tem o nome dele. `@wraps(funcao)` copia o nome, a docstring e outros dados da função original para o envolucro.

### Pergunta
A função `tocar_sinal` foi decorada com `@repetir`, sem parênteses, usando o decorador `repetir(n)` do passo 4. O que acontece?
- [ ] Funciona, repetindo uma vez só
- [ ] Dá erro na linha do `@`, porque falta o argumento `n`
- [x] A definição passa, mas `tocar_sinal` vira o `decorador` do meio, e a chamada `tocar_sinal()` dá `TypeError`
- [ ] A função é executada uma vez, no momento da definição
> Sem parênteses, o Python faz `tocar_sinal = repetir(tocar_sinal)`: a função vira o `n`, e o nome passa a apontar para o `decorador`, que espera receber uma função. A chamada sem argumentos falha com `missing 1 required positional argument: 'funcao'`.
