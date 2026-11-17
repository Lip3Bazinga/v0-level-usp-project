---
slug: n6-m4-02-classificador-de-digitos
titulo: Um classificador de dígitos em numpy
descricao: 'Treinar o MLP nos dígitos 8×8 gerados: preparação, normalização, treino com Adam e mini-batches, acurácia de validação acima de 95 % e análise de erros.'
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
- Preparar o conjunto de dígitos (divisão, normalização, rótulos) e treinar o MLP com Adam
- Atingir acurácia de validação acima de 95 % e analisar a matriz de confusão
- Visualizar pesos da primeira camada e exemplos mal classificados
---

## Passo 1 · Leitura · Dígitos 8 × 8 gerados

O MLP da lição anterior passou na checagem numérica. Agora ele vai aprender uma tarefa de verdade: reconhecer dígitos desenhados numa grade de 8 × 8 pixels. Os conjuntos clássicos desse tamanho vêm em bibliotecas que não existem aqui, então o curso gera os próprios dados, no arquivo `digitos.py`.

O arquivo guarda dez desenhos escritos em texto, um por dígito, com `#` para pixel aceso e `.` para apagado. A função `gerar_digitos(n_por_classe, semente)` copia cada desenho `n_por_classe` vezes e estraga cada cópia de dois jeitos: desloca a imagem de $-1$ a $1$ pixel em cada eixo e soma um ruído normal de desvio 0,3, cortando o resultado em $[0, 1]$. Sai `X` de forma `(n, 64)`, uma imagem achatada por linha, e `y` com os rótulos inteiros de 0 a 9.

```python
from digitos import gerar_digitos

X_treino, y_treino = gerar_digitos(100, 1)   # (1000, 64), sementes diferentes
X_val, y_val = gerar_digitos(30, 2)          # (300, 64)
```

Os rótulos precisam ser **inteiros**, porque a entropia cruzada os usa como índice. Com rótulos `float`, a primeira chamada para em:

```text
IndexError: arrays used as indices must be of integer (or boolean) type
```

Antes de treinar, cada pixel é **padronizado**: subtrai-se a média e divide-se pelo desvio padrão daquele pixel,

$$
x'_{j} = \frac{x_{j} - \mu_{j}}{\sigma_{j}}
$$

Um pixel que nunca muda tem $\sigma_j = 0$, e a divisão daria `nan` em silêncio; a saída é trocar esse desvio por 1. A regra que não se quebra: $\mu$ e $\sigma$ saem **só do treino**, e os mesmos números são aplicados à validação. A validação faz o papel dos dados que chegam depois, um de cada vez, e uma imagem sozinha não tem média por pixel.

A escala pesa mais do que parece. Medido nesta lição, com a mesma rede e dez épocas: padronizado, a acurácia de validação chega a 0,97; com os mesmos pixels na escala de 0 a 255, como vêm dos arquivos de imagem, e sem padronizar, a perda estaciona em 1,88 e a acurácia fica em 0,22. Entradas enormes produzem logits enormes, e os primeiros passos do treino levam os pesos para longe de onde deveriam estar.

## Passo 2 · Previsão · Um dígito em texto

O programa monta o desenho do 3 como uma matriz 8 × 8, desloca a imagem uma linha para baixo com `np.roll` e imprime o resultado. Leia sem executar e digite o que ele imprime.

### Código
```python
import numpy as np

desenho = ".#####.. .....##. .....##. ..####.. .....##. .....##. .....##. .#####.."
imagem = np.array([[1.0 if c == "#" else 0.0 for c in linha] for linha in desenho.split()])
print(imagem.shape)
print(int(imagem.sum()))
deslocada = np.roll(imagem, 1, axis=0)
for linha in deslocada:
    print("".join("#" if v == 1.0 else "." for v in linha))
```

### Dicas
1. `desenho.split()` devolve as 8 linhas do desenho, de cima para baixo.
2. Conte os `#`: duas linhas têm 5, uma tem 4 e cinco têm 2.
3. `np.roll` no eixo 0 empurra as linhas para baixo, e a última volta por cima.

### Saída esperada
```text
(8, 8)
24
.#####..
.#####..
.....##.
.....##.
..####..
.....##.
.....##.
.....##.
```

## Passo 3 · Exercício · Preparar os dados
modo: lacunas

Complete as lacunas (`___`) de `preparar`, que padroniza o treino e a validação. `X_treino` e `X_val` têm uma imagem por linha e um pixel por coluna.

### Instruções
1. `media` é a média de cada pixel (coluna) calculada **só no treino**.
2. `desvio` é o desvio padrão de cada pixel no treino; onde ele for zero, passa a valer 1.
3. A função devolve `(treino, validacao, media, desvio)`: os dois conjuntos padronizados com a média e o desvio **do treino**, sem alterar os arrays recebidos.

### Código inicial
```python
import numpy as np


def preparar(X_treino, X_val):
    media = ___
    desvio = ___
    desvio = np.where(___, 1.0, desvio)
    return (X_treino - media) / desvio, (___) / desvio, media, desvio
```

### Solução
```python
import numpy as np


def preparar(X_treino, X_val):
    media = X_treino.mean(axis=0)
    desvio = X_treino.std(axis=0)
    desvio = np.where(desvio == 0, 1.0, desvio)
    return (X_treino - media) / desvio, (X_val - media) / desvio, media, desvio
```

### Dicas
1. Uma estatística por pixel percorre os exemplos: o eixo é o 0.
2. `np.where(condicao, 1.0, desvio)` troca só as posições em que a condição vale.
3. A validação não entra em nenhuma média: ela só recebe os números do treino.

