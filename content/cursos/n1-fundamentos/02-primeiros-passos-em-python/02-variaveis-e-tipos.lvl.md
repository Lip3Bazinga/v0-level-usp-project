---
slug: n1-m2-02-variaveis-e-tipos
titulo: Variáveis e tipos
descricao: 'Guardar valores com nome: int, float, str e bool, a função type() e as regras de nomes.'
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
- Criar variáveis com nomes válidos e descritivos e reatribuir valores
- Identificar o tipo de um valor (int, float, str, bool) e conferir com type()
- Prever o resultado de trocar o valor de uma variável ao longo do programa
---

## Passo 1 · Leitura · Variáveis: nomes para valores

Até aqui, seus programas só mostravam textos fixos. Para fazer contas e lembrar resultados, o programa precisa **guardar valores**. Uma **variável** é um nome que você dá a um valor guardado na memória do computador.

```python
saldo = 100
print(saldo)
```

A primeira linha é uma **atribuição**. Leia assim: "`saldo` recebe 100". O Python calcula o que está à direita do `=` e guarda o resultado com o nome que está à esquerda. Depois disso, onde o nome `saldo` aparecer, o Python usa o valor guardado: a segunda linha mostra `100`.

O `=` do Python **não é o "igual" da matemática**. Ele não compara nem afirma nada: ele guarda. Por isso a ordem importa: o nome fica sempre à esquerda. `100 = saldo` é erro.

Repare também que `print(saldo)` não tem aspas. Com aspas, `print("saldo")` mostraria a palavra `saldo`; sem aspas, mostra o valor guardado.

#### Regras para nomes

- Só letras, dígitos e sublinhado (`_`). Sem espaços: `nota final` é erro; `nota_final` vale.
- Não pode começar com dígito: `2total` é erro; `total_2` vale.
- Maiúsculas e minúsculas são diferentes: `Saldo` e `saldo` são dois nomes.
- Não pode ser uma palavra reservada, que o Python usa para si, como `if`, `for` e `class`.

Além das regras, há um costume: letras minúsculas e palavras separadas por sublinhado, estilo chamado *snake_case*. Prefira nomes que dizem o que o valor é. `preco_unitario` explica mais que `p` ou `x1`.

#### Uma variável pode mudar

Atribuir de novo ao mesmo nome troca o valor guardado; o antigo é esquecido. Isso se chama **reatribuição**. E o lado direito pode usar a própria variável: em `saldo = saldo + 50`, o Python primeiro calcula `saldo + 50` com o valor atual e só depois guarda o resultado em `saldo`.

O bloco abaixo tem o botão **Visualizar**. Ele executa o programa uma linha por vez e mostra, a cada passo, as variáveis que existem e o valor de cada uma. Clique, avance linha a linha e veja o valor de `saldo` mudar: 100, depois 150, depois 120.

```python visualizar
saldo = 100
saldo = saldo + 50
preco = 30
saldo = saldo - preco
print(saldo)
```

## Passo 2 · Exercício · Ficha de cadastro
modo: lacunas

Você vai guardar os dados de uma aluna em quatro variáveis. Os nomes já estão escritos; falta o valor de cada uma. Troque cada `___` pelo valor pedido. A última linha mostra os quatro valores e já está pronta.

Preste atenção em como cada valor é escrito: texto leva aspas, número não, e número com casas decimais usa **ponto**, não vírgula.

### Instruções
1. Guarde em `nome` o texto `Ana`.
   Dica: texto vai entre aspas.
2. Guarde em `idade` o número inteiro 20.
3. Guarde em `altura` o número 1.68.
4. Guarde em `estudante` o valor verdadeiro, que em Python se escreve `True`.

### Código inicial
```python
nome = ___
idade = ___
altura = ___
estudante = ___
print(nome, idade, altura, estudante)
```

### Solução
```python
nome = "Ana"
idade = 20
altura = 1.68
estudante = True
print(nome, idade, altura, estudante)
```

### Dicas
1. Texto usa aspas; número não. Com aspas, `"20"` é um texto, não um número.
2. `True` começa com T maiúsculo e não leva aspas.
3. As duas primeiras linhas ficam `nome = "Ana"` e `idade = 20`. A altura se escreve com ponto.

