---
slug: n5-m2-01-modelo-linear-e-mse
titulo: O modelo linear e o erro quadrático
descricao: Hipótese h(x) = Xw + b, custo MSE, superfície de custo em 2D e a solução de uma variável à mão.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
xp: 100
tempo_min: 40
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Implementar a predição linear vetorizada com coluna de 1s ou viés separado
- Calcular o MSE e visualizar a superfície de custo para um modelo de um atributo
- Derivar o gradiente do MSE em forma matricial
---

## Passo 1 · Leitura · Uma reta, muitas colunas

Uma loja fictícia quer prever o valor de cada pedido a partir de dois números: quantos itens ele tem e quantos dias faltam para a entrega. No Nível 4 você ajustou esse tipo de modelo com a equação normal e com o `LinearRegression`. Neste módulo você vai construir o mesmo modelo peça por peça, e cada peça (previsão, custo, gradiente, laço de treino) volta no Nível 6 dentro das redes neurais.

Os dados ficam numa matriz $X$ de forma $(n, d)$: uma linha por exemplo, uma coluna por atributo. O modelo linear dá a cada atributo um peso $w_j$ e soma um intercepto $b$:

$$
\hat y = Xw + b, \qquad \hat y_i = b + \sum_{j=1}^{d} w_j x_{ij}
$$

Com $w$ de forma `(d,)`, `X @ w` tem forma `(n,)`: um número por exemplo, e o `+ b` soma o intercepto a todos eles. O **truque da coluna de uns** junta os dois: acrescente a $X$ uma coluna só de uns e o intercepto vira mais um peso, $\hat y = X' w'$ com $w' = (b, w_1, \dots, w_d)$. As duas formas dão as mesmas previsões; neste módulo o intercepto fica separado no treino por gradiente e entra pela coluna de uns na equação normal (lição 4).

Para medir se as previsões são boas, a lição usa o **erro quadrático médio**:

$$
\text{MSE}(w, b) = \frac{1}{n} \sum_{i=1}^{n} \left(y_i - \hat y_i\right)^2
$$

É a média, e não a soma: com a média, o custo de 100 exemplos e o de 10 000 ficam na mesma escala, e a taxa de aprendizado da próxima lição não precisa mudar com o tamanho dos dados.

Os exemplos do módulo vêm de um gerador com semente, em que a resposta verdadeira é $y = 3 + 2x_1 - x_2$ mais um ruído normal. O parâmetro `escala` multiplica as colunas e só será usado na lição 3:

```python
import numpy as np


def gerar_dados(n=100, semente=0, ruido=0.5, escala=(1.0, 1.0)):
    rng = np.random.default_rng(semente)
    Z = rng.normal(0.0, 1.0, size=(n, 2))
    y = 3.0 + 2.0 * Z[:, 0] - Z[:, 1] + rng.normal(0.0, ruido, size=n)
    return Z * np.asarray(escala, dtype=float), y
```

Um modelo bem ajustado a esses dados deve encontrar $w \approx (2, -1)$ e $b \approx 3$, com um MSE perto de $0{,}25$, a variância do ruído. O cuidado com a forma de cada array é o assunto do passo seguinte.

## Passo 2 · Previsão · Formas e o MSE de uma reta à mão

O programa monta um modelo com dois atributos e calcula as previsões e o MSE. Depois repete a conta com `w` guardado como coluna. Leia sem executar e digite o que ele imprime.

### Código
```python
import numpy as np

X = np.array([[1.0, 2.0], [0.0, 1.0], [2.0, 0.0]])
w = np.array([2.0, -1.0])
b = 1.0
y = np.array([1.0, 0.0, 6.0])

print(X.shape, w.shape, (X @ w).shape)
p = X @ w + b
print(p.tolist())
print(round(float(np.mean((y - p) ** 2)), 4))

w2 = w.reshape(-1, 1)
print((X @ w2).shape, (y - (X @ w2 + b)).shape)
```

### Dicas
1. Cada previsão é $b + 2x_1 - x_2$, uma por linha de `X`.
2. Só a última previsão erra: por quanto? O MSE divide a soma dos quadrados por 3.
3. `(X @ w2)` tem uma coluna. Subtrair um array `(3, 1)` de um `(3,)` usa broadcasting nas duas direções.

### Saída esperada
```text
(3, 2) (2,) (3,)
[1.0, 0.0, 5.0]
0.3333
(3, 1) (3, 3)
```

