---
slug: n6-m1-03-funcoes-de-ativacao
titulo: Funções de ativação
descricao: Sigmoide, tanh, ReLU e variantes (Leaky, GELU), suas derivadas, saturação, neurônios mortos e a escolha por camada.
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
- Implementar as ativações e suas derivadas vetorizadas e conferi-las numericamente
- Explicar saturação de gradiente na sigmoide/tanh e neurônios mortos na ReLU
- Escolher a ativação por camada (escondidas vs saída) conforme a tarefa
---

## Passo 1 · Leitura · Por que não linear, e qual

A lição anterior mostrou que, sem uma função não linear entre as camadas, uma rede de qualquer profundidade calcula o mesmo que uma camada só. O degrau resolveu o XOR com pesos escritos à mão, mas não serve para treinar: a derivada dele é zero em todo lugar, e o treino por gradiente, que começa no próximo módulo, precisa de uma derivada que diga para que lado mexer. As ativações usadas na prática são funções simples, aplicadas **elemento a elemento** à pré-ativação $z$, com derivada útil:

$$
\begin{aligned}
\sigma(z) &= \frac{1}{1 + e^{-z}} & \sigma'(z) &= \sigma(z)\,\bigl(1 - \sigma(z)\bigr) \\
\tanh(z) &= \frac{e^{z} - e^{-z}}{e^{z} + e^{-z}} & \tanh'(z) &= 1 - \tanh^2(z) \\
\text{ReLU}(z) &= \max(0, z) & \text{ReLU}'(z) &= \begin{cases} 1 & z > 0 \\ 0 & z \le 0 \end{cases} \\
\text{Leaky}(z) &= \begin{cases} z & z > 0 \\ a z & z \le 0 \end{cases} & \text{Leaky}'(z) &= \begin{cases} 1 & z > 0 \\ a & z \le 0 \end{cases}
\end{aligned}
$$

A **sigmoide** vai de 0 a 1 e serve para probabilidades; a **tanh** vai de −1 a 1 e é centrada em zero, o que deixa as ativações da camada seguinte com média perto de zero. A **ReLU** é só um corte em zero: barata, sem teto para valores positivos, e virou o padrão das camadas escondidas. Em $z = 0$ ela não tem derivada; a convenção é usar 0. A **Leaky ReLU** troca o zero da parte negativa por uma inclinação pequena $a$ (tipicamente 0,01). Uma escolha ruim de ativação não dá erro na hora de escrever o código: o sintoma aparece no treino, e por isso esta lição mede cada função.

A **GELU**, usada nos transformers do módulo 7, é uma ReLU "arredondada" perto do zero. A forma mais usada é uma aproximação com tanh:

$$
\text{GELU}(z) \approx \tfrac{1}{2}\, z \left(1 + \tanh\!\left(\sqrt{2/\pi}\,\bigl(z + 0{,}044715\, z^{3}\bigr)\right)\right)
$$

Em numpy, todas viram uma linha vetorizada:

```python
relu = np.maximum(z, 0.0)          # máximo elemento a elemento
d_relu = (z > 0).astype(float)     # 0 em z = 0, por convenção
```

Cuidado com `np.max(z, 0.0)`: `np.max` é o maior valor do array, e o segundo argumento dela é o eixo. O que corta cada elemento em zero é `np.maximum`. As fórmulas com exponencial também escondem uma armadilha numérica, que a próxima previsão mostra.

## Passo 2 · Previsão · Ativações nas pontas

O programa avalia a sigmoide pela fórmula direta em valores grandes, a tanh do numpy e duas contas com exponenciais. Leia sem executar e digite o que ele imprime.

### Código
```python
import numpy as np


def sigmoide(z):
    return 1 / (1 + np.exp(-z))


print(sigmoide(40.0) == 1.0)
print(f"{sigmoide(-40.0):.0e}")
print(np.tanh(1000.0))
s = sigmoide(10.0)
print(f"{s * (1 - s):.0e}")
print(np.exp(1000.0) / (1 + np.exp(1000.0)))
print(np.maximum(0.0, 0.0), float(0.0 > 0))
```

### Dicas
1. $e^{-40} \approx 4 \cdot 10^{-18}$, muito menor que a precisão de um `float64` perto de 1 (cerca de $10^{-16}$).
2. Para $z$ grande, $\sigma(z)\,(1 - \sigma(z)) \approx e^{-z}$, e $e^{10} \approx 22\,026$.
3. `np.exp(1000.0)` não cabe num `float64`: vira `inf`, sem erro. Quanto dá `inf / inf`?

### Saída esperada
```text
True
4e-18
1.0
5e-05
nan
0.0 0.0
```

## Passo 3 · Exercício · Ativações e derivadas vetorizadas
modo: lacunas

Complete as lacunas (`___`). Todas as funções recebem `z` (número, lista ou array de qualquer forma) e devolvem um array da mesma forma, elemento a elemento. A sigmoide usa a forma **estável**: com `e = exp(-|z|)`, que nunca estoura, ela é `1 / (1 + e)` para $z \ge 0$ e `e / (1 + e)` para $z < 0$.

### Instruções
1. `sigmoide(z)` é estável: dá 0 e 1 (sem `nan`) em −1000 e 1000.
2. `d_sigmoide(z)` e `d_tanh(z)` recebem a pré-ativação `z` e devolvem as derivadas pelas fórmulas da leitura.
3. `relu(z)` corta os negativos em zero; `d_relu(z)` vale 1 onde $z > 0$ e 0 nos outros pontos, inclusive em $z = 0$.
4. `leaky_relu(z, a=0.01)` e `d_leaky_relu(z, a=0.01)` usam o parâmetro `a` na parte $z \le 0$.

### Código inicial
```python
import numpy as np


def sigmoide(z):
    z = np.asarray(z, dtype=float)
    e = np.exp(-np.abs(z))
    return np.where(z >= 0, ___, ___)


def d_sigmoide(z):
    s = sigmoide(z)
    return ___


def d_tanh(z):
    return ___


def relu(z):
    return ___


def d_relu(z):
    return (___).astype(float)


def leaky_relu(z, a=0.01):
    z = np.asarray(z, dtype=float)
    return np.where(z > 0, z, ___)


def d_leaky_relu(z, a=0.01):
    z = np.asarray(z, dtype=float)
    return np.where(z > 0, 1.0, ___)
```

