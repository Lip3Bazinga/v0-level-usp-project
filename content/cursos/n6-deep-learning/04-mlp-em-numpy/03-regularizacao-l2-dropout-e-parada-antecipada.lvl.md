---
slug: n6-m4-03-regularizacao-l2-dropout-e-parada-antecipada
titulo: 'Regularização: L2, dropout e parada antecipada'
descricao: Sobreajuste em redes, penalidade L2 no gradiente, dropout invertido com forward/backward e modo de avaliação, aumento de dados simples e parada antecipada com paciência.
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
- Implementar L2 e dropout (invertido) com os modos de treino e avaliação
- Implementar parada antecipada com paciência e restauração do melhor estado
- Medir o efeito de cada técnica na diferença entre treino e validação
---

## Passo 1 · Leitura · Uma rede grande em poucos dados

Na lição anterior, 1 000 dígitos bastaram para a rede 64 → 32 → 10 chegar a 0,97 na validação. Agora o cenário piora de propósito: só **100** dígitos de treino (dez por classe) e uma rede maior, 64 → 128 → 10, com 9 610 parâmetros. Medido no executor, depois de 60 épocas com Adam:

| conjunto | perda | acurácia |
|---|---|---|
| treino (100 imagens) | 0,001 | 1,00 |
| validação (300 imagens) | 1,558 | 0,71 |

A rede acerta tudo o que viu e erra quase um terço do que não viu. É o **sobreajuste** do Nível 5, agora numa rede: com quase cem parâmetros por exemplo, ela consegue decorar o ruído de cada imagem. A distância entre as duas linhas da tabela é o que a regularização tenta encurtar, e esta lição constrói quatro ferramentas para isso: dropout, penalidade L2, parada antecipada e aumento de dados.

O **dropout** desliga neurônios ao acaso durante o treino. A cada passo, cada ativação é mantida com probabilidade $1 - p$ e zerada com probabilidade $p$. Como nenhum neurônio pode contar com os vizinhos, a rede é empurrada a espalhar a informação em vez de depender de poucas ativações decoradas.

Zerar uma fração $p$ das ativações diminui a soma que chega à camada seguinte. Para compensar, as que sobram são divididas por $1 - p$. É o **dropout invertido**: o valor esperado de cada ativação fica igual ao original, e na avaliação a camada vira a identidade, sem máscara e sem escala.

```python
mantidos = rng.random(A.shape) >= p      # True com probabilidade 1 - p
mascara = mantidos / (1 - p)             # 0 ou 1 / (1 - p)
saida = A * mascara                      # treino
dA = dsaida * mascara                    # backward: a MESMA máscara
```

No backward, o gradiente passa pelos mesmos caminhos do forward: zero onde a ativação foi zerada, multiplicado por $\frac{1}{1-p}$ onde foi mantida. Por isso a máscara é o cache da camada. Sortear outra no backward mandaria gradiente para neurônios que não participaram da conta.

O erro clássico é esquecer de desligar o dropout na avaliação. O modelo não quebra: só fica pior e passa a dar uma acurácia diferente a cada execução, com os mesmos pesos e os mesmos dados.

## Passo 2 · Previsão · A escala do dropout invertido

O programa aplica o dropout com $p = 0{,}5$ a quatro ativações, usando uma máscara escrita à mão no lugar do sorteio. Leia sem executar e digite o que ele imprime.

### Código
```python
import numpy as np

A = np.array([[2.0, 4.0, 6.0, 8.0]])
mantidos = np.array([[0.0, 1.0, 1.0, 0.0]])
p = 0.5
mascara = mantidos / (1 - p)
saida = A * mascara
print(mascara.tolist())
print(saida.tolist())
print(float(A.mean()), float(saida.mean()))
print(float((A * mantidos).mean()))
```

### Dicas
1. Dividir por $1 - p = 0{,}5$ é multiplicar por 2.
2. A média de quatro números é a soma dividida por 4, contando os zeros.
3. A última linha é o dropout sem a escala: só a metade mantida entra na soma.

### Saída esperada
```text
[[0.0, 2.0, 2.0, 0.0]]
[[0.0, 8.0, 12.0, 0.0]]
5.0 5.0
2.5
```

## Passo 3 · Exercício · Dropout invertido
modo: lacunas

Complete as lacunas (`___`) do dropout invertido. `p` é a probabilidade de **zerar** uma ativação, `treino` diz se a rede está treinando e `rng` é um gerador do numpy já criado.

### Instruções
1. Na avaliação (`treino` falso), a saída é a própria entrada e a máscara é um array de uns com a forma de `X`.
2. No treino, sorteie com `rng.random(X.shape)` e mantenha as posições em que o sorteio é maior ou igual a `p`; a máscara vale $\frac{1}{1-p}$ nas posições mantidas e 0 nas zeradas.
3. `dropout_forward` devolve `(saida, mascara)`, com `saida` igual a `X` vezes a máscara, sem alterar `X`.
4. `dropout_backward(dout, mascara)` devolve o gradiente que chega multiplicado pela máscara do forward.

### Código inicial
```python
import numpy as np


def dropout_forward(X, p, treino, rng):
    if ___:
        mantidos = ___
        mascara = mantidos / ___
    else:
        mascara = ___
    return ___, mascara


def dropout_backward(dout, mascara):
    return ___
```

### Solução
```python
import numpy as np


def dropout_forward(X, p, treino, rng):
    if treino:
        mantidos = rng.random(X.shape) >= p
        mascara = mantidos / (1 - p)
    else:
        mascara = np.ones_like(X)
    return X * mascara, mascara


def dropout_backward(dout, mascara):
    return dout * mascara
```

### Dicas
1. Um array booleano dividido por um número vira `float`: `True` conta como 1 e `False` como 0.
2. A escala usa a fração que **sobra**, $1 - p$, e só existe no treino.
3. O backward não sorteia nada: a máscara chega pronta.

