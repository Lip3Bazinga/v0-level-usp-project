---
slug: n2-m5-01-protocolo-de-iteracao
titulo: O protocolo de iteração
descricao: 'O que o for faz por baixo: iter(), next(), StopIteration e como criar sua própria classe iterável.'
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
- Explicar iterável vs iterador e usar iter() e next() manualmente
- Implementar __iter__ e __next__ em uma classe e usá-la em um for
- Prever quando um iterador se esgota e o que StopIteration significa
---

## Passo 1 · Leitura · O que o for faz por baixo

Você usa `for` desde o Nível 1 com listas, textos, dicionários, `range` e arquivos. Tipos tão diferentes funcionam no mesmo laço porque o `for` não sabe nada sobre listas: ele só conversa com o objeto por meio de duas funções embutidas.

- `iter(objeto)` pede ao objeto um **iterador**, um marcador de posição que sabe qual é o próximo item.
- `next(iterador)` entrega o próximo item e avança o marcador. Quando não há mais itens, ele levanta a exceção `StopIteration`.

O laço `for nota in notas:` é, por baixo, este `while`:

```python
notas = [7, 9, 5]
it = iter(notas)
while True:
    try:
        nota = next(it)
    except StopIteration:
        break
    print(nota)
```

Esse acordo (`iter` dá um iterador, `next` dá itens, `StopIteration` avisa o fim) se chama **protocolo de iteração**. `StopIteration` não é um erro do seu programa: é o sinal combinado de "acabou", que o `for` captura sozinho.

Acompanhe no visualizador. Veja `it` andar pela lista a cada `next` e repare na última chamada: com um segundo argumento, `next(it, "fim")` devolve esse valor em vez de levantar `StopIteration`.

```python visualizar
notas = [7, 9, 5]
it = iter(notas)
primeira = next(it)
segunda = next(it)
terceira = next(it)
depois_do_fim = next(it, "fim")
print(primeira, segunda, terceira, depois_do_fim)
```

#### O erro comum: reaproveitar um iterador gasto

Um iterador só anda para a frente e não volta. Depois do último item ele fica **esgotado**: qualquer laço sobre ele termina na hora, sem erro e sem itens.

```python
pares = zip(["Ana", "Bia"], [8, 9])
print(list(pares))   # [('Ana', 8), ('Bia', 9)]
print(list(pares))   # []
```

`zip`, `enumerate`, `reversed`, `map` e `filter` devolvem iteradores, então todos se comportam assim. Uma lista não se esgota: cada `for` sobre ela chama `iter` de novo e recebe um iterador novo, que começa do início. Se você precisa percorrer o resultado de `zip` duas vezes, guarde-o numa lista com `list(...)`.

## Passo 2 · Previsão · O iterador que já andou

O programa abaixo cria um iterador, consome um item à mão e depois entrega o mesmo iterador a um `for`. Leia sem executar e digite exatamente o que ele imprime.

### Código
```python
notas = [7, 9, 5]
it = iter(notas)
print(next(it))
for nota in it:
    print("laço", nota)
print(list(it))
print(next(it, "fim"))
print(notas)
```

### Dicas
1. O `for` sobre `it` continua de onde o `next` parou: ele não volta ao início.
2. Depois do laço, `it` está esgotado. `list` de um iterador esgotado é uma lista vazia.
3. A lista `notas` não muda: quem andou foi o iterador.

### Saída esperada
```text
7
laço 9
laço 5
[]
fim
[7, 9, 5]
```

## Passo 3 · Leitura · Iterável e iterador na sua classe

Dois papéis aparecem no protocolo, e confundi-los é a origem da maioria dos defeitos:

| Papel | Tem o método | Exemplo | Pode ser percorrido de novo? |
|---|---|---|---|
| **iterável** | `__iter__`, que devolve um iterador | lista, texto, `range` | sim: cada `iter()` cria um iterador novo |
| **iterador** | `__next__`, e `__iter__` devolvendo `self` | `iter(lista)`, `zip(...)` | não: ele se esgota |

`iter(x)` chama `x.__iter__()`, e `next(it)` chama `it.__next__()`. Para um objeto seu funcionar no `for`, basta escrever esses métodos. Uma contagem regressiva para o lançamento de um foguete:

```python
class Regressiva:
    def __init__(self, inicio):
        self.atual = inicio

    def __iter__(self):
        return self              # o próprio objeto é o iterador

    def __next__(self):
        if self.atual < 0:
            raise StopIteration  # avisa o fim
        valor = self.atual
        self.atual -= 1
        return valor


print(list(Regressiva(3)))   # [3, 2, 1, 0]
```

O estado (`self.atual`) mora no objeto: cada `next` lê o valor da vez, avança e devolve. Como `__iter__` devolve `self`, uma `Regressiva` é um iterador e se esgota como qualquer outro.

#### Os dois erros comuns

**`__next__` sem `StopIteration`.** Sem o `raise`, o `__next__` nunca avisa o fim: o `for` não para, e `list(...)` cresce até acabar a memória.

**`__iter__` que não devolve um iterador.** Esquecer o `return`, ou devolver a lista interna em vez de `iter(lista)`, quebra já no começo do laço:

```
TypeError: iter() returned non-iterator of type 'list'
```

Uma lista é iterável, mas não é iterador: ela não tem `__next__`. Quem pode ser percorrido muitas vezes (uma fila, um baralho) deve ser só **iterável**, com um `__iter__` que cria um iterador novo a cada chamada. Quem representa uma passagem única (uma contagem, a leitura de um sensor) pode ser o **próprio iterador**.

## Passo 4 · Exercício · A classe Contagem
modo: lacunas

A classe `Contagem(inicio, fim, passo)` é um iterador que produz `inicio`, `inicio + passo`, `inicio + 2 * passo`… enquanto o valor não passar de `fim`. Diferente do `range`, o `fim` **entra** quando é alcançado:

```python
list(Contagem(1, 10, 3))   # [1, 4, 7, 10]
list(Contagem(0, 9, 4))    # [0, 4, 8]
```

Complete as quatro lacunas (`___`).

### Instruções
1. `__iter__` devolve o próprio objeto: a `Contagem` é o iterador.
2. `__next__` levanta a exceção que avisa o fim quando o valor atual passou de `fim`.
   Dica: o `fim` em si ainda é produzido; só o que passa dele encerra.
3. `__next__` devolve o valor atual e deixa o próximo pronto para a chamada seguinte.

### Código inicial
```python
class Contagem:
    def __init__(self, inicio, fim, passo=1):
        self.atual = inicio
        self.fim = fim
        self.passo = passo

    def __iter__(self):
        return ___

    def __next__(self):
        if self.atual > ___:
            raise ___
        valor = self.atual
        self.atual += self.passo
        return ___
```

### Solução
```python
class Contagem:
    def __init__(self, inicio, fim, passo=1):
        self.atual = inicio
        self.fim = fim
        self.passo = passo

    def __iter__(self):
        return self

    def __next__(self):
        if self.atual > self.fim:
            raise StopIteration
        valor = self.atual
        self.atual += self.passo
        return valor
```

### Dicas
1. O iterador de uma `Contagem` é ela mesma: é ela quem guarda `self.atual`.
2. O sinal combinado de "acabou" é uma exceção específica do protocolo, não `IndexError` nem `return None`.
3. Quando a função chega ao `return`, `self.atual` já foi avançado: devolva o valor guardado antes do avanço.

### Verificação
```json
[
  { "id": "proprio-iterador", "checkpoint": 1, "kind": "expr", "setup": "c = Contagem(1, 3)",
    "expr": "iter(c) is c", "expected": true,
    "name": "iter(contagem) devolve a própria contagem", "hint": "__iter__ devolve self." },
  { "id": "passo-3", "checkpoint": 2, "kind": "expr", "expr": "list(Contagem(1, 10, 3))", "expected": [1, 4, 7, 10],
    "name": "Contagem(1, 10, 3) produz 1, 4, 7 e 10", "hint": "O fim entra quando é alcançado." },
  { "id": "passo-4", "checkpoint": 2, "kind": "expr", "expr": "list(Contagem(0, 9, 4))", "expected": [0, 4, 8],
    "name": "Contagem(0, 9, 4) para antes de passar de 9" },
  { "id": "vazia", "checkpoint": 2, "kind": "expr", "expr": "list(Contagem(5, 4))", "expected": [],
    "name": "Contagem(5, 4) não produz nada" },
  { "id": "stop", "checkpoint": 2, "kind": "expr", "setup": "c = Contagem(1, 2)\nnext(c)\nnext(c)",
    "expr": "next(c)", "raises": "StopIteration",
    "name": "Depois do último valor, next levanta StopIteration", "hint": "Levante a exceção do protocolo, não outra." },
  { "id": "next-a-next", "checkpoint": 3, "kind": "expr", "setup": "c = Contagem(10, 30, 10)",
    "expr": "[next(c), next(c), next(c)]", "expected": [10, 20, 30],
    "name": "next a next: 10, 20 e 30", "hint": "Devolva o valor de antes do avanço." },
  { "id": "esgota", "checkpoint": 3, "kind": "expr", "setup": "c = Contagem(1, 3)\nprimeira = list(c)",
    "expr": "[primeira, list(c)]", "expected": [[1, 2, 3], []],
    "name": "Uma contagem percorrida fica esgotada", "hint": "O estado mora em self.atual; não recrie a contagem em __iter__." },
  { "id": "no-for", "checkpoint": 3, "kind": "expr",
    "setup": "soma = 0\nfor n in Contagem(2, 8, 2):\n    soma += n",
    "expr": "soma", "expected": 20, "name": "Funciona num for: 2 + 4 + 6 + 8 = 20" }
]
```

