---
slug: n5-m5-02-florestas-aleatorias
titulo: Bagging e florestas aleatórias
descricao: Bootstrap e agregação, subamostragem de atributos, erro out-of-bag, por que a floresta reduz variância, e hiperparâmetros que importam.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- pandas
- scikit-learn
xp: 120
tempo_min: 50
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Implementar bagging de árvores do zero e medir a redução de variância
- Explicar o papel da subamostragem de atributos e usar o erro out-of-bag como validação
- Ajustar RandomForestClassifier/Regressor e seus hiperparâmetros principais
---

## Passo 1 · Leitura · A média de modelos instáveis

A lição anterior terminou com um defeito: a árvore funda é instável. Treinada em outra amostra dos mesmos clientes, ela muda de forma. Na linguagem do módulo 4, a árvore funda tem viés baixo, porque representa regras complicadas, e variância alta, porque cada folha depende de poucos clientes. A estatística do Nível 4 sugere o remédio: a média de muitas medições ruidosas varia menos que cada medição. Se $B$ modelos têm previsões com variância $\sigma^2$ cada e correlação $\rho$ entre dois quaisquer, a média deles tem variância

$$
\operatorname{Var}\Big(\frac{1}{B}\sum_{b=1}^{B} f_b(x)\Big) = \rho\,\sigma^2 + \frac{1-\rho}{B}\,\sigma^2
$$

Com modelos independentes ($\rho = 0$), sobra o $\sigma^2/B$ do erro padrão da média; com modelos idênticos ($\rho = 1$), a média não ajuda nada. Aumentar $B$ só derruba o segundo termo: o primeiro, $\rho\,\sigma^2$, fica como piso. Para ir além do piso, as árvores precisam ser **menos parecidas entre si**.

Só existe um conjunto de treino, mas o **bootstrap** fabrica outros a partir dele: sorteie $n$ linhas **com reposição** entre as $n$ do treino. Cada amostra repete algumas linhas e deixa outras de fora, e a árvore treinada em cada amostra sai um pouco diferente das demais.

```python
rng = np.random.default_rng(semente)
indices = rng.integers(0, n, size=n)        # n sorteios com reposição
arvore = DecisionTreeClassifier(random_state=semente).fit(X[indices], y[indices])
```

A chance de uma linha ficar fora de uma amostra é $(1 - 1/n)^n$, que tende a $e^{-1} \approx 0{,}368$ quando $n$ cresce: cada árvore vê cerca de 63,2 % das linhas distintas. As linhas que ficaram de fora são a **fora da bolsa** (*out-of-bag*) daquela árvore, e o passo 6 as transforma numa validação gratuita. Sortear **sem** reposição (`rng.permutation(n)`) só embaralha as linhas: toda árvore vê o treino inteiro e sai igual às outras, com $\rho = 1$.

O procedimento completo, bootstrap seguido de agregação, chama-se **bagging** (*bootstrap aggregating*): na classificação, cada árvore vota e vence a classe mais votada; na regressão, tira-se a média das previsões. A floresta aleatória, do passo 4, acrescenta um segundo sorteio para baixar ainda mais o $\rho$.

## Passo 2 · Previsão · O que fica fora da bolsa

O programa examina um bootstrap de 8 linhas escrito à mão e calcula a chance de uma linha ficar fora para três tamanhos de conjunto. Leia sem executar e digite o que ele imprime.

### Código
```python
import numpy as np

n = 8
indices = np.array([3, 0, 3, 5, 1, 0, 3, 7])
dentro = np.unique(indices)
fora = np.setdiff1d(np.arange(n), indices)
print(dentro.tolist())
print(fora.tolist())
print(len(dentro) / n)
print(np.bincount(indices, minlength=n).tolist())
for m in [2, 10, 1000]:
    print(m, round((1 - 1 / m) ** m, 3))
```

### Dicas
1. O `np.setdiff1d(a, b)` devolve, em ordem crescente, os valores de `a` que não aparecem em `b`.
2. O `np.bincount` conta quantas vezes cada inteiro de 0 a `minlength - 1` aparece.
3. $(1/2)^2 = 0{,}25$; $0{,}9^{10} \approx 0{,}3487$; e $(1 - 1/1000)^{1000}$ já está muito perto de $e^{-1} \approx 0{,}3679$.

### Saída esperada
```text
[0, 1, 3, 5, 7]
[2, 4, 6]
0.625
[2, 1, 0, 3, 0, 1, 0, 1]
2 0.25
10 0.349
1000 0.368
```

## Passo 3 · Exercício · Bootstrap e fora da bolsa
modo: lacunas

Complete as lacunas (`___`) das duas peças do bagging: a amostra bootstrap e as linhas que ficaram fora dela.

### Instruções
1. `amostra_bootstrap(n, semente)` cria um gerador com `np.random.default_rng(semente)` e devolve um array com `n` índices sorteados **com reposição** entre `0` e `n - 1`, com `rng.integers(0, n, size=n)`.
2. `fora_da_bolsa(indices, n)` devolve um array, em ordem crescente, com os índices de `0` a `n - 1` que **não** aparecem em `indices`.

### Código inicial
```python
import numpy as np


def amostra_bootstrap(n, semente):
    rng = np.random.default_rng(___)
    return ___


def fora_da_bolsa(indices, n):
    return np.setdiff1d(___, ___)
```

### Solução
```python
import numpy as np


def amostra_bootstrap(n, semente):
    rng = np.random.default_rng(semente)
    return rng.integers(0, n, size=n)


def fora_da_bolsa(indices, n):
    return np.setdiff1d(np.arange(n), indices)
```

### Dicas
1. O gerador recebe a semente para que a mesma chamada sorteie sempre os mesmos índices.
2. No `rng.integers(baixo, alto, size=...)`, o `alto` não entra no sorteio.
3. O `np.setdiff1d(a, b)` tira de `a` o que está em `b`: o primeiro argumento é o universo de índices.