### Verificação
```json
[
  {"id": "avaliacao-identidade", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nX = np.array([[1.0, -2.0, 3.0], [0.5, 0.0, -4.0]])\nsaida, mascara = dropout_forward(X, 0.5, False, np.random.default_rng(0))", "expr": "[saida.tolist(), mascara.tolist()]", "expected": [[[1.0, -2.0, 3.0], [0.5, 0.0, -4.0]], [[1.0, 1.0, 1.0], [1.0, 1.0, 1.0]]], "tolerance": 1e-12, "name": "Na avaliação, a saída é a entrada e a máscara é toda de uns", "hint": "Fora do treino não há sorteio nem escala."},
  {"id": "avaliacao-p-alto", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nr = np.random.default_rng(1)\nX = r.normal(size=(20, 30))\nsaida, mascara = dropout_forward(X, 0.9, False, r)", "expr": "bool(np.array_equal(saida, X))", "expected": true, "name": "Com p = 0,9 na avaliação, nada é zerado nem escalado"},
  {"id": "mascara-valores", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nsaida, mascara = dropout_forward(np.ones((50, 40)), 0.2, True, np.random.default_rng(2))", "expr": "sorted(set(np.round(mascara.ravel(), 12).tolist()))", "expected": [0.0, 1.25], "tolerance": 1e-09, "name": "Com p = 0,2 no treino, a máscara só tem os valores 0 e 1 / 0,8 = 1,25", "hint": "As posições mantidas valem 1 / (1 - p)."},
  {"id": "fracao-mantida", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nsaida, mascara = dropout_forward(np.ones((100, 200)), 0.2, True, np.random.default_rng(3))\n_fracao = float((mascara > 0).mean())", "expr": "bool(abs(_fracao - 0.8) < 0.015)", "expected": true, "name": "Com p = 0,2, cerca de 80 % das 20 000 posições são mantidas", "hint": "`p` é a probabilidade de zerar: mantém-se onde o sorteio dá pelo menos `p`."},
  {"id": "media-preservada", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nsaida, mascara = dropout_forward(np.ones((100, 200)), 0.2, True, np.random.default_rng(4))", "expr": "bool(abs(float(saida.mean()) - 1.0) < 0.02)", "expected": true, "name": "Com p = 0,2 e entrada de uns, a média da saída continua perto de 1", "hint": "Sem a escala, a média cairia para 0,8."},
  {"id": "saida-usa-a-mascara", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nr = np.random.default_rng(5)\nX = r.normal(size=(8, 6))\nsaida, mascara = dropout_forward(X, 0.5, True, r)", "expr": "[list(saida.shape), list(mascara.shape), bool(np.allclose(saida, X * mascara, atol=1e-12))]", "expected": [[8, 6], [8, 6], true], "name": "A saída é a entrada vezes a máscara devolvida, com a forma da entrada"},
  {"id": "p-zero", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nr = np.random.default_rng(6)\nX = r.normal(size=(5, 4))\nsaida, mascara = dropout_forward(X, 0.0, True, r)", "expr": "[bool(np.array_equal(saida, X)), bool(np.all(mascara == 1.0))]", "expected": [true, true], "name": "Com p = 0 no treino, nada é zerado", "hint": "O sorteio fica em [0, 1): toda posição dá pelo menos 0."},
  {"id": "mesma-semente", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nX = np.ones((10, 10))\nm1 = dropout_forward(X, 0.5, True, np.random.default_rng(7))[1]\nm2 = dropout_forward(X, 0.5, True, np.random.default_rng(7))[1]\nm3 = dropout_forward(X, 0.5, True, np.random.default_rng(8))[1]", "expr": "[bool(np.array_equal(m1, m2)), bool(np.array_equal(m1, m3))]", "expected": [true, false], "name": "O sorteio vem do `rng` recebido: mesma semente, mesma máscara; outra semente, outra máscara"},
  {"id": "backward-valores", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\n", "expr": "dropout_backward(np.array([[1.0, 2.0, 3.0, 4.0]]), np.array([[2.0, 0.0, 2.0, 0.0]])).tolist()", "expected": [[2.0, 0.0, 6.0, 0.0]], "tolerance": 1e-12, "name": "O backward multiplica o gradiente pela máscara do forward", "hint": "Zero onde a ativação foi zerada, a mesma escala onde foi mantida."},
  {"id": "backward-avaliacao", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\nX = np.array([[1.0, 2.0], [3.0, 4.0]])\nsaida, mascara = dropout_forward(X, 0.5, False, np.random.default_rng(9))", "expr": "dropout_backward(np.array([[0.5, -1.0], [2.0, 0.0]]), mascara).tolist()", "expected": [[0.5, -1.0], [2.0, 0.0]], "tolerance": 1e-12, "name": "Com a máscara da avaliação, o gradiente passa inteiro"},
  {"id": "backward-mesma-mascara", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\nr = np.random.default_rng(10)\nX, d = r.normal(size=(30, 20)), r.normal(size=(30, 20))\nsaida, mascara = dropout_forward(X, 0.3, True, r)\ndX = dropout_backward(d, mascara)", "expr": "[bool(np.all(dX[saida == 0] == 0)), bool(np.allclose(dX, d * mascara, atol=1e-12))]", "expected": [true, true], "name": "O gradiente é zero exatamente onde a saída do forward foi zerada", "hint": "Use a máscara recebida, sem sortear de novo."},
  {"id": "entrada-intacta", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nr = np.random.default_rng(11)\nX = r.normal(size=(6, 5))\nX0 = X.copy()\ndropout_forward(X, 0.5, True, r)", "expr": "bool(np.array_equal(X, X0))", "expected": true, "name": "A entrada não muda"}
]
```

### Soluções erradas
```python name="dropout ativo na avaliação"
import numpy as np


def dropout_forward(X, p, treino, rng):
    if True:
        mantidos = rng.random(X.shape) >= p
        mascara = mantidos / (1 - p)
    else:
        mascara = np.ones_like(X)
    return X * mascara, mascara


def dropout_backward(dout, mascara):
    return dout * mascara
```
```python name="sem a escala"
import numpy as np


def dropout_forward(X, p, treino, rng):
    if treino:
        mantidos = rng.random(X.shape) >= p
        mascara = mantidos / 1.0
    else:
        mascara = np.ones_like(X)
    return X * mascara, mascara


def dropout_backward(dout, mascara):
    return dout * mascara
```
```python name="escala por p"
import numpy as np


def dropout_forward(X, p, treino, rng):
    if treino:
        mantidos = rng.random(X.shape) >= p
        mascara = mantidos / p
    else:
        mascara = np.ones_like(X)
    return X * mascara, mascara


def dropout_backward(dout, mascara):
    return dout * mascara
```
```python name="mantém com probabilidade p"
import numpy as np


def dropout_forward(X, p, treino, rng):
    if treino:
        mantidos = rng.random(X.shape) < p
        mascara = mantidos / (1 - p)
    else:
        mascara = np.ones_like(X)
    return X * mascara, mascara


def dropout_backward(dout, mascara):
    return dout * mascara
```
```python name="escala também na avaliação"
import numpy as np


def dropout_forward(X, p, treino, rng):
    if treino:
        mantidos = rng.random(X.shape) >= p
        mascara = mantidos / (1 - p)
    else:
        mascara = np.ones_like(X) / (1 - p)
    return X * mascara, mascara


def dropout_backward(dout, mascara):
    return dout * mascara
```
```python name="backward sem a máscara"
import numpy as np


def dropout_forward(X, p, treino, rng):
    if treino:
        mantidos = rng.random(X.shape) >= p
        mascara = mantidos / (1 - p)
    else:
        mascara = np.ones_like(X)
    return X * mascara, mascara


def dropout_backward(dout, mascara):
    return dout
```
```python name="máscara nova no backward"
import numpy as np


def dropout_forward(X, p, treino, rng):
    if treino:
        mantidos = rng.random(X.shape) >= p
        mascara = mantidos / (1 - p)
    else:
        mascara = np.ones_like(X)
    return X * mascara, mascara


def dropout_backward(dout, mascara):
    return dout * (np.random.default_rng(0).random(dout.shape) >= 0.5) * 2.0
```

