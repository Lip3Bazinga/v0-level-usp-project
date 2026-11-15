---
slug: n2-m6-01-type-hints
titulo: Type hints e verificação estática
descricao: Anotar parâmetros, retornos e variáveis, usar Optional, Union, list[int], dict[str, float], TypedDict e Protocol, e rodar o mypy.
dificuldade: intermediario
tipo: guiada
runtime: python
bibliotecas: []
xp: 100
tempo_min: 40
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Anotar funções e classes com os tipos embutidos e genéricos (list[int], dict[str, float], Optional)
- Explicar que as anotações não são verificadas em tempo de execução e para que serve o mypy
- Ler um erro do mypy e corrigir o código ou a anotação
---

## Passo 1 · Leitura · O que é notas?

Você abre um projeto do grupo e encontra esta função:

```python
def resumo(notas, peso):
    ...
```

`notas` é uma lista? Um dicionário de nome para nota? Um texto como `"7,5;8"`? E `peso`, é inteiro ou decimal? A função devolve um número ou um texto pronto para imprimir? Para descobrir, você lê o corpo inteiro ou procura quem a chama. Com **anotações de tipo** (*type hints*), a resposta fica na própria assinatura:

```python
def resumo(notas: list[float], peso: float) -> str:
    ...
```

A sintaxe é a mesma que você usou nos campos das dataclasses: `nome: tipo` depois de cada parâmetro e `-> tipo` antes dos dois-pontos, para o retorno. Valor padrão vem depois da anotação: `minima: float = 6.0`. Variáveis também podem ser anotadas: `total: float = 0.0`.

Os tipos entre colchetes dizem o que vai **dentro** da coleção:

| Anotação | Significa |
|---|---|
| `list[str]` | lista de textos |
| `dict[str, float]` | dicionário de texto para decimal |
| `tuple[int, int]` | tupla de exatamente dois inteiros |
| `set[str]` | conjunto de textos |

#### O que a anotação não faz

O Python **guarda** as anotações, mas não as confere. Elas ficam no atributo `__annotations__` da função:

```python
def dobro(x: int) -> int:
    return x * 2

print(dobro.__annotations__)   # {'x': <class 'int'>, 'return': <class 'int'>}
```

E é só isso. `dobro("ab")` roda sem erro e devolve `'abab'`. A anotação também não converte: `x: int` não transforma `"3"` em `3`. Quem confere os tipos é uma ferramenta separada, o **verificador estático** (o mais usado é o **mypy**), que lê o código **sem executar** e aponta as chamadas que não batem com as anotações.

Então por que anotar? Porque a assinatura vira documentação que não fica desatualizada sem ninguém ver: o editor usa as anotações para completar nomes e avisar erros enquanto você digita, e o mypy pega o `None` esquecido antes de o programa quebrar na frente do usuário.

#### O erro comum

Achar que `def idade(ano: int)` protege a função de receber texto. Não protege. Se a função precisa recusar um valor ao rodar, isso continua sendo trabalho de um `if` com `raise`.

## Passo 2 · Previsão · A anotação não converte nada

A função diz que recebe e devolve `int`. Leia o programa sem executar e digite exatamente o que ele imprime. Lembre que `sorted` aplicado a um dicionário ordena as chaves.

### Código
```python
def dobro(x: int) -> int:
    return x * 2


print(dobro(3))
print(dobro("ab"))
print(dobro(1.5))
print(dobro.__annotations__["x"].__name__)
print(sorted(dobro.__annotations__))
```

### Dicas
1. A anotação não impede a chamada nem converte o argumento: o corpo roda com o valor que chegou.
2. `"ab" * 2` repete o texto; `1.5 * 2` é um `float`.
3. O retorno também fica em `__annotations__`, com a chave `"return"`.

### Saída esperada
```text
6
abab
3.0
int
['return', 'x']
```

## Passo 3 · Exercício · Anote quatro funções
modo: lacunas

As quatro funções já funcionam; falta dizer na assinatura o que cada uma recebe e devolve. Use os tipos embutidos (`list`, `dict`, `tuple`, `float`, `str`, `bool`), sem importar nada:

| Função | Recebe | Devolve |
|---|---|---|
| `media` | `notas`: lista de decimais | um decimal |
| `frequencia` | `palavras`: lista de textos | dicionário de texto para inteiro |
| `ponto_medio` | `a` e `b`: tuplas de dois decimais | uma tupla de dois decimais |
| `aprovado` | `nota` e `minima` (já anotados) | verdadeiro ou falso |

Repare também na variável anotada dentro de `frequencia`: é assim que se diz que o dicionário começa vazio, mas vai guardar texto para inteiro.

### Instruções
1. Anote `media`: o parâmetro e o retorno.
2. Anote `frequencia`, dizendo o tipo dos itens da lista e o tipo das chaves e dos valores do dicionário.
   Dica: entre colchetes, o dicionário leva dois tipos separados por vírgula.
3. Anote os dois parâmetros e o retorno de `ponto_medio`.
   Dica: `tuple[float]` é uma tupla de UM decimal.
4. Anote o retorno de `aprovado`.

### Código inicial
```python
def media(notas: ___) -> ___:
    return sum(notas) / len(notas)


def frequencia(palavras: ___) -> ___:
    contagem: dict[str, int] = {}
    for palavra in palavras:
        contagem[palavra] = contagem.get(palavra, 0) + 1
    return contagem


def ponto_medio(a: ___, b: ___) -> ___:
    return ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)


def aprovado(nota: float, minima: float = 6.0) -> ___:
    return nota >= minima
```

### Solução
```python
def media(notas: list[float]) -> float:
    return sum(notas) / len(notas)


def frequencia(palavras: list[str]) -> dict[str, int]:
    contagem: dict[str, int] = {}
    for palavra in palavras:
        contagem[palavra] = contagem.get(palavra, 0) + 1
    return contagem


def ponto_medio(a: tuple[float, float], b: tuple[float, float]) -> tuple[float, float]:
    return ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)


def aprovado(nota: float, minima: float = 6.0) -> bool:
    return nota >= minima
```

### Dicas
1. Uma lista de decimais é `list[float]`; o tipo dos itens vai entre colchetes.
2. Para o dicionário, o primeiro tipo é o das chaves e o segundo, o dos valores.
3. Uma tupla de tamanho fixo lista o tipo de cada posição: dois decimais são dois `float` entre os colchetes.

### Verificação
```json
[
  { "id": "media-anot", "checkpoint": 1, "kind": "expr", "expr": "media.__annotations__ == {'notas': list[float], 'return': float}",
    "expected": true, "name": "media anotada: lista de decimais para decimal", "hint": "O parâmetro é uma lista e o tipo dos itens vai entre colchetes." },
  { "id": "media-comporta", "checkpoint": 1, "kind": "call", "function": "media", "args": [[7.0, 8.0, 9.5]], "expected": 8.166666, "tolerance": 0.0001,
    "name": "media continua calculando a média" },
  { "id": "freq-anot", "checkpoint": 2, "kind": "expr", "expr": "frequencia.__annotations__ == {'palavras': list[str], 'return': dict[str, int]}",
    "expected": true, "name": "frequencia anotada: lista de textos para dict[str, int]", "hint": "O dicionário conta palavras: a chave é a palavra e o valor, quantas vezes ela aparece." },
  { "id": "freq-comporta", "checkpoint": 2, "kind": "call", "function": "frequencia", "args": [["sol", "mar", "sol"]], "expected": { "sol": 2, "mar": 1 },
    "name": "frequencia continua contando" },
  { "id": "ponto-anot", "checkpoint": 3, "kind": "expr",
    "expr": "ponto_medio.__annotations__ == {'a': tuple[float, float], 'b': tuple[float, float], 'return': tuple[float, float]}",
    "expected": true, "name": "ponto_medio anotada com tuplas de dois decimais", "hint": "Uma tupla de tamanho fixo diz o tipo de cada posição." },
  { "id": "ponto-comporta", "checkpoint": 3, "kind": "call", "function": "ponto_medio", "args": [[0.0, 0.0], [4.0, 3.0]], "expected": [2.0, 1.5], "type": "tuple",
    "name": "ponto_medio((0, 0), (4, 3)) é (2.0, 1.5)" },
  { "id": "aprovado-anot", "checkpoint": 4, "kind": "expr", "expr": "aprovado.__annotations__ == {'nota': float, 'minima': float, 'return': bool}",
    "expected": true, "name": "aprovado devolve bool", "hint": "Uma comparação como nota >= minima dá verdadeiro ou falso." },
  { "id": "aprovado-comporta", "checkpoint": 4, "kind": "expr", "expr": "[aprovado(6.0), aprovado(5.9), aprovado(7.0, minima=7.5)]",
    "expected": [true, false, false], "name": "aprovado continua respeitando a nota mínima" }
]
```

