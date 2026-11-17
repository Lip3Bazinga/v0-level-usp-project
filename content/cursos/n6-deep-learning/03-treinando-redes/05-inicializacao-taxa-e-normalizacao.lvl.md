---
slug: n6-m3-05-inicializacao-taxa-e-normalizacao
titulo: Inicialização, taxa de aprendizado e normalização
descricao: Xavier e He, o que acontece com ativações e gradientes em redes profundas mal inicializadas, agendamento da taxa (warmup, cosseno), Batch Normalization e Layer Normalization com forward e backward.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
xp: 140
tempo_min: 60
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Implementar inicializações Xavier e He e medir estatísticas de ativação por camada
- Implementar agendamentos de taxa de aprendizado (passo, cosseno, warmup)
- Implementar BatchNorm e LayerNorm com forward e backward e explicar os modos treino/avaliação
---

## Passo 1 · Leitura · A variância atravessando 10 camadas

Uma rede profunda começa a treinar a partir de pesos sorteados, e o tamanho desse sorteio decide se o sinal chega ao fim da rede. Cada camada calcula $z_j = \sum_i w_{ij}\, a_i$. Se os pesos têm média zero e variância $\sigma_w^2$, e a camada tem $d_\text{in}$ entradas, a variância da pré-ativação é

$$
\operatorname{Var}(z) = d_\text{in}\, \sigma_w^2\, \mathbb{E}[a^2]
$$

A cada camada, o tamanho do sinal é multiplicado por $d_\text{in}\, \sigma_w^2$. Se esse fator é menor que 1, o sinal encolhe em progressão geométrica e as ativações colapsam em zero. Se é maior, as pré-ativações crescem até a tanh saturar em $\pm 1$, onde a derivada é quase nula. Nos dois casos o gradiente também some, porque o backward multiplica pelos mesmos pesos e pelas derivadas das ativações.

Manter o fator em 1 dá a inicialização de **Xavier**, pensada para a tanh, que perto de zero se comporta como a identidade:

$$
\sigma_w = \sqrt{\frac{1}{d_\text{in}}}
$$

A ReLU zera metade das pré-ativações, então $\mathbb{E}[a^2]$ é só metade de $\operatorname{Var}(z)$. Para compensar, a inicialização de **He** dobra a variância dos pesos:

$$
\sigma_w = \sqrt{\frac{2}{d_\text{in}}}
$$

É a que a `rede.py` usa desde a lição 2:

```python
W = rng.normal(0.0, np.sqrt(2.0 / d_in), (d_in, d_out))
b = np.zeros(d_out)
```

Medido no executor, com 10 camadas de 100 neurônios e 200 entradas sorteadas de uma normal padrão, o desvio padrão das ativações em cada camada:

| Ativação e desvio dos pesos | Camada 1 | Camada 2 | Camada 5 | Camada 10 |
|---|---|---|---|---|
| tanh, $\sigma_w = 0{,}01$ | 0,098 | 0,0099 | 0,00001 | $9 \cdot 10^{-11}$ |
| tanh, $\sigma_w = 1$ | 0,958 | 0,959 | 0,958 | 0,959 |
| tanh, Xavier | 0,623 | 0,487 | 0,311 | 0,217 |
| ReLU, Xavier | 0,580 | 0,422 | 0,145 | 0,022 |
| ReLU, He | 0,820 | 0,844 | 0,818 | 0,716 |

Com $\sigma_w = 0{,}01$, o fator é $100 \cdot 0{,}0001 = 0{,}01$ em variância: o sinal perde uma casa decimal por camada. Com $\sigma_w = 1$, o desvio 0,96 parece saudável, mas quer dizer que quase todas as ativações estão coladas em $\pm 1$. A tanh com Xavier ainda encolhe um pouco, porque a tanh só é a identidade bem perto do zero. E a ReLU com Xavier perde um fator de quase $\sqrt{2}$ por camada, que é o que o He devolve.

Os vieses começam em zero: a quebra de simetria entre os neurônios já vem dos pesos sorteados.

## Passo 2 · Previsão · Desvio das ativações em 10 camadas

O programa passa 200 entradas por 10 camadas de 100 neurônios com tanh e imprime o desvio padrão das ativações da última camada, arredondado a uma casa, para três desvios dos pesos. Leia sem executar e digite o que o programa imprime.

### Código
```python
import numpy as np


def desvio_final(escala):
    rng = np.random.default_rng(0)
    A = rng.normal(0.0, 1.0, (200, 100))
    for camada in range(10):
        W = rng.normal(0.0, escala, (100, 100))
        A = np.tanh(A @ W)
    return round(float(A.std()), 1)


print(desvio_final(0.01))
print(desvio_final(np.sqrt(1 / 100)))
print(desvio_final(1.0))
```

### Dicas
1. Com desvio 0,01, cada camada divide o sinal por 10: depois de 10 camadas, sobra zero no arredondamento.
2. A segunda chamada é o Xavier: na tabela da leitura, a tanh com Xavier termina perto de 0,22.
3. Com desvio 1,0, a tanh satura, e quase todas as ativações valem $-1$ ou $1$.

### Saída esperada
```text
0.0
0.2
1.0
```

## Passo 3 · Exercício · Xavier e He
modo: lacunas

Complete as lacunas (`___`) de `inicializar(dims, semente, tipo)`, que devolve a lista de pares `(W, b)` no formato da `rede.py`.

### Instruções
1. Com `tipo == "xavier"`, o desvio dos pesos de cada camada é $\sqrt{1 / d_\text{in}}$; qualquer outro tipo que não seja `"xavier"` nem `"he"` levanta `ValueError`.
2. Com `tipo == "he"`, o desvio é $\sqrt{2 / d_\text{in}}$.
3. O gerador `rng = np.random.default_rng(semente)` é criado uma vez. Para cada camada, na ordem, `W` vem de `rng.normal(0.0, escala, (d_in, d_out))` e `b` é um array de `d_out` zeros.

### Código inicial
```python
import numpy as np


def inicializar(dims, semente, tipo):
    if tipo == "xavier":
        ganho = ___
    elif tipo == "he":
        ganho = ___
    else:
        raise ValueError("tipo desconhecido: " + tipo)
    rng = np.random.default_rng(semente)
    params = []
    for d_in, d_out in zip(dims[:-1], dims[1:]):
        escala = ___
        W = rng.normal(0.0, escala, ___)
        b = ___
        params.append((W, b))
    return params
```

### Solução
```python
import numpy as np


def inicializar(dims, semente, tipo):
    if tipo == "xavier":
        ganho = 1.0
    elif tipo == "he":
        ganho = 2.0
    else:
        raise ValueError("tipo desconhecido: " + tipo)
    rng = np.random.default_rng(semente)
    params = []
    for d_in, d_out in zip(dims[:-1], dims[1:]):
        escala = np.sqrt(ganho / d_in)
        W = rng.normal(0.0, escala, (d_in, d_out))
        b = np.zeros(d_out)
        params.append((W, b))
    return params
```

### Dicas
1. `ganho` é o numerador da fração dentro da raiz: 1 para o Xavier, 2 para o He.
2. A escala é um desvio padrão, e não uma variância: leva raiz.
3. `W` tem uma linha por entrada e uma coluna por saída, para `X @ W` funcionar; o viés tem um número por saída.

