---
slug: n5-m1-01-vetores-matrizes-e-geometria
titulo: Vetores, matrizes e geometria dos dados
descricao: Dados como pontos em R^n, normas e distâncias, produto escalar e ângulo, projeções, matrizes como transformações e a matriz de projeto X.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
xp: 100
tempo_min: 40
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Representar um conjunto de dados como matriz X (n × d) e um vetor de alvos y
- Calcular normas, distâncias e similaridade de cosseno e interpretá-las geometricamente
- Explicar matrizes como transformações lineares e calcular projeções
---

## Passo 1 · Leitura · Uma tabela é uma nuvem de pontos

Uma loja fictícia guarda, para cada cliente, a idade, o número de compras no ano e o gasto médio por compra. Com 500 clientes, a tabela tem 500 linhas e 3 colunas. Em machine learning ela vira a **matriz de projeto** $X \in \mathbb{R}^{n \times d}$: cada linha é uma **amostra** (um cliente) e cada coluna é um **atributo**. O que se quer prever, como "vai comprar de novo no próximo mês", fica num vetor separado $y \in \mathbb{R}^{n}$, com um valor por linha de $X$.

Vista assim, cada linha é um ponto num espaço de $d$ dimensões, e a tabela inteira é uma nuvem de pontos. Quase todo algoritmo deste nível é uma pergunta geométrica sobre essa nuvem: quais pontos estão perto (vizinhos mais próximos, agrupamento), em que direção a nuvem se espalha mais (PCA), que reta ou plano separa duas regiões (classificadores lineares).

"Perto" precisa de uma medida. A **norma** mede o tamanho de um vetor, e a distância entre dois pontos é a norma da diferença:

$$
\lVert v \rVert_2 = \sqrt{\sum_{j=1}^{d} v_j^2} \qquad \lVert v \rVert_1 = \sum_{j=1}^{d} |v_j| \qquad d(a, b) = \lVert a - b \rVert
$$

A norma L2 é a distância euclidiana, a da régua. A L1 soma os deslocamentos em cada eixo, como andar por quarteirões; ela pesa menos um único atributo muito diferente, porque não eleva ao quadrado.

```python
X = np.array([[25, 4, 80.0], [41, 12, 35.0], [33, 7, 60.0]])   # (n, d) = (3, 3)
np.linalg.norm(X[0] - X[1])             # distância entre os clientes 0 e 1
np.linalg.norm(X - X[0], axis=1)        # distância do cliente 0 a todos: forma (3,)
np.linalg.norm(X - X[0], ord=1, axis=1) # o mesmo, em L1
```

O `axis=1` é o que faz a norma ser calculada **por linha**. Sem ele, `np.linalg.norm(X - X[0])` trata a matriz inteira como um vetor só e devolve um único número, sem erro nenhum. Repare também que as colunas estão em escalas muito diferentes: uma diferença de 45 no gasto pesa mais que uma de 8 compras. A padronização do Nível 4 volta no módulo 2 justamente por isso.

## Passo 2 · Previsão · Formas de X @ w

O programa multiplica uma matriz de projeto pequena por um vetor de pesos de duas formas diferentes e mede normas. Leia sem executar e digite o que ele imprime.

### Código
```python
import numpy as np

X = np.arange(6.0).reshape(3, 2)
w = np.array([1.0, -1.0])
print((X @ w).shape)
print((X @ w.reshape(2, 1)).shape)
print((X.T @ X).shape)
print((X @ w).tolist())
print(round(float(np.linalg.norm(X)), 4))
print(np.linalg.norm(X, axis=1).round(3).tolist())
y = np.zeros(3)
print((y - X @ w.reshape(2, 1)).shape)
```

### Dicas
1. `X` é `[[0, 1], [2, 3], [4, 5]]`. Uma matriz `(3, 2)` vezes um vetor `(2,)` dá um vetor; vezes uma coluna `(2, 1)` dá uma coluna.
2. Sem `axis`, a norma soma os quadrados de todos os seis números: $0 + 1 + 4 + 9 + 16 + 25$.
3. Na última linha, um vetor `(3,)` menos uma coluna `(3, 1)` passa pelo broadcasting do Nível 4: os dois se esticam.

### Saída esperada
```text
(3,)
(3, 1)
(2, 2)
[-1.0, -1.0, -1.0]
7.4162
[1.0, 3.606, 6.403]
(3, 3)
```

## Passo 3 · Exercício · Distâncias de um ponto a todos
modo: lacunas

O vizinho mais próximo de um cliente novo começa por uma conta: a distância dele a cada linha de `X`. Complete as lacunas (`___`) para fazer essa conta sem laço.