### Verificação
```json
[
  { "id": "bootstrap-semente-0", "checkpoint": 1, "kind": "expr", "expr": "amostra_bootstrap(10, 0).tolist()",
    "expected": [8, 6, 5, 2, 3, 0, 0, 0, 1, 8],
    "name": "amostra_bootstrap(10, 0) sorteia os índices do rng.integers com semente 0",
    "hint": "Crie o gerador com a semente recebida e sorteie com rng.integers(0, n, size=n)." },
  { "id": "bootstrap-reproduzivel", "checkpoint": 1, "kind": "expr", "expr": "amostra_bootstrap(50, 7).tolist() == amostra_bootstrap(50, 7).tolist()",
    "expected": true, "name": "A mesma semente sorteia os mesmos índices" },
  { "id": "bootstrap-faixa", "checkpoint": 1, "kind": "expr", "setup": "a = amostra_bootstrap(1000, 3)",
    "expr": "[len(a), int(a.max())]", "expected": [1000, 999],
    "name": "1000 índices, e o último índice (999) também pode sair" },
  { "id": "bootstrap-com-reposicao", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\na = amostra_bootstrap(1000, 3)",
    "expr": "len(np.unique(a))", "expected": 643,
    "name": "Com reposição, só 643 dos 1000 índices aparecem",
    "hint": "Com reposição, alguns índices se repetem e outros não saem; sem reposição, todos aparecem uma vez cada." },
  { "id": "fora-simples", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np",
    "expr": "fora_da_bolsa(np.array([3, 0, 3, 5, 1, 0, 3, 7]), 8).tolist()", "expected": [2, 4, 6],
    "name": "Fora da bolsa de [3, 0, 3, 5, 1, 0, 3, 7] com n = 8: [2, 4, 6]",
    "hint": "Os fora da bolsa são os índices de 0 a n - 1 que não foram sorteados." },
  { "id": "fora-ultimo-indice", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np",
    "expr": "fora_da_bolsa(np.array([0, 0, 1, 1]), 4).tolist()", "expected": [2, 3],
    "name": "O último índice (n - 1) também pode ficar fora" },
  { "id": "fora-vazio", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np",
    "expr": "fora_da_bolsa(np.array([2, 1, 0]), 3).tolist()", "expected": [],
    "name": "Quando todos foram sorteados, nada fica fora" },
  { "id": "fracao-fora", "checkpoint": 2, "kind": "expr", "setup": "n = 20000\nfora = fora_da_bolsa(amostra_bootstrap(n, 11), n)",
    "expr": "round(len(fora) / n, 2)", "expected": 0.37,
    "name": "Com n = 20000, cerca de 37 % das linhas ficam fora da bolsa" }
]
```

### Soluções erradas
```python name="sorteio sem reposição"
import numpy as np


def amostra_bootstrap(n, semente):
    rng = np.random.default_rng(semente)
    return rng.permutation(n)


def fora_da_bolsa(indices, n):
    return np.setdiff1d(np.arange(n), indices)
```
```python name="o último índice nunca é sorteado"
import numpy as np


def amostra_bootstrap(n, semente):
    rng = np.random.default_rng(semente)
    return rng.integers(0, n - 1, size=n)


def fora_da_bolsa(indices, n):
    return np.setdiff1d(np.arange(n), indices)
```
```python name="gerador sem semente"
import numpy as np


def amostra_bootstrap(n, semente):
    rng = np.random.default_rng()
    return rng.integers(0, n, size=n)


def fora_da_bolsa(indices, n):
    return np.setdiff1d(np.arange(n), indices)
```
```python name="argumentos do setdiff1d trocados"
import numpy as np


def amostra_bootstrap(n, semente):
    rng = np.random.default_rng(semente)
    return rng.integers(0, n, size=n)


def fora_da_bolsa(indices, n):
    return np.setdiff1d(indices, np.arange(n))
```
```python name="universo sem o último índice"
import numpy as np


def amostra_bootstrap(n, semente):
    rng = np.random.default_rng(semente)
    return rng.integers(0, n, size=n)


def fora_da_bolsa(indices, n):
    return np.setdiff1d(np.arange(n - 1), indices)
```
```python name="universo tirado dos próprios índices"
import numpy as np


def amostra_bootstrap(n, semente):
    rng = np.random.default_rng(semente)
    return rng.integers(0, n, size=n)


def fora_da_bolsa(indices, n):
    return np.setdiff1d(np.arange(indices.max() + 1), indices)
```

## Passo 4 · Leitura · Bagging e max_features

O bagging reduz a variância, mas esbarra no piso $\rho\,\sigma^2$ da fórmula do passo 1. Se um atributo é muito forte, toda árvore o escolhe na raiz, e as árvores ficam parecidas mesmo treinadas em amostras diferentes. A **floresta aleatória** (*random forest*) acrescenta um segundo sorteio: em **cada nó**, a árvore só pode escolher a pergunta entre `max_features` atributos sorteados ali. O atributo forte fica fora de alguns nós, outras perguntas aparecem, e as árvores se descorrelacionam. Cada árvore fica um pouco pior sozinha, e a média fica melhor.

Nos clientes fictícios da lição anterior, com 30 árvores e os mesmos 100 clientes de validação:

| modelo | acurácia na validação | concordância média entre duas árvores |
|---|---|---|
| uma árvore sem limite | 0,76 | — |
| bagging (`max_features=None`) | 0,81 | 0,804 |
| floresta (`max_features="sqrt"`) | 0,84 | 0,749 |

```python
floresta = RandomForestClassifier(n_estimators=30, max_features="sqrt", random_state=0)
floresta.fit(X_treino, y_treino)
floresta.score(X_valid, y_valid)          # 0.84
```

Os padrões do scikit-learn 1.8 diferem entre as duas classes. O `RandomForestClassifier` usa `max_features="sqrt"`: $\lfloor\sqrt{d}\rfloor$ atributos por nó, aqui 1 dos 3. O `RandomForestRegressor` usa `max_features=1.0`, todos os atributos, o que é bagging puro. Menos atributos por nó descorrelacionam mais e enviesam mais cada árvore; a validação decide. Os outros hiperparâmetros: `n_estimators`, o número de árvores, que quase nunca piora o erro esperado, só custa tempo, e cujo ganho estabiliza; `max_depth` e `min_samples_leaf`, que numa floresta costumam ficar sem limite, porque é a média que controla a variância; e `n_jobs`, que treina árvores em paralelo (no executor há um processador só, e o valor não muda o resultado).

