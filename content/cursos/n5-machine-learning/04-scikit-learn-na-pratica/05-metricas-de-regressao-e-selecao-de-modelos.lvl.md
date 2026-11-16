---
slug: n5-m4-05-metricas-de-regressao-e-selecao-de-modelos
titulo: Métricas de regressão e seleção de modelos
descricao: MAE, RMSE, MAPE, R² e suas armadilhas, baselines (média, mediana, DummyRegressor), comparação justa entre modelos e intervalos para a diferença.
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
- Calcular e interpretar MAE, RMSE, MAPE e R² e escolher a adequada ao problema
- Comparar modelos contra uma baseline trivial e com validação cruzada repetida
- Reportar resultados com incerteza (desvio entre folds) e decidir se a diferença importa
---

## Passo 1 · Leitura · Quatro réguas para o erro

Um modelo prevê o tempo de entrega de pedidos fictícios, em minutos. Para saber se ele é bom, é preciso resumir os erros $e_i = y_i - \hat{y}_i$ num número, e há várias formas de fazer isso, cada uma com um significado:

$$
\text{MAE} = \frac{1}{n}\sum_i |e_i| \qquad \text{RMSE} = \sqrt{\frac{1}{n}\sum_i e_i^2} \qquad \text{MAPE} = \frac{1}{n}\sum_i \left|\frac{e_i}{y_i}\right| \qquad R^2 = 1 - \frac{\sum_i e_i^2}{\sum_i (y_i - \bar{y})^2}
$$

- O **MAE** é o erro típico, na unidade do alvo: "erra 4 minutos, em média".
- O **RMSE** também está em minutos, mas eleva os erros ao quadrado antes da média: um erro de 20 minutos pesa como 16 erros de 5. Ele é sempre maior ou igual ao MAE, e a distância entre os dois indica erros grandes concentrados em poucos casos. Se um atraso grande custa muito mais que vários pequenos, o RMSE é a régua certa; se todo minuto custa o mesmo, o MAE.
- O **MAPE** é o erro relativo, sem unidade (0,08 é "8 % do valor real"). Ele serve para comparar alvos de escalas diferentes, mas divide por $y_i$: um $y_i = 0$ dá divisão por zero, e valores pequenos inflam o resultado. O `mean_absolute_percentage_error` do scikit-learn não pula os zeros: divide por um número minúsculo e devolve um valor enorme sem aviso.
- O **$R^2$** compara o erro do modelo com o de prever sempre a média $\bar{y}$: 1 é perfeito, 0 é empatar com a média, e **negativo** é pior que a média. Ele não tem unidade e depende da variação do alvo no conjunto avaliado: o mesmo modelo tem $R^2$ menor num teste em que os valores variam pouco.

```python
from sklearn.metrics import mean_absolute_error, root_mean_squared_error, r2_score

mean_absolute_error(y_teste, previsto)       # minutos
root_mean_squared_error(y_teste, previsto)   # minutos, pesa os erros grandes
r2_score(y_teste, previsto)                  # sem unidade; pode ser negativo
```

A ordem dos argumentos é `(y_verdadeiro, y_previsto)`: no $R^2$ e no MAPE, trocá-la muda o resultado.

Nenhuma métrica é a melhor em todo problema. A escolha vem do custo do erro na aplicação e deve ser feita **antes** de comparar modelos, para não escolher a régua que favorece o modelo preferido.

## Passo 2 · Previsão · Um R² negativo

O programa avalia três previsões para os mesmos cinco valores: a média, a lista invertida e os valores deslocados de 1. Leia sem executar e digite o que ele imprime.

### Código
```python
import numpy as np
from sklearn.metrics import mean_absolute_error, r2_score, root_mean_squared_error

y = np.array([10.0, 12.0, 14.0, 16.0, 18.0])
media = np.full(5, y.mean())
invertida = y[::-1]
print(r2_score(y, media))
print(r2_score(y, invertida))
print(r2_score(y, y + 1))
print(mean_absolute_error(y, invertida), round(root_mean_squared_error(y, invertida), 3))
```

### Dicas
1. A soma dos quadrados em torno da média é $16 + 4 + 0 + 4 + 16 = 40$.
2. Os erros da lista invertida são $-8, -4, 0, 4, 8$.
3. O deslocamento de 1 erra 1 em cada um dos cinco valores.

### Saída esperada
```text
0.0
-3.0
0.875
4.8 5.657
```

## Passo 3 · Exercício · As métricas
modo: lacunas

Complete as lacunas (`___`) da função que calcula as quatro métricas de uma vez, com o numpy. As métricas que não estão definidas para os dados recebidos saem como `None`.

### Instruções
1. Em `"mae"`, a média do valor absoluto dos erros.
2. Em `"rmse"`, a raiz da média dos erros ao quadrado.
3. Em `"mape"`, a média de $|e_i / y_i|$ só nas posições com $y_i \neq 0$ (fração, não porcentagem), ou `None` se todo $y_i$ for zero.
4. Em `"r2"`, $1 - \sum e_i^2 / \sum (y_i - \bar{y})^2$, ou `None` quando o denominador é zero ($y$ constante). Todos os números são `float`.

### Código inicial
```python
import numpy as np


def metricas_regressao(y, y_pred):
    y = np.asarray(y, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    erro = y - y_pred
    mae = float(np.mean(___))
    rmse = float(___)
    nao_zero = ___
    mape = float(np.mean(np.abs(erro[nao_zero] / y[nao_zero]))) if nao_zero.any() else None
    total = ___
    r2 = float(1 - np.sum(erro ** 2) / total) if total > 0 else None
    return {"mae": mae, "rmse": rmse, "mape": mape, "r2": r2}
```

### Solução
```python
import numpy as np


def metricas_regressao(y, y_pred):
    y = np.asarray(y, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    erro = y - y_pred
    mae = float(np.mean(np.abs(erro)))
    rmse = float(np.sqrt(np.mean(erro ** 2)))
    nao_zero = y != 0
    mape = float(np.mean(np.abs(erro[nao_zero] / y[nao_zero]))) if nao_zero.any() else None
    total = np.sum((y - y.mean()) ** 2)
    r2 = float(1 - np.sum(erro ** 2) / total) if total > 0 else None
    return {"mae": mae, "rmse": rmse, "mape": mape, "r2": r2}
```

### Dicas
1. O RMSE tem três operações, de dentro para fora: quadrado, média, raiz.
2. A máscara do MAPE escolhe as posições em que dá para dividir; ela olha os valores verdadeiros, que podem ser negativos.
3. O denominador do $R^2$ é o erro de quem prevê sempre a média: a soma dos quadrados dos desvios de $y$ em torno de $\bar{y}$.

