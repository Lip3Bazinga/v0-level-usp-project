---
slug: n3-m2-02-notacao-big-o
titulo: Notação Big-O
descricao: Definição informal e formal de O, Ω e Θ, regras práticas (descartar constantes e termos menores) e as classes mais comuns.
dificuldade: intermediario
tipo: guiada
runtime: python
bibliotecas: []
xp: 110
tempo_min: 45
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
  - Enunciar a definição de O(g(n)) e justificar por que 3n² + 10n é O(n²)
  - Classificar funções de custo nas classes O(1), O(log n), O(n), O(n log n), O(n²), O(2ⁿ)
  - Diferenciar O (limite superior), Ω (inferior) e Θ (justo) e usar cada uma corretamente
---

## Passo 1 · Leitura · O que é Big-O: definição formal, $O$, $\Omega$ e $\Theta$

Quando analisamos um algoritmo, não queremos saber se ele leva $12\text{ ms}$ no seu notebook e $8\text{ ms}$ em um servidor — queremos saber **como o número de operações escala quando $n$ cresce**. A notação assintótica captura exatamente essa curva de crescimento, ignorando constantes de hardware.

#### Definição formal de $O(g(n))$ (limite superior)

Dizemos que uma função de custo $f(n)$ pertence a $O(g(n))$ — lê-se "$f(n)$ é Big-O de $g(n)$" — se existem constantes positivas $c > 0$ e $n_0 \ge 1$ tais que:

$$
0 \le f(n) \le c \cdot g(n) \quad \text{para todo } n \ge n_0
$$

Em português claro: a partir de um tamanho de entrada $n_0$, a curva $f(n)$ **nunca ultrapassa** a curva $g(n)$ multiplicada por uma constante fixa $c$.

**Exemplo concreto:** por que $f(n) = 3n^2 + 10n$ é $O(n^2)$?
Para todo $n \ge 10$, temos $10n \le n^2$. Portanto:

$$
3n^2 + 10n \le 3n^2 + n^2 = 4n^2 \quad (\text{para todo } n \ge 10)
$$

Basta escolher $c = 4$ e $n_0 = 10$!

#### A diferença entre $O$, $\Omega$ e $\Theta$

- **$O(g(n))$ (Big-O — limite superior):** $f(n)$ cresce **no máximo** tão rápido quanto $g(n)$ ($f(n) \le c \cdot g(n)$ para $n \ge n_0$). Cuidado: como $O$ é apenas um teto, dizer que $5n$ é $O(n^2)$ é matematicamente verdadeiro, embora seja um limite folgado!
- **$\Omega(g(n))$ (Big-Omega — limite inferior):** $f(n)$ cresce **pelo menos** tão rápido quanto $g(n)$ ($f(n) \ge c \cdot g(n)$ para $n \ge n_0$).
- **$\Theta(g(n))$ (Big-Theta — limite justo):** $f(n)$ é simultaneamente $O(g(n))$ e $\Omega(g(n))$, isto é, fica "ensanduichada" entre $c_1 \cdot g(n)$ e $c_2 \cdot g(n)$ para $n \ge n_0$. No dia a dia, quando dizemos "este algoritmo é $O(n^2)$", quase sempre queremos dizer o limite mais justo $\Theta(n^2)$.

## Passo 2 · Exercício · Verificando a desigualdade de Big-O numericamente

Implemente `verificar_big_o(f, g, c, n0, ate)`, que testa numericamente se a escolha das constantes `c` e `n0` satisfaz a desigualdade $0 \le f(n) \le c \cdot g(n)$ para todos os inteiros $n$ no intervalo $[n_0, \text{ate}]$ (inclusive).

### Instruções
1. Percorra todos os inteiros `n` de `n0` até `ate` (inclusive, usando `range(n0, ate + 1)`).
2. Se para algum `n` valer `f(n) < 0` ou `f(n) > c * g(n)`, devolva `False`.
3. Se todos os valores de `n` no intervalo satisfizerem a desigualdade, devolva `True`.

### Código inicial
```python
def verificar_big_o(f, g, c, n0, ate):
    # Verifique se 0 <= f(n) <= c * g(n) para todo n de n0 até ate (inclusive)
    pass
```

### Solução
```python
def verificar_big_o(f, g, c, n0, ate):
    for n in range(n0, ate + 1):
        valor_f = f(n)
        if valor_f < 0 or valor_f > c * g(n):
            return False
    return True
```

