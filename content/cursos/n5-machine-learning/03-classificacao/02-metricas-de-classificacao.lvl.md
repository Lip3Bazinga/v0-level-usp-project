---
slug: n5-m3-02-metricas-de-classificacao
titulo: Métricas de classificação
descricao: Matriz de confusão, acurácia e sua armadilha, precisão, recall, F1, especificidade, e a escolha da métrica pelo custo dos erros.
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
- Construir a matriz de confusão e calcular todas as métricas derivadas do zero
- Explicar por que acurácia engana em classes desbalanceadas e escolher a métrica pelo custo dos erros
- Usar classification_report e confusion_matrix do scikit-learn e interpretá-los
---

## Passo 1 · Leitura · Quatro caixas

Um sistema fictício de pagamentos marca transações suspeitas para revisão manual. Das 1 000 transações de um dia, 10 são fraudes. Um modelo que **nunca** marca nada acerta 990 de 1 000: acurácia de 99 %. Ele é inútil, e a acurácia não mostra isso. Para ver o que um classificador binário faz, separe as previsões em quatro caixas, com a classe 1 (fraude) como **positiva**:

- **VP** (verdadeiro positivo, `TP` em inglês): era fraude e o modelo marcou;
- **FP** (falso positivo): não era fraude e o modelo marcou, um alarme falso;
- **FN** (falso negativo): era fraude e o modelo deixou passar;
- **VN** (verdadeiro negativo, `TN`): não era fraude e o modelo não marcou.

A acurácia mistura tudo numa conta só:

$$
\text{acurácia} = \frac{VP + VN}{VP + VN + FP + FN}
$$

Com 990 negativos, o VN domina o numerador e esconde que o modelo deixou passar todas as fraudes.

A **matriz de confusão** organiza as quatro contagens numa tabela. No scikit-learn, cada **linha** é a classe verdadeira e cada **coluna** é a classe prevista, nas duas em ordem crescente de rótulo. Com os rótulos 0 e 1, a matriz fica:

$$
\begin{bmatrix} VN & FP \\ FN & VP \end{bmatrix}
$$

```python
from sklearn.metrics import confusion_matrix

y      = [1, 1, 1, 1, 0, 0, 0, 0, 0, 0]
y_pred = [1, 1, 1, 0, 1, 1, 0, 0, 0, 0]
confusion_matrix(y, y_pred).tolist()   # [[4, 2], [1, 3]]
```

Lendo a matriz: 4 negativos reconhecidos, 2 alarmes falsos na primeira linha; 1 fraude perdida e 3 fraudes pegas na segunda. A ordem pega muita gente. Em textos de estatística a matriz costuma aparecer com o positivo primeiro (`[[VP, FN], [FP, VN]]`), e há ferramentas que põem a classe prevista nas linhas. Confira sempre qual eixo é qual antes de ler um número.

Com apenas uma classe nos dados, o `confusion_matrix` devolve uma matriz 1 × 1, porque só existe um rótulo. O parâmetro `labels=[0, 1]` força as duas linhas. Nesta lição você escreve a matriz e as métricas que saem dela, e escolhe qual métrica olhar a partir do custo de cada tipo de erro.

## Passo 2 · Previsão · Acurácia com 99 % de negativos

O programa compara dois classificadores num dia com 990 transações normais e 10 fraudes: um que nunca marca nada e um que marca 15 transações, entre elas as 10 fraudes. Leia sem executar e digite o que ele imprime.

### Código
```python
import numpy as np
from sklearn.metrics import accuracy_score, confusion_matrix, precision_score, recall_score

y = np.array([0] * 990 + [1] * 10)
sempre_zero = np.zeros(1000, dtype=int)
print(accuracy_score(y, sempre_zero))
print(recall_score(y, sempre_zero))
print(confusion_matrix(y, sempre_zero).tolist())

alerta = sempre_zero.copy()
alerta[985:] = 1
print(accuracy_score(y, alerta), recall_score(y, alerta))
print(precision_score(y, alerta))
```

### Dicas
1. O recall é a fração das fraudes que o modelo marcou.
2. A matriz tem as classes verdadeiras nas linhas e as previstas nas colunas.
3. O `alerta` marca as posições 985 a 999: as 5 últimas transações normais e as 10 fraudes.

### Saída esperada
```text
0.99
0.0
[[990, 0], [10, 0]]
0.995 1.0
0.6666666666666666
```

## Passo 3 · Exercício · Matriz de confusão
modo: lacunas

Complete as lacunas (`___`) para contar as quatro caixas e montar a matriz na ordem do scikit-learn.

### Instruções
1. `matriz_de_confusao(y, y_pred)` recebe rótulos 0/1 (listas ou arrays) e conta VP, VN, FP e FN, com a classe 1 como positiva.
2. Devolve uma lista de listas de `int` na ordem `[[VN, FP], [FN, VP]]`: linhas são a classe verdadeira, colunas a prevista. A matriz é sempre 2 × 2, mesmo quando uma das classes não aparece.

### Código inicial
```python
import numpy as np


def matriz_de_confusao(y, y_pred):
    y = np.asarray(y)
    y_pred = np.asarray(y_pred)
    vp = int(np.sum((y == 1) & (y_pred == 1)))
    vn = int(np.sum(___))
    fp = int(np.sum(___))
    fn = int(np.sum(___))
    return [[___, ___], [___, ___]]
```

