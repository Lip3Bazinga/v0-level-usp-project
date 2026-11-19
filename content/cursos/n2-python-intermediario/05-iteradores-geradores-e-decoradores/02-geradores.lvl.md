---
slug: n2-m5-02-geradores
titulo: Geradores com yield
descricao: 'Funções que pausam e retomam: produzir sequências sob demanda, ler arquivos grandes e encadear etapas.'
dificuldade: intermediario
tipo: guiada
runtime: python
bibliotecas: []
xp: 120
tempo_min: 50
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Escrever funções geradoras com yield e explicar o estado suspenso entre chamadas
- Processar arquivos e sequências grandes de forma preguiçosa (lazy)
- Encadear geradores em um pipeline (ler → filtrar → transformar)
---

## Passo 1 · Leitura · Uma função que pausa

O servidor da biblioteca grava um registro por empréstimo, e o arquivo de um ano tem um milhão de linhas. Para somar as multas, a primeira ideia é uma função que monta uma lista:

```python
def ler_multas(caminho):
    multas = []
    with open(caminho, encoding="utf-8") as arquivo:
        for linha in arquivo:
            multas.append(float(linha))
    return multas
```

Ela funciona, mas guarda o milhão de valores na memória ao mesmo tempo, só para somá-los um a um depois. Na lição anterior você viu um jeito melhor: um iterador que entrega um item por vez. Escrever uma classe com `__iter__` e `__next__` para isso dá trabalho. A palavra `yield` faz o mesmo numa função comum:

```python
def ler_multas(caminho):
    with open(caminho, encoding="utf-8") as arquivo:
        for linha in arquivo:
            yield float(linha)
```

Uma função com `yield` no corpo é uma **função geradora**. Chamá-la **não executa o corpo**: ela devolve na hora um objeto **gerador**, que é um iterador. A cada `next`, o corpo roda até o próximo `yield`, entrega o valor e fica **suspenso** ali, com as variáveis locais guardadas. O `next` seguinte continua da linha depois do `yield`. Quando o corpo termina, o gerador levanta `StopIteration`, e o `for` para.

Agora `sum(ler_multas("multas.txt"))` mantém um valor por vez na memória, seja o arquivo de dez linhas ou de dez milhões.

No visualizador, observe o salto: cada `next(g)` volta para dentro de `pares_ate`, roda até o `yield` e sai de novo com o valor.

```python visualizar
def pares_ate(n):
    for numero in range(0, n + 1, 2):
        yield numero


g = pares_ate(4)
primeiro = next(g)
segundo = next(g)
resto = list(g)
print(primeiro, segundo, resto)
```

#### O erro comum: esperar uma lista

O gerador não é uma lista: não tem tamanho, nem índice, e se esgota como qualquer iterador.

```python
pares_ate(10)[0]
```

```
TypeError: 'generator' object is not subscriptable
```

Se você precisa de índice ou de percorrer duas vezes, materialize com `list(pares_ate(10))`, sabendo que aí todos os itens vão para a memória.

## Passo 2 · Previsão · Quando o corpo roda

A função geradora abaixo imprime uma mensagem em cada ponto do caminho. Leia o programa sem executar e digite exatamente o que ele imprime. A pergunta central: em que momento cada `print` de dentro da função acontece?

### Código
```python
def contar(n):
    print("começou")
    for i in range(n):
        print("vai entregar", i)
        yield i
    print("acabou")


g = contar(2)
print("criado")
print(next(g))
print(list(g))
```

### Dicas
1. Chamar `contar(2)` só cria o gerador: nenhuma linha do corpo roda ainda.
2. Cada `next` roda o corpo até o próximo `yield` e para ali.
3. `list(g)` chama `next` até o fim, e o fim inclui a linha depois do laço.

### Saída esperada
```text
criado
começou
vai entregar 0
0
vai entregar 1
acabou
[1]
```

