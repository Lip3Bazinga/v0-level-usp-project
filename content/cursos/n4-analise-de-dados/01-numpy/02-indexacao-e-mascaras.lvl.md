---
slug: n4-m1-02-indexacao-e-mascaras
titulo: Indexação, fatias e máscaras booleanas
descricao: Fatias em 2D, visualizações vs cópias, indexação por listas e por condições, np.where e atribuição por máscara.
dificuldade: intermediario
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
xp: 110
tempo_min: 45
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Selecionar linhas, colunas e blocos de arrays 2D e explicar quando a fatia é uma vista
- Filtrar e substituir valores com máscaras booleanas e np.where
- Combinar condições com &, | e ~ e contar elementos que as satisfazem
---

## Passo 1 · Leitura · Fatias em duas dimensões

Uma planilha fictícia de notas tem 4 alunos nas linhas e 3 provas nas colunas. Com uma lista de listas, pegar as notas da segunda prova exige um laço. Com um array 2D, basta um índice por eixo, separados por vírgula:

```python
notas = np.array([[7.0, 8.5, 6.0],
                  [5.5, 9.0, 7.5],
                  [8.0, 6.5, 9.5],
                  [4.0, 7.0, 5.0]])
notas[1, 2]        # 7.5: linha 1, coluna 2
notas[1:3, ::2]    # linhas 1 e 2, colunas 0 e 2
notas[:, 1]        # a prova 1 de todos os alunos: forma (4,)
notas[:, [1]]      # a mesma coluna, com forma (4, 1)
notas[[3, 0]]      # as linhas 3 e 0, nessa ordem
```

Cada eixo aceita o que você já usava em listas: um inteiro, um índice negativo ou uma fatia `inicio:fim:passo`, com o fim de fora. A diferença está na forma do resultado: um inteiro **remove** o eixo, enquanto uma fatia ou uma lista o **mantém**. Por isso `notas[:, 1]` é um vetor `(4,)` e `notas[:, [1]]` é uma matriz `(4, 1)`. Muitas funções aceitam as duas, mas uma conta entre elas produz uma forma inesperada (a próxima lição explica por quê).

`notas[1][2]` também funciona, em dois passos: pega a linha 1 e depois o elemento 2 dela. Com fatias, esse atalho engana: `notas[0:2][1:3]` não é o bloco das linhas 0 e 1 com as colunas 1 e 2, porque a segunda fatia corta de novo as **linhas** do resultado. Um índice além do tamanho dá `IndexError: index 5 is out of bounds for axis 1 with size 3`.

Agora a diferença que mais causa defeitos. Uma fatia é uma **vista** (*view*): outro jeito de olhar para os mesmos dados, sem copiar nada. Alterar a vista altera o original:

```python
primeira = notas[0, :]
primeira[0] = 10.0
print(notas[0, 0])   # 10.0
```

Indexar por uma **lista** de posições (ou, como você verá adiante, por uma condição) produz uma **cópia**: alterá-la não muda o original. Quando você quer um pedaço independente, peça a cópia com `notas[:2].copy()`. A vista existe por desempenho: fatiar um array de um milhão de elementos é instantâneo e não gasta memória. O preço é lembrar, ao escrever numa fatia, que ela ainda pertence ao array de onde saiu.

## Passo 2 · Previsão · Vista ou cópia

O programa altera uma fatia, uma seleção por lista e uma cópia, e imprime o array original depois de cada alteração. Leia sem executar e digite exatamente o que ele imprime.

### Código
```python
import numpy as np

a = np.arange(10, 16)
fatia = a[1:4]
fatia[0] = 50
print(a)

escolha = a[[0, 5]]
escolha[0] = 99
print(a)

c = a[2:].copy()
c[:] = 0
print(a)
print(fatia)

m = np.arange(6).reshape(2, 3)
print(m[:, 1].shape, m[:, [1]].shape)
```

### Dicas
1. `np.arange(10, 16)` vai de 10 a 15. Só uma das três alterações chega ao array `a`.
2. A fatia continua presa ao array: ela enxerga o valor que ela mesma mudou.
3. Um índice inteiro remove o eixo; uma lista com um índice só mantém o eixo, com tamanho 1.

### Saída esperada
```text
[10 50 12 13 14 15]
[10 50 12 13 14 15]
[10 50 12 13 14 15]
[50 12 13]
(2,) (2, 1)
```

## Passo 3 · Exercício · Recortes de uma planilha
modo: lacunas

