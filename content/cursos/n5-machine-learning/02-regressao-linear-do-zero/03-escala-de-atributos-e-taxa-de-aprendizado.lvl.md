---
slug: n5-m2-03-escala-de-atributos-e-taxa-de-aprendizado
titulo: Escala de atributos e taxa de aprendizado
descricao: Por que atributos em escalas diferentes travam o gradiente (vales alongados), padronização e min-max, e a busca da taxa de aprendizado.
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
- Padronizar atributos usando estatísticas do treino e aplicá-las ao teste
- Mostrar o efeito da escala na convergência com curvas de custo
- Escolher a taxa de aprendizado por busca em grade logarítmica
---

## Passo 1 · Leitura · Vales alongados

Um cadastro fictício de imóveis tem o número de quartos (de 1 a 5) e a área em centímetros quadrados (centenas de milhares). O gradiente não trata os dois igual. A derivada do MSE em relação a $w_j$ é $\frac{2}{n}\sum r_i x_{ij}$: ela cresce com o tamanho da coluna. Na coluna da área, o gradiente é milhares de vezes maior que na dos quartos.

Visto de cima, o custo deixa de ser uma bacia redonda e vira um **vale alongado**: muito íngreme na direção do peso da área, quase plano na dos quartos. Uma taxa boa para a direção plana faz o peso da área saltar de uma parede do vale para a outra, cada vez mais alto: o treino diverge. Uma taxa pequena o bastante para a direção íngreme quase não sai do lugar na direção plana. Nenhuma taxa serve bem às duas.

A saída é pôr as colunas na mesma escala antes de treinar. O **escore** $z$ subtrai a média e divide pelo desvio de cada coluna; o **min-max** leva cada coluna para o intervalo $[0, 1]$:

$$
z_{ij} = \frac{x_{ij} - \mu_j}{\sigma_j}, \qquad m_{ij} = \frac{x_{ij} - \min_j}{\max_j - \min_j}
$$

Depois do escore $z$, toda coluna do treino tem média 0 e desvio 1, e o vale volta a ser quase redondo. O desvio é o populacional (`ddof=0`, o padrão do `np.std`), o mesmo que o `StandardScaler` do scikit-learn usa no módulo 4. Uma coluna constante tem desvio zero e a conta daria `nan`; a convenção do scikit-learn é dividir por 1 nessa coluna, que sai toda zero.

```python
media = X_treino.mean(axis=0)            # uma média por coluna
desvio = X_treino.std(axis=0)            # ddof=0
desvio = np.where(desvio == 0, 1.0, desvio)
X_treino_z = (X_treino - media) / desvio
X_teste_z = (X_teste - media) / desvio   # as estatísticas do TREINO
```

A última linha é a regra que mais se erra. O teste representa dados futuros; as estatísticas vêm só do treino. Calcular a média com treino e teste juntos é **vazamento**: informação do teste entra no modelo antes da avaliação. Padronizar o teste com a média e o desvio do próprio teste é o erro oposto: um mesmo valor bruto vira números diferentes no treino e no teste, e o modelo recebe entradas numa escala que não aprendeu. No gerador do módulo, `gerar_dados(escala=(1.0, 1000.0))` multiplica a segunda coluna por mil.

## Passo 2 · Previsão · O teste padronizado com o treino

O programa padroniza um teste com a média e o desvio do treino e mostra as estatísticas do resultado. Leia sem executar e digite o que ele imprime.

### Código
```python
import numpy as np

treino = np.array([2.0, 4.0, 4.0, 4.0, 5.0, 5.0, 7.0, 9.0])
teste = np.array([7.0, 9.0, 11.0])

media, desvio = treino.mean(), treino.std()
print(media, desvio)
z = (teste - media) / desvio
print(z.tolist())
print(z.mean(), round(float(z.std()), 4))

z_proprio = (teste - teste.mean()) / teste.std()
print(round(float(z_proprio[1]), 4), z[1])
```

### Dicas
1. O desvio do treino é o populacional: a média dos quadrados dos desvios é 4.
2. O teste usa a média e o desvio do treino, e nada obriga o resultado a ter média 0.
3. O desvio de `[1, 2, 3]` é $\sqrt{2/3}$. Na última linha, o 9 é a média do próprio teste.

### Saída esperada
```text
5.0 2.0
[1.0, 2.0, 3.0]
2.0 0.8165
0.0 2.0
```

## Passo 3 · Exercício · Padronizar treino e teste
modo: lacunas

Complete as lacunas (`___`) para padronizar treino e teste pelo escore $z$, com as estatísticas aprendidas só no treino.

### Instruções
1. `padronizar_treino_teste(X_tr, X_te)` calcula a média e o desvio populacional (`ddof=0`) de cada **coluna** do treino.
2. Numa coluna de desvio zero, usa 1 no lugar do desvio, para que a coluna saia zerada, sem `nan`.
3. Devolve `(Xtr, Xte, media, desvio)`: o treino e o teste padronizados **com as estatísticas do treino**, a média e o desvio já corrigido.

### Código inicial
```python
import numpy as np


def padronizar_treino_teste(X_tr, X_te):
    X_tr = np.asarray(X_tr, dtype=float)
    X_te = np.asarray(X_te, dtype=float)
    media = ___
    desvio = ___
    desvio = np.where(desvio == 0, ___, desvio)
    return (X_tr - media) / desvio, ___, media, desvio
```

