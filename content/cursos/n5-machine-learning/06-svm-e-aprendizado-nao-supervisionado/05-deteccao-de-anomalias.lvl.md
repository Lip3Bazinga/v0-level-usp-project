---
slug: n5-m6-05-deteccao-de-anomalias
titulo: Detecção de anomalias
descricao: Métodos baseados em distância, densidade (LOF), isolamento (IsolationForest) e reconstrução (PCA), com avaliação quando há poucos rótulos.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- scikit-learn
xp: 110
tempo_min: 45
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Aplicar z-score multivariado, LOF e IsolationForest e comparar suas detecções
- Usar o erro de reconstrução do PCA como pontuação de anomalia
- Avaliar detectores com poucos rótulos usando precisão em k e curva PR
---

## Passo 1 · Leitura · Anomalia, outlier, novidade

Um sistema de pagamentos fictício registra, para cada transação, o valor (R\$), a hora do dia e a distância (km) entre o endereço do cliente e o local da compra. Quase todas são compras comuns; umas poucas são fraudes, e quase nenhuma vem com rótulo. A **detecção de anomalias** inverte a pergunta: em vez de aprender como é a fraude, aprende como é o normal e aponta o que foge dele.

Três palavras aparecem misturadas. **Outlier** é um ponto que destoa do resto dos dados que você tem, inclusive no treino. **Novidade** é um ponto **novo**, chegado depois de um ajuste feito em dados limpos, que não se parece com eles. **Anomalia** é o termo geral. A diferença decide a ferramenta: o `LocalOutlierFactor` do scikit-learn tem um modo para cada caso, como mostra a Previsão.

O detector mais simples é um escore $z$ multivariado. Medir a distância euclidiana até a média não funciona quando as colunas têm escalas diferentes ou são correlacionadas: uma compra de R\$ 300 às 3 h da manhã pode estar perto da média em cada coluna sozinha e ser estranha na combinação. A **distância de Mahalanobis** desconta a escala e a correlação usando a covariância $\Sigma$ das colunas:

$$
d_M(x) = \sqrt{(x - \mu)^\top\, \Sigma^{-1}\, (x - \mu)}
$$

Com $\Sigma$ igual à identidade, ela vira a distância euclidiana; com colunas independentes, cada diferença é dividida pelo desvio da sua coluna, como no escore $z$. Na conta, nunca se calcula $\Sigma^{-1}$: resolve-se o sistema $\Sigma\, u = x - \mu$ com `np.linalg.solve`, como na equação normal do módulo 2. Se uma coluna é combinação exata das outras, $\Sigma$ é singular e a distância não existe; o `solve` não avisa: numa matriz com uma coluna igual a $0{,}3$ vezes a primeira mais $0{,}7$ vezes a segunda, ele devolveu números sem erro. Confira o posto antes (`np.linalg.matrix_rank`).

```python
media = X.mean(axis=0)
S = np.cov(X, rowvar=False)        # covariância das COLUNAS
D = X - media
d = np.sqrt((D * np.linalg.solve(S, D.T).T).sum(axis=1))
```

Mahalanobis supõe uma nuvem em forma de elipse: dados com vários grupos, ou com uma cauda longa como o valor das compras, pedem os detectores do passo 4.

## Passo 2 · Previsão · fit_predict e novidade no LOF

O programa usa o `LocalOutlierFactor` nos dois modos: primeiro para julgar os próprios pontos, depois para julgar pontos novos. Leia sem executar e digite o que ele imprime.

### Código
```python
import numpy as np
from sklearn.neighbors import LocalOutlierFactor

X = np.array([[0, 0], [0, 1], [1, 0], [1, 1], [0.5, 0.5], [6, 6]])
lof = LocalOutlierFactor(n_neighbors=3)
print(lof.fit_predict(X).tolist())
print(np.round(-lof.negative_outlier_factor_, 2).tolist())
nov = LocalOutlierFactor(n_neighbors=3, novelty=True).fit(X[:5])
print(nov.predict([[0.5, 0.4], [5, 5]]).tolist())
print(hasattr(lof, "predict"), hasattr(nov, "fit_predict"))
```

### Dicas
1. Os cinco primeiros pontos formam um quadrado com o centro; o ponto $(6, 6)$ está longe de todos. O `fit_predict` devolve 1 para normal e −1 para anomalia.
2. O fator de cada ponto, com o sinal desfeito, fica perto de 1 dentro do quadrado (0,97 nos quatro cantos e 1,11 no centro) e vale 8,1 no ponto $(6, 6)$.
3. Com `novelty=True`, o modelo ajustado só no quadrado julga pontos novos com `predict`; cada modo tem só os métodos que fazem sentido para ele.

### Saída esperada
```text
[1, 1, 1, 1, 1, -1]
[0.97, 0.97, 0.97, 0.97, 1.11, 8.1]
[1, -1]
False False
```

## Passo 3 · Exercício · Mahalanobis
modo: lacunas

Complete as lacunas (`___`) da distância de Mahalanobis de cada linha até a média. O arquivo `transacoes.py` gera as transações fictícias dos casos (colunas: valor em R\$, hora, distância em km; rótulo 1 nas anomalias inseridas).

### Instruções
1. A covariância é a das **colunas** de `X` (uma matriz $d \times d$).
2. Se o posto da covariância for menor que o número de colunas, levante `ValueError`: a matriz é singular e a distância não existe.
3. As diferenças são as linhas de `X` menos a média das colunas.
4. Em vez de inverter a covariância, resolva o sistema com `np.linalg.solve`; `mahalanobis(X)` devolve o array com a distância de cada linha (com a raiz).

