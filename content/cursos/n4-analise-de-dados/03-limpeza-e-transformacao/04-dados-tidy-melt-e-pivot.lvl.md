---
slug: n4-m3-04-dados-tidy-melt-e-pivot
titulo: 'Dados tidy: melt, pivot e stack'
descricao: O princípio tidy (uma variável por coluna, uma observação por linha), converter tabelas largas em longas e vice-versa.
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
- Reconhecer tabelas largas e longas e explicar por que o formato longo facilita agregação e gráficos
- Converter entre os formatos com melt e pivot/pivot_table
- Separar e combinar colunas (split/expand, str.cat) para atingir o formato tidy
---

## Passo 1 · Leitura · Três regras e uma planilha larga

A gerente de uma rede fictícia de lojas mantém as vendas numa planilha com uma linha por loja e uma coluna por mês: `loja`, `jan`, `fev`, `mar`. Para ler na tela, é ótima. Para analisar, atrapalha: o total do trimestre por mês exige somar coluna por coluna, filtrar "só fevereiro" exige saber o nome da coluna, e quando abril chegar o código que listava os meses precisa mudar.

O problema é que o **mês**, que é uma variável, está espalhado pelos nomes das colunas. Uma tabela **tidy** ("arrumada") segue três regras:

1. cada variável é uma coluna;
2. cada observação é uma linha;
3. cada tipo de unidade observada fica numa tabela própria.

Aqui a observação é "as vendas de uma loja num mês", e as variáveis são loja, mês e vendas. A versão tidy é **longa**: três colunas e uma linha por par loja-mês. O `melt` faz a conversão, e o `pivot` faz o caminho de volta:

```mermaid
flowchart LR
    A["largo: loja, jan, fev, mar"] -->|melt| B["longo: loja, mes, vendas"]
    B -->|pivot| A
    B --> C["filtrar, agrupar, plotar"]
```

```python
longo = largo.melt(id_vars="loja", var_name="mes", value_name="vendas")
```

`id_vars` são as colunas que identificam a linha e se repetem; todas as outras viram pares nome-valor. `var_name` é o nome da coluna que recebe os antigos nomes de coluna, e `value_name` o da coluna dos valores; sem eles, o pandas usa `variable` e `value`. O `melt` empilha uma coluna de cada vez: primeiro todas as lojas em janeiro, depois todas em fevereiro. Se você quer as linhas de cada loja juntas, ordene depois, com `sort_values("loja", kind="stable")`, que preserva a ordem dos meses dentro de cada loja.

Esquecer o `id_vars` é um erro silencioso: a coluna `loja` também vira par nome-valor, e a chave se perde no meio dos dados, com linhas como `["loja", "L1"]` ao lado de `["jan", 120]`.

No formato longo, as perguntas viram operações simples: `longo[longo["mes"] == "fev"]` filtra um mês, um novo mês é só mais linhas, e as agregações do próximo módulo e os gráficos do módulo 5 esperam exatamente este formato. A planilha larga continua útil como **saída**, para uma pessoa ler; a análise trabalha com a longa.

## Passo 2 · Exercício · Para o formato longo
modo: lacunas

Complete as lacunas (`___`) para transformar uma planilha larga, com uma coluna por mês, no formato longo.

### Instruções
1. `para_longo(df_largo, id_col)` devolve uma tabela com as colunas `id_col`, `"mes"` e `"valor"`: uma linha para cada par (identificador, coluna de mês) da planilha.
2. As linhas vêm em ordem crescente de identificador e, dentro de cada identificador, na ordem das colunas da planilha.
3. O índice da tabela devolvida vai de 0 a n − 1.

### Código inicial
```python
import numpy as np
import pandas as pd


def para_longo(df_largo, id_col):
    longo = df_largo.melt(id_vars=___, var_name=___, value_name="valor")
    longo = longo.sort_values(___, kind="stable")
    return longo.reset_index(drop=___)
```

### Solução
```python
import numpy as np
import pandas as pd


def para_longo(df_largo, id_col):
    longo = df_largo.melt(id_vars=id_col, var_name="mes", value_name="valor")
    longo = longo.sort_values(id_col, kind="stable")
    return longo.reset_index(drop=True)
```

### Dicas
1. O identificador é a coluna que se repete em cada linha do formato longo.
2. Ordenar só pelo identificador, de forma estável, mantém a ordem em que o `melt` empilhou as colunas.
3. Sem `drop`, o índice antigo vira uma coluna a mais.