### Verificação
```json
[
  {"id": "media-valores", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nX_treino = np.array([[0.0, 10.0, 5.0], [2.0, 10.0, 5.0], [0.0, 30.0, 5.0], [2.0, 30.0, 5.0]])\nX_val = np.array([[3.0, 40.0, 5.0], [1.0, 20.0, 7.0]])\nT, V, media, desvio = preparar(X_treino, X_val)", "expr": "media.tolist()", "expected": [1.0, 20.0, 5.0], "tolerance": 1e-12, "name": "A média de cada coluna do treino", "hint": "Uma média por pixel: a conta percorre os exemplos (eixo 0)."},
  {"id": "desvio-valores", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nX_treino = np.array([[0.0, 10.0, 5.0], [2.0, 10.0, 5.0], [0.0, 30.0, 5.0], [2.0, 30.0, 5.0]])\nX_val = np.array([[3.0, 40.0, 5.0], [1.0, 20.0, 7.0]])\nT, V, media, desvio = preparar(X_treino, X_val)", "expr": "desvio[:2].tolist()", "expected": [1.0, 10.0], "tolerance": 1e-12, "name": "O desvio padrão de cada coluna do treino (dividindo por n)", "hint": "Use o desvio padrão do numpy sem mudar o `ddof`."},
  {"id": "desvio-zero", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nX_treino = np.array([[0.0, 10.0, 5.0], [2.0, 10.0, 5.0], [0.0, 30.0, 5.0], [2.0, 30.0, 5.0]])\nX_val = np.array([[3.0, 40.0, 5.0], [1.0, 20.0, 7.0]])\nT, V, media, desvio = preparar(X_treino, X_val)", "expr": "[float(desvio[2]), T[:, 2].tolist()]", "expected": [1.0, [0.0, 0.0, 0.0, 0.0]], "tolerance": 1e-12, "name": "Uma coluna constante fica com desvio 1 e vira zeros, sem nan", "hint": "Onde o desvio é zero, troque-o por 1 antes de dividir."},
  {"id": "treino-valores", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nX_treino = np.array([[0.0, 10.0, 5.0], [2.0, 10.0, 5.0], [0.0, 30.0, 5.0], [2.0, 30.0, 5.0]])\nX_val = np.array([[3.0, 40.0, 5.0], [1.0, 20.0, 7.0]])\nT, V, media, desvio = preparar(X_treino, X_val)", "expr": "T.tolist()", "expected": [[-1.0, -1.0, 0.0], [1.0, -1.0, 0.0], [-1.0, 1.0, 0.0], [1.0, 1.0, 0.0]], "tolerance": 1e-12, "name": "O treino padronizado, número a número"},
  {"id": "validacao-valores", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nX_treino = np.array([[0.0, 10.0, 5.0], [2.0, 10.0, 5.0], [0.0, 30.0, 5.0], [2.0, 30.0, 5.0]])\nX_val = np.array([[3.0, 40.0, 5.0], [1.0, 20.0, 7.0]])\nT, V, media, desvio = preparar(X_treino, X_val)", "expr": "V.tolist()", "expected": [[2.0, 2.0, 0.0], [0.0, 0.0, 2.0]], "tolerance": 1e-12, "name": "A validação padronizada com a média e o desvio do treino", "hint": "A validação usa os mesmos números calculados no treino."},
  {"id": "validacao-de-uma-linha", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nX_treino = np.array([[0.0, 10.0], [2.0, 10.0], [0.0, 30.0], [2.0, 30.0]])\nT, V, media, desvio = preparar(X_treino, np.array([[5.0, 0.0]]))", "expr": "V.tolist()", "expected": [[4.0, -2.0]], "tolerance": 1e-12, "name": "Uma validação com um exemplo só é padronizada pelas estatísticas do treino", "hint": "Uma imagem sozinha não tem média própria que sirva."},
  {"id": "estatisticas-do-treino", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nr = np.random.default_rng(3)\nX_treino = r.uniform(0, 255, size=(200, 64))\nT, V, media, desvio = preparar(X_treino, r.uniform(0, 255, size=(50, 64)))", "expr": "[bool(np.allclose(T.mean(axis=0), 0.0, atol=1e-10)), bool(np.allclose(T.std(axis=0), 1.0, atol=1e-10))]", "expected": [true, true], "name": "Depois de padronizado, cada pixel do treino tem média 0 e desvio 1", "hint": "A lista diz se as médias e se os desvios por pixel ficaram certos."},
  {"id": "validacao-diferente-do-treino", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nr = np.random.default_rng(4)\nX_treino = r.normal(0.0, 1.0, size=(400, 5))\nX_val = r.normal(3.0, 1.0, size=(400, 5))\nT, V, media, desvio = preparar(X_treino, X_val)", "expr": "bool(np.all(V.mean(axis=0) > 2.0))", "expected": true, "name": "Uma validação deslocada em relação ao treino continua deslocada depois de padronizada", "hint": "Se a validação for centralizada pela própria média, o deslocamento some."},
  {"id": "formas", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nr = np.random.default_rng(5)\nsaida = preparar(r.random((50, 64)), r.random((20, 64)))", "expr": "[type(saida).__name__, [list(a.shape) for a in saida]]", "expected": ["tuple", [[50, 64], [20, 64], [64], [64]]], "name": "Devolve (treino, validação, média, desvio) com as formas (50, 64), (20, 64), (64,) e (64,)"},
  {"id": "entradas-intactas", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nr = np.random.default_rng(6)\nA, B = r.random((10, 4)), r.random((6, 4))\nA0, B0 = A.copy(), B.copy()\npreparar(A, B)", "expr": "[bool(np.array_equal(A, A0)), bool(np.array_equal(B, B0))]", "expected": [true, true], "name": "Os arrays recebidos não mudam"}
]
```

### Soluções erradas
```python name="validação com a média dela"
import numpy as np


def preparar(X_treino, X_val):
    media = X_treino.mean(axis=0)
    desvio = X_treino.std(axis=0)
    desvio = np.where(desvio == 0, 1.0, desvio)
    return (X_treino - media) / desvio, (X_val - X_val.mean(axis=0)) / desvio, media, desvio
```
```python name="média de todos os números (sem axis)"
import numpy as np


def preparar(X_treino, X_val):
    media = X_treino.mean()
    desvio = X_treino.std(axis=0)
    desvio = np.where(desvio == 0, 1.0, desvio)
    return (X_treino - media) / desvio, (X_val - media) / desvio, media, desvio
```
```python name="média por imagem (axis=1)"
import numpy as np


def preparar(X_treino, X_val):
    media = X_treino.mean(axis=1)
    desvio = X_treino.std(axis=0)
    desvio = np.where(desvio == 0, 1.0, desvio)
    return (X_treino - media) / desvio, (X_val - media) / desvio, media, desvio
```
```python name="desvio zero não tratado"
import numpy as np


def preparar(X_treino, X_val):
    media = X_treino.mean(axis=0)
    desvio = X_treino.std(axis=0)
    desvio = np.where(desvio < 0, 1.0, desvio)
    return (X_treino - media) / desvio, (X_val - media) / desvio, media, desvio
```
```python name="desvio amostral (ddof=1)"
import numpy as np


def preparar(X_treino, X_val):
    media = X_treino.mean(axis=0)
    desvio = X_treino.std(axis=0, ddof=1)
    desvio = np.where(desvio == 0, 1.0, desvio)
    return (X_treino - media) / desvio, (X_val - media) / desvio, media, desvio
```
```python name="média do treino e da validação juntos"
import numpy as np


def preparar(X_treino, X_val):
    media = np.vstack([X_treino, X_val]).mean(axis=0)
    desvio = X_treino.std(axis=0)
    desvio = np.where(desvio == 0, 1.0, desvio)
    return (X_treino - media) / desvio, (X_val - media) / desvio, media, desvio
```
```python name="validação sem centralizar"
import numpy as np


def preparar(X_treino, X_val):
    media = X_treino.mean(axis=0)
    desvio = X_treino.std(axis=0)
    desvio = np.where(desvio == 0, 1.0, desvio)
    return (X_treino - media) / desvio, (X_val) / desvio, media, desvio
```

## Passo 4 · Leitura · Treinar com Adam e mini-lotes

As peças já existem. O arquivo `mlp.py` da lição anterior traz `perda_e_gradientes(params, X, y)`, e o `adam.py` traz o `Adam` que você escreveu no módulo 3, com a mesma assinatura: `Adam(taxa)` cria o otimizador, e o método `passo` recebe **listas planas** de arrays e os atualiza **no lugar**. Como o `mlp.py` trabalha com pares `[(W, b), ...]`, a função `plano` desfaz os pares antes de cada passo; os arrays da lista plana são os mesmos objetos dos pares, então atualizar uns atualiza os outros. Como o passo escreve por cima dos arrays, a função de treino começa copiando os parâmetros que recebeu; quem chamou continua com a inicialização intacta para comparar depois.

Uma **época** é uma passada por todos os exemplos, em mini-lotes. A ordem é sorteada de novo a cada época, e isso importa aqui: `gerar_digitos` devolve os rótulos em ordem (cem zeros, cem uns, ...), então lotes tirados em sequência teriam uma classe só.

