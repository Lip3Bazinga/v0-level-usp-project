---
slug: n4-m6-04-amostragem-e-teorema-central-do-limite
titulo: Amostragem e o Teorema Central do Limite
descricao: População e amostra, viés de seleção, distribuição amostral da média, erro padrão e o TCL demonstrado por simulação.
dificuldade: intermediario
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- pandas
xp: 110
tempo_min: 45
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Diferenciar população, amostra, parâmetro e estatística e reconhecer vieses de amostragem
- Simular a distribuição amostral da média e mostrar o TCL para populações não normais
- Calcular o erro padrão e explicar como ele diminui com n
---

## Passo 1 · Leitura · População, amostra e vieses

Uma prefeitura fictícia quer saber que fração dos moradores aprova um projeto de parque. Perguntar a todo mundo é caro; ela pergunta a alguns. O conjunto inteiro de moradores é a **população**, e a fração verdadeira de aprovação é um **parâmetro**: existe, mas ninguém conhece. Os entrevistados formam uma **amostra**, e a fração de aprovação entre eles é uma **estatística**, calculada e usada para estimar o parâmetro. As letras gregas ($\mu$, $\sigma$, $p$) ficam para os parâmetros; as latinas ($\bar x$, $s$, $\hat p$), para as estatísticas.

A estimativa só funciona se a amostra se parecer com a população. A garantia mais simples é a **amostra aleatória simples**: cada morador tem a mesma chance de ser sorteado. Os problemas aparecem quando quem entra na amostra depende da própria resposta:

- **Resposta voluntária:** uma enquete aberta no site da prefeitura ouve quem quis responder, e quem tem opinião forte responde mais.
- **Sobrevivência:** estudar só as lojas que continuam abertas há dez anos esconde as que fecharam, e a conclusão "abrir loja é seguro" sai inflada.
- **Cobertura:** uma pesquisa só por telefone fixo deixa de fora quem não tem um.

A simulação abaixo mostra o pior desses vieses: ele **não diminui com o tamanho da amostra**. Na população de um milhão de moradores, 30 % aprovam o parque; quem aprova responde à enquete com chance 0,20 e quem desaprova, com 0,05.

```python
rng = np.random.default_rng(5)
aprova = rng.random(1_000_000) < 0.30
chance_responder = np.where(aprova, 0.20, 0.05)
respondeu = rng.random(1_000_000) < chance_responder
respondeu.sum()            # 95381 respostas
aprova[respondeu].mean()   # 0.63
```

São mais de 95 mil respostas, e a estimativa diz 63 %, mais que o dobro da verdade. O valor vem de Bayes, como na m6-01: $0{,}3 \cdot 0{,}2 / (0{,}3 \cdot 0{,}2 + 0{,}7 \cdot 0{,}05) \approx 0{,}63$. Aumentar a enquete para 10 milhões de respostas só deixaria a estimativa errada mais estável.

Uma amostra aleatória de 1 000 moradores erra por acaso, e esse erro diminui com $n$ de um jeito que dá para calcular: é o assunto do resto da lição. O erro do viés não diminui e não aparece em nenhuma fórmula; ele só é evitado no desenho da coleta.

## Passo 2 · Previsão · O erro padrão quando n quadruplica

A média de uma amostra aleatória de tamanho $n$ varia de amostra para amostra, e o tamanho típico dessa variação, o **erro padrão**, é $\sigma/\sqrt{n}$, em que $\sigma$ é o desvio da população. A próxima leitura explica de onde vem a fórmula. O programa a calcula para alguns tamanhos de amostra, com $\sigma = 10$. Digite a saída.

### Código
```python
import math

sigma = 10
for n in [25, 100, 400, 1600]:
    print(n, sigma / math.sqrt(n))
print(round(sigma / math.sqrt(50), 2))
```

### Dicas
1. $\sqrt{25} = 5$, e cada linha seguinte tem $n$ quatro vezes maior.
2. Dobrar $n$ divide o erro por $\sqrt 2 \approx 1{,}414$.

### Saída esperada
```text
25 2.0
100 1.0
400 0.5
1600 0.25
1.41
```

## Passo 3 · Exercício · Erro padrão e tamanho de amostra
modo: ordenar

Arraste as linhas para montar as duas funções e ajuste a indentação. Três linhas estão sobrando.

### Instruções
1. `erro_padrao(amostra)` devolve, como `float`, o erro padrão estimado da média: o desvio **amostral** (`ddof=1`) dividido por $\sqrt n$. Com menos de 2 valores, levanta `ValueError`.
2. `tamanho_para_erro(sigma, erro)` devolve o menor `int` $n$ com $\sigma/\sqrt n \le$ `erro`, isto é, $(\sigma/\text{erro})^2$ arredondado **para cima**.

