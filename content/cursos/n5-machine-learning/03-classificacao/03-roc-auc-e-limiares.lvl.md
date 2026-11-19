---
slug: n5-m3-03-roc-auc-e-limiares
titulo: Curva ROC, AUC, precisão-recall e limiares
descricao: Variar o limiar de decisão, construir a curva ROC do zero, AUC como probabilidade de ordenação, curva PR para desbalanceados e escolha do limiar pelo custo.
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
- Construir a curva ROC e calcular AUC do zero e com scikit-learn
- Escolher o limiar de decisão por custo ou por F1 em vez de usar 0,5
- Explicar quando a curva precisão-recall é mais informativa que a ROC
---

## Passo 1 · Leitura · O limiar é um botão separado do modelo

Na lição anterior, as métricas olhavam rótulos 0/1 já decididos. Mas um classificador como a logística não decide nada sozinho: ele dá um **score**, a probabilidade da classe 1, e alguém escolhe a partir de que valor marcar. No scikit-learn, o `predict` usa o limiar 0,5; o score fica no `predict_proba`, cuja segunda coluna é a probabilidade da classe positiva:

```python
scores = modelo.predict_proba(X_teste)[:, 1]   # um número entre 0 e 1 por linha
marcados = scores >= 0.3                        # outro limiar, mesmo modelo
```

Trocar o limiar não muda o modelo; muda só a decisão. Num limiar baixo, quase tudo é marcado: todas as fraudes aparecem, junto com muitos alarmes falsos. Num limiar alto, só os casos mais óbvios são marcados. Duas taxas descrevem esse botão:

$$
\text{TPR} = \frac{VP}{VP + FN}, \qquad \text{FPR} = \frac{FP}{FP + VN}
$$

A **TPR** (taxa de verdadeiros positivos) é o recall: a fração dos positivos verdadeiros que passa do limiar. A **FPR** (taxa de falsos positivos) é a fração dos negativos verdadeiros que passa do limiar, ou seja, $1 - \text{especificidade}$. As duas sempre andam juntas: baixar o limiar nunca diminui nenhuma delas.

A convenção de comparação importa. O scikit-learn marca como positivo quem tem score **maior ou igual** ao limiar (`>=`). Com scores arredondados, empates com o limiar são comuns, e trocar `>=` por `>` muda as contagens.

O erro mais frequente aqui é avaliar o botão com as decisões já tomadas: passar `modelo.predict(X)` (zeros e uns) para uma função que espera scores. Com só dois valores distintos, sobra um único limiar interessante, e toda a informação de ordenação do modelo se perde.

Esta lição constrói a curva que resume todos os limiares de uma vez (a ROC), o número que resume a curva (a AUC), a alternativa para classes raras (a curva precisão-recall) e, por fim, o jeito certo de escolher **um** limiar: pelo custo dos erros, no conjunto de validação.

## Passo 2 · Previsão · TPR e FPR em três limiares

O programa calcula a TPR e a FPR de oito scores em três limiares. Leia sem executar e digite o que ele imprime.

### Código
```python
import numpy as np

y = np.array([0, 0, 1, 0, 1, 1, 0, 1])
scores = np.array([0.1, 0.35, 0.4, 0.5, 0.55, 0.8, 0.65, 0.9])
for limiar in (0.3, 0.5, 0.8):
    marcados = scores >= limiar
    tpr = np.sum(marcados & (y == 1)) / np.sum(y == 1)
    fpr = np.sum(marcados & (y == 0)) / np.sum(y == 0)
    print(limiar, tpr, fpr)
```

### Dicas
1. Há 4 positivos e 4 negativos; cada taxa é uma contagem dividida por 4.
2. Um score igual ao limiar é marcado (`>=`).
3. Com o limiar 0,8, só os scores 0,8 e 0,9 são marcados.

### Saída esperada
```text
0.3 1.0 0.75
0.5 0.75 0.5
0.8 0.5 0.0
```

## Passo 3 · Exercício · Taxas num limiar
modo: ordenar

Arraste as linhas para montar `taxas_no_limiar` e ajuste a indentação. Três linhas estão sobrando.

### Instruções
1. `taxas_no_limiar(y, scores, limiar)` recebe rótulos 0/1 e scores (listas ou arrays) e marca como positivo quem tem score maior ou igual ao limiar.
2. Devolve a tupla `(tpr, fpr)` de `float`s: a fração dos positivos verdadeiros marcados e a fração dos negativos verdadeiros marcados.

### Solução
```python
import numpy as np


def taxas_no_limiar(y, scores, limiar):
    y = np.asarray(y)
    marcados = np.asarray(scores) >= limiar
    vp = np.sum(marcados & (y == 1))
    fp = np.sum(marcados & (y == 0))
    tpr = float(vp / np.sum(y == 1))
    fpr = float(fp / np.sum(y == 0))
    return tpr, fpr
```

### Distratores
```python
marcados = np.asarray(scores) > limiar
fpr = float(fp / np.sum(marcados))
return fpr, tpr
```

