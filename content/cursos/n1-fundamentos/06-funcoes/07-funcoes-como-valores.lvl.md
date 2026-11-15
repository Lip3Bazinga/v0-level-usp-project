---
slug: n1-m6-07-funcoes-como-valores
titulo: 'Funções como valores: lambda, map, filter e sorted'
descricao: Passar funções como argumento, escrever lambdas curtas e usar map, filter e sorted com key.
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
- Guardar uma função em variável e passá-la como argumento para outra função
- Escrever lambdas de uma expressão e saber quando preferir def
- Usar map, filter e sorted(key=...) para transformar, filtrar e ordenar coleções
---

## Passo 1 · Leitura · Função também é valor

Você já sabe que `dobro(4)`, com parênteses, chama a função. E o nome `dobro` sozinho? Ele é **a própria função**: um valor, como um número ou um texto. Sendo um valor, a função pode ser guardada em outra variável e passada como argumento.

```python
def dobro(x):
    return x * 2


operacao = dobro       # sem parênteses: guarda a função, não a chama
print(operacao(4))     # 8
```

`operacao` e `dobro` são dois nomes para a mesma função. Passar uma função como argumento é o que torna úteis três ferramentas do Python.

**`map(funcao, lista)`** aplica a função a cada item. **`filter(funcao, lista)`** mantém só os itens para os quais a função devolve `True`. Os dois entregam o resultado aos poucos, sob demanda; para ver tudo de uma vez, converta com `list(...)`:

```python
def eh_positivo(x):
    return x > 0


print(list(map(dobro, [1, 2, 3])))              # [2, 4, 6]
print(list(filter(eh_positivo, [3, -1, 5])))    # [3, 5]
```

**`sorted(lista, key=funcao)`** ordena pelo valor que a função devolve para cada item, e não pelo item em si. Com `reverse=True`, a ordem é decrescente:

```python
nomes = ["Caio", "Ana", "Beatriz"]
print(sorted(nomes, key=len))                   # ['Ana', 'Caio', 'Beatriz']
print(sorted(nomes, key=len, reverse=True))     # ['Beatriz', 'Caio', 'Ana']
```

Repare: `key=len`, sem parênteses. Você entrega a função, e é o `sorted` que a chama, uma vez por item.

Criar um `def` só para usar a função uma vez dá trabalho. Para esses casos existe a **`lambda`**, uma função sem nome escrita em uma linha: `lambda parâmetros: expressão`. Ela devolve o valor da expressão, sem a palavra `return`.

```python
triplo = lambda x: x * 3
print(triplo(4))                                # 12
print(list(map(lambda x: x * 3, [1, 2, 3])))    # [3, 6, 9]
```

Uma `lambda` só comporta **uma expressão**: nada de `if` em bloco, laços ou várias linhas. Se a função precisa de mais do que isso, ou merece um nome e uma docstring, use `def`.

Acompanhe no visualizador: `operacao` e `dobro` apontam para a mesma função, e `triplo` aponta para uma função criada com `lambda`.

```python visualizar
def dobro(x):
    return x * 2


operacao = dobro
print(operacao(4))
triplo = lambda x: x * 3
print(triplo(4))
print(list(map(dobro, [1, 2, 3])))
```

## Passo 2 · Exercício · aplicar_a_todos(funcao, lista)

Para entender o que `map` faz por dentro, escreva a sua versão. `aplicar_a_todos(funcao, lista)` recebe uma função e uma lista e devolve uma **lista nova** com o resultado de `funcao` para cada item, na mesma ordem. A lista original não muda.

Exemplos, supondo que exista uma função `triplo(x)` que devolve `x * 3`:

- `aplicar_a_todos(triplo, [1, 2])` devolve `[3, 6]`;
- `aplicar_a_todos(len, ["ab", "c"])` devolve `[2, 1]`;
- com a lista vazia, devolve `[]`.

Escreva com um laço `for` e uma lista acumuladora, sem usar `map`.

### Instruções
1. Defina `aplicar_a_todos(funcao, lista)`, que percorre a lista, chama `funcao` com cada item e devolve uma lista nova com os resultados.
   Dica: o parâmetro funcao guarda uma função; para chamá-la, escreva funcao(item).

### Código inicial
```python
def aplicar_a_todos(funcao, lista):
    pass
```

