---
slug: n5-m3-01-regressao-logistica-do-zero
titulo: Regressão logística do zero
descricao: Sigmoide, fronteira de decisão linear, entropia cruzada, gradiente e treino por GD; comparação com LogisticRegression.
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
- Implementar a regressão logística (predição, custo, gradiente, treino) em numpy
- Interpretar coeficientes como log-odds e desenhar a fronteira de decisão
- Comparar a implementação própria com LogisticRegression do scikit-learn
---

## Passo 1 · Leitura · Por que não uma reta para classes

Uma loja virtual fictícia quer prever se um cliente vai voltar a comprar no próximo mês (1) ou não (0), a partir de atributos como visitas ao site e dias desde a última compra. O alvo agora é uma **classe**, e não um número. Ajustar a regressão linear do módulo 2 a um alvo 0/1 até roda, mas as previsões saem como 1,3 ou -0,2, que não são probabilidades, e alguns clientes extremos puxam a reta inteira.

A regressão logística mantém a parte linear, $z = Xw + b$, e passa o resultado pela **sigmoide**, que espreme qualquer número real no intervalo $(0, 1)$:

$$
\sigma(z) = \frac{1}{1 + e^{-z}}, \qquad \hat p = \sigma(Xw + b)
$$

Invertendo a sigmoide, o modelo diz que o **logaritmo da chance** (log-odds) é linear nos atributos:

$$
\log \frac{\hat p}{1 - \hat p} = Xw + b
$$

Por isso cada coeficiente $w_j$ diz quanto o log-odds sobe quando o atributo $j$ aumenta uma unidade, mantidos os outros. A probabilidade não sobe $w_j$; a chance é multiplicada por $e^{w_j}$.

Para decidir a classe, o padrão é prever 1 quando $\hat p > 0{,}5$, o que equivale a $z > 0$. A **fronteira de decisão** é o conjunto de pontos com $Xw + b = 0$: em duas dimensões, uma reta; em $d$ dimensões, um hiperplano. A logística é um classificador linear.

```python
z = X @ w + b                 # log-odds, um por linha
p = 1 / (1 + np.exp(-z))      # probabilidade da classe 1
classe = (z > 0).astype(int)  # o mesmo que p > 0.5
```

A forma da conta importa. Com $z = -1000$, a expressão $e^{-z} = e^{1000}$ estoura para `inf`. No seu computador o numpy avisa com `RuntimeWarning: overflow encountered in exp`; no executor da plataforma o aviso não aparece. O resultado ainda sai `0.0`, mas a forma $e^{z}/(1 + e^{z})$, igual no papel, dá `inf / inf = nan` com $z = 1000$. A versão **estável** calcula sempre $e^{-|z|}$, que nunca estoura, e escolhe a fórmula pelo sinal de $z$.

Nesta lição você escreve a sigmoide estável, o custo, o gradiente e o treino, e confere o resultado com a `LogisticRegression` do scikit-learn.

## Passo 2 · Previsão · A sigmoide nos extremos

O programa calcula a sigmoide de cinco valores, de -1000 a 1000, de duas formas, e depois um custo pela função `np.logaddexp(a, b)`, que calcula $\log(e^a + e^b)$ sem estourar. Leia sem executar e digite o que ele imprime.

### Código
```python
import numpy as np

z = np.array([-1000.0, -5.0, 0.0, 5.0, 1000.0])
p = 1 / (1 + np.exp(-z))
print(p.round(4).tolist())
print(np.log(p[0]), np.log(1 - p[4]))
q = np.exp(z) / (1 + np.exp(z))
print(q[4])
print(np.logaddexp(0, 1000.0), np.logaddexp(0, -1000.0))
```

### Dicas
1. Em `float64`, $e^{1000}$ é `inf`, e $1 / (1 + \infty)$ é exatamente zero. Um $\sigma(1000)$ arredonda para exatamente 1.
2. O logaritmo de zero é `-inf`, e `inf / inf` é `nan`.
3. $\log(e^0 + e^{1000})$ é praticamente $1000$, e $\log(e^0 + e^{-1000})$ é praticamente $\log 1$.

### Saída esperada
```text
[0.0, 0.0067, 0.5, 0.9933, 1.0]
-inf -inf
nan
1000.0 0.0
```

## Passo 3 · Exercício · Sigmoide estável e probabilidades
modo: lacunas

Complete as lacunas (`___`) da sigmoide estável e da função que transforma atributos em probabilidades.

### Instruções
1. `sigmoide(z)` aceita um número, uma lista ou um array e devolve um array do numpy com $\sigma(z)$ em cada posição.
2. A conta nunca calcula a exponencial de um número positivo: usa $e^{-|z|}$, com $\frac{1}{1 + e^{-|z|}}$ quando $z \ge 0$ e $\frac{e^{-|z|}}{1 + e^{-|z|}}$ quando $z < 0$. Com $z = \pm 1000$ o resultado é `0.0` e `1.0`, sem `nan`.
3. `prever_proba(X, w, b)` devolve a probabilidade da classe 1 para cada linha de `X` (forma `(n, d)`), com os pesos `w` (forma `(d,)`) e o intercepto `b`.

### Código inicial
```python
import numpy as np


def sigmoide(z):
    z = np.asarray(z, dtype=float)
    e = np.exp(___)
    return np.where(z >= 0, ___, ___)


def prever_proba(X, w, b):
    return sigmoide(___)
```

### Solução
```python
import numpy as np


def sigmoide(z):
    z = np.asarray(z, dtype=float)
    e = np.exp(-np.abs(z))
    return np.where(z >= 0, 1 / (1 + e), e / (1 + e))


def prever_proba(X, w, b):
    return sigmoide(X @ w + b)
```

