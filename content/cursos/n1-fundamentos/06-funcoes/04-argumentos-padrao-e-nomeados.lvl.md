---
slug: n1-m6-04-argumentos-padrao-e-nomeados
titulo: Argumentos padrão e nomeados
descricao: Parâmetros opcionais com valor padrão, chamadas com nome dos argumentos e o cuidado com listas como padrão.
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
- Definir parâmetros com valor padrão e chamar funções omitindo-os
- Usar argumentos nomeados para deixar chamadas legíveis e fora de ordem
- Explicar por que uma lista como valor padrão causa bugs e como evitar
---

## Passo 1 · Leitura · Parâmetros opcionais

Até aqui, toda chamada precisava de um argumento para cada parâmetro. Mas você já usou funções em que alguns argumentos são opcionais: `print("a", "b")` separa os textos com um espaço, e `print("a", "b", sep="-")` troca o separador. O `sep` tem um **valor padrão**, usado quando você não informa nada.

Você cria um parâmetro assim escrevendo `=` e o valor na linha do `def`:

```python
def saudar(nome, saudacao="Olá"):
    return f"{saudacao}, {nome}!"


print(saudar("Ana"))              # Olá, Ana!
print(saudar("Ana", "Bom dia"))   # Bom dia, Ana!
```

`nome` é obrigatório. `saudacao` é opcional: se a chamada não o informar, ele vale `"Olá"`.

**Os parâmetros com padrão ficam no fim.** Escrever `def saudar(saudacao="Olá", nome):` dá `SyntaxError`, porque o Python não teria como saber a quem pertence um argumento sozinho.

Na chamada, existem duas formas de passar um argumento.

- **Posicional:** vale a ordem. Em `saudar("Ana", "Bom dia")`, o primeiro valor vai para `nome` e o segundo para `saudacao`.
- **Nomeado:** você escreve o nome do parâmetro, `=` e o valor. A ordem deixa de importar.

```python
print(saudar("Ana", saudacao="Boa noite"))    # Boa noite, Ana!
print(saudar(saudacao="Oi", nome="Caio"))     # Oi, Caio!
```

Argumentos nomeados deixam a chamada mais clara. Compare `criar_conta("Ana", 0, True)` com `criar_conta("Ana", saldo=0, ativa=True)`: na segunda, quem lê não precisa abrir a definição para saber o que são o `0` e o `True`. Eles também permitem pular um parâmetro opcional e informar só o seguinte.

Duas regras valem na chamada:

1. **Os posicionais vêm antes dos nomeados.** `saudar(saudacao="Oi", "Caio")` dá `SyntaxError: positional argument follows keyword argument`.
2. **O nome precisa existir na definição.** `saudar("Ana", cumprimento="Oi")` dá `TypeError`, porque `saudar` não tem um parâmetro chamado `cumprimento`.

## Passo 2 · Previsão · Qual valor cada parâmetro recebe

Leia o programa com calma, sem executar, e digite exatamente o que ele imprime (uma linha de saída por linha da sua resposta). Em cada chamada, descubra quanto valem `base` e `expoente`. O operador `**` é a potência: `2 ** 3` vale 8.

### Código
```python
def potencia(base, expoente=2):
    return base ** expoente


print(potencia(3))
print(potencia(2, 5))
print(potencia(expoente=3, base=2))
```

### Dicas
1. O parâmetro que não é informado na chamada usa o valor padrão escrito no `def`.
2. Com nomes, a ordem dos argumentos não importa: cada valor vai para o parâmetro citado.

### Saída esperada
```text
9
32
8
```

## Passo 3 · Exercício · formatar_preco(valor, moeda="R$", casas=2)

Uma loja mostra preços quase sempre em reais e com duas casas decimais, mas às vezes precisa de outra moeda ou de outra quantidade de casas. Esse é o caso típico de parâmetros com valor padrão: o uso comum fica curto, e o uso raro continua possível.

