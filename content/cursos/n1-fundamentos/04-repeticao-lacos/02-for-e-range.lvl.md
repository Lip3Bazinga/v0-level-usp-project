---
slug: n1-m4-02-for-e-range
titulo: for e range
descricao: Repetir um número conhecido de vezes com for e range(início, fim, passo).
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
- Usar range com um, dois e três argumentos e prever a sequência gerada
- Escolher entre for e while conforme o problema
- Percorrer os caracteres de uma string com for
---

## Passo 1 · Leitura · Repetir uma quantidade conhecida

Com `while`, contar de 1 a 5 exige três linhas de controle: inicializar, testar e atualizar. Quando você **já sabe** quais valores quer percorrer, o `for` faz as três coisas sozinho:

```python
for i in range(1, 6):
    print(i)
```

Leia assim: "para cada `i` na sequência gerada por `range(1, 6)`, execute o bloco". A variável `i` recebe um valor da sequência a cada volta. Quando a sequência acaba, o laço acaba. Não há atualização para esquecer.

O `range` gera sequências de inteiros e aceita um, dois ou três números:

| Chamada | Sequência gerada | Como ler |
|---|---|---|
| `range(5)` | 0, 1, 2, 3, 4 | de 0 até antes de 5 |
| `range(1, 6)` | 1, 2, 3, 4, 5 | de 1 até antes de 6 |
| `range(2, 11, 4)` | 2, 6, 10 | de 2 até antes de 11, de 4 em 4 |
| `range(10, 0, -3)` | 10, 7, 4, 1 | de 10 até antes de 0, descendo de 3 em 3 |
| `range(5, 5)` | (nada) | começo igual ao fim: nenhuma volta |

A regra que mais causa erro: **o fim nunca entra na sequência**. `range(1, 10)` para no 9. Para ir até o 10, escreva `range(1, 11)`. Em compensação, `range(5)` dá exatamente 5 voltas, o que é prático para "repita 5 vezes".

Para ver a sequência inteira de uma vez, transforme-a em lista: `print(list(range(1, 6)))` mostra `[1, 2, 3, 4, 5]`.

O `for` não percorre só números. Um texto é uma sequência de caracteres, e o `for` entrega um caractere por volta. Veja os dois casos no visualizador e repare no valor de `i` e de `letra` em cada volta:

```python visualizar
for i in range(2, 11, 4):
    print(i)
for letra in "USP":
    print(letra)
```

#### for ou while?

- Use **`for`** quando a quantidade de voltas é conhecida antes de o laço começar: "de 1 a 10", "5 vezes", "cada letra da palavra".
- Use **`while`** quando a parada depende de algo que acontece durante o laço: "até o usuário digitar 0", "enquanto o saldo for positivo".

## Passo 2 · Previsão · O que o range gera

Dois laços seguidos, um com um argumento e outro com passo negativo. Digite exatamente o que o programa imprime.

### Código
```python
for i in range(3):
    print(i)
for i in range(10, 0, -3):
    print(i)
```

### Dicas
1. O fim nunca é incluído: `range(3)` não chega ao 3, e `range(10, 0, -3)` não chega ao 0.
2. Com passo negativo a sequência desce: comece em 10 e subtraia 3 enquanto o valor for maior que 0.

### Saída esperada
```text
0
1
2
10
7
4
1
```

## Passo 3 · Exercício · Pares e regressiva
modo: lacunas

O programa tem dois laços. O primeiro deve imprimir os números pares de 2 a 20 (2, 4, 6, …, 20). O segundo deve imprimir de 10 a 1, descendo de um em um. Cada número sai em uma linha. Complete os argumentos de cada `range`: começo, fim e passo.

### Instruções
1. Complete o primeiro `range` para gerar 2, 4, 6, …, 20.
   Dica: o fim é exclusivo. Qual é o primeiro valor que já não pode entrar?
2. Complete o segundo `range` para gerar 10, 9, 8, …, 1.

### Código inicial
```python
for i in range(___, ___, ___):
    print(i)
for i in range(___, ___, ___):
    print(i)
```

### Solução
```python
for i in range(2, 21, 2):
    print(i)
for i in range(10, 0, -1):
    print(i)
```

### Dicas
1. O fim é exclusivo: escolha um fim que fique depois do último número que você quer ver.
2. Para descer, o passo é negativo, e o fim continua exclusivo: para o 1 aparecer, o fim precisa estar abaixo dele.

