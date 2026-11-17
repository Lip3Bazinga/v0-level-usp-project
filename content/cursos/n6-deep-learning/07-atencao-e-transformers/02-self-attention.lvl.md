---
slug: n6-m7-02-self-attention
titulo: Self-attention
descricao: Consultas, chaves e valores, pontuações por produto escalar, escala por √d, softmax por linha e a soma ponderada; forward e backward em numpy para uma sequência.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
xp: 140
tempo_min: 60
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Implementar self-attention (Q, K, V, pontuações, softmax, saída) para uma cabeça
- Explicar a escala 1/√d e a interpretação dos pesos de atenção
- Implementar o backward da atenção e verificar numericamente
---

## Passo 1 · Leitura · Perguntar, responder, oferecer

Na RNN, a informação de uma posição distante chega à atual depois de passar por todos os estados intermediários, e cada passagem a enfraquece. A **atenção** resolve o problema de outro jeito: cada posição olha diretamente para todas as outras e decide, com base no conteúdo, quanto de cada uma quer aproveitar.

A entrada é uma matriz $X$ de forma $(T, d_{in})$, uma linha por posição. Três projeções lineares dão a cada posição três papéis:

- a **consulta** $Q = X W_q$: o que esta posição está procurando;
- a **chave** $K = X W_k$: o que esta posição tem a anunciar;
- o **valor** $V = X W_v$: o que esta posição entrega a quem prestar atenção nela.

A pontuação entre a consulta da posição $i$ e a chave da posição $j$ é um produto escalar: quanto mais alinhados os dois vetores, maior a pontuação. Todas as pontuações de uma vez são a matriz $Q K^\top$, de forma $(T, T)$. Uma softmax em cada linha transforma as pontuações em pesos positivos que somam 1, e a saída é a média dos valores com esses pesos:

$$
A = \text{softmax}\!\left(\frac{Q K^\top}{\sqrt{d}}\right), \qquad \text{saída} = A\,V
$$

Aqui $d$ é o tamanho das consultas e das chaves, e a divisão por $\sqrt{d}$ é o assunto do passo 4.

```python
Q, K, V = X @ Wq, X @ Wk, X @ Wv
S = Q @ K.T / np.sqrt(Q.shape[1])     # (T, T): linha i, coluna j
A = softmax_linhas(S)                  # cada linha soma 1
saida = A @ V                          # (T, dv)
```

A linha $i$ de $A$ diz como a posição $i$ distribui a sua atenção. Se a linha for `[0.25, 0.75]`, a saída da posição é um quarto do valor da primeira posição mais três quartos do valor da segunda.

Duas diferenças para uma camada densa. Os pesos da média **dependem dos dados**: mudando $X$, muda $A$. E nada na conta depende da distância entre $i$ e $j$: a primeira posição alcança a última em um passo só. O nome *self-attention* vem de $Q$, $K$ e $V$ saírem da mesma sequência.

## Passo 2 · Previsão · Os pesos de duas posições

As pontuações de duas posições foram escritas à mão, como logaritmos, para a softmax sair em frações simples. Preveja os pesos de cada linha e a saída da atenção.

### Código

```python
import numpy as np

S = np.log(np.array([[1.0, 3.0], [2.0, 2.0]]))
E = np.exp(S)
A = E / E.sum(axis=1, keepdims=True)
print(np.round(A, 2).tolist())
print(np.round(A.sum(axis=1), 2).tolist())

V = np.array([[10.0, 0.0], [0.0, 20.0]])
print(np.round(A @ V, 2).tolist())
print((A @ V).shape)
```

### Dicas

1. `np.exp(np.log(x))` devolve `x`: a primeira linha de `E` é `[1, 3]`, e a soma dela é 4.
2. Pontuações iguais numa linha dão pesos iguais.
3. Cada linha da saída é a média das linhas de `V` com os pesos daquela linha de `A`.

### Saída esperada

```text
[[0.25, 0.75], [0.5, 0.5]]
[1.0, 1.0]
[[2.5, 15.0], [5.0, 10.0]]
(2, 2)
```

## Passo 3 · Exercício · `atencao_forward(X, Wq, Wk, Wv)`
modo: lacunas

Complete o forward de uma cabeça de atenção, sem máscara. `X` tem forma `(T, d_in)`; `Wq` e `Wk` têm forma `(d_in, d)`; `Wv` tem forma `(d_in, dv)`. A função devolve `(saida, cache)`: a saída de forma `(T, dv)` e uma tupla com tudo o que o backward do passo 7 vai precisar.

A escala usa $d$, o número de colunas de `Q`. A softmax é por linha: cada posição distribui a própria atenção.

### Instruções

1. Em `softmax_linhas`, normalize cada linha para que ela some 1.
2. Calcule as pontuações $Q K^\top / \sqrt{d}$, com a consulta nas linhas e a chave nas colunas.
3. Calcule a saída como a média dos valores com os pesos de `A`.

### Código inicial

```python
import numpy as np


def softmax_linhas(S):
    E = np.exp(S - S.max(axis=1, keepdims=True))
    return E / E.sum(axis=___, keepdims=True)


def atencao_forward(X, Wq, Wk, Wv):
    Q = X @ Wq
    K = X @ Wk
    V = X @ Wv
    d = Q.shape[1]
    S = ___
    A = softmax_linhas(S)
    saida = ___
    cache = (X, Wq, Wk, Wv, Q, K, V, A)
    return saida, cache


if __name__ == "__main__":
    rng = np.random.default_rng(0)
    X = rng.normal(size=(4, 3))
    Wq, Wk, Wv = rng.normal(size=(3, 3)), rng.normal(size=(3, 3)), rng.normal(size=(3, 2))
    saida, cache = atencao_forward(X, Wq, Wk, Wv)
    print(saida.shape)
    print(np.round(cache[-1].sum(axis=1), 6).tolist())
```

### Solução

```python
import numpy as np


def softmax_linhas(S):
    E = np.exp(S - S.max(axis=1, keepdims=True))
    return E / E.sum(axis=1, keepdims=True)


def atencao_forward(X, Wq, Wk, Wv):
    Q = X @ Wq
    K = X @ Wk
    V = X @ Wv
    d = Q.shape[1]
    S = Q @ K.T / np.sqrt(d)
    A = softmax_linhas(S)
    saida = A @ V
    cache = (X, Wq, Wk, Wv, Q, K, V, A)
    return saida, cache


if __name__ == "__main__":
    rng = np.random.default_rng(0)
    X = rng.normal(size=(4, 3))
    Wq, Wk, Wv = rng.normal(size=(3, 3)), rng.normal(size=(3, 3)), rng.normal(size=(3, 2))
    saida, cache = atencao_forward(X, Wq, Wk, Wv)
    print(saida.shape)
    print(np.round(cache[-1].sum(axis=1), 6).tolist())
```

### Dicas

1. Em `(T, T)`, o eixo 1 percorre as colunas de uma linha: é nele que a soma precisa dar 1.
2. `Q` é `(T, d)` e `K` é `(T, d)`: para o produto dar `(T, T)`, um dos dois precisa ser transposto.
3. A saída tem uma linha por posição e uma coluna por dimensão de `V`.

### Verificação

