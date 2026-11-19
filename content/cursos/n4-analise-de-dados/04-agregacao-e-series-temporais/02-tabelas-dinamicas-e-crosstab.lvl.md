---
slug: n4-m4-02-tabelas-dinamicas-e-crosstab
titulo: Tabelas dinâmicas e tabelas de contingência
descricao: pivot_table com aggfunc, margins e fill_value, crosstab com normalização e a leitura de tabelas de dupla entrada.
dificuldade: intermediario
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- pandas
xp: 100
tempo_min: 40
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Construir tabelas dinâmicas com linhas, colunas, valores e totais
- Produzir tabelas de contingência com proporções por linha ou coluna
- Ler uma tabela de dupla entrada e extrair comparações corretas (evitando o paradoxo de Simpson)
---

## Passo 1 · Leitura · Tabela dinâmica

O relatório mensal de uma rede fictícia de lojas é uma tabela de dupla entrada: um mês por linha, uma região por coluna, o total vendido em cada célula e os totais na margem. Na lição de dados tidy você usou o `pivot_table` para voltar do formato longo ao largo; aqui ele vira a ferramenta de relatório.

```python
relatorio = vendas.pivot_table(
    index="mes", columns="regiao", values="valor",
    aggfunc="sum", fill_value=0, margins=True, margins_name="Total",
)
```

```text
regiao   Norte  Sul  Total
mes
2025-01     50  120    170
2025-02      0  100    100
2025-03     40    0     40
Total       90  220    310
```

Cada parâmetro tem um papel. `index` dá as linhas, `columns` dá as colunas, `values` diz o que vai nas células e `aggfunc` diz como juntar as várias vendas que caem na mesma célula. `fill_value=0` preenche as combinações sem nenhuma venda: o Norte não vendeu em fevereiro, e sem ele a célula seria `NaN`. `margins=True` acrescenta a linha e a coluna de totais, com o nome dado por `margins_name` (o padrão é `"All"`).

O `aggfunc` padrão é a **média**, e isso engana de dois jeitos. Primeiro, a célula de janeiro no Sul mostraria 60, a média de duas vendas, num relatório que todo mundo lê como total. Segundo, a margem segue o mesmo `aggfunc`: com a média, a coluna `Total` é a média de todas as vendas do mês, não a soma das regiões. Escreva sempre o `aggfunc`.

A média também esconde **quantas** observações existem em cada célula. Um produto com nota média 9,5 em duas avaliações não é melhor que outro com 8,7 em trezentas. Peça as duas coisas de uma vez, com `aggfunc=["mean", "count"]`: as colunas viram pares como `("mean", "nota")` e `("count", "nota")`, e você lê a média ao lado do tamanho da amostra.

Sem `values`, o `pivot_table` tenta agregar todas as outras colunas, e uma coluna de texto interrompe tudo:

```text
TypeError: dtype 'str' does not support operation 'mean'
```

O resultado tem `mes` no índice e o nome `regiao` no conjunto de colunas. Para ler uma célula, use `relatorio.loc["2025-02", "Norte"]`; para exportar, `reset_index()` e `rename_axis(columns=None)`, como na lição de dados tidy.

## Passo 2 · Exercício · Vendas por mês e região
modo: lacunas

A tabela de vendas tem as colunas `mes` (texto no formato `"AAAA-MM"`), `regiao` e `valor`. Complete as lacunas (`___`) para montar o relatório do passo anterior.

### Instruções
1. `vendas_mes_por_regiao(df)` devolve uma tabela com um mês por linha e uma região por coluna, em ordem crescente, e em cada célula a **soma** dos valores daquele mês naquela região.
2. Combinação de mês e região sem venda vale 0.
3. A última linha e a última coluna se chamam `"Total"` e trazem os totais de cada coluna e de cada linha; a célula do canto é o total geral.

### Código inicial
```python
import numpy as np
import pandas as pd


def vendas_mes_por_regiao(df):
    return df.pivot_table(
        index=___,
        columns=___,
        values="valor",
        aggfunc=___,
        fill_value=___,
        margins=___,
        margins_name="Total",
    )
```

### Solução
```python
import numpy as np
import pandas as pd


def vendas_mes_por_regiao(df):
    return df.pivot_table(
        index="mes",
        columns="regiao",
        values="valor",
        aggfunc="sum",
        fill_value=0,
        margins=True,
        margins_name="Total",
    )
```

### Dicas
1. Os meses são as linhas e as regiões, as colunas.
2. Sem `aggfunc`, cada célula mostra a média das vendas, não o total.
3. Sem `fill_value`, a célula de uma combinação sem venda fica `NaN`.

