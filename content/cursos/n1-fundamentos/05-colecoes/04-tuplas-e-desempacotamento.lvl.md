---
slug: n1-m5-04-tuplas-e-desempacotamento
titulo: Tuplas e desempacotamento
descricao: Sequências que não mudam, troca de valores em uma linha, registros simples e funções que devolvem mais de um valor.
dificuldade: iniciante
tipo: guiada
runtime: python
bibliotecas: []
xp: 90
tempo_min: 35
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Criar tuplas e explicar quando preferir uma tupla a uma lista
- Desempacotar tuplas em variáveis, inclusive em laços
- Devolver mais de um valor de uma função com tupla
---

## Passo 1 · Leitura · Um grupo fixo de valores

Uma **tupla** é uma sequência de valores, como a lista, com uma diferença decisiva: depois de criada, ela **não muda**. Não dá para acrescentar, remover nem trocar itens. Ela se escreve com vírgulas, normalmente entre parênteses:

```python
ponto = (3, 4)
aluna = ("Ana", 9.5)
print(ponto[0])     # 3: o índice funciona como na lista
print(len(aluna))   # 2
```

Tentar alterar um item interrompe o programa:

```python
ponto[0] = 10   # TypeError: 'tuple' object does not support item assignment
```

Quem faz a tupla é a **vírgula**, não o parêntese. Por isso a tupla de um item só precisa de uma vírgula no fim: `(5,)` é uma tupla, enquanto `(5)` é só o número 5 entre parênteses.

Use tupla para um grupo fixo, em que cada posição tem um significado: um ponto (x, y), uma data (dia, mês, ano), um item de nota fiscal (nome, preço, quantidade). Use lista quando a quantidade de itens varia e a coleção cresce ou diminui.

#### Desempacotar

**Desempacotar** é distribuir os itens de uma tupla em variáveis, de uma vez. A quantidade de variáveis precisa ser igual à de itens.

```python
x, y = ponto    # x = 3, y = 4
```

Com isso dá para trocar o valor de duas variáveis em uma linha: `a, b = b, a`. O lado direito monta a tupla com os valores antigos, e o lado esquerdo a desempacota. Execute passo a passo e veja `a` e `b` trocarem de valor na terceira linha:

```python visualizar
a = 1
b = 2
a, b = b, a
ponto = (3, 4)
x, y = ponto
print(a, b, x, y)
```

#### Onde as tuplas aparecem

Uma **lista de tuplas** funciona como uma tabela: cada tupla é uma linha. O `for` desempacota cada linha direto nas variáveis do laço. Foi isso que aconteceu com `enumerate` e `zip` na lição anterior: os dois entregam tuplas.

```python
alunos = [("Ana", 9.5), ("Bia", 7.0)]
for nome, nota in alunos:
    print(nome, nota)
```

Uma função também pode devolver mais de um valor. Basta separar os valores por vírgula no `return`: o Python monta uma tupla, e quem chama pode desempacotar.

```python
def dividir(a, b):
    return a // b, a % b    # devolve a tupla (quociente, resto)


quociente, resto = dividir(17, 5)    # quociente = 3, resto = 2
```

## Passo 2 · Previsão · Desempacotando no laço

Leia o programa sem executar e digite exatamente o que ele imprime. São quatro linhas de saída.

### Código
```python
itens = [("Caneta", 3), ("Lápis", 2)]
total = 0
for nome, qtd in itens:
    print(nome, qtd)
    total += qtd
print(total)
t = (5,)
print(len(t))
```

### Dicas
1. Cada volta do laço recebe uma tupla e a separa em duas variáveis: `nome` e `qtd`.
2. `print` com dois valores separados por vírgula imprime os dois na mesma linha, com um espaço entre eles.
3. `(5,)`, com a vírgula, é uma tupla de um item. `len` conta os itens, não o valor guardado.

### Saída esperada
```text
Caneta 3
Lápis 2
5
1
```

## Passo 3 · Exercício · Devolver dois valores

Escreva duas funções que devolvem **tuplas**.

| Chamada | Devolve |
|---|---|
| `trocar(1, 2)` | `(2, 1)` |
| `trocar("a", "b")` | `("b", "a")` |
| `min_max([4, 9, 2])` | `(2, 9)` |
| `min_max([7])` | `(7, 7)` |

`min_max` recebe uma lista com pelo menos um número. As funções `min` e `max` estão liberadas.

### Instruções
1. Complete `trocar(a, b)`: devolve uma tupla com os dois valores na ordem trocada, primeiro `b`, depois `a`.
   Dica: valores separados por vírgula no `return` já formam uma tupla.
2. Complete `min_max(lista)`: devolve uma tupla com o menor e o maior número da lista, nessa ordem.
   Dica: os dois valores saem no mesmo `return`.