### Código inicial
```python
import numpy as np


def mahalanobis(X):
    X = np.asarray(X, dtype=float)
    media = X.mean(axis=0)
    S = np.cov(X, rowvar=___)
    if np.linalg.matrix_rank(S) < ___:
        raise ValueError("covariância singular: há colunas redundantes")
    D = ___
    resolvido = np.linalg.solve(___, D.T).T
    return ___
```
```text path=transacoes.py
import numpy as np


def gerar_transacoes(n, n_anomalias, semente):
    rng = np.random.default_rng(semente)
    valor = rng.lognormal(4.0, 0.5, n)
    hora = rng.normal(14, 3, n).clip(0, 23.9)
    distancia = rng.gamma(2.0, 3.0, n)
    X = np.column_stack([valor, hora, distancia])
    rotulos = np.zeros(n, dtype=int)
    indices = rng.choice(n, n_anomalias, replace=False)
    X[indices, 0] = X[indices, 0] * rng.uniform(3, 10, n_anomalias)
    X[indices, 1] = rng.uniform(1, 5, n_anomalias)
    X[indices, 2] = X[indices, 2] + rng.uniform(10, 40, n_anomalias)
    rotulos[indices] = 1
    return X.round(2), rotulos
```

### Solução
```python
import numpy as np


def mahalanobis(X):
    X = np.asarray(X, dtype=float)
    media = X.mean(axis=0)
    S = np.cov(X, rowvar=False)
    if np.linalg.matrix_rank(S) < S.shape[0]:
        raise ValueError("covariância singular: há colunas redundantes")
    D = X - media
    resolvido = np.linalg.solve(S, D.T).T
    return np.sqrt((D * resolvido).sum(axis=1))
```
```text path=transacoes.py
import numpy as np


def gerar_transacoes(n, n_anomalias, semente):
    rng = np.random.default_rng(semente)
    valor = rng.lognormal(4.0, 0.5, n)
    hora = rng.normal(14, 3, n).clip(0, 23.9)
    distancia = rng.gamma(2.0, 3.0, n)
    X = np.column_stack([valor, hora, distancia])
    rotulos = np.zeros(n, dtype=int)
    indices = rng.choice(n, n_anomalias, replace=False)
    X[indices, 0] = X[indices, 0] * rng.uniform(3, 10, n_anomalias)
    X[indices, 1] = rng.uniform(1, 5, n_anomalias)
    X[indices, 2] = X[indices, 2] + rng.uniform(10, 40, n_anomalias)
    rotulos[indices] = 1
    return X.round(2), rotulos
```

### Dicas
1. O `np.cov` trata cada **linha** como uma variável, a não ser que receba `rowvar=False`.
2. `np.linalg.matrix_rank(S)` conta as direções independentes; com uma coluna redundante, ele fica abaixo de `S.shape[0]`.
3. `(D * resolvido).sum(axis=1)` é, linha a linha, o produto $(x - \mu)^\top \Sigma^{-1} (x - \mu)$: falta a raiz.

### Verificação
```json
[
  {"id": "igual-scipy", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom scipy.spatial.distance import mahalanobis as dist_scipy\nfrom transacoes import gerar_transacoes\nX, y = gerar_transacoes(200, 6, 0)\nVI = np.linalg.inv(np.cov(X, rowvar=False))\nref = np.array([dist_scipy(x, X.mean(axis=0), VI) for x in X])\nd = mahalanobis(X)\n", "expr": "bool(np.allclose(d, ref, atol=1e-8))", "expected": true, "name": "200 transações: as mesmas distâncias do scipy.spatial.distance.mahalanobis", "hint": "Compara-se com o mahalanobis do scipy usando a média e a inversa da covariância das colunas (np.cov com rowvar=False). Não esqueça a raiz."},
  {"id": "quatro-pontos", "checkpoint": 3, "kind": "expr", "setup": "d = mahalanobis([[0, 0], [2, 0], [0, 2], [2, 2]])", "expr": "[round(float(v), 9) for v in d]", "expected": [1.224744871, 1.224744871, 1.224744871, 1.224744871], "tolerance": 1e-09, "name": "Quatro cantos de um quadrado: todos à distância √1,5 do centro (variância 4/3 em cada coluna, sem correlação)", "hint": "Diferença até a média (1, 1) é (±1, ±1); com a covariância das colunas (4/3 na diagonal), d² = 3/4 + 3/4."},
  {"id": "escala", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom transacoes import gerar_transacoes\nX, y = gerar_transacoes(150, 5, 1)\na = mahalanobis(X)\nb = mahalanobis(X * np.array([1.0, 1000.0, 0.01]))", "expr": "bool(np.allclose(a, b, atol=1e-8))", "expected": true, "name": "Trocar a unidade de uma coluna (horas em milésimos, km em centenas) não muda nenhuma distância", "hint": "A covariância absorve a escala de cada coluna: é isso que diferencia Mahalanobis da distância euclidiana."},
  {"id": "maior-e-anomalia", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom scipy.spatial.distance import mahalanobis as dist_scipy\nfrom transacoes import gerar_transacoes\nX, y = gerar_transacoes(200, 6, 0)\nVI = np.linalg.inv(np.cov(X, rowvar=False))\nref = np.array([dist_scipy(x, X.mean(axis=0), VI) for x in X])\nd = mahalanobis(X)\n", "expr": "bool(y[int(np.argmax(d))] == 1)", "expected": true, "name": "A transação mais distante é uma das anomalias inseridas"},
  {"id": "singular", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nrng = np.random.default_rng(0)\nA = rng.normal(size=(30, 2))\nX = np.column_stack([A, A[:, 0] * 0.3 + A[:, 1] * 0.7])", "expr": "mahalanobis(X)", "raises": "ValueError", "name": "Uma coluna que é combinação das outras deixa a covariância singular: ValueError", "hint": "Confira o posto da covariância (np.linalg.matrix_rank) antes de resolver: com colunas redundantes, ele fica menor que o número de colunas."},
  {"id": "forma", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom scipy.spatial.distance import mahalanobis as dist_scipy\nfrom transacoes import gerar_transacoes\nX, y = gerar_transacoes(200, 6, 0)\nVI = np.linalg.inv(np.cov(X, rowvar=False))\nref = np.array([dist_scipy(x, X.mean(axis=0), VI) for x in X])\nd = mahalanobis(X)\n", "expr": "[type(d).__name__, list(d.shape)]", "expected": ["ndarray", [200]], "name": "Uma distância por linha"},
  {"id": "nao-negativa", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom scipy.spatial.distance import mahalanobis as dist_scipy\nfrom transacoes import gerar_transacoes\nX, y = gerar_transacoes(200, 6, 0)\nVI = np.linalg.inv(np.cov(X, rowvar=False))\nref = np.array([dist_scipy(x, X.mean(axis=0), VI) for x in X])\nd = mahalanobis(X)\n", "expr": "bool((d >= 0).all())", "expected": true, "name": "Distâncias nunca são negativas"}
]
```

