---
slug: n1-m5-03-percorrendo-listas
titulo: Percorrendo listas
descricao: for sobre elementos, enumerate para índice e valor, zip para listas paralelas e os perigos de alterar durante a iteração.
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
- Percorrer listas com for, enumerate e zip e escolher a forma adequada
- Construir uma nova lista a partir de outra (filtrar e transformar) com laço
- Explicar por que remover itens enquanto percorre dá errado e como evitar
---

## Passo 1 · Leitura · Três jeitos de percorrer

**Percorrer** uma lista é passar por todos os itens, um de cada vez. O `for` que você usou com `range` também funciona direto com uma lista. Há três formas, e a escolha depende do que você precisa em cada volta.

**Só o item.** A variável do laço recebe cada item, na ordem:

```python
nomes = ["Ana", "Bia", "Caio"]
for nome in nomes:
    print(nome)
```

**A posição e o item.** `enumerate` entrega dois valores por volta: primeiro a posição, depois o item. A contagem começa em 0; com `start=1` ela começa em 1.

```python
for posicao, nome in enumerate(nomes, start=1):
    print(posicao, nome)    # 1 Ana, 2 Bia, 3 Caio
```

**Duas listas lado a lado.** `zip` junta as listas par a par: o primeiro de uma com o primeiro da outra, e assim por diante. Se os tamanhos forem diferentes, `zip` para quando a lista menor acaba.

```python
notas = [8, 6, 9]
for nome, nota in zip(nomes, notas):
    print(nome, nota)       # Ana 8, Bia 6, Caio 9
```

#### Construir uma lista nova

O acumulador do módulo 4 também serve para listas. Em vez de começar em `0` e somar, você começa com uma **lista vazia** e usa `append` dentro do laço. Com um `if`, só entram os itens que interessam (filtrar); com uma conta no `append`, entra uma versão modificada de cada item (transformar).

Execute o programa abaixo passo a passo e veja `aprovados` crescer só quando a nota passa:

```python visualizar
nomes = ["Ana", "Bia", "Caio"]
notas = [8, 6, 9]
aprovados = []
for nome, nota in zip(nomes, notas):
    if nota >= 7:
        aprovados.append(nome)
print(aprovados)
```

#### Atalhos prontos

Para as contas mais comuns com uma lista de números, o Python já traz funções. Elas fazem por dentro o mesmo laço com acumulador que você escreveu à mão no módulo 4:

```python
notas = [8, 6, 9]
print(sum(notas))   # 23: a soma
print(min(notas))   # 6: o menor
print(max(notas))   # 9: o maior
```

## Passo 2 · Exercício · Ranking
modo: lacunas

O programa imprime o ranking de uma competição, com a posição antes de cada nome. Complete as três lacunas (`___`) para a saída ser exatamente:

```
1. Ana
2. Bia
3. Caio
```

### Instruções
1. Complete a variável do laço que recebe a posição.
   Dica: `enumerate` entrega primeiro a posição e depois o item.
2. Faça a contagem começar em 1.
3. Complete o que vai antes do ponto dentro da f-string.

### Código inicial
```python
nomes = ["Ana", "Bia", "Caio"]
for ___, nome in enumerate(nomes, start=___):
    print(f"{___}. {nome}")
```

### Solução
```python
nomes = ["Ana", "Bia", "Caio"]
for posicao, nome in enumerate(nomes, start=1):
    print(f"{posicao}. {nome}")
```

### Dicas
1. `enumerate` entrega dois valores por volta: primeiro a posição, depois o item. O `for` precisa de duas variáveis, nessa ordem.
2. `start=1` muda o primeiro número da contagem de 0 para 1.
3. A primeira e a terceira lacunas levam o mesmo nome de variável, por exemplo `posicao`.