```json
[
  {"id": "forma", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(7)\n_X = _rng.normal(size=(5, 4))\n_Wq, _Wk, _Wv = _rng.normal(size=(4, 3)), _rng.normal(size=(4, 3)), _rng.normal(size=(4, 2))\ndef _ref(X, Wq, Wk, Wv):\n    T, d = X.shape[0], Wq.shape[1]\n    saida = np.zeros((T, Wv.shape[1]))\n    for i in range(T):\n        pontos = np.array([float((X[i] @ Wq) @ (X[j] @ Wk)) / d ** 0.5 for j in range(T)])\n        pesos = np.exp(pontos - pontos.max())\n        pesos = pesos / pesos.sum()\n        for j in range(T):\n            saida[i] += pesos[j] * (X[j] @ Wv)\n    return saida\n", "expr": "list(atencao_forward(_X, _Wq, _Wk, _Wv)[0].shape)", "expected": [5, 2], "name": "A saída tem forma (T, dv)"},
  {"id": "linhas-somam-1", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(7)\n_X = _rng.normal(size=(5, 4))\n_Wq, _Wk, _Wv = _rng.normal(size=(4, 3)), _rng.normal(size=(4, 3)), _rng.normal(size=(4, 2))\ndef _ref(X, Wq, Wk, Wv):\n    T, d = X.shape[0], Wq.shape[1]\n    saida = np.zeros((T, Wv.shape[1]))\n    for i in range(T):\n        pontos = np.array([float((X[i] @ Wq) @ (X[j] @ Wk)) / d ** 0.5 for j in range(T)])\n        pesos = np.exp(pontos - pontos.max())\n        pesos = pesos / pesos.sum()\n        for j in range(T):\n            saida[i] += pesos[j] * (X[j] @ Wv)\n    return saida\n", "expr": "np.round(softmax_linhas(_X @ _Wq).sum(axis=1), 10).tolist()", "expected": [1.0, 1.0, 1.0, 1.0, 1.0], "name": "Cada linha da softmax soma 1", "hint": "A soma que normaliza é ao longo das colunas (axis=1)."},
  {"id": "softmax-literal", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np", "expr": "np.round(softmax_linhas(np.log(np.array([[1.0, 3.0], [2.0, 2.0]]))), 10).tolist()", "expected": [[0.25, 0.75], [0.5, 0.5]], "name": "Pontuações ln 1, ln 3 e ln 2, ln 2: pesos 0,25/0,75 e 0,5/0,5"},
  {"id": "referencia", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(7)\n_X = _rng.normal(size=(5, 4))\n_Wq, _Wk, _Wv = _rng.normal(size=(4, 3)), _rng.normal(size=(4, 3)), _rng.normal(size=(4, 2))\ndef _ref(X, Wq, Wk, Wv):\n    T, d = X.shape[0], Wq.shape[1]\n    saida = np.zeros((T, Wv.shape[1]))\n    for i in range(T):\n        pontos = np.array([float((X[i] @ Wq) @ (X[j] @ Wk)) / d ** 0.5 for j in range(T)])\n        pesos = np.exp(pontos - pontos.max())\n        pesos = pesos / pesos.sum()\n        for j in range(T):\n            saida[i] += pesos[j] * (X[j] @ Wv)\n    return saida\n", "expr": "bool(np.allclose(atencao_forward(_X, _Wq, _Wk, _Wv)[0], _ref(_X, _Wq, _Wk, _Wv), atol=1e-12))", "expected": true, "name": "Saída igual à da referência (T = 5, d = 3, dv = 2)", "hint": "A referência calcula, para cada i, os pesos softmax das pontuações q_i · k_j / raiz de d e a média dos valores."},
  {"id": "quadrada", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(11)\n_X = _rng.normal(size=(3, 3))\n_Wq, _Wk, _Wv = _rng.normal(size=(3, 3)), _rng.normal(size=(3, 3)), _rng.normal(size=(3, 3))\ndef _ref(X, Wq, Wk, Wv):\n    T, d = X.shape[0], Wq.shape[1]\n    saida = np.zeros((T, Wv.shape[1]))\n    for i in range(T):\n        pontos = np.array([float((X[i] @ Wq) @ (X[j] @ Wk)) / d ** 0.5 for j in range(T)])\n        pesos = np.exp(pontos - pontos.max())\n        pesos = pesos / pesos.sum()\n        for j in range(T):\n            saida[i] += pesos[j] * (X[j] @ Wv)\n    return saida\n", "expr": "bool(np.allclose(atencao_forward(_X, _Wq, _Wk, _Wv)[0], _ref(_X, _Wq, _Wk, _Wv), atol=1e-12))", "expected": true, "name": "Saída igual à da referência quando T = d = 3", "hint": "Com T = d, um produto sem a transposta não dá erro de forma, só o resultado errado."},
  {"id": "literal", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\n_X = np.array([[1.0, 0.0], [0.0, 2.0], [1.0, 1.0]])\n_Wq = np.array([[1.0, 0.5], [-1.0, 2.0]])\n_Wk = np.array([[0.5, 1.0], [1.0, -1.0]])\n_Wv = np.array([[2.0], [1.0]])", "expr": "atencao_forward(_X, _Wq, _Wk, _Wv)[0].ravel().tolist()", "expected": [2.4159081537115625, 2.0141656902136695, 2.1452031847088855], "tolerance": 1e-12, "name": "Saída de um exemplo pequeno (T = 3, d = 2, dv = 1)"},
  {"id": "consulta-zero", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(7)\n_X = _rng.normal(size=(5, 4))\n_Wq, _Wk, _Wv = _rng.normal(size=(4, 3)), _rng.normal(size=(4, 3)), _rng.normal(size=(4, 2))\ndef _ref(X, Wq, Wk, Wv):\n    T, d = X.shape[0], Wq.shape[1]\n    saida = np.zeros((T, Wv.shape[1]))\n    for i in range(T):\n        pontos = np.array([float((X[i] @ Wq) @ (X[j] @ Wk)) / d ** 0.5 for j in range(T)])\n        pesos = np.exp(pontos - pontos.max())\n        pesos = pesos / pesos.sum()\n        for j in range(T):\n            saida[i] += pesos[j] * (X[j] @ Wv)\n    return saida\n", "expr": "bool(np.allclose(atencao_forward(_X, np.zeros((4, 3)), _Wk, _Wv)[0], np.tile((_X @ _Wv).mean(axis=0), (5, 1)), atol=1e-12))", "expected": true, "name": "Com Wq = 0, toda posição recebe a média simples dos valores", "hint": "Pontuações todas iguais dão pesos 1/T."},
  {"id": "escala-importa", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(7)\n_X = _rng.normal(size=(5, 4))\n_Wq, _Wk, _Wv = _rng.normal(size=(4, 3)), _rng.normal(size=(4, 3)), _rng.normal(size=(4, 2))\ndef _ref(X, Wq, Wk, Wv):\n    T, d = X.shape[0], Wq.shape[1]\n    saida = np.zeros((T, Wv.shape[1]))\n    for i in range(T):\n        pontos = np.array([float((X[i] @ Wq) @ (X[j] @ Wk)) / d ** 0.5 for j in range(T)])\n        pesos = np.exp(pontos - pontos.max())\n        pesos = pesos / pesos.sum()\n        for j in range(T):\n            saida[i] += pesos[j] * (X[j] @ Wv)\n    return saida\n", "expr": "bool(np.allclose(atencao_forward(_X, 2.0 * _Wq, _Wk, _Wv)[0], _ref(_X, 2.0 * _Wq, _Wk, _Wv), atol=1e-12))", "expected": true, "name": "Consultas dobradas: ainda igual à referência", "hint": "A divisão é por raiz de d, e d é o número de colunas de Q."},
  {"id": "cache-tupla", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(7)\n_X = _rng.normal(size=(5, 4))\n_Wq, _Wk, _Wv = _rng.normal(size=(4, 3)), _rng.normal(size=(4, 3)), _rng.normal(size=(4, 2))\ndef _ref(X, Wq, Wk, Wv):\n    T, d = X.shape[0], Wq.shape[1]\n    saida = np.zeros((T, Wv.shape[1]))\n    for i in range(T):\n        pontos = np.array([float((X[i] @ Wq) @ (X[j] @ Wk)) / d ** 0.5 for j in range(T)])\n        pesos = np.exp(pontos - pontos.max())\n        pesos = pesos / pesos.sum()\n        for j in range(T):\n            saida[i] += pesos[j] * (X[j] @ Wv)\n    return saida\n", "expr": "[isinstance(atencao_forward(_X, _Wq, _Wk, _Wv)[1], tuple), len(atencao_forward(_X, _Wq, _Wk, _Wv)[1])]", "expected": [true, 8], "name": "O cache é a tupla de 8 itens do código inicial"},
  {"id": "entrada-intacta", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(7)\n_X = _rng.normal(size=(5, 4))\n_Wq, _Wk, _Wv = _rng.normal(size=(4, 3)), _rng.normal(size=(4, 3)), _rng.normal(size=(4, 2))\ndef _ref(X, Wq, Wk, Wv):\n    T, d = X.shape[0], Wq.shape[1]\n    saida = np.zeros((T, Wv.shape[1]))\n    for i in range(T):\n        pontos = np.array([float((X[i] @ Wq) @ (X[j] @ Wk)) / d ** 0.5 for j in range(T)])\n        pesos = np.exp(pontos - pontos.max())\n        pesos = pesos / pesos.sum()\n        for j in range(T):\n            saida[i] += pesos[j] * (X[j] @ Wv)\n    return saida\n_c = _X.copy()\natencao_forward(_X, _Wq, _Wk, _Wv)", "expr": "bool(np.array_equal(_X, _c))", "expected": true, "name": "X não é alterado"}
]
```

### Soluções erradas

```python name="softmax no eixo errado"
import numpy as np


def softmax_linhas(S):
    E = np.exp(S - S.max(axis=1, keepdims=True))
    return E / E.sum(axis=0, keepdims=True)


def atencao_forward(X, Wq, Wk, Wv):
    Q = X @ Wq
    K = X @ Wk
    V = X @ Wv
    d = Q.shape[1]
    S = Q @ K.T / np.sqrt(d)
    A = softmax_linhas(S)
    saida = A @ V
    cache = (X, Wq, Wk, Wv, Q, K, V, A)
    return saida, cache


if __name__ == "__main__":
    rng = np.random.default_rng(0)
    X = rng.normal(size=(4, 3))
    Wq, Wk, Wv = rng.normal(size=(3, 3)), rng.normal(size=(3, 3)), rng.normal(size=(3, 2))
    saida, cache = atencao_forward(X, Wq, Wk, Wv)
    print(saida.shape)
    print(np.round(cache[-1].sum(axis=1), 6).tolist())
```

```python name="sem a escala"
import numpy as np


def softmax_linhas(S):
    E = np.exp(S - S.max(axis=1, keepdims=True))
    return E / E.sum(axis=1, keepdims=True)


def atencao_forward(X, Wq, Wk, Wv):
    Q = X @ Wq
    K = X @ Wk
    V = X @ Wv
    d = Q.shape[1]
    S = Q @ K.T
    A = softmax_linhas(S)
    saida = A @ V
    cache = (X, Wq, Wk, Wv, Q, K, V, A)
    return saida, cache


if __name__ == "__main__":
    rng = np.random.default_rng(0)
    X = rng.normal(size=(4, 3))
    Wq, Wk, Wv = rng.normal(size=(3, 3)), rng.normal(size=(3, 3)), rng.normal(size=(3, 2))
    saida, cache = atencao_forward(X, Wq, Wk, Wv)
    print(saida.shape)
    print(np.round(cache[-1].sum(axis=1), 6).tolist())
```

```python name="K sem transpor"
import numpy as np


def softmax_linhas(S):
    E = np.exp(S - S.max(axis=1, keepdims=True))
    return E / E.sum(axis=1, keepdims=True)


def atencao_forward(X, Wq, Wk, Wv):
    Q = X @ Wq
    K = X @ Wk
    V = X @ Wv
    d = Q.shape[1]
    S = Q @ K / np.sqrt(d)
    A = softmax_linhas(S)
    saida = A @ V
    cache = (X, Wq, Wk, Wv, Q, K, V, A)
    return saida, cache


if __name__ == "__main__":
    rng = np.random.default_rng(0)
    X = rng.normal(size=(4, 3))
    Wq, Wk, Wv = rng.normal(size=(3, 3)), rng.normal(size=(3, 3)), rng.normal(size=(3, 2))
    saida, cache = atencao_forward(X, Wq, Wk, Wv)
    print(saida.shape)
    print(np.round(cache[-1].sum(axis=1), 6).tolist())
```

