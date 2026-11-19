---
slug: n4-m1-04-algebra-linear-basica
titulo: Álgebra linear básica com numpy
descricao: Produto escalar e matricial (@), transposta, inversa e solução de sistemas (np.linalg), normas e a regressão por mínimos quadrados como aperitivo.
dificuldade: intermediario
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
xp: 120
tempo_min: 50
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Calcular produto escalar, produto matricial e transposta e distinguir * de @
- Resolver sistemas lineares com np.linalg.solve e explicar por que não inverter a matriz
- Ajustar uma reta por mínimos quadrados com a equação normal
---

## Passo 1 · Leitura · Produto escalar, @ e *

Uma loja fictícia vendeu `q = [3, 1, 2]` unidades de três produtos, com preços `p = [10.0, 25.0, 4.5]`. A receita é $3 \cdot 10 + 1 \cdot 25 + 2 \cdot 4{,}5 = 64$: multiplicar posição a posição e somar. Essa conta é o **produto escalar**:

$$
a \cdot b = \sum_{i=1}^{n} a_i b_i
$$

No numpy, `*` multiplica elemento a elemento e devolve um array; `@` faz o produto escalar, com a soma incluída:

```python
q = np.array([3, 1, 2])
p = np.array([10.0, 25.0, 4.5])
q * p           # [30. 25.  9.]: elemento a elemento
q @ p           # 64.0: produto escalar
(q * p).sum()   # 64.0: o mesmo, em dois passos
```

Do produto escalar saem o comprimento (a **norma**) de um vetor e o **cosseno** do ângulo entre dois vetores:

$$
\lVert a \rVert = \sqrt{a \cdot a}, \qquad \cos\theta = \frac{a \cdot b}{\lVert a \rVert \, \lVert b \rVert}
$$

O cosseno mede se dois vetores apontam para o mesmo lado, sem olhar o tamanho: vale 1 na mesma direção, 0 quando são perpendiculares e -1 em sentidos opostos. É a medida de semelhança entre perfis de compra e entre textos que volta no Nível 5 e, com os *embeddings*, no Nível 7. Um vetor nulo não tem direção, e a fórmula divide por zero.

Com matrizes, `A @ B` é o **produto matricial**: o elemento `(i, j)` do resultado é o produto escalar da linha `i` de `A` com a coluna `j` de `B`. As formas precisam casar no meio, `(m, k) @ (k, n)` dá `(m, n)`; senão vem `ValueError: matmul: Input operand 1 has a mismatch in its core dimension 0, with gufunc signature (n?,k),(k,m?)->(n?,m?) (size 2 is different from 3)`. Já `A * B` multiplica posição a posição, com broadcasting. Com duas matrizes quadradas do mesmo tamanho, as duas contas rodam sem erro e dão resultados diferentes, e só o enunciado diz qual você queria.

`A.T` é a **transposta**: as linhas viram colunas. Um vetor 1D, de forma `(n,)`, não é linha nem coluna: em `A @ v` ele faz o papel de coluna e o resultado tem forma `(m,)`; `v @ v` dá um número. Quando você precisa de uma coluna de verdade, `v[:, np.newaxis]` tem forma `(n, 1)`, e `v[:, np.newaxis] @ v[np.newaxis, :]` dá uma matriz `(n, n)`.

## Passo 2 · Previsão · *, @ e formas

O programa compara `*` e `@` com uma matriz 2 × 2 e um vetor. Leia sem executar e digite exatamente o que ele imprime.

### Código
```python
import numpy as np

A = np.array([[1, 2], [3, 4]])
B = np.array([[0, 1], [1, 0]])
v = np.array([1, 2])

print((A * B).tolist())
print((A @ B).tolist())
print(v @ v)
print((A @ v).tolist(), (A @ v).shape)
print((A * v).tolist())
print((v[:, np.newaxis] @ v[np.newaxis, :]).shape)
```

### Dicas
1. `*` multiplica posição a posição; `B` tem zeros na diagonal.
2. Em `A @ B`, o elemento `(0, 0)` é a linha 0 de `A` vezes a coluna 0 de `B`, somados.
3. `A * v` usa broadcasting: o vetor vale para cada linha.

### Saída esperada
```text
[[0, 2], [3, 0]]
[[2, 1], [4, 3]]
5
[5, 11] (2,)
[[1, 4], [3, 8]]
(2, 2)
```

## Passo 3 · Exercício · Produto, norma e cosseno
modo: lacunas

Complete as lacunas (`___`) para que as três funções devolvam números `float` do Python.

