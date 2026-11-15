---
slug: n1-m6-05-docstrings-e-assert
titulo: Docstrings e assert
descricao: Documentar o que a função faz e testar com assert antes de dizer que está pronta.
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
- Escrever docstrings curtas com o que a função recebe e devolve
- Escrever testes com assert para casos normais e de borda
- Explicar como um assert que falha ajuda a achar o erro
---

## Passo 1 · Leitura · Documentar com docstring

Uma função bem escrita é usada sem que ninguém precise ler o corpo dela. Para isso, quem chama precisa saber duas coisas: o que a função recebe e o que ela devolve. O lugar de escrever isso é a **docstring**, um texto entre três aspas duplas colocado na **primeira linha do corpo** da função:

```python
def media(a, b):
    """Recebe dois números e devolve a média deles."""
    return (a + b) / 2
```

Quando o texto precisa de mais de uma linha, as três aspas abrem em uma linha e fecham em outra:

```python
def aplicar_desconto(preco, percentual):
    """Devolve o preço final depois do desconto.

    Recebe o preço e o percentual de desconto (de 0 a 100).
    Exemplo: aplicar_desconto(200, 25) devolve 150.0.
    """
    return preco * (1 - percentual / 100)
```

Uma boa docstring é curta e responde: o que a função faz, o que cada parâmetro significa e o que é devolvido. Um exemplo de chamada ajuda bastante.

Qual é a diferença para um comentário com `#`? O comentário é ignorado pelo Python: ele só existe para quem abre o arquivo. A docstring fica **guardada junto com a função**. Você pode consultá-la de dois jeitos:

```python
print(media.__doc__)   # Recebe dois números e devolve a média deles.
help(media)            # mostra o nome, os parâmetros e a docstring
```

`__doc__` (com dois sublinhados de cada lado) é o nome em que o Python guarda o texto. A função `help()` usa esse mesmo texto, e os editores de código o mostram quando você passa o mouse sobre uma chamada. As funções que já vêm com o Python também têm docstring: experimente `help(len)`.

Dois cuidados:

- A docstring precisa ser a **primeira coisa** do corpo. Um texto entre aspas em outro lugar da função é só um valor solto, que o Python calcula e descarta.
- Função sem docstring tem `__doc__` igual a `None`.

Use o comentário `#` para explicar **como** um trecho difícil funciona, para quem vai mexer no código. Use a docstring para explicar **o que** a função faz, para quem vai chamá-la.

## Passo 2 · Exercício · Documente

As duas funções abaixo estão certas, mas sem documentação. Acrescente uma docstring a cada uma, dizendo o que ela devolve. Não mude o comportamento das funções.

Para a correção reconhecer o texto, use a palavra **devolve** nas duas docstrings. Por exemplo: `"""Devolve a soma de a e b."""` seria a docstring de uma função `somar(a, b)`.

### Instruções
1. Acrescente a `dobro(n)` uma docstring que diga o que a função devolve, usando a palavra "devolve".
   Dica: a docstring vem logo abaixo da linha do def, antes do return.
2. Acrescente a `eh_par(n)` uma docstring que diga o que a função devolve, usando a palavra "devolve".

### Código inicial
```python
def dobro(n):
    return n * 2


def eh_par(n):
    return n % 2 == 0
```

### Solução
```python
def dobro(n):
    """Devolve o dobro do número n."""
    return n * 2


def eh_par(n):
    """Devolve True se n for par e False se for ímpar."""
    return n % 2 == 0
```

### Dicas
1. A docstring é a primeira linha do corpo da função, entre três aspas duplas, indentada como o resto do corpo.
2. Use a palavra "devolve" no texto. Um comentário com `#` não serve: o Python não o guarda em `__doc__`.

