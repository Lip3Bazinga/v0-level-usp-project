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

## Passo 1 · Leitura · Melhor caso, pior caso, caso médio e custo amortizado

Um mesmo algoritmo pode fazer quantidades muito diferentes de trabalho para entradas de **mesmo tamanho $n$**. Considere a **busca linear** de um elemento `alvo` em uma lista de $n$ elementos distintos:

- **Melhor caso ($\Theta(1)$):** `alvo` está logo na primeira posição (`lista[0]`). O algoritmo faz apenas **1 comparação**.
- **Pior caso ($\Theta(n)$):** `alvo` está na última posição (`lista[n-1]`) ou não está na lista. O algoritmo faz **$n$ comparações**.
- **Caso médio ($\Theta(n)$):** se o `alvo` estiver na lista com igual probabilidade em qualquer uma das $n$ posições, o número esperado de comparações é a média ponderada pelas probabilidades de cada entrada:
  $$E[\text{comparações}] = \frac{1}{n}\sum_{k=1}^{n} k = \frac{n + 1}{2} \in \Theta(n)$$
  *(Atenção: caso médio **não** é simplesmente "a média aritmética do melhor e do pior caso"; ele exige uma distribuição de probabilidade sobre as entradas! Em alguns algoritmos, como a busca em tabela hash bem distribuída, o pior caso é $\Theta(n)$, mas o caso médio é $\Theta(1)$.)*

#### Quando importa o pior caso e quando basta o caso médio?

Na maioria das análises damos prioridade ao **pior caso**, pois ele fornece uma **garantia**: não importa qual entrada um usuário ou atacante envie, o algoritmo jamais passará daquele limite. Em sistemas de tempo real (freios ABS, aviação) ou servidores expostos à internet (onde um atacante pode forjar chaves que colidem no hash para causar negação de serviço — *HashDoS*), o pior caso é crítico. Já quando controlamos a distribuição ou usamos aleatorização interna, o caso médio passa a ser um excelente guia prático.

#### Custo amortizado: por que `lista.append(x)` é $O(1)$?

Uma `list` em Python é implementada internamente como um **vetor contíguo redimensionável**. Quando a capacidade atual se esgota, o Python aloca um novo bloco com o **dobro da capacidade** e copia todos os elementos antigos para lá.

Se começarmos com capacidade $1$ e fizermos $n$ inserções (`append`) dobrando a capacidade sempre que a lista encher (em $1, 2, 4, 8, \dots, 2^k$), o total de elementos copiados em todos os redimensionamentos ao longo das $n$ inserções é uma progressão geométrica:

$$
1 + 2 + 4 + 8 + \dots + 2^{\lfloor\log_2(n-1)\rfloor} < 2n
$$

Dividindo o trabalho total ($n$ inserções diretas $+$ menos de $2n$ cópias $< 3n$) pelas $n$ operações, cada `append` custa em média **menos de 3 operações** — isto é, **$O(1)$ amortizado**!

## Passo 2 · Exercício · Busca linear com contagem e simulação de lista dinâmica

Implemente duas funções:
1. `busca_linear_com_contagem(lista, alvo)`: percorre `lista` da esquerda para a direita contando quantas comparações `elemento == alvo` são feitas. Se encontrar `alvo`, devolve imediatamente a tupla `(indice, comparacoes)`; se terminar a lista sem encontrar, devolve `(-1, comparacoes)`.
2. `simular_lista_dinamica(n)`: simula a inserção de `n` elementos ($n \ge 0$) em um vetor dinâmico que começa com `capacidade = 1` e `tamanho = 0`. Antes de inserir cada novo elemento, se `tamanho == capacidade`, o vetor **dobra** sua capacidade (`capacidade *= 2`) e copia os `tamanho` elementos existentes para o novo bloco (`copias += tamanho`). Ao final das `n` inserções, devolve a tupla `(capacidade, copias)`.