### Instruções
1. `distancias_a_todos(X, x, ordem=2)` recebe a matriz `X` de forma `(n, d)` e um ponto `x` de forma `(d,)`.
2. Devolve um array de forma `(n,)` com a distância de `x` a cada linha de `X`.
3. Com `ordem=2` a distância é a euclidiana (L2); com `ordem=1`, a de Manhattan (L1).

### Código inicial
```python
import numpy as np


def distancias_a_todos(X, x, ordem=2):
    X = np.asarray(X, dtype=float)
    x = np.asarray(x, dtype=float)
    return np.linalg.norm(___, ord=___, axis=___)
```

### Solução
```python
import numpy as np


def distancias_a_todos(X, x, ordem=2):
    X = np.asarray(X, dtype=float)
    x = np.asarray(x, dtype=float)
    return np.linalg.norm(X - x, ord=ordem, axis=1)
```

### Dicas
1. A distância é a norma da **diferença**; o broadcasting subtrai `x`, de forma `(d,)`, de cada linha de `X`.
2. A ordem da norma é um parâmetro da função: não fixe um número.
3. O resultado tem um valor por linha: o eixo que some é o das colunas.

### Verificação
```json
[
  { "id": "l2-origem", "checkpoint": 2, "kind": "expr", "expr": "distancias_a_todos([[0, 0], [3, 4], [6, 8]], [0, 0]).tolist()",
    "expected": [0.0, 5.0, 10.0], "tolerance": 1e-9, "name": "Distâncias de (0, 0) a (0, 0), (3, 4) e (6, 8)" },
  { "id": "l2-ponto-do-meio", "checkpoint": 2, "kind": "expr", "expr": "distancias_a_todos([[0, 0], [3, 4], [6, 8]], [3, 4]).tolist()",
    "expected": [5.0, 0.0, 5.0], "tolerance": 1e-9, "name": "Distâncias de (3, 4) aos mesmos três pontos",
    "hint": "A distância é a norma de cada linha menos o ponto, e não a norma de cada linha." },
  { "id": "l1", "checkpoint": 3, "kind": "expr", "expr": "distancias_a_todos([[0, 0], [3, 4], [1, -2]], [1, 1], ordem=1).tolist()",
    "expected": [2.0, 5.0, 3.0], "tolerance": 1e-9, "name": "Com ordem=1, soma das diferenças absolutas",
    "hint": "Use a ordem recebida na norma." },
  { "id": "l2-tres-coordenadas", "checkpoint": 2, "kind": "expr", "expr": "distancias_a_todos([[1, 2, 2], [0, 0, 0]], [0, 0, 0]).tolist()",
    "expected": [3.0, 0.0], "tolerance": 1e-9, "name": "Pontos com três coordenadas" },
  { "id": "uma-linha", "checkpoint": 2, "kind": "expr", "expr": "distancias_a_todos([[2.5, -1.0]], [2.5, -1.0]).tolist()",
    "expected": [0.0], "tolerance": 1e-9, "name": "Uma linha igual ao ponto dá [0.0]" },
  { "id": "forma", "checkpoint": 2, "kind": "expr",
    "setup": "import numpy as np\nrng = np.random.default_rng(1)\nX = rng.normal(size=(200, 3))\nx = rng.normal(size=3)",
    "expr": "list(distancias_a_todos(X, x).shape)", "expected": [200], "name": "Com 200 linhas e 3 colunas, o resultado tem forma (200,)",
    "hint": "Um valor por linha: o eixo que some é o das colunas." },
  { "id": "confere-a-conta", "checkpoint": 2, "kind": "expr",
    "setup": "import numpy as np\nrng = np.random.default_rng(2)\nX = rng.normal(size=(50, 4))\nx = rng.normal(size=4)\nref = np.sqrt(((X - x) ** 2).sum(axis=1))",
    "expr": "bool(np.allclose(distancias_a_todos(X, x), ref))", "expected": true,
    "name": "Em 50 pontos sorteados, bate com a raiz da soma dos quadrados das diferenças" },
  { "id": "l1-sorteado", "checkpoint": 3, "kind": "expr",
    "setup": "import numpy as np\nrng = np.random.default_rng(3)\nX = rng.normal(size=(40, 5))\nx = rng.normal(size=5)\nref = np.abs(X - x).sum(axis=1)",
    "expr": "bool(np.allclose(distancias_a_todos(X, x, ordem=1), ref))", "expected": true,
    "name": "Em 40 pontos sorteados, ordem=1 bate com a soma das diferenças absolutas" },
  { "id": "tipo", "checkpoint": 2, "kind": "expr", "expr": "distancias_a_todos([[1, 1], [2, 2]], [0, 0])", "type": "ndarray",
    "name": "Devolve um array do numpy" }
]
```

