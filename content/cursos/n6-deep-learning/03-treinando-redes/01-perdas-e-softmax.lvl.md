---
slug: n6-m3-01-perdas-e-softmax
titulo: Funções de perda, softmax e entropia cruzada
descricao: MSE para regressão, entropia cruzada binária e categórica, softmax estável, o gradiente 'p − y' e a implementação vetorizada com rótulos inteiros.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
xp: 110
tempo_min: 45
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Implementar softmax e entropia cruzada estáveis e vetorizadas para lotes
- Derivar e implementar o gradiente da combinação softmax + entropia cruzada (p − y)
- Escolher a perda pela tarefa e interpretar seu valor (perda de 'chute' = log k)
---

## Passo 1 · Leitura · Uma perda para cada tarefa

Treinar uma rede é ajustar milhares de números para que **um** número caia: a perda. Ela resume o quanto as saídas da rede estão longe das respostas certas, e o gradiente dela é o ponto de partida de todo backward. Escolher a perda é dizer à rede o que conta como erro, e cada tipo de tarefa tem a sua.

Na **regressão**, a saída é um número qualquer, e a perda clássica é o erro quadrático médio do Nível 5:

$$
\text{MSE} = \frac{1}{n}\sum_{i=1}^{n}(\hat y_i - y_i)^2
$$

Ela pune os erros grandes muito mais que os pequenos: errar por 10 custa 100 vezes o que custa errar por 1.

Na **classificação binária**, a rede dá um logit $z$, e a sigmoide o transforma na probabilidade $p = \sigma(z)$ da classe 1. A entropia cruzada binária mede a surpresa com a resposta certa:

$$
\text{BCE} = -\frac{1}{n}\sum_{i=1}^{n}\big[y_i \ln p_i + (1 - y_i)\ln(1 - p_i)\big]
$$

Com $k$ **classes**, a rede dá $k$ logits por exemplo, e a softmax os transforma numa distribuição. A perda olha só a probabilidade da classe certa, $y_i$:

$$
p_{ij} = \frac{e^{z_{ij}}}{\sum_{c=1}^{k} e^{z_{ic}}}, \qquad \text{CE} = -\frac{1}{n}\sum_{i=1}^{n} \ln p_{i, y_i}
$$

Se a rede dá 0,9 à classe certa, aquele exemplo custa $-\ln 0{,}9 \approx 0{,}105$; se dá 0,01, custa $4{,}6$. Uma rede confiante e errada paga caro, e é essa conta que empurra o treino.

```python
import numpy as np

logits = np.array([2.0, 1.0, 0.1])
p = np.exp(logits) / np.exp(logits).sum()
print(p.round(3).tolist())              # [0.659, 0.242, 0.099]
print(round(float(-np.log(p[0])), 3))   # 0.417, se a classe certa é a 0
```

Por que não usar o MSE também na classificação? Com a softmax na frente, o gradiente do MSE fica pequeno justamente quando a rede dá quase zero à classe certa: o exemplo mais errado é o que menos ensina, e o treino se arrasta. O gradiente da entropia cruzada, como o passo 4 mostra, cresce com o erro.

A armadilha desta lição é numérica. A softmax faz $e^{z}$, e no executor `np.exp(1000.0)` dá `inf` sem aviso nenhum. Subtrair o máximo resolve a softmax, como você viu no Nível 5, mas não resolve o **logaritmo** dela: uma probabilidade pequena demais vira `0.0`, e o log de zero é `-inf`. Uma perda infinita num único exemplo vira infinita na média, e o treino perde o rumo sem nenhuma mensagem de erro.

## Passo 2 · Previsão · O log da softmax

A função `softmax` abaixo já subtrai o máximo, então não estoura. O programa calcula o log das probabilidades de dois jeitos. Leia sem executar e digite o que ele imprime.

### Código
```python
import numpy as np


def softmax(z):
    e = np.exp(z - z.max())
    return e / e.sum()


z = np.array([1000.0, 0.0, -1000.0])
p = softmax(z)
print(p.tolist())
print(np.log(p).tolist())
m = z.max()
log_p = z - m - np.log(np.exp(z - m).sum())
print(log_p.tolist())
print(round(float(np.exp(log_p).sum()), 4))
```

### Dicas
1. Depois de subtrair o máximo, os expoentes são 0, -1000 e -2000, e `np.exp(-1000.0)` é tão pequeno que vira `0.0`.
2. `np.log(0.0)` dá `-inf`, sem erro; uma lista com ele imprime `-inf`.
3. Na segunda conta, a soma dentro do log é 1 mais quase nada, e o log de 1 é 0.

### Saída esperada
```text
[1.0, 0.0, 0.0]
[0.0, -inf, -inf]
[0.0, -1000.0, -2000.0]
1.0
```

## Passo 3 · Exercício · softmax e log_softmax estáveis
modo: lacunas

Complete as lacunas (`___`). As duas funções recebem uma matriz de logits `Z` de forma `(n, k)`, um exemplo por linha, e trabalham **linha a linha**. O `log_softmax` calcula o log das probabilidades sem passar por elas:

$$
\log \text{softmax}(z)_j = (z_j - m) - \ln \sum_{c=1}^{k} e^{z_c - m}, \qquad m = \max_c z_c
$$

### Instruções
1. `softmax(Z)` subtrai de cada linha o máximo **daquela linha** antes da exponencial (um array de forma `(n, 1)`, para o broadcasting).
2. Divide cada linha pela soma da própria linha, de modo que toda linha some 1, e não altera `Z`.
3. `log_softmax(Z)` devolve `Zc` menos o log da soma das exponenciais de `Zc` em cada linha, sem calcular o log de uma probabilidade.

### Código inicial
```python
import numpy as np


def softmax(Z):
    Zc = Z - ___
    E = np.exp(Zc)
    return E / ___


def log_softmax(Z):
    Zc = Z - Z.max(axis=1, keepdims=True)
    return ___
```

### Solução
```python
import numpy as np


def softmax(Z):
    Zc = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Zc)
    return E / E.sum(axis=1, keepdims=True)


def log_softmax(Z):
    Zc = Z - Z.max(axis=1, keepdims=True)
    return Zc - np.log(np.exp(Zc).sum(axis=1, keepdims=True))
```

