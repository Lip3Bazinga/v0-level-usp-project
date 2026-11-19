---
slug: n6-m5-02-camadas-conv-e-pooling-com-backward
titulo: Camadas conv e pooling com backward
descricao: Backward da convolução (gradiente do filtro e da entrada) via im2col, max pooling e seu backward (roteamento), campo receptivo e contagem de parâmetros.
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
- Implementar forward e backward da camada convolucional e verificar numericamente
- Implementar max pooling com backward e explicar o roteamento do gradiente
- Calcular campo receptivo e número de parâmetros de uma pilha conv/pool
---

## Passo 1 · Leitura · A convolução vira uma densa

Na lição anterior, o im2col transformou a convolução num produto de matrizes. Isso resolve também o backward, porque esse produto é exatamente a camada densa do módulo 4, e o backward dela já está escrito.

O arquivo `camadas_conv.py` desta lição traz o forward pronto. `im2col(X, k, p)` devolve `cols`, com uma janela por linha, e `conv_forward(X, F, b, p)` faz a conta e guarda o que o backward vai precisar:

```python
cols = im2col(X, k, p)                              # (N · H_s · W_s, C · k · k)
saida = cols @ F.reshape(n_filtros, C * k * k).T + b    # (N · H_s · W_s, F)
saida = saida.reshape(N, hs, ws, n_filtros).transpose(0, 3, 1, 2)
cache = (cols, X.shape, F, p)
```

Chame de $M$ o número de janelas, $N \cdot H_s \cdot W_s$, e de $W$ a matriz dos filtros achatados, de forma $(F, C k^2)$. A conta do meio é uma densa com entrada `cols`, pesos $W^\top$ e viés $b$:

$$Z = \text{cols} \, W^\top + b \qquad \text{com } Z \text{ de forma } (M, F)$$

O backward recebe `dout`, o gradiente da perda em relação à saída, com a forma dela: `(N, F, H_s, W_s)`. O primeiro passo é desfazer a reorganização do forward, levando o eixo dos filtros de volta para o fim e juntando o resto em $M$ linhas:

```python
dmat = dout.transpose(0, 2, 3, 1).reshape(-1, n_filtros)    # (M, F)
```

Daí em diante valem as três fórmulas da densa, com `cols` no papel da entrada:

$$\frac{\partial L}{\partial W^\top} = \text{cols}^\top \, \text{dmat} \qquad \frac{\partial L}{\partial b} = \sum_{m} \text{dmat}_{m} \qquad \frac{\partial L}{\partial \text{cols}} = \text{dmat} \, W$$

A primeira tem forma $(C k^2, F)$: uma coluna por filtro. Transposta e devolvida à forma `(F, C, k, k)` com `reshape`, ela é o gradiente dos filtros. Cada peso do filtro acumula a contribuição de **todas** as janelas em que ele foi usado, e essa é a consequência do compartilhamento de pesos: um peso, muitas posições, um gradiente que soma todas elas. O viés, um por filtro, soma `dmat` nas $M$ linhas.

A terceira fórmula dá o gradiente de cada janela, mas ainda não o gradiente da imagem: um pixel aparece em várias janelas. Juntar essas parcelas é o trabalho do `col2im`, no passo 4. Antes, o próximo passo conta quantas janelas cobrem cada pixel.

## Passo 2 · Previsão · Quantas janelas cobrem cada pixel

Um filtro 3 × 3 desliza por uma imagem 4 × 4, sem padding e com stride 1. O programa conta, para cada pixel, em quantas janelas ele aparece. Leia sem executar e digite o que ele imprime.

### Código
```python
contagem = [[0] * 4 for _ in range(4)]
for i in range(2):
    for j in range(2):
        for a in range(3):
            for b in range(3):
                contagem[i + a][j + b] += 1
for linha in contagem:
    print(linha)
```

### Dicas
1. São quatro janelas: a de cima à esquerda, a de cima à direita e as duas de baixo.
2. O pixel do canto `(0, 0)` só cabe na primeira janela.
3. Os quatro pixels do centro cabem em todas as janelas.

### Saída esperada
```text
[1, 2, 2, 1]
[2, 4, 4, 2]
[2, 4, 4, 2]
[1, 2, 2, 1]
```

## Passo 3 · Exercício · `dW` e `db` da convolução
modo: lacunas

Complete as lacunas (`___`) de `conv_backward_pesos`, que recebe `dout` de forma `(N, F, H_s, W_s)` e o `cache` do `conv_forward` de `camadas_conv.py`, e devolve os gradientes dos filtros e dos vieses.

### Instruções
1. `dmat` é `dout` reorganizado para a forma `(M, F)`, com uma linha por janela, na mesma ordem das linhas de `cols`.
2. `dF` tem a forma dos filtros, `(F, C, k, k)`: é $\text{cols}^\top \, \text{dmat}$ transposto e devolvido a essa forma.
3. `db` tem forma `(F,)`: a soma de `dmat` em todas as janelas, sem dividir pelo tamanho do lote.

### Código inicial
```python
import numpy as np
from camadas_conv import conv_forward


def conv_backward_pesos(dout, cache):
    cols, forma_x, F, p = cache
    n_filtros = F.shape[0]
    dmat = dout.transpose(___).reshape(-1, n_filtros)
    dW = ___
    dF = ___.reshape(F.shape)
    db = ___
    return dF, db
```
```python path=camadas_conv.py
import numpy as np


def im2col(X, k, p):
    """Janelas k × k de X (N, C, H, W) com padding p, uma por linha: (N * Hs * Ws, C * k * k)."""
    N, C = X.shape[:2]
    Xp = np.pad(X, ((0, 0), (0, 0), (p, p), (p, p)))
    janelas = np.lib.stride_tricks.sliding_window_view(Xp, (k, k), axis=(2, 3))
    hs, ws = janelas.shape[2], janelas.shape[3]
    return janelas.transpose(0, 2, 3, 1, 4, 5).reshape(N * hs * ws, C * k * k)


def conv_forward(X, F, b, p):
    """Convolução com stride 1. Devolve a saída (N, F, Hs, Ws) e o cache (cols, X.shape, F, p)."""
    N, C, H, W = X.shape
    n_filtros, k = F.shape[0], F.shape[2]
    hs, ws = H + 2 * p - k + 1, W + 2 * p - k + 1
    cols = im2col(X, k, p)
    saida = cols @ F.reshape(n_filtros, C * k * k).T + b
    return saida.reshape(N, hs, ws, n_filtros).transpose(0, 3, 1, 2), (cols, X.shape, F, p)
```

### Solução
```python
import numpy as np
from camadas_conv import conv_forward


def conv_backward_pesos(dout, cache):
    cols, forma_x, F, p = cache
    n_filtros = F.shape[0]
    dmat = dout.transpose(0, 2, 3, 1).reshape(-1, n_filtros)
    dW = cols.T @ dmat
    dF = dW.T.reshape(F.shape)
    db = dmat.sum(axis=0)
    return dF, db
```
```python path=camadas_conv.py
import numpy as np


def im2col(X, k, p):
    """Janelas k × k de X (N, C, H, W) com padding p, uma por linha: (N * Hs * Ws, C * k * k)."""
    N, C = X.shape[:2]
    Xp = np.pad(X, ((0, 0), (0, 0), (p, p), (p, p)))
    janelas = np.lib.stride_tricks.sliding_window_view(Xp, (k, k), axis=(2, 3))
    hs, ws = janelas.shape[2], janelas.shape[3]
    return janelas.transpose(0, 2, 3, 1, 4, 5).reshape(N * hs * ws, C * k * k)


def conv_forward(X, F, b, p):
    """Convolução com stride 1. Devolve a saída (N, F, Hs, Ws) e o cache (cols, X.shape, F, p)."""
    N, C, H, W = X.shape
    n_filtros, k = F.shape[0], F.shape[2]
    hs, ws = H + 2 * p - k + 1, W + 2 * p - k + 1
    cols = im2col(X, k, p)
    saida = cols @ F.reshape(n_filtros, C * k * k).T + b
    return saida.reshape(N, hs, ws, n_filtros).transpose(0, 3, 1, 2), (cols, X.shape, F, p)
```

### Dicas
1. O forward terminou com `.transpose(0, 3, 1, 2)`; o backward começa levando o eixo dos filtros (o 1) de volta para o fim.
2. `cols.T @ dmat` tem uma coluna por filtro; o `reshape` para `(F, C, k, k)` precisa de uma **linha** por filtro.
3. A soma do viés é sobre as linhas de `dmat` (as janelas), e sobra um número por filtro.

