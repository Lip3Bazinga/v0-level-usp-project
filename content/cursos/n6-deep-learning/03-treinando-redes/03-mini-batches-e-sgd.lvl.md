---
slug: n6-m3-03-mini-batches-e-sgd
titulo: Mini-batches e SGD
descricao: Lotes, embaralhamento por época, tamanho do lote vs ruído e velocidade, e a relação entre taxa de aprendizado e tamanho do lote.
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
- Implementar a iteração por mini-batches com embaralhamento reproduzível
- Comparar perda por passo e por época para lotes de tamanhos diferentes
- Explicar a relação entre tamanho do lote, ruído do gradiente e taxa de aprendizado
---

## Passo 1 · Leitura · Lote cheio, um exemplo, mini-lote

O laço da lição anterior calcula o gradiente com **todos** os exemplos a cada passo. Com os 300 pontos da espiral, tudo bem. Com 60 mil imagens, cada passo exige um forward e um backward no conjunto inteiro, e a rede dá poucos passos por minuto. A saída, que você já usou no Nível 5, é estimar o gradiente com um pedaço dos dados, o **mini-lote** $B$:

$$
g_B = \frac{1}{|B|} \sum_{i \in B} \nabla \ell_i \qquad \text{em vez de} \qquad g = \frac{1}{n} \sum_{i=1}^{n} \nabla \ell_i
$$

Se o lote é sorteado, $g_B$ acerta $g$ **em média**: é uma estimativa sem viés, só com ruído. Três regimes têm nome:

| Lote | Nome | Passos por época ($n = 300$) |
|---|---|---|
| $n$ | descida em lote cheio | 1 |
| 1 | SGD de um exemplo | 300 |
| 32 | mini-lote | 10 (o último com 12) |

Dois termos que se confundem: um **passo** é uma atualização dos parâmetros, com um lote; uma **época** é uma passada por todos os exemplos, ou seja, $\lceil n / B \rceil$ passos. Com 1 000 exemplos e lote 64, uma época tem 16 passos, e o último lote tem só 40 exemplos.

O laço de mini-lotes tem uma estrutura fixa: em cada época, sorteia uma **permutação** dos índices e a corta em fatias consecutivas.

```python
rng = np.random.default_rng(0)            # criado uma vez, antes das épocas
for epoca in range(epocas):
    ordem = rng.permutation(n)            # uma ordem nova por época
    for inicio in range(0, n, B):
        lote = ordem[inicio:inicio + B]
        perda, grads = perda_e_grads(params, X[lote], y[lote])
        ...
```

Três detalhes desse código são decisões. A permutação garante que cada exemplo apareça **exatamente uma vez** por época, ao contrário de sortear índices com reposição. O mesmo `lote` indexa `X` e `y`, então cada exemplo continua com o seu rótulo. E o gerador é criado uma vez só: recriado com a mesma semente dentro do laço, ele daria a mesma ordem em todas as épocas.

Por que embaralhar? A espiral da `rede.py` vem ordenada por classe: os 100 primeiros pontos são da classe 0. Sem embaralhar, cada lote de 32 tem uma classe só, e cada passo empurra a rede para "tudo é desta classe". Medido com lote 32, taxa 1,0 e 20 épocas: sem embaralhar, a perda no conjunto inteiro termina em 0,78 e a rede acerta 53 % da validação; com uma permutação nova por época, 0,20 e 93 %.

## Passo 2 · Previsão · Os lotes de uma época

O gerador corta uma permutação sorteada em lotes. A ordem sorteada não é impressa, só o que não depende dela. Leia sem executar e digite o que o programa imprime.

### Código
```python
import numpy as np


def gerar_lotes(n, tamanho, rng):
    indices = rng.permutation(n)
    for inicio in range(0, n, tamanho):
        yield indices[inicio:inicio + tamanho]


rng = np.random.default_rng(0)
lotes = list(gerar_lotes(10, 4, rng))
print([len(lote) for lote in lotes])
print(sorted(np.concatenate(lotes).tolist()))
print(len(list(gerar_lotes(10, 5, rng))), len(list(gerar_lotes(10, 3, rng))))
```

### Dicas
1. `range(0, 10, 4)` dá os começos 0, 4 e 8; a última fatia vai até onde houver.
2. Uma permutação tem cada índice uma vez, em alguma ordem: ordenada, é a lista de 0 a 9.
3. Com 10 exemplos, lotes de 5 dão 2 lotes, e lotes de 3 dão 4, contando o lote de 1.

### Saída esperada
```text
[4, 4, 2]
[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
2 4
```

## Passo 3 · Exercício · Gerador de lotes
modo: lacunas

Complete as lacunas (`___`) de `gerar_lotes(n, tamanho, rng, descartar_ultimo=False)`, um gerador que devolve, um de cada vez, os arrays de índices dos lotes de uma época.

### Instruções
1. Sorteie uma permutação dos índices de 0 a `n - 1` com `rng.permutation(n)`, uma vez por chamada.
2. Devolva com `yield` fatias consecutivas de `tamanho` índices; o último lote pode ser menor.
3. Com `descartar_ultimo=True`, o lote incompleto do fim não é devolvido (os lotes completos continuam todos lá).

### Código inicial
```python
import numpy as np


def gerar_lotes(n, tamanho, rng, descartar_ultimo=False):
    indices = ___
    fim = ___ if descartar_ultimo else n
    for inicio in range(0, fim, tamanho):
        yield indices[___]
```

### Solução
```python
import numpy as np


def gerar_lotes(n, tamanho, rng, descartar_ultimo=False):
    indices = rng.permutation(n)
    fim = n - n % tamanho if descartar_ultimo else n
    for inicio in range(0, fim, tamanho):
        yield indices[inicio:inicio + tamanho]
```

### Dicas
1. `rng.permutation(n)` devolve os inteiros de 0 a `n - 1`, cada um uma vez, numa ordem sorteada.
2. O número de exemplos que cabem em lotes completos é `n` menos o resto da divisão por `tamanho`.
3. A fatia de um lote começa em `inicio` e tem `tamanho` elementos; o numpy corta sozinho no fim do array.

