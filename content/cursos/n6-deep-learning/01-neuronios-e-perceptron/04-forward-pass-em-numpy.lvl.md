---
slug: n6-m1-04-forward-pass-em-numpy
titulo: Forward pass de uma camada em numpy
descricao: Camada densa como X @ W + b, shapes em lote, inicialização, empilhar camadas e medir a perda; a rede como função pura.
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
- Implementar camadas densas vetorizadas para lotes e prever os shapes de cada tensor
- Empilhar camadas com ativações em uma função forward e calcular a perda
- Inicializar pesos com escala adequada e observar o efeito nas ativações
---

## Passo 1 · Leitura · Uma camada é um produto de matrizes

Até aqui cada neurônio foi calculado separadamente. Uma **camada densa** é um grupo de neurônios que recebem as mesmas entradas, e o numpy calcula todos eles, para um **lote** inteiro de exemplos, com um único produto de matrizes. A convenção do nível inteiro é:

$$
Z = X W + b, \qquad X: (n, d_\text{in}), \quad W: (d_\text{in}, d_\text{out}), \quad b: (d_\text{out},), \quad Z: (n, d_\text{out})
$$

Cada **linha** de $X$ é um exemplo e cada **coluna** de $W$ é um neurônio, com um peso por entrada. O produto $XW$ dá uma linha por exemplo e uma coluna por neurônio. O viés tem um número por neurônio e, pelo broadcasting, é somado a todas as linhas. A conta custa $n \cdot d_\text{in} \cdot d_\text{out}$ multiplicações-e-somas, o que permite estimar o custo de uma rede antes de rodá-la.

```python
X = np.ones((4, 3))          # 4 exemplos, 3 entradas
W = np.ones((3, 2))          # 3 entradas, 2 neurônios
b = np.zeros(2)              # um viés por neurônio
Z = X @ W + b                # (4, 2)
```

O erro mais comum é o viés com forma de coluna, $(d_\text{out}, 1)$, de quem aprendeu a escrever vetores em pé. Com 4 exemplos e 2 neurônios, a soma falha:

```text
ValueError: operands could not be broadcast together with shapes (4,2) (2,1)
```

Pior é quando o número de exemplos coincide com o de neurônios. Com 2 exemplos e 2 neurônios, `Z + np.array([[10.0], [20.0]])` **não dá erro**: o broadcasting soma 10 a toda a primeira linha e 20 a toda a segunda, um viés por exemplo em vez de um por neurônio. Com `[[0, 1], [3, 4]]`, o resultado sai `[[10, 11], [23, 24]]` no lugar de `[[10, 21], [13, 24]]`, sem aviso nenhum. Por isso os testes desta lição usam lotes de tamanhos diferentes da largura das camadas.

Uma rede inteira é uma **função pura**: recebe os parâmetros e um lote, `forward(params, X)`, e devolve a saída, sem guardar estado e sem alterar o que recebeu. A mesma entrada dá sempre a mesma saída, o que torna fácil testar cada camada, comparar com uma referência e, no módulo 4, escrever o backward. Os parâmetros ficam numa lista de pares, `params = [(W1, b1), (W2, b2), ...]`, uma camada por par. Entre as camadas vai a ReLU; a última não tem ativação, porque devolve os **logits**, e a perda é que aplica a softmax.

## Passo 2 · Previsão · As formas de cada tensor

O programa faz o forward de uma rede 3 → 5 → 2 → 1 com tudo igual a 1, mostra as formas e testa duas somas com broadcasting. Leia sem executar e digite o que ele imprime.

### Código
```python
import numpy as np

X = np.ones((4, 3))
W1, b1 = np.ones((3, 5)), np.zeros(5)
W2, b2 = np.ones((5, 2)), np.zeros(2)
W3, b3 = np.ones((2, 1)), np.zeros(1)
A1 = np.maximum(X @ W1 + b1, 0.0)
A2 = np.maximum(A1 @ W2 + b2, 0.0)
S = A2 @ W3 + b3
print(A1.shape, A2.shape, S.shape)
print(S[:, 0].tolist())
v = np.zeros((4, 1))
print((S + v).shape, (S[:, 0] + v).shape)
try:
    X @ W2
except ValueError:
    print("ValueError")
```

### Dicas
1. Cada camada troca a última dimensão: `(4, 3)` vira `(4, 5)`, e assim por diante.
2. Com tudo igual a 1, cada neurônio soma as suas entradas: 3, depois 5 vezes 3.
3. `S[:, 0]` tem forma `(4,)`; somado a `(4, 1)`, o broadcasting estica os dois.

### Saída esperada
```text
(4, 5) (4, 2) (4, 1)
[30.0, 30.0, 30.0, 30.0]
(4, 1) (4, 4)
ValueError
```

## Passo 3 · Exercício · Camada densa e forward
modo: lacunas

Complete as lacunas (`___`) da camada densa e do forward de um MLP. `params` é uma lista de pares `(W, b)` na ordem das camadas.

### Instruções
1. `camada_densa(X, W, b)` devolve $XW + b$, de forma `(n, d_out)`.
2. `forward_mlp(params, X)` devolve `(saida, ativacoes)`: aplica as camadas em ordem, com ReLU depois de cada camada escondida, e guarda em `ativacoes` a saída (depois da ReLU) de cada camada escondida.
3. A última camada não tem ativação: `saida` são os logits, que podem ser negativos. Com uma camada só, `ativacoes` fica vazia.