### Verificação
```json
[
  { "id": "mae", "checkpoint": 1, "kind": "expr",
    "setup": "r = metricas_regressao([3, 5, 2, 7], [2.5, 5, 4, 8])",
    "expr": "r['mae']",
    "expected": 0.875,
    "tolerance": 1e-09,
    "name": "MAE de erros 0,5, 0, −2 e −1",
    "hint": "Erros negativos e positivos não podem se cancelar." },
  { "id": "rmse", "checkpoint": 2, "kind": "expr",
    "setup": "r = metricas_regressao([3, 5, 2, 7], [2.5, 5, 4, 8])",
    "expr": "r['rmse']",
    "expected": 1.14564392373896,
    "tolerance": 1e-09,
    "name": "RMSE dos mesmos erros",
    "hint": "Quadrado, média e raiz, nessa ordem." },
  { "id": "rmse-outlier", "checkpoint": 2, "kind": "expr",
    "expr": "[metricas_regressao([10, 10, 10, 10], [11, 9, 11, 29])[m] for m in ('mae', 'rmse')]",
    "expected": [5.5, 9.539392014169456],
    "tolerance": 1e-09,
    "name": "Um erro grande afasta o RMSE do MAE" },
  { "id": "mape", "checkpoint": 3, "kind": "expr",
    "setup": "r = metricas_regressao([3, 5, 2, 7], [2.5, 5, 4, 8])",
    "expr": "r['mape']",
    "expected": 0.3273809523809524,
    "tolerance": 1e-09,
    "name": "MAPE como fração do valor real" },
  { "id": "mape-ignora-zero", "checkpoint": 3, "kind": "expr",
    "expr": "metricas_regressao([0, 2, 4], [1, 2, 5])['mape']",
    "expected": 0.125,
    "tolerance": 1e-09,
    "name": "O MAPE pula as posições com y = 0",
    "hint": "Escolha as posições pelo valor verdadeiro." },
  { "id": "mape-negativos", "checkpoint": 3, "kind": "expr",
    "expr": "metricas_regressao([-2, 4, -5, 10], [-1, 4, -3, 8])['mape']",
    "expected": 0.275,
    "tolerance": 1e-09,
    "name": "Valores verdadeiros negativos entram no MAPE",
    "hint": "Só o zero impede a divisão; um valor negativo, não." },
  { "id": "mape-none", "checkpoint": 3, "kind": "expr",
    "expr": "metricas_regressao([0, 0], [1, -1])",
    "expected": {"mae": 1.0, "rmse": 1.0, "mape": null, "r2": null},
    "name": "Com todo y igual a zero, o MAPE é None (e o R², também, porque y é constante)" },
  { "id": "r2", "checkpoint": 4, "kind": "expr",
    "setup": "r = metricas_regressao([3, 5, 2, 7], [2.5, 5, 4, 8])",
    "expr": "r['r2']",
    "expected": 0.6440677966101696,
    "tolerance": 1e-09,
    "name": "R² dos mesmos erros",
    "hint": "O denominador é a soma dos quadrados de y menos a média de y." },
  { "id": "r2-negativo", "checkpoint": 4, "kind": "expr",
    "expr": "metricas_regressao([10, 12, 14, 16, 18], [18, 16, 14, 12, 10])['r2']",
    "expected": -3.0,
    "tolerance": 1e-09,
    "name": "Previsões piores que a média dão R² negativo" },
  { "id": "r2-constante", "checkpoint": 4, "kind": "expr",
    "expr": "metricas_regressao([5, 5, 5], [4, 5, 6])",
    "expected": {"mae": 0.6666666666666666, "rmse": 0.816496580927726, "mape": 0.13333333333333333, "r2": null},
    "tolerance": 1e-09,
    "name": "Com y constante, só o R² fica indefinido" },
  { "id": "tipos", "checkpoint": 4, "kind": "expr",
    "setup": "r = metricas_regressao([3, 5, 2, 7], [2.5, 5, 4, 8])",
    "expr": "sorted({type(v).__name__ for v in r.values()})",
    "expected": ["float"],
    "name": "As quatro métricas são float do Python" }
]
```

### Soluções erradas
```python name="MAE sem o valor absoluto"
import numpy as np


def metricas_regressao(y, y_pred):
    y = np.asarray(y, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    erro = y - y_pred
    mae = float(np.mean(erro))
    rmse = float(np.sqrt(np.mean(erro ** 2)))
    nao_zero = y != 0
    mape = float(np.mean(np.abs(erro[nao_zero] / y[nao_zero]))) if nao_zero.any() else None
    total = np.sum((y - y.mean()) ** 2)
    r2 = float(1 - np.sum(erro ** 2) / total) if total > 0 else None
    return {"mae": mae, "rmse": rmse, "mape": mape, "r2": r2}
```
```python name="RMSE sem a raiz"
import numpy as np


def metricas_regressao(y, y_pred):
    y = np.asarray(y, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    erro = y - y_pred
    mae = float(np.mean(np.abs(erro)))
    rmse = float(np.mean(erro ** 2))
    nao_zero = y != 0
    mape = float(np.mean(np.abs(erro[nao_zero] / y[nao_zero]))) if nao_zero.any() else None
    total = np.sum((y - y.mean()) ** 2)
    r2 = float(1 - np.sum(erro ** 2) / total) if total > 0 else None
    return {"mae": mae, "rmse": rmse, "mape": mape, "r2": r2}
```
```python name="RMSE com a soma no lugar da média"
import numpy as np


def metricas_regressao(y, y_pred):
    y = np.asarray(y, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    erro = y - y_pred
    mae = float(np.mean(np.abs(erro)))
    rmse = float(np.sqrt(np.sum(erro ** 2)))
    nao_zero = y != 0
    mape = float(np.mean(np.abs(erro[nao_zero] / y[nao_zero]))) if nao_zero.any() else None
    total = np.sum((y - y.mean()) ** 2)
    r2 = float(1 - np.sum(erro ** 2) / total) if total > 0 else None
    return {"mae": mae, "rmse": rmse, "mape": mape, "r2": r2}
```
```python name="MAPE só com valores positivos"
import numpy as np


def metricas_regressao(y, y_pred):
    y = np.asarray(y, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    erro = y - y_pred
    mae = float(np.mean(np.abs(erro)))
    rmse = float(np.sqrt(np.mean(erro ** 2)))
    nao_zero = y > 0
    mape = float(np.mean(np.abs(erro[nao_zero] / y[nao_zero]))) if nao_zero.any() else None
    total = np.sum((y - y.mean()) ** 2)
    r2 = float(1 - np.sum(erro ** 2) / total) if total > 0 else None
    return {"mae": mae, "rmse": rmse, "mape": mape, "r2": r2}
```
```python name="MAPE pulando os zeros previstos"
import numpy as np


def metricas_regressao(y, y_pred):
    y = np.asarray(y, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    erro = y - y_pred
    mae = float(np.mean(np.abs(erro)))
    rmse = float(np.sqrt(np.mean(erro ** 2)))
    nao_zero = y_pred != 0
    mape = float(np.mean(np.abs(erro[nao_zero] / y[nao_zero]))) if nao_zero.any() else None
    total = np.sum((y - y.mean()) ** 2)
    r2 = float(1 - np.sum(erro ** 2) / total) if total > 0 else None
    return {"mae": mae, "rmse": rmse, "mape": mape, "r2": r2}
```
```python name="R² sem tirar a média"
import numpy as np


def metricas_regressao(y, y_pred):
    y = np.asarray(y, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    erro = y - y_pred
    mae = float(np.mean(np.abs(erro)))
    rmse = float(np.sqrt(np.mean(erro ** 2)))
    nao_zero = y != 0
    mape = float(np.mean(np.abs(erro[nao_zero] / y[nao_zero]))) if nao_zero.any() else None
    total = np.sum(y ** 2)
    r2 = float(1 - np.sum(erro ** 2) / total) if total > 0 else None
    return {"mae": mae, "rmse": rmse, "mape": mape, "r2": r2}
```
```python name="R² com a variância no lugar da soma"
import numpy as np


def metricas_regressao(y, y_pred):
    y = np.asarray(y, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    erro = y - y_pred
    mae = float(np.mean(np.abs(erro)))
    rmse = float(np.sqrt(np.mean(erro ** 2)))
    nao_zero = y != 0
    mape = float(np.mean(np.abs(erro[nao_zero] / y[nao_zero]))) if nao_zero.any() else None
    total = np.var(y)
    r2 = float(1 - np.sum(erro ** 2) / total) if total > 0 else None
    return {"mae": mae, "rmse": rmse, "mape": mape, "r2": r2}
```

