---
slug: n3-m1-03-contagem
titulo: 'Contagem: permutações, combinações e o princípio da casa dos pombos'
descricao: Regras da soma e do produto, fatorial, arranjos, combinações, triângulo de Pascal e estimativas de 'quantas possibilidades existem'.
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
- Aplicar as regras da soma e do produto para contar possibilidades
- Calcular permutações, arranjos e combinações e implementá-los sem estouro
- Usar contagem para estimar o custo de força bruta (senhas, caixeiro viajante) e o limite da casa dos pombos
---

## Passo 1 · Leitura · Regras da soma e do produto, Pascal e o princípio da casa dos pombos

Antes de escrever um algoritmo de busca exaustiva, precisamos saber **quantos candidatos existem**:

1. **Regra do produto (escolhas em sequência):** se uma decisão em $k$ etapas tem $n_1$ opções na primeira, $n_2$ na segunda, …, o total de sequências é $n_1 \cdot n_2 \cdots n_k$. Uma senha de $k$ caracteres escolhidos de um alfabeto de tamanho $A$ com repetição tem $A^k$ possibilidades.
2. **Permutações e arranjos (a ordem importa):** ordenar $n$ itens distintos dá $n!$ permutações; escolher e ordenar $k$ itens dentre $n$ sem repetição dá o arranjo $A(n, k) = \frac{n!}{(n-k)!}$. Se uma palavra de $n$ letras tem letras repetidas com frequências $f_1, f_2, \dots, f_m$, o número de anagramas distintos é $\frac{n!}{f_1! \, f_2! \cdots f_m!}$.
3. **Combinações (a ordem não importa):** escolher um subconjunto de $k$ itens dentre $n$ divide o arranjo pelas $k!$ ordens equivalentes:

$$\binom{n}{k} = \frac{n!}{k!(n-k)!} = \binom{n-1}{k-1} + \binom{n-1}{k}$$

A identidade de Pascal $\binom{n}{k} = \binom{n-1}{k-1} + \binom{n-1}{k}$ tem interpretação direta: fixado o último elemento, ou ele **entra** no subconjunto (e escolhemos $k-1$ dentre os $n-1$ restantes) ou **não entra** (e escolhemos $k$ dentre os $n-1$ restantes). Além de evitar multiplicações gigantescas, essa recorrência será nosso primeiro exemplo de subproblemas sobrepostos (Programação Dinâmica).

4. **Princípio da Casa dos Pombos (*Pigeonhole Principle*):** se distribuímos $N$ objetos em $M$ caixas com $N > M$, pelo menos uma caixa receberá $\lceil N / M \rceil \ge 2$ objetos. Em computação, isso prova que **toda função de hash cujo domínio é maior que o número de posições da tabela obrigatoriamente sofre colisões**.

Veja no visualizador a construção das primeiras linhas do Triângulo de Pascal usando apenas somas:

```python visualizar
linhas_pascal = [[1]]
for n in range(1, 6):
    anterior = linhas_pascal[-1]
    nova = [1]
    for k in range(1, n):
        nova.append(anterior[k - 1] + anterior[k])
    nova.append(1)
    linhas_pascal.append(nova)

c_5_2 = linhas_pascal[5][2]
```

## Passo 2 · Exercício · Combinações via Triângulo de Pascal e contagem de senhas

Implemente `combinacoes(n, k)` usando a recorrência do Triângulo de Pascal (iterativa por linhas ou recursiva com memoização, sem usar `math.comb` nem `math.factorial`) e `contar_senhas(tamanho_alfabeto, k, sem_repetir=False)`.

### Instruções

1. Em `combinacoes(n, k)`:
   - Se `k < 0` ou `k > n`, retorne `0`. Se `k == 0` ou `k == n`, retorne `1`.
   - Calcule $\binom{n}{k}$ construindo a linha do Triângulo de Pascal (ou tabela memoizada) usando `C(i, j) = C(i - 1, j - 1) + C(i - 1, j)`.
2. Em `contar_senhas(tamanho_alfabeto, k, sem_repetir=False)`:
   - Se `not sem_repetir`, retorne `tamanho_alfabeto ** k`.
   - Se `sem_repetir` for `True`: caso `k > tamanho_alfabeto`, retorne `0`; caso contrário, multiplique `tamanho_alfabeto * (tamanho_alfabeto - 1) * ... * (tamanho_alfabeto - k + 1)`.