### Solução
```python
import numpy as np


def padronizar_treino_teste(X_tr, X_te):
    X_tr = np.asarray(X_tr, dtype=float)
    X_te = np.asarray(X_te, dtype=float)
    media = X_tr.mean(axis=0)
    desvio = X_tr.std(axis=0)
    desvio = np.where(desvio == 0, 1.0, desvio)
    return (X_tr - media) / desvio, (X_te - media) / desvio, media, desvio
```

### Dicas
1. Uma estatística por coluna: em que eixo estão as linhas?
2. O `np.std` já usa `ddof=0`.
3. O teste é transformado com as mesmas `media` e `desvio` usadas no treino.

### Verificação
```json
[
  { "id": "media", "checkpoint": 1, "kind": "expr",
    "setup": "r = padronizar_treino_teste([[1, 10, 5], [2, 10, 7], [3, 10, 9], [6, 10, 11]], [[4, 10, 6], [0, 12, 8]])",
    "expr": "r[2].tolist()", "expected": [3.0, 10.0, 8.0], "tolerance": 1e-9,
    "name": "A média de cada coluna do treino",
    "hint": "Uma média por coluna, calculada só com o treino." },
  { "id": "desvio", "checkpoint": 2, "kind": "expr",
    "setup": "r = padronizar_treino_teste([[1, 10, 5], [2, 10, 7], [3, 10, 9], [6, 10, 11]], [[4, 10, 6], [0, 12, 8]])",
    "expr": "r[3].tolist()", "expected": [1.8708286933869707, 1.0, 2.23606797749979], "tolerance": 1e-9,
    "name": "O desvio populacional de cada coluna, com 1 na coluna constante",
    "hint": "Desvio populacional (ddof=0); onde ele é zero, use 1." },
  { "id": "treino", "checkpoint": 1, "kind": "expr",
    "setup": "r = padronizar_treino_teste([[1, 10, 5], [2, 10, 7], [3, 10, 9], [6, 10, 11]], [[4, 10, 6], [0, 12, 8]])",
    "expr": "r[0].tolist()", "expected": [[-1.0690449676496976, 0.0, -1.3416407864998738], [-0.5345224838248488, 0.0, -0.4472135954999579], [0.0, 0.0, 0.4472135954999579], [1.6035674514745464, 0.0, 1.3416407864998738]], "tolerance": 1e-9,
    "name": "O treino padronizado (a coluna constante sai zerada)" },
  { "id": "teste", "checkpoint": 3, "kind": "expr",
    "setup": "r = padronizar_treino_teste([[1, 10, 5], [2, 10, 7], [3, 10, 9], [6, 10, 11]], [[4, 10, 6], [0, 12, 8]])",
    "expr": "r[1].tolist()", "expected": [[0.5345224838248488, 0.0, -0.8944271909999159], [-1.6035674514745464, 2.0, 0.0]], "tolerance": 1e-9,
    "name": "O teste é padronizado com a média e o desvio do treino",
    "hint": "Nenhuma estatística vem do teste, nem do teste junto com o treino." },
  { "id": "teste-uma-linha", "checkpoint": 3, "kind": "expr",
    "setup": "r = padronizar_treino_teste([[1, 10, 5], [2, 10, 7], [3, 10, 9], [6, 10, 11]], [[4, 10, 6]])",
    "expr": "r[1].tolist()", "expected": [[0.5345224838248488, 0.0, -0.8944271909999159]], "tolerance": 1e-9,
    "name": "Um teste de uma linha não sai todo zero" },
  { "id": "sem-nan", "checkpoint": 2, "kind": "expr",
    "setup": "import numpy as np\nr = padronizar_treino_teste([[1.0, 5.0], [3.0, 5.0]], [[2.0, 6.0]])",
    "expr": "[bool(np.isfinite(r[0]).all()), bool(np.isfinite(r[1]).all())]", "expected": [true, true],
    "name": "Uma coluna constante não produz nan nem inf" },
  { "id": "propriedades", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np\nrng = np.random.default_rng(4)\nXtr = rng.normal(50, 12, size=(40, 3))\nXte = rng.normal(50, 12, size=(10, 3))\nr = padronizar_treino_teste(Xtr, Xte)",
    "expr": "[bool(np.allclose(r[0].mean(axis=0), 0, atol=1e-9)), bool(np.allclose(r[0].std(axis=0), 1, atol=1e-9))]", "expected": [true, true],
    "name": "Cada coluna do treino padronizado tem média 0 e desvio populacional 1" },
  { "id": "tipos", "checkpoint": 3, "kind": "expr",
    "setup": "r = padronizar_treino_teste([[1.0, 2.0], [3.0, 5.0]], [[2.0, 3.0]])",
    "expr": "[type(r).__name__, len(r)] + [type(v).__name__ for v in r]", "expected": ["tuple", 4, "ndarray", "ndarray", "ndarray", "ndarray"],
    "name": "Devolve uma tupla com quatro arrays" }
]
```