### Verificação
```json
[
  {"id": "formas", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nparams = inicializar([5, 4, 3], 0, 'he')", "expr": "[len(params), [[list(W.shape), list(b.shape)] for W, b in params]]", "expected": [2, [[[5, 4], [4]], [[4, 3], [3]]]], "name": "inicializar([5, 4, 3]): duas camadas, W de forma (d_in, d_out) e b de forma (d_out,)", "hint": "Cada camada liga d_in entradas a d_out saídas; W tem uma linha por entrada."},
  {"id": "vieses-zero", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nparams = inicializar([5, 4, 3], 0, 'xavier')", "expr": "[b.tolist() for W, b in params]", "expected": [[0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0]], "name": "Os vieses nascem em zero"},
  {"id": "he-estatisticas", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\ndef _ok(W, sigma):\n    n = W.size\n    return [bool(abs(W.mean()) < 5 * sigma / np.sqrt(n)), bool(abs(W.std() - sigma) < 5 * sigma / np.sqrt(2 * n))]\nW = inicializar([400, 300], 1, 'he')[0][0]", "expr": "_ok(W, np.sqrt(2 / 400))", "expected": [true, true], "name": "He com 400 entradas: média perto de 0 e desvio perto de raiz(2 / 400) = 0.0707", "hint": "A lista diz se a média e se o desvio de W estão a até 5 erros padrão do esperado. O desvio do He é raiz(2 / d_in)."},
  {"id": "xavier-estatisticas", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\ndef _ok(W, sigma):\n    n = W.size\n    return [bool(abs(W.mean()) < 5 * sigma / np.sqrt(n)), bool(abs(W.std() - sigma) < 5 * sigma / np.sqrt(2 * n))]\nW = inicializar([400, 300], 2, 'xavier')[0][0]", "expr": "_ok(W, np.sqrt(1 / 400))", "expected": [true, true], "name": "Xavier com 400 entradas: média perto de 0 e desvio perto de raiz(1 / 400) = 0.05", "hint": "O desvio do Xavier é raiz(1 / d_in)."},
  {"id": "escala-por-camada", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\ndef _ok(W, sigma):\n    n = W.size\n    return [bool(abs(W.mean()) < 5 * sigma / np.sqrt(n)), bool(abs(W.std() - sigma) < 5 * sigma / np.sqrt(2 * n))]\nparams = inicializar([100, 900, 400], 3, 'he')", "expr": "[_ok(params[0][0], np.sqrt(2 / 100)), _ok(params[1][0], np.sqrt(2 / 900))]", "expected": [[true, true], [true, true]], "name": "Cada camada usa o seu d_in: desvios raiz(2 / 100) e raiz(2 / 900)", "hint": "A escala depende do número de entradas da camada, não do de saídas."},
  {"id": "ativacoes-he", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nparams = inicializar([200] * 11, 4, 'he')\nA = np.random.default_rng(0).normal(0.0, 1.0, (100, 200))\nfor W, b in params:\n    A = np.maximum(A @ W + b, 0.0)", "expr": "bool(0.4 < A.std() < 1.6)", "expected": true, "name": "Com He e ReLU, o desvio das ativações depois de 10 camadas continua na ordem de 1", "hint": "Com o desvio raiz(1 / d_in) e ReLU, as ativações encolhem para perto de 0.03 em 10 camadas."},
  {"id": "ativacoes-xavier", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nparams = inicializar([200] * 11, 5, 'xavier')\nA = np.random.default_rng(0).normal(0.0, 1.0, (100, 200))\nfor W, b in params:\n    A = np.tanh(A @ W + b)", "expr": "bool(0.12 < A.std() < 0.4)", "expected": true, "name": "Com Xavier e tanh, o desvio das ativações depois de 10 camadas fica perto de 0.22"},
  {"id": "semente", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\na = inicializar([6, 5, 4], 7, 'he')\nc = inicializar([6, 5, 4], 7, 'he')\nd = inicializar([6, 5, 4], 8, 'he')\ne = inicializar([6, 6, 6], 7, 'he')", "expr": "[all(bool(np.array_equal(x[0], y[0])) for x, y in zip(a, c)), bool(np.array_equal(a[0][0], d[0][0])), bool(np.array_equal(e[0][0], e[1][0]))]", "expected": [true, false, false], "name": "A mesma semente repete os pesos; outra semente e outra camada dão pesos diferentes", "hint": "Crie o gerador uma vez, com default_rng(semente), e use-o em todas as camadas."},
  {"id": "tipo-desconhecido", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n", "expr": "inicializar([3, 2], 0, 'uniforme')", "raises": "ValueError", "name": "Um tipo desconhecido levanta ValueError"}
]
```

### Soluções erradas
```python name="He com 1 / d_in"
import numpy as np


def inicializar(dims, semente, tipo):
    if tipo == "xavier":
        ganho = 1.0
    elif tipo == "he":
        ganho = 1.0
    else:
        raise ValueError("tipo desconhecido: " + tipo)
    rng = np.random.default_rng(semente)
    params = []
    for d_in, d_out in zip(dims[:-1], dims[1:]):
        escala = np.sqrt(ganho / d_in)
        W = rng.normal(0.0, escala, (d_in, d_out))
        b = np.zeros(d_out)
        params.append((W, b))
    return params
```
```python name="ganhos de Xavier e He trocados"
import numpy as np


def inicializar(dims, semente, tipo):
    if tipo == "xavier":
        ganho = 2.0
    elif tipo == "he":
        ganho = 1.0
    else:
        raise ValueError("tipo desconhecido: " + tipo)
    rng = np.random.default_rng(semente)
    params = []
    for d_in, d_out in zip(dims[:-1], dims[1:]):
        escala = np.sqrt(ganho / d_in)
        W = rng.normal(0.0, escala, (d_in, d_out))
        b = np.zeros(d_out)
        params.append((W, b))
    return params
```
```python name="variância no lugar do desvio"
import numpy as np


def inicializar(dims, semente, tipo):
    if tipo == "xavier":
        ganho = 1.0
    elif tipo == "he":
        ganho = 2.0
    else:
        raise ValueError("tipo desconhecido: " + tipo)
    rng = np.random.default_rng(semente)
    params = []
    for d_in, d_out in zip(dims[:-1], dims[1:]):
        escala = ganho / d_in
        W = rng.normal(0.0, escala, (d_in, d_out))
        b = np.zeros(d_out)
        params.append((W, b))
    return params
```
```python name="escala pelo número de saídas"
import numpy as np


def inicializar(dims, semente, tipo):
    if tipo == "xavier":
        ganho = 1.0
    elif tipo == "he":
        ganho = 2.0
    else:
        raise ValueError("tipo desconhecido: " + tipo)
    rng = np.random.default_rng(semente)
    params = []
    for d_in, d_out in zip(dims[:-1], dims[1:]):
        escala = np.sqrt(ganho / d_out)
        W = rng.normal(0.0, escala, (d_in, d_out))
        b = np.zeros(d_out)
        params.append((W, b))
    return params
```
```python name="W com a forma transposta"
import numpy as np


def inicializar(dims, semente, tipo):
    if tipo == "xavier":
        ganho = 1.0
    elif tipo == "he":
        ganho = 2.0
    else:
        raise ValueError("tipo desconhecido: " + tipo)
    rng = np.random.default_rng(semente)
    params = []
    for d_in, d_out in zip(dims[:-1], dims[1:]):
        escala = np.sqrt(ganho / d_in)
        W = rng.normal(0.0, escala, (d_out, d_in))
        b = np.zeros(d_out)
        params.append((W, b))
    return params
```
```python name="viés começa em 1"
import numpy as np


def inicializar(dims, semente, tipo):
    if tipo == "xavier":
        ganho = 1.0
    elif tipo == "he":
        ganho = 2.0
    else:
        raise ValueError("tipo desconhecido: " + tipo)
    rng = np.random.default_rng(semente)
    params = []
    for d_in, d_out in zip(dims[:-1], dims[1:]):
        escala = np.sqrt(ganho / d_in)
        W = rng.normal(0.0, escala, (d_in, d_out))
        b = np.ones(d_out)
        params.append((W, b))
    return params
```
```python name="viés com o tamanho da entrada"
import numpy as np


def inicializar(dims, semente, tipo):
    if tipo == "xavier":
        ganho = 1.0
    elif tipo == "he":
        ganho = 2.0
    else:
        raise ValueError("tipo desconhecido: " + tipo)
    rng = np.random.default_rng(semente)
    params = []
    for d_in, d_out in zip(dims[:-1], dims[1:]):
        escala = np.sqrt(ganho / d_in)
        W = rng.normal(0.0, escala, (d_in, d_out))
        b = np.zeros(d_in)
        params.append((W, b))
    return params
```

