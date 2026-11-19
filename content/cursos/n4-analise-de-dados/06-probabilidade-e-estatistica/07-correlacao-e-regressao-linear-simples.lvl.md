---
slug: n4-m6-07-correlacao-e-regressao-linear-simples
titulo: Correlação e regressão linear simples
descricao: Covariância, correlação de Pearson e Spearman, correlação não é causação, ajuste de reta, R², resíduos e previsão.
dificuldade: intermediario
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- pandas
- scipy
xp: 120
tempo_min: 50
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Calcular e interpretar correlação de Pearson e Spearman e reconhecer quando cada uma é adequada
- Ajustar uma regressão linear simples, interpretar coeficientes e R² e analisar resíduos
- Distinguir correlação, causação e variáveis de confusão com exemplos
---

## Passo 1 · Leitura · Covariância e correlação

Uma sorveteria fictícia anotou, durante um verão, a temperatura máxima de cada dia e quantos picolés vendeu. Nos dias quentes vendeu mais. Para medir essa relação com um número, comece pela **covariância**: a média dos produtos dos desvios. Quando $x$ e $y$ ficam acima das suas médias nos mesmos dias, os produtos são positivos e a covariância também.

$$
\operatorname{cov}(x, y) = \frac{1}{n - 1} \sum_{i=1}^{n} (x_i - \bar x)(y_i - \bar y), \qquad r = \frac{\operatorname{cov}(x, y)}{s_x\, s_y}
$$

A covariância depende das unidades (graus vezes picolés), então não diz se a relação é forte. Dividir pelos dois desvios dá a **correlação de Pearson**, $r$, sempre entre $-1$ e $1$: perto de 1, os pontos ficam perto de uma reta crescente; perto de $-1$, de uma reta decrescente; perto de 0, não há tendência **linear**.

```python
from scipy import stats

r = stats.pearsonr(temperatura, picoles)
r.statistic, r.pvalue          # a correlação e o p-valor do teste de r = 0
```

O "linear" importa. Se $y = x^3$, a relação é perfeita e crescente, mas não é uma reta, e o $r$ fica abaixo de 1. A **correlação de Spearman** troca cada valor pela sua posição (o **posto**, com empates recebendo a média das posições) e calcula o Pearson dos postos. Ela mede se a relação é **monotônica**, sempre crescente ou sempre decrescente, e vale 1 para $y = x^3$. Como olha só a ordem, um valor extremo pesa pouco nela: um único ponto distante pode levar o Pearson de 0,9 para perto de 0,5, enquanto o Spearman mal se mexe.

Com uma variável constante, a correlação não existe: o desvio dela é zero e a conta divide por zero. O `scipy` avisa e devolve `nan`, sem levantar erro:

```text
ConstantInputWarning: An input array is constant; the correlation coefficient is not defined.
```

O número sozinho engana. O **quarteto de Anscombe** é um conjunto clássico de quatro pares $(x, y)$ com a mesma média, a mesma variância e a mesma correlação ($r \approx 0{,}82$): o primeiro é uma nuvem em torno de uma reta, o segundo é uma curva perfeita, o terceiro é uma reta exata com um ponto fora, e no quarto todos os $x$ são iguais menos um, que sozinho cria a correlação. Antes de interpretar um $r$, faça o gráfico de dispersão.

## Passo 2 · Exercício · Duas correlações
modo: lacunas

Complete as lacunas (`___`) para calcular as duas correlações e recusar variáveis constantes.

### Instruções
1. `correlacoes(x, y)` levanta `ValueError` se **qualquer uma** das duas variáveis for constante.
2. A função devolve a tupla `(pearson, spearman)`, com dois `float`, usando `stats.pearsonr` e `stats.spearmanr` e o atributo da **correlação** de cada resultado (não o p-valor).

### Código inicial
```python
import numpy as np
from scipy import stats


def correlacoes(x, y):
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    if x.std() == 0 ___ y.std() == 0:
        raise ValueError("uma variável constante não tem correlação")
    pearson = stats.___(x, y).___
    spearman = stats.___(x, y).statistic
    return float(pearson), float(spearman)
```

### Solução
```python
import numpy as np
from scipy import stats


def correlacoes(x, y):
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    if x.std() == 0 or y.std() == 0:
        raise ValueError("uma variável constante não tem correlação")
    pearson = stats.pearsonr(x, y).statistic
    spearman = stats.spearmanr(x, y).statistic
    return float(pearson), float(spearman)
```

### Dicas
1. Basta uma variável constante para a correlação não existir.
2. O resultado do `pearsonr` tem dois atributos; a correlação é a `statistic`.
3. Spearman é a correlação dos postos: ela vale 1 para qualquer relação sempre crescente.

