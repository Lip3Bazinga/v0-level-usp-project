---
slug: n4-m2-02-selecao-com-loc-e-iloc
titulo: Seleção com loc e iloc
descricao: Selecionar por rótulo e por posição, fatias inclusivas no loc, seleção de linhas e colunas simultânea e atribuição sem SettingWithCopyWarning.
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
- Selecionar linhas e colunas com loc (rótulos) e iloc (posições) e prever o tipo do resultado
- Atribuir valores a subconjuntos com loc sem o aviso de cópia
- Usar índices não numéricos (nomes, datas) para seleção
---

## Passo 1 · Leitura · Rótulo ou posição

Uma escola fictícia guarda as notas com a matrícula de cada aluno como índice. Pedir "a linha 102" é ambíguo: é o aluno de matrícula 102 ou a linha que está na posição 102? O pandas separa as duas perguntas em dois indexadores. `loc` seleciona por **rótulo** (o valor do índice e o nome da coluna); `iloc` seleciona por **posição** (0, 1, 2…, como numa lista).

```python
notas = pd.DataFrame(
    {"nome": ["Ana", "Bruno", "Carla", "Davi"], "mat": [7.5, 5.0, 9.0, 6.5], "fis": [6.0, 8.0, 7.0, 4.5]},
    index=[101, 102, 103, 104],
)
notas.loc[102]                 # a linha de matrícula 102, como Series
notas.iloc[0]                  # a primeira linha, seja qual for a matrícula
notas.loc[102:104]             # 102, 103 e 104: no loc, o fim entra
notas.iloc[0:2]                # posições 0 e 1: no iloc, o fim fica de fora
notas.loc[102, "mat"]          # 5.0: linha e coluna, separadas por vírgula
notas.loc[:, "mat":"fis"]      # todas as linhas, colunas de mat até fis
notas.iloc[:, -2:]             # as duas últimas colunas
notas.loc[[101, 104], ["nome", "fis"]]   # listas escolhem linhas e colunas
```

A fatia do `loc` inclui o fim porque rótulos não têm "o próximo": entre `"mat"` e `"fis"` não existe um `"fis" + 1`. A do `iloc` segue a regra das listas do Python.

O tipo do resultado depende do que você pede. Um rótulo só, numa dimensão, derruba essa dimensão: `notas.loc[102]` é uma Series, e `notas.loc[102, "mat"]` é um número. Uma lista ou uma fatia mantém a dimensão: `notas.loc[[102]]` é um DataFrame de uma linha. Para um valor só, `at` (rótulos) e `iat` (posições) são as versões diretas: `notas.at[102, "mat"]`, `notas.iat[1, 1]`.

Os erros mais comuns vêm de trocar um pelo outro. `notas.loc[0]` dá `KeyError: 0`, porque não existe matrícula 0. `notas.iloc["Ana"]` dá `TypeError: Cannot index by location index with a non-integer key`. O pior é o que não dá erro: `notas.iloc[101:103]` pede as posições 101 e 102 de uma tabela de 4 linhas e devolve uma tabela **vazia**, em silêncio.

Rótulos não precisam ser números. `notas.set_index("nome")` troca o índice pelos nomes, e então `loc["Bruno", "fis"]` acha a nota pelo nome do aluno. Com datas como índice, `loc["2025-03-01":"2025-03-07"]` pega uma semana inteira, com as duas pontas.

## Passo 2 · Previsão · O que cada seleção devolve

O programa faz seis seleções na tabela da leitura e imprime o tipo e a forma de cada resultado. Leia sem executar e digite exatamente o que ele imprime.

### Código
```python
import pandas as pd

notas = pd.DataFrame(
    {"nome": ["Ana", "Bruno", "Carla", "Davi"], "mat": [7.5, 5.0, 9.0, 6.5], "fis": [6.0, 8.0, 7.0, 4.5]},
    index=[101, 102, 103, 104],
)
a = notas.loc[102]
b = notas.loc[[102]]
c = notas.loc[102:103, "mat"]
d = notas.iloc[1:3, 1:]
e = notas.loc[103, "fis"]
print(type(a).__name__, a.shape)
print(type(b).__name__, b.shape)
print(type(c).__name__, c.shape, c.tolist())
print(type(d).__name__, d.shape)
print(type(e).__name__, e)
print(len(notas.iloc[101:103]), len(notas.loc[101:103]))
```

### Dicas
1. Um rótulo isolado derruba uma dimensão; uma lista ou uma fatia a mantém.
2. A fatia do `loc` inclui o fim; a do `iloc`, não.
3. Um valor tirado de uma coluna decimal é um `float64` do numpy. E `iloc` com posições que não existem não dá erro numa fatia.

