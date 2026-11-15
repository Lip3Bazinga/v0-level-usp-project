---
slug: n2-m5-03-expressoes-geradoras-e-itertools
titulo: Expressões geradoras e itertools
descricao: Geradores em uma linha, sum/any/all/max sobre geradores e as ferramentas de itertools para combinar sequências.
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
- Escrever expressões geradoras e usá-las com sum, any, all, min e max
- Escolher entre compreensão de lista e expressão geradora conforme o uso
- Usar itertools (count, cycle, islice, chain, groupby, accumulate, takewhile) em pipelines
---

## Passo 1 · Leitura · Um gerador em uma linha

Muitas funções geradoras têm a forma "para cada item, se valer a condição, entregue uma transformação dele". Para esse caso o Python tem um atalho com a cara de uma compreensão de lista, trocando os colchetes por parênteses:

```python
notas = [7.5, 4.0, 9.0, 5.5]

quadrados = [n * n for n in notas]   # lista: calcula tudo agora
quadrados = (n * n for n in notas)   # expressão geradora: calcula quando pedirem
```

A **expressão geradora** devolve um gerador, com tudo o que você viu na lição anterior: preguiçosa, um item por vez, de uma passagem só. Quando ela é o único argumento de uma função, os parênteses da chamada bastam:

```python
total = sum(n * n for n in notas)
maior = max(len(nome) for nome in ["Ana", "Davi", "Eva"])
```

Use a expressão geradora quando o resultado vai ser **consumido uma vez** por `sum`, `max`, `min`, `any`, `all`, `sorted`, `"".join` ou um `for`. Nesses casos a lista intermediária só gasta memória. Use a compreensão de lista quando você precisa do resultado **mais de uma vez**, do tamanho dele ou de índices.

#### any e all param cedo

`any(...)` devolve `True` assim que encontra o primeiro item verdadeiro; `all(...)` devolve `False` no primeiro falso. Com uma expressão geradora, os itens depois desse ponto **nem chegam a ser calculados**:

```python
any(nota < 5 for nota in notas)   # para no 4.0: o 9.0 e o 5.5 não são examinados
```

Com uma lista, `any([nota < 5 for nota in notas])` compara as quatro notas antes de o `any` começar. E sem nenhum item, `any` dá `False` e `all` dá `True` (não existe item que desminta "todos").

#### Os dois erros comuns

**Pedir o tamanho.** Um gerador não sabe quantos itens vai produzir:

```
TypeError: object of type 'generator' has no len()
```

Para contar sem montar lista, some uns: `sum(1 for n in notas if n >= 6)`.

**Guardar a expressão e reutilizá-la.** `aprovadas = (n for n in notas if n >= 6)` numa variável continua sendo um gerador: o segundo `sum(aprovadas)` dá 0. Se você precisa do resultado duas vezes, use colchetes.

## Passo 2 · Previsão · any, next e um gerador que se gasta

O programa usa uma expressão geradora guardada numa variável e um `any` sobre um iterador. Leia sem executar e digite exatamente o que ele imprime.

### Código
```python
notas = [8, 4, 9, 3]
baixas = (n for n in notas if n < 5)
print(any(n > 8 for n in notas))
print(next(baixas))
print(sum(baixas))
print(sum(baixas))
fila = iter(notas)
print(any(n < 5 for n in fila), list(fila))
```

### Dicas
1. `baixas` só produz as notas menores que 5, e o `next` já levou a primeira delas.
2. O segundo `sum(baixas)` recebe um gerador esgotado.
3. O `any` consome `fila` só até achar a primeira nota menor que 5; `list(fila)` pega o que sobrou.

### Saída esperada
```text
True
4
3
0
True [9, 3]
```

## Passo 3 · Exercício · Somas e perguntas sem lista
modo: lacunas

Três funções de uma linha, todas com expressão geradora:

- `soma_quadrados_pares(n)`: a soma dos quadrados dos números pares de 1 a `n`. Para `n = 4`: $2^2 + 4^2 = 20$.
- `tem_reprovado(notas)`: `True` se alguma nota é menor que 5.
- `todos_presentes(presencas)`: `True` se todas as frequências (de 0 a 1) são de pelo menos 0.75.

Complete as lacunas (`___`). Nenhuma lista intermediária: só parênteses.

### Instruções
1. Em `soma_quadrados_pares`, complete o valor somado e a condição que escolhe os pares.
2. Em `tem_reprovado`, escolha a função que responde "existe algum?" e para no primeiro.
3. Em `todos_presentes`, escolha a função que responde "são todos?".

### Código inicial
```python
def soma_quadrados_pares(n):
    return sum(___ for x in range(1, n + 1) if ___)


def tem_reprovado(notas):
    return ___(nota < 5 for nota in notas)


def todos_presentes(presencas):
    return ___(p >= 0.75 for p in presencas)
```

### Solução
```python
def soma_quadrados_pares(n):
    return sum(x * x for x in range(1, n + 1) if x % 2 == 0)


def tem_reprovado(notas):
    return any(nota < 5 for nota in notas)


def todos_presentes(presencas):
    return all(p >= 0.75 for p in presencas)
```

### Dicas
1. Um número é par quando o resto da divisão por 2 é zero.
2. `any` pergunta "existe algum?"; `all` pergunta "são todos?".
3. Sem nenhum item, `any` dá `False` e `all` dá `True`.

### Verificação
```json
[
  { "id": "quad-4", "checkpoint": 1, "kind": "call", "function": "soma_quadrados_pares", "args": [4], "expected": 20, "type": "int",
    "name": "soma_quadrados_pares(4) é 20", "hint": "Some o quadrado de cada par, não o dobro." },
  { "id": "quad-10", "checkpoint": 1, "kind": "call", "function": "soma_quadrados_pares", "args": [10], "expected": 220, "type": "int",
    "name": "soma_quadrados_pares(10) é 220" },
  { "id": "quad-1", "checkpoint": 1, "kind": "call", "function": "soma_quadrados_pares", "args": [1], "expected": 0,
    "name": "soma_quadrados_pares(1) é 0: não há pares" },
  { "id": "sem-lista", "checkpoint": 1, "kind": "source", "rule": { "type": "not_uses", "construct": "list_comprehension" },
    "name": "Nenhuma compreensão de lista", "hint": "Use parênteses, não colchetes." },
  { "id": "reprovado-sim", "checkpoint": 2, "kind": "call", "function": "tem_reprovado", "args": [[7, 4.5, 9]], "expected": true, "type": "bool",
    "name": "tem_reprovado([7, 4.5, 9]) é True" },
  { "id": "reprovado-nao", "checkpoint": 2, "kind": "call", "function": "tem_reprovado", "args": [[7, 5, 9]], "expected": false, "type": "bool",
    "name": "tem_reprovado([7, 5, 9]) é False: 5 não é menor que 5" },
  { "id": "reprovado-vazio", "checkpoint": 2, "kind": "call", "function": "tem_reprovado", "args": [[]], "expected": false, "type": "bool",
    "name": "tem_reprovado([]) é False" },
  { "id": "reprovado-para-cedo", "checkpoint": 2, "kind": "expr",
    "setup": "vistas = []\ndef boletim():\n    for n in [8, 3, 9, 10]:\n        vistas.append(n)\n        yield n",
    "expr": "[tem_reprovado(boletim()), vistas]", "expected": [true, [8, 3]],
    "name": "tem_reprovado para na primeira nota baixa", "hint": "Escolha a função que para no primeiro verdadeiro." },
  { "id": "presentes-sim", "checkpoint": 3, "kind": "call", "function": "todos_presentes", "args": [[0.8, 0.75, 1.0]], "expected": true, "type": "bool",
    "name": "todos_presentes([0.8, 0.75, 1.0]) é True" },
  { "id": "presentes-nao", "checkpoint": 3, "kind": "call", "function": "todos_presentes", "args": [[0.9, 0.5, 1.0]], "expected": false, "type": "bool",
    "name": "todos_presentes([0.9, 0.5, 1.0]) é False" },
  { "id": "presentes-vazio", "checkpoint": 3, "kind": "call", "function": "todos_presentes", "args": [[]], "expected": true, "type": "bool",
    "name": "todos_presentes([]) é True" }
]
```