```python name="divide por d no lugar da raiz"
import numpy as np


def softmax_linhas(S):
    E = np.exp(S - S.max(axis=1, keepdims=True))
    return E / E.sum(axis=1, keepdims=True)


def atencao_forward(X, Wq, Wk, Wv):
    Q = X @ Wq
    K = X @ Wk
    V = X @ Wv
    d = Q.shape[1]
    S = Q @ K.T / d
    A = softmax_linhas(S)
    saida = A @ V
    cache = (X, Wq, Wk, Wv, Q, K, V, A)
    return saida, cache


if __name__ == "__main__":
    rng = np.random.default_rng(0)
    X = rng.normal(size=(4, 3))
    Wq, Wk, Wv = rng.normal(size=(3, 3)), rng.normal(size=(3, 3)), rng.normal(size=(3, 2))
    saida, cache = atencao_forward(X, Wq, Wk, Wv)
    print(saida.shape)
    print(np.round(cache[-1].sum(axis=1), 6).tolist())
```

```python name="consulta e chave trocadas"
import numpy as np


def softmax_linhas(S):
    E = np.exp(S - S.max(axis=1, keepdims=True))
    return E / E.sum(axis=1, keepdims=True)


def atencao_forward(X, Wq, Wk, Wv):
    Q = X @ Wq
    K = X @ Wk
    V = X @ Wv
    d = Q.shape[1]
    S = K @ Q.T / np.sqrt(d)
    A = softmax_linhas(S)
    saida = A @ V
    cache = (X, Wq, Wk, Wv, Q, K, V, A)
    return saida, cache


if __name__ == "__main__":
    rng = np.random.default_rng(0)
    X = rng.normal(size=(4, 3))
    Wq, Wk, Wv = rng.normal(size=(3, 3)), rng.normal(size=(3, 3)), rng.normal(size=(3, 2))
    saida, cache = atencao_forward(X, Wq, Wk, Wv)
    print(saida.shape)
    print(np.round(cache[-1].sum(axis=1), 6).tolist())
```

```python name="saída com A transposta"
import numpy as np


def softmax_linhas(S):
    E = np.exp(S - S.max(axis=1, keepdims=True))
    return E / E.sum(axis=1, keepdims=True)


def atencao_forward(X, Wq, Wk, Wv):
    Q = X @ Wq
    K = X @ Wk
    V = X @ Wv
    d = Q.shape[1]
    S = Q @ K.T / np.sqrt(d)
    A = softmax_linhas(S)
    saida = A.T @ V
    cache = (X, Wq, Wk, Wv, Q, K, V, A)
    return saida, cache


if __name__ == "__main__":
    rng = np.random.default_rng(0)
    X = rng.normal(size=(4, 3))
    Wq, Wk, Wv = rng.normal(size=(3, 3)), rng.normal(size=(3, 3)), rng.normal(size=(3, 2))
    saida, cache = atencao_forward(X, Wq, Wk, Wv)
    print(saida.shape)
    print(np.round(cache[-1].sum(axis=1), 6).tolist())
```

## Passo 4 · Leitura · Por que $\sqrt{d}$

A pontuação entre uma consulta e uma chave é uma soma de $d$ produtos: $q \cdot k = \sum_{i=1}^{d} q_i k_i$. Se as componentes de $q$ e de $k$ forem independentes, com média 0 e variância 1, cada produto $q_i k_i$ também tem média 0 e variância 1, e a soma de $d$ parcelas independentes tem **variância $d$**. O desvio padrão das pontuações cresce como $\sqrt{d}$.

Isso importa por causa da softmax. Ela reage às **diferenças** entre as pontuações de uma linha: uma diferença de 1 dá uma razão de $e \approx 2{,}7$ entre dois pesos, e uma diferença de 8 dá uma razão de quase 3 000. Com pontuações de desvio padrão 8 (o caso de $d = 64$), a maior pontuação da linha fica com quase todo o peso, e a "média ponderada" vira a cópia de uma posição só.

Dividir por $\sqrt{d}$ devolve a variância para 1, qualquer que seja $d$:

$$
\text{Var}\!\left(\frac{q \cdot k}{\sqrt{d}}\right) = \frac{d}{(\sqrt{d})^2} = 1
$$

Os números abaixo foram medidos com 20 000 pares de vetores sorteados de uma normal padrão. A última coluna é o maior peso de uma linha de atenção com 8 posições, na média de 2 000 linhas (pesos iguais dariam 0,125).

| $d$ | variância sem escala | variância com escala | maior peso sem escala | maior peso com escala |
|---|---|---|---|---|
| 4 | 4,00 | 1,00 | 0,53 | 0,35 |
| 16 | 16,18 | 1,01 | 0,74 | 0,35 |
| 64 | 62,92 | 0,98 | 0,88 | 0,36 |
| 256 | 255,84 | 1,00 | 0,94 | 0,37 |

```python
rng = np.random.default_rng(0)
Q, K = rng.normal(size=(20000, 64)), rng.normal(size=(20000, 64))
pontos = (Q * K).sum(axis=1)                    # um produto escalar por linha
print(pontos.var(), (pontos / np.sqrt(64)).var())   # perto de 64 e de 1
```

Sem a escala, o comportamento da camada muda com a largura do modelo, e uma softmax saturada tem outro defeito: o gradiente dela é quase zero. A derivada de um peso em relação à própria pontuação é $a(1 - a)$, que vale $0{,}25$ para $a = 0{,}5$ e $0{,}0099$ para $a = 0{,}99$. A rede começaria o treino com a atenção travada em escolhas feitas por acaso na inicialização. A divisão custa uma operação e deixa o ponto de partida igual para qualquer $d$.

## Passo 5 · Exercício · Escala e pesos

Duas funções para ver a escala funcionando.

`variancias(d, n, semente)` repete a medida da leitura. Crie `rng = np.random.default_rng(semente)`, sorteie `Q` e depois `K`, cada um com `rng.normal(size=(n, d))`, e calcule os `n` produtos escalares entre a linha $i$ de `Q` e a linha $i$ de `K`. Devolva a tupla `(sem_escala, com_escala)` de `float`: a variância das pontuações (com `.var()`) e a variância das pontuações divididas por $\sqrt{d}$.

`pesos_de_atencao(X, Wq, Wk)` devolve só a matriz $A$ de forma `(T, T)`, com a escala e a softmax por linha. Calcule a softmax de modo estável (subtraia o máximo de cada linha antes da exponencial).

### Instruções

1. `variancias`: sorteie `Q` e `K` na ordem pedida, some os produtos componente a componente em cada linha e devolva as duas variâncias como `float`.
2. `pesos_de_atencao`: pontuações com a escala $\sqrt{d}$ e softmax estável por linha.

### Código inicial

```python
import numpy as np


def variancias(d, n, semente):
    # sorteie Q e depois K, de forma (n, d), e devolva (sem_escala, com_escala)
    pass


def pesos_de_atencao(X, Wq, Wk):
    # a matriz A, de forma (T, T), com cada linha somando 1
    pass


if __name__ == "__main__":
    for d in (4, 64):
        sem, com = variancias(d, 5000, 0)
        print(d, round(sem, 2), round(com, 2))
```

### Solução

```python
import numpy as np


def variancias(d, n, semente):
    rng = np.random.default_rng(semente)
    Q = rng.normal(size=(n, d))
    K = rng.normal(size=(n, d))
    pontos = (Q * K).sum(axis=1)
    return float(pontos.var()), float((pontos / np.sqrt(d)).var())


def pesos_de_atencao(X, Wq, Wk):
    Q = X @ Wq
    K = X @ Wk
    S = Q @ K.T / np.sqrt(Q.shape[1])
    E = np.exp(S - S.max(axis=1, keepdims=True))
    return E / E.sum(axis=1, keepdims=True)


if __name__ == "__main__":
    for d in (4, 64):
        sem, com = variancias(d, 5000, 0)
        print(d, round(sem, 2), round(com, 2))
```

### Dicas

1. O produto escalar de cada par de linhas é `(Q * K).sum(axis=1)`: um número por linha.
2. A segunda variância é a das pontuações já divididas por `np.sqrt(d)`.
3. Em `pesos_de_atencao`, `d` é o número de colunas de `Q`, não de `X`.

### Verificação