### Verificação
```json
[
  { "id": "tipos", "checkpoint": 2, "kind": "expr", "setup": "r = correlacoes([1, 2, 3, 4], [2, 1, 4, 3])",
    "expr": "[type(r).__name__, type(r[0]).__name__, type(r[1]).__name__]", "expected": ["tuple", "float", "float"],
    "name": "Devolve uma tupla de dois float" },
  { "id": "reta", "checkpoint": 2, "kind": "expr", "expr": "list(correlacoes([1, 2, 3, 4, 5], [2, 4, 6, 8, 10]))",
    "expected": [1.0, 1.0], "tolerance": 1e-9, "name": "Pontos numa reta crescente: as duas valem 1" },
  { "id": "cubo", "checkpoint": 2, "kind": "expr", "expr": "list(correlacoes([1, 2, 3, 4, 5, 6], [1, 8, 27, 64, 125, 216]))",
    "expected": [0.9379313244517968, 1.0], "tolerance": 1e-9, "name": "y = x³: Pearson abaixo de 1, Spearman igual a 1",
    "hint": "A primeira é a de Pearson, a segunda a de Spearman." },
  { "id": "negativa", "checkpoint": 2, "kind": "expr", "expr": "list(correlacoes([1, 2, 3, 4, 5], [10, 8, 7, 3, 1]))",
    "expected": [-0.9825113063742751, -1.0], "tolerance": 1e-9, "name": "Relação decrescente: as duas negativas" },
  { "id": "extremo", "checkpoint": 2, "kind": "expr",
    "expr": "list(correlacoes([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [2, 1, 4, 3, 6, 5, 8, 7, 10, 60]))",
    "expected": [0.6409996040962033, 0.9515151515151514], "tolerance": 1e-9, "name": "Um valor extremo pesa mais no Pearson que no Spearman",
    "hint": "Devolva as correlações, não os p-valores." },
  { "id": "empates", "checkpoint": 2, "kind": "expr", "expr": "list(correlacoes([1, 2, 2, 3], [1, 3, 2, 4]))",
    "expected": [0.9486832980505138, 0.9486832980505139], "tolerance": 1e-9, "name": "Com empates, o Spearman usa postos médios" },
  { "id": "y-constante", "checkpoint": 1, "kind": "expr", "expr": "correlacoes([1, 2, 3], [5, 5, 5])", "raises": "ValueError",
    "name": "y constante é recusado" },
  { "id": "x-constante", "checkpoint": 1, "kind": "expr", "expr": "correlacoes([4, 4, 4, 4], [1, 2, 3, 4])",
    "raises": "ValueError", "name": "x constante é recusado, mesmo com y variando",
    "hint": "Uma variável constante já basta para recusar." }
]
```

### Soluções erradas
```python name="recusa só se as duas forem constantes"
import numpy as np
from scipy import stats


def correlacoes(x, y):
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    if x.std() == 0 and y.std() == 0:
        raise ValueError("uma variável constante não tem correlação")
    pearson = stats.pearsonr(x, y).statistic
    spearman = stats.spearmanr(x, y).statistic
    return float(pearson), float(spearman)
```
```python name="p-valor no lugar da correlação"
import numpy as np
from scipy import stats


def correlacoes(x, y):
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    if x.std() == 0 or y.std() == 0:
        raise ValueError("uma variável constante não tem correlação")
    pearson = stats.pearsonr(x, y).pvalue
    spearman = stats.spearmanr(x, y).statistic
    return float(pearson), float(spearman)
```
```python name="as duas na ordem trocada"
import numpy as np
from scipy import stats


def correlacoes(x, y):
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    if x.std() == 0 or y.std() == 0:
        raise ValueError("uma variável constante não tem correlação")
    pearson = stats.spearmanr(x, y).statistic
    spearman = stats.pearsonr(x, y).statistic
    return float(pearson), float(spearman)
```
```python name="Pearson nas duas"
import numpy as np
from scipy import stats


def correlacoes(x, y):
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    if x.std() == 0 or y.std() == 0:
        raise ValueError("uma variável constante não tem correlação")
    pearson = stats.pearsonr(x, y).statistic
    spearman = stats.pearsonr(x, y).statistic
    return float(pearson), float(spearman)
```
```python name="Spearman nas duas"
import numpy as np
from scipy import stats


def correlacoes(x, y):
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    if x.std() == 0 or y.std() == 0:
        raise ValueError("uma variável constante não tem correlação")
    pearson = stats.spearmanr(x, y).statistic
    spearman = stats.spearmanr(x, y).statistic
    return float(pearson), float(spearman)
```

