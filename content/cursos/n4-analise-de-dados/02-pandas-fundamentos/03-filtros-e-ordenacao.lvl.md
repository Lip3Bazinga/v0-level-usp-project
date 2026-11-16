---
slug: n4-m2-03-filtros-e-ordenacao
titulo: Filtros, ordenação e consultas
descricao: Máscaras booleanas em DataFrames, isin, between, str.contains, query, sort_values por várias colunas e nlargest.
dificuldade: intermediario
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- pandas
xp: 110
tempo_min: 45
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Filtrar linhas combinando condições com &, |, ~, isin, between e métodos de string
- Ordenar por uma ou mais colunas com direções diferentes
- Responder perguntas de negócio simples com filtros e nlargest/nsmallest
---

## Passo 1 · Leitura · Máscaras em tabelas

Uma rede fictícia de lojas quer mandar um cupom para os clientes de Vila Azul com 30 anos ou mais. Com listas, seria um laço com `if`. No pandas, a pergunta vira uma **máscara**: uma Series de `True` e `False`, uma por linha, que escolhe as linhas onde está `True`.

```python
clientes = pd.DataFrame({
    "id": [1, 2, 3, 4, 5, 6],
    "cidade": ["Vila Azul", "Porto Claro", "Vila Azul", "Serra Alta", "Porto Claro", "Vila Azul"],
    "idade": [25, 40, 31, 30, 18, 52],
})
adultos = clientes["idade"] >= 30          # Series de bool
clientes[adultos]                           # só as linhas com True
clientes.loc[adultos, "id"]                 # só a coluna id dessas linhas
```

Para combinar condições, use `&` (e), `|` (ou) e `~` (não), com **cada condição entre parênteses**:

```python
clientes[(clientes["cidade"] == "Vila Azul") & (clientes["idade"] >= 30)]
```

As palavras `and`, `or` e `not` do Python não servem: elas pedem um único `True` ou `False`, e uma Series tem vários. O erro é `ValueError: The truth value of a Series is ambiguous. Use a.empty, a.bool(), a.item(), a.any() or a.all().` Os parênteses também importam, porque `&` é calculado **antes** de `==` e `>=`: sem eles, `clientes["idade"] > 25 & clientes["cidade"] == "Vila Azul"` tenta primeiro `25 & clientes["cidade"]` e dá `TypeError: unsupported operand type(s) for &: 'int' and 'StringArray'`.

Dois atalhos evitam cadeias de `|` e de `&`. `isin` testa se o valor está numa lista: `clientes["cidade"].isin(["Vila Azul", "Serra Alta"])`, e `~` na frente inverte a máscara. `between(25, 31)` testa um intervalo com **as duas pontas incluídas**, o mesmo que `(x >= 25) & (x <= 31)`.

Filtrar não renumera as linhas: o resultado guarda os rótulos originais. Depois de `clientes[clientes["idade"] >= 40]`, o índice é `[1, 5]`, e `.loc[0]` dá `KeyError: 0`. Para a primeira linha do resultado, use `iloc[0]`; para renumerar, `reset_index(drop=True)`. Um filtro que não acha ninguém devolve uma tabela vazia, com as colunas e zero linhas, sem erro.

## Passo 2 · Previsão · Quem passa no filtro

O programa aplica sete filtros à tabela de clientes da leitura. Leia sem executar e digite exatamente o que ele imprime.

### Código
```python
import pandas as pd

clientes = pd.DataFrame({
    "id": [1, 2, 3, 4, 5, 6],
    "cidade": ["Vila Azul", "Porto Claro", "Vila Azul", "Serra Alta", "Porto Claro", "Vila Azul"],
    "idade": [25, 40, 31, 30, 18, 52],
})
print(clientes[clientes["idade"] >= 30]["id"].tolist())
print(clientes[(clientes["cidade"] == "Vila Azul") & (clientes["idade"] > 30)]["id"].tolist())
print(clientes[(clientes["cidade"] == "Porto Claro") | (clientes["idade"] < 20)]["id"].tolist())
print(clientes[~clientes["cidade"].isin(["Vila Azul", "Porto Claro"])]["id"].tolist())
print(clientes[clientes["idade"].between(25, 31)]["id"].tolist())
print(clientes[clientes["idade"] > 60].shape)
print(clientes[clientes["idade"] >= 40].index.tolist())
```

### Dicas
1. `>=` inclui o limite e `>` não; `between` inclui as duas pontas.
2. `~` troca cada `True` por `False` e vice-versa.
3. O filtro mantém os rótulos originais das linhas, que aqui começam em 0.

### Saída esperada
```text
[2, 3, 4, 6]
[3, 6]
[2, 5]
[4]
[1, 3, 4]
(0, 3)
[1, 5]
```

## Passo 3 · Exercício · Clientes de uma cidade
modo: ordenar

