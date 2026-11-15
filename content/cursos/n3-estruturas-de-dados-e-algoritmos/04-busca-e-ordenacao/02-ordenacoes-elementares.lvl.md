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

## Passo 1 · Leitura · Bubble Sort, Selection Sort e Insertion Sort

Antes de estudarmos algoritmos $O(n \log n)$, precisamos compreender os três algoritmos elementares de ordenação in-place. Embora todos tenham pior caso $\Theta(n^2)$, seus **invariantes de laço**, seu número de escritas na memória e seu comportamento em listas **quase ordenadas** são radicalmente diferentes:

| Algoritmo | Invariante após $k$ passagens externas | Comparações (melhor / pior) | Trocas / escritas (pior caso) | Estável? |
| :--- | :--- | :---: | :---: | :---: |
| **Bubble Sort** (com parada) | Os $k$ maiores elementos já flutuaram para o sufixo `lista[n-k : n]`. | $\Theta(n)$ / $\Theta(n^2)$ | $\Theta(n^2)$ | Sim |
| **Selection Sort** | Os $k$ menores elementos do vetor inteiro já estão na posição final `lista[0 : k]`. | $\Theta(n^2)$ / $\Theta(n^2)$ | **$\le n - 1$ trocas** ($\Theta(n)$) | Não (na troca direta) |
| **Insertion Sort** | O prefixo `lista[0 : k+1]` contém os elementos originais daquela faixa, mas **ordenados entre si**. | **$\Theta(n)$** / $\Theta(n^2)$ | $\Theta(n^2)$ | Sim |

#### Estabilidade: o que acontece com elementos empatados?

Dizemos que um algoritmo de ordenação é **estável** quando dois elementos com chaves iguais **preservam sua ordem relativa original** após a ordenação.
- No **Insertion Sort**, deslocamos à direita apenas elementos **estritamente maiores** que a chave atual (`while j >= 0 and lista[j] > chave:`), parando assim que encontramos um elemento igual. Por isso ele é **estável**.
- No **Selection Sort** clássico com troca direta (`lista[i], lista[idx_min] = lista[idx_min], lista[i]`), um elemento na posição `i` pode ser arremessado para depois de outro elemento igual a ele, quebrando a estabilidade (ex.: em `[(2, "a"), (2, "b"), (1, "c")]`, trocar o primeiro `(2, "a")` com `(1, "c")` deixa `[(1, "c"), (2, "b"), (2, "a")]`, invertendo `"a"` e `"b"`!).

#### Por que o Insertion Sort está dentro do `list.sort()` do Python?

Em uma lista que **já está ordenada** (ou quase ordenada, com poucas inversões), a condição `lista[j] > chave` do Insertion Sort falha logo na primeira comparação! O laço interno não desloca ninguém e o algoritmo inteiro roda em **$n - 1$ comparações ($\Theta(n)$)**, com constante minúscula. É por isso que o **Timsort** (algoritmo oficial do Python em `sorted()` e `.sort()`) usa o Insertion Sort para ordenar trechos curtos (*runs* de 32 a 64 elementos) antes de intercalá-los!

Veja o Insertion Sort passo a passo no visualizador:

```python visualizar
def insertion_sort(lista):
    for i in range(1, len(lista)):
        chave = lista[i]
        j = i - 1
        while j >= 0 and lista[j] > chave:
            lista[j + 1] = lista[j]
            j -= 1
        lista[j + 1] = chave
    return lista

dados = [9, 3, 7, 1, 5]
print(insertion_sort(dados))
```

## Passo 2 · Previsão · Rastreador de passagens do Selection Sort e do Insertion Sort

Leia o programa abaixo e preveja o estado da lista após as 2 primeiras iterações externas do Selection Sort e do Insertion Sort sobre a mesma entrada `[8, 5, 2, 9, 1]`.

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
1. No Selection Sort, o passo `i = 0` troca o menor de todos (`1`, no índice `4`) com `8` (`[1, 5, 2, 9, 8]`), e o passo `i = 1` troca o segundo menor (`2`, no índice `2`) com `5`.
2. No Insertion Sort, `i = 1` insere `5` antes de `8` (`[5, 8, 2, 9, 1]`) e `i = 2` insere `2` antes de `5` e `8` (note que `1`, lá no fim, ainda nem foi visitado!).

### Saída esperada
```text
selection (2 passos): [1, 2, 5, 9, 8]
insertion (2 passos): [2, 5, 8, 9, 1]
```