### Código inicial
```python
import numpy as np


def camada_densa(X, W, b):
    return ___


def forward_mlp(params, X):
    A = np.asarray(X, dtype=float)
    ativacoes = []
    for i, (W, b) in enumerate(params):
        Z = camada_densa(___, W, b)
        if ___:
            A = ___
            ativacoes.append(A)
        else:
            A = Z
    return A, ativacoes
```

### Solução
```python
import numpy as np


def camada_densa(X, W, b):
    return X @ W + b


def forward_mlp(params, X):
    A = np.asarray(X, dtype=float)
    ativacoes = []
    for i, (W, b) in enumerate(params):
        Z = camada_densa(A, W, b)
        if i < len(params) - 1:
            A = np.maximum(Z, 0.0)
            ativacoes.append(A)
        else:
            A = Z
    return A, ativacoes
```

### Dicas
1. `X` à esquerda: `(n, d_in) @ (d_in, d_out)`.
2. Cada camada recebe a saída da anterior, não o `X` original.
3. Com `L` camadas, as escondidas são as de índice `0` a `L - 2`.

### Verificação
```json
[
  {"id": "densa-valores", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np", "expr": "camada_densa(np.array([[1.0, 0.0, 2.0], [0.0, 1.0, -1.0]]), np.array([[1.0, 2.0], [0.0, 1.0], [-1.0, 0.5]]), np.array([0.5, -1.0])).tolist()", "expected": [[-0.5, 2.0], [1.5, -0.5]], "tolerance": 1e-12, "name": "Camada 3 → 2 com 2 exemplos e viés (2,)", "hint": "X tem forma (n, d_in) e W, (d_in, d_out): X à esquerda. O viés (d_out,) soma em todas as linhas."},
  {"id": "densa-forma", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nZ = camada_densa(np.ones((5, 3)), np.ones((3, 4)), np.zeros(4))", "expr": "list(Z.shape)", "expected": [5, 4], "name": "5 exemplos numa camada 3 → 4 dão Z de forma (5, 4)"},
  {"id": "densa-w-quadrada", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np", "expr": "camada_densa(np.array([[1.0, 0.0], [0.0, 1.0], [1.0, 1.0]]), np.array([[1.0, 2.0], [3.0, 4.0]]), np.zeros(2)).tolist()", "expected": [[1.0, 2.0], [3.0, 4.0], [4.0, 6.0]], "tolerance": 1e-12, "name": "Com W quadrada (2 × 2), a ordem do produto importa", "hint": "Com W quadrada, a forma não denuncia a transposta: a linha i de W é a entrada i."},
  {"id": "forward-valores", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nparams = [(np.array([[1.0, -1.0], [0.5, 2.0]]), np.array([0.0, -1.0])), (np.array([[1.0, -2.0], [-1.0, 1.0]]), np.array([0.0, 0.0]))]\nX = np.array([[1.0, 2.0], [-1.0, 0.5]])\nsaida, ativacoes = forward_mlp(params, X)", "expr": "[saida.tolist(), [a.tolist() for a in ativacoes]]", "expected": [[[0.0, -2.0], [-1.0, 1.0]], [[[2.0, 2.0], [0.0, 1.0]]]], "tolerance": 1e-12, "name": "Rede 2 → 2 → 2 escrita à mão: logits (com negativos) e a ativação escondida", "hint": "A ReLU vai depois de cada camada escondida; a última devolve os logits sem ativação."},
  {"id": "forward-uma-camada", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nsaida, ativacoes = forward_mlp([(np.array([[1.0, -1.0]]), np.array([0.0, 0.5]))], np.array([[2.0], [-3.0]]))", "expr": "[saida.tolist(), len(ativacoes)]", "expected": [[[2.0, -1.5], [-3.0, 3.5]], 0], "name": "Com uma camada só: X @ W + b sem ReLU e nenhuma ativação escondida", "hint": "Com uma camada, ela já é a última."},
  {"id": "forward-formas", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nr = np.random.default_rng(1)\ndims = [4, 5, 3, 2]\nparams = [(r.normal(size=(a, c)), np.zeros(c)) for a, c in zip(dims[:-1], dims[1:])]\nsaida, ativacoes = forward_mlp(params, r.normal(size=(6, 4)))", "expr": "[list(saida.shape), [list(a.shape) for a in ativacoes]]", "expected": [[6, 2], [[6, 5], [6, 3]]], "name": "Rede 4 → 5 → 3 → 2 com 6 exemplos: saída (6, 2) e ativações (6, 5) e (6, 3)"},
  {"id": "forward-referencia", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\ndef _ref(params, X):\n    As = [X]\n    for k, (W, b) in enumerate(params):\n        Z = As[-1] @ W + b\n        As.append(np.maximum(Z, 0.0) if k < len(params) - 1 else Z)\n    return As[-1], As[1:-1]\nr = np.random.default_rng(3)\ndims = [6, 5, 4, 3]\nparams = [(r.normal(size=(a, c)), r.normal(size=c)) for a, c in zip(dims[:-1], dims[1:])]\nX = r.normal(size=(7, 6))\nsaida, ativacoes = forward_mlp(params, X)\ns_ref, a_ref = _ref(params, X)\n", "expr": "[bool(np.allclose(saida, s_ref, atol=1e-12)), len(ativacoes) == 2 and all(np.allclose(a, c, atol=1e-12) for a, c in zip(ativacoes, a_ref))]", "expected": [true, true], "name": "Rede 6 → 5 → 4 → 3: saída e ativações iguais às de uma implementação de referência", "hint": "A lista diz se a saída e se as ativações escondidas batem com a referência."},
  {"id": "forward-ultima-negativa", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\ndef _ref(params, X):\n    As = [X]\n    for k, (W, b) in enumerate(params):\n        Z = As[-1] @ W + b\n        As.append(np.maximum(Z, 0.0) if k < len(params) - 1 else Z)\n    return As[-1], As[1:-1]\nr = np.random.default_rng(3)\ndims = [6, 5, 4, 3]\nparams = [(r.normal(size=(a, c)), r.normal(size=c)) for a, c in zip(dims[:-1], dims[1:])]\nX = r.normal(size=(7, 6))\nsaida, ativacoes = forward_mlp(params, X)\ns_ref, a_ref = _ref(params, X)\n", "expr": "bool((saida < 0).any())", "expected": true, "name": "A saída da última camada pode ter valores negativos", "hint": "Sem ReLU na última camada."},
  {"id": "params-intactos", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nparams = [(np.array([[1.0, -1.0], [0.5, 2.0]]), np.array([0.0, -1.0])), (np.array([[1.0, -2.0], [-1.0, 1.0]]), np.array([0.0, 0.0]))]\nX = np.array([[1.0, 2.0], [-1.0, 0.5]])\ncopias = [(W.copy(), b.copy()) for W, b in params]\nforward_mlp(params, X)", "expr": "all(np.array_equal(W, W0) and np.array_equal(b, b0) for (W, b), (W0, b0) in zip(params, copias))", "expected": true, "name": "O forward não altera params"}
]
```