### Soluções erradas
```python name="covariância das linhas"
import numpy as np


def mahalanobis(X):
    X = np.asarray(X, dtype=float)
    media = X.mean(axis=0)
    S = np.cov(X, rowvar=True)
    if np.linalg.matrix_rank(S) < S.shape[0]:
        raise ValueError("covariância singular: há colunas redundantes")
    D = X - media
    resolvido = np.linalg.solve(S, D.T).T
    return np.sqrt((D * resolvido).sum(axis=1))
```
```python name="sem checar a covariância singular"
import numpy as np


def mahalanobis(X):
    X = np.asarray(X, dtype=float)
    media = X.mean(axis=0)
    S = np.cov(X, rowvar=False)
    if np.linalg.matrix_rank(S) < S.shape[0] - 1:
        raise ValueError("covariância singular: há colunas redundantes")
    D = X - media
    resolvido = np.linalg.solve(S, D.T).T
    return np.sqrt((D * resolvido).sum(axis=1))
```
```python name="sem centralizar"
import numpy as np


def mahalanobis(X):
    X = np.asarray(X, dtype=float)
    media = X.mean(axis=0)
    S = np.cov(X, rowvar=False)
    if np.linalg.matrix_rank(S) < S.shape[0]:
        raise ValueError("covariância singular: há colunas redundantes")
    D = X
    resolvido = np.linalg.solve(S, D.T).T
    return np.sqrt((D * resolvido).sum(axis=1))
```
```python name="distância euclidiana no lugar de Mahalanobis"
import numpy as np


def mahalanobis(X):
    X = np.asarray(X, dtype=float)
    media = X.mean(axis=0)
    S = np.cov(X, rowvar=False)
    if np.linalg.matrix_rank(S) < S.shape[0]:
        raise ValueError("covariância singular: há colunas redundantes")
    D = X - media
    resolvido = np.linalg.solve(np.eye(len(S)), D.T).T
    return np.sqrt((D * resolvido).sum(axis=1))
```
```python name="sem a raiz"
import numpy as np


def mahalanobis(X):
    X = np.asarray(X, dtype=float)
    media = X.mean(axis=0)
    S = np.cov(X, rowvar=False)
    if np.linalg.matrix_rank(S) < S.shape[0]:
        raise ValueError("covariância singular: há colunas redundantes")
    D = X - media
    resolvido = np.linalg.solve(S, D.T).T
    return (D * resolvido).sum(axis=1)
```

## Passo 4 · Leitura · IsolationForest e LOF

O **IsolationForest** parte de uma ideia: anomalias são poucas e diferentes, e por isso fáceis de isolar. Cada árvore sorteia uma coluna e um corte entre o mínimo e o máximo dela, e repete o sorteio em cada lado até isolar cada ponto. Uma transação de R\$ 900 às 3 h, a 40 km de casa, fica sozinha em poucos cortes; uma compra comum precisa de muitos. A profundidade média $\mathbb{E}[h(x)]$ em que o ponto fica isolado, comparada com a profundidade esperada $c(n)$ numa árvore de $n$ pontos, dá a pontuação do artigo original:

$$
s(x) = 2^{-\,\mathbb{E}[h(x)]\,/\,c(n)}
$$

acima de 0,5 para anomalias e abaixo de 0,5 para pontos comuns. O scikit-learn devolve essa pontuação **com o sinal trocado** em `score_samples`: quanto **menor**, mais anômalo. Nas 300 transações fictícias, a média do `score_samples` foi −0,71 nas anomalias inseridas e −0,41 nas normais. O `predict` marca −1 onde `decision_function` (que é `score_samples` menos `offset_`) é negativo, e o `offset_` vem da **contaminação**: com `contamination=0.03`, ele fica no quantil que deixa 3 % das linhas do ajuste do lado anômalo (9 de 300); com o padrão `"auto"`, o limiar é fixo, e a floresta marcou 30 transações.

O **LOF** (*local outlier factor*) compara a densidade em volta de um ponto com a densidade em volta dos seus vizinhos: perto de 1, o ponto está tão cercado quanto eles; bem acima de 1, está num vazio ao lado de uma região densa. Ele acha anomalias **locais**, como um ponto isolado entre dois grupos densos. O `negative_outlier_factor_` guarda o fator com o sinal trocado (menor = mais anômalo), só para as linhas do ajuste.

O LOF tem dois modos. Com `novelty=False`, o padrão, ele detecta **outliers**: `fit_predict(X)` julga as próprias linhas de `X`, e não existe `predict` (`AttributeError: This 'LocalOutlierFactor' has no attribute 'predict'`). Com `novelty=True`, ele detecta **novidades**: `fit` no histórico limpo, e `predict`, `score_samples` e `decision_function` em pontos novos; nesse modo, quem some é o `fit_predict` (`AttributeError: This 'LocalOutlierFactor' has no attribute 'fit_predict'`).

## Passo 5 · Exercício · Dois detectores

