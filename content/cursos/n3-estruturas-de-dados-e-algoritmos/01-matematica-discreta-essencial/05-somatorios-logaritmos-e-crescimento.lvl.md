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

## Passo 1 · Leitura · Somas aritméticas e geométricas na análise de código

Toda vez que você escreve um laço `for` dentro de outro em que o laço interno depende do índice externo `i`, a quantidade total de passos é um **somatório**. Veja este trecho clássico que compara todos os pares `(i, j)` com `j < i`:

```python
passos = 0
for i in range(n):
    for j in range(i):
        passos += 1
```

Para `i = 0`, o laço interno roda $0$ vezes; para `i = 1`, roda $1$ vez; para `i = n - 1`, roda $n - 1$ vezes. O total de passos é uma **progressão aritmética (PA)**. Pela fórmula de Gauss, a soma de $n$ termos em progressão aritmética com primeiro termo $a_1$ e último termo $a_n$ vale:

$$
S_{\text{PA}} = \sum_{k=1}^{n} a_k = \frac{n \cdot (a_1 + a_n)}{2}
$$

No caso clássico $1 + 2 + \dots + n = \frac{n(n+1)}{2} = \frac{1}{2}n^2 + \frac{1}{2}n$. É por isso que um laço triangular — mesmo executando metade das iterações de uma grade completa $n \times n$ — ainda cresce **quadraticamente** com $n^2$!

#### Progressão geométrica (PG)

Quando cada termo é multiplicado por uma razão constante $r$ (como o número de nós em cada nível de uma árvore binária: $1, 2, 4, 8, \dots, 2^{k-1}$), temos uma **progressão geométrica** de $n$ termos com termo inicial $a$ e razão $r$:

$$
S_{\text{PG}} = \sum_{k=0}^{n-1} a \cdot r^k = \begin{cases}
a \cdot n, & \text{se } r = 1 \\
a \cdot \frac{r^n - 1}{r - 1}, & \text{se } r \ne 1
\end{cases}
$$

Para $a = 1$ e $r = 2$, a soma $1 + 2 + 4 + \dots + 2^{n-1}$ vale exatamente $2^n - 1$: o último nível de uma árvore binária completa tem quase tantos nós quanto **todos os níveis anteriores somados**!

## Passo 2 · Exercício · Somas aritmética e geométrica em forma fechada

Implemente `soma_aritmetica(a1, an, n)` e `soma_geometrica(a, r, n)` usando **apenas fórmulas em forma fechada** (sem laços `for` ou `while`), devolvendo `float`.

### Instruções
1. Em `soma_aritmetica(a1, an, n)`, devolva `float(n * (a1 + an) / 2)`.
2. Em `soma_geometrica(a, r, n)`, trate o caso especial `r == 1` devolvendo `float(a * n)`.
3. Quando `r != 1`, devolva `float(a * (r ** n - 1) / (r - 1))`.

### Código inicial
```python
def soma_aritmetica(a1, an, n):
    # Calcule a soma da PA em forma fechada (sem laços)
    pass


def soma_geometrica(a, r, n):
    # Calcule a soma da PG em forma fechada (sem laços)
    pass
```

### Solução
```python
def soma_aritmetica(a1, an, n):
    return float(n * (a1 + an) / 2)


def soma_geometrica(a, r, n):
    if r == 1:
        return float(a * n)
    return float(a * (r ** n - 1) / (r - 1))
```

### Dicas
1. A fórmula fechada não usa `for` nem `while`: ela faz apenas algumas operações aritméticas em tempo constante.
2. Em `soma_geometrica`, testar `if r == 1:` antes de dividir por `r - 1` evita `ZeroDivisionError`.