A planilha `m` é um array 2D de `float`, com uma linha por aluno e uma coluna por prova. Complete as lacunas (`___`) das três funções de recorte.

### Instruções
1. `bloco(m, linhas, colunas)` devolve o bloco das linhas `l0` até `l1` e das colunas `c0` até `c1`, com o fim de fora nos dois eixos. `linhas` e `colunas` são pares `(inicio, fim)`.
2. `coluna(m, j)` devolve a coluna `j` como um vetor 1D, com um valor por linha.
3. `linhas(m, indices)` devolve as linhas cujas posições estão na lista `indices`, na ordem da lista, como um array independente de `m`.

### Código inicial
```python
import numpy as np


def bloco(m, linhas, colunas):
    l0, l1 = linhas
    c0, c1 = colunas
    return m[___]


def coluna(m, j):
    return m[___]


def linhas(m, indices):
    return m[___]
```

### Solução
```python
import numpy as np


def bloco(m, linhas, colunas):
    l0, l1 = linhas
    c0, c1 = colunas
    return m[l0:l1, c0:c1]


def coluna(m, j):
    return m[:, j]


def linhas(m, indices):
    return m[indices]
```

### Dicas
1. Os dois eixos vão dentro do mesmo par de colchetes, separados por vírgula; dois pares de colchetes seguidos cortam as linhas duas vezes.
2. Para "todas as linhas", use uma fatia sem início nem fim. Um índice inteiro some com o eixo; uma lista com um índice só o mantém.
3. Uma lista de posições num eixo seleciona essas posições nesse eixo, e o resultado já é uma cópia.

### Verificação
```json
[
  { "id": "bloco-meio", "checkpoint": 1, "kind": "expr", "setup": "M = np.arange(12, dtype=float).reshape(3, 4)",
    "expr": "bloco(M, (0, 2), (1, 3)).tolist()", "expected": [[1, 2], [5, 6]],
    "name": "bloco(M, (0, 2), (1, 3)) numa planilha 3 × 4", "hint": "Linhas e colunas vão no mesmo par de colchetes." },
  { "id": "bloco-linhas", "checkpoint": 1, "kind": "expr", "setup": "M = np.arange(12, dtype=float).reshape(3, 4)",
    "expr": "bloco(M, (1, 3), (0, 4)).tolist()", "expected": [[4, 5, 6, 7], [8, 9, 10, 11]],
    "name": "bloco(M, (1, 3), (0, 4)) pega as duas últimas linhas inteiras" },
  { "id": "bloco-forma", "checkpoint": 1, "kind": "expr", "setup": "M = np.arange(12, dtype=float).reshape(3, 4)",
    "expr": "list(bloco(M, (0, 3), (2, 3)).shape)", "expected": [3, 1],
    "name": "bloco(M, (0, 3), (2, 3)) tem forma (3, 1)", "hint": "O fim de cada par fica de fora." },
  { "id": "coluna-valores", "checkpoint": 2, "kind": "expr", "setup": "M = np.arange(12, dtype=float).reshape(3, 4)",
    "expr": "coluna(M, 2).tolist()", "expected": [2, 6, 10],
    "name": "coluna(M, 2)", "hint": "Uma coluna tem um valor por linha." },
  { "id": "coluna-forma", "checkpoint": 2, "kind": "expr", "setup": "M = np.arange(12, dtype=float).reshape(3, 4)",
    "expr": "list(coluna(M, 0).shape)", "expected": [3],
    "name": "coluna(M, 0) é um vetor 1D de forma (3,)", "hint": "Um índice inteiro remove o eixo; uma lista o mantém." },
  { "id": "coluna-negativa", "checkpoint": 2, "kind": "expr", "setup": "M = np.arange(12, dtype=float).reshape(3, 4)",
    "expr": "coluna(M, -1).tolist()", "expected": [3, 7, 11], "name": "coluna(M, -1) é a última coluna" },
  { "id": "linhas-ordem", "checkpoint": 3, "kind": "expr", "setup": "M = np.arange(12, dtype=float).reshape(3, 4)",
    "expr": "linhas(M, [2, 0]).tolist()", "expected": [[8, 9, 10, 11], [0, 1, 2, 3]],
    "name": "linhas(M, [2, 0]) traz a linha 2 e depois a 0", "hint": "A lista escolhe linhas, não colunas." },
  { "id": "linhas-repetida", "checkpoint": 3, "kind": "expr", "setup": "M = np.arange(12, dtype=float).reshape(3, 4)",
    "expr": "linhas(M, [1, 1]).tolist()", "expected": [[4, 5, 6, 7], [4, 5, 6, 7]],
    "name": "linhas(M, [1, 1]) repete a linha 1" },
  { "id": "linhas-uma", "checkpoint": 3, "kind": "expr", "setup": "M = np.arange(12, dtype=float).reshape(3, 4)",
    "expr": "list(linhas(M, [1]).shape)", "expected": [1, 4],
    "name": "linhas(M, [1]) continua 2D, com forma (1, 4)" },
  { "id": "linhas-copia", "checkpoint": 3, "kind": "expr",
    "setup": "M = np.arange(12, dtype=float).reshape(3, 4)\nr = linhas(M, [0, 1])\nr[:] = -1",
    "expr": "M[0].tolist()", "expected": [0, 1, 2, 3],
    "name": "Alterar o resultado de linhas não muda a planilha" }
]
```

