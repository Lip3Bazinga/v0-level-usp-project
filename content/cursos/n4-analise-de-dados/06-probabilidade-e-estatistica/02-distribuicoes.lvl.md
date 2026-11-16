---
slug: n4-m6-02-distribuicoes
titulo: 'Distribuições: binomial, Poisson, uniforme, normal e exponencial'
descricao: Variáveis aleatórias, esperança e variância, as distribuições mais usadas com scipy.stats, a regra 68-95-99,7 e quantis.
dificuldade: intermediario
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- pandas
- scipy
xp: 120
tempo_min: 50
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Identificar a distribuição adequada a um fenômeno (contagem, tempo entre eventos, medida contínua)
- Calcular probabilidades e quantis com scipy.stats (pmf, pdf, cdf, ppf) e esperança/variância
- Comparar um histograma de dados com a densidade teórica
---

## Passo 1 · Leitura · Variável aleatória, esperança e variância

Uma padaria fictícia anotou, durante meses, quantas reclamações recebe por dia: nenhuma em metade dos dias, uma em 30 %, duas em 15 % e três em 5 %. O número de reclamações de amanhã é uma **variável aleatória**: um número que depende do acaso, descrito pelos valores possíveis e pela chance de cada um. Quando os valores podem ser listados (0, 1, 2…), ela é **discreta**; quando podem cair em qualquer ponto de um intervalo (um tempo, uma altura), é **contínua**.

A **esperança** é a média dos valores pesada pelas probabilidades: o valor em torno do qual a média de muitos dias se estabiliza. A **variância** mede o espalhamento: a média dos desvios ao quadrado, também pesada.

$$
E[X] = \sum_i x_i\, p_i, \qquad \operatorname{Var}(X) = \sum_i (x_i - E[X])^2\, p_i = E[X^2] - E[X]^2
$$

O **desvio padrão** é a raiz da variância e volta para a unidade dos dados: reclamações, e não reclamações ao quadrado.

```python
x = np.array([0, 1, 2, 3])
p = np.array([0.5, 0.3, 0.15, 0.05])
esperanca = np.sum(x * p)                       # 0.75 reclamação por dia
variancia = np.sum((x - esperanca) ** 2 * p)    # 0.7875
desvio = np.sqrt(variancia)                     # cerca de 0.89 reclamação
```

A esperança não precisa ser um valor possível: nenhum dia tem 0,75 reclamação. Ela diz que, em 100 dias, o total deve ficar perto de 75. Também não é a média simples dos valores: $(0 + 1 + 2 + 3)/4 = 1{,}5$ trataria os quatro valores como igualmente prováveis, o que a tabela desmente.

Uma tabela de probabilidades só faz sentido se as chances forem todas maiores ou iguais a zero e somarem 1. Com números de ponto flutuante a soma pode dar `0.9999999999999999`, então a conferência usa `np.isclose`, que aceita uma diferença minúscula, em vez de `==`.

Muitos fenômenos seguem formatos que se repetem, com nome e fórmula: as **distribuições** desta lição. Cada uma tem esperança e variância conhecidas, e o `scipy.stats` sabe calcular as chances de todas elas. Escolher a distribuição certa é decidir que tipo de fenômeno você tem nas mãos: uma contagem de sucessos em tentativas, uma contagem de eventos num intervalo, uma medida contínua ou um tempo de espera.

## Passo 2 · Exercício · Esperança e variância
modo: lacunas

Complete as lacunas (`___`) para calcular a esperança e a variância de uma variável discreta a partir da tabela de valores e probabilidades.

### Instruções
1. `esperanca_variancia(valores, probabilidades)` levanta `ValueError` se alguma probabilidade for negativa ou se elas não somarem 1 (use `np.isclose`). Probabilidade zero é válida.
2. A função devolve a tupla `(esperanca, variancia)`, com dois `float`, pesando cada valor pela sua probabilidade.

### Código inicial
```python
import numpy as np


def esperanca_variancia(valores, probabilidades):
    x = np.asarray(valores, dtype=float)
    p = np.asarray(probabilidades, dtype=float)
    if (p ___ 0).any() or not np.isclose(p.___(), 1.0):
        raise ValueError("as probabilidades precisam ser não negativas e somar 1")
    esperanca = float(np.sum(___))
    variancia = float(np.sum(___))
    return esperanca, variancia
```

### Solução
```python
import numpy as np


def esperanca_variancia(valores, probabilidades):
    x = np.asarray(valores, dtype=float)
    p = np.asarray(probabilidades, dtype=float)
    if (p < 0).any() or not np.isclose(p.sum(), 1.0):
        raise ValueError("as probabilidades precisam ser não negativas e somar 1")
    esperanca = float(np.sum(x * p))
    variancia = float(np.sum((x - esperanca) ** 2 * p))
    return esperanca, variancia
```

