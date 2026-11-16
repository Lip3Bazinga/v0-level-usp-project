---
slug: n4-m1-05-numeros-aleatorios-e-simulacao
titulo: Números aleatórios e simulação
descricao: np.random.default_rng, sementes, distribuições (uniform, normal, binomial, choice), simulação de Monte Carlo e bootstrap simples.
dificuldade: intermediario
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
- Gerar amostras reproduzíveis com default_rng e seed
- Simular experimentos (dados, moedas, filas) e estimar probabilidades por Monte Carlo
- Estimar π e a média de uma população por simulação e medir o erro
---

## Passo 1 · Leitura · Sementes e geradores

Simular é pôr o computador para sortear: lançar dados, escolher clientes, gerar chegadas numa fila. Os números que ele sorteia não são aleatórios de verdade. Um **gerador pseudoaleatório** produz uma sequência que parece aleatória, mas é inteiramente determinada por um número inicial, a **semente**. Mesma semente, mesma sequência, em qualquer máquina: é isso que torna uma simulação reproduzível, para você conferir um resultado amanhã ou outra pessoa repetir o seu experimento.

```python
rng = np.random.default_rng(42)
rng.random()                     # 0.7739560485559633, aqui e no seu computador
rng.integers(1, 7, size=5)       # 5 dados de 1 a 6: o fim fica de fora
rng.random((2, 3))               # uniformes em [0, 1), forma (2, 3)
rng.normal(170, 8, size=1000)    # normal com média 170 e desvio 8
rng.binomial(10, 0.3, size=4)    # acertos em 10 tentativas com chance 0,3
rng.choice(["a", "b", "c"], size=6, p=[0.5, 0.3, 0.2])
rng.permutation(10)              # 0 a 9 embaralhados
```

Cada chamada **avança** o gerador: a segunda chamada a `rng.random()` dá outro número, e a sequência só recomeça se você criar outro gerador com a mesma semente. O `integers` segue a convenção do `range`: `rng.integers(1, 6)` nunca sorteia o 6. O `choice` sorteia com reposição por padrão (`replace=True`), e as probabilidades em `p` precisam somar 1.

O jeito antigo, que você vai encontrar em muito código e tutorial, é `np.random.seed(42)` seguido de `np.random.rand()` ou `np.random.randint(...)`. Ele usa um gerador **global**, um só para o programa inteiro: uma função que chama `np.random.seed` muda os sorteios de todo o resto, e duas partes do código que sorteiam interferem uma na outra sem que nenhuma perceba. A documentação do numpy recomenda o `default_rng` para código novo.

A regra deste nível: crie o gerador **dentro** da função, a partir da semente recebida, e nunca chame `np.random.seed`. A correção confere as duas coisas: chama a função duas vezes com a mesma semente e espera o mesmo resultado, e verifica se o estado do gerador global continua intacto depois da chamada. Criar o gerador no topo do arquivo, fora da função, também quebra a reprodução, porque o resultado passa a depender de quantas vezes a função já foi chamada.

## Passo 2 · Previsão · Mesma semente, mesma sequência

Três geradores sorteiam dados de 1 a 6: dois com a mesma semente e um com outra. Depois, dois deles sorteiam de novo. Os valores dependem da semente, então a primeira linha é dada: `[2, 5, 1, 2, 2, 2]`. A terceira e a quarta linhas também são dadas, `[6, 4, 5, 6, 4, 5]` e `[6, 5, 6, 6, 1, 1]`. Digite a saída completa, com as cinco linhas.

### Código
```python
import numpy as np

r1 = np.random.default_rng(2024)
r2 = np.random.default_rng(2024)
r3 = np.random.default_rng(7)

print(r1.integers(1, 7, size=6).tolist())
print(r2.integers(1, 7, size=6).tolist())
print(r3.integers(1, 7, size=6).tolist())
print(r1.integers(1, 7, size=6).tolist())
print(r2.integers(1, 7, size=3).tolist())
```

### Dicas
1. Dois geradores criados com a mesma semente produzem exatamente a mesma sequência.
2. Cada gerador avança sozinho: o segundo sorteio de `r1` continua de onde o primeiro parou.
3. `r2` está no mesmo ponto da sequência em que `r1` estava antes do seu segundo sorteio.

### Saída esperada
```text
[2, 5, 1, 2, 2, 2]
[2, 5, 1, 2, 2, 2]
[6, 4, 5, 6, 4, 5]
[6, 5, 6, 6, 1, 1]
[6, 5, 6]
```

## Passo 3 · Exercício · Lançar dados
modo: lacunas

Complete as lacunas (`___`) para simular lançamentos de dois dados e estimar a chance de cada soma.

### Instruções
1. `lancar_dados(n, semente)` cria um gerador com a semente recebida e devolve um array de inteiros de forma `(n, 2)`, com valores de 1 a 6: cada linha é um lançamento de dois dados.
2. `prob_soma(alvo, n, semente)` lança os dois dados `n` vezes e devolve, como `float`, a fração dos lançamentos em que a soma dos dois foi igual a `alvo`.

