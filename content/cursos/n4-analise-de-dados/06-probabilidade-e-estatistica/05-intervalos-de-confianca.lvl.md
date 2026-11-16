---
slug: n4-m6-05-intervalos-de-confianca
titulo: Intervalos de confiança
descricao: IC para média (z e t) e para proporção, interpretação correta, largura em função de n e de confiança, e bootstrap.
dificuldade: intermediario
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- pandas
- scipy
xp: 110
tempo_min: 45
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Calcular IC para média (t de Student) e para proporção com scipy
- Interpretar corretamente 'IC de 95 %' e refutar interpretações erradas
- Construir IC por bootstrap e comparar com o paramétrico
---

## Passo 1 · Leitura · O que 95 % quer dizer

Uma loja fictícia mediu o tempo de atendimento de 10 clientes e obteve média de 13,7 minutos. A média da loja inteira, $\mu$, não é 13,7: é algum número perto disso. A lição anterior disse quanto a média amostral costuma errar, $\sigma/\sqrt n$. O **intervalo de confiança** transforma essa ideia numa faixa: a estimativa mais ou menos uma margem.

Quando $\sigma$ é desconhecido (quase sempre), ele é estimado pelo desvio amostral $s$, e essa estimativa também varia. Para compensar, a margem usa o quantil da distribuição $t$ de Student com $n - 1$ graus de liberdade, que tem caudas mais pesadas que a normal:

$$
\bar x \pm t_{n-1,\ 1-\alpha/2}\ \frac{s}{\sqrt n}
$$

Para 95 %, $\alpha = 0{,}05$ e o quantil é o de $0{,}975$: o intervalo deixa 2,5 % de cada lado. Com $n = 10$, $t_{9;\,0{,}975} \approx 2{,}26$; com $n = 30$, 2,05; com $n$ muito grande, ele se aproxima do 1,96 da normal.

O que "95 %" quer dizer é a parte delicada. O parâmetro $\mu$ é fixo; quem varia é o intervalo, que muda a cada amostra. A confiança é uma propriedade do **procedimento**: se você repetir a coleta muitas vezes e calcular um intervalo em cada uma, cerca de 95 % deles vão conter $\mu$. A simulação abaixo faz isso com 1 000 amostras de 10 valores de uma população com $\mu = 50$:

```python
rng = np.random.default_rng(11)
amostras = rng.normal(50, 10, size=(1000, 10))
medias = amostras.mean(axis=1)
ep = amostras.std(axis=1, ddof=1) / np.sqrt(10)
t = stats.t.ppf(0.975, df=9)                    # 2.262
cobre = np.abs(medias - 50) <= t * ep
cobre.sum()                                      # 938 dos 1 000 intervalos
(np.abs(medias - 50) <= 1.96 * ep).sum()         # 912 com o 1,96 da normal
```

Foram 938 intervalos com $t$, perto dos 950 esperados (a própria contagem tem erro de simulação, cerca de 7 intervalos), e só 912 com o 1,96: com $n = 10$, o $z$ promete 95 % e entrega menos.

Depois de calcular **um** intervalo, por exemplo (12,1; 15,3), não é correto dizer "há 95 % de chance de $\mu$ estar entre 12,1 e 15,3". Ou $\mu$ está lá, ou não está; os 95 % descrevem a taxa de acerto do método, não deste intervalo. Também não é verdade que 95 % dos clientes esperam entre 12,1 e 15,3 minutos: o intervalo é sobre a **média**, e os tempos individuais se espalham muito mais (essa seria a pergunta de um intervalo de previsão). No `scipy`, `stats.t.interval(0.95, df, loc=media, scale=ep)` faz a mesma conta.

## Passo 2 · Exercício · IC da média
modo: lacunas

Complete as lacunas (`___`) para calcular o intervalo $t$ da média.

### Instruções
1. `ic_media(amostra, confianca=0.95)` levanta `ValueError` com menos de 2 valores.
2. A função usa o quantil $t$ com $n - 1$ graus de liberdade que deixa $(1 - \text{confiança})/2$ em cada cauda, e o erro padrão $s/\sqrt n$ com o desvio amostral.
3. Devolve a tupla `(inferior, superior)`, com dois `float`.

### Código inicial
```python
import numpy as np
from scipy import stats


def ic_media(amostra, confianca=0.95):
    x = np.asarray(amostra, dtype=float)
    n = len(x)
    if n < 2:
        raise ValueError("são necessários pelo menos 2 valores")
    t = stats.t.ppf(___, df=___)
    erro_padrao = x.std(ddof=___) / np.sqrt(___)
    media = x.mean()
    return float(media - t * erro_padrao), float(media + t * erro_padrao)
```

### Solução
```python
import numpy as np
from scipy import stats


def ic_media(amostra, confianca=0.95):
    x = np.asarray(amostra, dtype=float)
    n = len(x)
    if n < 2:
        raise ValueError("são necessários pelo menos 2 valores")
    t = stats.t.ppf((1 + confianca) / 2, df=n - 1)
    erro_padrao = x.std(ddof=1) / np.sqrt(n)
    media = x.mean()
    return float(media - t * erro_padrao), float(media + t * erro_padrao)
```

### Dicas
1. Para 95 %, o quantil procurado é o de 0,975: 2,5 % ficam acima dele.
2. Os graus de liberdade são um a menos que o tamanho da amostra.
3. O intervalo é sobre a média: a margem usa o erro padrão, não o desvio dos dados.

