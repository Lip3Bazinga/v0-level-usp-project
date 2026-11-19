---
slug: n2-m5-04-funcoes-de-ordem-superior-e-closures
titulo: Funções de ordem superior e closures
descricao: Funções que devolvem funções, variáveis capturadas, nonlocal e functools.partial.
dificuldade: intermediario
tipo: guiada
runtime: python
bibliotecas: []
xp: 110
tempo_min: 45
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Escrever funções que devolvem funções e explicar o que uma closure captura
- Usar nonlocal para alterar uma variável capturada
- Criar funções especializadas com functools.partial
---

## Passo 1 · Leitura · Funções que fabricam funções

Em Python, uma função é um valor como outro qualquer: pode ir para uma variável, para uma lista ou como argumento. Você já fez isso em `sorted(alunos, key=lambda a: a.nota)`: a função `lambda` foi entregue ao `sorted`, que a chama quando precisa. Uma função que recebe ou devolve outras funções se chama **função de ordem superior**.

O passo seguinte é uma função que **cria e devolve** outra. Uma papelaria aplica descontos diferentes para alunos, professores e funcionários. Em vez de três funções quase iguais, uma fábrica:

```python
def fabrica_desconto(percentual):
    def aplicar(preco):
        return preco * (1 - percentual / 100)
    return aplicar


aluno = fabrica_desconto(10)
professor = fabrica_desconto(25)
print(aluno(40), professor(40))   # 36.0 30.0
```

Quando `fabrica_desconto(10)` termina, a variável `percentual` deveria sumir, como toda variável local. Mas `aplicar` ainda precisa dela. O Python então guarda `percentual` junto com a função devolvida. Essa combinação, uma função mais as variáveis do lugar onde ela nasceu, se chama **closure** (fechamento). Cada chamada da fábrica cria uma closure nova, com o seu próprio `percentual`: `aluno` e `professor` não se misturam.

Uma closure lembra o **escopo onde foi criada**, não o lugar de onde é chamada. Uma variável global `percentual = 50` criada depois não muda nada em `aluno`.

#### O erro comum: devolver a chamada em vez da função

```python
def fabrica_desconto(percentual):
    def aplicar(preco):
        return preco * (1 - percentual / 100)
    return aplicar()      # chama aplicar sem o preço
```

Com os parênteses, a fábrica tenta **executar** `aplicar` na hora, sem argumento, e quebra:

```
TypeError: fabrica_desconto.<locals>.aplicar() missing 1 required positional argument: 'preco'
```

`return aplicar` entrega a função; `return aplicar()` entrega o resultado de chamá-la. Para fabricar funções, sem parênteses.

## Passo 2 · Previsão · Duas fábricas, dois estados

O programa cria duas funções com a mesma fábrica e depois cria uma variável global com o mesmo nome do parâmetro. Leia sem executar e digite exatamente o que ele imprime.

### Código
```python
def fabrica_multiplicador(n):
    def multiplicar(x):
        return x * n
    return multiplicar


dobro = fabrica_multiplicador(2)
triplo = fabrica_multiplicador(3)
print(dobro(5), triplo(5))
print(dobro(triplo(2)))
n = 100
print(dobro(1))
print(dobro.__name__)
```

### Dicas
1. Cada chamada de `fabrica_multiplicador` guarda o seu próprio `n`.
2. `dobro(triplo(2))` resolve primeiro o de dentro.
3. A closure usa o `n` de onde nasceu, não a variável global criada depois.

### Saída esperada
```text
10 15
12
2
multiplicar
```

## Passo 3 · Exercício · Fábricas de funções
modo: lacunas

Duas fábricas:

- `fabrica_multiplicador(n)` devolve uma função que multiplica o argumento por `n`.
- `fabrica_validador(minimo, maximo)` devolve uma função que diz se um valor está entre `minimo` e `maximo`, incluindo os dois extremos. Uma nota do ENEM de 0 a 1000, uma nota de prova de 0 a 10 e uma idade de 18 a 65 viram três validadores com a mesma fábrica:

```python
nota_valida = fabrica_validador(0, 10)
nota_valida(10)    # True
nota_valida(10.5)  # False
```

Complete as quatro lacunas (`___`).

### Instruções
1. A função interna de `fabrica_multiplicador` usa o `n` capturado.
2. `fabrica_multiplicador` devolve a função interna, sem chamá-la.
3. A função interna de `fabrica_validador` compara o valor com os dois limites capturados, incluindo os extremos.

### Código inicial
```python
def fabrica_multiplicador(n):
    def multiplicar(x):
        return x * ___
    return ___


def fabrica_validador(minimo, maximo):
    def validar(valor):
        return ___ <= valor <= ___
    return validar
```

### Solução
```python
def fabrica_multiplicador(n):
    def multiplicar(x):
        return x * n
    return multiplicar


def fabrica_validador(minimo, maximo):
    def validar(valor):
        return minimo <= valor <= maximo
    return validar
```

### Dicas
1. A função interna enxerga os parâmetros da fábrica.
2. Devolver a função é escrever o nome dela, sem parênteses.
3. `a <= x <= b` vale para os extremos também.

### Verificação
```json
[
  { "id": "mult-3", "checkpoint": 1, "kind": "expr", "expr": "fabrica_multiplicador(3)(7)", "expected": 21,
    "name": "fabrica_multiplicador(3)(7) é 21", "hint": "Multiplique pelo n da fábrica." },
  { "id": "mult-independentes", "checkpoint": 1, "kind": "expr",
    "setup": "dobro = fabrica_multiplicador(2)\ntriplo = fabrica_multiplicador(3)\nmeio = fabrica_multiplicador(0.5)",
    "expr": "[dobro(5), triplo(5), meio(5), dobro(-4)]", "expected": [10, 15, 2.5, -8],
    "name": "Cada função fabricada guarda o seu próprio n" },
  { "id": "mult-funcao", "checkpoint": 2, "kind": "expr", "setup": "f = fabrica_multiplicador(4)",
    "expr": "[callable(f), f.__name__]", "expected": [true, "multiplicar"],
    "name": "A fábrica devolve a função interna", "hint": "Devolva multiplicar, sem parênteses." },
  { "id": "valida-nota", "checkpoint": 3, "kind": "expr", "setup": "nota = fabrica_validador(0, 10)",
    "expr": "[nota(0), nota(7.5), nota(10), nota(10.5), nota(-1)]", "expected": [true, true, true, false, false],
    "name": "Validador de 0 a 10 aceita os extremos e recusa o que está fora", "hint": "Os dois extremos valem." },
  { "id": "valida-idade", "checkpoint": 3, "kind": "expr",
    "setup": "idade = fabrica_validador(18, 65)\nenem = fabrica_validador(0, 1000)",
    "expr": "[idade(17), idade(18), idade(66), enem(980), enem(1001)]", "expected": [false, true, false, true, false],
    "name": "Dois validadores com limites diferentes não se misturam" }
]
```

### Soluções erradas
```python name="devolve a chamada em vez da função"
def fabrica_multiplicador(n):
    def multiplicar(x):
        return x * n
    return multiplicar(n)


def fabrica_validador(minimo, maximo):
    def validar(valor):
        return minimo <= valor <= maximo
    return validar
```
```python name="eleva ao quadrado em vez de usar n"
def fabrica_multiplicador(n):
    def multiplicar(x):
        return x * x
    return multiplicar


def fabrica_validador(minimo, maximo):
    def validar(valor):
        return minimo <= valor <= maximo
    return validar
```
```python name="exclui os extremos"
def fabrica_multiplicador(n):
    def multiplicar(x):
        return x * n
    return multiplicar


def fabrica_validador(minimo, maximo):
    def validar(valor):
        return minimo < valor < maximo
    return validar
```
```python name="limites trocados"
def fabrica_multiplicador(n):
    def multiplicar(x):
        return x * n
    return multiplicar


def fabrica_validador(minimo, maximo):
    def validar(valor):
        return maximo <= valor <= minimo
    return validar
```