### Código inicial
```python
import numpy as np


def lancar_dados(n, semente):
    rng = np.random.default_rng(___)
    return rng.integers(___, ___, size=___)


def prob_soma(alvo, n, semente):
    somas = lancar_dados(n, semente).___(axis=1)
    return float((somas == ___).mean())
```

### Solução
```python
import numpy as np


def lancar_dados(n, semente):
    rng = np.random.default_rng(semente)
    return rng.integers(1, 7, size=(n, 2))


def prob_soma(alvo, n, semente):
    somas = lancar_dados(n, semente).sum(axis=1)
    return float((somas == alvo).mean())
```

### Dicas
1. O segundo argumento do `integers` fica de fora, como o fim de um `range`.
2. Cada lançamento é uma linha com dois dados: a forma vai numa tupla.
3. A média de um array de booleanos é a fração de `True`.

### Verificação
```json
[
  { "id": "forma", "checkpoint": 1, "kind": "expr", "expr": "list(lancar_dados(10, 0).shape)", "expected": [10, 2],
    "name": "lancar_dados(10, 0) tem forma (10, 2)", "hint": "Uma linha por lançamento, uma coluna por dado." },
  { "id": "faixa", "checkpoint": 1, "kind": "expr", "setup": "r = lancar_dados(5000, 1)",
    "expr": "[int(r.min()), int(r.max())]", "expected": [1, 6], "name": "Em 5000 lançamentos aparecem o 1 e o 6, e nada fora disso",
    "hint": "O fim do integers fica de fora." },
  { "id": "inteiros", "checkpoint": 1, "kind": "expr", "expr": "lancar_dados(3, 0).dtype.kind", "expected": "i",
    "name": "Os dados são inteiros" },
  { "id": "mesma-semente", "checkpoint": 1, "kind": "expr", "expr": "lancar_dados(20, 5).tolist() == lancar_dados(20, 5).tolist()",
    "expected": true, "name": "Mesma semente, mesmos lançamentos" },
  { "id": "sementes-diferentes", "checkpoint": 1, "kind": "expr",
    "expr": "lancar_dados(20, 5).tolist() != lancar_dados(20, 6).tolist()", "expected": true,
    "name": "Sementes diferentes, lançamentos diferentes", "hint": "Use a semente recebida." },
  { "id": "estado-global", "checkpoint": 1, "kind": "expr",
    "setup": "np.random.seed(0)\na = np.random.random()\nnp.random.seed(0)\nr = lancar_dados(100, 1)",
    "expr": "np.random.random() == a", "expected": true, "name": "O gerador global do numpy não é tocado" },
  { "id": "soma-7", "checkpoint": 2, "kind": "call", "function": "prob_soma", "args": [7, 100000, 1],
    "expected": 0.16666666666666666, "type": "float", "tolerance": 0.006,
    "name": "A chance de somar 7 fica perto de 1/6", "hint": "Some os dois dados de cada lançamento." },
  { "id": "soma-2", "checkpoint": 2, "kind": "call", "function": "prob_soma", "args": [2, 100000, 2],
    "expected": 0.027777777777777776, "tolerance": 0.0026, "name": "A chance de somar 2 fica perto de 1/36" },
  { "id": "soma-12", "checkpoint": 2, "kind": "call", "function": "prob_soma", "args": [12, 100000, 3],
    "expected": 0.027777777777777776, "tolerance": 0.0026, "name": "A chance de somar 12 fica perto de 1/36",
    "hint": "Para somar 12, os dois dados precisam dar 6." },
  { "id": "soma-13", "checkpoint": 2, "kind": "call", "function": "prob_soma", "args": [13, 1000, 4],
    "expected": 0.0, "type": "float", "name": "Somar 13 é impossível" }
]
```

### Soluções erradas
```python name="nunca sai o 6"
import numpy as np


def lancar_dados(n, semente):
    rng = np.random.default_rng(semente)
    return rng.integers(1, 6, size=(n, 2))


def prob_soma(alvo, n, semente):
    somas = lancar_dados(n, semente).sum(axis=1)
    return float((somas == alvo).mean())
```
```python name="dados de 0 a 5"
import numpy as np


def lancar_dados(n, semente):
    rng = np.random.default_rng(semente)
    return rng.integers(0, 6, size=(n, 2))


def prob_soma(alvo, n, semente):
    somas = lancar_dados(n, semente).sum(axis=1)
    return float((somas == alvo).mean())
```
```python name="um dado por lançamento"
import numpy as np


def lancar_dados(n, semente):
    rng = np.random.default_rng(semente)
    return rng.integers(1, 7, size=n)


def prob_soma(alvo, n, semente):
    somas = lancar_dados(n, semente).sum(axis=1)
    return float((somas == alvo).mean())
```
```python name="semente fixa"
import numpy as np


def lancar_dados(n, semente):
    rng = np.random.default_rng(42)
    return rng.integers(1, 7, size=(n, 2))


def prob_soma(alvo, n, semente):
    somas = lancar_dados(n, semente).sum(axis=1)
    return float((somas == alvo).mean())
```
```python name="média no lugar da soma"
import numpy as np


def lancar_dados(n, semente):
    rng = np.random.default_rng(semente)
    return rng.integers(1, 7, size=(n, 2))


def prob_soma(alvo, n, semente):
    somas = lancar_dados(n, semente).mean(axis=1)
    return float((somas == alvo).mean())
```
```python name="soma no eixo dos lançamentos"
import numpy as np


def lancar_dados(n, semente):
    rng = np.random.default_rng(semente)
    return rng.integers(1, 7, size=(n, 2))


def prob_soma(alvo, n, semente):
    somas = lancar_dados(n, semente).sum(axis=0)
    return float((somas == alvo).mean())
```