## Passo 3 · Exercício · Prever e medir
modo: lacunas

Complete as lacunas (`___`) das duas peças que o resto do módulo usa: a previsão do modelo linear e o erro quadrático médio.

### Instruções
1. `prever(X, w, b)` devolve um array de forma `(n,)` com $Xw + b$, uma previsão por linha de `X`.
2. `mse(y, y_pred)` devolve a **média** dos quadrados de `y - y_pred`, como `float` do Python.

### Código inicial
```python
import numpy as np


def prever(X, w, b):
    X = np.asarray(X, dtype=float)
    w = np.asarray(w, dtype=float)
    return ___


def mse(y, y_pred):
    y = np.asarray(y, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    return float(___)
```

### Solução
```python
import numpy as np


def prever(X, w, b):
    X = np.asarray(X, dtype=float)
    w = np.asarray(w, dtype=float)
    return X @ w + b


def mse(y, y_pred):
    y = np.asarray(y, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    return float(np.mean((y - y_pred) ** 2))
```

### Dicas
1. O `@` faz o produto de cada linha de `X` pelos pesos e já soma; o `*` multiplica posição a posição e não soma nada.
2. O intercepto é somado a todas as previsões.
3. Média, e não soma: o erro de 2 exemplos e o de 2 000 precisam ficar na mesma escala.

### Verificação
```json
[
  { "id": "prever-mao", "checkpoint": 1, "kind": "expr",
    "expr": "prever([[1, 2, 0], [0, 1, 1]], [1, -1, 2], 0.5).tolist()", "expected": [-0.5, 1.5], "tolerance": 1e-9,
    "name": "Duas linhas e três atributos: uma previsão por linha",
    "hint": "Cada previsão é o produto escalar da linha com w, mais b." },
  { "id": "prever-forma", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np\nX = np.random.default_rng(1).normal(size=(50, 2))",
    "expr": "list(prever(X, [2.0, -1.0], 3.0).shape)", "expected": [50],
    "name": "Com 50 linhas, as previsões têm forma (50,)",
    "hint": "Com w de forma (d,), X @ w tem uma dimensão só." },
  { "id": "prever-intercepto", "checkpoint": 1, "kind": "expr",
    "expr": "prever([[0.0, 0.0]], [5.0, 7.0], 3.0).tolist()", "expected": [3.0], "tolerance": 1e-9,
    "name": "Com todos os atributos em zero, a previsão é o intercepto",
    "hint": "Não esqueça de somar b." },
  { "id": "prever-tipo", "checkpoint": 1, "kind": "expr",
    "expr": "prever([[1.0, 2.0]], [1.0, 1.0], 0.0)", "type": "ndarray",
    "name": "prever devolve um array do numpy" },
  { "id": "mse-mao", "checkpoint": 2, "kind": "call", "function": "mse", "args": [[3, -1, 2, 0], [1, 1, 2, 0]],
    "expected": 2.0, "type": "float", "tolerance": 1e-9,
    "name": "Erros 2, -2, 0 e 0: o MSE é 2.0",
    "hint": "Eleve cada erro ao quadrado antes de tirar a média; erros de sinais opostos não se cancelam." },
  { "id": "mse-zero", "checkpoint": 2, "kind": "call", "function": "mse", "args": [[1, 2, 3], [1, 2, 3]],
    "expected": 0.0, "tolerance": 1e-12, "name": "Previsões perfeitas têm MSE zero" },
  { "id": "mse-media", "checkpoint": 2, "kind": "call", "function": "mse", "args": [[2.0, 4.0], [1.0, 1.0]],
    "expected": 5.0, "tolerance": 1e-9,
    "name": "Erros 1 e 3: o MSE é (1 + 9) / 2",
    "hint": "É a média dos quadrados: nem a soma, nem a raiz, nem o valor absoluto." },
  { "id": "mse-de-prever", "checkpoint": 2, "kind": "expr",
    "expr": "mse([1.0, 0.0, 6.0], prever([[1.0, 2.0], [0.0, 1.0], [2.0, 0.0]], [2.0, -1.0], 1.0))",
    "expected": 0.3333333333333333, "tolerance": 1e-9,
    "name": "O MSE das previsões do modelo do passo 2",
    "hint": "Confira a forma das previsões: um array (3, 1) subtraído de um (3,) vira uma matriz 3 × 3." }
]
```