```python
def plano(pares):                             # [(W1, b1), (W2, b2)] -> [W1, b1, W2, b2]
    return [a for par in pares for a in par]

otimizador = Adam(taxa)                       # um só, criado antes do laço
for epoca in range(epocas):
    ordem = rng.permutation(len(X))           # nova ordem a cada época
    for i in range(0, len(X), lote):
        idx = ordem[i:i + lote]               # o último lote pode ser menor
        perda, grads = perda_e_gradientes(params, X[idx], y[idx])
        otimizador.passo(plano(params), plano(grads))
```

Indexar `X` e `y` com o **mesmo** `idx` mantém cada imagem ao lado do rótulo dela. O otimizador é criado uma vez: ele guarda as médias móveis $m$ e $v$ e o contador $t$, e criá-lo de novo dentro do laço joga essa memória fora.

O histórico guarda um número por época, a média das perdas dos lotes. Medido no executor, com a rede 64 → 32 → 10, pesos sorteados com desvio $\sqrt{2/d_\text{in}}$, lote 32 e taxa 0,01 em 1 000 dígitos padronizados:

| épocas | tempo | perda da última época | acurácia de treino | acurácia de validação |
|---|---|---|---|---|
| 10 | 0,06 s | 0,012 | 1,00 | 0,97 |
| 20 | 0,12 s | 0,003 | 1,00 | 0,98 |

A taxa decide quase tudo. Com as mesmas dez épocas: taxa 0,0001 leva a perda de 2,96 a 2,36 e a validação fica em 0,18; taxa 0,001 chega a 0,80; taxa 0,1 chega a 0,96, com a perda parada em 0,74; e taxa 1,0 faz a perda virar `inf` já na primeira época, sem nenhum aviso.

## Passo 5 · Exercício · Treinar nos dígitos

Escreva o treino no `main.py`. Os arquivos `mlp.py` e `camadas.py` são os da lição anterior; `adam.py` traz o otimizador do módulo 3 (`Adam(taxa)` e `passo(params, grads)`, com listas planas de arrays atualizados no lugar), e o código inicial já traz `plano`, que desfaz os pares `(W, b)`; `digitos.py` gera os dados.

### Instruções
1. `treinar_digitos(params, X, y, epocas, lote, taxa, semente)` treina uma **cópia** de `params`: os arrays recebidos não mudam.
2. Crie `rng = np.random.default_rng(semente)` e **um** `Adam(taxa)` antes do laço. Em cada época, sorteie a ordem com `rng.permutation(len(X))` e percorra os exemplos nessa ordem em lotes de `lote` (o último pode ser menor), com um passo do Adam por lote.
3. O histórico é uma lista com um `float` por época: a média das perdas dos lotes daquela época.
4. A função devolve `(params_treinados, historico)`.

### Código inicial
```python
import numpy as np
from mlp import mlp_forward, perda_e_gradientes
from adam import Adam


def plano(pares):
    return [a for par in pares for a in par]


def treinar_digitos(params, X, y, epocas, lote, taxa, semente):
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
```python path=adam.py
import numpy as np


class Adam:
    """O Adam da lição de otimizadores: params e grads são listas planas de arrays, atualizados no lugar."""

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
```python path=digitos.py
import numpy as np

DESENHOS = [
    "..####.. .##..##. .##..##. .##..##. .##..##. .##..##. .##..##. ..####..",
    "...##... ..###... ...##... ...##... ...##... ...##... ...##... ..####..",
    "..####.. .##..##. .....##. ....##.. ...##... ..##.... .##..... .######.",
    ".#####.. .....##. .....##. ..####.. .....##. .....##. .....##. .#####..",
    "....##.. ...###.. ..####.. .##.##.. .######. ....##.. ....##.. ....##..",
    ".######. .##..... .##..... .#####.. .....##. .....##. .....##. .#####..",
    "..####.. .##..... .##..... .#####.. .##..##. .##..##. .##..##. ..####..",
    ".######. .....##. ....##.. ....##.. ...##... ...##... ..##.... ..##....",
    "..####.. .##..##. .##..##. ..####.. .##..##. .##..##. .##..##. ..####..",
    "..####.. .##..##. .##..##. .##..##. ..#####. .....##. .....##. ..####..",
]


def desenhos():
    """Os dez desenhos como um array (10, 8, 8) de zeros e uns."""
    return np.array([[[1.0 if c == "#" else 0.0 for c in linha] for linha in d.split()] for d in DESENHOS])


def gerar_digitos(n_por_classe, semente, ruido=0.3, deslocar=True):
    """Devolve X de forma (10 * n_por_classe, 64), com valores em [0, 1], e os rótulos y."""
    rng = np.random.default_rng(semente)
    y = np.repeat(np.arange(10), n_por_classe)
    X = desenhos()[y]
    if deslocar:
        passos = rng.integers(-1, 2, size=(len(X), 2))
        for i in range(len(X)):
            X[i] = np.roll(X[i], (int(passos[i, 0]), int(passos[i, 1])), axis=(0, 1))
    X = np.clip(X + rng.normal(0.0, ruido, X.shape), 0.0, 1.0)
    return X.reshape(len(X), 64), y
```

### Solução
```python
import numpy as np
from mlp import mlp_forward, perda_e_gradientes
from adam import Adam


def plano(pares):
    return [a for par in pares for a in par]


def treinar_digitos(params, X, y, epocas, lote, taxa, semente):
    params = [(W.copy(), b.copy()) for W, b in params]
    rng = np.random.default_rng(semente)
    otimizador = Adam(taxa)
    historico = []
    for _ in range(epocas):
        ordem = rng.permutation(len(X))
        perdas = []
        for i in range(0, len(X), lote):
            idx = ordem[i:i + lote]
            perda, grads = perda_e_gradientes(params, X[idx], y[idx])
            otimizador.passo(plano(params), plano(grads))
            perdas.append(perda)
        historico.append(float(np.mean(perdas)))
    return params, historico
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
```python path=adam.py
import numpy as np


class Adam:
    """O Adam da lição de otimizadores: params e grads são listas planas de arrays, atualizados no lugar."""

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
```python path=digitos.py
import numpy as np

DESENHOS = [
    "..####.. .##..##. .##..##. .##..##. .##..##. .##..##. .##..##. ..####..",
    "...##... ..###... ...##... ...##... ...##... ...##... ...##... ..####..",
    "..####.. .##..##. .....##. ....##.. ...##... ..##.... .##..... .######.",
    ".#####.. .....##. .....##. ..####.. .....##. .....##. .....##. .#####..",
    "....##.. ...###.. ..####.. .##.##.. .######. ....##.. ....##.. ....##..",
    ".######. .##..... .##..... .#####.. .....##. .....##. .....##. .#####..",
    "..####.. .##..... .##..... .#####.. .##..##. .##..##. .##..##. ..####..",
    ".######. .....##. ....##.. ....##.. ...##... ...##... ..##.... ..##....",
    "..####.. .##..##. .##..##. ..####.. .##..##. .##..##. .##..##. ..####..",
    "..####.. .##..##. .##..##. .##..##. ..#####. .....##. .....##. ..####..",
]


def desenhos():
    """Os dez desenhos como um array (10, 8, 8) de zeros e uns."""
    return np.array([[[1.0 if c == "#" else 0.0 for c in linha] for linha in d.split()] for d in DESENHOS])


def gerar_digitos(n_por_classe, semente, ruido=0.3, deslocar=True):
    """Devolve X de forma (10 * n_por_classe, 64), com valores em [0, 1], e os rótulos y."""
    rng = np.random.default_rng(semente)
    y = np.repeat(np.arange(10), n_por_classe)
    X = desenhos()[y]
    if deslocar:
        passos = rng.integers(-1, 2, size=(len(X), 2))
        for i in range(len(X)):
            X[i] = np.roll(X[i], (int(passos[i, 0]), int(passos[i, 1])), axis=(0, 1))
    X = np.clip(X + rng.normal(0.0, ruido, X.shape), 0.0, 1.0)
    return X.reshape(len(X), 64), y
```

