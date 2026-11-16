---
slug: n5-m2-04-equacao-normal-e-solucao-exata
titulo: Equação normal e solução exata
descricao: Resolver a regressão em uma linha com álgebra, comparar com o gradiente descendente, custo computacional e problemas numéricos.
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
- Resolver a regressão linear pela equação normal e por np.linalg.lstsq
- Comparar a solução exata com a do gradiente descendente e explicar quando usar cada uma
- Reconhecer matrizes singulares (atributos colineares) e o papel da regularização
---

## Passo 1 · Leitura · Gradiente igual a zero

O gradiente descendente anda até o fundo da bacia do MSE. Como a bacia do modelo linear tem um fundo só, dá para ir direto até ele: no mínimo o gradiente é zero, e essa condição é uma equação que se resolve com álgebra. Use o truque da coluna de uns: $X'$ é a matriz $X$ com uma coluna de uns na frente, e $w' = (b, w_1, \dots, w_d)$. O gradiente da lição 1 fica $\frac{2}{n} X'^\top (X' w' - y)$, e igualá-lo a zero dá a **equação normal**:

$$
X'^\top X'\, w' = X'^\top y
$$

É um sistema linear com $d + 1$ equações e $d + 1$ incógnitas: a matriz $A = X'^\top X'$ tem forma $(d+1, d+1)$, pequena mesmo quando há milhões de linhas. No Nível 4 você o resolveu com `np.linalg.solve`:

```python
Xb = np.column_stack([np.ones(len(X)), X])   # coluna de uns primeiro
coef = np.linalg.solve(Xb.T @ Xb, Xb.T @ y)  # (b, w1, ..., wd)
```

A fórmula dos livros, $w' = (X'^\top X')^{-1} X'^\top y$, sugere calcular a inversa com `np.linalg.inv` e multiplicar. Não faça isso: inverter a matriz custa mais que resolver o sistema e perde mais precisão quando $A$ está perto de ser singular. O `solve` fatora a matriz e resolve o sistema sem nunca formar a inversa.

Há um terceiro caminho, que nem forma $X'^\top X'$: o `np.linalg.lstsq(Xb, y)` resolve os mínimos quadrados direto pela decomposição em valores singulares (SVD) de $X'$. Ele é o mais estável dos três e, quando a solução não é única, devolve a de **menor norma**. Os coeficientes são o primeiro elemento da tupla que ele devolve.

Dois erros aparecem sempre. Esquecer a coluna de uns força a reta a passar pela origem, e as previsões ficam deslocadas. E escrever `Xb @ Xb.T` em vez de `Xb.T @ Xb` produz uma matriz $n \times n$, enorme e de posto no máximo $d + 1$. Com 100 exemplos, o `solve` dessa matriz contra o vetor de 3 posições $X'^\top y$ dá `ValueError: solve1: Input operand 1 has a mismatch in its core dimension 0, with gufunc signature (m,m),(m)->(m) (size 3 is different from 100)`. Tentar resolver $X' w' = y$ direto, com `np.linalg.solve(Xb, y)`, também falha: `LinAlgError: Last 2 dimensions of the array must be square`.

## Passo 2 · Previsão · solve, lstsq e a coluna repetida

O programa ajusta uma reta a pontos exatos e depois repete a coluna `x`, o que torna a matriz singular. Leia sem executar e digite o que ele imprime.

### Código
```python
import numpy as np

x = np.array([1.0, 2.0, 3.0, 4.0])
y = 1.0 + 4.0 * x
Xb = np.column_stack([np.ones(4), x])
print(np.linalg.solve(Xb.T @ Xb, Xb.T @ y).round(6).tolist())

Xd = np.column_stack([np.ones(4), x, x])
print(np.linalg.matrix_rank(Xd), Xd.shape[1])
c = np.linalg.lstsq(Xd, y)[0]
print(c.round(6).tolist())
print(np.allclose(Xd @ c, y))
print(np.isnan(np.linalg.solve(Xd.T @ Xd, Xd.T @ y)).all())
```

### Dicas
1. Os pontos estão sobre $y = 1 + 4x$, sem ruído.
2. Com a coluna repetida, qualquer divisão do 4 entre os dois pesos dá as mesmas previsões; o `lstsq` escolhe a de menor norma.
3. No executor do curso, o `solve` de uma matriz exatamente singular não levanta erro: devolve `nan` em todas as posições (no seu computador, o mesmo código levanta `LinAlgError: Singular matrix`).