### Soluções erradas
```python name="esquece o intercepto"
import numpy as np


def prever(X, w, b):
    X = np.asarray(X, dtype=float)
    w = np.asarray(w, dtype=float)
    return X @ w


def mse(y, y_pred):
    y = np.asarray(y, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    return float(np.mean((y - y_pred) ** 2))
```
```python name="multiplica posição a posição"
import numpy as np


def prever(X, w, b):
    X = np.asarray(X, dtype=float)
    w = np.asarray(w, dtype=float)
    return X * w + b


def mse(y, y_pred):
    y = np.asarray(y, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    return float(np.mean((y - y_pred) ** 2))
```
```python name="w como coluna"
import numpy as np


def prever(X, w, b):
    X = np.asarray(X, dtype=float)
    w = np.asarray(w, dtype=float)
    return X @ w.reshape(-1, 1) + b


def mse(y, y_pred):
    y = np.asarray(y, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    return float(np.mean((y - y_pred) ** 2))
```
```python name="MSE somado"
import numpy as np


def prever(X, w, b):
    X = np.asarray(X, dtype=float)
    w = np.asarray(w, dtype=float)
    return X @ w + b


def mse(y, y_pred):
    y = np.asarray(y, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    return float(np.sum((y - y_pred) ** 2))
```
```python name="raiz do MSE"
import numpy as np


def prever(X, w, b):
    X = np.asarray(X, dtype=float)
    w = np.asarray(w, dtype=float)
    return X @ w + b


def mse(y, y_pred):
    y = np.asarray(y, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    return float(np.sqrt(np.mean((y - y_pred) ** 2)))
```
```python name="erro absoluto"
import numpy as np


def prever(X, w, b):
    X = np.asarray(X, dtype=float)
    w = np.asarray(w, dtype=float)
    return X @ w + b


def mse(y, y_pred):
    y = np.asarray(y, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    return float(np.mean(np.abs(y - y_pred)))
```
```python name="quadrado da média dos erros"
import numpy as np


def prever(X, w, b):
    X = np.asarray(X, dtype=float)
    w = np.asarray(w, dtype=float)
    return X @ w + b


def mse(y, y_pred):
    y = np.asarray(y, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    return float(np.mean(y - y_pred) ** 2)
```

## Passo 4 · Leitura · O gradiente do MSE em forma de matriz

Para melhorar $w$ e $b$, o gradiente descendente da próxima lição precisa saber em que direção o MSE cresce. Chame de $r = Xw + b - y$ o vetor de **resíduos** (previsão menos resposta). O MSE é $\frac{1}{n}\sum r_i^2$, e a regra da cadeia da m1-03 dá, para cada peso, $\frac{\partial}{\partial w_j} r_i^2 = 2 r_i x_{ij}$. Somando sobre os exemplos e juntando todos os pesos num vetor:

$$
\nabla_w \text{MSE} = \frac{2}{n} X^\top r, \qquad \frac{\partial\, \text{MSE}}{\partial b} = \frac{2}{n} \sum_{i=1}^{n} r_i
$$

A forma confere: $X^\top$ é $(d, n)$ e $r$ é $(n,)$, então $X^\top r$ tem forma $(d,)$, um número por peso. Cada componente é a soma dos resíduos ponderados pela coluna do atributo: um atributo que vale muito justamente onde o modelo erra para cima recebe um gradiente positivo, e o passo de descida o diminui. Escrever `X @ residuo` no lugar de `X.T @ residuo` com 200 exemplos e 3 atributos dá `ValueError: matmul: Input operand 1 has a mismatch in its core dimension 0, with gufunc signature (n?,k),(k,m?)->(n?,m?) (size 200 is different from 3)`.

```python
residuo = X @ w + b - y          # (n,)
gw = 2 / n * X.T @ residuo       # (d,)
gb = 2 / n * residuo.sum()       # escalar
```

O sinal importa. Com o resíduo definido como $y - \hat y$, a derivada ganha um sinal de menos; esquecê-lo faz o gradiente apontar para baixo, e o "passo de descida" sobe o custo. O fator $\frac{2}{n}$ só muda o tamanho do vetor, não a direção: quem usa $\frac{1}{n}$ está calculando o gradiente de $\frac{1}{2}\text{MSE}$, que tem o mesmo mínimo, e chega aos mesmos pesos com uma taxa duas vezes maior. Mas não é o gradiente do MSE, e um verificador numérico acusa a diferença.

