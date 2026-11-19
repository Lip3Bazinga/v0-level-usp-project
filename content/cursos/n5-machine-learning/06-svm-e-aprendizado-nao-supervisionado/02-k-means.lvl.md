---
slug: n5-m6-02-k-means
titulo: k-means do zero
descricao: Inércia, atribuição e atualização, inicialização k-means++, escolha de k (cotovelo, silhueta), limitações e aplicações (segmentação, compressão de cores).
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
- Implementar k-means com inicialização k-means++ e critério de convergência
- Escolher k com inércia e coeficiente de silhueta e reconhecer os limites de cada critério
- Aplicar k-means a segmentação de clientes e a quantização de cores de uma imagem
---

## Passo 1 · Leitura · Inércia e o algoritmo de Lloyd

Até aqui, todo conjunto de dados vinha com uma coluna de respostas. Uma loja fictícia tem só o histórico dos clientes (há quantos dias compraram, quantas vezes por ano, quanto gastam) e quer saber se eles formam grupos parecidos entre si, para tratar cada grupo de um jeito. Sem rótulo para imitar, o problema é **não supervisionado**: o algoritmo precisa inventar os grupos.

O **k-means** fixa o número de grupos $k$ e procura $k$ centróides $\mu_1, \dots, \mu_k$ que deixem cada ponto perto do centróide do seu grupo. A medida de "perto" é a **inércia**, a soma das distâncias **ao quadrado** de cada ponto ao centróide do grupo dele:

$$
J = \sum_{i=1}^{n} \lVert x_i - \mu_{c(i)} \rVert^2
$$

Achar o mínimo exato é difícil, e o **algoritmo de Lloyd** alterna dois passos que nunca aumentam $J$: **atribuir** cada ponto ao centróide mais próximo (com os centróides fixos, é a melhor escolha de grupos) e **atualizar** cada centróide para a média dos pontos do seu grupo (com os grupos fixos, a média é o ponto que minimiza a soma dos quadrados). Quando os grupos param de mudar, os centróides param também, e o algoritmo convergiu. O visualizador faz duas iterações com seis pontos e dois centróides iniciais.

```python visualizar
pontos = [(1.0, 1.0), (1.5, 2.0), (3.0, 4.0), (5.0, 7.0), (3.5, 5.0), (4.5, 5.0)]
centroides = [(1.0, 1.0), (5.0, 7.0)]

for iteracao in range(2):
    grupos = [[], []]
    inercia = 0.0
    for p in pontos:
        d = [(p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 for c in centroides]
        j = d.index(min(d))
        grupos[j].append(p)
        inercia += min(d)
    print("iteração", iteracao + 1, "inércia", round(inercia, 2))
    novos = []
    for j, g in enumerate(grupos):
        cx = sum(p[0] for p in g) / len(g)
        cy = sum(p[1] for p in g) / len(g)
        novos.append((cx, cy))
        print("  grupo", j, g, "->", (round(cx, 2), round(cy, 2)))
    centroides = novos
```

O ponto $(3, 4)$ está à mesma distância dos dois centróides iniciais e fica com o primeiro, por convenção. Na segunda iteração, nenhum ponto troca de grupo: a inércia caiu de 24,75 para 10,67, e os centróides não mudam mais. No scikit-learn, a mesma conta é `KMeans(n_clusters=k, random_state=0).fit(X)`, com os rótulos em `labels_`, os centróides em `cluster_centers_` e a inércia em `inertia_`. No executor, o primeiro `KMeans` escreve no stderr `UserWarning: Unable to import LDSO from pyodide_js._module. This should never happen.`; o aviso vem da montagem do Python, e não do seu código.

## Passo 2 · Previsão · Rótulos que trocam de nome

O programa roda o k-means duas vezes nos mesmos seis pontos, com sementes diferentes, e compara os resultados. Leia sem executar e digite o que ele imprime.

### Código
```python
import numpy as np
from sklearn.cluster import KMeans
from sklearn.metrics import adjusted_rand_score

X = np.array([[0, 0], [0, 1], [10, 10], [10, 11], [20, 0], [20, 1]], dtype=float)
a = KMeans(3, n_init=1, random_state=0).fit(X)
b = KMeans(3, n_init=1, random_state=5).fit(X)
print(a.labels_.tolist())
print(b.labels_.tolist())
print(float(np.mean(a.labels_ == b.labels_)), adjusted_rand_score(a.labels_, b.labels_))
print(a.inertia_, b.inertia_)
print(sorted(map(tuple, a.cluster_centers_.tolist())))
```

### Dicas
1. Os seis pontos formam três pares bem separados, e as duas execuções acham os mesmos três grupos. Só a numeração muda: a primeira chama os pares de 2, 0 e 1, na ordem das linhas, e a segunda de 0, 2 e 1.
2. A concordância posição a posição só conta os pares que receberam o mesmo número nas duas execuções; o índice de Rand ajustado (ARI) compara as partições sem olhar os números e vale 1 quando elas são iguais.
3. Cada centróide é a média de um par, e cada ponto fica a 0,5 do seu centróide.

### Saída esperada
```text
[2, 2, 0, 0, 1, 1]
[0, 0, 2, 2, 1, 1]
0.3333333333333333 1.0
1.5 1.5
[(0.0, 0.5), (10.0, 10.5), (20.0, 0.5)]
```

## Passo 3 · Exercício · Atribuir e atualizar
modo: lacunas

Complete as lacunas (`___`) dos dois passos do algoritmo de Lloyd.

### Instruções
1. `atribuir(X, C)` monta, por broadcasting, a matriz $n \times k$ das distâncias ao quadrado de cada ponto a cada centróide e devolve, para cada ponto, o índice do centróide mais próximo; num empate, fica o de menor índice.
2. `atualizar(X, rotulos, C)` devolve os centróides novos, cada um a média dos pontos com aquele rótulo, numa **cópia** de `C`: o array recebido não muda.
3. Um grupo que ficou sem nenhum ponto mantém o centróide anterior.

### Código inicial
```python
import numpy as np


def atribuir(X, C):
    X = np.asarray(X, dtype=float)
    C = np.asarray(C, dtype=float)
    distancias = ((X[:, None, :] - ___) ** 2).sum(axis=___)
    return distancias.___(axis=1)


def atualizar(X, rotulos, C):
    X = np.asarray(X, dtype=float)
    novos = ___
    for j in range(len(novos)):
        membros = X[___]
        if ___:
            novos[j] = membros.___(axis=0)
    return novos
```
```text path=nuvens.py
import numpy as np


def gerar_nuvens(n_por_grupo, centros, desvio, semente):
    rng = np.random.default_rng(semente)
    centros = np.asarray(centros, dtype=float)
    X = np.vstack([rng.normal(c, desvio, size=(n_por_grupo, centros.shape[1])) for c in centros])
    grupos = np.repeat(np.arange(len(centros)), n_por_grupo)
    ordem = rng.permutation(len(X))
    return X[ordem].round(3), grupos[ordem]
```

