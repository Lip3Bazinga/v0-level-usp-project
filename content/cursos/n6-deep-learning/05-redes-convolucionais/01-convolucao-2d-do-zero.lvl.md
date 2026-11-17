---
slug: n6-m5-01-convolucao-2d-do-zero
titulo: Convolução 2D do zero
descricao: Filtros, correlação cruzada, padding e stride, filtros clássicos (bordas, blur), shapes de saída e a implementação com laços e depois vetorizada (im2col).
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
xp: 120
tempo_min: 50
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Implementar a convolução 2D com padding e stride e prever o shape da saída
- Aplicar filtros clássicos a imagens e interpretar o resultado
- Vetorizar a convolução com im2col e comparar a velocidade
---

## Passo 1 · Leitura · Um filtro que desliza

O MLP do módulo anterior recebe o dígito 8 × 8 como 64 números soltos: o pixel de cima e o de baixo são entradas quaisquer, e um traço aprendido num canto precisa ser aprendido de novo no outro. A **convolução** troca isso por um **filtro** pequeno (uma matriz $k \times k$ de pesos) que desliza pela imagem. Em cada posição, a **janela** da imagem debaixo do filtro é multiplicada por ele, elemento a elemento, e os produtos são somados num único número:

$$S_{ij} = \sum_{a=0}^{k-1} \sum_{b=0}^{k-1} X_{i+a,\,j+b} \, F_{ab}$$

Os mesmos $k^2$ pesos servem para todas as posições. Isso é o **compartilhamento de pesos**: o traço é aprendido uma vez e encontrado onde estiver.

```python
janela = imagem[i:i + k, j:j + k]      # pedaço k × k da imagem
saida[i, j] = np.sum(janela * filtro)  # produto elemento a elemento, depois soma
```

A rigor, essa operação se chama **correlação cruzada**. A convolução da matemática gira o filtro 180° antes de deslizar. Como os pesos do filtro são aprendidos, girar ou não girar dá a mesma rede, e as bibliotecas de deep learning calculam a correlação cruzada e chamam de convolução. Este curso faz o mesmo: **o filtro não é invertido**.

Dois ajustes controlam o tamanho da saída. O **padding** $p$ cerca a imagem com $p$ linhas e colunas de zeros de cada lado, para o filtro alcançar as bordas. O **stride** $s$ é o passo da janela: com $s = 2$, ela anda de dois em dois pixels. Numa imagem de lado $n$, o lado da saída é

$$\left\lfloor \frac{n + 2p - k}{s} \right\rfloor + 1$$

O piso $\lfloor \cdot \rfloor$ aparece porque uma janela que não cabe inteira é descartada. Um filtro maior que a imagem com padding não cabe em posição nenhuma, e o numpy avisa com um erro de formas quando a janela sai menor que o filtro:

```text
ValueError: operands could not be broadcast together with shapes (2,3) (3,3)
```

No visualizador, um filtro 3 × 3 desliza por uma imagem 4 × 4, sem padding e com stride 1. Cabem $4 - 3 + 1 = 2$ posições em cada direção, e a saída é `[[0, 2], [-1, -1]]`. Acompanhe os índices `i + a` e `j + b`: são eles que escolhem a janela.

```python visualizar
imagem = [
    [1, 2, 0, 1],
    [0, 1, 3, 1],
    [2, 1, 0, 0],
    [1, 0, 1, 2],
]
filtro = [
    [1, 0, -1],
    [1, 0, -1],
    [1, 0, -1],
]
saida = [[0, 0], [0, 0]]
for i in range(2):
    for j in range(2):
        soma = 0
        for a in range(3):
            for b in range(3):
                soma += imagem[i + a][j + b] * filtro[a][b]
        saida[i][j] = soma
print(saida)
```

## Passo 2 · Previsão · Formas de saída

A função calcula o lado da saída de uma convolução numa imagem quadrada de lado `n`, com filtro de lado `k`, padding `p` e stride `s`. Leia sem executar e digite o que o programa imprime.

### Código
```python
def lado(n, k, p, s):
    return (n + 2 * p - k) // s + 1


print(lado(8, 3, 0, 1))
print(lado(8, 3, 1, 1))
print(lado(8, 3, 1, 2))
print(lado(7, 2, 0, 2))
```

### Dicas
1. Sem padding e com stride 1, o filtro 3 × 3 perde uma posição de cada lado.
2. Com `p = 1`, a imagem 8 × 8 passa a ter lado 10 antes de o filtro deslizar.
3. `//` é a divisão inteira: `7 // 2` é 3 e `5 // 2` é 2.

### Saída esperada
```text
6
8
4
3
```

## Passo 3 · Exercício · Convolução com laço
modo: lacunas

Complete as lacunas (`___`) de `conv2d_laco`, que aplica um filtro quadrado `(k, k)` a uma imagem `(H, W)` e devolve a matriz de saída. A imagem pode não ser quadrada.

### Instruções
1. Sem padding e com stride 1, cada posição da saída é a soma dos produtos, elemento a elemento, entre a janela e o filtro. O filtro **não** é invertido.
2. O `padding` acrescenta essa quantidade de linhas e de colunas de zeros nos **quatro** lados da imagem.
3. O `stride` é o passo da janela nas duas direções; a saída tem $\lfloor (n + 2p - k)/s \rfloor + 1$ linhas e colunas, com o $n$ de cada eixo.

### Código inicial
```python
import numpy as np


def conv2d_laco(imagem, filtro, padding=0, stride=1):
    k = filtro.shape[0]
    P = np.pad(imagem, ___)
    h = ___
    w = ___
    saida = np.zeros((h, w))
    for i in range(h):
        for j in range(w):
            janela = P[___, ___]
            saida[i, j] = np.sum(___)
    return saida
```

### Solução
```python
import numpy as np


def conv2d_laco(imagem, filtro, padding=0, stride=1):
    k = filtro.shape[0]
    P = np.pad(imagem, padding)
    h = (P.shape[0] - k) // stride + 1
    w = (P.shape[1] - k) // stride + 1
    saida = np.zeros((h, w))
    for i in range(h):
        for j in range(w):
            janela = P[i * stride:i * stride + k, j * stride:j * stride + k]
            saida[i, j] = np.sum(janela * filtro)
    return saida
```

### Dicas
1. `np.pad(imagem, 1)` devolve uma cópia com uma moldura de zeros de largura 1 em todos os lados.
2. `P` já tem o padding: o lado da saída sai de `P.shape`, de `k` e do `stride`, com divisão inteira.
3. A janela da posição `(i, j)` começa na linha `i * stride` e na coluna `j * stride`, e tem `k` linhas e `k` colunas.