Esse verificador é a ferramenta da m1-02: perturbe cada peso por $\pm h$, calcule o custo e compare $\frac{\text{MSE}(w + h e_j) - \text{MSE}(w - h e_j)}{2h}$ com a fórmula. Se os dois baterem a $10^{-6}$ em pontos sorteados, a fórmula está certa. No mínimo do custo, o gradiente é o vetor nulo: é dessa condição que sai a equação normal da lição 4.

## Passo 5 · Exercício · Gradiente do MSE

Escreva o gradiente do MSE do modelo linear, sem laço. A correção confere a sua fórmula com o gradiente numérico em pontos sorteados.

### Instruções
1. `gradiente_mse(X, y, w, b)` devolve a tupla `(gw, gb)`: `gw` é um array de forma `(d,)` com $\frac{2}{n} X^\top (Xw + b - y)$ e `gb` é a derivada em relação a `b`, $\frac{2}{n}\sum (Xw + b - y)$, como `float` do Python.
2. Use só operações vetorizadas: nada de `for` nem de compreensão de lista.

### Código inicial
```python
import numpy as np


def gradiente_mse(X, y, w, b):
    pass
```
```python path=dados_regressao.py
import numpy as np


def gerar_dados(n=100, semente=0, ruido=0.5, escala=(1.0, 1.0)):
    rng = np.random.default_rng(semente)
    Z = rng.normal(0.0, 1.0, size=(n, 2))
    y = 3.0 + 2.0 * Z[:, 0] - Z[:, 1] + rng.normal(0.0, ruido, size=n)
    return Z * np.asarray(escala, dtype=float), y
```

### Solução
```python
import numpy as np


def gradiente_mse(X, y, w, b):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    w = np.asarray(w, dtype=float)
    n = len(y)
    residuo = X @ w + b - y
    gw = 2 / n * X.T @ residuo
    gb = 2 / n * float(residuo.sum())
    return gw, gb
```
```python path=dados_regressao.py
import numpy as np


def gerar_dados(n=100, semente=0, ruido=0.5, escala=(1.0, 1.0)):
    rng = np.random.default_rng(semente)
    Z = rng.normal(0.0, 1.0, size=(n, 2))
    y = 3.0 + 2.0 * Z[:, 0] - Z[:, 1] + rng.normal(0.0, ruido, size=n)
    return Z * np.asarray(escala, dtype=float), y
```

### Dicas
1. Calcule primeiro o vetor de resíduos, previsão menos resposta; as duas derivadas saem dele.
2. A forma de `gw` é a de `w`: qual produto entre `X` e um vetor de `n` posições dá `d` números?
3. `residuo.sum()` devolve um número do numpy; o enunciado pede `float` do Python.

