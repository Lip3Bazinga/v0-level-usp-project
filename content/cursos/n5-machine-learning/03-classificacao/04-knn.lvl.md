---
slug: n5-m3-04-knn
titulo: k-vizinhos mais próximos
descricao: Classificação por vizinhança, distância e escala, escolha de k, fronteiras irregulares, custo de predição e a maldição da dimensionalidade.
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
- Implementar kNN do zero (classificação e regressão) com votação e pesos por distância
- Escolher k por validação e explicar o efeito de k pequeno e grande na fronteira
- Explicar a maldição da dimensionalidade e o custo de predição do kNN
---

## Passo 1 · Leitura · Sem treino, só vizinhos

Uma loja fictícia quer classificar clientes novos como "frequente" ou "ocasional". A ideia mais simples possível: procure, entre os clientes já conhecidos, os $k$ mais parecidos com o novo, e dê a ele a classe da maioria. Esse é o **k-vizinhos mais próximos** (kNN). Ele não aprende pesos: o "treino" é guardar os dados, e toda a conta acontece na previsão.

"Mais parecido" quer dizer mais perto, pela distância euclidiana da m1-01:

$$
d(x, x') = \sqrt{\sum_{j=1}^{d} (x_j - x'_j)^2}
$$

O algoritmo para um ponto novo tem três passos: calcular a distância a cada ponto do treino, separar os $k$ menores e contar os votos. O visualizador abaixo faz isso para um ponto e três vizinhos.

```python visualizar
import numpy as np

treino = np.array([[1.0, 1.0], [2.0, 1.5], [4.0, 4.0], [5.0, 4.5], [1.5, 2.5], [4.5, 3.0]])
rotulos = ["ocasional", "ocasional", "frequente", "frequente", "ocasional", "frequente"]
novo = np.array([3.0, 2.5])
k = 3

distancias = np.sqrt(((treino - novo) ** 2).sum(axis=1))
for i in range(len(treino)):
    print(i, rotulos[i], round(float(distancias[i]), 2))

ordem = np.argsort(distancias, kind="stable")
vizinhos = ordem[:k]
votos = {}
for i in vizinhos:
    votos[rotulos[i]] = votos.get(rotulos[i], 0) + 1
    print("vizinho", i, rotulos[i], votos)

print("classe prevista:", max(sorted(votos), key=votos.get))
```

Duas regras de desempate precisam ser fixadas para o resultado não depender do acaso. Quando duas distâncias empatam, fica o ponto de **menor índice** no treino; por isso o `argsort(kind="stable")`, que mantém a ordem original entre iguais (o `argsort` padrão não garante isso em arrays grandes). Quando a votação empata, o que acontece com $k$ par, fica o **menor rótulo**, que é o que o scikit-learn faz.

```python
from sklearn.neighbors import KNeighborsClassifier

modelo = KNeighborsClassifier(n_neighbors=3).fit(X_treino, y_treino)
modelo.predict(X_novo)
```

No executor, o primeiro uso do `KNeighborsClassifier` escreve no stderr `UserWarning: Unable to import LDSO from pyodide_js._module. This should never happen.` O aviso vem da montagem do Python no navegador e no executor, não do seu código, e não afeta nada. Pedir mais vizinhos do que pontos dá `ValueError: Expected n_neighbors <= n_samples_fit, but n_neighbors = 60, n_samples_fit = 50, n_samples = 50`.

Um cuidado ao avaliar no próprio treino: cada ponto do treino é vizinho de si mesmo, com distância zero. Com $k = 1$, o kNN acerta todos os pontos que já viu. É o assunto da Previsão.

## Passo 2 · Previsão · k = 1 no próprio treino

O programa sorteia 100 clientes fictícios em duas nuvens que se sobrepõem, usa 70 para treino e 30 para validação, e mede a acurácia com $k = 1$ e $k = 15$. Leia sem executar e digite o que ele imprime. Duas das acurácias não dá para calcular de cabeça: elas estão nas dicas.

### Código
```python
import numpy as np
from sklearn.neighbors import KNeighborsClassifier

rng = np.random.default_rng(2)
X = np.vstack([rng.normal([0, 0], 1.0, size=(50, 2)), rng.normal([1.5, 1.5], 1.0, size=(50, 2))])
y = np.repeat([0, 1], 50)
ordem = rng.permutation(100)
X, y = X[ordem], y[ordem]

k1 = KNeighborsClassifier(n_neighbors=1).fit(X[:70], y[:70])
print(k1.score(X[:70], y[:70]), round(k1.score(X[70:], y[70:]), 3))
k15 = KNeighborsClassifier(n_neighbors=15).fit(X[:70], y[:70])
print(round(k15.score(X[:70], y[:70]), 3), round(k15.score(X[70:], y[70:]), 3))
```

### Dicas
1. Com $k = 1$, o vizinho mais próximo de um ponto do treino é ele mesmo.
2. Na validação, as duas configurações acertam 24 dos 30 clientes.
3. Com $k = 15$, o modelo erra 6 dos 70 pontos do treino (arredonde $64/70$ para três casas).

### Saída esperada
```text
1.0 0.8
0.914 0.8
```

## Passo 3 · Exercício · Prever por votação
modo: lacunas

Complete as lacunas (`___`) do classificador kNN.

### Instruções
1. `knn_prever(X_tr, y_tr, X_novo, k)` calcula, sem laço sobre os pontos do treino, a distância euclidiana de cada linha de `X_novo` a cada linha de `X_tr` (uma matriz `(len(X_novo), len(X_tr))`).
2. Os vizinhos de cada ponto novo são os `k` de menor distância; nos empates de distância, fica o de menor índice no treino.
3. A classe prevista é o rótulo mais votado entre os vizinhos; num empate de votos, vence o **menor** rótulo. Devolve um array do numpy com um rótulo por linha de `X_novo`.