### Soluções erradas
```python name="list e dict sem o tipo dos itens"
def media(notas: list) -> float:
    return sum(notas) / len(notas)


def frequencia(palavras: list) -> dict:
    contagem: dict[str, int] = {}
    for palavra in palavras:
        contagem[palavra] = contagem.get(palavra, 0) + 1
    return contagem


def ponto_medio(a: tuple[float, float], b: tuple[float, float]) -> tuple[float, float]:
    return ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)


def aprovado(nota: float, minima: float = 6.0) -> bool:
    return nota >= minima
```
```python name="dicionário com chave e valor trocados"
def media(notas: list[float]) -> float:
    return sum(notas) / len(notas)


def frequencia(palavras: list[str]) -> dict[int, str]:
    contagem: dict[str, int] = {}
    for palavra in palavras:
        contagem[palavra] = contagem.get(palavra, 0) + 1
    return contagem


def ponto_medio(a: tuple[float, float], b: tuple[float, float]) -> tuple[float, float]:
    return ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)


def aprovado(nota: float, minima: float = 6.0) -> bool:
    return nota >= minima
```
```python name="tuple[float] (uma posição só)"
def media(notas: list[float]) -> float:
    return sum(notas) / len(notas)


def frequencia(palavras: list[str]) -> dict[str, int]:
    contagem: dict[str, int] = {}
    for palavra in palavras:
        contagem[palavra] = contagem.get(palavra, 0) + 1
    return contagem


def ponto_medio(a: tuple[float], b: tuple[float]) -> tuple[float]:
    return ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)


def aprovado(nota: float, minima: float = 6.0) -> bool:
    return nota >= minima
```
```python name="List do typing no lugar de list"
from typing import Dict, List, Tuple


def media(notas: List[float]) -> float:
    return sum(notas) / len(notas)


def frequencia(palavras: List[str]) -> Dict[str, int]:
    contagem: dict[str, int] = {}
    for palavra in palavras:
        contagem[palavra] = contagem.get(palavra, 0) + 1
    return contagem


def ponto_medio(a: Tuple[float, float], b: Tuple[float, float]) -> Tuple[float, float]:
    return ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)


def aprovado(nota: float, minima: float = 6.0) -> bool:
    return nota >= minima
```
```python name="retorno de aprovado como str"
def media(notas: list[float]) -> float:
    return sum(notas) / len(notas)


def frequencia(palavras: list[str]) -> dict[str, int]:
    contagem: dict[str, int] = {}
    for palavra in palavras:
        contagem[palavra] = contagem.get(palavra, 0) + 1
    return contagem


def ponto_medio(a: tuple[float, float], b: tuple[float, float]) -> tuple[float, float]:
    return ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)


def aprovado(nota: float, minima: float = 6.0) -> str:
    return nota >= minima
```

## Passo 4 · Leitura · Quando pode faltar: int | None

Uma busca nem sempre acha o que procura. Esta função devolve a posição do nome na lista **ou** `None`:

```python
def buscar(nomes: list[str], alvo: str) -> int | None:
    for i, nome in enumerate(nomes):
        if nome == alvo:
            return i
    return None
```