Use o `IsolationForest` para marcar as transações suspeitas e o PCA para dar a cada transação uma pontuação de anomalia.

### Instruções
1. `anomalias_isolation_forest(X, contaminacao, semente)` ajusta `IsolationForest(n_estimators=50, contamination=contaminacao, random_state=semente)` em `X` e devolve a lista, em ordem crescente, dos índices das linhas marcadas como anomalia.
2. `erro_de_reconstrucao_pca(X, k)` padroniza `X` com `StandardScaler`, ajusta `PCA(k)` nos dados padronizados, reconstrói cada linha com `inverse_transform(transform(...))` e devolve um array com o erro de cada linha: a soma dos quadrados das diferenças entre a linha padronizada e a reconstruída.

### Código inicial
```python
import numpy as np
from sklearn.decomposition import PCA
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler


def anomalias_isolation_forest(X, contaminacao, semente):
    pass


def erro_de_reconstrucao_pca(X, k):
    pass
```
```text path=transacoes.py
import numpy as np


def gerar_transacoes(n, n_anomalias, semente):
    rng = np.random.default_rng(semente)
    valor = rng.lognormal(4.0, 0.5, n)
    hora = rng.normal(14, 3, n).clip(0, 23.9)
    distancia = rng.gamma(2.0, 3.0, n)
    X = np.column_stack([valor, hora, distancia])
    rotulos = np.zeros(n, dtype=int)
    indices = rng.choice(n, n_anomalias, replace=False)
    X[indices, 0] = X[indices, 0] * rng.uniform(3, 10, n_anomalias)
    X[indices, 1] = rng.uniform(1, 5, n_anomalias)
    X[indices, 2] = X[indices, 2] + rng.uniform(10, 40, n_anomalias)
    rotulos[indices] = 1
    return X.round(2), rotulos
```

### Solução
```python
import numpy as np
from sklearn.decomposition import PCA
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler


def anomalias_isolation_forest(X, contaminacao, semente):
    modelo = IsolationForest(n_estimators=50, contamination=contaminacao, random_state=semente)
    previsao = modelo.fit_predict(X)
    return np.flatnonzero(previsao == -1).tolist()


def erro_de_reconstrucao_pca(X, k):
    Z = StandardScaler().fit_transform(X)
    pca = PCA(k).fit(Z)
    Z_rec = pca.inverse_transform(pca.transform(Z))
    return ((Z - Z_rec) ** 2).sum(axis=1)
```
```text path=transacoes.py
import numpy as np


def gerar_transacoes(n, n_anomalias, semente):
    rng = np.random.default_rng(semente)
    valor = rng.lognormal(4.0, 0.5, n)
    hora = rng.normal(14, 3, n).clip(0, 23.9)
    distancia = rng.gamma(2.0, 3.0, n)
    X = np.column_stack([valor, hora, distancia])
    rotulos = np.zeros(n, dtype=int)
    indices = rng.choice(n, n_anomalias, replace=False)
    X[indices, 0] = X[indices, 0] * rng.uniform(3, 10, n_anomalias)
    X[indices, 1] = rng.uniform(1, 5, n_anomalias)
    X[indices, 2] = X[indices, 2] + rng.uniform(10, 40, n_anomalias)
    rotulos[indices] = 1
    return X.round(2), rotulos
```

### Dicas
1. O `fit_predict` devolve `-1` para anomalia e `1` para normal; `np.flatnonzero` dá as posições de uma máscara.
2. Sem padronizar, o valor em reais domina o PCA, e o erro de reconstrução vira quase só o valor.
3. O erro é por linha: some ao longo das colunas (`axis=1`).

### Verificação
```json
[
  {"id": "if-indices", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.ensemble import IsolationForest\nfrom transacoes import gerar_transacoes\nX, y = gerar_transacoes(300, 9, 2)\nr = anomalias_isolation_forest(X, 0.03, 0)\n", "expr": "r", "expected": [16, 30, 37, 76, 103, 122, 147, 160, 235], "name": "300 transações, contaminação 0.03, semente 0: os índices marcados como anomalia", "hint": "IsolationForest(n_estimators=50, contamination=contaminacao, random_state=semente); o fit_predict marca anomalias com -1."},
  {"id": "if-quantos", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.ensemble import IsolationForest\nfrom transacoes import gerar_transacoes\nX, y = gerar_transacoes(300, 9, 2)\nr = anomalias_isolation_forest(X, 0.03, 0)\n", "expr": "len(r)", "expected": 9, "name": "Com contaminação 0.03 em 300 linhas, 9 transações são marcadas", "hint": "A contaminação diz que fração dos dados o modelo deve marcar."},
  {"id": "if-acertos", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.ensemble import IsolationForest\nfrom transacoes import gerar_transacoes\nX, y = gerar_transacoes(300, 9, 2)\nr = anomalias_isolation_forest(X, 0.03, 0)\n", "expr": "int(y[r].sum())", "expected": 9, "name": "Quantas das marcadas são anomalias inseridas"},
  {"id": "if-reprodutivel", "checkpoint": 1, "kind": "expr", "setup": "from transacoes import gerar_transacoes\nX, y = gerar_transacoes(300, 9, 2)", "expr": "[anomalias_isolation_forest(X, 0.2, s) == anomalias_isolation_forest(X, 0.2, s) for s in range(3)]", "expected": [true, true, true], "name": "A mesma semente marca as mesmas transações, mesmo quando 20 % das linhas são marcadas", "hint": "Passe a semente no random_state: cada árvore sorteia colunas e cortes. Com 20 % das linhas marcadas, as menos suspeitas mudam a cada sorteio."},
  {"id": "if-tipo", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.ensemble import IsolationForest\nfrom transacoes import gerar_transacoes\nX, y = gerar_transacoes(300, 9, 2)\nr = anomalias_isolation_forest(X, 0.03, 0)\n", "expr": "[type(r).__name__, r == sorted(r)]", "expected": ["list", true], "name": "Devolve uma lista de índices em ordem crescente"},
  {"id": "pca-ref", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nfrom transacoes import gerar_transacoes\nX, y = gerar_transacoes(300, 9, 2)\ne = erro_de_reconstrucao_pca(X, 2)\nfrom sklearn.decomposition import PCA\nfrom sklearn.preprocessing import StandardScaler\nZ = StandardScaler().fit_transform(X)\np = PCA(2).fit(Z)\nref = ((Z - p.inverse_transform(p.transform(Z))) ** 2).sum(axis=1)", "expr": "bool(np.allclose(e, ref, atol=1e-9))", "expected": true, "name": "O erro de cada linha é a soma dos quadrados entre os dados padronizados e a reconstrução com 2 componentes", "hint": "Padronize com StandardScaler, ajuste PCA(k), reconstrua com inverse_transform(transform(...)) e some os quadrados das diferenças em cada linha."},
  {"id": "pca-forma", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nfrom transacoes import gerar_transacoes\nX, y = gerar_transacoes(300, 9, 2)\ne = erro_de_reconstrucao_pca(X, 2)\n", "expr": "list(e.shape)", "expected": [300], "name": "Uma pontuação por transação"},
  {"id": "pca-todos", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nfrom transacoes import gerar_transacoes\nX, y = gerar_transacoes(300, 9, 2)\ne = erro_de_reconstrucao_pca(X, 2)\ne3 = erro_de_reconstrucao_pca(X, 3)", "expr": "bool(np.allclose(e3, 0, atol=1e-12))", "expected": true, "name": "Com todos os 3 componentes, a reconstrução é perfeita e o erro zera"},
  {"id": "pca-topo", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nfrom transacoes import gerar_transacoes\nX, y = gerar_transacoes(300, 9, 2)\ne = erro_de_reconstrucao_pca(X, 2)\n", "expr": "int(y[np.argsort(-e)[:9]].sum())", "expected": 3, "name": "Das 9 transações de maior erro, quantas são anomalias"}
]
```

