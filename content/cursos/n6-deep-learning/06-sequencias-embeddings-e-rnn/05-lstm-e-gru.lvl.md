---
slug: n6-m6-05-lstm-e-gru
titulo: LSTM e GRU
descricao: Portas de esquecimento, entrada e saída, o estado de célula como 'rodovia' do gradiente, GRU como simplificação, e por que mesmo assim os transformers venceram.
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
- Implementar o forward da célula LSTM e explicar o papel de cada porta
- Explicar como o estado de célula aditivo mitiga o gradiente que some
- Comparar LSTM, GRU e RNN simples em custo e capacidade, e listar as limitações que motivaram a atenção
---

## Passo 1 · Leitura · Portas

A RNN simples reescreve o estado inteiro a cada passo: tudo o que ela sabe passa por uma tanh e por $W_{hh}$, e é por isso que o gradiente some. A **LSTM** (memória longa de curto prazo, de Hochreiter e Schmidhuber, 1997) separa duas coisas. Há uma memória, o **estado de célula** $c$, que só é alterada por operações simples, e há **portas** que decidem, a cada passo, o que apagar, o que escrever e o que mostrar.

Uma porta é um vetor de números entre 0 e 1, saído de uma sigmoide, que multiplica outro vetor elemento a elemento: 0 fecha, 1 deixa passar. A cada passo, a célula junta a entrada $x_t$ e o estado anterior $h_{t-1}$ e calcula quatro blocos de pré-ativações, todos com a mesma receita linear:

$$[z_i,\ z_f,\ z_g,\ z_o] = [x_t,\ h_{t-1}]\, W + b$$

$$i = \sigma(z_i), \qquad f = \sigma(z_f), \qquad g = \tanh(z_g), \qquad o = \sigma(z_o)$$

- $f$, a **porta de esquecimento**: quanto de cada número da célula antiga continua.
- $i$, a **porta de entrada**: quanto do candidato é escrito.
- $g$, o **candidato**: o conteúdo novo, entre $-1$ e $1$. É o único bloco com tanh.
- $o$, a **porta de saída**: quanto da célula aparece no estado $h$.

$$c_t = f \odot c_{t-1} + i \odot g, \qquad h_t = o \odot \tanh(c_t)$$

Nesta lição, $W$ tem forma $(D + H, 4H)$ e $b$, $(4H,)$: os quatro blocos ficam lado a lado nas colunas, na ordem $i$, $f$, $g$, $o$, e cada um é uma fatia de largura $H$.

```python
import numpy as np

H = 2
z = np.arange(8.0).reshape(1, 8)     # [x, h] @ W + b, com H = 2
print(z[:, :H].tolist(), z[:, H:2 * H].tolist())            # [[0.0, 1.0]] [[2.0, 3.0]]
print(z[:, 2 * H:3 * H].tolist(), z[:, 3 * H:].tolist())    # [[4.0, 5.0]] [[6.0, 7.0]]
```

Com $f = 1$ e $i = 0$, a célula atravessa o passo intacta: $c_t = c_{t-1}$. A rede pode aprender a guardar um número por muitos passos, o que a RNN simples não consegue. Com $o = 0$, o que está guardado fica invisível para o resto da rede até a porta abrir.

A LSTM carrega dois estados de um passo para o outro, $h$ e $c$, e tem quatro vezes os pesos de uma RNN simples com a mesma entrada e o mesmo $H$.

## Passo 2 · Previsão · Uma célula LSTM escalar

Uma célula de uma unidade, com as pré-ativações das portas escritas à mão em cada passo: $10$ abre a porta (a sigmoide dá praticamente 1) e $-10$ fecha (praticamente 0). A célula começa guardando $2{,}0$. Cada linha imprime as portas $i$ e $f$ arredondadas, a célula e o estado. Use $\tanh(2) \approx 0{,}96$, $\tanh(1) \approx 0{,}76$ e $\tanh(10) \approx 1$. Escreva a saída antes de rodar.

### Código

```python
import math


def sigmoide(z):
    return 1.0 / (1.0 + math.exp(-z))


c = 2.0
passos = [
    (-10.0, 10.0, 10.0, 10.0),
    (-10.0, 10.0, 10.0, -10.0),
    (10.0, -10.0, 10.0, 10.0),
    (-10.0, -10.0, 10.0, 10.0),
]
for zi, zf, zg, zo in passos:
    i, f, g, o = sigmoide(zi), sigmoide(zf), math.tanh(zg), sigmoide(zo)
    c = f * c + i * g
    h = o * math.tanh(c)
    print(round(i), round(f), round(c, 2), round(h, 2))
```

### Dicas

1. Nos dois primeiros passos a porta de entrada está fechada e a de esquecimento, aberta: a célula não muda.
2. No segundo passo a porta de saída está fechada: a célula continua guardando o valor, mas o estado não mostra.
3. No terceiro, a célula antiga é apagada e o candidato, que vale praticamente 1, é escrito. No quarto, as duas portas estão fechadas.

### Saída esperada

```text
0 1 2.0 0.96
0 1 2.0 0.0
1 0 1.0 0.76
0 0 0.0 0.0
```

## Passo 3 · Exercício · lstm_passo(x, h, c, params)

modo: lacunas

Complete um passo da célula LSTM. `x` tem forma `(n, D)`; `h` e `c`, `(n, H)`; `params["W"]`, `(D + H, 4 * H)`; e `params["b"]`, `(4 * H,)`. Os blocos estão na ordem `i`, `f`, `g`, `o`.

### Instruções

1. Complete a fatia da porta de esquecimento `f`: o segundo bloco de largura `H`.
2. Complete a função do candidato `g`: é o único bloco que não é uma porta.
3. Complete a célula nova: a célula antiga passa pela porta de esquecimento, e o candidato, pela porta de entrada.
4. Complete o estado novo: a tanh da célula **nova**, passando pela porta de saída.

### Código inicial

```python
import numpy as np


def sigmoide(z):
    return 1.0 / (1.0 + np.exp(-z))


def lstm_passo(x, h, c, params):
    H = h.shape[1]
    z = np.concatenate([x, h], axis=1) @ params["W"] + params["b"]
    i = sigmoide(z[:, :H])
    f = sigmoide(z[:, ___])
    g = ___(z[:, 2 * H:3 * H])
    o = sigmoide(z[:, 3 * H:])
    c_novo = ___
    h_novo = ___
    return h_novo, c_novo
```

### Solução

```python
import numpy as np


def sigmoide(z):
    return 1.0 / (1.0 + np.exp(-z))


def lstm_passo(x, h, c, params):
    H = h.shape[1]
    z = np.concatenate([x, h], axis=1) @ params["W"] + params["b"]
    i = sigmoide(z[:, :H])
    f = sigmoide(z[:, H:2 * H])
    g = np.tanh(z[:, 2 * H:3 * H])
    o = sigmoide(z[:, 3 * H:])
    c_novo = f * c + i * g
    h_novo = o * np.tanh(c_novo)
    return h_novo, c_novo
```

### Dicas

1. Os blocos são fatias consecutivas de largura `H`: o primeiro é `:H` e o terceiro, `2 * H:3 * H`.
2. As portas multiplicam elemento a elemento, com `*`.
3. A ordem importa: primeiro `c_novo`, depois `h_novo`, que usa `c_novo`.

### Verificação