### Dicas
1. Com $z \ge 0$, $e^{-|z|} = e^{-z}$, e a fórmula de sempre vale. Com $z < 0$, multiplique em cima e embaixo de $\frac{1}{1 + e^{-z}}$ por $e^{z}$.
2. O `np.where(condicao, a, b)` escolhe, posição a posição, entre dois arrays já calculados; nenhum dos dois pode ter `nan` onde ele for escolhido.
3. O logit de cada linha é o produto da linha pelos pesos mais o intercepto.

### Verificação
```json
[
  { "id": "zero", "checkpoint": 1, "kind": "expr", "expr": "float(sigmoide(0.0))", "expected": 0.5, "tolerance": 1e-12,
    "name": "sigmoide(0) é 0,5" },
  { "id": "valores-lista", "checkpoint": 1, "kind": "expr", "expr": "sigmoide([-2.0, -1.0, 0.0, 1.0, 2.0]).tolist()",
    "expected": [0.11920292202211755, 0.2689414213699951, 0.5, 0.7310585786300049, 0.8807970779778823], "tolerance": 1e-12,
    "name": "Valores de -2 a 2, recebidos numa lista",
    "hint": "Os valores negativos usam a fórmula com e^{-|z|} no numerador." },
  { "id": "tipo", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np", "expr": "sigmoide(np.array([0.5, -0.5]))", "type": "ndarray",
    "name": "Devolve um array do numpy" },
  { "id": "extremos", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np", "expr": "sigmoide(np.array([-1000.0, 1000.0])).tolist()",
    "expected": [0.0, 1.0], "name": "Com z = -1000 e z = 1000, sai 0.0 e 1.0, sem nan",
    "hint": "Nenhum dos dois ramos pode calcular e elevado a um número positivo grande." },
  { "id": "simetria", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nz = np.linspace(-30, 30, 61)",
    "expr": "bool(np.allclose(sigmoide(-z), 1 - sigmoide(z), atol=1e-12))", "expected": true,
    "name": "σ(-z) = 1 - σ(z) de -30 a 30",
    "hint": "Confira se os dois ramos do np.where estão do lado certo da condição." },
  { "id": "proba-valores", "checkpoint": 3, "kind": "expr",
    "setup": "import numpy as np\nX = np.array([[1.0, 2.0], [0.0, -1.0], [3.0, 0.5]])\nw = np.array([0.5, -1.0])",
    "expr": "prever_proba(X, w, 0.25).tolist()", "expected": [0.22270013882530884, 0.7772998611746911, 0.7772998611746911], "tolerance": 1e-12,
    "name": "Probabilidades de três linhas com intercepto 0,25",
    "hint": "O intercepto entra dentro da sigmoide, somado ao logit de cada linha." },
  { "id": "fronteira", "checkpoint": 3, "kind": "expr",
    "setup": "import numpy as np",
    "expr": "prever_proba(np.array([[1.0, 1.0], [2.0, 3.0]]), np.array([2.0, -1.0]), -1.0).tolist()", "expected": [0.5, 0.5], "tolerance": 1e-12,
    "name": "Pontos sobre a fronteira Xw + b = 0 têm probabilidade 0,5" },
  { "id": "forma", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nX = np.arange(12.0).reshape(4, 3) / 10",
    "expr": "list(prever_proba(X, np.array([1.0, -2.0, 0.5]), 0.0).shape)", "expected": [4],
    "name": "Uma probabilidade por linha de X",
    "hint": "X tem forma (n, d) e w tem forma (d,): o produto é X @ w." }
]
```

### Soluções erradas
```python name="exponencial sem o valor absoluto"
import numpy as np


def sigmoide(z):
    z = np.asarray(z, dtype=float)
    e = np.exp(-z)
    return np.where(z >= 0, 1 / (1 + e), e / (1 + e))


def prever_proba(X, w, b):
    return sigmoide(X @ w + b)
```
```python name="ramos trocados"
import numpy as np


def sigmoide(z):
    z = np.asarray(z, dtype=float)
    e = np.exp(-np.abs(z))
    return np.where(z >= 0, e / (1 + e), 1 / (1 + e))


def prever_proba(X, w, b):
    return sigmoide(X @ w + b)
```
```python name="mesma fórmula nos dois ramos"
import numpy as np


def sigmoide(z):
    z = np.asarray(z, dtype=float)
    e = np.exp(-np.abs(z))
    return np.where(z >= 0, 1 / (1 + e), 1 / (1 + e))


def prever_proba(X, w, b):
    return sigmoide(X @ w + b)
```
```python name="intercepto fora da sigmoide"
import numpy as np


def sigmoide(z):
    z = np.asarray(z, dtype=float)
    e = np.exp(-np.abs(z))
    return np.where(z >= 0, 1 / (1 + e), e / (1 + e))


def prever_proba(X, w, b):
    return sigmoide(X @ w) + b
```
```python name="esquece o intercepto"
import numpy as np


def sigmoide(z):
    z = np.asarray(z, dtype=float)
    e = np.exp(-np.abs(z))
    return np.where(z >= 0, 1 / (1 + e), e / (1 + e))


def prever_proba(X, w, b):
    return sigmoide(X @ w)
```
```python name="multiplica elemento a elemento"
import numpy as np


def sigmoide(z):
    z = np.asarray(z, dtype=float)
    e = np.exp(-np.abs(z))
    return np.where(z >= 0, 1 / (1 + e), e / (1 + e))


def prever_proba(X, w, b):
    return sigmoide(X * w + b)
```

## Passo 4 · Leitura · Entropia cruzada e o gradiente bonito

Para treinar, o modelo precisa de um custo. A escolha natural, vinda da verossimilhança de Bernoulli do módulo 1, é a **entropia cruzada binária**:

$$
L(w, b) = -\frac{1}{n} \sum_{i=1}^{n} \Big[ y_i \log \hat p_i + (1 - y_i) \log (1 - \hat p_i) \Big]
$$