Toda floresta sorteia: as amostras bootstrap e os atributos de cada nó. Sem `random_state`, cada `fit` dá outra floresta, e três ajustes seguidos nos mesmos dados acertaram 0,83, 0,84 e 0,81 da validação. Fixe o `random_state` para um resultado reprodutível e, ao comparar duas configurações, compare médias de validação cruzada ou de várias sementes: uma diferença de 0,01 pode ser só sorte do sorteio.

## Passo 5 · Exercício · Bagging de árvores

Escreva o bagging de árvores de classificação com votação. O arquivo `clientes.py` gera os clientes fictícios das últimas lições; os casos o usam.

### Instruções
1. `bagging_arvores(X, y, X_novo, n_arvores, semente)` cria **um** gerador `np.random.default_rng(semente)` e, para cada uma das `n_arvores` árvores, sorteia uma amostra bootstrap com `rng.integers(0, n, size=n)`, sendo `n` o número de linhas de `X`.
2. Cada árvore é uma `DecisionTreeClassifier(random_state=semente)` treinada na sua amostra; ela vota com a previsão para cada linha de `X_novo`.
3. Devolve um array do numpy com a classe mais votada para cada linha de `X_novo`; um empate fica com o menor rótulo.

### Código inicial
```python
import numpy as np
from sklearn.tree import DecisionTreeClassifier


def bagging_arvores(X, y, X_novo, n_arvores, semente):
    pass
```
```text path=clientes.py
import numpy as np


def gerar_clientes(n, semente):
    rng = np.random.default_rng(semente)
    renda = rng.normal(4.0, 1.5, n).clip(0.8).round(1)
    comprometimento = rng.uniform(5, 70, n).round(0)
    idade = rng.integers(20, 70, n)
    atrasa = (comprometimento > 45) & (renda < 5.0) | (renda < 2.0)
    troca = rng.random(n) < 0.15
    X = np.column_stack([renda, comprometimento, idade])
    y = np.where(atrasa ^ troca, "atrasa", "paga")
    return X, y
```

### Solução
```python
import numpy as np
from sklearn.tree import DecisionTreeClassifier


def bagging_arvores(X, y, X_novo, n_arvores, semente):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y)
    X_novo = np.asarray(X_novo, dtype=float)
    rng = np.random.default_rng(semente)
    n = len(y)
    classes = np.unique(y)
    votos = np.zeros((len(X_novo), len(classes)), dtype=int)
    for _ in range(n_arvores):
        indices = rng.integers(0, n, size=n)
        arvore = DecisionTreeClassifier(random_state=semente).fit(X[indices], y[indices])
        previsoes = arvore.predict(X_novo)
        votos += previsoes[:, None] == classes
    return classes[votos.argmax(axis=1)]
```
```text path=clientes.py
import numpy as np


def gerar_clientes(n, semente):
    rng = np.random.default_rng(semente)
    renda = rng.normal(4.0, 1.5, n).clip(0.8).round(1)
    comprometimento = rng.uniform(5, 70, n).round(0)
    idade = rng.integers(20, 70, n)
    atrasa = (comprometimento > 45) & (renda < 5.0) | (renda < 2.0)
    troca = rng.random(n) < 0.15
    X = np.column_stack([renda, comprometimento, idade])
    y = np.where(atrasa ^ troca, "atrasa", "paga")
    return X, y
```

### Dicas
1. O gerador é criado uma vez, antes do laço: cada chamada a `rng.integers` sorteia uma amostra nova.
2. Guarde os votos numa matriz de forma `(len(X_novo), número de classes)`; com `classes = np.unique(y)`, a comparação `previsoes[:, None] == classes` marca a coluna da classe votada em cada linha.
3. O `argmax` de cada linha pega a primeira coluna máxima, ou seja, o menor rótulo num empate; devolva o rótulo que está nessa posição de `classes`.