### Dicas
1. Copie com `[(W.copy(), b.copy()) for W, b in params]` antes de qualquer passo.
2. `ordem[i:i + lote]` dá os índices de um lote; use os mesmos índices em `X` e em `y`.
3. Junte as perdas dos lotes numa lista dentro da época e guarde `float(np.mean(...))` no fim dela.

### Verificação
```json
[
  {"id": "params-intactos", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom digitos import gerar_digitos\nfrom mlp import mlp_forward as _forward, perda_e_gradientes as _pg\nfrom adam import Adam as _Adam\nX, y = gerar_digitos(30, 3)\nX = (X - X.mean(axis=0)) / X.std(axis=0)\nr = np.random.default_rng(1)\nparams = [(r.normal(0, (2 / 64) ** 0.5, (64, 32)), np.zeros(32)), (r.normal(0, (2 / 32) ** 0.5, (32, 10)), np.zeros(10))]\ncopias = [(W.copy(), b.copy()) for W, b in params]\ntreinar_digitos(params, X, y, 2, 32, 0.01, 0)", "expr": "all(np.array_equal(W, W0) and np.array_equal(b, b0) for (W, b), (W0, b0) in zip(params, copias))", "expected": true, "name": "Os parâmetros recebidos não mudam", "hint": "O passo do Adam escreve nos arrays: treine uma cópia."},
  {"id": "devolve-treinados", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom digitos import gerar_digitos\nfrom mlp import mlp_forward as _forward, perda_e_gradientes as _pg\nfrom adam import Adam as _Adam\nX, y = gerar_digitos(30, 3)\nX = (X - X.mean(axis=0)) / X.std(axis=0)\nr = np.random.default_rng(1)\nparams = [(r.normal(0, (2 / 64) ** 0.5, (64, 32)), np.zeros(32)), (r.normal(0, (2 / 32) ** 0.5, (32, 10)), np.zeros(10))]\nnovos, h = treinar_digitos(params, X, y, 2, 32, 0.01, 0)", "expr": "[[list(W.shape), list(b.shape)] for W, b in novos] + [not np.array_equal(novos[0][0], params[0][0])]", "expected": [[[64, 32], [32]], [[32, 10], [10]], true], "name": "Devolve parâmetros com as mesmas formas e valores diferentes dos recebidos"},
  {"id": "historico-forma", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom digitos import gerar_digitos\nfrom mlp import mlp_forward as _forward, perda_e_gradientes as _pg\nfrom adam import Adam as _Adam\nX, y = gerar_digitos(30, 3)\nX = (X - X.mean(axis=0)) / X.std(axis=0)\nr = np.random.default_rng(1)\nparams = [(r.normal(0, (2 / 64) ** 0.5, (64, 32)), np.zeros(32)), (r.normal(0, (2 / 32) ** 0.5, (32, 10)), np.zeros(10))]\nnovos, h = treinar_digitos(params, X, y, 4, 32, 0.01, 0)", "expr": "[type(h).__name__, len(h), all(isinstance(v, float) for v in h)]", "expected": ["list", 4, true], "name": "O histórico é uma lista com um float por época", "hint": "Um número por época, e não um por lote."},
  {"id": "taxa-zero", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom digitos import gerar_digitos\nfrom mlp import mlp_forward as _forward, perda_e_gradientes as _pg\nfrom adam import Adam as _Adam\nX, y = gerar_digitos(30, 3)\nX = (X - X.mean(axis=0)) / X.std(axis=0)\nr = np.random.default_rng(1)\nparams = [(r.normal(0, (2 / 64) ** 0.5, (64, 32)), np.zeros(32)), (r.normal(0, (2 / 32) ** 0.5, (32, 10)), np.zeros(10))]\nnovos, h = treinar_digitos(params, X, y, 3, 30, 0.0, 0)\n_inicial = _pg(params, X, y)[0]", "expr": "bool(np.allclose(h, [_inicial] * 3, atol=1e-9))", "expected": true, "name": "Com taxa 0 e 10 lotes de 30, a perda de cada época é a perda da rede nos 300 exemplos", "hint": "A perda da época é a média das perdas dos lotes daquela época."},
  {"id": "lote-cheio", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nfrom digitos import gerar_digitos\nfrom mlp import mlp_forward as _forward, perda_e_gradientes as _pg\nfrom adam import Adam as _Adam\nX, y = gerar_digitos(30, 3)\nX = (X - X.mean(axis=0)) / X.std(axis=0)\nr = np.random.default_rng(1)\nparams = [(r.normal(0, (2 / 64) ** 0.5, (64, 32)), np.zeros(32)), (r.normal(0, (2 / 32) ** 0.5, (32, 10)), np.zeros(10))]\nnovos, h = treinar_digitos(params, X, y, 3, 500, 0.05, 0)\n_p = [(W.copy(), b.copy()) for W, b in params]\n_o = _Adam(0.05)\n_h = []\nfor _ in range(3):\n    _perda, _g = _pg(_p, X, y)\n    _o.passo([a for par in _p for a in par], [g for par in _g for g in par])\n    _h.append(_perda)", "expr": "[bool(np.allclose(h, _h, atol=1e-9)), bool(all(np.allclose(a[0], c[0], atol=1e-9) and np.allclose(a[1], c[1], atol=1e-9) for a, c in zip(novos, _p)))]", "expected": [true, true], "name": "Com lote 500 para 300 exemplos, cada época é um passo do Adam com todos os dados e taxa 0,05", "hint": "Um lote maior que os dados vira um lote só, com tudo; o Adam é um só do começo ao fim e recebe a taxa pedida."},
  {"id": "perda-cai", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom digitos import gerar_digitos\nfrom mlp import mlp_forward as _forward, perda_e_gradientes as _pg\nfrom adam import Adam as _Adam\nX, y = gerar_digitos(30, 3)\nX = (X - X.mean(axis=0)) / X.std(axis=0)\nr = np.random.default_rng(1)\nparams = [(r.normal(0, (2 / 64) ** 0.5, (64, 32)), np.zeros(32)), (r.normal(0, (2 / 32) ** 0.5, (32, 10)), np.zeros(10))]\nnovos, h = treinar_digitos(params, X, y, 5, 32, 0.01, 0)", "expr": "bool(h[-1] < 0.5 * h[0])", "expected": true, "name": "Em 5 épocas com lote 32 e taxa 0,01, a perda cai a menos da metade", "hint": "Confira se cada imagem continua ao lado do rótulo dela depois de embaralhar."},
  {"id": "mesma-semente", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nfrom digitos import gerar_digitos\nfrom mlp import mlp_forward as _forward, perda_e_gradientes as _pg\nfrom adam import Adam as _Adam\nX, y = gerar_digitos(30, 3)\nX = (X - X.mean(axis=0)) / X.std(axis=0)\nr = np.random.default_rng(1)\nparams = [(r.normal(0, (2 / 64) ** 0.5, (64, 32)), np.zeros(32)), (r.normal(0, (2 / 32) ** 0.5, (32, 10)), np.zeros(10))]\nh1 = treinar_digitos(params, X, y, 2, 32, 0.01, 7)[1]\nh2 = treinar_digitos(params, X, y, 2, 32, 0.01, 7)[1]", "expr": "h1 == h2", "expected": true, "name": "A mesma semente dá o mesmo histórico", "hint": "Crie o gerador com `np.random.default_rng(semente)`."},
  {"id": "outra-semente", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nfrom digitos import gerar_digitos\nfrom mlp import mlp_forward as _forward, perda_e_gradientes as _pg\nfrom adam import Adam as _Adam\nX, y = gerar_digitos(30, 3)\nX = (X - X.mean(axis=0)) / X.std(axis=0)\nr = np.random.default_rng(1)\nparams = [(r.normal(0, (2 / 64) ** 0.5, (64, 32)), np.zeros(32)), (r.normal(0, (2 / 32) ** 0.5, (32, 10)), np.zeros(10))]\nh1 = treinar_digitos(params, X, y, 2, 32, 0.01, 7)[1]\nh2 = treinar_digitos(params, X, y, 2, 32, 0.01, 8)[1]", "expr": "h1 != h2", "expected": true, "name": "Outra semente embaralha em outra ordem e dá outro histórico", "hint": "A ordem dos exemplos é sorteada a cada época com o gerador da semente."},
  {"id": "validacao", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\nfrom digitos import gerar_digitos\nfrom mlp import mlp_forward as _forward\nX, y = gerar_digitos(100, 1)\nXv, yv = gerar_digitos(30, 2)\n_m, _s = X.mean(axis=0), X.std(axis=0)\nr = np.random.default_rng(0)\nparams = [(r.normal(0, (2 / 64) ** 0.5, (64, 32)), np.zeros(32)), (r.normal(0, (2 / 32) ** 0.5, (32, 10)), np.zeros(10))]\nnovos, h = treinar_digitos(params, (X - _m) / _s, y, 10, 32, 0.01, 0)\n_acc = float((_forward(novos, (Xv - _m) / _s)[0].argmax(axis=1) == yv).mean())", "expr": "bool(_acc >= 0.9)", "expected": true, "name": "1 000 dígitos, 10 épocas, lote 32 e taxa 0,01: acurácia de validação de pelo menos 0,90", "hint": "A solução de referência chega a 0,97 nessa configuração."},
  {"id": "tudo-finito", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\nfrom digitos import gerar_digitos\nfrom mlp import mlp_forward as _forward, perda_e_gradientes as _pg\nfrom adam import Adam as _Adam\nX, y = gerar_digitos(30, 3)\nX = (X - X.mean(axis=0)) / X.std(axis=0)\nr = np.random.default_rng(1)\nparams = [(r.normal(0, (2 / 64) ** 0.5, (64, 32)), np.zeros(32)), (r.normal(0, (2 / 32) ** 0.5, (32, 10)), np.zeros(10))]\nnovos, h = treinar_digitos(params, X, y, 3, 64, 0.01, 1)", "expr": "[bool(np.all(np.isfinite(h))), bool(all(np.all(np.isfinite(W)) and np.all(np.isfinite(b)) for W, b in novos))]", "expected": [true, true], "name": "Com lote 64 (o último lote tem 44 exemplos), o histórico e os parâmetros são finitos"}
]
```