### Verificação
```json
[
  {"id": "janela-2x2", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np", "expr": "conv2d_laco(np.arange(9.0).reshape(3, 3), np.array([[1.0, 2.0], [3.0, 4.0]])).tolist()", "expected": [[27.0, 37.0], [57.0, 67.0]], "tolerance": 1e-12, "name": "Imagem 3 × 3 com os números de 0 a 8 e filtro [[1, 2], [3, 4]]", "hint": "Cada saída é a soma de janela * filtro, com o filtro na ordem em que foi dado."},
  {"id": "nao-quadrada", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np", "expr": "conv2d_laco(np.arange(15.0).reshape(3, 5), np.array([[1.0, 0.0], [0.0, -1.0]])).tolist()", "expected": [[-6.0, -6.0, -6.0, -6.0], [-6.0, -6.0, -6.0, -6.0]], "tolerance": 1e-12, "name": "Imagem 3 × 5: a saída tem 2 linhas e 4 colunas", "hint": "A altura da saída sai de P.shape[0] e a largura, de P.shape[1]."},
  {"id": "borda-vertical", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nimg = np.zeros((4, 5))\nimg[:, 2:] = 1.0\nsobel = np.array([[-1.0, 0.0, 1.0], [-2.0, 0.0, 2.0], [-1.0, 0.0, 1.0]])", "expr": "conv2d_laco(img, sobel).tolist()", "expected": [[4.0, 4.0, 0.0], [4.0, 4.0, 0.0]], "tolerance": 1e-12, "name": "Borda de escuro para claro com o filtro de Sobel: saída positiva", "hint": "Um filtro invertido troca o sinal desta saída."},
  {"id": "filtro-1x1", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np", "expr": "conv2d_laco(np.array([[1.0, -2.0], [0.5, 4.0]]), np.array([[3.0]])).tolist()", "expected": [[3.0, -6.0], [1.5, 12.0]], "tolerance": 1e-12, "name": "Um filtro 1 × 1 só multiplica a imagem pelo peso"},
  {"id": "identidade-com-padding", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nimg = np.arange(20.0).reshape(4, 5)\nf = np.zeros((3, 3))\nf[1, 1] = 1.0", "expr": "bool(np.array_equal(conv2d_laco(img, f, padding=1), img))", "expected": true, "name": "Filtro com 1 no centro e padding 1 devolve a própria imagem", "hint": "O padding entra dos dois lados de cada eixo."},
  {"id": "padding-contagem", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np", "expr": "conv2d_laco(np.ones((3, 3)), np.ones((3, 3)), padding=1).tolist()", "expected": [[4.0, 6.0, 4.0], [6.0, 9.0, 6.0], [4.0, 6.0, 4.0]], "tolerance": 1e-12, "name": "Imagem de uns, filtro de uns e padding 1: cantos 4, bordas 6, centro 9", "hint": "Com zeros nos quatro lados, os quatro cantos da saída são iguais."},
  {"id": "padding-forma", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np", "expr": "[list(conv2d_laco(np.ones((8, 8)), np.ones((3, 3)), padding=p).shape) for p in (0, 1, 2)]", "expected": [[6, 6], [8, 8], [10, 10]], "name": "Imagem 8 × 8 e filtro 3 × 3: lados 6, 8 e 10 com padding 0, 1 e 2"},
  {"id": "stride-2", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np", "expr": "conv2d_laco(np.arange(16.0).reshape(4, 4), np.ones((2, 2)), stride=2).tolist()", "expected": [[10.0, 18.0], [42.0, 50.0]], "tolerance": 1e-12, "name": "Stride 2 com filtro 2 × 2: quatro janelas sem sobreposição", "hint": "A janela (i, j) começa na linha i * stride e na coluna j * stride."},
  {"id": "stride-sobra", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np", "expr": "list(conv2d_laco(np.ones((7, 7)), np.ones((2, 2)), stride=2).shape)", "expected": [3, 3], "name": "Lado 7, filtro 2 e stride 2: a janela que não cabe inteira é descartada", "hint": "Use a divisão inteira: (7 - 2) // 2 + 1 = 3."},
  {"id": "stride-e-padding", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np", "expr": "conv2d_laco(np.arange(25.0).reshape(5, 5), np.array([[0.0, 1.0, 0.0], [1.0, 1.0, 1.0], [0.0, 1.0, 0.0]]), padding=1, stride=2).tolist()", "expected": [[6.0, 13.0, 16.0], [41.0, 60.0, 55.0], [56.0, 83.0, 66.0]], "tolerance": 1e-12, "name": "Imagem 5 × 5, filtro em cruz, padding 1 e stride 2: saída 3 × 3"},
  {"id": "stride-nao-quadrada", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np", "expr": "conv2d_laco(np.arange(24.0).reshape(4, 6), np.array([[1.0, -1.0], [2.0, 0.5]]), stride=2).tolist()", "expected": [[14.5, 19.5, 24.5], [44.5, 49.5, 54.5]], "tolerance": 1e-12, "name": "Imagem 4 × 6 com stride 2: saída 2 × 3", "hint": "O stride vale para as linhas e para as colunas."}
]
```

### Soluções erradas
```python name="inverte o filtro (convolução da matemática)"
import numpy as np


def conv2d_laco(imagem, filtro, padding=0, stride=1):
    k = filtro.shape[0]
    P = np.pad(imagem, padding)
    h = (P.shape[0] - k) // stride + 1
    w = (P.shape[1] - k) // stride + 1
    saida = np.zeros((h, w))
    for i in range(h):
        for j in range(w):
            janela = P[i * stride:i * stride + k, j * stride:j * stride + k]
            saida[i, j] = np.sum(janela * filtro[::-1, ::-1])
    return saida
```
```python name="forma arredondada para cima"
import numpy as np


def conv2d_laco(imagem, filtro, padding=0, stride=1):
    k = filtro.shape[0]
    P = np.pad(imagem, padding)
    h = -(-(P.shape[0] - k) // stride) + 1
    w = -(-(P.shape[1] - k) // stride) + 1
    saida = np.zeros((h, w))
    for i in range(h):
        for j in range(w):
            janela = P[i * stride:i * stride + k, j * stride:j * stride + k]
            saida[i, j] = np.sum(janela * filtro)
    return saida
```
```python name="padding só em cima e à esquerda"
import numpy as np


def conv2d_laco(imagem, filtro, padding=0, stride=1):
    k = filtro.shape[0]
    P = np.pad(imagem, ((padding, 0), (padding, 0)))
    h = (P.shape[0] - k) // stride + 1
    w = (P.shape[1] - k) // stride + 1
    saida = np.zeros((h, w))
    for i in range(h):
        for j in range(w):
            janela = P[i * stride:i * stride + k, j * stride:j * stride + k]
            saida[i, j] = np.sum(janela * filtro)
    return saida
```
```python name="stride ignorado no índice da janela"
import numpy as np


def conv2d_laco(imagem, filtro, padding=0, stride=1):
    k = filtro.shape[0]
    P = np.pad(imagem, padding)
    h = (P.shape[0] - k) // stride + 1
    w = (P.shape[1] - k) // stride + 1
    saida = np.zeros((h, w))
    for i in range(h):
        for j in range(w):
            janela = P[i:i + k, j:j + k]
            saida[i, j] = np.sum(janela * filtro)
    return saida
```
```python name="stride só nas linhas"
import numpy as np


def conv2d_laco(imagem, filtro, padding=0, stride=1):
    k = filtro.shape[0]
    P = np.pad(imagem, padding)
    h = (P.shape[0] - k) // stride + 1
    w = (P.shape[1] - k) // stride + 1
    saida = np.zeros((h, w))
    for i in range(h):
        for j in range(w):
            janela = P[i * stride:i * stride + k, j:j + k]
            saida[i, j] = np.sum(janela * filtro)
    return saida
```
```python name="produto de matrizes no lugar do elemento a elemento"
import numpy as np


def conv2d_laco(imagem, filtro, padding=0, stride=1):
    k = filtro.shape[0]
    P = np.pad(imagem, padding)
    h = (P.shape[0] - k) // stride + 1
    w = (P.shape[1] - k) // stride + 1
    saida = np.zeros((h, w))
    for i in range(h):
        for j in range(w):
            janela = P[i * stride:i * stride + k, j * stride:j * stride + k]
            saida[i, j] = np.sum(janela @ filtro)
    return saida
```
```python name="largura calculada com a altura"
import numpy as np


def conv2d_laco(imagem, filtro, padding=0, stride=1):
    k = filtro.shape[0]
    P = np.pad(imagem, padding)
    h = (P.shape[0] - k) // stride + 1
    w = (P.shape[0] - k) // stride + 1
    saida = np.zeros((h, w))
    for i in range(h):
        for j in range(w):
            janela = P[i * stride:i * stride + k, j * stride:j * stride + k]
            saida[i, j] = np.sum(janela * filtro)
    return saida
```