## Passo 3 · Exercício · Implementando Bubble Sort, Selection Sort e Insertion Sort *in-place*

Implemente as três funções `bubble_sort(lista)`, `selection_sort(lista)` e `insertion_sort(lista)` ordenando a própria lista recebida *in-place* e devolvendo-a ao final, **sem chamar `sorted()` nem `.sort()`**.

### Instruções
1. Em `bubble_sort(lista)`, a cada passagem externa `i` de `0` a `n - 1`, percorra `j` de `0` a `n - 2 - i` trocando `lista[j]` e `lista[j + 1]` se `lista[j] > lista[j + 1]`. Use uma flag `trocou` para interromper o laço externo caso nenhuma troca ocorra na passagem. Devolva `lista`.
2. Em `selection_sort(lista)`, para cada `i` de `0` a `n - 1`, encontre o índice `idx_min` do menor elemento em `lista[i : n]` e troque `lista[i]` com `lista[idx_min]`. Devolva `lista`.
3. Em `insertion_sort(lista)`, para cada `i` de `1` a `n - 1`, guarde `chave = lista[i]`, desloque para a direita os elementos de `lista[0 : i]` maiores que `chave` e insira `chave` na posição correta. Devolva `lista`.

### Código inicial
```python
def bubble_sort(lista):
    # Ordene lista in-place pelo método da bolha (com parada antecipada) e devolva lista
    pass


def selection_sort(lista):
    # Ordene lista in-place por seleção e devolva lista
    pass


def insertion_sort(lista):
    # Ordene lista in-place por inserção e devolva lista
    pass
```

### Solução
```python
def bubble_sort(lista):
    n = len(lista)
    for i in range(n):
        trocou = False
        for j in range(0, n - 1 - i):
            if lista[j] > lista[j + 1]:
                lista[j], lista[j + 1] = lista[j + 1], lista[j]
                trocou = True
        if not trocou:
            break
    return lista


def selection_sort(lista):
    n = len(lista)
    for i in range(n):
        idx_min = i
        for j in range(i + 1, n):
            if lista[j] < lista[idx_min]:
                idx_min = j
        lista[i], lista[idx_min] = lista[idx_min], lista[i]
    return lista


def insertion_sort(lista):
    for i in range(1, len(lista)):
        chave = lista[i]
        j = i - 1
        while j >= 0 and lista[j] > chave:
            lista[j + 1] = lista[j]
            j -= 1
        lista[j + 1] = chave
    return lista
```

### Dicas
1. Em Python, você troca dois elementos em uma única linha com desempacotamento: `lista[a], lista[b] = lista[b], lista[a]`.
2. A parada antecipada (`if not trocou: break`) no `bubble_sort` permite que uma lista já ordenada de $20\,000$ elementos termine em uma única passagem $O(n)$!

### Verificação
```json
[
  {
    "id": "sem-sorted",
    "checkpoint": 1,
    "kind": "source",
    "rule": { "type": "not_calls", "name": "sorted" },
    "name": "Não usa sorted()"
  },
  {
    "id": "sem-sort",
    "checkpoint": 1,
    "kind": "source",
    "rule": { "type": "not_calls", "name": "sort" },
    "name": "Não usa .sort()"
  },
  {
    "id": "tres-ordenam-in-place",
    "checkpoint": 2,
    "kind": "expr",
    "setup": "a = [5, 1, 4, 2, 8, 1]\nb = [5, 1, 4, 2, 8, 1]\nc = [5, 1, 4, 2, 8, 1]\nra = bubble_sort(a)\nrb = selection_sort(b)\nrc = insertion_sort(c)",
    "expr": "[a == [1, 1, 2, 4, 5, 8], b == [1, 1, 2, 4, 5, 8], c == [1, 1, 2, 4, 5, 8], ra is a, rb is b, rc is c]",
    "expected": [true, true, true, true, true, true],
    "name": "As três funções ordenam corretamente e alteram a própria lista in-place"
  },
  {
    "id": "bubble-parada-antecipada-20k",
    "checkpoint": 1,
    "kind": "expr",
    "setup": "ja_ordenada = list(range(20000))\nbubble_sort(ja_ordenada)\nins_ordenada = list(range(20000))\ninsertion_sort(ins_ordenada)",
    "expr": "[ja_ordenada[0], ja_ordenada[-1], ins_ordenada[0], ins_ordenada[-1]]",
    "expected": [0, 19999, 0, 19999],
    "name": "bubble_sort (com parada antecipada) e insertion_sort rodam em O(n) quando a lista já está ordenada"
  }
]
```