### Soluções erradas
```python name="norma da linha, sem subtrair o ponto"
import numpy as np


def distancias_a_todos(X, x, ordem=2):
    X = np.asarray(X, dtype=float)
    x = np.asarray(x, dtype=float)
    return np.linalg.norm(X, ord=ordem, axis=1)
```
```python name="eixo das linhas"
import numpy as np


def distancias_a_todos(X, x, ordem=2):
    X = np.asarray(X, dtype=float)
    x = np.asarray(x, dtype=float)
    return np.linalg.norm(X - x, ord=ordem, axis=0)
```
```python name="norma sem eixo"
import numpy as np


def distancias_a_todos(X, x, ordem=2):
    X = np.asarray(X, dtype=float)
    x = np.asarray(x, dtype=float)
    return np.linalg.norm(X - x, ord=ordem, axis=None)
```
```python name="ignora a ordem (sempre L2)"
import numpy as np


def distancias_a_todos(X, x, ordem=2):
    X = np.asarray(X, dtype=float)
    x = np.asarray(x, dtype=float)
    return np.linalg.norm(X - x, ord=2, axis=1)
```
```python name="ordem fixa em 1"
import numpy as np


def distancias_a_todos(X, x, ordem=2):
    X = np.asarray(X, dtype=float)
    x = np.asarray(x, dtype=float)
    return np.linalg.norm(X - x, ord=1, axis=1)
```
```python name="ponto como coluna"
import numpy as np


def distancias_a_todos(X, x, ordem=2):
    X = np.asarray(X, dtype=float)
    x = np.asarray(x, dtype=float)
    return np.linalg.norm(X - x[:, None], ord=ordem, axis=1)
```

## Passo 4 · Leitura · Produto escalar, cosseno e projeção

A distância não é a única forma de comparar dois vetores. Pense em duas mensagens fictícias representadas pela contagem de palavras: uma com `[2, 1, 0]` (duas vezes "entrega", uma vez "atraso") e outra com o mesmo texto repetido, `[4, 2, 0]`. A distância entre elas não é zero, mas o assunto é o mesmo. O que elas têm em comum é a **direção**.

O **produto escalar** $u \cdot v = \sum_j u_j v_j$ (em numpy, `u @ v`) mede o quanto dois vetores apontam para o mesmo lado, e se relaciona com o ângulo $\theta$ entre eles:

$$
u \cdot v = \lVert u \rVert\, \lVert v \rVert \cos\theta \qquad\Longrightarrow\qquad \cos\theta = \frac{u \cdot v}{\lVert u \rVert\, \lVert v \rVert}
$$

A **similaridade de cosseno** vale 1 para vetores na mesma direção, 0 para perpendiculares e −1 para opostos, qualquer que seja o tamanho deles. As duas mensagens acima têm cosseno 1. Para comparar todas as linhas de $X$ entre si de uma vez, divida cada linha pela sua norma (`keepdims=True` deixa as normas com forma `(n, 1)`) e multiplique a matriz normalizada pela transposta dela: a posição `(i, j)` de `U @ U.T` é o cosseno entre as linhas `i` e `j`. Uma linha só de zeros não tem direção: a divisão dá `nan` sem erro no numpy, e o costume é definir o cosseno dela como 0.

A **projeção** de $v$ sobre $u$ é a "sombra" de $v$ na reta de $u$:

$$
\operatorname{proj}_u v = \frac{v \cdot u}{u \cdot u}\, u
$$

O resto, $v - \operatorname{proj}_u v$, é perpendicular a $u$: o produto escalar dele com $u$ dá zero. O denominador é $u \cdot u = \lVert u \rVert^2$, o quadrado da norma; dividir só pela norma dá a resposta certa apenas quando $\lVert u \rVert = 1$, e por isso o erro passa despercebido em exemplos com vetores unitários. Projetar sobre o vetor nulo não faz sentido, e a função deve recusar.

```python
u = np.array([0.0, 3.0]); v = np.array([2.0, 2.0])
(v @ u) / (u @ u) * u        # array([0., 2.]): a componente de v na direção de u
```

Essas duas ideias voltam no nível: o cosseno compara textos no módulo 3, e o PCA do módulo 6 projeta a nuvem inteira nas direções em que ela mais se espalha.

## Passo 5 · Exercício · Similaridade e projeção

Escreva a matriz de similaridades entre todas as linhas e a projeção de um vetor sobre outro.

### Instruções
1. `cosseno_par_a_par(X)` devolve a matriz `(n, n)` em que a posição `(i, j)` é o cosseno entre as linhas `i` e `j` de `X`.
2. Uma linha só de zeros tem cosseno 0 com todas as linhas, inclusive com ela mesma (nada de `nan`).
3. `projetar(v, u)` devolve, como array, a projeção de `v` sobre a reta de `u`.
4. Se `u` é o vetor nulo, `projetar` levanta `ValueError`.

