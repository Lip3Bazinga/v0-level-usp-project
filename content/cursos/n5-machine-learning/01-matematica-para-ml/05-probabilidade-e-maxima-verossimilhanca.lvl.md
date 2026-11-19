---
slug: n5-m1-05-probabilidade-e-maxima-verossimilhanca
titulo: Probabilidade e máxima verossimilhança
descricao: Modelos probabilísticos, verossimilhança, log-verossimilhança, por que minimizar MSE é MLE gaussiana e por que a perda logística é MLE de Bernoulli.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
xp: 100
tempo_min: 40
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Escrever a verossimilhança de um modelo simples e maximizá-la numericamente
- Explicar a relação entre MSE e verossimilhança gaussiana e entre perda logística e Bernoulli
- Interpretar as saídas de um modelo como probabilidades e calibrá-las em um exemplo
---

## Passo 1 · Leitura · A moeda e a verossimilhança

As lições anteriores escolheram custos (MSE, entropia cruzada) e mostraram como minimizá-los. De onde vêm esses custos? Uma resposta unificada é a **máxima verossimilhança**: escreva um modelo probabilístico de como os dados foram gerados e escolha os parâmetros que tornam os dados observados os mais prováveis.

O exemplo mais simples é uma moeda com probabilidade $p$ de dar cara. Em $n$ lançamentos, com $y_i = 1$ para cara e $y_i = 0$ para coroa, e lançamentos independentes, a probabilidade da sequência observada, vista como função de $p$, é a **verossimilhança**:

$$
L(p) = \prod_{i=1}^{n} p^{\,y_i}\,(1 - p)^{1 - y_i}
$$

Com 7 caras em 10 lançamentos, $L(p) = p^7 (1 - p)^3$. Em $p = 0{,}5$ ela vale $0{,}5^{10} \approx 0{,}00098$; em $p = 0{,}7$, cerca de $0{,}0022$, o maior valor possível. O **estimador de máxima verossimilhança** (MLE) é o $p$ que maximiza $L$; aqui, $\hat p = 0{,}7$, a proporção de caras.

Na prática, maximiza-se o **logaritmo** de $L$, a log-verossimilhança. Como o logaritmo é crescente, o máximo fica no mesmo lugar, e o produto vira soma:

$$
\ell(p) = \sum_{i=1}^{n} \bigl[\, y_i \ln p + (1 - y_i) \ln(1 - p) \,\bigr]
$$

Derivando e igualando a zero, $\sum y_i / p = \sum (1 - y_i)/(1 - p)$, e sai $\hat p = \bar y$, a média dos dados. Repare na forma de $\ell$: é a entropia cruzada da lição anterior com o sinal trocado e sem dividir por $n$. **Maximizar a log-verossimilhança é minimizar a entropia cruzada.** Quem minimiza custos, como o gradiente descendente, trabalha com a log-verossimilhança **negativa**; quem procura o máximo numa grade usa $\ell$ e o `argmax`.

Um cuidado de interpretação: $L(0{,}7) \approx 0{,}0022$ é a probabilidade de ver **estes dados** se $p$ fosse 0,7. Não é a probabilidade de $p$ valer 0,7. A verossimilhança é uma função de $p$ que não soma 1 sobre os valores de $p$, e dizer quão provável é cada $p$ pede uma distribuição a priori, assunto da estatística bayesiana.

```python
y = np.array([1, 1, 1, 0, 0, 1, 1, 0, 1, 1])
grade = np.linspace(0.001, 0.999, 999)
ell = [np.sum(y * np.log(p) + (1 - y) * np.log(1 - p)) for p in grade]
grade[np.argmax(ell)]          # 0.7 (a média de y)
```

## Passo 2 · Previsão · O produto que vira zero

O programa calcula a verossimilhança de 2 000 observações, cada uma com probabilidade 0,3 sob o modelo, de dois jeitos: multiplicando as probabilidades e somando os logaritmos. Leia sem executar e digite o que ele imprime.

### Código
```python
import numpy as np

p = np.full(2000, 0.3)
print(np.prod(p))
print(np.log(np.prod(p)))
print(round(float(np.sum(np.log(p))), 3))
print(bool(np.prod(p[:100]) > 0))
print(round(float(np.log(np.prod(p[:100]))), 3), round(float(np.sum(np.log(p[:100]))), 3))
```

### Dicas
1. $0{,}3^{2000} \approx 10^{-1046}$, e o menor `float` positivo é perto de $5 \times 10^{-324}$: abaixo disso, o resultado vira zero (*underflow*).
2. `np.log(0.0)` é `-inf` no numpy, sem erro.
3. $\ln 0{,}3 \approx -1{,}2039728$; multiplique por 2 000 e por 100. Já $0{,}3^{100} \approx 5 \times 10^{-53}$ ainda cabe num `float`.

### Saída esperada
```text
0.0
-inf
-2407.946
True
-120.397 -120.397
```

## Passo 3 · Exercício · Log-verossimilhança da moeda
modo: lacunas