## Passo 4 · Leitura · L2 nos pesos, não nos vieses

O dropout mexe nas ativações. A penalidade **L2** mexe na perda: soma a ela um custo por pesos grandes, para que a rede só aumente um peso quando isso reduz bastante o erro. Com $L$ a entropia cruzada e $W_1, \dots, W_k$ as matrizes de pesos das camadas, a perda regularizada é

$$
L_\text{reg} = L + \frac{\lambda}{2} \sum_{c=1}^{k} \lVert W_c \rVert^2
$$

em que $\lVert W_c \rVert^2$ é a soma dos quadrados de todos os números da matriz. O $\frac{1}{2}$ existe para a derivada sair limpa: a derivada de $\frac{\lambda}{2} w^2$ é $\lambda w$. O gradiente de cada matriz ganha um termo, e o resto do backward não muda:

$$
\frac{\partial L_\text{reg}}{\partial W_c} = \frac{\partial L}{\partial W_c} + \lambda W_c
$$

```python
perda_total = perda + 0.5 * lam * sum(float((W ** 2).sum()) for W, b in params)
grads_total = [(dW + lam * W, db) for (dW, db), (W, b) in zip(grads, params)]
```

No gradiente descendente simples, o termo novo aparece como um encolhimento: $W \leftarrow W - \eta(\nabla L + \lambda W) = (1 - \eta\lambda)W - \eta \nabla L$. A cada passo, todo peso perde uma fração fixa do próprio tamanho, e só sobrevive grande o peso que o gradiente do erro continua empurrando. Daí o outro nome, *weight decay*.

Os **vieses ficam fora**. Um viés só desloca a pré-ativação; ele não multiplica nenhuma entrada, então não amplifica ruído, e encolhê-lo só atrapalha o ajuste. Na lista `params = [(W, b), ...]`, a penalidade percorre os `W` e o gradiente de `b` passa intacto.

Dois erros de sinal contrário são comuns: esquecer o $\lambda$ no gradiente (somar $W$ inteiro, cem vezes mais regularização que a pedida, com $ambda = 0{,}01$) e escrever $2\lambda W$ por não ter posto o $\frac12$ na perda. Nos dois casos a perda e o gradiente deixam de combinar, e a checagem numérica da lição anterior acusa na hora.

Medido na rede 64 → 128 → 10 com 100 dígitos: sem L2, a norma dos pesos termina em 18,9 e a perda de validação em 1,56; com $\lambda = 0{,}01$, a norma cai para 6,6 e a perda de validação para 1,19. Com $\lambda = 0{,}1$, a norma cai para 4,1 e o treino deixa de acertar tudo (0,95): regularização demais vira subajuste.

## Passo 5 · Exercício · Penalidade L2

Escreva as duas funções que acrescentam a penalidade L2 a uma perda e a gradientes já calculados. Os arquivos `mlp.py` e `camadas.py` são os da primeira lição do módulo; `perda_e_gradientes(params, X, y)` já está importada, caso queira experimentar.

### Instruções
1. `perda_com_l2(perda, params, lam)` devolve um `float`: a perda mais $\frac{\lambda}{2}$ vezes a soma dos quadrados de **todos os pesos** `W` de `params = [(W, b), ...]`. Os vieses não entram.
2. `grads_com_l2(grads, params, lam)` devolve uma lista nova de pares `(dW, db)`, na ordem de `params`, em que cada `dW` ganhou o termo $\lambda W$ da mesma camada.
3. Os `db` passam sem mudar, e nem `grads` nem `params` são alterados.

### Código inicial
```python
import numpy as np
from mlp import perda_e_gradientes


def perda_com_l2(perda, params, lam):
    pass


def grads_com_l2(grads, params, lam):
    pass
```
```python path=mlp.py
import numpy as np
from camadas import densa_forward, densa_backward, relu_forward, relu_backward, softmax_entropia


def mlp_forward(params, X):
    caches = []
    A = X
    for i, (W, b) in enumerate(params):
        Z, cache_densa = densa_forward(A, W, b)
        if i < len(params) - 1:
            A, cache_relu = relu_forward(Z)
        else:
            A, cache_relu = Z, None
        caches.append((cache_densa, cache_relu))
    return A, caches


def mlp_backward(dsaida, caches):
    grads = []
    d = dsaida
    for cache_densa, cache_relu in reversed(caches):
        if cache_relu is not None:
            d = relu_backward(d, cache_relu)
        d, dW, db = densa_backward(d, cache_densa)
        grads.append((dW, db))
    return grads[::-1]


def perda_e_gradientes(params, X, y):
    logits, caches = mlp_forward(params, X)
    perda, dlogits = softmax_entropia(logits, y)
    return perda, mlp_backward(dlogits, caches)
```
```python path=camadas.py
import numpy as np


def densa_forward(X, W, b):
    Z = X @ W + b
    return Z, (X, W)


def densa_backward(dZ, cache):
    X, W = cache
    dW = X.T @ dZ
    db = dZ.sum(axis=0)
    dX = dZ @ W.T
    return dX, dW, db


def relu_forward(Z):
    return np.maximum(Z, 0.0), Z


def relu_backward(dA, cache):
    Z = cache
    return dA * (Z > 0)


def softmax_entropia(logits, y):
    n = len(y)
    Z = logits - logits.max(axis=1, keepdims=True)
    P = np.exp(Z)
    P = P / P.sum(axis=1, keepdims=True)
    perda = float(-np.log(P[np.arange(n), y]).mean())
    dlogits = P.copy()
    dlogits[np.arange(n), y] -= 1.0
    return perda, dlogits / n
```