### Dicas
1. Uma probabilidade inválida é uma que fica abaixo de zero; zero em si é permitido.
2. A esperança pesa cada valor pela sua chance; a variância pesa cada desvio ao quadrado pela mesma chance.
3. O desvio é medido em relação à esperança, não à média simples dos valores.

### Verificação
```json
[
  { "id": "tipos", "checkpoint": 2, "kind": "expr", "setup": "r = esperanca_variancia([0, 1], [0.7, 0.3])",
    "expr": "[type(r).__name__, type(r[0]).__name__, type(r[1]).__name__]", "expected": ["tuple", "float", "float"],
    "name": "Devolve uma tupla de dois float" },
  { "id": "bernoulli", "checkpoint": 2, "kind": "expr", "expr": "list(esperanca_variancia([0, 1], [0.7, 0.3]))",
    "expected": [0.3, 0.21], "tolerance": 1e-9, "name": "Valores 0 e 1 com chances 0,7 e 0,3: esperança 0,3 e variância 0,21",
    "hint": "Cada valor entra pesado pela sua probabilidade." },
  { "id": "desigual", "checkpoint": 2, "kind": "expr",
    "expr": "list(esperanca_variancia([0, 1, 2, 3], [0.1, 0.2, 0.3, 0.4]))", "expected": [2.0, 1.0], "tolerance": 1e-9,
    "name": "Valores 0 a 3 com chances 0,1 a 0,4: esperança 2 e variância 1",
    "hint": "A variância é a soma dos desvios ao quadrado, cada um pesado pela sua chance." },
  { "id": "dado", "checkpoint": 2, "kind": "expr",
    "expr": "list(esperanca_variancia([1, 2, 3, 4, 5, 6], [1 / 6] * 6))", "expected": [3.5, 2.9166666666666665],
    "tolerance": 1e-9, "name": "Dado honesto: esperança 3,5 e variância 35/12" },
  { "id": "simetrica", "checkpoint": 2, "kind": "expr", "expr": "list(esperanca_variancia([-2, 2], [0.5, 0.5]))",
    "expected": [0.0, 4.0], "tolerance": 1e-9, "name": "Valores -2 e 2 com chances iguais: esperança 0 e variância 4" },
  { "id": "constante", "checkpoint": 2, "kind": "expr", "expr": "list(esperanca_variancia([10], [1.0]))",
    "expected": [10.0, 0.0], "tolerance": 1e-9, "name": "Um valor certo tem variância zero" },
  { "id": "chance-zero", "checkpoint": 1, "kind": "expr", "expr": "list(esperanca_variancia([1, 2, 3], [0.5, 0.0, 0.5]))",
    "expected": [2.0, 1.0], "tolerance": 1e-9, "name": "Probabilidade zero é aceita",
    "hint": "Zero é uma probabilidade válida; só valores abaixo dele são recusados." },
  { "id": "soma-errada", "checkpoint": 1, "kind": "expr", "expr": "esperanca_variancia([1, 2, 3], [0.3, 0.3, 0.3])",
    "raises": "ValueError", "name": "Probabilidades que somam 0,9 são recusadas" },
  { "id": "negativa", "checkpoint": 1, "kind": "expr", "expr": "esperanca_variancia([1, 2, 3], [0.6, 0.6, -0.2])",
    "raises": "ValueError", "name": "Probabilidade negativa é recusada, mesmo com soma 1" }
]
```