### Solução
```python
import numpy as np


def matriz_de_confusao(y, y_pred):
    y = np.asarray(y)
    y_pred = np.asarray(y_pred)
    vp = int(np.sum((y == 1) & (y_pred == 1)))
    vn = int(np.sum((y == 0) & (y_pred == 0)))
    fp = int(np.sum((y == 0) & (y_pred == 1)))
    fn = int(np.sum((y == 1) & (y_pred == 0)))
    return [[vn, fp], [fn, vp]]
```

### Dicas
1. Cada caixa combina duas condições, uma sobre o rótulo verdadeiro e outra sobre o previsto, com `&`.
2. O "falso" de FP e FN diz que a previsão errou; o "positivo" ou "negativo" é o que o modelo **previu**.
3. A primeira linha da matriz é a dos exemplos verdadeiramente negativos.

### Verificação
```json
[
  { "id": "exemplo", "checkpoint": 2, "kind": "call", "function": "matriz_de_confusao",
    "args": [[1, 1, 1, 1, 0, 0, 0, 0, 0, 0], [1, 1, 1, 0, 1, 1, 0, 0, 0, 0]], "expected": [[4, 2], [1, 3]],
    "name": "Dez exemplos: 4 VN, 2 FP, 1 FN, 3 VP",
    "hint": "Linhas são a classe verdadeira (0 em cima), colunas a prevista (0 à esquerda)." },
  { "id": "referencia", "checkpoint": 2, "kind": "expr",
    "setup": "import numpy as np\nfrom sklearn.metrics import confusion_matrix\nrng = np.random.default_rng(4)\ny = (rng.random(200) < 0.3).astype(int)\np = np.where(rng.random(200) < 0.8, y, 1 - y)",
    "expr": "matriz_de_confusao(y, p) == confusion_matrix(y, p).tolist()", "expected": true,
    "name": "Igual ao confusion_matrix do scikit-learn em 200 rótulos sorteados",
    "hint": "A expressão compara a sua lista com a do confusion_matrix: confira a posição de cada caixa." },
  { "id": "tudo-certo", "checkpoint": 1, "kind": "call", "function": "matriz_de_confusao",
    "args": [[0, 1, 0, 1], [0, 1, 0, 1]], "expected": [[2, 0], [0, 2]],
    "name": "Previsões todas certas: só a diagonal" },
  { "id": "tudo-errado", "checkpoint": 1, "kind": "call", "function": "matriz_de_confusao",
    "args": [[0, 0, 1], [1, 1, 0]], "expected": [[0, 2], [1, 0]],
    "name": "Previsões todas erradas: dois alarmes falsos e um positivo perdido",
    "hint": "FP é um negativo verdadeiro previsto como positivo." },
  { "id": "sem-positivos", "checkpoint": 2, "kind": "call", "function": "matriz_de_confusao",
    "args": [[0, 0, 0], [0, 1, 0]], "expected": [[2, 1], [0, 0]],
    "name": "Sem nenhum positivo verdadeiro, a matriz continua 2 × 2" },
  { "id": "desbalanceado", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np",
    "expr": "matriz_de_confusao(np.array([0] * 990 + [1] * 10), np.zeros(1000, dtype=int))", "expected": [[990, 0], [10, 0]],
    "name": "990 negativos e 10 positivos, nada marcado" },
  { "id": "tipos", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nr = matriz_de_confusao(np.array([1, 0, 1]), np.array([1, 1, 0]))",
    "expr": "[type(r).__name__, type(r[0]).__name__, type(r[1][1]).__name__]", "expected": ["list", "list", "int"],
    "name": "Uma lista de listas de int do Python" }
]
```

### Soluções erradas
```python name="matriz transposta"
import numpy as np


def matriz_de_confusao(y, y_pred):
    y = np.asarray(y)
    y_pred = np.asarray(y_pred)
    vp = int(np.sum((y == 1) & (y_pred == 1)))
    vn = int(np.sum((y == 0) & (y_pred == 0)))
    fp = int(np.sum((y == 0) & (y_pred == 1)))
    fn = int(np.sum((y == 1) & (y_pred == 0)))
    return [[vn, fn], [fp, vp]]
```
```python name="positivo primeiro"
import numpy as np


def matriz_de_confusao(y, y_pred):
    y = np.asarray(y)
    y_pred = np.asarray(y_pred)
    vp = int(np.sum((y == 1) & (y_pred == 1)))
    vn = int(np.sum((y == 0) & (y_pred == 0)))
    fp = int(np.sum((y == 0) & (y_pred == 1)))
    fn = int(np.sum((y == 1) & (y_pred == 0)))
    return [[vp, fn], [fp, vn]]
```
```python name="ou no lugar de e"
import numpy as np


def matriz_de_confusao(y, y_pred):
    y = np.asarray(y)
    y_pred = np.asarray(y_pred)
    vp = int(np.sum((y == 1) & (y_pred == 1)))
    vn = int(np.sum((y == 0) | (y_pred == 0)))
    fp = int(np.sum((y == 0) & (y_pred == 1)))
    fn = int(np.sum((y == 1) & (y_pred == 0)))
    return [[vn, fp], [fn, vp]]
```
```python name="VN conta todos os acertos"
import numpy as np


def matriz_de_confusao(y, y_pred):
    y = np.asarray(y)
    y_pred = np.asarray(y_pred)
    vp = int(np.sum((y == 1) & (y_pred == 1)))
    vn = int(np.sum(y == y_pred))
    fp = int(np.sum((y == 0) & (y_pred == 1)))
    fn = int(np.sum((y == 1) & (y_pred == 0)))
    return [[vn, fp], [fn, vp]]
```
```python name="FN olha só a previsão"
import numpy as np


def matriz_de_confusao(y, y_pred):
    y = np.asarray(y)
    y_pred = np.asarray(y_pred)
    vp = int(np.sum((y == 1) & (y_pred == 1)))
    vn = int(np.sum((y == 0) & (y_pred == 0)))
    fp = int(np.sum((y == 0) & (y_pred == 1)))
    fn = int(np.sum(y_pred == 0))
    return [[vn, fp], [fn, vp]]
```
```python name="FP conta todas as marcações"
import numpy as np


def matriz_de_confusao(y, y_pred):
    y = np.asarray(y)
    y_pred = np.asarray(y_pred)
    vp = int(np.sum((y == 1) & (y_pred == 1)))
    vn = int(np.sum((y == 0) & (y_pred == 0)))
    fp = int(np.sum(y_pred == 1))
    fn = int(np.sum((y == 1) & (y_pred == 0)))
    return [[vn, fp], [fn, vp]]
```