### Soluções erradas
```python name="bubble_sort sem parada antecipada (estoura tempo para 20k ordenados)"
def bubble_sort(lista):
    n = len(lista)
    for i in range(n):
        for j in range(0, n - 1):
            if lista[j] > lista[j + 1]:
                lista[j], lista[j + 1] = lista[j + 1], lista[j]
    return lista


def selection_sort(lista):
    return lista


def insertion_sort(lista):
    return lista
```
```python name="cria nova lista em vez de ordenar in-place"
def bubble_sort(lista):
    res = list(lista)
    n = len(res)
    for i in range(n):
        trocou = False
        for j in range(n - 1 - i):
            if res[j] > res[j + 1]:
                res[j], res[j + 1] = res[j + 1], res[j]
                trocou = True
        if not trocou:
            break
    return res


def selection_sort(lista):
    return list(lista)


def insertion_sort(lista):
    return list(lista)
```

## Passo 4 · Exercício · Contando comparações no Insertion Sort, trocas no Selection Sort e estabilidade

Implemente três funções analíticas:
1. `contar_trocas_selection(lista)`: executa o Selection Sort sobre uma cópia de `lista`, realizando uma troca **somente quando `idx_min != i`**, e devolve o número total de trocas efetivas realizadas.
2. `insertion_sort_com_contagem(lista)`: executa o Insertion Sort sobre uma cópia de `lista` e devolve o número total de **comparações entre elementos da lista** (`v[j] > chave`) realizadas no laço `while` (incluindo a comparação que falha e encerra o `while`, quando `j >= 0`).
3. `eh_estavel(algoritmo)`: recebe `"bubble_sort"`, `"selection_sort"` ou `"insertion_sort"` e devolve `True` se a implementação clássica é estável ou `False` caso contrário.

### Instruções
1. Em `contar_trocas_selection(lista)`, trabalhe sobre `v = list(lista)`. Para cada `i` de `0` a `len(v) - 1`, encontre `idx_min` do menor elemento em `v[i:]` (mantendo o primeiro índice em caso de empate: `if v[j] < v[idx_min]:`). Se `idx_min != i`, troque `v[i]` com `v[idx_min]` e incremente `trocas += 1`. Devolva `trocas`.
2. Em `insertion_sort_com_contagem(lista)`, trabalhe sobre `v = list(lista)`. Para cada `i` de `1` a `len(v) - 1`, no laço `while j >= 0:`, incremente `comparacoes += 1` antes de testar `if v[j] > chave:`; se verdadeiro, desloque `v[j + 1] = v[j]` e faça `j -= 1`; senão, dê `break`. Devolva `comparacoes`.
3. Em `eh_estavel(algoritmo)`, devolva `True` para `"bubble_sort"` e `"insertion_sort"`, e `False` para `"selection_sort"`.

### Código inicial
```python
def contar_trocas_selection(lista):
    # Devolva o número de trocas efetivas (quando idx_min != i) no Selection Sort
    pass


def insertion_sort_com_contagem(lista):
    # Devolva o total de comparações v[j] > chave realizadas pelo Insertion Sort
    pass


def eh_estavel(algoritmo):
    # Devolva True se o algoritmo clássico é estável, senão False
    pass
```

### Solução
```python
def contar_trocas_selection(lista):
    v = list(lista)
    n = len(v)
    trocas = 0
    for i in range(n):
        idx_min = i
        for j in range(i + 1, n):
            if v[j] < v[idx_min]:
                idx_min = j
        if idx_min != i:
            v[i], v[idx_min] = v[idx_min], v[i]
            trocas += 1
    return trocas


def insertion_sort_com_contagem(lista):
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


def eh_estavel(algoritmo):
    return algoritmo in ("bubble_sort", "insertion_sort")
```

### Dicas
1. Em `insertion_sort_com_contagem`, se a lista de tamanho $n$ já estiver ordenada, para cada `i` de `1` a `n - 1` o laço faz exatamente **1 comparação** (`v[i - 1] > chave`, que dá `False` e dá `break`), totalizando $n - 1$ comparações!
2. Já se a lista estiver em ordem estritamente decrescente, para cada `i` o elemento vai até `j = 0`, fazendo `i` comparações e totalizando $1 + 2 + \dots + (n - 1) = \frac{n(n - 1)}{2}$ comparações.

