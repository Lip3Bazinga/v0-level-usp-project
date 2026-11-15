---
slug: n1-m5-07-compreensoes
titulo: Compreensões de lista e de dicionário
descricao: Criar listas e dicionários em uma linha a partir de outra coleção, com filtro, sem perder a legibilidade.
dificuldade: iniciante
tipo: guiada
runtime: python
bibliotecas: []
xp: 110
tempo_min: 45
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Reescrever laços de transformação e filtro como compreensões de lista
- Escrever compreensões de dicionário e de conjunto
- Reconhecer quando uma compreensão fica ilegível e voltar ao laço
---

## Passo 1 · Leitura · O laço em uma linha

Na lição sobre percorrer listas você repetiu várias vezes o mesmo padrão: uma lista começa vazia, um `for` percorre outra coleção e um `append` guarda uma versão de cada item, às vezes só de alguns. Esse padrão é tão comum que o Python tem uma forma curta para ele, a **compreensão de lista**.

O laço:

```python
dobros = []
for n in numeros:
    dobros.append(n * 2)
```

A compreensão que faz o mesmo:

```python
dobros = [n * 2 for n in numeros]
```

Leia como uma frase: "`n * 2` para cada `n` em `numeros`". Os colchetes dizem que o resultado é uma lista nova. A forma completa tem três partes:

```python
[expressao for item in colecao if condicao]
```

| Parte | Pergunta que ela responde | No laço, era |
|---|---|---|
| `expressao` | o que guardar? | o que ia dentro do `append` |
| `for item in colecao` | de onde vêm os itens? | a linha do `for` |
| `if condicao` | quais itens entram? (opcional) | o `if` em volta do `append` |

A expressão vem **primeiro**, e o filtro vem **depois** do `for`. Execute passo a passo e veja que as duas listas terminam iguais:

```python visualizar
numeros = [1, 2, 3, 4]
quadrados = []
for n in numeros:
    if n % 2 == 0:
        quadrados.append(n * n)
mesma_coisa = [n * n for n in numeros if n % 2 == 0]
print(quadrados, mesma_coisa)
```

#### Dicionário e conjunto

Trocando os colchetes por chaves, a mesma ideia cria um dicionário (com `chave: valor` na expressão) ou um conjunto (com um valor só):

```python
nomes = ["Ana", "Caio"]
tamanhos = {nome: len(nome) for nome in nomes}   # {'Ana': 3, 'Caio': 4}
iniciais = {nome[0] for nome in nomes}           # conjunto com 'A' e 'C'
```

#### Quando voltar ao laço

A compreensão existe para ficar mais fácil de ler, não para economizar linhas. Use quando a frase couber em uma linha e for clara: transformar, filtrar ou as duas coisas. Volte ao laço comum quando a condição for comprida, quando houver um laço dentro de outro ou quando cada volta fizer mais de uma coisa. E use compreensão só para **construir uma coleção**: para imprimir ou alterar outra variável a cada volta, o lugar é o `for`.

## Passo 2 · Exercício · Reescreva
modo: lacunas

As três funções abaixo já estão no formato de compreensão, com uma parte faltando em cada. Complete as lacunas (`___`).

| Chamada | Devolve |
|---|---|
| `quadrados([1, 2, 3])` | `[1, 4, 9]` |
| `pares([1, 2, 3, 4])` | `[2, 4]` |
| `maiusculas(["oi", "usp"])` | `["OI", "USP"]` |

O método `upper()` de um texto devolve o mesmo texto em letras maiúsculas: `"oi".upper()` é `"OI"`.

### Instruções
1. Em `quadrados`, complete o que entra na lista: o quadrado de cada número.
   Dica: a variável do laço se chama `n`.
2. Em `pares`, complete o filtro: só entram os números pares.
3. Em `maiusculas`, complete a transformação e a variável do laço: cada palavra entra em maiúsculas.
   Dica: as duas lacunas usam o mesmo nome de variável, que você escolhe.

### Código inicial
```python
def quadrados(numeros):
    return [___ for n in numeros]


def pares(numeros):
    return [n for n in numeros if ___]


def maiusculas(palavras):
    return [___ for ___ in palavras]
```

### Solução
```python
def quadrados(numeros):
    return [n * n for n in numeros]


def pares(numeros):
    return [n for n in numeros if n % 2 == 0]


def maiusculas(palavras):
    return [p.upper() for p in palavras]
```

### Dicas
1. A expressão que vem primeiro é o que entra na lista. O quadrado de `n` é `n * n`.
2. O filtro é uma condição depois do `for`: um número é par quando o resto da divisão por 2 é zero.
3. Em `maiusculas`, escolha um nome para a variável, por exemplo `p`: a expressão é `p.upper()` e o laço é `for p in palavras`.

