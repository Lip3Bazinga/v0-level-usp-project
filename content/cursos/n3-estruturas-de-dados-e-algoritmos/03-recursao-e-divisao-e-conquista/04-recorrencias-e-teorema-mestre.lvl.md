---
slug: n3-m3-04-recorrencias-e-teorema-mestre
titulo: Recorrências e o Teorema Mestre
descricao: Resolver T(n) = aT(n/b) + f(n) pelos três casos do Teorema Mestre e por árvore de recursão, com verificação numérica.
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
  - Identificar a, b e f(n) em uma recorrência a partir do código
  - Aplicar os três casos do Teorema Mestre a recorrências comuns
  - Verificar numericamente uma solução de recorrência simulando T(n)
---

## Passo 1 · Leitura · Árvores de recursão e os três casos do Teorema Mestre

Quase todo algoritmo de divisão e conquista tem uma recorrência da forma:

$$
T(n) = a \cdot T(n / b) + f(n), \quad \text{com } a \ge 1, \; b > 1
$$

Onde:
- **$a$** é o **número de chamadas recursivas** feitas em cada passo;
- **$b$** é o **fator de redução** pelo qual o tamanho da entrada $n$ é dividido em cada subproblema ($n / b$);
- **$f(n) = \Theta(n^k)$** é o **trabalho de dividir e combinar** fora das chamadas recursivas.

#### De onde vem a fórmula? A disputa entre a raiz e as folhas

Imagine a árvore de recursão de altura $\log_b n$:
- No nível $0$ (a raiz), há $1$ problema de tamanho $n$, custando $f(n) = n^k$.
- No último nível (as folhas), após $\log_b n$ divisões, existem $a^{\log_b n} = n^{\log_b a}$ folhas!

Portanto, o **expoente crítico das folhas** é:

$$
c_{\text{crit}} = \log_b a
$$

O **Teorema Mestre** simplesmente compara o expoente $k$ do trabalho por nível ($f(n) = \Theta(n^k)$) com o expoente crítico das folhas ($c_{\text{crit}} = \log_b a$):

| Caso | Comparação entre $k$ e $\log_b a$ | Quem domina a árvore? | Solução $\Theta(\cdot)$ | Exemplo clássico |
| :--- | :---: | :--- | :---: | :--- |
| **Caso 1** | $k < \log_b a$ | As **folhas** dominam | $\Theta\left(n^{\log_b a}\right)$ | Karatsuba: $T(n) = 3T(n/2) + n \implies \Theta(n^{\log_2 3}) \approx \Theta(n^{1,585})$ |
| **Caso 2** | $k = \log_b a$ | Todos os $\log_b n$ níveis empatam | $\Theta\left(n^k \log n\right)$ | Merge Sort: $T(n) = 2T(n/2) + n \implies \Theta(n \log n)$<br/>Busca binária: $T(n) = T(n/2) + 1 \implies \Theta(\log n)$ |
| **Caso 3** | $k > \log_b a$ | A **raiz** domina | $\Theta\left(n^k\right)$ | $T(n) = 2T(n/2) + n^2 \implies \Theta(n^2)$ |

> **Atenção:** o Teorema Mestre **só** se aplica quando o problema é **dividido** por $b > 1$ ($n / b$). Recorrências do tipo $T(n) = T(n - 1) + n$ ou $T(n) = 2T(n - 1) + 1$ subtraem em vez de dividir e devem ser resolvidas por expansão ($\Theta(n^2)$ e $\Theta(2^n)$, respectivamente).

## Passo 2 · Exercício · Simulando recorrências numericamente com memoização