### Soluções erradas
```python name="média sem eixo"
import numpy as np


def padronizar_treino_teste(X_tr, X_te):
    X_tr = np.asarray(X_tr, dtype=float)
    X_te = np.asarray(X_te, dtype=float)
    media = X_tr.mean()
    desvio = X_tr.std(axis=0)
    desvio = np.where(desvio == 0, 1.0, desvio)
    return (X_tr - media) / desvio, (X_te - media) / desvio, media, desvio
```
```python name="desvio amostral (ddof=1)"
import numpy as np


def padronizar_treino_teste(X_tr, X_te):
    X_tr = np.asarray(X_tr, dtype=float)
    X_te = np.asarray(X_te, dtype=float)
    media = X_tr.mean(axis=0)
    desvio = X_tr.std(axis=0, ddof=1)
    desvio = np.where(desvio == 0, 1.0, desvio)
    return (X_tr - media) / desvio, (X_te - media) / desvio, media, desvio
```
```python name="desvio zero vira zero"
import numpy as np


def padronizar_treino_teste(X_tr, X_te):
    X_tr = np.asarray(X_tr, dtype=float)
    X_te = np.asarray(X_te, dtype=float)
    media = X_tr.mean(axis=0)
    desvio = X_tr.std(axis=0)
    desvio = np.where(desvio == 0, 0.0, desvio)
    return (X_tr - media) / desvio, (X_te - media) / desvio, media, desvio
```
```python name="estatísticas do conjunto inteiro"
import numpy as np


def padronizar_treino_teste(X_tr, X_te):
    X_tr = np.asarray(X_tr, dtype=float)
    X_te = np.asarray(X_te, dtype=float)
    media = np.vstack([X_tr, X_te]).mean(axis=0)
    desvio = X_tr.std(axis=0)
    desvio = np.where(desvio == 0, 1.0, desvio)
    return (X_tr - media) / desvio, (X_te - media) / desvio, media, desvio
```
```python name="teste com as próprias estatísticas"
import numpy as np


def padronizar_treino_teste(X_tr, X_te):
    X_tr = np.asarray(X_tr, dtype=float)
    X_te = np.asarray(X_te, dtype=float)
    media = X_tr.mean(axis=0)
    desvio = X_tr.std(axis=0)
    desvio = np.where(desvio == 0, 1.0, desvio)
    return (X_tr - media) / desvio, (X_te - X_te.mean(axis=0)) / desvio, media, desvio
```
```python name="estatísticas por linha"
import numpy as np


def padronizar_treino_teste(X_tr, X_te):
    X_tr = np.asarray(X_tr, dtype=float)
    X_te = np.asarray(X_te, dtype=float)
    media = X_tr.mean(axis=1)
    desvio = X_tr.std(axis=0)
    desvio = np.where(desvio == 0, 1.0, desvio)
    return (X_tr - media) / desvio, (X_te - media) / desvio, media, desvio
```

## Passo 4 · Leitura · Escala e convergência

O efeito da escala se mede em épocas. Os números abaixo vêm do executor, com 200 exemplos do gerador do módulo e gradiente em lote a partir de $w = 0$. O critério de parada é o da próxima tarefa: o treino "convergiu" na primeira época em que o custo caiu menos que uma tolerância, $|J_{t-1} - J_t| < \text{tol}$, com $J_0$ o custo antes do primeiro passo.

| Dados | Taxa | Resultado com tol = $10^{-8}$ |
|---|---|---|
| padronizados | 0,1 | converge na época 50 |
| segunda coluna × 1 000, sem padronizar | 0,1 | diverge: o custo vira `inf` |
| segunda coluna × 1 000, sem padronizar | $10^{-6}$ ou menor | não converge em 5 000 épocas |

Com a coluna multiplicada por mil, a curvatura do custo nessa direção cresce um milhão de vezes (a curvatura depende do **quadrado** da escala), e a maior taxa que não diverge cai para perto de $10^{-6}$. Com ela, o peso da coluna grande se ajusta, mas o intercepto e o outro peso andam um milionésimo por passo: o custo vai de 12,8 na época 100 para 12,7 na época 5 000, quando o mínimo é 0,24. Padronizados, os mesmos dados chegam a 0,237 em 100 épocas.

A divergência não levanta erro. No executor, o custo cresce até `inf` e, algumas épocas depois, os pesos viram `nan` (`inf - inf`), tudo em silêncio; no seu computador, o numpy ainda escreve um `RuntimeWarning: overflow encountered` no terminal, que é fácil de não ver. Uma função que treina precisa olhar o próprio resultado: `np.isfinite(custo)` separa um custo de verdade de um `inf` ou de um `nan`.

```python
custo = float(np.mean((X @ w + b - y) ** 2))
if not np.isfinite(custo):
    ...                                   # a taxa divergiu
```

O critério "a queda ficou menor que a tolerância" tem dois cuidados. A queda é medida entre épocas **seguidas**: comparar sempre com o custo inicial nunca dá uma queda pequena. E um treino que diverge nunca satisfaz o critério (a diferença cresce, e depois vira `nan`, que não é menor que nada), então a função precisa de um limite de épocas e de uma resposta para "não convergiu", que não pode ser confundida com um número de épocas.

## Passo 5 · Exercício · Épocas até convergir

Escreva a função que treina por gradiente em lote e diz em que época o custo parou de cair.

### Instruções
1. `epocas_ate_convergir(X, y, taxa, tol, max_epocas)` treina por gradiente em lote a partir de `w` zerado e `b = 0`, com o gradiente do MSE e o passo `taxa`.
2. Calcula o custo $J_0$ antes do primeiro passo e, depois de cada época $t = 1, 2, \dots$, o custo $J_t$ do conjunto; devolve o primeiro $t$ em que $|J_{t-1} - J_t| < \text{tol}$, como `int`.
3. Se isso não acontece em `max_epocas` épocas (inclusive quando o treino diverge), devolve `None`.