### Soluções erradas
```python name="fatias encadeadas"
import numpy as np


def bloco(m, linhas, colunas):
    l0, l1 = linhas
    c0, c1 = colunas
    return m[l0:l1][c0:c1]


def coluna(m, j):
    return m[:, j]


def linhas(m, indices):
    return m[indices]
```
```python name="fim incluído"
import numpy as np


def bloco(m, linhas, colunas):
    l0, l1 = linhas
    c0, c1 = colunas
    return m[l0:l1 + 1, c0:c1 + 1]


def coluna(m, j):
    return m[:, j]


def linhas(m, indices):
    return m[indices]
```
```python name="eixos trocados no bloco"
import numpy as np


def bloco(m, linhas, colunas):
    l0, l1 = linhas
    c0, c1 = colunas
    return m[c0:c1, l0:l1]


def coluna(m, j):
    return m[:, j]


def linhas(m, indices):
    return m[indices]
```
```python name="coluna pega a linha"
import numpy as np


def bloco(m, linhas, colunas):
    l0, l1 = linhas
    c0, c1 = colunas
    return m[l0:l1, c0:c1]


def coluna(m, j):
    return m[j]


def linhas(m, indices):
    return m[indices]
```
```python name="coluna em 2D"
import numpy as np


def bloco(m, linhas, colunas):
    l0, l1 = linhas
    c0, c1 = colunas
    return m[l0:l1, c0:c1]


def coluna(m, j):
    return m[:, [j]]


def linhas(m, indices):
    return m[indices]
```
```python name="lista escolhe colunas"
import numpy as np


def bloco(m, linhas, colunas):
    l0, l1 = linhas
    c0, c1 = colunas
    return m[l0:l1, c0:c1]


def coluna(m, j):
    return m[:, j]


def linhas(m, indices):
    return m[:, indices]
```

## Passo 4 · Leitura · Máscaras, &, | e ~

Uma comparação com um array produz outro array, de `bool` e da mesma forma: uma **máscara**. Usada como índice, ela seleciona os elementos em que vale `True`, numa cópia 1D:

```python
leituras = np.array([21.5, -3.0, 19.0, 999.0, 22.5])
validas = (leituras > -50) & (leituras < 60)
print(validas)             # [ True  True  True False  True]
print(leituras[validas])   # [21.5 -3.  19.  22.5]
```

Condições se combinam com `&` (e), `|` (ou) e `~` (não), elemento a elemento. As palavras `and`, `or` e `not` do Python esperam um único `True` ou `False` e não sabem resumir um array: `leituras > -50 and leituras < 60` dá `ValueError: The truth value of an array with more than one element is ambiguous. Use a.any() or a.all()`, a mesma mensagem de um `if leituras > 0:`. Os parênteses em volta de cada comparação são obrigatórios, porque `&` tem precedência maior que `>`. Sem eles, `leituras > -50 & leituras < 60` calcula `-50 & leituras` primeiro e, num array de `float`, termina em `TypeError: ufunc 'bitwise_and' not supported for the input types, and the inputs could not be safely coerced to any supported types according to the casting rule ''safe''`.

As ferramentas do dia a dia:

```python
np.count_nonzero(validas)          # 4: quantos True (um inteiro do numpy; int(...) converte)
validas.any(), validas.all()       # existe algum True? todos são True?
np.flatnonzero(validas)            # [0 1 2 4]: as posições dos True
np.where(validas, leituras, 0.0)   # o valor onde é True, 0.0 onde é False
```