### Dicas
1. Lembre-se de que o limite superior em `range(n0, ate + 1)` precisa do `+ 1` para testar também `n == ate`.
2. Basta um único `n >= n0` violar `f(n) <= c * g(n)` para que aquele par `(c, n0)` não comprove a relação na faixa testada.

### Verificação
```json
[
  {
    "id": "big-o-valido",
    "checkpoint": 1,
    "kind": "expr",
    "expr": "verificar_big_o(lambda n: 3 * n**2 + 10 * n, lambda n: n**2, 4, 10, 200)",
    "expected": true,
    "type": "bool",
    "name": "Confirma 3n^2 + 10n <= 4n^2 para todo n de 10 a 200"
  },
  {
    "id": "big-o-n0-pequeno-demais",
    "checkpoint": 2,
    "kind": "expr",
    "expr": "verificar_big_o(lambda n: 3 * n**2 + 10 * n, lambda n: n**2, 4, 5, 200)",
    "expected": false,
    "type": "bool",
    "name": "Rejeita n0 = 5 para c = 4 (pois em n = 5, 3*25 + 50 = 125 > 4*25 = 100)"
  },
  {
    "id": "big-o-falha-no-ultimo",
    "checkpoint": 3,
    "kind": "expr",
    "expr": "verificar_big_o(lambda n: n**2, lambda n: n, 10, 1, 11)",
    "expected": false,
    "type": "bool",
    "name": "Testa inclusive o limite final ate (n = 11 viola n^2 <= 10n)",
    "hint": "Use range(n0, ate + 1) para incluir ate."
  }
]
```

### Soluções erradas
```python name="testa apenas n0 em vez de todo o intervalo"
def verificar_big_o(f, g, c, n0, ate):
    return bool(0 <= f(n0) <= c * g(n0))
```
```python name="esquece de incluir ate no range"
def verificar_big_o(f, g, c, n0, ate):
    for n in range(n0, ate):
        if f(n) < 0 or f(n) > c * g(n):
            return False
    return True
```

## Passo 3 · Leitura · Regras práticas de simplificação e o custo das operações em Python

Para simplificar qualquer polinômio ou soma de termos para sua classe Big-O mais justa, aplicamos duas regras:

1. **Descarte constantes multiplicativas:** $7n^2 \to n^2$, $\frac{1}{2}n \log n \to n \log n$, $500 \to 1$.
2. **Mantenha apenas o termo de maior crescimento:** em $3n^2 + 50n \log n + 1000$, como $n^2$ cresce mais rápido que $n \log n$ e que $1$, o resultado é **$O(n^2)$**. (Atenção: nunca descarte o $\log n$ dentro de um produto! $n \log n$ cresce estritamente mais rápido que $n$, logo $O(n \log n) \ne O(n)$.)

#### Tabela de custo das operações embutidas do Python

Escolher a estrutura de dados certa em Python depende de conhecer o custo de cada operação básica para uma coleção de $n$ elementos:

| Operação em Python | Estrutura | Custo (caso médio/amortizado) | Por quê? |
| :--- | :--- | :---: | :--- |
| `lista[i]` / `lista[i] = x` | `list` | $O(1)$ | Vetor contíguo em memória: endereço calculado direto. |
| `lista.append(x)` / `lista.pop()` | `list` | $O(1)$ | Insere/remove no fim do vetor sem deslocar elementos. |
| `lista.insert(0, x)` / `lista.pop(0)` | `list` | $O(n)$ | Precisa deslocar todos os outros $n$ elementos na memória! |
| `x in lista` / `lista.index(x)` | `list` | $O(n)$ | Varre elemento por elemento do início ao fim. |
| `sorted(lista)` / `lista.sort()` | `list` | $O(n \log n)$ | Algoritmo Timsort (baseado em Merge Sort + Insertion Sort). |
| `x in conjunto` / `conjunto.add(x)` | `set` | $O(1)$ | Tabela hash: calcula `hash(x)` e vai direto ao compartimento. |
| `d[chave]` / `chave in d` | `dict` | $O(1)$ | Tabela hash de pares chave-valor. |

Repare no contraste mais importante de todo o curso: **`x in lista` custa $O(n)$, enquanto `x in conjunto` (ou `x in dicionario`) custa $O(1)$ no caso médio**.

## Passo 4 · Exercício · Simplificando funções de custo e classificando operações do Python

