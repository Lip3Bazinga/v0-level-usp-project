---
slug: n2-m2-03-biblioteca-padrao-essencial
titulo: Biblioteca padrão essencial
descricao: 'math, random, datetime, collections, itertools e functools: resolver problemas comuns sem reinventar a roda.'
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
- Usar math, random (com seed) e datetime para cálculos, sorteios e datas
- Aplicar Counter, defaultdict, deque e namedtuple de collections
- Combinar itertools (product, permutations, combinations, groupby) e functools.reduce em problemas de contagem e agregação
---

## Passo 1 · Leitura · Antes de escrever, procure na biblioteca

O Python vem com centenas de módulos prontos, a **biblioteca padrão**. Eles são importados como os seus módulos (`import math`), mas já vêm instalados. Antes de escrever uma função de datas ou de sorteio, vale perguntar: isso já existe? Quase sempre existe, testado por milhões de pessoas.

#### math: contas que não são só os operadores

```python
import math

math.sqrt(16)       # 4.0
math.ceil(10 / 3)   # 4  (arredonda para cima)
math.floor(10 / 3)  # 3  (arredonda para baixo)
math.gcd(12, 18)    # 6  (máximo divisor comum)
math.pi             # 3.141592653589793
```

`ceil` resolve um problema clássico: 10 alunos em grupos de 3 precisam de `math.ceil(10 / 3)`, ou seja, 4 grupos. Com `10 // 3` sobraria um aluno sem grupo.

#### random: sorteios que dá para repetir

`random.choice(lista)` sorteia um item, `random.sample(lista, k)` sorteia `k` itens sem repetir e devolve uma lista nova, e `random.shuffle(lista)` embaralha **a própria lista**, alterando-a. Os números do `random` não são acaso de verdade: saem de uma conta que parte de um valor inicial, a **semente**. Com `random.seed(42)` antes, o sorteio sai igual em toda execução. Sem semente, cada execução dá um resultado diferente, e aí não há como testar nem reproduzir um erro.

#### datetime: datas no formato brasileiro

```python
from datetime import datetime, timedelta

prova = datetime.strptime("25/12/2025", "%d/%m/%Y").date()
entrega = prova + timedelta(days=10)
print(entrega.strftime("%d/%m/%Y"))   # 04/01/2026
print((entrega - prova).days)         # 10
```

`strptime` (*string parse time*) **lê** um texto como data, seguindo um formato: `%d` é o dia, `%m` o mês e `%Y` o ano com quatro dígitos. `strftime` (*string format time*) faz o caminho inverso. Somar um `timedelta` (uma duração) a uma data dá outra data, já cuidando de virada de mês, de ano e de ano bissexto; subtrair duas datas dá um `timedelta`, e `.days` é o número de dias.

O erro clássico é o formato americano, `%m/%d/%Y`, que lê `25/12/2025` como mês 25 e dá `ValueError: time data '25/12/2025' does not match format '%m/%d/%Y'`. Pior: uma data como `03/04/2026` passa sem erro, só que vira 4 de março.

## Passo 2 · Exercício · Prazos com datetime
modo: lacunas

A secretaria quer duas contas com datas escritas no formato brasileiro, `dd/mm/aaaa`: quantos dias há entre duas datas e qual é a data de vencimento de um documento emitido hoje com um prazo em dias. A função `ler_data` faz a leitura e as outras duas a usam.

### Instruções
1. Complete `FORMATO` com o formato brasileiro de data, com ano de quatro dígitos.
2. Em `ler_data`, complete o método que tira só a data (sem hora) do resultado de `strptime`.
3. Em `dias_entre`, complete o atributo que dá o número de dias de uma diferença entre datas.
4. Em `vencimento`, complete o tipo que representa uma duração em dias.

### Código inicial
```python
from datetime import datetime, timedelta

FORMATO = "___"


def ler_data(texto):
    return datetime.strptime(texto, FORMATO).___()


def dias_entre(inicio, fim):
    return (ler_data(fim) - ler_data(inicio)).___


def vencimento(emissao, prazo_dias):
    data = ler_data(emissao) + ___(days=prazo_dias)
    return data.strftime(FORMATO)
```

### Solução
```python
from datetime import datetime, timedelta

FORMATO = "%d/%m/%Y"


def ler_data(texto):
    return datetime.strptime(texto, FORMATO).date()


def dias_entre(inicio, fim):
    return (ler_data(fim) - ler_data(inicio)).days


def vencimento(emissao, prazo_dias):
    data = ler_data(emissao) + timedelta(days=prazo_dias)
    return data.strftime(FORMATO)
```

