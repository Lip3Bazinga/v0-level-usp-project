---
slug: n3-m1-05-somatorios-logaritmos-e-crescimento
titulo: Somatórios, logaritmos e crescimento de funções
descricao: Somas aritméticas e geométricas, logaritmos como 'quantas vezes dá para dividir por 2', e comparação de taxas de crescimento.
dificuldade: intermediario
tipo: guiada
runtime: python
bibliotecas: []
xp: 100
tempo_min: 40
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
  - Calcular somatórios aritméticos e geométricos em forma fechada
  - Interpretar log₂ n como o número de divisões pela metade e calculá-lo em código
  - Ordenar funções por taxa de crescimento (constante, log, linear, n log n, quadrática, exponencial, fatorial)
---

## Passo 1 · Leitura · Laços que viram somatórios

Quantas vezes o `passos += 1` roda neste trecho, que visita cada par `(i, j)` com `j < i`?

```python
n = 6
passos = 0
for i in range(n):
    for j in range(i):
        passos += 1
print(passos, n * (n - 1) // 2)   # 15 15
```

Para `i = 0` o laço de dentro roda 0 vezes, para `i = 1` roda 1 vez, e assim por diante até `i = n - 1`, que roda $n - 1$ vezes. O total é uma **progressão aritmética**:

$$
0 + 1 + \dots + (n-1) = \sum_{i=0}^{n-1} i = \frac{n(n-1)}{2}
$$

A conta de Gauss explica a fórmula: escreva a soma de trás para frente embaixo dela e some coluna a coluna. Cada coluna dá $n - 1$ e há $n$ colunas, então o dobro da soma é $n(n-1)$. A fórmula famosa, $1 + 2 + \dots + n = \frac{n(n+1)}{2}$, vale para um laço que vai **até $n$**. Confundir as duas é um erro por um: o resultado erra por exatamente $n$.

O laço triangular faz cerca de metade das $n^2$ voltas da grade completa, e $\frac{n(n-1)}{2} = \frac{1}{2}n^2 - \frac{1}{2}n$ ainda é **quadrático**. Dobrar $n$ quase quadruplica o trabalho.

Quando cada termo é o anterior vezes uma razão $r$, a soma é uma **progressão geométrica**. Com $k$ termos começando em $a$:

$$
\sum_{i=0}^{k-1} a\,r^i = a\,\frac{r^k - 1}{r - 1} \quad (r \ne 1), \qquad\qquad a \cdot k \quad (r = 1)
$$

Ela aparece numa árvore binária completa: os níveis $0, 1, \dots, h$ têm $1, 2, 4, \dots, 2^h$ nós, num total de $2^{h+1} - 1$. O último nível sozinho tem quase metade de todos os nós.

Para $r$ inteiro, $r^k - 1$ é divisível por $r - 1$, e $n(n-1)$ é sempre par. Por isso dá para usar `//`: o resultado é inteiro e exato em qualquer tamanho. Com `/`, a conta vira `float` e perde os últimos dígitos quando passa de $2^{53} \approx 9 \cdot 10^{15}$.

## Passo 2 · Exercício · Contagens em forma fechada
modo: lacunas

Complete as lacunas (`___`). As três funções devolvem `int` exato, em tempo constante, mesmo com `n` de 12 dígitos:

- `pares_distintos(n)`: quantas vezes o corpo de `for i in range(n): for j in range(i + 1, n):` executa. Exemplo: `pares_distintos(4)` é `6`.
- `triangulo(n)`: quantas vezes o corpo de `for i in range(1, n + 1): for j in range(i):` executa. Exemplo: `triangulo(4)` é `10`.
- `soma_pg(a, r, k)`: a soma dos `k` termos $a + ar + \dots + ar^{k-1}$, com `a` e `r` inteiros e `r >= 1`. Exemplo: `soma_pg(3, 2, 4)` é `45`.

A verificação roda os laços de verdade para valores pequenos e compara com as suas fórmulas.

