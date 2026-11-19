---
slug: n6-m3-04-otimizadores
titulo: 'Otimizadores: momentum, RMSProp e Adam'
descricao: Por que SGD puro oscila, momentum e Nesterov, taxas adaptativas (AdaGrad, RMSProp), Adam com correção de viés e weight decay; comparação em uma função-teste e no MLP.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
xp: 130
tempo_min: 55
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Implementar SGD com momentum, RMSProp e Adam como classes com estado
- Comparar os otimizadores em uma função de vale alongado e no treino do MLP
- Explicar a correção de viés do Adam e a diferença entre L2 e weight decay desacoplado
---

## Passo 1 · Leitura · Por que o SGD oscila

Até aqui, o passo do treino foi sempre $\theta \leftarrow \theta - \eta\, g$. Para ver o limite dessa regra, troque a rede por uma função de dois parâmetros, um **vale alongado**:

$$
f(x, y) = \frac{x^2}{2} + 10\, y^2 \qquad \nabla f = (x,\ 20\, y)
$$

O mínimo está na origem. A parede do vale, na direção $y$, é 20 vezes mais inclinada que o fundo, na direção $x$. Cada passo do SGD faz $x \leftarrow (1 - \eta)\, x$ e $y \leftarrow (1 - 20\eta)\, y$. Para $y$ não crescer, é preciso $|1 - 20\eta| < 1$, ou seja, $\eta < 0{,}1$. Com $\eta = 0{,}09$, $y$ pula de um lado para o outro do vale (1, −0,8, 0,64, −0,51...), e $x$ só perde 9 % por passo. A direção inclinada limita a taxa, e a direção plana paga a conta.

O **momentum** troca o gradiente do passo por uma média móvel dos gradientes, a velocidade $v$:

$$
v \leftarrow \beta\, v + (1 - \beta)\, g \qquad \theta \leftarrow \theta - \eta\, v
$$

Em $y$, os gradientes alternam de sinal e se cancelam na média. Em $x$, apontam sempre para o mesmo lado e se somam. A oscilação diminui, e a taxa pode ser maior. Distância até o mínimo, partindo de $(10, 1)$, medida no executor:

| Otimizador | 20 passos | 50 passos | 100 passos |
|---|---|---|---|
| SGD, taxa 0,02 | 6,68 | 3,64 | 1,33 |
| SGD, taxa 0,09 | 1,52 | 0,090 | 0,0008 |
| SGD, taxa 0,11 | 38,3 | 9 100 | $8 \cdot 10^7$ |
| Momentum, $\beta = 0{,}7$, taxa 0,3 | 0,115 | 0,0010 | $9 \cdot 10^{-8}$ |

Com taxa 0,3, o SGD divergiria já no primeiro passo. O $\beta$ diz quanto da velocidade antiga sobra: com 0,9, a média olha para cerca de 10 gradientes.

Nesta lição, um otimizador é um objeto com um método `passo(params, grads)`. `params` e `grads` são listas de arrays, na mesma ordem, e o passo altera os arrays **no lugar**:

```python
otimizador = Momentum(0.3, beta=0.7)
x = np.array([10.0, 1.0])
for _ in range(50):
    otimizador.passo([x], [np.array([x[0], 20.0 * x[1]])])
```

O estado (a velocidade) mora no objeto, um array por posição da lista. Para os parâmetros `[(W1, b1), (W2, b2)]` da `rede.py`, a lista plana é `[a for par in params for a in par]`.

O visualizador mostra o momentum numa variável só, a direção inclinada do vale:

```python visualizar
def grad(y):
    return 20 * y


taxa, beta = 0.09, 0.5
y, v = 1.0, 0.0
for passo in range(6):
    g = grad(y)
    v = beta * v + (1 - beta) * g
    y = y - taxa * v
    print(passo, round(v, 3), round(y, 3))
```

## Passo 2 · Previsão · Dois passos de momentum

A função é $f(x) = x^2$, de gradiente $2x$. O primeiro laço dá dois passos de momentum e imprime a velocidade e a posição; o segundo dá dois passos de SGD com a mesma taxa. Leia sem executar e digite o que o programa imprime.

### Código
```python
taxa, beta = 0.25, 0.5

x, v = 4.0, 0.0
for passo in range(2):
    g = 2 * x
    v = beta * v + (1 - beta) * g
    x = x - taxa * v
    print(v, x)

x = 4.0
for passo in range(2):
    x = x - taxa * 2 * x
print(x)
```

### Dicas
1. No primeiro passo, a velocidade parte de 0: fica com metade do gradiente, que é 8.
2. No segundo, o gradiente é calculado na posição nova, 3.0, e a velocidade mistura metade da antiga com metade dele.
3. O SGD com taxa 0,25 multiplica $x$ por $1 - 0{,}5$ a cada passo.

### Saída esperada
```text
4.0 3.0
5.0 1.75
1.0
```

## Passo 3 · Exercício · `SGD` e `Momentum`
modo: lacunas

Complete as lacunas (`___`) das duas classes. `params` e `grads` são listas de arrays do numpy, na mesma ordem.

### Instruções
1. `SGD(taxa).passo(params, grads)` subtrai de cada array `taxa` vezes o seu gradiente, no lugar (com `-=`).
2. `Momentum(taxa, beta=0.9).passo(params, grads)` atualiza a velocidade de cada array com a média móvel $v \leftarrow \beta v + (1 - \beta) g$ e subtrai `taxa` vezes a velocidade.
3. A velocidade é uma lista com um array de zeros por posição de `params`, criada no primeiro `passo` e guardada no objeto.

### Código inicial
```python
import numpy as np


class SGD:
    def __init__(self, taxa):
        self.taxa = taxa

    def passo(self, params, grads):
        for p, g in zip(params, grads):
            p -= ___


class Momentum:
    def __init__(self, taxa, beta=0.9):
        self.taxa = taxa
        self.beta = beta
        self.v = None

    def passo(self, params, grads):
        if self.v is None:
            self.v = [___ for p in params]
        for i, (p, g) in enumerate(zip(params, grads)):
            self.v[i] = ___
            p -= ___
```

### Solução
```python
import numpy as np


class SGD:
    def __init__(self, taxa):
        self.taxa = taxa

    def passo(self, params, grads):
        for p, g in zip(params, grads):
            p -= self.taxa * g


class Momentum:
    def __init__(self, taxa, beta=0.9):
        self.taxa = taxa
        self.beta = beta
        self.v = None

    def passo(self, params, grads):
        if self.v is None:
            self.v = [np.zeros_like(p) for p in params]
        for i, (p, g) in enumerate(zip(params, grads)):
            self.v[i] = self.beta * self.v[i] + (1 - self.beta) * g
            p -= self.taxa * self.v[i]
```

### Dicas
1. `np.zeros_like(p)` cria um array de zeros com a forma de `p`.
2. A velocidade nova usa a velocidade antiga da **mesma** posição, `self.v[i]`.
3. Quem anda é a velocidade: o gradiente só entra no passo por meio dela.