### Dicas
1. No formato, `%d` é o dia, `%m` é o mês e `%Y` é o ano com quatro dígitos, separados por barras.
2. O resultado de `strptime` é um `datetime` (data e hora); o método que fica só com a data tem o nome do tipo `date`.
3. A diferença entre duas datas é um `timedelta`, e o atributo com os dias está no plural.

### Verificação
```json
[
  { "id": "ler-dia-mes", "checkpoint": 1, "kind": "expr", "expr": "ler_data('05/11/2026').isoformat()", "expected": "2026-11-05",
    "name": "05/11/2026 é lido como 5 de novembro", "hint": "O dia vem antes do mês no formato brasileiro." },
  { "id": "ler-tipo", "checkpoint": 2, "kind": "expr", "expr": "type(ler_data('13/05/2026')).__name__", "expected": "date",
    "name": "ler_data devolve só a data, sem hora" },
  { "id": "dias-bissexto", "checkpoint": 3, "kind": "call", "function": "dias_entre", "args": ["01/02/2024", "01/03/2024"], "expected": 29, "type": "int",
    "name": "De 01/02/2024 a 01/03/2024 são 29 dias", "hint": "Devolva um número inteiro de dias." },
  { "id": "dias-virada", "checkpoint": 3, "kind": "call", "function": "dias_entre", "args": ["25/12/2025", "01/01/2026"], "expected": 7, "type": "int",
    "name": "De 25/12/2025 a 01/01/2026 são 7 dias" },
  { "id": "dias-negativo", "checkpoint": 3, "kind": "call", "function": "dias_entre", "args": ["15/03/2026", "10/03/2026"], "expected": -5, "type": "int",
    "name": "Data final antes da inicial dá um número negativo" },
  { "id": "venc-virada", "checkpoint": 4, "kind": "call", "function": "vencimento", "args": ["20/12/2025", 15], "expected": "04/01/2026",
    "name": "vencimento('20/12/2025', 15) é 04/01/2026" },
  { "id": "venc-bissexto", "checkpoint": 4, "kind": "call", "function": "vencimento", "args": ["28/02/2024", 1], "expected": "29/02/2024",
    "name": "vencimento('28/02/2024', 1) é 29/02/2024" }
]
```

### Soluções erradas
```python name="formato americano"
from datetime import datetime, timedelta

FORMATO = "%m/%d/%Y"


def ler_data(texto):
    return datetime.strptime(texto, FORMATO).date()


def dias_entre(inicio, fim):
    return (ler_data(fim) - ler_data(inicio)).days


def vencimento(emissao, prazo_dias):
    data = ler_data(emissao) + timedelta(days=prazo_dias)
    return data.strftime(FORMATO)
```
```python name="ano com dois dígitos"
from datetime import datetime, timedelta

FORMATO = "%d/%m/%y"


def ler_data(texto):
    return datetime.strptime(texto, FORMATO).date()


def dias_entre(inicio, fim):
    return (ler_data(fim) - ler_data(inicio)).days


def vencimento(emissao, prazo_dias):
    data = ler_data(emissao) + timedelta(days=prazo_dias)
    return data.strftime(FORMATO)
```
```python name="subtrai só o dia do mês"
from datetime import datetime, timedelta

FORMATO = "%d/%m/%Y"


def ler_data(texto):
    return datetime.strptime(texto, FORMATO).date()


def dias_entre(inicio, fim):
    return ler_data(fim).day - ler_data(inicio).day


def vencimento(emissao, prazo_dias):
    data = ler_data(emissao) + timedelta(days=prazo_dias)
    return data.strftime(FORMATO)
```

## Passo 3 · Exercício · Sorteio de equipes que dá para repetir

O professor quer dividir a turma em equipes por sorteio. Mas, se algum aluno reclamar, ele precisa conseguir **refazer o mesmo sorteio** e mostrar que foi justo. Por isso a função recebe uma semente.

- `quantidade_de_equipes(total, tamanho)` devolve quantas equipes são necessárias para `total` alunos em equipes de até `tamanho`. Com 10 alunos e equipes de 3, são 4 equipes (a última fica com 1).
- `sortear_equipes(nomes, tamanho, semente)` fixa a semente, sorteia a ordem dos nomes e devolve uma lista de equipes (cada equipe é uma lista de nomes), todas com `tamanho` nomes, menos talvez a última. A lista `nomes` recebida não pode ser alterada.