Ela pune pouco um acerto confiante e muito um erro confiante: prever $\hat p = 0{,}01$ para um cliente que voltou custa $-\log 0{,}01 \approx 4{,}6$. Usar o MSE com a sigmoide parece mais simples, mas o custo deixa de ser convexo e o gradiente quase some quando o modelo erra com confiança, porque o fator $\sigma(z)(1 - \sigma(z))$ fica perto de zero.

Calcular $\hat p$ e depois o logaritmo esbarra no que a Previsão mostrou: com um logit de 1000 do lado errado, $\hat p$ vira exatamente 0 ou 1 e o logaritmo dá `-inf`; com o logit do lado certo, aparece `0 * -inf`, que é `nan`. Cortar as probabilidades com `np.clip(p, 1e-12, 1 - 1e-12)` evita o infinito, mas limita cada termo a cerca de 27,6 e esconde o tamanho do erro. A saída exata é escrever o custo direto no logit $z$. Com um pouco de álgebra, cada termo vira:

$$
-\big[y \log \sigma(z) + (1 - y) \log(1 - \sigma(z))\big] = \log(1 + e^{z}) - y\,z
$$

e $\log(1 + e^{z})$ é `np.logaddexp(0, z)`, que nunca estoura:

```python
custo = np.mean(np.logaddexp(0, z) - y * z)
```

O gradiente tem uma forma limpa, a mesma da regressão linear com o resíduo trocado por $\hat p - y$:

$$
\nabla_w L = \frac{1}{n} X^\top (\hat p - y), \qquad \frac{\partial L}{\partial b} = \frac{1}{n} \sum_{i=1}^{n} (\hat p_i - y_i)
$$

O sinal importa: $\hat p - y$ é positivo quando o modelo superestima a classe 1, e o passo de descida $w \leftarrow w - \eta \nabla_w L$ reduz os pesos. Dividir por $n$ deixa a taxa de aprendizado independente do tamanho do conjunto. Para conferir uma implementação, compare com o gradiente numérico do módulo 1, por diferenças centrais no próprio custo.

## Passo 5 · Exercício · Custo e gradiente

Escreva o custo estável e o gradiente da regressão logística. A `sigmoide` do passo anterior já está no código.

### Instruções
1. `entropia_cruzada_binaria(y, z)` recebe os rótulos 0/1 e os **logits** $z$ e devolve a entropia cruzada média como `float` do Python, calculada com `np.logaddexp`, sem passar por probabilidades.
2. Com logits extremos o custo é exato: com `y = [1, 0]` e `z = [-1000, 1000]`, ele vale 1000.0; com `z = [1000, -1000]`, vale 0.0.
3. `gradiente_logistica(X, y, w, b)` devolve a tupla `(gw, gb)`: `gw` é o array $\frac{1}{n} X^\top(\hat p - y)$ e `gb` é a média de $\hat p - y$ como `float`, com $\hat p = \sigma(Xw + b)$.

### Código inicial
```python
import numpy as np


def sigmoide(z):
    z = np.asarray(z, dtype=float)
    e = np.exp(-np.abs(z))
    return np.where(z >= 0, 1 / (1 + e), e / (1 + e))


def entropia_cruzada_binaria(y, z):
    pass


def gradiente_logistica(X, y, w, b):
    pass
```

### Solução
```python
import numpy as np


def sigmoide(z):
    z = np.asarray(z, dtype=float)
    e = np.exp(-np.abs(z))
    return np.where(z >= 0, 1 / (1 + e), e / (1 + e))


def entropia_cruzada_binaria(y, z):
    y = np.asarray(y, dtype=float)
    z = np.asarray(z, dtype=float)
    return float(np.mean(np.logaddexp(0, z) - y * z))


def gradiente_logistica(X, y, w, b):
    erro = sigmoide(X @ w + b) - y
    gw = X.T @ erro / len(y)
    gb = float(np.mean(erro))
    return gw, gb
```

### Dicas
1. Cada termo do custo é $\log(1 + e^{z}) - y z$; o `np.logaddexp(0, z)` calcula a primeira parte.
2. O erro $\hat p - y$ tem uma posição por linha; o `X.T @ erro` soma, para cada atributo, o erro vezes o valor do atributo.
3. Não esqueça de dividir pelo número de linhas, nos dois gradientes.

