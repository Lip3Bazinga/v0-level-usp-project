---
slug: n4-m4-01-groupby
titulo: 'groupby: dividir, aplicar e combinar'
descricao: Agrupar por uma ou mais chaves, agg com várias funções e nomes, transform para colunas alinhadas e filter para grupos.
dificuldade: intermediario
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- pandas
xp: 120
tempo_min: 50
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Agrupar por uma ou mais colunas e calcular várias estatísticas com agg nomeado
- Usar transform para criar colunas alinhadas (desvio da média do grupo) e filter para selecionar grupos
- Interpretar o resultado com MultiIndex e achatá-lo com reset_index
---

## Passo 1 · Leitura · Dividir, aplicar, combinar

Uma rede fictícia de lojas registra cada venda numa linha: `loja`, `produto` e `valor`. A primeira pergunta da gerência é sempre a mesma: quanto vendeu cada loja? Com o que você sabe, sairia um filtro por loja e uma soma, repetidos para cada uma. O `groupby` faz tudo de uma vez, em três etapas:

```mermaid
flowchart LR
    A["tabela de vendas"] --> B["dividir por loja"]
    B --> C["Centro: 3 linhas"]
    B --> D["Norte: 2 linhas"]
    C --> E["aplicar: soma"]
    D --> F["aplicar: soma"]
    E --> G["combinar: uma linha por loja"]
    F --> G
```

O visualizador faz o mesmo à mão, grupo a grupo: cada volta do laço recebe o nome da loja e a sub-tabela com as linhas dela.

```python visualizar
import pandas as pd

vendas = pd.DataFrame({
    "loja": ["Centro", "Norte", "Centro", "Norte", "Centro"],
    "valor": [10.0, 20.0, 16.0, 30.0, 14.0],
})
totais = {}
for loja, grupo in vendas.groupby("loja"):
    soma = grupo["valor"].sum()
    totais[loja] = float(soma)
print(totais)
print(vendas.groupby("loja")["valor"].sum().to_dict())
```

Na prática você não escreve o laço: `vendas.groupby("loja")["valor"].sum()` devolve uma Series com uma linha por loja, e o **índice** é a chave do grupo, em ordem alfabética. Escolha a coluna antes da conta. Sem a seleção, o pandas tenta somar ou tirar a média de todas as colunas, e a de texto não deixa:

```python
vendas.groupby("loja").mean()
# TypeError: dtype 'str' does not support operation 'mean'
```

Para várias estatísticas de uma vez, use o `agg` **nomeado**: cada argumento é o nome da coluna nova, igual a um par (coluna de origem, função).

```python
resumo = vendas.groupby("loja").agg(
    total=("valor", "sum"),
    media=("valor", "mean"),
    maior=("valor", "max"),
)
```

O resultado é uma tabela com `loja` no índice e as colunas `total`, `media` e `maior`, com os nomes que você escolheu. As funções vêm como texto (`"sum"`, `"mean"`, `"median"`, `"min"`, `"max"`, `"count"`, `"size"`, `"nunique"`), e o pandas as roda em código compilado, como o numpy. Numa Series agrupada, o par vira só a função: `vendas.groupby("loja")["valor"].agg(total="sum")`. Passar o par ali dá `TypeError: func is expected but received tuple in **kwargs.`

Para devolver a loja como coluna comum, termine com `reset_index()`: o índice vira a primeira coluna e as linhas ganham rótulos de 0 a n − 1, prontas para um `merge` ou para exportar.

## Passo 2 · Previsão · size, count e o NaN

A tabela tem uma venda sem valor lançado e uma venda sem loja. Leia o programa sem executar e digite exatamente o que ele imprime.

### Código
```python
import numpy as np
import pandas as pd

vendas = pd.DataFrame({
    "loja": ["Centro", "Norte", "Centro", None, "Norte", "Centro"],
    "valor": [10.0, 20.0, np.nan, 5.0, 30.0, 14.0],
})
g = vendas.groupby("loja")["valor"]
print(g.size().to_dict())
print(g.count().to_dict())
print(g.sum().to_dict())
print(g.mean().to_dict())
print(vendas["valor"].sum())
print(sum(g.sum().to_dict().values()))
print(vendas.groupby("loja", dropna=False)["valor"].size().tolist())
```

### Dicas
1. `size` conta linhas; `count` conta valores que não são `NaN`.
2. Soma e média pulam o `NaN`, como nas Series do módulo 2.
3. A linha sem loja não pertence a grupo nenhum, a não ser que você peça `dropna=False`.

### Saída esperada
```text
{'Centro': 3, 'Norte': 2}
{'Centro': 2, 'Norte': 2}
{'Centro': 24.0, 'Norte': 50.0}
{'Centro': 12.0, 'Norte': 25.0}
79.0
74.0
[3, 2, 1]
```

## Passo 3 · Exercício · Vendas por vendedor
modo: lacunas

A Previsão mostrou duas armadilhas: `count` não conta as linhas com `NaN`, e a linha com a chave ausente some do resultado. Complete as lacunas (`___`) do resumo de vendas por vendedor. A tabela tem as colunas `vendedor`, `pedido` (número do pedido, sempre preenchido) e `valor`, que pode faltar.

### Instruções
1. `vendas_por_vendedor(df)` devolve uma tabela com uma linha por vendedor, em ordem alfabética, e as colunas `vendedor`, `total`, `media` e `n`, nessa ordem, com índice de 0 a n − 1. Pedidos sem vendedor ficam de fora.
2. `total` é a soma e `media` é a média dos valores lançados: um pedido sem valor não entra em nenhuma das duas contas.
3. `n` é o número de pedidos do vendedor, inclusive os que estão sem valor.

