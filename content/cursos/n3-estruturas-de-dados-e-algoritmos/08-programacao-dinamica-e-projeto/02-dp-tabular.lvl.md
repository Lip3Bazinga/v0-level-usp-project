---
slug: n3-m8-02-dp-tabular
titulo: Programação dinâmica tabular
descricao: 'Preencher tabelas de baixo para cima: mochila 0/1, soma máxima de subarranjo, subsequência crescente mais longa e reconstrução da solução.'
dificuldade: intermediario
tipo: guiada
runtime: python
bibliotecas: []
xp: 130
tempo_min: 55
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Converter uma solução memoizada em tabela iterativa e reduzir memória quando possível
- Resolver mochila 0/1, Kadane e LIS com DP tabular
- Reconstruir a solução (quais itens, qual subsequência) a partir da tabela
---

## Passo 1 · Leitura · Da recursão à tabela

A memoização calcula cada estado na hora em que alguém pede. A versão **tabular** (*bottom-up*) usa a mesma recorrência ao contrário: preenche uma tabela numa ordem em que, ao chegar num estado, tudo de que ele depende já está pronto. Não há recursão, e o `RecursionError` some.

No troco, $t(v)$ depende de valores menores; basta preencher $v = 0, 1, 2, \dots$ em ordem crescente. Clique em "Visualizar" e acompanhe a tabela com moedas 1, 3 e 4:

```python visualizar
moedas = [1, 3, 4]
valor = 6
INF = float("inf")
t = [0] + [INF] * valor
for v in range(1, valor + 1):
    for m in moedas:
        if m <= v and t[v - m] + 1 < t[v]:
            t[v] = t[v - m] + 1
    print(v, t)
```

Na **mochila 0/1** há $n$ itens, cada um com peso $p_i$ e valor $v_i$, e uma capacidade $W$; cada item vai inteiro ou fica. O estado é $(i, w)$: o melhor valor usando só os $i$ primeiros itens com capacidade $w$. O item $i$ fica de fora ou entra:

$$
dp[i][w] = \max\big(dp[i-1][w],\; dp[i-1][w - p_i] + v_i\big), \qquad dp[0][w] = 0 ,
$$

com a segunda opção só quando $p_i \le w$. A linha 0 representa "nenhum item" e evita um caso especial; por isso a tabela tem $n + 1$ linhas e $W + 1$ colunas, e o item $i$ da tabela é o `pesos[i - 1]` da lista. Esquecer esse deslocamento é o erro de índice mais comum.

Cada linha só lê a linha de cima, e dá para guardar **uma linha só**, de $W + 1$ posições, atualizando-a no lugar. A ordem de $w$ passa a importar. Em ordem crescente, quando você calcula `melhor[w]`, a posição `melhor[w - p]` já foi atualizada **nesta** linha, isto é, já pode conter o item atual. Com um item de peso 2 e valor 3 e capacidade 4, `melhor[2]` vira 3 e logo depois `melhor[4]` vira $3 + 3 = 6$: o mesmo item entrou duas vezes. Percorrendo $w$ de $W$ até $p$, `melhor[w - p]` ainda é o valor da linha anterior.

O custo é o tamanho da tabela: $O(nW)$ operações. Repare que é $W$, o **valor** da capacidade, e não o tamanho da entrada: com $W = 10^9$ a tabela não cabe na memória.

## Passo 2 · Exercício · mochila_1d com uma linha só
modo: ordenar

Monte `mochila_1d(pesos, valores, capacidade)`, que devolve o maior valor que cabe na mochila usando uma lista de `capacidade + 1` posições. Arraste as linhas e ajuste a indentação; duas linhas estão sobrando.

A verificação mede a memória: com 80 itens e capacidade 2 500, a tabela completa ocupa milhões de bytes, e o limite é 1 000 000.

### Instruções
1. Crie a lista `melhor` com uma posição para cada capacidade de 0 até `capacidade`.
2. Para cada item, percorra as capacidades da maior até o peso do item, para que cada item entre no máximo uma vez.
3. Em cada capacidade, fique com o melhor entre deixar o item de fora e levá-lo; devolva o valor da capacidade total.

### Solução
```python
def mochila_1d(pesos, valores, capacidade):
    melhor = [0] * (capacidade + 1)
    for i in range(len(pesos)):
        for w in range(capacidade, pesos[i] - 1, -1):
            melhor[w] = max(melhor[w], melhor[w - pesos[i]] + valores[i])
    return melhor[capacidade]
```

### Distratores
```python
for w in range(pesos[i], capacidade + 1):
melhor[w] = melhor[w - pesos[i]] + valores[i]
```

### Dicas
1. A lista começa com zeros: sem nenhum item, toda capacidade vale 0.
2. O `range` que desce precisa incluir a capacidade igual ao peso do item.
3. Na comparação, uma das opções é o valor que já está em `melhor[w]`.