### Código inicial
```python
import numpy as np


def epocas_ate_convergir(X, y, taxa, tol, max_epocas):
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


def epocas_ate_convergir(X, y, taxa, tol, max_epocas):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    n, d = X.shape
    w = np.zeros(d)
    b = 0.0
    custo = float(np.mean((X @ w + b - y) ** 2))
    for epoca in range(1, max_epocas + 1):
        residuo = X @ w + b - y
        w = w - taxa * 2 / n * (X.T @ residuo)
        b = b - taxa * 2 / n * float(residuo.sum())
        novo = float(np.mean((X @ w + b - y) ** 2))
        if abs(custo - novo) < tol:
            return epoca
        custo = novo
    return None
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
1. Guarde o custo da época anterior numa variável e atualize-a depois da comparação.
2. Conte as épocas a partir de 1: `range(1, max_epocas + 1)`.
3. Não precisa testar `nan` à parte: uma comparação com `nan` é sempre falsa, e o laço termina pelo limite de épocas.

### Verificação
```json
[
  { "id": "padronizado", "checkpoint": 2, "kind": "expr",
    "setup": "from dados_regressao import gerar_dados\nX, y = gerar_dados(200, semente=6)\nX = (X - X.mean(axis=0)) / X.std(axis=0)",
    "expr": "epocas_ate_convergir(X, y, 0.1, 1e-8, 5000)", "expected": 50, "type": "int",
    "name": "Dados padronizados, taxa 0.1 e tol 1e-8: converge na época 50",
    "hint": "Compare o custo de cada época com o da época anterior (o primeiro com o custo antes de qualquer passo), contando as épocas a partir de 1." },
  { "id": "tolerancia-maior", "checkpoint": 2, "kind": "expr",
    "setup": "from dados_regressao import gerar_dados\nX, y = gerar_dados(200, semente=6)\nX = (X - X.mean(axis=0)) / X.std(axis=0)",
    "expr": "epocas_ate_convergir(X, y, 0.1, 1e-6, 5000)", "expected": 38,
    "name": "Com tol 1e-6, para antes: na época 38" },
  { "id": "primeira-epoca", "checkpoint": 2, "kind": "expr",
    "setup": "from dados_regressao import gerar_dados\nX, y = gerar_dados(200, semente=6)",
    "expr": "epocas_ate_convergir(X, y, 0.1, 1000.0, 50)", "expected": 1,
    "name": "Com uma tolerância enorme, a primeira época já basta (e ela é a época 1)" },
  { "id": "diverge", "checkpoint": 3, "kind": "expr",
    "setup": "from dados_regressao import gerar_dados\nX, y = gerar_dados(200, semente=6, escala=(1.0, 1000.0))",
    "expr": "epocas_ate_convergir(X, y, 0.1, 1e-8, 2000)", "expected": null, "type": "NoneType",
    "name": "Sem padronizar (coluna × 1000), a taxa 0.1 diverge: None",
    "hint": "Um treino que diverge nunca tem uma queda pequena; o laço termina pelo limite de épocas." },
  { "id": "lento", "checkpoint": 3, "kind": "expr",
    "setup": "from dados_regressao import gerar_dados\nX, y = gerar_dados(200, semente=6, escala=(1.0, 1000.0))",
    "expr": "epocas_ate_convergir(X, y, 5e-7, 1e-8, 2000)", "expected": null,
    "name": "Sem padronizar, com a taxa que não diverge, não converge em 2000 épocas" },
  { "id": "limite-de-epocas", "checkpoint": 3, "kind": "expr",
    "setup": "from dados_regressao import gerar_dados\nX, y = gerar_dados(200, semente=6)\nX = (X - X.mean(axis=0)) / X.std(axis=0)",
    "expr": "epocas_ate_convergir(X, y, 0.1, 1e-8, 5)", "expected": null, "type": "NoneType",
    "name": "Se não converge dentro de max_epocas, devolve None (e não max_epocas)" }
]
```

### Soluções erradas
```python name="conta as épocas a partir de 0"
import numpy as np


def epocas_ate_convergir(X, y, taxa, tol, max_epocas):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    n, d = X.shape
    w = np.zeros(d)
    b = 0.0
    custo = float(np.mean((X @ w + b - y) ** 2))
    for epoca in range(max_epocas):
        residuo = X @ w + b - y
        w = w - taxa * 2 / n * (X.T @ residuo)
        b = b - taxa * 2 / n * float(residuo.sum())
        novo = float(np.mean((X @ w + b - y) ** 2))
        if abs(custo - novo) < tol:
            return epoca
        custo = novo
    return None
```
```python name="devolve max_epocas quando não converge"
import numpy as np


def epocas_ate_convergir(X, y, taxa, tol, max_epocas):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    n, d = X.shape
    w = np.zeros(d)
    b = 0.0
    custo = float(np.mean((X @ w + b - y) ** 2))
    for epoca in range(1, max_epocas + 1):
        residuo = X @ w + b - y
        w = w - taxa * 2 / n * (X.T @ residuo)
        b = b - taxa * 2 / n * float(residuo.sum())
        novo = float(np.mean((X @ w + b - y) ** 2))
        if abs(custo - novo) < tol:
            return epoca
        custo = novo
    return max_epocas
```
```python name="compara o custo, não a queda"
import numpy as np


