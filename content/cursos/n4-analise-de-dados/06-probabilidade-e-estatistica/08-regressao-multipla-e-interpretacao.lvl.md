---
slug: n4-m6-08-regressao-multipla-e-interpretacao
titulo: Regressão múltipla e interpretação
descricao: Várias variáveis explicativas, variáveis categóricas (dummies), interpretação 'mantendo o resto constante', multicolinearidade e diagnóstico.
dificuldade: intermediario
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
- Ajustar regressão múltipla com numpy (equação normal) e com scikit-learn e interpretar cada coeficiente
- Codificar variáveis categóricas com dummies e evitar a armadilha das dummies
- Diagnosticar multicolinearidade e resíduos e comparar modelos por R² ajustado
---

## Passo 1 · Leitura · Vários preditores, uma coisa de cada vez

Uma imobiliária fictícia tem 200 apartamentos para alugar numa cidade inventada, com a área em m², o número de quartos, o bairro e o aluguel. Uma regressão simples do aluguel pelos quartos dá uma inclinação de cerca de R\$ 534 por quarto. Mas apartamentos com mais quartos também são maiores (a correlação entre área e quartos é 0,79), e a regressão simples atribui aos quartos o efeito da área.

A **regressão linear múltipla** usa vários preditores ao mesmo tempo:

$$
\hat y = \beta_0 + \beta_1 x_1 + \beta_2 x_2 + \cdots + \beta_p x_p
$$

Em forma de matriz, $X$ tem uma linha por apartamento, uma coluna de uns (para o intercepto $\beta_0$) e uma coluna por preditor. Os coeficientes de mínimos quadrados saem da mesma **equação normal** da m1-04, agora com mais colunas:

$$
X^\top X\, \beta = X^\top y
$$

Com área, quartos e bairro juntos, o ajuste dá cerca de R\$ 22,8 por m² e R\$ 59,6 por quarto. A leitura de cada coeficiente é ***ceteris paribus***, "mantendo o resto constante": **entre apartamentos com a mesma área e no mesmo bairro**, cada quarto a mais está associado, em média, a R\$ 59,6 a mais de aluguel. O coeficiente dos quartos caiu de 534 para 60 porque agora a área responde pelo que é dela.

```python
X1 = np.column_stack([np.ones(len(df)), df["area"], df["quartos"]])
beta = np.linalg.solve(X1.T @ X1, X1.T @ df["aluguel"])
```

Três cuidados na interpretação. Primeiro, a unidade: R\$ por m² e R\$ por quarto não são comparáveis em tamanho; "o coeficiente dos quartos é maior, então quartos importam mais" mistura escalas (um quarto a mais é uma mudança muito maior que um m² a mais). Para comparar importâncias, padronize os preditores antes, com o escore $z$ da m1-01. Segundo, "mantendo o resto constante" é uma conta, não um experimento: o modelo só controla as variáveis que entraram nele, e uma confusão não medida continua lá. Terceiro, a equação normal só tem solução única se nenhuma coluna for combinação das outras; caso contrário $X^\top X$ é singular. No executor, o `np.linalg.solve` não acusa isso (devolve números sem sentido, como na m1-04), então a função confere o posto antes: `np.linalg.matrix_rank(X1) < X1.shape[1]`.

## Passo 2 · Exercício · Equação normal com várias colunas
modo: lacunas

Complete as lacunas (`___`) para ajustar uma regressão múltipla pela equação normal.

### Instruções
1. `regressao_multipla(X, y)` monta a matriz com uma coluna de uns **na frente** das colunas de `X` (que pode ter uma ou várias colunas).
2. Se as colunas forem linearmente dependentes (posto menor que o número de colunas), levanta `ValueError`.
3. Resolve $X^\top X \beta = X^\top y$ com `np.linalg.solve` e devolve os coeficientes como lista de `float`, com o intercepto primeiro.

### Código inicial
```python
import numpy as np


def regressao_multipla(X, y):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    X1 = np.column_stack(___)
    if np.linalg.matrix_rank(X1) ___ X1.shape[1]:
        raise ValueError("colunas linearmente dependentes: a equação normal não tem solução única")
    beta = np.linalg.solve(___, ___)
    return beta.tolist()
```

### Solução
```python
import numpy as np


def regressao_multipla(X, y):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    X1 = np.column_stack([np.ones(len(X)), X])
    if np.linalg.matrix_rank(X1) < X1.shape[1]:
        raise ValueError("colunas linearmente dependentes: a equação normal não tem solução única")
    beta = np.linalg.solve(X1.T @ X1, X1.T @ y)
    return beta.tolist()
```

### Dicas
1. O `np.column_stack` recebe uma lista de arrays e põe cada um como coluna; a ordem da lista é a ordem das colunas.
2. Posto completo é posto igual ao número de colunas.
3. Os dois lados da equação normal começam com a transposta de `X1`.

