---
slug: n4-m6-03-estatistica-descritiva
titulo: Estatística descritiva
descricao: Média, mediana, moda, desvio padrão, quantis, assimetria, resumo de cinco números e a escolha da medida certa para dados assimétricos.
dificuldade: intermediario
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- pandas
xp: 100
tempo_min: 40
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Calcular e interpretar medidas de posição e dispersão com numpy e pandas
- Escolher entre média e mediana (e entre desvio e IQR) conforme a assimetria
- Resumir um conjunto de dados em uma tabela e um parágrafo de interpretação
---

## Passo 1 · Leitura · Centro e dispersão

Uma cidade fictícia quer descrever a renda mensal das suas famílias. A amostra de 1 000 famílias abaixo foi gerada com um gerador de números aleatórios, num formato parecido com o de rendas reais, que costumam ter muitos valores modestos e poucos muito altos:

```python
rng = np.random.default_rng(3)
renda = pd.Series(rng.lognormal(mean=8, sigma=0.7, size=1000)).round(2)
renda.mean()        # 3912.2
renda.median()      # 3060.53
```

A **média** soma tudo e divide por $n$; a **mediana** é o valor do meio depois de ordenar. Aqui a média fica quase R\$ 900 acima da mediana, porque as poucas rendas altas puxam a soma. Metade das famílias ganha menos de R\$ 3 060,53, e a média não diz isso.

Centro sozinho não basta: duas cidades com a mesma mediana podem ser muito diferentes. A **dispersão** mede o quanto os valores se espalham. O **desvio padrão amostral** é a raiz da média dos desvios ao quadrado, dividindo por $n - 1$; os **quartis** $Q_1$ e $Q_3$ deixam 25 % e 75 % dos dados abaixo, e o **intervalo interquartil** é a distância entre eles. O **coeficiente de variação** compara dispersões de grandezas com escalas diferentes:

$$
s = \sqrt{\frac{1}{n - 1} \sum_{i=1}^{n} (x_i - \bar x)^2}, \qquad \text{IQR} = Q_3 - Q_1, \qquad \text{CV} = \frac{s}{\bar x}
$$

Por que $n - 1$? Os desvios são medidos em relação a $\bar x$, que foi calculada com a própria amostra e por isso fica sempre no meio dela. A soma dos quadrados sai menor do que seria em relação à média verdadeira da população, e dividir por $n - 1$ compensa. Esse número é o **ddof** (*delta degrees of freedom*): o denominador é $n - \text{ddof}$.

O detalhe que confunde: `np.std` e `np.var` usam `ddof=0` por padrão (desvio **populacional**, dividindo por $n$), enquanto `Series.std` e `Series.var` do pandas usam `ddof=1` (**amostral**). O mesmo dado dá dois números diferentes conforme a biblioteca. Quando os dados são uma amostra e você quer estimar a dispersão da população, use `ddof=1`; com `ddof=0`, a estimativa fica sistematicamente baixa, e mais baixa quanto menor a amostra.

Os quartis do pandas (`quantile(0.25)`) interpolam entre os dois valores vizinhos quando a posição cai entre eles, e recebem uma fração entre 0 e 1. Passar a porcentagem dá erro:

```text
ValueError: percentiles should all be in the interval [0, 1]
```

## Passo 2 · Previsão · ddof=0 e ddof=1

O programa calcula o centro e o desvio da mesma lista com numpy e com pandas. Digite a saída.

### Código
```python
import numpy as np
import pandas as pd

x = [2, 4, 4, 4, 5, 5, 7, 9]
print(np.mean(x), np.median(x))
print(np.std(x), np.var(x))
print(round(float(pd.Series(x).var()), 3), round(float(pd.Series(x).std()), 3))
print(round(float(np.std(x, ddof=1)), 3))
```

### Dicas
1. A soma dos quadrados dos desvios em relação à média 5 é 32.
2. Com `ddof=0` divide-se por 8; com `ddof=1`, por 7. $32/7 \approx 4{,}571$ e $\sqrt{32/7} \approx 2{,}138$.
3. Qual das duas bibliotecas usa `ddof=1` por padrão?

### Saída esperada
```text
5.0 4.5
2.0 4.0
4.571 2.138
2.138
```

## Passo 3 · Exercício · Resumo descritivo
modo: lacunas

Complete as lacunas (`___`) para montar o resumo de uma lista de números, ignorando os valores ausentes.

### Instruções
1. Descarte os ausentes (`None` ou `nan`) antes de qualquer conta; com menos de 2 valores restantes, `resumo_descritivo(valores)` levanta `ValueError`.
2. O dicionário devolvido tem as chaves `n` (`int`), `media`, `mediana` e `desvio` (amostral, `ddof=1`), todas `float` menos `n`.
3. Tem também `q1`, `q3` (quartis do pandas), `iqr` ($Q_3 - Q_1$) e `cv` (desvio dividido pela média), todos `float`.

