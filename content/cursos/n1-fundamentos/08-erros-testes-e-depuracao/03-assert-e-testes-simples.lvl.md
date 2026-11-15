---
slug: n1-m8-03-assert-e-testes-simples
titulo: assert e testes simples
descricao: Escrever uma função de testes com assert, escolher casos de borda e usar os testes para guiar a implementação.
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
- Escrever funções de teste com assert cobrindo casos típicos, de borda e inválidos
- Interpretar uma falha de assert e localizar o defeito na função testada
- Implementar uma função a partir dos testes dados (test-first)
---

## Passo 1 · Leitura · Primeiro os casos, depois o código

Você já escreveu `assert condição, mensagem`: se a condição é verdadeira, nada acontece; se é falsa, o programa para com `AssertionError`. Nesta lição o `assert` vira método de trabalho: **primeiro você lista os casos, depois escreve o código**.

Antes de programar `media(lista)`, decida o que ela deve devolver em cada tipo de caso:

| Tipo de caso | Entrada | Esperado |
|---|---|---|
| típico | `[6, 8]` | `7.0` |
| borda: um item | `[5]` | `5.0` |
| inválido: lista vazia | `[]` | `None` |

O caso **típico** é o uso comum. A **borda** é o limite do que ainda funciona: um item, zero, o primeiro, o último. O **inválido** é a entrada sem resposta natural, para a qual você precisa decidir o que fazer. Cada linha da tabela vira um `assert`, com uma mensagem que diz qual caso é:

```python
def media(lista):
    if len(lista) == 0:
        return 0
    return sum(lista) / len(lista)


def testar_media():
    assert media([6, 8]) == 7.0, "caso típico"
    assert media([5]) == 5.0, "um elemento"
    assert media([]) is None, "lista vazia devolve None"


testar_media()
```

Essa `media` tem um defeito: devolve `0` na lista vazia, e o combinado era `None`. Ao rodar, o teste acusa:

```
Traceback (most recent call last):
  File "main.py", line 13, in <module>
    testar_media()
    ~~~~~~~~~~~~^^
  File "main.py", line 10, in testar_media
    assert media([]) is None, "lista vazia devolve None"
           ^^^^^^^^^^^^^^^^^
AssertionError: lista vazia devolve None
```

Leia de baixo para cima, como qualquer traceback. A última linha traz a **sua mensagem**: o caso que falhou é o da lista vazia. A entrada acima mostra o `assert` exato, na linha 10. Os dois primeiros casos passaram, porque o Python só para no primeiro `assert` falso. O defeito, então, está no trecho de `media` que cuida da lista vazia.

Sem a mensagem, a última linha seria só `AssertionError`, e você teria de descobrir o caso pela linha do código.

Quando todos os casos passam, o teste não imprime nada. E não se esqueça da última linha do programa: sem a chamada `testar_media()`, nenhum `assert` é executado.

#### Um bom teste pega versões defeituosas

Como saber se os seus casos são suficientes? Imagine uma versão errada da função, por exemplo uma `media` que devolve sempre `7.0`. Essa versão defeituosa é chamada de **mutante**. Um bom conjunto de testes falha diante dela. Se você testasse só `[6, 8]`, o mutante passaria, e o teste não estaria protegendo nada. Quanto mais variados os casos, mais mutantes eles pegam.

## Passo 2 · Exercício · media(lista)
modo: lacunas

Agora os testes vêm antes do código. Estes três `assert` definem o que `media(lista)` deve fazer:

```python
assert media([]) is None, "lista vazia devolve None"
assert media([5]) == 5.0, "um elemento"
assert media([1, 2]) == 1.5, "dois elementos"
```

Complete as três lacunas (`___`) da função para que os três passem.

### Instruções
1. Complete o teste da lista vazia e o valor que a função devolve nesse caso.
   Dica: o primeiro `assert` diz qual é o valor combinado.
2. Complete o divisor para que a função devolva a média nos outros casos.

### Código inicial
```python
def media(lista):
    if len(lista) == ___:
        return ___
    return sum(lista) / ___
```

### Solução
```python
def media(lista):
    if len(lista) == 0:
        return None
    return sum(lista) / len(lista)
```