A Previsão mostrou por que se trabalha com logaritmos: o produto de 2 000 probabilidades vira `0.0`, e com ele todos os valores de $p$ parecem igualmente ruins; a soma dos logaritmos guarda a informação inteira. Complete as lacunas (`___`) da log-verossimilhança da moeda e do estimador por busca numa grade.

### Instruções
1. `log_verossimilhanca_bernoulli(p, dados)` devolve $\ell(p) = \sum_i [\,y_i \ln p + (1 - y_i)\ln(1 - p)\,]$ para os `dados` (zeros e uns), como `float`, com $0 < p < 1$.
2. `mle_moeda(dados)` calcula $\ell$ em cada ponto da grade de 0,001 a 0,999 (passo 0,001) e devolve, como `float`, o ponto da grade com a **maior** log-verossimilhança.

### Código inicial
```python
import numpy as np


def log_verossimilhanca_bernoulli(p, dados):
    y = np.asarray(dados, dtype=float)
    return float(np.___(y * np.log(___) + (1 - y) * np.log(___)))


def mle_moeda(dados):
    grade = np.linspace(0.001, 0.999, 999)
    valores = [log_verossimilhanca_bernoulli(p, dados) for p in grade]
    return float(grade[np.___(valores)])
```

### Solução
```python
import numpy as np


def log_verossimilhanca_bernoulli(p, dados):
    y = np.asarray(dados, dtype=float)
    return float(np.sum(y * np.log(p) + (1 - y) * np.log(1 - p)))


def mle_moeda(dados):
    grade = np.linspace(0.001, 0.999, 999)
    valores = [log_verossimilhanca_bernoulli(p, dados) for p in grade]
    return float(grade[np.argmax(valores)])
```

### Dicas
1. O logaritmo transforma o produto em **soma**, não em média.
2. Uma cara contribui com $\ln p$ e uma coroa, com $\ln(1 - p)$.
3. O estimador é a **posição** do maior valor da lista, usada para ler a grade.

### Verificação
```json
[
  { "id": "ll-meio", "checkpoint": 1, "kind": "call", "function": "log_verossimilhanca_bernoulli", "args": [0.5, [1, 0, 1, 1]],
    "expected": -2.772588722239781, "type": "float", "tolerance": 1e-12, "name": "ℓ(0.5) com 4 lançamentos é 4 ln 0.5" },
  { "id": "ll-07", "checkpoint": 1, "kind": "call", "function": "log_verossimilhanca_bernoulli", "args": [0.7, [1, 1, 1, 0, 0]],
    "expected": -3.4779704404680693, "type": "float", "tolerance": 1e-9, "name": "ℓ(0.7) com 3 caras e 2 coroas",
    "hint": "Cada cara entra com ln p e cada coroa com ln(1 − p)." },
  { "id": "ll-coroas", "checkpoint": 1, "kind": "call", "function": "log_verossimilhanca_bernoulli", "args": [0.2, [0, 0, 0]],
    "expected": -0.6694306539426292, "type": "float", "tolerance": 1e-12, "name": "ℓ(0.2) com três coroas é 3 ln 0.8" },
  { "id": "ll-soma", "checkpoint": 1, "kind": "call", "function": "log_verossimilhanca_bernoulli", "args": [0.3, [1, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
    "expected": -4.414047299774528, "type": "float", "tolerance": 1e-9, "name": "ℓ(0.3) com 1 cara em 10: soma das 10 parcelas",
    "hint": "A log-verossimilhança soma as parcelas; não é uma média." },
  { "id": "mle-sete", "checkpoint": 2, "kind": "call", "function": "mle_moeda", "args": [[1, 1, 1, 0, 0, 1, 1, 0, 1, 1]],
    "expected": 0.7, "type": "float", "tolerance": 1e-9, "name": "7 caras em 10: o estimador é 0.7",
    "hint": "Procure o MAIOR valor da log-verossimilhança." },
  { "id": "mle-quarto", "checkpoint": 2, "kind": "call", "function": "mle_moeda", "args": [[0, 0, 0, 1]],
    "expected": 0.25, "type": "float", "tolerance": 1e-9, "name": "1 cara em 4: o estimador é 0.25" },
  { "id": "mle-media", "checkpoint": 2, "kind": "expr",
    "setup": "import numpy as np\nd = (np.random.default_rng(3).random(200) < 0.35).astype(int)",
    "expr": "bool(abs(mle_moeda(d) - d.mean()) < 1e-9)", "expected": true,
    "name": "Em 200 lançamentos sorteados, o estimador é a proporção de caras" }
]
```

