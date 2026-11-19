---
slug: n4-m3-01-valores-ausentes
titulo: Valores ausentes
descricao: NaN, None e NA; isna, dropna, fillna (constante, média, mediana, ffill), e a decisão de remover ou imputar.
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
- Detectar e contar valores ausentes por coluna e por linha
- Aplicar estratégias de remoção e imputação e justificar a escolha
- Explicar como NaN afeta somas, médias e comparações
---

## Passo 1 · Leitura · O que é ausente

Uma rede fictícia de lojas mandou a planilha do mês, e algumas células vieram em branco: uma loja não informou o faturamento, outra deixou a cidade vazia. Ao montar a tabela, o pandas troca cada célula vazia por um **valor ausente**, e daí em diante toda conta precisa decidir o que fazer com ele.

```python
import numpy as np
import pandas as pd

lojas = pd.DataFrame({
    "loja": ["L1", "L2", "L3", "L4"],
    "faturamento": [52_000.0, np.nan, 61_000.0, None],
    "cidade": ["Vila Nova", None, "Porto Claro", "Vila Nova"],
})
print(lojas.isna().sum())     # loja 0, faturamento 2, cidade 1
```

Há três jeitos de escrever "falta". `np.nan` é um `float` especial, o ausente das colunas numéricas. `None` vira `NaN` numa coluna de números e continua ausente numa coluna de texto. `pd.NA` é o ausente dos tipos que aceitam lacunas, como `Int64` (com I maiúsculo). Para achar os buracos, use `isna()` (ou o contrário, `notna()`), nunca uma comparação: pela regra do ponto flutuante, `NaN` não é igual a nada, nem a ele mesmo. `np.nan == np.nan` vale `False`, e `lojas[lojas["faturamento"] == np.nan]` devolve uma tabela vazia, sem erro nenhum.

As contas tratam o ausente de dois jeitos. As reduções do pandas **ignoram**: `lojas["faturamento"].mean()` é a média das duas lojas que informaram, 56 500, e `count()` diz quantos valores entraram na conta (2, contra `len` igual a 4). A aritmética **propaga**: `lojas["faturamento"] * 1.1` continua com `NaN` nas mesmas linhas. Ignorar parece prático, mas muda a pergunta: a média passa a ser "das lojas que responderam", e se as que não responderam venderam menos, ela sai otimista.

Um ausente também impede a coluna de ser inteira. Uma coluna de contagens com um buraco vira `float64`, e forçar a conversão com `astype(int)` falha:

```text
IntCastingNaNError: Cannot convert non-finite values (NA or inf) to integer.
```

As saídas são preencher antes, remover a linha ou converter para `Int64`, que guarda `<NA>` ao lado de inteiros. Antes de escolher, meça: quanto falta em cada coluna e quais linhas estão incompletas. É o primeiro exercício.

## Passo 2 · Previsão · NaN nas contas

O programa faz contas numa Series com dois ausentes. Leia sem executar e digite exatamente o que ele imprime. O Python escreve o ausente como `nan`.

### Código
```python
import numpy as np
import pandas as pd

vendas = pd.Series([10.0, np.nan, 30.0, np.nan])
print(vendas.sum(), vendas.mean())
print(vendas.count(), len(vendas))
print((vendas + 1).tolist())
print(vendas.sum(skipna=False))
print((vendas == np.nan).sum(), vendas.isna().sum())
print(pd.Series([np.nan, np.nan]).sum())
print(pd.Series(["Ana", None]).tolist())
print(pd.Series([1, 2, None]).dtype)
```

### Dicas
1. `sum` e `mean` pulam os ausentes; `count` conta só os valores presentes.
2. `skipna=False` desliga o "pular": um ausente na conta contamina o resultado. Sem nenhum valor presente, a soma é a de uma lista vazia.
3. Comparar com `np.nan` dá `False` em todas as linhas. Numa coluna de números, `None` vira `NaN`, e o `NaN` é um `float`.

### Saída esperada
```text
40.0 20.0
2 4
[11.0, nan, 31.0, nan]
nan
0 2
0.0
['Ana', nan]
float64
```

## Passo 3 · Exercício · Medir o que falta
modo: lacunas

Antes de remover ou preencher, meça. Complete as lacunas (`___`) das duas funções.

### Instruções
1. `relatorio_ausentes(df)` devolve um dicionário `{coluna: proporção}` com a fração de valores ausentes de cada coluna (de 0.0 a 1.0), como `float`, na ordem das colunas. A tabela tem pelo menos uma linha.
2. `linhas_incompletas(df)` devolve a lista dos rótulos do índice das linhas que têm **pelo menos um** valor ausente, na ordem da tabela.