### Solução
```python
import numpy as np


def sigmoide(z):
    z = np.asarray(z, dtype=float)
    e = np.exp(-np.abs(z))
    return np.where(z >= 0, 1 / (1 + e), e / (1 + e))


def d_sigmoide(z):
    s = sigmoide(z)
    return s * (1 - s)


def d_tanh(z):
    return 1 - np.tanh(z) ** 2


def relu(z):
    return np.maximum(z, 0.0)


def d_relu(z):
    return (np.asarray(z) > 0).astype(float)


def leaky_relu(z, a=0.01):
    z = np.asarray(z, dtype=float)
    return np.where(z > 0, z, a * z)


def d_leaky_relu(z, a=0.01):
    z = np.asarray(z, dtype=float)
    return np.where(z > 0, 1.0, a)
```

### Dicas
1. Na sigmoide estável, os dois ramos usam o mesmo `e`; só muda o numerador.
2. As derivadas da sigmoide e da tanh se escrevem com a própria função aplicada a `z`, não com `z`.
3. Para a ReLU, `np.maximum` corta elemento a elemento; a derivada é uma comparação estrita convertida para `float`.

### Verificação
```json
[
  {"id": "sigmoide-valores", "checkpoint": 1, "kind": "expr", "expr": "sigmoide([-2.0, 0.0, 2.0]).tolist()", "expected": [0.11920292202211755, 0.5, 0.8807970779778823], "tolerance": 1e-12, "name": "sigmoide em -2, 0 e 2", "hint": "Para z negativo, e = exp(-|z|) = exp(z), e a sigmoide é e / (1 + e)."},
  {"id": "sigmoide-referencia", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nz = np.linspace(-30, 30, 61)", "expr": "bool(np.allclose(sigmoide(z), 1 / (1 + np.exp(-z)), rtol=1e-12, atol=1e-15))", "expected": true, "name": "Em 61 pontos de -30 a 30, igual à fórmula 1 / (1 + exp(-z))", "hint": "Compara-se com a fórmula direta, que não estoura nessa faixa."},
  {"id": "sigmoide-pontas", "checkpoint": 1, "kind": "expr", "expr": "sigmoide([-1000.0, 1000.0]).tolist()", "expected": [0.0, 1.0], "name": "Em -1000 e 1000, dá 0 e 1, sem nan", "hint": "exp de um número grande dá inf, e inf / inf é nan: o numpy não avisa."},
  {"id": "d-sigmoide-valores", "checkpoint": 2, "kind": "expr", "expr": "d_sigmoide([0.0, 2.0]).tolist()", "expected": [0.25, 0.10499358540350662], "tolerance": 1e-12, "name": "Derivada da sigmoide em 0 (o máximo, 1/4) e em 2", "hint": "A derivada é σ(z)·(1 - σ(z)), com σ calculada uma vez sobre z."},
  {"id": "d-tanh-valores", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np", "expr": "d_tanh(np.array([0.0, 1.0])).tolist()", "expected": [1.0, 0.41997434161402614], "tolerance": 1e-12, "name": "Derivada da tanh em 0 e em 1", "hint": "A derivada usa tanh(z), não z."},
  {"id": "derivadas-numericas", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nr = np.random.default_rng(0)\nz = r.normal(size=(4, 5)) * 2\ndef _num(f, z, h=1e-5):\n    return (f(z + h) - f(z - h)) / (2 * h)\ndef _erro(a, n):\n    return float(np.linalg.norm(a - n) / max(np.linalg.norm(a) + np.linalg.norm(n), 1e-8))\n", "expr": "[_erro(d_sigmoide(z), _num(sigmoide, z)) < 1e-7, _erro(d_tanh(z), _num(np.tanh, z)) < 1e-7, _erro(d_leaky_relu(z, 0.1), _num(lambda v: leaky_relu(v, 0.1), z)) < 1e-7]", "expected": [true, true, true], "name": "d_sigmoide, d_tanh e d_leaky_relu batem com a diferença central em 20 pontos sorteados", "hint": "A lista diz, na ordem, se a sigmoide, a tanh e a Leaky ReLU (a = 0,1) passaram na checagem numérica."},
  {"id": "relu-valores", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np", "expr": "relu(np.array([-1.5, 0.0, 2.0])).tolist()", "expected": [0.0, 0.0, 2.0], "name": "relu em -1,5, 0 e 2", "hint": "O máximo elemento a elemento entre z e 0 é np.maximum, não np.max."},
  {"id": "d-relu-zero", "checkpoint": 3, "kind": "expr", "expr": "d_relu([-1.0, 0.0, 2.0]).tolist()", "expected": [0.0, 0.0, 1.0], "name": "Derivada da ReLU: 0 nos negativos, 0 em zero (convenção) e 1 nos positivos", "hint": "A comparação com zero é estrita."},
  {"id": "leaky-padrao", "checkpoint": 4, "kind": "expr", "expr": "leaky_relu([-100.0, 0.0, 3.0]).tolist()", "expected": [-1.0, 0.0, 3.0], "tolerance": 1e-12, "name": "Leaky ReLU com a = 0,01: os negativos encolhem 100 vezes"},
  {"id": "leaky-a", "checkpoint": 4, "kind": "expr", "expr": "[leaky_relu([-2.0, 4.0], a=0.2).tolist(), d_leaky_relu([-2.0, 0.0, 4.0], a=0.2).tolist()]", "expected": [[-0.4, 4.0], [0.2, 0.2, 1.0]], "tolerance": 1e-12, "name": "Leaky ReLU e derivada com a = 0,2", "hint": "Use o parâmetro a, não 0,01 fixo; a derivada vale a nos negativos e em zero."},
  {"id": "formas", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nZ = np.linspace(-3, 3, 12).reshape(3, 4)", "expr": "[list(f(Z).shape) for f in (sigmoide, d_sigmoide, d_tanh, relu, d_relu, leaky_relu, d_leaky_relu)]", "expected": [[3, 4], [3, 4], [3, 4], [3, 4], [3, 4], [3, 4], [3, 4]], "name": "As sete funções devolvem a forma da entrada (3 × 4)"}
]
```