### Código inicial
```python
import numpy as np


def knn_prever(X_tr, y_tr, X_novo, k):
    X_tr = np.asarray(X_tr, dtype=float)
    X_novo = np.asarray(X_novo, dtype=float)
    y_tr = np.asarray(y_tr)
    d = np.sqrt(((X_novo[:, None, :] - X_tr[None, :, :]) ** 2).sum(axis=___))
    vizinhos = np.argsort(d, axis=1, kind="stable")[:, ___]
    previsoes = []
    for linha in y_tr[vizinhos]:
        rotulos, votos = np.unique(___, return_counts=True)
        previsoes.append(___)
    return np.array(previsoes)
```

### Solução
```python
import numpy as np


def knn_prever(X_tr, y_tr, X_novo, k):
    X_tr = np.asarray(X_tr, dtype=float)
    X_novo = np.asarray(X_novo, dtype=float)
    y_tr = np.asarray(y_tr)
    d = np.sqrt(((X_novo[:, None, :] - X_tr[None, :, :]) ** 2).sum(axis=2))
    vizinhos = np.argsort(d, axis=1, kind="stable")[:, :k]
    previsoes = []
    for linha in y_tr[vizinhos]:
        rotulos, votos = np.unique(linha, return_counts=True)
        previsoes.append(rotulos[np.argmax(votos)])
    return np.array(previsoes)
```

### Dicas
1. A diferença `X_novo[:, None, :] - X_tr[None, :, :]` tem forma `(m, n, d)`: a soma dos quadrados é no eixo dos atributos.
2. Cada linha de `vizinhos` guarda **posições** no treino; `y_tr[vizinhos]` troca as posições pelos rótulos.
3. O `np.unique` devolve os rótulos em ordem crescente, e o `np.argmax` devolve a primeira posição do máximo.

### Verificação
```json
[
  { "id": "uma-dimensao", "checkpoint": 3, "kind": "expr",
    "expr": "knn_prever([[0], [1], [2], [10], [11], [12]], ['a', 'a', 'a', 'b', 'b', 'b'], [[1.5], [10.5]], 3).tolist()", "expected": ["a", "b"],
    "name": "Dois grupos em uma dimensão, k = 3",
    "hint": "Devolva os rótulos dos vizinhos mais votados, não as posições." },
  { "id": "empate-distancia", "checkpoint": 2, "kind": "expr",
    "expr": "knn_prever([[0], [1], [2], [10], [11], [12]], ['a', 'a', 'a', 'b', 'b', 'b'], [[6.0]], 3).tolist()", "expected": ["a"],
    "name": "Distâncias empatadas: ficam os vizinhos de menor índice no treino",
    "hint": "Com x = 6, os pontos 2 e 10 estão à mesma distância, e 1 e 11 também; o k define quantos entram." },
  { "id": "empate-votos", "checkpoint": 3, "kind": "expr",
    "expr": "knn_prever([[0.0], [2.0]], ['b', 'a'], [[0.9]], 2).tolist()", "expected": ["a"],
    "name": "k par com empate de votos: vence o menor rótulo, não o vizinho mais próximo",
    "hint": "O vizinho mais próximo é 'b', mas cada rótulo tem um voto." },
  { "id": "k-um", "checkpoint": 2, "kind": "expr",
    "expr": "knn_prever([[0.0, 0.0], [5.0, 5.0], [0.0, 5.0]], [0, 1, 2], [[0.2, 4.0], [4.0, 4.5], [1.0, 0.5]], 1).tolist()", "expected": [2, 1, 0],
    "name": "Com k = 1, a classe do vizinho mais próximo (2 dimensões)",
    "hint": "A distância soma os quadrados das diferenças de cada atributo." },
  { "id": "k-todos", "checkpoint": 3, "kind": "expr",
    "expr": "knn_prever([[0.0], [1.0], [2.0], [9.0], [10.0]], ['x', 'x', 'x', 'y', 'y'], [[9.5]], 5).tolist()", "expected": ["x"],
    "name": "Com k igual ao tamanho do treino, vence a classe majoritária" },
  { "id": "referencia", "checkpoint": 3, "kind": "expr",
    "setup": "import numpy as np\nfrom sklearn.neighbors import KNeighborsClassifier\nrng = np.random.default_rng(9)\nX = rng.normal(size=(80, 2))\ny = np.where(X[:, 0] + 0.5 * rng.normal(size=80) > 0, 'sim', 'nao')\nXn = rng.normal(size=(40, 2))\nref = KNeighborsClassifier(n_neighbors=5).fit(X, y)",
    "expr": "knn_prever(X, y, Xn, 5).tolist() == ref.predict(Xn).tolist()", "expected": true,
    "name": "As mesmas previsões do KNeighborsClassifier(5) em 40 pontos sorteados",
    "hint": "A expressão compara as suas 40 previsões com as do KNeighborsClassifier treinado nos mesmos 80 pontos." },
  { "id": "tipo-forma", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np\nr = knn_prever(np.zeros((4, 3)), np.array([1, 1, 0, 0]), np.ones((6, 3)), 3)",
    "expr": "[type(r).__name__, list(r.shape)]", "expected": ["ndarray", [6]],
    "name": "Um array com um rótulo por linha de X_novo" }
]
```