### Instruções
1. Em `busca_linear_com_contagem(lista, alvo)`, inicialize `comparacoes = 0`; para cada `i, x` em `enumerate(lista)`, incremente `comparacoes += 1` e, se `x == alvo`, devolva `(i, comparacoes)`. Se o laço terminar, devolva `(-1, comparacoes)`.
2. Em `simular_lista_dinamica(n)`, comece com `capacidade = 1`, `tamanho = 0` e `copias = 0`. Para cada uma das `n` inserções, verifique se `tamanho == capacidade` (dobrando `capacidade` e somando `tamanho` em `copias`) e depois incremente `tamanho += 1`. Devolva `(capacidade, copias)`.

### Código inicial
```python
def busca_linear_com_contagem(lista, alvo):
    # Devolva (indice, comparacoes) ou (-1, comparacoes)
    pass


def simular_lista_dinamica(n):
    # Simule n inserções dobrando a capacidade quando tamanho == capacidade
    # Devolva (capacidade_final, total_de_copias)
    pass
```

### Solução
```python
def busca_linear_com_contagem(lista, alvo):
    comparacoes = 0
    for i, x in enumerate(lista):
        comparacoes += 1
        if x == alvo:
            return (i, comparacoes)
    return (-1, comparacoes)


def simular_lista_dinamica(n):
    capacidade = 1
    tamanho = 0
    copias = 0
    for _ in range(n):
        if tamanho == capacidade:
            capacidade *= 2
            copias += tamanho
        tamanho += 1
    return (capacidade, copias)
```

### Dicas
1. Na busca linear, incremente `comparacoes` **antes** do `if x == alvo:` para que a comparação que encontrou o elemento também seja contada.
2. Em `simular_lista_dinamica(5)`: a primeira inserção cabe na capacidade `1` (`0` cópias); a 2ª dobra para `2` (`+1` cópia); a 3ª dobra para `4` (`+2` cópias); a 4ª cabe; a 5ª dobra para `8` (`+4` cópias), totalizando `(8, 7)`.

### Verificação
```json
[
  {
    "id": "busca-tres-casos",
    "checkpoint": 1,
    "kind": "expr",
    "setup": "v = [10, 20, 30, 40, 50]",
    "expr": "[busca_linear_com_contagem(v, 10), busca_linear_com_contagem(v, 30), busca_linear_com_contagem(v, 50), busca_linear_com_contagem(v, 99)]",
    "expected": [[0, 1], [2, 3], [4, 5], [-1, 5]],
    "name": "Conta comparações no melhor caso (1), caso intermediário (3) e pior caso (5)"
  },
  {
    "id": "dinamica-pequena",
    "checkpoint": 2,
    "kind": "expr",
    "expr": "[simular_lista_dinamica(1), simular_lista_dinamica(4), simular_lista_dinamica(5)]",
    "expected": [[1, 0], [4, 3], [8, 7]],
    "name": "Simula capacidade e cópias para n = 1, 4 e 5: [(1, 0), (4, 3), (8, 7)]"
  },
  {
    "id": "dinamica-amortizada-1025",
    "checkpoint": 2,
    "kind": "call",
    "function": "simular_lista_dinamica",
    "args": [1025],
    "expected": [2048, 2047],
    "name": "Para n = 1025, capacidade vai a 2048 e total de cópias é 1+2+4+...+1024 = 2047 (< 2n)"
  }
]
```

