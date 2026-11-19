---
slug: n5-m6-04-pca
titulo: PCA do zero
descricao: Centralização, covariância, autovetores e SVD, variância explicada, projeção e reconstrução, e PCA para visualização e compressão.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- scikit-learn
xp: 130
tempo_min: 55
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Implementar PCA por decomposição da covariância e por SVD e conferir com scikit-learn
- Escolher o número de componentes pela variância explicada e reconstruir os dados
- Usar PCA para visualizar dados de alta dimensão e como pré-processamento
---

## Passo 1 · Leitura · Direções de maior variância

Uma oficina fictícia mede quatro grandezas de cada peça que produz. Três delas sobem e descem juntas, porque dependem do tamanho da peça; a quarta é quase só ruído. Quatro colunas descrevem as peças, mas a informação cabe em menos: a maior parte da variação acontece ao longo de uma direção só, a do "tamanho". A **análise de componentes principais** (PCA) acha essas direções e reescreve os dados nelas, da mais importante para a menos importante.

O primeiro passo é **centralizar**: subtrair de cada coluna a sua média, para que a nuvem fique em volta da origem. Com os dados centralizados $X_c$ ($n$ linhas, $d$ colunas), a **matriz de covariância** é

$$
\Sigma = \frac{1}{n - 1}\, X_c^\top X_c
$$

uma matriz $d \times d$ com as variâncias na diagonal e as covariâncias fora dela. A variância dos dados projetados numa direção unitária $v$ é $v^\top \Sigma v$, e a direção que maximiza esse valor é o **autovetor** de $\Sigma$ de maior **autovalor**: $\Sigma v = \lambda v$, e a variância ao longo de $v$ é o próprio $\lambda$. Os autovetores seguintes, perpendiculares aos anteriores, dão as próximas direções. A fração da variância total que o componente $j$ carrega é a **variância explicada**:

$$
\text{razão}_j = \frac{\lambda_j}{\sum_{i=1}^{d} \lambda_i}
$$

Sem centralizar, $X^\top X$ mede a distância da nuvem até a origem, e não o espalhamento dela: o "primeiro componente" vira a direção do centro da nuvem.

No numpy, `np.linalg.eigh` calcula autovalores e autovetores de uma matriz simétrica. Ele devolve os autovalores em ordem **crescente** e os autovetores nas **colunas**; o scikit-learn guarda os componentes nas **linhas** de `components_`, do maior para o menor.

```python
from sklearn.decomposition import PCA

pca = PCA(n_components=2).fit(X)
pca.components_                  # 2 linhas, uma direção por linha
pca.explained_variance_ratio_    # fração da variância de cada componente
Z = pca.transform(X)             # as coordenadas de cada peça nas 2 direções
```

## Passo 2 · Previsão · O sinal dos autovetores

O programa calcula o PCA de cinco pontos de dois jeitos: pelo `eigh` da covariância e pelo `PCA` do scikit-learn. Leia sem executar e digite o que ele imprime.

### Código
```python
import numpy as np
from sklearn.decomposition import PCA

A = np.array([[2.0, 1.0], [3.0, 5.0], [5.0, 4.0], [6.0, 8.0], [9.0, 7.0]])
Ac = A - A.mean(axis=0)
cov = Ac.T @ Ac / (len(A) - 1)
print(cov.tolist())
valores, vetores = np.linalg.eigh(cov)
print(np.round(valores, 4).tolist())
print(np.round(vetores.T[::-1], 4).tolist())
pca = PCA(2).fit(A)
print(np.round(pca.components_, 4).tolist())
print(np.round(pca.explained_variance_ratio_, 4).tolist())
```

### Dicas
1. A média é $(5, 5)$; as somas dos quadrados das colunas centralizadas valem 30 cada, e a soma dos produtos vale 23. Divida por $n - 1 = 4$.
2. Uma matriz 2 × 2 com $a$ nos dois lugares da diagonal e $b$ nos outros dois tem autovalores $a - b$ e $a + b$, com autovetores nas direções $(1, -1)$ e $(1, 1)$, normalizados ($1/\sqrt{2} \approx 0{,}7071$). O `eigh` devolve os autovalores em ordem crescente e, nesta conta, escolheu $(-0{,}7071;\ 0{,}7071)$ para o menor; `vetores.T[::-1]` põe os autovetores em linhas, do maior autovalor para o menor.
3. O scikit-learn deixa positiva, em cada componente, a coordenada de maior valor absoluto; num empate de valor absoluto, vale a primeira. A variância explicada é cada autovalor dividido pela soma dos dois.

### Saída esperada
```text
[[7.5, 5.75], [5.75, 7.5]]
[1.75, 13.25]
[[0.7071, 0.7071], [-0.7071, 0.7071]]
[[0.7071, 0.7071], [0.7071, -0.7071]]
[0.8833, 0.1167]
```

## Passo 3 · Exercício · PCA pela covariância
modo: lacunas

Complete as lacunas (`___`) do PCA calculado pelos autovetores da matriz de covariância. O arquivo `medidas.py` gera as medidas fictícias das peças.

### Instruções
1. Centralize `X`, subtraindo de cada coluna a média dela.
2. Calcule a covariância $\Sigma = X_c^\top X_c / (n - 1)$, uma matriz $d \times d$.
3. Ordene os autovalores do `eigh` do maior para o menor e fique com as posições dos `k` maiores.
4. Os componentes vão nas **linhas** do resultado (forma $k \times d$), como no `components_` do scikit-learn.
5. `pca_cov(X, k)` devolve a tupla `(componentes, variancia_explicada)`, com a variância explicada de cada componente dividida pela soma de **todos** os autovalores.