### Dicas
1. `Z.max(axis=1, keepdims=True)` tem forma `(n, 1)`: um máximo por linha, pronto para o broadcasting.
2. Sem `keepdims=True`, a soma por linha tem forma `(n,)`, e `(n, k) / (n,)` divide as colunas, não as linhas.
3. No `log_softmax`, o log é aplicado à soma das exponenciais, que é pelo menos 1 depois de subtrair o máximo, e nunca a uma probabilidade.

### Verificação
```json
[
  { "id": "softmax-valores", "checkpoint": 2, "kind": "expr",
    "setup": "import numpy as np",
    "expr": "softmax(np.array([[1.0, 2.0, 3.0]])).tolist()", "expected": [[0.09003057317038046, 0.24472847105479764, 0.6652409557748218]], "tolerance": 1e-12,
    "name": "softmax de uma linha [1, 2, 3]" },
  { "id": "softmax-soma-1", "checkpoint": 2, "kind": "expr",
    "setup": "import numpy as np\nr = np.random.default_rng(0)\nP = softmax(3 * r.normal(size=(5, 4)))",
    "expr": "[list(P.shape), bool(np.allclose(P.sum(axis=1), 1.0)), bool((P > 0).all())]", "expected": [[5, 4], true, true],
    "name": "Com 5 exemplos e 4 classes, cada linha soma 1 e tudo é positivo",
    "hint": "A lista diz a forma, se cada linha soma 1 e se todas as probabilidades são positivas." },
  { "id": "softmax-grandes", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np",
    "expr": "softmax(np.array([[1000.0, 1001.0, 1002.0]])).tolist()", "expected": [[0.09003057317038046, 0.24472847105479764, 0.6652409557748218]], "tolerance": 1e-12,
    "name": "Logits 1000, 1001 e 1002 dão o mesmo que 0, 1 e 2, sem nan" },
  { "id": "softmax-escalas", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np",
    "expr": "softmax(np.array([[0.0, 1.0], [1000.0, 1001.0]])).tolist()", "expected": [[0.2689414213699951, 0.7310585786300049], [0.2689414213699951, 0.7310585786300049]], "tolerance": 1e-12,
    "name": "Duas linhas em escalas muito diferentes dão a mesma distribuição",
    "hint": "O máximo subtraído precisa ser o de cada linha, não o da matriz inteira." },
  { "id": "softmax-quadrada", "checkpoint": 2, "kind": "expr",
    "setup": "import numpy as np",
    "expr": "softmax(np.array([[1.0, 2.0, 3.0], [3.0, 1.0, 2.0], [0.0, 0.0, 0.0]])).tolist()", "expected": [[0.09003057317038046, 0.24472847105479764, 0.6652409557748218], [0.6652409557748218, 0.09003057317038046, 0.24472847105479764], [0.3333333333333333, 0.3333333333333333, 0.3333333333333333]], "tolerance": 1e-12,
    "name": "Matriz 3 × 3 (n igual a k): cada linha dividida pela própria soma",
    "hint": "Com n igual a k, uma soma sem keepdims não dá erro de forma, mas divide pelas somas na direção errada." },
  { "id": "softmax-intacto", "checkpoint": 2, "kind": "expr",
    "setup": "import numpy as np\nZ = np.array([[5.0, -1.0], [0.5, 2.0]])\nZ0 = Z.copy()\nsoftmax(Z)\nlog_softmax(Z)",
    "expr": "bool(np.array_equal(Z, Z0))", "expected": true,
    "name": "Z não muda" },
  { "id": "log-softmax-valores", "checkpoint": 3, "kind": "expr",
    "setup": "import numpy as np",
    "expr": "log_softmax(np.array([[1.0, 2.0, 3.0]])).tolist()", "expected": [[-2.4076059644443806, -1.4076059644443804, -0.4076059644443804]], "tolerance": 1e-12,
    "name": "log_softmax de uma linha [1, 2, 3]" },
  { "id": "log-softmax-extremos", "checkpoint": 3, "kind": "expr",
    "setup": "import numpy as np",
    "expr": "log_softmax(np.array([[1000.0, 0.0, -1000.0]])).tolist()", "expected": [[0.0, -1000.0, -2000.0]], "tolerance": 1e-9,
    "name": "Logits 1000, 0 e -1000 dão 0, -1000 e -2000, sem -inf",
    "hint": "O log de uma probabilidade que virou 0.0 é -inf: some no espaço do log." },
  { "id": "log-softmax-escalas", "checkpoint": 3, "kind": "expr",
    "setup": "import numpy as np",
    "expr": "log_softmax(np.array([[0.0, 1.0], [1000.0, 1001.0]])).tolist()", "expected": [[-1.3132616875182228, -0.31326168751822286], [-1.3132616875182228, -0.31326168751822286]], "tolerance": 1e-12,
    "name": "log_softmax linha a linha em escalas diferentes" },
  { "id": "log-softmax-exp", "checkpoint": 3, "kind": "expr",
    "setup": "import numpy as np\nr = np.random.default_rng(1)\nZ = 4 * r.normal(size=(6, 5))",
    "expr": "[list(log_softmax(Z).shape), bool(np.allclose(np.exp(log_softmax(Z)), softmax(Z)))]", "expected": [[6, 5], true],
    "name": "exp(log_softmax(Z)) é a softmax de Z, com a mesma forma" }
]
```