### Soluções erradas
```python name="média simples dos valores"
import numpy as np


def esperanca_variancia(valores, probabilidades):
    x = np.asarray(valores, dtype=float)
    p = np.asarray(probabilidades, dtype=float)
    if (p < 0).any() or not np.isclose(p.sum(), 1.0):
        raise ValueError("as probabilidades precisam ser não negativas e somar 1")
    esperanca = float(np.sum(x / len(x)))
    variancia = float(np.sum((x - esperanca) ** 2 * p))
    return esperanca, variancia
```
```python name="E[X²] no lugar da variância"
import numpy as np


def esperanca_variancia(valores, probabilidades):
    x = np.asarray(valores, dtype=float)
    p = np.asarray(probabilidades, dtype=float)
    if (p < 0).any() or not np.isclose(p.sum(), 1.0):
        raise ValueError("as probabilidades precisam ser não negativas e somar 1")
    esperanca = float(np.sum(x * p))
    variancia = float(np.sum(x ** 2 * p))
    return esperanca, variancia
```
```python name="desvio sem o quadrado"
import numpy as np


def esperanca_variancia(valores, probabilidades):
    x = np.asarray(valores, dtype=float)
    p = np.asarray(probabilidades, dtype=float)
    if (p < 0).any() or not np.isclose(p.sum(), 1.0):
        raise ValueError("as probabilidades precisam ser não negativas e somar 1")
    esperanca = float(np.sum(x * p))
    variancia = float(np.sum((x - esperanca) * p))
    return esperanca, variancia
```
```python name="variância sem pesos"
import numpy as np


def esperanca_variancia(valores, probabilidades):
    x = np.asarray(valores, dtype=float)
    p = np.asarray(probabilidades, dtype=float)
    if (p < 0).any() or not np.isclose(p.sum(), 1.0):
        raise ValueError("as probabilidades precisam ser não negativas e somar 1")
    esperanca = float(np.sum(x * p))
    variancia = float(np.sum((x - esperanca) ** 2 / len(x)))
    return esperanca, variancia
```
```python name="desvio em relação à média simples"
import numpy as np


def esperanca_variancia(valores, probabilidades):
    x = np.asarray(valores, dtype=float)
    p = np.asarray(probabilidades, dtype=float)
    if (p < 0).any() or not np.isclose(p.sum(), 1.0):
        raise ValueError("as probabilidades precisam ser não negativas e somar 1")
    esperanca = float(np.sum(x * p))
    variancia = float(np.sum((x - x.mean()) ** 2 * p))
    return esperanca, variancia
```
```python name="recusa probabilidade zero"
import numpy as np


def esperanca_variancia(valores, probabilidades):
    x = np.asarray(valores, dtype=float)
    p = np.asarray(probabilidades, dtype=float)
    if (p <= 0).any() or not np.isclose(p.sum(), 1.0):
        raise ValueError("as probabilidades precisam ser não negativas e somar 1")
    esperanca = float(np.sum(x * p))
    variancia = float(np.sum((x - esperanca) ** 2 * p))
    return esperanca, variancia
```

## Passo 3 · Leitura · Binomial e Poisson

Duas distribuições discretas cobrem a maior parte das contagens.

A **binomial** conta sucessos em $n$ tentativas independentes, cada uma com a mesma chance $p$: quantos de 20 clientes fictícios aceitam uma oferta, quantas de 10 peças saem com defeito. A chance de exatamente $k$ sucessos escolhe quais $k$ tentativas dão certo (a contagem do Nível 3) e multiplica as chances:

$$
P(X = k) = \binom{n}{k} p^k (1 - p)^{n - k}, \qquad E[X] = np, \qquad \operatorname{Var}(X) = np(1 - p)
$$

A **Poisson** conta eventos num intervalo quando eles chegam um a um, independentes, a uma taxa média $\lambda$: chamadas por hora numa central, defeitos por metro de tecido. Não há um número máximo de tentativas:

$$
P(X = k) = \frac{\lambda^k e^{-\lambda}}{k!}, \qquad E[X] = \operatorname{Var}(X) = \lambda
$$

As duas se encontram: quando $n$ é grande e $p$ é pequeno, a binomial fica muito parecida com uma Poisson de média $np$. Mil clientes que aceitam uma oferta rara, cada um com chance 0,002, se comportam como uma Poisson de média 2.

No `scipy.stats`, cada distribuição é um objeto com os mesmos métodos. Para as discretas, `pmf(k, ...)` é $P(X = k)$, `cdf(k, ...)` é $P(X \le k)$ e `sf(k, ...)` é $P(X > k)$:

```python
from scipy import stats

stats.binom.pmf(5, 10, 0.5)     # P(X = 5) com n = 10, p = 0,5: 0.2461
stats.binom.cdf(2, 10, 0.5)     # P(X <= 2): 0.0547
stats.binom.sf(7, 10, 0.5)      # P(X > 7) = P(X >= 8): 0.0547
stats.poisson.pmf(0, 3)         # nenhuma chamada numa hora, com 3 por hora em média: 0.0498
stats.poisson.cdf(2, 3)         # até 2 chamadas: 0.4232
```

A armadilha mais comum é o "pelo menos": $P(X \ge k) = 1 - P(X \le k - 1)$, que é `sf(k - 1)`. Escrever `sf(k)` deixa o próprio $k$ de fora. Outra: a ordem dos argumentos é `pmf(k, n, p)` na binomial e `pmf(k, mu)` na Poisson. Todo resultado do `scipy.stats` vem como número do numpy (`numpy.float64`); para devolver um `float` do Python, converta com `float(...)`.

Os métodos `pmf` só existem nas distribuições discretas. Numa contínua, como a normal da próxima leitura, a chance de um valor exato é zero, e o objeto nem tem esse método:

```text
AttributeError: 'norm_gen' object has no attribute 'pmf'
```

## Passo 4 · Exercício · Contagens

Use `scipy.stats` para calcular chances de contagens. Todas as funções devolvem `float` do Python.