### Verificação
```json
[
  { "id": "tipos", "checkpoint": 3, "kind": "expr", "setup": "r = regressao_multipla([[1, 2], [2, 1], [3, 5], [4, 3], [5, 8]], [7, 7, 6, 11, 9])",
    "expr": "[type(r).__name__, len(r), type(r[0]).__name__]", "expected": ["list", 3, "float"],
    "name": "Devolve uma lista de float com um coeficiente por coluna mais o intercepto" },
  { "id": "exato", "checkpoint": 3, "kind": "expr", "expr": "regressao_multipla([[1, 2], [2, 1], [3, 5], [4, 3], [5, 8]], [3, 7, 6, 11, 9])",
    "expected": [2.0, 3.0, -1.0], "tolerance": 1e-9, "name": "Pontos sobre y = 2 + 3x₁ - x₂: [2, 3, -1]",
    "hint": "O intercepto vem primeiro: a coluna de uns fica na frente." },
  { "id": "tres-preditores", "checkpoint": 3, "kind": "expr",
    "expr": "regressao_multipla([[1, 7, 2], [2, 3, 5], [3, 8, 1], [4, 2, 2], [5, 6, 7], [6, 1, 3], [7, 9, 4], [8, 4, 6]], [10.2, 9.1, 14.8, 8.3, 17.9, 9.6, 22.1, 15.0])",
    "expected": [0.08595622720165716, 1.0166232412714964, 1.3463522668056265, 0.5286607608129226], "tolerance": 1e-9,
    "name": "Três preditores com ruído (conferido com np.linalg.lstsq)" },
  { "id": "um-preditor", "checkpoint": 1, "kind": "expr",
    "expr": "regressao_multipla([1, 2, 3, 4, 5, 6], [2.1, 3.9, 6.2, 7.8, 10.1, 12.0])",
    "expected": [0.0466666666666646, 1.9914285714285722], "tolerance": 1e-9, "name": "X com uma coluna só (array 1D)" },
  { "id": "dois-pontos", "checkpoint": 3, "kind": "expr", "expr": "regressao_multipla([[0], [1]], [1, 3])",
    "expected": [1.0, 2.0], "tolerance": 1e-9, "name": "Dois pontos e um preditor: a reta passa pelos dois" },
  { "id": "colinear", "checkpoint": 2, "kind": "expr",
    "expr": "regressao_multipla([[1, 2], [2, 4], [3, 6], [4, 8]], [1, 2, 2, 3])", "raises": "ValueError",
    "name": "Uma coluna dobro da outra é recusada", "hint": "Confira o posto de X1 antes de resolver." },
  { "id": "entrada-intacta", "checkpoint": 1, "kind": "expr",
    "setup": "X = np.array([[1.0, 2.0], [2.0, 1.0], [3.0, 5.0], [4.0, 3.0]])\ncopia = X.copy()\nr = regressao_multipla(X, [1.0, 2.0, 3.0, 5.0])",
    "expr": "X.tolist() == copia.tolist()", "expected": true, "name": "A matriz recebida não muda" }
]
```

### Soluções erradas
```python name="sem intercepto"
import numpy as np


def regressao_multipla(X, y):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    X1 = np.column_stack([X])
    if np.linalg.matrix_rank(X1) < X1.shape[1]:
        raise ValueError("colunas linearmente dependentes: a equação normal não tem solução única")
    beta = np.linalg.solve(X1.T @ X1, X1.T @ y)
    return beta.tolist()
```
```python name="intercepto no fim"
import numpy as np


def regressao_multipla(X, y):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    X1 = np.column_stack([X, np.ones(len(X))])
    if np.linalg.matrix_rank(X1) < X1.shape[1]:
        raise ValueError("colunas linearmente dependentes: a equação normal não tem solução única")
    beta = np.linalg.solve(X1.T @ X1, X1.T @ y)
    return beta.tolist()
```
```python name="recusa também o posto completo"
import numpy as np


def regressao_multipla(X, y):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    X1 = np.column_stack([np.ones(len(X)), X])
    if np.linalg.matrix_rank(X1) <= X1.shape[1]:
        raise ValueError("colunas linearmente dependentes: a equação normal não tem solução única")
    beta = np.linalg.solve(X1.T @ X1, X1.T @ y)
    return beta.tolist()
```
```python name="transposta do lado errado"
import numpy as np


def regressao_multipla(X, y):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    X1 = np.column_stack([np.ones(len(X)), X])
    if np.linalg.matrix_rank(X1) < X1.shape[1]:
        raise ValueError("colunas linearmente dependentes: a equação normal não tem solução única")
    beta = np.linalg.solve(X1 @ X1.T, X1.T @ y)
    return beta.tolist()
```
```python name="esquece o Xᵀ do lado direito"
import numpy as np


def regressao_multipla(X, y):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    X1 = np.column_stack([np.ones(len(X)), X])
    if np.linalg.matrix_rank(X1) < X1.shape[1]:
        raise ValueError("colunas linearmente dependentes: a equação normal não tem solução única")
    beta = np.linalg.solve(X1.T @ X1, y)
    return beta.tolist()
```

## Passo 3 · Leitura · Dummies e a armadilha

O bairro é uma variável **categórica**: "Centro", "Norte", "Sul". Uma regressão só multiplica números, então cada categoria vira uma coluna **indicadora** (*dummy*), que vale 1 nas linhas daquela categoria e 0 nas outras. O `pd.get_dummies` faz isso:

```python
pd.get_dummies(df, columns=["bairro"], drop_first=True, dtype=float)
#    area  quartos  bairro_Norte  bairro_Sul
```

