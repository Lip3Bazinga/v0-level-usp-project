---
slug: n5-m4-04-busca-de-hiperparametros
titulo: Busca de hiperparâmetros
descricao: GridSearchCV e RandomizedSearchCV sobre pipelines, espaços de busca, refit, inspeção de cv_results_ e o custo da busca.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- pandas
- scikit-learn
xp: 110
tempo_min: 45
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Definir espaços de busca para etapas de um Pipeline e rodar GridSearchCV e RandomizedSearchCV
- Ler cv_results_ e best_params_ e evitar o sobreajuste à validação
- Estimar o custo da busca e escolher entre grade e aleatória
---

## Passo 1 · Leitura · Grade sobre um pipeline

O `C` da regressão logística, o número de vizinhos do KNN e a profundidade de uma árvore não são aprendidos pelo `fit`: alguém precisa escolhê-los. A lição anterior deu o critério, a nota média da validação cruzada no treino. O `GridSearchCV` aplica esse critério a todas as combinações de uma **grade**:

```python
modelo = Pipeline([("escalar", StandardScaler()), ("modelo", LogisticRegression())])
grade = {"modelo__C": [0.01, 0.1, 1.0, 10.0]}
busca = GridSearchCV(modelo, grade, cv=5)
busca.fit(X_treino, y_treino)
busca.best_params_       # {'modelo__C': 0.1}, por exemplo
busca.best_score_        # a média da validação cruzada da melhor combinação
busca.score(X_teste, y_teste)
```

As chaves da grade usam o nome da etapa, dois sublinhados e o nome do hiperparâmetro, como no `get_params()` do pipeline. Sem o prefixo, a busca falha logo no começo: `ValueError: Invalid parameter 'C' for estimator Pipeline(steps=[…]). Valid parameters are: ['memory', 'steps', 'transform_input', 'verbose'].` A lista mostra os parâmetros do próprio pipeline, e não os da regressão.

Depois de avaliar todas as combinações, o `GridSearchCV` faz o **refit**: ajusta de novo a melhor combinação com o treino inteiro e guarda o resultado em `best_estimator_`. É por isso que `busca.predict` e `busca.score` funcionam. Com `refit=False`, a busca só compara; o objeto não tem modelo para prever, e o `busca.score` falha.

A busca custa caro. Cada combinação é ajustada uma vez por partição, e o refit soma mais um ajuste. Com $V_j$ a lista de valores do hiperparâmetro $j$ e $k$ partições:

$$
\text{ajustes} = \Big(\prod_{j} |V_j|\Big) \times k + 1
$$

Três hiperparâmetros com 5 valores cada e 5 partições dão $125 \times 5 + 1 = 626$ ajustes. Uma floresta que leva 0,2 s por ajuste leva dois minutos. Uma grade também pode ser uma **lista** de dicionários, quando certas combinações não fazem sentido juntas; o total de combinações é a soma das combinações de cada dicionário.

Escalas multiplicativas pedem valores em escala logarítmica: para o `C` (ou o `alpha` da ridge), `[0.01, 0.1, 1, 10, 100]` cobre cinco ordens de grandeza com cinco ajustes, enquanto `[1, 2, 3, 4, 5]` gasta os mesmos cinco num pedaço pequeno do intervalo.

## Passo 2 · Previsão · Quantos ajustes

O programa conta os ajustes de uma busca com uma subclasse da regressão logística que anota o tamanho do treino a cada `fit`. Os dados têm 40 linhas. Leia sem executar e digite o que ele imprime.

### Código
```python
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GridSearchCV, ParameterGrid
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

ajustes = []


class Contador(LogisticRegression):
    def fit(self, X, y, sample_weight=None):
        ajustes.append(len(X))
        return super().fit(X, y, sample_weight)


rng = np.random.default_rng(0)
X = rng.normal(size=(40, 2))
y = (X[:, 0] + X[:, 1] > 0).astype(int)
pipe = Pipeline([("escalar", StandardScaler()), ("modelo", Contador())])
grade = {"modelo__C": [0.1, 1.0, 10.0], "modelo__fit_intercept": [True, False]}
print(len(ParameterGrid(grade)))
busca = GridSearchCV(pipe, grade, cv=4).fit(X, y)
print(len(ajustes), ajustes[0], ajustes[-1])
print(busca.n_splits_, sorted(busca.best_params_))
```

### Dicas
1. O `ParameterGrid` lista todas as combinações da grade.
2. Com `cv=4` e 40 linhas, cada ajuste da validação cruzada usa 3 das 4 partições.
3. O último ajuste é o refit da melhor combinação, com todas as linhas.

### Saída esperada
```text
6
25 30 40
4 ['modelo__C', 'modelo__fit_intercept']
```

## Passo 3 · Exercício · O custo da busca
modo: ordenar

Monte a função que calcula quantos ajustes uma busca em grade faz. Três linhas estão sobrando.

### Instruções
1. `custo_da_busca(grade, k, refit=True)` aceita a grade como um dicionário `{nome: lista de valores}` ou como uma lista de dicionários.
2. O número de combinações de um dicionário é o produto dos tamanhos das listas; numa lista de dicionários, somam-se as combinações de cada um.
3. Devolve o número de ajustes: combinações vezes `k`, mais 1 quando `refit` é verdadeiro.

### Solução
```python
def custo_da_busca(grade, k, refit=True):
    if isinstance(grade, dict):
        grade = [grade]
    combinacoes = 0
    for subgrade in grade:
        produto = 1
        for valores in subgrade.values():
            produto *= len(valores)
        combinacoes += produto
    ajustes = combinacoes * k
    if refit:
        ajustes += 1
    return ajustes
```

### Distratores
```python
produto += len(valores)
ajustes = combinacoes + k
produto = 0
```

