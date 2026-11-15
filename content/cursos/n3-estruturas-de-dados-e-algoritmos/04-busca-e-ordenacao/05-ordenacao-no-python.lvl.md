---
slug: n3-m4-05-ordenacao-no-python
titulo: 'Ordenação no Python: sorted, key, estabilidade e Timsort'
descricao: Ordenar por múltiplos critérios com key e tuplas, inverter só um critério, functools.cmp_to_key e por que Timsort é rápido em dados reais.
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
  - Ordenar listas de registros por vários critérios, mistos crescente/decrescente, com key
  - Explorar a estabilidade para ordenações encadeadas
  - Descrever o Timsort (runs, galloping) e quando ele é O(n)
---

## Passo 1 · Leitura · `sorted` vs `.sort()`, tuplas em `key` e o Timsort

Em Python, existem duas ferramentas embutidas de ordenação:
- **`sorted(iteravel, key=..., reverse=...)`:** aceita qualquer iterável (`list`, `tuple`, `set`, `dict`), **não altera** o original e devolve uma **nova lista** ordenada ($\Theta(n)$ de memória para a nova lista).
- **`lista.sort(key=..., reverse=...)`:** método exclusivo de `list`, ordena a própria lista **in-place** e devolve **`None`** (um erro clássico é fazer `x = lista.sort()` e perder a lista!).

#### Como funciona o parâmetro `key` (Transformada de Schwartz)

Quando passamos `key=funcao`, o Python **não** chama `funcao` a cada comparação ($n \log n$ vezes)! Em vez disso, ele aplica a **Transformada de Schwartz (*decorate-sort-undecorate*)**:
1. Calcula a chave `k = funcao(x)` **uma única vez** para cada um dos $n$ elementos;
2. Ordena os pares `(k, posicao_original, x)` em C;
3. Extrai os elementos `x` na ordem final.

Como tuplas em Python são comparadas **elemento por elemento da esquerda para a direita** (desempatando no segundo item apenas quando o primeiro empata), podemos ordenar por **múltiplos critérios** devolvendo uma tupla na função `key`!
- Quer ordenar por **`nota` decrescente** e, em caso de empate, por **`nome` crescente**?
  Se você usar `reverse=True`, **ambos** os critérios serão invertidos (o nome ficará de Z para A!). O truque para inverter apenas um critério numérico é trocar o seu sinal:
  ```python
  sorted(alunos, key=lambda a: (-a["nota"], a[" idade"], a["nome"]))
  ```
- E quando os dois critérios são texto e um é crescente e outro decrescente? Aproveitamos que a ordenação do Python é **estável**: ordenamos primeiro pelo critério secundário (de desempate) e, em seguida, pelo critério principal!

#### Por que o Timsort é tão rápido em dados do mundo real?

O algoritmo oficial do Python — **Timsort**, criado por Tim Peters em 2002 — é um híbrido adaptativo de **Merge Sort** e **Insertion Sort**:
1. Ele varre a lista procurando **trechos já ordenados naturalmente (*runs*)**, crescentes ou estritamente decrescentes (que ele inverte *in-place*).
2. Se um *run* tiver menos de 32–64 elementos, ele o estende usando **Insertion Sort binário**.
3. Ele empilha os *runs* e os intercala de forma equilibrada (usando um modo *galloping* com busca exponencial quando um *run* ganha muitas vezes seguidas).

Resultado: em listas aleatórias o Timsort é $\Theta(n \log n)$, mas em dados reais parcialmente ordenados (ou já ordenados) ele faz apenas **$\Theta(n)$ comparações**!

## Passo 2 · Exercício · Múltiplos critérios com `key`: alunos, versões semânticas e frequência