## Passo 4 · Leitura · Toda comparação começa pela baseline

Um RMSE de 0,89 minuto é bom? Depende de quanto erra quem não usa atributo nenhum. A **baseline** é o modelo mais simples possível, e todo modelo precisa ser comparado com ela antes de qualquer outra coisa. O scikit-learn tem as duas prontas, com a mesma API dos outros estimadores:

```python
from sklearn.dummy import DummyClassifier, DummyRegressor

DummyRegressor()                              # prevê sempre a média do treino
DummyRegressor(strategy="median")             # prevê sempre a mediana do treino
DummyClassifier(strategy="most_frequent")     # prevê sempre a classe mais comum
```

Elas ignoram o `X` e aprendem só uma estatística do `y` **do treino**. A baseline segue as mesmas regras do modelo: é ajustada no mesmo treino e avaliada no mesmo teste. Ajustar a baseline no teste é dar a ela a média que ela devia adivinhar, e isso a deixa artificialmente boa, o que faz o modelo parecer pior do que é.

O ganho relativo resume a comparação num número:

$$
\text{ganho} = 1 - \frac{\text{RMSE}_{\text{modelo}}}{\text{RMSE}_{\text{baseline}}}
$$

Num conjunto fictício de 120 linhas do exercício a seguir, a regressão linear teve RMSE de 0,889 no teste, e a média do treino, de 2,800: ganho de 0,68, o modelo erra um terço do que erra a baseline. Um modelo que prevê sempre 10 teve ganho de −2,10, muito pior que não fazer nada. O $R^2$ é parecido com esse ganho: ele compara os erros ao quadrado com os de prever a média do próprio conjunto avaliado.

Num classificador, a baseline da classe mais comum desmascara a acurácia em classes desbalanceadas: com 95 % de negativos, um modelo de acurácia 0,95 pode não ter aprendido nada. A métrica do módulo 3 que mede o que interessa (recall, F1, AUC) também deve ser comparada com a da baseline.

Quando dois modelos ficam praticamente empatados, prefira o **mais simples**: ele é mais barato de treinar e de explicar, e tem menos chance de ter ido bem por sorte nas partições. O passo 6 mostra como decidir se uma diferença é empate.

## Passo 5 · Exercício · Contra a baseline

Escreva a comparação de um modelo de regressão qualquer com a baseline da média.

### Instruções
1. `comparar_com_baseline(modelo, X, y, semente)` divide com `train_test_split(X, y, test_size=0.25, random_state=semente)`.
2. Ajusta o `modelo` recebido e um `DummyRegressor()` (a média) **no treino**.
3. Mede o RMSE de cada um **no teste** e devolve `{"modelo": RMSE do modelo, "baseline": RMSE da baseline, "ganho": 1 - modelo / baseline}`, os três como `float`.

### Código inicial
```python
from sklearn.dummy import DummyRegressor
from sklearn.metrics import root_mean_squared_error
from sklearn.model_selection import train_test_split


def comparar_com_baseline(modelo, X, y, semente):
    pass
```

### Solução
```python
from sklearn.dummy import DummyRegressor
from sklearn.metrics import root_mean_squared_error
from sklearn.model_selection import train_test_split


def comparar_com_baseline(modelo, X, y, semente):
    X_treino, X_teste, y_treino, y_teste = train_test_split(X, y, test_size=0.25, random_state=semente)
    baseline = DummyRegressor().fit(X_treino, y_treino)
    modelo.fit(X_treino, y_treino)
    erro_modelo = float(root_mean_squared_error(y_teste, modelo.predict(X_teste)))
    erro_baseline = float(root_mean_squared_error(y_teste, baseline.predict(X_teste)))
    return {"modelo": erro_modelo, "baseline": erro_baseline, "ganho": 1 - erro_modelo / erro_baseline}
```

### Dicas
1. A baseline e o modelo passam pelo mesmo `fit` (com o treino) e pelo mesmo `predict` (com o teste).
2. O `root_mean_squared_error(y_verdadeiro, y_previsto)` já tira a raiz.
3. Um ganho negativo é possível: o modelo pode errar mais que a média.