### Verificação
```json
[
  { "id": "dois-hiperparametros", "checkpoint": 2, "kind": "call",
    "function": "custo_da_busca",
    "args": [{"C": [0.1, 1, 10], "gamma": [0.01, 0.1, 1, 10]}, 5],
    "expected": 61,
    "name": "3 × 4 combinações, 5 partições e o refit: 61 ajustes",
    "hint": "As combinações de um dicionário são o produto dos tamanhos das listas." },
  { "id": "sem-refit", "checkpoint": 3, "kind": "call",
    "function": "custo_da_busca",
    "args": [{"C": [0.1, 1, 10], "gamma": [0.01, 0.1, 1, 10]}, 5, false],
    "expected": 60,
    "name": "Com refit=False, o ajuste final não acontece",
    "hint": "O ajuste extra só existe quando refit é verdadeiro." },
  { "id": "tres-hiperparametros", "checkpoint": 2, "kind": "call",
    "function": "custo_da_busca",
    "args": [{"a": [1, 2], "b": [1, 2, 3], "c": [1, 2, 3, 4, 5]}, 2],
    "expected": 61,
    "name": "2 × 3 × 5 combinações e 2 partições: 61 ajustes" },
  { "id": "um-hiperparametro", "checkpoint": 3, "kind": "call",
    "function": "custo_da_busca",
    "args": [{"C": [1, 10, 100]}, 4],
    "expected": 13,
    "name": "3 valores e 4 partições: 13 ajustes",
    "hint": "Cada combinação é ajustada uma vez por partição." },
  { "id": "lista-de-grades", "checkpoint": 1, "kind": "call",
    "function": "custo_da_busca",
    "args": [[{"C": [1, 10]}, {"C": [1], "gamma": [0.1, 1, 10]}], 3],
    "expected": 16,
    "name": "Lista de grades: 2 + 3 combinações, 3 partições e o refit",
    "hint": "Numa lista de dicionários, as combinações de cada um se somam." },
  { "id": "lista-sem-refit", "checkpoint": 1, "kind": "call",
    "function": "custo_da_busca",
    "args": [[{"C": [1, 10, 100]}, {"alpha": [0.5, 1]}], 10, false],
    "expected": 50,
    "name": "Lista de grades sem refit: 5 combinações e 10 partições" },
  { "id": "grade-vazia", "checkpoint": 2, "kind": "call",
    "function": "custo_da_busca",
    "args": [{}, 5],
    "expected": 6,
    "name": "Grade vazia: uma combinação (o modelo como está), 5 partições e o refit" }
]
```

### Soluções erradas
```python name="soma os tamanhos em vez de multiplicar"
def custo_da_busca(grade, k, refit=True):
    if isinstance(grade, dict):
        grade = [grade]
    combinacoes = 0
    for subgrade in grade:
        produto = 0
        for valores in subgrade.values():
            produto += len(valores)
        combinacoes += produto
    ajustes = combinacoes * k
    if refit:
        ajustes += 1
    return ajustes
```
```python name="esquece o refit"
def custo_da_busca(grade, k, refit=True):
    if isinstance(grade, dict):
        grade = [grade]
    combinacoes = 0
    for subgrade in grade:
        produto = 1
        for valores in subgrade.values():
            produto *= len(valores)
        combinacoes += produto
    return combinacoes * k
```
```python name="soma o refit sempre"
def custo_da_busca(grade, k, refit=True):
    if isinstance(grade, dict):
        grade = [grade]
    combinacoes = 0
    for subgrade in grade:
        produto = 1
        for valores in subgrade.values():
            produto *= len(valores)
        combinacoes += produto
    return combinacoes * k + 1
```
```python name="soma as partições em vez de multiplicar"
def custo_da_busca(grade, k, refit=True):
    if isinstance(grade, dict):
        grade = [grade]
    combinacoes = 0
    for subgrade in grade:
        produto = 1
        for valores in subgrade.values():
            produto *= len(valores)
        combinacoes += produto
    ajustes = combinacoes + k
    if refit:
        ajustes += 1
    return ajustes
```
```python name="multiplica as combinações da lista de grades"
def custo_da_busca(grade, k, refit=True):
    if isinstance(grade, dict):
        grade = [grade]
    combinacoes = 1
    for subgrade in grade:
        produto = 1
        for valores in subgrade.values():
            produto *= len(valores)
        combinacoes *= produto
    ajustes = combinacoes * k
    if refit:
        ajustes += 1
    return ajustes
```
```python name="só aceita dicionário"
def custo_da_busca(grade, k, refit=True):
    produto = 1
    for valores in grade.values():
        produto *= len(valores)
    ajustes = produto * k
    if refit:
        ajustes += 1
    return ajustes
```

## Passo 4 · Leitura · Aleatória, cv_results_ e o vencedor otimista

A grade testa todas as combinações, e o custo cresce com o produto dos tamanhos das listas. O `RandomizedSearchCV` sorteia `n_iter` combinações e testa só essas. Cada hiperparâmetro recebe uma lista (sorteio entre os valores) ou uma distribuição do `scipy.stats`. Para o `C`, a `loguniform(1e-3, 1e2)` sorteia com a mesma chance em cada ordem de grandeza:

```python
from scipy.stats import loguniform

busca = RandomizedSearchCV(modelo, {"modelo__C": loguniform(1e-3, 1e2)},
                           n_iter=20, cv=5, random_state=0)
```

O custo é `n_iter` vezes `k`, mais o refit, qualquer que seja o tamanho do espaço. Quando só um ou dois hiperparâmetros importam de fato, 20 sorteios cobrem 20 valores diferentes de cada um, enquanto uma grade de 20 combinações em dois hiperparâmetros testa só 4 ou 5 valores de cada. Sem `random_state`, cada execução sorteia outras combinações. Uma distribuição dentro do `GridSearchCV` falha: `TypeError: Parameter grid for parameter 'modelo__C' needs to be a list or a numpy array`.

Depois do `fit`, o `cv_results_` guarda tudo o que a busca mediu, uma posição por combinação. Num DataFrame fica fácil de ler:

```python
tabela = pd.DataFrame(busca.cv_results_)
tabela[["param_modelo__C", "mean_test_score", "std_test_score", "rank_test_score"]]
```

O `mean_test_score` é a média da validação cruzada, e o `std_test_score`, o desvio entre as partições. O `rank_test_score` é a **posição**: 1 é a melhor combinação, e combinações empatadas dividem a mesma posição. Ordenar pelo rank de forma decrescente põe a pior no topo. Os valores são do numpy (`numpy.float64`, `numpy.int32`): converta-os antes de devolver.

