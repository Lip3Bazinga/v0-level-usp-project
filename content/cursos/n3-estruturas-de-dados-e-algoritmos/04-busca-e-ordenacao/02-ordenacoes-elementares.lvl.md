---
slug: n3-m4-02-ordenacoes-elementares
titulo: 'Ordenações elementares: bolha, seleção e inserção'
descricao: Três algoritmos O(n²) implementados e comparados, com invariantes, contagem de trocas e os casos em que a inserção é a melhor escolha.
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
  - Implementar bubble sort, selection sort e insertion sort in-place
  - Enunciar o invariante de cada um e contar comparações/trocas
  - Explicar por que insertion sort é O(n) em dados quase ordenados e é usado dentro do Timsort
---

## Passo 1 · Leitura · Três ideias, três invariantes

Os três algoritmos desta lição ordenam a lista **no lugar** (*in-place*): mexem nos elementos da própria lista, com memória extra $O(1)$. Todos custam $\Theta(n^2)$ no pior caso, mas cada um mantém uma frase diferente verdadeira ao fim de cada volta do laço externo. É essa frase, o **invariante**, que prova que o algoritmo ordena: se ela vale depois de cada volta, vale também depois da última, e na última ela diz "a lista está ordenada".

| Algoritmo | Invariante depois de $k$ voltas | Por que ordena |
| :--- | :--- | :--- |
| Seleção | `lista[:k]` contém os $k$ **menores** elementos da lista toda, já em ordem | com $k = n - 1$, sobra um só elemento, o maior, no lugar certo |
| Inserção | `lista[:k+1]` contém os elementos **originais** dessas posições, em ordem entre si | com $k = n - 1$, o "prefixo" é a lista inteira |
| Bolha | `lista[n-k:]` contém os $k$ **maiores**, já em ordem | os maiores vão "subindo" para o fim, um por volta |

Repare na diferença entre seleção e inserção. Na seleção, o prefixo já é **definitivo**: ninguém de fora vai entrar ali. Na inserção, o prefixo está ordenado, mas um elemento que ainda não foi visto (o `1` no fim de `[8, 5, 2, 9, 1]`) vai empurrar todos para a direita quando chegar a vez dele.

A inserção funciona como arrumar cartas na mão. Guarde a carta nova em `chave`, desloque uma posição para a direita cada carta **maior** que ela e solte a chave no buraco que sobrou:

```python
def insertion_sort(lista):
    for i in range(1, len(lista)):
        chave = lista[i]
        j = i - 1
        while j >= 0 and lista[j] > chave:   # > estrito: iguais não passam à frente
            lista[j + 1] = lista[j]
            j -= 1
        lista[j + 1] = chave                 # j parou uma posição antes do buraco
```

O `>` estrito tem um efeito importante. Um elemento igual à chave não é deslocado, então a chave para **depois** dele. Elementos iguais mantêm a ordem em que chegaram: o algoritmo é **estável**. Com `>=`, a chave passaria à frente dos iguais e a estabilidade se perderia.

No visualizador, observe o buraco andando para a esquerda enquanto `j` diminui, e a `chave` sendo solta em `j + 1`.

```python visualizar
def insertion_sort(lista):
    for i in range(1, len(lista)):
        chave = lista[i]
        j = i - 1
        while j >= 0 and lista[j] > chave:
            lista[j + 1] = lista[j]
            j -= 1
        lista[j + 1] = chave


dados = [9, 3, 7, 1, 5]
insertion_sort(dados)
print(dados)
```

## Passo 2 · Previsão · Duas voltas de cada

O programa roda só as **duas primeiras voltas** do laço externo da seleção e da inserção sobre a mesma lista. Leia sem executar e digite exatamente o que ele imprime.

### Código
```python
v_sel = [8, 5, 2, 9, 1]
for i in range(2):
    idx_min = i
    for j in range(i + 1, len(v_sel)):
        if v_sel[j] < v_sel[idx_min]:
            idx_min = j
    v_sel[i], v_sel[idx_min] = v_sel[idx_min], v_sel[i]
print("selection (2 passos):", v_sel)

v_ins = [8, 5, 2, 9, 1]
for i in range(1, 3):
    chave = v_ins[i]
    j = i - 1
    while j >= 0 and v_ins[j] > chave:
        v_ins[j + 1] = v_ins[j]
        j -= 1
    v_ins[j + 1] = chave
print("insertion (2 passos):", v_ins)
```