### Verificação
```json
[
  {"id": "sgd-um-passo", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nW = np.array([[1.0, 2.0], [3.0, 4.0]])\nb = np.array([0.5, -0.5])\ngW = np.array([[1.0, -1.0], [2.0, 0.0]])\ngb = np.array([1.0, -2.0])\nSGD(0.1).passo([W, b], [gW, gb])", "expr": "[W.tolist(), b.tolist()]", "expected": [[[0.9, 2.1], [2.8, 4.0]], [0.4, -0.3]], "tolerance": 1e-12, "name": "SGD(0.1): um passo em dois arrays, alterados no lugar", "hint": "Cada array perde taxa vezes o seu gradiente; W e b de fora precisam mudar."},
  {"id": "sgd-dois-passos", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nW = np.array([[1.0, 2.0], [3.0, 4.0]])\nb = np.array([0.5, -0.5])\ngW = np.array([[1.0, -1.0], [2.0, 0.0]])\ngb = np.array([1.0, -2.0])\no = SGD(0.5)\no.passo([W, b], [gW, gb])\no.passo([W, b], [2 * gW, gb])", "expr": "[W.tolist(), b.tolist()]", "expected": [[[-0.5, 3.5], [0.0, 4.0]], [-0.5, 1.5]], "tolerance": 1e-12, "name": "SGD(0.5): dois passos com gradientes diferentes"},
  {"id": "sgd-grads-intactos", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nW = np.array([[1.0, 2.0], [3.0, 4.0]])\nb = np.array([0.5, -0.5])\ngW = np.array([[1.0, -1.0], [2.0, 0.0]])\ngb = np.array([1.0, -2.0])\nSGD(0.1).passo([W, b], [gW, gb])", "expr": "[gW.tolist(), gb.tolist()]", "expected": [[[1.0, -1.0], [2.0, 0.0]], [1.0, -2.0]], "tolerance": 1e-12, "name": "Os gradientes recebidos não mudam"},
  {"id": "mom-primeiro-passo", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nW = np.array([[1.0, 2.0], [3.0, 4.0]])\nb = np.array([0.5, -0.5])\ngW = np.array([[1.0, -1.0], [2.0, 0.0]])\ngb = np.array([1.0, -2.0])\nMomentum(1.0).passo([W, b], [gW, gb])", "expr": "[W.tolist(), b.tolist()]", "expected": [[[0.9, 2.1], [2.8, 4.0]], [0.4, -0.30000000000000004]], "tolerance": 1e-12, "name": "Momentum(1.0): no primeiro passo a velocidade é 0.1 vezes o gradiente", "hint": "v = beta * v + (1 - beta) * g, com v começando em zero e beta 0.9."},
  {"id": "mom-tres-passos", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nW = np.array([[1.0, 2.0], [3.0, 4.0]])\nb = np.array([0.5, -0.5])\ngW = np.array([[1.0, -1.0], [2.0, 0.0]])\ngb = np.array([1.0, -2.0])\no = Momentum(1.0)\nfor _ in range(3):\n    o.passo([W, b], [gW, gb])", "expr": "[W.tolist(), b.tolist()]", "expected": [[[0.43900000000000017, 2.561], [1.8780000000000001, 4.0]], [-0.06099999999999983, 0.6219999999999997]], "tolerance": 1e-12, "name": "Momentum(1.0), três passos com o mesmo gradiente: as velocidades são 0.1, 0.19 e 0.271 vezes o gradiente", "hint": "A velocidade de cada passo parte da velocidade do passo anterior."},
  {"id": "mom-gradiente-inverte", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nW = np.array([[1.0, 2.0], [3.0, 4.0]])\nb = np.array([0.5, -0.5])\ngW = np.array([[1.0, -1.0], [2.0, 0.0]])\ngb = np.array([1.0, -2.0])\no = Momentum(0.5, 0.5)\no.passo([W, b], [gW, gb])\no.passo([W, b], [-gW, -gb])\no.passo([W, b], [-gW, -gb])", "expr": "[W.tolist(), b.tolist()]", "expected": [[[1.1875, 1.8125], [3.375, 4.0]], [0.6875, -0.875]], "tolerance": 1e-12, "name": "Momentum(0.5, 0.5): o gradiente inverte o sinal e a velocidade demora um passo para virar", "hint": "No segundo passo, a velocidade é 0.5 * v - 0.5 * g = 0: os parâmetros não andam."},
  {"id": "mom-estado-por-posicao", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\na = np.array([1.0])\nc = np.array([1.0])\no = Momentum(1.0, 0.5)\no.passo([a, c], [np.array([4.0]), np.array([0.0])])\no.passo([a, c], [np.array([0.0]), np.array([0.0])])", "expr": "[a.tolist(), c.tolist()]", "expected": [[-2.0], [1.0]], "tolerance": 1e-12, "name": "Cada array tem a sua velocidade: o de gradiente zero não sai do lugar", "hint": "A velocidade é uma lista com um array por posição de params."},
  {"id": "mom-formas", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nrng = np.random.default_rng(0)\nps = [rng.normal(size=(3, 2)), rng.normal(size=2), rng.normal(size=(2, 4))]\ngs = [rng.normal(size=p.shape) for p in ps]\nref = [p - 0.3 * (0.1 * g + 0.19 * g) for p, g in zip(ps, gs)]\no = Momentum(0.3)\no.passo(ps, gs)\no.passo(ps, gs)", "expr": "[[list(p.shape) for p in ps], all(bool(np.allclose(p, r, atol=1e-12)) for p, r in zip(ps, ref))]", "expected": [[[3, 2], [2], [2, 4]], true], "tolerance": 1e-12, "name": "Três arrays de formas diferentes: dois passos batem com a conta feita à mão", "hint": "Depois de dois passos com o mesmo gradiente g, cada array andou taxa * (0.1 + 0.19) * g."},
  {"id": "mom-duas-instancias", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\na = np.array([1.0, 2.0])\nc = np.array([1.0, 2.0])\ng = np.array([1.0, -1.0])\no1 = Momentum(1.0)\no2 = Momentum(1.0)\nfor _ in range(3):\n    o1.passo([a], [g])\no2.passo([c], [g])", "expr": "[a.tolist(), c.tolist()]", "expected": [[0.43900000000000017, 2.561], [0.9, 2.1]], "tolerance": 1e-12, "name": "Dois otimizadores não dividem a velocidade: o segundo começa do zero", "hint": "O estado nasce no __init__ de cada objeto."},
  {"id": "mom-beta-zero", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nW = np.array([[1.0, 2.0], [3.0, 4.0]])\nb = np.array([0.5, -0.5])\ngW = np.array([[1.0, -1.0], [2.0, 0.0]])\ngb = np.array([1.0, -2.0])\nW2, b2 = W.copy(), b.copy()\no = Momentum(0.1, 0.0)\ns = SGD(0.1)\nfor _ in range(2):\n    o.passo([W, b], [gW, gb])\n    s.passo([W2, b2], [gW, gb])", "expr": "[bool(np.allclose(W, W2, atol=1e-12)), bool(np.allclose(b, b2, atol=1e-12)), W.tolist()]", "expected": [true, true, [[0.8, 2.2], [2.5999999999999996, 4.0]]], "tolerance": 1e-12, "name": "Com beta 0, o Momentum é o SGD"}
]
```

### Soluções erradas
```python name="momentum sem o fator (1 - beta)"
import numpy as np


class SGD:
    def __init__(self, taxa):
        self.taxa = taxa

    def passo(self, params, grads):
        for p, g in zip(params, grads):
            p -= self.taxa * g


class Momentum:
    def __init__(self, taxa, beta=0.9):
        self.taxa = taxa
        self.beta = beta
        self.v = None

    def passo(self, params, grads):
        if self.v is None:
            self.v = [np.zeros_like(p) for p in params]
        for i, (p, g) in enumerate(zip(params, grads)):
            self.v[i] = self.beta * self.v[i] + g
            p -= self.taxa * self.v[i]
```
```python name="beta e (1 - beta) trocados"
import numpy as np


class SGD:
    def __init__(self, taxa):
        self.taxa = taxa

    def passo(self, params, grads):
        for p, g in zip(params, grads):
            p -= self.taxa * g


class Momentum:
    def __init__(self, taxa, beta=0.9):
        self.taxa = taxa
        self.beta = beta
        self.v = None

    def passo(self, params, grads):
        if self.v is None:
            self.v = [np.zeros_like(p) for p in params]
        for i, (p, g) in enumerate(zip(params, grads)):
            self.v[i] = (1 - self.beta) * self.v[i] + self.beta * g
            p -= self.taxa * self.v[i]
```
```python name="velocidade sem memória"
import numpy as np


class SGD:
    def __init__(self, taxa):
        self.taxa = taxa

    def passo(self, params, grads):
        for p, g in zip(params, grads):
            p -= self.taxa * g


class Momentum:
    def __init__(self, taxa, beta=0.9):
        self.taxa = taxa
        self.beta = beta
        self.v = None

    def passo(self, params, grads):
        if self.v is None:
            self.v = [np.zeros_like(p) for p in params]
        for i, (p, g) in enumerate(zip(params, grads)):
            self.v[i] = (1 - self.beta) * g
            p -= self.taxa * self.v[i]
```
```python name="passo com o gradiente, não com a velocidade"
import numpy as np


class SGD:
    def __init__(self, taxa):
        self.taxa = taxa

    def passo(self, params, grads):
        for p, g in zip(params, grads):
            p -= self.taxa * g


class Momentum:
    def __init__(self, taxa, beta=0.9):
        self.taxa = taxa
        self.beta = beta
        self.v = None

    def passo(self, params, grads):
        if self.v is None:
            self.v = [np.zeros_like(p) for p in params]
        for i, (p, g) in enumerate(zip(params, grads)):
            self.v[i] = self.beta * self.v[i] + (1 - self.beta) * g
            p -= self.taxa * g
```
```python name="velocidade começa em 1"
import numpy as np


class SGD:
    def __init__(self, taxa):
        self.taxa = taxa

    def passo(self, params, grads):
        for p, g in zip(params, grads):
            p -= self.taxa * g


class Momentum:
    def __init__(self, taxa, beta=0.9):
        self.taxa = taxa
        self.beta = beta
        self.v = None

    def passo(self, params, grads):
        if self.v is None:
            self.v = [np.ones_like(p) for p in params]
        for i, (p, g) in enumerate(zip(params, grads)):
            self.v[i] = self.beta * self.v[i] + (1 - self.beta) * g
            p -= self.taxa * self.v[i]
```
```python name="SGD sem a taxa"
import numpy as np


class SGD:
    def __init__(self, taxa):
        self.taxa = taxa

    def passo(self, params, grads):
        for p, g in zip(params, grads):
            p -= g


class Momentum:
    def __init__(self, taxa, beta=0.9):
        self.taxa = taxa
        self.beta = beta
        self.v = None

    def passo(self, params, grads):
        if self.v is None:
            self.v = [np.zeros_like(p) for p in params]
        for i, (p, g) in enumerate(zip(params, grads)):
            self.v[i] = self.beta * self.v[i] + (1 - self.beta) * g
            p -= self.taxa * self.v[i]
```
```python name="SGD soma o gradiente"
import numpy as np


class SGD:
    def __init__(self, taxa):
        self.taxa = taxa

    def passo(self, params, grads):
        for p, g in zip(params, grads):
            p -= -self.taxa * g


class Momentum:
    def __init__(self, taxa, beta=0.9):
        self.taxa = taxa
        self.beta = beta
        self.v = None

    def passo(self, params, grads):
        if self.v is None:
            self.v = [np.zeros_like(p) for p in params]
        for i, (p, g) in enumerate(zip(params, grads)):
            self.v[i] = self.beta * self.v[i] + (1 - self.beta) * g
            p -= self.taxa * self.v[i]
```