### Verificação
```json
[
  {"id": "exemplo", "checkpoint": 3, "kind": "call", "function": "mochila_1d", "args": [[1, 3, 4], [1, 4, 5], 7], "expected": 9, "name": "Itens (1, 1), (3, 4), (4, 5) e capacidade 7: valor 9"},
  {"id": "item-uma-vez", "checkpoint": 2, "kind": "call", "function": "mochila_1d", "args": [[2], [3], 4], "expected": 3, "name": "Um item de peso 2 e capacidade 4: ele entra uma vez só, valor 3", "hint": "Em que ordem as capacidades são percorridas?"},
  {"id": "peso-exato", "checkpoint": 2, "kind": "call", "function": "mochila_1d", "args": [[3], [5], 3], "expected": 5, "name": "Item de peso 3 na capacidade 3: cabe exatamente", "hint": "O laço precisa chegar até a capacidade igual ao peso."},
  {"id": "capacidade-zero", "checkpoint": 1, "kind": "call", "function": "mochila_1d", "args": [[1, 2], [5, 6], 0], "expected": 0, "name": "Capacidade 0: valor 0"},
  {"id": "nada-cabe", "checkpoint": 3, "kind": "call", "function": "mochila_1d", "args": [[5, 6], [10, 10], 4], "expected": 0, "name": "Nenhum item cabe: valor 0"},
  {"id": "razao-engana", "checkpoint": 3, "kind": "call", "function": "mochila_1d", "args": [[6, 5, 5], [30, 20, 20], 10], "expected": 40, "name": "Itens (6, 30), (5, 20), (5, 20) e capacidade 10: valor 40"},
  {"id": "trinta-itens", "checkpoint": 3, "kind": "expr", "expr": "mochila_1d([(i * 37) % 23 + 3 for i in range(30)], [(i * 53) % 41 + 5 for i in range(30)], 100)", "expected": 377, "name": "30 itens e capacidade 100: valor 377"},
  {"id": "oitenta-valor", "checkpoint": 3, "kind": "expr", "expr": "mochila_1d([(i * 37) % 97 + 5 for i in range(80)], [(i * 53) % 89 + 10 for i in range(80)], 2500)", "expected": 3504, "name": "80 itens e capacidade 2 500: valor 3 504"},
  {"id": "oitenta-memoria", "checkpoint": 1, "kind": "expr", "setup": "import tracemalloc\ntracemalloc.start()\nr = mochila_1d([(i * 37) % 97 + 5 for i in range(80)], [(i * 53) % 89 + 10 for i in range(80)], 2500)\n_pico = tracemalloc.get_traced_memory()[1]\ntracemalloc.stop()", "expr": "_pico < 1000000", "expected": true, "name": "80 itens e capacidade 2 500 com menos de 1 000 000 bytes de memória", "hint": "Uma linha de capacidade + 1 posições basta; a tabela inteira não."}
]
```

### Soluções erradas
```python name="capacidades em ordem crescente"
def mochila_1d(pesos, valores, capacidade):
    melhor = [0] * (capacidade + 1)
    for i in range(len(pesos)):
        for w in range(pesos[i], capacidade + 1):
            melhor[w] = max(melhor[w], melhor[w - pesos[i]] + valores[i])
    return melhor[capacidade]
```
```python name="para antes do peso exato"
def mochila_1d(pesos, valores, capacidade):
    melhor = [0] * (capacidade + 1)
    for i in range(len(pesos)):
        for w in range(capacidade, pesos[i], -1):
            melhor[w] = max(melhor[w], melhor[w - pesos[i]] + valores[i])
    return melhor[capacidade]
```
```python name="sobrescreve sem comparar"
def mochila_1d(pesos, valores, capacidade):
    melhor = [0] * (capacidade + 1)
    for i in range(len(pesos)):
        for w in range(capacidade, pesos[i] - 1, -1):
            melhor[w] = melhor[w - pesos[i]] + valores[i]
    return melhor[capacidade]
```
```python name="tabela completa n × W"
def mochila_1d(pesos, valores, capacidade):
    n = len(pesos)
    dp = [[0] * (capacidade + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for w in range(capacidade + 1):
            dp[i][w] = dp[i - 1][w]
            if pesos[i - 1] <= w:
                dp[i][w] = max(dp[i][w], dp[i - 1][w - pesos[i - 1]] + valores[i - 1])
    return dp[n][capacidade]
```
```python name="lista sem a posição da capacidade total"
def mochila_1d(pesos, valores, capacidade):
    melhor = [0] * capacidade
    for i in range(len(pesos)):
        for w in range(capacidade - 1, pesos[i] - 1, -1):
            melhor[w] = max(melhor[w], melhor[w - pesos[i]] + valores[i])
    return melhor[capacidade - 1]
```

## Passo 3 · Leitura · Quais itens entraram

Quem arruma a mochila quer a lista de itens, e a tabela completa guarda essa informação. Como $dp[i][w]$ é o máximo entre deixar e levar o item $i$, comparar com a linha de cima diz qual opção venceu:

- se $dp[i][w] = dp[i-1][w]$, deixar o item $i$ de fora já dá o ótimo, e você sobe para $(i - 1, w)$;
- senão, o item $i$ entrou, e você sobe para $(i - 1, w - p_i)$.

Comece em $(n, W)$ e repita até a linha 0. Com os itens A (peso 1, valor 1), B (peso 3, valor 4) e C (peso 4, valor 5) e capacidade 7:

| | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|---|
| nenhum | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| A | 0 | 1 | 1 | 1 | 1 | 1 | 1 | 1 |
| B | 0 | 1 | 1 | 4 | 5 | 5 | 5 | 5 |
| C | 0 | 1 | 1 | 4 | 5 | 6 | 6 | 9 |

Em $(C, 7)$, 9 é diferente do 5 de cima: C entrou, e sobram $7 - 4 = 3$. Em $(B, 3)$, 4 é diferente de 1: B entrou, sobra 0. Em $(A, 0)$, nada muda: A ficou. Resposta: B e C, valor 9. Como o caminho é percorrido de baixo para cima, os índices saem do maior para o menor.