### Soluções erradas
```python name="argmin: minimiza a log-verossimilhança"
import numpy as np


def log_verossimilhanca_bernoulli(p, dados):
    y = np.asarray(dados, dtype=float)
    return float(np.sum(y * np.log(p) + (1 - y) * np.log(1 - p)))


def mle_moeda(dados):
    grade = np.linspace(0.001, 0.999, 999)
    valores = [log_verossimilhanca_bernoulli(p, dados) for p in grade]
    return float(grade[np.argmin(valores)])
```
```python name="logaritmos trocados"
import numpy as np


def log_verossimilhanca_bernoulli(p, dados):
    y = np.asarray(dados, dtype=float)
    return float(np.sum(y * np.log(1 - p) + (1 - y) * np.log(p)))


def mle_moeda(dados):
    grade = np.linspace(0.001, 0.999, 999)
    valores = [log_verossimilhanca_bernoulli(p, dados) for p in grade]
    return float(grade[np.argmax(valores)])
```
```python name="ln p também para as coroas"
import numpy as np


def log_verossimilhanca_bernoulli(p, dados):
    y = np.asarray(dados, dtype=float)
    return float(np.sum(y * np.log(p) + (1 - y) * np.log(p)))


def mle_moeda(dados):
    grade = np.linspace(0.001, 0.999, 999)
    valores = [log_verossimilhanca_bernoulli(p, dados) for p in grade]
    return float(grade[np.argmax(valores)])
```
```python name="média no lugar da soma"
import numpy as np


def log_verossimilhanca_bernoulli(p, dados):
    y = np.asarray(dados, dtype=float)
    return float(np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)))


def mle_moeda(dados):
    grade = np.linspace(0.001, 0.999, 999)
    valores = [log_verossimilhanca_bernoulli(p, dados) for p in grade]
    return float(grade[np.argmax(valores)])
```
```python name="produto no lugar da soma"
import numpy as np


def log_verossimilhanca_bernoulli(p, dados):
    y = np.asarray(dados, dtype=float)
    return float(np.prod(y * np.log(p) + (1 - y) * np.log(1 - p)))


def mle_moeda(dados):
    grade = np.linspace(0.001, 0.999, 999)
    valores = [log_verossimilhanca_bernoulli(p, dados) for p in grade]
    return float(grade[np.argmax(valores)])
```
```python name="max no lugar de argmax"
import numpy as np


def log_verossimilhanca_bernoulli(p, dados):
    y = np.asarray(dados, dtype=float)
    return float(np.sum(y * np.log(p) + (1 - y) * np.log(1 - p)))


def mle_moeda(dados):
    grade = np.linspace(0.001, 0.999, 999)
    valores = [log_verossimilhanca_bernoulli(p, dados) for p in grade]
    return float(grade[np.max(valores)])
```

## Passo 4 · Leitura · Gaussiana dá MSE, Bernoulli dá entropia cruzada

A mesma receita explica os dois custos do nível. Na **regressão**, suponha que cada valor observado seja a previsão do modelo mais um ruído normal: $y_i = \hat y_i + \varepsilon_i$, com $\varepsilon_i \sim N(0, \sigma^2)$ independentes. A densidade normal dá a log-verossimilhança

$$
\ell = -\frac{n}{2} \ln(2\pi\sigma^2) - \frac{1}{2\sigma^2} \sum_{i=1}^{n} (y_i - \hat y_i)^2
$$

Os pesos só aparecem na soma dos quadrados, com sinal negativo: maximizar $\ell$ nos pesos é **minimizar o MSE**, o custo certo quando o ruído é normal. Com ruído de caudas pesadas (outliers frequentes), o modelo de Laplace leva ao MAE pelo mesmo caminho.

O mesmo $\ell$ também estima o próprio $\sigma^2$. Para uma amostra $x_1, \dots, x_n$ com média e variância desconhecidas, a máxima verossimilhança dá

$$
\hat\mu = \frac{1}{n} \sum_{i=1}^{n} x_i \qquad \hat\sigma^2 = \frac{1}{n} \sum_{i=1}^{n} (x_i - \hat\mu)^2
$$

com divisor $n$: é o `np.var` padrão (`ddof=0`), e não o `ddof=1` da variância amostral sem viés do Nível 4. Os dois diferem por um fator $n / (n - 1)$, que pesa em amostras pequenas; com um único valor, o MLE da variância é 0, e o `ddof=1` divide por zero e dá `nan`.

Na **classificação**, o modelo diz que $y_i$ é Bernoulli com $p_i = \sigma(z_i)$. A log-verossimilhança negativa é a soma das perdas logísticas, e minimizar a entropia cruzada é a máxima verossimilhança. Como $p_i$ vem de uma sigmoide, dá para escrever a perda direto com o **logito** $z$, sem calcular $p$:

$$
-\bigl[\,y \ln \sigma(z) + (1 - y) \ln(1 - \sigma(z))\,\bigr] = \ln\bigl(1 + e^{z}\bigr) - y\,z
$$

Essa forma é a estável. Calcular $\sigma(z)$ e depois o logaritmo quebra quando $z$ é grande: $\sigma(40)$ já é exatamente `1.0` em ponto flutuante, e $\ln(1 - 1) = -\infty$. Escrever $\ln(1 + e^z)$ com `np.log(1 + np.exp(z))` quebra em $z = 1000$, porque `np.exp(1000)` é `inf`. O numpy tem a conta estável pronta: `np.logaddexp(0, z)` calcula $\ln(e^0 + e^z)$ sem estourar.