### Verificação
```json
[
  { "id": "tres-linhas", "checkpoint": 1, "kind": "io", "stdin": "", "expected_stdout": "^\\d+\\. Ana\\n\\d+\\. Bia\\n\\d+\\. Caio\\s*$", "match": "regex",
    "name": "Cada linha tem um número, um ponto e o nome", "hint": "A variável da posição vem antes de nome no for, e é ela que aparece antes do ponto." },
  { "id": "comeca-em-1", "checkpoint": 2, "kind": "io", "stdin": "", "expected_stdout": "1. Ana", "match": "contains",
    "name": "A contagem começa em 1", "hint": "Sem start, enumerate começa em 0." },
  { "id": "ranking", "checkpoint": 3, "kind": "io", "stdin": "", "expected_stdout": "1. Ana\n2. Bia\n3. Caio",
    "name": "Saída: 1. Ana, 2. Bia, 3. Caio", "hint": "Compare com o enunciado: número, ponto, espaço e nome." }
]
```

### Soluções erradas
```python name="start=0 (começa em 0. Ana)"
nomes = ["Ana", "Bia", "Caio"]
for posicao, nome in enumerate(nomes, start=0):
    print(f"{posicao}. {nome}")
```
```python name="posição e nome trocados no for"
nomes = ["Ana", "Bia", "Caio"]
for nome, posicao in enumerate(nomes, start=1):
    print(f"{posicao}. {nome}")
```
```python name="número 1 fixo antes do ponto"
nomes = ["Ana", "Bia", "Caio"]
for posicao, nome in enumerate(nomes, start=1):
    print(f"{1}. {nome}")
```

## Passo 3 · Exercício · Filtrar e transformar

Escreva duas funções que constroem uma **lista nova** a partir da lista recebida, com o padrão "começa vazia, cresce com `append`". A lista recebida não muda.

| Chamada | Devolve |
|---|---|
| `apenas_pares([1, 2, 3, 4])` | `[2, 4]` |
| `dobrados([1, 2, 3, 4])` | `[2, 4, 6, 8]` |
| `apenas_pares([])` | `[]` |
| `dobrados([])` | `[]` |

Lembre que um número é par quando o resto da divisão por 2 é zero. O zero e os negativos como `-2` também são pares.

### Instruções
1. Complete `apenas_pares(lista)`: devolve uma lista só com os números pares, na mesma ordem em que aparecem.
   Dica: o `append` fica dentro de um `if`.
2. Complete `dobrados(lista)`: devolve uma lista com o dobro de cada número.

### Código inicial
```python
def apenas_pares(lista):
    pass


def dobrados(lista):
    pass
```

### Solução
```python
def apenas_pares(lista):
    resultado = []
    for numero in lista:
        if numero % 2 == 0:
            resultado.append(numero)
    return resultado


def dobrados(lista):
    resultado = []
    for numero in lista:
        resultado.append(numero * 2)
    return resultado
```

### Dicas
1. Comece cada função com `resultado = []`, antes do laço.
2. O `append` fica dentro do laço; o `return` fica depois dele, alinhado com o `for`.
3. Em `apenas_pares`, a condição é `numero % 2 == 0`; em `dobrados`, o que entra na lista é `numero * 2`.

### Verificação
```json
[
  { "id": "pares-4", "checkpoint": 1, "kind": "call", "function": "apenas_pares", "args": [[1, 2, 3, 4]], "expected": [2, 4], "type": "list",
    "name": "apenas_pares([1, 2, 3, 4]) é [2, 4]", "hint": "A função precisa devolver a lista com return, depois que o laço terminar." },
  { "id": "pares-zero-negativo", "checkpoint": 1, "kind": "call", "function": "apenas_pares", "args": [[0, -2, 7, 10]], "expected": [0, -2, 10], "type": "list",
    "name": "Zero e negativos pares também entram", "hint": "Use o resto da divisão por 2." },
  { "id": "pares-nenhum", "checkpoint": 1, "kind": "call", "function": "apenas_pares", "args": [[1, 3]], "expected": [], "type": "list",
    "name": "Sem nenhum par, devolve a lista vazia" },
  { "id": "pares-vazia", "checkpoint": 1, "kind": "call", "function": "apenas_pares", "args": [[]], "expected": [], "type": "list",
    "name": "apenas_pares([]) é []", "hint": "Com a lista vazia o laço não roda nenhuma vez; ainda assim a função devolve uma lista." },
  { "id": "dobrados-4", "checkpoint": 2, "kind": "call", "function": "dobrados", "args": [[1, 2, 3, 4]], "expected": [2, 4, 6, 8], "type": "list",
    "name": "dobrados([1, 2, 3, 4]) é [2, 4, 6, 8]", "hint": "Todos os itens entram, cada um multiplicado por 2." },
  { "id": "dobrados-vazia", "checkpoint": 2, "kind": "call", "function": "dobrados", "args": [[]], "expected": [], "type": "list",
    "name": "dobrados([]) é []" },
  { "id": "dobrados-preserva", "checkpoint": 2, "kind": "expr", "setup": "original = [5, -1]\nr = dobrados(original)", "expr": "[r, original]", "expected": [[10, -2], [5, -1]],
    "name": "dobrados devolve uma lista nova e não altera a original", "hint": "Guarde os dobros em outra lista, não na lista recebida." }
]
```