### Solução
```python
def aplicar_a_todos(funcao, lista):
    resultado = []
    for item in lista:
        resultado.append(funcao(item))
    return resultado
```

### Dicas
1. Dentro do laço, chame a função recebida com o item da vez: `funcao(item)`.
2. Guarde cada resultado em uma lista nova, que começa vazia antes do laço, e devolva essa lista no fim.

### Verificação
```json
[
  { "id": "triplo", "checkpoint": 1, "kind": "expr", "setup": "def triplo(x):\n    return x * 3", "expr": "aplicar_a_todos(triplo, [1, 2])", "expected": [3, 6], "type": "list",
    "name": "aplicar_a_todos(triplo, [1, 2]) é [3, 6]", "hint": "Chame a função recebida com cada item e guarde os resultados." },
  { "id": "len", "checkpoint": 1, "kind": "expr", "expr": "aplicar_a_todos(len, [\"ab\", \"c\"])", "expected": [2, 1], "type": "list",
    "name": "aplicar_a_todos(len, [\"ab\", \"c\"]) é [2, 1]", "hint": "A função pode ser qualquer uma: use o parâmetro funcao, não uma conta fixa." },
  { "id": "lambda", "checkpoint": 1, "kind": "expr", "expr": "aplicar_a_todos(lambda x: x - 1, [10, 0, -5])", "expected": [9, -1, -6], "type": "list",
    "name": "aplicar_a_todos funciona com uma lambda" },
  { "id": "vazia", "checkpoint": 1, "kind": "expr", "expr": "aplicar_a_todos(len, [])", "expected": [], "type": "list",
    "name": "Com a lista vazia, devolve []", "hint": "Devolva sempre uma lista, mesmo que vazia." },
  { "id": "original-intacta", "checkpoint": 1, "kind": "expr", "setup": "numeros = [1, 2, 3]\naplicar_a_todos(lambda x: x * 10, numeros)", "expr": "numeros", "expected": [1, 2, 3],
    "name": "A lista original não muda", "hint": "Guarde os resultados em uma lista nova em vez de alterar a recebida." },
  { "id": "sem-map", "checkpoint": 1, "kind": "source", "rule": { "type": "not_calls", "name": "map" },
    "name": "Sem usar map", "hint": "Aqui o objetivo é escrever o laço que o map faz por dentro." }
]
```

### Soluções erradas
```python name="chama funcao() sem argumento"
def aplicar_a_todos(funcao, lista):
    resultado = []
    for item in lista:
        resultado.append(funcao())
    return resultado
```
```python name="devolve a lista original"
def aplicar_a_todos(funcao, lista):
    for item in lista:
        funcao(item)
    return lista
```
```python name="guarda a função em vez do resultado"
def aplicar_a_todos(funcao, lista):
    resultado = []
    for item in lista:
        resultado.append(funcao)
    return resultado
```
```python name="altera a lista recebida"
def aplicar_a_todos(funcao, lista):
    for i in range(len(lista)):
        lista[i] = funcao(lista[i])
    return lista
```
```python name="return dentro do laço"
def aplicar_a_todos(funcao, lista):
    resultado = []
    for item in lista:
        resultado.append(funcao(item))
        return resultado
```

## Passo 3 · Previsão · Ordenar, filtrar e transformar

Leia o programa com calma, sem executar, e digite exatamente o que ele imprime (uma linha de saída por linha da sua resposta). Cada aluno é uma tupla `(nome, nota)`: em cada `lambda`, `a[0]` é o nome e `a[1]` é a nota.

### Código
```python
alunos = [("Caio", 7), ("Ana", 9), ("Bia", 8)]
print(sorted(alunos))
print(sorted(alunos, key=lambda a: a[1]))
print(list(filter(lambda a: a[1] >= 8, alunos)))
print(list(map(lambda a: a[0], alunos)))
```

### Dicas
1. Sem `key`, as tuplas são ordenadas pelo primeiro item, que aqui é o nome.
2. `filter` e `map` mantêm a ordem original da lista; só `sorted` muda a ordem.
3. Na saída, as tuplas aparecem com parênteses e os textos, com aspas simples: `('Ana', 9)`.

### Saída esperada
```text
[('Ana', 9), ('Bia', 8), ('Caio', 7)]
[('Caio', 7), ('Bia', 8), ('Ana', 9)]
[('Ana', 9), ('Bia', 8)]
['Caio', 'Ana', 'Bia']
```