Os erros de reconstrução não levantam exceção, devolvem uma lista plausível:

- **comparar com o vizinho errado**, $dp[i][w-1]$ em vez de $dp[i-1][w]$, que mede o efeito de uma unidade de capacidade;
- **não descontar o peso** quando o item entra, e seguir comparando na coluna antiga;
- **reconstruir pela linha única** da versão 1D: no fim ela só tem a última linha, e o teste "mudou em relação à linha de cima" não tem mais a linha de cima.

Por isso a economia de memória tem preço: para listar os itens, guarde a tabela inteira ou uma tabela de escolhas.

Outro atalho tentador é o **guloso pela razão** valor/peso. Com capacidade 10 e itens (6, 30), (5, 20) e (5, 20), ele leva o de razão 5 e não cabe mais nada: 30. Os dois de razão 4 juntos dão 40. Na mochila 0/1, um item que não cabe inteiro não pode entrar pela metade.

## Passo 4 · Exercício · mochila com os itens escolhidos

Escreva `mochila(pesos, valores, capacidade)`, que devolve uma tupla `(valor, itens)`: o maior valor total e a lista dos **índices** dos itens escolhidos, em ordem crescente. Pesos são inteiros positivos; a capacidade é um inteiro maior ou igual a 0.

Quando há mais de uma escolha ótima, qualquer uma vale: a verificação confere que os itens existem, não se repetem, cabem e somam o valor devolvido. Ela também conta as linhas executadas: com 60 itens e capacidade 400, no máximo 250 000.

### Instruções
1. Preencha a tabela de $(n + 1) \times (W + 1)$ posições, com a linha 0 representando nenhum item.
   Dica: o item da linha `i` é o de índice `i - 1` nas listas.
2. Reconstrua os itens a partir de `(n, capacidade)`, subindo uma linha por vez.
3. Devolva `(valor, itens)` com os índices em ordem crescente.

### Código inicial
```python
def mochila(pesos, valores, capacidade):
    pass
```

### Solução
```python
def mochila(pesos, valores, capacidade):
    n = len(pesos)
    dp = [[0] * (capacidade + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        p, v = pesos[i - 1], valores[i - 1]
        for w in range(capacidade + 1):
            dp[i][w] = dp[i - 1][w]
            if p <= w and dp[i - 1][w - p] + v > dp[i][w]:
                dp[i][w] = dp[i - 1][w - p] + v
    itens = []
    w = capacidade
    for i in range(n, 0, -1):
        if dp[i][w] != dp[i - 1][w]:
            itens.append(i - 1)
            w -= pesos[i - 1]
    itens.reverse()
    return dp[n][capacidade], itens
```

### Dicas
1. Calcule primeiro só a tabela e confira o valor em $(n, W)$ com o exemplo da leitura.
2. Na volta, a pergunta em cada linha é: o valor mudou em relação à linha de cima, na mesma coluna?
3. Quando um item entra, a coluna em que você continua a comparação também muda.

### Verificação
```json
[
  {"id": "exemplo", "checkpoint": 2, "kind": "call", "function": "mochila", "args": [[1, 3, 4], [1, 4, 5], 7], "expected": [9, [1, 2]], "name": "Exemplo da leitura: (9, [1, 2])"},
  {"id": "razao", "checkpoint": 1, "kind": "call", "function": "mochila", "args": [[6, 5, 5], [30, 20, 20], 10], "expected": [40, [1, 2]], "name": "Itens (6, 30), (5, 20), (5, 20) e capacidade 10: (40, [1, 2])", "hint": "O item de maior valor por peso não está na resposta."},
  {"id": "capacidade-zero", "checkpoint": 3, "kind": "call", "function": "mochila", "args": [[1, 2], [5, 6], 0], "expected": [0, []], "name": "Capacidade 0: (0, [])"},
  {"id": "nada-cabe", "checkpoint": 3, "kind": "call", "function": "mochila", "args": [[5], [10], 4], "expected": [0, []], "name": "Nenhum item cabe: (0, [])"},
  {"id": "um-item", "checkpoint": 2, "kind": "call", "function": "mochila", "args": [[3], [5], 3], "expected": [5, [0]], "name": "Um item que cabe exatamente: (5, [0])"},
  {"id": "primeiro-item", "checkpoint": 2, "kind": "call", "function": "mochila", "args": [[2, 3, 4], [3, 4, 5], 5], "expected": [7, [0, 1]], "name": "Itens (2, 3), (3, 4), (4, 5) e capacidade 5: (7, [0, 1])", "hint": "A última linha que você compara é a do primeiro item, contra a linha de nenhum item."},
  {"id": "ordem-crescente", "checkpoint": 3, "kind": "call", "function": "mochila", "args": [[4, 2, 3, 9], [6, 3, 5, 20], 9], "expected": [20, [3]], "name": "Itens (4, 6), (2, 3), (3, 5), (9, 20) e capacidade 9: (20, [3])"},
  {"id": "tres-itens", "checkpoint": 3, "kind": "call", "function": "mochila", "args": [[5, 4, 3, 2], [10, 40, 50, 30], 9], "expected": [120, [1, 2, 3]], "name": "Itens (5, 10), (4, 40), (3, 50), (2, 30) e capacidade 9: (120, [1, 2, 3])"},
  {"id": "trinta-valor", "checkpoint": 1, "kind": "expr", "expr": "mochila([(i * 37) % 23 + 3 for i in range(30)], [(i * 53) % 41 + 5 for i in range(30)], 100)[0]", "expected": 377, "name": "30 itens e capacidade 100: valor 377"},
  {"id": "trinta-itens-validos", "checkpoint": 2, "kind": "expr", "setup": "def _valida(pesos, valores, capacidade, r):\n    valor, itens = r\n    return (itens == sorted(set(itens)) and all(0 <= i < len(pesos) for i in itens)\n            and sum(pesos[i] for i in itens) <= capacidade and sum(valores[i] for i in itens) == valor)\np, v = [(i * 37) % 23 + 3 for i in range(30)], [(i * 53) % 41 + 5 for i in range(30)]\nr = mochila(p, v, 100)", "expr": "_valida(p, v, 100, r)", "expected": true, "name": "30 itens: os índices devolvidos existem, não se repetem, cabem e somam o valor", "hint": "Confira a coluna em que a comparação continua depois que um item entra."},
  {"id": "sessenta-linhas", "checkpoint": 1, "kind": "expr", "setup": "def _valida(pesos, valores, capacidade, r):\n    valor, itens = r\n    return (itens == sorted(set(itens)) and all(0 <= i < len(pesos) for i in itens)\n            and sum(pesos[i] for i in itens) <= capacidade and sum(valores[i] for i in itens) == valor)\np, v = [(i * 31) % 47 + 4 for i in range(60)], [(i * 17) % 59 + 3 for i in range(60)]\nimport sys\nclass _Limite(BaseException):\n    pass\n_n = [0]\ndef _t(quadro, evento, arg):\n    if evento == 'line':\n        _n[0] += 1\n        if _n[0] > 250000:\n            raise _Limite()\n    return _t\nsys.settrace(_t)\ntry:\n    r = mochila(p, v, 400)\nexcept _Limite:\n    r = None\nfinally:\n    sys.settrace(None)", "expr": "r is not None and r[0] == 1011 and _valida(p, v, 400, r)", "expected": true, "name": "60 itens e capacidade 400: valor 1 011, com no máximo 250 000 linhas executadas", "hint": "Testar todos os subconjuntos de 60 itens é inviável; a tabela tem 61 × 401 posições."}
]
```