O `best_score_` é a média de validação da combinação escolhida, e ela foi escolhida justamente por ter a maior média. Com muitas combinações, alguma vai bem nas partições por sorte, e o `best_score_` fica **otimista**. No conjunto do exercício a seguir, a busca deu `best_score_` de 0,822, e o mesmo modelo acertou 0,700 no teste. O número para apresentar é o do teste, medido uma vez. Quando não há dados para um teste separado, a **validação aninhada** mede o processo inteiro de escolha: `cross_val_score(GridSearchCV(modelo, grade, cv=3), X, y, cv=5)` roda uma busca completa dentro de cada partição externa, e as cinco notas externas não participaram de nenhuma escolha. O custo multiplica: 5 buscas inteiras.

## Passo 5 · Exercício · Buscar e resumir

O arquivo `dados_busca.py` gera um conjunto fictício já dividido em treino e teste. Escreva a busca em grade do `C` de um pipeline e o resumo da tabela de resultados.

### Instruções
1. `buscar_grade(pipeline, X_treino, y_treino, X_teste, y_teste, valores_C, k)` roda um `GridSearchCV` com `cv=k` sobre o hiperparâmetro `C` da etapa `"modelo"` do `pipeline`, com os `valores_C`, ajustando **só com o treino**.
2. Devolve `{"melhor_C": float, "score_cv": float, "score_teste": float}`: o `C` escolhido pela validação cruzada, a média de validação desse `C` e a acurácia do modelo final (o do refit) no teste.
3. `resumo_cv_results(busca, n)`, com uma busca já ajustada, devolve as `n` melhores combinações, da melhor para a pior pelo `rank_test_score` (empates na ordem da grade), como uma lista de dicionários `{"posicao": int, "params": dict, "media": float, "desvio": float}`.
4. Todos os números devolvidos são `int` ou `float` do Python.

### Código inicial
```python
from sklearn.model_selection import GridSearchCV

from dados_busca import gerar


def buscar_grade(pipeline, X_treino, y_treino, X_teste, y_teste, valores_C, k):
    pass


def resumo_cv_results(busca, n):
    pass
```
```python path=dados_busca.py
import numpy as np
from sklearn.model_selection import train_test_split


def gerar(semente=6, n=240):
    rng = np.random.default_rng(semente)
    X = rng.normal(size=(n, 6)).round(3)
    pesos = np.array([1.5, -1.0, 0.5, 0.0, 0.0, 0.0])
    y = (X @ pesos + rng.normal(0, 1.5, n) > 0).astype(np.int64)
    return train_test_split(X, y, test_size=0.25, random_state=0, stratify=y)
```

### Solução
```python
from sklearn.model_selection import GridSearchCV

from dados_busca import gerar


def buscar_grade(pipeline, X_treino, y_treino, X_teste, y_teste, valores_C, k):
    busca = GridSearchCV(pipeline, {"modelo__C": valores_C}, cv=k)
    busca.fit(X_treino, y_treino)
    return {
        "melhor_C": float(busca.best_params_["modelo__C"]),
        "score_cv": float(busca.best_score_),
        "score_teste": float(busca.score(X_teste, y_teste)),
    }


def resumo_cv_results(busca, n):
    r = busca.cv_results_
    ordem = sorted(range(len(r["params"])), key=lambda i: r["rank_test_score"][i])
    return [
        {
            "posicao": int(r["rank_test_score"][i]),
            "params": r["params"][i],
            "media": float(r["mean_test_score"][i]),
            "desvio": float(r["std_test_score"][i]),
        }
        for i in ordem[:n]
    ]
```
```python path=dados_busca.py
import numpy as np
from sklearn.model_selection import train_test_split


def gerar(semente=6, n=240):
    rng = np.random.default_rng(semente)
    X = rng.normal(size=(n, 6)).round(3)
    pesos = np.array([1.5, -1.0, 0.5, 0.0, 0.0, 0.0])
    y = (X @ pesos + rng.normal(0, 1.5, n) > 0).astype(np.int64)
    return train_test_split(X, y, test_size=0.25, random_state=0, stratify=y)
```

### Dicas
1. A chave da grade leva o nome da etapa e dois sublinhados antes do nome do hiperparâmetro.
2. Depois do `fit`, a própria busca prevê e se avalia com o modelo do refit: o `score` dela no teste é o desempenho final.
3. O `sorted` do Python é estável: ordenar as posições `0, 1, 2, …` pelo rank mantém a ordem da grade entre empatados.