Três detalhes. As categorias entram em **ordem alfabética**, e `drop_first=True` descarta a primeira, aqui o Centro, que vira a **categoria de referência**. No pandas 3, as dummies saem como colunas `bool`; o `dtype=float` (ou um `astype(float)` depois) dá colunas numéricas, prontas para a álgebra. E o `columns=` diz quais colunas codificar: sem ele, toda coluna de texto é codificada, inclusive as que não deviam (um código de imóvel viraria centenas de colunas).

Por que descartar uma? Com as três dummies, as três somam 1 em toda linha, exatamente a coluna de uns do intercepto. As colunas ficam linearmente dependentes, $X^\top X$ é singular e os coeficientes não têm solução única: é a **armadilha das dummies**. Descartar uma resolve, e muda a leitura dos coeficientes: cada dummy mede a diferença **em relação à categoria de referência**, mantendo o resto constante. No ajuste dos 200 apartamentos, `bairro_Norte` vale cerca de $-260$: um apartamento no Norte tem aluguel, em média, R\$ 260 menor que um do Centro com a mesma área e o mesmo número de quartos. Não é a diferença entre as médias simples dos bairros, que mistura apartamentos de tamanhos diferentes.

O scikit-learn, biblioteca de aprendizado de máquina do Nível 5, faz o mesmo ajuste com a interface `fit`/`predict` que ele usa para todo modelo:

```python
from sklearn.linear_model import LinearRegression

X = pd.get_dummies(df.drop(columns="aluguel"), columns=["bairro"], drop_first=True, dtype=float)
modelo = LinearRegression().fit(X, df["aluguel"])
modelo.intercept_, modelo.coef_     # o intercepto e um coeficiente por coluna, na ordem de X
modelo.predict(X.head(2))           # previsões para as duas primeiras linhas
modelo.score(X, df["aluguel"])      # R²: 0.951
```

O `LinearRegression` põe o intercepto sozinho (`fit_intercept=True`, o padrão): você não acrescenta a coluna de uns. O `coef_` é um array na ordem das colunas de `X`; para ler os coeficientes, junte-o aos nomes com `zip(X.columns, modelo.coef_)`. E nunca deixe a coluna alvo dentro de `X`: o modelo a usaria para prever a si mesma, com $R^2 = 1$ e coeficientes sem sentido.

## Passo 4 · Previsão · As colunas que o get_dummies cria

O programa codifica duas colunas categóricas de uma tabela fictícia de três apartamentos. Digite a saída.

### Código
```python
import pandas as pd

df = pd.DataFrame({
    "area": [50, 70, 65],
    "bairro": ["Sul", "Centro", "Norte"],
    "mobiliado": ["sim", "não", "sim"],
})
d = pd.get_dummies(df, columns=["bairro", "mobiliado"], drop_first=True)
print(list(d.columns))
print(d.dtypes.astype(str).tolist())
print(d.astype(int).iloc[1].tolist())
print(len(pd.get_dummies(df, columns=["bairro"]).columns))
```

### Dicas
1. As categorias entram em ordem alfabética, e o `drop_first` descarta a primeira de cada coluna codificada.
2. No pandas 3, as dummies são `bool`; a área continua inteira.
3. Sem `drop_first`, cada categoria do bairro vira uma coluna, e a coluna `mobiliado`, que não foi codificada, continua lá.

### Saída esperada
```text
['area', 'bairro_Norte', 'bairro_Sul', 'mobiliado_sim']
['int64', 'bool', 'bool', 'bool']
[70, 0, 0, 0]
5
```

## Passo 5 · Exercício · Dummies e scikit-learn

Prepare as dummies de uma tabela e ajuste uma regressão com o `LinearRegression` do scikit-learn.

### Instruções
1. `preparar_dummies(df, colunas)` devolve uma tabela nova em que só as colunas listadas em `colunas` viram dummies, com `drop_first=True` e valores `float`; as outras colunas continuam como estão, e `df` não muda.
2. `ajustar_sklearn(df, alvo)` ajusta um `LinearRegression` (com intercepto) usando todas as colunas de `df` menos `alvo` como preditores.
3. Devolve `{"intercepto": float, "coeficientes": {coluna: float}}`, com as colunas na ordem de `df`.

### Código inicial
```python
import pandas as pd
from sklearn.linear_model import LinearRegression


def preparar_dummies(df, colunas):
    pass


def ajustar_sklearn(df, alvo):
    pass
```

### Solução
```python
import pandas as pd
from sklearn.linear_model import LinearRegression


def preparar_dummies(df, colunas):
    return pd.get_dummies(df, columns=colunas, drop_first=True, dtype=float)


def ajustar_sklearn(df, alvo):
    X = df.drop(columns=alvo)
    modelo = LinearRegression().fit(X, df[alvo])
    coeficientes = {coluna: float(c) for coluna, c in zip(X.columns, modelo.coef_)}
    return {"intercepto": float(modelo.intercept_), "coeficientes": coeficientes}
```

### Dicas
1. O `get_dummies` tem parâmetros para escolher as colunas, descartar a primeira categoria e o tipo dos valores.
2. O `drop(columns=...)` devolve uma tabela nova sem a coluna alvo.
3. O `coef_` é um array do numpy: junte cada valor ao nome da sua coluna e converta para `float`.