Implemente duas funções:
- `simplificar_custo(termos)`: recebe uma lista não vazia de tuplas `(coeficiente, classe)`, onde `coeficiente > 0` e `classe` pertence a `["1", "log n", "sqrt(n)", "n", "n log n", "n^2", "n^3", "2^n", "n!"]` (por exemplo, `[(3, "n^2"), (10, "n"), (5, "1")]`), e devolve a notação Big-O do termo dominante no formato `"O(n^2)"`.
- `classe_de_operacao(operacao)`: recebe uma string descrevendo uma operação do Python e devolve sua classe de complexidade (`"O(1)"`, `"O(n)"` ou `"O(n log n)"`) para as seguintes chaves:
  - `"lista[i]"`, `"lista.append(x)"`, `"lista.pop()"`, `"x in set"`, `"d[chave]"` $\to$ `"O(1)"`
  - `"x in lista"`, `"lista.insert(0, x)"`, `"lista.pop(0)"` $\to$ `"O(n)"`
  - `"sorted(lista)"`, `"lista.sort()"` $\to$ `"O(n log n)"`

### Instruções
1. Em `simplificar_custo(termos)`, encontre a tupla `(coef, classe)` cuja `classe` aparece mais à direita na lista `ORDEM = ["1", "log n", "sqrt(n)", "n", "n log n", "n^2", "n^3", "2^n", "n!"]` (ignorando termos com `coef <= 0`, se houver) e devolva `f"O({classe_dominante})"`.
2. Em `classe_de_operacao(operacao)`, mapeie cada operação da tabela para `"O(1)"`, `"O(n)"` ou `"O(n log n)"`.

### Código inicial
```python
ORDEM = ["1", "log n", "sqrt(n)", "n", "n log n", "n^2", "n^3", "2^n", "n!"]


def simplificar_custo(termos):
    # Devolva "O(<classe_dominante>)" descartando constantes e termos menores
    pass


def classe_de_operacao(operacao):
    # Devolva "O(1)", "O(n)" ou "O(n log n)" para a operação informada
    pass
```

### Solução
```python
ORDEM = ["1", "log n", "sqrt(n)", "n", "n log n", "n^2", "n^3", "2^n", "n!"]

CUSTOS_OPERACOES = {
    "lista[i]": "O(1)",
    "lista.append(x)": "O(1)",
    "lista.pop()": "O(1)",
    "x in set": "O(1)",
    "d[chave]": "O(1)",
    "x in lista": "O(n)",
    "lista.insert(0, x)": "O(n)",
    "lista.pop(0)": "O(n)",
    "sorted(lista)": "O(n log n)",
    "lista.sort()": "O(n log n)",
}


def simplificar_custo(termos):
    validos = [classe for coef, classe in termos if coef > 0]
    dominante = max(validos, key=lambda c: ORDEM.index(c))
    return f"O({dominante})"


def classe_de_operacao(operacao):
    return CUSTOS_OPERACOES[operacao]
```

### Dicas
1. Não escolha o termo pelo maior coeficiente numérico! Em `[(1000, "n"), (1, "n^2")]`, o termo dominante é `"n^2"`, não `"n"`.
2. `max(validos, key=lambda c: ORDEM.index(c))` encontra diretamente a classe de maior ordem assintótica.

### Verificação
```json
[
  {
    "id": "simplifica-polinomio",
    "checkpoint": 1,
    "kind": "call",
    "function": "simplificar_custo",
    "args": [[[3, "n^2"], [10, "n"], [5, "1"]]],
    "expected": "O(n^2)",
    "name": "3n^2 + 10n + 5 simplifica para O(n^2)"
  },
  {
    "id": "simplifica-coeficiente-grande",
    "checkpoint": 1,
    "kind": "call",
    "function": "simplificar_custo",
    "args": [[[99999, "n"], [2, "n log n"], [500, "log n"]]],
    "expected": "O(n log n)",
    "name": "99999n + 2n log n + 500 log n simplifica para O(n log n)",
    "hint": "O termo dominante depende da classe de crescimento, não do tamanho da constante."
  },
  {
    "id": "simplifica-constante",
    "checkpoint": 1,
    "kind": "call",
    "function": "simplificar_custo",
    "args": [[[42, "1"]]],
    "expected": "O(1)",
    "name": "Constante 42 simplifica para O(1)"
  },
  {
    "id": "operacoes-o1",
    "checkpoint": 2,
    "kind": "expr",
    "expr": "[classe_de_operacao('lista[i]'), classe_de_operacao('lista.append(x)'), classe_de_operacao('x in set'), classe_de_operacao('d[chave]')]",
    "expected": ["O(1)", "O(1)", "O(1)", "O(1)"],
    "name": "Indexação, append no fim e busca em set/dict são O(1)"
  },
  {
    "id": "operacoes-on-e-nlogn",
    "checkpoint": 2,
    "kind": "expr",
    "expr": "[classe_de_operacao('x in lista'), classe_de_operacao('lista.insert(0, x)'), classe_de_operacao('lista.pop(0)'), classe_de_operacao('sorted(lista)')]",
    "expected": ["O(n)", "O(n)", "O(n)", "O(n log n)"],
    "name": "x in lista, insert(0) e pop(0) são O(n); sorted(lista) é O(n log n)"
  }
]
```