### Verificação
```json
[
  {"id": "formas", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom camadas_conv import conv_forward as _cf, im2col as _im2col\n_r = np.random.default_rng(3)\ndef _num(f, A, h=1e-5):\n    G = np.zeros_like(A)\n    for i in np.ndindex(A.shape):\n        v = A[i]\n        A[i] = v + h\n        mais = f()\n        A[i] = v - h\n        menos = f()\n        A[i] = v\n        G[i] = (mais - menos) / (2 * h)\n    return G\ndef _erro(a, n):\n    if a.shape != n.shape:\n        return 1.0\n    return float(np.linalg.norm(a - n) / (np.linalg.norm(a) + np.linalg.norm(n) + 1e-12))\nX = _r.normal(size=(2, 2, 5, 5))\nF = _r.normal(size=(3, 2, 3, 3))\nb = _r.normal(size=3)\nG = _r.normal(size=(2, 3, 3, 3))\n_L = lambda: float((_cf(X, F, b, 0)[0] * G).sum())\ncache = _cf(X, F, b, 0)[1]\ndF, db = conv_backward_pesos(G, cache)\n", "expr": "[list(dF.shape), list(db.shape)]", "expected": [[3, 2, 3, 3], [3]], "name": "dF tem a forma dos filtros e db tem um número por filtro"},
  {"id": "uma-posicao", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom camadas_conv import conv_forward as _cf, im2col as _im2col\n_r = np.random.default_rng(3)\ndef _num(f, A, h=1e-5):\n    G = np.zeros_like(A)\n    for i in np.ndindex(A.shape):\n        v = A[i]\n        A[i] = v + h\n        mais = f()\n        A[i] = v - h\n        menos = f()\n        A[i] = v\n        G[i] = (mais - menos) / (2 * h)\n    return G\ndef _erro(a, n):\n    if a.shape != n.shape:\n        return 1.0\n    return float(np.linalg.norm(a - n) / (np.linalg.norm(a) + np.linalg.norm(n) + 1e-12))\nX = np.arange(16.0).reshape(1, 1, 4, 4)\nF = np.zeros((1, 1, 3, 3))\ndout = np.zeros((1, 1, 2, 2))\ndout[0, 0, 0, 0] = 1.0\ndF, db = conv_backward_pesos(dout, _cf(X, F, np.zeros(1), 0)[1])", "expr": "dF[0, 0].tolist()", "expected": [[0.0, 1.0, 2.0], [4.0, 5.0, 6.0], [8.0, 9.0, 10.0]], "tolerance": 1e-12, "name": "Gradiente 1 só na primeira posição da saída: dF é a primeira janela da imagem", "hint": "Cada janela contribui com (gradiente da posição) × (valores da janela)."},
  {"id": "todas-as-posicoes", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nfrom camadas_conv import conv_forward as _cf, im2col as _im2col\n_r = np.random.default_rng(3)\ndef _num(f, A, h=1e-5):\n    G = np.zeros_like(A)\n    for i in np.ndindex(A.shape):\n        v = A[i]\n        A[i] = v + h\n        mais = f()\n        A[i] = v - h\n        menos = f()\n        A[i] = v\n        G[i] = (mais - menos) / (2 * h)\n    return G\ndef _erro(a, n):\n    if a.shape != n.shape:\n        return 1.0\n    return float(np.linalg.norm(a - n) / (np.linalg.norm(a) + np.linalg.norm(n) + 1e-12))\nX = np.ones((1, 1, 4, 4))\nF = np.zeros((1, 1, 3, 3))\ndF, db = conv_backward_pesos(np.ones((1, 1, 2, 2)), _cf(X, F, np.zeros(1), 0)[1])", "expr": "dF[0, 0].tolist()", "expected": [[4.0, 4.0, 4.0], [4.0, 4.0, 4.0], [4.0, 4.0, 4.0]], "tolerance": 1e-12, "name": "Imagem de uns e dout de uns: cada peso soma as 4 janelas", "hint": "O gradiente de um peso compartilhado soma todas as posições."},
  {"id": "filtros-separados", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nfrom camadas_conv import conv_forward as _cf, im2col as _im2col\n_r = np.random.default_rng(3)\ndef _num(f, A, h=1e-5):\n    G = np.zeros_like(A)\n    for i in np.ndindex(A.shape):\n        v = A[i]\n        A[i] = v + h\n        mais = f()\n        A[i] = v - h\n        menos = f()\n        A[i] = v\n        G[i] = (mais - menos) / (2 * h)\n    return G\ndef _erro(a, n):\n    if a.shape != n.shape:\n        return 1.0\n    return float(np.linalg.norm(a - n) / (np.linalg.norm(a) + np.linalg.norm(n) + 1e-12))\nX = np.ones((1, 1, 4, 4))\nF = np.zeros((2, 1, 3, 3))\ndout = np.zeros((1, 2, 2, 2))\ndout[0, 1] = 1.0\ndF, db = conv_backward_pesos(dout, _cf(X, F, np.zeros(2), 0)[1])", "expr": "[dF[0, 0].tolist(), dF[1, 0].tolist()]", "expected": [[[0.0, 0.0, 0.0], [0.0, 0.0, 0.0], [0.0, 0.0, 0.0]], [[4.0, 4.0, 4.0], [4.0, 4.0, 4.0], [4.0, 4.0, 4.0]]], "tolerance": 1e-12, "name": "dout só no mapa do filtro 1: o filtro 0 recebe gradiente zero", "hint": "Leve o eixo dos filtros de dout para o fim antes do reshape, e transponha cols.T @ dmat antes de voltar à forma dos filtros."},
  {"id": "canais", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nfrom camadas_conv import conv_forward as _cf, im2col as _im2col\n_r = np.random.default_rng(3)\ndef _num(f, A, h=1e-5):\n    G = np.zeros_like(A)\n    for i in np.ndindex(A.shape):\n        v = A[i]\n        A[i] = v + h\n        mais = f()\n        A[i] = v - h\n        menos = f()\n        A[i] = v\n        G[i] = (mais - menos) / (2 * h)\n    return G\ndef _erro(a, n):\n    if a.shape != n.shape:\n        return 1.0\n    return float(np.linalg.norm(a - n) / (np.linalg.norm(a) + np.linalg.norm(n) + 1e-12))\nX = np.arange(27.0).reshape(1, 3, 3, 3)\nF = np.zeros((1, 3, 3, 3))\ndF, db = conv_backward_pesos(np.full((1, 1, 1, 1), 2.0), _cf(X, F, np.zeros(1), 0)[1])", "expr": "bool(np.allclose(dF, 2.0 * X, atol=1e-12))", "expected": true, "name": "Uma janela só com três canais: dF é dout vezes a própria imagem"},
  {"id": "numerico-dF", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nfrom camadas_conv import conv_forward as _cf, im2col as _im2col\n_r = np.random.default_rng(3)\ndef _num(f, A, h=1e-5):\n    G = np.zeros_like(A)\n    for i in np.ndindex(A.shape):\n        v = A[i]\n        A[i] = v + h\n        mais = f()\n        A[i] = v - h\n        menos = f()\n        A[i] = v\n        G[i] = (mais - menos) / (2 * h)\n    return G\ndef _erro(a, n):\n    if a.shape != n.shape:\n        return 1.0\n    return float(np.linalg.norm(a - n) / (np.linalg.norm(a) + np.linalg.norm(n) + 1e-12))\nX = _r.normal(size=(2, 2, 5, 5))\nF = _r.normal(size=(3, 2, 3, 3))\nb = _r.normal(size=3)\nG = _r.normal(size=(2, 3, 3, 3))\n_L = lambda: float((_cf(X, F, b, 0)[0] * G).sum())\ncache = _cf(X, F, b, 0)[1]\ndF, db = conv_backward_pesos(G, cache)\n", "expr": "bool(_erro(dF, _num(_L, F)) < 1e-7)", "expected": true, "name": "dF confere com o gradiente numérico (2 imagens 5 × 5, 2 canais, 3 filtros)", "hint": "dW = cols.T @ dmat, sem dividir por nada."},
  {"id": "numerico-dF-padding", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nfrom camadas_conv import conv_forward as _cf, im2col as _im2col\n_r = np.random.default_rng(3)\ndef _num(f, A, h=1e-5):\n    G = np.zeros_like(A)\n    for i in np.ndindex(A.shape):\n        v = A[i]\n        A[i] = v + h\n        mais = f()\n        A[i] = v - h\n        menos = f()\n        A[i] = v\n        G[i] = (mais - menos) / (2 * h)\n    return G\ndef _erro(a, n):\n    if a.shape != n.shape:\n        return 1.0\n    return float(np.linalg.norm(a - n) / (np.linalg.norm(a) + np.linalg.norm(n) + 1e-12))\nX = _r.normal(size=(2, 1, 4, 5))\nF = _r.normal(size=(2, 1, 3, 3))\nb = _r.normal(size=2)\nG = _r.normal(size=(2, 2, 4, 5))\n_L = lambda: float((_cf(X, F, b, 1)[0] * G).sum())\ncache = _cf(X, F, b, 1)[1]\ndF, db = conv_backward_pesos(G, cache)\n", "expr": "bool(_erro(dF, _num(_L, F)) < 1e-7)", "expected": true, "name": "dF confere com o gradiente numérico com padding 1 em imagens 4 × 5"},
  {"id": "db-uns", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom camadas_conv import conv_forward as _cf, im2col as _im2col\n_r = np.random.default_rng(3)\ndef _num(f, A, h=1e-5):\n    G = np.zeros_like(A)\n    for i in np.ndindex(A.shape):\n        v = A[i]\n        A[i] = v + h\n        mais = f()\n        A[i] = v - h\n        menos = f()\n        A[i] = v\n        G[i] = (mais - menos) / (2 * h)\n    return G\ndef _erro(a, n):\n    if a.shape != n.shape:\n        return 1.0\n    return float(np.linalg.norm(a - n) / (np.linalg.norm(a) + np.linalg.norm(n) + 1e-12))\nX = _r.normal(size=(3, 1, 4, 4))\nF = _r.normal(size=(2, 1, 3, 3))\ndF, db = conv_backward_pesos(np.ones((3, 2, 2, 2)), _cf(X, F, np.zeros(2), 0)[1])", "expr": "db.tolist()", "expected": [12.0, 12.0], "tolerance": 1e-12, "name": "dout de uns com 3 imagens e 4 posições: db vale 12 para cada filtro", "hint": "O viés soma todas as janelas de todas as imagens."},
  {"id": "db-por-filtro", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom camadas_conv import conv_forward as _cf, im2col as _im2col\n_r = np.random.default_rng(3)\ndef _num(f, A, h=1e-5):\n    G = np.zeros_like(A)\n    for i in np.ndindex(A.shape):\n        v = A[i]\n        A[i] = v + h\n        mais = f()\n        A[i] = v - h\n        menos = f()\n        A[i] = v\n        G[i] = (mais - menos) / (2 * h)\n    return G\ndef _erro(a, n):\n    if a.shape != n.shape:\n        return 1.0\n    return float(np.linalg.norm(a - n) / (np.linalg.norm(a) + np.linalg.norm(n) + 1e-12))\nX = _r.normal(size=(2, 1, 3, 3))\nF = _r.normal(size=(3, 1, 3, 3))\ndout = np.array([1.0, 10.0, 100.0]).reshape(1, 3, 1, 1) * np.ones((2, 1, 1, 1))\ndF, db = conv_backward_pesos(dout, _cf(X, F, np.zeros(3), 0)[1])", "expr": "db.tolist()", "expected": [2.0, 20.0, 200.0], "tolerance": 1e-12, "name": "Cada filtro soma só o gradiente do seu mapa"},
  {"id": "numerico-db", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom camadas_conv import conv_forward as _cf, im2col as _im2col\n_r = np.random.default_rng(3)\ndef _num(f, A, h=1e-5):\n    G = np.zeros_like(A)\n    for i in np.ndindex(A.shape):\n        v = A[i]\n        A[i] = v + h\n        mais = f()\n        A[i] = v - h\n        menos = f()\n        A[i] = v\n        G[i] = (mais - menos) / (2 * h)\n    return G\ndef _erro(a, n):\n    if a.shape != n.shape:\n        return 1.0\n    return float(np.linalg.norm(a - n) / (np.linalg.norm(a) + np.linalg.norm(n) + 1e-12))\nX = _r.normal(size=(2, 2, 5, 5))\nF = _r.normal(size=(3, 2, 3, 3))\nb = _r.normal(size=3)\nG = _r.normal(size=(2, 3, 3, 3))\n_L = lambda: float((_cf(X, F, b, 0)[0] * G).sum())\ncache = _cf(X, F, b, 0)[1]\ndF, db = conv_backward_pesos(G, cache)\n", "expr": "bool(_erro(db, _num(_L, b)) < 1e-7)", "expected": true, "name": "db confere com o gradiente numérico"}
]
```