Implemente três funções usando `sorted(..., key=...)`:
1. `ordenar_alunos(alunos)`: recebe uma lista de dicionários `{"nome": str, "nota": float, "idade": int}` e devolve uma nova lista ordenada por **`nota` decrescente**, desempatando por **`idade` crescente** e, por fim, por **`nome` em ordem alfabética crescente**.
2. `ordenar_versoes(versoes)`: recebe uma lista de strings de versão como `["1.10.2", "1.9.0", "2.0", "1.9.10"]` e devolve uma nova lista ordenada numericamente por cada componente separado por `"."` (para que `"1.9.0"` venha antes de `"1.10.2"`, ao contrário da comparação de strings pura onde `"1.10"` viria antes de `"1.9"`!).
3. `ordenar_por_frequencia(palavras)`: recebe uma lista de strings (com repetições) e devolve uma lista contendo cada palavra **distinta** ordenada da **mais frequente para a menos frequente**, desempatando em **ordem alfabética crescente**.

### Instruções
1. Em `ordenar_alunos(alunos)`, use `sorted(alunos, key=lambda a: (-a["nota"], a["idade"], a["nome"]))`.
2. Em `ordenar_versoes(versoes)`, converta cada versão `v` na tupla de inteiros `tuple(int(parte) for parte in v.split("."))` dentro do `key`.
3. Em `ordenar_por_frequencia(palavras)`, conte quantas vezes cada palavra aparece em um dicionário `contagem`, e ordene `contagem.keys()` com `key=lambda p: (-contagem[p], p)`.

### Código inicial
```python
def ordenar_alunos(alunos):
    # Ordene por nota decrescente, idade crescente e nome crescente
    pass


def ordenar_versoes(versoes):
    # Ordene strings de versão ("1.9.0" < "1.10.2") comparando os números de cada parte
    pass


def ordenar_por_frequencia(palavras):
    # Devolva as palavras distintas ordenadas por frequência decrescente e ordem alfabética crescente
    pass
```

### Solução
```python
def ordenar_alunos(alunos):
    return sorted(alunos, key=lambda a: (-a["nota"], a["idade"], a["nome"]))


def ordenar_versoes(versoes):
    return sorted(versoes, key=lambda v: tuple(int(p) for p in v.split(".")))


def ordenar_por_frequencia(palavras):
    contagem = {}
    for p in palavras:
        contagem[p] = contagem.get(p, 0) + 1
    return sorted(contagem.keys(), key=lambda p: (-contagem[p], p))
```

### Dicas
1. Nunca ordene versões fazendo apenas `sorted(versoes)`: como `'1' < '9'` em ASCII, a string `"1.10"` seria considerada menor que `"1.9"`. Converter para tupla de `int` resolve!
2. Em `ordenar_por_frequencia`, o retorno deve conter cada palavra distinta apenas uma vez (use `contagem.keys()`).

### Verificação
```json
[
  {
    "id": "alunos-multicriterio",
    "checkpoint": 1,
    "kind": "expr",
    "setup": "entrada = [\n  {'nome': 'Carlos', 'nota': 8.5, 'idade': 21},\n  {'nome': 'Ana', 'nota': 9.0, 'idade': 22},\n  {'nome': 'Bruno', 'nota': 8.5, 'idade': 20},\n  {'nome': 'Beatriz', 'nota': 8.5, 'idade': 20},\n  {'nome': 'Daniel', 'nota': 9.0, 'idade': 19}\n]",
    "expr": "[a['nome'] for a in ordenar_alunos(entrada)]",
    "expected": ["Daniel", "Ana", "Beatriz", "Bruno", "Carlos"],
    "name": "Ordena alunos por nota decrescente, idade crescente e nome crescente"
  },
  {
    "id": "versoes-semanticas",
    "checkpoint": 2,
    "kind": "call",
    "function": "ordenar_versoes",
    "args": [["1.10.2", "1.2.0", "1.9.10", "1.9.2", "2.0.0", "0.99.9"]],
    "expected": ["0.99.9", "1.2.0", "1.9.2", "1.9.10", "1.10.2", "2.0.0"],
    "name": "Ordena versões numericamente por componente ('1.9.2' < '1.9.10' < '1.10.2')"
  },
  {
    "id": "frequencia-com-desempate",
    "checkpoint": 3,
    "kind": "call",
    "function": "ordenar_por_frequencia",
    "args": [["uva", "banana", "maca", "banana", "uva", "abacaxi", "pera", "banana", "maca"]],
    "expected": ["banana", "maca", "uva", "abacaxi", "pera"],
    "name": "Ordena palavras distintas por frequência decrescente e desempate alfabético"
  }
]
```

