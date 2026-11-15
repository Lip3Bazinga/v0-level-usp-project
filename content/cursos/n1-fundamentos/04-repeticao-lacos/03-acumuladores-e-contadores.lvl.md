---
slug: n1-m4-03-acumuladores-e-contadores
titulo: Acumuladores e contadores
descricao: Somar, contar, calcular média e encontrar o maior valor com uma variável que acumula a cada volta.
dificuldade: iniciante
tipo: guiada
runtime: python
bibliotecas: []
xp: 110
tempo_min: 45
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Implementar somatório, contagem e média com acumuladores inicializados corretamente
- Encontrar o maior e o menor valor de uma sequência sem usar max() e min()
- Explicar onde inicializar o acumulador e por que
---

## Passo 1 · Leitura · Guardar entre uma volta e outra

Cada volta de um laço enxerga um valor por vez. Para responder perguntas sobre o conjunto ("quanto dá a soma?", "quantos são?", "qual é a média?"), o programa precisa de uma variável que **guarda o resultado parcial** entre uma volta e outra. Essa variável é o **acumulador**.

Nos exemplos deste módulo, os valores vêm de uma **lista**: vários valores entre colchetes, separados por vírgula. Por enquanto basta saber que o `for` percorre a lista entregando um valor por volta.

```python
notas = [7, 8, 7.5]
total = 0              # 1. nasce antes do laço
for nota in notas:
    total += nota      # 2. muda a cada volta
print(total)           # 3. é usado depois do laço: 22.5
```

O padrão tem sempre três momentos: **inicializar antes** do laço, **atualizar dentro**, **usar depois**.

Um **contador** é um acumulador que soma sempre 1: ele responde "quantas vezes?". Com a soma e a contagem você calcula a **média**, que é a soma dos valores dividida pela quantidade deles:

$$
\bar{x} = \frac{x_1 + x_2 + \dots + x_n}{n}
$$

Para as notas 7, 8 e 7,5: $\frac{7 + 8 + 7{,}5}{3} = \frac{22{,}5}{3} = 7{,}5$. No visualizador, veja `total` e `contador` crescerem a cada volta:

```python visualizar
notas = [7, 8, 7.5]
total = 0
contador = 0
for nota in notas:
    total += nota
    contador += 1
print(total / contador)
```

| Volta | `nota` | `total` depois | `contador` depois |
|---|---|---|---|
| (antes) | — | 0 | 0 |
| 1 | 7 | 7 | 1 |
| 2 | 8 | 15 | 2 |
| 3 | 7.5 | 22.5 | 3 |

#### Por que antes do laço?

Por dois motivos. Primeiro, `total += nota` significa `total = total + nota`: para calcular o lado direito, `total` já precisa existir. Sem a inicialização, o Python para com `NameError: name 'total' is not defined`. Segundo, o que está dentro do bloco roda em **toda** volta. Uma inicialização ali dentro apagaria o resultado parcial a cada volta.

Um cuidado com a média: se não houver nenhum valor, o contador termina em 0 e a divisão dá `ZeroDivisionError: division by zero`. Quando a sequência pode vir vazia, teste o contador antes de dividir.

O mesmo padrão serve para texto: começando com `resultado = ""`, a linha `resultado += letra` vai montando uma palavra letra por letra.

## Passo 2 · Previsão · Onde o acumulador começa

Este programa parece somar 1 + 2 + 3. Leia com atenção a posição de cada linha e digite o que ele imprime de verdade.

### Código
```python
for i in range(1, 4):
    total = 0
    total += i
print(total)
```

### Dicas
1. A linha `total = 0` está dentro do laço: ela roda em toda volta, antes da soma.
2. Só a última volta sobrevive: nela, `total` volta a 0 e recebe o último valor de `i`.

### Saída esperada
```text
3
```

## Passo 3 · Exercício · Média das notas
modo: lacunas

Na previsão anterior, o acumulador era zerado a cada volta e a soma se perdia. Agora você vai colocar cada parte no lugar certo.

O programa lê um inteiro `n` e, em seguida, `n` notas, uma por linha. No fim, imprime a média com duas casas decimais, no formato `Média: 7.50`. Considere que `n` é pelo menos 1.

Exemplo de execução, com as entradas `3`, `7`, `8` e `7.5`:

```
Média: 7.50
```

Complete as quatro lacunas (`___`).

### Instruções
1. Comece o acumulador `total` com o valor certo para uma soma.
2. Faça o laço repetir `n` vezes e some cada nota lida ao acumulador.
   Dica: são duas lacunas, a do `range` e a do operador que acumula.
3. Divida o total pela quantidade de notas lidas.

