---
slug: n2-m1-07-metodos-especiais
titulo: 'Métodos especiais: objetos que se comportam como nativos'
descricao: '__eq__, __lt__, __len__, __getitem__, __contains__, __add__ e __iter__: faça sua classe funcionar com ==, len(), in, + e for.'
dificuldade: intermediario
tipo: guiada
runtime: python
bibliotecas: []
xp: 120
tempo_min: 50
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Implementar comparação e ordenação com __eq__ e __lt__ (e functools.total_ordering)
- Fazer uma classe se comportar como coleção com __len__, __getitem__, __contains__ e __iter__
- Sobrecarregar operadores aritméticos com __add__ e __mul__ devolvendo novos objetos
---

## Passo 1 · Leitura · O que está por trás de len, == e <

Por que `len("abc")`, `len([1, 2])` e `len({"a": 1})` funcionam, se são tipos tão diferentes? Porque `len(x)` não sabe nada sobre strings ou listas: ele chama `x.__len__()`, e cada tipo implementa o seu. O mesmo vale para quase toda a sintaxe do Python. Cada operação corresponde a um método especial:

| Você escreve | O Python chama |
|---|---|
| `a == b` | `a.__eq__(b)` |
| `a < b` | `a.__lt__(b)` |
| `len(a)` | `a.__len__()` |
| `a[i]` | `a.__getitem__(i)` |
| `x in a` | `a.__contains__(x)` |
| `a + b` | `a.__add__(b)` |
| `for x in a` | `a.__iter__()` |

Esse combinado é chamado de **protocolo**. Implementando o método certo, a sua classe passa a funcionar com a sintaxe nativa e com tudo o que a usa: `sorted`, `max`, `sum`, `in`, `for`.

#### Igualdade com __eq__

Sem `__eq__`, `==` entre dois objetos só é `True` quando eles são o mesmo objeto. Para comparar pelo conteúdo:

```python
class Nota:
    def __init__(self, valor):
        self.valor = valor

    def __eq__(self, outro):
        if not isinstance(outro, Nota):
            return NotImplemented
        return self.valor == outro.valor
```

O `isinstance` evita um erro comum. Sem ele, `Nota(7) == 7` tenta ler `7.valor` e quebra com `AttributeError`. Com ele, o método devolve `NotImplemented`, um valor especial (não é uma exceção) que quer dizer "não sei comparar com isso". O Python então tenta o outro lado e, se ninguém souber, usa a regra padrão: para `==`, o resultado é `False`.

#### Ordem com __lt__ e total_ordering

`__lt__` (de *less than*, menor que) habilita `<`, e com ele `sorted`, `min` e `max`. Mas `<=` e `>=` são métodos separados, e escrever os quatro é repetitivo. O decorador `total_ordering`, do módulo `functools`, gera os que faltam a partir de `__eq__` e `__lt__`:

```python
from functools import total_ordering


@total_ordering
class Nota:
    ...                                   # __init__ e __eq__ como acima

    def __lt__(self, outro):
        return self.valor < outro.valor
```

Sem o decorador, `Nota(7) >= Nota(5)` levanta `TypeError: '>=' not supported between instances of 'Nota' and 'Nota'`.

## Passo 2 · Previsão · Quem o Python chama

A classe `Turma` implementa `__len__` e `__contains__`, e cada um avisa quando é chamado. Ela **não** implementa nenhum método para `if t:`.

Leia o programa sem executar e digite exatamente o que ele imprime.

### Código
```python
class Turma:
    def __init__(self, nomes):
        self.nomes = nomes

    def __len__(self):
        print("chamou __len__")
        return len(self.nomes)

    def __contains__(self, nome):
        print("chamou __contains__")
        return nome in self.nomes


t = Turma(["Ana", "Bia"])
print(len(t))
print("Caio" in t)
if t:
    print("turma com gente")
vazia = Turma([])
print(bool(vazia))
```

### Dicas
1. O aviso de cada método aparece antes do valor que o `print` de fora mostra.
2. Para decidir se um objeto é verdadeiro ou falso, o Python procura `__bool__`; se não houver, usa `__len__`: tamanho zero é falso.

### Saída esperada
```text
chamou __len__
2
chamou __contains__
False
chamou __len__
turma com gente
chamou __len__
False
```