### Saída esperada
```text
Series (3,)
DataFrame (1, 3)
Series (2,) [5.0, 9.0]
DataFrame (2, 2)
float64 7.0
0 3
```

## Passo 3 · Exercício · Três recortes
modo: lacunas

Três recortes de uma planilha de notas, um com cada ideia da leitura. Complete as lacunas (`___`): cada função tem duas, o indexador e o que vai dentro dos colchetes.

### Instruções
1. `notas_de(df, nome)` recebe uma tabela indexada pelo nome do aluno e devolve a linha de `nome` como uma Series.
2. `bloco(df, inicio, fim)` devolve as linhas com rótulos de `inicio` até `fim`, **incluindo os dois**, com todas as colunas.
3. `ultimas_colunas(df, k)` devolve todas as linhas e só as `k` últimas colunas (`k` é pelo menos 1).

### Código inicial
```python
import pandas as pd


def notas_de(df, nome):
    return df.___[___]


def bloco(df, inicio, fim):
    return df.___[___]


def ultimas_colunas(df, k):
    return df.___[___]
```

### Solução
```python
import pandas as pd


def notas_de(df, nome):
    return df.loc[nome]


def bloco(df, inicio, fim):
    return df.loc[inicio:fim]


def ultimas_colunas(df, k):
    return df.iloc[:, -k:]
```

### Dicas
1. Nomes e matrículas são rótulos; "as últimas" é uma posição.
2. Um rótulo isolado entre colchetes dá Series; uma lista com ele dá DataFrame.
3. Para escolher colunas com `iloc`, a primeira coisa dentro dos colchetes são as linhas.