```json
[
  {"id": "var-sem-escala", "checkpoint": 1, "kind": "expr", "expr": "bool(abs(variancias(64, 20000, 0)[0] - 64.0) < 4.0)", "expected": true, "name": "Sem escala, a variância fica perto de d = 64 (até 5 erros padrão)", "hint": "Cada pontuação é a soma de d produtos, um por componente."},
  {"id": "var-com-escala", "checkpoint": 1, "kind": "expr", "expr": "bool(abs(variancias(64, 20000, 0)[1] - 1.0) < 0.06)", "expected": true, "name": "Com escala, a variância fica perto de 1", "hint": "Divida as pontuações por raiz de d antes de calcular a variância."},
  {"id": "var-d-pequeno", "checkpoint": 1, "kind": "expr", "expr": "[bool(abs(variancias(4, 20000, 1)[0] - 4.0) < 0.4), bool(abs(variancias(4, 20000, 1)[1] - 1.0) < 0.1)]", "expected": [true, true], "name": "Com d = 4: perto de 4 e perto de 1"},
  {"id": "var-razao", "checkpoint": 1, "kind": "expr", "setup": "_s, _c = variancias(16, 500, 3)", "expr": "bool(abs(_s / _c - 16.0) < 1e-9)", "expected": true, "name": "A razão entre as duas variâncias é exatamente d", "hint": "Dividir os dados por raiz de d divide a variância por d."},
  {"id": "var-tipos", "checkpoint": 1, "kind": "expr", "setup": "_r = variancias(8, 100, 0)", "expr": "[isinstance(_r, tuple), len(_r), type(_r[0]) is float, type(_r[1]) is float]", "expected": [true, 2, true, true], "name": "Devolve uma tupla de dois float"},
  {"id": "var-semente", "checkpoint": 1, "kind": "expr", "expr": "[variancias(8, 200, 5) == variancias(8, 200, 5), variancias(8, 200, 5) != variancias(8, 200, 6)]", "expected": [true, true], "name": "Mesma semente, mesmo resultado; outra semente, outro resultado", "hint": "O gerador é criado com a semente recebida."},
  {"id": "var-n", "checkpoint": 1, "kind": "expr", "expr": "bool(abs(variancias(1, 20000, 2)[0] - 1.0) < 0.1)", "expected": true, "name": "Com d = 1, a variância sem escala fica perto de 1", "hint": "São n pontuações, uma por linha de Q e K."},
  {"id": "pesos-forma", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(5)\n_X = _rng.normal(size=(6, 4))\n_Wq, _Wk = _rng.normal(size=(4, 8)), _rng.normal(size=(4, 8))\ndef _ref(X, Wq, Wk):\n    T, d = X.shape[0], Wq.shape[1]\n    A = np.zeros((T, T))\n    for i in range(T):\n        pontos = np.array([float((X[i] @ Wq) @ (X[j] @ Wk)) / d ** 0.5 for j in range(T)])\n        pesos = np.exp(pontos - pontos.max())\n        A[i] = pesos / pesos.sum()\n    return A\n", "expr": "list(pesos_de_atencao(_X, _Wq, _Wk).shape)", "expected": [6, 6], "name": "A tem forma (T, T)"},
  {"id": "pesos-linhas", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(5)\n_X = _rng.normal(size=(6, 4))\n_Wq, _Wk = _rng.normal(size=(4, 8)), _rng.normal(size=(4, 8))\ndef _ref(X, Wq, Wk):\n    T, d = X.shape[0], Wq.shape[1]\n    A = np.zeros((T, T))\n    for i in range(T):\n        pontos = np.array([float((X[i] @ Wq) @ (X[j] @ Wk)) / d ** 0.5 for j in range(T)])\n        pesos = np.exp(pontos - pontos.max())\n        A[i] = pesos / pesos.sum()\n    return A\n", "expr": "np.round(pesos_de_atencao(_X, _Wq, _Wk).sum(axis=1), 10).tolist()", "expected": [1.0, 1.0, 1.0, 1.0, 1.0, 1.0], "name": "Cada linha de A soma 1", "hint": "A softmax é por linha: axis=1."},
  {"id": "pesos-referencia", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(5)\n_X = _rng.normal(size=(6, 4))\n_Wq, _Wk = _rng.normal(size=(4, 8)), _rng.normal(size=(4, 8))\ndef _ref(X, Wq, Wk):\n    T, d = X.shape[0], Wq.shape[1]\n    A = np.zeros((T, T))\n    for i in range(T):\n        pontos = np.array([float((X[i] @ Wq) @ (X[j] @ Wk)) / d ** 0.5 for j in range(T)])\n        pesos = np.exp(pontos - pontos.max())\n        A[i] = pesos / pesos.sum()\n    return A\n", "expr": "bool(np.allclose(pesos_de_atencao(_X, _Wq, _Wk), _ref(_X, _Wq, _Wk), atol=1e-12))", "expected": true, "name": "A igual à da referência (T = 6, d = 8)", "hint": "A escala usa o número de colunas de Q (8), não o de X (4)."},
  {"id": "pesos-uniformes", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(5)\n_X = _rng.normal(size=(6, 4))\n_Wq, _Wk = _rng.normal(size=(4, 8)), _rng.normal(size=(4, 8))\ndef _ref(X, Wq, Wk):\n    T, d = X.shape[0], Wq.shape[1]\n    A = np.zeros((T, T))\n    for i in range(T):\n        pontos = np.array([float((X[i] @ Wq) @ (X[j] @ Wk)) / d ** 0.5 for j in range(T)])\n        pesos = np.exp(pontos - pontos.max())\n        A[i] = pesos / pesos.sum()\n    return A\n", "expr": "bool(np.allclose(pesos_de_atencao(_X, np.zeros((4, 8)), _Wk), 1.0 / 6.0, atol=1e-12))", "expected": true, "name": "Com Wq = 0, todos os pesos valem 1/T"},
  {"id": "pesos-estavel", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(5)\n_X = _rng.normal(size=(6, 4))\n_Wq, _Wk = _rng.normal(size=(4, 8)), _rng.normal(size=(4, 8))\ndef _ref(X, Wq, Wk):\n    T, d = X.shape[0], Wq.shape[1]\n    A = np.zeros((T, T))\n    for i in range(T):\n        pontos = np.array([float((X[i] @ Wq) @ (X[j] @ Wk)) / d ** 0.5 for j in range(T)])\n        pesos = np.exp(pontos - pontos.max())\n        A[i] = pesos / pesos.sum()\n    return A\n", "expr": "bool(np.isfinite(pesos_de_atencao(100.0 * _X, _Wq, _Wk)).all())", "expected": true, "name": "Pontuações enormes não produzem nan", "hint": "Subtraia o máximo de cada linha antes de np.exp."}
]
```

### Soluções erradas

```python name="divide as pontuações por d"
import numpy as np


def variancias(d, n, semente):
    rng = np.random.default_rng(semente)
    Q = rng.normal(size=(n, d))
    K = rng.normal(size=(n, d))
    pontos = (Q * K).sum(axis=1)
    return float(pontos.var()), float((pontos / d).var())


def pesos_de_atencao(X, Wq, Wk):
    Q = X @ Wq
    K = X @ Wk
    S = Q @ K.T / np.sqrt(Q.shape[1])
    E = np.exp(S - S.max(axis=1, keepdims=True))
    return E / E.sum(axis=1, keepdims=True)


if __name__ == "__main__":
    for d in (4, 64):
        sem, com = variancias(d, 5000, 0)
        print(d, round(sem, 2), round(com, 2))
```

```python name="as duas variâncias sem escala"
import numpy as np


def variancias(d, n, semente):
    rng = np.random.default_rng(semente)
    Q = rng.normal(size=(n, d))
    K = rng.normal(size=(n, d))
    pontos = (Q * K).sum(axis=1)
    return float(pontos.var()), float(pontos.var())


def pesos_de_atencao(X, Wq, Wk):
    Q = X @ Wq
    K = X @ Wk
    S = Q @ K.T / np.sqrt(Q.shape[1])
    E = np.exp(S - S.max(axis=1, keepdims=True))
    return E / E.sum(axis=1, keepdims=True)


if __name__ == "__main__":
    for d in (4, 64):
        sem, com = variancias(d, 5000, 0)
        print(d, round(sem, 2), round(com, 2))
```

```python name="variância dos produtos sem somar por linha"
import numpy as np


def variancias(d, n, semente):
    rng = np.random.default_rng(semente)
    Q = rng.normal(size=(n, d))
    K = rng.normal(size=(n, d))
    pontos = Q * K
    return float(pontos.var()), float((pontos / np.sqrt(d)).var())


def pesos_de_atencao(X, Wq, Wk):
    Q = X @ Wq
    K = X @ Wk
    S = Q @ K.T / np.sqrt(Q.shape[1])
    E = np.exp(S - S.max(axis=1, keepdims=True))
    return E / E.sum(axis=1, keepdims=True)


if __name__ == "__main__":
    for d in (4, 64):
        sem, com = variancias(d, 5000, 0)
        print(d, round(sem, 2), round(com, 2))
```

```python name="semente ignorada"
import numpy as np


def variancias(d, n, semente):
    rng = np.random.default_rng(0)
    Q = rng.normal(size=(n, d))
    K = rng.normal(size=(n, d))
    pontos = (Q * K).sum(axis=1)
    return float(pontos.var()), float((pontos / np.sqrt(d)).var())


def pesos_de_atencao(X, Wq, Wk):
    Q = X @ Wq
    K = X @ Wk
    S = Q @ K.T / np.sqrt(Q.shape[1])
    E = np.exp(S - S.max(axis=1, keepdims=True))
    return E / E.sum(axis=1, keepdims=True)


if __name__ == "__main__":
    for d in (4, 64):
        sem, com = variancias(d, 5000, 0)
        print(d, round(sem, 2), round(com, 2))
```

```python name="pesos com softmax por coluna"
import numpy as np


def variancias(d, n, semente):
    rng = np.random.default_rng(semente)
    Q = rng.normal(size=(n, d))
    K = rng.normal(size=(n, d))
    pontos = (Q * K).sum(axis=1)
    return float(pontos.var()), float((pontos / np.sqrt(d)).var())


def pesos_de_atencao(X, Wq, Wk):
    Q = X @ Wq
    K = X @ Wk
    S = Q @ K.T / np.sqrt(Q.shape[1])
    E = np.exp(S - S.max(axis=1, keepdims=True))
    return E / E.sum(axis=0, keepdims=True)


if __name__ == "__main__":
    for d in (4, 64):
        sem, com = variancias(d, 5000, 0)
        print(d, round(sem, 2), round(com, 2))
```