## Passo 3 · Exercício · Dinheiro em centavos
modo: lacunas

Valores em dinheiro guardados como `float` acumulam erros de arredondamento (`0.1 + 0.2` dá `0.30000000000000004`). Por isso a classe `Dinheiro` guarda **centavos inteiros**. Complete as lacunas para que ela funcione com `==`, `<`, `>=`, `+`, `sorted` e `sum`.

### Instruções
1. `__eq__` devolve `NotImplemented` quando o outro lado não é `Dinheiro`; senão compara os centavos.
2. `__lt__` compara os centavos dos dois lados.
3. Aplique o decorador que gera `<=`, `>` e `>=` a partir de `__eq__` e `__lt__`.
4. Complete o método que faz o `+` funcionar. Ele devolve um `Dinheiro` novo e não altera nenhum dos dois lados.

### Código inicial
```python
from functools import total_ordering


@___
class Dinheiro:
    def __init__(self, centavos):
        self.centavos = centavos

    def __repr__(self):
        return f"Dinheiro({self.centavos})"

    def __eq__(self, outro):
        if not isinstance(outro, Dinheiro):
            return ___
        return self.centavos == outro.centavos

    def __lt__(self, outro):
        return self.centavos < ___.centavos

    def ___(self, outro):
        return Dinheiro(self.centavos + outro.centavos)
```

### Solução
```python
from functools import total_ordering


@total_ordering
class Dinheiro:
    def __init__(self, centavos):
        self.centavos = centavos

    def __repr__(self):
        return f"Dinheiro({self.centavos})"

    def __eq__(self, outro):
        if not isinstance(outro, Dinheiro):
            return NotImplemented
        return self.centavos == outro.centavos

    def __lt__(self, outro):
        return self.centavos < outro.centavos

    def __add__(self, outro):
        return Dinheiro(self.centavos + outro.centavos)
```

### Dicas
1. O valor especial que significa "não sei comparar" é escrito sem aspas e sem parênteses.
2. Em `__lt__`, o segundo objeto é o parâmetro `outro`.
3. Os nomes dos métodos especiais estão na tabela da primeira leitura.

### Verificação
```json
[
  { "id": "igual", "checkpoint": 1, "kind": "expr", "expr": "(Dinheiro(150) == Dinheiro(150), Dinheiro(150) == Dinheiro(151), Dinheiro(150) != Dinheiro(151))",
    "expected": [true, false, true], "name": "== e != comparam os centavos" },
  { "id": "outro-tipo", "checkpoint": 1, "kind": "expr", "expr": "(Dinheiro(5) == 5, Dinheiro(5).__eq__(\"5\") is NotImplemented)",
    "expected": [false, true], "name": "Comparar com outro tipo devolve NotImplemented e == dá False",
    "hint": "Antes de ler outro.centavos, confira se outro é Dinheiro." },
  { "id": "menor", "checkpoint": 2, "kind": "expr", "expr": "(Dinheiro(300) < Dinheiro(1000), Dinheiro(1000) < Dinheiro(300))",
    "expected": [true, false], "name": "< compara os centavos" },
  { "id": "ordenado", "checkpoint": 2, "kind": "expr", "expr": "repr(sorted([Dinheiro(500), Dinheiro(20), Dinheiro(130)]))",
    "expected": "[Dinheiro(20), Dinheiro(130), Dinheiro(500)]", "name": "sorted ordena do menor para o maior" },
  { "id": "total-ordering", "checkpoint": 3, "kind": "expr", "expr": "(Dinheiro(7) >= Dinheiro(7), Dinheiro(2) <= Dinheiro(1), Dinheiro(9) > Dinheiro(8))",
    "expected": [true, false, true], "name": ">=, <= e > funcionam", "hint": "Esses operadores vêm do decorador de functools." },
  { "id": "soma-nova", "checkpoint": 4, "kind": "expr", "setup": "a = Dinheiro(100)\nb = a + Dinheiro(250)",
    "expr": "(repr(a), repr(b))", "expected": ["Dinheiro(100)", "Dinheiro(350)"],
    "name": "a + Dinheiro(250) cria um valor novo e não altera a" },
  { "id": "sum", "checkpoint": 4, "kind": "expr", "expr": "repr(sum([Dinheiro(199), Dinheiro(1), Dinheiro(45)], Dinheiro(0)))",
    "expected": "Dinheiro(245)", "name": "sum de uma lista, começando de Dinheiro(0)" }
]
```