### Dicas
1. A lista vazia tem tamanho 0.
2. O primeiro `assert` diz o que devolver na lista vazia: `media([]) is None`.
3. A média divide a soma pela quantidade de itens, que é `len(lista)`.

### Verificação
```json
[
  { "id": "borda-vazia", "checkpoint": 1, "kind": "call", "function": "media", "args": [[]], "expected": null, "type": "NoneType",
    "name": "media([]) devolve None", "hint": "O combinado para a lista vazia está no primeiro assert: é None, não um número." },
  { "id": "um-item", "checkpoint": 2, "kind": "call", "function": "media", "args": [[5]], "expected": 5.0, "tolerance": 0.001,
    "name": "media([5]) é 5.0", "hint": "Com um item só, a média é o próprio item." },
  { "id": "dois-itens", "checkpoint": 2, "kind": "call", "function": "media", "args": [[1, 2]], "expected": 1.5, "tolerance": 0.001,
    "name": "media([1, 2]) é 1.5", "hint": "A soma é 3 e há 2 itens." },
  { "id": "tres-itens", "checkpoint": 2, "kind": "call", "function": "media", "args": [[6, 8, 10]], "expected": 8.0, "tolerance": 0.001,
    "name": "media([6, 8, 10]) é 8.0", "hint": "O divisor precisa acompanhar o tamanho da lista, qualquer que seja." }
]
```

### Soluções erradas
```python name="sem tratar a lista vazia"
def media(lista):
    return sum(lista) / len(lista)
```
```python name="devolve 0 na lista vazia"
def media(lista):
    if len(lista) == 0:
        return 0
    return sum(lista) / len(lista)
```
```python name="divide sempre por 2"
def media(lista):
    if len(lista) == 0:
        return None
    return sum(lista) / 2
```

## Passo 3 · Exercício · testar_eh_palindromo()

Desta vez a função já está pronta e quem escreve os testes é você. Um palíndromo é um texto igual lido de trás para frente, como `arara`. A função `eh_palindromo(texto)` do código inicial devolve `True` ou `False` e ignora a diferença entre maiúsculas e minúsculas.

Escreva `testar_eh_palindromo()` com um `assert` para cada linha da tabela:

| Tipo de caso | Chamada | Esperado |
|---|---|---|
| típico, verdadeiro | `eh_palindromo("arara")` | `True` |
| típico, falso | `eh_palindromo("abc")` | `False` |
| borda: texto vazio | `eh_palindromo("")` | `True` |
| maiúsculas ignoradas | `eh_palindromo("Ana")` | `True` |

Para um caso que deve dar `False`, use `assert not ...`. Dê uma mensagem a cada `assert`.

A verificação não olha só se os seus testes passam com a função correta. Ela também troca `eh_palindromo` por versões defeituosas (mutantes) e confere se a sua função de teste **falha** com cada uma delas.

### Instruções
1. Em `testar_eh_palindromo()`, escreva os `assert` de `"arara"` e de `""`: os dois devem dar `True`.
2. Acrescente o `assert` de `"abc"`, que deve dar `False`.
   Dica: sem um caso falso, uma função que responde sempre `True` passaria nos seus testes.
3. Acrescente o `assert` de `"Ana"`, que deve dar `True` mesmo com a maiúscula.

### Código inicial
```python
def eh_palindromo(texto):
    minusculo = texto.lower()
    return minusculo == minusculo[::-1]


def testar_eh_palindromo():
    # Escreva os quatro assert aqui, no lugar do pass
    pass


testar_eh_palindromo()
```

### Solução
```python
def eh_palindromo(texto):
    minusculo = texto.lower()
    return minusculo == minusculo[::-1]


def testar_eh_palindromo():
    assert eh_palindromo("arara"), "palíndromo simples"
    assert not eh_palindromo("abc"), "não é palíndromo"
    assert eh_palindromo(""), "texto vazio"
    assert eh_palindromo("Ana"), "maiúsculas não importam"


testar_eh_palindromo()
```