### Dicas
1. A seleção procura o menor de **todo** o resto da lista e troca com a posição `i`.
2. A inserção só olha o prefixo: nas duas primeiras voltas, ela nem chega a ver o `9` e o `1`.
3. Compare com os invariantes da tabela: qual dos dois prefixos já é definitivo?

### Saída esperada
```text
selection (2 passos): [1, 2, 5, 9, 8]
insertion (2 passos): [2, 5, 8, 9, 1]
```

## Passo 3 · Exercício · Seleção e inserção no lugar
modo: lacunas

Complete as lacunas (`___`) de `selection_sort(lista)` e `insertion_sort(lista)`. As duas ordenam a própria lista recebida e não devolvem nada, como `list.sort()`. A verificação usa registros que se comparam só pela nota para conferir que a inserção é estável.

### Instruções
1. Na seleção, procure o menor elemento de `lista[i+1:]` em diante, guardando o **índice** dele.
2. Na inserção, desloque para a direita só os elementos **estritamente maiores** que a chave.
3. Na inserção, solte a chave no buraco deixado pelo último deslocamento.

### Código inicial
```python
def selection_sort(lista):
    n = len(lista)
    for i in range(n - 1):
        idx_min = i
        for j in range(___, n):
            if lista[j] < lista[idx_min]:
                idx_min = ___
        lista[i], lista[idx_min] = lista[idx_min], lista[i]


def insertion_sort(lista):
    for i in range(1, len(lista)):
        chave = lista[i]
        j = i - 1
        while j >= 0 and lista[j] ___ chave:
            lista[j + 1] = lista[j]
            j -= 1
        lista[___] = chave
```

### Solução
```python
def selection_sort(lista):
    n = len(lista)
    for i in range(n - 1):
        idx_min = i
        for j in range(i + 1, n):
            if lista[j] < lista[idx_min]:
                idx_min = j
        lista[i], lista[idx_min] = lista[idx_min], lista[i]


def insertion_sort(lista):
    for i in range(1, len(lista)):
        chave = lista[i]
        j = i - 1
        while j >= 0 and lista[j] > chave:
            lista[j + 1] = lista[j]
            j -= 1
        lista[j + 1] = chave
```

### Dicas
1. `idx_min` guarda uma **posição**, não um valor.
2. Elementos iguais à chave ficam onde estão: é isso que torna a inserção estável.
3. Quando o `while` para, `j` aponta para o primeiro elemento que **não** foi deslocado. O buraco está logo depois dele.

### Verificação
```json
[
  { "id": "sem-sorted", "checkpoint": 1, "kind": "source", "rule": { "type": "not_calls", "name": "sorted" },
    "name": "Não usa sorted()" },
  { "id": "sem-sort", "checkpoint": 1, "kind": "source", "rule": { "type": "not_calls", "name": "sort" },
    "name": "Não usa .sort()" },
  { "id": "sel-misturada", "checkpoint": 1, "kind": "expr", "setup": "v = [29, 10, 14, 37, 13]\nselection_sort(v)",
    "expr": "v", "expected": [10, 13, 14, 29, 37], "name": "selection_sort ordena [29, 10, 14, 37, 13] no lugar" },
  { "id": "sel-menor-no-fim", "checkpoint": 1, "kind": "expr", "setup": "v = [4, 3, 2, 1, 0]\nselection_sort(v)",
    "expr": "v", "expected": [0, 1, 2, 3, 4], "name": "selection_sort ordena [4, 3, 2, 1, 0]",
    "hint": "O menor pode estar na última posição: a varredura precisa ir até o fim." },
  { "id": "sel-bordas", "checkpoint": 1, "kind": "expr", "setup": "a = []\nb = [8]\nselection_sort(a)\nselection_sort(b)",
    "expr": "[a, b]", "expected": [[], [8]], "name": "selection_sort aceita lista vazia e de um elemento" },
  { "id": "ins-repetidos", "checkpoint": 2, "kind": "expr", "setup": "v = [3, -1, 3, 0, -5]\ninsertion_sort(v)",
    "expr": "v", "expected": [-5, -1, 0, 3, 3], "name": "insertion_sort ordena [3, -1, 3, 0, -5] no lugar" },
  { "id": "ins-vai-ao-inicio", "checkpoint": 3, "kind": "expr", "setup": "v = [5, 1]\ninsertion_sort(v)",
    "expr": "v", "expected": [1, 5], "name": "insertion_sort leva o menor até a posição 0",
    "hint": "A comparação com a posição 0 também precisa acontecer." },
  { "id": "ins-estavel", "checkpoint": 2, "kind": "expr",
    "setup": "class Aluno:\n    def __init__(self, nota, nome):\n        self.nota = nota\n        self.nome = nome\n    def __lt__(self, o):\n        return self.nota < o.nota\n    def __gt__(self, o):\n        return self.nota > o.nota\n    def __le__(self, o):\n        return self.nota <= o.nota\n    def __ge__(self, o):\n        return self.nota >= o.nota\nv = [Aluno(7, 'Ana'), Aluno(5, 'Bia'), Aluno(7, 'Caio'), Aluno(5, 'Davi'), Aluno(9, 'Eva')]\ninsertion_sort(v)",
    "expr": "[a.nome for a in v]", "expected": ["Bia", "Davi", "Ana", "Caio", "Eva"],
    "name": "insertion_sort é estável: notas iguais mantêm a ordem de chegada",
    "hint": "Com >=, a chave passa à frente dos iguais." }
]
```

