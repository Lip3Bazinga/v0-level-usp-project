---
slug: n3-m2-04-melhor-pior-e-medio-caso-e-memoria
titulo: Melhor, pior e caso médio; custo de memória
descricao: Por que a busca linear é O(1) no melhor caso e O(n) no pior, custo amortizado do append, e análise de espaço.
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
  - Analisar melhor, pior e caso médio de um algoritmo e dizer qual importa em cada situação
  - Explicar o custo amortizado de list.append e de redimensionamento
  - Estimar o custo de memória (espaço auxiliar) de um algoritmo e reconhecer soluções in-place
---

## Passo 1 · Leitura · Mesmo tamanho, custos diferentes

Duas listas com o mesmo $n$ podem custar muito diferente para o mesmo algoritmo. Na busca linear, que compara o alvo com cada elemento até achá-lo, o número de comparações depende de **onde** o alvo está:

- **Melhor caso:** o alvo é o primeiro elemento. 1 comparação, $\Theta(1)$.
- **Pior caso:** o alvo é o último ou não está na lista. $n$ comparações, $\Theta(n)$.
- **Caso médio:** depende de quais alvos são pedidos, e com que frequência.

O caso médio exige uma **distribuição**: uma hipótese sobre as entradas. Se o alvo está sempre na lista, com a mesma chance em cada posição, a posição $k$ custa $k$ comparações e a média é

$$
\frac{1}{n}\sum_{k=1}^{n} k = \frac{n+1}{2}.
$$

Se o alvo está na lista com probabilidade $p$ (e, quando está, em qualquer posição com a mesma chance), as ausências custam $n$ cada:

$$
E[\text{comparações}] = p \cdot \frac{n+1}{2} + (1 - p) \cdot n .
$$

Com $p = \frac{1}{2}$, dá cerca de $0{,}75\,n$. Por isso caso médio **não** é "a média entre o melhor e o pior": é a média sobre as entradas, pesada pela frequência de cada uma. Os usuários reais quase nunca pedem todos os alvos com a mesma frequência:

```python
# comparações da busca linear em [7, 3, 9, 5], por alvo
custo = {7: 1, 3: 2, 9: 3, 5: 4, "ausente": 4}
consultas = [7, 7, 7, 9, "ausente"]        # o que foi pedido de fato
print(sum(custo[c] for c in consultas) / len(consultas))   # 2.0
```

#### Qual caso usar

- **Pior caso** é uma **garantia**: vale para qualquer entrada. É o que importa quando a entrada pode ser hostil (um servidor que recebe dados de qualquer pessoa) ou quando um atraso é inaceitável.
- **Caso médio** é útil quando a hipótese sobre as entradas é realista, ou quando o próprio algoritmo sorteia algo e a média é sobre os sorteios (é o caso do quick sort aleatorizado, no módulo 4).
- **Melhor caso** quase nunca serve para decidir: qualquer algoritmo tem alguma entrada sortuda.

Lembre da lição anterior: cada caso é uma função de $n$ com seu próprio $\Theta$. "O pior caso é $\Theta(n)$" e "o melhor caso é $\Theta(1)$" são duas frases verdadeiras sobre a mesma busca.

## Passo 2 · Exercício · Contando comparações sob uma distribuição

Escreva três funções.

- `comparacoes(lista, alvo)`: quantas comparações `elemento == alvo` a busca linear faz, da esquerda para a direita, parando na primeira ocorrência.
- `media_de_comparacoes(lista, consultas)`: a média de `comparacoes(lista, c)` para cada `c` da lista `consultas` (que tem pelo menos um elemento), como `float`. É o caso médio sob a distribuição das consultas.
- `esperado(n, p)`: o número esperado de comparações pela fórmula da leitura, com o alvo presente com probabilidade `p` e posição uniforme, como `float`.

Exemplos: `comparacoes([7, 3, 9, 5], 9)` é `3`; `comparacoes([7, 3, 9, 5], 8)` é `4`; `esperado(9, 0.5)` é `7.0`.

### Instruções
1. Em `comparacoes`, conte também a comparação que encontra o alvo, e pare nela.
2. Em `media_de_comparacoes`, some as comparações de todas as consultas e divida pela quantidade de consultas.
3. Em `esperado`, combine o custo médio quando o alvo está presente com o custo quando está ausente, pesados por `p` e `1 - p`.

### Código inicial
```python
def comparacoes(lista, alvo):
    pass


def media_de_comparacoes(lista, consultas):
    pass


def esperado(n, p):
    pass
```

