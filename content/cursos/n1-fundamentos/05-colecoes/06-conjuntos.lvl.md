---
slug: n1-m5-06-conjuntos
titulo: Conjuntos
descricao: 'Coleções sem repetição: remover duplicatas, união, interseção e diferença, e testes de pertinência rápidos.'
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
- Criar conjuntos, adicionar e remover elementos e explicar por que não há repetição nem ordem
- Aplicar união, interseção e diferença para resolver problemas de comparação de grupos
- Converter entre lista e conjunto para remover duplicatas preservando o que for necessário
---

## Passo 1 · Leitura · Sem repetição e sem ordem

Um **conjunto** (`set`) é uma coleção em que cada valor aparece **uma vez só** e em que **não existe posição**. Ele serve para duas perguntas: "este valor está aqui?" e "o que estes dois grupos têm em comum ou de diferente?".

O conjunto se escreve entre chaves, sem dois-pontos:

```python
turma = {"ana", "bia", "caio", "ana"}
print(len(turma))        # 3: a "ana" repetida entra uma vez só
print("bia" in turma)    # True
```

Três consequências de não haver ordem nem repetição:

- **Não há índice.** `turma[0]` dá `TypeError: 'set' object is not subscriptable`.
- **A ordem de impressão não é garantida.** `print(turma)` pode mostrar os nomes em qualquer ordem. Para mostrar ou comparar, ordene antes: `sorted(turma)` devolve uma lista em ordem.
- **O conjunto vazio é `set()`.** Escrever `{}` cria um dicionário vazio, não um conjunto.

Para mudar um conjunto: `add` inclui um valor (se já estava, nada acontece) e `discard` tira um valor (se não estava, nada acontece). Existe também `remove`, que dá `KeyError` quando o valor não está.

```python
turma.add("davi")
turma.discard("caio")
```

`set(lista)` cria um conjunto com os itens de uma lista, e é o jeito mais curto de tirar repetidos: `sorted(set([3, 1, 3]))` devolve `[1, 3]`.

#### Operações entre conjuntos

Com as turmas `python = {"ana", "bia", "caio"}` e `calculo = {"bia", "davi"}`:

| Operação | Símbolo | Resultado (em ordem) | Quem são |
|---|---|---|---|
| união | `python \| calculo` | ana, bia, caio, davi | quem faz pelo menos uma |
| interseção | `python & calculo` | bia | quem faz as duas |
| diferença | `python - calculo` | ana, caio | quem faz Python e não faz Cálculo |
| diferença simétrica | `python ^ calculo` | ana, caio, davi | quem faz só uma das duas |

São as operações de conjuntos da matemática, com outros símbolos: $A \cup B$ é `a | b`, $A \cap B$ é `a & b` e $A - B$ é `a - b`. Cada operação devolve um conjunto novo e não altera os originais.

A diferença depende da ordem: `calculo - python` é quem faz Cálculo e não faz Python, ou seja, só `davi`.

## Passo 2 · Previsão · Operações de conjunto

Leia o programa sem executar e digite exatamente o que ele imprime. São cinco linhas de saída. Todo conjunto é impresso com `sorted`, porque a ordem de um conjunto não é garantida; `sorted` devolve uma lista em ordem crescente.

### Código
```python
numeros = [3, 1, 3, 2, 1]
unicos = set(numeros)
print(len(unicos))
print(sorted(unicos))
a = {1, 2, 3}
b = {3, 4}
print(sorted(a & b))
print(sorted(a | b))
print(sorted(a - b))
```

### Dicas
1. Um conjunto guarda cada valor uma vez só: os repetidos da lista somem.
2. `&` fica com o que está nos dois conjuntos; `|` junta tudo; `-` tira do primeiro o que está no segundo.
3. `sorted` devolve uma lista: a saída aparece com colchetes, mesmo quando tem um item só.

### Saída esperada
```text
3
[1, 2, 3]
[3]
[1, 2, 3, 4]
[1, 2]
```

## Passo 3 · Exercício · Repetidos