## Passo 4 · Leitura · Agendar a taxa

Uma taxa de aprendizado fixa é um meio-termo ruim. No começo do treino, com a rede longe de qualquer mínimo, uma taxa grande faz progresso rápido. No fim, a mesma taxa faz os parâmetros pularem em torno do mínimo sem assentar, por causa do ruído dos mini-lotes. **Agendar** a taxa é fazê-la depender do passo: $\eta_t = \eta_\text{base} \cdot f(t)$. Três agendas cobrem quase tudo o que se usa.

**Degraus.** A taxa fica constante e cai por um fator em pontos fixos. Dividindo o treino de $n$ passos em terços e dividindo a taxa por 10 em cada troca:

$$
\eta_k = \eta_\text{base} \cdot 0{,}1^{\lfloor 3k / n \rfloor}
$$

**Cosseno.** A taxa desce suavemente da base até zero, seguindo meio ciclo do cosseno:

$$
\eta_k = \frac{\eta_\text{base}}{2} \left( 1 + \cos \frac{\pi k}{n - 1} \right)
$$

Em $k = 0$ o cosseno vale 1 e a taxa é a base; em $k = n - 1$, o último passo, vale $-1$ e a taxa é zero. A descida é lenta no começo, rápida no meio e lenta de novo no fim.

**Aquecimento linear.** Nos primeiros passos, as médias do Adam ainda são estimadas com poucos gradientes e a rede recém-inicializada produz gradientes grandes. Começar com a taxa cheia pode jogar os pesos para uma região ruim logo de saída. O aquecimento sobe a taxa em linha reta durante $a$ passos:

$$
\eta_t = \eta_\text{base} \cdot \frac{t + 1}{a} \qquad \text{para } t < a
$$

O primeiro passo usa $\eta_\text{base} / a$, e o último do aquecimento chega à base. Depois dele, a agenda escolhida corre sobre os passos que restam: $k = t - a$ e $n = \text{total} - a$.

```python
for passo in range(total):
    otimizador.taxa = agendar_taxa("cosseno", passo, total, 0.01, aquecimento=100)
    perda, grads = perda_e_grads(params, X[lote], y[lote])
    otimizador.passo(planos, grads_planos)
```

A agenda é uma função pura do número do passo: não olha a perda nem os gradientes, e é aplicada trocando a taxa do otimizador antes de cada passo. Com 10 passos, base 1,0 e aquecimento de 2, o cosseno dá:

| Passo | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---|---|---|---|---|---|---|---|---|---|
| Taxa | 0,50 | 1,00 | 1,00 | 0,95 | 0,81 | 0,61 | 0,39 | 0,19 | 0,05 | 0,00 |

Dois erros de conta são comuns. Dividir por $n$ no cosseno, e não por $n - 1$, faz o último passo parar um pouco acima de zero. E contar o progresso desde o passo 0, sem descontar o aquecimento, faz o cosseno começar já abaixo da base. O aquecimento com cosseno é a agenda padrão dos transformers do módulo 7.

## Passo 5 · Exercício · `agendar_taxa`

Escreva a função que devolve a taxa de um passo. Os passos vão de 0 a `total - 1`, e sobram pelo menos dois passos depois do aquecimento.

### Instruções
1. `agendar_taxa(tipo, passo, total, base, aquecimento=0)` devolve `base` para `tipo == "constante"` e levanta `ValueError` se o tipo não é `"constante"`, `"degraus"` nem `"cosseno"`.
2. Com `"degraus"`, devolve `base * 0.1 ** (3 * k // n)`, com `k = passo - aquecimento` e `n = total - aquecimento`.
3. Com `"cosseno"`, devolve $\frac{\text{base}}{2} \left( 1 + \cos \frac{\pi k}{n - 1} \right)$, que vale `base` em `k = 0` e 0 no último passo.
4. Para qualquer tipo válido, se `passo < aquecimento`, devolve `base * (passo + 1) / aquecimento`.

### Código inicial
```python
import math


def agendar_taxa(tipo, passo, total, base, aquecimento=0):
    pass
```

### Solução
```python
import math


def agendar_taxa(tipo, passo, total, base, aquecimento=0):
    if tipo not in ("constante", "degraus", "cosseno"):
        raise ValueError("tipo desconhecido: " + tipo)
    if passo < aquecimento:
        return base * (passo + 1) / aquecimento
    k = passo - aquecimento
    n = total - aquecimento
    if tipo == "degraus":
        return base * 0.1 ** (3 * k // n)
    if tipo == "cosseno":
        return base * 0.5 * (1 + math.cos(math.pi * k / (n - 1)))
    return base
```

### Dicas
1. Confira o tipo primeiro, depois o aquecimento, e só então calcule `k` e `n`.
2. `//` é a divisão inteira: `3 * k // n` vale 0, 1 ou 2 conforme o terço do treino.
3. `math.cos(math.pi)` é $-1$: o ângulo precisa chegar a $\pi$ exatamente no passo `n - 1`.