Escreva `formatar_preco(valor, moeda="R$", casas=2)`, que devolve um texto com a moeda, um espaço e o valor com `casas` casas decimais (com ponto, como o Python escreve).

| Chamada | Devolve |
|---|---|
| `formatar_preco(10.5)` | `"R$ 10.50"` |
| `formatar_preco(10.5, "US$")` | `"US$ 10.50"` |
| `formatar_preco(10.5, casas=1)` | `"R$ 10.5"` |
| `formatar_preco(3, moeda="€", casas=0)` | `"€ 3"` |

Você já sabe fixar as casas com `f"{valor:.2f}"`. Para o número de casas vir de uma variável, coloque-a entre chaves dentro do formato: `f"{valor:.{casas}f}"`.

### Instruções
1. Defina `formatar_preco` com o parâmetro obrigatório `valor` e devolva o texto no formato moeda, espaço, valor. Sem outros argumentos, `formatar_preco(10.5)` devolve `"R$ 10.50"`.
2. Acrescente o parâmetro `moeda`, com padrão `"R$"`, e use-o no texto.
3. Acrescente o parâmetro `casas`, com padrão `2`, e use-o como número de casas decimais.

### Código inicial
```python
def formatar_preco(valor):
    pass
```

### Solução
```python
def formatar_preco(valor, moeda="R$", casas=2):
    return f"{moeda} {valor:.{casas}f}"
```

### Dicas
1. Os valores padrão ficam na linha do `def`: `moeda="R$"` e `casas=2`, nessa ordem, depois de `valor`.
2. No corpo, use os parâmetros, não os valores fixos: se o texto tiver `R$` ou `.2f` escritos à mão, a função ignora o que foi pedido na chamada.
3. `f"{valor:.{casas}f}"` usa a variável `casas` como número de casas decimais.

### Verificação
```json
[
  { "id": "so-valor", "checkpoint": 1, "kind": "call", "function": "formatar_preco", "args": [10.5], "expected": "R$ 10.50", "type": "str",
    "name": "formatar_preco(10.5) é \"R$ 10.50\"", "hint": "Devolva um texto: moeda, um espaço e o valor com duas casas." },
  { "id": "so-valor-2", "checkpoint": 1, "kind": "call", "function": "formatar_preco", "args": [1234.567], "expected": "R$ 1234.57", "type": "str",
    "name": "formatar_preco(1234.567) é \"R$ 1234.57\"" },
  { "id": "moeda-posicional", "checkpoint": 2, "kind": "call", "function": "formatar_preco", "args": [10.5, "US$"], "expected": "US$ 10.50", "type": "str",
    "name": "formatar_preco(10.5, \"US$\") é \"US$ 10.50\"", "hint": "O segundo parâmetro é a moeda; use-o no texto em vez de um R$ fixo." },
  { "id": "moeda-nomeada", "checkpoint": 2, "kind": "call", "function": "formatar_preco", "args": [7], "kwargs": { "moeda": "€" }, "expected": "€ 7.00", "type": "str",
    "name": "formatar_preco(7, moeda=\"€\") é \"€ 7.00\"", "hint": "O parâmetro precisa se chamar moeda." },
  { "id": "casas-1", "checkpoint": 3, "kind": "call", "function": "formatar_preco", "args": [10.5], "kwargs": { "casas": 1 }, "expected": "R$ 10.5", "type": "str",
    "name": "formatar_preco(10.5, casas=1) é \"R$ 10.5\"", "hint": "O número de casas vem do parâmetro casas, não de um 2 fixo." },
  { "id": "moeda-e-casas", "checkpoint": 3, "kind": "call", "function": "formatar_preco", "args": [3], "kwargs": { "moeda": "€", "casas": 0 }, "expected": "€ 3", "type": "str",
    "name": "formatar_preco(3, moeda=\"€\", casas=0) é \"€ 3\"" },
  { "id": "tres-posicionais", "checkpoint": 3, "kind": "call", "function": "formatar_preco", "args": [2.5, "US$", 3], "expected": "US$ 2.500", "type": "str",
    "name": "formatar_preco(2.5, \"US$\", 3) é \"US$ 2.500\"", "hint": "A ordem dos parâmetros é valor, moeda, casas." }
]
```