### Verificação
```json
[
  { "id": "tipos", "checkpoint": 3, "kind": "expr", "setup": "r = ic_media([2, 4, 4, 4, 5, 5, 7, 9])",
    "expr": "[type(r).__name__, type(r[0]).__name__, type(r[1]).__name__]", "expected": ["tuple", "float", "float"],
    "name": "Devolve uma tupla de dois float" },
  { "id": "oito", "checkpoint": 2, "kind": "expr", "expr": "list(ic_media([2, 4, 4, 4, 5, 5, 7, 9]))",
    "expected": [3.21251208176379, 6.787487918236209], "tolerance": 1e-9, "name": "IC de 95 % de [2, 4, 4, 4, 5, 5, 7, 9]",
    "hint": "Confira o quantil (o de 0,975 para 95 %), os graus de liberdade e o ddof." },
  { "id": "dois", "checkpoint": 2, "kind": "expr", "expr": "list(ic_media([10, 12]))",
    "expected": [-1.7062047361746941, 23.706204736174694], "tolerance": 1e-9,
    "name": "Com dois valores, o t de 1 grau de liberdade (12,71) dá um intervalo enorme",
    "hint": "Com n = 2 sobra 1 grau de liberdade." },
  { "id": "noventa", "checkpoint": 2, "kind": "expr", "expr": "list(ic_media([10, 12, 14], 0.90))",
    "expected": [8.6282910783059, 15.371708921694097], "tolerance": 1e-9, "name": "IC de 90 % de [10, 12, 14]" },
  { "id": "noventa-e-nove", "checkpoint": 2, "kind": "expr", "expr": "list(ic_media([2, 4, 4, 4, 5, 5, 7, 9], 0.99))",
    "expected": [2.354639279424657, 7.6453607205753435], "tolerance": 1e-9, "name": "IC de 99 % é mais largo que o de 95 %" },
  { "id": "ordem", "checkpoint": 2, "kind": "expr", "setup": "r = ic_media([3, 8, 1, 9, 4])",
    "expr": "bool(r[0] < 5.0 < r[1])", "expected": true, "name": "O inferior vem antes e a média fica no meio",
    "hint": "Um quantil abaixo de 0,5 é negativo e troca os lados do intervalo." },
  { "id": "iguais", "checkpoint": 2, "kind": "expr", "expr": "list(ic_media([7, 7, 7, 7]))", "expected": [7.0, 7.0],
    "tolerance": 1e-12, "name": "Valores iguais dão um intervalo de largura zero" },
  { "id": "um", "checkpoint": 1, "kind": "expr", "expr": "ic_media([5])", "raises": "ValueError",
    "name": "Com um valor só, levanta ValueError" }
]
```

### Soluções erradas
```python name="quantil de uma cauda só"
import numpy as np
from scipy import stats


def ic_media(amostra, confianca=0.95):
    x = np.asarray(amostra, dtype=float)
    n = len(x)
    if n < 2:
        raise ValueError("são necessários pelo menos 2 valores")
    t = stats.t.ppf(confianca, df=n - 1)
    erro_padrao = x.std(ddof=1) / np.sqrt(n)
    media = x.mean()
    return float(media - t * erro_padrao), float(media + t * erro_padrao)
```
```python name="quantil da cauda de baixo"
import numpy as np
from scipy import stats


def ic_media(amostra, confianca=0.95):
    x = np.asarray(amostra, dtype=float)
    n = len(x)
    if n < 2:
        raise ValueError("são necessários pelo menos 2 valores")
    t = stats.t.ppf((1 - confianca) / 2, df=n - 1)
    erro_padrao = x.std(ddof=1) / np.sqrt(n)
    media = x.mean()
    return float(media - t * erro_padrao), float(media + t * erro_padrao)
```
```python name="n graus de liberdade"
import numpy as np
from scipy import stats


def ic_media(amostra, confianca=0.95):
    x = np.asarray(amostra, dtype=float)
    n = len(x)
    if n < 2:
        raise ValueError("são necessários pelo menos 2 valores")
    t = stats.t.ppf((1 + confianca) / 2, df=n)
    erro_padrao = x.std(ddof=1) / np.sqrt(n)
    media = x.mean()
    return float(media - t * erro_padrao), float(media + t * erro_padrao)
```
```python name="desvio populacional (ddof=0)"
import numpy as np
from scipy import stats


def ic_media(amostra, confianca=0.95):
    x = np.asarray(amostra, dtype=float)
    n = len(x)
    if n < 2:
        raise ValueError("são necessários pelo menos 2 valores")
    t = stats.t.ppf((1 + confianca) / 2, df=n - 1)
    erro_padrao = x.std(ddof=0) / np.sqrt(n)
    media = x.mean()
    return float(media - t * erro_padrao), float(media + t * erro_padrao)
```
```python name="desvio no lugar do erro padrão"
import numpy as np
from scipy import stats


def ic_media(amostra, confianca=0.95):
    x = np.asarray(amostra, dtype=float)
    n = len(x)
    if n < 2:
        raise ValueError("são necessários pelo menos 2 valores")
    t = stats.t.ppf((1 + confianca) / 2, df=n - 1)
    erro_padrao = x.std(ddof=1) / np.sqrt(1)
    media = x.mean()
    return float(media - t * erro_padrao), float(media + t * erro_padrao)
```

## Passo 3 · Previsão · Largura e cobertura

O programa calcula a margem de um intervalo de 95 % com $t \approx 2$ (o valor para $n = 36$ arredondado), muda o tamanho da amostra e o espalhamento dos dados e, no fim, confere quais de três intervalos contêm a média verdadeira, 50. Digite a saída.

### Código
```python
import math

s, n = 12.0, 36
print(2.0 * s / math.sqrt(n))
print(2.0 * s / math.sqrt(4 * n))
print(2.0 * (2 * s) / math.sqrt(n))

intervalos = [(48.1, 51.9), (50.2, 53.4), (46.0, 49.9)]
cobre = [inf <= 50 <= sup for inf, sup in intervalos]
print(cobre)
print(sum(cobre), "de", len(intervalos))
```

### Dicas
1. A margem é proporcional a $s$ e inversamente proporcional a $\sqrt n$.
2. Multiplicar $n$ por 4 divide a raiz por 2.
3. `sum` de uma lista de booleanos conta os `True`.

### Saída esperada
```text
4.0
2.0
8.0
[True, False, False]
1 de 3
```