### Soluções erradas
```python name="W transposta (X @ W.T)"
import numpy as np


def camada_densa(X, W, b):
    return X @ W.T + b


def forward_mlp(params, X):
    A = np.asarray(X, dtype=float)
    ativacoes = []
    for i, (W, b) in enumerate(params):
        Z = camada_densa(A, W, b)
        if i < len(params) - 1:
            A = np.maximum(Z, 0.0)
            ativacoes.append(A)
        else:
            A = Z
    return A, ativacoes
```
```python name="viés como coluna (d_out, 1)"
import numpy as np


def camada_densa(X, W, b):
    return X @ W + b.reshape(-1, 1)


def forward_mlp(params, X):
    A = np.asarray(X, dtype=float)
    ativacoes = []
    for i, (W, b) in enumerate(params):
        Z = camada_densa(A, W, b)
        if i < len(params) - 1:
            A = np.maximum(Z, 0.0)
            ativacoes.append(A)
        else:
            A = Z
    return A, ativacoes
```
```python name="toda camada recebe o X original"
import numpy as np


def camada_densa(X, W, b):
    return X @ W + b


def forward_mlp(params, X):
    A = np.asarray(X, dtype=float)
    ativacoes = []
    for i, (W, b) in enumerate(params):
        Z = camada_densa(np.asarray(X, dtype=float), W, b)
        if i < len(params) - 1:
            A = np.maximum(Z, 0.0)
            ativacoes.append(A)
        else:
            A = Z
    return A, ativacoes
```
```python name="ReLU também na última camada"
import numpy as np


def camada_densa(X, W, b):
    return X @ W + b


def forward_mlp(params, X):
    A = np.asarray(X, dtype=float)
    ativacoes = []
    for i, (W, b) in enumerate(params):
        Z = camada_densa(A, W, b)
        if i < len(params):
            A = np.maximum(Z, 0.0)
            ativacoes.append(A)
        else:
            A = Z
    return A, ativacoes
```
```python name="ativação esquecida"
import numpy as np


def camada_densa(X, W, b):
    return X @ W + b


def forward_mlp(params, X):
    A = np.asarray(X, dtype=float)
    ativacoes = []
    for i, (W, b) in enumerate(params):
        Z = camada_densa(A, W, b)
        if i < len(params) - 1:
            A = Z
            ativacoes.append(A)
        else:
            A = Z
    return A, ativacoes
```
```python name="ReLU pula a primeira camada"
import numpy as np


def camada_densa(X, W, b):
    return X @ W + b


def forward_mlp(params, X):
    A = np.asarray(X, dtype=float)
    ativacoes = []
    for i, (W, b) in enumerate(params):
        Z = camada_densa(A, W, b)
        if 0 < i < len(params) - 1:
            A = np.maximum(Z, 0.0)
            ativacoes.append(A)
        else:
            A = Z
    return A, ativacoes
```

## Passo 4 · Leitura · Inicialização

Antes de treinar, os pesos precisam de valores iniciais, e a escolha importa mais do que parece.

**Zeros não servem.** Com $W = 0$, todos os neurônios de uma camada calculam a mesma coisa (zero) e, no backward, recebem o mesmo gradiente; depois de qualquer número de passos, continuam idênticos entre si. A camada inteira se comporta como um neurônio só. Os pesos precisam ser **sorteados** para quebrar essa simetria; os vieses podem começar em zero, porque os pesos já diferenciam os neurônios.

**A escala decide o que chega às camadas de baixo.** Uma pré-ativação soma $d_\text{in}$ termos $w_j x_j$. Com pesos e entradas independentes, de média zero e pesos de variância $\sigma^2$:

$$
\text{Var}(z) = d_\text{in}\, \sigma^2\, \text{Var}(x)
$$

Para a variância não crescer nem encolher de camada em camada, $\sigma^2 = 1 / d_\text{in}$, ou seja, desvio padrão $1/\sqrt{d_\text{in}}$. Uma camada com 256 entradas e pesos de desvio 1 multiplica a variância por 256; com desvio 0,01, divide por 39.