### Soluções erradas
```python name="não conta a comparação em que o elemento é encontrado"
def busca_linear_com_contagem(lista, alvo):
    comparacoes = 0
    for i, x in enumerate(lista):
        if x == alvo:
            return (i, comparacoes)
        comparacoes += 1
    return (-1, comparacoes)


def simular_lista_dinamica(n):
    capacidade = 1
    tamanho = 0
    copias = 0
    for _ in range(n):
        if tamanho == capacidade:
            capacidade *= 2
            copias += tamanho
        tamanho += 1
    return (capacidade, copias)
```
```python name="soma a nova capacidade em vez do tamanho antigo nas cópias"
def busca_linear_com_contagem(lista, alvo):
    comparacoes = 0
    for i, x in enumerate(lista):
        comparacoes += 1
        if x == alvo:
            return (i, comparacoes)
    return (-1, comparacoes)


def simular_lista_dinamica(n):
    capacidade = 1
    tamanho = 0
    copias = 0
    for _ in range(n):
        if tamanho == capacidade:
            capacidade *= 2
            copias += capacidade
        tamanho += 1
    return (capacidade, copias)
```

## Passo 3 · Leitura · Complexidade de espaço, algoritmos *in-place* e a pilha de recursão

Além do tempo de CPU, todo algoritmo consome **memória**. Para avaliar o consumo de memória, distinguimos:
- **Espaço de entrada:** a memória já ocupada pelos dados recebidos pela função.
- **Espaço auxiliar:** a memória **extra** alocada pelo algoritmo durante sua execução (listas temporárias, dicionários, conjuntos e **quadros na pilha de chamadas recursivas**).

Dizemos que um algoritmo é **in-place** (no próprio lugar) quando ele transforma os dados usando apenas **$O(1)$ de espaço auxiliar** — um número fixo de variáveis escalares, independentemente de $n$.

Veja no visualizador como invertemos uma lista *in-place* usando dois ponteiros (`esq` e `dir`) que caminham em direção ao centro trocando os elementos das pontas, sem criar nenhuma lista auxiliar:

```python visualizar
def inverter_in_place(lista):
    esq = 0
    dir = len(lista) - 1
    while esq < dir:
        lista[esq], lista[dir] = lista[dir], lista[esq]
        esq += 1
        dir -= 1
    return lista

dados = [10, 20, 30, 40, 50]
inverter_in_place(dados)
print("Invertida in-place:", dados)
```

#### Três armadilhas clássicas de memória em Python

1. **Fatias copiam elementos:** `lista[::-1]` ou `lista[:]` aloca uma **nova lista** de tamanho $n$, portanto gasta **$O(n)$ de espaço auxiliar** (não é *in-place*!).
2. **Recursão consome memória na pilha (*call stack*):** uma função recursiva com profundidade máxima $d$ mantém $d$ quadros de ativação simultâneos na memória. Assim, `fatorial(n)` recursivo gasta **$O(n)$ de espaço auxiliar**, enquanto a versão com `for` gasta **$O(1)$**.
3. **Troca tempo $\times$ espaço (*time-space tradeoff*):** muitas vezes gastamos $O(n)$ de memória extra de propósito (como o `vistos = set()` da lição anterior ou uma tabela de memoização) para derrubar o tempo de $O(n^2)$ para $O(n)$.

## Passo 4 · Exercício · Invertendo uma lista *in-place* com dois ponteiros
modo: ordenar

Ordene e indente as linhas para montar `inverter_in_place(lista)`, que inverte a própria lista recebida usando os índices `esq` e `dir` com espaço auxiliar $O(1)$ e devolve a mesma lista modificada. Há duas linhas distratoras.

### Instruções
1. Inicialize `esq = 0` e `dir = len(lista) - 1`.
2. Enquanto `esq < dir`, troque `lista[esq]` com `lista[dir]` e avance `esq += 1` e `dir -= 1`.
3. Ao final do laço, devolva `lista`.

### Solução
```python
def inverter_in_place(lista):
    esq = 0
    dir = len(lista) - 1
    while esq < dir:
        lista[esq], lista[dir] = lista[dir], lista[esq]
        esq += 1
        dir -= 1
    return lista
```

### Distratores
```python
return lista[::-1]
while esq <= len(lista):
```

### Dicas
1. A condição do laço é `while esq < dir:` — quando `esq` encontra ou ultrapassa `dir`, todas as trocas já foram feitas.
2. Não use `return lista[::-1]`, pois isso criaria um novo objeto `list` em vez de alterar a lista original *in-place*.