### Código inicial
```python
def trocar(a, b):
    pass


def min_max(lista):
    pass
```

### Solução
```python
def trocar(a, b):
    return b, a


def min_max(lista):
    return min(lista), max(lista)
```

### Dicas
1. `return b, a` já devolve uma tupla; os parênteses são opcionais.
2. Uma função termina no primeiro `return` que executa. Para devolver dois valores, os dois vão no mesmo `return`, separados por vírgula.
3. Em `min_max`, a linha é `return min(lista), max(lista)`. Colchetes devolveriam uma lista, não uma tupla.

### Verificação
```json
[
  { "id": "trocar-numeros", "checkpoint": 1, "kind": "call", "function": "trocar", "args": [1, 2], "expected": [2, 1], "type": "tuple",
    "name": "trocar(1, 2) é a tupla (2, 1)", "hint": "Confira a ordem dos valores e se o retorno é uma tupla (vírgula, sem colchetes)." },
  { "id": "trocar-textos", "checkpoint": 1, "kind": "call", "function": "trocar", "args": ["a", "b"], "expected": ["b", "a"], "type": "tuple",
    "name": "trocar(\"a\", \"b\") é a tupla (\"b\", \"a\")" },
  { "id": "trocar-iguais", "checkpoint": 1, "kind": "call", "function": "trocar", "args": [5, 5], "expected": [5, 5], "type": "tuple",
    "name": "trocar(5, 5) devolve uma tupla com dois itens", "hint": "A função sempre devolve dois valores, mesmo quando são iguais." },
  { "id": "min-max-3", "checkpoint": 2, "kind": "call", "function": "min_max", "args": [[4, 9, 2]], "expected": [2, 9], "type": "tuple",
    "name": "min_max([4, 9, 2]) é a tupla (2, 9)", "hint": "Primeiro o menor, depois o maior, no mesmo return." },
  { "id": "min-max-negativos", "checkpoint": 2, "kind": "call", "function": "min_max", "args": [[-3, -8, 0]], "expected": [-8, 0], "type": "tuple",
    "name": "min_max funciona com negativos", "hint": "Use min e max em vez de pegar posições fixas da lista." },
  { "id": "borda-um-item", "checkpoint": 2, "kind": "call", "function": "min_max", "args": [[7]], "expected": [7, 7], "type": "tuple",
    "name": "Lista de um item: min_max([7]) é (7, 7)", "hint": "Com um item só, o menor e o maior são o mesmo número." }
]
```

### Soluções erradas
```python name="devolve lista em vez de tupla"
def trocar(a, b):
    return [b, a]


def min_max(lista):
    return [min(lista), max(lista)]
```
```python name="dois return seguidos (só o primeiro vale)"
def trocar(a, b):
    return b
    return a


def min_max(lista):
    return min(lista)
    return max(lista)
```
```python name="trocar devolve na mesma ordem"
def trocar(a, b):
    return a, b


def min_max(lista):
    return min(lista), max(lista)
```
```python name="min_max pega o primeiro e o último sem procurar"
def trocar(a, b):
    return b, a


def min_max(lista):
    return lista[0], lista[-1]
```

## Passo 4 · Exercício · Nota fiscal

A papelaria guarda cada item vendido em uma tupla com três posições: nome, preço unitário e quantidade. A venda inteira é uma lista dessas tuplas, que já vem no código inicial.

Percorra a lista e imprima uma linha por item, com o **subtotal** dele (preço × quantidade). No fim, imprima o total da nota. Todos os valores aparecem com duas casas decimais. A saída deve ser exatamente:

```
Caderno: R$ 25.00
Caneta: R$ 15.00
Total: R$ 40.00
```

O programa precisa funcionar para qualquer lista de itens: use um laço, não três `print` com os valores já calculados.

### Instruções
1. Percorra `itens` com um `for` que desempacota cada tupla em três variáveis e imprima, para cada item, `nome: R$ subtotal` com duas casas decimais.
   Dica: o subtotal é o preço multiplicado pela quantidade.
2. Acumule os subtotais e, depois do laço, imprima `Total: R$ ` seguido do total com duas casas decimais.

### Código inicial
```python
itens = [("Caderno", 12.5, 2), ("Caneta", 3.0, 5)]

# Percorra itens, imprima o subtotal de cada um e, no fim, o total
```

### Solução
```python
itens = [("Caderno", 12.5, 2), ("Caneta", 3.0, 5)]

total = 0
for nome, preco, qtd in itens:
    subtotal = preco * qtd
    print(f"{nome}: R$ {subtotal:.2f}")
    total += subtotal
print(f"Total: R$ {total:.2f}")
```