O `np.where` com três argumentos escolhe elemento a elemento, e dá para aninhar um dentro do outro para três categorias. Com um argumento só, ele devolve uma **tupla** de arrays de posições, uma por eixo.

Atribuir por máscara altera o array **no lugar**: `leituras[leituras > 60] = 0.0` muda o próprio `leituras`. Se o array veio de quem chamou a sua função, copie antes: `np.array(x, dtype=float)` sempre copia, `np.asarray` não.

Para os k maiores, `np.argsort` devolve as posições que ordenariam o array, do menor para o maior; para começar do maior, ordene `-a`. Com empates, passe `kind="stable"`, que mantém a ordem original dos iguais: é o desempate pelo menor índice, como no `sorted` do Nível 3. Inverter `np.argsort(a)[::-1]` inverte também a ordem dos empatados. Quando só os k primeiros importam, `np.argpartition` faz o papel do quickselect do Nível 3, sem ordenar tudo.

## Passo 5 · Exercício · Leituras de sensor

Um sensor fictício manda leituras em que valores negativos indicam falha. Escreva as duas funções com máscaras, sem laço.

### Instruções
1. `substituir_negativos(a, valor)` aceita uma lista ou um array e devolve um array `float64` **novo**, com cada leitura negativa trocada por `valor`. Zero não é negativo, e o array recebido não muda.
2. `contar_no_intervalo(a, minimo, maximo)` devolve, como `int`, quantas leituras estão entre `minimo` e `maximo`, **incluindo** os dois limites.
3. Não use laço (`for`, `while` ou compreensão).

### Código inicial
```python
import numpy as np


def substituir_negativos(a, valor):
    pass


def contar_no_intervalo(a, minimo, maximo):
    pass
```

### Solução
```python
import numpy as np


def substituir_negativos(a, valor):
    x = np.array(a, dtype=float)
    x[x < 0] = valor
    return x


def contar_no_intervalo(a, minimo, maximo):
    x = np.asarray(a, dtype=float)
    return int(np.count_nonzero((x >= minimo) & (x <= maximo)))
```

### Dicas
1. Uma atribuição por máscara escreve no array que está à esquerda; comece fazendo uma cópia `float` da entrada.
2. Cada comparação vai entre parênteses antes de entrar no `&`.
3. `np.count_nonzero` e a soma de booleanos devolvem um inteiro do numpy, não um `int` do Python.

### Verificação
```json
[
  { "id": "subst-basico", "checkpoint": 1, "kind": "expr", "expr": "substituir_negativos([3.0, -1.0, 0.0, -2.5, 4.0], 99).tolist()",
    "expected": [3, 99, 0, 99, 4], "name": "substituir_negativos([3.0, -1.0, 0.0, -2.5, 4.0], 99)",
    "hint": "Zero não é negativo." },
  { "id": "subst-sem-negativos", "checkpoint": 1, "kind": "expr", "expr": "substituir_negativos(np.array([1.5, 2.0]), 0).tolist()",
    "expected": [1.5, 2.0], "name": "Sem leituras negativas, nada muda" },
  { "id": "subst-tipo", "checkpoint": 1, "kind": "expr", "expr": "substituir_negativos([-1, 2], 0)", "type": "ndarray",
    "name": "substituir_negativos devolve um array numpy" },
  { "id": "subst-float", "checkpoint": 1, "kind": "expr", "expr": "substituir_negativos([-1, 2], 0.5).tolist()",
    "expected": [0.5, 2.0], "name": "substituir_negativos([-1, 2], 0.5) guarda o 0.5",
    "hint": "Num array de inteiros, o 0.5 gravado vira 0." },
  { "id": "subst-nao-altera", "checkpoint": 1, "kind": "expr",
    "setup": "a = np.array([1.0, -2.0, 3.0])\nr = substituir_negativos(a, 0.0)",
    "expr": "a.tolist()", "expected": [1.0, -2.0, 3.0], "name": "O array recebido não muda",
    "hint": "np.asarray não copia um array que já é float." },
  { "id": "contar-basico", "checkpoint": 2, "kind": "expr",
    "expr": "contar_no_intervalo(np.array([1.0, 5.0, 3.0, 7.0, 5.0, 9.0]), 3, 7)", "expected": 4, "type": "int",
    "name": "contar_no_intervalo([1, 5, 3, 7, 5, 9], 3, 7) é o int 4",
    "hint": "Os dois limites contam, e o retorno é um int do Python." },
  { "id": "contar-limites", "checkpoint": 2, "kind": "call", "function": "contar_no_intervalo", "args": [[3, 7], 3, 7],
    "expected": 2, "type": "int", "name": "Os dois limites contam", "hint": "Maior ou igual, menor ou igual." },
  { "id": "contar-nenhum", "checkpoint": 2, "kind": "call", "function": "contar_no_intervalo", "args": [[1, 2], 5, 9],
    "expected": 0, "type": "int", "name": "Nenhuma leitura no intervalo dá 0" },
  { "id": "contar-vazio", "checkpoint": 2, "kind": "call", "function": "contar_no_intervalo", "args": [[], 0, 10],
    "expected": 0, "type": "int", "name": "Sem leituras, a contagem é 0" },
  { "id": "sem-for", "checkpoint": 3, "kind": "source", "rule": { "type": "not_uses", "construct": "for" },
    "name": "Sem laço for" },
  { "id": "sem-while", "checkpoint": 3, "kind": "source", "rule": { "type": "not_uses", "construct": "while" },
    "name": "Sem laço while" },
  { "id": "sem-compreensao", "checkpoint": 3, "kind": "source", "rule": { "type": "not_uses", "construct": "list_comprehension" },
    "name": "Sem compreensão de lista" }
]
```