### Instruções
1. Em `pares_distintos`, o laço de dentro roda $n-1, n-2, \dots, 0$ vezes.
2. Em `triangulo`, o laço de dentro roda $1, 2, \dots, n$ vezes.
3. Em `soma_pg`, trate `r == 1` (todos os termos iguais) e use a fórmula fechada com exatamente `k` termos nos outros casos.

### Código inicial
```python
def pares_distintos(n):
    return n * (n ___ 1) // 2


def triangulo(n):
    return n * (n ___ 1) // 2


def soma_pg(a, r, k):
    if r == 1:
        return a * ___
    return a * (r ** ___ - 1) // (r - 1)
```

### Solução
```python
def pares_distintos(n):
    return n * (n - 1) // 2


def triangulo(n):
    return n * (n + 1) // 2


def soma_pg(a, r, k):
    if r == 1:
        return a * k
    return a * (r ** k - 1) // (r - 1)
```

### Dicas
1. Teste a fórmula com `n = 1`: um único elemento não forma nenhum par, mas o triângulo de 1 linha tem 1.
2. Com $k = 1$, a soma é só $a$. Confira se o expoente da sua fórmula dá isso.
3. Com `r == 1`, a fórmula divide por zero: os `k` termos valem `a`.

### Verificação
```json
[
  { "id": "pares-forca", "checkpoint": 1, "kind": "expr",
    "setup": "def forca(n):\n    c = 0\n    for i in range(n):\n        for j in range(i + 1, n):\n            c += 1\n    return c",
    "expr": "all(pares_distintos(n) == forca(n) for n in range(0, 60))", "expected": true,
    "name": "pares_distintos confere com o laço de n = 0 a 59",
    "hint": "Com n = 2 há um único par. A soma vai de 0 até n - 1." },
  { "id": "triangulo-forca", "checkpoint": 2, "kind": "expr",
    "setup": "def forca(n):\n    c = 0\n    for i in range(1, n + 1):\n        for j in range(i):\n            c += 1\n    return c",
    "expr": "all(triangulo(n) == forca(n) for n in range(0, 60))", "expected": true,
    "name": "triangulo confere com o laço de n = 0 a 59" },
  { "id": "grandes", "checkpoint": 1, "kind": "expr",
    "expr": "[str(pares_distintos(10**12)), str(triangulo(10**12))]", "expected": ["499999999999500000000000", "500000000000500000000000"],
    "name": "Com n = 10**12, resultados exatos (inteiros de 24 dígitos)",
    "hint": "Com /, o resultado vira float e perde os últimos dígitos." },
  { "id": "pg-forca", "checkpoint": 3, "kind": "expr",
    "expr": "all(soma_pg(a, r, k) == sum(a * r ** i for i in range(k)) for a in (1, 2, 5) for r in (1, 2, 3, 10) for k in range(0, 12))", "expected": true,
    "name": "soma_pg confere com a soma termo a termo (k de 0 a 11)",
    "hint": "Com k termos, o maior expoente é k - 1. E r == 1 precisa de um caso separado." },
  { "id": "pg-arvore", "checkpoint": 3, "kind": "expr", "expr": "[soma_pg(1, 2, 11), soma_pg(3, 2, 4), soma_pg(7, 1, 5)]", "expected": [2047, 45, 35],
    "name": "Árvore completa com 11 níveis tem 2047 nós; soma_pg(3, 2, 4) = 45; soma_pg(7, 1, 5) = 35" },
  { "id": "pg-grande", "checkpoint": 3, "kind": "expr", "expr": "[str(soma_pg(3, 2, 100)), str(soma_pg(5, 1, 10**15))]", "expected": ["3802951800684688204490109616125", "5000000000000000"],
    "name": "soma_pg(3, 2, 100) e soma_pg(5, 1, 10**15) exatos e instantâneos" }
]
```