## Passo 4 · Leitura · IC de proporção: Wald e Wilson

Numa pesquisa fictícia, 40 de 100 clientes disseram que voltariam à loja. A proporção estimada é $\hat p = 0{,}40$. O intervalo mais conhecido, o de **Wald**, aplica a ideia da média com o erro padrão da proporção da m1-05 e o quantil $z$ da normal:

$$
\hat p \pm z_{1-\alpha/2} \sqrt{\frac{\hat p (1 - \hat p)}{n}}
$$

Com 40 de 100, ele dá $(0{,}304;\ 0{,}496)$. A margem de "2 pontos percentuais" das pesquisas vem daí: com $\hat p$ perto de 0,5, $1{,}96\sqrt{0{,}25/n} \approx 1/\sqrt n$, e $n = 2\,500$ dá 0,02.

O Wald falha onde mais se precisa dele: com $n$ pequeno ou $\hat p$ perto de 0 ou 1. Uma linha de produção fictícia inspecionou 20 peças e não achou defeito: $\hat p = 0$, o erro padrão é zero e o Wald devolve $(0;\ 0)$, como se fosse certo que a linha nunca erra. Com 20 de 20, devolve $(1;\ 1)$. E sua cobertura real fica abaixo dos 95 % prometidos mesmo em casos menos extremos.

O intervalo de **Wilson** corrige isso. Ele não centra em $\hat p$: puxa o centro um pouco para 0,5 e usa uma margem que não zera nas pontas.

$$
\frac{\hat p + \frac{z^2}{2n}}{1 + \frac{z^2}{n}} \ \pm\ \frac{z}{1 + \frac{z^2}{n}} \sqrt{\frac{\hat p(1 - \hat p)}{n} + \frac{z^2}{4n^2}}
$$

Com 0 defeitos em 20 peças, o Wilson dá $(0;\ 0{,}161)$: nenhum defeito na amostra é compatível com uma taxa real de até 16 %. Com 40 de 100, dá $(0{,}309;\ 0{,}498)$, quase igual ao Wald, porque com $n$ grande e $\hat p$ longe das pontas os dois concordam. O Wilson nunca sai de $[0, 1]$.

```python
z = stats.norm.ppf(0.975)       # 1.96: o quantil de 0,975 da normal
p, n = 0 / 20, 20
centro = (p + z**2 / (2 * n)) / (1 + z**2 / n)
margem = z / (1 + z**2 / n) * np.sqrt(p * (1 - p) / n + z**2 / (4 * n**2))
centro - margem, centro + margem          # (0.0, 0.161)
```

Na proporção se usa o $z$, e não o $t$: aqui o erro padrão é função do próprio $\hat p$, sem um desvio estimado à parte. O quantil é o mesmo do IC da média, o de $(1 + \text{confiança})/2$. O Wald continua útil como conta de cabeça para amostras grandes; para relatar um resultado, o Wilson é a escolha mais segura.

## Passo 5 · Exercício · Proporções

Implemente os dois intervalos de proporção da leitura numa função só.

### Instruções
1. `ic_proporcao(sucessos, n, confianca=0.95, metodo="wilson")` devolve a tupla `(inferior, superior)`, com dois `float`, usando o quantil $z$ da normal que deixa $(1 - \text{confiança})/2$ em cada cauda.
2. Com `metodo="wilson"` (o padrão), usa a fórmula de Wilson; com `metodo="wald"`, a de Wald, sem cortar o resultado em $[0, 1]$.
3. Levanta `ValueError` para um método desconhecido, para `n <= 0` e para `sucessos` fora de $[0, n]$.

### Código inicial
```python
import math
from scipy import stats


def ic_proporcao(sucessos, n, confianca=0.95, metodo="wilson"):
    pass
```

### Solução
```python
import math
from scipy import stats


def ic_proporcao(sucessos, n, confianca=0.95, metodo="wilson"):
    if n <= 0 or not 0 <= sucessos <= n:
        raise ValueError("é preciso n > 0 e 0 <= sucessos <= n")
    z = stats.norm.ppf((1 + confianca) / 2)
    p = sucessos / n
    if metodo == "wald":
        margem = z * math.sqrt(p * (1 - p) / n)
        return float(p - margem), float(p + margem)
    if metodo == "wilson":
        centro = (p + z ** 2 / (2 * n)) / (1 + z ** 2 / n)
        margem = z / (1 + z ** 2 / n) * math.sqrt(p * (1 - p) / n + z ** 2 / (4 * n ** 2))
        return float(centro - margem), float(centro + margem)
    raise ValueError(f"método desconhecido: {metodo}")
```

### Dicas
1. O quantil é o mesmo do IC da média, mas da normal: `stats.norm.ppf`.
2. No Wilson, o centro não é $\hat p$ e a raiz tem um termo a mais, que não zera quando $\hat p$ é 0 ou 1.
3. Confira as entradas antes de dividir por `n`.