### Soluções erradas
```python name=">= na inserção perde a estabilidade"
def selection_sort(lista):
    n = len(lista)
    for i in range(n - 1):
        idx_min = i
        for j in range(i + 1, n):
            if lista[j] < lista[idx_min]:
                idx_min = j
        lista[i], lista[idx_min] = lista[idx_min], lista[i]


def insertion_sort(lista):
    for i in range(1, len(lista)):
        chave = lista[i]
        j = i - 1
        while j >= 0 and lista[j] >= chave:
            lista[j + 1] = lista[j]
            j -= 1
        lista[j + 1] = chave
```
```python name="solta a chave em lista[j]"
def selection_sort(lista):
    n = len(lista)
    for i in range(n - 1):
        idx_min = i
        for j in range(i + 1, n):
            if lista[j] < lista[idx_min]:
                idx_min = j
        lista[i], lista[idx_min] = lista[idx_min], lista[i]


def insertion_sort(lista):
    for i in range(1, len(lista)):
        chave = lista[i]
        j = i - 1
        while j >= 0 and lista[j] > chave:
            lista[j + 1] = lista[j]
            j -= 1
        lista[j] = chave
```
```python name="while j > 0 nunca compara a posição 0"
def selection_sort(lista):
    n = len(lista)
    for i in range(n - 1):
        idx_min = i
        for j in range(i + 1, n):
            if lista[j] < lista[idx_min]:
                idx_min = j
        lista[i], lista[idx_min] = lista[idx_min], lista[i]


def insertion_sort(lista):
    for i in range(1, len(lista)):
        chave = lista[i]
        j = i - 1
        while j > 0 and lista[j] > chave:
            lista[j + 1] = lista[j]
            j -= 1
        lista[j + 1] = chave
```
```python name="seleção para antes do último elemento"
def selection_sort(lista):
    n = len(lista)
    for i in range(n - 1):
        idx_min = i
        for j in range(i + 1, n - 1):
            if lista[j] < lista[idx_min]:
                idx_min = j
        lista[i], lista[idx_min] = lista[idx_min], lista[i]


def insertion_sort(lista):
    for i in range(1, len(lista)):
        chave = lista[i]
        j = i - 1
        while j >= 0 and lista[j] > chave:
            lista[j + 1] = lista[j]
            j -= 1
        lista[j + 1] = chave
```

## Passo 4 · Leitura · Contando o trabalho: melhor caso, pior caso e inversões

"Todos são $\Theta(n^2)$" esconde diferenças que importam na prática. Conte as operações de cada um.

A **seleção** é cega para a ordem que já existe. Para achar o menor de `lista[i:]`, ela olha todos os elementos restantes, sempre:

$$
(n-1) + (n-2) + \dots + 1 = \frac{n(n-1)}{2} \text{ comparações, em qualquer entrada.}
$$

Em compensação, ela faz no máximo $n - 1$ **trocas**, uma por volta. Quando escrever é muito mais caro que ler, isso pesa.