### Soluções erradas
```python name="usa reverse=True e inverte também idade e nome"
def ordenar_alunos(alunos):
    return sorted(alunos, key=lambda a: (a["nota"], a["idade"], a["nome"]), reverse=True)


def ordenar_versoes(versoes):
    return sorted(versoes)


def ordenar_por_frequencia(palavras):
    return sorted(set(palavras))
```
```python name="compara versões como strings lexicográficas sem converter para int"
def ordenar_alunos(alunos):
    return sorted(alunos, key=lambda a: (-a["nota"], a["idade"], a["nome"]))


def ordenar_versoes(versoes):
    return sorted(versoes, key=lambda v: v.split("."))


def ordenar_por_frequencia(palavras):
    contagem = {}
    for p in palavras:
        contagem[p] = contagem.get(p, 0) + 1
    return sorted(contagem.keys(), key=lambda p: (-contagem[p], p))
```

## Passo 3 · Leitura · Comparadores personalizados com `functools.cmp_to_key`

Na grande maioria dos problemas, uma função `key` é mais simples e muito mais rápida que uma função de comparação de dois argumentos `cmp(a, b)` (pois `key` roda $n$ vezes, enquanto `cmp(a, b)` roda $\Theta(n \log n)$ vezes).

Existe, porém, uma família clássica de problemas em que a relação de ordem entre dois itens `a` e `b` depende de **combinar `a` e `b` diretamente**:
- **Problema do maior número concatenado:** dada uma lista de inteiros não negativos como `[3, 30, 34, 5, 9]`, em que ordem devemos concatená-los como strings para formar o maior número possível?
  - Em ordem decrescente comum (`9, 34, 30, 5, 3`), teríamos `"3430953"`.
  - Em ordem lexicográfica decrescente de strings (`"9", "5", "34", "30", "3"`), `"30"` viria antes de `"3"`, formando `"9534303"`, mas colocar `"3"` antes de `"30"` forma **`"9534330"`** (que é maior, pois `"330" > "303"`!).

A regra exata para decidir se a string `x` deve vir antes da string `y` é comparar as duas concatenações `x + y` e `y + x`:
- Se `x + y > y + x`, `x` deve vir **antes** de `y` (o comparador devolve `-1`);
- Se `x + y < y + x`, `x` deve vir **depois** de `y` (o comparador devolve `1`);
- Se `x + y == y + x`, empatam (`0`).

A função **`functools.cmp_to_key(funcao_cmp)`** converte qualquer função `funcao_cmp(a, b)` (que devolve negativo quando `a` precede `b`, positivo quando `a` sucede `b` e `0` no empate) em uma chave compatível com `sorted(..., key=cmp_to_key(funcao_cmp))`!

## Passo 4 · Exercício · Maior número concatenado com `cmp_to_key`

Implemente `maior_numero_concatenado(numeros)`, que recebe uma lista não vazia de inteiros não negativos e devolve uma string representando o maior inteiro que pode ser formado concatenando todos eles. Use `functools.cmp_to_key`.
*(Atenção ao caso de borda: se todos os números forem `0`, como `[0, 0]`, devolva `"0"` e não `"00"`!)*

### Instruções
1. Converta todos os números da lista para strings: `partes = [str(n) for n in numeros]`.
2. Defina `comparar(x, y)`: devolva `-1` se `x + y > y + x`, `1` se `x + y < y + x` e `0` caso contrário.
3. Ordene `partes` com `sorted(partes, key=cmp_to_key(comparar))`, junte com `"".join(...)` e trate o caso em que o resultado começa com `"0"` devolvendo `"0"`.

### Código inicial
```python
from functools import cmp_to_key


def maior_numero_concatenado(numeros):
    # Ordene os números como strings usando cmp_to_key para formar o maior número concatenado
    pass
```

### Solução
```python
from functools import cmp_to_key


def maior_numero_concatenado(numeros):
    partes = [str(n) for n in numeros]

    def comparar(x, y):
        if x + y > y + x:
            return -1
        if x + y < y + x:
            return 1
        return 0

    ordenadas = sorted(partes, key=cmp_to_key(comparar))
    resultado = "".join(ordenadas)
    if resultado[0] == "0":
        return "0"
    return resultado
```