### Verificação
```json
[
  { "id": "tipos", "checkpoint": 1, "kind": "expr", "setup": "r = ic_proporcao(40, 100)",
    "expr": "[type(r).__name__, type(r[0]).__name__, type(r[1]).__name__]", "expected": ["tuple", "float", "float"],
    "name": "Devolve uma tupla de dois float" },
  { "id": "wilson-40", "checkpoint": 2, "kind": "expr", "expr": "list(ic_proporcao(40, 100))",
    "expected": [0.3094012864324589, 0.4979974132089382], "tolerance": 1e-9,
    "name": "Wilson (o padrão) com 40 de 100", "hint": "O método padrão é o de Wilson." },
  { "id": "wald-40", "checkpoint": 2, "kind": "expr", "expr": "list(ic_proporcao(40, 100, metodo='wald'))",
    "expected": [0.3039817664728938, 0.4960182335271062], "tolerance": 1e-9, "name": "Wald com 40 de 100",
    "hint": "Para 95 %, o quantil é o de 0,975 da normal." },
  { "id": "wald-zero", "checkpoint": 2, "kind": "expr", "expr": "list(ic_proporcao(0, 20, metodo='wald'))",
    "expected": [0.0, 0.0], "tolerance": 1e-12, "name": "Wald com 0 de 20 colapsa em (0, 0)" },
  { "id": "wilson-zero", "checkpoint": 2, "kind": "expr", "expr": "list(ic_proporcao(0, 20))",
    "expected": [0.0, 0.16112515805281938], "tolerance": 1e-9, "name": "Wilson com 0 de 20 vai até 0,161",
    "hint": "O termo z² / (4n²) dentro da raiz é o que impede o colapso." },
  { "id": "wilson-todos", "checkpoint": 2, "kind": "expr", "expr": "list(ic_proporcao(20, 20))",
    "expected": [0.8388748419471806, 1.0], "tolerance": 1e-9, "name": "Wilson com 20 de 20 fica dentro de [0, 1]" },
  { "id": "wilson-90", "checkpoint": 1, "kind": "expr", "expr": "list(ic_proporcao(40, 100, 0.90))",
    "expected": [0.3230780505909665, 0.48219049356566845], "tolerance": 1e-9, "name": "Wilson de 90 % com 40 de 100" },
  { "id": "wilson-pequeno", "checkpoint": 2, "kind": "expr", "expr": "list(ic_proporcao(3, 10))",
    "expected": [0.10779126740630099, 0.6032218525388546], "tolerance": 1e-9,
    "name": "Wilson com 3 de 10: o centro sai de 0,3 em direção a 0,5" },
  { "id": "metodo-desconhecido", "checkpoint": 3, "kind": "expr", "expr": "ic_proporcao(40, 100, metodo='exato')",
    "raises": "ValueError", "name": "Método desconhecido é recusado" },
  { "id": "sucessos-demais", "checkpoint": 3, "kind": "expr", "expr": "ic_proporcao(12, 10)", "raises": "ValueError",
    "name": "Mais sucessos que tentativas é recusado" },
  { "id": "n-zero", "checkpoint": 3, "kind": "expr", "expr": "ic_proporcao(0, 0)", "raises": "ValueError",
    "name": "n = 0 é recusado" }
]
```

### Soluções erradas
```python name="quantil de uma cauda só"
import math
from scipy import stats


def ic_proporcao(sucessos, n, confianca=0.95, metodo="wilson"):
    if n <= 0 or not 0 <= sucessos <= n:
        raise ValueError("é preciso n > 0 e 0 <= sucessos <= n")
    z = stats.norm.ppf(confianca)
    p = sucessos / n
    if metodo == "wald":
        margem = z * math.sqrt(p * (1 - p) / n)
        return float(p - margem), float(p + margem)
    if metodo == "wilson":
        centro = (p + z ** 2 / (2 * n)) / (1 + z ** 2 / n)
        margem = z / (1 + z ** 2 / n) * math.sqrt(p * (1 - p) / n + z ** 2 / (4 * n ** 2))
        return float(centro - margem), float(centro + margem)
    raise ValueError(f"método desconhecido: {metodo}")
```
```python name="Wilson sem o termo z²/4n²"
import math
from scipy import stats


def ic_proporcao(sucessos, n, confianca=0.95, metodo="wilson"):
    if n <= 0 or not 0 <= sucessos <= n:
        raise ValueError("é preciso n > 0 e 0 <= sucessos <= n")
    z = stats.norm.ppf((1 + confianca) / 2)
    p = sucessos / n
    if metodo == "wald":
        margem = z * math.sqrt(p * (1 - p) / n)
        return float(p - margem), float(p + margem)
    if metodo == "wilson":
        centro = (p + z ** 2 / (2 * n)) / (1 + z ** 2 / n)
        margem = z / (1 + z ** 2 / n) * math.sqrt(p * (1 - p) / n)
        return float(centro - margem), float(centro + margem)
    raise ValueError(f"método desconhecido: {metodo}")
```
```python name="Wilson centrado em p"
import math
from scipy import stats


def ic_proporcao(sucessos, n, confianca=0.95, metodo="wilson"):
    if n <= 0 or not 0 <= sucessos <= n:
        raise ValueError("é preciso n > 0 e 0 <= sucessos <= n")
    z = stats.norm.ppf((1 + confianca) / 2)
    p = sucessos / n
    if metodo == "wald":
        margem = z * math.sqrt(p * (1 - p) / n)
        return float(p - margem), float(p + margem)
    if metodo == "wilson":
        margem = z / (1 + z ** 2 / n) * math.sqrt(p * (1 - p) / n + z ** 2 / (4 * n ** 2))
        return float(p - margem), float(p + margem)
    raise ValueError(f"método desconhecido: {metodo}")
```
```python name="Wald como padrão"
import math
from scipy import stats


def ic_proporcao(sucessos, n, confianca=0.95, metodo="wald"):
    if n <= 0 or not 0 <= sucessos <= n:
        raise ValueError("é preciso n > 0 e 0 <= sucessos <= n")
    z = stats.norm.ppf((1 + confianca) / 2)
    p = sucessos / n
    if metodo == "wald":
        margem = z * math.sqrt(p * (1 - p) / n)
        return float(p - margem), float(p + margem)
    if metodo == "wilson":
        centro = (p + z ** 2 / (2 * n)) / (1 + z ** 2 / n)
        margem = z / (1 + z ** 2 / n) * math.sqrt(p * (1 - p) / n + z ** 2 / (4 * n ** 2))
        return float(centro - margem), float(centro + margem)
    raise ValueError(f"método desconhecido: {metodo}")
```
```python name="método desconhecido cai no Wilson"
import math
from scipy import stats


def ic_proporcao(sucessos, n, confianca=0.95, metodo="wilson"):
    if n <= 0 or not 0 <= sucessos <= n:
        raise ValueError("é preciso n > 0 e 0 <= sucessos <= n")
    z = stats.norm.ppf((1 + confianca) / 2)
    p = sucessos / n
    if metodo == "wald":
        margem = z * math.sqrt(p * (1 - p) / n)
        return float(p - margem), float(p + margem)
    centro = (p + z ** 2 / (2 * n)) / (1 + z ** 2 / n)
    margem = z / (1 + z ** 2 / n) * math.sqrt(p * (1 - p) / n + z ** 2 / (4 * n ** 2))
    return float(centro - margem), float(centro + margem)
```
```python name="não confere as entradas"
import math
from scipy import stats


def ic_proporcao(sucessos, n, confianca=0.95, metodo="wilson"):
    z = stats.norm.ppf((1 + confianca) / 2)
    p = sucessos / n
    if metodo == "wald":
        margem = z * math.sqrt(p * (1 - p) / n)
        return float(p - margem), float(p + margem)
    if metodo == "wilson":
        centro = (p + z ** 2 / (2 * n)) / (1 + z ** 2 / n)
        margem = z / (1 + z ** 2 / n) * math.sqrt(p * (1 - p) / n + z ** 2 / (4 * n ** 2))
        return float(centro - margem), float(centro + margem)
    raise ValueError(f"método desconhecido: {metodo}")
```