## Passo 3 · Exercício · Pares e Fibonacci sob demanda
modo: lacunas

Duas funções geradoras:

- `pares_ate(n)` produz os pares de 0 até `n`, incluindo `n` quando ele é par: `list(pares_ate(10))` é `[0, 2, 4, 6, 8, 10]`.
- `fibonacci()` produz a sequência de Fibonacci **sem fim**: 0, 1, 1, 2, 3, 5, 8… Cada termo é a soma dos dois anteriores. Como nunca termina, quem consome escolhe quantos termos quer, com `islice` ou um `break`.

Complete as quatro lacunas (`___`).

### Instruções
1. Em `pares_ate`, faça o `range` alcançar `n` e entregue cada número com a palavra que transforma a função num gerador.
2. Em `fibonacci`, faça o laço nunca terminar.
3. Avance o par `a, b` para os dois termos seguintes.
   Dica: o novo `a` é o antigo `b`; o novo `b` é a soma dos dois antigos.

### Código inicial
```python
def pares_ate(n):
    for numero in range(0, ___, 2):
        ___ numero


def fibonacci():
    a, b = 0, 1
    while ___:
        yield a
        a, b = ___, a + b
```

### Solução
```python
def pares_ate(n):
    for numero in range(0, n + 1, 2):
        yield numero


def fibonacci():
    a, b = 0, 1
    while True:
        yield a
        a, b = b, a + b
```

### Dicas
1. `range(0, n, 2)` para antes de `n`; o fim do `range` nunca entra.
2. `return` encerra a função na primeira volta; `yield` entrega e pausa.
3. A atribuição `a, b = x, y` calcula os dois lados com os valores antigos antes de trocar.

### Verificação
```json
[
  { "id": "pares-gerador", "checkpoint": 1, "kind": "expr", "expr": "pares_ate(10)", "type": "generator",
    "name": "pares_ate devolve um gerador", "hint": "Use yield, não return nem print." },
  { "id": "pares-10", "checkpoint": 1, "kind": "expr", "expr": "list(pares_ate(10))", "expected": [0, 2, 4, 6, 8, 10],
    "name": "pares_ate(10) inclui o 10", "hint": "O range precisa ir até n inclusive." },
  { "id": "pares-7", "checkpoint": 1, "kind": "expr", "expr": "list(pares_ate(7))", "expected": [0, 2, 4, 6],
    "name": "pares_ate(7) para no 6" },
  { "id": "pares-0", "checkpoint": 1, "kind": "expr", "expr": "list(pares_ate(0))", "expected": [0],
    "name": "pares_ate(0) produz só o 0" },
  { "id": "fib-gerador", "checkpoint": 2, "kind": "expr", "expr": "fibonacci()", "type": "generator",
    "name": "fibonacci devolve um gerador" },
  { "id": "fib-longe", "checkpoint": 2, "kind": "expr", "setup": "from itertools import islice",
    "expr": "list(islice(fibonacci(), 30, 32))", "expected": [832040, 1346269],
    "name": "fibonacci continua depois do 30º termo", "hint": "O laço não pode ter condição de parada." },
  { "id": "fib-10", "checkpoint": 3, "kind": "expr", "setup": "from itertools import islice",
    "expr": "list(islice(fibonacci(), 10))", "expected": [0, 1, 1, 2, 3, 5, 8, 13, 21, 34],
    "name": "Os 10 primeiros termos de Fibonacci", "hint": "O novo a é o b antigo." },
  { "id": "fib-next", "checkpoint": 3, "kind": "expr", "setup": "g = fibonacci()\nfor _ in range(6):\n    next(g)",
    "expr": "[next(g), next(g)]", "expected": [8, 13],
    "name": "O gerador guarda a posição entre chamadas de next" }
]
```