### Instruções
1. `produto_escalar(a, b)` devolve o produto escalar de dois vetores, como `float`.
2. `norma(a)` devolve o comprimento do vetor, $\sqrt{a \cdot a}$, como `float`.
3. `cosseno(a, b)` devolve o cosseno do ângulo entre os vetores e levanta `ValueError` se **qualquer um** deles for nulo.

### Código inicial
```python
import numpy as np


def produto_escalar(a, b):
    a = np.asarray(a, dtype=float)
    b = np.asarray(b, dtype=float)
    return ___


def norma(a):
    a = np.asarray(a, dtype=float)
    return float(np.sqrt(___))


def cosseno(a, b):
    na = norma(a)
    nb = norma(b)
    if ___:
        raise ValueError("vetor nulo não tem direção")
    return produto_escalar(a, b) / ___
```

### Solução
```python
import numpy as np


def produto_escalar(a, b):
    a = np.asarray(a, dtype=float)
    b = np.asarray(b, dtype=float)
    return float(a @ b)


def norma(a):
    a = np.asarray(a, dtype=float)
    return float(np.sqrt(a @ a))


def cosseno(a, b):
    na = norma(a)
    nb = norma(b)
    if na == 0 or nb == 0:
        raise ValueError("vetor nulo não tem direção")
    return produto_escalar(a, b) / (na * nb)
```

### Dicas
1. `a @ b` devolve um `float` do numpy; o enunciado pede um `float` do Python.
2. A norma é a raiz da soma dos quadrados, não o quadrado da soma.
3. Na divisão final, sem parênteses o Python divide primeiro e multiplica depois.

### Verificação
```json
[
  { "id": "produto-receita", "checkpoint": 1, "kind": "call", "function": "produto_escalar", "args": [[3, 1, 2], [10.0, 25.0, 4.5]],
    "expected": 64.0, "type": "float", "tolerance": 1e-9, "name": "produto_escalar([3, 1, 2], [10.0, 25.0, 4.5]) é o float 64.0",
    "hint": "O resultado é um número só, do tipo float do Python." },
  { "id": "produto-um", "checkpoint": 1, "kind": "call", "function": "produto_escalar", "args": [[1.5], [2.0]],
    "expected": 3.0, "tolerance": 1e-9, "name": "produto_escalar([1.5], [2.0])" },
  { "id": "produto-perpendicular", "checkpoint": 1, "kind": "call", "function": "produto_escalar", "args": [[1, -1], [1, 1]],
    "expected": 0.0, "tolerance": 1e-9, "name": "Vetores perpendiculares têm produto escalar 0" },
  { "id": "norma-3-4", "checkpoint": 2, "kind": "call", "function": "norma", "args": [[3, 4]],
    "expected": 5.0, "type": "float", "tolerance": 1e-9, "name": "norma([3, 4]) é 5.0" },
  { "id": "norma-sinais", "checkpoint": 2, "kind": "call", "function": "norma", "args": [[1, -1]],
    "expected": 1.4142135623730951, "tolerance": 1e-9, "name": "norma([1, -1]) é a raiz de 2",
    "hint": "Os quadrados não se cancelam." },
  { "id": "norma-nula", "checkpoint": 2, "kind": "call", "function": "norma", "args": [[0, 0, 0]],
    "expected": 0.0, "tolerance": 1e-9, "name": "O vetor nulo tem norma 0" },
  { "id": "cos-mesma-direcao", "checkpoint": 3, "kind": "call", "function": "cosseno", "args": [[1, 2], [2, 4]],
    "expected": 1.0, "tolerance": 1e-9, "name": "cosseno([1, 2], [2, 4]) é 1", "hint": "Divida pelo produto das duas normas." },
  { "id": "cos-perpendicular", "checkpoint": 3, "kind": "call", "function": "cosseno", "args": [[1, 0], [0, 3]],
    "expected": 0.0, "tolerance": 1e-9, "name": "cosseno([1, 0], [0, 3]) é 0" },
  { "id": "cos-opostos", "checkpoint": 3, "kind": "call", "function": "cosseno", "args": [[1, 1], [-2, -2]],
    "expected": -1.0, "tolerance": 1e-9, "name": "cosseno([1, 1], [-2, -2]) é -1" },
  { "id": "cos-45", "checkpoint": 3, "kind": "call", "function": "cosseno", "args": [[1, 1], [1, 0]],
    "expected": 0.7071067811865476, "tolerance": 1e-9, "name": "cosseno([1, 1], [1, 0])" },
  { "id": "cos-um-nulo", "checkpoint": 3, "kind": "expr", "expr": "cosseno([0, 0], [1, 2])", "raises": "ValueError",
    "name": "Um vetor nulo levanta ValueError", "hint": "Basta um dos dois ser nulo." },
  { "id": "cos-dois-nulos", "checkpoint": 3, "kind": "expr", "expr": "cosseno([0, 0], [0, 0])", "raises": "ValueError",
    "name": "Dois vetores nulos levantam ValueError" }
]
```