### Verificação
```json
[
  { "id": "custo-valor", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np",
    "expr": "entropia_cruzada_binaria(np.array([1, 0, 1]), np.array([2.0, -1.0, -0.5]))", "expected": 0.47142222758043406, "tolerance": 1e-12,
    "name": "Custo médio de três exemplos",
    "hint": "É a média, não a soma, de log(1 + e^z) - y z." },
  { "id": "custo-logit-zero", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np",
    "expr": "entropia_cruzada_binaria(np.array([1, 0, 0, 1]), np.zeros(4))", "expected": 0.6931471805599453, "tolerance": 1e-12,
    "name": "Com todos os logits em zero, o custo é log 2" },
  { "id": "custo-tipo", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np",
    "expr": "entropia_cruzada_binaria(np.array([1, 0]), np.array([0.3, 0.1]))", "type": "float",
    "name": "O custo é um float do Python", "hint": "Converta o resultado com float(...)." },
  { "id": "erro-confiante", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np",
    "expr": "entropia_cruzada_binaria(np.array([1, 0]), np.array([-1000.0, 1000.0]))", "expected": 1000.0, "tolerance": 1e-9,
    "name": "Erros confiantes custam exatamente 1000, sem inf e sem corte",
    "hint": "Passar por probabilidades leva a log(0); cortar as probabilidades limita o custo. Trabalhe com os logits." },
  { "id": "acerto-confiante", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np",
    "expr": "entropia_cruzada_binaria(np.array([1, 0]), np.array([1000.0, -1000.0]))", "expected": 0.0, "tolerance": 1e-9,
    "name": "Acertos confiantes custam 0, sem nan",
    "hint": "0 * log(0) é nan no numpy." },
  { "id": "grad-valores", "checkpoint": 3, "kind": "expr",
    "setup": "import numpy as np\nX = np.array([[1.0, 2.0], [0.0, -1.0], [3.0, 0.5]])\ngw, gb = gradiente_logistica(X, np.array([1, 0, 0]), np.array([0.5, -1.0]), 0.25)",
    "expr": "[gw.tolist(), gb]", "expected": [[0.518199907449794, -0.6477498843122427], 0.25909995372489697], "tolerance": 1e-12,
    "name": "Gradiente em três exemplos com intercepto 0,25",
    "hint": "O erro é p - y, com p calculado com o intercepto; os dois gradientes são médias." },
  { "id": "grad-numerico", "checkpoint": 3, "kind": "expr",
    "setup": "import numpy as np\nrng = np.random.default_rng(8)\nX = rng.normal(size=(20, 3))\ny = (rng.random(20) < 0.5).astype(float)\nw = rng.normal(size=3)\nb = 0.4\ndef custo(v):\n    z = X @ v[:3] + v[3]\n    return np.mean(np.logaddexp(0, z) - y * z)\nv0 = np.append(w, b)\nnum = np.array([(custo(v0 + h) - custo(v0 - h)) / 2e-6 for h in np.eye(4) * 1e-6])\ngw, gb = gradiente_logistica(X, y, w, b)",
    "expr": "bool(np.allclose(np.append(gw, gb), num, atol=1e-6))", "expected": true,
    "name": "O gradiente bate com o gradiente numérico do custo em 20 exemplos sorteados",
    "hint": "Compare o seu (gw, gb) com diferenças centrais da entropia cruzada: o sinal e a divisão por n contam." },
  { "id": "grad-tipos", "checkpoint": 3, "kind": "expr",
    "setup": "import numpy as np\nr = gradiente_logistica(np.array([[1.0, 2.0], [0.0, -1.0]]), np.array([1, 0]), np.zeros(2), 0.0)",
    "expr": "[type(r).__name__, type(r[0]).__name__, list(r[0].shape), type(r[1]).__name__]", "expected": ["tuple", "ndarray", [2], "float"],
    "name": "Devolve a tupla (array com um valor por atributo, float)" }
]
```

### Soluções erradas
```python name="logaritmo da sigmoide"
import numpy as np


def sigmoide(z):
    z = np.asarray(z, dtype=float)
    e = np.exp(-np.abs(z))
    return np.where(z >= 0, 1 / (1 + e), e / (1 + e))


def entropia_cruzada_binaria(y, z):
    y = np.asarray(y, dtype=float)
    p = sigmoide(z)
    return float(-np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)))


def gradiente_logistica(X, y, w, b):
    erro = sigmoide(X @ w + b) - y
    gw = X.T @ erro / len(y)
    gb = float(np.mean(erro))
    return gw, gb
```
```python name="corta as probabilidades com clip"
import numpy as np


def sigmoide(z):
    z = np.asarray(z, dtype=float)
    e = np.exp(-np.abs(z))
    return np.where(z >= 0, 1 / (1 + e), e / (1 + e))


def entropia_cruzada_binaria(y, z):
    y = np.asarray(y, dtype=float)
    p = np.clip(sigmoide(z), 1e-12, 1 - 1e-12)
    return float(-np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)))


def gradiente_logistica(X, y, w, b):
    erro = sigmoide(X @ w + b) - y
    gw = X.T @ erro / len(y)
    gb = float(np.mean(erro))
    return gw, gb
```
```python name="soma no lugar da média"
import numpy as np


def sigmoide(z):
    z = np.asarray(z, dtype=float)
    e = np.exp(-np.abs(z))
    return np.where(z >= 0, 1 / (1 + e), e / (1 + e))


def entropia_cruzada_binaria(y, z):
    y = np.asarray(y, dtype=float)
    z = np.asarray(z, dtype=float)
    return float(np.sum(np.logaddexp(0, z) - y * z))


def gradiente_logistica(X, y, w, b):
    erro = sigmoide(X @ w + b) - y
    gw = X.T @ erro / len(y)
    gb = float(np.mean(erro))
    return gw, gb
```
```python name="erro quadrático com a sigmoide"
import numpy as np


def sigmoide(z):
    z = np.asarray(z, dtype=float)
    e = np.exp(-np.abs(z))
    return np.where(z >= 0, 1 / (1 + e), e / (1 + e))


def entropia_cruzada_binaria(y, z):
    y = np.asarray(y, dtype=float)
    return float(np.mean((sigmoide(z) - y) ** 2))


def gradiente_logistica(X, y, w, b):
    erro = sigmoide(X @ w + b) - y
    gw = X.T @ erro / len(y)
    gb = float(np.mean(erro))
    return gw, gb
```
```python name="sinal do erro trocado"
import numpy as np


def sigmoide(z):
    z = np.asarray(z, dtype=float)
    e = np.exp(-np.abs(z))
    return np.where(z >= 0, 1 / (1 + e), e / (1 + e))


def entropia_cruzada_binaria(y, z):
    y = np.asarray(y, dtype=float)
    z = np.asarray(z, dtype=float)
    return float(np.mean(np.logaddexp(0, z) - y * z))


def gradiente_logistica(X, y, w, b):
    erro = y - sigmoide(X @ w + b)
    gw = X.T @ erro / len(y)
    gb = float(np.mean(erro))
    return gw, gb
```
```python name="gradiente sem dividir por n"
import numpy as np


def sigmoide(z):
    z = np.asarray(z, dtype=float)
    e = np.exp(-np.abs(z))
    return np.where(z >= 0, 1 / (1 + e), e / (1 + e))


def entropia_cruzada_binaria(y, z):
    y = np.asarray(y, dtype=float)
    z = np.asarray(z, dtype=float)
    return float(np.mean(np.logaddexp(0, z) - y * z))


def gradiente_logistica(X, y, w, b):
    erro = sigmoide(X @ w + b) - y
    gw = X.T @ erro
    gb = float(np.mean(erro))
    return gw, gb
```
```python name="probabilidades sem o intercepto"
import numpy as np


def sigmoide(z):
    z = np.asarray(z, dtype=float)
    e = np.exp(-np.abs(z))
    return np.where(z >= 0, 1 / (1 + e), e / (1 + e))


def entropia_cruzada_binaria(y, z):
    y = np.asarray(y, dtype=float)
    z = np.asarray(z, dtype=float)
    return float(np.mean(np.logaddexp(0, z) - y * z))


def gradiente_logistica(X, y, w, b):
    erro = sigmoide(X @ w) - y
    gw = X.T @ erro / len(y)
    gb = float(np.mean(erro))
    return gw, gb
```
```python name="custo como numpy.float64"
import numpy as np


def sigmoide(z):
    z = np.asarray(z, dtype=float)
    e = np.exp(-np.abs(z))
    return np.where(z >= 0, 1 / (1 + e), e / (1 + e))


def entropia_cruzada_binaria(y, z):
    y = np.asarray(y, dtype=float)
    z = np.asarray(z, dtype=float)
    return np.mean(np.logaddexp(0, z) - y * z)


def gradiente_logistica(X, y, w, b):
    erro = sigmoide(X @ w + b) - y
    gw = X.T @ erro / len(y)
    gb = float(np.mean(erro))
    return gw, gb
```