### Soluções erradas
```python name="range para antes de n"
def pares_ate(n):
    for numero in range(0, n, 2):
        yield numero


def fibonacci():
    a, b = 0, 1
    while True:
        yield a
        a, b = b, a + b
```
```python name="return no lugar de yield"
def pares_ate(n):
    for numero in range(0, n + 1, 2):
        return numero


def fibonacci():
    a, b = 0, 1
    while True:
        yield a
        a, b = b, a + b
```
```python name="fibonacci com limite fixo"
def pares_ate(n):
    for numero in range(0, n + 1, 2):
        yield numero


def fibonacci():
    a, b = 0, 1
    while a < 1000:
        yield a
        a, b = b, a + b
```
```python name="avança só o b"
def pares_ate(n):
    for numero in range(0, n + 1, 2):
        yield numero


def fibonacci():
    a, b = 0, 1
    while True:
        yield a
        a, b = a, a + b
```

## Passo 4 · Leitura · Pipeline de geradores

Um gerador pode consumir outro. Encadeando funções pequenas, cada uma com uma tarefa, você monta uma **linha de produção** (*pipeline*) em que os itens passam um a um por todas as etapas:

```python
def ler_linhas(caminho):
    with open(caminho, encoding="utf-8") as arquivo:
        for linha in arquivo:
            yield linha.strip()


def so_atrasos(linhas):
    for linha in linhas:
        if linha.startswith("ATRASO"):
            yield linha


def valores(linhas):
    for linha in linhas:
        yield float(linha.split(";")[2])


total = sum(valores(so_atrasos(ler_linhas("emprestimos.log"))))
```

Quem puxa é o `sum`. Ele pede um valor a `valores`, que pede uma linha a `so_atrasos`, que pede linhas a `ler_linhas` até achar um atraso. Nenhuma etapa guarda listas: em cada instante, só uma linha está na memória, por maior que seja o arquivo. E cada função pode ser testada sozinha com uma lista pequena, porque uma lista também é iterável.

#### yield from

Quando um gerador só repassa os itens de outro iterável, `yield from` substitui o laço:

```python
def todas_as_notas(turmas):
    for turma in turmas:
        yield from turma      # o mesmo que: for nota in turma: yield nota
```

Geradores também têm um método `send`, que envia um valor para dentro do gerador suspenso. Ele é pouco usado no dia a dia e não é necessário aqui.

#### Os dois erros comuns

**`return valor` dentro do gerador.** Num gerador, `return` só **encerra**. O valor não chega a quem percorre: `list` de um gerador que faz `return 10` sem nenhum `yield` antes é `[]`.

**Percorrer o mesmo gerador duas vezes.** O pipeline acima é de uma passagem só. Uma função que primeiro conta os registros e depois os soma recebe um gerador já esgotado na segunda passada, e soma zero sem erro nenhum. Se a etapa precisa de duas passadas, ela deve receber uma lista, ou calcular as duas coisas na mesma volta.

## Passo 5 · Exercício · ler_registros: um CSV sob demanda

O arquivo de vendas da cantina tem um cabeçalho e uma venda por linha:

```text
vendedor,produto,valor
Ana,caderno,12.50
Bia,caneta,3.00
```

Escreva a função geradora `ler_registros(caminho)`, que lê o arquivo e entrega **um dicionário por linha**, com as chaves do cabeçalho:

```python
for registro in ler_registros("vendas.csv"):
    print(registro)
# {'vendedor': 'Ana', 'produto': 'caderno', 'valor': '12.50'}
# {'vendedor': 'Bia', 'produto': 'caneta', 'valor': '3.00'}
```

Os valores ficam como texto. Linhas em branco são ignoradas. Uma linha com quantidade de campos diferente do cabeçalho levanta `ValueError` com o número dela no arquivo (o cabeçalho é a linha 1), por exemplo `"linha 4: esperava 3 campos"`. Como é um gerador, as linhas boas antes do defeito são entregues normalmente; o erro só aparece quando a leitura chega nele.