### Soluções erradas
```python name="sigmoide como exp(z) / (1 + exp(z))"
import numpy as np


def sigmoide(z):
    z = np.asarray(z, dtype=float)
    e = np.exp(-np.abs(z))
    return np.where(z >= 0, np.exp(z) / (1 + np.exp(z)), e / (1 + e))


def d_sigmoide(z):
    s = sigmoide(z)
    return s * (1 - s)


def d_tanh(z):
    return 1 - np.tanh(z) ** 2


def relu(z):
    return np.maximum(z, 0.0)


def d_relu(z):
    return (np.asarray(z) > 0).astype(float)


def leaky_relu(z, a=0.01):
    z = np.asarray(z, dtype=float)
    return np.where(z > 0, z, a * z)


def d_leaky_relu(z, a=0.01):
    z = np.asarray(z, dtype=float)
    return np.where(z > 0, 1.0, a)
```
```python name="mesma fórmula nos dois ramos"
import numpy as np


def sigmoide(z):
    z = np.asarray(z, dtype=float)
    e = np.exp(-np.abs(z))
    return np.where(z >= 0, 1 / (1 + e), 1 / (1 + e))


def d_sigmoide(z):
    s = sigmoide(z)
    return s * (1 - s)


def d_tanh(z):
    return 1 - np.tanh(z) ** 2


def relu(z):
    return np.maximum(z, 0.0)


def d_relu(z):
    return (np.asarray(z) > 0).astype(float)


def leaky_relu(z, a=0.01):
    z = np.asarray(z, dtype=float)
    return np.where(z > 0, z, a * z)


def d_leaky_relu(z, a=0.01):
    z = np.asarray(z, dtype=float)
    return np.where(z > 0, 1.0, a)
```
```python name="d_sigmoide aplica a sigmoide de novo"
import numpy as np


def sigmoide(z):
    z = np.asarray(z, dtype=float)
    e = np.exp(-np.abs(z))
    return np.where(z >= 0, 1 / (1 + e), e / (1 + e))


def d_sigmoide(z):
    s = sigmoide(z)
    return sigmoide(s) * (1 - sigmoide(s))


def d_tanh(z):
    return 1 - np.tanh(z) ** 2


def relu(z):
    return np.maximum(z, 0.0)


def d_relu(z):
    return (np.asarray(z) > 0).astype(float)


def leaky_relu(z, a=0.01):
    z = np.asarray(z, dtype=float)
    return np.where(z > 0, z, a * z)


def d_leaky_relu(z, a=0.01):
    z = np.asarray(z, dtype=float)
    return np.where(z > 0, 1.0, a)
```
```python name="d_tanh com z no lugar de tanh(z)"
import numpy as np


def sigmoide(z):
    z = np.asarray(z, dtype=float)
    e = np.exp(-np.abs(z))
    return np.where(z >= 0, 1 / (1 + e), e / (1 + e))


def d_sigmoide(z):
    s = sigmoide(z)
    return s * (1 - s)


def d_tanh(z):
    return 1 - z ** 2


def relu(z):
    return np.maximum(z, 0.0)


def d_relu(z):
    return (np.asarray(z) > 0).astype(float)


def leaky_relu(z, a=0.01):
    z = np.asarray(z, dtype=float)
    return np.where(z > 0, z, a * z)


def d_leaky_relu(z, a=0.01):
    z = np.asarray(z, dtype=float)
    return np.where(z > 0, 1.0, a)
```
```python name="np.max no lugar de np.maximum"
import numpy as np


def sigmoide(z):
    z = np.asarray(z, dtype=float)
    e = np.exp(-np.abs(z))
    return np.where(z >= 0, 1 / (1 + e), e / (1 + e))


def d_sigmoide(z):
    s = sigmoide(z)
    return s * (1 - s)


def d_tanh(z):
    return 1 - np.tanh(z) ** 2


def relu(z):
    return np.max(z, 0.0)


def d_relu(z):
    return (np.asarray(z) > 0).astype(float)


def leaky_relu(z, a=0.01):
    z = np.asarray(z, dtype=float)
    return np.where(z > 0, z, a * z)


def d_leaky_relu(z, a=0.01):
    z = np.asarray(z, dtype=float)
    return np.where(z > 0, 1.0, a)
```
```python name="derivada da ReLU 1 em zero"
import numpy as np


def sigmoide(z):
    z = np.asarray(z, dtype=float)
    e = np.exp(-np.abs(z))
    return np.where(z >= 0, 1 / (1 + e), e / (1 + e))


def d_sigmoide(z):
    s = sigmoide(z)
    return s * (1 - s)


def d_tanh(z):
    return 1 - np.tanh(z) ** 2


def relu(z):
    return np.maximum(z, 0.0)


def d_relu(z):
    return (np.asarray(z) >= 0).astype(float)


def leaky_relu(z, a=0.01):
    z = np.asarray(z, dtype=float)
    return np.where(z > 0, z, a * z)


def d_leaky_relu(z, a=0.01):
    z = np.asarray(z, dtype=float)
    return np.where(z > 0, 1.0, a)
```
```python name="Leaky ReLU com 0,01 fixo"
import numpy as np


def sigmoide(z):
    z = np.asarray(z, dtype=float)
    e = np.exp(-np.abs(z))
    return np.where(z >= 0, 1 / (1 + e), e / (1 + e))


def d_sigmoide(z):
    s = sigmoide(z)
    return s * (1 - s)


def d_tanh(z):
    return 1 - np.tanh(z) ** 2


def relu(z):
    return np.maximum(z, 0.0)


def d_relu(z):
    return (np.asarray(z) > 0).astype(float)


def leaky_relu(z, a=0.01):
    z = np.asarray(z, dtype=float)
    return np.where(z > 0, z, 0.01 * z)


def d_leaky_relu(z, a=0.01):
    z = np.asarray(z, dtype=float)
    return np.where(z > 0, 1.0, a)
```
```python name="derivada da Leaky ReLU 0 nos negativos"
import numpy as np


def sigmoide(z):
    z = np.asarray(z, dtype=float)
    e = np.exp(-np.abs(z))
    return np.where(z >= 0, 1 / (1 + e), e / (1 + e))


def d_sigmoide(z):
    s = sigmoide(z)
    return s * (1 - s)


def d_tanh(z):
    return 1 - np.tanh(z) ** 2


def relu(z):
    return np.maximum(z, 0.0)


def d_relu(z):
    return (np.asarray(z) > 0).astype(float)


def leaky_relu(z, a=0.01):
    z = np.asarray(z, dtype=float)
    return np.where(z > 0, z, a * z)


def d_leaky_relu(z, a=0.01):
    z = np.asarray(z, dtype=float)
    return np.where(z > 0, 1.0, 0.0)
```

## Passo 4 · Leitura · Saturação e neurônios mortos

A derivada da sigmoide é no máximo $1/4$, em $z = 0$, e cai para perto de zero nas pontas, onde a curva fica plana: é a **saturação**. A previsão mostrou $\sigma'(10) \approx 5 \cdot 10^{-5}$. O problema aparece quando se empilham camadas: no backward, o gradiente que chega à primeira camada passa por uma derivada de ativação em cada camada, multiplicando-se por elas. Com sigmoides, mesmo no melhor caso,