### Verificação
```json
[
  { "id": "modelo", "checkpoint": 3, "kind": "expr",
    "setup": "import numpy as np\nfrom sklearn.dummy import DummyRegressor\nfrom sklearn.linear_model import LinearRegression\nfrom sklearn.neighbors import KNeighborsRegressor\nrng = np.random.default_rng(3)\nX = rng.normal(size=(120, 3)).round(3)\ny = (2 + X @ np.array([1.5, -2.0, 0.5]) + rng.normal(0, 1.0, 120)).round(3)\nr = comparar_com_baseline(LinearRegression(), X, y, 0)",
    "expr": "r['modelo']",
    "expected": 0.8887986186061396,
    "tolerance": 1e-09,
    "name": "RMSE da regressão linear no teste (semente 0)",
    "hint": "Ajuste no treino e meça no teste." },
  { "id": "baseline", "checkpoint": 2, "kind": "expr",
    "setup": "import numpy as np\nfrom sklearn.dummy import DummyRegressor\nfrom sklearn.linear_model import LinearRegression\nfrom sklearn.neighbors import KNeighborsRegressor\nrng = np.random.default_rng(3)\nX = rng.normal(size=(120, 3)).round(3)\ny = (2 + X @ np.array([1.5, -2.0, 0.5]) + rng.normal(0, 1.0, 120)).round(3)\nr = comparar_com_baseline(LinearRegression(), X, y, 0)",
    "expr": "r['baseline']",
    "expected": 2.800393879527276,
    "tolerance": 1e-09,
    "name": "RMSE da média do treino no teste",
    "hint": "A baseline aprende a média do treino, como qualquer modelo, e é avaliada no teste." },
  { "id": "ganho", "checkpoint": 3, "kind": "expr",
    "setup": "import numpy as np\nfrom sklearn.dummy import DummyRegressor\nfrom sklearn.linear_model import LinearRegression\nfrom sklearn.neighbors import KNeighborsRegressor\nrng = np.random.default_rng(3)\nX = rng.normal(size=(120, 3)).round(3)\ny = (2 + X @ np.array([1.5, -2.0, 0.5]) + rng.normal(0, 1.0, 120)).round(3)\nr = comparar_com_baseline(LinearRegression(), X, y, 0)",
    "expr": "r['ganho']",
    "expected": 0.6826165686534873,
    "tolerance": 1e-09,
    "name": "Ganho relativo sobre a baseline",
    "hint": "O ganho é 1 menos a razão entre os dois RMSE." },
  { "id": "knn-semente-1", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np\nfrom sklearn.dummy import DummyRegressor\nfrom sklearn.linear_model import LinearRegression\nfrom sklearn.neighbors import KNeighborsRegressor\nrng = np.random.default_rng(3)\nX = rng.normal(size=(120, 3)).round(3)\ny = (2 + X @ np.array([1.5, -2.0, 0.5]) + rng.normal(0, 1.0, 120)).round(3)",
    "expr": "comparar_com_baseline(KNeighborsRegressor(5), X, y, 1)",
    "expected": {"modelo": 1.3895162150907054, "baseline": 2.9950358418267986, "ganho": 0.5360602381829325},
    "tolerance": 1e-09,
    "name": "Outro modelo e outra semente",
    "hint": "Use o modelo e a semente recebidos." },
  { "id": "pior-que-baseline", "checkpoint": 3, "kind": "expr",
    "setup": "import numpy as np\nfrom sklearn.dummy import DummyRegressor\nfrom sklearn.linear_model import LinearRegression\nfrom sklearn.neighbors import KNeighborsRegressor\nrng = np.random.default_rng(3)\nX = rng.normal(size=(120, 3)).round(3)\ny = (2 + X @ np.array([1.5, -2.0, 0.5]) + rng.normal(0, 1.0, 120)).round(3)",
    "expr": "comparar_com_baseline(DummyRegressor(strategy='constant', constant=10.0), X, y, 0)['ganho']",
    "expected": -2.1019458508109183,
    "tolerance": 1e-09,
    "name": "Um modelo pior que a média tem ganho negativo" },
  { "id": "modelo-ajustado", "checkpoint": 2, "kind": "expr",
    "setup": "import numpy as np\nfrom sklearn.dummy import DummyRegressor\nfrom sklearn.linear_model import LinearRegression\nfrom sklearn.neighbors import KNeighborsRegressor\nrng = np.random.default_rng(3)\nX = rng.normal(size=(120, 3)).round(3)\ny = (2 + X @ np.array([1.5, -2.0, 0.5]) + rng.normal(0, 1.0, 120)).round(3)\nm = LinearRegression()\nr = comparar_com_baseline(m, X, y, 0)",
    "expr": "hasattr(m, 'coef_')",
    "expected": true,
    "name": "O modelo recebido sai ajustado" },
  { "id": "tipos", "checkpoint": 3, "kind": "expr",
    "setup": "import numpy as np\nfrom sklearn.dummy import DummyRegressor\nfrom sklearn.linear_model import LinearRegression\nfrom sklearn.neighbors import KNeighborsRegressor\nrng = np.random.default_rng(3)\nX = rng.normal(size=(120, 3)).round(3)\ny = (2 + X @ np.array([1.5, -2.0, 0.5]) + rng.normal(0, 1.0, 120)).round(3)\nr = comparar_com_baseline(LinearRegression(), X, y, 0)",
    "expr": "sorted({type(v).__name__ for v in r.values()})",
    "expected": ["float"],
    "name": "Os três números são float do Python" }
]
```

### Soluções erradas
```python name="baseline ajustada no teste"
from sklearn.dummy import DummyRegressor
from sklearn.metrics import root_mean_squared_error
from sklearn.model_selection import train_test_split


def comparar_com_baseline(modelo, X, y, semente):
    X_treino, X_teste, y_treino, y_teste = train_test_split(X, y, test_size=0.25, random_state=semente)
    baseline = DummyRegressor().fit(X_teste, y_teste)
    modelo.fit(X_treino, y_treino)
    erro_modelo = float(root_mean_squared_error(y_teste, modelo.predict(X_teste)))
    erro_baseline = float(root_mean_squared_error(y_teste, baseline.predict(X_teste)))
    return {"modelo": erro_modelo, "baseline": erro_baseline, "ganho": 1 - erro_modelo / erro_baseline}
```
```python name="baseline pela mediana"
from sklearn.dummy import DummyRegressor
from sklearn.metrics import root_mean_squared_error
from sklearn.model_selection import train_test_split


def comparar_com_baseline(modelo, X, y, semente):
    X_treino, X_teste, y_treino, y_teste = train_test_split(X, y, test_size=0.25, random_state=semente)
    baseline = DummyRegressor(strategy="median").fit(X_treino, y_treino)
    modelo.fit(X_treino, y_treino)
    erro_modelo = float(root_mean_squared_error(y_teste, modelo.predict(X_teste)))
    erro_baseline = float(root_mean_squared_error(y_teste, baseline.predict(X_teste)))
    return {"modelo": erro_modelo, "baseline": erro_baseline, "ganho": 1 - erro_modelo / erro_baseline}
```
```python name="modelo avaliado no treino"
from sklearn.dummy import DummyRegressor
from sklearn.metrics import root_mean_squared_error
from sklearn.model_selection import train_test_split


def comparar_com_baseline(modelo, X, y, semente):
    X_treino, X_teste, y_treino, y_teste = train_test_split(X, y, test_size=0.25, random_state=semente)
    baseline = DummyRegressor().fit(X_treino, y_treino)
    modelo.fit(X_treino, y_treino)
    erro_modelo = float(root_mean_squared_error(y_treino, modelo.predict(X_treino)))
    erro_baseline = float(root_mean_squared_error(y_teste, baseline.predict(X_teste)))
    return {"modelo": erro_modelo, "baseline": erro_baseline, "ganho": 1 - erro_modelo / erro_baseline}
```
```python name="MSE no lugar do RMSE"
from sklearn.dummy import DummyRegressor
from sklearn.metrics import mean_squared_error
from sklearn.model_selection import train_test_split


def comparar_com_baseline(modelo, X, y, semente):
    X_treino, X_teste, y_treino, y_teste = train_test_split(X, y, test_size=0.25, random_state=semente)
    baseline = DummyRegressor().fit(X_treino, y_treino)
    modelo.fit(X_treino, y_treino)
    erro_modelo = float(mean_squared_error(y_teste, modelo.predict(X_teste)))
    erro_baseline = float(mean_squared_error(y_teste, baseline.predict(X_teste)))
    return {"modelo": erro_modelo, "baseline": erro_baseline, "ganho": 1 - erro_modelo / erro_baseline}
```
```python name="ganho como diferença"
from sklearn.dummy import DummyRegressor
from sklearn.metrics import root_mean_squared_error
from sklearn.model_selection import train_test_split


def comparar_com_baseline(modelo, X, y, semente):
    X_treino, X_teste, y_treino, y_teste = train_test_split(X, y, test_size=0.25, random_state=semente)
    baseline = DummyRegressor().fit(X_treino, y_treino)
    modelo.fit(X_treino, y_treino)
    erro_modelo = float(root_mean_squared_error(y_teste, modelo.predict(X_teste)))
    erro_baseline = float(root_mean_squared_error(y_teste, baseline.predict(X_teste)))
    return {"modelo": erro_modelo, "baseline": erro_baseline, "ganho": erro_baseline - erro_modelo}
```
```python name="ignora o modelo recebido"
from sklearn.dummy import DummyRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import root_mean_squared_error
from sklearn.model_selection import train_test_split


def comparar_com_baseline(modelo, X, y, semente):
    X_treino, X_teste, y_treino, y_teste = train_test_split(X, y, test_size=0.25, random_state=semente)
    baseline = DummyRegressor().fit(X_treino, y_treino)
    modelo = LinearRegression().fit(X_treino, y_treino)
    erro_modelo = float(root_mean_squared_error(y_teste, modelo.predict(X_teste)))
    erro_baseline = float(root_mean_squared_error(y_teste, baseline.predict(X_teste)))
    return {"modelo": erro_modelo, "baseline": erro_baseline, "ganho": 1 - erro_modelo / erro_baseline}
```
```python name="divisão sem a semente"
from sklearn.dummy import DummyRegressor
from sklearn.metrics import root_mean_squared_error
from sklearn.model_selection import train_test_split


def comparar_com_baseline(modelo, X, y, semente):
    X_treino, X_teste, y_treino, y_teste = train_test_split(X, y, test_size=0.25, random_state=0)
    baseline = DummyRegressor().fit(X_treino, y_treino)
    modelo.fit(X_treino, y_treino)
    erro_modelo = float(root_mean_squared_error(y_teste, modelo.predict(X_teste)))
    erro_baseline = float(root_mean_squared_error(y_teste, baseline.predict(X_teste)))
    return {"modelo": erro_modelo, "baseline": erro_baseline, "ganho": 1 - erro_modelo / erro_baseline}
```