### Verificação
```json
[
  {"id": "constante", "checkpoint": 1, "kind": "call", "function": "agendar_taxa", "args": ["constante", 7, 10, 0.5], "expected": 0.5, "tolerance": 1e-12, "name": "constante: a taxa é a base em qualquer passo"},
  {"id": "degraus-inicio", "checkpoint": 2, "kind": "call", "function": "agendar_taxa", "args": ["degraus", 2, 9, 1.0], "expected": 1.0, "tolerance": 1e-12, "name": "degraus, passo 2 de 9: ainda no primeiro terço, taxa 1.0"},
  {"id": "degraus-meio", "checkpoint": 2, "kind": "call", "function": "agendar_taxa", "args": ["degraus", 3, 9, 1.0], "expected": 0.1, "tolerance": 1e-12, "name": "degraus, passo 3 de 9: começa o segundo terço, taxa 0.1", "hint": "O expoente é a divisão inteira 3 * k // n."},
  {"id": "degraus-fim", "checkpoint": 2, "kind": "call", "function": "agendar_taxa", "args": ["degraus", 8, 9, 0.5], "expected": 0.005000000000000001, "tolerance": 1e-12, "name": "degraus, último passo de 9 com base 0.5: taxa 0.005"},
  {"id": "degraus-nao-multiplo", "checkpoint": 2, "kind": "call", "function": "agendar_taxa", "args": ["degraus", 6, 10, 1.0], "expected": 0.1, "tolerance": 1e-12, "name": "degraus, passo 6 de 10: 3 * 6 // 10 = 1, taxa 0.1"},
  {"id": "cosseno-inicio", "checkpoint": 3, "kind": "call", "function": "agendar_taxa", "args": ["cosseno", 0, 11, 0.2], "expected": 0.2, "tolerance": 1e-12, "name": "cosseno, passo 0: a taxa é a base"},
  {"id": "cosseno-meio", "checkpoint": 3, "kind": "call", "function": "agendar_taxa", "args": ["cosseno", 5, 11, 0.2], "expected": 0.1, "tolerance": 1e-12, "name": "cosseno, passo 5 de 11: metade do caminho, metade da base", "hint": "O ângulo vai de 0 a pi quando k vai de 0 a n - 1."},
  {"id": "cosseno-quarto", "checkpoint": 3, "kind": "call", "function": "agendar_taxa", "args": ["cosseno", 3, 13, 1.0], "expected": 0.8535533905932737, "tolerance": 1e-12, "name": "cosseno, passo 3 de 13: um quarto do caminho, taxa 0.8536"},
  {"id": "cosseno-fim", "checkpoint": 3, "kind": "call", "function": "agendar_taxa", "args": ["cosseno", 10, 11, 0.2], "expected": 0.0, "tolerance": 1e-12, "name": "cosseno, último passo: a taxa chega a 0", "hint": "Divida k por n - 1, para o último passo fechar o meio ciclo."},
  {"id": "aquecimento-primeiro", "checkpoint": 4, "kind": "call", "function": "agendar_taxa", "args": ["cosseno", 0, 20, 1.0, 4], "expected": 0.25, "tolerance": 1e-12, "name": "Aquecimento de 4 passos: o passo 0 usa um quarto da base", "hint": "No aquecimento, a taxa é base * (passo + 1) / aquecimento."},
  {"id": "aquecimento-ultimo", "checkpoint": 4, "kind": "call", "function": "agendar_taxa", "args": ["constante", 3, 20, 1.0, 4], "expected": 1.0, "tolerance": 1e-12, "name": "O último passo do aquecimento chega à base"},
  {"id": "aquecimento-degraus", "checkpoint": 4, "kind": "call", "function": "agendar_taxa", "args": ["degraus", 1, 12, 0.3, 3], "expected": 0.19999999999999998, "tolerance": 1e-12, "name": "O aquecimento vale para qualquer tipo: degraus, passo 1 de 3, taxa 0.2"},
  {"id": "cosseno-depois-do-aquecimento", "checkpoint": 4, "kind": "call", "function": "agendar_taxa", "args": ["cosseno", 4, 20, 1.0, 4], "expected": 1.0, "tolerance": 1e-12, "name": "Logo depois do aquecimento, o cosseno começa na base", "hint": "Depois do aquecimento, k = passo - aquecimento e n = total - aquecimento."},
  {"id": "cosseno-com-aquecimento-meio", "checkpoint": 4, "kind": "call", "function": "agendar_taxa", "args": ["cosseno", 9, 20, 1.0, 4], "expected": 0.75, "tolerance": 1e-12, "name": "cosseno com aquecimento 4, passo 9 de 20: taxa 0.75"},
  {"id": "degraus-com-aquecimento", "checkpoint": 4, "kind": "call", "function": "agendar_taxa", "args": ["degraus", 6, 12, 1.0, 3], "expected": 0.1, "tolerance": 1e-12, "name": "degraus com aquecimento 3, passo 6 de 12: segundo terço do restante, taxa 0.1"},
  {"id": "tipo-desconhecido", "checkpoint": 1, "kind": "expr", "expr": "agendar_taxa('linear', 0, 10, 1.0)", "raises": "ValueError", "name": "Um tipo desconhecido levanta ValueError"}
]
```

### Soluções erradas
```python name="cosseno não chega a 0 no último passo"
import math


def agendar_taxa(tipo, passo, total, base, aquecimento=0):
    if tipo not in ("constante", "degraus", "cosseno"):
        raise ValueError("tipo desconhecido: " + tipo)
    if passo < aquecimento:
        return base * (passo + 1) / aquecimento
    k = passo - aquecimento
    n = total - aquecimento
    if tipo == "degraus":
        return base * 0.1 ** (3 * k // n)
    if tipo == "cosseno":
        return base * 0.5 * (1 + math.cos(math.pi * k / n))
    return base
```
```python name="cosseno sem o fator 0.5"
import math


def agendar_taxa(tipo, passo, total, base, aquecimento=0):
    if tipo not in ("constante", "degraus", "cosseno"):
        raise ValueError("tipo desconhecido: " + tipo)
    if passo < aquecimento:
        return base * (passo + 1) / aquecimento
    k = passo - aquecimento
    n = total - aquecimento
    if tipo == "degraus":
        return base * 0.1 ** (3 * k // n)
    if tipo == "cosseno":
        return base * (1 + math.cos(math.pi * k / (n - 1)))
    return base
```
```python name="aquecimento começa na base"
import math


def agendar_taxa(tipo, passo, total, base, aquecimento=0):
    if tipo not in ("constante", "degraus", "cosseno"):
        raise ValueError("tipo desconhecido: " + tipo)
    if passo < aquecimento:
        return base
    k = passo - aquecimento
    n = total - aquecimento
    if tipo == "degraus":
        return base * 0.1 ** (3 * k // n)
    if tipo == "cosseno":
        return base * 0.5 * (1 + math.cos(math.pi * k / (n - 1)))
    return base
```
```python name="aquecimento começa em 0"
import math


def agendar_taxa(tipo, passo, total, base, aquecimento=0):
    if tipo not in ("constante", "degraus", "cosseno"):
        raise ValueError("tipo desconhecido: " + tipo)
    if passo < aquecimento:
        return base * passo / aquecimento
    k = passo - aquecimento
    n = total - aquecimento
    if tipo == "degraus":
        return base * 0.1 ** (3 * k // n)
    if tipo == "cosseno":
        return base * 0.5 * (1 + math.cos(math.pi * k / (n - 1)))
    return base
```
```python name="progresso contado desde o passo 0"
import math


def agendar_taxa(tipo, passo, total, base, aquecimento=0):
    if tipo not in ("constante", "degraus", "cosseno"):
        raise ValueError("tipo desconhecido: " + tipo)
    if passo < aquecimento:
        return base * (passo + 1) / aquecimento
    k = passo
    n = total
    if tipo == "degraus":
        return base * 0.1 ** (3 * k // n)
    if tipo == "cosseno":
        return base * 0.5 * (1 + math.cos(math.pi * k / (n - 1)))
    return base
```
```python name="degraus com divisão real"
import math


def agendar_taxa(tipo, passo, total, base, aquecimento=0):
    if tipo not in ("constante", "degraus", "cosseno"):
        raise ValueError("tipo desconhecido: " + tipo)
    if passo < aquecimento:
        return base * (passo + 1) / aquecimento
    k = passo - aquecimento
    n = total - aquecimento
    if tipo == "degraus":
        return base * 0.1 ** (3 * k / n)
    if tipo == "cosseno":
        return base * 0.5 * (1 + math.cos(math.pi * k / (n - 1)))
    return base
```
```python name="degraus em metades"
import math


def agendar_taxa(tipo, passo, total, base, aquecimento=0):
    if tipo not in ("constante", "degraus", "cosseno"):
        raise ValueError("tipo desconhecido: " + tipo)
    if passo < aquecimento:
        return base * (passo + 1) / aquecimento
    k = passo - aquecimento
    n = total - aquecimento
    if tipo == "degraus":
        return base * 0.1 ** (2 * k // n)
    if tipo == "cosseno":
        return base * 0.5 * (1 + math.cos(math.pi * k / (n - 1)))
    return base
```
```python name="tipo desconhecido devolve a base"
import math


def agendar_taxa(tipo, passo, total, base, aquecimento=0):
    if passo < aquecimento:
        return base * (passo + 1) / aquecimento
    k = passo - aquecimento
    n = total - aquecimento
    if tipo == "degraus":
        return base * 0.1 ** (3 * k // n)
    if tipo == "cosseno":
        return base * 0.5 * (1 + math.cos(math.pi * k / (n - 1)))
    return base
```