## Passo 4 · Leitura · Monte Carlo e o erro da estimativa

Num jogo fictício de tabuleiro, você ganha se tirar pelo menos um 6 em quatro lançamentos de um dado. Essa chance tem conta fechada, $1 - (5/6)^4 \approx 0{,}5177$, mas muitas perguntas parecidas não têm: a chance de uma fila passar de 10 pessoas, o tempo até a primeira falha de uma máquina. O método de **Monte Carlo** responde sorteando: repita o experimento $n$ vezes e conte a fração de sucessos, $\hat p$.

A **lei dos grandes números** garante que $\hat p$ se aproxima da probabilidade verdadeira $p$ quando $n$ cresce. Quanto ela se aproxima é medido pelo **erro padrão**:

$$
\hat p = \frac{\text{sucessos}}{n}, \qquad \text{EP}(\hat p) = \sqrt{\frac{\hat p\,(1 - \hat p)}{n}}
$$

Vetorize a simulação: em vez de um laço com um sorteio por volta, sorteie tudo de uma vez numa forma `(simulacoes, tamanho)` e reduza pelo eixo certo.

```python
rng = np.random.default_rng(1)
partidas = rng.integers(1, 7, size=(100_000, 4))    # 100 000 partidas de 4 lançamentos
p_hat = (partidas == 6).any(axis=1).mean()          # 0.51533
ep = np.sqrt(p_hat * (1 - p_hat) / 100_000)         # 0.00158
```

`(partidas == 6).any(axis=1)` diz, para cada partida, se saiu algum 6; a média desses booleanos é a fração de vitórias. O resultado, 0,5153, ficou a 0,0024 da conta exata, cerca de 1,5 erro padrão. É o esperado: a estimativa costuma cair a até 2 erros padrão da verdade e quase nunca a mais de 5.

O erro padrão cai com $\sqrt{n}$, não com $n$. Para dividir o erro por 10, são precisas 100 vezes mais simulações. Por isso uma simulação nunca "acerta" o valor: ela chega perto, com uma margem que você sabe calcular. Pelo mesmo motivo, a correção dos exercícios compara a sua estimativa com o valor teórico e uma tolerância de 5 erros padrão, nunca com um número exato. Duas soluções certas que consomem o gerador em ordens diferentes (sortear `x` e depois `y`, ou os dois juntos numa matriz) dão estimativas diferentes, e as duas estão certas.

A mesma ideia estima áreas. Sorteie pontos uniformes no quadrado $[0, 1) \times [0, 1)$: a fração que cai dentro do quarto de círculo $x^2 + y^2 \le 1$ tende à área dele, $\pi/4$. Multiplicada por 4, é uma estimativa de $\pi$, que é o seu próximo exercício.

## Passo 5 · Exercício · Estimar π

Estime $\pi$ por Monte Carlo e calcule o erro padrão de uma proporção, tudo sem laço.

### Instruções
1. `estimar_pi(n, semente)` sorteia `n` pontos uniformes no quadrado $[0, 1) \times [0, 1)$ com um gerador criado a partir de `semente` e devolve, como `float`, 4 vezes a fração de pontos com $x^2 + y^2 \le 1$.
2. A função não usa o gerador global (`np.random.seed`, `np.random.random`): a mesma semente sempre dá o mesmo resultado.
3. `erro_padrao_proporcao(p, n)` devolve, como `float`, $\sqrt{p(1 - p)/n}$.
4. Não use laço (`for`, `while` ou compreensão).

### Código inicial
```python
import numpy as np


def estimar_pi(n, semente):
    pass


def erro_padrao_proporcao(p, n):
    pass
```

### Solução
```python
import numpy as np


def estimar_pi(n, semente):
    rng = np.random.default_rng(semente)
    pontos = rng.random((n, 2))
    dentro = (pontos ** 2).sum(axis=1) <= 1
    return float(4 * dentro.mean())


def erro_padrao_proporcao(p, n):
    return float(np.sqrt(p * (1 - p) / n))
```