Para testar no seu código, crie um arquivo antes de chamar a função, com `open("vendas.csv", "w", encoding="utf-8")`.

### Instruções
1. `ler_registros(caminho)` é uma função geradora que lê o cabeçalho e entrega um dicionário por linha, com os valores sem a quebra de linha.
   Dica: `dict(zip(colunas, valores))` monta o dicionário.
2. Pule as linhas em branco.
3. Linha com quantidade errada de campos levanta `ValueError` com `linha N`, sendo N o número da linha no arquivo.
   Dica: `enumerate(arquivo, start=2)` numera as linhas depois do cabeçalho.
4. Leia de forma preguiçosa: cada registro só é lido quando é pedido.

### Código inicial
```python
def ler_registros(caminho):
    pass
```

### Solução
```python
def ler_registros(caminho):
    with open(caminho, encoding="utf-8") as arquivo:
        colunas = arquivo.readline().strip().split(",")
        for numero, linha in enumerate(arquivo, start=2):
            linha = linha.strip()
            if not linha:
                continue
            valores = linha.split(",")
            if len(valores) != len(colunas):
                raise ValueError(f"linha {numero}: esperava {len(colunas)} campos")
            yield dict(zip(colunas, valores))
```

### Dicas
1. Leia a primeira linha com `readline()` antes do laço; o `for` sobre o arquivo continua da segunda.
2. `linha.strip()` tira a quebra de linha do fim; sem isso o último valor vem com `\n`.
3. Não guarde os registros numa lista: entregue cada um com `yield` assim que estiver pronto.

### Verificação
```json
[
  { "id": "gerador", "checkpoint": 1, "kind": "expr",
    "setup": "with open(\"vendas.csv\", \"w\", encoding=\"utf-8\") as a:\n    a.write(\"vendedor,produto,valor\\nAna,caderno,12.50\\n\")",
    "expr": "ler_registros(\"vendas.csv\")", "type": "generator",
    "name": "ler_registros devolve um gerador", "hint": "Use yield para entregar cada registro." },
  { "id": "registros", "checkpoint": 1, "kind": "expr",
    "setup": "with open(\"vendas.csv\", \"w\", encoding=\"utf-8\") as a:\n    a.write(\"vendedor,produto,valor\\nAna,caderno,12.50\\nBia,caneta,3.00\\nAna,mochila,89.90\\n\")",
    "expr": "list(ler_registros(\"vendas.csv\"))",
    "expected": [{ "vendedor": "Ana", "produto": "caderno", "valor": "12.50" },
                 { "vendedor": "Bia", "produto": "caneta", "valor": "3.00" },
                 { "vendedor": "Ana", "produto": "mochila", "valor": "89.90" }],
    "name": "Um dicionário por linha, com as chaves do cabeçalho", "hint": "Tire a quebra de linha antes de separar os campos." },
  { "id": "outro-cabecalho", "checkpoint": 1, "kind": "expr",
    "setup": "with open(\"notas.csv\", \"w\", encoding=\"utf-8\") as a:\n    a.write(\"aluno,nota\\nCaio,7\\nEva,10\")",
    "expr": "list(ler_registros(\"notas.csv\"))",
    "expected": [{ "aluno": "Caio", "nota": "7" }, { "aluno": "Eva", "nota": "10" }],
    "name": "Funciona com outro cabeçalho e sem quebra de linha no fim" },
  { "id": "brancas", "checkpoint": 2, "kind": "expr",
    "setup": "with open(\"vendas.csv\", \"w\", encoding=\"utf-8\") as a:\n    a.write(\"vendedor,valor\\n\\nAna,5\\n\\n\\nBia,7\\n\\n\")",
    "expr": "list(ler_registros(\"vendas.csv\"))",
    "expected": [{ "vendedor": "Ana", "valor": "5" }, { "vendedor": "Bia", "valor": "7" }],
    "name": "Linhas em branco são ignoradas", "hint": "Uma linha vazia depois do strip deve ser pulada." },
  { "id": "so-cabecalho", "checkpoint": 2, "kind": "expr",
    "setup": "with open(\"vazio.csv\", \"w\", encoding=\"utf-8\") as a:\n    a.write(\"vendedor,valor\\n\")",
    "expr": "list(ler_registros(\"vazio.csv\"))", "expected": [],
    "name": "Arquivo só com cabeçalho não produz registros" },
  { "id": "linha-ruim", "checkpoint": 3, "kind": "expr",
    "setup": "with open(\"quebrado.csv\", \"w\", encoding=\"utf-8\") as a:\n    a.write(\"vendedor,produto,valor\\nAna,caderno,12.50\\n\\nBia,caneta\\nCaio,lapis,1.00\\n\")",
    "expr": "list(ler_registros(\"quebrado.csv\"))", "raises": "ValueError", "message_contains": "linha 4",
    "name": "Linha com campos faltando levanta ValueError com o número da linha",
    "hint": "Conte as linhas do arquivo, inclusive o cabeçalho e as linhas em branco." },
  { "id": "preguicoso", "checkpoint": 4, "kind": "expr",
    "setup": "with open(\"quebrado.csv\", \"w\", encoding=\"utf-8\") as a:\n    a.write(\"vendedor,produto,valor\\nAna,caderno,12.50\\n\\nBia,caneta\\n\")\ng = ler_registros(\"quebrado.csv\")",
    "expr": "next(g)", "expected": { "vendedor": "Ana", "produto": "caderno", "valor": "12.50" },
    "name": "O primeiro registro sai antes de a leitura chegar à linha com defeito",
    "hint": "Entregue cada registro com yield em vez de montar uma lista inteira." },
  { "id": "usa-yield", "checkpoint": 4, "kind": "source", "rule": { "type": "uses", "construct": "yield", "function": "ler_registros" },
    "name": "ler_registros usa yield" }
]
```