def epocas_ate_convergir(X, y, taxa, tol, max_epocas):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    n, d = X.shape
    w = np.zeros(d)
    b = 0.0
    for epoca in range(1, max_epocas + 1):
        residuo = X @ w + b - y
        w = w - taxa * 2 / n * (X.T @ residuo)
        b = b - taxa * 2 / n * float(residuo.sum())
        novo = float(np.mean((X @ w + b - y) ** 2))
        if novo < tol:
            return epoca
    return None
```
```python name="compara sempre com o custo inicial"
import numpy as np


def epocas_ate_convergir(X, y, taxa, tol, max_epocas):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    n, d = X.shape
    w = np.zeros(d)
    b = 0.0
    custo = float(np.mean((X @ w + b - y) ** 2))
    for epoca in range(1, max_epocas + 1):
        residuo = X @ w + b - y
        w = w - taxa * 2 / n * (X.T @ residuo)
        b = b - taxa * 2 / n * float(residuo.sum())
        novo = float(np.mean((X @ w + b - y) ** 2))
        if abs(custo - novo) < tol:
            return epoca
    return None
```
```python name="começa a comparar só na época 2"
import numpy as np


def epocas_ate_convergir(X, y, taxa, tol, max_epocas):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    n, d = X.shape
    w = np.zeros(d)
    b = 0.0
    custo = None
    for epoca in range(1, max_epocas + 1):
        residuo = X @ w + b - y
        w = w - taxa * 2 / n * (X.T @ residuo)
        b = b - taxa * 2 / n * float(residuo.sum())
        novo = float(np.mean((X @ w + b - y) ** 2))
        if custo is not None and abs(custo - novo) < tol:
            return epoca
        custo = novo
    return None
```

## Passo 6 · Leitura · Busca da taxa e a volta à escala original

Mesmo com os dados padronizados, a taxa ainda precisa ser escolhida. Como ela pode variar por ordens de grandeza, a busca usa uma **grade logarítmica**, por exemplo `[1e-4, 1e-3, 1e-2, 1e-1, 1]`: cada taxa treina pelo mesmo número de épocas, e a melhor é a de menor custo final. Pequena demais, o custo mal desce; grande demais, ele oscila ou diverge; a melhor costuma ficar logo abaixo da que diverge.

As taxas que divergem precisam sair da comparação **antes** de procurar o mínimo, e o `nan` é traiçoeiro. O `np.argmin` de um array com `nan` devolve a posição do `nan`: `np.argmin([nan, 3.0, 1.0])` dá 0. O `min` do Python também se perde, porque toda comparação com `nan` é falsa: `min([3.0, nan, 1.0])` dá `1.0`, mas `min([nan, 3.0, 1.0])` dá `nan`. Filtre com `np.isfinite` e só então compare. E se nenhuma taxa sobrou, a busca não tem resposta: levantar um `ValueError` é melhor do que devolver uma taxa que explode.

Depois do treino, os pesos estão na escala padronizada: $w'_j$ é o efeito de **um desvio** do atributo $j$, e não de uma unidade. Para ler o modelo nas unidades originais, substitua $z_j = (x_j - \mu_j)/\sigma_j$ em $\hat y = b' + \sum_j w'_j z_j$ e reagrupe:

$$
w_j = \frac{w'_j}{\sigma_j}, \qquad b = b' - \sum_{j=1}^{d} \frac{w'_j \mu_j}{\sigma_j}
$$

O intercepto também muda: o $b'$ do modelo padronizado é a previsão para um exemplo **médio** (todo $z_j = 0$), e o $b$ original é a previsão para $x = 0$. Esquecer a correção dá um modelo que prevê bem com dados padronizados e errado com dados brutos.

```python
w_orig = w / desvio
b_orig = b - np.sum(w_orig * media)
```

Os coeficientes convertidos são os mesmos da equação normal nos dados brutos (a próxima lição): a padronização muda o caminho do gradiente, não o modelo a que ele chega.

## Passo 7 · Exercício · Melhor taxa e coeficientes originais

O código já traz o `treinar_batch` da lição anterior. Use-o para buscar a taxa e escreva a volta dos coeficientes à escala original.

### Instruções
1. `buscar_taxa(X, y, taxas, epocas)` treina com cada taxa da lista (com `treinar_batch`, pelo mesmo número de épocas) e devolve a tupla `(taxa, custo)`, dois `float`, da taxa de **menor custo final**, ignorando as taxas cujo custo final não é finito (`inf` ou `nan`).
2. Se nenhuma taxa tem custo final finito, levanta `ValueError`.
3. `coeficientes_na_escala_original(w, b, media, desvio)` recebe os parâmetros de um modelo treinado com dados padronizados e devolve a tupla `(w_orig, b_orig)`: um array com $w'_j/\sigma_j$ e o intercepto corrigido, como `float`.

### Código inicial
```python
import numpy as np


def treinar_batch(X, y, taxa, epocas):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    n, d = X.shape
    w = np.zeros(d)
    b = 0.0
    historico = []
    for _ in range(epocas):
        residuo = X @ w + b - y
        gw = 2 / n * X.T @ residuo
        gb = 2 / n * residuo.sum()
        w = w - taxa * gw
        b = b - taxa * gb
        historico.append(float(np.mean((X @ w + b - y) ** 2)))
    return w, float(b), historico


def buscar_taxa(X, y, taxas, epocas):
    pass