### Solução
```python
import numpy as np
from mlp import perda_e_gradientes


def perda_com_l2(perda, params, lam):
    soma = sum(float((W ** 2).sum()) for W, b in params)
    return float(perda + 0.5 * lam * soma)


def grads_com_l2(grads, params, lam):
    return [(dW + lam * W, db) for (dW, db), (W, b) in zip(grads, params)]
```
```python path=mlp.py
import numpy as np
from camadas import densa_forward, densa_backward, relu_forward, relu_backward, softmax_entropia


def mlp_forward(params, X):
    caches = []
    A = X
    for i, (W, b) in enumerate(params):
        Z, cache_densa = densa_forward(A, W, b)
        if i < len(params) - 1:
            A, cache_relu = relu_forward(Z)
        else:
            A, cache_relu = Z, None
        caches.append((cache_densa, cache_relu))
    return A, caches


def mlp_backward(dsaida, caches):
    grads = []
    d = dsaida
    for cache_densa, cache_relu in reversed(caches):
        if cache_relu is not None:
            d = relu_backward(d, cache_relu)
        d, dW, db = densa_backward(d, cache_densa)
        grads.append((dW, db))
    return grads[::-1]


def perda_e_gradientes(params, X, y):
    logits, caches = mlp_forward(params, X)
    perda, dlogits = softmax_entropia(logits, y)
    return perda, mlp_backward(dlogits, caches)
```
```python path=camadas.py
import numpy as np


def densa_forward(X, W, b):
    Z = X @ W + b
    return Z, (X, W)


def densa_backward(dZ, cache):
    X, W = cache
    dW = X.T @ dZ
    db = dZ.sum(axis=0)
    dX = dZ @ W.T
    return dX, dW, db


def relu_forward(Z):
    return np.maximum(Z, 0.0), Z


def relu_backward(dA, cache):
    Z = cache
    return dA * (Z > 0)


def softmax_entropia(logits, y):
    n = len(y)
    Z = logits - logits.max(axis=1, keepdims=True)
    P = np.exp(Z)
    P = P / P.sum(axis=1, keepdims=True)
    perda = float(-np.log(P[np.arange(n), y]).mean())
    dlogits = P.copy()
    dlogits[np.arange(n), y] -= 1.0
    return perda, dlogits / n
```

### Dicas
1. `(W ** 2).sum()` soma os quadrados de uma matriz inteira; some o resultado de todas as camadas.
2. `dW + lam * W` cria um array novo; `dW += ...` escreveria no array de quem chamou.
3. A perda e o gradiente precisam combinar: o $\frac12$ da perda é o que faz o gradiente ser $\lambda W$, sem o 2.

### Verificação
```json
[
  {"id": "perda-valores", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nparams = [(np.array([[1.0, 2.0], [3.0, 4.0]]), np.array([10.0, -10.0])), (np.array([[1.0], [-1.0]]), np.array([5.0]))]\ngrads = [(np.array([[0.5, 0.5], [0.5, 0.5]]), np.array([0.25, 0.75])), (np.array([[-1.0], [1.0]]), np.array([2.0]))]\n", "expr": "perda_com_l2(1.0, params, 0.1)", "expected": 2.6, "tolerance": 1e-12, "name": "Perda 1,0, pesos com soma de quadrados 32 e λ = 0,1: 1,0 + 0,05 · 32", "hint": "A penalidade é metade de λ vezes a soma dos quadrados dos pesos de todas as camadas."},
  {"id": "perda-lam-zero", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nparams = [(np.array([[1.0, 2.0], [3.0, 4.0]]), np.array([10.0, -10.0])), (np.array([[1.0], [-1.0]]), np.array([5.0]))]\ngrads = [(np.array([[0.5, 0.5], [0.5, 0.5]]), np.array([0.25, 0.75])), (np.array([[-1.0], [1.0]]), np.array([2.0]))]\n", "expr": "perda_com_l2(0.75, params, 0.0)", "expected": 0.75, "tolerance": 1e-12, "name": "Com λ = 0, a perda não muda"},
  {"id": "perda-sem-vieses", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nparams = [(np.zeros((3, 2)), np.array([100.0, -50.0])), (np.zeros((2, 2)), np.array([7.0, 7.0]))]", "expr": "perda_com_l2(0.5, params, 1.0)", "expected": 0.5, "tolerance": 1e-12, "name": "Pesos zerados e vieses enormes: a penalidade é zero", "hint": "Os vieses não entram na soma."},
  {"id": "perda-tipo", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nparams = [(np.array([[1.0, 2.0], [3.0, 4.0]]), np.array([10.0, -10.0])), (np.array([[1.0], [-1.0]]), np.array([5.0]))]\ngrads = [(np.array([[0.5, 0.5], [0.5, 0.5]]), np.array([0.25, 0.75])), (np.array([[-1.0], [1.0]]), np.array([2.0]))]\n", "expr": "type(perda_com_l2(1.0, params, 0.1)).__name__", "expected": "float", "name": "Devolve um float do Python"},
  {"id": "grads-valores", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nparams = [(np.array([[1.0, 2.0], [3.0, 4.0]]), np.array([10.0, -10.0])), (np.array([[1.0], [-1.0]]), np.array([5.0]))]\ngrads = [(np.array([[0.5, 0.5], [0.5, 0.5]]), np.array([0.25, 0.75])), (np.array([[-1.0], [1.0]]), np.array([2.0]))]\nnovos = grads_com_l2(grads, params, 0.1)", "expr": "[novos[0][0].tolist(), novos[1][0].tolist()]", "expected": [[[0.6, 0.7], [0.8, 0.9]], [[-0.9], [0.9]]], "tolerance": 1e-12, "name": "Cada dW ganha λ vezes o W da mesma camada", "hint": "Some `lam * W` ao gradiente do peso."},
  {"id": "grads-vieses", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nparams = [(np.array([[1.0, 2.0], [3.0, 4.0]]), np.array([10.0, -10.0])), (np.array([[1.0], [-1.0]]), np.array([5.0]))]\ngrads = [(np.array([[0.5, 0.5], [0.5, 0.5]]), np.array([0.25, 0.75])), (np.array([[-1.0], [1.0]]), np.array([2.0]))]\nnovos = grads_com_l2(grads, params, 0.1)", "expr": "[novos[0][1].tolist(), novos[1][1].tolist()]", "expected": [[0.25, 0.75], [2.0]], "tolerance": 1e-12, "name": "Os gradientes dos vieses passam sem mudar", "hint": "A penalidade não tem os vieses, então o gradiente deles não ganha termo."},
  {"id": "grads-formas", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nparams = [(np.array([[1.0, 2.0], [3.0, 4.0]]), np.array([10.0, -10.0])), (np.array([[1.0], [-1.0]]), np.array([5.0]))]\ngrads = [(np.array([[0.5, 0.5], [0.5, 0.5]]), np.array([0.25, 0.75])), (np.array([[-1.0], [1.0]]), np.array([2.0]))]\nnovos = grads_com_l2(grads, params, 0.1)", "expr": "[type(novos).__name__, [[list(dW.shape), list(db.shape)] for dW, db in novos]]", "expected": ["list", [[[2, 2], [2]], [[2, 1], [1]]]], "name": "Devolve uma lista de pares (dW, db) na ordem e com as formas de params"},
  {"id": "entradas-intactas", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nparams = [(np.array([[1.0, 2.0], [3.0, 4.0]]), np.array([10.0, -10.0])), (np.array([[1.0], [-1.0]]), np.array([5.0]))]\ngrads = [(np.array([[0.5, 0.5], [0.5, 0.5]]), np.array([0.25, 0.75])), (np.array([[-1.0], [1.0]]), np.array([2.0]))]\ng0 = [(dW.copy(), db.copy()) for dW, db in grads]\np0 = [(W.copy(), b.copy()) for W, b in params]\ngrads_com_l2(grads, params, 0.1)\nperda_com_l2(1.0, params, 0.1)", "expr": "[all(np.array_equal(a, c) and np.array_equal(e, f) for (a, e), (c, f) in zip(grads, g0)), all(np.array_equal(a, c) and np.array_equal(e, f) for (a, e), (c, f) in zip(params, p0))]", "expected": [true, true], "name": "Nem grads nem params mudam", "hint": "Monte arrays novos em vez de somar no lugar."},
  {"id": "checagem-numerica", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom mlp import perda_e_gradientes as _pg\nr = np.random.default_rng(7)\nparams = [(r.normal(0, 0.6, (5, 4)), r.normal(0, 0.5, 4)), (r.normal(0, 0.6, (4, 3)), r.normal(0, 0.5, 3))]\nX, y = r.normal(size=(6, 5)), np.array([0, 2, 1, 1, 0, 2])\n_perda, _grads = _pg(params, X, y)\ngrads = grads_com_l2(_grads, params, 0.5)\ndef _f():\n    return perda_com_l2(_pg(params, X, y)[0], params, 0.5)\ndef _numerico(M, h=1e-5):\n    g = np.zeros_like(M)\n    for i in np.ndindex(M.shape):\n        v = M[i]\n        M[i] = v + h\n        a = _f()\n        M[i] = v - h\n        c = _f()\n        M[i] = v\n        g[i] = (a - c) / (2 * h)\n    return g\ndef _erro(a, n):\n    return float(np.linalg.norm(a - n) / max(np.linalg.norm(a) + np.linalg.norm(n), 1e-8))", "expr": "[[_erro(dW, _numerico(W)) < 1e-7, _erro(db, _numerico(b)) < 1e-7] for (W, b), (dW, db) in zip(params, grads)]", "expected": [[true, true], [true, true]], "name": "Rede 5 → 4 → 3 com λ = 0,5: grads_com_l2 bate com a diferença central de perda_com_l2", "hint": "Cada par diz se dW e db de uma camada combinam com a perda regularizada; se só os dW falham, o fator de W na perda e no gradiente não combinam."},
  {"id": "encolhe", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nW = np.array([[2.0, -4.0], [1.0, 0.5]])\nparams = [(W, np.array([1.0, 1.0]))]\ngrads = [(np.zeros((2, 2)), np.zeros(2))]\ndW, db = grads_com_l2(grads, params, 0.5)[0]", "expr": "[(W - 0.1 * dW).tolist(), db.tolist()]", "expected": [[[1.9, -3.8], [0.95, 0.475]], [0.0, 0.0]], "tolerance": 1e-12, "name": "Com gradiente do erro zero, um passo de taxa 0,1 e λ = 0,5 encolhe cada peso em 5 %", "hint": "O passo vira W · (1 − taxa · λ)."}
]
```

