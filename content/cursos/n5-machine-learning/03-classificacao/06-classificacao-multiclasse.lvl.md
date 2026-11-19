---
slug: n5-m3-06-classificacao-multiclasse
titulo: 'Classificação multiclasse: softmax, um-contra-todos e métricas'
descricao: Estender a logística com softmax e entropia cruzada categórica, estratégias OvR/OvO, matriz de confusão k×k e métricas macro/ponderadas, nos dígitos do scikit-learn.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- scikit-learn
xp: 120
tempo_min: 50
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Implementar softmax estável e a regressão logística multinomial do zero
- Aplicar um-contra-todos com classificadores binários e comparar com softmax
- Avaliar com matriz de confusão k×k e métricas macro/ponderadas nos dígitos (load_digits)
---

## Passo 1 · Leitura · De duas para k classes

Uma câmera fictícia de uma esteira fotografa peças marcadas com um de cinco símbolos: **mais**, **xis**, **quadrado**, **barra** e **traço**. Cada foto é uma grade de 5 × 5 pixels com ruído, achatada num vetor de 25 números. O arquivo `padroes.py` da lição gera essas imagens com `np.random.default_rng(semente)`, e os rótulos são inteiros de 0 a 4, na ordem dos nomes. É o primeiro problema de "visão computacional" do curso, e ele tem $k = 5$ classes.

A logística da m3-01 dava uma probabilidade, a da classe 1. Para $k$ classes, o modelo calcula um **logit por classe**, $z_c = x \cdot w_c + b_c$, e a **softmax** transforma os $k$ logits em $k$ probabilidades positivas que somam 1:

$$
\text{softmax}(z)_c = \frac{e^{z_c}}{\sum_{j=1}^{k} e^{z_j}}
$$

Com $n$ exemplos, os pesos formam uma matriz $W$ de forma $(d, k)$, os interceptos um vetor $b$ de tamanho $k$, e `X @ W + b` dá a matriz de logits $(n, k)$, uma linha por exemplo. A softmax age **linha a linha**. Com $k = 2$, ela se reduz à sigmoide do logit $z_1 - z_0$.

A conta direta tem o problema da m3-01, agora pior: com um logit 1000, $e^{1000}$ estoura para `inf`, e `inf / inf` dá `nan`. A saída usa uma propriedade simples: somar a mesma constante a todos os logits **de uma linha** não muda a softmax, porque o fator $e^{\text{constante}}$ aparece em cima e embaixo. Subtraindo o máximo de cada linha, o maior expoente vira 0 e nada estoura:

$$
\text{softmax}(z) = \text{softmax}(z - \max_j z_j)
$$

A constante precisa ser **da linha**. Subtrair o máximo de cada coluna, ou o máximo da matriz inteira, muda o resultado ou volta a estourar.

O rótulo também muda de forma. Para treinar, a classe $c$ de cada exemplo vira um vetor **one-hot**: $k$ posições, todas zero, exceto a posição $c$, que vale 1. A matriz $Y$ de forma $(n, k)$ fica no mesmo formato das probabilidades previstas $P$, e o erro de cada exemplo é a diferença $P - Y$, linha a linha.

```python
Y = np.zeros((len(y), k))
Y[np.arange(len(y)), y] = 1.0   # linha i, coluna y[i]
```

Um rótulo fora de $0, \dots, k - 1$ é um erro de dados, e o numpy não avisa de todos: o índice `-1` é aceito e marca a **última** coluna. A função one-hot precisa conferir os rótulos antes.

## Passo 2 · Previsão · softmax de [1000, 1001]

O programa calcula a softmax de dois logits grandes, primeiro direto e depois subtraindo o máximo. Leia sem executar e digite o que ele imprime.

### Código
```python
import numpy as np

z = np.array([1000.0, 1001.0])
ingenua = np.exp(z) / np.exp(z).sum()
print(ingenua.tolist())
deslocado = z - z.max()
print(deslocado.tolist())
estavel = np.exp(deslocado) / np.exp(deslocado).sum()
print(estavel.round(3).tolist())
print(round(float(estavel.sum()), 6))
```

### Dicas
1. Em `float64`, $e^{1000}$ é `inf`, e `inf / inf` é `nan`.
2. Depois de subtrair o máximo, a softmax de $[-1, 0]$ é $\left[\frac{e^{-1}}{e^{-1} + 1}, \frac{1}{e^{-1} + 1}\right]$, a sigmoide de $-1$ e de $1$.
3. $\sigma(1) \approx 0{,}731$.

### Saída esperada
```text
[nan, nan]
[-1.0, 0.0]
[0.269, 0.731]
1.0
```

## Passo 3 · Exercício · Softmax e one-hot
modo: lacunas

Complete as lacunas (`___`) da softmax estável e da codificação one-hot.

### Instruções
1. `softmax(Z)` recebe uma matriz de logits (uma linha por exemplo) e devolve um array da mesma forma com a softmax de **cada linha**: valores positivos que somam 1 em cada linha.
2. A conta subtrai o máximo de cada linha antes da exponencial, e não dá `nan` com logits na casa dos milhares.
3. `one_hot(y, k)` devolve um array `float` de forma `(len(y), k)` com 1 na coluna do rótulo de cada linha e 0 no resto.
4. Se algum rótulo estiver fora de `0..k-1` (negativo, ou `k` ou mais), `one_hot` levanta `ValueError`.

### Código inicial
```python
import numpy as np


def softmax(Z):
    Z = np.asarray(Z, dtype=float)
    Z = ___
    E = np.exp(Z)
    return E / E.sum(axis=___, keepdims=True)


def one_hot(y, k):
    y = np.asarray(y)
    if np.any(___):
        raise ValueError("rótulo fora de 0..k-1")
    Y = np.zeros((len(y), k))
    Y[np.arange(len(y)), ___] = 1.0
    return Y
```

### Solução
```python
import numpy as np


def softmax(Z):
    Z = np.asarray(Z, dtype=float)
    Z = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Z)
    return E / E.sum(axis=1, keepdims=True)


def one_hot(y, k):
    y = np.asarray(y)
    if np.any((y < 0) | (y >= k)):
        raise ValueError("rótulo fora de 0..k-1")
    Y = np.zeros((len(y), k))
    Y[np.arange(len(y)), y] = 1.0
    return Y
```