### Verificação
```json
[
  { "id": "pares-ate-20", "checkpoint": 1, "kind": "io", "stdin": "", "expected_stdout": "^2\\n4\\n6\\n8\\n10\\n12\\n14\\n16\\n18\\n20\\n", "match": "regex",
    "name": "O primeiro laço imprime os pares de 2 a 20", "hint": "Confira o começo, o passo e se o 20 aparece: o fim do range não é incluído." },
  { "id": "regressiva-ate-1", "checkpoint": 2, "kind": "io", "stdin": "", "expected_stdout": "\\n10\\n9\\n8\\n7\\n6\\n5\\n4\\n3\\n2\\n1\\s*$", "match": "regex",
    "name": "O segundo laço imprime de 10 a 1", "hint": "Com passo negativo, o fim também fica de fora. O 1 precisa ser impresso." },
  { "id": "saida", "checkpoint": 2, "kind": "io", "stdin": "",
    "expected_stdout": "2\n4\n6\n8\n10\n12\n14\n16\n18\n20\n10\n9\n8\n7\n6\n5\n4\n3\n2\n1",
    "name": "Saída completa: 20 linhas", "hint": "São dez pares e depois dez números da regressiva, sem nada a mais." },
  { "id": "usa-for", "checkpoint": 1, "kind": "source", "rule": { "type": "uses", "construct": "for" }, "name": "Usa for" }
]
```

### Soluções erradas
```python name="range(2, 20, 2) (para no 18)"
for i in range(2, 20, 2):
    print(i)
for i in range(10, 0, -1):
    print(i)
```
```python name="range(10, 1, -1) (para no 2)"
for i in range(2, 21, 2):
    print(i)
for i in range(10, 1, -1):
    print(i)
```
```python name="passo positivo na regressiva (não imprime nada)"
for i in range(2, 21, 2):
    print(i)
for i in range(10, 0, 1):
    print(i)
```

## Passo 4 · Exercício · soma_ate(n)

Somar todos os inteiros de 1 até `n` é um problema clássico. Você vai resolvê-lo com um laço: uma variável `total` começa em 0 e recebe cada número da sequência.

Escreva a função `soma_ate(n)`, que devolve $1 + 2 + \dots + n$. Lembre que uma função é uma receita com nome: o `def` já está no código inicial, e o `return` devolve o resultado. Para `n = 0` não há nada a somar, e a função devolve 0.

Existe uma fórmula que dá o mesmo resultado sem laço, e ela serve para você conferir a resposta:

$$
1 + 2 + \dots + n = \frac{n(n+1)}{2}
$$

Para $n = 100$, a fórmula dá $\frac{100 \cdot 101}{2} = 5050$. A sua função deve chegar a esse valor **somando com `for`**, não com a fórmula.

### Instruções
1. Dentro da função, crie `total` com 0 e use um `for` com `range` para somar cada número de 1 até `n`.
   Dica: o `n` precisa entrar na soma, e o fim do range é exclusivo.
2. Depois do laço, devolva `total` com `return`.

### Código inicial
```python
def soma_ate(n):
    total = 0
    # some cada número de 1 até n

    # devolva o total
```

### Solução
```python
def soma_ate(n):
    total = 0
    for i in range(1, n + 1):
        total += i
    return total
```

### Dicas
1. Comece o `total` em 0, antes do laço, e use `total += i` dentro dele.
2. `range(1, n + 1)` inclui o `n`; `range(1, n)` para um número antes.
3. O `return total` fica alinhado com o `for`, não dentro dele.

### Verificação
```json
[
  { "id": "usa-for", "checkpoint": 1, "kind": "source", "rule": { "type": "uses", "construct": "for", "function": "soma_ate" },
    "name": "soma_ate usa um laço for", "hint": "A fórmula serve só de conferência: some os números um a um com for." },
  { "id": "sem-while", "checkpoint": 1, "kind": "source", "rule": { "type": "not_uses", "construct": "while" },
    "name": "Não usa while", "hint": "A quantidade de voltas é conhecida: é caso de for." },
  { "id": "soma-5", "checkpoint": 1, "kind": "call", "function": "soma_ate", "args": [5], "expected": 15, "type": "int",
    "name": "soma_ate(5) soma 1 + 2 + 3 + 4 + 5", "hint": "Confira se o range começa em 1 e se o próprio n entra na soma." },
  { "id": "soma-1", "checkpoint": 1, "kind": "call", "function": "soma_ate", "args": [1], "expected": 1, "type": "int",
    "name": "soma_ate(1)", "hint": "Com n = 1 o laço precisa dar exatamente uma volta." },
  { "id": "soma-100", "checkpoint": 2, "kind": "call", "function": "soma_ate", "args": [100], "expected": 5050, "type": "int",
    "name": "soma_ate(100) bate com a fórmula" },
  { "id": "soma-0", "checkpoint": 2, "kind": "call", "function": "soma_ate", "args": [0], "expected": 0, "type": "int",
    "name": "soma_ate(0) é 0", "hint": "Sem nenhuma volta, a função devolve o valor inicial do total." }
]
```

### Soluções erradas
```python name="range(n) (soma de 0 até n - 1)"
def soma_ate(n):
    total = 0
    for i in range(n):
        total += i
    return total
```
```python name="range(1, n) (falta o n)"
def soma_ate(n):
    total = 0
    for i in range(1, n):
        total += i
    return total
```
```python name="return dentro do laço"
def soma_ate(n):
    total = 0
    for i in range(1, n + 1):
        total += i
        return total
```
```python name="usa a fórmula, sem laço"
def soma_ate(n):
    return n * (n + 1) // 2
```