### Código inicial
```python
import numpy as np


def cosseno_par_a_par(X):
    pass


def projetar(v, u):
    pass
```

### Solução
```python
import numpy as np


def cosseno_par_a_par(X):
    X = np.asarray(X, dtype=float)
    normas = np.linalg.norm(X, axis=1, keepdims=True)
    normas = np.where(normas == 0, 1.0, normas)
    U = X / normas
    return U @ U.T


def projetar(v, u):
    v = np.asarray(v, dtype=float)
    u = np.asarray(u, dtype=float)
    uu = u @ u
    if uu == 0:
        raise ValueError("não dá para projetar sobre o vetor nulo")
    return (v @ u) / uu * u
```

### Dicas
1. Normalize cada linha pela sua norma (forma `(n, 1)`); depois, um único produto de matrizes dá todos os cossenos.
2. Uma linha nula normalizada continua nula se você trocar a norma zero por 1 antes de dividir.
3. Na projeção, o denominador é o produto escalar de `u` com ele mesmo.

### Verificação
```json
[
  { "id": "cos-tres", "checkpoint": 1, "kind": "expr", "expr": "cosseno_par_a_par([[1, 0], [0, 2], [1, 1]]).tolist()",
    "expected": [[1.0, 0.0, 0.7071067811865475], [0.0, 1.0, 0.7071067811865475], [0.7071067811865475, 0.7071067811865475, 1.0]],
    "tolerance": 1e-9, "name": "Cossenos entre (1, 0), (0, 2) e (1, 1)",
    "hint": "O cosseno não depende do tamanho: (0, 2) e (0, 1) dão o mesmo resultado." },
  { "id": "cos-opostos", "checkpoint": 1, "kind": "expr", "expr": "cosseno_par_a_par([[1, 2], [-2, -4]]).tolist()",
    "expected": [[1.0, -1.0], [-1.0, 1.0]], "tolerance": 1e-9, "name": "Vetores opostos têm cosseno -1" },
  { "id": "cos-forma", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np\nM = np.random.default_rng(4).normal(size=(6, 3))",
    "expr": "list(cosseno_par_a_par(M).shape)", "expected": [6, 6], "name": "Com 6 linhas e 3 colunas, a matriz é 6 × 6",
    "hint": "Uma posição por par de linhas, não por par de colunas." },
  { "id": "cos-propriedades", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np\nM = np.random.default_rng(5).normal(size=(30, 4))\nC = cosseno_par_a_par(M)",
    "expr": "bool(np.allclose(C, C.T) and np.allclose(np.diag(C), 1.0) and np.all(np.abs(C) <= 1 + 1e-12))", "expected": true,
    "name": "Em 30 linhas sorteadas: simétrica, diagonal 1 e valores entre -1 e 1",
    "hint": "Divida cada linha pela norma dela antes do produto." },
  { "id": "cos-linha-nula", "checkpoint": 2, "kind": "expr", "expr": "cosseno_par_a_par([[0, 0], [3, 4]]).tolist()",
    "expected": [[0.0, 0.0], [0.0, 1.0]], "tolerance": 1e-9, "name": "Uma linha nula tem cosseno 0 com todas",
    "hint": "No numpy, 0 / 0 dá nan sem erro: trate a norma zero antes de dividir." },
  { "id": "proj-eixo", "checkpoint": 3, "kind": "expr", "expr": "projetar([3, 4], [1, 0]).tolist()",
    "expected": [3.0, 0.0], "tolerance": 1e-9, "name": "Projeção de (3, 4) sobre o eixo x" },
  { "id": "proj-nao-unitario", "checkpoint": 3, "kind": "expr", "expr": "projetar([2, 2], [0, 3]).tolist()",
    "expected": [0.0, 2.0], "tolerance": 1e-9, "name": "Projeção de (2, 2) sobre (0, 3), um vetor de norma 3",
    "hint": "O denominador é o quadrado da norma de u." },
  { "id": "proj-tres", "checkpoint": 3, "kind": "expr", "expr": "projetar([1, 2, 3], [1, 1, 1]).tolist()",
    "expected": [2.0, 2.0, 2.0], "tolerance": 1e-9, "name": "Projeção de (1, 2, 3) sobre (1, 1, 1)",
    "hint": "O resultado está na reta de u, não na de v." },
  { "id": "proj-ortogonal", "checkpoint": 3, "kind": "expr", "expr": "projetar([1, -1], [1, 1]).tolist()",
    "expected": [0.0, 0.0], "tolerance": 1e-9, "name": "Vetores perpendiculares: a projeção é o vetor nulo" },
  { "id": "proj-resto-perpendicular", "checkpoint": 3, "kind": "expr",
    "setup": "import numpy as np\nrng = np.random.default_rng(6)\nv = rng.normal(size=5)\nu = rng.normal(size=5) * 3",
    "expr": "bool(abs(float((v - projetar(v, u)) @ u)) < 1e-9)", "expected": true,
    "name": "Em vetores sorteados, o resto v - proj é perpendicular a u" },
  { "id": "proj-nulo", "checkpoint": 4, "kind": "expr", "expr": "projetar([1, 2], [0, 0])", "raises": "ValueError",
    "name": "Projetar sobre o vetor nulo levanta ValueError", "hint": "Confira u · u antes de dividir." }
]
```