## Passo 6 · Leitura · Treinar e comparar com o scikit-learn

Com custo e gradiente prontos, o treino é o laço do módulo 2: começar com $w = 0$ e $b = 0$ e repetir, por um número de épocas, o passo de descida.

```python
w, b = np.zeros(X.shape[1]), 0.0
for _ in range(epocas):
    gw, gb = gradiente_logistica(X, y, w, b)
    w, b = w - taxa * gw, b - taxa * gb
```

Como no módulo 2, a escala dos atributos manda na velocidade: com uma coluna em milhares e outra entre 0 e 1, a mesma taxa que é segura para a primeira quase não move a segunda. Padronize os atributos antes de treinar (o escore $z$ da m2-03).

A referência é a `LogisticRegression` do scikit-learn, que usa um otimizador de segunda ordem (`lbfgs`) e chega ao mínimo em poucas iterações. Um detalhe pega quem compara pela primeira vez: o padrão é `C=1.0`, uma **regularização** L2 que encolhe os coeficientes em direção a zero (o ridge da m2-05, com $C$ no papel de $1/\lambda$). Sem regularização, o mínimo é o mesmo que o gradiente descendente procura:

```python
modelo = LogisticRegression(C=np.inf).fit(X, y)
modelo.coef_        # array de forma (1, d)
modelo.intercept_   # array de forma (1,)
```

O `C=np.inf` escreve no stderr `UserWarning: Setting penalty=None will ignore the C and l1_ratio parameters`, aviso da própria biblioteca que você pode ignorar. Em materiais mais antigos aparece `LogisticRegression(penalty=None)`: no scikit-learn 1.8 isso ainda funciona, mas avisa com `FutureWarning: 'penalty' was deprecated in version 1.8 and will be removed in 1.10`.

Com 200 pontos padronizados, taxa 0,1 e 2 000 épocas, o gradiente descendente fica a menos de 0,001 dos coeficientes da biblioteca e prevê as mesmas classes. Ele não chega ao mesmo número até a última casa porque para depois de um número fixo de épocas. Por isso a comparação justa é por tolerância ou pela concordância das previsões.

Cada coeficiente é um log-odds: um $w_j = 0{,}7$ num atributo padronizado diz que um desvio padrão a mais multiplica a chance da classe 1 por $e^{0{,}7} \approx 2$. Se os dados forem perfeitamente separáveis por uma reta, não existe mínimo finito sem regularização: os pesos crescem a cada época, e a biblioteca avisa com `ConvergenceWarning`.

## Passo 7 · Exercício · Treinar do zero

Escreva o treino por gradiente descendente e a previsão de classes. A `sigmoide` e o `gradiente_logistica` dos passos anteriores já estão no código. A correção compara o seu modelo com uma `LogisticRegression(C=np.inf)` treinada nos mesmos dados.

### Instruções
1. `treinar_logistica(X, y, taxa=0.1, epocas=2000)` começa com `w` de zeros (um por coluna de `X`) e `b = 0.0` e, a cada época, dá um passo de gradiente descendente com o gradiente do conjunto inteiro.
2. Devolve a tupla `(w, b)`: `w` é um array do numpy e `b` é um `float`. Com `epocas=0`, devolve os zeros.
3. Com dados padronizados, os coeficientes ficam a menos de 0,01 dos da `LogisticRegression(C=np.inf)`.
4. `prever_classe(X, w, b)` devolve um array de inteiros com 1 onde a probabilidade da classe 1 passa de 0,5 e 0 nos outros pontos.
5. Implemente sem o scikit-learn.

### Código inicial
```python
import numpy as np


def sigmoide(z):
    z = np.asarray(z, dtype=float)
    e = np.exp(-np.abs(z))
    return np.where(z >= 0, 1 / (1 + e), e / (1 + e))


def gradiente_logistica(X, y, w, b):
    erro = sigmoide(X @ w + b) - y
    gw = X.T @ erro / len(y)
    gb = float(np.mean(erro))
    return gw, gb


def treinar_logistica(X, y, taxa=0.1, epocas=2000):
    pass


def prever_classe(X, w, b):
    pass
```

### Solução
```python
import numpy as np


def sigmoide(z):
    z = np.asarray(z, dtype=float)
    e = np.exp(-np.abs(z))
    return np.where(z >= 0, 1 / (1 + e), e / (1 + e))


def gradiente_logistica(X, y, w, b):
    erro = sigmoide(X @ w + b) - y
    gw = X.T @ erro / len(y)
    gb = float(np.mean(erro))
    return gw, gb


def treinar_logistica(X, y, taxa=0.1, epocas=2000):
    w = np.zeros(X.shape[1])
    b = 0.0
    for _ in range(epocas):
        gw, gb = gradiente_logistica(X, y, w, b)
        w = w - taxa * gw
        b = b - taxa * gb
    return w, b


def prever_classe(X, w, b):
    return (X @ w + b > 0).astype(int)
```