## Passo 4 · Leitura · Filtros clássicos

Antes de as redes aprenderem os filtros, eles eram escolhidos à mão. O primeiro clássico é o **filtro de média**: nove pesos iguais a $1/9$. Cada pixel da saída é a média da vizinhança 3 × 3, e a imagem sai borrada.

O segundo é o par de **filtros de Sobel**, que respondem a mudanças de intensidade:

```python
SOBEL_X = np.array([[-1.0, 0.0, 1.0],
                    [-2.0, 0.0, 2.0],
                    [-1.0, 0.0, 1.0]])
SOBEL_Y = SOBEL_X.T
```

`SOBEL_X` subtrai a coluna da esquerda da coluna da direita. Numa região lisa, as duas se cancelam e a saída é 0. Onde a imagem passa de escuro para claro, da esquerda para a direita, a saída é positiva; de claro para escuro, negativa. Ele encontra **bordas verticais**; `SOBEL_Y`, o transposto, encontra as horizontais.

Os números a seguir foram medidos no desenho do dígito 1 de `digitos.py` (um traço vertical com 19 pixels acesos), com padding 1 para a saída continuar 8 × 8. Uma linha do meio do traço dá, com `SOBEL_X`:

```text
[0, 0, 4, 4, -4, -4, 0, 0]
```

O $+4$ marca a borda esquerda do traço e o $-4$, a direita. Com o filtro invertido, os sinais trocam: em filtros escolhidos à mão, a inversão importa. Somando os valores absolutos da saída inteira, `SOBEL_X` dá 120 e `SOBEL_Y` dá 32: o 1 é quase todo feito de bordas verticais. No 7, que tem uma barra horizontal no topo, as somas são 108 e 62.

Para juntar as duas direções num número por pixel, usa-se a **magnitude do gradiente**:

$$M = \sqrt{G_x^2 + G_y^2}$$

em que $G_x$ e $G_y$ são as saídas dos dois filtros. No 1, a magnitude chega a 4,47 e é positiva em 39 dos 64 pixels: o contorno do traço.

Já a média, no mesmo dígito, espalha os 19 pixels acesos por 39 pixels, com valores entre 0,11 e 0,78.

Numa rede convolucional ninguém escreve esses pesos: o treino descobre filtros parecidos com esses na primeira camada, porque bordas e médias servem a quase toda tarefa com imagens.

## Passo 5 · Exercício · Forma e Sobel

Escreva `forma_de_saida`, que prevê o lado da saída de uma convolução, e `aplicar_sobel`, que devolve a magnitude do gradiente de uma imagem. O arquivo `conv.py` traz a `conv2d_laco` do passo 3, pronta para importar, e `digitos.py` traz os dez desenhos 8 × 8 do módulo anterior (`desenhos()`), para testar.

### Instruções
1. `forma_de_saida(n, k, p, s)` devolve o inteiro $\lfloor (n + 2p - k)/s \rfloor + 1$.
2. Quando o filtro não cabe na imagem com padding ($k > n + 2p$), `forma_de_saida` levanta `ValueError`.
3. `aplicar_sobel(imagem)` aplica `SOBEL_X` e `SOBEL_Y` com padding 1 e stride 1 e devolve a magnitude $\sqrt{G_x^2 + G_y^2}$, com a mesma forma da imagem, sem alterar a imagem recebida.

### Código inicial
```python
import numpy as np
from conv import conv2d_laco

SOBEL_X = np.array([[-1.0, 0.0, 1.0], [-2.0, 0.0, 2.0], [-1.0, 0.0, 1.0]])
SOBEL_Y = SOBEL_X.T


def forma_de_saida(n, k, p, s):
    # Escreva aqui
    pass


def aplicar_sobel(imagem):
    # Escreva aqui
    pass
```
```python path=conv.py
import numpy as np


def conv2d_laco(imagem, filtro, padding=0, stride=1):
    """Correlação cruzada de uma imagem (H, W) com um filtro (k, k)."""
    k = filtro.shape[0]
    P = np.pad(imagem, padding)
    h = (P.shape[0] - k) // stride + 1
    w = (P.shape[1] - k) // stride + 1
    saida = np.zeros((h, w))
    for i in range(h):
        for j in range(w):
            janela = P[i * stride:i * stride + k, j * stride:j * stride + k]
            saida[i, j] = np.sum(janela * filtro)
    return saida
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
from conv import conv2d_laco

SOBEL_X = np.array([[-1.0, 0.0, 1.0], [-2.0, 0.0, 2.0], [-1.0, 0.0, 1.0]])
SOBEL_Y = SOBEL_X.T


def forma_de_saida(n, k, p, s):
    if k > n + 2 * p:
        raise ValueError("o filtro não cabe na imagem")
    return (n + 2 * p - k) // s + 1


def aplicar_sobel(imagem):
    gx = conv2d_laco(imagem, SOBEL_X, padding=1)
    gy = conv2d_laco(imagem, SOBEL_Y, padding=1)
    return np.sqrt(gx ** 2 + gy ** 2)
```
```python path=conv.py
import numpy as np


def conv2d_laco(imagem, filtro, padding=0, stride=1):
    """Correlação cruzada de uma imagem (H, W) com um filtro (k, k)."""
    k = filtro.shape[0]
    P = np.pad(imagem, padding)
    h = (P.shape[0] - k) // stride + 1
    w = (P.shape[1] - k) // stride + 1
    saida = np.zeros((h, w))
    for i in range(h):
        for j in range(w):
            janela = P[i * stride:i * stride + k, j * stride:j * stride + k]
            saida[i, j] = np.sum(janela * filtro)
    return saida
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
1. A divisão da fórmula é inteira (`//`), e o teste do filtro que não cabe vem antes da conta.
2. `conv2d_laco(imagem, SOBEL_X, padding=1)` devolve $G_x$ com a forma da imagem.
3. `np.sqrt` e `**` trabalham elemento a elemento: a magnitude sai numa linha.