## Passo 4 · Exercício · map e filter
modo: lacunas

Complete as lacunas (`___`) de duas funções que usam `lambda`.

- `dobrados(lista)` devolve uma lista com o dobro de cada número: `dobrados([1, -2, 3])` devolve `[2, -4, 6]`.
- `positivos(lista)` devolve uma lista só com os números maiores que zero: `positivos([1, -2, 3])` devolve `[1, 3]`. O zero não é positivo.

### Instruções
1. Em `dobrados`, complete a expressão da `lambda`: o que fazer com cada `x`.
2. Em `positivos`, complete o nome da função que mantém só os itens que passam no teste da `lambda`.

### Código inicial
```python
def dobrados(lista):
    return list(map(lambda x: ___, lista))


def positivos(lista):
    return list(___(lambda x: x > 0, lista))
```

### Solução
```python
def dobrados(lista):
    return list(map(lambda x: x * 2, lista))


def positivos(lista):
    return list(filter(lambda x: x > 0, lista))
```

### Dicas
1. A `lambda` diz o que fazer com cada `x`. Depois dos dois-pontos vai a conta, sem `return`.
2. Quem escolhe os itens que passam em um teste é `filter`; `map` transforma todos os itens.

### Verificação
```json
[
  { "id": "dobrados-misto", "checkpoint": 1, "kind": "call", "function": "dobrados", "args": [[1, -2, 3]], "expected": [2, -4, 6], "type": "list",
    "name": "dobrados([1, -2, 3]) é [2, -4, 6]", "hint": "A lambda devolve o dobro de x." },
  { "id": "dobrados-zero", "checkpoint": 1, "kind": "call", "function": "dobrados", "args": [[0, 5]], "expected": [0, 10], "type": "list",
    "name": "dobrados([0, 5]) é [0, 10]" },
  { "id": "dobrados-vazia", "checkpoint": 1, "kind": "call", "function": "dobrados", "args": [[]], "expected": [], "type": "list",
    "name": "dobrados([]) é []" },
  { "id": "usa-lambda", "checkpoint": 1, "kind": "source", "rule": { "type": "uses", "construct": "lambda" },
    "name": "Usa lambda" },
  { "id": "chama-map", "checkpoint": 1, "kind": "source", "rule": { "type": "calls", "name": "map" },
    "name": "dobrados usa map", "hint": "Mantenha o map do código inicial e complete só a lacuna." },
  { "id": "positivos-misto", "checkpoint": 2, "kind": "call", "function": "positivos", "args": [[1, -2, 3]], "expected": [1, 3], "type": "list",
    "name": "positivos([1, -2, 3]) é [1, 3]", "hint": "Use a função que mantém só os itens que passam no teste." },
  { "id": "positivos-zero", "checkpoint": 2, "kind": "call", "function": "positivos", "args": [[0, 5]], "expected": [5], "type": "list",
    "name": "positivos([0, 5]) é [5]", "hint": "O zero não é positivo: o teste é x > 0." },
  { "id": "positivos-vazia", "checkpoint": 2, "kind": "call", "function": "positivos", "args": [[]], "expected": [], "type": "list",
    "name": "positivos([]) é []" },
  { "id": "chama-filter", "checkpoint": 2, "kind": "source", "rule": { "type": "calls", "name": "filter" },
    "name": "positivos usa filter", "hint": "O nome que falta é o da função que filtra." }
]
```

### Soluções erradas
```python name="compreensão de lista no lugar de map"
def dobrados(lista):
    return [x * 2 for x in lista]


def positivos(lista):
    return list(filter(lambda x: x > 0, lista))
```
```python name="x >= 0 deixa o zero passar"
def dobrados(lista):
    return list(map(lambda x: x * 2, lista))


def positivos(lista):
    return list(filter(lambda x: x >= 0, lista))
```
```python name="map no lugar de filter"
def dobrados(lista):
    return list(map(lambda x: x * 2, lista))


def positivos(lista):
    return list(map(lambda x: x > 0, lista))
```
```python name="eleva ao quadrado em vez de dobrar"
def dobrados(lista):
    return list(map(lambda x: x ** 2, lista))


def positivos(lista):
    return list(filter(lambda x: x > 0, lista))
```