### Soluções erradas
```python name="linha nula vira nan"
import numpy as np


def cosseno_par_a_par(X):
    X = np.asarray(X, dtype=float)
    U = X / np.linalg.norm(X, axis=1, keepdims=True)
    return U @ U.T


def projetar(v, u):
    v = np.asarray(v, dtype=float)
    u = np.asarray(u, dtype=float)
    uu = u @ u
    if uu == 0:
        raise ValueError("não dá para projetar sobre o vetor nulo")
    return (v @ u) / uu * u
```
```python name="normas sem keepdims"
import numpy as np


def cosseno_par_a_par(X):
    X = np.asarray(X, dtype=float)
    normas = np.linalg.norm(X, axis=1)
    normas = np.where(normas == 0, 1.0, normas)
    U = X / normas
    return U @ U.T


def projetar(v, u):
    v = np.asarray(v, dtype=float)
    u = np.asarray(u, dtype=float)
    uu = u @ u
    if uu == 0:
        raise ValueError("não dá para projetar sobre o vetor nulo")
    return (v @ u) / uu * u
```
```python name="compara colunas (U.T @ U)"
import numpy as np


def cosseno_par_a_par(X):
    X = np.asarray(X, dtype=float)
    normas = np.linalg.norm(X, axis=1, keepdims=True)
    normas = np.where(normas == 0, 1.0, normas)
    U = X / normas
    return U.T @ U


def projetar(v, u):
    v = np.asarray(v, dtype=float)
    u = np.asarray(u, dtype=float)
    uu = u @ u
    if uu == 0:
        raise ValueError("não dá para projetar sobre o vetor nulo")
    return (v @ u) / uu * u
```
```python name="produto escalar sem normalizar"
import numpy as np


def cosseno_par_a_par(X):
    X = np.asarray(X, dtype=float)
    return X @ X.T


def projetar(v, u):
    v = np.asarray(v, dtype=float)
    u = np.asarray(u, dtype=float)
    uu = u @ u
    if uu == 0:
        raise ValueError("não dá para projetar sobre o vetor nulo")
    return (v @ u) / uu * u
```
```python name="divide pela norma, não pelo quadrado"
import numpy as np


def cosseno_par_a_par(X):
    X = np.asarray(X, dtype=float)
    normas = np.linalg.norm(X, axis=1, keepdims=True)
    normas = np.where(normas == 0, 1.0, normas)
    U = X / normas
    return U @ U.T


def projetar(v, u):
    v = np.asarray(v, dtype=float)
    u = np.asarray(u, dtype=float)
    norma = np.linalg.norm(u)
    if norma == 0:
        raise ValueError("não dá para projetar sobre o vetor nulo")
    return (v @ u) / norma * u
```
```python name="projeta u sobre v"
import numpy as np


def cosseno_par_a_par(X):
    X = np.asarray(X, dtype=float)
    normas = np.linalg.norm(X, axis=1, keepdims=True)
    normas = np.where(normas == 0, 1.0, normas)
    U = X / normas
    return U @ U.T


def projetar(v, u):
    v = np.asarray(v, dtype=float)
    u = np.asarray(u, dtype=float)
    if u @ u == 0:
        raise ValueError("não dá para projetar sobre o vetor nulo")
    return (u @ v) / (v @ v) * v
```
```python name="devolve só o coeficiente"
import numpy as np


def cosseno_par_a_par(X):
    X = np.asarray(X, dtype=float)
    normas = np.linalg.norm(X, axis=1, keepdims=True)
    normas = np.where(normas == 0, 1.0, normas)
    U = X / normas
    return U @ U.T


def projetar(v, u):
    v = np.asarray(v, dtype=float)
    u = np.asarray(u, dtype=float)
    uu = u @ u
    if uu == 0:
        raise ValueError("não dá para projetar sobre o vetor nulo")
    return (v @ u) / uu
```
```python name="não recusa o vetor nulo"
import numpy as np


def cosseno_par_a_par(X):
    X = np.asarray(X, dtype=float)
    normas = np.linalg.norm(X, axis=1, keepdims=True)
    normas = np.where(normas == 0, 1.0, normas)
    U = X / normas
    return U @ U.T


def projetar(v, u):
    v = np.asarray(v, dtype=float)
    u = np.asarray(u, dtype=float)
    return (v @ u) / (u @ u) * u
```