## Passo 5 · Quiz · range

### Pergunta
O que `print(list(range(5)))` mostra?
- [ ] `[1, 2, 3, 4, 5]`
- [x] `[0, 1, 2, 3, 4]`
- [ ] `[0, 1, 2, 3, 4, 5]`
- [ ] `[5]`
> Com um argumento, o `range` começa em 0 e para antes do número informado: são 5 valores, de 0 a 4.

### Pergunta
O que `print(list(range(1, 10, 3)))` mostra?
- [ ] `[1, 4, 7, 10]`
- [ ] `[3, 6, 9]`
- [x] `[1, 4, 7]`
- [ ] `[1, 3, 10]`
> Começa em 1 e anda de 3 em 3: 1, 4, 7. O próximo seria 10, que é o fim, e o fim nunca entra.

### Pergunta
Qual é a última linha impressa por este programa?
```python
for i in range(3):
    print(i)
```
- [ ] 3
- [x] 2
- [ ] 0
- [ ] 1
> `range(3)` gera 0, 1 e 2. O laço dá três voltas, mas o último valor é 2, não 3.

## Passo 6 · Exercício · conta_vogais(palavra)

O `for` percorre um texto caractere por caractere. Com um contador, dá para responder perguntas sobre o texto. Você vai contar as vogais de uma palavra.

Escreva a função `conta_vogais(palavra)`, que devolve quantas vogais (`a`, `e`, `i`, `o`, `u`) a palavra tem. Maiúsculas também contam: `"PYTHON"` tem 1 vogal. As palavras dos testes não têm acento.

| Chamada | Resultado |
|---|---|
| `conta_vogais("banana")` | `3` |
| `conta_vogais("PYTHON")` | `1` |
| `conta_vogais("")` | `0` |

Para testar se um caractere é vogal, use o operador `in`, que verifica se um texto aparece dentro de outro: `"a" in "aeiou"` é `True`. O método `.lower()` devolve o texto em minúsculas: `"A".lower()` é `"a"`.

### Instruções
1. Crie um contador com 0 e percorra a palavra com `for letra in palavra`.
2. A cada volta, some 1 ao contador se a letra for uma vogal, minúscula ou maiúscula.
   Dica: passe a letra para minúscula antes de testar.
3. Depois do laço, devolva o contador.

### Código inicial
```python
def conta_vogais(palavra):
    contador = 0
    # percorra cada letra da palavra

    # devolva o contador
```

### Solução
```python
def conta_vogais(palavra):
    contador = 0
    for letra in palavra:
        if letra.lower() in "aeiou":
            contador += 1
    return contador
```

### Dicas
1. O teste `letra.lower() in "aeiou"` vale `True` para vogais minúsculas e maiúsculas.
2. O `return` vem depois do laço. Dentro dele, a função terminaria na primeira letra.

### Verificação
```json
[
  { "id": "usa-for", "checkpoint": 1, "kind": "source", "rule": { "type": "uses", "construct": "for", "function": "conta_vogais" },
    "name": "conta_vogais percorre a palavra com for" },
  { "id": "banana", "checkpoint": 2, "kind": "call", "function": "conta_vogais", "args": ["banana"], "expected": 3, "type": "int",
    "name": "conta_vogais(\"banana\")", "hint": "Todas as vogais contam, não só a primeira." },
  { "id": "maiusculas", "checkpoint": 2, "kind": "call", "function": "conta_vogais", "args": ["PYTHON"], "expected": 1, "type": "int",
    "name": "conta_vogais(\"PYTHON\")", "hint": "Vogais maiúsculas também contam." },
  { "id": "mistura", "checkpoint": 2, "kind": "call", "function": "conta_vogais", "args": ["Abacaxi"], "expected": 4, "type": "int",
    "name": "conta_vogais(\"Abacaxi\")", "hint": "A palavra mistura maiúscula e minúsculas." },
  { "id": "sem-vogal", "checkpoint": 3, "kind": "call", "function": "conta_vogais", "args": ["xyz"], "expected": 0, "type": "int",
    "name": "Palavra sem vogais", "hint": "Se nenhuma letra for vogal, a função devolve o contador como começou." },
  { "id": "vazia", "checkpoint": 3, "kind": "call", "function": "conta_vogais", "args": [""], "expected": 0, "type": "int",
    "name": "Texto vazio", "hint": "Com texto vazio o laço não dá nenhuma volta; a função ainda precisa devolver 0." }
]
```

### Soluções erradas
```python name="só minúsculas"
def conta_vogais(palavra):
    contador = 0
    for letra in palavra:
        if letra in "aeiou":
            contador += 1
    return contador
```
```python name="return dentro do laço, na primeira vogal"
def conta_vogais(palavra):
    contador = 0
    for letra in palavra:
        if letra.lower() in "aeiou":
            contador += 1
            return contador
    return contador
```
```python name="conta todas as letras"
def conta_vogais(palavra):
    contador = 0
    for letra in palavra:
        contador += 1
    return contador
```