## Passo 3 · Previsão · Quatro conjuntos, mesmas estatísticas

O programa usa o quarteto de Anscombe: três conjuntos com os mesmos $x$ e um quarto com outros $x$. Para cada um, imprime a média de $y$, a variância de $y$ e a correlação, arredondadas. No fim, conta quantos valores diferentes de $x$ o quarto conjunto tem. Digite a saída.

### Código
```python
import numpy as np

x = [10, 8, 13, 9, 11, 14, 6, 4, 12, 7, 5]
x4 = [8, 8, 8, 8, 8, 8, 8, 19, 8, 8, 8]
conjuntos = {
    "I": (x, [8.04, 6.95, 7.58, 8.81, 8.33, 9.96, 7.24, 4.26, 10.84, 4.82, 5.68]),
    "II": (x, [9.14, 8.14, 8.74, 8.77, 9.26, 8.10, 6.13, 3.10, 9.13, 7.26, 4.74]),
    "III": (x, [7.46, 6.77, 12.74, 7.11, 7.81, 8.84, 6.08, 5.39, 8.15, 6.42, 5.73]),
    "IV": (x4, [6.58, 5.76, 7.71, 8.84, 8.47, 7.04, 5.25, 12.50, 5.56, 7.91, 6.89]),
}
for nome, (xs, ys) in conjuntos.items():
    media = round(float(np.mean(ys)), 1)
    variancia = round(float(np.var(ys, ddof=1)), 1)
    r = round(float(np.corrcoef(xs, ys)[0, 1]), 2)
    print(nome, media, variancia, r)
print(len(set(x4)))
```

### Dicas
1. A leitura disse o que os quatro conjuntos de Anscombe têm em comum, e a correlação deles.
2. A média dos $y$ do conjunto I é 7,5 e a variância é cerca de 4,1.
3. `set` guarda cada valor uma vez só.

### Saída esperada
```text
I 7.5 4.1 0.82
II 7.5 4.1 0.82
III 7.5 4.1 0.82
IV 7.5 4.1 0.82
2
```

## Passo 4 · Leitura · Mínimos quadrados e R²

A correlação diz se há relação linear; a **regressão linear simples** diz qual é a reta. Ela escolhe o intercepto $a$ e a inclinação $b$ de $\hat y = a + b x$ que minimizam a soma dos quadrados dos **resíduos** $e_i = y_i - \hat y_i$, a mesma ideia de mínimos quadrados da m1-04. A solução tem fórmula fechada:

$$
b = \frac{\operatorname{cov}(x, y)}{s_x^2} = r\,\frac{s_y}{s_x}, \qquad a = \bar y - b\,\bar x
$$

A reta sempre passa pelo ponto $(\bar x, \bar y)$, e os resíduos somam zero. Na sorveteria fictícia, se o ajuste der $b = 12{,}4$, a leitura correta é com as unidades: **cada grau a mais na máxima está associado, em média, a 12,4 picolés a mais por dia**. O intercepto $a$ é o valor previsto para $x = 0$, que pode não ter sentido (um dia de verão com máxima de 0 °C nunca foi observado).

O **coeficiente de determinação** $R^2$ diz que fração da variação de $y$ a reta explica:

$$
R^2 = 1 - \frac{\sum (y_i - \hat y_i)^2}{\sum (y_i - \bar y)^2}
$$

Na regressão simples, $R^2 = r^2$. Um $R^2$ de 0,64 quer dizer que 64 % da variância das vendas acompanha a temperatura; não quer dizer que 64 % das previsões acertam. O $R^2$ não é uma taxa de acerto, e um $R^2$ alto não garante que a reta seja o modelo certo (o conjunto II de Anscombe tem $R^2 = 0{,}67$ e é uma curva).

```python
res = stats.linregress(temperatura, picoles)
res.intercept, res.slope       # a e b
res.rvalue ** 2                # R²: o rvalue é o r, não o R²
```

Com todos os $x$ iguais, a inclinação não é definida, e o `linregress` não levanta erro: devolve `nan` em todos os campos, no máximo com um aviso no stderr (`RuntimeWarning: Precision loss occurred in moment calculation due to catastrophic cancellation.`). Quem precisa recusar esse caso confere antes, com `x.std() == 0`.

Por fim, a reta só foi testada onde há dados. Se as máximas observadas foram de 24 a 36 °C, prever as vendas de um dia de 45 °C é **extrapolar**: nada garante que a relação continue linear fora dessa faixa (talvez ninguém saia de casa com 45 °C). Uma boa função de previsão avisa quando isso acontece.

## Passo 5 · Exercício · Ajustar e prever