### Verificação
```json
[
  {
    "id": "sem-reversed",
    "checkpoint": 2,
    "kind": "source",
    "rule": { "type": "not_calls", "name": "reversed" },
    "name": "Não usa a função reversed()"
  },
  {
    "id": "inverte-impar-e-par",
    "checkpoint": 2,
    "kind": "expr",
    "expr": "[inverter_in_place([1, 2, 3, 4, 5]), inverter_in_place([10, 20, 30, 40]), inverter_in_place([])]",
    "expected": [[5, 4, 3, 2, 1], [40, 30, 20, 10], []],
    "name": "Inverte listas de tamanho ímpar, par e vazia"
  },
  {
    "id": "mesmo-objeto-na-memoria",
    "checkpoint": 3,
    "kind": "expr",
    "setup": "original = [1, 2, 3, 4]\nid_antes = id(original)\nretorno = inverter_in_place(original)",
    "expr": "[id(original) == id_antes, retorno is original, original]",
    "expected": [true, true, [4, 3, 2, 1]],
    "name": "Altera a própria lista recebida in-place (mesmo id em memória)"
  }
]
```

### Soluções erradas
```python name="cria nova lista com fatiamento lista[::-1] (espaço O(n))"
def inverter_in_place(lista):
    return lista[::-1]
```
```python name="percorre até o fim e destroca os elementos de volta ao original"
def inverter_in_place(lista):
    for i in range(len(lista)):
        j = len(lista) - 1 - i
        lista[i], lista[j] = lista[j], lista[i]
    return lista
```

## Passo 5 · Exercício · Classificando o espaço auxiliar de algoritmos

Implemente `espaco_auxiliar(algoritmo)`, que recebe o identificador de um algoritmo e devolve sua complexidade de **espaço auxiliar** (`"O(1)"`, `"O(log n)"` ou `"O(n)"`):
- `"inverter_dois_ponteiros"`: inversão de lista com `esq` e `dir` $\to$ `"O(1)"`
- `"inverter_fatia"`: inversão com `lista[::-1]` $\to$ `"O(n)"`
- `"soma_iterativa"`: somar elementos de uma lista com acumulador `total` $\to$ `"O(1)"`
- `"fatorial_recursivo"`: `fatorial(n)` recursivo de profundidade $n$ $\to$ `"O(n)"`
- `"busca_binaria_recursiva"`: busca binária recursiva dividindo o intervalo ao meio a cada chamada $\to$ `"O(log n)"`
- `"remover_duplicatas_set"`: remover duplicatas guardando elementos em `vistos = set()` $\to$ `"O(n)"`

### Instruções
1. Mapeie cada um dos 6 identificadores acima para `"O(1)"`, `"O(log n)"` ou `"O(n)"` considerando tanto estruturas alocadas no *heap* quanto a profundidade máxima da pilha de recursão.
2. Devolva a string correspondente ao `algoritmo` recebido.

### Código inicial
```python
def espaco_auxiliar(algoritmo):
    # Devolva "O(1)", "O(log n)" ou "O(n)" para o algoritmo informado
    pass
```

### Solução
```python
ESPACOS = {
    "inverter_dois_ponteiros": "O(1)",
    "inverter_fatia": "O(n)",
    "soma_iterativa": "O(1)",
    "fatorial_recursivo": "O(n)",
    "busca_binaria_recursiva": "O(log n)",
    "remover_duplicatas_set": "O(n)",
}


def espaco_auxiliar(algoritmo):
    return ESPACOS[algoritmo]
```

### Dicas
1. Em funções recursivas que não alocam listas, o espaço auxiliar é determinado pela **altura máxima da pilha de chamadas**: $n$ chamadas aninhadas em `fatorial_recursivo` ($\implies O(n)$) e $\approx \log_2 n$ chamadas aninhadas em `busca_binaria_recursiva` ($\implies O(\log n)$).
2. `lista[::-1]` e `vistos = set()` alocam memória proporcional a $n$ no pior caso ($\implies O(n)$).