### Verificação
```json
[
  {"id": "sem-padding", "checkpoint": 1, "kind": "call", "function": "forma_de_saida", "args": [8, 3, 0, 1], "expected": 6, "name": "Lado 8, filtro 3, sem padding, stride 1: 6"},
  {"id": "com-padding", "checkpoint": 1, "kind": "call", "function": "forma_de_saida", "args": [8, 3, 1, 1], "expected": 8, "name": "Lado 8, filtro 3, padding 1: continua 8", "hint": "O padding entra dos dois lados: 2p."},
  {"id": "stride-2", "checkpoint": 1, "kind": "call", "function": "forma_de_saida", "args": [8, 3, 1, 2], "expected": 4, "name": "Lado 8, filtro 3, padding 1, stride 2: 4", "hint": "A divisão é inteira e arredonda para baixo."},
  {"id": "sobra", "checkpoint": 1, "kind": "call", "function": "forma_de_saida", "args": [7, 2, 0, 2], "expected": 3, "name": "Lado 7, filtro 2, stride 2: 3 (a sobra é descartada)"},
  {"id": "filtro-do-tamanho", "checkpoint": 1, "kind": "call", "function": "forma_de_saida", "args": [5, 5, 0, 1], "expected": 1, "name": "Filtro do tamanho da imagem: uma posição só"},
  {"id": "tipo-inteiro", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np", "expr": "type(forma_de_saida(8, 3, 1, 2)).__name__", "expected": "int", "name": "O resultado é um int", "hint": "Use // no lugar de /."},
  {"id": "nao-cabe", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np", "expr": "forma_de_saida(2, 3, 0, 1)", "raises": "ValueError", "name": "Filtro 3 numa imagem de lado 2 sem padding levanta ValueError"},
  {"id": "cabe-com-padding", "checkpoint": 2, "kind": "call", "function": "forma_de_saida", "args": [2, 3, 1, 1], "expected": 2, "name": "Filtro 3 numa imagem de lado 2 com padding 1 cabe: 2", "hint": "O teste do filtro que não cabe considera o padding."},
  {"id": "sobel-forma", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom digitos import desenhos\nfrom conv import conv2d_laco as _conv\n_sx = np.array([[-1.0, 0.0, 1.0], [-2.0, 0.0, 2.0], [-1.0, 0.0, 1.0]])\ndef _ref(img):\n    return np.sqrt(_conv(img, _sx, 1) ** 2 + _conv(img, _sx.T, 1) ** 2)", "expr": "list(aplicar_sobel(desenhos()[1]).shape)", "expected": [8, 8], "name": "A magnitude tem a forma da imagem (8 × 8)", "hint": "Use padding 1 nas duas convoluções."},
  {"id": "sobel-borda-vertical", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom digitos import desenhos\nfrom conv import conv2d_laco as _conv\n_sx = np.array([[-1.0, 0.0, 1.0], [-2.0, 0.0, 2.0], [-1.0, 0.0, 1.0]])\ndef _ref(img):\n    return np.sqrt(_conv(img, _sx, 1) ** 2 + _conv(img, _sx.T, 1) ** 2)\nimg = np.zeros((4, 4))\nimg[:, 2:] = 1.0", "expr": "aplicar_sobel(img)[1].tolist()", "expected": [0.0, 4.0, 4.0, 4.0], "tolerance": 1e-12, "name": "Borda vertical: a linha 1 da magnitude", "hint": "A magnitude é a raiz da soma dos quadrados."},
  {"id": "sobel-canto", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom digitos import desenhos\nfrom conv import conv2d_laco as _conv\n_sx = np.array([[-1.0, 0.0, 1.0], [-2.0, 0.0, 2.0], [-1.0, 0.0, 1.0]])\ndef _ref(img):\n    return np.sqrt(_conv(img, _sx, 1) ** 2 + _conv(img, _sx.T, 1) ** 2)\nimg = np.zeros((4, 4))\nimg[2:, 2:] = 1.0", "expr": "[round(float(v), 6) for v in aplicar_sobel(img)[1]]", "expected": [0.0, 1.414214, 3.162278, 3.162278], "tolerance": 1e-06, "name": "Canto de um quadrado: Gx e Gy diferentes de zero no mesmo pixel", "hint": "Gx e Gy entram ao quadrado antes da soma."},
  {"id": "sobel-digito", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom digitos import desenhos\nfrom conv import conv2d_laco as _conv\n_sx = np.array([[-1.0, 0.0, 1.0], [-2.0, 0.0, 2.0], [-1.0, 0.0, 1.0]])\ndef _ref(img):\n    return np.sqrt(_conv(img, _sx, 1) ** 2 + _conv(img, _sx.T, 1) ** 2)", "expr": "bool(np.allclose(aplicar_sobel(desenhos()[7]), _ref(desenhos()[7]), atol=1e-12))", "expected": true, "name": "Magnitude do desenho do 7 igual à da referência", "hint": "SOBEL_X dá Gx e SOBEL_Y dá Gy."},
  {"id": "sobel-nao-altera", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom digitos import desenhos\nfrom conv import conv2d_laco as _conv\n_sx = np.array([[-1.0, 0.0, 1.0], [-2.0, 0.0, 2.0], [-1.0, 0.0, 1.0]])\ndef _ref(img):\n    return np.sqrt(_conv(img, _sx, 1) ** 2 + _conv(img, _sx.T, 1) ** 2)\nimg = desenhos()[4]\ncopia = img.copy()\naplicar_sobel(img)", "expr": "bool(np.array_equal(img, copia))", "expected": true, "name": "A imagem recebida não muda"}
]
```