## Passo 4 · Leitura · Precisão, recall, F1 e Fβ

Cada métrica responde a uma pergunta diferente sobre a matriz. A **precisão** olha a coluna dos positivos previstos: das transações que o modelo marcou, quantas eram fraude? O **recall** (revocação, sensibilidade, taxa de verdadeiros positivos) olha a linha dos positivos verdadeiros: das fraudes que existiam, quantas o modelo pegou? A **especificidade** faz a pergunta do recall para os negativos.

$$
\text{precisão} = \frac{VP}{VP + FP}, \qquad \text{recall} = \frac{VP}{VP + FN}, \qquad \text{especificidade} = \frac{VN}{VN + FP}
$$

Um jeito de não trocar as duas primeiras: a precisão tem no denominador tudo o que o modelo **disse** ser positivo; o recall, tudo o que **é** positivo. No exemplo do passo 1 (VP = 3, FP = 2, FN = 1), a precisão é $3/5 = 0{,}6$ e o recall é $3/4 = 0{,}75$.

As duas puxam em sentidos opostos: marcar mais transações aumenta o recall e costuma derrubar a precisão. O **F1** resume as duas pela média **harmônica**, que fica perto da menor delas:

$$
F_1 = \frac{2 \cdot \text{precisão} \cdot \text{recall}}{\text{precisão} + \text{recall}}, \qquad F_\beta = \frac{(1 + \beta^2)\, \text{precisão} \cdot \text{recall}}{\beta^2\, \text{precisão} + \text{recall}}
$$

No exemplo, $F_1 = 0{,}667$, abaixo da média aritmética $0{,}675$. O $F_\beta$ dá ao recall um peso $\beta$ vezes maior que à precisão: $\beta = 2$ quando perder um positivo é pior (0,714 no exemplo), $\beta = 0{,}5$ quando um alarme falso é pior (0,625). O que entra na fórmula é $\beta^2$, e não $\beta$.

Quando um denominador é zero, a métrica não está definida: um modelo que nunca marca nada não tem precisão. O scikit-learn devolve 0 e escreve `UndefinedMetricWarning: Precision is ill-defined and being set to 0.0 due to no predicted samples. Use zero_division parameter to control this behavior.` no stderr; com `zero_division=0`, devolve 0 sem aviso. Escrevendo à mão, essa conta vira `ZeroDivisionError: division by zero` se você não tratar o caso.

```python
from sklearn.metrics import precision_score, recall_score, f1_score, fbeta_score

precision_score(y, y_pred)          # 0.6
recall_score(y, y_pred)             # 0.75
fbeta_score(y, y_pred, beta=2)      # 0.714...
recall_score(y, y_pred, pos_label=0)  # especificidade: 0.666...
```

## Passo 5 · Exercício · Métricas do zero

Escreva as métricas a partir das quatro caixas, sem o `sklearn.metrics`. A correção confere os seus números com os da biblioteca.

### Instruções
1. `metricas(y, y_pred)` recebe rótulos 0/1 e devolve um dicionário com as chaves `"acuracia"`, `"precisao"`, `"recall"`, `"f1"` e `"especificidade"`, todos `float` do Python.
2. Toda razão com denominador zero vale `0.0`, como o `zero_division=0` do scikit-learn.
3. `f_beta(y, y_pred, beta)` devolve o $F_\beta$ como `float`, também com `0.0` quando o denominador é zero.
4. Calcule sem o scikit-learn.

### Código inicial
```python
import numpy as np


def metricas(y, y_pred):
    pass


def f_beta(y, y_pred, beta):
    pass
```

### Solução
```python
import numpy as np


def razao(a, b):
    return a / b if b > 0 else 0.0


def metricas(y, y_pred):
    y = np.asarray(y)
    y_pred = np.asarray(y_pred)
    vp = int(np.sum((y == 1) & (y_pred == 1)))
    vn = int(np.sum((y == 0) & (y_pred == 0)))
    fp = int(np.sum((y == 0) & (y_pred == 1)))
    fn = int(np.sum((y == 1) & (y_pred == 0)))
    precisao = razao(vp, vp + fp)
    recall = razao(vp, vp + fn)
    return {
        "acuracia": razao(vp + vn, len(y)),
        "precisao": precisao,
        "recall": recall,
        "f1": razao(2 * precisao * recall, precisao + recall),
        "especificidade": razao(vn, vn + fp),
    }


def f_beta(y, y_pred, beta):
    m = metricas(y, y_pred)
    b2 = beta ** 2
    return razao((1 + b2) * m["precisao"] * m["recall"], b2 * m["precisao"] + m["recall"])
```