### Código inicial
```python
import numpy as np
import pandas as pd


def vendas_por_vendedor(df):
    resumo = df.groupby(___).agg(
        total=("valor", ___),
        media=("valor", ___),
        n=(___, ___),
    )
    return resumo.reset_index(drop=___)
```

### Solução
```python
import numpy as np
import pandas as pd


def vendas_por_vendedor(df):
    resumo = df.groupby("vendedor").agg(
        total=("valor", "sum"),
        media=("valor", "mean"),
        n=("pedido", "count"),
    )
    return resumo.reset_index(drop=False)
```

### Dicas
1. Para contar pedidos, escolha uma coluna que nunca falta ou uma função que conta linhas.
2. Média e mediana só coincidem quando os valores são simétricos; o enunciado pede a média.
3. Com `drop=True`, o índice antigo (os vendedores) é jogado fora.

### Verificação
```json
[
  { "id": "colunas", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'vendedor': ['Ana', 'Bruno', 'Ana', 'Bruno', 'Ana', 'Carla'], 'pedido': [1, 2, 3, 4, 5, 6], 'valor': [10.0, 50.0, 20.0, 50.0, 60.0, 25.0]})",
    "expr": "list(vendas_por_vendedor(d).columns)", "expected": ["vendedor", "total", "media", "n"],
    "name": "Colunas vendedor, total, media e n", "hint": "O vendedor precisa voltar a ser uma coluna." },
  { "id": "vendedores", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'vendedor': ['Bruno', 'Ana', 'Carla', 'Ana'], 'pedido': [1, 2, 3, 4], 'valor': [50.0, 10.0, 25.0, 20.0]})",
    "expr": "[vendas_por_vendedor(d)['vendedor'].tolist(), vendas_por_vendedor(d).index.tolist()]",
    "expected": [["Ana", "Bruno", "Carla"], [0, 1, 2]], "name": "Um vendedor por linha, em ordem alfabética, índice de 0 a n − 1" },
  { "id": "total", "checkpoint": 2, "kind": "expr",
    "setup": "d = pd.DataFrame({'vendedor': ['Ana', 'Bruno', 'Ana', 'Bruno', 'Ana', 'Carla'], 'pedido': [1, 2, 3, 4, 5, 6], 'valor': [10.0, 50.0, 20.0, 50.0, 60.0, 25.0]})",
    "expr": "vendas_por_vendedor(d)['total'].tolist()", "expected": [90.0, 100.0, 25.0], "tolerance": 1e-9,
    "name": "Total de cada vendedor" },
  { "id": "media", "checkpoint": 2, "kind": "expr",
    "setup": "d = pd.DataFrame({'vendedor': ['Ana', 'Bruno', 'Ana', 'Bruno', 'Ana', 'Carla'], 'pedido': [1, 2, 3, 4, 5, 6], 'valor': [10.0, 50.0, 20.0, 50.0, 60.0, 25.0]})",
    "expr": "vendas_por_vendedor(d)['media'].tolist()", "expected": [30.0, 50.0, 25.0], "tolerance": 1e-9,
    "name": "Média de cada vendedor", "hint": "Os pedidos da Ana valem 10, 20 e 60." },
  { "id": "n", "checkpoint": 3, "kind": "expr",
    "setup": "d = pd.DataFrame({'vendedor': ['Ana', 'Bruno', 'Ana', 'Bruno', 'Ana', 'Carla'], 'pedido': [1, 2, 3, 4, 5, 6], 'valor': [10.0, 50.0, 20.0, 50.0, 60.0, 25.0]})",
    "expr": "vendas_por_vendedor(d)['n'].tolist()", "expected": [3, 2, 1],
    "name": "Número de pedidos de cada vendedor", "hint": "O Bruno tem dois pedidos de mesmo valor: são dois pedidos." },
  { "id": "ausente-total", "checkpoint": 2, "kind": "expr",
    "setup": "d = pd.DataFrame({'vendedor': ['Ana', 'Ana', 'Bruno', 'Bruno'], 'pedido': [1, 2, 3, 4], 'valor': [40.0, np.nan, np.nan, np.nan]})",
    "expr": "vendas_por_vendedor(d)['total'].tolist()", "expected": [40.0, 0.0],
    "name": "Valor ausente não entra no total; sem nenhum valor, o total é 0" },
  { "id": "ausente-media", "checkpoint": 2, "kind": "expr",
    "setup": "d = pd.DataFrame({'vendedor': ['Ana', 'Ana', 'Bruno', 'Bruno'], 'pedido': [1, 2, 3, 4], 'valor': [40.0, np.nan, np.nan, np.nan]})",
    "expr": "vendas_por_vendedor(d)['media'].tolist()", "expected": [40.0, { "$float": "nan" }],
    "name": "Média só dos valores lançados" },
  { "id": "ausente-n", "checkpoint": 3, "kind": "expr",
    "setup": "d = pd.DataFrame({'vendedor': ['Ana', 'Ana', 'Bruno', 'Bruno'], 'pedido': [1, 2, 3, 4], 'valor': [40.0, np.nan, np.nan, np.nan]})",
    "expr": "vendas_por_vendedor(d)['n'].tolist()", "expected": [2, 2],
    "name": "Pedido sem valor também conta em n", "hint": "Uma das funções de contagem pula o NaN." },
  { "id": "sem-vendedor", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'vendedor': ['Ana', None, 'Ana'], 'pedido': [1, 2, 3], 'valor': [10.0, 99.0, 30.0]})",
    "expr": "vendas_por_vendedor(d).to_dict('list')", "expected": { "vendedor": ["Ana"], "total": [40.0], "media": [20.0], "n": [2] },
    "name": "Pedido sem vendedor fica de fora" },
  { "id": "entrada", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'vendedor': ['Bruno', 'Ana'], 'pedido': [1, 2], 'valor': [50.0, 10.0]})\nr = vendas_por_vendedor(d)",
    "expr": "d.to_dict('list')", "expected": { "vendedor": ["Bruno", "Ana"], "pedido": [1, 2], "valor": [50.0, 10.0] },
    "name": "A tabela recebida não muda" }
]
```