### Verificação
```json
[
  { "id": "gerador", "checkpoint": 2, "kind": "expr",
    "setup": "import numpy as np",
    "expr": "gerar_lotes(10, 4, np.random.default_rng(0))", "type": "generator",
    "name": "gerar_lotes é um gerador",
    "hint": "Use yield para devolver cada lote." },
  { "id": "tamanhos", "checkpoint": 2, "kind": "expr",
    "setup": "import numpy as np",
    "expr": "[len(lote) for lote in gerar_lotes(10, 4, np.random.default_rng(1))]", "expected": [4, 4, 2],
    "name": "10 exemplos em lotes de 4: tamanhos 4, 4 e 2" },
  { "id": "cobre-todos", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np\nlotes = list(gerar_lotes(37, 8, np.random.default_rng(2)))",
    "expr": "[[len(lote) for lote in lotes], sorted(np.concatenate(lotes).tolist()) == list(range(37))]", "expected": [[8, 8, 8, 8, 5], true],
    "name": "37 exemplos em lotes de 8: cada índice aparece exatamente uma vez",
    "hint": "Uma permutação tem cada índice uma vez; sorteios com reposição repetem índices." },
  { "id": "ordem-da-permutacao", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np\nlotes = list(gerar_lotes(20, 6, np.random.default_rng(3)))",
    "expr": "bool(np.array_equal(np.concatenate(lotes), np.random.default_rng(3).permutation(20)))", "expected": true,
    "name": "Os lotes, em sequência, são a permutação sorteada por rng.permutation(n)",
    "hint": "O valor diz se os lotes juntos repetem a ordem de rng.permutation(n) com o mesmo gerador." },
  { "id": "embaralha", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np\nlotes = list(gerar_lotes(20, 5, np.random.default_rng(4)))",
    "expr": "np.concatenate(lotes).tolist() != list(range(20))", "expected": true,
    "name": "A ordem não é a original 0, 1, 2, ..." },
  { "id": "duas-epocas", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np\nrng = np.random.default_rng(5)\na = np.concatenate(list(gerar_lotes(15, 4, rng)))\nb = np.concatenate(list(gerar_lotes(15, 4, rng)))",
    "expr": "[a.tolist() != b.tolist(), sorted(a.tolist()) == sorted(b.tolist()) == list(range(15))]", "expected": [true, true],
    "name": "Duas chamadas com o mesmo gerador dão ordens diferentes, cada uma com todos os índices" },
  { "id": "descartar-10-4", "checkpoint": 3, "kind": "expr",
    "setup": "import numpy as np",
    "expr": "[len(lote) for lote in gerar_lotes(10, 4, np.random.default_rng(6), descartar_ultimo=True)]", "expected": [4, 4],
    "name": "descartar_ultimo=True com 10 exemplos e lotes de 4: só os dois lotes completos",
    "hint": "O lote incompleto do fim some; os completos ficam." },
  { "id": "descartar-8-4", "checkpoint": 3, "kind": "expr",
    "setup": "import numpy as np",
    "expr": "[[len(lote) for lote in gerar_lotes(8, 4, np.random.default_rng(7), descartar_ultimo=True)], [len(lote) for lote in gerar_lotes(8, 4, np.random.default_rng(7))]]", "expected": [[4, 4], [4, 4]],
    "name": "Com 8 exemplos e lotes de 4 não há o que descartar: dois lotes nos dois modos",
    "hint": "Quando n é múltiplo do tamanho, nenhum lote completo pode sumir." },
  { "id": "lote-maior-que-n", "checkpoint": 3, "kind": "expr",
    "setup": "import numpy as np",
    "expr": "[[len(lote) for lote in gerar_lotes(3, 5, np.random.default_rng(8))], [len(lote) for lote in gerar_lotes(3, 5, np.random.default_rng(8), descartar_ultimo=True)]]", "expected": [[3], []],
    "name": "3 exemplos e lotes de 5: um lote de 3, ou nenhum com descartar_ultimo=True" },
  { "id": "indexa", "checkpoint": 2, "kind": "expr",
    "setup": "import numpy as np\nX = np.arange(12.0).reshape(6, 2)\nlote = next(gerar_lotes(6, 4, np.random.default_rng(9)))",
    "expr": "[X[lote].shape[0], str(lote.dtype)[:3]]", "expected": [4, "int"],
    "name": "Cada lote é um array de inteiros que indexa X" }
]
```

### Soluções erradas
```python name="sem embaralhar"
import numpy as np


def gerar_lotes(n, tamanho, rng, descartar_ultimo=False):
    indices = np.arange(n)
    fim = n - n % tamanho if descartar_ultimo else n
    for inicio in range(0, fim, tamanho):
        yield indices[inicio:inicio + tamanho]
```
```python name="sorteio com reposição"
import numpy as np


def gerar_lotes(n, tamanho, rng, descartar_ultimo=False):
    indices = rng.integers(0, n, size=n)
    fim = n - n % tamanho if descartar_ultimo else n
    for inicio in range(0, fim, tamanho):
        yield indices[inicio:inicio + tamanho]
```
```python name="descarta um lote completo"
import numpy as np


def gerar_lotes(n, tamanho, rng, descartar_ultimo=False):
    indices = rng.permutation(n)
    fim = n - tamanho if descartar_ultimo else n
    for inicio in range(0, fim, tamanho):
        yield indices[inicio:inicio + tamanho]
```
```python name="fim como número de lotes"
import numpy as np


def gerar_lotes(n, tamanho, rng, descartar_ultimo=False):
    indices = rng.permutation(n)
    fim = n // tamanho if descartar_ultimo else n
    for inicio in range(0, fim, tamanho):
        yield indices[inicio:inicio + tamanho]
```
```python name="descartar_ultimo ignorado"
import numpy as np


def gerar_lotes(n, tamanho, rng, descartar_ultimo=False):
    indices = rng.permutation(n)
    fim = n if descartar_ultimo else n
    for inicio in range(0, fim, tamanho):
        yield indices[inicio:inicio + tamanho]
```
```python name="fatia até tamanho, não até inicio + tamanho"
import numpy as np


def gerar_lotes(n, tamanho, rng, descartar_ultimo=False):
    indices = rng.permutation(n)
    fim = n - n % tamanho if descartar_ultimo else n
    for inicio in range(0, fim, tamanho):
        yield indices[inicio:tamanho]
```