### Soluções erradas
```python name="dout achatado sem levar os filtros para o último eixo"
import numpy as np
from camadas_conv import conv_forward


def conv_backward_pesos(dout, cache):
    cols, forma_x, F, p = cache
    n_filtros = F.shape[0]
    dmat = dout.transpose(0, 1, 2, 3).reshape(-1, n_filtros)
    dW = cols.T @ dmat
    dF = dW.T.reshape(F.shape)
    db = dmat.sum(axis=0)
    return dF, db
```
```python name="dF com reshape direto, sem transpor"
import numpy as np
from camadas_conv import conv_forward


def conv_backward_pesos(dout, cache):
    cols, forma_x, F, p = cache
    n_filtros = F.shape[0]
    dmat = dout.transpose(0, 2, 3, 1).reshape(-1, n_filtros)
    dW = cols.T @ dmat
    dF = dW.reshape(F.shape)
    db = dmat.sum(axis=0)
    return dF, db
```
```python name="db somado em tudo (um número só)"
import numpy as np
from camadas_conv import conv_forward


def conv_backward_pesos(dout, cache):
    cols, forma_x, F, p = cache
    n_filtros = F.shape[0]
    dmat = dout.transpose(0, 2, 3, 1).reshape(-1, n_filtros)
    dW = cols.T @ dmat
    dF = dW.T.reshape(F.shape)
    db = dmat.sum()
    return dF, db
```
```python name="db com a média no lugar da soma"
import numpy as np
from camadas_conv import conv_forward


def conv_backward_pesos(dout, cache):
    cols, forma_x, F, p = cache
    n_filtros = F.shape[0]
    dmat = dout.transpose(0, 2, 3, 1).reshape(-1, n_filtros)
    dW = cols.T @ dmat
    dF = dW.T.reshape(F.shape)
    db = dmat.mean(axis=0)
    return dF, db
```
```python name="db somado nos filtros (axis=1)"
import numpy as np
from camadas_conv import conv_forward


def conv_backward_pesos(dout, cache):
    cols, forma_x, F, p = cache
    n_filtros = F.shape[0]
    dmat = dout.transpose(0, 2, 3, 1).reshape(-1, n_filtros)
    dW = cols.T @ dmat
    dF = dW.T.reshape(F.shape)
    db = dmat.sum(axis=1)
    return dF, db
```
```python name="dW dividido pelo tamanho do lote"
import numpy as np
from camadas_conv import conv_forward


def conv_backward_pesos(dout, cache):
    cols, forma_x, F, p = cache
    n_filtros = F.shape[0]
    dmat = dout.transpose(0, 2, 3, 1).reshape(-1, n_filtros)
    dW = cols.T @ dmat / forma_x[0]
    dF = dW.T.reshape(F.shape)
    db = dmat.sum(axis=0)
    return dF, db
```
```python name="produto na ordem trocada (dmat.T @ cols)"
import numpy as np
from camadas_conv import conv_forward


def conv_backward_pesos(dout, cache):
    cols, forma_x, F, p = cache
    n_filtros = F.shape[0]
    dmat = dout.transpose(0, 2, 3, 1).reshape(-1, n_filtros)
    dW = dmat.T @ cols
    dF = dW.T.reshape(F.shape)
    db = dmat.sum(axis=0)
    return dF, db
```

## Passo 4 · Leitura · `col2im` soma as sobreposições

O gradiente `dcols = dmat @ W` tem a forma de `cols`: uma linha por janela, $C \cdot k \cdot k$ números por linha. Para chegar a `dX`, com a forma da imagem, cada número precisa voltar para o pixel de onde saiu. Essa volta se chama **col2im**.

O cuidado é que o im2col **copiou** cada pixel para várias janelas. A previsão do passo 2 contou: numa imagem 4 × 4 com filtro 3 × 3, os cantos aparecem em 1 janela, as bordas em 2 e os quatro pixels do centro em 4. Quando uma variável é usada em vários lugares, o gradiente dela é a **soma** dos gradientes de cada uso, a mesma regra do `+=` no `backward` da classe `Valor` do módulo 2.

É aqui que mora um defeito silencioso do numpy. Com índices repetidos, `+=` não acumula:

```python
d = np.zeros(4)
idx = np.array([0, 1, 1, 2])
d[idx] += 1.0            # [1.0, 1.0, 1.0, 0.0]: o índice 1 contou uma vez
np.add.at(d, idx, 1.0)   # a partir de zeros: [1.0, 2.0, 1.0, 0.0]
```

`d[idx] += 1.0` lê `d[idx]`, soma e escreve de volta; as duas escritas na posição 1 gravam o mesmo valor. `np.add.at` soma uma parcela por vez. Medido no executor, devolvendo 36 parcelas iguais a 1 para a imagem 4 × 4 (4 janelas de 9 números) com arrays de índices: com `+=`, a imagem sai toda com 1 e soma 16; com `np.add.at`, sai a matriz de contagens do passo 2 e soma 36. Nenhuma das duas dá erro.

Há um caminho que evita os índices repetidos: percorrer as $k^2$ posições do filtro. Fixada uma posição `(a, b)` do filtro, cada janela contribui para um pixel **diferente**, e o conjunto desses pixels é uma fatia da imagem:

```python
for a in range(k):
    for b in range(k):
        dXp[:, :, a:a + hs, b:b + ws] += parcelas_da_posicao(a, b)   # (N, C, hs, ws)
```

Dentro de uma fatia não há pixel repetido, e o `+=` entre fatias diferentes acumula como deve. Trocar esse `+=` por `=` é o mesmo defeito por outro caminho: a última posição do filtro sobrescreve as anteriores.

Se o forward usou padding, `dXp` tem a forma da imagem com a moldura. O gradiente dos zeros da moldura não interessa: no fim, corta-se a moldura e sobra `dX` com a forma de `X`.

## Passo 5 · Exercício · `col2im` e `dX`

Escreva `col2im`, que devolve os gradientes das janelas para a imagem, e `conv_backward_entrada`, que calcula o gradiente da perda em relação à entrada da convolução. O arquivo `camadas_conv.py` traz `im2col` e `conv_forward`, com stride 1.

### Instruções
1. `col2im(dcols, forma, k, p)` recebe `dcols` de forma `(N · H_s · W_s, C · k · k)`, com as linhas e as colunas na ordem do `im2col`, e `forma = (N, C, H, W)`. Devolve um array com essa forma em que cada pixel é a **soma** das parcelas de todas as janelas que o contêm.
2. Com padding `p`, as parcelas que caem na moldura de zeros são descartadas: a saída continua com a forma `(N, C, H, W)`.
3. `conv_backward_entrada(dout, cache)` recebe `dout` de forma `(N, F, H_s, W_s)` e o `cache` do `conv_forward` e devolve `dX`, com a forma da entrada: `dcols = dmat @ W`, com `W` os filtros achatados em `(F, C · k · k)`, devolvido para a imagem com `col2im`.

### Código inicial
```python
import numpy as np
from camadas_conv import im2col, conv_forward


def col2im(dcols, forma, k, p):
    # Escreva aqui
    pass


def conv_backward_entrada(dout, cache):
    cols, forma_x, F, p = cache
    # Escreva aqui
    pass
```
```python path=camadas_conv.py
import numpy as np


def im2col(X, k, p):
    """Janelas k × k de X (N, C, H, W) com padding p, uma por linha: (N * Hs * Ws, C * k * k)."""
    N, C = X.shape[:2]
    Xp = np.pad(X, ((0, 0), (0, 0), (p, p), (p, p)))
    janelas = np.lib.stride_tricks.sliding_window_view(Xp, (k, k), axis=(2, 3))
    hs, ws = janelas.shape[2], janelas.shape[3]
    return janelas.transpose(0, 2, 3, 1, 4, 5).reshape(N * hs * ws, C * k * k)


def conv_forward(X, F, b, p):
    """Convolução com stride 1. Devolve a saída (N, F, Hs, Ws) e o cache (cols, X.shape, F, p)."""
    N, C, H, W = X.shape
    n_filtros, k = F.shape[0], F.shape[2]
    hs, ws = H + 2 * p - k + 1, W + 2 * p - k + 1
    cols = im2col(X, k, p)
    saida = cols @ F.reshape(n_filtros, C * k * k).T + b
    return saida.reshape(N, hs, ws, n_filtros).transpose(0, 3, 1, 2), (cols, X.shape, F, p)
```

### Solução
```python
import numpy as np
from camadas_conv import im2col, conv_forward


def col2im(dcols, forma, k, p):
    N, C, H, W = forma
    hs, ws = H + 2 * p - k + 1, W + 2 * p - k + 1
    d = dcols.reshape(N, hs, ws, C, k, k)
    dXp = np.zeros((N, C, H + 2 * p, W + 2 * p))
    for a in range(k):
        for b in range(k):
            dXp[:, :, a:a + hs, b:b + ws] += d[:, :, :, :, a, b].transpose(0, 3, 1, 2)
    return dXp[:, :, p:p + H, p:p + W]


def conv_backward_entrada(dout, cache):
    cols, forma_x, F, p = cache
    n_filtros, k = F.shape[0], F.shape[2]
    dmat = dout.transpose(0, 2, 3, 1).reshape(-1, n_filtros)
    dcols = dmat @ F.reshape(n_filtros, -1)
    return col2im(dcols, forma_x, k, p)
```
```python path=camadas_conv.py
import numpy as np


def im2col(X, k, p):
    """Janelas k × k de X (N, C, H, W) com padding p, uma por linha: (N * Hs * Ws, C * k * k)."""
    N, C = X.shape[:2]
    Xp = np.pad(X, ((0, 0), (0, 0), (p, p), (p, p)))
    janelas = np.lib.stride_tricks.sliding_window_view(Xp, (k, k), axis=(2, 3))
    hs, ws = janelas.shape[2], janelas.shape[3]
    return janelas.transpose(0, 2, 3, 1, 4, 5).reshape(N * hs * ws, C * k * k)


def conv_forward(X, F, b, p):
    """Convolução com stride 1. Devolve a saída (N, F, Hs, Ws) e o cache (cols, X.shape, F, p)."""
    N, C, H, W = X.shape
    n_filtros, k = F.shape[0], F.shape[2]
    hs, ws = H + 2 * p - k + 1, W + 2 * p - k + 1
    cols = im2col(X, k, p)
    saida = cols @ F.reshape(n_filtros, C * k * k).T + b
    return saida.reshape(N, hs, ws, n_filtros).transpose(0, 3, 1, 2), (cols, X.shape, F, p)
```

### Dicas
1. Desfaça o `reshape` do `im2col`: `dcols.reshape(N, hs, ws, C, k, k)` separa janela, canal e posição do filtro.
2. Para cada posição `(a, b)` do filtro, as parcelas de todas as janelas formam um array `(N, hs, ws, C)`, que vai para a fatia `[a:a + hs, b:b + ws]` da imagem com padding, com `+=`.
3. Monte a imagem com a moldura, `(N, C, H + 2p, W + 2p)`, e corte `p` de cada lado no fim.