```json
[
  {"id": "guardar", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\ndef _com_vies(i, f, g, o):\n    return {\"W\": np.zeros((5, 8)), \"b\": np.array([i, i, f, f, g, g, o, o], dtype=float)}\n_x = np.array([[1.0, -2.0, 0.5]])\n_h = np.array([[0.3, -0.7]])\n_c = np.array([[0.8, -1.5]])\n_hn, _cn = lstm_passo(_x, _h, _c, _com_vies(-50, 50, 3, 50))", "expr": "[_hn.tolist(), _cn.tolist()]", "expected": [[[0.6640367702678489, -0.9051482536448664]], [[0.8, -1.5]]], "tolerance": 1e-10, "name": "Entrada fechada e esquecimento aberto: a célula passa intacta e h é a tanh dela", "hint": "Com f = 1 e i = 0, c_novo = c."},
  {"id": "apagar-e-escrever", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\ndef _com_vies(i, f, g, o):\n    return {\"W\": np.zeros((5, 8)), \"b\": np.array([i, i, f, f, g, g, o, o], dtype=float)}\n_x = np.array([[1.0, -2.0, 0.5]])\n_h = np.array([[0.3, -0.7]])\n_c = np.array([[0.8, -1.5]])\n_hn, _cn = lstm_passo(_x, _h, _c, _com_vies(50, -50, 50, 50))", "expr": "[_hn.tolist(), _cn.tolist()]", "expected": [[[0.7615941559557649, 0.7615941559557649]], [[1.0, 1.0]]], "tolerance": 1e-10, "name": "Entrada aberta e esquecimento fechado: a célula vira o candidato", "hint": "A porta f multiplica a célula antiga; a porta i multiplica o candidato."},
  {"id": "candidato-negativo", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\ndef _com_vies(i, f, g, o):\n    return {\"W\": np.zeros((5, 8)), \"b\": np.array([i, i, f, f, g, g, o, o], dtype=float)}\n_x = np.array([[1.0, -2.0, 0.5]])\n_h = np.array([[0.3, -0.7]])\n_c = np.array([[0.8, -1.5]])\n_hn, _cn = lstm_passo(_x, _h, _c, _com_vies(50, -50, -50, 50))", "expr": "[_hn.tolist(), _cn.tolist()]", "expected": [[[-0.7615941559557649, -0.7615941559557649]], [[-1.0, -1.0]]], "tolerance": 1e-10, "name": "O candidato pode ser negativo: a célula vai para -1", "hint": "O candidato usa tanh, que vai de -1 a 1; uma sigmoide nunca escreveria um valor negativo."},
  {"id": "saida-fechada", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\ndef _com_vies(i, f, g, o):\n    return {\"W\": np.zeros((5, 8)), \"b\": np.array([i, i, f, f, g, g, o, o], dtype=float)}\n_x = np.array([[1.0, -2.0, 0.5]])\n_h = np.array([[0.3, -0.7]])\n_c = np.array([[0.8, -1.5]])\n_hn, _cn = lstm_passo(_x, _h, _c, _com_vies(-50, 50, 3, -50))", "expr": "[_hn.tolist(), _cn.tolist()]", "expected": [[[1.2807608196965649e-22, -1.745804556602342e-22]], [[0.8, -1.5]]], "tolerance": 1e-10, "name": "Saída fechada: h vai a zero e a célula continua guardada"},
  {"id": "portas-pela-metade", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\ndef _com_vies(i, f, g, o):\n    return {\"W\": np.zeros((5, 8)), \"b\": np.array([i, i, f, f, g, g, o, o], dtype=float)}\n_x = np.array([[1.0, -2.0, 0.5]])\n_h = np.array([[0.3, -0.7]])\n_c = np.array([[0.8, -1.5]])\n_hn, _cn = lstm_passo(_x, _h, _c, _com_vies(0, 0, 0, 0))", "expr": "[_hn.tolist(), _cn.tolist()]", "expected": [[[0.18997448112761245, -0.31757447619364365]], [[0.4, -0.75]]], "tolerance": 1e-12, "name": "Pré-ativações zero: portas em 0,5 e candidato 0", "hint": "c_novo = 0,5 · c e h_novo = 0,5 · tanh(c_novo)."},
  {"id": "blocos-diferentes", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\ndef _com_vies(i, f, g, o):\n    return {\"W\": np.zeros((5, 8)), \"b\": np.array([i, i, f, f, g, g, o, o], dtype=float)}\n_x = np.array([[1.0, -2.0, 0.5]])\n_h = np.array([[0.3, -0.7]])\n_c = np.array([[0.8, -1.5]])\n_hn, _cn = lstm_passo(_x, _h, _c, _com_vies(1.0, -2.0, 0.5, 3.0))", "expr": "[_hn.tolist(), _cn.tolist()]", "expected": [[[0.3886403971189765, 0.15022388730494435]], [[0.43319704976473516, 0.15903032911386483]]], "tolerance": 1e-12, "name": "Quatro pré-ativações diferentes: cada bloco na sua fatia", "hint": "A ordem é i, f, g, o: f fica nas colunas de H a 2H."},
  {"id": "valores", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(0)\n_n, _D, _H = 2, 3, 2\n_params = {\"W\": _rng.normal(0, 1, (_D + _H, 4 * _H)), \"b\": _rng.normal(0, 1, 4 * _H)}\n_x = _rng.normal(0, 1, (_n, _D))\n_h = _rng.normal(0, 1, (_n, _H))\n_c = _rng.normal(0, 1, (_n, _H))\n_hn, _cn = lstm_passo(_x, _h, _c, _params)", "expr": "[_hn.tolist(), _cn.tolist()]", "expected": [[[-0.795842528029482, -0.48167239173327026], [-0.09807485528990999, -0.567839378119137]], [[-1.1534527776597727, -0.5409619377926693], [-0.25531915988404075, -0.766223814176216]]], "tolerance": 1e-12, "name": "Pesos sorteados, n = 2, D = 3, H = 2: h e c novos"},
  {"id": "referencia", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(3)\n_n, _D, _H = 3, 2, 5\n_params = {\"W\": _rng.normal(0, 1, (_D + _H, 4 * _H)), \"b\": _rng.normal(0, 1, 4 * _H)}\n_x = _rng.normal(0, 1, (_n, _D))\n_h = _rng.normal(0, 1, (_n, _H))\n_c = _rng.normal(0, 2, (_n, _H))\ndef _s(v):\n    return 1.0 / (1.0 + np.exp(-v))\ndef _ref(x, h, c, p):\n    n, H = h.shape\n    hn, cn = np.zeros((n, H)), np.zeros((n, H))\n    for a in range(n):\n        v = np.concatenate([x[a], h[a]])\n        for j in range(H):\n            zi = v @ p[\"W\"][:, j] + p[\"b\"][j]\n            zf = v @ p[\"W\"][:, H + j] + p[\"b\"][H + j]\n            zg = v @ p[\"W\"][:, 2 * H + j] + p[\"b\"][2 * H + j]\n            zo = v @ p[\"W\"][:, 3 * H + j] + p[\"b\"][3 * H + j]\n            cn[a, j] = _s(zf) * c[a, j] + _s(zi) * np.tanh(zg)\n            hn[a, j] = _s(zo) * np.tanh(cn[a, j])\n    return hn, cn\n_hn, _cn = lstm_passo(_x, _h, _c, _params)\n_rh, _rc = _ref(_x, _h, _c, _params)", "expr": "[bool(np.allclose(_hn, _rh, atol=1e-12)), bool(np.allclose(_cn, _rc, atol=1e-12))]", "expected": [true, true], "name": "n = 3, D = 2, H = 5: h e c iguais aos da referência", "hint": "A referência calcula unidade por unidade, com as colunas j, H + j, 2H + j e 3H + j de W. O primeiro booleano é h; o segundo, c."},
  {"id": "h-limitado", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\ndef _com_vies(i, f, g, o):\n    return {\"W\": np.zeros((5, 8)), \"b\": np.array([i, i, f, f, g, g, o, o], dtype=float)}\n_x = np.array([[1.0, -2.0, 0.5]])\n_h = np.array([[0.3, -0.7]])\n_c = np.array([[0.8, -1.5]])\n_hn, _cn = lstm_passo(_x, _h, np.array([[6.0, -9.0]]), _com_vies(-50, 50, 0, 50))", "expr": "[bool(np.all(np.abs(_hn) <= 1.0)), [round(float(v), 6) for v in _cn[0]]]", "expected": [true, [6.0, -9.0]], "name": "A célula pode passar de 1 em módulo; o estado h, não", "hint": "h é a porta de saída vezes a tanh da célula."},
  {"id": "formas-e-entradas", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(3)\n_n, _D, _H = 3, 2, 5\n_params = {\"W\": _rng.normal(0, 1, (_D + _H, 4 * _H)), \"b\": _rng.normal(0, 1, 4 * _H)}\n_x = _rng.normal(0, 1, (_n, _D))\n_h = _rng.normal(0, 1, (_n, _H))\n_c = _rng.normal(0, 2, (_n, _H))\n_copias = [_x.copy(), _h.copy(), _c.copy(), _params['W'].copy(), _params['b'].copy()]\n_hn, _cn = lstm_passo(_x, _h, _c, _params)", "expr": "[list(_hn.shape), list(_cn.shape), all(bool(np.array_equal(a, b)) for a, b in zip([_x, _h, _c, _params['W'], _params['b']], _copias))]", "expected": [[3, 5], [3, 5], true], "name": "h e c novos têm forma (n, H), e as entradas não são alteradas"}
]
```