## Passo 6 · Leitura · A variação entre partições

Numa validação cruzada de 5 partições repetida 2 vezes (`RepeatedKFold(n_splits=5, n_repeats=2)`), cada modelo recebe 10 notas, uma por partição. Repetir com outros sorteios reduz a dependência de uma divisão específica, e o desvio entre as notas mostra quanto elas oscilam. No conjunto do exercício anterior, a regressão linear teve RMSE médio de 0,956 com desvio de 0,144, e a ridge com `alpha=30`, 1,136 com desvio de 0,165.

A diferença entre as médias (0,18) é pequena perto dos desvios? Comparar as médias com os desvios de cada modelo ignora uma informação valiosa: os dois modelos foram avaliados **nas mesmas partições**. Uma partição difícil é difícil para os dois; o que interessa é a diferença dentro de cada partição:

$$
d_i = s^{B}_i - s^{A}_i \qquad \bar{d} = \frac{1}{n}\sum_i d_i \qquad \text{EP} = \frac{s_d}{\sqrt{n}}
$$

em que $s_d$ é o desvio amostral (`ddof=1`) dos $d_i$, e EP é o erro padrão da média $\bar{d}$, como no intervalo de confiança do Nível 4. Com erros (menor é melhor), $d_i > 0$ quando A erra menos que B na partição $i$. Se $\bar{d}$ passa de duas vezes o EP, a diferença dificilmente é só sorte das partições. Com notas que variam muito de uma partição para outra, mas com A sempre um pouco à frente, as diferenças pareadas mostram uma vantagem que as médias e os desvios separados esconderiam.

O `scipy.stats.ttest_rel(scores_a, scores_b)` faz o teste pareado do Nível 4 com essas diferenças. Há uma ressalva importante: as partições compartilham boa parte do treino, e as notas não são independentes, como o teste supõe. O p-valor sai menor do que deveria, e o teste encontra diferenças que não existem com mais frequência que o nível de significância promete. Use o resultado como indicação, não como prova.

Estatística não basta: uma diferença de 0,01 minuto pode ser real e não valer a troca de modelo. Defina antes qual ganho mínimo importa na aplicação e exija os dois critérios: diferença acima do mínimo e acima do ruído.

## Passo 7 · Exercício · Tabela de experimentos

Escreva a tabela que compara vários modelos nas mesmas partições e a regra que decide se uma diferença importa.

### Instruções
1. `tabela_de_experimentos(modelos, X, y, k, repeticoes, semente)` recebe um dicionário `{nome: modelo}` e avalia cada modelo com o `cross_val_score`, `scoring="neg_root_mean_squared_error"` e um `RepeatedKFold(n_splits=k, n_repeats=repeticoes, random_state=semente)`; o RMSE de cada partição é o oposto da nota.
2. Devolve um DataFrame com as colunas `"modelo"`, `"rmse_medio"` e `"desvio"` (desvio amostral, `ddof=1`), uma linha por modelo, ordenado do menor `rmse_medio` para o maior.
3. `diferenca_relevante(erros_a, erros_b, minimo)` recebe os erros de A e de B **nas mesmas partições** e calcula as diferenças pareadas $d_i = b_i - a_i$.
4. Devolve `True` (um `bool` do Python) só se a média dos $d_i$ for pelo menos `minimo` **e** maior que duas vezes o erro padrão $s_d / \sqrt{n}$, com $s_d$ o desvio amostral (`ddof=1`) dos $d_i$.

### Código inicial
```python
import numpy as np
import pandas as pd
from sklearn.model_selection import RepeatedKFold, cross_val_score


def tabela_de_experimentos(modelos, X, y, k, repeticoes, semente):
    pass


def diferenca_relevante(erros_a, erros_b, minimo):
    pass
```

### Solução
```python
import numpy as np
import pandas as pd
from sklearn.model_selection import RepeatedKFold, cross_val_score


def tabela_de_experimentos(modelos, X, y, k, repeticoes, semente):
    cv = RepeatedKFold(n_splits=k, n_repeats=repeticoes, random_state=semente)
    linhas = []
    for nome, modelo in modelos.items():
        erros = -cross_val_score(modelo, X, y, cv=cv, scoring="neg_root_mean_squared_error")
        linhas.append({"modelo": nome, "rmse_medio": float(erros.mean()), "desvio": float(erros.std(ddof=1))})
    return pd.DataFrame(linhas).sort_values("rmse_medio").reset_index(drop=True)


def diferenca_relevante(erros_a, erros_b, minimo):
    d = np.asarray(erros_b, dtype=float) - np.asarray(erros_a, dtype=float)
    media = d.mean()
    erro_padrao = d.std(ddof=1) / np.sqrt(len(d))
    return bool(media >= minimo and media > 2 * erro_padrao)
```

### Dicas
1. O `scoring="neg_root_mean_squared_error"` devolve o RMSE com o sinal trocado, para que "maior é melhor" valha para toda nota do scikit-learn.
2. O mesmo objeto `cv`, com a mesma semente, faz as mesmas partições para todos os modelos.
3. Na regra, calcule as diferenças partição a partição antes de qualquer média ou desvio.