### Verificação
```json
[
  { "id": "linhas", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'mes': ['2025-01', '2025-01', '2025-02', '2025-02', '2025-01', '2025-03'], 'regiao': ['Sul', 'Norte', 'Sul', 'Sul', 'Sul', 'Norte'], 'valor': [100, 50, 70, 30, 20, 40]})",
    "expr": "vendas_mes_por_regiao(d).index.tolist()", "expected": ["2025-01", "2025-02", "2025-03", "Total"],
    "name": "Um mês por linha, mais a linha Total", "hint": "Os meses vão no índice." },
  { "id": "colunas", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'mes': ['2025-01', '2025-01', '2025-02', '2025-02', '2025-01', '2025-03'], 'regiao': ['Sul', 'Norte', 'Sul', 'Sul', 'Sul', 'Norte'], 'valor': [100, 50, 70, 30, 20, 40]})",
    "expr": "list(vendas_mes_por_regiao(d).columns)", "expected": ["Norte", "Sul", "Total"],
    "name": "Uma região por coluna, mais a coluna Total" },
  { "id": "soma", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'mes': ['2025-01', '2025-01', '2025-02', '2025-02', '2025-01', '2025-03'], 'regiao': ['Sul', 'Norte', 'Sul', 'Sul', 'Sul', 'Norte'], 'valor': [100, 50, 70, 30, 20, 40]})",
    "expr": "float(vendas_mes_por_regiao(d).loc['2025-01', 'Sul'])", "expected": 120.0,
    "name": "Duas vendas do Sul em janeiro (100 e 20) somam 120", "hint": "A célula é o total do mês, não a média nem a contagem." },
  { "id": "celulas", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'mes': ['2025-01', '2025-01', '2025-02', '2025-02', '2025-01', '2025-03'], 'regiao': ['Sul', 'Norte', 'Sul', 'Sul', 'Sul', 'Norte'], 'valor': [100, 50, 70, 30, 20, 40]})",
    "expr": "vendas_mes_por_regiao(d).loc[['2025-01', '2025-02', '2025-03'], ['Norte', 'Sul']].values.tolist()",
    "expected": [[50, 120], [0, 100], [40, 0]], "name": "Todas as células de mês e região" },
  { "id": "sem-venda", "checkpoint": 2, "kind": "expr",
    "setup": "d = pd.DataFrame({'mes': ['2025-01', '2025-01', '2025-02', '2025-02', '2025-01', '2025-03'], 'regiao': ['Sul', 'Norte', 'Sul', 'Sul', 'Sul', 'Norte'], 'valor': [100, 50, 70, 30, 20, 40]})",
    "expr": "int(vendas_mes_por_regiao(d).isna().sum().sum())", "expected": 0,
    "name": "Nenhuma célula fica NaN", "hint": "O Norte não vendeu em fevereiro: essa célula vale 0." },
  { "id": "total-linha", "checkpoint": 3, "kind": "expr",
    "setup": "d = pd.DataFrame({'mes': ['2025-01', '2025-01', '2025-02', '2025-02', '2025-01', '2025-03'], 'regiao': ['Sul', 'Norte', 'Sul', 'Sul', 'Sul', 'Norte'], 'valor': [100, 50, 70, 30, 20, 40]})",
    "expr": "vendas_mes_por_regiao(d).loc['Total'].tolist()", "expected": [90, 220, 310],
    "name": "Linha Total: total de cada região e o total geral" },
  { "id": "total-coluna", "checkpoint": 3, "kind": "expr",
    "setup": "d = pd.DataFrame({'mes': ['2025-01', '2025-01', '2025-02', '2025-02', '2025-01', '2025-03'], 'regiao': ['Sul', 'Norte', 'Sul', 'Sul', 'Sul', 'Norte'], 'valor': [100, 50, 70, 30, 20, 40]})",
    "expr": "vendas_mes_por_regiao(d)['Total'].tolist()", "expected": [170, 100, 40, 310],
    "name": "Coluna Total: total de cada mês e o total geral" },
  { "id": "uma-regiao", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'mes': ['2025-05', '2025-04', '2025-05'], 'regiao': ['Leste', 'Leste', 'Leste'], 'valor': [10, 7, 5]})",
    "expr": "vendas_mes_por_regiao(d).to_dict()", "expected": { "Leste": { "2025-04": 7, "2025-05": 15, "Total": 22 }, "Total": { "2025-04": 7, "2025-05": 15, "Total": 22 } },
    "name": "Uma região só, com os meses em ordem crescente" },
  { "id": "total-geral", "checkpoint": 3, "kind": "expr",
    "setup": "rng = np.random.default_rng(5)\nd = pd.DataFrame({'mes': rng.choice(['2025-01', '2025-02', '2025-03', '2025-04'], 300), 'regiao': rng.choice(['Norte', 'Sul', 'Leste', 'Oeste'], 300), 'valor': rng.integers(1, 500, 300)})\nr = vendas_mes_por_regiao(d)",
    "expr": "int(r.loc['Total', 'Total']) == int(d['valor'].sum())", "expected": true,
    "name": "Com 300 vendas sorteadas, o canto é o total geral" },
  { "id": "entrada", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'mes': ['2025-01', '2025-02'], 'regiao': ['Sul', 'Norte'], 'valor': [10, 20]})\nr = vendas_mes_por_regiao(d)",
    "expr": "d.to_dict('list')", "expected": { "mes": ["2025-01", "2025-02"], "regiao": ["Sul", "Norte"], "valor": [10, 20] },
    "name": "A tabela recebida não muda" }
]
```