## Passo 6 · Leitura · Matrizes como transformações e posto

Uma matriz $M$ de forma $2 \times 2$ é uma regra que leva cada ponto do plano a outro ponto: $p \mapsto M p$. Duas regras aparecem o tempo todo:

$$
R_\theta = \begin{pmatrix} \cos\theta & -\sin\theta \\ \sin\theta & \cos\theta \end{pmatrix} \qquad S = \begin{pmatrix} s_x & 0 \\ 0 & s_y \end{pmatrix}
$$

$R_\theta$ gira o plano de um ângulo $\theta$ em torno da origem, sem mudar distâncias; $S$ estica o eixo $x$ por $s_x$ e o eixo $y$ por $s_y$. Com $\theta = 90°$, $R$ é `[[0, -1], [1, 0]]`, e o ponto $(1, 0)$ vai para $(0, 1)$. Aplicar primeiro $A$ e depois $B$ é o mesmo que aplicar a matriz $BA$ de uma vez. A padronização das colunas, que você fez no Nível 4, é uma transformação desse tipo (uma escala por coluna, depois de um deslocamento).

Em numpy, os pontos ficam nas **linhas** de uma matriz `P` de forma `(n, 2)`, e a fórmula $Mp$ vale para uma coluna. Para transformar todas as linhas de uma vez, transponha: cada linha de `P @ M.T` é $M p_i$. Escrever `M @ P` com `P` de forma `(5, 2)` dá `ValueError: matmul: Input operand 1 has a mismatch in its core dimension 0, with gufunc signature (n?,k),(k,m?)->(n?,m?) (size 5 is different from 2)`. Escrever `P @ M`, sem transpor, roda sem erro e aplica $M^\top$: numa escala dá o mesmo resultado, e numa rotação gira para o lado contrário. A matriz também pode ser retangular: um $M$ de forma $3 \times 2$ leva pontos do plano para o espaço de três dimensões.

O mesmo olhar vale para $X$. Se uma coluna é combinação das outras (o gasto total é compras × gasto médio arredondado, ou a mesma medida em reais e em milhares de reais), a matriz não acrescenta informação com ela, e várias contas do próximo módulo deixam de ter solução única. O **posto** de $X$, `np.linalg.matrix_rank(X)`, conta quantas colunas são independentes; há colinearidade quando ele é menor que o número de colunas. Conferir pelo determinante não serve: com números de ponto flutuante ele quase nunca dá zero exato.

```python
X = np.array([[1.0, 2.0, 3.0], [2.0, 0.0, 2.0], [0.0, 1.0, 1.0], [4.0, 1.0, 5.0]])
np.linalg.matrix_rank(X)       # 2: a terceira coluna é a soma das duas primeiras
```

## Passo 7 · Exercício · Transformar e achar colinearidade

Escreva a transformação de muitos pontos de uma vez e o teste de colinearidade pelo posto.

### Instruções
1. `aplicar_transformacao(pontos, M)` recebe `n` pontos nas linhas de um array `(n, k)` e uma matriz `M` de forma `(m, k)`, e devolve o array `(n, m)` cuja linha `i` é $M p_i$.
2. `atributos_colineares(X)` devolve `True` quando alguma coluna de `X` é combinação linear das outras (o posto de `X` é menor que o número de colunas) e `False` caso contrário.
3. `atributos_colineares` devolve um `bool` do Python.

### Código inicial
```python
import numpy as np


def aplicar_transformacao(pontos, M):
    pass


def atributos_colineares(X):
    pass
```

### Solução
```python
import numpy as np


def aplicar_transformacao(pontos, M):
    pontos = np.asarray(pontos, dtype=float)
    M = np.asarray(M, dtype=float)
    return pontos @ M.T


def atributos_colineares(X):
    X = np.asarray(X, dtype=float)
    return bool(np.linalg.matrix_rank(X) < X.shape[1])
```

### Dicas
1. A fórmula $Mp$ é para um ponto em coluna; com os pontos nas linhas, transponha a matriz.
2. O posto se compara com o número de **colunas** (atributos), não com o de linhas.
3. `np.linalg.matrix_rank(X) < ...` devolve um booleano do numpy; converta.