Ajuste uma reta com `stats.linregress` e escreva uma previsão que avisa quando extrapola.

### Instruções
1. `regressao_simples(x, y)` devolve o dicionário `{"a": intercepto, "b": inclinação, "r2": R²}`, com três `float`, usando `stats.linregress`. Com todos os `x` iguais, levanta `ValueError` (o `linregress` devolveria `nan` sem erro).
2. `prever(modelo, x_novo, x_min, x_max)` recebe um dicionário como o de cima e devolve a tupla `(valor, extrapolou)`: `valor` é o `float` $a + b \cdot x_{\text{novo}}$, e `extrapolou` é `True` quando `x_novo` está fora do intervalo **fechado** `[x_min, x_max]`.

### Código inicial
```python
import numpy as np
from scipy import stats


def regressao_simples(x, y):
    pass


def prever(modelo, x_novo, x_min, x_max):
    pass
```

### Solução
```python
import numpy as np
from scipy import stats


def regressao_simples(x, y):
    if np.std(x) == 0:
        raise ValueError("todos os x são iguais: a inclinação não é definida")
    res = stats.linregress(x, y)
    return {"a": float(res.intercept), "b": float(res.slope), "r2": float(res.rvalue ** 2)}


def prever(modelo, x_novo, x_min, x_max):
    valor = modelo["a"] + modelo["b"] * x_novo
    extrapolou = x_novo < x_min or x_novo > x_max
    return float(valor), extrapolou
```

### Dicas
1. O `linregress(x, y)` tem `intercept`, `slope` e `rvalue`; o último é o $r$. Ele não recusa um `x` constante.
2. A ordem dos argumentos importa: regredir $x$ em $y$ dá outra reta.
3. Os limites `x_min` e `x_max` são valores observados: prever exatamente neles não é extrapolar.

### Verificação
```json
[
  { "id": "tipos", "checkpoint": 1, "kind": "expr", "setup": "m = regressao_simples([0, 1, 2, 3], [2, 5, 8, 11])",
    "expr": "[sorted(m), type(m['a']).__name__, type(m['b']).__name__, type(m['r2']).__name__]",
    "expected": [["a", "b", "r2"], "float", "float", "float"], "name": "Devolve as chaves a, b e r2 com float" },
  { "id": "exata", "checkpoint": 1, "kind": "expr", "setup": "m = regressao_simples([0, 1, 2, 3], [2, 5, 8, 11])",
    "expr": "[m['a'], m['b'], m['r2']]", "expected": [2.0, 3.0, 1.0], "tolerance": 1e-9,
    "name": "Pontos sobre y = 2 + 3x: a = 2, b = 3, R² = 1", "hint": "a é o intercepto e b a inclinação." },
  { "id": "anscombe", "checkpoint": 1, "kind": "expr",
    "setup": "m = regressao_simples([10, 8, 13, 9, 11, 14, 6, 4, 12, 7, 5], [8.04, 6.95, 7.58, 8.81, 8.33, 9.96, 7.24, 4.26, 10.84, 4.82, 5.68])",
    "expr": "[m['a'], m['b'], m['r2']]", "expected": [3.000090909090908, 0.5000909090909095, 0.6665424595087752], "tolerance": 1e-9,
    "name": "Anscombe I: a ≈ 3, b ≈ 0,5 e R² ≈ 0,67", "hint": "O rvalue é o r; o R² é o quadrado dele." },
  { "id": "ruido", "checkpoint": 1, "kind": "expr",
    "setup": "m = regressao_simples([1, 2, 3, 4, 5, 6], [3.1, 4.9, 7.2, 8.8, 11.1, 12.9])",
    "expr": "[m['a'], m['b'], m['r2']]", "expected": [1.0799999999999998, 1.9771428571428562, 0.9983821199232752], "tolerance": 1e-9,
    "name": "Seis pontos perto de uma reta", "hint": "Regrida y em x, nessa ordem." },
  { "id": "x-constante", "checkpoint": 1, "kind": "expr", "expr": "regressao_simples([3, 3, 3], [1, 2, 3])",
    "raises": "ValueError", "name": "x constante levanta ValueError" },
  { "id": "dentro", "checkpoint": 2, "kind": "expr", "expr": "prever({'a': 2.0, 'b': 3.0, 'r2': 1.0}, 4, 0, 10)",
    "expected": [14.0, false], "type": "tuple", "tolerance": 1e-9, "name": "Dentro da faixa: 14 sem extrapolar",
    "hint": "O valor previsto é a + b · x_novo." },
  { "id": "no-limite", "checkpoint": 2, "kind": "expr", "expr": "prever({'a': 2.0, 'b': 3.0, 'r2': 1.0}, 10, 0, 10)",
    "expected": [32.0, false], "tolerance": 1e-9, "name": "Exatamente no maior x observado não é extrapolar",
    "hint": "O intervalo é fechado." },
  { "id": "acima", "checkpoint": 2, "kind": "expr", "expr": "prever({'a': 2.0, 'b': 3.0, 'r2': 1.0}, 12, 0, 10)",
    "expected": [38.0, true], "tolerance": 1e-9, "name": "Acima da faixa: extrapolou" },
  { "id": "abaixo", "checkpoint": 2, "kind": "expr", "expr": "prever({'a': 2.0, 'b': 3.0, 'r2': 1.0}, -1, 0, 10)",
    "expected": [-1.0, true], "tolerance": 1e-9, "name": "Abaixo da faixa também é extrapolar" },
  { "id": "tipos-prever", "checkpoint": 2, "kind": "expr", "setup": "r = prever({'a': 1.5, 'b': -0.5, 'r2': 0.9}, 2, 0, 4)",
    "expr": "[type(r[0]).__name__, type(r[1]).__name__, r[0]]", "expected": ["float", "bool", 0.5],
    "name": "O valor é float e o aviso é bool" }
]
```