## Passo 4 · Leitura · RMSProp e Adam

O momentum resolve a oscilação, mas a taxa continua única para todos os parâmetros. No vale, a direção $y$ pedia uma taxa 20 vezes menor que a direção $x$. O **RMSProp** dá a cada número a sua escala: guarda a média móvel do **quadrado** do gradiente e divide o passo pela raiz dela.

$$
s \leftarrow \beta\, s + (1 - \beta)\, g^2 \qquad \theta \leftarrow \theta - \eta\, \frac{g}{\sqrt{s} + \varepsilon}
$$

Um parâmetro com gradientes grandes tem $\sqrt{s}$ grande e anda menos; um com gradientes pequenos anda mais. O $\varepsilon$ evita a divisão por zero quando o gradiente é nulo.

O **Adam** junta as duas ideias: a média dos gradientes $m$ (o momentum) e a média dos quadrados $v$ (o RMSProp).

$$
m \leftarrow \beta_1 m + (1 - \beta_1)\, g \qquad v \leftarrow \beta_2 v + (1 - \beta_2)\, g^2
$$

$$
\hat m = \frac{m}{1 - \beta_1^{\,t}} \qquad \hat v = \frac{v}{1 - \beta_2^{\,t}} \qquad \theta \leftarrow \theta - \eta\, \frac{\hat m}{\sqrt{\hat v} + \varepsilon}
$$

Os valores usuais são $\beta_1 = 0{,}9$, $\beta_2 = 0{,}999$ e $\varepsilon = 10^{-8}$, e $t$ é o número do passo, **começando em 1**.

As divisões por $1 - \beta^t$ são a **correção de viés**. As médias começam em zero, então nos primeiros passos elas subestimam o que medem: com gradiente constante $g = 1$, depois de um passo $m = 0{,}1$ e $v = 0{,}001$. Como $v$ esquece mais devagar, ele demora mais a encher, e a razão $m / \sqrt{v}$ sai grande demais:

| $t$ | $m$ | $v$ | $m / \sqrt{v}$ (sem correção) | $\hat m / \sqrt{\hat v}$ |
|---|---|---|---|---|
| 1 | 0,100 | 0,00100 | 3,16 | 1,00 |
| 2 | 0,190 | 0,00200 | 4,25 | 1,00 |
| 3 | 0,271 | 0,00300 | 4,95 | 1,00 |
| 10 | 0,651 | 0,00996 | 6,53 | 1,00 |

Sem a correção, os primeiros passos seriam de 3 a 6 vezes maiores que o pedido. Com ela, a razão é 1: no primeiro passo, $\hat m = g$ e $\sqrt{\hat v} = |g|$, e cada número anda exatamente $\eta$ contra o sinal do seu gradiente, seja o gradiente 100 ou 0,01. É essa a leitura da taxa do Adam: o tamanho típico do passo de cada parâmetro, e não um multiplicador do gradiente. Se $t$ começasse em 0, a correção dividiria por $1 - \beta^0 = 0$.

O estado tem a forma do momentum, em dobro: um `m` e um `v` por array, e um contador `t` por otimizador.

```python
self.t += 1
for i, (p, g) in enumerate(zip(params, grads)):
    self.m[i] = self.beta1 * self.m[i] + (1 - self.beta1) * g
    self.v[i] = self.beta2 * self.v[i] + (1 - self.beta2) * g * g
```

No numpy do executor, um Adam sem $\varepsilon$ e com um gradiente zero não levanta erro: $0 / 0$ dá `nan` em silêncio, o `nan` entra no parâmetro e contamina a rede inteira no forward seguinte.

## Passo 5 · Exercício · `Adam`

Escreva a classe `Adam` com as fórmulas da leitura.

### Instruções
1. `Adam(taxa=0.001, beta1=0.9, beta2=0.999, eps=1e-8)` guarda os hiperparâmetros e cria o atributo `t`, o número de passos já dados, que começa em 0.
2. `passo(params, grads)` soma 1 a `t` (uma vez por chamada), atualiza as médias $m$ e $v$ de cada array, aplica a correção de viés com o `t` já somado e faz `p -= taxa * m_c / (np.sqrt(v_c) + eps)`, com o `eps` fora da raiz. Os arrays de `params` mudam no lugar.
3. `m` e `v` são um par de arrays de zeros por posição de `params`, criados no primeiro `passo` e guardados no objeto: dois otimizadores não dividem estado.

### Código inicial
```python
import numpy as np


class Adam:
    def __init__(self, taxa=0.001, beta1=0.9, beta2=0.999, eps=1e-8):
        pass

    def passo(self, params, grads):
        pass
```

### Solução
```python
import numpy as np


class Adam:
    def __init__(self, taxa=0.001, beta1=0.9, beta2=0.999, eps=1e-8):
        self.taxa = taxa
        self.beta1 = beta1
        self.beta2 = beta2
        self.eps = eps
        self.t = 0
        self.m = None
        self.v = None

    def passo(self, params, grads):
        if self.m is None:
            self.m = [np.zeros_like(p) for p in params]
            self.v = [np.zeros_like(p) for p in params]
        self.t += 1
        for i, (p, g) in enumerate(zip(params, grads)):
            self.m[i] = self.beta1 * self.m[i] + (1 - self.beta1) * g
            self.v[i] = self.beta2 * self.v[i] + (1 - self.beta2) * g * g
            m_c = self.m[i] / (1 - self.beta1 ** self.t)
            v_c = self.v[i] / (1 - self.beta2 ** self.t)
            p -= self.taxa * m_c / (np.sqrt(v_c) + self.eps)
```

### Dicas
1. Comece pelo `Momentum` do passo 3: o `Adam` tem duas listas de estado no lugar de uma, e um contador.
2. `self.beta1 ** self.t` é a potência que entra na correção; no primeiro passo, `t` já vale 1.
3. `p -= ...` altera o array recebido; `p = p - ...` cria outro array e deixa o de fora como estava.

