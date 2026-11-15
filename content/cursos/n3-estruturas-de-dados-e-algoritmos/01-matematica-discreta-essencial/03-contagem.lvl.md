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

## Passo 1 · Leitura · Regras da soma e do produto

Antes de escrever uma busca exaustiva, pergunte: **quantos candidatos existem?** Duas regras respondem quase tudo.

**Regra do produto.** Se uma escolha é feita em etapas, com $n_1$ opções na primeira, $n_2$ na segunda e assim por diante, e o número de opções de cada etapa não depende do que foi escolhido antes, o total é $n_1 \cdot n_2 \cdots n_k$. Uma placa com 3 letras, 1 dígito, 1 letra e 2 dígitos tem $26^3 \cdot 10 \cdot 26 \cdot 10^2 = 456\,976\,000$ possibilidades. Uma senha de $k$ símbolos de um alfabeto com $A$ símbolos, com repetição, tem $A^k$. É o tamanho do produto cartesiano da lição anterior.

**Regra da soma.** Se os candidatos se dividem em casos **sem sobreposição**, o total é a soma dos casos. Senhas de 4 **ou** 5 dígitos: $10^4 + 10^5 = 110\,000$. Com sobreposição, a soma conta duas vezes, e entra a inclusão-exclusão.

A regra da soma dá um atalho poderoso, o **complemento**: o que você quer contar e o que sobra somam o total. Quantas senhas de 4 dígitos têm **pelo menos um** 7? Contar direto é difícil (um 7, dois 7, em que posições?). As que **não** têm 7 usam só 9 dígitos em cada posição:

$$
10^4 - 9^4 = 10\,000 - 6\,561 = 3\,439
$$

Uma fórmula de contagem se confere contra a enumeração. `itertools.product(simbolos, repeat=k)` gera todas as sequências de `k` símbolos, uma de cada vez:

```python
import itertools

digitos = "0123456789"
com_sete = sum(1 for s in itertools.product(digitos, repeat=4) if "7" in s)
print(com_sete, 10**4 - 9**4)   # 3439 3439
```

A enumeração só serve para casos pequenos: com $k = 12$, ela gera $10^{12}$ sequências. A fórmula responde na hora. Escreva a fórmula, confira-a com a força bruta nos casos pequenos e use a fórmula nos grandes.

Um erro comum no "pelo menos um" é fixar uma posição para o 7 e liberar as outras: $4 \cdot 10^3 = 4\,000$. Essa conta passa da resposta certa, porque a senha `7777` foi contada quatro vezes, uma para cada posição escolhida para o 7.

## Passo 2 · Previsão · Pares ordenados e pares sem ordem

O programa conta, entre as letras de `"ABCD"`, os pares com repetição, os pares ordenados de letras diferentes e os pares em que a ordem não importa. Leia sem executar e digite exatamente o que ele imprime.

### Código
```python
letras = "ABCD"
ordenados = 0
sem_ordem = 0
for a in letras:
    for b in letras:
        if a != b:
            ordenados += 1
            if a < b:
                sem_ordem += 1
print(len(letras) ** 2, ordenados, sem_ordem)
print(ordenados // sem_ordem)
```

### Dicas
1. Pela regra do produto, os dois laços juntos visitam 4 × 4 combinações. Quantas delas têm `a == b`?
2. O par `("A", "B")` e o par `("B", "A")` passam no `a != b`. Quantos deles passam também no `a < b`?

### Saída esperada
```text
16 12 6
2
```

## Passo 3 · Leitura · Permutações, arranjos e combinações

A previsão mostrou as três contagens básicas. Com $n$ itens distintos:

- **Permutações:** ordenar todos os $n$ itens dá $n! = n \cdot (n-1) \cdots 1$ ordens, com $0! = 1$.
- **Arranjos:** escolher $k$ itens **em ordem** dá $A(n, k) = n \cdot (n-1) \cdots (n-k+1) = \frac{n!}{(n-k)!}$. São $k$ fatores: o último é $n-k+1$, não $n-k$.
- **Combinações:** escolher $k$ itens **sem ordem**. Cada subconjunto aparece em $k!$ ordens entre os arranjos, então $\binom{n}{k} = \frac{A(n, k)}{k!} = \frac{n!}{k!\,(n-k)!}$. No passo anterior, $A(4, 2) = 12$ e $\binom{4}{2} = 6 = 12 / 2!$.