### Soluções erradas
```python name="monta a lista inteira antes de devolver"
def ler_registros(caminho):
    registros = []
    with open(caminho, encoding="utf-8") as arquivo:
        colunas = arquivo.readline().strip().split(",")
        for numero, linha in enumerate(arquivo, start=2):
            linha = linha.strip()
            if not linha:
                continue
            valores = linha.split(",")
            if len(valores) != len(colunas):
                raise ValueError(f"linha {numero}: esperava {len(colunas)} campos")
            registros.append(dict(zip(colunas, valores)))
    return registros
```
```python name="não tira a quebra de linha"
def ler_registros(caminho):
    with open(caminho, encoding="utf-8") as arquivo:
        colunas = arquivo.readline().strip().split(",")
        for numero, linha in enumerate(arquivo, start=2):
            if not linha.strip():
                continue
            valores = linha.split(",")
            if len(valores) != len(colunas):
                raise ValueError(f"linha {numero}: esperava {len(colunas)} campos")
            yield dict(zip(colunas, valores))
```
```python name="não pula as linhas em branco"
def ler_registros(caminho):
    with open(caminho, encoding="utf-8") as arquivo:
        colunas = arquivo.readline().strip().split(",")
        for numero, linha in enumerate(arquivo, start=2):
            valores = linha.strip().split(",")
            if len(valores) != len(colunas):
                raise ValueError(f"linha {numero}: esperava {len(colunas)} campos")
            yield dict(zip(colunas, valores))
```
```python name="numera as linhas a partir de 1"
def ler_registros(caminho):
    with open(caminho, encoding="utf-8") as arquivo:
        colunas = arquivo.readline().strip().split(",")
        for numero, linha in enumerate(arquivo, start=1):
            linha = linha.strip()
            if not linha:
                continue
            valores = linha.split(",")
            if len(valores) != len(colunas):
                raise ValueError(f"linha {numero}: esperava {len(colunas)} campos")
            yield dict(zip(colunas, valores))
```