## Passo 4 · Leitura · Ruído e tamanho do lote

Quanto ruído um mini-lote põe no gradiente? Se os gradientes dos exemplos têm variância $\sigma^2$ em torno da média, a média de $B$ deles sorteados tem variância

$$
\operatorname{Var}(g_B) \approx \frac{\sigma^2}{B}
$$

Medido no executor, na rede `[2, 32, 3]` recém-inicializada, com 300 lotes sorteados de cada tamanho, o erro quadrático médio $\lVert g_B - g \rVert^2$ do gradiente do lote contra o do conjunto inteiro:

| Lote $B$ | $\lVert g_B - g \rVert^2$ médio | vezes $B$ |
|---|---|---|
| 1 | 5,48 | 5,48 |
| 8 | 0,669 | 5,35 |
| 32 | 0,154 | 4,92 |
| 128 | 0,024 | 3,04 |

O produto pela coluna do meio fica quase constante: o ruído cai com $1/B$. (Nos lotes grandes cai um pouco mais rápido, porque eles são sorteados sem reposição de um conjunto de 300: com $B = n$ o ruído seria zero.) Quadruplicar o lote corta o ruído pela metade em desvio padrão, a $\sqrt{B}$ do Nível 4.

Com isso, o tamanho do lote é uma troca entre **quantos** passos e **quão bons**. Numa época, o custo em contas é o mesmo para qualquer $B$: cada exemplo passa uma vez pelo forward e pelo backward. O que muda é o número de passos: um lote pequeno dá muitos passos ruidosos; um grande, poucos passos precisos. Na espiral, 20 épocas com cada configuração:

| Lote | Taxa | Passos | Perda de treino | Acurácia de validação | Tempo |
|---|---|---|---|---|---|
| 300 (cheio) | 1,0 | 20 | 0,628 | 0,57 | 5 ms |
| 32 | 1,0 | 200 | 0,203 | 0,93 | 12 ms |
| 32 | 0,1 | 200 | 0,629 | 0,57 | 12 ms |
| 8 | 1,0 | 760 | 0,081 | 0,96 | 34 ms |
| 1 | 0,1 | 6 000 | 0,096 | 0,97 | 243 ms |
| 1 | 0,01 | 6 000 | 0,413 | 0,87 | 243 ms |

Repare na primeira e na terceira linhas: o lote 32 com taxa 0,1 termina exatamente onde termina o lote cheio de 300, cerca de 10 vezes maior, com taxa 1,0. O lote 1 chega ao melhor resultado, mas gasta 20 vezes o tempo do lote 32.

Na prática, a vetorização decide o resto: um `@` de uma matriz de 32 linhas custa quase o mesmo que um de uma linha, então o lote 1 gasta quase o mesmo tempo por **passo** que o lote 32 (0,04 ms contra 0,06 ms na tabela), e faz 30 vezes mais passos por época. Daí a faixa usual de 32 a 256.

E a taxa? Com lote maior o gradiente é mais confiável, e dá para andar mais por passo. A **regra de escala linear** diz: multiplicou o lote por $k$, multiplique a taxa por $k$, para manter o quanto a rede anda por época. É uma regra prática, que vale para o SGD em faixas moderadas e quebra com taxas grandes demais (a taxa 10 do passo 1 da lição anterior). Trocar o lote e manter a taxa muda o treino, e comparar os dois resultados sem ajustar a taxa compara duas coisas ao mesmo tempo.

## Passo 5 · Exercício · Treinar com lotes

O `gerar_lotes` do passo anterior já está no código, e o `rede.py` traz o MLP para você experimentar no "Executar".

### Instruções
1. `treinar_com_lotes(perda_e_grads, params, X, y, tamanho_lote, epocas, taxa, semente)` cria **um** gerador `rng = np.random.default_rng(semente)` antes das épocas.
2. Em cada época, percorre os lotes de `gerar_lotes(len(X), tamanho_lote, rng)`, todos, inclusive o último menor, e chama `perda_e_grads(params, X[lote], y[lote])` uma vez por lote.
3. Em cada passo, registra a perda do lote (a dos parâmetros antes do passo) e atualiza com arrays novos, como no laço em lote cheio.
4. Devolve `(params, historico)`, com uma perda `float` por **passo**.