### Verificação
```json
[
  { "id": "melhor-C", "checkpoint": 1, "kind": "expr",
    "setup": "from sklearn.linear_model import LogisticRegression\nfrom sklearn.pipeline import Pipeline\nfrom sklearn.preprocessing import StandardScaler\nfrom dados_busca import gerar\npipe = Pipeline([('escalar', StandardScaler()), ('modelo', LogisticRegression())])\nX_tr, X_te, y_tr, y_te = gerar(6)\nr = buscar_grade(pipe, X_tr, y_tr, X_te, y_te, [0.001, 0.01, 0.1, 1.0, 10.0, 100.0], 3)",
    "expr": "r['melhor_C']",
    "expected": 0.1,
    "tolerance": 1e-12,
    "name": "O C escolhido pela validação cruzada no treino",
    "hint": "A escolha é da busca, pela média de validação; o teste não participa." },
  { "id": "score-cv", "checkpoint": 2, "kind": "expr",
    "setup": "from sklearn.linear_model import LogisticRegression\nfrom sklearn.pipeline import Pipeline\nfrom sklearn.preprocessing import StandardScaler\nfrom dados_busca import gerar\npipe = Pipeline([('escalar', StandardScaler()), ('modelo', LogisticRegression())])\nX_tr, X_te, y_tr, y_te = gerar(6)\nr = buscar_grade(pipe, X_tr, y_tr, X_te, y_te, [0.001, 0.01, 0.1, 1.0, 10.0, 100.0], 3)",
    "expr": "r['score_cv']",
    "expected": 0.8222222222222222,
    "tolerance": 1e-09,
    "name": "score_cv é a média de validação do C escolhido" },
  { "id": "score-teste", "checkpoint": 2, "kind": "expr",
    "setup": "from sklearn.linear_model import LogisticRegression\nfrom sklearn.pipeline import Pipeline\nfrom sklearn.preprocessing import StandardScaler\nfrom dados_busca import gerar\npipe = Pipeline([('escalar', StandardScaler()), ('modelo', LogisticRegression())])\nX_tr, X_te, y_tr, y_te = gerar(6)\nr = buscar_grade(pipe, X_tr, y_tr, X_te, y_te, [0.001, 0.01, 0.1, 1.0, 10.0, 100.0], 3)",
    "expr": "r['score_teste']",
    "expected": 0.7,
    "tolerance": 1e-09,
    "name": "score_teste é a acurácia do modelo do refit no teste",
    "hint": "A média de validação do vencedor não é o desempenho no teste." },
  { "id": "outra-grade", "checkpoint": 1, "kind": "expr",
    "setup": "from sklearn.linear_model import LogisticRegression\nfrom sklearn.pipeline import Pipeline\nfrom sklearn.preprocessing import StandardScaler\nfrom dados_busca import gerar\npipe = Pipeline([('escalar', StandardScaler()), ('modelo', LogisticRegression())])\nX_tr, X_te, y_tr, y_te = gerar(6)",
    "expr": "buscar_grade(pipe, X_tr, y_tr, X_te, y_te, [0.01, 1.0], 3)",
    "expected": {"melhor_C": 1.0, "score_cv": 0.8111111111111111, "score_teste": 0.7},
    "tolerance": 1e-09,
    "name": "Com outra lista de valores, outra escolha" },
  { "id": "tipos-busca", "checkpoint": 4, "kind": "expr",
    "setup": "from sklearn.linear_model import LogisticRegression\nfrom sklearn.pipeline import Pipeline\nfrom sklearn.preprocessing import StandardScaler\nfrom dados_busca import gerar\npipe = Pipeline([('escalar', StandardScaler()), ('modelo', LogisticRegression())])\nX_tr, X_te, y_tr, y_te = gerar(6)\nr = buscar_grade(pipe, X_tr, y_tr, X_te, y_te, [0.001, 0.01, 0.1, 1.0, 10.0, 100.0], 3)",
    "expr": "sorted({type(v).__name__ for v in r.values()})",
    "expected": ["float"],
    "name": "Os três números são float do Python" },
  { "id": "resumo-posicoes", "checkpoint": 3, "kind": "expr",
    "setup": "from sklearn.linear_model import LogisticRegression\nfrom sklearn.pipeline import Pipeline\nfrom sklearn.preprocessing import StandardScaler\nfrom dados_busca import gerar\npipe = Pipeline([('escalar', StandardScaler()), ('modelo', LogisticRegression())])\nfrom sklearn.model_selection import GridSearchCV\nX_tr, X_te, y_tr, y_te = gerar(0)\nbusca = GridSearchCV(pipe, {'modelo__C': [0.001, 0.01, 0.1, 1.0]}, cv=3).fit(X_tr, y_tr)\nres = resumo_cv_results(busca, 3)",
    "expr": "[d['posicao'] for d in res]",
    "expected": [1, 2, 3],
    "name": "O resumo começa pela posição 1",
    "hint": "O rank_test_score é uma colocação: 1 é a melhor." },
  { "id": "resumo-params", "checkpoint": 3, "kind": "expr",
    "setup": "from sklearn.linear_model import LogisticRegression\nfrom sklearn.pipeline import Pipeline\nfrom sklearn.preprocessing import StandardScaler\nfrom dados_busca import gerar\npipe = Pipeline([('escalar', StandardScaler()), ('modelo', LogisticRegression())])\nfrom sklearn.model_selection import GridSearchCV\nX_tr, X_te, y_tr, y_te = gerar(0)\nbusca = GridSearchCV(pipe, {'modelo__C': [0.001, 0.01, 0.1, 1.0]}, cv=3).fit(X_tr, y_tr)\nres = resumo_cv_results(busca, 3)",
    "expr": "[d['params'] for d in res]",
    "expected": [{"modelo__C": 0.1}, {"modelo__C": 1.0}, {"modelo__C": 0.01}],
    "name": "Os parâmetros das três melhores, da melhor para a pior" },
  { "id": "resumo-medias", "checkpoint": 3, "kind": "expr",
    "setup": "from sklearn.linear_model import LogisticRegression\nfrom sklearn.pipeline import Pipeline\nfrom sklearn.preprocessing import StandardScaler\nfrom dados_busca import gerar\npipe = Pipeline([('escalar', StandardScaler()), ('modelo', LogisticRegression())])\nfrom sklearn.model_selection import GridSearchCV\nX_tr, X_te, y_tr, y_te = gerar(0)\nbusca = GridSearchCV(pipe, {'modelo__C': [0.001, 0.01, 0.1, 1.0]}, cv=3).fit(X_tr, y_tr)\nres = resumo_cv_results(busca, 3)",
    "expr": "[d['media'] for d in res]",
    "expected": [0.7555555555555555, 0.75, 0.6833333333333333],
    "tolerance": 1e-09,
    "name": "As médias de validação acompanham as posições" },
  { "id": "resumo-desvios", "checkpoint": 3, "kind": "expr",
    "setup": "from sklearn.linear_model import LogisticRegression\nfrom sklearn.pipeline import Pipeline\nfrom sklearn.preprocessing import StandardScaler\nfrom dados_busca import gerar\npipe = Pipeline([('escalar', StandardScaler()), ('modelo', LogisticRegression())])\nfrom sklearn.model_selection import GridSearchCV\nX_tr, X_te, y_tr, y_te = gerar(0)\nbusca = GridSearchCV(pipe, {'modelo__C': [0.001, 0.01, 0.1, 1.0]}, cv=3).fit(X_tr, y_tr)\nres = resumo_cv_results(busca, 3)",
    "expr": "[d['desvio'] for d in res] == [float(busca.cv_results_['std_test_score'][i]) for i in (2, 3, 1)]",
    "expected": true,
    "name": "Os desvios são os std_test_score das mesmas combinações",
    "hint": "O desvio entre as partições está na chave std_test_score." },
  { "id": "resumo-tipos", "checkpoint": 4, "kind": "expr",
    "setup": "from sklearn.linear_model import LogisticRegression\nfrom sklearn.pipeline import Pipeline\nfrom sklearn.preprocessing import StandardScaler\nfrom dados_busca import gerar\npipe = Pipeline([('escalar', StandardScaler()), ('modelo', LogisticRegression())])\nfrom sklearn.model_selection import GridSearchCV\nX_tr, X_te, y_tr, y_te = gerar(0)\nbusca = GridSearchCV(pipe, {'modelo__C': [0.001, 0.01, 0.1, 1.0]}, cv=3).fit(X_tr, y_tr)\nres = resumo_cv_results(busca, 3)",
    "expr": "sorted({type(v).__name__ for d in res for v in (d['posicao'], d['media'], d['desvio'])})",
    "expected": ["float", "int"],
    "name": "posicao é int e media e desvio são float do Python",
    "hint": "Os valores do cv_results_ são do numpy." },
  { "id": "resumo-n", "checkpoint": 3, "kind": "expr",
    "setup": "from sklearn.linear_model import LogisticRegression\nfrom sklearn.pipeline import Pipeline\nfrom sklearn.preprocessing import StandardScaler\nfrom dados_busca import gerar\npipe = Pipeline([('escalar', StandardScaler()), ('modelo', LogisticRegression())])\nfrom sklearn.model_selection import GridSearchCV\nX_tr, X_te, y_tr, y_te = gerar(0)\nbusca = GridSearchCV(pipe, {'modelo__C': [0.001, 0.01, 0.1, 1.0]}, cv=3).fit(X_tr, y_tr)\nres = resumo_cv_results(busca, 3)",
    "expr": "[len(resumo_cv_results(busca, 1)), len(resumo_cv_results(busca, 2))]",
    "expected": [1, 2],
    "name": "O resumo tem n combinações" }
]
```