Por fim, uma frase sobre o que vem depois: acrescentar uma distribuição a priori normal para os pesos e maximizar a probabilidade a posteriori (MAP) acrescenta ao custo um termo $\lambda \lVert w \rVert^2$. É a regularização **ridge** do módulo 2.

## Passo 5 · Exercício · MLE gaussiana e entropia cruzada estável

Escreva o estimador de máxima verossimilhança da normal e a entropia cruzada média calculada a partir dos logitos.

### Instruções
1. `mle_gaussiana(dados)` devolve a tupla `(media, variancia)` dos estimadores de máxima verossimilhança, como `float` do Python.
2. Com `dados` vazio, `mle_gaussiana` levanta `ValueError`.
3. `entropia_cruzada_logitos(y, z)` recebe os rótulos `y` (0 ou 1) e os logitos `z` e devolve, como `float`, a média de $\ln(1 + e^{z_i}) - y_i z_i$, sem `nan` nem `inf` para $|z|$ grande.

### Código inicial
```python
import numpy as np


def mle_gaussiana(dados):
    pass


def entropia_cruzada_logitos(y, z):
    pass
```

### Solução
```python
import numpy as np


def mle_gaussiana(dados):
    x = np.asarray(dados, dtype=float)
    if x.size == 0:
        raise ValueError("sem dados")
    media = x.mean()
    return float(media), float(np.mean((x - media) ** 2))


def entropia_cruzada_logitos(y, z):
    y = np.asarray(y, dtype=float)
    z = np.asarray(z, dtype=float)
    return float(np.mean(np.logaddexp(0.0, z) - y * z))
```

### Dicas
1. A variância de máxima verossimilhança divide por $n$.
2. A média de um array vazio não levanta erro no numpy (dá `nan`): confira o tamanho antes.
3. `np.logaddexp(0, z)` é $\ln(1 + e^z)$ sem estourar.

### Verificação
```json
[
  { "id": "gauss-valores", "checkpoint": 1, "kind": "call", "function": "mle_gaussiana", "args": [[2, 4, 4, 4, 5, 5, 7, 9]],
    "expected": [5.0, 4.0], "type": "tuple", "tolerance": 1e-12, "name": "Média 5 e variância 4 (divisor n)",
    "hint": "A variância de máxima verossimilhança divide por n, não por n − 1." },
  { "id": "gauss-um", "checkpoint": 1, "kind": "call", "function": "mle_gaussiana", "args": [[3.0]],
    "expected": [3.0, 0.0], "type": "tuple", "tolerance": 1e-12, "name": "Um único valor: variância 0, sem nan" },
  { "id": "gauss-maximo", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np\nx = np.array([2.0, 4.0, 4.0, 4.0, 5.0, 5.0, 7.0, 9.0])\ndef ll(m, v):\n    return -0.5 * len(x) * np.log(2 * np.pi * v) - np.sum((x - m) ** 2) / (2 * v)\nm, v = mle_gaussiana(x)",
    "expr": "bool(ll(m, v) >= max(ll(m, v * 1.01), ll(m, v * 0.99), ll(m + 0.01, v), ll(m - 0.01, v)))", "expected": true,
    "name": "Mexer na média ou na variância devolvidas só diminui a log-verossimilhança" },
  { "id": "gauss-tipos", "checkpoint": 1, "kind": "expr", "setup": "r = mle_gaussiana([1.0, 2.0, 6.0])",
    "expr": "[type(r).__name__, type(r[0]).__name__, type(r[1]).__name__]", "expected": ["tuple", "float", "float"],
    "name": "Devolve uma tupla de dois float do Python" },
  { "id": "gauss-vazio", "checkpoint": 2, "kind": "expr", "expr": "mle_gaussiana([])", "raises": "ValueError",
    "name": "Sem dados, levanta ValueError" },
  { "id": "ec-zero", "checkpoint": 3, "kind": "call", "function": "entropia_cruzada_logitos", "args": [[1, 0], [0.0, 0.0]],
    "expected": 0.6931471805599453, "type": "float", "tolerance": 1e-12, "name": "Logitos zero (p = 0.5): perda ln 2" },
  { "id": "ec-valor", "checkpoint": 3, "kind": "call", "function": "entropia_cruzada_logitos", "args": [[1, 0, 1], [2.0, -1.0, 0.5]],
    "expected": 0.3047555609137674, "type": "float", "tolerance": 1e-12, "name": "Três exemplos com logitos 2, −1 e 0.5",
    "hint": "É a média de ln(1 + e^z) − y·z." },
  { "id": "ec-40", "checkpoint": 3, "kind": "call", "function": "entropia_cruzada_logitos", "args": [[1, 0], [40.0, -40.0]],
    "expected": 0.0, "type": "float", "tolerance": 1e-12, "name": "Acertos confiantes (z = ±40): perda perto de zero, sem nan",
    "hint": "σ(40) já é 1.0 em ponto flutuante: não passe pela probabilidade." },
  { "id": "ec-1000-acerto", "checkpoint": 3, "kind": "call", "function": "entropia_cruzada_logitos", "args": [[1, 0], [1000.0, -1000.0]],
    "expected": 0.0, "type": "float", "tolerance": 1e-12, "name": "z = ±1000 com acerto: perda zero, sem inf",
    "hint": "np.exp(1000) é inf; use np.logaddexp." },
  { "id": "ec-1000-erro", "checkpoint": 3, "kind": "call", "function": "entropia_cruzada_logitos", "args": [[1], [-1000.0]],
    "expected": 1000.0, "type": "float", "tolerance": 1e-9, "name": "Erro confiante com z = −1000: perda 1000, sem inf" },
  { "id": "ec-confere", "checkpoint": 3, "kind": "expr",
    "setup": "import numpy as np\nrng = np.random.default_rng(12)\nz = rng.uniform(-5, 5, 40)\ny = (rng.random(40) < 0.5).astype(float)\np = 1 / (1 + np.exp(-z))\nref = -np.mean(y * np.log(p) + (1 - y) * np.log(1 - p))",
    "expr": "bool(abs(entropia_cruzada_logitos(y, z) - ref) < 1e-9)", "expected": true,
    "name": "Com logitos moderados, bate com a entropia cruzada pelas probabilidades",
    "hint": "Confira o sinal de y·z e se é média, não soma." }
]
```