### Soluções erradas
```python name="pares com n + 1 (a fórmula de 1 até n)"
def pares_distintos(n):
    return n * (n + 1) // 2


def triangulo(n):
    return n * (n + 1) // 2


def soma_pg(a, r, k):
    if r == 1:
        return a * k
    return a * (r ** k - 1) // (r - 1)
```
```python name="triângulo com n - 1"
def pares_distintos(n):
    return n * (n - 1) // 2


def triangulo(n):
    return n * (n - 1) // 2


def soma_pg(a, r, k):
    if r == 1:
        return a * k
    return a * (r ** k - 1) // (r - 1)
```
```python name="PG com um termo a mais"
def pares_distintos(n):
    return n * (n - 1) // 2


def triangulo(n):
    return n * (n + 1) // 2


def soma_pg(a, r, k):
    if r == 1:
        return a * k
    return a * (r ** (k + 1) - 1) // (r - 1)
```
```python name="divide com / e devolve float"
def pares_distintos(n):
    return n * (n - 1) / 2


def triangulo(n):
    return n * (n + 1) / 2


def soma_pg(a, r, k):
    if r == 1:
        return a * k
    return a * (r ** k - 1) / (r - 1)
```
```python name="PG sem o caso r == 1"
def pares_distintos(n):
    return n * (n - 1) // 2


def triangulo(n):
    return n * (n + 1) // 2


def soma_pg(a, r, k):
    return a * (r ** k - 1) // (r - 1)
```

## Passo 3 · Leitura · log₂ n: quantas vezes dá para dividir por 2

Em algoritmos, quase todo logaritmo é na base 2. A leitura que vale para o resto do curso é esta:

> $\lfloor \log_2 n \rfloor$ é quantas vezes dá para dividir $n$ por 2 (divisão inteira) até chegar a 1.

$$
16 \to 8 \to 4 \to 2 \to 1 \qquad (4 \text{ divisões}, \; 2^4 = 16)
$$

Para $n = 1000$ são 9 divisões, porque $2^9 = 512 \le 1000 < 1024 = 2^{10}$. Todo algoritmo que **descarta metade** do problema a cada passo faz uns $\log_2 n$ passos: a busca binária e a exponenciação rápida da lição anterior. Com $n = 10^9$, isso dá só uns 30 passos.

O logaritmo também conta **dígitos**. Um inteiro $n \ge 1$ tem $\lfloor \log_2 n \rfloor + 1$ bits; em Python, `n.bit_length()`. Na base 10, $\lfloor \log_{10} n \rfloor + 1$ é o número de algarismos. Trocar de base só multiplica por uma constante:

$$
\log_2 n = \frac{\log_{10} n}{\log_{10} 2} \approx 3{,}32 \cdot \log_{10} n
$$

Por isso, ao comparar crescimento, a base do logaritmo não importa: $\log_2 n$ e $\log_{10} n$ crescem no mesmo ritmo.

Calcular $\lfloor \log_2 n \rfloor$ com `math.log2` parece natural, mas passa por `float`, que arredonda:

```python
import math
print(math.log2(2**60 - 1))        # 60.0, mas o certo é 59,99...
print(int(math.log2(2**60 - 1)))   # 60: errado, a resposta é 59
print(math.log(1000, 10))          # 2.9999999999999996
print(int(math.log(1000, 10)))     # 2: errado, a resposta é 3
```

$2^{60} - 1$ não cabe nos 53 bits de mantissa de um `float` e vira $2^{60}$. E `math.log(x, base)` divide dois logaritmos aproximados. Com divisão inteira, a contagem é exata para qualquer tamanho. No visualizador, veja `n` e `divisoes` mudarem a cada volta:

```python visualizar
n = 1000
divisoes = 0
while n > 1:
    n = n // 2
    divisoes += 1
print(divisoes)
```

## Passo 4 · Exercício · log2_inteiro por divisões
modo: ordenar