### Instruções
1. `prob_binomial(n, p, k)` devolve $P(X = k)$ para $X$ binomial com `n` tentativas e chance `p`. Um `k` impossível (negativo ou maior que `n`) dá 0.
2. `prob_pelo_menos_binomial(n, p, k)` devolve $P(X \ge k)$ para a mesma binomial.
3. `prob_ate_k_poisson(lam, k)` devolve $P(X \le k)$ para $X$ de Poisson com média `lam`.

### Código inicial
```python
from scipy import stats


def prob_binomial(n, p, k):
    pass


def prob_pelo_menos_binomial(n, p, k):
    pass


def prob_ate_k_poisson(lam, k):
    pass
```

### Solução
```python
from scipy import stats


def prob_binomial(n, p, k):
    return float(stats.binom.pmf(k, n, p))


def prob_pelo_menos_binomial(n, p, k):
    return float(stats.binom.sf(k - 1, n, p))


def prob_ate_k_poisson(lam, k):
    return float(stats.poisson.cdf(k, lam))
```

### Dicas
1. "Exatamente $k$" é a `pmf`; "até $k$" é a `cdf`.
2. "Pelo menos $k$" é o complemento de "até $k - 1$".
3. Na Poisson, o segundo argumento é a média $\lambda$, não o inverso dela.

### Verificação
```json
[
  { "id": "bin-5", "checkpoint": 1, "kind": "call", "function": "prob_binomial", "args": [10, 0.5, 5],
    "expected": 0.24609375, "type": "float", "tolerance": 1e-12, "name": "Exatamente 5 caras em 10 lançamentos: 252/1024",
    "hint": "\"Exatamente\" pede a pmf, e o resultado precisa virar float do Python." },
  { "id": "bin-0", "checkpoint": 1, "kind": "call", "function": "prob_binomial", "args": [5, 0.2, 0],
    "expected": 0.32768, "tolerance": 1e-12, "name": "Nenhum sucesso em 5 tentativas com p = 0,2: 0,8 elevado a 5" },
  { "id": "bin-2-de-20", "checkpoint": 1, "kind": "call", "function": "prob_binomial", "args": [20, 0.1, 2],
    "expected": 0.2851798070642985, "tolerance": 1e-12, "name": "Exatamente 2 defeitos em 20 peças com p = 0,1" },
  { "id": "bin-impossivel", "checkpoint": 1, "kind": "call", "function": "prob_binomial", "args": [5, 0.5, 6],
    "expected": 0.0, "tolerance": 1e-12, "name": "6 sucessos em 5 tentativas é impossível" },
  { "id": "pelo-menos-8", "checkpoint": 2, "kind": "call", "function": "prob_pelo_menos_binomial", "args": [10, 0.5, 8],
    "expected": 0.0546875, "type": "float", "tolerance": 1e-12, "name": "Pelo menos 8 caras em 10 lançamentos: 56/1024",
    "hint": "O próprio k conta: \"pelo menos 8\" inclui o 8." },
  { "id": "pelo-menos-um-seis", "checkpoint": 2, "kind": "call", "function": "prob_pelo_menos_binomial",
    "args": [4, 0.16666666666666666, 1], "expected": 0.5177469135802469, "tolerance": 1e-9,
    "name": "Pelo menos um 6 em 4 lançamentos é a conta da lição anterior" },
  { "id": "pelo-menos-0", "checkpoint": 2, "kind": "call", "function": "prob_pelo_menos_binomial", "args": [10, 0.3, 0],
    "expected": 1.0, "tolerance": 1e-12, "name": "Pelo menos 0 sucessos é certo" },
  { "id": "poi-0", "checkpoint": 3, "kind": "call", "function": "prob_ate_k_poisson", "args": [2, 0],
    "expected": 0.1353352832366127, "type": "float", "tolerance": 1e-12, "name": "Nenhum evento com média 2: e elevado a -2" },
  { "id": "poi-2", "checkpoint": 3, "kind": "call", "function": "prob_ate_k_poisson", "args": [3, 2],
    "expected": 0.42319008112684353, "tolerance": 1e-12, "name": "Até 2 eventos com média 3",
    "hint": "\"Até k\" soma as chances de 0, 1, …, k." },
  { "id": "poi-10", "checkpoint": 3, "kind": "call", "function": "prob_ate_k_poisson", "args": [4, 10],
    "expected": 0.9971602338794862, "tolerance": 1e-12, "name": "Até 10 eventos com média 4" }
]
```