### Soluções erradas
```python name="exclui o fim, como o range"
class Contagem:
    def __init__(self, inicio, fim, passo=1):
        self.atual = inicio
        self.fim = fim
        self.passo = passo

    def __iter__(self):
        return self

    def __next__(self):
        if self.atual >= self.fim:
            raise StopIteration
        valor = self.atual
        self.atual += self.passo
        return valor
```
```python name="devolve o valor já avançado"
class Contagem:
    def __init__(self, inicio, fim, passo=1):
        self.atual = inicio
        self.fim = fim
        self.passo = passo

    def __iter__(self):
        return self

    def __next__(self):
        if self.atual > self.fim:
            raise StopIteration
        valor = self.atual
        self.atual += self.passo
        return self.atual
```
```python name="levanta IndexError em vez de StopIteration"
class Contagem:
    def __init__(self, inicio, fim, passo=1):
        self.atual = inicio
        self.fim = fim
        self.passo = passo

    def __iter__(self):
        return self

    def __next__(self):
        if self.atual > self.fim:
            raise IndexError
        valor = self.atual
        self.atual += self.passo
        return valor
```
```python name="__iter__ cria uma contagem nova"
class Contagem:
    def __init__(self, inicio, fim, passo=1):
        self.atual = inicio
        self.fim = fim
        self.passo = passo

    def __iter__(self):
        return Contagem(self.atual, self.fim, self.passo)

    def __next__(self):
        if self.atual > self.fim:
            raise StopIteration
        valor = self.atual
        self.atual += self.passo
        return valor
```

## Passo 5 · Exercício · Fila que pode ser percorrida de novo

A fila do RU precisa ser percorrida várias vezes: para mostrar quem está esperando, para contar quantos são de cada curso, para conferir se alguém já entrou. Por isso ela deve ser só **iterável**: cada `for` recebe um iterador novo, e percorrer não tira ninguém da fila.

```python
f = Fila()
f.entrar("Ana")
f.entrar("Bia")
for nome in f:
    print(nome)      # Ana, depois Bia
print(list(f))       # ['Ana', 'Bia'] de novo
print(f.atender())   # Ana
```

A lista `_itens` é um detalhe interno: quem percorre a fila não pode receber a lista em si (com ela, poderia fazer `append` e furar a fila).

### Instruções
1. Escreva `__iter__` para que `for nome in fila` percorra os nomes em ordem de chegada.
   Dica: devolver `self._itens` dá `TypeError`, porque uma lista não é iterador.
2. Cada percurso começa do início e é independente: dois `for` aninhados sobre a mesma fila funcionam.
3. Percorrer a fila não a altera, e o que o `iter` devolve não pode ser a lista interna.

### Código inicial
```python
class Fila:
    def __init__(self):
        self._itens = []

    def entrar(self, nome):
        self._itens.append(nome)

    def atender(self):
        return self._itens.pop(0)
```

### Solução
```python
class Fila:
    def __init__(self):
        self._itens = []

    def entrar(self, nome):
        self._itens.append(nome)

    def atender(self):
        return self._itens.pop(0)

    def __iter__(self):
        return iter(self._itens)
```

### Dicas
1. Você não precisa escrever `__next__`: a lista interna já sabe fornecer um iterador.
2. Se a `Fila` for o próprio iterador (com um índice em `self`), o segundo percurso começa esgotado.
3. Não use `pop` para percorrer: ler não é atender.