### Dicas
1. Conte as quatro caixas uma vez e escreva cada métrica como uma razão entre elas; uma função auxiliar para "divide ou devolve 0" evita repetir o `if`.
2. Precisão: denominador com o que o modelo marcou. Recall: denominador com o que é positivo de fato.
3. No $F_\beta$, o peso que multiplica a precisão no denominador é $\beta$ ao quadrado.

### Verificação
```json
[
  { "id": "exemplo", "checkpoint": 1, "kind": "call", "function": "metricas",
    "args": [[1, 1, 1, 1, 0, 0, 0, 0, 0, 0], [1, 1, 1, 0, 1, 1, 0, 0, 0, 0]],
    "expected": { "acuracia": 0.7, "precisao": 0.6, "recall": 0.75, "f1": 0.6666666666666666, "especificidade": 0.6666666666666666 }, "tolerance": 1e-9,
    "name": "VP = 3, FP = 2, FN = 1, VN = 4",
    "hint": "Precisão e recall têm o mesmo numerador (VP) e denominadores diferentes." },
  { "id": "referencia", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np\nfrom sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score\nrng = np.random.default_rng(4)\ny = (rng.random(200) < 0.3).astype(int)\np = np.where(rng.random(200) < 0.8, y, 1 - y)\nm = metricas(y, p)\nref = [accuracy_score(y, p), precision_score(y, p), recall_score(y, p), f1_score(y, p), recall_score(y, p, pos_label=0)]",
    "expr": "bool(np.allclose([m['acuracia'], m['precisao'], m['recall'], m['f1'], m['especificidade']], ref, atol=1e-12))", "expected": true,
    "name": "Os cinco valores batem com o sklearn.metrics em 200 rótulos sorteados",
    "hint": "A expressão compara, na ordem, acurácia, precisão, recall, F1 e especificidade com as do scikit-learn (a especificidade é o recall da classe 0)." },
  { "id": "desbalanceado", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np",
    "expr": "metricas(np.array([0] * 99 + [1]), np.zeros(100, dtype=int))",
    "expected": { "acuracia": 0.99, "precisao": 0.0, "recall": 0.0, "f1": 0.0, "especificidade": 1.0 }, "tolerance": 1e-9,
    "name": "Nunca marca nada: acurácia 0,99 e as outras métricas sem erro",
    "hint": "Sem nenhum positivo previsto, a precisão tem denominador zero e vale 0.0." },
  { "id": "sem-positivos", "checkpoint": 2, "kind": "call", "function": "metricas",
    "args": [[0, 0, 0, 0], [0, 1, 0, 0]],
    "expected": { "acuracia": 0.75, "precisao": 0.0, "recall": 0.0, "f1": 0.0, "especificidade": 0.75 }, "tolerance": 1e-9,
    "name": "Sem positivos verdadeiros, o recall vale 0.0" },
  { "id": "tipos", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np",
    "expr": "sorted({type(v).__name__ for v in metricas(np.array([1, 0, 1, 1]), np.array([1, 1, 0, 1])).values()})", "expected": ["float"],
    "name": "Todos os valores são float do Python" },
  { "id": "f-beta-2", "checkpoint": 3, "kind": "call", "function": "f_beta",
    "args": [[1, 1, 1, 1, 0, 0, 0, 0, 0, 0], [1, 1, 1, 0, 1, 1, 0, 0, 0, 0], 2], "expected": 0.7142857142857143, "tolerance": 1e-9,
    "name": "F2 pesa mais o recall",
    "hint": "O peso na fórmula é β², não β." },
  { "id": "f-beta-meio", "checkpoint": 3, "kind": "call", "function": "f_beta",
    "args": [[1, 1, 1, 1, 0, 0, 0, 0, 0, 0], [1, 1, 1, 0, 1, 1, 0, 0, 0, 0], 0.5], "expected": 0.625, "tolerance": 1e-9,
    "name": "F0,5 pesa mais a precisão" },
  { "id": "f-beta-1", "checkpoint": 3, "kind": "call", "function": "f_beta",
    "args": [[1, 1, 1, 1, 0, 0, 0, 0, 0, 0], [1, 1, 1, 0, 1, 1, 0, 0, 0, 0], 1], "expected": 0.6666666666666666, "tolerance": 1e-9,
    "name": "Com β = 1, o F1 (média harmônica)",
    "hint": "A média harmônica fica abaixo da aritmética quando precisão e recall diferem." },
  { "id": "f-beta-zero", "checkpoint": 3, "kind": "call", "function": "f_beta",
    "args": [[0, 0, 1], [0, 0, 0], 2], "expected": 0.0, "tolerance": 1e-12,
    "name": "Fβ é 0.0 quando precisão e recall são zero" },
  { "id": "sem-sklearn", "checkpoint": 4, "kind": "source", "rule": { "type": "not_calls", "name": "sklearn" },
    "name": "Calcula sem o scikit-learn" }
]
```