### Soluções erradas
```python name="variância com ddof=1"
import numpy as np


def mle_gaussiana(dados):
    x = np.asarray(dados, dtype=float)
    if x.size == 0:
        raise ValueError("sem dados")
    return float(x.mean()), float(x.var(ddof=1))


def entropia_cruzada_logitos(y, z):
    y = np.asarray(y, dtype=float)
    z = np.asarray(z, dtype=float)
    return float(np.mean(np.logaddexp(0.0, z) - y * z))
```
```python name="desvio no lugar da variância"
import numpy as np


def mle_gaussiana(dados):
    x = np.asarray(dados, dtype=float)
    if x.size == 0:
        raise ValueError("sem dados")
    return float(x.mean()), float(x.std())


def entropia_cruzada_logitos(y, z):
    y = np.asarray(y, dtype=float)
    z = np.asarray(z, dtype=float)
    return float(np.mean(np.logaddexp(0.0, z) - y * z))
```
```python name="não recusa dados vazios"
import numpy as np


def mle_gaussiana(dados):
    x = np.asarray(dados, dtype=float)
    media = x.mean()
    return float(media), float(np.mean((x - media) ** 2))


def entropia_cruzada_logitos(y, z):
    y = np.asarray(y, dtype=float)
    z = np.asarray(z, dtype=float)
    return float(np.mean(np.logaddexp(0.0, z) - y * z))
```
```python name="passa pela probabilidade sem corte"
import numpy as np


def mle_gaussiana(dados):
    x = np.asarray(dados, dtype=float)
    if x.size == 0:
        raise ValueError("sem dados")
    media = x.mean()
    return float(media), float(np.mean((x - media) ** 2))


def entropia_cruzada_logitos(y, z):
    y = np.asarray(y, dtype=float)
    p = 1 / (1 + np.exp(-np.asarray(z, dtype=float)))
    return float(-np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)))
```
```python name="log(1 + exp(z)) direto"
import numpy as np


def mle_gaussiana(dados):
    x = np.asarray(dados, dtype=float)
    if x.size == 0:
        raise ValueError("sem dados")
    media = x.mean()
    return float(media), float(np.mean((x - media) ** 2))


def entropia_cruzada_logitos(y, z):
    y = np.asarray(y, dtype=float)
    z = np.asarray(z, dtype=float)
    return float(np.mean(np.log(1 + np.exp(z)) - y * z))
```
```python name="+ y·z: sinal trocado"
import numpy as np


def mle_gaussiana(dados):
    x = np.asarray(dados, dtype=float)
    if x.size == 0:
        raise ValueError("sem dados")
    media = x.mean()
    return float(media), float(np.mean((x - media) ** 2))


def entropia_cruzada_logitos(y, z):
    y = np.asarray(y, dtype=float)
    z = np.asarray(z, dtype=float)
    return float(np.mean(np.logaddexp(0.0, z) + y * z))
```
```python name="soma no lugar da média"
import numpy as np


def mle_gaussiana(dados):
    x = np.asarray(dados, dtype=float)
    if x.size == 0:
        raise ValueError("sem dados")
    media = x.mean()
    return float(media), float(np.mean((x - media) ** 2))


def entropia_cruzada_logitos(y, z):
    y = np.asarray(y, dtype=float)
    z = np.asarray(z, dtype=float)
    return float(np.sum(np.logaddexp(0.0, z) - y * z))
```

## Passo 6 · Leitura · Probabilidade prevista e calibração

Um filtro fictício de mensagens diz que uma mensagem é golpe com probabilidade 0,8. O que esse número promete? Uma mensagem só é golpe ou não é, então a promessa só pode ser checada em grupo: entre todas as mensagens que receberam algo perto de 0,8, cerca de 80 % devem ser golpe. Um modelo que cumpre isso em todas as faixas é **calibrado**.