### Soluções erradas
```python name="print em vez de acumular (devolve None)"
def apenas_pares(lista):
    for numero in lista:
        if numero % 2 == 0:
            print(numero)


def dobrados(lista):
    for numero in lista:
        print(numero * 2)
```
```python name="return dentro do laço (só olha o primeiro item)"
def apenas_pares(lista):
    resultado = []
    for numero in lista:
        if numero % 2 == 0:
            resultado.append(numero)
        return resultado


def dobrados(lista):
    resultado = []
    for numero in lista:
        resultado.append(numero * 2)
        return resultado
```
```python name="dobrados altera a própria lista recebida"
def apenas_pares(lista):
    resultado = []
    for numero in lista:
        if numero % 2 == 0:
            resultado.append(numero)
    return resultado


def dobrados(lista):
    for i in range(len(lista)):
        lista[i] = lista[i] * 2
    return lista
```

## Passo 4 · Exercício · Média ponderada

Em muitas disciplinas as avaliações têm pesos diferentes: a prova vale mais que a lista de exercícios. Na **média ponderada**, cada nota é multiplicada pelo seu peso, os produtos são somados e o total é dividido pela **soma dos pesos**:

$$
\bar{x}_p = \frac{\sum n_i \cdot p_i}{\sum p_i}
$$

Na fórmula, $n_i$ é cada nota e $p_i$ é o peso dela. Para as notas 8 e 6, com pesos 2 e 1:

$$
\dfrac{8 \cdot 2 + 6 \cdot 1}{2 + 1} = \dfrac{22}{3} \approx 7{,}33
$$

Escreva `media_ponderada(notas, pesos)`. As duas listas têm o mesmo tamanho, e o peso de cada nota está na mesma posição da outra lista. Percorra as duas juntas com `zip`.

| Chamada | Devolve |
|---|---|
| `media_ponderada([8, 6], [2, 1])` | `7.333...` |
| `media_ponderada([10, 5, 6], [1, 1, 2])` | `6.75` |

### Instruções
1. Percorra `notas` e `pesos` lado a lado com `zip`, acumulando a soma dos produtos nota × peso.
   Dica: são duas variáveis no `for`, uma para a nota e outra para o peso.
2. Devolva a soma dos produtos dividida pela soma dos pesos.

### Código inicial
```python
def media_ponderada(notas, pesos):
    pass
```

### Solução
```python
def media_ponderada(notas, pesos):
    soma_produtos = 0
    soma_pesos = 0
    for nota, peso in zip(notas, pesos):
        soma_produtos += nota * peso
        soma_pesos += peso
    return soma_produtos / soma_pesos
```

### Dicas
1. Use um acumulador que começa em 0 e recebe `nota * peso` a cada volta.
2. O divisor é a soma dos pesos, não a quantidade de notas. Acumule os pesos no mesmo laço ou use `sum(pesos)`.
3. O laço é `for nota, peso in zip(notas, pesos):` e a última linha da função é a divisão das duas somas.