### Soluções erradas
```python name="índices das transações normais"
import numpy as np
from sklearn.decomposition import PCA
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler


def anomalias_isolation_forest(X, contaminacao, semente):
    modelo = IsolationForest(n_estimators=50, contamination=contaminacao, random_state=semente)
    previsao = modelo.fit_predict(X)
    return np.flatnonzero(previsao == 1).tolist()


def erro_de_reconstrucao_pca(X, k):
    Z = StandardScaler().fit_transform(X)
    pca = PCA(k).fit(Z)
    Z_rec = pca.inverse_transform(pca.transform(Z))
    return ((Z - Z_rec) ** 2).sum(axis=1)
```
```python name="floresta sem semente"
import numpy as np
from sklearn.decomposition import PCA
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler


def anomalias_isolation_forest(X, contaminacao, semente):
    modelo = IsolationForest(n_estimators=50, contamination=contaminacao)
    previsao = modelo.fit_predict(X)
    return np.flatnonzero(previsao == -1).tolist()


def erro_de_reconstrucao_pca(X, k):
    Z = StandardScaler().fit_transform(X)
    pca = PCA(k).fit(Z)
    Z_rec = pca.inverse_transform(pca.transform(Z))
    return ((Z - Z_rec) ** 2).sum(axis=1)
```
```python name="contaminação ignorada"
import numpy as np
from sklearn.decomposition import PCA
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler


def anomalias_isolation_forest(X, contaminacao, semente):
    modelo = IsolationForest(n_estimators=50, random_state=semente)
    previsao = modelo.fit_predict(X)
    return np.flatnonzero(previsao == -1).tolist()


def erro_de_reconstrucao_pca(X, k):
    Z = StandardScaler().fit_transform(X)
    pca = PCA(k).fit(Z)
    Z_rec = pca.inverse_transform(pca.transform(Z))
    return ((Z - Z_rec) ** 2).sum(axis=1)
```
```python name="erro sem padronizar"
import numpy as np
from sklearn.decomposition import PCA
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler


def anomalias_isolation_forest(X, contaminacao, semente):
    modelo = IsolationForest(n_estimators=50, contamination=contaminacao, random_state=semente)
    previsao = modelo.fit_predict(X)
    return np.flatnonzero(previsao == -1).tolist()


def erro_de_reconstrucao_pca(X, k):
    Z = np.asarray(X, dtype=float)
    pca = PCA(k).fit(Z)
    Z_rec = pca.inverse_transform(pca.transform(Z))
    return ((Z - Z_rec) ** 2).sum(axis=1)
```
```python name="erro médio de todas as linhas"
import numpy as np
from sklearn.decomposition import PCA
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler


def anomalias_isolation_forest(X, contaminacao, semente):
    modelo = IsolationForest(n_estimators=50, contamination=contaminacao, random_state=semente)
    previsao = modelo.fit_predict(X)
    return np.flatnonzero(previsao == -1).tolist()


def erro_de_reconstrucao_pca(X, k):
    Z = StandardScaler().fit_transform(X)
    pca = PCA(k).fit(Z)
    Z_rec = pca.inverse_transform(pca.transform(Z))
    return ((Z - Z_rec) ** 2).mean()
```
```python name="PCA com todos os componentes"
import numpy as np
from sklearn.decomposition import PCA
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler


def anomalias_isolation_forest(X, contaminacao, semente):
    modelo = IsolationForest(n_estimators=50, contamination=contaminacao, random_state=semente)
    previsao = modelo.fit_predict(X)
    return np.flatnonzero(previsao == -1).tolist()


def erro_de_reconstrucao_pca(X, k):
    Z = StandardScaler().fit_transform(X)
    pca = PCA().fit(Z)
    Z_rec = pca.inverse_transform(pca.transform(Z))
    return ((Z - Z_rec) ** 2).sum(axis=1)
```