## Passo 6 · Exercício · Filtrar e somar em linha de produção

Continue o seu código. Agora monte o pipeline que responde "quanto cada vendedor vendeu", sem nunca guardar a lista de vendas:

```python
total_do_vendedor("vendas.csv", "Ana")   # 102.4 (12.50 + 89.90)
```

Escreva três funções e mantenha a `ler_registros` do passo anterior:

- `filtrar(registros, campo, valor)`: função geradora que entrega só os registros em que `registro[campo] == valor`.
- `somar_campo(registros, campo)`: devolve a soma, como `float`, de `float(registro[campo])` para todos os registros. Ela precisa funcionar com um gerador, que só pode ser percorrido uma vez.
- `total_do_vendedor(caminho, vendedor)`: encadeia as três funções e devolve o total do vendedor.

### Instruções
1. `filtrar` é uma função geradora e entrega os registros que combinam, um a um, sem ler à frente.
2. `somar_campo` soma o campo convertido para `float` numa única passada, e devolve `0.0` quando não há registros.
3. `total_do_vendedor` liga `ler_registros` → `filtrar` → `somar_campo`.

### Solução
```python
def ler_registros(caminho):
    with open(caminho, encoding="utf-8") as arquivo:
        colunas = arquivo.readline().strip().split(",")
        for numero, linha in enumerate(arquivo, start=2):
            linha = linha.strip()
            if not linha:
                continue
            valores = linha.split(",")
            if len(valores) != len(colunas):
                raise ValueError(f"linha {numero}: esperava {len(colunas)} campos")
            yield dict(zip(colunas, valores))


def filtrar(registros, campo, valor):
    for registro in registros:
        if registro[campo] == valor:
            yield registro


def somar_campo(registros, campo):
    total = 0.0
    for registro in registros:
        total += float(registro[campo])
    return total


def total_do_vendedor(caminho, vendedor):
    return somar_campo(filtrar(ler_registros(caminho), "vendedor", vendedor), "valor")
```

### Dicas
1. `filtrar` tem a mesma forma do `so_atrasos` da leitura: um `for`, um `if` e um `yield`.
2. Em `somar_campo`, não use `len(...)` nem `list(...)` antes de somar: com um gerador, a soma encontraria o gerador vazio.
3. Leia `total_do_vendedor` de dentro para fora: primeiro os registros, depois o filtro, por último a soma.