### Código inicial
```python
import numpy as np
import pandas as pd


def relatorio_ausentes(df):
    proporcoes = (___).___()
    return {coluna: float(valor) for coluna, valor in proporcoes.items()}


def linhas_incompletas(df):
    tem_ausente = df.isna().___(axis=___)
    return df.index[tem_ausente].tolist()
```

### Solução
```python
import numpy as np
import pandas as pd


def relatorio_ausentes(df):
    proporcoes = (df.isna()).mean()
    return {coluna: float(valor) for coluna, valor in proporcoes.items()}


def linhas_incompletas(df):
    tem_ausente = df.isna().any(axis=1)
    return df.index[tem_ausente].tolist()
```

### Dicas
1. `isna()` devolve uma tabela de `True`/`False` do mesmo tamanho; a média de booleanos é a fração de `True`.
2. Uma comparação com `np.nan` nunca é verdadeira.
3. Uma linha incompleta tem ao menos um `True` entre as colunas: o eixo que some é o das colunas.

### Verificação
```json
[
  { "id": "relatorio", "checkpoint": 1, "kind": "expr",
    "setup": "df = pd.DataFrame({'loja': ['L1', 'L2', 'L3', 'L4'], 'faturamento': [52000.0, np.nan, 61000.0, np.nan], 'funcionarios': [8.0, 5.0, np.nan, 7.0], 'cidade': ['Vila Nova', None, 'Porto Claro', 'Vila Nova']})",
    "expr": "relatorio_ausentes(df)", "expected": { "loja": 0.0, "faturamento": 0.5, "funcionarios": 0.25, "cidade": 0.25 },
    "tolerance": 1e-9, "name": "Proporção de ausentes de cada coluna", "hint": "A proporção é a fração das linhas, não a contagem." },
  { "id": "coluna-completa", "checkpoint": 1, "kind": "expr",
    "setup": "df = pd.DataFrame({'loja': ['L1', 'L2', 'L3'], 'faturamento': [1.0, np.nan, 3.0]})",
    "expr": "relatorio_ausentes(df)['loja']", "expected": 0.0, "type": "float", "name": "Coluna sem ausentes vale 0.0" },
  { "id": "coluna-vazia", "checkpoint": 1, "kind": "expr",
    "setup": "df = pd.DataFrame({'a': [1.0, 2.0, 3.0], 'b': [np.nan, np.nan, np.nan]})",
    "expr": "relatorio_ausentes(df)['b']", "expected": 1.0, "tolerance": 1e-9, "name": "Coluna toda vazia vale 1.0" },
  { "id": "texto-none", "checkpoint": 1, "kind": "expr",
    "setup": "df = pd.DataFrame({'cidade': ['Vila Nova', None, 'Porto Claro', None, 'Lagoa Seca']})",
    "expr": "relatorio_ausentes(df)['cidade']", "expected": 0.4, "tolerance": 1e-9,
    "name": "None numa coluna de texto conta como ausente", "hint": "Detecte ausentes com isna, não com comparação." },
  { "id": "ordem-colunas", "checkpoint": 1, "kind": "expr",
    "setup": "df = pd.DataFrame({'z': [1.0, np.nan], 'a': [np.nan, 2.0], 'm': [1.0, 2.0]})",
    "expr": "list(relatorio_ausentes(df))", "expected": ["z", "a", "m"], "name": "As chaves seguem a ordem das colunas" },
  { "id": "uma-linha", "checkpoint": 1, "kind": "expr",
    "setup": "df = pd.DataFrame({'a': [np.nan], 'b': [4.0]})",
    "expr": "relatorio_ausentes(df)", "expected": { "a": 1.0, "b": 0.0 }, "tolerance": 1e-9, "name": "Tabela com uma linha" },
  { "id": "incompletas", "checkpoint": 2, "kind": "expr",
    "setup": "df = pd.DataFrame({'loja': ['L1', 'L2', 'L3', 'L4', 'L5'], 'faturamento': [52000.0, np.nan, 61000.0, 48000.0, np.nan], 'funcionarios': [8.0, 5.0, 6.0, np.nan, np.nan], 'cidade': ['Vila Nova', 'Lagoa Seca', 'Porto Claro', 'Vila Nova', None]}, index=['a1', 'a2', 'a3', 'a4', 'a5'])",
    "expr": "linhas_incompletas(df)", "expected": ["a2", "a4", "a5"], "name": "Linhas com ao menos um ausente",
    "hint": "Basta um ausente na linha; o resultado são rótulos do índice." },
  { "id": "nenhuma", "checkpoint": 2, "kind": "expr",
    "setup": "df = pd.DataFrame({'a': [1.0, 2.0, 3.0], 'b': ['x', 'y', 'z'], 'c': [0.5, 0.5, 0.5]})",
    "expr": "linhas_incompletas(df)", "expected": [], "name": "Tabela completa não tem linhas incompletas" },
  { "id": "so-texto", "checkpoint": 2, "kind": "expr",
    "setup": "df = pd.DataFrame({'a': [1.0, 2.0, 3.0, 4.0], 'b': [1.0, 2.0, 3.0, 4.0], 'c': ['x', None, 'z', 'w']}, index=[10, 20, 30, 40])",
    "expr": "linhas_incompletas(df)", "expected": [20], "name": "Um None só, na coluna de texto, já torna a linha incompleta" },
  { "id": "toda-vazia", "checkpoint": 2, "kind": "expr",
    "setup": "df = pd.DataFrame({'a': [1.0, np.nan, 3.0, 4.0, np.nan], 'b': [1.0, np.nan, 3.0, 4.0, 5.0], 'c': [1.0, np.nan, 3.0, 4.0, 5.0]})",
    "expr": "linhas_incompletas(df)", "expected": [1, 4], "name": "Linha toda vazia e linha com um ausente entram as duas" }
]
```