### Soluções erradas
```python name="lista no lugar da expressão geradora"
def soma_quadrados_pares(n):
    return sum([x * x for x in range(1, n + 1) if x % 2 == 0])


def tem_reprovado(notas):
    return any(nota < 5 for nota in notas)


def todos_presentes(presencas):
    return all(p >= 0.75 for p in presencas)
```
```python name="soma os ímpares"
def soma_quadrados_pares(n):
    return sum(x * x for x in range(1, n + 1) if x % 2 == 1)


def tem_reprovado(notas):
    return any(nota < 5 for nota in notas)


def todos_presentes(presencas):
    return all(p >= 0.75 for p in presencas)
```
```python name="any e all trocados"
def soma_quadrados_pares(n):
    return sum(x * x for x in range(1, n + 1) if x % 2 == 0)


def tem_reprovado(notas):
    return all(nota < 5 for nota in notas)


def todos_presentes(presencas):
    return any(p >= 0.75 for p in presencas)
```
```python name="soma o dobro em vez do quadrado"
def soma_quadrados_pares(n):
    return sum(x * 2 for x in range(1, n + 1) if x % 2 == 0)


def tem_reprovado(notas):
    return any(nota < 5 for nota in notas)


def todos_presentes(presencas):
    return all(p >= 0.75 for p in presencas)
```
```python name="conta todas as notas baixas antes de responder"
def soma_quadrados_pares(n):
    return sum(x * x for x in range(1, n + 1) if x % 2 == 0)


def tem_reprovado(notas):
    return len(list(nota for nota in notas if nota < 5)) > 0


def todos_presentes(presencas):
    return all(p >= 0.75 for p in presencas)
```

## Passo 4 · Leitura · A caixa de ferramentas itertools

O módulo `itertools` reúne funções que recebem iteráveis e devolvem **iteradores** preguiçosos. Elas se encaixam umas nas outras como as etapas do pipeline da lição anterior. Você já usou `islice` e, no módulo 2, `groupby`. As mais úteis no dia a dia:

| Função | O que produz | Exemplo → resultado (com `list`) |
|---|---|---|
| `count(inicio, passo)` | números sem fim | `islice(count(10, 5), 3)` → `[10, 15, 20]` |
| `cycle(itens)` | os itens repetidos sem fim | `islice(cycle("AB"), 3)` → `['A', 'B', 'A']` |
| `islice(it, n)` | os `n` primeiros | |
| `chain(a, b)` | `a` e depois `b`, sem copiar | `chain([1, 2], "ab")` → `[1, 2, 'a', 'b']` |
| `accumulate(it, initial=x)` | os totais parciais | `accumulate([100, -30, 50], initial=0)` → `[0, 100, 70, 120]` |
| `takewhile(cond, it)` | itens enquanto `cond` vale; para no primeiro falso | `takewhile(lambda s: s >= 0, [5, 3, -1, 4])` → `[5, 3]` |
| `dropwhile(cond, it)` | pula enquanto `cond` vale; entrega o resto | `dropwhile(lambda s: s >= 0, [5, 3, -1, 4])` → `[-1, 4]` |
| `pairwise(it)` | pares de vizinhos | `pairwise([10, 12, 9])` → `[(10, 12), (12, 9)]` |
| `groupby(it)` | grupos de itens **vizinhos** iguais | |