### Dicas
1. Inclua um caso que deve dar `False`: `assert not eh_palindromo("abc"), "mensagem"`.
2. Inclua um caso com maiúscula e minúscula misturadas, como `"Ana"`.
3. São quatro linhas dentro da função, uma por linha da tabela, todas no formato `assert chamada, "mensagem"`.

### Verificação
```json
[
  { "id": "define", "checkpoint": 1, "kind": "source", "rule": { "type": "defines_function", "name": "testar_eh_palindromo" },
    "name": "Define testar_eh_palindromo", "hint": "Mantenha o nome da função de teste como está no código inicial." },
  { "id": "passa-na-correta", "checkpoint": 1, "kind": "expr",
    "setup": "def eh_palindromo(texto):\n    return texto.lower() == texto.lower()[::-1]",
    "expr": "testar_eh_palindromo()", "type": "NoneType",
    "name": "Seus testes passam com a função correta", "hint": "Algum assert seu espera um resultado que não está na tabela do enunciado." },
  { "id": "mutante-sempre-false", "checkpoint": 1, "kind": "expr",
    "setup": "def eh_palindromo(texto):\n    return False",
    "expr": "testar_eh_palindromo()", "raises": "AssertionError",
    "name": "Seus testes pegam a versão que responde sempre False", "hint": "Inclua um caso que deve dar True, como o de \"arara\"." },
  { "id": "mutante-vazio", "checkpoint": 1, "kind": "expr",
    "setup": "def eh_palindromo(texto):\n    return len(texto) > 0 and texto.lower() == texto.lower()[::-1]",
    "expr": "testar_eh_palindromo()", "raises": "AssertionError",
    "name": "Seus testes pegam a versão que recusa o texto vazio", "hint": "Falta o caso de borda: o texto vazio deve dar True." },
  { "id": "mutante-sempre-true", "checkpoint": 2, "kind": "expr",
    "setup": "def eh_palindromo(texto):\n    return True",
    "expr": "testar_eh_palindromo()", "raises": "AssertionError",
    "name": "Seus testes pegam a versão que responde sempre True", "hint": "Inclua um caso que deve dar False, com assert not." },
  { "id": "mutante-maiusculas", "checkpoint": 3, "kind": "expr",
    "setup": "def eh_palindromo(texto):\n    return texto == texto[::-1]",
    "expr": "testar_eh_palindromo()", "raises": "AssertionError",
    "name": "Seus testes pegam a versão que não ignora maiúsculas", "hint": "Inclua um caso em que a primeira letra é maiúscula e a última é minúscula." }
]
```

### Soluções erradas
```python name="só casos positivos"
def eh_palindromo(texto):
    minusculo = texto.lower()
    return minusculo == minusculo[::-1]


def testar_eh_palindromo():
    assert eh_palindromo("arara"), "palíndromo simples"
    assert eh_palindromo(""), "texto vazio"
    assert eh_palindromo("Ana"), "maiúsculas não importam"


testar_eh_palindromo()
```
```python name="sem o caso das maiúsculas"
def eh_palindromo(texto):
    minusculo = texto.lower()
    return minusculo == minusculo[::-1]


def testar_eh_palindromo():
    assert eh_palindromo("arara"), "palíndromo simples"
    assert not eh_palindromo("abc"), "não é palíndromo"
    assert eh_palindromo(""), "texto vazio"


testar_eh_palindromo()
```
```python name="sem o texto vazio"
def eh_palindromo(texto):
    minusculo = texto.lower()
    return minusculo == minusculo[::-1]


def testar_eh_palindromo():
    assert eh_palindromo("arara"), "palíndromo simples"
    assert not eh_palindromo("abc"), "não é palíndromo"
    assert eh_palindromo("Ana"), "maiúsculas não importam"


testar_eh_palindromo()
```
```python name="assert com parênteses: nunca falha"
def eh_palindromo(texto):
    minusculo = texto.lower()
    return minusculo == minusculo[::-1]


def testar_eh_palindromo():
    assert (eh_palindromo("arara"), "palíndromo simples")
    assert (not eh_palindromo("abc"), "não é palíndromo")
    assert (eh_palindromo(""), "texto vazio")
    assert (eh_palindromo("Ana"), "maiúsculas não importam")


testar_eh_palindromo()
```
```python name="espera False para Ana"
def eh_palindromo(texto):
    minusculo = texto.lower()
    return minusculo == minusculo[::-1]


def testar_eh_palindromo():
    assert eh_palindromo("arara"), "palíndromo simples"
    assert not eh_palindromo("abc"), "não é palíndromo"
    assert eh_palindromo(""), "texto vazio"
    assert not eh_palindromo("Ana"), "maiúscula muda o texto"


testar_eh_palindromo()
```