### Solução
```python
import numpy as np


def atribuir(X, C):
    X = np.asarray(X, dtype=float)
    C = np.asarray(C, dtype=float)
    distancias = ((X[:, None, :] - C[None, :, :]) ** 2).sum(axis=2)
    return distancias.argmin(axis=1)


def atualizar(X, rotulos, C):
    X = np.asarray(X, dtype=float)
    novos = np.array(C, dtype=float)
    for j in range(len(novos)):
        membros = X[rotulos == j]
        if len(membros) > 0:
            novos[j] = membros.mean(axis=0)
    return novos
```
```text path=nuvens.py
import numpy as np


def gerar_nuvens(n_por_grupo, centros, desvio, semente):
    rng = np.random.default_rng(semente)
    centros = np.asarray(centros, dtype=float)
    X = np.vstack([rng.normal(c, desvio, size=(n_por_grupo, centros.shape[1])) for c in centros])
    grupos = np.repeat(np.arange(len(centros)), n_por_grupo)
    ordem = rng.permutation(len(X))
    return X[ordem].round(3), grupos[ordem]
```

### Dicas
1. `X[:, None, :] - C[None, :, :]` tem forma $(n, k, d)$: some os quadrados no último eixo.
2. O `argmin` devolve a primeira posição do menor valor, o que já resolve o empate.
3. A média de um conjunto vazio dá `nan` (com o aviso `RuntimeWarning: Mean of empty slice`); teste se o grupo tem membros antes de calcular.

### Verificação
```json
[
  {"id": "atribui-seis", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nX = [[1, 1], [1.5, 2], [3, 4], [5, 7], [3.5, 5], [4.5, 5]]\nr = atribuir(X, [[1, 1], [5, 7]])", "expr": "r.tolist()", "expected": [0, 0, 0, 1, 1, 1], "name": "Seis pontos e centróides (1, 1) e (5, 7): cada ponto vai para o mais próximo, e (3, 4), à mesma distância dos dois, fica com o 0", "hint": "Para cada ponto, a soma dos quadrados das diferenças até cada centróide; o rótulo é a posição do menor valor."},
  {"id": "atribui-empate", "checkpoint": 1, "kind": "expr", "setup": "r = atribuir([[0, 0], [2, 0]], [[1, 1], [1, -1]])", "expr": "r.tolist()", "expected": [0, 0], "name": "Empate de distância: fica o centróide de menor índice"},
  {"id": "atribui-forma", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nr = atribuir(np.zeros((7, 3)), np.ones((2, 3)))", "expr": "[type(r).__name__, list(r.shape)]", "expected": ["ndarray", [7]], "name": "Devolve um array com um rótulo por linha de X"},
  {"id": "atribui-kmeans", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.cluster import KMeans\nfrom nuvens import gerar_nuvens\nX, g = gerar_nuvens(40, [[0, 0], [6, 0], [0, 6], [6, 6]], 1.0, 0)\nkm = KMeans(4, n_init=10, random_state=0).fit(X)\n", "expr": "atribuir(X, km.cluster_centers_).tolist() == km.labels_.tolist()", "expected": true, "name": "Com os centróides de um KMeans ajustado, os rótulos são os labels_ dele", "hint": "Compara-se com o labels_ de KMeans(4, n_init=10, random_state=0). A distância soma os quadrados ao longo das colunas, e o rótulo é o argmin."},
  {"id": "atualiza-seis", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nX = [[1, 1], [1.5, 2], [3, 4], [5, 7], [3.5, 5], [4.5, 5]]\nr = atualizar(X, np.array([0, 0, 0, 1, 1, 1]), [[1, 1], [5, 7]])", "expr": "r.tolist()", "expected": [[1.833333333, 2.333333333], [4.333333333, 5.666666667]], "tolerance": 1e-06, "name": "Os novos centróides são as médias dos pontos de cada grupo", "hint": "Média, coluna a coluna, das linhas de X com aquele rótulo."},
  {"id": "atualiza-vazio", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nr = atualizar([[0, 0], [2, 2]], np.array([0, 0]), [[1, 0], [9, 9]])", "expr": "r.tolist()", "expected": [[1.0, 1.0], [9.0, 9.0]], "tolerance": 1e-09, "name": "Um grupo sem nenhum ponto mantém o centróide anterior", "hint": "A média de um conjunto vazio dá nan; teste se o grupo tem membros antes de calcular."},
  {"id": "atualiza-nao-altera", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nC = np.array([[1.0, 0.0], [9.0, 9.0]])\nr = atualizar(np.array([[0.0, 0.0], [2.0, 2.0]]), np.array([0, 1]), C)", "expr": "C.tolist()", "expected": [[1.0, 0.0], [9.0, 9.0]], "name": "O array C recebido não muda", "hint": "Trabalhe numa cópia dos centróides: np.asarray de um array float devolve o próprio array."},
  {"id": "atualiza-kmeans", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.cluster import KMeans\nfrom nuvens import gerar_nuvens\nX, g = gerar_nuvens(40, [[0, 0], [6, 0], [0, 6], [6, 6]], 1.0, 0)\nkm = KMeans(4, n_init=10, random_state=0).fit(X)\n", "expr": "bool(np.allclose(atualizar(X, km.labels_, np.zeros((4, 2))), km.cluster_centers_, atol=1e-6))", "expected": true, "name": "Com os rótulos de um KMeans convergido, as médias são os cluster_centers_ dele", "hint": "Compara-se com o cluster_centers_ de KMeans(4, n_init=10, random_state=0): cada centróide é a média do seu grupo."}
]
```