### Soluções erradas
```python name="* no lugar de @"
import numpy as np


def produto_escalar(a, b):
    a = np.asarray(a, dtype=float)
    b = np.asarray(b, dtype=float)
    return float(a * b)


def norma(a):
    a = np.asarray(a, dtype=float)
    return float(np.sqrt(a @ a))


def cosseno(a, b):
    na = norma(a)
    nb = norma(b)
    if na == 0 or nb == 0:
        raise ValueError("vetor nulo não tem direção")
    return produto_escalar(a, b) / (na * nb)
```
```python name="float do numpy"
import numpy as np


def produto_escalar(a, b):
    a = np.asarray(a, dtype=float)
    b = np.asarray(b, dtype=float)
    return a @ b


def norma(a):
    a = np.asarray(a, dtype=float)
    return float(np.sqrt(a @ a))


def cosseno(a, b):
    na = norma(a)
    nb = norma(b)
    if na == 0 or nb == 0:
        raise ValueError("vetor nulo não tem direção")
    return produto_escalar(a, b) / (na * nb)
```
```python name="quadrado da soma"
import numpy as np


def produto_escalar(a, b):
    a = np.asarray(a, dtype=float)
    b = np.asarray(b, dtype=float)
    return float(a @ b)


def norma(a):
    a = np.asarray(a, dtype=float)
    return float(np.sqrt(a.sum() ** 2))


def cosseno(a, b):
    na = norma(a)
    nb = norma(b)
    if na == 0 or nb == 0:
        raise ValueError("vetor nulo não tem direção")
    return produto_escalar(a, b) / (na * nb)
```
```python name="and no lugar de or"
import numpy as np


def produto_escalar(a, b):
    a = np.asarray(a, dtype=float)
    b = np.asarray(b, dtype=float)
    return float(a @ b)


def norma(a):
    a = np.asarray(a, dtype=float)
    return float(np.sqrt(a @ a))


def cosseno(a, b):
    na = norma(a)
    nb = norma(b)
    if na == 0 and nb == 0:
        raise ValueError("vetor nulo não tem direção")
    return produto_escalar(a, b) / (na * nb)
```
```python name="divisão sem parênteses"
import numpy as np


def produto_escalar(a, b):
    a = np.asarray(a, dtype=float)
    b = np.asarray(b, dtype=float)
    return float(a @ b)


def norma(a):
    a = np.asarray(a, dtype=float)
    return float(np.sqrt(a @ a))


def cosseno(a, b):
    na = norma(a)
    nb = norma(b)
    if na == 0 or nb == 0:
        raise ValueError("vetor nulo não tem direção")
    return produto_escalar(a, b) / na * nb
```
```python name="divide pela soma das normas"
import numpy as np


def produto_escalar(a, b):
    a = np.asarray(a, dtype=float)
    b = np.asarray(b, dtype=float)
    return float(a @ b)


def norma(a):
    a = np.asarray(a, dtype=float)
    return float(np.sqrt(a @ a))


def cosseno(a, b):
    na = norma(a)
    nb = norma(b)
    if na == 0 or nb == 0:
        raise ValueError("vetor nulo não tem direção")
    return produto_escalar(a, b) / (na + nb)
```

## Passo 4 · Leitura · Sistemas lineares: resolva, não inverta

Uma cozinha industrial fictícia prepara 10 kg de um molho com três bases, A, B e C. Cada quilo de A leva 3 g de sal e 1 g de açúcar; de B, 1 g de sal e 4 g de açúcar; de C, 2 g de sal e nada de açúcar. A receita pede 19 g de sal e 14 g de açúcar. Quantos quilos de cada base? São três equações lineares, e na forma de matriz, $Ax = b$:

$$
\begin{cases}
x_1 + x_2 + x_3 = 10 \\
3x_1 + x_2 + 2x_3 = 19 \\
x_1 + 4x_2 = 14
\end{cases}
\qquad
A = \begin{bmatrix} 1 & 1 & 1 \\ 3 & 1 & 2 \\ 1 & 4 & 0 \end{bmatrix}, \quad
b = \begin{bmatrix} 10 \\ 19 \\ 14 \end{bmatrix}
$$

```python
A = np.array([[1.0, 1.0, 1.0],
              [3.0, 1.0, 2.0],
              [1.0, 4.0, 0.0]])
b = np.array([10.0, 19.0, 14.0])
x = np.linalg.solve(A, b)     # [2. 3. 5.]
np.allclose(A @ x, b)         # True: confira a resposta
```