### Código inicial

```python
def combinacoes(n, k):
    # Calcule C(n, k) pela identidade de Pascal C(n-1, k-1) + C(n-1, k)
    pass


def contar_senhas(tamanho_alfabeto, k, sem_repetir=False):
    # Conte senhas de comprimento k com ou sem repetição de caracteres
    pass
```

### Solução

```python
def combinacoes(n, k):
    if k < 0 or k > n:
        return 0
    k = min(k, n - k)
    linha = [1] + [0] * k
    for _ in range(1, n + 1):
        for j in range(k, 0, -1):
            linha[j] = linha[j] + linha[j - 1]
    return linha[k]


def contar_senhas(tamanho_alfabeto, k, sem_repetir=False):
    if k < 0:
        return 0
    if not sem_repetir:
        return int(tamanho_alfabeto ** k)
    if k > tamanho_alfabeto:
        return 0
    total = 1
    for i in range(k):
        total *= tamanho_alfabeto - i
    return total
```

### Dicas

1. Você pode atualizar uma única lista `linha` de tamanho `k + 1` percorrendo `j` de `k` até `1` (de trás para frente): `linha[j] += linha[j - 1]`.
2. Em `contar_senhas` com `sem_repetir=True`, a primeira posição tem `A` opções, a segunda `A - 1`, até a $k$-ésima com `A - k + 1` opções.

### Verificação

```json
[
  {
    "id": "combinacoes-pequenas-e-n60",
    "name": "Calcula C(n, k) para casos de borda e para n = 60, k = 30",
    "checkpoint": 1,
    "kind": "expr",
    "expr": "[combinacoes(5, 0), combinacoes(5, 2), combinacoes(5, 6), str(combinacoes(60, 30))]",
    "expected": [
      1,
      10,
      0,
      "118264581564861424"
    ]
  },
  {
    "id": "contar-senhas-com-e-sem-repeticao",
    "name": "Conta senhas com repetição (A^k) e sem repetição (arranjo)",
    "checkpoint": 2,
    "kind": "expr",
    "expr": "[contar_senhas(10, 4, False), contar_senhas(10, 4, True), contar_senhas(4, 6, True)]",
    "expected": [
      10000,
      5040,
      0
    ]
  }
]
```

### Soluções erradas

```python name="Devolve arranjo no lugar de combinação sem dividir pelas k! ordens"
def combinacoes(n, k):
    if k < 0 or k > n:
        return 0
    res = 1
    for i in range(k):
        res *= n - i
    return res


def contar_senhas(tamanho_alfabeto, k, sem_repetir=False):
    return tamanho_alfabeto ** k
```

```python name="Ignora o parâmetro sem_repetir em contar_senhas"
def combinacoes(n, k):
    if k < 0 or k > n:
        return 0
    linha = [1] + [0] * k
    for _ in range(1, n + 1):
        for j in range(k, 0, -1):
            linha[j] += linha[j - 1]
    return linha[k]


def contar_senhas(tamanho_alfabeto, k, sem_repetir=False):
    return int(tamanho_alfabeto ** k)
```

## Passo 3 · Exercício · Anagramas distintos e tempo de força bruta

Implemente `anagramas_distintos(palavra)` (que calcula $\frac{n!}{f_1! \, f_2! \cdots f_m!}$ considerando as letras repetidas) e `tempo_forca_bruta_anos(total_possibilidades, tentativas_por_seg)` (usando anos de $365$ dias de $86\,400$ segundos).

### Instruções

1. Em `anagramas_distintos(palavra)`:
   - Conte a frequência de cada caractere de `palavra`.
   - Calcule `math.factorial(len(palavra))` e divida inteiramente (`//`) pelo fatorial da frequência de cada caractere distinto.
2. Em `tempo_forca_bruta_anos(total_possibilidades, tentativas_por_seg)`:
   - Calcule o número de segundos `total_possibilidades / tentativas_por_seg` e divida por `365 * 86400`, retornando `float`.

### Código inicial

```python
import math


def anagramas_distintos(palavra):
    # Divida n! pelo produto dos fatoriais das frequências de cada letra
    pass


def tempo_forca_bruta_anos(total_possibilidades, tentativas_por_seg):
    # Converta total_possibilidades / tentativas_por_seg para anos (365 * 86400 s)
    pass
```