```python name="pesos sem a escala"
import numpy as np


def variancias(d, n, semente):
    rng = np.random.default_rng(semente)
    Q = rng.normal(size=(n, d))
    K = rng.normal(size=(n, d))
    pontos = (Q * K).sum(axis=1)
    return float(pontos.var()), float((pontos / np.sqrt(d)).var())


def pesos_de_atencao(X, Wq, Wk):
    Q = X @ Wq
    K = X @ Wk
    S = Q @ K.T
    E = np.exp(S - S.max(axis=1, keepdims=True))
    return E / E.sum(axis=1, keepdims=True)


if __name__ == "__main__":
    for d in (4, 64):
        sem, com = variancias(d, 5000, 0)
        print(d, round(sem, 2), round(com, 2))
```

```python name="escala pelo tamanho de X"
import numpy as np


def variancias(d, n, semente):
    rng = np.random.default_rng(semente)
    Q = rng.normal(size=(n, d))
    K = rng.normal(size=(n, d))
    pontos = (Q * K).sum(axis=1)
    return float(pontos.var()), float((pontos / np.sqrt(d)).var())


def pesos_de_atencao(X, Wq, Wk):
    Q = X @ Wq
    K = X @ Wk
    S = Q @ K.T / np.sqrt(X.shape[1])
    E = np.exp(S - S.max(axis=1, keepdims=True))
    return E / E.sum(axis=1, keepdims=True)


if __name__ == "__main__":
    for d in (4, 64):
        sem, com = variancias(d, 5000, 0)
        print(d, round(sem, 2), round(com, 2))
```

```python name="softmax sem subtrair o máximo"
import numpy as np


def variancias(d, n, semente):
    rng = np.random.default_rng(semente)
    Q = rng.normal(size=(n, d))
    K = rng.normal(size=(n, d))
    pontos = (Q * K).sum(axis=1)
    return float(pontos.var()), float((pontos / np.sqrt(d)).var())


def pesos_de_atencao(X, Wq, Wk):
    Q = X @ Wq
    K = X @ Wk
    S = Q @ K.T / np.sqrt(Q.shape[1])
    E = np.exp(S)
    return E / E.sum(axis=1, keepdims=True)


if __name__ == "__main__":
    for d in (4, 64):
        sem, com = variancias(d, 5000, 0)
        print(d, round(sem, 2), round(com, 2))
```

## Passo 6 · Leitura · O backward da atenção

O backward percorre o forward de trás para a frente. Chame de $dY$ o gradiente da perda em relação à saída $Y = A V$ (o `dsaida` do código), e use a mesma letra com um $d$ na frente para cada gradiente.

**Produto $Y = A V$.** As duas regras da multiplicação de matrizes que você usou na camada densa:

$$
dV = A^\top dY, \qquad dA = dY\, V^\top
$$

**Softmax por linha.** Cada linha de $A$ é a softmax da linha correspondente de $S$. Os pesos de uma linha estão acoplados: aumentar uma pontuação aumenta o peso dela e diminui todos os outros, porque a soma é 1. Para uma linha $a = \text{softmax}(s)$ com gradiente $da$:

$$
ds_j = a_j \left( da_j - \sum_{k} da_k\, a_k \right)
$$

O somatório é o **termo de acoplamento**. Sem ele (só $a \odot da$), o gradiente ignora que os pesos competem entre si. Em numpy, para todas as linhas de uma vez:

```python
dS = A * (dA - (dA * A).sum(axis=1, keepdims=True))
dS = dS / np.sqrt(d)          # desfaz a escala
```

Uma conferência rápida: somando $ds_j$ em $j$, o resultado é $\sum_j a_j da_j - \sum_j a_j \sum_k da_k a_k = 0$, porque $\sum_j a_j = 1$. Somar a mesma constante a todas as pontuações de uma linha não muda a softmax, e o gradiente respeita isso.

**Pontuações $S = Q K^\top / \sqrt{d}$.** Outra multiplicação de matrizes, agora com a transposta de $K$:

$$
dQ = dS\, K, \qquad dK = dS^\top Q
$$

**Projeções.** $Q = X W_q$, $K = X W_k$ e $V = X W_v$ são três camadas lineares sem viés:

$$
dW_q = X^\top dQ, \quad dW_k = X^\top dK, \quad dW_v = X^\top dV
$$

$$
dX = dQ\, W_q^\top + dK\, W_k^\top + dV\, W_v^\top
$$

$X$ foi usado três vezes, e os três caminhos se somam, como nos nós com mais de um filho do autograd.

**Custo.** A matriz $QK^\top$ tem $T^2$ entradas, cada uma um produto escalar de tamanho $d$: são $T^2 d$ multiplicações, e o produto $AV$ custa outro tanto. O custo da atenção é $O(T^2 d)$, no forward e no backward. Dobrar o comprimento da sequência multiplica o custo por 4, e é isso que limita o tamanho do contexto dos modelos.

## Passo 7 · Exercício · `atencao_backward(dsaida, cache)`

Escreva o backward da atenção de uma cabeça. O forward já está no arquivo e devolve `cache = (X, Wq, Wk, Wv, Q, K, V, A)`. A função recebe `dsaida`, o gradiente da perda em relação à saída (forma `(T, dv)`), e devolve a tupla `(dX, dWq, dWk, dWv)`, cada gradiente com a forma do array correspondente.

Os casos conferem os quatro gradientes com a diferença central ($h = 10^{-5}$, erro relativo abaixo de $10^{-7}$ por array) numa sequência com $T = 4$ e $d = 3$, e mostram um booleano por gradiente, na ordem `[dX, dWq, dWk, dWv]`.

### Instruções

1. Volte pelo produto $AV$: calcule `dV` e `dA`.
2. Volte pela softmax por linha, com o termo de acoplamento, e desfaça a escala $\sqrt{d}$.
3. Volte pelas pontuações (`dQ` e `dK`) e pelas três projeções: `dWq`, `dWk`, `dWv` e `dX` somando os três caminhos.

### Código inicial

```python
import numpy as np


def atencao_forward(X, Wq, Wk, Wv):
    Q = X @ Wq
    K = X @ Wk
    V = X @ Wv
    d = Q.shape[1]
    S = Q @ K.T / np.sqrt(d)
    E = np.exp(S - S.max(axis=1, keepdims=True))
    A = E / E.sum(axis=1, keepdims=True)
    saida = A @ V
    cache = (X, Wq, Wk, Wv, Q, K, V, A)
    return saida, cache


def atencao_backward(dsaida, cache):
    X, Wq, Wk, Wv, Q, K, V, A = cache
    # devolva (dX, dWq, dWk, dWv)
    pass


if __name__ == "__main__":
    rng = np.random.default_rng(0)
    X = rng.normal(size=(4, 3))
    Wq, Wk, Wv = rng.normal(size=(3, 3)), rng.normal(size=(3, 3)), rng.normal(size=(3, 3))
    saida, cache = atencao_forward(X, Wq, Wk, Wv)
    grads = atencao_backward(np.ones_like(saida), cache)
    print([g.shape for g in grads])
```

### Solução

```python
import numpy as np


def atencao_forward(X, Wq, Wk, Wv):
    Q = X @ Wq
    K = X @ Wk
    V = X @ Wv
    d = Q.shape[1]
    S = Q @ K.T / np.sqrt(d)
    E = np.exp(S - S.max(axis=1, keepdims=True))
    A = E / E.sum(axis=1, keepdims=True)
    saida = A @ V
    cache = (X, Wq, Wk, Wv, Q, K, V, A)
    return saida, cache


def atencao_backward(dsaida, cache):
    X, Wq, Wk, Wv, Q, K, V, A = cache
    d = Q.shape[1]
    dV = A.T @ dsaida
    dA = dsaida @ V.T
    dS = A * (dA - (dA * A).sum(axis=1, keepdims=True))
    dS = dS / np.sqrt(d)
    dQ = dS @ K
    dK = dS.T @ Q
    dWq = X.T @ dQ
    dWk = X.T @ dK
    dWv = X.T @ dV
    dX = dQ @ Wq.T + dK @ Wk.T + dV @ Wv.T
    return dX, dWq, dWk, dWv


if __name__ == "__main__":
    rng = np.random.default_rng(0)
    X = rng.normal(size=(4, 3))
    Wq, Wk, Wv = rng.normal(size=(3, 3)), rng.normal(size=(3, 3)), rng.normal(size=(3, 3))
    saida, cache = atencao_forward(X, Wq, Wk, Wv)
    grads = atencao_backward(np.ones_like(saida), cache)
    print([g.shape for g in grads])
```

### Dicas

1. Confira as formas: `dA` e `dS` são `(T, T)`; `dQ` e `dK` são `(T, d)`.
2. O termo de acoplamento é uma soma por linha: `(dA * A).sum(axis=1, keepdims=True)`.
3. `X` entra em `Q`, `K` e `V`: `dX` tem três parcelas.

### Verificação