### Verificação
```json
[
  {"id": "uma-arvore", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.model_selection import train_test_split\nfrom sklearn.tree import DecisionTreeClassifier\nfrom clientes import gerar_clientes\nX, y = gerar_clientes(400, 1)\nXtr, Xva, ytr, yva = train_test_split(X, y, test_size=0.25, random_state=0)\ni = np.random.default_rng(5).integers(0, 300, size=300)\nunica = DecisionTreeClassifier(random_state=5).fit(Xtr[i], ytr[i])", "expr": "bagging_arvores(Xtr, ytr, Xva, 1, 5).tolist() == unica.predict(Xva).tolist()", "expected": true, "name": "Com n_arvores=1, o resultado é a árvore treinada na amostra bootstrap da semente", "hint": "Compara-se com uma DecisionTreeClassifier(random_state=semente) treinada em X[i], y[i], com i = default_rng(semente).integers(0, n, size=n)."},
  {"id": "quinze-arvores", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.model_selection import train_test_split\nfrom sklearn.tree import DecisionTreeClassifier\nfrom clientes import gerar_clientes\nX, y = gerar_clientes(400, 1)\nXtr, Xva, ytr, yva = train_test_split(X, y, test_size=0.25, random_state=0)\ndef ref_bagging(X, y, Xn, B, s):\n    rng = np.random.default_rng(s)\n    classes = np.unique(y)\n    votos = np.zeros((len(Xn), len(classes)), dtype=int)\n    for _ in range(B):\n        i = rng.integers(0, len(y), size=len(y))\n        p = DecisionTreeClassifier(random_state=s).fit(X[i], y[i]).predict(Xn)\n        votos += p[:, None] == classes\n    return classes[votos.argmax(axis=1)]\n", "expr": "bagging_arvores(Xtr, ytr, Xva, 15, 0).tolist() == ref_bagging(Xtr, ytr, Xva, 15, 0).tolist()", "expected": true, "name": "Com 15 árvores, os mesmos votos de um bagging de referência", "hint": "Use um único gerador para todas as árvores: cada árvore precisa de uma amostra bootstrap diferente, com n linhas."},
  {"id": "empate", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.model_selection import train_test_split\nfrom sklearn.tree import DecisionTreeClassifier\nfrom clientes import gerar_clientes\nX, y = gerar_clientes(400, 1)\nXtr, Xva, ytr, yva = train_test_split(X, y, test_size=0.25, random_state=0)\ndef ref_bagging(X, y, Xn, B, s):\n    rng = np.random.default_rng(s)\n    classes = np.unique(y)\n    votos = np.zeros((len(Xn), len(classes)), dtype=int)\n    for _ in range(B):\n        i = rng.integers(0, len(y), size=len(y))\n        p = DecisionTreeClassifier(random_state=s).fit(X[i], y[i]).predict(Xn)\n        votos += p[:, None] == classes\n    return classes[votos.argmax(axis=1)]\n", "expr": "bagging_arvores(Xtr, ytr, Xva, 2, 0).tolist() == ref_bagging(Xtr, ytr, Xva, 2, 0).tolist()", "expected": true, "name": "Com 2 árvores há empates (1 a 1): ficam com o menor rótulo", "hint": "Com dois votos diferentes, a resposta é o menor rótulo (atrasa), não o voto da primeira árvore."},
  {"id": "melhor-que-uma-arvore", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.model_selection import train_test_split\nfrom sklearn.tree import DecisionTreeClassifier\nfrom clientes import gerar_clientes\nX, y = gerar_clientes(400, 1)\nXtr, Xva, ytr, yva = train_test_split(X, y, test_size=0.25, random_state=0)\n", "expr": "[float((bagging_arvores(Xtr, ytr, Xva, 25, 0) == yva).mean()), DecisionTreeClassifier(random_state=0).fit(Xtr, ytr).score(Xva, yva)]", "expected": [0.83, 0.76], "tolerance": 1e-09, "name": "Na validação, 25 árvores acertam 0.83; uma árvore sem limite, 0.76"},
  {"id": "reprodutivel", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.model_selection import train_test_split\nfrom sklearn.tree import DecisionTreeClassifier\nfrom clientes import gerar_clientes\nX, y = gerar_clientes(400, 1)\nXtr, Xva, ytr, yva = train_test_split(X, y, test_size=0.25, random_state=0)\n", "expr": "bagging_arvores(Xtr, ytr, Xva, 5, 3).tolist() == bagging_arvores(Xtr, ytr, Xva, 5, 3).tolist()", "expected": true, "name": "A mesma semente dá as mesmas previsões", "hint": "Todo sorteio sai do gerador criado com a semente recebida."},
  {"id": "rotulos", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.model_selection import train_test_split\nfrom sklearn.tree import DecisionTreeClassifier\nfrom clientes import gerar_clientes\nX, y = gerar_clientes(400, 1)\nXtr, Xva, ytr, yva = train_test_split(X, y, test_size=0.25, random_state=0)\nr = bagging_arvores(Xtr, ytr, Xva, 3, 0)", "expr": "[type(r).__name__, sorted(set(r.tolist()))]", "expected": ["ndarray", ["atrasa", "paga"]], "name": "Devolve um array com os rótulos (atrasa, paga), não posições"}
]
```

### Soluções erradas
```python name="bootstrap sem reposição"
import numpy as np
from sklearn.tree import DecisionTreeClassifier


def bagging_arvores(X, y, X_novo, n_arvores, semente):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y)
    X_novo = np.asarray(X_novo, dtype=float)
    rng = np.random.default_rng(semente)
    n = len(y)
    classes = np.unique(y)
    votos = np.zeros((len(X_novo), len(classes)), dtype=int)
    for _ in range(n_arvores):
        indices = rng.permutation(n)
        arvore = DecisionTreeClassifier(random_state=semente).fit(X[indices], y[indices])
        previsoes = arvore.predict(X_novo)
        votos += previsoes[:, None] == classes
    return classes[votos.argmax(axis=1)]
```
```python name="gerador recriado a cada árvore"
import numpy as np
from sklearn.tree import DecisionTreeClassifier


def bagging_arvores(X, y, X_novo, n_arvores, semente):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y)
    X_novo = np.asarray(X_novo, dtype=float)
    n = len(y)
    classes = np.unique(y)
    votos = np.zeros((len(X_novo), len(classes)), dtype=int)
    for _ in range(n_arvores):
        rng = np.random.default_rng(semente)
        indices = rng.integers(0, n, size=n)
        arvore = DecisionTreeClassifier(random_state=semente).fit(X[indices], y[indices])
        previsoes = arvore.predict(X_novo)
        votos += previsoes[:, None] == classes
    return classes[votos.argmax(axis=1)]
```
```python name="amostra do tamanho de X_novo"
import numpy as np
from sklearn.tree import DecisionTreeClassifier


def bagging_arvores(X, y, X_novo, n_arvores, semente):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y)
    X_novo = np.asarray(X_novo, dtype=float)
    rng = np.random.default_rng(semente)
    n = len(y)
    classes = np.unique(y)
    votos = np.zeros((len(X_novo), len(classes)), dtype=int)
    for _ in range(n_arvores):
        indices = rng.integers(0, n, size=len(X_novo))
        arvore = DecisionTreeClassifier(random_state=semente).fit(X[indices], y[indices])
        previsoes = arvore.predict(X_novo)
        votos += previsoes[:, None] == classes
    return classes[votos.argmax(axis=1)]
```
```python name="gerador sem semente"
import numpy as np
from sklearn.tree import DecisionTreeClassifier


def bagging_arvores(X, y, X_novo, n_arvores, semente):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y)
    X_novo = np.asarray(X_novo, dtype=float)
    rng = np.random.default_rng()
    n = len(y)
    classes = np.unique(y)
    votos = np.zeros((len(X_novo), len(classes)), dtype=int)
    for _ in range(n_arvores):
        indices = rng.integers(0, n, size=n)
        arvore = DecisionTreeClassifier(random_state=semente).fit(X[indices], y[indices])
        previsoes = arvore.predict(X_novo)
        votos += previsoes[:, None] == classes
    return classes[votos.argmax(axis=1)]
```
```python name="devolve a posição da classe"
import numpy as np
from sklearn.tree import DecisionTreeClassifier


def bagging_arvores(X, y, X_novo, n_arvores, semente):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y)
    X_novo = np.asarray(X_novo, dtype=float)
    rng = np.random.default_rng(semente)
    n = len(y)
    classes = np.unique(y)
    votos = np.zeros((len(X_novo), len(classes)), dtype=int)
    for _ in range(n_arvores):
        indices = rng.integers(0, n, size=n)
        arvore = DecisionTreeClassifier(random_state=semente).fit(X[indices], y[indices])
        previsoes = arvore.predict(X_novo)
        votos += previsoes[:, None] == classes
    return votos.argmax(axis=1)
```
```python name="empate fica com o voto da primeira árvore"
from collections import Counter

import numpy as np
from sklearn.tree import DecisionTreeClassifier


def bagging_arvores(X, y, X_novo, n_arvores, semente):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y)
    X_novo = np.asarray(X_novo, dtype=float)
    rng = np.random.default_rng(semente)
    n = len(y)
    todas = []
    for _ in range(n_arvores):
        indices = rng.integers(0, n, size=n)
        arvore = DecisionTreeClassifier(random_state=semente).fit(X[indices], y[indices])
        todas.append(arvore.predict(X_novo))
    votos_por_linha = np.array(todas).T
    return np.array([Counter(linha).most_common(1)[0][0] for linha in votos_por_linha])
```