### Soluções erradas
```python name="guloso pela razão valor/peso"
def mochila(pesos, valores, capacidade):
    ordem = sorted(range(len(pesos)), key=lambda i: valores[i] / pesos[i], reverse=True)
    itens = []
    livre = capacidade
    total = 0
    for i in ordem:
        if pesos[i] <= livre:
            itens.append(i)
            livre -= pesos[i]
            total += valores[i]
    return total, sorted(itens)
```
```python name="reconstrói comparando com a coluna ao lado"
def mochila(pesos, valores, capacidade):
    n = len(pesos)
    dp = [[0] * (capacidade + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        p, v = pesos[i - 1], valores[i - 1]
        for w in range(capacidade + 1):
            dp[i][w] = dp[i - 1][w]
            if p <= w and dp[i - 1][w - p] + v > dp[i][w]:
                dp[i][w] = dp[i - 1][w - p] + v
    itens = []
    w = capacidade
    for i in range(n, 0, -1):
        if w > 0 and dp[i][w] != dp[i][w - 1]:
            itens.append(i - 1)
            w -= pesos[i - 1]
    itens.reverse()
    return dp[n][capacidade], itens
```
```python name="não desconta o peso na volta"
def mochila(pesos, valores, capacidade):
    n = len(pesos)
    dp = [[0] * (capacidade + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        p, v = pesos[i - 1], valores[i - 1]
        for w in range(capacidade + 1):
            dp[i][w] = dp[i - 1][w]
            if p <= w and dp[i - 1][w - p] + v > dp[i][w]:
                dp[i][w] = dp[i - 1][w - p] + v
    itens = []
    w = capacidade
    for i in range(n, 0, -1):
        if dp[i][w] != dp[i - 1][w]:
            itens.append(i - 1)
    itens.reverse()
    return dp[n][capacidade], itens
```
```python name="sem a linha 0: dp[i - 1] com i = 0 lê a última linha"
def mochila(pesos, valores, capacidade):
    n = len(pesos)
    dp = [[0] * (capacidade + 1) for _ in range(n)]
    for i in range(n):
        p, v = pesos[i], valores[i]
        for w in range(capacidade + 1):
            dp[i][w] = dp[i - 1][w]
            if p <= w and dp[i - 1][w - p] + v > dp[i][w]:
                dp[i][w] = dp[i - 1][w - p] + v
    itens = []
    w = capacidade
    for i in range(n - 1, -1, -1):
        if dp[i][w] != dp[i - 1][w]:
            itens.append(i)
            w -= pesos[i]
    itens.reverse()
    return dp[n - 1][capacidade], itens
```
```python name="reconstrói pela linha única da versão 1D"
def mochila(pesos, valores, capacidade):
    melhor = [0] * (capacidade + 1)
    for i in range(len(pesos)):
        for w in range(capacidade, pesos[i] - 1, -1):
            melhor[w] = max(melhor[w], melhor[w - pesos[i]] + valores[i])
    itens = []
    w = capacidade
    for i in range(len(pesos) - 1, -1, -1):
        p = pesos[i]
        if p <= w and melhor[w] == melhor[w - p] + valores[i]:
            itens.append(i)
            w -= p
    itens.reverse()
    return melhor[capacidade], itens
```
```python name="itens na ordem da volta"
def mochila(pesos, valores, capacidade):
    n = len(pesos)
    dp = [[0] * (capacidade + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        p, v = pesos[i - 1], valores[i - 1]
        for w in range(capacidade + 1):
            dp[i][w] = dp[i - 1][w]
            if p <= w and dp[i - 1][w - p] + v > dp[i][w]:
                dp[i][w] = dp[i - 1][w - p] + v
    itens = []
    w = capacidade
    for i in range(n, 0, -1):
        if dp[i][w] != dp[i - 1][w]:
            itens.append(i - 1)
            w -= pesos[i - 1]
    return dp[n][capacidade], itens
```
```python name="força bruta testando todos os subconjuntos"
def mochila(pesos, valores, capacidade):
    n = len(pesos)

    def melhor(i, livre):
        if i == n:
            return 0, []
        sem = melhor(i + 1, livre)
        if pesos[i] <= livre:
            valor, resto = melhor(i + 1, livre - pesos[i])
            if valor + valores[i] > sem[0]:
                return valor + valores[i], [i] + resto
        return sem

    return melhor(0, capacidade)
```