### Saída esperada
```text
[1.0, 4.0]
2 3
[1.0, 2.0, 2.0]
True
True
```

## Passo 3 · Exercício · Equação normal
modo: ordenar

Arraste as linhas para montar `equacao_normal(X, y)` e ajuste a indentação de cada uma. Três linhas estão sobrando.

### Instruções
1. `equacao_normal(X, y)` recebe `X` de forma `(n, d)` e `y` de forma `(n,)` e acrescenta uma coluna de uns **antes** das colunas de `X`.
2. Monta a equação normal $X'^\top X' w' = X'^\top y$ e a resolve com `np.linalg.solve`, sem calcular a inversa.
3. Devolve o array `(b, w_1, ..., w_d)`, com o intercepto primeiro.

### Solução
```python
import numpy as np


def equacao_normal(X, y):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    Xb = np.column_stack([np.ones(len(X)), X])
    A = Xb.T @ Xb
    c = Xb.T @ y
    return np.linalg.solve(A, c)
```

### Distratores
```python
A = Xb @ Xb.T
return np.linalg.inv(A) @ c
Xb = np.column_stack([X, np.ones(len(X))])
```

### Dicas
1. A coluna de uns vem primeiro, para o intercepto sair na posição 0.
2. A matriz do sistema é pequena: $(d+1) \times (d+1)$.
3. O `solve` recebe a matriz e o lado direito, nessa ordem.

### Verificação
```json
[
  { "id": "exata", "checkpoint": 3, "kind": "expr",
    "expr": "equacao_normal([[0, 0], [1, 0], [0, 1], [1, 1], [2, 3]], [3, 5, 2, 4, 4]).tolist()", "expected": [3.0, 2.0, -1.0], "tolerance": 1e-9,
    "name": "Pontos exatos de y = 3 + 2x1 − x2: os coeficientes (3, 2, −1)",
    "hint": "O intercepto vem primeiro, e a coluna de uns precisa existir." },
  { "id": "um-atributo", "checkpoint": 1, "kind": "expr",
    "expr": "equacao_normal([[1.0], [2.0], [3.0], [4.0]], [3.0, 5.0, 7.0, 9.0]).tolist()", "expected": [1.0, 2.0], "tolerance": 1e-9,
    "name": "Um atributo: a reta y = 1 + 2x" },
  { "id": "igual-ao-lstsq", "checkpoint": 2, "kind": "expr",
    "setup": "import numpy as np\nrng = np.random.default_rng(3)\nZ = rng.normal(size=(80, 2))\ny = 3.0 + 2.0 * Z[:, 0] - Z[:, 1] + rng.normal(0.0, 0.5, size=80)\nref = np.linalg.lstsq(np.column_stack([np.ones(80), Z]), y)[0]",
    "expr": "bool(np.allclose(equacao_normal(Z, y), ref, atol=1e-8))", "expected": true,
    "name": "Com ruído, os mesmos coeficientes do np.linalg.lstsq",
    "hint": "Compare com o lstsq da matriz com a coluna de uns na frente." },
  { "id": "um-atributo-com-ruido", "checkpoint": 1, "kind": "expr",
    "expr": "equacao_normal([[0.0], [1.0], [2.0], [3.0]], [1.0, 3.0, 2.0, 6.0]).tolist()", "expected": [0.9, 1.4], "tolerance": 1e-9,
    "name": "Quatro pontos fora de uma reta: intercepto 0.9 e inclinação 1.4",
    "hint": "Com ruído, a coluna de uns continua necessária para o intercepto." },
  { "id": "tamanho", "checkpoint": 3, "kind": "expr",
    "setup": "import numpy as np\nrng = np.random.default_rng(1)\nr = equacao_normal(rng.normal(size=(30, 4)), rng.normal(size=30))",
    "expr": "[type(r).__name__, list(r.shape)]", "expected": ["ndarray", [5]],
    "name": "Com 4 atributos, devolve um array com 5 coeficientes" },
  { "id": "sem-inv", "checkpoint": 2, "kind": "source", "rule": { "type": "not_calls", "name": "inv" },
    "name": "Resolve o sistema sem calcular a inversa" }
]
```