## Passo 6 · Leitura · Bootstrap percentílico

As fórmulas de IC existem para a média e para a proporção. E para a mediana do tempo de atendimento, ou para a razão entre duas médias? O **bootstrap** dá um intervalo para quase qualquer estatística, sem fórmula, com a reamostragem da m1-05.

A ideia: a amostra é a melhor imagem que você tem da população. Sorteie dela, **com reposição**, uma nova amostra do mesmo tamanho (alguns valores saem repetidos, outros ficam de fora) e calcule a estatística. Repita milhares de vezes. A variação dessas estatísticas imita a variação que você veria se pudesse coletar amostras novas da população. O **intervalo percentílico** de 95 % pega os percentis 2,5 e 97,5 delas:

$$
\left[\ \hat\theta^{*}_{(2{,}5\,\%)},\ \ \hat\theta^{*}_{(97{,}5\,\%)}\ \right]
$$

em que $\hat\theta^{*}$ são as estatísticas calculadas nas reamostras. Vetorizado, com a forma `(reamostras, n)`, a estatística é aplicada a cada linha:

```python
rng = np.random.default_rng(1)
reamostras = rng.choice(amostra, size=(2000, len(amostra)))   # com reposição
medianas = np.median(reamostras, axis=1)
np.percentile(medianas, [2.5, 97.5])
```

Qualquer função do numpy que aceite `axis` serve: `np.mean`, `np.median`, `np.std`. Para uma amostra grande e a média, o bootstrap concorda com o intervalo $t$: com 400 valores simulados, a largura dos dois diferiu menos de 6 %.

Sem reposição, cada reamostra seria só a amostra embaralhada, com a mesma média, e o intervalo teria largura zero. Os percentis precisam ser os das **estatísticas das reamostras**, não os dos dados: os percentis 2,5 e 97,5 dos dados descrevem onde ficam os valores individuais, uma faixa muito mais larga.

O bootstrap tem limites. Ele não cria informação: com 8 valores, as reamostras só recombinam esses 8, e o intervalo costuma sair estreito demais. Estatísticas de extremos, como o máximo, saem mal, porque nenhuma reamostra passa do maior valor observado. E ele supõe valores independentes, o que uma série temporal não é. O número de reamostras controla só o erro da simulação; com 2 000 a 10 000, esse erro fica pequeno perto do erro da amostra, e a semente torna o intervalo reproduzível.

## Passo 7 · Exercício · Cobertura e bootstrap

Confirme por simulação que o intervalo $t$ cobre a média na taxa prometida e implemente o bootstrap percentílico.

### Instruções
1. `cobertura_simulada(mu, sigma, n, repeticoes, semente, confianca=0.95)` sorteia, com um gerador criado a partir de `semente`, `repeticoes` amostras de tamanho `n` de uma normal com média `mu` e desvio `sigma`, calcula o intervalo $t$ de cada uma (desvio amostral, $n - 1$ graus de liberdade) e devolve, como `float`, a fração dos intervalos que contêm `mu`.
2. `ic_bootstrap(amostra, estatistica, n_reamostras, semente, confianca=0.95)` sorteia `n_reamostras` reamostras com reposição do tamanho da amostra, aplica `estatistica` (uma função do numpy que aceita `axis`, como `np.mean` ou `np.median`) a cada reamostra e devolve a tupla `(inferior, superior)` dos percentis que deixam $(1 - \text{confiança})/2$ em cada cauda, com dois `float`.
3. As funções não usam o gerador global: a mesma semente sempre dá o mesmo resultado.
4. Não use laço (`for`, `while` ou compreensão).

### Código inicial
```python
import numpy as np
from scipy import stats


def cobertura_simulada(mu, sigma, n, repeticoes, semente, confianca=0.95):
    pass


def ic_bootstrap(amostra, estatistica, n_reamostras, semente, confianca=0.95):
    pass
```

### Solução
```python
import numpy as np
from scipy import stats


def cobertura_simulada(mu, sigma, n, repeticoes, semente, confianca=0.95):
    rng = np.random.default_rng(semente)
    amostras = rng.normal(mu, sigma, size=(repeticoes, n))
    medias = amostras.mean(axis=1)
    erro_padrao = amostras.std(axis=1, ddof=1) / np.sqrt(n)
    t = stats.t.ppf((1 + confianca) / 2, df=n - 1)
    cobre = np.abs(medias - mu) <= t * erro_padrao
    return float(cobre.mean())


def ic_bootstrap(amostra, estatistica, n_reamostras, semente, confianca=0.95):
    x = np.asarray(amostra, dtype=float)
    rng = np.random.default_rng(semente)
    reamostras = rng.choice(x, size=(n_reamostras, len(x)))
    valores = estatistica(reamostras, axis=1)
    alfa = 1 - confianca
    inferior, superior = np.percentile(valores, [100 * alfa / 2, 100 * (1 - alfa / 2)])
    return float(inferior), float(superior)
```