### Soluções erradas
```python name="soma no eixo errado"
import numpy as np


def knn_prever(X_tr, y_tr, X_novo, k):
    X_tr = np.asarray(X_tr, dtype=float)
    X_novo = np.asarray(X_novo, dtype=float)
    y_tr = np.asarray(y_tr)
    d = np.sqrt(((X_novo[:, None, :] - X_tr[None, :, :]) ** 2).sum(axis=1))
    vizinhos = np.argsort(d, axis=1, kind="stable")[:, :k]
    previsoes = []
    for linha in y_tr[vizinhos]:
        rotulos, votos = np.unique(linha, return_counts=True)
        previsoes.append(rotulos[np.argmax(votos)])
    return np.array(previsoes)
```
```python name="pula o vizinho mais próximo"
import numpy as np


def knn_prever(X_tr, y_tr, X_novo, k):
    X_tr = np.asarray(X_tr, dtype=float)
    X_novo = np.asarray(X_novo, dtype=float)
    y_tr = np.asarray(y_tr)
    d = np.sqrt(((X_novo[:, None, :] - X_tr[None, :, :]) ** 2).sum(axis=2))
    vizinhos = np.argsort(d, axis=1, kind="stable")[:, 1:k + 1]
    previsoes = []
    for linha in y_tr[vizinhos]:
        rotulos, votos = np.unique(linha, return_counts=True)
        previsoes.append(rotulos[np.argmax(votos)])
    return np.array(previsoes)
```
```python name="vota com o treino inteiro"
import numpy as np


def knn_prever(X_tr, y_tr, X_novo, k):
    X_tr = np.asarray(X_tr, dtype=float)
    X_novo = np.asarray(X_novo, dtype=float)
    y_tr = np.asarray(y_tr)
    d = np.sqrt(((X_novo[:, None, :] - X_tr[None, :, :]) ** 2).sum(axis=2))
    vizinhos = np.argsort(d, axis=1, kind="stable")[:, :k]
    previsoes = []
    for linha in y_tr[vizinhos]:
        rotulos, votos = np.unique(y_tr, return_counts=True)
        previsoes.append(rotulos[np.argmax(votos)])
    return np.array(previsoes)
```
```python name="vota com as posições"
import numpy as np


def knn_prever(X_tr, y_tr, X_novo, k):
    X_tr = np.asarray(X_tr, dtype=float)
    X_novo = np.asarray(X_novo, dtype=float)
    y_tr = np.asarray(y_tr)
    d = np.sqrt(((X_novo[:, None, :] - X_tr[None, :, :]) ** 2).sum(axis=2))
    vizinhos = np.argsort(d, axis=1, kind="stable")[:, :k]
    previsoes = []
    for linha in y_tr[vizinhos]:
        rotulos, votos = np.unique(vizinhos, return_counts=True)
        previsoes.append(rotulos[np.argmax(votos)])
    return np.array(previsoes)
```
```python name="desempate pelo vizinho que aparece primeiro"
import numpy as np


def knn_prever(X_tr, y_tr, X_novo, k):
    X_tr = np.asarray(X_tr, dtype=float)
    X_novo = np.asarray(X_novo, dtype=float)
    y_tr = np.asarray(y_tr)
    d = np.sqrt(((X_novo[:, None, :] - X_tr[None, :, :]) ** 2).sum(axis=2))
    vizinhos = np.argsort(d, axis=1, kind="stable")[:, :k]
    previsoes = []
    for linha in y_tr[vizinhos]:
        rotulos, votos = np.unique(linha, return_counts=True)
        previsoes.append(max(linha.tolist(), key=linha.tolist().count))
    return np.array(previsoes)
```
```python name="um vizinho a mais"
import numpy as np


def knn_prever(X_tr, y_tr, X_novo, k):
    X_tr = np.asarray(X_tr, dtype=float)
    X_novo = np.asarray(X_novo, dtype=float)
    y_tr = np.asarray(y_tr)
    d = np.sqrt(((X_novo[:, None, :] - X_tr[None, :, :]) ** 2).sum(axis=2))
    vizinhos = np.argsort(d, axis=1, kind="stable")[:, :k + 1]
    previsoes = []
    for linha in y_tr[vizinhos]:
        rotulos, votos = np.unique(linha, return_counts=True)
        previsoes.append(rotulos[np.argmax(votos)])
    return np.array(previsoes)
```

## Passo 4 · Leitura · Escala e a escolha de k

A distância soma diferenças de todos os atributos, cada um na sua unidade. Se um atributo é o gasto anual em reais (milhares) e outro é o número de visitas no mês (de 0 a 30), uma diferença de R\$ 500,00 pesa mais que qualquer diferença de visitas: o kNN passa a olhar praticamente só o gasto. Por isso o kNN quase sempre vem depois de uma **padronização** com as estatísticas do treino, como na m4-01:

```python
escalador = StandardScaler().fit(X_treino)
modelo = KNeighborsClassifier(n_neighbors=5).fit(escalador.transform(X_treino), y_treino)
modelo.score(escalador.transform(X_val), y_val)
```

Num conjunto do exercício, com um atributo informativo em unidades e um ruído em milhares, a acurácia na validação com $k = 5$ cai de 0,70 com padronização para 0,45 sem ela, pior que chutar a classe mais comum. Padronizar a validação com as estatísticas dela mesma é outro erro: o mesmo valor bruto vira números diferentes nos dois conjuntos.

O hiperparâmetro $k$ controla a suavidade da fronteira. Com $k = 1$, cada ponto do treino manda numa pequena região em volta dele; a fronteira contorna cada ponto fora do lugar, e a acurácia no treino é sempre 1, como a Previsão mostrou. Com $k$ grande, a vizinhança cobre boa parte do conjunto, a fronteira fica lisa e, no limite $k = n$, o modelo responde sempre a classe majoritária. O $k$ se escolhe na **validação**, nunca pelo erro no treino. Em problemas binários, prefira $k$ ímpar: com $k$ par, empates de votos acontecem e são resolvidos por uma regra arbitrária.