### Verificação
```json
[
  {
    "id": "trocas-selection",
    "checkpoint": 1,
    "kind": "expr",
    "expr": "[contar_trocas_selection([1, 2, 3, 4]), contar_trocas_selection([4, 2, 3, 1]), contar_trocas_selection([2, 3, 4, 1])]",
    "expected": [0, 1, 3],
    "name": "Conta trocas efetivas do Selection Sort: 0 (ordenada), 1 ([4,2,3,1]) e 3 ([2,3,4,1])"
  },
  {
    "id": "contagem-insertion-melhor-e-pior",
    "checkpoint": 2,
    "kind": "expr",
    "expr": "[insertion_sort_com_contagem([10, 20, 30, 40, 50]), insertion_sort_com_contagem([50, 40, 30, 20, 10]), insertion_sort_com_contagem([10, 30, 20, 40])]",
    "expected": [4, 10, 4],
    "name": "Conta comparações do Insertion Sort: n-1 = 4 (ordenada), n(n-1)/2 = 10 (invertida) e 4 ([10, 30, 20, 40])"
  },
  {
    "id": "estabilidade-tres",
    "checkpoint": 3,
    "kind": "expr",
    "expr": "[eh_estavel('bubble_sort'), eh_estavel('selection_sort'), eh_estavel('insertion_sort')]",
    "expected": [true, false, true],
    "name": "Classifica corretamente a estabilidade de bubble (True), selection (False) e insertion (True)"
  }
]
```

### Soluções erradas
```python name="não conta a comparação em que v[j] > chave dá False no Insertion Sort"
def contar_trocas_selection(lista):
    v = list(lista)
    trocas = 0
    for i in range(len(v)):
        idx_min = i
        for j in range(i + 1, len(v)):
            if v[j] < v[idx_min]:
                idx_min = j
        if idx_min != i:
            v[i], v[idx_min] = v[idx_min], v[i]
            trocas += 1
    return trocas


def insertion_sort_com_contagem(lista):
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


def eh_estavel(algoritmo):
    return algoritmo != "selection_sort"
```
```python name="conta troca mesmo quando idx_min == i no Selection Sort"
def contar_trocas_selection(lista):
    return max(0, len(lista) - 1)


def insertion_sort_com_contagem(lista):
    return len(lista) - 1


def eh_estavel(algoritmo):
    return True
```

## Passo 5 · Quiz · Invariantes, adaptatividade e estabilidade

### Pergunta
Você recebe um arquivo de log com $100\,000$ eventos que já estão em ordem cronológica, exceto por **3 ou 4 eventos atrasados** que chegaram uma posição fora de ordem. Entre Bubble Sort sem flag, Selection Sort e Insertion Sort, qual terminará quase instantaneamente e por quê?
- [ ] Selection Sort, porque ele faz no máximo $n - 1$ trocas.
- [x] Insertion Sort, porque ele é **adaptativo**: seu número de operações é $\Theta(n + I)$, onde $I$ é o número de inversões na lista. Com apenas 3 ou 4 inversões, ele faz $\approx 100\,000$ comparações ($\Theta(n)$), enquanto o Selection Sort sempre faz $\frac{n(n-1)}{2} \approx 5 \times 10^9$ comparações mesmo em lista já ordenada!
- [ ] Bubble Sort sem flag de parada, pois ele não faz trocas quando os elementos estão ordenados.
- [ ] Todos os três levam o mesmo tempo, pois todos são $\Theta(n^2)$.
> O Selection Sort é "cego" à ordenação existente: para descobrir que `lista[i]` é o menor do sufixo, ele sempre varre todos os elementos restantes ($\Theta(n^2)$ no melhor e no pior caso). Já o Insertion Sort faz apenas $1$ comparação por elemento quando a lista está ordenada!

### Pergunta
Em qual situação o **Selection Sort** tem uma vantagem real sobre o Bubble Sort e o Insertion Sort?
- [ ] Quando precisamos de ordenação estável.
- [x] Quando ler e comparar elementos é barato, mas **escrever/trocar na memória é extremamente caro** (por exemplo, memória flash/EEPROM ou registros gigantes), pois o Selection Sort faz no máximo $n - 1$ trocas ($\Theta(n)$ escritas), contra $\Theta(n^2)$ escritas dos outros dois no pior caso.
- [ ] Quando a lista já está quase ordenada.
- [ ] Quando $n > 1\,000\,000$.
> O Selection Sort é o único dos três cujo número de **trocas** é linear $O(n)$ mesmo no pior caso (no máximo uma troca por iteração do laço externo).