### Verificação
```json
[
  { "id": "notas-tipo", "checkpoint": 1, "kind": "expr",
    "setup": "import pandas as pd\nN = pd.DataFrame({\"mat\": [7.5, 5.0, 9.0], \"fis\": [6.0, 8.0, 7.0], \"port\": [8.0, 7.5, 6.5]}, index=[\"Ana\", \"Bruno\", \"Carla\"])",
    "expr": "type(notas_de(N, \"Bruno\")).__name__", "expected": "Series",
    "name": "notas_de devolve uma Series", "hint": "Uma lista com um nome só ainda é uma lista." },
  { "id": "notas-bruno", "checkpoint": 1, "kind": "expr",
    "setup": "import pandas as pd\nN = pd.DataFrame({\"mat\": [7.5, 5.0, 9.0], \"fis\": [6.0, 8.0, 7.0], \"port\": [8.0, 7.5, 6.5]}, index=[\"Ana\", \"Bruno\", \"Carla\"])",
    "expr": "notas_de(N, \"Bruno\").to_dict()", "expected": { "mat": 5.0, "fis": 8.0, "port": 7.5 },
    "name": "As notas do Bruno" },
  { "id": "notas-carla", "checkpoint": 1, "kind": "expr",
    "setup": "import pandas as pd\nN = pd.DataFrame({\"mat\": [7.5, 5.0, 9.0], \"fis\": [6.0, 8.0, 7.0], \"port\": [8.0, 7.5, 6.5]}, index=[\"Ana\", \"Bruno\", \"Carla\"])",
    "expr": "notas_de(N, \"Carla\").tolist()", "expected": [9.0, 7.0, 6.5], "name": "As notas da Carla" },
  { "id": "bloco-meio", "checkpoint": 2, "kind": "expr",
    "setup": "import pandas as pd\nM = pd.DataFrame({\"nota\": [7.5, 5.0, 9.0, 6.5, 8.0]}, index=[101, 102, 103, 104, 105])",
    "expr": "bloco(M, 102, 104).index.tolist()", "expected": [102, 103, 104],
    "name": "bloco(M, 102, 104) tem as matrículas 102, 103 e 104", "hint": "Os rótulos aqui são matrículas, não posições." },
  { "id": "bloco-um", "checkpoint": 2, "kind": "expr",
    "setup": "import pandas as pd\nM = pd.DataFrame({\"nota\": [7.5, 5.0, 9.0, 6.5, 8.0]}, index=[101, 102, 103, 104, 105])",
    "expr": "bloco(M, 103, 103).index.tolist()", "expected": [103], "name": "Início igual ao fim dá uma linha" },
  { "id": "bloco-fim", "checkpoint": 2, "kind": "expr",
    "setup": "import pandas as pd\nM = pd.DataFrame({\"nota\": [7.5, 5.0, 9.0, 6.5, 8.0]}, index=[101, 102, 103, 104, 105])",
    "expr": "bloco(M, 101, 102)[\"nota\"].tolist()", "expected": [7.5, 5.0], "name": "As duas primeiras matrículas, com as notas" },
  { "id": "bloco-datas", "checkpoint": 2, "kind": "expr",
    "setup": "import pandas as pd\nT = pd.DataFrame({\"chuva\": [0.0, 12.5, 3.0, 0.0]}, index=[\"2025-03-01\", \"2025-03-02\", \"2025-03-03\", \"2025-03-04\"])",
    "expr": "bloco(T, \"2025-03-02\", \"2025-03-03\")[\"chuva\"].tolist()", "expected": [12.5, 3.0],
    "name": "Também funciona com datas em texto como rótulos" },
  { "id": "colunas-2", "checkpoint": 3, "kind": "expr",
    "setup": "import pandas as pd\nN = pd.DataFrame({\"mat\": [7.5, 5.0, 9.0], \"fis\": [6.0, 8.0, 7.0], \"port\": [8.0, 7.5, 6.5]}, index=[\"Ana\", \"Bruno\", \"Carla\"])",
    "expr": "list(ultimas_colunas(N, 2).columns)", "expected": ["fis", "port"],
    "name": "As duas últimas colunas", "hint": "Colunas, não linhas: o primeiro lugar dentro dos colchetes é das linhas." },
  { "id": "colunas-linhas", "checkpoint": 3, "kind": "expr",
    "setup": "import pandas as pd\nN = pd.DataFrame({\"mat\": [7.5, 5.0, 9.0], \"fis\": [6.0, 8.0, 7.0], \"port\": [8.0, 7.5, 6.5]}, index=[\"Ana\", \"Bruno\", \"Carla\"])",
    "expr": "ultimas_colunas(N, 2).index.tolist()", "expected": ["Ana", "Bruno", "Carla"], "name": "Todas as linhas continuam" },
  { "id": "colunas-1", "checkpoint": 3, "kind": "expr",
    "setup": "import pandas as pd\nN = pd.DataFrame({\"mat\": [7.5, 5.0, 9.0], \"fis\": [6.0, 8.0, 7.0], \"port\": [8.0, 7.5, 6.5]}, index=[\"Ana\", \"Bruno\", \"Carla\"])",
    "expr": "[type(ultimas_colunas(N, 1)).__name__, list(ultimas_colunas(N, 1).columns)]", "expected": ["DataFrame", ["port"]],
    "name": "Com k = 1, ainda é uma tabela, com a última coluna" },
  { "id": "colunas-todas", "checkpoint": 3, "kind": "expr",
    "setup": "import pandas as pd\nN = pd.DataFrame({\"mat\": [7.5, 5.0, 9.0], \"fis\": [6.0, 8.0, 7.0], \"port\": [8.0, 7.5, 6.5]}, index=[\"Ana\", \"Bruno\", \"Carla\"])",
    "expr": "list(ultimas_colunas(N, 3).columns)", "expected": ["mat", "fis", "port"], "name": "Com k igual ao número de colunas, todas" }
]
```

### Soluções erradas
```python name="nome dentro de uma lista"
import pandas as pd


def notas_de(df, nome):
    return df.loc[[nome]]


def bloco(df, inicio, fim):
    return df.loc[inicio:fim]


def ultimas_colunas(df, k):
    return df.iloc[:, -k:]
```
```python name="iloc com o nome"
import pandas as pd


def notas_de(df, nome):
    return df.iloc[nome]


def bloco(df, inicio, fim):
    return df.loc[inicio:fim]


def ultimas_colunas(df, k):
    return df.iloc[:, -k:]
```
```python name="bloco por posição"
import pandas as pd


def notas_de(df, nome):
    return df.loc[nome]


def bloco(df, inicio, fim):
    return df.iloc[inicio:fim]


def ultimas_colunas(df, k):
    return df.iloc[:, -k:]
```
```python name="compensa um fim exclusivo"
import pandas as pd


def notas_de(df, nome):
    return df.loc[nome]


def bloco(df, inicio, fim):
    return df.loc[inicio:fim + 1]


def ultimas_colunas(df, k):
    return df.iloc[:, -k:]
```
```python name="últimas linhas"
import pandas as pd


def notas_de(df, nome):
    return df.loc[nome]


def bloco(df, inicio, fim):
    return df.loc[inicio:fim]


def ultimas_colunas(df, k):
    return df.iloc[-k:]
```
```python name="loc com posição negativa"
import pandas as pd


def notas_de(df, nome):
    return df.loc[nome]


def bloco(df, inicio, fim):
    return df.loc[inicio:fim]


def ultimas_colunas(df, k):
    return df.loc[:, -k:]
```
```python name="a partir da coluna k"
import pandas as pd


def notas_de(df, nome):
    return df.loc[nome]


def bloco(df, inicio, fim):
    return df.loc[inicio:fim]


def ultimas_colunas(df, k):
    return df.iloc[:, k:]
```