### Verificação
```json
[
  { "id": "exemplo", "checkpoint": 2, "kind": "call", "function": "taxas_no_limiar",
    "args": [[0, 0, 1, 0, 1, 1, 0, 1], [0.1, 0.35, 0.4, 0.5, 0.55, 0.8, 0.65, 0.9], 0.5], "expected": [0.75, 0.5], "tolerance": 1e-12,
    "name": "Limiar 0,5 nos oito scores da Previsão",
    "hint": "A TPR divide pelos positivos verdadeiros; a FPR, pelos negativos verdadeiros." },
  { "id": "empate-com-limiar", "checkpoint": 1, "kind": "call", "function": "taxas_no_limiar",
    "args": [[1, 0, 1, 0], [0.5, 0.2, 0.7, 0.5], 0.5], "expected": [1.0, 0.5], "tolerance": 1e-12,
    "name": "Score igual ao limiar é marcado",
    "hint": "A convenção do scikit-learn é score >= limiar." },
  { "id": "limiar-alto", "checkpoint": 2, "kind": "call", "function": "taxas_no_limiar",
    "args": [[0, 1, 1, 0], [0.2, 0.6, 0.9, 0.4], 0.95], "expected": [0.0, 0.0], "tolerance": 1e-12,
    "name": "Limiar acima de todos os scores: nada é marcado" },
  { "id": "limiar-zero", "checkpoint": 2, "kind": "call", "function": "taxas_no_limiar",
    "args": [[0, 1, 1, 0], [0.2, 0.6, 0.9, 0.4], 0.0], "expected": [1.0, 1.0], "tolerance": 1e-12,
    "name": "Limiar zero: tudo é marcado" },
  { "id": "ordem-da-tupla", "checkpoint": 2, "kind": "call", "function": "taxas_no_limiar",
    "args": [[1, 1, 1, 0, 0], [0.9, 0.8, 0.2, 0.7, 0.1], 0.5], "expected": [0.6666666666666666, 0.5], "tolerance": 1e-12,
    "name": "TPR primeiro, FPR depois",
    "hint": "Devolva (tpr, fpr), nessa ordem." },
  { "id": "fpr-denominador", "checkpoint": 2, "kind": "call", "function": "taxas_no_limiar",
    "args": [[0, 0, 0, 0, 1], [0.9, 0.1, 0.2, 0.3, 0.8], 0.5], "expected": [1.0, 0.25], "tolerance": 1e-12,
    "name": "Um alarme falso entre quatro negativos: FPR 0,25",
    "hint": "A FPR é uma fração dos negativos verdadeiros, não dos marcados." },
  { "id": "arrays", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nr = taxas_no_limiar(np.array([0, 1, 1, 0]), np.array([0.2, 0.6, 0.9, 0.4]), 0.5)",
    "expr": "[type(r).__name__, type(r[0]).__name__, type(r[1]).__name__]", "expected": ["tuple", "float", "float"],
    "name": "Com arrays, devolve uma tupla de dois float" }
]
```

### Soluções erradas
```python name="maior estrito"
import numpy as np


def taxas_no_limiar(y, scores, limiar):
    y = np.asarray(y)
    marcados = np.asarray(scores) > limiar
    vp = np.sum(marcados & (y == 1))
    fp = np.sum(marcados & (y == 0))
    tpr = float(vp / np.sum(y == 1))
    fpr = float(fp / np.sum(y == 0))
    return tpr, fpr
```
```python name="tupla na ordem trocada"
import numpy as np


def taxas_no_limiar(y, scores, limiar):
    y = np.asarray(y)
    marcados = np.asarray(scores) >= limiar
    vp = np.sum(marcados & (y == 1))
    fp = np.sum(marcados & (y == 0))
    tpr = float(vp / np.sum(y == 1))
    fpr = float(fp / np.sum(y == 0))
    return fpr, tpr
```
```python name="FPR dividida pelos marcados"
import numpy as np


def taxas_no_limiar(y, scores, limiar):
    y = np.asarray(y)
    marcados = np.asarray(scores) >= limiar
    vp = np.sum(marcados & (y == 1))
    fp = np.sum(marcados & (y == 0))
    tpr = float(vp / np.sum(y == 1))
    fpr = float(fp / np.sum(marcados)) if np.sum(marcados) > 0 else 0.0
    return tpr, fpr
```
```python name="TPR dividida pelo total"
import numpy as np


def taxas_no_limiar(y, scores, limiar):
    y = np.asarray(y)
    marcados = np.asarray(scores) >= limiar
    vp = np.sum(marcados & (y == 1))
    fp = np.sum(marcados & (y == 0))
    tpr = float(vp / len(y))
    fpr = float(fp / np.sum(y == 0))
    return tpr, fpr
```
```python name="compara a lista sem converter"
import numpy as np


def taxas_no_limiar(y, scores, limiar):
    y = np.asarray(y)
    marcados = scores >= limiar
    vp = np.sum(marcados & (y == 1))
    fp = np.sum(marcados & (y == 0))
    tpr = float(vp / np.sum(y == 1))
    fpr = float(fp / np.sum(y == 0))
    return tpr, fpr
```

## Passo 4 · Leitura · ROC e AUC como ordenação de pares

Em vez de escolher um limiar, percorra todos. Ordene os scores distintos do maior para o menor e use cada um como limiar: para cada um, marque um ponto $(\text{FPR}, \text{TPR})$. Antes de todos, um limiar acima do maior score (o scikit-learn usa `inf`) não marca nada e dá o ponto $(0, 0)$; o último limiar, o menor score, marca tudo e dá $(1, 1)$. A linha que liga esses pontos é a **curva ROC**.

```python
from sklearn.metrics import roc_curve, roc_auc_score

fpr, tpr, limiares = roc_curve([0, 0, 1, 1], [0.1, 0.4, 0.35, 0.8], drop_intermediate=False)
fpr.tolist()       # [0.0, 0.0, 0.5, 0.5, 1.0]
tpr.tolist()       # [0.0, 0.5, 0.5, 1.0, 1.0]
limiares.tolist()  # [inf, 0.8, 0.4, 0.35, 0.1]
```

Sem `drop_intermediate=False`, a biblioteca descarta os pontos que ficam no meio de um segmento reto, o que não muda a área. Um modelo perfeito sobe pelo eixo vertical até $(0, 1)$ antes de andar para a direita; um modelo que sorteia os scores fica perto da diagonal.

A **AUC** é a área sob essa curva, e tem uma leitura direta. Sorteie um positivo e um negativo: a AUC é a probabilidade de o positivo ter o score maior, contando os empates como meio acerto.

$$
\text{AUC} = P(s^+ > s^-) + \tfrac{1}{2}\, P(s^+ = s^-)
$$

Com os dados do exemplo há 2 × 2 = 4 pares positivo-negativo; o positivo ganha em 3 deles, e a AUC é 0,75. Com $n_+$ positivos e $n_-$ negativos, comparar todos os pares por broadcasting é uma matriz $n_+ \times n_-$: ótimo para conferir o `roc_auc_score` em conjuntos pequenos.