Fora da faixa $0 \le k \le n$, não há como escolher: as contagens valem 0.

As combinações obedecem à **identidade de Pascal**:

$$
\binom{n}{k} = \binom{n-1}{k-1} + \binom{n-1}{k}
$$

Separe um item. Ou ele entra no subconjunto, e faltam $k-1$ itens escolhidos entre os outros $n-1$; ou não entra, e os $k$ saem dos outros $n-1$. Os dois casos não se sobrepõem: é a regra da soma. Com ela, cada linha do triângulo sai da anterior só com somas. Acompanhe no visualizador:

```python visualizar
linha = [1]
for n in range(1, 6):
    nova = [1]
    for k in range(1, n):
        nova.append(linha[k - 1] + linha[k])
    nova.append(1)
    linha = nova
    print(n, linha)
```

Com **repetidos**, as permutações contam ordens iguais várias vezes. Uma palavra de $n$ letras em que as letras aparecem $f_1, f_2, \dots, f_m$ vezes tem $\frac{n!}{f_1!\, f_2! \cdots f_m!}$ anagramas distintos: "banana" tem $\frac{6!}{3!\,2!\,1!} = 60$.

Os inteiros do Python não estouram, mas `float` sim. Com `/`, a conta vira `float`, que guarda só uns 16 dígitos significativos:

```python
import math
print(math.factorial(60) // (math.factorial(30) ** 2))  # 118264581564861424
print(math.factorial(60) / (math.factorial(30) ** 2))   # 1.1826458156486142e+17
math.factorial(2000) / (math.factorial(1000) ** 2)
# OverflowError: integer division result too large for a float
```

Use só `*`, `+` e `//` com divisão exata.

## Passo 4 · Exercício · Arranjos e combinações exatos
modo: lacunas

Complete as lacunas (`___`). `arranjos(n, k)` multiplica os $k$ fatores $n, n-1, \dots, n-k+1$. `combinacoes(n, k)` guarda uma linha do triângulo de Pascal, cortada nas posições `0..k`, e a transforma na linha seguinte `n` vezes. A atualização acontece **na própria lista**, de trás para frente. As duas devolvem 0 fora da faixa $0 \le k \le n$, e nenhuma usa `math.comb` ou `math.perm`. Exemplo: `arranjos(10, 3)` é `720` e `combinacoes(10, 3)` é `120`.

### Instruções
1. Em `arranjos`, multiplique exatamente `k` fatores, começando em `n`.
2. Em `combinacoes`, percorra as posições da linha de trás para frente.
3. Em `combinacoes`, cada posição recebe a soma dela mesma com a vizinha da esquerda (identidade de Pascal).

### Código inicial
```python
def arranjos(n, k):
    if k < 0 or k > n:
        return 0
    total = 1
    for i in range(___):
        total *= n - ___
    return total


def combinacoes(n, k):
    if k < 0 or k > n:
        return 0
    linha = [1] + [0] * k
    for _ in range(n):
        for j in range(k, 0, ___):
            linha[j] += linha[___]
    return linha[k]
```

### Solução
```python
def arranjos(n, k):
    if k < 0 or k > n:
        return 0
    total = 1
    for i in range(k):
        total *= n - i
    return total


def combinacoes(n, k):
    if k < 0 or k > n:
        return 0
    linha = [1] + [0] * k
    for _ in range(n):
        for j in range(k, 0, -1):
            linha[j] += linha[j - 1]
    return linha[k]
```

### Dicas
1. $A(5, 2) = 5 \cdot 4$: dois fatores. Confira quantos fatores o seu laço multiplica e qual é o primeiro.
2. Se `j` andar para frente, `linha[j - 1]` já foi atualizada nesta volta e pertence à linha nova.
3. Pascal: $\binom{n}{j} = \binom{n-1}{j-1} + \binom{n-1}{j}$. A posição `j` da linha nova soma as posições `j - 1` e `j` da antiga.