### Instruções
1. Em `quantidade_de_equipes`, use uma função do `math` para arredondar a divisão para cima.
2. Em `sortear_equipes`, fixe a semente com o `random` antes de sortear: a mesma semente precisa dar sempre as mesmas equipes, e sementes diferentes, equipes diferentes.
3. Sorteie sem alterar a lista recebida e devolva as equipes, cada uma com `tamanho` nomes (a última pode ter menos), sem perder nem repetir ninguém.
   Dica: uma fatia de `i * tamanho` até `(i + 1) * tamanho` pega a equipe de número `i`.

### Código inicial
```python
import math
import random


def quantidade_de_equipes(total, tamanho):
    pass


def sortear_equipes(nomes, tamanho, semente):
    pass
```

### Solução
```python
import math
import random


def quantidade_de_equipes(total, tamanho):
    return math.ceil(total / tamanho)


def sortear_equipes(nomes, tamanho, semente):
    random.seed(semente)
    sorteados = random.sample(nomes, len(nomes))
    equipes = []
    for i in range(quantidade_de_equipes(len(nomes), tamanho)):
        equipes.append(sorteados[i * tamanho:(i + 1) * tamanho])
    return equipes
```

### Dicas
1. `math.ceil` arredonda para cima; `//` arredonda para baixo e deixa alunos de fora.
2. `random.sample(lista, len(lista))` devolve uma lista nova embaralhada; `random.shuffle` embaralha a lista original.
3. Monte uma equipe por volta do laço, com uma fatia da lista sorteada.

### Verificação
```json
[
  { "id": "qtd-10-3", "checkpoint": 1, "kind": "call", "function": "quantidade_de_equipes", "args": [10, 3], "expected": 4, "type": "int",
    "name": "quantidade_de_equipes(10, 3) é 4", "hint": "Sobrou aluno? Ele precisa de uma equipe." },
  { "id": "qtd-12-4", "checkpoint": 1, "kind": "call", "function": "quantidade_de_equipes", "args": [12, 4], "expected": 3, "type": "int",
    "name": "quantidade_de_equipes(12, 4) é 3" },
  { "id": "qtd-1-5", "checkpoint": 1, "kind": "call", "function": "quantidade_de_equipes", "args": [1, 5], "expected": 1, "type": "int",
    "name": "quantidade_de_equipes(1, 5) é 1" },
  { "id": "mesma-semente", "checkpoint": 2, "kind": "expr", "setup": "turma = ['Ana', 'Bia', 'Caio', 'Davi', 'Eva', 'Fábio', 'Gil', 'Hugo']",
    "expr": "sortear_equipes(turma, 3, 42) == sortear_equipes(turma, 3, 42)", "expected": true,
    "name": "A mesma semente dá as mesmas equipes", "hint": "Fixe a semente dentro da função, antes de sortear." },
  { "id": "sementes-diferentes", "checkpoint": 2, "kind": "expr", "setup": "turma = ['Ana', 'Bia', 'Caio', 'Davi', 'Eva', 'Fábio', 'Gil', 'Hugo']",
    "expr": "sortear_equipes(turma, 4, 1) != sortear_equipes(turma, 4, 2)", "expected": true,
    "name": "Sementes diferentes dão equipes diferentes", "hint": "Os nomes precisam ser sorteados, não usados na ordem original." },
  { "id": "nao-altera", "checkpoint": 3, "kind": "expr",
    "setup": "turma = ['Ana', 'Bia', 'Caio', 'Davi', 'Eva']\ncopia = list(turma)\nsortear_equipes(turma, 2, 5)",
    "expr": "turma == copia", "expected": true, "name": "A lista recebida não é alterada", "hint": "Sorteie numa lista nova." },
  { "id": "tamanhos", "checkpoint": 3, "kind": "expr", "setup": "turma = ['Ana', 'Bia', 'Caio', 'Davi', 'Eva', 'Fábio', 'Gil', 'Hugo']",
    "expr": "[len(equipe) for equipe in sortear_equipes(turma, 3, 7)]", "expected": [3, 3, 2],
    "name": "8 alunos em equipes de 3 ficam 3, 3 e 2" },
  { "id": "todos-uma-vez", "checkpoint": 3, "kind": "expr", "setup": "turma = ['Ana', 'Bia', 'Caio', 'Davi', 'Eva', 'Fábio', 'Gil', 'Hugo', 'Iara', 'João']",
    "expr": "sorted(nome for equipe in sortear_equipes(turma, 4, 3) for nome in equipe) == sorted(turma)", "expected": true,
    "name": "Cada aluno aparece em exatamente uma equipe" }
]
```