A **inserção** depende da entrada. Uma **inversão** é um par de posições $i < j$ com `lista[i] > lista[j]`. Cada deslocamento do `while` desfaz exatamente uma inversão, e cada volta faz no máximo uma comparação a mais, a que falha e encerra o `while`. Então, com $I$ inversões, a inserção custa $\Theta(n + I)$:

- lista já ordenada: $I = 0$, uma comparação por volta, $n - 1$ no total. Linear.
- lista invertida: $I = \frac{n(n-1)}{2}$, o pior caso.
- lista "quase ordenada", com poucos elementos fora do lugar: quase linear.

```python
def contar_comparacoes(lista):
    v, comparacoes = list(lista), 0       # copia: contar não pode bagunçar a entrada
    for i in range(1, len(v)):
        chave, j = v[i], i - 1
        while j >= 0:
            comparacoes += 1              # conta também a comparação que falha
            if v[j] <= chave:
                break
            v[j + 1] = v[j]
            j -= 1
        v[j + 1] = chave
    return comparacoes
```

A **bolha** compara vizinhos e troca os que estão invertidos. Sem cuidado, ela faz sempre $n - 1$ passagens. Com uma marca `trocou`, ela para na primeira passagem sem nenhuma troca: em lista ordenada, uma passagem só. Mas ela é lenta com "tartarugas": em `[2, 3, 4, 5, 1]`, o `1` anda **uma** posição para a esquerda por passagem, e são necessárias 4 passagens, enquanto a inserção resolve o mesmo caso com 7 comparações.

É por isso que o `sorted` do Python, o Timsort, usa a inserção (com busca binária para achar o buraco) para ordenar trechos curtos, de até 64 elementos, antes de intercalá-los. Em trechos curtos e quase ordenados, a constante pequena da inserção vence algoritmos assintoticamente melhores.

## Passo 5 · Exercício · Medindo os três

Escreva três funções que medem o trabalho de cada algoritmo. Nenhuma pode usar `sorted()` ou `.sort()`.

- `bubble_sort(lista)`: ordena a lista **no lugar** com a bolha com parada antecipada e devolve o **número de passagens** feitas. A passagem número `i` (contando de 0) compara os pares vizinhos até a posição `n - 2 - i`; uma passagem sem nenhuma troca é contada e encerra o algoritmo. Listas com 0 ou 1 elemento fazem 0 passagens. Exemplos: `[1, 2, 3]` faz 1 passagem; `[3, 2, 1]` faz 2.
- `contar_comparacoes_insertion(lista)`: devolve quantas comparações `v[j] > chave` a inserção faz, incluindo a que falha e encerra o `while`. A lista recebida **não pode mudar**. Exemplo: `[10, 30, 20, 40]` dá `4`.
- `contar_trocas_selection(lista)`: devolve quantas trocas a seleção faz, contando só as voltas em que `idx_min != i`. Em empate, fica o **primeiro** menor. A lista recebida não pode mudar.

### Instruções
1. Escreva `bubble_sort(lista)` com a marca `trocou` e o contador de passagens.
2. Escreva `contar_comparacoes_insertion(lista)` trabalhando numa cópia.
3. Escreva `contar_trocas_selection(lista)` trabalhando numa cópia.

### Código inicial
```python
def bubble_sort(lista):
    pass


def contar_comparacoes_insertion(lista):
    pass


def contar_trocas_selection(lista):
    pass
```

### Solução
```python
def bubble_sort(lista):
    n = len(lista)
    passagens = 0
    for i in range(n - 1):
        trocou = False
        passagens += 1
        for j in range(n - 1 - i):
            if lista[j] > lista[j + 1]:
                lista[j], lista[j + 1] = lista[j + 1], lista[j]
                trocou = True
        if not trocou:
            break
    return passagens


def contar_comparacoes_insertion(lista):
    v = list(lista)
    comparacoes = 0
    for i in range(1, len(v)):
        chave = v[i]
        j = i - 1
        while j >= 0:
            comparacoes += 1
            if v[j] > chave:
                v[j + 1] = v[j]
                j -= 1
            else:
                break
        v[j + 1] = chave
    return comparacoes


def contar_trocas_selection(lista):
    v = list(lista)
    n = len(v)
    trocas = 0
    for i in range(n - 1):
        idx_min = i
        for j in range(i + 1, n):
            if v[j] < v[idx_min]:
                idx_min = j
        if idx_min != i:
            v[i], v[idx_min] = v[idx_min], v[i]
            trocas += 1
    return trocas
```