O kNN também faz **regressão**: a previsão é a média do alvo dos $k$ vizinhos. Com `weights="distance"`, cada vizinho pesa $1/d$, e vizinhos muito próximos mandam mais:

$$
\hat y = \frac{\sum_{i \in V} y_i / d_i}{\sum_{i \in V} 1 / d_i}
$$

Se um vizinho está exatamente no ponto ($d = 0$), a conta divide por zero. O scikit-learn trata esse caso dando peso 1 aos vizinhos com distância zero e peso 0 aos outros: a previsão é a média dos pontos idênticos.

```python
KNeighborsRegressor(n_neighbors=3, weights="distance").fit(X, y).predict(X_novo)
```

## Passo 5 · Exercício · Regressão e acurácia por k

Escreva a regressão por vizinhos e a busca de $k$ na validação. Na segunda função, use o scikit-learn.

### Instruções
1. `knn_regressao(X_tr, y_tr, X_novo, k, pesos="uniform")` devolve um array com uma previsão por linha de `X_novo`: a média do alvo dos `k` vizinhos mais próximos (empates de distância pelo menor índice) com `pesos="uniform"`, e a média ponderada por $1/d$ com `pesos="distance"`.
2. Com `"distance"`, se algum vizinho tem distância zero, a previsão é a média dos vizinhos com distância zero, sem `nan` e sem `inf`.
3. `acuracia_por_k(X_tr, y_tr, X_va, y_va, ks)` padroniza os dados com um `StandardScaler` ajustado **só no treino**, treina um `KNeighborsClassifier(n_neighbors=k)` para cada `k` de `ks` e devolve a lista das acurácias na **validação**, como `float`s, na ordem de `ks`.

### Código inicial
```python
import numpy as np
from sklearn.neighbors import KNeighborsClassifier
from sklearn.preprocessing import StandardScaler


def knn_regressao(X_tr, y_tr, X_novo, k, pesos="uniform"):
    pass


def acuracia_por_k(X_tr, y_tr, X_va, y_va, ks):
    pass
```

### Solução
```python
import numpy as np
from sklearn.neighbors import KNeighborsClassifier
from sklearn.preprocessing import StandardScaler


def knn_regressao(X_tr, y_tr, X_novo, k, pesos="uniform"):
    X_tr = np.asarray(X_tr, dtype=float)
    X_novo = np.asarray(X_novo, dtype=float)
    y_tr = np.asarray(y_tr, dtype=float)
    d = np.sqrt(((X_novo[:, None, :] - X_tr[None, :, :]) ** 2).sum(axis=2))
    vizinhos = np.argsort(d, axis=1, kind="stable")[:, :k]
    dist = np.take_along_axis(d, vizinhos, axis=1)
    alvo = y_tr[vizinhos]
    if pesos == "uniform":
        return alvo.mean(axis=1)
    exatos = dist == 0
    with np.errstate(divide="ignore"):
        w = np.where(exatos.any(axis=1, keepdims=True), exatos.astype(float), 1.0 / dist)
    return (w * alvo).sum(axis=1) / w.sum(axis=1)


def acuracia_por_k(X_tr, y_tr, X_va, y_va, ks):
    escalador = StandardScaler().fit(X_tr)
    A = escalador.transform(X_tr)
    B = escalador.transform(X_va)
    return [float(KNeighborsClassifier(n_neighbors=k).fit(A, y_tr).score(B, y_va)) for k in ks]
```

### Dicas
1. O `np.take_along_axis(d, vizinhos, axis=1)` pega, linha a linha, as distâncias dos vizinhos escolhidos.
2. Para o caso da distância zero, monte a matriz de pesos inteira: nas linhas com algum zero, peso 1 para os zeros e 0 para o resto; nas outras, $1/d$. O `np.errstate(divide="ignore")` cala o aviso da divisão que você vai descartar.
3. Ajuste o escalador uma vez, fora do laço dos `k`; o `score` do classificador já é a acurácia.