### Soluções erradas
```python name="vieses na penalidade"
import numpy as np
from mlp import perda_e_gradientes


def perda_com_l2(perda, params, lam):
    soma = sum(float((W ** 2).sum() + (b ** 2).sum()) for W, b in params)
    return float(perda + 0.5 * lam * soma)


def grads_com_l2(grads, params, lam):
    return [(dW + lam * W, db) for (dW, db), (W, b) in zip(grads, params)]
```
```python name="vieses regularizados no gradiente"
import numpy as np
from mlp import perda_e_gradientes


def perda_com_l2(perda, params, lam):
    soma = sum(float((W ** 2).sum()) for W, b in params)
    return float(perda + 0.5 * lam * soma)


def grads_com_l2(grads, params, lam):
    return [(dW + lam * W, db + lam * b) for (dW, db), (W, b) in zip(grads, params)]
```
```python name="gradiente sem o fator lam"
import numpy as np
from mlp import perda_e_gradientes


def perda_com_l2(perda, params, lam):
    soma = sum(float((W ** 2).sum()) for W, b in params)
    return float(perda + 0.5 * lam * soma)


def grads_com_l2(grads, params, lam):
    return [(dW + W, db) for (dW, db), (W, b) in zip(grads, params)]
```
```python name="penalidade sem o meio"
import numpy as np
from mlp import perda_e_gradientes


def perda_com_l2(perda, params, lam):
    soma = sum(float((W ** 2).sum()) for W, b in params)
    return float(perda + lam * soma)


def grads_com_l2(grads, params, lam):
    return [(dW + lam * W, db) for (dW, db), (W, b) in zip(grads, params)]
```
```python name="gradiente com 2 lam W"
import numpy as np
from mlp import perda_e_gradientes


def perda_com_l2(perda, params, lam):
    soma = sum(float((W ** 2).sum()) for W, b in params)
    return float(perda + 0.5 * lam * soma)


def grads_com_l2(grads, params, lam):
    return [(dW + 2 * lam * W, db) for (dW, db), (W, b) in zip(grads, params)]
```
```python name="soma no lugar, nos gradientes recebidos"
import numpy as np
from mlp import perda_e_gradientes


def perda_com_l2(perda, params, lam):
    soma = sum(float((W ** 2).sum()) for W, b in params)
    return float(perda + 0.5 * lam * soma)


def grads_com_l2(grads, params, lam):
    for (dW, db), (W, b) in zip(grads, params):
        dW += lam * W
    return grads
```
```python name="norma sem o quadrado"
import numpy as np
from mlp import perda_e_gradientes


def perda_com_l2(perda, params, lam):
    soma = sum(float(np.linalg.norm(W)) for W, b in params)
    return float(perda + 0.5 * lam * soma)


def grads_com_l2(grads, params, lam):
    return [(dW + lam * W, db) for (dW, db), (W, b) in zip(grads, params)]
```
```python name="penaliza só a última camada"
import numpy as np
from mlp import perda_e_gradientes


def perda_com_l2(perda, params, lam):
    soma = float((params[-1][0] ** 2).sum())
    return float(perda + 0.5 * lam * soma)


def grads_com_l2(grads, params, lam):
    return [(dW + lam * W, db) for (dW, db), (W, b) in zip(grads, params)]
```

## Passo 6 · Leitura · Parada antecipada e aumento de dados

A regularização mais barata não mexe na rede: é parar de treinar na hora certa. No treino da rede 64 → 128 → 10 com 100 dígitos, a perda de **validação** por época começou assim:

```text
época:  0      1      2      3      4      5      6
perda:  1.643  1.553  1.436  1.441  1.492  1.547  1.579
```

A perda de treino continuou caindo até 0,001, mas a de validação teve o mínimo na época 2 e subiu depois. A **parada antecipada** acompanha essa curva com um contador: cada época que não melhora a melhor perda soma 1, uma melhora zera o contador, e o treino para quando ele chega à **paciência**. Com paciência 3, as épocas 3, 4 e 5 não melhoram e o treino para na época 5.