### Soluções erradas
```python name="média em cada célula"
import numpy as np
import pandas as pd


def vendas_mes_por_regiao(df):
    return df.pivot_table(
        index="mes",
        columns="regiao",
        values="valor",
        aggfunc="mean",
        fill_value=0,
        margins=True,
        margins_name="Total",
    )
```
```python name="conta as vendas"
import numpy as np
import pandas as pd


def vendas_mes_por_regiao(df):
    return df.pivot_table(
        index="mes",
        columns="regiao",
        values="valor",
        aggfunc="count",
        fill_value=0,
        margins=True,
        margins_name="Total",
    )
```
```python name="linhas e colunas trocadas"
import numpy as np
import pandas as pd


def vendas_mes_por_regiao(df):
    return df.pivot_table(
        index="regiao",
        columns="mes",
        values="valor",
        aggfunc="sum",
        fill_value=0,
        margins=True,
        margins_name="Total",
    )
```
```python name="combinação vazia fica NaN"
import numpy as np
import pandas as pd


def vendas_mes_por_regiao(df):
    return df.pivot_table(
        index="mes",
        columns="regiao",
        values="valor",
        aggfunc="sum",
        fill_value=None,
        margins=True,
        margins_name="Total",
    )
```
```python name="sem totais"
import numpy as np
import pandas as pd


def vendas_mes_por_regiao(df):
    return df.pivot_table(
        index="mes",
        columns="regiao",
        values="valor",
        aggfunc="sum",
        fill_value=0,
        margins=False,
        margins_name="Total",
    )
```

## Passo 3 · Previsão · normalize por linha ou por coluna

O `pd.crosstab(a, b)` conta quantas vezes cada par de valores aparece: é uma tabela dinâmica de contagens. O parâmetro `normalize` transforma as contagens em proporções. O programa cruza o canal de 8 pedidos com a forma de pagamento. Leia sem executar e digite exatamente o que ele imprime.

### Código
```python
import pandas as pd

pedidos = pd.DataFrame({
    "canal": ["site", "site", "loja", "site", "loja", "site", "loja", "site"],
    "pagamento": ["pix", "cartão", "pix", "pix", "dinheiro", "cartão", "pix", "pix"],
})
canal, pagamento = pedidos["canal"], pedidos["pagamento"]
t = pd.crosstab(canal, pagamento)
print(list(t.index), list(t.columns))
print(t.values.tolist())
print(pd.crosstab(canal, pagamento, normalize="index").round(2).values.tolist())
print(pd.crosstab(canal, pagamento, normalize="columns").round(2).values.tolist())
print(pd.crosstab(canal, pagamento, normalize="all").round(3).values.tolist())
print(pd.crosstab(canal, pagamento, margins=True).loc["All"].tolist())
```

### Dicas
1. Linhas e colunas saem em ordem alfabética, como no `groupby`.
2. `normalize="index"` divide cada célula pelo total da sua **linha**; `"columns"`, pelo total da sua coluna; `"all"`, pelo total geral.
3. A margem `All` soma cada coluna e, na última posição, o total geral.

### Saída esperada
```text
['loja', 'site'] ['cartão', 'dinheiro', 'pix']
[[0, 1, 2], [2, 0, 3]]
[[0.0, 0.33, 0.67], [0.4, 0.0, 0.6]]
[[0.0, 1.0, 0.4], [1.0, 0.0, 0.6]]
[[0.0, 0.125, 0.25], [0.25, 0.0, 0.375]]
[2, 1, 5, 8]
```

## Passo 4 · Leitura · Proporções e o paradoxo de Simpson

A Previsão mostrou três tabelas de proporções a partir das mesmas contagens, e cada uma responde a uma pergunta diferente. `normalize="index"` responde "entre os pedidos do site, que fração foi paga com pix?" (60 %): cada **linha** soma 1. `normalize="columns"` responde "entre os pedidos pagos com pix, que fração veio do site?" (também 60 %, por coincidência; no cartão, 100 %): cada **coluna** soma 1. Antes de calcular, escreva a frase da pergunta: o que vem depois de "entre" é a direção da normalização. Um valor inválido dá `ValueError: Not a valid normalize argument`.

Proporções também escondem tamanhos, e é aí que mora o paradoxo de Simpson. Duas transportadoras fictícias, A e B, fazem entregas em rotas urbanas (fáceis) e rurais (difíceis):

| rota | A no prazo | B no prazo |
|---|---|---|
| urbana | 90 de 100 (90 %) | 340 de 400 (85 %) |
| rural | 240 de 400 (60 %) | 55 de 100 (55 %) |
| total | 330 de 500 (66 %) | 395 de 500 (79 %) |

A é melhor nas duas rotas e pior no total. Não há erro de conta: a taxa agregada é uma **média ponderada** das taxas de cada grupo, com o peso de cada grupo:

$$
p = \frac{s_1 + s_2}{n_1 + n_2} = \frac{n_1}{n_1 + n_2}\,p_1 + \frac{n_2}{n_1 + n_2}\,p_2
$$

