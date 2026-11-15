---
slug: n1-m4-05-lacos-aninhados
titulo: Laços aninhados
descricao: 'Um laço dentro do outro: tabuadas, grades, padrões com asteriscos e como contar as iterações.'
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
- Escrever laços aninhados e prever a ordem em que os pares (i, j) aparecem
- Calcular quantas vezes o bloco interno executa
- Montar saídas em grade (tabuada, triângulo de asteriscos) com print e end
---

## Passo 1 · Leitura · Um laço dentro do outro

O bloco de um laço pode conter qualquer comando, inclusive outro laço. Isso se chama **laço aninhado**. Ele aparece sempre que há duas dimensões: linhas e colunas de uma tabela, dias e horários, cada aluno com cada prova.

```python
for i in range(1, 3):        # laço de fora: i vale 1, depois 2
    for j in range(1, 4):    # laço de dentro: j vale 1, 2, 3
        print(i, j)
```

A regra que explica tudo: **a cada volta do laço de fora, o laço de dentro roda inteiro, do começo ao fim**. Pense em um relógio: o ponteiro dos minutos dá uma volta completa para cada passo do ponteiro das horas.

| `i` (fora) | `j` (dentro) | Imprime |
|---|---|---|
| 1 | 1 | `1 1` |
| 1 | 2 | `1 2` |
| 1 | 3 | `1 3` |
| 2 | 1 | `2 1` |
| 2 | 2 | `2 2` |
| 2 | 3 | `2 3` |

No visualizador, repare que `j` recomeça do 1 toda vez que `i` muda:

```python visualizar
for i in range(1, 3):
    for j in range(1, 4):
        print(i, j)
```

#### Quantas vezes o bloco de dentro roda?

Se o laço de fora dá $n$ voltas e o de dentro dá $m$ voltas, o bloco de dentro executa $n \times m$ vezes. No exemplo, $2 \times 3 = 6$ linhas impressas. Com 3 voltas por fora e 4 por dentro seriam $3 \times 4 = 12$. Esse número cresce depressa: dois laços de 1000 voltas executam o bloco um milhão de vezes.

Cada laço precisa de uma **variável própria** (`i` e `j`, ou nomes melhores como `linha` e `coluna`). Se os dois usarem a mesma, o laço de dentro sobrescreve o valor do laço de fora.

#### Montando grades com `end`

O `print` termina a linha depois de escrever. O parâmetro `end` troca esse final: `print(x, end=" ")` escreve `x`, um espaço e **continua na mesma linha**. Um `print()` vazio só encerra a linha. Com os dois dá para montar uma grade:

```python
for linha in range(2):
    for coluna in range(4):
        print("#", end="")
    print()                  # fecha a linha, uma vez por volta do laço de fora
```

```
####
####
```

A indentação do `print()` decide tudo: alinhado com o `for` de dentro, ele pertence ao laço de fora e roda uma vez por linha da grade.

## Passo 2 · Previsão · Linha por linha

O programa abaixo usa `end=" "` no laço de dentro e um `print()` vazio no laço de fora. Digite exatamente o que ele imprime.

### Código
```python
for i in range(2):
    for j in range(3):
        print(i + j, end=" ")
    print()
```

### Dicas
1. `end=" "` mantém a escrita na mesma linha, com um espaço depois de cada valor.
2. O `print()` sem nada fecha a linha a cada volta do laço de fora: a saída tem duas linhas.

### Saída esperada
```text
0 1 2
1 2 3
```

## Passo 3 · Exercício · Tabuada do 1 ao 3

A tabuada é o exemplo clássico de duas dimensões: para cada número, todos os multiplicadores de 1 a 10.

Escreva um programa que imprime as tabuadas do 1, do 2 e do 3. Cada linha tem o formato `1 x 1 = 1` (número, espaço, a letra `x`, espaço, multiplicador, espaço, `=`, espaço, resultado). Depois de cada tabuada vem uma linha em branco, que separa uma tabuada da seguinte.

A saída começa assim:

```
1 x 1 = 1
1 x 2 = 2
1 x 3 = 3
```

segue até `1 x 10 = 10`, e a passagem de uma tabuada para a outra fica assim:

```
1 x 9 = 9
1 x 10 = 10

2 x 1 = 2
2 x 2 = 4
```

A última linha com texto é `3 x 10 = 30`. São 30 linhas de conta.