### Solução
```python
def comparacoes(lista, alvo):
    feitas = 0
    for x in lista:
        feitas += 1
        if x == alvo:
            break
    return feitas


def media_de_comparacoes(lista, consultas):
    total = 0
    for c in consultas:
        total += comparacoes(lista, c)
    return total / len(consultas)


def esperado(n, p):
    return p * (n + 1) / 2 + (1 - p) * n
```

### Dicas
1. Incremente o contador **antes** de testar `x == alvo`.
2. A distribuição está nas consultas: um alvo pedido três vezes pesa três vezes.
3. Quando o alvo está ausente, a busca compara com todos os $n$ elementos.

### Verificação
```json
[
  { "id": "posicoes", "checkpoint": 1, "kind": "expr",
    "expr": "[comparacoes([4, 8, 15, 16, 23], x) for x in (4, 15, 23, 42)]", "expected": [1, 3, 5, 5],
    "name": "Primeiro, do meio, último e ausente: 1, 3, 5 e 5",
    "hint": "A comparação que encontra o alvo também conta." },
  { "id": "repetido", "checkpoint": 1, "kind": "call", "function": "comparacoes", "args": [[2, 6, 6, 6], 6], "expected": 2,
    "name": "Para na primeira ocorrência", "hint": "Depois de achar, não compare mais nada." },
  { "id": "vazia", "checkpoint": 1, "kind": "call", "function": "comparacoes", "args": [[], 1], "expected": 0,
    "name": "Lista vazia: 0 comparações" },
  { "id": "uniforme", "checkpoint": 2, "kind": "call", "function": "media_de_comparacoes",
    "args": [[10, 20, 30, 40], [10, 20, 30, 40]], "expected": 2.5, "tolerance": 1e-9,
    "name": "Cada elemento pedido uma vez: média 2.5" },
  { "id": "concentrada", "checkpoint": 2, "kind": "call", "function": "media_de_comparacoes",
    "args": [[10, 20, 30, 40], [10, 10, 10, 40]], "expected": 1.75, "tolerance": 1e-9,
    "name": "Consultas concentradas no início: média 1.75",
    "hint": "A média é sobre as consultas, não sobre o melhor e o pior caso." },
  { "id": "com-ausentes", "checkpoint": 2, "kind": "call", "function": "media_de_comparacoes",
    "args": [[5, 1, 9], [9, 0, 0, 1, 5]], "expected": 2.4, "tolerance": 1e-9,
    "name": "Consultas com alvos ausentes: média 2.4" },
  { "id": "tipo", "checkpoint": 2, "kind": "call", "function": "media_de_comparacoes",
    "args": [[1, 2], [2, 2]], "expected": 2.0, "type": "float", "name": "Devolve float" },
  { "id": "formula", "checkpoint": 3, "kind": "expr", "expr": "[esperado(100, 1), esperado(100, 0), esperado(9, 0.5), esperado(1, 0.3)]",
    "expected": [50.5, 100.0, 7.0, 1.0], "name": "esperado para p = 1, p = 0, p = 0.5 e n = 1",
    "hint": "Com p = 0, o alvo nunca está na lista." },
  { "id": "formula-bate-com-media", "checkpoint": 3, "kind": "expr",
    "setup": "lista = list(range(1, 11))\nconsultas = lista + [0] * 30",
    "expr": "abs(esperado(10, 0.25) - media_de_comparacoes(lista, consultas)) < 1e-9", "expected": true,
    "name": "A fórmula bate com a média medida: 10 elementos presentes e 30 ausentes (p = 0.25)" }
]
```

### Soluções erradas
```python name="não conta a comparação que encontra"
def comparacoes(lista, alvo):
    feitas = 0
    for x in lista:
        if x == alvo:
            break
        feitas += 1
    return feitas


def media_de_comparacoes(lista, consultas):
    total = 0
    for c in consultas:
        total += comparacoes(lista, c)
    return total / len(consultas)


def esperado(n, p):
    return p * (n + 1) / 2 + (1 - p) * n
```
```python name="não para ao encontrar"
def comparacoes(lista, alvo):
    feitas = 0
    for x in lista:
        feitas += 1
    return feitas


def media_de_comparacoes(lista, consultas):
    total = 0
    for c in consultas:
        total += comparacoes(lista, c)
    return total / len(consultas)


def esperado(n, p):
    return p * (n + 1) / 2 + (1 - p) * n
```
```python name="caso médio como média do melhor e do pior"
def comparacoes(lista, alvo):
    feitas = 0
    for x in lista:
        feitas += 1
        if x == alvo:
            break
    return feitas


def media_de_comparacoes(lista, consultas):
    return (1 + len(lista)) / 2


def esperado(n, p):
    return p * (n + 1) / 2 + (1 - p) * n
```
```python name="divide pelo tamanho da lista"
def comparacoes(lista, alvo):
    feitas = 0
    for x in lista:
        feitas += 1
        if x == alvo:
            break
    return feitas


def media_de_comparacoes(lista, consultas):
    total = 0
    for c in consultas:
        total += comparacoes(lista, c)
    return total / len(lista)


def esperado(n, p):
    return p * (n + 1) / 2 + (1 - p) * n
```
```python name="esquece o custo das ausências"
def comparacoes(lista, alvo):
    feitas = 0
    for x in lista:
        feitas += 1
        if x == alvo:
            break
    return feitas


def media_de_comparacoes(lista, consultas):
    total = 0
    for c in consultas:
        total += comparacoes(lista, c)
    return total / len(consultas)


def esperado(n, p):
    return (n + 1) / 2
```