### Soluções erradas
```python name="and no lugar de &"
import numpy as np


def substituir_negativos(a, valor):
    x = np.array(a, dtype=float)
    x[x < 0] = valor
    return x


def contar_no_intervalo(a, minimo, maximo):
    x = np.asarray(a, dtype=float)
    return int(np.count_nonzero((x >= minimo) and (x <= maximo)))
```
```python name="condição sem parênteses"
import numpy as np


def substituir_negativos(a, valor):
    x = np.array(a, dtype=float)
    x[x < 0] = valor
    return x


def contar_no_intervalo(a, minimo, maximo):
    x = np.asarray(a, dtype=float)
    return int(np.count_nonzero(x >= minimo & x <= maximo))
```
```python name="limites de fora"
import numpy as np


def substituir_negativos(a, valor):
    x = np.array(a, dtype=float)
    x[x < 0] = valor
    return x


def contar_no_intervalo(a, minimo, maximo):
    x = np.asarray(a, dtype=float)
    return int(np.count_nonzero((x > minimo) & (x < maximo)))
```
```python name="contagem como inteiro do numpy"
import numpy as np


def substituir_negativos(a, valor):
    x = np.array(a, dtype=float)
    x[x < 0] = valor
    return x


def contar_no_intervalo(a, minimo, maximo):
    x = np.asarray(a, dtype=float)
    return np.count_nonzero((x >= minimo) & (x <= maximo))
```
```python name="altera o array recebido"
import numpy as np


def substituir_negativos(a, valor):
    x = np.asarray(a, dtype=float)
    x[x < 0] = valor
    return x


def contar_no_intervalo(a, minimo, maximo):
    x = np.asarray(a, dtype=float)
    return int(np.count_nonzero((x >= minimo) & (x <= maximo)))
```
```python name="zero tratado como negativo"
import numpy as np


def substituir_negativos(a, valor):
    x = np.array(a, dtype=float)
    x[x <= 0] = valor
    return x


def contar_no_intervalo(a, minimo, maximo):
    x = np.asarray(a, dtype=float)
    return int(np.count_nonzero((x >= minimo) & (x <= maximo)))
```
```python name="cópia sem dtype float"
import numpy as np


def substituir_negativos(a, valor):
    x = np.array(a)
    x[x < 0] = valor
    return x


def contar_no_intervalo(a, minimo, maximo):
    x = np.asarray(a, dtype=float)
    return int(np.count_nonzero((x >= minimo) & (x <= maximo)))
```
```python name="compreensão de lista"
import numpy as np


def substituir_negativos(a, valor):
    return np.array([valor if v < 0 else v for v in a], dtype=float)


def contar_no_intervalo(a, minimo, maximo):
    x = np.asarray(a, dtype=float)
    return int(np.count_nonzero((x >= minimo) & (x <= maximo)))
```

## Passo 6 · Exercício · Clientes e os k maiores

Uma loja fictícia guarda idades, rendas, notas de um curso interno e pontos de fidelidade em arrays paralelos. Escreva as três funções com máscaras, `np.where` e `np.argsort`, sem laço.