### Soluções erradas
```python name="máximo da matriz inteira"
import numpy as np


def softmax(Z):
    Zc = Z - Z.max()
    E = np.exp(Zc)
    return E / E.sum(axis=1, keepdims=True)


def log_softmax(Z):
    Zc = Z - Z.max(axis=1, keepdims=True)
    return Zc - np.log(np.exp(Zc).sum(axis=1, keepdims=True))
```
```python name="máximo de cada coluna"
import numpy as np


def softmax(Z):
    Zc = Z - Z.max(axis=0, keepdims=True)
    E = np.exp(Zc)
    return E / E.sum(axis=1, keepdims=True)


def log_softmax(Z):
    Zc = Z - Z.max(axis=1, keepdims=True)
    return Zc - np.log(np.exp(Zc).sum(axis=1, keepdims=True))
```
```python name="divide pela soma de tudo"
import numpy as np


def softmax(Z):
    Zc = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Zc)
    return E / E.sum()


def log_softmax(Z):
    Zc = Z - Z.max(axis=1, keepdims=True)
    return Zc - np.log(np.exp(Zc).sum(axis=1, keepdims=True))
```
```python name="soma por linha sem keepdims"
import numpy as np


def softmax(Z):
    Zc = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Zc)
    return E / E.sum(axis=1)


def log_softmax(Z):
    Zc = Z - Z.max(axis=1, keepdims=True)
    return Zc - np.log(np.exp(Zc).sum(axis=1, keepdims=True))
```
```python name="log da softmax"
import numpy as np


def softmax(Z):
    Zc = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Zc)
    return E / E.sum(axis=1, keepdims=True)


def log_softmax(Z):
    Zc = Z - Z.max(axis=1, keepdims=True)
    return np.log(np.exp(Zc) / np.exp(Zc).sum(axis=1, keepdims=True))
```
```python name="soma das exponenciais sem subtrair o máximo"
import numpy as np


def softmax(Z):
    Zc = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Zc)
    return E / E.sum(axis=1, keepdims=True)


def log_softmax(Z):
    Zc = Z - Z.max(axis=1, keepdims=True)
    return Zc - np.log(np.exp(Z).sum(axis=1, keepdims=True))
```

## Passo 4 · Leitura · Rótulos inteiros e o gradiente P − Y

Com $n$ exemplos, os rótulos chegam como um vetor de inteiros `y`, com valores de 0 a $k - 1$. A entropia cruzada precisa, de cada linha $i$, só a coluna `y[i]`, e a indexação avançada do Nível 4 pega todas de uma vez, sem one-hot e sem laço:

```python
lp = log_softmax(Z)                    # (n, k)
perda = -lp[np.arange(n), y].mean()    # linha i, coluna y[i]
```

Os rótulos precisam ser inteiros. Com `y = np.array([0.0, 1.0])`, a indexação levanta `IndexError: arrays used as indices must be of integer (or boolean) type`: rótulos lidos de um arquivo como `float` precisam de `.astype(np.intp)`.

O gradiente da perda em relação aos **logits** é o mesmo do Nível 5, sem o $X^\top$ na frente, porque agora quem vem antes não é uma regressão, e sim a rede inteira:

$$
\frac{\partial L}{\partial Z} = \frac{1}{n}(P - Y), \qquad Y_{ij} = \begin{cases} 1 & j = y_i \\ 0 & \text{caso contrário} \end{cases}
$$

Em código, também sem one-hot: copie $P$, subtraia 1 na posição certa de cada linha e divida por $n$. O $\frac{1}{n}$ está ali porque a perda é uma **média**; quem esquece a divisão treina com um gradiente $n$ vezes maior, e a taxa que funcionava com lote 32 diverge com lote 512. Note como o gradiente cresce com o erro: se a rede dá 0,01 à classe certa, a entrada dela vale $-0{,}99 / n$, a maior possível.

Quando um one-hot é necessário, o $k$ é o número de **classes** do problema, e não `y.max() + 1`: um lote em que a última classe não aparece produziria uma matriz com colunas a menos.

Esse $\frac{1}{n}(P - Y)$ dá o primeiro teste de sanidade de todo treino. Uma rede recém-inicializada, com logits pequenos, dá probabilidades perto de $1/k$ para todas as classes, e a perda esperada é a **perda de chute**:

$$
L_\text{chute} = -\ln \frac{1}{k} = \ln k
$$

Com 10 classes, $\ln 10 \approx 2{,}30$. Se o seu primeiro lote mostra 23, a inicialização está dando logits enormes, e a rede começa "confiante e errada". A `rede.py` deste módulo, com 3 classes, começa em 1,26, perto de $\ln 3 \approx 1{,}10$: sinal de que nada está gritantemente errado.

## Passo 5 · Exercício · Entropia cruzada e gradiente

O `softmax` e o `log_softmax` do passo anterior já estão no código. Escreva as três funções novas.

### Instruções
1. `entropia_cruzada(Z, y)` recebe logits `(n, k)` e rótulos inteiros `(n,)` e devolve a perda média como `float` do Python, usando `log_softmax` (finita mesmo com logits 1000).
2. `grad_entropia_cruzada(Z, y)` devolve $\frac{1}{n}(P - Y)$, com a forma de `Z` (`k` é o número de colunas de `Z`), sem alterar `Z`.
3. `perda_de_chute(k)` devolve $\ln k$ como `float`.

### Código inicial
```python
import math

import numpy as np


def softmax(Z):
    Zc = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Zc)
    return E / E.sum(axis=1, keepdims=True)


def log_softmax(Z):
    Zc = Z - Z.max(axis=1, keepdims=True)
    return Zc - np.log(np.exp(Zc).sum(axis=1, keepdims=True))


def entropia_cruzada(Z, y):
    pass


def grad_entropia_cruzada(Z, y):
    pass


def perda_de_chute(k):
    pass
```

### Solução
```python
import math

import numpy as np


def softmax(Z):
    Zc = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Zc)
    return E / E.sum(axis=1, keepdims=True)


def log_softmax(Z):
    Zc = Z - Z.max(axis=1, keepdims=True)
    return Zc - np.log(np.exp(Zc).sum(axis=1, keepdims=True))


def entropia_cruzada(Z, y):
    n = len(y)
    return float(-log_softmax(Z)[np.arange(n), y].mean())


def grad_entropia_cruzada(Z, y):
    n = len(y)
    G = softmax(Z)
    G[np.arange(n), y] -= 1.0
    return G / n


def perda_de_chute(k):
    return math.log(k)
```

### Dicas
1. `log_softmax(Z)[np.arange(n), y]` pega, de cada linha, o log da probabilidade da classe certa.
2. A softmax devolve um array novo: você pode subtrair 1 nele sem mexer em `Z`. A posição de cada linha é `[np.arange(n), y]`, e não `[:, y]`.
3. A perda é uma média, então o gradiente também é dividido por $n$.