## Passo 4 · Leitura · nonlocal: mudar o que foi capturado

Até aqui as closures só **liam** as variáveis capturadas. Para distribuir senhas na fila do RU, a função precisa **mudar** o número a cada chamada:

```python
def criar_senhas():
    ultima = 0
    def proxima():
        ultima += 1          # quebra
        return ultima
    return proxima
```

Na primeira chamada de `proxima()`:

```
UnboundLocalError: cannot access local variable 'ultima' where it is not associated with a value
```

A regra do Python é: se uma função **atribui** a um nome (`=`, `+=`), esse nome é local dela. Então `ultima` dentro de `proxima` é uma variável local nova, e `ultima += 1` tenta ler essa local antes de ela existir. A declaração `nonlocal` diz o contrário: "este nome é o da função de fora".

```python
def criar_senhas():
    ultima = 0
    def proxima():
        nonlocal ultima
        ultima += 1
        return ultima
    return proxima
```

`nonlocal` procura o nome nas funções que envolvem a atual. `global`, que você conhece do Nível 1, pula direto para o nível do módulo. Com `global`, todos os distribuidores de senha dividiriam o mesmo número; com `nonlocal`, cada um tem o seu.

Observe no visualizador: `ru` e `biblioteca` são duas closures, e cada uma carrega o seu próprio `ultima`. Chamar uma não mexe na outra.

```python visualizar
def criar_senhas():
    ultima = 0
    def proxima():
        nonlocal ultima
        ultima += 1
        return ultima
    return proxima


ru = criar_senhas()
biblioteca = criar_senhas()
a = ru()
b = ru()
c = biblioteca()
d = ru()
print(a, b, c, d)
```

#### Closure ou classe?

Uma closure com estado faz o papel de um objeto com **um** método só: o estado fica nas variáveis capturadas, em vez de atributos. Para uma única operação (dar a próxima senha), a closure é mais curta. Quando aparecem várias operações sobre o mesmo estado (dar senha, cancelar, consultar a fila), uma classe organiza melhor.

## Passo 5 · Exercício · Contador e média acumulada

Escreva duas fábricas que guardam estado com `nonlocal`:

- `criar_contador(inicio=0, passo=1)` devolve uma função sem parâmetros que, a cada chamada, devolve o próximo número da contagem. A **primeira** chamada devolve o próprio `inicio`.
- `criar_media()` devolve uma função `registrar(nota)` que guarda a nota e devolve a média de **todas** as notas registradas até ali.

```python
senha = criar_contador(100, 1)
senha(), senha(), senha()   # 100, 101, 102

media = criar_media()
media(8), media(6), media(10)   # 8.0, 7.0, 8.0
```

Contadores e médias criados separadamente não podem se misturar.

### Instruções
1. `criar_contador` devolve uma função cuja primeira chamada devolve `inicio`, e cada chamada seguinte soma `passo`.
2. Dois contadores criados por `criar_contador` são independentes.
3. `criar_media()` devolve uma função que guarda o total e a quantidade de notas e devolve a média atual como `float`.
   Dica: são duas variáveis capturadas; as duas precisam de `nonlocal`.

### Código inicial
```python
def criar_contador(inicio=0, passo=1):
    pass


def criar_media():
    pass
```

### Solução
```python
def criar_contador(inicio=0, passo=1):
    atual = inicio - passo

    def proximo():
        nonlocal atual
        atual += passo
        return atual

    return proximo


def criar_media():
    total = 0
    quantidade = 0

    def registrar(nota):
        nonlocal total, quantidade
        total += nota
        quantidade += 1
        return total / quantidade

    return registrar
```

### Dicas
1. Se o contador soma antes de devolver, comece um passo antes do `inicio`.
2. Uma variável global serviria um contador só; a variável precisa morar dentro da fábrica.
3. A média de todas as notas é o total dividido pela quantidade, não a média da última com a anterior.