### Código inicial
```python
import pandas as pd


def resumo_descritivo(valores):
    s = pd.Series(valores, dtype=float).___()
    if len(s) < 2:
        raise ValueError("são necessários pelo menos 2 valores")
    media = float(s.mean())
    desvio = float(s.std(ddof=___))
    q1 = float(s.quantile(___))
    q3 = float(s.quantile(___))
    return {
        "n": len(s),
        "media": media,
        "mediana": float(s.___()),
        "desvio": desvio,
        "q1": q1,
        "q3": q3,
        "iqr": ___,
        "cv": ___,
    }
```

### Solução
```python
import pandas as pd


def resumo_descritivo(valores):
    s = pd.Series(valores, dtype=float).dropna()
    if len(s) < 2:
        raise ValueError("são necessários pelo menos 2 valores")
    media = float(s.mean())
    desvio = float(s.std(ddof=1))
    q1 = float(s.quantile(0.25))
    q3 = float(s.quantile(0.75))
    return {
        "n": len(s),
        "media": media,
        "mediana": float(s.median()),
        "desvio": desvio,
        "q1": q1,
        "q3": q3,
        "iqr": q3 - q1,
        "cv": desvio / media,
    }
```

### Dicas
1. Um ausente não é zero: ele sai da conta, e o `n` conta só os valores presentes.
2. O `quantile` do pandas recebe uma fração entre 0 e 1.
3. O IQR usa os quartis, não o menor e o maior valor.

### Verificação
```json
[
  { "id": "chaves", "checkpoint": 2, "kind": "expr", "expr": "sorted(resumo_descritivo([2, 4, 4, 4, 5, 5, 7, 9]))",
    "expected": ["cv", "desvio", "iqr", "media", "mediana", "n", "q1", "q3"], "name": "O dicionário tem as oito chaves pedidas" },
  { "id": "centro", "checkpoint": 2, "kind": "expr", "setup": "r = resumo_descritivo([2, 4, 4, 4, 5, 5, 7, 9])",
    "expr": "[r['n'], r['media'], r['mediana']]", "expected": [8, 5.0, 4.5], "tolerance": 1e-9,
    "name": "n, média e mediana de [2, 4, 4, 4, 5, 5, 7, 9]", "hint": "A mediana é o valor do meio, não a média." },
  { "id": "desvio", "checkpoint": 2, "kind": "expr", "expr": "resumo_descritivo([2, 4, 4, 4, 5, 5, 7, 9])['desvio']",
    "expected": 2.138089935299395, "type": "float", "tolerance": 1e-9, "name": "O desvio é o amostral, dividindo por n - 1",
    "hint": "Com ddof=0 o resultado seria 2.0; os dados são uma amostra." },
  { "id": "quartis", "checkpoint": 3, "kind": "expr", "setup": "r = resumo_descritivo([2, 4, 4, 4, 5, 5, 7, 9])",
    "expr": "[r['q1'], r['q3'], r['iqr']]", "expected": [4.0, 5.5, 1.5], "tolerance": 1e-9,
    "name": "Quartis e IQR de [2, 4, 4, 4, 5, 5, 7, 9]" },
  { "id": "cv", "checkpoint": 3, "kind": "expr", "expr": "resumo_descritivo([2, 4, 4, 4, 5, 5, 7, 9])['cv']",
    "expected": 0.427617987059879, "tolerance": 1e-9, "name": "O CV é o desvio dividido pela média" },
  { "id": "renda", "checkpoint": 3, "kind": "expr",
    "setup": "r = resumo_descritivo([1200, 1500, 1800, 2100, 2500, 3000, 15000])",
    "expr": "[r['media'], r['mediana'], r['iqr'], r['desvio']]",
    "expected": [3871.4285714285716, 2100.0, 1100.0, 4944.260742084127], "tolerance": 1e-6,
    "name": "Com uma renda muito alta, a média se afasta da mediana e o IQR continua pequeno",
    "hint": "O IQR usa os quartis; o maior valor não entra." },
  { "id": "dois", "checkpoint": 3, "kind": "expr", "setup": "r = resumo_descritivo([3, 5])",
    "expr": "[r['n'], r['desvio'], r['q1'], r['q3']]", "expected": [2, 1.4142135623730951, 3.5, 4.5], "tolerance": 1e-9,
    "name": "Com dois valores, os quartis interpolam entre eles" },
  { "id": "iguais", "checkpoint": 3, "kind": "expr", "setup": "r = resumo_descritivo([7, 7, 7])",
    "expr": "[r['desvio'], r['iqr'], r['cv']]", "expected": [0.0, 0.0, 0.0], "tolerance": 1e-12,
    "name": "Valores todos iguais têm desvio, IQR e CV zero" },
  { "id": "ausentes", "checkpoint": 1, "kind": "expr", "setup": "r = resumo_descritivo([10, None, 20, 30, float('nan')])",
    "expr": "[r['n'], r['media'], r['desvio']]", "expected": [3, 20.0, 10.0], "tolerance": 1e-9,
    "name": "Ausentes saem da conta e não entram no n", "hint": "Um ausente não é uma leitura de valor zero." },
  { "id": "poucos", "checkpoint": 1, "kind": "expr", "expr": "resumo_descritivo([4, None])", "raises": "ValueError",
    "name": "Com um só valor presente, levanta ValueError" }
]
```