### Solução
```python
import math
import numpy as np


def erro_padrao(amostra):
    x = np.asarray(amostra, dtype=float)
    if len(x) < 2:
        raise ValueError("são necessários pelo menos 2 valores")
    return float(x.std(ddof=1) / math.sqrt(len(x)))


def tamanho_para_erro(sigma, erro):
    return math.ceil((sigma / erro) ** 2)
```

### Distratores
```python
    return float(x.std() / math.sqrt(len(x)))
    return float(x.std(ddof=1) / len(x))
    return round((sigma / erro) ** 2)
```

### Dicas
1. O erro padrão divide o desvio pela **raiz** do tamanho da amostra.
2. Arredondar para o inteiro mais próximo pode dar uma amostra pequena demais.

### Verificação
```json
[
  { "id": "ep-8", "checkpoint": 1, "kind": "call", "function": "erro_padrao", "args": [[2, 4, 4, 4, 5, 5, 7, 9]],
    "expected": 0.7559289460184544, "type": "float", "tolerance": 1e-12,
    "name": "Erro padrão de [2, 4, 4, 4, 5, 5, 7, 9]", "hint": "O desvio é o amostral, com ddof=1." },
  { "id": "ep-2", "checkpoint": 1, "kind": "call", "function": "erro_padrao", "args": [[10, 12]],
    "expected": 1.0, "tolerance": 1e-12, "name": "Erro padrão de [10, 12] é 1" },
  { "id": "ep-iguais", "checkpoint": 1, "kind": "call", "function": "erro_padrao", "args": [[3, 3, 3, 3]],
    "expected": 0.0, "type": "float", "tolerance": 1e-12, "name": "Valores iguais têm erro padrão zero" },
  { "id": "ep-um", "checkpoint": 1, "kind": "expr", "expr": "erro_padrao([5])", "raises": "ValueError",
    "name": "Com um valor só, levanta ValueError" },
  { "id": "n-exato", "checkpoint": 2, "kind": "call", "function": "tamanho_para_erro", "args": [10, 2],
    "expected": 25, "type": "int", "name": "sigma 10 e erro 2: n = 25" },
  { "id": "n-acima", "checkpoint": 2, "kind": "call", "function": "tamanho_para_erro", "args": [15, 2],
    "expected": 57, "type": "int", "name": "sigma 15 e erro 2: 56,25 vira 57",
    "hint": "Com 56 pessoas o erro ainda passa de 2; arredonde para cima." },
  { "id": "n-pequeno", "checkpoint": 2, "kind": "call", "function": "tamanho_para_erro", "args": [12, 5],
    "expected": 6, "type": "int", "name": "sigma 12 e erro 5: 5,76 vira 6" },
  { "id": "n-metade", "checkpoint": 2, "kind": "call", "function": "tamanho_para_erro", "args": [10, 0.5],
    "expected": 400, "type": "int", "name": "Erro 0,5 com sigma 10 pede 400",
    "hint": "O erro cai com a raiz de n: o tamanho cresce com o quadrado de sigma / erro." }
]
```

### Soluções erradas
```python name="desvio populacional (ddof=0)"
import math
import numpy as np


def erro_padrao(amostra):
    x = np.asarray(amostra, dtype=float)
    if len(x) < 2:
        raise ValueError("são necessários pelo menos 2 valores")
    return float(x.std() / math.sqrt(len(x)))


def tamanho_para_erro(sigma, erro):
    return math.ceil((sigma / erro) ** 2)
```
```python name="divide por n e não pela raiz"
import math
import numpy as np


def erro_padrao(amostra):
    x = np.asarray(amostra, dtype=float)
    if len(x) < 2:
        raise ValueError("são necessários pelo menos 2 valores")
    return float(x.std(ddof=1) / len(x))


def tamanho_para_erro(sigma, erro):
    return math.ceil((sigma / erro) ** 2)
```
```python name="desvio no lugar do erro padrão"
import math
import numpy as np


def erro_padrao(amostra):
    x = np.asarray(amostra, dtype=float)
    if len(x) < 2:
        raise ValueError("são necessários pelo menos 2 valores")
    return float(x.std(ddof=1))


def tamanho_para_erro(sigma, erro):
    return math.ceil((sigma / erro) ** 2)
```
```python name="arredonda para o mais próximo"
import math
import numpy as np


def erro_padrao(amostra):
    x = np.asarray(amostra, dtype=float)
    if len(x) < 2:
        raise ValueError("são necessários pelo menos 2 valores")
    return float(x.std(ddof=1) / math.sqrt(len(x)))


def tamanho_para_erro(sigma, erro):
    return round((sigma / erro) ** 2)
```
```python name="trunca com int"
import math
import numpy as np


def erro_padrao(amostra):
    x = np.asarray(amostra, dtype=float)
    if len(x) < 2:
        raise ValueError("são necessários pelo menos 2 valores")
    return float(x.std(ddof=1) / math.sqrt(len(x)))


def tamanho_para_erro(sigma, erro):
    return int((sigma / erro) ** 2)
```
```python name="esquece o quadrado"
import math
import numpy as np


def erro_padrao(amostra):
    x = np.asarray(amostra, dtype=float)
    if len(x) < 2:
        raise ValueError("são necessários pelo menos 2 valores")
    return float(x.std(ddof=1) / math.sqrt(len(x)))


def tamanho_para_erro(sigma, erro):
    return math.ceil(sigma / erro)
```