### Soluções erradas
```python name="treina os parâmetros recebidos"
import numpy as np
from mlp import mlp_forward, perda_e_gradientes
from adam import Adam


def plano(pares):
    return [a for par in pares for a in par]


def treinar_digitos(params, X, y, epocas, lote, taxa, semente):
    rng = np.random.default_rng(semente)
    otimizador = Adam(taxa)
    historico = []
    for _ in range(epocas):
        ordem = rng.permutation(len(X))
        perdas = []
        for i in range(0, len(X), lote):
            idx = ordem[i:i + lote]
            perda, grads = perda_e_gradientes(params, X[idx], y[idx])
            otimizador.passo(plano(params), plano(grads))
            perdas.append(perda)
        historico.append(float(np.mean(perdas)))
    return params, historico
```
```python name="sem embaralhar"
import numpy as np
from mlp import mlp_forward, perda_e_gradientes
from adam import Adam


def plano(pares):
    return [a for par in pares for a in par]


def treinar_digitos(params, X, y, epocas, lote, taxa, semente):
    params = [(W.copy(), b.copy()) for W, b in params]
    rng = np.random.default_rng(semente)
    otimizador = Adam(taxa)
    historico = []
    for _ in range(epocas):
        ordem = np.arange(len(X))
        perdas = []
        for i in range(0, len(X), lote):
            idx = ordem[i:i + lote]
            perda, grads = perda_e_gradientes(params, X[idx], y[idx])
            otimizador.passo(plano(params), plano(grads))
            perdas.append(perda)
        historico.append(float(np.mean(perdas)))
    return params, historico
```
```python name="gerador sem a semente"
import numpy as np
from mlp import mlp_forward, perda_e_gradientes
from adam import Adam


def plano(pares):
    return [a for par in pares for a in par]


def treinar_digitos(params, X, y, epocas, lote, taxa, semente):
    params = [(W.copy(), b.copy()) for W, b in params]
    rng = np.random.default_rng()
    otimizador = Adam(taxa)
    historico = []
    for _ in range(epocas):
        ordem = rng.permutation(len(X))
        perdas = []
        for i in range(0, len(X), lote):
            idx = ordem[i:i + lote]
            perda, grads = perda_e_gradientes(params, X[idx], y[idx])
            otimizador.passo(plano(params), plano(grads))
            perdas.append(perda)
        historico.append(float(np.mean(perdas)))
    return params, historico
```
```python name="Adam novo a cada época"
import numpy as np
from mlp import mlp_forward, perda_e_gradientes
from adam import Adam


def plano(pares):
    return [a for par in pares for a in par]


def treinar_digitos(params, X, y, epocas, lote, taxa, semente):
    params = [(W.copy(), b.copy()) for W, b in params]
    rng = np.random.default_rng(semente)
    historico = []
    for _ in range(epocas):
        ordem = rng.permutation(len(X))
        perdas = []
        otimizador = Adam(taxa)
        for i in range(0, len(X), lote):
            idx = ordem[i:i + lote]
            perda, grads = perda_e_gradientes(params, X[idx], y[idx])
            otimizador.passo(plano(params), plano(grads))
            perdas.append(perda)
        historico.append(float(np.mean(perdas)))
    return params, historico
```
```python name="despreza o lote incompleto"
import numpy as np
from mlp import mlp_forward, perda_e_gradientes
from adam import Adam


def plano(pares):
    return [a for par in pares for a in par]


def treinar_digitos(params, X, y, epocas, lote, taxa, semente):
    params = [(W.copy(), b.copy()) for W, b in params]
    rng = np.random.default_rng(semente)
    otimizador = Adam(taxa)
    historico = []
    for _ in range(epocas):
        ordem = rng.permutation(len(X))
        perdas = []
        for i in range(0, len(X) - lote + 1, lote):
            idx = ordem[i:i + lote]
            perda, grads = perda_e_gradientes(params, X[idx], y[idx])
            otimizador.passo(plano(params), plano(grads))
            perdas.append(perda)
        historico.append(float(np.mean(perdas)))
    return params, historico
```
```python name="histórico com a soma das perdas"
import numpy as np
from mlp import mlp_forward, perda_e_gradientes
from adam import Adam


def plano(pares):
    return [a for par in pares for a in par]


def treinar_digitos(params, X, y, epocas, lote, taxa, semente):
    params = [(W.copy(), b.copy()) for W, b in params]
    rng = np.random.default_rng(semente)
    otimizador = Adam(taxa)
    historico = []
    for _ in range(epocas):
        ordem = rng.permutation(len(X))
        perdas = []
        for i in range(0, len(X), lote):
            idx = ordem[i:i + lote]
            perda, grads = perda_e_gradientes(params, X[idx], y[idx])
            otimizador.passo(plano(params), plano(grads))
            perdas.append(perda)
        historico.append(float(np.sum(perdas)))
    return params, historico
```
```python name="embaralha X e y com ordens diferentes"
import numpy as np
from mlp import mlp_forward, perda_e_gradientes
from adam import Adam


def plano(pares):
    return [a for par in pares for a in par]


def treinar_digitos(params, X, y, epocas, lote, taxa, semente):
    params = [(W.copy(), b.copy()) for W, b in params]
    rng = np.random.default_rng(semente)
    otimizador = Adam(taxa)
    historico = []
    for _ in range(epocas):
        ordem = rng.permutation(len(X))
        perdas = []
        for i in range(0, len(X), lote):
            idx = ordem[i:i + lote]
            perda, grads = perda_e_gradientes(params, X[idx], y[rng.permutation(len(X))[:len(idx)]])
            otimizador.passo(plano(params), plano(grads))
            perdas.append(perda)
        historico.append(float(np.mean(perdas)))
    return params, historico
```
```python name="ignora a taxa recebida"
import numpy as np
from mlp import mlp_forward, perda_e_gradientes
from adam import Adam


def plano(pares):
    return [a for par in pares for a in par]


def treinar_digitos(params, X, y, epocas, lote, taxa, semente):
    params = [(W.copy(), b.copy()) for W, b in params]
    rng = np.random.default_rng(semente)
    otimizador = Adam()
    historico = []
    for _ in range(epocas):
        ordem = rng.permutation(len(X))
        perdas = []
        for i in range(0, len(X), lote):
            idx = ordem[i:i + lote]
            perda, grads = perda_e_gradientes(params, X[idx], y[idx])
            otimizador.passo(plano(params), plano(grads))
            perdas.append(perda)
        historico.append(float(np.mean(perdas)))
    return params, historico
```