### Soluções erradas
```python name="argmax no lugar de argmin"
import numpy as np


def atribuir(X, C):
    X = np.asarray(X, dtype=float)
    C = np.asarray(C, dtype=float)
    distancias = ((X[:, None, :] - C[None, :, :]) ** 2).sum(axis=2)
    return distancias.argmax(axis=1)


def atualizar(X, rotulos, C):
    X = np.asarray(X, dtype=float)
    novos = np.array(C, dtype=float)
    for j in range(len(novos)):
        membros = X[rotulos == j]
        if len(membros) > 0:
            novos[j] = membros.mean(axis=0)
    return novos
```
```python name="soma das diferenças no eixo errado"
import numpy as np


def atribuir(X, C):
    X = np.asarray(X, dtype=float)
    C = np.asarray(C, dtype=float)
    distancias = ((X[:, None, :] - C[None, :, :]) ** 2).sum(axis=1)
    return distancias.argmin(axis=1)


def atualizar(X, rotulos, C):
    X = np.asarray(X, dtype=float)
    novos = np.array(C, dtype=float)
    for j in range(len(novos)):
        membros = X[rotulos == j]
        if len(membros) > 0:
            novos[j] = membros.mean(axis=0)
    return novos
```
```python name="cluster vazio vira nan"
import numpy as np


def atribuir(X, C):
    X = np.asarray(X, dtype=float)
    C = np.asarray(C, dtype=float)
    distancias = ((X[:, None, :] - C[None, :, :]) ** 2).sum(axis=2)
    return distancias.argmin(axis=1)


def atualizar(X, rotulos, C):
    X = np.asarray(X, dtype=float)
    novos = np.array(C, dtype=float)
    for j in range(len(novos)):
        membros = X[rotulos == j]
        if len(membros) >= 0:
            novos[j] = membros.mean(axis=0)
    return novos
```
```python name="soma no lugar da média"
import numpy as np


def atribuir(X, C):
    X = np.asarray(X, dtype=float)
    C = np.asarray(C, dtype=float)
    distancias = ((X[:, None, :] - C[None, :, :]) ** 2).sum(axis=2)
    return distancias.argmin(axis=1)


def atualizar(X, rotulos, C):
    X = np.asarray(X, dtype=float)
    novos = np.array(C, dtype=float)
    for j in range(len(novos)):
        membros = X[rotulos == j]
        if len(membros) > 0:
            novos[j] = membros.sum(axis=0)
    return novos
```
```python name="altera os centróides recebidos"
import numpy as np


def atribuir(X, C):
    X = np.asarray(X, dtype=float)
    C = np.asarray(C, dtype=float)
    distancias = ((X[:, None, :] - C[None, :, :]) ** 2).sum(axis=2)
    return distancias.argmin(axis=1)


def atualizar(X, rotulos, C):
    X = np.asarray(X, dtype=float)
    novos = np.asarray(C, dtype=float)
    for j in range(len(novos)):
        membros = X[rotulos == j]
        if len(membros) > 0:
            novos[j] = membros.mean(axis=0)
    return novos
```
```python name="membros dos outros grupos"
import numpy as np


def atribuir(X, C):
    X = np.asarray(X, dtype=float)
    C = np.asarray(C, dtype=float)
    distancias = ((X[:, None, :] - C[None, :, :]) ** 2).sum(axis=2)
    return distancias.argmin(axis=1)


def atualizar(X, rotulos, C):
    X = np.asarray(X, dtype=float)
    novos = np.array(C, dtype=float)
    for j in range(len(novos)):
        membros = X[rotulos != j]
        if len(membros) > 0:
            novos[j] = membros.mean(axis=0)
    return novos
```

## Passo 4 · Leitura · k-means++ e n_init

O algoritmo de Lloyd só desce: cada passo diminui a inércia ou a mantém. Ele para no primeiro ponto em que nenhum dos dois passos melhora nada, que pode ser um **mínimo local**: dois centróides disputando a mesma nuvem enquanto outro centróide cobre duas nuvens sozinho. Onde ele para depende de onde começou.

Num conjunto fictício com seis nuvens (50 pontos cada) dispostas numa grade, rodando `KMeans(6, n_init=1)` com 20 sementes diferentes:

| inicialização | menor inércia | maior inércia | sementes que chegam ao mínimo |
|---|---|---|---|
| `init="random"`, `n_init=1` | 360,8 | 929,6 | 8 de 20 |
| `init="k-means++"`, `n_init=1` | 360,8 | 921,3 | 10 de 20 |
| `init="random"`, `n_init=10` | 360,8 | 360,8 | 20 de 20 |

A inicialização `"random"` sorteia $k$ pontos do conjunto como centróides, e às vezes sorteia dois na mesma nuvem. O **k-means++** espalha os centróides iniciais: o primeiro é um ponto sorteado, e cada um dos seguintes é sorteado com probabilidade proporcional ao **quadrado** da distância $D(x)$ do ponto ao centróide já escolhido mais próximo:

$$
P(x_i) = \frac{D(x_i)^2}{\sum_{j=1}^{n} D(x_j)^2}
$$

Pontos longe de tudo o que já foi escolhido têm muito mais chance, e um ponto que coincide com um centróide escolhido tem chance zero. Mesmo assim, a tabela mostra que uma inicialização só não basta. A defesa que funciona é **reiniciar**: `n_init` roda o algoritmo inteiro várias vezes, com inicializações diferentes, e fica com a de menor inércia. No scikit-learn 1.8, o padrão é `init="k-means++"` com `n_init="auto"`, que faz **uma** execução só (e 10 com `init="random"`); para conjuntos com mínimos locais, peça `n_init=10` explicitamente.

```python
modelo = KMeans(n_clusters=6, n_init=10, random_state=0).fit(X)
modelo.inertia_      # a menor das 10 execuções
modelo.n_iter_       # iterações da execução escolhida
```

Sem `random_state`, cada `fit` sorteia outras inicializações e pode devolver outra partição, ou a mesma com os grupos numerados em outra ordem. Para comparar duas partições, use o `adjusted_rand_score` da Previsão, que ignora a numeração, e nunca `labels_ == outros_labels`.

## Passo 5 · Exercício · k-means do zero

Escreva a inicialização k-means++ e o k-means completo, sem o `KMeans` do scikit-learn. O arquivo `nuvens.py` gera as nuvens fictícias dos casos.

### Instruções
1. `inicializar_mais_mais(X, k, semente)` cria `rng = np.random.default_rng(semente)`, sorteia o primeiro índice com `rng.integers(n)` e cada um dos seguintes com `rng.choice(n, p=...)`, a probabilidade proporcional ao quadrado da distância de cada ponto ao centróide já escolhido mais próximo. Devolve a matriz $k \times d$ com as linhas escolhidas de `X`, na ordem do sorteio.
2. `kmeans(X, k, semente, max_iter=100, tol=1e-6)` começa dos centróides de `inicializar_mais_mais` e repete atribuir e atualizar (grupo vazio mantém o centróide); para quando a maior mudança absoluta de uma coordenada dos centróides não passa de `tol`, ou depois de `max_iter` atualizações.
3. Devolve a tupla `(C, rotulos, inercia)`, com os rótulos e a inércia (soma das distâncias ao quadrado, como `float`) calculados com os centróides finais.

### Código inicial
```python
import numpy as np


def inicializar_mais_mais(X, k, semente):
    pass


def kmeans(X, k, semente, max_iter=100, tol=1e-6):
    pass
```
```text path=nuvens.py
import numpy as np


def gerar_nuvens(n_por_grupo, centros, desvio, semente):
    rng = np.random.default_rng(semente)
    centros = np.asarray(centros, dtype=float)
    X = np.vstack([rng.normal(c, desvio, size=(n_por_grupo, centros.shape[1])) for c in centros])
    grupos = np.repeat(np.arange(len(centros)), n_por_grupo)
    ordem = rng.permutation(len(X))
    return X[ordem].round(3), grupos[ordem]
```