Arraste as linhas para montar `log2_inteiro(n)`, que devolve $\lfloor \log_2 n \rfloor$ para um inteiro $n \ge 1$ contando divisões inteiras por 2, sem `math`. Ajuste a indentação de cada linha. Duas linhas estão sobrando. Exemplos: `log2_inteiro(16)` é `4` e `log2_inteiro(1000)` é `9`.

### Instruções
1. Comece um contador em zero.
2. Enquanto `n` for maior que 1, divida `n` por 2 com divisão inteira e conte a divisão.
3. Devolva o contador.

### Solução
```python
def log2_inteiro(n):
    passos = 0
    while n > 1:
        n = n // 2
        passos += 1
    return passos
```

### Distratores
```python
while n >= 1:
n = n / 2
```

### Dicas
1. Para `n = 1` não há divisão nenhuma: o laço nem pode começar.
2. `/` devolve `float`, que arredonda números grandes.

### Verificação
```json
[
  { "id": "pequenos", "checkpoint": 2, "kind": "expr", "expr": "[log2_inteiro(1), log2_inteiro(2), log2_inteiro(3), log2_inteiro(16), log2_inteiro(1000)]", "expected": [0, 1, 1, 4, 9],
    "name": "log2_inteiro de 1, 2, 3, 16 e 1000 é 0, 1, 1, 4 e 9", "hint": "log2_inteiro(1) é 0: nenhuma divisão." },
  { "id": "bit-length", "checkpoint": 3, "kind": "expr", "expr": "all(log2_inteiro(n) == n.bit_length() - 1 for n in range(1, 3000))", "expected": true,
    "name": "Confere com n.bit_length() - 1 de 1 a 2999" },
  { "id": "potencias-de-2", "checkpoint": 2, "kind": "expr", "expr": "[log2_inteiro(2**60 - 1), log2_inteiro(2**60), log2_inteiro(2**60 + 1)]", "expected": [59, 60, 60],
    "name": "2**60 - 1 dá 59; 2**60 e 2**60 + 1 dão 60",
    "hint": "float arredonda 2**60 - 1 para 2**60. Use só inteiros." },
  { "id": "trinta-digitos", "checkpoint": 2, "kind": "expr", "expr": "[log2_inteiro(10**30), log2_inteiro(10**9)]", "expected": [99, 29],
    "name": "log2_inteiro(10**30) é 99 e log2_inteiro(10**9) é 29" }
]
```

### Soluções erradas
```python name="while n >= 1 conta uma divisão a mais"
def log2_inteiro(n):
    passos = 0
    while n >= 1:
        n = n // 2
        passos += 1
    return passos
```
```python name="divide com / (float)"
def log2_inteiro(n):
    passos = 0
    while n > 1:
        n = n / 2
        passos += 1
    return passos
```
```python name="usa math.log2"
import math


def log2_inteiro(n):
    return int(math.log2(n))
```
```python name="conta os bits em vez das divisões"
def log2_inteiro(n):
    passos = 0
    while n > 0:
        n = n // 2
        passos += 1
    return passos
```

## Passo 5 · Leitura · A hierarquia de crescimento

Como o custo cresce quando $n$ passa de 10 para mil e para um milhão?

| Classe | Função | $n = 10$ | $n = 10^3$ | $n = 10^6$ |
| :--- | :---: | :---: | :---: | :---: |
| constante | $1$ | $1$ | $1$ | $1$ |
| logarítmica | $\log_2 n$ | $3{,}3$ | $10$ | $20$ |
| raiz | $\sqrt{n}$ | $3{,}2$ | $32$ | $1\,000$ |
| linear | $n$ | $10$ | $10^3$ | $10^6$ |
| $n \log n$ | $n \log_2 n$ | $33$ | $10^4$ | $2 \cdot 10^7$ |
| quadrática | $n^2$ | $100$ | $10^6$ | $10^{12}$ |
| cúbica | $n^3$ | $10^3$ | $10^9$ | $10^{18}$ |
| exponencial | $2^n$ | $1\,024$ | $10^{301}$ | — |
| fatorial | $n!$ | $3{,}6 \cdot 10^6$ | $4 \cdot 10^{2567}$ | — |

