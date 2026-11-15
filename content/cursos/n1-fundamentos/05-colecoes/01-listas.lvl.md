---
slug: n1-m5-01-listas
titulo: Listas
descricao: 'Guardar vários valores em ordem: criar, acessar por índice, medir, acrescentar e alterar.'
dificuldade: iniciante
tipo: guiada
runtime: python
bibliotecas: []
xp: 100
tempo_min: 40
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Criar listas, acessar elementos por índice positivo e negativo e alterar posições
- Usar len(), append() e in e prever IndexError
- Explicar que uma lista pode mudar (mutável) e o que isso implica
---

## Passo 1 · Leitura · Vários valores em uma variável

Até aqui cada variável guardava um valor só. Para guardar as notas de uma turma inteira você precisaria de `nota1`, `nota2`, `nota3`... A **lista** resolve isso: é uma sequência de valores, em ordem, guardada em uma única variável. Ela se escreve entre colchetes, com os itens separados por vírgula:

```python
compras = ["pão", "queijo", "suco", "café"]
vazia = []
```

Cada item tem uma posição, o **índice**, e a contagem começa em **0**. Índices negativos contam a partir do fim: `-1` é o último item.

| Item | `"pão"` | `"queijo"` | `"suco"` | `"café"` |
|---|---|---|---|---|
| Índice positivo | 0 | 1 | 2 | 3 |
| Índice negativo | -4 | -3 | -2 | -1 |

```python
print(compras[0])         # pão (o primeiro)
print(compras[-1])        # café (o último)
print(len(compras))       # 4: len() conta os itens
print("suco" in compras)  # True: in pergunta se o valor está na lista
```

Repare: a lista tem 4 itens, mas o último índice é 3. Pedir uma posição que não existe, como `compras[4]`, interrompe o programa com `IndexError: list index out of range` (índice fora do intervalo da lista).

Uma lista é **mutável**: pode mudar depois de criada. Há duas mudanças básicas.

```python
compras.append("leite")       # acrescenta um item ao fim
compras[0] = "pão integral"   # troca o item da posição 0
```

`append` é um **método**: uma função que pertence à lista e é chamada com um ponto depois do nome dela. Ele altera a própria lista e não devolve nada. Por isso **não** escreva `compras = compras.append("leite")`: a variável passaria a guardar `None` (o valor que representa "nada") e a lista se perderia.

Ser mutável tem uma consequência: quem altera a lista altera a única lista que existe. Não fica guardada uma versão "de antes".

Execute o programa abaixo passo a passo com o botão "Visualizar". Veja a lista crescer no `append` e a posição 0 mudar na linha seguinte:

```python visualizar
compras = ["pão", "queijo", "suco"]
compras.append("leite")
compras[0] = "pão integral"
ultimo = compras[-1]
print(len(compras), ultimo)
```

## Passo 2 · Previsão · Índices

Leia o programa sem executar e digite exatamente o que ele imprime, uma linha de saída por linha da resposta.

### Código
```python
letras = ["a", "b", "c", "d"]
print(letras[0])
print(letras[-1])
print(len(letras))
letras[1] = "z"
print(letras)
print("c" in letras)
```

### Dicas
1. O primeiro índice é 0, não 1.
2. O índice `-1` é o último item da lista.
3. Uma lista impressa com `print` aparece com colchetes, aspas simples nos textos e vírgula seguida de espaço entre os itens.

### Saída esperada
```text
a
d
4
['a', 'z', 'c', 'd']
True
```

## Passo 3 · Exercício · Lista de compras
modo: lacunas

A lista de compras da república começa com três itens. Complete as três lacunas (`___`) para atualizá-la. No fim, a lista deve ser `["arroz", "lentilha", "café", "leite"]` e o programa deve imprimir:

```
leite
```

### Instruções
1. Acrescente `"leite"` ao fim da lista.
   Dica: é o método que você viu na leitura, chamado com ponto depois do nome da lista.
2. Troque o **segundo** item da lista por `"lentilha"`.
   Dica: a contagem dos índices começa em 0.
3. Imprima o último item da lista usando um índice negativo.

### Código inicial
```python
compras = ["arroz", "feijão", "café"]
compras.___("leite")
compras[___] = "lentilha"
print(compras[___])
```

### Solução
```python
compras = ["arroz", "feijão", "café"]
compras.append("leite")
compras[1] = "lentilha"
print(compras[-1])
```