### Verificação
```json
[
  {"id": "primeiro-passo", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nW = np.array([[1.0, 2.0], [3.0, 4.0]])\nb = np.array([0.5, -0.5])\ngW = np.array([[1.0, -1.0], [2.0, 0.5]])\ngb = np.array([100.0, -0.01])\nAdam(0.1).passo([W, b], [gW, gb])", "expr": "[W.tolist(), b.tolist()]", "expected": [[[0.900000001, 2.099999999], [2.9000000005, 3.900000002]], [0.40000000001, -0.4000000999999]], "tolerance": 1e-12, "name": "Adam(0.1), primeiro passo: cada número anda 0.1 contra o sinal do seu gradiente, seja ele 100 ou 0.01", "hint": "Com a correção de viés, no passo 1 a média corrigida é g e a raiz da média dos quadrados é |g|."},
  {"id": "tres-passos", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nW = np.array([[1.0, 2.0], [3.0, 4.0]])\nb = np.array([0.5, -0.5])\ngW = np.array([[1.0, -1.0], [2.0, 0.5]])\ngb = np.array([100.0, -0.01])\no = Adam(0.1)\no.passo([W, b], [gW, gb])\no.passo([W, b], [2 * gW, -gb])\no.passo([W, b], [gW * gW, gb])", "expr": "[W.tolist(), b.tolist()]", "expected": [[[0.7092878626824979, 2.2385271310318133], [2.7052847097025783, 3.716725074993494]], [0.3716838221142105, -0.37168395041742847]], "tolerance": 1e-12, "name": "Três passos com gradientes diferentes: valores literais", "hint": "t vale 1, 2 e 3 nesses passos; a correção divide por 1 - beta ** t."},
  {"id": "t", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nW = np.array([[1.0, 2.0], [3.0, 4.0]])\nb = np.array([0.5, -0.5])\ngW = np.array([[1.0, -1.0], [2.0, 0.5]])\ngb = np.array([100.0, -0.01])\no = Adam(0.1)\nantes = o.t\nfor _ in range(3):\n    o.passo([W, b], [gW, gb])", "expr": "[antes, o.t]", "expected": [0, 3], "name": "O atributo t vale 0 antes do primeiro passo e 3 depois de três", "hint": "t sobe uma vez por chamada de passo, não uma vez por array."},
  {"id": "padroes", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\np = np.array([1.0, -1.0])\nAdam().passo([p], [np.array([5.0, -0.2])])", "expr": "p.tolist()", "expected": [0.999000000002, -0.99900000005], "tolerance": 1e-12, "name": "Adam() usa taxa 0.001, beta1 0.9, beta2 0.999 e eps 1e-8"},
  {"id": "betas", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\np = np.array([1.0, -1.0])\no = Adam(0.1, beta1=0.5, beta2=0.9)\no.passo([p], [np.array([1.0, 4.0])])\no.passo([p], [np.array([3.0, -4.0])])", "expr": "p.tolist()", "expected": [0.7977799751209359, -1.0666666665], "tolerance": 1e-12, "name": "Adam(0.1, beta1=0.5, beta2=0.9): dois passos"},
  {"id": "estado-por-posicao", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\na = np.array([1.0])\nc = np.array([1.0])\no = Adam(0.1)\no.passo([a, c], [np.array([4.0]), np.array([0.0])])\no.passo([a, c], [np.array([4.0]), np.array([0.0])])", "expr": "[a.tolist(), c.tolist()]", "expected": [[0.8000000005000006], [1.0]], "tolerance": 1e-12, "name": "Dois arrays no mesmo otimizador: o de gradiente zero fica em 1.0", "hint": "m e v são listas com um array por posição de params."},
  {"id": "gradiente-nulo", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\np = np.array([1.0, 2.0])\no = Adam(0.1)\no.passo([p], [np.zeros(2)])\no.passo([p], [np.array([0.0, 1.0])])", "expr": "[bool(np.all(np.isfinite(p))), p.tolist()]", "expected": [true, [1.0, 1.925586318695407]], "tolerance": 1e-12, "name": "Gradiente zero não gera nan: o parâmetro fica parado", "hint": "O eps no denominador evita a divisão 0 / 0."},
  {"id": "gradiente-pequeno", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\np = np.array([1.0])\nAdam(0.1).passo([p], [np.array([1e-6])])", "expr": "p.tolist()", "expected": [0.900990099009901], "tolerance": 1e-12, "name": "Gradiente 1e-6: o passo é 0.1 * 1e-6 / (1e-6 + 1e-8)", "hint": "O eps é somado fora da raiz."},
  {"id": "duas-instancias", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\na = np.array([1.0, 2.0])\nc = np.array([1.0, 2.0])\no1 = Adam(0.1)\no2 = Adam(0.1)\no1.passo([a], [np.array([1.0, -3.0])])\no1.passo([a], [np.array([-2.0, 5.0])])\no2.passo([c], [np.array([-2.0, 5.0])])", "expr": "[a.tolist(), c.tolist(), o1.t, o2.t]", "expected": [[0.9366103534720749, 2.070643879261156], [1.0999999995, 1.9000000002], 2, 1], "tolerance": 1e-12, "name": "Dois Adam independentes: o segundo começa com m, v e t zerados", "hint": "O estado nasce no __init__ de cada objeto, não na classe."},
  {"id": "no-lugar", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nrng = np.random.default_rng(1)\nps = [rng.normal(size=(3, 2)), rng.normal(size=2)]\ncopias = [p.copy() for p in ps]\ngs = [rng.normal(size=p.shape) for p in ps]\nAdam(0.1).passo(ps, gs)", "expr": "[bool(np.allclose(p, c - 0.1 * np.sign(g), atol=1e-6)) for p, c, g in zip(ps, copias, gs)]", "expected": [true, true], "name": "Os arrays recebidos são alterados no lugar, cada número em 0.1 contra o sinal do gradiente", "hint": "Use p -= ..., que muda o array; p = p - ... cria outro e deixa o de fora igual."}
]
```

### Soluções erradas
```python name="um m e um v para todos os parâmetros"
import numpy as np


class Adam:
    def __init__(self, taxa=0.001, beta1=0.9, beta2=0.999, eps=1e-8):
        self.taxa = taxa
        self.beta1 = beta1
        self.beta2 = beta2
        self.eps = eps
        self.t = 0
        self.m = None
        self.v = None

    def passo(self, params, grads):
        if self.m is None:
            self.m = 0.0
            self.v = 0.0
        self.t += 1
        for i, (p, g) in enumerate(zip(params, grads)):
            self.m = self.beta1 * self.m + (1 - self.beta1) * g
            self.v = self.beta2 * self.v + (1 - self.beta2) * g * g
            m_c = self.m / (1 - self.beta1 ** self.t)
            v_c = self.v / (1 - self.beta2 ** self.t)
            p -= self.taxa * m_c / (np.sqrt(v_c) + self.eps)
```
```python name="sem eps"
import numpy as np


class Adam:
    def __init__(self, taxa=0.001, beta1=0.9, beta2=0.999, eps=1e-8):
        self.taxa = taxa
        self.beta1 = beta1
        self.beta2 = beta2
        self.eps = eps
        self.t = 0
        self.m = None
        self.v = None

    def passo(self, params, grads):
        if self.m is None:
            self.m = [np.zeros_like(p) for p in params]
            self.v = [np.zeros_like(p) for p in params]
        self.t += 1
        for i, (p, g) in enumerate(zip(params, grads)):
            self.m[i] = self.beta1 * self.m[i] + (1 - self.beta1) * g
            self.v[i] = self.beta2 * self.v[i] + (1 - self.beta2) * g * g
            m_c = self.m[i] / (1 - self.beta1 ** self.t)
            v_c = self.v[i] / (1 - self.beta2 ** self.t)
            p -= self.taxa * m_c / np.sqrt(v_c)
```
```python name="eps dentro da raiz"
import numpy as np


class Adam:
    def __init__(self, taxa=0.001, beta1=0.9, beta2=0.999, eps=1e-8):
        self.taxa = taxa
        self.beta1 = beta1
        self.beta2 = beta2
        self.eps = eps
        self.t = 0
        self.m = None
        self.v = None

    def passo(self, params, grads):
        if self.m is None:
            self.m = [np.zeros_like(p) for p in params]
            self.v = [np.zeros_like(p) for p in params]
        self.t += 1
        for i, (p, g) in enumerate(zip(params, grads)):
            self.m[i] = self.beta1 * self.m[i] + (1 - self.beta1) * g
            self.v[i] = self.beta2 * self.v[i] + (1 - self.beta2) * g * g
            m_c = self.m[i] / (1 - self.beta1 ** self.t)
            v_c = self.v[i] / (1 - self.beta2 ** self.t)
            p -= self.taxa * m_c / np.sqrt(v_c + self.eps)
```
```python name="correção de viés com t começando em 0"
import numpy as np


class Adam:
    def __init__(self, taxa=0.001, beta1=0.9, beta2=0.999, eps=1e-8):
        self.taxa = taxa
        self.beta1 = beta1
        self.beta2 = beta2
        self.eps = eps
        self.t = 0
        self.m = None
        self.v = None

    def passo(self, params, grads):
        if self.m is None:
            self.m = [np.zeros_like(p) for p in params]
            self.v = [np.zeros_like(p) for p in params]
        for i, (p, g) in enumerate(zip(params, grads)):
            self.m[i] = self.beta1 * self.m[i] + (1 - self.beta1) * g
            self.v[i] = self.beta2 * self.v[i] + (1 - self.beta2) * g * g
            m_c = self.m[i] / (1 - self.beta1 ** self.t)
            v_c = self.v[i] / (1 - self.beta2 ** self.t)
            p -= self.taxa * m_c / (np.sqrt(v_c) + self.eps)
        self.t += 1
```
```python name="sem correção de viés"
import numpy as np


class Adam:
    def __init__(self, taxa=0.001, beta1=0.9, beta2=0.999, eps=1e-8):
        self.taxa = taxa
        self.beta1 = beta1
        self.beta2 = beta2
        self.eps = eps
        self.t = 0
        self.m = None
        self.v = None

    def passo(self, params, grads):
        if self.m is None:
            self.m = [np.zeros_like(p) for p in params]
            self.v = [np.zeros_like(p) for p in params]
        self.t += 1
        for i, (p, g) in enumerate(zip(params, grads)):
            self.m[i] = self.beta1 * self.m[i] + (1 - self.beta1) * g
            self.v[i] = self.beta2 * self.v[i] + (1 - self.beta2) * g * g
            m_c = self.m[i] / (1 - self.beta1 ** self.t)
            v_c = self.v[i] / (1 - self.beta2 ** self.t)
            p -= self.taxa * self.m[i] / (np.sqrt(self.v[i]) + self.eps)
```
```python name="t sobe uma vez por array"
import numpy as np


class Adam:
    def __init__(self, taxa=0.001, beta1=0.9, beta2=0.999, eps=1e-8):
        self.taxa = taxa
        self.beta1 = beta1
        self.beta2 = beta2
        self.eps = eps
        self.t = 0
        self.m = None
        self.v = None

    def passo(self, params, grads):
        if self.m is None:
            self.m = [np.zeros_like(p) for p in params]
            self.v = [np.zeros_like(p) for p in params]
        for i, (p, g) in enumerate(zip(params, grads)):
            self.t += 1
            self.m[i] = self.beta1 * self.m[i] + (1 - self.beta1) * g
            self.v[i] = self.beta2 * self.v[i] + (1 - self.beta2) * g * g
            m_c = self.m[i] / (1 - self.beta1 ** self.t)
            v_c = self.v[i] / (1 - self.beta2 ** self.t)
            p -= self.taxa * m_c / (np.sqrt(v_c) + self.eps)
```
```python name="v com o gradiente sem o quadrado"
import numpy as np


class Adam:
    def __init__(self, taxa=0.001, beta1=0.9, beta2=0.999, eps=1e-8):
        self.taxa = taxa
        self.beta1 = beta1
        self.beta2 = beta2
        self.eps = eps
        self.t = 0
        self.m = None
        self.v = None

    def passo(self, params, grads):
        if self.m is None:
            self.m = [np.zeros_like(p) for p in params]
            self.v = [np.zeros_like(p) for p in params]
        self.t += 1
        for i, (p, g) in enumerate(zip(params, grads)):
            self.m[i] = self.beta1 * self.m[i] + (1 - self.beta1) * g
            self.v[i] = self.beta2 * self.v[i] + (1 - self.beta2) * g
            m_c = self.m[i] / (1 - self.beta1 ** self.t)
            v_c = self.v[i] / (1 - self.beta2 ** self.t)
            p -= self.taxa * m_c / (np.sqrt(v_c) + self.eps)
```
```python name="atualiza uma cópia"
import numpy as np


class Adam:
    def __init__(self, taxa=0.001, beta1=0.9, beta2=0.999, eps=1e-8):
        self.taxa = taxa
        self.beta1 = beta1
        self.beta2 = beta2
        self.eps = eps
        self.t = 0
        self.m = None
        self.v = None

    def passo(self, params, grads):
        if self.m is None:
            self.m = [np.zeros_like(p) for p in params]
            self.v = [np.zeros_like(p) for p in params]
        self.t += 1
        for i, (p, g) in enumerate(zip(params, grads)):
            self.m[i] = self.beta1 * self.m[i] + (1 - self.beta1) * g
            self.v[i] = self.beta2 * self.v[i] + (1 - self.beta2) * g * g
            m_c = self.m[i] / (1 - self.beta1 ** self.t)
            v_c = self.v[i] / (1 - self.beta2 ** self.t)
            p = p - self.taxa * m_c / (np.sqrt(v_c) + self.eps)
```
```python name="estado como atributo de classe"
import numpy as np


class Adam:
    t = 0
    m = None
    v = None

    def __init__(self, taxa=0.001, beta1=0.9, beta2=0.999, eps=1e-8):
        self.taxa = taxa
        self.beta1 = beta1
        self.beta2 = beta2
        self.eps = eps

    def passo(self, params, grads):
        if Adam.m is None:
            Adam.m = [np.zeros_like(p) for p in params]
            Adam.v = [np.zeros_like(p) for p in params]
        Adam.t += 1
        for i, (p, g) in enumerate(zip(params, grads)):
            self.m[i] = self.beta1 * self.m[i] + (1 - self.beta1) * g
            self.v[i] = self.beta2 * self.v[i] + (1 - self.beta2) * g * g
            m_c = self.m[i] / (1 - self.beta1 ** self.t)
            v_c = self.v[i] / (1 - self.beta2 ** self.t)
            p -= self.taxa * m_c / (np.sqrt(v_c) + self.eps)
```