## Passo 6 · Leitura · OOB, hiperparâmetros e extrapolação

Cada árvore do bagging deixa de fora cerca de 37 % das linhas. Para cada linha do treino, junte os votos só das árvores que **não** a viram: é uma previsão honesta para aquela linha, como numa validação, sem separar dados. A acurácia dessas previsões é a **pontuação fora da bolsa** (OOB), que o scikit-learn calcula com `oob_score=True`:

```python
floresta = RandomForestClassifier(n_estimators=30, max_features=None, oob_score=True, random_state=0)
floresta.fit(X_treino, y_treino)
floresta.oob_score_          # 0.8233
```

Nos 300 clientes, o OOB deu 0,823, perto dos 0,81 da mesma floresta na validação separada. Sem `oob_score=True`, o atributo não existe: `AttributeError: 'RandomForestClassifier' object has no attribute 'oob_score_'`. Com poucas árvores, algumas linhas nunca ficam fora de amostra nenhuma (com 3 árvores, só 76 % recebem voto), e o aviso é `UserWarning: Some inputs do not have OOB scores. This probably means too few trees were used to compute any reliable OOB estimates.` O scikit-learn faz a média das probabilidades das árvores em vez de contar votos, por isso a sua conta do passo 7 dá números próximos, não iguais.

O OOB é uma **validação**, não um teste. Se você escolhe `max_features` ou `min_samples_leaf` pelo melhor OOB, esse número passa a ser otimista, como a melhor nota de uma busca em grade do módulo 4; a avaliação final continua num teste separado, usado uma vez só.

A floresta tem um limite que nenhum hiperparâmetro resolve: ela **não extrapola**. Cada folha de uma árvore de regressão prevê a média dos alvos de treino que caíram nela, então a previsão da floresta é sempre uma média de alvos já vistos. Com 60 pontos sorteados perto da reta $y = 3x$, com $x$ entre 0,39 e 9,74:

| $x$ | 9 | 10 | 12 | 20 | 100 |
|---|---|---|---|---|---|
| previsão da floresta | 27,40 | 28,68 | 28,68 | 28,68 | 28,68 |

Acima do maior $x$ do treino, a previsão vira um platô, enquanto a reta daria 300 em $x = 100$. Para uma tendência que continua fora da faixa observada, como um valor que cresce com o tempo, use um modelo linear ou mude o alvo (prever a variação em vez do nível). Dentro da faixa dos dados, a floresta é uma das escolhas mais seguras que existem.

## Passo 7 · Exercício · OOB e extrapolação

Calcule a pontuação fora da bolsa à mão e veja o platô da floresta de regressão.

### Instruções
1. `oob_manual(X, y, n_arvores, semente)` faz o bagging do passo 5 (um gerador `np.random.default_rng(semente)`, amostras com `rng.integers(0, n, size=n)`, árvores `DecisionTreeClassifier(random_state=semente)`), mas cada árvore vota **só nas linhas do treino que ficaram fora da sua amostra**.
2. Cada linha recebe a classe mais votada entre as árvores que não a viram (empate: menor rótulo); linhas que nunca ficaram fora da bolsa não entram na conta.
3. Devolve, como `float`, a acurácia dessas previsões contra o `y` verdadeiro.
4. `extrapolacao(x_treino, y_treino, x_novo, semente)` recebe um único atributo (listas ou vetores de uma dimensão), treina um `RandomForestRegressor(n_estimators=20, random_state=semente)` e devolve o array de previsões para `x_novo`.

### Código inicial
```python
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.tree import DecisionTreeClassifier


def oob_manual(X, y, n_arvores, semente):
    pass


def extrapolacao(x_treino, y_treino, x_novo, semente):
    pass
```
```text path=clientes.py
import numpy as np


def gerar_clientes(n, semente):
    rng = np.random.default_rng(semente)
    renda = rng.normal(4.0, 1.5, n).clip(0.8).round(1)
    comprometimento = rng.uniform(5, 70, n).round(0)
    idade = rng.integers(20, 70, n)
    atrasa = (comprometimento > 45) & (renda < 5.0) | (renda < 2.0)
    troca = rng.random(n) < 0.15
    X = np.column_stack([renda, comprometimento, idade])
    y = np.where(atrasa ^ troca, "atrasa", "paga")
    return X, y
```