Arraste as linhas para montar `clientes_de` e ajuste a indentação de cada uma. Três linhas estão sobrando.

### Instruções
1. `clientes_de(df, cidade, idade_min)` recebe uma tabela com as colunas `id`, `cidade` e `idade` e escolhe os clientes de `cidade` com idade maior ou igual a `idade_min`.
2. Devolve a lista dos `id` desses clientes, em ordem crescente (lista vazia se ninguém passar no filtro).

### Solução
```python
def clientes_de(df, cidade, idade_min):
    na_cidade = df["cidade"] == cidade
    com_idade = df["idade"] >= idade_min
    ids = df.loc[na_cidade & com_idade, "id"]
    return ids.sort_values().tolist()
```

### Distratores
```python
ids = df.loc[na_cidade and com_idade, "id"]
com_idade = df["idade"] > idade_min
return ids.sort_values()
```

### Verificação
```json
[
  { "id": "basico", "checkpoint": 1, "kind": "expr",
    "setup": "import pandas as pd\nC = pd.DataFrame({\"id\": [17, 4, 23, 8, 15, 42, 11], \"cidade\": [\"Vila Azul\", \"Porto Claro\", \"Vila Azul\", \"Serra Alta\", \"Porto Claro\", \"Vila Azul\", \"Vila Azul\"], \"idade\": [25, 40, 31, 30, 18, 52, 31]})",
    "expr": "sorted(clientes_de(C, \"Vila Azul\", 30))", "expected": [11, 23, 42],
    "name": "Clientes de Vila Azul com 30 anos ou mais", "hint": "As duas condições valem ao mesmo tempo, e a lista é de ids, não de rótulos de linha." },
  { "id": "limite", "checkpoint": 1, "kind": "expr",
    "setup": "import pandas as pd\nC = pd.DataFrame({\"id\": [17, 4, 23, 8, 15, 42, 11], \"cidade\": [\"Vila Azul\", \"Porto Claro\", \"Vila Azul\", \"Serra Alta\", \"Porto Claro\", \"Vila Azul\", \"Vila Azul\"], \"idade\": [25, 40, 31, 30, 18, 52, 31]})",
    "expr": "sorted(clientes_de(C, \"Vila Azul\", 31))", "expected": [11, 23, 42],
    "name": "Quem tem exatamente a idade mínima entra", "hint": "Maior ou igual." },
  { "id": "outra-cidade", "checkpoint": 1, "kind": "expr",
    "setup": "import pandas as pd\nC = pd.DataFrame({\"id\": [17, 4, 23, 8, 15, 42, 11], \"cidade\": [\"Vila Azul\", \"Porto Claro\", \"Vila Azul\", \"Serra Alta\", \"Porto Claro\", \"Vila Azul\", \"Vila Azul\"], \"idade\": [25, 40, 31, 30, 18, 52, 31]})",
    "expr": "sorted(clientes_de(C, \"Porto Claro\", 0))", "expected": [4, 15], "name": "Todos os clientes de Porto Claro" },
  { "id": "ninguem-idade", "checkpoint": 2, "kind": "expr",
    "setup": "import pandas as pd\nC = pd.DataFrame({\"id\": [17, 4, 23, 8, 15, 42, 11], \"cidade\": [\"Vila Azul\", \"Porto Claro\", \"Vila Azul\", \"Serra Alta\", \"Porto Claro\", \"Vila Azul\", \"Vila Azul\"], \"idade\": [25, 40, 31, 30, 18, 52, 31]})",
    "expr": "clientes_de(C, \"Serra Alta\", 31)", "expected": [], "name": "Ninguém de Serra Alta com 31 ou mais: lista vazia" },
  { "id": "cidade-ausente", "checkpoint": 2, "kind": "expr",
    "setup": "import pandas as pd\nC = pd.DataFrame({\"id\": [17, 4, 23, 8, 15, 42, 11], \"cidade\": [\"Vila Azul\", \"Porto Claro\", \"Vila Azul\", \"Serra Alta\", \"Porto Claro\", \"Vila Azul\", \"Vila Azul\"], \"idade\": [25, 40, 31, 30, 18, 52, 31]})",
    "expr": "clientes_de(C, \"Lago Verde\", 0)", "expected": [], "name": "Cidade sem clientes: lista vazia" },
  { "id": "ordem", "checkpoint": 2, "kind": "expr",
    "setup": "import pandas as pd\nC = pd.DataFrame({\"id\": [17, 4, 23, 8, 15, 42, 11], \"cidade\": [\"Vila Azul\", \"Porto Claro\", \"Vila Azul\", \"Serra Alta\", \"Porto Claro\", \"Vila Azul\", \"Vila Azul\"], \"idade\": [25, 40, 31, 30, 18, 52, 31]})",
    "expr": "clientes_de(C, \"Vila Azul\", 0)", "expected": [11, 17, 23, 42],
    "name": "Os ids saem em ordem crescente", "hint": "A ordem da tabela não é a ordem dos ids." },
  { "id": "tipo", "checkpoint": 2, "kind": "expr",
    "setup": "import pandas as pd\nC = pd.DataFrame({\"id\": [17, 4, 23, 8, 15, 42, 11], \"cidade\": [\"Vila Azul\", \"Porto Claro\", \"Vila Azul\", \"Serra Alta\", \"Porto Claro\", \"Vila Azul\", \"Vila Azul\"], \"idade\": [25, 40, 31, 30, 18, 52, 31]})",
    "expr": "clientes_de(C, \"Porto Claro\", 0)", "type": "list", "name": "clientes_de devolve uma lista do Python" },
  { "id": "nao-altera", "checkpoint": 1, "kind": "expr",
    "setup": "import pandas as pd\nC = pd.DataFrame({\"id\": [17, 4, 23, 8, 15, 42, 11], \"cidade\": [\"Vila Azul\", \"Porto Claro\", \"Vila Azul\", \"Serra Alta\", \"Porto Claro\", \"Vila Azul\", \"Vila Azul\"], \"idade\": [25, 40, 31, 30, 18, 52, 31]})\nr = clientes_de(C, \"Vila Azul\", 0)",
    "expr": "C[\"id\"].tolist()", "expected": [17, 4, 23, 8, 15, 42, 11], "name": "A tabela recebida continua na ordem original" }
]
```