Repare na diferença entre `takewhile` e um filtro: `takewhile` **para** no primeiro item que falha, mesmo que depois venham itens bons. É o que você quer para "os dias até o saldo ficar negativo", e o que você não quer para "todos os dias com saldo positivo".

Encadeadas, elas resolvem problemas inteiros sem nenhuma lista intermediária. Os saldos de uma conta, dia a dia, até o primeiro negativo:

```python
from itertools import accumulate, takewhile

movimentos = [50, -20, -40, -100, 300]
saldos = accumulate(movimentos, initial=30)
positivos = takewhile(lambda s: s >= 0, saldos)
print(list(positivos))   # [30, 80, 60, 20]
```

#### Quando materializar

Chame `list(...)` no fim do pipeline, uma vez, quando você precisa guardar, indexar, medir ou devolver o resultado. No meio do caminho, deixe os iteradores passarem os itens adiante. E nunca chame `list` direto sobre `count` ou `cycle`: eles não terminam.

## Passo 5 · Exercício · O primeiro que serve

Buscar "o primeiro item que satisfaz uma condição" é tão comum que vale uma função. Com uma expressão geradora e o `next` de dois argumentos, ela cabe numa linha e para assim que encontra:

```python
primeiro_que(lambda n: n >= 6, [4.5, 7, 9])          # 7
primeiro_que(lambda n: n > 10, [4.5, 7], padrao=0)   # 0
```

Escreva também `quantos(cond, iteravel)`, que conta os itens que satisfazem a condição, sem montar lista.

### Instruções
1. `primeiro_que(cond, iteravel, padrao=None)` devolve o primeiro item em que `cond(item)` é verdadeira, ou `padrao` se nenhum servir.
   Dica: `next(gerador, padrao)` devolve `padrao` quando o gerador acaba.
2. `primeiro_que` para no item encontrado: não examina os seguintes e, se recebeu um iterador, deixa o resto dele intacto.
3. `quantos(cond, iteravel)` devolve quantos itens satisfazem `cond`, sem compreensão de lista.

### Código inicial
```python
def primeiro_que(cond, iteravel, padrao=None):
    pass


def quantos(cond, iteravel):
    pass
```

### Solução
```python
def primeiro_que(cond, iteravel, padrao=None):
    return next((item for item in iteravel if cond(item)), padrao)


def quantos(cond, iteravel):
    return sum(1 for item in iteravel if cond(item))
```

### Dicas
1. A expressão geradora que vai dentro do `next` precisa de parênteses próprios, porque o `next` tem um segundo argumento.
2. Cuidado com `... or padrao`: um item encontrado que vale `0` ou `""` é falso e seria trocado pelo padrão.
3. Para contar, some `1` para cada item que passa na condição.