### Dicas
1. A cada época, calcule o gradiente com os `w` e `b` atuais e ande no sentido **contrário** a ele.
2. O intercepto também é um parâmetro: ele tem o próprio gradiente e o próprio passo.
3. A probabilidade passa de 0,5 exatamente quando o logit passa de zero.

### Verificação
```json
[
  { "id": "zero-epocas", "checkpoint": 2, "kind": "expr",
    "setup": "import numpy as np\nw, b = treinar_logistica(np.array([[1.0, 2.0], [0.0, -1.0], [3.0, 0.5]]), np.array([1, 0, 0]), 0.1, 0)",
    "expr": "[w.tolist(), b]", "expected": [[0.0, 0.0], 0.0],
    "name": "Com zero épocas, devolve os pesos e o intercepto iniciais (zeros)" },
  { "id": "uma-epoca", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np\nw, b = treinar_logistica(np.array([[1.0, 2.0], [0.0, -1.0], [3.0, 0.5], [-1.0, 1.0]]), np.array([1, 0, 0, 1]), 0.5, 1)",
    "expr": "[w.tolist(), b]", "expected": [[-0.1875, 0.21875], 0.0], "tolerance": 1e-12,
    "name": "Uma época com taxa 0,5 em quatro pontos",
    "hint": "Partindo de zeros, o passo é w - taxa * gradiente, com o gradiente médio do conjunto inteiro." },
  { "id": "tres-epocas", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np\nw, b = treinar_logistica(np.array([[1.0, 2.0], [0.0, -1.0], [3.0, 0.5], [-1.0, 1.0]]), np.array([1, 0, 0, 1]), 0.5, 3)",
    "expr": "[w.tolist(), b]", "expected": [[-0.43929600623007836, 0.5751559071032294], -0.0008677826316028786], "tolerance": 1e-12,
    "name": "Três épocas: cada passo usa os pesos e o intercepto atualizados",
    "hint": "O intercepto também é atualizado a cada época." },
  { "id": "tipos", "checkpoint": 2, "kind": "expr",
    "setup": "import numpy as np\nr = treinar_logistica(np.array([[1.0, 2.0], [0.0, -1.0], [3.0, 0.5]]), np.array([1, 0, 0]), 0.1, 5)",
    "expr": "[type(r).__name__, type(r[0]).__name__, list(r[0].shape), type(r[1]).__name__]", "expected": ["tuple", "ndarray", [2], "float"],
    "name": "Devolve a tupla (array de pesos, float)" },
  { "id": "coeficientes-referencia", "checkpoint": 3, "kind": "expr",
    "setup": "import numpy as np\nimport warnings\nfrom sklearn.linear_model import LogisticRegression\nrng = np.random.default_rng(3)\nX = np.vstack([rng.normal([-1.0, -0.5], 1.2, size=(120, 2)), rng.normal([1.0, 0.8], 1.2, size=(80, 2))])\ny = np.repeat([0, 1], [120, 80])\nwith warnings.catch_warnings():\n    warnings.simplefilter('ignore')\n    ref = LogisticRegression(C=np.inf).fit(X, y)\nw, b = treinar_logistica(X, y, 0.1, 2000)",
    "expr": "np.append(w - ref.coef_[0], b - ref.intercept_[0]).tolist()", "expected": [0.0, 0.0, 0.0], "tolerance": 1e-2,
    "name": "Em 200 pontos sorteados, w e b ficam a menos de 0,01 dos da LogisticRegression(C=np.inf)",
    "hint": "A expressão é a diferença entre os seus coeficientes (e intercepto) e os da biblioteca: confira o sinal do passo, a divisão por n e o intercepto." },
  { "id": "concordancia", "checkpoint": 3, "kind": "expr",
    "setup": "import numpy as np\nimport warnings\nfrom sklearn.linear_model import LogisticRegression\nrng = np.random.default_rng(3)\nX = np.vstack([rng.normal([-1.0, -0.5], 1.2, size=(120, 2)), rng.normal([1.0, 0.8], 1.2, size=(80, 2))])\ny = np.repeat([0, 1], [120, 80])\nXt = np.random.default_rng(30).normal(0, 2, size=(300, 2))\nwith warnings.catch_warnings():\n    warnings.simplefilter('ignore')\n    ref = LogisticRegression(C=np.inf).fit(X, y)\nw, b = treinar_logistica(X, y, 0.1, 2000)",
    "expr": "bool(np.mean((Xt @ w + b > 0) == (ref.predict(Xt) == 1)) >= 0.98)", "expected": true,
    "name": "Em 300 pontos novos, pelo menos 98 % das classes iguais às da biblioteca",
    "hint": "A comparação é entre o sinal do seu logit e a classe prevista pela LogisticRegression treinada nos mesmos dados." },
  { "id": "classe-valores", "checkpoint": 4, "kind": "expr",
    "setup": "import numpy as np",
    "expr": "prever_classe(np.array([[0.3], [-0.2], [0.4], [2.0], [-3.0]]), np.array([1.0]), 0.0).tolist()", "expected": [1, 0, 1, 1, 0],
    "name": "Logits 0,3 e 0,4 já dão a classe 1",
    "hint": "O limiar 0,5 é da probabilidade; no logit, o limiar correspondente é outro." },
  { "id": "classe-inteiros", "checkpoint": 4, "kind": "expr",
    "setup": "import numpy as np",
    "expr": "prever_classe(np.array([[1.0, 2.0], [0.0, -1.0]]), np.array([0.5, -1.0]), 0.25).dtype.kind", "expected": "i",
    "name": "As classes são inteiros, não booleanos", "hint": "Converta a comparação com astype(int)." },
  { "id": "classe-igual-biblioteca", "checkpoint": 4, "kind": "expr",
    "setup": "import numpy as np\nfrom sklearn.linear_model import LogisticRegression\nrng = np.random.default_rng(3)\nX = np.vstack([rng.normal([-1.0, -0.5], 1.2, size=(120, 2)), rng.normal([1.0, 0.8], 1.2, size=(80, 2))])\ny = np.repeat([0, 1], [120, 80])\nXt = np.random.default_rng(30).normal(0, 2, size=(300, 2))\nref = LogisticRegression().fit(X, y)",
    "expr": "prever_classe(Xt, ref.coef_[0], float(ref.intercept_[0])).tolist() == ref.predict(Xt).tolist()", "expected": true,
    "name": "Com os coeficientes de uma LogisticRegression, as mesmas classes que o predict dela",
    "hint": "Compare o seu prever_classe com os coeficientes da biblioteca com o predict da própria biblioteca." },
  { "id": "sem-sklearn", "checkpoint": 5, "kind": "source", "rule": { "type": "not_calls", "name": "sklearn" },
    "name": "Implementa sem o scikit-learn" }
]
```