### Dicas
1. Numa matriz `(n, k)`, as linhas são os exemplos: o máximo e a soma de cada linha correm ao longo do eixo 1, e o `keepdims=True` mantém a forma `(n, 1)` para o broadcasting.
2. Um rótulo inválido pode ser pequeno demais ou grande demais; combine as duas condições com `|`.
3. A indexação `Y[linhas, colunas]` com dois arrays marca um elemento por linha.

### Verificação
```json
[
  { "id": "softmax-valores", "checkpoint": 1, "kind": "expr", "expr": "softmax([[1.0, 2.0, 3.0]]).tolist()",
    "expected": [[0.09003057317038046, 0.24472847105479764, 0.6652409557748218]], "tolerance": 1e-12,
    "name": "Softmax de uma linha com três logits" },
  { "id": "softmax-linhas", "checkpoint": 1, "kind": "expr", "expr": "softmax([[1.0, 2.0], [3.0, 1.0]]).tolist()",
    "expected": [[0.2689414213699951, 0.7310585786300049], [0.8807970779778823, 0.11920292202211755]], "tolerance": 1e-12,
    "name": "Cada linha é normalizada separadamente",
    "hint": "O máximo e a soma são de cada linha (eixo 1), não de cada coluna." },
  { "id": "soma-um", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np\nP = softmax(np.random.default_rng(5).normal(0, 3, size=(6, 4)))",
    "expr": "[list(P.shape), bool(np.allclose(P.sum(axis=1), 1.0)), bool((P > 0).all())]", "expected": [[6, 4], true, true],
    "name": "Mesma forma, linhas somando 1 e valores positivos (6 × 4 sorteada)" },
  { "id": "logits-grandes", "checkpoint": 2, "kind": "expr", "expr": "softmax([[1000.0, 1001.0]]).tolist()",
    "expected": [[0.2689414213699951, 0.7310585786300049]], "tolerance": 1e-12,
    "name": "Logits 1000 e 1001, sem nan",
    "hint": "Subtraia o máximo antes da exponencial." },
  { "id": "escalas-diferentes", "checkpoint": 2, "kind": "expr", "expr": "softmax([[0.0, 1.0], [1000.0, 1001.0]]).tolist()",
    "expected": [[0.2689414213699951, 0.7310585786300049], [0.2689414213699951, 0.7310585786300049]], "tolerance": 1e-12,
    "name": "Uma linha pequena e uma grande dão a mesma softmax",
    "hint": "A constante subtraída precisa ser o máximo de cada linha; o máximo da matriz inteira faz a linha pequena virar e^{-1000}." },
  { "id": "one-hot-valores", "checkpoint": 3, "kind": "expr", "expr": "one_hot([0, 2, 1], 3).tolist()",
    "expected": [[1.0, 0.0, 0.0], [0.0, 0.0, 1.0], [0.0, 1.0, 0.0]],
    "name": "Três rótulos, três classes" },
  { "id": "one-hot-forma", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nY = one_hot(np.array([0, 1]), 4)",
    "expr": "[list(Y.shape), str(Y.dtype), Y.tolist()]", "expected": [[2, 4], "float64", [[1.0, 0.0, 0.0, 0.0], [0.0, 1.0, 0.0, 0.0]]],
    "name": "Com k = 4, quatro colunas mesmo que as classes 2 e 3 não apareçam" },
  { "id": "rotulo-igual-a-k", "checkpoint": 4, "kind": "expr", "expr": "one_hot([0, 3], 3)", "raises": "ValueError",
    "name": "Rótulo igual a k é recusado com ValueError",
    "hint": "Os rótulos válidos vão de 0 a k - 1." },
  { "id": "rotulo-negativo", "checkpoint": 4, "kind": "expr", "expr": "one_hot([0, -1], 3)", "raises": "ValueError",
    "name": "Rótulo negativo é recusado (o numpy aceitaria -1 como a última coluna)",
    "hint": "Confira também o limite de baixo." }
]
```

### Soluções erradas
```python name="sem subtrair o máximo"
import numpy as np


def softmax(Z):
    Z = np.asarray(Z, dtype=float)
    Z = Z
    E = np.exp(Z)
    return E / E.sum(axis=1, keepdims=True)


def one_hot(y, k):
    y = np.asarray(y)
    if np.any((y < 0) | (y >= k)):
        raise ValueError("rótulo fora de 0..k-1")
    Y = np.zeros((len(y), k))
    Y[np.arange(len(y)), y] = 1.0
    return Y
```
```python name="máximo da matriz inteira"
import numpy as np


def softmax(Z):
    Z = np.asarray(Z, dtype=float)
    Z = Z - Z.max()
    E = np.exp(Z)
    return E / E.sum(axis=1, keepdims=True)


def one_hot(y, k):
    y = np.asarray(y)
    if np.any((y < 0) | (y >= k)):
        raise ValueError("rótulo fora de 0..k-1")
    Y = np.zeros((len(y), k))
    Y[np.arange(len(y)), y] = 1.0
    return Y
```
```python name="máximo de cada coluna"
import numpy as np


def softmax(Z):
    Z = np.asarray(Z, dtype=float)
    Z = Z - Z.max(axis=0, keepdims=True)
    E = np.exp(Z)
    return E / E.sum(axis=1, keepdims=True)


def one_hot(y, k):
    y = np.asarray(y)
    if np.any((y < 0) | (y >= k)):
        raise ValueError("rótulo fora de 0..k-1")
    Y = np.zeros((len(y), k))
    Y[np.arange(len(y)), y] = 1.0
    return Y
```
```python name="normaliza as colunas"
import numpy as np


def softmax(Z):
    Z = np.asarray(Z, dtype=float)
    Z = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Z)
    return E / E.sum(axis=0, keepdims=True)


def one_hot(y, k):
    y = np.asarray(y)
    if np.any((y < 0) | (y >= k)):
        raise ValueError("rótulo fora de 0..k-1")
    Y = np.zeros((len(y), k))
    Y[np.arange(len(y)), y] = 1.0
    return Y
```
```python name="não confere rótulos negativos"
import numpy as np


def softmax(Z):
    Z = np.asarray(Z, dtype=float)
    Z = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Z)
    return E / E.sum(axis=1, keepdims=True)


def one_hot(y, k):
    y = np.asarray(y)
    if np.any(y >= k):
        raise ValueError("rótulo fora de 0..k-1")
    Y = np.zeros((len(y), k))
    Y[np.arange(len(y)), y] = 1.0
    return Y
```
```python name="limite de cima com maior estrito"
import numpy as np


def softmax(Z):
    Z = np.asarray(Z, dtype=float)
    Z = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Z)
    return E / E.sum(axis=1, keepdims=True)


def one_hot(y, k):
    y = np.asarray(y)
    if np.any((y < 0) | (y > k)):
        raise ValueError("rótulo fora de 0..k-1")
    Y = np.zeros((len(y), k))
    Y[np.arange(len(y)), y] = 1.0
    return Y
```
```python name="rótulos tratados como 1..k"
import numpy as np


def softmax(Z):
    Z = np.asarray(Z, dtype=float)
    Z = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Z)
    return E / E.sum(axis=1, keepdims=True)


def one_hot(y, k):
    y = np.asarray(y)
    if np.any((y < 0) | (y >= k)):
        raise ValueError("rótulo fora de 0..k-1")
    Y = np.zeros((len(y), k))
    Y[np.arange(len(y)), y - 1] = 1.0
    return Y
```