### Código inicial
```python
import numpy as np


def pca_cov(X, k):
    X = np.asarray(X, dtype=float)
    Xc = ___
    cov = ___ / (len(X) - 1)
    valores, vetores = np.linalg.eigh(cov)
    ordem = ___[:k]
    componentes = ___
    return componentes, ___
```
```text path=medidas.py
import numpy as np


def gerar_medidas(n, semente):
    rng = np.random.default_rng(semente)
    tamanho = rng.normal(0, 1, n)
    forma = rng.normal(0, 0.5, n)
    X = np.column_stack([
        10 + 2.0 * tamanho + 0.3 * forma,
        50 + 1.5 * tamanho - 0.8 * forma,
        5 + 0.5 * tamanho + 1.0 * forma,
        rng.normal(0, 0.2, n),
    ]) + rng.normal(0, 0.1, size=(n, 4))
    return X.round(4)
```

### Solução
```python
import numpy as np


def pca_cov(X, k):
    X = np.asarray(X, dtype=float)
    Xc = X - X.mean(axis=0)
    cov = Xc.T @ Xc / (len(X) - 1)
    valores, vetores = np.linalg.eigh(cov)
    ordem = np.argsort(valores)[::-1][:k]
    componentes = vetores[:, ordem].T
    return componentes, valores[ordem] / valores.sum()
```
```text path=medidas.py
import numpy as np


def gerar_medidas(n, semente):
    rng = np.random.default_rng(semente)
    tamanho = rng.normal(0, 1, n)
    forma = rng.normal(0, 0.5, n)
    X = np.column_stack([
        10 + 2.0 * tamanho + 0.3 * forma,
        50 + 1.5 * tamanho - 0.8 * forma,
        5 + 0.5 * tamanho + 1.0 * forma,
        rng.normal(0, 0.2, n),
    ]) + rng.normal(0, 0.1, size=(n, 4))
    return X.round(4)
```

### Dicas
1. `X.mean(axis=0)` tem uma média por coluna, e o broadcasting a subtrai de cada linha.
2. `np.argsort(valores)` dá as posições em ordem crescente; `[::-1]` inverte.
3. O `eigh` guarda cada autovetor numa coluna: selecione as colunas e transponha.

### Verificação
```json
[
  {"id": "reta", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nC, v = pca_cov([[0, 0], [1, 2], [2, 4], [3, 6]], 1)", "expr": "[np.abs(C).round(6).tolist(), v.round(6).tolist()]", "expected": [[[0.447214, 0.894427]], [1.0]], "tolerance": 1e-09, "name": "Pontos sobre a reta y = 2x: a direção é ±(1, 2)/√5 e explica toda a variância", "hint": "O primeiro componente é o autovetor de maior autovalor da covariância; a variância explicada divide os autovalores escolhidos pela soma de todos."},
  {"id": "componentes", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.decomposition import PCA\nfrom medidas import gerar_medidas\nX = gerar_medidas(120, 0)\nref = PCA(2).fit(X)\nC, v = pca_cov(X, 2)\n", "expr": "bool(np.allclose(np.abs(C), np.abs(ref.components_), atol=1e-6))", "expected": true, "name": "Os dois componentes são os do PCA(2) do scikit-learn, a menos do sinal", "hint": "Compara-se np.abs(componentes) com np.abs(PCA(k).components_): uma linha por componente, em ordem decrescente de autovalor, com os dados centralizados."},
  {"id": "variancia", "checkpoint": 5, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.decomposition import PCA\nfrom medidas import gerar_medidas\nX = gerar_medidas(120, 0)\nref = PCA(2).fit(X)\nC, v = pca_cov(X, 2)\n", "expr": "bool(np.allclose(v, ref.explained_variance_ratio_, atol=1e-9))", "expected": true, "name": "A variância explicada é a explained_variance_ratio_ do scikit-learn", "hint": "Divida os k maiores autovalores pela soma de TODOS os autovalores."},
  {"id": "formas", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.decomposition import PCA\nfrom medidas import gerar_medidas\nX = gerar_medidas(120, 0)\nref = PCA(2).fit(X)\nC, v = pca_cov(X, 2)\n", "expr": "[list(C.shape), list(v.shape)]", "expected": [[2, 4], [2]], "name": "Componentes em linhas (k × d) e uma razão por componente"},
  {"id": "decrescente", "checkpoint": 3, "kind": "expr", "setup": "from medidas import gerar_medidas\nX = gerar_medidas(80, 3)\nC, v = pca_cov(X, 4)", "expr": "[bool(v[0] >= v[1] >= v[2] >= v[3]), round(float(v.sum()), 9)]", "expected": [true, 1.0], "tolerance": 1e-09, "name": "Com todos os componentes, as razões vêm em ordem decrescente e somam 1", "hint": "O eigh devolve os autovalores em ordem crescente: inverta a ordem."},
  {"id": "centraliza", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nX = np.array([[100.0, 0.0], [102.0, 0.1], [98.0, -0.1], [100.0, 3.0], [100.0, -3.0]])\nC, v = pca_cov(X, 1)", "expr": "np.abs(C).round(4).tolist()", "expected": [[0.0398, 0.9992]], "tolerance": 1e-09, "name": "Com a média longe da origem, a direção de maior variância continua sendo a do espalhamento", "hint": "Sem tirar a média de cada coluna, a 'direção de maior variância' aponta para o centro da nuvem."},
  {"id": "ortonormais", "checkpoint": 4, "kind": "expr", "setup": "from medidas import gerar_medidas\nimport numpy as np\nX = gerar_medidas(60, 5)\nC, v = pca_cov(X, 3)", "expr": "bool(np.allclose(C @ C.T, np.eye(3), atol=1e-9))", "expected": true, "name": "Os componentes têm norma 1 e são perpendiculares entre si"},
  {"id": "entrada-intacta", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom medidas import gerar_medidas\nX = gerar_medidas(30, 1)\nantes = X.copy()\nC, v = pca_cov(X, 2)", "expr": "bool((X == antes).all())", "expected": true, "name": "O X recebido não muda"}
]
```