### Verificação
```json
[
  { "id": "colunas", "checkpoint": 2, "kind": "expr",
    "setup": "import numpy as np\nfrom sklearn.dummy import DummyRegressor\nfrom sklearn.linear_model import LinearRegression\nfrom sklearn.neighbors import KNeighborsRegressor\nrng = np.random.default_rng(3)\nX = rng.normal(size=(120, 3)).round(3)\ny = (2 + X @ np.array([1.5, -2.0, 0.5]) + rng.normal(0, 1.0, 120)).round(3)\nfrom sklearn.linear_model import Ridge\nmodelos = {'media': DummyRegressor(), 'linear': LinearRegression(), 'ridge': Ridge(alpha=30.0), 'knn': KNeighborsRegressor(5)}\nt = tabela_de_experimentos(modelos, X, y, 5, 2, 0)",
    "expr": "[type(t).__name__, list(t.columns), len(t)]",
    "expected": ["DataFrame", ["modelo", "rmse_medio", "desvio"], 4],
    "name": "Um DataFrame com as três colunas e uma linha por modelo" },
  { "id": "ordem", "checkpoint": 2, "kind": "expr",
    "setup": "import numpy as np\nfrom sklearn.dummy import DummyRegressor\nfrom sklearn.linear_model import LinearRegression\nfrom sklearn.neighbors import KNeighborsRegressor\nrng = np.random.default_rng(3)\nX = rng.normal(size=(120, 3)).round(3)\ny = (2 + X @ np.array([1.5, -2.0, 0.5]) + rng.normal(0, 1.0, 120)).round(3)\nfrom sklearn.linear_model import Ridge\nmodelos = {'media': DummyRegressor(), 'linear': LinearRegression(), 'ridge': Ridge(alpha=30.0), 'knn': KNeighborsRegressor(5)}\nt = tabela_de_experimentos(modelos, X, y, 5, 2, 0)",
    "expr": "t['modelo'].tolist()",
    "expected": ["linear", "ridge", "knn", "media"],
    "name": "Do menor RMSE médio para o maior",
    "hint": "Ordene pelo RMSE médio, em ordem crescente." },
  { "id": "medias", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np\nfrom sklearn.dummy import DummyRegressor\nfrom sklearn.linear_model import LinearRegression\nfrom sklearn.neighbors import KNeighborsRegressor\nrng = np.random.default_rng(3)\nX = rng.normal(size=(120, 3)).round(3)\ny = (2 + X @ np.array([1.5, -2.0, 0.5]) + rng.normal(0, 1.0, 120)).round(3)\nfrom sklearn.linear_model import Ridge\nmodelos = {'media': DummyRegressor(), 'linear': LinearRegression(), 'ridge': Ridge(alpha=30.0), 'knn': KNeighborsRegressor(5)}\nt = tabela_de_experimentos(modelos, X, y, 5, 2, 0)",
    "expr": "t['rmse_medio'].tolist()",
    "expected": [0.955546153896532, 1.1360783194258888, 1.347191364184484, 3.1330590070076876],
    "tolerance": 1e-09,
    "name": "RMSE médio de cada modelo em 5 partições × 2 repetições",
    "hint": "O RMSE de cada partição é o oposto da nota neg_root_mean_squared_error." },
  { "id": "desvios", "checkpoint": 2, "kind": "expr",
    "setup": "import numpy as np\nfrom sklearn.dummy import DummyRegressor\nfrom sklearn.linear_model import LinearRegression\nfrom sklearn.neighbors import KNeighborsRegressor\nrng = np.random.default_rng(3)\nX = rng.normal(size=(120, 3)).round(3)\ny = (2 + X @ np.array([1.5, -2.0, 0.5]) + rng.normal(0, 1.0, 120)).round(3)\nfrom sklearn.linear_model import Ridge\nmodelos = {'media': DummyRegressor(), 'linear': LinearRegression(), 'ridge': Ridge(alpha=30.0), 'knn': KNeighborsRegressor(5)}\nt = tabela_de_experimentos(modelos, X, y, 5, 2, 0)",
    "expr": "t['desvio'].tolist()",
    "expected": [0.14359154686332307, 0.16472139701461253, 0.20472466677290424, 0.4485675901408674],
    "tolerance": 1e-09,
    "name": "Desvio amostral das 10 notas de cada modelo",
    "hint": "O desvio pedido é o amostral, com ddof=1." },
  { "id": "outra-validacao", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np\nfrom sklearn.dummy import DummyRegressor\nfrom sklearn.linear_model import LinearRegression\nfrom sklearn.neighbors import KNeighborsRegressor\nrng = np.random.default_rng(3)\nX = rng.normal(size=(120, 3)).round(3)\ny = (2 + X @ np.array([1.5, -2.0, 0.5]) + rng.normal(0, 1.0, 120)).round(3)\nt = tabela_de_experimentos({'media': DummyRegressor(), 'linear': LinearRegression()}, X, y, 3, 1, 2)",
    "expr": "t.to_dict('list')['modelo'] + t.to_dict('list')['rmse_medio']",
    "expected": ["linear", "media", 0.9674934195745406, 3.1573101947802296],
    "tolerance": 1e-09,
    "name": "3 partições, sem repetir, semente 2",
    "hint": "Use o k, as repetições e a semente recebidos." },
  { "id": "pareada", "checkpoint": 3, "kind": "call",
    "function": "diferenca_relevante",
    "args": [[10, 20, 30, 40, 50], [11, 21, 31.2, 41, 51.1], 0.5],
    "expected": true,
    "name": "Notas que variam muito, com A sempre um pouco melhor: relevante",
    "hint": "Compare partição a partição: a variação que os dois modelos têm em comum se cancela." },
  { "id": "b-melhor", "checkpoint": 3, "kind": "call",
    "function": "diferenca_relevante",
    "args": [[11, 21, 31.2, 41, 51.1], [10, 20, 30, 40, 50], 0.5],
    "expected": false,
    "name": "Quando B erra menos que A, não é relevante a favor de A",
    "hint": "d_i = b_i − a_i é positivo quando A erra menos." },
  { "id": "abaixo-do-minimo", "checkpoint": 4, "kind": "call",
    "function": "diferenca_relevante",
    "args": [[1.0, 1.1, 0.9, 1.0], [1.2, 1.3, 1.1, 1.2], 0.5],
    "expected": false,
    "name": "Diferença constante de 0,2 com mínimo 0,5: não é relevante",
    "hint": "Além de passar do ruído, a diferença média precisa chegar ao mínimo." },
  { "id": "acima-do-minimo", "checkpoint": 4, "kind": "call",
    "function": "diferenca_relevante",
    "args": [[1.0, 1.1, 0.9, 1.0], [1.2, 1.3, 1.1, 1.2], 0.1],
    "expected": true,
    "name": "A mesma diferença com mínimo 0,1: relevante" },
  { "id": "ruidosa", "checkpoint": 4, "kind": "call",
    "function": "diferenca_relevante",
    "args": [[5, 10, 4, 9, 6], [8, 8, 8, 6, 8], 0.5],
    "expected": false,
    "name": "Diferenças de sinais trocados (média 0,8): dentro do ruído",
    "hint": "Compare a média das diferenças com duas vezes o erro padrão delas." },
  { "id": "ddof", "checkpoint": 4, "kind": "call",
    "function": "diferenca_relevante",
    "args": [[0, 0, 0, 0], [0.1, 2, 0.1, 2], 0.5],
    "expected": false,
    "name": "Média 1,05 contra duas vezes o erro padrão amostral (1,097): não passa",
    "hint": "O desvio das diferenças é o amostral, com ddof=1." },
  { "id": "tipo-bool", "checkpoint": 4, "kind": "expr",
    "expr": "type(diferenca_relevante([10, 20, 30, 40, 50], [11, 21, 31.2, 41, 51.1], 0.5)) is bool",
    "expected": true,
    "name": "Devolve um bool do Python",
    "hint": "Uma comparação entre números do numpy dá um bool do numpy." }
]
```