### Dicas
1. A marca `trocou` volta a ser `False` no começo de **cada** passagem.
2. Escrever `while j >= 0 and v[j] > chave:` e contar dentro do laço deixa de fora a comparação que falha. Separe o teste em um `if` dentro do `while`.
3. Para não alterar a entrada, comece com `v = list(lista)`.

### Verificação
```json
[
  { "id": "sem-sorted", "checkpoint": 1, "kind": "source", "rule": { "type": "not_calls", "name": "sorted" },
    "name": "Não usa sorted()" },
  { "id": "bolha-ordena", "checkpoint": 1, "kind": "expr", "setup": "v = [3, 1, 2, 2]\np = bubble_sort(v)",
    "expr": "[v, p]", "expected": [[1, 2, 2, 3], 2], "name": "bubble_sort([3, 1, 2, 2]) ordena no lugar em 2 passagens" },
  { "id": "bolha-ordenada", "checkpoint": 1, "kind": "call", "function": "bubble_sort", "args": [[1, 2, 3, 4, 5]], "expected": 1,
    "name": "Lista já ordenada: 1 passagem", "hint": "Uma passagem sem trocas encerra o algoritmo." },
  { "id": "bolha-uma-troca", "checkpoint": 1, "kind": "call", "function": "bubble_sort", "args": [[2, 1, 3, 4, 5]], "expected": 2,
    "name": "[2, 1, 3, 4, 5]: 2 passagens", "hint": "A marca de troca precisa recomeçar a cada passagem." },
  { "id": "bolha-tartaruga", "checkpoint": 1, "kind": "call", "function": "bubble_sort", "args": [[2, 3, 4, 5, 1]], "expected": 4,
    "name": "[2, 3, 4, 5, 1]: 4 passagens" },
  { "id": "bolha-curtas", "checkpoint": 1, "kind": "expr", "expr": "[bubble_sort([]), bubble_sort([9])]", "expected": [0, 0],
    "name": "Listas com 0 e 1 elemento: 0 passagens" },
  { "id": "ins-ordenada", "checkpoint": 2, "kind": "call", "function": "contar_comparacoes_insertion", "args": [[10, 20, 30, 40, 50]], "expected": 4,
    "name": "Lista ordenada de 5: 4 comparações", "hint": "Em cada volta, a comparação que falha também conta." },
  { "id": "ins-invertida", "checkpoint": 2, "kind": "call", "function": "contar_comparacoes_insertion", "args": [[50, 40, 30, 20, 10]], "expected": 10,
    "name": "Lista invertida de 5: 10 comparações" },
  { "id": "ins-tartaruga", "checkpoint": 2, "kind": "call", "function": "contar_comparacoes_insertion", "args": [[2, 3, 4, 5, 1]], "expected": 7,
    "name": "[2, 3, 4, 5, 1]: 7 comparações", "hint": "Quando j passa de 0, o laço acaba sem uma comparação a mais." },
  { "id": "ins-iguais", "checkpoint": 2, "kind": "call", "function": "contar_comparacoes_insertion", "args": [[3, 3, 3]], "expected": 2,
    "name": "[3, 3, 3]: 2 comparações" },
  { "id": "ins-nao-altera", "checkpoint": 2, "kind": "expr", "setup": "v = [4, 1, 3]\nc = contar_comparacoes_insertion(v)",
    "expr": "[c, v]", "expected": [3, [4, 1, 3]], "name": "contar_comparacoes_insertion não altera a lista recebida",
    "hint": "Trabalhe numa cópia." },
  { "id": "sel-ordenada", "checkpoint": 3, "kind": "call", "function": "contar_trocas_selection", "args": [[1, 2, 3, 4]], "expected": 0,
    "name": "Lista ordenada: 0 trocas" },
  { "id": "sel-uma", "checkpoint": 3, "kind": "call", "function": "contar_trocas_selection", "args": [[4, 2, 3, 1]], "expected": 1,
    "name": "[4, 2, 3, 1]: 1 troca" },
  { "id": "sel-tres", "checkpoint": 3, "kind": "call", "function": "contar_trocas_selection", "args": [[2, 3, 4, 1]], "expected": 3,
    "name": "[2, 3, 4, 1]: 3 trocas" },
  { "id": "sel-empate", "checkpoint": 3, "kind": "call", "function": "contar_trocas_selection", "args": [[2, 2, 1]], "expected": 1,
    "name": "[2, 2, 1]: 1 troca", "hint": "Em empate, o índice do menor fica no primeiro encontrado: use comparação estrita." },
  { "id": "sel-nao-altera", "checkpoint": 3, "kind": "expr", "setup": "v = [3, 1, 2]\nt = contar_trocas_selection(v)",
    "expr": "[t, v]", "expected": [2, [3, 1, 2]], "name": "contar_trocas_selection não altera a lista recebida" }
]
```