### Instruções
1. Use um laço de fora para o número da tabuada (1, 2 e 3) e um laço de dentro para o multiplicador (1 a 10), cada um com a sua variável.
2. No laço de dentro, imprima a linha no formato `1 x 1 = 1`.
   Dica: uma f-string monta a linha com os três valores.
3. Separe as tabuadas com uma linha em branco: um `print()` vazio depois do laço de dentro.

### Código inicial
```python
# Laço de fora: o número da tabuada (1, 2, 3)

# Laço de dentro: o multiplicador (1 a 10)

# Linha em branco depois de cada tabuada
```

### Solução
```python
for numero in range(1, 4):
    for vezes in range(1, 11):
        print(f"{numero} x {vezes} = {numero * vezes}")
    print()
```

### Dicas
1. O laço de fora escolhe a tabuada; o laço de dentro percorre os multiplicadores de 1 a 10.
2. O `print()` vazio fica no laço de fora: alinhado com o `for` de dentro, não dentro dele.
3. A linha é `print(f"{numero} x {vezes} = {numero * vezes}")`, com os nomes das suas variáveis.

### Verificação
```json
[
  { "id": "usa-for", "checkpoint": 1, "kind": "source", "rule": { "type": "uses", "construct": "for" },
    "name": "Usa for" },
  { "id": "tabuada-do-1", "checkpoint": 2, "kind": "io", "stdin": "", "expected_stdout": "^1 x 1 = 1\\n1 x 2 = 2\\n1 x 3 = 3\\n", "match": "regex",
    "name": "Começa com a tabuada do 1", "hint": "Confira o formato da linha (espaços em volta do x e do =) e se cada laço tem a sua variável." },
  { "id": "tabuada-do-3", "checkpoint": 2, "kind": "io", "stdin": "", "expected_stdout": "3 x 7 = 21\n3 x 8 = 24\n3 x 9 = 27\n3 x 10 = 30", "match": "contains",
    "name": "A tabuada do 3 vai até 3 x 10 = 30", "hint": "O laço de fora vai até o 3 e o de dentro vai até o 10: lembre que o fim do range é exclusivo." },
  { "id": "saida", "checkpoint": 3, "kind": "io", "stdin": "", "expected_stdout": "1 x 1 = 1\n1 x 2 = 2\n1 x 3 = 3\n1 x 4 = 4\n1 x 5 = 5\n1 x 6 = 6\n1 x 7 = 7\n1 x 8 = 8\n1 x 9 = 9\n1 x 10 = 10\n\n2 x 1 = 2\n2 x 2 = 4\n2 x 3 = 6\n2 x 4 = 8\n2 x 5 = 10\n2 x 6 = 12\n2 x 7 = 14\n2 x 8 = 16\n2 x 9 = 18\n2 x 10 = 20\n\n3 x 1 = 3\n3 x 2 = 6\n3 x 3 = 9\n3 x 4 = 12\n3 x 5 = 15\n3 x 6 = 18\n3 x 7 = 21\n3 x 8 = 24\n3 x 9 = 27\n3 x 10 = 30",
    "name": "As três tabuadas, separadas por uma linha em branco", "hint": "Entre a última linha de uma tabuada e a primeira da seguinte há exatamente uma linha em branco." }
]
```

### Soluções erradas
```python name="sem a linha em branco entre as tabuadas"
for numero in range(1, 4):
    for vezes in range(1, 11):
        print(f"{numero} x {vezes} = {numero * vezes}")
```
```python name="a mesma variável nos dois laços"
for i in range(1, 4):
    for i in range(1, 11):
        print(f"{i} x {i} = {i * i}")
    print()
```
```python name="print() vazio dentro do laço de dentro"
for numero in range(1, 4):
    for vezes in range(1, 11):
        print(f"{numero} x {vezes} = {numero * vezes}")
        print()
```
```python name="range(1, 10) (para no x 9)"
for numero in range(1, 4):
    for vezes in range(1, 10):
        print(f"{numero} x {vezes} = {numero * vezes}")
    print()
```

## Passo 4 · Exercício · Triângulo

Nos laços aninhados, o laço de dentro pode depender da variável do laço de fora. É assim que se desenha um triângulo: a linha 1 tem 1 asterisco, a linha 2 tem 2, e assim por diante.

Escreva um programa que lê um inteiro `n` (com `input()` sem texto) e imprime `n` linhas. A primeira tem 1 asterisco, a segunda tem 2, até a última, com `n` asteriscos. Não há espaços entre os asteriscos.

Exemplo de execução, com a entrada `3`:

```
*
**
***
```