## Passo 4 · Leitura · Entropia cruzada categórica

O custo é a generalização direta da entropia cruzada binária: para cada exemplo, o logaritmo da probabilidade dada à classe **certa**, com sinal trocado e média sobre os exemplos. Com a matriz one-hot $Y$, a soma escolhe exatamente esse termo:

$$
L(W, b) = -\frac{1}{n} \sum_{i=1}^{n} \sum_{c=1}^{k} Y_{ic} \log P_{ic}, \qquad P = \text{softmax}(XW + b)
$$

Com $k = 2$, é a entropia cruzada da m3-01. E o gradiente tem a mesma forma bonita, agora com matrizes:

$$
\nabla_W L = \frac{1}{n} X^\top (P - Y), \qquad \nabla_b L = \frac{1}{n} \sum_{i=1}^{n} (P_i - Y_i)
$$

As formas conferem: $X^\top$ é $(d, n)$, $P - Y$ é $(n, k)$, e o produto é $(d, k)$, a forma de $W$. O gradiente de $b$ é a média das linhas de $P - Y$, um vetor de tamanho $k$. O treino é o mesmo laço de sempre:

```python
W, b = np.zeros((d, k)), np.zeros(k)
for _ in range(epocas):
    erro = softmax(X @ W + b) - Y
    W = W - taxa * X.T @ erro / n
    b = b - taxa * erro.mean(axis=0)
```

Na previsão, a classe é a coluna de maior probabilidade, que é a mesma de maior logit: `np.argmax(X @ W + b, axis=1)`. Não é preciso calcular a softmax só para decidir.

A `LogisticRegression` do scikit-learn usa essa regressão **multinomial** sozinha quando `y` tem mais de duas classes, com o solver padrão. O parâmetro `multi_class` das versões antigas saiu no scikit-learn 1.8: `LogisticRegression(multi_class="ovr")` dá `TypeError: LogisticRegression.__init__() got an unexpected keyword argument 'multi_class'`. Para comparar com o gradiente descendente, use de novo `C=np.inf`.

Nos símbolos 5 × 5 com 500 imagens de treino, taxa 0,5 e 1 000 épocas, o seu modelo do zero acerta cerca de 72 % das imagens de teste e concorda com a `LogisticRegression(C=np.inf)` em 98 % delas. As confusões não são aleatórias: "mais" se confunde com "barra" e com "traço", que são pedaços dele, e o "quadrado" quase nunca erra.

Esta lição é a ponte direta para o Nível 6. Um perceptron de várias camadas termina exatamente com esta camada: logits, softmax e entropia cruzada categórica, com o gradiente $P - Y$ voltando pela regra da cadeia para as camadas anteriores.

## Passo 5 · Exercício · Treinar softmax

Escreva o treino da regressão softmax por gradiente descendente. A `softmax` do passo anterior já está no código, e o arquivo `padroes.py` gera as imagens que a correção usa.

### Instruções
1. `treinar_softmax(X, Y, taxa=0.5, epocas=1000)` recebe `X` de forma `(n, d)` e o one-hot `Y` de forma `(n, k)`, começa com `W` de zeros `(d, k)` e `b` de zeros `(k,)`, e a cada época dá um passo de gradiente descendente com o gradiente médio do conjunto inteiro.
2. Devolve a tupla `(W, b)` de arrays do numpy. Com `epocas=0`, devolve os zeros.
3. Nos símbolos de `padroes.py`, o modelo treinado acerta pelo menos 65 % das imagens de teste e prevê a mesma classe que a `LogisticRegression(C=np.inf)` em pelo menos 95 % delas.
4. Implemente sem o scikit-learn.

### Código inicial
```python
import numpy as np


def softmax(Z):
    Z = np.asarray(Z, dtype=float)
    Z = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Z)
    return E / E.sum(axis=1, keepdims=True)


def treinar_softmax(X, Y, taxa=0.5, epocas=1000):
    pass
```
```python path=padroes.py
import numpy as np

NOMES = ["mais", "xis", "quadrado", "barra", "traco"]


def _desenhos():
    mais = np.zeros((5, 5))
    mais[2, :] = 1
    mais[:, 2] = 1
    xis = np.eye(5) + np.fliplr(np.eye(5))
    xis[2, 2] = 1
    quadrado = np.ones((5, 5))
    quadrado[1:4, 1:4] = 0
    barra = np.zeros((5, 5))
    barra[:, 2] = 1
    traco = np.zeros((5, 5))
    traco[2, :] = 1
    return np.array([mais, xis, quadrado, barra, traco]).reshape(5, 25)


def gerar_padroes(n_por_classe, semente, ruido=1.2):
    rng = np.random.default_rng(semente)
    y = np.repeat(np.arange(5), n_por_classe)
    X = _desenhos()[y] + rng.normal(0.0, ruido, size=(len(y), 25))
    return X, y
```