### Soluções erradas
```python name="inverte a matriz"
import numpy as np


def equacao_normal(X, y):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    Xb = np.column_stack([np.ones(len(X)), X])
    A = Xb.T @ Xb
    c = Xb.T @ y
    return np.linalg.inv(A) @ c
```
```python name="sem a coluna de uns"
import numpy as np


def equacao_normal(X, y):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    Xb = X
    A = Xb.T @ Xb
    c = Xb.T @ y
    return np.linalg.solve(A, c)
```
```python name="coluna de uns no fim"
import numpy as np


def equacao_normal(X, y):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    Xb = np.column_stack([X, np.ones(len(X))])
    A = Xb.T @ Xb
    c = Xb.T @ y
    return np.linalg.solve(A, c)
```
```python name="Xb @ Xb.T"
import numpy as np


def equacao_normal(X, y):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    Xb = np.column_stack([np.ones(len(X)), X])
    A = Xb @ Xb.T
    c = Xb.T @ y
    return np.linalg.solve(A, c)
```
```python name="resolve Xb w = y direto"
import numpy as np


def equacao_normal(X, y):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    Xb = np.column_stack([np.ones(len(X)), X])
    return np.linalg.solve(Xb, y)
```

## Passo 4 · Leitura · Quando a equação normal falha

A equação normal tem dois limites: o custo e a singularidade.

**Custo.** Formar $X'^\top X'$ custa da ordem de $n(d+1)^2$ multiplicações, e resolver o sistema, da ordem de $(d+1)^3$. Uma época do gradiente em lote faz dois produtos de $X'$ por um vetor, da ordem de $2n(d+1)$:

$$
\underbrace{O\!\left(n d^2 + d^3\right)}_{\text{equação normal}} \qquad \text{contra} \qquad \underbrace{O(n d)}_{\text{uma época do gradiente}}
$$

Com poucas colunas, a equação normal ganha fácil. Medido no executor: com $n = 10\,000$ e $d = 10$, ela leva 0,6 ms; com $n = 1\,000$ e $d = 600$, leva 0,26 s, enquanto uma época do gradiente leva 0,9 ms: 280 épocas custam o mesmo que uma solução exata. Com dezenas de milhares de colunas (texto, imagens), o termo $d^3$ inviabiliza a equação normal; com dados que nem cabem na memória, só os mini-lotes funcionam.

**Singularidade.** O sistema tem solução única só quando $X'$ tem **posto** completo, $d + 1$: nenhuma coluna é combinação das outras. Uma coluna repetida, uma coluna constante (múltipla da coluna de uns), a área em m² junto com a área em cm² ou "total = a + b" junto com `a` e `b` tornam $A$ singular, e menos linhas que colunas também. O posto se confere com `np.linalg.matrix_rank` e **com a coluna de uns**: sem ela, uma coluna constante passa despercebida.

No executor do curso, o `solve` de uma matriz singular não levanta erro. Com uma coluna exatamente repetida, devolve `nan`; com uma combinação linear, como uma coluna igual a $2x_1 - x_2 + 3$, os arredondamentos deixam $A$ "quase" singular (o determinante sai $-3{,}5 \cdot 10^{-10}$, e não zero) e o `solve` devolve números sem sentido, sem aviso. Testar `np.linalg.det(A) == 0` não pega esse caso; o posto pega.

```python
Xb = np.column_stack([np.ones(len(X)), X])
singular = np.linalg.matrix_rank(Xb) < Xb.shape[1]
```

Quando a matriz é singular, há saídas: remover a coluna redundante, usar o `lstsq` (que devolve a solução de menor norma) ou somar $\lambda I$ à matriz, o **ridge** da próxima lição, que torna o sistema sempre solúvel. E quando ela não é, a equação normal e o gradiente descendente chegam ao mesmo ponto: a distância entre as duas soluções cai a cada época, até o arredondamento.

## Passo 5 · Exercício · Singular e comparação com o gradiente

O código já traz o `treinar_batch` da lição 2 e a `equacao_normal` do passo 3. Escreva o detector de matriz singular e a comparação entre as duas soluções.

### Instruções
1. `detectar_singular(X)` devolve `True` quando a matriz `X` com a coluna de uns na frente não tem posto completo (posto menor que o número de colunas dela), e `False` caso contrário, como `bool` do Python.
2. `distancia_para_gd(X, y, taxa, epocas)` calcula a solução exata com `equacao_normal` e a do gradiente com `treinar_batch(X, y, taxa, epocas)`, monta a do gradiente na mesma ordem `(b, w_1, ..., w_d)` e devolve a norma euclidiana da diferença, como `float`.