### Verificação
```json
[
  { "id": "colunas", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'loja': ['L1', 'L2'], 'jan': [120, 95], 'fev': [130, 90], 'mar': [125, 110]})",
    "expr": "list(para_longo(d, 'loja').columns)", "expected": ["loja", "mes", "valor"], "name": "Colunas loja, mes e valor",
    "hint": "Dê nome à coluna que recebe os nomes dos meses." },
  { "id": "linhas", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'loja': ['L1', 'L2', 'L3'], 'jan': [120, 95, 140], 'fev': [130, 90, 150]})",
    "expr": "len(para_longo(d, 'loja'))", "expected": 6, "name": "3 lojas e 2 meses dão 6 linhas" },
  { "id": "registros", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'loja': ['L1', 'L2'], 'jan': [120, 95], 'fev': [130, 90], 'mar': [125, 110]})",
    "expr": "para_longo(d, 'loja').to_dict('records')",
    "expected": [ { "loja": "L1", "mes": "jan", "valor": 120 }, { "loja": "L1", "mes": "fev", "valor": 130 }, { "loja": "L1", "mes": "mar", "valor": 125 },
                  { "loja": "L2", "mes": "jan", "valor": 95 }, { "loja": "L2", "mes": "fev", "valor": 90 }, { "loja": "L2", "mes": "mar", "valor": 110 } ],
    "name": "Uma linha por loja e mês, agrupadas por loja", "hint": "O melt empilha mês a mês; as linhas de cada loja precisam ficar juntas." },
  { "id": "ordem-meses", "checkpoint": 2, "kind": "expr",
    "setup": "d = pd.DataFrame({'loja': ['L1'], 'jan': [1], 'fev': [2], 'mar': [3], 'abr': [4]})",
    "expr": "para_longo(d, 'loja')['mes'].tolist()", "expected": ["jan", "fev", "mar", "abr"],
    "name": "Os meses seguem a ordem das colunas, não a alfabética", "hint": "Ordene só pelo identificador." },
  { "id": "ordem-ids", "checkpoint": 2, "kind": "expr",
    "setup": "d = pd.DataFrame({'loja': ['L3', 'L1', 'L2'], 'jan': [3, 1, 2], 'fev': [30, 10, 20]})",
    "expr": "para_longo(d, 'loja')['loja'].tolist()", "expected": ["L1", "L1", "L2", "L2", "L3", "L3"],
    "name": "Identificadores em ordem crescente" },
  { "id": "outro-id", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'estacao': ['E2', 'E1'], 'jan': [21.5, 25.0], 'jul': [14.0, 17.5]})",
    "expr": "para_longo(d, 'estacao').to_dict('list')",
    "expected": { "estacao": ["E1", "E1", "E2", "E2"], "mes": ["jan", "jul", "jan", "jul"], "valor": [25.0, 17.5, 21.5, 14.0] },
    "name": "Funciona com outro nome de identificador" },
  { "id": "indice", "checkpoint": 3, "kind": "expr",
    "setup": "d = pd.DataFrame({'loja': ['L2', 'L1'], 'jan': [95, 120], 'fev': [90, 130]})",
    "expr": "para_longo(d, 'loja').index.tolist()", "expected": [0, 1, 2, 3], "name": "Índice de 0 a n − 1" },
  { "id": "tipo-valor", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'loja': ['L1', 'L2'], 'jan': [120, 95], 'fev': [130, 90]})",
    "expr": "para_longo(d, 'loja').dtypes.astype(str).to_dict()", "expected": { "loja": "str", "mes": "str", "valor": "int64" },
    "name": "Os tipos das colunas" }
]
```

### Soluções erradas
```python name="sem id_vars"
import numpy as np
import pandas as pd


def para_longo(df_largo, id_col):
    longo = df_largo.melt(id_vars=None, var_name="mes", value_name="valor")
    longo = longo.sort_values(id_col, kind="stable")
    return longo.reset_index(drop=True)
```
```python name="nome padrão da coluna dos meses"
import numpy as np
import pandas as pd


def para_longo(df_largo, id_col):
    longo = df_largo.melt(id_vars=id_col, var_name=None, value_name="valor")
    longo = longo.sort_values(id_col, kind="stable")
    return longo.reset_index(drop=True)
```
```python name="ordena pelo mês"
import numpy as np
import pandas as pd


def para_longo(df_largo, id_col):
    longo = df_largo.melt(id_vars=id_col, var_name="mes", value_name="valor")
    longo = longo.sort_values("mes", kind="stable")
    return longo.reset_index(drop=True)
```
```python name="meses em ordem alfabética"
import numpy as np
import pandas as pd


def para_longo(df_largo, id_col):
    longo = df_largo.melt(id_vars=id_col, var_name="mes", value_name="valor")
    longo = longo.sort_values([id_col, "mes"], kind="stable")
    return longo.reset_index(drop=True)
```
```python name="índice antigo vira coluna"
import numpy as np
import pandas as pd


def para_longo(df_largo, id_col):
    longo = df_largo.melt(id_vars=id_col, var_name="mes", value_name="valor")
    longo = longo.sort_values(id_col, kind="stable")
    return longo.reset_index(drop=False)
```

## Passo 3 · Previsão · O que o melt fez

O programa transforma uma planilha de 3 lojas e 2 meses, uma vez com `id_vars` e outra sem. Leia sem executar e digite exatamente o que ele imprime.

### Código
```python
import pandas as pd

largo = pd.DataFrame({"loja": ["L1", "L2", "L3"], "jan": [120, 95, 140], "fev": [130, 90, 150]})
longo = largo.melt(id_vars="loja", var_name="mes", value_name="vendas")
print(longo.shape)
print(list(longo.columns))
print(longo.values.tolist()[:4])
print(longo["mes"].tolist())
print(longo.loc[longo["mes"] == "fev", "vendas"].sum())

sem_id = largo.melt()
print(sem_id.shape)
print(sem_id.values.tolist()[:2])
```