### Dicas
1. Uma matriz `(n, 2)` de uniformes é `n` pontos com duas coordenadas.
2. A fração de pontos dentro do círculo é a média de um array de booleanos.
3. `np.sqrt` devolve um número do numpy; o enunciado pede o `float` do Python.

### Verificação
```json
[
  { "id": "pi", "checkpoint": 1, "kind": "call", "function": "estimar_pi", "args": [200000, 1],
    "expected": 3.141592653589793, "type": "float", "tolerance": 0.02,
    "name": "Com 200 000 pontos, a estimativa fica perto de π", "hint": "A fração dentro do quarto de círculo tende a π/4." },
  { "id": "um-ponto", "checkpoint": 1, "kind": "expr", "expr": "estimar_pi(1, 5) in (0.0, 4.0)", "expected": true,
    "name": "Com um ponto só, a estimativa é 0 ou 4" },
  { "id": "sementes-diferentes", "checkpoint": 1, "kind": "expr", "expr": "estimar_pi(1000, 1) != estimar_pi(1000, 2)",
    "expected": true, "name": "Sementes diferentes dão estimativas diferentes" },
  { "id": "mesma-semente", "checkpoint": 2, "kind": "expr", "expr": "estimar_pi(1000, 3) == estimar_pi(1000, 3)",
    "expected": true, "name": "Mesma semente, mesma estimativa", "hint": "Crie o gerador dentro da função." },
  { "id": "estado-global", "checkpoint": 2, "kind": "expr",
    "setup": "np.random.seed(0)\na = np.random.random()\nnp.random.seed(0)\nr = estimar_pi(1000, 1)",
    "expr": "np.random.random() == a", "expected": true, "name": "O gerador global do numpy não é tocado",
    "hint": "np.random.seed muda o gerador do programa inteiro." },
  { "id": "ep-meio", "checkpoint": 3, "kind": "call", "function": "erro_padrao_proporcao", "args": [0.5, 100],
    "expected": 0.05, "type": "float", "tolerance": 1e-12, "name": "erro_padrao_proporcao(0.5, 100) é o float 0.05" },
  { "id": "ep-zero", "checkpoint": 3, "kind": "call", "function": "erro_padrao_proporcao", "args": [0.0, 50],
    "expected": 0.0, "tolerance": 1e-12, "name": "Com p = 0, o erro padrão é 0" },
  { "id": "ep-quarto", "checkpoint": 3, "kind": "call", "function": "erro_padrao_proporcao", "args": [0.25, 1200],
    "expected": 0.0125, "tolerance": 1e-12, "name": "erro_padrao_proporcao(0.25, 1200)" },
  { "id": "sem-for", "checkpoint": 4, "kind": "source", "rule": { "type": "not_uses", "construct": "for" },
    "name": "Sem laço for" },
  { "id": "sem-while", "checkpoint": 4, "kind": "source", "rule": { "type": "not_uses", "construct": "while" },
    "name": "Sem laço while" },
  { "id": "sem-compreensao", "checkpoint": 4, "kind": "source", "rule": { "type": "not_uses", "construct": "list_comprehension" },
    "name": "Sem compreensão de lista" }
]
```

### Soluções erradas
```python name="gerador global"
import numpy as np


def estimar_pi(n, semente):
    np.random.seed(semente)
    pontos = np.random.random((n, 2))
    dentro = (pontos ** 2).sum(axis=1) <= 1
    return float(4 * dentro.mean())


def erro_padrao_proporcao(p, n):
    return float(np.sqrt(p * (1 - p) / n))
```
```python name="gerador criado fora da função"
import numpy as np

rng = np.random.default_rng(0)


def estimar_pi(n, semente):
    pontos = rng.random((n, 2))
    dentro = (pontos ** 2).sum(axis=1) <= 1
    return float(4 * dentro.mean())


def erro_padrao_proporcao(p, n):
    return float(np.sqrt(p * (1 - p) / n))
```
```python name="laço por ponto"
import numpy as np


def estimar_pi(n, semente):
    rng = np.random.default_rng(semente)
    pontos = rng.random((n, 2))
    dentro = 0
    for x, y in pontos.tolist():
        if x * x + y * y <= 1:
            dentro += 1
    return float(4 * dentro / n)


def erro_padrao_proporcao(p, n):
    return float(np.sqrt(p * (1 - p) / n))
```
```python name="esquece o fator 4"
import numpy as np


def estimar_pi(n, semente):
    rng = np.random.default_rng(semente)
    pontos = rng.random((n, 2))
    dentro = (pontos ** 2).sum(axis=1) <= 1
    return float(dentro.mean())


def erro_padrao_proporcao(p, n):
    return float(np.sqrt(p * (1 - p) / n))
```
```python name="soma sem os quadrados"
import numpy as np


def estimar_pi(n, semente):
    rng = np.random.default_rng(semente)
    pontos = rng.random((n, 2))
    dentro = pontos.sum(axis=1) <= 1
    return float(4 * dentro.mean())


def erro_padrao_proporcao(p, n):
    return float(np.sqrt(p * (1 - p) / n))
```
```python name="erro padrão sem a raiz"
import numpy as np


def estimar_pi(n, semente):
    rng = np.random.default_rng(semente)
    pontos = rng.random((n, 2))
    dentro = (pontos ** 2).sum(axis=1) <= 1
    return float(4 * dentro.mean())


def erro_padrao_proporcao(p, n):
    return float(p * (1 - p) / n)
```
```python name="erro padrão como float do numpy"
import numpy as np


def estimar_pi(n, semente):
    rng = np.random.default_rng(semente)
    pontos = rng.random((n, 2))
    dentro = (pontos ** 2).sum(axis=1) <= 1
    return float(4 * dentro.mean())


def erro_padrao_proporcao(p, n):
    return np.sqrt(p * (1 - p) / n)
```