### Soluções erradas
```python name="ausente vira zero"
import pandas as pd


def resumo_descritivo(valores):
    s = pd.Series(valores, dtype=float).fillna(0)
    if len(s) < 2:
        raise ValueError("são necessários pelo menos 2 valores")
    media = float(s.mean())
    desvio = float(s.std(ddof=1))
    q1 = float(s.quantile(0.25))
    q3 = float(s.quantile(0.75))
    return {
        "n": len(s),
        "media": media,
        "mediana": float(s.median()),
        "desvio": desvio,
        "q1": q1,
        "q3": q3,
        "iqr": q3 - q1,
        "cv": desvio / media,
    }
```
```python name="desvio populacional (ddof=0)"
import pandas as pd


def resumo_descritivo(valores):
    s = pd.Series(valores, dtype=float).dropna()
    if len(s) < 2:
        raise ValueError("são necessários pelo menos 2 valores")
    media = float(s.mean())
    desvio = float(s.std(ddof=0))
    q1 = float(s.quantile(0.25))
    q3 = float(s.quantile(0.75))
    return {
        "n": len(s),
        "media": media,
        "mediana": float(s.median()),
        "desvio": desvio,
        "q1": q1,
        "q3": q3,
        "iqr": q3 - q1,
        "cv": desvio / media,
    }
```
```python name="quantil em porcentagem"
import pandas as pd


def resumo_descritivo(valores):
    s = pd.Series(valores, dtype=float).dropna()
    if len(s) < 2:
        raise ValueError("são necessários pelo menos 2 valores")
    media = float(s.mean())
    desvio = float(s.std(ddof=1))
    q1 = float(s.quantile(25))
    q3 = float(s.quantile(75))
    return {
        "n": len(s),
        "media": media,
        "mediana": float(s.median()),
        "desvio": desvio,
        "q1": q1,
        "q3": q3,
        "iqr": q3 - q1,
        "cv": desvio / media,
    }
```
```python name="média no lugar da mediana"
import pandas as pd


def resumo_descritivo(valores):
    s = pd.Series(valores, dtype=float).dropna()
    if len(s) < 2:
        raise ValueError("são necessários pelo menos 2 valores")
    media = float(s.mean())
    desvio = float(s.std(ddof=1))
    q1 = float(s.quantile(0.25))
    q3 = float(s.quantile(0.75))
    return {
        "n": len(s),
        "media": media,
        "mediana": float(s.mean()),
        "desvio": desvio,
        "q1": q1,
        "q3": q3,
        "iqr": q3 - q1,
        "cv": desvio / media,
    }
```
```python name="amplitude no lugar do IQR"
import pandas as pd


def resumo_descritivo(valores):
    s = pd.Series(valores, dtype=float).dropna()
    if len(s) < 2:
        raise ValueError("são necessários pelo menos 2 valores")
    media = float(s.mean())
    desvio = float(s.std(ddof=1))
    q1 = float(s.quantile(0.25))
    q3 = float(s.quantile(0.75))
    return {
        "n": len(s),
        "media": media,
        "mediana": float(s.median()),
        "desvio": desvio,
        "q1": q1,
        "q3": q3,
        "iqr": float(s.max() - s.min()),
        "cv": desvio / media,
    }
```
```python name="CV invertido"
import pandas as pd


def resumo_descritivo(valores):
    s = pd.Series(valores, dtype=float).dropna()
    if len(s) < 2:
        raise ValueError("são necessários pelo menos 2 valores")
    media = float(s.mean())
    desvio = float(s.std(ddof=1))
    q1 = float(s.quantile(0.25))
    q3 = float(s.quantile(0.75))
    return {
        "n": len(s),
        "media": media,
        "mediana": float(s.median()),
        "desvio": desvio,
        "q1": q1,
        "q3": q3,
        "iqr": q3 - q1,
        "cv": media / desvio,
    }
```

## Passo 4 · Leitura · Assimetria e a escolha da medida

Na renda da cidade fictícia, a média ficou acima da mediana. Esse é o sinal de uma distribuição **assimétrica à direita**: uma cauda longa de valores altos. Quando a cauda está à esquerda (notas numa prova fácil, com poucos alunos muito abaixo), a média fica abaixo da mediana. Numa distribuição simétrica, as duas coincidem.

O **coeficiente de assimetria** mede isso com um número: positivo para cauda à direita, negativo à esquerda, perto de zero quando simétrico. A versão básica é a média dos desvios ao cubo, dividida pelo desvio ao cubo:

$$
g_1 = \frac{\frac{1}{n}\sum (x_i - \bar x)^3}{\left(\frac{1}{n}\sum (x_i - \bar x)^2\right)^{3/2}}
$$

O `Series.skew()` do pandas aplica a essa fórmula uma correção para amostras pequenas, e é a versão usada nesta lição. Com menos de 3 valores ela não é definida e devolve `nan`. Na renda gerada, `renda.skew()` dá 2,72: muito assimétrica.

```python
renda.describe()                         # n, média, desvio, mínimo, quartis, máximo
renda.quantile([0, 0.25, 0.5, 0.75, 1])  # o resumo de cinco números
renda.skew()                             # 2.72
```

O **resumo de cinco números** (mínimo, $Q_1$, mediana, $Q_3$, máximo) é o que o **boxplot** desenha: a caixa vai de $Q_1$ a $Q_3$, a linha no meio é a mediana, e as hastes vão até o último valor a menos de $1{,}5\,\text{IQR}$ da caixa (a regra da m3-03); os pontos além delas aparecem soltos.

A escolha da medida segue a forma dos dados. Em dados simétricos e sem valores extremos, média e desvio padrão funcionam bem e se combinam com o resto da estatística (intervalos, testes). Em dados assimétricos, mediana e IQR descrevem melhor o "típico" e o espalhamento, porque um único valor extremo não as move. Uma regra prática, usada no próximo exercício, é recomendar a mediana quando $|g_1|$ passa de um limiar como 1.

A média ainda tem um papel em dados assimétricos: quando o **total** importa. Se a prefeitura quer saber quanto a cidade arrecadaria com um imposto de 1 % sobre a renda, é a média que responde, porque média vezes $n$ é a soma. A pergunta escolhe a medida, e um bom resumo costuma trazer as duas. A **média ponderada** é a média em que cada valor pesa diferente, $\sum w_i x_i / \sum w_i$, como a nota final de provas com pesos diferentes.

## Passo 5 · Exercício · Qual medida usar

Escreva uma recomendação automática de medida de centro e uma média ponderada com as conferências de entrada.

### Instruções
1. `medida_central_recomendada(valores, limiar=1.0)` calcula a assimetria com `Series.skew()` do pandas e devolve `"mediana"` quando o **valor absoluto** dela passa de `limiar`; senão, `"media"`.
2. Com menos de 3 valores a assimetria é `nan`, e a função devolve `"media"`.
3. `media_ponderada(valores, pesos)` devolve, como `float`, $\sum w_i x_i / \sum w_i$.
4. `media_ponderada` levanta `ValueError` se as duas listas tiverem tamanhos diferentes, se algum peso for negativo ou se a soma dos pesos for zero.

### Código inicial
```python
import numpy as np
import pandas as pd


def medida_central_recomendada(valores, limiar=1.0):
    pass


def media_ponderada(valores, pesos):
    pass
```

### Solução
```python
import numpy as np
import pandas as pd


def medida_central_recomendada(valores, limiar=1.0):
    assimetria = pd.Series(valores, dtype=float).skew()
    if abs(assimetria) > limiar:
        return "mediana"
    return "media"


def media_ponderada(valores, pesos):
    v = np.asarray(valores, dtype=float)
    w = np.asarray(pesos, dtype=float)
    if v.shape != w.shape:
        raise ValueError("valores e pesos precisam ter o mesmo tamanho")
    if (w < 0).any() or w.sum() == 0:
        raise ValueError("os pesos precisam ser não negativos e ter soma positiva")
    return float(np.sum(v * w) / np.sum(w))
```

### Dicas
1. Uma cauda longa à esquerda dá assimetria negativa, e ela também afasta a média do centro.
2. Qualquer comparação com `nan` dá `False`: escreva o teste de forma que esse caso caia em `"media"`.
3. Arrays de tamanhos diferentes às vezes se combinam pelo broadcasting sem erro; confira os tamanhos antes.