Parar não basta. Na época 5 os pesos já são piores que os da época 2, então é preciso **restaurar o melhor estado**: a cada melhora, guardar uma cópia dos parâmetros, e no fim devolver essa cópia.

```python
if perda_val < melhor_perda:
    melhor_perda, melhor_epoca = perda_val, epoca
    melhores = [(W.copy(), b.copy()) for W, b in params]   # cópia, e não referência
```

Sem o `.copy()`, a lista guardada aponta para os mesmos arrays que o otimizador continua alterando. A paciência existe porque a curva oscila: parar na primeira piora desperdiça treinos que ainda melhorariam.

A quarta ferramenta ataca a causa em vez do sintoma. As imagens de validação aparecem deslocadas de jeitos que 100 exemplos não cobrem; o **aumento de dados** fabrica essas variações. Deslocar cada imagem de treino 1 pixel para cada um dos quatro lados transforma 100 imagens em 500, com os mesmos rótulos. O pixel que sai da grade se perde e o lado oposto recebe zeros; `np.roll`, usado no gerador, faria a borda reaparecer do outro lado.

Medido com a mesma rede e 60 épocas:

| técnica | acurácia de treino | acurácia de validação |
|---|---|---|
| nenhuma | 1,00 | 0,71 |
| L2 com $\lambda = 0{,}01$ | 1,00 | 0,67 |
| dropout com $p = 0{,}5$ | 1,00 | 0,68 |
| aumento (500 imagens) | 1,00 | 0,93 |

Aqui, L2 e dropout não melhoraram a acurácia, e o aumento fechou quase toda a distância: a rede não conhecia os deslocamentos, e nenhuma penalidade ensina isso. O aumento vale só para o **treino**; a validação fica como é, porque mede os dados que o modelo vai encontrar.

## Passo 7 · Exercício · Parar e aumentar

Escreva a regra da parada antecipada e o deslocamento do aumento de dados. As épocas são numeradas a partir de 0.

### Instruções
1. `parada_antecipada(historico_val, paciencia)` recebe as perdas de validação por época e devolve `(epoca_de_parada, melhor_epoca)`. A época 0 começa como a melhor; cada época seguinte que não melhora a melhor perda soma 1 a um contador, e uma melhora zera o contador. O treino para na época em que o contador chega a `paciencia`; se isso não acontecer, a época de parada é a última do histórico.
2. Melhorar é ter perda **estritamente menor** que a melhor até ali, e `melhor_epoca` é a melhor época vista **até a parada** (é o estado que seria restaurado).
3. `deslocar(X, dx, dy)` recebe imagens 8 × 8 achatadas, de forma `(n, 64)`, e devolve um array novo `(n, 64)` com cada imagem deslocada `dx` colunas para a direita e `dy` linhas para baixo (valores negativos vão para a esquerda e para cima; `dx` e `dy` ficam entre $-7$ e $7$).
4. O que sai da grade se perde e o espaço aberto é preenchido com zeros; `X` não é alterado.

### Código inicial
```python
import numpy as np


def parada_antecipada(historico_val, paciencia):
    pass


def deslocar(X, dx, dy):
    pass
```

### Solução
```python
import numpy as np


def parada_antecipada(historico_val, paciencia):
    melhor_epoca = 0
    sem_melhora = 0
    for epoca in range(1, len(historico_val)):
        if historico_val[epoca] < historico_val[melhor_epoca]:
            melhor_epoca = epoca
            sem_melhora = 0
        else:
            sem_melhora += 1
            if sem_melhora == paciencia:
                return epoca, melhor_epoca
    return len(historico_val) - 1, melhor_epoca


def deslocar(X, dx, dy):
    imagens = X.reshape(-1, 8, 8)
    saida = np.zeros_like(imagens)
    l0, l1 = max(dy, 0), 8 + min(dy, 0)
    c0, c1 = max(dx, 0), 8 + min(dx, 0)
    saida[:, l0:l1, c0:c1] = imagens[:, l0 - dy:l1 - dy, c0 - dx:c1 - dx]
    return saida.reshape(len(X), 64)
```

### Dicas
1. Guarde o índice da melhor época e compare cada perda com `historico_val[melhor_epoca]`.
2. `X.reshape(-1, 8, 8)` devolve as imagens como grades: o eixo 1 são as linhas e o eixo 2, as colunas.
3. Comece com uma grade de zeros e copie para ela só a fatia que continua dentro: com `dx = 1`, as colunas 0 a 6 da entrada viram as colunas 1 a 7 da saída.