### Código inicial
```python
import numpy as np


def gerar_lotes(n, tamanho, rng, descartar_ultimo=False):
    indices = rng.permutation(n)
    fim = n - n % tamanho if descartar_ultimo else n
    for inicio in range(0, fim, tamanho):
        yield indices[inicio:inicio + tamanho]


def treinar_com_lotes(perda_e_grads, params, X, y, tamanho_lote, epocas, taxa, semente):
    pass
```
```python path=rede.py
import numpy as np


def espiral(n_por_classe, classes, semente):
    rng = np.random.default_rng(semente)
    X = np.zeros((n_por_classe * classes, 2))
    y = np.repeat(np.arange(classes), n_por_classe)
    r = np.linspace(0.0, 1.0, n_por_classe)
    for c in range(classes):
        t = np.linspace(4.0 * c, 4.0 * (c + 1), n_por_classe) + rng.normal(0.0, 0.2, n_por_classe)
        X[c * n_por_classe:(c + 1) * n_por_classe] = np.column_stack([r * np.sin(t), r * np.cos(t)])
    return X, y


def inicializar(dims, semente):
    rng = np.random.default_rng(semente)
    params = []
    for d_in, d_out in zip(dims[:-1], dims[1:]):
        params.append((rng.normal(0.0, np.sqrt(2.0 / d_in), (d_in, d_out)), np.zeros(d_out)))
    return params


def prever(params, X):
    A = X
    for i, (W, b) in enumerate(params):
        A = A @ W + b
        if i < len(params) - 1:
            A = np.maximum(A, 0.0)
    return A


def perda_e_grads(params, X, y):
    n = len(y)
    entradas, pre = [], []
    A = X
    for i, (W, b) in enumerate(params):
        entradas.append(A)
        Z = A @ W + b
        pre.append(Z)
        A = np.maximum(Z, 0.0) if i < len(params) - 1 else Z
    Z = A - A.max(axis=1, keepdims=True)
    P = np.exp(Z)
    P = P / P.sum(axis=1, keepdims=True)
    perda = float(-np.log(P[np.arange(n), y]).mean())
    d = P.copy()
    d[np.arange(n), y] -= 1.0
    d = d / n
    grads = []
    for i in reversed(range(len(params))):
        if i < len(params) - 1:
            d = d * (pre[i] > 0)
        grads.append((entradas[i].T @ d, d.sum(axis=0)))
        d = d @ params[i][0].T
    return perda, grads[::-1]


def acuracia(params, X, y):
    return float((prever(params, X).argmax(axis=1) == y).mean())
```

### Solução
```python
import numpy as np


def gerar_lotes(n, tamanho, rng, descartar_ultimo=False):
    indices = rng.permutation(n)
    fim = n - n % tamanho if descartar_ultimo else n
    for inicio in range(0, fim, tamanho):
        yield indices[inicio:inicio + tamanho]


def treinar_com_lotes(perda_e_grads, params, X, y, tamanho_lote, epocas, taxa, semente):
    rng = np.random.default_rng(semente)
    historico = []
    for epoca in range(epocas):
        for lote in gerar_lotes(len(X), tamanho_lote, rng):
            perda, grads = perda_e_grads(params, X[lote], y[lote])
            historico.append(perda)
            params = [(W - taxa * dW, b - taxa * db) for (W, b), (dW, db) in zip(params, grads)]
    return params, historico
```
```python path=rede.py
import numpy as np


def espiral(n_por_classe, classes, semente):
    rng = np.random.default_rng(semente)
    X = np.zeros((n_por_classe * classes, 2))
    y = np.repeat(np.arange(classes), n_por_classe)
    r = np.linspace(0.0, 1.0, n_por_classe)
    for c in range(classes):
        t = np.linspace(4.0 * c, 4.0 * (c + 1), n_por_classe) + rng.normal(0.0, 0.2, n_por_classe)
        X[c * n_por_classe:(c + 1) * n_por_classe] = np.column_stack([r * np.sin(t), r * np.cos(t)])
    return X, y


def inicializar(dims, semente):
    rng = np.random.default_rng(semente)
    params = []
    for d_in, d_out in zip(dims[:-1], dims[1:]):
        params.append((rng.normal(0.0, np.sqrt(2.0 / d_in), (d_in, d_out)), np.zeros(d_out)))
    return params


def prever(params, X):
    A = X
    for i, (W, b) in enumerate(params):
        A = A @ W + b
        if i < len(params) - 1:
            A = np.maximum(A, 0.0)
    return A


def perda_e_grads(params, X, y):
    n = len(y)
    entradas, pre = [], []
    A = X
    for i, (W, b) in enumerate(params):
        entradas.append(A)
        Z = A @ W + b
        pre.append(Z)
        A = np.maximum(Z, 0.0) if i < len(params) - 1 else Z
    Z = A - A.max(axis=1, keepdims=True)
    P = np.exp(Z)
    P = P / P.sum(axis=1, keepdims=True)
    perda = float(-np.log(P[np.arange(n), y]).mean())
    d = P.copy()
    d[np.arange(n), y] -= 1.0
    d = d / n
    grads = []
    for i in reversed(range(len(params))):
        if i < len(params) - 1:
            d = d * (pre[i] > 0)
        grads.append((entradas[i].T @ d, d.sum(axis=0)))
        d = d @ params[i][0].T
    return perda, grads[::-1]


def acuracia(params, X, y):
    return float((prever(params, X).argmax(axis=1) == y).mean())
```

### Dicas
1. O gerador `rng` nasce fora do laço das épocas; cada chamada de `gerar_lotes` consome uma permutação nova dele.
2. Indexe `X` e `y` com o **mesmo** array de índices, para cada exemplo continuar com o seu rótulo.
3. O histórico ganha um valor por lote, então tem `epocas` vezes o número de lotes por época.