### Soluções erradas
```python name="forma arredondada para cima"
import math
import numpy as np
from conv import conv2d_laco

SOBEL_X = np.array([[-1.0, 0.0, 1.0], [-2.0, 0.0, 2.0], [-1.0, 0.0, 1.0]])
SOBEL_Y = SOBEL_X.T


def forma_de_saida(n, k, p, s):
    if k > n + 2 * p:
        raise ValueError("o filtro não cabe na imagem")
    return math.ceil((n + 2 * p - k) / s) + 1


def aplicar_sobel(imagem):
    gx = conv2d_laco(imagem, SOBEL_X, padding=1)
    gy = conv2d_laco(imagem, SOBEL_Y, padding=1)
    return np.sqrt(gx ** 2 + gy ** 2)
```
```python name="padding contado de um lado só"
import numpy as np
from conv import conv2d_laco

SOBEL_X = np.array([[-1.0, 0.0, 1.0], [-2.0, 0.0, 2.0], [-1.0, 0.0, 1.0]])
SOBEL_Y = SOBEL_X.T


def forma_de_saida(n, k, p, s):
    if k > n + 2 * p:
        raise ValueError("o filtro não cabe na imagem")
    return (n + p - k) // s + 1


def aplicar_sobel(imagem):
    gx = conv2d_laco(imagem, SOBEL_X, padding=1)
    gy = conv2d_laco(imagem, SOBEL_Y, padding=1)
    return np.sqrt(gx ** 2 + gy ** 2)
```
```python name="forma sem o + 1"
import numpy as np
from conv import conv2d_laco

SOBEL_X = np.array([[-1.0, 0.0, 1.0], [-2.0, 0.0, 2.0], [-1.0, 0.0, 1.0]])
SOBEL_Y = SOBEL_X.T


def forma_de_saida(n, k, p, s):
    if k > n + 2 * p:
        raise ValueError("o filtro não cabe na imagem")
    return (n + 2 * p - k) // s


def aplicar_sobel(imagem):
    gx = conv2d_laco(imagem, SOBEL_X, padding=1)
    gy = conv2d_laco(imagem, SOBEL_Y, padding=1)
    return np.sqrt(gx ** 2 + gy ** 2)
```
```python name="divisão real devolve float"
import numpy as np
from conv import conv2d_laco

SOBEL_X = np.array([[-1.0, 0.0, 1.0], [-2.0, 0.0, 2.0], [-1.0, 0.0, 1.0]])
SOBEL_Y = SOBEL_X.T


def forma_de_saida(n, k, p, s):
    if k > n + 2 * p:
        raise ValueError("o filtro não cabe na imagem")
    return (n + 2 * p - k) / s + 1


def aplicar_sobel(imagem):
    gx = conv2d_laco(imagem, SOBEL_X, padding=1)
    gy = conv2d_laco(imagem, SOBEL_Y, padding=1)
    return np.sqrt(gx ** 2 + gy ** 2)
```
```python name="filtro que não cabe sem ValueError"
import numpy as np
from conv import conv2d_laco

SOBEL_X = np.array([[-1.0, 0.0, 1.0], [-2.0, 0.0, 2.0], [-1.0, 0.0, 1.0]])
SOBEL_Y = SOBEL_X.T


def forma_de_saida(n, k, p, s):
    return (n + 2 * p - k) // s + 1


def aplicar_sobel(imagem):
    gx = conv2d_laco(imagem, SOBEL_X, padding=1)
    gy = conv2d_laco(imagem, SOBEL_Y, padding=1)
    return np.sqrt(gx ** 2 + gy ** 2)
```
```python name="ValueError sem contar o padding"
import numpy as np
from conv import conv2d_laco

SOBEL_X = np.array([[-1.0, 0.0, 1.0], [-2.0, 0.0, 2.0], [-1.0, 0.0, 1.0]])
SOBEL_Y = SOBEL_X.T


def forma_de_saida(n, k, p, s):
    if k > n:
        raise ValueError("o filtro não cabe na imagem")
    return (n + 2 * p - k) // s + 1


def aplicar_sobel(imagem):
    gx = conv2d_laco(imagem, SOBEL_X, padding=1)
    gy = conv2d_laco(imagem, SOBEL_Y, padding=1)
    return np.sqrt(gx ** 2 + gy ** 2)
```
```python name="Sobel sem padding"
import numpy as np
from conv import conv2d_laco

SOBEL_X = np.array([[-1.0, 0.0, 1.0], [-2.0, 0.0, 2.0], [-1.0, 0.0, 1.0]])
SOBEL_Y = SOBEL_X.T


def forma_de_saida(n, k, p, s):
    if k > n + 2 * p:
        raise ValueError("o filtro não cabe na imagem")
    return (n + 2 * p - k) // s + 1


def aplicar_sobel(imagem):
    gx = conv2d_laco(imagem, SOBEL_X)
    gy = conv2d_laco(imagem, SOBEL_Y)
    return np.sqrt(gx ** 2 + gy ** 2)
```
```python name="magnitude sem a raiz"
import numpy as np
from conv import conv2d_laco

SOBEL_X = np.array([[-1.0, 0.0, 1.0], [-2.0, 0.0, 2.0], [-1.0, 0.0, 1.0]])
SOBEL_Y = SOBEL_X.T


def forma_de_saida(n, k, p, s):
    if k > n + 2 * p:
        raise ValueError("o filtro não cabe na imagem")
    return (n + 2 * p - k) // s + 1


def aplicar_sobel(imagem):
    gx = conv2d_laco(imagem, SOBEL_X, padding=1)
    gy = conv2d_laco(imagem, SOBEL_Y, padding=1)
    return gx ** 2 + gy ** 2
```
```python name="soma Gx e Gy sem elevar ao quadrado"
import numpy as np
from conv import conv2d_laco

SOBEL_X = np.array([[-1.0, 0.0, 1.0], [-2.0, 0.0, 2.0], [-1.0, 0.0, 1.0]])
SOBEL_Y = SOBEL_X.T


def forma_de_saida(n, k, p, s):
    if k > n + 2 * p:
        raise ValueError("o filtro não cabe na imagem")
    return (n + 2 * p - k) // s + 1


def aplicar_sobel(imagem):
    gx = conv2d_laco(imagem, SOBEL_X, padding=1)
    gy = conv2d_laco(imagem, SOBEL_Y, padding=1)
    return np.abs(gx + gy)
```
```python name="usa SOBEL_X nas duas direções"
import numpy as np
from conv import conv2d_laco

SOBEL_X = np.array([[-1.0, 0.0, 1.0], [-2.0, 0.0, 2.0], [-1.0, 0.0, 1.0]])
SOBEL_Y = SOBEL_X.T


def forma_de_saida(n, k, p, s):
    if k > n + 2 * p:
        raise ValueError("o filtro não cabe na imagem")
    return (n + 2 * p - k) // s + 1


def aplicar_sobel(imagem):
    gx = conv2d_laco(imagem, SOBEL_X, padding=1)
    gy = conv2d_laco(imagem, SOBEL_X, padding=1)
    return np.sqrt(gx ** 2 + gy ** 2)
```

## Passo 6 · Leitura · Do laço às matrizes

Uma camada convolucional de verdade recebe um lote de imagens com vários canais e aplica vários filtros de uma vez. As formas passam a ter quatro eixos:

- a entrada `X` tem forma `(N, C, H, W)`: `N` imagens, `C` canais, altura e largura;
- os filtros `F` têm forma `(F, C, k, k)`: cada filtro tem uma fatia $k \times k$ por canal da entrada, e a janela que ele multiplica tem $C \cdot k \cdot k$ números;
- a saída tem forma `(N, F, H_s, W_s)`: um **mapa de ativação** por filtro, mais um viés por filtro.

Com laços, são quatro `for` aninhados. Medido no executor do curso, com 100 imagens 8 × 8, 8 filtros 3 × 3 e padding 1: cerca de 220 ms, para 51 200 janelas.

A saída é o **im2col**: estender cada janela numa **linha** de $C \cdot k \cdot k$ números. As janelas viram uma matriz `cols` de forma `(N · H_s · W_s, C · k · k)`, os filtros viram uma matriz `(F, C · k · k)`, e a convolução inteira é o produto de matrizes de uma camada densa:

```python
janelas = np.lib.stride_tricks.sliding_window_view(Xp, (k, k), axis=(2, 3))
# janelas.shape == (N, C, H_s, W_s, k, k)
cols = janelas.transpose(0, 2, 3, 1, 4, 5).reshape(N * H_s * W_s, C * k * k)
saida = cols @ F.reshape(n_filtros, C * k * k).T + b      # (N · H_s · W_s, F)
saida = saida.reshape(N, H_s, W_s, n_filtros).transpose(0, 3, 1, 2)
```

`sliding_window_view` devolve todas as janelas de `Xp` (a entrada já com padding) sem copiar nada e sem `for`. Os dois `transpose` são o ponto delicado. O `reshape` junta eixos vizinhos na ordem em que estão: para cada linha de `cols` seguir a ordem de `F.reshape(...)` (canal, linha e coluna do filtro), o eixo dos canais vai para junto dos dois eixos `k` **antes** do `reshape`. Na volta, o filtro está no último eixo, e o segundo `transpose` o leva para a posição 1. Sem eles o código roda, a forma sai certa e os números saem embaralhados.

Outro jeito de montar `cols`, comum em livros, é um laço só sobre as $k^2$ posições do filtro, copiando uma fatia da imagem por posição: nove voltas no lugar de 51 200.

A versão vetorizada leva 0,5 ms no mesmo problema: mais de 400 vezes menos. As duas fazem as mesmas 460 800 multiplicações; muda quem dá as voltas, o interpretador ou o código compilado do numpy.

## Passo 7 · Exercício · Convolução vetorizada

Escreva `conv2d_rapida(X, F, b, padding=0)`, a convolução com stride 1 de um lote `X` de forma `(N, C, H, W)` com os filtros `F` de forma `(F, C, k, k)` e os vieses `b` de forma `(F,)`. As imagens podem não ser quadradas.

### Instruções
1. A função devolve um array `(N, F, H_s, W_s)` e não usa `for` nem compreensão de lista: as janelas vêm de `np.lib.stride_tricks.sliding_window_view`.
2. Com vários canais e vários filtros, a posição `[n, f, i, j]` da saída é a soma dos produtos entre o filtro `f` e a janela da imagem `n` que começa em `(i, j)`, em todos os canais.
3. O viés `b[f]` é somado a todas as posições do mapa do filtro `f`.
4. O `padding` acrescenta zeros só na altura e na largura, dos dois lados.

### Código inicial
```python
import numpy as np


def conv2d_rapida(X, F, b, padding=0):
    # Escreva aqui
    pass
```