### Verificação
```json
[
  { "id": "conta-padrao", "checkpoint": 1, "kind": "expr", "setup": "c = criar_contador()",
    "expr": "[c(), c(), c()]", "expected": [0, 1, 2],
    "name": "criar_contador() conta 0, 1, 2", "hint": "A primeira chamada devolve o próprio inicio." },
  { "id": "conta-passo", "checkpoint": 1, "kind": "expr", "setup": "c = criar_contador(10, 5)",
    "expr": "[c(), c(), c(), c()]", "expected": [10, 15, 20, 25],
    "name": "criar_contador(10, 5) conta 10, 15, 20, 25" },
  { "id": "conta-nomeado", "checkpoint": 1, "kind": "expr", "setup": "c = criar_contador(passo=-2, inicio=3)",
    "expr": "[c(), c(), c()]", "expected": [3, 1, -1],
    "name": "Passo negativo, com argumentos nomeados" },
  { "id": "conta-funcao", "checkpoint": 1, "kind": "expr", "expr": "callable(criar_contador(1))", "expected": true,
    "name": "criar_contador devolve uma função", "hint": "Devolva a função interna sem chamá-la." },
  { "id": "independentes", "checkpoint": 2, "kind": "expr",
    "setup": "ru = criar_contador(1)\nbib = criar_contador(1)\nru()\nru()\nru()",
    "expr": "[bib(), ru(), bib()]", "expected": [1, 4, 2],
    "name": "Dois contadores não dividem o número", "hint": "O estado precisa morar dentro da fábrica, não numa variável global." },
  { "id": "media", "checkpoint": 3, "kind": "expr", "setup": "m = criar_media()",
    "expr": "[m(8), m(6), m(10)]", "expected": [8.0, 7.0, 8.0],
    "name": "Média de 8, 6 e 10, nota a nota" },
  { "id": "media-todas", "checkpoint": 3, "kind": "expr", "setup": "m = criar_media()\nfor nota in [10, 10, 10]:\n    m(nota)",
    "expr": "m(2)", "expected": 8.0, "type": "float", "tolerance": 1e-9,
    "name": "A média considera todas as notas registradas", "hint": "Guarde o total e a quantidade." },
  { "id": "media-independentes", "checkpoint": 3, "kind": "expr",
    "setup": "turma_a = criar_media()\nturma_b = criar_media()\nturma_a(10)\nturma_a(9)",
    "expr": "[turma_b(4), turma_a(5)]", "expected": [4.0, 8.0], "tolerance": 1e-9,
    "name": "Duas médias criadas separadamente não se misturam" }
]
```

### Soluções erradas
```python name="estado em variável global"
atual = 0
total = 0
quantidade = 0


def criar_contador(inicio=0, passo=1):
    global atual
    atual = inicio - passo

    def proximo():
        global atual
        atual += passo
        return atual

    return proximo


def criar_media():
    def registrar(nota):
        global total, quantidade
        total += nota
        quantidade += 1
        return total / quantidade

    return registrar
```
```python name="sem nonlocal"
def criar_contador(inicio=0, passo=1):
    atual = inicio - passo

    def proximo():
        atual += passo
        return atual

    return proximo


def criar_media():
    total = 0
    quantidade = 0

    def registrar(nota):
        total += nota
        quantidade += 1
        return total / quantidade

    return registrar
```
```python name="primeira chamada já pula o inicio"
def criar_contador(inicio=0, passo=1):
    atual = inicio

    def proximo():
        nonlocal atual
        atual += passo
        return atual

    return proximo


def criar_media():
    total = 0
    quantidade = 0

    def registrar(nota):
        nonlocal total, quantidade
        total += nota
        quantidade += 1
        return total / quantidade

    return registrar
```
```python name="média da última nota com a anterior"
def criar_contador(inicio=0, passo=1):
    atual = inicio - passo

    def proximo():
        nonlocal atual
        atual += passo
        return atual

    return proximo


def criar_media():
    media = None

    def registrar(nota):
        nonlocal media
        if media is None:
            media = float(nota)
        else:
            media = (media + nota) / 2
        return media

    return registrar
```

