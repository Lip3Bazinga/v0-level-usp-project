---
slug: n1-m6-01-definir-e-chamar
titulo: Definir e chamar funções
descricao: Dar nome a um bloco de código com def, chamar quantas vezes quiser e organizar o programa em partes.
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
- Definir funções com def e chamá-las pelo nome
- Explicar a diferença entre definir e executar uma função
- Organizar um programa repetitivo em funções reutilizáveis
---

## Passo 1 · Leitura · Uma receita com nome

Desde o módulo 3 você usa `def` de vez em quando, como "uma receita com nome que devolve um valor". Agora as funções entram de verdade. Uma **função** é um bloco de código com nome. Você escreve o bloco uma vez e executa quantas vezes quiser, só chamando o nome.

A definição começa com `def`, o nome, parênteses e dois-pontos. O corpo vem indentado, como num `if` ou num `for`:

```python
def mostrar_menu():
    print("1 - Cadastrar aluno")
    print("2 - Listar alunos")
    print("3 - Sair")


print("Bem-vindo ao sistema do RU")
mostrar_menu()
print("Até a próxima!")
mostrar_menu()
```

Saída:

```
Bem-vindo ao sistema do RU
1 - Cadastrar aluno
2 - Listar alunos
3 - Sair
Até a próxima!
1 - Cadastrar aluno
2 - Listar alunos
3 - Sair
```

Repare em três coisas.

**Definir não executa.** Quando o Python lê o `def`, ele apenas guarda a receita com o nome `mostrar_menu`. Nenhum `print` do corpo roda nesse momento. Se o programa tivesse só a definição, a tela ficaria vazia.

**Chamar é escrever o nome com parênteses.** `mostrar_menu()` é a **chamada**: o Python pula para dentro do corpo, executa linha por linha e, ao terminar, volta para a linha seguinte à chamada. Sem os parênteses, `mostrar_menu` sozinho é só o nome da função, e nada acontece.

**A ordem importa.** O Python executa o arquivo de cima para baixo. O `def` precisa ter sido lido antes da primeira chamada; chamar antes de definir dá `NameError: name 'mostrar_menu' is not defined`.

Para que serve? Para eliminar repetição. Três cópias do mesmo bloco viram uma definição e três chamadas. Se o menu ganhar uma opção nova, você muda uma linha, não três. E o programa fica mais fácil de ler: `mostrar_menu()` diz o que acontece sem mostrar como.

Por isso o nome da função costuma ser um verbo no infinitivo, em `snake_case`: `mostrar_menu`, `calcular_total`, `imprimir_recibo`. Quem lê a chamada entende a intenção na hora.

## Passo 2 · Exercício · Linha e cabeçalho

Um relatório começa com um cabeçalho: uma linha de traços, o título e outra linha de traços. Você vai escrever duas funções, e uma delas vai chamar a outra. A saída do programa deve ser exatamente esta:

```
--------------------
RELATÓRIO
--------------------
```

### Instruções
1. Defina a função `linha()`, que imprime uma linha com 20 traços: `--------------------`.
   Dica: `"-" * 20` monta o texto sem contar à mão.
2. Defina a função `cabecalho()`, que chama `linha()`, imprime `RELATÓRIO` e chama `linha()` de novo.
3. No fim do programa, fora das funções, chame `cabecalho()` uma vez.

### Código inicial
```python
# 1. Defina linha()


# 2. Defina cabecalho()


# 3. Chame cabecalho()
```

### Solução
```python
def linha():
    print("-" * 20)


def cabecalho():
    linha()
    print("RELATÓRIO")
    linha()


cabecalho()
```

### Dicas
1. A definição sozinha não imprime nada: o corpo só roda quando alguém chama a função.
2. Dentro de `cabecalho()`, `linha()` é uma chamada comum, igual a `print()`.
3. A última linha do arquivo, sem indentação, deve ser a chamada `cabecalho()`.