### Solução
```python
import numpy as np


def conv2d_rapida(X, F, b, padding=0):
    N, C = X.shape[:2]
    n_filtros, k = F.shape[0], F.shape[2]
    Xp = np.pad(X, ((0, 0), (0, 0), (padding, padding), (padding, padding)))
    janelas = np.lib.stride_tricks.sliding_window_view(Xp, (k, k), axis=(2, 3))
    hs, ws = janelas.shape[2], janelas.shape[3]
    cols = janelas.transpose(0, 2, 3, 1, 4, 5).reshape(N * hs * ws, C * k * k)
    saida = cols @ F.reshape(n_filtros, C * k * k).T + b
    return saida.reshape(N, hs, ws, n_filtros).transpose(0, 3, 1, 2)
```

### Dicas
1. `np.pad` aceita um par `(antes, depois)` por eixo: os eixos do lote e dos canais ficam com `(0, 0)`.
2. As janelas saem com forma `(N, C, H_s, W_s, k, k)`; leve o eixo dos canais para junto dos dois últimos antes do `reshape`.
3. Some o viés enquanto o filtro ainda é o último eixo, e só depois reorganize para `(N, F, H_s, W_s)`.

### Verificação
```json
[
  {"id": "sem-for", "checkpoint": 1, "kind": "source", "rule": {"type": "not_uses", "construct": "for", "function": "conv2d_rapida"}, "name": "Sem laço for dentro de conv2d_rapida", "hint": "As janelas vêm de sliding_window_view, sem percorrer posições."},
  {"id": "sem-compreensao", "checkpoint": 1, "kind": "source", "rule": {"type": "not_uses", "construct": "list_comprehension", "function": "conv2d_rapida"}, "name": "Sem compreensão de lista dentro de conv2d_rapida", "hint": "Uma compreensão é um laço disfarçado."},
  {"id": "literal", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np", "expr": "conv2d_rapida(np.arange(16.0).reshape(1, 1, 4, 4), np.ones((1, 1, 2, 2)), np.zeros(1)).tolist()", "expected": [[[[10.0, 14.0, 18.0], [26.0, 30.0, 34.0], [42.0, 46.0, 50.0]]]], "tolerance": 1e-12, "name": "Uma imagem 4 × 4, um filtro 2 × 2 de uns: somas das janelas"},
  {"id": "um-canal", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\ndef _ref(X, F, b, p):\n    N, C, H, W = X.shape\n    nf, k = F.shape[0], F.shape[2]\n    Xp = np.pad(X, ((0, 0), (0, 0), (p, p), (p, p)))\n    hs, ws = H + 2 * p - k + 1, W + 2 * p - k + 1\n    S = np.zeros((N, nf, hs, ws))\n    for n in range(N):\n        for f in range(nf):\n            for i in range(hs):\n                for j in range(ws):\n                    S[n, f, i, j] = np.sum(Xp[n, :, i:i + k, j:j + k] * F[f]) + b[f]\n    return S\n_r = np.random.default_rng(5)\nX = _r.normal(size=(2, 1, 8, 8))\nF = _r.normal(size=(1, 1, 3, 3))\nb = _r.normal(size=1)\nS = conv2d_rapida(X, F, b, 0)\n_S = _ref(X, F, b, 0)", "expr": "[list(S.shape) == list(_S.shape), bool(S.shape == _S.shape and np.allclose(S, _S, atol=1e-12))]", "expected": [true, true], "name": "Um canal e um filtro: forma e valores iguais aos da referência com laços", "hint": "Os filtros não são invertidos."},
  {"id": "forma", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np", "expr": "list(conv2d_rapida(np.zeros((3, 2, 8, 8)), np.zeros((4, 2, 3, 3)), np.zeros(4)).shape)", "expected": [3, 4, 6, 6], "name": "3 imagens, 2 canais, 4 filtros 3 × 3 em 8 × 8: saída (3, 4, 6, 6)"},
  {"id": "varios-canais", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\ndef _ref(X, F, b, p):\n    N, C, H, W = X.shape\n    nf, k = F.shape[0], F.shape[2]\n    Xp = np.pad(X, ((0, 0), (0, 0), (p, p), (p, p)))\n    hs, ws = H + 2 * p - k + 1, W + 2 * p - k + 1\n    S = np.zeros((N, nf, hs, ws))\n    for n in range(N):\n        for f in range(nf):\n            for i in range(hs):\n                for j in range(ws):\n                    S[n, f, i, j] = np.sum(Xp[n, :, i:i + k, j:j + k] * F[f]) + b[f]\n    return S\n_r = np.random.default_rng(5)\nX = _r.normal(size=(2, 3, 6, 6))\nF = _r.normal(size=(1, 3, 3, 3))\nb = _r.normal(size=1)\nS = conv2d_rapida(X, F, b, 0)\n_S = _ref(X, F, b, 0)", "expr": "[list(S.shape) == list(_S.shape), bool(S.shape == _S.shape and np.allclose(S, _S, atol=1e-12))]", "expected": [true, true], "name": "Três canais e um filtro: igual à referência", "hint": "Leve o eixo dos canais para junto dos eixos k antes do reshape."},
  {"id": "varios-filtros", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\ndef _ref(X, F, b, p):\n    N, C, H, W = X.shape\n    nf, k = F.shape[0], F.shape[2]\n    Xp = np.pad(X, ((0, 0), (0, 0), (p, p), (p, p)))\n    hs, ws = H + 2 * p - k + 1, W + 2 * p - k + 1\n    S = np.zeros((N, nf, hs, ws))\n    for n in range(N):\n        for f in range(nf):\n            for i in range(hs):\n                for j in range(ws):\n                    S[n, f, i, j] = np.sum(Xp[n, :, i:i + k, j:j + k] * F[f]) + b[f]\n    return S\n_r = np.random.default_rng(5)\nX = _r.normal(size=(2, 1, 6, 6))\nF = _r.normal(size=(3, 1, 3, 3))\nb = _r.normal(size=3)\nS = conv2d_rapida(X, F, b, 0)\n_S = _ref(X, F, b, 0)", "expr": "[list(S.shape) == list(_S.shape), bool(S.shape == _S.shape and np.allclose(S, _S, atol=1e-12))]", "expected": [true, true], "name": "Um canal e três filtros: igual à referência", "hint": "Depois do produto, o filtro é o último eixo: use transpose para levá-lo à posição 1."},
  {"id": "nao-quadrada", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\ndef _ref(X, F, b, p):\n    N, C, H, W = X.shape\n    nf, k = F.shape[0], F.shape[2]\n    Xp = np.pad(X, ((0, 0), (0, 0), (p, p), (p, p)))\n    hs, ws = H + 2 * p - k + 1, W + 2 * p - k + 1\n    S = np.zeros((N, nf, hs, ws))\n    for n in range(N):\n        for f in range(nf):\n            for i in range(hs):\n                for j in range(ws):\n                    S[n, f, i, j] = np.sum(Xp[n, :, i:i + k, j:j + k] * F[f]) + b[f]\n    return S\n_r = np.random.default_rng(5)\nX = _r.normal(size=(2, 2, 5, 7))\nF = _r.normal(size=(2, 2, 3, 3))\nb = _r.normal(size=2)\nS = conv2d_rapida(X, F, b, 0)\n_S = _ref(X, F, b, 0)", "expr": "[list(S.shape) == list(_S.shape), bool(S.shape == _S.shape and np.allclose(S, _S, atol=1e-12))]", "expected": [true, true], "name": "Imagens 5 × 7 com 2 canais e 2 filtros: igual à referência"},
  {"id": "filtro-1x1", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\ndef _ref(X, F, b, p):\n    N, C, H, W = X.shape\n    nf, k = F.shape[0], F.shape[2]\n    Xp = np.pad(X, ((0, 0), (0, 0), (p, p), (p, p)))\n    hs, ws = H + 2 * p - k + 1, W + 2 * p - k + 1\n    S = np.zeros((N, nf, hs, ws))\n    for n in range(N):\n        for f in range(nf):\n            for i in range(hs):\n                for j in range(ws):\n                    S[n, f, i, j] = np.sum(Xp[n, :, i:i + k, j:j + k] * F[f]) + b[f]\n    return S\n_r = np.random.default_rng(5)\nX = _r.normal(size=(2, 3, 4, 4))\nF = _r.normal(size=(2, 3, 1, 1))\nb = _r.normal(size=2)\nS = conv2d_rapida(X, F, b, 0)\n_S = _ref(X, F, b, 0)", "expr": "[list(S.shape) == list(_S.shape), bool(S.shape == _S.shape and np.allclose(S, _S, atol=1e-12))]", "expected": [true, true], "name": "Filtros 1 × 1 misturam os canais pixel a pixel: igual à referência"},
  {"id": "vies-por-filtro", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np", "expr": "conv2d_rapida(np.zeros((1, 1, 5, 6)), np.ones((3, 1, 3, 3)), np.array([1.0, -2.0, 0.5]))[0, :, 0, 0].tolist()", "expected": [1.0, -2.0, 0.5], "tolerance": 1e-12, "name": "Entrada de zeros: cada mapa vale o viés do seu filtro", "hint": "São F vieses, um por filtro."},
  {"id": "vies-largura-igual", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\ndef _ref(X, F, b, p):\n    N, C, H, W = X.shape\n    nf, k = F.shape[0], F.shape[2]\n    Xp = np.pad(X, ((0, 0), (0, 0), (p, p), (p, p)))\n    hs, ws = H + 2 * p - k + 1, W + 2 * p - k + 1\n    S = np.zeros((N, nf, hs, ws))\n    for n in range(N):\n        for f in range(nf):\n            for i in range(hs):\n                for j in range(ws):\n                    S[n, f, i, j] = np.sum(Xp[n, :, i:i + k, j:j + k] * F[f]) + b[f]\n    return S\n_r = np.random.default_rng(5)\nX = _r.normal(size=(1, 1, 5, 5))\nF = _r.normal(size=(3, 1, 3, 3))\nb = _r.normal(size=3)\nS = conv2d_rapida(X, F, b, 0)\n_S = _ref(X, F, b, 0)", "expr": "[list(S.shape) == list(_S.shape), bool(S.shape == _S.shape and np.allclose(S, _S, atol=1e-12))]", "expected": [true, true], "name": "Três filtros e saída de largura 3: o viés vai no eixo dos filtros, não no da largura", "hint": "Some b enquanto o filtro ainda é o último eixo."},
  {"id": "padding-1", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\ndef _ref(X, F, b, p):\n    N, C, H, W = X.shape\n    nf, k = F.shape[0], F.shape[2]\n    Xp = np.pad(X, ((0, 0), (0, 0), (p, p), (p, p)))\n    hs, ws = H + 2 * p - k + 1, W + 2 * p - k + 1\n    S = np.zeros((N, nf, hs, ws))\n    for n in range(N):\n        for f in range(nf):\n            for i in range(hs):\n                for j in range(ws):\n                    S[n, f, i, j] = np.sum(Xp[n, :, i:i + k, j:j + k] * F[f]) + b[f]\n    return S\n_r = np.random.default_rng(5)\nX = _r.normal(size=(2, 2, 6, 6))\nF = _r.normal(size=(2, 2, 3, 3))\nb = _r.normal(size=2)\nS = conv2d_rapida(X, F, b, 1)\n_S = _ref(X, F, b, 1)", "expr": "[list(S.shape) == list(_S.shape), bool(S.shape == _S.shape and np.allclose(S, _S, atol=1e-12))]", "expected": [true, true], "name": "Padding 1 com filtros 3 × 3: a saída mantém 6 × 6 e é igual à referência", "hint": "O padding vale só para a altura e a largura."},
  {"id": "padding-2", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\ndef _ref(X, F, b, p):\n    N, C, H, W = X.shape\n    nf, k = F.shape[0], F.shape[2]\n    Xp = np.pad(X, ((0, 0), (0, 0), (p, p), (p, p)))\n    hs, ws = H + 2 * p - k + 1, W + 2 * p - k + 1\n    S = np.zeros((N, nf, hs, ws))\n    for n in range(N):\n        for f in range(nf):\n            for i in range(hs):\n                for j in range(ws):\n                    S[n, f, i, j] = np.sum(Xp[n, :, i:i + k, j:j + k] * F[f]) + b[f]\n    return S\n_r = np.random.default_rng(5)\nX = _r.normal(size=(1, 2, 4, 5))\nF = _r.normal(size=(3, 2, 5, 5))\nb = _r.normal(size=3)\nS = conv2d_rapida(X, F, b, 2)\n_S = _ref(X, F, b, 2)", "expr": "[list(S.shape) == list(_S.shape), bool(S.shape == _S.shape and np.allclose(S, _S, atol=1e-12))]", "expected": [true, true], "name": "Padding 2 com filtros 5 × 5 em imagens 4 × 5: igual à referência"}
]
```

