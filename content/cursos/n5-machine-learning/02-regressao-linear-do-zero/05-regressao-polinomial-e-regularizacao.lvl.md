---
slug: n5-m2-05-regressao-polinomial-e-regularizacao
titulo: Regressão polinomial e regularização (ridge e lasso)
descricao: Atributos polinomiais, sobreajuste visível, ridge (L2) do zero, lasso (L1) com scikit-learn e o efeito de λ nos coeficientes.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- scikit-learn
xp: 130
tempo_min: 55
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Gerar atributos polinomiais e observar o sobreajuste com o grau
- Implementar ridge do zero (equação normal regularizada e gradiente) e explicar o efeito de λ
- Usar Lasso do scikit-learn para seleção de atributos e comparar os caminhos dos coeficientes
---

## Passo 1 · Leitura · Mais graus, mais curvas

Um sensor fictício mede a temperatura de um forno ao longo de um ciclo, e a curva sobe e desce. Uma reta não acompanha isso, mas o modelo linear consegue, com um truque: ele é linear **nos pesos**, não no atributo. Acrescente colunas com as potências de $x$ e ajuste o mesmo modelo de antes:

$$
\hat y = b + w_1 x + w_2 x^2 + \dots + w_g x^g
$$

A matriz de atributos passa a ter as colunas $[x, x^2, \dots, x^g]$, e as ferramentas das lições anteriores funcionam sem mudança. Com vários atributos, a expansão também inclui os produtos entre eles ($x_1 x_2$, as **interações**); nesta lição fica um atributo só.

```python
x = np.array([0.5, 2.0])
x[:, None] ** np.arange(1, 4)   # colunas x, x², x³
# [[0.5, 0.25, 0.125], [2.0, 4.0, 8.0]]
```

O grau $g$ é uma escolha, e ela tem um preço. Cada grau a mais dá ao modelo mais liberdade, e o erro **no treino** nunca sobe: o modelo de grau $g + 1$ pode sempre repetir o de grau $g$ com o último peso em zero. Com $n$ pontos e grau $n - 1$, a curva passa exatamente por todos, e o erro de treino é zero. Mas entre os pontos ela oscila para acertar o ruído, e o erro em dados **novos** explode. É o **sobreajuste**: o erro de validação, medido em exemplos que o ajuste não viu, desenha um U em função do grau, alto com grau baixo (o modelo não tem forma suficiente), mínimo num grau intermediário e alto de novo com grau alto.

Por isso o grau se escolhe pelo erro de **validação**, nunca pelo de treino, que sempre aponta o maior grau. A separação entre treino e validação precisa ser sorteada: com os dados ordenados por $x$, pegar as primeiras linhas para o treino faz a validação ser uma extrapolação para fora da faixa do treino.

A escala também volta a importar. Com $x$ entre 0 e 100, a coluna $x^9$ vai até $10^{18}$, e a matriz $X^\top X$ fica tão mal condicionada que os coeficientes saem dominados por arredondamento. Com $x$ entre 0 e 1, ou padronizado, as potências ficam comparáveis. A outra forma de domar um grau alto é limitar os pesos: a **regularização**.

## Passo 2 · Previsão · Erro de treino e validação por grau

O programa sorteia 10 pontos de treino e 50 de validação de uma senoide com ruído, ajusta polinômios de graus 1, 3 e 9 e compara os erros. Leia sem executar e digite o que ele imprime.

### Código
```python
import numpy as np

rng = np.random.default_rng(0)
x = np.sort(rng.uniform(0, 1, 10))
y = np.sin(2 * np.pi * x) + rng.normal(0, 0.2, 10)
xv = rng.uniform(0, 1, 50)
yv = np.sin(2 * np.pi * xv) + rng.normal(0, 0.2, 50)

graus = [1, 3, 9]
treino, validacao = [], []
for g in graus:
    coef = np.polyfit(x, y, g)
    treino.append(np.mean((np.polyval(coef, x) - y) ** 2))
    validacao.append(np.mean((np.polyval(coef, xv) - yv) ** 2))

print("treino cai com o grau:", treino[0] > treino[1] > treino[2])
print("treino do grau 9:", round(float(treino[2]), 6))
print("menor validação no grau:", graus[int(np.argmin(validacao))])
print("validação do grau 9 maior que a do grau 1:", bool(validacao[2] > validacao[0]))
```

### Dicas
1. Um grau a mais nunca piora o ajuste no treino.
2. Com 10 pontos, um polinômio de grau 9 tem 10 coeficientes: passa por todos os pontos.
3. Uma senoide num ciclo tem uma subida e uma descida: um polinômio de grau 3 tem essa forma; o de grau 9 oscila entre os pontos de treino.

### Saída esperada
```text
treino cai com o grau: True
treino do grau 9: 0.0
menor validação no grau: 3
validação do grau 9 maior que a do grau 1: True
```

## Passo 3 · Exercício · Atributos polinomiais
modo: lacunas

Complete as lacunas (`___`) da função que expande um atributo nas suas potências.

### Instruções
1. `atributos_polinomiais(x, grau)` recebe um vetor `x` de forma `(n,)` e devolve uma matriz `float` de forma `(n, grau)`.
2. A coluna `j` (a partir de 0) é $x^{j+1}$: as colunas são $x, x^2, \dots, x^{\text{grau}}$, **sem** a coluna de uns.
3. Sem laço: use broadcasting entre `x` como coluna e o vetor de potências.

### Código inicial
```python
import numpy as np


def atributos_polinomiais(x, grau):
    x = np.asarray(x, dtype=float)
    potencias = np.arange(___, ___)
    return ___
```

### Solução
```python
import numpy as np


def atributos_polinomiais(x, grau):
    x = np.asarray(x, dtype=float)
    potencias = np.arange(1, grau + 1)
    return x[:, None] ** potencias
```