### Verificação
```json
[
  { "id": "uniforme", "checkpoint": 1, "kind": "expr",
    "expr": "knn_regressao([[0.0], [1.0], [3.0], [6.0]], [1.0, 2.0, 4.0, 10.0], [[2.0], [5.0]], 2).tolist()", "expected": [3.0, 7.0], "tolerance": 1e-12,
    "name": "Média simples dos 2 vizinhos",
    "hint": "Com x = 2, os pontos 1 e 3 estão à mesma distância; com x = 5, os vizinhos são 3 e 6." },
  { "id": "distancia", "checkpoint": 1, "kind": "expr",
    "expr": "knn_regressao([[0.0], [1.0], [3.0], [6.0]], [1.0, 2.0, 4.0, 10.0], [[2.0], [5.0]], 2, 'distance').tolist()", "expected": [3.0, 8.0], "tolerance": 1e-12,
    "name": "Pesos 1/d: o vizinho mais perto pesa mais",
    "hint": "Com x = 5, as distâncias são 1 (alvo 10) e 2 (alvo 4)." },
  { "id": "distancia-zero", "checkpoint": 2, "kind": "expr",
    "expr": "knn_regressao([[0.0], [1.0], [3.0], [6.0]], [1.0, 2.0, 4.0, 10.0], [[2.5], [1.0]], 3, 'distance').tolist()", "expected": [3.1739130434782616, 2.0], "tolerance": 1e-12,
    "name": "Um vizinho a distância zero define a previsão",
    "hint": "Com x = 1, o ponto 1 está exatamente ali: 1/0 não pode entrar na conta." },
  { "id": "referencia-regressao", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np\nfrom sklearn.neighbors import KNeighborsRegressor\nrng = np.random.default_rng(9)\nX = rng.normal(size=(60, 3))\ny = X @ np.array([1.0, -2.0, 0.5]) + rng.normal(size=60)\nXn = rng.normal(size=(20, 3))\nref = [KNeighborsRegressor(n_neighbors=4, weights=p).fit(X, y).predict(Xn) for p in ('uniform', 'distance')]",
    "expr": "[bool(np.allclose(knn_regressao(X, y, Xn, 4, p), r)) for p, r in zip(('uniform', 'distance'), ref)]", "expected": [true, true],
    "name": "Igual ao KNeighborsRegressor(4) com pesos uniformes e por distância",
    "hint": "A expressão compara as suas previsões com as do KNeighborsRegressor nos dois tipos de peso." },
  { "id": "regressao-tipo", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np",
    "expr": "knn_regressao(np.zeros((3, 2)), np.array([1.0, 2.0, 3.0]), np.ones((5, 2)), 2)", "type": "ndarray",
    "name": "A regressão devolve um array" },
  { "id": "acuracias", "checkpoint": 3, "kind": "expr",
    "setup": "import numpy as np\ndef gerar(semente, n):\n    rng = np.random.default_rng(semente)\n    y = rng.integers(0, 2, n)\n    X = np.column_stack([y * 1.5 + rng.normal(0, 1, n), rng.normal(0, 1000, n)])\n    return X, y\nXt, yt = gerar(1, 120)\nXv, yv = gerar(2, 60)",
    "expr": "acuracia_por_k(Xt, yt, Xv, yv, [1, 5, 15])", "expected": [0.7, 0.7, 0.6833333333333333], "tolerance": 1e-9,
    "name": "Acurácia na validação para k = 1, 5 e 15, com um atributo em milhares",
    "hint": "Padronize com as estatísticas do treino antes de medir distâncias, e meça na validação." },
  { "id": "acuracias-tipos", "checkpoint": 3, "kind": "expr",
    "setup": "import numpy as np\nr = acuracia_por_k(np.array([[0.0], [1.0], [5.0], [6.0]]), np.array([0, 0, 1, 1]), np.array([[0.5], [5.5]]), np.array([0, 1]), [1, 3])",
    "expr": "[type(r).__name__, [type(v).__name__ for v in r], r]", "expected": ["list", ["float", "float"], [1.0, 1.0]],
    "name": "Uma lista de float, uma por k" }
]
```