## Passo 6 · Leitura · Matriz de confusão, erros e salvar

A acurácia resume o modelo num número e esconde **onde** ele erra. A matriz de confusão do Nível 5 abre esse número: a linha é a classe verdadeira, a coluna é a classe prevista, e cada casa conta quantos exemplos caíram ali. Os acertos ficam na diagonal. Com `np.add.at`, a contagem sai sem laço:

```python
M = np.zeros((k, k), dtype=int)
np.add.at(M, (y, previsto), 1)     # M[y, previsto] += 1 contaria cada par repetido uma vez só
```

No modelo treinado por 20 épocas, a validação tem 293 acertos em 300. As linhas do 3 e do 8 são as piores, com 28 acertos em 30 cada: o 3 foi confundido com o 8 e com o 9, e o 8 com o 0 e com o 6. Faz sentido olhando os desenhos, que diferem em poucos pixels. A matriz não é simétrica: nenhum 9 foi confundido com o 3. Por isso trocar linha por coluna muda a leitura.

O passo seguinte é olhar os exemplos errados, um por um. Os índices saem de `np.flatnonzero(previsto != y)`; na validação desta lição, os primeiros são 11, 59 e 77. Ver a imagem costuma explicar o erro: um deslocamento que encostou o desenho na borda, ou ruído em cima do traço que separa dois dígitos.

Dá também para ver o que a rede aprendeu. Cada neurônio da primeira camada tem 64 pesos, um por pixel, e eles podem ser impressos como uma grade 8 × 8 de sinais (`+` para peso positivo, `-` para negativo, `.` perto de zero). O neurônio mostra que traços procura e que traços o desligam.

Por fim, um modelo treinado precisa sobreviver ao fim do programa. `np.savez("pesos.npz", W0=W0, b0=b0)` grava vários arrays num arquivo, cada um com um nome, e `np.load("pesos.npz")` devolve um objeto que se indexa por esses nomes. Três cuidados: dar nomes **estáveis** (com argumentos posicionais, os arrays viram `arr_0`, `arr_1`, ...); reconstruir a lista pela ordem das camadas, e não pela ordem alfabética dos nomes, em que `W1` vem antes de `b0`; e gravar em `float64`, porque uma ida e volta em `float32` arredonda cada peso por volta do sétimo dígito.

## Passo 7 · Exercício · Avaliar e salvar

As funções de avaliação recebem `prever`, uma função que leva um lote `X` a um array de rótulos previstos (um inteiro por linha de `X`). Assim elas servem para qualquer modelo.

### Instruções
1. `matriz_de_confusao(prever, X, y, k)` devolve um array de inteiros `(k, k)` em que a casa da linha `i`, coluna `j`, conta os exemplos de classe verdadeira `i` previstos como `j`.
2. `exemplos_errados(prever, X, y, n)` devolve uma lista com os índices dos `n` primeiros exemplos em que a previsão difere do rótulo, em ordem crescente (menos de `n`, se não houver tantos).
3. `salvar(params, caminho)` grava a lista `params = [(W, b), ...]` no arquivo `caminho` (terminado em `.npz`) com `np.savez`, sem mudar o tipo dos arrays.
4. `carregar(caminho)` devolve a lista de pares `(W, b)` na ordem das camadas, com os mesmos números que foram salvos, para qualquer número de camadas.

### Código inicial
```python
import numpy as np


def matriz_de_confusao(prever, X, y, k):
    pass


def exemplos_errados(prever, X, y, n):
    pass


def salvar(params, caminho):
    pass


def carregar(caminho):
    pass
```

### Solução
```python
import numpy as np


def matriz_de_confusao(prever, X, y, k):
    previsto = prever(X)
    M = np.zeros((k, k), dtype=int)
    np.add.at(M, (y, previsto), 1)
    return M


def exemplos_errados(prever, X, y, n):
    errados = np.flatnonzero(prever(X) != y)
    return [int(i) for i in errados[:n]]


def salvar(params, caminho):
    arrays = {}
    for i, (W, b) in enumerate(params):
        arrays[f"W{i}"] = W
        arrays[f"b{i}"] = b
    np.savez(caminho, **arrays)


def carregar(caminho):
    dados = np.load(caminho)
    camadas = len(dados.files) // 2
    return [(dados[f"W{i}"], dados[f"b{i}"]) for i in range(camadas)]
```

### Dicas
1. `np.add.at(M, (linhas, colunas), 1)` soma 1 em cada par, inclusive nos repetidos.
2. `np.flatnonzero(condicao)` devolve os índices em que a condição vale, já em ordem.
3. Dê um nome por array (`W0`, `b0`, `W1`, ...) e reconstrua a lista pelo número da camada.