### Verificação
```json
[
  { "id": "filtrar-gerador", "checkpoint": 1, "kind": "expr", "expr": "filtrar([], \"vendedor\", \"Ana\")", "type": "generator",
    "name": "filtrar devolve um gerador", "hint": "Entregue cada registro com yield." },
  { "id": "filtrar-lista", "checkpoint": 1, "kind": "expr",
    "setup": "vendas = [{\"vendedor\": \"Ana\", \"valor\": \"1\"}, {\"vendedor\": \"Bia\", \"valor\": \"2\"}, {\"vendedor\": \"Ana\", \"valor\": \"3\"}]",
    "expr": "list(filtrar(vendas, \"vendedor\", \"Ana\"))",
    "expected": [{ "vendedor": "Ana", "valor": "1" }, { "vendedor": "Ana", "valor": "3" }],
    "name": "filtrar entrega só os registros que combinam, na ordem" },
  { "id": "filtrar-preguicoso", "checkpoint": 1, "kind": "expr",
    "setup": "lidos = []\ndef fonte():\n    for i, nome in enumerate([\"Ana\", \"Bia\", \"Ana\", \"Caio\"]):\n        lidos.append(i)\n        yield {\"vendedor\": nome, \"valor\": str(i)}\ng = filtrar(fonte(), \"vendedor\", \"Ana\")\nprimeiro = next(g)",
    "expr": "[primeiro[\"valor\"], lidos]", "expected": ["0", [0]],
    "name": "filtrar não lê à frente: o primeiro registro sai antes de ler os outros",
    "hint": "Não monte uma lista em filtrar; use yield dentro do laço." },
  { "id": "somar-lista", "checkpoint": 2, "kind": "expr",
    "expr": "somar_campo([{\"valor\": \"12.50\"}, {\"valor\": \"3\"}], \"valor\")", "expected": 15.5, "type": "float", "tolerance": 1e-9,
    "name": "somar_campo converte para float e soma", "hint": "Os valores chegam como texto." },
  { "id": "somar-iterador", "checkpoint": 2, "kind": "expr",
    "expr": "somar_campo(iter([{\"preco\": \"2\"}, {\"preco\": \"5.5\"}, {\"preco\": \"0.5\"}]), \"preco\")", "expected": 8.0, "type": "float",
    "tolerance": 1e-9, "name": "somar_campo funciona com um iterador de uma passada só",
    "hint": "Some numa única volta, sem percorrer os registros antes." },
  { "id": "somar-vazio", "checkpoint": 2, "kind": "expr", "expr": "somar_campo([], \"valor\")", "expected": 0.0, "type": "float",
    "name": "Sem registros, a soma é 0.0" },
  { "id": "total-ana", "checkpoint": 3, "kind": "expr",
    "setup": "with open(\"vendas.csv\", \"w\", encoding=\"utf-8\") as a:\n    a.write(\"vendedor,produto,valor\\nAna,caderno,12.50\\nBia,caneta,3.00\\n\\nAna,mochila,89.90\\n\")",
    "expr": "total_do_vendedor(\"vendas.csv\", \"Ana\")", "expected": 102.4, "type": "float", "tolerance": 1e-6,
    "name": "total_do_vendedor(\"vendas.csv\", \"Ana\") é 102.4" },
  { "id": "total-bia", "checkpoint": 3, "kind": "expr",
    "setup": "with open(\"vendas.csv\", \"w\", encoding=\"utf-8\") as a:\n    a.write(\"vendedor,produto,valor\\nAna,caderno,12.50\\nBia,caneta,3.00\\nBia,cola,4.25\\n\")",
    "expr": "[total_do_vendedor(\"vendas.csv\", \"Bia\"), total_do_vendedor(\"vendas.csv\", \"Zeca\")]", "expected": [7.25, 0.0],
    "tolerance": 1e-6, "name": "Outro vendedor, e um vendedor sem vendas" }
]
```