### Soluções erradas
```python name="gradiente somado (sem dividir por n)"
import numpy as np


def sigmoide(z):
    z = np.asarray(z, dtype=float)
    e = np.exp(-np.abs(z))
    return np.where(z >= 0, 1 / (1 + e), e / (1 + e))


def gradiente_logistica(X, y, w, b):
    erro = sigmoide(X @ w + b) - y
    gw = X.T @ erro / len(y)
    gb = float(np.mean(erro))
    return gw, gb


def treinar_logistica(X, y, taxa=0.1, epocas=2000):
    w = np.zeros(X.shape[1])
    b = 0.0
    for _ in range(epocas):
        erro = sigmoide(X @ w + b) - y
        w = w - taxa * (X.T @ erro)
        b = b - taxa * float(np.sum(erro))
    return w, b


def prever_classe(X, w, b):
    return (X @ w + b > 0).astype(int)
```
```python name="sobe o gradiente"
import numpy as np


def sigmoide(z):
    z = np.asarray(z, dtype=float)
    e = np.exp(-np.abs(z))
    return np.where(z >= 0, 1 / (1 + e), e / (1 + e))


def gradiente_logistica(X, y, w, b):
    erro = sigmoide(X @ w + b) - y
    gw = X.T @ erro / len(y)
    gb = float(np.mean(erro))
    return gw, gb


def treinar_logistica(X, y, taxa=0.1, epocas=2000):
    w = np.zeros(X.shape[1])
    b = 0.0
    for _ in range(epocas):
        gw, gb = gradiente_logistica(X, y, w, b)
        w = w + taxa * gw
        b = b + taxa * gb
    return w, b


def prever_classe(X, w, b):
    return (X @ w + b > 0).astype(int)
```
```python name="não atualiza o intercepto"
import numpy as np


def sigmoide(z):
    z = np.asarray(z, dtype=float)
    e = np.exp(-np.abs(z))
    return np.where(z >= 0, 1 / (1 + e), e / (1 + e))


def gradiente_logistica(X, y, w, b):
    erro = sigmoide(X @ w + b) - y
    gw = X.T @ erro / len(y)
    gb = float(np.mean(erro))
    return gw, gb


def treinar_logistica(X, y, taxa=0.1, epocas=2000):
    w = np.zeros(X.shape[1])
    b = 0.0
    for _ in range(epocas):
        gw, gb = gradiente_logistica(X, y, w, b)
        w = w - taxa * gw
    return w, b


def prever_classe(X, w, b):
    return (X @ w + b > 0).astype(int)
```
```python name="gradiente do erro quadrático"
import numpy as np


def sigmoide(z):
    z = np.asarray(z, dtype=float)
    e = np.exp(-np.abs(z))
    return np.where(z >= 0, 1 / (1 + e), e / (1 + e))


def gradiente_logistica(X, y, w, b):
    erro = sigmoide(X @ w + b) - y
    gw = X.T @ erro / len(y)
    gb = float(np.mean(erro))
    return gw, gb


def treinar_logistica(X, y, taxa=0.1, epocas=2000):
    w = np.zeros(X.shape[1])
    b = 0.0
    for _ in range(epocas):
        p = sigmoide(X @ w + b)
        g = 2 * (p - y) * p * (1 - p)
        w = w - taxa * X.T @ g / len(y)
        b = b - taxa * float(np.mean(g))
    return w, b


def prever_classe(X, w, b):
    return (X @ w + b > 0).astype(int)
```
```python name="pesos iniciais sorteados"
import numpy as np


def sigmoide(z):
    z = np.asarray(z, dtype=float)
    e = np.exp(-np.abs(z))
    return np.where(z >= 0, 1 / (1 + e), e / (1 + e))


def gradiente_logistica(X, y, w, b):
    erro = sigmoide(X @ w + b) - y
    gw = X.T @ erro / len(y)
    gb = float(np.mean(erro))
    return gw, gb


def treinar_logistica(X, y, taxa=0.1, epocas=2000):
    w = np.random.default_rng(0).normal(size=X.shape[1])
    b = 0.0
    for _ in range(epocas):
        gw, gb = gradiente_logistica(X, y, w, b)
        w = w - taxa * gw
        b = b - taxa * gb
    return w, b


def prever_classe(X, w, b):
    return (X @ w + b > 0).astype(int)
```
```python name="logit comparado com 0,5"
import numpy as np


def sigmoide(z):
    z = np.asarray(z, dtype=float)
    e = np.exp(-np.abs(z))
    return np.where(z >= 0, 1 / (1 + e), e / (1 + e))


def gradiente_logistica(X, y, w, b):
    erro = sigmoide(X @ w + b) - y
    gw = X.T @ erro / len(y)
    gb = float(np.mean(erro))
    return gw, gb


def treinar_logistica(X, y, taxa=0.1, epocas=2000):
    w = np.zeros(X.shape[1])
    b = 0.0
    for _ in range(epocas):
        gw, gb = gradiente_logistica(X, y, w, b)
        w = w - taxa * gw
        b = b - taxa * gb
    return w, b


def prever_classe(X, w, b):
    return (X @ w + b > 0.5).astype(int)
```
```python name="devolve booleanos"
import numpy as np


def sigmoide(z):
    z = np.asarray(z, dtype=float)
    e = np.exp(-np.abs(z))
    return np.where(z >= 0, 1 / (1 + e), e / (1 + e))


def gradiente_logistica(X, y, w, b):
    erro = sigmoide(X @ w + b) - y
    gw = X.T @ erro / len(y)
    gb = float(np.mean(erro))
    return gw, gb


def treinar_logistica(X, y, taxa=0.1, epocas=2000):
    w = np.zeros(X.shape[1])
    b = 0.0
    for _ in range(epocas):
        gw, gb = gradiente_logistica(X, y, w, b)
        w = w - taxa * gw
        b = b - taxa * gb
    return w, b


def prever_classe(X, w, b):
    return X @ w + b > 0
```
```python name="usa a LogisticRegression"
import numpy as np
from sklearn.linear_model import LogisticRegression


def sigmoide(z):
    z = np.asarray(z, dtype=float)
    e = np.exp(-np.abs(z))
    return np.where(z >= 0, 1 / (1 + e), e / (1 + e))


def gradiente_logistica(X, y, w, b):
    erro = sigmoide(X @ w + b) - y
    gw = X.T @ erro / len(y)
    gb = float(np.mean(erro))
    return gw, gb


def treinar_logistica(X, y, taxa=0.1, epocas=2000):
    modelo = LogisticRegression(C=np.inf).fit(X, y)
    return modelo.coef_[0], float(modelo.intercept_[0])


def prever_classe(X, w, b):
    return (X @ w + b > 0).astype(int)
```