### Verificação
```json
[
  {"id": "matriz-valores", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_prever = lambda X: X[:, 0].astype(np.intp)\nX = np.array([[0.0], [1.0], [1.0], [2.0], [1.0], [0.0], [2.0], [1.0]])\ny = np.array([0, 0, 0, 2, 1, 1, 2, 0])\n", "expr": "matriz_de_confusao(_prever, X, y, 3).tolist()", "expected": [[1, 3, 0], [1, 1, 0], [0, 0, 2]], "name": "Linha = classe verdadeira, coluna = classe prevista, numa tarefa de 3 classes", "hint": "Três exemplos da classe 0 foram previstos como 1: a casa é a da linha 0, coluna 1."},
  {"id": "matriz-repetidos", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_prever = lambda X: np.zeros(len(X), dtype=np.intp)\nX = np.zeros((5, 2))\ny = np.array([1, 1, 1, 1, 0])", "expr": "matriz_de_confusao(_prever, X, y, 2).tolist()", "expected": [[1, 0], [4, 0]], "name": "Quatro exemplos no mesmo par (verdadeira 1, prevista 0) contam 4", "hint": "A indexação com `+=` conta cada par repetido uma vez só; use `np.add.at`."},
  {"id": "matriz-classe-ausente", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_prever = lambda X: X[:, 0].astype(np.intp)\nX = np.array([[0.0], [1.0], [1.0]])\ny = np.array([0, 1, 0])\nM = matriz_de_confusao(_prever, X, y, 4)", "expr": "[list(M.shape), int(M.sum()), M[:2, :2].tolist()]", "expected": [[4, 4], 3, [[1, 1], [0, 1]]], "name": "Com k = 4 e só as classes 0 e 1 nos dados, a matriz continua 4 × 4", "hint": "O tamanho vem de `k`, e não dos rótulos que apareceram."},
  {"id": "matriz-diagonal", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nr = np.random.default_rng(2)\ny = r.integers(0, 10, size=200)\n_p = np.where(r.random(200) < 0.7, y, r.integers(0, 10, size=200))\nX = _p.reshape(-1, 1).astype(float)\n_prever = lambda X: X[:, 0].astype(np.intp)\nM = matriz_de_confusao(_prever, X, y, 10)", "expr": "[int(M.sum()) == 200, int(np.trace(M)) == int((_p == y).sum()), M.sum(axis=1).tolist() == np.bincount(y, minlength=10).tolist()]", "expected": [true, true, true], "name": "Em 200 exemplos: a soma é 200, a diagonal conta os acertos e cada linha soma os exemplos da classe", "hint": "A lista diz se bateram o total, a diagonal e as somas das linhas."},
  {"id": "errados-primeiros", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_prever = lambda X: X[:, 0].astype(np.intp)\nX = np.array([[0.0], [1.0], [1.0], [2.0], [1.0], [0.0], [2.0], [1.0]])\ny = np.array([0, 0, 0, 2, 1, 1, 2, 0])\n", "expr": "[int(i) for i in exemplos_errados(_prever, X, y, 3)]", "expected": [1, 2, 5], "name": "Os 3 primeiros índices em que a previsão difere do rótulo, em ordem crescente"},
  {"id": "errados-todos", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_prever = lambda X: X[:, 0].astype(np.intp)\nX = np.array([[0.0], [1.0], [1.0], [2.0], [1.0], [0.0], [2.0], [1.0]])\ny = np.array([0, 0, 0, 2, 1, 1, 2, 0])\n", "expr": "[int(i) for i in exemplos_errados(_prever, X, y, 10)]", "expected": [1, 2, 5, 7], "name": "Pedindo 10 com só 4 erros, devolve os 4", "hint": "A lista pode ser menor que `n`."},
  {"id": "errados-nenhum", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_prever = lambda X: X[:, 0].astype(np.intp)\nX = np.array([[2.0], [0.0], [1.0]])\ny = np.array([2, 0, 1])\nres = exemplos_errados(_prever, X, y, 5)", "expr": "[type(res).__name__, len(res)]", "expected": ["list", 0], "name": "Sem erros, devolve uma lista vazia"},
  {"id": "ida-e-volta", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nr = np.random.default_rng(9)\nparams = [(r.normal(size=(6, 4)), r.normal(size=4)), (r.normal(size=(4, 3)), r.normal(size=3))]\nsalvar(params, 'pesos.npz')\nlidos = carregar('pesos.npz')\n", "expr": "[len(lidos), all(np.array_equal(W, W0) and np.array_equal(b, b0) for (W, b), (W0, b0) in zip(lidos, params))]", "expected": [2, true], "name": "Salvar e carregar uma rede 6 → 4 → 3 devolve os mesmos números, bit a bit", "hint": "A lista carregada segue a ordem das camadas: (W0, b0), depois (W1, b1)."},
  {"id": "ida-e-volta-formas", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\nr = np.random.default_rng(9)\nparams = [(r.normal(size=(6, 4)), r.normal(size=4)), (r.normal(size=(4, 3)), r.normal(size=3))]\nsalvar(params, 'pesos.npz')\nlidos = carregar('pesos.npz')\n", "expr": "[type(lidos).__name__, [[list(W.shape), list(b.shape), str(W.dtype)] for W, b in lidos]]", "expected": ["list", [[[6, 4], [4], "float64"], [[4, 3], [3], "float64"]]], "name": "carregar devolve uma lista de pares (W, b) com as formas originais, em float64", "hint": "Cada par junta o peso e o viés da mesma camada."},
  {"id": "tres-camadas", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\nr = np.random.default_rng(10)\nparams = [(r.normal(size=(5, 5)), r.normal(size=5)), (r.normal(size=(5, 5)), r.normal(size=5)), (r.normal(size=(5, 2)), r.normal(size=2))]\nsalvar(params, 'rede.npz')\nlidos = carregar('rede.npz')", "expr": "[len(lidos), all(np.array_equal(W, W0) and np.array_equal(b, b0) for (W, b), (W0, b0) in zip(lidos, params))]", "expected": [3, true], "name": "Três camadas, duas delas com a mesma forma, voltam na ordem certa"},
  {"id": "uma-camada", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\nparams = [(np.array([[1.5, -2.0], [0.25, 3.0]]), np.array([0.5, -0.5]))]\nsalvar(params, 'uma.npz')\nlidos = carregar('uma.npz')", "expr": "[len(lidos), lidos[0][0].tolist(), lidos[0][1].tolist()]", "expected": [1, [[1.5, -2.0], [0.25, 3.0]], [0.5, -0.5]], "name": "Uma rede de uma camada só também vai e volta"}
]
```