$$
\prod_{\ell=1}^{10} \sigma'(z_\ell) \le \left(\tfrac14\right)^{10} \approx 9{,}5 \cdot 10^{-7}
$$

e as primeiras camadas de uma rede de 10 camadas recebem um gradiente cerca de um milhão de vezes menor que as últimas: elas quase não aprendem. É o **gradiente que some**. A tanh satura menos, mas também achata nas pontas. A ReLU passa o gradiente **inteiro** onde $z > 0$.

O preço da ReLU é o lado negativo. Se a pré-ativação de um neurônio fica negativa para **todos** os exemplos (por exemplo, depois de um passo grande demais que joga o viés muito para baixo), a saída dele é sempre 0, a derivada também, e nenhum gradiente volta a mexer nos pesos dele: é um **neurônio morto**, que nunca se recupera sozinho. Um zero numa linha é normal (a ReLU é esparsa); morto é a coluna inteira zero no lote. A Leaky ReLU deixa uma inclinação $a$ nos negativos justamente para o gradiente não zerar.

Há ainda a armadilha numérica da previsão. A fórmula direta $1/(1 + e^{-z})$ em $z = -1000$ dá $1/\infty = 0$, o valor certo. Já a forma equivalente $e^z/(1 + e^z)$ em $z = 1000$ dá $\infty/\infty$, que é `nan`; o mesmo acontece com a tanh pela fórmula de exponenciais. O numpy **não avisa**: no executor não há `RuntimeWarning`, e `np.seterr(all="raise")` não tem efeito. Por isso se usa `np.tanh` e a sigmoide estável, e se confere com `np.isfinite`.

```python
z = np.array([-1000.0, 0.0, 1000.0])
ingenua = np.exp(z) / (1 + np.exp(z))    # [0.0, 0.5, nan]
np.isfinite(ingenua).all()               # False
```

Para conferir uma derivada escrita à mão, vale a diferença central do Nível 5, $\frac{f(z + h) - f(z - h)}{2h}$ com $h = 10^{-5}$, e um erro relativo abaixo de $10^{-7}$.

## Passo 5 · Exercício · Medir saturação e mortos

Escreva três ferramentas de diagnóstico.

### Instruções
1. `conferir_derivada(f, df, z, h=1e-5)` compara `df(z)` com a diferença central `(f(z + h) - f(z - h)) / (2h)` e devolve, como `float`, o erro relativo: a norma da diferença dividida pelo maior entre a soma das normas e `1e-8` (normas por `np.linalg.norm`). `f` e `df` funcionam elemento a elemento sobre arrays.
2. `fracao_saturada(A, limiar=0.99)` recebe saídas de tanh e devolve, como `float`, a fração de entradas com valor absoluto **maior** que `limiar`.
3. `neuronios_mortos(A)` recebe as saídas de uma camada ReLU para um lote (uma linha por exemplo, uma coluna por neurônio) e devolve a lista, em ordem crescente, dos índices das colunas que são zero em **todos** os exemplos.

### Código inicial
```python
import numpy as np


def conferir_derivada(f, df, z, h=1e-5):
    pass


def fracao_saturada(A, limiar=0.99):
    pass


def neuronios_mortos(A):
    pass
```

### Solução
```python
import numpy as np


def conferir_derivada(f, df, z, h=1e-5):
    z = np.asarray(z, dtype=float)
    numerica = (f(z + h) - f(z - h)) / (2 * h)
    analitica = df(z)
    return float(np.linalg.norm(analitica - numerica) / max(np.linalg.norm(analitica) + np.linalg.norm(numerica), 1e-8))


def fracao_saturada(A, limiar=0.99):
    A = np.asarray(A, dtype=float)
    return float(np.mean(np.abs(A) > limiar))


def neuronios_mortos(A):
    A = np.asarray(A, dtype=float)
    return [int(j) for j in np.flatnonzero(np.all(A == 0, axis=0))]
```

### Dicas
1. A diferença central avalia `f` dos dois lados de `z`, com o `h` recebido, e divide pela distância entre eles.
2. A média de um array booleano é a fração de `True`.
3. `np.all(..., axis=0)` responde uma pergunta por coluna; `np.flatnonzero` dá as posições dos `True`.

### Verificação
```json
[
  {"id": "derivada-certa", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nr = np.random.default_rng(1)\nz = r.normal(size=20)\n", "expr": "conferir_derivada(np.tanh, lambda v: 1 - np.tanh(v) ** 2, z) < 1e-7", "expected": true, "name": "A derivada certa da tanh dá erro relativo abaixo de 1e-7", "hint": "Diferença central: (f(z + h) - f(z - h)) / (2h). A diferença para a frente erra na casa de 1e-6."},
  {"id": "derivada-dobrada", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nr = np.random.default_rng(1)\nz = r.normal(size=20)\n", "expr": "conferir_derivada(np.tanh, lambda v: 2 * (1 - np.tanh(v) ** 2), z)", "expected": 0.3333333333, "tolerance": 1e-06, "name": "Uma derivada com o dobro do valor certo dá erro relativo 1/3", "hint": "Erro relativo: norma da diferença dividida pela soma das normas (com o piso 1e-8)."},
  {"id": "derivada-errada", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nr = np.random.default_rng(1)\nz = r.normal(size=20)\n", "expr": "conferir_derivada(np.tanh, np.tanh, z) > 0.1", "expected": true, "name": "Passar a própria função como derivada dá erro grande"},
  {"id": "usa-h", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nr = np.random.default_rng(1)\nz = r.normal(size=20)\n", "expr": "[conferir_derivada(np.sin, np.cos, z, h=0.1) > 1e-4, conferir_derivada(np.sin, np.cos, z) < 1e-7]", "expected": [true, true], "name": "Com h = 0,1 o erro do seno passa de 1e-4; com o h padrão, fica abaixo de 1e-7", "hint": "Use o h recebido nas duas avaliações e na divisão."},
  {"id": "zeros", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np", "expr": "conferir_derivada(lambda v: 0 * v, lambda v: 0 * v, np.ones(3))", "expected": 0.0, "type": "float", "name": "Dois gradientes zero dão erro 0.0, não nan", "hint": "O denominador tem um piso: o maior entre a soma das normas e 1e-8."},
  {"id": "saturada", "checkpoint": 2, "kind": "expr", "setup": "A = [[0.995, -0.999, 0.5], [0.99, 0.0, -0.98]]\n", "expr": "fracao_saturada(A)", "expected": 0.3333333333, "tolerance": 1e-09, "name": "Duas de seis saídas de tanh passam de 0,99 em módulo", "hint": "Saturação vale para os dois lados: compare o valor absoluto, de forma estrita."},
  {"id": "saturada-limiar", "checkpoint": 2, "kind": "expr", "setup": "A = [[0.995, -0.999, 0.5], [0.99, 0.0, -0.98]]\n", "expr": "[fracao_saturada(A, limiar=0.9), type(fracao_saturada(A)).__name__]", "expected": [0.6666666667, "float"], "tolerance": 1e-09, "name": "Com limiar 0,9, quatro de seis; devolve float"},
  {"id": "mortos", "checkpoint": 3, "kind": "expr", "expr": "neuronios_mortos([[0.0, 1.0, 0.0, 2.0], [0.0, 0.0, 0.0, 3.0], [0.0, 2.0, 1.0, 0.0]])", "expected": [0], "name": "Só a coluna 0 é zero em todos os exemplos", "hint": "Um neurônio está morto se a ativação dele é zero em todas as linhas do lote, não só na primeira."},
  {"id": "nenhum-morto", "checkpoint": 3, "kind": "expr", "expr": "neuronios_mortos([[0.0, 1.0], [2.0, 0.0]])", "expected": [], "name": "Nenhuma coluna inteira de zeros: lista vazia"},
  {"id": "mortos-rede", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nr = np.random.default_rng(2)\nX = r.normal(size=(50, 4))\nW = r.normal(size=(4, 6))\nb = np.array([0.0, -20.0, 0.0, 0.0, -20.0, 0.0])\nA = np.maximum(X @ W + b, 0.0)", "expr": "neuronios_mortos(A)", "expected": [1, 4], "name": "Numa camada ReLU com viés -20 em dois neurônios, eles são os mortos (50 exemplos)", "hint": "Devolva os índices das colunas, em ordem crescente, como inteiros."}
]
```