## Passo 6 · Leitura · BatchNorm e LayerNorm

A inicialização acerta a escala das ativações no primeiro passo. Depois, os pesos mudam e a escala pode se perder de novo. As camadas de **normalização** refazem a conta dentro da rede, a cada forward.

A **BatchNorm** normaliza cada atributo (coluna) com a média e a variância calculadas no **lote**:

$$
\mu_j = \frac{1}{n} \sum_i x_{ij} \qquad \sigma_j^2 = \frac{1}{n} \sum_i (x_{ij} - \mu_j)^2 \qquad y_{ij} = \gamma_j\, \frac{x_{ij} - \mu_j}{\sqrt{\sigma_j^2 + \varepsilon}} + \beta_j
$$

$\gamma$ e $\beta$ são parâmetros treináveis, um par por atributo, que deixam a rede escolher outra escala e outro centro se precisar. A variância divide por $n$ (o padrão de `X.var`), e o $\varepsilon$ fica dentro da raiz.

O problema aparece na hora de usar a rede. A saída de um exemplo depende dos outros exemplos do lote, e com um exemplo só a conta não faz sentido: $x - \mu = 0$, e a saída é $\beta$ para qualquer entrada. Por isso a BatchNorm tem dois modos. No **treino**, usa as estatísticas do lote e atualiza duas médias móveis:

```python
estado["media"] = momento * estado["media"] + (1 - momento) * media_do_lote
estado["var"] = momento * estado["var"] + (1 - momento) * var_do_lote
```

Na **avaliação**, usa as médias móveis guardadas e não as altera. Medido com lotes de 32 exemplos sorteados com média 5 e variância 4, partindo de média 0 e variância 1 e com momento 0,9: depois de 1 lote o estado guarda média 0,48 e variância 1,40; depois de 10, 3,07 e 2,68; depois de 50, 5,08 e 3,83. Avaliar uma rede que treinou poucos passos usa estatísticas ainda longe das verdadeiras. Esquecer de trocar o modo é um dos defeitos mais comuns em redes com BatchNorm: a acurácia de validação muda com o tamanho do lote de avaliação.

A **LayerNorm** usa a mesma fórmula com o eixo trocado: a média e a variância são calculadas nos atributos de **cada exemplo**, e não no lote.

```python
media = X.mean(axis=-1, keepdims=True)
var = X.var(axis=-1, keepdims=True)
```

Cada exemplo é normalizado sozinho, então não há modo de treino nem de avaliação, nem médias móveis, e o lote pode ter qualquer tamanho. É a normalização dos transformers.

O backward da BatchNorm precisa lembrar que $\mu$ e $\sigma^2$ também dependem de cada $x_i$. Com $g_i = \partial L / \partial y_i$ e $\hat x_i$ a entrada normalizada, o resultado para uma coluna é

$$
\frac{\partial L}{\partial x_i} = \frac{\gamma}{n \sqrt{\sigma^2 + \varepsilon}} \left( n\, g_i - \sum_j g_j - \hat x_i \sum_j g_j\, \hat x_j \right)
$$

Os dois termos subtraídos são os caminhos pela média e pela variância. Ignorá-los é o erro clássico. Esta lição fica no forward; o backward da LayerNorm volta no módulo 7, onde ela é usada.

## Passo 7 · Exercício · Normalizar

Escreva os dois forwards. `X` tem um exemplo por linha; `gamma` e `beta` têm um número por atributo; `estado` é um dicionário com os arrays `"media"` e `"var"`.

### Instruções
1. `batchnorm_forward(X, gamma, beta, estado, treino, momento=0.9, eps=1e-5)` com `treino=True` normaliza cada coluna com a média e a variância do lote (`axis=0`, variância dividindo por $n$) e devolve `gamma * (X - media) / np.sqrt(var + eps) + beta`.
2. Ainda no treino, atualiza `estado["media"]` e `estado["var"]` com `momento * antigo + (1 - momento) * estatística do lote`.
3. Com `treino=False`, normaliza com `estado["media"]` e `estado["var"]` e não altera o estado.
4. `layernorm_forward(X, gamma, beta, eps=1e-5)` aplica a mesma fórmula com a média e a variância do último eixo de cada exemplo (`axis=-1`, `keepdims=True`).

### Código inicial
```python
import numpy as np


def batchnorm_forward(X, gamma, beta, estado, treino, momento=0.9, eps=1e-5):
    pass


def layernorm_forward(X, gamma, beta, eps=1e-5):
    pass
```

### Solução
```python
import numpy as np


def batchnorm_forward(X, gamma, beta, estado, treino, momento=0.9, eps=1e-5):
    if treino:
        media = X.mean(axis=0)
        var = X.var(axis=0)
        estado["media"] = momento * estado["media"] + (1 - momento) * media
        estado["var"] = momento * estado["var"] + (1 - momento) * var
    else:
        media = estado["media"]
        var = estado["var"]
    return gamma * (X - media) / np.sqrt(var + eps) + beta


def layernorm_forward(X, gamma, beta, eps=1e-5):
    media = X.mean(axis=-1, keepdims=True)
    var = X.var(axis=-1, keepdims=True)
    return gamma * (X - media) / np.sqrt(var + eps) + beta
```