### Verificação
```json
[
  { "id": "colunas", "checkpoint": 1, "kind": "expr",
    "setup": "df = pd.DataFrame({'codigo': ['a1', 'b2', 'c3', 'd4'], 'area': [50, 70, 65, 40], 'bairro': ['Sul', 'Centro', 'Norte', 'Sul'], 'mobiliado': ['sim', 'não', 'sim', 'não']})\nd = preparar_dummies(df, ['bairro', 'mobiliado'])",
    "expr": "list(d.columns)", "expected": ["codigo", "area", "bairro_Norte", "bairro_Sul", "mobiliado_sim"],
    "name": "Só as colunas pedidas viram dummies, sem a primeira categoria",
    "hint": "Diga ao get_dummies quais colunas codificar e descarte a categoria de referência." },
  { "id": "dtypes", "checkpoint": 1, "kind": "expr",
    "setup": "df = pd.DataFrame({'codigo': ['a1', 'b2', 'c3', 'd4'], 'area': [50, 70, 65, 40], 'bairro': ['Sul', 'Centro', 'Norte', 'Sul'], 'mobiliado': ['sim', 'não', 'sim', 'não']})\nd = preparar_dummies(df, ['bairro', 'mobiliado'])",
    "expr": "d.dtypes.astype(str).tolist()", "expected": ["str", "int64", "float64", "float64", "float64"],
    "name": "As dummies são float e as outras colunas não mudam de tipo", "hint": "No pandas 3 as dummies saem bool por padrão." },
  { "id": "valores", "checkpoint": 1, "kind": "expr",
    "setup": "df = pd.DataFrame({'codigo': ['a1', 'b2', 'c3', 'd4'], 'area': [50, 70, 65, 40], 'bairro': ['Sul', 'Centro', 'Norte', 'Sul'], 'mobiliado': ['sim', 'não', 'sim', 'não']})\nd = preparar_dummies(df, ['bairro', 'mobiliado'])",
    "expr": "d[['bairro_Norte', 'bairro_Sul', 'mobiliado_sim']].to_dict('list')",
    "expected": { "bairro_Norte": [0.0, 0.0, 1.0, 0.0], "bairro_Sul": [1.0, 0.0, 0.0, 1.0], "mobiliado_sim": [1.0, 0.0, 1.0, 0.0] },
    "name": "O Centro é a referência: zero nas duas dummies de bairro" },
  { "id": "entrada-intacta", "checkpoint": 1, "kind": "expr",
    "setup": "df = pd.DataFrame({'area': [50, 70], 'bairro': ['Sul', 'Centro']})\ncopia = df.copy()\nd = preparar_dummies(df, ['bairro'])",
    "expr": "df.equals(copia)", "expected": true, "name": "A tabela recebida não muda" },
  { "id": "ajuste", "checkpoint": 2, "kind": "expr",
    "setup": "t = pd.DataFrame({'area': [40.0, 55, 70, 85, 60, 90], 'bairro_Norte': [0.0, 1, 0, 1, 0, 0], 'bairro_Sul': [0.0, 0, 1, 0, 0, 1]})\nt['aluguel'] = 500 + 20 * t['area'] - 300 * t['bairro_Norte'] + 150 * t['bairro_Sul']\nr = ajustar_sklearn(t, 'aluguel')",
    "expr": "[r['intercepto'], r['coeficientes']['area'], r['coeficientes']['bairro_Norte'], r['coeficientes']['bairro_Sul']]",
    "expected": [500.0, 20.0, -300.0, 150.0], "tolerance": 1e-6,
    "name": "Aluguel exato = 500 + 20·área - 300·Norte + 150·Sul",
    "hint": "A coluna alvo não pode estar entre os preditores, e o intercepto fica ligado." },
  { "id": "chaves", "checkpoint": 3, "kind": "expr",
    "setup": "t = pd.DataFrame({'x': [1.0, 2, 3, 4], 'y': [3.0, 5, 7, 10], 'z': [0.0, 1, 0, 1]})\nr = ajustar_sklearn(t, 'y')",
    "expr": "[sorted(r), list(r['coeficientes'])]", "expected": [["coeficientes", "intercepto"], ["x", "z"]],
    "name": "coeficientes é um dicionário com as colunas na ordem da tabela, sem o alvo" },
  { "id": "tipos", "checkpoint": 3, "kind": "expr",
    "setup": "t = pd.DataFrame({'x': [1.0, 2, 3, 4], 'y': [3.0, 5, 7, 10], 'z': [0.0, 1, 0, 1]})\nr = ajustar_sklearn(t, 'y')",
    "expr": "[type(r['intercepto']).__name__, type(r['coeficientes']['x']).__name__]", "expected": ["float", "float"],
    "name": "Intercepto e coeficientes são float do Python" },
  { "id": "alvo-no-meio", "checkpoint": 2, "kind": "expr",
    "setup": "t = pd.DataFrame({'a': [1.0, 2, 3, 4, 5], 'alvo': [5.0, 9, 10, 15, 16], 'b': [2.0, 1, 4, 3, 5]})\nr = ajustar_sklearn(t, 'alvo')",
    "expr": "[r['intercepto'], r['coeficientes']['a'], r['coeficientes']['b']]", "expected": [3.1666666666666536, 3.5555555555555576, -0.9444444444444433], "tolerance": 1e-6,
    "name": "A coluna alvo pode estar em qualquer posição" }
]
```