### Verificação
```json
[
  { "id": "ce-valor", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np",
    "expr": "entropia_cruzada(np.array([[2.0, 1.0, 0.1], [0.5, 2.5, 0.0]]), np.array([0, 1]))", "expected": 0.30688205659872536, "type": "float", "tolerance": 1e-12,
    "name": "Perda média de dois exemplos com 3 classes" },
  { "id": "ce-grandes", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np",
    "expr": "entropia_cruzada(np.array([[1000.0, 0.0, -1000.0], [0.0, 1000.0, 0.0]]), np.array([1, 1]))", "expected": 500.0, "type": "float", "tolerance": 1e-9,
    "name": "Com logits 1000, a perda é finita: (1000 + 0) / 2",
    "hint": "Calcule a perda a partir do log_softmax, nunca do log da softmax." },
  { "id": "ce-uniforme", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np",
    "expr": "entropia_cruzada(np.zeros((4, 10)), np.array([0, 3, 9, 3]))", "expected": 2.302585092994046, "type": "float", "tolerance": 1e-12,
    "name": "Logits todos zero com 10 classes dão ln 10",
    "hint": "A perda é a média sobre os exemplos, não a soma." },
  { "id": "ce-rotulos-int32", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np\nr = np.random.default_rng(2)\nZ = r.normal(size=(6, 3))\ny = np.repeat(np.arange(3), 2)\n_lp = Z - Z.max(axis=1, keepdims=True)\n_lp = _lp - np.log(np.exp(_lp).sum(axis=1, keepdims=True))\n_ref = -np.mean([_lp[i, y[i]] for i in range(6)])",
    "expr": "bool(abs(entropia_cruzada(Z, y) - _ref) < 1e-12)", "expected": true,
    "name": "Rótulos int32 vindos de np.repeat: o mesmo valor de uma referência com laço",
    "hint": "O valor foi comparado com a média, exemplo a exemplo, do log da probabilidade da classe certa." },
  { "id": "grad-valor", "checkpoint": 2, "kind": "expr",
    "setup": "import numpy as np",
    "expr": "grad_entropia_cruzada(np.array([[0.0, 0.0], [0.0, np.log(3.0)]]), np.array([0, 1])).tolist()", "expected": [[-0.25, 0.25], [0.125, -0.125]], "tolerance": 1e-12,
    "name": "Gradiente de dois exemplos com 2 classes",
    "hint": "Cada linha é P menos o one-hot do rótulo, e tudo dividido por n." },
  { "id": "grad-numerico", "checkpoint": 2, "kind": "expr",
    "setup": "import numpy as np\nr = np.random.default_rng(3)\nZ = r.normal(size=(5, 4))\ny = np.array([0, 3, 1, 1, 2])\ndef _ce():\n    Zc = Z - Z.max(axis=1, keepdims=True)\n    lp = Zc - np.log(np.exp(Zc).sum(axis=1, keepdims=True))\n    return float(-lp[np.arange(5), y].mean())\ndef _numerico(M, h=1e-5):\n    g = np.zeros_like(M)\n    for i in np.ndindex(M.shape):\n        v = M[i]\n        M[i] = v + h\n        a = _ce()\n        M[i] = v - h\n        c = _ce()\n        M[i] = v\n        g[i] = (a - c) / (2 * h)\n    return g\ndef _erro(a, n):\n    return float(np.linalg.norm(a - n) / max(np.linalg.norm(a) + np.linalg.norm(n), 1e-8))\nG = grad_entropia_cruzada(Z, y)",
    "expr": "_erro(G, _numerico(Z)) < 1e-7", "expected": true,
    "name": "O gradiente bate com a diferença central da entropia cruzada (5 exemplos, 4 classes)",
    "hint": "O valor diz se o erro relativo entre o seu gradiente e o numérico ficou abaixo de 1e-7." },
  { "id": "grad-linhas", "checkpoint": 2, "kind": "expr",
    "setup": "import numpy as np\nr = np.random.default_rng(4)\nG = grad_entropia_cruzada(2 * r.normal(size=(7, 3)), np.array([0, 1, 2, 2, 1, 0, 0]))",
    "expr": "[list(G.shape), bool(np.allclose(G.sum(axis=1), 0.0))]", "expected": [[7, 3], true],
    "name": "Cada linha do gradiente soma zero",
    "hint": "As probabilidades de uma linha somam 1, e o one-hot também: a diferença soma 0." },
  { "id": "grad-classe-ausente", "checkpoint": 2, "kind": "expr",
    "setup": "import numpy as np",
    "expr": "grad_entropia_cruzada(np.zeros((2, 4)), np.array([0, 1])).tolist()", "expected": [[-0.375, 0.125, 0.125, 0.125], [0.125, -0.375, 0.125, 0.125]], "tolerance": 1e-12,
    "name": "4 classes num lote em que só aparecem as classes 0 e 1",
    "hint": "O número de classes vem do número de colunas de Z, não do maior rótulo do lote." },
  { "id": "grad-intacto", "checkpoint": 2, "kind": "expr",
    "setup": "import numpy as np\nZ = np.array([[1.0, 2.0], [3.0, -1.0]])\nZ0 = Z.copy()\ngrad_entropia_cruzada(Z, np.array([1, 0]))\nentropia_cruzada(Z, np.array([1, 0]))",
    "expr": "bool(np.array_equal(Z, Z0))", "expected": true,
    "name": "Z não muda" },
  { "id": "chute-10", "checkpoint": 3, "kind": "call", "function": "perda_de_chute", "args": [10], "expected": 2.302585092994046, "type": "float", "tolerance": 1e-12,
    "name": "perda_de_chute(10) é ln 10",
    "hint": "Com k classes igualmente prováveis, a classe certa recebe 1/k." },
  { "id": "chute-2", "checkpoint": 3, "kind": "call", "function": "perda_de_chute", "args": [2], "expected": 0.6931471805599453, "type": "float", "tolerance": 1e-12,
    "name": "perda_de_chute(2) é ln 2" }
]
```