### Soluções erradas
```python name="__eq__ sem conferir o tipo"
from functools import total_ordering


@total_ordering
class Dinheiro:
    def __init__(self, centavos):
        self.centavos = centavos

    def __repr__(self):
        return f"Dinheiro({self.centavos})"

    def __eq__(self, outro):
        return self.centavos == outro.centavos

    def __lt__(self, outro):
        return self.centavos < outro.centavos

    def __add__(self, outro):
        return Dinheiro(self.centavos + outro.centavos)
```
```python name="sem total_ordering: >= não existe"
from functools import total_ordering


class Dinheiro:
    def __init__(self, centavos):
        self.centavos = centavos

    def __repr__(self):
        return f"Dinheiro({self.centavos})"

    def __eq__(self, outro):
        if not isinstance(outro, Dinheiro):
            return NotImplemented
        return self.centavos == outro.centavos

    def __lt__(self, outro):
        return self.centavos < outro.centavos

    def __add__(self, outro):
        return Dinheiro(self.centavos + outro.centavos)
```
```python name="__add__ altera o próprio objeto"
from functools import total_ordering


@total_ordering
class Dinheiro:
    def __init__(self, centavos):
        self.centavos = centavos

    def __repr__(self):
        return f"Dinheiro({self.centavos})"

    def __eq__(self, outro):
        if not isinstance(outro, Dinheiro):
            return NotImplemented
        return self.centavos == outro.centavos

    def __lt__(self, outro):
        return self.centavos < outro.centavos

    def __add__(self, outro):
        self.centavos += outro.centavos
        return self
```
```python name="devolve False em vez de NotImplemented"
from functools import total_ordering


@total_ordering
class Dinheiro:
    def __init__(self, centavos):
        self.centavos = centavos

    def __repr__(self):
        return f"Dinheiro({self.centavos})"

    def __eq__(self, outro):
        if not isinstance(outro, Dinheiro):
            return False
        return self.centavos == outro.centavos

    def __lt__(self, outro):
        return self.centavos < outro.centavos

    def __add__(self, outro):
        return Dinheiro(self.centavos + outro.centavos)
```

## Passo 4 · Leitura · Objetos que se comportam como coleção

Uma classe que guarda vários itens fica mais natural de usar se responder a `len`, `[]`, `in` e `for` como uma lista. Em geral basta **delegar** para a lista interna:

```python
class Playlist:
    def __init__(self, musicas):
        self._musicas = list(musicas)

    def __len__(self):
        return len(self._musicas)

    def __getitem__(self, indice):
        return self._musicas[indice]

    def __contains__(self, musica):
        return musica in self._musicas
```

Com isso, `len(p)`, `p[0]`, `p[-1]` e `"Trem-Bala" in p` funcionam. E como `__getitem__` repassa o índice para a lista, **fatias** vêm de graça: `p[1:3]` chega como um objeto fatia, e a lista sabe o que fazer com ele.

#### O for sem __iter__

O `for` procura primeiro `__iter__`. Se a classe não tiver, ele usa `__getitem__`: pede o item 0, o 1, o 2… e para quando recebe `IndexError`. Clique em "Visualizar" e acompanhe o `indice` crescer até o pedido que passa do fim:

```python visualizar
class Playlist:
    def __init__(self, musicas):
        self._musicas = list(musicas)

    def __getitem__(self, indice):
        return self._musicas[indice]


p = Playlist(["Asa Branca", "Trem-Bala", "Garota de Ipanema"])
for musica in p:
    print(musica)
```

Delegando para a lista, o `IndexError` aparece sozinho no fim. Um `__getitem__` que devolve `None` fora do intervalo, em vez de levantar `IndexError`, transforma o `for` num **laço infinito**: o Python nunca recebe o sinal de parar.

#### __iter__ e __contains__

Se você escrever `__iter__`, ele é preferido pelo `for`. O jeito mais simples é devolver o iterador da lista interna: `return iter(self._musicas)`. Já o `in`, sem `__contains__`, percorre os itens um a um. Escrever `__contains__` deixa a regra explícita e permite usar uma busca mais rápida, como um conjunto.