Três leituras práticas. AUC 0,5 é ordenar ao acaso, não "acertar metade". AUC abaixo de 0,5 quase sempre é rótulo ou score invertido: `predict_proba(X)[:, 0]` em vez de `[:, 1]`. E a AUC só mede a **ordenação**: dividir todos os scores por 10 não muda nada, porque nenhum par troca de lugar.

Duas armadilhas comuns. Calcular a AUC com `predict(X)`, os rótulos já decididos, joga fora a ordenação dentro de cada grupo e dá outro número, em geral menor. E com uma só classe em `y` não existe nenhum par: o `roc_auc_score` escreve `UndefinedMetricWarning: Only one class is present in y_true. ROC AUC score is not defined in that case.` e devolve `nan`.

## Passo 5 · Exercício · ROC e AUC do zero

Escreva a curva ROC e a AUC por pares, sem o `sklearn.metrics`. A correção compara com o `roc_curve` e o `roc_auc_score` calculados nos mesmos dados.

### Instruções
1. `curva_roc(y, scores)` devolve a tupla `(fpr, tpr)` de arrays do numpy: o primeiro ponto é `(0, 0)` e depois vem um ponto por score distinto, usado como limiar (`>=`), do **maior** para o menor. É o mesmo resultado do `roc_curve(y, scores, drop_intermediate=False)`.
2. `auc_por_pares(y, scores)` devolve, como `float`, a fração dos pares (positivo, negativo) em que o positivo tem o score maior, com os empates valendo meio.
3. As duas funções trabalham com os **scores**, sem binarizá-los, e sem o scikit-learn.

### Código inicial
```python
import numpy as np


def curva_roc(y, scores):
    pass


def auc_por_pares(y, scores):
    pass
```

### Solução
```python
import numpy as np


def curva_roc(y, scores):
    y = np.asarray(y)
    s = np.asarray(scores, dtype=float)
    limiares = np.unique(s)[::-1]
    marcados = s[None, :] >= limiares[:, None]
    tpr = np.concatenate([[0.0], marcados[:, y == 1].mean(axis=1)])
    fpr = np.concatenate([[0.0], marcados[:, y == 0].mean(axis=1)])
    return fpr, tpr


def auc_por_pares(y, scores):
    y = np.asarray(y)
    s = np.asarray(scores, dtype=float)
    positivos = s[y == 1][:, None]
    negativos = s[y == 0][None, :]
    return float(np.mean((positivos > negativos) + 0.5 * (positivos == negativos)))
```

### Dicas
1. O `np.unique` devolve os valores distintos em ordem crescente; a curva percorre os limiares do maior para o menor.
2. Com os limiares numa coluna e os scores numa linha, `scores >= limiares` vira uma matriz em que cada linha é um limiar; a média das colunas dos positivos dá a TPR de cada limiar.
3. Para a AUC, a mesma ideia: positivos numa coluna, negativos numa linha, e a média da comparação.

### Verificação
```json
[
  { "id": "curva-exemplo", "checkpoint": 1, "kind": "expr", "setup": "fpr, tpr = curva_roc([0, 0, 1, 1], [0.1, 0.4, 0.35, 0.8])",
    "expr": "[fpr.tolist(), tpr.tolist()]", "expected": [[0.0, 0.0, 0.5, 0.5, 1.0], [0.0, 0.5, 0.5, 1.0, 1.0]], "tolerance": 1e-12,
    "name": "Quatro pontos: a curva sai de (0, 0) e chega a (1, 1)",
    "hint": "Comece no ponto (0, 0) e percorra os limiares do maior score para o menor." },
  { "id": "curva-referencia", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np\nfrom sklearn.metrics import roc_curve\nrng = np.random.default_rng(11)\ny = (rng.random(60) < 0.4).astype(int)\ns = np.clip(np.round(0.3 * y + rng.normal(0.4, 0.2, 60), 1), 0, 1)\nrf, rt, _ = roc_curve(y, s, drop_intermediate=False)\nf, t = curva_roc(y, s)",
    "expr": "len(f) == len(rf) and bool(np.allclose(f, rf)) and bool(np.allclose(t, rt))", "expected": true,
    "name": "Igual ao roc_curve(drop_intermediate=False) em 60 scores com muitos empates",
    "hint": "A expressão compara os seus fpr e tpr com os do roc_curve: confira o ponto inicial, a ordem dos limiares e o >=." },
  { "id": "curva-tipos", "checkpoint": 1, "kind": "expr", "setup": "r = curva_roc([0, 1, 1, 0], [0.3, 0.6, 0.9, 0.2])",
    "expr": "[type(r).__name__, type(r[0]).__name__, type(r[1]).__name__]", "expected": ["tuple", "ndarray", "ndarray"],
    "name": "Devolve a tupla (fpr, tpr) de arrays" },
  { "id": "curva-scores", "checkpoint": 3, "kind": "expr", "setup": "fpr, tpr = curva_roc([0, 0, 0, 1, 1, 1], [0.1, 0.2, 0.6, 0.55, 0.7, 0.9])",
    "expr": "[fpr.tolist(), tpr.tolist()]",
    "expected": [[0.0, 0.0, 0.0, 0.3333333333333333, 0.3333333333333333, 0.6666666666666666, 1.0], [0.0, 0.3333333333333333, 0.6666666666666666, 0.6666666666666666, 1.0, 1.0, 1.0]], "tolerance": 1e-12,
    "name": "Um ponto por score distinto, sem binarizar em 0,5",
    "hint": "Cada score distinto é um limiar; transformar os scores em 0/1 antes apaga a ordenação." },
  { "id": "auc-exemplo", "checkpoint": 2, "kind": "call", "function": "auc_por_pares",
    "args": [[0, 0, 1, 1], [0.1, 0.4, 0.35, 0.8]], "expected": 0.75, "tolerance": 1e-12,
    "name": "O positivo ganha em 3 dos 4 pares" },
  { "id": "auc-empate", "checkpoint": 2, "kind": "call", "function": "auc_por_pares",
    "args": [[0, 1, 0, 1], [0.5, 0.5, 0.2, 0.9]], "expected": 0.875, "tolerance": 1e-12,
    "name": "Um empate entre positivo e negativo vale meio par",
    "hint": "Um empate não é acerto nem erro." },
  { "id": "auc-binarizado", "checkpoint": 3, "kind": "call", "function": "auc_por_pares",
    "args": [[0, 0, 0, 1, 1, 1], [0.1, 0.2, 0.6, 0.55, 0.7, 0.9]], "expected": 0.8888888888888888, "tolerance": 1e-12,
    "name": "A AUC usa os scores, não as classes previstas com 0,5",
    "hint": "Com os rótulos previstos, a ordem dentro de cada grupo se perde." },
  { "id": "auc-invertida", "checkpoint": 2, "kind": "call", "function": "auc_por_pares",
    "args": [[1, 1, 0, 0], [0.1, 0.2, 0.8, 0.9]], "expected": 0.0, "tolerance": 1e-12,
    "name": "Scores invertidos: AUC zero" },
  { "id": "auc-referencia", "checkpoint": 2, "kind": "expr",
    "setup": "import numpy as np\nfrom sklearn.metrics import roc_auc_score\nrng = np.random.default_rng(11)\ny = (rng.random(60) < 0.4).astype(int)\ns = np.clip(np.round(0.3 * y + rng.normal(0.4, 0.2, 60), 1), 0, 1)\nr = auc_por_pares(y, s)",
    "expr": "[type(r).__name__, abs(r - roc_auc_score(y, s)) < 1e-12]", "expected": ["float", true],
    "name": "Um float igual ao roc_auc_score em 60 scores com empates" },
  { "id": "sem-sklearn", "checkpoint": 3, "kind": "source", "rule": { "type": "not_calls", "name": "sklearn" },
    "name": "Calcula sem o scikit-learn" }
]
```