### Soluções erradas
```python name="cdf no lugar da pmf"
from scipy import stats


def prob_binomial(n, p, k):
    return float(stats.binom.cdf(k, n, p))


def prob_pelo_menos_binomial(n, p, k):
    return float(stats.binom.sf(k - 1, n, p))


def prob_ate_k_poisson(lam, k):
    return float(stats.poisson.cdf(k, lam))
```
```python name="parâmetros fora de ordem"
from scipy import stats


def prob_binomial(n, p, k):
    return float(stats.binom.pmf(k, p, n))


def prob_pelo_menos_binomial(n, p, k):
    return float(stats.binom.sf(k - 1, n, p))


def prob_ate_k_poisson(lam, k):
    return float(stats.poisson.cdf(k, lam))
```
```python name="pelo menos sem o próprio k"
from scipy import stats


def prob_binomial(n, p, k):
    return float(stats.binom.pmf(k, n, p))


def prob_pelo_menos_binomial(n, p, k):
    return float(stats.binom.sf(k, n, p))


def prob_ate_k_poisson(lam, k):
    return float(stats.poisson.cdf(k, lam))
```
```python name="pelo menos como até"
from scipy import stats


def prob_binomial(n, p, k):
    return float(stats.binom.pmf(k, n, p))


def prob_pelo_menos_binomial(n, p, k):
    return float(stats.binom.cdf(k, n, p))


def prob_ate_k_poisson(lam, k):
    return float(stats.poisson.cdf(k, lam))
```
```python name="pmf no lugar da cdf na Poisson"
from scipy import stats


def prob_binomial(n, p, k):
    return float(stats.binom.pmf(k, n, p))


def prob_pelo_menos_binomial(n, p, k):
    return float(stats.binom.sf(k - 1, n, p))


def prob_ate_k_poisson(lam, k):
    return float(stats.poisson.pmf(k, lam))
```
```python name="Poisson com o inverso da média"
from scipy import stats


def prob_binomial(n, p, k):
    return float(stats.binom.pmf(k, n, p))


def prob_pelo_menos_binomial(n, p, k):
    return float(stats.binom.sf(k - 1, n, p))


def prob_ate_k_poisson(lam, k):
    return float(stats.poisson.cdf(k, 1 / lam))
```
```python name="devolve números do numpy"
from scipy import stats


def prob_binomial(n, p, k):
    return stats.binom.pmf(k, n, p)


def prob_pelo_menos_binomial(n, p, k):
    return stats.binom.sf(k - 1, n, p)


def prob_ate_k_poisson(lam, k):
    return stats.poisson.cdf(k, lam)
```

## Passo 5 · Leitura · Uniforme, normal e exponencial

Numa variável contínua, a chance de um valor exato é zero; o que tem chance é um intervalo. A distribuição é descrita por uma **densidade** $f(x)$, e a chance de cair entre $a$ e $b$ é a área sob ela, calculada pela função de distribuição acumulada $F(x) = P(X \le x)$, a `cdf`:

$$
P(a \le X \le b) = F(b) - F(a)
$$

A **uniforme** em $[a, b]$ tem densidade constante: um ponteiro girado ao acaso. A **normal** com média $\mu$ e desvio $\sigma$ é o sino simétrico, e serve para medidas que resultam da soma de muitos efeitos pequenos (erros de medição, alturas, pesos de pacotes de uma máquina):

$$
f(x) = \frac{1}{\sigma\sqrt{2\pi}}\, e^{-\frac{(x - \mu)^2}{2\sigma^2}}
$$

Na normal, cerca de 68 % dos valores ficam a até 1 desvio da média, 95 % a até 2 e 99,7 % a até 3: a **regra 68-95-99,7**. Para comparar valores de normais diferentes, use o escore $z = (x - \mu)/\sigma$ da m1-01.

A **exponencial** descreve o tempo de espera até o próximo evento de um processo de Poisson: se chegam em média $\lambda$ clientes por minuto, o tempo entre chegadas tem média $1/\lambda$ e $P(T \le t) = 1 - e^{-\lambda t}$.

```python
stats.norm.cdf(80, loc=70, scale=10)              # P(X <= 80) com média 70 e desvio 10: 0.8413
stats.norm.cdf(90, 70, 10) - stats.norm.cdf(60, 70, 10)   # P(60 <= X <= 90): 0.8186
stats.norm.ppf(0.95, 70, 10)                      # o valor que deixa 95 % abaixo: 86.45
stats.uniform.cdf(0.3, loc=0, scale=1)            # 0.3
stats.expon.cdf(2, scale=5)                       # espera média de 5 min, até 2 min: 0.3297
```

Três cuidados. O `scale` da normal é o **desvio**, não a variância. O `scale` da exponencial é a **média**, $1/\lambda$, não a taxa. E o `ppf` é o inverso da `cdf`: recebe uma probabilidade e devolve o valor; a "nota de corte dos 5 % melhores" é o `ppf(0.95)`, e não o `ppf(0.05)`.

A normal não serve para tudo. Rendas, tempos de espera e preços são positivos e assimétricos, com cauda longa à direita; uma normal ajustada a eles dá chance positiva a valores negativos e subestima os extremos. Antes de usar uma distribuição, compare o histograma dos dados com a densidade dela.