### Soluções erradas
```python name="r no lugar de R²"
import numpy as np
from scipy import stats


def regressao_simples(x, y):
    if np.std(x) == 0:
        raise ValueError("todos os x são iguais: a inclinação não é definida")
    res = stats.linregress(x, y)
    return {"a": float(res.intercept), "b": float(res.slope), "r2": float(res.rvalue)}


def prever(modelo, x_novo, x_min, x_max):
    valor = modelo["a"] + modelo["b"] * x_novo
    extrapolou = x_novo < x_min or x_novo > x_max
    return float(valor), extrapolou
```
```python name="intercepto e inclinação trocados"
import numpy as np
from scipy import stats


def regressao_simples(x, y):
    if np.std(x) == 0:
        raise ValueError("todos os x são iguais: a inclinação não é definida")
    res = stats.linregress(x, y)
    return {"a": float(res.slope), "b": float(res.intercept), "r2": float(res.rvalue ** 2)}


def prever(modelo, x_novo, x_min, x_max):
    valor = modelo["a"] + modelo["b"] * x_novo
    extrapolou = x_novo < x_min or x_novo > x_max
    return float(valor), extrapolou
```
```python name="regride x em y"
import numpy as np
from scipy import stats


def regressao_simples(x, y):
    if np.std(x) == 0:
        raise ValueError("todos os x são iguais: a inclinação não é definida")
    res = stats.linregress(y, x)
    return {"a": float(res.intercept), "b": float(res.slope), "r2": float(res.rvalue ** 2)}


def prever(modelo, x_novo, x_min, x_max):
    valor = modelo["a"] + modelo["b"] * x_novo
    extrapolou = x_novo < x_min or x_novo > x_max
    return float(valor), extrapolou
```
```python name="limite tratado como extrapolação"
import numpy as np
from scipy import stats


def regressao_simples(x, y):
    if np.std(x) == 0:
        raise ValueError("todos os x são iguais: a inclinação não é definida")
    res = stats.linregress(x, y)
    return {"a": float(res.intercept), "b": float(res.slope), "r2": float(res.rvalue ** 2)}


def prever(modelo, x_novo, x_min, x_max):
    valor = modelo["a"] + modelo["b"] * x_novo
    extrapolou = x_novo <= x_min or x_novo >= x_max
    return float(valor), extrapolou
```
```python name="só confere o lado de cima"
import numpy as np
from scipy import stats


def regressao_simples(x, y):
    if np.std(x) == 0:
        raise ValueError("todos os x são iguais: a inclinação não é definida")
    res = stats.linregress(x, y)
    return {"a": float(res.intercept), "b": float(res.slope), "r2": float(res.rvalue ** 2)}


def prever(modelo, x_novo, x_min, x_max):
    valor = modelo["a"] + modelo["b"] * x_novo
    extrapolou = x_novo > x_max
    return float(valor), extrapolou
```
```python name="previsão sem o intercepto"
import numpy as np
from scipy import stats


def regressao_simples(x, y):
    if np.std(x) == 0:
        raise ValueError("todos os x são iguais: a inclinação não é definida")
    res = stats.linregress(x, y)
    return {"a": float(res.intercept), "b": float(res.slope), "r2": float(res.rvalue ** 2)}


def prever(modelo, x_novo, x_min, x_max):
    valor = modelo["b"] * x_novo
    extrapolou = x_novo < x_min or x_novo > x_max
    return float(valor), extrapolou
```
```python name="devolve números do numpy"
import numpy as np
from scipy import stats


def regressao_simples(x, y):
    if np.std(x) == 0:
        raise ValueError("todos os x são iguais: a inclinação não é definida")
    res = stats.linregress(x, y)
    return {"a": res.intercept, "b": res.slope, "r2": res.rvalue ** 2}


def prever(modelo, x_novo, x_min, x_max):
    valor = modelo["a"] + modelo["b"] * x_novo
    extrapolou = x_novo < x_min or x_novo > x_max
    return float(valor), extrapolou
```
```python name="confia no linregress para recusar x constante"
import numpy as np
from scipy import stats


def regressao_simples(x, y):
    res = stats.linregress(x, y)
    return {"a": float(res.intercept), "b": float(res.slope), "r2": float(res.rvalue ** 2)}


def prever(modelo, x_novo, x_min, x_max):
    valor = modelo["a"] + modelo["b"] * x_novo
    extrapolou = x_novo < x_min or x_novo > x_max
    return float(valor), extrapolou
```