## Passo 4 · Leitura · Distribuição amostral e TCL

Sorteie uma amostra de $n$ valores e calcule a média. Sorteie outra, calcule de novo. As médias mudam, e a coleção de todas as médias possíveis tem a sua própria distribuição: a **distribuição amostral da média**. Ela responde à pergunta que importa ao estimar: quanto a minha média pode estar longe da verdadeira?

Dois fatos valem para qualquer população com média $\mu$ e desvio $\sigma$ finitos, quando os $n$ valores são sorteados de forma independente:

$$
E[\bar X] = \mu, \qquad \operatorname{EP}(\bar X) = \frac{\sigma}{\sqrt n}
$$

A média não erra para um lado sistematicamente, e o seu espalhamento cai com a raiz de $n$. O **Teorema Central do Limite** (TCL) acrescenta o formato: quando $n$ cresce, a distribuição de $\bar X$ se aproxima de uma normal, $\bar X \approx \mathcal N(\mu,\ \sigma^2/n)$, mesmo que a população esteja longe de ser normal.

A simulação mostra os dois fatos. A população é de tempos de espera exponenciais, muito assimétricos (média 9,97 e desvio 10,02). A forma `(repeticoes, n)` sorteia 20 000 amostras de uma vez, e `mean(axis=1)` tira a média de cada linha:

```python
rng = np.random.default_rng(0)
populacao = rng.exponential(10, size=100_000)
for n in [2, 10, 50]:
    medias = rng.choice(populacao, size=(20_000, n)).mean(axis=1)
    print(n, medias.mean(), medias.std(ddof=1), pd.Series(medias).skew())
```

| $n$ | média das médias | desvio das médias | $\sigma/\sqrt n$ | assimetria das médias |
|---|---|---|---|---|
| 2 | 9,94 | 7,00 | 7,09 | 1,36 |
| 10 | 9,99 | 3,18 | 3,17 | 0,64 |
| 50 | 9,97 | 1,41 | 1,42 | 0,27 |

A média das médias fica no $\mu$ da população em todos os tamanhos; o desvio delas acompanha $\sigma/\sqrt n$; e a assimetria cai à medida que $n$ cresce, com o histograma das médias ficando cada vez mais parecido com um sino.

O TCL fala da **média**, não dos dados. Com $n = 50$ ou $n = 5\,000$, os tempos de espera continuam exponenciais e assimétricos; quem fica aproximadamente normal é a distribuição de $\bar X$. Também não há um $n$ mágico: populações quase simétricas convergem com $n$ pequeno, e populações muito assimétricas pedem mais. E o desvio da amostra, $s$, não diminui com $n$: ele estima $\sigma$, o espalhamento dos dados. O que diminui é o erro padrão, $s/\sqrt n$.

## Passo 5 · Exercício · A distribuição das médias

Simule a distribuição amostral da média de uma população qualquer, sorteando amostras com reposição.

### Instruções
1. `distribuicao_amostral(populacao, n, repeticoes, semente)` sorteia, com um gerador criado a partir de `semente`, `repeticoes` amostras de tamanho `n` da `populacao`, **com reposição**, e calcula a média de cada amostra.
2. Devolve a tupla `(media_das_medias, desvio_das_medias)`, com dois `float`; o desvio é o amostral (`ddof=1`). A população recebida não muda.
3. A função não usa o gerador global: a mesma semente sempre dá o mesmo resultado.
4. Não use laço (`for`, `while` ou compreensão): sorteie as amostras numa matriz de forma `(repeticoes, n)`.

### Código inicial
```python
import numpy as np


def distribuicao_amostral(populacao, n, repeticoes, semente):
    pass
```

### Solução
```python
import numpy as np


def distribuicao_amostral(populacao, n, repeticoes, semente):
    rng = np.random.default_rng(semente)
    amostras = rng.choice(np.asarray(populacao, dtype=float), size=(repeticoes, n))
    medias = amostras.mean(axis=1)
    return float(medias.mean()), float(medias.std(ddof=1))
```