### Verificação
```json
[
  {"id": "contagem", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom camadas_conv import conv_forward as _cf, im2col as _im2col\n_r = np.random.default_rng(3)\ndef _num(f, A, h=1e-5):\n    G = np.zeros_like(A)\n    for i in np.ndindex(A.shape):\n        v = A[i]\n        A[i] = v + h\n        mais = f()\n        A[i] = v - h\n        menos = f()\n        A[i] = v\n        G[i] = (mais - menos) / (2 * h)\n    return G\ndef _erro(a, n):\n    if a.shape != n.shape:\n        return 1.0\n    return float(np.linalg.norm(a - n) / (np.linalg.norm(a) + np.linalg.norm(n) + 1e-12))\n", "expr": "col2im(np.ones((4, 9)), (1, 1, 4, 4), 3, 0)[0, 0].tolist()", "expected": [[1.0, 2.0, 2.0, 1.0], [2.0, 4.0, 4.0, 2.0], [2.0, 4.0, 4.0, 2.0], [1.0, 2.0, 2.0, 1.0]], "tolerance": 1e-12, "name": "Parcelas iguais a 1 numa imagem 4 × 4 com filtro 3 × 3: a matriz de contagens do passo 2", "hint": "Cada pixel soma as parcelas de todas as janelas em que aparece."},
  {"id": "forma", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom camadas_conv import conv_forward as _cf, im2col as _im2col\n_r = np.random.default_rng(3)\ndef _num(f, A, h=1e-5):\n    G = np.zeros_like(A)\n    for i in np.ndindex(A.shape):\n        v = A[i]\n        A[i] = v + h\n        mais = f()\n        A[i] = v - h\n        menos = f()\n        A[i] = v\n        G[i] = (mais - menos) / (2 * h)\n    return G\ndef _erro(a, n):\n    if a.shape != n.shape:\n        return 1.0\n    return float(np.linalg.norm(a - n) / (np.linalg.norm(a) + np.linalg.norm(n) + 1e-12))\n", "expr": "list(col2im(np.zeros((2 * 3 * 4, 2 * 9)), (2, 2, 5, 6), 3, 0).shape)", "expected": [2, 2, 5, 6], "name": "A saída tem a forma pedida: (2, 2, 5, 6)"},
  {"id": "uma-janela", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom camadas_conv import conv_forward as _cf, im2col as _im2col\n_r = np.random.default_rng(3)\ndef _num(f, A, h=1e-5):\n    G = np.zeros_like(A)\n    for i in np.ndindex(A.shape):\n        v = A[i]\n        A[i] = v + h\n        mais = f()\n        A[i] = v - h\n        menos = f()\n        A[i] = v\n        G[i] = (mais - menos) / (2 * h)\n    return G\ndef _erro(a, n):\n    if a.shape != n.shape:\n        return 1.0\n    return float(np.linalg.norm(a - n) / (np.linalg.norm(a) + np.linalg.norm(n) + 1e-12))\nD = np.zeros((4, 9))\nD[3] = np.arange(9.0)", "expr": "col2im(D, (1, 1, 4, 4), 3, 0)[0, 0].tolist()", "expected": [[0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 1.0, 2.0], [0.0, 3.0, 4.0, 5.0], [0.0, 6.0, 7.0, 8.0]], "tolerance": 1e-12, "name": "Só a última janela tem parcelas: elas voltam para o canto de baixo à direita, na ordem do filtro", "hint": "A coluna a * k + b de dcols é a posição (a, b) do filtro."},
  {"id": "canais", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom camadas_conv import conv_forward as _cf, im2col as _im2col\n_r = np.random.default_rng(3)\ndef _num(f, A, h=1e-5):\n    G = np.zeros_like(A)\n    for i in np.ndindex(A.shape):\n        v = A[i]\n        A[i] = v + h\n        mais = f()\n        A[i] = v - h\n        menos = f()\n        A[i] = v\n        G[i] = (mais - menos) / (2 * h)\n    return G\ndef _erro(a, n):\n    if a.shape != n.shape:\n        return 1.0\n    return float(np.linalg.norm(a - n) / (np.linalg.norm(a) + np.linalg.norm(n) + 1e-12))\n", "expr": "bool(np.array_equal(col2im(np.arange(18.0).reshape(1, 18), (1, 2, 3, 3), 3, 0), np.arange(18.0).reshape(1, 2, 3, 3)))", "expected": true, "name": "Uma janela do tamanho da imagem com 2 canais: col2im desfaz o im2col", "hint": "Em cada linha de dcols vêm primeiro os k · k números do canal 0, depois os do canal 1."},
  {"id": "adjunta", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom camadas_conv import conv_forward as _cf, im2col as _im2col\n_r = np.random.default_rng(3)\ndef _num(f, A, h=1e-5):\n    G = np.zeros_like(A)\n    for i in np.ndindex(A.shape):\n        v = A[i]\n        A[i] = v + h\n        mais = f()\n        A[i] = v - h\n        menos = f()\n        A[i] = v\n        G[i] = (mais - menos) / (2 * h)\n    return G\ndef _erro(a, n):\n    if a.shape != n.shape:\n        return 1.0\n    return float(np.linalg.norm(a - n) / (np.linalg.norm(a) + np.linalg.norm(n) + 1e-12))\nX = _r.normal(size=(2, 2, 5, 6))\nD = _r.normal(size=_im2col(X, 3, 0).shape)\n_a = float((_im2col(X, 3, 0) * D).sum())\n_b = float((X * col2im(D, X.shape, 3, 0)).sum())", "expr": "bool(abs(_a - _b) < 1e-9)", "expected": true, "name": "soma(im2col(X) · D) = soma(X · col2im(D)) para X e D sorteados", "hint": "col2im devolve cada parcela para o pixel de onde o im2col a copiou."},
  {"id": "padding-contagem", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nfrom camadas_conv import conv_forward as _cf, im2col as _im2col\n_r = np.random.default_rng(3)\ndef _num(f, A, h=1e-5):\n    G = np.zeros_like(A)\n    for i in np.ndindex(A.shape):\n        v = A[i]\n        A[i] = v + h\n        mais = f()\n        A[i] = v - h\n        menos = f()\n        A[i] = v\n        G[i] = (mais - menos) / (2 * h)\n    return G\ndef _erro(a, n):\n    if a.shape != n.shape:\n        return 1.0\n    return float(np.linalg.norm(a - n) / (np.linalg.norm(a) + np.linalg.norm(n) + 1e-12))\n", "expr": "col2im(np.ones((9, 9)), (1, 1, 3, 3), 3, 1)[0, 0].tolist()", "expected": [[4.0, 6.0, 4.0], [6.0, 9.0, 6.0], [4.0, 6.0, 4.0]], "tolerance": 1e-12, "name": "Imagem 3 × 3 com padding 1: cantos em 4 janelas, bordas em 6, centro em 9", "hint": "Monte a imagem com a moldura e corte p de cada lado no fim."},
  {"id": "padding-forma", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nfrom camadas_conv import conv_forward as _cf, im2col as _im2col\n_r = np.random.default_rng(3)\ndef _num(f, A, h=1e-5):\n    G = np.zeros_like(A)\n    for i in np.ndindex(A.shape):\n        v = A[i]\n        A[i] = v + h\n        mais = f()\n        A[i] = v - h\n        menos = f()\n        A[i] = v\n        G[i] = (mais - menos) / (2 * h)\n    return G\ndef _erro(a, n):\n    if a.shape != n.shape:\n        return 1.0\n    return float(np.linalg.norm(a - n) / (np.linalg.norm(a) + np.linalg.norm(n) + 1e-12))\n", "expr": "list(col2im(np.zeros((2 * 4 * 5, 3 * 9)), (2, 3, 4, 5), 3, 1).shape)", "expected": [2, 3, 4, 5], "name": "Com padding 1, a saída continua com a forma da imagem"},
  {"id": "padding-adjunta", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nfrom camadas_conv import conv_forward as _cf, im2col as _im2col\n_r = np.random.default_rng(3)\ndef _num(f, A, h=1e-5):\n    G = np.zeros_like(A)\n    for i in np.ndindex(A.shape):\n        v = A[i]\n        A[i] = v + h\n        mais = f()\n        A[i] = v - h\n        menos = f()\n        A[i] = v\n        G[i] = (mais - menos) / (2 * h)\n    return G\ndef _erro(a, n):\n    if a.shape != n.shape:\n        return 1.0\n    return float(np.linalg.norm(a - n) / (np.linalg.norm(a) + np.linalg.norm(n) + 1e-12))\nX = _r.normal(size=(2, 2, 4, 5))\nD = _r.normal(size=_im2col(X, 3, 1).shape)\n_a = float((_im2col(X, 3, 1) * D).sum())\n_b = float((X * col2im(D, X.shape, 3, 1)).sum())", "expr": "bool(abs(_a - _b) < 1e-9)", "expected": true, "name": "Com padding 1, soma(im2col(X) · D) = soma(X · col2im(D))"},
  {"id": "dX-literal", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom camadas_conv import conv_forward as _cf, im2col as _im2col\n_r = np.random.default_rng(3)\ndef _num(f, A, h=1e-5):\n    G = np.zeros_like(A)\n    for i in np.ndindex(A.shape):\n        v = A[i]\n        A[i] = v + h\n        mais = f()\n        A[i] = v - h\n        menos = f()\n        A[i] = v\n        G[i] = (mais - menos) / (2 * h)\n    return G\ndef _erro(a, n):\n    if a.shape != n.shape:\n        return 1.0\n    return float(np.linalg.norm(a - n) / (np.linalg.norm(a) + np.linalg.norm(n) + 1e-12))\nF = np.arange(9.0).reshape(1, 1, 3, 3)\ncache = _cf(np.zeros((1, 1, 3, 3)), F, np.zeros(1), 0)[1]", "expr": "conv_backward_entrada(np.full((1, 1, 1, 1), 2.0), cache)[0, 0].tolist()", "expected": [[0.0, 2.0, 4.0], [6.0, 8.0, 10.0], [12.0, 14.0, 16.0]], "tolerance": 1e-12, "name": "Uma janela só: dX é o gradiente da saída vezes o filtro"},
  {"id": "dX-forma", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom camadas_conv import conv_forward as _cf, im2col as _im2col\n_r = np.random.default_rng(3)\ndef _num(f, A, h=1e-5):\n    G = np.zeros_like(A)\n    for i in np.ndindex(A.shape):\n        v = A[i]\n        A[i] = v + h\n        mais = f()\n        A[i] = v - h\n        menos = f()\n        A[i] = v\n        G[i] = (mais - menos) / (2 * h)\n    return G\ndef _erro(a, n):\n    if a.shape != n.shape:\n        return 1.0\n    return float(np.linalg.norm(a - n) / (np.linalg.norm(a) + np.linalg.norm(n) + 1e-12))\nX = _r.normal(size=(2, 1, 5, 5))\nF = _r.normal(size=(2, 1, 3, 3))\nb = _r.normal(size=2)\nG = _r.normal(size=(2, 2, 3, 3))\n_L = lambda: float((_cf(X, F, b, 0)[0] * G).sum())\ncache = _cf(X, F, b, 0)[1]\ndX = conv_backward_entrada(G, cache)\n", "expr": "list(dX.shape)", "expected": [2, 1, 5, 5], "name": "dX tem a forma da entrada"},
  {"id": "dX-numerico", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom camadas_conv import conv_forward as _cf, im2col as _im2col\n_r = np.random.default_rng(3)\ndef _num(f, A, h=1e-5):\n    G = np.zeros_like(A)\n    for i in np.ndindex(A.shape):\n        v = A[i]\n        A[i] = v + h\n        mais = f()\n        A[i] = v - h\n        menos = f()\n        A[i] = v\n        G[i] = (mais - menos) / (2 * h)\n    return G\ndef _erro(a, n):\n    if a.shape != n.shape:\n        return 1.0\n    return float(np.linalg.norm(a - n) / (np.linalg.norm(a) + np.linalg.norm(n) + 1e-12))\nX = _r.normal(size=(2, 1, 5, 5))\nF = _r.normal(size=(2, 1, 3, 3))\nb = _r.normal(size=2)\nG = _r.normal(size=(2, 2, 3, 3))\n_L = lambda: float((_cf(X, F, b, 0)[0] * G).sum())\ncache = _cf(X, F, b, 0)[1]\ndX = conv_backward_entrada(G, cache)\n", "expr": "bool(_erro(dX, _num(_L, X)) < 1e-7)", "expected": true, "name": "dX confere com o gradiente numérico (imagens 5 × 5, 2 filtros)", "hint": "dcols = dmat @ W, com dmat de forma (M, F) e W de forma (F, C · k · k)."},
  {"id": "dX-numerico-padding", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom camadas_conv import conv_forward as _cf, im2col as _im2col\n_r = np.random.default_rng(3)\ndef _num(f, A, h=1e-5):\n    G = np.zeros_like(A)\n    for i in np.ndindex(A.shape):\n        v = A[i]\n        A[i] = v + h\n        mais = f()\n        A[i] = v - h\n        menos = f()\n        A[i] = v\n        G[i] = (mais - menos) / (2 * h)\n    return G\ndef _erro(a, n):\n    if a.shape != n.shape:\n        return 1.0\n    return float(np.linalg.norm(a - n) / (np.linalg.norm(a) + np.linalg.norm(n) + 1e-12))\nX = _r.normal(size=(2, 2, 4, 5))\nF = _r.normal(size=(3, 2, 3, 3))\nb = _r.normal(size=3)\nG = _r.normal(size=(2, 3, 4, 5))\n_L = lambda: float((_cf(X, F, b, 1)[0] * G).sum())\ncache = _cf(X, F, b, 1)[1]\ndX = conv_backward_entrada(G, cache)\n", "expr": "bool(_erro(dX, _num(_L, X)) < 1e-7)", "expected": true, "name": "dX confere com o gradiente numérico com 2 canais, 3 filtros e padding 1"}
]
```