### Soluções erradas
```python name="sem centralizar"
import numpy as np


def pca_cov(X, k):
    X = np.asarray(X, dtype=float)
    Xc = X
    cov = Xc.T @ Xc / (len(X) - 1)
    valores, vetores = np.linalg.eigh(cov)
    ordem = np.argsort(valores)[::-1][:k]
    componentes = vetores[:, ordem].T
    return componentes, valores[ordem] / valores.sum()
```
```python name="média das linhas no lugar das colunas"
import numpy as np


def pca_cov(X, k):
    X = np.asarray(X, dtype=float)
    Xc = X - X.mean(axis=1, keepdims=True)
    cov = Xc.T @ Xc / (len(X) - 1)
    valores, vetores = np.linalg.eigh(cov)
    ordem = np.argsort(valores)[::-1][:k]
    componentes = vetores[:, ordem].T
    return componentes, valores[ordem] / valores.sum()
```
```python name="autovalores em ordem crescente"
import numpy as np


def pca_cov(X, k):
    X = np.asarray(X, dtype=float)
    Xc = X - X.mean(axis=0)
    cov = Xc.T @ Xc / (len(X) - 1)
    valores, vetores = np.linalg.eigh(cov)
    ordem = np.argsort(valores)[:k]
    componentes = vetores[:, ordem].T
    return componentes, valores[ordem] / valores.sum()
```
```python name="componentes em colunas"
import numpy as np


def pca_cov(X, k):
    X = np.asarray(X, dtype=float)
    Xc = X - X.mean(axis=0)
    cov = Xc.T @ Xc / (len(X) - 1)
    valores, vetores = np.linalg.eigh(cov)
    ordem = np.argsort(valores)[::-1][:k]
    componentes = vetores[:, ordem]
    return componentes, valores[ordem] / valores.sum()
```
```python name="variância explicada sem dividir pelo total"
import numpy as np


def pca_cov(X, k):
    X = np.asarray(X, dtype=float)
    Xc = X - X.mean(axis=0)
    cov = Xc.T @ Xc / (len(X) - 1)
    valores, vetores = np.linalg.eigh(cov)
    ordem = np.argsort(valores)[::-1][:k]
    componentes = vetores[:, ordem].T
    return componentes, valores[ordem]
```
```python name="divide pela soma dos k escolhidos"
import numpy as np


def pca_cov(X, k):
    X = np.asarray(X, dtype=float)
    Xc = X - X.mean(axis=0)
    cov = Xc.T @ Xc / (len(X) - 1)
    valores, vetores = np.linalg.eigh(cov)
    ordem = np.argsort(valores)[::-1][:k]
    componentes = vetores[:, ordem].T
    return componentes, valores[ordem] / valores[ordem].sum()
```

## Passo 4 · Leitura · SVD

Montar $X_c^\top X_c$ e procurar autovetores funciona, mas o produto eleva ao quadrado as diferenças de escala da matriz: direções de variância pequena, que já têm poucos dígitos confiáveis, perdem mais precisão. E com milhares de colunas, a covariância $d \times d$ é enorme. A **decomposição em valores singulares** (SVD) chega ao mesmo resultado sem formar o produto. Toda matriz se escreve como

$$
X_c = U\, S\, V^\top
$$

com $U$ ($n \times r$) e $V$ ($d \times r$) de colunas ortonormais e $S$ diagonal, com os **valores singulares** $s_1 \ge s_2 \ge \dots \ge 0$. Substituindo na covariância, $X_c^\top X_c = V S^2 V^\top$: as colunas de $V$ (as linhas de $V^\top$) são os autovetores procurados, já em ordem decrescente, e a variância ao longo do componente $j$ é

$$
\lambda_j = \frac{s_j^2}{n - 1}
$$

Usar $s_j$ no lugar de $s_j^2$ dá variâncias erradas e muda a fração explicada de cada componente.

```python
U, S, Vt = np.linalg.svd(Xc, full_matrices=False)
componentes = Vt[:k]                  # linhas, do maior para o menor
variancias = S ** 2 / (len(Xc) - 1)
Z = Xc @ Vt[:k].T                     # as coordenadas; o mesmo que U[:, :k] * S[:k]
```

O `full_matrices=False` evita montar um $U$ de $n \times n$. O `PCA` do scikit-learn escolhe o método sozinho (`svd_solver="auto"`): no scikit-learn 1.8, com muito mais linhas que colunas, como nas peças, ele usa a decomposição da covariância (`"covariance_eigh"`), e nos outros casos a SVD.

O sinal continua arbitrário: trocar o sinal de $u_j$ e de $v_j$ juntos não muda o produto. Para que o resultado seja reproduzível, o scikit-learn fixa uma regra: em cada componente, a coordenada de **maior valor absoluto** fica positiva. Com essa regra aplicada, um PCA do zero bate com o `components_` coordenada a coordenada, sem precisar comparar valores absolutos.

Quantos componentes guardar? O `PCA(n_components=0.95)` escolhe o menor número de componentes cuja variância explicada acumulada **passa** de 95 %. Nas medidas das peças, as frações são 0,919, 0,072, 0,007 e 0,0015: um componente passa de 90 %, dois passam de 99 %. Quando a soma acumulada é exatamente igual à fração, o scikit-learn ainda pede mais um componente: com duas direções de variância igual, `PCA(0.5)` escolhe 2.

## Passo 5 · Exercício · PCA por SVD e quantos componentes

Escreva o PCA pela SVD, com o mesmo sinal que o scikit-learn usa, e a escolha do número de componentes por uma fração da variância.