### Soluções erradas

```python name="porta de esquecimento lê o bloco da porta de entrada"
import numpy as np


def sigmoide(z):
    return 1.0 / (1.0 + np.exp(-z))


def lstm_passo(x, h, c, params):
    H = h.shape[1]
    z = np.concatenate([x, h], axis=1) @ params["W"] + params["b"]
    i = sigmoide(z[:, :H])
    f = sigmoide(z[:, :H])
    g = np.tanh(z[:, 2 * H:3 * H])
    o = sigmoide(z[:, 3 * H:])
    c_novo = f * c + i * g
    h_novo = o * np.tanh(c_novo)
    return h_novo, c_novo
```

```python name="porta de esquecimento lê o bloco do candidato"
import numpy as np


def sigmoide(z):
    return 1.0 / (1.0 + np.exp(-z))


def lstm_passo(x, h, c, params):
    H = h.shape[1]
    z = np.concatenate([x, h], axis=1) @ params["W"] + params["b"]
    i = sigmoide(z[:, :H])
    f = sigmoide(z[:, 2 * H:3 * H])
    g = np.tanh(z[:, 2 * H:3 * H])
    o = sigmoide(z[:, 3 * H:])
    c_novo = f * c + i * g
    h_novo = o * np.tanh(c_novo)
    return h_novo, c_novo
```

```python name="candidato com sigmoide"
import numpy as np


def sigmoide(z):
    return 1.0 / (1.0 + np.exp(-z))


def lstm_passo(x, h, c, params):
    H = h.shape[1]
    z = np.concatenate([x, h], axis=1) @ params["W"] + params["b"]
    i = sigmoide(z[:, :H])
    f = sigmoide(z[:, H:2 * H])
    g = sigmoide(z[:, 2 * H:3 * H])
    o = sigmoide(z[:, 3 * H:])
    c_novo = f * c + i * g
    h_novo = o * np.tanh(c_novo)
    return h_novo, c_novo
```

```python name="portas de esquecimento e de entrada trocadas"
import numpy as np


def sigmoide(z):
    return 1.0 / (1.0 + np.exp(-z))


def lstm_passo(x, h, c, params):
    H = h.shape[1]
    z = np.concatenate([x, h], axis=1) @ params["W"] + params["b"]
    i = sigmoide(z[:, :H])
    f = sigmoide(z[:, H:2 * H])
    g = np.tanh(z[:, 2 * H:3 * H])
    o = sigmoide(z[:, 3 * H:])
    c_novo = i * c + f * g
    h_novo = o * np.tanh(c_novo)
    return h_novo, c_novo
```

```python name="célula sem a porta de esquecimento"
import numpy as np


def sigmoide(z):
    return 1.0 / (1.0 + np.exp(-z))


def lstm_passo(x, h, c, params):
    H = h.shape[1]
    z = np.concatenate([x, h], axis=1) @ params["W"] + params["b"]
    i = sigmoide(z[:, :H])
    f = sigmoide(z[:, H:2 * H])
    g = np.tanh(z[:, 2 * H:3 * H])
    o = sigmoide(z[:, 3 * H:])
    c_novo = c + i * g
    h_novo = o * np.tanh(c_novo)
    return h_novo, c_novo
```

```python name="candidato entra sem a porta de entrada"
import numpy as np


def sigmoide(z):
    return 1.0 / (1.0 + np.exp(-z))


def lstm_passo(x, h, c, params):
    H = h.shape[1]
    z = np.concatenate([x, h], axis=1) @ params["W"] + params["b"]
    i = sigmoide(z[:, :H])
    f = sigmoide(z[:, H:2 * H])
    g = np.tanh(z[:, 2 * H:3 * H])
    o = sigmoide(z[:, 3 * H:])
    c_novo = f * c + g
    h_novo = o * np.tanh(c_novo)
    return h_novo, c_novo
```

```python name="saída sem a tanh da célula"
import numpy as np


def sigmoide(z):
    return 1.0 / (1.0 + np.exp(-z))


def lstm_passo(x, h, c, params):
    H = h.shape[1]
    z = np.concatenate([x, h], axis=1) @ params["W"] + params["b"]
    i = sigmoide(z[:, :H])
    f = sigmoide(z[:, H:2 * H])
    g = np.tanh(z[:, 2 * H:3 * H])
    o = sigmoide(z[:, 3 * H:])
    c_novo = f * c + i * g
    h_novo = o * c_novo
    return h_novo, c_novo
```

```python name="saída calculada com a célula antiga"
import numpy as np


def sigmoide(z):
    return 1.0 / (1.0 + np.exp(-z))


def lstm_passo(x, h, c, params):
    H = h.shape[1]
    z = np.concatenate([x, h], axis=1) @ params["W"] + params["b"]
    i = sigmoide(z[:, :H])
    f = sigmoide(z[:, H:2 * H])
    g = np.tanh(z[:, 2 * H:3 * H])
    o = sigmoide(z[:, 3 * H:])
    c_novo = f * c + i * g
    h_novo = o * np.tanh(c)
    return h_novo, c_novo
```

## Passo 4 · Leitura · O caminho aditivo

Na RNN simples, ir de $h_{t-1}$ a $h_t$ custa ao gradiente uma multiplicação por $W_{hh}^\top$ e outra pela derivada da tanh. Na LSTM há um segundo caminho, pela célula:

$$c_t = f_t \odot c_{t-1} + i_t \odot g_t$$

É uma soma. A derivada de $c_t$ em relação a $c_{t-1}$ por esse caminho é só $f_t$, sem matriz e sem tanh. Ao longo de vários passos, o gradiente que volta pela célula é multiplicado pelas portas de esquecimento do trajeto:

$$\frac{\partial c_T}{\partial c_t} \approx f_{t+1} \odot f_{t+2} \odot \cdots \odot f_T$$

A igualdade é aproximada porque as portas também dependem de $h$. Cada unidade da célula tem a sua porta e o seu produto. Se a rede mantém $f$ perto de 1 numa unidade, o gradiente daquela unidade atravessa dezenas de passos:

```python
print(round(0.9 ** 20, 4), round(0.99 ** 20, 4))    # 0.1216 0.8179
```

Na RNN da lição anterior, com fator $0{,}5$ por passo, 20 passos davam $0{,}00000095$. Aqui, com $f = 0{,}9$ sobram 12 % do gradiente, e com $f = 0{,}99$, 82 %. E o valor de $f$ não é fixo: é uma saída da rede, aprendida, diferente a cada passo e a cada unidade. A LSTM pode guardar uma informação enquanto ela for útil ($f \approx 1$) e apagá-la depois ($f \approx 0$). Por isso é comum iniciar o viés do bloco $f$ em 1: a rede começa lembrando, com $f \approx \sigma(1) = 0{,}73$, e aprende a esquecer.

O lado da explosão continua existindo pelos outros caminhos, e o limite de norma continua em uso.

O backward completo segue a receita de sempre, de trás para frente, com dois gradientes passando de um passo para o anterior, o de $h$ e o de $c$:

$$dc_t = dh_t \odot o_t \odot (1 - \tanh^2 c_t) + dc_{t+1} \odot f_{t+1}$$

$$di_t = dc_t \odot g_t, \qquad df_t = dc_t \odot c_{t-1}, \qquad dg_t = dc_t \odot i_t, \qquad do_t = dh_t \odot \tanh c_t$$

Cada um volta pela sua ativação ($s(1 - s)$ nas sigmoides, $1 - g^2$ no candidato) e entra no gradiente de $W$ e de $b$, acumulado no tempo como no BPTT. O segundo termo de $dc_t$ é o caminho aditivo. Nesta lição, o backward fica nas fórmulas.

## Passo 5 · Exercício · Sequência e gradiente pela célula

O arquivo `lstm.py` traz o `lstm_passo` do exercício anterior. Escreva o forward sobre a sequência e a função que mede o caminho aditivo.

### Instruções