## Passo 5 · Quiz · Funções como valores

### Pergunta
Uma `lambda` pode conter a palavra `return`?
- [ ] Sim, e ela é obrigatória, como em qualquer função que devolve valor
- [ ] Sim, mas só quando a `lambda` tem mais de um parâmetro
- [x] Não: a `lambda` é uma única expressão, e o valor dessa expressão já é o que ela devolve
- [ ] Não, porque uma `lambda` nunca devolve valor
> `lambda x: x * 2` devolve `x * 2` sem precisar de `return`. Escrever `lambda x: return x * 2` dá `SyntaxError`. Para uma função com várias instruções, use `def`.

### Pergunta
Dada a função `tamanho(nome)`, que devolve `len(nome)`, qual é a diferença entre as duas linhas?
```python
sorted(nomes, key=tamanho)
sorted(nomes, key=tamanho())
```
- [ ] Nenhuma: as duas ordenam os nomes pelo tamanho
- [x] A primeira entrega a função para o `sorted` chamar; a segunda tenta chamar `tamanho` na hora, sem argumento, e dá `TypeError`
- [ ] A primeira dá erro, porque faltam os parênteses da chamada
- [ ] A segunda ordena em ordem decrescente
> `tamanho` é a função; `tamanho()` é uma chamada. O `key` precisa da função em si, para o `sorted` chamá-la com cada item. A chamada sem argumento falha antes mesmo de o `sorted` começar.

### Pergunta
O que `print(map(len, ["ab", "c"]))` mostra?
- [ ] `[2, 1]`
- [ ] `(2, 1)`
- [x] Algo como `<map object at 0x...>`: o `map` devolve um objeto que calcula os itens sob demanda, não uma lista
- [ ] Um `TypeError`, porque `len` não pode ser passada como argumento
> `map` e `filter` não montam a lista na hora. Para ver ou guardar todos os resultados, converta: `list(map(len, ["ab", "c"]))` dá `[2, 1]`.

## Passo 6 · Exercício · Ordenação por critério

A secretaria guarda os alunos de uma turma como uma lista de tuplas `(nome, nota)` e precisa de duas listagens: uma por nota, da maior para a menor, e outra por nome, em ordem alfabética.

Escreva duas funções com `sorted` e `lambda`. As duas devolvem uma lista nova e não alteram a lista recebida.

- `por_nota(alunos)` devolve os alunos da **maior nota para a menor**.
- `por_nome(alunos)` devolve os alunos em **ordem alfabética de nome**.

Com `turma = [("Caio", 7), ("Ana", 9), ("Bia", 8)]`:

- `por_nota(turma)` devolve `[("Ana", 9), ("Bia", 8), ("Caio", 7)]`;
- `por_nome(turma)` devolve `[("Ana", 9), ("Bia", 8), ("Caio", 7)]`.

Nesta turma as duas listagens coincidem, mas isso é acaso: com `[("Ana", 5), ("Davi", 10)]`, `por_nota` devolve `[("Davi", 10), ("Ana", 5)]`.

### Instruções
1. Defina `por_nota(alunos)` com `sorted`, usando uma `lambda` como `key` para ordenar pela nota, da maior para a menor.
   Dica: a nota é o item de índice 1 de cada tupla.
2. Defina `por_nome(alunos)` com `sorted`, usando uma `lambda` como `key` para ordenar pelo nome, em ordem alfabética.

### Código inicial
```python
def por_nota(alunos):
    pass


def por_nome(alunos):
    pass
```

### Solução
```python
def por_nota(alunos):
    return sorted(alunos, key=lambda a: a[1], reverse=True)


def por_nome(alunos):
    return sorted(alunos, key=lambda a: a[0])
```

### Dicas
1. `key=lambda a: a[1]` ordena pela nota; `key=lambda a: a[0]` ordena pelo nome.
2. `sorted` ordena do menor para o maior. Para a maior nota vir primeiro, acrescente `reverse=True`.
3. Use `sorted(alunos, ...)`, que devolve uma lista nova, e não `alunos.sort()`, que altera a lista recebida e devolve `None`.