### Instruções
1. `pca_svd(X, k)` centraliza `X`, calcula `np.linalg.svd(Xc, full_matrices=False)` e devolve `(componentes, variancia_explicada)`: as `k` primeiras linhas de `Vt` e a fração da variância de cada uma, com a variância de cada componente igual a $s_j^2 / (n - 1)$.
2. Em cada componente, troque o sinal se for preciso para que a coordenada de **maior valor absoluto** fique positiva.
3. `n_componentes_para(X, fracao)` devolve, como `int`, o menor número de componentes cuja variância explicada acumulada **passa** de (é estritamente maior que) `fracao`.

### Código inicial
```python
import numpy as np


def pca_svd(X, k):
    pass


def n_componentes_para(X, fracao):
    pass
```
```text path=medidas.py
import numpy as np


def gerar_medidas(n, semente):
    rng = np.random.default_rng(semente)
    tamanho = rng.normal(0, 1, n)
    forma = rng.normal(0, 0.5, n)
    X = np.column_stack([
        10 + 2.0 * tamanho + 0.3 * forma,
        50 + 1.5 * tamanho - 0.8 * forma,
        5 + 0.5 * tamanho + 1.0 * forma,
        rng.normal(0, 0.2, n),
    ]) + rng.normal(0, 0.1, size=(n, 4))
    return X.round(4)
```

### Solução
```python
import numpy as np


def pca_svd(X, k):
    X = np.asarray(X, dtype=float)
    Xc = X - X.mean(axis=0)
    U, S, Vt = np.linalg.svd(Xc, full_matrices=False)
    componentes = Vt[:k].copy()
    for i in range(k):
        j = np.argmax(np.abs(componentes[i]))
        if componentes[i, j] < 0:
            componentes[i] = -componentes[i]
    variancias = S ** 2 / (len(X) - 1)
    return componentes, variancias[:k] / variancias.sum()


def n_componentes_para(X, fracao):
    X = np.asarray(X, dtype=float)
    _, razao = pca_svd(X, min(X.shape))
    acumulada = np.cumsum(razao)
    for k, valor in enumerate(acumulada, start=1):
        if valor > fracao:
            return k
    return len(acumulada)
```
```text path=medidas.py
import numpy as np


def gerar_medidas(n, semente):
    rng = np.random.default_rng(semente)
    tamanho = rng.normal(0, 1, n)
    forma = rng.normal(0, 0.5, n)
    X = np.column_stack([
        10 + 2.0 * tamanho + 0.3 * forma,
        50 + 1.5 * tamanho - 0.8 * forma,
        5 + 0.5 * tamanho + 1.0 * forma,
        rng.normal(0, 0.2, n),
    ]) + rng.normal(0, 0.1, size=(n, 4))
    return X.round(4)
```

### Dicas
1. A SVD devolve os valores singulares `S` já em ordem decrescente: não há o que ordenar.
2. `np.argmax(np.abs(c))` dá a posição da maior coordenada em valor absoluto do componente `c`.
3. `np.cumsum` acumula as razões; conte os componentes a partir de 1.

### Verificação
```json
[
  {"id": "igual-sklearn", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.decomposition import PCA\nfrom medidas import gerar_medidas\nX = gerar_medidas(150, 2)\nref = PCA(3).fit(X)\nC, v = pca_svd(X, 3)\n", "expr": "bool(np.allclose(C, ref.components_, atol=1e-6))", "expected": true, "name": "Os componentes, COM o sinal, são os do PCA(3) do scikit-learn", "hint": "Compara-se com PCA(k).components_ sem tirar o valor absoluto: em cada componente, a coordenada de maior valor absoluto precisa ficar positiva."},
  {"id": "variancia-svd", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.decomposition import PCA\nfrom medidas import gerar_medidas\nX = gerar_medidas(150, 2)\nref = PCA(3).fit(X)\nC, v = pca_svd(X, 3)\n", "expr": "bool(np.allclose(v, ref.explained_variance_ratio_, atol=1e-9))", "expected": true, "name": "A variância explicada é a do scikit-learn", "hint": "A variância de cada componente é o valor singular AO QUADRADO dividido por n - 1."},
  {"id": "sinal-positivo", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nfrom medidas import gerar_medidas\nX = gerar_medidas(90, 7)\nC, v = pca_svd(-X, 4)", "expr": "[bool(c[np.argmax(np.abs(c))] > 0) for c in C]", "expected": [true, true, true, true], "name": "Em todo componente, a coordenada de maior valor absoluto é positiva"},
  {"id": "reta-svd", "checkpoint": 1, "kind": "expr", "setup": "C, v = pca_svd([[0, 0], [1, -2], [2, -4], [3, -6]], 2)", "expr": "[C[0].round(6).tolist(), v.round(6).tolist()]", "expected": [[-0.447214, 0.894427], [1.0, 0.0]], "tolerance": 1e-09, "name": "Pontos sobre a reta y = -2x: o primeiro componente é (-1, 2)/√5, com o 2 positivo"},
  {"id": "formas-svd", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.decomposition import PCA\nfrom medidas import gerar_medidas\nX = gerar_medidas(150, 2)\nref = PCA(3).fit(X)\nC, v = pca_svd(X, 3)\n", "expr": "[list(C.shape), list(v.shape)]", "expected": [[3, 4], [3]], "name": "Componentes k × d e uma razão por componente"},
  {"id": "n-comp", "checkpoint": 3, "kind": "expr", "setup": "from medidas import gerar_medidas\nX = gerar_medidas(150, 2)", "expr": "[n_componentes_para(X, f) for f in [0.5, 0.9, 0.99, 1.0]]", "expected": [1, 1, 2, 4], "name": "Quantos componentes para 50%, 90%, 99% e 100% da variância", "hint": "Acumule as razões de variância explicada (np.cumsum) e devolva o primeiro k, contando de 1, em que a soma chega à fração."},
  {"id": "n-comp-sklearn", "checkpoint": 3, "kind": "expr", "setup": "from sklearn.decomposition import PCA\nfrom medidas import gerar_medidas\nX = gerar_medidas(200, 9)", "expr": "[bool(n_componentes_para(X, f) == PCA(f).fit(X).n_components_) for f in [0.6, 0.8, 0.95]]", "expected": [true, true, true], "name": "O mesmo número que o PCA(n_components=fração) do scikit-learn escolhe"},
  {"id": "n-comp-empate", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nX = np.array([[1.0, 0.0], [-1.0, 0.0], [0.0, 1.0], [0.0, -1.0]])", "expr": "n_componentes_para(X, 0.5)", "expected": 2, "name": "Duas direções com metade da variância cada: 1 componente chega a 50%, mas não passa; são precisos 2, como no PCA(0.5)", "hint": "Como no scikit-learn, a soma acumulada precisa PASSAR da fração (estritamente maior)."},
  {"id": "n-comp-tipo", "checkpoint": 3, "kind": "expr", "setup": "from medidas import gerar_medidas\nX = gerar_medidas(50, 4)", "expr": "type(n_componentes_para(X, 0.9)).__name__", "expected": "int", "name": "Devolve um int"}
]
```