### Soluções erradas
```python name="mantém todas as dummies"
import pandas as pd
from sklearn.linear_model import LinearRegression


def preparar_dummies(df, colunas):
    return pd.get_dummies(df, columns=colunas, dtype=float)


def ajustar_sklearn(df, alvo):
    X = df.drop(columns=alvo)
    modelo = LinearRegression().fit(X, df[alvo])
    coeficientes = {coluna: float(c) for coluna, c in zip(X.columns, modelo.coef_)}
    return {"intercepto": float(modelo.intercept_), "coeficientes": coeficientes}
```
```python name="dummies bool"
import pandas as pd
from sklearn.linear_model import LinearRegression


def preparar_dummies(df, colunas):
    return pd.get_dummies(df, columns=colunas, drop_first=True)


def ajustar_sklearn(df, alvo):
    X = df.drop(columns=alvo)
    modelo = LinearRegression().fit(X, df[alvo])
    coeficientes = {coluna: float(c) for coluna, c in zip(X.columns, modelo.coef_)}
    return {"intercepto": float(modelo.intercept_), "coeficientes": coeficientes}
```
```python name="codifica todas as colunas de texto"
import pandas as pd
from sklearn.linear_model import LinearRegression


def preparar_dummies(df, colunas):
    return pd.get_dummies(df, drop_first=True, dtype=float)


def ajustar_sklearn(df, alvo):
    X = df.drop(columns=alvo)
    modelo = LinearRegression().fit(X, df[alvo])
    coeficientes = {coluna: float(c) for coluna, c in zip(X.columns, modelo.coef_)}
    return {"intercepto": float(modelo.intercept_), "coeficientes": coeficientes}
```
```python name="alvo entre os preditores"
import pandas as pd
from sklearn.linear_model import LinearRegression


def preparar_dummies(df, colunas):
    return pd.get_dummies(df, columns=colunas, drop_first=True, dtype=float)


def ajustar_sklearn(df, alvo):
    X = df
    modelo = LinearRegression().fit(X, df[alvo])
    coeficientes = {coluna: float(c) for coluna, c in zip(X.columns, modelo.coef_)}
    return {"intercepto": float(modelo.intercept_), "coeficientes": coeficientes}
```
```python name="sem intercepto"
import pandas as pd
from sklearn.linear_model import LinearRegression


def preparar_dummies(df, colunas):
    return pd.get_dummies(df, columns=colunas, drop_first=True, dtype=float)


def ajustar_sklearn(df, alvo):
    X = df.drop(columns=alvo)
    modelo = LinearRegression(fit_intercept=False).fit(X, df[alvo])
    coeficientes = {coluna: float(c) for coluna, c in zip(X.columns, modelo.coef_)}
    return {"intercepto": float(modelo.intercept_), "coeficientes": coeficientes}
```
```python name="supõe o alvo na última coluna"
import pandas as pd
from sklearn.linear_model import LinearRegression


def preparar_dummies(df, colunas):
    return pd.get_dummies(df, columns=colunas, drop_first=True, dtype=float)


def ajustar_sklearn(df, alvo):
    X = df.iloc[:, :-1]
    modelo = LinearRegression().fit(X, df[alvo])
    coeficientes = {coluna: float(c) for coluna, c in zip(X.columns, modelo.coef_)}
    return {"intercepto": float(modelo.intercept_), "coeficientes": coeficientes}
```
```python name="devolve números do numpy"
import pandas as pd
from sklearn.linear_model import LinearRegression


def preparar_dummies(df, colunas):
    return pd.get_dummies(df, columns=colunas, drop_first=True, dtype=float)


def ajustar_sklearn(df, alvo):
    X = df.drop(columns=alvo)
    modelo = LinearRegression().fit(X, df[alvo])
    coeficientes = dict(zip(X.columns, modelo.coef_))
    return {"intercepto": modelo.intercept_, "coeficientes": coeficientes}
```

## Passo 6 · Leitura · R² ajustado e multicolinearidade

Acrescentar um preditor ao modelo **nunca diminui** o $R^2$, mesmo que o preditor seja ruído puro: com uma coluna a mais, os mínimos quadrados podem, no pior caso, dar coeficiente zero a ela e ficar onde estavam. Comparar modelos com números diferentes de preditores pelo $R^2$ favorece sempre o maior. O **$R^2$ ajustado** cobra um preço por preditor, com $n$ observações e $p$ preditores (sem contar o intercepto):

$$
R^2_{aj} = 1 - (1 - R^2)\,\frac{n - 1}{n - p - 1}
$$

Ele só sobe quando o preditor novo melhora o ajuste mais do que o acaso melhoraria, e pode ficar negativo num modelo ruim. Com $n - p - 1 \le 0$ ele não é definido: há tantos coeficientes quanto pontos, e o ajuste é perfeito por construção.

O segundo problema é a **multicolinearidade**: preditores muito correlacionados entre si, como área e número de cômodos. O modelo continua prevendo bem, mas não consegue separar o efeito de um do efeito do outro: os coeficientes ficam instáveis, com erros padrão grandes, e às vezes com o sinal "errado". O **fator de inflação da variância** (VIF) mede isso coluna a coluna: regrida o preditor $j$ em todos os outros (com intercepto), pegue o $R^2_j$ dessa regressão auxiliar e calcule

$$
\text{VIF}_j = \frac{1}{1 - R^2_j}
$$