### Soluções erradas
```python name="grade sem o prefixo da etapa"
from sklearn.model_selection import GridSearchCV


def buscar_grade(pipeline, X_treino, y_treino, X_teste, y_teste, valores_C, k):
    busca = GridSearchCV(pipeline, {"C": valores_C}, cv=k)
    busca.fit(X_treino, y_treino)
    return {
        "melhor_C": float(busca.best_params_["C"]),
        "score_cv": float(busca.best_score_),
        "score_teste": float(busca.score(X_teste, y_teste)),
    }


def resumo_cv_results(busca, n):
    r = busca.cv_results_
    ordem = sorted(range(len(r["params"])), key=lambda i: r["rank_test_score"][i])
    return [
        {
            "posicao": int(r["rank_test_score"][i]),
            "params": r["params"][i],
            "media": float(r["mean_test_score"][i]),
            "desvio": float(r["std_test_score"][i]),
        }
        for i in ordem[:n]
    ]
```
```python name="escolhe o C pelo teste"
from sklearn.base import clone
from sklearn.model_selection import GridSearchCV, cross_val_score


def buscar_grade(pipeline, X_treino, y_treino, X_teste, y_teste, valores_C, k):
    notas = {}
    for C in valores_C:
        modelo = clone(pipeline).set_params(modelo__C=C).fit(X_treino, y_treino)
        notas[C] = modelo.score(X_teste, y_teste)
    melhor = max(valores_C, key=lambda C: notas[C])
    cv = cross_val_score(clone(pipeline).set_params(modelo__C=melhor), X_treino, y_treino, cv=k)
    return {"melhor_C": float(melhor), "score_cv": float(cv.mean()), "score_teste": float(notas[melhor])}


def resumo_cv_results(busca, n):
    r = busca.cv_results_
    ordem = sorted(range(len(r["params"])), key=lambda i: r["rank_test_score"][i])
    return [
        {
            "posicao": int(r["rank_test_score"][i]),
            "params": r["params"][i],
            "media": float(r["mean_test_score"][i]),
            "desvio": float(r["std_test_score"][i]),
        }
        for i in ordem[:n]
    ]
```
```python name="best_score_ apresentado como desempenho final"
from sklearn.model_selection import GridSearchCV


def buscar_grade(pipeline, X_treino, y_treino, X_teste, y_teste, valores_C, k):
    busca = GridSearchCV(pipeline, {"modelo__C": valores_C}, cv=k)
    busca.fit(X_treino, y_treino)
    return {
        "melhor_C": float(busca.best_params_["modelo__C"]),
        "score_cv": float(busca.best_score_),
        "score_teste": float(busca.best_score_),
    }


def resumo_cv_results(busca, n):
    r = busca.cv_results_
    ordem = sorted(range(len(r["params"])), key=lambda i: r["rank_test_score"][i])
    return [
        {
            "posicao": int(r["rank_test_score"][i]),
            "params": r["params"][i],
            "media": float(r["mean_test_score"][i]),
            "desvio": float(r["std_test_score"][i]),
        }
        for i in ordem[:n]
    ]
```
```python name="refit=False e score no teste"
from sklearn.model_selection import GridSearchCV


def buscar_grade(pipeline, X_treino, y_treino, X_teste, y_teste, valores_C, k):
    busca = GridSearchCV(pipeline, {"modelo__C": valores_C}, cv=k, refit=False)
    busca.fit(X_treino, y_treino)
    return {
        "melhor_C": float(busca.best_params_["modelo__C"]),
        "score_cv": float(busca.best_score_),
        "score_teste": float(busca.score(X_teste, y_teste)),
    }


def resumo_cv_results(busca, n):
    r = busca.cv_results_
    ordem = sorted(range(len(r["params"])), key=lambda i: r["rank_test_score"][i])
    return [
        {
            "posicao": int(r["rank_test_score"][i]),
            "params": r["params"][i],
            "media": float(r["mean_test_score"][i]),
            "desvio": float(r["std_test_score"][i]),
        }
        for i in ordem[:n]
    ]
```
```python name="rank lido como pontuação"
from sklearn.model_selection import GridSearchCV


def buscar_grade(pipeline, X_treino, y_treino, X_teste, y_teste, valores_C, k):
    busca = GridSearchCV(pipeline, {"modelo__C": valores_C}, cv=k)
    busca.fit(X_treino, y_treino)
    return {
        "melhor_C": float(busca.best_params_["modelo__C"]),
        "score_cv": float(busca.best_score_),
        "score_teste": float(busca.score(X_teste, y_teste)),
    }


def resumo_cv_results(busca, n):
    r = busca.cv_results_
    ordem = sorted(range(len(r["params"])), key=lambda i: r["rank_test_score"][i], reverse=True)
    return [
        {
            "posicao": int(r["rank_test_score"][i]),
            "params": r["params"][i],
            "media": float(r["mean_test_score"][i]),
            "desvio": float(r["std_test_score"][i]),
        }
        for i in ordem[:n]
    ]
```
```python name="números do numpy no resumo"
from sklearn.model_selection import GridSearchCV


def buscar_grade(pipeline, X_treino, y_treino, X_teste, y_teste, valores_C, k):
    busca = GridSearchCV(pipeline, {"modelo__C": valores_C}, cv=k)
    busca.fit(X_treino, y_treino)
    return {
        "melhor_C": float(busca.best_params_["modelo__C"]),
        "score_cv": float(busca.best_score_),
        "score_teste": float(busca.score(X_teste, y_teste)),
    }


def resumo_cv_results(busca, n):
    r = busca.cv_results_
    ordem = sorted(range(len(r["params"])), key=lambda i: r["rank_test_score"][i])
    return [
        {
            "posicao": r["rank_test_score"][i],
            "params": r["params"][i],
            "media": r["mean_test_score"][i],
            "desvio": r["std_test_score"][i],
        }
        for i in ordem[:n]
    ]
```
```python name="resumo com uma combinação a mais"
from sklearn.model_selection import GridSearchCV


def buscar_grade(pipeline, X_treino, y_treino, X_teste, y_teste, valores_C, k):
    busca = GridSearchCV(pipeline, {"modelo__C": valores_C}, cv=k)
    busca.fit(X_treino, y_treino)
    return {
        "melhor_C": float(busca.best_params_["modelo__C"]),
        "score_cv": float(busca.best_score_),
        "score_teste": float(busca.score(X_teste, y_teste)),
    }


def resumo_cv_results(busca, n):
    r = busca.cv_results_
    ordem = sorted(range(len(r["params"])), key=lambda i: r["rank_test_score"][i])
    return [
        {
            "posicao": int(r["rank_test_score"][i]),
            "params": r["params"][i],
            "media": float(r["mean_test_score"][i]),
            "desvio": float(r["std_test_score"][i]),
        }
        for i in ordem[:n + 1]
    ]
```