Implemente `simular_recorrencia(a, b, f, n)`, que calcula numericamente o valor exato de $T(n)$ definido por:
- $T(n) = 1$, se $n \le 1$;
- $T(n) = a \cdot T(n // b) + f(n)$, se $n > 1$.

Use um dicionário `memo = {}` para guardar valores já calculados de $T(m)$ e devolver o resultado instantaneamente mesmo para $n$ grande.

### Instruções
1. Crie um dicionário `memo = {}` e uma função auxiliar `calcular(m)`.
2. Se `m <= 1`, devolva `1`. Se `m in memo`, devolva `memo[m]`.
3. Caso contrário, calcule `memo[m] = a * calcular(m // b) + f(m)` e devolva esse valor.

### Código inicial
```python
def simular_recorrencia(a, b, f, n):
    # Calcule T(n) = a * T(n // b) + f(n) com T(n <= 1) = 1 usando memoização
    pass
```

### Solução
```python
def simular_recorrencia(a, b, f, n):
    memo = {}

    def calcular(m):
        if m <= 1:
            return 1
        if m in memo:
            return memo[m]
        memo[m] = a * calcular(m // b) + f(m)
        return memo[m]

    return calcular(n)
```

### Dicas
1. A chamada recursiva divide `m` inteiramente por `b` (`m // b`), fazendo apenas uma chamada para `calcular(m // b)` e multiplicando o retorno por `a`.
2. Não se esqueça de somar `f(m)` ao produto `a * calcular(m // b)`.

### Verificação
```json
[
  {
    "id": "simular-merge-sort",
    "checkpoint": 1,
    "kind": "expr",
    "expr": "[simular_recorrencia(2, 2, lambda n: n, 1), simular_recorrencia(2, 2, lambda n: n, 8), simular_recorrencia(2, 2, lambda n: n, 1024)]",
    "expected": [1, 32, 11264],
    "name": "Simula T(n) = 2T(n/2) + n para n = 1 (1), 8 (32) e 1024 (11264)"
  },
  {
    "id": "simular-karatsuba",
    "checkpoint": 3,
    "kind": "expr",
    "expr": "simular_recorrencia(3, 2, lambda n: n, 16)",
    "expected": 211,
    "name": "Simula Karatsuba T(n) = 3T(n/2) + n para n = 16 (211)"
  },
  {
    "id": "simular-busca-binaria-gigante",
    "checkpoint": 2,
    "kind": "expr",
    "expr": "simular_recorrencia(1, 2, lambda n: 1, 2**30)",
    "expected": 31,
    "name": "Simula busca binária T(n) = T(n/2) + 1 para n = 2^30 (31)"
  }
]
```

### Soluções erradas
```python name="troca a por b na chamada recursiva"
def simular_recorrencia(a, b, f, n):
    if n <= 1:
        return 1
    return b * simular_recorrencia(a, b, f, n // a) + f(n)
```
```python name="esquece de somar f(n)"
def simular_recorrencia(a, b, f, n):
    if n <= 1:
        return 1
    return a * simular_recorrencia(a, b, f, n // b)
```

## Passo 3 · Exercício · Aplicando o Teorema Mestre e identificando parâmetros

Implemente duas funções:
1. `teorema_mestre(a, b, k)`: recebe inteiros `a >= 1`, `b >= 2` e `k >= 0` (onde $f(n) = \Theta(n^k)$) e devolve a classe de complexidade de $T(n) = aT(n/b) + \Theta(n^k)$ como string formatada segundo as regras abaixo:
   - Use uma função auxiliar para formatar potências de $n$: se o expoente `e` for `0`, a potência é `"1"`; se `e == 1`, é `"n"`; se `e` for inteiro $> 1$, é `f"n^{e}"`; se não for inteiro (ex.: $\log_2 3$), use `f"n^(log_{b}({a}))"`.
   - **Caso 1 ($k < \log_b a$):** devolva `f"Theta({potencia_critica})"` (ex.: `"Theta(n)"`, `"Theta(n^2)"` ou `"Theta(n^(log_2(3)))"`).
   - **Caso 2 ($k == \log_b a$):** se `k == 0`, devolva `"Theta(log n)"`; se `k == 1`, devolva `"Theta(n log n)"`; se `k > 1`, devolva `f"Theta(n^{k} log n)"`.
   - **Caso 3 ($k > \log_b a$):** se `k == 1`, devolva `"Theta(n)"`; se `k > 1`, devolva `f"Theta(n^{k})"`.
2. `identificar_parametros(codigo_id)`: recebe o identificador de um algoritmo clássico e devolve a tupla `(a, b, k)` correspondente à sua recorrência $T(n) = aT(n/b) + \Theta(n^k)$:
   - `"busca_binaria"` ($T(n) = 1 \cdot T(n/2) + \Theta(1)$) $\to$ `(1, 2, 0)`
   - `"maximo_dc"` ($T(n) = 2 \cdot T(n/2) + \Theta(1)$) $\to$ `(2, 2, 0)`
   - `"merge_sort"` ($T(n) = 2 \cdot T(n/2) + \Theta(n)$) $\to$ `(2, 2, 1)`
   - `"karatsuba"` ($T(n) = 3 \cdot T(n/2) + \Theta(n)$) $\to$ `(3, 2, 1)`

### Instruções
1. Para verificar se $\log_b a$ é um inteiro exato sem erro de ponto flutuante, teste se `b ** round(math.log(a, b)) == a`: se sim, o expoente crítico é o inteiro `c = round(math.log(a, b))`; senão, é o float `math.log(a, b)` (e sua string no Caso 1 será `f"Theta(n^(log_{b}({a})))"`).
2. Compare `k` com o expoente crítico para decidir entre Caso 1 (`k < c`), Caso 2 (`k == c`) e Caso 3 (`k > c`), formatando a string de acordo com a especificação.
3. Em `identificar_parametros(codigo_id)`, devolva a tupla `(a, b, k)` correspondente a cada um dos 4 identificadores.

### Código inicial
```python
import math


def teorema_mestre(a, b, k):
    # Devolva a classe "Theta(...)" aplicando os 3 casos do Teorema Mestre
    pass


def identificar_parametros(codigo_id):
    # Devolva a tupla (a, b, k) para o algoritmo informado
    pass
```

### Solução
```python
import math


def teorema_mestre(a, b, k):
    c_aprox = round(math.log(a, b))
    eh_inteiro = (b ** c_aprox == a)
    c_val = c_aprox if eh_inteiro else math.log(a, b)

    if eh_inteiro and k == c_aprox:
        if k == 0:
            return "Theta(log n)"
        if k == 1:
            return "Theta(n log n)"
        return f"Theta(n^{k} log n)"

    if k < c_val:
        if eh_inteiro:
            if c_aprox == 0:
                return "Theta(1)"
            if c_aprox == 1:
                return "Theta(n)"
            return f"Theta(n^{c_aprox})"
        return f"Theta(n^(log_{b}({a})))"

    if k == 0:
        return "Theta(1)"
    if k == 1:
        return "Theta(n)"
    return f"Theta(n^{k})"


def identificar_parametros(codigo_id):
    parametros = {
        "busca_binaria": (1, 2, 0),
        "maximo_dc": (2, 2, 0),
        "merge_sort": (2, 2, 1),
        "karatsuba": (3, 2, 1),
    }
    return parametros[codigo_id]
```

### Dicas
1. Em Python, `math.log(8, 2)` pode resultar em `2.9999999999999996`. Por isso, testar `b ** round(math.log(a, b)) == a` é a maneira exata de saber se $\log_b a$ é um inteiro!
2. No Caso 2 com `a = 1, b = 2, k = 0` (busca binária), temos $\log_2 1 = 0 == k$, logo o resultado é `"Theta(log n)"` (pois $n^0 \log n = \log n$).

### Verificação
```json
[
  {
    "id": "mestre-caso-1",
    "checkpoint": 1,
    "kind": "expr",
    "expr": "[teorema_mestre(2, 2, 0), teorema_mestre(4, 2, 1), teorema_mestre(3, 2, 1)]",
    "expected": ["Theta(n)", "Theta(n^2)", "Theta(n^(log_2(3)))"],
    "name": "Caso 1 (folhas dominam): 2T(n/2)+1 -> Theta(n), 4T(n/2)+n -> Theta(n^2), 3T(n/2)+n -> Theta(n^(log_2(3)))"
  },
  {
    "id": "mestre-caso-2",
    "checkpoint": 2,
    "kind": "expr",
    "expr": "[teorema_mestre(1, 2, 0), teorema_mestre(2, 2, 1), teorema_mestre(4, 2, 2)]",
    "expected": ["Theta(log n)", "Theta(n log n)", "Theta(n^2 log n)"],
    "name": "Caso 2 (empate): T(n/2)+1 -> Theta(log n), 2T(n/2)+n -> Theta(n log n), 4T(n/2)+n^2 -> Theta(n^2 log n)"
  },
  {
    "id": "mestre-caso-3",
    "checkpoint": 2,
    "kind": "expr",
    "expr": "[teorema_mestre(2, 2, 2), teorema_mestre(1, 2, 1), teorema_mestre(2, 4, 1)]",
    "expected": ["Theta(n^2)", "Theta(n)", "Theta(n)"],
    "name": "Caso 3 (raiz domina): 2T(n/2)+n^2 -> Theta(n^2), T(n/2)+n -> Theta(n), 2T(n/4)+n -> Theta(n)"
  },
  {
    "id": "identificar-quatro",
    "checkpoint": 3,
    "kind": "expr",
    "expr": "[identificar_parametros('busca_binaria'), identificar_parametros('maximo_dc'), identificar_parametros('merge_sort'), identificar_parametros('karatsuba')]",
    "expected": [[1, 2, 0], [2, 2, 0], [2, 2, 1], [3, 2, 1]],
    "name": "Identifica (a, b, k) dos quatro algoritmos"
  }
]
```

### Soluções erradas
```python name="esquece de multiplicar por log n no Caso 2"
import math


def teorema_mestre(a, b, k):
    c_aprox = round(math.log(a, b))
    eh_inteiro = (b ** c_aprox == a)
    m = max(k, c_aprox if eh_inteiro else math.log(a, b))
    if m == 0:
        return "Theta(1)"
    if m == 1:
        return "Theta(n)"
    return f"Theta(n^{m})"


def identificar_parametros(codigo_id):
    return (2, 2, 1)
```
```python name="troca a e b ao calcular log_b(a)"
import math


def teorema_mestre(a, b, k):
    c = math.log(b, max(a, 2))
    if k == c:
        return "Theta(n log n)"
    return "Theta(n)"


def identificar_parametros(codigo_id):
    return (1, 2, 0)
```

## Passo 4 · Quiz · Dominando o Teorema Mestre

### Pergunta
Qual é a solução assintótica da recorrência $T(n) = 4T(n/2) + n$ pelo Teorema Mestre?
- [ ] $\Theta(n \log n)$, porque o trabalho por chamada fora da recursão é linear ($n$).
- [x] $\Theta(n^2)$, pelo Caso 1: temos $a = 4, b = 2 \implies \log_2 4 = 2$, e como $f(n) = n^1$ cresce mais devagar que $n^2$, o número de folhas ($4^{\log_2 n} = n^2$) domina o custo total.
- [ ] $\Theta(n^4)$, porque são 4 chamadas recursivas.
- [ ] $\Theta(n^2 \log n)$, pelo Caso 2.
> Em $T(n) = 4T(n/2) + n$, a quantidade de subproblemas quadruplica a cada nível enquanto o tamanho cai apenas pela metade. Ao chegar à base da árvore, existem $n^{\log_2 4} = n^2$ folhas, que dominam o trabalho linear da raiz (Caso 1: $\Theta(n^2)$).

### Pergunta
Um algoritmo recursivo resolve um problema de tamanho $n$ fazendo uma varredura linear $O(n)$ e, em seguida, **uma única chamada recursiva** para metade da entrada: $T(n) = T(n/2) + n$. Qual é a sua complexidade total?
- [ ] $\Theta(n \log n)$, porque divide por 2 e faz trabalho $n$ em cada nível.
- [x] $\Theta(n)$, pelo Caso 3 do Teorema Mestre ($a = 1, b = 2 \implies \log_2 1 = 0 < k = 1$), pois a soma geométrica $n + \frac{n}{2} + \frac{n}{4} + \frac{n}{8} + \dots$ converge para $\le 2n$.
- [ ] $\Theta(\log n)$, porque só há uma chamada recursiva.
- [ ] $\Theta(n^2)$.
> Diferente do Merge Sort ($2T(n/2) + n$), aqui fazemos **apenas 1** chamada para $n/2$. O trabalho por nível cai pela metade a cada passo ($n + n/2 + n/4 + \dots < 2n$), então o primeiro nível (a raiz) já responde por metade de todo o trabalho do algoritmo: $\Theta(n)$!