### Soluções erradas
```python name="sinal sem alinhar"
import numpy as np


def pca_svd(X, k):
    X = np.asarray(X, dtype=float)
    Xc = X - X.mean(axis=0)
    U, S, Vt = np.linalg.svd(Xc, full_matrices=False)
    componentes = Vt[:k].copy()
    for i in range(k):
        j = np.argmax(np.abs(componentes[i]))
        pass
    variancias = S ** 2 / (len(X) - 1)
    return componentes, variancias[:k] / variancias.sum()


def n_componentes_para(X, fracao):
    X = np.asarray(X, dtype=float)
    _, razao = pca_svd(X, min(X.shape))
    acumulada = np.cumsum(razao)
    for k, valor in enumerate(acumulada, start=1):
        if valor > fracao:
            return k
    return len(acumulada)
```
```python name="valores singulares sem o quadrado"
import numpy as np


def pca_svd(X, k):
    X = np.asarray(X, dtype=float)
    Xc = X - X.mean(axis=0)
    U, S, Vt = np.linalg.svd(Xc, full_matrices=False)
    componentes = Vt[:k].copy()
    for i in range(k):
        j = np.argmax(np.abs(componentes[i]))
        if componentes[i, j] < 0:
            componentes[i] = -componentes[i]
    variancias = S / (len(X) - 1)
    return componentes, variancias[:k] / variancias.sum()


def n_componentes_para(X, fracao):
    X = np.asarray(X, dtype=float)
    _, razao = pca_svd(X, min(X.shape))
    acumulada = np.cumsum(razao)
    for k, valor in enumerate(acumulada, start=1):
        if valor > fracao:
            return k
    return len(acumulada)
```
```python name="sem centralizar"
import numpy as np


def pca_svd(X, k):
    X = np.asarray(X, dtype=float)
    Xc = X
    U, S, Vt = np.linalg.svd(Xc, full_matrices=False)
    componentes = Vt[:k].copy()
    for i in range(k):
        j = np.argmax(np.abs(componentes[i]))
        if componentes[i, j] < 0:
            componentes[i] = -componentes[i]
    variancias = S ** 2 / (len(X) - 1)
    return componentes, variancias[:k] / variancias.sum()


def n_componentes_para(X, fracao):
    X = np.asarray(X, dtype=float)
    _, razao = pca_svd(X, min(X.shape))
    acumulada = np.cumsum(razao)
    for k, valor in enumerate(acumulada, start=1):
        if valor > fracao:
            return k
    return len(acumulada)
```
```python name="colunas de U no lugar das linhas de Vt"
import numpy as np


def pca_svd(X, k):
    X = np.asarray(X, dtype=float)
    Xc = X - X.mean(axis=0)
    U, S, Vt = np.linalg.svd(Xc, full_matrices=False)
    componentes = U[:, :k].T.copy()
    for i in range(k):
        j = np.argmax(np.abs(componentes[i]))
        if componentes[i, j] < 0:
            componentes[i] = -componentes[i]
    variancias = S ** 2 / (len(X) - 1)
    return componentes, variancias[:k] / variancias.sum()


def n_componentes_para(X, fracao):
    X = np.asarray(X, dtype=float)
    _, razao = pca_svd(X, min(X.shape))
    acumulada = np.cumsum(razao)
    for k, valor in enumerate(acumulada, start=1):
        if valor > fracao:
            return k
    return len(acumulada)
```
```python name="soma acumulada maior ou igual"
import numpy as np


def pca_svd(X, k):
    X = np.asarray(X, dtype=float)
    Xc = X - X.mean(axis=0)
    U, S, Vt = np.linalg.svd(Xc, full_matrices=False)
    componentes = Vt[:k].copy()
    for i in range(k):
        j = np.argmax(np.abs(componentes[i]))
        if componentes[i, j] < 0:
            componentes[i] = -componentes[i]
    variancias = S ** 2 / (len(X) - 1)
    return componentes, variancias[:k] / variancias.sum()


def n_componentes_para(X, fracao):
    X = np.asarray(X, dtype=float)
    _, razao = pca_svd(X, min(X.shape))
    acumulada = np.cumsum(razao)
    for k, valor in enumerate(acumulada, start=1):
        if valor >= fracao:
            return k
    return len(acumulada)
```
```python name="número contado a partir de zero"
import numpy as np


def pca_svd(X, k):
    X = np.asarray(X, dtype=float)
    Xc = X - X.mean(axis=0)
    U, S, Vt = np.linalg.svd(Xc, full_matrices=False)
    componentes = Vt[:k].copy()
    for i in range(k):
        j = np.argmax(np.abs(componentes[i]))
        if componentes[i, j] < 0:
            componentes[i] = -componentes[i]
    variancias = S ** 2 / (len(X) - 1)
    return componentes, variancias[:k] / variancias.sum()


def n_componentes_para(X, fracao):
    X = np.asarray(X, dtype=float)
    _, razao = pca_svd(X, min(X.shape))
    acumulada = np.cumsum(razao)
    for k, valor in enumerate(acumulada, start=0):
        if valor > fracao:
            return k
    return len(acumulada) - 1
```