### Código inicial
```python
import numpy as np


def treinar_batch(X, y, taxa, epocas):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    n, d = X.shape
    w = np.zeros(d)
    b = 0.0
    historico = []
    for _ in range(epocas):
        residuo = X @ w + b - y
        gw = 2 / n * X.T @ residuo
        gb = 2 / n * residuo.sum()
        w = w - taxa * gw
        b = b - taxa * gb
        historico.append(float(np.mean((X @ w + b - y) ** 2)))
    return w, float(b), historico


def equacao_normal(X, y):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    Xb = np.column_stack([np.ones(len(X)), X])
    return np.linalg.solve(Xb.T @ Xb, Xb.T @ y)


def detectar_singular(X):
    pass


def distancia_para_gd(X, y, taxa, epocas):
    pass
```
```python path=dados_regressao.py
import numpy as np


def gerar_dados(n=100, semente=0, ruido=0.5, escala=(1.0, 1.0)):
    rng = np.random.default_rng(semente)
    Z = rng.normal(0.0, 1.0, size=(n, 2))
    y = 3.0 + 2.0 * Z[:, 0] - Z[:, 1] + rng.normal(0.0, ruido, size=n)
    return Z * np.asarray(escala, dtype=float), y
```

### Solução
```python
import numpy as np


def treinar_batch(X, y, taxa, epocas):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    n, d = X.shape
    w = np.zeros(d)
    b = 0.0
    historico = []
    for _ in range(epocas):
        residuo = X @ w + b - y
        gw = 2 / n * X.T @ residuo
        gb = 2 / n * residuo.sum()
        w = w - taxa * gw
        b = b - taxa * gb
        historico.append(float(np.mean((X @ w + b - y) ** 2)))
    return w, float(b), historico


def equacao_normal(X, y):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    Xb = np.column_stack([np.ones(len(X)), X])
    return np.linalg.solve(Xb.T @ Xb, Xb.T @ y)


def detectar_singular(X):
    X = np.asarray(X, dtype=float)
    Xb = np.column_stack([np.ones(len(X)), X])
    return bool(np.linalg.matrix_rank(Xb) < Xb.shape[1])


def distancia_para_gd(X, y, taxa, epocas):
    exata = equacao_normal(X, y)
    w, b, _ = treinar_batch(X, y, taxa, epocas)
    return float(np.linalg.norm(exata - np.r_[b, w]))
```
```python path=dados_regressao.py
import numpy as np


def gerar_dados(n=100, semente=0, ruido=0.5, escala=(1.0, 1.0)):
    rng = np.random.default_rng(semente)
    Z = rng.normal(0.0, 1.0, size=(n, 2))
    y = 3.0 + 2.0 * Z[:, 0] - Z[:, 1] + rng.normal(0.0, ruido, size=n)
    return Z * np.asarray(escala, dtype=float), y
```

### Dicas
1. Monte a matriz com a coluna de uns e compare o `matrix_rank` dela com o número de colunas.
2. O `treinar_batch` devolve `w` e `b` separados; o `np.r_[b, w]` os junta com o intercepto primeiro.
3. A norma euclidiana de um vetor é `np.linalg.norm`.