```json
[
  {"id": "formas", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(8)\n_X = _rng.normal(size=(5, 4))\n_Wq, _Wk, _Wv = _rng.normal(size=(4, 3)), _rng.normal(size=(4, 3)), _rng.normal(size=(4, 2))\n_G = _rng.normal(size=(5, 2))\ndef _perda():\n    return float((atencao_forward(_X, _Wq, _Wk, _Wv)[0] * _G).sum())\ndef _numerico(a, h=1e-5):\n    g = np.zeros_like(a)\n    it = np.nditer(a, flags=[\"multi_index\"])\n    for _ in it:\n        i = it.multi_index\n        v = a[i]\n        a[i] = v + h\n        mais = _perda()\n        a[i] = v - h\n        menos = _perda()\n        a[i] = v\n        g[i] = (mais - menos) / (2 * h)\n    return g\ndef _erro(a, n):\n    return float(np.linalg.norm(a - n) / max(np.linalg.norm(a) + np.linalg.norm(n), 1e-8))\n_saida, _cache = atencao_forward(_X, _Wq, _Wk, _Wv)\n_dX, _dWq, _dWk, _dWv = atencao_backward(_G, _cache)\n", "expr": "[list(_dX.shape), list(_dWq.shape), list(_dWk.shape), list(_dWv.shape)]", "expected": [[5, 4], [4, 3], [4, 3], [4, 2]], "name": "Cada gradiente tem a forma do seu array"},
  {"id": "dwv", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(3)\n_X = _rng.normal(size=(4, 3))\n_Wq, _Wk, _Wv = _rng.normal(size=(3, 3)), _rng.normal(size=(3, 3)), _rng.normal(size=(3, 3))\n_G = _rng.normal(size=(4, 3))\ndef _perda():\n    return float((atencao_forward(_X, _Wq, _Wk, _Wv)[0] * _G).sum())\ndef _numerico(a, h=1e-5):\n    g = np.zeros_like(a)\n    it = np.nditer(a, flags=[\"multi_index\"])\n    for _ in it:\n        i = it.multi_index\n        v = a[i]\n        a[i] = v + h\n        mais = _perda()\n        a[i] = v - h\n        menos = _perda()\n        a[i] = v\n        g[i] = (mais - menos) / (2 * h)\n    return g\ndef _erro(a, n):\n    return float(np.linalg.norm(a - n) / max(np.linalg.norm(a) + np.linalg.norm(n), 1e-8))\n_saida, _cache = atencao_forward(_X, _Wq, _Wk, _Wv)\n_dX, _dWq, _dWk, _dWv = atencao_backward(_G, _cache)\n", "expr": "bool(_erro(_dWv, _numerico(_Wv)) < 1e-7)", "expected": true, "name": "dWv confere com a diferença central", "hint": "dV = A transposta vezes dsaida, e dWv = X transposta vezes dV."},
  {"id": "dwq", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(3)\n_X = _rng.normal(size=(4, 3))\n_Wq, _Wk, _Wv = _rng.normal(size=(3, 3)), _rng.normal(size=(3, 3)), _rng.normal(size=(3, 3))\n_G = _rng.normal(size=(4, 3))\ndef _perda():\n    return float((atencao_forward(_X, _Wq, _Wk, _Wv)[0] * _G).sum())\ndef _numerico(a, h=1e-5):\n    g = np.zeros_like(a)\n    it = np.nditer(a, flags=[\"multi_index\"])\n    for _ in it:\n        i = it.multi_index\n        v = a[i]\n        a[i] = v + h\n        mais = _perda()\n        a[i] = v - h\n        menos = _perda()\n        a[i] = v\n        g[i] = (mais - menos) / (2 * h)\n    return g\ndef _erro(a, n):\n    return float(np.linalg.norm(a - n) / max(np.linalg.norm(a) + np.linalg.norm(n), 1e-8))\n_saida, _cache = atencao_forward(_X, _Wq, _Wk, _Wv)\n_dX, _dWq, _dWk, _dWv = atencao_backward(_G, _cache)\n", "expr": "bool(_erro(_dWq, _numerico(_Wq)) < 1e-7)", "expected": true, "name": "dWq confere com a diferença central", "hint": "O caminho de Wq passa pela softmax: confira o termo de acoplamento e a escala."},
  {"id": "dwk", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(3)\n_X = _rng.normal(size=(4, 3))\n_Wq, _Wk, _Wv = _rng.normal(size=(3, 3)), _rng.normal(size=(3, 3)), _rng.normal(size=(3, 3))\n_G = _rng.normal(size=(4, 3))\ndef _perda():\n    return float((atencao_forward(_X, _Wq, _Wk, _Wv)[0] * _G).sum())\ndef _numerico(a, h=1e-5):\n    g = np.zeros_like(a)\n    it = np.nditer(a, flags=[\"multi_index\"])\n    for _ in it:\n        i = it.multi_index\n        v = a[i]\n        a[i] = v + h\n        mais = _perda()\n        a[i] = v - h\n        menos = _perda()\n        a[i] = v\n        g[i] = (mais - menos) / (2 * h)\n    return g\ndef _erro(a, n):\n    return float(np.linalg.norm(a - n) / max(np.linalg.norm(a) + np.linalg.norm(n), 1e-8))\n_saida, _cache = atencao_forward(_X, _Wq, _Wk, _Wv)\n_dX, _dWq, _dWk, _dWv = atencao_backward(_G, _cache)\n", "expr": "bool(_erro(_dWk, _numerico(_Wk)) < 1e-7)", "expected": true, "name": "dWk confere com a diferença central", "hint": "K entra transposta nas pontuações: dK usa a transposta de dS."},
  {"id": "checagem-t4-d3", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(3)\n_X = _rng.normal(size=(4, 3))\n_Wq, _Wk, _Wv = _rng.normal(size=(3, 3)), _rng.normal(size=(3, 3)), _rng.normal(size=(3, 3))\n_G = _rng.normal(size=(4, 3))\ndef _perda():\n    return float((atencao_forward(_X, _Wq, _Wk, _Wv)[0] * _G).sum())\ndef _numerico(a, h=1e-5):\n    g = np.zeros_like(a)\n    it = np.nditer(a, flags=[\"multi_index\"])\n    for _ in it:\n        i = it.multi_index\n        v = a[i]\n        a[i] = v + h\n        mais = _perda()\n        a[i] = v - h\n        menos = _perda()\n        a[i] = v\n        g[i] = (mais - menos) / (2 * h)\n    return g\ndef _erro(a, n):\n    return float(np.linalg.norm(a - n) / max(np.linalg.norm(a) + np.linalg.norm(n), 1e-8))\n_saida, _cache = atencao_forward(_X, _Wq, _Wk, _Wv)\n_dX, _dWq, _dWk, _dWv = atencao_backward(_G, _cache)\n", "expr": "[bool(_erro(a, _numerico(p)) < 1e-7) for a, p in ((_dX, _X), (_dWq, _Wq), (_dWk, _Wk), (_dWv, _Wv))]", "expected": [true, true, true, true], "name": "Checagem numérica com T = 4 e d = 3: [dX, dWq, dWk, dWv]", "hint": "O booleano falso mostra qual gradiente está errado."},
  {"id": "checagem-retangular", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(8)\n_X = _rng.normal(size=(5, 4))\n_Wq, _Wk, _Wv = _rng.normal(size=(4, 3)), _rng.normal(size=(4, 3)), _rng.normal(size=(4, 2))\n_G = _rng.normal(size=(5, 2))\ndef _perda():\n    return float((atencao_forward(_X, _Wq, _Wk, _Wv)[0] * _G).sum())\ndef _numerico(a, h=1e-5):\n    g = np.zeros_like(a)\n    it = np.nditer(a, flags=[\"multi_index\"])\n    for _ in it:\n        i = it.multi_index\n        v = a[i]\n        a[i] = v + h\n        mais = _perda()\n        a[i] = v - h\n        menos = _perda()\n        a[i] = v\n        g[i] = (mais - menos) / (2 * h)\n    return g\ndef _erro(a, n):\n    return float(np.linalg.norm(a - n) / max(np.linalg.norm(a) + np.linalg.norm(n), 1e-8))\n_saida, _cache = atencao_forward(_X, _Wq, _Wk, _Wv)\n_dX, _dWq, _dWk, _dWv = atencao_backward(_G, _cache)\n", "expr": "[bool(_erro(a, _numerico(p)) < 1e-7) for a, p in ((_dX, _X), (_dWq, _Wq), (_dWk, _Wk), (_dWv, _Wv))]", "expected": [true, true, true, true], "name": "Checagem numérica com T = 5, d_in = 4, d = 3, dv = 2"},
  {"id": "dsaida-zero", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(3)\n_X = _rng.normal(size=(4, 3))\n_Wq, _Wk, _Wv = _rng.normal(size=(3, 3)), _rng.normal(size=(3, 3)), _rng.normal(size=(3, 3))\n_G = _rng.normal(size=(4, 3))\ndef _perda():\n    return float((atencao_forward(_X, _Wq, _Wk, _Wv)[0] * _G).sum())\ndef _numerico(a, h=1e-5):\n    g = np.zeros_like(a)\n    it = np.nditer(a, flags=[\"multi_index\"])\n    for _ in it:\n        i = it.multi_index\n        v = a[i]\n        a[i] = v + h\n        mais = _perda()\n        a[i] = v - h\n        menos = _perda()\n        a[i] = v\n        g[i] = (mais - menos) / (2 * h)\n    return g\ndef _erro(a, n):\n    return float(np.linalg.norm(a - n) / max(np.linalg.norm(a) + np.linalg.norm(n), 1e-8))\n_saida, _cache = atencao_forward(_X, _Wq, _Wk, _Wv)\n_dX, _dWq, _dWk, _dWv = atencao_backward(_G, _cache)\n", "expr": "[bool(np.allclose(g, 0.0, atol=1e-15)) for g in atencao_backward(np.zeros((4, 3)), _cache)]", "expected": [true, true, true, true], "name": "Com dsaida zero, os quatro gradientes são zero"},
  {"id": "consulta-zero", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(3)\n_X = _rng.normal(size=(4, 3))\n_Wq, _Wk, _Wv = _rng.normal(size=(3, 3)), _rng.normal(size=(3, 3)), _rng.normal(size=(3, 3))\n_G = _rng.normal(size=(4, 3))\ndef _perda():\n    return float((atencao_forward(_X, _Wq, _Wk, _Wv)[0] * _G).sum())\ndef _numerico(a, h=1e-5):\n    g = np.zeros_like(a)\n    it = np.nditer(a, flags=[\"multi_index\"])\n    for _ in it:\n        i = it.multi_index\n        v = a[i]\n        a[i] = v + h\n        mais = _perda()\n        a[i] = v - h\n        menos = _perda()\n        a[i] = v\n        g[i] = (mais - menos) / (2 * h)\n    return g\ndef _erro(a, n):\n    return float(np.linalg.norm(a - n) / max(np.linalg.norm(a) + np.linalg.norm(n), 1e-8))\n_saida, _cache = atencao_forward(_X, _Wq, _Wk, _Wv)\n_dX, _dWq, _dWk, _dWv = atencao_backward(_G, _cache)\n_s0, _c0 = atencao_forward(_X, np.zeros((3, 3)), _Wk, _Wv)\n_g0 = atencao_backward(_G, _c0)", "expr": "[bool(np.allclose(_g0[2], 0.0, atol=1e-12)), bool(np.allclose(_g0[3], _X.T @ (np.ones((4, 4)) / 4.0 @ _G), atol=1e-12))]", "expected": [true, true], "name": "Com Wq = 0: dWk é zero e dWv usa pesos 1/T", "hint": "Com Q = 0, dK = dS transposta vezes Q é zero."},
  {"id": "linear", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(3)\n_X = _rng.normal(size=(4, 3))\n_Wq, _Wk, _Wv = _rng.normal(size=(3, 3)), _rng.normal(size=(3, 3)), _rng.normal(size=(3, 3))\n_G = _rng.normal(size=(4, 3))\ndef _perda():\n    return float((atencao_forward(_X, _Wq, _Wk, _Wv)[0] * _G).sum())\ndef _numerico(a, h=1e-5):\n    g = np.zeros_like(a)\n    it = np.nditer(a, flags=[\"multi_index\"])\n    for _ in it:\n        i = it.multi_index\n        v = a[i]\n        a[i] = v + h\n        mais = _perda()\n        a[i] = v - h\n        menos = _perda()\n        a[i] = v\n        g[i] = (mais - menos) / (2 * h)\n    return g\ndef _erro(a, n):\n    return float(np.linalg.norm(a - n) / max(np.linalg.norm(a) + np.linalg.norm(n), 1e-8))\n_saida, _cache = atencao_forward(_X, _Wq, _Wk, _Wv)\n_dX, _dWq, _dWk, _dWv = atencao_backward(_G, _cache)\n", "expr": "[bool(np.allclose(a, 3.0 * b, atol=1e-12)) for a, b in zip(atencao_backward(3.0 * _G, _cache), (_dX, _dWq, _dWk, _dWv))]", "expected": [true, true, true, true], "name": "Triplicar dsaida triplica os quatro gradientes"},
  {"id": "perda-cai", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(3)\n_X = _rng.normal(size=(4, 3))\n_Wq, _Wk, _Wv = _rng.normal(size=(3, 3)), _rng.normal(size=(3, 3)), _rng.normal(size=(3, 3))\n_G = _rng.normal(size=(4, 3))\ndef _perda():\n    return float((atencao_forward(_X, _Wq, _Wk, _Wv)[0] * _G).sum())\ndef _numerico(a, h=1e-5):\n    g = np.zeros_like(a)\n    it = np.nditer(a, flags=[\"multi_index\"])\n    for _ in it:\n        i = it.multi_index\n        v = a[i]\n        a[i] = v + h\n        mais = _perda()\n        a[i] = v - h\n        menos = _perda()\n        a[i] = v\n        g[i] = (mais - menos) / (2 * h)\n    return g\ndef _erro(a, n):\n    return float(np.linalg.norm(a - n) / max(np.linalg.norm(a) + np.linalg.norm(n), 1e-8))\n_saida, _cache = atencao_forward(_X, _Wq, _Wk, _Wv)\n_dX, _dWq, _dWk, _dWv = atencao_backward(_G, _cache)\n_Y = _rng.normal(size=(4, 3))\ndef _L():\n    return float(0.5 * ((atencao_forward(_X, _Wq, _Wk, _Wv)[0] - _Y) ** 2).sum())\n_ini = _L()\nfor _ in range(40):\n    _s, _c = atencao_forward(_X, _Wq, _Wk, _Wv)\n    _, _gq, _gk, _gv = atencao_backward(_s - _Y, _c)\n    _Wq -= 0.05 * _gq\n    _Wk -= 0.05 * _gk\n    _Wv -= 0.05 * _gv\n", "expr": "bool(_L() < 0.5 * _ini)", "expected": true, "name": "40 passos de descida com os seus gradientes levam a perda a menos da metade", "hint": "Com um gradiente errado em Wq, Wk ou Wv, a perda cai menos ou sobe."},
  {"id": "cache-intacto", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(3)\n_X = _rng.normal(size=(4, 3))\n_Wq, _Wk, _Wv = _rng.normal(size=(3, 3)), _rng.normal(size=(3, 3)), _rng.normal(size=(3, 3))\n_G = _rng.normal(size=(4, 3))\ndef _perda():\n    return float((atencao_forward(_X, _Wq, _Wk, _Wv)[0] * _G).sum())\ndef _numerico(a, h=1e-5):\n    g = np.zeros_like(a)\n    it = np.nditer(a, flags=[\"multi_index\"])\n    for _ in it:\n        i = it.multi_index\n        v = a[i]\n        a[i] = v + h\n        mais = _perda()\n        a[i] = v - h\n        menos = _perda()\n        a[i] = v\n        g[i] = (mais - menos) / (2 * h)\n    return g\ndef _erro(a, n):\n    return float(np.linalg.norm(a - n) / max(np.linalg.norm(a) + np.linalg.norm(n), 1e-8))\n_saida, _cache = atencao_forward(_X, _Wq, _Wk, _Wv)\n_dX, _dWq, _dWk, _dWv = atencao_backward(_G, _cache)\n_copias = [a.copy() for a in _cache]\natencao_backward(_G, _cache)", "expr": "all(bool(np.array_equal(a, b)) for a, b in zip(_cache, _copias))", "expected": true, "name": "O backward não altera os arrays do cache"}
]
```