### Dicas
1. Um intervalo contém `mu` quando a distância entre a média da amostra e `mu` não passa da margem.
2. O desvio de cada amostra é calculado ao longo da linha, com o `ddof` amostral; o `sigma` verdadeiro é desconhecido para quem calcula o intervalo.
3. No bootstrap, os percentis são das estatísticas das reamostras, e não dos dados.

### Verificação
```json
[
  { "id": "cob-n5", "checkpoint": 1, "kind": "call", "function": "cobertura_simulada", "args": [10, 3, 5, 20000, 1],
    "expected": 0.95, "type": "float", "tolerance": 0.0077, "name": "Com n = 5, o intervalo t cobre cerca de 95 %",
    "hint": "Com n pequeno, o quantil da normal (1,96) dá intervalos estreitos demais." },
  { "id": "cob-n2", "checkpoint": 1, "kind": "call", "function": "cobertura_simulada", "args": [0, 1, 2, 20000, 2],
    "expected": 0.95, "tolerance": 0.0077, "name": "Com n = 2, o t de 1 grau de liberdade ainda cobre 95 %" },
  { "id": "cob-90", "checkpoint": 1, "kind": "call", "function": "cobertura_simulada", "args": [10, 3, 10, 20000, 3],
    "kwargs": { "confianca": 0.9 }, "expected": 0.9, "tolerance": 0.0106, "name": "Com confiança 0,90, cobre cerca de 90 %" },
  { "id": "cob-semente", "checkpoint": 3, "kind": "expr",
    "expr": "[cobertura_simulada(5, 2, 4, 2000, 6) == cobertura_simulada(5, 2, 4, 2000, 6), cobertura_simulada(5, 2, 4, 2000, 6) != cobertura_simulada(5, 2, 4, 2000, 7)]",
    "expected": [true, true], "name": "Cobertura: mesma semente repete, outra semente muda" },
  { "id": "boot-tipos", "checkpoint": 2, "kind": "expr", "setup": "r = ic_bootstrap([3, 1, 4, 1, 5, 9, 2, 6], np.mean, 500, 1)",
    "expr": "[type(r).__name__, type(r[0]).__name__, type(r[1]).__name__]", "expected": ["tuple", "float", "float"],
    "name": "ic_bootstrap devolve uma tupla de dois float" },
  { "id": "boot-largura", "checkpoint": 2, "kind": "expr",
    "setup": "x = np.random.default_rng(4).normal(100, 15, 400)\ninf, sup = ic_bootstrap(x, np.mean, 2000, 1)\nlargura_t = 2 * 1.96 * x.std(ddof=1) / 20",
    "expr": "[bool(inf < x.mean() < sup), bool(0.9 < (sup - inf) / largura_t < 1.1)]", "expected": [true, true],
    "name": "Com 400 valores, o bootstrap da média tem a largura do intervalo t",
    "hint": "Reamostre com reposição e use os percentis 2,5 e 97,5 das médias das reamostras." },
  { "id": "boot-mediana", "checkpoint": 2, "kind": "expr",
    "setup": "x = np.random.default_rng(4).normal(100, 15, 400)\ninf, sup = ic_bootstrap(x, np.median, 2000, 1)",
    "expr": "[bool(inf < np.median(x) < sup), bool(1 < sup - inf < 6)]", "expected": [true, true],
    "name": "Funciona com np.median como estatística", "hint": "Aplique a estatística a cada reamostra, com axis=1." },
  { "id": "boot-confianca", "checkpoint": 2, "kind": "expr",
    "setup": "x = np.random.default_rng(4).normal(100, 15, 400)\na = ic_bootstrap(x, np.mean, 2000, 1)\nb = ic_bootstrap(x, np.mean, 2000, 1, confianca=0.5)",
    "expr": "bool(b[1] - b[0] < 0.5 * (a[1] - a[0]))", "expected": true, "name": "Com confiança 0,5 o intervalo é bem mais estreito" },
  { "id": "boot-constante", "checkpoint": 2, "kind": "expr", "expr": "list(ic_bootstrap([4, 4, 4, 4], np.mean, 100, 1))",
    "expected": [4.0, 4.0], "tolerance": 1e-12, "name": "Amostra constante dá intervalo de largura zero" },
  { "id": "boot-semente", "checkpoint": 3, "kind": "expr",
    "expr": "[ic_bootstrap([3, 1, 4, 1, 5, 9, 2, 6], np.mean, 500, 8) == ic_bootstrap([3, 1, 4, 1, 5, 9, 2, 6], np.mean, 500, 8), ic_bootstrap([3, 1, 4, 1, 5, 9, 2, 6], np.mean, 500, 8) != ic_bootstrap([3, 1, 4, 1, 5, 9, 2, 6], np.mean, 500, 9)]",
    "expected": [true, true], "name": "Bootstrap: mesma semente repete, outra semente muda" },
  { "id": "estado-global", "checkpoint": 3, "kind": "expr",
    "setup": "np.random.seed(0)\na = np.random.random()\nnp.random.seed(0)\nr = cobertura_simulada(0, 1, 5, 100, 1)\nr = ic_bootstrap([1, 2, 3], np.mean, 100, 1)",
    "expr": "np.random.random() == a", "expected": true, "name": "O gerador global do numpy não é tocado" },
  { "id": "sem-for", "checkpoint": 4, "kind": "source", "rule": { "type": "not_uses", "construct": "for" },
    "name": "Sem laço for" },
  { "id": "sem-compreensao", "checkpoint": 4, "kind": "source",
    "rule": { "type": "not_uses", "construct": "list_comprehension" }, "name": "Sem compreensão de lista" }
]
```