### Soluções erradas
```python name="limiares em ordem crescente"
import numpy as np


def curva_roc(y, scores):
    y = np.asarray(y)
    s = np.asarray(scores, dtype=float)
    limiares = np.unique(s)
    marcados = s[None, :] >= limiares[:, None]
    tpr = np.concatenate([[0.0], marcados[:, y == 1].mean(axis=1)])
    fpr = np.concatenate([[0.0], marcados[:, y == 0].mean(axis=1)])
    return fpr, tpr


def auc_por_pares(y, scores):
    y = np.asarray(y)
    s = np.asarray(scores, dtype=float)
    positivos = s[y == 1][:, None]
    negativos = s[y == 0][None, :]
    return float(np.mean((positivos > negativos) + 0.5 * (positivos == negativos)))
```
```python name="curva com os scores binarizados em 0,5"
import numpy as np


def curva_roc(y, scores):
    y = np.asarray(y)
    s = (np.asarray(scores, dtype=float) >= 0.5).astype(float)
    limiares = np.unique(s)[::-1]
    marcados = s[None, :] >= limiares[:, None]
    tpr = np.concatenate([[0.0], marcados[:, y == 1].mean(axis=1)])
    fpr = np.concatenate([[0.0], marcados[:, y == 0].mean(axis=1)])
    return fpr, tpr


def auc_por_pares(y, scores):
    y = np.asarray(y)
    s = np.asarray(scores, dtype=float)
    positivos = s[y == 1][:, None]
    negativos = s[y == 0][None, :]
    return float(np.mean((positivos > negativos) + 0.5 * (positivos == negativos)))
```
```python name="sem o ponto inicial"
import numpy as np


def curva_roc(y, scores):
    y = np.asarray(y)
    s = np.asarray(scores, dtype=float)
    limiares = np.unique(s)[::-1]
    marcados = s[None, :] >= limiares[:, None]
    tpr = marcados[:, y == 1].mean(axis=1)
    fpr = marcados[:, y == 0].mean(axis=1)
    return fpr, tpr


def auc_por_pares(y, scores):
    y = np.asarray(y)
    s = np.asarray(scores, dtype=float)
    positivos = s[y == 1][:, None]
    negativos = s[y == 0][None, :]
    return float(np.mean((positivos > negativos) + 0.5 * (positivos == negativos)))
```
```python name="maior estrito na curva"
import numpy as np


def curva_roc(y, scores):
    y = np.asarray(y)
    s = np.asarray(scores, dtype=float)
    limiares = np.unique(s)[::-1]
    marcados = s[None, :] > limiares[:, None]
    tpr = np.concatenate([[0.0], marcados[:, y == 1].mean(axis=1)])
    fpr = np.concatenate([[0.0], marcados[:, y == 0].mean(axis=1)])
    return fpr, tpr


def auc_por_pares(y, scores):
    y = np.asarray(y)
    s = np.asarray(scores, dtype=float)
    positivos = s[y == 1][:, None]
    negativos = s[y == 0][None, :]
    return float(np.mean((positivos > negativos) + 0.5 * (positivos == negativos)))
```
```python name="empate conta como derrota"
import numpy as np


def curva_roc(y, scores):
    y = np.asarray(y)
    s = np.asarray(scores, dtype=float)
    limiares = np.unique(s)[::-1]
    marcados = s[None, :] >= limiares[:, None]
    tpr = np.concatenate([[0.0], marcados[:, y == 1].mean(axis=1)])
    fpr = np.concatenate([[0.0], marcados[:, y == 0].mean(axis=1)])
    return fpr, tpr


def auc_por_pares(y, scores):
    y = np.asarray(y)
    s = np.asarray(scores, dtype=float)
    positivos = s[y == 1][:, None]
    negativos = s[y == 0][None, :]
    return float(np.mean(positivos > negativos))
```
```python name="empate conta como vitória"
import numpy as np


def curva_roc(y, scores):
    y = np.asarray(y)
    s = np.asarray(scores, dtype=float)
    limiares = np.unique(s)[::-1]
    marcados = s[None, :] >= limiares[:, None]
    tpr = np.concatenate([[0.0], marcados[:, y == 1].mean(axis=1)])
    fpr = np.concatenate([[0.0], marcados[:, y == 0].mean(axis=1)])
    return fpr, tpr


def auc_por_pares(y, scores):
    y = np.asarray(y)
    s = np.asarray(scores, dtype=float)
    positivos = s[y == 1][:, None]
    negativos = s[y == 0][None, :]
    return float(np.mean(positivos >= negativos))
```
```python name="AUC com as classes previstas"
import numpy as np


def curva_roc(y, scores):
    y = np.asarray(y)
    s = np.asarray(scores, dtype=float)
    limiares = np.unique(s)[::-1]
    marcados = s[None, :] >= limiares[:, None]
    tpr = np.concatenate([[0.0], marcados[:, y == 1].mean(axis=1)])
    fpr = np.concatenate([[0.0], marcados[:, y == 0].mean(axis=1)])
    return fpr, tpr


def auc_por_pares(y, scores):
    y = np.asarray(y)
    s = (np.asarray(scores, dtype=float) >= 0.5).astype(float)
    positivos = s[y == 1][:, None]
    negativos = s[y == 0][None, :]
    return float(np.mean((positivos > negativos) + 0.5 * (positivos == negativos)))
```