### Soluções erradas
```python name="precisão e recall trocados"
import numpy as np


def razao(a, b):
    return a / b if b > 0 else 0.0


def metricas(y, y_pred):
    y = np.asarray(y)
    y_pred = np.asarray(y_pred)
    vp = int(np.sum((y == 1) & (y_pred == 1)))
    vn = int(np.sum((y == 0) & (y_pred == 0)))
    fp = int(np.sum((y == 0) & (y_pred == 1)))
    fn = int(np.sum((y == 1) & (y_pred == 0)))
    precisao = razao(vp, vp + fn)
    recall = razao(vp, vp + fp)
    return {
        "acuracia": razao(vp + vn, len(y)),
        "precisao": precisao,
        "recall": recall,
        "f1": razao(2 * precisao * recall, precisao + recall),
        "especificidade": razao(vn, vn + fp),
    }


def f_beta(y, y_pred, beta):
    m = metricas(y, y_pred)
    b2 = beta ** 2
    return razao((1 + b2) * m["precisao"] * m["recall"], b2 * m["precisao"] + m["recall"])
```
```python name="sem tratar a divisão por zero"
import numpy as np


def metricas(y, y_pred):
    y = np.asarray(y)
    y_pred = np.asarray(y_pred)
    vp = int(np.sum((y == 1) & (y_pred == 1)))
    vn = int(np.sum((y == 0) & (y_pred == 0)))
    fp = int(np.sum((y == 0) & (y_pred == 1)))
    fn = int(np.sum((y == 1) & (y_pred == 0)))
    precisao = vp / (vp + fp)
    recall = vp / (vp + fn)
    return {
        "acuracia": (vp + vn) / len(y),
        "precisao": precisao,
        "recall": recall,
        "f1": 2 * precisao * recall / (precisao + recall),
        "especificidade": vn / (vn + fp),
    }


def f_beta(y, y_pred, beta):
    m = metricas(y, y_pred)
    b2 = beta ** 2
    return (1 + b2) * m["precisao"] * m["recall"] / (b2 * m["precisao"] + m["recall"])
```
```python name="F1 como média aritmética"
import numpy as np


def razao(a, b):
    return a / b if b > 0 else 0.0


def metricas(y, y_pred):
    y = np.asarray(y)
    y_pred = np.asarray(y_pred)
    vp = int(np.sum((y == 1) & (y_pred == 1)))
    vn = int(np.sum((y == 0) & (y_pred == 0)))
    fp = int(np.sum((y == 0) & (y_pred == 1)))
    fn = int(np.sum((y == 1) & (y_pred == 0)))
    precisao = razao(vp, vp + fp)
    recall = razao(vp, vp + fn)
    return {
        "acuracia": razao(vp + vn, len(y)),
        "precisao": precisao,
        "recall": recall,
        "f1": (precisao + recall) / 2,
        "especificidade": razao(vn, vn + fp),
    }


def f_beta(y, y_pred, beta):
    m = metricas(y, y_pred)
    b2 = beta ** 2
    return razao((1 + b2) * m["precisao"] * m["recall"], b2 * m["precisao"] + m["recall"])
```
```python name="Fβ com β no lugar de β²"
import numpy as np


def razao(a, b):
    return a / b if b > 0 else 0.0


def metricas(y, y_pred):
    y = np.asarray(y)
    y_pred = np.asarray(y_pred)
    vp = int(np.sum((y == 1) & (y_pred == 1)))
    vn = int(np.sum((y == 0) & (y_pred == 0)))
    fp = int(np.sum((y == 0) & (y_pred == 1)))
    fn = int(np.sum((y == 1) & (y_pred == 0)))
    precisao = razao(vp, vp + fp)
    recall = razao(vp, vp + fn)
    return {
        "acuracia": razao(vp + vn, len(y)),
        "precisao": precisao,
        "recall": recall,
        "f1": razao(2 * precisao * recall, precisao + recall),
        "especificidade": razao(vn, vn + fp),
    }


def f_beta(y, y_pred, beta):
    m = metricas(y, y_pred)
    return razao((1 + beta) * m["precisao"] * m["recall"], beta * m["precisao"] + m["recall"])
```
```python name="especificidade com o denominador errado"
import numpy as np


def razao(a, b):
    return a / b if b > 0 else 0.0


def metricas(y, y_pred):
    y = np.asarray(y)
    y_pred = np.asarray(y_pred)
    vp = int(np.sum((y == 1) & (y_pred == 1)))
    vn = int(np.sum((y == 0) & (y_pred == 0)))
    fp = int(np.sum((y == 0) & (y_pred == 1)))
    fn = int(np.sum((y == 1) & (y_pred == 0)))
    precisao = razao(vp, vp + fp)
    recall = razao(vp, vp + fn)
    return {
        "acuracia": razao(vp + vn, len(y)),
        "precisao": precisao,
        "recall": recall,
        "f1": razao(2 * precisao * recall, precisao + recall),
        "especificidade": razao(vn, vn + fn),
    }


def f_beta(y, y_pred, beta):
    m = metricas(y, y_pred)
    b2 = beta ** 2
    return razao((1 + b2) * m["precisao"] * m["recall"], b2 * m["precisao"] + m["recall"])
```
```python name="acurácia só com os positivos"
import numpy as np


def razao(a, b):
    return a / b if b > 0 else 0.0


def metricas(y, y_pred):
    y = np.asarray(y)
    y_pred = np.asarray(y_pred)
    vp = int(np.sum((y == 1) & (y_pred == 1)))
    vn = int(np.sum((y == 0) & (y_pred == 0)))
    fp = int(np.sum((y == 0) & (y_pred == 1)))
    fn = int(np.sum((y == 1) & (y_pred == 0)))
    precisao = razao(vp, vp + fp)
    recall = razao(vp, vp + fn)
    return {
        "acuracia": razao(vp, len(y)),
        "precisao": precisao,
        "recall": recall,
        "f1": razao(2 * precisao * recall, precisao + recall),
        "especificidade": razao(vn, vn + fp),
    }


def f_beta(y, y_pred, beta):
    m = metricas(y, y_pred)
    b2 = beta ** 2
    return razao((1 + b2) * m["precisao"] * m["recall"], b2 * m["precisao"] + m["recall"])
```