### Soluções erradas
```python name="and no lugar de &"
def clientes_de(df, cidade, idade_min):
    na_cidade = df["cidade"] == cidade
    com_idade = df["idade"] >= idade_min
    ids = df.loc[na_cidade and com_idade, "id"]
    return ids.sort_values().tolist()
```
```python name="idade maior estrita"
def clientes_de(df, cidade, idade_min):
    na_cidade = df["cidade"] == cidade
    com_idade = df["idade"] > idade_min
    ids = df.loc[na_cidade & com_idade, "id"]
    return ids.sort_values().tolist()
```
```python name="sem ordenar"
def clientes_de(df, cidade, idade_min):
    na_cidade = df["cidade"] == cidade
    com_idade = df["idade"] >= idade_min
    ids = df.loc[na_cidade & com_idade, "id"]
    return ids.tolist()
```
```python name="devolve a Series"
def clientes_de(df, cidade, idade_min):
    na_cidade = df["cidade"] == cidade
    com_idade = df["idade"] >= idade_min
    ids = df.loc[na_cidade & com_idade, "id"]
    return ids.sort_values()
```
```python name="ou no lugar de e"
def clientes_de(df, cidade, idade_min):
    na_cidade = df["cidade"] == cidade
    com_idade = df["idade"] >= idade_min
    ids = df.loc[na_cidade | com_idade, "id"]
    return ids.sort_values().tolist()
```
```python name="rótulos das linhas no lugar dos ids"
def clientes_de(df, cidade, idade_min):
    na_cidade = df["cidade"] == cidade
    com_idade = df["idade"] >= idade_min
    ids = df.loc[na_cidade & com_idade].index
    return ids.sort_values().tolist()
```

## Passo 4 · Leitura · Texto, query e ordenação

Colunas de texto têm o acessor `.str`, com versões vetorizadas dos métodos de string. `produtos["nome"].str.contains("cabo", case=False)` marca os nomes que contêm "cabo" em qualquer combinação de maiúsculas; `.str.startswith("Cabo")` e `.str.lower()` funcionam como os de `str`.

O `contains` tem uma armadilha: por padrão, o termo é uma **expressão regular**, e nela alguns caracteres têm significado. O ponto casa com qualquer caractere, então `contains("1.5")` também acha "Cabo HDMI 105cm". Um parêntese abre um grupo, e `contains("(sem")` dá `PatternError: missing ), unterminated subpattern at position 0`. Quando o termo vem do usuário, passe `regex=False` e ele é procurado letra por letra.

`query` escreve o filtro como texto, com `and`, `or` e `not` (aqui eles valem, porque o próprio pandas interpreta o texto): `clientes.query("cidade == 'Vila Azul' and idade >= 30")`. Uma variável do programa entra com `@`: `clientes.query("idade > @limite")`. É mais legível em filtros longos; nos curtos, a máscara é mais direta.

Para ordenar, `sort_values` recebe uma coluna ou uma lista delas, e `ascending` pode ser uma lista com uma direção por coluna:

```python
vendedores.sort_values(["total", "nome"], ascending=[False, True])
```

Isso põe o maior total primeiro e, no empate, os nomes em ordem alfabética. Com `ascending=False` sozinho, o desempate também sairia de Z para A. Quando você ordena por uma coluna só e quer que os empatados fiquem na ordem em que estavam, peça `kind="stable"`, como o `sorted` do Nível 3; o padrão do pandas não garante isso.