## Passo 5 · Leitura · Kadane e a subsequência crescente

**Soma máxima de subarranjo.** Dada uma lista de inteiros, qual trecho contíguo tem a maior soma? O estado bom é "a melhor soma de um trecho que **termina** em $i$". Ou o trecho começa em $i$, ou estende o melhor que terminava em $i - 1$:

$$
e_i = \max(x_i,\; e_{i-1} + x_i), \qquad \text{resposta} = \max_i e_i .
$$

Cada $e_i$ só usa $e_{i-1}$: uma variável basta, e o algoritmo de **Kadane** faz uma passada, $O(n)$ e memória $O(1)$. Para saber os índices, anote onde o trecho atual começou quando ele recomeça em $x_i$, e onde estava o melhor. Dois erros clássicos: começar o melhor em 0, que devolve 0 numa lista só de negativos, onde a resposta é o maior elemento; e escrever $e_i = \max(0, e_{i-1} + x_i)$, que tem o mesmo defeito.

**Subsequência crescente mais longa (LIS).** Agora os elementos não precisam ser vizinhos, só manter a ordem. A DP direta tem estado "a maior crescente que termina em $i$": $L_i = 1 + \max\{L_j : j < i,\ x_j < x_i\}$, com custo $O(n^2)$. Guardando em `anterior[i]` o $j$ que deu o máximo, a subsequência sai de trás para a frente.

Há um jeito $O(n \log n)$. Mantenha `caudas`, em que `caudas[k]` é o **menor final possível** de uma crescente de tamanho $k + 1$ vista até agora. Essa lista é sempre crescente, e cada $x$ substitui a primeira cauda maior ou igual a ele (ou entra no fim), posição que `bisect_left` acha em $O(\log n)$. Use `bisect_right` e duas cópias do mesmo valor passam a contar como crescentes.

O tamanho de `caudas` é o tamanho da LIS, mas **`caudas` não é a LIS**: as substituições misturam elementos de subsequências diferentes. Para reconstruir, guarde o **índice** de cada cauda e, para cada elemento, o índice da cauda anterior no momento em que ele entrou.

## Passo 6 · Previsão · As caudas da LIS

O programa mostra a lista `caudas` depois de cada elemento. Leia sem executar e digite a saída exata.

### Código
```python
from bisect import bisect_left

v = [3, 1, 4, 1, 5, 9, 2, 6]
caudas = []
for x in v:
    k = bisect_left(caudas, x)
    if k == len(caudas):
        caudas.append(x)
    else:
        caudas[k] = x
    print(x, caudas)
print(len(caudas))
```

### Dicas
1. `bisect_left(caudas, x)` é a posição do primeiro elemento maior ou igual a `x`.
2. O segundo 1 encontra um 1 igual a ele na posição 0.
3. Quando o 2 chega, quem ele substitui?

### Saída esperada
```text
3 [3]
1 [1]
4 [1, 4]
1 [1, 4]
5 [1, 4, 5]
9 [1, 4, 5, 9]
2 [1, 2, 5, 9]
6 [1, 2, 5, 6]
4
```

## Passo 7 · Exercício · Kadane com índices e LIS em O(n log n)

Duas funções sobre listas de inteiros.

- `soma_maxima_subarranjo(v)` recebe uma lista **não vazia** e devolve `(soma, inicio, fim)`: a maior soma de um trecho contíguo `v[inicio:fim + 1]`. Em empate, qualquer trecho de soma máxima vale.
- `lis(v)` devolve uma subsequência **estritamente** crescente de tamanho máximo, como lista de valores; `[]` para a lista vazia. Em empate, qualquer uma vale.

A verificação limita o trabalho: Kadane em 5 000 elementos com no máximo 60 000 linhas executadas, e `lis` em 3 000 elementos com no máximo 60 000 comparações entre elementos.

### Instruções
1. Em `soma_maxima_subarranjo`, mantenha a melhor soma terminando na posição atual e onde esse trecho começou.
   Dica: numa lista só de negativos, a resposta é o maior elemento sozinho.
2. Em `lis`, mantenha as caudas com `bisect_left`, guardando o índice de cada cauda e o anterior de cada elemento.
3. Reconstrua a subsequência a partir do índice da última cauda.

### Código inicial
```python
from bisect import bisect_left


def soma_maxima_subarranjo(v):
    pass


def lis(v):
    pass
```