### Verificação
```json
[
  {
    "id": "sem-for",
    "checkpoint": 1,
    "kind": "source",
    "rule": { "type": "not_uses", "construct": "for" },
    "name": "Não usa laço for (fórmula fechada)"
  },
  {
    "id": "sem-while",
    "checkpoint": 1,
    "kind": "source",
    "rule": { "type": "not_uses", "construct": "while" },
    "name": "Não usa laço while (fórmula fechada)"
  },
  {
    "id": "pa-gauss-100",
    "checkpoint": 1,
    "kind": "call",
    "function": "soma_aritmetica",
    "args": [1, 100, 100],
    "expected": 5050.0,
    "tolerance": 1e-6,
    "name": "soma_aritmetica(1, 100, 100) devolve 5050.0"
  },
  {
    "id": "pa-gigante",
    "checkpoint": 1,
    "kind": "call",
    "function": "soma_aritmetica",
    "args": [1, 1000000, 1000000],
    "expected": 500000500000.0,
    "tolerance": 1e-2,
    "name": "soma_aritmetica para n = 1.000.000 calcula instantaneamente"
  },
  {
    "id": "pg-potencias-2",
    "checkpoint": 3,
    "kind": "call",
    "function": "soma_geometrica",
    "args": [1, 2, 10],
    "expected": 1023.0,
    "tolerance": 1e-6,
    "name": "soma_geometrica(1, 2, 10) devolve 1023.0"
  },
  {
    "id": "pg-razao-1",
    "checkpoint": 2,
    "kind": "call",
    "function": "soma_geometrica",
    "args": [5, 1, 8],
    "expected": 40.0,
    "tolerance": 1e-6,
    "name": "soma_geometrica(5, 1, 8) trata r == 1 e devolve 40.0",
    "hint": "Quando r == 1, todos os n termos valem a, logo a soma é a * n."
  },
  {
    "id": "pg-fracionaria",
    "checkpoint": 3,
    "kind": "call",
    "function": "soma_geometrica",
    "args": [1, 0.5, 4],
    "expected": 1.875,
    "tolerance": 1e-6,
    "name": "soma_geometrica(1, 0.5, 4) devolve 1.875"
  }
]
```

### Soluções erradas
```python name="não trata r == 1 na PG (divisão por zero)"
def soma_aritmetica(a1, an, n):
    return float(n * (a1 + an) / 2)


def soma_geometrica(a, r, n):
    return float(a * (r ** n - 1) / (r - 1))
```
```python name="usa laço for em vez de forma fechada"
def soma_aritmetica(a1, an, n):
    passo = (an - a1) / (n - 1) if n > 1 else 0
    soma = 0.0
    for i in range(n):
        soma += a1 + i * passo
    return soma


def soma_geometrica(a, r, n):
    soma = 0.0
    for i in range(n):
        soma += a * (r ** i)
    return float(soma)
```

## Passo 3 · Leitura · O que significa $\log_2 n$ na computação?

Em algoritmos, quase todo logaritmo é na **base 2** ($\log_2 n$). A intuição mais importante do curso inteiro sobre $\log_2 n$ é:

> **$\lfloor\log_2 n\rfloor$ é quantas vezes podemos dividir $n$ inteiramente por $2$ até chegar a $1$.**

Por exemplo, começando com $n = 16$:
$$16 \xrightarrow{\div 2} 8 \xrightarrow{\div 2} 4 \xrightarrow{\div 2} 2 \xrightarrow{\div 2} 1 \quad (4 \text{ divisões, pois } 2^4 = 16)$$

Sempre que um algoritmo **descarta metade do problema a cada passo** (como a busca binária em uma lista ordenada ou a exponenciação modular que acabamos de ver), seu número de passos é $\approx \log_2 n$.

Note também que mudar a base do logaritmo só multiplica o valor por uma constante fixa, pois $\log_2 n = \frac{\log_{10} n}{\log_{10} 2} \approx 3{,}32 \cdot \log_{10} n$. Como um número de $d$ dígitos decimais satisfaz $n \approx 10^d$, o logaritmo na base 2 de $n$ é simplesmente proporcional à **quantidade de dígitos (ou bits)** usados para escrever $n$.

Veja no visualizador como contar as divisões sucessivas por 2 calcula $\lfloor\log_2 n\rfloor$:

```python visualizar
def log2_inteiro(n):
    divisoes = 0
    while n > 1:
        n //= 2
        divisoes += 1
    return divisoes

print("log2_inteiro(16) =", log2_inteiro(16))
print("log2_inteiro(1000) =", log2_inteiro(1000))
```

## Passo 4 · Exercício · Calculando `log2_inteiro(n)` por divisões
modo: ordenar

Ordene e indente as linhas para montar a função `log2_inteiro(n)`, que recebe um inteiro positivo $n \ge 1$ e devolve $\lfloor\log_2 n\rfloor$ contando quantas divisões inteiras por 2 são necessárias até que `n` não seja mais maior que `1`. Há duas linhas distratoras que não devem ser usadas.