### Verificação
```json
[
  { "id": "dobro-tem-doc", "checkpoint": 1, "kind": "expr", "expr": "dobro.__doc__", "type": "str",
    "name": "dobro tem docstring", "hint": "Escreva o texto entre três aspas na primeira linha do corpo, antes do return." },
  { "id": "dobro-doc-devolve", "checkpoint": 1, "kind": "expr", "expr": "\"devolve\" in dobro.__doc__.lower()", "expected": true,
    "name": "A docstring de dobro diz o que a função devolve", "hint": "Use a palavra devolve no texto da docstring." },
  { "id": "dobro-4", "checkpoint": 1, "kind": "call", "function": "dobro", "args": [4], "expected": 8,
    "name": "dobro(4) continua sendo 8", "hint": "Não mude o return da função." },
  { "id": "dobro-neg", "checkpoint": 1, "kind": "call", "function": "dobro", "args": [-3], "expected": -6,
    "name": "dobro(-3) continua sendo -6" },
  { "id": "par-tem-doc", "checkpoint": 2, "kind": "expr", "expr": "eh_par.__doc__", "type": "str",
    "name": "eh_par tem docstring", "hint": "Escreva o texto entre três aspas na primeira linha do corpo, antes do return." },
  { "id": "par-doc-devolve", "checkpoint": 2, "kind": "expr", "expr": "\"devolve\" in eh_par.__doc__.lower()", "expected": true,
    "name": "A docstring de eh_par diz o que a função devolve", "hint": "Use a palavra devolve no texto da docstring." },
  { "id": "par-10", "checkpoint": 2, "kind": "call", "function": "eh_par", "args": [10], "expected": true, "type": "bool",
    "name": "eh_par(10) continua sendo True" },
  { "id": "par-7", "checkpoint": 2, "kind": "call", "function": "eh_par", "args": [7], "expected": false, "type": "bool",
    "name": "eh_par(7) continua sendo False" }
]
```

### Soluções erradas
```python name="comentário com # no lugar da docstring"
def dobro(n):
    # Devolve o dobro do número n.
    return n * 2


def eh_par(n):
    # Devolve True se n for par e False se for ímpar.
    return n % 2 == 0
```
```python name="docstring depois do return"
def dobro(n):
    return n * 2
    """Devolve o dobro do número n."""


def eh_par(n):
    return n % 2 == 0
    """Devolve True se n for par e False se for ímpar."""
```
```python name="documentou só a primeira função"
def dobro(n):
    """Devolve o dobro do número n."""
    return n * 2


def eh_par(n):
    return n % 2 == 0
```
```python name="trocou o return pelo texto"
def dobro(n):
    """Devolve o dobro do número n."""


def eh_par(n):
    """Devolve True se n for par e False se for ímpar."""
```

## Passo 3 · Leitura · Testar com assert

Como saber se uma função está certa? Chamar uma vez e olhar o resultado não basta: você confere hoje e esquece amanhã. Melhor é deixar a conferência escrita no programa, com `assert`.

A instrução `assert` recebe uma condição. Se ela for verdadeira, **nada acontece**: o programa segue em silêncio. Se for falsa, o programa para com um `AssertionError`.

```python
assert dobro(4) == 8                 # passa: nenhuma saída
assert dobro(4) == 9, "dobro de 4"   # falha
```

A segunda linha produz `AssertionError: dobro de 4`. O texto depois da vírgula é opcional e serve para você reconhecer qual teste falhou. O *traceback* (o relatório de erro) também mostra a linha do `assert`, então você sabe exatamente qual caso quebrou.

O costume é juntar os testes de uma função em outra função, com o nome `testar_` seguido do nome dela, e chamá-la no fim do arquivo:

```python
def eh_par(n):
    return n % 2 == 0


def testar_eh_par():
    assert eh_par(2)
    assert not eh_par(3)
    assert eh_par(0)
    assert eh_par(-4)


testar_eh_par()
```

Se nada aparecer na tela, todos os testes passaram. Repare que definir `testar_eh_par` não testa nada: é preciso chamá-la.

Quais casos escolher? Um só não basta. Uma função errada que devolve sempre `True` passaria em `assert eh_par(2)`. Escolha casos **típicos** e casos **de borda**, aqueles valores nos limites, em que os erros costumam se esconder:

| Caso | Entrada | Esperado |
|---|---|---|
| típico, par | `2` | `True` |
| típico, ímpar | `3` | `False` |
| borda: zero | `0` | `True` |
| borda: negativo | `-4` | `True` |

Para listas, a borda costuma ser a lista vazia e a de um item só; para faixas de valores, o número exato do limite (a nota 6 em "6 ou mais").

Vale escrever os testes **antes** da função. Você decide primeiro o que ela deve devolver em cada caso e só depois escreve o corpo, rodando os testes até o programa ficar em silêncio.

Um cuidado: não ponha parênteses em volta da condição e da mensagem. `assert (x > 0, "x positivo")` testa uma tupla de dois itens, e tupla não vazia conta como verdadeira: esse `assert` nunca falha.

## Passo 4 · Previsão · Assert em silêncio