## Passo 6 · Previsão · cdf e ppf

O programa calcula algumas chances e quantis com `scipy.stats` e arredonda cada resultado. Use a regra 68-95-99,7 e o que a leitura disse sobre `pmf`, `scale` e `ppf`. Digite a saída.

### Código
```python
from scipy import stats

print(round(float(stats.norm.cdf(0)), 2))
print(round(float(stats.norm.ppf(0.5, loc=70, scale=10)), 2))
print(round(float(stats.norm.cdf(1) - stats.norm.cdf(-1)), 2))
print(round(float(stats.norm.cdf(2) - stats.norm.cdf(-2)), 2))
print(round(float(stats.norm.ppf(0.975)), 2))
print(round(float(stats.binom.pmf(2, 2, 0.5)), 2))
print(round(float(stats.expon.cdf(2, scale=2)), 2))
print(hasattr(stats.norm, "pmf"), hasattr(stats.binom, "pmf"))
```

### Dicas
1. A normal padrão é simétrica em torno de 0, e o `ppf(0.5)` de qualquer normal é a própria média.
2. Com o `scale` igual ao tempo, a exponencial calcula $1 - e^{-1}$; $e^{-1} \approx 0{,}368$.
3. Só as distribuições discretas têm `pmf`.

### Saída esperada
```text
0.5
70.0
0.68
0.95
1.96
0.25
0.63
False True
```

## Passo 7 · Exercício · Probabilidades e quantis da normal

Escreva três funções para perguntas contínuas: a chance de uma medida cair numa faixa, a nota de corte de um percentual e a chance de uma espera curta. Todas devolvem `float` do Python.

### Instruções
1. `prob_normal_entre(mu, sigma, a, b)` devolve $P(a \le X \le b)$ para $X$ normal com média `mu` e desvio `sigma`. Levanta `ValueError` se `a > b` ou se `sigma <= 0`.
2. `quantil_normal(mu, sigma, p)` devolve o valor que deixa a fração `p` da distribuição abaixo dele. Levanta `ValueError` se `p` não estiver estritamente entre 0 e 1.
3. `prob_exponencial_ate(media, t)` devolve $P(T \le t)$ para um tempo de espera exponencial com a **média** `media`.

### Código inicial
```python
from scipy import stats


def prob_normal_entre(mu, sigma, a, b):
    pass


def quantil_normal(mu, sigma, p):
    pass


def prob_exponencial_ate(media, t):
    pass
```

### Solução
```python
from scipy import stats


def prob_normal_entre(mu, sigma, a, b):
    if a > b or sigma <= 0:
        raise ValueError("é preciso a <= b e sigma > 0")
    return float(stats.norm.cdf(b, mu, sigma) - stats.norm.cdf(a, mu, sigma))


def quantil_normal(mu, sigma, p):
    if not 0 < p < 1:
        raise ValueError("p precisa estar entre 0 e 1")
    return float(stats.norm.ppf(p, mu, sigma))


def prob_exponencial_ate(media, t):
    return float(stats.expon.cdf(t, scale=media))
```

### Dicas
1. A chance de uma faixa é a diferença de duas `cdf`, a do limite de cima menos a do de baixo.
2. O `ppf` recebe a fração que fica **abaixo** do valor procurado.
3. O `scale` da exponencial é a média do tempo de espera.