### Verificação
```json
[
  { "id": "ordem", "checkpoint": 1, "kind": "expr",
    "setup": "f = Fila()\nfor nome in [\"Ana\", \"Bia\", \"Caio\"]:\n    f.entrar(nome)",
    "expr": "list(f)", "expected": ["Ana", "Bia", "Caio"],
    "name": "Percorre os nomes em ordem de chegada", "hint": "__iter__ precisa devolver um iterador sobre os nomes." },
  { "id": "vazia", "checkpoint": 1, "kind": "expr", "expr": "list(Fila())", "expected": [],
    "name": "Uma fila vazia não produz nomes" },
  { "id": "duas-vezes", "checkpoint": 2, "kind": "expr",
    "setup": "f = Fila()\nf.entrar(\"Davi\")\nf.entrar(\"Eva\")\nprimeira = list(f)",
    "expr": "[primeira, list(f)]", "expected": [["Davi", "Eva"], ["Davi", "Eva"]],
    "name": "O segundo percurso começa do início", "hint": "Cada chamada a __iter__ deve criar um iterador novo." },
  { "id": "aninhado", "checkpoint": 2, "kind": "expr",
    "setup": "f = Fila()\nfor nome in [\"Ana\", \"Bia\", \"Caio\"]:\n    f.entrar(nome)\nduplas = [(a, b) for a in f for b in f if a < b]",
    "expr": "duplas", "expected": [["Ana", "Bia"], ["Ana", "Caio"], ["Bia", "Caio"]],
    "name": "Dois for aninhados sobre a mesma fila formam todas as duplas", "hint": "O for de dentro não pode gastar o iterador do for de fora." },
  { "id": "nao-altera", "checkpoint": 3, "kind": "expr",
    "setup": "f = Fila()\nf.entrar(\"Ana\")\nf.entrar(\"Bia\")\nfor _ in f:\n    pass",
    "expr": "[f.atender(), list(f)]", "expected": ["Ana", ["Bia"]],
    "name": "Depois de percorrer, a fila continua inteira", "hint": "Percorrer não pode remover ninguém." },
  { "id": "nao-expoe", "checkpoint": 3, "kind": "expr",
    "setup": "f = Fila()\nf.entrar(\"Ana\")\nit = iter(f)",
    "expr": "[hasattr(it, \"append\"), next(it)]", "expected": [false, "Ana"],
    "name": "O iter da fila não entrega a lista interna", "hint": "Devolva um iterador sobre a lista, não a lista." }
]
```

### Soluções erradas
```python name="__iter__ devolve a lista interna"
class Fila:
    def __init__(self):
        self._itens = []

    def entrar(self, nome):
        self._itens.append(nome)

    def atender(self):
        return self._itens.pop(0)

    def __iter__(self):
        return self._itens
```
```python name="a fila é o próprio iterador"
class Fila:
    def __init__(self):
        self._itens = []
        self._posicao = 0

    def entrar(self, nome):
        self._itens.append(nome)

    def atender(self):
        return self._itens.pop(0)

    def __iter__(self):
        return self

    def __next__(self):
        if self._posicao >= len(self._itens):
            raise StopIteration
        nome = self._itens[self._posicao]
        self._posicao += 1
        return nome
```
```python name="percorre atendendo"
class Fila:
    def __init__(self):
        self._itens = []

    def entrar(self, nome):
        self._itens.append(nome)

    def atender(self):
        return self._itens.pop(0)

    def __iter__(self):
        return self

    def __next__(self):
        if not self._itens:
            raise StopIteration
        return self._itens.pop(0)
```
```python name="percorre de trás para a frente"
class Fila:
    def __init__(self):
        self._itens = []

    def entrar(self, nome):
        self._itens.append(nome)

    def atender(self):
        return self._itens.pop(0)

    def __iter__(self):
        return reversed(self._itens)
```

## Passo 6 · Exercício · Um iterador que nunca acaba

Nada obriga um iterador a terminar. Um semáforo troca de cor para sempre; um iterador que modela isso simplesmente nunca levanta `StopIteration`. Quem consome decide quando parar: com um `break`, ou com `islice` do módulo `itertools`, que pega só os `n` primeiros itens de qualquer iterador:

```python
from itertools import islice

print(list(islice(Regressiva(10), 3)))   # [10, 9, 8]
```