### Soluções erradas
```python name="desvio populacional na tabela"
import numpy as np
import pandas as pd
from sklearn.model_selection import RepeatedKFold, cross_val_score


def tabela_de_experimentos(modelos, X, y, k, repeticoes, semente):
    cv = RepeatedKFold(n_splits=k, n_repeats=repeticoes, random_state=semente)
    linhas = []
    for nome, modelo in modelos.items():
        erros = -cross_val_score(modelo, X, y, cv=cv, scoring="neg_root_mean_squared_error")
        linhas.append({"modelo": nome, "rmse_medio": float(erros.mean()), "desvio": float(erros.std())})
    return pd.DataFrame(linhas).sort_values("rmse_medio").reset_index(drop=True)


def diferenca_relevante(erros_a, erros_b, minimo):
    d = np.asarray(erros_b, dtype=float) - np.asarray(erros_a, dtype=float)
    media = d.mean()
    erro_padrao = d.std(ddof=1) / np.sqrt(len(d))
    return bool(media >= minimo and media > 2 * erro_padrao)
```
```python name="nota negativa usada como RMSE"
import numpy as np
import pandas as pd
from sklearn.model_selection import RepeatedKFold, cross_val_score


def tabela_de_experimentos(modelos, X, y, k, repeticoes, semente):
    cv = RepeatedKFold(n_splits=k, n_repeats=repeticoes, random_state=semente)
    linhas = []
    for nome, modelo in modelos.items():
        erros = cross_val_score(modelo, X, y, cv=cv, scoring="neg_root_mean_squared_error")
        linhas.append({"modelo": nome, "rmse_medio": float(erros.mean()), "desvio": float(erros.std(ddof=1))})
    return pd.DataFrame(linhas).sort_values("rmse_medio").reset_index(drop=True)


def diferenca_relevante(erros_a, erros_b, minimo):
    d = np.asarray(erros_b, dtype=float) - np.asarray(erros_a, dtype=float)
    media = d.mean()
    erro_padrao = d.std(ddof=1) / np.sqrt(len(d))
    return bool(media >= minimo and media > 2 * erro_padrao)
```
```python name="uma divisão k-fold, sem repetir"
import numpy as np
import pandas as pd
from sklearn.model_selection import RepeatedKFold, cross_val_score


def tabela_de_experimentos(modelos, X, y, k, repeticoes, semente):
    linhas = []
    for nome, modelo in modelos.items():
        erros = -cross_val_score(modelo, X, y, cv=k, scoring="neg_root_mean_squared_error")
        linhas.append({"modelo": nome, "rmse_medio": float(erros.mean()), "desvio": float(erros.std(ddof=1))})
    return pd.DataFrame(linhas).sort_values("rmse_medio").reset_index(drop=True)


def diferenca_relevante(erros_a, erros_b, minimo):
    d = np.asarray(erros_b, dtype=float) - np.asarray(erros_a, dtype=float)
    media = d.mean()
    erro_padrao = d.std(ddof=1) / np.sqrt(len(d))
    return bool(media >= minimo and media > 2 * erro_padrao)
```
```python name="tabela sem ordenar"
import numpy as np
import pandas as pd
from sklearn.model_selection import RepeatedKFold, cross_val_score


def tabela_de_experimentos(modelos, X, y, k, repeticoes, semente):
    cv = RepeatedKFold(n_splits=k, n_repeats=repeticoes, random_state=semente)
    linhas = []
    for nome, modelo in modelos.items():
        erros = -cross_val_score(modelo, X, y, cv=cv, scoring="neg_root_mean_squared_error")
        linhas.append({"modelo": nome, "rmse_medio": float(erros.mean()), "desvio": float(erros.std(ddof=1))})
    return pd.DataFrame(linhas)


def diferenca_relevante(erros_a, erros_b, minimo):
    d = np.asarray(erros_b, dtype=float) - np.asarray(erros_a, dtype=float)
    media = d.mean()
    erro_padrao = d.std(ddof=1) / np.sqrt(len(d))
    return bool(media >= minimo and media > 2 * erro_padrao)
```
```python name="médias e desvios sem parear"
import numpy as np
import pandas as pd
from sklearn.model_selection import RepeatedKFold, cross_val_score


def tabela_de_experimentos(modelos, X, y, k, repeticoes, semente):
    cv = RepeatedKFold(n_splits=k, n_repeats=repeticoes, random_state=semente)
    linhas = []
    for nome, modelo in modelos.items():
        erros = -cross_val_score(modelo, X, y, cv=cv, scoring="neg_root_mean_squared_error")
        linhas.append({"modelo": nome, "rmse_medio": float(erros.mean()), "desvio": float(erros.std(ddof=1))})
    return pd.DataFrame(linhas).sort_values("rmse_medio").reset_index(drop=True)


def diferenca_relevante(erros_a, erros_b, minimo):
    a = np.asarray(erros_a, dtype=float)
    b = np.asarray(erros_b, dtype=float)
    media = b.mean() - a.mean()
    erro_padrao = np.sqrt(a.var(ddof=1) / len(a) + b.var(ddof=1) / len(b))
    return bool(media >= minimo and media > 2 * erro_padrao)
```
```python name="diferença com o sinal trocado"
import numpy as np
import pandas as pd
from sklearn.model_selection import RepeatedKFold, cross_val_score


def tabela_de_experimentos(modelos, X, y, k, repeticoes, semente):
    cv = RepeatedKFold(n_splits=k, n_repeats=repeticoes, random_state=semente)
    linhas = []
    for nome, modelo in modelos.items():
        erros = -cross_val_score(modelo, X, y, cv=cv, scoring="neg_root_mean_squared_error")
        linhas.append({"modelo": nome, "rmse_medio": float(erros.mean()), "desvio": float(erros.std(ddof=1))})
    return pd.DataFrame(linhas).sort_values("rmse_medio").reset_index(drop=True)


def diferenca_relevante(erros_a, erros_b, minimo):
    d = np.asarray(erros_a, dtype=float) - np.asarray(erros_b, dtype=float)
    media = d.mean()
    erro_padrao = d.std(ddof=1) / np.sqrt(len(d))
    return bool(media >= minimo and media > 2 * erro_padrao)
```
```python name="ignora o mínimo"
import numpy as np
import pandas as pd
from sklearn.model_selection import RepeatedKFold, cross_val_score


def tabela_de_experimentos(modelos, X, y, k, repeticoes, semente):
    cv = RepeatedKFold(n_splits=k, n_repeats=repeticoes, random_state=semente)
    linhas = []
    for nome, modelo in modelos.items():
        erros = -cross_val_score(modelo, X, y, cv=cv, scoring="neg_root_mean_squared_error")
        linhas.append({"modelo": nome, "rmse_medio": float(erros.mean()), "desvio": float(erros.std(ddof=1))})
    return pd.DataFrame(linhas).sort_values("rmse_medio").reset_index(drop=True)


def diferenca_relevante(erros_a, erros_b, minimo):
    d = np.asarray(erros_b, dtype=float) - np.asarray(erros_a, dtype=float)
    media = d.mean()
    erro_padrao = d.std(ddof=1) / np.sqrt(len(d))
    return bool(media > 2 * erro_padrao)
```
```python name="ignora o erro padrão"
import numpy as np
import pandas as pd
from sklearn.model_selection import RepeatedKFold, cross_val_score


def tabela_de_experimentos(modelos, X, y, k, repeticoes, semente):
    cv = RepeatedKFold(n_splits=k, n_repeats=repeticoes, random_state=semente)
    linhas = []
    for nome, modelo in modelos.items():
        erros = -cross_val_score(modelo, X, y, cv=cv, scoring="neg_root_mean_squared_error")
        linhas.append({"modelo": nome, "rmse_medio": float(erros.mean()), "desvio": float(erros.std(ddof=1))})
    return pd.DataFrame(linhas).sort_values("rmse_medio").reset_index(drop=True)


def diferenca_relevante(erros_a, erros_b, minimo):
    d = np.asarray(erros_b, dtype=float) - np.asarray(erros_a, dtype=float)
    return bool(d.mean() >= minimo)
```
```python name="erro padrão com ddof=0"
import numpy as np
import pandas as pd
from sklearn.model_selection import RepeatedKFold, cross_val_score


def tabela_de_experimentos(modelos, X, y, k, repeticoes, semente):
    cv = RepeatedKFold(n_splits=k, n_repeats=repeticoes, random_state=semente)
    linhas = []
    for nome, modelo in modelos.items():
        erros = -cross_val_score(modelo, X, y, cv=cv, scoring="neg_root_mean_squared_error")
        linhas.append({"modelo": nome, "rmse_medio": float(erros.mean()), "desvio": float(erros.std(ddof=1))})
    return pd.DataFrame(linhas).sort_values("rmse_medio").reset_index(drop=True)


def diferenca_relevante(erros_a, erros_b, minimo):
    d = np.asarray(erros_b, dtype=float) - np.asarray(erros_a, dtype=float)
    media = d.mean()
    erro_padrao = d.std() / np.sqrt(len(d))
    return bool(media >= minimo and media > 2 * erro_padrao)
```
```python name="devolve um bool do numpy"
import numpy as np
import pandas as pd
from sklearn.model_selection import RepeatedKFold, cross_val_score


def tabela_de_experimentos(modelos, X, y, k, repeticoes, semente):
    cv = RepeatedKFold(n_splits=k, n_repeats=repeticoes, random_state=semente)
    linhas = []
    for nome, modelo in modelos.items():
        erros = -cross_val_score(modelo, X, y, cv=cv, scoring="neg_root_mean_squared_error")
        linhas.append({"modelo": nome, "rmse_medio": float(erros.mean()), "desvio": float(erros.std(ddof=1))})
    return pd.DataFrame(linhas).sort_values("rmse_medio").reset_index(drop=True)


def diferenca_relevante(erros_a, erros_b, minimo):
    d = np.asarray(erros_b, dtype=float) - np.asarray(erros_a, dtype=float)
    media = d.mean()
    erro_padrao = d.std(ddof=1) / np.sqrt(len(d))
    return (media >= minimo) & (media > 2 * erro_padrao)
```

