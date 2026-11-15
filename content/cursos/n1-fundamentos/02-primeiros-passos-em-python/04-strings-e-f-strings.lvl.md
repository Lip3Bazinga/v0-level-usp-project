---
slug: n1-m2-04-strings-e-f-strings
titulo: Strings e f-strings
descricao: Juntar textos, medir com len(), repetir com * e montar mensagens com f-strings e formatação de casas decimais.
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
- Concatenar e repetir strings e medir o tamanho com len()
- Montar mensagens com f-strings incluindo expressões e variáveis
- Formatar números com casas decimais fixas dentro de uma f-string
---

## Passo 1 · Leitura · Juntar, repetir e medir

Uma **string** é um texto entre aspas. Você já sabe mostrar strings com `print`; agora vai montar textos novos a partir de pedaços. Três ferramentas resolvem quase tudo.

```python
nome = "Caio"
saudacao = "Olá, " + nome + "!"
print(saudacao)
print("ha" * 3)
print(len(saudacao))
```

Saída:

```
Olá, Caio!
hahaha
10
```

**`+` junta.** Entre duas strings, o `+` não soma: ele emenda uma na outra, na ordem em que aparecem. Isso se chama **concatenação**. O Python não coloca espaço por conta própria: `"Ana" + "Souza"` dá `AnaSouza`. Se você quer um espaço, ele precisa estar dentro de alguma das aspas, como em `"Olá, "` no exemplo, ou sozinho: `"Ana" + " " + "Souza"`.

**`*` repete.** Uma string vezes um número inteiro repete o texto aquela quantidade de vezes. É útil para desenhar linhas: `"-" * 20` monta vinte traços sem que você precise contar.

**`len()` mede.** A função `len` devolve o tamanho da string: quantos caracteres ela tem. Tudo conta: letras, dígitos, espaços, vírgulas e pontos. `Olá, Caio!` tem 10 caracteres, incluindo a vírgula, o espaço e a exclamação. O resultado de `len` é um `int`, que você pode guardar em uma variável ou usar em contas.

#### Texto e número não se juntam com +

Tente emendar um texto e um número:

```python
print("Idade: " + 20)
```

O programa para com esta mensagem:

```
TypeError: can only concatenate str (not "int") to str
```

Em português: "só é possível concatenar str (não int) com str". O Python não adivinha o que você quer. Entre dois números, `+` soma; entre duas strings, `+` junta; entre uma string e um número, ele se recusa a escolher.

Há duas saídas. Uma é transformar o número em texto com `str()`: `"Idade: " + str(20)` dá `Idade: 20`. A outra, bem mais prática, é a f-string, assunto do Passo 3 desta lição.

Note que as aspas continuam decidindo o tipo: `"2" + "2"` é `"22"`, porque são dois textos, e `2 + 2` é `4`.

## Passo 2 · Exercício · Nome completo

O cadastro de uma aluna guarda o nome e o sobrenome em variáveis separadas. Você vai montar o nome completo, medir o tamanho dele e mostrar o resultado.

A saída do programa deve ser exatamente esta:

```
Ana Souza
```

Monte o texto a partir das duas variáveis, com `+`, e deixe que o `len` faça a contagem.

### Instruções
1. Crie `completo` juntando `nome`, um espaço e `sobrenome`.
   Dica: o espaço também é uma string e vai entre aspas.
2. Crie `tamanho` com a quantidade de caracteres de `completo`, calculada com `len`.
3. Mostre `completo` com `print`.

### Código inicial
```python
nome = "Ana"
sobrenome = "Souza"

# Monte completo, calcule tamanho e mostre completo
```

### Solução
```python
nome = "Ana"
sobrenome = "Souza"

# Monte completo, calcule tamanho e mostre completo
completo = nome + " " + sobrenome
tamanho = len(completo)
print(completo)
```

### Dicas
1. `+` emenda as strings exatamente como estão: o espaço não aparece sozinho.
2. `" "` é uma string com um espaço. Ela vai no meio: `nome + " " + sobrenome`.
3. `len(completo)` conta todos os caracteres, inclusive o espaço. Guarde o resultado em `tamanho`.