Leia o programa com calma, sem executar, e digite exatamente o que ele imprime (uma linha de saída por linha da sua resposta). Pense no que cada `assert` mostra quando a condição é verdadeira e no que `eh_par.__doc__` vale.

### Código
```python
def eh_par(n):
    return n % 2 == 0


def testar():
    assert eh_par(2)
    assert not eh_par(3)
    print("todos os testes passaram")


testar()
print(eh_par.__doc__)
```

### Dicas
1. Um `assert` com condição verdadeira não mostra nada na tela.
2. A função `eh_par` não tem docstring; nesse caso, `__doc__` vale `None`.

### Saída esperada
```text
todos os testes passaram
None
```

## Passo 5 · Exercício · testar_eh_par()

Agora quem escreve os testes é você. A função `eh_par(n)` já está pronta. Complete `testar_eh_par()` com pelo menos quatro `assert`, um para cada linha da tabela:

| Entrada | Esperado |
|---|---|
| `2` | `True` |
| `3` | `False` |
| `0` | `True` |
| `-4` | `True` |

A correção faz duas coisas com os seus testes. Primeiro, roda `testar_eh_par()` com a `eh_par` correta: nenhum `assert` pode falhar. Depois, troca `eh_par` por versões **com defeito** e roda de novo: em cada uma, algum `assert` seu precisa falhar. Um conjunto de testes bom é aquele que acusa a função errada.

### Instruções
1. Em `testar_eh_par()`, escreva um `assert` que confira que 2 é par e outro que confira que 3 não é par.
   Dica: para conferir um resultado False, use assert not.
2. Acrescente os casos de borda: um `assert` para o zero e outro para o -4, que também são pares.

### Código inicial
```python
def eh_par(n):
    return n % 2 == 0


def testar_eh_par():
    pass


testar_eh_par()
```

### Solução
```python
def eh_par(n):
    return n % 2 == 0


def testar_eh_par():
    assert eh_par(2)
    assert not eh_par(3)
    assert eh_par(0)
    assert eh_par(-4)


testar_eh_par()
```

### Dicas
1. Teste um par, um ímpar, o zero e um negativo: quatro `assert`, um por linha.
2. Para "não é par", escreva `assert not eh_par(3)`. Escrever `assert eh_par(3)` falharia com a função correta.
3. Não mude a função `eh_par`: os testes ficam dentro de `testar_eh_par()`, indentados.

### Verificação
```json
[
  { "id": "define-teste", "checkpoint": 1, "kind": "source", "rule": { "type": "defines_function", "name": "testar_eh_par" },
    "name": "Define a função testar_eh_par" },
  { "id": "passa-na-correta", "checkpoint": 1, "kind": "expr", "expr": "testar_eh_par()", "type": "NoneType",
    "name": "Os testes passam com a eh_par correta", "hint": "Com a função certa, nenhum assert pode falhar. Confira os casos em que o esperado é False." },
  { "id": "mutante-invertida", "checkpoint": 1, "kind": "expr", "setup": "eh_par = lambda n: n % 2 == 1", "expr": "testar_eh_par()", "raises": "AssertionError",
    "name": "Os testes acusam uma eh_par que responde o contrário", "hint": "Confira que 2 é par e que 3 não é." },
  { "id": "mutante-sempre-true", "checkpoint": 1, "kind": "expr", "setup": "eh_par = lambda n: True", "expr": "testar_eh_par()", "raises": "AssertionError",
    "name": "Os testes acusam uma eh_par que devolve sempre True", "hint": "Falta um teste com número ímpar, em que o esperado é False." },
  { "id": "mutante-so-positivos", "checkpoint": 2, "kind": "expr", "setup": "eh_par = lambda n: n > 0", "expr": "testar_eh_par()", "raises": "AssertionError",
    "name": "Os testes acusam uma eh_par que só olha se o número é positivo", "hint": "Um único teste com o 2 não basta: inclua um ímpar e os casos de borda." },
  { "id": "mutante-zero", "checkpoint": 2, "kind": "expr", "setup": "eh_par = lambda n: n % 2 == 0 and n != 0", "expr": "testar_eh_par()", "raises": "AssertionError",
    "name": "Os testes acusam uma eh_par que erra o zero", "hint": "Falta o caso de borda do zero." },
  { "id": "mutante-negativos", "checkpoint": 2, "kind": "expr", "setup": "eh_par = lambda n: n % 2 == 0 and n >= 0", "expr": "testar_eh_par()", "raises": "AssertionError",
    "name": "Os testes acusam uma eh_par que erra os negativos", "hint": "Falta o caso de borda de um número par negativo." }
]
```