## Passo 6 · Exercício · O laço que captura e o partial

Uma closure captura a **variável**, não o valor que ela tinha no momento. Isso pega muita gente num laço:

```python
somadores = []
for k in range(3):
    somadores.append(lambda x: x + k)
print([f(10) for f in somadores])   # [12, 12, 12], não [10, 11, 12]
```

As três funções olham para o mesmo `k`, e quando são chamadas o laço já terminou com `k = 2`. A correção é dar a cada função o **seu** valor no momento da criação: com uma fábrica (`fabrica_somador(k)`, como no passo 3) ou com um parâmetro padrão, que é calculado na hora do `def`/`lambda`: `lambda x, k=k: x + k`.

Outro jeito de especializar uma função é `functools.partial`: ele "congela" alguns argumentos e devolve uma função nova que pede só o resto.

```python
from functools import partial

arredondar_2 = partial(round, ndigits=2)
arredondar_2(3.14159)   # 3.14
```

O código inicial tem o defeito do laço. Corrija `criar_somadores(n)` e crie `quadrado` e `cubo` a partir de `potencia`.

### Instruções
1. `criar_somadores(n)` devolve uma lista de `n` funções; a de posição `k` soma `k` ao argumento.
   Dica: cada função precisa receber o valor de `k` no momento em que é criada.
2. Crie `quadrado` com `partial` sobre `potencia`, fixando o expoente 2.
3. Crie `cubo` do mesmo jeito, com expoente 3.
   Dica: `partial(potencia, 2)` fixaria a **base**, não o expoente.

### Código inicial
```python
from functools import partial


def criar_somadores(n):
    somadores = []
    for k in range(n):
        somadores.append(lambda x: x + k)
    return somadores


def potencia(base, expoente):
    return base ** expoente


quadrado = None
cubo = None
```

### Solução
```python
from functools import partial


def criar_somadores(n):
    somadores = []
    for k in range(n):
        somadores.append(lambda x, k=k: x + k)
    return somadores


def potencia(base, expoente):
    return base ** expoente


quadrado = partial(potencia, expoente=2)
cubo = partial(potencia, expoente=3)
```

### Dicas
1. Trocar a `lambda` por um `def` dentro do laço não resolve: ele também lê `k` só quando é chamado.
2. Argumentos posicionais do `partial` preenchem os primeiros parâmetros; para fixar o segundo, use o nome dele.
3. `quadrado` não é um `def` nem uma `lambda`: é o resultado de `partial(...)`.

### Verificação
```json
[
  { "id": "somadores-3", "checkpoint": 1, "kind": "expr", "expr": "[f(10) for f in criar_somadores(3)]", "expected": [10, 11, 12],
    "name": "Os três somadores somam 0, 1 e 2", "hint": "Cada função precisa guardar o k do momento em que foi criada." },
  { "id": "somadores-5", "checkpoint": 1, "kind": "expr", "setup": "fs = criar_somadores(5)",
    "expr": "[len(fs), fs[0](1), fs[3](1), fs[4](-4)]", "expected": [5, 1, 4, 0],
    "name": "Com n = 5, cada posição soma o próprio índice" },
  { "id": "somadores-0", "checkpoint": 1, "kind": "expr", "expr": "criar_somadores(0)", "expected": [],
    "name": "Com n = 0, a lista é vazia" },
  { "id": "quadrado", "checkpoint": 2, "kind": "expr", "expr": "[quadrado(5), quadrado(-3), quadrado(1.5)]", "expected": [25, 9, 2.25],
    "name": "quadrado eleva ao expoente 2", "hint": "Fixe o expoente pelo nome." },
  { "id": "quadrado-partial", "checkpoint": 2, "kind": "expr", "expr": "[type(quadrado).__name__, quadrado.func is potencia]",
    "expected": ["partial", true], "name": "quadrado é um partial de potencia", "hint": "Use partial(potencia, ...)." },
  { "id": "cubo", "checkpoint": 3, "kind": "expr", "expr": "[cubo(2), cubo(-1), cubo(10)]", "expected": [8, -1, 1000],
    "name": "cubo eleva ao expoente 3" },
  { "id": "cubo-partial", "checkpoint": 3, "kind": "expr", "expr": "[type(cubo).__name__, cubo.func is potencia]",
    "expected": ["partial", true], "name": "cubo é um partial de potencia" }
]
```