### Dicas
1. Cada célula de mês vira uma linha; a coluna `loja` se repete.
2. O `melt` empilha uma coluna inteira antes de passar para a próxima.
3. Sem `id_vars`, todas as colunas, inclusive `loja`, viram pares nome-valor com os nomes padrão `variable` e `value`.

### Saída esperada
```text
(6, 3)
['loja', 'mes', 'vendas']
[['L1', 'jan', 120], ['L2', 'jan', 95], ['L3', 'jan', 140], ['L1', 'fev', 130]]
['jan', 'jan', 'jan', 'fev', 'fev', 'fev']
370
(9, 2)
[['loja', 'L1'], ['loja', 'L2']]
```

## Passo 4 · Leitura · pivot e pivot_table

O caminho de volta, do longo para o largo, é o `pivot`: cada valor de uma coluna vira um nome de coluna.

```python
largo = longo.pivot(index="loja", columns="mes", values="vendas")
```

O resultado tem `loja` como **índice** e uma coluna por mês. Três detalhes costumam surpreender. Primeiro, as colunas saem em ordem **alfabética** (`fev`, `jan`, `mar`), porque o `pivot` ordena os rótulos; para manter a ordem original, selecione as colunas numa lista, como `largo[["jan", "fev", "mar"]]`, que você pode montar com `longo["mes"].unique()`. Segundo, a loja deixou de ser coluna: `reset_index()` a traz de volta. Terceiro, o conjunto de nomes de coluna ganha um nome, `mes`, que aparece no cabeçalho ao imprimir; `rename_axis(columns=None)` o tira. Uma combinação que não existe no longo vira `NaN`, e a coluna passa a `float64`.

O `pivot` exige que cada par (índice, coluna) apareça **uma vez só**. Se a loja L1 tem duas linhas de janeiro, ele não sabe qual valor pôr na célula e recusa:

```text
ValueError: Index contains duplicate entries, cannot reshape
```

A repetição pode ser um erro (uma importação duplicada, assunto da lição anterior) ou legítima: duas vendas da mesma loja no mesmo mês, registradas em linhas separadas. No segundo caso, a célula precisa de uma regra de agregação, e é isso que o `pivot_table` acrescenta:

```python
largo = longo.pivot_table(index="loja", columns="mes", values="vendas",
                          aggfunc="sum", fill_value=0)
```

O `aggfunc` diz como juntar as repetições. **O padrão é a média**, não a soma: com duas vendas de 100 e 140, a célula mostra 120, sem aviso nenhum, e o total do mês sai errado. Escreva sempre o `aggfunc`. O `fill_value` preenche as combinações que não existem; para vendas, zero faz sentido, porque a loja não vendeu; para temperatura, não faria.

A diferença, então: `pivot` só reorganiza e protesta diante de repetições; `pivot_table` agrega e nunca protesta, o que o torna cômodo e perigoso. Antes de trocar um `pivot` que falhou por um `pivot_table`, olhe as linhas repetidas com `duplicated(subset=["loja", "mes"], keep=False)` e decida se elas deviam existir.

## Passo 5 · Exercício · De volta ao largo

Faça o caminho de volta, com e sem repetições.

### Instruções
1. `para_largo(df_longo, id_col)` recebe uma tabela longa com as colunas `id_col`, `"mes"` e `"valor"`, com no máximo uma linha por par (identificador, mês), e devolve a tabela larga: a coluna `id_col` seguida de uma coluna por mês, na ordem em que os meses aparecem pela primeira vez na tabela longa. Combinação que falta vira `NaN`.
2. As linhas vêm em ordem crescente de identificador, e o índice vai de 0 a n − 1.
3. `para_largo_somando(df_longo, id_col)` faz o mesmo, mas aceita várias linhas por par e **soma** os valores; combinação que falta vale 0.

### Código inicial
```python
import numpy as np
import pandas as pd


def para_largo(df_longo, id_col):
    pass


def para_largo_somando(df_longo, id_col):
    pass
```

### Solução
```python
import numpy as np
import pandas as pd


def para_largo(df_longo, id_col):
    meses = df_longo["mes"].unique().tolist()
    largo = df_longo.pivot(index=id_col, columns="mes", values="valor")
    return largo[meses].reset_index().rename_axis(columns=None)


def para_largo_somando(df_longo, id_col):
    meses = df_longo["mes"].unique().tolist()
    largo = df_longo.pivot_table(index=id_col, columns="mes", values="valor", aggfunc="sum", fill_value=0)
    return largo[meses].reset_index().rename_axis(columns=None)
```

### Dicas
1. O `pivot` põe o identificador no índice; um método o devolve como coluna.
2. As colunas do `pivot` saem em ordem alfabética; a ordem pedida está em `df_longo["mes"]`.
3. O `pivot_table` tem uma agregação padrão que não é a soma.