## Passo 4 · Leitura · Atribuir com Copy-on-Write

Ler com `loc` é metade do trabalho; a outra metade é mudar valores. A escola decidiu dar meio ponto a quem tirou 7 ou mais. Uma tentativa comum encadeia duas seleções:

```python
notas[notas["mat"] >= 7]["mat"] = notas["mat"] + 0.5
```

O primeiro par de colchetes filtra as linhas e cria um objeto **novo**; o segundo altera esse objeto novo, que some logo depois. A tabela `notas` não muda. Isso se chama **atribuição encadeada**, e no pandas 3 ela nunca funciona, por causa do *Copy-on-Write*: todo resultado de uma seleção se comporta como uma cópia. O pandas avisa:

```text
ChainedAssignmentError: A value is being set on a copy of a DataFrame or Series through chained assignment.
Such chained assignment never works to update the original DataFrame or Series, because the intermediate object on which we are setting values always behaves as a copy (due to Copy-on-Write).
```

É um aviso, não uma exceção: o programa continua, com o valor antigo. Em versões antigas, o aviso se chamava `SettingWithCopyWarning`, e às vezes a atribuição funcionava; código copiado da internet pode trazer esse hábito. A forma que funciona é **uma operação `loc` só**, com as linhas e a coluna juntas:

```python
aprovados = notas["mat"] >= 7
notas.loc[aprovados, "mat"] = notas.loc[aprovados, "mat"] + 0.5
```

O mesmo vale para `notas["mat"][aprovados] = ...`, que também encadeia, e para `notas["mat"].fillna(0, inplace=True)`, que altera uma coluna tirada da tabela, e não a tabela.

O Copy-on-Write também protege no sentido contrário: `sub = notas[notas["mat"] >= 7]` seguido de `sub["mat"] = 0` muda só `sub`. Mas `notas["mat"] = ...` dentro de uma função **altera** a tabela que o chamador passou, porque é o mesmo objeto. Quando a função deve devolver uma tabela nova, comece com `novo = df.copy()` e altere `novo`.

Para testar se um valor isolado está ausente, use `pd.isna(valor)`: a comparação `valor == np.nan` é sempre falsa, até para o próprio `NaN`.

## Passo 5 · Exercício · Bônus sem atribuição encadeada

Escreva a regra do bônus da leitura como uma função que devolve uma tabela nova.

### Instruções
1. `aplicar_bonus(df, minimo, bonus)` devolve um DataFrame novo com as mesmas linhas, o mesmo índice e as mesmas colunas de `df` (`nome` e `nota`).
2. Na tabela devolvida, quem tem `nota` maior ou igual a `minimo` fica com `nota + bonus`; as outras notas não mudam.
3. A tabela recebida não muda.

### Código inicial
```python
import pandas as pd


def aplicar_bonus(df, minimo, bonus):
    pass
```

### Solução
```python
import pandas as pd


def aplicar_bonus(df, minimo, bonus):
    novo = df.copy()
    recebe = novo["nota"] >= minimo
    novo.loc[recebe, "nota"] = novo.loc[recebe, "nota"] + bonus
    return novo
```

### Dicas
1. Linhas e coluna vão no mesmo `loc`; dois pares de colchetes seguidos alteram um objeto que desaparece.
2. Atribuir na tabela recebida muda a tabela de quem chamou a função.
3. "Maior ou igual" inclui quem tirou exatamente o mínimo.