### Verificação
```json
[
  { "id": "posto-completo", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np\nA = np.random.default_rng(0).normal(size=(30, 2))",
    "expr": "detectar_singular(A)", "expected": false, "type": "bool",
    "name": "Duas colunas sorteadas: posto completo, False",
    "hint": "Devolva um bool do Python, não o np.bool_ de uma comparação do numpy." },
  { "id": "coluna-repetida", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np\nA = np.random.default_rng(0).normal(size=(30, 2))",
    "expr": "detectar_singular(np.column_stack([A, A[:, 0]]))", "expected": true,
    "name": "Uma coluna repetida torna a matriz singular" },
  { "id": "combinacao", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np\nA = np.random.default_rng(0).normal(size=(30, 2))",
    "expr": "detectar_singular(np.column_stack([A, 2 * A[:, 0] - A[:, 1] + 3]))", "expected": true,
    "name": "Uma coluna igual a 2·x1 − x2 + 3 também (o determinante não sai exatamente zero)",
    "hint": "O determinante calculado em ponto flutuante quase nunca é exatamente zero; use o posto." },
  { "id": "coluna-constante", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np\nA = np.random.default_rng(0).normal(size=(30, 2))",
    "expr": "detectar_singular(np.column_stack([A, np.full(30, 7.0)]))", "expected": true,
    "name": "Uma coluna constante repete a coluna de uns",
    "hint": "O posto precisa ser conferido com a coluna de uns." },
  { "id": "poucas-linhas", "checkpoint": 1, "kind": "expr",
    "expr": "detectar_singular([[1.0, 2.0], [3.0, 5.0]])", "expected": true,
    "name": "Duas linhas e três coeficientes: não há solução única" },
  { "id": "quase-repetida", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np\nrng = np.random.default_rng(0)\nA = rng.normal(size=(30, 2))\nB = np.column_stack([A, A[:, 0] + rng.normal(0, 0.01, size=30)])",
    "expr": "detectar_singular(B)", "expected": false,
    "name": "Uma coluna parecida, mas não igual, não é singular" },
  { "id": "poucas-epocas", "checkpoint": 2, "kind": "expr",
    "setup": "from dados_regressao import gerar_dados\nX, y = gerar_dados(100, semente=2)",
    "expr": "distancia_para_gd(X, y, 0.1, 5)", "expected": 1.0992679913198562, "type": "float", "tolerance": 1e-9,
    "name": "Depois de 5 épocas, a distância entre as duas soluções",
    "hint": "Junte (b, w) com o intercepto primeiro, como na equação normal, e use a norma euclidiana da diferença." },
  { "id": "muitas-epocas", "checkpoint": 2, "kind": "expr",
    "setup": "from dados_regressao import gerar_dados\nX, y = gerar_dados(100, semente=2)",
    "expr": "distancia_para_gd(X, y, 0.1, 1000) < 1e-9", "expected": true,
    "name": "Depois de 1000 épocas, as duas soluções coincidem" }
]
```