#### Verdadeiro ou falso

Como a previsão mostrou, `if objeto:` procura `__bool__` e, sem ele, usa `__len__`: coleção vazia é falsa. Por isso uma playlist vazia já se comporta como lista vazia num `if`, sem nenhuma linha a mais.

## Passo 5 · Exercício · Baralho

Escreva a classe `Baralho`, montada a partir de uma lista de valores e uma lista de naipes. As cartas são formadas por valor + naipe, **naipe por naipe**: todos os valores do primeiro naipe, depois todos os do segundo, e assim por diante.

```python
b = Baralho(["A", "2", "3"], ["♠", "♥"])
print(len(b))         # 6
print(b[0], b[-1])    # A♠ 3♥
print(b[1:3])         # ['2♠', '3♠']
print("2♥" in b)      # True
for carta in b:
    ...               # percorre as 6 cartas
print(b)              # Baralho(6 cartas)
```

### Instruções
1. `Baralho(valores, naipes)` monta a lista interna de cartas na ordem pedida.
2. `len(b)` devolve a quantidade de cartas.
3. `b[i]` devolve a carta na posição `i`, aceitando índices negativos e fatias; um índice que não existe levanta `IndexError`. Com isso, `for carta in b` funciona.
4. Implemente `__contains__`, para `carta in b` responder se a carta está no baralho.
5. `repr(b)` devolve o texto no formato `Baralho(6 cartas)`.

### Código inicial
```python
class Baralho:
    def __init__(self, valores, naipes):
        pass
```

### Solução
```python
class Baralho:
    def __init__(self, valores, naipes):
        self._cartas = [valor + naipe for naipe in naipes for valor in valores]

    def __len__(self):
        return len(self._cartas)

    def __getitem__(self, indice):
        return self._cartas[indice]

    def __contains__(self, carta):
        return carta in self._cartas

    def __repr__(self):
        return f"Baralho({len(self)} cartas)"
```

### Dicas
1. Dois laços aninhados montam as cartas: o de fora percorre os naipes, o de dentro os valores.
2. `__getitem__` pode simplesmente repassar o índice para a lista interna: ela já cuida de negativos, fatias e `IndexError`.
3. No `__repr__`, `len(self)` usa o seu próprio `__len__`.

### Verificação
```json
[
  { "id": "contains-definido", "checkpoint": 4, "kind": "source", "rule": { "type": "defines_function", "name": "__contains__" },
    "name": "Define __contains__" },
  { "id": "ordem", "checkpoint": 1, "kind": "expr", "expr": "list(Baralho([\"J\", \"Q\", \"K\"], [\"♦\", \"♣\"]))",
    "expected": ["J♦", "Q♦", "K♦", "J♣", "Q♣", "K♣"], "name": "Cartas montadas naipe por naipe",
    "hint": "Todos os valores do primeiro naipe vêm antes de qualquer carta do segundo." },
  { "id": "len", "checkpoint": 2, "kind": "expr", "expr": "(len(Baralho([\"A\", \"K\"], [\"♠\", \"♥\", \"♦\"])), len(Baralho([\"7\"], [\"♣\"])))",
    "expected": [6, 1], "name": "len de baralhos com 6 e 1 carta" },
  { "id": "indices", "checkpoint": 3, "kind": "expr", "setup": "b = Baralho([\"A\", \"2\", \"3\"], [\"♠\", \"♥\"])",
    "expr": "(b[0], b[4], b[-1])", "expected": ["A♠", "2♥", "3♥"], "name": "Índices 0, 4 e -1" },
  { "id": "fatia", "checkpoint": 3, "kind": "expr", "setup": "b = Baralho([\"A\", \"2\", \"3\"], [\"♠\", \"♥\"])",
    "expr": "(b[1:4], b[::2])", "expected": [["2♠", "3♠", "A♥"], ["A♠", "3♠", "2♥"]], "name": "Fatias b[1:4] e b[::2]",
    "hint": "Repasse o índice para a lista sem convertê-lo: assim fatias também funcionam." },
  { "id": "fora", "checkpoint": 3, "kind": "expr", "setup": "b = Baralho([\"A\"], [\"♠\", \"♥\"])", "expr": "b[2]",
    "raises": "IndexError", "name": "Índice que não existe levanta IndexError" },
  { "id": "for", "checkpoint": 3, "kind": "expr", "setup": "b = Baralho([\"10\", \"J\"], [\"♥\", \"♠\"])\nvistas = []\nfor carta in b:\n    vistas.append(carta)",
    "expr": "vistas", "expected": ["10♥", "J♥", "10♠", "J♠"], "name": "for percorre todas as cartas" },
  { "id": "in", "checkpoint": 4, "kind": "expr", "setup": "b = Baralho([\"A\", \"2\", \"3\"], [\"♠\", \"♥\"])",
    "expr": "(\"2♥\" in b, \"K♠\" in b, \"A♦\" in b)", "expected": [true, false, false], "name": "in responde se a carta está no baralho" },
  { "id": "repr", "checkpoint": 5, "kind": "expr", "expr": "repr(Baralho([\"A\", \"2\", \"3\", \"4\"], [\"♠\", \"♥\", \"♦\", \"♣\"]))",
    "expected": "Baralho(16 cartas)", "name": "repr de um baralho de 16 cartas" }
]
```