### Verificação
```json
[
  {"id": "curva-da-leitura", "checkpoint": 1, "kind": "call", "function": "parada_antecipada", "args": [[1.643, 1.553, 1.436, 1.441, 1.492, 1.547, 1.579], 3], "expected": [5, 2], "type": "tuple", "name": "A curva da leitura com paciência 3: para na época 5, e a melhor é a 2"},
  {"id": "sempre-melhora", "checkpoint": 1, "kind": "call", "function": "parada_antecipada", "args": [[5.0, 4.0, 3.0, 2.0, 1.0], 2], "expected": [4, 4], "type": "tuple", "name": "Uma curva que só melhora vai até a última época, que é a melhor", "hint": "Sem parada, a época de parada é a última do histórico."},
  {"id": "melhora-zera-o-contador", "checkpoint": 1, "kind": "call", "function": "parada_antecipada", "args": [[1.0, 1.1, 1.2, 0.9, 1.0, 1.1, 1.2], 3], "expected": [6, 3], "type": "tuple", "name": "Duas épocas ruins, uma melhora e mais três ruins: para na época 6, e a melhor é a 3", "hint": "Uma melhora zera a contagem das épocas sem melhora."},
  {"id": "empate", "checkpoint": 2, "kind": "call", "function": "parada_antecipada", "args": [[1.0, 1.0, 1.0, 1.0], 2], "expected": [2, 0], "type": "tuple", "name": "Empatar com a melhor perda não é melhorar", "hint": "A comparação com a melhor perda é estrita."},
  {"id": "melhora-depois-da-parada", "checkpoint": 2, "kind": "call", "function": "parada_antecipada", "args": [[1.0, 1.2, 1.3, 1.4, 0.1], 2], "expected": [2, 0], "type": "tuple", "name": "Uma perda menor que aparece depois da parada não conta", "hint": "O treino parou na época 2: o que vem depois nunca foi treinado."},
  {"id": "paciencia-um", "checkpoint": 1, "kind": "call", "function": "parada_antecipada", "args": [[3.0, 2.0, 2.5, 1.0], 1], "expected": [2, 1], "type": "tuple", "name": "Com paciência 1, a primeira época sem melhora já para o treino"},
  {"id": "paciencia-longa", "checkpoint": 1, "kind": "call", "function": "parada_antecipada", "args": [[1.0, 1.1, 1.2], 5], "expected": [2, 0], "type": "tuple", "name": "Paciência maior que o histórico: vai até a última época, e a melhor é a 0"},
  {"id": "direita", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\ndef _pixel(l, c):\n    X = np.zeros((1, 64))\n    X[0, l * 8 + c] = 1.0\n    return X\n", "expr": "np.flatnonzero(deslocar(_pixel(2, 3), 1, 0)).tolist()", "expected": [20], "name": "dx = 1 leva o pixel da linha 2, coluna 3, para a coluna 4 (posição 2 · 8 + 4 = 20)", "hint": "`dx` anda nas colunas, e positivo é para a direita."},
  {"id": "baixo", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\ndef _pixel(l, c):\n    X = np.zeros((1, 64))\n    X[0, l * 8 + c] = 1.0\n    return X\n", "expr": "np.flatnonzero(deslocar(_pixel(2, 3), 0, 1)).tolist()", "expected": [27], "name": "dy = 1 leva o pixel da linha 2 para a linha 3 (posição 3 · 8 + 3 = 27)", "hint": "`dy` anda nas linhas, e positivo é para baixo."},
  {"id": "negativos", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\ndef _pixel(l, c):\n    X = np.zeros((1, 64))\n    X[0, l * 8 + c] = 1.0\n    return X\n", "expr": "np.flatnonzero(deslocar(_pixel(2, 3), -2, -1)).tolist()", "expected": [9], "name": "dx = -2 e dy = -1 levam o pixel para a linha 1, coluna 1 (posição 9)"},
  {"id": "borda-some", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\ndef _pixel(l, c):\n    X = np.zeros((1, 64))\n    X[0, l * 8 + c] = 1.0\n    return X\n", "expr": "[float(deslocar(_pixel(4, 7), 1, 0).sum()), float(deslocar(_pixel(0, 2), 0, -1).sum())]", "expected": [0.0, 0.0], "name": "Um pixel empurrado para fora da grade some, sem voltar pelo outro lado", "hint": "O espaço que abre é preenchido com zeros; `np.roll` daria a volta."},
  {"id": "lote", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\nr = np.random.default_rng(12)\nX = r.random((7, 64))\nX0 = X.copy()\n_ref = np.zeros((7, 8, 8))\nfor _l in range(8):\n    for _c in range(8):\n        if 0 <= _l + 1 < 8 and 0 <= _c - 1 < 8:\n            _ref[:, _l, _c] = X.reshape(7, 8, 8)[:, _l + 1, _c - 1]\nD = deslocar(X, 1, -1)", "expr": "[list(D.shape), bool(np.allclose(D, _ref.reshape(7, 64), atol=1e-12)), bool(np.array_equal(X, X0))]", "expected": [[7, 64], true, true], "name": "Sete imagens com dx = 1 e dy = -1: forma (7, 64), cada pixel no lugar certo e X intacto", "hint": "A lista diz se a forma bate, se os valores batem com um deslocamento feito pixel a pixel e se a entrada ficou intacta."},
  {"id": "sem-deslocamento", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nr = np.random.default_rng(13)\nX = r.random((3, 64))", "expr": "bool(np.array_equal(deslocar(X, 0, 0), X))", "expected": true, "name": "Com dx = 0 e dy = 0, as imagens saem iguais"}
]
```

### Soluções erradas
```python name="deslocar com np.roll"
import numpy as np


def parada_antecipada(historico_val, paciencia):
    melhor_epoca = 0
    sem_melhora = 0
    for epoca in range(1, len(historico_val)):
        if historico_val[epoca] < historico_val[melhor_epoca]:
            melhor_epoca = epoca
            sem_melhora = 0
        else:
            sem_melhora += 1
            if sem_melhora == paciencia:
                return epoca, melhor_epoca
    return len(historico_val) - 1, melhor_epoca


def deslocar(X, dx, dy):
    imagens = X.reshape(-1, 8, 8)
    saida = np.roll(imagens, (dy, dx), axis=(1, 2))
    return saida.reshape(len(X), 64)
```
```python name="dx e dy trocados"
import numpy as np


def parada_antecipada(historico_val, paciencia):
    melhor_epoca = 0
    sem_melhora = 0
    for epoca in range(1, len(historico_val)):
        if historico_val[epoca] < historico_val[melhor_epoca]:
            melhor_epoca = epoca
            sem_melhora = 0
        else:
            sem_melhora += 1
            if sem_melhora == paciencia:
                return epoca, melhor_epoca
    return len(historico_val) - 1, melhor_epoca


def deslocar(X, dx, dy):
    imagens = X.reshape(-1, 8, 8)
    dx, dy = dy, dx
    saida = np.zeros_like(imagens)
    l0, l1 = max(dy, 0), 8 + min(dy, 0)
    c0, c1 = max(dx, 0), 8 + min(dx, 0)
    saida[:, l0:l1, c0:c1] = imagens[:, l0 - dy:l1 - dy, c0 - dx:c1 - dx]
    return saida.reshape(len(X), 64)
```
```python name="sentido do deslocamento invertido"
import numpy as np


def parada_antecipada(historico_val, paciencia):
    melhor_epoca = 0
    sem_melhora = 0
    for epoca in range(1, len(historico_val)):
        if historico_val[epoca] < historico_val[melhor_epoca]:
            melhor_epoca = epoca
            sem_melhora = 0
        else:
            sem_melhora += 1
            if sem_melhora == paciencia:
                return epoca, melhor_epoca
    return len(historico_val) - 1, melhor_epoca


def deslocar(X, dx, dy):
    imagens = X.reshape(-1, 8, 8)
    dx, dy = -dx, -dy
    saida = np.zeros_like(imagens)
    l0, l1 = max(dy, 0), 8 + min(dy, 0)
    c0, c1 = max(dx, 0), 8 + min(dx, 0)
    saida[:, l0:l1, c0:c1] = imagens[:, l0 - dy:l1 - dy, c0 - dx:c1 - dx]
    return saida.reshape(len(X), 64)
```
```python name="empate conta como melhora"
import numpy as np


def parada_antecipada(historico_val, paciencia):
    melhor_epoca = 0
    sem_melhora = 0
    for epoca in range(1, len(historico_val)):
        if historico_val[epoca] <= historico_val[melhor_epoca]:
            melhor_epoca = epoca
            sem_melhora = 0
        else:
            sem_melhora += 1
            if sem_melhora == paciencia:
                return epoca, melhor_epoca
    return len(historico_val) - 1, melhor_epoca


def deslocar(X, dx, dy):
    imagens = X.reshape(-1, 8, 8)
    saida = np.zeros_like(imagens)
    l0, l1 = max(dy, 0), 8 + min(dy, 0)
    c0, c1 = max(dx, 0), 8 + min(dx, 0)
    saida[:, l0:l1, c0:c1] = imagens[:, l0 - dy:l1 - dy, c0 - dx:c1 - dx]
    return saida.reshape(len(X), 64)
```
```python name="devolve a época da parada como a melhor"
import numpy as np


def parada_antecipada(historico_val, paciencia):
    melhor_epoca = 0
    sem_melhora = 0
    for epoca in range(1, len(historico_val)):
        if historico_val[epoca] < historico_val[melhor_epoca]:
            melhor_epoca = epoca
            sem_melhora = 0
        else:
            sem_melhora += 1
            if sem_melhora == paciencia:
                return epoca, epoca
    return len(historico_val) - 1, melhor_epoca


def deslocar(X, dx, dy):
    imagens = X.reshape(-1, 8, 8)
    saida = np.zeros_like(imagens)
    l0, l1 = max(dy, 0), 8 + min(dy, 0)
    c0, c1 = max(dx, 0), 8 + min(dx, 0)
    saida[:, l0:l1, c0:c1] = imagens[:, l0 - dy:l1 - dy, c0 - dx:c1 - dx]
    return saida.reshape(len(X), 64)
```
```python name="melhor época do histórico inteiro"
import numpy as np


def parada_antecipada(historico_val, paciencia):
    melhor_epoca = 0
    sem_melhora = 0
    for epoca in range(1, len(historico_val)):
        if historico_val[epoca] < historico_val[melhor_epoca]:
            melhor_epoca = epoca
            sem_melhora = 0
        else:
            sem_melhora += 1
            if sem_melhora == paciencia:
                return epoca, int(np.argmin(historico_val))
    return len(historico_val) - 1, melhor_epoca


def deslocar(X, dx, dy):
    imagens = X.reshape(-1, 8, 8)
    saida = np.zeros_like(imagens)
    l0, l1 = max(dy, 0), 8 + min(dy, 0)
    c0, c1 = max(dx, 0), 8 + min(dx, 0)
    saida[:, l0:l1, c0:c1] = imagens[:, l0 - dy:l1 - dy, c0 - dx:c1 - dx]
    return saida.reshape(len(X), 64)
```
```python name="contador não zera na melhora"
import numpy as np


def parada_antecipada(historico_val, paciencia):
    melhor_epoca = 0
    sem_melhora = 0
    for epoca in range(1, len(historico_val)):
        if historico_val[epoca] < historico_val[melhor_epoca]:
            melhor_epoca = epoca
        else:
            sem_melhora += 1
            if sem_melhora == paciencia:
                return epoca, melhor_epoca
    return len(historico_val) - 1, melhor_epoca


def deslocar(X, dx, dy):
    imagens = X.reshape(-1, 8, 8)
    saida = np.zeros_like(imagens)
    l0, l1 = max(dy, 0), 8 + min(dy, 0)
    c0, c1 = max(dx, 0), 8 + min(dx, 0)
    saida[:, l0:l1, c0:c1] = imagens[:, l0 - dy:l1 - dy, c0 - dx:c1 - dx]
    return saida.reshape(len(X), 64)
```
```python name="para uma época depois"
import numpy as np


def parada_antecipada(historico_val, paciencia):
    melhor_epoca = 0
    sem_melhora = 0
    for epoca in range(1, len(historico_val)):
        if historico_val[epoca] < historico_val[melhor_epoca]:
            melhor_epoca = epoca
            sem_melhora = 0
        else:
            sem_melhora += 1
            if sem_melhora > paciencia:
                return epoca, melhor_epoca
    return len(historico_val) - 1, melhor_epoca


def deslocar(X, dx, dy):
    imagens = X.reshape(-1, 8, 8)
    saida = np.zeros_like(imagens)
    l0, l1 = max(dy, 0), 8 + min(dy, 0)
    c0, c1 = max(dx, 0), 8 + min(dx, 0)
    saida[:, l0:l1, c0:c1] = imagens[:, l0 - dy:l1 - dy, c0 - dx:c1 - dx]
    return saida.reshape(len(X), 64)
```