### Soluções erradas
```python name="marca trocou criada uma vez só, fora das passagens"
def bubble_sort(lista):
    n = len(lista)
    passagens = 0
    trocou = False
    for i in range(n - 1):
        passagens += 1
        for j in range(n - 1 - i):
            if lista[j] > lista[j + 1]:
                lista[j], lista[j + 1] = lista[j + 1], lista[j]
                trocou = True
        if not trocou:
            break
    return passagens


def contar_comparacoes_insertion(lista):
    v = list(lista)
    comparacoes = 0
    for i in range(1, len(v)):
        chave = v[i]
        j = i - 1
        while j >= 0:
            comparacoes += 1
            if v[j] > chave:
                v[j + 1] = v[j]
                j -= 1
            else:
                break
        v[j + 1] = chave
    return comparacoes


def contar_trocas_selection(lista):
    v = list(lista)
    n = len(v)
    trocas = 0
    for i in range(n - 1):
        idx_min = i
        for j in range(i + 1, n):
            if v[j] < v[idx_min]:
                idx_min = j
        if idx_min != i:
            v[i], v[idx_min] = v[idx_min], v[i]
            trocas += 1
    return trocas
```
```python name="não conta a comparação que encerra o while"
def bubble_sort(lista):
    n = len(lista)
    passagens = 0
    for i in range(n - 1):
        trocou = False
        passagens += 1
        for j in range(n - 1 - i):
            if lista[j] > lista[j + 1]:
                lista[j], lista[j + 1] = lista[j + 1], lista[j]
                trocou = True
        if not trocou:
            break
    return passagens


def contar_comparacoes_insertion(lista):
    v = list(lista)
    comparacoes = 0
    for i in range(1, len(v)):
        chave = v[i]
        j = i - 1
        while j >= 0 and v[j] > chave:
            comparacoes += 1
            v[j + 1] = v[j]
            j -= 1
        v[j + 1] = chave
    return comparacoes


def contar_trocas_selection(lista):
    v = list(lista)
    n = len(v)
    trocas = 0
    for i in range(n - 1):
        idx_min = i
        for j in range(i + 1, n):
            if v[j] < v[idx_min]:
                idx_min = j
        if idx_min != i:
            v[i], v[idx_min] = v[idx_min], v[i]
            trocas += 1
    return trocas
```
```python name="ordena a lista recebida em vez de uma cópia"
def bubble_sort(lista):
    n = len(lista)
    passagens = 0
    for i in range(n - 1):
        trocou = False
        passagens += 1
        for j in range(n - 1 - i):
            if lista[j] > lista[j + 1]:
                lista[j], lista[j + 1] = lista[j + 1], lista[j]
                trocou = True
        if not trocou:
            break
    return passagens


def contar_comparacoes_insertion(lista):
    v = lista
    comparacoes = 0
    for i in range(1, len(v)):
        chave = v[i]
        j = i - 1
        while j >= 0:
            comparacoes += 1
            if v[j] > chave:
                v[j + 1] = v[j]
                j -= 1
            else:
                break
        v[j + 1] = chave
    return comparacoes


def contar_trocas_selection(lista):
    v = lista
    n = len(v)
    trocas = 0
    for i in range(n - 1):
        idx_min = i
        for j in range(i + 1, n):
            if v[j] < v[idx_min]:
                idx_min = j
        if idx_min != i:
            v[i], v[idx_min] = v[idx_min], v[i]
            trocas += 1
    return trocas
```
```python name="<= na seleção escolhe o último menor e troca à toa"
def bubble_sort(lista):
    n = len(lista)
    passagens = 0
    for i in range(n - 1):
        trocou = False
        passagens += 1
        for j in range(n - 1 - i):
            if lista[j] > lista[j + 1]:
                lista[j], lista[j + 1] = lista[j + 1], lista[j]
                trocou = True
        if not trocou:
            break
    return passagens


def contar_comparacoes_insertion(lista):
    v = list(lista)
    comparacoes = 0
    for i in range(1, len(v)):
        chave = v[i]
        j = i - 1
        while j >= 0:
            comparacoes += 1
            if v[j] > chave:
                v[j + 1] = v[j]
                j -= 1
            else:
                break
        v[j + 1] = chave
    return comparacoes


def contar_trocas_selection(lista):
    v = list(lista)
    n = len(v)
    trocas = 0
    for i in range(n - 1):
        idx_min = i
        for j in range(i + 1, n):
            if v[j] <= v[idx_min]:
                idx_min = j
        if idx_min != i:
            v[i], v[idx_min] = v[idx_min], v[i]
            trocas += 1
    return trocas
```