Escreva duas funções sobre itens repetidos em uma lista.

| Chamada | Devolve |
|---|---|
| `sem_repetidos([3, 1, 3, 2])` | `[1, 2, 3]` |
| `sem_repetidos([])` | `[]` |
| `tem_repetidos([3, 1, 3, 2])` | `True` |
| `tem_repetidos([1, 2, 3])` | `False` |
| `tem_repetidos([])` | `False` |

`sem_repetidos` devolve uma **lista em ordem crescente**, não um conjunto: assim o resultado é sempre o mesmo, qualquer que seja a ordem interna do conjunto.

### Instruções
1. Complete `sem_repetidos(lista)`: devolve uma lista com cada valor uma vez só, em ordem crescente.
   Dica: converta para conjunto e ordene o resultado.
2. Complete `tem_repetidos(lista)`: devolve `True` quando algum valor aparece mais de uma vez e `False` caso contrário.
   Dica: compare a quantidade de itens da lista com a do conjunto feito a partir dela.

### Código inicial
```python
def sem_repetidos(lista):
    pass


def tem_repetidos(lista):
    pass
```

### Solução
```python
def sem_repetidos(lista):
    return sorted(set(lista))


def tem_repetidos(lista):
    return len(set(lista)) < len(lista)
```

### Dicas
1. `set(lista)` tira os repetidos; `sorted(...)` transforma o conjunto em uma lista em ordem.
2. Se há repetidos, o conjunto fica menor que a lista. Compare os dois tamanhos com `len`.
3. As duas funções cabem em uma linha: `return sorted(set(lista))` e `return len(set(lista)) < len(lista)`.

### Verificação
```json
[
  { "id": "sem-rep-4", "checkpoint": 1, "kind": "call", "function": "sem_repetidos", "args": [[3, 1, 3, 2]], "expected": [1, 2, 3], "type": "list",
    "name": "sem_repetidos([3, 1, 3, 2]) é a lista [1, 2, 3]", "hint": "O retorno precisa ser uma lista em ordem crescente, não um conjunto." },
  { "id": "sem-rep-textos", "checkpoint": 1, "kind": "call", "function": "sem_repetidos", "args": [["uva", "caju", "uva", "amora", "caju"]], "expected": ["amora", "caju", "uva"], "type": "list",
    "name": "Funciona com textos, em ordem alfabética", "hint": "Tire os repetidos e ordene o que sobrou." },
  { "id": "sem-rep-sem-repeticao", "checkpoint": 1, "kind": "call", "function": "sem_repetidos", "args": [[9, 5, 7]], "expected": [5, 7, 9], "type": "list",
    "name": "Sem repetidos na entrada, devolve os mesmos valores em ordem" },
  { "id": "sem-rep-vazia", "checkpoint": 1, "kind": "call", "function": "sem_repetidos", "args": [[]], "expected": [], "type": "list",
    "name": "sem_repetidos([]) é []" },
  { "id": "tem-rep-sim", "checkpoint": 2, "kind": "call", "function": "tem_repetidos", "args": [[3, 1, 3, 2]], "expected": true, "type": "bool",
    "name": "tem_repetidos([3, 1, 3, 2]) é True", "hint": "O conjunto dessa lista tem 3 itens e a lista tem 4." },
  { "id": "tem-rep-nao", "checkpoint": 2, "kind": "call", "function": "tem_repetidos", "args": [[1, 2, 3]], "expected": false, "type": "bool",
    "name": "tem_repetidos([1, 2, 3]) é False" },
  { "id": "tem-rep-iguais", "checkpoint": 2, "kind": "call", "function": "tem_repetidos", "args": [["a", "a"]], "expected": true, "type": "bool",
    "name": "tem_repetidos([\"a\", \"a\"]) é True" },
  { "id": "tem-rep-vazia", "checkpoint": 2, "kind": "call", "function": "tem_repetidos", "args": [[]], "expected": false, "type": "bool",
    "name": "tem_repetidos([]) é False", "hint": "Lista vazia e conjunto vazio têm o mesmo tamanho." }
]
```