Dizer que $f$ cresce **mais devagar** que $g$ quer dizer que a razão $f(n)/g(n)$ vai a zero quando $n$ cresce. Não quer dizer que $f(n) < g(n)$ para todo $n$. Um algoritmo que faz $100\,n \log_2 n$ operações perde para um que faz $n^2$ enquanto $n < 997$. A partir daí ganha sempre, e por cada vez mais. Constantes decidem quem vence para entradas pequenas; a classe decide para as grandes. O próximo módulo dá nome a isso: a notação $O$ fala do comportamento **a partir de algum $n_0$**.

```python
import math
for n in (10, 100, 1000, 10**4):
    print(n, round(100 * n * math.log2(n)), n * n)
# 10 3322 100
# 100 66439 10000
# 1000 996578 1000000
# 10000 13287712 100000000
```

Três regras de bolso:

1. **$n \log n$ fica muito mais perto de $n$ do que de $n^2$.** Para $n = 10^6$, são $2 \cdot 10^7$ operações contra $10^{12}$.
2. **Python puro faz da ordem de $10^7$ operações simples por segundo.** Com $n = 10^5$, um algoritmo $n \log n$ (uns $1{,}7 \cdot 10^6$ passos) roda em uma fração de segundo; um $n^2$ ($10^{10}$ passos) leva perto de vinte minutos.
3. **Exponencial e fatorial só servem para $n$ minúsculo.** $2^n$ passa de $10^7$ em $n = 24$, e $n!$ em $n = 11$. Força bruta sobre subconjuntos ou ordens raramente passa de $n \approx 20$.

Dentro de um mesmo "tipo" também há ordem: $n^2$ cresce mais devagar que $n^3$, e $2^n$ mais devagar que $3^n$ e que $n!$. E toda potência $n^c$, por maior que seja $c$, acaba abaixo de $2^n$. Já qualquer $\log n$ acaba abaixo de $\sqrt{n}$.

## Passo 6 · Previsão · Quem é menor?

O programa compara três custos, $10n$, $n^2$ e $2^n$, para alguns valores de $n$, e imprime os três e o menor. Leia sem executar e digite exatamente o que ele imprime.

### Código
```python
for n in [1, 2, 3, 5, 10, 20]:
    linear = 10 * n
    quadratico = n * n
    exponencial = 2 ** n
    menor = min(linear, quadratico, exponencial)
    print(n, linear, quadratico, exponencial, menor)
```

### Dicas
1. Calcule as três colunas linha a linha; $2^{10} = 1024$ e $2^{20} = 1024^2$.
2. Para $n$ pequeno, a função "mais rápida" nem sempre é a maior.

### Saída esperada
```text
1 10 1 2 1
2 20 4 4 4
3 30 9 8 8
5 50 25 32 25
10 100 100 1024 100
20 200 400 1048576 200
```

## Passo 7 · Exercício · A partir de quando um algoritmo vence

Escreva `a_partir_de(custo_a, custo_b, limite)`. `custo_a` e `custo_b` são funções que recebem `n` e devolvem o custo de dois algoritmos. Devolva o **menor** `n0` entre 1 e `limite` tal que `custo_a(n) <= custo_b(n)` para **todo** `n` de `n0` até `limite`, inclusive. Se `custo_a(limite) > custo_b(limite)`, devolva `None`.

Na previsão, $2^n$ e $n^2$ se cruzam mais de uma vez: $n^2 \le 2^n$ vale em 1 e 2, falha em 3 e volta a valer de 4 em diante. Por isso `a_partir_de(lambda n: n * n, lambda n: 2 ** n, 100)` é `4`, e não `1`.