### Soluções erradas
```python name="z no lugar de t com n pequeno"
import numpy as np
from scipy import stats


def cobertura_simulada(mu, sigma, n, repeticoes, semente, confianca=0.95):
    rng = np.random.default_rng(semente)
    amostras = rng.normal(mu, sigma, size=(repeticoes, n))
    medias = amostras.mean(axis=1)
    erro_padrao = amostras.std(axis=1, ddof=1) / np.sqrt(n)
    z = stats.norm.ppf((1 + confianca) / 2)
    cobre = np.abs(medias - mu) <= z * erro_padrao
    return float(cobre.mean())


def ic_bootstrap(amostra, estatistica, n_reamostras, semente, confianca=0.95):
    x = np.asarray(amostra, dtype=float)
    rng = np.random.default_rng(semente)
    reamostras = rng.choice(x, size=(n_reamostras, len(x)))
    valores = estatistica(reamostras, axis=1)
    alfa = 1 - confianca
    inferior, superior = np.percentile(valores, [100 * alfa / 2, 100 * (1 - alfa / 2)])
    return float(inferior), float(superior)
```
```python name="desvio populacional nas amostras"
import numpy as np
from scipy import stats


def cobertura_simulada(mu, sigma, n, repeticoes, semente, confianca=0.95):
    rng = np.random.default_rng(semente)
    amostras = rng.normal(mu, sigma, size=(repeticoes, n))
    medias = amostras.mean(axis=1)
    erro_padrao = amostras.std(axis=1) / np.sqrt(n)
    t = stats.t.ppf((1 + confianca) / 2, df=n - 1)
    cobre = np.abs(medias - mu) <= t * erro_padrao
    return float(cobre.mean())


def ic_bootstrap(amostra, estatistica, n_reamostras, semente, confianca=0.95):
    x = np.asarray(amostra, dtype=float)
    rng = np.random.default_rng(semente)
    reamostras = rng.choice(x, size=(n_reamostras, len(x)))
    valores = estatistica(reamostras, axis=1)
    alfa = 1 - confianca
    inferior, superior = np.percentile(valores, [100 * alfa / 2, 100 * (1 - alfa / 2)])
    return float(inferior), float(superior)
```
```python name="usa o sigma verdadeiro com t"
import numpy as np
from scipy import stats


def cobertura_simulada(mu, sigma, n, repeticoes, semente, confianca=0.95):
    rng = np.random.default_rng(semente)
    amostras = rng.normal(mu, sigma, size=(repeticoes, n))
    medias = amostras.mean(axis=1)
    erro_padrao = sigma / np.sqrt(n)
    t = stats.t.ppf((1 + confianca) / 2, df=n - 1)
    cobre = np.abs(medias - mu) <= t * erro_padrao
    return float(cobre.mean())


def ic_bootstrap(amostra, estatistica, n_reamostras, semente, confianca=0.95):
    x = np.asarray(amostra, dtype=float)
    rng = np.random.default_rng(semente)
    reamostras = rng.choice(x, size=(n_reamostras, len(x)))
    valores = estatistica(reamostras, axis=1)
    alfa = 1 - confianca
    inferior, superior = np.percentile(valores, [100 * alfa / 2, 100 * (1 - alfa / 2)])
    return float(inferior), float(superior)
```
```python name="reamostra sem reposição"
import numpy as np
from scipy import stats


def cobertura_simulada(mu, sigma, n, repeticoes, semente, confianca=0.95):
    rng = np.random.default_rng(semente)
    amostras = rng.normal(mu, sigma, size=(repeticoes, n))
    medias = amostras.mean(axis=1)
    erro_padrao = amostras.std(axis=1, ddof=1) / np.sqrt(n)
    t = stats.t.ppf((1 + confianca) / 2, df=n - 1)
    cobre = np.abs(medias - mu) <= t * erro_padrao
    return float(cobre.mean())


def ic_bootstrap(amostra, estatistica, n_reamostras, semente, confianca=0.95):
    x = np.asarray(amostra, dtype=float)
    rng = np.random.default_rng(semente)
    reamostras = rng.choice(x, size=(n_reamostras, len(x)), replace=False)
    valores = estatistica(reamostras, axis=1)
    alfa = 1 - confianca
    inferior, superior = np.percentile(valores, [100 * alfa / 2, 100 * (1 - alfa / 2)])
    return float(inferior), float(superior)
```
```python name="percentis dos dados"
import numpy as np
from scipy import stats


def cobertura_simulada(mu, sigma, n, repeticoes, semente, confianca=0.95):
    rng = np.random.default_rng(semente)
    amostras = rng.normal(mu, sigma, size=(repeticoes, n))
    medias = amostras.mean(axis=1)
    erro_padrao = amostras.std(axis=1, ddof=1) / np.sqrt(n)
    t = stats.t.ppf((1 + confianca) / 2, df=n - 1)
    cobre = np.abs(medias - mu) <= t * erro_padrao
    return float(cobre.mean())


def ic_bootstrap(amostra, estatistica, n_reamostras, semente, confianca=0.95):
    x = np.asarray(amostra, dtype=float)
    alfa = 1 - confianca
    inferior, superior = np.percentile(x, [100 * alfa / 2, 100 * (1 - alfa / 2)])
    return float(inferior), float(superior)
```
```python name="percentis 5 e 95"
import numpy as np
from scipy import stats


def cobertura_simulada(mu, sigma, n, repeticoes, semente, confianca=0.95):
    rng = np.random.default_rng(semente)
    amostras = rng.normal(mu, sigma, size=(repeticoes, n))
    medias = amostras.mean(axis=1)
    erro_padrao = amostras.std(axis=1, ddof=1) / np.sqrt(n)
    t = stats.t.ppf((1 + confianca) / 2, df=n - 1)
    cobre = np.abs(medias - mu) <= t * erro_padrao
    return float(cobre.mean())


def ic_bootstrap(amostra, estatistica, n_reamostras, semente, confianca=0.95):
    x = np.asarray(amostra, dtype=float)
    rng = np.random.default_rng(semente)
    reamostras = rng.choice(x, size=(n_reamostras, len(x)))
    valores = estatistica(reamostras, axis=1)
    alfa = 1 - confianca
    inferior, superior = np.percentile(valores, [100 * alfa, 100 * (1 - alfa)])
    return float(inferior), float(superior)
```
```python name="gerador global no bootstrap"
import numpy as np
from scipy import stats


def cobertura_simulada(mu, sigma, n, repeticoes, semente, confianca=0.95):
    rng = np.random.default_rng(semente)
    amostras = rng.normal(mu, sigma, size=(repeticoes, n))
    medias = amostras.mean(axis=1)
    erro_padrao = amostras.std(axis=1, ddof=1) / np.sqrt(n)
    t = stats.t.ppf((1 + confianca) / 2, df=n - 1)
    cobre = np.abs(medias - mu) <= t * erro_padrao
    return float(cobre.mean())


def ic_bootstrap(amostra, estatistica, n_reamostras, semente, confianca=0.95):
    x = np.asarray(amostra, dtype=float)
    np.random.seed(semente)
    reamostras = np.random.choice(x, size=(n_reamostras, len(x)))
    valores = estatistica(reamostras, axis=1)
    alfa = 1 - confianca
    inferior, superior = np.percentile(valores, [100 * alfa / 2, 100 * (1 - alfa / 2)])
    return float(inferior), float(superior)
```
```python name="laço nas repetições"
import numpy as np
from scipy import stats


def cobertura_simulada(mu, sigma, n, repeticoes, semente, confianca=0.95):
    rng = np.random.default_rng(semente)
    t = stats.t.ppf((1 + confianca) / 2, df=n - 1)
    acertos = 0
    for _ in range(repeticoes):
        x = rng.normal(mu, sigma, size=n)
        if abs(x.mean() - mu) <= t * x.std(ddof=1) / np.sqrt(n):
            acertos += 1
    return acertos / repeticoes


def ic_bootstrap(amostra, estatistica, n_reamostras, semente, confianca=0.95):
    x = np.asarray(amostra, dtype=float)
    rng = np.random.default_rng(semente)
    reamostras = rng.choice(x, size=(n_reamostras, len(x)))
    valores = estatistica(reamostras, axis=1)
    alfa = 1 - confianca
    inferior, superior = np.percentile(valores, [100 * alfa / 2, 100 * (1 - alfa / 2)])
    return float(inferior), float(superior)
```