### Verificação
```json
[
  { "id": "quadrados-3", "checkpoint": 1, "kind": "call", "function": "quadrados", "args": [[1, 2, 3]], "expected": [1, 4, 9], "type": "list",
    "name": "quadrados([1, 2, 3]) é [1, 4, 9]", "hint": "O quadrado é o número vezes ele mesmo, não o dobro." },
  { "id": "quadrados-negativo", "checkpoint": 1, "kind": "call", "function": "quadrados", "args": [[-3, 0, 5]], "expected": [9, 0, 25], "type": "list",
    "name": "quadrados([-3, 0, 5]) é [9, 0, 25]" },
  { "id": "quadrados-comp", "checkpoint": 1, "kind": "source", "rule": { "type": "uses", "construct": "list_comprehension", "function": "quadrados" },
    "name": "quadrados usa compreensão de lista" },
  { "id": "pares-4", "checkpoint": 2, "kind": "call", "function": "pares", "args": [[1, 2, 3, 4]], "expected": [2, 4], "type": "list",
    "name": "pares([1, 2, 3, 4]) é [2, 4]", "hint": "A condição precisa ser verdadeira para os pares, não para os ímpares." },
  { "id": "pares-zero", "checkpoint": 2, "kind": "call", "function": "pares", "args": [[0, 7, -2, 9]], "expected": [0, -2], "type": "list",
    "name": "Zero e negativos pares também entram", "hint": "Use o resto da divisão por 2." },
  { "id": "pares-comp", "checkpoint": 2, "kind": "source", "rule": { "type": "uses", "construct": "list_comprehension", "function": "pares" },
    "name": "pares usa compreensão de lista" },
  { "id": "maiusculas-2", "checkpoint": 3, "kind": "call", "function": "maiusculas", "args": [["oi", "usp"]], "expected": ["OI", "USP"], "type": "list",
    "name": "maiusculas([\"oi\", \"usp\"]) é [\"OI\", \"USP\"]", "hint": "Chame upper() em cada palavra, com os parênteses." },
  { "id": "maiusculas-vazia", "checkpoint": 3, "kind": "call", "function": "maiusculas", "args": [[]], "expected": [], "type": "list",
    "name": "maiusculas([]) é []" },
  { "id": "maiusculas-comp", "checkpoint": 3, "kind": "source", "rule": { "type": "uses", "construct": "list_comprehension", "function": "maiusculas" },
    "name": "maiusculas usa compreensão de lista" }
]
```

### Soluções erradas
```python name="quadrados devolve o dobro (n * 2)"
def quadrados(numeros):
    return [n * 2 for n in numeros]


def pares(numeros):
    return [n for n in numeros if n % 2 == 0]


def maiusculas(palavras):
    return [p.upper() for p in palavras]
```
```python name="pares filtra os ímpares (n % 2 == 1)"
def quadrados(numeros):
    return [n * n for n in numeros]


def pares(numeros):
    return [n for n in numeros if n % 2 == 1]


def maiusculas(palavras):
    return [p.upper() for p in palavras]
```
```python name="maiusculas sem transformar (devolve as palavras como vieram)"
def quadrados(numeros):
    return [n * n for n in numeros]


def pares(numeros):
    return [n for n in numeros if n % 2 == 0]


def maiusculas(palavras):
    return [p for p in palavras]
```

## Passo 3 · Exercício · Tamanho de cada palavra

Escreva `tamanhos(palavras)`, que recebe uma lista de palavras e devolve um dicionário em que cada palavra é a chave e a quantidade de letras dela é o valor. Use uma **compreensão de dicionário**.

| Chamada | Devolve |
|---|---|
| `tamanhos(["casa", "sol"])` | `{"casa": 4, "sol": 3}` |
| `tamanhos(["python"])` | `{"python": 6}` |
| `tamanhos([])` | `{}` |

### Instruções
1. Devolva o dicionário palavra → tamanho para todas as palavras da lista.
   Dica: `len` também conta as letras de um texto.
2. Monte o dicionário com uma compreensão de dicionário, em uma linha.

### Código inicial
```python
def tamanhos(palavras):
    pass
```

### Solução
```python
def tamanhos(palavras):
    return {p: len(p) for p in palavras}
```

### Dicas
1. A compreensão de dicionário usa chaves e uma expressão no formato `chave: valor`.
2. A chave é a própria palavra, e o valor é `len(p)`. Se os dois trocarem de lugar, o dicionário fica ao contrário.
3. A função inteira é `return {p: len(p) for p in palavras}`.