### Instruções
1. `clientes_elegiveis(idades, rendas, idade_min, renda_min)` devolve um array com as posições dos clientes que têm idade **e** renda maiores ou iguais aos mínimos, em ordem crescente.
2. `situacao(notas)` devolve um array de textos: `"aprovado"` para nota maior ou igual a 7, `"recuperação"` para nota maior ou igual a 5 e menor que 7, e `"reprovado"` abaixo de 5.
3. `top_k_indices(a, k)` devolve um array com as posições dos `k` maiores valores, do maior para o menor; entre valores iguais, vem primeiro a menor posição. Se `k` passar do tamanho, devolva todas as posições.
4. Não use laço (`for`, `while` ou compreensão).

### Código inicial
```python
import numpy as np


def clientes_elegiveis(idades, rendas, idade_min, renda_min):
    pass


def situacao(notas):
    pass


def top_k_indices(a, k):
    pass
```

### Solução
```python
import numpy as np


def clientes_elegiveis(idades, rendas, idade_min, renda_min):
    idades = np.asarray(idades, dtype=float)
    rendas = np.asarray(rendas, dtype=float)
    return np.flatnonzero((idades >= idade_min) & (rendas >= renda_min))


def situacao(notas):
    notas = np.asarray(notas, dtype=float)
    return np.where(notas >= 7, "aprovado", np.where(notas >= 5, "recuperação", "reprovado"))


def top_k_indices(a, k):
    a = np.asarray(a, dtype=float)
    return np.argsort(-a, kind="stable")[:k]
```

### Dicas
1. Duas condições que precisam valer juntas se combinam com `&`; as posições dos `True` saem de `np.flatnonzero`.
2. No `np.where` aninhado, teste primeiro a faixa mais alta: o de dentro só decide o que o de fora deixou para ele.
3. `argsort` é crescente e, sem `kind="stable"`, não garante a ordem dos empatados num array grande.

### Verificação
```json
[
  { "id": "elegiveis", "checkpoint": 1, "kind": "expr",
    "expr": "clientes_elegiveis([25, 17, 40, 33], [3000, 5000, 1500, 2500], 18, 2000).tolist()", "expected": [0, 3],
    "name": "Só os clientes com idade e renda suficientes", "hint": "As duas condições precisam valer ao mesmo tempo." },
  { "id": "elegiveis-limite", "checkpoint": 1, "kind": "expr",
    "expr": "clientes_elegiveis([18, 30], [2000.0, 1999.99], 18, 2000).tolist()", "expected": [0],
    "name": "Idade e renda iguais aos mínimos contam" },
  { "id": "elegiveis-nenhum", "checkpoint": 1, "kind": "expr",
    "expr": "clientes_elegiveis([10, 12], [100, 200], 18, 2000).tolist()", "expected": [],
    "name": "Ninguém elegível dá um array vazio", "hint": "Devolva um array de posições, não uma tupla." },
  { "id": "situacao-faixas", "checkpoint": 2, "kind": "expr", "expr": "situacao([7.0, 6.9, 5.0, 4.9, 10.0]).tolist()",
    "expected": ["aprovado", "recuperação", "recuperação", "reprovado", "aprovado"],
    "name": "situacao com notas nas fronteiras 7 e 5", "hint": "7 já é aprovado e 5 já é recuperação." },
  { "id": "situacao-tipo", "checkpoint": 2, "kind": "expr", "expr": "situacao([8.0, 3.0])", "type": "ndarray",
    "name": "situacao devolve um array numpy" },
  { "id": "top-empate", "checkpoint": 3, "kind": "expr", "expr": "top_k_indices([5, 9, 5, 9, 1], 3).tolist()",
    "expected": [1, 3, 0], "name": "top_k_indices([5, 9, 5, 9, 1], 3): empate pelo menor índice",
    "hint": "Entre dois 9, vem primeiro a posição menor." },
  { "id": "top-um", "checkpoint": 3, "kind": "expr", "expr": "top_k_indices([2.5, 8.0, 4.0], 1).tolist()",
    "expected": [1], "name": "top_k_indices([2.5, 8.0, 4.0], 1)" },
  { "id": "top-zero", "checkpoint": 3, "kind": "expr", "expr": "top_k_indices([2.5, 8.0, 4.0], 0).tolist()",
    "expected": [], "name": "k = 0 não devolve nenhuma posição" },
  { "id": "top-maior-que-n", "checkpoint": 3, "kind": "expr", "expr": "top_k_indices([4, 1], 5).tolist()",
    "expected": [0, 1], "name": "k maior que o tamanho devolve todas as posições" },
  { "id": "top-empates-grande", "checkpoint": 3, "kind": "expr", "expr": "top_k_indices(np.tile([1.0, 2.0], 50), 5).tolist()",
    "expected": [1, 3, 5, 7, 9], "name": "Em 100 valores com muitos empates, os menores índices vêm primeiro",
    "hint": "A ordenação padrão do argsort não preserva a ordem dos iguais." },
  { "id": "sem-for", "checkpoint": 4, "kind": "source", "rule": { "type": "not_uses", "construct": "for" },
    "name": "Sem laço for" },
  { "id": "sem-compreensao", "checkpoint": 4, "kind": "source", "rule": { "type": "not_uses", "construct": "list_comprehension" },
    "name": "Sem compreensão de lista" }
]
```