Essa é a base das duas inicializações com nome que o módulo 3 aprofunda: a de **Xavier** (ou Glorot), pensada para tanh, com variância da ordem de $1/d_\text{in}$, e a de **He**, para ReLU, com $2/d_\text{in}$. O fator 2 compensa a ReLU, que zera metade das pré-ativações e com isso corta pela metade a variância do que passa adiante.

Nesta lição, a inicialização usa um parâmetro `escala` e desvio $\text{escala} / \sqrt{d_\text{in}}$: `escala = 1` é a regra $1/\sqrt{d_\text{in}}$, e `escala` $= \sqrt 2$ é a de He. O sorteio é reprodutível com um gerador criado **uma vez**:

```python
rng = np.random.default_rng(semente)
for d_in, d_out in zip(dims[:-1], dims[1:]):
    W = rng.normal(0.0, escala / np.sqrt(d_in), size=(d_in, d_out))
```

Recriar o gerador dentro do laço, com a mesma semente, é um erro sutil: duas camadas da mesma forma recebem exatamente os mesmos pesos. E como duas implementações corretas podem consumir o gerador em outra ordem (vieses sorteados antes, por exemplo), a correção desta lição compara **estatísticas** dos pesos (média e desvio de cada camada) e não os valores.

## Passo 5 · Exercício · Inicializar uma rede

Escreva a inicialização de um MLP com as dimensões dadas, por exemplo `dims = [64, 32, 16, 10]` para uma rede 64 → 32 → 16 → 10.

### Instruções
1. `inicializar(dims, semente, escala=1.0)` devolve uma lista com um par `(W, b)` por camada, com `W` de forma `(d_in, d_out)` e `b` de forma `(d_out,)` com zeros.
2. Os pesos de cada camada são sorteados de uma normal de média 0 e desvio `escala / sqrt(d_in)`.
3. Um único gerador, `np.random.default_rng(semente)`, criado uma vez e usado em todas as camadas, na ordem: a mesma semente dá os mesmos pesos e camadas diferentes recebem pesos diferentes.

### Código inicial
```python
import numpy as np


def inicializar(dims, semente, escala=1.0):
    pass
```

### Solução
```python
import numpy as np


def inicializar(dims, semente, escala=1.0):
    rng = np.random.default_rng(semente)
    params = []
    for d_in, d_out in zip(dims[:-1], dims[1:]):
        W = rng.normal(0.0, escala / np.sqrt(d_in), size=(d_in, d_out))
        b = np.zeros(d_out)
        params.append((W, b))
    return params
```

### Dicas
1. `zip(dims[:-1], dims[1:])` dá os pares `(d_in, d_out)` de cada camada.
2. `rng.normal(media, desvio, size=forma)` sorteia a matriz inteira de uma vez.
3. O gerador fica fora do laço.

### Verificação
```json
[
  {"id": "formas", "checkpoint": 1, "kind": "expr", "setup": "params = inicializar([64, 32, 16, 10], 0)", "expr": "[[list(W.shape), list(b.shape)] for W, b in params]", "expected": [[[64, 32], [32]], [[32, 16], [16]], [[16, 10], [10]]], "name": "dims [64, 32, 16, 10]: três pares (W, b) com W de forma (d_in, d_out)", "hint": "Um par por camada; W liga d_in entradas a d_out saídas."},
  {"id": "vies-zero", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nparams = inicializar([5, 4, 3], 1)", "expr": "[b.tolist() for W, b in params]", "expected": [[0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0]], "name": "Os vieses começam em zero"},
  {"id": "desvio", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\ndims = [64, 32, 16, 10]\nparams = inicializar(dims, 7, escala=1.0)\ndef _ok(W, sigma):\n    n = W.size\n    return bool(abs(W.std() - sigma) < 5 * sigma / np.sqrt(2 * n) and abs(W.mean()) < 5 * sigma / np.sqrt(n))\n", "expr": "[_ok(W, 1.0 / np.sqrt(W.shape[0])) for W, b in params]", "expected": [true, true, true], "name": "Com escala 1, cada W tem média perto de 0 e desvio perto de 1/√d_in (5 erros padrão)", "hint": "O desvio padrão de cada camada é escala / √d_in, com d_in o número de linhas de W."},
  {"id": "desvio-escala", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\ndims = [64, 32, 16, 10]\nparams = inicializar(dims, 7, escala=2.0)\ndef _ok(W, sigma):\n    n = W.size\n    return bool(abs(W.std() - sigma) < 5 * sigma / np.sqrt(2 * n) and abs(W.mean()) < 5 * sigma / np.sqrt(n))\n", "expr": "[_ok(W, 2.0 / np.sqrt(W.shape[0])) for W, b in params]", "expected": [true, true, true], "name": "Com escala 2, o desvio de cada W dobra"},
  {"id": "mesma-semente", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\np1 = inicializar([6, 5, 4], 42)\np2 = inicializar([6, 5, 4], 42)", "expr": "all(np.array_equal(a[0], c[0]) for a, c in zip(p1, p2))", "expected": true, "name": "A mesma semente dá os mesmos pesos", "hint": "Crie o gerador com default_rng(semente)."},
  {"id": "outra-semente", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\np1 = inicializar([6, 5, 4], 42)\np2 = inicializar([6, 5, 4], 43)", "expr": "bool(not np.array_equal(p1[0][0], p2[0][0]))", "expected": true, "name": "Outra semente dá outros pesos"},
  {"id": "camadas-diferentes", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nparams = inicializar([8, 8, 8, 8], 5)", "expr": "[bool(not np.array_equal(params[0][0], params[1][0])), bool(not np.array_equal(params[1][0], params[2][0]))]", "expected": [true, true], "name": "Camadas de mesma forma recebem pesos diferentes", "hint": "Um gerador só, criado uma vez e consumido camada após camada."},
  {"id": "escala-zero", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nparams = inicializar([3, 4, 2], 0, escala=0.0)\nX = np.random.default_rng(9).normal(size=(5, 3))\nH = np.maximum(X @ params[0][0] + params[0][1], 0.0)", "expr": "[bool(np.all(H == H[:, :1])), float(np.abs(params[0][0]).max())]", "expected": [true, 0.0], "name": "Com escala 0, todos os pesos são zero e os neurônios escondidos ficam iguais"},
  {"id": "tipo", "checkpoint": 1, "kind": "expr", "setup": "params = inicializar([3, 2], 0)", "expr": "[type(params).__name__, len(params), str(params[0][0].dtype), str(params[0][1].dtype)]", "expected": ["list", 1, "float64", "float64"], "name": "Devolve uma lista com um par por camada, em float64"}
]
```