### Verificação
```json
[
  { "id": "define-linha", "checkpoint": 1, "kind": "source", "rule": { "type": "defines_function", "name": "linha" },
    "name": "Define a função linha", "hint": "Comece com def linha(): e o corpo indentado." },
  { "id": "define-cabecalho", "checkpoint": 2, "kind": "source", "rule": { "type": "defines_function", "name": "cabecalho" },
    "name": "Define a função cabecalho" },
  { "id": "usa-linha", "checkpoint": 2, "kind": "source", "rule": { "type": "calls", "name": "linha" },
    "name": "cabecalho reaproveita linha()", "hint": "Chame linha() dentro de cabecalho em vez de repetir o print dos traços." },
  { "id": "chama-cabecalho", "checkpoint": 3, "kind": "source", "rule": { "type": "calls", "name": "cabecalho" },
    "name": "O programa chama cabecalho()", "hint": "Escrever só o nome da função não a executa: são necessários os parênteses." },
  { "id": "saida", "checkpoint": 3, "kind": "io", "stdin": "", "expected_stdout": "--------------------\nRELATÓRIO\n--------------------",
    "name": "Saída: traços, RELATÓRIO, traços", "hint": "Confira a quantidade de traços (20) e o título em maiúsculas, com acento." }
]
```

### Soluções erradas
```python name="define as funções mas não chama cabecalho"
def linha():
    print("-" * 20)


def cabecalho():
    linha()
    print("RELATÓRIO")
    linha()
```
```python name="19 traços em vez de 20"
def linha():
    print("-------------------")


def cabecalho():
    linha()
    print("RELATÓRIO")
    linha()


cabecalho()
```
```python name="chamada sem parênteses"
def linha():
    print("-" * 20)


def cabecalho():
    linha()
    print("RELATÓRIO")
    linha()


cabecalho
```
```python name="cabecalho repete os traços em vez de chamar linha"
def linha():
    print("-" * 20)


def cabecalho():
    print("-" * 20)
    print("RELATÓRIO")
    print("-" * 20)


cabecalho()
```
```python name="chama antes de definir"
cabecalho()


def linha():
    print("-" * 20)


def cabecalho():
    linha()
    print("RELATÓRIO")
    linha()
```

## Passo 3 · Exercício · Refatore a repetição

O programa abaixo imprime a mesma saudação três vezes, uma para cada pessoa que chega à fila do RU. Funciona, mas o bloco de três linhas foi copiado e colado. Se o horário mudar, alguém precisa lembrar de corrigir nos três lugares.

Reorganize o programa com uma função. A saída precisa continuar exatamente igual:

```
Olá! Bem-vindo ao RU.
Almoço das 11h às 14h.
Bom apetite!
Olá! Bem-vindo ao RU.
Almoço das 11h às 14h.
Bom apetite!
Olá! Bem-vindo ao RU.
Almoço das 11h às 14h.
Bom apetite!
```

### Instruções
1. Defina a função `saudar()` com as três linhas da saudação dentro dela, e apague os blocos repetidos.
   Dica: copie o bloco uma única vez para dentro do def, indentado.
2. Chame `saudar()` três vezes, para a saída ficar idêntica à original.

### Código inicial
```python
print("Olá! Bem-vindo ao RU.")
print("Almoço das 11h às 14h.")
print("Bom apetite!")
print("Olá! Bem-vindo ao RU.")
print("Almoço das 11h às 14h.")
print("Bom apetite!")
print("Olá! Bem-vindo ao RU.")
print("Almoço das 11h às 14h.")
print("Bom apetite!")
```

### Solução
```python
def saudar():
    print("Olá! Bem-vindo ao RU.")
    print("Almoço das 11h às 14h.")
    print("Bom apetite!")


saudar()
saudar()
saudar()
```

### Dicas
1. O `def` fica no topo do arquivo e as chamadas vêm depois, sem indentação.
2. As três linhas do bloco precisam estar indentadas sob o `def`; uma linha fora dele roda uma vez só, antes das chamadas.
3. Cada `saudar()` imprime o bloco inteiro: conte quantas vezes a saudação aparece na saída.