### Verificação
```json
[
  { "id": "casa-sol", "checkpoint": 1, "kind": "call", "function": "tamanhos", "args": [["casa", "sol"]], "expected": { "casa": 4, "sol": 3 }, "type": "dict",
    "name": "tamanhos([\"casa\", \"sol\"]) é {\"casa\": 4, \"sol\": 3}", "hint": "A palavra é a chave e o tamanho é o valor; o retorno é um dicionário." },
  { "id": "mesmo-tamanho", "checkpoint": 1, "kind": "call", "function": "tamanhos", "args": [["uva", "sol", "paralelepípedo"]], "expected": { "uva": 3, "sol": 3, "paralelepípedo": 14 }, "type": "dict",
    "name": "Palavras de mesmo tamanho continuam com uma chave cada", "hint": "Se o tamanho fosse a chave, uva e sol disputariam a mesma chave." },
  { "id": "borda-vazia", "checkpoint": 1, "kind": "call", "function": "tamanhos", "args": [[]], "expected": {}, "type": "dict",
    "name": "tamanhos([]) é {}" },
  { "id": "usa-dict-comp", "checkpoint": 2, "kind": "source", "rule": { "type": "uses", "construct": "dict_comprehension", "function": "tamanhos" },
    "name": "tamanhos usa compreensão de dicionário", "hint": "Chaves em volta, chave: valor na frente e o for depois." }
]
```

### Soluções erradas
```python name="lista de tuplas em vez de dicionário"
def tamanhos(palavras):
    return [(p, len(p)) for p in palavras]
```
```python name="chave e valor trocados"
def tamanhos(palavras):
    return {len(p): p for p in palavras}
```
```python name="laço com acumulador, sem compreensão"
def tamanhos(palavras):
    resultado = {}
    for p in palavras:
        resultado[p] = len(p)
    return resultado
```

## Passo 4 · Previsão · Leia a compreensão

Leia o programa sem executar e digite exatamente o que ele imprime. São quatro linhas de saída. Lembre que `range(3)` produz 0, 1 e 2.

### Código
```python
print([x * 2 for x in range(3)])
print([x for x in range(6) if x % 2 == 1])
print({p: len(p) for p in ["oi", "olá"]})
print([p[0] for p in ["Ana", "Bia"]])
```

### Dicas
1. Leia cada compreensão de trás para a frente: de onde vêm os itens, qual é o filtro, o que é guardado.
2. Um texto também tem índices: `p[0]` é a primeira letra de `p`.
3. O dicionário aparece com chaves, aspas simples nos textos, dois-pontos e um espaço antes de cada valor.

### Saída esperada
```text
[0, 2, 4]
[1, 3, 5]
{'oi': 2, 'olá': 3}
['A', 'B']
```

## Passo 5 · Quiz · Compreensões

### Pergunta
O que `[x * 2 for x in range(3)]` produz?
- [ ] `[2, 4, 6]`
- [x] `[0, 2, 4]`
- [ ] `[0, 1, 2, 0, 1, 2]`
- [ ] `[0, 2, 4, 6]`
> `range(3)` produz 0, 1 e 2. A expressão `x * 2` é aplicada a cada um: 0, 2 e 4.

### Pergunta
Qual linha cria a lista dos números positivos de `numeros`?
- [ ] `[n if n > 0 for n in numeros]`
- [ ] `[for n in numeros if n > 0: n]`
- [x] `[n for n in numeros if n > 0]`
- [ ] `[n for n > 0 in numeros]`
> O `if` de filtro fica depois do `for`. A primeira alternativa dá `SyntaxError`: um `if` antes do `for` é outra construção, que exige um `else`.

### Pergunta
O que a variável `r` guarda depois desta linha?
```python
r = (x * 2 for x in range(3))
```
- [ ] A tupla `(0, 2, 4)`
- [ ] A lista `[0, 2, 4]`
- [x] Um gerador: um objeto que produz os valores um a um, quando alguém os pede
- [ ] Nada: a linha dá `SyntaxError`
> Não existe "compreensão de tupla". Com parênteses, o Python cria um gerador, que não calcula nada até ser percorrido; `print(r)` mostra algo como `<generator object ...>`. Para uma tupla, escreva `tuple(x * 2 for x in range(3))`.

## Passo 6 · Exercício · Quadrados ímpares e iniciais

Escreva duas funções, cada uma com uma compreensão de lista.

| Chamada | Devolve |
|---|---|
| `quadrados_impares(5)` | `[1, 9, 25]` |
| `quadrados_impares(6)` | `[1, 9, 25]` |
| `quadrados_impares(0)` | `[]` |
| `iniciais(["Ana Souza", "Bia Lima"])` | `["A", "B"]` |