`nlargest(3, "total")` e `nsmallest` dão os maiores e os menores sem ordenar a tabela toda, mas desempatam pela **posição** na tabela, não por outra coluna. Se o critério de desempate importa, use `sort_values` e depois `head(n)`, nessa ordem: `head` antes de ordenar pega as primeiras linhas da tabela, não as maiores.

`value_counts()` conta quantas vezes cada valor aparece, do mais frequente para o menos frequente. O resultado é uma Series: os valores contados são o índice e as contagens são os valores.

## Passo 5 · Exercício · Produtos e faixas de preço

A busca da loja recebe o que o cliente digita, com pontos, parênteses e maiúsculas misturados. A tabela tem as colunas `produto` e `preco`.

### Instruções
1. `produtos_com(df, termo)` devolve a lista dos nomes de produto que contêm `termo`, sem diferenciar maiúsculas de minúsculas e tratando `termo` como texto literal, na ordem da tabela.
2. `faixa_de_preco(df, minimo, maximo)` devolve a lista dos nomes com preço de `minimo` a `maximo`, **incluindo as duas pontas**.
3. A lista de `faixa_de_preco` vem em ordem crescente de preço e, no empate, em ordem alfabética do nome.

### Código inicial
```python
import pandas as pd


def produtos_com(df, termo):
    pass


def faixa_de_preco(df, minimo, maximo):
    pass
```

### Solução
```python
import pandas as pd


def produtos_com(df, termo):
    achou = df["produto"].str.contains(termo, case=False, regex=False)
    return df.loc[achou, "produto"].tolist()


def faixa_de_preco(df, minimo, maximo):
    dentro = df[df["preco"].between(minimo, maximo)]
    ordenado = dentro.sort_values(["preco", "produto"])
    return ordenado["produto"].tolist()
```

### Dicas
1. Por padrão, o termo do `contains` é uma expressão regular, em que `.` e `(` têm significado especial.
2. Um intervalo "de mínimo a máximo" inclui as pontas.
3. O desempate é uma segunda coluna na ordenação.