Calibração e acerto são coisas diferentes. Um modelo pode separar bem as classes e mesmo assim ser **confiante demais**: dizer 0,95 para um grupo em que só 70 % são golpe. Isso importa quando a probabilidade vira decisão, como um limiar de bloqueio ou uma fila de revisão manual. A máxima verossimilhança tende a produzir modelos razoavelmente calibrados no treino, mas um modelo sobreajustado (módulo 7) costuma ser confiante demais nos dados novos.

O **diagrama de calibração** checa a promessa. Divida o intervalo $[0, 1]$ em $b$ faixas de mesma largura; a faixa de uma probabilidade $p$ é $\lfloor p \cdot b \rfloor$, e $p = 1$, que cairia numa faixa $b$ inexistente, entra na última. Em cada faixa com pelo menos um exemplo, compare:

$$
\bar p_k = \text{média das probabilidades previstas} \qquad f_k = \text{fração de positivos} = \frac{1}{n_k} \sum_{i \in k} y_i
$$

Num modelo calibrado, $f_k \approx \bar p_k$ em todas as faixas, e o gráfico de $f_k$ contra $\bar p_k$ fica perto da diagonal. Faixas vazias não têm média e ficam de fora (incluí-las põe `nan` na tabela). A contagem $n_k$ diz quanto confiar em cada ponto: uma faixa com 3 exemplos varia muito por acaso.

No executor, 2 000 probabilidades sorteadas com `default_rng(11)` e rótulos sorteados **com** essas probabilidades (um modelo calibrado por construção) dão, em 5 faixas:

```text
faixa         prevista  frequência  contagem
[0,0; 0,2)    0,099     0,098       407
[0,2; 0,4)    0,300     0,276       421
[0,4; 0,6)    0,500     0,523       398
[0,6; 0,8)    0,700     0,705       403
[0,8; 1,0]    0,898     0,914       371
```

As diferenças, de até 0,024, são o ruído de ~400 exemplos por faixa (o erro padrão de uma proporção perto de 0,5 é $\sqrt{0{,}25/400} = 0{,}025$). Um modelo confiante demais mostraria frequências sistematicamente mais perto de 0,5 que as previsões. A borda de cada faixa também conta: com `np.round(p * b)` em vez de `np.floor`, as faixas ficam deslocadas meia largura, e 0,1 e 0,4 caem em faixas diferentes quando $b = 2$.

## Passo 7 · Exercício · Curva de calibração

Escreva a tabela do diagrama de calibração.

### Instruções
1. `curva_de_calibracao(y, p, bins)` recebe os rótulos `y` (0 ou 1), as probabilidades previstas `p` e o número de faixas `bins`.
2. A faixa de cada probabilidade é $\lfloor p \cdot \text{bins} \rfloor$; uma probabilidade igual a 1 vai para a última faixa (`bins - 1`).
3. Devolve uma lista com uma tupla `(media_prevista, frequencia, contagem)` por faixa **não vazia**, em ordem crescente de faixa: a média das probabilidades da faixa (`float`), a fração de rótulos 1 da faixa (`float`) e o número de exemplos da faixa (`int`).

### Código inicial
```python
import numpy as np


def curva_de_calibracao(y, p, bins):
    pass
```

### Solução
```python
import numpy as np


def curva_de_calibracao(y, p, bins):
    y = np.asarray(y, dtype=float)
    p = np.asarray(p, dtype=float)
    faixa = np.minimum(np.floor(p * bins).astype(int), bins - 1)
    curva = []
    for k in range(bins):
        dentro = faixa == k
        n = int(dentro.sum())
        if n > 0:
            curva.append((float(p[dentro].mean()), float(y[dentro].mean()), n))
    return curva
```

### Dicas
1. Calcule a faixa de todas as probabilidades de uma vez; `np.minimum` resolve o caso $p = 1$.
2. Uma máscara `faixa == k` separa os exemplos de uma faixa; a média de `y` nela é a fração de positivos.
3. `int(...)` e `float(...)` convertem os números do numpy para os do Python.