`np.linalg.solve` faz a eliminação de Gauss que você faria à mão (a fatoração LU). Nos livros a solução aparece como $x = A^{-1} b$, e o caminho que parece natural é `np.linalg.inv(A) @ b`. Ele dá o mesmo resultado aqui, mas calcula a inversa inteira para usar só o produto dela por um vetor: faz mais contas e acumula mais erro de arredondamento. Regra prática: onde aparecer `inv(A) @ b`, escreva `solve(A, b)`.

Quando uma equação é combinação das outras, não existe solução única, e a matriz é **singular**. No seu computador, `np.linalg.solve` com a matriz `[[1, 2], [2, 4]]` levanta `LinAlgError: Singular matrix`. No executor da plataforma (numpy em WebAssembly), a mesma chamada devolve `[nan nan]`, sem exceção. E há um caso que engana nos dois lugares: `[[1, 2, 3], [4, 5, 6], [7, 8, 9]]` também é singular (a terceira linha é o dobro da segunda menos a primeira), mas o arredondamento deixa um pivô de 1e-16 no lugar do zero, e o `solve` devolve `[-2.5  4.  -1.5]` para `b` só de uns, uma resposta sem sentido. O determinante também engana: `np.linalg.det` dá `6.66e-16`, e `det(A) == 0` não pega.

O teste confiável é o **posto** (*rank*): o número de linhas independentes, calculado com uma tolerância para o arredondamento. `np.linalg.matrix_rank` devolve 2 para essa matriz. Se o posto é menor que o número de linhas, o sistema não tem solução única, e isso vale em qualquer máquina. Confira o posto antes de resolver.

## Passo 5 · Exercício · Resolver sistemas

Escreva uma função que resolve $Ax = b$ e recusa os sistemas sem solução única, em vez de devolver `nan` ou uma resposta sem sentido.

### Instruções
1. `resolver_sistema(A, b)` recebe uma matriz quadrada `A` e um vetor `b` (listas ou arrays) e devolve um array `float64` com a solução `x`.
2. Se `A` é singular (posto menor que o número de linhas), levante `ValueError("sistema sem solução única")`.
3. Resolva o sistema sem calcular a inversa (`np.linalg.inv`).

### Código inicial
```python
import numpy as np


def resolver_sistema(A, b):
    pass
```

### Solução
```python
import numpy as np


def resolver_sistema(A, b):
    A = np.asarray(A, dtype=float)
    b = np.asarray(b, dtype=float)
    if np.linalg.matrix_rank(A) < A.shape[0]:
        raise ValueError("sistema sem solução única")
    return np.linalg.solve(A, b)
```

### Dicas
1. Converta as entradas para arrays `float` antes de qualquer conta.
2. No executor, `np.linalg.solve` com uma matriz singular não levanta exceção; e uma matriz quase singular devolve números grandes sem aviso em qualquer máquina.
3. O posto vem de `np.linalg.matrix_rank`, que tolera o arredondamento.

### Verificação
```json
[
  { "id": "molho", "checkpoint": 1, "kind": "expr",
    "expr": "resolver_sistema([[1, 1, 1], [3, 1, 2], [1, 4, 0]], [10, 19, 14]).tolist()",
    "expected": [2, 3, 5], "tolerance": 1e-9, "name": "O molho: 2 kg de A, 3 de B e 5 de C",
    "hint": "Devolva o array x para o qual A @ x reproduz b." },
  { "id": "dois-por-dois", "checkpoint": 1, "kind": "expr", "expr": "resolver_sistema([[2, 1], [1, 3]], [3, 5]).tolist()",
    "expected": [0.8, 1.4], "tolerance": 1e-9, "name": "Sistema 2 × 2 com solução fracionária" },
  { "id": "um-por-um", "checkpoint": 1, "kind": "expr", "expr": "resolver_sistema([[4]], [2]).tolist()",
    "expected": [0.5], "tolerance": 1e-9, "name": "Sistema 1 × 1: 4x = 2" },
  { "id": "tipo", "checkpoint": 1, "kind": "expr", "expr": "resolver_sistema([[1, 1], [1, -1]], [4, 2])", "type": "ndarray",
    "name": "resolver_sistema devolve um array numpy" },
  { "id": "confere", "checkpoint": 1, "kind": "expr",
    "setup": "rng = np.random.default_rng(4)\nA = rng.normal(size=(6, 6))\nb = rng.normal(size=6)\nx = resolver_sistema(A, b)",
    "expr": "bool(np.all(np.abs(A @ x - b) < 1e-9))", "expected": true,
    "name": "Num sistema 6 × 6 sorteado, A @ x reproduz b" },
  { "id": "singular-exata", "checkpoint": 2, "kind": "expr", "expr": "resolver_sistema([[1, 2], [2, 4]], [1, 2])",
    "raises": "ValueError", "message_contains": "solução única",
    "name": "Matriz singular [[1, 2], [2, 4]] levanta ValueError",
    "hint": "No executor, o solve devolve nan em vez de levantar exceção." },
  { "id": "singular-arredondada", "checkpoint": 2, "kind": "expr",
    "expr": "resolver_sistema([[1, 2, 3], [4, 5, 6], [7, 8, 9]], [1, 1, 1])",
    "raises": "ValueError", "message_contains": "solução única",
    "name": "A matriz singular de 1 a 9 também é recusada",
    "hint": "O determinante dessa matriz não sai exatamente zero." },
  { "id": "singular-zeros", "checkpoint": 2, "kind": "expr", "expr": "resolver_sistema([[0, 0], [0, 0]], [0, 0])",
    "raises": "ValueError", "message_contains": "solução única", "name": "A matriz nula é recusada" },
  { "id": "sem-inv", "checkpoint": 3, "kind": "source", "rule": { "type": "not_calls", "name": "inv" },
    "name": "Sem np.linalg.inv" }
]
```