### Soluções erradas
```python name="cartas montadas valor por valor"
class Baralho:
    def __init__(self, valores, naipes):
        self._cartas = [valor + naipe for valor in valores for naipe in naipes]

    def __len__(self):
        return len(self._cartas)

    def __getitem__(self, indice):
        return self._cartas[indice]

    def __contains__(self, carta):
        return carta in self._cartas

    def __repr__(self):
        return f"Baralho({len(self)} cartas)"
```
```python name="__len__ conta só os valores"
class Baralho:
    def __init__(self, valores, naipes):
        self.valores = valores
        self._cartas = [valor + naipe for naipe in naipes for valor in valores]

    def __len__(self):
        return len(self.valores)

    def __getitem__(self, indice):
        return self._cartas[indice]

    def __contains__(self, carta):
        return carta in self._cartas

    def __repr__(self):
        return f"Baralho({len(self)} cartas)"
```
```python name="__getitem__ converte o índice e quebra as fatias"
class Baralho:
    def __init__(self, valores, naipes):
        self._cartas = [valor + naipe for naipe in naipes for valor in valores]

    def __len__(self):
        return len(self._cartas)

    def __getitem__(self, indice):
        return self._cartas[int(indice)]

    def __contains__(self, carta):
        return carta in self._cartas

    def __repr__(self):
        return f"Baralho({len(self)} cartas)"
```
```python name="sem __contains__ e sem __repr__"
class Baralho:
    def __init__(self, valores, naipes):
        self._cartas = [valor + naipe for naipe in naipes for valor in valores]

    def __len__(self):
        return len(self._cartas)

    def __getitem__(self, indice):
        return self._cartas[indice]
```

## Passo 6 · Leitura · Operadores aritméticos

`a + b` chama `a.__add__(b)`, e `a * b` chama `a.__mul__(b)`. A regra de ouro: **devolva um objeto novo**. Ninguém espera que `x + y` altere o `x`; com números nunca altera.

```python
class Vetor2D:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __add__(self, outro):
        if not isinstance(outro, Vetor2D):
            return NotImplemented
        return Vetor2D(self.x + outro.x, self.y + outro.y)
```

Um `__add__` que faz `self.x += outro.x` e `return self` parece funcionar, mas `c = a + b` muda o `a` junto, e esse bug aparece longe dali.

#### NotImplemented outra vez

Devolver `NotImplemented` para um tipo que você não sabe somar faz o Python tentar o outro lado e, se ninguém souber, levantar a mensagem padrão:

```
TypeError: unsupported operand type(s) for +: 'Vetor2D' and 'int'
```

Não confunda com `NotImplementedError`, uma **exceção** que se levanta (com `raise`) num método que ainda não foi escrito. `NotImplemented` é um **valor** que se devolve (com `return`) num operador.

#### O lado direito: __rmul__ e __radd__

Em `v * 3`, o Python chama `v.__mul__(3)`. Em `3 * v`, chama primeiro `int.__mul__(3, v)`, que devolve `NotImplemented` porque o `int` não conhece vetores. Então ele tenta o lado direito: `v.__rmul__(3)`. Para a multiplicação por número funcionar dos dois lados, basta reaproveitar:

```python
    def __rmul__(self, numero):
        return self * numero
```

O mesmo vale para `__radd__`. É por isso que `sum(vetores)` falha: ele começa somando `0 + primeiro_vetor`. Com `sum(vetores, Vetor2D(0, 0))`, a soma começa de um vetor e só usa `__add__`.

#### __abs__ e __hash__

`abs(v)` chama `v.__abs__()`. Para um vetor, o natural é devolver o comprimento, $\sqrt{x^2 + y^2}$.

Um detalhe sobre `__eq__`: ao escrevê-lo, o Python **desliga** o `__hash__` da classe, porque objetos iguais precisam ter o mesmo hash, e o padrão não garante isso. O objeto deixa de poder entrar em conjuntos (`TypeError: unhashable type: 'Vetor2D'`). Se os objetos não mudam depois de criados, devolva o hash dos campos que entram na igualdade: `return hash((self.x, self.y))`. Se mudam, deixe sem hash: um objeto que muda dentro de um conjunto se perde lá dentro.

## Passo 7 · Exercício · Vetor2D

Escreva a classe `Vetor2D` com aritmética de vetores:

```python
a = Vetor2D(1, 2)
b = Vetor2D(3, -1)
print(a + b)          # Vetor2D(4, 1)
print(a * 3, 3 * a)   # Vetor2D(3, 6) Vetor2D(3, 6)
print(abs(Vetor2D(3, 4)))   # 5.0
print(a == Vetor2D(1, 2))   # True
```

O comprimento de um vetor é

$$
|v| = \sqrt{x^2 + y^2}
$$

### Instruções
1. `Vetor2D(x, y)` guarda as coordenadas; `repr` devolve o texto no formato `Vetor2D(1, 2)`.
2. `==` compara as coordenadas; com um objeto que não é `Vetor2D`, devolva `NotImplemented`.
3. `+` soma dois vetores e devolve um vetor novo, sem alterar nenhum dos dois. Somar com algo que não é vetor levanta `TypeError`.
4. `*` multiplica o vetor por um número (`int` ou `float`), dos dois lados: `v * 3` e `3 * v`. Multiplicar por algo que não é número levanta `TypeError`.
   Dica: `isinstance(x, (int, float))` aceita os dois tipos de número.
5. `abs(v)` devolve o comprimento do vetor.

### Código inicial
```python
class Vetor2D:
    def __init__(self, x, y):
        self.x = x
        self.y = y
```

### Solução
```python
class Vetor2D:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __repr__(self):
        return f"Vetor2D({self.x}, {self.y})"

    def __eq__(self, outro):
        if not isinstance(outro, Vetor2D):
            return NotImplemented
        return self.x == outro.x and self.y == outro.y

    def __add__(self, outro):
        if not isinstance(outro, Vetor2D):
            return NotImplemented
        return Vetor2D(self.x + outro.x, self.y + outro.y)

    def __mul__(self, numero):
        if not isinstance(numero, (int, float)):
            return NotImplemented
        return Vetor2D(self.x * numero, self.y * numero)

    def __rmul__(self, numero):
        return self * numero

    def __abs__(self):
        return (self.x ** 2 + self.y ** 2) ** 0.5
```

### Dicas
1. Todo operador devolve `Vetor2D(...)` novo; nenhum altera `self.x` ou `self.y`.
2. Para tipos que você não trata, devolva `NotImplemented`: o próprio Python levanta o `TypeError`.
3. `3 * v` não chama `__mul__` do vetor; procure o método do lado direito.