### Verificação
```json
[
  { "id": "colunas", "checkpoint": 1, "kind": "expr",
    "setup": "lg = pd.DataFrame({'loja': ['L1', 'L1', 'L1', 'L2', 'L2', 'L2'], 'mes': ['jan', 'fev', 'mar', 'jan', 'fev', 'mar'], 'valor': [120, 130, 125, 95, 90, 110]})",
    "expr": "list(para_largo(lg, 'loja').columns)", "expected": ["loja", "jan", "fev", "mar"],
    "name": "Identificador e meses na ordem da tabela longa", "hint": "O pivot ordena os meses em ordem alfabética." },
  { "id": "valores", "checkpoint": 1, "kind": "expr",
    "setup": "lg = pd.DataFrame({'loja': ['L1', 'L1', 'L1', 'L2', 'L2', 'L2'], 'mes': ['jan', 'fev', 'mar', 'jan', 'fev', 'mar'], 'valor': [120, 130, 125, 95, 90, 110]})",
    "expr": "para_largo(lg, 'loja').to_dict('list')",
    "expected": { "loja": ["L1", "L2"], "jan": [120, 95], "fev": [130, 90], "mar": [125, 110] }, "name": "Valores da tabela larga" },
  { "id": "falta", "checkpoint": 1, "kind": "expr",
    "setup": "lg = pd.DataFrame({'loja': ['L1', 'L1', 'L2'], 'mes': ['jan', 'fev', 'jan'], 'valor': [120, 130, 95]})",
    "expr": "para_largo(lg, 'loja')['fev'].isna().tolist()", "expected": [false, true], "name": "Combinação que falta vira NaN" },
  { "id": "ida-e-volta", "checkpoint": 1, "kind": "expr",
    "setup": "w = pd.DataFrame({'estacao': ['E1', 'E2', 'E3'], 'jan': [25.0, 21.5, 28.0], 'jul': [17.5, 14.0, 20.5]})\nlg = w.melt(id_vars='estacao', var_name='mes', value_name='valor')",
    "expr": "para_largo(lg, 'estacao').to_dict('list') == w.to_dict('list')", "expected": true,
    "name": "melt seguido de para_largo devolve a planilha original" },
  { "id": "ordem-ids", "checkpoint": 2, "kind": "expr",
    "setup": "lg = pd.DataFrame({'loja': ['L3', 'L1', 'L2'], 'mes': ['jan', 'jan', 'jan'], 'valor': [3, 1, 2]})",
    "expr": "[para_largo(lg, 'loja')['loja'].tolist(), para_largo(lg, 'loja').index.tolist()]", "expected": [["L1", "L2", "L3"], [0, 1, 2]],
    "name": "Identificadores em ordem crescente e índice de 0 a n − 1" },
  { "id": "soma", "checkpoint": 3, "kind": "expr",
    "setup": "lg = pd.DataFrame({'loja': ['L1', 'L1', 'L1', 'L2'], 'mes': ['jan', 'jan', 'fev', 'jan'], 'valor': [100, 140, 130, 95]})",
    "expr": "para_largo_somando(lg, 'loja').to_dict('list')", "expected": { "loja": ["L1", "L2"], "jan": [240, 95], "fev": [130, 0] },
    "name": "Repetições somadas e combinação que falta vale 0", "hint": "Duas vendas de 100 e 140 no mesmo mês somam 240." },
  { "id": "soma-colunas", "checkpoint": 3, "kind": "expr",
    "setup": "lg = pd.DataFrame({'loja': ['L2', 'L1', 'L1'], 'mes': ['mar', 'jan', 'mar'], 'valor': [5, 7, 9]})",
    "expr": "list(para_largo_somando(lg, 'loja').columns)", "expected": ["loja", "mar", "jan"],
    "name": "Meses na ordem em que aparecem primeiro" },
  { "id": "soma-falta", "checkpoint": 3, "kind": "expr",
    "setup": "lg = pd.DataFrame({'loja': ['L1', 'L2'], 'mes': ['jan', 'fev'], 'valor': [10, 20]})",
    "expr": "para_largo_somando(lg, 'loja')[['jan', 'fev']].values.tolist()", "expected": [[10, 0], [0, 20]],
    "name": "Sem venda no mês, a célula vale 0" },
  { "id": "soma-sem-repeticao", "checkpoint": 3, "kind": "expr",
    "setup": "lg = pd.DataFrame({'loja': ['L1', 'L1', 'L2', 'L2'], 'mes': ['jan', 'fev', 'jan', 'fev'], 'valor': [120, 130, 95, 90]})",
    "expr": "para_largo_somando(lg, 'loja').to_dict('list')", "expected": { "loja": ["L1", "L2"], "jan": [120, 95], "fev": [130, 90] },
    "name": "Sem repetições, o resultado é a própria tabela larga" }
]
```