### Soluções erradas
```python name="sorteia sem semente"
import math
import random


def quantidade_de_equipes(total, tamanho):
    return math.ceil(total / tamanho)


def sortear_equipes(nomes, tamanho, semente):
    sorteados = random.sample(nomes, len(nomes))
    equipes = []
    for i in range(quantidade_de_equipes(len(nomes), tamanho)):
        equipes.append(sorteados[i * tamanho:(i + 1) * tamanho])
    return equipes
```
```python name="shuffle altera a lista do professor"
import math
import random


def quantidade_de_equipes(total, tamanho):
    return math.ceil(total / tamanho)


def sortear_equipes(nomes, tamanho, semente):
    random.seed(semente)
    random.shuffle(nomes)
    equipes = []
    for i in range(quantidade_de_equipes(len(nomes), tamanho)):
        equipes.append(nomes[i * tamanho:(i + 1) * tamanho])
    return equipes
```
```python name="divisão inteira deixa alunos de fora"
import math
import random


def quantidade_de_equipes(total, tamanho):
    return total // tamanho


def sortear_equipes(nomes, tamanho, semente):
    random.seed(semente)
    sorteados = random.sample(nomes, len(nomes))
    equipes = []
    for i in range(quantidade_de_equipes(len(nomes), tamanho)):
        equipes.append(sorteados[i * tamanho:(i + 1) * tamanho])
    return equipes
```
```python name="fixa a semente mas não sorteia"
import math
import random


def quantidade_de_equipes(total, tamanho):
    return math.ceil(total / tamanho)


def sortear_equipes(nomes, tamanho, semente):
    random.seed(semente)
    equipes = []
    for i in range(quantidade_de_equipes(len(nomes), tamanho)):
        equipes.append(nomes[i * tamanho:(i + 1) * tamanho])
    return equipes
```

## Passo 4 · Leitura · collections: estruturas sob medida

O módulo `collections` tem versões especializadas das coleções que você já conhece. Cada uma resolve um padrão que você já escreveu na mão.

#### Counter: contar sem if

Contar palavras com dicionário pede o `if palavra in contagem`. O `Counter` faz isso sozinho e ainda ordena:

```python
from collections import Counter

votos = Counter(["Ana", "Caio", "Ana", "Bia", "Ana", "Caio"])
votos["Ana"]            # 3
votos["Davi"]           # 0 (quem não aparece conta zero, sem KeyError)
votos.most_common(2)    # [('Ana', 3), ('Caio', 2)]
```

Em empate, `most_common` mantém a ordem em que os itens apareceram pela primeira vez.

#### defaultdict: o valor inicial já vem pronto

Para agrupar, o padrão era "se a chave não existe, crie uma lista vazia; depois, adicione". O `defaultdict` recebe uma **fábrica**, uma função sem argumentos que cria o valor inicial de cada chave nova:

```python
from collections import defaultdict

por_curso = defaultdict(list)
por_curso["Física"].append("Ana")   # a chave nasce com list(), ou seja, []
```

Passe a fábrica sem parênteses: `defaultdict(list)`, e não `defaultdict(list())`. Esquecer a fábrica, com `defaultdict()`, devolve um dicionário comum, e a primeira chave nova dá `KeyError`. Cuidado também ao devolver um `defaultdict` para quem chamou: uma simples consulta a uma chave inexistente a cria. Por isso é comum terminar com `dict(por_curso)`.

#### deque: fila com as duas pontas rápidas

`deque` (pronuncia-se "deque") é uma fila em que acrescentar ou tirar nas duas pontas é instantâneo (`append`, `appendleft`, `pop`, `popleft`). Com `maxlen`, ela guarda só os últimos itens: `deque(maxlen=3)` com 4 inserções descarta a mais antiga. É o jeito natural de guardar "as 3 últimas senhas chamadas no RU".

#### namedtuple: tupla com nomes

```python
from collections import namedtuple

Ponto = namedtuple("Ponto", ["x", "y"])
p = Ponto(3, 4)
p.x + p.y      # 7, e p[0] ainda funciona
```

É uma tupla (imutável, desempacotável) cujos campos têm nome. Serve para registros simples que não precisam de métodos.

## Passo 5 · Exercício · Contar e agrupar

Dois relatórios para o grêmio estudantil:

- `top_palavras(texto, n)` devolve as `n` palavras mais frequentes do texto, como uma lista de pares `(palavra, contagem)`, da mais frequente para a menos frequente. As palavras são comparadas em minúsculas e sem a pontuação das pontas (`.,!?;:`): `"Bola,"` e `"bola"` são a mesma palavra. Em empate, vem antes a que apareceu primeiro.
- `agrupar_por_inicial(nomes)` devolve um `dict` comum cuja chave é a inicial em maiúscula e cujo valor é a lista de nomes com aquela inicial, na ordem original. Exemplo: `["Ana", "bia", "Alice"]` vira `{"A": ["Ana", "Alice"], "B": ["bia"]}`.

### Instruções
1. Escreva `top_palavras` usando `Counter` e `most_common`, com as palavras em minúsculas e sem a pontuação das pontas.
2. Escreva `agrupar_por_inicial` usando `defaultdict(list)` e devolva um `dict` comum.

### Código inicial
```python
from collections import Counter, defaultdict


def top_palavras(texto, n):
    pass


def agrupar_por_inicial(nomes):
    pass
```

### Solução
```python
from collections import Counter, defaultdict


def top_palavras(texto, n):
    palavras = [p.strip(".,!?;:").lower() for p in texto.split()]
    return Counter(p for p in palavras if p).most_common(n)


def agrupar_por_inicial(nomes):
    grupos = defaultdict(list)
    for nome in nomes:
        grupos[nome[0].upper()].append(nome)
    return dict(grupos)
```

### Dicas
1. `texto.split()` separa as palavras; `strip(".,!?;:")` tira a pontuação só das pontas.
2. `Counter(lista).most_common(n)` já devolve os pares na ordem certa, inclusive nos empates.
3. Com `defaultdict(list)`, `grupos[chave].append(nome)` funciona mesmo na primeira vez que a chave aparece. No fim, converta com `dict(...)`.

### Verificação
```json
[
  { "id": "top-empate", "checkpoint": 1, "kind": "call", "function": "top_palavras", "args": ["O rato roeu a roupa do rei de Roma. O rei riu!", 2],
    "expected": [["o", 2], ["rei", 2]], "type": "list",
    "name": "Top 2 de um trava-língua, com empate", "hint": "Compare as palavras em minúsculas; em empate, vale a ordem de aparição." },
  { "id": "top-pontuacao", "checkpoint": 1, "kind": "call", "function": "top_palavras", "args": ["Bola, bola, BOLA e casa; casa.", 3],
    "expected": [["bola", 3], ["casa", 2], ["e", 1]], "type": "list",
    "name": "Pontuação e maiúsculas não separam palavras", "hint": "Tire a pontuação das pontas de cada palavra." },
  { "id": "top-maior-que-total", "checkpoint": 1, "kind": "call", "function": "top_palavras", "args": ["sim sim", 5],
    "expected": [["sim", 2]], "type": "list", "name": "Pedir mais palavras do que existem" },
  { "id": "usa-collections", "checkpoint": 1, "kind": "source", "rule": { "type": "imports", "module": "collections" },
    "name": "Usa o módulo collections" },
  { "id": "agrupa", "checkpoint": 2, "kind": "call", "function": "agrupar_por_inicial", "args": [["Ana", "bia", "Beto", "Caio", "alice"]],
    "expected": { "A": ["Ana", "alice"], "B": ["bia", "Beto"], "C": ["Caio"] }, "type": "dict",
    "name": "Agrupa pela inicial em maiúscula, na ordem original", "hint": "Devolva um dict comum, convertido com dict(...)." },
  { "id": "agrupa-vazio", "checkpoint": 2, "kind": "call", "function": "agrupar_por_inicial", "args": [[]], "expected": {}, "type": "dict",
    "name": "Lista vazia dá dicionário vazio" }
]
```