### Solução

```python
import math


def anagramas_distintos(palavra):
    contagem = {}
    for ch in palavra:
        contagem[ch] = contagem.get(ch, 0) + 1
    total = math.factorial(len(palavra))
    for freq in contagem.values():
        total //= math.factorial(freq)
    return int(total)


def tempo_forca_bruta_anos(total_possibilidades, tentativas_por_seg):
    segundos_por_ano = 365.0 * 86400.0
    return float((total_possibilidades / tentativas_por_seg) / segundos_por_ano)
```

### Dicas

1. Na palavra `"banana"` ($6$ letras), `'a'` aparece $3$ vezes e `'n'` aparece $2$ vezes: $\frac{6!}{3!\,2!\,1!} = \frac{720}{6 \cdot 2} = 60$.
2. Use divisão inteira `//=` ao dividir `math.factorial(len(palavra))` por `math.factorial(freq)` para evitar erros de precisão em ponto flutuante.

### Verificação

```json
[
  {
    "id": "anagramas-banana-e-arara",
    "name": "Calcula o número exato de anagramas descontando letras repetidas",
    "checkpoint": 1,
    "kind": "expr",
    "expr": "[anagramas_distintos('banana'), anagramas_distintos('arara'), anagramas_distintos('usp')]",
    "expected": [
      60,
      10,
      6
    ]
  },
  {
    "id": "tempo-forca-bruta",
    "name": "Converte o número de tentativas para anos de execução",
    "checkpoint": 2,
    "kind": "call",
    "function": "tempo_forca_bruta_anos",
    "args": [31536000000, 1000],
    "expected": 1.0,
    "tolerance": 1e-6
  }
]
```

### Soluções erradas

```python name="Retorna n! sem dividir pelos fatoriais das letras repetidas"
import math


def anagramas_distintos(palavra):
    return math.factorial(len(palavra))


def tempo_forca_bruta_anos(total_possibilidades, tentativas_por_seg):
    return float((total_possibilidades / tentativas_por_seg) / (365 * 86400))
```

```python name="Divide pela frequência bruta em vez do fatorial da frequência"
import math


def anagramas_distintos(palavra):
    contagem = {}
    for ch in palavra:
        contagem[ch] = contagem.get(ch, 0) + 1
    total = math.factorial(len(palavra))
    for freq in contagem.values():
        total //= freq
    return total


def tempo_forca_bruta_anos(total_possibilidades, tentativas_por_seg):
    return float((total_possibilidades / tentativas_por_seg) / (365 * 86400))
```

## Passo 4 · Quiz · Arranjos, combinações e casa dos pombos

### Pergunta

Uma comissão de formatura precisa escolher **1 presidente, 1 tesoureiro e 1 secretário** (cargos distintos) dentre 10 alunos no primeiro caso, e uma **equipe de 3 representantes sem distinção de cargo** dentre os mesmos 10 alunos no segundo caso. Quantas escolhas existem em cada caso?

- [ ] $120$ no primeiro caso e $720$ no segundo caso.
- [x] $A(10, 3) = 10 \cdot 9 \cdot 8 = 720$ no primeiro caso (a ordem/cargo importa) e $\binom{10}{3} = \frac{720}{3!} = 120$ no segundo caso (a ordem não importa).
- [ ] $10^3 = 1000$ nos dois casos.
- [ ] $30$ nos dois casos.

> Quando os cargos são distintos, permutar os 3 escolhidos gera comissões diferentes (arranjo: $720$); quando formam um subconjunto sem cargos, dividimos por $3! = 6$ (combinação: $120$).

### Pergunta

Uma tabela hash possui $1\,024$ posições (*buckets*). Qual é o menor número de chaves distintas que precisamos inserir para ter **100% de certeza matemática** (no pior caso) de que ocorrerá pelo menos uma colisão?

- [ ] $512$ chaves.
- [ ] $1\,024$ chaves.
- [x] $1\,025$ chaves, pelo Princípio da Casa dos Pombos ($1\,025$ chaves distribuídas em $1\,024$ posições obrigam pelo menos uma posição a ter $\ge 2$ chaves).
- [ ] $2^{1024}$ chaves.

> Embora colisões aleatórias já sejam prováveis muito antes (paradoxo do aniversário), a certeza absoluta no pior caso ocorre em $M + 1 = 1\,025$ elementos.