### Soluções erradas
```python name="inverte a matriz"
import numpy as np


def resolver_sistema(A, b):
    A = np.asarray(A, dtype=float)
    b = np.asarray(b, dtype=float)
    if np.linalg.matrix_rank(A) < A.shape[0]:
        raise ValueError("sistema sem solução única")
    return np.linalg.inv(A) @ b
```
```python name="espera a exceção do solve"
import numpy as np


def resolver_sistema(A, b):
    A = np.asarray(A, dtype=float)
    b = np.asarray(b, dtype=float)
    try:
        return np.linalg.solve(A, b)
    except np.linalg.LinAlgError:
        raise ValueError("sistema sem solução única") from None
```
```python name="determinante igual a zero"
import numpy as np


def resolver_sistema(A, b):
    A = np.asarray(A, dtype=float)
    b = np.asarray(b, dtype=float)
    if np.linalg.det(A) == 0:
        raise ValueError("sistema sem solução única")
    return np.linalg.solve(A, b)
```
```python name="mínimos quadrados sem conferir"
import numpy as np


def resolver_sistema(A, b):
    A = np.asarray(A, dtype=float)
    b = np.asarray(b, dtype=float)
    return np.linalg.lstsq(A, b)[0]
```
```python name="multiplica em vez de resolver"
import numpy as np


def resolver_sistema(A, b):
    A = np.asarray(A, dtype=float)
    b = np.asarray(b, dtype=float)
    if np.linalg.matrix_rank(A) < A.shape[0]:
        raise ValueError("sistema sem solução única")
    return A @ b
```
```python name="devolve lista"
import numpy as np


def resolver_sistema(A, b):
    A = np.asarray(A, dtype=float)
    b = np.asarray(b, dtype=float)
    if np.linalg.matrix_rank(A) < A.shape[0]:
        raise ValueError("sistema sem solução única")
    return np.linalg.solve(A, b).tolist()
```

## Passo 6 · Leitura · Mínimos quadrados e a equação normal

Um sensor fictício de temperatura foi calibrado em cinco pontos, e as leituras quase formam uma reta: `x = [0, 1, 2, 3, 4]` e `y = [1, 3, 2, 5, 4]`. Você quer a reta $y \approx a + b x$ que melhor descreve os pontos. São cinco equações e duas incógnitas, sem solução exata. O critério de **mínimos quadrados** escolhe $a$ e $b$ que minimizam a soma dos quadrados dos resíduos:

$$
\min_{a,\,b} \sum_{i=1}^{n} \left(y_i - a - b x_i\right)^2
$$

Em matrizes, cada linha de $X$ é um ponto: uma coluna de uns (que multiplica $a$) e a coluna de $x$ (que multiplica $b$). Derivando a soma e igualando a zero, sai a **equação normal**, um sistema 2 × 2:

$$
X = \begin{bmatrix} 1 & x_1 \\ 1 & x_2 \\ \vdots & \vdots \\ 1 & x_n \end{bmatrix}, \qquad
X^\top X \beta = X^\top y, \qquad \beta = \begin{bmatrix} a \\ b \end{bmatrix}
$$

```python
x = np.array([0.0, 1.0, 2.0, 3.0, 4.0])
y = np.array([1.0, 3.0, 2.0, 5.0, 4.0])
X = np.column_stack([np.ones_like(x), x])     # (5, 2)
a, b = np.linalg.solve(X.T @ X, X.T @ y)      # a = 1.4, b = 0.8
```