### Verificação
```json
[
  { "id": "mao-gw", "checkpoint": 1, "kind": "expr",
    "setup": "gw, gb = gradiente_mse([[1, 2], [2, 0], [3, 1]], [5, 4, 8], [1, 1], 0)",
    "expr": "gw.tolist()", "expected": [-12.0, -5.333333333333333], "tolerance": 1e-9,
    "name": "Três exemplos à mão: o gradiente em relação a w",
    "hint": "Resíduo é previsão menos resposta; o fator é 2/n." },
  { "id": "mao-gb", "checkpoint": 1, "kind": "expr",
    "setup": "gw, gb = gradiente_mse([[1, 2], [2, 0], [3, 1]], [5, 4, 8], [1, 1], 0)",
    "expr": "gb", "expected": -5.333333333333333, "type": "float", "tolerance": 1e-9,
    "name": "Três exemplos à mão: a derivada em relação a b, como float",
    "hint": "É 2/n vezes a soma dos resíduos, convertida com float(...)." },
  { "id": "forma", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np\nrng = np.random.default_rng(7)\nX = rng.normal(size=(30, 3))\ny = rng.normal(size=30)\ngw, gb = gradiente_mse(X, y, rng.normal(size=3), 0.3)",
    "expr": "list(gw.shape)", "expected": [3],
    "name": "Com 30 exemplos e 3 atributos, gw tem forma (3,)" },
  { "id": "numerico-w", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np\nrng = np.random.default_rng(7)\nX = rng.normal(size=(30, 3))\ny = rng.normal(size=30)\nw = rng.normal(size=3)\nb = 0.3\ndef custo(w_, b_):\n    return np.mean((X @ w_ + b_ - y) ** 2)\nh = 1e-6\nnum = np.array([(custo(w + h * e, b) - custo(w - h * e, b)) / (2 * h) for e in np.eye(3)])\ngw, gb = gradiente_mse(X, y, w.copy(), b)",
    "expr": "bool(np.allclose(gw, num, atol=1e-6))", "expected": true,
    "name": "gw bate com o gradiente numérico num ponto sorteado",
    "hint": "Confira o fator 2/n e o sinal do resíduo." },
  { "id": "numerico-b", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np\nrng = np.random.default_rng(7)\nX = rng.normal(size=(30, 3))\ny = rng.normal(size=30)\nw = rng.normal(size=3)\nb = 0.3\ndef custo(w_, b_):\n    return np.mean((X @ w_ + b_ - y) ** 2)\nh = 1e-6\nnum_b = (custo(w, b + h) - custo(w, b - h)) / (2 * h)\ngw, gb = gradiente_mse(X, y, w.copy(), b)",
    "expr": "bool(abs(gb - num_b) < 1e-6)", "expected": true,
    "name": "gb bate com a derivada numérica num ponto sorteado" },
  { "id": "otimo", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np\nfrom dados_regressao import gerar_dados\nX, y = gerar_dados(200, semente=3)\nc = np.linalg.lstsq(np.column_stack([np.ones(200), X]), y)[0]\ngw, gb = gradiente_mse(X, y, c[1:], float(c[0]))",
    "expr": "bool(np.allclose(gw, 0.0, atol=1e-9) and abs(gb) < 1e-9)", "expected": true,
    "name": "No mínimo do custo (solução de mínimos quadrados), o gradiente é zero" },
  { "id": "tipos", "checkpoint": 1, "kind": "expr",
    "setup": "r = gradiente_mse([[1.0, 2.0], [2.0, 0.0]], [1.0, 2.0], [0.0, 0.0], 0.0)",
    "expr": "[type(r).__name__, type(r[0]).__name__, type(r[1]).__name__]", "expected": ["tuple", "ndarray", "float"],
    "name": "Devolve a tupla (array, float)" },
  { "id": "sem-for", "checkpoint": 2, "kind": "source", "rule": { "type": "not_uses", "construct": "for" },
    "name": "Sem laço for" },
  { "id": "sem-compreensao", "checkpoint": 2, "kind": "source", "rule": { "type": "not_uses", "construct": "list_comprehension" },
    "name": "Sem compreensão de lista" }
]
```

### Soluções erradas
```python name="sem o fator 2/n"
import numpy as np


def gradiente_mse(X, y, w, b):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    w = np.asarray(w, dtype=float)
    residuo = X @ w + b - y
    gw = 2 * X.T @ residuo
    gb = 2 * float(residuo.sum())
    return gw, gb
```
```python name="1/n sem o 2"
import numpy as np


def gradiente_mse(X, y, w, b):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    w = np.asarray(w, dtype=float)
    n = len(y)
    residuo = X @ w + b - y
    gw = X.T @ residuo / n
    gb = float(residuo.sum()) / n
    return gw, gb
```
```python name="X sem transpor"
import numpy as np


def gradiente_mse(X, y, w, b):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    w = np.asarray(w, dtype=float)
    n = len(y)
    residuo = X @ w + b - y
    gw = 2 / n * X @ residuo
    gb = 2 / n * float(residuo.sum())
    return gw, gb
```
```python name="resíduo com o sinal trocado"
import numpy as np


def gradiente_mse(X, y, w, b):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    w = np.asarray(w, dtype=float)
    n = len(y)
    residuo = y - (X @ w + b)
    gw = 2 / n * X.T @ residuo
    gb = 2 / n * float(residuo.sum())
    return gw, gb
```
```python name="derivada em b sem o 2"
import numpy as np


def gradiente_mse(X, y, w, b):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    w = np.asarray(w, dtype=float)
    n = len(y)
    residuo = X @ w + b - y
    gw = 2 / n * X.T @ residuo
    gb = float(residuo.mean())
    return gw, gb
```
```python name="gb como número do numpy"
import numpy as np


def gradiente_mse(X, y, w, b):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    w = np.asarray(w, dtype=float)
    n = len(y)
    residuo = X @ w + b - y
    gw = 2 / n * X.T @ residuo
    gb = 2 / n * residuo.sum()
    return gw, gb
```
```python name="laço sobre os atributos"
import numpy as np


def gradiente_mse(X, y, w, b):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    w = np.asarray(w, dtype=float)
    n = len(y)
    residuo = X @ w + b - y
    gw = np.zeros(X.shape[1])
    for j in range(X.shape[1]):
        gw[j] = 2 / n * float(X[:, j] @ residuo)
    gb = 2 / n * float(residuo.sum())
    return gw, gb
```