A barra `|` quer dizer "um ou outro": `int | None` é "um inteiro ou `None`". O mesmo vale para `str | int` ou `float | None`. Em código mais antigo você vai ver a mesma ideia escrita com o módulo `typing`: `Optional[int]` é exatamente `int | None`, e `Union[str, int]` é `str | int`.

#### O None esquecido

Anotar `int | None` é um aviso para quem chama: **trate o `None`**. Este código parece certo:

```python
posicao = buscar(["Ana", "Bia"], "Caio")
print(posicao + 1)
```

Ao rodar, quebra com `TypeError: unsupported operand type(s) for +: 'NoneType' and 'int'`. O mypy aponta o mesmo problema antes de rodar, só lendo as anotações:

```text
main.py:9: error: Unsupported operand types for + ("None" and "int")  [operator]
main.py:9: note: Left operand is of type "int | None"
Found 1 error in 1 file (checked 1 source file)
```

A correção é testar antes de usar: `if posicao is None:`. Cuidado com `if not posicao:`: a posição `0` também é falsa, e o primeiro nome da lista seria tratado como "não achei".

#### Funções como valor: Callable

Uma função que recebe outra função anota o parâmetro com `Callable`, do módulo `collections.abc`: entre colchetes, a lista dos tipos dos parâmetros e depois o tipo do retorno.

```python
from collections.abc import Callable

def aplicar(f: Callable[[float], float], valores: list[float]) -> list[float]:
    return [f(v) for v in valores]
```

#### Três hábitos

- Use `list`, `dict`, `tuple` e `set` direto. `List`, `Dict` e `Tuple`, com maiúscula, vêm de `typing` e são o jeito antigo, necessário só antes do Python 3.9.
- Não anote `self`: o verificador já sabe que ele é a própria classe. Anote os outros parâmetros dos métodos e o retorno; um método que não devolve nada leva `-> None`.
- Anote atributos criados vazios no `__init__`: `self.itens: dict[str, float] = {}`.

## Passo 5 · Exercício · Buscar e tratar o None

Escreva duas funções anotadas:

- `buscar(nomes, alvo)`: recebe uma lista de textos e um texto; devolve a posição (a partir de 0) da **primeira** ocorrência de `alvo`, ou `None` se ele não estiver na lista. Não use `list.index`: percorra a lista.
- `descrever_posicao(nomes, alvo)`: usa `buscar` e devolve um texto. Para `nomes = ["Ana", "Bia", "Caio"]`, `descrever_posicao(nomes, "Bia")` devolve `"Bia está na posição 2"` (contando a partir de 1, como as pessoas contam) e `descrever_posicao(nomes, "Davi")` devolve `"Davi não está na lista"`.

### Instruções
1. Escreva `buscar` com a assinatura `(nomes: list[str], alvo: str) -> int | None`, devolvendo a posição da primeira ocorrência.
2. Faça `buscar` devolver `None` quando o alvo não aparece.
3. Escreva `descrever_posicao`, anotada com `list[str]`, `str` e retorno `str`, tratando o `None` com `is None`.
   Dica: o primeiro nome da lista está na posição 0, e 0 também é falso num `if`.

### Código inicial
```python
def buscar(nomes, alvo):
    pass


def descrever_posicao(nomes, alvo):
    pass
```

### Solução
```python
def buscar(nomes: list[str], alvo: str) -> int | None:
    for i, nome in enumerate(nomes):
        if nome == alvo:
            return i
    return None


def descrever_posicao(nomes: list[str], alvo: str) -> str:
    posicao = buscar(nomes, alvo)
    if posicao is None:
        return f"{alvo} não está na lista"
    return f"{alvo} está na posição {posicao + 1}"
```

### Dicas
1. `enumerate(nomes)` entrega a posição e o nome a cada volta; devolva a posição assim que achar.
2. O `return None` fica depois do laço: só chega lá quem percorreu a lista toda sem achar.
3. Em `descrever_posicao`, teste `posicao is None` antes de somar 1.