### Soluções erradas
```python name="count na coluna com ausentes"
import numpy as np
import pandas as pd


def vendas_por_vendedor(df):
    resumo = df.groupby("vendedor").agg(
        total=("valor", "sum"),
        media=("valor", "mean"),
        n=("valor", "count"),
    )
    return resumo.reset_index(drop=False)
```
```python name="conta valores distintos"
import numpy as np
import pandas as pd


def vendas_por_vendedor(df):
    resumo = df.groupby("vendedor").agg(
        total=("valor", "sum"),
        media=("valor", "mean"),
        n=("valor", "nunique"),
    )
    return resumo.reset_index(drop=False)
```
```python name="mediana no lugar da média"
import numpy as np
import pandas as pd


def vendas_por_vendedor(df):
    resumo = df.groupby("vendedor").agg(
        total=("valor", "sum"),
        media=("valor", "median"),
        n=("pedido", "count"),
    )
    return resumo.reset_index(drop=False)
```
```python name="total e média trocados"
import numpy as np
import pandas as pd


def vendas_por_vendedor(df):
    resumo = df.groupby("vendedor").agg(
        total=("valor", "mean"),
        media=("valor", "sum"),
        n=("pedido", "count"),
    )
    return resumo.reset_index(drop=False)
```
```python name="descarta os vendedores"
import numpy as np
import pandas as pd


def vendas_por_vendedor(df):
    resumo = df.groupby("vendedor").agg(
        total=("valor", "sum"),
        media=("valor", "mean"),
        n=("pedido", "count"),
    )
    return resumo.reset_index(drop=True)
```
```python name="mantém o grupo sem vendedor"
import numpy as np
import pandas as pd


def vendas_por_vendedor(df):
    resumo = df.groupby("vendedor", dropna=False).agg(
        total=("valor", "sum"),
        media=("valor", "mean"),
        n=("pedido", "count"),
    )
    return resumo.reset_index(drop=False)
```

## Passo 4 · Leitura · transform e filter

O `agg` **reduz**: cada grupo vira uma linha. Muitas perguntas, porém, comparam cada linha com o seu grupo: esta venda ficou acima da média da loja dela? A tentativa natural é guardar a média numa coluna nova, e ela falha em silêncio:

```python
vendas["media_loja"] = vendas.groupby("loja")["valor"].mean()
print(vendas["media_loja"].tolist())   # [nan, nan, nan, nan, nan, nan]
```

O resultado do `mean` tem uma linha por loja, com rótulos `"Centro"` e `"Norte"`; a tabela tem rótulos 0, 1, 2… O pandas **alinha pelo índice**, como na soma de Series do módulo 2, não encontra rótulo em comum e preenche tudo com `NaN`, sem aviso. A subtração `vendas["valor"] - vendas.groupby("loja")["valor"].mean()` faz pior: devolve uma Series com os rótulos das duas, todos `NaN`.

O `transform` resolve: aplica a mesma função, mas devolve **um valor por linha**, com o índice da tabela original, repetindo o resultado do grupo em cada linha dele:

```python
media_loja = vendas.groupby("loja")["valor"].transform("mean")
vendas["acima"] = vendas["valor"] - media_loja
```

A linha cuja loja é ausente recebe `NaN`, porque não pertence a grupo nenhum.

O mesmo padrão imputa ausentes pelo grupo, o que a lição de valores ausentes deixou para cá: a mediana da própria loja costuma ser melhor que a mediana geral, porque lojas grandes e pequenas têm escalas diferentes.

```python
mediana_loja = vendas.groupby("loja")["valor"].transform("median")
vendas["valor"] = vendas["valor"].fillna(mediana_loja)
```

Se uma loja não tem valor nenhum, a mediana dela é `NaN` e as linhas continuam ausentes, o que é honesto: não há base para inventar. Passar ao `fillna` o resultado do `median()` sem `transform` não preenche nada, pelo mesmo motivo do alinhamento.

O `filter` faz a terceira operação: mantém ou descarta **grupos inteiros**. A função recebe a sub-tabela de cada grupo e devolve `True` ou `False`:

```python
frequentes = vendas.groupby("loja").filter(lambda g: len(g) >= 3)
```

O resultado tem as linhas originais, com os rótulos originais, só das lojas que passaram. Use `len(g)` para contar linhas; `g["valor"].count()` deixaria de fora as vendas sem valor. Uma média calculada com duas vendas oscila muito, e descartar grupos pequenos antes de comparar médias evita conclusões tiradas de quase nada.

## Passo 5 · Exercício · Cada linha contra o seu grupo

Compare cada venda com a média da sua loja e preencha os valores ausentes com a mediana da loja.