### Solução
```python
import numpy as np


def inicializar_mais_mais(X, k, semente):
    X = np.asarray(X, dtype=float)
    rng = np.random.default_rng(semente)
    escolhidos = [int(rng.integers(len(X)))]
    for _ in range(k - 1):
        C = X[escolhidos]
        d2 = ((X[:, None, :] - C[None, :, :]) ** 2).sum(axis=2).min(axis=1)
        escolhidos.append(int(rng.choice(len(X), p=d2 / d2.sum())))
    return X[escolhidos].copy()


def kmeans(X, k, semente, max_iter=100, tol=1e-6):
    X = np.asarray(X, dtype=float)
    C = inicializar_mais_mais(X, k, semente)
    for _ in range(max_iter):
        rotulos = ((X[:, None, :] - C[None, :, :]) ** 2).sum(axis=2).argmin(axis=1)
        novos = C.copy()
        for j in range(k):
            if np.any(rotulos == j):
                novos[j] = X[rotulos == j].mean(axis=0)
        mudanca = np.abs(novos - C).max()
        C = novos
        if mudanca <= tol:
            break
    distancias = ((X[:, None, :] - C[None, :, :]) ** 2).sum(axis=2)
    rotulos = distancias.argmin(axis=1)
    inercia = float(distancias.min(axis=1).sum())
    return C, rotulos, inercia
```
```text path=nuvens.py
import numpy as np


def gerar_nuvens(n_por_grupo, centros, desvio, semente):
    rng = np.random.default_rng(semente)
    centros = np.asarray(centros, dtype=float)
    X = np.vstack([rng.normal(c, desvio, size=(n_por_grupo, centros.shape[1])) for c in centros])
    grupos = np.repeat(np.arange(len(centros)), n_por_grupo)
    ordem = rng.permutation(len(X))
    return X[ordem].round(3), grupos[ordem]
```

### Dicas
1. A cada centróide novo, a distância ao quadrado de cada ponto ao centróide escolhido mais próximo é o mínimo, ao longo do eixo dos centróides, da matriz de distâncias do passo 3.
2. Guarde os centróides antigos antes de atualizar; a mudança é `np.abs(novos - antigos).max()`.
3. Depois do laço, atribua de novo os pontos aos centróides finais antes de calcular a inércia.

### Verificação
```json
[
  {"id": "init-indices", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nX = np.arange(20, dtype=float).reshape(10, 2) ** 1.5\nC = inicializar_mais_mais(X, 3, 0)", "expr": "C.round(6).tolist()", "expected": [[64.0, 70.092796], [2.828427, 5.196152], [14.696938, 18.520259]], "tolerance": 1e-09, "name": "Dez pontos, k = 3, semente 0: os centróides iniciais sorteados", "hint": "Sorteie o primeiro com rng.integers(n); cada seguinte com rng.choice(n, p=...), probabilidade proporcional ao QUADRADO da distância ao centróide escolhido mais próximo."},
  {"id": "init-outra", "checkpoint": 1, "kind": "expr", "setup": "from nuvens import gerar_nuvens\nX, g = gerar_nuvens(10, [[0, 0], [6, 0], [0, 6], [6, 6]], 1.0, 2)\nC = inicializar_mais_mais(X, 4, 7)", "expr": "C.round(6).tolist()", "expected": [[6.211, 0.284], [0.243, 7.801], [7.199, 6.074], [5.258, 6.478]], "tolerance": 1e-09, "name": "Quatro nuvens, semente 7: os quatro centróides iniciais"},
  {"id": "init-distintos", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nX = np.array([[0.0, 0.0], [0.0, 0.0], [5.0, 5.0]])\nC = inicializar_mais_mais(X, 2, 3)", "expr": "sorted(C.tolist())", "expected": [[0.0, 0.0], [5.0, 5.0]], "name": "Um ponto repetido nunca é escolhido de novo: a distância dele ao centróide já escolhido é zero"},
  {"id": "ari-um", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.cluster import KMeans\nfrom sklearn.metrics import adjusted_rand_score\nfrom nuvens import gerar_nuvens\nX, g = gerar_nuvens(50, [[0, 0], [6, 0], [0, 6], [6, 6]], 1.0, 1)\nref = KMeans(4, random_state=0).fit(X)\nC, r, j = kmeans(X, 4, 0)\n", "expr": "adjusted_rand_score(r, ref.labels_)", "expected": 1.0, "tolerance": 1e-09, "name": "Quatro nuvens separadas: a mesma partição de KMeans(4, random_state=0), a menos dos nomes", "hint": "Compara-se a partição pelo ARI, que ignora a numeração dos grupos. Confira a atribuição pelo centróide mais próximo e a média de cada grupo."},
  {"id": "inercia", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.cluster import KMeans\nfrom sklearn.metrics import adjusted_rand_score\nfrom nuvens import gerar_nuvens\nX, g = gerar_nuvens(50, [[0, 0], [6, 0], [0, 6], [6, 6]], 1.0, 1)\nref = KMeans(4, random_state=0).fit(X)\nC, r, j = kmeans(X, 4, 0)\n", "expr": "abs(j - ref.inertia_) < 1e-6", "expected": true, "name": "A inércia é a do KMeans: soma das distâncias AO QUADRADO de cada ponto ao seu centróide", "hint": "Compara-se com ref.inertia_ a 1e-6. A inércia soma os quadrados das distâncias, sem tirar a raiz."},
  {"id": "centroides", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.cluster import KMeans\nfrom sklearn.metrics import adjusted_rand_score\nfrom nuvens import gerar_nuvens\nX, g = gerar_nuvens(50, [[0, 0], [6, 0], [0, 6], [6, 6]], 1.0, 1)\nref = KMeans(4, random_state=0).fit(X)\nC, r, j = kmeans(X, 4, 0)\n", "expr": "sorted(map(tuple, C.round(6).tolist())) == sorted(map(tuple, ref.cluster_centers_.round(6).tolist()))", "expected": true, "name": "Os centróides são os do KMeans, em alguma ordem"},
  {"id": "um-grupo", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nX = np.array([[0.0, 0.0], [2.0, 0.0], [4.0, 3.0]])\nC, r, j = kmeans(X, 1, 0)", "expr": "[C.round(9).tolist(), r.tolist(), round(j, 9)]", "expected": [[[2.0, 1.0]], [0, 0, 0], 14.0], "name": "Com k = 1, o centróide é a média, e a inércia é a soma dos quadrados em volta dela"},
  {"id": "para-pela-mudanca", "checkpoint": 2, "kind": "expr", "setup": "from nuvens import gerar_nuvens\nX, g = gerar_nuvens(30, [[0, 0], [6, 0], [0, 6], [6, 6]], 1.5, 3)\na = kmeans(X, 4, 5, max_iter=100, tol=1e9)\nb = kmeans(X, 4, 5, max_iter=1, tol=0.0)", "expr": "[a[0].round(9).tolist() == b[0].round(9).tolist(), round(a[2], 6) == round(b[2], 6)]", "expected": [true, true], "name": "Com tol enorme, o laço para depois da primeira atualização (o mesmo que max_iter=1)", "hint": "Depois de cada atualização, compare os centróides novos com os antigos e saia do laço se a maior mudança não passar de tol."},
  {"id": "coerente", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom nuvens import gerar_nuvens\nX, g = gerar_nuvens(30, [[0, 0], [6, 0], [0, 6], [6, 6]], 1.5, 3)\nC, r, j = kmeans(X, 4, 5, max_iter=1)\nd = ((X[:, None, :] - C[None, :, :]) ** 2).sum(axis=2)", "expr": "[r.tolist() == d.argmin(axis=1).tolist(), bool(abs(j - d.min(axis=1).sum()) < 1e-9)]", "expected": [true, true], "name": "Mesmo parando cedo (max_iter=1), os rótulos e a inércia devolvidos correspondem aos centróides devolvidos", "hint": "Depois do laço, atribua os pontos aos centróides finais e calcule a inércia com eles."},
  {"id": "reprodutivel", "checkpoint": 2, "kind": "expr", "setup": "from nuvens import gerar_nuvens\nX, g = gerar_nuvens(30, [[0, 0], [6, 0], [0, 6], [6, 6]], 2.0, 4)\n", "expr": "[kmeans(X, 4, s)[2] == kmeans(X, 4, s)[2] for s in range(5)]", "expected": [true, true, true, true, true], "name": "A mesma semente dá o mesmo resultado", "hint": "Todo sorteio sai do default_rng(semente)."},
  {"id": "tipos", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.cluster import KMeans\nfrom sklearn.metrics import adjusted_rand_score\nfrom nuvens import gerar_nuvens\nX, g = gerar_nuvens(50, [[0, 0], [6, 0], [0, 6], [6, 6]], 1.0, 1)\nref = KMeans(4, random_state=0).fit(X)\nC, r, j = kmeans(X, 4, 0)\n", "expr": "[type(C).__name__, list(C.shape), list(r.shape), type(j).__name__]", "expected": ["ndarray", [4, 2], [200], "float"], "name": "Devolve (C, rotulos, inercia): centróides k × d, um rótulo por linha e a inércia como float"},
  {"id": "sem-kmeans", "checkpoint": 2, "kind": "source", "rule": {"type": "not_calls", "name": "KMeans"}, "name": "Implementa sem o KMeans do scikit-learn"}
]
```