Isso só funciona porque o iterador é **preguiçoso** (*lazy*): ele calcula um item por vez, quando o `next` pede. Por isso `list(...)` direto num iterador infinito nunca termina, mas `islice` sim.

Escreva a classe `CicloDeCores(cores)`, um iterador infinito que repete as cores na ordem: depois da última, volta à primeira. E escreva `escala(cores, n)`, que devolve a lista das `n` primeiras cores do ciclo:

```python
escala(["verde", "amarelo", "vermelho"], 5)
# ['verde', 'amarelo', 'vermelho', 'verde', 'amarelo']
```

### Instruções
1. `CicloDeCores(cores)` é um iterador: `__iter__` devolve `self` e `__next__` devolve as cores em ordem, voltando ao começo depois da última, sem nunca terminar.
   Dica: um índice com `% len(...)` volta a zero sozinho.
2. Na criação, guarde uma **cópia** da lista: mudar a lista original depois não afeta o ciclo. Uma lista vazia levanta `ValueError` na criação.
3. `escala(cores, n)` usa `islice` sobre um `CicloDeCores` e devolve uma lista com `n` cores.

### Código inicial
```python
from itertools import islice


class CicloDeCores:
    def __init__(self, cores):
        pass


def escala(cores, n):
    pass
```

### Solução
```python
from itertools import islice


class CicloDeCores:
    def __init__(self, cores):
        if not cores:
            raise ValueError("a lista de cores está vazia")
        self.cores = list(cores)
        self.indice = 0

    def __iter__(self):
        return self

    def __next__(self):
        cor = self.cores[self.indice % len(self.cores)]
        self.indice += 1
        return cor


def escala(cores, n):
    return list(islice(CicloDeCores(cores), n))
```

### Dicas
1. O ciclo nunca levanta `StopIteration`: o `__next__` sempre tem uma cor para devolver.
2. `self.cores = cores` não copia nada; `list(cores)` cria uma lista nova.
3. Em `escala`, não chame `list(CicloDeCores(...))` sem `islice`: um iterador infinito nunca termina de virar lista.

### Verificação
```json
[
  { "id": "proprio-iterador", "checkpoint": 1, "kind": "expr", "setup": "c = CicloDeCores([\"a\", \"b\"])",
    "expr": "iter(c) is c", "expected": true,
    "name": "CicloDeCores é o próprio iterador", "hint": "__iter__ devolve self." },
  { "id": "volta", "checkpoint": 1, "kind": "expr", "setup": "c = CicloDeCores([\"verde\", \"amarelo\"])",
    "expr": "[next(c), next(c), next(c), next(c), next(c)]",
    "expected": ["verde", "amarelo", "verde", "amarelo", "verde"],
    "name": "Depois da última cor, volta à primeira", "hint": "O __next__ nunca encerra: volte ao começo." },
  { "id": "uma-cor", "checkpoint": 1, "kind": "expr",
    "expr": "list(islice(CicloDeCores([\"azul\"]), 4))", "expected": ["azul", "azul", "azul", "azul"],
    "name": "Com uma cor só, repete a mesma cor" },
  { "id": "copia", "checkpoint": 2, "kind": "expr",
    "setup": "cores = [\"verde\", \"vermelho\"]\nc = CicloDeCores(cores)\ncores.append(\"azul\")\ncores[0] = \"preto\"",
    "expr": "list(islice(c, 4))", "expected": ["verde", "vermelho", "verde", "vermelho"],
    "name": "Mudar a lista original depois não altera o ciclo", "hint": "Guarde uma cópia da lista na criação." },
  { "id": "vazia", "checkpoint": 2, "kind": "expr", "expr": "CicloDeCores([])", "raises": "ValueError",
    "name": "Lista vazia levanta ValueError na criação", "hint": "Confira a lista no __init__." },
  { "id": "escala-5", "checkpoint": 3, "kind": "expr", "expr": "escala([\"verde\", \"amarelo\", \"vermelho\"], 5)",
    "expected": ["verde", "amarelo", "vermelho", "verde", "amarelo"], "type": "list",
    "name": "escala com 3 cores e n = 5", "hint": "Use islice para pegar só os n primeiros e converta com list." },
  { "id": "escala-0", "checkpoint": 3, "kind": "expr", "expr": "escala([\"azul\", \"rosa\"], 0)", "expected": [],
    "type": "list", "name": "escala com n = 0 é uma lista vazia" },
  { "id": "escala-7", "checkpoint": 3, "kind": "expr", "expr": "escala([\"a\", \"b\", \"c\"], 7)",
    "expected": ["a", "b", "c", "a", "b", "c", "a"], "type": "list", "name": "escala com n maior que o dobro das cores" },
  { "id": "usa-islice", "checkpoint": 3, "kind": "source", "rule": { "type": "calls", "name": "islice" },
    "name": "escala usa islice" }
]
```