## Passo 6 · Leitura · Separe o sorteio da regra

Uma padaria fictícia recebe, em média, $\lambda$ clientes por minuto e consegue atender `capacidade` clientes por minuto. A fila evolui por uma regra simples: a cada minuto, chegam os novos clientes, saem os atendidos, e a fila nunca fica negativa. Cada minuto depende do anterior, então não dá para calcular o minuto 10 sem o 9. Aqui o laço é legítimo: vetorizar serve para contas independentes, e uma recorrência sobre 1440 minutos de um dia roda rápido em Python puro. O visualizador mostra a regra numa entrada fixa:

```python visualizar
chegadas = [3, 0, 4, 1, 0]
capacidade = 2
fila = 0
historico = []
for c in chegadas:
    fila = max(0, fila + c - capacidade)
    historico.append(fila)
print(historico)
```

Separe o problema em duas funções. Uma **sorteia** as chegadas: o número de chegadas por minuto costuma seguir a distribuição de Poisson, e `rng.poisson(lam, size=minutos)` sorteia todos os minutos de uma vez. A outra **aplica a regra** a uma lista qualquer de chegadas. A regra fica testável com valores exatos, como `[3, 0, 4, 1, 0]` dando `[1, 0, 2, 1, 0]`, e o sorteio fica testável por propriedades, como a média perto de $\lambda$. Se uma função só sorteasse e aplicasse a regra, o teste só poderia comparar com tolerância, e um erro de um minuto na regra passaria despercebido.

O mesmo gerador serve para medir a incerteza de uma média, com o **bootstrap**. Você tem uma amostra de 100 tempos de espera e calculou a média. Quanto essa média mudaria com outra amostra? Sorteie uma nova amostra do mesmo tamanho **com reposição** a partir da sua (alguns valores saem repetidos, outros não saem), calcule a média e repita milhares de vezes. Os percentis 2,5 e 97,5 dessas médias formam um intervalo de 95%:

```python
rng = np.random.default_rng(0)
reamostras = rng.choice(amostra, size=(5000, amostra.size))   # com reposição: o padrão
medias = reamostras.mean(axis=1)
inferior, superior = np.percentile(medias, [2.5, 97.5])
```

Sem reposição, uma reamostra do tamanho da amostra é só a amostra embaralhada, com a mesma média, e o intervalo teria largura zero; pedindo a matriz inteira com `replace=False`, vem `ValueError: Cannot take a larger sample than population when replace is False`. Cuidado também com a escala: `np.percentile` usa percentis de 0 a 100 e `np.quantile` usa de 0 a 1. `np.percentile(medias, [0.025, 0.975])` dá um intervalo colado na menor média.

## Passo 7 · Exercício · Fila e bootstrap

Escreva o sorteio das chegadas, a regra da fila e o intervalo de bootstrap.

### Instruções
1. `gerar_chegadas(lam, minutos, semente)` devolve um array com o número de chegadas de cada minuto, sorteado com `poisson` de um gerador criado a partir de `semente`, sem tocar no gerador global.
2. `simular_fila(chegadas, capacidade)` recebe uma lista ou um array de chegadas e devolve uma **lista de `int`** com o tamanho da fila ao fim de cada minuto, começando da fila vazia: `fila = max(0, fila + chegadas - capacidade)`.
3. `bootstrap_media(amostra, n_reamostras, semente)` devolve a tupla `(inferior, superior)`, dois `float`, com os percentis 2,5 e 97,5 das médias de `n_reamostras` reamostras com reposição, do mesmo tamanho da amostra.

### Código inicial
```python
import numpy as np


def gerar_chegadas(lam, minutos, semente):
    pass


def simular_fila(chegadas, capacidade):
    pass


def bootstrap_media(amostra, n_reamostras, semente):
    pass
```