### Soluções erradas
```python name="um único assert"
def eh_par(n):
    return n % 2 == 0


def testar_eh_par():
    assert eh_par(2)


testar_eh_par()
```
```python name="sem o zero e sem negativos"
def eh_par(n):
    return n % 2 == 0


def testar_eh_par():
    assert eh_par(2)
    assert not eh_par(3)
    assert eh_par(10)
    assert not eh_par(7)


testar_eh_par()
```
```python name="assert com parênteses e vírgula nunca falha"
def eh_par(n):
    return n % 2 == 0


def testar_eh_par():
    assert (eh_par(2), "2 é par")
    assert (not eh_par(3), "3 é ímpar")
    assert (eh_par(0), "0 é par")
    assert (eh_par(-4), "-4 é par")


testar_eh_par()
```
```python name="esperado errado: afirma que 3 é par"
def eh_par(n):
    return n % 2 == 0


def testar_eh_par():
    assert eh_par(2)
    assert eh_par(3)
    assert eh_par(0)
    assert eh_par(-4)


testar_eh_par()
```

## Passo 6 · Quiz · Docstrings e assert

### Pergunta
O teste abaixo deveria falhar, porque `dobro(4)` não é 9. Por que ele nunca falha?
```python
assert (dobro(4) == 9, "dobro de 4 deveria ser 8")
```
- [ ] Porque `assert` só confere números inteiros
- [x] Porque os parênteses formam uma tupla de dois itens, e uma tupla não vazia conta como verdadeira
- [ ] Porque a mensagem depois da vírgula desliga o teste
- [ ] Porque `assert` ignora comparações feitas com `==`
> Com os parênteses, a condição testada passa a ser a tupla `(False, "dobro de 4 deveria ser 8")`, que nunca é vazia. A forma certa é `assert dobro(4) == 9, "mensagem"`, sem parênteses em volta.

### Pergunta
Qual é a diferença entre uma docstring e um comentário com `#`?
- [ ] Nenhuma: são duas formas de escrever a mesma coisa
- [ ] O comentário aparece em `help()`; a docstring é ignorada pelo Python
- [x] A docstring fica guardada na função e aparece em `help()` e em `__doc__`; o comentário é ignorado pelo Python
- [ ] A docstring só pode ser usada em funções que não têm `return`
> A docstring é a primeira linha do corpo, entre três aspas, e acompanha a função. O comentário só existe para quem lê o arquivo.

### Pergunta
O que faz um `assert` falhar e o que acontece quando ele falha?
- [ ] Ele falha quando a condição é verdadeira, e o programa imprime um aviso e continua
- [ ] Ele falha quando a função testada não tem docstring
- [x] Ele falha quando a condição é falsa, e o programa para com `AssertionError`, mostrando a linha do teste
- [ ] Ele falha quando a condição é falsa, e o programa pula para o próximo `assert`
> Condição verdadeira: silêncio. Condição falsa: `AssertionError`, com a linha do `assert` no traceback e a mensagem, se houver. É assim que o teste aponta onde está o erro.

## Passo 7 · Exercício · arredondar_nota(nota)

Desta vez os testes vêm antes do código. Uma professora lança as notas de meio em meio ponto: 6.0, 6.5, 7.0… Escreva `arredondar_nota(nota)`, que devolve a nota arredondada para o **múltiplo de 0,5 mais próximo**.

A regra, com exemplos:

- 6.2 está mais perto de 6.0 do que de 6.5: devolve `6.0`.
- 6.3 está mais perto de 6.5: devolve `6.5`.
- 6.8 está mais perto de 7.0: devolve `7.0`.
- Uma nota que já é múltipla de 0,5 não muda: 8.5 devolve `8.5`.

O código inicial traz a função `testar_arredondar_nota()` com esses casos, já chamada no fim do arquivo. Enquanto `arredondar_nota` estiver errada, o programa para com `AssertionError` na linha do caso que falhou: é o teste fazendo o trabalho dele. Quando o programa rodar em silêncio, a função passou em todos.

Um caminho para a conta: em notas dobradas, "meio em meio ponto" vira "de um em um". Dobre a nota, arredonde para o inteiro mais próximo com `round` e divida por 2.

### Instruções
1. Escreva o corpo de `arredondar_nota(nota)` para devolver a nota arredondada para o múltiplo de 0,5 mais próximo, de modo que todos os `assert` de `testar_arredondar_nota()` passem.
   Dica: rode o programa antes de verificar; se aparecer AssertionError, veja em qual linha.