Um VIF de 1 quer dizer que o preditor não tem nada em comum com os outros; um VIF de 10 quer dizer que 90 % da variância dele é explicada pelos demais, e a variância do seu coeficiente fica 10 vezes maior do que seria sem essa sobreposição. Regras práticas tratam VIF acima de 5 ou 10 como alerta. Com colinearidade perfeita, $R^2_j = 1$ e o VIF é infinito: é a armadilha das dummies vista por outro ângulo.

```python
outras = np.column_stack([np.ones(len(X)), np.delete(X, j, axis=1)])
coef = np.linalg.lstsq(outras, X[:, j], rcond=None)[0]
residuo = X[:, j] - outras @ coef
r2_j = 1 - (residuo ** 2).sum() / ((X[:, j] - X[:, j].mean()) ** 2).sum()
```

O que fazer com um VIF alto depende da pergunta. Para prever, pode não ser preciso fazer nada. Para interpretar coeficientes, junte os preditores redundantes num só, retire um deles, ou aceite que o modelo responde sobre o conjunto, não sobre cada um. Por fim, olhe os resíduos contra os valores previstos: curva ou funil ali indicam que falta um termo ou que a variação não é constante.

## Passo 7 · Exercício · R² ajustado e VIF

Escreva o $R^2$ ajustado e o VIF de cada coluna de uma matriz de preditores.

### Instruções
1. `r2_ajustado(r2, n, p)` devolve, como `float`, $1 - (1 - R^2)(n - 1)/(n - p - 1)$. Levanta `ValueError` se $n - p - 1 \le 0$.
2. `vif(X)` recebe uma matriz com uma coluna por preditor (pelo menos 2 colunas; senão, `ValueError`) e devolve uma lista de `float`, o VIF de cada coluna na ordem.
3. O $R^2_j$ de cada coluna vem da regressão dela em todas as outras **com intercepto**.

### Código inicial
```python
import numpy as np


def r2_ajustado(r2, n, p):
    pass


def vif(X):
    pass
```

### Solução
```python
import numpy as np


def r2_ajustado(r2, n, p):
    if n - p - 1 <= 0:
        raise ValueError("é preciso n > p + 1")
    return float(1 - (1 - r2) * (n - 1) / (n - p - 1))


def vif(X):
    X = np.asarray(X, dtype=float)
    if X.ndim != 2 or X.shape[1] < 2:
        raise ValueError("são necessárias pelo menos 2 colunas")
    resultado = []
    for j in range(X.shape[1]):
        alvo = X[:, j]
        outras = np.column_stack([np.ones(len(X)), np.delete(X, j, axis=1)])
        coef = np.linalg.lstsq(outras, alvo, rcond=None)[0]
        residuo = alvo - outras @ coef
        r2 = 1 - (residuo ** 2).sum() / ((alvo - alvo.mean()) ** 2).sum()
        resultado.append(float(1 / (1 - r2)))
    return resultado
```

### Dicas
1. O denominador do $R^2$ ajustado desconta os $p$ coeficientes **e** o intercepto.
2. Para cada coluna, as "outras" são a matriz sem ela (`np.delete(X, j, axis=1)`) mais a coluna de uns.
3. O VIF é o inverso de $1 - R^2_j$, não de $R^2_j$.

### Verificação
```json
[
  { "id": "r2aj-50", "checkpoint": 1, "kind": "call", "function": "r2_ajustado", "args": [0.8, 50, 3],
    "expected": 0.7869565217391306, "type": "float", "tolerance": 1e-12, "name": "R² 0,8 com 50 pontos e 3 preditores",
    "hint": "O denominador é n - p - 1." },
  { "id": "r2aj-zero-preditores", "checkpoint": 1, "kind": "call", "function": "r2_ajustado", "args": [0.5, 11, 0],
    "expected": 0.5, "tolerance": 1e-12, "name": "Sem preditores, o ajustado é igual ao R²" },
  { "id": "r2aj-muitos", "checkpoint": 1, "kind": "call", "function": "r2_ajustado", "args": [0.9, 10, 8],
    "expected": 0.1, "tolerance": 1e-9, "name": "R² 0,9 com 8 preditores em 10 pontos cai para 0,1" },
  { "id": "r2aj-negativo", "checkpoint": 1, "kind": "call", "function": "r2_ajustado", "args": [0.3, 20, 10],
    "expected": -0.47777777777777763, "tolerance": 1e-9, "name": "Um modelo ruim pode ter R² ajustado negativo" },
  { "id": "r2aj-indefinido", "checkpoint": 1, "kind": "expr", "expr": "r2_ajustado(0.9, 5, 4)", "raises": "ValueError",
    "name": "n - p - 1 = 0 é recusado" },
  { "id": "vif-dois", "checkpoint": 2, "kind": "expr", "expr": "vif([[1, 2], [2, 1], [3, 4], [4, 3], [5, 6]])",
    "expected": [3.083333333333333, 3.0833333333333344], "tolerance": 1e-9, "type": "list",
    "name": "Duas colunas: o mesmo VIF para as duas (conferido com statsmodels)",
    "hint": "VIF = 1 / (1 - R²) da regressão da coluna nas outras, com intercepto." },
  { "id": "vif-colineares", "checkpoint": 3, "kind": "expr",
    "setup": "r = np.random.default_rng(2)\na = r.normal(0, 1, 50)\nb = a * 0.9 + r.normal(0, 0.3, 50)\nc = r.normal(0, 1, 50)\nX = np.column_stack([a, b, c]).round(3)",
    "expr": "vif(X)", "expected": [10.638721446328532, 10.609730530043032, 1.055471172889109], "tolerance": 1e-6,
    "name": "Duas colunas quase iguais têm VIF perto de 10; a independente, perto de 1",
    "hint": "Cada regressão auxiliar usa todas as outras colunas e o intercepto." },
  { "id": "vif-baixos", "checkpoint": 3, "kind": "expr", "expr": "vif([[1, 5, 2], [2, 3, 7], [3, 8, 1], [4, 1, 4], [5, 6, 6], [6, 2, 3]])",
    "expected": [1.0751152535578272, 1.2131272132023783, 1.144275739961248], "tolerance": 1e-9,
    "name": "Colunas pouco relacionadas têm VIF perto de 1" },
  { "id": "vif-tipos", "checkpoint": 2, "kind": "expr", "expr": "[type(v).__name__ for v in vif([[1, 2], [2, 1], [3, 4], [4, 3], [5, 6]])]",
    "expected": ["float", "float"], "name": "Cada VIF é float do Python" },
  { "id": "vif-uma-coluna", "checkpoint": 2, "kind": "expr", "expr": "vif([[1], [2], [3]])", "raises": "ValueError",
    "name": "Uma coluna só é recusada" }
]
```