### Solução
```python
import numpy as np


def gerar_chegadas(lam, minutos, semente):
    rng = np.random.default_rng(semente)
    return rng.poisson(lam, size=minutos)


def simular_fila(chegadas, capacidade):
    fila = 0
    historico = []
    for c in chegadas:
        fila = max(0, fila + int(c) - capacidade)
        historico.append(fila)
    return historico


def bootstrap_media(amostra, n_reamostras, semente):
    amostra = np.asarray(amostra, dtype=float)
    rng = np.random.default_rng(semente)
    reamostras = rng.choice(amostra, size=(n_reamostras, amostra.size))
    medias = reamostras.mean(axis=1)
    inferior, superior = np.percentile(medias, [2.5, 97.5])
    return float(inferior), float(superior)
```

### Dicas
1. Os elementos de um array numpy são inteiros do numpy, que não viram `int` do Python sozinhos.
2. Atualize a fila antes de guardar o valor do minuto.
3. Os percentis do `np.percentile` vão de 0 a 100.

### Verificação
```json
[
  { "id": "chegadas-forma", "checkpoint": 1, "kind": "expr", "expr": "list(gerar_chegadas(2.0, 60, 1).shape)", "expected": [60],
    "name": "gerar_chegadas(2.0, 60, 1) tem um valor por minuto" },
  { "id": "chegadas-media", "checkpoint": 1, "kind": "expr", "expr": "float(gerar_chegadas(3.0, 10000, 2).mean())",
    "expected": 3.0, "tolerance": 0.09, "name": "Em 10 000 minutos, a média de chegadas fica perto de λ = 3",
    "hint": "Sorteie com poisson e a média lam." },
  { "id": "chegadas-mesma-semente", "checkpoint": 1, "kind": "expr",
    "expr": "gerar_chegadas(3.0, 50, 4).tolist() == gerar_chegadas(3.0, 50, 4).tolist()", "expected": true,
    "name": "Mesma semente, mesmas chegadas", "hint": "Crie o gerador dentro da função." },
  { "id": "chegadas-sementes-diferentes", "checkpoint": 1, "kind": "expr",
    "expr": "gerar_chegadas(3.0, 50, 4).tolist() != gerar_chegadas(3.0, 50, 5).tolist()", "expected": true,
    "name": "Sementes diferentes, chegadas diferentes" },
  { "id": "chegadas-estado-global", "checkpoint": 1, "kind": "expr",
    "setup": "np.random.seed(0)\na = np.random.random()\nnp.random.seed(0)\nr = gerar_chegadas(2.0, 10, 1)",
    "expr": "np.random.random() == a", "expected": true, "name": "O gerador global do numpy não é tocado" },
  { "id": "fila-exata", "checkpoint": 2, "kind": "call", "function": "simular_fila", "args": [[3, 0, 4, 1, 0, 0], 2],
    "expected": [1, 0, 2, 1, 0, 0], "type": "list", "name": "simular_fila([3, 0, 4, 1, 0, 0], 2)",
    "hint": "A fila nunca fica negativa, e o valor de cada minuto é o depois do atendimento." },
  { "id": "fila-folgada", "checkpoint": 2, "kind": "call", "function": "simular_fila", "args": [[0, 1, 0], 3],
    "expected": [0, 0, 0], "name": "Com capacidade de sobra, a fila fica sempre vazia" },
  { "id": "fila-vazia", "checkpoint": 2, "kind": "call", "function": "simular_fila", "args": [[], 2],
    "expected": [], "type": "list", "name": "Sem minutos, a lista é vazia" },
  { "id": "fila-array", "checkpoint": 2, "kind": "expr", "expr": "simular_fila(np.array([3, 0, 4]), 2)",
    "expected": [1, 0, 2], "name": "simular_fila aceita um array e devolve int do Python",
    "hint": "Converta cada chegada com int()." },
  { "id": "bootstrap-inferior", "checkpoint": 3, "kind": "expr",
    "setup": "A = np.random.default_rng(11).normal(50, 10, 100)\nr = bootstrap_media(A, 10000, 3)",
    "expr": "r[0]", "expected": 48.45066137662627, "tolerance": 0.14,
    "name": "O limite inferior fica perto da média menos 1,96 erros padrão",
    "hint": "Reamostre com reposição e use os percentis 2,5 e 97,5." },
  { "id": "bootstrap-superior", "checkpoint": 3, "kind": "expr",
    "setup": "A = np.random.default_rng(11).normal(50, 10, 100)\nr = bootstrap_media(A, 10000, 3)",
    "expr": "r[1]", "expected": 52.04264842979114, "tolerance": 0.14,
    "name": "O limite superior fica perto da média mais 1,96 erros padrão" },
  { "id": "bootstrap-tipos", "checkpoint": 3, "kind": "expr",
    "expr": "[type(v).__name__ for v in bootstrap_media([1.0, 2.0, 3.0, 4.0], 200, 0)]",
    "expected": ["float", "float"], "name": "Os limites são float do Python" }
]
```