### Soluções erradas
```python name="| no lugar de &"
import numpy as np


def clientes_elegiveis(idades, rendas, idade_min, renda_min):
    idades = np.asarray(idades, dtype=float)
    rendas = np.asarray(rendas, dtype=float)
    return np.flatnonzero((idades >= idade_min) | (rendas >= renda_min))


def situacao(notas):
    notas = np.asarray(notas, dtype=float)
    return np.where(notas >= 7, "aprovado", np.where(notas >= 5, "recuperação", "reprovado"))


def top_k_indices(a, k):
    a = np.asarray(a, dtype=float)
    return np.argsort(-a, kind="stable")[:k]
```
```python name="np.where com um argumento"
import numpy as np


def clientes_elegiveis(idades, rendas, idade_min, renda_min):
    idades = np.asarray(idades, dtype=float)
    rendas = np.asarray(rendas, dtype=float)
    return np.where((idades >= idade_min) & (rendas >= renda_min))


def situacao(notas):
    notas = np.asarray(notas, dtype=float)
    return np.where(notas >= 7, "aprovado", np.where(notas >= 5, "recuperação", "reprovado"))


def top_k_indices(a, k):
    a = np.asarray(a, dtype=float)
    return np.argsort(-a, kind="stable")[:k]
```
```python name="mínimos estritos"
import numpy as np


def clientes_elegiveis(idades, rendas, idade_min, renda_min):
    idades = np.asarray(idades, dtype=float)
    rendas = np.asarray(rendas, dtype=float)
    return np.flatnonzero((idades > idade_min) & (rendas > renda_min))


def situacao(notas):
    notas = np.asarray(notas, dtype=float)
    return np.where(notas >= 7, "aprovado", np.where(notas >= 5, "recuperação", "reprovado"))


def top_k_indices(a, k):
    a = np.asarray(a, dtype=float)
    return np.argsort(-a, kind="stable")[:k]
```
```python name="aprovado só acima de 7"
import numpy as np


def clientes_elegiveis(idades, rendas, idade_min, renda_min):
    idades = np.asarray(idades, dtype=float)
    rendas = np.asarray(rendas, dtype=float)
    return np.flatnonzero((idades >= idade_min) & (rendas >= renda_min))


def situacao(notas):
    notas = np.asarray(notas, dtype=float)
    return np.where(notas > 7, "aprovado", np.where(notas >= 5, "recuperação", "reprovado"))


def top_k_indices(a, k):
    a = np.asarray(a, dtype=float)
    return np.argsort(-a, kind="stable")[:k]
```
```python name="faixas na ordem errada"
import numpy as np


def clientes_elegiveis(idades, rendas, idade_min, renda_min):
    idades = np.asarray(idades, dtype=float)
    rendas = np.asarray(rendas, dtype=float)
    return np.flatnonzero((idades >= idade_min) & (rendas >= renda_min))


def situacao(notas):
    notas = np.asarray(notas, dtype=float)
    return np.where(notas >= 5, "recuperação", np.where(notas >= 7, "aprovado", "reprovado"))


def top_k_indices(a, k):
    a = np.asarray(a, dtype=float)
    return np.argsort(-a, kind="stable")[:k]
```
```python name="argsort invertido"
import numpy as np


def clientes_elegiveis(idades, rendas, idade_min, renda_min):
    idades = np.asarray(idades, dtype=float)
    rendas = np.asarray(rendas, dtype=float)
    return np.flatnonzero((idades >= idade_min) & (rendas >= renda_min))


def situacao(notas):
    notas = np.asarray(notas, dtype=float)
    return np.where(notas >= 7, "aprovado", np.where(notas >= 5, "recuperação", "reprovado"))


def top_k_indices(a, k):
    a = np.asarray(a, dtype=float)
    return np.argsort(a)[::-1][:k]
```
```python name="argsort sem kind stable"
import numpy as np


def clientes_elegiveis(idades, rendas, idade_min, renda_min):
    idades = np.asarray(idades, dtype=float)
    rendas = np.asarray(rendas, dtype=float)
    return np.flatnonzero((idades >= idade_min) & (rendas >= renda_min))


def situacao(notas):
    notas = np.asarray(notas, dtype=float)
    return np.where(notas >= 7, "aprovado", np.where(notas >= 5, "recuperação", "reprovado"))


def top_k_indices(a, k):
    a = np.asarray(a, dtype=float)
    return np.argsort(-a)[:k]
```
```python name="últimos k do argsort"
import numpy as np


def clientes_elegiveis(idades, rendas, idade_min, renda_min):
    idades = np.asarray(idades, dtype=float)
    rendas = np.asarray(rendas, dtype=float)
    return np.flatnonzero((idades >= idade_min) & (rendas >= renda_min))


def situacao(notas):
    notas = np.asarray(notas, dtype=float)
    return np.where(notas >= 7, "aprovado", np.where(notas >= 5, "recuperação", "reprovado"))


def top_k_indices(a, k):
    a = np.asarray(a, dtype=float)
    return np.argsort(a, kind="stable")[-k:]
```
```python name="situação com compreensão"
import numpy as np


def clientes_elegiveis(idades, rendas, idade_min, renda_min):
    idades = np.asarray(idades, dtype=float)
    rendas = np.asarray(rendas, dtype=float)
    return np.flatnonzero((idades >= idade_min) & (rendas >= renda_min))


def situacao(notas):
    return np.array(["aprovado" if n >= 7 else "recuperação" if n >= 5 else "reprovado" for n in notas])


def top_k_indices(a, k):
    a = np.asarray(a, dtype=float)
    return np.argsort(-a, kind="stable")[:k]
```