## Passo 3 · Leitura · Custo amortizado: por que append é O(1)

Uma `list` do Python guarda os elementos num bloco contíguo de memória com uma **capacidade**, que pode ser maior que o tamanho. Enquanto sobra espaço, `append` só escreve no fim. Quando a capacidade acaba, o Python reserva um bloco maior e **copia todos** os elementos para lá: esse `append` custa $\Theta(n)$.

Mesmo assim, $n$ appends seguidos custam $\Theta(n)$ no total, porque a capacidade cresce por um **fator**. Suponha que ela dobre: as cópias acontecem quando o tamanho é $1, 2, 4, \dots$, e somam

$$
1 + 2 + 4 + \dots + 2^{k} < 2 \cdot 2^{k} \le 2n .
$$

Com as $n$ escritas, o total fica abaixo de $3n$: menos de 3 operações por `append`. É isso que se chama **custo amortizado** $O(1)$: a média por operação, numa sequência **qualquer** de operações, sem probabilidade nenhuma. Não confunda com caso médio: aqui não há hipótese sobre as entradas, é uma garantia.

O CPython 3.14 não dobra: ele cresce cerca de 12,5% mais uma pequena constante. As capacidades, medidas com `sys.getsizeof`, são 4, 8, 16, 24, 32, 40, 52, 64, 76… O fator menor faz mais cópias (umas 8 por elemento, em vez de 1), mas a conta é a mesma: série geométrica, custo amortizado constante.

O que **não** funciona é crescer por uma quantidade fixa. Com $+10$ posições a cada estouro, as cópias são $10 + 20 + 30 + \dots + n \approx \frac{n^2}{20}$: $\Theta(n^2)$ no total, $\Theta(n)$ por `append`.

No visualizador, acompanhe uma lista que dobra: as cópias ficam cada vez mais raras e o total de cópias nunca passa do número de inserções.

```python visualizar
capacidade = 0
tamanho = 0
copias = 0
for _ in range(9):
    if tamanho == capacidade:
        capacidade = max(1, 2 * capacidade)
        copias += tamanho
    tamanho += 1
    print(tamanho, capacidade, copias)
```

## Passo 4 · Exercício · Simulando o vetor dinâmico

Escreva duas funções.

- `simular(n, crescer)`: simula `n` appends num vetor que começa com `capacidade = 0` e `tamanho = 0`. Antes de cada inserção, se `tamanho == capacidade`, a capacidade passa a ser `crescer(capacidade)` e os `tamanho` elementos atuais são copiados. Devolva a tupla `(capacidade, copias)` ao final.
- `custo_amortizado(n, crescer)`: o trabalho total (as `n` escritas mais as cópias) dividido por `n`, como `float`. Considere `n >= 1`.

A correção usa estas três políticas de crescimento:

```python
dobrar = lambda c: max(1, 2 * c)
somar_dez = lambda c: c + 10
como_cpython = lambda c: ((c + 1) + ((c + 1) >> 3) + 6) & ~3   # 0, 4, 8, 16, 24, 32...
```

Exemplo: `simular(5, dobrar)` passa pelas capacidades 1, 2, 4 e 8 e devolve `(8, 7)`.

### Instruções
1. Em `simular`, chame `crescer` só quando o vetor estiver cheio, uma vez por estouro.
2. Em cada estouro, some às cópias os elementos que **já estavam** no vetor.
3. Em `custo_amortizado`, divida as escritas mais as cópias por `n`.

### Código inicial
```python
def simular(n, crescer):
    pass


def custo_amortizado(n, crescer):
    pass
```