### Soluções erradas
```python name="meses em ordem alfabética"
import numpy as np
import pandas as pd


def para_largo(df_longo, id_col):
    largo = df_longo.pivot(index=id_col, columns="mes", values="valor")
    return largo.reset_index().rename_axis(columns=None)


def para_largo_somando(df_longo, id_col):
    meses = df_longo["mes"].unique().tolist()
    largo = df_longo.pivot_table(index=id_col, columns="mes", values="valor", aggfunc="sum", fill_value=0)
    return largo[meses].reset_index().rename_axis(columns=None)
```
```python name="identificador fica no índice"
import numpy as np
import pandas as pd


def para_largo(df_longo, id_col):
    meses = df_longo["mes"].unique().tolist()
    largo = df_longo.pivot(index=id_col, columns="mes", values="valor")
    return largo[meses].rename_axis(columns=None)


def para_largo_somando(df_longo, id_col):
    meses = df_longo["mes"].unique().tolist()
    largo = df_longo.pivot_table(index=id_col, columns="mes", values="valor", aggfunc="sum", fill_value=0)
    return largo[meses].reset_index().rename_axis(columns=None)
```
```python name="índice e colunas trocados"
import numpy as np
import pandas as pd


def para_largo(df_longo, id_col):
    largo = df_longo.pivot(index="mes", columns=id_col, values="valor")
    return largo.reset_index().rename_axis(columns=None)


def para_largo_somando(df_longo, id_col):
    meses = df_longo["mes"].unique().tolist()
    largo = df_longo.pivot_table(index=id_col, columns="mes", values="valor", aggfunc="sum", fill_value=0)
    return largo[meses].reset_index().rename_axis(columns=None)
```
```python name="pivot com repetições"
import numpy as np
import pandas as pd


def para_largo(df_longo, id_col):
    meses = df_longo["mes"].unique().tolist()
    largo = df_longo.pivot(index=id_col, columns="mes", values="valor")
    return largo[meses].reset_index().rename_axis(columns=None)


def para_largo_somando(df_longo, id_col):
    meses = df_longo["mes"].unique().tolist()
    largo = df_longo.pivot(index=id_col, columns="mes", values="valor").fillna(0)
    return largo[meses].reset_index().rename_axis(columns=None)
```
```python name="agregação padrão"
import numpy as np
import pandas as pd


def para_largo(df_longo, id_col):
    meses = df_longo["mes"].unique().tolist()
    largo = df_longo.pivot(index=id_col, columns="mes", values="valor")
    return largo[meses].reset_index().rename_axis(columns=None)


def para_largo_somando(df_longo, id_col):
    meses = df_longo["mes"].unique().tolist()
    largo = df_longo.pivot_table(index=id_col, columns="mes", values="valor", fill_value=0)
    return largo[meses].reset_index().rename_axis(columns=None)
```
```python name="conta em vez de somar"
import numpy as np
import pandas as pd


def para_largo(df_longo, id_col):
    meses = df_longo["mes"].unique().tolist()
    largo = df_longo.pivot(index=id_col, columns="mes", values="valor")
    return largo[meses].reset_index().rename_axis(columns=None)


def para_largo_somando(df_longo, id_col):
    meses = df_longo["mes"].unique().tolist()
    largo = df_longo.pivot_table(index=id_col, columns="mes", values="valor", aggfunc="count", fill_value=0)
    return largo[meses].reset_index().rename_axis(columns=None)
```
```python name="falta fica NaN na soma"
import numpy as np
import pandas as pd


def para_largo(df_longo, id_col):
    meses = df_longo["mes"].unique().tolist()
    largo = df_longo.pivot(index=id_col, columns="mes", values="valor")
    return largo[meses].reset_index().rename_axis(columns=None)


def para_largo_somando(df_longo, id_col):
    meses = df_longo["mes"].unique().tolist()
    largo = df_longo.pivot_table(index=id_col, columns="mes", values="valor", aggfunc="sum")
    return largo[meses].reset_index().rename_axis(columns=None)
```

## Passo 6 · Leitura · Separar e juntar colunas

Às vezes o defeito não é a largura da tabela, mas uma coluna que guarda **duas variáveis**. Num controle fictício de turmas, a coluna `periodo` traz `"2024-1"`: ano e semestre colados. Para filtrar "todas as turmas de 2024" ou comparar primeiros semestres, as duas partes precisam virar colunas.

```python
partes = turmas["periodo"].str.split("-", expand=True)
# colunas 0 e 1, as duas de texto: '2024' e '1'
turmas["ano"] = pd.to_numeric(partes[0])
turmas["semestre"] = pd.to_numeric(partes[1])
```

Com `expand=True`, o `split` devolve uma tabela com uma coluna por pedaço. Sem ele, devolve uma Series de **listas**, e `partes[0]` passa a ser a lista da primeira linha (`['2024', '1']`), não a primeira coluna: o erro aparece mais adiante, longe da causa. Os pedaços continuam texto até a conversão; `astype(int)` também converte, mas no executor da plataforma o inteiro padrão tem 32 bits, como você viu na lição de arrays, enquanto `pd.to_numeric` devolve `int64`.

O caminho inverso, juntar colunas, é o `str.cat`, ou o `+` entre colunas de texto: `turmas["ano"].astype(str).str.cat(turmas["semestre"].astype(str), sep="-")` refaz o período.