## Passo 6 · Leitura · Precisão-recall e limiar por custo

Num problema com 1 % de positivos, a ROC pode enganar. A FPR divide pelos negativos, que são muitos: mil alarmes falsos entre cem mil transações normais são só 1 % de FPR, e a curva parece ótima, mas os mil alarmes enterram as cem fraudes verdadeiras. A **curva precisão-recall** troca a FPR pela precisão, que divide pelos marcados e sente esses alarmes. O resumo dela é a **precisão média** (AP, `average_precision_score`), a média das precisões ponderada pelos aumentos de recall:

$$
\text{AP} = \sum_{k} (R_k - R_{k-1})\, P_k
$$

Um classificador ao acaso tem AUC 0,5 em qualquer conjunto, mas AP igual à proporção de positivos: 0,01 no exemplo. Em dados desbalanceados, reporte a AP junto com a AUC.

```python
from sklearn.metrics import precision_recall_curve, average_precision_score

precisao, recall, limiares = precision_recall_curve(y_val, scores_val)
average_precision_score(y_val, scores_val)
```

As curvas comparam modelos; em produção, o modelo precisa de **um** limiar. Duas regras comuns. A primeira maximiza o F1 entre os limiares candidatos, os scores distintos. A segunda, melhor quando os custos são conhecidos, minimiza o custo total:

$$
\text{custo}(t) = c_{FP} \cdot FP(t) + c_{FN} \cdot FN(t)
$$

Com uma fraude perdida custando 20 vezes um alarme falso, o limiar ótimo fica bem abaixo de 0,5. Quando dois limiares empatam, escolha um critério fixo (aqui, o menor) para o resultado não depender da ordem do laço.

O ponto crítico é **onde** escolher. O limiar é um hiperparâmetro: escolhido com os dados de teste, ele se ajusta ao acaso daquele conjunto, e o custo medido no teste fica otimista. O fluxo honesto separa três papéis: o modelo é treinado no treino; o limiar é escolhido com os scores da **validação**; o teste é usado uma vez, só para medir o custo com o limiar já fixado. No exercício, escolher no teste dá um custo de teste menor que o do fluxo honesto, e é justamente essa diferença que não existe em dados novos.

## Passo 7 · Exercício · Escolher o limiar

Escreva as duas regras de escolha de limiar e o fluxo que escolhe na validação e mede no teste. A função `custo_total` já está pronta no código.

### Instruções
1. Os limiares candidatos são os valores distintos de `scores`, com a regra `score >= limiar`. Em todo empate, vence o **menor** limiar. Os limiares devolvidos são `float`.
2. `melhor_limiar_f1(y, scores)` devolve o limiar candidato de maior F1 (há pelo menos um positivo em `y`).
3. `limiar_por_custo(y, scores, custo_fp, custo_fn)` devolve o limiar candidato de menor `custo_total`.
4. `avaliar_com_limiar(y_val, s_val, y_teste, s_teste, custo_fp, custo_fn)` escolhe o limiar pelo custo **na validação** e devolve `{"limiar": ..., "custo_teste": ...}`, com o custo total do teste nesse limiar.

### Código inicial
```python
import numpy as np


def custo_total(y, scores, limiar, custo_fp, custo_fn):
    y = np.asarray(y)
    marcados = np.asarray(scores, dtype=float) >= limiar
    return float(custo_fp * np.sum(marcados & (y == 0)) + custo_fn * np.sum(~marcados & (y == 1)))


def melhor_limiar_f1(y, scores):
    pass


def limiar_por_custo(y, scores, custo_fp, custo_fn):
    pass


def avaliar_com_limiar(y_val, s_val, y_teste, s_teste, custo_fp, custo_fn):
    pass
```

### Solução
```python
import numpy as np


def custo_total(y, scores, limiar, custo_fp, custo_fn):
    y = np.asarray(y)
    marcados = np.asarray(scores, dtype=float) >= limiar
    return float(custo_fp * np.sum(marcados & (y == 0)) + custo_fn * np.sum(~marcados & (y == 1)))


def melhor_limiar_f1(y, scores):
    y = np.asarray(y)
    s = np.asarray(scores, dtype=float)
    melhor, melhor_f1 = None, -1.0
    for limiar in np.unique(s):
        marcados = s >= limiar
        vp = np.sum(marcados & (y == 1))
        fp = np.sum(marcados & (y == 0))
        fn = np.sum(~marcados & (y == 1))
        f1 = 2 * vp / (2 * vp + fp + fn)
        if f1 > melhor_f1:
            melhor, melhor_f1 = float(limiar), f1
    return melhor


def limiar_por_custo(y, scores, custo_fp, custo_fn):
    melhor, menor_custo = None, None
    for limiar in np.unique(np.asarray(scores, dtype=float)):
        custo = custo_total(y, scores, limiar, custo_fp, custo_fn)
        if menor_custo is None or custo < menor_custo:
            melhor, menor_custo = float(limiar), custo
    return melhor


def avaliar_com_limiar(y_val, s_val, y_teste, s_teste, custo_fp, custo_fn):
    limiar = limiar_por_custo(y_val, s_val, custo_fp, custo_fn)
    return {"limiar": limiar, "custo_teste": custo_total(y_teste, s_teste, limiar, custo_fp, custo_fn)}
```