### Verificação
```json
[
  { "id": "completo", "checkpoint": 1, "kind": "variable", "variable": "completo", "expected": "Ana Souza", "type": "str",
    "name": "completo tem nome, um espaço e sobrenome", "hint": "Confira se há exatamente um espaço entre o nome e o sobrenome." },
  { "id": "tamanho", "checkpoint": 2, "kind": "variable", "variable": "tamanho", "expected": 9, "type": "int",
    "name": "tamanho é a quantidade de caracteres de completo", "hint": "Use len(completo). O espaço também é um caractere." },
  { "id": "usa-len", "checkpoint": 2, "kind": "source", "rule": { "type": "calls", "name": "len" },
    "name": "O tamanho é calculado com len()", "hint": "Não conte à mão: chame len com a variável completo." },
  { "id": "mostra", "checkpoint": 3, "kind": "io", "stdin": "", "expected_stdout": "Ana Souza",
    "name": "Mostra o nome completo", "hint": "A saída tem uma linha só, com o valor de completo." }
]
```

### Soluções erradas
```python name="sem o espaço"
nome = "Ana"
sobrenome = "Souza"
completo = nome + sobrenome
tamanho = len(completo)
print(completo)
```
```python name="tamanho contado à mão, sem o espaço"
nome = "Ana"
sobrenome = "Souza"
completo = nome + " " + sobrenome
tamanho = 8
print(completo)
```
```python name="não mostra o resultado"
nome = "Ana"
sobrenome = "Souza"
completo = nome + " " + sobrenome
tamanho = len(completo)
```
```python name="mostra o tamanho em vez do nome"
nome = "Ana"
sobrenome = "Souza"
completo = nome + " " + sobrenome
tamanho = len(completo)
print(tamanho)
```

## Passo 3 · Leitura · f-strings

Montar mensagens com `+` cansa logo: muitas aspas, espaços fáceis de esquecer e `str()` em volta de cada número. A **f-string** resolve isso. Coloque a letra `f` colada antes das aspas e escreva o texto normalmente. Onde quiser um valor, abra chaves e ponha o nome da variável dentro:

```python
nome = "Davi"
idade = 19
print(f"{nome} tem {idade} anos")
```

```
Davi tem 19 anos
```

O Python troca cada `{...}` pelo valor correspondente. Não importa se é texto ou número: a f-string converte sozinha, sem `TypeError`. O que está fora das chaves aparece exatamente como foi escrito, inclusive os espaços.

#### Contas dentro das chaves

Entre as chaves cabe qualquer conta, não só um nome. O Python calcula primeiro e depois coloca o resultado no texto:

```python
preco = 12.5
print(f"Três cadernos custam {preco * 3}")
```

```
Três cadernos custam 37.5
```

#### Casas decimais fixas

O resultado saiu `37.5`, mas um preço se escreve com duas casas. Para fixar o número de casas, acrescente `:.2f` depois da expressão, **ainda dentro das chaves**:

```python
print(f"Total: R$ {preco * 3:.2f}")
print(f"Um terço: {1 / 3:.2f}")
```

```
Total: R$ 37.50
Um terço: 0.33
```

Leia `:.2f` como "mostre com 2 casas depois do ponto". O valor é arredondado só na exibição; a variável não muda. Trocando o 2, você escolhe outra quantidade: `:.1f` mostra uma casa. O `f` do final desse código quer dizer número com casas decimais e não tem relação com o `f` de antes das aspas.

Repare no separador: o Python escreve os decimais com **ponto**. Neste módulo, um total de R\$ 37,50 aparece na tela como `R$ 37.50`.

#### Dois enganos comuns

- **Esquecer o `f`.** Sem ele, as chaves são texto comum: `print("{nome} tem {idade} anos")` mostra `{nome} tem {idade} anos`, sem erro nenhum.
- **Pôr o `:.2f` fora das chaves.** `f"{preco}:.2f"` mostra `12.5:.2f`. O formato só vale do lado de dentro.

## Passo 4 · Previsão · O que a f-string monta

Leia o programa sem executar e digite exatamente o que ele mostra, linha por linha. Atenção ao número de casas decimais de cada valor.

### Código
```python
nome = "Bia"
nota = 8.5
print(f"{nome} tirou {nota}")
print(f"Dobro: {nota * 2}")
print(f"Preço: {12.5:.2f}")
print("-" * 10)
```