### Soluções erradas
```python name="compara com np.nan"
import numpy as np
import pandas as pd


def relatorio_ausentes(df):
    proporcoes = (df == np.nan).mean()
    return {coluna: float(valor) for coluna, valor in proporcoes.items()}


def linhas_incompletas(df):
    tem_ausente = df.isna().any(axis=1)
    return df.index[tem_ausente].tolist()
```
```python name="mede os preenchidos"
import numpy as np
import pandas as pd


def relatorio_ausentes(df):
    proporcoes = (df.notna()).mean()
    return {coluna: float(valor) for coluna, valor in proporcoes.items()}


def linhas_incompletas(df):
    tem_ausente = df.isna().any(axis=1)
    return df.index[tem_ausente].tolist()
```
```python name="conta em vez de proporção"
import numpy as np
import pandas as pd


def relatorio_ausentes(df):
    proporcoes = (df.isna()).sum()
    return {coluna: float(valor) for coluna, valor in proporcoes.items()}


def linhas_incompletas(df):
    tem_ausente = df.isna().any(axis=1)
    return df.index[tem_ausente].tolist()
```
```python name="só linhas totalmente vazias"
import numpy as np
import pandas as pd


def relatorio_ausentes(df):
    proporcoes = (df.isna()).mean()
    return {coluna: float(valor) for coluna, valor in proporcoes.items()}


def linhas_incompletas(df):
    tem_ausente = df.isna().all(axis=1)
    return df.index[tem_ausente].tolist()
```
```python name="eixo das linhas"
import numpy as np
import pandas as pd


def relatorio_ausentes(df):
    proporcoes = (df.isna()).mean()
    return {coluna: float(valor) for coluna, valor in proporcoes.items()}


def linhas_incompletas(df):
    tem_ausente = df.isna().any(axis=0)
    return df.index[tem_ausente].tolist()
```

## Passo 4 · Leitura · Remover ou imputar

Medido o problema, há duas saídas: remover o que falta ou preencher, o que se chama **imputar**.

`dropna` remove. Sem argumentos, apaga toda linha com **algum** ausente, e isso costuma derrubar linhas demais: numa pesquisa fictícia com 1 000 respostas e um campo opcional de telefone deixado em branco por 60 % das pessoas, `dropna()` joga fora 600 respostas completas no que importa. Os parâmetros dizem o que conta:

```python
pesquisa.dropna(subset=["nota"])    # só olha a coluna nota
pesquisa.dropna(how="all")          # só a linha toda vazia
pesquisa.dropna(thresh=3)           # fica quem tem pelo menos 3 valores preenchidos
```

`fillna` preenche: com uma constante (`fillna(0)`), com uma estatística da coluna (`fillna(s.median())`) ou com o vizinho, numa série no tempo. `ffill()` repete a última leitura válida, e `ffill(limit=2)` preenche no máximo dois buracos seguidos, para que um sensor desligado por uma semana não pareça estável. O `fillna(method="ffill")` de versões antigas não existe no pandas 3: dá `TypeError: NDFrame.fillna() got an unexpected keyword argument 'method'`.

Os dois devolvem um objeto **novo**. Com o Copy-on-Write do pandas 3, a forma encadeada com `inplace=True` não muda nada: o pandas avisa e a coluna continua com os buracos.