Cada função de custo pode ser chamada no máximo uma vez por valor de `n`.

### Instruções
1. Descubra o último `n` da faixa em que `custo_a(n) > custo_b(n)`. A resposta começa logo depois dele.
2. Confira a faixa inteira, inclusive o próprio `limite`; devolva `None` se `custo_a` perde em `limite`.
3. Faça uma única passada pela faixa.

### Código inicial
```python
def a_partir_de(custo_a, custo_b, limite):
    pass
```

### Solução
```python
def a_partir_de(custo_a, custo_b, limite):
    resposta = None
    for n in range(limite, 0, -1):
        if custo_a(n) > custo_b(n):
            break
        resposta = n
    return resposta
```

### Dicas
1. O primeiro `n` em que `custo_a` vence não serve: ele pode voltar a perder depois.
2. Percorrer de `limite` para baixo encontra direto a última derrota de `custo_a`.
3. Empate conta como vitória de `custo_a` (`<=`).

### Verificação
```json
[
  { "id": "n2-vs-2n", "checkpoint": 1, "kind": "expr", "expr": "a_partir_de(lambda n: n * n, lambda n: 2 ** n, 100)", "expected": 4,
    "name": "n² fica abaixo de 2^n a partir de 4 (e não de 1)",
    "hint": "Em n = 3, n² = 9 passa de 2³ = 8. A resposta precisa vir depois disso." },
  { "id": "n3-vs-2n", "checkpoint": 1, "kind": "expr", "expr": "a_partir_de(lambda n: n ** 3, lambda n: 2 ** n, 200)", "expected": 10,
    "name": "n³ fica abaixo de 2^n a partir de 10" },
  { "id": "nlogn-vs-n2", "checkpoint": 1, "kind": "expr", "setup": "import math",
    "expr": "a_partir_de(lambda n: 100 * n * math.log2(n), lambda n: n * n, 5000)", "expected": 997,
    "name": "100·n·log₂ n fica abaixo de n² a partir de 997" },
  { "id": "empate", "checkpoint": 2, "kind": "expr", "expr": "a_partir_de(lambda n: 4 * n, lambda n: n * n, 50)", "expected": 4,
    "name": "4n contra n²: empate em 4 já conta", "hint": "A condição é <=: no empate, custo_a não perde." },
  { "id": "sempre", "checkpoint": 2, "kind": "expr", "expr": "a_partir_de(lambda n: n, lambda n: n * n, 50)", "expected": 1,
    "name": "n nunca perde para n²: a resposta é 1" },
  { "id": "nunca", "checkpoint": 2, "kind": "expr", "expr": "[a_partir_de(lambda n: 2 ** n, lambda n: n ** 3, 50) is None, a_partir_de(lambda n: 0 if n < 20 else 1, lambda n: 0, 20) is None]", "expected": [true, true],
    "name": "Se custo_a perde em limite, devolve None (inclusive quando só perde em limite)",
    "hint": "limite também faz parte da faixa." },
  { "id": "uma-passada", "checkpoint": 3, "kind": "expr",
    "setup": "chamadas = [0]\ndef a(n):\n    chamadas[0] += 1\n    return 1 if n == 2990 else 0\ndef b(n):\n    return 0\nr = a_partir_de(a, b, 3000)",
    "expr": "[r, chamadas[0] <= 3000]", "expected": [2991, true],
    "name": "Com limite 3000, chama custo_a no máximo 3000 vezes",
    "hint": "Testar 'todos daqui em diante' para cada candidato chama as funções milhões de vezes. Uma passada basta." }
]
```