### Solução
```python
def simular(n, crescer):
    capacidade = 0
    tamanho = 0
    copias = 0
    for _ in range(n):
        if tamanho == capacidade:
            capacidade = crescer(capacidade)
            copias += tamanho
        tamanho += 1
    return (capacidade, copias)


def custo_amortizado(n, crescer):
    capacidade, copias = simular(n, crescer)
    return (n + copias) / n
```

### Dicas
1. Em `simular(1, dobrar)`, a capacidade vai de 0 para 1 sem copiar nada.
2. O elemento que está sendo inserido não é copiado: ele é escrito depois do estouro.
3. O trabalho de `n` appends inclui as `n` escritas, não só as cópias.

### Verificação
```json
[
  { "id": "dobrar-5", "checkpoint": 2, "kind": "expr", "setup": "dobrar = lambda c: max(1, 2 * c)",
    "expr": "simular(5, dobrar)", "expected": [8, 7], "name": "simular(5, dobrar) é (8, 7)" },
  { "id": "dobrar-pequenos", "checkpoint": 2, "kind": "expr", "setup": "dobrar = lambda c: max(1, 2 * c)",
    "expr": "[simular(0, dobrar), simular(1, dobrar), simular(2, dobrar), simular(4, dobrar)]",
    "expected": [[0, 0], [1, 0], [2, 1], [4, 3]], "name": "Dobrar com n = 0, 1, 2 e 4",
    "hint": "O elemento novo não entra nas cópias." },
  { "id": "dobrar-1025", "checkpoint": 2, "kind": "expr", "setup": "dobrar = lambda c: max(1, 2 * c)",
    "expr": "simular(1025, dobrar)", "expected": [2048, 2047], "name": "Dobrar com n = 1025: 2047 cópias" },
  { "id": "somar-dez", "checkpoint": 2, "kind": "expr", "setup": "somar_dez = lambda c: c + 10",
    "expr": "[simular(1000, somar_dez), simular(2000, somar_dez)]", "expected": [[1000, 49500], [2000, 199000]],
    "name": "Somar 10: dobrar n quadruplica as cópias" },
  { "id": "cpython", "checkpoint": 2, "kind": "expr", "setup": "como_cpython = lambda c: ((c + 1) + ((c + 1) >> 3) + 6) & ~3",
    "expr": "simular(65, como_cpython)", "expected": [76, 240], "name": "Política do CPython com 65 appends: (76, 240)" },
  { "id": "chamadas", "checkpoint": 1, "kind": "expr",
    "setup": "pedidas = []\ndef crescer(c):\n    pedidas.append(c)\n    return max(1, 2 * c)\nsimular(100, crescer)",
    "expr": "pedidas", "expected": [0, 1, 2, 4, 8, 16, 32, 64],
    "name": "crescer é chamada só nos estouros, com a capacidade cheia",
    "hint": "Só peça uma capacidade nova quando tamanho == capacidade." },
  { "id": "amortizado-dobrar", "checkpoint": 3, "kind": "expr", "setup": "dobrar = lambda c: max(1, 2 * c)",
    "expr": "[custo_amortizado(1024, dobrar), custo_amortizado(10 ** 6, dobrar) < 3]", "expected": [1.9990234375, true],
    "name": "Dobrar: custo amortizado abaixo de 3 até com um milhão de appends" },
  { "id": "amortizado-somar", "checkpoint": 3, "kind": "expr", "setup": "somar_dez = lambda c: c + 10",
    "expr": "[custo_amortizado(1000, somar_dez), custo_amortizado(2000, somar_dez)]", "expected": [50.5, 100.5],
    "name": "Somar 10: o custo por append cresce com n" },
  { "id": "amortizado-cpython", "checkpoint": 3, "kind": "expr",
    "setup": "como_cpython = lambda c: ((c + 1) + ((c + 1) >> 3) + 6) & ~3",
    "expr": "round(custo_amortizado(10 ** 5, como_cpython), 4)", "expected": 8.9813,
    "name": "Política do CPython: cerca de 9 operações por append" }
]
```