### Instruções
1. Inicialize o contador `passos = 0`.
2. Enquanto `n > 1`, atualize `n = n // 2` e incremente `passos += 1`.
3. Devolva `passos` ao final do laço.

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
n = n - 2
```

### Dicas
1. O laço deve parar quando `n` chegar a `1` (portanto a condição é `while n > 1:`).
2. Dentro do laço, divida `n` inteiramente por `2` (`n = n // 2`) e some `1` a `passos`.

### Verificação
```json
[
  {
    "id": "log2-1",
    "checkpoint": 1,
    "kind": "call",
    "function": "log2_inteiro",
    "args": [1],
    "expected": 0,
    "name": "log2_inteiro(1) devolve 0"
  },
  {
    "id": "log2-16",
    "checkpoint": 2,
    "kind": "call",
    "function": "log2_inteiro",
    "args": [16],
    "expected": 4,
    "name": "log2_inteiro(16) devolve 4"
  },
  {
    "id": "log2-1000",
    "checkpoint": 3,
    "kind": "call",
    "function": "log2_inteiro",
    "args": [1000],
    "expected": 9,
    "name": "log2_inteiro(1000) devolve 9 (pois 2^9 = 512 <= 1000 < 1024)"
  },
  {
    "id": "log2-milhao",
    "checkpoint": 3,
    "kind": "call",
    "function": "log2_inteiro",
    "args": [1000000],
    "expected": 19,
    "name": "log2_inteiro(1000000) devolve 19"
  }
]
```

### Soluções erradas
```python name="subtrai 2 em vez de dividir por 2"
def log2_inteiro(n):
    passos = 0
    while n > 1:
        n = n - 2
        passos += 1
    return passos
```
```python name="condição n >= 1 faz uma divisão a mais"
def log2_inteiro(n):
    passos = 0
    while n >= 1:
        n = n // 2
        passos += 1
    return passos
```

## Passo 5 · Leitura · Hierarquia de crescimento e a regra de $10^7$ operações/segundo

Como diferentes funções de custo se comportam quando a entrada $n$ cresce de $10$ para $1\,000$ e para $1\,000\,000$? Compare a tabela abaixo:

| Classe | Expressão | $n = 10$ | $n = 1\,000$ | $n = 1\,000\,000$ |
| :--- | :---: | :---: | :---: | :---: |
| Constante | $1$ | $1$ | $1$ | $1$ |
| Logarítmica | $\log_2 n$ | $\approx 3{,}3$ | $\approx 10$ | $\approx 20$ |
| Raiz quadrada | $\sqrt{n}$ | $\approx 3{,}2$ | $\approx 31{,}6$ | $1\,000$ |
| Linear | $n$ | $10$ | $1\,000$ | $10^6$ |
| Linearítmica | $n \log_2 n$ | $\approx 33$ | $\approx 10^4$ | $\approx 2 \times 10^7$ |
| Quadrática | $n^2$ | $100$ | $10^6$ | $10^{12}$ |
| Cúbica | $n^3$ | $1\,000$ | $10^9$ | $10^{18}$ |
| Exponencial | $2^n$ | $1\,024$ | $\approx 10^{301}$ | inimaginável |
| Fatorial | $n!$ | $3\,628\,800$ | $\approx 4 \times 10^{2567}$ | inimaginável |

#### Três lições práticas dessa tabela

1. **$n \log_2 n$ está muito mais perto de $n$ do que de $n^2$:** para $n = 1\,000\,000$, enquanto $n \log_2 n$ faz cerca de $20$ milhões de operações (frações de segundo), $n^2$ exige $1$ trilhão de operações ($50\,000\times$ mais lento!).
2. **A regra de bolso de 1 segundo em Python:** um laço simples em Python puro executa na faixa de **$10^7$ ($10\,000\,000$) operações por segundo**. Assim, se $n = 10^5$, um algoritmo $O(n \log n)$ ($\approx 1{,}7 \times 10^6$ operações) roda com folga em menos de 1 segundo, mas um algoritmo $O(n^2)$ ($10^{10}$ operações) levaria vários minutos.
3. **A barreira exponencial e fatorial:** $2^n$ ultrapassa $10^7$ já em $n = 24$, e $n!$ ultrapassa $10^7$ em $n = 11$. Algoritmos de força bruta $O(2^n)$ ou $O(n!)$ só são viáveis para entradas minúsculas ($n \le 20$ ou $n \le 10$).

## Passo 6 · Exercício · Ordenando funções e estimando o que cabe em 1 segundo