### Código inicial
```python
n = int(input())
total = ___
for i in range(___):
    nota = float(input())
    total ___ nota
print(f"Média: {total / ___:.2f}")
```

### Solução
```python
n = int(input())
total = 0
for i in range(n):
    nota = float(input())
    total += nota
print(f"Média: {total / n:.2f}")
```

### Dicas
1. O acumulador de soma começa em 0, o número que não altera uma soma.
2. O laço roda `n` vezes: `range(n)` dá exatamente `n` voltas.
3. A média divide a soma pela quantidade de notas lidas, que é `n`.

### Verificação
```json
[
  { "id": "uma-nota", "checkpoint": 1, "kind": "io", "stdin": "1\n10\n", "expected_stdout": "Média: 10.00",
    "name": "Uma nota só: 10", "hint": "Com uma única nota, a média é a própria nota." },
  { "id": "tres-notas", "checkpoint": 2, "kind": "io", "stdin": "3\n7\n8\n7.5\n", "expected_stdout": "Média: 7.50",
    "name": "Notas 7, 8 e 7.5", "hint": "Todas as n notas precisam ser lidas e somadas." },
  { "id": "quatro-notas", "checkpoint": 3, "kind": "io", "stdin": "4\n10\n0\n5\n6\n", "expected_stdout": "Média: 5.25",
    "name": "Notas 10, 0, 5 e 6", "hint": "Divida a soma pela quantidade de notas." },
  { "id": "usa-for", "checkpoint": 2, "kind": "source", "rule": { "type": "uses", "construct": "for" }, "name": "Usa for" }
]
```

### Soluções erradas
```python name="total = 0 dentro do laço"
n = int(input())
for i in range(n):
    total = 0
    nota = float(input())
    total += nota
print(f"Média: {total / n:.2f}")
```
```python name="divide por n + 1"
n = int(input())
total = 0
for i in range(n):
    nota = float(input())
    total += nota
print(f"Média: {total / (n + 1):.2f}")
```
```python name="range(n - 1) (deixa de ler a última nota)"
n = int(input())
total = 0
for i in range(n - 1):
    nota = float(input())
    total += nota
print(f"Média: {total / n:.2f}")
```

## Passo 4 · Exercício · Maior e menor

O acumulador não precisa ser uma soma. Para achar o maior valor de uma sequência, guarde um **candidato**: o maior valor visto até agora. A cada volta, compare o valor atual com o candidato e troque quando achar um maior.

A pergunta difícil é: com que valor o candidato começa? A resposta segura é **o primeiro elemento da lista**, que se escreve `lista[0]` (as posições de uma lista começam em 0). Assim o candidato é sempre um valor que realmente está na lista.

Escreva duas funções, sem usar as funções prontas `max()` e `min()`:

- `maior_de(lista)` devolve o maior valor da lista;
- `menor_de(lista)` devolve o menor valor da lista.

| Chamada | Resultado |
|---|---|
| `maior_de([3, -7, 12, 0])` | `12` |
| `menor_de([3, -7, 12, 0])` | `-7` |
| `maior_de([-5, -2])` | `-2` |
| `maior_de([4])` | `4` |

As listas dos testes têm pelo menos um elemento.

### Instruções
1. Em `maior_de`, comece o candidato com o primeiro elemento, percorra a lista e troque o candidato sempre que encontrar um valor maior. Devolva o candidato depois do laço.
2. Em `menor_de`, faça o mesmo, trocando o candidato quando encontrar um valor menor.
3. Não use `max()` nem `min()`: o objetivo é escrever o laço.

### Código inicial
```python
def maior_de(lista):
    pass


def menor_de(lista):
    pass
```

### Solução
```python
def maior_de(lista):
    maior = lista[0]
    for valor in lista:
        if valor > maior:
            maior = valor
    return maior


def menor_de(lista):
    menor = lista[0]
    for valor in lista:
        if valor < menor:
            menor = valor
    return menor
```

### Dicas
1. Comece com o primeiro elemento da lista (`lista[0]`), não com um número escolhido por você.
2. Troque o candidato só quando achar um valor melhor: maior em `maior_de`, menor em `menor_de`.
3. O `return` vem depois do laço: só depois de ver todos os valores dá para saber qual é o maior.