A recebe 80 % de rotas rurais, e o 60 % pesa muito na média dela; B recebe 80 % de rotas urbanas. A comparação agregada mede, sobretudo, **quem pegou as rotas difíceis**. Para decidir qual contratar numa rota, compare dentro da rota.

O erro inverso também existe: a média simples das taxas dos grupos, $(90\% + 60\%)/2 = 75\%$ para A, ignora que os grupos têm tamanhos diferentes e não é a taxa de entrega de ninguém.

Em código, as duas visões saem do mesmo `groupby`:

```python
agregado = entregas.groupby("transportadora")["no_prazo"].mean()
por_rota = entregas.groupby(["rota", "transportadora"])["no_prazo"].mean().unstack()
```

A média de uma coluna booleana é a fração de `True`. Ao ler qualquer tabela de taxas, mostre o **n** de cada célula e pergunte se os grupos comparados têm a mesma composição.

## Passo 5 · Exercício · Proporções por linha

Escreva a tabela de proporções por linha num formato que um relatório consome.

### Instruções
1. `proporcao_por_linha(df, a, b)` devolve um dicionário `{valor de a: {valor de b: proporção}}`: para cada valor da coluna `a`, a fração das suas linhas que tem cada valor da coluna `b`.
2. Toda combinação aparece, mesmo sem nenhuma linha (proporção `0.0`), e as proporções de cada valor de `a` somam 1. As proporções são `float` do Python.
3. Linhas com `a` ou `b` ausente ficam de fora, e a tabela recebida não muda.

### Código inicial
```python
import numpy as np
import pandas as pd


def proporcao_por_linha(df, a, b):
    pass
```

### Solução
```python
import numpy as np
import pandas as pd


def proporcao_por_linha(df, a, b):
    tabela = pd.crosstab(df[a], df[b], normalize="index")
    return tabela.to_dict("index")
```

### Dicas
1. A pergunta é "entre as linhas com este valor de `a`, que fração tem cada valor de `b`?".
2. Uma contagem por grupo só lista as combinações que existem; a tabela de contingência lista todas.
3. O `to_dict` tem uma orientação que usa as linhas como chaves de fora.

### Verificação
```json
[
  { "id": "basico", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'regiao': ['Norte', 'Sul', 'Sul', 'Norte', 'Sul', 'Sul', 'Leste'], 'plano': ['basico', 'premium', 'basico', 'basico', 'basico', 'premium', 'premium']})",
    "expr": "proporcao_por_linha(d, 'regiao', 'plano')",
    "expected": { "Leste": { "basico": 0.0, "premium": 1.0 }, "Norte": { "basico": 1.0, "premium": 0.0 }, "Sul": { "basico": 0.5, "premium": 0.5 } },
    "tolerance": 1e-9, "name": "Proporção de cada plano dentro de cada região", "hint": "As chaves de fora são as regiões." },
  { "id": "chaves", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'regiao': ['Norte', 'Sul', 'Sul', 'Norte', 'Sul', 'Sul', 'Leste'], 'plano': ['basico', 'premium', 'basico', 'basico', 'basico', 'premium', 'premium']})",
    "expr": "sorted(proporcao_por_linha(d, 'regiao', 'plano'))", "expected": ["Leste", "Norte", "Sul"],
    "name": "Uma chave por região, sem linha de total" },
  { "id": "terços", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'turno': ['manhã', 'manhã', 'manhã', 'tarde', 'tarde'], 'produto': ['café', 'pão', 'pão', 'café', 'café']})",
    "expr": "proporcao_por_linha(d, 'turno', 'produto')",
    "expected": { "manhã": { "café": 0.3333333333333333, "pão": 0.6666666666666666 }, "tarde": { "café": 1.0, "pão": 0.0 } },
    "tolerance": 1e-9, "name": "Outras colunas: dois terços dos pedidos da manhã são pão" },
  { "id": "soma-um", "checkpoint": 2, "kind": "expr",
    "setup": "rng = np.random.default_rng(11)\nd = pd.DataFrame({'loja': rng.choice(['A', 'B', 'C'], 200, p=[0.6, 0.3, 0.1]), 'canal': rng.choice(['site', 'app', 'balcão'], 200)})\nr = proporcao_por_linha(d, 'loja', 'canal')",
    "expr": "all(abs(sum(linha.values()) - 1) < 1e-9 for linha in r.values())", "expected": true,
    "name": "Com 200 pedidos sorteados, as proporções de cada loja somam 1", "hint": "Cada linha da tabela é dividida pelo total da própria linha." },
  { "id": "zero", "checkpoint": 2, "kind": "expr",
    "setup": "d = pd.DataFrame({'regiao': ['Norte', 'Sul', 'Sul', 'Norte', 'Sul', 'Sul', 'Leste'], 'plano': ['basico', 'premium', 'basico', 'basico', 'basico', 'premium', 'premium']})",
    "expr": "sorted(proporcao_por_linha(d, 'regiao', 'plano')['Norte'])", "expected": ["basico", "premium"],
    "name": "Combinação sem nenhuma linha também aparece", "hint": "O Norte não tem nenhum premium: a proporção existe e vale 0." },
  { "id": "tipo", "checkpoint": 2, "kind": "expr",
    "setup": "d = pd.DataFrame({'regiao': ['Norte', 'Sul'], 'plano': ['basico', 'premium']})",
    "expr": "type(proporcao_por_linha(d, 'regiao', 'plano')['Sul']['premium']).__name__", "expected": "float",
    "name": "As proporções são float do Python" },
  { "id": "uma-categoria", "checkpoint": 2, "kind": "expr",
    "setup": "d = pd.DataFrame({'regiao': ['Norte', 'Sul', 'Sul'], 'plano': ['basico', 'basico', 'basico']})",
    "expr": "proporcao_por_linha(d, 'regiao', 'plano')", "expected": { "Norte": { "basico": 1.0 }, "Sul": { "basico": 1.0 } },
    "tolerance": 1e-9, "name": "Com um plano só, cada região tem proporção 1" },
  { "id": "ausentes", "checkpoint": 3, "kind": "expr",
    "setup": "d = pd.DataFrame({'regiao': ['Norte', None, 'Norte', 'Norte'], 'plano': ['basico', 'premium', None, 'premium']})",
    "expr": "proporcao_por_linha(d, 'regiao', 'plano')", "expected": { "Norte": { "basico": 0.5, "premium": 0.5 } },
    "tolerance": 1e-9, "name": "Linhas com região ou plano ausente ficam de fora" },
  { "id": "entrada", "checkpoint": 3, "kind": "expr",
    "setup": "d = pd.DataFrame({'regiao': ['Norte', 'Sul'], 'plano': ['basico', 'premium']})\nr = proporcao_por_linha(d, 'regiao', 'plano')",
    "expr": "d.to_dict('list')", "expected": { "regiao": ["Norte", "Sul"], "plano": ["basico", "premium"] },
    "name": "A tabela recebida não muda" }
]
```