### Soluções erradas
```python name="pesos 1/d sem tratar a distância zero"
import numpy as np
from sklearn.neighbors import KNeighborsClassifier
from sklearn.preprocessing import StandardScaler


def knn_regressao(X_tr, y_tr, X_novo, k, pesos="uniform"):
    X_tr = np.asarray(X_tr, dtype=float)
    X_novo = np.asarray(X_novo, dtype=float)
    y_tr = np.asarray(y_tr, dtype=float)
    d = np.sqrt(((X_novo[:, None, :] - X_tr[None, :, :]) ** 2).sum(axis=2))
    vizinhos = np.argsort(d, axis=1, kind="stable")[:, :k]
    dist = np.take_along_axis(d, vizinhos, axis=1)
    alvo = y_tr[vizinhos]
    if pesos == "uniform":
        return alvo.mean(axis=1)
    w = 1.0 / dist
    return (w * alvo).sum(axis=1) / w.sum(axis=1)


def acuracia_por_k(X_tr, y_tr, X_va, y_va, ks):
    escalador = StandardScaler().fit(X_tr)
    A = escalador.transform(X_tr)
    B = escalador.transform(X_va)
    return [float(KNeighborsClassifier(n_neighbors=k).fit(A, y_tr).score(B, y_va)) for k in ks]
```
```python name="pesos 1/d²"
import numpy as np
from sklearn.neighbors import KNeighborsClassifier
from sklearn.preprocessing import StandardScaler


def knn_regressao(X_tr, y_tr, X_novo, k, pesos="uniform"):
    X_tr = np.asarray(X_tr, dtype=float)
    X_novo = np.asarray(X_novo, dtype=float)
    y_tr = np.asarray(y_tr, dtype=float)
    d = np.sqrt(((X_novo[:, None, :] - X_tr[None, :, :]) ** 2).sum(axis=2))
    vizinhos = np.argsort(d, axis=1, kind="stable")[:, :k]
    dist = np.take_along_axis(d, vizinhos, axis=1)
    alvo = y_tr[vizinhos]
    if pesos == "uniform":
        return alvo.mean(axis=1)
    exatos = dist == 0
    with np.errstate(divide="ignore"):
        w = np.where(exatos.any(axis=1, keepdims=True), exatos.astype(float), 1.0 / dist ** 2)
    return (w * alvo).sum(axis=1) / w.sum(axis=1)


def acuracia_por_k(X_tr, y_tr, X_va, y_va, ks):
    escalador = StandardScaler().fit(X_tr)
    A = escalador.transform(X_tr)
    B = escalador.transform(X_va)
    return [float(KNeighborsClassifier(n_neighbors=k).fit(A, y_tr).score(B, y_va)) for k in ks]
```
```python name="mediana dos vizinhos"
import numpy as np
from sklearn.neighbors import KNeighborsClassifier
from sklearn.preprocessing import StandardScaler


def knn_regressao(X_tr, y_tr, X_novo, k, pesos="uniform"):
    X_tr = np.asarray(X_tr, dtype=float)
    X_novo = np.asarray(X_novo, dtype=float)
    y_tr = np.asarray(y_tr, dtype=float)
    d = np.sqrt(((X_novo[:, None, :] - X_tr[None, :, :]) ** 2).sum(axis=2))
    vizinhos = np.argsort(d, axis=1, kind="stable")[:, :k]
    dist = np.take_along_axis(d, vizinhos, axis=1)
    alvo = y_tr[vizinhos]
    if pesos == "uniform":
        return np.median(alvo, axis=1)
    exatos = dist == 0
    with np.errstate(divide="ignore"):
        w = np.where(exatos.any(axis=1, keepdims=True), exatos.astype(float), 1.0 / dist)
    return (w * alvo).sum(axis=1) / w.sum(axis=1)


def acuracia_por_k(X_tr, y_tr, X_va, y_va, ks):
    escalador = StandardScaler().fit(X_tr)
    A = escalador.transform(X_tr)
    B = escalador.transform(X_va)
    return [float(KNeighborsClassifier(n_neighbors=k).fit(A, y_tr).score(B, y_va)) for k in ks]
```
```python name="ignora os pesos"
import numpy as np
from sklearn.neighbors import KNeighborsClassifier
from sklearn.preprocessing import StandardScaler


def knn_regressao(X_tr, y_tr, X_novo, k, pesos="uniform"):
    X_tr = np.asarray(X_tr, dtype=float)
    X_novo = np.asarray(X_novo, dtype=float)
    y_tr = np.asarray(y_tr, dtype=float)
    d = np.sqrt(((X_novo[:, None, :] - X_tr[None, :, :]) ** 2).sum(axis=2))
    vizinhos = np.argsort(d, axis=1, kind="stable")[:, :k]
    return y_tr[vizinhos].mean(axis=1)


def acuracia_por_k(X_tr, y_tr, X_va, y_va, ks):
    escalador = StandardScaler().fit(X_tr)
    A = escalador.transform(X_tr)
    B = escalador.transform(X_va)
    return [float(KNeighborsClassifier(n_neighbors=k).fit(A, y_tr).score(B, y_va)) for k in ks]
```
```python name="sem padronizar"
import numpy as np
from sklearn.neighbors import KNeighborsClassifier
from sklearn.preprocessing import StandardScaler


def knn_regressao(X_tr, y_tr, X_novo, k, pesos="uniform"):
    X_tr = np.asarray(X_tr, dtype=float)
    X_novo = np.asarray(X_novo, dtype=float)
    y_tr = np.asarray(y_tr, dtype=float)
    d = np.sqrt(((X_novo[:, None, :] - X_tr[None, :, :]) ** 2).sum(axis=2))
    vizinhos = np.argsort(d, axis=1, kind="stable")[:, :k]
    dist = np.take_along_axis(d, vizinhos, axis=1)
    alvo = y_tr[vizinhos]
    if pesos == "uniform":
        return alvo.mean(axis=1)
    exatos = dist == 0
    with np.errstate(divide="ignore"):
        w = np.where(exatos.any(axis=1, keepdims=True), exatos.astype(float), 1.0 / dist)
    return (w * alvo).sum(axis=1) / w.sum(axis=1)


def acuracia_por_k(X_tr, y_tr, X_va, y_va, ks):
    return [float(KNeighborsClassifier(n_neighbors=k).fit(X_tr, y_tr).score(X_va, y_va)) for k in ks]
```
```python name="padroniza a validação com as próprias estatísticas"
import numpy as np
from sklearn.neighbors import KNeighborsClassifier
from sklearn.preprocessing import StandardScaler


def knn_regressao(X_tr, y_tr, X_novo, k, pesos="uniform"):
    X_tr = np.asarray(X_tr, dtype=float)
    X_novo = np.asarray(X_novo, dtype=float)
    y_tr = np.asarray(y_tr, dtype=float)
    d = np.sqrt(((X_novo[:, None, :] - X_tr[None, :, :]) ** 2).sum(axis=2))
    vizinhos = np.argsort(d, axis=1, kind="stable")[:, :k]
    dist = np.take_along_axis(d, vizinhos, axis=1)
    alvo = y_tr[vizinhos]
    if pesos == "uniform":
        return alvo.mean(axis=1)
    exatos = dist == 0
    with np.errstate(divide="ignore"):
        w = np.where(exatos.any(axis=1, keepdims=True), exatos.astype(float), 1.0 / dist)
    return (w * alvo).sum(axis=1) / w.sum(axis=1)


def acuracia_por_k(X_tr, y_tr, X_va, y_va, ks):
    A = StandardScaler().fit_transform(X_tr)
    B = StandardScaler().fit_transform(X_va)
    return [float(KNeighborsClassifier(n_neighbors=k).fit(A, y_tr).score(B, y_va)) for k in ks]
```
```python name="acurácia no treino"
import numpy as np
from sklearn.neighbors import KNeighborsClassifier
from sklearn.preprocessing import StandardScaler


def knn_regressao(X_tr, y_tr, X_novo, k, pesos="uniform"):
    X_tr = np.asarray(X_tr, dtype=float)
    X_novo = np.asarray(X_novo, dtype=float)
    y_tr = np.asarray(y_tr, dtype=float)
    d = np.sqrt(((X_novo[:, None, :] - X_tr[None, :, :]) ** 2).sum(axis=2))
    vizinhos = np.argsort(d, axis=1, kind="stable")[:, :k]
    dist = np.take_along_axis(d, vizinhos, axis=1)
    alvo = y_tr[vizinhos]
    if pesos == "uniform":
        return alvo.mean(axis=1)
    exatos = dist == 0
    with np.errstate(divide="ignore"):
        w = np.where(exatos.any(axis=1, keepdims=True), exatos.astype(float), 1.0 / dist)
    return (w * alvo).sum(axis=1) / w.sum(axis=1)


def acuracia_por_k(X_tr, y_tr, X_va, y_va, ks):
    escalador = StandardScaler().fit(X_tr)
    A = escalador.transform(X_tr)
    return [float(KNeighborsClassifier(n_neighbors=k).fit(A, y_tr).score(A, y_tr)) for k in ks]
```