### Soluções erradas
```python name="soma a capacidade nova nas cópias"
def simular(n, crescer):
    capacidade = 0
    tamanho = 0
    copias = 0
    for _ in range(n):
        if tamanho == capacidade:
            capacidade = crescer(capacidade)
            copias += capacidade
        tamanho += 1
    return (capacidade, copias)


def custo_amortizado(n, crescer):
    capacidade, copias = simular(n, crescer)
    return (n + copias) / n
```
```python name="conta o elemento novo como copiado"
def simular(n, crescer):
    capacidade = 0
    tamanho = 0
    copias = 0
    for _ in range(n):
        if tamanho == capacidade:
            capacidade = crescer(capacidade)
            copias += tamanho + 1
        tamanho += 1
    return (capacidade, copias)


def custo_amortizado(n, crescer):
    capacidade, copias = simular(n, crescer)
    return (n + copias) / n
```
```python name="calcula a capacidade nova a cada inserção"
def simular(n, crescer):
    capacidade = 0
    tamanho = 0
    copias = 0
    for _ in range(n):
        nova = crescer(capacidade)
        if tamanho == capacidade:
            capacidade = nova
            copias += tamanho
        tamanho += 1
    return (capacidade, copias)


def custo_amortizado(n, crescer):
    capacidade, copias = simular(n, crescer)
    return (n + copias) / n
```
```python name="esquece as n escritas no custo amortizado"
def simular(n, crescer):
    capacidade = 0
    tamanho = 0
    copias = 0
    for _ in range(n):
        if tamanho == capacidade:
            capacidade = crescer(capacidade)
            copias += tamanho
        tamanho += 1
    return (capacidade, copias)


def custo_amortizado(n, crescer):
    capacidade, copias = simular(n, crescer)
    return copias / n
```
```python name="cresce depois de estourar"
def simular(n, crescer):
    capacidade = 0
    tamanho = 0
    copias = 0
    for _ in range(n):
        tamanho += 1
        if tamanho > capacidade:
            capacidade = crescer(capacidade)
            copias += tamanho
    return (capacidade, copias)


def custo_amortizado(n, crescer):
    capacidade, copias = simular(n, crescer)
    return (n + copias) / n
```

## Passo 5 · Leitura · Espaço auxiliar, fatias e a pilha de recursão

Memória também se analisa com $O$ e $\Theta$. A entrada já ocupa seu espaço; o que importa é o **espaço auxiliar**: a memória extra que o algoritmo reserva enquanto roda. Um algoritmo é **no lugar** (*in-place*) quando seu espaço auxiliar é $O(1)$: um número fixo de variáveis, qualquer que seja $n$.

Três fontes de espaço auxiliar passam despercebidas:

1. **Fatias copiam.** `lista[a:b]` cria uma lista nova com $b - a$ elementos. Até `lista[:] = lista[::-1]`, que deixa a própria lista invertida, monta antes uma cópia inteira: $\Theta(n)$ de espaço auxiliar. Muda o objeto certo, mas não é *in-place* no sentido de memória.
2. **Estruturas de apoio.** O `set` de vistos da lição anterior guarda até $n$ elementos: $\Theta(n)$ de memória para ganhar tempo.
3. **A pilha de chamadas.** Cada chamada recursiva ainda não terminada mantém um **quadro** na memória, com suas variáveis locais. Uma recursão com profundidade $d$ usa $\Theta(d)$ de espaço, mesmo sem criar nenhuma lista.

No visualizador, veja os quadros de `soma` se empilharem: com 3 elementos, há 4 chamadas abertas ao mesmo tempo antes da primeira devolver.

```python visualizar
def soma(lista, i=0):
    if i == len(lista):
        return 0
    return lista[i] + soma(lista, i + 1)


print(soma([3, 1, 4]))
```

A profundidade é $n + 1$: espaço $\Theta(n)$. O Python limita a pilha a 1000 quadros por padrão (`sys.getrecursionlimit()`), e uma lista com $5\,000$ elementos termina em

```text
RecursionError: maximum recursion depth exceeded
```

A mesma soma com um `for` e um acumulador usa $O(1)$ de espaço.

A profundidade depende de **como** o problema encolhe, não do número total de chamadas. Na lição anterior, dividir em metades fazia $2n - 1$ chamadas, mas em cada momento só fica aberto **um caminho** da raiz até uma folha: a profundidade é $\lceil \log_2 n \rceil + 1$, e o espaço da pilha, $\Theta(\log n)$. Tempo conta todas as chamadas; memória conta só as que estão abertas ao mesmo tempo.

## Passo 6 · Exercício · Inverter no lugar com dois índices
modo: ordenar

Monte `inverter_no_lugar(lista)`, que inverte a própria lista recebida usando dois índices que caminham das pontas para o centro, com espaço auxiliar $O(1)$. Como `list.reverse()`, ela não devolve nada. Duas linhas estão sobrando.

A correção passa uma lista que conta quantos elementos as fatias copiam: o total precisa ser zero.