### Verificação
```json
[
  { "id": "valores", "checkpoint": 2, "kind": "expr",
    "setup": "import pandas as pd\nD = pd.DataFrame({\"nome\": [\"Ana\", \"Bia\", \"Caio\", \"Davi\", \"Eva\"], \"nota\": [5.0, 7.0, 8.5, 6.9, 7.0]}, index=[10, 20, 30, 40, 50])",
    "expr": "aplicar_bonus(D, 7.0, 0.5)[\"nota\"].tolist()", "expected": [5.0, 7.5, 9.0, 6.9, 7.5], "tolerance": 1e-9,
    "name": "Meio ponto para quem tem 7 ou mais", "hint": "Confira se a nota mudou mesmo na tabela que você devolve." },
  { "id": "limite", "checkpoint": 2, "kind": "expr",
    "setup": "import pandas as pd\nD = pd.DataFrame({\"nome\": [\"Ana\", \"Bia\", \"Caio\", \"Davi\", \"Eva\"], \"nota\": [5.0, 7.0, 8.5, 6.9, 7.0]}, index=[10, 20, 30, 40, 50])",
    "expr": "aplicar_bonus(D, 8.5, 1.0)[\"nota\"].tolist()", "expected": [5.0, 7.0, 9.5, 6.9, 7.0], "tolerance": 1e-9,
    "name": "Quem tirou exatamente o mínimo recebe o bônus" },
  { "id": "ninguem", "checkpoint": 2, "kind": "expr",
    "setup": "import pandas as pd\nD = pd.DataFrame({\"nome\": [\"Ana\", \"Bia\", \"Caio\", \"Davi\", \"Eva\"], \"nota\": [5.0, 7.0, 8.5, 6.9, 7.0]}, index=[10, 20, 30, 40, 50])",
    "expr": "aplicar_bonus(D, 9.5, 1.0)[\"nota\"].tolist()", "expected": [5.0, 7.0, 8.5, 6.9, 7.0], "tolerance": 1e-9,
    "name": "Ninguém acima do mínimo: nada muda" },
  { "id": "todos", "checkpoint": 2, "kind": "expr",
    "setup": "import pandas as pd\nD = pd.DataFrame({\"nome\": [\"Ana\", \"Bia\", \"Caio\", \"Davi\", \"Eva\"], \"nota\": [5.0, 7.0, 8.5, 6.9, 7.0]}, index=[10, 20, 30, 40, 50])",
    "expr": "aplicar_bonus(D, 0.0, 0.25)[\"nota\"].tolist()", "expected": [5.25, 7.25, 8.75, 7.15, 7.25], "tolerance": 1e-9,
    "name": "Mínimo zero: todos recebem" },
  { "id": "linhas", "checkpoint": 1, "kind": "expr",
    "setup": "import pandas as pd\nD = pd.DataFrame({\"nome\": [\"Ana\", \"Bia\", \"Caio\", \"Davi\", \"Eva\"], \"nota\": [5.0, 7.0, 8.5, 6.9, 7.0]}, index=[10, 20, 30, 40, 50])",
    "expr": "aplicar_bonus(D, 7.0, 0.5).index.tolist()", "expected": [10, 20, 30, 40, 50],
    "name": "Todas as linhas, com o mesmo índice", "hint": "Quem não recebe bônus continua na tabela." },
  { "id": "colunas", "checkpoint": 1, "kind": "expr",
    "setup": "import pandas as pd\nD = pd.DataFrame({\"nome\": [\"Ana\", \"Bia\", \"Caio\", \"Davi\", \"Eva\"], \"nota\": [5.0, 7.0, 8.5, 6.9, 7.0]}, index=[10, 20, 30, 40, 50])",
    "expr": "list(aplicar_bonus(D, 7.0, 0.5).columns)", "expected": ["nome", "nota"], "name": "As mesmas colunas" },
  { "id": "nomes", "checkpoint": 1, "kind": "expr",
    "setup": "import pandas as pd\nD = pd.DataFrame({\"nome\": [\"Ana\", \"Bia\", \"Caio\", \"Davi\", \"Eva\"], \"nota\": [5.0, 7.0, 8.5, 6.9, 7.0]}, index=[10, 20, 30, 40, 50])",
    "expr": "aplicar_bonus(D, 7.0, 0.5)[\"nome\"].tolist()", "expected": ["Ana", "Bia", "Caio", "Davi", "Eva"],
    "name": "Os nomes não mudam" },
  { "id": "tipo", "checkpoint": 1, "kind": "expr",
    "setup": "import pandas as pd\nD = pd.DataFrame({\"nome\": [\"Ana\", \"Bia\"], \"nota\": [5.0, 7.0]})",
    "expr": "type(aplicar_bonus(D, 6.0, 1.0)).__name__", "expected": "DataFrame", "name": "aplicar_bonus devolve um DataFrame" },
  { "id": "nao-altera", "checkpoint": 3, "kind": "expr",
    "setup": "import pandas as pd\nD = pd.DataFrame({\"nome\": [\"Ana\", \"Bia\", \"Caio\", \"Davi\", \"Eva\"], \"nota\": [5.0, 7.0, 8.5, 6.9, 7.0]}, index=[10, 20, 30, 40, 50])\nr = aplicar_bonus(D, 7.0, 0.5)",
    "expr": "D[\"nota\"].tolist()", "expected": [5.0, 7.0, 8.5, 6.9, 7.0], "tolerance": 1e-9,
    "name": "A tabela recebida continua com as notas antigas", "hint": "Trabalhe numa cópia." }
]
```