1. Escreva `lstm_forward(params, X_seq)`: `X_seq` tem forma `(T, n, D)`. Comece com `h` e `c` zerados, de forma `(n, H)`, com `H` igual a um quarto do tamanho de `params["b"]`. Aplique `lstm_passo` a cada passo, levando `h` e `c` de um passo para o seguinte, e devolva `(hs, cs)`, os dois de forma `(T, n, H)`: os estados e as células depois de cada passo.
2. Escreva `gradiente_pela_celula(f_seq)`: `f_seq` tem forma `(T, H)`, com as portas de esquecimento de cada passo. Devolva um array da mesma forma em que a linha `t` é o produto, elemento a elemento, das linhas `t`, `t + 1`, …, `T - 1` de `f_seq`: o fator pelo qual o gradiente da última célula chega à célula que **entra** no passo `t`. Não altere `f_seq`.

### Código inicial

```python
import numpy as np

from lstm import lstm_passo


def lstm_forward(params, X_seq):
    pass


def gradiente_pela_celula(f_seq):
    pass
```

```python path=lstm.py
import numpy as np


def sigmoide(z):
    return 1.0 / (1.0 + np.exp(-z))


def lstm_passo(x, h, c, params):
    H = h.shape[1]
    z = np.concatenate([x, h], axis=1) @ params["W"] + params["b"]
    i = sigmoide(z[:, :H])
    f = sigmoide(z[:, H:2 * H])
    g = np.tanh(z[:, 2 * H:3 * H])
    o = sigmoide(z[:, 3 * H:])
    c_novo = f * c + i * g
    h_novo = o * np.tanh(c_novo)
    return h_novo, c_novo
```

### Solução

```python
import numpy as np

from lstm import lstm_passo


def lstm_forward(params, X_seq):
    T, n = X_seq.shape[0], X_seq.shape[1]
    H = params["b"].shape[0] // 4
    h = np.zeros((n, H))
    c = np.zeros((n, H))
    hs = np.zeros((T, n, H))
    cs = np.zeros((T, n, H))
    for t in range(T):
        h, c = lstm_passo(X_seq[t], h, c, params)
        hs[t] = h
        cs[t] = c
    return hs, cs


def gradiente_pela_celula(f_seq):
    return np.cumprod(f_seq[::-1], axis=0)[::-1]
```

```python path=lstm.py
import numpy as np


def sigmoide(z):
    return 1.0 / (1.0 + np.exp(-z))


def lstm_passo(x, h, c, params):
    H = h.shape[1]
    z = np.concatenate([x, h], axis=1) @ params["W"] + params["b"]
    i = sigmoide(z[:, :H])
    f = sigmoide(z[:, H:2 * H])
    g = np.tanh(z[:, 2 * H:3 * H])
    o = sigmoide(z[:, 3 * H:])
    c_novo = f * c + i * g
    h_novo = o * np.tanh(c_novo)
    return h_novo, c_novo
```

### Dicas

1. `lstm_passo` devolve `(h_novo, c_novo)`, nessa ordem, e recebe `(x, h, c, params)`.
2. A última linha do resultado de `gradiente_pela_celula` é a própria última linha de `f_seq`; a primeira é o produto de todas.
3. `np.cumprod(a, axis=0)` acumula produtos do começo para o fim. Para acumular do fim para o começo, inverta a ordem do tempo antes e depois.

### Verificação

```json
[
  {"id": "formas", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom lstm import lstm_passo\n_rng = np.random.default_rng(1)\n_T, _n, _D, _H = 5, 2, 3, 4\n_params = {\"W\": _rng.normal(0, 0.8, (_D + _H, 4 * _H)), \"b\": _rng.normal(0, 0.5, 4 * _H)}\n_X = _rng.normal(0, 1, (_T, _n, _D))\n_hs, _cs = lstm_forward(_params, _X)", "expr": "[list(_hs.shape), list(_cs.shape)]", "expected": [[5, 2, 4], [5, 2, 4]], "name": "Com T = 5, n = 2 e H = 4, hs e cs têm forma (T, n, H)", "hint": "H é params['b'].shape[0] // 4."},
  {"id": "primeiro-passo", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom lstm import lstm_passo\n_rng = np.random.default_rng(1)\n_T, _n, _D, _H = 5, 2, 3, 4\n_params = {\"W\": _rng.normal(0, 0.8, (_D + _H, 4 * _H)), \"b\": _rng.normal(0, 0.5, 4 * _H)}\n_X = _rng.normal(0, 1, (_T, _n, _D))\n_hs, _cs = lstm_forward(_params, _X)\n_h1, _c1 = lstm_passo(_X[0], np.zeros((_n, _H)), np.zeros((_n, _H)), _params)", "expr": "[bool(np.allclose(_hs[0], _h1, atol=1e-12)), bool(np.allclose(_cs[0], _c1, atol=1e-12))]", "expected": [true, true], "name": "O primeiro passo parte de h e c zerados"},
  {"id": "referencia", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom lstm import lstm_passo\n_rng = np.random.default_rng(1)\n_T, _n, _D, _H = 5, 2, 3, 4\n_params = {\"W\": _rng.normal(0, 0.8, (_D + _H, 4 * _H)), \"b\": _rng.normal(0, 0.5, 4 * _H)}\n_X = _rng.normal(0, 1, (_T, _n, _D))\n_hs, _cs = lstm_forward(_params, _X)\n_h, _c = np.zeros((_n, _H)), np.zeros((_n, _H))\n_Rh, _Rc = [], []\nfor _t in range(_T):\n    _h, _c = lstm_passo(_X[_t], _h, _c, _params)\n    _Rh.append(_h)\n    _Rc.append(_c)", "expr": "[bool(np.allclose(_hs, np.array(_Rh), atol=1e-12)), bool(np.allclose(_cs, np.array(_Rc), atol=1e-12))]", "expected": [true, true], "name": "Todos os estados e células iguais aos de um laço de referência", "hint": "h e c saem de um passo e entram no seguinte; o primeiro booleano é hs e o segundo, cs."},
  {"id": "ultimo-passo", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom lstm import lstm_passo\n_rng = np.random.default_rng(1)\n_T, _n, _D, _H = 5, 2, 3, 4\n_params = {\"W\": _rng.normal(0, 0.8, (_D + _H, 4 * _H)), \"b\": _rng.normal(0, 0.5, 4 * _H)}\n_X = _rng.normal(0, 1, (_T, _n, _D))\n_hs, _cs = lstm_forward(_params, _X)", "expr": "[_hs[-1, 0].tolist(), _cs[-1, 0].tolist()]", "expected": [[0.1989282959882878, -0.140617357504956, -0.09503946727636375, 0.22994028801879385], [0.24769695169147016, -0.3202755492203691, -0.7268671030328311, 0.27979818633316195]], "tolerance": 1e-12, "name": "Valores de h e c do primeiro exemplo no último passo"},
  {"id": "memoria", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom lstm import lstm_passo\n_rng = np.random.default_rng(1)\n_T, _n, _D, _H = 5, 2, 3, 4\n_params = {\"W\": _rng.normal(0, 0.8, (_D + _H, 4 * _H)), \"b\": _rng.normal(0, 0.5, 4 * _H)}\n_X = _rng.normal(0, 1, (_T, _n, _D))\n_hs, _cs = lstm_forward(_params, _X)\n_X2 = _X.copy()\n_X2[0] = _X2[0] + 1.0\n_hs2, _cs2 = lstm_forward(_params, _X2)", "expr": "[bool(not np.allclose(_cs2[-1], _cs[-1])), bool(not np.allclose(_hs2[-1], _hs[-1]))]", "expected": [true, true], "name": "Mudar a primeira entrada muda a célula e o estado do último passo", "hint": "Se nada muda, h ou c não está passando de um passo para o seguinte."},
  {"id": "um-passo", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom lstm import lstm_passo\n_rng = np.random.default_rng(1)\n_T, _n, _D, _H = 5, 2, 3, 4\n_params = {\"W\": _rng.normal(0, 0.8, (_D + _H, 4 * _H)), \"b\": _rng.normal(0, 0.5, 4 * _H)}\n_X = _rng.normal(0, 1, (_T, _n, _D))\n_hs, _cs = lstm_forward(_params, _X[:1])\n_X0 = _X.copy()", "expr": "[list(_hs.shape), bool(np.array_equal(_X, _X0))]", "expected": [[1, 2, 4], true], "name": "Sequência de um passo, e X_seq não é alterado"},
  {"id": "metades", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np", "expr": "gradiente_pela_celula(np.full((3, 1), 0.5)).tolist()", "expected": [[0.125], [0.25], [0.5]], "tolerance": 1e-12, "name": "Três passos com f = 0,5: os fatores são 0,125, 0,25 e 0,5", "hint": "A linha t multiplica as portas de t até o fim, incluindo a do próprio passo t."},
  {"id": "duas-unidades", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_f = np.array([[0.9, 0.5], [1.0, 0.5], [0.5, 0.2]])", "expr": "gradiente_pela_celula(_f).tolist()", "expected": [[0.45, 0.05], [0.5, 0.1], [0.5, 0.2]], "tolerance": 1e-12, "name": "Duas unidades com portas diferentes: um produto por coluna", "hint": "O produto corre ao longo do tempo (eixo 0), separado para cada unidade."},
  {"id": "portas-abertas", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np", "expr": "gradiente_pela_celula(np.ones((4, 2))).tolist()", "expected": [[1.0, 1.0], [1.0, 1.0], [1.0, 1.0], [1.0, 1.0]], "tolerance": 1e-12, "name": "Com todas as portas em 1, o gradiente chega inteiro a todos os passos"},
  {"id": "vinte-passos", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_g = gradiente_pela_celula(np.column_stack([np.full(20, 0.9), np.full(20, 0.99), np.full(20, 0.5)]))", "expr": "[round(float(v), 6) for v in _g[0]]", "expected": [0.121577, 0.817907, 1e-06], "name": "20 passos com f = 0,9, 0,99 e 0,5: o que sobra do gradiente no primeiro passo"},
  {"id": "forma-e-entrada", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_f = np.random.default_rng(0).uniform(0.1, 1.0, (6, 3))\n_c = _f.copy()\n_g = gradiente_pela_celula(_f)", "expr": "[list(_g.shape), bool(np.array_equal(_f, _c)), bool(np.allclose(_g[-1], _f[-1])), bool(np.allclose(_g[0], _f.prod(axis=0)))]", "expected": [[6, 3], true, true, true], "name": "Mesma forma de f_seq, f_seq intacto, última linha igual à de f_seq e primeira igual ao produto de todas"}
]
```