### Verificação
```json
[
  { "id": "rotacao", "checkpoint": 1, "kind": "expr", "expr": "aplicar_transformacao([[1, 0], [0, 1], [2, 3]], [[0, -1], [1, 0]]).tolist()",
    "expected": [[0.0, 1.0], [-1.0, 0.0], [-3.0, 2.0]], "tolerance": 1e-9,
    "name": "Rotação de 90° leva (1, 0) a (0, 1)", "hint": "Cada linha do resultado é M aplicada a um ponto; P @ M gira para o lado contrário." },
  { "id": "escala", "checkpoint": 1, "kind": "expr", "expr": "aplicar_transformacao([[1, 1], [4, 2]], [[2, 0], [0, 0.5]]).tolist()",
    "expected": [[2.0, 0.5], [8.0, 1.0]], "tolerance": 1e-9, "name": "Escala: x dobra e y cai pela metade" },
  { "id": "retangular", "checkpoint": 1, "kind": "expr", "expr": "aplicar_transformacao([[1, 2], [0, -1]], [[1, 0], [0, 1], [1, 1]]).tolist()",
    "expected": [[1.0, 2.0, 3.0], [0.0, -1.0, -1.0]], "tolerance": 1e-9,
    "name": "Uma M de forma 3 × 2 leva pontos do plano para três dimensões" },
  { "id": "forma", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np\nP = np.random.default_rng(7).normal(size=(100, 2))",
    "expr": "list(aplicar_transformacao(P, [[0.5, 1.0], [-1.0, 2.0]]).shape)", "expected": [100, 2],
    "name": "100 pontos transformados continuam 100 linhas", "hint": "Os pontos estão nas linhas." },
  { "id": "composicao", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np\nrng = np.random.default_rng(8)\nP = rng.normal(size=(20, 2))\nA = rng.normal(size=(2, 2))\nB = rng.normal(size=(2, 2))",
    "expr": "bool(np.allclose(aplicar_transformacao(aplicar_transformacao(P, A), B), aplicar_transformacao(P, B @ A)))", "expected": true,
    "name": "Aplicar A e depois B é o mesmo que aplicar B @ A" },
  { "id": "independentes", "checkpoint": 2, "kind": "expr",
    "setup": "import numpy as np\nX = np.random.default_rng(9).normal(size=(20, 3))",
    "expr": "atributos_colineares(X)", "expected": false, "name": "20 linhas com 3 colunas sorteadas: sem colinearidade",
    "hint": "Compare o posto com o número de colunas." },
  { "id": "combinacao", "checkpoint": 2, "kind": "expr",
    "setup": "import numpy as np\nrng = np.random.default_rng(10)\nA = rng.normal(size=(20, 2))\nX = np.column_stack([A, 2 * A[:, 0] - A[:, 1]])",
    "expr": "atributos_colineares(X)", "expected": true, "name": "Terceira coluna = 2 × primeira − segunda",
    "hint": "Nenhum par de colunas é proporcional aqui; só o posto revela a dependência." },
  { "id": "duplicada", "checkpoint": 2, "kind": "expr", "expr": "atributos_colineares([[1, 1, 5], [2, 2, 3], [3, 3, 0], [4, 4, 1]])",
    "expected": true, "name": "Duas colunas iguais" },
  { "id": "soma-das-duas", "checkpoint": 2, "kind": "expr", "expr": "atributos_colineares([[1, 2, 3], [2, 0, 2], [0, 1, 1], [4, 1, 5]])",
    "expected": true, "name": "A terceira coluna é a soma das duas primeiras" },
  { "id": "uma-coluna", "checkpoint": 2, "kind": "expr", "expr": "atributos_colineares([[1], [2], [3]])",
    "expected": false, "name": "Uma única coluna não nula não é colinear" },
  { "id": "tipo", "checkpoint": 3, "kind": "expr", "expr": "atributos_colineares([[1, 0], [0, 1], [1, 1]])", "expected": false, "type": "bool",
    "name": "Devolve um bool do Python", "hint": "A comparação com o resultado do numpy dá numpy.bool; use bool(...)." }
]
```