### Verificação
```json
[
  { "id": "entre-1sigma", "checkpoint": 1, "kind": "call", "function": "prob_normal_entre", "args": [0, 1, -1, 1],
    "expected": 0.6826894921370859, "type": "float", "tolerance": 1e-9, "name": "A até 1 desvio da média: cerca de 68 %",
    "hint": "A chance de uma faixa é a cdf do limite de cima menos a do de baixo." },
  { "id": "entre-notas", "checkpoint": 1, "kind": "call", "function": "prob_normal_entre", "args": [70, 10, 60, 90],
    "expected": 0.8185946141203637, "tolerance": 1e-9, "name": "Média 70 e desvio 10: entre 60 e 90",
    "hint": "O terceiro argumento da normal no scipy é o desvio, não a variância." },
  { "id": "entre-ponto", "checkpoint": 1, "kind": "call", "function": "prob_normal_entre", "args": [70, 10, 80, 80],
    "expected": 0.0, "tolerance": 1e-12, "name": "Um ponto só tem chance zero numa contínua" },
  { "id": "entre-invertido", "checkpoint": 1, "kind": "expr", "expr": "prob_normal_entre(70, 10, 90, 60)",
    "raises": "ValueError", "name": "a > b é recusado" },
  { "id": "entre-sigma-zero", "checkpoint": 1, "kind": "expr", "expr": "prob_normal_entre(70, 0, 60, 90)",
    "raises": "ValueError", "name": "sigma = 0 é recusado" },
  { "id": "q-975", "checkpoint": 2, "kind": "call", "function": "quantil_normal", "args": [0, 1, 0.975],
    "expected": 1.959963984540054, "type": "float", "tolerance": 1e-9, "name": "O quantil 0,975 da normal padrão é 1,96" },
  { "id": "q-corte", "checkpoint": 2, "kind": "call", "function": "quantil_normal", "args": [500, 100, 0.95],
    "expected": 664.4853626951472, "tolerance": 1e-6, "name": "Nota de corte dos 5 % melhores com média 500 e desvio 100",
    "hint": "Os 5 % melhores ficam acima do valor; abaixo dele ficam 95 %." },
  { "id": "q-mediana", "checkpoint": 2, "kind": "call", "function": "quantil_normal", "args": [70, 10, 0.5],
    "expected": 70.0, "tolerance": 1e-9, "name": "O quantil 0,5 é a média" },
  { "id": "q-fora", "checkpoint": 2, "kind": "expr", "expr": "quantil_normal(0, 1, 1.0)", "raises": "ValueError",
    "name": "p = 1 é recusado", "hint": "Com p = 1 o scipy devolve infinito em vez de um erro." },
  { "id": "expon-meia", "checkpoint": 3, "kind": "call", "function": "prob_exponencial_ate", "args": [2, 1],
    "expected": 0.3934693402873666, "type": "float", "tolerance": 1e-9,
    "name": "Espera média de 2 minutos: chance de esperar até 1 minuto",
    "hint": "Com média 2, a taxa é 0,5 por minuto; qual dos dois o scale recebe?" },
  { "id": "expon-zero", "checkpoint": 3, "kind": "call", "function": "prob_exponencial_ate", "args": [10, 0],
    "expected": 0.0, "tolerance": 1e-12, "name": "Esperar até 0 minuto tem chance zero" }
]
```

### Soluções erradas
```python name="não confere a > b"
from scipy import stats


def prob_normal_entre(mu, sigma, a, b):
    if sigma <= 0:
        raise ValueError("é preciso sigma > 0")
    return float(stats.norm.cdf(b, mu, sigma) - stats.norm.cdf(a, mu, sigma))


def quantil_normal(mu, sigma, p):
    if not 0 < p < 1:
        raise ValueError("p precisa estar entre 0 e 1")
    return float(stats.norm.ppf(p, mu, sigma))


def prob_exponencial_ate(media, t):
    return float(stats.expon.cdf(t, scale=media))
```
```python name="variância no lugar do desvio"
from scipy import stats


def prob_normal_entre(mu, sigma, a, b):
    if a > b or sigma <= 0:
        raise ValueError("é preciso a <= b e sigma > 0")
    return float(stats.norm.cdf(b, mu, sigma ** 2) - stats.norm.cdf(a, mu, sigma ** 2))


def quantil_normal(mu, sigma, p):
    if not 0 < p < 1:
        raise ValueError("p precisa estar entre 0 e 1")
    return float(stats.norm.ppf(p, mu, sigma))


def prob_exponencial_ate(media, t):
    return float(stats.expon.cdf(t, scale=media))
```
```python name="densidade no lugar da cdf"
from scipy import stats


def prob_normal_entre(mu, sigma, a, b):
    if a > b or sigma <= 0:
        raise ValueError("é preciso a <= b e sigma > 0")
    return float(stats.norm.pdf(b, mu, sigma) - stats.norm.pdf(a, mu, sigma))


def quantil_normal(mu, sigma, p):
    if not 0 < p < 1:
        raise ValueError("p precisa estar entre 0 e 1")
    return float(stats.norm.ppf(p, mu, sigma))


def prob_exponencial_ate(media, t):
    return float(stats.expon.cdf(t, scale=media))
```
```python name="cauda trocada no quantil"
from scipy import stats


def prob_normal_entre(mu, sigma, a, b):
    if a > b or sigma <= 0:
        raise ValueError("é preciso a <= b e sigma > 0")
    return float(stats.norm.cdf(b, mu, sigma) - stats.norm.cdf(a, mu, sigma))


def quantil_normal(mu, sigma, p):
    if not 0 < p < 1:
        raise ValueError("p precisa estar entre 0 e 1")
    return float(stats.norm.ppf(1 - p, mu, sigma))


def prob_exponencial_ate(media, t):
    return float(stats.expon.cdf(t, scale=media))
```
```python name="quantil da normal padrão"
from scipy import stats


def prob_normal_entre(mu, sigma, a, b):
    if a > b or sigma <= 0:
        raise ValueError("é preciso a <= b e sigma > 0")
    return float(stats.norm.cdf(b, mu, sigma) - stats.norm.cdf(a, mu, sigma))


def quantil_normal(mu, sigma, p):
    if not 0 < p < 1:
        raise ValueError("p precisa estar entre 0 e 1")
    return float(stats.norm.ppf(p))


def prob_exponencial_ate(media, t):
    return float(stats.expon.cdf(t, scale=media))
```
```python name="não valida p"
from scipy import stats


def prob_normal_entre(mu, sigma, a, b):
    if a > b or sigma <= 0:
        raise ValueError("é preciso a <= b e sigma > 0")
    return float(stats.norm.cdf(b, mu, sigma) - stats.norm.cdf(a, mu, sigma))


def quantil_normal(mu, sigma, p):
    return float(stats.norm.ppf(p, mu, sigma))


def prob_exponencial_ate(media, t):
    return float(stats.expon.cdf(t, scale=media))
```
```python name="taxa no lugar da média"
from scipy import stats


def prob_normal_entre(mu, sigma, a, b):
    if a > b or sigma <= 0:
        raise ValueError("é preciso a <= b e sigma > 0")
    return float(stats.norm.cdf(b, mu, sigma) - stats.norm.cdf(a, mu, sigma))


def quantil_normal(mu, sigma, p):
    if not 0 < p < 1:
        raise ValueError("p precisa estar entre 0 e 1")
    return float(stats.norm.ppf(p, mu, sigma))


def prob_exponencial_ate(media, t):
    return float(stats.expon.cdf(t, scale=1 / media))
```

