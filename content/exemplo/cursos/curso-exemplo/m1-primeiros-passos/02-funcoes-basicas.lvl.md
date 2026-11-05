---
slug: exemplo-m1-02-funcoes-basicas
titulo: Funções básicas
descricao: Defina duas funções pequenas e use o resultado de uma delas.
dificuldade: iniciante
tipo: pratica
runtime: python
xp: 80
tempo_min: 20
publicada: true
objetivos:
  - Definir uma função com `def` e devolver um valor com `return`
  - Somar os itens de uma lista com um laço `for`
---

## Passo 1 · Exercício · Dobro e soma

Uma função recebe valores, faz um cálculo e devolve o resultado com `return`.
Neste exercício você escreve duas funções e guarda o resultado de uma delas
em uma variável.

### Instruções
1. Defina `dobro(n)`, que devolve o dobro de `n`.
2. Defina `soma_lista(valores)`, que soma os itens da lista com um laço `for` (sem usar `sum`).
   Dica: comece um acumulador em 0 e some cada item a ele.
3. Guarde em `total` o resultado de `soma_lista([1, 2, 3])`.

### Código inicial
```python
def dobro(n):
    pass


def soma_lista(valores):
    pass


total = 0
```

### Solução
```python
def dobro(n):
    return 2 * n


def soma_lista(valores):
    acumulado = 0
    for valor in valores:
        acumulado += valor
    return acumulado


total = soma_lista([1, 2, 3])
```

### Dicas
1. `return 2 * n` devolve o dobro.
2. Dentro do `for`, use `acumulado += valor`.
3. A lista vazia precisa devolver 0: é o valor inicial do acumulador.

### Verificação
```json
[
  { "id": "dobro-4", "checkpoint": 1, "kind": "call", "function": "dobro", "args": [4], "expected": 8, "name": "dobro(4) é 8" },
  { "id": "dobro-negativo", "checkpoint": 1, "kind": "call", "function": "dobro", "args": [-3], "expected": -6,
    "name": "dobro(-3) é -6", "hint": "Multiplique por 2 em vez de somar 2." },
  { "id": "soma-123", "checkpoint": 2, "kind": "call", "function": "soma_lista", "args": [[1, 2, 3]], "expected": 6, "type": "int",
    "name": "soma_lista([1, 2, 3]) é 6" },
  { "id": "soma-vazia", "checkpoint": 2, "kind": "call", "function": "soma_lista", "args": [[]], "expected": 0,
    "name": "soma_lista([]) é 0", "hint": "Comece o acumulador em 0." },
  { "id": "soma-decimal", "checkpoint": 2, "kind": "expr", "expr": "soma_lista([0.5, 0.25])", "expected": 0.75, "tolerance": 1e-9,
    "name": "soma_lista aceita decimais" },
  { "id": "sem-sum", "checkpoint": 2, "kind": "source", "rule": { "type": "not_calls", "name": "sum" }, "name": "Soma com um laço, sem sum()" },
  { "id": "total", "checkpoint": 3, "kind": "variable", "variable": "total", "expected": 6, "type": "int",
    "name": "total guarda soma_lista([1, 2, 3])" }
]
```

### Soluções erradas
```python name="dobro soma 2 em vez de multiplicar"
def dobro(n):
    return n + 2


def soma_lista(valores):
    acumulado = 0
    for valor in valores:
        acumulado += valor
    return acumulado


total = soma_lista([1, 2, 3])
```
```python name="soma_lista usa sum"
def dobro(n):
    return 2 * n


def soma_lista(valores):
    return sum(valores)


total = soma_lista([1, 2, 3])
```
```python name="acumulador começa em 1"
def dobro(n):
    return 2 * n


def soma_lista(valores):
    acumulado = 1
    for valor in valores:
        acumulado += valor
    return acumulado


total = soma_lista([1, 2, 3])
```
```python name="total não usa soma_lista"
def dobro(n):
    return 2 * n


def soma_lista(valores):
    acumulado = 0
    for valor in valores:
        acumulado += valor
    return acumulado


total = 0
```