## Passo 6 · Leitura · Projetar, reconstruir e escalar

Com os $k$ primeiros componentes nas colunas de $V_k$ ($d \times k$), cada linha vira $k$ coordenadas, $Z = X_c V_k$, e dá para voltar ao espaço original: $\hat{X} = Z V_k^\top + \mu$, somando a média de volta. Com $k = d$, a volta é exata; com $k < d$, perde-se a parte dos dados nas direções descartadas, e o **erro de reconstrução** mede essa perda. Nas medidas fictícias de 150 peças, a média dos quadrados das diferenças cai de 0,134 com um componente para 0,015 com dois, 0,003 com três e zero com os quatro. No scikit-learn, `pca.inverse_transform(pca.transform(X))` faz a ida e a volta. É também a ideia da compressão: guardar $Z$ e $V_k$ ocupa bem menos que guardar $X$ quando $k$ é pequeno.

Em alta dimensão, o ganho aparece mais. Padrões fictícios de 5 × 5 pixels (25 colunas), sorteados em volta de três desenhos (uma cruz, uma moldura e uma diagonal) com ruído, têm 52 % da variância no primeiro componente e 81 % nos dois primeiros. Projetadas em 2 dimensões, as três famílias formam três nuvens separadas, com médias a mais de 2 unidades umas das outras e desvio perto de 0,2: dá para ver a estrutura de 25 colunas num plano.

Dois cuidados. Primeiro, a **escala**: o PCA maximiza variância, e variância depende da unidade. Medindo uma das colunas das peças em milésimos, o primeiro componente vira $(0{,}001;\ 1{,}000;\ 0{,}000;\ 0{,}000)$, só aquela coluna, com praticamente 100 % da variância; padronizando antes, ele volta a misturar as três medidas ligadas ao tamanho. Com colunas em unidades diferentes, padronize. Segundo, o **vazamento**: o `StandardScaler` e o `PCA` aprendem médias, desvios e direções, e precisam ser ajustados só no treino, dentro de um `Pipeline`, como qualquer transformador do módulo 4.

O PCA é linear: projeta em retas e planos. Para visualizar estruturas curvas existe o t-SNE, em `sklearn.manifold.TSNE`, que preserva vizinhanças em vez de variância; ele serve só para olhar (não tem `transform` para dados novos). O UMAP não está instalado no executor.

## Passo 7 · Exercício · Reconstrução

Meça quanto se perde ao guardar só `k` componentes e projete um teste sem vazamento.

### Instruções
1. `reconstruir(X, k)` centraliza `X`, pega os `k` primeiros componentes da SVD, projeta os dados centralizados neles, volta para as `d` colunas originais e soma a média de volta.
2. Devolve a tupla `(X_reconstruido, erro)`: a matriz reconstruída, da forma de `X`, e o erro de reconstrução, a média dos quadrados das diferenças em todas as células, como `float`.
3. `pca_padronizado(X_treino, X_teste, k)` ajusta `make_pipeline(StandardScaler(), PCA(k))` **só no treino** e devolve as coordenadas do teste nos `k` componentes.

### Código inicial
```python
import numpy as np
from sklearn.decomposition import PCA
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler


def reconstruir(X, k):
    pass


def pca_padronizado(X_treino, X_teste, k):
    pass
```
```text path=medidas.py
import numpy as np


def gerar_medidas(n, semente):
    rng = np.random.default_rng(semente)
    tamanho = rng.normal(0, 1, n)
    forma = rng.normal(0, 0.5, n)
    X = np.column_stack([
        10 + 2.0 * tamanho + 0.3 * forma,
        50 + 1.5 * tamanho - 0.8 * forma,
        5 + 0.5 * tamanho + 1.0 * forma,
        rng.normal(0, 0.2, n),
    ]) + rng.normal(0, 0.1, size=(n, 4))
    return X.round(4)
```

### Solução
```python
import numpy as np
from sklearn.decomposition import PCA
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler


def reconstruir(X, k):
    X = np.asarray(X, dtype=float)
    media = X.mean(axis=0)
    _, _, Vt = np.linalg.svd(X - media, full_matrices=False)
    V = Vt[:k].T
    X_rec = (X - media) @ V @ V.T + media
    return X_rec, float(np.mean((X - X_rec) ** 2))


def pca_padronizado(X_treino, X_teste, k):
    modelo = make_pipeline(StandardScaler(), PCA(k)).fit(X_treino)
    return modelo.transform(X_teste)
```
```text path=medidas.py
import numpy as np


def gerar_medidas(n, semente):
    rng = np.random.default_rng(semente)
    tamanho = rng.normal(0, 1, n)
    forma = rng.normal(0, 0.5, n)
    X = np.column_stack([
        10 + 2.0 * tamanho + 0.3 * forma,
        50 + 1.5 * tamanho - 0.8 * forma,
        5 + 0.5 * tamanho + 1.0 * forma,
        rng.normal(0, 0.2, n),
    ]) + rng.normal(0, 0.1, size=(n, 4))
    return X.round(4)
```

### Dicas
1. Com `V` sendo os `k` componentes nas colunas ($d \times k$), as coordenadas são `Xc @ V` e a volta é `(Xc @ V) @ V.T`.
2. Sem somar a média de volta, a reconstrução fica em volta da origem e não dos dados.
3. O teste só passa por `transform`.