### Soluções erradas
```python name="colunas do im2col na ordem errada (sem o transpose)"
import numpy as np


def conv2d_rapida(X, F, b, padding=0):
    N, C = X.shape[:2]
    n_filtros, k = F.shape[0], F.shape[2]
    Xp = np.pad(X, ((0, 0), (0, 0), (padding, padding), (padding, padding)))
    janelas = np.lib.stride_tricks.sliding_window_view(Xp, (k, k), axis=(2, 3))
    hs, ws = janelas.shape[2], janelas.shape[3]
    cols = janelas.reshape(N * hs * ws, C * k * k)
    saida = cols @ F.reshape(n_filtros, C * k * k).T + b
    return saida.reshape(N, hs, ws, n_filtros).transpose(0, 3, 1, 2)
```
```python name="saída reorganizada com reshape no lugar do transpose"
import numpy as np


def conv2d_rapida(X, F, b, padding=0):
    N, C = X.shape[:2]
    n_filtros, k = F.shape[0], F.shape[2]
    Xp = np.pad(X, ((0, 0), (0, 0), (padding, padding), (padding, padding)))
    janelas = np.lib.stride_tricks.sliding_window_view(Xp, (k, k), axis=(2, 3))
    hs, ws = janelas.shape[2], janelas.shape[3]
    cols = janelas.transpose(0, 2, 3, 1, 4, 5).reshape(N * hs * ws, C * k * k)
    saida = cols @ F.reshape(n_filtros, C * k * k).T + b
    return saida.reshape(N, n_filtros, hs, ws)
```
```python name="viés esquecido"
import numpy as np


def conv2d_rapida(X, F, b, padding=0):
    N, C = X.shape[:2]
    n_filtros, k = F.shape[0], F.shape[2]
    Xp = np.pad(X, ((0, 0), (0, 0), (padding, padding), (padding, padding)))
    janelas = np.lib.stride_tricks.sliding_window_view(Xp, (k, k), axis=(2, 3))
    hs, ws = janelas.shape[2], janelas.shape[3]
    cols = janelas.transpose(0, 2, 3, 1, 4, 5).reshape(N * hs * ws, C * k * k)
    saida = cols @ F.reshape(n_filtros, C * k * k).T
    return saida.reshape(N, hs, ws, n_filtros).transpose(0, 3, 1, 2)
```
```python name="viés somado depois do transpose (cai no eixo da largura)"
import numpy as np


def conv2d_rapida(X, F, b, padding=0):
    N, C = X.shape[:2]
    n_filtros, k = F.shape[0], F.shape[2]
    Xp = np.pad(X, ((0, 0), (0, 0), (padding, padding), (padding, padding)))
    janelas = np.lib.stride_tricks.sliding_window_view(Xp, (k, k), axis=(2, 3))
    hs, ws = janelas.shape[2], janelas.shape[3]
    cols = janelas.transpose(0, 2, 3, 1, 4, 5).reshape(N * hs * ws, C * k * k)
    saida = cols @ F.reshape(n_filtros, C * k * k).T
    return saida.reshape(N, hs, ws, n_filtros).transpose(0, 3, 1, 2) + b
```
```python name="padding também nos eixos do lote e dos canais"
import numpy as np


def conv2d_rapida(X, F, b, padding=0):
    Xp = np.pad(X, padding)
    N, C = Xp.shape[:2]
    n_filtros, k = F.shape[0], F.shape[2]
    janelas = np.lib.stride_tricks.sliding_window_view(Xp, (k, k), axis=(2, 3))
    hs, ws = janelas.shape[2], janelas.shape[3]
    cols = janelas.transpose(0, 2, 3, 1, 4, 5).reshape(N * hs * ws, C * k * k)
    saida = cols @ F.reshape(n_filtros, C * k * k).T + b
    return saida.reshape(N, hs, ws, n_filtros).transpose(0, 3, 1, 2)
```
```python name="padding ignorado"
import numpy as np


def conv2d_rapida(X, F, b, padding=0):
    N, C = X.shape[:2]
    n_filtros, k = F.shape[0], F.shape[2]
    janelas = np.lib.stride_tricks.sliding_window_view(X, (k, k), axis=(2, 3))
    hs, ws = janelas.shape[2], janelas.shape[3]
    cols = janelas.transpose(0, 2, 3, 1, 4, 5).reshape(N * hs * ws, C * k * k)
    saida = cols @ F.reshape(n_filtros, C * k * k).T + b
    return saida.reshape(N, hs, ws, n_filtros).transpose(0, 3, 1, 2)
```
```python name="filtros invertidos"
import numpy as np


def conv2d_rapida(X, F, b, padding=0):
    N, C = X.shape[:2]
    n_filtros, k = F.shape[0], F.shape[2]
    Xp = np.pad(X, ((0, 0), (0, 0), (padding, padding), (padding, padding)))
    janelas = np.lib.stride_tricks.sliding_window_view(Xp, (k, k), axis=(2, 3))
    hs, ws = janelas.shape[2], janelas.shape[3]
    cols = janelas.transpose(0, 2, 3, 1, 4, 5).reshape(N * hs * ws, C * k * k)
    saida = cols @ F[:, :, ::-1, ::-1].reshape(n_filtros, C * k * k).T + b
    return saida.reshape(N, hs, ws, n_filtros).transpose(0, 3, 1, 2)
```
```python name="laço for sobre as posições"
import numpy as np


def conv2d_rapida(X, F, b, padding=0):
    N, C = X.shape[:2]
    n_filtros, k = F.shape[0], F.shape[2]
    Xp = np.pad(X, ((0, 0), (0, 0), (padding, padding), (padding, padding)))
    hs, ws = Xp.shape[2] - k + 1, Xp.shape[3] - k + 1
    saida = np.zeros((N, n_filtros, hs, ws))
    for i in range(hs):
        for j in range(ws):
            janela = Xp[:, :, i:i + k, j:j + k].reshape(N, C * k * k)
            saida[:, :, i, j] = janela @ F.reshape(n_filtros, C * k * k).T + b
    return saida
```
```python name="laço escondido numa compreensão de lista"
import numpy as np


def conv2d_rapida(X, F, b, padding=0):
    N, C = X.shape[:2]
    n_filtros, k = F.shape[0], F.shape[2]
    Xp = np.pad(X, ((0, 0), (0, 0), (padding, padding), (padding, padding)))
    hs, ws = Xp.shape[2] - k + 1, Xp.shape[3] - k + 1
    W = F.reshape(n_filtros, C * k * k).T
    mapas = [[Xp[:, :, i:i + k, j:j + k].reshape(N, C * k * k) @ W + b for j in range(ws)] for i in range(hs)]
    return np.array(mapas).transpose(2, 3, 0, 1)
```