### Dicas
1. O método que acrescenta um item ao fim da lista é `append`.
2. O segundo item tem índice 1, porque o primeiro tem índice 0.
3. O último item é o de índice `-1`, qualquer que seja o tamanho da lista.

### Verificação
```json
[
  { "id": "acrescenta-leite", "checkpoint": 1, "kind": "expr", "expr": "[len(compras), compras[-1]]", "expected": [4, "leite"],
    "name": "A lista termina com 4 itens e leite no fim", "hint": "Use o método que acrescenta ao fim; ele não precisa de atribuição." },
  { "id": "troca-segundo", "checkpoint": 2, "kind": "variable", "variable": "compras", "expected": ["arroz", "lentilha", "café", "leite"], "type": "list",
    "name": "A lista final é arroz, lentilha, café, leite", "hint": "Confira qual índice corresponde ao segundo item: o feijão é quem sai." },
  { "id": "imprime-ultimo", "checkpoint": 3, "kind": "io", "stdin": "", "expected_stdout": "leite",
    "name": "Imprime o último item", "hint": "O programa imprime uma linha só: o item que está no fim da lista." }
]
```

### Soluções erradas
```python name="índice 2 no lugar de 1 (troca o terceiro item)"
compras = ["arroz", "feijão", "café"]
compras.append("leite")
compras[2] = "lentilha"
print(compras[-1])
```
```python name="guarda o retorno do append (a lista vira None)"
compras = ["arroz", "feijão", "café"]
compras = compras.append("leite")
compras[1] = "lentilha"
print(compras[-1])
```
```python name="imprime o primeiro item em vez do último"
compras = ["arroz", "feijão", "café"]
compras.append("leite")
compras[1] = "lentilha"
print(compras[0])
```

## Passo 4 · Exercício · Último e primeiro

Agora você escreve uma função, a "receita com nome que devolve um valor" que você já usou nos módulos anteriores. A função `ultimo_e_primeiro(lista)` recebe uma lista com pelo menos um item e devolve uma **lista nova com dois itens**: o último da lista recebida e, depois, o primeiro.

| Chamada | Devolve |
|---|---|
| `ultimo_e_primeiro([1, 2, 3])` | `[3, 1]` |
| `ultimo_e_primeiro(["a", "b"])` | `["b", "a"]` |
| `ultimo_e_primeiro([7])` | `[7, 7]` |

Na lista de um item só, o último e o primeiro são o mesmo item.

### Instruções
1. Dentro da função, pegue o último item da lista com um índice que funcione para qualquer tamanho.
   Dica: índices negativos contam a partir do fim.
2. Devolva com `return` uma lista de dois itens: primeiro o último, depois o primeiro.

### Código inicial
```python
def ultimo_e_primeiro(lista):
    # Devolva uma lista com o último e o primeiro item, nessa ordem
    pass
```

### Solução
```python
def ultimo_e_primeiro(lista):
    ultimo = lista[-1]
    primeiro = lista[0]
    return [ultimo, primeiro]
```

### Dicas
1. `lista[-1]` é o último item e `lista[0]` é o primeiro, em uma lista de qualquer tamanho.
2. Monte a resposta com colchetes: os dois valores, separados por vírgula, na ordem pedida.
3. A última linha da função é `return [lista[-1], lista[0]]`.

### Verificação
```json
[
  { "id": "ultimo-de-5", "checkpoint": 1, "kind": "expr", "expr": "ultimo_e_primeiro([4, 8, 15, 16, 23])[0]", "expected": 23,
    "name": "O primeiro item da resposta é o último da lista", "hint": "O último índice de uma lista de 5 itens é 4; com índice negativo você não precisa fazer essa conta." },
  { "id": "tres-itens", "checkpoint": 2, "kind": "call", "function": "ultimo_e_primeiro", "args": [[1, 2, 3]], "expected": [3, 1], "type": "list",
    "name": "ultimo_e_primeiro([1, 2, 3]) é [3, 1]", "hint": "Confira a ordem: o último vem antes do primeiro." },
  { "id": "textos", "checkpoint": 2, "kind": "call", "function": "ultimo_e_primeiro", "args": [["a", "b"]], "expected": ["b", "a"], "type": "list",
    "name": "ultimo_e_primeiro([\"a\", \"b\"]) é [\"b\", \"a\"]" },
  { "id": "borda-um-item", "checkpoint": 2, "kind": "call", "function": "ultimo_e_primeiro", "args": [[7]], "expected": [7, 7], "type": "list",
    "name": "Lista de um item: [7] vira [7, 7]", "hint": "Com um item só, o último e o primeiro são o mesmo." }
]
```