### Soluções erradas
```python name="posto sem a coluna de uns"
import numpy as np


def treinar_batch(X, y, taxa, epocas):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    n, d = X.shape
    w = np.zeros(d)
    b = 0.0
    historico = []
    for _ in range(epocas):
        residuo = X @ w + b - y
        gw = 2 / n * X.T @ residuo
        gb = 2 / n * residuo.sum()
        w = w - taxa * gw
        b = b - taxa * gb
        historico.append(float(np.mean((X @ w + b - y) ** 2)))
    return w, float(b), historico


def equacao_normal(X, y):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    Xb = np.column_stack([np.ones(len(X)), X])
    return np.linalg.solve(Xb.T @ Xb, Xb.T @ y)


def detectar_singular(X):
    X = np.asarray(X, dtype=float)
    return bool(np.linalg.matrix_rank(X) < X.shape[1])


def distancia_para_gd(X, y, taxa, epocas):
    exata = equacao_normal(X, y)
    w, b, _ = treinar_batch(X, y, taxa, epocas)
    return float(np.linalg.norm(exata - np.r_[b, w]))
```
```python name="determinante igual a zero"
import numpy as np


def treinar_batch(X, y, taxa, epocas):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    n, d = X.shape
    w = np.zeros(d)
    b = 0.0
    historico = []
    for _ in range(epocas):
        residuo = X @ w + b - y
        gw = 2 / n * X.T @ residuo
        gb = 2 / n * residuo.sum()
        w = w - taxa * gw
        b = b - taxa * gb
        historico.append(float(np.mean((X @ w + b - y) ** 2)))
    return w, float(b), historico


def equacao_normal(X, y):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    Xb = np.column_stack([np.ones(len(X)), X])
    return np.linalg.solve(Xb.T @ Xb, Xb.T @ y)


def detectar_singular(X):
    X = np.asarray(X, dtype=float)
    Xb = np.column_stack([np.ones(len(X)), X])
    return bool(np.linalg.det(Xb.T @ Xb) == 0)


def distancia_para_gd(X, y, taxa, epocas):
    exata = equacao_normal(X, y)
    w, b, _ = treinar_batch(X, y, taxa, epocas)
    return float(np.linalg.norm(exata - np.r_[b, w]))
```
```python name="compara o posto com d, e não com d + 1"
import numpy as np


def treinar_batch(X, y, taxa, epocas):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    n, d = X.shape
    w = np.zeros(d)
    b = 0.0
    historico = []
    for _ in range(epocas):
        residuo = X @ w + b - y
        gw = 2 / n * X.T @ residuo
        gb = 2 / n * residuo.sum()
        w = w - taxa * gw
        b = b - taxa * gb
        historico.append(float(np.mean((X @ w + b - y) ** 2)))
    return w, float(b), historico


def equacao_normal(X, y):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    Xb = np.column_stack([np.ones(len(X)), X])
    return np.linalg.solve(Xb.T @ Xb, Xb.T @ y)


def detectar_singular(X):
    X = np.asarray(X, dtype=float)
    Xb = np.column_stack([np.ones(len(X)), X])
    return bool(np.linalg.matrix_rank(Xb) < X.shape[1])


def distancia_para_gd(X, y, taxa, epocas):
    exata = equacao_normal(X, y)
    w, b, _ = treinar_batch(X, y, taxa, epocas)
    return float(np.linalg.norm(exata - np.r_[b, w]))
```
```python name="devolve np.bool_"
import numpy as np


def treinar_batch(X, y, taxa, epocas):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    n, d = X.shape
    w = np.zeros(d)
    b = 0.0
    historico = []
    for _ in range(epocas):
        residuo = X @ w + b - y
        gw = 2 / n * X.T @ residuo
        gb = 2 / n * residuo.sum()
        w = w - taxa * gw
        b = b - taxa * gb
        historico.append(float(np.mean((X @ w + b - y) ** 2)))
    return w, float(b), historico


def equacao_normal(X, y):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    Xb = np.column_stack([np.ones(len(X)), X])
    return np.linalg.solve(Xb.T @ Xb, Xb.T @ y)


def detectar_singular(X):
    X = np.asarray(X, dtype=float)
    Xb = np.column_stack([np.ones(len(X)), X])
    return np.linalg.matrix_rank(Xb) < Xb.shape[1]


def distancia_para_gd(X, y, taxa, epocas):
    exata = equacao_normal(X, y)
    w, b, _ = treinar_batch(X, y, taxa, epocas)
    return float(np.linalg.norm(exata - np.r_[b, w]))
```
```python name="(w, b) fora de ordem"
import numpy as np


def treinar_batch(X, y, taxa, epocas):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    n, d = X.shape
    w = np.zeros(d)
    b = 0.0
    historico = []
    for _ in range(epocas):
        residuo = X @ w + b - y
        gw = 2 / n * X.T @ residuo
        gb = 2 / n * residuo.sum()
        w = w - taxa * gw
        b = b - taxa * gb
        historico.append(float(np.mean((X @ w + b - y) ** 2)))
    return w, float(b), historico


def equacao_normal(X, y):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    Xb = np.column_stack([np.ones(len(X)), X])
    return np.linalg.solve(Xb.T @ Xb, Xb.T @ y)


def detectar_singular(X):
    X = np.asarray(X, dtype=float)
    Xb = np.column_stack([np.ones(len(X)), X])
    return bool(np.linalg.matrix_rank(Xb) < Xb.shape[1])


def distancia_para_gd(X, y, taxa, epocas):
    exata = equacao_normal(X, y)
    w, b, _ = treinar_batch(X, y, taxa, epocas)
    return float(np.linalg.norm(exata - np.r_[w, b]))
```
```python name="soma das diferenças no lugar da norma"
import numpy as np


def treinar_batch(X, y, taxa, epocas):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    n, d = X.shape
    w = np.zeros(d)
    b = 0.0
    historico = []
    for _ in range(epocas):
        residuo = X @ w + b - y
        gw = 2 / n * X.T @ residuo
        gb = 2 / n * residuo.sum()
        w = w - taxa * gw
        b = b - taxa * gb
        historico.append(float(np.mean((X @ w + b - y) ** 2)))
    return w, float(b), historico


def equacao_normal(X, y):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    Xb = np.column_stack([np.ones(len(X)), X])
    return np.linalg.solve(Xb.T @ Xb, Xb.T @ y)


def detectar_singular(X):
    X = np.asarray(X, dtype=float)
    Xb = np.column_stack([np.ones(len(X)), X])
    return bool(np.linalg.matrix_rank(Xb) < Xb.shape[1])


def distancia_para_gd(X, y, taxa, epocas):
    exata = equacao_normal(X, y)
    w, b, _ = treinar_batch(X, y, taxa, epocas)
    return float(np.sum(exata - np.r_[b, w]))
```

## Passo 6 · Exercício · Quanto custa cada método

Compare os dois métodos pela contagem de multiplicações, sem medir o relógio, com as fórmulas abaixo, em que $p = d + 1$ é o número de coeficientes.