## Passo 6 · Exercício · A bacia do custo

Com um atributo só, o modelo $\hat y = wx + b$ tem dois parâmetros, e o MSE vira uma superfície sobre o plano $(w, b)$: uma bacia com um único fundo. Calcule essa superfície numa grade, por broadcasting, e ache o ponto mais baixo da grade.

### Instruções
1. `superficie_de_custo(x, y, ws, bs)` devolve uma matriz de forma `(len(bs), len(ws))`: a posição `[i, j]` é o MSE do modelo $\hat y = ws_j \cdot x + bs_i$ nos dados `(x, y)`. As linhas são os interceptos e as colunas, as inclinações.
2. `minimo_da_grade(custos, ws, bs)` devolve a tupla `(w, b)`, dois `float` do Python, com a inclinação e o intercepto da posição de menor custo (na primeira ocorrência, em caso de empate).
3. Sem `for` e sem compreensão de lista: monte um array de três dimensões com broadcasting.

### Código inicial
```python
import numpy as np


def superficie_de_custo(x, y, ws, bs):
    pass


def minimo_da_grade(custos, ws, bs):
    pass
```

### Solução
```python
import numpy as np


def superficie_de_custo(x, y, ws, bs):
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    ws = np.asarray(ws, dtype=float)
    bs = np.asarray(bs, dtype=float)
    previsoes = bs[:, None, None] + ws[None, :, None] * x[None, None, :]
    return np.mean((previsoes - y) ** 2, axis=2)


def minimo_da_grade(custos, ws, bs):
    i, j = np.unravel_index(np.argmin(custos), custos.shape)
    return float(ws[j]), float(bs[i])
```

### Dicas
1. Dê a cada array o seu eixo: interceptos no eixo 0, inclinações no eixo 1 e exemplos no eixo 2. O `None` cria um eixo de tamanho 1.
2. Com as previsões em forma `(len(bs), len(ws), n)`, a média no último eixo dá um custo por par.
3. O `np.argmin` sem eixo devolve uma posição na matriz achatada; o `np.unravel_index` a converte em `(linha, coluna)`.