### Verificação
```json
[
  { "id": "passos", "checkpoint": 2, "kind": "expr",
    "setup": "import numpy as np\nfrom rede import espiral, inicializar, perda_e_grads\nX, y = espiral(20, 3, 0)\nparams, historico = treinar_com_lotes(perda_e_grads, inicializar([2, 8, 3], 0), X, y, 16, 3, 0.5, 1)",
    "expr": "[len(historico), all(type(p).__name__ == 'float' for p in historico)]", "expected": [12, true],
    "name": "60 exemplos em lotes de 16, 3 épocas: 12 perdas float, uma por passo",
    "hint": "Cada época tem 4 lotes: três de 16 e um de 12." },
  { "id": "referencia", "checkpoint": 3, "kind": "expr",
    "setup": "import numpy as np\nfrom rede import espiral, inicializar, perda_e_grads\ndef _ref(params, X, y, B, epocas, taxa, semente):\n    r = np.random.default_rng(semente)\n    h = []\n    for _ in range(epocas):\n        ordem = r.permutation(len(X))\n        for k in range(-(-len(X) // B)):\n            idx = ordem[k * B:(k + 1) * B]\n            perda, grads = perda_e_grads(params, X[idx], y[idx])\n            h.append(perda)\n            params = [(W - taxa * gW, b - taxa * gb) for (W, b), (gW, gb) in zip(params, grads)]\n    return params, h\nX, y = espiral(20, 3, 0)\nparams, historico = treinar_com_lotes(perda_e_grads, inicializar([2, 8, 3], 0), X, y, 16, 3, 0.5, 4)\np_ref, h_ref = _ref(inicializar([2, 8, 3], 0), X, y, 16, 3, 0.5, 4)",
    "expr": "[len(historico) == len(h_ref) and bool(np.allclose(historico, h_ref, atol=1e-12)), all(np.allclose(a, c, atol=1e-12) for p, q in zip(params, p_ref) for a, c in zip(p, q))]", "expected": [true, true],
    "name": "Histórico e parâmetros finais iguais aos de uma implementação de referência",
    "hint": "A lista diz se o histórico e se os parâmetros finais batem com uma referência que usa um gerador criado uma vez e uma permutação por época." },
  { "id": "lotes-alinhados", "checkpoint": 2, "kind": "expr",
    "setup": "import numpy as np\nX = np.column_stack([np.arange(30.0), np.zeros(30)])\ny = np.arange(30) % 3\nlotes, alinhados = [], []\ndef _espia(params, Xl, yl):\n    lotes.append(Xl[:, 0].astype(int).tolist())\n    alinhados.append(bool(np.all(yl == Xl[:, 0].astype(int) % 3)))\n    return 0.0, [(np.zeros_like(W), np.zeros_like(b)) for W, b in params]\ntreinar_com_lotes(_espia, [(np.zeros((2, 3)), np.zeros(3))], X, y, 8, 2, 0.1, 0)",
    "expr": "[all(alinhados), [len(lote) for lote in lotes], sorted(sum(lotes[:4], [])) == list(range(30)), sorted(sum(lotes[4:], [])) == list(range(30))]", "expected": [true, [8, 8, 8, 6, 8, 8, 8, 6], true, true],
    "name": "Cada lote traz X e y dos mesmos exemplos, e cada época passa por todos os 30 uma vez",
    "hint": "A lista diz se X e y ficaram alinhados, os tamanhos dos lotes e se cada época cobriu todos os exemplos." },
  { "id": "epocas-diferentes", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np\nX = np.column_stack([np.arange(30.0), np.zeros(30)])\ny = np.arange(30) % 3\nlotes = []\ndef _espia(params, Xl, yl):\n    lotes.append(Xl[:, 0].astype(int).tolist())\n    return 0.0, [(np.zeros_like(W), np.zeros_like(b)) for W, b in params]\ntreinar_com_lotes(_espia, [(np.zeros((2, 3)), np.zeros(3))], X, y, 8, 3, 0.1, 0)",
    "expr": "[sum(lotes[:4], []) != sum(lotes[4:8], []), sum(lotes[4:8], []) != sum(lotes[8:], []), sum(lotes[:4], []) != list(range(30))]", "expected": [true, true, true],
    "name": "Cada época tem uma ordem diferente, e nenhuma é a ordem original",
    "hint": "Crie o gerador uma vez, antes das épocas: recriado com a mesma semente, ele repete a ordem." },
  { "id": "mesma-semente", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np\nfrom rede import espiral, inicializar, perda_e_grads\nX, y = espiral(20, 3, 0)\nh1 = treinar_com_lotes(perda_e_grads, inicializar([2, 8, 3], 0), X, y, 8, 2, 0.5, 11)[1]\nh2 = treinar_com_lotes(perda_e_grads, inicializar([2, 8, 3], 0), X, y, 8, 2, 0.5, 11)[1]\nh3 = treinar_com_lotes(perda_e_grads, inicializar([2, 8, 3], 0), X, y, 8, 2, 0.5, 12)[1]",
    "expr": "[h1 == h2, h1 != h3]", "expected": [true, true],
    "name": "A mesma semente repete o treino; outra semente dá outro histórico",
    "hint": "Use default_rng(semente), e não um gerador sem semente." },
  { "id": "perda-cai", "checkpoint": 3, "kind": "expr",
    "setup": "import numpy as np\nfrom rede import espiral, inicializar, perda_e_grads\nX, y = espiral(100, 3, 0)\nparams, h = treinar_com_lotes(perda_e_grads, inicializar([2, 32, 3], 0), X, y, 32, 20, 0.5, 0)",
    "expr": "[len(h), bool(np.mean(h[-10:]) < 0.6 * np.mean(h[:10]))]", "expected": [200, true],
    "name": "Espiral, lote 32, 20 épocas: a perda média da última época fica abaixo de 60 % da primeira" },
  { "id": "params-intactos", "checkpoint": 3, "kind": "expr",
    "setup": "import numpy as np\nfrom rede import espiral, inicializar, perda_e_grads\nX, y = espiral(10, 3, 0)\nparams0 = inicializar([2, 4, 3], 0)\ncopias = [(W.copy(), b.copy()) for W, b in params0]\ntreinar_com_lotes(perda_e_grads, params0, X, y, 8, 2, 0.5, 0)",
    "expr": "all(np.array_equal(W, W0) and np.array_equal(b, b0) for (W, b), (W0, b0) in zip(params0, copias))", "expected": true,
    "name": "Os arrays de params recebidos não mudam" },
  { "id": "zero-epocas", "checkpoint": 4, "kind": "expr",
    "setup": "import numpy as np\nparams, h = treinar_com_lotes(lambda p, X, y: (0.0, p), [(np.ones((2, 2)), np.zeros(2))], np.zeros((5, 2)), np.zeros(5, dtype=int), 2, 0, 0.1, 0)",
    "expr": "[type(h).__name__, h, params[0][0].tolist()]", "expected": ["list", [], [[1.0, 1.0], [1.0, 1.0]]],
    "name": "Com 0 épocas, histórico vazio e parâmetros do início" }
]
```