### Soluções erradas
```python name="distância sem o quadrado no sorteio"
import numpy as np


def inicializar_mais_mais(X, k, semente):
    X = np.asarray(X, dtype=float)
    rng = np.random.default_rng(semente)
    escolhidos = [int(rng.integers(len(X)))]
    for _ in range(k - 1):
        C = X[escolhidos]
        d2 = ((X[:, None, :] - C[None, :, :]) ** 2).sum(axis=2).min(axis=1)
        escolhidos.append(int(rng.choice(len(X), p=np.sqrt(d2) / np.sqrt(d2).sum())))
    return X[escolhidos].copy()


def kmeans(X, k, semente, max_iter=100, tol=1e-6):
    X = np.asarray(X, dtype=float)
    C = inicializar_mais_mais(X, k, semente)
    for _ in range(max_iter):
        rotulos = ((X[:, None, :] - C[None, :, :]) ** 2).sum(axis=2).argmin(axis=1)
        novos = C.copy()
        for j in range(k):
            if np.any(rotulos == j):
                novos[j] = X[rotulos == j].mean(axis=0)
        mudanca = np.abs(novos - C).max()
        C = novos
        if mudanca <= tol:
            break
    distancias = ((X[:, None, :] - C[None, :, :]) ** 2).sum(axis=2)
    rotulos = distancias.argmin(axis=1)
    inercia = float(distancias.min(axis=1).sum())
    return C, rotulos, inercia
```
```python name="distância só ao último centróide"
import numpy as np


def inicializar_mais_mais(X, k, semente):
    X = np.asarray(X, dtype=float)
    rng = np.random.default_rng(semente)
    escolhidos = [int(rng.integers(len(X)))]
    for _ in range(k - 1):
        C = X[escolhidos[-1:]]
        d2 = ((X[:, None, :] - C[None, :, :]) ** 2).sum(axis=2).min(axis=1)
        escolhidos.append(int(rng.choice(len(X), p=d2 / d2.sum())))
    return X[escolhidos].copy()


def kmeans(X, k, semente, max_iter=100, tol=1e-6):
    X = np.asarray(X, dtype=float)
    C = inicializar_mais_mais(X, k, semente)
    for _ in range(max_iter):
        rotulos = ((X[:, None, :] - C[None, :, :]) ** 2).sum(axis=2).argmin(axis=1)
        novos = C.copy()
        for j in range(k):
            if np.any(rotulos == j):
                novos[j] = X[rotulos == j].mean(axis=0)
        mudanca = np.abs(novos - C).max()
        C = novos
        if mudanca <= tol:
            break
    distancias = ((X[:, None, :] - C[None, :, :]) ** 2).sum(axis=2)
    rotulos = distancias.argmin(axis=1)
    inercia = float(distancias.min(axis=1).sum())
    return C, rotulos, inercia
```
```python name="gerador sem semente"
import numpy as np


def inicializar_mais_mais(X, k, semente):
    X = np.asarray(X, dtype=float)
    rng = np.random.default_rng()
    escolhidos = [int(rng.integers(len(X)))]
    for _ in range(k - 1):
        C = X[escolhidos]
        d2 = ((X[:, None, :] - C[None, :, :]) ** 2).sum(axis=2).min(axis=1)
        escolhidos.append(int(rng.choice(len(X), p=d2 / d2.sum())))
    return X[escolhidos].copy()


def kmeans(X, k, semente, max_iter=100, tol=1e-6):
    X = np.asarray(X, dtype=float)
    C = inicializar_mais_mais(X, k, semente)
    for _ in range(max_iter):
        rotulos = ((X[:, None, :] - C[None, :, :]) ** 2).sum(axis=2).argmin(axis=1)
        novos = C.copy()
        for j in range(k):
            if np.any(rotulos == j):
                novos[j] = X[rotulos == j].mean(axis=0)
        mudanca = np.abs(novos - C).max()
        C = novos
        if mudanca <= tol:
            break
    distancias = ((X[:, None, :] - C[None, :, :]) ** 2).sum(axis=2)
    rotulos = distancias.argmin(axis=1)
    inercia = float(distancias.min(axis=1).sum())
    return C, rotulos, inercia
```
```python name="número fixo de iterações"
import numpy as np


def inicializar_mais_mais(X, k, semente):
    X = np.asarray(X, dtype=float)
    rng = np.random.default_rng(semente)
    escolhidos = [int(rng.integers(len(X)))]
    for _ in range(k - 1):
        C = X[escolhidos]
        d2 = ((X[:, None, :] - C[None, :, :]) ** 2).sum(axis=2).min(axis=1)
        escolhidos.append(int(rng.choice(len(X), p=d2 / d2.sum())))
    return X[escolhidos].copy()


def kmeans(X, k, semente, max_iter=100, tol=1e-6):
    X = np.asarray(X, dtype=float)
    C = inicializar_mais_mais(X, k, semente)
    for _ in range(max_iter):
        rotulos = ((X[:, None, :] - C[None, :, :]) ** 2).sum(axis=2).argmin(axis=1)
        novos = C.copy()
        for j in range(k):
            if np.any(rotulos == j):
                novos[j] = X[rotulos == j].mean(axis=0)
        mudanca = np.abs(novos - C).max()
        C = novos
    distancias = ((X[:, None, :] - C[None, :, :]) ** 2).sum(axis=2)
    rotulos = distancias.argmin(axis=1)
    inercia = float(distancias.min(axis=1).sum())
    return C, rotulos, inercia
```
```python name="inércia sem o quadrado"
import numpy as np


def inicializar_mais_mais(X, k, semente):
    X = np.asarray(X, dtype=float)
    rng = np.random.default_rng(semente)
    escolhidos = [int(rng.integers(len(X)))]
    for _ in range(k - 1):
        C = X[escolhidos]
        d2 = ((X[:, None, :] - C[None, :, :]) ** 2).sum(axis=2).min(axis=1)
        escolhidos.append(int(rng.choice(len(X), p=d2 / d2.sum())))
    return X[escolhidos].copy()


def kmeans(X, k, semente, max_iter=100, tol=1e-6):
    X = np.asarray(X, dtype=float)
    C = inicializar_mais_mais(X, k, semente)
    for _ in range(max_iter):
        rotulos = ((X[:, None, :] - C[None, :, :]) ** 2).sum(axis=2).argmin(axis=1)
        novos = C.copy()
        for j in range(k):
            if np.any(rotulos == j):
                novos[j] = X[rotulos == j].mean(axis=0)
        mudanca = np.abs(novos - C).max()
        C = novos
        if mudanca <= tol:
            break
    distancias = ((X[:, None, :] - C[None, :, :]) ** 2).sum(axis=2)
    rotulos = distancias.argmin(axis=1)
    inercia = float(np.sqrt(distancias.min(axis=1)).sum())
    return C, rotulos, inercia
```
```python name="rótulos de antes da última atualização"
import numpy as np


def inicializar_mais_mais(X, k, semente):
    X = np.asarray(X, dtype=float)
    rng = np.random.default_rng(semente)
    escolhidos = [int(rng.integers(len(X)))]
    for _ in range(k - 1):
        C = X[escolhidos]
        d2 = ((X[:, None, :] - C[None, :, :]) ** 2).sum(axis=2).min(axis=1)
        escolhidos.append(int(rng.choice(len(X), p=d2 / d2.sum())))
    return X[escolhidos].copy()


def kmeans(X, k, semente, max_iter=100, tol=1e-6):
    X = np.asarray(X, dtype=float)
    C = inicializar_mais_mais(X, k, semente)
    for _ in range(max_iter):
        rotulos = ((X[:, None, :] - C[None, :, :]) ** 2).sum(axis=2).argmin(axis=1)
        novos = C.copy()
        for j in range(k):
            if np.any(rotulos == j):
                novos[j] = X[rotulos == j].mean(axis=0)
        mudanca = np.abs(novos - C).max()
        C = novos
        if mudanca <= tol:
            break
    distancias = ((X[:, None, :] - C[None, :, :]) ** 2).sum(axis=2)
    inercia = float(distancias.min(axis=1).sum())
    return C, rotulos, inercia
```