## Passo 8 · Quiz · Dropout na avaliação

### Pergunta
Uma rede com dropout ($p = 0{,}5$) terminou de treinar. A mesma pessoa avalia três vezes seguidas, com os mesmos pesos e as mesmas 300 imagens de validação:

```text
execução 1: acurácia 0.887
execução 2: acurácia 0.903
execução 3: acurácia 0.893
```

Qual é a causa mais provável da variação?
- [ ] O conjunto de validação é pequeno demais para dar um número estável
- [x] O dropout ficou ligado na avaliação, e cada execução sorteia uma máscara diferente
- [ ] O Adam continua atualizando os pesos durante a avaliação
- [ ] A ordem das imagens muda a acurácia
> Com pesos e dados fixos, a avaliação é uma conta determinística: o único sorteio possível é a máscara do dropout, que só deveria existir no treino. Um conjunto pequeno dá um número impreciso, mas sempre o mesmo. O otimizador só mexe nos pesos quando alguém chama o passo dele. A acurácia é uma média sobre as imagens e não depende da ordem.

### Pergunta
Alguém implementa o dropout assim, com $p = 0{,}5$, e na avaliação devolve a entrada sem mudar:

```python
mascara = rng.random(A.shape) >= p
saida = A * mascara          # treino
```

O que acontece com a camada seguinte quando a rede passa do treino para a avaliação?
- [ ] Nada: zerar metade das ativações não muda a soma que a camada seguinte recebe
- [ ] Ela recebe, em média, metade do que recebia no treino
- [x] Ela recebe, em média, o dobro do que recebia no treino, uma escala que nunca viu
- [ ] Ela recebe `nan`, porque a máscara é booleana
> No treino só metade das ativações chega, sem compensação; na avaliação chegam todas, e a soma dobra em média. Os pesos seguintes foram ajustados para a escala menor. O dropout invertido resolve dividindo por $1 - p$ no treino, o que mantém o valor esperado e deixa a avaliação como identidade. A soma muda, sim, ao zerar metade. O sentido é o dobro, e não a metade. Multiplicar por um array booleano funciona: `True` vale 1 e `False` vale 0.

### Pergunta
Com 100 dígitos de treino, a equipe mediu 0,71 de validação sem aumento de dados e 0,93 com as imagens de treino deslocadas 1 pixel nos quatro sentidos. Alguém propõe deslocar também as 300 imagens de validação, "para ter mais dados de avaliação". Qual é a melhor resposta?
- [ ] Boa ideia: mais imagens de validação sempre dão uma medida melhor
- [ ] Boa ideia, desde que os deslocamentos sejam os mesmos usados no treino
- [ ] Tanto faz: a rede já acerta 0,93 e o número não mudaria
- [x] Não: a validação precisa continuar parecida com os dados que o modelo vai encontrar, e o aumento é uma ferramenta de treino
> A validação existe para estimar o desempenho nos dados de verdade. Cópias deslocadas das mesmas 300 imagens não trazem informação nova e mudam a distribuição medida, então o número deixa de ser comparável com os anteriores. Usar os mesmos deslocamentos do treino só aproxima a validação do que a rede decorou. E o número mudaria, sim: a medida passaria a ser outra.