### Solução
```python
from bisect import bisect_left


def soma_maxima_subarranjo(v):
    atual, comeco = v[0], 0
    melhor, inicio, fim = v[0], 0, 0
    for i in range(1, len(v)):
        if atual < 0:
            atual, comeco = v[i], i
        else:
            atual += v[i]
        if atual > melhor:
            melhor, inicio, fim = atual, comeco, i
    return melhor, inicio, fim


def lis(v):
    caudas = []
    indice_da_cauda = []
    anterior = [-1] * len(v)
    for i, x in enumerate(v):
        k = bisect_left(caudas, x)
        if k > 0:
            anterior[i] = indice_da_cauda[k - 1]
        if k == len(caudas):
            caudas.append(x)
            indice_da_cauda.append(i)
        else:
            caudas[k] = x
            indice_da_cauda[k] = i
    resposta = []
    i = indice_da_cauda[-1] if indice_da_cauda else -1
    while i != -1:
        resposta.append(v[i])
        i = anterior[i]
    resposta.reverse()
    return resposta
```

### Dicas
1. Em Kadane, recomeçar o trecho só vale a pena quando a soma acumulada é negativa.
2. Em `lis`, o anterior de um elemento que entra na posição `k` é o elemento que ocupa a posição `k - 1` naquele momento.
3. A lista `caudas` tem o tamanho certo, mas não é a resposta: siga os anteriores a partir da última cauda.

### Verificação
```json
[
  {"id": "kadane-classico", "checkpoint": 1, "kind": "call", "function": "soma_maxima_subarranjo", "args": [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], "expected": [6, 3, 6], "name": "[-2, 1, -3, 4, -1, 2, 1, -5, 4]: (6, 3, 6)"},
  {"id": "kadane-negativos", "checkpoint": 1, "kind": "call", "function": "soma_maxima_subarranjo", "args": [[-3, -1, -2]], "expected": [-1, 1, 1], "name": "Só negativos: o maior elemento sozinho, (-1, 1, 1)", "hint": "Um trecho tem pelo menos um elemento; a soma 0 não está disponível."},
  {"id": "kadane-um", "checkpoint": 1, "kind": "call", "function": "soma_maxima_subarranjo", "args": [[5]], "expected": [5, 0, 0], "name": "Um elemento: (5, 0, 0)"},
  {"id": "kadane-positivos", "checkpoint": 1, "kind": "call", "function": "soma_maxima_subarranjo", "args": [[1, 2, 3]], "expected": [6, 0, 2], "name": "Só positivos: a lista inteira"},
  {"id": "kadane-recomeca", "checkpoint": 1, "kind": "call", "function": "soma_maxima_subarranjo", "args": [[-5, 3, 4]], "expected": [7, 1, 2], "name": "[-5, 3, 4]: o trecho recomeça no 3, (7, 1, 2)", "hint": "Ao recomeçar, o início do trecho muda."},
  {"id": "kadane-grande", "checkpoint": 1, "kind": "expr", "setup": "v = [((i * 7919) % 201) - 100 for i in range(5000)]\nimport sys\nclass _Limite(BaseException):\n    pass\n_n = [0]\ndef _t(quadro, evento, arg):\n    if evento == 'line':\n        _n[0] += 1\n        if _n[0] > 60000:\n            raise _Limite()\n    return _t\nsys.settrace(_t)\ntry:\n    r = soma_maxima_subarranjo(v)\nexcept _Limite:\n    r = None\nfinally:\n    sys.settrace(None)", "expr": "r is not None and r[0] == 591 and sum(v[r[1]:r[2] + 1]) == r[0]", "expected": true, "name": "5 000 elementos com no máximo 60 000 linhas: soma certa e índices que a confirmam", "hint": "Somar todos os trechos são mais de 12 milhões de passos; uma passada basta."},
  {"id": "lis-exemplo-tamanho", "checkpoint": 2, "kind": "expr", "expr": "len(lis([3, 1, 4, 1, 5, 9, 2, 6]))", "expected": 4, "name": "LIS de [3, 1, 4, 1, 5, 9, 2, 6] tem 4 elementos"},
  {"id": "lis-exemplo-valida", "checkpoint": 3, "kind": "expr", "setup": "def _valida(r, v):\n    it = iter(v)\n    return all(x in it for x in r) and all(a < b for a, b in zip(r, r[1:]))\nv = [3, 1, 4, 1, 5, 9, 2, 6]", "expr": "_valida(lis(v), v)", "expected": true, "name": "A LIS de [3, 1, 4, 1, 5, 9, 2, 6] é uma subsequência estritamente crescente", "hint": "A lista de caudas não é necessariamente uma subsequência."},
  {"id": "lis-caudas", "checkpoint": 3, "kind": "call", "function": "lis", "args": [[3, 4, 1]], "expected": [3, 4], "name": "lis([3, 4, 1]) é [3, 4]", "hint": "No fim, as caudas são [1, 4]; o 1 vem depois do 4."},
  {"id": "lis-repetidos", "checkpoint": 2, "kind": "call", "function": "lis", "args": [[5, 5, 5]], "expected": [5], "name": "Valores iguais não formam crescente: lis([5, 5, 5]) é [5]"},
  {"id": "lis-vazia", "checkpoint": 3, "kind": "call", "function": "lis", "args": [[]], "expected": [], "type": "list", "name": "Lista vazia: []"},
  {"id": "lis-anterior", "checkpoint": 3, "kind": "call", "function": "lis", "args": [[2, 8, 3, 4]], "expected": [2, 3, 4], "name": "lis([2, 8, 3, 4]) é [2, 3, 4]", "hint": "O anterior de um elemento é a cauda da posição k - 1 quando ele entra, não o vizinho na lista."},
  {"id": "lis-comparacoes", "checkpoint": 2, "kind": "expr", "setup": "class _Limite(BaseException):\n    pass\n_n = [0]\nclass _C:\n    def __init__(self, x):\n        self.x = x\n    def _conta(self):\n        _n[0] += 1\n        if _n[0] > 60000:\n            raise _Limite()\n    def __lt__(self, o):\n        self._conta()\n        return self.x < o.x\n    def __le__(self, o):\n        self._conta()\n        return self.x <= o.x\n    def __gt__(self, o):\n        self._conta()\n        return self.x > o.x\n    def __ge__(self, o):\n        self._conta()\n        return self.x >= o.x\nv = [_C((i * 7919) % 3001) for i in range(3000)]\ntry:\n    r = lis(v)\nexcept _Limite:\n    r = None", "expr": "None if r is None else len(r)", "expected": 47, "name": "3 000 elementos com no máximo 60 000 comparações: LIS de tamanho 47", "hint": "A DP quadrática compara cerca de 4,5 milhões de pares; a busca binária nas caudas faz uns 12 por elemento."}
]
```