### Verificação
```json
[
  { "id": "anot-buscar", "checkpoint": 1, "kind": "expr", "expr": "buscar.__annotations__ == {'nomes': list[str], 'alvo': str, 'return': int | None}",
    "expected": true, "name": "buscar anotada com int | None no retorno", "hint": "O retorno pode ser um inteiro ou None: use a barra para unir os dois." },
  { "id": "acha-meio", "checkpoint": 1, "kind": "call", "function": "buscar", "args": [["Ana", "Bia", "Caio"], "Caio"], "expected": 2, "type": "int",
    "name": "buscar acha Caio na posição 2" },
  { "id": "primeira", "checkpoint": 1, "kind": "call", "function": "buscar", "args": [["Eva", "Davi", "Eva"], "Eva"], "expected": 0, "type": "int",
    "name": "buscar devolve a primeira ocorrência", "hint": "Devolva assim que achar, sem continuar o laço." },
  { "id": "nao-acha", "checkpoint": 2, "kind": "call", "function": "buscar", "args": [["Ana", "Bia"], "Caio"], "expected": null, "type": "NoneType",
    "name": "buscar devolve None quando não acha", "hint": "Depois do laço, devolva None, não -1 nem False." },
  { "id": "vazia", "checkpoint": 2, "kind": "call", "function": "buscar", "args": [[], "Ana"], "expected": null, "type": "NoneType",
    "name": "buscar na lista vazia devolve None" },
  { "id": "sem-index", "checkpoint": 1, "kind": "source", "rule": { "type": "uses", "construct": "for", "function": "buscar" },
    "name": "buscar percorre a lista com for" },
  { "id": "anot-descrever", "checkpoint": 3, "kind": "expr", "expr": "descrever_posicao.__annotations__ == {'nomes': list[str], 'alvo': str, 'return': str}",
    "expected": true, "name": "descrever_posicao anotada" },
  { "id": "descreve-meio", "checkpoint": 3, "kind": "call", "function": "descrever_posicao", "args": [["Ana", "Bia", "Caio"], "Bia"],
    "expected": "Bia está na posição 2", "name": "Bia está na posição 2" },
  { "id": "descreve-primeiro", "checkpoint": 3, "kind": "call", "function": "descrever_posicao", "args": [["Ana", "Bia", "Caio"], "Ana"],
    "expected": "Ana está na posição 1", "name": "O primeiro nome da lista também é encontrado",
    "hint": "A posição 0 é falsa num if: compare com is None." },
  { "id": "descreve-ausente", "checkpoint": 3, "kind": "call", "function": "descrever_posicao", "args": [["Ana", "Bia"], "Davi"],
    "expected": "Davi não está na lista", "name": "Davi não está na lista" }
]
```

### Soluções erradas
```python name="if not posicao: perde o primeiro nome"
def buscar(nomes: list[str], alvo: str) -> int | None:
    for i, nome in enumerate(nomes):
        if nome == alvo:
            return i
    return None


def descrever_posicao(nomes: list[str], alvo: str) -> str:
    posicao = buscar(nomes, alvo)
    if not posicao:
        return f"{alvo} não está na lista"
    return f"{alvo} está na posição {posicao + 1}"
```
```python name="devolve -1 em vez de None"
def buscar(nomes: list[str], alvo: str) -> int | None:
    for i, nome in enumerate(nomes):
        if nome == alvo:
            return i
    return -1


def descrever_posicao(nomes: list[str], alvo: str) -> str:
    posicao = buscar(nomes, alvo)
    if posicao == -1:
        return f"{alvo} não está na lista"
    return f"{alvo} está na posição {posicao + 1}"
```
```python name="anota só int e esquece o None"
def buscar(nomes: list[str], alvo: str) -> int:
    for i, nome in enumerate(nomes):
        if nome == alvo:
            return i
    return None


def descrever_posicao(nomes: list[str], alvo: str) -> str:
    posicao = buscar(nomes, alvo)
    if posicao is None:
        return f"{alvo} não está na lista"
    return f"{alvo} está na posição {posicao + 1}"
```
```python name="devolve a última ocorrência"
def buscar(nomes: list[str], alvo: str) -> int | None:
    achou = None
    for i, nome in enumerate(nomes):
        if nome == alvo:
            achou = i
    return achou


def descrever_posicao(nomes: list[str], alvo: str) -> str:
    posicao = buscar(nomes, alvo)
    if posicao is None:
        return f"{alvo} não está na lista"
    return f"{alvo} está na posição {posicao + 1}"
```
```python name="posição contada a partir de 0 no texto"
def buscar(nomes: list[str], alvo: str) -> int | None:
    for i, nome in enumerate(nomes):
        if nome == alvo:
            return i
    return None


def descrever_posicao(nomes: list[str], alvo: str) -> str:
    posicao = buscar(nomes, alvo)
    if posicao is None:
        return f"{alvo} não está na lista"
    return f"{alvo} está na posição {posicao}"
```