### Soluções erradas
```python name="matriz com os eixos trocados"
import numpy as np


def matriz_de_confusao(prever, X, y, k):
    previsto = prever(X)
    M = np.zeros((k, k), dtype=int)
    np.add.at(M, (previsto, y), 1)
    return M


def exemplos_errados(prever, X, y, n):
    errados = np.flatnonzero(prever(X) != y)
    return [int(i) for i in errados[:n]]


def salvar(params, caminho):
    arrays = {}
    for i, (W, b) in enumerate(params):
        arrays[f"W{i}"] = W
        arrays[f"b{i}"] = b
    np.savez(caminho, **arrays)


def carregar(caminho):
    dados = np.load(caminho)
    camadas = len(dados.files) // 2
    return [(dados[f"W{i}"], dados[f"b{i}"]) for i in range(camadas)]
```
```python name="pares repetidos contam uma vez"
import numpy as np


def matriz_de_confusao(prever, X, y, k):
    previsto = prever(X)
    M = np.zeros((k, k), dtype=int)
    M[y, previsto] += 1
    return M


def exemplos_errados(prever, X, y, n):
    errados = np.flatnonzero(prever(X) != y)
    return [int(i) for i in errados[:n]]


def salvar(params, caminho):
    arrays = {}
    for i, (W, b) in enumerate(params):
        arrays[f"W{i}"] = W
        arrays[f"b{i}"] = b
    np.savez(caminho, **arrays)


def carregar(caminho):
    dados = np.load(caminho)
    camadas = len(dados.files) // 2
    return [(dados[f"W{i}"], dados[f"b{i}"]) for i in range(camadas)]
```
```python name="tamanho da matriz tirado dos rótulos"
import numpy as np


def matriz_de_confusao(prever, X, y, k):
    previsto = prever(X)
    k = int(y.max()) + 1
    M = np.zeros((k, k), dtype=int)
    np.add.at(M, (y, previsto), 1)
    return M


def exemplos_errados(prever, X, y, n):
    errados = np.flatnonzero(prever(X) != y)
    return [int(i) for i in errados[:n]]


def salvar(params, caminho):
    arrays = {}
    for i, (W, b) in enumerate(params):
        arrays[f"W{i}"] = W
        arrays[f"b{i}"] = b
    np.savez(caminho, **arrays)


def carregar(caminho):
    dados = np.load(caminho)
    camadas = len(dados.files) // 2
    return [(dados[f"W{i}"], dados[f"b{i}"]) for i in range(camadas)]
```
```python name="devolve os acertos"
import numpy as np


def matriz_de_confusao(prever, X, y, k):
    previsto = prever(X)
    M = np.zeros((k, k), dtype=int)
    np.add.at(M, (y, previsto), 1)
    return M


def exemplos_errados(prever, X, y, n):
    errados = np.flatnonzero(prever(X) == y)
    return [int(i) for i in errados[:n]]


def salvar(params, caminho):
    arrays = {}
    for i, (W, b) in enumerate(params):
        arrays[f"W{i}"] = W
        arrays[f"b{i}"] = b
    np.savez(caminho, **arrays)


def carregar(caminho):
    dados = np.load(caminho)
    camadas = len(dados.files) // 2
    return [(dados[f"W{i}"], dados[f"b{i}"]) for i in range(camadas)]
```
```python name="ignora o limite n"
import numpy as np


def matriz_de_confusao(prever, X, y, k):
    previsto = prever(X)
    M = np.zeros((k, k), dtype=int)
    np.add.at(M, (y, previsto), 1)
    return M


def exemplos_errados(prever, X, y, n):
    errados = np.flatnonzero(prever(X) != y)
    return [int(i) for i in errados]


def salvar(params, caminho):
    arrays = {}
    for i, (W, b) in enumerate(params):
        arrays[f"W{i}"] = W
        arrays[f"b{i}"] = b
    np.savez(caminho, **arrays)


def carregar(caminho):
    dados = np.load(caminho)
    camadas = len(dados.files) // 2
    return [(dados[f"W{i}"], dados[f"b{i}"]) for i in range(camadas)]
```
```python name="carrega em ordem alfabética"
import numpy as np


def matriz_de_confusao(prever, X, y, k):
    previsto = prever(X)
    M = np.zeros((k, k), dtype=int)
    np.add.at(M, (y, previsto), 1)
    return M


def exemplos_errados(prever, X, y, n):
    errados = np.flatnonzero(prever(X) != y)
    return [int(i) for i in errados[:n]]


def salvar(params, caminho):
    arrays = {}
    for i, (W, b) in enumerate(params):
        arrays[f"W{i}"] = W
        arrays[f"b{i}"] = b
    np.savez(caminho, **arrays)


def carregar(caminho):
    dados = np.load(caminho)
    nomes = sorted(dados.files)
    return [(dados[nomes[i]], dados[nomes[i + 1]]) for i in range(0, len(nomes), 2)]
```
```python name="salva em float32"
import numpy as np


def matriz_de_confusao(prever, X, y, k):
    previsto = prever(X)
    M = np.zeros((k, k), dtype=int)
    np.add.at(M, (y, previsto), 1)
    return M


def exemplos_errados(prever, X, y, n):
    errados = np.flatnonzero(prever(X) != y)
    return [int(i) for i in errados[:n]]


def salvar(params, caminho):
    arrays = {}
    for i, (W, b) in enumerate(params):
        arrays[f"W{i}"] = W.astype(np.float32)
        arrays[f"b{i}"] = b.astype(np.float32)
    np.savez(caminho, **arrays)


def carregar(caminho):
    dados = np.load(caminho)
    camadas = len(dados.files) // 2
    return [(dados[f"W{i}"], dados[f"b{i}"]) for i in range(camadas)]
```

## Passo 8 · Quiz · Normalização e taxa

### Pergunta
Um MLP treinado em dígitos padronizados chega a 0,98 de acurácia na validação. Outra pessoa carrega os pesos salvos e avalia as mesmas 300 imagens de validação assim:

```python
logits, _ = mlp_forward(params, X_val)
print((logits.argmax(axis=1) == y_val).mean())   # 0.1
```

Qual é a explicação mais provável para 0,1, a acurácia de um chute entre dez classes?
- [ ] Os pesos perderam precisão ao serem salvos com `np.savez`
- [ ] A validação tem imagens deslocadas, que o treino não viu
- [x] `X_val` entrou sem a padronização com a média e o desvio do treino
- [ ] A rede sobreajustou e decorou o treino
> A rede aprendeu com entradas de média 0 e desvio 1 por pixel; pixels crus em $[0, 1]$ são outra escala, e os logits deixam de fazer sentido (medido nesta lição: 0,10). `np.savez` grava em `float64` e a ida e volta é exata. O treino também tem imagens deslocadas, geradas do mesmo jeito. Sobreajuste baixa a validação alguns pontos; não a leva ao nível do chute quando ela já tinha dado 0,98.

### Pergunta
Imagens com pixels de 0 a 255 entram na rede sem nenhuma preparação. Em dez épocas com taxa 0,01:

```text
época 1: perda 51.729
época 2: perda 2.324
época 10: perda 1.881   acurácia de validação 0.22
```

O que tentar primeiro?
- [ ] Treinar por 100 épocas, porque a perda ainda está caindo
- [x] Padronizar os pixels com a média e o desvio do treino e treinar de novo
- [ ] Trocar a rede 64 → 32 → 10 por uma de quatro camadas
- [ ] Aumentar a taxa para 0,1, porque a perda caiu devagar
> Uma perda de 51 na primeira época, muito acima de $\ln 10 \approx 2{,}3$, mostra logits enormes: o defeito está na escala das entradas. Com os mesmos dados padronizados, a mesma rede chega a 0,97 em dez épocas. Mais épocas insistem num treino que estacionou perto de 1,9. Mais camadas não corrigem a escala. Uma taxa maior aumenta passos que já são grandes demais para essas entradas.

### Pergunta
Quatro treinos da mesma rede, com dados padronizados e dez épocas, mudando só a taxa do Adam:

```text
taxa 1.0     perda inf           validação 0.92
taxa 0.01    perda 1.50 -> 0.012 validação 0.97
taxa 0.001   perda 2.64 -> 0.648 validação 0.80
taxa 0.0001  perda 2.96 -> 2.359 validação 0.18
```

O que a linha da taxa 0,0001 indica?
- [x] A taxa é baixa demais: a perda cai devagar e ainda está longe do fim; vale subir a taxa
- [ ] A rede é pequena demais para o problema e precisa de mais neurônios
- [ ] Os dados não foram embaralhados
- [ ] O treino divergiu, e a taxa precisa ser ainda menor
> A perda cai, só que muito pouco por época, e a mesma rede chega a 0,012 com taxa 0,01: o gargalo é o tamanho do passo. A rede não é pequena, porque com outra taxa ela resolve o problema. Embaralhar ou não é igual nas quatro linhas e não explica a diferença entre elas. Divergir é o caso da taxa 1,0, em que a perda vira `inf`; diminuir a taxa aqui pioraria o quadro.