### Verificação
```json
[
  { "id": "simetrica", "checkpoint": 1, "kind": "call", "function": "medida_central_recomendada", "args": [[1, 2, 3, 4, 5]],
    "expected": "media", "type": "str", "name": "Dados simétricos: média" },
  { "id": "cauda-direita", "checkpoint": 1, "kind": "call", "function": "medida_central_recomendada",
    "args": [[1200, 1500, 1800, 2100, 2500, 3000, 15000]], "expected": "mediana",
    "name": "Uma renda muito alta (assimetria 2,56): mediana" },
  { "id": "cauda-esquerda", "checkpoint": 1, "kind": "call", "function": "medida_central_recomendada",
    "args": [[1, 9, 9.5, 10, 10, 10]], "expected": "mediana", "name": "Uma nota muito baixa (assimetria -2,38): mediana",
    "hint": "Assimetria negativa também conta: compare o valor absoluto." },
  { "id": "limiar-padrao", "checkpoint": 1, "kind": "call", "function": "medida_central_recomendada",
    "args": [[1, 2, 3, 4, 5, 6, 7, 8, 9, 14]], "expected": "media", "name": "Assimetria 0,89 com o limiar padrão 1: média" },
  { "id": "limiar-menor", "checkpoint": 1, "kind": "call", "function": "medida_central_recomendada",
    "args": [[1, 2, 3, 4, 5, 6, 7, 8, 9, 14]], "kwargs": { "limiar": 0.5 }, "expected": "mediana",
    "name": "A mesma assimetria com limiar 0,5: mediana", "hint": "Use o limiar recebido." },
  { "id": "dois-valores", "checkpoint": 2, "kind": "call", "function": "medida_central_recomendada", "args": [[3, 8]],
    "expected": "media", "name": "Com dois valores a assimetria é nan: média",
    "hint": "abs(nan) > 1 e nan <= 1 são ambos False." },
  { "id": "pond-provas", "checkpoint": 3, "kind": "call", "function": "media_ponderada", "args": [[7, 9], [1, 3]],
    "expected": 8.5, "type": "float", "tolerance": 1e-12, "name": "Notas 7 e 9 com pesos 1 e 3: 8,5" },
  { "id": "pond-fracoes", "checkpoint": 3, "kind": "call", "function": "media_ponderada", "args": [[10, 20], [0.25, 0.75]],
    "expected": 17.5, "tolerance": 1e-12, "name": "Pesos 0,25 e 0,75" },
  { "id": "pond-iguais", "checkpoint": 3, "kind": "call", "function": "media_ponderada", "args": [[2, 4, 9], [5, 5, 5]],
    "expected": 5.0, "tolerance": 1e-12, "name": "Pesos iguais dão a média simples", "hint": "Divida pela soma dos pesos." },
  { "id": "pond-tamanhos", "checkpoint": 4, "kind": "expr", "expr": "media_ponderada([1, 2], [1])", "raises": "ValueError",
    "name": "Tamanhos diferentes são recusados" },
  { "id": "pond-negativo", "checkpoint": 4, "kind": "expr", "expr": "media_ponderada([1, 2], [2, -1])", "raises": "ValueError",
    "name": "Peso negativo é recusado" },
  { "id": "pond-zero", "checkpoint": 4, "kind": "expr", "expr": "media_ponderada([1, 2], [0, 0])", "raises": "ValueError",
    "name": "Pesos que somam zero são recusados", "hint": "O np.average levanta ZeroDivisionError, não ValueError." }
]
```