### Solução
```python
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.tree import DecisionTreeClassifier


def oob_manual(X, y, n_arvores, semente):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y)
    rng = np.random.default_rng(semente)
    n = len(y)
    classes = np.unique(y)
    votos = np.zeros((n, len(classes)), dtype=int)
    for _ in range(n_arvores):
        indices = rng.integers(0, n, size=n)
        fora = np.setdiff1d(np.arange(n), indices)
        arvore = DecisionTreeClassifier(random_state=semente).fit(X[indices], y[indices])
        votos[fora] += arvore.predict(X[fora])[:, None] == classes
    com_voto = votos.sum(axis=1) > 0
    previstas = classes[votos[com_voto].argmax(axis=1)]
    return float((previstas == y[com_voto]).mean())


def extrapolacao(x_treino, y_treino, x_novo, semente):
    X_treino = np.asarray(x_treino, dtype=float).reshape(-1, 1)
    X_novo = np.asarray(x_novo, dtype=float).reshape(-1, 1)
    floresta = RandomForestRegressor(n_estimators=20, random_state=semente)
    floresta.fit(X_treino, y_treino)
    return floresta.predict(X_novo)
```
```text path=clientes.py
import numpy as np


def gerar_clientes(n, semente):
    rng = np.random.default_rng(semente)
    renda = rng.normal(4.0, 1.5, n).clip(0.8).round(1)
    comprometimento = rng.uniform(5, 70, n).round(0)
    idade = rng.integers(20, 70, n)
    atrasa = (comprometimento > 45) & (renda < 5.0) | (renda < 2.0)
    troca = rng.random(n) < 0.15
    X = np.column_stack([renda, comprometimento, idade])
    y = np.where(atrasa ^ troca, "atrasa", "paga")
    return X, y
```

### Dicas
1. Os fora da bolsa de uma árvore saem do `np.setdiff1d` do passo 3; a matriz de votos tem uma linha por linha do treino, e cada árvore soma votos só nas linhas fora da sua amostra.
2. Uma linha sem voto nenhum tem a soma da sua linha de votos igual a zero: tire-a da conta antes de calcular a acurácia.
3. O scikit-learn quer uma matriz com uma coluna por atributo: `np.asarray(x).reshape(-1, 1)` transforma n valores em n linhas de uma coluna.

### Verificação
```json
[
  {"id": "oob-perto-do-sklearn", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.model_selection import train_test_split\nfrom sklearn.tree import DecisionTreeClassifier\nfrom clientes import gerar_clientes\nX, y = gerar_clientes(400, 1)\nXtr, Xva, ytr, yva = train_test_split(X, y, test_size=0.25, random_state=0)\nfrom sklearn.ensemble import RandomForestClassifier\nrf = RandomForestClassifier(n_estimators=30, max_features=None, oob_score=True, random_state=0).fit(Xtr, ytr)", "expr": "bool(abs(oob_manual(Xtr, ytr, 30, 0) - rf.oob_score_) < 0.03)", "expected": true, "name": "Com 30 árvores, o OOB fica a menos de 0.03 do oob_score_ de uma floresta sem sorteio de atributos", "hint": "Compara-se com o oob_score_ (0.823). Um valor perto de 1.0 indica que as árvores votaram em linhas que viram no treino."},
  {"id": "oob-30", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.model_selection import train_test_split\nfrom sklearn.tree import DecisionTreeClassifier\nfrom clientes import gerar_clientes\nX, y = gerar_clientes(400, 1)\nXtr, Xva, ytr, yva = train_test_split(X, y, test_size=0.25, random_state=0)\n", "expr": "oob_manual(Xtr, ytr, 30, 0)", "expected": 0.8133333333333334, "tolerance": 1e-09, "name": "oob_manual(Xtr, ytr, 30, 0) nos 300 clientes", "hint": "Cada árvore vota só nas linhas fora da sua amostra bootstrap."},
  {"id": "oob-3", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.model_selection import train_test_split\nfrom sklearn.tree import DecisionTreeClassifier\nfrom clientes import gerar_clientes\nX, y = gerar_clientes(400, 1)\nXtr, Xva, ytr, yva = train_test_split(X, y, test_size=0.25, random_state=0)\n", "expr": "oob_manual(Xtr, ytr, 3, 0)", "expected": 0.706140350877193, "tolerance": 1e-09, "name": "Com 3 árvores, só as linhas que receberam algum voto entram na conta", "hint": "Com poucas árvores, cerca de 1/4 das linhas nunca fica fora da bolsa: elas não contam nem como acerto nem como erro."},
  {"id": "oob-semente", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.model_selection import train_test_split\nfrom sklearn.tree import DecisionTreeClassifier\nfrom clientes import gerar_clientes\nX, y = gerar_clientes(400, 1)\nXtr, Xva, ytr, yva = train_test_split(X, y, test_size=0.25, random_state=0)\n", "expr": "oob_manual(Xtr, ytr, 10, 1)", "expected": 0.7762711864406779, "tolerance": 1e-09, "name": "oob_manual(Xtr, ytr, 10, 1) com outra semente"},
  {"id": "oob-tipo", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.model_selection import train_test_split\nfrom sklearn.tree import DecisionTreeClassifier\nfrom clientes import gerar_clientes\nX, y = gerar_clientes(400, 1)\nXtr, Xva, ytr, yva = train_test_split(X, y, test_size=0.25, random_state=0)\n", "expr": "type(oob_manual(Xtr, ytr, 5, 0)).__name__", "expected": "float", "name": "oob_manual devolve float"},
  {"id": "extrap-referencia", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.ensemble import RandomForestRegressor\nx = np.random.default_rng(2).uniform(0, 10, 60).round(2)\nyy = 3 * x + np.random.default_rng(3).normal(0, 1, 60)\nref = RandomForestRegressor(n_estimators=20, random_state=0).fit(x.reshape(-1, 1), yy)\ng = np.array([1.0, 4.5, 9.0, 12.0])", "expr": "bool(np.allclose(extrapolacao(x, yy, g, 0), ref.predict(g.reshape(-1, 1))))", "expected": true, "name": "As mesmas previsões de um RandomForestRegressor(n_estimators=20, random_state=semente)", "hint": "Compara-se com a floresta de referência. O atributo único precisa virar uma matriz de uma coluna, e a semente vai no random_state."},
  {"id": "extrap-plato-acima", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.ensemble import RandomForestRegressor\nx = np.random.default_rng(2).uniform(0, 10, 60).round(2)\nyy = 3 * x + np.random.default_rng(3).normal(0, 1, 60)\np = extrapolacao(x, yy, [10.0, 12.0, 20.0, 100.0], 0)", "expr": "[len(set(p.round(9).tolist())), round(float(p[0]), 3)]", "expected": [1, 28.684], "name": "Acima do maior x do treino (9.74), a previsão é um platô em 28.684"},
  {"id": "extrap-plato-abaixo", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.ensemble import RandomForestRegressor\nx = np.random.default_rng(2).uniform(0, 10, 60).round(2)\nyy = 3 * x + np.random.default_rng(3).normal(0, 1, 60)\np = extrapolacao(x, yy, [-5.0, 0.0], 0)", "expr": "p.round(3).tolist()", "expected": [2.023, 2.023], "tolerance": 1e-09, "name": "Abaixo do menor x (0.39), outro platô"},
  {"id": "extrap-listas", "checkpoint": 4, "kind": "expr", "expr": "type(extrapolacao([0.0, 1.0, 2.0, 3.0], [0.0, 1.0, 2.0, 3.0], [1.5], 0)).__name__", "expected": "ndarray", "name": "Aceita listas e devolve um array do numpy", "hint": "Transforme as listas em matrizes de uma coluna com reshape(-1, 1)."}
]
```