Uma planilha de notas mostra os dois defeitos juntos: colunas `p1`, `p2`, `p3`, em que o nome da coluna é o valor da variável "prova", e notas digitadas como texto, com vírgula decimal e `"-"` para quem faltou. O `melt` resolve a largura, mas a coluna de notas que sai dele é **texto**, porque as colunas de origem eram texto. E as duas armadilhas da lição de tipos voltam: `astype(float)` para em `ValueError: could not convert string to float: '7,5'`, e `pd.to_numeric(..., errors="coerce")` sem trocar a vírgula transforma toda nota com vírgula em `NaN`, em silêncio. Troque a vírgula primeiro e use o `coerce` só para os `"-"`.

Dois nomes para reconhecer. `stack` empilha as colunas de uma tabela no índice, como um `melt` que guarda o resultado no índice, e `unstack` faz o inverso, como um `pivot`. Um índice com mais de um nível, como (loja, mês), é um `MultiIndex`; ele aparece quando você agrupa ou pivoteia por duas colunas, e `reset_index()` o transforma de volta em colunas comuns, o formato com que as próximas lições trabalham.

## Passo 7 · Exercício · Ano, semestre e notas

Arrume as duas planilhas da leitura.

### Instruções
1. `separar_ano_semestre(df)` recebe uma tabela com a coluna `periodo` no formato `"AAAA-S"` e devolve uma tabela **nova** sem `periodo` e com duas colunas inteiras no fim, `ano` e `semestre`.
2. `tidy_notas(df)` recebe uma tabela com a coluna `aluno` e uma coluna de texto por prova (`p1`, `p2`…), com vírgula decimal e `"-"` para ausência, e devolve a tabela longa com as colunas `aluno`, `prova` e `nota`.
3. Em `tidy_notas`, `nota` é `float64`, com `NaN` onde havia `"-"`; as linhas vêm em ordem crescente de aluno e, dentro de cada aluno, na ordem das provas, com índice de 0 a n − 1.
4. A tabela recebida não muda.

### Código inicial
```python
import numpy as np
import pandas as pd


def separar_ano_semestre(df):
    pass


def tidy_notas(df):
    pass
```

### Solução
```python
import numpy as np
import pandas as pd


def separar_ano_semestre(df):
    partes = df["periodo"].str.split("-", expand=True)
    nova = df.drop(columns="periodo")
    nova["ano"] = pd.to_numeric(partes[0])
    nova["semestre"] = pd.to_numeric(partes[1])
    return nova


def tidy_notas(df):
    longo = df.melt(id_vars="aluno", var_name="prova", value_name="nota")
    texto = longo["nota"].str.replace(",", ".", regex=False)
    longo["nota"] = pd.to_numeric(texto, errors="coerce")
    return longo.sort_values("aluno", kind="stable").reset_index(drop=True)
```

### Dicas
1. `drop(columns=...)` devolve uma tabela nova sem a coluna; o `split` precisa de `expand=True` para dar colunas.
2. Depois do `melt`, a coluna de notas ainda é texto.
3. A vírgula precisa virar ponto antes da conversão; o `coerce` cuida dos `"-"`.

### Verificação
```json
[
  { "id": "ano-semestre", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'turma': ['T1', 'T2', 'T3'], 'periodo': ['2024-1', '2024-2', '2025-1'], 'matriculados': [40, 35, 42]})\nr = separar_ano_semestre(d)",
    "expr": "[r['ano'].tolist(), r['semestre'].tolist()]", "expected": [[2024, 2024, 2025], [1, 2, 1]], "name": "Ano e semestre separados" },
  { "id": "colunas-periodo", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'turma': ['T1', 'T2', 'T3'], 'periodo': ['2024-1', '2024-2', '2025-1'], 'matriculados': [40, 35, 42]})\nr = separar_ano_semestre(d)",
    "expr": "list(r.columns)", "expected": ["turma", "matriculados", "ano", "semestre"], "name": "periodo sai; ano e semestre entram no fim",
    "hint": "A coluna periodo não fica na tabela devolvida." },
  { "id": "inteiros", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'turma': ['T1', 'T2'], 'periodo': ['2024-1', '2025-2']})\nr = separar_ano_semestre(d)",
    "expr": "[r['ano'].dtype.kind, r['semestre'].dtype.kind]", "expected": ["i", "i"], "name": "ano e semestre são inteiros",
    "hint": "Os pedaços do split continuam texto." },
  { "id": "entrada-periodo", "checkpoint": 4, "kind": "expr",
    "setup": "d = pd.DataFrame({'turma': ['T1'], 'periodo': ['2024-1']})\nr = separar_ano_semestre(d)",
    "expr": "list(d.columns)", "expected": ["turma", "periodo"], "name": "A tabela recebida continua com periodo" },
  { "id": "notas-colunas", "checkpoint": 2, "kind": "expr",
    "setup": "d = pd.DataFrame({'aluno': ['A2', 'A1'], 'p1': ['7,5', '-'], 'p2': ['8,0', '6,5'], 'p3': ['-', '9,25']})\nr = tidy_notas(d)",
    "expr": "list(r.columns)", "expected": ["aluno", "prova", "nota"], "name": "Colunas aluno, prova e nota" },
  { "id": "notas-valores", "checkpoint": 3, "kind": "expr",
    "setup": "d = pd.DataFrame({'aluno': ['A2', 'A1'], 'p1': ['7,5', '-'], 'p2': ['8,0', '6,5'], 'p3': ['-', '9,25']})\nr = tidy_notas(d)",
    "expr": "r['nota'].fillna(-1).tolist()", "expected": [-1, 6.5, 9.25, 7.5, 8.0, -1], "tolerance": 1e-9,
    "name": "Notas com vírgula convertidas, por aluno e prova", "hint": "Uma nota com vírgula não pode virar NaN." },
  { "id": "notas-ausentes", "checkpoint": 3, "kind": "expr",
    "setup": "d = pd.DataFrame({'aluno': ['A2', 'A1'], 'p1': ['7,5', '-'], 'p2': ['8,0', '6,5'], 'p3': ['-', '9,25']})\nr = tidy_notas(d)",
    "expr": "r['nota'].isna().tolist()", "expected": [true, false, false, false, false, true], "name": "O traço vira NaN" },
  { "id": "notas-ordem", "checkpoint": 3, "kind": "expr",
    "setup": "d = pd.DataFrame({'aluno': ['A2', 'A1'], 'p1': ['7,5', '-'], 'p2': ['8,0', '6,5'], 'p3': ['-', '9,25']})\nr = tidy_notas(d)",
    "expr": "[r['aluno'].tolist(), r['prova'].tolist(), r.index.tolist()]",
    "expected": [["A1", "A1", "A1", "A2", "A2", "A2"], ["p1", "p2", "p3", "p1", "p2", "p3"], [0, 1, 2, 3, 4, 5]],
    "name": "Por aluno e, dentro dele, na ordem das provas" },
  { "id": "notas-tipo", "checkpoint": 3, "kind": "expr",
    "setup": "d = pd.DataFrame({'aluno': ['A1'], 'p1': ['10,0'], 'p2': ['5']})\nr = tidy_notas(d)",
    "expr": "str(r['nota'].dtype)", "expected": "float64", "name": "nota é float64" },
  { "id": "entrada-notas", "checkpoint": 4, "kind": "expr",
    "setup": "d = pd.DataFrame({'aluno': ['A1'], 'p1': ['7,5'], 'p2': ['-']})\nr = tidy_notas(d)",
    "expr": "[list(d.columns), d['p1'].tolist()]", "expected": [["aluno", "p1", "p2"], ["7,5"]], "name": "A planilha de notas recebida não muda" }
]
```