### Soluções erradas
```python name="normaliza por coluna"
import numpy as np
import pandas as pd


def proporcao_por_linha(df, a, b):
    tabela = pd.crosstab(df[a], df[b], normalize="columns")
    return tabela.to_dict("index")
```
```python name="normaliza pelo total geral"
import numpy as np
import pandas as pd


def proporcao_por_linha(df, a, b):
    tabela = pd.crosstab(df[a], df[b], normalize="all")
    return tabela.to_dict("index")
```
```python name="contagens sem normalizar"
import numpy as np
import pandas as pd


def proporcao_por_linha(df, a, b):
    tabela = pd.crosstab(df[a], df[b])
    return tabela.to_dict("index")
```
```python name="dicionário pelas colunas"
import numpy as np
import pandas as pd


def proporcao_por_linha(df, a, b):
    tabela = pd.crosstab(df[a], df[b], normalize="index")
    return tabela.to_dict()
```
```python name="com a linha de total"
import numpy as np
import pandas as pd


def proporcao_por_linha(df, a, b):
    tabela = pd.crosstab(df[a], df[b], normalize="index", margins=True)
    return tabela.to_dict("index")
```
```python name="contagem por grupo sem os zeros"
import numpy as np
import pandas as pd


def proporcao_por_linha(df, a, b):
    props = df.groupby(a)[b].value_counts(normalize=True)
    resultado = {}
    for (linha, coluna), p in props.items():
        resultado.setdefault(linha, {})[coluna] = float(p)
    return resultado
```

## Passo 6 · Exercício · Simpson

Escreva a análise que separa a taxa agregada das taxas por grupo e diz se elas se contradizem.

### Instruções
1. `simpson(df, grupo, tratamento, sucesso)` recebe uma tabela com uma linha por caso; `sucesso` é uma coluna booleana (ou de 0 e 1), `tratamento` tem exatamente dois valores e todo grupo tem casos dos dois tratamentos.
2. A função devolve um dicionário com três chaves. `"agregado"`: `{tratamento: taxa de sucesso}` com todos os casos juntos. `"por_grupo"`: `{grupo: {tratamento: taxa de sucesso}}`. As taxas são `float` do Python.
3. `"inverte"` é um `bool` do Python: `True` quando o mesmo tratamento tem taxa **estritamente** maior em todos os grupos e o outro tem taxa estritamente maior no agregado; `False` em qualquer outro caso (inclusive empate em algum grupo).

### Código inicial
```python
import numpy as np
import pandas as pd


def simpson(df, grupo, tratamento, sucesso):
    pass
```

### Solução
```python
import numpy as np
import pandas as pd


def simpson(df, grupo, tratamento, sucesso):
    agregado = df.groupby(tratamento)[sucesso].mean()
    por_grupo = df.groupby([grupo, tratamento])[sucesso].mean().unstack()
    t1, t2 = agregado.index.tolist()
    dif_grupos = por_grupo[t1] - por_grupo[t2]
    dif_agregado = agregado[t1] - agregado[t2]
    t1_melhor = (dif_grupos > 0).all() and dif_agregado < 0
    t2_melhor = (dif_grupos < 0).all() and dif_agregado > 0
    return {
        "agregado": agregado.to_dict(),
        "por_grupo": por_grupo.to_dict("index"),
        "inverte": bool(t1_melhor or t2_melhor),
    }
```