### Instruções
1. Comece com `i` na primeira posição e `j` na última.
2. Enquanto `i < j`, troque `lista[i]` com `lista[j]`.
3. Depois de cada troca, aproxime os dois índices do centro.

### Solução
```python
def inverter_no_lugar(lista):
    i = 0
    j = len(lista) - 1
    while i < j:
        lista[i], lista[j] = lista[j], lista[i]
        i += 1
        j -= 1
```

### Distratores
```python
lista[:] = lista[::-1]
j = len(lista)
```

### Dicas
1. O último índice válido é `len(lista) - 1`.
2. Quando `i` e `j` se encontram ou se cruzam, todas as trocas já foram feitas.
3. `lista[::-1]` copia a lista inteira.

### Verificação
```json
[
  { "id": "sem-reverse", "checkpoint": 2, "kind": "source", "rule": { "type": "not_calls", "name": "reverse" },
    "name": "Não usa list.reverse()" },
  { "id": "sem-reversed", "checkpoint": 2, "kind": "source", "rule": { "type": "not_calls", "name": "reversed" },
    "name": "Não usa reversed()" },
  { "id": "impar", "checkpoint": 2, "kind": "expr", "setup": "v = [1, 2, 3, 4, 5]\ninverter_no_lugar(v)",
    "expr": "v", "expected": [5, 4, 3, 2, 1], "name": "Inverte [1, 2, 3, 4, 5] na própria lista" },
  { "id": "par", "checkpoint": 3, "kind": "expr", "setup": "v = [10, 20, 30, 40]\ninverter_no_lugar(v)",
    "expr": "v", "expected": [40, 30, 20, 10], "name": "Inverte [10, 20, 30, 40] na própria lista" },
  { "id": "bordas", "checkpoint": 1, "kind": "expr", "setup": "a = []\nb = [7]\nc = [1, 2]\ninverter_no_lugar(a)\ninverter_no_lugar(b)\ninverter_no_lugar(c)",
    "expr": "[a, b, c]", "expected": [[], [7], [2, 1]], "name": "Listas com 0, 1 e 2 elementos" },
  { "id": "devolve-none", "checkpoint": 3, "kind": "expr", "expr": "inverter_no_lugar([1, 2, 3])", "expected": null,
    "name": "Não devolve nada, como list.reverse()" },
  { "id": "sem-copia", "checkpoint": 2, "kind": "expr",
    "setup": "class Seq(list):\n    copiados = 0\n    def __getitem__(self, k):\n        if isinstance(k, slice):\n            r = list.__getitem__(self, k)\n            Seq.copiados += len(r)\n            return r\n        return list.__getitem__(self, k)\nv = Seq(range(1000))\ninverter_no_lugar(v)",
    "expr": "[v[0], v[999], list(v) == list(range(999, -1, -1)), Seq.copiados]", "expected": [999, 0, true, 0],
    "name": "Inverte 1000 elementos sem copiar nenhum por fatia",
    "hint": "lista[::-1] monta uma cópia inteira, mesmo quando o resultado volta para a própria lista." }
]
```

### Soluções erradas
```python name="lista = lista[::-1] só troca a variável local"
def inverter_no_lugar(lista):
    lista = lista[::-1]
```
```python name="lista[:] = lista[::-1] copia a lista inteira"
def inverter_no_lugar(lista):
    lista[:] = lista[::-1]
```
```python name="troca em todas as posições e desfaz a inversão"
def inverter_no_lugar(lista):
    for i in range(len(lista)):
        j = len(lista) - 1 - i
        lista[i], lista[j] = lista[j], lista[i]
```
```python name="j começa em len(lista)"
def inverter_no_lugar(lista):
    i = 0
    j = len(lista)
    while i < j:
        lista[i], lista[j] = lista[j], lista[i]
        i += 1
        j -= 1
```
```python name="devolve uma lista nova"
def inverter_no_lugar(lista):
    return lista[::-1]
```

## Passo 7 · Exercício · Recursão de pouca profundidade

Escreva duas funções.

- `maior_metades(lista, lo=0, hi=None)`: devolve o maior elemento de `lista[lo:hi]` (com `hi=None` valendo `len(lista)`; o trecho tem pelo menos um elemento) dividindo o trecho em duas metades, `[lo, meio)` e `[meio, hi)`, com `meio = (lo + hi) // 2`, e devolvendo o maior dos dois resultados. Trecho de um elemento é o caso base. **Sem fatiar**: passe os índices. A correção usa uma lista de $100\,000$ elementos, e uma recursão que anda de um em um passaria do limite de 1000 quadros.
- `profundidade_metades(n)`: a profundidade máxima da pilha (o maior número de chamadas abertas ao mesmo tempo, contando a primeira) quando `maior_metades` recebe um trecho de `n` elementos. Sem laços. Exemplos: 1 para `n = 1`, 2 para `n = 2`, 3 para `n = 3` e para `n = 4`.