## Passo 8 · Quiz · Padding e custo

### Pergunta
Uma camada usa filtros 5 × 5 com stride 1 em imagens 8 × 8, e a saída precisa continuar 8 × 8 para a camada seguinte. Qual padding resolve?
- [ ] 1
- [x] 2
- [ ] 4
- [ ] 5
> O lado da saída é $(8 + 2p - 5) + 1 = 4 + 2p$, que vale 8 com $p = 2$: para manter o tamanho com stride 1, o padding é $(k - 1)/2$. Com $p = 1$ a saída tem lado 6 (esse é o padding que mantém o tamanho de um filtro 3 × 3). Com $p = 4$ a saída cresce para 12, e com $p = 5$ (o lado do filtro) cresce para 14.

### Pergunta
Um lote de 100 imagens 8 × 8 de um canal passa por 8 filtros 3 × 3 com padding 1. No executor do curso, a função com laços leva cerca de 220 ms e a vetorizada, 0,5 ms. O que explica a diferença?
- [ ] A versão vetorizada faz menos multiplicações, porque o im2col descarta as janelas repetidas
- [ ] A versão com laços recalcula o padding a cada janela, e a vetorizada calcula uma vez
- [ ] A versão vetorizada usa `float32`, que o processador multiplica mais depressa
- [x] As duas fazem as mesmas 460 800 multiplicações, mas a com laços paga uma volta do interpretador em cada uma das 51 200 janelas
> São $100 \cdot 8 \cdot 64 = 51\,200$ janelas de 9 números, 460 800 multiplicações nas duas versões; o que muda é que o produto de matrizes roda em código compilado. O im2col não descarta nada: cada janela vira uma linha, até com números repetidos entre linhas vizinhas. O padding é feito uma vez em ambas, antes dos laços. E nada na versão vetorizada muda o tipo: a conta continua em `float64`.

### Pergunta
Duas funções aplicam um filtro 3 × 3 com padding 1: `A` desliza o filtro como ele é (correlação cruzada) e `B` gira o filtro 180° antes (convolução da matemática). Na linha do meio do dígito 1, com um certo filtro, `A` devolve `[0, 0, 4, 4, -4, -4, 0, 0]` e `B` devolve `[0, 0, -4, -4, 4, 4, 0, 0]`. Com qual filtro as duas devolveriam exatamente a mesma saída em qualquer imagem?

```python
SOBEL_X = np.array([[-1.0, 0.0, 1.0], [-2.0, 0.0, 2.0], [-1.0, 0.0, 1.0]])
MEDIA = np.full((3, 3), 1 / 9)
DIAGONAL = np.array([[1.0, 0.0, 0.0], [0.0, 2.0, 0.0], [0.0, 0.0, 3.0]])
```
- [ ] `SOBEL_X`
- [ ] `SOBEL_X.T`
- [x] `MEDIA`
- [ ] `DIAGONAL`
> Girar 180° é o mesmo que `filtro[::-1, ::-1]`; só um filtro que fica igual depois do giro dá a mesma saída, e a média tem os nove pesos iguais. `SOBEL_X` girado vira `-SOBEL_X` (a coluna $-1$ troca com a $+1$), e a saída troca de sinal, como no exemplo. `SOBEL_X.T` também vira o próprio negativo. `DIAGONAL` girada troca o 1 com o 3 e deixa de ser o mesmo filtro.