### Dicas
1. A taxa de sucesso é a média de uma coluna de verdadeiros e falsos; a agregada usa todos os casos, não as taxas dos grupos.
2. Com as duas taxas de cada grupo lado a lado, a diferença entre os tratamentos diz quem venceu em cada grupo.
3. Comparações e reduções do pandas devolvem booleanos do numpy.

### Verificação
```json
[
  { "id": "agregado", "checkpoint": 2, "kind": "expr",
    "setup": "linhas = [('urbana', 'A', 90, 100), ('urbana', 'B', 340, 400), ('rural', 'A', 240, 400), ('rural', 'B', 55, 100)]\nd = pd.DataFrame([(g, t, i < s) for g, t, s, n in linhas for i in range(n)], columns=['rota', 'transportadora', 'no_prazo'])",
    "expr": "simpson(d, 'rota', 'transportadora', 'no_prazo')['agregado']", "expected": { "A": 0.66, "B": 0.79 }, "tolerance": 1e-9,
    "name": "Taxas agregadas: A 66 %, B 79 %", "hint": "A agregada junta todas as entregas de cada transportadora." },
  { "id": "por-grupo", "checkpoint": 2, "kind": "expr",
    "setup": "linhas = [('urbana', 'A', 90, 100), ('urbana', 'B', 340, 400), ('rural', 'A', 240, 400), ('rural', 'B', 55, 100)]\nd = pd.DataFrame([(g, t, i < s) for g, t, s, n in linhas for i in range(n)], columns=['rota', 'transportadora', 'no_prazo'])",
    "expr": "simpson(d, 'rota', 'transportadora', 'no_prazo')['por_grupo']",
    "expected": { "rural": { "A": 0.6, "B": 0.55 }, "urbana": { "A": 0.9, "B": 0.85 } }, "tolerance": 1e-9,
    "name": "Taxas por rota, com a rota como chave de fora" },
  { "id": "tipo-taxa", "checkpoint": 2, "kind": "expr",
    "setup": "linhas = [('urbana', 'A', 90, 100), ('urbana', 'B', 340, 400), ('rural', 'A', 240, 400), ('rural', 'B', 55, 100)]\nd = pd.DataFrame([(g, t, i < s) for g, t, s, n in linhas for i in range(n)], columns=['rota', 'transportadora', 'no_prazo'])",
    "expr": "[type(simpson(d, 'rota', 'transportadora', 'no_prazo')['agregado']['A']).__name__, type(simpson(d, 'rota', 'transportadora', 'no_prazo')['por_grupo']['rural']['B']).__name__]",
    "expected": ["float", "float"], "name": "As taxas são float do Python" },
  { "id": "inverte", "checkpoint": 3, "kind": "expr",
    "setup": "linhas = [('urbana', 'A', 90, 100), ('urbana', 'B', 340, 400), ('rural', 'A', 240, 400), ('rural', 'B', 55, 100)]\nd = pd.DataFrame([(g, t, i < s) for g, t, s, n in linhas for i in range(n)], columns=['rota', 'transportadora', 'no_prazo'])",
    "expr": "simpson(d, 'rota', 'transportadora', 'no_prazo')['inverte']", "expected": true, "type": "bool",
    "name": "A vence nas duas rotas e perde no agregado: inverte", "hint": "inverte precisa ser um bool do Python." },
  { "id": "sem-inversao", "checkpoint": 3, "kind": "expr",
    "setup": "linhas = [('urbana', 'A', 90, 100), ('urbana', 'B', 80, 100), ('rural', 'A', 60, 100), ('rural', 'B', 50, 100)]\nd = pd.DataFrame([(g, t, i < s) for g, t, s, n in linhas for i in range(n)], columns=['rota', 'transportadora', 'no_prazo'])",
    "expr": "simpson(d, 'rota', 'transportadora', 'no_prazo')['inverte']", "expected": false, "type": "bool",
    "name": "A vence nas rotas e no agregado: não inverte" },
  { "id": "grupos-divergem", "checkpoint": 3, "kind": "expr",
    "setup": "linhas = [('urbana', 'A', 90, 100), ('urbana', 'B', 80, 100), ('rural', 'A', 40, 100), ('rural', 'B', 70, 100)]\nd = pd.DataFrame([(g, t, i < s) for g, t, s, n in linhas for i in range(n)], columns=['rota', 'transportadora', 'no_prazo'])",
    "expr": "simpson(d, 'rota', 'transportadora', 'no_prazo')['inverte']", "expected": false, "type": "bool",
    "name": "Cada transportadora vence numa rota: não inverte", "hint": "O mesmo tratamento precisa vencer em todos os grupos." },
  { "id": "empate", "checkpoint": 3, "kind": "expr",
    "setup": "linhas = [('urbana', 'A', 9, 10), ('urbana', 'B', 900, 1000), ('rural', 'A', 60, 200), ('rural', 'B', 20, 100)]\nd = pd.DataFrame([(g, t, i < s) for g, t, s, n in linhas for i in range(n)], columns=['rota', 'transportadora', 'no_prazo'])",
    "expr": "simpson(d, 'rota', 'transportadora', 'no_prazo')['inverte']", "expected": false, "type": "bool",
    "name": "Empate numa rota (90 % e 90 %): não inverte", "hint": "A vantagem em cada grupo precisa ser estrita." },
  { "id": "outros-nomes", "checkpoint": 1, "kind": "expr",
    "setup": "linhas = [('leve', 'novo', 45, 50), ('leve', 'padrao', 160, 200), ('grave', 'novo', 120, 200), ('grave', 'padrao', 25, 50)]\nd = pd.DataFrame([(g, t, int(i < s)) for g, t, s, n in linhas for i in range(n)], columns=['caso', 'metodo', 'melhorou'])\nr = simpson(d, 'caso', 'metodo', 'melhorou')",
    "expr": "[r['agregado'], r['inverte']]", "expected": [{ "novo": 0.66, "padrao": 0.74 }, true], "tolerance": 1e-9,
    "name": "Outras colunas, com sucesso em 0 e 1" },
  { "id": "chaves", "checkpoint": 2, "kind": "expr",
    "setup": "linhas = [('urbana', 'A', 9, 10), ('urbana', 'B', 8, 10), ('rural', 'A', 6, 10), ('rural', 'B', 5, 10)]\nd = pd.DataFrame([(g, t, i < s) for g, t, s, n in linhas for i in range(n)], columns=['rota', 'transportadora', 'no_prazo'])",
    "expr": "sorted(simpson(d, 'rota', 'transportadora', 'no_prazo'))", "expected": ["agregado", "inverte", "por_grupo"],
    "name": "O dicionário tem as chaves agregado, por_grupo e inverte" },
  { "id": "entrada", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'rota': ['u', 'u', 'r', 'r'], 'transportadora': ['A', 'B', 'A', 'B'], 'no_prazo': [True, False, True, True]})\nr = simpson(d, 'rota', 'transportadora', 'no_prazo')",
    "expr": "[list(d.columns), d['no_prazo'].tolist()]", "expected": [["rota", "transportadora", "no_prazo"], [true, false, true, true]],
    "name": "A tabela recebida não muda" }
]
```