### Verificação
```json
[
  { "id": "cabo", "checkpoint": 1, "kind": "expr",
    "setup": "import pandas as pd\nP = pd.DataFrame({\"produto\": [\"Fone 1,5m\", \"Cabo USB 1.5m\", \"Mouse (sem fio)\", \"cabo de rede\", \"Teclado\", \"Cabo HDMI 105cm\"], \"preco\": [35.0, 19.9, 49.9, 12.0, 89.9, 35.0]})",
    "expr": "produtos_com(P, \"cabo\")", "expected": ["Cabo USB 1.5m", "cabo de rede", "Cabo HDMI 105cm"],
    "name": "\"cabo\" acha os três cabos", "hint": "Maiúsculas e minúsculas não importam." },
  { "id": "maiusculas", "checkpoint": 1, "kind": "expr",
    "setup": "import pandas as pd\nP = pd.DataFrame({\"produto\": [\"Fone 1,5m\", \"Cabo USB 1.5m\", \"Mouse (sem fio)\", \"cabo de rede\", \"Teclado\", \"Cabo HDMI 105cm\"], \"preco\": [35.0, 19.9, 49.9, 12.0, 89.9, 35.0]})",
    "expr": "produtos_com(P, \"TECLA\")", "expected": ["Teclado"], "name": "\"TECLA\" acha o Teclado" },
  { "id": "ponto", "checkpoint": 1, "kind": "expr",
    "setup": "import pandas as pd\nP = pd.DataFrame({\"produto\": [\"Fone 1,5m\", \"Cabo USB 1.5m\", \"Mouse (sem fio)\", \"cabo de rede\", \"Teclado\", \"Cabo HDMI 105cm\"], \"preco\": [35.0, 19.9, 49.9, 12.0, 89.9, 35.0]})",
    "expr": "produtos_com(P, \"1.5\")", "expected": ["Cabo USB 1.5m"],
    "name": "\"1.5\" acha só o cabo de 1.5m", "hint": "O ponto precisa ser um ponto de verdade." },
  { "id": "parentese", "checkpoint": 1, "kind": "expr",
    "setup": "import pandas as pd\nP = pd.DataFrame({\"produto\": [\"Fone 1,5m\", \"Cabo USB 1.5m\", \"Mouse (sem fio)\", \"cabo de rede\", \"Teclado\", \"Cabo HDMI 105cm\"], \"preco\": [35.0, 19.9, 49.9, 12.0, 89.9, 35.0]})",
    "expr": "produtos_com(P, \"(sem\")", "expected": ["Mouse (sem fio)"], "name": "\"(sem\" acha o mouse sem erro" },
  { "id": "nada", "checkpoint": 1, "kind": "expr",
    "setup": "import pandas as pd\nP = pd.DataFrame({\"produto\": [\"Fone 1,5m\", \"Cabo USB 1.5m\", \"Mouse (sem fio)\", \"cabo de rede\", \"Teclado\", \"Cabo HDMI 105cm\"], \"preco\": [35.0, 19.9, 49.9, 12.0, 89.9, 35.0]})",
    "expr": "produtos_com(P, \"monitor\")", "expected": [], "name": "Termo que não aparece: lista vazia" },
  { "id": "faixa-pontas", "checkpoint": 2, "kind": "expr",
    "setup": "import pandas as pd\nP = pd.DataFrame({\"produto\": [\"Fone 1,5m\", \"Cabo USB 1.5m\", \"Mouse (sem fio)\", \"cabo de rede\", \"Teclado\", \"Cabo HDMI 105cm\"], \"preco\": [35.0, 19.9, 49.9, 12.0, 89.9, 35.0]})",
    "expr": "sorted(faixa_de_preco(P, 12.0, 19.9))", "expected": ["Cabo USB 1.5m", "cabo de rede"],
    "name": "Os preços iguais às pontas entram", "hint": "De mínimo a máximo, inclusive." },
  { "id": "faixa-vazia", "checkpoint": 2, "kind": "expr",
    "setup": "import pandas as pd\nP = pd.DataFrame({\"produto\": [\"Fone 1,5m\", \"Cabo USB 1.5m\", \"Mouse (sem fio)\", \"cabo de rede\", \"Teclado\", \"Cabo HDMI 105cm\"], \"preco\": [35.0, 19.9, 49.9, 12.0, 89.9, 35.0]})",
    "expr": "faixa_de_preco(P, 90.0, 200.0)", "expected": [], "name": "Faixa sem produtos: lista vazia" },
  { "id": "faixa-empate", "checkpoint": 3, "kind": "expr",
    "setup": "import pandas as pd\nP = pd.DataFrame({\"produto\": [\"Fone 1,5m\", \"Cabo USB 1.5m\", \"Mouse (sem fio)\", \"cabo de rede\", \"Teclado\", \"Cabo HDMI 105cm\"], \"preco\": [35.0, 19.9, 49.9, 12.0, 89.9, 35.0]})",
    "expr": "faixa_de_preco(P, 30.0, 50.0)", "expected": ["Cabo HDMI 105cm", "Fone 1,5m", "Mouse (sem fio)"],
    "name": "Preços empatados saem em ordem alfabética", "hint": "Os dois produtos de 35.0 estão em ordem diferente na tabela." },
  { "id": "faixa-tudo", "checkpoint": 3, "kind": "expr",
    "setup": "import pandas as pd\nP = pd.DataFrame({\"produto\": [\"Fone 1,5m\", \"Cabo USB 1.5m\", \"Mouse (sem fio)\", \"cabo de rede\", \"Teclado\", \"Cabo HDMI 105cm\"], \"preco\": [35.0, 19.9, 49.9, 12.0, 89.9, 35.0]})",
    "expr": "faixa_de_preco(P, 0.0, 1000.0)",
    "expected": ["cabo de rede", "Cabo USB 1.5m", "Cabo HDMI 105cm", "Fone 1,5m", "Mouse (sem fio)", "Teclado"],
    "name": "Todos os produtos, do mais barato ao mais caro", "hint": "A ordem principal é o preço; o nome só desempata." },
  { "id": "faixa-tipo", "checkpoint": 2, "kind": "expr",
    "setup": "import pandas as pd\nP = pd.DataFrame({\"produto\": [\"Fone 1,5m\", \"Cabo USB 1.5m\"], \"preco\": [35.0, 19.9]})",
    "expr": "faixa_de_preco(P, 0.0, 100.0)", "type": "list", "name": "faixa_de_preco devolve uma lista do Python" }
]
```