### Soluções erradas

```python name="célula zerada a cada passo"
import numpy as np

from lstm import lstm_passo


def lstm_forward(params, X_seq):
    T, n = X_seq.shape[0], X_seq.shape[1]
    H = params["b"].shape[0] // 4
    h = np.zeros((n, H))
    c = np.zeros((n, H))
    hs = np.zeros((T, n, H))
    cs = np.zeros((T, n, H))
    for t in range(T):
        h, c = lstm_passo(X_seq[t], h, np.zeros((n, H)), params)
        hs[t] = h
        cs[t] = c
    return hs, cs


def gradiente_pela_celula(f_seq):
    return np.cumprod(f_seq[::-1], axis=0)[::-1]
```

```python name="estado escondido zerado a cada passo"
import numpy as np

from lstm import lstm_passo


def lstm_forward(params, X_seq):
    T, n = X_seq.shape[0], X_seq.shape[1]
    H = params["b"].shape[0] // 4
    h = np.zeros((n, H))
    c = np.zeros((n, H))
    hs = np.zeros((T, n, H))
    cs = np.zeros((T, n, H))
    for t in range(T):
        h, c = lstm_passo(X_seq[t], np.zeros((n, H)), c, params)
        hs[t] = h
        cs[t] = c
    return hs, cs


def gradiente_pela_celula(f_seq):
    return np.cumprod(f_seq[::-1], axis=0)[::-1]
```

```python name="h e c trocados na chamada"
import numpy as np

from lstm import lstm_passo


def lstm_forward(params, X_seq):
    T, n = X_seq.shape[0], X_seq.shape[1]
    H = params["b"].shape[0] // 4
    h = np.zeros((n, H))
    c = np.zeros((n, H))
    hs = np.zeros((T, n, H))
    cs = np.zeros((T, n, H))
    for t in range(T):
        h, c = lstm_passo(X_seq[t], c, h, params)
        hs[t] = h
        cs[t] = c
    return hs, cs


def gradiente_pela_celula(f_seq):
    return np.cumprod(f_seq[::-1], axis=0)[::-1]
```

```python name="h e c trocados no retorno do passo"
import numpy as np

from lstm import lstm_passo


def lstm_forward(params, X_seq):
    T, n = X_seq.shape[0], X_seq.shape[1]
    H = params["b"].shape[0] // 4
    h = np.zeros((n, H))
    c = np.zeros((n, H))
    hs = np.zeros((T, n, H))
    cs = np.zeros((T, n, H))
    for t in range(T):
        c, h = lstm_passo(X_seq[t], h, c, params)
        hs[t] = h
        cs[t] = c
    return hs, cs


def gradiente_pela_celula(f_seq):
    return np.cumprod(f_seq[::-1], axis=0)[::-1]
```

```python name="tamanho do estado tirado do viés inteiro"
import numpy as np

from lstm import lstm_passo


def lstm_forward(params, X_seq):
    T, n = X_seq.shape[0], X_seq.shape[1]
    H = params["b"].shape[0]
    h = np.zeros((n, H))
    c = np.zeros((n, H))
    hs = np.zeros((T, n, H))
    cs = np.zeros((T, n, H))
    for t in range(T):
        h, c = lstm_passo(X_seq[t], h, c, params)
        hs[t] = h
        cs[t] = c
    return hs, cs


def gradiente_pela_celula(f_seq):
    return np.cumprod(f_seq[::-1], axis=0)[::-1]
```

```python name="produto acumulado do começo para o fim"
import numpy as np

from lstm import lstm_passo


def lstm_forward(params, X_seq):
    T, n = X_seq.shape[0], X_seq.shape[1]
    H = params["b"].shape[0] // 4
    h = np.zeros((n, H))
    c = np.zeros((n, H))
    hs = np.zeros((T, n, H))
    cs = np.zeros((T, n, H))
    for t in range(T):
        h, c = lstm_passo(X_seq[t], h, c, params)
        hs[t] = h
        cs[t] = c
    return hs, cs


def gradiente_pela_celula(f_seq):
    return np.cumprod(f_seq, axis=0)
```

```python name="soma acumulada no lugar do produto"
import numpy as np

from lstm import lstm_passo


def lstm_forward(params, X_seq):
    T, n = X_seq.shape[0], X_seq.shape[1]
    H = params["b"].shape[0] // 4
    h = np.zeros((n, H))
    c = np.zeros((n, H))
    hs = np.zeros((T, n, H))
    cs = np.zeros((T, n, H))
    for t in range(T):
        h, c = lstm_passo(X_seq[t], h, c, params)
        hs[t] = h
        cs[t] = c
    return hs, cs


def gradiente_pela_celula(f_seq):
    return np.cumsum(f_seq[::-1], axis=0)[::-1]
```

```python name="produto ao longo das unidades em vez do tempo"
import numpy as np

from lstm import lstm_passo


def lstm_forward(params, X_seq):
    T, n = X_seq.shape[0], X_seq.shape[1]
    H = params["b"].shape[0] // 4
    h = np.zeros((n, H))
    c = np.zeros((n, H))
    hs = np.zeros((T, n, H))
    cs = np.zeros((T, n, H))
    for t in range(T):
        h, c = lstm_passo(X_seq[t], h, c, params)
        hs[t] = h
        cs[t] = c
    return hs, cs


def gradiente_pela_celula(f_seq):
    return np.cumprod(f_seq[:, ::-1], axis=1)[:, ::-1]
```

```python name="produto sem a porta do próprio passo"
import numpy as np

from lstm import lstm_passo


def lstm_forward(params, X_seq):
    T, n = X_seq.shape[0], X_seq.shape[1]
    H = params["b"].shape[0] // 4
    h = np.zeros((n, H))
    c = np.zeros((n, H))
    hs = np.zeros((T, n, H))
    cs = np.zeros((T, n, H))
    for t in range(T):
        h, c = lstm_passo(X_seq[t], h, c, params)
        hs[t] = h
        cs[t] = c
    return hs, cs


def gradiente_pela_celula(f_seq):
    return np.concatenate([np.cumprod(f_seq[::-1], axis=0)[::-1][1:], np.ones_like(f_seq[:1])], axis=0)
```

## Passo 6 · Leitura · GRU e por que a atenção venceu

A **GRU** (unidade recorrente com portas, de Cho e colegas, 2014) é uma simplificação da LSTM: um estado só, $h$, e duas portas.

$$z = \sigma([x_t,\ h_{t-1}]\, W_z + b_z), \qquad r = \sigma([x_t,\ h_{t-1}]\, W_r + b_r)$$