## Passo 6 · Leitura · Escolher k e aplicações

O k-means precisa de $k$, e a inércia não serve para escolher: ela **sempre** cai quando $k$ cresce, até zero com um grupo por ponto. Nas quatro nuvens fictícias dos casos (160 pontos), com `n_init=10`:

| $k$ | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| inércia | 3 106,3 | 1 709,9 | 977,1 | 317,5 | 280,9 | 252,0 | 220,7 | 196,8 |
| silhueta | — | 0,450 | 0,518 | 0,665 | 0,577 | 0,500 | 0,513 | 0,347 |

O **cotovelo** é o $k$ depois do qual a inércia passa a cair devagar: de 3 para 4 ela cai 660; de 4 para 5, só 37. Ler o cotovelo é subjetivo, e muitas curvas não têm um. A **silhueta** dá um número: para cada ponto, $a_i$ é a distância média aos outros pontos do seu grupo e $b_i$ a distância média aos pontos do grupo vizinho mais próximo, e

$$
s_i = \frac{b_i - a_i}{\max(a_i, b_i)}
$$

Perto de 1, o ponto está bem dentro do seu grupo; perto de 0, na fronteira; negativo, provavelmente no grupo errado. O `silhouette_score(X, rotulos)` é a média dos $s_i$, e o maior valor aponta $k = 4$. Ela não existe para $k = 1$: `ValueError: Number of labels is 1. Valid values are 2 to n_samples - 1 (inclusive)`.

Duas aplicações. Na **segmentação**, uma loja fictícia descreve cada cliente por recência (dias), frequência (compras por ano) e valor gasto (R\$). Sem padronizar, o valor, na casa dos milhares, decide sozinho as distâncias, e a partição não tem nada a ver com os três perfis que geraram os dados (ARI de 0,008); com `StandardScaler` antes, o ARI vai a 1,0. Na **quantização de cores**, cada pixel de uma imagem é um ponto (R, G, B), e trocar cada pixel pelo centróide do seu grupo reduz a imagem a $k$ cores.

O k-means supõe grupos redondos e de tamanho parecido, porque atribui pela distância ao centro. Em dois anéis concêntricos, ele corta o plano ao meio (ARI de 0,012). A próxima lição trata dessas formas.

## Passo 7 · Exercício · Silhueta e cores

Escolha $k$ pela silhueta e reduza as cores de uma imagem sintética.

### Instruções
1. `escolher_k_silhueta(X, ks, semente)` ajusta `KMeans(k, n_init=10, random_state=semente)` para cada `k` da lista (todos maiores que 1), calcula o `silhouette_score` com os rótulos e devolve o `k` de maior silhueta; num empate, fica o primeiro.
2. `quantizar_cores(imagem, k, semente)` recebe uma imagem de forma (altura, largura, 3), com valores entre 0 e 1, agrupa os pixels com `KMeans(k, n_init=4, random_state=semente)` e devolve um array de mesma forma em que cada pixel virou a cor do centróide do seu grupo; a imagem recebida não muda.

### Código inicial
```python
import numpy as np
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score


def escolher_k_silhueta(X, ks, semente):
    pass


def quantizar_cores(imagem, k, semente):
    pass
```
```text path=nuvens.py
import numpy as np


def gerar_nuvens(n_por_grupo, centros, desvio, semente):
    rng = np.random.default_rng(semente)
    centros = np.asarray(centros, dtype=float)
    X = np.vstack([rng.normal(c, desvio, size=(n_por_grupo, centros.shape[1])) for c in centros])
    grupos = np.repeat(np.arange(len(centros)), n_por_grupo)
    ordem = rng.permutation(len(X))
    return X[ordem].round(3), grupos[ordem]
```