### Verificação
```json
[
  { "id": "duas-faixas", "checkpoint": 3, "kind": "call", "function": "curva_de_calibracao", "args": [[0, 0, 1, 1], [0.1, 0.2, 0.7, 0.9], 2],
    "expected": [[0.15, 0.0, 2], [0.8, 1.0, 2]], "type": "list", "tolerance": 1e-9,
    "name": "Duas faixas com dois exemplos cada", "hint": "Cada tupla é (média das probabilidades, fração de positivos, contagem)." },
  { "id": "p-igual-a-1", "checkpoint": 2, "kind": "call", "function": "curva_de_calibracao", "args": [[1, 1, 0], [1.0, 0.95, 0.55], 2],
    "expected": [[0.8333333333333334, 0.6666666666666666, 3]], "type": "list", "tolerance": 1e-9,
    "name": "p = 1.0 entra na última faixa", "hint": "⌊1.0 · bins⌋ é bins, uma faixa que não existe." },
  { "id": "faixas-vazias", "checkpoint": 3, "kind": "call", "function": "curva_de_calibracao", "args": [[0, 1, 1], [0.05, 0.9, 0.95], 5],
    "expected": [[0.05, 0.0, 1], [0.925, 1.0, 2]], "type": "list", "tolerance": 1e-9,
    "name": "Com 5 faixas, só as não vazias aparecem", "hint": "Faixa vazia não tem média: pule." },
  { "id": "floor", "checkpoint": 2, "kind": "call", "function": "curva_de_calibracao", "args": [[0, 1], [0.1, 0.4], 2],
    "expected": [[0.25, 0.5, 2]], "type": "list", "tolerance": 1e-9,
    "name": "0.1 e 0.4 caem na mesma faixa [0, 0.5)", "hint": "A faixa é o piso de p · bins, não o arredondamento." },
  { "id": "borda", "checkpoint": 2, "kind": "call", "function": "curva_de_calibracao", "args": [[0, 1], [0.4999, 0.5], 2],
    "expected": [[0.4999, 0.0, 1], [0.5, 1.0, 1]], "type": "list", "tolerance": 1e-9,
    "name": "p = 0.5 começa a segunda faixa", "hint": "As faixas incluem o limite de baixo." },
  { "id": "quatro-faixas", "checkpoint": 1, "kind": "call", "function": "curva_de_calibracao", "args": [[0, 1, 1, 0, 1], [0.1, 0.3, 0.35, 0.6, 0.8], 4],
    "expected": [[0.1, 0.0, 1], [0.32499999999999996, 1.0, 2], [0.6, 0.0, 1], [0.8, 1.0, 1]], "type": "list", "tolerance": 1e-9,
    "name": "Com 4 faixas, cada uma tem largura 0.25", "hint": "Use o número de faixas recebido." },
  { "id": "tipos", "checkpoint": 3, "kind": "expr", "setup": "r = curva_de_calibracao([1, 0], [0.9, 0.2], 2)",
    "expr": "[type(r).__name__, type(r[0]).__name__] + [type(v).__name__ for v in r[0]]", "expected": ["list", "tuple", "float", "float", "int"],
    "name": "Lista de tuplas (float, float, int)", "hint": "A soma de uma máscara é um inteiro do numpy; converta." },
  { "id": "calibrado", "checkpoint": 3, "kind": "expr",
    "setup": "import numpy as np\nrng = np.random.default_rng(11)\npp = rng.random(2000)\nyy = (rng.random(2000) < pp).astype(int)\nr = curva_de_calibracao(yy, pp, 5)",
    "expr": "[len(r), sum(t[2] for t in r), all(abs(t[0] - t[1]) < 0.1 for t in r)]", "expected": [5, 2000, true],
    "name": "Num modelo calibrado por construção, 5 faixas, 2000 exemplos e frequência perto da previsão" }
]
```

### Soluções erradas
```python name="p = 1.0 fica de fora"
import numpy as np


def curva_de_calibracao(y, p, bins):
    y = np.asarray(y, dtype=float)
    p = np.asarray(p, dtype=float)
    faixa = np.floor(p * bins).astype(int)
    curva = []
    for k in range(bins):
        dentro = faixa == k
        n = int(dentro.sum())
        if n > 0:
            curva.append((float(p[dentro].mean()), float(y[dentro].mean()), n))
    return curva
```
```python name="inclui as faixas vazias"
import numpy as np


def curva_de_calibracao(y, p, bins):
    y = np.asarray(y, dtype=float)
    p = np.asarray(p, dtype=float)
    faixa = np.minimum(np.floor(p * bins).astype(int), bins - 1)
    curva = []
    for k in range(bins):
        dentro = faixa == k
        n = int(dentro.sum())
        curva.append((float(np.mean(p[dentro])), float(np.mean(y[dentro])), n))
    return curva
```
```python name="arredonda em vez de piso"
import numpy as np


def curva_de_calibracao(y, p, bins):
    y = np.asarray(y, dtype=float)
    p = np.asarray(p, dtype=float)
    faixa = np.minimum(np.round(p * bins).astype(int), bins - 1)
    curva = []
    for k in range(bins):
        dentro = faixa == k
        n = int(dentro.sum())
        if n > 0:
            curva.append((float(p[dentro].mean()), float(y[dentro].mean()), n))
    return curva
```
```python name="faixas fechadas à direita"
import numpy as np


def curva_de_calibracao(y, p, bins):
    y = np.asarray(y, dtype=float)
    p = np.asarray(p, dtype=float)
    faixa = np.maximum(np.ceil(p * bins).astype(int) - 1, 0)
    curva = []
    for k in range(bins):
        dentro = faixa == k
        n = int(dentro.sum())
        if n > 0:
            curva.append((float(p[dentro].mean()), float(y[dentro].mean()), n))
    return curva
```
```python name="média e frequência trocadas"
import numpy as np


def curva_de_calibracao(y, p, bins):
    y = np.asarray(y, dtype=float)
    p = np.asarray(p, dtype=float)
    faixa = np.minimum(np.floor(p * bins).astype(int), bins - 1)
    curva = []
    for k in range(bins):
        dentro = faixa == k
        n = int(dentro.sum())
        if n > 0:
            curva.append((float(y[dentro].mean()), float(p[dentro].mean()), n))
    return curva
```
```python name="sempre 10 faixas"
import numpy as np


def curva_de_calibracao(y, p, bins):
    y = np.asarray(y, dtype=float)
    p = np.asarray(p, dtype=float)
    faixa = np.minimum(np.floor(p * 10).astype(int), 9)
    curva = []
    for k in range(10):
        dentro = faixa == k
        n = int(dentro.sum())
        if n > 0:
            curva.append((float(p[dentro].mean()), float(y[dentro].mean()), n))
    return curva
```
```python name="contagem como inteiro do numpy"
import numpy as np


def curva_de_calibracao(y, p, bins):
    y = np.asarray(y, dtype=float)
    p = np.asarray(p, dtype=float)
    faixa = np.minimum(np.floor(p * bins).astype(int), bins - 1)
    curva = []
    for k in range(bins):
        dentro = faixa == k
        n = dentro.sum()
        if n > 0:
            curva.append((float(p[dentro].mean()), float(y[dentro].mean()), n))
    return curva
```