### Verificação
```json
[
  { "id": "sem-comb", "checkpoint": 3, "kind": "source", "rule": { "type": "not_calls", "name": "comb" },
    "name": "Não usa math.comb" },
  { "id": "sem-perm", "checkpoint": 1, "kind": "source", "rule": { "type": "not_calls", "name": "perm" },
    "name": "Não usa math.perm" },
  { "id": "arranjos-forca", "checkpoint": 1, "kind": "expr", "setup": "import itertools",
    "expr": "all(arranjos(n, k) == len(list(itertools.permutations(range(n), k))) for n in range(8) for k in range(n + 1))",
    "expected": true, "name": "arranjos confere com a enumeração para n até 7",
    "hint": "São k fatores: n, n - 1, ..., n - k + 1." },
  { "id": "combinacoes-forca", "checkpoint": 3, "kind": "expr", "setup": "import itertools",
    "expr": "all(combinacoes(n, k) == len(list(itertools.combinations(range(n), k))) for n in range(10) for k in range(n + 1))",
    "expected": true, "name": "combinacoes confere com a enumeração para n até 9" },
  { "id": "fora-da-faixa", "checkpoint": 1, "kind": "expr",
    "expr": "[arranjos(5, 6), combinacoes(5, 6), combinacoes(5, -1), arranjos(4, 0), combinacoes(0, 0)]",
    "expected": [0, 0, 0, 1, 1], "name": "Fora da faixa é 0; escolher zero itens é 1" },
  { "id": "c-60-30", "checkpoint": 2, "kind": "expr", "expr": "str(combinacoes(60, 30))", "expected": "118264581564861424",
    "name": "combinacoes(60, 30) exato: 118264581564861424",
    "hint": "Com /, o resultado vira float e perde os últimos dígitos." },
  { "id": "c-1000-500", "checkpoint": 2, "kind": "expr", "setup": "import math",
    "expr": "combinacoes(1000, 500) == math.comb(1000, 500)", "expected": true,
    "name": "combinacoes(1000, 500), com 300 dígitos, é exato" },
  { "id": "a-30-10", "checkpoint": 1, "kind": "expr", "setup": "import math",
    "expr": "[arranjos(30, 10) == math.perm(30, 10), arranjos(20, 20) == math.factorial(20)]", "expected": [true, true],
    "name": "arranjos(30, 10) e arranjos(20, 20) = 20! exatos" }
]
```

### Soluções erradas
```python name="arranjos com um fator a mais"
def arranjos(n, k):
    if k < 0 or k > n:
        return 0
    total = 1
    for i in range(k + 1):
        total *= n - i
    return total


def combinacoes(n, k):
    if k < 0 or k > n:
        return 0
    linha = [1] + [0] * k
    for _ in range(n):
        for j in range(k, 0, -1):
            linha[j] += linha[j - 1]
    return linha[k]
```
```python name="arranjos começa em n - 1"
def arranjos(n, k):
    if k < 0 or k > n:
        return 0
    total = 1
    for i in range(k):
        total *= n - i - 1
    return total


def combinacoes(n, k):
    if k < 0 or k > n:
        return 0
    linha = [1] + [0] * k
    for _ in range(n):
        for j in range(k, 0, -1):
            linha[j] += linha[j - 1]
    return linha[k]
```
```python name="Pascal de frente para trás"
def arranjos(n, k):
    if k < 0 or k > n:
        return 0
    total = 1
    for i in range(k):
        total *= n - i
    return total


def combinacoes(n, k):
    if k < 0 or k > n:
        return 0
    linha = [1] + [0] * k
    for _ in range(n):
        for j in range(1, k + 1):
            linha[j] += linha[j - 1]
    return linha[k]
```
```python name="combinação sem dividir pelas k! ordens"
def arranjos(n, k):
    if k < 0 or k > n:
        return 0
    total = 1
    for i in range(k):
        total *= n - i
    return total


def combinacoes(n, k):
    return arranjos(n, k)
```
```python name="fatoriais com / (vira float)"
import math


def arranjos(n, k):
    if k < 0 or k > n:
        return 0
    total = 1
    for i in range(k):
        total *= n - i
    return total


def combinacoes(n, k):
    if k < 0 or k > n:
        return 0
    return math.factorial(n) / (math.factorial(k) * math.factorial(n - k))
```

## Passo 5 · Exercício · Anagramas e rotas do caixeiro-viajante

Escreva duas funções que devolvem `int` exato:

- `anagramas_distintos(palavra)`: quantos anagramas distintos a palavra tem, contando a própria palavra. Exemplos: `"banana"` tem 60; `"ovo"` tem 3; a palavra vazia tem 1.
- `rotas_distintas(n)`: um vendedor sai de uma cidade, visita cada uma das outras $n - 1$ exatamente uma vez e volta à cidade de origem. Duas rotas que são a mesma volta percorrida em sentidos opostos contam como uma só. Devolva quantas rotas distintas existem, para $n \ge 3$. Exemplo: com 4 cidades, `rotas_distintas(4)` é `3`.

Pode usar `math.factorial`. A verificação compara as suas fórmulas com a enumeração de todas as ordens.

### Instruções
1. Em `anagramas_distintos`, conte quantas vezes cada letra aparece e divida $n!$ pelo fatorial de cada contagem.
2. Em `rotas_distintas`, a cidade de origem é fixa: conte as ordens das outras cidades e desconte o sentido da volta.

### Código inicial
```python
import math


def anagramas_distintos(palavra):
    pass


def rotas_distintas(n):
    pass
```

### Solução
```python
import math


def anagramas_distintos(palavra):
    contagem = {}
    for letra in palavra:
        contagem[letra] = contagem.get(letra, 0) + 1
    total = math.factorial(len(palavra))
    for f in contagem.values():
        total //= math.factorial(f)
    return total


def rotas_distintas(n):
    return math.factorial(n - 1) // 2
```

### Dicas
1. Em "banana", as três letras `a` podem trocar de lugar entre si de $3!$ jeitos sem mudar a palavra.
2. A origem não se move: só as outras $n - 1$ cidades mudam de ordem.
3. Cada volta aparece duas vezes entre as ordens: A→B→C→D→A e A→D→C→B→A.

### Verificação
```json
[
  { "id": "anagramas-forca", "checkpoint": 1, "kind": "expr", "setup": "import itertools",
    "expr": "[anagramas_distintos(p) == len(set(itertools.permutations(p))) for p in ['banana', 'arara', 'ovo', 'abcd', 'aaaa', 'ab', 'casca']]",
    "expected": [true, true, true, true, true, true, true],
    "name": "Confere com a enumeração em banana, arara, ovo, abcd, aaaa, ab e casca",
    "hint": "Cada letra repetida f vezes divide o total por f!, não por f." },
  { "id": "anagramas-vazia", "checkpoint": 1, "kind": "call", "function": "anagramas_distintos", "args": [""], "expected": 1,
    "name": "A palavra vazia tem 1 anagrama (ela mesma)" },
  { "id": "anagramas-mississippi", "checkpoint": 1, "kind": "call", "function": "anagramas_distintos", "args": ["mississippi"],
    "expected": 34650, "type": "int", "name": "mississippi tem 34650 anagramas (int)" },
  { "id": "anagramas-grande", "checkpoint": 1, "kind": "expr", "setup": "import math",
    "expr": "[anagramas_distintos('abcdefghijklmnopqrstuvwxyz') == math.factorial(26), anagramas_distintos('a' * 10 + 'b' * 10 + 'c' * 10)]",
    "expected": [true, 5550996791340], "name": "26 letras distintas dão 26! exato; 10 a, 10 b, 10 c dão 5550996791340",
    "hint": "26! tem 27 dígitos: com / ele vira float e perde a exatidão." },
  { "id": "rotas-forca", "checkpoint": 2, "kind": "expr",
    "setup": "import itertools\ndef forca(n):\n    vistas = set()\n    for p in itertools.permutations(range(1, n)):\n        vistas.add(min(p, p[::-1]))\n    return len(vistas)",
    "expr": "[rotas_distintas(n) == forca(n) for n in range(3, 9)]", "expected": [true, true, true, true, true, true],
    "name": "Confere com a enumeração das rotas de 3 a 8 cidades",
    "hint": "Enumere as rotas de 4 cidades à mão: são só 3." },
  { "id": "rotas-10", "checkpoint": 2, "kind": "call", "function": "rotas_distintas", "args": [10], "expected": 181440, "type": "int",
    "name": "rotas_distintas(10) é 181440 (int)" },
  { "id": "rotas-20", "checkpoint": 2, "kind": "expr", "expr": "str(rotas_distintas(20))", "expected": "60822550204416000",
    "name": "rotas_distintas(20) é 60822550204416000" }
]
```