### Soluções erradas
```python name="Kadane começa o melhor em 0"
from bisect import bisect_left


def soma_maxima_subarranjo(v):
    atual, comeco = 0, 0
    melhor, inicio, fim = 0, 0, 0
    for i in range(len(v)):
        if atual < 0:
            atual, comeco = v[i], i
        else:
            atual += v[i]
        if atual > melhor:
            melhor, inicio, fim = atual, comeco, i
    return melhor, inicio, fim


def lis(v):
    caudas = []
    indice_da_cauda = []
    anterior = [-1] * len(v)
    for i, x in enumerate(v):
        k = bisect_left(caudas, x)
        if k > 0:
            anterior[i] = indice_da_cauda[k - 1]
        if k == len(caudas):
            caudas.append(x)
            indice_da_cauda.append(i)
        else:
            caudas[k] = x
            indice_da_cauda[k] = i
    resposta = []
    i = indice_da_cauda[-1] if indice_da_cauda else -1
    while i != -1:
        resposta.append(v[i])
        i = anterior[i]
    resposta.reverse()
    return resposta
```
```python name="Kadane não move o início ao recomeçar"
from bisect import bisect_left


def soma_maxima_subarranjo(v):
    atual, comeco = v[0], 0
    melhor, inicio, fim = v[0], 0, 0
    for i in range(1, len(v)):
        if atual < 0:
            atual = v[i]
        else:
            atual += v[i]
        if atual > melhor:
            melhor, inicio, fim = atual, comeco, i
    return melhor, inicio, fim


def lis(v):
    caudas = []
    indice_da_cauda = []
    anterior = [-1] * len(v)
    for i, x in enumerate(v):
        k = bisect_left(caudas, x)
        if k > 0:
            anterior[i] = indice_da_cauda[k - 1]
        if k == len(caudas):
            caudas.append(x)
            indice_da_cauda.append(i)
        else:
            caudas[k] = x
            indice_da_cauda[k] = i
    resposta = []
    i = indice_da_cauda[-1] if indice_da_cauda else -1
    while i != -1:
        resposta.append(v[i])
        i = anterior[i]
    resposta.reverse()
    return resposta
```
```python name="soma máxima testando todos os trechos"
from bisect import bisect_left


def soma_maxima_subarranjo(v):
    melhor, inicio, fim = v[0], 0, 0
    for i in range(len(v)):
        soma = 0
        for j in range(i, len(v)):
            soma += v[j]
            if soma > melhor:
                melhor, inicio, fim = soma, i, j
    return melhor, inicio, fim


def lis(v):
    caudas = []
    indice_da_cauda = []
    anterior = [-1] * len(v)
    for i, x in enumerate(v):
        k = bisect_left(caudas, x)
        if k > 0:
            anterior[i] = indice_da_cauda[k - 1]
        if k == len(caudas):
            caudas.append(x)
            indice_da_cauda.append(i)
        else:
            caudas[k] = x
            indice_da_cauda[k] = i
    resposta = []
    i = indice_da_cauda[-1] if indice_da_cauda else -1
    while i != -1:
        resposta.append(v[i])
        i = anterior[i]
    resposta.reverse()
    return resposta
```
```python name="LIS devolve a lista de caudas"
from bisect import bisect_left


def soma_maxima_subarranjo(v):
    atual, comeco = v[0], 0
    melhor, inicio, fim = v[0], 0, 0
    for i in range(1, len(v)):
        if atual < 0:
            atual, comeco = v[i], i
        else:
            atual += v[i]
        if atual > melhor:
            melhor, inicio, fim = atual, comeco, i
    return melhor, inicio, fim


def lis(v):
    caudas = []
    for x in v:
        k = bisect_left(caudas, x)
        if k == len(caudas):
            caudas.append(x)
        else:
            caudas[k] = x
    return caudas
```
```python name="LIS com bisect_right aceita repetidos"
from bisect import bisect_right


def soma_maxima_subarranjo(v):
    atual, comeco = v[0], 0
    melhor, inicio, fim = v[0], 0, 0
    for i in range(1, len(v)):
        if atual < 0:
            atual, comeco = v[i], i
        else:
            atual += v[i]
        if atual > melhor:
            melhor, inicio, fim = atual, comeco, i
    return melhor, inicio, fim


def lis(v):
    caudas = []
    indice_da_cauda = []
    anterior = [-1] * len(v)
    for i, x in enumerate(v):
        k = bisect_right(caudas, x)
        if k > 0:
            anterior[i] = indice_da_cauda[k - 1]
        if k == len(caudas):
            caudas.append(x)
            indice_da_cauda.append(i)
        else:
            caudas[k] = x
            indice_da_cauda[k] = i
    resposta = []
    i = indice_da_cauda[-1] if indice_da_cauda else -1
    while i != -1:
        resposta.append(v[i])
        i = anterior[i]
    resposta.reverse()
    return resposta
```
```python name="LIS em O(n²)"
def soma_maxima_subarranjo(v):
    atual, comeco = v[0], 0
    melhor, inicio, fim = v[0], 0, 0
    for i in range(1, len(v)):
        if atual < 0:
            atual, comeco = v[i], i
        else:
            atual += v[i]
        if atual > melhor:
            melhor, inicio, fim = atual, comeco, i
    return melhor, inicio, fim


def lis(v):
    if not v:
        return []
    tamanho = [1] * len(v)
    anterior = [-1] * len(v)
    for i in range(len(v)):
        for j in range(i):
            if v[j] < v[i] and tamanho[j] + 1 > tamanho[i]:
                tamanho[i] = tamanho[j] + 1
                anterior[i] = j
    i = max(range(len(v)), key=lambda k: tamanho[k])
    resposta = []
    while i != -1:
        resposta.append(v[i])
        i = anterior[i]
    resposta.reverse()
    return resposta
```
```python name="anterior é o elemento vizinho da lista"
from bisect import bisect_left


def soma_maxima_subarranjo(v):
    atual, comeco = v[0], 0
    melhor, inicio, fim = v[0], 0, 0
    for i in range(1, len(v)):
        if atual < 0:
            atual, comeco = v[i], i
        else:
            atual += v[i]
        if atual > melhor:
            melhor, inicio, fim = atual, comeco, i
    return melhor, inicio, fim


def lis(v):
    caudas = []
    indice_da_cauda = []
    anterior = [-1] * len(v)
    for i, x in enumerate(v):
        k = bisect_left(caudas, x)
        if k > 0:
            anterior[i] = i - 1
        if k == len(caudas):
            caudas.append(x)
            indice_da_cauda.append(i)
        else:
            caudas[k] = x
            indice_da_cauda[k] = i
    resposta = []
    i = indice_da_cauda[-1] if indice_da_cauda else -1
    while i != -1:
        resposta.append(v[i])
        i = anterior[i]
    resposta.reverse()
    return resposta
```