### Verificação
```json
[
  {
    "id": "espaco-in-place",
    "checkpoint": 1,
    "kind": "expr",
    "expr": "[espaco_auxiliar('inverter_dois_ponteiros'), espaco_auxiliar('soma_iterativa')]",
    "expected": ["O(1)", "O(1)"],
    "name": "Algoritmos iterativos com número fixo de variáveis usam O(1) de espaço auxiliar"
  },
  {
    "id": "espaco-alocacao-e-pilha",
    "checkpoint": 2,
    "kind": "expr",
    "expr": "[espaco_auxiliar('inverter_fatia'), espaco_auxiliar('fatorial_recursivo'), espaco_auxiliar('busca_binaria_recursiva'), espaco_auxiliar('remover_duplicatas_set')]",
    "expected": ["O(n)", "O(n)", "O(log n)", "O(n)"],
    "name": "Classifica corretamente fatia O(n), recursão linear O(n), recursão logarítmica O(log n) e set O(n)"
  }
]
```

### Soluções erradas
```python name="esquece que a pilha de recursão ocupa memória"
def espaco_auxiliar(algoritmo):
    if algoritmo in ("inverter_fatia", "remover_duplicatas_set"):
        return "O(n)"
    return "O(1)"
```
```python name="acha que fatia lista[::-1] é in-place O(1)"
def espaco_auxiliar(algoritmo):
    if algoritmo in ("fatorial_recursivo", "remover_duplicatas_set"):
        return "O(n)"
    if algoritmo == "busca_binaria_recursiva":
        return "O(log n)"
    return "O(1)"
```

## Passo 6 · Quiz · Casos de análise, amortização e memória

### Pergunta
Por que o método `lista.append(x)` em Python tem complexidade **$O(1)$ amortizada**, apesar de ocasionalmente precisar copiar todos os $n$ elementos para um novo bloco de memória?
- [ ] Porque o Python usa listas encadeadas em vez de vetores contíguos.
- [ ] Porque a cópia de memória em linguagem C tem custo $O(0)$.
- [x] Porque a capacidade cresce geometricamente (por um fator multiplicativo constante, como dobrar): as cópias $O(n)$ ocorrem apenas após $\Theta(n)$ inserções baratas $O(1)$, fazendo a soma total de trabalho para $n$ inserções ser $\Theta(n)$ (logo $\Theta(n)/n = O(1)$ por operação).
- [ ] Porque o redimensionamento só acontece uma única vez durante todo o programa.
> Se aumentássemos a capacidade somando uma constante fixa (ex.: $+10$ posições a cada estouro), as cópias custariam $10 + 20 + 30 + \dots + n = \Theta(n^2)$, resultando em $O(n)$ amortizado! É o crescimento **geométrico** da capacidade que garante $O(1)$ amortizado.

### Pergunta
Qual das funções abaixo é verdadeiramente **in-place** (custo de espaço auxiliar $O(1)$) ao processar uma lista `v` de tamanho $n$?
- [ ] Uma função recursiva que percorre `v` de `i = 0` até `n - 1` chamando `percorrer(v, i + 1)`.
- [ ] Uma função que ordena os dados fazendo `v = sorted(v)`.
- [x] Uma função iterativa que encontra o menor elemento de `v` e o troca com `v[0]` usando apenas três variáveis inteiras (`i`, `indice_min`, `temp`).
- [ ] Uma função que passa `v[: len(v) // 2]` para um laço `for`.
> A recursão de profundidade $n$ empilha $n$ quadros ($O(n)$), `sorted(v)` aloca uma nova lista ($O(n)$) e `v[: len(v)//2]` copia metade da lista ($O(n)$). Apenas a função iterativa com variáveis escalares fixas usa espaço auxiliar $O(1)$.