### Solução
```python
import numpy as np


def softmax(Z):
    Z = np.asarray(Z, dtype=float)
    Z = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Z)
    return E / E.sum(axis=1, keepdims=True)


def treinar_softmax(X, Y, taxa=0.5, epocas=1000):
    n = len(X)
    W = np.zeros((X.shape[1], Y.shape[1]))
    b = np.zeros(Y.shape[1])
    for _ in range(epocas):
        erro = softmax(X @ W + b) - Y
        W = W - taxa * X.T @ erro / n
        b = b - taxa * erro.mean(axis=0)
    return W, b
```
```python path=padroes.py
import numpy as np

NOMES = ["mais", "xis", "quadrado", "barra", "traco"]


def _desenhos():
    mais = np.zeros((5, 5))
    mais[2, :] = 1
    mais[:, 2] = 1
    xis = np.eye(5) + np.fliplr(np.eye(5))
    xis[2, 2] = 1
    quadrado = np.ones((5, 5))
    quadrado[1:4, 1:4] = 0
    barra = np.zeros((5, 5))
    barra[:, 2] = 1
    traco = np.zeros((5, 5))
    traco[2, :] = 1
    return np.array([mais, xis, quadrado, barra, traco]).reshape(5, 25)


def gerar_padroes(n_por_classe, semente, ruido=1.2):
    rng = np.random.default_rng(semente)
    y = np.repeat(np.arange(5), n_por_classe)
    X = _desenhos()[y] + rng.normal(0.0, ruido, size=(len(y), 25))
    return X, y
```

### Dicas
1. O erro de cada época é `softmax(X @ W + b) - Y`, uma matriz `(n, k)`.
2. O gradiente de `W` é `X.T @ erro / n`; o de `b` é a média das linhas do erro.
3. Ande no sentido contrário ao gradiente, nos dois parâmetros, a cada época.

### Verificação
```json
[
  { "id": "zero-epocas", "checkpoint": 2, "kind": "expr",
    "setup": "import numpy as np\nW, b = treinar_softmax(np.ones((4, 2)), np.eye(3)[[0, 1, 2, 1]], 0.5, 0)",
    "expr": "[W.tolist(), b.tolist()]", "expected": [[[0.0, 0.0, 0.0], [0.0, 0.0, 0.0]], [0.0, 0.0, 0.0]],
    "name": "Com zero épocas, W (d × k) e b (k) zerados",
    "hint": "W tem uma linha por atributo e uma coluna por classe." },
  { "id": "uma-epoca", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np\nX = np.array([[1.0, 2.0], [0.0, -1.0], [3.0, 0.5], [-1.0, 1.0]])\nW, b = treinar_softmax(X, np.eye(3)[[0, 1, 2, 1]], 0.5, 1)",
    "expr": "[W.tolist(), b.tolist()]",
    "expected": [[[0.0, -0.25, 0.25], [0.14583333333333334, -0.10416666666666669, -0.04166666666666666]], [-0.04166666666666665, 0.08333333333333336, -0.04166666666666665]], "tolerance": 1e-12,
    "name": "Uma época com taxa 0,5 em quatro exemplos e três classes",
    "hint": "Partindo de zeros, todas as probabilidades valem 1/3; o passo é - taxa * X.T @ (P - Y) / n." },
  { "id": "tres-epocas", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np\nX = np.array([[1.0, 2.0], [0.0, -1.0], [3.0, 0.5], [-1.0, 1.0]])\nW, b = treinar_softmax(X, np.eye(3)[[0, 1, 2, 1]], 0.5, 3)",
    "expr": "[W.tolist(), b.tolist()]",
    "expected": [[[0.022842184321539095, -0.5217501228704708, 0.4989079385489318], [0.3595992212629584, -0.21973385632501252, -0.13986536493794577]], [-0.12498150098727001, 0.2902780139682028, -0.1652965129809327]], "tolerance": 1e-12,
    "name": "Três épocas: o intercepto também é atualizado",
    "hint": "Cada época usa os W e b atualizados na anterior." },
  { "id": "tipos", "checkpoint": 2, "kind": "expr",
    "setup": "import numpy as np\nr = treinar_softmax(np.ones((6, 4)), np.eye(5)[[0, 1, 2, 3, 4, 0]], 0.1, 2)",
    "expr": "[type(r).__name__, type(r[0]).__name__, list(r[0].shape), type(r[1]).__name__, list(r[1].shape)]", "expected": ["tuple", "ndarray", [4, 5], "ndarray", [5]],
    "name": "Devolve (W de forma (d, k), b de forma (k,))" },
  { "id": "acuracia", "checkpoint": 3, "kind": "expr",
    "setup": "import numpy as np\nfrom padroes import gerar_padroes\nXtr, ytr = gerar_padroes(100, 1)\nXte, yte = gerar_padroes(40, 2)\nW, b = treinar_softmax(Xtr, np.eye(5)[ytr], 0.5, 1000)",
    "expr": "bool(np.mean(np.argmax(Xte @ W + b, axis=1) == yte) >= 0.65)", "expected": true,
    "name": "Acerta pelo menos 65 % das 200 imagens de teste",
    "hint": "A expressão prevê a classe de maior logit e compara com os rótulos de teste." },
  { "id": "concordancia", "checkpoint": 3, "kind": "expr",
    "setup": "import numpy as np\nimport warnings\nfrom sklearn.linear_model import LogisticRegression\nfrom padroes import gerar_padroes\nXtr, ytr = gerar_padroes(100, 1)\nXte, yte = gerar_padroes(40, 2)\nwith warnings.catch_warnings():\n    warnings.simplefilter('ignore')\n    ref = LogisticRegression(C=np.inf).fit(Xtr, ytr)\nW, b = treinar_softmax(Xtr, np.eye(5)[ytr], 0.5, 1000)",
    "expr": "bool(np.mean(np.argmax(Xte @ W + b, axis=1) == ref.predict(Xte)) >= 0.95)", "expected": true,
    "name": "Concorda com a LogisticRegression(C=np.inf) em pelo menos 95 % das imagens de teste",
    "hint": "A comparação é entre a sua classe de maior logit e a classe prevista pela biblioteca, treinada nos mesmos dados." },
  { "id": "sem-sklearn", "checkpoint": 4, "kind": "source", "rule": { "type": "not_calls", "name": "sklearn" },
    "name": "Implementa sem o scikit-learn" }
]
```