def coeficientes_na_escala_original(w, b, media, desvio):
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


def treinar_batch(X, y, taxa, epocas):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    n, d = X.shape
    w = np.zeros(d)
    b = 0.0
    historico = []
    for _ in range(epocas):
        residuo = X @ w + b - y
        gw = 2 / n * X.T @ residuo
        gb = 2 / n * residuo.sum()
        w = w - taxa * gw
        b = b - taxa * gb
        historico.append(float(np.mean((X @ w + b - y) ** 2)))
    return w, float(b), historico


def buscar_taxa(X, y, taxas, epocas):
    melhor = None
    for taxa in taxas:
        custo = treinar_batch(X, y, taxa, epocas)[2][-1]
        if np.isfinite(custo) and (melhor is None or custo < melhor[1]):
            melhor = (float(taxa), float(custo))
    if melhor is None:
        raise ValueError("todas as taxas divergiram")
    return melhor


def coeficientes_na_escala_original(w, b, media, desvio):
    w = np.asarray(w, dtype=float)
    media = np.asarray(media, dtype=float)
    desvio = np.asarray(desvio, dtype=float)
    w_orig = w / desvio
    return w_orig, float(b - np.sum(w_orig * media))
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
1. O custo final é o último valor do histórico; o `np.isfinite` recusa `inf` e `nan`.
2. Guarde a melhor taxa até agora e só a troque por uma de custo finito e menor.
3. Na volta à escala, divida os pesos pelo desvio e desconte do intercepto a soma de cada peso convertido vezes a média.

### Verificação
```json
[
  { "id": "melhor-taxa", "checkpoint": 1, "kind": "expr",
    "setup": "from dados_regressao import gerar_dados\nX, y = gerar_dados(100, semente=7)\nX = (X - X.mean(axis=0)) / X.std(axis=0)",
    "expr": "buscar_taxa(X, y, [0.001, 0.01, 0.1, 1.0], 100)[0]", "expected": 0.1, "type": "float",
    "name": "Na grade 0.001 a 1, a melhor taxa é 0.1" },
  { "id": "custo", "checkpoint": 1, "kind": "expr",
    "setup": "from dados_regressao import gerar_dados\nX, y = gerar_dados(100, semente=7)\nX = (X - X.mean(axis=0)) / X.std(axis=0)",
    "expr": "buscar_taxa(X, y, [0.001, 0.01, 0.1, 1.0], 100)[1]", "expected": 0.2565834752120104, "type": "float", "tolerance": 1e-9,
    "name": "O custo devolvido é o custo final da melhor taxa" },
  { "id": "descarta-nan", "checkpoint": 1, "kind": "expr",
    "setup": "from dados_regressao import gerar_dados\nX, y = gerar_dados(100, semente=7)\nX = (X - X.mean(axis=0)) / X.std(axis=0)",
    "expr": "buscar_taxa(X, y, [1000.0, 1.0, 0.1, 0.01, 0.001], 100)[0]", "expected": 0.1, "type": "float",
    "name": "Uma taxa que diverge (custo nan) no começo da lista é descartada",
    "hint": "Com nan na lista, argmin e min não funcionam: descarte os custos que não são finitos antes de comparar." },
  { "id": "nao-a-maior-estavel", "checkpoint": 1, "kind": "expr",
    "setup": "from dados_regressao import gerar_dados\nX, y = gerar_dados(100, semente=7)\nX = (X - X.mean(axis=0)) / X.std(axis=0)",
    "expr": "buscar_taxa(X, y, [0.01, 0.1, 1.0], 100)[0]", "expected": 0.1,
    "name": "A maior taxa com custo finito nem sempre é a melhor",
    "hint": "Compare os custos finais; uma taxa pode ter custo finito e enorme." },
  { "id": "todas-divergem", "checkpoint": 2, "kind": "expr",
    "setup": "from dados_regressao import gerar_dados\nX, y = gerar_dados(100, semente=7)\nX = (X - X.mean(axis=0)) / X.std(axis=0)",
    "expr": "buscar_taxa(X, y, [1000.0, 5000.0], 100)", "raises": "ValueError",
    "name": "Se todas as taxas divergem, levanta ValueError" },
  { "id": "volta-mao", "checkpoint": 3, "kind": "expr",
    "setup": "r = coeficientes_na_escala_original([2.0, -1.0], 5.0, [1.0, 10.0], [2.0, 1000.0])",
    "expr": "[r[0].tolist(), r[1]]", "expected": [[1.0, -0.001], 4.01], "tolerance": 1e-12,
    "name": "Volta à escala original de um exemplo à mão",
    "hint": "w_j = w'_j / σ_j e b = b' − Σ w'_j μ_j / σ_j." },
  { "id": "volta-tipos", "checkpoint": 3, "kind": "expr",
    "setup": "r = coeficientes_na_escala_original([2.0, -1.0], 5.0, [1.0, 10.0], [2.0, 1000.0])",
    "expr": "[type(r[0]).__name__, type(r[1]).__name__]", "expected": ["ndarray", "float"],
    "name": "Devolve (array, float)" },
  { "id": "ida-e-volta", "checkpoint": 3, "kind": "expr",
    "setup": "import numpy as np\nfrom dados_regressao import gerar_dados\nX, y = gerar_dados(150, semente=8, escala=(1.0, 1000.0))\nmedia = X.mean(axis=0)\ndesvio = X.std(axis=0)\nw, b, h = treinar_batch((X - media) / desvio, y, 0.1, 500)\nc = np.linalg.lstsq(np.column_stack([np.ones(150), X]), y)[0]\nwo, bo = coeficientes_na_escala_original(w, b, media, desvio)",
    "expr": "bool(np.allclose(wo, c[1:], atol=1e-8) and abs(bo - c[0]) < 1e-8)", "expected": true,
    "name": "Treinar padronizado e voltar à escala dá os coeficientes de mínimos quadrados dos dados brutos" }
]
```