### Soluções erradas
```python name="col2im sobrescreve no lugar de somar"
import numpy as np
from camadas_conv import im2col, conv_forward


def col2im(dcols, forma, k, p):
    N, C, H, W = forma
    hs, ws = H + 2 * p - k + 1, W + 2 * p - k + 1
    d = dcols.reshape(N, hs, ws, C, k, k)
    dXp = np.zeros((N, C, H + 2 * p, W + 2 * p))
    for a in range(k):
        for b in range(k):
            dXp[:, :, a:a + hs, b:b + ws] = d[:, :, :, :, a, b].transpose(0, 3, 1, 2)
    return dXp[:, :, p:p + H, p:p + W]


def conv_backward_entrada(dout, cache):
    cols, forma_x, F, p = cache
    n_filtros, k = F.shape[0], F.shape[2]
    dmat = dout.transpose(0, 2, 3, 1).reshape(-1, n_filtros)
    dcols = dmat @ F.reshape(n_filtros, -1)
    return col2im(dcols, forma_x, k, p)
```
```python name="não corta a moldura do padding"
import numpy as np
from camadas_conv import im2col, conv_forward


def col2im(dcols, forma, k, p):
    N, C, H, W = forma
    hs, ws = H + 2 * p - k + 1, W + 2 * p - k + 1
    d = dcols.reshape(N, hs, ws, C, k, k)
    dXp = np.zeros((N, C, H + 2 * p, W + 2 * p))
    for a in range(k):
        for b in range(k):
            dXp[:, :, a:a + hs, b:b + ws] += d[:, :, :, :, a, b].transpose(0, 3, 1, 2)
    return dXp


def conv_backward_entrada(dout, cache):
    cols, forma_x, F, p = cache
    n_filtros, k = F.shape[0], F.shape[2]
    dmat = dout.transpose(0, 2, 3, 1).reshape(-1, n_filtros)
    dcols = dmat @ F.reshape(n_filtros, -1)
    return col2im(dcols, forma_x, k, p)
```
```python name="corta a moldura no canto errado"
import numpy as np
from camadas_conv import im2col, conv_forward


def col2im(dcols, forma, k, p):
    N, C, H, W = forma
    hs, ws = H + 2 * p - k + 1, W + 2 * p - k + 1
    d = dcols.reshape(N, hs, ws, C, k, k)
    dXp = np.zeros((N, C, H + 2 * p, W + 2 * p))
    for a in range(k):
        for b in range(k):
            dXp[:, :, a:a + hs, b:b + ws] += d[:, :, :, :, a, b].transpose(0, 3, 1, 2)
    return dXp[:, :, :H, :W]


def conv_backward_entrada(dout, cache):
    cols, forma_x, F, p = cache
    n_filtros, k = F.shape[0], F.shape[2]
    dmat = dout.transpose(0, 2, 3, 1).reshape(-1, n_filtros)
    dcols = dmat @ F.reshape(n_filtros, -1)
    return col2im(dcols, forma_x, k, p)
```
```python name="canais no lugar errado ao desfazer o reshape"
import numpy as np
from camadas_conv import im2col, conv_forward


def col2im(dcols, forma, k, p):
    N, C, H, W = forma
    hs, ws = H + 2 * p - k + 1, W + 2 * p - k + 1
    d = dcols.reshape(N, C, hs, ws, k, k).transpose(0, 2, 3, 1, 4, 5)
    dXp = np.zeros((N, C, H + 2 * p, W + 2 * p))
    for a in range(k):
        for b in range(k):
            dXp[:, :, a:a + hs, b:b + ws] += d[:, :, :, :, a, b].transpose(0, 3, 1, 2)
    return dXp[:, :, p:p + H, p:p + W]


def conv_backward_entrada(dout, cache):
    cols, forma_x, F, p = cache
    n_filtros, k = F.shape[0], F.shape[2]
    dmat = dout.transpose(0, 2, 3, 1).reshape(-1, n_filtros)
    dcols = dmat @ F.reshape(n_filtros, -1)
    return col2im(dcols, forma_x, k, p)
```
```python name="linha e coluna do filtro trocadas"
import numpy as np
from camadas_conv import im2col, conv_forward


def col2im(dcols, forma, k, p):
    N, C, H, W = forma
    hs, ws = H + 2 * p - k + 1, W + 2 * p - k + 1
    d = dcols.reshape(N, hs, ws, C, k, k)
    dXp = np.zeros((N, C, H + 2 * p, W + 2 * p))
    for a in range(k):
        for b in range(k):
            dXp[:, :, a:a + hs, b:b + ws] += d[:, :, :, :, b, a].transpose(0, 3, 1, 2)
    return dXp[:, :, p:p + H, p:p + W]


def conv_backward_entrada(dout, cache):
    cols, forma_x, F, p = cache
    n_filtros, k = F.shape[0], F.shape[2]
    dmat = dout.transpose(0, 2, 3, 1).reshape(-1, n_filtros)
    dcols = dmat @ F.reshape(n_filtros, -1)
    return col2im(dcols, forma_x, k, p)
```
```python name="dout achatado sem levar os filtros para o último eixo"
import numpy as np
from camadas_conv import im2col, conv_forward


def col2im(dcols, forma, k, p):
    N, C, H, W = forma
    hs, ws = H + 2 * p - k + 1, W + 2 * p - k + 1
    d = dcols.reshape(N, hs, ws, C, k, k)
    dXp = np.zeros((N, C, H + 2 * p, W + 2 * p))
    for a in range(k):
        for b in range(k):
            dXp[:, :, a:a + hs, b:b + ws] += d[:, :, :, :, a, b].transpose(0, 3, 1, 2)
    return dXp[:, :, p:p + H, p:p + W]


def conv_backward_entrada(dout, cache):
    cols, forma_x, F, p = cache
    n_filtros, k = F.shape[0], F.shape[2]
    dmat = dout.reshape(-1, n_filtros)
    dcols = dmat @ F.reshape(n_filtros, -1)
    return col2im(dcols, forma_x, k, p)
```
```python name="tamanho da saída calculado sem o padding"
import numpy as np
from camadas_conv import im2col, conv_forward


def col2im(dcols, forma, k, p):
    N, C, H, W = forma
    hs, ws = H - k + 1, W - k + 1
    d = dcols.reshape(N, hs, ws, C, k, k)
    dXp = np.zeros((N, C, H + 2 * p, W + 2 * p))
    for a in range(k):
        for b in range(k):
            dXp[:, :, a:a + hs, b:b + ws] += d[:, :, :, :, a, b].transpose(0, 3, 1, 2)
    return dXp[:, :, p:p + H, p:p + W]


def conv_backward_entrada(dout, cache):
    cols, forma_x, F, p = cache
    n_filtros, k = F.shape[0], F.shape[2]
    dmat = dout.transpose(0, 2, 3, 1).reshape(-1, n_filtros)
    dcols = dmat @ F.reshape(n_filtros, -1)
    return col2im(dcols, forma_x, k, p)
```
```python name="soma com índices repetidos sem np.add.at"
import numpy as np
from camadas_conv import im2col, conv_forward


def col2im(dcols, forma, k, p):
    N, C, H, W = forma
    hs, ws = H + 2 * p - k + 1, W + 2 * p - k + 1
    d = dcols.reshape(N, hs, ws, C, k, k)
    dXp = np.zeros((N, C, H + 2 * p, W + 2 * p))
    i, j, a, b = np.meshgrid(np.arange(hs), np.arange(ws), np.arange(k), np.arange(k), indexing="ij")
    dXp.transpose(2, 3, 0, 1)[i + a, j + b] += d.transpose(1, 2, 4, 5, 0, 3)
    return dXp[:, :, p:p + H, p:p + W]


def conv_backward_entrada(dout, cache):
    cols, forma_x, F, p = cache
    n_filtros, k = F.shape[0], F.shape[2]
    dmat = dout.transpose(0, 2, 3, 1).reshape(-1, n_filtros)
    dcols = dmat @ F.reshape(n_filtros, -1)
    return col2im(dcols, forma_x, k, p)
```

## Passo 6 · Leitura · Max pooling, campo receptivo e parâmetros

Depois de uma convolução, é comum reduzir os mapas de ativação com **max pooling**: a imagem é dividida em blocos 2 × 2 sem sobreposição (janela 2, stride 2) e de cada bloco fica só o maior valor. Um mapa 8 × 8 vira 4 × 4. A camada não tem pesos: guarda se o traço apareceu na região e descarta onde, o que dá alguma tolerância a deslocamentos pequenos.

```python
bloco = np.array([[1.0, 5.0],
                  [3.0, 2.0]])
saida = bloco.max()            # 5.0
```

No backward, só o 5 importa: mexer um pouco no 1, no 3 ou no 2 não altera o máximo. A derivada da saída é 1 em relação ao máximo e 0 em relação aos outros. O gradiente que chega ao bloco vai **inteiro** para a posição do máximo: o pooling **roteia** o gradiente, sem dividir nem copiar, e por isso o forward guarda a **posição** do máximo. Com empate, esta lição manda o gradiente para o primeiro máximo na ordem de leitura do bloco (linha por linha), o que `argmax` devolve.

Empilhar camadas aumenta o **campo receptivo**: o lado da região da imagem de entrada que influencia uma posição da saída. Para uma pilha de camadas com janela $k_\ell$ e stride $s_\ell$:

$$r_\ell = r_{\ell-1} + (k_\ell - 1)\, j_{\ell-1} \qquad j_\ell = j_{\ell-1}\, s_\ell \qquad r_0 = j_0 = 1$$

O **salto** $j$ é a distância, em pixels da entrada, entre duas posições vizinhas da camada. Com conv 3 × 3, pool 2 × 2 e outra conv 3 × 3: $r$ vale 3, depois $3 + 1 \cdot 1 = 4$, depois $4 + 2 \cdot 2 = 8$.

Por fim, os parâmetros. Uma camada convolucional com $c_\text{in}$ canais de entrada e $c_\text{out}$ filtros $k \times k$ tem

$$k \cdot k \cdot c_\text{in} \cdot c_\text{out} + c_\text{out}$$