### Soluções erradas
```python name="gerador global nas chegadas"
import numpy as np


def gerar_chegadas(lam, minutos, semente):
    np.random.seed(semente)
    return np.random.poisson(lam, size=minutos)


def simular_fila(chegadas, capacidade):
    fila = 0
    historico = []
    for c in chegadas:
        fila = max(0, fila + int(c) - capacidade)
        historico.append(fila)
    return historico


def bootstrap_media(amostra, n_reamostras, semente):
    amostra = np.asarray(amostra, dtype=float)
    rng = np.random.default_rng(semente)
    reamostras = rng.choice(amostra, size=(n_reamostras, amostra.size))
    medias = reamostras.mean(axis=1)
    inferior, superior = np.percentile(medias, [2.5, 97.5])
    return float(inferior), float(superior)
```
```python name="gerador fora da função"
import numpy as np

rng = np.random.default_rng(0)


def gerar_chegadas(lam, minutos, semente):
    return rng.poisson(lam, size=minutos)


def simular_fila(chegadas, capacidade):
    fila = 0
    historico = []
    for c in chegadas:
        fila = max(0, fila + int(c) - capacidade)
        historico.append(fila)
    return historico


def bootstrap_media(amostra, n_reamostras, semente):
    amostra = np.asarray(amostra, dtype=float)
    gerador = np.random.default_rng(semente)
    reamostras = gerador.choice(amostra, size=(n_reamostras, amostra.size))
    medias = reamostras.mean(axis=1)
    inferior, superior = np.percentile(medias, [2.5, 97.5])
    return float(inferior), float(superior)
```
```python name="fila que fica negativa"
import numpy as np


def gerar_chegadas(lam, minutos, semente):
    rng = np.random.default_rng(semente)
    return rng.poisson(lam, size=minutos)


def simular_fila(chegadas, capacidade):
    fila = 0
    historico = []
    for c in chegadas:
        fila = fila + int(c) - capacidade
        historico.append(fila)
    return historico


def bootstrap_media(amostra, n_reamostras, semente):
    amostra = np.asarray(amostra, dtype=float)
    rng = np.random.default_rng(semente)
    reamostras = rng.choice(amostra, size=(n_reamostras, amostra.size))
    medias = reamostras.mean(axis=1)
    inferior, superior = np.percentile(medias, [2.5, 97.5])
    return float(inferior), float(superior)
```
```python name="guarda a fila antes de atualizar"
import numpy as np


def gerar_chegadas(lam, minutos, semente):
    rng = np.random.default_rng(semente)
    return rng.poisson(lam, size=minutos)


def simular_fila(chegadas, capacidade):
    fila = 0
    historico = []
    for c in chegadas:
        historico.append(fila)
        fila = max(0, fila + int(c) - capacidade)
    return historico


def bootstrap_media(amostra, n_reamostras, semente):
    amostra = np.asarray(amostra, dtype=float)
    rng = np.random.default_rng(semente)
    reamostras = rng.choice(amostra, size=(n_reamostras, amostra.size))
    medias = reamostras.mean(axis=1)
    inferior, superior = np.percentile(medias, [2.5, 97.5])
    return float(inferior), float(superior)
```
```python name="fila com inteiros do numpy"
import numpy as np


def gerar_chegadas(lam, minutos, semente):
    rng = np.random.default_rng(semente)
    return rng.poisson(lam, size=minutos)


def simular_fila(chegadas, capacidade):
    fila = 0
    historico = []
    for c in chegadas:
        fila = max(0, fila + c - capacidade)
        historico.append(fila)
    return historico


def bootstrap_media(amostra, n_reamostras, semente):
    amostra = np.asarray(amostra, dtype=float)
    rng = np.random.default_rng(semente)
    reamostras = rng.choice(amostra, size=(n_reamostras, amostra.size))
    medias = reamostras.mean(axis=1)
    inferior, superior = np.percentile(medias, [2.5, 97.5])
    return float(inferior), float(superior)
```
```python name="reamostra sem reposição"
import numpy as np


def gerar_chegadas(lam, minutos, semente):
    rng = np.random.default_rng(semente)
    return rng.poisson(lam, size=minutos)


def simular_fila(chegadas, capacidade):
    fila = 0
    historico = []
    for c in chegadas:
        fila = max(0, fila + int(c) - capacidade)
        historico.append(fila)
    return historico


def bootstrap_media(amostra, n_reamostras, semente):
    amostra = np.asarray(amostra, dtype=float)
    rng = np.random.default_rng(semente)
    reamostras = rng.choice(amostra, size=(n_reamostras, amostra.size), replace=False)
    medias = reamostras.mean(axis=1)
    inferior, superior = np.percentile(medias, [2.5, 97.5])
    return float(inferior), float(superior)
```
```python name="percentis na escala de 0 a 1"
import numpy as np


def gerar_chegadas(lam, minutos, semente):
    rng = np.random.default_rng(semente)
    return rng.poisson(lam, size=minutos)


def simular_fila(chegadas, capacidade):
    fila = 0
    historico = []
    for c in chegadas:
        fila = max(0, fila + int(c) - capacidade)
        historico.append(fila)
    return historico


def bootstrap_media(amostra, n_reamostras, semente):
    amostra = np.asarray(amostra, dtype=float)
    rng = np.random.default_rng(semente)
    reamostras = rng.choice(amostra, size=(n_reamostras, amostra.size))
    medias = reamostras.mean(axis=1)
    inferior, superior = np.percentile(medias, [0.025, 0.975])
    return float(inferior), float(superior)
```
```python name="intervalo de 90%"
import numpy as np


def gerar_chegadas(lam, minutos, semente):
    rng = np.random.default_rng(semente)
    return rng.poisson(lam, size=minutos)


def simular_fila(chegadas, capacidade):
    fila = 0
    historico = []
    for c in chegadas:
        fila = max(0, fila + int(c) - capacidade)
        historico.append(fila)
    return historico


def bootstrap_media(amostra, n_reamostras, semente):
    amostra = np.asarray(amostra, dtype=float)
    rng = np.random.default_rng(semente)
    reamostras = rng.choice(amostra, size=(n_reamostras, amostra.size))
    medias = reamostras.mean(axis=1)
    inferior, superior = np.percentile(medias, [5, 95])
    return float(inferior), float(superior)
```
```python name="limites como float do numpy"
import numpy as np


def gerar_chegadas(lam, minutos, semente):
    rng = np.random.default_rng(semente)
    return rng.poisson(lam, size=minutos)


def simular_fila(chegadas, capacidade):
    fila = 0
    historico = []
    for c in chegadas:
        fila = max(0, fila + int(c) - capacidade)
        historico.append(fila)
    return historico


def bootstrap_media(amostra, n_reamostras, semente):
    amostra = np.asarray(amostra, dtype=float)
    rng = np.random.default_rng(semente)
    reamostras = rng.choice(amostra, size=(n_reamostras, amostra.size))
    medias = reamostras.mean(axis=1)
    inferior, superior = np.percentile(medias, [2.5, 97.5])
    return inferior, superior
```