```python
df["renda"].fillna(0, inplace=True)
# ChainedAssignmentError: A value is being set on a copy of a DataFrame or Series
# through chained assignment using an inplace method.
df["renda"] = df["renda"].fillna(0)    # assim funciona
```

Preencher também apaga uma informação: depois do `fillna`, não dá para saber quais valores eram reais. Crie **antes** uma coluna indicadora, como `df["renda_ausente"] = df["renda"].isna()`, porque a própria falta pode ser um sinal: quem não informa a renda pode ser diferente de quem informa.

A média como preenchimento tem dois vieses. Ela encolhe a dispersão, porque todos os imputados caem no mesmo ponto, e numa coluna assimétrica, como renda, um punhado de valores altos a puxa para cima; a mediana resiste melhor. E a estatística deve vir só dos dados que você poderia conhecer: no Nível 5, ao separar treino e teste, calcular a média com a tabela inteira deixa informação do teste vazar para o treino.

## Passo 5 · Exercício · Imputar com marca

Escreva uma imputação que não apaga o rastro: a tabela devolvida diz quais valores foram preenchidos.

### Instruções
1. `imputar(df, coluna, estrategia)` devolve uma tabela **nova** em que os ausentes de `coluna` (e só dessa coluna) recebem a média dos valores presentes (`"media"`), a mediana (`"mediana"`) ou zero (`"zero"`).
2. A tabela devolvida ganha, depois das colunas originais, a coluna `<coluna>_ausente`, do tipo `bool`, com `True` nas linhas em que o valor faltava.
3. Qualquer outra estratégia levanta `ValueError` com o nome da estratégia na mensagem.
4. A tabela recebida não muda.

### Código inicial
```python
import numpy as np
import pandas as pd


def imputar(df, coluna, estrategia):
    pass
```

### Solução
```python
import numpy as np
import pandas as pd


def imputar(df, coluna, estrategia):
    if estrategia == "media":
        valor = df[coluna].mean()
    elif estrategia == "mediana":
        valor = df[coluna].median()
    elif estrategia == "zero":
        valor = 0
    else:
        raise ValueError(f"estratégia desconhecida: {estrategia}")
    nova = df.copy()
    nova[f"{coluna}_ausente"] = nova[coluna].isna()
    nova[coluna] = nova[coluna].fillna(valor)
    return nova
```

### Dicas
1. Escolha o valor de preenchimento primeiro, olhando só os valores presentes; as reduções do pandas já pulam os ausentes.
2. A marca precisa ser calculada antes do preenchimento: depois dele, não há mais ausentes para marcar.
3. `df.copy()` dá uma tabela independente; sem ela, `df[coluna] = ...` escreve na tabela de quem chamou.