## Passo 6 · Leitura · Custo dos erros e médias macro e ponderada

As métricas tratam todos os erros iguais dentro de cada caixa, mas o negócio não. No sistema de pagamentos fictício, uma fraude perdida custa em média R\$ 200,00, e um alarme falso custa R\$ 10,00 de revisão manual. Escreva esses valores numa **matriz de custo** com o mesmo layout da matriz de confusão (linha = verdadeira, coluna = prevista) e o custo médio por transação é a soma, célula a célula, de contagem vezes custo, dividida por $n$:

$$
\text{custo médio} = \frac{1}{n} \sum_{i} \sum_{j} M_{ij}\, C_{ij} = \frac{1}{n} \sum_{k=1}^{n} C_{y_k,\, \hat y_k}
$$

A diagonal não precisa ser zero: revisar uma fraude verdadeira também custa a hora do analista. Comparar dois modelos pelo custo médio responde à pergunta que a acurácia não responde.

Com mais de duas classes, cada classe tem a sua precisão e o seu recall, calculados como se ela fosse a positiva e todas as outras a negativa. Para resumir em um número, há duas médias comuns:

- **macro:** média simples entre as classes; cada classe pesa o mesmo, e uma classe rara mal reconhecida derruba o resultado;
- **ponderada:** média pesada pelo **suporte**, o número de exemplos verdadeiros de cada classe; as classes grandes dominam.

Um detalhe útil: o recall ponderado é sempre igual à acurácia, porque cada classe contribui com os seus acertos. É por isso que o recall macro é o que expõe a classe esquecida.

O `classification_report` imprime tudo de uma vez. Com 10 mensagens fictícias em três classes:

```text
              precision    recall  f1-score   support

           a       0.67      0.67      0.67         3
           b       0.50      0.50      0.50         2
           c       0.80      0.80      0.80         5

    accuracy                           0.70        10
   macro avg       0.66      0.66      0.66        10
weighted avg       0.70      0.70      0.70        10
```

A linha `macro avg` dá o mesmo peso às classes `a`, `b` e `c`; a `weighted avg` pesa `c` 5 vezes e `b` 2 vezes. Ao relatar um resultado, diga qual média usou e mostre a métrica por classe: um resumo único esconde justamente a classe que interessa. O `recall_score(y, y_pred, average="macro")` e o `average="weighted"` calculam as duas médias. Uma classe que só aparece nas previsões, e nunca em `y`, não tem recall definido; o scikit-learn a inclui com 0 e avisa. No exercício, as classes são só as que aparecem em `y`.

## Passo 7 · Exercício · Custo e médias

Escreva o custo médio por uma matriz de custo e as duas médias do recall.

### Instruções
1. `custo_esperado(y, y_pred, matriz_custo)` recebe rótulos inteiros de `0` a `k - 1` e uma matriz de custo $k \times k$ (lista de listas) com `matriz_custo[i][j]` = custo de prever `j` quando a classe é `i`, e devolve o custo médio por exemplo como `float`. A diagonal também conta.
2. `recall_macro_e_ponderado(y, y_pred)` devolve a tupla `(macro, ponderado)` de `float`s. As classes são os rótulos distintos que aparecem em `y` (de qualquer tipo); o recall de cada uma é a fração dos seus exemplos que foi prevista corretamente, e a média ponderada usa como peso o número de exemplos de cada classe em `y`.

### Código inicial
```python
import numpy as np


def custo_esperado(y, y_pred, matriz_custo):
    pass


def recall_macro_e_ponderado(y, y_pred):
    pass
```

### Solução
```python
import numpy as np


def custo_esperado(y, y_pred, matriz_custo):
    custo = np.asarray(matriz_custo, dtype=float)
    return float(np.mean(custo[np.asarray(y), np.asarray(y_pred)]))


def recall_macro_e_ponderado(y, y_pred):
    y = np.asarray(y)
    y_pred = np.asarray(y_pred)
    classes, suporte = np.unique(y, return_counts=True)
    recalls = np.array([np.mean(y_pred[y == c] == c) for c in classes])
    return float(recalls.mean()), float(np.sum(recalls * suporte) / suporte.sum())
```

### Dicas
1. Com a matriz de custo como array, `custo[y, y_pred]` pega, de uma vez, o custo de cada exemplo (indexação por dois arrays de inteiros).
2. O `np.unique(y, return_counts=True)` devolve as classes e o suporte de cada uma.
3. O recall de uma classe só olha os exemplos cuja classe **verdadeira** é ela.