### Soluções erradas
```python name="diferença para a frente"
import numpy as np


def conferir_derivada(f, df, z, h=1e-5):
    z = np.asarray(z, dtype=float)
    numerica = (f(z + h) - f(z)) / h
    analitica = df(z)
    return float(np.linalg.norm(analitica - numerica) / max(np.linalg.norm(analitica) + np.linalg.norm(numerica), 1e-8))


def fracao_saturada(A, limiar=0.99):
    A = np.asarray(A, dtype=float)
    return float(np.mean(np.abs(A) > limiar))


def neuronios_mortos(A):
    A = np.asarray(A, dtype=float)
    return [int(j) for j in np.flatnonzero(np.all(A == 0, axis=0))]
```
```python name="divide por h e não por 2h"
import numpy as np


def conferir_derivada(f, df, z, h=1e-5):
    z = np.asarray(z, dtype=float)
    numerica = (f(z + h) - f(z - h)) / h
    analitica = df(z)
    return float(np.linalg.norm(analitica - numerica) / max(np.linalg.norm(analitica) + np.linalg.norm(numerica), 1e-8))


def fracao_saturada(A, limiar=0.99):
    A = np.asarray(A, dtype=float)
    return float(np.mean(np.abs(A) > limiar))


def neuronios_mortos(A):
    A = np.asarray(A, dtype=float)
    return [int(j) for j in np.flatnonzero(np.all(A == 0, axis=0))]
```
```python name="erro relativo sem o piso"
import numpy as np


def conferir_derivada(f, df, z, h=1e-5):
    z = np.asarray(z, dtype=float)
    numerica = (f(z + h) - f(z - h)) / (2 * h)
    analitica = df(z)
    return float(np.linalg.norm(analitica - numerica) / (np.linalg.norm(analitica) + np.linalg.norm(numerica)))


def fracao_saturada(A, limiar=0.99):
    A = np.asarray(A, dtype=float)
    return float(np.mean(np.abs(A) > limiar))


def neuronios_mortos(A):
    A = np.asarray(A, dtype=float)
    return [int(j) for j in np.flatnonzero(np.all(A == 0, axis=0))]
```
```python name="erro absoluto"
import numpy as np


def conferir_derivada(f, df, z, h=1e-5):
    z = np.asarray(z, dtype=float)
    numerica = (f(z + h) - f(z - h)) / (2 * h)
    analitica = df(z)
    return float(np.linalg.norm(analitica - numerica))


def fracao_saturada(A, limiar=0.99):
    A = np.asarray(A, dtype=float)
    return float(np.mean(np.abs(A) > limiar))


def neuronios_mortos(A):
    A = np.asarray(A, dtype=float)
    return [int(j) for j in np.flatnonzero(np.all(A == 0, axis=0))]
```
```python name="ignora o h recebido"
import numpy as np


def conferir_derivada(f, df, z, h=1e-5):
    z = np.asarray(z, dtype=float)
    numerica = (f(z + 1e-5) - f(z - 1e-5)) / (2 * 1e-5)
    analitica = df(z)
    return float(np.linalg.norm(analitica - numerica) / max(np.linalg.norm(analitica) + np.linalg.norm(numerica), 1e-8))


def fracao_saturada(A, limiar=0.99):
    A = np.asarray(A, dtype=float)
    return float(np.mean(np.abs(A) > limiar))


def neuronios_mortos(A):
    A = np.asarray(A, dtype=float)
    return [int(j) for j in np.flatnonzero(np.all(A == 0, axis=0))]
```
```python name="saturação sem o valor absoluto"
import numpy as np


def conferir_derivada(f, df, z, h=1e-5):
    z = np.asarray(z, dtype=float)
    numerica = (f(z + h) - f(z - h)) / (2 * h)
    analitica = df(z)
    return float(np.linalg.norm(analitica - numerica) / max(np.linalg.norm(analitica) + np.linalg.norm(numerica), 1e-8))


def fracao_saturada(A, limiar=0.99):
    A = np.asarray(A, dtype=float)
    return float(np.mean(A > limiar))


def neuronios_mortos(A):
    A = np.asarray(A, dtype=float)
    return [int(j) for j in np.flatnonzero(np.all(A == 0, axis=0))]
```
```python name="saturação com >="
import numpy as np


def conferir_derivada(f, df, z, h=1e-5):
    z = np.asarray(z, dtype=float)
    numerica = (f(z + h) - f(z - h)) / (2 * h)
    analitica = df(z)
    return float(np.linalg.norm(analitica - numerica) / max(np.linalg.norm(analitica) + np.linalg.norm(numerica), 1e-8))


def fracao_saturada(A, limiar=0.99):
    A = np.asarray(A, dtype=float)
    return float(np.mean(np.abs(A) >= limiar))


def neuronios_mortos(A):
    A = np.asarray(A, dtype=float)
    return [int(j) for j in np.flatnonzero(np.all(A == 0, axis=0))]
```
```python name="mortos olhando um exemplo só"
import numpy as np


def conferir_derivada(f, df, z, h=1e-5):
    z = np.asarray(z, dtype=float)
    numerica = (f(z + h) - f(z - h)) / (2 * h)
    analitica = df(z)
    return float(np.linalg.norm(analitica - numerica) / max(np.linalg.norm(analitica) + np.linalg.norm(numerica), 1e-8))


def fracao_saturada(A, limiar=0.99):
    A = np.asarray(A, dtype=float)
    return float(np.mean(np.abs(A) > limiar))


def neuronios_mortos(A):
    A = np.asarray(A, dtype=float)
    return [int(j) for j in np.flatnonzero(A[0] == 0)]
```
```python name="mortos com any (algum zero)"
import numpy as np


def conferir_derivada(f, df, z, h=1e-5):
    z = np.asarray(z, dtype=float)
    numerica = (f(z + h) - f(z - h)) / (2 * h)
    analitica = df(z)
    return float(np.linalg.norm(analitica - numerica) / max(np.linalg.norm(analitica) + np.linalg.norm(numerica), 1e-8))


def fracao_saturada(A, limiar=0.99):
    A = np.asarray(A, dtype=float)
    return float(np.mean(np.abs(A) > limiar))


def neuronios_mortos(A):
    A = np.asarray(A, dtype=float)
    return [int(j) for j in np.flatnonzero(np.any(A == 0, axis=0))]
```