## Passo 6 · Leitura · O mypy no terminal

O ambiente desta plataforma não roda o mypy; no seu computador, com o ambiente virtual do projeto ativo, ele se instala como qualquer pacote e roda sobre um arquivo ou uma pasta:

```text
python -m pip install mypy
python -m mypy main.py
```

Ele lê o código **sem executar** e confere cada chamada, cada `return` e cada atribuição contra as anotações. Para este arquivo:

```python
def rotulo(nota: float) -> str:
    if nota >= 6:
        return "aprovado"
    return 0

def dobro(x: int) -> int:
    return x * 2

print(dobro("ab"))
```

a saída é:

```text
main.py:4: error: Incompatible return value type (got "int", expected "str")  [return-value]
main.py:9: error: Argument 1 to "dobro" has incompatible type "str"; expected "int"  [arg-type]
Found 2 errors in 1 file (checked 1 source file)
```

Cada linha traz **arquivo:linha**, a descrição e, entre colchetes, o código do erro. `got` é o que o código entrega; `expected`, o que a anotação promete. Repare que a linha 9 nem chegou a rodar: o mypy achou o problema só lendo.

#### Corrigir o código ou a anotação?

O mypy só diz que os dois **discordam**. Quem decide qual está certo é você, olhando quem usa a função. Se o resto do programa faz `rotulo(n).upper()`, a anotação `str` está certa e o `return 0` é o defeito. Se uma busca devolve `None` quando não acha e quem chama já trata isso, o defeito é a anotação, que deveria ser `str | None`. Trocar a anotação só para o erro sumir esconde o problema em vez de resolvê-lo.

#### Dois tipos sob medida

Para um dicionário com chaves fixas, `TypedDict` diz o tipo de cada chave; e `Protocol` descreve "qualquer objeto que tenha o método `area()`", sem exigir herança:

```python
from typing import Protocol, TypedDict

class Aluno(TypedDict):
    nome: str
    nota: float

class TemArea(Protocol):
    def area(self) -> float: ...
```

Com elas, `{"nome": "Bia", "nota": "nove"}` anotado como `Aluno` vira `error: Incompatible types (expression has type "str", TypedDict item "nota" has type "float")`, e uma lista anotada como `list[TemArea]` recusa um objeto sem `area`.

## Passo 7 · Exercício · O mypy reclamou do carrinho

O mypy apontou dois erros nesta classe:

```text
main.py:9: error: Incompatible return value type (got "str", expected "int")  [return-value]
main.py:13: error: Incompatible return value type (got "None", expected "str")  [return-value]
Found 2 errors in 1 file (checked 1 source file)
```

Antes de mexer, veja como o resto do programa usa os dois métodos:

```python
proximo_item = carrinho.quantidade() + 1     # quantidade precisa ser um número

maior = carrinho.mais_caro()
if maior is None:                            # quem chama já trata o carrinho vazio
    print("carrinho vazio")
```

Em um dos métodos o defeito está no **código**; no outro, está na **anotação**. Corrija cada um no lugar certo, sem mudar o que já funciona.

### Instruções
1. Faça `quantidade()` devolver o número de itens, como promete a anotação `-> int`.
   Dica: quem chama soma 1 ao resultado.