### Soluções erradas
```python name="filtrar monta uma lista"
def ler_registros(caminho):
    with open(caminho, encoding="utf-8") as arquivo:
        colunas = arquivo.readline().strip().split(",")
        for numero, linha in enumerate(arquivo, start=2):
            linha = linha.strip()
            if not linha:
                continue
            valores = linha.split(",")
            if len(valores) != len(colunas):
                raise ValueError(f"linha {numero}: esperava {len(colunas)} campos")
            yield dict(zip(colunas, valores))


def filtrar(registros, campo, valor):
    return [registro for registro in registros if registro[campo] == valor]


def somar_campo(registros, campo):
    total = 0.0
    for registro in registros:
        total += float(registro[campo])
    return total


def total_do_vendedor(caminho, vendedor):
    return somar_campo(filtrar(ler_registros(caminho), "vendedor", vendedor), "valor")
```
```python name="return no lugar de yield em filtrar"
def ler_registros(caminho):
    with open(caminho, encoding="utf-8") as arquivo:
        colunas = arquivo.readline().strip().split(",")
        for numero, linha in enumerate(arquivo, start=2):
            linha = linha.strip()
            if not linha:
                continue
            valores = linha.split(",")
            if len(valores) != len(colunas):
                raise ValueError(f"linha {numero}: esperava {len(colunas)} campos")
            yield dict(zip(colunas, valores))


def filtrar(registros, campo, valor):
    for registro in registros:
        if registro[campo] == valor:
            return registro


def somar_campo(registros, campo):
    total = 0.0
    for registro in registros:
        total += float(registro[campo])
    return total


def total_do_vendedor(caminho, vendedor):
    return somar_campo(filtrar(ler_registros(caminho), "vendedor", vendedor), "valor")
```
```python name="somar_campo percorre os registros duas vezes"
def ler_registros(caminho):
    with open(caminho, encoding="utf-8") as arquivo:
        colunas = arquivo.readline().strip().split(",")
        for numero, linha in enumerate(arquivo, start=2):
            linha = linha.strip()
            if not linha:
                continue
            valores = linha.split(",")
            if len(valores) != len(colunas):
                raise ValueError(f"linha {numero}: esperava {len(colunas)} campos")
            yield dict(zip(colunas, valores))


def filtrar(registros, campo, valor):
    for registro in registros:
        if registro[campo] == valor:
            yield registro


def somar_campo(registros, campo):
    if not list(registros):
        return 0.0
    total = 0.0
    for registro in registros:
        total += float(registro[campo])
    return total


def total_do_vendedor(caminho, vendedor):
    return somar_campo(filtrar(ler_registros(caminho), "vendedor", vendedor), "valor")
```
```python name="converte para int e perde os centavos"
def ler_registros(caminho):
    with open(caminho, encoding="utf-8") as arquivo:
        colunas = arquivo.readline().strip().split(",")
        for numero, linha in enumerate(arquivo, start=2):
            linha = linha.strip()
            if not linha:
                continue
            valores = linha.split(",")
            if len(valores) != len(colunas):
                raise ValueError(f"linha {numero}: esperava {len(colunas)} campos")
            yield dict(zip(colunas, valores))


def filtrar(registros, campo, valor):
    for registro in registros:
        if registro[campo] == valor:
            yield registro


def somar_campo(registros, campo):
    total = 0
    for registro in registros:
        total += int(float(registro[campo]))
    return total


def total_do_vendedor(caminho, vendedor):
    return somar_campo(filtrar(ler_registros(caminho), "vendedor", vendedor), "valor")
```

## Passo 7 · Quiz · Geradores

### Pergunta
O que este programa imprime?
```python
def notas():
    yield 7
    return 10
    yield 9


print(list(notas()))
```
- [ ] `[7, 10, 9]`
- [ ] `[7, 10]`
- [x] `[7]`
- [ ] `10`
> Num gerador, `return` encerra a iteração; o valor dele não vira item. O `yield 9` depois do `return` nunca roda.

### Pergunta
`g` é um gerador que produz 5 notas. O código faz `quantidade = len(list(g))` e depois `media = sum(g) / quantidade`. Qual é o resultado?
- [ ] A média correta das 5 notas
- [x] `0.0`: `list(g)` esgotou o gerador e `sum(g)` soma nada
- [ ] `TypeError`, porque `sum` não aceita geradores
- [ ] `ZeroDivisionError`, porque `quantidade` é zero
> `list(g)` consumiu todos os itens; o gerador não volta ao início. `sum` de um gerador esgotado é 0, e 0 dividido por 5 dá `0.0`, sem erro nenhum. Guarde `lista = list(g)` e use a lista nas duas contas, ou calcule soma e quantidade na mesma volta.

### Pergunta
Uma função geradora `ler_log(caminho)` abre um arquivo de um milhão de linhas e faz `yield` de cada uma. O que acontece na linha `linhas = ler_log("acesso.log")`?
- [ ] O arquivo inteiro é lido e guardado em `linhas`
- [ ] A primeira linha do arquivo é lida e guardada em `linhas`
- [x] Nenhuma linha do corpo roda: `linhas` recebe um gerador, e a leitura começa no primeiro `next`
- [ ] Dá erro, porque a função não tem `return`
> Chamar uma função geradora só cria o gerador. O corpo, inclusive o `open`, só começa a rodar quando alguém pede o primeiro item.