### Verificação
```json
[
  { "id": "custo-binario", "checkpoint": 1, "kind": "call", "function": "custo_esperado",
    "args": [[1, 1, 1, 1, 0, 0, 0, 0, 0, 0], [1, 1, 1, 0, 1, 1, 0, 0, 0, 0], [[0, 1], [20, 0]]], "expected": 2.2, "tolerance": 1e-9,
    "name": "2 alarmes falsos a 1 e uma fraude perdida a 20, em 10 exemplos",
    "hint": "A linha da matriz de custo é a classe verdadeira, e a coluna, a prevista." },
  { "id": "custo-diagonal", "checkpoint": 1, "kind": "call", "function": "custo_esperado",
    "args": [[1, 1, 1, 1, 0, 0, 0, 0, 0, 0], [1, 1, 1, 0, 1, 1, 0, 0, 0, 0], [[0, 1], [20, 3]]], "expected": 3.1, "tolerance": 1e-9,
    "name": "Revisar uma fraude verdadeira também custa (diagonal 3)",
    "hint": "Todas as células da matriz de custo entram na conta, inclusive a diagonal." },
  { "id": "custo-tres-classes", "checkpoint": 1, "kind": "call", "function": "custo_esperado",
    "args": [[0, 1, 2, 2, 1], [0, 2, 2, 1, 1], [[0, 1, 2], [1, 0, 1], [4, 2, 0]]], "expected": 0.6, "tolerance": 1e-9,
    "name": "Três classes: custo médio de 5 exemplos" },
  { "id": "custo-tipo", "checkpoint": 1, "kind": "call", "function": "custo_esperado",
    "args": [[0, 1], [1, 1], [[0, 2], [5, 0]]], "expected": 1.0, "type": "float", "tolerance": 1e-9,
    "name": "O custo médio é um float do Python" },
  { "id": "medias-tres-classes", "checkpoint": 2, "kind": "call", "function": "recall_macro_e_ponderado",
    "args": [["a", "a", "a", "b", "b", "c", "c", "c", "c", "c"], ["a", "b", "a", "b", "c", "c", "c", "a", "c", "c"]],
    "expected": [0.6555555555555556, 0.7], "tolerance": 1e-9,
    "name": "Recall macro e ponderado de três classes com suportes 3, 2 e 5",
    "hint": "A macro é a média simples dos três recalls; a ponderada pesa cada recall pelo número de exemplos verdadeiros da classe." },
  { "id": "medias-desbalanceado", "checkpoint": 2, "kind": "call", "function": "recall_macro_e_ponderado",
    "args": [["n", "n", "n", "n", "n", "n", "n", "n", "s", "s"], ["n", "n", "n", "n", "n", "n", "n", "n", "n", "n"]],
    "expected": [0.5, 0.8], "tolerance": 1e-9,
    "name": "A classe rara esquecida derruba a macro, não a ponderada",
    "hint": "O peso de cada classe é o número de exemplos em y, não o número de previsões." },
  { "id": "medias-rotulo-so-previsto", "checkpoint": 2, "kind": "call", "function": "recall_macro_e_ponderado",
    "args": [["a", "a", "b", "b"], ["a", "c", "b", "b"]], "expected": [0.75, 0.75], "tolerance": 1e-9,
    "name": "Um rótulo que só aparece nas previsões não entra nas médias" },
  { "id": "medias-referencia", "checkpoint": 2, "kind": "expr",
    "setup": "import numpy as np\nfrom sklearn.metrics import recall_score\nrng = np.random.default_rng(6)\ny = rng.integers(0, 4, 300)\np = np.where(rng.random(300) < 0.6, y, rng.integers(0, 4, 300))\nr = recall_macro_e_ponderado(y, p)",
    "expr": "bool(np.allclose(r, [recall_score(y, p, average='macro'), recall_score(y, p, average='weighted')], atol=1e-12))", "expected": true,
    "name": "Igual ao recall_score macro e weighted em 300 rótulos sorteados" },
  { "id": "medias-tipos", "checkpoint": 2, "kind": "expr",
    "setup": "r = recall_macro_e_ponderado(['x', 'y', 'y'], ['x', 'y', 'x'])",
    "expr": "[type(r).__name__, type(r[0]).__name__, type(r[1]).__name__]", "expected": ["tuple", "float", "float"],
    "name": "Devolve uma tupla de dois float" }
]
```