### Soluções erradas
```python name="escolhe pelo maior coeficiente em vez da classe assintótica"
def simplificar_custo(termos):
    maior_coef, classe = max(termos, key=lambda item: item[0])
    return f"O({classe})"


def classe_de_operacao(operacao):
    return "O(1)"
```
```python name="acha que x in lista e pop(0) são O(1)"
ORDEM = ["1", "log n", "sqrt(n)", "n", "n log n", "n^2", "n^3", "2^n", "n!"]


def simplificar_custo(termos):
    dominante = max((c for coef, c in termos if coef > 0), key=lambda c: ORDEM.index(c))
    return f"O({dominante})"


def classe_de_operacao(operacao):
    if "sort" in operacao:
        return "O(n log n)"
    return "O(1)"
```

## Passo 5 · Quiz · Classificando expressões e interpretando $O$, $\Omega$ e $\Theta$

### Pergunta
Qual é a classe Big-O mais justa para a função de custo $f(n) = 500n \log_2 n + 12n + 10^6$?
- [ ] $O(n)$, pois $\log_2 n$ cresce tão devagar que pode ser descartado como se fosse constante.
- [x] $O(n \log n)$, pois $n \log_2 n$ domina $n$ e $1$, e descartamos a constante multiplicativa $500$.
- [ ] $O(n^2)$, porque $500$ é maior que $n$ para entradas pequenas.
- [ ] $O(10^6)$, porque um milhão é o maior número na expressão.
> Nunca descartamos $\log n$ quando ele multiplica $n$: como $\lim_{n \to \infty} \frac{n \log n}{n} = \infty$, a classe $O(n \log n)$ é estritamente maior que $O(n)$ e estritamente menor que $O(n^2)$.

### Pergunta
Um colega afirma: *"Provei que meu algoritmo tem custo $O(n^2)$, portanto ele é necessariamente mais lento que qualquer algoritmo $O(n \log n)$ para entradas grandes"*. Por que essa conclusão está **incorreta** do ponto de vista formal?
- [ ] Porque $O(n^2)$ cresce mais devagar que $O(n \log n)$.
- [x] Porque Big-O ($O$) representa apenas um **limite superior**: um algoritmo que faz $3n$ operações também satisfaz $3n \le n^2$ (logo é $O(n^2)$). Para provar que ele cresce pelo menos como $n^2$, seria necessário provar $\Omega(n^2)$ (ou $\Theta(n^2)$).
- [ ] Porque a notação Big-O só vale para $n < 1\,000$.
- [ ] Porque em Python qualquer algoritmo $O(n^2)$ roda em $O(n)$.
> Formalmente, $O(g(n))$ só coloca um teto no crescimento. Para garantir que uma função tem um piso quadrático, precisamos de $\Omega(n^2)$; quando piso e teto coincidem, temos $\Theta(n^2)$.

### Pergunta
Qual das alternativas abaixo lista apenas operações que custam **$O(1)$** (tempo constante, no caso médio/amortizado) para uma estrutura com $n$ elementos em Python?
- [ ] `lista[0]`, `lista.insert(0, x)` e `x in lista`.
- [x] `lista[-1]`, `lista.append(x)`, `x in conjunto` e `dicionario[chave]`.
- [ ] `lista.pop(0)`, `len(lista)` e `sorted(lista)`.
- [ ] `min(lista)`, `max(lista)` e `sum(lista)`.
> Acessar por índice (`lista[-1]`), anexar ao fim (`append`), consultar um `set` ou acessar uma chave de `dict` são todas operações $O(1)$. Já `insert(0, x)`, `pop(0)`, `x in lista`, `min`, `max` e `sum` custam $O(n)$.