2. Corrija a anotação de `mais_caro()` para dizer que ela pode devolver `None`, mantendo o `return None` do carrinho vazio.
3. Mantenha `adicionar` e a escolha do item mais caro funcionando.

### Código inicial
```python
class Carrinho:
    def __init__(self) -> None:
        self.itens: dict[str, float] = {}

    def adicionar(self, produto: str, preco: float) -> None:
        self.itens[produto] = preco

    def quantidade(self) -> int:
        return f"{len(self.itens)} itens"

    def mais_caro(self) -> str:
        if not self.itens:
            return None
        maior = ""
        for produto, preco in self.itens.items():
            if maior == "" or preco > self.itens[maior]:
                maior = produto
        return maior
```

### Solução
```python
class Carrinho:
    def __init__(self) -> None:
        self.itens: dict[str, float] = {}

    def adicionar(self, produto: str, preco: float) -> None:
        self.itens[produto] = preco

    def quantidade(self) -> int:
        return len(self.itens)

    def mais_caro(self) -> str | None:
        if not self.itens:
            return None
        maior = ""
        for produto, preco in self.itens.items():
            if maior == "" or preco > self.itens[maior]:
                maior = produto
        return maior
```

### Dicas
1. Leia o uso: `quantidade() + 1` só funciona com um número, então quem está errado é o `return` com f-string.
2. Em `mais_caro`, quem chama já testa `is None`: o `return None` é intencional, e quem precisa mudar é a anotação.
3. "Um texto ou None" se escreve com a barra entre os dois tipos.

### Verificação
```json
[
  { "id": "qtd-numero", "checkpoint": 1, "kind": "expr", "setup": "c = Carrinho()\nc.adicionar(\"caderno\", 25.0)\nc.adicionar(\"caneta\", 3.5)",
    "expr": "c.quantidade()", "expected": 2, "type": "int", "name": "quantidade() devolve 2 com dois itens", "hint": "Devolva o número, não um texto." },
  { "id": "qtd-vazio", "checkpoint": 1, "kind": "expr", "setup": "c = Carrinho()", "expr": "c.quantidade() + 1", "expected": 1, "type": "int",
    "name": "quantidade() de um carrinho vazio pode ser somada" },
  { "id": "qtd-anot", "checkpoint": 1, "kind": "expr", "expr": "Carrinho.quantidade.__annotations__ == {'return': int}", "expected": true,
    "name": "quantidade continua anotada com -> int", "hint": "A anotação de quantidade estava certa: quem chama precisa de um número." },
  { "id": "caro-anot", "checkpoint": 2, "kind": "expr", "expr": "Carrinho.mais_caro.__annotations__ == {'return': str | None}", "expected": true,
    "name": "mais_caro anotada como texto ou None", "hint": "O retorno pode ser um texto ou None." },
  { "id": "caro-vazio", "checkpoint": 2, "kind": "expr", "setup": "c = Carrinho()", "expr": "c.mais_caro()", "expected": null, "type": "NoneType",
    "name": "mais_caro() do carrinho vazio continua sendo None", "hint": "Quem chama testa is None: não troque por texto vazio." },
  { "id": "caro-acha", "checkpoint": 3, "kind": "expr",
    "setup": "c = Carrinho()\nc.adicionar(\"caneta\", 3.5)\nc.adicionar(\"mochila\", 120.0)\nc.adicionar(\"caderno\", 25.0)",
    "expr": "[c.mais_caro(), c.quantidade()]", "expected": ["mochila", 3], "name": "mais_caro() acha a mochila entre três itens" },
  { "id": "adicionar-anot", "checkpoint": 3, "kind": "expr", "expr": "Carrinho.adicionar.__annotations__ == {'produto': str, 'preco': float, 'return': None}",
    "expected": true, "name": "adicionar mantém as anotações" }
]
```