### Soluções erradas

```python name="softmax sem o termo de acoplamento"
import numpy as np


def atencao_forward(X, Wq, Wk, Wv):
    Q = X @ Wq
    K = X @ Wk
    V = X @ Wv
    d = Q.shape[1]
    S = Q @ K.T / np.sqrt(d)
    E = np.exp(S - S.max(axis=1, keepdims=True))
    A = E / E.sum(axis=1, keepdims=True)
    saida = A @ V
    cache = (X, Wq, Wk, Wv, Q, K, V, A)
    return saida, cache


def atencao_backward(dsaida, cache):
    X, Wq, Wk, Wv, Q, K, V, A = cache
    d = Q.shape[1]
    dV = A.T @ dsaida
    dA = dsaida @ V.T
    dS = A * dA
    dS = dS / np.sqrt(d)
    dQ = dS @ K
    dK = dS.T @ Q
    dWq = X.T @ dQ
    dWk = X.T @ dK
    dWv = X.T @ dV
    dX = dQ @ Wq.T + dK @ Wk.T + dV @ Wv.T
    return dX, dWq, dWk, dWv


if __name__ == "__main__":
    rng = np.random.default_rng(0)
    X = rng.normal(size=(4, 3))
    Wq, Wk, Wv = rng.normal(size=(3, 3)), rng.normal(size=(3, 3)), rng.normal(size=(3, 3))
    saida, cache = atencao_forward(X, Wq, Wk, Wv)
    grads = atencao_backward(np.ones_like(saida), cache)
    print([g.shape for g in grads])
```

```python name="dX só pelo caminho de Q"
import numpy as np


def atencao_forward(X, Wq, Wk, Wv):
    Q = X @ Wq
    K = X @ Wk
    V = X @ Wv
    d = Q.shape[1]
    S = Q @ K.T / np.sqrt(d)
    E = np.exp(S - S.max(axis=1, keepdims=True))
    A = E / E.sum(axis=1, keepdims=True)
    saida = A @ V
    cache = (X, Wq, Wk, Wv, Q, K, V, A)
    return saida, cache


def atencao_backward(dsaida, cache):
    X, Wq, Wk, Wv, Q, K, V, A = cache
    d = Q.shape[1]
    dV = A.T @ dsaida
    dA = dsaida @ V.T
    dS = A * (dA - (dA * A).sum(axis=1, keepdims=True))
    dS = dS / np.sqrt(d)
    dQ = dS @ K
    dK = dS.T @ Q
    dWq = X.T @ dQ
    dWk = X.T @ dK
    dWv = X.T @ dV
    dX = dQ @ Wq.T
    return dX, dWq, dWk, dWv


if __name__ == "__main__":
    rng = np.random.default_rng(0)
    X = rng.normal(size=(4, 3))
    Wq, Wk, Wv = rng.normal(size=(3, 3)), rng.normal(size=(3, 3)), rng.normal(size=(3, 3))
    saida, cache = atencao_forward(X, Wq, Wk, Wv)
    grads = atencao_backward(np.ones_like(saida), cache)
    print([g.shape for g in grads])
```

```python name="escala esquecida no backward"
import numpy as np


def atencao_forward(X, Wq, Wk, Wv):
    Q = X @ Wq
    K = X @ Wk
    V = X @ Wv
    d = Q.shape[1]
    S = Q @ K.T / np.sqrt(d)
    E = np.exp(S - S.max(axis=1, keepdims=True))
    A = E / E.sum(axis=1, keepdims=True)
    saida = A @ V
    cache = (X, Wq, Wk, Wv, Q, K, V, A)
    return saida, cache


def atencao_backward(dsaida, cache):
    X, Wq, Wk, Wv, Q, K, V, A = cache
    d = Q.shape[1]
    dV = A.T @ dsaida
    dA = dsaida @ V.T
    dS = A * (dA - (dA * A).sum(axis=1, keepdims=True))
    dQ = dS @ K
    dK = dS.T @ Q
    dWq = X.T @ dQ
    dWk = X.T @ dK
    dWv = X.T @ dV
    dX = dQ @ Wq.T + dK @ Wk.T + dV @ Wv.T
    return dX, dWq, dWk, dWv


if __name__ == "__main__":
    rng = np.random.default_rng(0)
    X = rng.normal(size=(4, 3))
    Wq, Wk, Wv = rng.normal(size=(3, 3)), rng.normal(size=(3, 3)), rng.normal(size=(3, 3))
    saida, cache = atencao_forward(X, Wq, Wk, Wv)
    grads = atencao_backward(np.ones_like(saida), cache)
    print([g.shape for g in grads])
```