### Verificação
```json
[
  { "id": "acha", "checkpoint": 1, "kind": "expr", "expr": "primeiro_que(lambda n: n >= 6, [4.5, 7, 9])", "expected": 7,
    "name": "primeiro_que acha o 7", "hint": "Devolva o primeiro item que passa na condição." },
  { "id": "texto", "checkpoint": 1, "kind": "expr", "expr": "primeiro_que(lambda nome: nome.startswith(\"C\"), [\"Ana\", \"Caio\", \"Cris\"])",
    "expected": "Caio", "name": "Funciona com textos" },
  { "id": "nenhum", "checkpoint": 1, "kind": "expr", "expr": "primeiro_que(lambda n: n > 10, [1, 2])", "type": "NoneType",
    "name": "Sem nenhum item que sirva, devolve None" },
  { "id": "padrao", "checkpoint": 1, "kind": "expr", "expr": "primeiro_que(lambda n: n > 10, [1, 2], padrao=-1)", "expected": -1,
    "name": "Sem nenhum item que sirva, devolve o padrão", "hint": "next aceita um segundo argumento." },
  { "id": "zero", "checkpoint": 1, "kind": "expr", "expr": "primeiro_que(lambda n: n % 5 == 0, [3, 0, 5], padrao=-1)", "expected": 0,
    "name": "Um item encontrado que vale 0 é devolvido, não trocado pelo padrão", "hint": "Não use or para aplicar o padrão." },
  { "id": "para-cedo", "checkpoint": 2, "kind": "expr",
    "setup": "testados = []\ndef maior_que_2(n):\n    testados.append(n)\n    return n > 2",
    "expr": "[primeiro_que(maior_que_2, [1, 2, 3, 4, 5]), testados]", "expected": [3, [1, 2, 3]],
    "name": "Não testa os itens depois do encontrado", "hint": "Não monte uma lista com todos os que servem." },
  { "id": "resto-intacto", "checkpoint": 2, "kind": "expr",
    "setup": "it = iter([1, 5, 2, 7])\nachado = primeiro_que(lambda n: n > 3, it)",
    "expr": "[achado, list(it)]", "expected": [5, [2, 7]],
    "name": "O resto do iterador fica para quem chamou", "hint": "Não converta o iterável em lista." },
  { "id": "quantos", "checkpoint": 3, "kind": "expr", "expr": "quantos(lambda n: n >= 6, [5, 6, 7.5, 2, 10])", "expected": 3,
    "name": "quantos conta 3 notas de pelo menos 6" },
  { "id": "quantos-gerador", "checkpoint": 3, "kind": "expr", "expr": "quantos(lambda c: c in \"aeiou\", (letra for letra in \"paralelepipedo\"))",
    "expected": 7, "name": "quantos funciona com um gerador" },
  { "id": "quantos-vazio", "checkpoint": 3, "kind": "expr", "expr": "quantos(lambda n: True, [])", "expected": 0,
    "name": "quantos de nada é 0" },
  { "id": "quantos-sem-lista", "checkpoint": 3, "kind": "source", "rule": { "type": "not_uses", "construct": "list_comprehension", "function": "quantos" },
    "name": "quantos não usa compreensão de lista" }
]
```

### Soluções erradas
```python name="monta a lista dos que servem e pega o primeiro"
def primeiro_que(cond, iteravel, padrao=None):
    encontrados = [item for item in iteravel if cond(item)]
    if encontrados:
        return encontrados[0]
    return padrao


def quantos(cond, iteravel):
    return sum(1 for item in iteravel if cond(item))
```
```python name="aplica o padrão com or"
def primeiro_que(cond, iteravel, padrao=None):
    return next((item for item in iteravel if cond(item)), None) or padrao


def quantos(cond, iteravel):
    return sum(1 for item in iteravel if cond(item))
```
```python name="ignora o padrão"
def primeiro_que(cond, iteravel, padrao=None):
    return next((item for item in iteravel if cond(item)), None)


def quantos(cond, iteravel):
    return sum(1 for item in iteravel if cond(item))
```
```python name="quantos com len de uma lista"
def primeiro_que(cond, iteravel, padrao=None):
    return next((item for item in iteravel if cond(item)), padrao)


def quantos(cond, iteravel):
    return len([item for item in iteravel if cond(item)])
```
```python name="quantos soma os itens em vez de contar"
def primeiro_que(cond, iteravel, padrao=None):
    return next((item for item in iteravel if cond(item)), padrao)


def quantos(cond, iteravel):
    return sum(item for item in iteravel if cond(item))
```

## Passo 6 · Exercício · Extrato, variações e sequências

Três funções curtas, cada uma com a ferramenta certa do `itertools`:

- `variacoes(valores)`: a diferença de cada valor para o anterior. O preço do pão nos últimos dias, `[10, 12, 9, 9]`, variou `[2, -3, 0]`.
- `saldos(inicial, movimentos)`: o saldo depois de cada movimento, começando pelo inicial. `saldos(100, [-30, 50])` é `[100, 70, 120]`.
- `agrupar_consecutivos(itens)`: cada sequência de itens iguais **seguidos** vira um par `(item, quantidade)`. A chamada de uma semana, `"PPFPPP"` (presença e falta), vira `[("P", 2), ("F", 1), ("P", 3)]`: as presenças antes e depois da falta são sequências diferentes.