### Soluções erradas
```python name="devolve o primeiro n em que custo_a vence"
def a_partir_de(custo_a, custo_b, limite):
    for n in range(1, limite + 1):
        if custo_a(n) <= custo_b(n):
            return n
    return None
```
```python name="devolve a última derrota, sem o + 1"
def a_partir_de(custo_a, custo_b, limite):
    if custo_a(limite) > custo_b(limite):
        return None
    ultima_derrota = 1
    for n in range(1, limite + 1):
        if custo_a(n) > custo_b(n):
            ultima_derrota = n
    return ultima_derrota
```
```python name="comparação estrita trata empate como derrota"
def a_partir_de(custo_a, custo_b, limite):
    resposta = None
    for n in range(limite, 0, -1):
        if custo_a(n) >= custo_b(n):
            break
        resposta = n
    return resposta
```
```python name="range sem limite: não confere o próprio limite"
def a_partir_de(custo_a, custo_b, limite):
    resposta = None
    for n in range(limite - 1, 0, -1):
        if custo_a(n) > custo_b(n):
            break
        resposta = n
    return resposta
```
```python name="confere a faixa inteira para cada candidato"
def a_partir_de(custo_a, custo_b, limite):
    for n0 in range(1, limite + 1):
        if all(custo_a(n) <= custo_b(n) for n in range(n0, limite + 1)):
            return n0
    return None
```

## Passo 8 · Quiz · Crescimento e logaritmos

### Pergunta
Um algoritmo faz exatamente $1 + 2 + \dots + n$ operações. Para $n$ grande, quando $n$ é multiplicado por 10, o número de operações é multiplicado por aproximadamente:
- [ ] 10, porque a soma tem um índice só, de 1 até $n$.
- [ ] 50, porque a soma é $n^2$ dividido por 2.
- [x] 100, porque $\frac{n(n+1)}{2} \approx \frac{1}{2}n^2$ é quadrático.
- [ ] $\log_2 10 \approx 3{,}3$.
> O termo dominante é $\frac{1}{2}n^2$, e $\frac{1}{2}(10n)^2 = 100 \cdot \frac{1}{2}n^2$. A constante $\frac{1}{2}$ aparece dos dois lados e se cancela na razão: ela não muda o fator 100.

### Pergunta
Qual lista está em ordem de crescimento, da função que cresce mais devagar para a que cresce mais rápido?
- [ ] $\sqrt{n}$, $\log_2 n$, $n$, $n \log_2 n$, $n^2$, $2^n$, $n!$
- [x] $\log_2 n$, $\sqrt{n}$, $n$, $n \log_2 n$, $n^2$, $2^n$, $n!$
- [ ] $\log_2 n$, $\sqrt{n}$, $n$, $n^2$, $n \log_2 n$, $2^n$, $n!$
- [ ] $\log_2 n$, $\sqrt{n}$, $n$, $n \log_2 n$, $n^2$, $n!$, $2^n$
> Para $n = 10^6$: $\log_2 n = 20$, $\sqrt{n} = 1000$, $n \log_2 n \approx 2 \cdot 10^7$, $n^2 = 10^{12}$. Já $n! = 1 \cdot 2 \cdots n$ tem quase todos os fatores maiores que 2, e passa $2^n$ a partir de $n = 4$. Para $n$ pequeno, $\sqrt{n}$ pode ficar abaixo de $\log_2 n$ (em $n = 16$ os dois valem 4), mas a partir daí $\sqrt{n}$ passa à frente para sempre.

### Pergunta
Quantas voltas este laço dá para `n = 10**6`?
```python
voltas = 0
while n > 1:
    n //= 3
    voltas += 1
```
- [ ] 20, porque é um laço logarítmico, e $\log_2 10^6 \approx 20$.
- [x] 12, porque $3^{12} = 531\,441 \le 10^6 < 3^{13}$.
- [ ] 333 333, porque cada volta divide por 3.
- [ ] 1 000 000, porque o laço depende de $n$.
> Dividir por 3 é como dividir por 2: o laço dá $\lfloor \log_3 n \rfloor$ voltas, uns 12 para um milhão. A classe é logarítmica nas duas bases, e $\log_3 n = \log_2 n / \log_2 3 \approx 0{,}63 \log_2 n$: trocar a base só muda a constante.