### Soluções erradas
```python name="argmin sem descartar nan"
import numpy as np


def treinar_batch(X, y, taxa, epocas):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    n, d = X.shape
    w = np.zeros(d)
    b = 0.0
    historico = []
    for _ in range(epocas):
        residuo = X @ w + b - y
        gw = 2 / n * X.T @ residuo
        gb = 2 / n * residuo.sum()
        w = w - taxa * gw
        b = b - taxa * gb
        historico.append(float(np.mean((X @ w + b - y) ** 2)))
    return w, float(b), historico


def buscar_taxa(X, y, taxas, epocas):
    custos = np.array([treinar_batch(X, y, taxa, epocas)[2][-1] for taxa in taxas])
    if not np.isfinite(custos).any():
        raise ValueError("todas as taxas divergiram")
    i = int(np.argmin(custos))
    return float(taxas[i]), float(custos[i])


def coeficientes_na_escala_original(w, b, media, desvio):
    w = np.asarray(w, dtype=float)
    media = np.asarray(media, dtype=float)
    desvio = np.asarray(desvio, dtype=float)
    w_orig = w / desvio
    return w_orig, float(b - np.sum(w_orig * media))
```
```python name="a maior taxa que não diverge"
import numpy as np


def treinar_batch(X, y, taxa, epocas):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    n, d = X.shape
    w = np.zeros(d)
    b = 0.0
    historico = []
    for _ in range(epocas):
        residuo = X @ w + b - y
        gw = 2 / n * X.T @ residuo
        gb = 2 / n * residuo.sum()
        w = w - taxa * gw
        b = b - taxa * gb
        historico.append(float(np.mean((X @ w + b - y) ** 2)))
    return w, float(b), historico


def buscar_taxa(X, y, taxas, epocas):
    melhor = None
    for taxa in taxas:
        custo = treinar_batch(X, y, taxa, epocas)[2][-1]
        if np.isfinite(custo) and (melhor is None or taxa > melhor[0]):
            melhor = (float(taxa), float(custo))
    if melhor is None:
        raise ValueError("todas as taxas divergiram")
    return melhor


def coeficientes_na_escala_original(w, b, media, desvio):
    w = np.asarray(w, dtype=float)
    media = np.asarray(media, dtype=float)
    desvio = np.asarray(desvio, dtype=float)
    w_orig = w / desvio
    return w_orig, float(b - np.sum(w_orig * media))
```
```python name="não levanta erro sem taxa válida"
import numpy as np


def treinar_batch(X, y, taxa, epocas):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    n, d = X.shape
    w = np.zeros(d)
    b = 0.0
    historico = []
    for _ in range(epocas):
        residuo = X @ w + b - y
        gw = 2 / n * X.T @ residuo
        gb = 2 / n * residuo.sum()
        w = w - taxa * gw
        b = b - taxa * gb
        historico.append(float(np.mean((X @ w + b - y) ** 2)))
    return w, float(b), historico


def buscar_taxa(X, y, taxas, epocas):
    melhor = None
    for taxa in taxas:
        custo = treinar_batch(X, y, taxa, epocas)[2][-1]
        if np.isfinite(custo) and (melhor is None or custo < melhor[1]):
            melhor = (float(taxa), float(custo))
    return melhor


def coeficientes_na_escala_original(w, b, media, desvio):
    w = np.asarray(w, dtype=float)
    media = np.asarray(media, dtype=float)
    desvio = np.asarray(desvio, dtype=float)
    w_orig = w / desvio
    return w_orig, float(b - np.sum(w_orig * media))
```
```python name="esquece o intercepto na volta"
import numpy as np


def treinar_batch(X, y, taxa, epocas):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    n, d = X.shape
    w = np.zeros(d)
    b = 0.0
    historico = []
    for _ in range(epocas):
        residuo = X @ w + b - y
        gw = 2 / n * X.T @ residuo
        gb = 2 / n * residuo.sum()
        w = w - taxa * gw
        b = b - taxa * gb
        historico.append(float(np.mean((X @ w + b - y) ** 2)))
    return w, float(b), historico


def buscar_taxa(X, y, taxas, epocas):
    melhor = None
    for taxa in taxas:
        custo = treinar_batch(X, y, taxa, epocas)[2][-1]
        if np.isfinite(custo) and (melhor is None or custo < melhor[1]):
            melhor = (float(taxa), float(custo))
    if melhor is None:
        raise ValueError("todas as taxas divergiram")
    return melhor


def coeficientes_na_escala_original(w, b, media, desvio):
    w = np.asarray(w, dtype=float)
    desvio = np.asarray(desvio, dtype=float)
    return w / desvio, float(b)
```
```python name="multiplica pelo desvio"
import numpy as np


def treinar_batch(X, y, taxa, epocas):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    n, d = X.shape
    w = np.zeros(d)
    b = 0.0
    historico = []
    for _ in range(epocas):
        residuo = X @ w + b - y
        gw = 2 / n * X.T @ residuo
        gb = 2 / n * residuo.sum()
        w = w - taxa * gw
        b = b - taxa * gb
        historico.append(float(np.mean((X @ w + b - y) ** 2)))
    return w, float(b), historico


def buscar_taxa(X, y, taxas, epocas):
    melhor = None
    for taxa in taxas:
        custo = treinar_batch(X, y, taxa, epocas)[2][-1]
        if np.isfinite(custo) and (melhor is None or custo < melhor[1]):
            melhor = (float(taxa), float(custo))
    if melhor is None:
        raise ValueError("todas as taxas divergiram")
    return melhor


def coeficientes_na_escala_original(w, b, media, desvio):
    w = np.asarray(w, dtype=float)
    media = np.asarray(media, dtype=float)
    desvio = np.asarray(desvio, dtype=float)
    w_orig = w * desvio
    return w_orig, float(b - np.sum(w_orig * media))
```
```python name="soma a correção do intercepto"
import numpy as np


def treinar_batch(X, y, taxa, epocas):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    n, d = X.shape
    w = np.zeros(d)
    b = 0.0
    historico = []
    for _ in range(epocas):
        residuo = X @ w + b - y
        gw = 2 / n * X.T @ residuo
        gb = 2 / n * residuo.sum()
        w = w - taxa * gw
        b = b - taxa * gb
        historico.append(float(np.mean((X @ w + b - y) ** 2)))
    return w, float(b), historico


def buscar_taxa(X, y, taxas, epocas):
    melhor = None
    for taxa in taxas:
        custo = treinar_batch(X, y, taxa, epocas)[2][-1]
        if np.isfinite(custo) and (melhor is None or custo < melhor[1]):
            melhor = (float(taxa), float(custo))
    if melhor is None:
        raise ValueError("todas as taxas divergiram")
    return melhor


def coeficientes_na_escala_original(w, b, media, desvio):
    w = np.asarray(w, dtype=float)
    media = np.asarray(media, dtype=float)
    desvio = np.asarray(desvio, dtype=float)
    w_orig = w / desvio
    return w_orig, float(b + np.sum(w_orig * media))
```