### Soluções erradas
```python name="agregado como média das taxas dos grupos"
import numpy as np
import pandas as pd


def simpson(df, grupo, tratamento, sucesso):
    por_grupo = df.groupby([grupo, tratamento])[sucesso].mean().unstack()
    agregado = por_grupo.mean()
    t1, t2 = agregado.index.tolist()
    dif_grupos = por_grupo[t1] - por_grupo[t2]
    dif_agregado = agregado[t1] - agregado[t2]
    t1_melhor = (dif_grupos > 0).all() and dif_agregado < 0
    t2_melhor = (dif_grupos < 0).all() and dif_agregado > 0
    return {
        "agregado": agregado.to_dict(),
        "por_grupo": por_grupo.to_dict("index"),
        "inverte": bool(t1_melhor or t2_melhor),
    }
```
```python name="soma em vez de taxa"
import numpy as np
import pandas as pd


def simpson(df, grupo, tratamento, sucesso):
    agregado = df.groupby(tratamento)[sucesso].sum()
    por_grupo = df.groupby([grupo, tratamento])[sucesso].sum().unstack()
    t1, t2 = agregado.index.tolist()
    dif_grupos = por_grupo[t1] - por_grupo[t2]
    dif_agregado = agregado[t1] - agregado[t2]
    t1_melhor = (dif_grupos > 0).all() and dif_agregado < 0
    t2_melhor = (dif_grupos < 0).all() and dif_agregado > 0
    return {
        "agregado": agregado.to_dict(),
        "por_grupo": por_grupo.to_dict("index"),
        "inverte": bool(t1_melhor or t2_melhor),
    }
```
```python name="por grupo com o tratamento por fora"
import numpy as np
import pandas as pd


def simpson(df, grupo, tratamento, sucesso):
    agregado = df.groupby(tratamento)[sucesso].mean()
    por_grupo = df.groupby([grupo, tratamento])[sucesso].mean().unstack()
    t1, t2 = agregado.index.tolist()
    dif_grupos = por_grupo[t1] - por_grupo[t2]
    dif_agregado = agregado[t1] - agregado[t2]
    t1_melhor = (dif_grupos > 0).all() and dif_agregado < 0
    t2_melhor = (dif_grupos < 0).all() and dif_agregado > 0
    return {
        "agregado": agregado.to_dict(),
        "por_grupo": por_grupo.to_dict(),
        "inverte": bool(t1_melhor or t2_melhor),
    }
```
```python name="basta vencer em um grupo"
import numpy as np
import pandas as pd


def simpson(df, grupo, tratamento, sucesso):
    agregado = df.groupby(tratamento)[sucesso].mean()
    por_grupo = df.groupby([grupo, tratamento])[sucesso].mean().unstack()
    t1, t2 = agregado.index.tolist()
    dif_grupos = por_grupo[t1] - por_grupo[t2]
    dif_agregado = agregado[t1] - agregado[t2]
    t1_melhor = (dif_grupos > 0).any() and dif_agregado < 0
    t2_melhor = (dif_grupos < 0).any() and dif_agregado > 0
    return {
        "agregado": agregado.to_dict(),
        "por_grupo": por_grupo.to_dict("index"),
        "inverte": bool(t1_melhor or t2_melhor),
    }
```
```python name="empate conta como vitória"
import numpy as np
import pandas as pd


def simpson(df, grupo, tratamento, sucesso):
    agregado = df.groupby(tratamento)[sucesso].mean()
    por_grupo = df.groupby([grupo, tratamento])[sucesso].mean().unstack()
    t1, t2 = agregado.index.tolist()
    dif_grupos = por_grupo[t1] - por_grupo[t2]
    dif_agregado = agregado[t1] - agregado[t2]
    t1_melhor = (dif_grupos >= 0).all() and dif_agregado < 0
    t2_melhor = (dif_grupos <= 0).all() and dif_agregado > 0
    return {
        "agregado": agregado.to_dict(),
        "por_grupo": por_grupo.to_dict("index"),
        "inverte": bool(t1_melhor or t2_melhor),
    }
```
```python name="booleano do numpy"
import numpy as np
import pandas as pd


def simpson(df, grupo, tratamento, sucesso):
    agregado = df.groupby(tratamento)[sucesso].mean()
    por_grupo = df.groupby([grupo, tratamento])[sucesso].mean().unstack()
    t1, t2 = agregado.index.tolist()
    dif_grupos = por_grupo[t1] - por_grupo[t2]
    dif_agregado = agregado[t1] - agregado[t2]
    t1_melhor = (dif_grupos > 0).all() and dif_agregado < 0
    t2_melhor = (dif_grupos < 0).all() and dif_agregado > 0
    return {
        "agregado": agregado.to_dict(),
        "por_grupo": por_grupo.to_dict("index"),
        "inverte": t1_melhor or t2_melhor,
    }
```