### Soluções erradas
```python name="log da softmax na perda"
import math

import numpy as np


def softmax(Z):
    Zc = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Zc)
    return E / E.sum(axis=1, keepdims=True)


def log_softmax(Z):
    Zc = Z - Z.max(axis=1, keepdims=True)
    return Zc - np.log(np.exp(Zc).sum(axis=1, keepdims=True))


def entropia_cruzada(Z, y):
    n = len(y)
    return float(-np.log(softmax(Z))[np.arange(n), y].mean())


def grad_entropia_cruzada(Z, y):
    n = len(y)
    G = softmax(Z)
    G[np.arange(n), y] -= 1.0
    return G / n


def perda_de_chute(k):
    return math.log(k)
```
```python name="soma no lugar da média"
import math

import numpy as np


def softmax(Z):
    Zc = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Zc)
    return E / E.sum(axis=1, keepdims=True)


def log_softmax(Z):
    Zc = Z - Z.max(axis=1, keepdims=True)
    return Zc - np.log(np.exp(Zc).sum(axis=1, keepdims=True))


def entropia_cruzada(Z, y):
    n = len(y)
    return float(-log_softmax(Z)[np.arange(n), y].sum())


def grad_entropia_cruzada(Z, y):
    n = len(y)
    G = softmax(Z)
    G[np.arange(n), y] -= 1.0
    return G / n


def perda_de_chute(k):
    return math.log(k)
```
```python name="gradiente sem subtrair 1"
import math

import numpy as np


def softmax(Z):
    Zc = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Zc)
    return E / E.sum(axis=1, keepdims=True)


def log_softmax(Z):
    Zc = Z - Z.max(axis=1, keepdims=True)
    return Zc - np.log(np.exp(Zc).sum(axis=1, keepdims=True))


def entropia_cruzada(Z, y):
    n = len(y)
    return float(-log_softmax(Z)[np.arange(n), y].mean())


def grad_entropia_cruzada(Z, y):
    n = len(y)
    G = softmax(Z)
    return G / n


def perda_de_chute(k):
    return math.log(k)
```
```python name="subtrai 1 nas colunas inteiras"
import math

import numpy as np


def softmax(Z):
    Zc = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Zc)
    return E / E.sum(axis=1, keepdims=True)


def log_softmax(Z):
    Zc = Z - Z.max(axis=1, keepdims=True)
    return Zc - np.log(np.exp(Zc).sum(axis=1, keepdims=True))


def entropia_cruzada(Z, y):
    n = len(y)
    return float(-log_softmax(Z)[np.arange(n), y].mean())


def grad_entropia_cruzada(Z, y):
    n = len(y)
    G = softmax(Z)
    G[:, y] -= 1.0
    return G / n


def perda_de_chute(k):
    return math.log(k)
```
```python name="one-hot com y.max() + 1 classes"
import math

import numpy as np


def softmax(Z):
    Zc = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Zc)
    return E / E.sum(axis=1, keepdims=True)


def log_softmax(Z):
    Zc = Z - Z.max(axis=1, keepdims=True)
    return Zc - np.log(np.exp(Zc).sum(axis=1, keepdims=True))


def entropia_cruzada(Z, y):
    n = len(y)
    return float(-log_softmax(Z)[np.arange(n), y].mean())


def grad_entropia_cruzada(Z, y):
    n = len(y)
    Y = np.eye(y.max() + 1)[y]
    return (softmax(Z) - Y) / n


def perda_de_chute(k):
    return math.log(k)
```
```python name="gradiente sem dividir por n"
import math

import numpy as np


def softmax(Z):
    Zc = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Zc)
    return E / E.sum(axis=1, keepdims=True)


def log_softmax(Z):
    Zc = Z - Z.max(axis=1, keepdims=True)
    return Zc - np.log(np.exp(Zc).sum(axis=1, keepdims=True))


def entropia_cruzada(Z, y):
    n = len(y)
    return float(-log_softmax(Z)[np.arange(n), y].mean())


def grad_entropia_cruzada(Z, y):
    n = len(y)
    G = softmax(Z)
    G[np.arange(n), y] -= 1.0
    return G


def perda_de_chute(k):
    return math.log(k)
```
```python name="perda de chute como a probabilidade 1/k"
import math

import numpy as np


def softmax(Z):
    Zc = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Zc)
    return E / E.sum(axis=1, keepdims=True)


def log_softmax(Z):
    Zc = Z - Z.max(axis=1, keepdims=True)
    return Zc - np.log(np.exp(Zc).sum(axis=1, keepdims=True))


def entropia_cruzada(Z, y):
    n = len(y)
    return float(-log_softmax(Z)[np.arange(n), y].mean())


def grad_entropia_cruzada(Z, y):
    n = len(y)
    G = softmax(Z)
    G[np.arange(n), y] -= 1.0
    return G / n


def perda_de_chute(k):
    return 1 / k
```

## Passo 6 · Leitura · Pesos por classe

Imagine um detector de defeitos numa linha de montagem fictícia: 95 % das peças são boas e 5 % têm defeito. Uma rede que responde "boa" para tudo acerta 95 % e tem uma entropia cruzada baixa, porque quase todos os exemplos são da classe fácil. O gradiente médio é dominado pela classe comum, e a rara quase não ensina nada.

Uma saída é dar **pesos por classe**: cada exemplo entra na média com o peso $w_{y_i}$ da classe dele, e a média passa a ser ponderada, dividida pela **soma dos pesos dos exemplos do lote**:

$$
L = \frac{\sum_{i=1}^{n} w_{y_i}\, \ell_i}{\sum_{i=1}^{n} w_{y_i}}, \qquad \ell_i = -\ln p_{i, y_i}
$$

O gradiente segue a mesma conta: cada linha de $P - Y$ é multiplicada pelo peso do **exemplo** (o da classe certa dele), e o total é dividido pela mesma soma:

$$
\frac{\partial L}{\partial Z_i} = \frac{w_{y_i}\,(P_i - Y_i)}{\sum_{j=1}^{n} w_{y_j}}
$$

```python
w = pesos[y]                 # um peso por exemplo, (n,)
perda = (w * l).sum() / w.sum()
G = w[:, None] * (P - Y) / w.sum()
```