$$\tilde{h} = \tanh([x_t,\ r \odot h_{t-1}]\, W_n + b_n), \qquad h_t = (1 - z) \odot \tilde{h} + z \odot h_{t-1}$$

A **porta de atualização** $z$ faz o papel das portas de esquecimento e de entrada juntas: com $z = 1$, o estado antigo passa intacto; com $z = 0$, é trocado pelo candidato $\tilde{h}$. O caminho $z \odot h_{t-1}$ é aditivo, como o da célula. A **porta de reinício** $r$ decide quanto do estado antigo entra no cálculo do candidato. A convenção de qual lado leva o $z$ varia entre os textos; esta lição usa a de cima.

Em custo, cada bloco tem $(D + H) \cdot H$ pesos e $H$ vieses. A RNN simples tem 1 bloco, a GRU 3 e a LSTM 4. Com $D = 21$ e $H = 32$: 1 728, 5 184 e 6 912 parâmetros, e o tempo por passo cresce na mesma proporção.

O uso mais ambicioso das redes com portas foi a tradução, no arranjo **seq2seq**: uma rede lê a frase de origem inteira (o codificador), e o último estado dela é entregue a outra rede, que escreve a tradução (o decodificador). Aí está o limite que as portas não resolvem:

```python
import numpy as np

T, H = 40, 32
hs = np.zeros((T, 1, H))        # os estados do codificador, um por palavra
resumo = hs[-1]                 # o que o decodificador recebe
print(hs.size, resumo.size)     # 1280 32
```

Uma frase de 40 palavras e uma de 4 são espremidas no mesmo vetor de 32 números. É o **gargalo do vetor único**, e a qualidade da tradução caía nas frases longas. Há um segundo limite, de custo: o passo $t$ só pode ser calculado depois do $t - 1$, então uma sequência de $T$ itens exige $T$ operações em fila, que nenhum hardware paraleliza.

A saída, proposta em 2014 por Bahdanau e colegas, foi deixar o decodificador consultar **todos** os estados `hs` a cada palavra que escreve, com pesos que ele mesmo calcula: a **atenção**. Em 2017, o transformer descartou a recorrência e ficou só com a atenção, com todos os passos calculados em paralelo. É o assunto do próximo módulo.

## Passo 7 · Exercício · GRU e contagem

Escreva um passo da GRU e a função que conta os parâmetros das três células recorrentes.

### Instruções

1. Escreva `gru_passo(x, h, params)`: `x` tem forma `(n, D)` e `h`, `(n, H)`. `params` tem `"Wz"`, `"Wr"` e `"Wn"`, de forma `(D + H, H)`, e `"bz"`, `"br"` e `"bn"`, de forma `(H,)`. Calcule `z` e `r` com a sigmoide de `[x, h] @ W + b`; o candidato com a tanh de `[x, r * h] @ Wn + bn`; e devolva `(1 - z) * candidato + z * h`. Não altere as entradas.
2. Escreva `contar_parametros(tipo, d_in, d_h)`: devolva o número de parâmetros de uma célula `"rnn"` (1 bloco), `"gru"` (3 blocos) ou `"lstm"` (4 blocos), em que cada bloco tem `(d_in + d_h) * d_h` pesos e `d_h` vieses. Para qualquer outro `tipo`, levante `ValueError`.

### Código inicial

```python
import numpy as np


def sigmoide(z):
    return 1.0 / (1.0 + np.exp(-z))


def gru_passo(x, h, params):
    pass


def contar_parametros(tipo, d_in, d_h):
    pass
```

### Solução

```python
import numpy as np


def sigmoide(z):
    return 1.0 / (1.0 + np.exp(-z))


def gru_passo(x, h, params):
    xh = np.concatenate([x, h], axis=1)
    z = sigmoide(xh @ params["Wz"] + params["bz"])
    r = sigmoide(xh @ params["Wr"] + params["br"])
    candidato = np.tanh(np.concatenate([x, r * h], axis=1) @ params["Wn"] + params["bn"])
    return (1.0 - z) * candidato + z * h


def contar_parametros(tipo, d_in, d_h):
    blocos = {"rnn": 1, "gru": 3, "lstm": 4}
    if tipo not in blocos:
        raise ValueError("tipo desconhecido: " + str(tipo))
    return blocos[tipo] * ((d_in + d_h) * d_h + d_h)
```

### Dicas

1. `np.concatenate([x, h], axis=1)` junta a entrada e o estado lado a lado, com a entrada primeiro.
2. A porta `r` multiplica só o estado, e só dentro do candidato; `z` e `r` são calculadas com o estado inteiro.
3. Na contagem, calcule um bloco e multiplique pelo número de blocos do tipo.

### Verificação