### Verificação
```json
[
  { "id": "usa-zip", "checkpoint": 1, "kind": "source", "rule": { "type": "calls", "name": "zip" },
    "name": "Percorre as duas listas com zip", "hint": "zip(notas, pesos) entrega uma nota e o peso dela a cada volta." },
  { "id": "pesos-iguais", "checkpoint": 1, "kind": "call", "function": "media_ponderada", "args": [[4, 8], [1, 1]], "expected": 6.0, "tolerance": 0.01,
    "name": "Com pesos iguais a 1, é a média comum: 6.0", "hint": "Multiplique cada nota pelo peso dela antes de somar." },
  { "id": "dois-um", "checkpoint": 2, "kind": "call", "function": "media_ponderada", "args": [[8, 6], [2, 1]], "expected": 7.3333, "tolerance": 0.01,
    "name": "media_ponderada([8, 6], [2, 1]) é 7.33", "hint": "Refaça a conta do enunciado: 22 dividido por 3." },
  { "id": "tres-notas", "checkpoint": 2, "kind": "call", "function": "media_ponderada", "args": [[10, 5, 6], [1, 1, 2]], "expected": 6.75, "tolerance": 0.01,
    "name": "media_ponderada([10, 5, 6], [1, 1, 2]) é 6.75", "hint": "O divisor é a soma dos pesos (4), não a quantidade de notas (3)." },
  { "id": "uma-nota", "checkpoint": 2, "kind": "call", "function": "media_ponderada", "args": [[7], [3]], "expected": 7.0, "tolerance": 0.01,
    "name": "Uma nota só: a média é a própria nota" }
]
```

### Soluções erradas
```python name="divide pela quantidade de notas"
def media_ponderada(notas, pesos):
    soma_produtos = 0
    for nota, peso in zip(notas, pesos):
        soma_produtos += nota * peso
    return soma_produtos / len(notas)
```
```python name="soma nota + peso em vez de multiplicar"
def media_ponderada(notas, pesos):
    soma_produtos = 0
    soma_pesos = 0
    for nota, peso in zip(notas, pesos):
        soma_produtos += nota + peso
        soma_pesos += peso
    return soma_produtos / soma_pesos
```
```python name="ignora os pesos (média comum)"
def media_ponderada(notas, pesos):
    total = 0
    for nota, peso in zip(notas, pesos):
        total += nota
    return total / len(notas)
```

## Passo 5 · Previsão · Remover enquanto percorre

O programa abaixo tenta tirar os números negativos de uma lista, removendo cada um durante o próprio laço. Ele roda sem erro. Leia com atenção, acompanhe volta por volta e digite exatamente o que ele imprime.

### Código
```python
numeros = [-1, -2, 3]
for n in numeros:
    if n < 0:
        numeros.remove(n)
print(numeros)
```

### Dicas
1. Depois de um `remove`, os itens seguintes andam uma posição para trás.
2. O laço não sabe disso: ele segue para a posição seguinte e acaba pulando um item.
3. Na primeira volta sai o `-1`. A segunda volta olha a posição 1 da lista que sobrou, `[-2, 3]`.

### Saída esperada
```text
[-2, 3]
```

## Passo 6 · Quiz · Percorrendo

### Pergunta
Por que é melhor construir uma lista nova do que remover itens da lista dentro do `for` que a percorre?
- [ ] Porque `remove` não funciona dentro de um laço e dá erro
- [x] Porque, depois de cada remoção, os itens seguintes mudam de posição e o laço pula um deles
- [ ] Porque uma lista nova ocupa menos memória
- [ ] Porque o `for` percorre uma cópia, então a remoção não tem efeito
> O `for` avança de posição em posição. Quando um item sai, o seguinte ocupa o lugar dele e o laço passa direto por ele. Foi assim que o `-2` sobrou no passo anterior.

### Pergunta
O que `enumerate(lista)` entrega em cada volta do `for`?
- [ ] Só a posição do item
- [ ] O item e depois a posição
- [x] A posição e depois o item
- [ ] O item atual e o item seguinte
> A ordem é sempre posição, depois item: `for posicao, item in enumerate(lista)`. A contagem começa em 0, a menos que você informe `start`.

### Pergunta
Quantas linhas este código imprime?
```python
nomes = ["Ana", "Bia", "Caio"]
notas = [8, 6]
for nome, nota in zip(nomes, notas):
    print(nome, nota)
```
- [ ] 3, e a última mostra `Caio None`
- [x] 2: o `zip` para quando a lista menor acaba
- [ ] Nenhuma: tamanhos diferentes dão erro
- [ ] 5, uma para cada item das duas listas
> `zip` forma pares enquanto houver item nas duas listas. `"Caio"` fica sem par e é ignorado, sem nenhum aviso.