### Soluções erradas
```python name="filtra e depois escolhe a coluna"
import pandas as pd


def aplicar_bonus(df, minimo, bonus):
    novo = df.copy()
    recebe = novo["nota"] >= minimo
    novo[recebe]["nota"] = novo.loc[recebe, "nota"] + bonus
    return novo
```
```python name="escolhe a coluna e depois filtra"
import pandas as pd


def aplicar_bonus(df, minimo, bonus):
    novo = df.copy()
    recebe = novo["nota"] >= minimo
    novo["nota"][recebe] = novo.loc[recebe, "nota"] + bonus
    return novo
```
```python name="altera a tabela recebida"
import pandas as pd


def aplicar_bonus(df, minimo, bonus):
    novo = df
    recebe = novo["nota"] >= minimo
    novo.loc[recebe, "nota"] = novo.loc[recebe, "nota"] + bonus
    return novo
```
```python name="maior estrito"
import pandas as pd


def aplicar_bonus(df, minimo, bonus):
    novo = df.copy()
    recebe = novo["nota"] > minimo
    novo.loc[recebe, "nota"] = novo.loc[recebe, "nota"] + bonus
    return novo
```
```python name="devolve só quem recebeu"
import pandas as pd


def aplicar_bonus(df, minimo, bonus):
    novo = df.loc[df["nota"] >= minimo].copy()
    novo["nota"] = novo["nota"] + bonus
    return novo
```
```python name="troca a nota pelo bônus"
import pandas as pd


def aplicar_bonus(df, minimo, bonus):
    novo = df.copy()
    recebe = novo["nota"] >= minimo
    novo.loc[recebe, "nota"] = bonus
    return novo
```

## Passo 6 · Exercício · Índice por nome

A tabela de notas chega com uma linha por aluno e uma coluna por disciplina (`nome`, `mat`, `fis`, `port`), com o índice padrão 0, 1, 2… Um painel da escola pede a nota de um aluno numa disciplina, e o pedido pode vir com um nome ou uma disciplina que não existem.

### Instruções
1. `nota_do_aluno(df, nome, disciplina)` usa os nomes como índice e devolve a nota de `nome` em `disciplina` como `float` do Python.
2. Se o aluno ou a disciplina não existirem na tabela, devolva `None` (sem deixar escapar `KeyError`).
3. Se a nota estiver ausente (`NaN`), devolva `None`.
4. Não altere `df`.

### Código inicial
```python
import pandas as pd


def nota_do_aluno(df, nome, disciplina):
    pass
```

### Solução
```python
import pandas as pd


def nota_do_aluno(df, nome, disciplina):
    por_nome = df.set_index("nome")
    if nome not in por_nome.index or disciplina not in por_nome.columns:
        return None
    nota = por_nome.at[nome, disciplina]
    if pd.isna(nota):
        return None
    return float(nota)
```

### Dicas
1. `in` funciona com `index` e com `columns`, como numa lista.
2. Um valor tirado de uma coluna decimal é `numpy.float64`, não `float`.
3. `set_index` devolve uma tabela nova; o parâmetro que altera no lugar muda a tabela de quem chamou.