### Soluções erradas
```python name="split sem expand"
import numpy as np
import pandas as pd


def separar_ano_semestre(df):
    partes = df["periodo"].str.split("-")
    nova = df.drop(columns="periodo")
    nova["ano"] = pd.to_numeric(partes[0])
    nova["semestre"] = pd.to_numeric(partes[1])
    return nova


def tidy_notas(df):
    longo = df.melt(id_vars="aluno", var_name="prova", value_name="nota")
    texto = longo["nota"].str.replace(",", ".", regex=False)
    longo["nota"] = pd.to_numeric(texto, errors="coerce")
    return longo.sort_values("aluno", kind="stable").reset_index(drop=True)
```
```python name="ano e semestre como texto"
import numpy as np
import pandas as pd


def separar_ano_semestre(df):
    partes = df["periodo"].str.split("-", expand=True)
    nova = df.drop(columns="periodo")
    nova["ano"] = partes[0]
    nova["semestre"] = partes[1]
    return nova


def tidy_notas(df):
    longo = df.melt(id_vars="aluno", var_name="prova", value_name="nota")
    texto = longo["nota"].str.replace(",", ".", regex=False)
    longo["nota"] = pd.to_numeric(texto, errors="coerce")
    return longo.sort_values("aluno", kind="stable").reset_index(drop=True)
```
```python name="mantém periodo"
import numpy as np
import pandas as pd


def separar_ano_semestre(df):
    partes = df["periodo"].str.split("-", expand=True)
    nova = df.copy()
    nova["ano"] = pd.to_numeric(partes[0])
    nova["semestre"] = pd.to_numeric(partes[1])
    return nova


def tidy_notas(df):
    longo = df.melt(id_vars="aluno", var_name="prova", value_name="nota")
    texto = longo["nota"].str.replace(",", ".", regex=False)
    longo["nota"] = pd.to_numeric(texto, errors="coerce")
    return longo.sort_values("aluno", kind="stable").reset_index(drop=True)
```
```python name="coerce sem trocar a vírgula"
import numpy as np
import pandas as pd


def separar_ano_semestre(df):
    partes = df["periodo"].str.split("-", expand=True)
    nova = df.drop(columns="periodo")
    nova["ano"] = pd.to_numeric(partes[0])
    nova["semestre"] = pd.to_numeric(partes[1])
    return nova


def tidy_notas(df):
    longo = df.melt(id_vars="aluno", var_name="prova", value_name="nota")
    longo["nota"] = pd.to_numeric(longo["nota"], errors="coerce")
    return longo.sort_values("aluno", kind="stable").reset_index(drop=True)
```
```python name="astype(float) nas notas"
import numpy as np
import pandas as pd


def separar_ano_semestre(df):
    partes = df["periodo"].str.split("-", expand=True)
    nova = df.drop(columns="periodo")
    nova["ano"] = pd.to_numeric(partes[0])
    nova["semestre"] = pd.to_numeric(partes[1])
    return nova


def tidy_notas(df):
    longo = df.melt(id_vars="aluno", var_name="prova", value_name="nota")
    longo["nota"] = longo["nota"].str.replace(",", ".", regex=False).astype(float)
    return longo.sort_values("aluno", kind="stable").reset_index(drop=True)
```
```python name="notas continuam texto"
import numpy as np
import pandas as pd


def separar_ano_semestre(df):
    partes = df["periodo"].str.split("-", expand=True)
    nova = df.drop(columns="periodo")
    nova["ano"] = pd.to_numeric(partes[0])
    nova["semestre"] = pd.to_numeric(partes[1])
    return nova


def tidy_notas(df):
    longo = df.melt(id_vars="aluno", var_name="prova", value_name="nota")
    longo["nota"] = longo["nota"].str.replace(",", ".", regex=False)
    return longo.sort_values("aluno", kind="stable").reset_index(drop=True)
```
```python name="ordem do melt"
import numpy as np
import pandas as pd


def separar_ano_semestre(df):
    partes = df["periodo"].str.split("-", expand=True)
    nova = df.drop(columns="periodo")
    nova["ano"] = pd.to_numeric(partes[0])
    nova["semestre"] = pd.to_numeric(partes[1])
    return nova


def tidy_notas(df):
    longo = df.melt(id_vars="aluno", var_name="prova", value_name="nota")
    texto = longo["nota"].str.replace(",", ".", regex=False)
    longo["nota"] = pd.to_numeric(texto, errors="coerce")
    return longo
```