Implemente duas funções:
- `ordenar_por_crescimento(expressoes)`: recebe uma lista de strings representando classes de crescimento (escolhidas entre `"1"`, `"log n"`, `"sqrt(n)"`, `"n"`, `"n log n"`, `"n^2"`, `"n^3"`, `"2^n"`, `"n!"`) e devolve uma nova lista com essas strings ordenadas da que cresce **mais devagar** para a que cresce **mais rápido** quando $n \to \infty$.
- `cabe_em_um_segundo(funcao, n, limite=10_000_000)`: recebe o nome da classe `funcao` (uma das strings acima), o tamanho da entrada `n` ($n \ge 1$) e o `limite` de operações por segundo (padrão `10_000_000`), e devolve `True` se o número estimado de operações para aquele `n` for **menor ou igual** a `limite`, ou `False` caso contrário. Use `math.log2(n)`, `math.sqrt(n)` e `math.factorial(n)`.

### Instruções
1. Defina a ordem assintótica correta das 9 expressões: `["1", "log n", "sqrt(n)", "n", "n log n", "n^2", "n^3", "2^n", "n!"]`.
2. Em `ordenar_por_crescimento(expressoes)`, ordene a lista recebida segundo a posição de cada expressão nessa hierarquia.
3. Em `cabe_em_um_segundo(funcao, n, limite=10_000_000)`, calcule o custo para `n` (cuidando para não calcular `2 ** n` ou `factorial(n)` diretamente se `n` for grande, ex.: para `"2^n"` se `n > 60` já ultrapassa o limite; para `"n!"` se `n > 20` já ultrapassa o limite) e devolva `bool(custo <= limite)`.

### Código inicial
```python
import math

HIERARQUIA = ["1", "log n", "sqrt(n)", "n", "n log n", "n^2", "n^3", "2^n", "n!"]


def ordenar_por_crescimento(expressoes):
    # Devolva uma nova lista ordenada da menor para a maior taxa de crescimento
    pass


def cabe_em_um_segundo(funcao, n, limite=10_000_000):
    # Devolva True se o número de operações para n for <= limite, senão False
    pass
```

### Solução
```python
import math

HIERARQUIA = ["1", "log n", "sqrt(n)", "n", "n log n", "n^2", "n^3", "2^n", "n!"]


def ordenar_por_crescimento(expressoes):
    return sorted(expressoes, key=lambda e: HIERARQUIA.index(e))


def cabe_em_um_segundo(funcao, n, limite=10_000_000):
    if funcao == "1":
        custo = 1
    elif funcao == "log n":
        custo = math.log2(n)
    elif funcao == "sqrt(n)":
        custo = math.sqrt(n)
    elif funcao == "n":
        custo = n
    elif funcao == "n log n":
        custo = n * math.log2(n)
    elif funcao == "n^2":
        custo = n ** 2
    elif funcao == "n^3":
        custo = n ** 3
    elif funcao == "2^n":
        if n > 60:
            return False
        custo = 2 ** n
    elif funcao == "n!":
        if n > 20:
            return False
        custo = math.factorial(n)
    else:
        raise ValueError(f"Função desconhecida: {funcao}")
    return bool(custo <= limite)
```

### Dicas
1. Você pode passar `key=lambda e: HIERARQUIA.index(e)` para `sorted(expressoes, ...)`.
2. Para `"2^n"` e `"n!"`, se o teste passar `n = 1000`, tentar calcular `math.factorial(1000)` é desnecessário: qualquer `n > 20` já tem $n! > 2{,}4 \times 10^{18} > 10^7$, então você pode retornar `False` imediatamente.