### Verificação
```json
[
  { "id": "media", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'loja': ['L1', 'L2', 'L3', 'L4', 'L5'], 'renda': [1000.0, np.nan, 1500.0, np.nan, 5000.0]})\nr = imputar(d, 'renda', 'media')",
    "expr": "r['renda'].tolist()", "expected": [1000.0, 2500.0, 1500.0, 2500.0, 5000.0], "tolerance": 1e-9,
    "name": "Estratégia media", "hint": "A média é a dos valores presentes, sem contar os ausentes como zero." },
  { "id": "mediana", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'loja': ['L1', 'L2', 'L3', 'L4', 'L5'], 'renda': [1000.0, np.nan, 1500.0, np.nan, 5000.0]})\nr = imputar(d, 'renda', 'mediana')",
    "expr": "r['renda'].tolist()", "expected": [1000.0, 1500.0, 1500.0, 1500.0, 5000.0], "tolerance": 1e-9,
    "name": "Estratégia mediana" },
  { "id": "zero", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'loja': ['L1', 'L2', 'L3'], 'renda': [np.nan, 800.0, 1200.0]})\nr = imputar(d, 'renda', 'zero')",
    "expr": "r['renda'].tolist()", "expected": [0.0, 800.0, 1200.0], "tolerance": 1e-9, "name": "Estratégia zero" },
  { "id": "so-a-coluna", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'renda': [1000.0, np.nan, 3000.0], 'idade': [30.0, 41.0, np.nan]})\nr = imputar(d, 'renda', 'media')",
    "expr": "r['idade'].isna().tolist()", "expected": [false, false, true],
    "name": "As outras colunas continuam com os seus ausentes", "hint": "Preencha só a coluna pedida." },
  { "id": "marca", "checkpoint": 2, "kind": "expr",
    "setup": "d = pd.DataFrame({'loja': ['L1', 'L2', 'L3', 'L4', 'L5'], 'renda': [1000.0, np.nan, 1500.0, np.nan, 5000.0]})\nr = imputar(d, 'renda', 'media')",
    "expr": "r['renda_ausente'].tolist()", "expected": [false, true, false, true, false],
    "name": "A coluna renda_ausente marca os valores preenchidos", "hint": "Em que momento ainda dá para saber quais valores faltavam?" },
  { "id": "marca-bool", "checkpoint": 2, "kind": "expr",
    "setup": "d = pd.DataFrame({'renda': [1000.0, np.nan]})\nr = imputar(d, 'renda', 'zero')",
    "expr": "str(r['renda_ausente'].dtype)", "expected": "bool", "name": "A marca é do tipo bool" },
  { "id": "colunas", "checkpoint": 2, "kind": "expr",
    "setup": "d = pd.DataFrame({'loja': ['L1', 'L2'], 'renda': [1000.0, np.nan], 'cidade': ['Vila Nova', 'Lagoa Seca']})\nr = imputar(d, 'renda', 'zero')",
    "expr": "list(r.columns)", "expected": ["loja", "renda", "cidade", "renda_ausente"],
    "name": "A marca entra depois das colunas originais" },
  { "id": "sem-ausentes", "checkpoint": 2, "kind": "expr",
    "setup": "d = pd.DataFrame({'renda': [10.0, 20.0, 30.0]})\nr = imputar(d, 'renda', 'mediana')",
    "expr": "r.to_dict('list')", "expected": { "renda": [10.0, 20.0, 30.0], "renda_ausente": [false, false, false] },
    "tolerance": 1e-9, "name": "Coluna sem ausentes: valores iguais e marca toda False" },
  { "id": "estrategia-invalida", "checkpoint": 3, "kind": "expr",
    "setup": "d = pd.DataFrame({'renda': [1000.0, np.nan]})",
    "expr": "imputar(d, 'renda', 'moda')", "raises": "ValueError", "message_contains": "moda",
    "name": "Estratégia desconhecida levanta ValueError", "hint": "Não escolha um valor padrão em silêncio." },
  { "id": "entrada-valores", "checkpoint": 4, "kind": "expr",
    "setup": "d = pd.DataFrame({'renda': [1000.0, np.nan, 3000.0]})\nr = imputar(d, 'renda', 'media')",
    "expr": "d['renda'].isna().tolist()", "expected": [false, true, false], "name": "A tabela recebida continua com o ausente",
    "hint": "Trabalhe numa cópia." },
  { "id": "entrada-colunas", "checkpoint": 4, "kind": "expr",
    "setup": "d = pd.DataFrame({'renda': [1000.0, np.nan, 3000.0]})\nr = imputar(d, 'renda', 'media')",
    "expr": "list(d.columns)", "expected": ["renda"], "name": "A tabela recebida não ganha a coluna de marca" }
]
```

### Soluções erradas
```python name="marca depois de preencher"
import numpy as np
import pandas as pd


def imputar(df, coluna, estrategia):
    if estrategia == "media":
        valor = df[coluna].mean()
    elif estrategia == "mediana":
        valor = df[coluna].median()
    elif estrategia == "zero":
        valor = 0
    else:
        raise ValueError(f"estratégia desconhecida: {estrategia}")
    nova = df.copy()
    nova[coluna] = nova[coluna].fillna(valor)
    nova[f"{coluna}_ausente"] = nova[coluna].isna()
    return nova
```
```python name="média com os ausentes como zero"
import numpy as np
import pandas as pd


def imputar(df, coluna, estrategia):
    if estrategia == "media":
        valor = df[coluna].fillna(0).mean()
    elif estrategia == "mediana":
        valor = df[coluna].median()
    elif estrategia == "zero":
        valor = 0
    else:
        raise ValueError(f"estratégia desconhecida: {estrategia}")
    nova = df.copy()
    nova[f"{coluna}_ausente"] = nova[coluna].isna()
    nova[coluna] = nova[coluna].fillna(valor)
    return nova
```
```python name="inplace encadeado"
import numpy as np
import pandas as pd


def imputar(df, coluna, estrategia):
    if estrategia == "media":
        valor = df[coluna].mean()
    elif estrategia == "mediana":
        valor = df[coluna].median()
    elif estrategia == "zero":
        valor = 0
    else:
        raise ValueError(f"estratégia desconhecida: {estrategia}")
    nova = df.copy()
    nova[f"{coluna}_ausente"] = nova[coluna].isna()
    nova[coluna].fillna(valor, inplace=True)
    return nova
```
```python name="preenche a tabela inteira"
import numpy as np
import pandas as pd


def imputar(df, coluna, estrategia):
    if estrategia == "media":
        valor = df[coluna].mean()
    elif estrategia == "mediana":
        valor = df[coluna].median()
    elif estrategia == "zero":
        valor = 0
    else:
        raise ValueError(f"estratégia desconhecida: {estrategia}")
    nova = df.copy()
    nova[f"{coluna}_ausente"] = nova[coluna].isna()
    nova = nova.fillna(valor)
    return nova
```
```python name="altera a tabela recebida"
import numpy as np
import pandas as pd


def imputar(df, coluna, estrategia):
    if estrategia == "media":
        valor = df[coluna].mean()
    elif estrategia == "mediana":
        valor = df[coluna].median()
    elif estrategia == "zero":
        valor = 0
    else:
        raise ValueError(f"estratégia desconhecida: {estrategia}")
    nova = df
    nova[f"{coluna}_ausente"] = nova[coluna].isna()
    nova[coluna] = nova[coluna].fillna(valor)
    return nova
```
```python name="estratégia desconhecida vira zero"
import numpy as np
import pandas as pd


def imputar(df, coluna, estrategia):
    if estrategia == "media":
        valor = df[coluna].mean()
    elif estrategia == "mediana":
        valor = df[coluna].median()
    else:
        valor = 0
    nova = df.copy()
    nova[f"{coluna}_ausente"] = nova[coluna].isna()
    nova[coluna] = nova[coluna].fillna(valor)
    return nova
```
```python name="marca com 0 e 1"
import numpy as np
import pandas as pd


def imputar(df, coluna, estrategia):
    if estrategia == "media":
        valor = df[coluna].mean()
    elif estrategia == "mediana":
        valor = df[coluna].median()
    elif estrategia == "zero":
        valor = 0
    else:
        raise ValueError(f"estratégia desconhecida: {estrategia}")
    nova = df.copy()
    nova[f"{coluna}_ausente"] = nova[coluna].isna().astype(int)
    nova[coluna] = nova[coluna].fillna(valor)
    return nova
```