### Verificação
```json
[
  { "id": "repr", "checkpoint": 1, "kind": "expr", "expr": "repr(Vetor2D(-1, 0.5))", "expected": "Vetor2D(-1, 0.5)",
    "name": "repr de Vetor2D(-1, 0.5)" },
  { "id": "igual", "checkpoint": 2, "kind": "expr", "expr": "(Vetor2D(2, 5) == Vetor2D(2, 5), Vetor2D(2, 5) == Vetor2D(5, 2), Vetor2D(2, 5) == (2, 5))",
    "expected": [true, false, false], "name": "== compara coordenadas e é False com uma tupla",
    "hint": "Confira se o outro lado é Vetor2D antes de ler outro.x." },
  { "id": "igual-notimplemented", "checkpoint": 2, "kind": "expr", "expr": "Vetor2D(1, 1).__eq__(\"x\") is NotImplemented", "expected": true,
    "name": "__eq__ devolve NotImplemented para outro tipo" },
  { "id": "soma", "checkpoint": 3, "kind": "expr", "setup": "a = Vetor2D(-2, 7)\nb = Vetor2D(5, -3)\nc = a + b",
    "expr": "(repr(c), repr(a), repr(b))", "expected": ["Vetor2D(3, 4)", "Vetor2D(-2, 7)", "Vetor2D(5, -3)"],
    "name": "A soma cria um vetor novo e não altera as parcelas" },
  { "id": "soma-tipo", "checkpoint": 3, "kind": "expr", "expr": "Vetor2D(1, 1) + 3", "raises": "TypeError",
    "name": "Vetor + número levanta TypeError" },
  { "id": "soma-lista", "checkpoint": 3, "kind": "expr", "expr": "repr(sum([Vetor2D(1, 0), Vetor2D(0, 2), Vetor2D(3, 3)], Vetor2D(0, 0)))",
    "expected": "Vetor2D(4, 5)", "name": "sum de três vetores começando do vetor nulo" },
  { "id": "escalar", "checkpoint": 4, "kind": "expr", "setup": "v = Vetor2D(4, -6)", "expr": "(repr(v * 0.5), repr(v))",
    "expected": ["Vetor2D(2.0, -3.0)", "Vetor2D(4, -6)"], "name": "v * 0.5 cria um vetor novo" },
  { "id": "escalar-esquerda", "checkpoint": 4, "kind": "expr", "expr": "repr(2 * Vetor2D(1, -3))", "expected": "Vetor2D(2, -6)",
    "name": "2 * v também funciona", "hint": "O número à esquerda faz o Python procurar um método do lado direito no vetor." },
  { "id": "escalar-tipo", "checkpoint": 4, "kind": "expr", "expr": "Vetor2D(1, 2) * Vetor2D(3, 4)", "raises": "TypeError",
    "name": "Vetor * vetor levanta TypeError" },
  { "id": "abs", "checkpoint": 5, "kind": "expr", "expr": "(abs(Vetor2D(-5, 12)), abs(Vetor2D(0, 0)))", "expected": [13.0, 0.0],
    "tolerance": 1e-9, "name": "Comprimento de (-5, 12) e do vetor nulo" },
  { "id": "abs-raiz", "checkpoint": 5, "kind": "expr", "expr": "abs(Vetor2D(1, 1))", "expected": 1.4142135623730951, "tolerance": 1e-9,
    "name": "Comprimento de (1, 1)", "hint": "O comprimento é a raiz quadrada de x² + y²." }
]
```