## Passo 6 · Exercício · Ranking estável da turma

A secretaria acadêmica exporta as notas na ordem de entrega das provas, como tuplas `(nome, nota)`. O ranking precisa sair por **nota decrescente**, e quem empata fica na **ordem de entrega**: quem entregou antes aparece antes. Isso é exatamente estabilidade.

Escreva `ranking(alunos)` usando inserção, sem `sorted()` nem `.sort()`. Devolva uma **lista nova**; a lista recebida não pode mudar. Exemplo:

```python
ranking([("Caio", 7), ("Ana", 9), ("Bia", 7)])
# [("Ana", 9), ("Caio", 7), ("Bia", 7)]
```

`Caio` vem antes de `Bia` porque entregou antes, mesmo que `"Bia" < "Caio"`.

### Instruções
1. Trabalhe numa cópia da lista recebida e devolva essa cópia ordenada.
2. Ordene por nota decrescente com inserção, comparando **só a nota** de cada tupla.
3. Mantenha a ordem de entrega entre notas iguais.

### Código inicial
```python
def ranking(alunos):
    pass
```

### Solução
```python
def ranking(alunos):
    v = list(alunos)
    for i in range(1, len(v)):
        chave = v[i]
        j = i - 1
        while j >= 0 and v[j][1] < chave[1]:
            v[j + 1] = v[j]
            j -= 1
        v[j + 1] = chave
    return v
```

### Dicas
1. Em ordem decrescente, a chave passa à frente de quem tem nota **menor** que a dela.
2. Comparar a tupla inteira desempata pelo nome, que não é o que a secretaria pediu.
3. Quem tem nota igual à da chave não é deslocado.

### Verificação
```json
[
  { "id": "sem-sorted", "checkpoint": 2, "kind": "source", "rule": { "type": "not_calls", "name": "sorted" },
    "name": "Não usa sorted()" },
  { "id": "sem-sort", "checkpoint": 2, "kind": "source", "rule": { "type": "not_calls", "name": "sort" },
    "name": "Não usa .sort()" },
  { "id": "turma", "checkpoint": 3, "kind": "call", "function": "ranking",
    "args": [[["Davi", 6], ["Eva", 8], ["Caio", 8], ["Ana", 10], ["Bia", 6], ["Fabi", 8]]],
    "expected": [["Ana", 10], ["Eva", 8], ["Caio", 8], ["Fabi", 8], ["Davi", 6], ["Bia", 6]],
    "name": "Turma de 6: nota decrescente, empates na ordem de entrega",
    "hint": "Entre as notas 8, a ordem de entrega é Eva, Caio, Fabi." },
  { "id": "todos-iguais", "checkpoint": 3, "kind": "call", "function": "ranking",
    "args": [[["Rui", 5], ["Lia", 5], ["Gil", 5]]], "expected": [["Rui", 5], ["Lia", 5], ["Gil", 5]],
    "name": "Notas todas iguais: a ordem de entrega fica intacta" },
  { "id": "decrescente", "checkpoint": 2, "kind": "call", "function": "ranking",
    "args": [[["Ana", 3], ["Bia", 9], ["Caio", 1], ["Davi", 7]]], "expected": [["Bia", 9], ["Davi", 7], ["Ana", 3], ["Caio", 1]],
    "name": "Notas distintas em ordem decrescente" },
  { "id": "vazia", "checkpoint": 1, "kind": "call", "function": "ranking", "args": [[]], "expected": [],
    "name": "ranking([]) é []" },
  { "id": "nao-altera", "checkpoint": 1, "kind": "expr",
    "setup": "entrada = [('Caio', 7), ('Ana', 9), ('Bia', 7)]\nr = ranking(entrada)",
    "expr": "[r, entrada]", "expected": [[["Ana", 9], ["Caio", 7], ["Bia", 7]], [["Caio", 7], ["Ana", 9], ["Bia", 7]]],
    "name": "Devolve lista nova e não altera a lista recebida", "hint": "Comece copiando a lista." }
]
```