### Instruções
1. `desvio_da_media_do_grupo(df)` recebe uma tabela com as colunas `loja` e `valor` e devolve uma Series, com o mesmo índice da tabela, em que cada linha vale `valor` menos a média dos valores da sua loja. A média ignora valores ausentes; linha sem loja ou sem valor dá `NaN`.
2. `preencher_por_grupo(df, coluna, grupo)` devolve uma tabela nova, com as mesmas linhas e colunas, em que cada ausente de `coluna` foi trocado pela mediana de `coluna` no seu `grupo`. Se o grupo não tem valor nenhum, o ausente continua `NaN`.
3. Nenhuma das duas funções altera a tabela recebida.

### Código inicial
```python
import numpy as np
import pandas as pd


def desvio_da_media_do_grupo(df):
    pass


def preencher_por_grupo(df, coluna, grupo):
    pass
```

### Solução
```python
import numpy as np
import pandas as pd


def desvio_da_media_do_grupo(df):
    media = df.groupby("loja")["valor"].transform("mean")
    return df["valor"] - media


def preencher_por_grupo(df, coluna, grupo):
    novo = df.copy()
    mediana = novo.groupby(grupo)[coluna].transform("median")
    novo[coluna] = novo[coluna].fillna(mediana)
    return novo
```

### Dicas
1. Uma conta por grupo com um resultado por linha, alinhado com a tabela, é o que o `transform` entrega.
2. Um resultado de `mean()` ou `median()` sem `transform` tem as lojas como rótulos, e o pandas alinha pelos rótulos.
3. Atribuir uma coluna na tabela recebida altera a tabela de quem chamou: trabalhe numa cópia.

### Verificação
```json
[
  { "id": "desvio-valores", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'loja': ['Centro', 'Norte', 'Centro', 'Norte', 'Centro'], 'valor': [10.0, 20.0, 16.0, 30.0, 16.0]})",
    "expr": "desvio_da_media_do_grupo(d).tolist()", "expected": [-4.0, -5.0, 2.0, 5.0, 2.0], "tolerance": 1e-9,
    "name": "Desvio de cada venda em relação à média da sua loja", "hint": "A média do Centro é 14 e a do Norte é 25." },
  { "id": "desvio-tipo", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'loja': ['Centro', 'Norte'], 'valor': [10.0, 20.0]})",
    "expr": "type(desvio_da_media_do_grupo(d)).__name__", "expected": "Series", "name": "desvio_da_media_do_grupo devolve uma Series" },
  { "id": "desvio-indice", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'loja': ['Norte', 'Centro', 'Norte'], 'valor': [8.0, 5.0, 12.0]}, index=[30, 10, 20])",
    "expr": "[desvio_da_media_do_grupo(d).index.tolist(), desvio_da_media_do_grupo(d).tolist()]", "expected": [[30, 10, 20], [-2.0, 0.0, 2.0]],
    "tolerance": 1e-9, "name": "Mesmo índice e mesma ordem da tabela", "hint": "O resultado precisa casar linha a linha com a tabela recebida." },
  { "id": "desvio-soma-zero", "checkpoint": 1, "kind": "expr",
    "setup": "rng = np.random.default_rng(3)\nd = pd.DataFrame({'loja': rng.choice(['A', 'B', 'C', 'D'], 200), 'valor': rng.normal(100, 30, 200)})\nr = desvio_da_media_do_grupo(d)",
    "expr": "bool(r.groupby(d['loja']).sum().abs().max() < 1e-6)", "expected": true,
    "name": "Com 200 vendas sorteadas, os desvios de cada loja somam zero" },
  { "id": "desvio-ausente", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'loja': ['A', 'A', 'A'], 'valor': [10.0, np.nan, 20.0]})",
    "expr": "desvio_da_media_do_grupo(d).tolist()", "expected": [-5.0, { "$float": "nan" }, 5.0], "tolerance": 1e-9,
    "name": "Valor ausente fica fora da média e dá NaN" },
  { "id": "desvio-sem-loja", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'loja': ['A', None, 'A'], 'valor': [10.0, 50.0, 20.0]})",
    "expr": "desvio_da_media_do_grupo(d).tolist()", "expected": [-5.0, { "$float": "nan" }, 5.0], "tolerance": 1e-9,
    "name": "Venda sem loja dá NaN e não entra na média de ninguém" },
  { "id": "preencher-valores", "checkpoint": 2, "kind": "expr",
    "setup": "d = pd.DataFrame({'dia': [1, 2, 3, 4, 5, 6, 7], 'loja': ['Centro', 'Centro', 'Centro', 'Centro', 'Norte', 'Norte', 'Sul'], 'valor': [10.0, 12.0, 30.0, np.nan, 8.0, np.nan, np.nan]})",
    "expr": "preencher_por_grupo(d, 'valor', 'loja')['valor'].tolist()", "expected": [10.0, 12.0, 30.0, 12.0, 8.0, 8.0, { "$float": "nan" }],
    "tolerance": 1e-9, "name": "Ausentes trocados pela mediana da loja; loja sem valores continua NaN",
    "hint": "A mediana do Centro é 12; o Sul não tem nenhum valor." },
  { "id": "preencher-colunas", "checkpoint": 2, "kind": "expr",
    "setup": "d = pd.DataFrame({'dia': [1, 2, 3], 'loja': ['A', 'A', 'B'], 'valor': [4.0, np.nan, 7.0]}, index=[5, 6, 7])\nr = preencher_por_grupo(d, 'valor', 'loja')",
    "expr": "[list(r.columns), r.index.tolist(), r['dia'].tolist(), r['loja'].tolist()]",
    "expected": [["dia", "loja", "valor"], [5, 6, 7], [1, 2, 3], ["A", "A", "B"]], "name": "Mesmas linhas, colunas e índice; só os ausentes mudam" },
  { "id": "preencher-outros-nomes", "checkpoint": 2, "kind": "expr",
    "setup": "d = pd.DataFrame({'estacao': ['E1', 'E2', 'E1', 'E2', 'E1'], 'temp': [20.0, 31.0, np.nan, np.nan, 26.0]})",
    "expr": "preencher_por_grupo(d, 'temp', 'estacao')['temp'].tolist()", "expected": [20.0, 31.0, 23.0, 31.0, 26.0], "tolerance": 1e-9,
    "name": "Funciona com outros nomes de coluna e de grupo" },
  { "id": "entrada-desvio", "checkpoint": 3, "kind": "expr",
    "setup": "d = pd.DataFrame({'loja': ['A', 'B', 'A'], 'valor': [1.0, 2.0, 3.0]})\nr = desvio_da_media_do_grupo(d)",
    "expr": "[list(d.columns), d['valor'].tolist()]", "expected": [["loja", "valor"], [1.0, 2.0, 3.0]],
    "name": "desvio_da_media_do_grupo não altera a tabela" },
  { "id": "entrada-preencher", "checkpoint": 3, "kind": "expr",
    "setup": "d = pd.DataFrame({'loja': ['A', 'A'], 'valor': [4.0, np.nan]})\nr = preencher_por_grupo(d, 'valor', 'loja')",
    "expr": "d['valor'].isna().tolist()", "expected": [false, true], "name": "preencher_por_grupo não altera a tabela",
    "hint": "Faça uma cópia antes de trocar a coluna." }
]
```