### Soluções erradas
```python name="gradiente somado (sem dividir por n)"
import numpy as np


def softmax(Z):
    Z = np.asarray(Z, dtype=float)
    Z = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Z)
    return E / E.sum(axis=1, keepdims=True)


def treinar_softmax(X, Y, taxa=0.5, epocas=1000):
    W = np.zeros((X.shape[1], Y.shape[1]))
    b = np.zeros(Y.shape[1])
    for _ in range(epocas):
        erro = softmax(X @ W + b) - Y
        W = W - taxa * X.T @ erro
        b = b - taxa * erro.sum(axis=0)
    return W, b
```
```python name="sobe o gradiente"
import numpy as np


def softmax(Z):
    Z = np.asarray(Z, dtype=float)
    Z = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Z)
    return E / E.sum(axis=1, keepdims=True)


def treinar_softmax(X, Y, taxa=0.5, epocas=1000):
    n = len(X)
    W = np.zeros((X.shape[1], Y.shape[1]))
    b = np.zeros(Y.shape[1])
    for _ in range(epocas):
        erro = softmax(X @ W + b) - Y
        W = W + taxa * X.T @ erro / n
        b = b + taxa * erro.mean(axis=0)
    return W, b
```
```python name="não atualiza o intercepto"
import numpy as np


def softmax(Z):
    Z = np.asarray(Z, dtype=float)
    Z = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Z)
    return E / E.sum(axis=1, keepdims=True)


def treinar_softmax(X, Y, taxa=0.5, epocas=1000):
    n = len(X)
    W = np.zeros((X.shape[1], Y.shape[1]))
    b = np.zeros(Y.shape[1])
    for _ in range(epocas):
        erro = softmax(X @ W + b) - Y
        W = W - taxa * X.T @ erro / n
    return W, b
```
```python name="softmax normalizada nas colunas"
import numpy as np


def softmax(Z):
    Z = np.asarray(Z, dtype=float)
    Z = Z - Z.max(axis=0, keepdims=True)
    E = np.exp(Z)
    return E / E.sum(axis=0, keepdims=True)


def treinar_softmax(X, Y, taxa=0.5, epocas=1000):
    n = len(X)
    W = np.zeros((X.shape[1], Y.shape[1]))
    b = np.zeros(Y.shape[1])
    for _ in range(epocas):
        erro = softmax(X @ W + b) - Y
        W = W - taxa * X.T @ erro / n
        b = b - taxa * erro.mean(axis=0)
    return W, b
```
```python name="intercepto com a média no eixo errado"
import numpy as np


def softmax(Z):
    Z = np.asarray(Z, dtype=float)
    Z = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Z)
    return E / E.sum(axis=1, keepdims=True)


def treinar_softmax(X, Y, taxa=0.5, epocas=1000):
    n = len(X)
    W = np.zeros((X.shape[1], Y.shape[1]))
    b = np.zeros(Y.shape[1])
    for _ in range(epocas):
        erro = softmax(X @ W + b) - Y
        W = W - taxa * X.T @ erro / n
        b = b - taxa * erro.mean(axis=1)
    return W, b
```
```python name="usa a LogisticRegression"
import numpy as np
from sklearn.linear_model import LogisticRegression


def softmax(Z):
    Z = np.asarray(Z, dtype=float)
    Z = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Z)
    return E / E.sum(axis=1, keepdims=True)


def treinar_softmax(X, Y, taxa=0.5, epocas=1000):
    modelo = LogisticRegression(C=np.inf).fit(X, np.argmax(Y, axis=1))
    return modelo.coef_.T, modelo.intercept_
```

## Passo 6 · Leitura · Um contra todos e a matriz k × k

A softmax não é o único jeito de classificar $k$ classes. Duas estratégias reaproveitam qualquer classificador **binário**:

- **um contra todos** (OvR, one-vs-rest): treina $k$ classificadores, o $c$-ésimo com o rótulo binário "é a classe $c$?" (`y == c`). Para prever, cada um dá um score, e vence a classe de **maior score**;
- **um contra um** (OvO): treina um classificador para cada par de classes, $k(k-1)/2$ ao todo (10 com 5 classes), e cada um vota; vence a classe com mais votos. É o que o `SVC` do módulo 6 faz por dentro.

O detalhe que pega no OvR é **qual score comparar**. A saída do `predict` de cada classificador é 0 ou 1: com dois classificadores dizendo 1, ou nenhum, a decisão vira empate e cai na primeira classe. O certo é comparar os scores contínuos, o `decision_function` (o logit $Xw + b$ de cada logística) ou a probabilidade da classe positiva, `predict_proba(X)[:, 1]`. Pegar a coluna 0 do `predict_proba` compara a probabilidade de **não** ser a classe. Como os $k$ modelos foram treinados separados, os scores não estão exatamente na mesma escala; na prática a comparação funciona bem, e o `OneVsRestClassifier` do scikit-learn faz exatamente isso:

```python
from sklearn.multiclass import OneVsRestClassifier

OneVsRestClassifier(LogisticRegression()).fit(X, y).predict(X_novo)
```

Para avaliar, a matriz de confusão passa a ser $k \times k$: a linha é a classe verdadeira e a coluna é a prevista, nas duas em ordem crescente de rótulo. A diagonal tem os acertos, e o resto mostra **quais** classes se confundem. Nos símbolos, a matriz do modelo softmax mostra 11 imagens de "barra" previstas como "mais" e 9 de "traço" previstas como "mais", enquanto o "quadrado" acerta 39 de 40. Para encontrar os pares problemáticos numa matriz grande, liste as células fora da diagonal da maior para a menor.

```python
from sklearn.metrics import classification_report, confusion_matrix

confusion_matrix(y_teste, y_previsto)                      # 5 × 5
classification_report(y_teste, y_previsto, target_names=NOMES)
```