```json
[
  {"id": "manter", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\ndef _com_vies(z, r, n):\n    Wn = np.zeros((5, 2))\n    Wn[3, 0] = 2.0\n    Wn[4, 1] = 2.0\n    return {\"Wz\": np.zeros((5, 2)), \"bz\": np.full(2, float(z)), \"Wr\": np.zeros((5, 2)), \"br\": np.full(2, float(r)), \"Wn\": Wn, \"bn\": np.full(2, float(n))}\n_x = np.array([[1.0, -2.0, 0.5]])\n_h = np.array([[0.3, -0.7]])", "expr": "gru_passo(_x, _h, _com_vies(50, 0, 1)).tolist()", "expected": [[0.3, -0.7]], "tolerance": 1e-10, "name": "Com z = 1, o estado antigo passa intacto", "hint": "h_novo = (1 - z) * candidato + z * h."},
  {"id": "substituir", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\ndef _com_vies(z, r, n):\n    Wn = np.zeros((5, 2))\n    Wn[3, 0] = 2.0\n    Wn[4, 1] = 2.0\n    return {\"Wz\": np.zeros((5, 2)), \"bz\": np.full(2, float(z)), \"Wr\": np.zeros((5, 2)), \"br\": np.full(2, float(r)), \"Wn\": Wn, \"bn\": np.full(2, float(n))}\n_x = np.array([[1.0, -2.0, 0.5]])\n_h = np.array([[0.3, -0.7]])", "expr": "gru_passo(_x, _h, _com_vies(-50, 50, 0.3)).tolist()", "expected": [[0.7162978701990244, -0.8004990217606296]], "tolerance": 1e-10, "name": "Com z = 0 e r = 1, o estado novo é o candidato, calculado com o estado antigo"},
  {"id": "reinicio-fechado", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\ndef _com_vies(z, r, n):\n    Wn = np.zeros((5, 2))\n    Wn[3, 0] = 2.0\n    Wn[4, 1] = 2.0\n    return {\"Wz\": np.zeros((5, 2)), \"bz\": np.full(2, float(z)), \"Wr\": np.zeros((5, 2)), \"br\": np.full(2, float(r)), \"Wn\": Wn, \"bn\": np.full(2, float(n))}\n_x = np.array([[1.0, -2.0, 0.5]])\n_h = np.array([[0.3, -0.7]])", "expr": "gru_passo(_x, _h, _com_vies(-50, -50, 0.3)).tolist()", "expected": [[0.29131261245159085, 0.29131261245159085]], "tolerance": 1e-10, "name": "Com z = 0 e r = 0, o candidato ignora o estado antigo: tanh(0,3) nas duas unidades", "hint": "A porta r multiplica h antes de ele entrar no candidato."},
  {"id": "meio-a-meio", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\ndef _com_vies(z, r, n):\n    Wn = np.zeros((5, 2))\n    Wn[3, 0] = 2.0\n    Wn[4, 1] = 2.0\n    return {\"Wz\": np.zeros((5, 2)), \"bz\": np.full(2, float(z)), \"Wr\": np.zeros((5, 2)), \"br\": np.full(2, float(r)), \"Wn\": Wn, \"bn\": np.full(2, float(n))}\n_x = np.array([[1.0, -2.0, 0.5]])\n_h = np.array([[0.3, -0.7]])", "expr": "gru_passo(_x, _h, _com_vies(0, 0, -1)).tolist()", "expected": [[-0.1521838885585817, -0.8177045353015495]], "tolerance": 1e-12, "name": "Portas em 0,5: metade do candidato, metade do estado antigo"},
  {"id": "valores", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(2)\n_n, _D, _H = 2, 3, 2\n_params = {\"Wz\": _rng.normal(0, 1, (_D + _H, _H)), \"bz\": _rng.normal(0, 1, _H), \"Wr\": _rng.normal(0, 1, (_D + _H, _H)), \"br\": _rng.normal(0, 1, _H), \"Wn\": _rng.normal(0, 1, (_D + _H, _H)), \"bn\": _rng.normal(0, 1, _H)}\n_x = _rng.normal(0, 1, (_n, _D))\n_h = _rng.normal(0, 1, (_n, _H))", "expr": "gru_passo(_x, _h, _params).tolist()", "expected": [[0.6739869274660728, -0.26894321073255767], [-0.5675275367383679, 0.18432861605868123]], "tolerance": 1e-12, "name": "Pesos sorteados, n = 2, D = 3, H = 2"},
  {"id": "referencia", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(2)\n_n, _D, _H = 2, 3, 2\n_params = {\"Wz\": _rng.normal(0, 1, (_D + _H, _H)), \"bz\": _rng.normal(0, 1, _H), \"Wr\": _rng.normal(0, 1, (_D + _H, _H)), \"br\": _rng.normal(0, 1, _H), \"Wn\": _rng.normal(0, 1, (_D + _H, _H)), \"bn\": _rng.normal(0, 1, _H)}\n_x = _rng.normal(0, 1, (_n, _D))\n_h = _rng.normal(0, 1, (_n, _H))\ndef _s(v):\n    return 1.0 / (1.0 + np.exp(-v))\ndef _ref(x, h, p):\n    n, H = h.shape\n    D = x.shape[1]\n    out = np.zeros((n, H))\n    for a in range(n):\n        v = np.concatenate([x[a], h[a]])\n        z = _s(v @ p[\"Wz\"] + p[\"bz\"])\n        r = _s(v @ p[\"Wr\"] + p[\"br\"])\n        cand = np.tanh(x[a] @ p[\"Wn\"][:D] + (r * h[a]) @ p[\"Wn\"][D:] + p[\"bn\"])\n        out[a] = cand - z * cand + z * h[a]\n    return out", "expr": "bool(np.allclose(gru_passo(_x, _h, _params), _ref(_x, _h, _params), atol=1e-12))", "expected": true, "name": "Resultado igual ao da referência, calculada um exemplo por vez"},
  {"id": "forma-e-entradas", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(2)\n_n, _D, _H = 2, 3, 2\n_params = {\"Wz\": _rng.normal(0, 1, (_D + _H, _H)), \"bz\": _rng.normal(0, 1, _H), \"Wr\": _rng.normal(0, 1, (_D + _H, _H)), \"br\": _rng.normal(0, 1, _H), \"Wn\": _rng.normal(0, 1, (_D + _H, _H)), \"bn\": _rng.normal(0, 1, _H)}\n_x = _rng.normal(0, 1, (_n, _D))\n_h = _rng.normal(0, 1, (_n, _H))\n_copias = {k: v.copy() for k, v in _params.items()}\n_xc, _hc = _x.copy(), _h.copy()\n_hn = gru_passo(_x, _h, _params)", "expr": "[list(_hn.shape), all(bool(np.array_equal(_params[k], _copias[k])) for k in _params), bool(np.array_equal(_x, _xc)), bool(np.array_equal(_h, _hc))]", "expected": [[2, 2], true, true, true], "name": "O estado novo tem forma (n, H) e as entradas não são alteradas"},
  {"id": "contar-rnn", "checkpoint": 2, "kind": "call", "function": "contar_parametros", "args": ["rnn", 21, 32], "expected": 1728, "name": "RNN simples com entrada 21 e estado 32", "hint": "Um bloco: (21 + 32) · 32 pesos e 32 vieses."},
  {"id": "contar-gru", "checkpoint": 2, "kind": "call", "function": "contar_parametros", "args": ["gru", 21, 32], "expected": 5184, "name": "GRU com entrada 21 e estado 32: três blocos"},
  {"id": "contar-lstm", "checkpoint": 2, "kind": "call", "function": "contar_parametros", "args": ["lstm", 21, 32], "expected": 6912, "name": "LSTM com entrada 21 e estado 32: quatro blocos"},
  {"id": "contar-lstm-minima", "checkpoint": 2, "kind": "call", "function": "contar_parametros", "args": ["lstm", 1, 1], "expected": 12, "name": "LSTM com entrada 1 e estado 1", "hint": "Cada bloco tem 2 pesos e 1 viés."},
  {"id": "contar-gru-entrada-maior", "checkpoint": 2, "kind": "call", "function": "contar_parametros", "args": ["gru", 100, 8], "expected": 2616, "name": "GRU com entrada 100 e estado 8", "hint": "Os pesos de um bloco são (d_in + d_h) · d_h: a entrada e o estado entram juntos."},
  {"id": "tipo-desconhecido", "checkpoint": 2, "kind": "expr", "setup": "", "expr": "contar_parametros('transformer', 21, 32)", "raises": "ValueError", "name": "Um tipo desconhecido levanta ValueError"}
]
```

### Soluções erradas

```python name="mistura com z e 1 - z trocados"
import numpy as np


def sigmoide(z):
    return 1.0 / (1.0 + np.exp(-z))


def gru_passo(x, h, params):
    xh = np.concatenate([x, h], axis=1)
    z = sigmoide(xh @ params["Wz"] + params["bz"])
    r = sigmoide(xh @ params["Wr"] + params["br"])
    candidato = np.tanh(np.concatenate([x, r * h], axis=1) @ params["Wn"] + params["bn"])
    return z * candidato + (1.0 - z) * h


def contar_parametros(tipo, d_in, d_h):
    blocos = {"rnn": 1, "gru": 3, "lstm": 4}
    if tipo not in blocos:
        raise ValueError("tipo desconhecido: " + str(tipo))
    return blocos[tipo] * ((d_in + d_h) * d_h + d_h)
```

```python name="candidato sem a porta de reinício"
import numpy as np


def sigmoide(z):
    return 1.0 / (1.0 + np.exp(-z))


def gru_passo(x, h, params):
    xh = np.concatenate([x, h], axis=1)
    z = sigmoide(xh @ params["Wz"] + params["bz"])
    r = sigmoide(xh @ params["Wr"] + params["br"])
    candidato = np.tanh(xh @ params["Wn"] + params["bn"])
    return (1.0 - z) * candidato + z * h


def contar_parametros(tipo, d_in, d_h):
    blocos = {"rnn": 1, "gru": 3, "lstm": 4}
    if tipo not in blocos:
        raise ValueError("tipo desconhecido: " + str(tipo))
    return blocos[tipo] * ((d_in + d_h) * d_h + d_h)
```

```python name="porta de reinício aplicada depois da tanh"
import numpy as np


def sigmoide(z):
    return 1.0 / (1.0 + np.exp(-z))


def gru_passo(x, h, params):
    xh = np.concatenate([x, h], axis=1)
    z = sigmoide(xh @ params["Wz"] + params["bz"])
    r = sigmoide(xh @ params["Wr"] + params["br"])
    candidato = r * np.tanh(xh @ params["Wn"] + params["bn"])
    return (1.0 - z) * candidato + z * h


def contar_parametros(tipo, d_in, d_h):
    blocos = {"rnn": 1, "gru": 3, "lstm": 4}
    if tipo not in blocos:
        raise ValueError("tipo desconhecido: " + str(tipo))
    return blocos[tipo] * ((d_in + d_h) * d_h + d_h)
```

```python name="candidato com sigmoide"
import numpy as np


def sigmoide(z):
    return 1.0 / (1.0 + np.exp(-z))


def gru_passo(x, h, params):
    xh = np.concatenate([x, h], axis=1)
    z = sigmoide(xh @ params["Wz"] + params["bz"])
    r = sigmoide(xh @ params["Wr"] + params["br"])
    candidato = sigmoide(np.concatenate([x, r * h], axis=1) @ params["Wn"] + params["bn"])
    return (1.0 - z) * candidato + z * h


def contar_parametros(tipo, d_in, d_h):
    blocos = {"rnn": 1, "gru": 3, "lstm": 4}
    if tipo not in blocos:
        raise ValueError("tipo desconhecido: " + str(tipo))
    return blocos[tipo] * ((d_in + d_h) * d_h + d_h)
```