parâmetros: os pesos dos filtros mais um viés por filtro. O tamanho da imagem não entra na conta. Uma conv 3 × 3 de 1 para 8 canais tem $9 \cdot 8 + 8 = 80$ parâmetros; de 8 para 16 canais, $9 \cdot 8 \cdot 16 + 16 = 1\,168$. O pooling tem zero, e a densa continua com $\text{entrada} \cdot \text{saída} + \text{saída}$.

## Passo 7 · Exercício · Pooling e contas

Escreva o max pooling 2 × 2 com o backward e as duas funções de contagem de uma pilha de camadas. Cada camada é um dicionário:

```python
{"tipo": "conv", "k": 3, "s": 1, "entrada": 1, "saida": 8}
{"tipo": "pool", "k": 2, "s": 2}
{"tipo": "densa", "entrada": 128, "saida": 10}
```

### Instruções
1. `maxpool_forward(X)` recebe `X` de forma `(N, C, H, W)`, com `H` e `W` pares, e devolve `(saida, cache)`: `saida` tem forma `(N, C, H/2, W/2)` com o máximo de cada bloco 2 × 2, e `cache` guarda o que o seu backward precisar.
2. `maxpool_backward(dout, cache)` devolve `dX` com a forma de `X`: o gradiente de cada bloco vai inteiro para a posição do máximo, e as outras ficam com zero. Com empate, vai só para o primeiro máximo na ordem de leitura do bloco (linha por linha).
3. `campo_receptivo(camadas)` recebe uma lista de camadas `conv` e `pool` e devolve o campo receptivo da pilha (1 para a lista vazia).
4. `contar_parametros(camadas)` devolve o total de parâmetros: $k \cdot k \cdot c_\text{in} \cdot c_\text{out} + c_\text{out}$ por `conv`, $\text{entrada} \cdot \text{saída} + \text{saída}$ por `densa` e zero por `pool`.

### Código inicial
```python
import numpy as np


def maxpool_forward(X):
    # Escreva aqui
    pass


def maxpool_backward(dout, cache):
    # Escreva aqui
    pass


def campo_receptivo(camadas):
    # Escreva aqui
    pass


def contar_parametros(camadas):
    # Escreva aqui
    pass
```

### Solução
```python
import numpy as np


def maxpool_forward(X):
    N, C, H, W = X.shape
    blocos = X.reshape(N, C, H // 2, 2, W // 2, 2).transpose(0, 1, 2, 4, 3, 5)
    blocos = blocos.reshape(N, C, H // 2, W // 2, 4)
    posicao = blocos.argmax(axis=4)
    saida = blocos.max(axis=4)
    return saida, (posicao, X.shape)


def maxpool_backward(dout, cache):
    posicao, forma = cache
    N, C, H, W = forma
    dblocos = np.zeros((N, C, H // 2, W // 2, 4))
    np.put_along_axis(dblocos, posicao[..., None], dout[..., None], axis=4)
    dblocos = dblocos.reshape(N, C, H // 2, W // 2, 2, 2).transpose(0, 1, 2, 4, 3, 5)
    return dblocos.reshape(N, C, H, W)


def campo_receptivo(camadas):
    r, salto = 1, 1
    for camada in camadas:
        r += (camada["k"] - 1) * salto
        salto *= camada["s"]
    return r


def contar_parametros(camadas):
    total = 0
    for camada in camadas:
        if camada["tipo"] == "conv":
            total += camada["k"] * camada["k"] * camada["entrada"] * camada["saida"] + camada["saida"]
        elif camada["tipo"] == "densa":
            total += camada["entrada"] * camada["saida"] + camada["saida"]
    return total
```

### Dicas
1. `X.reshape(N, C, H // 2, 2, W // 2, 2)` separa cada eixo em (bloco, posição no bloco); um `transpose` junta as duas posições no fim, e outro `reshape` deixa os 4 valores do bloco num eixo só.
2. `argmax` no eixo do bloco dá a posição do primeiro máximo; `np.put_along_axis` escreve um valor nessa posição de um array de zeros.
3. No campo receptivo, some $(k - 1)$ vezes o salto **antes** de multiplicar o salto pelo stride da camada.

### Verificação
```json
[
  {"id": "pool-literal", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_r = np.random.default_rng(8)\ndef _ref(X):\n    N, C, H, W = X.shape\n    S = np.zeros((N, C, H // 2, W // 2))\n    for n in range(N):\n        for c_ in range(C):\n            for i in range(H // 2):\n                for j in range(W // 2):\n                    S[n, c_, i, j] = X[n, c_, 2 * i:2 * i + 2, 2 * j:2 * j + 2].max()\n    return S\ndef _num(f, A, h=1e-5):\n    G = np.zeros_like(A)\n    for i in np.ndindex(A.shape):\n        v = A[i]\n        A[i] = v + h\n        mais = f()\n        A[i] = v - h\n        menos = f()\n        A[i] = v\n        G[i] = (mais - menos) / (2 * h)\n    return G\nA = np.array([[1.0, 2.0, 5.0, 6.0], [3.0, 4.0, 7.0, 8.0], [9.0, 1.0, 0.0, 2.0], [1.0, 1.0, 3.0, -1.0]]).reshape(1, 1, 4, 4)\n", "expr": "maxpool_forward(A)[0][0, 0].tolist()", "expected": [[4.0, 8.0], [9.0, 3.0]], "tolerance": 1e-12, "name": "Imagem 4 × 4: o máximo de cada bloco 2 × 2", "hint": "Os blocos não se sobrepõem: linhas 0 e 1 com colunas 0 e 1, depois colunas 2 e 3."},
  {"id": "pool-referencia", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_r = np.random.default_rng(8)\ndef _ref(X):\n    N, C, H, W = X.shape\n    S = np.zeros((N, C, H // 2, W // 2))\n    for n in range(N):\n        for c_ in range(C):\n            for i in range(H // 2):\n                for j in range(W // 2):\n                    S[n, c_, i, j] = X[n, c_, 2 * i:2 * i + 2, 2 * j:2 * j + 2].max()\n    return S\ndef _num(f, A, h=1e-5):\n    G = np.zeros_like(A)\n    for i in np.ndindex(A.shape):\n        v = A[i]\n        A[i] = v + h\n        mais = f()\n        A[i] = v - h\n        menos = f()\n        A[i] = v\n        G[i] = (mais - menos) / (2 * h)\n    return G\nA = np.array([[1.0, 2.0, 5.0, 6.0], [3.0, 4.0, 7.0, 8.0], [9.0, 1.0, 0.0, 2.0], [1.0, 1.0, 3.0, -1.0]]).reshape(1, 1, 4, 4)\nX = _r.normal(size=(2, 3, 4, 6))", "expr": "bool(np.allclose(maxpool_forward(X)[0], _ref(X), atol=1e-12))", "expected": true, "name": "Lote sorteado (2, 3, 4, 6): igual à referência com laços"},
  {"id": "back-literal", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_r = np.random.default_rng(8)\ndef _ref(X):\n    N, C, H, W = X.shape\n    S = np.zeros((N, C, H // 2, W // 2))\n    for n in range(N):\n        for c_ in range(C):\n            for i in range(H // 2):\n                for j in range(W // 2):\n                    S[n, c_, i, j] = X[n, c_, 2 * i:2 * i + 2, 2 * j:2 * j + 2].max()\n    return S\ndef _num(f, A, h=1e-5):\n    G = np.zeros_like(A)\n    for i in np.ndindex(A.shape):\n        v = A[i]\n        A[i] = v + h\n        mais = f()\n        A[i] = v - h\n        menos = f()\n        A[i] = v\n        G[i] = (mais - menos) / (2 * h)\n    return G\nA = np.array([[1.0, 2.0, 5.0, 6.0], [3.0, 4.0, 7.0, 8.0], [9.0, 1.0, 0.0, 2.0], [1.0, 1.0, 3.0, -1.0]]).reshape(1, 1, 4, 4)\ndX = maxpool_backward(np.array([[10.0, 20.0], [30.0, 40.0]]).reshape(1, 1, 2, 2), maxpool_forward(A)[1])", "expr": "dX[0, 0].tolist()", "expected": [[0.0, 0.0, 0.0, 0.0], [0.0, 10.0, 0.0, 20.0], [30.0, 0.0, 0.0, 0.0], [0.0, 0.0, 40.0, 0.0]], "tolerance": 1e-12, "name": "Cada gradiente vai inteiro para a posição do máximo do seu bloco", "hint": "Guarde no cache a posição do máximo de cada bloco."},
  {"id": "back-forma", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_r = np.random.default_rng(8)\ndef _ref(X):\n    N, C, H, W = X.shape\n    S = np.zeros((N, C, H // 2, W // 2))\n    for n in range(N):\n        for c_ in range(C):\n            for i in range(H // 2):\n                for j in range(W // 2):\n                    S[n, c_, i, j] = X[n, c_, 2 * i:2 * i + 2, 2 * j:2 * j + 2].max()\n    return S\ndef _num(f, A, h=1e-5):\n    G = np.zeros_like(A)\n    for i in np.ndindex(A.shape):\n        v = A[i]\n        A[i] = v + h\n        mais = f()\n        A[i] = v - h\n        menos = f()\n        A[i] = v\n        G[i] = (mais - menos) / (2 * h)\n    return G\nA = np.array([[1.0, 2.0, 5.0, 6.0], [3.0, 4.0, 7.0, 8.0], [9.0, 1.0, 0.0, 2.0], [1.0, 1.0, 3.0, -1.0]]).reshape(1, 1, 4, 4)\nX = _r.normal(size=(2, 3, 4, 6))\ndX = maxpool_backward(np.ones((2, 3, 2, 3)), maxpool_forward(X)[1])", "expr": "[list(dX.shape), float(dX.sum()), int((dX != 0).sum())]", "expected": [[2, 3, 4, 6], 36.0, 36], "tolerance": 1e-12, "name": "dX tem a forma de X, soma o mesmo que dout e tem uma posição não nula por bloco", "hint": "O gradiente não é dividido nem copiado."},
  {"id": "back-empate", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_r = np.random.default_rng(8)\ndef _ref(X):\n    N, C, H, W = X.shape\n    S = np.zeros((N, C, H // 2, W // 2))\n    for n in range(N):\n        for c_ in range(C):\n            for i in range(H // 2):\n                for j in range(W // 2):\n                    S[n, c_, i, j] = X[n, c_, 2 * i:2 * i + 2, 2 * j:2 * j + 2].max()\n    return S\ndef _num(f, A, h=1e-5):\n    G = np.zeros_like(A)\n    for i in np.ndindex(A.shape):\n        v = A[i]\n        A[i] = v + h\n        mais = f()\n        A[i] = v - h\n        menos = f()\n        A[i] = v\n        G[i] = (mais - menos) / (2 * h)\n    return G\nA = np.array([[1.0, 2.0, 5.0, 6.0], [3.0, 4.0, 7.0, 8.0], [9.0, 1.0, 0.0, 2.0], [1.0, 1.0, 3.0, -1.0]]).reshape(1, 1, 4, 4)\ndX = maxpool_backward(np.full((1, 1, 1, 1), 5.0), maxpool_forward(np.ones((1, 1, 2, 2)))[1])", "expr": "dX[0, 0].tolist()", "expected": [[5.0, 0.0], [0.0, 0.0]], "tolerance": 1e-12, "name": "Bloco com quatro valores iguais: o gradiente vai só para o primeiro", "hint": "argmax devolve o primeiro máximo."},
  {"id": "back-numerico", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_r = np.random.default_rng(8)\ndef _ref(X):\n    N, C, H, W = X.shape\n    S = np.zeros((N, C, H // 2, W // 2))\n    for n in range(N):\n        for c_ in range(C):\n            for i in range(H // 2):\n                for j in range(W // 2):\n                    S[n, c_, i, j] = X[n, c_, 2 * i:2 * i + 2, 2 * j:2 * j + 2].max()\n    return S\ndef _num(f, A, h=1e-5):\n    G = np.zeros_like(A)\n    for i in np.ndindex(A.shape):\n        v = A[i]\n        A[i] = v + h\n        mais = f()\n        A[i] = v - h\n        menos = f()\n        A[i] = v\n        G[i] = (mais - menos) / (2 * h)\n    return G\nA = np.array([[1.0, 2.0, 5.0, 6.0], [3.0, 4.0, 7.0, 8.0], [9.0, 1.0, 0.0, 2.0], [1.0, 1.0, 3.0, -1.0]]).reshape(1, 1, 4, 4)\nX = _r.normal(size=(2, 2, 4, 6))\nG = _r.normal(size=(2, 2, 2, 3))\ndX = maxpool_backward(G, maxpool_forward(X)[1])\n_n = _num(lambda: float((_ref(X) * G).sum()), X)", "expr": "bool(dX.shape == _n.shape and np.linalg.norm(dX - _n) / (np.linalg.norm(dX) + np.linalg.norm(_n)) < 1e-7)", "expected": true, "name": "dX confere com o gradiente numérico num lote sorteado"},
  {"id": "campo-vazio", "checkpoint": 3, "kind": "call", "function": "campo_receptivo", "args": [[]], "expected": 1, "name": "Sem camadas, o campo receptivo é 1"},
  {"id": "campo-duas-convs", "checkpoint": 3, "kind": "call", "function": "campo_receptivo", "args": [[{"tipo": "conv", "k": 3, "s": 1, "entrada": 1, "saida": 8}, {"tipo": "conv", "k": 3, "s": 1, "entrada": 8, "saida": 16}]], "expected": 5, "name": "Duas convoluções 3 × 3: campo receptivo 5"},
  {"id": "campo-conv-pool-conv", "checkpoint": 3, "kind": "call", "function": "campo_receptivo", "args": [[{"tipo": "conv", "k": 3, "s": 1, "entrada": 1, "saida": 8}, {"tipo": "pool", "k": 2, "s": 2}, {"tipo": "conv", "k": 3, "s": 1, "entrada": 8, "saida": 16}]], "expected": 8, "name": "conv 3 × 3, pool 2 × 2, conv 3 × 3: 3, depois 4, depois 8", "hint": "Depois do pool, cada passo vale 2 pixels da entrada."},
  {"id": "campo-stride-na-conv", "checkpoint": 3, "kind": "call", "function": "campo_receptivo", "args": [[{"tipo": "conv", "k": 3, "s": 2, "entrada": 1, "saida": 4}, {"tipo": "conv", "k": 5, "s": 1, "entrada": 3, "saida": 6}]], "expected": 11, "name": "conv 3 × 3 com stride 2 e conv 5 × 5: 3 + 4 · 2 = 11", "hint": "O stride de uma camada só muda o salto das camadas seguintes."},
  {"id": "param-conv", "checkpoint": 4, "kind": "call", "function": "contar_parametros", "args": [[{"tipo": "conv", "k": 3, "s": 1, "entrada": 1, "saida": 8}]], "expected": 80, "name": "conv 3 × 3 de 1 para 8 canais: 72 pesos e 8 vieses", "hint": "Um viés por filtro."},
  {"id": "param-conv-canais", "checkpoint": 4, "kind": "call", "function": "contar_parametros", "args": [[{"tipo": "conv", "k": 3, "s": 1, "entrada": 8, "saida": 16}]], "expected": 1168, "name": "conv 3 × 3 de 8 para 16 canais: 1 168"},
  {"id": "param-pilha", "checkpoint": 4, "kind": "call", "function": "contar_parametros", "args": [[{"tipo": "conv", "k": 3, "s": 1, "entrada": 1, "saida": 8}, {"tipo": "pool", "k": 2, "s": 2}, {"tipo": "densa", "entrada": 128, "saida": 10}]], "expected": 1370, "name": "conv, pool e densa 128 → 10: 80 + 0 + 1 290 = 1 370", "hint": "O pooling não tem parâmetros; a densa tem entrada · saída + saída."}
]
```