### Verificação
```json
[
  { "id": "forma", "checkpoint": 1, "kind": "expr",
    "expr": "list(superficie_de_custo([0, 1, 2, 3], [1, 3, 5, 7], [0, 1, 2, 3, 4], [0, 1, 2]).shape)", "expected": [3, 5],
    "name": "3 interceptos e 5 inclinações: forma (3, 5)",
    "hint": "As linhas são os interceptos (bs) e as colunas, as inclinações (ws)." },
  { "id": "valores", "checkpoint": 1, "kind": "expr",
    "expr": "superficie_de_custo([0, 1, 2, 3], [1, 3, 5, 7], [0, 1, 2, 3, 4], [0, 1, 2]).tolist()",
    "expected": [[21.0, 7.5, 1.0, 1.5, 9.0], [14.0, 3.5, 0.0, 3.5, 14.0], [9.0, 1.5, 1.0, 7.5, 21.0]], "tolerance": 1e-9,
    "name": "Pontos sobre y = 2x + 1: o custo de cada par da grade",
    "hint": "Cada posição é a média (não a soma) dos erros quadráticos dos 4 pontos." },
  { "id": "tipo", "checkpoint": 1, "kind": "expr",
    "expr": "superficie_de_custo([0.0, 1.0], [1.0, 2.0], [0.0, 1.0], [0.0])", "type": "ndarray",
    "name": "A superfície é um array do numpy" },
  { "id": "minimo-mao", "checkpoint": 2, "kind": "expr",
    "setup": "C = superficie_de_custo([0, 1, 2, 3], [1, 3, 5, 7], [0, 1, 2, 3, 4], [0, 1, 2])",
    "expr": "list(minimo_da_grade(C, [0, 1, 2, 3, 4], [0, 1, 2]))", "expected": [2.0, 1.0], "tolerance": 1e-12,
    "name": "O fundo da grade é w = 2 e b = 1",
    "hint": "A linha da posição mínima indica o intercepto; a coluna, a inclinação. Devolva (w, b) nessa ordem." },
  { "id": "minimo-tipos", "checkpoint": 2, "kind": "expr",
    "setup": "C = superficie_de_custo([0, 1, 2, 3], [1, 3, 5, 7], [0, 1, 2, 3, 4], [0, 1, 2])\nr = minimo_da_grade(C, [0, 1, 2, 3, 4], [0, 1, 2])",
    "expr": "[type(r).__name__, type(r[0]).__name__, type(r[1]).__name__]", "expected": ["tuple", "float", "float"],
    "name": "minimo_da_grade devolve uma tupla de dois float do Python" },
  { "id": "perto-do-ajuste", "checkpoint": 2, "kind": "expr",
    "setup": "import numpy as np\nrng = np.random.default_rng(3)\nx = rng.uniform(0, 5, 40)\ny = 1.5 + 0.8 * x + rng.normal(0, 0.4, 40)\nws = np.linspace(0, 2, 41)\nbs = np.linspace(0, 3, 61)\nwr, br = np.polyfit(x, y, 1)\nw, b = minimo_da_grade(superficie_de_custo(x, y, ws, bs), ws, bs)",
    "expr": "bool(abs(w - wr) <= 0.05 and abs(b - br) <= 0.05)", "expected": true,
    "name": "Numa grade fina, o fundo fica a menos de um passo da grade do ajuste exato",
    "hint": "Confira a ordem dos eixos da superfície e a ordem da tupla devolvida." },
  { "id": "sem-for", "checkpoint": 3, "kind": "source", "rule": { "type": "not_uses", "construct": "for" },
    "name": "Sem laço for" },
  { "id": "sem-compreensao", "checkpoint": 3, "kind": "source", "rule": { "type": "not_uses", "construct": "list_comprehension" },
    "name": "Sem compreensão de lista" }
]
```

### Soluções erradas
```python name="eixos trocados"
import numpy as np


def superficie_de_custo(x, y, ws, bs):
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    ws = np.asarray(ws, dtype=float)
    bs = np.asarray(bs, dtype=float)
    previsoes = ws[:, None, None] * x[None, None, :] + bs[None, :, None]
    return np.mean((previsoes - y) ** 2, axis=2)


def minimo_da_grade(custos, ws, bs):
    i, j = np.unravel_index(np.argmin(custos), custos.shape)
    return float(ws[j]), float(bs[i])
```
```python name="soma no lugar da média"
import numpy as np


def superficie_de_custo(x, y, ws, bs):
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    ws = np.asarray(ws, dtype=float)
    bs = np.asarray(bs, dtype=float)
    previsoes = bs[:, None, None] + ws[None, :, None] * x[None, None, :]
    return np.sum((previsoes - y) ** 2, axis=2)


def minimo_da_grade(custos, ws, bs):
    i, j = np.unravel_index(np.argmin(custos), custos.shape)
    return float(ws[j]), float(bs[i])
```
```python name="laço duplo"
import numpy as np


def superficie_de_custo(x, y, ws, bs):
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    custos = np.zeros((len(bs), len(ws)))
    for i, b in enumerate(bs):
        for j, w in enumerate(ws):
            custos[i, j] = np.mean((w * x + b - y) ** 2)
    return custos


def minimo_da_grade(custos, ws, bs):
    i, j = np.unravel_index(np.argmin(custos), custos.shape)
    return float(ws[j]), float(bs[i])
```
```python name="devolve (b, w)"
import numpy as np


def superficie_de_custo(x, y, ws, bs):
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    ws = np.asarray(ws, dtype=float)
    bs = np.asarray(bs, dtype=float)
    previsoes = bs[:, None, None] + ws[None, :, None] * x[None, None, :]
    return np.mean((previsoes - y) ** 2, axis=2)


def minimo_da_grade(custos, ws, bs):
    i, j = np.unravel_index(np.argmin(custos), custos.shape)
    return float(bs[i]), float(ws[j])
```
```python name="índices da linha e da coluna trocados"
import numpy as np


def superficie_de_custo(x, y, ws, bs):
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    ws = np.asarray(ws, dtype=float)
    bs = np.asarray(bs, dtype=float)
    previsoes = bs[:, None, None] + ws[None, :, None] * x[None, None, :]
    return np.mean((previsoes - y) ** 2, axis=2)


def minimo_da_grade(custos, ws, bs):
    j, i = np.unravel_index(np.argmin(custos), custos.shape)
    return float(ws[j]), float(bs[i])
```
```python name="devolve números do numpy"
import numpy as np


def superficie_de_custo(x, y, ws, bs):
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    ws = np.asarray(ws, dtype=float)
    bs = np.asarray(bs, dtype=float)
    previsoes = bs[:, None, None] + ws[None, :, None] * x[None, None, :]
    return np.mean((previsoes - y) ** 2, axis=2)


def minimo_da_grade(custos, ws, bs):
    ws = np.asarray(ws, dtype=float)
    bs = np.asarray(bs, dtype=float)
    i, j = np.unravel_index(np.argmin(custos), custos.shape)
    return ws[j], bs[i]
```