### Instruções
1. `operacoes_equacao_normal(n, d)` devolve $n p^2 + p^3$ como `int`: formar $X'^\top X'$ e resolver o sistema.
2. `operacoes_gd(n, d, epocas)` devolve $2 n p \cdot \text{epocas}$ como `int`: dois produtos de $X'$ por um vetor em cada época.
3. `metodo_mais_barato(n, d, epocas)` devolve `"equacao_normal"` quando a equação normal custa menos ou o mesmo que o gradiente, e `"gradiente"` caso contrário.

### Código inicial
```python
def operacoes_equacao_normal(n, d):
    pass


def operacoes_gd(n, d, epocas):
    pass


def metodo_mais_barato(n, d, epocas):
    pass
```

### Solução
```python
def operacoes_equacao_normal(n, d):
    p = d + 1
    return n * p ** 2 + p ** 3


def operacoes_gd(n, d, epocas):
    p = d + 1
    return 2 * n * p * epocas


def metodo_mais_barato(n, d, epocas):
    if operacoes_equacao_normal(n, d) <= operacoes_gd(n, d, epocas):
        return "equacao_normal"
    return "gradiente"
```

### Dicas
1. O intercepto também é um coeficiente: $p = d + 1$.
2. O gradiente paga o custo de uma época tantas vezes quantas forem as épocas.
3. No empate, a equação normal é a escolhida.

### Verificação
```json
[
  { "id": "eq-pequena", "checkpoint": 1, "kind": "call", "function": "operacoes_equacao_normal", "args": [1000, 10],
    "expected": 122331, "type": "int", "name": "n = 1000 e d = 10: 1000·11² + 11³",
    "hint": "Use p = d + 1 nas duas parcelas." },
  { "id": "eq-larga", "checkpoint": 1, "kind": "call", "function": "operacoes_equacao_normal", "args": [100, 999],
    "expected": 1100000000, "name": "n = 100 e d = 999: o termo p³ domina",
    "hint": "Resolver o sistema custa p³." },
  { "id": "gd", "checkpoint": 2, "kind": "call", "function": "operacoes_gd", "args": [1000, 10, 100],
    "expected": 2200000, "type": "int", "name": "n = 1000, d = 10 e 100 épocas: 2·1000·11·100",
    "hint": "Dois produtos por época, e todas as épocas contam." },
  { "id": "gd-uma-epoca", "checkpoint": 2, "kind": "call", "function": "operacoes_gd", "args": [50, 3, 1],
    "expected": 400, "name": "Uma época com n = 50 e d = 3: 2·50·4" },
  { "id": "poucas-colunas", "checkpoint": 3, "kind": "call", "function": "metodo_mais_barato", "args": [1000, 10, 100],
    "expected": "equacao_normal", "name": "Poucas colunas: a equação normal é mais barata" },
  { "id": "muitas-colunas", "checkpoint": 3, "kind": "call", "function": "metodo_mais_barato", "args": [1000, 5000, 100],
    "expected": "gradiente", "name": "Muitas colunas: o gradiente é mais barato" },
  { "id": "empate", "checkpoint": 3, "kind": "call", "function": "metodo_mais_barato", "args": [1, 0, 1],
    "expected": "equacao_normal", "name": "No empate (2 contra 2), a equação normal",
    "hint": "Menor ou igual." },
  { "id": "fronteira", "checkpoint": 3, "kind": "call", "function": "metodo_mais_barato", "args": [1000, 600, 300],
    "expected": "gradiente", "name": "n = 1000, d = 600 e 300 épocas: o gradiente ainda ganha" }
]
```