### Soluções erradas
```python name="W com a forma transposta"
import numpy as np


def inicializar(dims, semente, escala=1.0):
    rng = np.random.default_rng(semente)
    params = []
    for d_in, d_out in zip(dims[:-1], dims[1:]):
        W = rng.normal(0.0, escala / np.sqrt(d_in), size=(d_out, d_in))
        b = np.zeros(d_out)
        params.append((W, b))
    return params
```
```python name="desvio escala / d_in (sem a raiz)"
import numpy as np


def inicializar(dims, semente, escala=1.0):
    rng = np.random.default_rng(semente)
    params = []
    for d_in, d_out in zip(dims[:-1], dims[1:]):
        W = rng.normal(0.0, escala / d_in, size=(d_in, d_out))
        b = np.zeros(d_out)
        params.append((W, b))
    return params
```
```python name="desvio igual à escala"
import numpy as np


def inicializar(dims, semente, escala=1.0):
    rng = np.random.default_rng(semente)
    params = []
    for d_in, d_out in zip(dims[:-1], dims[1:]):
        W = rng.normal(0.0, escala, size=(d_in, d_out))
        b = np.zeros(d_out)
        params.append((W, b))
    return params
```
```python name="pesos começam em zero"
import numpy as np


def inicializar(dims, semente, escala=1.0):
    rng = np.random.default_rng(semente)
    params = []
    for d_in, d_out in zip(dims[:-1], dims[1:]):
        W = np.zeros((d_in, d_out))
        b = np.zeros(d_out)
        params.append((W, b))
    return params
```
```python name="gerador recriado a cada camada"
import numpy as np


def inicializar(dims, semente, escala=1.0):
    params = []
    for d_in, d_out in zip(dims[:-1], dims[1:]):
        rng = np.random.default_rng(semente)
        W = rng.normal(0.0, escala / np.sqrt(d_in), size=(d_in, d_out))
        b = np.zeros(d_out)
        params.append((W, b))
    return params
```
```python name="viés sorteado"
import numpy as np


def inicializar(dims, semente, escala=1.0):
    rng = np.random.default_rng(semente)
    params = []
    for d_in, d_out in zip(dims[:-1], dims[1:]):
        W = rng.normal(0.0, escala / np.sqrt(d_in), size=(d_in, d_out))
        b = rng.normal(0.0, escala / np.sqrt(d_in), size=d_out)
        params.append((W, b))
    return params
```
```python name="ignora a semente"
import numpy as np


def inicializar(dims, semente, escala=1.0):
    rng = np.random.default_rng()
    params = []
    for d_in, d_out in zip(dims[:-1], dims[1:]):
        W = rng.normal(0.0, escala / np.sqrt(d_in), size=(d_in, d_out))
        b = np.zeros(d_out)
        params.append((W, b))
    return params
```

## Passo 6 · Leitura · Ativações camada a camada

O efeito da escala aparece quando se empilham camadas. A tabela foi medida no executor com uma rede de 10 camadas ReLU de 256 neurônios, sem viés, e um lote de 500 exemplos sorteados de uma normal padrão. Cada coluna mostra o desvio padrão das ativações depois da camada indicada, para quatro desvios dos pesos:

| desvio dos pesos | camada 1 | camada 2 | camada 3 | camada 5 | camada 10 |
|---|---|---|---|---|---|
| 0,01 | 0,094 | 0,011 | 0,0013 | 1,7e-05 | 3,5e-10 |
| 1,0 | 9,4 | 107 | 1 270 | 1,7e+05 | 3,5e+10 |
| $1/\sqrt{256}$ | 0,59 | 0,42 | 0,31 | 0,16 | 0,031 |
| $\sqrt{2/256}$ (He) | 0,83 | 0,83 | 0,88 | 0,91 | 1,0 |

Com 0,01, cada camada multiplica o desvio por cerca de $0{,}01 \cdot \sqrt{128} \approx 0{,}11$, e na décima as ativações são praticamente zero: o sinal **colapsa**, e os gradientes, que passam pelas mesmas matrizes no backward, também. Com 1,0, o fator é $\sqrt{128} \approx 11$, e as ativações **explodem**; em poucas camadas a mais, viram `inf` e a perda vira `nan`. A regra $1/\sqrt{d_\text{in}}$ encolhe devagar (fator $\sqrt{1/2}$, pela ReLU), e a de He fica estável. Medir a média, o desvio e a fração de zeros de cada camada logo depois de inicializar é o primeiro diagnóstico de uma rede que não treina.