### Verificação
```json
[
  { "id": "define-saudar", "checkpoint": 1, "kind": "source", "rule": { "type": "defines_function", "name": "saudar" },
    "name": "Define a função saudar", "hint": "O bloco repetido vira o corpo de def saudar():." },
  { "id": "chama-saudar", "checkpoint": 2, "kind": "source", "rule": { "type": "calls", "name": "saudar" },
    "name": "O programa chama saudar()", "hint": "A função só executa quando é chamada com parênteses." },
  { "id": "saida", "checkpoint": 2, "kind": "io", "stdin": "",
    "expected_stdout": "Olá! Bem-vindo ao RU.\nAlmoço das 11h às 14h.\nBom apetite!\nOlá! Bem-vindo ao RU.\nAlmoço das 11h às 14h.\nBom apetite!\nOlá! Bem-vindo ao RU.\nAlmoço das 11h às 14h.\nBom apetite!",
    "name": "A saída continua igual: três saudações completas", "hint": "Compare sua saída com a do enunciado linha por linha; a saudação precisa aparecer três vezes, inteira." }
]
```

### Soluções erradas
```python name="define saudar mas mantém os blocos copiados"
def saudar():
    print("Olá! Bem-vindo ao RU.")
    print("Almoço das 11h às 14h.")
    print("Bom apetite!")


print("Olá! Bem-vindo ao RU.")
print("Almoço das 11h às 14h.")
print("Bom apetite!")
print("Olá! Bem-vindo ao RU.")
print("Almoço das 11h às 14h.")
print("Bom apetite!")
print("Olá! Bem-vindo ao RU.")
print("Almoço das 11h às 14h.")
print("Bom apetite!")
```
```python name="chama só duas vezes"
def saudar():
    print("Olá! Bem-vindo ao RU.")
    print("Almoço das 11h às 14h.")
    print("Bom apetite!")


saudar()
saudar()
```
```python name="chamadas sem parênteses"
def saudar():
    print("Olá! Bem-vindo ao RU.")
    print("Almoço das 11h às 14h.")
    print("Bom apetite!")


saudar
saudar
saudar
```
```python name="indentação: a última linha ficou fora da função"
def saudar():
    print("Olá! Bem-vindo ao RU.")
    print("Almoço das 11h às 14h.")
print("Bom apetite!")


saudar()
saudar()
saudar()
```

## Passo 4 · Quiz · Definir ou executar?

### Pergunta
O programa abaixo roda sem erro. O que aparece na tela?
```python
def avisar():
    print("Prova amanhã!")


avisar
```
- [x] Nada: sem os parênteses, `avisar` é só o nome da função e ela não é executada
- [ ] `Prova amanhã!`, porque o nome sozinho já chama a função
- [ ] `Prova amanhã!` duas vezes, uma do `def` e outra da última linha
- [ ] Um `NameError`, porque a função foi escrita sem parênteses
> A chamada exige os parênteses: `avisar()`. Escrever só `avisar` é uma expressão válida que não faz nada visível.

### Pergunta
O que acontece ao executar este programa?
```python
saudar()


def saudar():
    print("Olá!")
```
- [ ] Imprime `Olá!`, porque o Python lê o arquivo inteiro antes de executar
- [x] Dá `NameError: name 'saudar' is not defined`, porque a chamada vem antes da definição
- [ ] Imprime `Olá!` duas vezes
- [ ] Dá `SyntaxError`, porque um `def` não pode ficar no fim do arquivo
> O Python executa de cima para baixo. Na linha 1, o nome `saudar` ainda não existe: o `def` só é lido depois.

### Pergunta
Qual frase descreve corretamente o papel do `def`?
- [ ] Executa o corpo da função uma vez, no lugar onde foi escrito
- [ ] Executa o corpo da função e também guarda o nome para chamadas futuras
- [x] Guarda o bloco com um nome; o corpo só roda quando a função é chamada
- [ ] Imprime o corpo da função na tela
> `def` define: cria a função e associa o nome ao bloco. Executar é papel da chamada, `nome()`.