As três devolvem listas.

### Instruções
1. Escreva `variacoes` com `pairwise`.
2. Escreva `saldos` com `accumulate`, incluindo o saldo inicial como primeiro item.
   Dica: `accumulate` aceita `initial=`.
3. Escreva `agrupar_consecutivos` com `groupby`, mantendo as sequências na ordem em que aparecem.

### Código inicial
```python
from itertools import accumulate, groupby, pairwise


def variacoes(valores):
    pass


def saldos(inicial, movimentos):
    pass


def agrupar_consecutivos(itens):
    pass
```

### Solução
```python
from itertools import accumulate, groupby, pairwise


def variacoes(valores):
    return [depois - antes for antes, depois in pairwise(valores)]


def saldos(inicial, movimentos):
    return list(accumulate(movimentos, initial=inicial))


def agrupar_consecutivos(itens):
    return [(item, len(list(grupo))) for item, grupo in groupby(itens)]
```

### Dicas
1. `pairwise` entrega `(anterior, atual)`: a variação é o atual menos o anterior.
2. Sem `initial`, o primeiro item de `accumulate` já é o primeiro movimento.
3. Aqui você **não** ordena antes do `groupby`: ordenar juntaria sequências que estão separadas.

### Verificação
```json
[
  { "id": "var", "checkpoint": 1, "kind": "call", "function": "variacoes", "args": [[10, 12, 9, 9]], "expected": [2, -3, 0], "type": "list",
    "name": "variacoes([10, 12, 9, 9]) é [2, -3, 0]", "hint": "Atual menos anterior." },
  { "id": "var-curta", "checkpoint": 1, "kind": "call", "function": "variacoes", "args": [[5]], "expected": [], "type": "list",
    "name": "Com um valor só, não há variação" },
  { "id": "var-float", "checkpoint": 1, "kind": "call", "function": "variacoes", "args": [[1.5, 1.0, 4.0]], "expected": [-0.5, 3.0],
    "tolerance": 1e-9, "name": "variacoes com valores decimais" },
  { "id": "usa-pairwise", "checkpoint": 1, "kind": "source", "rule": { "type": "calls", "name": "pairwise" }, "name": "variacoes usa pairwise" },
  { "id": "saldos", "checkpoint": 2, "kind": "call", "function": "saldos", "args": [100, [-30, 50, -200]], "expected": [100, 70, 120, -80],
    "type": "list", "name": "saldos(100, [-30, 50, -200])", "hint": "O saldo inicial é o primeiro item." },
  { "id": "saldos-vazio", "checkpoint": 2, "kind": "call", "function": "saldos", "args": [20, []], "expected": [20], "type": "list",
    "name": "Sem movimentos, só o saldo inicial" },
  { "id": "saldos-gerador", "checkpoint": 2, "kind": "expr", "expr": "saldos(0, (v for v in [5, 5, 5]))", "expected": [0, 5, 10, 15],
    "name": "saldos aceita um gerador de movimentos" },
  { "id": "usa-accumulate", "checkpoint": 2, "kind": "source", "rule": { "type": "calls", "name": "accumulate" }, "name": "saldos usa accumulate" },
  { "id": "grupos", "checkpoint": 3, "kind": "call", "function": "agrupar_consecutivos", "args": ["PPFPPP"],
    "expected": [["P", 2], ["F", 1], ["P", 3]], "name": "\"PPFPPP\" vira três sequências",
    "hint": "Não ordene: sequências separadas continuam separadas." },
  { "id": "grupos-numeros", "checkpoint": 3, "kind": "call", "function": "agrupar_consecutivos", "args": [[7, 7, 7, 2, 7]],
    "expected": [[7, 3], [2, 1], [7, 1]], "name": "Funciona com números" },
  { "id": "grupos-vazio", "checkpoint": 3, "kind": "call", "function": "agrupar_consecutivos", "args": [[]], "expected": [], "type": "list",
    "name": "Sem itens, sem grupos" },
  { "id": "usa-groupby", "checkpoint": 3, "kind": "source", "rule": { "type": "calls", "name": "groupby" }, "name": "agrupar_consecutivos usa groupby" }
]
```