### Soluções erradas
```python name="devolve o set em vez da lista ordenada"
def sem_repetidos(lista):
    return set(lista)


def tem_repetidos(lista):
    return len(set(lista)) < len(lista)
```
```python name="tem_repetidos compara a lista com ela mesma (sempre False)"
def sem_repetidos(lista):
    return sorted(set(lista))


def tem_repetidos(lista):
    return len(lista) != len(lista)
```
```python name="ordena mas não tira os repetidos"
def sem_repetidos(lista):
    return sorted(lista)


def tem_repetidos(lista):
    return len(set(lista)) < len(lista)
```
```python name="tem_repetidos com a comparação invertida"
def sem_repetidos(lista):
    return sorted(set(lista))


def tem_repetidos(lista):
    return len(set(lista)) == len(lista)
```

## Passo 4 · Exercício · Turmas

Duas disciplinas têm listas de matrícula, guardadas como conjuntos. O código inicial traz dois deles para você testar:

```python
python = {"ana", "bia", "caio"}
calculo = {"bia", "davi"}
```

Escreva três funções que recebem dois conjuntos `a` e `b` e devolvem uma **lista em ordem alfabética**.

| Chamada | Devolve | Quem são |
|---|---|---|
| `ambos(python, calculo)` | `["bia"]` | quem está nos dois |
| `apenas_a(python, calculo)` | `["ana", "caio"]` | quem está em `a` e não está em `b` |
| `pelo_menos_um(python, calculo)` | `["ana", "bia", "caio", "davi"]` | quem está em pelo menos um |

### Instruções
1. Complete `ambos(a, b)`: devolve, em ordem alfabética, quem está nos dois conjuntos.
2. Complete `apenas_a(a, b)`: devolve, em ordem alfabética, quem está em `a` e não está em `b`.
   Dica: nesta operação a ordem dos conjuntos muda o resultado.
3. Complete `pelo_menos_um(a, b)`: devolve, em ordem alfabética, quem está em pelo menos um dos dois, sem repetir ninguém.

### Código inicial
```python
python = {"ana", "bia", "caio"}
calculo = {"bia", "davi"}


def ambos(a, b):
    pass


def apenas_a(a, b):
    pass


def pelo_menos_um(a, b):
    pass
```

### Solução
```python
python = {"ana", "bia", "caio"}
calculo = {"bia", "davi"}


def ambos(a, b):
    return sorted(a & b)


def apenas_a(a, b):
    return sorted(a - b)


def pelo_menos_um(a, b):
    return sorted(a | b)
```

### Dicas
1. As três operações são `&` (interseção), `-` (diferença) e `|` (união).
2. `sorted(...)` transforma o conjunto resultante em uma lista ordenada.
3. `ambos` devolve `sorted(a & b)`, `apenas_a` devolve `sorted(a - b)` e `pelo_menos_um` devolve `sorted(a | b)`.