### Dicas
1. O `np.unique` já devolve os candidatos em ordem crescente: percorrendo nessa ordem, troque o melhor só quando o novo for **estritamente** melhor, e o menor limiar vence os empates.
2. O F1 pode ser escrito direto com as contagens: $\frac{2\,VP}{2\,VP + FP + FN}$.
3. Em `avaliar_com_limiar`, os dados de teste só aparecem na última conta.

### Verificação
```json
[
  { "id": "f1-exemplo", "checkpoint": 2, "kind": "call", "function": "melhor_limiar_f1",
    "args": [[0, 0, 1, 0, 1, 1, 0, 1], [0.1, 0.35, 0.4, 0.5, 0.55, 0.8, 0.65, 0.9]], "expected": 0.4, "type": "float", "tolerance": 1e-12,
    "name": "Os oito scores da Previsão: melhor F1 no limiar 0,4",
    "hint": "Marque com score >= limiar e compare o F1 de cada candidato." },
  { "id": "f1-empate", "checkpoint": 1, "kind": "call", "function": "melhor_limiar_f1",
    "args": [[0, 0, 0, 1, 0, 1], [0.4, 0.6, 0.1, 0.5, 0.7, 0.9]], "expected": 0.5, "tolerance": 1e-12,
    "name": "Dois limiares com o mesmo F1: vence o menor",
    "hint": "Só troque o melhor quando o F1 novo for estritamente maior." },
  { "id": "f1-nao-acuracia", "checkpoint": 2, "kind": "call", "function": "melhor_limiar_f1",
    "args": [[0, 1, 1, 1, 0, 0], [0.4, 0.2, 0.3, 0.9, 0.7, 0.5]], "expected": 0.2, "tolerance": 1e-12,
    "name": "O limiar de maior F1 não é o de maior acurácia",
    "hint": "O critério é o F1, que ignora os verdadeiros negativos." },
  { "id": "custo-assimetrico", "checkpoint": 3, "kind": "call", "function": "limiar_por_custo",
    "args": [[1, 1, 0, 0, 0, 1, 0, 0], [0.05, 0.75, 0.2, 0.95, 0.55, 0.6, 0.15, 0.8], 1, 3], "expected": 0.05, "tolerance": 1e-12,
    "name": "Positivo perdido custa 3, alarme falso custa 1",
    "hint": "custo_fp multiplica os falsos positivos e custo_fn os falsos negativos." },
  { "id": "custo-alarme-caro", "checkpoint": 3, "kind": "call", "function": "limiar_por_custo",
    "args": [[0, 0, 1, 0, 1, 1, 0, 1], [0.1, 0.35, 0.4, 0.5, 0.55, 0.8, 0.65, 0.9], 5, 1], "expected": 0.8, "tolerance": 1e-12,
    "name": "Com alarme falso caro, o limiar sobe" },
  { "id": "custo-empate", "checkpoint": 1, "kind": "call", "function": "limiar_por_custo",
    "args": [[0, 0, 1, 0, 1, 1, 0, 1], [0.1, 0.35, 0.4, 0.5, 0.55, 0.8, 0.65, 0.9], 1, 1], "expected": 0.4, "type": "float", "tolerance": 1e-12,
    "name": "Custos iguais com empate: vence o menor limiar" },
  { "id": "fluxo-honesto", "checkpoint": 4, "kind": "expr",
    "setup": "import numpy as np\nrng = np.random.default_rng(21)\nyv = (rng.random(80) < 0.3).astype(int)\nsv = np.round(np.clip(0.35 * yv + rng.normal(0.35, 0.18, 80), 0, 1), 2)\nyt = (rng.random(80) < 0.3).astype(int)\nst = np.round(np.clip(0.35 * yt + rng.normal(0.35, 0.18, 80), 0, 1), 2)",
    "expr": "avaliar_com_limiar(yv, sv, yt, st, 1, 4)", "expected": { "limiar": 0.43, "custo_teste": 21.0 }, "tolerance": 1e-9,
    "name": "Limiar escolhido na validação e custo medido no teste (80 + 80 exemplos sorteados)",
    "hint": "O limiar sai só da validação; o teste entra uma vez, para medir o custo com ele." },
  { "id": "fluxo-tipos", "checkpoint": 4, "kind": "expr",
    "setup": "r = avaliar_com_limiar([0, 1, 1, 0], [0.2, 0.7, 0.6, 0.4], [1, 0], [0.65, 0.3], 1, 2)",
    "expr": "[sorted(r), type(r['limiar']).__name__, type(r['custo_teste']).__name__]", "expected": [["custo_teste", "limiar"], "float", "float"],
    "name": "Devolve um dicionário com dois float" }
]
```