## Passo 7 · Quiz · Máscaras e cópias

### Pergunta
O que este trecho imprime?
```python
leituras = np.array([12.0, -1.0, 15.0, 14.0])
janela = leituras[1:3]
janela[0] = 0.0
altas = leituras[leituras > 13]
altas[0] = 99.0
print(leituras)
```
- [ ] `[12. -1. 15. 14.]`
- [x] `[12.  0. 15. 14.]`
- [ ] `[12.  0. 99. 14.]`
- [ ] `[12. -1. 99. 14.]`
> `janela` é uma fatia, uma vista de `leituras`: escrever `0.0` nela muda a posição 1 do original. `altas` saiu de uma máscara, que produz uma cópia: o `99.0` fica só na cópia. Por isso a resposta tem o 0 e não tem o 99; as alternativas com `-1.` supõem que a fatia é cópia, e as com `99.` supõem que a máscara é vista.

### Pergunta
Para contar as leituras entre 0 e 10, incluindo os limites, um colega escreveu `np.count_nonzero((x >= 0) | (x <= 10))`. O que acontece?
- [ ] Levanta `ValueError: The truth value of an array with more than one element is ambiguous`
- [ ] Conta certo, porque os parênteses estão no lugar
- [x] Conta todas as leituras, porque todo número é maior ou igual a 0 ou menor ou igual a 10
- [ ] Conta só as leituras fora do intervalo
> `|` é "ou": basta uma das condições valer, e qualquer número satisfaz pelo menos uma delas, então a contagem é o tamanho do array. O correto é `&`. O `ValueError` aparece com `and`/`or`, não com `&`/`|`; e para contar as de fora seria preciso `(x < 0) | (x > 10)`.

### Pergunta
`pontos = np.array([80, 95, 80, 95, 70])`. Você quer as posições dos 3 maiores, do maior para o menor, com empate decidido pela menor posição, ou seja, `[1, 3, 0]`. Qual expressão dá isso?
- [ ] `np.argsort(pontos)[::-1][:3]`
- [ ] `np.argsort(pontos)[-3:]`
- [x] `np.argsort(-pontos, kind="stable")[:3]`
- [ ] `np.sort(pontos)[::-1][:3]`
> Ordenar `-pontos` de forma estável coloca os maiores primeiro e mantém os empatados na ordem original: `[1, 3, 0]`. Inverter o `argsort` crescente também inverte os empates (`[3, 1, 2]`); os três últimos do `argsort` crescente vêm do menor para o maior (`[2, 1, 3]`); e `np.sort` devolve valores (`[95, 95, 80]`), não posições.