### Verificação
```json
[
  { "id": "ambos-turmas", "checkpoint": 1, "kind": "expr", "expr": "ambos({\"ana\", \"bia\", \"caio\"}, {\"bia\", \"davi\"})", "expected": ["bia"], "type": "list",
    "name": "ambos(python, calculo) é [\"bia\"]", "hint": "Interseção: só quem aparece nos dois conjuntos. O retorno é uma lista." },
  { "id": "ambos-nenhum", "checkpoint": 1, "kind": "expr", "expr": "ambos({1, 2}, {3})", "expected": [], "type": "list",
    "name": "Sem ninguém em comum, ambos devolve []" },
  { "id": "ambos-varios", "checkpoint": 1, "kind": "expr", "expr": "ambos({\"eva\", \"caio\", \"ana\"}, {\"ana\", \"eva\", \"bia\"})", "expected": ["ana", "eva"], "type": "list",
    "name": "Dois nomes em comum, em ordem alfabética", "hint": "Ordene o resultado com sorted." },
  { "id": "apenas-a-turmas", "checkpoint": 2, "kind": "expr", "expr": "apenas_a({\"ana\", \"bia\", \"caio\"}, {\"bia\", \"davi\"})", "expected": ["ana", "caio"], "type": "list",
    "name": "apenas_a(python, calculo) é [\"ana\", \"caio\"]", "hint": "A diferença tira do primeiro conjunto o que está no segundo. Confira a ordem dos dois." },
  { "id": "apenas-a-invertido", "checkpoint": 2, "kind": "expr", "expr": "apenas_a({\"bia\", \"davi\"}, {\"ana\", \"bia\", \"caio\"})", "expected": ["davi"], "type": "list",
    "name": "apenas_a(calculo, python) é [\"davi\"]", "hint": "O primeiro argumento é sempre o a: fica quem está nele e não está no b." },
  { "id": "um-turmas", "checkpoint": 3, "kind": "expr", "expr": "pelo_menos_um({\"ana\", \"bia\", \"caio\"}, {\"bia\", \"davi\"})", "expected": ["ana", "bia", "caio", "davi"], "type": "list",
    "name": "pelo_menos_um(python, calculo) tem os quatro nomes", "hint": "União: todo mundo, cada nome uma vez só, em ordem alfabética." },
  { "id": "um-vazios", "checkpoint": 3, "kind": "expr", "expr": "pelo_menos_um(set(), set())", "expected": [], "type": "list",
    "name": "Dois conjuntos vazios: pelo_menos_um devolve []" }
]
```

### Soluções erradas
```python name="b - a em apenas_a"
python = {"ana", "bia", "caio"}
calculo = {"bia", "davi"}


def ambos(a, b):
    return sorted(a & b)


def apenas_a(a, b):
    return sorted(b - a)


def pelo_menos_um(a, b):
    return sorted(a | b)
```
```python name="união em ambos"
python = {"ana", "bia", "caio"}
calculo = {"bia", "davi"}


def ambos(a, b):
    return sorted(a | b)


def apenas_a(a, b):
    return sorted(a - b)


def pelo_menos_um(a, b):
    return sorted(a | b)
```
```python name="devolve conjuntos em vez de listas ordenadas"
python = {"ana", "bia", "caio"}
calculo = {"bia", "davi"}


def ambos(a, b):
    return a & b


def apenas_a(a, b):
    return a - b


def pelo_menos_um(a, b):
    return a | b
```
```python name="diferença simétrica em pelo_menos_um"
python = {"ana", "bia", "caio"}
calculo = {"bia", "davi"}


def ambos(a, b):
    return sorted(a & b)


def apenas_a(a, b):
    return sorted(a - b)


def pelo_menos_um(a, b):
    return sorted(a ^ b)
```

## Passo 5 · Quiz · Conjuntos

### Pergunta
O que a linha `vazio = {}` cria?
- [ ] Um conjunto vazio
- [x] Um dicionário vazio
- [ ] Uma lista vazia
- [ ] Um erro de sintaxe, porque faltam os itens
> As chaves vazias são do dicionário, que veio primeiro na linguagem. O conjunto vazio se cria com `set()`.

### Pergunta
Quanto vale `len({1, 1, 2})`?
- [ ] `3`, porque foram escritos três valores
- [x] `2`, porque o conjunto guarda cada valor uma vez só
- [ ] `1`, porque só o valor repetido é contado
- [ ] Dá erro, porque um conjunto não aceita valores repetidos
> Repetir um valor ao criar o conjunto não é erro: a repetição é simplesmente descartada. Sobram o `1` e o `2`.

### Pergunta
O que acontece na segunda linha?
```python
cores = {"azul", "verde"}
print(cores[0])
```
- [ ] Imprime `azul`, o primeiro valor escrito
- [ ] Imprime `azul` ou `verde`, dependendo da execução
- [x] O programa para com `TypeError`, porque um conjunto não tem posições
- [ ] Imprime `None`
> Um conjunto não tem ordem, então não existe "o item da posição 0". A mensagem é `TypeError: 'set' object is not subscriptable`. Para ter posições, converta: `sorted(cores)[0]`.