## Passo 6 · Leitura · Avaliar com poucos rótulos

Nas 300 transações fictícias, 9 são anomalias. Um "detector" que chama tudo de normal acerta 97 % delas: a acurácia não diz nada aqui, como nos dados desbalanceados do módulo 3. E quase nunca há rótulos para todas as transações. A pergunta prática é outra: a equipe de revisão consegue olhar $k$ transações por dia; quantas das $k$ mais suspeitas são anomalias de fato? É a **precisão em $k$**:

$$
P@k = \frac{1}{k} \sum_{i \in \text{top}_k} y_i
$$

em que $\text{top}_k$ são as $k$ transações de maior pontuação de anomalia e $y_i = 1$ para as anomalias. Ela só precisa dos rótulos das transações revisadas, que é justamente o que a equipe produz. Para comparar detectores, todos precisam usar a mesma convenção, **maior = mais suspeito**: troque o sinal do `score_samples` e do `negative_outlier_factor_`. Nas transações fictícias:

| detector | $P@9$ | $P@20$ | precisão média |
|---|---|---|---|
| Mahalanobis | 0,89 | 0,45 | 0,98 |
| `IsolationForest` (50 árvores) | 1,00 | 0,45 | 1,00 |
| `LOF` (20 vizinhos) | 0,78 | 0,45 | 0,94 |

Com só 9 anomalias, $P@20$ não passa de $9/20 = 0{,}45$: escolha $k$ perto do número de casos que a equipe consegue revisar.

A última coluna é a **precisão média** (`average_precision_score`, a área sob a curva precisão-recall do módulo 3), que resume todos os $k$ de uma vez, mas exige o rótulo de todas as transações.

Para usar um detector, falta um **limiar**. Ele sai da distribuição das pontuações: `np.quantile(pontuacao, 0.97)` marca as 3 % mais suspeitas, o mesmo que `contamination=0.03`. A fração é uma decisão de negócio (quantas revisões cabem por dia, quanto custa uma fraude perdida), e não um número a otimizar contra o teste: escolher a contaminação pelo F1 nos rótulos do teste e relatar esse F1 é o vazamento do módulo 4, agora com outro nome.

## Passo 7 · Exercício · Precisão em k

Avalie e compare detectores com a precisão nas `k` transações mais suspeitas.

### Instruções
1. `precisao_em_k(scores, rotulos, k)` recebe uma pontuação por transação, **maior = mais suspeita**, e os rótulos (1 = anomalia); devolve, como `float`, a fração de anomalias entre as `k` transações de maior pontuação.
2. Num empate de pontuação, fica a transação de menor índice.
3. `comparar_detectores(X, rotulos, k, semente)` ajusta `IsolationForest(n_estimators=50, random_state=semente)` e `LocalOutlierFactor(n_neighbors=20)` em `X` e devolve `{"isolation_forest": ..., "lof": ...}` com a precisão em `k` de cada um, usando `score_samples` da floresta e `negative_outlier_factor_` do LOF como base das pontuações.

### Código inicial
```python
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.neighbors import LocalOutlierFactor


def precisao_em_k(scores, rotulos, k):
    pass


def comparar_detectores(X, rotulos, k, semente):
    pass
```
```text path=transacoes.py
import numpy as np


def gerar_transacoes(n, n_anomalias, semente):
    rng = np.random.default_rng(semente)
    valor = rng.lognormal(4.0, 0.5, n)
    hora = rng.normal(14, 3, n).clip(0, 23.9)
    distancia = rng.gamma(2.0, 3.0, n)
    X = np.column_stack([valor, hora, distancia])
    rotulos = np.zeros(n, dtype=int)
    indices = rng.choice(n, n_anomalias, replace=False)
    X[indices, 0] = X[indices, 0] * rng.uniform(3, 10, n_anomalias)
    X[indices, 1] = rng.uniform(1, 5, n_anomalias)
    X[indices, 2] = X[indices, 2] + rng.uniform(10, 40, n_anomalias)
    rotulos[indices] = 1
    return X.round(2), rotulos
```

### Solução
```python
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.neighbors import LocalOutlierFactor


def precisao_em_k(scores, rotulos, k):
    scores = np.asarray(scores, dtype=float)
    rotulos = np.asarray(rotulos)
    topo = np.argsort(-scores, kind="stable")[:k]
    return float(rotulos[topo].sum() / k)


def comparar_detectores(X, rotulos, k, semente):
    floresta = IsolationForest(n_estimators=50, random_state=semente).fit(X)
    lof = LocalOutlierFactor(n_neighbors=20).fit(X)
    return {
        "isolation_forest": precisao_em_k(-floresta.score_samples(X), rotulos, k),
        "lof": precisao_em_k(-lof.negative_outlier_factor_, rotulos, k),
    }
```
```text path=transacoes.py
import numpy as np


def gerar_transacoes(n, n_anomalias, semente):
    rng = np.random.default_rng(semente)
    valor = rng.lognormal(4.0, 0.5, n)
    hora = rng.normal(14, 3, n).clip(0, 23.9)
    distancia = rng.gamma(2.0, 3.0, n)
    X = np.column_stack([valor, hora, distancia])
    rotulos = np.zeros(n, dtype=int)
    indices = rng.choice(n, n_anomalias, replace=False)
    X[indices, 0] = X[indices, 0] * rng.uniform(3, 10, n_anomalias)
    X[indices, 1] = rng.uniform(1, 5, n_anomalias)
    X[indices, 2] = X[indices, 2] + rng.uniform(10, 40, n_anomalias)
    rotulos[indices] = 1
    return X.round(2), rotulos
```

### Dicas
1. `np.argsort(-scores, kind="stable")` ordena do maior para o menor e mantém a ordem original dos empates.
2. Os dois detectores do scikit-learn dão números **menores** para os pontos mais anômalos: troque o sinal antes de medir.
3. A precisão em `k` divide pelo `k`, e não pelo total de anomalias.