## Passo 6 · Leitura · Qual ativação em cada camada

As camadas **escondidas** e a camada de **saída** têm papéis diferentes, e a escolha da ativação segue isso.

Nas escondidas, o que importa é o gradiente passar bem e o custo ser baixo. A ReLU é o padrão: não satura no lado positivo e custa uma comparação. A Leaky ReLU é a troca quando muitos neurônios morrem. A GELU aparece nos transformers. A sigmoide e a tanh quase não são usadas em camadas escondidas de redes profundas, pela saturação; elas voltam no módulo 6, nas portas da LSTM, onde um valor entre 0 e 1 funciona como "quanto deixar passar".

Na saída, a ativação é escolhida pela **tarefa**, porque ela define o que os números significam:

| tarefa | neurônios de saída | ativação | o que sai |
|---|---|---|---|
| classificação binária | 1 | sigmoide | $P(y = 1)$ |
| multiclasse ($k$ classes) | $k$ | softmax por exemplo | $k$ probabilidades que somam 1 |
| regressão | 1 por alvo | identidade | o valor previsto, sem limites |

A softmax, do Nível 5, é $\text{softmax}(z)_j = e^{z_j} / \sum_i e^{z_i}$, aplicada a cada linha (um exemplo). Duas armadilhas comuns: softmax com **um** neurônio dá sempre $e^{z}/e^{z} = 1$, e a rede "prevê" a classe 1 para tudo, com perda constante; e softmax sem subtrair o maior logit de cada linha estoura com logits grandes. Na regressão, uma ReLU na saída impede a rede de prever valores negativos.

```python
logits = np.array([[2.0], [-3.0]])
P = np.exp(logits) / np.exp(logits).sum(axis=1, keepdims=True)
P.tolist()    # [[1.0], [1.0]]: uma "probabilidade" que não informa nada
```

Na prática, a ativação da saída muitas vezes fica **dentro da perda**: a rede devolve os logits, e a função de perda aplica a softmax e a entropia cruzada juntas, porque o gradiente combinado é simplesmente $P - Y$ (Nível 5) e a conta é mais estável. O MLP do módulo 4 faz exatamente isso. Esta lição escreve a função que transforma logits em saídas, que é o que se usa na hora de **prever**.

## Passo 7 · Exercício · GELU e a saída da rede

Escreva a GELU e a função que transforma os logits da última camada na saída de cada tipo de tarefa.

### Instruções
1. `gelu(z)` usa a aproximação com tanh da leitura 1, elemento a elemento.
2. `saida_da_rede(logits, tarefa)`, com `logits` de forma `(n, k)`, devolve a sigmoide estável de cada logit para `"binaria"` (com `k = 1`).
3. Para `"multiclasse"`, devolve a softmax de cada linha, estável para logits grandes (sem `nan` com 1000).
4. Para `"regressao"`, devolve os logits sem mudança; para qualquer outra tarefa, levanta `ValueError`.

### Código inicial
```python
import numpy as np


def gelu(z):
    pass


def saida_da_rede(logits, tarefa):
    pass
```

### Solução
```python
import numpy as np


def gelu(z):
    z = np.asarray(z, dtype=float)
    return 0.5 * z * (1 + np.tanh(np.sqrt(2 / np.pi) * (z + 0.044715 * z ** 3)))


def _sigmoide(z):
    e = np.exp(-np.abs(z))
    return np.where(z >= 0, 1 / (1 + e), e / (1 + e))


def saida_da_rede(logits, tarefa):
    logits = np.asarray(logits, dtype=float)
    if tarefa == "binaria":
        return _sigmoide(logits)
    if tarefa == "multiclasse":
        Z = logits - logits.max(axis=1, keepdims=True)
        E = np.exp(Z)
        return E / E.sum(axis=1, keepdims=True)
    if tarefa == "regressao":
        return logits.copy()
    raise ValueError(f"tarefa desconhecida: {tarefa}")
```

### Dicas
1. Confira as duas constantes da GELU: a raiz é de $2/\pi$, e o coeficiente do cubo tem dois zeros depois da vírgula.
2. Na softmax, `max` e `sum` são por linha (`axis=1, keepdims=True`), e subtrair o máximo não muda o resultado.
3. Com um neurônio de saída, a probabilidade vem da sigmoide, não da softmax.