O segundo é a **perda inicial**. A perda de classificação do Nível 5 é a entropia cruzada da softmax dos logits. Escrita em logaritmos, ela fica estável:

$$
-\log p_y = -\left(z_y - \log \sum_{j} e^{z_j}\right), \qquad z \leftarrow z - \max_j z_j
$$

Subtrair o maior logit de cada linha não muda a softmax e impede que `np.exp` estoure (com um logit 1000, `np.exp` dá `inf`, e a perda sai `inf` ou `nan` sem aviso). Logo depois de uma boa inicialização, os logits são pequenos, as $k$ classes ficam quase equiprováveis e a perda é perto de $\ln k$: 2,30 para 10 classes. Uma perda inicial muito maior que isso indica logits grandes demais, ou seja, escala errada.

```python
logits, _ = forward_mlp(params, X)
perda = entropia_cruzada(logits, y)    # perto de ln(10) = 2.302585092994046
```

## Passo 7 · Exercício · Estatísticas e perda

O arquivo `rede.py` traz a `forward_mlp` do passo 3, que devolve `(saida, ativacoes)`. Escreva as duas ferramentas de diagnóstico no `main.py`.

### Instruções
1. `estatisticas_de_ativacao(params, X)` devolve uma lista com uma tupla `(media, desvio, fracao_zeros)` por camada **escondida**, calculadas sobre todas as entradas da ativação (depois da ReLU), como `float` do Python; o desvio é o desvio padrão de `np.std`.
2. `entropia_cruzada(logits, y)` recebe logits de forma `(n, k)` e rótulos inteiros `y` de forma `(n,)` e devolve, como `float`, a média de $-\log p_{y_i}$ da softmax de cada linha.
3. A entropia cruzada é estável: com logits como 1000 não dá `nan` nem `inf`.

### Código inicial
```python
import numpy as np
from rede import forward_mlp


def estatisticas_de_ativacao(params, X):
    pass


def entropia_cruzada(logits, y):
    pass
```
```python path=rede.py
import numpy as np


def camada_densa(X, W, b):
    return X @ W + b


def forward_mlp(params, X):
    A = np.asarray(X, dtype=float)
    ativacoes = []
    for i, (W, b) in enumerate(params):
        Z = camada_densa(A, W, b)
        if i < len(params) - 1:
            A = np.maximum(Z, 0.0)
            ativacoes.append(A)
        else:
            A = Z
    return A, ativacoes
```

### Solução
```python
import numpy as np
from rede import forward_mlp


def estatisticas_de_ativacao(params, X):
    _, ativacoes = forward_mlp(params, X)
    return [(float(A.mean()), float(A.std()), float(np.mean(A == 0))) for A in ativacoes]


def entropia_cruzada(logits, y):
    logits = np.asarray(logits, dtype=float)
    y = np.asarray(y)
    Z = logits - logits.max(axis=1, keepdims=True)
    log_p = Z - np.log(np.exp(Z).sum(axis=1, keepdims=True))
    return float(-log_p[np.arange(len(y)), y].mean())
```
```python path=rede.py
import numpy as np


def camada_densa(X, W, b):
    return X @ W + b


def forward_mlp(params, X):
    A = np.asarray(X, dtype=float)
    ativacoes = []
    for i, (W, b) in enumerate(params):
        Z = camada_densa(A, W, b)
        if i < len(params) - 1:
            A = np.maximum(Z, 0.0)
            ativacoes.append(A)
        else:
            A = Z
    return A, ativacoes
```

### Dicas
1. `forward_mlp` já devolve as ativações das camadas escondidas; a saída não entra.
2. A média de `A == 0` é a fração de zeros.
3. Calcule o log da softmax como `Z - log(soma de exp(Z))`, com `Z` já sem o máximo de cada linha, e pegue a coluna `y[i]` de cada linha `i` com `np.arange(n)`.