Por que dividir pela soma dos pesos, e não por $n$? Porque assim a perda continua sendo uma média: com todos os pesos iguais a 1, ela é a entropia cruzada comum; multiplicar todos os pesos por 10 não muda nada; e um peso zero simplesmente tira os exemplos daquela classe da conta, como se não estivessem no lote. Dividir por $n$ faria a escala da perda depender dos pesos, e a taxa de aprendizado teria de ser reajustada a cada troca de pesos.

Dois enganos comuns. Os pesos são **por classe**, um vetor de tamanho $k$, mas a conta precisa de um peso **por exemplo**, `pesos[y]`; multiplicar a matriz $(n, k)$ direto pelo vetor $(k,)$ roda sem erro e pondera as **colunas**, o que não tem sentido. E somar os pesos das classes, `pesos.sum()`, não é o mesmo que somar os pesos dos exemplos.

Uma escolha comum é o peso inversamente proporcional à frequência, $w_c = \frac{n}{k\, n_c}$: no exemplo das peças, 0,53 para as boas e 10 para as com defeito. O preço é que as probabilidades da rede deixam de ser calibradas: ela passa a superestimar a classe rara, e o limiar de decisão precisa ser escolhido na validação, como no Nível 5.

## Passo 7 · Exercício · Entropia cruzada ponderada

O `softmax`, o `log_softmax` e a `entropia_cruzada` já estão no código. `pesos` é um array de tamanho `k`, um peso por classe.

### Instruções
1. `entropia_ponderada(Z, y, pesos)` devolve, como `float`, a média das perdas dos exemplos ponderada pelo peso da classe de cada exemplo, dividida pela soma desses pesos.
2. Com todos os pesos iguais, o resultado é a entropia cruzada comum; um peso zero tira da conta os exemplos daquela classe.
3. `grad_entropia_ponderada(Z, y, pesos)` devolve o gradiente dessa perda em relação a `Z`, com a forma de `Z`: cada linha de $P - Y$ multiplicada pelo peso do seu exemplo e dividida pela mesma soma.

### Código inicial
```python
import numpy as np


def softmax(Z):
    Zc = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Zc)
    return E / E.sum(axis=1, keepdims=True)


def log_softmax(Z):
    Zc = Z - Z.max(axis=1, keepdims=True)
    return Zc - np.log(np.exp(Zc).sum(axis=1, keepdims=True))


def entropia_cruzada(Z, y):
    n = len(y)
    return float(-log_softmax(Z)[np.arange(n), y].mean())


def entropia_ponderada(Z, y, pesos):
    pass


def grad_entropia_ponderada(Z, y, pesos):
    pass
```

### Solução
```python
import numpy as np


def softmax(Z):
    Zc = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Zc)
    return E / E.sum(axis=1, keepdims=True)


def log_softmax(Z):
    Zc = Z - Z.max(axis=1, keepdims=True)
    return Zc - np.log(np.exp(Zc).sum(axis=1, keepdims=True))


def entropia_cruzada(Z, y):
    n = len(y)
    return float(-log_softmax(Z)[np.arange(n), y].mean())


def entropia_ponderada(Z, y, pesos):
    n = len(y)
    w = pesos[y]
    perdas = -log_softmax(Z)[np.arange(n), y]
    return float((w * perdas).sum() / w.sum())


def grad_entropia_ponderada(Z, y, pesos):
    n = len(y)
    w = pesos[y]
    G = softmax(Z)
    G[np.arange(n), y] -= 1.0
    return w[:, None] * G / w.sum()
```

### Dicas
1. `pesos[y]` transforma o peso de cada classe num peso de cada exemplo, um vetor de tamanho $n$.
2. Para multiplicar cada linha de uma matriz $(n, k)$ por um número diferente, o vetor precisa da forma $(n, 1)$: `w[:, None]`.
3. O denominador é a soma dos pesos dos exemplos, na perda e no gradiente.