## Passo 6 · Exercício · Linhas vazias e leituras repetidas

Duas limpezas com limite: remover só as linhas que quase não têm dados e repetir a leitura de um sensor sem inventar uma semana inteira.

### Instruções
1. `remover_linhas_quase_vazias(df, minimo)` devolve as linhas com **pelo menos** `minimo` valores preenchidos, na ordem da tabela e com os rótulos originais do índice.
2. `preencher_leituras(serie, limite)` devolve uma Series nova em que cada ausente recebe a última leitura válida anterior, preenchendo no máximo `limite` ausentes seguidos; os ausentes do começo, sem leitura anterior, continuam ausentes.
3. Nenhuma das duas altera o que recebeu.

### Código inicial
```python
import numpy as np
import pandas as pd


def remover_linhas_quase_vazias(df, minimo):
    pass


def preencher_leituras(serie, limite):
    pass
```

### Solução
```python
import numpy as np
import pandas as pd


def remover_linhas_quase_vazias(df, minimo):
    return df.dropna(thresh=minimo)


def preencher_leituras(serie, limite):
    return serie.ffill(limit=limite)
```

### Dicas
1. Um dos parâmetros do `dropna` conta os valores preenchidos de cada linha, não os ausentes.
2. Preencher "para a frente" usa a leitura anterior; preencher "para trás" usaria a seguinte.
3. O limite vai como argumento do próprio método de preenchimento.