## Passo 6 · Leitura · L2 contra weight decay desacoplado

A regularização L2 do Nível 5 soma $\frac{\lambda}{2} \lVert \theta \rVert^2$ à perda, o que soma $\lambda\theta$ ao gradiente. No SGD, isso dá

$$
\theta \leftarrow \theta - \eta\,(g + \lambda\theta) = (1 - \eta\lambda)\,\theta - \eta\, g
$$

Cada passo encolhe o parâmetro por um fator fixo e depois anda contra o gradiente. Daí o outro nome, **weight decay** (decaimento dos pesos). No SGD, somar $\lambda\theta$ ao gradiente e encolher o peso são a mesma conta.

No Adam, não são. Se o $\lambda\theta$ entra no gradiente, ele passa por $m$ e por $v$ e é dividido por $\sqrt{\hat v}$ junto com o resto. O encolhimento deixa de ser proporcional a $\lambda$: um peso com gradientes grandes quase não decai, e um peso sem gradiente decai no ritmo da taxa, qualquer que seja o $\lambda$. Medido no executor, um peso que vale 1,0 e tem gradiente da perda sempre zero, com taxa 0,01, depois de 50 passos:

| Método | $\lambda = 0{,}1$ | $\lambda = 0{,}001$ |
|---|---|---|
| SGD com L2 | 0,951 | 0,9995 |
| Adam com L2 no gradiente | 0,537 | 0,537 |
| AdamW | 0,951 | 0,9995 |

No Adam com L2, mudar o $\lambda$ em 100 vezes não mudou nada: o gradiente $\lambda\theta$ foi normalizado, e o peso andou 0,01 por passo nos dois casos. O hiperparâmetro perdeu o sentido.

O **AdamW** conserta isso tirando o decaimento de dentro das médias. O gradiente da perda segue pelo Adam sem alteração, e o encolhimento é aplicado direto no parâmetro:

$$
\theta \leftarrow \theta - \eta \left( \frac{\hat m}{\sqrt{\hat v} + \varepsilon} + \lambda\, \theta \right)
$$

```python
p -= self.taxa * (m_c / (np.sqrt(v_c) + self.eps) + self.decaimento * p)
```

Por isso o decaimento é chamado de **desacoplado**: ele não depende do histórico de gradientes do parâmetro. Com gradiente zero, cada passo multiplica o peso por $1 - \eta\lambda$, como no SGD.

Dois cuidados práticos. O decaimento costuma valer só para as matrizes de pesos, e não para vieses nem para os ganhos das normalizações: basta passar ao otimizador com decaimento a lista dos arrays que devem decair. E o AdamW com $\lambda = 0$ é exatamente o Adam.

Uma última medida, para não sair com a ideia de que o Adam ganha sempre. No vale do passo 1, em 50 passos, o SGD com taxa 0,09 chega à distância 0,090, o Momentum a 0,0010 e o Adam com taxa 0,5 a 0,38: como ele anda cerca de $\eta$ por passo, gasta 20 passos para percorrer $x = 10$ e depois oscila em torno do mínimo. A vantagem do Adam está em redes com milhares de parâmetros de escalas diferentes, onde ninguém consegue ajustar uma taxa por direção.

## Passo 7 · Exercício · `AdamW` e comparação

O arquivo `otimizadores.py` traz `SGD`, `Momentum` e `Adam`. Escreva o `AdamW` e a função que compara otimizadores numa função-teste cujo mínimo está na origem.

### Instruções
1. `AdamW(taxa=0.001, decaimento=0.01, beta1=0.9, beta2=0.999, eps=1e-8)` tem o mesmo estado do `Adam` (`t`, e `m` e `v` por posição) e as mesmas médias, calculadas só com o gradiente recebido.
2. O passo do `AdamW` é `p -= taxa * (m_c / (np.sqrt(v_c) + eps) + decaimento * p)`, com o `p` de antes do passo.
3. `comparar_otimizadores(grad, x0, otimizadores, passos)` recebe a função `grad(x)`, que devolve o gradiente no ponto `x`, e uma lista de otimizadores. Para cada um, parte de uma cópia de `x0`, dá `passos` passos com `otimizador.passo([x], [grad(x)])` e mede a distância do ponto final à origem. Devolve a lista das distâncias, como `float`.
4. `x0` não muda, e todo otimizador parte do mesmo ponto.