## Passo 8 · Quiz · Escala e vazamento

### Pergunta
Para padronizar, um colega escreve:

```python
X_todo = np.vstack([X_treino, X_teste])
media, desvio = X_todo.mean(axis=0), X_todo.std(axis=0)
X_treino_z = (X_treino - media) / desvio
X_teste_z = (X_teste - media) / desvio
```

O treino e o teste ficam na mesma escala. Qual é o problema?
- [ ] Nenhum: com as mesmas estatísticas nos dois conjuntos, não há vazamento
- [x] A média e o desvio usam o teste, e o modelo é avaliado em dados que já influenciaram o treino: é vazamento, e a avaliação fica otimista
- [ ] O desvio deveria ser o amostral (`ddof=1`), porque o conjunto inteiro é uma amostra
- [ ] O problema é só de desempenho: calcular estatísticas do conjunto inteiro é mais lento
> A regra é aprender as estatísticas só no treino e aplicá-las aos dois. Aqui o teste participa da média e do desvio: um teste com valores atípicos muda a escala do treino, e a avaliação deixa de ser sobre dados nunca vistos. O `ddof` não muda nada disso (e o padrão do módulo é o populacional), e o custo de calcular é irrelevante.

### Pergunta
Um modelo foi treinado por gradiente com os atributos padronizados: $w' = (3{,}0;\ -2{,}0)$ e $b' = 50$, com médias $\mu = (10;\ 200)$ e desvios $\sigma = (2;\ 40)$. Qual é o modelo nas unidades originais?
- [ ] $w = (3;\ -2)$ e $b = 50$
- [ ] $w = (6;\ -80)$ e $b = 50$
- [x] $w = (1{,}5;\ -0{,}05)$ e $b = 50 - (15 - 10) = 45$
- [ ] $w = (1{,}5;\ -0{,}05)$ e $b = 50$
> Cada peso é dividido pelo desvio da sua coluna: $3/2 = 1{,}5$ e $-2/40 = -0{,}05$. O intercepto desconta $\sum w_j \mu_j = 1{,}5 \cdot 10 + (-0{,}05) \cdot 200 = 15 - 10 = 5$. Manter os pesos padronizados ou multiplicá-los pelo desvio dá outra escala, e esquecer a correção do intercepto desloca todas as previsões em 5.

### Pergunta
Numa busca de taxa, os custos finais de cada taxa foram:

```text
taxa:   0.0001   0.001   0.01    0.1    1.0
custo:  9.8      3.1     0.26    0.25   nan
```

O código escolhe a taxa com `taxas[np.argmin(custos)]`. Qual taxa ele devolve, e o que fazer?
- [ ] 0.1, a de menor custo; o código está certo
- [x] 1.0, porque o `argmin` aponta para o `nan`; os custos que não são finitos precisam ser descartados antes
- [ ] 0.01, porque o `argmin` desempata pela taxa menor
- [ ] Um `ValueError`, porque o `argmin` não aceita `nan`
> No numpy, o `argmin` de um array com `nan` devolve a posição do `nan` (o `nan` "vence" todas as comparações). Nenhum erro é levantado. O certo é filtrar com `np.isfinite` e procurar o mínimo entre as taxas que sobraram; aqui, 0.1.