## Passo 8 · Quiz · Sementes e erro de simulação

### Pergunta
Num programa de simulação, a função `sortear_clientes(n)` começa com `np.random.seed(42)` e depois usa `np.random.randint`. Outra parte do programa, que sorteia os tempos de atendimento, também usa `np.random`. Qual é o problema?
- [ ] Nenhum: cada função tem a própria semente, e os sorteios ficam independentes
- [x] O `seed` reinicia o gerador global do programa inteiro: depois de cada chamada, os tempos de atendimento recomeçam da mesma sequência e passam a depender de quando `sortear_clientes` foi chamada
- [ ] `np.random.seed` só aceita sementes menores que 10, e 42 é ignorada
- [ ] O `randint` não usa a semente, só o `rand`
> `np.random.seed` mexe no gerador global, compartilhado por todo o programa. Cada chamada de `sortear_clientes` reinicia a sequência que a outra parte também consome, e os sorteios das duas deixam de ser independentes. Com `rng = np.random.default_rng(semente)` dentro de cada função, cada uma tem o seu gerador. As outras alternativas inventam limitações que não existem.

### Pergunta
Com 2 500 simulações, você estimou $\hat p = 0{,}30$, com erro padrão de cerca de 0,009. Para que o erro padrão caia para cerca de 0,0045, a metade, quantas simulações são necessárias?
- [ ] 5 000
- [x] 10 000
- [ ] 25 000
- [ ] 250 000
> O erro padrão é $\sqrt{\hat p(1 - \hat p)/n}$: cai com a raiz de $n$. Para dividi-lo por 2, $n$ precisa ser multiplicado por 4, de 2 500 para 10 000. Dobrar $n$ só divide o erro por $\sqrt{2} \approx 1{,}41$; 25 000 e 250 000 dividiriam o erro por cerca de 3,2 e 10.

### Pergunta
Um teste automático de uma colega confere `assert estimar_pi(10_000, 1) == 3.1452`. Ela reescreveu a função para sortear `x` e `y` em duas chamadas separadas em vez de uma matriz `(n, 2)`, e o teste quebrou, com a estimativa 3.1288. Qual é a melhor correção do teste?
- [ ] Voltar a função para a versão antiga, porque a nova está errada
- [ ] Trocar a semente até o teste voltar a passar
- [ ] Comparar com 3.1288, o novo valor
- [x] Comparar com $\pi$ usando uma tolerância de alguns erros padrão da estimativa, como $5 \cdot 4\sqrt{p(1 - p)/n}$ com $p = \pi/4$
> As duas versões estão certas: consomem o gerador em ordens diferentes, então produzem pontos diferentes e estimativas diferentes. Um teste que fixa a saída exata quebra com qualquer mudança desse tipo. O que não pode mudar é a distância ao valor teórico, e a tolerância de 5 erros padrão (cerca de 0,08 com 10 000 pontos) recusa uma função errada sem recusar uma certa.