As médias da m3-02 valem do mesmo jeito: a **macro** dá o mesmo peso a cada símbolo e a **ponderada** pesa pelo suporte de cada um. Com classes balanceadas, como aqui, as duas ficam perto; num problema em que um símbolo é raro, a macro denuncia o símbolo que o modelo não aprendeu.

## Passo 7 · Exercício · OvR e confusões

Escreva o um-contra-todos com `LogisticRegression` binárias e a função que lista os pares de classes mais confundidos.

### Instruções
1. `um_contra_todos(X, y, X_novo)` treina, para cada classe `c` de `np.unique(y)` (em ordem crescente), uma `LogisticRegression()` com o rótulo binário `y == c`.
2. Para cada linha de `X_novo`, devolve o **rótulo** da classe cujo classificador dá o maior `decision_function`, num array do numpy. O resultado é o mesmo do `OneVsRestClassifier(LogisticRegression())`.
3. `pares_mais_confundidos(matriz, n)` recebe uma matriz de confusão $k \times k$ (linha = verdadeira, coluna = prevista; lista ou array) e devolve uma lista com até `n` tuplas `(verdadeira, prevista, contagem)` de `int`s, só das células **fora da diagonal** com contagem maior que zero.
4. A lista vem da maior contagem para a menor; nos empates, em ordem crescente de `(verdadeira, prevista)`.

### Código inicial
```python
import numpy as np
from sklearn.linear_model import LogisticRegression


def um_contra_todos(X, y, X_novo):
    pass


def pares_mais_confundidos(matriz, n):
    pass
```
```python path=padroes.py
import numpy as np

NOMES = ["mais", "xis", "quadrado", "barra", "traco"]


def _desenhos():
    mais = np.zeros((5, 5))
    mais[2, :] = 1
    mais[:, 2] = 1
    xis = np.eye(5) + np.fliplr(np.eye(5))
    xis[2, 2] = 1
    quadrado = np.ones((5, 5))
    quadrado[1:4, 1:4] = 0
    barra = np.zeros((5, 5))
    barra[:, 2] = 1
    traco = np.zeros((5, 5))
    traco[2, :] = 1
    return np.array([mais, xis, quadrado, barra, traco]).reshape(5, 25)


def gerar_padroes(n_por_classe, semente, ruido=1.2):
    rng = np.random.default_rng(semente)
    y = np.repeat(np.arange(5), n_por_classe)
    X = _desenhos()[y] + rng.normal(0.0, ruido, size=(len(y), 25))
    return X, y
```

### Solução
```python
import numpy as np
from sklearn.linear_model import LogisticRegression


def um_contra_todos(X, y, X_novo):
    y = np.asarray(y)
    classes = np.unique(y)
    scores = np.column_stack([
        LogisticRegression().fit(X, (y == c).astype(int)).decision_function(X_novo) for c in classes
    ])
    return classes[np.argmax(scores, axis=1)]


def pares_mais_confundidos(matriz, n):
    M = np.asarray(matriz)
    pares = [
        (i, j, int(M[i, j]))
        for i in range(M.shape[0])
        for j in range(M.shape[1])
        if i != j and M[i, j] > 0
    ]
    pares.sort(key=lambda par: (-par[2], par[0], par[1]))
    return pares[:n]
```
```python path=padroes.py
import numpy as np

NOMES = ["mais", "xis", "quadrado", "barra", "traco"]


def _desenhos():
    mais = np.zeros((5, 5))
    mais[2, :] = 1
    mais[:, 2] = 1
    xis = np.eye(5) + np.fliplr(np.eye(5))
    xis[2, 2] = 1
    quadrado = np.ones((5, 5))
    quadrado[1:4, 1:4] = 0
    barra = np.zeros((5, 5))
    barra[:, 2] = 1
    traco = np.zeros((5, 5))
    traco[2, :] = 1
    return np.array([mais, xis, quadrado, barra, traco]).reshape(5, 25)


def gerar_padroes(n_por_classe, semente, ruido=1.2):
    rng = np.random.default_rng(semente)
    y = np.repeat(np.arange(5), n_por_classe)
    X = _desenhos()[y] + rng.normal(0.0, ruido, size=(len(y), 25))
    return X, y
```

### Dicas
1. Cada classificador binário vê o mesmo `X` e um `y` de zeros e uns; empilhe os `decision_function` como colunas, uma por classe.
2. O `argmax` devolve a posição da classe, e o rótulo está nessa posição de `np.unique(y)`.
3. Ordenar por `(-contagem, verdadeira, prevista)` resolve a ordem e os empates de uma vez.