## Passo 6 · Leitura · Resíduos e causalidade

Depois de ajustar a reta, olhe para o que ela **não** explicou. Os resíduos $e_i = y_i - \hat y_i$ de um bom modelo parecem ruído: espalhados em torno de zero, sem forma, com a mesma largura em todo o eixo $x$. Três padrões avisam que o modelo está errado:

- **Curva** (resíduos positivos nas pontas e negativos no meio, ou o contrário): a relação não é linear, como no conjunto II de Anscombe.
- **Funil** (resíduos que se abrem à medida que $x$ cresce): a variação não é constante, e intervalos calculados como se fosse saem errados.
- **Um ponto isolado** com resíduo enorme, ou que sozinho define a inclinação, como no conjunto IV.

Uma forma de medir a curvatura com um número: correlacionar os resíduos com $(x - \bar x)^2$, que é grande nas pontas e pequeno no meio. Os resíduos de mínimos quadrados já têm correlação zero com $x$ por construção; com $(x - \bar x)^2$ eles só se correlacionam se sobrou uma curva:

```python
b, a = np.polyfit(x, y, 1)                      # o numpy devolve a inclinação primeiro
residuos = y - (a + b * x)
np.corrcoef(residuos, (x - x.mean()) ** 2)[0, 1]  # perto de 1 ou -1: curva
```

Mesmo com resíduos perfeitos, a regressão mede **associação**, não causa. Na sorveteria fictícia, as vendas de picolé e os atendimentos de salva-vidas sobem juntos; nenhum causa o outro: os dois dependem do calor, uma **variável de confusão**. Em outra cidade fictícia, bairros com mais bombeiros têm mais incêndios; os bombeiros não causam incêndios, foram alocados onde eles acontecem: **causalidade reversa**. E com dezenas de variáveis, algumas correlações aparecem por puro acaso.

Para afirmar causa, o caminho mais sólido é o **experimento aleatorizado**: sortear quem recebe o tratamento quebra a ligação com as variáveis de confusão. Sem experimento, controlar as confusões conhecidas ajuda, e é o assunto da regressão múltipla na próxima lição; mas uma confusão não medida continua lá. O texto honesto diz "está associado a", e não "faz aumentar".

## Passo 7 · Exercício · Curvatura nos resíduos

Calcule os resíduos de uma reta de mínimos quadrados e meça se sobrou curvatura neles.

### Instruções
1. `residuos(x, y)` devolve um `ndarray` com $y_i - (a + b x_i)$, em que $a$ e $b$ são os da reta de mínimos quadrados de $y$ em $x$. A entrada não muda.
2. `curvatura(x, y)` devolve, como `float`, a correlação de Pearson entre os resíduos e $(x - \bar x)^2$.
3. Se os resíduos forem todos (praticamente) zero, como num ajuste perfeito, `curvatura` devolve `0.0` em vez de `nan` (use `np.allclose(res, 0)`).

### Código inicial
```python
import numpy as np


def residuos(x, y):
    pass


def curvatura(x, y):
    pass
```

### Solução
```python
import numpy as np


def residuos(x, y):
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    b, a = np.polyfit(x, y, 1)
    return y - (a + b * x)


def curvatura(x, y):
    x = np.asarray(x, dtype=float)
    res = residuos(x, y)
    if np.allclose(res, 0):
        return 0.0
    return float(np.corrcoef(res, (x - x.mean()) ** 2)[0, 1])
```