### Dicas
1. O `choice` sorteia com reposição por padrão e aceita uma forma em `size`.
2. Cada linha da matriz é uma amostra: a média de cada amostra é a média ao longo do eixo das colunas.
3. O desvio pedido é o das médias, não o dos valores sorteados.

### Verificação
```json
[
  { "id": "tipos", "checkpoint": 2, "kind": "expr", "setup": "r = distribuicao_amostral([0, 1], 4, 100, 1)",
    "expr": "[type(r).__name__, type(r[0]).__name__, type(r[1]).__name__]", "expected": ["tuple", "float", "float"],
    "name": "Devolve uma tupla de dois float" },
  { "id": "bernoulli-media", "checkpoint": 1, "kind": "expr", "expr": "distribuicao_amostral([0, 1], 4, 100000, 1)[0]",
    "expected": 0.5, "tolerance": 0.004, "name": "População 0 e 1, n = 4: a média das médias fica perto de 0,5" },
  { "id": "bernoulli-desvio", "checkpoint": 1, "kind": "expr", "expr": "distribuicao_amostral([0, 1], 4, 100000, 2)[1]",
    "expected": 0.25, "tolerance": 0.003, "name": "População com desvio 0,5 e n = 4: o desvio das médias fica perto de 0,5/√4",
    "hint": "O desvio pedido é o das médias de cada amostra, não o de todos os valores sorteados." },
  { "id": "n-1", "checkpoint": 1, "kind": "expr", "expr": "distribuicao_amostral([0, 10], 1, 100000, 3)[1]",
    "expected": 5.0, "tolerance": 0.02, "name": "Com n = 1, o desvio das médias é o desvio da população" },
  { "id": "exponencial", "checkpoint": 1, "kind": "expr",
    "setup": "pop = np.random.default_rng(0).exponential(10, size=20000)\nm, d = distribuicao_amostral(pop, 25, 20000, 4)",
    "expr": "[bool(abs(m - pop.mean()) < 0.07), bool(abs(d - pop.std() / 5) < 0.06)]", "expected": [true, true],
    "name": "População exponencial, n = 25: a média fica perto de μ e o desvio perto de σ/5",
    "hint": "Média de cada linha, depois média e desvio dessas médias." },
  { "id": "constante", "checkpoint": 1, "kind": "expr", "expr": "list(distribuicao_amostral([5, 5, 5], 3, 50, 1))",
    "expected": [5.0, 0.0], "tolerance": 1e-12, "name": "População constante: médias todas iguais" },
  { "id": "entrada-intacta", "checkpoint": 2, "kind": "expr",
    "setup": "pop = np.array([1.0, 2.0, 3.0, 4.0])\ncopia = pop.copy()\nr = distribuicao_amostral(pop, 3, 100, 1)",
    "expr": "pop.tolist() == copia.tolist()", "expected": true, "name": "A população recebida não muda" },
  { "id": "mesma-semente", "checkpoint": 3, "kind": "expr",
    "expr": "distribuicao_amostral([1, 2, 3, 9], 5, 200, 7) == distribuicao_amostral([1, 2, 3, 9], 5, 200, 7)",
    "expected": true, "name": "Mesma semente, mesmo resultado", "hint": "Crie o gerador dentro da função." },
  { "id": "sementes-diferentes", "checkpoint": 3, "kind": "expr",
    "expr": "distribuicao_amostral([1, 2, 3, 9], 5, 200, 7) != distribuicao_amostral([1, 2, 3, 9], 5, 200, 8)",
    "expected": true, "name": "Sementes diferentes, resultados diferentes" },
  { "id": "estado-global", "checkpoint": 3, "kind": "expr",
    "setup": "np.random.seed(0)\na = np.random.random()\nnp.random.seed(0)\nr = distribuicao_amostral([1, 2, 3], 2, 50, 1)",
    "expr": "np.random.random() == a", "expected": true, "name": "O gerador global do numpy não é tocado" },
  { "id": "sem-for", "checkpoint": 4, "kind": "source", "rule": { "type": "not_uses", "construct": "for" },
    "name": "Sem laço for" },
  { "id": "sem-compreensao", "checkpoint": 4, "kind": "source",
    "rule": { "type": "not_uses", "construct": "list_comprehension" }, "name": "Sem compreensão de lista" }
]
```