### Soluções erradas
```python name="divide pela contagem, não pelo fatorial dela"
import math


def anagramas_distintos(palavra):
    contagem = {}
    for letra in palavra:
        contagem[letra] = contagem.get(letra, 0) + 1
    total = math.factorial(len(palavra))
    for f in contagem.values():
        total //= f
    return total


def rotas_distintas(n):
    return math.factorial(n - 1) // 2
```
```python name="anagramas com / devolve float"
import math


def anagramas_distintos(palavra):
    contagem = {}
    for letra in palavra:
        contagem[letra] = contagem.get(letra, 0) + 1
    total = math.factorial(len(palavra))
    for f in contagem.values():
        total = total / math.factorial(f)
    return total


def rotas_distintas(n):
    return math.factorial(n - 1) // 2
```
```python name="rotas com n! (não fixa a origem)"
import math


def anagramas_distintos(palavra):
    contagem = {}
    for letra in palavra:
        contagem[letra] = contagem.get(letra, 0) + 1
    total = math.factorial(len(palavra))
    for f in contagem.values():
        total //= math.factorial(f)
    return total


def rotas_distintas(n):
    return math.factorial(n) // 2
```
```python name="rotas contam os dois sentidos"
import math


def anagramas_distintos(palavra):
    contagem = {}
    for letra in palavra:
        contagem[letra] = contagem.get(letra, 0) + 1
    total = math.factorial(len(palavra))
    for f in contagem.values():
        total //= math.factorial(f)
    return total


def rotas_distintas(n):
    return math.factorial(n - 1)
```
```python name="anagramas ignora letras repetidas"
import math


def anagramas_distintos(palavra):
    return math.factorial(len(palavra))


def rotas_distintas(n):
    return math.factorial(n - 1) // 2
```

## Passo 6 · Leitura · Casa dos pombos e explosão combinatória

O **princípio da casa dos pombos**: se $N$ objetos vão para $M$ caixas e $N > M$, alguma caixa recebe pelo menos dois. A prova é por contradição: se toda caixa tivesse no máximo um objeto, haveria no máximo $M$ objetos.

A versão geral: alguma caixa recebe pelo menos $\lceil N / M \rceil$ objetos. Para **garantir** uma caixa com $k$ objetos, olhe o pior caso: dá para pôr $k - 1$ em cada caixa sem chegar a $k$, num total de $M(k-1)$ objetos. Um objeto a mais força o $k$-ésimo em alguma caixa:

$$
N_{\min} = M\,(k - 1) + 1
$$

Os dois erros comuns são esquecer o $+1$ ($M(k-1)$ ainda cabe sem ninguém chegar a $k$) e usar $Mk$, que é mais do que o necessário. Exemplos:

- Uma tabela hash com 1024 posições tem colisão garantida a partir de $1024 \cdot 1 + 1 = 1025$ chaves, qualquer que seja a função de hash.
- Numa turma de $12 \cdot 2 + 1 = 25$ alunos, algum mês tem pelo menos três aniversariantes.

"Garantido" é diferente de "provável": com 23 pessoas, a chance de duas fazerem aniversário no mesmo dia já passa de 50%. A certeza só vem com 367 pessoas (366 dias possíveis, mais uma).

A contagem também mede o custo da **força bruta**. Uma senha de 8 símbolos entre 62 (letras maiúsculas, minúsculas e dígitos) tem $62^8 \approx 2{,}2 \cdot 10^{14}$ possibilidades. Um atacante fictício que testa $10^{10}$ senhas por segundo leva cerca de 6 horas para testar todas. Com 12 símbolos, são $62^{12} \approx 3{,}2 \cdot 10^{21}$ senhas, e o mesmo atacante leva uns 10 mil anos: cada símbolo a mais multiplica o trabalho por 62. Para o caixeiro-viajante com 20 cidades, são $19!/2 \approx 6 \cdot 10^{16}$ rotas.

```python
segundos_por_ano = 365 * 24 * 3600
for k in (8, 10, 12):
    anos = 62**k / 1e10 / segundos_por_ano
    print(k, f"{anos:.2e} anos")
# 8 6.92e-04 anos
# 10 2.66e+00 anos
# 12 1.02e+04 anos
```