### Soluções erradas
```python name="variação com o sinal trocado"
from itertools import accumulate, groupby, pairwise


def variacoes(valores):
    return [antes - depois for antes, depois in pairwise(valores)]


def saldos(inicial, movimentos):
    return list(accumulate(movimentos, initial=inicial))


def agrupar_consecutivos(itens):
    return [(item, len(list(grupo))) for item, grupo in groupby(itens)]
```
```python name="accumulate sem o saldo inicial"
from itertools import accumulate, groupby, pairwise


def variacoes(valores):
    return [depois - antes for antes, depois in pairwise(valores)]


def saldos(inicial, movimentos):
    return list(accumulate(movimentos))


def agrupar_consecutivos(itens):
    return [(item, len(list(grupo))) for item, grupo in groupby(itens)]
```
```python name="ordena antes do groupby"
from itertools import accumulate, groupby, pairwise


def variacoes(valores):
    return [depois - antes for antes, depois in pairwise(valores)]


def saldos(inicial, movimentos):
    return list(accumulate(movimentos, initial=inicial))


def agrupar_consecutivos(itens):
    return [(item, len(list(grupo))) for item, grupo in groupby(sorted(itens))]
```
```python name="devolve o iterador do accumulate sem materializar"
from itertools import accumulate, groupby, pairwise


def variacoes(valores):
    return [depois - antes for antes, depois in pairwise(valores)]


def saldos(inicial, movimentos):
    return accumulate(movimentos, initial=inicial)


def agrupar_consecutivos(itens):
    return [(item, len(list(grupo))) for item, grupo in groupby(itens)]
```

## Passo 7 · Quiz · Geradores em uma linha

### Pergunta
Qual das duas linhas é a melhor escolha para somar os quadrados de um milhão de números, e por quê?
```python
a = sum([x * x for x in range(1_000_000)])
b = sum(x * x for x in range(1_000_000))
```
- [ ] `a`, porque listas são sempre mais rápidas de percorrer
- [x] `b`, porque não cria uma lista de um milhão de itens só para somá-los uma vez
- [ ] Tanto faz: o Python transforma `a` em `b` automaticamente
- [ ] `b` dá erro, porque falta um par de parênteses na expressão geradora
> Os dois dão o mesmo número, mas `a` monta a lista inteira na memória antes de o `sum` começar. Quando a expressão é o único argumento, os parênteses da chamada bastam.

### Pergunta
O que este programa imprime?
```python
from itertools import takewhile

temperaturas = [18, 22, 31, 24, 35]
print(list(takewhile(lambda t: t < 30, temperaturas)))
```
- [ ] `[18, 22, 24]`
- [x] `[18, 22]`
- [ ] `[31, 35]`
- [ ] `[18, 22, 31]`
> `takewhile` para no primeiro item que falha (31) e não olha mais nada, mesmo que o 24 venha depois. Para todas as temperaturas abaixo de 30, use uma expressão geradora com `if`.

### Pergunta
`aprovados = (nome for nome, nota in turma if nota >= 6)`. Em seguida, o programa faz `print(len(aprovados))`. O que acontece?
- [ ] Imprime a quantidade de aprovados
- [ ] Imprime 0, porque o gerador ainda não foi percorrido
- [x] `TypeError: object of type 'generator' has no len()`
- [ ] Imprime a quantidade de alunos da turma, aprovados ou não
> Um gerador não sabe quantos itens vai produzir. Para contar, use `sum(1 for ...)`; para ter a lista e o tamanho, use colchetes.