```python name="dK sem transpor dS"
import numpy as np


def atencao_forward(X, Wq, Wk, Wv):
    Q = X @ Wq
    K = X @ Wk
    V = X @ Wv
    d = Q.shape[1]
    S = Q @ K.T / np.sqrt(d)
    E = np.exp(S - S.max(axis=1, keepdims=True))
    A = E / E.sum(axis=1, keepdims=True)
    saida = A @ V
    cache = (X, Wq, Wk, Wv, Q, K, V, A)
    return saida, cache


def atencao_backward(dsaida, cache):
    X, Wq, Wk, Wv, Q, K, V, A = cache
    d = Q.shape[1]
    dV = A.T @ dsaida
    dA = dsaida @ V.T
    dS = A * (dA - (dA * A).sum(axis=1, keepdims=True))
    dS = dS / np.sqrt(d)
    dQ = dS @ K
    dK = dS @ Q
    dWq = X.T @ dQ
    dWk = X.T @ dK
    dWv = X.T @ dV
    dX = dQ @ Wq.T + dK @ Wk.T + dV @ Wv.T
    return dX, dWq, dWk, dWv


if __name__ == "__main__":
    rng = np.random.default_rng(0)
    X = rng.normal(size=(4, 3))
    Wq, Wk, Wv = rng.normal(size=(3, 3)), rng.normal(size=(3, 3)), rng.normal(size=(3, 3))
    saida, cache = atencao_forward(X, Wq, Wk, Wv)
    grads = atencao_backward(np.ones_like(saida), cache)
    print([g.shape for g in grads])
```

```python name="dV com A sem transpor"
import numpy as np


def atencao_forward(X, Wq, Wk, Wv):
    Q = X @ Wq
    K = X @ Wk
    V = X @ Wv
    d = Q.shape[1]
    S = Q @ K.T / np.sqrt(d)
    E = np.exp(S - S.max(axis=1, keepdims=True))
    A = E / E.sum(axis=1, keepdims=True)
    saida = A @ V
    cache = (X, Wq, Wk, Wv, Q, K, V, A)
    return saida, cache


def atencao_backward(dsaida, cache):
    X, Wq, Wk, Wv, Q, K, V, A = cache
    d = Q.shape[1]
    dV = A @ dsaida
    dA = dsaida @ V.T
    dS = A * (dA - (dA * A).sum(axis=1, keepdims=True))
    dS = dS / np.sqrt(d)
    dQ = dS @ K
    dK = dS.T @ Q
    dWq = X.T @ dQ
    dWk = X.T @ dK
    dWv = X.T @ dV
    dX = dQ @ Wq.T + dK @ Wk.T + dV @ Wv.T
    return dX, dWq, dWk, dWv


if __name__ == "__main__":
    rng = np.random.default_rng(0)
    X = rng.normal(size=(4, 3))
    Wq, Wk, Wv = rng.normal(size=(3, 3)), rng.normal(size=(3, 3)), rng.normal(size=(3, 3))
    saida, cache = atencao_forward(X, Wq, Wk, Wv)
    grads = atencao_backward(np.ones_like(saida), cache)
    print([g.shape for g in grads])
```

```python name="acoplamento somado no eixo errado"
import numpy as np


def atencao_forward(X, Wq, Wk, Wv):
    Q = X @ Wq
    K = X @ Wk
    V = X @ Wv
    d = Q.shape[1]
    S = Q @ K.T / np.sqrt(d)
    E = np.exp(S - S.max(axis=1, keepdims=True))
    A = E / E.sum(axis=1, keepdims=True)
    saida = A @ V
    cache = (X, Wq, Wk, Wv, Q, K, V, A)
    return saida, cache


def atencao_backward(dsaida, cache):
    X, Wq, Wk, Wv, Q, K, V, A = cache
    d = Q.shape[1]
    dV = A.T @ dsaida
    dA = dsaida @ V.T
    dS = A * (dA - (dA * A).sum(axis=0, keepdims=True))
    dS = dS / np.sqrt(d)
    dQ = dS @ K
    dK = dS.T @ Q
    dWq = X.T @ dQ
    dWk = X.T @ dK
    dWv = X.T @ dV
    dX = dQ @ Wq.T + dK @ Wk.T + dV @ Wv.T
    return dX, dWq, dWk, dWv


if __name__ == "__main__":
    rng = np.random.default_rng(0)
    X = rng.normal(size=(4, 3))
    Wq, Wk, Wv = rng.normal(size=(3, 3)), rng.normal(size=(3, 3)), rng.normal(size=(3, 3))
    saida, cache = atencao_forward(X, Wq, Wk, Wv)
    grads = atencao_backward(np.ones_like(saida), cache)
    print([g.shape for g in grads])
```

```python name="dX sem o caminho dos valores"
import numpy as np


def atencao_forward(X, Wq, Wk, Wv):
    Q = X @ Wq
    K = X @ Wk
    V = X @ Wv
    d = Q.shape[1]
    S = Q @ K.T / np.sqrt(d)
    E = np.exp(S - S.max(axis=1, keepdims=True))
    A = E / E.sum(axis=1, keepdims=True)
    saida = A @ V
    cache = (X, Wq, Wk, Wv, Q, K, V, A)
    return saida, cache


def atencao_backward(dsaida, cache):
    X, Wq, Wk, Wv, Q, K, V, A = cache
    d = Q.shape[1]
    dV = A.T @ dsaida
    dA = dsaida @ V.T
    dS = A * (dA - (dA * A).sum(axis=1, keepdims=True))
    dS = dS / np.sqrt(d)
    dQ = dS @ K
    dK = dS.T @ Q
    dWq = X.T @ dQ
    dWk = X.T @ dK
    dWv = X.T @ dV
    dX = dQ @ Wq.T + dK @ Wk.T
    return dX, dWq, dWk, dWv


if __name__ == "__main__":
    rng = np.random.default_rng(0)
    X = rng.normal(size=(4, 3))
    Wq, Wk, Wv = rng.normal(size=(3, 3)), rng.normal(size=(3, 3)), rng.normal(size=(3, 3))
    saida, cache = atencao_forward(X, Wq, Wk, Wv)
    grads = atencao_backward(np.ones_like(saida), cache)
    print([g.shape for g in grads])
```

## Passo 8 · Quiz · Q, K e V

### Pergunta

Numa sequência de 2 posições, as pontuações já escaladas são `S = [[ln 1, ln 3], [ln 2, ln 2]]` e os valores são `V = [[10, 0], [0, 20]]`. Qual é a saída da atenção para a **primeira** posição?

- [x] `[2.5, 15.0]`: os pesos da primeira linha são 0,25 e 0,75, e a saída é a média das linhas de `V` com esses pesos
- [ ] `[10.0, 0.0]`: cada posição recebe de volta o próprio valor
- [ ] `[5.0, 10.0]`: a atenção devolve sempre a média simples dos valores
- [ ] `[7.5, 5.0]`: os pesos 0,75 e 0,25 multiplicam a primeira e a segunda linha de `V`

> A softmax de `[ln 1, ln 3]` é `[1/4, 3/4]`, e `0,25 · [10, 0] + 0,75 · [0, 20] = [2,5, 15]`. A posição só recebe o próprio valor se todo o peso ficar nela; a média simples é a segunda linha, que tem pontuações iguais; e `[7,5, 5]` troca a ordem dos pesos.

### Pergunta

Medindo 20 000 pares de vetores normais com $d = 64$, a variância das pontuações é 62,92 sem a escala e 0,98 com ela, e o maior peso de uma linha de 8 posições passa de 0,88 para 0,36. Uma pessoa tira a divisão por $\sqrt{d}$ do forward de um modelo com $d = 256$. O que ela deve esperar no começo do treino?

- [ ] Nada muda, porque a softmax normaliza as pontuações de qualquer tamanho
- [ ] Os pesos de atenção ficam quase iguais entre si, e a camada devolve a média simples dos valores
- [x] Os pesos ficam concentrados em uma posição por linha (0,94 na medida da lição), e o gradiente pela softmax fica perto de zero
- [ ] As pontuações ficam menores, e a atenção passa a ignorar as chaves

> Sem a escala, o desvio padrão das pontuações é 16 com $d = 256$, a softmax satura e a derivada $a(1 - a)$ fica perto de zero. A softmax normaliza a soma dos pesos, não a distância entre as pontuações; pesos quase iguais seriam o efeito de pontuações pequenas, o contrário do que acontece; e as pontuações ficam maiores, não menores.

### Pergunta

Uma implementação do backward passa na checagem numérica de `dWv`, mas falha em `dWq` e em `dWk`. Os erros relativos medidos são 0,92 em `dWq` e 0,91 em `dWk`, e 0 em `dWv`. Qual é o defeito mais provável?

- [ ] `dV = A @ dsaida`, sem a transposta de `A`
- [x] `dS = A * dA`, sem o termo de acoplamento da softmax
- [ ] `dWv = X.T @ dV` com `X` transposto a mais
- [ ] `dX` somando só duas das três parcelas

> `Wq` e `Wk` só influenciam a saída pela softmax, e `Wv` não passa por ela: um defeito em `dS` estraga `dWq` e `dWk` e deixa `dWv` certo. Um `dV` ou um `dWv` errado apareceria justamente em `dWv`; e um `dX` incompleto não muda os gradientes dos três pesos.