### Verificação
```json
[
  {"id": "est-mao", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nparams = [(np.array([[1.0, -1.0], [0.5, 2.0]]), np.array([0.0, -1.0])), (np.array([[1.0], [1.0]]), np.array([0.0]))]\nest = estatisticas_de_ativacao(params, np.array([[1.0, 2.0], [-1.0, 0.5]]))", "expr": "[list(t) for t in est]", "expected": [[1.25, 0.82915619758885, 0.25]], "tolerance": 1e-12, "name": "Rede 2 → 2 → 1 escrita à mão: média 1,25, desvio 0,829 e um quarto de zeros na camada escondida", "hint": "As estatísticas usam todas as entradas da ativação (depois da ReLU) da camada escondida."},
  {"id": "est-uma-por-escondida", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nr = np.random.default_rng(4)\ndims = [8, 6, 5, 3]\nparams = [(r.normal(0, 1 / np.sqrt(a), (a, c)), r.normal(0, 0.1, c)) for a, c in zip(dims[:-1], dims[1:])]\nX = r.normal(size=(40, 8))\nest = estatisticas_de_ativacao(params, X)\n_A = [X]\nfor W, b in params[:-1]:\n    _A.append(np.maximum(_A[-1] @ W + b, 0.0))\n_ref = [(A.mean(), A.std(), (A == 0).mean()) for A in _A[1:]]\n", "expr": "[len(est), [len(t) for t in est]]", "expected": [2, [3, 3]], "name": "Rede 8 → 6 → 5 → 3: uma tupla de três números para cada uma das 2 camadas escondidas", "hint": "A camada de saída não tem ReLU e não entra."},
  {"id": "est-referencia", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nr = np.random.default_rng(4)\ndims = [8, 6, 5, 3]\nparams = [(r.normal(0, 1 / np.sqrt(a), (a, c)), r.normal(0, 0.1, c)) for a, c in zip(dims[:-1], dims[1:])]\nX = r.normal(size=(40, 8))\nest = estatisticas_de_ativacao(params, X)\n_A = [X]\nfor W, b in params[:-1]:\n    _A.append(np.maximum(_A[-1] @ W + b, 0.0))\n_ref = [(A.mean(), A.std(), (A == 0).mean()) for A in _A[1:]]\n", "expr": "[bool(np.allclose(t, c, atol=1e-12)) for t, c in zip(est, _ref)]", "expected": [true, true], "name": "Média, desvio padrão e fração de zeros iguais aos de uma referência, camada a camada", "hint": "Desvio padrão (np.std), não variância; a fração de zeros é uma proporção entre 0 e 1."},
  {"id": "est-tipos", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nr = np.random.default_rng(4)\ndims = [8, 6, 5, 3]\nparams = [(r.normal(0, 1 / np.sqrt(a), (a, c)), r.normal(0, 0.1, c)) for a, c in zip(dims[:-1], dims[1:])]\nX = r.normal(size=(40, 8))\nest = estatisticas_de_ativacao(params, X)\n_A = [X]\nfor W, b in params[:-1]:\n    _A.append(np.maximum(_A[-1] @ W + b, 0.0))\n_ref = [(A.mean(), A.std(), (A == 0).mean()) for A in _A[1:]]\n", "expr": "[type(v).__name__ for t in est for v in t]", "expected": ["float", "float", "float", "float", "float", "float"], "name": "Os números são float do Python"},
  {"id": "ce-uniforme", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np", "expr": "entropia_cruzada(np.zeros((4, 10)), np.array([0, 3, 9, 5]))", "expected": 2.302585092994046, "tolerance": 1e-12, "name": "Logits todos iguais com 10 classes: a perda é ln 10", "hint": "Com logits iguais, cada classe tem probabilidade 1/10."},
  {"id": "ce-valores", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np", "expr": "entropia_cruzada(np.array([[2.0, 1.0, 0.0], [0.0, 0.0, 3.0]]), np.array([0, 1]))", "expected": 1.7512644604326708, "tolerance": 1e-12, "name": "Dois exemplos e três classes: a média de -log p da classe certa", "hint": "Para cada linha, pegue só a log-probabilidade da classe y daquela linha, e tire a média das linhas."},
  {"id": "ce-estavel", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np", "expr": "[entropia_cruzada(np.array([[1000.0, 0.0]]), np.array([0])), entropia_cruzada(np.array([[1000.0, 0.0]]), np.array([1]))]", "expected": [0.0, 1000.0], "tolerance": 1e-09, "name": "Logits 1000 e 0: perda 0 na classe certa e 1000 na errada, sem nan nem inf", "hint": "Subtraia o maior logit de cada linha e calcule log da softmax como Z - log(soma de exp(Z))."},
  {"id": "ce-tipo", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np", "expr": "type(entropia_cruzada(np.zeros((3, 2)), np.array([0, 1, 1]))).__name__", "expected": "float", "name": "Devolve um float do Python"}
]
```

### Soluções erradas
```python name="inclui a camada de saída"
import numpy as np
from rede import forward_mlp


def estatisticas_de_ativacao(params, X):
    saida, ativacoes = forward_mlp(params, X)
    return [(float(A.mean()), float(A.std()), float(np.mean(A == 0))) for A in ativacoes + [saida]]


def entropia_cruzada(logits, y):
    logits = np.asarray(logits, dtype=float)
    y = np.asarray(y)
    Z = logits - logits.max(axis=1, keepdims=True)
    log_p = Z - np.log(np.exp(Z).sum(axis=1, keepdims=True))
    return float(-log_p[np.arange(len(y)), y].mean())
```
```python name="variância no lugar do desvio"
import numpy as np
from rede import forward_mlp


def estatisticas_de_ativacao(params, X):
    _, ativacoes = forward_mlp(params, X)
    return [(float(A.mean()), float(A.var()), float(np.mean(A == 0))) for A in ativacoes]


def entropia_cruzada(logits, y):
    logits = np.asarray(logits, dtype=float)
    y = np.asarray(y)
    Z = logits - logits.max(axis=1, keepdims=True)
    log_p = Z - np.log(np.exp(Z).sum(axis=1, keepdims=True))
    return float(-log_p[np.arange(len(y)), y].mean())
```
```python name="conta os zeros em vez da fração"
import numpy as np
from rede import forward_mlp


def estatisticas_de_ativacao(params, X):
    _, ativacoes = forward_mlp(params, X)
    return [(float(A.mean()), float(A.std()), float(np.sum(A == 0))) for A in ativacoes]


def entropia_cruzada(logits, y):
    logits = np.asarray(logits, dtype=float)
    y = np.asarray(y)
    Z = logits - logits.max(axis=1, keepdims=True)
    log_p = Z - np.log(np.exp(Z).sum(axis=1, keepdims=True))
    return float(-log_p[np.arange(len(y)), y].mean())
```
```python name="softmax sem subtrair o máximo"
import numpy as np
from rede import forward_mlp


def estatisticas_de_ativacao(params, X):
    _, ativacoes = forward_mlp(params, X)
    return [(float(A.mean()), float(A.std()), float(np.mean(A == 0))) for A in ativacoes]


def entropia_cruzada(logits, y):
    logits = np.asarray(logits, dtype=float)
    y = np.asarray(y)
    Z = logits
    log_p = Z - np.log(np.exp(Z).sum(axis=1, keepdims=True))
    return float(-log_p[np.arange(len(y)), y].mean())
```
```python name="soma no lugar da média"
import numpy as np
from rede import forward_mlp


def estatisticas_de_ativacao(params, X):
    _, ativacoes = forward_mlp(params, X)
    return [(float(A.mean()), float(A.std()), float(np.mean(A == 0))) for A in ativacoes]


def entropia_cruzada(logits, y):
    logits = np.asarray(logits, dtype=float)
    y = np.asarray(y)
    Z = logits - logits.max(axis=1, keepdims=True)
    log_p = Z - np.log(np.exp(Z).sum(axis=1, keepdims=True))
    return float(-log_p[np.arange(len(y)), y].sum())
```
```python name="indexa com [:, y]"
import numpy as np
from rede import forward_mlp


def estatisticas_de_ativacao(params, X):
    _, ativacoes = forward_mlp(params, X)
    return [(float(A.mean()), float(A.std()), float(np.mean(A == 0))) for A in ativacoes]


def entropia_cruzada(logits, y):
    logits = np.asarray(logits, dtype=float)
    y = np.asarray(y)
    Z = logits - logits.max(axis=1, keepdims=True)
    log_p = Z - np.log(np.exp(Z).sum(axis=1, keepdims=True))
    return float(-log_p[:, y].mean())
```
```python name="log dos logits, sem a softmax"
import numpy as np
from rede import forward_mlp


def estatisticas_de_ativacao(params, X):
    _, ativacoes = forward_mlp(params, X)
    return [(float(A.mean()), float(A.std()), float(np.mean(A == 0))) for A in ativacoes]


def entropia_cruzada(logits, y):
    logits = np.asarray(logits, dtype=float)
    y = np.asarray(y)
    Z = logits - logits.max(axis=1, keepdims=True)
    log_p = Z
    return float(-log_p[np.arange(len(y)), y].mean())
```