### Verificação
```json
[
  { "id": "nome", "checkpoint": 1, "kind": "variable", "variable": "nome", "expected": "Ana", "type": "str",
    "name": "nome guarda o texto Ana", "hint": "O texto vai entre aspas, com A maiúsculo." },
  { "id": "idade", "checkpoint": 2, "kind": "variable", "variable": "idade", "expected": 20, "type": "int",
    "name": "idade guarda o número inteiro 20", "hint": "Número não leva aspas." },
  { "id": "altura", "checkpoint": 3, "kind": "variable", "variable": "altura", "expected": 1.68, "type": "float", "tolerance": 0.001,
    "name": "altura guarda o número 1.68", "hint": "Use ponto para separar as casas decimais, sem aspas." },
  { "id": "estudante", "checkpoint": 4, "kind": "variable", "variable": "estudante", "expected": true, "type": "bool",
    "name": "estudante guarda o valor verdadeiro", "hint": "Escreva True, com T maiúsculo e sem aspas." }
]
```

### Soluções erradas
```python name="idade entre aspas"
nome = "Ana"
idade = "20"
altura = 1.68
estudante = True
print(nome, idade, altura, estudante)
```
```python name="True entre aspas"
nome = "Ana"
idade = 20
altura = 1.68
estudante = "True"
print(nome, idade, altura, estudante)
```
```python name="altura com vírgula"
nome = "Ana"
idade = 20
altura = 1,68
estudante = True
print(nome, idade, altura, estudante)
```

## Passo 3 · Leitura · Tipos: int, float, str e bool

Todo valor em Python tem um **tipo**. O tipo diz que espécie de dado aquilo é e o que dá para fazer com ele: números podem ser multiplicados, textos podem ser emendados. No exercício anterior você usou os quatro tipos básicos:

| Tipo | Exemplos | Para que serve |
|---|---|---|
| `int` | `20`, `0`, `-3` | números inteiros: idade, quantidade, ano |
| `float` | `1.68`, `7.5`, `2.0` | números com casas decimais: altura, nota, preço |
| `str` | `"Ana"`, `"42"`, `""` | texto (string): nome, endereço, CPF |
| `bool` | `True`, `False` | verdadeiro ou falso: respostas de sim ou não |

Alguns cuidados:

- O `float` usa **ponto**, como em `7.5`. A vírgula tem outro significado em Python e não serve para casas decimais.
- `2.0` é `float`, mesmo valendo o mesmo que 2. O que decide é o ponto.
- O tipo `bool` só tem dois valores, `True` e `False`, sempre com a inicial maiúscula e sem aspas.

Você não declara o tipo: o Python descobre pelo jeito como o valor foi escrito. Para perguntar o tipo de um valor, use a função `type()`:

```python
print(type(20))
print(type(1.68))
print(type("Ana"))
print(type(True))
```

Saída:

```
<class 'int'>
<class 'float'>
<class 'str'>
<class 'bool'>
```

Leia `<class 'int'>` como "é do tipo `int`". `type()` também aceita uma variável: `type(idade)` responde o tipo do valor que `idade` guarda naquele momento.

#### "42" não é 42

As aspas mudam tudo. `42` é um número: dá para somar, dividir, comparar. `"42"` é um texto formado pelos caracteres `4` e `2`, tão texto quanto `"Ana"`. Na tela os dois aparecem iguais, e é por isso que esse engano é tão comum:

```python
print(42)
print("42")
print(type(42))
print(type("42"))
```

```
42
42
<class 'int'>
<class 'str'>
```

Quando um programa se comporta de modo estranho com um valor, conferir o tipo com `print(type(...))` costuma mostrar o problema. E um critério prático para escolher: se você vai fazer contas com o dado, ele é número. CPF, CEP e telefone são formados por dígitos, mas ninguém soma CPFs: eles ficam melhor como `str`.

## Passo 4 · Exercício · Qual é o tipo

Agora o editor está em branco. Escreva um programa que pergunta ao Python o tipo de quatro valores e mostra cada resposta em uma linha. Os valores, nesta ordem, são: `42`, `3.14`, `"42"` e `False`.