## Passo 4 · Quiz · Testes

### Pergunta
Este teste falha, mesmo com a função `soma` correta. Por quê?
```python
def soma(a, b):
    return a + b


assert soma(0.1, 0.2) == 0.3, "soma de decimais"
```
- [ ] Porque `assert` não funciona com números decimais
- [x] Porque `0.1 + 0.2` dá `0.30000000000000004`: números com ponto decimal guardam aproximações, e o `==` exige igualdade exata
- [ ] Porque a mensagem do `assert` não pode ter espaços
- [ ] Porque `soma` deveria usar `round` antes de devolver o resultado
> O defeito está no teste, não na função. Para números com ponto decimal, compare com uma folga: `assert abs(soma(0.1, 0.2) - 0.3) < 0.001`. Valores como `7.0` e `1.5` têm representação exata, e por isso funcionaram com `==` nos exemplos da lição.

### Pergunta
Por que este `assert` passa sempre, mesmo quando `media([5])` devolve um valor errado?
```python
assert (media([5]) == 5.0, "um elemento")
```
- [ ] Porque a mensagem faz o Python ignorar a condição
- [ ] Porque `assert` só confere a primeira vez que é executado
- [x] Porque os parênteses criam uma tupla de dois itens, e uma tupla não vazia conta como verdadeira
- [ ] Porque `5.0` é um número com ponto decimal
> Com os parênteses, o `assert` recebe uma coisa só: a tupla `(condição, "um elemento")`. Tupla não vazia é sempre verdadeira, então o teste nunca falha. O Python mostra apenas o aviso `SyntaxWarning: assertion is always true, perhaps remove parentheses?` e segue em frente. Escreva sem parênteses: `assert condição, mensagem`.

### Pergunta
Por que incluir casos de borda, como a lista vazia ou o texto de uma letra só, entre os testes?
- [ ] Porque o Python exige pelo menos três `assert` em cada função de teste
- [ ] Porque os casos de borda rodam mais rápido que os típicos
- [ ] Porque, se a borda passa, os casos típicos não precisam ser testados
- [x] Porque é nos limites que os defeitos costumam se esconder: divisão por zero, laço que para um item antes, comparação com `>` no lugar de `>=`
> O caso típico costuma funcionar já na primeira versão. Os erros aparecem no primeiro item, no último, no zero e no vazio. A borda não substitui o caso típico: um bom teste tem os dois.

## Passo 5 · Exercício · Ache o bug

A função `contar_vogais(s)` deveria contar as vogais de um texto, sem diferenciar maiúsculas de minúsculas (os textos dos testes não têm acentos). Ela veio com uma função de teste, e os testes estão certos. O defeito está em `contar_vogais`. Aliás, são dois defeitos.

Ao rodar o código inicial, o primeiro `assert` que falha para o programa:

```
Traceback (most recent call last):
  File "main.py", line 16, in <module>
    testar_contar_vogais()
    ~~~~~~~~~~~~~~~~~~~~^^
  File "main.py", line 12, in testar_contar_vogais
    assert contar_vogais("uva") == 2, "termina em vogal"
           ^^^^^^^^^^^^^^^^^^^^^^^^^
AssertionError: termina em vogal
```

A mensagem dá a pista: o caso que falhou **termina em vogal**. Os casos `""` e `"xyz"` passaram. Corrija esse defeito, rode de novo e leia qual `assert` falha em seguida. Não altere os testes: quando os quatro passarem, o programa termina sem imprimir nada.

### Instruções
1. Corrija o laço para que todas as letras do texto sejam examinadas, inclusive a última.
   Dica: quantas voltas `range(len(s) - 1)` dá para um texto de 3 letras?