### Código inicial
```python
import numpy as np
from otimizadores import SGD, Momentum, Adam


class AdamW:
    def __init__(self, taxa=0.001, decaimento=0.01, beta1=0.9, beta2=0.999, eps=1e-8):
        pass

    def passo(self, params, grads):
        pass


def comparar_otimizadores(grad, x0, otimizadores, passos):
    pass
```
```python path=otimizadores.py
import numpy as np


class SGD:
    def __init__(self, taxa):
        self.taxa = taxa

    def passo(self, params, grads):
        for p, g in zip(params, grads):
            p -= self.taxa * g


class Momentum:
    def __init__(self, taxa, beta=0.9):
        self.taxa = taxa
        self.beta = beta
        self.v = None

    def passo(self, params, grads):
        if self.v is None:
            self.v = [np.zeros_like(p) for p in params]
        for i, (p, g) in enumerate(zip(params, grads)):
            self.v[i] = self.beta * self.v[i] + (1 - self.beta) * g
            p -= self.taxa * self.v[i]


class Adam:
    def __init__(self, taxa=0.001, beta1=0.9, beta2=0.999, eps=1e-8):
        self.taxa = taxa
        self.beta1 = beta1
        self.beta2 = beta2
        self.eps = eps
        self.t = 0
        self.m = None
        self.v = None

    def passo(self, params, grads):
        if self.m is None:
            self.m = [np.zeros_like(p) for p in params]
            self.v = [np.zeros_like(p) for p in params]
        self.t += 1
        for i, (p, g) in enumerate(zip(params, grads)):
            self.m[i] = self.beta1 * self.m[i] + (1 - self.beta1) * g
            self.v[i] = self.beta2 * self.v[i] + (1 - self.beta2) * g * g
            m_c = self.m[i] / (1 - self.beta1 ** self.t)
            v_c = self.v[i] / (1 - self.beta2 ** self.t)
            p -= self.taxa * m_c / (np.sqrt(v_c) + self.eps)
```

### Solução
```python
import numpy as np
from otimizadores import SGD, Momentum, Adam


class AdamW:
    def __init__(self, taxa=0.001, decaimento=0.01, beta1=0.9, beta2=0.999, eps=1e-8):
        self.taxa = taxa
        self.decaimento = decaimento
        self.beta1 = beta1
        self.beta2 = beta2
        self.eps = eps
        self.t = 0
        self.m = None
        self.v = None

    def passo(self, params, grads):
        if self.m is None:
            self.m = [np.zeros_like(p) for p in params]
            self.v = [np.zeros_like(p) for p in params]
        self.t += 1
        for i, (p, g) in enumerate(zip(params, grads)):
            self.m[i] = self.beta1 * self.m[i] + (1 - self.beta1) * g
            self.v[i] = self.beta2 * self.v[i] + (1 - self.beta2) * g * g
            m_c = self.m[i] / (1 - self.beta1 ** self.t)
            v_c = self.v[i] / (1 - self.beta2 ** self.t)
            p -= self.taxa * (m_c / (np.sqrt(v_c) + self.eps) + self.decaimento * p)


def comparar_otimizadores(grad, x0, otimizadores, passos):
    distancias = []
    for otimizador in otimizadores:
        x = x0.copy()
        for _ in range(passos):
            otimizador.passo([x], [grad(x)])
        distancias.append(float(np.linalg.norm(x)))
    return distancias
```
```python path=otimizadores.py
import numpy as np


class SGD:
    def __init__(self, taxa):
        self.taxa = taxa

    def passo(self, params, grads):
        for p, g in zip(params, grads):
            p -= self.taxa * g


class Momentum:
    def __init__(self, taxa, beta=0.9):
        self.taxa = taxa
        self.beta = beta
        self.v = None

    def passo(self, params, grads):
        if self.v is None:
            self.v = [np.zeros_like(p) for p in params]
        for i, (p, g) in enumerate(zip(params, grads)):
            self.v[i] = self.beta * self.v[i] + (1 - self.beta) * g
            p -= self.taxa * self.v[i]


class Adam:
    def __init__(self, taxa=0.001, beta1=0.9, beta2=0.999, eps=1e-8):
        self.taxa = taxa
        self.beta1 = beta1
        self.beta2 = beta2
        self.eps = eps
        self.t = 0
        self.m = None
        self.v = None

    def passo(self, params, grads):
        if self.m is None:
            self.m = [np.zeros_like(p) for p in params]
            self.v = [np.zeros_like(p) for p in params]
        self.t += 1
        for i, (p, g) in enumerate(zip(params, grads)):
            self.m[i] = self.beta1 * self.m[i] + (1 - self.beta1) * g
            self.v[i] = self.beta2 * self.v[i] + (1 - self.beta2) * g * g
            m_c = self.m[i] / (1 - self.beta1 ** self.t)
            v_c = self.v[i] / (1 - self.beta2 ** self.t)
            p -= self.taxa * m_c / (np.sqrt(v_c) + self.eps)
```

### Dicas
1. O `AdamW` é o `Adam` com um termo a mais na última linha do laço; as médias não mudam.
2. `np.linalg.norm(x)` é a distância de `x` à origem.
3. O gradiente precisa ser recalculado a cada passo, no ponto atual, e cada otimizador trabalha na sua cópia de `x0`.

### Verificação
```json
[
  {"id": "adamw-sem-decaimento", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom otimizadores import Adam\np = np.array([1.0, -2.0])\nq = p.copy()\na = AdamW(0.1, 0.0)\nb = Adam(0.1)\nfor g in [np.array([1.0, 3.0]), np.array([-2.0, 0.5]), np.array([0.5, 0.5])]:\n    a.passo([p], [g])\n    b.passo([q], [g])", "expr": "[bool(np.allclose(p, q, atol=1e-12)), p.tolist()]", "expected": [true, [0.9502794196738216, -2.2484534586208818]], "tolerance": 1e-12, "name": "Com decaimento 0, o AdamW dá os mesmos três passos do Adam"},
  {"id": "adamw-gradiente-zero", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\np = np.array([1.0, -2.0])\no = AdamW(0.1, 0.5)\no.passo([p], [np.zeros(2)])\no.passo([p], [np.zeros(2)])", "expr": "p.tolist()", "expected": [0.9025, -1.805], "tolerance": 1e-12, "name": "Gradiente zero, taxa 0.1 e decaimento 0.5: cada passo multiplica o parâmetro por 0.95", "hint": "O decaimento tira taxa * decaimento * p, sem passar por m nem por v."},
  {"id": "adamw-um-passo", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\np = np.array([1.0, -2.0, 4.0])\nAdamW(0.1, 0.5).passo([p], [np.array([3.0, 0.01, -100.0])])", "expr": "p.tolist()", "expected": [0.8500000003333333, -1.9999999000001, 3.89999999999], "tolerance": 1e-12, "name": "Um passo: 0.1 contra o sinal do gradiente e mais 5 % do valor do parâmetro", "hint": "p -= taxa * (m_c / (raiz(v_c) + eps) + decaimento * p), com o p de antes do passo."},
  {"id": "adamw-tres-passos", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nW = np.array([[1.0, 2.0], [3.0, 4.0]])\nb = np.array([0.5, -0.5])\no = AdamW(0.1, 0.2)\no.passo([W, b], [np.array([[1.0, -1.0], [2.0, 0.5]]), np.array([4.0, -0.1])])\no.passo([W, b], [np.array([[2.0, 1.0], [-2.0, 0.5]]), np.array([0.0, 0.3])])\no.passo([W, b], [np.array([[0.5, 0.5], [0.5, 0.5]]), np.array([-1.0, 0.3])])", "expr": "[W.tolist(), b.tolist(), o.t]", "expected": [[[0.6638074367271213, 1.9481226741146882], [2.725571712173176, 3.4707280058808005]], [0.27415214549254585, -0.4946722130256085], 3], "tolerance": 1e-12, "name": "Três passos em dois arrays: valores literais e t = 3"},
  {"id": "adamw-padroes", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\np = np.array([10.0])\nAdamW().passo([p], [np.array([2.0])])", "expr": "p.tolist()", "expected": [9.998900000005], "tolerance": 1e-12, "name": "AdamW() usa taxa 0.001 e decaimento 0.01", "hint": "Um passo em 10.0 tira 0.001 do Adam e 0.001 * 0.01 * 10 do decaimento."},
  {"id": "adamw-duas-instancias", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\na = np.array([1.0])\nc = np.array([1.0])\no1 = AdamW(0.1, 0.1)\no2 = AdamW(0.1, 0.1)\no1.passo([a], [np.array([1.0])])\no1.passo([a], [np.array([-3.0])])\no2.passo([c], [np.array([-3.0])])", "expr": "[a.tolist(), c.tolist(), o1.t, o2.t]", "expected": [[0.9305189840987441], [1.0899999996666667], 2, 1], "tolerance": 1e-12, "name": "Dois AdamW independentes"},
  {"id": "comparar-sgd", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom otimizadores import SGD, Momentum, Adam\ndef _grad(x):\n    return np.array([x[0], 20.0 * x[1]])\nx0 = np.array([10.0, 1.0])\nd = comparar_otimizadores(_grad, x0, [SGD(0.05), SGD(0.09)], 3)", "expr": "[type(d).__name__, [type(v).__name__ for v in d], d]", "expected": ["list", ["float", "float"], [8.57375, 7.553083423615814]], "tolerance": 1e-12, "name": "Vale alongado, 3 passos de SGD(0.05) e SGD(0.09): uma lista com duas distâncias float", "hint": "A distância é a norma do ponto final, porque o mínimo está na origem."},
  {"id": "comparar-quatro", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom otimizadores import SGD, Momentum, Adam\ndef _grad(x):\n    return np.array([x[0], 20.0 * x[1]])\nx0 = np.array([10.0, 1.0])\nd = comparar_otimizadores(_grad, x0, [SGD(0.09), Momentum(0.3, 0.7), Adam(0.5), AdamW(0.5, 0.0)], 50)", "expr": "d", "expected": [0.08955083126141786, 0.0010386615737436418, 0.38275816092843323, 0.38275816092843323], "tolerance": 1e-10, "name": "50 passos de SGD, Momentum, Adam e AdamW a partir de (10, 1)", "hint": "Cada otimizador parte de uma cópia de x0 e recebe o gradiente do ponto em que está."},
  {"id": "comparar-x0-intacto", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\nfrom otimizadores import SGD, Momentum, Adam\ndef _grad(x):\n    return np.array([x[0], 20.0 * x[1]])\nx0 = np.array([10.0, 1.0])\ncomparar_otimizadores(_grad, x0, [SGD(0.05), Adam(0.5)], 10)", "expr": "x0.tolist()", "expected": [10.0, 1.0], "name": "x0 não muda", "hint": "Os passos alteram o array no lugar: trabalhe numa cópia."},
  {"id": "comparar-mesmo-inicio", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\nfrom otimizadores import SGD, Momentum, Adam\ndef _grad(x):\n    return np.array([x[0], 20.0 * x[1]])\nx0 = np.array([10.0, 1.0])\nd = comparar_otimizadores(_grad, x0, [SGD(0.05), SGD(0.05)], 5)", "expr": "d[0] == d[1]", "expected": true, "name": "Dois otimizadores iguais chegam à mesma distância: os dois partem de x0"},
  {"id": "comparar-espia", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom otimizadores import SGD, Momentum, Adam\ndef _grad(x):\n    return np.array([x[0], 20.0 * x[1]])\nx0 = np.array([10.0, 1.0])\nclass _Espia:\n    def __init__(self):\n        self.vistos = []\n    def passo(self, params, grads):\n        self.vistos.append((len(params), len(grads), params[0].copy(), np.array(grads[0], dtype=float)))\n        params[0] -= 0.02 * grads[0]\ne = _Espia()\nd = comparar_otimizadores(_grad, x0, [e], 4)", "expr": "[len(e.vistos), all(a == 1 and c == 1 for a, c, _, _ in e.vistos), all(bool(np.allclose(g, _grad(x))) for _, _, x, g in e.vistos), e.vistos[0][2].tolist(), e.vistos[-1][2].tolist() != e.vistos[0][2].tolist()]", "expected": [4, true, true, [10.0, 1.0], true], "name": "4 passos chamam passo([x], [grad(x)]) 4 vezes, com o gradiente do ponto atual", "hint": "O gradiente é recalculado a cada passo, no ponto em que o otimizador está."},
  {"id": "comparar-zero-passos", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom otimizadores import SGD, Momentum, Adam\ndef _grad(x):\n    return np.array([x[0], 20.0 * x[1]])\nx0 = np.array([10.0, 1.0])\nd = comparar_otimizadores(_grad, np.array([3.0, 4.0]), [SGD(0.05), Adam(0.5)], 0)", "expr": "d", "expected": [5.0, 5.0], "tolerance": 1e-12, "name": "Com 0 passos, a distância é a de x0: 5.0 para (3, 4)"}
]
```