### Soluções erradas
```python name="média sem transform"
import numpy as np
import pandas as pd


def desvio_da_media_do_grupo(df):
    media = df.groupby("loja")["valor"].mean()
    return df["valor"] - media


def preencher_por_grupo(df, coluna, grupo):
    novo = df.copy()
    mediana = novo.groupby(grupo)[coluna].transform("median")
    novo[coluna] = novo[coluna].fillna(mediana)
    return novo
```
```python name="média geral"
import numpy as np
import pandas as pd


def desvio_da_media_do_grupo(df):
    return df["valor"] - df["valor"].mean()


def preencher_por_grupo(df, coluna, grupo):
    novo = df.copy()
    mediana = novo.groupby(grupo)[coluna].transform("median")
    novo[coluna] = novo[coluna].fillna(mediana)
    return novo
```
```python name="sinal invertido"
import numpy as np
import pandas as pd


def desvio_da_media_do_grupo(df):
    media = df.groupby("loja")["valor"].transform("mean")
    return media - df["valor"]


def preencher_por_grupo(df, coluna, grupo):
    novo = df.copy()
    mediana = novo.groupby(grupo)[coluna].transform("median")
    novo[coluna] = novo[coluna].fillna(mediana)
    return novo
```
```python name="desvio guardado na tabela recebida"
import numpy as np
import pandas as pd


def desvio_da_media_do_grupo(df):
    df["desvio"] = df["valor"] - df.groupby("loja")["valor"].transform("mean")
    return df["desvio"]


def preencher_por_grupo(df, coluna, grupo):
    novo = df.copy()
    mediana = novo.groupby(grupo)[coluna].transform("median")
    novo[coluna] = novo[coluna].fillna(mediana)
    return novo
```
```python name="mediana sem transform"
import numpy as np
import pandas as pd


def desvio_da_media_do_grupo(df):
    media = df.groupby("loja")["valor"].transform("mean")
    return df["valor"] - media


def preencher_por_grupo(df, coluna, grupo):
    novo = df.copy()
    mediana = novo.groupby(grupo)[coluna].median()
    novo[coluna] = novo[coluna].fillna(mediana)
    return novo
```
```python name="mediana geral"
import numpy as np
import pandas as pd


def desvio_da_media_do_grupo(df):
    media = df.groupby("loja")["valor"].transform("mean")
    return df["valor"] - media


def preencher_por_grupo(df, coluna, grupo):
    novo = df.copy()
    novo[coluna] = novo[coluna].fillna(novo[coluna].median())
    return novo
```
```python name="média do grupo no lugar da mediana"
import numpy as np
import pandas as pd


def desvio_da_media_do_grupo(df):
    media = df.groupby("loja")["valor"].transform("mean")
    return df["valor"] - media


def preencher_por_grupo(df, coluna, grupo):
    novo = df.copy()
    media = novo.groupby(grupo)[coluna].transform("mean")
    novo[coluna] = novo[coluna].fillna(media)
    return novo
```
```python name="inventa valor para o grupo vazio"
import numpy as np
import pandas as pd


def desvio_da_media_do_grupo(df):
    media = df.groupby("loja")["valor"].transform("mean")
    return df["valor"] - media


def preencher_por_grupo(df, coluna, grupo):
    novo = df.copy()
    mediana = novo.groupby(grupo)[coluna].transform("median")
    novo[coluna] = novo[coluna].fillna(mediana).fillna(novo[coluna].median())
    return novo
```
```python name="preenche a tabela recebida"
import numpy as np
import pandas as pd


def desvio_da_media_do_grupo(df):
    media = df.groupby("loja")["valor"].transform("mean")
    return df["valor"] - media


def preencher_por_grupo(df, coluna, grupo):
    mediana = df.groupby(grupo)[coluna].transform("median")
    df[coluna] = df[coluna].fillna(mediana)
    return df
```

## Passo 6 · Leitura · MultiIndex, reset_index e categorias