### Verificação
```json
[
  { "id": "remover", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'a': [1.0, np.nan, np.nan, 4.0, 5.0], 'b': [np.nan, np.nan, 3.0, 4.0, np.nan], 'c': [1.0, np.nan, 3.0, 4.0, np.nan]}, index=['s1', 's2', 's3', 's4', 's5'])",
    "expr": "remover_linhas_quase_vazias(d, 2).index.tolist()", "expected": ["s1", "s3", "s4"],
    "name": "Ficam as linhas com 2 ou mais valores", "hint": "Uma linha com exatamente 2 valores preenchidos fica." },
  { "id": "remover-completas", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'a': [1.0, np.nan, np.nan, 4.0, 5.0], 'b': [np.nan, np.nan, 3.0, 4.0, np.nan], 'c': [1.0, np.nan, 3.0, 4.0, np.nan]}, index=['s1', 's2', 's3', 's4', 's5'])",
    "expr": "remover_linhas_quase_vazias(d, 3).index.tolist()", "expected": ["s4"], "name": "minimo igual ao número de colunas: só linhas completas" },
  { "id": "remover-um", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'a': [1.0, np.nan, np.nan, 4.0, 5.0], 'b': [np.nan, np.nan, 3.0, 4.0, np.nan], 'c': [1.0, np.nan, 3.0, 4.0, np.nan]}, index=['s1', 's2', 's3', 's4', 's5'])",
    "expr": "remover_linhas_quase_vazias(d, 1).index.tolist()", "expected": ["s1", "s3", "s4", "s5"], "name": "minimo 1: sai só a linha toda vazia" },
  { "id": "remover-texto", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'nome': ['Ana', None, 'Caio', None], 'nota': [7.0, 8.0, np.nan, np.nan], 'faltas': [2.0, np.nan, 1.0, 3.0]}, index=[10, 20, 30, 40])",
    "expr": "remover_linhas_quase_vazias(d, 2).index.tolist()", "expected": [10, 30], "name": "Texto ausente também conta como ausente" },
  { "id": "remover-valores", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'a': [1.0, np.nan, 3.0], 'b': [np.nan, np.nan, 6.0]})",
    "expr": "remover_linhas_quase_vazias(d, 1).to_dict('list')", "expected": { "a": [1.0, 3.0], "b": [{ "$float": "nan" }, 6.0] },
    "name": "As linhas que ficam não são preenchidas nem alteradas" },
  { "id": "preencher", "checkpoint": 2, "kind": "expr",
    "setup": "s = pd.Series([20.0, np.nan, np.nan, np.nan, 23.0, np.nan])",
    "expr": "preencher_leituras(s, 2).tolist()", "expected": [20.0, 20.0, 20.0, { "$float": "nan" }, 23.0, 23.0],
    "name": "No máximo 2 ausentes seguidos são preenchidos", "hint": "O terceiro ausente seguido continua ausente." },
  { "id": "preencher-comeco", "checkpoint": 2, "kind": "expr",
    "setup": "s = pd.Series([np.nan, 21.0, np.nan, 19.5])",
    "expr": "preencher_leituras(s, 3).tolist()", "expected": [{ "$float": "nan" }, 21.0, 21.0, 19.5],
    "name": "O ausente do começo continua ausente", "hint": "A leitura usada é a anterior, nunca a seguinte." },
  { "id": "preencher-indice", "checkpoint": 2, "kind": "expr",
    "setup": "s = pd.Series([18.0, np.nan, 17.5], index=['06h', '07h', '08h'])",
    "expr": "preencher_leituras(s, 1).index.tolist()", "expected": ["06h", "07h", "08h"], "name": "O índice da série é mantido" },
  { "id": "preencher-tipo", "checkpoint": 2, "kind": "expr",
    "setup": "s = pd.Series([18.0, np.nan, 17.5])",
    "expr": "type(preencher_leituras(s, 1)).__name__", "expected": "Series", "name": "preencher_leituras devolve uma Series" },
  { "id": "entrada-tabela", "checkpoint": 3, "kind": "expr",
    "setup": "d = pd.DataFrame({'a': [1.0, np.nan], 'b': [2.0, np.nan]})\nr = remover_linhas_quase_vazias(d, 2)",
    "expr": "len(d)", "expected": 2, "name": "A tabela recebida mantém todas as linhas" },
  { "id": "entrada-serie", "checkpoint": 3, "kind": "expr",
    "setup": "s = pd.Series([20.0, np.nan, 22.0])\nr = preencher_leituras(s, 1)",
    "expr": "s.isna().tolist()", "expected": [false, true, false], "name": "A série recebida continua com o ausente",
    "hint": "Prefira o método que devolve uma série nova." }
]
```

### Soluções erradas
```python name="dropna sem parâmetro"
import numpy as np
import pandas as pd


def remover_linhas_quase_vazias(df, minimo):
    return df.dropna()


def preencher_leituras(serie, limite):
    return serie.ffill(limit=limite)
```
```python name="só linhas totalmente vazias"
import numpy as np
import pandas as pd


def remover_linhas_quase_vazias(df, minimo):
    return df.dropna(how="all")


def preencher_leituras(serie, limite):
    return serie.ffill(limit=limite)
```
```python name="conta os ausentes"
import numpy as np
import pandas as pd


def remover_linhas_quase_vazias(df, minimo):
    return df[df.isna().sum(axis=1) <= minimo]


def preencher_leituras(serie, limite):
    return serie.ffill(limit=limite)
```
```python name="exige mais que o mínimo"
import numpy as np
import pandas as pd


def remover_linhas_quase_vazias(df, minimo):
    return df[df.notna().sum(axis=1) > minimo]


def preencher_leituras(serie, limite):
    return serie.ffill(limit=limite)
```
```python name="perde os rótulos"
import numpy as np
import pandas as pd


def remover_linhas_quase_vazias(df, minimo):
    return df.dropna(thresh=minimo).reset_index(drop=True)


def preencher_leituras(serie, limite):
    return serie.ffill(limit=limite)
```
```python name="preenche sem limite"
import numpy as np
import pandas as pd


def remover_linhas_quase_vazias(df, minimo):
    return df.dropna(thresh=minimo)


def preencher_leituras(serie, limite):
    return serie.ffill()
```
```python name="usa a leitura seguinte"
import numpy as np
import pandas as pd


def remover_linhas_quase_vazias(df, minimo):
    return df.dropna(thresh=minimo)


def preencher_leituras(serie, limite):
    return serie.bfill(limit=limite)
```
```python name="fillna com method"
import numpy as np
import pandas as pd


def remover_linhas_quase_vazias(df, minimo):
    return df.dropna(thresh=minimo)


def preencher_leituras(serie, limite):
    return serie.fillna(method="ffill", limit=limite)
```
```python name="preenche no lugar"
import numpy as np
import pandas as pd


def remover_linhas_quase_vazias(df, minimo):
    return df.dropna(thresh=minimo)


def preencher_leituras(serie, limite):
    serie.ffill(limit=limite, inplace=True)
    return serie
```