## Passo 6 · Leitura · A maldição da dimensionalidade

O kNN depende de uma promessa: os vizinhos mais próximos são parecidos e os distantes, não. Em poucas dimensões isso vale. Em muitas, a promessa enfraquece: sorteando pontos uniformes no cubo $[0, 1]^d$, a razão entre a maior e a menor distância de um ponto aos outros se aproxima de 1 à medida que $d$ cresce.

$$
\frac{\max_i d(x, x_i)}{\min_i d(x, x_i)} \xrightarrow{\; d \to \infty \;} 1
$$

Com 200 pontos sorteados (semente 3), a razão é cerca de 35 em 2 dimensões, 3,1 em 10, 1,3 em 100 e 1,1 em 1 000. Em 1 000 dimensões, o "vizinho mais próximo" está só 10 % mais perto que o mais distante: a vizinhança deixa de dizer muita coisa. A intuição é que cada atributo soma um pouco de ruído à distância, e a soma de muitos ruídos independentes concentra em torno da média (é a lei dos grandes números do Nível 4). Por isso o kNN funciona melhor com poucos atributos relevantes, e atributos irrelevantes pioram o resultado mesmo que sejam padronizados.

O outro custo do kNN é na previsão. Sem treino, cada ponto novo é comparado com os $n$ pontos guardados: $O(n \cdot d)$ operações por consulta, e a memória guarda o conjunto inteiro. No Nível 3 você viu estruturas que evitam olhar tudo; o scikit-learn usa árvores de busca, a **KD-tree** e a **ball tree** (`algorithm="kd_tree"`, `"ball_tree"`, escolhidas automaticamente por `"auto"`), que dividem o espaço em regiões e descartam regiões inteiras longe demais. Elas ajudam muito em poucas dimensões e perdem a vantagem em muitas, pela mesma maldição: quase todas as regiões ficam "perto o suficiente".

A conta da razão é um bom exercício de vetorização. Sorteie os pontos de uma vez, subtraia a consulta de todas as linhas por broadcasting e reduza no eixo dos atributos:

```python
rng = np.random.default_rng(semente)
pontos = rng.random((n + 1, d))       # a linha 0 é a consulta
diferencas = pontos[1:] - pontos[0]   # forma (n, d)
```

Um laço Python sobre os pontos daria o mesmo número, só que muito mais devagar em 1 000 dimensões; a correção cobra a versão vetorizada pela estrutura do código, nunca pelo relógio.

## Passo 7 · Exercício · Distâncias em alta dimensão

Escreva o experimento da razão entre distâncias, vetorizado.

### Instruções
1. `razao_distancias(d, n, semente)` cria `rng = np.random.default_rng(semente)` e sorteia **de uma vez** `rng.random((n + 1, d))`: a linha 0 é a consulta e as outras `n` linhas são os pontos.
2. Calcula a distância euclidiana da consulta a cada um dos `n` pontos (a consulta não é comparada com ela mesma) e devolve `max / min` como `float`.
3. A função não usa laço `for` nem compreensão de lista.

### Código inicial
```python
import numpy as np


def razao_distancias(d, n, semente):
    pass
```

### Solução
```python
import numpy as np


def razao_distancias(d, n, semente):
    rng = np.random.default_rng(semente)
    pontos = rng.random((n + 1, d))
    distancias = np.sqrt(((pontos[1:] - pontos[0]) ** 2).sum(axis=1))
    return float(distancias.max() / distancias.min())
```

### Dicas
1. `pontos[1:] - pontos[0]` subtrai a consulta de todas as outras linhas por broadcasting.
2. A soma dos quadrados é no eixo dos atributos (`axis=1`), e a raiz vem depois da soma.
3. Use só o gerador criado com a semente recebida.

### Verificação
```json
[
  { "id": "duas-dimensoes", "checkpoint": 2, "kind": "call", "function": "razao_distancias", "args": [2, 50, 0], "expected": 10.701067364330816, "tolerance": 1e-9,
    "name": "d = 2, n = 50, semente 0",
    "hint": "Sorteie rng.random((n + 1, d)) de uma vez; a linha 0 é a consulta." },
  { "id": "cem-dimensoes", "checkpoint": 2, "kind": "call", "function": "razao_distancias", "args": [100, 200, 1], "expected": 1.3526221917861891, "tolerance": 1e-9,
    "name": "d = 100, n = 200, semente 1",
    "hint": "A razão é entre distâncias euclidianas (com a raiz), a maior sobre a menor." },
  { "id": "tipo", "checkpoint": 2, "kind": "expr", "expr": "razao_distancias(5, 20, 2)", "type": "float",
    "name": "Devolve um float do Python" },
  { "id": "mesma-semente", "checkpoint": 1, "kind": "expr", "expr": "razao_distancias(10, 100, 7) == razao_distancias(10, 100, 7)", "expected": true,
    "name": "A mesma semente dá a mesma razão" },
  { "id": "sementes-diferentes", "checkpoint": 1, "kind": "expr", "expr": "razao_distancias(10, 100, 7) != razao_distancias(10, 100, 8)", "expected": true,
    "name": "Sementes diferentes dão razões diferentes",
    "hint": "Crie o gerador com a semente recebida, dentro da função." },
  { "id": "decrescente", "checkpoint": 2, "kind": "expr",
    "setup": "r = [razao_distancias(d, 200, 3) for d in (2, 10, 100, 1000)]",
    "expr": "[r[0] > r[1] > r[2] > r[3] > 1.0, round(r[3], 2)]", "expected": [true, 1.11],
    "name": "A razão cai com a dimensão: 2, 10, 100 e 1 000",
    "hint": "Em 1 000 dimensões, o mais distante fica só cerca de 10 % mais longe que o mais próximo." },
  { "id": "sem-for", "checkpoint": 3, "kind": "source", "rule": { "type": "not_uses", "construct": "for", "function": "razao_distancias" },
    "name": "Sem laço for" },
  { "id": "sem-compreensao", "checkpoint": 3, "kind": "source", "rule": { "type": "not_uses", "construct": "list_comprehension", "function": "razao_distancias" },
    "name": "Sem compreensão de lista" }
]
```