## Passo 6 · Exercício · Busca aleatória com semente

Escreva a busca aleatória reprodutível. As distribuições chegam prontas, num dicionário com as chaves já prefixadas.

### Instruções
1. `buscar_aleatoria(pipeline, X, y, distribuicoes, n_iter, semente)` roda um `RandomizedSearchCV` do `pipeline` com as `distribuicoes` recebidas, `n_iter` sorteios e `cv=3`.
2. O sorteio é fixado pela `semente`: a mesma semente sorteia as mesmas combinações e escolhe o mesmo vencedor.
3. Devolve a tupla `(melhores_parametros, melhor_score)`: o dicionário dos hiperparâmetros vencedores, com cada valor convertido em `float`, e a média de validação do vencedor, também `float`.

### Código inicial
```python
from scipy.stats import loguniform
from sklearn.model_selection import RandomizedSearchCV

from dados_busca import gerar


def buscar_aleatoria(pipeline, X, y, distribuicoes, n_iter, semente):
    pass
```
```python path=dados_busca.py
import numpy as np
from sklearn.model_selection import train_test_split


def gerar(semente=6, n=240):
    rng = np.random.default_rng(semente)
    X = rng.normal(size=(n, 6)).round(3)
    pesos = np.array([1.5, -1.0, 0.5, 0.0, 0.0, 0.0])
    y = (X @ pesos + rng.normal(0, 1.5, n) > 0).astype(np.int64)
    return train_test_split(X, y, test_size=0.25, random_state=0, stratify=y)
```

### Solução
```python
from scipy.stats import loguniform
from sklearn.model_selection import RandomizedSearchCV

from dados_busca import gerar


def buscar_aleatoria(pipeline, X, y, distribuicoes, n_iter, semente):
    busca = RandomizedSearchCV(pipeline, distribuicoes, n_iter=n_iter, cv=3, random_state=semente)
    busca.fit(X, y)
    melhores = {nome: float(valor) for nome, valor in busca.best_params_.items()}
    return melhores, float(busca.best_score_)
```
```python path=dados_busca.py
import numpy as np
from sklearn.model_selection import train_test_split


def gerar(semente=6, n=240):
    rng = np.random.default_rng(semente)
    X = rng.normal(size=(n, 6)).round(3)
    pesos = np.array([1.5, -1.0, 0.5, 0.0, 0.0, 0.0])
    y = (X @ pesos + rng.normal(0, 1.5, n) > 0).astype(np.int64)
    return train_test_split(X, y, test_size=0.25, random_state=0, stratify=y)
```

### Dicas
1. O `RandomizedSearchCV` recebe as distribuições no lugar da grade e o número de sorteios em `n_iter`.
2. Quem fixa o sorteio é o `random_state` da busca.
3. Os valores sorteados de uma distribuição do `scipy` chegam como `numpy.float64`.