### Soluções erradas
```python name="sem valor absoluto"
import numpy as np
import pandas as pd


def medida_central_recomendada(valores, limiar=1.0):
    assimetria = pd.Series(valores, dtype=float).skew()
    if assimetria > limiar:
        return "mediana"
    return "media"


def media_ponderada(valores, pesos):
    v = np.asarray(valores, dtype=float)
    w = np.asarray(pesos, dtype=float)
    if v.shape != w.shape:
        raise ValueError("valores e pesos precisam ter o mesmo tamanho")
    if (w < 0).any() or w.sum() == 0:
        raise ValueError("os pesos precisam ser não negativos e ter soma positiva")
    return float(np.sum(v * w) / np.sum(w))
```
```python name="ignora o limiar recebido"
import numpy as np
import pandas as pd


def medida_central_recomendada(valores, limiar=1.0):
    assimetria = pd.Series(valores, dtype=float).skew()
    if abs(assimetria) > 1.0:
        return "mediana"
    return "media"


def media_ponderada(valores, pesos):
    v = np.asarray(valores, dtype=float)
    w = np.asarray(pesos, dtype=float)
    if v.shape != w.shape:
        raise ValueError("valores e pesos precisam ter o mesmo tamanho")
    if (w < 0).any() or w.sum() == 0:
        raise ValueError("os pesos precisam ser não negativos e ter soma positiva")
    return float(np.sum(v * w) / np.sum(w))
```
```python name="teste invertido trata nan como assimétrico"
import numpy as np
import pandas as pd


def medida_central_recomendada(valores, limiar=1.0):
    assimetria = pd.Series(valores, dtype=float).skew()
    if abs(assimetria) <= limiar:
        return "media"
    return "mediana"


def media_ponderada(valores, pesos):
    v = np.asarray(valores, dtype=float)
    w = np.asarray(pesos, dtype=float)
    if v.shape != w.shape:
        raise ValueError("valores e pesos precisam ter o mesmo tamanho")
    if (w < 0).any() or w.sum() == 0:
        raise ValueError("os pesos precisam ser não negativos e ter soma positiva")
    return float(np.sum(v * w) / np.sum(w))
```
```python name="ignora os pesos"
import numpy as np
import pandas as pd


def medida_central_recomendada(valores, limiar=1.0):
    assimetria = pd.Series(valores, dtype=float).skew()
    if abs(assimetria) > limiar:
        return "mediana"
    return "media"


def media_ponderada(valores, pesos):
    v = np.asarray(valores, dtype=float)
    w = np.asarray(pesos, dtype=float)
    if v.shape != w.shape:
        raise ValueError("valores e pesos precisam ter o mesmo tamanho")
    if (w < 0).any() or w.sum() == 0:
        raise ValueError("os pesos precisam ser não negativos e ter soma positiva")
    return float(np.mean(v))
```
```python name="divide pelo número de valores"
import numpy as np
import pandas as pd


def medida_central_recomendada(valores, limiar=1.0):
    assimetria = pd.Series(valores, dtype=float).skew()
    if abs(assimetria) > limiar:
        return "mediana"
    return "media"


def media_ponderada(valores, pesos):
    v = np.asarray(valores, dtype=float)
    w = np.asarray(pesos, dtype=float)
    if v.shape != w.shape:
        raise ValueError("valores e pesos precisam ter o mesmo tamanho")
    if (w < 0).any() or w.sum() == 0:
        raise ValueError("os pesos precisam ser não negativos e ter soma positiva")
    return float(np.sum(v * w) / len(v))
```
```python name="np.average sem conferir a soma"
import numpy as np
import pandas as pd


def medida_central_recomendada(valores, limiar=1.0):
    assimetria = pd.Series(valores, dtype=float).skew()
    if abs(assimetria) > limiar:
        return "mediana"
    return "media"


def media_ponderada(valores, pesos):
    v = np.asarray(valores, dtype=float)
    w = np.asarray(pesos, dtype=float)
    if v.shape != w.shape:
        raise ValueError("valores e pesos precisam ter o mesmo tamanho")
    if (w < 0).any():
        raise ValueError("os pesos precisam ser não negativos")
    return float(np.average(v, weights=w))
```
```python name="aceita peso negativo"
import numpy as np
import pandas as pd


def medida_central_recomendada(valores, limiar=1.0):
    assimetria = pd.Series(valores, dtype=float).skew()
    if abs(assimetria) > limiar:
        return "mediana"
    return "media"


def media_ponderada(valores, pesos):
    v = np.asarray(valores, dtype=float)
    w = np.asarray(pesos, dtype=float)
    if v.shape != w.shape:
        raise ValueError("valores e pesos precisam ter o mesmo tamanho")
    if w.sum() == 0:
        raise ValueError("os pesos precisam ter soma positiva")
    return float(np.sum(v * w) / np.sum(w))
```
```python name="não confere os tamanhos"
import numpy as np
import pandas as pd


def medida_central_recomendada(valores, limiar=1.0):
    assimetria = pd.Series(valores, dtype=float).skew()
    if abs(assimetria) > limiar:
        return "mediana"
    return "media"


def media_ponderada(valores, pesos):
    v = np.asarray(valores, dtype=float)
    w = np.asarray(pesos, dtype=float)
    if (w < 0).any() or w.sum() == 0:
        raise ValueError("os pesos precisam ser não negativos e ter soma positiva")
    return float(np.sum(v * w) / np.sum(w))
```

## Passo 6 · Exercício · Comparar grupos

Uma rede fictícia de lojas quer comparar o valor das compras (o tíquete) entre as filiais. Os dados têm compras atípicas e ausentes, então a comparação usa mediana e IQR.

### Instruções
1. `comparar_grupos(df, valor, grupo)` agrupa `df` pela coluna `grupo` e, para cada grupo, calcula `n` (quantos valores **presentes** de `valor` o grupo tem), `mediana` e `iqr` ($Q_3 - Q_1$ dos quartis do pandas).
2. Devolve um dicionário `{grupo: {"n": int, "mediana": float, "iqr": float}}`, com os grupos em ordem crescente, sem alterar `df`.

### Código inicial
```python
import pandas as pd


def comparar_grupos(df, valor, grupo):
    pass
```

### Solução
```python
import pandas as pd


def comparar_grupos(df, valor, grupo):
    g = df.groupby(grupo)[valor]
    tabela = pd.DataFrame({
        "n": g.count(),
        "mediana": g.median(),
        "iqr": g.quantile(0.75) - g.quantile(0.25),
    })
    return tabela.to_dict("index")
```

### Dicas
1. `count` conta só os valores presentes; `size` conta as linhas, com ausentes.
2. O `groupby` também tem `quantile`, calculado dentro de cada grupo.
3. Um `DataFrame` com uma linha por grupo vira o dicionário pedido com `to_dict("index")`.