### Soluções erradas
```python name="esquece o -1 do denominador"
import numpy as np


def r2_ajustado(r2, n, p):
    if n - p - 1 <= 0:
        raise ValueError("é preciso n > p + 1")
    return float(1 - (1 - r2) * (n - 1) / (n - p))


def vif(X):
    X = np.asarray(X, dtype=float)
    if X.ndim != 2 or X.shape[1] < 2:
        raise ValueError("são necessárias pelo menos 2 colunas")
    resultado = []
    for j in range(X.shape[1]):
        alvo = X[:, j]
        outras = np.column_stack([np.ones(len(X)), np.delete(X, j, axis=1)])
        coef = np.linalg.lstsq(outras, alvo, rcond=None)[0]
        residuo = alvo - outras @ coef
        r2 = 1 - (residuo ** 2).sum() / ((alvo - alvo.mean()) ** 2).sum()
        resultado.append(float(1 / (1 - r2)))
    return resultado
```
```python name="não recusa n - p - 1 <= 0"
import numpy as np


def r2_ajustado(r2, n, p):
    return float(1 - (1 - r2) * (n - 1) / (n - p - 1))


def vif(X):
    X = np.asarray(X, dtype=float)
    if X.ndim != 2 or X.shape[1] < 2:
        raise ValueError("são necessárias pelo menos 2 colunas")
    resultado = []
    for j in range(X.shape[1]):
        alvo = X[:, j]
        outras = np.column_stack([np.ones(len(X)), np.delete(X, j, axis=1)])
        coef = np.linalg.lstsq(outras, alvo, rcond=None)[0]
        residuo = alvo - outras @ coef
        r2 = 1 - (residuo ** 2).sum() / ((alvo - alvo.mean()) ** 2).sum()
        resultado.append(float(1 / (1 - r2)))
    return resultado
```
```python name="regressão auxiliar sem intercepto"
import numpy as np


def r2_ajustado(r2, n, p):
    if n - p - 1 <= 0:
        raise ValueError("é preciso n > p + 1")
    return float(1 - (1 - r2) * (n - 1) / (n - p - 1))


def vif(X):
    X = np.asarray(X, dtype=float)
    if X.ndim != 2 or X.shape[1] < 2:
        raise ValueError("são necessárias pelo menos 2 colunas")
    resultado = []
    for j in range(X.shape[1]):
        alvo = X[:, j]
        outras = np.delete(X, j, axis=1)
        coef = np.linalg.lstsq(outras, alvo, rcond=None)[0]
        residuo = alvo - outras @ coef
        r2 = 1 - (residuo ** 2).sum() / ((alvo - alvo.mean()) ** 2).sum()
        resultado.append(float(1 / (1 - r2)))
    return resultado
```
```python name="inverso de R² no lugar de 1 - R²"
import numpy as np


def r2_ajustado(r2, n, p):
    if n - p - 1 <= 0:
        raise ValueError("é preciso n > p + 1")
    return float(1 - (1 - r2) * (n - 1) / (n - p - 1))


def vif(X):
    X = np.asarray(X, dtype=float)
    if X.ndim != 2 or X.shape[1] < 2:
        raise ValueError("são necessárias pelo menos 2 colunas")
    resultado = []
    for j in range(X.shape[1]):
        alvo = X[:, j]
        outras = np.column_stack([np.ones(len(X)), np.delete(X, j, axis=1)])
        coef = np.linalg.lstsq(outras, alvo, rcond=None)[0]
        residuo = alvo - outras @ coef
        r2 = 1 - (residuo ** 2).sum() / ((alvo - alvo.mean()) ** 2).sum()
        resultado.append(float(1 / r2))
    return resultado
```
```python name="tolerância no lugar do VIF"
import numpy as np


def r2_ajustado(r2, n, p):
    if n - p - 1 <= 0:
        raise ValueError("é preciso n > p + 1")
    return float(1 - (1 - r2) * (n - 1) / (n - p - 1))


def vif(X):
    X = np.asarray(X, dtype=float)
    if X.ndim != 2 or X.shape[1] < 2:
        raise ValueError("são necessárias pelo menos 2 colunas")
    resultado = []
    for j in range(X.shape[1]):
        alvo = X[:, j]
        outras = np.column_stack([np.ones(len(X)), np.delete(X, j, axis=1)])
        coef = np.linalg.lstsq(outras, alvo, rcond=None)[0]
        residuo = alvo - outras @ coef
        r2 = 1 - (residuo ** 2).sum() / ((alvo - alvo.mean()) ** 2).sum()
        resultado.append(float(1 - r2))
    return resultado
```
```python name="VIF pela correlação com a coluna seguinte"
import numpy as np


def r2_ajustado(r2, n, p):
    if n - p - 1 <= 0:
        raise ValueError("é preciso n > p + 1")
    return float(1 - (1 - r2) * (n - 1) / (n - p - 1))


def vif(X):
    X = np.asarray(X, dtype=float)
    if X.ndim != 2 or X.shape[1] < 2:
        raise ValueError("são necessárias pelo menos 2 colunas")
    resultado = []
    for j in range(X.shape[1]):
        k = (j + 1) % X.shape[1]
        r = np.corrcoef(X[:, j], X[:, k])[0, 1]
        resultado.append(float(1 / (1 - r ** 2)))
    return resultado
```
```python name="devolve números do numpy"
import numpy as np


def r2_ajustado(r2, n, p):
    if n - p - 1 <= 0:
        raise ValueError("é preciso n > p + 1")
    return float(1 - (1 - r2) * (n - 1) / (n - p - 1))


def vif(X):
    X = np.asarray(X, dtype=float)
    if X.ndim != 2 or X.shape[1] < 2:
        raise ValueError("são necessárias pelo menos 2 colunas")
    resultado = []
    for j in range(X.shape[1]):
        alvo = X[:, j]
        outras = np.column_stack([np.ones(len(X)), np.delete(X, j, axis=1)])
        coef = np.linalg.lstsq(outras, alvo, rcond=None)[0]
        residuo = alvo - outras @ coef
        r2 = 1 - (residuo ** 2).sum() / ((alvo - alvo.mean()) ** 2).sum()
        resultado.append(1 / (1 - r2))
    return resultado
```