### Soluções erradas
```python name="matriz de custo transposta"
import numpy as np


def custo_esperado(y, y_pred, matriz_custo):
    custo = np.asarray(matriz_custo, dtype=float)
    return float(np.mean(custo[np.asarray(y_pred), np.asarray(y)]))


def recall_macro_e_ponderado(y, y_pred):
    y = np.asarray(y)
    y_pred = np.asarray(y_pred)
    classes, suporte = np.unique(y, return_counts=True)
    recalls = np.array([np.mean(y_pred[y == c] == c) for c in classes])
    return float(recalls.mean()), float(np.sum(recalls * suporte) / suporte.sum())
```
```python name="custo total no lugar do médio"
import numpy as np


def custo_esperado(y, y_pred, matriz_custo):
    custo = np.asarray(matriz_custo, dtype=float)
    return float(np.sum(custo[np.asarray(y), np.asarray(y_pred)]))


def recall_macro_e_ponderado(y, y_pred):
    y = np.asarray(y)
    y_pred = np.asarray(y_pred)
    classes, suporte = np.unique(y, return_counts=True)
    recalls = np.array([np.mean(y_pred[y == c] == c) for c in classes])
    return float(recalls.mean()), float(np.sum(recalls * suporte) / suporte.sum())
```
```python name="ignora a diagonal do custo"
import numpy as np


def custo_esperado(y, y_pred, matriz_custo):
    custo = np.asarray(matriz_custo, dtype=float)
    y = np.asarray(y)
    y_pred = np.asarray(y_pred)
    erros = y != y_pred
    return float(np.sum(custo[y[erros], y_pred[erros]]) / len(y))


def recall_macro_e_ponderado(y, y_pred):
    y = np.asarray(y)
    y_pred = np.asarray(y_pred)
    classes, suporte = np.unique(y, return_counts=True)
    recalls = np.array([np.mean(y_pred[y == c] == c) for c in classes])
    return float(recalls.mean()), float(np.sum(recalls * suporte) / suporte.sum())
```
```python name="macro e ponderada trocadas"
import numpy as np


def custo_esperado(y, y_pred, matriz_custo):
    custo = np.asarray(matriz_custo, dtype=float)
    return float(np.mean(custo[np.asarray(y), np.asarray(y_pred)]))


def recall_macro_e_ponderado(y, y_pred):
    y = np.asarray(y)
    y_pred = np.asarray(y_pred)
    classes, suporte = np.unique(y, return_counts=True)
    recalls = np.array([np.mean(y_pred[y == c] == c) for c in classes])
    return float(np.sum(recalls * suporte) / suporte.sum()), float(recalls.mean())
```
```python name="pesa pelo número de previsões"
import numpy as np


def custo_esperado(y, y_pred, matriz_custo):
    custo = np.asarray(matriz_custo, dtype=float)
    return float(np.mean(custo[np.asarray(y), np.asarray(y_pred)]))


def recall_macro_e_ponderado(y, y_pred):
    y = np.asarray(y)
    y_pred = np.asarray(y_pred)
    classes = np.unique(y)
    recalls = np.array([np.mean(y_pred[y == c] == c) for c in classes])
    pesos = np.array([np.sum(y_pred == c) for c in classes])
    return float(recalls.mean()), float(np.sum(recalls * pesos) / pesos.sum())
```
```python name="precisão no lugar do recall"
import numpy as np


def custo_esperado(y, y_pred, matriz_custo):
    custo = np.asarray(matriz_custo, dtype=float)
    return float(np.mean(custo[np.asarray(y), np.asarray(y_pred)]))


def recall_macro_e_ponderado(y, y_pred):
    y = np.asarray(y)
    y_pred = np.asarray(y_pred)
    classes, suporte = np.unique(y, return_counts=True)
    recalls = np.array([np.mean(y[y_pred == c] == c) for c in classes])
    return float(recalls.mean()), float(np.sum(recalls * suporte) / suporte.sum())
```
```python name="classes de y e das previsões juntas"
import numpy as np


def custo_esperado(y, y_pred, matriz_custo):
    custo = np.asarray(matriz_custo, dtype=float)
    return float(np.mean(custo[np.asarray(y), np.asarray(y_pred)]))


def recall_macro_e_ponderado(y, y_pred):
    y = np.asarray(y)
    y_pred = np.asarray(y_pred)
    classes = np.unique(np.concatenate([y, y_pred]))
    suporte = np.array([np.sum(y == c) for c in classes])
    recalls = np.array([np.mean(y_pred[y == c] == c) if np.any(y == c) else 0.0 for c in classes])
    return float(recalls.mean()), float(np.sum(recalls * suporte) / suporte.sum())
```

## Passo 8 · Quiz · Qual métrica para este problema

### Pergunta
Uma equipe fictícia compara dois modelos de fraude num dia com 2 000 transações e 10 fraudes. O modelo A tem acurácia 99,5 % e recall 0; o modelo B tem acurácia 97 %, recall 0,9 e precisão 0,13. Uma fraude perdida custa R\$ 200,00 e uma revisão manual custa R\$ 5,00. Qual escolher?
- [ ] O A, porque a acurácia dele é maior
- [x] O B: com 9 fraudes pegas e cerca de 60 alarmes falsos, ele custa uns R\$ 500,00 entre fraudes perdidas e revisões, contra R\$ 2 000,00 das 10 fraudes que o A deixa passar
- [ ] O A, porque a precisão de 0,13 do B quer dizer que ele erra 87 % das transações
- [ ] Nenhum dos dois: com classes tão desbalanceadas, nenhuma métrica é confiável
> O A nunca marca nada: a acurácia de 99,5 % é só a proporção de negativos. O B pega 9 das 10 fraudes; com precisão 0,13, ele marca cerca de 69 transações, 60 delas alarmes falsos (R\$ 300,00 de revisão), e perde 1 fraude (R\$ 200,00). A precisão baixa diz que 87 % das **marcações** são alarmes falsos, não 87 % das transações. Métricas por classe e custo resolvem o desbalanceamento; a acurácia é que não serve.

### Pergunta
Um filtro de mensagens fictício manda para a pasta de spam o que considera promoção indesejada. Os usuários reclamam muito mais de perder uma mensagem pessoal que caiu no spam do que de ver uma promoção na caixa de entrada. Com "spam" como classe positiva, qual métrica priorizar ao escolher o modelo?
- [ ] Recall, para pegar o máximo de spam
- [x] Precisão (ou um $F_\beta$ com $\beta < 1$): das mensagens que vão para o spam, quase todas precisam ser spam de fato
- [ ] Especificidade da classe spam, que é o mesmo que o recall
- [ ] Acurácia, porque os dois erros acontecem com a mesma frequência
> O erro caro é o falso positivo (mensagem pessoal marcada como spam), e é ele que entra no denominador da precisão. Priorizar o recall faria o filtro marcar mais, à custa de mais mensagens pessoais perdidas. A especificidade (fração dos não spam que passam) também olha os falsos positivos, mas não é o recall: é o recall da classe negativa. A frequência dos erros não decide nada quando os custos são diferentes.

### Pergunta
Um modelo de triagem tem esta matriz de confusão, com `confusion_matrix(y, y_pred)` e a classe 1 como positiva:

```text
[[50, 10],
 [ 5, 35]]
```

Qual é o recall da classe 1?
- [ ] $35/45 \approx 0{,}78$
- [x] $35/40 = 0{,}875$
- [ ] $50/60 \approx 0{,}83$
- [ ] $85/100 = 0{,}85$
> No scikit-learn as linhas são a classe verdadeira: a segunda linha tem os 40 positivos verdadeiros, dos quais 35 foram previstos como positivos. $35/45$ é a precisão (coluna dos previstos como 1); $50/60$ é a especificidade (linha dos negativos); $85/100$ é a acurácia.