Agrupar por duas colunas dá uma chave composta. O índice do resultado vira um **MultiIndex**, com um nível por coluna:

```python
por_loja_produto = vendas.groupby(["loja", "produto"])["valor"].sum()
print(por_loja_produto.index.tolist())
# [('Centro', 'café'), ('Centro', 'pão'), ('Norte', 'chá'), ('Norte', 'pão')]
print(por_loja_produto.loc[("Centro", "pão")])   # 14.0
```

Cada rótulo é uma tupla. Isso funciona, mas atrapalha um `merge`, um filtro por coluna ou uma exportação. `reset_index()` devolve os dois níveis como colunas comuns; `groupby([...], as_index=False)` já entrega assim. Para ver o mesmo resultado como tabela de dupla entrada, `unstack()` leva o último nível para as colunas, que é o assunto da próxima lição.

O MultiIndex também aparece nas **colunas** quando o `agg` recebe um dicionário de listas:

```python
vendas.groupby("loja").agg({"valor": ["sum", "mean"]}).columns.tolist()
# [('valor', 'sum'), ('valor', 'mean')]
```

Para chegar a uma coluna, você escreve `r[("valor", "sum")]`. O `agg` nomeado do passo 1 evita isso e ainda deixa claro o que cada coluna significa.

Quando a chave é uma coluna `category`, o pandas 3 usa `observed=True` por padrão: só aparecem as categorias que têm linhas. Se `loja` tem as categorias Centro, Norte e Sul, e o Sul não vendeu nada, ele simplesmente some do resumo. Num relatório em que "o Sul vendeu zero" é informação, peça `observed=False`, e o Sul aparece com soma 0.

O resultado de um `groupby` sai ordenado pela chave. Para o ranking, ordene depois: `resumo.sort_values("total", ascending=False)`, ou `nlargest(3, "total")` para os três maiores. Outras funções úteis: `nunique` conta valores distintos (quantos produtos diferentes cada loja vendeu) e `rank` numera dentro do grupo:

```python
pos = vendas.groupby("loja")["valor"].rank(method="min", ascending=False)
```

`ascending=False` dá a posição 1 ao maior. Com `method="min"`, dois empatados no segundo lugar recebem 2, e o seguinte recebe 4, como num pódio; `"dense"` daria 3 ao seguinte, e `"first"` desempata pela ordem das linhas. O `rank` devolve `float64` mesmo sem frações: converta com `astype(int)` quando não houver ausentes.

Evite `groupby(...).apply(funcao)` quando existe uma função pronta: o `apply` chama Python uma vez por grupo, e o `agg`, o `transform` e o `rank` rodam em código compilado.

## Passo 7 · Exercício · Grupos e rankings

A tabela tem as colunas `categoria`, `produto` e `vendas`. Selecione as categorias com movimento suficiente e numere os produtos dentro de cada categoria.

### Instruções
1. `grupos_frequentes(df, minimo)` devolve as linhas das categorias que têm **pelo menos** `minimo` linhas na tabela, contando inclusive as linhas com `vendas` ausente. As linhas mantêm a ordem e os rótulos originais; linhas sem categoria nunca entram.
2. `ranking_por_categoria(df)` devolve uma tabela nova com as mesmas linhas, na mesma ordem, e uma coluna a mais, `posicao`: a posição das vendas da linha dentro da sua categoria, com 1 para a maior. Empatados recebem a mesma posição, a menor possível, e o seguinte pula as posições ocupadas (1, 2, 2, 4). A tabela de entrada não tem vendas ausentes.
3. `posicao` é uma coluna de inteiros, e `ranking_por_categoria` não altera a tabela recebida.

### Código inicial
```python
import numpy as np
import pandas as pd


def grupos_frequentes(df, minimo):
    pass


def ranking_por_categoria(df):
    pass
```

### Solução
```python
import numpy as np
import pandas as pd


def grupos_frequentes(df, minimo):
    return df.groupby("categoria").filter(lambda g: len(g) >= minimo)


def ranking_por_categoria(df):
    novo = df.copy()
    posicao = novo.groupby("categoria")["vendas"].rank(method="min", ascending=False)
    novo["posicao"] = posicao.astype(int)
    return novo
```

### Dicas
1. Para manter ou descartar grupos inteiros, a função recebe a sub-tabela de cada grupo: conte linhas, não valores.
2. O pódio com empate (1, 2, 2, 4) tem nome entre os métodos do `rank`.
3. O `rank` devolve números com casa decimal mesmo quando todos são inteiros.