### Verificação
```json
[
  { "id": "grupos", "checkpoint": 2, "kind": "expr",
    "setup": "df = pd.DataFrame({'loja': ['Norte', 'Centro', 'Sul', 'Centro', 'Norte', 'Centro', 'Norte', 'Sul', 'Centro', 'Norte'], 'ticket': [31.0, 52.0, 75.0, 48.0, None, 61.0, 29.0, 80.0, 250.0, 35.0]})\nr = comparar_grupos(df, 'ticket', 'loja')",
    "expr": "list(r)", "expected": ["Centro", "Norte", "Sul"], "name": "Um item por loja, em ordem crescente" },
  { "id": "n", "checkpoint": 1, "kind": "expr",
    "setup": "df = pd.DataFrame({'loja': ['Norte', 'Centro', 'Sul', 'Centro', 'Norte', 'Centro', 'Norte', 'Sul', 'Centro', 'Norte'], 'ticket': [31.0, 52.0, 75.0, 48.0, None, 61.0, 29.0, 80.0, 250.0, 35.0]})\nr = comparar_grupos(df, 'ticket', 'loja')",
    "expr": "[r['Centro']['n'], r['Norte']['n'], r['Sul']['n']]", "expected": [4, 3, 2],
    "name": "O n conta só os valores presentes", "hint": "A loja Norte tem 4 linhas, mas uma delas é ausente." },
  { "id": "tipos", "checkpoint": 2, "kind": "expr",
    "setup": "df = pd.DataFrame({'loja': ['Norte', 'Centro', 'Sul', 'Centro', 'Norte', 'Centro', 'Norte', 'Sul', 'Centro', 'Norte'], 'ticket': [31.0, 52.0, 75.0, 48.0, None, 61.0, 29.0, 80.0, 250.0, 35.0]})\nr = comparar_grupos(df, 'ticket', 'loja')",
    "expr": "[type(r['Sul'][k]).__name__ for k in ('n', 'mediana', 'iqr')]", "expected": ["int", "float", "float"],
    "name": "n é int; mediana e iqr são float" },
  { "id": "medianas", "checkpoint": 1, "kind": "expr",
    "setup": "df = pd.DataFrame({'loja': ['Norte', 'Centro', 'Sul', 'Centro', 'Norte', 'Centro', 'Norte', 'Sul', 'Centro', 'Norte'], 'ticket': [31.0, 52.0, 75.0, 48.0, None, 61.0, 29.0, 80.0, 250.0, 35.0]})\nr = comparar_grupos(df, 'ticket', 'loja')",
    "expr": "[r['Centro']['mediana'], r['Norte']['mediana'], r['Sul']['mediana']]", "expected": [56.5, 31.0, 77.5],
    "tolerance": 1e-9, "name": "Medianas por loja: a compra de 250 não puxa a do Centro",
    "hint": "A medida de centro pedida é a mediana." },
  { "id": "iqrs", "checkpoint": 1, "kind": "expr",
    "setup": "df = pd.DataFrame({'loja': ['Norte', 'Centro', 'Sul', 'Centro', 'Norte', 'Centro', 'Norte', 'Sul', 'Centro', 'Norte'], 'ticket': [31.0, 52.0, 75.0, 48.0, None, 61.0, 29.0, 80.0, 250.0, 35.0]})\nr = comparar_grupos(df, 'ticket', 'loja')",
    "expr": "[r['Centro']['iqr'], r['Norte']['iqr'], r['Sul']['iqr']]", "expected": [57.25, 3.0, 2.5], "tolerance": 1e-9,
    "name": "IQR dentro de cada loja", "hint": "Calcule os quartis dentro de cada grupo, não na coluna inteira." },
  { "id": "um-valor", "checkpoint": 1, "kind": "expr",
    "setup": "df = pd.DataFrame({'g': ['a', 'b', 'b'], 'v': [5.0, 1.0, 3.0]})\nr = comparar_grupos(df, 'v', 'g')",
    "expr": "r['a']", "expected": { "n": 1, "mediana": 5.0, "iqr": 0.0 }, "name": "Um grupo com um valor só tem IQR zero" },
  { "id": "outras-colunas", "checkpoint": 1, "kind": "expr",
    "setup": "df = pd.DataFrame({'filial': ['x', 'y', 'x', 'y'], 'preco': [10.0, 3.0, 20.0, 5.0], 'ticket': [0.0, 0.0, 0.0, 0.0]})\nr = comparar_grupos(df, 'preco', 'filial')",
    "expr": "[r['x']['mediana'], r['y']['mediana']]", "expected": [15.0, 4.0], "tolerance": 1e-9,
    "name": "Usa as colunas passadas como argumento", "hint": "Os nomes das colunas chegam em valor e grupo." },
  { "id": "entrada-intacta", "checkpoint": 2, "kind": "expr",
    "setup": "df = pd.DataFrame({'g': ['a', 'b', 'a'], 'v': [5.0, None, 3.0]})\ncopia = df.copy()\nr = comparar_grupos(df, 'v', 'g')",
    "expr": "df.equals(copia)", "expected": true, "name": "A tabela recebida não muda" }
]
```