### Soluções erradas
```python name="termo como expressão regular"
import pandas as pd


def produtos_com(df, termo):
    achou = df["produto"].str.contains(termo, case=False)
    return df.loc[achou, "produto"].tolist()


def faixa_de_preco(df, minimo, maximo):
    dentro = df[df["preco"].between(minimo, maximo)]
    ordenado = dentro.sort_values(["preco", "produto"])
    return ordenado["produto"].tolist()
```
```python name="diferencia maiúsculas"
import pandas as pd


def produtos_com(df, termo):
    achou = df["produto"].str.contains(termo, regex=False)
    return df.loc[achou, "produto"].tolist()


def faixa_de_preco(df, minimo, maximo):
    dentro = df[df["preco"].between(minimo, maximo)]
    ordenado = dentro.sort_values(["preco", "produto"])
    return ordenado["produto"].tolist()
```
```python name="procura só no começo"
import pandas as pd


def produtos_com(df, termo):
    achou = df["produto"].str.lower().str.startswith(termo.lower())
    return df.loc[achou, "produto"].tolist()


def faixa_de_preco(df, minimo, maximo):
    dentro = df[df["preco"].between(minimo, maximo)]
    ordenado = dentro.sort_values(["preco", "produto"])
    return ordenado["produto"].tolist()
```
```python name="pontas de fora"
import pandas as pd


def produtos_com(df, termo):
    achou = df["produto"].str.contains(termo, case=False, regex=False)
    return df.loc[achou, "produto"].tolist()


def faixa_de_preco(df, minimo, maximo):
    dentro = df[(df["preco"] > minimo) & (df["preco"] < maximo)]
    ordenado = dentro.sort_values(["preco", "produto"])
    return ordenado["produto"].tolist()
```
```python name="ordena só pelo preço"
import pandas as pd


def produtos_com(df, termo):
    achou = df["produto"].str.contains(termo, case=False, regex=False)
    return df.loc[achou, "produto"].tolist()


def faixa_de_preco(df, minimo, maximo):
    dentro = df[df["preco"].between(minimo, maximo)]
    ordenado = dentro.sort_values("preco", kind="stable")
    return ordenado["produto"].tolist()
```
```python name="ordena pelo nome antes do preço"
import pandas as pd


def produtos_com(df, termo):
    achou = df["produto"].str.contains(termo, case=False, regex=False)
    return df.loc[achou, "produto"].tolist()


def faixa_de_preco(df, minimo, maximo):
    dentro = df[df["preco"].between(minimo, maximo)]
    ordenado = dentro.sort_values(["produto", "preco"])
    return ordenado["produto"].tolist()
```

## Passo 6 · Exercício · Ranking de vendedores

A tabela do mês tem uma linha por vendedor, com as colunas `vendedor`, `regiao` e `total`. A diretoria quer o pódio e as regiões com equipe grande.

### Instruções
1. `top_vendedores(df, n)` devolve a lista com os nomes dos `n` vendedores de maior `total`, do maior para o menor; se `n` passar do número de vendedores, todos entram.
2. No empate de `total`, os nomes vêm em ordem alfabética, inclusive no corte dos `n` primeiros.
3. `regioes_ativas(df, minimo)` devolve a lista, em ordem alfabética, das regiões com **pelo menos** `minimo` vendedores.

### Código inicial
```python
import pandas as pd


def top_vendedores(df, n):
    pass


def regioes_ativas(df, minimo):
    pass
```

### Solução
```python
import pandas as pd


def top_vendedores(df, n):
    ordenado = df.sort_values(["total", "vendedor"], ascending=[False, True])
    return ordenado["vendedor"].head(n).tolist()


def regioes_ativas(df, minimo):
    contagem = df["regiao"].value_counts()
    ativas = contagem[contagem >= minimo]
    return sorted(ativas.index.tolist())
```

### Dicas
1. Cada coluna da ordenação pode ter a sua direção.
2. `nlargest` desempata pela posição na tabela, não pelo nome.
3. No resultado do `value_counts`, as regiões estão no índice e as contagens nos valores.