### Dicas
1. O que está entre chaves é calculado antes de virar texto. Um `float` vezes 2 continua sendo `float`.
2. `:.2f` sempre mostra duas casas, mesmo que a segunda seja zero.

### Saída esperada
```text
Bia tirou 8.5
Dobro: 17.0
Preço: 12.50
----------
```

## Passo 5 · Exercício · Recibo
modo: lacunas

Uma papelaria imprime uma linha de recibo para cada produto vendido: o nome, a quantidade e o total. Os dados da venda já estão em três variáveis, nas três primeiras linhas, e a f-string está montada pela metade.

Complete as três lacunas para que a saída seja exatamente esta:

```
Caderno x3: R$ 37.50
```

Use as variáveis dentro das chaves, sem digitar os valores prontos: a correção troca os dados das três primeiras linhas por outra venda e roda o programa de novo, e o recibo tem de mudar junto. O total é o preço multiplicado pela quantidade.

### Instruções
1. Complete as duas primeiras lacunas com a variável que guarda o nome do produto e a que guarda a quantidade.
2. Complete a terceira lacuna com a conta do total. O `:.2f` que já está lá cuida das duas casas decimais.
   Dica: dentro das chaves cabe uma multiplicação.

### Código inicial
```python
produto = "Caderno"
preco = 12.5
quantidade = 3
print(f"{___} x{___}: R$ {___:.2f}")
```

### Solução
```python
produto = "Caderno"
preco = 12.5
quantidade = 3
print(f"{produto} x{quantidade}: R$ {preco * quantidade:.2f}")
```

### Dicas
1. Dentro das chaves vai o nome de uma variável, sem aspas.
2. Dentro das chaves também cabe uma conta. O `:.2f` vem depois dela, ainda dentro das chaves.
3. A última lacuna é `preco * quantidade`.

### Verificação
```json
[
  {"id": "usa-f-string", "checkpoint": 1, "kind": "source", "rule": {"type": "uses", "construct": "f_string"}, "name": "O recibo é montado com uma f-string", "hint": "Mantenha o f antes das aspas: sem ele, as chaves viram texto comum."},
  {"id": "produto-e-quantidade", "checkpoint": 1, "kind": "io", "stdin": "", "expected_stdout": "^Caderno x3: R\\$ ", "match": "regex", "name": "Começa com o produto e a quantidade", "hint": "A primeira lacuna é a variável do nome do produto; a segunda, a da quantidade."},
  {"id": "produto-e-quantidade-outra-venda", "checkpoint": 1, "kind": "expr", "setup": "import re\n_fonte = open(\"main.py\", encoding=\"utf-8\").read()\n_trocas = 0\n_fonte, _n = re.subn(r\"(?m)^produto[ ]*=.*$\", \"produto = \\\"Mochila\\\"\", _fonte, count=1)\n_trocas += _n\n_fonte, _n = re.subn(r\"(?m)^preco[ ]*=.*$\", \"preco = 89.9\", _fonte, count=1)\n_trocas += _n\n_fonte, _n = re.subn(r\"(?m)^quantidade[ ]*=.*$\", \"quantidade = 2\", _fonte, count=1)\n_trocas += _n\n_ns = {}\nexec(compile(_fonte, \"main.py\", \"exec\"), _ns)", "expr": "_trocas", "expected": 3, "expected_stdout": "^Mochila x2: R\\$ ", "match": "regex", "name": "O produto e a quantidade mudam com a venda", "hint": "Use as variáveis dentro das chaves, e não o texto Caderno nem o número 3. A correção troca os dados da venda e roda o programa de novo."},
  {"id": "recibo", "checkpoint": 2, "kind": "io", "stdin": "", "expected_stdout": "Caderno x3: R$ 37.50\n", "match": "exact", "name": "Recibo completo, com o total em duas casas", "hint": "O total é o preço vezes a quantidade, mostrado com duas casas decimais."},
  {"id": "recibo-outra-venda", "checkpoint": 2, "kind": "expr", "setup": "import re\n_fonte = open(\"main.py\", encoding=\"utf-8\").read()\n_trocas = 0\n_fonte, _n = re.subn(r\"(?m)^produto[ ]*=.*$\", \"produto = \\\"Mochila\\\"\", _fonte, count=1)\n_trocas += _n\n_fonte, _n = re.subn(r\"(?m)^preco[ ]*=.*$\", \"preco = 89.9\", _fonte, count=1)\n_trocas += _n\n_fonte, _n = re.subn(r\"(?m)^quantidade[ ]*=.*$\", \"quantidade = 2\", _fonte, count=1)\n_trocas += _n\n_ns = {}\nexec(compile(_fonte, \"main.py\", \"exec\"), _ns)", "expr": "_trocas", "expected": 3, "expected_stdout": "Mochila x2: R$ 179.80\n", "match": "exact", "name": "O total é calculado para outra venda", "hint": "Escreva a conta preço vezes quantidade dentro das chaves: um total digitado pronto só vale para uma venda."}
]
```