### Soluções erradas
```python name="usa d no lugar de d + 1"
def operacoes_equacao_normal(n, d):
    return n * d ** 2 + d ** 3


def operacoes_gd(n, d, epocas):
    return 2 * n * d * epocas


def metodo_mais_barato(n, d, epocas):
    if operacoes_equacao_normal(n, d) <= operacoes_gd(n, d, epocas):
        return "equacao_normal"
    return "gradiente"
```
```python name="esquece a resolução do sistema"
def operacoes_equacao_normal(n, d):
    p = d + 1
    return n * p ** 2


def operacoes_gd(n, d, epocas):
    p = d + 1
    return 2 * n * p * epocas


def metodo_mais_barato(n, d, epocas):
    if operacoes_equacao_normal(n, d) <= operacoes_gd(n, d, epocas):
        return "equacao_normal"
    return "gradiente"
```
```python name="um produto por época"
def operacoes_equacao_normal(n, d):
    p = d + 1
    return n * p ** 2 + p ** 3


def operacoes_gd(n, d, epocas):
    p = d + 1
    return n * p * epocas


def metodo_mais_barato(n, d, epocas):
    if operacoes_equacao_normal(n, d) <= operacoes_gd(n, d, epocas):
        return "equacao_normal"
    return "gradiente"
```
```python name="esquece as épocas"
def operacoes_equacao_normal(n, d):
    p = d + 1
    return n * p ** 2 + p ** 3


def operacoes_gd(n, d, epocas):
    p = d + 1
    return 2 * n * p


def metodo_mais_barato(n, d, epocas):
    if operacoes_equacao_normal(n, d) <= operacoes_gd(n, d, epocas):
        return "equacao_normal"
    return "gradiente"
```
```python name="empate vai para o gradiente"
def operacoes_equacao_normal(n, d):
    p = d + 1
    return n * p ** 2 + p ** 3


def operacoes_gd(n, d, epocas):
    p = d + 1
    return 2 * n * p * epocas


def metodo_mais_barato(n, d, epocas):
    if operacoes_equacao_normal(n, d) < operacoes_gd(n, d, epocas):
        return "equacao_normal"
    return "gradiente"
```

## Passo 7 · Quiz · Exata ou iterativa

### Pergunta
Um conjunto tem as colunas `area_m2`, `area_cm2` (a mesma área vezes 10 000) e `quartos`. A equação normal resolvida com `np.linalg.solve` no executor devolve coeficientes enormes, de sinais opostos, sem nenhum erro. O que está acontecendo, e o que resolve?
- [ ] O `solve` é instável com números grandes; trocar por `np.linalg.inv` resolve
- [x] As duas áreas são colineares, e $X'^\top X'$ é singular (ou quase): a solução não é única. Remover uma das áreas, usar o `lstsq` ou regularizar com ridge resolve
- [ ] Faltou padronizar: com as colunas padronizadas, a matriz deixa de ser singular
- [ ] É o ruído dos dados; com mais linhas, os coeficientes se estabilizam
> Uma coluna é múltipla da outra, então o posto de $X'$ é menor que o número de colunas, e infinitos coeficientes dão as mesmas previsões. A inversa sofre do mesmo problema (e pior); padronizar não desfaz a colinearidade (as duas colunas padronizadas ficam iguais); e mais linhas não mudam o posto. Os remédios são tirar a redundância, pedir a solução de menor norma ao `lstsq` ou somar $\lambda I$, o ridge.

### Pergunta
Com $n = 2\,000$ exemplos e $d = 20$ atributos, o gradiente precisa de umas 500 épocas para convergir. Pela contagem do passo 6, qual método é mais barato?
- [x] A equação normal: cerca de $2000 \cdot 21^2 + 21^3 \approx 9 \cdot 10^5$ multiplicações, contra $2 \cdot 2000 \cdot 21 \cdot 500 = 4{,}2 \cdot 10^7$ do gradiente
- [ ] O gradiente, porque cada época custa só $O(nd)$
- [ ] Os dois custam o mesmo, porque chegam à mesma solução
- [ ] A equação normal só seria mais barata com mais colunas que linhas
> Com poucas colunas, a equação normal resolve tudo de uma vez por menos do que 500 épocas custam. Cada época do gradiente é barata, mas são muitas. Chegar à mesma solução não iguala o custo. E com mais colunas que linhas a matriz é singular, e a equação normal nem tem solução única.

### Pergunta
Um colega verifica se a matriz é singular com `np.linalg.det(Xb.T @ Xb) == 0`, numa tabela em que a coluna `total` é a soma exata das colunas `a` e `b`. A função diz que não é singular. Por quê?
- [ ] Porque `total = a + b` não é colinearidade: só colunas repetidas tornam a matriz singular
- [x] Porque o determinante calculado em ponto flutuante sai um número minúsculo, como $10^{-10}$, e não exatamente zero; o posto (`np.linalg.matrix_rank`, com a coluna de uns) é o teste certo
- [ ] Porque o determinante só pode ser usado sem a coluna de uns
- [ ] Porque a matriz é singular só quando há mais colunas que linhas
> Uma coluna que é combinação linear de outras torna a matriz singular, mas os arredondamentos deixam o determinante um pouco diferente de zero (no executor, $-3{,}5 \cdot 10^{-10}$ num caso parecido). O `matrix_rank` usa os valores singulares com uma tolerância e acerta. Mais colunas que linhas é só uma das causas.