### Soluções erradas
```python name="decaimento somado ao gradiente (L2)"
import numpy as np
from otimizadores import SGD, Momentum, Adam


class AdamW:
    def __init__(self, taxa=0.001, decaimento=0.01, beta1=0.9, beta2=0.999, eps=1e-8):
        self.taxa = taxa
        self.decaimento = decaimento
        self.beta1 = beta1
        self.beta2 = beta2
        self.eps = eps
        self.t = 0
        self.m = None
        self.v = None

    def passo(self, params, grads):
        if self.m is None:
            self.m = [np.zeros_like(p) for p in params]
            self.v = [np.zeros_like(p) for p in params]
        self.t += 1
        for i, (p, g) in enumerate(zip(params, grads)):
            g = g + self.decaimento * p
            self.m[i] = self.beta1 * self.m[i] + (1 - self.beta1) * g
            self.v[i] = self.beta2 * self.v[i] + (1 - self.beta2) * g * g
            m_c = self.m[i] / (1 - self.beta1 ** self.t)
            v_c = self.v[i] / (1 - self.beta2 ** self.t)
            p -= self.taxa * m_c / (np.sqrt(v_c) + self.eps)


def comparar_otimizadores(grad, x0, otimizadores, passos):
    distancias = []
    for otimizador in otimizadores:
        x = x0.copy()
        for _ in range(passos):
            otimizador.passo([x], [grad(x)])
        distancias.append(float(np.linalg.norm(x)))
    return distancias
```
```python name="decaimento sem a taxa"
import numpy as np
from otimizadores import SGD, Momentum, Adam


class AdamW:
    def __init__(self, taxa=0.001, decaimento=0.01, beta1=0.9, beta2=0.999, eps=1e-8):
        self.taxa = taxa
        self.decaimento = decaimento
        self.beta1 = beta1
        self.beta2 = beta2
        self.eps = eps
        self.t = 0
        self.m = None
        self.v = None

    def passo(self, params, grads):
        if self.m is None:
            self.m = [np.zeros_like(p) for p in params]
            self.v = [np.zeros_like(p) for p in params]
        self.t += 1
        for i, (p, g) in enumerate(zip(params, grads)):
            self.m[i] = self.beta1 * self.m[i] + (1 - self.beta1) * g
            self.v[i] = self.beta2 * self.v[i] + (1 - self.beta2) * g * g
            m_c = self.m[i] / (1 - self.beta1 ** self.t)
            v_c = self.v[i] / (1 - self.beta2 ** self.t)
            p -= self.taxa * m_c / (np.sqrt(v_c) + self.eps) + self.decaimento * p


def comparar_otimizadores(grad, x0, otimizadores, passos):
    distancias = []
    for otimizador in otimizadores:
        x = x0.copy()
        for _ in range(passos):
            otimizador.passo([x], [grad(x)])
        distancias.append(float(np.linalg.norm(x)))
    return distancias
```
```python name="decaimento com o sinal trocado"
import numpy as np
from otimizadores import SGD, Momentum, Adam


class AdamW:
    def __init__(self, taxa=0.001, decaimento=0.01, beta1=0.9, beta2=0.999, eps=1e-8):
        self.taxa = taxa
        self.decaimento = decaimento
        self.beta1 = beta1
        self.beta2 = beta2
        self.eps = eps
        self.t = 0
        self.m = None
        self.v = None

    def passo(self, params, grads):
        if self.m is None:
            self.m = [np.zeros_like(p) for p in params]
            self.v = [np.zeros_like(p) for p in params]
        self.t += 1
        for i, (p, g) in enumerate(zip(params, grads)):
            self.m[i] = self.beta1 * self.m[i] + (1 - self.beta1) * g
            self.v[i] = self.beta2 * self.v[i] + (1 - self.beta2) * g * g
            m_c = self.m[i] / (1 - self.beta1 ** self.t)
            v_c = self.v[i] / (1 - self.beta2 ** self.t)
            p -= self.taxa * (m_c / (np.sqrt(v_c) + self.eps) - self.decaimento * p)


def comparar_otimizadores(grad, x0, otimizadores, passos):
    distancias = []
    for otimizador in otimizadores:
        x = x0.copy()
        for _ in range(passos):
            otimizador.passo([x], [grad(x)])
        distancias.append(float(np.linalg.norm(x)))
    return distancias
```
```python name="decaimento ignorado"
import numpy as np
from otimizadores import SGD, Momentum, Adam


class AdamW:
    def __init__(self, taxa=0.001, decaimento=0.01, beta1=0.9, beta2=0.999, eps=1e-8):
        self.taxa = taxa
        self.decaimento = decaimento
        self.beta1 = beta1
        self.beta2 = beta2
        self.eps = eps
        self.t = 0
        self.m = None
        self.v = None

    def passo(self, params, grads):
        if self.m is None:
            self.m = [np.zeros_like(p) for p in params]
            self.v = [np.zeros_like(p) for p in params]
        self.t += 1
        for i, (p, g) in enumerate(zip(params, grads)):
            self.m[i] = self.beta1 * self.m[i] + (1 - self.beta1) * g
            self.v[i] = self.beta2 * self.v[i] + (1 - self.beta2) * g * g
            m_c = self.m[i] / (1 - self.beta1 ** self.t)
            v_c = self.v[i] / (1 - self.beta2 ** self.t)
            p -= self.taxa * m_c / (np.sqrt(v_c) + self.eps)


def comparar_otimizadores(grad, x0, otimizadores, passos):
    distancias = []
    for otimizador in otimizadores:
        x = x0.copy()
        for _ in range(passos):
            otimizador.passo([x], [grad(x)])
        distancias.append(float(np.linalg.norm(x)))
    return distancias
```
```python name="comparar altera x0"
import numpy as np
from otimizadores import SGD, Momentum, Adam


class AdamW:
    def __init__(self, taxa=0.001, decaimento=0.01, beta1=0.9, beta2=0.999, eps=1e-8):
        self.taxa = taxa
        self.decaimento = decaimento
        self.beta1 = beta1
        self.beta2 = beta2
        self.eps = eps
        self.t = 0
        self.m = None
        self.v = None

    def passo(self, params, grads):
        if self.m is None:
            self.m = [np.zeros_like(p) for p in params]
            self.v = [np.zeros_like(p) for p in params]
        self.t += 1
        for i, (p, g) in enumerate(zip(params, grads)):
            self.m[i] = self.beta1 * self.m[i] + (1 - self.beta1) * g
            self.v[i] = self.beta2 * self.v[i] + (1 - self.beta2) * g * g
            m_c = self.m[i] / (1 - self.beta1 ** self.t)
            v_c = self.v[i] / (1 - self.beta2 ** self.t)
            p -= self.taxa * (m_c / (np.sqrt(v_c) + self.eps) + self.decaimento * p)


def comparar_otimizadores(grad, x0, otimizadores, passos):
    distancias = []
    for otimizador in otimizadores:
        x = x0
        for _ in range(passos):
            otimizador.passo([x], [grad(x)])
        distancias.append(float(np.linalg.norm(x)))
    return distancias
```
```python name="um só ponto para todos os otimizadores"
import numpy as np
from otimizadores import SGD, Momentum, Adam


class AdamW:
    def __init__(self, taxa=0.001, decaimento=0.01, beta1=0.9, beta2=0.999, eps=1e-8):
        self.taxa = taxa
        self.decaimento = decaimento
        self.beta1 = beta1
        self.beta2 = beta2
        self.eps = eps
        self.t = 0
        self.m = None
        self.v = None

    def passo(self, params, grads):
        if self.m is None:
            self.m = [np.zeros_like(p) for p in params]
            self.v = [np.zeros_like(p) for p in params]
        self.t += 1
        for i, (p, g) in enumerate(zip(params, grads)):
            self.m[i] = self.beta1 * self.m[i] + (1 - self.beta1) * g
            self.v[i] = self.beta2 * self.v[i] + (1 - self.beta2) * g * g
            m_c = self.m[i] / (1 - self.beta1 ** self.t)
            v_c = self.v[i] / (1 - self.beta2 ** self.t)
            p -= self.taxa * (m_c / (np.sqrt(v_c) + self.eps) + self.decaimento * p)


def comparar_otimizadores(grad, x0, otimizadores, passos):
    distancias = []
    x = x0.copy()
    for otimizador in otimizadores:
        for _ in range(passos):
            otimizador.passo([x], [grad(x)])
        distancias.append(float(np.linalg.norm(x)))
    return distancias
```
```python name="gradiente calculado uma vez, no ponto inicial"
import numpy as np
from otimizadores import SGD, Momentum, Adam


class AdamW:
    def __init__(self, taxa=0.001, decaimento=0.01, beta1=0.9, beta2=0.999, eps=1e-8):
        self.taxa = taxa
        self.decaimento = decaimento
        self.beta1 = beta1
        self.beta2 = beta2
        self.eps = eps
        self.t = 0
        self.m = None
        self.v = None

    def passo(self, params, grads):
        if self.m is None:
            self.m = [np.zeros_like(p) for p in params]
            self.v = [np.zeros_like(p) for p in params]
        self.t += 1
        for i, (p, g) in enumerate(zip(params, grads)):
            self.m[i] = self.beta1 * self.m[i] + (1 - self.beta1) * g
            self.v[i] = self.beta2 * self.v[i] + (1 - self.beta2) * g * g
            m_c = self.m[i] / (1 - self.beta1 ** self.t)
            v_c = self.v[i] / (1 - self.beta2 ** self.t)
            p -= self.taxa * (m_c / (np.sqrt(v_c) + self.eps) + self.decaimento * p)


def comparar_otimizadores(grad, x0, otimizadores, passos):
    distancias = []
    for otimizador in otimizadores:
        x = x0.copy()
        g = grad(x)
        for _ in range(passos):
            otimizador.passo([x], [g])
        distancias.append(float(np.linalg.norm(x)))
    return distancias
```
```python name="distância sem a raiz"
import numpy as np
from otimizadores import SGD, Momentum, Adam


class AdamW:
    def __init__(self, taxa=0.001, decaimento=0.01, beta1=0.9, beta2=0.999, eps=1e-8):
        self.taxa = taxa
        self.decaimento = decaimento
        self.beta1 = beta1
        self.beta2 = beta2
        self.eps = eps
        self.t = 0
        self.m = None
        self.v = None

    def passo(self, params, grads):
        if self.m is None:
            self.m = [np.zeros_like(p) for p in params]
            self.v = [np.zeros_like(p) for p in params]
        self.t += 1
        for i, (p, g) in enumerate(zip(params, grads)):
            self.m[i] = self.beta1 * self.m[i] + (1 - self.beta1) * g
            self.v[i] = self.beta2 * self.v[i] + (1 - self.beta2) * g * g
            m_c = self.m[i] / (1 - self.beta1 ** self.t)
            v_c = self.v[i] / (1 - self.beta2 ** self.t)
            p -= self.taxa * (m_c / (np.sqrt(v_c) + self.eps) + self.decaimento * p)


def comparar_otimizadores(grad, x0, otimizadores, passos):
    distancias = []
    for otimizador in otimizadores:
        x = x0.copy()
        for _ in range(passos):
            otimizador.passo([x], [grad(x)])
        distancias.append(float(np.sum(x ** 2)))
    return distancias
```