### Soluções erradas
```python name="pooling divide o gradiente entre os quatro"
import numpy as np


def maxpool_forward(X):
    N, C, H, W = X.shape
    blocos = X.reshape(N, C, H // 2, 2, W // 2, 2).transpose(0, 1, 2, 4, 3, 5)
    blocos = blocos.reshape(N, C, H // 2, W // 2, 4)
    posicao = blocos.argmax(axis=4)
    saida = blocos.max(axis=4)
    return saida, (posicao, X.shape)


def maxpool_backward(dout, cache):
    posicao, forma = cache
    N, C, H, W = forma
    dblocos = np.zeros((N, C, H // 2, W // 2, 4))
    dblocos += dout[..., None] / 4
    dblocos = dblocos.reshape(N, C, H // 2, W // 2, 2, 2).transpose(0, 1, 2, 4, 3, 5)
    return dblocos.reshape(N, C, H, W)


def campo_receptivo(camadas):
    r, salto = 1, 1
    for camada in camadas:
        r += (camada["k"] - 1) * salto
        salto *= camada["s"]
    return r


def contar_parametros(camadas):
    total = 0
    for camada in camadas:
        if camada["tipo"] == "conv":
            total += camada["k"] * camada["k"] * camada["entrada"] * camada["saida"] + camada["saida"]
        elif camada["tipo"] == "densa":
            total += camada["entrada"] * camada["saida"] + camada["saida"]
    return total
```
```python name="pooling copia o gradiente para os quatro"
import numpy as np


def maxpool_forward(X):
    N, C, H, W = X.shape
    blocos = X.reshape(N, C, H // 2, 2, W // 2, 2).transpose(0, 1, 2, 4, 3, 5)
    blocos = blocos.reshape(N, C, H // 2, W // 2, 4)
    posicao = blocos.argmax(axis=4)
    saida = blocos.max(axis=4)
    return saida, (posicao, X.shape)


def maxpool_backward(dout, cache):
    posicao, forma = cache
    N, C, H, W = forma
    dblocos = np.zeros((N, C, H // 2, W // 2, 4))
    dblocos += dout[..., None]
    dblocos = dblocos.reshape(N, C, H // 2, W // 2, 2, 2).transpose(0, 1, 2, 4, 3, 5)
    return dblocos.reshape(N, C, H, W)


def campo_receptivo(camadas):
    r, salto = 1, 1
    for camada in camadas:
        r += (camada["k"] - 1) * salto
        salto *= camada["s"]
    return r


def contar_parametros(camadas):
    total = 0
    for camada in camadas:
        if camada["tipo"] == "conv":
            total += camada["k"] * camada["k"] * camada["entrada"] * camada["saida"] + camada["saida"]
        elif camada["tipo"] == "densa":
            total += camada["entrada"] * camada["saida"] + camada["saida"]
    return total
```
```python name="empate manda o gradiente para todos os empatados"
import numpy as np


def maxpool_forward(X):
    N, C, H, W = X.shape
    blocos = X.reshape(N, C, H // 2, 2, W // 2, 2).transpose(0, 1, 2, 4, 3, 5)
    blocos = blocos.reshape(N, C, H // 2, W // 2, 4)
    saida = blocos.max(axis=4)
    return saida, (blocos == saida[..., None], X.shape)


def maxpool_backward(dout, cache):
    posicao, forma = cache
    N, C, H, W = forma
    dblocos = np.zeros((N, C, H // 2, W // 2, 4))
    dblocos += posicao * dout[..., None]
    dblocos = dblocos.reshape(N, C, H // 2, W // 2, 2, 2).transpose(0, 1, 2, 4, 3, 5)
    return dblocos.reshape(N, C, H, W)


def campo_receptivo(camadas):
    r, salto = 1, 1
    for camada in camadas:
        r += (camada["k"] - 1) * salto
        salto *= camada["s"]
    return r


def contar_parametros(camadas):
    total = 0
    for camada in camadas:
        if camada["tipo"] == "conv":
            total += camada["k"] * camada["k"] * camada["entrada"] * camada["saida"] + camada["saida"]
        elif camada["tipo"] == "densa":
            total += camada["entrada"] * camada["saida"] + camada["saida"]
    return total
```
```python name="backward sem desfazer a troca de eixos"
import numpy as np


def maxpool_forward(X):
    N, C, H, W = X.shape
    blocos = X.reshape(N, C, H // 2, 2, W // 2, 2).transpose(0, 1, 2, 4, 3, 5)
    blocos = blocos.reshape(N, C, H // 2, W // 2, 4)
    posicao = blocos.argmax(axis=4)
    saida = blocos.max(axis=4)
    return saida, (posicao, X.shape)


def maxpool_backward(dout, cache):
    posicao, forma = cache
    N, C, H, W = forma
    dblocos = np.zeros((N, C, H // 2, W // 2, 4))
    np.put_along_axis(dblocos, posicao[..., None], dout[..., None], axis=4)
    return dblocos.reshape(N, C, H, W)


def campo_receptivo(camadas):
    r, salto = 1, 1
    for camada in camadas:
        r += (camada["k"] - 1) * salto
        salto *= camada["s"]
    return r


def contar_parametros(camadas):
    total = 0
    for camada in camadas:
        if camada["tipo"] == "conv":
            total += camada["k"] * camada["k"] * camada["entrada"] * camada["saida"] + camada["saida"]
        elif camada["tipo"] == "densa":
            total += camada["entrada"] * camada["saida"] + camada["saida"]
    return total
```
```python name="forward monta os blocos sem trocar os eixos"
import numpy as np


def maxpool_forward(X):
    N, C, H, W = X.shape
    blocos = X.reshape(N, C, H // 2, W // 2, 2, 2)
    blocos = blocos.reshape(N, C, H // 2, W // 2, 4)
    posicao = blocos.argmax(axis=4)
    saida = blocos.max(axis=4)
    return saida, (posicao, X.shape)


def maxpool_backward(dout, cache):
    posicao, forma = cache
    N, C, H, W = forma
    dblocos = np.zeros((N, C, H // 2, W // 2, 4))
    np.put_along_axis(dblocos, posicao[..., None], dout[..., None], axis=4)
    dblocos = dblocos.reshape(N, C, H // 2, W // 2, 2, 2).transpose(0, 1, 2, 4, 3, 5)
    return dblocos.reshape(N, C, H, W)


def campo_receptivo(camadas):
    r, salto = 1, 1
    for camada in camadas:
        r += (camada["k"] - 1) * salto
        salto *= camada["s"]
    return r


def contar_parametros(camadas):
    total = 0
    for camada in camadas:
        if camada["tipo"] == "conv":
            total += camada["k"] * camada["k"] * camada["entrada"] * camada["saida"] + camada["saida"]
        elif camada["tipo"] == "densa":
            total += camada["entrada"] * camada["saida"] + camada["saida"]
    return total
```
```python name="forward com a média do bloco"
import numpy as np


def maxpool_forward(X):
    N, C, H, W = X.shape
    blocos = X.reshape(N, C, H // 2, 2, W // 2, 2).transpose(0, 1, 2, 4, 3, 5)
    blocos = blocos.reshape(N, C, H // 2, W // 2, 4)
    posicao = blocos.argmax(axis=4)
    saida = blocos.mean(axis=4)
    return saida, (posicao, X.shape)


def maxpool_backward(dout, cache):
    posicao, forma = cache
    N, C, H, W = forma
    dblocos = np.zeros((N, C, H // 2, W // 2, 4))
    np.put_along_axis(dblocos, posicao[..., None], dout[..., None], axis=4)
    dblocos = dblocos.reshape(N, C, H // 2, W // 2, 2, 2).transpose(0, 1, 2, 4, 3, 5)
    return dblocos.reshape(N, C, H, W)


def campo_receptivo(camadas):
    r, salto = 1, 1
    for camada in camadas:
        r += (camada["k"] - 1) * salto
        salto *= camada["s"]
    return r


def contar_parametros(camadas):
    total = 0
    for camada in camadas:
        if camada["tipo"] == "conv":
            total += camada["k"] * camada["k"] * camada["entrada"] * camada["saida"] + camada["saida"]
        elif camada["tipo"] == "densa":
            total += camada["entrada"] * camada["saida"] + camada["saida"]
    return total
```
```python name="campo receptivo sem o stride"
import numpy as np


def maxpool_forward(X):
    N, C, H, W = X.shape
    blocos = X.reshape(N, C, H // 2, 2, W // 2, 2).transpose(0, 1, 2, 4, 3, 5)
    blocos = blocos.reshape(N, C, H // 2, W // 2, 4)
    posicao = blocos.argmax(axis=4)
    saida = blocos.max(axis=4)
    return saida, (posicao, X.shape)


def maxpool_backward(dout, cache):
    posicao, forma = cache
    N, C, H, W = forma
    dblocos = np.zeros((N, C, H // 2, W // 2, 4))
    np.put_along_axis(dblocos, posicao[..., None], dout[..., None], axis=4)
    dblocos = dblocos.reshape(N, C, H // 2, W // 2, 2, 2).transpose(0, 1, 2, 4, 3, 5)
    return dblocos.reshape(N, C, H, W)


def campo_receptivo(camadas):
    r, salto = 1, 1
    for camada in camadas:
        r += camada["k"] - 1
        salto *= camada["s"]
    return r


def contar_parametros(camadas):
    total = 0
    for camada in camadas:
        if camada["tipo"] == "conv":
            total += camada["k"] * camada["k"] * camada["entrada"] * camada["saida"] + camada["saida"]
        elif camada["tipo"] == "densa":
            total += camada["entrada"] * camada["saida"] + camada["saida"]
    return total
```
```python name="salto atualizado antes de somar"
import numpy as np


def maxpool_forward(X):
    N, C, H, W = X.shape
    blocos = X.reshape(N, C, H // 2, 2, W // 2, 2).transpose(0, 1, 2, 4, 3, 5)
    blocos = blocos.reshape(N, C, H // 2, W // 2, 4)
    posicao = blocos.argmax(axis=4)
    saida = blocos.max(axis=4)
    return saida, (posicao, X.shape)


def maxpool_backward(dout, cache):
    posicao, forma = cache
    N, C, H, W = forma
    dblocos = np.zeros((N, C, H // 2, W // 2, 4))
    np.put_along_axis(dblocos, posicao[..., None], dout[..., None], axis=4)
    dblocos = dblocos.reshape(N, C, H // 2, W // 2, 2, 2).transpose(0, 1, 2, 4, 3, 5)
    return dblocos.reshape(N, C, H, W)


def campo_receptivo(camadas):
    r, salto = 1, 1
    for camada in camadas:
        salto *= camada["s"]
        r += (camada["k"] - 1) * salto
    return r


def contar_parametros(camadas):
    total = 0
    for camada in camadas:
        if camada["tipo"] == "conv":
            total += camada["k"] * camada["k"] * camada["entrada"] * camada["saida"] + camada["saida"]
        elif camada["tipo"] == "densa":
            total += camada["entrada"] * camada["saida"] + camada["saida"]
    return total
```
```python name="parâmetros da conv sem o viés"
import numpy as np


def maxpool_forward(X):
    N, C, H, W = X.shape
    blocos = X.reshape(N, C, H // 2, 2, W // 2, 2).transpose(0, 1, 2, 4, 3, 5)
    blocos = blocos.reshape(N, C, H // 2, W // 2, 4)
    posicao = blocos.argmax(axis=4)
    saida = blocos.max(axis=4)
    return saida, (posicao, X.shape)


def maxpool_backward(dout, cache):
    posicao, forma = cache
    N, C, H, W = forma
    dblocos = np.zeros((N, C, H // 2, W // 2, 4))
    np.put_along_axis(dblocos, posicao[..., None], dout[..., None], axis=4)
    dblocos = dblocos.reshape(N, C, H // 2, W // 2, 2, 2).transpose(0, 1, 2, 4, 3, 5)
    return dblocos.reshape(N, C, H, W)


def campo_receptivo(camadas):
    r, salto = 1, 1
    for camada in camadas:
        r += (camada["k"] - 1) * salto
        salto *= camada["s"]
    return r


def contar_parametros(camadas):
    total = 0
    for camada in camadas:
        if camada["tipo"] == "conv":
            total += camada["k"] * camada["k"] * camada["entrada"] * camada["saida"]
        elif camada["tipo"] == "densa":
            total += camada["entrada"] * camada["saida"] + camada["saida"]
    return total
```
```python name="conv com k uma vez só"
import numpy as np


def maxpool_forward(X):
    N, C, H, W = X.shape
    blocos = X.reshape(N, C, H // 2, 2, W // 2, 2).transpose(0, 1, 2, 4, 3, 5)
    blocos = blocos.reshape(N, C, H // 2, W // 2, 4)
    posicao = blocos.argmax(axis=4)
    saida = blocos.max(axis=4)
    return saida, (posicao, X.shape)


def maxpool_backward(dout, cache):
    posicao, forma = cache
    N, C, H, W = forma
    dblocos = np.zeros((N, C, H // 2, W // 2, 4))
    np.put_along_axis(dblocos, posicao[..., None], dout[..., None], axis=4)
    dblocos = dblocos.reshape(N, C, H // 2, W // 2, 2, 2).transpose(0, 1, 2, 4, 3, 5)
    return dblocos.reshape(N, C, H, W)


def campo_receptivo(camadas):
    r, salto = 1, 1
    for camada in camadas:
        r += (camada["k"] - 1) * salto
        salto *= camada["s"]
    return r


def contar_parametros(camadas):
    total = 0
    for camada in camadas:
        if camada["tipo"] == "conv":
            total += camada["k"] * camada["entrada"] * camada["saida"] + camada["saida"]
        elif camada["tipo"] == "densa":
            total += camada["entrada"] * camada["saida"] + camada["saida"]
    return total
```
```python name="camada densa ignorada"
import numpy as np


def maxpool_forward(X):
    N, C, H, W = X.shape
    blocos = X.reshape(N, C, H // 2, 2, W // 2, 2).transpose(0, 1, 2, 4, 3, 5)
    blocos = blocos.reshape(N, C, H // 2, W // 2, 4)
    posicao = blocos.argmax(axis=4)
    saida = blocos.max(axis=4)
    return saida, (posicao, X.shape)


def maxpool_backward(dout, cache):
    posicao, forma = cache
    N, C, H, W = forma
    dblocos = np.zeros((N, C, H // 2, W // 2, 4))
    np.put_along_axis(dblocos, posicao[..., None], dout[..., None], axis=4)
    dblocos = dblocos.reshape(N, C, H // 2, W // 2, 2, 2).transpose(0, 1, 2, 4, 3, 5)
    return dblocos.reshape(N, C, H, W)


def campo_receptivo(camadas):
    r, salto = 1, 1
    for camada in camadas:
        r += (camada["k"] - 1) * salto
        salto *= camada["s"]
    return r


def contar_parametros(camadas):
    total = 0
    for camada in camadas:
        if camada["tipo"] == "conv":
            total += camada["k"] * camada["k"] * camada["entrada"] * camada["saida"] + camada["saida"]
        elif camada["tipo"] == "densa":
            total += 0
    return total
```