### Verificação
```json
[
  { "id": "ovr-referencia", "checkpoint": 2, "kind": "expr",
    "setup": "import numpy as np\nfrom sklearn.linear_model import LogisticRegression\nfrom sklearn.multiclass import OneVsRestClassifier\nfrom padroes import gerar_padroes, NOMES\nX, y = gerar_padroes(40, 1)\nXn, yn = gerar_padroes(20, 2)\nnomes = np.array(NOMES)\nref = OneVsRestClassifier(LogisticRegression()).fit(X, nomes[y])",
    "expr": "um_contra_todos(X, nomes[y], Xn).tolist() == ref.predict(Xn).tolist()", "expected": true,
    "name": "As mesmas previsões do OneVsRestClassifier(LogisticRegression()) em 100 imagens",
    "hint": "A expressão compara os seus rótulos com os do OneVsRestClassifier: compare os decision_function, não as classes binárias de cada modelo." },
  { "id": "ovr-pequeno", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np\nX = np.array([[0.0, 0.0], [0.5, 0.2], [5.0, 0.0], [5.5, 0.3], [0.0, 5.0], [0.4, 5.5]])\ny = np.array([2, 2, 0, 0, 1, 1])",
    "expr": "um_contra_todos(X, y, np.array([[0.2, 0.1], [5.2, 0.2], [0.1, 5.2]])).tolist()", "expected": [2, 0, 1],
    "name": "Três grupos com rótulos fora de ordem: cada ponto vai para o grupo dele",
    "hint": "O rótulo binário de cada classificador é y == c, com c percorrendo np.unique(y)." },
  { "id": "ovr-rotulos", "checkpoint": 2, "kind": "expr",
    "setup": "import numpy as np\nX = np.array([[0.0, 0.0], [0.5, 0.2], [5.0, 0.0], [5.5, 0.3], [0.0, 5.0], [0.4, 5.5]])\ny = np.array(['mais', 'mais', 'xis', 'xis', 'barra', 'barra'])\nr = um_contra_todos(X, y, np.array([[0.2, 0.1], [5.2, 0.2], [0.1, 5.2]]))",
    "expr": "[type(r).__name__, r.tolist()]", "expected": ["ndarray", ["mais", "xis", "barra"]],
    "name": "Devolve um array com os rótulos, não as posições" },
  { "id": "pares-exemplo", "checkpoint": 4, "kind": "call", "function": "pares_mais_confundidos",
    "args": [[[5, 2, 0], [3, 6, 1], [0, 2, 7]], 3], "expected": [[1, 0, 3], [0, 1, 2], [2, 1, 2]],
    "name": "Os três pares mais confundidos, empate pela ordem (verdadeira, prevista)",
    "hint": "Do maior para o menor; (0, 1) e (2, 1) empatam com 2." },
  { "id": "pares-diagonal", "checkpoint": 3, "kind": "call", "function": "pares_mais_confundidos",
    "args": [[[50, 1], [0, 40]], 2], "expected": [[0, 1, 1]],
    "name": "A diagonal (acertos) e as células zeradas ficam de fora",
    "hint": "Só entram células com verdadeira diferente de prevista e contagem maior que zero." },
  { "id": "pares-todos", "checkpoint": 3, "kind": "call", "function": "pares_mais_confundidos",
    "args": [[[5, 2, 0], [3, 6, 1], [0, 2, 7]], 10], "expected": [[1, 0, 3], [0, 1, 2], [2, 1, 2], [1, 2, 1]],
    "name": "Com n maior que o número de pares, devolve todos" },
  { "id": "pares-ndarray", "checkpoint": 3, "kind": "expr",
    "setup": "import numpy as np\nr = pares_mais_confundidos(np.array([[20, 0, 1, 15, 4], [0, 40, 0, 0, 0], [0, 0, 40, 0, 0], [8, 1, 0, 31, 0], [10, 0, 0, 4, 26]]), 3)",
    "expr": "[r, type(r).__name__, type(r[0]).__name__, [type(v).__name__ for v in r[0]]]",
    "expected": [[[0, 3, 15], [4, 0, 10], [3, 0, 8]], "list", "tuple", ["int", "int", "int"]],
    "name": "Com uma matriz 5 × 5 do numpy: lista de tuplas de int do Python" }
]
```

### Soluções erradas
```python name="compara as classes binárias (predict)"
import numpy as np
from sklearn.linear_model import LogisticRegression


def um_contra_todos(X, y, X_novo):
    y = np.asarray(y)
    classes = np.unique(y)
    scores = np.column_stack([
        LogisticRegression().fit(X, (y == c).astype(int)).predict(X_novo) for c in classes
    ])
    return classes[np.argmax(scores, axis=1)]


def pares_mais_confundidos(matriz, n):
    M = np.asarray(matriz)
    pares = [
        (i, j, int(M[i, j]))
        for i in range(M.shape[0])
        for j in range(M.shape[1])
        if i != j and M[i, j] > 0
    ]
    pares.sort(key=lambda par: (-par[2], par[0], par[1]))
    return pares[:n]
```
```python name="probabilidade da classe negativa"
import numpy as np
from sklearn.linear_model import LogisticRegression


def um_contra_todos(X, y, X_novo):
    y = np.asarray(y)
    classes = np.unique(y)
    scores = np.column_stack([
        LogisticRegression().fit(X, (y == c).astype(int)).predict_proba(X_novo)[:, 0] for c in classes
    ])
    return classes[np.argmax(scores, axis=1)]


def pares_mais_confundidos(matriz, n):
    M = np.asarray(matriz)
    pares = [
        (i, j, int(M[i, j]))
        for i in range(M.shape[0])
        for j in range(M.shape[1])
        if i != j and M[i, j] > 0
    ]
    pares.sort(key=lambda par: (-par[2], par[0], par[1]))
    return pares[:n]
```
```python name="rótulo binário invertido"
import numpy as np
from sklearn.linear_model import LogisticRegression


def um_contra_todos(X, y, X_novo):
    y = np.asarray(y)
    classes = np.unique(y)
    scores = np.column_stack([
        LogisticRegression().fit(X, (y != c).astype(int)).decision_function(X_novo) for c in classes
    ])
    return classes[np.argmax(scores, axis=1)]


def pares_mais_confundidos(matriz, n):
    M = np.asarray(matriz)
    pares = [
        (i, j, int(M[i, j]))
        for i in range(M.shape[0])
        for j in range(M.shape[1])
        if i != j and M[i, j] > 0
    ]
    pares.sort(key=lambda par: (-par[2], par[0], par[1]))
    return pares[:n]
```
```python name="devolve a posição da classe"
import numpy as np
from sklearn.linear_model import LogisticRegression


def um_contra_todos(X, y, X_novo):
    y = np.asarray(y)
    classes = np.unique(y)
    scores = np.column_stack([
        LogisticRegression().fit(X, (y == c).astype(int)).decision_function(X_novo) for c in classes
    ])
    return np.argmax(scores, axis=1)


def pares_mais_confundidos(matriz, n):
    M = np.asarray(matriz)
    pares = [
        (i, j, int(M[i, j]))
        for i in range(M.shape[0])
        for j in range(M.shape[1])
        if i != j and M[i, j] > 0
    ]
    pares.sort(key=lambda par: (-par[2], par[0], par[1]))
    return pares[:n]
```
```python name="inclui a diagonal"
import numpy as np
from sklearn.linear_model import LogisticRegression


def um_contra_todos(X, y, X_novo):
    y = np.asarray(y)
    classes = np.unique(y)
    scores = np.column_stack([
        LogisticRegression().fit(X, (y == c).astype(int)).decision_function(X_novo) for c in classes
    ])
    return classes[np.argmax(scores, axis=1)]


def pares_mais_confundidos(matriz, n):
    M = np.asarray(matriz)
    pares = [
        (i, j, int(M[i, j]))
        for i in range(M.shape[0])
        for j in range(M.shape[1])
        if M[i, j] > 0
    ]
    pares.sort(key=lambda par: (-par[2], par[0], par[1]))
    return pares[:n]
```
```python name="verdadeira e prevista trocadas"
import numpy as np
from sklearn.linear_model import LogisticRegression


def um_contra_todos(X, y, X_novo):
    y = np.asarray(y)
    classes = np.unique(y)
    scores = np.column_stack([
        LogisticRegression().fit(X, (y == c).astype(int)).decision_function(X_novo) for c in classes
    ])
    return classes[np.argmax(scores, axis=1)]


def pares_mais_confundidos(matriz, n):
    M = np.asarray(matriz)
    pares = [
        (j, i, int(M[i, j]))
        for i in range(M.shape[0])
        for j in range(M.shape[1])
        if i != j and M[i, j] > 0
    ]
    pares.sort(key=lambda par: (-par[2], par[0], par[1]))
    return pares[:n]
```
```python name="desempate pela ordem inversa"
import numpy as np
from sklearn.linear_model import LogisticRegression


def um_contra_todos(X, y, X_novo):
    y = np.asarray(y)
    classes = np.unique(y)
    scores = np.column_stack([
        LogisticRegression().fit(X, (y == c).astype(int)).decision_function(X_novo) for c in classes
    ])
    return classes[np.argmax(scores, axis=1)]


def pares_mais_confundidos(matriz, n):
    M = np.asarray(matriz)
    pares = [
        (i, j, int(M[i, j]))
        for i in range(M.shape[0])
        for j in range(M.shape[1])
        if i != j and M[i, j] > 0
    ]
    pares.sort(key=lambda par: (par[2], par[0], par[1]), reverse=True)
    return pares[:n]
```
```python name="contagens do numpy"
import numpy as np
from sklearn.linear_model import LogisticRegression


def um_contra_todos(X, y, X_novo):
    y = np.asarray(y)
    classes = np.unique(y)
    scores = np.column_stack([
        LogisticRegression().fit(X, (y == c).astype(int)).decision_function(X_novo) for c in classes
    ])
    return classes[np.argmax(scores, axis=1)]


def pares_mais_confundidos(matriz, n):
    M = np.asarray(matriz)
    pares = [
        (i, j, M[i, j])
        for i in range(M.shape[0])
        for j in range(M.shape[1])
        if i != j and M[i, j] > 0
    ]
    pares.sort(key=lambda par: (-par[2], par[0], par[1]))
    return pares[:n]
```