### Dicas
1. O `np.polyfit(x, y, 1)` devolve primeiro a inclinação e depois o intercepto; o `stats.linregress` também serve.
2. O resíduo é o observado menos o previsto, nessa ordem.
3. Centre o $x$ na média antes de elevar ao quadrado.

### Verificação
```json
[
  { "id": "tipo", "checkpoint": 1, "kind": "expr", "expr": "residuos([0, 1, 2, 3], [1, 3, 2, 5])", "type": "ndarray",
    "name": "residuos devolve um ndarray" },
  { "id": "valores", "checkpoint": 1, "kind": "expr", "expr": "residuos([0, 1, 2, 3], [1, 3, 2, 5]).tolist()",
    "expected": [-0.10000000000000031, 0.7999999999999994, -1.3000000000000007, 0.5999999999999988], "tolerance": 1e-9, "name": "Resíduos de quatro pontos",
    "hint": "Resíduo é o y observado menos o y da reta." },
  { "id": "propriedades", "checkpoint": 1, "kind": "expr",
    "setup": "rng = np.random.default_rng(3)\nx = rng.uniform(0, 10, 50)\ny = 2 + 0.5 * x + rng.normal(0, 1, 50)\nr = residuos(x, y)",
    "expr": "[bool(abs(r.sum()) < 1e-8), bool(abs((r * x).sum()) < 1e-7)]", "expected": [true, true],
    "name": "Os resíduos somam zero e não têm correlação com x",
    "hint": "Use a reta de mínimos quadrados, com intercepto." },
  { "id": "entrada-intacta", "checkpoint": 1, "kind": "expr",
    "setup": "x = np.array([0.0, 1.0, 2.0, 3.0])\ny = np.array([1.0, 3.0, 2.0, 5.0])\nr = residuos(x, y)",
    "expr": "[x.tolist(), y.tolist()]", "expected": [[0.0, 1.0, 2.0, 3.0], [1.0, 3.0, 2.0, 5.0]], "name": "As entradas não mudam" },
  { "id": "parabola", "checkpoint": 2, "kind": "call", "function": "curvatura", "args": [[-3, -2, -1, 0, 1, 2, 3], [9, 4, 1, 0, 1, 4, 9]],
    "expected": 1.0, "type": "float", "tolerance": 1e-9, "name": "Parábola simétrica: curvatura 1" },
  { "id": "parabola-invertida", "checkpoint": 2, "kind": "call", "function": "curvatura",
    "args": [[-3, -2, -1, 0, 1, 2, 3], [-9, -4, -1, 0, -1, -4, -9]], "expected": -1.0, "tolerance": 1e-9,
    "name": "Parábola para baixo: curvatura -1", "hint": "O resíduo é observado menos previsto, não o contrário." },
  { "id": "parabola-deslocada", "checkpoint": 2, "kind": "call", "function": "curvatura",
    "args": [[1, 2, 3, 4, 5, 6, 7, 8], [1, 4, 9, 16, 25, 36, 49, 64]], "expected": 1.0, "tolerance": 1e-9,
    "name": "Parábola com x de 1 a 8: o x precisa ser centrado", "hint": "Use (x - média de x)², não x²." },
  { "id": "anscombe-ii", "checkpoint": 2, "kind": "call", "function": "curvatura",
    "args": [[10, 8, 13, 9, 11, 14, 6, 4, 12, 7, 5], [9.14, 8.14, 8.74, 8.77, 9.26, 8.10, 6.13, 3.10, 9.13, 7.26, 4.74]],
    "expected": -0.9999991878208866, "tolerance": 1e-9, "name": "O conjunto II de Anscombe tem curvatura forte" },
  { "id": "reta-exata", "checkpoint": 3, "kind": "call", "function": "curvatura", "args": [[1, 2, 3, 4], [3, 5, 7, 9]],
    "expected": 0.0, "type": "float", "tolerance": 1e-12, "name": "Ajuste perfeito: curvatura 0 em vez de nan" }
]
```