## Passo 8 · Quiz · Verossimilhança

### Pergunta
Para escolher a taxa $p$ de um modelo de Bernoulli, um colega calcula `np.prod(...)` das probabilidades de 5 000 transações fictícias para 99 valores de $p$. Todos os resultados saem `0.0`, e ele conclui que nenhum $p$ explica os dados. O que aconteceu?
- [ ] Os dados não seguem uma Bernoulli, e por isso a verossimilhança é zero
- [x] O produto de milhares de números menores que 1 fica abaixo do menor `float` positivo e vira `0.0`; somando os logaritmos, os 99 valores ficam comparáveis
- [ ] Faltou dividir o produto por 5 000
- [ ] O `np.prod` só funciona com inteiros
> É *underflow*: com 5 000 fatores em torno de 0,5, o produto é da ordem de $10^{-1500}$, muito abaixo dos $\sim 5 \times 10^{-324}$ representáveis. A soma dos logaritmos fica em torno de $-3\,466$, um número comum. Dividir o produto por $n$ não muda nada (zero dividido continua zero), e o `np.prod` funciona com qualquer número.

### Pergunta
Numa moeda com 7 caras em 10 lançamentos, $L(0{,}7) = 0{,}7^7 \cdot 0{,}3^3 \approx 0{,}0022$. Um colega escreve no relatório: "há 0,22 % de chance de a moeda ter $p = 0{,}7$". O que está errado?
- [ ] Nada: a verossimilhança é a probabilidade do parâmetro
- [ ] A conta: o certo seria $\binom{10}{7}\, 0{,}7^7\, 0{,}3^3 \approx 0{,}27$, que é a chance de $p = 0{,}7$
- [x] $L(0{,}7)$ é a probabilidade de ver **essa sequência** de dados se $p$ fosse 0,7; não é uma probabilidade sobre os valores de $p$, que nem somam 1
- [ ] O certo é usar a log-verossimilhança, $\ln 0{,}0022 \approx -6{,}1$, que é a chance correta
> A verossimilhança olha os dados como fixos e varia o parâmetro, mas continua sendo a probabilidade dos **dados**. Multiplicar pelo $\binom{10}{7}$ dá a chance de "7 caras em qualquer ordem", que também é sobre os dados. O logaritmo só muda a escala. Falar da probabilidade de $p$ exige uma distribuição a priori (estatística bayesiana).

### Pergunta
O diagrama de calibração de um filtro fictício de golpes mostra, para as mensagens com probabilidade prevista na faixa $[0{,}9;\ 1{,}0]$ (média 0,95), que só 70 % eram golpe de fato, numa faixa com 1 200 mensagens. Nas outras faixas acontece o mesmo: as frequências ficam abaixo das previsões altas e acima das baixas. O que isso indica?
- [ ] O filtro é perfeito: ele acertou o lado na maioria das mensagens
- [x] O filtro é confiante demais: as probabilidades estão mais perto de 0 e de 1 do que a frequência real justifica, e não devem ser usadas como estão para decisões que dependem do valor
- [ ] A faixa tem poucos exemplos, e a diferença de 0,25 é ruído
- [ ] O filtro é confiante de menos: as probabilidades deveriam ser ainda mais altas
> Com 1 200 mensagens, o erro padrão de uma proporção perto de 0,7 é cerca de 0,013; uma diferença de 0,25 não é ruído. Acertar o lado não garante calibração: as previsões altas prometem 95 % e entregam 70 %, e as baixas prometem menos do que entregam. É o padrão do excesso de confiança, comum em modelos sobreajustados; recalibrar ou regularizar são as saídas.