### Verificação
```json
[
  { "id": "top-3", "checkpoint": 1, "kind": "expr",
    "setup": "import pandas as pd\nV = pd.DataFrame({\"vendedor\": [\"Rui\", \"Ana\", \"Bia\", \"Caio\", \"Duda\", \"Eli\"], \"regiao\": [\"Sul\", \"Norte\", \"Sul\", \"Leste\", \"Norte\", \"Sul\"], \"total\": [500.0, 700.0, 500.0, 700.0, 300.0, 650.0]})",
    "expr": "top_vendedores(V, 3)", "expected": ["Ana", "Caio", "Eli"],
    "name": "Os três maiores totais", "hint": "Do maior total para o menor." },
  { "id": "top-corte-empate", "checkpoint": 2, "kind": "expr",
    "setup": "import pandas as pd\nV = pd.DataFrame({\"vendedor\": [\"Rui\", \"Ana\", \"Bia\", \"Caio\", \"Duda\", \"Eli\"], \"regiao\": [\"Sul\", \"Norte\", \"Sul\", \"Leste\", \"Norte\", \"Sul\"], \"total\": [500.0, 700.0, 500.0, 700.0, 300.0, 650.0]})",
    "expr": "top_vendedores(V, 4)", "expected": ["Ana", "Caio", "Eli", "Bia"],
    "name": "No corte, entre Rui e Bia (500 cada), entra a Bia", "hint": "O desempate é pelo nome, mesmo que o Rui apareça antes na tabela." },
  { "id": "top-5", "checkpoint": 2, "kind": "expr",
    "setup": "import pandas as pd\nV = pd.DataFrame({\"vendedor\": [\"Rui\", \"Ana\", \"Bia\", \"Caio\", \"Duda\", \"Eli\"], \"regiao\": [\"Sul\", \"Norte\", \"Sul\", \"Leste\", \"Norte\", \"Sul\"], \"total\": [500.0, 700.0, 500.0, 700.0, 300.0, 650.0]})",
    "expr": "top_vendedores(V, 5)", "expected": ["Ana", "Caio", "Eli", "Bia", "Rui"],
    "name": "Empatados em ordem alfabética" },
  { "id": "top-todos", "checkpoint": 1, "kind": "expr",
    "setup": "import pandas as pd\nV = pd.DataFrame({\"vendedor\": [\"Rui\", \"Ana\", \"Bia\", \"Caio\", \"Duda\", \"Eli\"], \"regiao\": [\"Sul\", \"Norte\", \"Sul\", \"Leste\", \"Norte\", \"Sul\"], \"total\": [500.0, 700.0, 500.0, 700.0, 300.0, 650.0]})",
    "expr": "top_vendedores(V, 10)", "expected": ["Ana", "Caio", "Eli", "Bia", "Rui", "Duda"],
    "name": "n maior que a equipe: todos, em ordem" },
  { "id": "top-zero", "checkpoint": 1, "kind": "expr",
    "setup": "import pandas as pd\nV = pd.DataFrame({\"vendedor\": [\"Rui\", \"Ana\", \"Bia\", \"Caio\", \"Duda\", \"Eli\"], \"regiao\": [\"Sul\", \"Norte\", \"Sul\", \"Leste\", \"Norte\", \"Sul\"], \"total\": [500.0, 700.0, 500.0, 700.0, 300.0, 650.0]})",
    "expr": "top_vendedores(V, 0)", "expected": [], "name": "n = 0 dá lista vazia" },
  { "id": "regioes-2", "checkpoint": 3, "kind": "expr",
    "setup": "import pandas as pd\nV = pd.DataFrame({\"vendedor\": [\"Rui\", \"Ana\", \"Bia\", \"Caio\", \"Duda\", \"Eli\"], \"regiao\": [\"Sul\", \"Norte\", \"Sul\", \"Leste\", \"Norte\", \"Sul\"], \"total\": [500.0, 700.0, 500.0, 700.0, 300.0, 650.0]})",
    "expr": "sorted(regioes_ativas(V, 2))", "expected": ["Norte", "Sul"],
    "name": "Regiões com 2 vendedores ou mais", "hint": "Pelo menos 2 inclui quem tem exatamente 2." },
  { "id": "regioes-1", "checkpoint": 3, "kind": "expr",
    "setup": "import pandas as pd\nV = pd.DataFrame({\"vendedor\": [\"Rui\", \"Ana\", \"Bia\", \"Caio\", \"Duda\", \"Eli\"], \"regiao\": [\"Sul\", \"Norte\", \"Sul\", \"Leste\", \"Norte\", \"Sul\"], \"total\": [500.0, 700.0, 500.0, 700.0, 300.0, 650.0]})",
    "expr": "regioes_ativas(V, 1)", "expected": ["Leste", "Norte", "Sul"],
    "name": "Todas as regiões, em ordem alfabética", "hint": "O value_counts ordena pela contagem, não pelo nome." },
  { "id": "regioes-3", "checkpoint": 3, "kind": "expr",
    "setup": "import pandas as pd\nV = pd.DataFrame({\"vendedor\": [\"Rui\", \"Ana\", \"Bia\", \"Caio\", \"Duda\", \"Eli\"], \"regiao\": [\"Sul\", \"Norte\", \"Sul\", \"Leste\", \"Norte\", \"Sul\"], \"total\": [500.0, 700.0, 500.0, 700.0, 300.0, 650.0]})",
    "expr": "regioes_ativas(V, 3)", "expected": ["Sul"], "name": "Só o Sul tem 3 vendedores" },
  { "id": "regioes-nenhuma", "checkpoint": 3, "kind": "expr",
    "setup": "import pandas as pd\nV = pd.DataFrame({\"vendedor\": [\"Rui\", \"Ana\", \"Bia\", \"Caio\", \"Duda\", \"Eli\"], \"regiao\": [\"Sul\", \"Norte\", \"Sul\", \"Leste\", \"Norte\", \"Sul\"], \"total\": [500.0, 700.0, 500.0, 700.0, 300.0, 650.0]})",
    "expr": "regioes_ativas(V, 4)", "expected": [], "name": "Nenhuma região com 4: lista vazia" }
]
```