### Verificação
```json
[
  {"id": "igual-inverse", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.decomposition import PCA\nfrom medidas import gerar_medidas\nX = gerar_medidas(100, 6)\nref = PCA(2).fit(X)\nXr, e = reconstruir(X, 2)\n", "expr": "bool(np.allclose(Xr, ref.inverse_transform(ref.transform(X)), atol=1e-8))", "expected": true, "name": "A reconstrução com 2 componentes é a do inverse_transform do PCA(2)", "hint": "Projete os dados centralizados nos k componentes, volte para o espaço original e some a média de volta."},
  {"id": "erro-literal", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.decomposition import PCA\nfrom medidas import gerar_medidas\nX = gerar_medidas(100, 6)\nref = PCA(2).fit(X)\nXr, e = reconstruir(X, 2)\n", "expr": "round(e, 6)", "expected": 0.014065, "tolerance": 1e-09, "name": "O erro de reconstrução é a média dos quadrados das diferenças, em todas as células", "hint": "np.mean((X - X_rec) ** 2), sobre a matriz inteira."},
  {"id": "erro-decresce", "checkpoint": 2, "kind": "expr", "setup": "from medidas import gerar_medidas\nX = gerar_medidas(100, 6)\nerros = [reconstruir(X, k)[1] for k in [1, 2, 3, 4]]", "expr": "[bool(a > b) for a, b in zip(erros, erros[1:])] + [bool(erros[-1] < 1e-20)]", "expected": [true, true, true, true], "name": "O erro cai a cada componente a mais e zera com todos os 4"},
  {"id": "reta-zero", "checkpoint": 1, "kind": "expr", "setup": "Xr, e = reconstruir([[1, 3], [2, 5], [3, 7], [4, 9]], 1)", "expr": "[Xr.round(9).tolist(), round(e, 12)]", "expected": [[[1.0, 3.0], [2.0, 5.0], [3.0, 7.0], [4.0, 9.0]], 0.0], "tolerance": 1e-09, "name": "Pontos sobre uma reta fora da origem: um componente reconstrói tudo, com a média somada de volta"},
  {"id": "forma-rec", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.decomposition import PCA\nfrom medidas import gerar_medidas\nX = gerar_medidas(100, 6)\nref = PCA(2).fit(X)\nXr, e = reconstruir(X, 2)\n", "expr": "[type(Xr).__name__, list(Xr.shape), type(e).__name__]", "expected": ["ndarray", [100, 4], "float"], "name": "Devolve a matriz reconstruída (mesma forma de X) e o erro como float"},
  {"id": "teste-projetado", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.decomposition import PCA\nfrom sklearn.pipeline import make_pipeline\nfrom sklearn.preprocessing import StandardScaler\nfrom medidas import gerar_medidas\nX = gerar_medidas(120, 8)\nXtr, Xte = X[:90], X[90:]\nref = make_pipeline(StandardScaler(), PCA(2)).fit(Xtr)\nZ = pca_padronizado(Xtr, Xte, 2)\n", "expr": "bool(np.allclose(Z, ref.transform(Xte), atol=1e-9))", "expected": true, "name": "O teste é projetado com o StandardScaler e o PCA ajustados só no treino", "hint": "Compara-se com make_pipeline(StandardScaler(), PCA(k)).fit(X_treino).transform(X_teste). O teste não entra em nenhum fit."},
  {"id": "teste-forma", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.decomposition import PCA\nfrom sklearn.pipeline import make_pipeline\nfrom sklearn.preprocessing import StandardScaler\nfrom medidas import gerar_medidas\nX = gerar_medidas(120, 8)\nXtr, Xte = X[:90], X[90:]\nref = make_pipeline(StandardScaler(), PCA(2)).fit(Xtr)\nZ = pca_padronizado(Xtr, Xte, 2)\n", "expr": "list(Z.shape)", "expected": [30, 2], "name": "Uma linha por linha do teste, k colunas"},
  {"id": "teste-uma-linha", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.decomposition import PCA\nfrom sklearn.pipeline import make_pipeline\nfrom sklearn.preprocessing import StandardScaler\nfrom medidas import gerar_medidas\nX = gerar_medidas(120, 8)\nXtr, Xte = X[:90], X[90:]\nref = make_pipeline(StandardScaler(), PCA(2)).fit(Xtr)\nZ = pca_padronizado(Xtr, Xte, 2)\nZ1 = pca_padronizado(Xtr, Xte[:1], 2)", "expr": "bool(np.allclose(Z1, Z[:1], atol=1e-9))", "expected": true, "name": "Projetar uma linha do teste sozinha dá o mesmo resultado que projetá-la junto com as outras", "hint": "Se o resultado de uma linha depende das outras linhas do teste, alguma coisa foi ajustada no teste."}
]
```