### Verificação
```json
[
  {"id": "pk-simples", "checkpoint": 1, "kind": "call", "function": "precisao_em_k", "args": [[0.9, 0.1, 0.8, 0.3, 0.7], [1, 0, 0, 0, 1], 3], "expected": 0.6666666666666666, "tolerance": 1e-09, "name": "As 3 maiores pontuações (0.9, 0.8, 0.7) pegam 2 anomalias: 2/3", "hint": "Maior pontuação = mais suspeito. Pegue os k índices de maior pontuação e divida o número de anomalias entre eles por k."},
  {"id": "pk-um", "checkpoint": 1, "kind": "call", "function": "precisao_em_k", "args": [[0.2, 0.5, 0.4], [0, 1, 0], 1], "expected": 1.0, "tolerance": 1e-09, "name": "k = 1: só a transação de maior pontuação"},
  {"id": "pk-empate", "checkpoint": 1, "kind": "call", "function": "precisao_em_k", "args": [[0.5, 0.5, 0.5, 0.1], [0, 1, 1, 0], 1], "expected": 0.0, "tolerance": 1e-09, "name": "Empate na pontuação: fica o menor índice", "hint": "Ordene de forma estável (kind='stable') pela pontuação com o sinal trocado."},
  {"id": "pk-nao-recall", "checkpoint": 1, "kind": "call", "function": "precisao_em_k", "args": [[5, 4, 3, 2, 1, 0], [1, 1, 0, 1, 1, 1], 2], "expected": 1.0, "tolerance": 1e-09, "name": "Divide pelo k, não pelo total de anomalias (seria o recall em k)"},
  {"id": "pk-zero", "checkpoint": 1, "kind": "call", "function": "precisao_em_k", "args": [[1, 2, 3, 4], [1, 0, 0, 0], 2], "expected": 0.0, "tolerance": 1e-09, "name": "A única anomalia tem a menor pontuação: precisão 0"},
  {"id": "comparar", "checkpoint": 2, "kind": "expr", "setup": "from transacoes import gerar_transacoes\nX, y = gerar_transacoes(300, 9, 2)\nr = comparar_detectores(X, y, 9, 0)\n", "expr": "r", "expected": {"isolation_forest": 1.0, "lof": 0.7777777777777778}, "tolerance": 1e-09, "name": "Precisão em 9 dos dois detectores, nas transações fictícias", "hint": "No IsolationForest, score_samples é MENOR para o mais anômalo; no LOF, negative_outlier_factor_ também. Troque o sinal antes de chamar precisao_em_k."},
  {"id": "comparar-chaves", "checkpoint": 2, "kind": "expr", "setup": "from transacoes import gerar_transacoes\nX, y = gerar_transacoes(300, 9, 2)\nr = comparar_detectores(X, y, 9, 0)\n", "expr": "[sorted(r), type(r['lof']).__name__]", "expected": [["isolation_forest", "lof"], "float"], "name": "Devolve o dicionário com as duas precisões como float"},
  {"id": "comparar-reprodutivel", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nrng = np.random.default_rng(7)\nX = rng.normal(0, 1, (400, 3))\ny = np.zeros(400, dtype=int)\ny[:40] = 1\nX[:40] += 1.6", "expr": "[comparar_detectores(X, y, 40, s) == comparar_detectores(X, y, 40, s) for s in range(5)]", "expected": [true, true, true, true, true], "name": "A mesma semente dá as mesmas precisões, mesmo quando as anomalias se misturam aos dados normais", "hint": "Passe a semente ao IsolationForest: com anomalias que se misturam aos dados, a precisão muda a cada sorteio."}
]
```