A coluna de uns é o que dá à reta um intercepto. Sem ela, o modelo vira $y \approx b x$, uma reta obrigada a passar pela origem, e a inclinação se distorce para compensar. Um sinal útil para conferir: com a coluna de uns, a soma dos resíduos $y_i - a - b x_i$ é zero, porque a primeira equação do sistema diz exatamente isso.

`np.linalg.lstsq(X, y)` resolve o mesmo problema por outro caminho, mais estável quando as colunas de $X$ são quase dependentes, e `np.polyfit(x, y, 1)` ajusta a reta diretamente. No exercício você monta a equação normal com as próprias mãos para ver o que essas funções fazem por dentro; no Nível 5, a `LinearRegression` do scikit-learn faz o mesmo com muitas colunas.

Uma matriz quadrada $Q$ é **ortogonal** quando as colunas têm norma 1 e são perpendiculares entre si, ou seja, $Q^\top Q = I$. Rotações e permutações são ortogonais: preservam comprimentos e ângulos, e a inversa delas é a transposta. Para comparar matrizes de `float`, use uma tolerância, nunca `==`. E os **autovalores** (`np.linalg.eigh`) ficam como gancho: no Nível 5, a PCA usa os autovetores de uma matriz de covariância para achar os eixos ortogonais em que os dados mais variam.

## Passo 7 · Exercício · Ajustar uma reta e testar ortogonalidade

Escreva o ajuste pela equação normal e um teste de ortogonalidade com tolerância.

### Instruções
1. `ajustar_reta(x, y)` devolve a tupla `(a, b)`, dois `float` do Python, da reta $y \approx a + b x$ por mínimos quadrados.
2. Monte a equação normal e resolva-a com `np.linalg.solve`, sem `np.polyfit`, `np.linalg.lstsq` ou `np.linalg.inv`.
3. `eh_ortogonal(Q, tol=1e-9)` devolve `True` (um `bool` do Python) se a matriz quadrada `Q` satisfaz $Q^\top Q = I$ com todas as diferenças, em valor absoluto, menores ou iguais a `tol`; senão, `False`.

### Código inicial
```python
import numpy as np


def ajustar_reta(x, y):
    pass


def eh_ortogonal(Q, tol=1e-9):
    pass
```

### Solução
```python
import numpy as np


def ajustar_reta(x, y):
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    X = np.column_stack([np.ones_like(x), x])
    a, b = np.linalg.solve(X.T @ X, X.T @ y)
    return float(a), float(b)


def eh_ortogonal(Q, tol=1e-9):
    Q = np.asarray(Q, dtype=float)
    diferenca = Q.T @ Q - np.eye(Q.shape[0])
    return bool(np.abs(diferenca).max() <= tol)
```

### Dicas
1. A matriz $X$ tem uma coluna de uns e a coluna de `x`; `np.column_stack` monta as duas lado a lado.
2. A ordem das colunas de $X$ é a ordem dos coeficientes que o `solve` devolve.
3. Comparações com arrays devolvem `bool` do numpy; o enunciado pede o `bool` do Python. E use o `tol` recebido.