### Verificação
```json
[
  { "id": "freq-3", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'categoria': ['bebida', 'lanche', 'bebida', 'doce', 'bebida', 'lanche', None], 'produto': ['suco', 'pastel', 'suco', 'bolo', 'café', 'coxinha', 'pão'], 'vendas': [5.0, 3.0, np.nan, 7.0, 2.0, 4.0, 1.0]}, index=[100, 101, 102, 103, 104, 105, 106])",
    "expr": "grupos_frequentes(d, 3).index.tolist()", "expected": [100, 102, 104],
    "name": "Com mínimo 3, só a categoria bebida, com os rótulos originais",
    "hint": "A bebida tem 3 linhas, uma delas sem vendas; e quem tem exatamente o mínimo também entra." },
  { "id": "freq-2", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'categoria': ['bebida', 'lanche', 'bebida', 'doce', 'bebida', 'lanche', None], 'produto': ['suco', 'pastel', 'suco', 'bolo', 'café', 'coxinha', 'pão'], 'vendas': [5.0, 3.0, np.nan, 7.0, 2.0, 4.0, 1.0]}, index=[100, 101, 102, 103, 104, 105, 106])",
    "expr": "grupos_frequentes(d, 2)['produto'].tolist()", "expected": ["suco", "pastel", "suco", "café", "coxinha"],
    "name": "Com mínimo 2, bebida e lanche, na ordem original" },
  { "id": "freq-1", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'categoria': ['bebida', 'lanche', 'bebida', 'doce', 'bebida', 'lanche', None], 'produto': ['suco', 'pastel', 'suco', 'bolo', 'café', 'coxinha', 'pão'], 'vendas': [5.0, 3.0, np.nan, 7.0, 2.0, 4.0, 1.0]}, index=[100, 101, 102, 103, 104, 105, 106])",
    "expr": "grupos_frequentes(d, 1).index.tolist()", "expected": [100, 101, 102, 103, 104, 105],
    "name": "Com mínimo 1, todas as linhas que têm categoria" },
  { "id": "freq-vazio", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'categoria': ['bebida', 'lanche', 'bebida'], 'produto': ['suco', 'pastel', 'café'], 'vendas': [5.0, 3.0, 2.0]})\nr = grupos_frequentes(d, 5)",
    "expr": "[len(r), list(r.columns)]", "expected": [0, ["categoria", "produto", "vendas"]],
    "name": "Nenhuma categoria chega ao mínimo: tabela vazia, com as mesmas colunas" },
  { "id": "rank-valores", "checkpoint": 2, "kind": "expr",
    "setup": "d = pd.DataFrame({'categoria': ['bebida', 'bebida', 'lanche', 'bebida', 'lanche', 'bebida'], 'produto': ['suco', 'café', 'pastel', 'chá', 'coxinha', 'água'], 'vendas': [30, 50, 20, 30, 25, 10]})",
    "expr": "ranking_por_categoria(d)['posicao'].tolist()", "expected": [2, 1, 2, 2, 1, 4],
    "name": "Posições dentro de cada categoria, com empate", "hint": "Na bebida: 50 é o 1º, os dois 30 dividem o 2º, e o 10 é o 4º." },
  { "id": "rank-colunas", "checkpoint": 2, "kind": "expr",
    "setup": "d = pd.DataFrame({'categoria': ['b', 'a', 'b'], 'produto': ['x', 'y', 'z'], 'vendas': [1, 2, 3]}, index=[7, 8, 9])\nr = ranking_por_categoria(d)",
    "expr": "[list(r.columns), r.index.tolist(), r['produto'].tolist()]", "expected": [["categoria", "produto", "vendas", "posicao"], [7, 8, 9], ["x", "y", "z"]],
    "name": "Mesmas linhas, na mesma ordem, com a coluna posicao no fim" },
  { "id": "rank-sozinho", "checkpoint": 2, "kind": "expr",
    "setup": "d = pd.DataFrame({'categoria': ['b', 'a', 'b'], 'produto': ['x', 'y', 'z'], 'vendas': [1, 2, 3]})",
    "expr": "ranking_por_categoria(d)['posicao'].tolist()", "expected": [2, 1, 1],
    "name": "Uma categoria com um produto só tem posição 1", "hint": "Cada categoria tem o seu próprio pódio." },
  { "id": "rank-inteiro", "checkpoint": 3, "kind": "expr",
    "setup": "d = pd.DataFrame({'categoria': ['b', 'a', 'b'], 'produto': ['x', 'y', 'z'], 'vendas': [1, 2, 3]})",
    "expr": "ranking_por_categoria(d)['posicao'].dtype.kind", "expected": "i", "name": "posicao é uma coluna de inteiros" },
  { "id": "rank-entrada", "checkpoint": 3, "kind": "expr",
    "setup": "d = pd.DataFrame({'categoria': ['b', 'a'], 'produto': ['x', 'y'], 'vendas': [1, 2]})\nr = ranking_por_categoria(d)",
    "expr": "list(d.columns)", "expected": ["categoria", "produto", "vendas"], "name": "A tabela recebida não muda" }
]
```