### Soluções erradas
```python name="OOB medido no treino"
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.tree import DecisionTreeClassifier


def oob_manual(X, y, n_arvores, semente):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y)
    rng = np.random.default_rng(semente)
    n = len(y)
    classes = np.unique(y)
    votos = np.zeros((n, len(classes)), dtype=int)
    for _ in range(n_arvores):
        indices = rng.integers(0, n, size=n)
        fora = np.setdiff1d(np.arange(n), indices)
        arvore = DecisionTreeClassifier(random_state=semente).fit(X[indices], y[indices])
        votos += arvore.predict(X)[:, None] == classes
    com_voto = votos.sum(axis=1) > 0
    previstas = classes[votos[com_voto].argmax(axis=1)]
    return float((previstas == y[com_voto]).mean())


def extrapolacao(x_treino, y_treino, x_novo, semente):
    X_treino = np.asarray(x_treino, dtype=float).reshape(-1, 1)
    X_novo = np.asarray(x_novo, dtype=float).reshape(-1, 1)
    floresta = RandomForestRegressor(n_estimators=20, random_state=semente)
    floresta.fit(X_treino, y_treino)
    return floresta.predict(X_novo)
```
```python name="linhas sem voto contam como erro"
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.tree import DecisionTreeClassifier


def oob_manual(X, y, n_arvores, semente):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y)
    rng = np.random.default_rng(semente)
    n = len(y)
    classes = np.unique(y)
    votos = np.zeros((n, len(classes)), dtype=int)
    for _ in range(n_arvores):
        indices = rng.integers(0, n, size=n)
        fora = np.setdiff1d(np.arange(n), indices)
        arvore = DecisionTreeClassifier(random_state=semente).fit(X[indices], y[indices])
        votos[fora] += arvore.predict(X[fora])[:, None] == classes
    previstas = classes[votos.argmax(axis=1)]
    acertos = (previstas == y) & (votos.sum(axis=1) > 0)
    return float(acertos.sum() / n)


def extrapolacao(x_treino, y_treino, x_novo, semente):
    X_treino = np.asarray(x_treino, dtype=float).reshape(-1, 1)
    X_novo = np.asarray(x_novo, dtype=float).reshape(-1, 1)
    floresta = RandomForestRegressor(n_estimators=20, random_state=semente)
    floresta.fit(X_treino, y_treino)
    return floresta.predict(X_novo)
```
```python name="bootstrap sem reposição"
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.tree import DecisionTreeClassifier


def oob_manual(X, y, n_arvores, semente):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y)
    rng = np.random.default_rng(semente)
    n = len(y)
    classes = np.unique(y)
    votos = np.zeros((n, len(classes)), dtype=int)
    for _ in range(n_arvores):
        indices = rng.permutation(n)
        fora = np.setdiff1d(np.arange(n), indices)
        arvore = DecisionTreeClassifier(random_state=semente).fit(X[indices], y[indices])
        votos[fora] += arvore.predict(X[fora])[:, None] == classes
    com_voto = votos.sum(axis=1) > 0
    previstas = classes[votos[com_voto].argmax(axis=1)]
    return float((previstas == y[com_voto]).mean())


def extrapolacao(x_treino, y_treino, x_novo, semente):
    X_treino = np.asarray(x_treino, dtype=float).reshape(-1, 1)
    X_novo = np.asarray(x_novo, dtype=float).reshape(-1, 1)
    floresta = RandomForestRegressor(n_estimators=20, random_state=semente)
    floresta.fit(X_treino, y_treino)
    return floresta.predict(X_novo)
```
```python name="floresta sem random_state"
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.tree import DecisionTreeClassifier


def oob_manual(X, y, n_arvores, semente):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y)
    rng = np.random.default_rng(semente)
    n = len(y)
    classes = np.unique(y)
    votos = np.zeros((n, len(classes)), dtype=int)
    for _ in range(n_arvores):
        indices = rng.integers(0, n, size=n)
        fora = np.setdiff1d(np.arange(n), indices)
        arvore = DecisionTreeClassifier(random_state=semente).fit(X[indices], y[indices])
        votos[fora] += arvore.predict(X[fora])[:, None] == classes
    com_voto = votos.sum(axis=1) > 0
    previstas = classes[votos[com_voto].argmax(axis=1)]
    return float((previstas == y[com_voto]).mean())


def extrapolacao(x_treino, y_treino, x_novo, semente):
    X_treino = np.asarray(x_treino, dtype=float).reshape(-1, 1)
    X_novo = np.asarray(x_novo, dtype=float).reshape(-1, 1)
    floresta = RandomForestRegressor(n_estimators=20)
    floresta.fit(X_treino, y_treino)
    return floresta.predict(X_novo)
```
```python name="atributo passado como vetor"
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.tree import DecisionTreeClassifier


def oob_manual(X, y, n_arvores, semente):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y)
    rng = np.random.default_rng(semente)
    n = len(y)
    classes = np.unique(y)
    votos = np.zeros((n, len(classes)), dtype=int)
    for _ in range(n_arvores):
        indices = rng.integers(0, n, size=n)
        fora = np.setdiff1d(np.arange(n), indices)
        arvore = DecisionTreeClassifier(random_state=semente).fit(X[indices], y[indices])
        votos[fora] += arvore.predict(X[fora])[:, None] == classes
    com_voto = votos.sum(axis=1) > 0
    previstas = classes[votos[com_voto].argmax(axis=1)]
    return float((previstas == y[com_voto]).mean())


def extrapolacao(x_treino, y_treino, x_novo, semente):
    X_treino = np.asarray(x_treino, dtype=float)
    X_novo = np.asarray(x_novo, dtype=float)
    floresta = RandomForestRegressor(n_estimators=20, random_state=semente)
    floresta.fit(X_treino, y_treino)
    return floresta.predict(X_novo)
```
```python name="matriz de uma linha só"
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.tree import DecisionTreeClassifier


def oob_manual(X, y, n_arvores, semente):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y)
    rng = np.random.default_rng(semente)
    n = len(y)
    classes = np.unique(y)
    votos = np.zeros((n, len(classes)), dtype=int)
    for _ in range(n_arvores):
        indices = rng.integers(0, n, size=n)
        fora = np.setdiff1d(np.arange(n), indices)
        arvore = DecisionTreeClassifier(random_state=semente).fit(X[indices], y[indices])
        votos[fora] += arvore.predict(X[fora])[:, None] == classes
    com_voto = votos.sum(axis=1) > 0
    previstas = classes[votos[com_voto].argmax(axis=1)]
    return float((previstas == y[com_voto]).mean())


def extrapolacao(x_treino, y_treino, x_novo, semente):
    X_treino = np.asarray(x_treino, dtype=float).reshape(1, -1)
    X_novo = np.asarray(x_novo, dtype=float).reshape(1, -1)
    floresta = RandomForestRegressor(n_estimators=20, random_state=semente)
    floresta.fit(X_treino, y_treino)
    return floresta.predict(X_novo)
```