Crescimento assim é o que a lição 5 chama de **exponencial** (ou fatorial, no caso das rotas). Ele condena a força bruta: o computador cem vezes mais rápido só ganha um ou dois símbolos.

## Passo 7 · Exercício · Complemento e casa dos pombos

Escreva duas funções:

- `senhas_com_digito(letras, digitos, k)`: o alfabeto tem `letras` letras e `digitos` dígitos, todos distintos. Devolva quantas senhas de comprimento `k` (com repetição) têm **pelo menos um dígito**. Exemplo: `senhas_com_digito(26, 10, 2)` é `620`.
- `minimo_para_garantir(caixas, k)`: o menor número de objetos que, distribuídos em `caixas` caixas **de qualquer jeito**, garante uma caixa com pelo menos `k` objetos (`caixas >= 1`, `k >= 1`). Exemplo: `minimo_para_garantir(12, 3)` é `25`.

As duas fórmulas são conferidas com a enumeração de todas as senhas e de todas as distribuições em casos pequenos.

### Instruções
1. Em `senhas_com_digito`, conte pelo complemento: todas as senhas menos as que não têm dígito.
2. Em `minimo_para_garantir`, parta do pior caso, em que nenhuma caixa chega a `k`, e acrescente o que falta.

### Código inicial
```python
def senhas_com_digito(letras, digitos, k):
    pass


def minimo_para_garantir(caixas, k):
    pass
```

### Solução
```python
def senhas_com_digito(letras, digitos, k):
    return (letras + digitos) ** k - letras ** k


def minimo_para_garantir(caixas, k):
    return caixas * (k - 1) + 1
```

### Dicas
1. Uma senha sem nenhum dígito só usa letras em cada uma das `k` posições.
2. Escolher "a posição do dígito" e liberar as outras conta várias vezes as senhas com mais de um dígito.
3. Quantos objetos cabem sem que nenhuma caixa chegue a `k`? O próximo objeto é que garante.

### Verificação
```json
[
  { "id": "senhas-forca", "checkpoint": 1, "kind": "expr",
    "setup": "import itertools\ndef forca(letras, digitos, k):\n    return sum(1 for s in itertools.product(range(letras + digitos), repeat=k) if any(x >= letras for x in s))",
    "expr": "all(senhas_com_digito(l, d, k) == forca(l, d, k) for l in (1, 2, 3) for d in (1, 2) for k in (1, 2, 3, 4))",
    "expected": true, "name": "Confere com a enumeração para alfabetos pequenos e k de 1 a 4",
    "hint": "Conte as senhas sem nenhum dígito e use o complemento." },
  { "id": "senhas-k0-d0", "checkpoint": 1, "kind": "expr",
    "expr": "[senhas_com_digito(26, 10, 0), senhas_com_digito(26, 0, 5)]", "expected": [0, 0],
    "name": "Senha vazia não tem dígito; sem dígitos no alfabeto, nenhuma senha tem" },
  { "id": "senhas-8", "checkpoint": 1, "kind": "call", "function": "senhas_com_digito", "args": [26, 10, 8], "expected": 2612282842880,
    "name": "senhas_com_digito(26, 10, 8) é 2612282842880" },
  { "id": "pombos-forca", "checkpoint": 2, "kind": "expr",
    "setup": "import itertools\ndef forca(caixas, k):\n    n = 0\n    while True:\n        ok = True\n        for d in itertools.product(range(caixas), repeat=n):\n            if max([d.count(c) for c in range(caixas)]) < k:\n                ok = False\n                break\n        if ok:\n            return n\n        n += 1",
    "expr": "all(minimo_para_garantir(c, k) == forca(c, k) for c in (1, 2, 3) for k in (1, 2, 3))",
    "expected": true, "name": "Confere com a enumeração de todas as distribuições (até 3 caixas, k até 3)",
    "hint": "Com k - 1 objetos em cada caixa, nenhuma chegou a k ainda." },
  { "id": "pombos-hash", "checkpoint": 2, "kind": "expr",
    "expr": "[minimo_para_garantir(1024, 2), minimo_para_garantir(12, 3), minimo_para_garantir(366, 2)]", "expected": [1025, 25, 367],
    "name": "1024 posições: 1025; 12 meses e 3 aniversariantes: 25; 366 dias: 367" },
  { "id": "pombos-k1", "checkpoint": 2, "kind": "expr",
    "expr": "[minimo_para_garantir(50, 1), minimo_para_garantir(1, 7)]", "expected": [1, 7],
    "name": "k = 1 pede um objeto; com uma caixa só, k objetos" }
]
```