### Verificação
```json
[
  {
    "id": "ordena-todas",
    "checkpoint": 1,
    "kind": "call",
    "function": "ordenar_por_crescimento",
    "args": [["2^n", "n", "1", "n^2", "log n", "n!", "n log n", "sqrt(n)", "n^3"]],
    "expected": ["1", "log n", "sqrt(n)", "n", "n log n", "n^2", "n^3", "2^n", "n!"],
    "name": "Ordena todas as 9 classes de crescimento corretamente"
  },
  {
    "id": "ordena-subconjunto",
    "checkpoint": 2,
    "kind": "call",
    "function": "ordenar_por_crescimento",
    "args": [["n^2", "n log n", "2^n", "sqrt(n)"]],
    "expected": ["sqrt(n)", "n log n", "n^2", "2^n"],
    "name": "Ordena um subconjunto de classes corretamente"
  },
  {
    "id": "cabe-nlogn-100k",
    "checkpoint": 3,
    "kind": "call",
    "function": "cabe_em_um_segundo",
    "args": ["n log n", 100000],
    "expected": true,
    "type": "bool",
    "name": "n log n para n = 100.000 (~1,66 * 10^6 ops) cabe em 1 segundo"
  },
  {
    "id": "nao-cabe-n2-100k",
    "checkpoint": 3,
    "kind": "call",
    "function": "cabe_em_um_segundo",
    "args": ["n^2", 100000],
    "expected": false,
    "type": "bool",
    "name": "n^2 para n = 100.000 (10^10 ops) não cabe em 1 segundo"
  },
  {
    "id": "cabe-2n-20-vs-30",
    "checkpoint": 3,
    "kind": "expr",
    "expr": "[cabe_em_um_segundo('2^n', 23), cabe_em_um_segundo('2^n', 24), cabe_em_um_segundo('n!', 10), cabe_em_um_segundo('n!', 11)]",
    "expected": [true, false, true, false],
    "name": "Identifica os limiares exatos para 2^n (23 vs 24) e n! (10 vs 11)"
  }
]
```

### Soluções erradas
```python name="inverte n log n com n^2"
import math

HIERARQUIA = ["1", "log n", "sqrt(n)", "n", "n^2", "n log n", "n^3", "2^n", "n!"]


def ordenar_por_crescimento(expressoes):
    return sorted(expressoes, key=lambda e: HIERARQUIA.index(e))


def cabe_em_um_segundo(funcao, n, limite=10_000_000):
    return True
```
```python name="confunde n log n com n^2 no cálculo de cabe_em_um_segundo"
import math

HIERARQUIA = ["1", "log n", "sqrt(n)", "n", "n log n", "n^2", "n^3", "2^n", "n!"]


def ordenar_por_crescimento(expressoes):
    return sorted(expressoes, key=lambda e: HIERARQUIA.index(e))


def cabe_em_um_segundo(funcao, n, limite=10_000_000):
    if funcao == "n log n":
        return bool(n * n <= limite)
    return bool(n <= limite)
```

## Passo 7 · Quiz · Comparando taxas de crescimento

### Pergunta
Um algoritmo realiza exatamente $1 + 2 + 3 + \dots + n$ operações para uma entrada de tamanho $n$. Quando $n$ é multiplicado por $10$ (para $n$ grande), o tempo de execução desse algoritmo é multiplicado aproximadamente por:
- [ ] $10$, porque o somatório tem apenas um índice variando de $1$ até $n$.
- [ ] $20$, porque a soma é dividida por $2$.
- [x] $100$, porque $\frac{n(n+1)}{2} \approx \frac{1}{2}n^2$ cresce com o quadrado de $n$ ($(10n)^2 = 100n^2$).
- [ ] $\log_2 10 \approx 3{,}32$.
> Como $\sum_{k=1}^n k = \frac{n(n+1)}{2} = \frac{1}{2}n^2 + \frac{1}{2}n$, o termo dominante é quadrático ($n^2$). Multiplicar $n$ por $10$ multiplica o número de operações por $\approx 10^2 = 100$.

### Pergunta
Qual das afirmações abaixo compara corretamente as taxas de crescimento para valores grandes de $n$?
- [ ] $n \log_2 n$ cresce quase na mesma velocidade que $n^2$, pois $\log_2 n$ e $n$ crescem indefinidamente.
- [ ] $\log_{10} n$ pertence a uma classe de crescimento assintótico estritamente menor que $\log_2 n$.
- [x] $\sqrt{n}$ cresce mais rápido que $\log_2 n$, mas mais devagar que $n$; além disso, $n!$ cresce mais rápido que $2^n$.
- [ ] $2^n$ cresce mais rápido que $n!$, porque a base $2$ é exponencial.
> Para todo $n \ge 4$, na fórmula de $n! = 1 \cdot 2 \cdot 3 \cdot 4 \cdots n$ quase todos os fatores são muito maiores que $2$, fazendo $n!$ crescer muito mais rápido que $2^n = 2 \cdot 2 \cdots 2$. E como $\log_2 n$ cresce apenas em $+1$ quando $n$ dobra, qualquer potência positiva como $\sqrt{n} = n^{0{,}5}$ domina $\log_2 n$ para $n$ grande.