## Passo 8 · Quiz · Qual distribuição

### Pergunta
Uma central de atendimento fictícia recebe em média 4 chamadas por hora, que chegam uma a uma e sem combinar entre si. Você quer a chance de chegarem 7 ou mais chamadas na próxima hora. Qual modelo e qual conta?
- [ ] Exponencial com `scale=4`, `stats.expon.sf(7, scale=4)`
- [x] Poisson com média 4, `stats.poisson.sf(6, 4)`
- [ ] Binomial com `n = 4`, `stats.binom.sf(6, 4, 0.5)`
- [ ] Normal com média 4 e desvio 4, `stats.norm.sf(7, 4, 4)`
> Contagem de eventos num intervalo, a uma taxa média, é Poisson; "7 ou mais" é $P(X > 6)$, o `sf(6)`. A exponencial descreve o tempo **entre** chamadas, não quantas chegam. A binomial precisaria de um número fixo de tentativas, e com `n = 4` nunca passaria de 4 chamadas. A normal com desvio 4 erraria até a variância (na Poisson ela é $\lambda = 4$, desvio 2) e daria chance a contagens negativas e fracionárias.

### Pergunta
Uma colega modelou o tempo de entrega de um restaurante fictício como normal, com média de 30 minutos e desvio de 15, e calculou `stats.norm.cdf(0, 30, 15)`, cerca de 0,023. O que esse número revela?
- [ ] Que 2,3 % das entregas chegam antes de o pedido ser feito, o que deve ser investigado
- [ ] Nada de especial: é a chance de uma entrega instantânea, que é rara mas possível
- [x] Que o modelo é inadequado: ele dá 2,3 % de chance a tempos negativos. Tempos de espera são positivos e costumam ser assimétricos, e uma distribuição para valores positivos (como a exponencial ou outra assimétrica) descreve melhor
- [ ] Que o desvio foi calculado com o `ddof` errado
> A normal vai de $-\infty$ a $+\infty$; com o desvio do tamanho de metade da média, uma fatia visível dela cai abaixo de zero. Isso não é um fato sobre as entregas, é um defeito do modelo. Uma entrega instantânea teria chance zero numa contínua, e o `ddof` mudaria o desvio muito pouco, sem tirar a cauda negativa.

### Pergunta
Uma máquina fictícia falha, em média, 0,2 vez por dia, e o tempo até a próxima falha é exponencial. Um colega escreveu `stats.expon.cdf(10, scale=0.2)` para a chance de a máquina falhar nos próximos 10 dias e obteve praticamente 1. Qual é a conta certa?
- [ ] A dele: a máquina quase certamente falha em 10 dias
- [ ] `stats.expon.cdf(0.2, scale=10)`
- [x] `stats.expon.cdf(10, scale=5)`, cerca de 0,865, porque o `scale` é o tempo médio entre falhas, $1/0{,}2 = 5$ dias
- [ ] `stats.poisson.cdf(10, 0.2)`
> O `scale` da exponencial é a média do tempo de espera. Com 0,2 falha por dia, a espera média é de 5 dias, e $P(T \le 10) = 1 - e^{-10/5} \approx 0{,}865$. Com `scale=0.2` ele modelou uma espera média de 0,2 dia (cerca de 5 horas), e a chance de falhar em 10 dias vira quase 1. Trocar os argumentos de lugar mede a chance em 0,2 dia; a Poisson responderia quantas falhas, não quando.