### Soluções erradas
```python name="média no lugar da mediana"
import pandas as pd


def comparar_grupos(df, valor, grupo):
    g = df.groupby(grupo)[valor]
    tabela = pd.DataFrame({
        "n": g.count(),
        "mediana": g.mean(),
        "iqr": g.quantile(0.75) - g.quantile(0.25),
    })
    return tabela.to_dict("index")
```
```python name="desvio no lugar do IQR"
import pandas as pd


def comparar_grupos(df, valor, grupo):
    g = df.groupby(grupo)[valor]
    tabela = pd.DataFrame({
        "n": g.count(),
        "mediana": g.median(),
        "iqr": g.std(),
    })
    return tabela.to_dict("index")
```
```python name="size conta os ausentes"
import pandas as pd


def comparar_grupos(df, valor, grupo):
    g = df.groupby(grupo)[valor]
    tabela = pd.DataFrame({
        "n": g.size(),
        "mediana": g.median(),
        "iqr": g.quantile(0.75) - g.quantile(0.25),
    })
    return tabela.to_dict("index")
```
```python name="IQR da coluna inteira"
import pandas as pd


def comparar_grupos(df, valor, grupo):
    g = df.groupby(grupo)[valor]
    tabela = pd.DataFrame({
        "n": g.count(),
        "mediana": g.median(),
    })
    tabela["iqr"] = df[valor].quantile(0.75) - df[valor].quantile(0.25)
    return tabela.to_dict("index")
```
```python name="amplitude no lugar do IQR"
import pandas as pd


def comparar_grupos(df, valor, grupo):
    g = df.groupby(grupo)[valor]
    tabela = pd.DataFrame({
        "n": g.count(),
        "mediana": g.median(),
        "iqr": g.max() - g.min(),
    })
    return tabela.to_dict("index")
```
```python name="colunas do exemplo fixas"
import pandas as pd


def comparar_grupos(df, valor, grupo):
    g = df.groupby("loja")["ticket"]
    tabela = pd.DataFrame({
        "n": g.count(),
        "mediana": g.median(),
        "iqr": g.quantile(0.75) - g.quantile(0.25),
    })
    return tabela.to_dict("index")
```

## Passo 7 · Quiz · Média ou mediana

### Pergunta
Numa empresa fictícia de 50 pessoas, o salário médio é R\$ 6 800 e o mediano é R\$ 3 900. Um anúncio de vaga diz "salário típico de R\$ 6 800". O que você conclui?
- [ ] O anúncio está certo: a média é a medida padrão do salário típico
- [x] O anúncio engana: a média está puxada por poucos salários altos; metade das pessoas ganha até R\$ 3 900, e esse é o número que descreve a pessoa típica
- [ ] A diferença mostra um erro de digitação, porque média e mediana deveriam ser próximas
- [ ] A mediana é que está errada, porque ignora os salários mais altos
> Média muito acima da mediana é a assinatura de assimetria à direita: alguns salários altos aumentam a soma, e a média passa a não representar ninguém. A mediana não ignora os salários altos; ela só não é movida por quanto eles são altos. Média e mediana só precisam ser próximas em dados simétricos.

### Pergunta
Um colega mediu o tempo de resposta de um sistema fictício em 10 requisições e quer estimar a variabilidade do sistema em geral. Ele escreveu `np.std(tempos)` e obteve 42 ms. O que você aponta?
- [ ] Nada: `np.std` é o desvio padrão, e o resultado é o mesmo em qualquer biblioteca
- [ ] Ele deveria usar `np.var`, que é a medida correta de variabilidade
- [x] As 10 requisições são uma amostra: o desvio amostral, `np.std(tempos, ddof=1)` (ou `pd.Series(tempos).std()`), é cerca de 5 % maior, e o `ddof=0` subestima a dispersão do sistema
- [ ] Com 10 valores não dá para calcular desvio; são necessários pelo menos 30
> O `np.std` usa `ddof=0` e divide por $n$; o pandas usa `ddof=1` e divide por $n - 1$. Para estimar a dispersão de onde a amostra veio, divide-se por $n - 1$; com $n = 10$, a razão é $\sqrt{10/9} \approx 1{,}054$, então o certo é cerca de 44 ms. A variância está em ms², uma unidade que ninguém interpreta, e não existe um mínimo de 30 para calcular um desvio.

### Pergunta
Uma fábrica fictícia tem duas máquinas de empacotamento. A primeira enche pacotes de 500 g com desvio de 10 g; a segunda, sachês de 50 g com desvio de 5 g. Qual delas tem a variação **relativa** maior?
- [ ] A primeira, porque 10 g é mais que 5 g
- [x] A segunda: o coeficiente de variação dela é $5/50 = 10\,\%$, contra $10/500 = 2\,\%$ da primeira
- [ ] As duas são iguais, porque a razão entre os desvios é a mesma que entre os pesos
- [ ] Não dá para comparar grandezas com médias diferentes
> O desvio está na unidade dos dados e cresce com a escala: 10 g num pacote de 500 g é pouco, 5 g num sachê de 50 g é muito. O CV divide o desvio pela média e permite comparar escalas diferentes. A razão entre os desvios é 2, e entre os pesos é 10: não são iguais.