## Passo 8 · Quiz · Roteamento do gradiente

### Pergunta
No forward de um max pooling 2 × 2, um bloco da entrada vale `[[1.0, 5.0], [3.0, 2.0]]`. No backward, chega o gradiente 0,8 para a saída desse bloco. Qual é o gradiente das quatro entradas do bloco?
- [ ] `[[0.2, 0.2], [0.2, 0.2]]`
- [ ] `[[0.8, 0.8], [0.8, 0.8]]`
- [x] `[[0.0, 0.8], [0.0, 0.0]]`
- [ ] `[[0.07, 0.36], [0.22, 0.15]]`
> A saída é o máximo, 5, e só ele a altera: derivada 1 para o 5 e 0 para os outros, então o gradiente vai inteiro para a posição `(0, 1)`. Dividir por quatro é o backward do pooling de **média**. Copiar 0,8 para os quatro criaria gradiente do nada (a soma viraria 3,2). Repartir em proporção aos valores não corresponde a derivada nenhuma do máximo.

### Pergunta
Uma camada convolucional com filtro 3 × 3 e sem padding recebe imagens 4 × 4. A checagem numérica aprova `dF` e `db`, mas reprova `dX`: nos quatro cantos o gradiente analítico bate com o numérico; nas bordas e nos quatro pixels do centro, não. Qual é o defeito mais provável?
- [ ] O `conv_forward` inverte os filtros, e o backward não
- [x] O `col2im` grava as parcelas com `=` (ou com `+=` em índices repetidos), e cada pixel fica com uma parcela só
- [ ] O `col2im` esqueceu de cortar a moldura do padding
- [ ] `db` foi somado no eixo errado
> Os cantos aparecem em 1 janela e os pixels do centro em 4 (a contagem do passo 2): quem perde parcelas onde há sobreposição e acerta onde não há está sobrescrevendo no lugar de somar. Um filtro invertido só no forward erraria `dF` também, e erraria os cantos. Sem padding não há moldura para cortar. E `db` não entra no cálculo de `dX`, além de ter sido aprovado.

### Pergunta
Uma camada convolucional 3 × 3 leva 8 canais a 16 e tem 1 168 parâmetros quando a rede recebe imagens 8 × 8. A mesma camada, numa rede que recebe imagens 32 × 32, tem quantos parâmetros?
- [ ] 18 688
- [ ] 1 152
- [ ] 160
- [x] 1 168
> A conta é $k \cdot k \cdot c_\text{in} \cdot c_\text{out} + c_\text{out} = 9 \cdot 8 \cdot 16 + 16 = 1\,168$, e o tamanho da imagem não aparece nela: os mesmos filtros deslizam por qualquer imagem. 18 688 multiplica por 16, como se cada posição tivesse pesos próprios (isso é uma densa, não uma convolução). 1 152 esquece os 16 vieses. 160 esquece os canais de entrada: cada filtro tem uma fatia 3 × 3 por canal.