## Passo 8 · Quiz · Largo ou longo

### Pergunta
A planilha fictícia de uma rede de lojas tem uma linha por loja e as colunas `loja`, `jan`, `fev` e `mar`. Todo mês alguém acrescenta uma coluna, e o código da análise lista os meses à mão em cinco lugares. O que resolve o problema na raiz?
- [ ] Guardar os nomes dos meses numa lista global e reaproveitá-la nos cinco lugares
- [x] Converter a planilha para o formato longo, com as colunas `loja`, `mes` e `vendas`; um mês novo passa a ser só linhas novas, e filtros e somas por mês não dependem de nomes de coluna
- [ ] Converter os meses para números (1, 2, 3) nos nomes das colunas
- [ ] Usar `pivot_table` em vez de `pivot` para montar a planilha
> O mês é uma variável, e no formato largo ele está nos nomes das colunas; por isso todo código que trata meses precisa saber esses nomes. No formato longo, o mês é um valor numa coluna, e `longo[longo["mes"] == "abr"]` funciona sem mudar nada. Uma lista global só centraliza o problema, e trocar os nomes por números não muda o formato. O `pivot_table` vai na direção contrária, do longo para o largo.

### Pergunta
Ao montar a planilha larga de vendas, `longo.pivot(index="loja", columns="mes", values="vendas")` deu `ValueError: Index contains duplicate entries, cannot reshape`. Um colega trocou por `longo.pivot_table(index="loja", columns="mes", values="vendas")` e o erro sumiu. O que você confere?
- [ ] Nada: o `pivot_table` é a versão corrigida do `pivot`
- [ ] Se o `fill_value` foi passado, porque é ele que resolve as repetições
- [x] Por que há mais de uma linha por loja e mês: se forem importações duplicadas, remova-as; se forem vendas separadas, use `aggfunc="sum"`, porque o padrão do `pivot_table` é a média, e o total do mês sairia errado
- [ ] Se a coluna `mes` está em ordem alfabética, porque o `pivot` exige meses ordenados
> O erro do `pivot` avisava que havia repetições; o `pivot_table` sem `aggfunc` tira a média delas sem dizer nada. Antes de agregar, olhe as linhas repetidas com `duplicated(subset=["loja", "mes"], keep=False)` e decida se elas deviam existir. O `fill_value` só preenche combinações que faltam, e o `pivot` não exige nenhuma ordem.

### Pergunta
Depois de `notas.melt(id_vars="aluno", var_name="prova", value_name="nota")` numa planilha fictícia com notas como `"7,5"` e `"-"`, alguém rodou `pd.to_numeric(longo["nota"], errors="coerce")`. A média da turma saiu 8,0, mas as notas da planilha passam de 6 a 10, quase todas quebradas. O que aconteceu?
- [ ] O `melt` misturou as notas de alunos diferentes
- [ ] O `coerce` arredondou as notas para baixo
- [ ] O `to_numeric` não lê números depois de um `melt`; era preciso converter antes
- [x] Toda nota com vírgula virou `NaN` em silêncio, e a média ficou só com as notas inteiras, como `"8"` e `"10"`; era preciso trocar a vírgula por ponto antes da conversão
> O `float` só entende ponto decimal, e o `coerce` transforma em `NaN` o que não entende, sem erro. A média que sobrou é a das poucas notas sem vírgula. Contar os ausentes antes e depois da conversão teria mostrado o problema. O `melt` não mistura alunos, o `coerce` não arredonda, e o `to_numeric` funciona igual antes ou depois do `melt`.