## Passo 7 · Exercício · Remover negativos do jeito certo

No passo 5, a lista `[-1, -2, 3]` terminou como `[-2, 3]`: quando o `-1` saiu, o `-2` passou para a posição 0, mas o laço já seguia para a posição 1 e nunca olhou para ele.

A saída segura é não mexer na lista que está sendo percorrida: construa **outra** lista só com o que deve ficar. Escreva `remover_negativos(lista)`, que devolve uma lista nova sem os números negativos. A lista recebida precisa continuar como estava.

| Chamada | Devolve |
|---|---|
| `remover_negativos([-1, -2, 3])` | `[3]` |
| `remover_negativos([0, 5, -3])` | `[0, 5]` |
| `remover_negativos([])` | `[]` |

O zero não é negativo: ele fica.

### Instruções
1. Devolva uma lista nova só com os números que não são negativos, na mesma ordem.
   Dica: é o padrão de filtro do passo 3, com outra condição.
2. Não altere a lista recebida: depois da chamada, ela continua com os mesmos itens.

### Código inicial
```python
def remover_negativos(lista):
    pass
```

### Solução
```python
def remover_negativos(lista):
    resultado = []
    for numero in lista:
        if numero >= 0:
            resultado.append(numero)
    return resultado
```

### Dicas
1. Construa outra lista: comece com `resultado = []` e não chame `remove` em nenhum momento.
2. Guarde só os números que não são negativos. O zero fica, então a comparação é `>= 0`.
3. Dentro do laço: `if numero >= 0:` e, dentro dele, `resultado.append(numero)`. O `return resultado` vem depois do laço.

### Verificação
```json
[
  { "id": "dois-seguidos", "checkpoint": 1, "kind": "call", "function": "remover_negativos", "args": [[-1, -2, 3]], "expected": [3], "type": "list",
    "name": "remover_negativos([-1, -2, 3]) é [3]", "hint": "Dois negativos seguidos: se sobrou um, você está removendo da lista que percorre." },
  { "id": "zero-fica", "checkpoint": 1, "kind": "call", "function": "remover_negativos", "args": [[0, 5, -3]], "expected": [0, 5], "type": "list",
    "name": "O zero fica na lista", "hint": "Zero não é negativo: confira o operador da comparação." },
  { "id": "todos-negativos", "checkpoint": 1, "kind": "call", "function": "remover_negativos", "args": [[-4, -4, -9, -1]], "expected": [], "type": "list",
    "name": "Só negativos: devolve a lista vazia" },
  { "id": "borda-vazia", "checkpoint": 1, "kind": "call", "function": "remover_negativos", "args": [[]], "expected": [], "type": "list",
    "name": "remover_negativos([]) é []" },
  { "id": "original-intacta", "checkpoint": 2, "kind": "expr", "setup": "original = [1, -2, 3]\nr = remover_negativos(original)", "expr": "original", "expected": [1, -2, 3],
    "name": "A lista recebida não muda", "hint": "Guarde o que fica em outra lista; não use remove nem troque itens da lista recebida." },
  { "id": "resultado-novo", "checkpoint": 2, "kind": "expr", "setup": "original = [1, -2, 3]\nr = remover_negativos(original)", "expr": "r", "expected": [1, 3],
    "name": "A lista devolvida tem só os não negativos" }
]
```

### Soluções erradas
```python name="remove dentro do for (sobra o -2)"
def remover_negativos(lista):
    for numero in lista:
        if numero < 0:
            lista.remove(numero)
    return lista
```
```python name="filtra certo, mas altera a lista recebida"
def remover_negativos(lista):
    for numero in lista[:]:
        if numero < 0:
            lista.remove(numero)
    return lista
```
```python name="descarta o zero (usa > 0)"
def remover_negativos(lista):
    resultado = []
    for numero in lista:
        if numero > 0:
            resultado.append(numero)
    return resultado
```