### Soluções erradas
```python name="total sem as duas casas"
produto = "Caderno"
preco = 12.5
quantidade = 3
print(f"{produto} x{quantidade}: R$ {preco * quantidade}")
```
```python name="sem o f antes das aspas"
produto = "Caderno"
preco = 12.5
quantidade = 3
print("{produto} x{quantidade}: R$ {preco * quantidade:.2f}")
```
```python name="preço unitário no lugar do total"
produto = "Caderno"
preco = 12.5
quantidade = 3
print(f"{produto} x{quantidade}: R$ {preco:.2f}")
```
```python name="produto e quantidade trocados"
produto = "Caderno"
preco = 12.5
quantidade = 3
print(f"{quantidade} x{produto}: R$ {preco * quantidade:.2f}")
```
```python name="total digitado pronto"
produto = "Caderno"
preco = 12.5
quantidade = 3
print(f"{produto} x{quantidade}: R$ {37.5:.2f}")
```

## Passo 6 · Quiz · Strings

### Pergunta
O que acontece ao executar esta linha?
```python
print("Idade: " + 20)
```
- [ ] Mostra `Idade: 20`
- [ ] Mostra `Idade: + 20`
- [x] Dá `TypeError`, porque `+` não junta texto com número
- [ ] Dá `SyntaxError`, porque faltam aspas no 20
> Entre uma `str` e um `int`, o `+` não sabe se deve juntar ou somar, e o programa para com `TypeError: can only concatenate str (not "int") to str`. Funciona com `"Idade: " + str(20)` ou com a f-string `f"Idade: {20}"`.

### Pergunta
Qual é o valor de `f"{2 + 3}"`?
- [ ] O texto `"2 + 3"`
- [ ] O número `5`, do tipo `int`
- [x] O texto `"5"`
- [ ] O texto `"{2 + 3}"`
> O Python calcula a conta dentro das chaves e coloca o resultado no texto. Toda f-string é uma `str`: o valor é o texto `"5"`, não o número 5. Sem o `f`, aí sim as chaves ficariam como estão.

## Passo 7 · Exercício · Título decorado

Relatórios em modo texto costumam destacar o título com uma linha de sinais em cima e outra embaixo, do mesmo tamanho do título. Para o título `RELATÓRIO DE NOTAS`, que tem 18 caracteres, fica assim:

```
==================
RELATÓRIO DE NOTAS
==================
```

A primeira linha do programa já está pronta e guarda o título na variável `titulo`: deixe-a como está.

A correção troca o título da primeira linha por outros, de tamanhos diferentes, e roda o programa de novo. Por isso não dá para contar os sinais à mão: use `len` para medir o título e a repetição de strings para montar a linha.

### Instruções
1. Mostre uma linha de sinais de igual (`=`) com o mesmo número de caracteres do título.
   Dica: `len(titulo)` é o tamanho do título, e `*` repete um texto.
2. Na linha seguinte, mostre o título, usando a variável.
3. Feche com outra linha de sinais, igual à primeira.

### Código inicial
```python
titulo = "RELATÓRIO DE NOTAS"

# Mostre a linha de sinais, o título e a linha de sinais de novo
```

### Solução
```python
titulo = "RELATÓRIO DE NOTAS"

# Mostre a linha de sinais, o título e a linha de sinais de novo
print("=" * len(titulo))
print(titulo)
print("=" * len(titulo))
```

### Dicas
1. `*` entre uma string e um número repete o texto, e `len(titulo)` é o número de caracteres do título.
2. São três `print`: a linha de sinais, o título e a linha de sinais outra vez.
3. A linha decorada é `print("=" * len(titulo))`.