A saída deve ser exatamente esta:

```
<class 'int'>
<class 'float'>
<class 'str'>
<class 'bool'>
```

Não digite essas respostas como texto: quem responde é o `type()`.

### Instruções
1. Mostre o tipo de `42` e, na linha seguinte, o tipo de `3.14`.
   Dica: coloque o `type(...)` dentro do `print(...)`.
2. Mostre o tipo de `"42"`, com as aspas, e depois o tipo de `False`, sem aspas.

### Código inicial
```python
# Mostre o tipo de 42, 3.14, "42" e False, um por linha
```

### Solução
```python
print(type(42))
print(type(3.14))
print(type("42"))
print(type(False))
```

### Dicas
1. `type(valor)` descobre o tipo, mas não mostra nada na tela. Quem mostra é o `print`.
2. As aspas mudam o tipo: `"42"` é texto. Já `False` não leva aspas.
3. A primeira linha é `print(type(42))`. Faça mais três linhas iguais, trocando o valor.

### Verificação
```json
[
  { "id": "chama-type", "checkpoint": 1, "kind": "source", "rule": { "type": "calls", "name": "type" },
    "name": "O programa usa type()", "hint": "Quem descobre o tipo é a função type(); não digite a resposta como texto." },
  { "id": "numeros", "checkpoint": 1, "kind": "io", "stdin": "", "expected_stdout": "^<class 'int'>\\n<class 'float'>\\n", "match": "regex",
    "name": "As duas primeiras linhas: tipo de 42 e de 3.14", "hint": "A saída começa com o tipo de 42 e, na linha de baixo, o tipo de 3.14." },
  { "id": "quatro-tipos", "checkpoint": 2, "kind": "io", "stdin": "", "expected_stdout": "<class 'int'>\n<class 'float'>\n<class 'str'>\n<class 'bool'>\n", "match": "exact",
    "name": "Os quatro tipos, na ordem pedida", "hint": "São quatro linhas. Confira as aspas: \"42\" leva aspas, False não." }
]
```

### Soluções erradas
```python name="imprime o valor, não o tipo"
print(42)
print(3.14)
print("42")
print(False)
```
```python name="False entre aspas"
print(type(42))
print(type(3.14))
print(type("42"))
print(type("False"))
```
```python name="42 sem aspas na terceira linha"
print(type(42))
print(type(3.14))
print(type(42))
print(type(False))
```
```python name="type sem print"
type(42)
type(3.14)
type("42")
type(False)
```

## Passo 5 · Previsão · A cópia não acompanha

Leia o programa sem executar. A variável `y` é criada a partir de `x`, e depois `x` muda. O que acontece com `y`? Digite exatamente o que o programa mostra, uma linha da saída em cada linha da resposta.

### Código
```python
x = 5
y = x
x = x + 1
print(x)
print(y)
```

### Dicas
1. Faça o teste de mesa: uma coluna para `x`, outra para `y`, e anote o valor de cada uma depois de cada linha.
2. `y = x` copia para `y` o valor que `x` tem naquele momento. Não cria um vínculo entre as duas.

### Saída esperada
```text
6
5
```

## Passo 6 · Exercício · A variável muda

A resposta da previsão: `y` continuou com 5. A atribuição `y = x` guardou em `y` o valor que `x` tinha naquela linha, e nada do que acontece com `x` depois chega até `y`.

Agora você vai acompanhar o saldo de uma conta. O programa começa com `saldo = 100`. Faça três movimentações, **nesta ordem**, sempre guardando o resultado na própria variável `saldo`, e mostre o saldo depois de cada uma. A saída deve ser exatamente esta:

```
150
120
240
```

O asterisco (`*`) é o sinal de multiplicação: `saldo * 2` é o dobro do saldo.

### Instruções
1. Some 50 ao saldo, guarde o resultado em `saldo` e mostre `saldo` com `print`.
   Dica: uma conta sozinha na linha não guarda nada; use o `=`.
2. Subtraia 30 do saldo, guarde em `saldo` e mostre de novo.
3. Dobre o saldo, guarde em `saldo` e mostre pela última vez.