### Instruções
1. `maior_metades`: trate `hi=None` e o caso base de um elemento.
2. `maior_metades`: chame a si mesma nas duas metades, passando índices, sem criar fatias.
3. `profundidade_metades(n)`: siga sempre a metade maior até chegar a um elemento.

### Código inicial
```python
def maior_metades(lista, lo=0, hi=None):
    pass


def profundidade_metades(n):
    pass
```

### Solução
```python
def maior_metades(lista, lo=0, hi=None):
    if hi is None:
        hi = len(lista)
    if hi - lo == 1:
        return lista[lo]
    meio = (lo + hi) // 2
    esquerda = maior_metades(lista, lo, meio)
    direita = maior_metades(lista, meio, hi)
    return esquerda if esquerda >= direita else direita


def profundidade_metades(n):
    return (n - 1).bit_length() + 1
```

### Dicas
1. Com `hi` exclusivo, o trecho `[lo, hi)` tem `hi - lo` elementos.
2. A metade maior de `n` tem `n - n // 2` elementos; quantas vezes dá para dividir assim até sobrar 1?
3. $\lceil \log_2 n \rceil$ é `(n - 1).bit_length()` para $n \ge 1$.

### Verificação
```json
[
  { "id": "recursiva", "checkpoint": 2, "kind": "source", "rule": { "type": "uses", "construct": "recursion" },
    "name": "maior_metades é recursiva" },
  { "id": "sem-max", "checkpoint": 2, "kind": "source", "rule": { "type": "not_calls", "name": "max" },
    "name": "Não usa max() na lista" },
  { "id": "valores", "checkpoint": 1, "kind": "expr",
    "expr": "[maior_metades([3, 9, 2]), maior_metades([-5, -2, -8, -3]), maior_metades([7]), maior_metades([1, 2, 3, 4, 5, 6, 7, 8])]",
    "expected": [9, -2, 7, 8], "name": "Maior de listas com 3, 4 (negativos), 1 e 8 elementos" },
  { "id": "trecho", "checkpoint": 1, "kind": "expr", "expr": "maior_metades([90, 1, 5, 3, 80], 1, 4)", "expected": 5,
    "name": "Respeita lo e hi: maior de [1, 5, 3] é 5", "hint": "hi é exclusivo." },
  { "id": "grande-sem-copia", "checkpoint": 2, "kind": "expr",
    "setup": "class Seq(list):\n    copiados = 0\n    def __getitem__(self, k):\n        if isinstance(k, slice):\n            r = Seq(list.__getitem__(self, k))\n            Seq.copiados += len(r)\n            return r\n        return list.__getitem__(self, k)\nv = Seq((i * 7919) % 100003 for i in range(100000))\nm = maior_metades(v)",
    "expr": "[m, Seq.copiados]", "expected": [100002, 0],
    "name": "100 000 elementos: sem estourar a pilha e sem copiar por fatia",
    "hint": "Uma recursão que avança de um em um tem profundidade n." },
  { "id": "profundidade-confere", "checkpoint": 3, "kind": "expr",
    "setup": "def real(n):\n    if n == 1:\n        return 1\n    return 1 + real(n - n // 2)",
    "expr": "all(profundidade_metades(n) == real(n) for n in range(1, 2000))", "expected": true,
    "name": "profundidade_metades confere com a árvore de chamadas, de n = 1 a 1999",
    "hint": "Para n = 5, as metades maiores são 3, 2 e 1." },
  { "id": "profundidade-valores", "checkpoint": 3, "kind": "expr",
    "expr": "[profundidade_metades(1), profundidade_metades(4), profundidade_metades(5), profundidade_metades(10 ** 5), profundidade_metades(2 ** 40)]",
    "expected": [1, 3, 4, 18, 41], "name": "Profundidade para 1, 4, 5, 10**5 e 2**40" },
  { "id": "profundidade-sem-laco", "checkpoint": 3, "kind": "source", "rule": { "type": "not_uses", "construct": "while", "function": "profundidade_metades" },
    "name": "profundidade_metades não usa while" }
]
```