### Verificação
```json
[
  {"id": "primeira-linha", "checkpoint": 1, "kind": "io", "stdin": "", "expected_stdout": "^={18}\\n", "match": "regex", "name": "Começa com uma linha de sinais do tamanho do título", "hint": "Nem um sinal a mais nem a menos: deixe o len e a repetição de strings contarem por você."},
  {"id": "primeira-linha-titulo-curto", "checkpoint": 1, "kind": "expr", "setup": "import re\n_fonte = open(\"main.py\", encoding=\"utf-8\").read()\n_trocas = 0\n_fonte, _n = re.subn(r\"(?m)^titulo[ ]*=.*$\", \"titulo = \\\"Notas\\\"\", _fonte, count=1)\n_trocas += _n\n_ns = {}\nexec(compile(_fonte, \"main.py\", \"exec\"), _ns)", "expr": "_trocas", "expected": 1, "expected_stdout": "^={5}\\n", "match": "regex", "name": "A linha de sinais acompanha um título curto", "hint": "O número de sinais vem de len(titulo), e não de um número fixo. A correção troca o título e roda o programa de novo."},
  {"id": "titulo", "checkpoint": 2, "kind": "io", "stdin": "", "expected_stdout": "\\nRELATÓRIO DE NOTAS\\n", "match": "regex", "name": "O título vem na segunda linha", "hint": "Mostre a variável titulo, sozinha na linha."},
  {"id": "titulo-outro", "checkpoint": 2, "kind": "expr", "setup": "import re\n_fonte = open(\"main.py\", encoding=\"utf-8\").read()\n_trocas = 0\n_fonte, _n = re.subn(r\"(?m)^titulo[ ]*=.*$\", \"titulo = \\\"Notas\\\"\", _fonte, count=1)\n_trocas += _n\n_ns = {}\nexec(compile(_fonte, \"main.py\", \"exec\"), _ns)", "expr": "_trocas", "expected": 1, "expected_stdout": "\\nNotas\\n", "match": "regex", "name": "A segunda linha mostra o título que estiver na variável", "hint": "O programa precisa funcionar com qualquer título: use a variável titulo e len(titulo), e deixe a primeira linha como está. A correção troca o título e roda o programa de novo."},
  {"id": "completo", "checkpoint": 3, "kind": "io", "stdin": "", "expected_stdout": "==================\nRELATÓRIO DE NOTAS\n==================\n", "match": "exact", "name": "As três linhas, iguais às do enunciado", "hint": "São três linhas: sinais, título, sinais. As duas linhas de sinais têm o mesmo tamanho."},
  {"id": "completo-outro-titulo", "checkpoint": 3, "kind": "expr", "setup": "import re\n_fonte = open(\"main.py\", encoding=\"utf-8\").read()\n_trocas = 0\n_fonte, _n = re.subn(r\"(?m)^titulo[ ]*=.*$\", \"titulo = \\\"Lista de presença da turma A\\\"\", _fonte, count=1)\n_trocas += _n\n_ns = {}\nexec(compile(_fonte, \"main.py\", \"exec\"), _ns)", "expr": "_trocas", "expected": 1, "expected_stdout": "============================\nLista de presença da turma A\n============================\n", "match": "exact", "name": "As três linhas, com outro título", "hint": "O programa precisa funcionar com qualquer título: use a variável titulo e len(titulo), e deixe a primeira linha como está. A correção troca o título e roda o programa de novo."}
]
```

### Soluções erradas
```python name="sinais digitados à mão"
titulo = "RELATÓRIO DE NOTAS"
print("==================")
print(titulo)
print("==================")
```
```python name="número fixo de sinais"
titulo = "RELATÓRIO DE NOTAS"
print("=" * 18)
print(titulo)
print("=" * 18)
```
```python name="título digitado pronto"
titulo = "RELATÓRIO DE NOTAS"
print("=" * len(titulo))
print("RELATÓRIO DE NOTAS")
print("=" * len(titulo))
```
```python name="sem a linha de baixo"
titulo = "RELATÓRIO DE NOTAS"
print("=" * len(titulo))
print(titulo)
```
```python name="repetição dentro das aspas"
titulo = "RELATÓRIO DE NOTAS"
print("= * len(titulo)")
print(titulo)
print("= * len(titulo)")
```