## Passo 7 · Quiz · Ausentes na prática

### Pergunta
Numa tabela fictícia de clientes, `clientes["renda"].isna().sum()` dá 37. Para olhar essas linhas, uma colega escreveu:
```python
sem_renda = clientes[clientes["renda"] == np.nan]
print(len(sem_renda))
```
e o resultado foi 0. O que aconteceu?
- [ ] A coluna `renda` é de texto, e por isso a comparação com um número falha
- [x] `NaN` não é igual a nada, nem a ele mesmo: a comparação dá `False` em todas as linhas, e o certo é `clientes[clientes["renda"].isna()]`
- [ ] O pandas troca os `NaN` por zero ao comparar; o certo é `clientes["renda"] == 0`
- [ ] Faltou `is`: `clientes["renda"] is np.nan` seleciona as linhas certas
> Pela regra do ponto flutuante, `NaN == NaN` é `False`, então a máscara não tem nenhum `True` e a seleção sai vazia, sem erro. Uma coluna de texto daria o mesmo resultado, não um erro de tipo. O pandas não troca ausentes por zero, e `is` compara a Series inteira com o objeto `np.nan`, devolvendo um único `False`, não uma máscara.

### Pergunta
Uma pesquisa fictícia tem 1 000 respostas e as colunas `nota` (5 ausentes), `idade` (20 ausentes) e `telefone`, um campo opcional com 640 ausentes. Você quer a nota média. Depois de `pesquisa.dropna()`, sobraram 350 linhas. Qual é o problema e a correção?
- [ ] Nenhum: a média das 350 linhas completas é a mais confiável
- [ ] `dropna()` não removeu o suficiente; o certo é `pesquisa.dropna(how="all")`
- [x] O `dropna()` sem parâmetros derrubou 650 respostas, quase todas por causa do telefone, que não importa para a nota; `pesquisa.dropna(subset=["nota"])` ou simplesmente `pesquisa["nota"].mean()`, que já pula os ausentes
- [ ] O certo é `pesquisa.fillna(0)` antes da média, para não perder nenhuma linha
> Sem `subset`, o `dropna` exige todas as colunas preenchidas e jogou fora respostas com nota por causa de um campo opcional; se quem informa o telefone responde diferente, a média ainda fica enviesada. `how="all"` removeria ainda menos (só linhas totalmente vazias) e não é o que se quer. Preencher a nota com zero puxaria a média para baixo, como se os ausentes tivessem tirado zero.

### Pergunta
O faturamento mensal de cinco lojas fictícias foi 40, 42, 45, 47 e 400 mil reais, e outras duas lojas não informaram. Um analista preencheu as duas com a média, 114,8 mil. O que você recomenda?
- [ ] Manter a média: ela usa todos os valores disponíveis, então é a estimativa mais completa
- [ ] Preencher com zero, que é neutro e não altera o total
- [ ] Apagar a loja de 400 mil antes de calcular, porque ela é um erro de digitação
- [x] Preencher com a mediana (45 mil), que não é puxada pela loja de 400 mil, e criar antes uma coluna indicando quais lojas foram preenchidas
> Uma única loja muito grande arrasta a média para cima do que quase todas faturam, e as duas lojas imputadas parecem grandes. A mediana resiste a esse valor extremo, e a coluna indicadora permite conferir depois se as lojas que não informaram são diferentes. Zero não é neutro: diz que a loja não vendeu nada. E apagar um valor só porque é alto exige saber se ele é um erro, assunto da lição sobre outliers.