## Passo 8 · Quiz · max_features

### Pergunta
Uma floresta tem `d = 16` atributos e usa o padrão `max_features="sqrt"`. O que acontece em cada árvore?
- [ ] Cada árvore sorteia 4 atributos no início e usa só esses em todos os seus nós
- [x] Cada nó de cada árvore sorteia 4 atributos e escolhe a melhor pergunta entre eles; o nó seguinte sorteia outros 4
- [ ] Cada árvore usa os 16 atributos, mas só $\sqrt{n}$ linhas do treino
- [ ] A floresta escolhe os 4 atributos mais importantes e treina todas as árvores com eles
> O sorteio é por nó, não por árvore: uma mesma árvore pode usar todos os 16 atributos em nós diferentes, e é isso que descorrelaciona as árvores sem jogar atributos fora. As linhas vêm do bootstrap, com $n$ sorteios, não de $\sqrt{n}$. Nenhuma seleção por importância acontece antes do treino.

### Pergunta
Numa base de cobrança fictícia, o atributo "dias de atraso no mês anterior" quase decide sozinho. Uma colega usa `RandomForestClassifier(max_features=None)` e vê que passar de 100 para 500 árvores não muda a acurácia de validação. O que explica isso, e o que tentar?
- [ ] Faltam árvores: com 5 000 a acurácia volta a subir
- [ ] As árvores são rasas demais: aumentar `max_depth` resolve
- [x] Toda árvore abre com o atributo forte, as árvores ficam muito correlacionadas, e mais árvores não baixam o piso $\rho\,\sigma^2$; reduzir `max_features` (por exemplo, para `"sqrt"`) descorrelaciona as árvores
- [ ] O bootstrap está atrapalhando: `bootstrap=False` deixa cada árvore usar todos os dados e resolve
> Com `max_features=None`, a floresta é bagging puro, e o atributo dominante vai para a raiz de quase toda árvore. A variância da média tem o termo $\rho\,\sigma^2$, que não depende do número de árvores: por isso 500 árvores não ajudam mais que 100. Árvores mais fundas não reduzem a correlação, e sem bootstrap as árvores ficam ainda mais parecidas.

### Pergunta
Um analista testa 12 combinações de `max_features` e `min_samples_leaf` e escolhe a de maior `oob_score_`, 0,87. No relatório, escreve: "acurácia esperada em clientes novos: 0,87". O que está errado?
- [ ] Nada: o OOB usa só linhas que cada árvore não viu, então continua sem viés mesmo depois da escolha
- [x] O 0,87 serviu para escolher entre 12 configurações e virou uma estimativa otimista, como a melhor nota de uma busca em grade; a acurácia esperada precisa vir de um teste separado, usado uma vez
- [ ] O OOB mede o erro, não a acurácia: a acurácia esperada é $1 - 0{,}87 = 0{,}13$
- [ ] O OOB só vale com `n_estimators` acima de 1 000
> O OOB de cada configuração é uma boa validação, mas escolher a maior de 12 validações favorece a que teve sorte com os dados: o número vencedor tende a ser maior que o desempenho real. É o mesmo motivo pelo qual o `best_score_` do `GridSearchCV` não é o resultado final. O `oob_score_` de um classificador é a acurácia, e ele já é confiável com algumas dezenas de árvores.