## Passo 8 · Quiz · Log-odds

### Pergunta
Uma logística treinada em atributos padronizados prevê se um cliente fictício volta a comprar. O coeficiente de "visitas no mês" é $0{,}7$. Para um cliente com probabilidade prevista de $0{,}20$, o que acontece quando as visitas sobem um desvio padrão, com o resto igual?
- [ ] A probabilidade sobe para $0{,}90$: soma-se o coeficiente à probabilidade
- [ ] A probabilidade dobra para $0{,}40$: $e^{0{,}7} \approx 2$ multiplica a probabilidade
- [x] A chance $p/(1-p)$ é multiplicada por $e^{0{,}7} \approx 2$: passa de $0{,}25$ para cerca de $0{,}5$, e a probabilidade fica perto de $0{,}33$
- [ ] Nada se pode dizer, porque os coeficientes de uma logística não têm interpretação
> O coeficiente é linear no log-odds: um desvio padrão a mais soma $0{,}7$ ao logit, ou seja, multiplica a chance por $e^{0{,}7} \approx 2{,}01$. A chance $0{,}2/0{,}8 = 0{,}25$ vira $\approx 0{,}50$, que corresponde a $p = 0{,}5/1{,}5 \approx 0{,}33$. Somar à probabilidade ou dobrá-la confunde chance com probabilidade (dobrar daria valores acima de 1 para $p > 0{,}5$).

### Pergunta
Um colega comparou a logística dele, treinada do zero por gradiente descendente, com o scikit-learn:

```python
ref = LogisticRegression().fit(X, y)
print(np.abs(w - ref.coef_[0]).max())   # 0.31
```

Ele já conferiu o gradiente com o gradiente numérico e o custo parou de cair. O que explica a diferença?
- [ ] O gradiente descendente nunca chega perto do `lbfgs`; diferenças de 0,3 são normais
- [x] O padrão `C=1.0` regulariza e encolhe os coeficientes da biblioteca; a comparação justa é com `LogisticRegression(C=np.inf)`
- [ ] O `coef_` da biblioteca está na escala do log da probabilidade, e o dele, na escala do log-odds
- [ ] Faltou `penalty=None`, que é o jeito recomendado no scikit-learn 1.8
> Sem argumentos, a `LogisticRegression` minimiza a entropia cruzada **mais** uma penalidade L2 com `C=1.0`: o ótimo é outro, com coeficientes menores. Com `C=np.inf` os dois métodos procuram o mesmo mínimo e ficam a menos de 0,01. Os dois `coef_` estão na escala do log-odds, e o gradiente descendente bem configurado chega perto. O `penalty=None` também desliga a regularização, mas dá `FutureWarning` no 1.8: o parâmetro vai sair na 1.10.

### Pergunta
Para prever cliente que volta (1) ou não (0), alguém ajusta uma `LinearRegression` ao alvo 0/1 e classifica com `previsao > 0.5`. No conjunto de teste aparecem previsões de $1{,}4$ e $-0{,}3$. Qual é o problema principal?
- [ ] Nenhum: basta cortar as previsões em $[0, 1]$ e tratá-las como probabilidades
- [ ] A regressão linear não aceita alvo inteiro e deveria ter dado erro
- [x] A reta não produz probabilidades e é puxada por pontos extremos, que deslocam o limiar; a logística modela o log-odds e mantém as saídas em $(0, 1)$
- [ ] O problema é só o limiar: com `previsao > 0` a regressão linear vira uma logística
> A regressão linear aceita o alvo 0/1 sem erro, mas minimiza o erro quadrático de uma reta: clientes muito distantes da fronteira puxam a reta e mudam onde ela cruza 0,5, e as saídas fora de $[0, 1]$ não têm leitura de probabilidade. Cortar as saídas não corrige a reta; trocar o limiar também não muda a forma do modelo. A logística passa a parte linear pela sigmoide e é ajustada pela entropia cruzada.