Com a entrada `1`, a saída é uma única linha com `*`.

### Instruções
1. Leia `n` e percorra as linhas de 1 até `n` com um `for`.
   Dica: a primeira linha é a de número 1, não a de número 0.
2. Em cada linha, imprima tantos asteriscos quanto o número da linha, todos juntos, e termine a linha.

### Código inicial
```python
n = int(input())
# Para cada linha de 1 até n, imprima os asteriscos da linha
```

### Solução
```python
n = int(input())
for linha in range(1, n + 1):
    for coluna in range(linha):
        print("*", end="")
    print()
```

### Dicas
1. A linha de número `i` tem `i` asteriscos: o laço de fora vai de 1 até `n`, incluindo o `n`.
2. Use um laço de dentro que repete `print("*", end="")` e, depois dele, um `print()` vazio. Outra saída: `"*" * i` repete o texto `i` vezes.

### Verificação
```json
[
  { "id": "n-1", "checkpoint": 1, "kind": "io", "stdin": "1\n", "expected_stdout": "*",
    "name": "Entrada 1: uma linha com um asterisco", "hint": "Com n = 1 há exatamente uma linha, com um asterisco." },
  { "id": "n-3", "checkpoint": 2, "kind": "io", "stdin": "3\n", "expected_stdout": "*\n**\n***",
    "name": "Entrada 3: linhas com 1, 2 e 3 asteriscos", "hint": "A quantidade de asteriscos acompanha o número da linha, e a última linha tem n asteriscos." },
  { "id": "n-5", "checkpoint": 2, "kind": "io", "stdin": "5\n", "expected_stdout": "*\n**\n***\n****\n*****",
    "name": "Entrada 5: cinco linhas", "hint": "Cada linha tem um asterisco a mais que a anterior, sem espaços." }
]
```

### Soluções erradas
```python name="range(n) (primeira linha vazia e falta a última)"
n = int(input())
for linha in range(n):
    for coluna in range(linha):
        print("*", end="")
    print()
```
```python name="n asteriscos em todas as linhas (um quadrado)"
n = int(input())
for linha in range(1, n + 1):
    for coluna in range(n):
        print("*", end="")
    print()
```
```python name="sem end: um asterisco por linha"
n = int(input())
for linha in range(1, n + 1):
    for coluna in range(linha):
        print("*")
    print()
```

## Passo 5 · Quiz · Aninhados

### Pergunta
Em que ordem este programa imprime os pares?
```python
for i in range(2):
    for j in range(2):
        print(i, j)
```
- [ ] `0 0`, `1 0`, `0 1`, `1 1`
- [x] `0 0`, `0 1`, `1 0`, `1 1`
- [ ] `0 0`, `1 1`
- [ ] `0 1`, `1 0`
> Para cada valor de `i`, o laço de dentro roda inteiro. Com `i = 0` saem `0 0` e `0 1`; só então `i` passa a 1 e `j` recomeça.

### Pergunta
O laço de fora dá 3 voltas e o de dentro dá 4 voltas. Quantas vezes o bloco do laço de dentro executa?
- [ ] 4
- [ ] 7
- [x] 12
- [ ] 16
> As quantidades se multiplicam: $3 \times 4 = 12$. Somar (7) seria o resultado de dois laços um depois do outro, não um dentro do outro.

### Pergunta
O que este programa imprime?
```python
for i in range(1, 4):
    for j in range(i):
        print(i, end="")
    print()
```
- [ ] Três linhas: `1`, `2`, `3`
- [ ] Uma linha: `122333`
- [x] Três linhas: `1`, `22`, `333`
- [ ] Três linhas: `0`, `01`, `012`
> O laço de dentro dá `i` voltas e imprime o valor de `i` (não o de `j`) em cada uma. O `print()` vazio fecha a linha a cada volta do laço de fora.

## Passo 6 · Exercício · pares_que_somam(lista, alvo)

Até aqui o `for` entregava os valores da lista. Para comparar cada item com os **outros** itens, é mais prático percorrer as **posições**. Três ferramentas resolvem isso:

- `len(lista)` devolve a quantidade de itens;
- as posições vão de 0 até `len(lista) - 1`, que é exatamente o que `range(len(lista))` gera;
- `lista[i]` é o item que está na posição `i`.

Escreva a função `pares_que_somam(lista, alvo)`, que devolve **quantos pares** de itens da lista somam `alvo`. Um par é formado por dois itens em posições diferentes, e cada par conta uma vez só: o par das posições 0 e 3 é o mesmo par das posições 3 e 0.