### Soluções erradas
```python name="fatia as metades"
def maior_metades(lista, lo=0, hi=None):
    if len(lista) == 1:
        return lista[0]
    meio = len(lista) // 2
    esquerda = maior_metades(lista[:meio])
    direita = maior_metades(lista[meio:])
    return esquerda if esquerda >= direita else direita


def profundidade_metades(n):
    return (n - 1).bit_length() + 1
```
```python name="anda de um em um"
def maior_metades(lista, lo=0, hi=None):
    if hi is None:
        hi = len(lista)
    if hi - lo == 1:
        return lista[lo]
    resto = maior_metades(lista, lo + 1, hi)
    return lista[lo] if lista[lo] >= resto else resto


def profundidade_metades(n):
    return (n - 1).bit_length() + 1
```
```python name="pula o elemento do meio"
def maior_metades(lista, lo=0, hi=None):
    if hi is None:
        hi = len(lista)
    if hi - lo <= 1:
        return lista[lo]
    meio = (lo + hi) // 2
    esquerda = maior_metades(lista, lo, meio)
    if meio + 1 >= hi:
        return esquerda
    direita = maior_metades(lista, meio + 1, hi)
    return esquerda if esquerda >= direita else direita


def profundidade_metades(n):
    return (n - 1).bit_length() + 1
```
```python name="profundidade com bit_length de n"
def maior_metades(lista, lo=0, hi=None):
    if hi is None:
        hi = len(lista)
    if hi - lo == 1:
        return lista[lo]
    meio = (lo + hi) // 2
    esquerda = maior_metades(lista, lo, meio)
    direita = maior_metades(lista, meio, hi)
    return esquerda if esquerda >= direita else direita


def profundidade_metades(n):
    return n.bit_length()
```
```python name="confunde profundidade com total de chamadas"
def maior_metades(lista, lo=0, hi=None):
    if hi is None:
        hi = len(lista)
    if hi - lo == 1:
        return lista[lo]
    meio = (lo + hi) // 2
    esquerda = maior_metades(lista, lo, meio)
    direita = maior_metades(lista, meio, hi)
    return esquerda if esquerda >= direita else direita


def profundidade_metades(n):
    return 2 * n - 1
```

## Passo 8 · Quiz · Casos, amortização e memória

### Pergunta
Um serviço da universidade busca matrículas numa estrutura cujo caso médio é $\Theta(1)$ e o pior caso é $\Theta(n)$. As matrículas consultadas vêm de formulários públicos, que qualquer pessoa pode preencher. Que custo deve guiar a análise?
- [ ] O caso médio, porque a maioria das consultas é rápida
- [x] O pior caso, porque quem escolhe a entrada pode escolher justamente as que custam $\Theta(n)$
- [ ] O melhor caso, porque o serviço costuma estar ocioso
- [ ] Nenhum: com $\Theta(1)$ no caso médio, o pior caso nunca acontece na prática
> O caso médio vale sob uma hipótese sobre as entradas. Quando a entrada pode ser escolhida para atacar, a hipótese cai: alguém pode mandar só entradas do pior caso, repetidas vezes. Só o pior caso é garantia.

### Pergunta
Uma linguagem fictícia aumenta a capacidade das listas em $1\,000$ posições a cada estouro. Qual é o custo de $n$ appends seguidos, para $n$ grande?
- [ ] $\Theta(n)$ no total, porque 1000 é uma folga grande
- [x] $\Theta(n^2)$ no total: as cópias somam $1000 + 2000 + \dots \approx \frac{n^2}{2000}$, ou $\Theta(n)$ amortizado por append
- [ ] $\Theta(n \log n)$ no total, porque os estouros ficam mais raros
- [ ] $\Theta(1)$ por append no pior caso
> Com crescimento por quantidade fixa, há $n/1000$ estouros e o $k$-ésimo copia $1000k$ elementos. A soma é quadrática; o 1000 só melhora a constante. Crescer por um **fator** é o que torna o custo amortizado constante.

### Pergunta
Qual destas funções usa espaço auxiliar $O(1)$ para processar uma lista `v` de tamanho $n$?
- [ ] Uma soma recursiva `soma(v, i + 1)`, porque ela não cria listas
- [ ] Uma função que faz `v[:] = v[::-1]`, porque o resultado fica na própria `v`
- [x] Uma função que encontra o menor elemento com um `for` e guarda só o índice do menor até agora
- [ ] Uma função que percorre `sorted(v)` com um `for`
> A recursão mantém $n + 1$ quadros abertos na pilha. `v[::-1]` monta uma cópia inteira antes de escrevê-la em `v`. `sorted(v)` cria uma lista nova. Só o `for` com um índice usa memória extra fixa.