### Soluções erradas
```python name="laço sobre os pontos"
import numpy as np


def razao_distancias(d, n, semente):
    rng = np.random.default_rng(semente)
    pontos = rng.random((n + 1, d))
    distancias = []
    for p in pontos[1:]:
        distancias.append(np.sqrt(np.sum((p - pontos[0]) ** 2)))
    return float(max(distancias) / min(distancias))
```
```python name="compara a consulta com ela mesma"
import numpy as np


def razao_distancias(d, n, semente):
    rng = np.random.default_rng(semente)
    pontos = rng.random((n + 1, d))
    distancias = np.sqrt(((pontos - pontos[0]) ** 2).sum(axis=1))
    return float(distancias.max() / distancias.min())
```
```python name="razão invertida"
import numpy as np


def razao_distancias(d, n, semente):
    rng = np.random.default_rng(semente)
    pontos = rng.random((n + 1, d))
    distancias = np.sqrt(((pontos[1:] - pontos[0]) ** 2).sum(axis=1))
    return float(distancias.min() / distancias.max())
```
```python name="distâncias ao quadrado"
import numpy as np


def razao_distancias(d, n, semente):
    rng = np.random.default_rng(semente)
    pontos = rng.random((n + 1, d))
    distancias = ((pontos[1:] - pontos[0]) ** 2).sum(axis=1)
    return float(distancias.max() / distancias.min())
```
```python name="gerador sem a semente"
import numpy as np


def razao_distancias(d, n, semente):
    rng = np.random.default_rng()
    pontos = rng.random((n + 1, d))
    distancias = np.sqrt(((pontos[1:] - pontos[0]) ** 2).sum(axis=1))
    return float(distancias.max() / distancias.min())
```
```python name="gerador global do numpy"
import numpy as np


def razao_distancias(d, n, semente):
    np.random.seed(semente)
    pontos = np.random.random((n + 1, d))
    distancias = np.sqrt(((pontos[1:] - pontos[0]) ** 2).sum(axis=1))
    return float(distancias.max() / distancias.min())
```

## Passo 8 · Quiz · k par e escala

### Pergunta
Um classificador de clientes fictícios usa kNN com dois atributos: renda mensal (de R\$ 1 000,00 a R\$ 20 000,00) e número de compras no ano (de 0 a 40). Sem padronizar, a acurácia na validação é 0,52; com `StandardScaler` ajustado no treino, 0,81. O que explica a diferença?
- [ ] O kNN precisa de atributos com média zero para calcular a distância, senão ela sai negativa
- [x] Sem padronizar, diferenças de renda em milhares dominam a distância, e o número de compras quase não influencia quem é vizinho de quem
- [ ] A padronização aumenta o número de vizinhos usados na votação
- [ ] A padronização vaza informação da validação para o treino e infla a acurácia
> A distância soma as diferenças de cada atributo nas suas unidades: uma diferença de R\$ 300,00 pesa como 300 compras. Padronizar coloca os dois atributos na mesma escala. A distância nunca é negativa, o $k$ não muda, e um escalador ajustado só no treino não vaza nada da validação.

### Pergunta
Num problema binário, alguém escolhe $k = 4$ e observa que, para alguns clientes, a previsão muda quando a ordem das linhas do treino é embaralhada (com a mesma distância para todos os pontos). Qual é a causa mais provável?
- [ ] O kNN sorteia os vizinhos a cada previsão
- [x] Com $k$ par, a votação pode empatar em 2 a 2, e o desempate (ou o empate de distâncias) depende de uma regra arbitrária; com $k$ ímpar, a votação binária nunca empata
- [ ] A padronização muda com a ordem das linhas
- [ ] O $k$ precisa ser primo para a votação funcionar
> O kNN é determinístico: não há sorteio. Com duas classes e $k$ par, um empate 2 a 2 é possível, e a resposta passa a depender da regra de desempate e, com distâncias iguais, de quem vem primeiro no treino. A média e o desvio da padronização não dependem da ordem. Com $k$ ímpar, a votação entre duas classes sempre tem maioria.

### Pergunta
Para escolher $k$, um colega treina o kNN com $k$ de 1 a 30 e mede a acurácia **no próprio treino**. O melhor resultado é $k = 1$, com acurácia 1,0. O que está errado?
- [ ] Nada: acurácia 1,0 mostra que $k = 1$ é o melhor
- [ ] O problema é só o intervalo: ele deveria testar até $k = n$
- [x] Com $k = 1$, cada ponto do treino é vizinho de si mesmo e sempre acerta; o $k$ precisa ser escolhido num conjunto de validação
- [ ] O kNN não tem hiperparâmetros a escolher, então qualquer $k$ serve
> A distância de um ponto a ele mesmo é zero, então $k = 1$ decora o treino e tem acurácia 1,0 em qualquer conjunto. Isso não diz nada sobre dados novos. Ampliar o intervalo não muda o viés da medição. O $k$ é o principal hiperparâmetro do kNN e se escolhe na validação (ou com validação cruzada, no módulo 4).