### Soluções erradas
```python name="ordena do menor para o maior"
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.neighbors import LocalOutlierFactor


def precisao_em_k(scores, rotulos, k):
    scores = np.asarray(scores, dtype=float)
    rotulos = np.asarray(rotulos)
    topo = np.argsort(scores, kind="stable")[:k]
    return float(rotulos[topo].sum() / k)


def comparar_detectores(X, rotulos, k, semente):
    floresta = IsolationForest(n_estimators=50, random_state=semente).fit(X)
    lof = LocalOutlierFactor(n_neighbors=20).fit(X)
    return {
        "isolation_forest": precisao_em_k(-floresta.score_samples(X), rotulos, k),
        "lof": precisao_em_k(-lof.negative_outlier_factor_, rotulos, k),
    }
```
```python name="divide pelo total de anomalias"
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.neighbors import LocalOutlierFactor


def precisao_em_k(scores, rotulos, k):
    scores = np.asarray(scores, dtype=float)
    rotulos = np.asarray(rotulos)
    topo = np.argsort(-scores, kind="stable")[:k]
    return float(rotulos[topo].sum() / rotulos.sum())


def comparar_detectores(X, rotulos, k, semente):
    floresta = IsolationForest(n_estimators=50, random_state=semente).fit(X)
    lof = LocalOutlierFactor(n_neighbors=20).fit(X)
    return {
        "isolation_forest": precisao_em_k(-floresta.score_samples(X), rotulos, k),
        "lof": precisao_em_k(-lof.negative_outlier_factor_, rotulos, k),
    }
```
```python name="ordem crescente invertida (empate pelo maior índice)"
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.neighbors import LocalOutlierFactor


def precisao_em_k(scores, rotulos, k):
    scores = np.asarray(scores, dtype=float)
    rotulos = np.asarray(rotulos)
    topo = np.argsort(scores, kind="stable")[::-1][:k]
    return float(rotulos[topo].sum() / k)


def comparar_detectores(X, rotulos, k, semente):
    floresta = IsolationForest(n_estimators=50, random_state=semente).fit(X)
    lof = LocalOutlierFactor(n_neighbors=20).fit(X)
    return {
        "isolation_forest": precisao_em_k(-floresta.score_samples(X), rotulos, k),
        "lof": precisao_em_k(-lof.negative_outlier_factor_, rotulos, k),
    }
```
```python name="score_samples sem trocar o sinal"
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.neighbors import LocalOutlierFactor


def precisao_em_k(scores, rotulos, k):
    scores = np.asarray(scores, dtype=float)
    rotulos = np.asarray(rotulos)
    topo = np.argsort(-scores, kind="stable")[:k]
    return float(rotulos[topo].sum() / k)


def comparar_detectores(X, rotulos, k, semente):
    floresta = IsolationForest(n_estimators=50, random_state=semente).fit(X)
    lof = LocalOutlierFactor(n_neighbors=20).fit(X)
    return {
        "isolation_forest": precisao_em_k(floresta.score_samples(X), rotulos, k),
        "lof": precisao_em_k(-lof.negative_outlier_factor_, rotulos, k),
    }
```
```python name="fator do LOF sem trocar o sinal"
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.neighbors import LocalOutlierFactor


def precisao_em_k(scores, rotulos, k):
    scores = np.asarray(scores, dtype=float)
    rotulos = np.asarray(rotulos)
    topo = np.argsort(-scores, kind="stable")[:k]
    return float(rotulos[topo].sum() / k)


def comparar_detectores(X, rotulos, k, semente):
    floresta = IsolationForest(n_estimators=50, random_state=semente).fit(X)
    lof = LocalOutlierFactor(n_neighbors=20).fit(X)
    return {
        "isolation_forest": precisao_em_k(-floresta.score_samples(X), rotulos, k),
        "lof": precisao_em_k(lof.negative_outlier_factor_, rotulos, k),
    }
```
```python name="floresta sem semente"
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.neighbors import LocalOutlierFactor


def precisao_em_k(scores, rotulos, k):
    scores = np.asarray(scores, dtype=float)
    rotulos = np.asarray(rotulos)
    topo = np.argsort(-scores, kind="stable")[:k]
    return float(rotulos[topo].sum() / k)


def comparar_detectores(X, rotulos, k, semente):
    floresta = IsolationForest(n_estimators=50).fit(X)
    lof = LocalOutlierFactor(n_neighbors=20).fit(X)
    return {
        "isolation_forest": precisao_em_k(-floresta.score_samples(X), rotulos, k),
        "lof": precisao_em_k(-lof.negative_outlier_factor_, rotulos, k),
    }
```

## Passo 8 · Quiz · Contaminação

### Pergunta
Para escolher a `contamination` do `IsolationForest`, um analista testa 0,01, 0,02, 0,05 e 0,10, mede o F1 de cada uma contra os rótulos do conjunto de teste e relata o F1 da melhor (0,71) como o desempenho esperado em produção. O que está errado?
- [ ] Nada: a contaminação é só um limiar, e escolher limiar no teste é permitido
- [ ] O F1 não serve para anomalias; com acurácia a escolha ficaria correta
- [x] O teste foi usado para escolher a contaminação, então o 0,71 é otimista; a contaminação se escolhe numa validação separada, ou pela capacidade de investigação (quantas transações a equipe consegue revisar por dia), e o teste fica para a medida final
- [ ] A contaminação precisa ser igual à fração de anomalias do treino, que é sempre conhecida
> A contaminação decide o limiar `offset_` e, com ele, quais transações são marcadas: escolhê-la olhando os rótulos do teste é ajustar um hiperparâmetro no teste, o mesmo vazamento do módulo 4. A acurácia seria pior ainda (marcar nada já dá mais de 95 %), e a fração real de anomalias quase nunca é conhecida, o que torna a escolha uma decisão de negócio ou de validação.

### Pergunta
Uma colega ordena as transações por `IsolationForest(random_state=0).fit(X).score_samples(X)`, do **maior** para o **menor**, e manda as 10 primeiras para revisão. Nenhuma é fraude. Qual a explicação mais provável?
- [ ] O `IsolationForest` não funciona com três colunas
- [x] No `score_samples`, quanto **menor** o número, mais anômala a transação: ela mandou para revisão as 10 mais normais; é preciso ordenar do menor para o maior (ou trocar o sinal)
- [ ] Faltou padronizar as colunas, sem o que a floresta de isolamento não acha nada
- [ ] Faltou `contamination`, sem a qual o `score_samples` não é calculado
> O `score_samples` do scikit-learn é o oposto da pontuação de anomalia do artigo original: valores mais negativos indicam caminhos mais curtos nas árvores, isto é, pontos mais fáceis de isolar. O mesmo vale para o `negative_outlier_factor_` do LOF. A floresta corta cada coluna pelos valores dela e não depende da escala, e a contaminação só mexe no limiar do `predict`.

### Pergunta
Um sistema treina `LocalOutlierFactor(n_neighbors=20)` com as transações dos últimos 30 dias, consideradas limpas, e quer julgar cada transação nova assim que ela chega. O que fazer?
- [ ] Chamar `fit_predict` com a transação nova sozinha
- [ ] Chamar `fit_predict` com o histórico mais a transação nova e olhar o último rótulo, a cada transação
- [x] Criar o LOF com `novelty=True`, ajustar com `fit(historico)` uma vez e usar `predict` (ou `score_samples`) nas transações novas
- [ ] Usar o `negative_outlier_factor_` do modelo ajustado no histórico, que já cobre pontos novos
> Com `novelty=False` (o padrão), o LOF só sabe julgar os pontos do próprio ajuste, e não tem `predict`. O `fit_predict` com uma transação sozinha não tem vizinhos; refazer o ajuste a cada transação é caro e deixa a própria transação suspeita influenciar a densidade dos vizinhos. O `negative_outlier_factor_` existe só para as linhas do ajuste. O modo novidade foi feito para esse uso.