### Soluções erradas
```python name="fixa uma posição para o dígito"
def senhas_com_digito(letras, digitos, k):
    if k == 0:
        return 0
    return digitos * (letras + digitos) ** (k - 1)


def minimo_para_garantir(caixas, k):
    return caixas * (k - 1) + 1
```
```python name="escolhe a posição do dígito e libera as outras"
def senhas_com_digito(letras, digitos, k):
    if k == 0:
        return 0
    return k * digitos * (letras + digitos) ** (k - 1)


def minimo_para_garantir(caixas, k):
    return caixas * (k - 1) + 1
```
```python name="complemento tira as senhas só de dígitos"
def senhas_com_digito(letras, digitos, k):
    return (letras + digitos) ** k - digitos ** k


def minimo_para_garantir(caixas, k):
    return caixas * (k - 1) + 1
```
```python name="pombos sem o + 1"
def senhas_com_digito(letras, digitos, k):
    return (letras + digitos) ** k - letras ** k


def minimo_para_garantir(caixas, k):
    return caixas * (k - 1)
```
```python name="pombos com caixas * k"
def senhas_com_digito(letras, digitos, k):
    return (letras + digitos) ** k - letras ** k


def minimo_para_garantir(caixas, k):
    return caixas * k
```

## Passo 8 · Quiz · Escolher a fórmula certa

### Pergunta
Dos 10 alunos de uma turma, a comissão de formatura precisa de **presidente, tesoureiro e secretário** (cargos diferentes). Depois, a turma escolhe **3 representantes**, sem cargo. Quantas escolhas existem em cada caso?
- [ ] 120 para a comissão e 720 para os representantes
- [x] 720 para a comissão e 120 para os representantes
- [ ] 1000 para a comissão e 120 para os representantes
- [ ] 720 nos dois casos
> Com cargos, a ordem importa: $A(10, 3) = 10 \cdot 9 \cdot 8 = 720$. Sem cargos, cada trio aparece em $3! = 6$ ordens: $720 / 6 = 120$. $10^3 = 1000$ deixaria a mesma pessoa ocupar dois cargos.

### Pergunta
Uma turma tem 40 alunos. O que se pode **garantir** sobre os meses de aniversário?
- [ ] Algum mês tem pelo menos 3 aniversariantes, e não dá para garantir mais que isso.
- [x] Algum mês tem pelo menos 4 aniversariantes.
- [ ] Algum mês tem pelo menos 5 aniversariantes.
- [ ] Todo mês tem pelo menos 3 aniversariantes.
> Pela casa dos pombos, alguma caixa recebe pelo menos $\lceil 40 / 12 \rceil = 4$. Com 3 por mês caberiam só 36 alunos. Já 5 não é garantido: 4 alunos em cada um de 4 meses e 3 em cada um dos outros 8 somam 40. Nada impede um mês sem nenhum aniversariante.

### Pergunta
Para contar as senhas de 4 dígitos com **pelo menos um 7**, um colega fez: "escolho a posição do 7 (4 jeitos) e as outras 3 posições são livres ($10^3$)", e chegou a $4\,000$. Qual é o problema?
- [ ] Nenhum: $4 \cdot 10^3$ está correto.
- [ ] As outras posições não podem ter 7, então o certo é $4 \cdot 9^3 = 2\,916$.
- [x] Senhas com mais de um 7 são contadas várias vezes; o certo é $10^4 - 9^4 = 3\,439$.
- [ ] Faltou dividir por $4!$, porque a ordem dos dígitos não importa.
> `7707` é contada uma vez para cada 7 que é escolhido como "o 7": três vezes. Proibir 7 nas outras posições conta só as senhas com **exatamente** um 7 ($2\,916$). O complemento evita os dois erros: tire do total as $9^4$ senhas sem nenhum 7. Numa senha, a ordem importa: `1234` e `4321` são diferentes.