```python name="porta de atualização com tanh"
import numpy as np


def sigmoide(z):
    return 1.0 / (1.0 + np.exp(-z))


def gru_passo(x, h, params):
    xh = np.concatenate([x, h], axis=1)
    z = np.tanh(xh @ params["Wz"] + params["bz"])
    r = sigmoide(xh @ params["Wr"] + params["br"])
    candidato = np.tanh(np.concatenate([x, r * h], axis=1) @ params["Wn"] + params["bn"])
    return (1.0 - z) * candidato + z * h


def contar_parametros(tipo, d_in, d_h):
    blocos = {"rnn": 1, "gru": 3, "lstm": 4}
    if tipo not in blocos:
        raise ValueError("tipo desconhecido: " + str(tipo))
    return blocos[tipo] * ((d_in + d_h) * d_h + d_h)
```

```python name="contagem sem multiplicar pelos blocos"
import numpy as np


def sigmoide(z):
    return 1.0 / (1.0 + np.exp(-z))


def gru_passo(x, h, params):
    xh = np.concatenate([x, h], axis=1)
    z = sigmoide(xh @ params["Wz"] + params["bz"])
    r = sigmoide(xh @ params["Wr"] + params["br"])
    candidato = np.tanh(np.concatenate([x, r * h], axis=1) @ params["Wn"] + params["bn"])
    return (1.0 - z) * candidato + z * h


def contar_parametros(tipo, d_in, d_h):
    blocos = {"rnn": 1, "gru": 3, "lstm": 4}
    if tipo not in blocos:
        raise ValueError("tipo desconhecido: " + str(tipo))
    return (d_in + d_h) * d_h + d_h
```

```python name="contagem sem os vieses"
import numpy as np


def sigmoide(z):
    return 1.0 / (1.0 + np.exp(-z))


def gru_passo(x, h, params):
    xh = np.concatenate([x, h], axis=1)
    z = sigmoide(xh @ params["Wz"] + params["bz"])
    r = sigmoide(xh @ params["Wr"] + params["br"])
    candidato = np.tanh(np.concatenate([x, r * h], axis=1) @ params["Wn"] + params["bn"])
    return (1.0 - z) * candidato + z * h


def contar_parametros(tipo, d_in, d_h):
    blocos = {"rnn": 1, "gru": 3, "lstm": 4}
    if tipo not in blocos:
        raise ValueError("tipo desconhecido: " + str(tipo))
    return blocos[tipo] * (d_in + d_h) * d_h
```

```python name="LSTM contada com três blocos"
import numpy as np


def sigmoide(z):
    return 1.0 / (1.0 + np.exp(-z))


def gru_passo(x, h, params):
    xh = np.concatenate([x, h], axis=1)
    z = sigmoide(xh @ params["Wz"] + params["bz"])
    r = sigmoide(xh @ params["Wr"] + params["br"])
    candidato = np.tanh(np.concatenate([x, r * h], axis=1) @ params["Wn"] + params["bn"])
    return (1.0 - z) * candidato + z * h


def contar_parametros(tipo, d_in, d_h):
    blocos = {"rnn": 1, "gru": 3, "lstm": 3}
    if tipo not in blocos:
        raise ValueError("tipo desconhecido: " + str(tipo))
    return blocos[tipo] * ((d_in + d_h) * d_h + d_h)
```

```python name="contagem sem os pesos recorrentes"
import numpy as np


def sigmoide(z):
    return 1.0 / (1.0 + np.exp(-z))


def gru_passo(x, h, params):
    xh = np.concatenate([x, h], axis=1)
    z = sigmoide(xh @ params["Wz"] + params["bz"])
    r = sigmoide(xh @ params["Wr"] + params["br"])
    candidato = np.tanh(np.concatenate([x, r * h], axis=1) @ params["Wn"] + params["bn"])
    return (1.0 - z) * candidato + z * h


def contar_parametros(tipo, d_in, d_h):
    blocos = {"rnn": 1, "gru": 3, "lstm": 4}
    if tipo not in blocos:
        raise ValueError("tipo desconhecido: " + str(tipo))
    return blocos[tipo] * (d_in * d_h + d_h)
```

```python name="tipo desconhecido contado como RNN"
import numpy as np


def sigmoide(z):
    return 1.0 / (1.0 + np.exp(-z))


def gru_passo(x, h, params):
    xh = np.concatenate([x, h], axis=1)
    z = sigmoide(xh @ params["Wz"] + params["bz"])
    r = sigmoide(xh @ params["Wr"] + params["br"])
    candidato = np.tanh(np.concatenate([x, r * h], axis=1) @ params["Wn"] + params["bn"])
    return (1.0 - z) * candidato + z * h


def contar_parametros(tipo, d_in, d_h):
    blocos = {"rnn": 1, "gru": 3, "lstm": 4}
    return blocos.get(tipo, 1) * ((d_in + d_h) * d_h + d_h)
```

## Passo 8 · Quiz · Portas e custo

### Pergunta

Numa unidade de uma LSTM treinada, durante 50 passos seguidos as portas ficam assim: $f \approx 1$, $i \approx 0$ e $o \approx 0$. No passo 51, só a porta de saída muda, para $o \approx 1$. O que acontece com essa unidade?

- [ ] A célula vai a zero nos 50 passos, porque $o \approx 0$ apaga o que estava guardado.
- [ ] A célula acumula o candidato a cada passo e chega ao passo 51 com um valor 50 vezes maior.
- [x] A célula guarda o mesmo valor durante os 50 passos, invisível para o resto da rede ($h \approx 0$), e no passo 51 ele aparece em $h$ como $\tanh(c)$.
- [ ] Nada: com $i \approx 0$ a unidade está desligada, e a porta de saída não tem o que mostrar.

> Com $f \approx 1$ e $i \approx 0$, $c_t = f \odot c_{t-1} + i \odot g \approx c_{t-1}$: a célula não muda. A porta de saída não altera a célula, só decide quanto dela aparece em $h = o \odot \tanh(c)$. O candidato não é acumulado porque a porta de entrada está fechada. É esse comportamento, guardar e revelar depois, que a RNN simples não consegue aprender.

### Pergunta

Um modelo de caracteres com $V = 21$ usa uma RNN simples com $H = 32$, que tem $(21 + 32) \cdot 32 + 32 = 1\,728$ parâmetros na parte recorrente. A equipe troca a célula por uma LSTM, mantendo $D = 21$ e $H = 32$. Quantos parâmetros a parte recorrente passa a ter, e o que acontece com o custo de um passo?

- [ ] 1 856: os mesmos 1 728 mais 4 vetores de 32 portas; o custo quase não muda.
- [ ] 5 184: três blocos, um por porta; o custo triplica.
- [x] 6 912: quatro blocos iguais ao da RNN (três portas e o candidato); o custo de um passo fica cerca de quatro vezes maior.
- [ ] 3 456: o dobro, porque a LSTM tem dois estados, $h$ e $c$.

> Cada porta da LSTM e o candidato têm a sua própria fatia de $W$ e de $b$, do tamanho do bloco único da RNN: $4 \cdot 1\,728 = 6\,912$. As portas não são vetores soltos de 32 números, são calculadas a partir de $[x, h]$ com pesos próprios. Três blocos ($5\,184$) é a conta da GRU. O estado de célula $c$ não tem pesos: ele é calculado, não aprendido.

### Pergunta

Duas redes precisam ligar um erro no passo 20 a algo que aconteceu no passo 1. Na RNN simples, o fator por passo é $0{,}5$, e o gradiente chega multiplicado por $0{,}5^{20} \approx 0{,}00000095$. Na LSTM, a porta de esquecimento da unidade que guarda a informação fica em $0{,}99$, e o gradiente pela célula chega multiplicado por $0{,}99^{20} \approx 0{,}82$. O que explica a diferença?

- [ ] A LSTM tem quatro vezes mais parâmetros, e mais parâmetros sempre dão gradientes maiores.
- [ ] A LSTM usa sigmoides, cujas derivadas são maiores que as da tanh.
- [ ] A LSTM limita a norma do gradiente a cada passo, o que impede que ele diminua.
- [x] Pela célula, o gradiente de um passo para o anterior é multiplicado só pela porta de esquecimento, que a rede pode manter perto de 1, sem matriz de pesos nem derivada de tanh no caminho.

> A atualização $c_t = f \odot c_{t-1} + i \odot g$ é uma soma, e a derivada de $c_t$ em relação a $c_{t-1}$ por esse caminho é $f$. O número de parâmetros não entra na conta. A derivada da sigmoide é no máximo $0{,}25$, menor que a da tanh, que chega a 1. O limite de norma só reduz gradientes grandes; não aumenta os que somem.