`quadrados_impares(n)` devolve os quadrados dos números **ímpares de 1 até `n`**, com o próprio `n` incluído quando ele é ímpar. `iniciais(nomes)` devolve a primeira letra de cada nome; pode supor que nenhum nome é vazio.

### Instruções
1. Complete `quadrados_impares(n)` com uma compreensão de lista que percorre de 1 até `n`, filtra os ímpares e guarda o quadrado de cada um.
   Dica: o fim do `range` é exclusivo.
2. Complete `iniciais(nomes)` com uma compreensão de lista que guarda a primeira letra de cada nome.

### Código inicial
```python
def quadrados_impares(n):
    pass


def iniciais(nomes):
    pass
```

### Solução
```python
def quadrados_impares(n):
    return [x * x for x in range(1, n + 1) if x % 2 == 1]


def iniciais(nomes):
    return [nome[0] for nome in nomes]
```

### Dicas
1. A ordem das partes é: expressão, `for`, filtro. O `if` de filtro vem depois do `for`.
2. `range(1, n + 1)` vai de 1 até `n`, com o `n` incluído; `range(n)` para em `n - 1`.
3. A primeira letra de um texto é o índice 0: `nome[0]`.

### Verificação
```json
[
  { "id": "qi-5", "checkpoint": 1, "kind": "call", "function": "quadrados_impares", "args": [5], "expected": [1, 9, 25], "type": "list",
    "name": "quadrados_impares(5) é [1, 9, 25]", "hint": "O 5 é ímpar e precisa entrar: confira onde o range termina." },
  { "id": "qi-6", "checkpoint": 1, "kind": "call", "function": "quadrados_impares", "args": [6], "expected": [1, 9, 25], "type": "list",
    "name": "quadrados_impares(6) é [1, 9, 25]", "hint": "Só os ímpares entram; o 6 fica de fora." },
  { "id": "qi-1", "checkpoint": 1, "kind": "call", "function": "quadrados_impares", "args": [1], "expected": [1], "type": "list",
    "name": "quadrados_impares(1) é [1]" },
  { "id": "qi-0", "checkpoint": 1, "kind": "call", "function": "quadrados_impares", "args": [0], "expected": [], "type": "list",
    "name": "quadrados_impares(0) é []" },
  { "id": "qi-comp", "checkpoint": 1, "kind": "source", "rule": { "type": "uses", "construct": "list_comprehension", "function": "quadrados_impares" },
    "name": "quadrados_impares usa compreensão de lista" },
  { "id": "iniciais-2", "checkpoint": 2, "kind": "call", "function": "iniciais", "args": [["Ana Souza", "Bia Lima"]], "expected": ["A", "B"], "type": "list",
    "name": "iniciais([\"Ana Souza\", \"Bia Lima\"]) é [\"A\", \"B\"]", "hint": "Só a primeira letra de cada nome completo." },
  { "id": "iniciais-3", "checkpoint": 2, "kind": "call", "function": "iniciais", "args": [["Caio", "eva", "Davi Reis"]], "expected": ["C", "e", "D"], "type": "list",
    "name": "A inicial sai como está no nome, sem mudar maiúsculas e minúsculas" },
  { "id": "iniciais-vazia", "checkpoint": 2, "kind": "call", "function": "iniciais", "args": [[]], "expected": [], "type": "list",
    "name": "iniciais([]) é []" },
  { "id": "iniciais-comp", "checkpoint": 2, "kind": "source", "rule": { "type": "uses", "construct": "list_comprehension", "function": "iniciais" },
    "name": "iniciais usa compreensão de lista" }
]
```

### Soluções erradas
```python name="if antes do for (SyntaxError)"
def quadrados_impares(n):
    return [x * x if x % 2 == 1 for x in range(1, n + 1)]


def iniciais(nomes):
    return [nome[0] for nome in nomes]
```
```python name="range(n) em quadrados_impares (falta o próprio n)"
def quadrados_impares(n):
    return [x * x for x in range(n) if x % 2 == 1]


def iniciais(nomes):
    return [nome[0] for nome in nomes]
```
```python name="guarda o número ímpar, não o quadrado dele"
def quadrados_impares(n):
    return [x for x in range(1, n + 1) if x % 2 == 1]


def iniciais(nomes):
    return [nome[0] for nome in nomes]
```
```python name="iniciais devolve o nome inteiro"
def quadrados_impares(n):
    return [x * x for x in range(1, n + 1) if x % 2 == 1]


def iniciais(nomes):
    return [nome for nome in nomes]
```