### Verificação
```json
[
  { "id": "semente-0", "checkpoint": 1, "kind": "expr",
    "setup": "from sklearn.linear_model import LogisticRegression\nfrom sklearn.pipeline import Pipeline\nfrom sklearn.preprocessing import StandardScaler\nfrom dados_busca import gerar\npipe = Pipeline([('escalar', StandardScaler()), ('modelo', LogisticRegression())])\nfrom scipy.stats import loguniform\nX_tr, X_te, y_tr, y_te = gerar(0)\ndist = {'modelo__C': loguniform(1e-3, 1e2)}",
    "expr": "buscar_aleatoria(pipe, X_tr, y_tr, dist, 4, 0)",
    "expected": [{"modelo__C": 0.5547119471592125}, 0.7555555555555555],
    "tolerance": 1e-09,
    "name": "4 sorteios com a semente 0: o C vencedor e a sua média de validação",
    "hint": "Use as distribuições, o n_iter e a semente recebidos, com cv=3." },
  { "id": "semente-1", "checkpoint": 2, "kind": "expr",
    "setup": "from sklearn.linear_model import LogisticRegression\nfrom sklearn.pipeline import Pipeline\nfrom sklearn.preprocessing import StandardScaler\nfrom dados_busca import gerar\npipe = Pipeline([('escalar', StandardScaler()), ('modelo', LogisticRegression())])\nfrom scipy.stats import loguniform\nX_tr, X_te, y_tr, y_te = gerar(0)\ndist = {'modelo__C': loguniform(1e-3, 1e2)}",
    "expr": "buscar_aleatoria(pipe, X_tr, y_tr, dist, 4, 1)",
    "expected": [{"modelo__C": 0.0324835034508668}, 0.7611111111111111],
    "tolerance": 1e-09,
    "name": "Com a semente 1, outros sorteios e outro vencedor",
    "hint": "O random_state da busca é a semente recebida." },
  { "id": "mesma-semente", "checkpoint": 2, "kind": "expr",
    "setup": "from sklearn.linear_model import LogisticRegression\nfrom sklearn.pipeline import Pipeline\nfrom sklearn.preprocessing import StandardScaler\nfrom dados_busca import gerar\npipe = Pipeline([('escalar', StandardScaler()), ('modelo', LogisticRegression())])\nfrom scipy.stats import loguniform\nX_tr, X_te, y_tr, y_te = gerar(0)\ndist = {'modelo__C': loguniform(1e-3, 1e2)}",
    "expr": "buscar_aleatoria(pipe, X_tr, y_tr, dist, 3, 5) == buscar_aleatoria(pipe, X_tr, y_tr, dist, 3, 5)",
    "expected": true,
    "name": "A mesma semente dá o mesmo resultado",
    "hint": "Sem random_state, cada chamada sorteia outras combinações." },
  { "id": "ajustes-4", "checkpoint": 1, "kind": "expr",
    "setup": "from sklearn.linear_model import LogisticRegression\nfrom sklearn.pipeline import Pipeline\nfrom sklearn.preprocessing import StandardScaler\nfrom dados_busca import gerar\npipe = Pipeline([('escalar', StandardScaler()), ('modelo', LogisticRegression())])\nfrom scipy.stats import loguniform\nX_tr, X_te, y_tr, y_te = gerar(0)\ndist = {'modelo__C': loguniform(1e-3, 1e2)}\ncs = []\nclass Espiao(LogisticRegression):\n    def fit(self, X, y, sample_weight=None):\n        cs.append(self.C)\n        return super().fit(X, y, sample_weight)\npipe_e = Pipeline([('escalar', StandardScaler()), ('modelo', Espiao())])\nbuscar_aleatoria(pipe_e, X_tr, y_tr, dist, 4, 0)",
    "expr": "[len(cs), len(set(cs))]",
    "expected": [13, 4],
    "name": "4 sorteios × 3 partições + o refit: 13 ajustes com 4 valores de C",
    "hint": "O número de sorteios é o n_iter recebido, e a validação usa 3 partições." },
  { "id": "ajustes-2", "checkpoint": 1, "kind": "expr",
    "setup": "from sklearn.linear_model import LogisticRegression\nfrom sklearn.pipeline import Pipeline\nfrom sklearn.preprocessing import StandardScaler\nfrom dados_busca import gerar\npipe = Pipeline([('escalar', StandardScaler()), ('modelo', LogisticRegression())])\nfrom scipy.stats import loguniform\nX_tr, X_te, y_tr, y_te = gerar(0)\ndist = {'modelo__C': loguniform(1e-3, 1e2)}\ncs = []\nclass Espiao(LogisticRegression):\n    def fit(self, X, y, sample_weight=None):\n        cs.append(self.C)\n        return super().fit(X, y, sample_weight)\npipe_e = Pipeline([('escalar', StandardScaler()), ('modelo', Espiao())])\nbuscar_aleatoria(pipe_e, X_tr, y_tr, dist, 2, 0)",
    "expr": "[len(cs), len(set(cs))]",
    "expected": [7, 2],
    "name": "2 sorteios: 7 ajustes com 2 valores de C" },
  { "id": "lista", "checkpoint": 1, "kind": "expr",
    "setup": "from sklearn.linear_model import LogisticRegression\nfrom sklearn.pipeline import Pipeline\nfrom sklearn.preprocessing import StandardScaler\nfrom dados_busca import gerar\npipe = Pipeline([('escalar', StandardScaler()), ('modelo', LogisticRegression())])\nfrom scipy.stats import loguniform\nX_tr, X_te, y_tr, y_te = gerar(0)\ndist = {'modelo__C': loguniform(1e-3, 1e2)}",
    "expr": "buscar_aleatoria(pipe, X_tr, y_tr, {'modelo__C': [0.01, 0.1, 1.0]}, 3, 0)",
    "expected": [{"modelo__C": 0.1}, 0.7555555555555555],
    "tolerance": 1e-09,
    "name": "Com uma lista de 3 valores e 3 sorteios, todos são testados" },
  { "id": "tipos", "checkpoint": 3, "kind": "expr",
    "setup": "from sklearn.linear_model import LogisticRegression\nfrom sklearn.pipeline import Pipeline\nfrom sklearn.preprocessing import StandardScaler\nfrom dados_busca import gerar\npipe = Pipeline([('escalar', StandardScaler()), ('modelo', LogisticRegression())])\nfrom scipy.stats import loguniform\nX_tr, X_te, y_tr, y_te = gerar(0)\ndist = {'modelo__C': loguniform(1e-3, 1e2)}\nr = buscar_aleatoria(pipe, X_tr, y_tr, dist, 4, 0)",
    "expr": "[type(r).__name__, type(r[0]['modelo__C']).__name__, type(r[1]).__name__]",
    "expected": ["tuple", "float", "float"],
    "name": "Devolve uma tupla, com o C e a média como float do Python" }
]
```