### Soluções erradas
```python name="__add__ altera o próprio vetor"
class Vetor2D:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __repr__(self):
        return f"Vetor2D({self.x}, {self.y})"

    def __eq__(self, outro):
        if not isinstance(outro, Vetor2D):
            return NotImplemented
        return self.x == outro.x and self.y == outro.y

    def __add__(self, outro):
        if not isinstance(outro, Vetor2D):
            return NotImplemented
        self.x += outro.x
        self.y += outro.y
        return self

    def __mul__(self, numero):
        if not isinstance(numero, (int, float)):
            return NotImplemented
        return Vetor2D(self.x * numero, self.y * numero)

    def __rmul__(self, numero):
        return self * numero

    def __abs__(self):
        return (self.x ** 2 + self.y ** 2) ** 0.5
```
```python name="sem __rmul__: 2 * v falha"
class Vetor2D:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __repr__(self):
        return f"Vetor2D({self.x}, {self.y})"

    def __eq__(self, outro):
        if not isinstance(outro, Vetor2D):
            return NotImplemented
        return self.x == outro.x and self.y == outro.y

    def __add__(self, outro):
        if not isinstance(outro, Vetor2D):
            return NotImplemented
        return Vetor2D(self.x + outro.x, self.y + outro.y)

    def __mul__(self, numero):
        if not isinstance(numero, (int, float)):
            return NotImplemented
        return Vetor2D(self.x * numero, self.y * numero)

    def __abs__(self):
        return (self.x ** 2 + self.y ** 2) ** 0.5
```
```python name="__eq__ sem conferir o tipo"
class Vetor2D:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __repr__(self):
        return f"Vetor2D({self.x}, {self.y})"

    def __eq__(self, outro):
        return self.x == outro.x and self.y == outro.y

    def __add__(self, outro):
        if not isinstance(outro, Vetor2D):
            return NotImplemented
        return Vetor2D(self.x + outro.x, self.y + outro.y)

    def __mul__(self, numero):
        if not isinstance(numero, (int, float)):
            return NotImplemented
        return Vetor2D(self.x * numero, self.y * numero)

    def __rmul__(self, numero):
        return self * numero

    def __abs__(self):
        return (self.x ** 2 + self.y ** 2) ** 0.5
```
```python name="abs sem a raiz quadrada"
class Vetor2D:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __repr__(self):
        return f"Vetor2D({self.x}, {self.y})"

    def __eq__(self, outro):
        if not isinstance(outro, Vetor2D):
            return NotImplemented
        return self.x == outro.x and self.y == outro.y

    def __add__(self, outro):
        if not isinstance(outro, Vetor2D):
            return NotImplemented
        return Vetor2D(self.x + outro.x, self.y + outro.y)

    def __mul__(self, numero):
        if not isinstance(numero, (int, float)):
            return NotImplemented
        return Vetor2D(self.x * numero, self.y * numero)

    def __rmul__(self, numero):
        return self * numero

    def __abs__(self):
        return self.x ** 2 + self.y ** 2
```
```python name="__mul__ aceita qualquer coisa"
class Vetor2D:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __repr__(self):
        return f"Vetor2D({self.x}, {self.y})"

    def __eq__(self, outro):
        if not isinstance(outro, Vetor2D):
            return NotImplemented
        return self.x == outro.x and self.y == outro.y

    def __add__(self, outro):
        if not isinstance(outro, Vetor2D):
            return NotImplemented
        return Vetor2D(self.x + outro.x, self.y + outro.y)

    def __mul__(self, numero):
        return Vetor2D(self.x * numero, self.y * numero)

    def __rmul__(self, numero):
        return self * numero

    def __abs__(self):
        return (self.x ** 2 + self.y ** 2) ** 0.5
```

## Passo 8 · Quiz · Métodos especiais

### Pergunta
Qual é a diferença entre `NotImplemented` e `NotImplementedError`?
- [ ] Nenhuma: são dois nomes para a mesma exceção
- [x] `NotImplemented` é um valor devolvido por operadores ("não sei operar com esse tipo"); `NotImplementedError` é uma exceção levantada por um método ainda não escrito
- [ ] `NotImplemented` é uma exceção; `NotImplementedError` é um valor
- [ ] `NotImplemented` só existe dentro de classes abstratas
> Um `__eq__` ou `__add__` faz `return NotImplemented` para o Python tentar o outro lado. Já `raise NotImplementedError` interrompe o programa avisando que falta implementar algo.

### Pergunta
A classe `Cpf` define `__eq__` comparando os dígitos, e não define `__hash__`. O que `{Cpf("12345678909")}` faz?
- [ ] Cria um conjunto com um CPF
- [ ] Cria um conjunto vazio
- [x] Levanta `TypeError`, porque definir `__eq__` desliga o `__hash__` da classe
- [ ] Levanta `AttributeError`, porque falta `__hash__`
> Ao escrever `__eq__`, o Python remove o `__hash__` herdado para não quebrar a regra "objetos iguais têm o mesmo hash". Sem hash, o objeto não entra em conjunto nem vira chave de dicionário. Se o CPF não muda depois de criado, defina `__hash__` com o hash dos dígitos.

### Pergunta
`Fila` implementa `__getitem__` delegando para uma lista interna, e não implementa `__iter__`. O que acontece em `for pessoa in fila:`?
- [ ] `TypeError: 'Fila' object is not iterable`
- [x] O `for` pede os itens 0, 1, 2… pelo `__getitem__` e para quando recebe `IndexError`
- [ ] O laço não executa nenhuma vez
- [ ] O laço é infinito
> Sem `__iter__`, o `for` usa `__getitem__` com índices crescentes. A lista interna levanta `IndexError` depois do último item, e esse é o sinal de parada. O laço só seria infinito se o `__getitem__` nunca levantasse `IndexError`.