## Passo 8 · Quiz · Softmax e OvR

### Pergunta
Um colega implementa a softmax assim, para uma matriz de logits com uma linha por exemplo:

```python
def softmax(Z):
    E = np.exp(Z - Z.max())
    return E / E.sum(axis=1, keepdims=True)
```

Num lote em que uma linha tem logits perto de 0 e outra perto de 1000, o que acontece?
- [ ] Funciona: subtrair qualquer constante não muda a softmax
- [x] A linha com logits perto de 0 vira $e^{-1000} = 0$ em todas as posições, e a divisão $0/0$ dá `nan`; a constante subtraída precisa ser o máximo **de cada linha**
- [ ] A linha com logits perto de 1000 estoura, porque o máximo da matriz não é subtraído dela
- [ ] O resultado sai certo, mas as linhas deixam de somar 1
> A invariância vale para uma constante **por linha**. O máximo global protege a linha dos logits grandes, mas empurra a linha dos pequenos para $e^{-1000}$, que em `float64` é exatamente 0: numerador e denominador zeram, e a divisão dá `nan`. Com `Z.max(axis=1, keepdims=True)`, cada linha tem um expoente máximo 0 e nada estoura nem zera.

### Pergunta
Para 4 classes, alguém treina 4 logísticas binárias (classe $c$ contra o resto) e decide assim:

```python
votos = np.column_stack([m.predict(X_novo) for m in modelos])
classe = np.argmax(votos, axis=1)
```

Quase metade das previsões cai na classe 0. Qual é a causa?
- [ ] Faltou padronizar `X_novo` antes de prever
- [x] O `predict` de cada modelo devolve 0 ou 1; quando nenhum ou mais de um diz 1, o `argmax` empata e devolve a primeira coluna. É preciso comparar scores contínuos, como o `decision_function`
- [ ] Com 4 classes, o certo seria treinar $4 \cdot 3 / 2 = 6$ modelos; o um-contra-todos não funciona com mais de 3 classes
- [ ] A classe 0 tem mais exemplos no treino, e o um-contra-todos sempre favorece a maior classe
> Os votos binários perdem a informação de **quão** confiante cada modelo está. Com empates, o `np.argmax` devolve a primeira posição, a classe 0. Comparando o `decision_function` (ou o `predict_proba(X)[:, 1]`), sempre existe um maior score. O um-contra-um, com 6 modelos, é outra estratégia, não uma correção obrigatória; o um-contra-todos funciona com qualquer número de classes.

### Pergunta
A matriz de confusão de um classificador de 3 símbolos, com linhas = verdadeira e colunas = prevista, na ordem `mais`, `xis`, `quadrado`, é:

```text
[[30,  0, 10],
 [ 2, 36,  2],
 [ 1,  1, 38]]
```

Qual afirmação está correta?
- [ ] O par mais confundido é "quadrado" previsto como "mais", com 10 casos
- [x] O par mais confundido é "mais" previsto como "quadrado", com 10 casos, e o recall de "mais" é $30/40 = 0{,}75$
- [ ] O recall de "mais" é $30/33 \approx 0{,}91$
- [ ] Os erros estão bem distribuídos: nenhum par se destaca
> A célula `[0][2]` está na linha de "mais" (verdadeira) e na coluna de "quadrado" (prevista): 10 imagens de "mais" foram classificadas como "quadrado". O recall de "mais" divide os 30 acertos pela linha inteira, 40. Dividir pela coluna (33) dá a **precisão** de "mais". Os outros erros somam no máximo 2 por célula, então esse par se destaca.