### Soluções erradas
```python name="para depois da última cor"
from itertools import islice


class CicloDeCores:
    def __init__(self, cores):
        if not cores:
            raise ValueError("a lista de cores está vazia")
        self.cores = list(cores)
        self.indice = 0

    def __iter__(self):
        return self

    def __next__(self):
        if self.indice >= len(self.cores):
            raise StopIteration
        cor = self.cores[self.indice]
        self.indice += 1
        return cor


def escala(cores, n):
    return list(islice(CicloDeCores(cores), n))
```
```python name="guarda a mesma lista em vez de uma cópia"
from itertools import islice


class CicloDeCores:
    def __init__(self, cores):
        if not cores:
            raise ValueError("a lista de cores está vazia")
        self.cores = cores
        self.indice = 0

    def __iter__(self):
        return self

    def __next__(self):
        cor = self.cores[self.indice % len(self.cores)]
        self.indice += 1
        return cor


def escala(cores, n):
    return list(islice(CicloDeCores(cores), n))
```
```python name="escala cria um ciclo novo a cada cor"
from itertools import islice


class CicloDeCores:
    def __init__(self, cores):
        if not cores:
            raise ValueError("a lista de cores está vazia")
        self.cores = list(cores)
        self.indice = 0

    def __iter__(self):
        return self

    def __next__(self):
        cor = self.cores[self.indice % len(self.cores)]
        self.indice += 1
        return cor


def escala(cores, n):
    return [next(CicloDeCores(cores)) for _ in range(n)]
```
```python name="não confere a lista vazia"
from itertools import islice


class CicloDeCores:
    def __init__(self, cores):
        self.cores = list(cores)
        self.indice = 0

    def __iter__(self):
        return self

    def __next__(self):
        cor = self.cores[self.indice % len(self.cores)]
        self.indice += 1
        return cor


def escala(cores, n):
    return list(islice(CicloDeCores(cores), n))
```

## Passo 7 · Quiz · Iteráveis e iteradores

### Pergunta
O que este programa imprime?
```python
nomes = ["Ana", "Bia", "Caio"]
a = iter(nomes)
b = iter(nomes)
next(a)
next(a)
print(next(a), next(b))
```
- [ ] `Caio Caio`
- [x] `Caio Ana`
- [ ] `Ana Ana`
- [ ] Levanta `StopIteration`, porque a lista já foi percorrida
> Cada `iter(nomes)` cria um iterador novo, com a sua própria posição. `a` andou duas vezes; `b` ainda está no começo. A lista em si não se esgota.

### Pergunta
Uma turma guarda `pares = zip(nomes, notas)` e faz dois laços seguidos: um `for` que imprime os pares e outro que calcula a média das notas a partir de `pares`. O segundo laço não faz nenhuma volta. Por quê?
- [ ] `zip` só pode ser usado dentro de um `for`
- [x] `zip` devolve um iterador, que ficou esgotado no primeiro laço
- [ ] O primeiro laço apagou os itens das listas `nomes` e `notas`
- [ ] Faltou chamar `iter(pares)` antes do segundo laço
> `zip` devolve um iterador, e iterador só anda para a frente. As listas originais continuam intactas; o que acabou foi o iterador. `iter(pares)` devolve o mesmo iterador esgotado. A correção é `pares = list(zip(nomes, notas))`.

### Pergunta
Uma classe `Baralho` guarda as cartas em `self.cartas` (uma lista) e tem este método. O que acontece em `for carta in Baralho():`?
```python
def __iter__(self):
    return self.cartas
```
- [ ] Funciona: a lista é iterável, então o `for` percorre as cartas
- [ ] O `for` não faz nenhuma volta, sem erro
- [x] `TypeError: iter() returned non-iterator of type 'list'`
- [ ] Laço infinito, porque falta `StopIteration`
> `__iter__` precisa devolver um **iterador** (algo com `__next__`). Uma lista é iterável, mas não é iterador. A correção é `return iter(self.cartas)`.