### Soluções erradas
```python name="mínimo estrito"
import numpy as np
import pandas as pd


def grupos_frequentes(df, minimo):
    return df.groupby("categoria").filter(lambda g: len(g) > minimo)


def ranking_por_categoria(df):
    novo = df.copy()
    posicao = novo.groupby("categoria")["vendas"].rank(method="min", ascending=False)
    novo["posicao"] = posicao.astype(int)
    return novo
```
```python name="conta só as vendas lançadas"
import numpy as np
import pandas as pd


def grupos_frequentes(df, minimo):
    return df.groupby("categoria").filter(lambda g: g["vendas"].count() >= minimo)


def ranking_por_categoria(df):
    novo = df.copy()
    posicao = novo.groupby("categoria")["vendas"].rank(method="min", ascending=False)
    novo["posicao"] = posicao.astype(int)
    return novo
```
```python name="conta produtos distintos"
import numpy as np
import pandas as pd


def grupos_frequentes(df, minimo):
    return df.groupby("categoria").filter(lambda g: g["produto"].nunique() >= minimo)


def ranking_por_categoria(df):
    novo = df.copy()
    posicao = novo.groupby("categoria")["vendas"].rank(method="min", ascending=False)
    novo["posicao"] = posicao.astype(int)
    return novo
```
```python name="perde os rótulos originais"
import numpy as np
import pandas as pd


def grupos_frequentes(df, minimo):
    return df.groupby("categoria").filter(lambda g: len(g) >= minimo).reset_index(drop=True)


def ranking_por_categoria(df):
    novo = df.copy()
    posicao = novo.groupby("categoria")["vendas"].rank(method="min", ascending=False)
    novo["posicao"] = posicao.astype(int)
    return novo
```
```python name="maior fica em último"
import numpy as np
import pandas as pd


def grupos_frequentes(df, minimo):
    return df.groupby("categoria").filter(lambda g: len(g) >= minimo)


def ranking_por_categoria(df):
    novo = df.copy()
    posicao = novo.groupby("categoria")["vendas"].rank(method="min")
    novo["posicao"] = posicao.astype(int)
    return novo
```
```python name="ranking sem pular posições"
import numpy as np
import pandas as pd


def grupos_frequentes(df, minimo):
    return df.groupby("categoria").filter(lambda g: len(g) >= minimo)


def ranking_por_categoria(df):
    novo = df.copy()
    posicao = novo.groupby("categoria")["vendas"].rank(method="dense", ascending=False)
    novo["posicao"] = posicao.astype(int)
    return novo
```
```python name="empate desfeito pela ordem"
import numpy as np
import pandas as pd


def grupos_frequentes(df, minimo):
    return df.groupby("categoria").filter(lambda g: len(g) >= minimo)


def ranking_por_categoria(df):
    novo = df.copy()
    posicao = novo.groupby("categoria")["vendas"].rank(method="first", ascending=False)
    novo["posicao"] = posicao.astype(int)
    return novo
```
```python name="ranking da tabela inteira"
import numpy as np
import pandas as pd


def grupos_frequentes(df, minimo):
    return df.groupby("categoria").filter(lambda g: len(g) >= minimo)


def ranking_por_categoria(df):
    novo = df.copy()
    posicao = novo["vendas"].rank(method="min", ascending=False)
    novo["posicao"] = posicao.astype(int)
    return novo
```
```python name="posição com casa decimal"
import numpy as np
import pandas as pd


def grupos_frequentes(df, minimo):
    return df.groupby("categoria").filter(lambda g: len(g) >= minimo)


def ranking_por_categoria(df):
    novo = df.copy()
    novo["posicao"] = novo.groupby("categoria")["vendas"].rank(method="min", ascending=False)
    return novo
```
```python name="posição gravada na tabela recebida"
import numpy as np
import pandas as pd


def grupos_frequentes(df, minimo):
    return df.groupby("categoria").filter(lambda g: len(g) >= minimo)


def ranking_por_categoria(df):
    posicao = df.groupby("categoria")["vendas"].rank(method="min", ascending=False)
    df["posicao"] = posicao.astype(int)
    return df
```

## Passo 8 · Quiz · size, count, agg e transform

### Pergunta
A tabela `pedidos` tem as colunas `loja`, `pedido` e `cupom`; `cupom` fica vazio (`NaN`) quando o cliente não usou cupom. Você quer o número de pedidos de cada loja. Qual expressão dá isso?
- [ ] `pedidos.groupby("loja")["cupom"].count()`
- [x] `pedidos.groupby("loja").size()`
- [ ] `pedidos.groupby("loja")["cupom"].nunique()`
- [ ] `pedidos["loja"].nunique()`
> `size` conta linhas, e cada linha é um pedido. `count` na coluna `cupom` pula os `NaN` e conta só os pedidos com cupom. `nunique` conta cupons diferentes, não pedidos. `pedidos["loja"].nunique()` dá um número só: quantas lojas existem.

### Pergunta
Uma colega quer comparar cada nota com a média da turma e escreveu `notas["media_turma"] = notas.groupby("turma")["nota"].mean()`. A coluna nova saiu inteira com `NaN`, sem erro. O que aconteceu e como corrigir?
- [ ] A média ignora `NaN` e, como alguma nota faltava, tudo virou `NaN`; basta `fillna(0)` antes
- [ ] O `groupby` precisa de `reset_index()` antes do `mean()`
- [x] O `mean()` devolve uma linha por turma, com as turmas como rótulos, e a atribuição alinha pelo índice da tabela, que não tem esses rótulos; `transform("mean")` devolve um valor por linha, alinhado
- [ ] A coluna `turma` é texto e o `groupby` só funciona com números; converta para `category`
> A atribuição de uma Series alinha pelos rótulos: o resultado do `mean()` tem rótulos como "A" e "B", e a tabela tem 0, 1, 2… Nenhum casa, então tudo vira `NaN`. O `transform` repete a média da turma em cada linha, com o índice da tabela. O `fillna(0)` estragaria as médias; `reset_index` antes do `mean` não muda o índice do resultado; e o `groupby` agrupa por texto sem problema.

### Pergunta
`vendas["valor"].sum()` dá R\$ 52 300, mas a soma de `vendas.groupby("vendedor")["valor"].sum()` dá R\$ 49 800. Nenhuma linha foi apagada. Qual é a explicação mais provável?
- [ ] O `groupby` arredonda os valores de cada grupo antes de somar
- [ ] Os vendedores com uma venda só ficam fora do `groupby`
- [x] Há vendas com `vendedor` ausente, que somam R\$ 2 500; o `groupby` descarta a chave `NaN` por padrão, e `dropna=False` as mostraria num grupo próprio
- [ ] A soma do `groupby` ignora os valores `NaN` e a soma da coluna não
> Por padrão, linhas com a chave ausente não pertencem a grupo nenhum, e a diferença some sem aviso. `groupby("vendedor", dropna=False)` cria o grupo `NaN` e a conta fecha. O `groupby` não arredonda nem descarta grupos pequenos, e as duas somas pulam valores `NaN` do mesmo jeito.