### Soluções erradas
```python name="desvio de todos os valores sorteados"
import numpy as np


def distribuicao_amostral(populacao, n, repeticoes, semente):
    rng = np.random.default_rng(semente)
    amostras = rng.choice(np.asarray(populacao, dtype=float), size=(repeticoes, n))
    medias = amostras.mean(axis=1)
    return float(medias.mean()), float(amostras.std(ddof=1))
```
```python name="média no eixo das repetições"
import numpy as np


def distribuicao_amostral(populacao, n, repeticoes, semente):
    rng = np.random.default_rng(semente)
    amostras = rng.choice(np.asarray(populacao, dtype=float), size=(repeticoes, n))
    medias = amostras.mean(axis=0)
    return float(medias.mean()), float(medias.std(ddof=1))
```
```python name="divide pela raiz de n de novo"
import numpy as np


def distribuicao_amostral(populacao, n, repeticoes, semente):
    rng = np.random.default_rng(semente)
    amostras = rng.choice(np.asarray(populacao, dtype=float), size=(repeticoes, n))
    medias = amostras.mean(axis=1)
    return float(medias.mean()), float(medias.std(ddof=1) / np.sqrt(n))
```
```python name="sem reposição"
import numpy as np


def distribuicao_amostral(populacao, n, repeticoes, semente):
    rng = np.random.default_rng(semente)
    amostras = rng.choice(np.asarray(populacao, dtype=float), size=(repeticoes, n), replace=False)
    medias = amostras.mean(axis=1)
    return float(medias.mean()), float(medias.std(ddof=1))
```
```python name="gerador global"
import numpy as np


def distribuicao_amostral(populacao, n, repeticoes, semente):
    np.random.seed(semente)
    amostras = np.random.choice(np.asarray(populacao, dtype=float), size=(repeticoes, n))
    medias = amostras.mean(axis=1)
    return float(medias.mean()), float(medias.std(ddof=1))
```
```python name="gerador criado fora da função"
import numpy as np

rng = np.random.default_rng(0)


def distribuicao_amostral(populacao, n, repeticoes, semente):
    amostras = rng.choice(np.asarray(populacao, dtype=float), size=(repeticoes, n))
    medias = amostras.mean(axis=1)
    return float(medias.mean()), float(medias.std(ddof=1))
```
```python name="laço por repetição"
import numpy as np


def distribuicao_amostral(populacao, n, repeticoes, semente):
    rng = np.random.default_rng(semente)
    pop = np.asarray(populacao, dtype=float)
    medias = np.empty(repeticoes)
    for i in range(repeticoes):
        medias[i] = rng.choice(pop, size=n).mean()
    return float(medias.mean()), float(medias.std(ddof=1))
```
```python name="devolve números do numpy"
import numpy as np


def distribuicao_amostral(populacao, n, repeticoes, semente):
    rng = np.random.default_rng(semente)
    amostras = rng.choice(np.asarray(populacao, dtype=float), size=(repeticoes, n))
    medias = amostras.mean(axis=1)
    return medias.mean(), medias.std(ddof=1)
```

## Passo 6 · Leitura · Amostra estratificada

A cidade fictícia do parque tem três bairros: o Centro, com 60 % dos moradores, a Várzea, com 30 %, e a Serra, com 10 %. A renda e a opinião mudam muito de um bairro para outro. Numa amostra aleatória simples de 100 moradores, a Serra entra com cerca de 10 pessoas, às vezes 5, às vezes 15, e qualquer conclusão sobre ela fica frágil. O acaso também pode dar uma amostra com Centro demais, e a estimativa da cidade oscila junto.

A **amostra estratificada** divide a população em grupos (os **estratos**) e sorteia uma amostra aleatória dentro de cada um. O número de entrevistados por estrato deixa de ser sorte: é escolhido. Com o mesmo número de pessoas por bairro, cada bairro ganha uma estimativa com precisão parecida.

O preço é que a amostra deixa de ter as proporções da cidade: com 40 pessoas em cada bairro, a Serra pesa um terço da amostra e só 10 % da população. A média simples da amostra fica puxada para a Serra. A correção é pesar a média de cada estrato pela fração $W_h = N_h/N$ que ele representa na população:

$$
\bar x_{\text{est}} = \sum_h W_h\, \bar x_h, \qquad \sum_h W_h = 1
$$

No pandas, o `groupby` seguido de `sample` sorteia dentro de cada grupo. O `random_state` recebe a semente e torna o sorteio reproduzível, sem mexer no gerador global do numpy:

```python
amostra = moradores.groupby("bairro").sample(n=40, random_state=7)
amostra["bairro"].value_counts()          # 40 em cada bairro
medias = amostra.groupby("bairro")["renda"].mean()
pesos = pd.Series({"Centro": 0.6, "Várzea": 0.3, "Serra": 0.1})
(medias * pesos).sum()                     # média estratificada, alinhada pelo índice
```

O `sample` sorteia sem reposição, e os rótulos do índice original vêm junto, o que permite voltar à linha completa de cada sorteado. Se um estrato tiver menos linhas que o `n` pedido, o pandas recusa:

```text
ValueError: Cannot take a larger sample than population when 'replace=False'
```