## Passo 7 · Quiz · Ler uma tabela de dupla entrada

### Pergunta
Uma pesquisa fictícia de satisfação cruza `canal` (site, app, balcão) com `satisfeito` (sim, não). A pergunta do relatório é "em qual canal os clientes estão mais satisfeitos?". Qual tabela responde?
- [ ] `pd.crosstab(df["canal"], df["satisfeito"], normalize="columns")`
- [x] `pd.crosstab(df["canal"], df["satisfeito"], normalize="index")`
- [ ] `pd.crosstab(df["canal"], df["satisfeito"], normalize="all")`
- [ ] `pd.crosstab(df["canal"], df["satisfeito"])`, comparando o número de satisfeitos de cada canal
> A pergunta é "entre os clientes de cada canal, que fração está satisfeita?": cada linha (canal) precisa somar 1, e isso é `normalize="index"`. Por coluna, a tabela diz de que canal vêm os satisfeitos, o que depende de quantos clientes cada canal tem. Pelo total geral, a mesma distorção. As contagens brutas favorecem o canal com mais clientes.

### Pergunta
Uma tabela dinâmica com `aggfunc="mean"` mostra a nota média de dois produtos: X tem 9,5 e Y tem 8,7. O gerente quer anunciar X como o mais bem avaliado. O que você pede antes?
- [ ] Nada: a média já leva em conta todas as avaliações
- [ ] Trocar para `aggfunc="sum"`, porque a soma é mais confiável que a média
- [x] A contagem ao lado da média (`aggfunc=["mean", "count"]`): se X tem duas avaliações e Y tem trezentas, a média de X quase não diz nada
- [ ] `fill_value=0`, para que produtos sem avaliação entrem na comparação
> A média esconde o tamanho da amostra. Com duas avaliações, um 9,5 pode mudar muito com a próxima nota; com trezentas, 8,7 é estável. A soma favorece quem tem mais avaliações e não mede qualidade, e preencher com zero inventaria notas para quem não foi avaliado.

### Pergunta
Na tabela do passo 4, a transportadora A entrega no prazo 90 % das rotas urbanas e 60 % das rurais; B, 85 % e 55 %. No total, A tem 66 % e B, 79 %. Você precisa contratar uma para uma nova rota **rural**. Qual decisão os dados sustentam?
- [ ] B, porque a taxa agregada dela é 13 pontos maior
- [x] A, porque, comparando dentro do mesmo tipo de rota, A entrega no prazo com mais frequência; o agregado de B é maior porque ela recebe sobretudo rotas urbanas
- [ ] Nenhuma conclusão é possível, porque as duas tabelas se contradizem
- [ ] A, porque a média simples das taxas dela, 75 %, é maior que a de B, 70 %
> O agregado mistura a dificuldade das rotas com a qualidade da transportadora: B parece melhor porque 80 % das entregas dela são urbanas. Dentro da rota rural, A vence (60 % contra 55 %). As tabelas não se contradizem: a agregada é uma média ponderada com pesos diferentes. A média simples chega à mesma escolha pelo motivo errado, porque não é a taxa de nenhum conjunto real de entregas.