### Soluções erradas
```python name="empate vai para o maior limiar"
import numpy as np


def custo_total(y, scores, limiar, custo_fp, custo_fn):
    y = np.asarray(y)
    marcados = np.asarray(scores, dtype=float) >= limiar
    return float(custo_fp * np.sum(marcados & (y == 0)) + custo_fn * np.sum(~marcados & (y == 1)))


def melhor_limiar_f1(y, scores):
    y = np.asarray(y)
    s = np.asarray(scores, dtype=float)
    melhor, melhor_f1 = None, -1.0
    for limiar in np.unique(s):
        marcados = s >= limiar
        vp = np.sum(marcados & (y == 1))
        fp = np.sum(marcados & (y == 0))
        fn = np.sum(~marcados & (y == 1))
        f1 = 2 * vp / (2 * vp + fp + fn)
        if f1 >= melhor_f1:
            melhor, melhor_f1 = float(limiar), f1
    return melhor


def limiar_por_custo(y, scores, custo_fp, custo_fn):
    melhor, menor_custo = None, None
    for limiar in np.unique(np.asarray(scores, dtype=float)):
        custo = custo_total(y, scores, limiar, custo_fp, custo_fn)
        if menor_custo is None or custo <= menor_custo:
            melhor, menor_custo = float(limiar), custo
    return melhor


def avaliar_com_limiar(y_val, s_val, y_teste, s_teste, custo_fp, custo_fn):
    limiar = limiar_por_custo(y_val, s_val, custo_fp, custo_fn)
    return {"limiar": limiar, "custo_teste": custo_total(y_teste, s_teste, limiar, custo_fp, custo_fn)}
```
```python name="maximiza a acurácia"
import numpy as np


def custo_total(y, scores, limiar, custo_fp, custo_fn):
    y = np.asarray(y)
    marcados = np.asarray(scores, dtype=float) >= limiar
    return float(custo_fp * np.sum(marcados & (y == 0)) + custo_fn * np.sum(~marcados & (y == 1)))


def melhor_limiar_f1(y, scores):
    y = np.asarray(y)
    s = np.asarray(scores, dtype=float)
    melhor, melhor_acc = None, -1.0
    for limiar in np.unique(s):
        acc = np.mean((s >= limiar) == (y == 1))
        if acc > melhor_acc:
            melhor, melhor_acc = float(limiar), acc
    return melhor


def limiar_por_custo(y, scores, custo_fp, custo_fn):
    melhor, menor_custo = None, None
    for limiar in np.unique(np.asarray(scores, dtype=float)):
        custo = custo_total(y, scores, limiar, custo_fp, custo_fn)
        if menor_custo is None or custo < menor_custo:
            melhor, menor_custo = float(limiar), custo
    return melhor


def avaliar_com_limiar(y_val, s_val, y_teste, s_teste, custo_fp, custo_fn):
    limiar = limiar_por_custo(y_val, s_val, custo_fp, custo_fn)
    return {"limiar": limiar, "custo_teste": custo_total(y_teste, s_teste, limiar, custo_fp, custo_fn)}
```
```python name="custos trocados"
import numpy as np


def custo_total(y, scores, limiar, custo_fp, custo_fn):
    y = np.asarray(y)
    marcados = np.asarray(scores, dtype=float) >= limiar
    return float(custo_fp * np.sum(marcados & (y == 0)) + custo_fn * np.sum(~marcados & (y == 1)))


def melhor_limiar_f1(y, scores):
    y = np.asarray(y)
    s = np.asarray(scores, dtype=float)
    melhor, melhor_f1 = None, -1.0
    for limiar in np.unique(s):
        marcados = s >= limiar
        vp = np.sum(marcados & (y == 1))
        fp = np.sum(marcados & (y == 0))
        fn = np.sum(~marcados & (y == 1))
        f1 = 2 * vp / (2 * vp + fp + fn)
        if f1 > melhor_f1:
            melhor, melhor_f1 = float(limiar), f1
    return melhor


def limiar_por_custo(y, scores, custo_fp, custo_fn):
    melhor, menor_custo = None, None
    for limiar in np.unique(np.asarray(scores, dtype=float)):
        custo = custo_total(y, scores, limiar, custo_fn, custo_fp)
        if menor_custo is None or custo < menor_custo:
            melhor, menor_custo = float(limiar), custo
    return melhor


def avaliar_com_limiar(y_val, s_val, y_teste, s_teste, custo_fp, custo_fn):
    limiar = limiar_por_custo(y_val, s_val, custo_fp, custo_fn)
    return {"limiar": limiar, "custo_teste": custo_total(y_teste, s_teste, limiar, custo_fp, custo_fn)}
```
```python name="maior estrito ao marcar"
import numpy as np


def custo_total(y, scores, limiar, custo_fp, custo_fn):
    y = np.asarray(y)
    marcados = np.asarray(scores, dtype=float) > limiar
    return float(custo_fp * np.sum(marcados & (y == 0)) + custo_fn * np.sum(~marcados & (y == 1)))


def melhor_limiar_f1(y, scores):
    y = np.asarray(y)
    s = np.asarray(scores, dtype=float)
    melhor, melhor_f1 = None, -1.0
    for limiar in np.unique(s):
        marcados = s > limiar
        vp = np.sum(marcados & (y == 1))
        fp = np.sum(marcados & (y == 0))
        fn = np.sum(~marcados & (y == 1))
        f1 = 2 * vp / (2 * vp + fp + fn)
        if f1 > melhor_f1:
            melhor, melhor_f1 = float(limiar), f1
    return melhor


def limiar_por_custo(y, scores, custo_fp, custo_fn):
    melhor, menor_custo = None, None
    for limiar in np.unique(np.asarray(scores, dtype=float)):
        custo = custo_total(y, scores, limiar, custo_fp, custo_fn)
        if menor_custo is None or custo < menor_custo:
            melhor, menor_custo = float(limiar), custo
    return melhor


def avaliar_com_limiar(y_val, s_val, y_teste, s_teste, custo_fp, custo_fn):
    limiar = limiar_por_custo(y_val, s_val, custo_fp, custo_fn)
    return {"limiar": limiar, "custo_teste": custo_total(y_teste, s_teste, limiar, custo_fp, custo_fn)}
```
```python name="escolhe o limiar no teste"
import numpy as np


def custo_total(y, scores, limiar, custo_fp, custo_fn):
    y = np.asarray(y)
    marcados = np.asarray(scores, dtype=float) >= limiar
    return float(custo_fp * np.sum(marcados & (y == 0)) + custo_fn * np.sum(~marcados & (y == 1)))


def melhor_limiar_f1(y, scores):
    y = np.asarray(y)
    s = np.asarray(scores, dtype=float)
    melhor, melhor_f1 = None, -1.0
    for limiar in np.unique(s):
        marcados = s >= limiar
        vp = np.sum(marcados & (y == 1))
        fp = np.sum(marcados & (y == 0))
        fn = np.sum(~marcados & (y == 1))
        f1 = 2 * vp / (2 * vp + fp + fn)
        if f1 > melhor_f1:
            melhor, melhor_f1 = float(limiar), f1
    return melhor


def limiar_por_custo(y, scores, custo_fp, custo_fn):
    melhor, menor_custo = None, None
    for limiar in np.unique(np.asarray(scores, dtype=float)):
        custo = custo_total(y, scores, limiar, custo_fp, custo_fn)
        if menor_custo is None or custo < menor_custo:
            melhor, menor_custo = float(limiar), custo
    return melhor


def avaliar_com_limiar(y_val, s_val, y_teste, s_teste, custo_fp, custo_fn):
    limiar = limiar_por_custo(y_teste, s_teste, custo_fp, custo_fn)
    return {"limiar": limiar, "custo_teste": custo_total(y_teste, s_teste, limiar, custo_fp, custo_fn)}
```
```python name="mede o teste com o limiar 0,5"
import numpy as np


def custo_total(y, scores, limiar, custo_fp, custo_fn):
    y = np.asarray(y)
    marcados = np.asarray(scores, dtype=float) >= limiar
    return float(custo_fp * np.sum(marcados & (y == 0)) + custo_fn * np.sum(~marcados & (y == 1)))


def melhor_limiar_f1(y, scores):
    y = np.asarray(y)
    s = np.asarray(scores, dtype=float)
    melhor, melhor_f1 = None, -1.0
    for limiar in np.unique(s):
        marcados = s >= limiar
        vp = np.sum(marcados & (y == 1))
        fp = np.sum(marcados & (y == 0))
        fn = np.sum(~marcados & (y == 1))
        f1 = 2 * vp / (2 * vp + fp + fn)
        if f1 > melhor_f1:
            melhor, melhor_f1 = float(limiar), f1
    return melhor


def limiar_por_custo(y, scores, custo_fp, custo_fn):
    melhor, menor_custo = None, None
    for limiar in np.unique(np.asarray(scores, dtype=float)):
        custo = custo_total(y, scores, limiar, custo_fp, custo_fn)
        if menor_custo is None or custo < menor_custo:
            melhor, menor_custo = float(limiar), custo
    return melhor


def avaliar_com_limiar(y_val, s_val, y_teste, s_teste, custo_fp, custo_fn):
    limiar = limiar_por_custo(y_val, s_val, custo_fp, custo_fn)
    return {"limiar": limiar, "custo_teste": custo_total(y_teste, s_teste, 0.5, custo_fp, custo_fn)}
```