### Dicas
1. O `np.arange` não inclui o limite final.
2. A coluna de uns ($x^0$) fica de fora: o intercepto é tratado à parte.
3. `x[:, None]` tem forma `(n, 1)`; elevado a um vetor `(grau,)`, dá `(n, grau)`.

### Verificação
```json
[
  { "id": "valores", "checkpoint": 2, "kind": "expr",
    "expr": "atributos_polinomiais([2, 3, -1], 3).tolist()", "expected": [[2.0, 4.0, 8.0], [3.0, 9.0, 27.0], [-1.0, 1.0, -1.0]], "tolerance": 1e-12,
    "name": "Três valores, grau 3: as colunas x, x² e x³",
    "hint": "As potências vão de 1 até o grau, inclusive." },
  { "id": "forma", "checkpoint": 1, "kind": "expr",
    "expr": "list(atributos_polinomiais([0.1, 0.2, 0.3, 0.4, 0.5], 4).shape)", "expected": [5, 4],
    "name": "5 valores e grau 4: forma (5, 4)",
    "hint": "Uma linha por valor de x e uma coluna por potência." },
  { "id": "grau-1", "checkpoint": 2, "kind": "expr",
    "expr": "atributos_polinomiais([1.5, -2.0], 1).tolist()", "expected": [[1.5], [-2.0]], "tolerance": 1e-12,
    "name": "Grau 1: uma coluna, o próprio x" },
  { "id": "sem-uns", "checkpoint": 2, "kind": "expr",
    "expr": "atributos_polinomiais([0.5], 2).tolist()", "expected": [[0.5, 0.25]], "tolerance": 1e-12,
    "name": "Sem a coluna de uns: a primeira coluna é x",
    "hint": "A potência zero não entra." },
  { "id": "tipo", "checkpoint": 1, "kind": "expr",
    "setup": "r = atributos_polinomiais([1, 2, 3], 2)",
    "expr": "[type(r).__name__, str(r.dtype)]", "expected": ["ndarray", "float64"],
    "name": "Devolve um array float64, mesmo com x inteiro" },
  { "id": "sem-for", "checkpoint": 3, "kind": "source", "rule": { "type": "not_uses", "construct": "for" },
    "name": "Sem laço for" }
]
```

### Soluções erradas
```python name="inclui a coluna de uns"
import numpy as np


def atributos_polinomiais(x, grau):
    x = np.asarray(x, dtype=float)
    potencias = np.arange(0, grau + 1)
    return x[:, None] ** potencias
```
```python name="para antes do grau"
import numpy as np


def atributos_polinomiais(x, grau):
    x = np.asarray(x, dtype=float)
    potencias = np.arange(1, grau)
    return x[:, None] ** potencias
```
```python name="sem o eixo novo"
import numpy as np


def atributos_polinomiais(x, grau):
    x = np.asarray(x, dtype=float)
    potencias = np.arange(1, grau + 1)
    return x ** potencias
```
```python name="eixos trocados"
import numpy as np


def atributos_polinomiais(x, grau):
    x = np.asarray(x, dtype=float)
    potencias = np.arange(1, grau + 1)
    return x[None, :] ** potencias[:, None]
```
```python name="multiplica em vez de elevar"
import numpy as np


def atributos_polinomiais(x, grau):
    x = np.asarray(x, dtype=float)
    potencias = np.arange(1, grau + 1)
    return x[:, None] * potencias
```

## Passo 4 · Leitura · Ridge

A regularização muda o custo: além de errar pouco, o modelo é cobrado pelo tamanho dos pesos. O **ridge** soma a norma L2 ao quadrado:

$$
J(w, b) = \sum_{i=1}^{n} \left(y_i - b - x_i^\top w\right)^2 + \lambda \lVert w \rVert^2
$$

Com $\lambda = 0$ é a regressão comum; com $\lambda$ grande, os pesos encolhem em direção a zero, e o modelo fica mais rígido (menos variância, mais viés). Num polinômio de grau alto, o ridge troca as oscilações enormes por uma curva suave.

O **intercepto não é regularizado**: $\lambda$ multiplica $\lVert w \rVert^2$, sem o $b$. Encolher o $b$ puxaria todas as previsões para zero, e o resultado mudaria se você somasse uma constante ao alvo (medir temperaturas em kelvin em vez de graus Celsius mudaria o modelo). Igualar o gradiente a zero dá a equação normal regularizada, com a coluna de uns na frente:

$$
\left(X'^\top X' + \lambda I'\right) w' = X'^\top y, \qquad I' = \text{diag}(0, 1, 1, \dots, 1)
$$

A matriz $I'$ é a identidade com zero na posição do intercepto. No gradiente, a penalidade acrescenta $2\lambda w$ à derivada em relação a $w$, e nada à derivada em relação a $b$. Um bônus: para $\lambda > 0$, a matriz do sistema nunca é singular (com a coluna de uns presente e linhas suficientes para o intercepto), e o ridge resolve as colunas colineares da lição anterior. Com uma coluna repetida, ele divide o peso igualmente entre as duas cópias.

```python
P = lam * np.eye(Xb.shape[1])
P[0, 0] = 0.0                        # não regulariza o intercepto
coef = np.linalg.solve(Xb.T @ Xb + P, Xb.T @ y)
```

O `Ridge(alpha=lam)` do scikit-learn minimiza exatamente esse custo, com a soma dos quadrados (sem dividir por $n$) e sem penalizar o intercepto: a sua implementação e a dele dão os mesmos coeficientes, a menos de arredondamento. A correção deste passo compara com ele.

A escala importa ainda mais aqui. A penalidade trata todos os pesos igualmente, mas o tamanho de um peso depende da unidade da coluna: medir uma distância em metros ou em quilômetros multiplica o peso por mil e muda o quanto ele é penalizado. Antes do ridge, padronize os atributos (com as estatísticas do treino).

## Passo 5 · Exercício · Ridge do zero

Escreva o ridge pela equação normal regularizada, sem o scikit-learn, e meça como a norma dos pesos encolhe com $\lambda$. A correção treina o `Ridge` do scikit-learn como referência.

### Instruções
1. `ridge_equacao_normal(X, y, lam)` acrescenta a coluna de uns na frente de `X`, resolve $(X'^\top X' + \lambda I') w' = X'^\top y$ **sem regularizar o intercepto** e devolve a tupla `(w, b)`: o array dos pesos e o intercepto como `float`.
2. `norma_por_lambda(X, y, lambdas)` devolve uma lista de `float` com a norma euclidiana de `w` (sem o intercepto) para cada `lam`, na ordem da lista recebida.
3. Não use o scikit-learn.

### Código inicial
```python
import numpy as np


def ridge_equacao_normal(X, y, lam):
    pass


def norma_por_lambda(X, y, lambdas):
    pass
```

### Solução
```python
import numpy as np


def ridge_equacao_normal(X, y, lam):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    Xb = np.column_stack([np.ones(len(X)), X])
    P = lam * np.eye(Xb.shape[1])
    P[0, 0] = 0.0
    coef = np.linalg.solve(Xb.T @ Xb + P, Xb.T @ y)
    return coef[1:], float(coef[0])


def norma_por_lambda(X, y, lambdas):
    return [float(np.linalg.norm(ridge_equacao_normal(X, y, lam)[0])) for lam in lambdas]
```

### Dicas
1. Monte a matriz $\lambda I$ do tamanho de $X'^\top X'$ e zere a posição do intercepto.
2. Os coeficientes saem com o intercepto na posição 0; separe-o dos pesos.
3. A norma da lista é a dos pesos `w`, sem o `b`.

### Verificação
```json
[
  { "id": "igual-ao-ridge-w", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np\nfrom sklearn.linear_model import Ridge\nrng = np.random.default_rng(5)\nX = rng.normal(size=(60, 3))\ny = 1.0 + 2.0 * X[:, 0] - X[:, 2] + rng.normal(0, 0.3, 60)\nref = Ridge(alpha=2.5).fit(X, y)\nw, b = ridge_equacao_normal(X, y, 2.5)",
    "expr": "bool(np.allclose(w, ref.coef_, atol=1e-8))", "expected": true,
    "name": "Com λ = 2.5, os pesos do Ridge(alpha=2.5) do scikit-learn",
    "hint": "O intercepto não entra na penalidade: zere a posição dele na matriz λI." },
  { "id": "igual-ao-ridge-b", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np\nfrom sklearn.linear_model import Ridge\nrng = np.random.default_rng(5)\nX = rng.normal(size=(60, 3))\ny = 1.0 + 2.0 * X[:, 0] - X[:, 2] + rng.normal(0, 0.3, 60)\nref = Ridge(alpha=2.5).fit(X, y)\nw, b = ridge_equacao_normal(X, y, 2.5)",
    "expr": "bool(abs(b - ref.intercept_) < 1e-8)", "expected": true,
    "name": "Com λ = 2.5, o intercepto do Ridge(alpha=2.5)" },
  { "id": "lambda-zero", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np\nrng = np.random.default_rng(5)\nX = rng.normal(size=(60, 3))\ny = 1.0 + 2.0 * X[:, 0] - X[:, 2] + rng.normal(0, 0.3, 60)\nref = np.linalg.lstsq(np.column_stack([np.ones(60), X]), y)[0]\nw, b = ridge_equacao_normal(X, y, 0.0)",
    "expr": "bool(np.allclose(np.r_[b, w], ref, atol=1e-8))", "expected": true,
    "name": "Com λ = 0, a regressão comum" },
  { "id": "lambda-enorme", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np\nrng = np.random.default_rng(5)\nX = rng.normal(size=(60, 3))\ny = 1.0 + 2.0 * X[:, 0] - X[:, 2] + rng.normal(0, 0.3, 60)\nw, b = ridge_equacao_normal(X, y, 1e9)",
    "expr": "[bool(np.allclose(w, 0.0, atol=1e-6)), bool(abs(b - y.mean()) < 1e-4)]", "expected": [true, true],
    "name": "Com λ enorme, os pesos vão a zero e o intercepto vai para a média de y",
    "hint": "Se o intercepto também encolhe, ele está sendo regularizado." },
  { "id": "colinear", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np\nfrom sklearn.linear_model import Ridge\nrng = np.random.default_rng(5)\nX = rng.normal(size=(60, 3))\ny = 1.0 + 2.0 * X[:, 0] - X[:, 2] + rng.normal(0, 0.3, 60)\nD = np.column_stack([X, X[:, 0]])\nref = Ridge(alpha=1.0).fit(D, y)\nw, b = ridge_equacao_normal(D, y, 1.0)",
    "expr": "bool(np.allclose(w, ref.coef_, atol=1e-8))", "expected": true,
    "name": "Com uma coluna repetida e λ = 1, o sistema tem solução e bate com o Ridge" },
  { "id": "tipos", "checkpoint": 1, "kind": "expr",
    "setup": "r = ridge_equacao_normal([[1.0], [2.0], [3.0]], [1.0, 2.0, 2.5], 0.5)",
    "expr": "[type(r).__name__, type(r[0]).__name__, type(r[1]).__name__]", "expected": ["tuple", "ndarray", "float"],
    "name": "Devolve a tupla (array, float)" },
  { "id": "normas", "checkpoint": 2, "kind": "expr",
    "setup": "import numpy as np\nrng = np.random.default_rng(5)\nX = rng.normal(size=(60, 3))\ny = 1.0 + 2.0 * X[:, 0] - X[:, 2] + rng.normal(0, 0.3, 60)",
    "expr": "norma_por_lambda(X, y, [10.0, 0.0, 100.0, 1.0])", "expected": [1.873070673799661, 2.2196604233453323, 0.7826827423329351, 2.1792356211874355], "tolerance": 1e-9,
    "name": "A norma dos pesos para λ = 10, 0, 100 e 1, na ordem recebida",
    "hint": "Uma norma por λ, na ordem da lista, sem incluir o intercepto." },
  { "id": "decrescente", "checkpoint": 2, "kind": "expr",
    "setup": "import numpy as np\nrng = np.random.default_rng(5)\nX = rng.normal(size=(60, 3))\ny = 1.0 + 2.0 * X[:, 0] - X[:, 2] + rng.normal(0, 0.3, 60)\nr = norma_por_lambda(X, y, [0.0, 0.1, 1.0, 10.0, 100.0, 1000.0])",
    "expr": "[type(r).__name__, type(r[0]).__name__, all(a > c for a, c in zip(r, r[1:]))]", "expected": ["list", "float", true],
    "name": "Uma lista de float que diminui quando λ cresce" },
  { "id": "sem-sklearn", "checkpoint": 3, "kind": "source", "rule": { "type": "not_calls", "name": "sklearn" },
    "name": "Implementa sem o scikit-learn" }
]
```

### Soluções erradas
```python name="regulariza o intercepto"
import numpy as np


def ridge_equacao_normal(X, y, lam):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    Xb = np.column_stack([np.ones(len(X)), X])
    P = lam * np.eye(Xb.shape[1])
    coef = np.linalg.solve(Xb.T @ Xb + P, Xb.T @ y)
    return coef[1:], float(coef[0])


def norma_por_lambda(X, y, lambdas):
    return [float(np.linalg.norm(ridge_equacao_normal(X, y, lam)[0])) for lam in lambdas]
```
```python name="λ multiplicado por n"
import numpy as np


def ridge_equacao_normal(X, y, lam):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    Xb = np.column_stack([np.ones(len(X)), X])
    P = len(X) * lam * np.eye(Xb.shape[1])
    P[0, 0] = 0.0
    coef = np.linalg.solve(Xb.T @ Xb + P, Xb.T @ y)
    return coef[1:], float(coef[0])


def norma_por_lambda(X, y, lambdas):
    return [float(np.linalg.norm(ridge_equacao_normal(X, y, lam)[0])) for lam in lambdas]
```
```python name="sem a coluna de uns"
import numpy as np


def ridge_equacao_normal(X, y, lam):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    w = np.linalg.solve(X.T @ X + lam * np.eye(X.shape[1]), X.T @ y)
    return w, 0.0


def norma_por_lambda(X, y, lambdas):
    return [float(np.linalg.norm(ridge_equacao_normal(X, y, lam)[0])) for lam in lambdas]
```
```python name="usa o Ridge pronto"
import numpy as np
from sklearn.linear_model import Ridge


def ridge_equacao_normal(X, y, lam):
    modelo = Ridge(alpha=lam).fit(X, y)
    return modelo.coef_, float(modelo.intercept_)


def norma_por_lambda(X, y, lambdas):
    return [float(np.linalg.norm(ridge_equacao_normal(X, y, lam)[0])) for lam in lambdas]
```
```python name="norma com o intercepto"
import numpy as np


def ridge_equacao_normal(X, y, lam):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    Xb = np.column_stack([np.ones(len(X)), X])
    P = lam * np.eye(Xb.shape[1])
    P[0, 0] = 0.0
    coef = np.linalg.solve(Xb.T @ Xb + P, Xb.T @ y)
    return coef[1:], float(coef[0])


def norma_por_lambda(X, y, lambdas):
    normas = []
    for lam in lambdas:
        w, b = ridge_equacao_normal(X, y, lam)
        normas.append(float(np.linalg.norm(np.r_[b, w])))
    return normas
```
```python name="ordena os lambdas"
import numpy as np


def ridge_equacao_normal(X, y, lam):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    Xb = np.column_stack([np.ones(len(X)), X])
    P = lam * np.eye(Xb.shape[1])
    P[0, 0] = 0.0
    coef = np.linalg.solve(Xb.T @ Xb + P, Xb.T @ y)
    return coef[1:], float(coef[0])


def norma_por_lambda(X, y, lambdas):
    return [float(np.linalg.norm(ridge_equacao_normal(X, y, lam)[0])) for lam in sorted(lambdas)]
```

## Passo 6 · Leitura · Lasso e os coeficientes zero

O **lasso** troca o quadrado dos pesos pelo valor absoluto, a norma L1. No scikit-learn, o `Lasso(alpha)` minimiza

$$
\frac{1}{2n} \sum_{i=1}^{n} \left(y_i - b - x_i^\top w\right)^2 + \alpha \sum_{j=1}^{d} \lvert w_j \rvert
$$

A diferença de forma muda o comportamento. A derivada de $w_j^2$ some perto de zero, e o ridge encolhe os pesos sem nunca zerá-los. A de $\lvert w_j \rvert$ é $\pm 1$ até o zero, e o lasso empurra os pesos pouco úteis até **exatamente** 0,0: ele seleciona atributos. Com 5 colunas sorteadas e um alvo que só depende de duas, um `Lasso(alpha=0.1)` nos dados padronizados dá coeficientes como `[2.85, 0.0, -0.0, -1.87, 0.0]`, e as três colunas inúteis saem do modelo. O lasso não tem fórmula fechada: o scikit-learn o resolve por descida coordenada, um peso de cada vez, e os zeros saem exatos.

```python
modelo = Lasso(alpha=0.1).fit(Z, y)        # Z: atributos padronizados
np.flatnonzero(modelo.coef_).tolist()      # [0, 3]
```

O `np.flatnonzero` devolve as posições diferentes de zero como array; o `.tolist()` as converte em `int` do Python. Cuidado com o `np.nonzero`, que devolve uma **tupla** de arrays, um por dimensão: `list(np.nonzero(coef))` é uma lista com um array dentro.

Duas armadilhas de convenção. Primeira: o `alpha` do `Lasso` e o do `Ridge` não são comparáveis. O lasso divide o erro por $2n$; o ridge da biblioteca (e o seu, do passo 5) não divide por nada. Um mesmo `alpha=1.0` é uma penalidade muito mais forte no lasso, e o efeito de um $\lambda$ fixo no ridge enfraquece quando o número de exemplos cresce. Antes de copiar um valor de um artigo ou de outra biblioteca, confira a fórmula do custo. Segunda: a penalidade compara pesos de colunas diferentes, e um atributo medido numa unidade minúscula precisa de um peso enorme, que o lasso corta. Padronize antes: com uma coluna útil multiplicada por 0,001, o lasso sem padronizar a descarta e fica com colunas inúteis; padronizado, ele a mantém.

Com $\alpha$ crescendo, mais coeficientes zeram, até que nenhum sobra e o modelo prevê a média. O valor de $\alpha$, como o grau do polinômio, se escolhe pela validação.

## Passo 7 · Exercício · Seleção com lasso e o grau certo

O código já traz `atributos_polinomiais`, do passo 3. Escreva a seleção com o `Lasso`, a comparação de graus por treino e validação e a escolha do grau.

### Instruções
1. `selecionar_com_lasso(X, y, alpha)` padroniza as colunas de `X` pelo escore $z$ (média e desvio populacional do próprio `X`), ajusta `Lasso(alpha=alpha)` e devolve a lista, em ordem crescente, das posições dos coeficientes diferentes de zero, como `int` do Python.
2. `erro_treino_validacao_por_grau(x, y, graus, semente)` sorteia a ordem dos exemplos com `np.random.default_rng(semente).permutation(n)`, usa as primeiras `7 * n // 10` posições da ordem como treino e o resto como validação e, para cada grau, ajusta por mínimos quadrados (`np.linalg.lstsq`) um polinômio **com intercepto** no treino. Devolve um dicionário `{grau: (mse_treino, mse_validacao)}`, com `float`.
3. `melhor_grau(erros)` recebe esse dicionário e devolve o grau de **menor erro de validação**; no empate, o menor grau.

### Código inicial
```python
import numpy as np
from sklearn.linear_model import Lasso


def atributos_polinomiais(x, grau):
    x = np.asarray(x, dtype=float)
    potencias = np.arange(1, grau + 1)
    return x[:, None] ** potencias


def selecionar_com_lasso(X, y, alpha):
    pass


def erro_treino_validacao_por_grau(x, y, graus, semente):
    pass


def melhor_grau(erros):
    pass
```

### Solução
```python
import numpy as np
from sklearn.linear_model import Lasso


def atributos_polinomiais(x, grau):
    x = np.asarray(x, dtype=float)
    potencias = np.arange(1, grau + 1)
    return x[:, None] ** potencias


def selecionar_com_lasso(X, y, alpha):
    X = np.asarray(X, dtype=float)
    Z = (X - X.mean(axis=0)) / X.std(axis=0)
    modelo = Lasso(alpha=alpha).fit(Z, y)
    return np.flatnonzero(modelo.coef_).tolist()


def erro_treino_validacao_por_grau(x, y, graus, semente):
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    ordem = np.random.default_rng(semente).permutation(len(x))
    corte = 7 * len(x) // 10
    treino, validacao = ordem[:corte], ordem[corte:]
    erros = {}
    for grau in graus:
        A = np.column_stack([np.ones(len(x)), atributos_polinomiais(x, grau)])
        coef = np.linalg.lstsq(A[treino], y[treino])[0]
        mse_treino = float(np.mean((A[treino] @ coef - y[treino]) ** 2))
        mse_validacao = float(np.mean((A[validacao] @ coef - y[validacao]) ** 2))
        erros[grau] = (mse_treino, mse_validacao)
    return erros


def melhor_grau(erros):
    return min(erros, key=lambda grau: (erros[grau][1], grau))
```

### Dicas
1. O `np.flatnonzero(...).tolist()` devolve as posições não nulas já como `int`, em ordem crescente.
2. Separe as posições do treino e da validação uma vez, antes do laço dos graus, e use as mesmas para todos os graus.
3. No `min` com `key`, uma tupla `(erro de validação, grau)` desempata pelo grau.

### Verificação
```json
[
  { "id": "lasso-basico", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np\nrng = np.random.default_rng(8)\nX = rng.normal(size=(100, 5))\ny = 3 * X[:, 0] - 2 * X[:, 3] + rng.normal(0, 0.5, 100)",
    "expr": "selecionar_com_lasso(X, y, 0.1)", "expected": [0, 3],
    "name": "O alvo depende das colunas 0 e 3: o lasso fica só com elas" },
  { "id": "lasso-forte", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np\nrng = np.random.default_rng(8)\nX = rng.normal(size=(100, 5))\ny = 3 * X[:, 0] - 2 * X[:, 3] + rng.normal(0, 0.5, 100)",
    "expr": "selecionar_com_lasso(X, y, 5.0)", "expected": [],
    "name": "Com alpha = 5, nenhum coeficiente sobra" },
  { "id": "lasso-escala", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np\nrng = np.random.default_rng(8)\nX = rng.normal(size=(100, 5))\ny = 3 * X[:, 0] + 1.5 * X[:, 1] + rng.normal(0, 0.5, 100)\nX[:, 1] = X[:, 1] * 0.001",
    "expr": "selecionar_com_lasso(X, y, 0.1)", "expected": [0, 1],
    "name": "Uma coluna útil numa unidade minúscula continua selecionada",
    "hint": "Padronize as colunas antes do Lasso: a penalidade compara pesos de colunas diferentes." },
  { "id": "lasso-tipos", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np\nrng = np.random.default_rng(8)\nX = rng.normal(size=(100, 5))\ny = 3 * X[:, 0] - 2 * X[:, 3] + rng.normal(0, 0.5, 100)\nr = selecionar_com_lasso(X, y, 0.1)",
    "expr": "[type(r).__name__] + [type(i).__name__ for i in r]", "expected": ["list", "int", "int"],
    "name": "Devolve uma lista de int do Python" },
  { "id": "grau-3", "checkpoint": 2, "kind": "expr",
    "setup": "import numpy as np\nrng = np.random.default_rng(2)\nx = rng.uniform(0, 1, 40)\ny = np.sin(2 * np.pi * x) + rng.normal(0, 0.2, 40)\ne = erro_treino_validacao_por_grau(x, y, [1, 3, 9], 0)",
    "expr": "[sorted(e), list(e[3])]", "expected": [[1, 3, 9], [0.04250846852524496, 0.06677747532212507]], "tolerance": 1e-9,
    "name": "Os erros de treino e validação do grau 3 com a semente 0",
    "hint": "Treino = primeiras 7·n//10 posições da ordem sorteada; ajuste com a coluna de uns e meça o MSE de cada parte." },
  { "id": "grau-9", "checkpoint": 2, "kind": "expr",
    "setup": "import numpy as np\nrng = np.random.default_rng(2)\nx = rng.uniform(0, 1, 40)\ny = np.sin(2 * np.pi * x) + rng.normal(0, 0.2, 40)\ne = erro_treino_validacao_por_grau(x, y, [1, 3, 9], 0)",
    "expr": "list(e[9])", "expected": [0.023508770379128803, 0.704301731905014], "tolerance": 1e-9,
    "name": "Grau 9: treino menor, validação muito maior",
    "hint": "O erro de validação é medido nos exemplos que ficaram fora do ajuste." },
  { "id": "outra-semente", "checkpoint": 2, "kind": "expr",
    "setup": "import numpy as np\nrng = np.random.default_rng(2)\nx = rng.uniform(0, 1, 40)\ny = np.sin(2 * np.pi * x) + rng.normal(0, 0.2, 40)\ne = erro_treino_validacao_por_grau(x, y, [3], 1)",
    "expr": "list(e[3])", "expected": [0.04372988754328533, 0.05140275740131975], "tolerance": 1e-9,
    "name": "Outra semente, outra divisão",
    "hint": "A divisão sai de default_rng(semente).permutation(n)." },
  { "id": "treino-cai", "checkpoint": 2, "kind": "expr",
    "setup": "import numpy as np\nrng = np.random.default_rng(2)\nx = rng.uniform(0, 1, 40)\ny = np.sin(2 * np.pi * x) + rng.normal(0, 0.2, 40)\ne = erro_treino_validacao_por_grau(x, y, [1, 2, 3, 5, 7], 4)\nt = [e[g][0] for g in [1, 2, 3, 5, 7]]",
    "expr": "[type(e[1][0]).__name__, all(a >= c for a, c in zip(t, t[1:]))]", "expected": ["float", true],
    "name": "Erros em float, e o de treino nunca sobe com o grau" },
  { "id": "melhor", "checkpoint": 3, "kind": "expr",
    "expr": "melhor_grau({1: (0.5, 0.6), 3: (0.2, 0.25), 9: (0.0, 3.1)})", "expected": 3, "type": "int",
    "name": "O melhor grau é o de menor erro de validação, não o de treino",
    "hint": "O segundo número de cada par é o erro de validação." },
  { "id": "melhor-empate", "checkpoint": 3, "kind": "expr",
    "expr": "melhor_grau({4: (0.1, 0.3), 2: (0.2, 0.3), 6: (0.05, 0.9)})", "expected": 2,
    "name": "No empate da validação, o menor grau",
    "hint": "O dicionário não vem ordenado pelo grau." },
  { "id": "melhor-dados", "checkpoint": 3, "kind": "expr",
    "setup": "import numpy as np\nrng = np.random.default_rng(2)\nx = rng.uniform(0, 1, 40)\ny = np.sin(2 * np.pi * x) + rng.normal(0, 0.2, 40)",
    "expr": "melhor_grau(erro_treino_validacao_por_grau(x, y, [1, 3, 9], 0))", "expected": 3,
    "name": "Na senoide com ruído, o grau 3 vence" }
]
```

### Soluções erradas
```python name="lasso sem padronizar"
import numpy as np
from sklearn.linear_model import Lasso


def atributos_polinomiais(x, grau):
    x = np.asarray(x, dtype=float)
    potencias = np.arange(1, grau + 1)
    return x[:, None] ** potencias


def selecionar_com_lasso(X, y, alpha):
    modelo = Lasso(alpha=alpha).fit(X, y)
    return np.flatnonzero(modelo.coef_).tolist()


def erro_treino_validacao_por_grau(x, y, graus, semente):
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    ordem = np.random.default_rng(semente).permutation(len(x))
    corte = 7 * len(x) // 10
    treino, validacao = ordem[:corte], ordem[corte:]
    erros = {}
    for grau in graus:
        A = np.column_stack([np.ones(len(x)), atributos_polinomiais(x, grau)])
        coef = np.linalg.lstsq(A[treino], y[treino])[0]
        mse_treino = float(np.mean((A[treino] @ coef - y[treino]) ** 2))
        mse_validacao = float(np.mean((A[validacao] @ coef - y[validacao]) ** 2))
        erros[grau] = (mse_treino, mse_validacao)
    return erros


def melhor_grau(erros):
    return min(erros, key=lambda grau: (erros[grau][1], grau))
```
```python name="devolve os coeficientes, não as posições"
import numpy as np
from sklearn.linear_model import Lasso


def atributos_polinomiais(x, grau):
    x = np.asarray(x, dtype=float)
    potencias = np.arange(1, grau + 1)
    return x[:, None] ** potencias


def selecionar_com_lasso(X, y, alpha):
    X = np.asarray(X, dtype=float)
    Z = (X - X.mean(axis=0)) / X.std(axis=0)
    modelo = Lasso(alpha=alpha).fit(Z, y)
    return modelo.coef_[modelo.coef_ != 0].tolist()


def erro_treino_validacao_por_grau(x, y, graus, semente):
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    ordem = np.random.default_rng(semente).permutation(len(x))
    corte = 7 * len(x) // 10
    treino, validacao = ordem[:corte], ordem[corte:]
    erros = {}
    for grau in graus:
        A = np.column_stack([np.ones(len(x)), atributos_polinomiais(x, grau)])
        coef = np.linalg.lstsq(A[treino], y[treino])[0]
        mse_treino = float(np.mean((A[treino] @ coef - y[treino]) ** 2))
        mse_validacao = float(np.mean((A[validacao] @ coef - y[validacao]) ** 2))
        erros[grau] = (mse_treino, mse_validacao)
    return erros


def melhor_grau(erros):
    return min(erros, key=lambda grau: (erros[grau][1], grau))
```
```python name="lista do np.nonzero"
import numpy as np
from sklearn.linear_model import Lasso


def atributos_polinomiais(x, grau):
    x = np.asarray(x, dtype=float)
    potencias = np.arange(1, grau + 1)
    return x[:, None] ** potencias


def selecionar_com_lasso(X, y, alpha):
    X = np.asarray(X, dtype=float)
    Z = (X - X.mean(axis=0)) / X.std(axis=0)
    modelo = Lasso(alpha=alpha).fit(Z, y)
    return list(np.nonzero(modelo.coef_))


def erro_treino_validacao_por_grau(x, y, graus, semente):
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    ordem = np.random.default_rng(semente).permutation(len(x))
    corte = 7 * len(x) // 10
    treino, validacao = ordem[:corte], ordem[corte:]
    erros = {}
    for grau in graus:
        A = np.column_stack([np.ones(len(x)), atributos_polinomiais(x, grau)])
        coef = np.linalg.lstsq(A[treino], y[treino])[0]
        mse_treino = float(np.mean((A[treino] @ coef - y[treino]) ** 2))
        mse_validacao = float(np.mean((A[validacao] @ coef - y[validacao]) ** 2))
        erros[grau] = (mse_treino, mse_validacao)
    return erros


def melhor_grau(erros):
    return min(erros, key=lambda grau: (erros[grau][1], grau))
```
```python name="divisão sem sortear"
import numpy as np
from sklearn.linear_model import Lasso


def atributos_polinomiais(x, grau):
    x = np.asarray(x, dtype=float)
    potencias = np.arange(1, grau + 1)
    return x[:, None] ** potencias


def selecionar_com_lasso(X, y, alpha):
    X = np.asarray(X, dtype=float)
    Z = (X - X.mean(axis=0)) / X.std(axis=0)
    modelo = Lasso(alpha=alpha).fit(Z, y)
    return np.flatnonzero(modelo.coef_).tolist()


def erro_treino_validacao_por_grau(x, y, graus, semente):
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    ordem = np.arange(len(x))
    corte = 7 * len(x) // 10
    treino, validacao = ordem[:corte], ordem[corte:]
    erros = {}
    for grau in graus:
        A = np.column_stack([np.ones(len(x)), atributos_polinomiais(x, grau)])
        coef = np.linalg.lstsq(A[treino], y[treino])[0]
        mse_treino = float(np.mean((A[treino] @ coef - y[treino]) ** 2))
        mse_validacao = float(np.mean((A[validacao] @ coef - y[validacao]) ** 2))
        erros[grau] = (mse_treino, mse_validacao)
    return erros


def melhor_grau(erros):
    return min(erros, key=lambda grau: (erros[grau][1], grau))
```
```python name="polinômio sem intercepto"
import numpy as np
from sklearn.linear_model import Lasso


def atributos_polinomiais(x, grau):
    x = np.asarray(x, dtype=float)
    potencias = np.arange(1, grau + 1)
    return x[:, None] ** potencias


def selecionar_com_lasso(X, y, alpha):
    X = np.asarray(X, dtype=float)
    Z = (X - X.mean(axis=0)) / X.std(axis=0)
    modelo = Lasso(alpha=alpha).fit(Z, y)
    return np.flatnonzero(modelo.coef_).tolist()


def erro_treino_validacao_por_grau(x, y, graus, semente):
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    ordem = np.random.default_rng(semente).permutation(len(x))
    corte = 7 * len(x) // 10
    treino, validacao = ordem[:corte], ordem[corte:]
    erros = {}
    for grau in graus:
        A = atributos_polinomiais(x, grau)
        coef = np.linalg.lstsq(A[treino], y[treino])[0]
        mse_treino = float(np.mean((A[treino] @ coef - y[treino]) ** 2))
        mse_validacao = float(np.mean((A[validacao] @ coef - y[validacao]) ** 2))
        erros[grau] = (mse_treino, mse_validacao)
    return erros


def melhor_grau(erros):
    return min(erros, key=lambda grau: (erros[grau][1], grau))
```
```python name="escolhe o grau pelo treino"
import numpy as np
from sklearn.linear_model import Lasso


def atributos_polinomiais(x, grau):
    x = np.asarray(x, dtype=float)
    potencias = np.arange(1, grau + 1)
    return x[:, None] ** potencias


def selecionar_com_lasso(X, y, alpha):
    X = np.asarray(X, dtype=float)
    Z = (X - X.mean(axis=0)) / X.std(axis=0)
    modelo = Lasso(alpha=alpha).fit(Z, y)
    return np.flatnonzero(modelo.coef_).tolist()


def erro_treino_validacao_por_grau(x, y, graus, semente):
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    ordem = np.random.default_rng(semente).permutation(len(x))
    corte = 7 * len(x) // 10
    treino, validacao = ordem[:corte], ordem[corte:]
    erros = {}
    for grau in graus:
        A = np.column_stack([np.ones(len(x)), atributos_polinomiais(x, grau)])
        coef = np.linalg.lstsq(A[treino], y[treino])[0]
        mse_treino = float(np.mean((A[treino] @ coef - y[treino]) ** 2))
        mse_validacao = float(np.mean((A[validacao] @ coef - y[validacao]) ** 2))
        erros[grau] = (mse_treino, mse_validacao)
    return erros


def melhor_grau(erros):
    return min(erros, key=lambda grau: (erros[grau][0], grau))
```
```python name="empate pela ordem do dicionário"
import numpy as np
from sklearn.linear_model import Lasso


def atributos_polinomiais(x, grau):
    x = np.asarray(x, dtype=float)
    potencias = np.arange(1, grau + 1)
    return x[:, None] ** potencias


def selecionar_com_lasso(X, y, alpha):
    X = np.asarray(X, dtype=float)
    Z = (X - X.mean(axis=0)) / X.std(axis=0)
    modelo = Lasso(alpha=alpha).fit(Z, y)
    return np.flatnonzero(modelo.coef_).tolist()


def erro_treino_validacao_por_grau(x, y, graus, semente):
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    ordem = np.random.default_rng(semente).permutation(len(x))
    corte = 7 * len(x) // 10
    treino, validacao = ordem[:corte], ordem[corte:]
    erros = {}
    for grau in graus:
        A = np.column_stack([np.ones(len(x)), atributos_polinomiais(x, grau)])
        coef = np.linalg.lstsq(A[treino], y[treino])[0]
        mse_treino = float(np.mean((A[treino] @ coef - y[treino]) ** 2))
        mse_validacao = float(np.mean((A[validacao] @ coef - y[validacao]) ** 2))
        erros[grau] = (mse_treino, mse_validacao)
    return erros


def melhor_grau(erros):
    return min(erros, key=lambda grau: erros[grau][1])
```

## Passo 8 · Quiz · L1 ou L2

### Pergunta
Uma tabela fictícia de sensores tem 200 colunas, e a suspeita é que só uma dezena importa. A equipe quer um modelo linear que diga **quais** colunas usar. Qual regularização atende, e com qual cuidado?
- [x] Lasso, com os atributos padronizados: a penalidade L1 zera exatamente os pesos das colunas pouco úteis, e a escala comum faz a penalidade tratar as colunas por igual
- [ ] Ridge, porque encolhe todos os pesos e os menores indicam as colunas inúteis
- [ ] Lasso sem padronizar, porque a padronização mudaria quais colunas são úteis
- [ ] Nenhuma: com 200 colunas, só a equação normal dá a resposta exata
> O lasso produz zeros exatos e por isso seleciona colunas; o ridge encolhe tudo, mas não zera nada, e "peso pequeno" depende da unidade da coluna. Sem padronizar, uma coluna útil medida numa unidade minúscula precisa de um peso enorme, que o lasso corta. A equação normal sem regularização usa todas as colunas (e, com colunas colineares, nem tem solução única).

### Pergunta
Um colega implementa o ridge com `P = lam * np.eye(Xb.shape[1])`, com a coluna de uns em `Xb`, e repara que, com `lam` grande, todas as previsões tendem a zero, mesmo com o alvo em torno de 500. O que está errado?
- [ ] Nada: com λ grande, o ridge sempre prevê zero
- [x] A identidade também penaliza o intercepto, que encolhe junto com os pesos; zerando `P[0, 0]`, com λ grande as previsões tendem à média do alvo
- [ ] Faltou dividir λ por $n$, como no lasso
- [ ] O certo é somar λ ao lado direito, `Xb.T @ y + lam`
> Com o intercepto fora da penalidade, λ enorme zera os pesos e deixa $b$ livre, e a melhor constante é a média do alvo. Penalizar o $b$ puxa o modelo inteiro para zero, e o resultado muda se o alvo for deslocado por uma constante. A divisão por $n$ é a convenção do `Lasso` do scikit-learn, não muda o problema do intercepto; e a penalidade entra na matriz, não no lado direito.

### Pergunta
Para escolher o grau de um polinômio, a equipe ajusta graus de 1 a 15 e mede o erro **no treino**: o menor erro é o do grau 15, e é ele que vai para produção. O que esperar?
- [ ] O melhor modelo possível, porque é o de menor erro
- [x] Provavelmente um modelo sobreajustado: o erro de treino nunca sobe com o grau, então sempre aponta para o maior grau; a escolha precisa vir de um conjunto de validação
- [ ] O mesmo resultado que a validação daria, porque treino e validação vêm dos mesmos dados
- [ ] Um modelo subajustado, porque graus altos têm viés alto
> Um grau a mais nunca piora o ajuste no treino, então medir no treino premia sempre o modelo mais flexível, que acerta o ruído e erra em dados novos. Graus altos têm viés baixo e variância alta, o oposto da quarta alternativa. Só o erro em exemplos que o ajuste não viu (validação) desenha o U que mostra o grau certo.