### Verificação
```json
[
  { "id": "bruno-fis", "checkpoint": 1, "kind": "expr",
    "setup": "import pandas as pd\nimport numpy as np\nD = pd.DataFrame({\"nome\": [\"Ana\", \"Bruno\", \"Carla\"], \"mat\": [7.5, 5.0, 9.0], \"fis\": [6.0, 8.0, np.nan], \"port\": [8.0, 7.5, 6.5]})",
    "expr": "nota_do_aluno(D, \"Bruno\", \"fis\")", "expected": 8.0, "type": "float",
    "name": "A nota do Bruno em física", "hint": "Devolva um float do Python." },
  { "id": "carla-port", "checkpoint": 1, "kind": "expr",
    "setup": "import pandas as pd\nimport numpy as np\nD = pd.DataFrame({\"nome\": [\"Ana\", \"Bruno\", \"Carla\"], \"mat\": [7.5, 5.0, 9.0], \"fis\": [6.0, 8.0, np.nan], \"port\": [8.0, 7.5, 6.5]})",
    "expr": "nota_do_aluno(D, \"Carla\", \"port\")", "expected": 6.5, "type": "float", "name": "A nota da Carla em português" },
  { "id": "ana-mat", "checkpoint": 1, "kind": "expr",
    "setup": "import pandas as pd\nimport numpy as np\nD = pd.DataFrame({\"nome\": [\"Ana\", \"Bruno\", \"Carla\"], \"mat\": [7.5, 5.0, 9.0], \"fis\": [6.0, 8.0, np.nan], \"port\": [8.0, 7.5, 6.5]})",
    "expr": "nota_do_aluno(D, \"Ana\", \"mat\")", "expected": 7.5, "type": "float", "name": "A nota da Ana em matemática" },
  { "id": "sem-aluno", "checkpoint": 2, "kind": "expr",
    "setup": "import pandas as pd\nimport numpy as np\nD = pd.DataFrame({\"nome\": [\"Ana\", \"Bruno\", \"Carla\"], \"mat\": [7.5, 5.0, 9.0], \"fis\": [6.0, 8.0, np.nan], \"port\": [8.0, 7.5, 6.5]})",
    "expr": "nota_do_aluno(D, \"Zeca\", \"mat\")", "expected": null, "type": "NoneType",
    "name": "Aluno que não existe dá None", "hint": "Confira o nome antes de selecionar." },
  { "id": "sem-disciplina", "checkpoint": 2, "kind": "expr",
    "setup": "import pandas as pd\nimport numpy as np\nD = pd.DataFrame({\"nome\": [\"Ana\", \"Bruno\", \"Carla\"], \"mat\": [7.5, 5.0, 9.0], \"fis\": [6.0, 8.0, np.nan], \"port\": [8.0, 7.5, 6.5]})",
    "expr": "nota_do_aluno(D, \"Ana\", \"quimica\")", "expected": null, "type": "NoneType",
    "name": "Disciplina que não existe dá None", "hint": "A disciplina também pode faltar." },
  { "id": "nan", "checkpoint": 3, "kind": "expr",
    "setup": "import pandas as pd\nimport numpy as np\nD = pd.DataFrame({\"nome\": [\"Ana\", \"Bruno\", \"Carla\"], \"mat\": [7.5, 5.0, 9.0], \"fis\": [6.0, 8.0, np.nan], \"port\": [8.0, 7.5, 6.5]})",
    "expr": "nota_do_aluno(D, \"Carla\", \"fis\")", "expected": null, "type": "NoneType",
    "name": "Nota ausente dá None", "hint": "NaN não é igual a nada, nem a ele mesmo." },
  { "id": "nao-altera", "checkpoint": 4, "kind": "expr",
    "setup": "import pandas as pd\nimport numpy as np\nD = pd.DataFrame({\"nome\": [\"Ana\", \"Bruno\", \"Carla\"], \"mat\": [7.5, 5.0, 9.0], \"fis\": [6.0, 8.0, np.nan], \"port\": [8.0, 7.5, 6.5]})\nr = nota_do_aluno(D, \"Bruno\", \"fis\")",
    "expr": "[list(D.columns), D.index.tolist()]", "expected": [["nome", "mat", "fis", "port"], [0, 1, 2]],
    "name": "A tabela recebida continua com o índice e as colunas de antes" },
  { "id": "duas-consultas", "checkpoint": 4, "kind": "expr",
    "setup": "import pandas as pd\nimport numpy as np\nD = pd.DataFrame({\"nome\": [\"Ana\", \"Bruno\", \"Carla\"], \"mat\": [7.5, 5.0, 9.0], \"fis\": [6.0, 8.0, np.nan], \"port\": [8.0, 7.5, 6.5]})\nprimeira = nota_do_aluno(D, \"Ana\", \"port\")",
    "expr": "[primeira, nota_do_aluno(D, \"Bruno\", \"mat\")]", "expected": [8.0, 5.0],
    "name": "Duas consultas seguidas na mesma tabela" }
]
```