### Dicas
1. Os dois modos da BatchNorm só diferem em de onde vêm a média e a variância; a linha da normalização é a mesma.
2. `X.var(axis=0)` já divide por $n$; `ddof=1` dividiria por $n - 1$.
3. Na LayerNorm, `keepdims=True` deixa a média com forma `(n, 1)`, que se alinha com as linhas de `X`.

### Verificação
```json
[
  {"id": "bn-treino-literal", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nX = np.array([[1.0, 10.0], [3.0, 30.0], [5.0, 20.0], [7.0, 60.0]])\ngamma = np.array([1.0, 2.0])\nbeta = np.array([0.0, -1.0])\nestado = {'media': np.zeros(2), 'var': np.ones(2)}\nS = batchnorm_forward(X, gamma, beta, estado, True)", "expr": "S.tolist()", "expected": [[-1.3416394448610998, -3.1380899047552537], [-0.4472131482870333, -1.0], [0.4472131482870333, -2.069044952377627], [1.3416394448610998, 2.2071348571328806]], "tolerance": 1e-10, "name": "Treino: cada coluna é normalizada com a média e a variância do lote, depois gamma e beta", "hint": "Média e variância por coluna (axis=0), variância com divisão por n, eps dentro da raiz."},
  {"id": "bn-treino-referencia", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\ndef _ref_bn(X, gamma, beta, eps=1e-5):\n    saida = np.empty_like(X)\n    for j in range(X.shape[1]):\n        col = X[:, j]\n        m = sum(col) / len(col)\n        v = sum((col - m) ** 2) / len(col)\n        saida[:, j] = gamma[j] * (col - m) / (v + eps) ** 0.5 + beta[j]\n    return saida\nrng = np.random.default_rng(0)\nX = rng.normal(3.0, 2.0, (16, 5))\ngamma = rng.normal(1.0, 0.1, 5)\nbeta = rng.normal(0.0, 0.1, 5)\nestado = {'media': np.zeros(5), 'var': np.ones(5)}\nS = batchnorm_forward(X, gamma, beta, estado, True)", "expr": "[list(S.shape), bool(np.allclose(S, _ref_bn(X, gamma, beta), atol=1e-12))]", "expected": [[16, 5], true], "name": "Lote de 16 exemplos e 5 atributos: igual a uma referência escrita coluna por coluna", "hint": "A lista traz a forma da saída e se ela bate com a referência."},
  {"id": "bn-treino-propriedade", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nrng = np.random.default_rng(1)\nX = rng.normal(-4.0, 3.0, (64, 3))\nS = batchnorm_forward(X, np.ones(3), np.zeros(3), {'media': np.zeros(3), 'var': np.ones(3)}, True)", "expr": "[bool(np.allclose(S.mean(axis=0), 0.0, atol=1e-10)), bool(np.allclose(S.std(axis=0), 1.0, atol=1e-4))]", "expected": [true, true], "name": "Com gamma 1 e beta 0, cada coluna da saída tem média 0 e desvio 1"},
  {"id": "bn-eps", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nX = np.array([[1.0, 2.0], [1.0, 2.2]])\nS = batchnorm_forward(X, np.ones(2), np.zeros(2), {'media': np.zeros(2), 'var': np.ones(2)}, True, eps=0.01)", "expr": "[bool(np.all(np.isfinite(S))), S.tolist()]", "expected": [true, [[0.0, -0.7071067811865479], [0.0, 0.7071067811865479]]], "tolerance": 1e-10, "name": "Uma coluna constante não gera nan, e eps = 0.01 entra somado à variância, dentro da raiz", "hint": "O denominador é raiz(var + eps)."},
  {"id": "bn-estado-um-passo", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nX = np.array([[1.0, 10.0], [3.0, 30.0], [5.0, 20.0], [7.0, 60.0]])\ngamma = np.array([1.0, 2.0])\nbeta = np.array([0.0, -1.0])\nestado = {'media': np.zeros(2), 'var': np.ones(2)}\nbatchnorm_forward(X, gamma, beta, estado, True)", "expr": "[estado['media'].tolist(), estado['var'].tolist()]", "expected": [[0.3999999999999999, 2.999999999999999], [1.4, 35.89999999999999]], "tolerance": 1e-10, "name": "Depois de um lote de treino: estado = 0.9 * estado + 0.1 * estatística do lote", "hint": "A média do lote é [4, 30] e a variância, [5, 350]; o estado partiu de média 0 e variância 1."},
  {"id": "bn-estado-dois-passos", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nX = np.array([[1.0, 10.0], [3.0, 30.0], [5.0, 20.0], [7.0, 60.0]])\ngamma = np.array([1.0, 2.0])\nbeta = np.array([0.0, -1.0])\nestado = {'media': np.zeros(2), 'var': np.ones(2)}\nbatchnorm_forward(X, gamma, beta, estado, True, momento=0.5)\nbatchnorm_forward(X[:2] * 2.0, gamma, beta, estado, True, momento=0.5)", "expr": "[estado['media'].tolist(), estado['var'].tolist()]", "expected": [[3.0, 27.5], [3.5, 287.75]], "tolerance": 1e-10, "name": "Dois lotes com momento 0.5: as médias móveis acumulam"},
  {"id": "bn-avaliacao-literal", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nX = np.array([[1.0, 10.0], [3.0, 30.0], [5.0, 20.0], [7.0, 60.0]])\ngamma = np.array([1.0, 2.0])\nbeta = np.array([0.0, -1.0])\nestado = {'media': np.array([2.0, 20.0]), 'var': np.array([4.0, 100.0])}\nS = batchnorm_forward(X, gamma, beta, estado, False, eps=0.0)", "expr": "S.tolist()", "expected": [[-0.5, -3.0], [0.5, 1.0], [1.5, -1.0], [2.5, 7.0]], "tolerance": 1e-10, "name": "Avaliação: normaliza com a média [2, 20] e a variância [4, 100] do estado, não com as do lote", "hint": "Com treino=False, as estatísticas vêm de estado['media'] e estado['var']."},
  {"id": "bn-avaliacao-nao-atualiza", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nX = np.array([[1.0, 10.0], [3.0, 30.0], [5.0, 20.0], [7.0, 60.0]])\ngamma = np.array([1.0, 2.0])\nbeta = np.array([0.0, -1.0])\nestado = {'media': np.array([2.0, 20.0]), 'var': np.array([4.0, 100.0])}\nbatchnorm_forward(X, gamma, beta, estado, False)", "expr": "[estado['media'].tolist(), estado['var'].tolist()]", "expected": [[2.0, 20.0], [4.0, 100.0]], "name": "Na avaliação, o estado não muda", "hint": "As médias móveis só são atualizadas com treino=True."},
  {"id": "bn-avaliacao-um-exemplo", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nX = np.array([[1.0, 10.0], [3.0, 30.0], [5.0, 20.0], [7.0, 60.0]])\ngamma = np.array([1.0, 2.0])\nbeta = np.array([0.0, -1.0])\nestado = {'media': np.array([2.0, 20.0]), 'var': np.array([4.0, 100.0])}\nlote = batchnorm_forward(X, gamma, beta, estado, False)\nsozinho = batchnorm_forward(X[2:3], gamma, beta, estado, False)", "expr": "[bool(np.allclose(sozinho[0], lote[2], atol=1e-12)), sozinho.tolist()]", "expected": [true, [[1.4999981250035155, -1.0]]], "tolerance": 1e-10, "name": "Na avaliação, a saída de um exemplo é a mesma sozinho ou dentro de um lote"},
  {"id": "ln-literal", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\nX = np.array([[1.0, 10.0], [3.0, 30.0], [5.0, 20.0], [7.0, 60.0]])\ngamma = np.array([1.0, 2.0])\nbeta = np.array([0.0, -1.0])\nS = layernorm_forward(X, gamma, beta)", "expr": "S.tolist()", "expected": [[-0.9999997530865112, 0.9999995061730225], [-0.9999999725651588, 0.9999999451303176], [-0.999999911111123, 0.9999998222222459], [-0.9999999928800285, 0.999999985760057]], "tolerance": 1e-10, "name": "LayerNorm: cada linha é normalizada com a sua média e a sua variância", "hint": "As estatísticas são do último eixo (os atributos de cada exemplo), com keepdims=True."},
  {"id": "ln-propriedade", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\nrng = np.random.default_rng(2)\nX = rng.normal(2.0, 5.0, (6, 8))\nS = layernorm_forward(X, np.ones(8), np.zeros(8))", "expr": "[list(S.shape), bool(np.allclose(S.mean(axis=1), 0.0, atol=1e-10)), bool(np.allclose(S.std(axis=1), 1.0, atol=1e-4)), bool(np.allclose(S.mean(axis=0), 0.0, atol=1e-10))]", "expected": [[6, 8], true, true, false], "name": "Com gamma 1 e beta 0, cada linha tem média 0 e desvio 1 (as colunas, não)"},
  {"id": "ln-independe-do-lote", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\nrng = np.random.default_rng(3)\nX = rng.normal(0.0, 1.0, (5, 4))\ngamma = rng.normal(1.0, 0.1, 4)\nbeta = rng.normal(0.0, 0.1, 4)\ntodos = layernorm_forward(X, gamma, beta)\num = layernorm_forward(X[1:2], gamma, beta)", "expr": "bool(np.allclose(um[0], todos[1], atol=1e-12))", "expected": true, "name": "A saída de um exemplo não depende dos outros exemplos do lote"},
  {"id": "ln-tres-eixos", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\nrng = np.random.default_rng(4)\nX = rng.normal(0.0, 2.0, (2, 3, 6))\nS = layernorm_forward(X, np.ones(6), np.zeros(6))", "expr": "[list(S.shape), bool(np.allclose(S.mean(axis=-1), 0.0, atol=1e-10)), bool(np.allclose(S[1, 2], layernorm_forward(X[1, 2][None, :], np.ones(6), np.zeros(6))[0], atol=1e-12))]", "expected": [[2, 3, 6], true, true], "name": "Entrada de forma (2, 3, 6): a normalização é no último eixo, vetor por vetor", "hint": "Use axis=-1: nos transformers, X tem um eixo de posições entre o lote e os atributos."},
  {"id": "ln-eps", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\nS = layernorm_forward(np.array([[2.0, 2.0, 2.0], [1.0, 1.2, 1.4]]), np.ones(3), np.zeros(3), eps=0.01)", "expr": "[bool(np.all(np.isfinite(S))), S.tolist()]", "expected": [true, [[0.0, 0.0, 0.0], [-1.044465935734187, 0.0, 1.044465935734187]]], "tolerance": 1e-10, "name": "Uma linha constante não gera nan, e eps entra dentro da raiz"}
]
```