### Soluções erradas
```python name="não converte para minúsculas"
from collections import Counter, defaultdict


def top_palavras(texto, n):
    palavras = [p.strip(".,!?;:") for p in texto.split()]
    return Counter(p for p in palavras if p).most_common(n)


def agrupar_por_inicial(nomes):
    grupos = defaultdict(list)
    for nome in nomes:
        grupos[nome[0].upper()].append(nome)
    return dict(grupos)
```
```python name="não tira a pontuação"
from collections import Counter, defaultdict


def top_palavras(texto, n):
    palavras = [p.lower() for p in texto.split()]
    return Counter(palavras).most_common(n)


def agrupar_por_inicial(nomes):
    grupos = defaultdict(list)
    for nome in nomes:
        grupos[nome[0].upper()].append(nome)
    return dict(grupos)
```
```python name="ordena em ordem alfabética, não por contagem"
from collections import Counter, defaultdict


def top_palavras(texto, n):
    palavras = [p.strip(".,!?;:").lower() for p in texto.split()]
    return sorted(Counter(p for p in palavras if p).items())[:n]


def agrupar_por_inicial(nomes):
    grupos = defaultdict(list)
    for nome in nomes:
        grupos[nome[0].upper()].append(nome)
    return dict(grupos)
```
```python name="defaultdict sem a fábrica"
from collections import Counter, defaultdict


def top_palavras(texto, n):
    palavras = [p.strip(".,!?;:").lower() for p in texto.split()]
    return Counter(p for p in palavras if p).most_common(n)


def agrupar_por_inicial(nomes):
    grupos = defaultdict()
    for nome in nomes:
        grupos[nome[0].upper()].append(nome)
    return dict(grupos)
```
```python name="devolve o defaultdict"
from collections import Counter, defaultdict


def top_palavras(texto, n):
    palavras = [p.strip(".,!?;:").lower() for p in texto.split()]
    return Counter(p for p in palavras if p).most_common(n)


def agrupar_por_inicial(nomes):
    grupos = defaultdict(list)
    for nome in nomes:
        grupos[nome[0].upper()].append(nome)
    return grupos
```

## Passo 6 · Previsão · itertools conta por você

O módulo `itertools` gera combinações sem laços aninhados. Quatro funções dele:

- `product(itens, repeat=n)`: todas as sequências de `n` itens, **com repetição** (como os segredos de um cadeado).
- `permutations(itens, k)`: todas as **ordenações** de `k` itens diferentes; `AB` e `BA` contam separado.
- `combinations(itens, k)`: todos os **grupos** de `k` itens diferentes, sem importar a ordem; `AB` e `BA` são o mesmo grupo.
- `groupby(itens)`: junta itens **vizinhos** iguais em grupos.

Elas devolvem iteradores, por isso o programa usa `list(...)` para ver tudo. Leia o programa e digite exatamente o que ele imprime.

### Código
```python
from itertools import combinations, groupby, permutations, product

print(len(list(product("01", repeat=3))))
print(len(list(permutations("ABCD", 2))), len(list(combinations("ABCD", 2))))
print(list(combinations([1, 2, 3], 2)))
for chave, grupo in groupby("AABBBA"):
    print(chave, len(list(grupo)))
```

### Dicas
1. Com repetição, cada uma das 3 posições pode ser `0` ou `1`.
2. Cada grupo de 2 letras de `combinations` aparece em 2 ordens diferentes em `permutations`.
3. `groupby` só junta itens **vizinhos**: o último `A` está longe dos dois primeiros.

### Saída esperada
```text
8
12 6
[(1, 2), (1, 3), (2, 3)]
A 2
B 3
A 1
```

## Passo 7 · Exercício · Senhas, duplas e totais

A previsão mostrou a pegadinha do `groupby`: ele só agrupa vizinhos. Para agrupar por chave, **ordene antes pela mesma chave**:

```python
from itertools import groupby

notas = [("Caio", 7), ("Ana", 9), ("Caio", 5)]
for nome, grupo in groupby(sorted(notas), key=lambda par: par[0]):
    print(nome, [nota for _, nota in grupo])   # Ana [9] / Caio [7, 5]
```

Outro módulo útil é o `functools`. Sua função `reduce` aplica uma função de dois argumentos acumulando da esquerda para a direita: `reduce(math.gcd, [12, 18, 30])` calcula `gcd(gcd(12, 18), 30)`, que é 6. Ele também tem o `lru_cache`, que guarda resultados de chamadas já feitas; você vai encontrá-lo de novo ao estudar decoradores.

Escreva quatro funções:

- `senhas_possiveis(alfabeto, tamanho)`: todas as senhas de `tamanho` caracteres do `alfabeto`, com repetição, como lista de textos, na ordem de `product`. Exemplo: `senhas_possiveis("ab", 2)` é `["aa", "ab", "ba", "bb"]`.
- `duplas(nomes)`: todas as duplas possíveis para um trabalho, como lista de tuplas; a dupla (Ana, Bia) é a mesma que (Bia, Ana).
- `total_por_dia(vendas)`: recebe pares `(dia, valor)` fora de ordem e devolve a lista de pares `(dia, total)`, por dia crescente.
- `mdc_da_lista(numeros)`: o máximo divisor comum de todos os números da lista.