### Verificação
```json
[
  { "id": "pond-valor", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np",
    "expr": "entropia_ponderada(np.array([[2.0, 0.0], [0.0, 1.0], [1.0, 1.0]]), np.array([0, 1, 1]), np.array([1.0, 3.0]))", "expected": 0.4494506593253539, "type": "float", "tolerance": 1e-12,
    "name": "Três exemplos com pesos 1 e 3 por classe" },
  { "id": "pond-iguais", "checkpoint": 2, "kind": "expr",
    "setup": "import numpy as np\nr = np.random.default_rng(5)\nZ = r.normal(size=(8, 3))\ny = np.array([0, 1, 2, 2, 1, 0, 0, 2])",
    "expr": "abs(entropia_ponderada(Z, y, np.ones(3)) - entropia_cruzada(Z, y)) < 1e-12", "expected": true,
    "name": "Com pesos todos 1, é a entropia cruzada comum",
    "hint": "Com pesos iguais, a média ponderada é a média comum: confira o denominador." },
  { "id": "pond-escala", "checkpoint": 2, "kind": "expr",
    "setup": "import numpy as np\nr = np.random.default_rng(6)\nZ = r.normal(size=(6, 3))\ny = np.array([0, 1, 2, 2, 1, 0])\np = np.array([0.5, 2.0, 1.0])",
    "expr": "abs(entropia_ponderada(Z, y, 10 * p) - entropia_ponderada(Z, y, p)) < 1e-12", "expected": true,
    "name": "Multiplicar todos os pesos por 10 não muda a perda" },
  { "id": "pond-zero", "checkpoint": 2, "kind": "expr",
    "setup": "import numpy as np\nr = np.random.default_rng(7)\nZ = r.normal(size=(7, 3))\ny = np.array([0, 2, 1, 2, 0, 1, 2])\nfica = y != 2",
    "expr": "abs(entropia_ponderada(Z, y, np.array([1.0, 1.0, 0.0])) - entropia_cruzada(Z[fica], y[fica])) < 1e-12", "expected": true,
    "name": "Peso zero na classe 2 dá a entropia comum dos exemplos das classes 0 e 1",
    "hint": "Um peso zero precisa sumir também do denominador." },
  { "id": "pond-tipo", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np",
    "expr": "type(entropia_ponderada(np.zeros((2, 2)), np.array([0, 1]), np.array([1.0, 2.0]))).__name__", "expected": "float",
    "name": "Devolve um float do Python" },
  { "id": "gpond-valor", "checkpoint": 3, "kind": "expr",
    "setup": "import numpy as np",
    "expr": "grad_entropia_ponderada(np.zeros((2, 2)), np.array([0, 1]), np.array([1.0, 3.0])).tolist()", "expected": [[-0.125, 0.125], [0.375, -0.375]], "tolerance": 1e-12,
    "name": "Gradiente de dois exemplos com pesos 1 e 3",
    "hint": "Cada linha de P - Y é multiplicada pelo peso do próprio exemplo." },
  { "id": "gpond-numerico", "checkpoint": 3, "kind": "expr",
    "setup": "import numpy as np\nr = np.random.default_rng(8)\nZ = r.normal(size=(6, 3))\ny = np.array([0, 2, 1, 1, 2, 0])\np = np.array([0.5, 2.0, 4.0])\ndef _perda():\n    Zc = Z - Z.max(axis=1, keepdims=True)\n    lp = Zc - np.log(np.exp(Zc).sum(axis=1, keepdims=True))\n    w = p[y]\n    return float((w * -lp[np.arange(6), y]).sum() / w.sum())\ndef _numerico(M, h=1e-5):\n    g = np.zeros_like(M)\n    for i in np.ndindex(M.shape):\n        v = M[i]\n        M[i] = v + h\n        a = _perda()\n        M[i] = v - h\n        c = _perda()\n        M[i] = v\n        g[i] = (a - c) / (2 * h)\n    return g\ndef _erro(a, n):\n    return float(np.linalg.norm(a - n) / max(np.linalg.norm(a) + np.linalg.norm(n), 1e-8))\nG = grad_entropia_ponderada(Z, y, p)",
    "expr": "_erro(G, _numerico(Z)) < 1e-7", "expected": true,
    "name": "O gradiente bate com a diferença central da perda ponderada",
    "hint": "O valor diz se o erro relativo entre o seu gradiente e o numérico ficou abaixo de 1e-7." },
  { "id": "gpond-iguais", "checkpoint": 3, "kind": "expr",
    "setup": "import numpy as np\nr = np.random.default_rng(9)\nZ = r.normal(size=(5, 4))\ny = np.array([3, 0, 1, 1, 2])\nP = softmax(Z)\nP[np.arange(5), y] -= 1.0",
    "expr": "[list(grad_entropia_ponderada(Z, y, np.full(4, 2.0)).shape), bool(np.allclose(grad_entropia_ponderada(Z, y, np.full(4, 2.0)), P / 5))]", "expected": [[5, 4], true],
    "name": "Com pesos iguais, é o (P - Y) / n comum" },
  { "id": "gpond-zero", "checkpoint": 3, "kind": "expr",
    "setup": "import numpy as np\nr = np.random.default_rng(10)\nZ = r.normal(size=(4, 3))\ny = np.array([2, 0, 2, 1])\nG = grad_entropia_ponderada(Z, y, np.array([1.0, 1.0, 0.0]))",
    "expr": "[bool(np.all(G[y == 2] == 0.0)), bool(np.all(G[y != 2] != 0.0))]", "expected": [true, true],
    "name": "As linhas dos exemplos com peso zero são zero, e as outras não",
    "hint": "O peso multiplica a linha do exemplo, e não a coluna da classe." },
  { "id": "gpond-intacto", "checkpoint": 3, "kind": "expr",
    "setup": "import numpy as np\nZ = np.array([[1.0, 2.0], [3.0, -1.0]])\nZ0 = Z.copy()\ngrad_entropia_ponderada(Z, np.array([1, 0]), np.array([2.0, 1.0]))",
    "expr": "bool(np.array_equal(Z, Z0))", "expected": true,
    "name": "Z não muda" }
]
```