### Solução
```python
import numpy as np
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score


def escolher_k_silhueta(X, ks, semente):
    melhor_k, melhor_s = None, -np.inf
    for k in ks:
        rotulos = KMeans(k, n_init=10, random_state=semente).fit_predict(X)
        s = silhouette_score(X, rotulos)
        if s > melhor_s:
            melhor_k, melhor_s = k, s
    return melhor_k


def quantizar_cores(imagem, k, semente):
    imagem = np.asarray(imagem, dtype=float)
    pixels = imagem.reshape(-1, 3)
    modelo = KMeans(k, n_init=4, random_state=semente).fit(pixels)
    return modelo.cluster_centers_[modelo.labels_].reshape(imagem.shape)
```
```text path=nuvens.py
import numpy as np


def gerar_nuvens(n_por_grupo, centros, desvio, semente):
    rng = np.random.default_rng(semente)
    centros = np.asarray(centros, dtype=float)
    X = np.vstack([rng.normal(c, desvio, size=(n_por_grupo, centros.shape[1])) for c in centros])
    grupos = np.repeat(np.arange(len(centros)), n_por_grupo)
    ordem = rng.permutation(len(X))
    return X[ordem].round(3), grupos[ordem]
```

### Dicas
1. O `fit_predict` ajusta e devolve os rótulos numa chamada só.
2. Uma imagem $h \times w \times 3$ vira uma tabela de $h \cdot w$ pixels com 3 colunas por `reshape(-1, 3)`.
3. `cluster_centers_[labels_]` dá a cor de cada pixel; o `reshape(imagem.shape)` devolve a forma original.

### Verificação
```json
[
  {"id": "k-quatro", "checkpoint": 1, "kind": "expr", "setup": "from nuvens import gerar_nuvens\nX, g = gerar_nuvens(40, [[0, 0], [6, 0], [0, 6], [6, 6]], 1.0, 0)", "expr": "escolher_k_silhueta(X, [2, 3, 4, 5, 6, 7], 0)", "expected": 4, "name": "Quatro nuvens, k de 2 a 7: a maior silhueta é a de k = 4", "hint": "Para cada k: KMeans(k, n_init=10, random_state=semente), silhouette_score com os rótulos, e fica o k de maior silhueta. A inércia sempre cai com k e não serve para escolher."},
  {"id": "k-tres", "checkpoint": 1, "kind": "expr", "setup": "from nuvens import gerar_nuvens\nX, g = gerar_nuvens(40, [[0, 0], [8, 0], [4, 7]], 1.2, 5)", "expr": "escolher_k_silhueta(X, [2, 3, 4, 5, 6], 1)", "expected": 3, "name": "Três nuvens, k de 2 a 6: k = 3"},
  {"id": "k-da-lista", "checkpoint": 1, "kind": "expr", "setup": "from nuvens import gerar_nuvens\nX, g = gerar_nuvens(40, [[0, 0], [6, 0], [0, 6], [6, 6]], 1.0, 0)", "expr": "escolher_k_silhueta(X, [3, 4], 0)", "expected": 4, "name": "Devolve o valor de k, não a posição dele na lista", "hint": "Guarde o próprio k da melhor silhueta."},
  {"id": "img-forma", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nrng = np.random.default_rng(0)\nbase = np.array([[0.9, 0.1, 0.1], [0.1, 0.8, 0.2], [0.2, 0.2, 0.9], [0.95, 0.9, 0.2]])\nimagem = (base[rng.integers(0, 4, size=(12, 10))] + rng.normal(0, 0.03, size=(12, 10, 3))).clip(0, 1)\nq = quantizar_cores(imagem, 4, 0)", "expr": "[type(q).__name__, list(q.shape)]", "expected": ["ndarray", [12, 10, 3]], "name": "A imagem quantizada tem a mesma forma (altura, largura, 3)", "hint": "Achate em uma linha por pixel com reshape(-1, 3), troque cada pixel pela cor do seu centróide e volte à forma original."},
  {"id": "img-cores", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nrng = np.random.default_rng(0)\nbase = np.array([[0.9, 0.1, 0.1], [0.1, 0.8, 0.2], [0.2, 0.2, 0.9], [0.95, 0.9, 0.2]])\nimagem = (base[rng.integers(0, 4, size=(12, 10))] + rng.normal(0, 0.03, size=(12, 10, 3))).clip(0, 1)\nq = quantizar_cores(imagem, 4, 0)", "expr": "len(np.unique(q.reshape(-1, 3), axis=0))", "expected": 4, "name": "Com k = 4, a imagem quantizada tem exatamente 4 cores distintas", "hint": "Cada pixel vira uma linha de 3 números (R, G, B); o k-means agrupa as linhas, e não cada número sozinho."},
  {"id": "img-kmeans", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nrng = np.random.default_rng(0)\nbase = np.array([[0.9, 0.1, 0.1], [0.1, 0.8, 0.2], [0.2, 0.2, 0.9], [0.95, 0.9, 0.2]])\nimagem = (base[rng.integers(0, 4, size=(12, 10))] + rng.normal(0, 0.03, size=(12, 10, 3))).clip(0, 1)\nq = quantizar_cores(imagem, 4, 0)\nfrom sklearn.cluster import KMeans\nref = KMeans(4, n_init=4, random_state=0).fit(imagem.reshape(-1, 3))", "expr": "bool(np.allclose(q, ref.cluster_centers_[ref.labels_].reshape(imagem.shape)))", "expected": true, "name": "Cada pixel recebe a cor do centróide do seu grupo, como no KMeans(k, n_init=4, random_state=semente)", "hint": "Indexe cluster_centers_ pelos labels_ para ter uma cor por pixel."},
  {"id": "img-perto", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nrng = np.random.default_rng(0)\nbase = np.array([[0.9, 0.1, 0.1], [0.1, 0.8, 0.2], [0.2, 0.2, 0.9], [0.95, 0.9, 0.2]])\nimagem = (base[rng.integers(0, 4, size=(12, 10))] + rng.normal(0, 0.03, size=(12, 10, 3))).clip(0, 1)\nq = quantizar_cores(imagem, 4, 0)", "expr": "bool(np.abs(q - imagem).max() < 0.15)", "expected": true, "name": "Nenhum pixel muda mais que 0.15 em nenhum canal"},
  {"id": "img-intacta", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nrng = np.random.default_rng(0)\nbase = np.array([[0.9, 0.1, 0.1], [0.1, 0.8, 0.2], [0.2, 0.2, 0.9], [0.95, 0.9, 0.2]])\nimagem = (base[rng.integers(0, 4, size=(12, 10))] + rng.normal(0, 0.03, size=(12, 10, 3))).clip(0, 1)\nq = quantizar_cores(imagem, 4, 0)\nantes = imagem.copy()\nq2 = quantizar_cores(imagem, 2, 1)", "expr": "bool((imagem == antes).all())", "expected": true, "name": "A imagem recebida não muda"}
]
```