### Código inicial
```python
saldo = 100

# 1. Some 50 e mostre o saldo

# 2. Subtraia 30 e mostre o saldo

# 3. Dobre o saldo e mostre
```

### Solução
```python
saldo = 100

# 1. Some 50 e mostre o saldo
saldo = saldo + 50
print(saldo)

# 2. Subtraia 30 e mostre o saldo
saldo = saldo - 30
print(saldo)

# 3. Dobre o saldo e mostre
saldo = saldo * 2
print(saldo)
```

### Dicas
1. Reatribuir é usar o `=` de novo com o mesmo nome: o valor antigo é trocado pelo novo.
2. `saldo + 50` sozinho faz a conta e joga o resultado fora. `saldo = saldo + 50` guarda o novo valor.
3. Siga a ordem das instruções: somar, subtrair e só então dobrar. Depois de cada conta, um `print(saldo)`.

### Verificação
```json
[
  { "id": "soma-50", "checkpoint": 1, "kind": "io", "stdin": "", "expected_stdout": "^150\\n", "match": "regex",
    "name": "Depois de somar 50, mostra o saldo", "hint": "A primeira linha da saída é o saldo depois da soma. Guarde a conta em saldo antes do print." },
  { "id": "subtrai-30", "checkpoint": 2, "kind": "io", "stdin": "", "expected_stdout": "^150\\n120\\n", "match": "regex",
    "name": "Depois de subtrair 30, mostra o saldo", "hint": "A segunda linha da saída é o saldo depois da subtração, feita sobre o saldo já somado." },
  { "id": "saida-final", "checkpoint": 3, "kind": "io", "stdin": "", "expected_stdout": "150\n120\n240\n", "match": "exact",
    "name": "Três linhas: o saldo depois de cada movimentação", "hint": "Um print(saldo) depois de cada conta, e nenhuma outra saída." },
  { "id": "saldo-final", "checkpoint": 3, "kind": "variable", "variable": "saldo", "expected": 240, "type": "int",
    "name": "No fim, a variável saldo guarda o valor dobrado", "hint": "O dobro é calculado por último e precisa ser guardado em saldo, não só mostrado." }
]
```

### Soluções erradas
```python name="faz as contas sem reatribuir"
saldo = 100
saldo + 50
print(saldo)
saldo - 30
print(saldo)
saldo * 2
print(saldo)
```
```python name="dobra antes de subtrair"
saldo = 100
saldo = saldo + 50
print(saldo)
saldo = saldo * 2
print(saldo)
saldo = saldo - 30
print(saldo)
```
```python name="mostra a conta mas não guarda"
saldo = 100
print(saldo + 50)
print(saldo + 50 - 30)
print((saldo + 50 - 30) * 2)
```
```python name="só mostra o saldo no fim"
saldo = 100
saldo = saldo + 50
saldo = saldo - 30
saldo = saldo * 2
print(saldo)
```

## Passo 7 · Quiz · Variáveis e tipos

### Pergunta
Qual destes é um nome de variável válido em Python?
- [ ] `2total`
- [ ] `total geral`
- [x] `total_2`
- [ ] `class`
> Um nome pode ter letras, dígitos e sublinhado, mas não começa com dígito (`2total`), não tem espaço (`total geral`) e não pode ser uma palavra reservada (`class`).

### Pergunta
Qual é o tipo do valor `"10"`?
- [ ] `int`, porque 10 é um número inteiro
- [ ] `float`
- [x] `str`, porque está entre aspas
- [ ] `bool`
> As aspas fazem do valor um texto. `"10"` é uma string com dois caracteres; `10`, sem aspas, é que é um `int`.

### Pergunta
A variável `x` guarda 7. O que a linha abaixo faz?
```python
x = x + 1
```
- [ ] Dá erro, porque nenhum número é igual a ele mesmo mais 1
- [ ] Compara `x` com `x + 1` e responde `False`
- [x] Calcula `x + 1` com o valor atual e guarda o resultado, 8, em `x`
- [ ] Cria uma segunda variável `x`, e a primeira continua valendo 7
> O `=` é atribuição, não comparação. O Python calcula primeiro o lado direito (7 + 1) e depois guarda o resultado no nome à esquerda. O valor antigo é substituído.