### Soluções erradas
```python name="desempate também decrescente"
import pandas as pd


def top_vendedores(df, n):
    ordenado = df.sort_values(["total", "vendedor"], ascending=False)
    return ordenado["vendedor"].head(n).tolist()


def regioes_ativas(df, minimo):
    contagem = df["regiao"].value_counts()
    ativas = contagem[contagem >= minimo]
    return sorted(ativas.index.tolist())
```
```python name="nlargest desempata pela posição"
import pandas as pd


def top_vendedores(df, n):
    return df.nlargest(n, "total")["vendedor"].tolist()


def regioes_ativas(df, minimo):
    contagem = df["regiao"].value_counts()
    ativas = contagem[contagem >= minimo]
    return sorted(ativas.index.tolist())
```
```python name="head antes de ordenar"
import pandas as pd


def top_vendedores(df, n):
    primeiros = df.head(n)
    ordenado = primeiros.sort_values(["total", "vendedor"], ascending=[False, True])
    return ordenado["vendedor"].tolist()


def regioes_ativas(df, minimo):
    contagem = df["regiao"].value_counts()
    ativas = contagem[contagem >= minimo]
    return sorted(ativas.index.tolist())
```
```python name="regiões com mais que o mínimo"
import pandas as pd


def top_vendedores(df, n):
    ordenado = df.sort_values(["total", "vendedor"], ascending=[False, True])
    return ordenado["vendedor"].head(n).tolist()


def regioes_ativas(df, minimo):
    contagem = df["regiao"].value_counts()
    ativas = contagem[contagem > minimo]
    return sorted(ativas.index.tolist())
```
```python name="regiões na ordem da contagem"
import pandas as pd


def top_vendedores(df, n):
    ordenado = df.sort_values(["total", "vendedor"], ascending=[False, True])
    return ordenado["vendedor"].head(n).tolist()


def regioes_ativas(df, minimo):
    contagem = df["regiao"].value_counts()
    ativas = contagem[contagem >= minimo]
    return ativas.index.tolist()
```
```python name="contagens no lugar das regiões"
import pandas as pd


def top_vendedores(df, n):
    ordenado = df.sort_values(["total", "vendedor"], ascending=[False, True])
    return ordenado["vendedor"].head(n).tolist()


def regioes_ativas(df, minimo):
    contagem = df["regiao"].value_counts()
    ativas = contagem[contagem >= minimo]
    return sorted(ativas.tolist())
```

## Passo 7 · Quiz · Filtros que enganam

### Pergunta
Para achar os clientes de 30 a 50 anos, alguém escreveu `clientes[clientes["idade"] > 30 & clientes["idade"] < 50]` e recebeu `ValueError: The truth value of a Series is ambiguous`. Qual é a causa?
- [ ] `idade` é inteira, e máscaras só funcionam com colunas `float`
- [x] Sem parênteses, `&` é calculado antes das comparações, e o que sobra vira uma comparação encadeada, que o Python resolve com um `and` escondido
- [ ] Não se pode usar a mesma coluna duas vezes na mesma máscara
- [ ] Faltou `.tolist()` no fim da máscara
> `&` tem precedência maior que `>` e `<`: o Python calcula `30 & clientes["idade"]` primeiro e fica com `a > b < c`, uma comparação encadeada, que ele resolve como `(a > b) and (b < c)`. Esse `and` precisa de um único `True` ou `False` e recebe uma Series. Com `(clientes["idade"] > 30) & (clientes["idade"] < 50)`, ou com `between`, funciona. O tipo da coluna e repetir a coluna não têm nada a ver com o erro, e uma máscara é uma Series, não uma lista.

### Pergunta
A busca da loja usa `df["produto"].str.contains(termo, case=False)`. Um cliente digitou `2.5` procurando um cabo de 2.5 m, e a busca devolveu também "Adaptador 205" e "Kit 2x5". Por quê?
- [ ] `case=False` faz o pandas ignorar a pontuação
- [ ] O `contains` arredonda números antes de comparar
- [x] O termo é tratado como expressão regular, e nela o ponto casa com qualquer caractere; `regex=False` resolve
- [ ] O `contains` procura cada caractere do termo separadamente
> Por padrão, `str.contains` interpreta o termo como expressão regular. Em `2.5`, o ponto vale "qualquer caractere", e "205" e "2x5" casam. Com `regex=False`, o termo é procurado como texto literal. `case=False` só ignora a diferença entre maiúsculas e minúsculas; o `contains` não converte números nem procura letras soltas.

### Pergunta
```python
caros = produtos[produtos["preco"] > 100]
primeiro = caros.loc[0]
```
A tabela `produtos` tem índice 0, 1, 2…, e `caros` tem várias linhas, mas a segunda linha dá `KeyError: 0`. O que está acontecendo?
- [ ] O filtro devolveu uma tabela vazia
- [x] O filtro manteve os rótulos originais, e o produto de rótulo 0 não é caro; `caros.iloc[0]` pega a primeira linha do resultado
- [ ] `loc` só aceita nomes de colunas, não números
- [ ] Depois de um filtro é obrigatório chamar `copy()` antes de selecionar
> Filtrar não renumera as linhas: `caros` guarda os rótulos das linhas que passaram, e o 0 não está entre eles. `iloc[0]` pede a primeira **posição**; `caros.reset_index(drop=True)` renumera, se você preferir. Uma tabela vazia também daria `KeyError`, mas o enunciado diz que há linhas. `loc` aceita qualquer rótulo de linha, e `copy()` não muda os rótulos.