### Instruções
1. Escreva `senhas_possiveis` com `product`.
2. Escreva `duplas` com a função do `itertools` em que a ordem não importa.
3. Escreva `total_por_dia` com `groupby`, ordenando as vendas antes.
4. Escreva `mdc_da_lista` com `reduce` e `math.gcd`.

### Código inicial
```python
import math
from functools import reduce
from itertools import combinations, groupby, product


def senhas_possiveis(alfabeto, tamanho):
    pass


def duplas(nomes):
    pass


def total_por_dia(vendas):
    pass


def mdc_da_lista(numeros):
    pass
```

### Solução
```python
import math
from functools import reduce
from itertools import combinations, groupby, product


def senhas_possiveis(alfabeto, tamanho):
    return ["".join(senha) for senha in product(alfabeto, repeat=tamanho)]


def duplas(nomes):
    return list(combinations(nomes, 2))


def total_por_dia(vendas):
    totais = []
    for dia, grupo in groupby(sorted(vendas), key=lambda venda: venda[0]):
        totais.append((dia, sum(valor for _, valor in grupo)))
    return totais


def mdc_da_lista(numeros):
    return reduce(math.gcd, numeros)
```

### Dicas
1. `product` devolve tuplas de caracteres; `"".join(tupla)` transforma cada uma em texto.
2. Duplas sem ordem são grupos de 2: `permutations` contaria cada dupla duas vezes.
3. Sem `sorted`, o `groupby` cria um grupo novo cada vez que o dia muda, e o mesmo dia aparece mais de uma vez.

### Verificação
```json
[
  { "id": "senhas-xyz", "checkpoint": 1, "kind": "call", "function": "senhas_possiveis", "args": ["xyz", 2],
    "expected": ["xx", "xy", "xz", "yx", "yy", "yz", "zx", "zy", "zz"], "type": "list",
    "name": "senhas_possiveis('xyz', 2) tem as 9 senhas", "hint": "As senhas podem repetir caracteres, como xx." },
  { "id": "senhas-binario", "checkpoint": 1, "kind": "expr", "expr": "len(senhas_possiveis('0123456789', 4))", "expected": 10000,
    "name": "Um cadeado de 4 dígitos tem 10000 senhas" },
  { "id": "usa-itertools", "checkpoint": 1, "kind": "source", "rule": { "type": "imports", "module": "itertools" },
    "name": "Usa o módulo itertools" },
  { "id": "duplas-4", "checkpoint": 2, "kind": "call", "function": "duplas", "args": [["Ana", "Bia", "Caio", "Davi"]],
    "expected": [["Ana", "Bia"], ["Ana", "Caio"], ["Ana", "Davi"], ["Bia", "Caio"], ["Bia", "Davi"], ["Caio", "Davi"]], "type": "list",
    "name": "4 pessoas formam 6 duplas", "hint": "Na dupla, a ordem não importa." },
  { "id": "duplas-2", "checkpoint": 2, "kind": "expr", "expr": "duplas(['Eva', 'Gil'])", "expected": [["Eva", "Gil"]],
    "name": "2 pessoas formam 1 dupla" },
  { "id": "total-dias", "checkpoint": 3, "kind": "call", "function": "total_por_dia", "args": [[[3, 10.0], [1, 5.5], [3, 4.5], [2, 8.0], [1, 2.0]]],
    "expected": [[1, 7.5], [2, 8.0], [3, 14.5]], "type": "list",
    "name": "Soma as vendas de cada dia, em ordem de dia", "hint": "Ordene as vendas antes de agrupar." },
  { "id": "total-vazio", "checkpoint": 3, "kind": "call", "function": "total_por_dia", "args": [[]], "expected": [], "type": "list",
    "name": "Sem vendas, lista vazia" },
  { "id": "mdc-3", "checkpoint": 4, "kind": "call", "function": "mdc_da_lista", "args": [[12, 18, 30]], "expected": 6,
    "name": "mdc_da_lista([12, 18, 30]) é 6" },
  { "id": "mdc-4", "checkpoint": 4, "kind": "call", "function": "mdc_da_lista", "args": [[30, 12, 45]], "expected": 3,
    "name": "mdc_da_lista([30, 12, 45]) é 3", "hint": "O resultado precisa dividir todos os números, não só o primeiro e o último." },
  { "id": "mdc-1", "checkpoint": 4, "kind": "call", "function": "mdc_da_lista", "args": [[7]], "expected": 7,
    "name": "mdc_da_lista([7]) é 7" }
]
```