Estratificar só melhora a estimativa quando os estratos são diferentes entre si e parecidos por dentro. E estratificar não corrige viés: uma enquete voluntária feita bairro a bairro continua ouvindo só quem quis responder.

## Passo 7 · Exercício · Estratos

Sorteie uma amostra estratificada e combine as médias dos estratos com os pesos da população.

### Instruções
1. `amostra_estratificada(df, estrato, n_por_estrato, semente)` devolve um `DataFrame` com `n_por_estrato` linhas de cada valor da coluna `estrato`, sorteadas sem reposição com `random_state=semente`, mantendo as colunas e os rótulos do índice original. `df` não muda.
2. Se algum estrato tiver menos de `n_por_estrato` linhas, levanta `ValueError`.
3. `media_estratificada(amostra, valor, estrato, pesos)` devolve, como `float`, $\sum_h W_h \bar x_h$, com `pesos` um dicionário `{estrato: fração da população}`. Levanta `ValueError` se os pesos não somarem 1 (use `np.isclose`).

### Código inicial
```python
import numpy as np
import pandas as pd


def amostra_estratificada(df, estrato, n_por_estrato, semente):
    pass


def media_estratificada(amostra, valor, estrato, pesos):
    pass
```

### Solução
```python
import numpy as np
import pandas as pd


def amostra_estratificada(df, estrato, n_por_estrato, semente):
    return df.groupby(estrato).sample(n=n_por_estrato, random_state=semente)


def media_estratificada(amostra, valor, estrato, pesos):
    w = pd.Series(pesos, dtype=float)
    if not np.isclose(w.sum(), 1.0):
        raise ValueError("os pesos precisam somar 1")
    medias = amostra.groupby(estrato)[valor].mean()
    return float((medias * w).sum())
```

### Dicas
1. O `sample` do `groupby` sorteia dentro de cada grupo e recusa sozinho um grupo pequeno demais.
2. Uma `Series` montada do dicionário de pesos se alinha pelo índice com as médias por estrato.
3. A média estratificada usa a média de cada estrato, não a soma.

### Verificação
```json
[
  { "id": "contagens", "checkpoint": 1, "kind": "expr",
    "setup": "rng = np.random.default_rng(1)\ndf = pd.DataFrame({'bairro': ['Centro'] * 60 + ['Várzea'] * 30 + ['Serra'] * 10, 'renda': rng.normal(3000, 500, 100).round(2)})\na = amostra_estratificada(df, 'bairro', 8, 3)",
    "expr": "a['bairro'].value_counts().sort_index().to_dict()", "expected": { "Centro": 8, "Serra": 8, "Várzea": 8 },
    "name": "Oito moradores de cada bairro", "hint": "O sorteio acontece dentro de cada estrato." },
  { "id": "linhas-originais", "checkpoint": 1, "kind": "expr",
    "setup": "rng = np.random.default_rng(1)\ndf = pd.DataFrame({'bairro': ['Centro'] * 60 + ['Várzea'] * 30 + ['Serra'] * 10, 'renda': rng.normal(3000, 500, 100).round(2)})\na = amostra_estratificada(df, 'bairro', 8, 3)",
    "expr": "[list(a.columns), bool(a.index.isin(df.index).all()), a.equals(df.loc[a.index])]",
    "expected": [["bairro", "renda"], true, true], "name": "As linhas sorteadas são as originais, com os rótulos do índice",
    "hint": "Não renumere o índice: ele liga cada sorteado à linha completa." },
  { "id": "sem-repeticao", "checkpoint": 1, "kind": "expr",
    "setup": "df = pd.DataFrame({'g': ['a'] * 5 + ['b'] * 5, 'v': range(10)})\na = amostra_estratificada(df, 'g', 5, 2)",
    "expr": "sorted(a['v'].tolist())", "expected": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    "name": "Sorteio sem reposição: com n igual ao estrato, todas as linhas aparecem uma vez" },
  { "id": "mesma-semente", "checkpoint": 1, "kind": "expr",
    "setup": "df = pd.DataFrame({'g': ['a'] * 50 + ['b'] * 50, 'v': range(100)})",
    "expr": "amostra_estratificada(df, 'g', 5, 9).index.tolist() == amostra_estratificada(df, 'g', 5, 9).index.tolist()",
    "expected": true, "name": "Mesma semente, mesma amostra" },
  { "id": "sementes-diferentes", "checkpoint": 1, "kind": "expr",
    "setup": "df = pd.DataFrame({'g': ['a'] * 50 + ['b'] * 50, 'v': range(100)})",
    "expr": "amostra_estratificada(df, 'g', 5, 9).index.tolist() != amostra_estratificada(df, 'g', 5, 10).index.tolist()",
    "expected": true, "name": "Sementes diferentes, amostras diferentes", "hint": "As primeiras linhas de cada grupo não são uma amostra aleatória." },
  { "id": "entrada-intacta", "checkpoint": 1, "kind": "expr",
    "setup": "df = pd.DataFrame({'g': ['a'] * 6 + ['b'] * 6, 'v': [float(i) for i in range(12)]})\ncopia = df.copy()\na = amostra_estratificada(df, 'g', 3, 1)",
    "expr": "df.equals(copia)", "expected": true, "name": "A tabela recebida não muda" },
  { "id": "estrato-pequeno", "checkpoint": 2, "kind": "expr",
    "setup": "df = pd.DataFrame({'g': ['a'] * 6 + ['b'] * 2, 'v': range(8)})",
    "expr": "amostra_estratificada(df, 'g', 3, 1)", "raises": "ValueError", "name": "Um estrato com menos linhas que o pedido é recusado" },
  { "id": "media-est", "checkpoint": 3, "kind": "expr",
    "setup": "a = pd.DataFrame({'bairro': ['A', 'A', 'B', 'B'], 'renda': [10.0, 20.0, 100.0, 200.0]})",
    "expr": "media_estratificada(a, 'renda', 'bairro', {'A': 0.75, 'B': 0.25})", "expected": 48.75, "type": "float",
    "tolerance": 1e-9, "name": "Médias 15 e 150 com pesos 0,75 e 0,25: 48,75",
    "hint": "A média simples da amostra (82,5) dá peso igual aos dois estratos." },
  { "id": "media-tres", "checkpoint": 3, "kind": "expr",
    "setup": "a = pd.DataFrame({'zona': ['x', 'y', 'z', 'x', 'y', 'z'], 'nota': [6.0, 7.0, 9.0, 8.0, 7.0, 7.0]})",
    "expr": "media_estratificada(a, 'nota', 'zona', {'x': 0.5, 'y': 0.3, 'z': 0.2})", "expected": 7.2,
    "tolerance": 1e-9, "name": "Três estratos com pesos 0,5, 0,3 e 0,2" },
  { "id": "pesos-errados", "checkpoint": 3, "kind": "expr",
    "setup": "a = pd.DataFrame({'bairro': ['A', 'B'], 'renda': [1.0, 2.0]})",
    "expr": "media_estratificada(a, 'renda', 'bairro', {'A': 0.6, 'B': 0.6})", "raises": "ValueError",
    "name": "Pesos que somam 1,2 são recusados" }
]
```