### Verificação
```json
[
  {"id": "gelu-valores", "checkpoint": 1, "kind": "expr", "expr": "gelu([-3.0, -1.0, 0.0, 1.0, 3.0]).tolist()", "expected": [-0.0036373920817729943, -0.15880800939172324, 0.0, 0.8411919906082768, 2.996362607918227], "tolerance": 1e-12, "name": "GELU em -3, -1, 0, 1 e 3", "hint": "0,5·z·(1 + tanh(√(2/π)·(z + 0,044715·z³)))."},
  {"id": "gelu-erf", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nimport math\nz = np.linspace(-6, 6, 241)\nexata = np.array([0.5 * v * (1 + math.erf(v / math.sqrt(2))) for v in z])", "expr": "float(np.abs(gelu(z) - exata).max()) < 1e-3", "expected": true, "name": "A aproximação fica a menos de 0,001 da GELU exata (com erf) de -6 a 6", "hint": "Compara-se com 0,5·z·(1 + erf(z/√2)); confira as constantes √(2/π) e 0,044715."},
  {"id": "gelu-pontas", "checkpoint": 1, "kind": "expr", "expr": "gelu([-1000.0, 1000.0]).tolist()", "expected": [0.0, 1000.0], "tolerance": 1e-09, "name": "Nas pontas, 0 à esquerda e a identidade à direita, sem nan"},
  {"id": "binaria", "checkpoint": 2, "kind": "expr", "expr": "saida_da_rede([[-1.0], [0.0], [3.0]], 'binaria').tolist()", "expected": [[0.2689414213699951], [0.5], [0.9525741268224334]], "tolerance": 1e-12, "name": "Binária com um neurônio de saída: a sigmoide de cada logit", "hint": "Com um neurônio só, a softmax daria 1 sempre; a saída binária usa a sigmoide."},
  {"id": "binaria-pontas", "checkpoint": 2, "kind": "expr", "expr": "saida_da_rede([[-1000.0], [1000.0]], 'binaria').tolist()", "expected": [[0.0], [1.0]], "name": "Binária com logits ±1000: 0 e 1, sem nan"},
  {"id": "multiclasse", "checkpoint": 3, "kind": "expr", "expr": "saida_da_rede([[1.0, 2.0, 3.0], [0.0, 0.0, 0.0]], 'multiclasse').tolist()", "expected": [[0.09003057317038046, 0.24472847105479764, 0.6652409557748218], [0.3333333333333333, 0.3333333333333333, 0.3333333333333333]], "tolerance": 1e-12, "name": "Multiclasse: softmax de cada linha (cada linha soma 1)", "hint": "A softmax é por exemplo: some ao longo das classes (eixo 1)."},
  {"id": "multiclasse-estavel", "checkpoint": 3, "kind": "expr", "expr": "saida_da_rede([[1000.0, 1001.0]], 'multiclasse').tolist()", "expected": [[0.2689414213699951, 0.7310585786300049]], "tolerance": 1e-12, "name": "Multiclasse com logits 1000 e 1001: sem nan", "hint": "Subtraia o maior logit de cada linha antes do exp: a softmax não muda e o exp não estoura."},
  {"id": "regressao", "checkpoint": 4, "kind": "expr", "expr": "saida_da_rede([[-2.5, 3.0], [0.0, -1.0]], 'regressao').tolist()", "expected": [[-2.5, 3.0], [0.0, -1.0]], "name": "Regressão: os logits como estão, inclusive negativos"},
  {"id": "desconhecida", "checkpoint": 4, "kind": "expr", "expr": "saida_da_rede([[1.0]], 'ranking')", "raises": "ValueError", "name": "Tarefa desconhecida levanta ValueError"}
]
```

### Soluções erradas
```python name="GELU com 0,44715 no lugar de 0,044715"
import numpy as np


def gelu(z):
    z = np.asarray(z, dtype=float)
    return 0.5 * z * (1 + np.tanh(np.sqrt(2 / np.pi) * (z + 0.44715 * z ** 3)))


def _sigmoide(z):
    e = np.exp(-np.abs(z))
    return np.where(z >= 0, 1 / (1 + e), e / (1 + e))


def saida_da_rede(logits, tarefa):
    logits = np.asarray(logits, dtype=float)
    if tarefa == "binaria":
        return _sigmoide(logits)
    if tarefa == "multiclasse":
        Z = logits - logits.max(axis=1, keepdims=True)
        E = np.exp(Z)
        return E / E.sum(axis=1, keepdims=True)
    if tarefa == "regressao":
        return logits.copy()
    raise ValueError(f"tarefa desconhecida: {tarefa}")
```
```python name="GELU sem o 0,5"
import numpy as np


def gelu(z):
    z = np.asarray(z, dtype=float)
    return z * (1 + np.tanh(np.sqrt(2 / np.pi) * (z + 0.044715 * z ** 3)))


def _sigmoide(z):
    e = np.exp(-np.abs(z))
    return np.where(z >= 0, 1 / (1 + e), e / (1 + e))


def saida_da_rede(logits, tarefa):
    logits = np.asarray(logits, dtype=float)
    if tarefa == "binaria":
        return _sigmoide(logits)
    if tarefa == "multiclasse":
        Z = logits - logits.max(axis=1, keepdims=True)
        E = np.exp(Z)
        return E / E.sum(axis=1, keepdims=True)
    if tarefa == "regressao":
        return logits.copy()
    raise ValueError(f"tarefa desconhecida: {tarefa}")
```
```python name="GELU com √2/π no lugar de √(2/π)"
import numpy as np


def gelu(z):
    z = np.asarray(z, dtype=float)
    return 0.5 * z * (1 + np.tanh(np.sqrt(2) / np.pi * (z + 0.044715 * z ** 3)))


def _sigmoide(z):
    e = np.exp(-np.abs(z))
    return np.where(z >= 0, 1 / (1 + e), e / (1 + e))


def saida_da_rede(logits, tarefa):
    logits = np.asarray(logits, dtype=float)
    if tarefa == "binaria":
        return _sigmoide(logits)
    if tarefa == "multiclasse":
        Z = logits - logits.max(axis=1, keepdims=True)
        E = np.exp(Z)
        return E / E.sum(axis=1, keepdims=True)
    if tarefa == "regressao":
        return logits.copy()
    raise ValueError(f"tarefa desconhecida: {tarefa}")
```
```python name="softmax na saída binária de um neurônio"
import numpy as np


def gelu(z):
    z = np.asarray(z, dtype=float)
    return 0.5 * z * (1 + np.tanh(np.sqrt(2 / np.pi) * (z + 0.044715 * z ** 3)))


def _sigmoide(z):
    e = np.exp(-np.abs(z))
    return np.where(z >= 0, 1 / (1 + e), e / (1 + e))


def saida_da_rede(logits, tarefa):
    logits = np.asarray(logits, dtype=float)
    if tarefa == "binaria":
        E = np.exp(logits - logits.max(axis=1, keepdims=True))
        return E / E.sum(axis=1, keepdims=True)
    if tarefa == "multiclasse":
        Z = logits - logits.max(axis=1, keepdims=True)
        E = np.exp(Z)
        return E / E.sum(axis=1, keepdims=True)
    if tarefa == "regressao":
        return logits.copy()
    raise ValueError(f"tarefa desconhecida: {tarefa}")
```
```python name="softmax no eixo 0"
import numpy as np


def gelu(z):
    z = np.asarray(z, dtype=float)
    return 0.5 * z * (1 + np.tanh(np.sqrt(2 / np.pi) * (z + 0.044715 * z ** 3)))


def _sigmoide(z):
    e = np.exp(-np.abs(z))
    return np.where(z >= 0, 1 / (1 + e), e / (1 + e))


def saida_da_rede(logits, tarefa):
    logits = np.asarray(logits, dtype=float)
    if tarefa == "binaria":
        return _sigmoide(logits)
    if tarefa == "multiclasse":
        Z = logits - logits.max(axis=0, keepdims=True)
        E = np.exp(Z)
        return E / E.sum(axis=0, keepdims=True)
    if tarefa == "regressao":
        return logits.copy()
    raise ValueError(f"tarefa desconhecida: {tarefa}")
```
```python name="softmax sem subtrair o máximo"
import numpy as np


def gelu(z):
    z = np.asarray(z, dtype=float)
    return 0.5 * z * (1 + np.tanh(np.sqrt(2 / np.pi) * (z + 0.044715 * z ** 3)))


def _sigmoide(z):
    e = np.exp(-np.abs(z))
    return np.where(z >= 0, 1 / (1 + e), e / (1 + e))


def saida_da_rede(logits, tarefa):
    logits = np.asarray(logits, dtype=float)
    if tarefa == "binaria":
        return _sigmoide(logits)
    if tarefa == "multiclasse":
        Z = logits
        E = np.exp(Z)
        return E / E.sum(axis=1, keepdims=True)
    if tarefa == "regressao":
        return logits.copy()
    raise ValueError(f"tarefa desconhecida: {tarefa}")
```
```python name="ReLU na saída da regressão"
import numpy as np


def gelu(z):
    z = np.asarray(z, dtype=float)
    return 0.5 * z * (1 + np.tanh(np.sqrt(2 / np.pi) * (z + 0.044715 * z ** 3)))


def _sigmoide(z):
    e = np.exp(-np.abs(z))
    return np.where(z >= 0, 1 / (1 + e), e / (1 + e))


def saida_da_rede(logits, tarefa):
    logits = np.asarray(logits, dtype=float)
    if tarefa == "binaria":
        return _sigmoide(logits)
    if tarefa == "multiclasse":
        Z = logits - logits.max(axis=1, keepdims=True)
        E = np.exp(Z)
        return E / E.sum(axis=1, keepdims=True)
    if tarefa == "regressao":
        return np.maximum(logits, 0.0)
    raise ValueError(f"tarefa desconhecida: {tarefa}")
```
```python name="tarefa desconhecida devolve None"
import numpy as np


def gelu(z):
    z = np.asarray(z, dtype=float)
    return 0.5 * z * (1 + np.tanh(np.sqrt(2 / np.pi) * (z + 0.044715 * z ** 3)))


def _sigmoide(z):
    e = np.exp(-np.abs(z))
    return np.where(z >= 0, 1 / (1 + e), e / (1 + e))


def saida_da_rede(logits, tarefa):
    logits = np.asarray(logits, dtype=float)
    if tarefa == "binaria":
        return _sigmoide(logits)
    if tarefa == "multiclasse":
        Z = logits - logits.max(axis=1, keepdims=True)
        E = np.exp(Z)
        return E / E.sum(axis=1, keepdims=True)
    if tarefa == "regressao":
        return logits.copy()
    return None
```