### Verificação
```json
[
  { "id": "reta-exata", "checkpoint": 1, "kind": "call", "function": "ajustar_reta", "args": [[0, 1, 2, 3], [2, 5, 8, 11]],
    "expected": [2, 3], "type": "tuple", "tolerance": 1e-9, "name": "Pontos de y = 2 + 3x dão (2, 3)",
    "hint": "A tupla é (a, b): o intercepto primeiro, depois a inclinação." },
  { "id": "reta-ruido", "checkpoint": 1, "kind": "call", "function": "ajustar_reta", "args": [[0, 1, 2, 3, 4], [1, 3, 2, 5, 4]],
    "expected": [1.4, 0.8], "tolerance": 1e-9, "name": "A calibração do sensor dá a = 1.4 e b = 0.8" },
  { "id": "reta-tipos", "checkpoint": 1, "kind": "expr", "expr": "[type(v).__name__ for v in ajustar_reta([0, 1, 2], [1, 2, 4])]",
    "expected": ["float", "float"], "name": "a e b são float do Python", "hint": "O solve devolve números do numpy." },
  { "id": "residuos", "checkpoint": 1, "kind": "expr",
    "setup": "rng = np.random.default_rng(5)\nx = rng.uniform(0, 10, 50)\ny = 3 - 2 * x + rng.normal(0, 1, 50)\na, b = ajustar_reta(x, y)",
    "expr": "abs(float((y - a - b * x).sum())) < 1e-6", "expected": true,
    "name": "Com 50 pontos sorteados, os resíduos somam zero" },
  { "id": "sem-polyfit", "checkpoint": 2, "kind": "source", "rule": { "type": "not_calls", "name": "polyfit" },
    "name": "Sem np.polyfit" },
  { "id": "sem-lstsq", "checkpoint": 2, "kind": "source", "rule": { "type": "not_calls", "name": "lstsq" },
    "name": "Sem np.linalg.lstsq" },
  { "id": "sem-inv", "checkpoint": 2, "kind": "source", "rule": { "type": "not_calls", "name": "inv" },
    "name": "Sem np.linalg.inv" },
  { "id": "rotacao", "checkpoint": 3, "kind": "expr",
    "setup": "t = np.pi / 6\nR = np.array([[np.cos(t), -np.sin(t)], [np.sin(t), np.cos(t)]])",
    "expr": "eh_ortogonal(R)", "expected": true, "type": "bool", "name": "Uma rotação de 30 graus é ortogonal",
    "hint": "A condição compara a transposta vezes Q com a identidade, e o retorno é um bool do Python." },
  { "id": "nao-normalizada", "checkpoint": 3, "kind": "expr", "expr": "eh_ortogonal([[1, 1], [1, -1]])", "expected": false,
    "name": "Colunas perpendiculares com norma maior que 1 não bastam" },
  { "id": "involucao", "checkpoint": 3, "kind": "expr", "expr": "eh_ortogonal([[1, 1], [0, -1]])", "expected": false,
    "name": "[[1, 1], [0, -1]] não é ortogonal, embora Q @ Q seja a identidade",
    "hint": "A condição usa a transposta." },
  { "id": "tolerancia-padrao", "checkpoint": 3, "kind": "expr", "setup": "Q = np.eye(3)\nQ[0, 0] += 1e-6",
    "expr": "eh_ortogonal(Q)", "expected": false, "name": "Uma diferença de 2e-6 passa da tolerância padrão 1e-9",
    "hint": "A tolerância padrão é bem mais apertada que a do np.allclose." },
  { "id": "tolerancia-recebida", "checkpoint": 3, "kind": "expr", "setup": "Q = np.eye(3)\nQ[0, 0] += 1e-6",
    "expr": "eh_ortogonal(Q, tol=1e-3)", "expected": true, "name": "Com tol=1e-3, a mesma matriz passa",
    "hint": "Use o tol recebido." }
]
```

### Soluções erradas
```python name="sem a coluna de uns"
import numpy as np


def ajustar_reta(x, y):
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    X = x[:, np.newaxis]
    (b,) = np.linalg.solve(X.T @ X, X.T @ y)
    return 0.0, float(b)


def eh_ortogonal(Q, tol=1e-9):
    Q = np.asarray(Q, dtype=float)
    diferenca = Q.T @ Q - np.eye(Q.shape[0])
    return bool(np.abs(diferenca).max() <= tol)
```
```python name="coeficientes trocados"
import numpy as np


def ajustar_reta(x, y):
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    X = np.column_stack([x, np.ones_like(x)])
    a, b = np.linalg.solve(X.T @ X, X.T @ y)
    return float(a), float(b)


def eh_ortogonal(Q, tol=1e-9):
    Q = np.asarray(Q, dtype=float)
    diferenca = Q.T @ Q - np.eye(Q.shape[0])
    return bool(np.abs(diferenca).max() <= tol)
```
```python name="* no lugar de @"
import numpy as np


def ajustar_reta(x, y):
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    X = np.column_stack([np.ones_like(x), x])
    a, b = np.linalg.solve(X.T * X, X.T * y)
    return float(a), float(b)


def eh_ortogonal(Q, tol=1e-9):
    Q = np.asarray(Q, dtype=float)
    diferenca = Q.T @ Q - np.eye(Q.shape[0])
    return bool(np.abs(diferenca).max() <= tol)
```
```python name="usa a inversa"
import numpy as np


def ajustar_reta(x, y):
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    X = np.column_stack([np.ones_like(x), x])
    a, b = np.linalg.inv(X.T @ X) @ X.T @ y
    return float(a), float(b)


def eh_ortogonal(Q, tol=1e-9):
    Q = np.asarray(Q, dtype=float)
    diferenca = Q.T @ Q - np.eye(Q.shape[0])
    return bool(np.abs(diferenca).max() <= tol)
```
```python name="coeficientes do numpy"
import numpy as np


def ajustar_reta(x, y):
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    X = np.column_stack([np.ones_like(x), x])
    a, b = np.linalg.solve(X.T @ X, X.T @ y)
    return a, b


def eh_ortogonal(Q, tol=1e-9):
    Q = np.asarray(Q, dtype=float)
    diferenca = Q.T @ Q - np.eye(Q.shape[0])
    return bool(np.abs(diferenca).max() <= tol)
```
```python name="Q @ Q no lugar de Q.T @ Q"
import numpy as np


def ajustar_reta(x, y):
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    X = np.column_stack([np.ones_like(x), x])
    a, b = np.linalg.solve(X.T @ X, X.T @ y)
    return float(a), float(b)


def eh_ortogonal(Q, tol=1e-9):
    Q = np.asarray(Q, dtype=float)
    diferenca = Q @ Q - np.eye(Q.shape[0])
    return bool(np.abs(diferenca).max() <= tol)
```
```python name="bool do numpy"
import numpy as np


def ajustar_reta(x, y):
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    X = np.column_stack([np.ones_like(x), x])
    a, b = np.linalg.solve(X.T @ X, X.T @ y)
    return float(a), float(b)


def eh_ortogonal(Q, tol=1e-9):
    Q = np.asarray(Q, dtype=float)
    diferenca = Q.T @ Q - np.eye(Q.shape[0])
    return np.abs(diferenca).max() <= tol
```
```python name="só confere a perpendicularidade"
import numpy as np


def ajustar_reta(x, y):
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    X = np.column_stack([np.ones_like(x), x])
    a, b = np.linalg.solve(X.T @ X, X.T @ y)
    return float(a), float(b)


def eh_ortogonal(Q, tol=1e-9):
    Q = np.asarray(Q, dtype=float)
    G = Q.T @ Q
    fora_da_diagonal = G - np.diag(np.diag(G))
    return bool(np.abs(fora_da_diagonal).max() <= tol)
```
```python name="ignora o tol recebido"
import numpy as np


def ajustar_reta(x, y):
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    X = np.column_stack([np.ones_like(x), x])
    a, b = np.linalg.solve(X.T @ X, X.T @ y)
    return float(a), float(b)


def eh_ortogonal(Q, tol=1e-9):
    Q = np.asarray(Q, dtype=float)
    return bool(np.allclose(Q.T @ Q, np.eye(Q.shape[0])))
```