### Soluções erradas
```python name="casas fixo em 2 no corpo"
def formatar_preco(valor, moeda="R$", casas=2):
    return f"{moeda} {valor:.2f}"
```
```python name="moeda fixa R$ no corpo"
def formatar_preco(valor, moeda="R$", casas=2):
    return f"R$ {valor:.{casas}f}"
```
```python name="ordem dos parâmetros trocada"
def formatar_preco(valor, casas=2, moeda="R$"):
    return f"{moeda} {valor:.{casas}f}"
```
```python name="sem espaço entre a moeda e o valor"
def formatar_preco(valor, moeda="R$", casas=2):
    return f"{moeda}{valor:.{casas}f}"
```

## Passo 4 · Exercício · Lista padrão

Há uma armadilha famosa nos valores padrão. A função abaixo deveria criar uma lista nova de tarefas quando ninguém passa uma lista. Execute no visualizador e observe: a mesma lista aparece nas duas chamadas.

```python visualizar
def adicionar_tarefa(tarefa, lista=[]):
    lista.append(tarefa)
    return lista


a = adicionar_tarefa("estudar")
b = adicionar_tarefa("lavar a louça")
print(a)
print(b)
```

O programa imprime `['estudar', 'lavar a louça']` duas vezes. O motivo: **o valor padrão é criado uma única vez**, quando o Python lê o `def`, e não a cada chamada. Toda chamada sem `lista` recebe aquela mesma lista, que vai acumulando itens. Com números e textos isso não aparece, porque eles não são modificados; com listas e dicionários, que mudam com `append` e parecidos, vira defeito.

O conserto é um costume do Python: usar `None` como padrão, com o sentido de "não informaram", e criar a lista **dentro** da função, onde uma lista nova nasce a cada chamada.

```python
def registrar(nome, nomes=None):
    if nomes is None:
        nomes = []
    nomes.append(nome)
    return nomes
```

Conserte `adicionar_tarefa` do mesmo jeito. Quando a chamada informa uma lista, a tarefa vai para o fim dela: `adicionar_tarefa("z", ["x"])` devolve `["x", "z"]`.

### Instruções
1. Troque o padrão de `lista` por `None` e crie uma lista nova dentro da função quando nenhuma for informada: duas chamadas sem lista devolvem listas separadas.
2. Quando a chamada informar uma lista, acrescente a tarefa ao fim dela e devolva essa lista.

### Código inicial
```python
def adicionar_tarefa(tarefa, lista=[]):
    lista.append(tarefa)
    return lista
```

### Solução
```python
def adicionar_tarefa(tarefa, lista=None):
    if lista is None:
        lista = []
    lista.append(tarefa)
    return lista
```

### Dicas
1. No `def`, o padrão passa a ser `lista=None`.
2. Dentro da função, teste `if lista is None:` e só nesse caso crie a lista vazia.
3. Não crie a lista vazia em toda chamada: se alguém passou uma lista, é nela que a tarefa entra.