## Passo 8 · Quiz · R² negativo e MAPE

### Pergunta
Um modelo de previsão de vendas diárias tem $R^2 = 0{,}62$ no treino e $R^2 = -0{,}15$ no teste. O que o $-0{,}15$ diz?
- [ ] Há um erro no cálculo: o $R^2$ é um quadrado e não pode ser negativo
- [x] No teste, o modelo erra mais do que erraria prevendo sempre a média das vendas do teste; ele não serve como está
- [ ] O modelo acerta 15 % menos vendas do que a média
- [ ] As previsões estão inversamente correlacionadas com as vendas, e basta trocar o sinal delas
> O $R^2$ é $1 - \text{SSE}/\text{SST}$ e fica negativo quando a soma dos erros ao quadrado do modelo passa a da média; o nome "quadrado" vem da regressão simples no treino, onde ele é o quadrado da correlação. Ele não conta acertos. Trocar o sinal das previsões só ajudaria se elas fossem um espelho das vendas, e o $R^2$ negativo não diz isso: diz apenas que o modelo está pior que a média, o que, junto com 0,62 no treino, aponta para sobreajuste.

### Pergunta
Um modelo prevê o consumo diário de energia de máquinas fictícias. Algumas máquinas ficam desligadas em certos dias, com consumo 0. A equipe quer uma métrica fácil de explicar. Por que o MAPE é uma má escolha aqui?
- [ ] Porque o MAPE não tem unidade e por isso não pode ser explicado
- [ ] Porque o MAPE pesa mais os erros grandes, como o RMSE
- [x] Porque divide pelo valor real: nos dias de consumo 0 ele não está definido, e em dias de consumo muito baixo um erro pequeno em kWh vira um erro percentual enorme
- [ ] Porque o MAPE do scikit-learn levanta erro quando encontra um zero
> O MAPE é $|e_i / y_i|$ em média: com $y_i = 0$ a conta não existe, e com $y_i$ pequeno um erro de 0,5 kWh pode virar 500 %. O `mean_absolute_percentage_error` não levanta erro; divide por um número minúsculo e devolve um valor gigantesco, o que é pior, porque passa despercebido. Ser sem unidade é a vantagem do MAPE, e quem pesa os erros grandes é o RMSE. Aqui, o MAE em kWh é fácil de explicar e não quebra com zeros.

### Pergunta
Dois modelos foram avaliados com o mesmo `RepeatedKFold` de 10 partições. O RMSE médio de A é 4,10 e o de B é 4,18, e a diferença pareada $b_i - a_i$ tem média 0,08 e erro padrão 0,02. O ganho mínimo que a equipe definiu como relevante é 0,5. O que fazer?
- [ ] Trocar para A: a diferença passa de duas vezes o erro padrão, então é real
- [x] Ficar com o mais simples dos dois: a diferença provavelmente é real, mas está bem abaixo do mínimo que importa
- [ ] Repetir a validação até a diferença passar de 0,5
- [ ] Escolher B, porque uma diferença de 0,08 está dentro do ruído
> A diferença passa no critério estatístico (0,08 > 0,04), mas não no prático (0,08 < 0,5): é real e pequena demais para importar. Nesse caso, a simplicidade decide. Repetir a validação até o número desejado aparecer é escolher o resultado antes do experimento. E 0,08 não está dentro do ruído: o erro padrão pareado é 0,02.