## Passo 8 · Quiz · Interpretar coeficientes

### Pergunta
Uma regressão fictícia do aluguel (em R\$) usa área (m²), quartos e as dummies `bairro_Norte` e `bairro_Sul`, com o Centro como referência. O coeficiente de `bairro_Norte` é $-260$. Qual leitura está correta?
- [ ] Os aluguéis do Norte são, em média, R\$ 260 menores que os de todos os outros bairros
- [x] Entre apartamentos com a mesma área e o mesmo número de quartos, um no Norte tem aluguel, em média, R\$ 260 menor que um no Centro
- [ ] A média simples dos aluguéis do Norte é R\$ 260 menor que a do Centro
- [ ] Mudar um apartamento do Centro para o Norte reduz o aluguel em exatamente R\$ 260
> O coeficiente de uma dummy compara a categoria com a **referência** (o Centro, descartado pelo `drop_first`), mantendo os outros preditores fixos. A média simples mistura apartamentos de tamanhos diferentes e não é o coeficiente. E o modelo descreve uma associação média, não o efeito causal de "mudar" um imóvel de bairro.

### Pergunta
Um analista fictício acrescentou 15 variáveis ao modelo de aluguel. O $R^2$ passou de 0,710 para 0,722, e o $R^2$ ajustado caiu de 0,705 para 0,690. O que fazer?
- [ ] Manter as 15 variáveis, porque o $R^2$ subiu
- [x] Desconfiar das 15 variáveis: o $R^2$ sempre sobe ao acrescentar preditores, e a queda do ajustado indica que o ganho é menor do que o acaso daria
- [ ] Usar o $R^2$ ajustado só quando o $R^2$ cair
- [ ] Concluir que o modelo antigo estava errado, porque o $R^2$ mudou
> O $R^2$ não diminui com preditores novos, nem com ruído puro, então a subida de 0,012 não diz nada sozinha. O ajustado desconta um preço por preditor e caiu: as variáveis novas não compensam o que custam. O $R^2$ nunca cai ao acrescentar colunas, e uma mudança no $R^2$ não torna o modelo anterior errado.

### Pergunta
Num modelo fictício com área e número de cômodos (salas e quartos somados), os dois têm VIF perto de 12, e o coeficiente dos cômodos saiu negativo: $-40$ por cômodo. Um colega conclui que "cada cômodo a mais reduz o aluguel". O que você diz?
- [ ] Ele está certo: o coeficiente é negativo
- [ ] O modelo está errado, e é preciso tirar a área
- [x] Área e cômodos são quase redundantes (VIF 12), e o coeficiente de cada um fica instável; além disso, "mais um cômodo com a mesma área" quer dizer cômodos menores. O sinal sozinho não sustenta a conclusão, e o modelo não mede causa
- [ ] O VIF alto prova que as previsões do modelo são ruins
> Com multicolinearidade forte o modelo não separa bem o efeito de cada preditor, e os coeficientes podem até trocar de sinal entre amostras. A leitura *ceteris paribus* também muda o sentido: com a área fixa, um cômodo a mais divide o mesmo espaço. Tirar a área é uma opção, não uma obrigação, e o VIF alto não piora as previsões, só a interpretação dos coeficientes.