### Soluções erradas
```python name="esquece de somar a média de volta"
import numpy as np
from sklearn.decomposition import PCA
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler


def reconstruir(X, k):
    X = np.asarray(X, dtype=float)
    media = X.mean(axis=0)
    _, _, Vt = np.linalg.svd(X - media, full_matrices=False)
    V = Vt[:k].T
    X_rec = (X - media) @ V @ V.T
    return X_rec, float(np.mean((X - X_rec) ** 2))


def pca_padronizado(X_treino, X_teste, k):
    modelo = make_pipeline(StandardScaler(), PCA(k)).fit(X_treino)
    return modelo.transform(X_teste)
```
```python name="projeta sem centralizar"
import numpy as np
from sklearn.decomposition import PCA
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler


def reconstruir(X, k):
    X = np.asarray(X, dtype=float)
    media = X.mean(axis=0)
    _, _, Vt = np.linalg.svd(X - media, full_matrices=False)
    V = Vt[:k].T
    X_rec = X @ V @ V.T
    return X_rec, float(np.mean((X - X_rec) ** 2))


def pca_padronizado(X_treino, X_teste, k):
    modelo = make_pipeline(StandardScaler(), PCA(k)).fit(X_treino)
    return modelo.transform(X_teste)
```
```python name="erro sem o quadrado"
import numpy as np
from sklearn.decomposition import PCA
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler


def reconstruir(X, k):
    X = np.asarray(X, dtype=float)
    media = X.mean(axis=0)
    _, _, Vt = np.linalg.svd(X - media, full_matrices=False)
    V = Vt[:k].T
    X_rec = (X - media) @ V @ V.T + media
    return X_rec, float(np.mean(np.abs(X - X_rec)))


def pca_padronizado(X_treino, X_teste, k):
    modelo = make_pipeline(StandardScaler(), PCA(k)).fit(X_treino)
    return modelo.transform(X_teste)
```
```python name="PCA ajustado em treino e teste"
import numpy as np
from sklearn.decomposition import PCA
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler


def reconstruir(X, k):
    X = np.asarray(X, dtype=float)
    media = X.mean(axis=0)
    _, _, Vt = np.linalg.svd(X - media, full_matrices=False)
    V = Vt[:k].T
    X_rec = (X - media) @ V @ V.T + media
    return X_rec, float(np.mean((X - X_rec) ** 2))


def pca_padronizado(X_treino, X_teste, k):
    modelo = make_pipeline(StandardScaler(), PCA(k)).fit(np.vstack([X_treino, X_teste]))
    return modelo.transform(X_teste)
```
```python name="fit_transform no teste"
import numpy as np
from sklearn.decomposition import PCA
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler


def reconstruir(X, k):
    X = np.asarray(X, dtype=float)
    media = X.mean(axis=0)
    _, _, Vt = np.linalg.svd(X - media, full_matrices=False)
    V = Vt[:k].T
    X_rec = (X - media) @ V @ V.T + media
    return X_rec, float(np.mean((X - X_rec) ** 2))


def pca_padronizado(X_treino, X_teste, k):
    modelo = make_pipeline(StandardScaler(), PCA(k)).fit(X_treino)
    return modelo.fit_transform(X_teste)
```
```python name="PCA sem padronizar"
import numpy as np
from sklearn.decomposition import PCA
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler


def reconstruir(X, k):
    X = np.asarray(X, dtype=float)
    media = X.mean(axis=0)
    _, _, Vt = np.linalg.svd(X - media, full_matrices=False)
    V = Vt[:k].T
    X_rec = (X - media) @ V @ V.T + media
    return X_rec, float(np.mean((X - X_rec) ** 2))


def pca_padronizado(X_treino, X_teste, k):
    modelo = make_pipeline(PCA(k)).fit(X_treino)
    return modelo.transform(X_teste)
```

## Passo 8 · Quiz · Centralizar e o sinal

### Pergunta
Uma colega calcula o primeiro componente de um conjunto de peças com o `eigh` da covariância e obtém `[-0.58, -0.58, -0.57]`; o `PCA(1).components_` do scikit-learn dá `[0.58, 0.58, 0.57]`. Ela conclui que uma das contas está errada. O que dizer?
- [ ] O `eigh` está errado: autovetores sempre têm a primeira coordenada positiva
- [x] As duas estão certas: $v$ e $-v$ são a mesma direção, e o sinal de um autovetor é arbitrário; compare em valor absoluto, ou alinhe o sinal com uma regra (o scikit-learn deixa positiva a coordenada de maior valor absoluto)
- [ ] O scikit-learn está errado porque não centralizou os dados
- [ ] A diferença vem de o `eigh` usar $n - 1$ e o scikit-learn usar $n$
> Se $\Sigma v = \lambda v$, então $\Sigma(-v) = \lambda(-v)$: os dois são autovetores do mesmo autovalor, e cada algoritmo devolve um deles. Projetar em $-v$ só espelha as coordenadas. O fator $n$ ou $n - 1$ muda os autovalores por uma constante, não os autovetores, e o scikit-learn centraliza sempre.

### Pergunta
Um analista faz `U, S, Vt = np.linalg.svd(X)` direto nas medidas das peças (colunas com médias 10, 50 e 5) e usa `Vt[0]` como primeiro componente. Ele percebe que `Vt[0]` é quase igual ao vetor das médias normalizado. O que aconteceu?
- [ ] Nada: em dados reais, a direção de maior variância costuma coincidir com a média
- [ ] A SVD só funciona com matrizes quadradas
- [x] Faltou centralizar: sem subtrair a média de cada coluna, a SVD acha a direção que vai da origem até a nuvem, e não a direção em que a nuvem se espalha
- [ ] Faltou padronizar: com as colunas em escalas diferentes, a SVD aponta para a média
> O PCA mede espalhamento em volta da média. Sem centralizar, a "variância" ao longo de uma direção inclui a distância da nuvem até a origem, e com médias grandes esse termo domina: o primeiro componente aponta para o centro da nuvem. Padronizar resolveria a escala, mas a padronização também centraliza; o defeito aqui é a média. A SVD aceita matrizes retangulares.

### Pergunta
Clientes fictícios são descritos por renda mensal (em R\$, desvio de 2 000) e por três notas de satisfação de 0 a 10 (desvio perto de 2). O `PCA(1)` sem padronizar explica praticamente 100 % da variância com um componente quase igual a `[1, 0, 0, 0]`. Como interpretar?
- [ ] Os dados são praticamente unidimensionais: as notas não trazem informação
- [x] O resultado reflete as unidades, não a estrutura: a variância da renda, em reais ao quadrado, engole as notas; com colunas em unidades diferentes, padronize antes do PCA (ajustando o `StandardScaler` no treino)
- [ ] O PCA deveria ter sido feito com mais componentes; com 4 o problema some
- [ ] Basta centralizar: o PCA do scikit-learn não centraliza
> O PCA maximiza variância, e a variância depende da unidade: medir a renda em centavos aumentaria ainda mais o domínio dela. Padronizar dá a cada coluna variância 1, e o PCA passa a olhar as correlações. Mais componentes não mudam o primeiro, e o `PCA` do scikit-learn sempre centraliza.