## Passo 8 · Quiz · AUC 0,5 e PR contra ROC

### Pergunta
Um colega avalia uma logística assim e conta que a AUC "caiu" de 0,88 para 0,71 depois de um ajuste no código:

```python
auc_antes = roc_auc_score(y_teste, modelo.predict_proba(X_teste)[:, 1])  # 0.88
auc_depois = roc_auc_score(y_teste, modelo.predict(X_teste))             # 0.71
```

O modelo é o mesmo. O que aconteceu?
- [ ] O `predict` usa outro modelo, treinado de novo a cada chamada
- [x] O `predict` devolve as classes já decididas com o limiar 0,5: sobram dois valores, a ordenação dentro de cada grupo se perde e a "AUC" passa a medir um único ponto da curva
- [ ] O `roc_auc_score` só aceita rótulos, então 0,71 é a AUC correta e 0,88 estava errado
- [ ] A segunda coluna do `predict_proba` é a probabilidade da classe 0, por isso a primeira AUC está inflada
> A AUC precisa de scores que ordenem os exemplos. Com o `predict`, todos os marcados empatam em 1 e todos os outros em 0, e a curva vira dois segmentos passando pelo ponto do limiar 0,5. O modelo não mudou: só a entrada da métrica. A coluna `[:, 1]` é a probabilidade da classe 1, a certa; com `[:, 0]`, a AUC sairia $1 - 0{,}88 = 0{,}12$.

### Pergunta
Num conjunto fictício com 0,5 % de transações fraudulentas, dois modelos têm AUC 0,96 e 0,97. A precisão média (AP) é 0,08 e 0,41. A equipe precisa marcar poucas transações e acertar a maioria das marcações. Como ler esses números?
- [ ] Os dois modelos são praticamente iguais, porque as AUCs diferem em 0,01
- [ ] A AP baixa do primeiro indica erro de cálculo, porque com AUC 0,96 a AP precisaria passar de 0,9
- [x] Com tão poucos positivos, a FPR esconde milhares de alarmes falsos; a AP, que olha a precisão, mostra que o segundo modelo mantém as marcações muito mais limpas
- [ ] A AP só vale para problemas balanceados; com 0,5 % de positivos, use só a AUC
> A FPR divide pelos negativos, que são 99,5 % dos dados: uma diferença pequena de FPR são milhares de alarmes falsos a mais, e a AUC quase não se move. A precisão divide pelos marcados e sente esses alarmes. A AP de um classificador ao acaso seria 0,005, e as duas estão acima disso; não há contradição com a AUC alta. É justamente em dados desbalanceados que a curva PR e a AP são mais informativas.

### Pergunta
Para escolher o limiar de um modelo, alguém testa 50 limiares no **conjunto de teste**, fica com o de menor custo e relata esse custo como o desempenho esperado em produção. Qual é o problema?
- [ ] Nenhum: o limiar não é um parâmetro do modelo, então escolhê-lo no teste não afeta a avaliação
- [ ] 50 limiares são poucos; com todos os scores distintos como candidatos o resultado seria honesto
- [x] O limiar foi ajustado ao acaso daquele conjunto, e o custo relatado é otimista; o limiar deve vir da validação, e o teste só mede o custo com o limiar já fixado
- [ ] O problema é usar custo; com o F1 a escolha no teste seria aceitável
> O limiar é um hiperparâmetro: escolhido com os dados de avaliação, ele aproveita as flutuações daquele conjunto, e o número relatado deixa de estimar o desempenho em dados novos. Mais candidatos pioram o otimismo, e trocar a métrica não muda a natureza do erro. No exercício, escolher no teste deu custo 16 contra 21 do fluxo honesto.