### Soluções erradas
```python name="sem embaralhar"
import numpy as np


def gerar_lotes(n, tamanho, rng, descartar_ultimo=False):
    indices = rng.permutation(n)
    fim = n - n % tamanho if descartar_ultimo else n
    for inicio in range(0, fim, tamanho):
        yield indices[inicio:inicio + tamanho]


def treinar_com_lotes(perda_e_grads, params, X, y, tamanho_lote, epocas, taxa, semente):
    historico = []
    for epoca in range(epocas):
        for inicio in range(0, len(X), tamanho_lote):
            lote = np.arange(inicio, min(inicio + tamanho_lote, len(X)))
            perda, grads = perda_e_grads(params, X[lote], y[lote])
            historico.append(perda)
            params = [(W - taxa * dW, b - taxa * db) for (W, b), (dW, db) in zip(params, grads)]
    return params, historico
```
```python name="embaralha X e y separadamente"
import numpy as np


def gerar_lotes(n, tamanho, rng, descartar_ultimo=False):
    indices = rng.permutation(n)
    fim = n - n % tamanho if descartar_ultimo else n
    for inicio in range(0, fim, tamanho):
        yield indices[inicio:inicio + tamanho]


def treinar_com_lotes(perda_e_grads, params, X, y, tamanho_lote, epocas, taxa, semente):
    rng = np.random.default_rng(semente)
    historico = []
    for epoca in range(epocas):
        Xe = X[rng.permutation(len(X))]
        ye = y[rng.permutation(len(y))]
        for inicio in range(0, len(X), tamanho_lote):
            perda, grads = perda_e_grads(params, Xe[inicio:inicio + tamanho_lote], ye[inicio:inicio + tamanho_lote])
            historico.append(perda)
            params = [(W - taxa * dW, b - taxa * db) for (W, b), (dW, db) in zip(params, grads)]
    return params, historico
```
```python name="perde o último lote menor"
import numpy as np


def gerar_lotes(n, tamanho, rng, descartar_ultimo=False):
    indices = rng.permutation(n)
    fim = n - n % tamanho if descartar_ultimo else n
    for inicio in range(0, fim, tamanho):
        yield indices[inicio:inicio + tamanho]


def treinar_com_lotes(perda_e_grads, params, X, y, tamanho_lote, epocas, taxa, semente):
    rng = np.random.default_rng(semente)
    historico = []
    for epoca in range(epocas):
        for lote in gerar_lotes(len(X), tamanho_lote, rng, descartar_ultimo=True):
            perda, grads = perda_e_grads(params, X[lote], y[lote])
            historico.append(perda)
            params = [(W - taxa * dW, b - taxa * db) for (W, b), (dW, db) in zip(params, grads)]
    return params, historico
```
```python name="gerador recriado a cada época"
import numpy as np


def gerar_lotes(n, tamanho, rng, descartar_ultimo=False):
    indices = rng.permutation(n)
    fim = n - n % tamanho if descartar_ultimo else n
    for inicio in range(0, fim, tamanho):
        yield indices[inicio:inicio + tamanho]


def treinar_com_lotes(perda_e_grads, params, X, y, tamanho_lote, epocas, taxa, semente):
    historico = []
    for epoca in range(epocas):
        rng = np.random.default_rng(semente)
        for lote in gerar_lotes(len(X), tamanho_lote, rng):
            perda, grads = perda_e_grads(params, X[lote], y[lote])
            historico.append(perda)
            params = [(W - taxa * dW, b - taxa * db) for (W, b), (dW, db) in zip(params, grads)]
    return params, historico
```
```python name="gerador sem semente"
import numpy as np


def gerar_lotes(n, tamanho, rng, descartar_ultimo=False):
    indices = rng.permutation(n)
    fim = n - n % tamanho if descartar_ultimo else n
    for inicio in range(0, fim, tamanho):
        yield indices[inicio:inicio + tamanho]


def treinar_com_lotes(perda_e_grads, params, X, y, tamanho_lote, epocas, taxa, semente):
    rng = np.random.default_rng()
    historico = []
    for epoca in range(epocas):
        for lote in gerar_lotes(len(X), tamanho_lote, rng):
            perda, grads = perda_e_grads(params, X[lote], y[lote])
            historico.append(perda)
            params = [(W - taxa * dW, b - taxa * db) for (W, b), (dW, db) in zip(params, grads)]
    return params, historico
```
```python name="registra a perda do conjunto inteiro"
import numpy as np


def gerar_lotes(n, tamanho, rng, descartar_ultimo=False):
    indices = rng.permutation(n)
    fim = n - n % tamanho if descartar_ultimo else n
    for inicio in range(0, fim, tamanho):
        yield indices[inicio:inicio + tamanho]


def treinar_com_lotes(perda_e_grads, params, X, y, tamanho_lote, epocas, taxa, semente):
    rng = np.random.default_rng(semente)
    historico = []
    for epoca in range(epocas):
        for lote in gerar_lotes(len(X), tamanho_lote, rng):
            perda, grads = perda_e_grads(params, X[lote], y[lote])
            historico.append(perda_e_grads(params, X, y)[0])
            params = [(W - taxa * dW, b - taxa * db) for (W, b), (dW, db) in zip(params, grads)]
    return params, historico
```

## Passo 6 · Leitura · Curvas ruidosas

Com mini-lotes, o histórico tem uma perda por **passo**, e cada uma é a perda de um lote diferente: uns lotes são fáceis, outros difíceis. A curva sobe e desce mesmo quando o treino vai bem, e olhar o último valor para decidir alguma coisa é olhar o ruído. Medido na espiral com lote 8 e taxa 1,0: na última de 20 épocas, as perdas dos lotes vão de 0,005 a 0,389, e a perda sobe de um passo para o seguinte em 374 dos 759 passos, quase a metade, enquanto a média por época cai de 0,79 na primeira para 0,19 nas últimas.

Há duas formas comuns de ler essa curva. A **média móvel** de janela $j$ troca cada ponto pela média dos $j$ últimos:

$$
s_t = \frac{1}{j} \sum_{i = t - j + 1}^{t} L_i, \qquad t = j - 1, \dots, T - 1
$$

Com $T$ perdas, só existem $T - j + 1$ janelas **completas**. Preencher o começo com janelas menores (a média dos 2 primeiros, dos 3 primeiros…) parece inofensivo, mas mistura médias de tamanhos diferentes na mesma curva, e os primeiros pontos ficam mais ruidosos que os outros. As bibliotecas costumam deixar essa escolha explícita: `np.convolve(h, np.ones(j) / j, mode="valid")` devolve só as completas, e o modo `"same"` devolve uma por ponto, com as bordas distorcidas.

```python
h = [4.0, 0.0, 2.0, 6.0]
# janela 3: (4 + 0 + 2) / 3 = 2.0 e (0 + 2 + 6) / 3 = 2.667
```

A **média por época** junta os passos de cada época num número só, o que torna curvas com lotes diferentes comparáveis: com lote 8 a época tem 38 passos, com lote 64 tem 5, mas as duas têm uma média por época. Se o histórico termina no meio de uma época (o treino parou antes), o último grupo é menor, e a média dele divide pelo número de passos que ele **tem**, não pelo de uma época cheia.

$$
\bar L_e = \frac{1}{|P_e|} \sum_{t \in P_e} L_t
$$

A média por época também é a perda de treino que costuma aparecer ao lado da de validação. Ela é um pouco otimista nas primeiras épocas, porque mistura perdas de parâmetros diferentes (os do começo e os do fim da época), mas sai de graça, sem um forward extra no conjunto inteiro.

## Passo 7 · Exercício · Suavizar e resumir

As duas funções recebem e devolvem listas de números do Python.

### Instruções
1. `suavizar(historico, janela)` devolve a lista das médias de todas as janelas **completas** de `janela` valores consecutivos, em ordem: `len(historico) - janela + 1` médias (nenhuma, se a janela for maior que o histórico).
2. Cada média é um `float`.
3. `media_por_epoca(historico, passos_por_epoca)` devolve a média de cada grupo consecutivo de `passos_por_epoca` valores; um grupo incompleto no fim também vira uma média, dividida pelo número de valores que ele tem.

### Código inicial
```python
def suavizar(historico, janela):
    pass


def media_por_epoca(historico, passos_por_epoca):
    pass
```

### Solução
```python
def suavizar(historico, janela):
    return [sum(historico[i:i + janela]) / janela for i in range(len(historico) - janela + 1)]


def media_por_epoca(historico, passos_por_epoca):
    grupos = [historico[i:i + passos_por_epoca] for i in range(0, len(historico), passos_por_epoca)]
    return [sum(grupo) / len(grupo) for grupo in grupos]
```

### Dicas
1. A janela que começa na posição `i` é `historico[i:i + janela]`; a última começa em `len(historico) - janela`.
2. Para grupos sem sobreposição, os começos andam de `passos_por_epoca` em `passos_por_epoca`.
3. Divida a soma de cada grupo pelo tamanho dele, `len(grupo)`.

### Verificação
```json
[
  { "id": "suavizar-2", "checkpoint": 1, "kind": "call", "function": "suavizar", "args": [[1.0, 2.0, 3.0, 4.0, 5.0], 2], "expected": [1.5, 2.5, 3.5, 4.5], "tolerance": 1e-12,
    "name": "suavizar([1, 2, 3, 4, 5], 2) tem 4 médias" },
  { "id": "suavizar-3", "checkpoint": 1, "kind": "call", "function": "suavizar", "args": [[4.0, 0.0, 2.0, 6.0], 3], "expected": [2.0, 2.6666666666666665], "tolerance": 1e-12,
    "name": "suavizar([4, 0, 2, 6], 3): só as duas janelas completas",
    "hint": "Janelas no começo com menos de 3 valores não entram." },
  { "id": "suavizar-1", "checkpoint": 2, "kind": "call", "function": "suavizar", "args": [[3, 1, 2], 1], "expected": [3.0, 1.0, 2.0], "type": "list", "tolerance": 1e-12,
    "name": "Janela 1 devolve os próprios valores, como lista" },
  { "id": "suavizar-tudo", "checkpoint": 1, "kind": "call", "function": "suavizar", "args": [[2.0, 4.0, 9.0], 3], "expected": [5.0], "tolerance": 1e-12,
    "name": "Janela do tamanho do histórico: uma média só",
    "hint": "A última janela começa em len(historico) - janela." },
  { "id": "suavizar-grande", "checkpoint": 1, "kind": "call", "function": "suavizar", "args": [[2.0, 4.0], 3], "expected": [],
    "name": "Janela maior que o histórico: lista vazia" },
  { "id": "suavizar-tipo", "checkpoint": 2, "kind": "expr",
    "expr": "[type(v).__name__ for v in suavizar([1, 2, 3, 4], 2)]", "expected": ["float", "float", "float"],
    "name": "As médias são floats do Python" },
  { "id": "epoca-cheia", "checkpoint": 3, "kind": "call", "function": "media_por_epoca", "args": [[1.0, 3.0, 2.0, 4.0, 6.0, 8.0], 2], "expected": [2.0, 3.0, 7.0], "tolerance": 1e-12,
    "name": "6 passos com 2 por época: 3 médias, sem sobreposição",
    "hint": "Os grupos não se sobrepõem: os começos andam de passos_por_epoca em passos_por_epoca." },
  { "id": "epoca-incompleta", "checkpoint": 3, "kind": "call", "function": "media_por_epoca", "args": [[1.0, 2.0, 3.0, 4.0, 5.0], 2], "expected": [1.5, 3.5, 5.0], "tolerance": 1e-12,
    "name": "5 passos com 2 por época: o último grupo, de 1 valor, também conta",
    "hint": "O grupo incompleto do fim divide pelo número de valores que ele tem." },
  { "id": "epoca-incompleta-3", "checkpoint": 3, "kind": "call", "function": "media_por_epoca", "args": [[3.0, 6.0, 9.0, 1.0, 2.0], 3], "expected": [6.0, 1.5], "tolerance": 1e-12,
    "name": "5 passos com 3 por época: médias 6,0 e 1,5" },
  { "id": "epoca-um-passo", "checkpoint": 3, "kind": "call", "function": "media_por_epoca", "args": [[0.5, 0.25], 1], "expected": [0.5, 0.25], "tolerance": 1e-12,
    "name": "Um passo por época: os próprios valores" }
]
```