## Passo 8 · Quiz · Tabelas na prática

### Pergunta
Um colega troca a mochila 2D pela versão de uma linha e mantém o laço `for w in range(p, W + 1)`. Com um item só, de peso 2 e valor 3, e capacidade 4, a função devolve 6. O que aconteceu?
- [ ] A lista foi criada com `[0] * W` e perdeu a última posição
- [x] Em ordem crescente, `melhor[w - p]` já foi atualizado nesta linha, então o mesmo item entrou duas vezes
- [ ] A versão de uma linha só funciona com pesos iguais a 1
- [ ] O `max` deveria ser `min`, porque a capacidade é um limite
> Com $w$ crescente, `melhor[2]` vira 3 (o item entrou) e, logo depois, `melhor[4] = melhor[2] + 3 = 6` usa esse valor novo. Isso resolve a mochila **com repetição**, em que cada item pode entrar várias vezes. Percorrendo $w$ de $W$ até $p$, `melhor[w - p]` ainda é o valor da linha anterior.

### Pergunta
Uma loja precisa do valor máximo **e** da lista de produtos de uma mochila com 500 itens e capacidade 5 000. Qual implementação atende?
- [ ] A versão de uma linha, reconstruindo pela própria lista no fim
- [ ] O guloso pela razão valor/peso, que é exato quando os itens são muitos
- [x] A tabela completa (ou a linha única mais uma tabela de escolhas), voltando de $(n, W)$ e comparando cada linha com a de cima
- [ ] A versão memoizada sem guardar nada além do valor, porque o cache já contém os itens
> A lista final da versão 1D só tem a última linha; o teste "mudou em relação à linha de cima" precisa da tabela inteira ou de um registro de qual opção venceu em cada $(i, w)$. São $501 \times 5\,001$ posições, cerca de 2,5 milhões: cabe com folga. O guloso pela razão não é exato na mochila 0/1, com qualquer número de itens.

### Pergunta
Num sistema de recomendação, você precisa da maior sequência de notas estritamente crescentes ao longo de 200 000 avaliações. A versão $O(n^2)$ não termina a tempo e você troca por `caudas` com `bisect_left`. O que devolver como resposta?
- [ ] A lista `caudas` no fim, porque ela tem o tamanho da LIS
- [x] A subsequência obtida seguindo, a partir do índice da última cauda, o anterior guardado para cada elemento
- [ ] `sorted(set(notas))`, que é crescente e não tem repetidos
- [ ] A lista `caudas` invertida
> `caudas` tem o tamanho certo, mas mistura elementos de subsequências diferentes: com 3, 1, 4, 1, 5, 9, 2, 6 ela termina em `[1, 2, 5, 6]`, e o 2 vem depois do 5 na lista original. A reconstrução precisa dos índices: para cada elemento, qual era a cauda anterior quando ele entrou.