### Soluções erradas
```python name="divide por n"
import numpy as np


def softmax(Z):
    Zc = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Zc)
    return E / E.sum(axis=1, keepdims=True)


def log_softmax(Z):
    Zc = Z - Z.max(axis=1, keepdims=True)
    return Zc - np.log(np.exp(Zc).sum(axis=1, keepdims=True))


def entropia_cruzada(Z, y):
    n = len(y)
    return float(-log_softmax(Z)[np.arange(n), y].mean())


def entropia_ponderada(Z, y, pesos):
    n = len(y)
    w = pesos[y]
    perdas = -log_softmax(Z)[np.arange(n), y]
    return float((w * perdas).sum() / n)


def grad_entropia_ponderada(Z, y, pesos):
    n = len(y)
    w = pesos[y]
    G = softmax(Z)
    G[np.arange(n), y] -= 1.0
    return w[:, None] * G / n
```
```python name="divide pela soma dos pesos das classes"
import numpy as np


def softmax(Z):
    Zc = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Zc)
    return E / E.sum(axis=1, keepdims=True)


def log_softmax(Z):
    Zc = Z - Z.max(axis=1, keepdims=True)
    return Zc - np.log(np.exp(Zc).sum(axis=1, keepdims=True))


def entropia_cruzada(Z, y):
    n = len(y)
    return float(-log_softmax(Z)[np.arange(n), y].mean())


def entropia_ponderada(Z, y, pesos):
    n = len(y)
    w = pesos[y]
    perdas = -log_softmax(Z)[np.arange(n), y]
    return float((w * perdas).sum() / pesos.sum())


def grad_entropia_ponderada(Z, y, pesos):
    n = len(y)
    w = pesos[y]
    G = softmax(Z)
    G[np.arange(n), y] -= 1.0
    return w[:, None] * G / pesos.sum()
```
```python name="gradiente sem os pesos"
import numpy as np


def softmax(Z):
    Zc = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Zc)
    return E / E.sum(axis=1, keepdims=True)


def log_softmax(Z):
    Zc = Z - Z.max(axis=1, keepdims=True)
    return Zc - np.log(np.exp(Zc).sum(axis=1, keepdims=True))


def entropia_cruzada(Z, y):
    n = len(y)
    return float(-log_softmax(Z)[np.arange(n), y].mean())


def entropia_ponderada(Z, y, pesos):
    n = len(y)
    w = pesos[y]
    perdas = -log_softmax(Z)[np.arange(n), y]
    return float((w * perdas).sum() / w.sum())


def grad_entropia_ponderada(Z, y, pesos):
    n = len(y)
    G = softmax(Z)
    G[np.arange(n), y] -= 1.0
    return G / n
```
```python name="gradiente ponderado pelas colunas"
import numpy as np


def softmax(Z):
    Zc = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Zc)
    return E / E.sum(axis=1, keepdims=True)


def log_softmax(Z):
    Zc = Z - Z.max(axis=1, keepdims=True)
    return Zc - np.log(np.exp(Zc).sum(axis=1, keepdims=True))


def entropia_cruzada(Z, y):
    n = len(y)
    return float(-log_softmax(Z)[np.arange(n), y].mean())


def entropia_ponderada(Z, y, pesos):
    n = len(y)
    w = pesos[y]
    perdas = -log_softmax(Z)[np.arange(n), y]
    return float((w * perdas).sum() / w.sum())


def grad_entropia_ponderada(Z, y, pesos):
    n = len(y)
    w = pesos[y]
    G = softmax(Z)
    G[np.arange(n), y] -= 1.0
    return G * pesos / w.sum()
```
```python name="peso da classe prevista"
import numpy as np


def softmax(Z):
    Zc = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Zc)
    return E / E.sum(axis=1, keepdims=True)


def log_softmax(Z):
    Zc = Z - Z.max(axis=1, keepdims=True)
    return Zc - np.log(np.exp(Zc).sum(axis=1, keepdims=True))


def entropia_cruzada(Z, y):
    n = len(y)
    return float(-log_softmax(Z)[np.arange(n), y].mean())


def entropia_ponderada(Z, y, pesos):
    n = len(y)
    w = pesos[Z.argmax(axis=1)]
    perdas = -log_softmax(Z)[np.arange(n), y]
    return float((w * perdas).sum() / w.sum())


def grad_entropia_ponderada(Z, y, pesos):
    n = len(y)
    w = pesos[Z.argmax(axis=1)]
    G = softmax(Z)
    G[np.arange(n), y] -= 1.0
    return w[:, None] * G / w.sum()
```
```python name="gradiente dividido por n e pela soma"
import numpy as np


def softmax(Z):
    Zc = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Zc)
    return E / E.sum(axis=1, keepdims=True)


def log_softmax(Z):
    Zc = Z - Z.max(axis=1, keepdims=True)
    return Zc - np.log(np.exp(Zc).sum(axis=1, keepdims=True))


def entropia_cruzada(Z, y):
    n = len(y)
    return float(-log_softmax(Z)[np.arange(n), y].mean())


def entropia_ponderada(Z, y, pesos):
    n = len(y)
    w = pesos[y]
    perdas = -log_softmax(Z)[np.arange(n), y]
    return float((w * perdas).sum() / w.sum())


def grad_entropia_ponderada(Z, y, pesos):
    n = len(y)
    w = pesos[y]
    G = softmax(Z)
    G[np.arange(n), y] -= 1.0
    return w[:, None] * G / w.sum() / n
```

## Passo 8 · Quiz · Perda inicial e escolha

### Pergunta
Uma rede para 10 classes, recém-inicializada, mostra perda 23,4 no primeiro lote de 32 exemplos, antes de qualquer atualização. A perda é a média do lote. O que isso indica?
- [ ] Nada de estranho: a perda sempre começa alta e cai com o treino
- [ ] A taxa de aprendizado está alta demais
- [x] Os logits iniciais são grandes demais: com probabilidades perto de 1/10, a perda seria perto de $\ln 10 \approx 2{,}30$
- [ ] A perda está somando o lote em vez de tirar a média
> A perda de chute de 10 classes é $\ln 10 \approx 2{,}30$; 23 é dez vezes isso, sinal de que a rede começa dando probabilidade quase zero a classes certas, com logits enormes (pesos iniciais grandes demais). Antes da primeira atualização a taxa ainda não fez nada. Uma soma no lugar da média daria perto de $32 \times 2{,}30 \approx 74$, e não 23. "Começar alto" não é normal: o começo esperado é conhecido.

### Pergunta
Um treino imprime `inf` como perda já na primeira época. O código calcula `perda = -np.log(softmax(Z))[np.arange(n), y].mean()`, a `softmax` subtrai o máximo de cada linha, e alguns logits passam de 800. Qual é a correção certa?
- [ ] Converter os logits para `float32`, que tem mais faixa
- [ ] Chamar `np.seterr(all="raise")` para pegar o estouro
- [ ] Cortar os logits com `np.clip(Z, -100, 100)` antes da softmax
- [x] Calcular a perda com o `log_softmax`, $z - m - \ln\sum e^{z - m}$, sem passar pela probabilidade
> Com a softmax estável, a probabilidade da classe certa underflowa para `0.0` quando ela está 800 abaixo do máximo, e `np.log(0.0)` é `-inf`; no espaço do log, o mesmo exemplo vale um número finito, como $-800$. `float32` tem **menos** faixa que `float64`. `np.seterr` não tem efeito no executor (o `np.exp` continua dando `inf` sem exceção). O `np.clip` esconde o sintoma e muda o modelo: logits cortados têm gradiente zero, e a rede para de aprender com aqueles exemplos.

### Pergunta
Um conjunto tem 95 % de exemplos da classe 0 e 5 % da classe 1, e a perda usa pesos por classe `[1, 19]`, normalizada pela soma dos pesos dos exemplos. Uma rede que dá probabilidade 0,5 às duas classes em todos os exemplos tem que perda?
- [x] $\ln 2 \approx 0{,}693$, como sem os pesos
- [ ] $19 \times 0{,}693$, porque a classe rara pesa 19
- [ ] $0{,}693 \times 2 = 1{,}386$, porque metade do peso total é da classe rara
- [ ] Depende da proporção de cada classe no lote
> Todos os exemplos têm a mesma perda, $-\ln 0{,}5 = \ln 2$, e uma média ponderada de números iguais é esse mesmo número, quaisquer que sejam os pesos: a divisão pela soma dos pesos garante isso. Os pesos só mudam a perda quando os exemplos das classes têm perdas diferentes; aí a classe rara puxa a média, e o gradiente dela cresce. A proporção das classes no lote muda os pesos somados, mas não a média de números iguais.