### Soluções erradas
```python name="M @ pontos"
import numpy as np


def aplicar_transformacao(pontos, M):
    pontos = np.asarray(pontos, dtype=float)
    M = np.asarray(M, dtype=float)
    return M @ pontos


def atributos_colineares(X):
    X = np.asarray(X, dtype=float)
    return bool(np.linalg.matrix_rank(X) < X.shape[1])
```
```python name="pontos @ M, sem transpor"
import numpy as np


def aplicar_transformacao(pontos, M):
    pontos = np.asarray(pontos, dtype=float)
    M = np.asarray(M, dtype=float)
    return pontos @ M


def atributos_colineares(X):
    X = np.asarray(X, dtype=float)
    return bool(np.linalg.matrix_rank(X) < X.shape[1])
```
```python name="posto comparado com as linhas"
import numpy as np


def aplicar_transformacao(pontos, M):
    pontos = np.asarray(pontos, dtype=float)
    M = np.asarray(M, dtype=float)
    return pontos @ M.T


def atributos_colineares(X):
    X = np.asarray(X, dtype=float)
    return bool(np.linalg.matrix_rank(X) < X.shape[0])
```
```python name="só procura pares proporcionais"
import numpy as np


def aplicar_transformacao(pontos, M):
    pontos = np.asarray(pontos, dtype=float)
    M = np.asarray(M, dtype=float)
    return pontos @ M.T


def atributos_colineares(X):
    X = np.asarray(X, dtype=float)
    d = X.shape[1]
    if d < 2:
        return False
    r = np.corrcoef(X.T)[np.triu_indices(d, 1)]
    return bool(np.any(np.abs(r) > 0.999999))
```
```python name="determinante igual a zero"
import numpy as np


def aplicar_transformacao(pontos, M):
    pontos = np.asarray(pontos, dtype=float)
    M = np.asarray(M, dtype=float)
    return pontos @ M.T


def atributos_colineares(X):
    X = np.asarray(X, dtype=float)
    return bool(np.linalg.det(X.T @ X) == 0)
```
```python name="devolve numpy.bool"
import numpy as np


def aplicar_transformacao(pontos, M):
    pontos = np.asarray(pontos, dtype=float)
    M = np.asarray(M, dtype=float)
    return pontos @ M.T


def atributos_colineares(X):
    X = np.asarray(X, dtype=float)
    return np.linalg.matrix_rank(X) < X.shape[1]
```

## Passo 8 · Quiz · Geometria dos dados

### Pergunta
Um sistema fictício recomenda clientes parecidos pela distância euclidiana entre linhas com duas colunas: idade (de 18 a 70) e renda mensal em reais (de 1 500 a 30 000). Dois clientes de 20 e 65 anos com a mesma renda aparecem como "quase idênticos". Por quê?
- [ ] A distância euclidiana ignora colunas inteiras; a de Manhattan resolveria
- [x] A renda varia em milhares e domina a soma dos quadrados: 45 anos de diferença pesam menos que R\$ 100 de diferença na renda
- [ ] A idade deveria ser elevada ao quadrado antes da distância
- [ ] O cosseno entre os dois clientes é 1, e a distância herda isso
> Na soma $\sum_j (a_j - b_j)^2$ cada coluna entra na sua escala: $45^2 = 2\,025$, enquanto R\$ 100 de renda já dão $10\,000$. É por isso que se padronizam as colunas antes de medir distâncias. A L1 tem o mesmo problema de escala; elevar a idade ao quadrado não resolve; e o cosseno é outra medida, que a distância não "herda".

### Pergunta
Duas mensagens fictícias viram contagens de palavras: `a = [3, 0, 1]` e `b = [6, 0, 2]`, com `b` sendo `a` repetida duas vezes. O que se espera da distância euclidiana e do cosseno entre elas?
- [ ] Distância 0 e cosseno 1
- [x] Distância $\sqrt{10} \approx 3{,}16$ e cosseno 1: mesma direção, tamanhos diferentes
- [ ] Distância $\sqrt{10}$ e cosseno 0,5, porque uma é o dobro da outra
- [ ] Distância 0 e cosseno 0
> $b - a = (3, 0, 1)$, de norma $\sqrt{10}$: a distância enxerga o tamanho. Como $b = 2a$, as duas apontam para o mesmo lado e o cosseno é exatamente 1. É por isso que o cosseno compara assunto, e não volume de texto.

### Pergunta
Com `X` de forma `(100, 3)`, `y` de forma `(100,)` e pesos `w = np.zeros((3, 1))`, um colega calcula `erros = y - X @ w` e `np.mean(erros ** 2)`. O código roda. O que aconteceu?
- [ ] Nada de errado: `(100, 1)` e `(100,)` são a mesma forma para o numpy
- [ ] O numpy levanta `ValueError` na subtração, e o colega não viu
- [x] `X @ w` tem forma `(100, 1)`; menos `y`, de forma `(100,)`, o broadcasting gera uma matriz `(100, 100)`, e a média sai de 10 000 diferenças sem sentido
- [ ] `X @ w` tem forma `(3, 1)`, e a média fica com só 3 erros
> Uma coluna `(100, 1)` contra um vetor `(100,)` se estica nas duas direções: o resultado é `(100, 100)`, sem erro nenhum. Os pesos devem ter forma `(3,)` (aí `X @ w` é `(100,)`), ou `y` deve virar coluna. A forma de `X @ w` é `(100, 1)`, uma linha por amostra, não `(3, 1)`.