### Soluções erradas
```python name="lambda captura a variável do laço"
from functools import partial


def criar_somadores(n):
    somadores = []
    for k in range(n):
        somadores.append(lambda x: x + k)
    return somadores


def potencia(base, expoente):
    return base ** expoente


quadrado = partial(potencia, expoente=2)
cubo = partial(potencia, expoente=3)
```
```python name="def dentro do laço também captura a variável"
from functools import partial


def criar_somadores(n):
    somadores = []
    for k in range(n):
        def somar(x):
            return x + k
        somadores.append(somar)
    return somadores


def potencia(base, expoente):
    return base ** expoente


quadrado = partial(potencia, expoente=2)
cubo = partial(potencia, expoente=3)
```
```python name="partial fixa a base em vez do expoente"
from functools import partial


def criar_somadores(n):
    somadores = []
    for k in range(n):
        somadores.append(lambda x, k=k: x + k)
    return somadores


def potencia(base, expoente):
    return base ** expoente


quadrado = partial(potencia, 2)
cubo = partial(potencia, 3)
```
```python name="lambda no lugar do partial"
from functools import partial


def criar_somadores(n):
    somadores = []
    for k in range(n):
        somadores.append(lambda x, k=k: x + k)
    return somadores


def potencia(base, expoente):
    return base ** expoente


quadrado = lambda base: potencia(base, 2)
cubo = lambda base: potencia(base, 3)
```

## Passo 7 · Quiz · Closures

### Pergunta
O que este programa imprime?
```python
def criar():
    acoes = []
    for nome in ["Ana", "Bia"]:
        acoes.append(lambda: "oi, " + nome)
    return acoes


for acao in criar():
    print(acao())
```
- [ ] `oi, Ana` e depois `oi, Bia`
- [x] `oi, Bia` duas vezes
- [ ] `oi, Ana` duas vezes
- [ ] `NameError`, porque `nome` não existe mais depois do laço
> As duas `lambda` capturam a **variável** `nome`, não o valor. Quando são chamadas, o laço já terminou e `nome` vale `"Bia"`. A variável continua existindo porque a closure a guarda.

### Pergunta
Uma função interna faz `total += valor`, sendo `total` uma variável da função de fora. Qual é a correção para o `UnboundLocalError`?
- [ ] `global total` na função interna
- [x] `nonlocal total` na função interna
- [ ] `nonlocal total` na função de fora
- [ ] Trocar `total += valor` por `total = total + valor`
> `nonlocal` faz o nome apontar para a variável da função que envolve a atual. `global` apontaria para uma variável do módulo, compartilhada por todas as closures. `total = total + valor` também é atribuição e dá o mesmo erro.

### Pergunta
Com `def potencia(base, expoente): return base ** expoente`, quanto valem `f(3)` e `g(3)`?
```python
f = partial(potencia, 2)
g = partial(potencia, expoente=2)
```
- [ ] `f(3)` e `g(3)` valem 9
- [ ] `f(3)` vale 9 e `g(3)` vale 8
- [x] `f(3)` vale 8 e `g(3)` vale 9
- [ ] `f(3)` dá erro, porque `partial` exige argumentos nomeados
> Argumentos posicionais do `partial` preenchem os primeiros parâmetros: `f` fixa `base=2`, então `f(3)` é $2^3 = 8$. `g` fixa `expoente=2`, então `g(3)` é $3^2 = 9$.