### Soluções erradas
```python name="<= desloca os iguais e inverte a ordem de entrega"
def ranking(alunos):
    v = list(alunos)
    for i in range(1, len(v)):
        chave = v[i]
        j = i - 1
        while j >= 0 and v[j][1] <= chave[1]:
            v[j + 1] = v[j]
            j -= 1
        v[j + 1] = chave
    return v
```
```python name="compara a tupla inteira e desempata pelo nome"
def ranking(alunos):
    v = list(alunos)
    for i in range(1, len(v)):
        chave = v[i]
        j = i - 1
        while j >= 0 and (v[j][1], v[j][0]) < (chave[1], chave[0]):
            v[j + 1] = v[j]
            j -= 1
        v[j + 1] = chave
    return v
```
```python name="seleção com troca direta não é estável"
def ranking(alunos):
    v = list(alunos)
    n = len(v)
    for i in range(n - 1):
        idx_max = i
        for j in range(i + 1, n):
            if v[j][1] > v[idx_max][1]:
                idx_max = j
        v[i], v[idx_max] = v[idx_max], v[i]
    return v
```
```python name="ordena a própria lista recebida"
def ranking(alunos):
    v = alunos
    for i in range(1, len(v)):
        chave = v[i]
        j = i - 1
        while j >= 0 and v[j][1] < chave[1]:
            v[j + 1] = v[j]
            j -= 1
        v[j + 1] = chave
    return v
```

## Passo 7 · Quiz · Qual algoritmo, e por quê

### Pergunta
Um log com $100\,000$ eventos chega em ordem cronológica, exceto por 4 eventos que estão uma posição fora do lugar. Qual dos três termina mais rápido?
- [ ] Seleção, porque faz no máximo $n - 1$ trocas
- [x] Inserção, porque faz $\Theta(n + I)$ operações e aqui $I = 4$
- [ ] Bolha sem a marca `trocou`, porque não troca nada nos trechos já ordenados
- [ ] Tanto faz: os três são $\Theta(n^2)$
> A seleção faz $\frac{n(n-1)}{2} \approx 5 \cdot 10^9$ comparações em qualquer entrada, e a bolha sem marca faz $n - 1$ passagens completas. A inserção faz uma comparação por elemento e alguns deslocamentos: cerca de $10^5$ operações. "$\Theta(n^2)$ no pior caso" não diz nada sobre esta entrada.

### Pergunta
Depois de 2 voltas do laço externo da **inserção** sobre `[8, 5, 2, 9, 1]`, o que é garantido?
- [ ] As posições 0 e 1 têm os dois menores elementos da lista, em definitivo
- [x] As posições 0 a 2 têm os elementos que estavam lá no começo, agora em ordem
- [ ] As duas últimas posições têm os dois maiores elementos
- [ ] Nada: o invariante só vale ao fim do algoritmo
> O prefixo da inserção está ordenado, mas não é definitivo: o `1` ainda vai entrar na frente de todos. Os dois menores em definitivo é o invariante da seleção; os maiores no fim, o da bolha.

### Pergunta
Os registros de uma memória flash aguentam um número limitado de escritas. Ler e comparar é barato. Para ordenar $1\,000$ registros grandes gastando o mínimo de escritas, qual é a melhor escolha?
- [ ] Inserção, porque é estável
- [ ] Bolha com parada antecipada, porque para cedo
- [x] Seleção, porque faz no máximo $n - 1$ trocas
- [ ] Qualquer um: os três escrevem $\Theta(n^2)$ vezes no pior caso
> A seleção faz uma troca por volta, no máximo $999$ trocas. Inserção e bolha deslocam ou trocam uma vez por inversão: até $\frac{n(n-1)}{2} \approx 500\,000$ escritas numa lista invertida.