### Soluções erradas
```python name="troca a anotação de quantidade para str"
class Carrinho:
    def __init__(self) -> None:
        self.itens: dict[str, float] = {}

    def adicionar(self, produto: str, preco: float) -> None:
        self.itens[produto] = preco

    def quantidade(self) -> str:
        return f"{len(self.itens)} itens"

    def mais_caro(self) -> str | None:
        if not self.itens:
            return None
        maior = ""
        for produto, preco in self.itens.items():
            if maior == "" or preco > self.itens[maior]:
                maior = produto
        return maior
```
```python name="troca o None por texto vazio"
class Carrinho:
    def __init__(self) -> None:
        self.itens: dict[str, float] = {}

    def adicionar(self, produto: str, preco: float) -> None:
        self.itens[produto] = preco

    def quantidade(self) -> int:
        return len(self.itens)

    def mais_caro(self) -> str:
        if not self.itens:
            return ""
        maior = ""
        for produto, preco in self.itens.items():
            if maior == "" or preco > self.itens[maior]:
                maior = produto
        return maior
```
```python name="corrige só quantidade"
class Carrinho:
    def __init__(self) -> None:
        self.itens: dict[str, float] = {}

    def adicionar(self, produto: str, preco: float) -> None:
        self.itens[produto] = preco

    def quantidade(self) -> int:
        return len(self.itens)

    def mais_caro(self) -> str:
        if not self.itens:
            return None
        maior = ""
        for produto, preco in self.itens.items():
            if maior == "" or preco > self.itens[maior]:
                maior = produto
        return maior
```
```python name="anota mais_caro com -> None"
class Carrinho:
    def __init__(self) -> None:
        self.itens: dict[str, float] = {}

    def adicionar(self, produto: str, preco: float) -> None:
        self.itens[produto] = preco

    def quantidade(self) -> int:
        return len(self.itens)

    def mais_caro(self) -> None:
        if not self.itens:
            return None
        maior = ""
        for produto, preco in self.itens.items():
            if maior == "" or preco > self.itens[maior]:
                maior = produto
        return maior
```

## Passo 8 · Quiz · Lendo o mypy

### Pergunta
O mypy mostrou `main.py:12: error: Argument 1 to "media" has incompatible type "str"; expected "list[float]"  [arg-type]`. O que aconteceu?
- [ ] A função `media` devolve um texto, mas a anotação promete uma lista
- [x] Na linha 12, alguém chamou `media` passando um texto onde a anotação pede uma lista de decimais
- [ ] O Python vai converter o texto em lista quando o programa rodar
- [ ] A linha 12 levantou `TypeError` durante a execução do mypy
> `Argument 1` é o primeiro argumento de uma **chamada**: a mensagem diz o tipo passado (`"str"`) e o que a assinatura espera (`"list[float]"`). O defeito está na linha 12, não na função. O mypy não executa nada nem converte valores: ele só comparou a chamada com a assinatura.

### Pergunta
Em `def buscar(nomes: list[str], alvo: str) -> int | None`, o mypy acusa `Unsupported operand types for + ("None" and "int")` na linha `print(buscar(turma, "Eva") + 1)`. Qual é a correção certa?
- [ ] Trocar a anotação de `buscar` para `-> int`, porque assim o erro some
- [ ] Trocar `+ 1` por `+ 1.0`
- [x] Guardar o resultado numa variável e testar `if posicao is None:` antes de somar
- [ ] Usar `if not posicao:` antes de somar
> A anotação avisa que a busca pode não achar. Mudá-la para `int` só esconde o problema, que volta como `TypeError` ao rodar. E `if not posicao` trata a posição 0 como "não achei".

### Pergunta
O arquivo tem `def area(lado: float) -> float: return lado * lado` e, mais abaixo, `area("3")`. O que acontece se você **rodar** o programa com `python main.py`, sem mypy?
- [ ] O Python recusa a chamada com `TypeError: expected float`
- [ ] O Python converte `"3"` em `3.0` e devolve `9.0`
- [x] A chamada roda, e o erro só aparece dentro do corpo: `"3" * "3"` levanta `TypeError: can't multiply sequence by non-int of type 'str'`
- [ ] Nada: anotações impedem o programa de começar
> As anotações não são conferidas ao rodar. O argumento chega como texto e o corpo tenta multiplicar texto por texto. O mypy teria apontado a chamada antes, sem executar.