### Soluções erradas
```python name="janelas incompletas no começo"
def suavizar(historico, janela):
    return [sum(historico[max(0, i - janela + 1):i + 1]) / len(historico[max(0, i - janela + 1):i + 1]) for i in range(len(historico))]


def media_por_epoca(historico, passos_por_epoca):
    grupos = [historico[i:i + passos_por_epoca] for i in range(0, len(historico), passos_por_epoca)]
    return [sum(grupo) / len(grupo) for grupo in grupos]
```
```python name="perde a última janela"
def suavizar(historico, janela):
    return [sum(historico[i:i + janela]) / janela for i in range(len(historico) - janela)]


def media_por_epoca(historico, passos_por_epoca):
    grupos = [historico[i:i + passos_por_epoca] for i in range(0, len(historico), passos_por_epoca)]
    return [sum(grupo) / len(grupo) for grupo in grupos]
```
```python name="divide as janelas do fim pelo tamanho cheio"
def suavizar(historico, janela):
    return [sum(historico[i:i + janela]) / janela for i in range(len(historico))]


def media_por_epoca(historico, passos_por_epoca):
    grupos = [historico[i:i + passos_por_epoca] for i in range(0, len(historico), passos_por_epoca)]
    return [sum(grupo) / len(grupo) for grupo in grupos]
```
```python name="descarta a época incompleta"
def suavizar(historico, janela):
    return [sum(historico[i:i + janela]) / janela for i in range(len(historico) - janela + 1)]


def media_por_epoca(historico, passos_por_epoca):
    grupos = [historico[i:i + passos_por_epoca] for i in range(0, len(historico) - passos_por_epoca + 1, passos_por_epoca)]
    return [sum(grupo) / len(grupo) for grupo in grupos]
```
```python name="média por época com janela deslizante"
def suavizar(historico, janela):
    return [sum(historico[i:i + janela]) / janela for i in range(len(historico) - janela + 1)]


def media_por_epoca(historico, passos_por_epoca):
    return suavizar(historico, passos_por_epoca)
```
```python name="época incompleta dividida pelo tamanho cheio"
def suavizar(historico, janela):
    return [sum(historico[i:i + janela]) / janela for i in range(len(historico) - janela + 1)]


def media_por_epoca(historico, passos_por_epoca):
    grupos = [historico[i:i + passos_por_epoca] for i in range(0, len(historico), passos_por_epoca)]
    return [sum(grupo) / passos_por_epoca for grupo in grupos]
```

## Passo 8 · Quiz · Época e passo

### Pergunta
Um treino tem 1 000 exemplos, lote 64, sem descartar o último lote, e roda 10 épocas. Quantas atualizações dos parâmetros ele faz?
- [ ] 156, porque 1 000 / 64 = 15,6 lotes por época
- [x] 160: são $\lceil 1000 / 64 \rceil = 16$ lotes por época, o último com 40 exemplos
- [ ] 10, uma por época
- [ ] 640, um passo para cada exemplo de cada lote
> Cada lote dá um passo, e uma época tem 15 lotes de 64 e mais um de 40: 16 passos, 160 em 10 épocas. 156 trata a fração de lote como uma fração de passo, que não existe; seriam 150 se o lote incompleto fosse descartado. Um passo por época é a descida em lote cheio. Um passo por exemplo é o SGD de lote 1, e daria 10 000.

### Pergunta
Um treino com lote 32 e taxa 0,05 funciona bem. Para usar melhor o hardware, alguém passa para lote 256 e mantém a taxa. Depois das mesmas 20 épocas, a perda de treino ficou bem mais alta. Qual é a explicação mais provável?
- [ ] Lotes grandes dão gradientes piores, e por isso a rede aprende menos
- [x] Com lote 8 vezes maior há 8 vezes menos passos por época; sem aumentar a taxa, a rede andou muito menos no total
- [ ] O lote 256 não cabe na memória e parte dos exemplos foi ignorada
- [ ] A perda de treino de lotes grandes é calculada de outro jeito
> Lotes maiores dão gradientes **menos** ruidosos ($\operatorname{Var} \propto 1/B$), mas cada época passa a ter 8 vezes menos atualizações. Com a mesma taxa, a rede anda muito menos em 20 épocas. A regra de escala linear sugere multiplicar a taxa por 8 (0,4), conferindo na validação. Nada é ignorado nem calculado de outro jeito: a perda continua sendo a média do lote.

### Pergunta
Os dados de treino estão ordenados por classe: primeiro todos os exemplos da classe 0, depois os da 1, depois os da 2. O laço corta os lotes em ordem, sem embaralhar. O que se espera ver?
- [ ] O mesmo treino de sempre, porque cada época passa por todos os exemplos
- [ ] Um treino mais estável, porque cada lote é homogêneo
- [x] Uma perda que oscila conforme a classe do lote, e uma rede que tende a prever a classe dos últimos lotes da época
- [ ] Um erro do numpy, porque os lotes têm uma classe só
> Cada lote empurra a rede para "tudo é desta classe", e o lote seguinte, de outra classe, empurra para outro lado: a perda por passo oscila em ondas, e no fim de cada época a rede fica puxada para a classe que veio por último. Passar por todos os exemplos na época não basta; a ordem dentro dela importa. Nenhum erro aparece: a conta funciona com qualquer lote. É por isso que o embaralhamento é por época, com uma permutação nova a cada vez.