### Soluções erradas
```python name="amostra aleatória simples"
import numpy as np
import pandas as pd


def amostra_estratificada(df, estrato, n_por_estrato, semente):
    return df.sample(n=n_por_estrato * df[estrato].nunique(), random_state=semente)


def media_estratificada(amostra, valor, estrato, pesos):
    w = pd.Series(pesos, dtype=float)
    if not np.isclose(w.sum(), 1.0):
        raise ValueError("os pesos precisam somar 1")
    medias = amostra.groupby(estrato)[valor].mean()
    return float((medias * w).sum())
```
```python name="primeiras linhas de cada estrato"
import numpy as np
import pandas as pd


def amostra_estratificada(df, estrato, n_por_estrato, semente):
    return df.groupby(estrato).head(n_por_estrato)


def media_estratificada(amostra, valor, estrato, pesos):
    w = pd.Series(pesos, dtype=float)
    if not np.isclose(w.sum(), 1.0):
        raise ValueError("os pesos precisam somar 1")
    medias = amostra.groupby(estrato)[valor].mean()
    return float((medias * w).sum())
```
```python name="sorteio com reposição"
import numpy as np
import pandas as pd


def amostra_estratificada(df, estrato, n_por_estrato, semente):
    return df.groupby(estrato).sample(n=n_por_estrato, replace=True, random_state=semente)


def media_estratificada(amostra, valor, estrato, pesos):
    w = pd.Series(pesos, dtype=float)
    if not np.isclose(w.sum(), 1.0):
        raise ValueError("os pesos precisam somar 1")
    medias = amostra.groupby(estrato)[valor].mean()
    return float((medias * w).sum())
```
```python name="renumera o índice"
import numpy as np
import pandas as pd


def amostra_estratificada(df, estrato, n_por_estrato, semente):
    return df.groupby(estrato).sample(n=n_por_estrato, random_state=semente).reset_index(drop=True)


def media_estratificada(amostra, valor, estrato, pesos):
    w = pd.Series(pesos, dtype=float)
    if not np.isclose(w.sum(), 1.0):
        raise ValueError("os pesos precisam somar 1")
    medias = amostra.groupby(estrato)[valor].mean()
    return float((medias * w).sum())
```
```python name="média simples da amostra"
import numpy as np
import pandas as pd


def amostra_estratificada(df, estrato, n_por_estrato, semente):
    return df.groupby(estrato).sample(n=n_por_estrato, random_state=semente)


def media_estratificada(amostra, valor, estrato, pesos):
    w = pd.Series(pesos, dtype=float)
    if not np.isclose(w.sum(), 1.0):
        raise ValueError("os pesos precisam somar 1")
    return float(amostra[valor].mean())
```
```python name="pesa a soma em vez da média"
import numpy as np
import pandas as pd


def amostra_estratificada(df, estrato, n_por_estrato, semente):
    return df.groupby(estrato).sample(n=n_por_estrato, random_state=semente)


def media_estratificada(amostra, valor, estrato, pesos):
    w = pd.Series(pesos, dtype=float)
    if not np.isclose(w.sum(), 1.0):
        raise ValueError("os pesos precisam somar 1")
    somas = amostra.groupby(estrato)[valor].sum()
    return float((somas * w).sum())
```
```python name="não confere os pesos"
import numpy as np
import pandas as pd


def amostra_estratificada(df, estrato, n_por_estrato, semente):
    return df.groupby(estrato).sample(n=n_por_estrato, random_state=semente)


def media_estratificada(amostra, valor, estrato, pesos):
    w = pd.Series(pesos, dtype=float)
    medias = amostra.groupby(estrato)[valor].mean()
    return float((medias * w).sum())
```