### Soluções erradas
```python name="resíduo com o sinal trocado"
import numpy as np


def residuos(x, y):
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    b, a = np.polyfit(x, y, 1)
    return (a + b * x) - y


def curvatura(x, y):
    x = np.asarray(x, dtype=float)
    res = residuos(x, y)
    if np.allclose(res, 0):
        return 0.0
    return float(np.corrcoef(res, (x - x.mean()) ** 2)[0, 1])
```
```python name="coeficientes do polyfit trocados"
import numpy as np


def residuos(x, y):
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    a, b = np.polyfit(x, y, 1)
    return y - (a + b * x)


def curvatura(x, y):
    x = np.asarray(x, dtype=float)
    res = residuos(x, y)
    if np.allclose(res, 0):
        return 0.0
    return float(np.corrcoef(res, (x - x.mean()) ** 2)[0, 1])
```
```python name="inclinação com ddof misturado"
import numpy as np


def residuos(x, y):
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    b = np.cov(x, y)[0, 1] / np.var(x)
    a = y.mean() - b * x.mean()
    return y - (a + b * x)


def curvatura(x, y):
    x = np.asarray(x, dtype=float)
    res = residuos(x, y)
    if np.allclose(res, 0):
        return 0.0
    return float(np.corrcoef(res, (x - x.mean()) ** 2)[0, 1])
```
```python name="correlaciona com x"
import numpy as np


def residuos(x, y):
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    b, a = np.polyfit(x, y, 1)
    return y - (a + b * x)


def curvatura(x, y):
    x = np.asarray(x, dtype=float)
    res = residuos(x, y)
    if np.allclose(res, 0):
        return 0.0
    return float(np.corrcoef(res, x)[0, 1])
```
```python name="x ao quadrado sem centrar"
import numpy as np


def residuos(x, y):
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    b, a = np.polyfit(x, y, 1)
    return y - (a + b * x)


def curvatura(x, y):
    x = np.asarray(x, dtype=float)
    res = residuos(x, y)
    if np.allclose(res, 0):
        return 0.0
    return float(np.corrcoef(res, x ** 2)[0, 1])
```
```python name="não trata o ajuste perfeito"
import numpy as np


def residuos(x, y):
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    b, a = np.polyfit(x, y, 1)
    return y - (a + b * x)


def curvatura(x, y):
    x = np.asarray(x, dtype=float)
    res = residuos(x, y)
    return float(np.corrcoef(res, (x - x.mean()) ** 2)[0, 1])
```

## Passo 8 · Quiz · Correlação não é causa

### Pergunta
Num levantamento fictício com 300 cidades, o número de farmácias por cidade tem correlação de 0,85 com o número de casos de gripe registrados. Um vereador propõe limitar a abertura de farmácias para reduzir a gripe. Qual é a melhor crítica?
- [ ] Nenhuma: com $r = 0{,}85$ e 300 cidades, a relação é forte e confiável
- [x] O tamanho da população é uma variável de confusão provável: cidades maiores têm mais farmácias e mais casos. Compare taxas por habitante, ou controle a população, antes de falar em causa
- [ ] O certo é usar o Spearman, que mostraria que a relação não existe
- [ ] Uma correlação de 0,85 prova a causa, mas no sentido contrário: a gripe causa farmácias
> Uma correlação forte entre contagens de cidades costuma vir do tamanho delas. Isso não prova causa em nenhum sentido; a causalidade reversa (farmácias abrindo onde há mais doentes) é só outra hipótese a examinar. Trocar Pearson por Spearman muda a medida de associação, não a pergunta causal, e $n$ grande só torna a associação mais certa, não causal.

### Pergunta
Um modelo fictício de vendas por temperatura tem $R^2 = 0{,}64$. Qual frase interpreta corretamente o número?
- [ ] O modelo acerta 64 % das previsões
- [ ] Cada grau a mais aumenta as vendas em 64 %
- [x] 64 % da variância das vendas acompanha a variação da temperatura pela reta; o resto fica nos resíduos
- [ ] A correlação entre temperatura e vendas é 0,64
> $R^2$ é a fração da variância de $y$ explicada pelo modelo, não uma taxa de acerto, e a inclinação é que diz quanto as vendas mudam por grau. Na regressão simples $R^2 = r^2$, então a correlação é $\sqrt{0{,}64} = 0{,}8$ (com o sinal da inclinação), e não 0,64.

### Pergunta
Uma papelaria fictícia ajustou a demanda por cadernos em função do preço com preços observados de R\$ 8 a R\$ 15: $\hat y = 400 - 18x$. O gerente quer prever a demanda a R\$ 25. O que você diz?
- [ ] A previsão é $400 - 18 \cdot 25 = -50$ cadernos, e ele deve aceitar o número
- [ ] Como o $R^2$ do modelo é alto, a previsão a R\$ 25 é tão confiável quanto dentro da faixa
- [x] R\$ 25 está fora da faixa observada: é extrapolação. A previsão negativa mostra que a reta não vale lá, e o modelo não diz nada sobre esse preço
- [ ] Basta trocar a regressão por uma de Spearman para poder extrapolar
> A reta foi ajustada só entre R\$ 8 e R\$ 15; fora disso, nada garante a linearidade, e uma demanda negativa é impossível. O $R^2$ mede o ajuste **dentro** dos dados, não fora deles. Spearman é uma medida de associação, não um modelo de previsão.