### Soluções erradas
```python name="permutations em vez de product nas senhas"
import math
from functools import reduce
from itertools import combinations, groupby, permutations


def senhas_possiveis(alfabeto, tamanho):
    return ["".join(senha) for senha in permutations(alfabeto, tamanho)]


def duplas(nomes):
    return list(combinations(nomes, 2))


def total_por_dia(vendas):
    totais = []
    for dia, grupo in groupby(sorted(vendas), key=lambda venda: venda[0]):
        totais.append((dia, sum(valor for _, valor in grupo)))
    return totais


def mdc_da_lista(numeros):
    return reduce(math.gcd, numeros)
```
```python name="permutations nas duplas"
import math
from functools import reduce
from itertools import groupby, permutations, product


def senhas_possiveis(alfabeto, tamanho):
    return ["".join(senha) for senha in product(alfabeto, repeat=tamanho)]


def duplas(nomes):
    return list(permutations(nomes, 2))


def total_por_dia(vendas):
    totais = []
    for dia, grupo in groupby(sorted(vendas), key=lambda venda: venda[0]):
        totais.append((dia, sum(valor for _, valor in grupo)))
    return totais


def mdc_da_lista(numeros):
    return reduce(math.gcd, numeros)
```
```python name="groupby sem ordenar"
import math
from functools import reduce
from itertools import combinations, groupby, product


def senhas_possiveis(alfabeto, tamanho):
    return ["".join(senha) for senha in product(alfabeto, repeat=tamanho)]


def duplas(nomes):
    return list(combinations(nomes, 2))


def total_por_dia(vendas):
    totais = []
    for dia, grupo in groupby(vendas, key=lambda venda: venda[0]):
        totais.append((dia, sum(valor for _, valor in grupo)))
    return totais


def mdc_da_lista(numeros):
    return reduce(math.gcd, numeros)
```
```python name="mdc só dos dois primeiros"
import math
from functools import reduce
from itertools import combinations, groupby, product


def senhas_possiveis(alfabeto, tamanho):
    return ["".join(senha) for senha in product(alfabeto, repeat=tamanho)]


def duplas(nomes):
    return list(combinations(nomes, 2))


def total_por_dia(vendas):
    totais = []
    for dia, grupo in groupby(sorted(vendas), key=lambda venda: venda[0]):
        totais.append((dia, sum(valor for _, valor in grupo)))
    return totais


def mdc_da_lista(numeros):
    return math.gcd(numeros[0], numeros[-1])
```

## Passo 8 · Quiz · Qual ferramenta?

### Pergunta
O que este programa imprime?
```python
from collections import deque

chamadas = deque(maxlen=3)
for senha in [101, 102, 103, 104, 105]:
    chamadas.append(senha)
print(list(chamadas))
```
- [ ] `[101, 102, 103]`
- [x] `[103, 104, 105]`
- [ ] `[101, 102, 103, 104, 105]`
- [ ] Um `IndexError` na quarta inserção
> Com `maxlen=3`, cada inserção numa fila cheia descarta o item mais antigo, da outra ponta. Sobram as três últimas senhas.

### Pergunta
Uma loteria sorteia 6 números diferentes de 1 a 60, e a ordem do sorteio não importa para o prêmio. Qual função conta corretamente as apostas possíveis com `len(list(...))`?
- [ ] `product(range(1, 61), repeat=6)`
- [ ] `permutations(range(1, 61), 6)`
- [x] `combinations(range(1, 61), 6)`
- [ ] `groupby(range(1, 61))`
> Os números não se repetem (descarta `product`) e a ordem não importa (descarta `permutations`, que contaria cada aposta 720 vezes). Isso é exatamente um grupo de 6: `combinations`.

### Pergunta
Um teste da função `sortear_grupos` passa em uma execução e falha na seguinte, sem ninguém mudar o código. A função usa `random.sample`. Qual é a causa mais provável?
- [ ] `random.sample` tem um defeito no Python 3.14
- [x] A função sorteia sem fixar uma semente, então cada execução produz um resultado diferente
- [ ] Faltou importar `math`
- [ ] `random.sample` altera a lista original
> Sem `random.seed(...)`, o ponto de partida dos números muda a cada execução, e o resultado também. Para testar ou reproduzir um sorteio, fixe a semente.