2. Faça as vogais maiúsculas também contarem: `contar_vogais("Abacaxi")` deve devolver `4`.

### Código inicial
```python
def contar_vogais(s):
    total = 0
    for i in range(len(s) - 1):
        if s[i] in "aeiou":
            total += 1
    return total


def testar_contar_vogais():
    assert contar_vogais("") == 0, "texto vazio"
    assert contar_vogais("xyz") == 0, "sem vogais"
    assert contar_vogais("uva") == 2, "termina em vogal"
    assert contar_vogais("Abacaxi") == 4, "maiúscula no começo"


testar_contar_vogais()
```

### Solução
```python
def contar_vogais(s):
    total = 0
    for i in range(len(s)):
        if s[i].lower() in "aeiou":
            total += 1
    return total


def testar_contar_vogais():
    assert contar_vogais("") == 0, "texto vazio"
    assert contar_vogais("xyz") == 0, "sem vogais"
    assert contar_vogais("uva") == 2, "termina em vogal"
    assert contar_vogais("Abacaxi") == 4, "maiúscula no começo"


testar_contar_vogais()
```

### Dicas
1. Rode os testes e leia a mensagem do `assert` que falha primeiro: ela descreve o caso.
2. Um texto que termina em vogal mostra o primeiro defeito: `range(len(s) - 1)` para uma letra antes do fim.
3. Para o segundo defeito, compare a letra em minúscula: `s[i].lower() in "aeiou"`.

### Verificação
```json
[
  { "id": "borda-vazio", "checkpoint": 1, "kind": "call", "function": "contar_vogais", "args": [""], "expected": 0, "type": "int",
    "name": "contar_vogais(\"\") é 0", "hint": "O texto vazio não tem vogais, e os testes do programa precisam passar até o fim." },
  { "id": "casa", "checkpoint": 1, "kind": "call", "function": "contar_vogais", "args": ["casa"], "expected": 2, "type": "int",
    "name": "contar_vogais(\"casa\") é 2", "hint": "A última letra também é vogal. O laço chega até ela?" },
  { "id": "uva", "checkpoint": 1, "kind": "call", "function": "contar_vogais", "args": ["uva"], "expected": 2, "type": "int",
    "name": "contar_vogais(\"uva\") é 2", "hint": "Confira quantas voltas o range dá para um texto de 3 letras." },
  { "id": "abacaxi", "checkpoint": 2, "kind": "call", "function": "contar_vogais", "args": ["Abacaxi"], "expected": 4, "type": "int",
    "name": "contar_vogais(\"Abacaxi\") é 4", "hint": "A primeira letra é uma vogal maiúscula e a última é uma vogal minúscula: as duas contam." },
  { "id": "maiusculas", "checkpoint": 2, "kind": "call", "function": "contar_vogais", "args": ["AEIOU"], "expected": 5, "type": "int",
    "name": "contar_vogais(\"AEIOU\") é 5", "hint": "Vogais maiúsculas contam do mesmo jeito que as minúsculas." }
]
```

### Soluções erradas
```python name="corrige só as maiúsculas"
def contar_vogais(s):
    total = 0
    for i in range(len(s) - 1):
        if s[i].lower() in "aeiou":
            total += 1
    return total
```
```python name="corrige só o range"
def contar_vogais(s):
    total = 0
    for i in range(len(s)):
        if s[i] in "aeiou":
            total += 1
    return total
```
```python name="altera os testes em vez da função"
def contar_vogais(s):
    total = 0
    for i in range(len(s) - 1):
        if s[i] in "aeiou":
            total += 1
    return total


def testar_contar_vogais():
    assert contar_vogais("") == 0, "texto vazio"
    assert contar_vogais("xyz") == 0, "sem vogais"
    assert contar_vogais("uva") == 1, "termina em vogal"
    assert contar_vogais("Abacaxi") == 2, "maiúscula no começo"


testar_contar_vogais()
```
```python name="soma 1 no fim para compensar"
def contar_vogais(s):
    total = 0
    for i in range(len(s) - 1):
        if s[i].lower() in "aeiou":
            total += 1
    return total + 1
```