### Soluções erradas
```python name="não confere o aluno"
import pandas as pd


def nota_do_aluno(df, nome, disciplina):
    por_nome = df.set_index("nome")
    if disciplina not in por_nome.columns:
        return None
    nota = por_nome.at[nome, disciplina]
    if pd.isna(nota):
        return None
    return float(nota)
```
```python name="não confere a disciplina"
import pandas as pd


def nota_do_aluno(df, nome, disciplina):
    por_nome = df.set_index("nome")
    if nome not in por_nome.index:
        return None
    nota = por_nome.at[nome, disciplina]
    if pd.isna(nota):
        return None
    return float(nota)
```
```python name="devolve o float do numpy"
import pandas as pd


def nota_do_aluno(df, nome, disciplina):
    por_nome = df.set_index("nome")
    if nome not in por_nome.index or disciplina not in por_nome.columns:
        return None
    nota = por_nome.at[nome, disciplina]
    if pd.isna(nota):
        return None
    return nota
```
```python name="NaN passa como nota"
import pandas as pd


def nota_do_aluno(df, nome, disciplina):
    por_nome = df.set_index("nome")
    if nome not in por_nome.index or disciplina not in por_nome.columns:
        return None
    return float(por_nome.at[nome, disciplina])
```
```python name="procura o nome no índice numérico"
import pandas as pd


def nota_do_aluno(df, nome, disciplina):
    try:
        nota = df.loc[nome, disciplina]
    except KeyError:
        return None
    if pd.isna(nota):
        return None
    return float(nota)
```
```python name="set_index no lugar"
import pandas as pd


def nota_do_aluno(df, nome, disciplina):
    df.set_index("nome", inplace=True)
    if nome not in df.index or disciplina not in df.columns:
        return None
    nota = df.at[nome, disciplina]
    if pd.isna(nota):
        return None
    return float(nota)
```
```python name="iat com rótulos"
import pandas as pd


def nota_do_aluno(df, nome, disciplina):
    por_nome = df.set_index("nome")
    if nome not in por_nome.index or disciplina not in por_nome.columns:
        return None
    nota = por_nome.iat[nome, disciplina]
    if pd.isna(nota):
        return None
    return float(nota)
```

## Passo 7 · Quiz · loc, iloc e cópias

### Pergunta
`filtrada` é o resultado de um filtro e tem os rótulos `3, 7, 12, 15, 20` no índice. Você quer as três primeiras linhas dela. Qual expressão dá isso?
- [ ] `filtrada.loc[0:2]`
- [ ] `filtrada.loc[:3]`
- [x] `filtrada.iloc[:3]`
- [ ] `filtrada.iloc[0:2]`
> "As três primeiras" é uma pergunta de posição: `iloc[:3]` pega as posições 0, 1 e 2, quaisquer que sejam os rótulos. `loc[0:2]` procura rótulos entre 0 e 2 e devolve uma tabela vazia; `loc[:3]` vai até o rótulo 3, inclusive, e devolve uma linha só. `iloc[0:2]` exclui a posição 2 e dá duas linhas.

### Pergunta
Para zerar a meta das lojas da região Sul, alguém escreveu `vendas[vendas["regiao"] == "Sul"]["meta"] = 0`. O programa mostrou um `ChainedAssignmentError` e as metas continuaram as mesmas. Qual linha faz o que se queria?
- [ ] `vendas[vendas["regiao"] == "Sul"].copy()["meta"] = 0`
- [ ] `vendas["meta"][vendas["regiao"] == "Sul"] = 0`
- [x] `vendas.loc[vendas["regiao"] == "Sul", "meta"] = 0`
- [ ] Trocar o aviso por exceção com `warnings` e rodar de novo
> Com uma operação `loc` só, linhas e coluna são escolhidas e alteradas na própria `vendas`. As duas outras formas ainda encadeiam seleções: o `.copy()` deixa explícito que a alteração vai para uma cópia descartada, e escolher a coluna antes de filtrar também altera um objeto intermediário. Transformar o aviso em exceção ajuda a achar o problema, mas não muda nenhum valor.

### Pergunta
```python
def com_imposto(df):
    df["total"] = df["preco"] * 1.1
    return df

tabela = com_imposto(produtos)
```
Depois dessas linhas, o que acontece com `produtos`?
- [ ] Nada: por causa do Copy-on-Write, a função trabalhou numa cópia
- [x] `produtos` também ganhou a coluna `total`, porque `df` e `produtos` são o mesmo objeto
- [ ] `produtos` ganhou a coluna `total`, mas com `NaN`
- [ ] O pandas levanta `ChainedAssignmentError` e a coluna não é criada
> `df["total"] = ...` é uma atribuição direta na tabela que a função recebeu, e essa tabela é o próprio `produtos`. O Copy-on-Write vale para resultados de seleção (um filtro, uma coluna tirada da tabela), não para o objeto passado como argumento. Não há encadeamento aqui, então não há aviso. Para devolver uma tabela nova, comece a função com `df = df.copy()`.