## Passo 8 · Quiz · Derivadas e escolhas

### Pergunta
Numa rede de 10 camadas com sigmoide em todas as escondidas, a norma do gradiente da primeira camada sai cerca de um milhão de vezes menor que a da última. Qual é a causa principal?
- [ ] A taxa de aprendizado é pequena demais
- [x] Cada camada multiplica o gradiente pela derivada da sigmoide, que é no máximo $1/4$, e $(1/4)^{10} \approx 10^{-6}$
- [ ] Erro de arredondamento do `float64` acumulado em 10 camadas
- [ ] A derivada da sigmoide vale 1 em zero, e os pesos é que são pequenos
> No backward, o gradiente da primeira camada é um produto que inclui uma derivada de ativação por camada; com sigmoide, cada uma vale no máximo 0,25, e o produto de 10 fica abaixo de $9{,}5 \cdot 10^{-7}$. A taxa de aprendizado multiplica todas as camadas igualmente e não cria essa diferença entre elas. O arredondamento do `float64` erra na casa de $10^{-16}$. O valor 1 em zero é da derivada da tanh; a da sigmoide é $1/4$.

### Pergunta
Depois de treinar com taxa 5,0, `neuronios_mortos(A)` na primeira camada (64 ReLUs, lote de 512 exemplos) devolve 23 índices. O que isso significa?
- [ ] É a esparsidade normal da ReLU: em qualquer lote, metade das saídas é zero
- [ ] Os 23 neurônios estão saturados e voltam a aprender quando a taxa diminuir
- [x] Esses 23 neurônios têm pré-ativação negativa nos 512 exemplos; a derivada é 0 para eles, e o gradiente não os traz de volta
- [ ] Trocar a convenção de `d_relu` para 1 em zero resolve
> `neuronios_mortos` só aponta colunas zeradas em **todos** os exemplos; zeros espalhados não entram. Com saída e derivada zero em todo o lote, os pesos desses neurônios não recebem gradiente e não mudam mais, com qualquer taxa: reduzir a taxa, usar Leaky ReLU ou uma inicialização melhor evita, mas não ressuscita. A convenção em $z = 0$ não importa aqui: as pré-ativações são negativas, não zero.

### Pergunta
Um classificador binário tem **um** neurônio de saída com softmax. Desde a primeira época, ele prevê probabilidade 1.0 para todos os exemplos, e a entropia cruzada dos exemplos positivos fica em 0. O que corrigir?
- [ ] Subtrair o maior logit antes da softmax, para ela ficar estável
- [ ] Aplicar a softmax ao longo do eixo 0, entre os exemplos
- [x] Usar sigmoide no neurônio único (ou dois neurônios com softmax): a softmax de um valor só é sempre $e^z / e^z = 1$
- [ ] Trocar a ReLU das camadas escondidas por tanh
> Com uma coluna, a soma do denominador é o próprio numerador, e a saída é 1 para qualquer logit: a rede não tem como dizer "classe 0". Subtrair o máximo deixa o mesmo resultado, só que estável. Softmax entre exemplos mistura amostras diferentes e não tem sentido de probabilidade. As camadas escondidas não têm relação com isso.