### Dicas
1. O laço é `for nome, preco, qtd in itens:`. Cada volta recebe uma tupla e a separa em três variáveis.
2. Crie um acumulador `total = 0` antes do laço e some a ele o subtotal de cada item.
3. Use `:.2f` dentro das chaves da f-string nas três linhas: `f"{nome}: R$ {subtotal:.2f}"`.

### Verificação
```json
[
  { "id": "usa-for", "checkpoint": 1, "kind": "source", "rule": { "type": "uses", "construct": "for" },
    "name": "Percorre os itens com um laço for", "hint": "O programa precisa servir para qualquer lista de itens: percorra a lista em vez de escrever os valores à mão." },
  { "id": "linha-caderno", "checkpoint": 1, "kind": "io", "stdin": "", "expected_stdout": "Caderno: R$ 25.00", "match": "contains",
    "name": "Imprime Caderno: R$ 25.00", "hint": "Subtotal é preço vezes quantidade, com duas casas decimais." },
  { "id": "linha-caneta", "checkpoint": 1, "kind": "io", "stdin": "", "expected_stdout": "Caneta: R$ 15.00", "match": "contains",
    "name": "Imprime Caneta: R$ 15.00", "hint": "Confira o formato: nome, dois-pontos, espaço, R$, espaço e o valor com duas casas." },
  { "id": "nota-completa", "checkpoint": 2, "kind": "io", "stdin": "", "expected_stdout": "Caderno: R$ 25.00\nCaneta: R$ 15.00\nTotal: R$ 40.00",
    "name": "Saída completa, com o total no fim", "hint": "O total é a soma dos subtotais e aparece uma vez só, depois do laço." }
]
```

### Soluções erradas
```python name="sem :.2f (imprime 25.0)"
itens = [("Caderno", 12.5, 2), ("Caneta", 3.0, 5)]

total = 0
for nome, preco, qtd in itens:
    subtotal = preco * qtd
    print(f"{nome}: R$ {subtotal}")
    total += subtotal
print(f"Total: R$ {total}")
```
```python name="total sem multiplicar pela quantidade (15.50)"
itens = [("Caderno", 12.5, 2), ("Caneta", 3.0, 5)]

total = 0
for nome, preco, qtd in itens:
    subtotal = preco * qtd
    print(f"{nome}: R$ {subtotal:.2f}")
    total += preco
print(f"Total: R$ {total:.2f}")
```
```python name="total impresso dentro do laço"
itens = [("Caderno", 12.5, 2), ("Caneta", 3.0, 5)]

total = 0
for nome, preco, qtd in itens:
    subtotal = preco * qtd
    print(f"{nome}: R$ {subtotal:.2f}")
    total += subtotal
    print(f"Total: R$ {total:.2f}")
```
```python name="valores escritos à mão, sem laço"
itens = [("Caderno", 12.5, 2), ("Caneta", 3.0, 5)]

print("Caderno: R$ 25.00")
print("Caneta: R$ 15.00")
print("Total: R$ 40.00")
```

## Passo 5 · Quiz · Tuplas

### Pergunta
O que acontece na segunda linha?
```python
data = (14, 11, 2026)
data[0] = 15
```
- [ ] A tupla passa a ser `(15, 11, 2026)`
- [x] O programa para com `TypeError`, porque uma tupla não pode ser alterada
- [ ] O programa para com `IndexError`, porque tuplas não têm índice
- [ ] O Python cria uma tupla nova com o 15 no fim
> Ler `data[0]` funciona; atribuir, não. A mensagem é `TypeError: 'tuple' object does not support item assignment`. Para "mudar" uma tupla é preciso criar outra.

### Pergunta
Qual é a diferença entre `a = (1)` e `b = (1,)`?
- [ ] Nenhuma: as duas são tuplas de um item
- [ ] `a` é uma tupla e `b` dá erro de sintaxe por causa da vírgula sobrando
- [x] `a` é o inteiro 1; `b` é uma tupla de um item
- [ ] `a` é uma lista e `b` é uma tupla
> Quem faz a tupla é a vírgula. `(1)` é só o número 1 entre parênteses, como em uma conta; `(1,)` é uma tupla com `len` igual a 1.

### Pergunta
O que acontece ao executar este código?
```python
ponto = (3, 4, 5)
x, y = ponto
```
- [ ] `x` recebe 3, `y` recebe 4 e o 5 é ignorado
- [ ] `x` recebe 3 e `y` recebe a tupla `(4, 5)`
- [x] O programa para com `ValueError: too many values to unpack (expected 2, got 3)`
- [ ] `x` e `y` recebem `None`
> No desempacotamento, a quantidade de variáveis precisa ser igual à de itens. A mensagem diz que eram esperados 2 valores e vieram 3.