## Passo 7 · Quiz · A forma do gradiente

### Pergunta
Um colega guardou os pesos como coluna, `w = np.zeros((3, 1))`, para 100 exemplos com 3 atributos, e calcula o custo com `np.mean((y - X @ w) ** 2)`, com `y` de forma `(100,)`. Nenhum erro aparece. O que está acontecendo?
- [ ] Nada de errado: `X @ w` tem forma `(100, 1)` e o numpy alinha as duas colunas
- [x] `y - X @ w` tem forma `(100, 100)` por broadcasting, e a média mistura os erros de todos os pares de exemplos
- [ ] O numpy converte `w` em vetor sozinho, e o custo sai certo, só mais lento
- [ ] O custo sai certo, mas o gradiente calculado depois terá forma errada
> Um array `(100,)` menos um `(100, 1)` vira uma matriz `(100, 100)`: cada `y_i` é comparado com cada previsão. O resultado é um número, sem erro nem aviso, e errado. O numpy não converte formas sozinho; o certo é usar `w` de forma `(3,)` (ou `y` também como coluna). O custo já está errado, não só o gradiente.

### Pergunta
O gradiente de um colega é `X.T @ residuo / n`, sem o 2. O verificador numérico acusa que a fórmula não bate com o MSE. Se ele treinar com essa fórmula e taxa `2 * eta`, o que acontece em relação a quem usa a fórmula certa com taxa `eta`?
- [x] Os passos são idênticos: o gradiente dele é metade do certo, e a taxa dobrada compensa
- [ ] O treino dele converge para outro mínimo, porque minimiza outra função
- [ ] O treino dele diverge, porque a taxa dobrou
- [ ] Os pesos finais são a metade dos pesos certos
> A fórmula sem o 2 é o gradiente de $\frac{1}{2}\text{MSE}$, que tem o mesmo mínimo. Cada passo é $w - 2\eta \cdot \tfrac{1}{2}\nabla = w - \eta \nabla$: a mesma trajetória. Não muda o mínimo nem os pesos finais; dobrar a taxa só faria divergir se a taxa certa já estivesse no limite, e aqui ela é compensada. O verificador acusa porque o número não é o gradiente do MSE, e é isso que o enunciado pede.

### Pergunta
Com `X` de forma `(200, 3)`, `residuo = X @ w + b - y` de forma `(200,)`, a linha `gw = 2 / n * X @ residuo` levanta `ValueError: matmul: Input operand 1 has a mismatch in its core dimension 0 ... (size 200 is different from 3)`. Qual é a correção?
- [ ] `2 / n * residuo @ X.T`
- [x] `2 / n * X.T @ residuo`
- [ ] `2 / n * (X * residuo).sum(axis=0)`, porque o `@` não serve para gradientes
- [ ] `2 / n * X @ residuo.reshape(-1, 1)`
> O gradiente tem um número por peso, forma `(3,)`: só $X^\top r$, de `(3, 200)` por `(200,)`, dá isso. `residuo @ X.T` multiplica `(200,)` por `(3, 200)` e falha do mesmo jeito; transformar o resíduo em coluna também não casa com `(200, 3)`. Já `(X * residuo).sum(axis=0)` nem roda: `(200, 3)` vezes `(200,)` não faz broadcasting (seria preciso `residuo[:, None]`).