### Verificação
```json
[
  { "id": "maior-misto", "checkpoint": 1, "kind": "call", "function": "maior_de", "args": [[3, -7, 12, 0]], "expected": 12,
    "name": "maior_de([3, -7, 12, 0])" },
  { "id": "maior-negativos", "checkpoint": 1, "kind": "call", "function": "maior_de", "args": [[-5, -2]], "expected": -2,
    "name": "maior_de([-5, -2])", "hint": "Com que valor o seu candidato começa? Ele precisa ser um valor da lista." },
  { "id": "maior-um", "checkpoint": 1, "kind": "call", "function": "maior_de", "args": [[4]], "expected": 4,
    "name": "maior_de([4])" },
  { "id": "maior-no-fim", "checkpoint": 1, "kind": "call", "function": "maior_de", "args": [[1, 9, 2, 15]], "expected": 15,
    "name": "O maior é o último elemento", "hint": "O laço precisa olhar todos os valores antes do return." },
  { "id": "menor-misto", "checkpoint": 2, "kind": "call", "function": "menor_de", "args": [[3, -7, 12, 0]], "expected": -7,
    "name": "menor_de([3, -7, 12, 0])", "hint": "Em menor_de a comparação é a contrária da de maior_de." },
  { "id": "menor-positivos", "checkpoint": 2, "kind": "call", "function": "menor_de", "args": [[8, 5, 9]], "expected": 5,
    "name": "menor_de([8, 5, 9])", "hint": "Com que valor o seu candidato começa? Ele precisa ser um valor da lista." },
  { "id": "menor-um", "checkpoint": 2, "kind": "call", "function": "menor_de", "args": [[4]], "expected": 4,
    "name": "menor_de([4])" },
  { "id": "sem-max", "checkpoint": 3, "kind": "source", "rule": { "type": "not_calls", "name": "max" },
    "name": "Não usa max()", "hint": "Encontre o maior com um laço e um candidato." },
  { "id": "sem-min", "checkpoint": 3, "kind": "source", "rule": { "type": "not_calls", "name": "min" },
    "name": "Não usa min()", "hint": "Encontre o menor com um laço e um candidato." }
]
```

### Soluções erradas
```python name="candidato começa em 0"
def maior_de(lista):
    maior = 0
    for valor in lista:
        if valor > maior:
            maior = valor
    return maior


def menor_de(lista):
    menor = 0
    for valor in lista:
        if valor < menor:
            menor = valor
    return menor
```
```python name="comparação invertida em menor_de"
def maior_de(lista):
    maior = lista[0]
    for valor in lista:
        if valor > maior:
            maior = valor
    return maior


def menor_de(lista):
    menor = lista[0]
    for valor in lista:
        if valor > menor:
            menor = valor
    return menor
```
```python name="usa max e min"
def maior_de(lista):
    return max(lista)


def menor_de(lista):
    return min(lista)
```
```python name="return dentro do laço"
def maior_de(lista):
    maior = lista[0]
    for valor in lista:
        if valor > maior:
            maior = valor
        return maior


def menor_de(lista):
    menor = lista[0]
    for valor in lista:
        if valor < menor:
            menor = valor
        return menor
```

## Passo 5 · Quiz · Acumuladores

### Pergunta
Onde deve ficar a linha `total = 0` em um programa que soma valores com um laço?
- [ ] Dentro do laço, como primeira linha do bloco, para o total estar sempre pronto
- [x] Antes do laço, para rodar uma única vez
- [ ] Depois do laço, junto com o `print`
- [ ] Tanto faz: o resultado é o mesmo em qualquer posição
> Dentro do bloco, a linha roda em toda volta e apaga a soma parcial. Antes do laço, ela roda uma vez e o total sobrevive de uma volta para a outra.

### Pergunta
Uma função procura o maior valor começando com `maior = 0`. Para a lista `[-5, -2]` ela devolve `0`. Por quê?
- [ ] Porque o `for` não percorre números negativos
- [ ] Porque comparar números negativos com `>` dá erro
- [x] Porque nenhum valor da lista é maior que 0, então o candidato nunca é trocado, e 0 nem está na lista
- [ ] Porque a lista tem só dois elementos
> O valor inicial 0 "ganha" de todos os negativos. Começar com o primeiro elemento da lista garante que o candidato é sempre um valor real.

## Passo 6 · Leitura · Acumulador de produto: juros e fatorial

O acumulador também pode guardar um **produto**. O padrão é o mesmo (inicializar antes, atualizar dentro, usar depois), com uma diferença importante no valor inicial.

Na soma, o acumulador começa em 0, porque somar 0 não muda nada. Na multiplicação, o número que não muda nada é o **1**. Um produto que começa em 0 fica em 0 para sempre, porque qualquer número vezes 0 é 0.

#### Juros compostos

Você aplica R\$ 1000,00 em um investimento que rende 1 % ao mês. A cada mês, o saldo é o do mês anterior multiplicado por $1 + 0{,}01 = 1{,}01$. Depois de $n$ meses, um capital $C$ a uma taxa $i$ vira o montante:

$$
M_n = C \cdot (1 + i)^n
$$

O laço chega ao mesmo resultado sem potência, multiplicando o saldo uma vez por mês. Aqui o acumulador é o próprio `saldo`, e o valor inicial é o capital. Veja o saldo crescer a cada volta:

```python visualizar
saldo = 1000.0
for mes in range(1, 4):
    saldo = saldo * 1.01
    print(mes, round(saldo, 2))
```

Depois de três meses o saldo é $1000 \cdot 1{,}01^3 \approx 1030{,}30$. Repare que o rendimento de cada mês é um pouco maior que o do anterior: os juros rendem sobre os juros.

#### Fatorial

O **fatorial** de $n$, escrito $n!$, é o produto de todos os inteiros de 1 até $n$:

$$
n! = 1 \cdot 2 \cdot 3 \cdots n
$$

Por exemplo, $4! = 1 \cdot 2 \cdot 3 \cdot 4 = 24$. Ele responde de quantas maneiras dá para ordenar $n$ itens: quatro pessoas formam a fila do RU de 24 jeitos diferentes. Por definição, $0! = 1$.

Teste de mesa de $4!$ com o produto começando em 1:

| Volta | `i` | `produto` depois |
|---|---|---|
| (antes) | — | 1 |
| 1 | 1 | 1 |
| 2 | 2 | 2 |
| 3 | 3 | 6 |
| 4 | 4 | 24 |

## Passo 7 · Exercício · Fatorial iterativo

Escreva a função `fatorial(n)`, que devolve $n!$ usando um `for` e um acumulador de produto. Considere que `n` é um inteiro maior ou igual a 0.

| Chamada | Resultado |
|---|---|
| `fatorial(0)` | `1` |
| `fatorial(1)` | `1` |
| `fatorial(5)` | `120` |
| `fatorial(10)` | `3628800` |

### Instruções
1. Crie o acumulador `produto` com o valor inicial certo para uma multiplicação.
2. Com um `for`, multiplique o acumulador por cada inteiro de 1 até `n`.
   Dica: o `n` também entra no produto.
3. Devolva o acumulador depois do laço. Confira que `fatorial(0)` devolve 1.

### Código inicial
```python
def fatorial(n):
    # crie o acumulador de produto

    # multiplique por cada número de 1 até n

    # devolva o resultado
    pass
```

### Solução
```python
def fatorial(n):
    produto = 1
    for i in range(1, n + 1):
        produto *= i
    return produto
```

### Dicas
1. O produto começa em 1. Se começar em 0, o resultado é sempre 0.
2. `range(1, n + 1)` inclui o `n`; `range(1, n)` deixa o último fator de fora.
3. Com `n = 0` o laço não dá nenhuma volta e a função devolve o valor inicial, que já é a resposta certa.

### Verificação
```json
[
  { "id": "usa-for", "checkpoint": 2, "kind": "source", "rule": { "type": "uses", "construct": "for", "function": "fatorial" },
    "name": "fatorial usa um laço for" },
  { "id": "fat-1", "checkpoint": 1, "kind": "call", "function": "fatorial", "args": [1], "expected": 1, "type": "int",
    "name": "fatorial(1)", "hint": "Confira o valor inicial do acumulador: qual número não altera uma multiplicação?" },
  { "id": "fat-5", "checkpoint": 2, "kind": "call", "function": "fatorial", "args": [5], "expected": 120, "type": "int",
    "name": "fatorial(5)", "hint": "Todos os inteiros de 1 até n entram no produto, inclusive o n." },
  { "id": "fat-10", "checkpoint": 2, "kind": "call", "function": "fatorial", "args": [10], "expected": 3628800, "type": "int",
    "name": "fatorial(10)" },
  { "id": "fat-0", "checkpoint": 3, "kind": "call", "function": "fatorial", "args": [0], "expected": 1, "type": "int",
    "name": "fatorial(0) é 1", "hint": "Sem nenhuma volta, a função devolve o valor inicial do acumulador." }
]
```

### Soluções erradas
```python name="produto começa em 0"
def fatorial(n):
    produto = 0
    for i in range(1, n + 1):
        produto *= i
    return produto
```
```python name="range(1, n) (falta o n)"
def fatorial(n):
    produto = 1
    for i in range(1, n):
        produto *= i
    return produto
```
```python name="range(n) (multiplica por 0)"
def fatorial(n):
    produto = 1
    for i in range(n):
        produto *= i
    return produto
```
```python name="soma em vez de multiplicar"
def fatorial(n):
    produto = 1
    for i in range(1, n + 1):
        produto += i
    return produto
```