## Passo 8 · Quiz · β e ε

### Pergunta
Um Adam foi escrito sem a correção de viés, com $\beta_1 = 0{,}9$, $\beta_2 = 0{,}999$ e taxa 0,001. No primeiro passo, um parâmetro recebe gradiente 2,0. Quanto ele anda?
- [ ] 0,001, porque o Adam sempre anda a taxa no primeiro passo
- [ ] 0,0002, porque $m = 0{,}1 \cdot 2$
- [x] Cerca de 0,0032, porque $m = 0{,}2$ e $\sqrt{v} = \sqrt{0{,}004} \approx 0{,}063$
- [ ] 0,002, porque o passo é a taxa vezes o gradiente
> Sem correção, $m = 0{,}1 \cdot 2 = 0{,}2$ e $v = 0{,}001 \cdot 4 = 0{,}004$, e a razão é $0{,}2 / 0{,}063 \approx 3{,}16$: o passo sai 3,16 vezes a taxa. O passo de exatamente 0,001 é o do Adam **com** correção. 0,0002 esquece a divisão por $\sqrt{v}$, e 0,002 é o passo do SGD.

### Pergunta
Num treino com Adam sem `eps`, a primeira coluna de `X` é sempre zero, então a primeira linha de `dW` é zero em todos os passos. A perda aparece como `nan` logo no segundo passo, sem nenhum erro. O que aconteceu?
- [ ] A taxa estava alta e os pesos estouraram para `inf`
- [x] Naquela linha, $\hat m = 0$ e $\sqrt{\hat v} = 0$: a divisão $0 / 0$ deu `nan` em silêncio, e o `nan` entrou nos pesos
- [ ] A correção de viés dividiu por zero, porque $t$ começou em 1
- [ ] O numpy levantou `ZeroDivisionError` e o laço ignorou
> Com gradiente sempre zero, as duas médias são zero, e sem o $\varepsilon$ o passo é $0 / 0$, que no numpy é `nan` sem aviso nem exceção. Uma taxa alta levaria alguns passos para estourar e passaria por valores enormes antes. Com $t = 1$ a correção divide por $1 - 0{,}9 = 0{,}1$; o zero só aparece com $t = 0$.

### Pergunta
Dois treinos com `Momentum` e a mesma taxa: um com $\beta = 0{,}5$, outro com $\beta = 0{,}99$. O gradiente de um parâmetro, que vinha positivo, passa a ser negativo. Em qual dos dois o parâmetro demora mais para mudar de direção, e por quê?
- [ ] Com $\beta = 0{,}5$, porque metade do gradiente novo é descartada
- [ ] Nos dois igual: o $\beta$ só muda o tamanho do passo
- [ ] Com $\beta = 0{,}99$, porque a taxa efetiva fica 100 vezes maior
- [x] Com $\beta = 0{,}99$, porque a velocidade é uma média de cerca de 100 gradientes e o novo entra com peso 0,01
> A velocidade guarda $\beta$ da anterior e ganha $(1 - \beta)$ do gradiente novo. Com 0,99, são necessárias dezenas de gradientes negativos para a média trocar de sinal; com 0,5, a velocidade vira em um ou dois passos. Na forma de média móvel, o $\beta$ não multiplica a taxa: muda a memória.