### Soluções erradas
```python name="k escolhido pela menor inércia"
import numpy as np
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score


def escolher_k_silhueta(X, ks, semente):
    melhor_k, melhor_s = None, -np.inf
    for k in ks:
        rotulos = KMeans(k, n_init=10, random_state=semente).fit_predict(X)
        s = -KMeans(k, n_init=10, random_state=semente).fit(X).inertia_
        if s > melhor_s:
            melhor_k, melhor_s = k, s
    return melhor_k


def quantizar_cores(imagem, k, semente):
    imagem = np.asarray(imagem, dtype=float)
    pixels = imagem.reshape(-1, 3)
    modelo = KMeans(k, n_init=4, random_state=semente).fit(pixels)
    return modelo.cluster_centers_[modelo.labels_].reshape(imagem.shape)
```
```python name="devolve a posição na lista"
import numpy as np
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score


def escolher_k_silhueta(X, ks, semente):
    melhor_k, melhor_s = None, -np.inf
    for k in ks:
        rotulos = KMeans(k, n_init=10, random_state=semente).fit_predict(X)
        s = silhouette_score(X, rotulos)
        if s > melhor_s:
            melhor_k, melhor_s = ks.index(k), s
    return melhor_k


def quantizar_cores(imagem, k, semente):
    imagem = np.asarray(imagem, dtype=float)
    pixels = imagem.reshape(-1, 3)
    modelo = KMeans(k, n_init=4, random_state=semente).fit(pixels)
    return modelo.cluster_centers_[modelo.labels_].reshape(imagem.shape)
```
```python name="pixels achatados sem separar os canais"
import numpy as np
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score


def escolher_k_silhueta(X, ks, semente):
    melhor_k, melhor_s = None, -np.inf
    for k in ks:
        rotulos = KMeans(k, n_init=10, random_state=semente).fit_predict(X)
        s = silhouette_score(X, rotulos)
        if s > melhor_s:
            melhor_k, melhor_s = k, s
    return melhor_k


def quantizar_cores(imagem, k, semente):
    imagem = np.asarray(imagem, dtype=float)
    pixels = imagem.reshape(-1, 1)
    modelo = KMeans(k, n_init=4, random_state=semente).fit(pixels)
    return modelo.cluster_centers_[modelo.labels_].reshape(imagem.shape)
```
```python name="devolve os rótulos no lugar das cores"
import numpy as np
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score


def escolher_k_silhueta(X, ks, semente):
    melhor_k, melhor_s = None, -np.inf
    for k in ks:
        rotulos = KMeans(k, n_init=10, random_state=semente).fit_predict(X)
        s = silhouette_score(X, rotulos)
        if s > melhor_s:
            melhor_k, melhor_s = k, s
    return melhor_k


def quantizar_cores(imagem, k, semente):
    imagem = np.asarray(imagem, dtype=float)
    pixels = imagem.reshape(-1, 3)
    modelo = KMeans(k, n_init=4, random_state=semente).fit(pixels)
    return modelo.labels_.reshape(imagem.shape[:2])
```
```python name="devolve os centróides sem indexar"
import numpy as np
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score


def escolher_k_silhueta(X, ks, semente):
    melhor_k, melhor_s = None, -np.inf
    for k in ks:
        rotulos = KMeans(k, n_init=10, random_state=semente).fit_predict(X)
        s = silhouette_score(X, rotulos)
        if s > melhor_s:
            melhor_k, melhor_s = k, s
    return melhor_k


def quantizar_cores(imagem, k, semente):
    imagem = np.asarray(imagem, dtype=float)
    pixels = imagem.reshape(-1, 3)
    modelo = KMeans(k, n_init=4, random_state=semente).fit(pixels)
    return modelo.cluster_centers_
```

## Passo 8 · Quiz · Mínimos locais

### Pergunta
Um colega roda `KMeans(4, n_init=10)` duas vezes, sem `random_state`, nos mesmos clientes. Os rótulos dos cinco primeiros saem `[3, 3, 0, 1, 2]` na primeira vez e `[1, 1, 2, 0, 3]` na segunda, e ele conclui que o modelo é instável. O que conferir?
- [ ] Nada: rótulos diferentes provam que as partições são diferentes
- [x] Se as partições são as mesmas a menos da numeração: `adjusted_rand_score` entre as duas execuções (1,0 se só os nomes mudaram) ou os centróides comparados como conjunto
- [ ] A acurácia `np.mean(rotulos1 == rotulos2)`, que deveria passar de 0,9
- [ ] Trocar para `n_init=1`, que sempre dá a mesma resposta
> Os números dos grupos são arbitrários: nos cinco clientes mostrados, a primeira execução chama de 3 o grupo que a segunda chama de 1, e assim por diante, uma troca consistente. A comparação posição a posição mede a coincidência de nomes, não de partições; o ARI compara as partições. Fixar `random_state` torna as execuções reproduzíveis; `n_init=1` só aumenta o risco de mínimo local.

### Pergunta
Para escolher o número de segmentos de clientes, uma analista calcula a inércia de $k = 2$ a $k = 15$ e escolhe $k = 15$, "o de menor inércia". O que está errado?
- [ ] Nada: menor inércia é sempre melhor
- [ ] Ela deveria ter escolhido $k = 2$, o de maior inércia, que é o mais simples
- [x] A inércia sempre cai quando $k$ cresce (chega a zero com um grupo por cliente); $k$ se escolhe pelo cotovelo, pela silhueta e pelo uso que o negócio fará dos grupos
- [ ] A inércia só pode ser comparada com o mesmo $k$; para comparar valores de $k$ é preciso o ARI
> Mais centróides sempre deixam os pontos mais perto de algum centróide, então a inércia mínima aponta o maior $k$ testado, sem nenhuma informação sobre a estrutura dos dados. O cotovelo procura onde a queda perde força, e a silhueta mede se os pontos estão bem dentro dos seus grupos. O ARI exige uma partição de referência, que no não supervisionado normalmente não existe.

### Pergunta
Em seis nuvens fictícias, `KMeans(6, init="random", n_init=1)` deu inércia 360,8 com uma semente e 929,6 com outra. O que explica a diferença e o que fazer?
- [ ] O algoritmo de Lloyd não convergiu na segunda semente: basta aumentar `max_iter`
- [x] A segunda execução parou num mínimo local (dois centróides numa nuvem, um centróide cobrindo duas); use o k-means++ e várias reinicializações (`n_init=10`), ficando com a de menor inércia
- [ ] A inércia depende da semente porque é calculada sobre uma amostra dos pontos
- [ ] Os dados precisam ser padronizados: com escala certa, toda inicialização chega ao mesmo mínimo
> O Lloyd converge sempre, mas para o mínimo mais próximo do ponto de partida: mais iterações não tiram a execução de lá. Com 10 reinicializações, todas as 20 sementes testadas chegaram a 360,8. A inércia usa todos os pontos, e as nuvens já estão na mesma escala.