## Passo 8 · Quiz · Formas e escala

### Pergunta
Uma camada recebe um lote `X` de forma `(32, 784)`, com `W1` de forma `(784, 128)`, e a linha `Z = X @ W1 + b1` levanta:

```text
ValueError: operands could not be broadcast together with shapes (32,128) (128,1)
```

Qual é a correção?
- [ ] Usar `X.T @ W1 + b1`, porque o lote precisa ficar nas colunas
- [x] Criar `b1` com forma `(128,)`, um número por neurônio, que o broadcasting soma a todas as linhas
- [ ] Trocar `@` por `np.dot`, que aceita o viés em coluna
- [ ] Transpor o resultado: `(X @ W1).T + b1`
> O produto `X @ W1` está certo, `(32, 128)`; o problema é o viés em coluna, `(128, 1)`. `X.T @ W1` é `(784, 32) @ (784, 128)` e falha no `matmul`. `np.dot` faz o mesmo produto e a soma do viés continua falhando. Transpor dá `(128, 32) + (128, 1)`, que roda, mas devolve neurônios nas linhas e exemplos nas colunas, contra a convenção de todas as camadas seguintes.

### Pergunta
Numa camada com 10 neurônios, alguém criou o viés com forma `(10, 1)` e treinou com lotes de exatamente 10 exemplos. Nada deu erro. Na avaliação, com um lote de 7 exemplos, aparece um `ValueError`. O que aconteceu no treino?
- [ ] Nada de errado: com 10 exemplos a forma `(10, 1)` equivale a `(10,)`
- [x] O broadcasting somou `b[i]` a todas as saídas do exemplo `i`: um viés por **exemplo**, que depende da posição no lote, e não um por neurônio
- [ ] O numpy transpôs o viés automaticamente para `(1, 10)`
- [ ] O viés foi ignorado no treino e só passou a contar na avaliação
> Com `Z` de forma `(10, 10)`, `Z + b` com `b` em `(10, 1)` estica `b` ao longo das colunas: a linha `i` inteira recebe `b[i]`. Os números saem errados sem aviso, e cada exemplo é deslocado de acordo com a posição que ocupa no lote. O numpy nunca transpõe por conta própria; o erro só aparece quando o tamanho do lote deixa de coincidir com o número de neurônios.

### Pergunta
`estatisticas_de_ativacao` numa rede de 10 camadas ReLU de 256 neurônios, logo depois de inicializar, mostra o desvio das ativações por camada: `0.094, 0.011, 0.0013, ...` até `3.5e-10` na décima. A perda inicial é exatamente $\ln 10$ e o treino não sai do lugar. O que mudar?
- [ ] A taxa de aprendizado, que está pequena demais
- [ ] Começar os pesos em zero, para as ativações não sumirem
- [x] O desvio dos pesos: 0,01 fixo encolhe o sinal cerca de 9 vezes por camada; com $\sqrt{2/d_\text{in}}$ (He), o desvio fica perto de 1 nas 10 camadas
- [ ] Trocar a ReLU pela sigmoide, que não zera os negativos
> Cada camada multiplica o desvio por $0{,}01 \cdot \sqrt{256/2} \approx 0{,}11$; na décima, as ativações e os gradientes que voltam por elas são praticamente zero. A perda $\ln 10$ só confirma que os logits são todos quase 0. Uma taxa maior não compensa um fator da ordem de $10^{-10}$; zeros pioram (tudo igual e simétrico); a sigmoide satura e encolhe o gradiente ainda mais (derivada no máximo 1/4). Com a escala de He, o desvio medido fica entre 0,83 e 1,0 nas 10 camadas.