### Verificação
```json
[
  { "id": "nota-turma", "checkpoint": 1, "kind": "expr", "expr": "por_nota([(\"Caio\", 7), (\"Ana\", 9), (\"Bia\", 8)])", "expected": [["Ana", 9], ["Bia", 8], ["Caio", 7]], "type": "list",
    "name": "por_nota da turma do enunciado", "hint": "A maior nota vem primeiro." },
  { "id": "nota-difere-do-nome", "checkpoint": 1, "kind": "expr", "expr": "por_nota([(\"Ana\", 5), (\"Davi\", 10), (\"Bia\", 7)])", "expected": [["Davi", 10], ["Bia", 7], ["Ana", 5]], "type": "list",
    "name": "por_nota ordena pela nota, não pelo nome", "hint": "Use key com uma lambda que devolve a nota, e reverse=True." },
  { "id": "nota-um", "checkpoint": 1, "kind": "expr", "expr": "por_nota([(\"Eva\", 6)])", "expected": [["Eva", 6]], "type": "list",
    "name": "por_nota com um aluno só" },
  { "id": "nota-vazia", "checkpoint": 1, "kind": "expr", "expr": "por_nota([])", "expected": [], "type": "list",
    "name": "por_nota([]) é []" },
  { "id": "nota-original", "checkpoint": 1, "kind": "expr", "setup": "turma = [(\"Ana\", 5), (\"Davi\", 10), (\"Bia\", 7)]\npor_nota(turma)", "expr": "turma", "expected": [["Ana", 5], ["Davi", 10], ["Bia", 7]],
    "name": "por_nota não altera a lista recebida", "hint": "Use sorted, que devolve uma lista nova." },
  { "id": "nome-turma", "checkpoint": 2, "kind": "expr", "expr": "por_nome([(\"Caio\", 7), (\"Ana\", 9), (\"Bia\", 8)])", "expected": [["Ana", 9], ["Bia", 8], ["Caio", 7]], "type": "list",
    "name": "por_nome da turma do enunciado", "hint": "Ordem alfabética: do A para o Z." },
  { "id": "nome-difere-da-nota", "checkpoint": 2, "kind": "expr", "expr": "por_nome([(\"Davi\", 10), (\"Bia\", 7), (\"Ana\", 5), (\"Caio\", 8)])", "expected": [["Ana", 5], ["Bia", 7], ["Caio", 8], ["Davi", 10]], "type": "list",
    "name": "por_nome ordena pelo nome, não pela nota", "hint": "Use key com uma lambda que devolve o nome, sem reverse." },
  { "id": "nome-original", "checkpoint": 2, "kind": "expr", "setup": "turma = [(\"Davi\", 10), (\"Ana\", 5)]\npor_nome(turma)", "expr": "turma", "expected": [["Davi", 10], ["Ana", 5]],
    "name": "por_nome não altera a lista recebida", "hint": "Use sorted, que devolve uma lista nova." },
  { "id": "usa-lambda", "checkpoint": 1, "kind": "source", "rule": { "type": "uses", "construct": "lambda" },
    "name": "Usa lambda como critério", "hint": "Passe key=lambda a: ... para o sorted." },
  { "id": "chama-sorted", "checkpoint": 1, "kind": "source", "rule": { "type": "calls", "name": "sorted" },
    "name": "Usa sorted" }
]
```

### Soluções erradas
```python name="por_nota com sorted sem key: ordena por nome"
def por_nota(alunos):
    return sorted(alunos)


def por_nome(alunos):
    return sorted(alunos, key=lambda a: a[0])
```
```python name="por_nota sem reverse=True: ordem crescente"
def por_nota(alunos):
    return sorted(alunos, key=lambda a: a[1])


def por_nome(alunos):
    return sorted(alunos, key=lambda a: a[0])
```
```python name="por_nome também com reverse=True"
def por_nota(alunos):
    return sorted(alunos, key=lambda a: a[1], reverse=True)


def por_nome(alunos):
    return sorted(alunos, key=lambda a: a[0], reverse=True)
```
```python name="usa sort, que altera a lista recebida"
def por_nota(alunos):
    alunos.sort(key=lambda a: a[1], reverse=True)
    return alunos


def por_nome(alunos):
    alunos.sort(key=lambda a: a[0])
    return alunos
```
```python name="critérios trocados entre as funções"
def por_nota(alunos):
    return sorted(alunos, key=lambda a: a[0])


def por_nome(alunos):
    return sorted(alunos, key=lambda a: a[1], reverse=True)
```