### Dicas
1. Na convenção de `cmp_to_key`, retornar `-1` significa que `x` deve ficar **à esquerda** de `y` na lista ordenada. Como queremos o maior número primeiro, retornamos `-1` quando `x + y > y + x`.
2. Se o primeiro caractere após ordenar for `"0"`, significa que todos os números da lista eram `0`, logo a resposta é `"0"`.

### Verificação
```json
[
  {
    "id": "usa-cmp-to-key",
    "checkpoint": 2,
    "kind": "source",
    "rule": { "type": "calls", "name": "cmp_to_key" },
    "name": "Utiliza functools.cmp_to_key"
  },
  {
    "id": "concatenado-classico",
    "checkpoint": 2,
    "kind": "call",
    "function": "maior_numero_concatenado",
    "args": [[3, 30, 34, 5, 9]],
    "expected": "9534330",
    "name": "maior_numero_concatenado([3, 30, 34, 5, 9]) devolve '9534330' ('3' antes de '30')"
  },
  {
    "id": "concatenado-prefixos",
    "checkpoint": 3,
    "kind": "expr",
    "expr": "[maior_numero_concatenado([10, 2]), maior_numero_concatenado([12, 121]), maior_numero_concatenado([0, 0, 0])]",
    "expected": ["210", "12121", "0"],
    "name": "Trata prefixos ('12' antes de '121' -> '12121') e lista de zeros ('0')"
  }
]
```

### Soluções erradas
```python name="ordena strings lexicograficamente sem comparar x+y com y+x"
from functools import cmp_to_key


def maior_numero_concatenado(numeros):
    def cmp(x, y):
        return -1 if x > y else (1 if x < y else 0)
    res = "".join(sorted((str(n) for n in numeros), key=cmp_to_key(cmp)))
    return "0" if res[0] == "0" else res
```
```python name="devolve '000' quando todos os números são zero"
from functools import cmp_to_key


def maior_numero_concatenado(numeros):
    def cmp(x, y):
        return -1 if x + y > y + x else (1 if x + y < y + x else 0)
    return "".join(sorted((str(n) for n in numeros), key=cmp_to_key(cmp)))
```

## Passo 5 · Quiz · `sorted`, `key`, estabilidade e Timsort

### Pergunta
O que o código abaixo imprime?
```python
valores = [3, 1, 2]
resultado = valores.sort()
print(resultado)
```
- [ ] `[1, 2, 3]`
- [ ] `[3, 1, 2]`
- [x] `None`, porque `.sort()` ordena a lista *in-place* e devolve `None` por convenção da biblioteca padrão do Python para deixar claro que nenhuma nova lista foi criada.
- [ ] Levanta `TypeError`.
> Em Python, métodos que modificam uma estrutura mutável *in-place* (como `lista.sort()`, `lista.reverse()`, `lista.append()`) devolvem `None`. Quando você precisar de uma nova lista em uma expressão, use `sorted(valores)`.

### Pergunta
Você tem uma função `calcular_score(item)` que demora $1\text{ ms}$ para rodar e precisa ordenar uma lista de $1\,000$ itens. Quantas vezes `calcular_score` é chamada em `sorted(itens, key=calcular_score)` versus se ela fosse chamada dentro de um comparador `cmp_to_key`?
- [ ] Cerca de $10\,000$ vezes nos dois casos.
- [x] Exatamente $1\,000$ vezes ($n$) com `key=calcular_score` (uma vez por elemento antes de ordenar), contra cerca de $2 \times 10\,000$ vezes ($\Theta(n \log n)$) se chamada para os dois argumentos a cada comparação!
- [ ] $1\,000\,000$ de vezes ($n^2$) nos dois casos.
- [ ] Apenas $1$ vez nos dois casos.
> Essa é a grande vantagem da Transformada de Schwartz implementada pelo parâmetro `key`: a função de extração de chave é avaliada exatamente $n$ vezes!