### Soluções erradas
```python name="avaliação com as estatísticas do lote"
import numpy as np


def batchnorm_forward(X, gamma, beta, estado, treino, momento=0.9, eps=1e-5):
    if treino:
        media = X.mean(axis=0)
        var = X.var(axis=0)
        estado["media"] = momento * estado["media"] + (1 - momento) * media
        estado["var"] = momento * estado["var"] + (1 - momento) * var
    else:
        media = X.mean(axis=0)
        var = X.var(axis=0)
    return gamma * (X - media) / np.sqrt(var + eps) + beta


def layernorm_forward(X, gamma, beta, eps=1e-5):
    media = X.mean(axis=-1, keepdims=True)
    var = X.var(axis=-1, keepdims=True)
    return gamma * (X - media) / np.sqrt(var + eps) + beta
```
```python name="médias móveis atualizadas na avaliação"
import numpy as np


def batchnorm_forward(X, gamma, beta, estado, treino, momento=0.9, eps=1e-5):
    if treino:
        media = X.mean(axis=0)
        var = X.var(axis=0)
        estado["media"] = momento * estado["media"] + (1 - momento) * media
        estado["var"] = momento * estado["var"] + (1 - momento) * var
    else:
        media = estado["media"]
        var = estado["var"]
        estado["media"] = momento * estado["media"] + (1 - momento) * X.mean(axis=0)
        estado["var"] = momento * estado["var"] + (1 - momento) * X.var(axis=0)
    return gamma * (X - media) / np.sqrt(var + eps) + beta


def layernorm_forward(X, gamma, beta, eps=1e-5):
    media = X.mean(axis=-1, keepdims=True)
    var = X.var(axis=-1, keepdims=True)
    return gamma * (X - media) / np.sqrt(var + eps) + beta
```
```python name="variância com ddof=1"
import numpy as np


def batchnorm_forward(X, gamma, beta, estado, treino, momento=0.9, eps=1e-5):
    if treino:
        media = X.mean(axis=0)
        var = X.var(axis=0, ddof=1)
        estado["media"] = momento * estado["media"] + (1 - momento) * media
        estado["var"] = momento * estado["var"] + (1 - momento) * var
    else:
        media = estado["media"]
        var = estado["var"]
    return gamma * (X - media) / np.sqrt(var + eps) + beta


def layernorm_forward(X, gamma, beta, eps=1e-5):
    media = X.mean(axis=-1, keepdims=True)
    var = X.var(axis=-1, keepdims=True)
    return gamma * (X - media) / np.sqrt(var + eps) + beta
```
```python name="eps fora da raiz na BatchNorm"
import numpy as np


def batchnorm_forward(X, gamma, beta, estado, treino, momento=0.9, eps=1e-5):
    if treino:
        media = X.mean(axis=0)
        var = X.var(axis=0)
        estado["media"] = momento * estado["media"] + (1 - momento) * media
        estado["var"] = momento * estado["var"] + (1 - momento) * var
    else:
        media = estado["media"]
        var = estado["var"]
    return gamma * (X - media) / (np.sqrt(var) + eps) + beta


def layernorm_forward(X, gamma, beta, eps=1e-5):
    media = X.mean(axis=-1, keepdims=True)
    var = X.var(axis=-1, keepdims=True)
    return gamma * (X - media) / np.sqrt(var + eps) + beta
```
```python name="momento invertido"
import numpy as np


def batchnorm_forward(X, gamma, beta, estado, treino, momento=0.9, eps=1e-5):
    if treino:
        media = X.mean(axis=0)
        var = X.var(axis=0)
        estado["media"] = (1 - momento) * estado["media"] + momento * media
        estado["var"] = (1 - momento) * estado["var"] + momento * var
    else:
        media = estado["media"]
        var = estado["var"]
    return gamma * (X - media) / np.sqrt(var + eps) + beta


def layernorm_forward(X, gamma, beta, eps=1e-5):
    media = X.mean(axis=-1, keepdims=True)
    var = X.var(axis=-1, keepdims=True)
    return gamma * (X - media) / np.sqrt(var + eps) + beta
```
```python name="estado não é atualizado no treino"
import numpy as np


def batchnorm_forward(X, gamma, beta, estado, treino, momento=0.9, eps=1e-5):
    if treino:
        media = X.mean(axis=0)
        var = X.var(axis=0)
    else:
        media = estado["media"]
        var = estado["var"]
    return gamma * (X - media) / np.sqrt(var + eps) + beta


def layernorm_forward(X, gamma, beta, eps=1e-5):
    media = X.mean(axis=-1, keepdims=True)
    var = X.var(axis=-1, keepdims=True)
    return gamma * (X - media) / np.sqrt(var + eps) + beta
```
```python name="estado guarda o desvio no lugar da variância"
import numpy as np


def batchnorm_forward(X, gamma, beta, estado, treino, momento=0.9, eps=1e-5):
    if treino:
        media = X.mean(axis=0)
        var = X.var(axis=0)
        estado["media"] = momento * estado["media"] + (1 - momento) * media
        estado["var"] = momento * estado["var"] + (1 - momento) * np.sqrt(var)
    else:
        media = estado["media"]
        var = estado["var"]
    return gamma * (X - media) / np.sqrt(var + eps) + beta


def layernorm_forward(X, gamma, beta, eps=1e-5):
    media = X.mean(axis=-1, keepdims=True)
    var = X.var(axis=-1, keepdims=True)
    return gamma * (X - media) / np.sqrt(var + eps) + beta
```
```python name="LayerNorm no eixo do lote"
import numpy as np


def batchnorm_forward(X, gamma, beta, estado, treino, momento=0.9, eps=1e-5):
    if treino:
        media = X.mean(axis=0)
        var = X.var(axis=0)
        estado["media"] = momento * estado["media"] + (1 - momento) * media
        estado["var"] = momento * estado["var"] + (1 - momento) * var
    else:
        media = estado["media"]
        var = estado["var"]
    return gamma * (X - media) / np.sqrt(var + eps) + beta


def layernorm_forward(X, gamma, beta, eps=1e-5):
    media = X.mean(axis=0, keepdims=True)
    var = X.var(axis=0, keepdims=True)
    return gamma * (X - media) / np.sqrt(var + eps) + beta
```
```python name="LayerNorm com eps fora da raiz"
import numpy as np


def batchnorm_forward(X, gamma, beta, estado, treino, momento=0.9, eps=1e-5):
    if treino:
        media = X.mean(axis=0)
        var = X.var(axis=0)
        estado["media"] = momento * estado["media"] + (1 - momento) * media
        estado["var"] = momento * estado["var"] + (1 - momento) * var
    else:
        media = estado["media"]
        var = estado["var"]
    return gamma * (X - media) / np.sqrt(var + eps) + beta


def layernorm_forward(X, gamma, beta, eps=1e-5):
    media = X.mean(axis=-1, keepdims=True)
    var = X.var(axis=-1, keepdims=True)
    return gamma * (X - media) / (np.sqrt(var) + eps) + beta
```
```python name="LayerNorm sem gamma e beta"
import numpy as np


def batchnorm_forward(X, gamma, beta, estado, treino, momento=0.9, eps=1e-5):
    if treino:
        media = X.mean(axis=0)
        var = X.var(axis=0)
        estado["media"] = momento * estado["media"] + (1 - momento) * media
        estado["var"] = momento * estado["var"] + (1 - momento) * var
    else:
        media = estado["media"]
        var = estado["var"]
    return gamma * (X - media) / np.sqrt(var + eps) + beta


def layernorm_forward(X, gamma, beta, eps=1e-5):
    media = X.mean(axis=-1, keepdims=True)
    var = X.var(axis=-1, keepdims=True)
    return (X - media) / np.sqrt(var + eps)
```