## Passo 8 · Quiz · Dimensões e sistemas

### Pergunta
`X` tem forma `(100, 3)`: 100 casas fictícias e 3 características de cada uma. `w = np.array([0.5, 2.0, -1.0])` tem um peso por característica. Qual expressão dá um valor por casa, a soma ponderada das características?
- [x] `X @ w`
- [ ] `X * w`
- [ ] `w @ X`
- [ ] `X.T @ w`
> `(100, 3) @ (3,)` casa no meio e dá `(100,)`: cada linha vezes os pesos, somada. `X * w` multiplica posição a posição e devolve `(100, 3)`, sem somar. `w @ X` pede `(3,) @ (100, 3)`, e `X.T @ w` pede `(3, 100) @ (3,)`: nos dois, as dimensões do meio não casam e vem o `ValueError` do `matmul`.

### Pergunta
Para evitar a matriz singular, um colega escreveu `if np.linalg.det(A) == 0: raise ValueError(...)` antes de `np.linalg.solve(A, b)`. Com `A = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]`, o que acontece?
- [ ] O `ValueError` é levantado, porque o determinante de uma matriz singular é zero
- [x] O teste não pega: o determinante sai `6.66e-16` por arredondamento, e o `solve` devolve uma resposta sem sentido
- [ ] O `solve` levanta `LinAlgError` em qualquer máquina, então o teste nem é necessário
- [ ] O `det` levanta exceção porque a matriz não é invertível
> Em aritmética exata o determinante é zero, mas em ponto flutuante ele sai 6.66e-16, e `== 0` é falso. O `solve` também não percebe, porque o pivô vira 1e-16 e não zero, e devolve números grandes sem aviso. O teste confiável é `np.linalg.matrix_rank(A) < A.shape[0]`, que usa uma tolerância.

### Pergunta
As vendas de uma loja fictícia seguem aproximadamente $y = 50 + 0{,}1\,x$. Ao montar a equação normal, você esqueceu a coluna de uns em $X$. O que você deve observar no ajuste?
- [ ] O mesmo resultado, porque a coluna de uns só serve para a estabilidade numérica
- [ ] Um erro de formas no `solve`, porque $X^\top X$ deixa de ser quadrada
- [x] Uma reta obrigada a passar pela origem, com inclinação bem maior que 0,1 para compensar o intercepto que falta, e resíduos que não somam zero
- [ ] O intercepto 50 aparece como inclinação, e a inclinação 0,1 como intercepto
> Sem a coluna de uns, o modelo é $y \approx b x$: a reta precisa passar por $(0, 0)$, e a inclinação cresce para chegar perto dos pontos que estão por volta de 50. $X^\top X$ continua quadrada (1 × 1), então não há erro de forma. A troca de intercepto e inclinação é outro defeito, o de montar as colunas na ordem contrária.