| Chamada | Resultado | Por quê |
|---|---|---|
| `pares_que_somam([1, 2, 3, 4], 5)` | `2` | 1 + 4 e 2 + 3 |
| `pares_que_somam([2, 2, 2], 4)` | `3` | posições 0 e 1, 0 e 2, 1 e 2 |
| `pares_que_somam([], 1)` | `0` | não há itens |

Para não contar o mesmo par duas vezes, olhe só os pares em que a segunda posição vem **depois** da primeira ($i < j$).

### Instruções
1. Crie um contador com 0 e percorra as posições `i` da lista com `range(len(lista))`.
2. Para cada `i`, percorra com um laço de dentro as posições `j` que vêm depois de `i`.
   Dica: o `range` do laço de dentro pode começar em um valor que depende de `i`.
3. Some 1 ao contador quando `lista[i] + lista[j]` for igual ao alvo e devolva o contador depois dos dois laços.

### Código inicial
```python
def pares_que_somam(lista, alvo):
    contador = 0
    # percorra as posições i e, para cada uma, as posições j depois de i

    # devolva o contador
```

### Solução
```python
def pares_que_somam(lista, alvo):
    contador = 0
    for i in range(len(lista)):
        for j in range(i + 1, len(lista)):
            if lista[i] + lista[j] == alvo:
                contador += 1
    return contador
```

### Dicas
1. Percorra as posições com `range(len(lista))` e leia os itens com `lista[i]` e `lista[j]`.
2. O laço de dentro começa em `i + 1`: assim `j` é sempre maior que `i`, e nenhum par se repete nem usa o mesmo item duas vezes.
3. O `return` fica fora dos dois laços, alinhado com o primeiro `for`.

### Verificação
```json
[
  { "id": "vazia", "checkpoint": 1, "kind": "call", "function": "pares_que_somam", "args": [[], 1], "expected": 0, "type": "int",
    "name": "pares_que_somam([], 1)", "hint": "Com a lista vazia nenhum laço roda; a função ainda precisa devolver o contador." },
  { "id": "um-item", "checkpoint": 2, "kind": "call", "function": "pares_que_somam", "args": [[5], 10], "expected": 0, "type": "int",
    "name": "pares_que_somam([5], 10)", "hint": "Um item sozinho não forma par com ele mesmo: as duas posições precisam ser diferentes." },
  { "id": "quatro", "checkpoint": 2, "kind": "call", "function": "pares_que_somam", "args": [[1, 2, 3, 4], 5], "expected": 2, "type": "int",
    "name": "pares_que_somam([1, 2, 3, 4], 5)", "hint": "Cada par conta uma vez: as posições 0 e 3 e as posições 3 e 0 são o mesmo par." },
  { "id": "iguais", "checkpoint": 3, "kind": "call", "function": "pares_que_somam", "args": [[2, 2, 2], 4], "expected": 3, "type": "int",
    "name": "pares_que_somam([2, 2, 2], 4)", "hint": "São três pares de posições diferentes. A função continua contando depois do primeiro par." },
  { "id": "nenhum", "checkpoint": 3, "kind": "call", "function": "pares_que_somam", "args": [[1, 2, 3], 10], "expected": 0, "type": "int",
    "name": "Nenhum par soma o alvo" },
  { "id": "negativos", "checkpoint": 3, "kind": "call", "function": "pares_que_somam", "args": [[-1, 1, 0, 5, -5], 0], "expected": 2, "type": "int",
    "name": "pares_que_somam([-1, 1, 0, 5, -5], 0)", "hint": "O zero sozinho não forma par com ele mesmo." }
]
```

### Soluções erradas
```python name="conta (i, j) e (j, i): o dobro"
def pares_que_somam(lista, alvo):
    contador = 0
    for i in range(len(lista)):
        for j in range(len(lista)):
            if i != j and lista[i] + lista[j] == alvo:
                contador += 1
    return contador
```
```python name="inclui i == j (o item com ele mesmo)"
def pares_que_somam(lista, alvo):
    contador = 0
    for i in range(len(lista)):
        for j in range(i, len(lista)):
            if lista[i] + lista[j] == alvo:
                contador += 1
    return contador
```
```python name="return dentro do laço (para no primeiro par)"
def pares_que_somam(lista, alvo):
    contador = 0
    for i in range(len(lista)):
        for j in range(i + 1, len(lista)):
            if lista[i] + lista[j] == alvo:
                contador += 1
                return contador
    return contador
```