## Passo 8 · Quiz · Treino contra avaliação

### Pergunta
Uma rede com BatchNorm atinge 94 % de acurácia de validação quando avaliada em lotes de 64 exemplos. Avaliada um exemplo por vez, com o mesmo código, cai para 10 % em 10 classes. O que explica?
- [ ] As médias móveis ainda não tinham convergido
- [ ] Com um exemplo, a variância com `ddof=1` divide por zero
- [x] A avaliação está no modo de treino: com um exemplo só, $x - \mu = 0$ e toda entrada vira $\beta$
- [ ] A LayerNorm deveria ter sido usada nos lotes de 64
> No modo de treino, a normalização usa o próprio lote. Com um exemplo, a média é o exemplo, a saída da camada é $\beta$ para qualquer entrada, e a rede responde sempre a mesma classe: 10 % em 10 classes. No modo de avaliação, as médias móveis dariam o mesmo resultado com qualquer tamanho de lote, convergidas ou não. O código usa a variância com divisão por $n$, e trocar de normalização não é a causa.

### Pergunta
Uma rede de 10 camadas com ReLU foi inicializada com desvio $\sqrt{1 / d_\text{in}}$. Na primeira época, a perda fica em $\ln 10 \approx 2{,}30$ e quase não se move; os gradientes das primeiras camadas são milhares de vezes menores que os da última. Qual é a mudança indicada?
- [x] Usar $\sqrt{2 / d_\text{in}}$, porque a ReLU zera metade das pré-ativações e o sinal encolhe a cada camada
- [ ] Usar desvio 1,0, para as ativações ficarem grandes
- [ ] Inicializar os pesos com zero, para a rede começar simétrica
- [ ] Reduzir a taxa de aprendizado em 10 vezes
> Com ReLU e $\sqrt{1 / d_\text{in}}$, a tabela da leitura mostra o desvio caindo de 0,58 para 0,02 em 10 camadas, e o gradiente encolhe do mesmo jeito no caminho de volta. O He compensa a metade zerada. Desvio 1,0 faz o sinal explodir, pesos zero deixam todos os neurônios iguais (e sem gradiente), e uma taxa menor só deixa mais lento um treino que já não anda.

### Pergunta
Um treino de 1 000 passos usa `agendar_taxa("cosseno", passo, 1000, 0.01, aquecimento=100)`. Quais são as taxas nos passos 0, 99 e 999?
- [ ] 0,01, 0,01 e 0
- [ ] 0, 0,01 e 0,0001
- [ ] 0,0001, 0,0099 e 0
- [x] 0,0001, 0,01 e 0
> No aquecimento, a taxa é $0{,}01 \cdot (t + 1) / 100$: 0,0001 no passo 0 e 0,01 no passo 99, o último do aquecimento. O cosseno corre sobre os 900 passos restantes e chega a zero no último. Começar em 0,01 ignora o aquecimento. Começar em 0 usa $t / a$ no lugar de $(t + 1) / a$, conta que também dá 0,0099 no passo 99, o valor da terceira alternativa. E o cosseno termina em zero, não em 0,0001.