### Soluções erradas
```python name="usa lista[len(lista)] (IndexError)"
def ultimo_e_primeiro(lista):
    ultimo = lista[len(lista)]
    primeiro = lista[0]
    return [ultimo, primeiro]
```
```python name="ordem trocada: devolve [primeiro, ultimo]"
def ultimo_e_primeiro(lista):
    return [lista[0], lista[-1]]
```
```python name="índice fixo 2 para o último"
def ultimo_e_primeiro(lista):
    return [lista[2], lista[0]]
```

## Passo 5 · Quiz · Listas

### Pergunta
O que este código imprime?
```python
frutas = ["uva", "kiwi", "manga"]
print(frutas[-1])
```
- [ ] `uva`
- [x] `manga`
- [ ] `kiwi`
- [ ] Um `IndexError`, porque não existe índice negativo
> O índice `-1` é sempre o último item. Índices negativos contam a partir do fim da lista.

### Pergunta
Quanto vale `len([])`?
- [x] `0`
- [ ] `1`
- [ ] `None`
- [ ] Dá erro, porque a lista está vazia
> `len` conta os itens. Uma lista vazia existe normalmente e tem zero itens.

### Pergunta
O que acontece na última linha?
```python
notas = [7, 8, 10]
print(notas[3])
```
- [ ] Imprime `10`, o terceiro item
- [ ] Imprime `None`, porque a posição está vazia
- [x] O programa para com `IndexError: list index out of range`
- [ ] Imprime `7`, porque a contagem volta ao começo
> A lista tem 3 itens, com índices 0, 1 e 2. O índice 3 não existe, e o Python interrompe o programa com `IndexError`.

## Passo 6 · Exercício · Lendo n números
modo: ordenar

Muitas vezes a lista não vem pronta: ela começa vazia e cresce com `append` dentro de um laço. O programa deste passo lê um inteiro `n` e, em seguida, `n` números inteiros, um por linha. Ele guarda os números em uma lista e a imprime uma única vez, no fim.

Exemplo de execução, com a entrada `3`, `3`, `5` e `8` (uma por linha):

```
[3, 5, 8]
```

Arraste as linhas para a ordem certa e ajuste a indentação de cada uma. Uma linha está sobrando: ela não faz parte da resposta.

### Instruções
1. Leia `n` e crie a lista `numeros` vazia, antes do laço.
2. Repita `n` vezes: leia um valor, converta para inteiro e acrescente à lista.
3. Imprima a lista depois do laço, uma vez só.

### Solução
```python
n = int(input())
numeros = []
for i in range(n):
    numero = int(input())
    numeros.append(numero)
print(numeros)
```

### Distratores
```python
numeros.append(input())
```

### Dicas
1. A lista nasce vazia antes do laço. Se ela fosse criada dentro dele, seria esvaziada a cada volta.
2. `input()` devolve texto: a conversão com `int` acontece antes do `append`.
3. Só as duas linhas que leem e guardam o número ficam indentadas sob o `for`; o `print` fica fora.

### Verificação
```json
[
  { "id": "le-um", "checkpoint": 1, "kind": "io", "stdin": "1\n-4\n", "expected_stdout": "[-4]",
    "name": "Com n = 1 e o número -4, imprime [-4]", "hint": "n é lido primeiro e a lista começa vazia." },
  { "id": "le-tres", "checkpoint": 2, "kind": "io", "stdin": "3\n3\n5\n8\n", "expected_stdout": "[3, 5, 8]",
    "name": "Com 3, 5 e 8, imprime [3, 5, 8]", "hint": "Os itens são inteiros (sem aspas na saída) e a lista aparece uma vez só." },
  { "id": "le-quatro", "checkpoint": 3, "kind": "io", "stdin": "4\n10\n0\n7\n7\n", "expected_stdout": "[10, 0, 7, 7]",
    "name": "Com quatro números, imprime a lista completa no fim", "hint": "O print fica depois do laço, sem indentação." }
]
```

### Soluções erradas
```python name="guarda textos em vez de inteiros"
n = int(input())
numeros = []
for i in range(n):
    numeros.append(input())
print(numeros)
```
```python name="print dentro do laço"
n = int(input())
numeros = []
for i in range(n):
    numero = int(input())
    numeros.append(numero)
    print(numeros)
```
```python name="lista criada dentro do laço"
n = int(input())
for i in range(n):
    numeros = []
    numero = int(input())
    numeros.append(numero)
print(numeros)
```