### Verificação
```json
[
  { "id": "uma-chamada", "checkpoint": 1, "kind": "call", "function": "adicionar_tarefa", "args": ["estudar"], "expected": ["estudar"], "type": "list",
    "name": "adicionar_tarefa(\"estudar\") é [\"estudar\"]", "hint": "Sem lista informada, a função cria uma lista nova e devolve a tarefa dentro dela." },
  { "id": "listas-separadas", "checkpoint": 1, "kind": "expr", "setup": "a = adicionar_tarefa(\"x\")\nb = adicionar_tarefa(\"y\")", "expr": "b", "expected": ["y"],
    "name": "A segunda chamada sem lista começa de uma lista vazia", "hint": "O padrão [] é criado uma vez só e compartilhado. Use None e crie a lista dentro da função." },
  { "id": "primeira-intacta", "checkpoint": 1, "kind": "expr", "setup": "a = adicionar_tarefa(\"x\")\nb = adicionar_tarefa(\"y\")\nc = adicionar_tarefa(\"w\")", "expr": "a", "expected": ["x"],
    "name": "A lista da primeira chamada não muda com as chamadas seguintes" },
  { "id": "lista-informada", "checkpoint": 2, "kind": "call", "function": "adicionar_tarefa", "args": ["z", ["x"]], "expected": ["x", "z"], "type": "list",
    "name": "adicionar_tarefa(\"z\", [\"x\"]) é [\"x\", \"z\"]", "hint": "Se a chamada informou uma lista, a tarefa entra no fim dela." },
  { "id": "lista-nomeada", "checkpoint": 2, "kind": "call", "function": "adicionar_tarefa", "args": ["c"], "kwargs": { "lista": ["a", "b"] }, "expected": ["a", "b", "c"], "type": "list",
    "name": "adicionar_tarefa(\"c\", lista=[\"a\", \"b\"]) é [\"a\", \"b\", \"c\"]", "hint": "O parâmetro continua se chamando lista." }
]
```

### Soluções erradas
```python name="mantém lista=[] como padrão"
def adicionar_tarefa(tarefa, lista=[]):
    lista.append(tarefa)
    return lista
```
```python name="cria sempre uma lista nova e ignora a informada"
def adicionar_tarefa(tarefa, lista=None):
    lista = []
    lista.append(tarefa)
    return lista
```
```python name="usa None mas não cria a lista"
def adicionar_tarefa(tarefa, lista=None):
    lista.append(tarefa)
    return lista
```
```python name="devolve o resultado de append, que é None"
def adicionar_tarefa(tarefa, lista=None):
    if lista is None:
        lista = []
    return lista.append(tarefa)
```

## Passo 5 · Quiz · Padrões e nomes

### Pergunta
O que acontece com esta definição?
```python
def saudar(saudacao="Olá", nome):
    return f"{saudacao}, {nome}!"
```
- [ ] Funciona: `saudar("Ana")` devolve `"Olá, Ana!"`
- [x] Dá `SyntaxError`: um parâmetro sem padrão não pode vir depois de um com padrão
- [ ] Dá `TypeError` só quando a função é chamada com um argumento
- [ ] Funciona, mas `nome` passa a valer `None`
> Os parâmetros com valor padrão ficam sempre no fim. O Python recusa a definição antes de executar qualquer linha.

### Pergunta
Dada a função abaixo, qual chamada devolve `8`?
```python
def potencia(base, expoente=2):
    return base ** expoente
```
- [ ] `potencia(3, 2)`
- [ ] `potencia(base=2)`
- [x] `potencia(expoente=3, base=2)`
- [ ] `potencia(expoente=3, 2)`
> Com argumentos nomeados a ordem não importa: `base` vale 2 e `expoente` vale 3. A última alternativa nem roda: um argumento posicional não pode vir depois de um nomeado.

### Pergunta
Por que usar `[]` como valor padrão de um parâmetro costuma causar defeito?
- [ ] Porque o Python proíbe listas como valor padrão
- [ ] Porque a lista é copiada a cada chamada, o que deixa o programa lento
- [x] Porque a lista é criada uma única vez, na definição, e todas as chamadas sem o argumento compartilham a mesma lista
- [ ] Porque a lista padrão é apagada no fim de cada chamada
> O valor padrão nasce quando o `def` é lido. Cada `append` altera essa mesma lista, e a chamada seguinte a encontra com os itens anteriores. Use `None` como padrão e crie a lista dentro da função.