## Passo 8 · Quiz · Vieses e TCL

### Pergunta
Para estimar a aprovação de um projeto numa cidade fictícia, há duas pesquisas: uma enquete aberta num aplicativo, com 50 000 respostas e 71 % de aprovação, e uma amostra aleatória de 1 000 moradores sorteados do cadastro, com 48 % e margem de cerca de 3 pontos. Em qual confiar?
- [ ] Na enquete, porque 50 000 respostas têm erro padrão 7 vezes menor
- [x] Na amostra aleatória: a enquete só ouve quem quis responder, e esse viés não diminui com o número de respostas; o erro padrão pequeno dela mede só a variação do acaso, não o viés
- [ ] Na média das duas, ponderada pelo tamanho de cada uma
- [ ] Em nenhuma: só um censo completo diz alguma coisa sobre a cidade
> O erro padrão $\sqrt{p(1-p)/n}$ mede quanto uma amostra **aleatória** oscila por acaso. A enquete não é aleatória: quem tem opinião forte responde mais, e 50 000 respostas enviesadas dão uma estimativa errada com muita precisão. A média ponderada seria dominada pela enquete e herdaria o viés. E uma amostra aleatória bem feita de 1 000 pessoas estima bem a cidade, com um erro que se sabe calcular.

### Pergunta
Os tempos de atendimento de uma central fictícia são muito assimétricos: a maioria das ligações é curta, e algumas duram uma hora. Uma colega diz: "pelo Teorema Central do Limite, com 200 ligações na amostra, os tempos passam a ser aproximadamente normais". O que está certo?
- [ ] A frase dela: com $n \ge 30$, qualquer conjunto de dados fica normal
- [ ] O contrário: o TCL só vale se os tempos já forem normais
- [x] Os tempos continuam assimétricos; o que fica aproximadamente normal é a distribuição da **média** de amostras de 200 ligações, com desvio $\sigma/\sqrt{200}$
- [ ] O TCL diz que a média da amostra é sempre igual à média da população quando $n$ é grande
> O TCL é sobre a média amostral, não sobre os dados: um histograma das 200 ligações continua com a cauda longa da população. Ele também não exige uma população normal, e "30" não é um limite mágico. A média amostral não fica igual à da população; ela fica perto, com um erro típico de $\sigma/\sqrt n$.

### Pergunta
Uma reportagem fictícia analisou as 200 padarias de uma cidade que estão abertas há mais de dez anos e concluiu que 90 % delas dão lucro, então "abrir uma padaria é um negócio seguro". Qual é o problema da conclusão?
- [ ] Nenhum: 200 padarias é uma amostra grande o bastante
- [ ] O certo seria usar a mediana do lucro, e não a fração de padarias lucrativas
- [x] Viés de sobrevivência: as padarias que fecharam nesses dez anos não estão na amostra, e são justamente as que dariam a resposta para quem pensa em abrir uma
- [ ] Falta uma amostra estratificada por bairro, que corrigiria o resultado
> A amostra só tem quem sobreviveu, e por isso a fração de sucesso sai inflada. A pergunta "abrir é seguro?" é sobre todas as padarias que abriram, inclusive as que fecharam. Nem o tamanho da amostra nem a medida resumo nem a estratificação trazem de volta quem foi excluído pelo próprio desfecho.