### Código inicial
```python
def arredondar_nota(nota):
    pass


def testar_arredondar_nota():
    assert arredondar_nota(6.2) == 6.0
    assert arredondar_nota(6.3) == 6.5
    assert arredondar_nota(6.8) == 7.0
    assert arredondar_nota(8.5) == 8.5
    assert arredondar_nota(0) == 0.0
    assert arredondar_nota(10) == 10.0


testar_arredondar_nota()
```

### Solução
```python
def arredondar_nota(nota):
    return round(nota * 2) / 2


def testar_arredondar_nota():
    assert arredondar_nota(6.2) == 6.0
    assert arredondar_nota(6.3) == 6.5
    assert arredondar_nota(6.8) == 7.0
    assert arredondar_nota(8.5) == 8.5
    assert arredondar_nota(0) == 0.0
    assert arredondar_nota(10) == 10.0


testar_arredondar_nota()
```

### Dicas
1. Dobre a nota, arredonde para o inteiro mais próximo e divida por 2: 6.3 vira 12.6, que arredonda para 13, e 13 dividido por 2 é 6.5.
2. Rode os `assert` do código inicial antes de verificar. O traceback mostra a linha do primeiro caso que falhou.
3. `round(x)` arredonda para o inteiro mais próximo; `int(x)` só corta a parte decimal, o que arredonda sempre para baixo.

### Verificação
```json
[
  { "id": "nota-6-2", "checkpoint": 1, "kind": "call", "function": "arredondar_nota", "args": [6.2], "expected": 6.0, "tolerance": 0.001,
    "name": "arredondar_nota(6.2) é 6.0", "hint": "6.2 está mais perto de 6.0 do que de 6.5." },
  { "id": "nota-6-3", "checkpoint": 1, "kind": "call", "function": "arredondar_nota", "args": [6.3], "expected": 6.5, "tolerance": 0.001,
    "name": "arredondar_nota(6.3) é 6.5", "hint": "O resultado pode terminar em ,5: arredonde para o múltiplo de 0,5, não para o inteiro." },
  { "id": "nota-6-8", "checkpoint": 1, "kind": "call", "function": "arredondar_nota", "args": [6.8], "expected": 7.0, "tolerance": 0.001,
    "name": "arredondar_nota(6.8) é 7.0", "hint": "6.8 está mais perto de 7.0: o arredondamento também sobe." },
  { "id": "nota-8-5", "checkpoint": 1, "kind": "call", "function": "arredondar_nota", "args": [8.5], "expected": 8.5, "tolerance": 0.001,
    "name": "arredondar_nota(8.5) é 8.5", "hint": "Uma nota que já é múltipla de 0,5 não muda." },
  { "id": "nota-4-4", "checkpoint": 1, "kind": "call", "function": "arredondar_nota", "args": [4.4], "expected": 4.5, "tolerance": 0.001,
    "name": "arredondar_nota(4.4) é 4.5" },
  { "id": "nota-9-9", "checkpoint": 1, "kind": "call", "function": "arredondar_nota", "args": [9.9], "expected": 10.0, "tolerance": 0.001,
    "name": "arredondar_nota(9.9) é 10.0" },
  { "id": "nota-0-1", "checkpoint": 1, "kind": "call", "function": "arredondar_nota", "args": [0.1], "expected": 0.0, "tolerance": 0.001,
    "name": "arredondar_nota(0.1) é 0.0" },
  { "id": "nota-zero", "checkpoint": 1, "kind": "call", "function": "arredondar_nota", "args": [0], "expected": 0.0, "tolerance": 0.001,
    "name": "arredondar_nota(0) é 0.0" },
  { "id": "nota-dez", "checkpoint": 1, "kind": "call", "function": "arredondar_nota", "args": [10], "expected": 10.0, "tolerance": 0.001,
    "name": "arredondar_nota(10) é 10.0" }
]
```

### Soluções erradas
```python name="round(nota) arredonda para inteiro"
def arredondar_nota(nota):
    return round(nota)
```
```python name="int(nota * 2) / 2 arredonda sempre para baixo"
def arredondar_nota(nota):
    return int(nota * 2) / 2
```
```python name="round(nota, 1) só tira casas decimais"
def arredondar_nota(nota):
    return round(nota, 1)
```
```python name="imprime em vez de devolver"
def arredondar_nota(nota):
    print(round(nota * 2) / 2)
```