## Passo 8 · Quiz · Certo ou errado sobre um IC

### Pergunta
Com 40 clientes, uma loja fictícia calculou o IC de 95 % do tempo médio de atendimento: de 12,1 a 15,3 minutos. Qual frase está correta?
- [ ] Há 95 % de chance de o tempo médio verdadeiro estar entre 12,1 e 15,3 minutos
- [ ] 95 % dos clientes são atendidos em 12,1 a 15,3 minutos
- [x] O método usado produz intervalos que contêm o tempo médio verdadeiro em 95 % das amostras; este intervalo é um resultado desse método, e o tempo médio verdadeiro está nele ou não
- [ ] Se a loja medir outros 40 clientes, a média nova vai cair entre 12,1 e 15,3 com 95 % de chance
> O parâmetro é fixo e o intervalo é que varia de amostra para amostra; os 95 % são a taxa de acerto do procedimento. A frase sobre os clientes confunde o intervalo da **média** com a faixa dos tempos individuais, que é bem mais larga. E a média de uma amostra nova varia em torno de $\mu$, não em torno da média desta amostra: a chance de ela cair neste intervalo é menor que 95 %.

### Pergunta
Um colega mediu o rendimento de 6 lotes de uma receita fictícia e calculou o intervalo como `media ± 1.96 * s / sqrt(6)`. O que você aponta?
- [ ] Nada: 1,96 é o quantil de 95 %
- [x] Com $n = 6$ e o desvio estimado pela amostra, o quantil certo é o $t$ com 5 graus de liberdade (2,57); com 1,96 o intervalo fica cerca de 24 % mais estreito e cobre menos que os 95 % prometidos
- [ ] O certo seria dividir por 6, e não pela raiz de 6
- [ ] O certo seria usar o desvio $s$ sem dividir por nada, porque a amostra é pequena
> O 1,96 vale quando $\sigma$ é conhecido ou $n$ é grande. Com $s$ estimado em 6 valores, a incerteza sobre $s$ alarga as caudas, e o quantil vira $t_{5;\,0{,}975} \approx 2{,}57$. Dividir por $n$ ou não dividir mudaria o erro padrão, que está certo como $s/\sqrt n$.

### Pergunta
Uma linha de produção fictícia inspecionou 25 peças e não encontrou defeito. O relatório diz: "IC de 95 % para a taxa de defeitos: de 0 % a 0 %". O que aconteceu e como corrigir?
- [ ] Nada: sem defeitos na amostra, a taxa é zero com certeza
- [ ] O relatório usou 90 % em vez de 95 %; com 95 % o intervalo ficaria (0 %, 0 %) também, então está certo
- [x] O intervalo de Wald colapsou: com $\hat p = 0$ o erro padrão é zero. O de Wilson dá cerca de 0 % a 13 %, o que diz que uma taxa real de até 13 % é compatível com zero defeitos em 25 peças
- [ ] Basta usar o $t$ no lugar do $z$ no Wald, que o intervalo deixa de ser zero
> O Wald usa $\sqrt{\hat p(1 - \hat p)/n}$, que vale zero quando $\hat p = 0$, então ele "afirma" uma certeza que 25 peças não dão. O Wilson tem o termo $z^2/4n^2$ que não zera e vai até cerca de 0,133. Trocar $z$ por $t$ multiplica zero por outro número e continua dando zero.