### Soluções erradas
```python name="sem random_state"
from scipy.stats import loguniform
from sklearn.model_selection import RandomizedSearchCV


def buscar_aleatoria(pipeline, X, y, distribuicoes, n_iter, semente):
    busca = RandomizedSearchCV(pipeline, distribuicoes, n_iter=n_iter, cv=3)
    busca.fit(X, y)
    melhores = {nome: float(valor) for nome, valor in busca.best_params_.items()}
    return melhores, float(busca.best_score_)
```
```python name="semente fixa"
from scipy.stats import loguniform
from sklearn.model_selection import RandomizedSearchCV


def buscar_aleatoria(pipeline, X, y, distribuicoes, n_iter, semente):
    busca = RandomizedSearchCV(pipeline, distribuicoes, n_iter=n_iter, cv=3, random_state=0)
    busca.fit(X, y)
    melhores = {nome: float(valor) for nome, valor in busca.best_params_.items()}
    return melhores, float(busca.best_score_)
```
```python name="ignora n_iter"
from scipy.stats import loguniform
from sklearn.model_selection import RandomizedSearchCV


def buscar_aleatoria(pipeline, X, y, distribuicoes, n_iter, semente):
    busca = RandomizedSearchCV(pipeline, distribuicoes, cv=3, random_state=semente)
    busca.fit(X, y)
    melhores = {nome: float(valor) for nome, valor in busca.best_params_.items()}
    return melhores, float(busca.best_score_)
```
```python name="cv padrão"
from scipy.stats import loguniform
from sklearn.model_selection import RandomizedSearchCV


def buscar_aleatoria(pipeline, X, y, distribuicoes, n_iter, semente):
    busca = RandomizedSearchCV(pipeline, distribuicoes, n_iter=n_iter, random_state=semente)
    busca.fit(X, y)
    melhores = {nome: float(valor) for nome, valor in busca.best_params_.items()}
    return melhores, float(busca.best_score_)
```
```python name="GridSearchCV com distribuições"
from scipy.stats import loguniform
from sklearn.model_selection import GridSearchCV


def buscar_aleatoria(pipeline, X, y, distribuicoes, n_iter, semente):
    busca = GridSearchCV(pipeline, distribuicoes, cv=3)
    busca.fit(X, y)
    melhores = {nome: float(valor) for nome, valor in busca.best_params_.items()}
    return melhores, float(busca.best_score_)
```
```python name="valores do numpy"
from scipy.stats import loguniform
from sklearn.model_selection import RandomizedSearchCV


def buscar_aleatoria(pipeline, X, y, distribuicoes, n_iter, semente):
    busca = RandomizedSearchCV(pipeline, distribuicoes, n_iter=n_iter, cv=3, random_state=semente)
    busca.fit(X, y)
    return busca.best_params_, float(busca.best_score_)
```

## Passo 7 · Quiz · Grade ou aleatória

### Pergunta
Um pipeline tem um `SVC` com dois hiperparâmetros contínuos, `C` e `gamma`, e cada ajuste leva 1 s. O orçamento é de cerca de 5 minutos com `cv=5`. Testes anteriores sugerem que só o `gamma` muda muito o resultado. Qual busca aproveita melhor o orçamento?
- [ ] `GridSearchCV` com 8 valores de `C` × 8 de `gamma`: 64 combinações cobrem bem o plano
- [x] `RandomizedSearchCV` com `loguniform` para os dois e `n_iter=60`: 60 valores diferentes de `gamma`, no mesmo orçamento de cerca de 300 ajustes
- [ ] `GridSearchCV` com 60 valores de `C` e um de `gamma`, porque o `C` é o mais conhecido
- [ ] `RandomizedSearchCV` com `uniform(0, 100)` para os dois, porque o sorteio uniforme é mais justo
> A grade de 64 combinações custa $64 \times 5 + 1 = 321$ ajustes, já acima do orçamento, e testa só 8 valores do `gamma`. A busca aleatória com 60 sorteios custa $60 \times 5 + 1 = 301$ e testa 60 valores distintos de cada hiperparâmetro, o que importa quando só um deles faz diferença. Fixar o `gamma` ignora justamente o hiperparâmetro que importa. E o sorteio uniforme entre 0 e 100 põe 99 % dos valores acima de 1, sem explorar as ordens de grandeza pequenas; a `loguniform` dá a mesma chance a cada ordem de grandeza.

### Pergunta
Depois de um `GridSearchCV(pipe, {"modelo__C": [0.01, 0.1, 1]}, cv=5).fit(X_treino, y_treino)`, a tabela mostra:

```text
param_modelo__C  mean_test_score  rank_test_score
0.01             0.71             3
0.1              0.84             1
1                0.80             2
```

Um colega ordena por `rank_test_score` com `ascending=False` e escolhe a primeira linha. O que acontece?
- [ ] Ele escolhe `C=0.1`, porque o rank mais alto é o melhor
- [x] Ele escolhe `C=0.01`, a pior combinação: o rank é a posição, e 1 é a melhor
- [ ] Ele escolhe `C=1`, porque o rank 2 fica no meio
- [ ] O pandas recusa ordenar o `rank_test_score`, que é uma coluna de inteiros
> O `rank_test_score` é a colocação: o 1 é o primeiro lugar, que tem o maior `mean_test_score`. Em ordem decrescente, o 3 vem primeiro, e ele pega `C=0.01`. O `best_params_` já dá a resposta certa sem ordenar nada. O pandas ordena colunas de inteiros sem problema.

### Pergunta
Uma busca com 200 combinações e `cv=5` termina com `best_score_ = 0,93`. O modelo do refit acerta 0,86 no teste, que ficou guardado desde o começo. O que explica a diferença, e qual número apresentar?
- [ ] O teste está errado, porque o modelo final usou mais dados que os da validação cruzada; apresente 0,93
- [ ] O refit estragou o modelo; apresente 0,93 e use o `best_estimator_` sem refit
- [x] Entre 200 combinações, o vencedor é em parte o que teve sorte nas partições, e o `best_score_` fica otimista; apresente 0,86
- [ ] As duas medidas são equivalentes, e a média delas, 0,895, é a estimativa mais precisa
> O `best_score_` é o máximo de 200 médias ruidosas, e o máximo de muitos números ruidosos tende a ficar acima do valor verdadeiro. O teste não participou da escolha e é a medida honesta. Treinar com mais dados no refit costuma ajudar, não atrapalhar; sem refit, nem existe `best_estimator_`. Fazer a média com um número otimista só esconde o problema; se não houver teste, a validação aninhada mede o processo de escolha sem esse otimismo.
