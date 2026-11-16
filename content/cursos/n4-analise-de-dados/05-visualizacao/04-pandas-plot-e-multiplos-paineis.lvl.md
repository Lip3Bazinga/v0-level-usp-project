---
slug: n4-m5-04-pandas-plot-e-multiplos-paineis
titulo: pandas.plot e figuras com vários painéis
descricao: O atalho df.plot, gráficos de séries temporais e agrupados, subplots em grade, compartilhamento de eixos e layout.
dificuldade: intermediario
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- pandas
- matplotlib
xp: 110
tempo_min: 45
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Gerar gráficos direto de Series e DataFrames com .plot e seus tipos
- Montar figuras com vários painéis (subplots) com eixos compartilhados e layout ajustado
- Produzir um painel de quatro gráficos a partir de uma mesma tabela
---

## Passo 1 · Leitura · df.plot e o ax=

Depois de um `groupby` ou de um `resample`, o resultado já é uma Series ou um DataFrame com o índice certo. O pandas tem um atalho que desenha direto dele, usando o matplotlib por baixo:

```python
mensal = vendas.set_index("data")["valor"].resample("ME").sum()
por_mes = tabela.pivot_table(index="mes", columns="categoria", values="valor", aggfunc="sum")

fig, axs = plt.subplots(1, 2, figsize=(10, 4))
mensal.plot(ax=axs[0])                       # linha, datas no eixo x
por_mes.plot.bar(stacked=True, ax=axs[1])    # uma pilha por mês, uma cor por categoria
axs[0].set_ylabel("vendas (mil R$)")
```

Numa Series, `.plot()` desenha uma linha dos valores contra o índice. Num DataFrame, cada coluna numérica vira uma série: uma linha cada em `.plot()`, um grupo de barras por linha da tabela em `.plot.bar()`, e a **legenda** sai sozinha, com os nomes das colunas. Os outros tipos seguem o mesmo padrão: `.plot.barh()`, `.plot.hist(bins=...)`, `.plot.box()`, `.plot.scatter(x="preco", y="unidades")`, ou `kind="bar"` como argumento. Todos devolvem o **Axes** em que desenharam, então dá para continuar com `ax.set_title`, `ax.set_ylabel` e o resto da lição anterior.

Com um índice de datas, o pandas formata o eixo x como calendário (meses, anos). Por dentro, ele converte as datas em períodos: `ax.lines[0].get_xdata()` devolve objetos `Period`, e não as datas originais, por isso a correção desta lição confere só os valores do eixo y. Ordene o índice antes de desenhar (`sort_index()`): com datas fora de ordem, a linha vai e volta no tempo.

O argumento `ax=` é o que liga o atalho à sua figura, e esquecê-lo tem dois efeitos diferentes. Um **DataFrame** sem `ax=` cria uma figura nova a cada chamada; num laço, você termina com dez figuras soltas e a sua continua vazia. Uma **Series** sem `ax=` desenha no Axes **atual** do pyplot. Depois de `plt.subplots(2, 2)`, o atual é o último painel criado, o de baixo à direita; a linha mensal aparece no lugar do boxplot, e o painel de cima fica vazio, sem erro nenhum. Regra prática: dentro de uma função que montou a figura, todo `.plot` do pandas recebe `ax=`.

Nas barras empilhadas (`stacked=True`), cada retângulo começa onde o anterior terminou: `ax.patches` guarda as barras coluna por coluna, e `p.get_y()` é a base de cada uma.

## Passo 2 · Previsão · ax[0] numa grade 2 × 2

O programa cria grades de painéis de formatos diferentes e olha o que o `plt.subplots` devolveu. Leia sem executar e digite exatamente o que ele imprime.

### Código
```python
import matplotlib.pyplot as plt

fig, axs = plt.subplots(2, 2)
print(type(axs).__name__, axs.shape)
print(type(axs[0]).__name__, type(axs[0, 1]).__name__)
print(len(fig.axes), axs.flat[3] is axs[1, 1])
try:
    axs[0].set_title("Norte")
except AttributeError as erro:
    print(erro)

fig, linha = plt.subplots(1, 3)
print(linha.shape)
fig, sozinho = plt.subplots(1, 1)
print(type(sozinho).__name__)
fig, grade = plt.subplots(1, 1, squeeze=False)
print(grade.shape)
```

### Dicas
1. Numa grade com duas linhas e duas colunas, os painéis vêm num array de duas dimensões.
2. Um índice só numa matriz devolve uma linha inteira.
3. Por padrão, o `subplots` remove as dimensões de tamanho 1; `squeeze=False` mantém todas.

### Saída esperada
```text
ndarray (2, 2)
ndarray Axes
4 True
'numpy.ndarray' object has no attribute 'set_title'
(3,)
Axes
(1, 1)
```

## Passo 3 · Exercício · Barras empilhadas
modo: lacunas

A tabela `tabela` tem um mês por linha e uma categoria de produto por coluna, com as vendas em mil reais. Complete as lacunas (`___`) para desenhar uma pilha por mês, na figura criada pela função.

### Instruções
1. `barras_empilhadas(tabela)` devolve `(fig, ax)`, e a figura criada na função é a única aberta: o pandas desenha nesse `ax`.
2. Uma barra vertical por mês e por categoria, empilhadas: em cada mês, a barra de uma categoria começa onde a anterior terminou.
3. Os meses (índice da tabela) são as marcas do eixo x, e a legenda tem os nomes das categorias (colunas).
4. O rótulo do eixo y é `vendas (mil R$)`.

### Código inicial
```python
import matplotlib.pyplot as plt


def barras_empilhadas(tabela):
    fig, ax = plt.subplots()
    tabela.plot.___(stacked=___, ax=___)
    ax.set_ylabel("vendas (mil R$)")
    return fig, ax
```

### Solução
```python
import matplotlib.pyplot as plt


def barras_empilhadas(tabela):
    fig, ax = plt.subplots()
    tabela.plot.bar(stacked=True, ax=ax)
    ax.set_ylabel("vendas (mil R$)")
    return fig, ax
```

### Dicas
1. Os tipos de gráfico do pandas são métodos de `.plot`, com o mesmo nome dos do matplotlib.
2. Sem empilhar, as barras de um mês ficam lado a lado, todas a partir do zero.
3. O Axes onde o pandas deve desenhar é o que a função acabou de criar.

### Verificação
```json
[
  { "id": "tipos", "checkpoint": 1, "kind": "expr",
    "setup": "import pandas as pd\nimport matplotlib.pyplot as plt\nplt.close(\"all\")\nT = pd.DataFrame({\"cadernos\": [12.0, 15.0, 9.0], \"canetas\": [5.0, 4.0, 6.5]}, index=[\"jan\", \"fev\", \"mar\"])\nr = barras_empilhadas(T)",
    "expr": "[type(parte).__name__ for parte in r]", "expected": ["Figure", "Axes"], "name": "Devolve (fig, ax)" },
  { "id": "uma-figura", "checkpoint": 1, "kind": "expr",
    "setup": "import pandas as pd\nimport matplotlib.pyplot as plt\nplt.close(\"all\")\nT = pd.DataFrame({\"cadernos\": [12.0, 15.0, 9.0], \"canetas\": [5.0, 4.0, 6.5]}, index=[\"jan\", \"fev\", \"mar\"])\nfig, ax = barras_empilhadas(T)",
    "expr": "len(plt.get_fignums())", "expected": 1,
    "name": "Uma figura só, a criada pela função", "hint": "Sem dizer onde desenhar, o pandas cria outra figura." },
  { "id": "seis-barras", "checkpoint": 2, "kind": "expr",
    "setup": "import pandas as pd\nimport matplotlib.pyplot as plt\nplt.close(\"all\")\nT = pd.DataFrame({\"cadernos\": [12.0, 15.0, 9.0], \"canetas\": [5.0, 4.0, 6.5]}, index=[\"jan\", \"fev\", \"mar\"])\nfig, ax = barras_empilhadas(T)",
    "expr": "len(ax.patches)", "expected": 6,
    "name": "Seis barras no Axes devolvido: três meses, duas categorias", "hint": "Retângulos, um por mês e por categoria." },
  { "id": "alturas", "checkpoint": 2, "kind": "expr",
    "setup": "import pandas as pd\nimport matplotlib.pyplot as plt\nplt.close(\"all\")\nT = pd.DataFrame({\"cadernos\": [12.0, 15.0, 9.0], \"canetas\": [5.0, 4.0, 6.5]}, index=[\"jan\", \"fev\", \"mar\"])\nfig, ax = barras_empilhadas(T)",
    "expr": "[float(p.get_height()) for p in ax.patches]", "expected": [12.0, 15.0, 9.0, 5.0, 4.0, 6.5],
    "name": "A altura de cada barra é a venda da categoria no mês", "hint": "Barras verticais; as horizontais guardam o valor na largura." },
  { "id": "bases", "checkpoint": 2, "kind": "expr",
    "setup": "import pandas as pd\nimport matplotlib.pyplot as plt\nplt.close(\"all\")\nT = pd.DataFrame({\"cadernos\": [12.0, 15.0, 9.0], \"canetas\": [5.0, 4.0, 6.5]}, index=[\"jan\", \"fev\", \"mar\"])\nfig, ax = barras_empilhadas(T)",
    "expr": "[float(p.get_y()) for p in ax.patches]", "expected": [0.0, 0.0, 0.0, 12.0, 15.0, 9.0],
    "name": "As canetas começam onde os cadernos terminam", "hint": "Empilhadas, e não lado a lado." },
  { "id": "meses", "checkpoint": 3, "kind": "expr",
    "setup": "import pandas as pd\nimport matplotlib.pyplot as plt\nplt.close(\"all\")\nT = pd.DataFrame({\"cadernos\": [12.0, 15.0, 9.0], \"canetas\": [5.0, 4.0, 6.5]}, index=[\"jan\", \"fev\", \"mar\"])\nfig, ax = barras_empilhadas(T)",
    "expr": "[t.get_text() for t in ax.get_xticklabels()]", "expected": ["jan", "fev", "mar"], "name": "Os meses no eixo x" },
  { "id": "legenda", "checkpoint": 3, "kind": "expr",
    "setup": "import pandas as pd\nimport matplotlib.pyplot as plt\nplt.close(\"all\")\nT = pd.DataFrame({\"cadernos\": [12.0, 15.0, 9.0], \"canetas\": [5.0, 4.0, 6.5]}, index=[\"jan\", \"fev\", \"mar\"])\nfig, ax = barras_empilhadas(T)",
    "expr": "[t.get_text() for t in ax.get_legend().get_texts()]", "expected": ["cadernos", "canetas"],
    "name": "A legenda tem as categorias", "hint": "Se este caso falhar com AttributeError, o Axes devolvido não tem legenda: o desenho foi para outro lugar." },
  { "id": "rotulo", "checkpoint": 4, "kind": "expr",
    "setup": "import pandas as pd\nimport matplotlib.pyplot as plt\nplt.close(\"all\")\nT = pd.DataFrame({\"cadernos\": [12.0, 15.0, 9.0], \"canetas\": [5.0, 4.0, 6.5]}, index=[\"jan\", \"fev\", \"mar\"])\nfig, ax = barras_empilhadas(T)",
    "expr": "ax.get_ylabel()", "expected": "vendas (mil R$)", "name": "O eixo y tem a unidade" },
  { "id": "uma-coluna", "checkpoint": 2, "kind": "expr",
    "setup": "import pandas as pd\nimport matplotlib.pyplot as plt\nplt.close(\"all\")\nT = pd.DataFrame({\"mochilas\": [3.0, 7.5]}, index=[\"abr\", \"mai\"])\nfig, ax = barras_empilhadas(T)",
    "expr": "[[float(p.get_height()) for p in ax.patches], [float(p.get_y()) for p in ax.patches]]", "expected": [[3.0, 7.5], [0.0, 0.0]],
    "name": "Uma categoria só: uma barra por mês, a partir do zero" },
  { "id": "intacta", "checkpoint": 1, "kind": "expr",
    "setup": "import pandas as pd\nimport matplotlib.pyplot as plt\nplt.close(\"all\")\nT = pd.DataFrame({\"cadernos\": [12.0, 15.0, 9.0], \"canetas\": [5.0, 4.0, 6.5]}, index=[\"jan\", \"fev\", \"mar\"])\nfig, ax = barras_empilhadas(T)",
    "expr": "T.to_dict(\"list\")", "expected": { "cadernos": [12.0, 15.0, 9.0], "canetas": [5.0, 4.0, 6.5] }, "name": "A tabela recebida não muda" }
]
```

### Soluções erradas
```python name="barras horizontais"
import matplotlib.pyplot as plt


def barras_empilhadas(tabela):
    fig, ax = plt.subplots()
    tabela.plot.barh(stacked=True, ax=ax)
    ax.set_ylabel("vendas (mil R$)")
    return fig, ax
```
```python name="lado a lado"
import matplotlib.pyplot as plt


def barras_empilhadas(tabela):
    fig, ax = plt.subplots()
    tabela.plot.bar(stacked=False, ax=ax)
    ax.set_ylabel("vendas (mil R$)")
    return fig, ax
```
```python name="sem dizer o Axes"
import matplotlib.pyplot as plt


def barras_empilhadas(tabela):
    fig, ax = plt.subplots()
    tabela.plot.bar(stacked=True, ax=None)
    ax.set_ylabel("vendas (mil R$)")
    return fig, ax
```
```python name="linhas no lugar de barras"
import matplotlib.pyplot as plt


def barras_empilhadas(tabela):
    fig, ax = plt.subplots()
    tabela.plot.line(stacked=True, ax=ax)
    ax.set_ylabel("vendas (mil R$)")
    return fig, ax
```
```python name="área empilhada"
import matplotlib.pyplot as plt


def barras_empilhadas(tabela):
    fig, ax = plt.subplots()
    tabela.plot.area(stacked=True, ax=ax)
    ax.set_ylabel("vendas (mil R$)")
    return fig, ax
```

## Passo 4 · Leitura · subplots, sharex, tight_layout e suptitle

Para comparar as vendas diárias das filiais, um gráfico com todas as linhas juntas vira um novelo. A alternativa são **pequenos múltiplos**: um painel por filial, todos com a mesma escala, lado a lado.

```python
fig, axs = plt.subplots(2, 2, figsize=(10, 6), sharey=True)
for ax, filial in zip(axs.flat, ["Centro", "Leste", "Norte", "Sul"]):
    parte = vendas[vendas["filial"] == filial].sort_values("dia")
    ax.plot(parte["dia"], parte["valor"])
    ax.set_title(filial)
fig.suptitle("Vendas diárias por filial (mil R$)")
fig.tight_layout()
```

Com `nrows` e `ncols` maiores que 1, `axs` é um array numpy de duas dimensões, e cada painel se acessa por **linha e coluna**: `axs[0, 1]` é o de cima à direita. Um índice só devolve uma linha inteira da grade, e `axs[0].set_title("Norte")` termina em `AttributeError: 'numpy.ndarray' object has no attribute 'set_title'`. Um índice além da grade, como `axs[2, 0]` numa grade 2 × 2, dá `IndexError: index 2 is out of bounds for axis 0 with size 2`. Para percorrer todos os painéis, use `axs.flat`, na ordem de leitura (linha por linha); `fig.axes` lista os mesmos painéis, na ordem em que foram criados.

O formato de `axs` muda com a grade: `plt.subplots(1, 3)` dá um array de uma dimensão, `(3,)`, e `plt.subplots(1, 1)` devolve **um Axes sozinho**, não um array. Uma função que monta um painel por grupo quebra justamente quando há um grupo só: `for ax in axs` termina em `TypeError: 'Axes' object is not iterable`. Com `squeeze=False`, o resultado é sempre uma matriz, e `axs[0]` é sempre a primeira linha.

`sharey=True` faz todos os painéis usarem os **mesmos limites** no eixo y; `sharex=True`, no x. É o que torna os pequenos múltiplos comparáveis: sem isso, cada painel escolhe a própria escala, e uma filial que vende 5 parece tão alta quanto uma que vende 30. O compartilhamento só faz sentido entre painéis com a **mesma unidade**. Compartilhar o eixo y entre receita em mil reais (de 40 a 60) e número de pedidos (de 0 a 2 000) achata a receita contra o chão do painel.

`fig.suptitle` escreve o título da figura inteira, acima de todos os painéis; `plt.title` escreveria no painel atual, o último criado, e apagaria o título dele. `fig.tight_layout()` recalcula os espaços para que títulos e rótulos de painéis vizinhos não se sobreponham; `plt.subplots(..., layout="constrained")` faz o mesmo desde a criação.

## Passo 5 · Exercício · Pequenos múltiplos

A tabela tem as colunas `dia`, o nome do grupo (a filial, por exemplo) e a medida. Monte um painel por grupo para comparar as curvas na mesma escala.

### Instruções
1. `pequenos_multiplos(df, grupo, coluna)` devolve a `Figure`, com uma única linha de painéis: um por valor de `df[grupo]`, em ordem alfabética, com o nome do grupo como título do painel.
2. Em cada painel, uma linha com `coluna` contra `dia`, só com as linhas daquele grupo, em ordem crescente de `dia`.
3. Todos os painéis compartilham o eixo y.
4. O título da figura (`suptitle`) é o nome da `coluna`.
5. A função funciona com um grupo só, e `df` não muda.

### Código inicial
```python
import matplotlib.pyplot as plt


def pequenos_multiplos(df, grupo, coluna):
    pass
```

### Solução
```python
import matplotlib.pyplot as plt


def pequenos_multiplos(df, grupo, coluna):
    grupos = sorted(df[grupo].unique())
    fig, axs = plt.subplots(1, len(grupos), sharey=True, squeeze=False, figsize=(4 * len(grupos), 3))
    for ax, nome in zip(axs[0], grupos):
        parte = df[df[grupo] == nome].sort_values("dia")
        ax.plot(parte["dia"], parte[coluna])
        ax.set_title(nome)
    fig.suptitle(coluna)
    fig.tight_layout()
    return fig
```

### Dicas
1. Uma linha de painéis é `plt.subplots(1, k)`; pense no que ele devolve quando `k` é 1.
2. Filtrar e ordenar uma tabela devolve uma tabela nova.
3. O título da figura não é o título de um dos painéis.

### Verificação
```json
[
  { "id": "tipo", "checkpoint": 1, "kind": "expr",
    "setup": "import pandas as pd\nimport matplotlib.pyplot as plt\nplt.close(\"all\")\nD = pd.DataFrame({\"dia\": [3, 1, 2, 1, 2, 3, 1, 3, 2], \"filial\": [\"Sul\", \"Sul\", \"Sul\", \"Centro\", \"Centro\", \"Centro\", \"Norte\", \"Norte\", \"Norte\"], \"vendas\": [14.0, 10.0, 12.0, 30.0, 34.0, 31.0, 5.0, 9.0, 7.0]})\nfig = pequenos_multiplos(D, \"filial\", \"vendas\")",
    "expr": "[type(fig).__name__, len(fig.axes)]", "expected": ["Figure", 3],
    "name": "Devolve a figura, com um painel por filial" },
  { "id": "titulos", "checkpoint": 1, "kind": "expr",
    "setup": "import pandas as pd\nimport matplotlib.pyplot as plt\nplt.close(\"all\")\nD = pd.DataFrame({\"dia\": [3, 1, 2, 1, 2, 3, 1, 3, 2], \"filial\": [\"Sul\", \"Sul\", \"Sul\", \"Centro\", \"Centro\", \"Centro\", \"Norte\", \"Norte\", \"Norte\"], \"vendas\": [14.0, 10.0, 12.0, 30.0, 34.0, 31.0, 5.0, 9.0, 7.0]})\nfig = pequenos_multiplos(D, \"filial\", \"vendas\")",
    "expr": "[a.get_title() for a in fig.axes]", "expected": ["Centro", "Norte", "Sul"],
    "name": "Os painéis em ordem alfabética, com o nome no título", "hint": "A ordem em que as filiais aparecem na tabela não é alfabética." },
  { "id": "linha-centro", "checkpoint": 2, "kind": "expr",
    "setup": "import pandas as pd\nimport matplotlib.pyplot as plt\nplt.close(\"all\")\nD = pd.DataFrame({\"dia\": [3, 1, 2, 1, 2, 3, 1, 3, 2], \"filial\": [\"Sul\", \"Sul\", \"Sul\", \"Centro\", \"Centro\", \"Centro\", \"Norte\", \"Norte\", \"Norte\"], \"vendas\": [14.0, 10.0, 12.0, 30.0, 34.0, 31.0, 5.0, 9.0, 7.0]})\nfig = pequenos_multiplos(D, \"filial\", \"vendas\")",
    "expr": "[len(fig.axes[0].lines), [float(v) for v in fig.axes[0].lines[0].get_ydata()]]", "expected": [1, [30.0, 34.0, 31.0]],
    "name": "O painel do Centro tem só as vendas do Centro", "hint": "Cada painel recebe só as linhas do seu grupo." },
  { "id": "linha-sul", "checkpoint": 2, "kind": "expr",
    "setup": "import pandas as pd\nimport matplotlib.pyplot as plt\nplt.close(\"all\")\nD = pd.DataFrame({\"dia\": [3, 1, 2, 1, 2, 3, 1, 3, 2], \"filial\": [\"Sul\", \"Sul\", \"Sul\", \"Centro\", \"Centro\", \"Centro\", \"Norte\", \"Norte\", \"Norte\"], \"vendas\": [14.0, 10.0, 12.0, 30.0, 34.0, 31.0, 5.0, 9.0, 7.0]})\nfig = pequenos_multiplos(D, \"filial\", \"vendas\")",
    "expr": "[float(v) for v in fig.axes[2].lines[0].get_ydata()]", "expected": [10.0, 12.0, 14.0],
    "name": "No painel do Sul, as vendas seguem a ordem dos dias", "hint": "Na tabela, os dias do Sul estão fora de ordem." },
  { "id": "dias-norte", "checkpoint": 2, "kind": "expr",
    "setup": "import pandas as pd\nimport matplotlib.pyplot as plt\nplt.close(\"all\")\nD = pd.DataFrame({\"dia\": [3, 1, 2, 1, 2, 3, 1, 3, 2], \"filial\": [\"Sul\", \"Sul\", \"Sul\", \"Centro\", \"Centro\", \"Centro\", \"Norte\", \"Norte\", \"Norte\"], \"vendas\": [14.0, 10.0, 12.0, 30.0, 34.0, 31.0, 5.0, 9.0, 7.0]})\nfig = pequenos_multiplos(D, \"filial\", \"vendas\")",
    "expr": "[[float(v) for v in fig.axes[1].lines[0].get_xdata()], [float(v) for v in fig.axes[1].lines[0].get_ydata()]]",
    "expected": [[1.0, 2.0, 3.0], [5.0, 7.0, 9.0]], "name": "O painel do Norte tem os dias no eixo x e as vendas no y" },
  { "id": "mesma-escala", "checkpoint": 3, "kind": "expr",
    "setup": "import pandas as pd\nimport matplotlib.pyplot as plt\nplt.close(\"all\")\nD = pd.DataFrame({\"dia\": [3, 1, 2, 1, 2, 3, 1, 3, 2], \"filial\": [\"Sul\", \"Sul\", \"Sul\", \"Centro\", \"Centro\", \"Centro\", \"Norte\", \"Norte\", \"Norte\"], \"vendas\": [14.0, 10.0, 12.0, 30.0, 34.0, 31.0, 5.0, 9.0, 7.0]})\nfig = pequenos_multiplos(D, \"filial\", \"vendas\")",
    "expr": "len({tuple(round(float(v), 6) for v in a.get_ylim()) for a in fig.axes})", "expected": 1,
    "name": "Os três painéis têm os mesmos limites no eixo y", "hint": "Sem compartilhar, cada painel escolhe a própria escala." },
  { "id": "uma-linha-de-paineis", "checkpoint": 1, "kind": "expr",
    "setup": "import pandas as pd\nimport matplotlib.pyplot as plt\nplt.close(\"all\")\nD = pd.DataFrame({\"dia\": [3, 1, 2, 1, 2, 3, 1, 3, 2], \"filial\": [\"Sul\", \"Sul\", \"Sul\", \"Centro\", \"Centro\", \"Centro\", \"Norte\", \"Norte\", \"Norte\"], \"vendas\": [14.0, 10.0, 12.0, 30.0, 34.0, 31.0, 5.0, 9.0, 7.0]})\nfig = pequenos_multiplos(D, \"filial\", \"vendas\")",
    "expr": "[a.get_subplotspec().rowspan.start for a in fig.axes]", "expected": [0, 0, 0],
    "name": "Os painéis ficam lado a lado, numa linha só", "hint": "Uma linha e k colunas, não o contrário." },
  { "id": "suptitle", "checkpoint": 4, "kind": "expr",
    "setup": "import pandas as pd\nimport matplotlib.pyplot as plt\nplt.close(\"all\")\nD = pd.DataFrame({\"dia\": [3, 1, 2, 1, 2, 3, 1, 3, 2], \"filial\": [\"Sul\", \"Sul\", \"Sul\", \"Centro\", \"Centro\", \"Centro\", \"Norte\", \"Norte\", \"Norte\"], \"vendas\": [14.0, 10.0, 12.0, 30.0, 34.0, 31.0, 5.0, 9.0, 7.0]})\nfig = pequenos_multiplos(D, \"filial\", \"vendas\")",
    "expr": "fig.get_suptitle()", "expected": "vendas", "name": "O título da figura é o nome da coluna" },
  { "id": "um-grupo", "checkpoint": 5, "kind": "expr",
    "setup": "import pandas as pd\nimport matplotlib.pyplot as plt\nplt.close(\"all\")\nD = pd.DataFrame({\"dia\": [2, 1], \"filial\": [\"Leste\", \"Leste\"], \"pedidos\": [8.0, 6.0]})\nfig = pequenos_multiplos(D, \"filial\", \"pedidos\")",
    "expr": "[len(fig.axes), fig.axes[0].get_title(), [float(v) for v in fig.axes[0].lines[0].get_ydata()]]", "expected": [1, "Leste", [6.0, 8.0]],
    "name": "Um grupo só: um painel", "hint": "Com uma linha e uma coluna, o subplots não devolve um array." },
  { "id": "intacta", "checkpoint": 5, "kind": "expr",
    "setup": "import pandas as pd\nimport matplotlib.pyplot as plt\nplt.close(\"all\")\nD = pd.DataFrame({\"dia\": [3, 1, 2, 1, 2, 3, 1, 3, 2], \"filial\": [\"Sul\", \"Sul\", \"Sul\", \"Centro\", \"Centro\", \"Centro\", \"Norte\", \"Norte\", \"Norte\"], \"vendas\": [14.0, 10.0, 12.0, 30.0, 34.0, 31.0, 5.0, 9.0, 7.0]})\nfig = pequenos_multiplos(D, \"filial\", \"vendas\")",
    "expr": "[D[\"dia\"].tolist(), list(D.columns)]", "expected": [[3, 1, 2, 1, 2, 3, 1, 3, 2], ["dia", "filial", "vendas"]],
    "name": "A tabela recebida não muda" }
]
```

### Soluções erradas
```python name="sem compartilhar o eixo y"
import matplotlib.pyplot as plt


def pequenos_multiplos(df, grupo, coluna):
    grupos = sorted(df[grupo].unique())
    fig, axs = plt.subplots(1, len(grupos), squeeze=False, figsize=(4 * len(grupos), 3))
    for ax, nome in zip(axs[0], grupos):
        parte = df[df[grupo] == nome].sort_values("dia")
        ax.plot(parte["dia"], parte[coluna])
        ax.set_title(nome)
    fig.suptitle(coluna)
    fig.tight_layout()
    return fig
```
```python name="grupos na ordem em que aparecem"
import matplotlib.pyplot as plt


def pequenos_multiplos(df, grupo, coluna):
    grupos = list(df[grupo].unique())
    fig, axs = plt.subplots(1, len(grupos), sharey=True, squeeze=False, figsize=(4 * len(grupos), 3))
    for ax, nome in zip(axs[0], grupos):
        parte = df[df[grupo] == nome].sort_values("dia")
        ax.plot(parte["dia"], parte[coluna])
        ax.set_title(nome)
    fig.suptitle(coluna)
    fig.tight_layout()
    return fig
```
```python name="quebra com um grupo só"
import matplotlib.pyplot as plt


def pequenos_multiplos(df, grupo, coluna):
    grupos = sorted(df[grupo].unique())
    fig, axs = plt.subplots(1, len(grupos), sharey=True, figsize=(4 * len(grupos), 3))
    for ax, nome in zip(axs, grupos):
        parte = df[df[grupo] == nome].sort_values("dia")
        ax.plot(parte["dia"], parte[coluna])
        ax.set_title(nome)
    fig.suptitle(coluna)
    fig.tight_layout()
    return fig
```
```python name="todas as linhas em todo painel"
import matplotlib.pyplot as plt


def pequenos_multiplos(df, grupo, coluna):
    grupos = sorted(df[grupo].unique())
    fig, axs = plt.subplots(1, len(grupos), sharey=True, squeeze=False, figsize=(4 * len(grupos), 3))
    for ax, nome in zip(axs[0], grupos):
        parte = df.sort_values("dia")
        ax.plot(parte["dia"], parte[coluna])
        ax.set_title(nome)
    fig.suptitle(coluna)
    fig.tight_layout()
    return fig
```
```python name="dias fora de ordem"
import matplotlib.pyplot as plt


def pequenos_multiplos(df, grupo, coluna):
    grupos = sorted(df[grupo].unique())
    fig, axs = plt.subplots(1, len(grupos), sharey=True, squeeze=False, figsize=(4 * len(grupos), 3))
    for ax, nome in zip(axs[0], grupos):
        parte = df[df[grupo] == nome]
        ax.plot(parte["dia"], parte[coluna])
        ax.set_title(nome)
    fig.suptitle(coluna)
    fig.tight_layout()
    return fig
```
```python name="uma coluna de painéis"
import matplotlib.pyplot as plt


def pequenos_multiplos(df, grupo, coluna):
    grupos = sorted(df[grupo].unique())
    fig, axs = plt.subplots(len(grupos), 1, sharey=True, squeeze=False, figsize=(4, 3 * len(grupos)))
    for ax, nome in zip(axs[:, 0], grupos):
        parte = df[df[grupo] == nome].sort_values("dia")
        ax.plot(parte["dia"], parte[coluna])
        ax.set_title(nome)
    fig.suptitle(coluna)
    fig.tight_layout()
    return fig
```
```python name="plt.title no lugar de suptitle"
import matplotlib.pyplot as plt


def pequenos_multiplos(df, grupo, coluna):
    grupos = sorted(df[grupo].unique())
    fig, axs = plt.subplots(1, len(grupos), sharey=True, squeeze=False, figsize=(4 * len(grupos), 3))
    for ax, nome in zip(axs[0], grupos):
        parte = df[df[grupo] == nome].sort_values("dia")
        ax.plot(parte["dia"], parte[coluna])
        ax.set_title(nome)
    plt.title(coluna)
    fig.tight_layout()
    return fig
```

## Passo 6 · Exercício · O painel de vendas

A papelaria quer, numa figura só, os quatro gráficos do relatório mensal. A tabela tem as colunas `data` (datas), `regiao`, `categoria` e `ticket` (o valor de cada venda, em reais).

### Instruções
1. `painel_de_vendas(df)` devolve uma `Figure` com uma grade 2 × 2 de painéis (`plt.subplots(2, 2)`), título da figura `Painel de vendas` e nenhuma outra figura aberta.
2. Em cima, à esquerda, título `Vendas por mês`: uma linha com a soma de `ticket` em cada mês, do primeiro ao último; um mês sem vendas aparece com 0.
3. Em cima, à direita, título `Vendas por região`: barras com a soma de `ticket` por região, da maior para a menor.
4. Embaixo, à esquerda, título `Distribuição do ticket`: histograma de `ticket` com 8 faixas.
5. Embaixo, à direita, título `Ticket por categoria`: boxplot de `ticket` com uma caixa por categoria, em ordem alfabética.

### Código inicial
```python
import matplotlib.pyplot as plt


def painel_de_vendas(df):
    pass
```

### Solução
```python
import matplotlib.pyplot as plt


def painel_de_vendas(df):
    fig, axs = plt.subplots(2, 2, figsize=(10, 7))
    mensal = df.set_index("data")["ticket"].resample("ME").sum()
    mensal.plot(ax=axs[0, 0])
    axs[0, 0].set_title("Vendas por mês")
    por_regiao = df.groupby("regiao")["ticket"].sum().sort_values(ascending=False)
    axs[0, 1].bar(por_regiao.index, por_regiao.values)
    axs[0, 1].set_title("Vendas por região")
    axs[1, 0].hist(df["ticket"], bins=8)
    axs[1, 0].set_title("Distribuição do ticket")
    categorias = sorted(df["categoria"].unique())
    axs[1, 1].boxplot([df.loc[df["categoria"] == c, "ticket"] for c in categorias], tick_labels=categorias)
    axs[1, 1].set_title("Ticket por categoria")
    fig.suptitle("Painel de vendas")
    fig.tight_layout()
    return fig
```

### Dicas
1. `resample("ME")` cria uma linha para cada mês do intervalo, inclusive os vazios; agrupar pelo mês só cria os meses que aparecem.
2. Na grade, `axs[linha, coluna]`; a linha 0 é a de cima e a coluna 0 é a da esquerda.
3. Um `.plot` do pandas sem `ax=` não desenha no painel que você imagina.

### Verificação
```json
[
  { "id": "grade", "checkpoint": 1, "kind": "expr",
    "setup": "import pandas as pd\nimport matplotlib.pyplot as plt\nplt.close(\"all\")\nD = pd.DataFrame({\"data\": pd.to_datetime([\"2025-01-05\", \"2025-01-20\", \"2025-01-28\", \"2025-03-02\", \"2025-03-15\", \"2025-03-30\", \"2025-04-10\", \"2025-04-11\", \"2025-04-25\", \"2025-04-28\"]), \"regiao\": [\"Sul\", \"Norte\", \"Sul\", \"Centro\", \"Norte\", \"Sul\", \"Centro\", \"Sul\", \"Norte\", \"Sul\"], \"categoria\": [\"papel\", \"cadernos\", \"canetas\", \"papel\", \"cadernos\", \"canetas\", \"cadernos\", \"papel\", \"canetas\", \"cadernos\"], \"ticket\": [30.0, 52.0, 18.0, 41.0, 66.0, 22.0, 58.0, 35.0, 15.0, 47.0]})\nfig = painel_de_vendas(D)",
    "expr": "[type(fig).__name__, len(fig.axes), len(plt.get_fignums())]", "expected": ["Figure", 4, 1],
    "name": "Uma figura só, com quatro painéis", "hint": "Um gráfico do pandas sem ax= num DataFrame abre outra figura." },
  { "id": "suptitle", "checkpoint": 1, "kind": "expr",
    "setup": "import pandas as pd\nimport matplotlib.pyplot as plt\nplt.close(\"all\")\nD = pd.DataFrame({\"data\": pd.to_datetime([\"2025-01-05\", \"2025-01-20\", \"2025-01-28\", \"2025-03-02\", \"2025-03-15\", \"2025-03-30\", \"2025-04-10\", \"2025-04-11\", \"2025-04-25\", \"2025-04-28\"]), \"regiao\": [\"Sul\", \"Norte\", \"Sul\", \"Centro\", \"Norte\", \"Sul\", \"Centro\", \"Sul\", \"Norte\", \"Sul\"], \"categoria\": [\"papel\", \"cadernos\", \"canetas\", \"papel\", \"cadernos\", \"canetas\", \"cadernos\", \"papel\", \"canetas\", \"cadernos\"], \"ticket\": [30.0, 52.0, 18.0, 41.0, 66.0, 22.0, 58.0, 35.0, 15.0, 47.0]})\nfig = painel_de_vendas(D)",
    "expr": "fig.get_suptitle()", "expected": "Painel de vendas", "name": "O título da figura", "hint": "O título de um painel não é o título da figura." },
  { "id": "titulos", "checkpoint": 1, "kind": "expr",
    "setup": "import pandas as pd\nimport matplotlib.pyplot as plt\nplt.close(\"all\")\nD = pd.DataFrame({\"data\": pd.to_datetime([\"2025-01-05\", \"2025-01-20\", \"2025-01-28\", \"2025-03-02\", \"2025-03-15\", \"2025-03-30\", \"2025-04-10\", \"2025-04-11\", \"2025-04-25\", \"2025-04-28\"]), \"regiao\": [\"Sul\", \"Norte\", \"Sul\", \"Centro\", \"Norte\", \"Sul\", \"Centro\", \"Sul\", \"Norte\", \"Sul\"], \"categoria\": [\"papel\", \"cadernos\", \"canetas\", \"papel\", \"cadernos\", \"canetas\", \"cadernos\", \"papel\", \"canetas\", \"cadernos\"], \"ticket\": [30.0, 52.0, 18.0, 41.0, 66.0, 22.0, 58.0, 35.0, 15.0, 47.0]})\nfig = painel_de_vendas(D)",
    "expr": "[a.get_title() for a in fig.axes]", "expected": ["Vendas por mês", "Vendas por região", "Distribuição do ticket", "Ticket por categoria"],
    "name": "Os quatro títulos, cada um na sua posição", "hint": "Os painéis vêm na ordem de leitura: linha de cima, depois a de baixo." },
  { "id": "mensal", "checkpoint": 2, "kind": "expr",
    "setup": "import pandas as pd\nimport matplotlib.pyplot as plt\nplt.close(\"all\")\nD = pd.DataFrame({\"data\": pd.to_datetime([\"2025-01-05\", \"2025-01-20\", \"2025-01-28\", \"2025-03-02\", \"2025-03-15\", \"2025-03-30\", \"2025-04-10\", \"2025-04-11\", \"2025-04-25\", \"2025-04-28\"]), \"regiao\": [\"Sul\", \"Norte\", \"Sul\", \"Centro\", \"Norte\", \"Sul\", \"Centro\", \"Sul\", \"Norte\", \"Sul\"], \"categoria\": [\"papel\", \"cadernos\", \"canetas\", \"papel\", \"cadernos\", \"canetas\", \"cadernos\", \"papel\", \"canetas\", \"cadernos\"], \"ticket\": [30.0, 52.0, 18.0, 41.0, 66.0, 22.0, 58.0, 35.0, 15.0, 47.0]})\nfig = painel_de_vendas(D)",
    "expr": "[len(fig.axes[0].lines), [float(v) for v in fig.axes[0].lines[0].get_ydata()]]", "expected": [1, [100.0, 0.0, 129.0, 155.0]],
    "name": "Em cima à esquerda, as vendas de janeiro a abril, com fevereiro em zero",
    "hint": "Fevereiro não tem vendas, mas é um mês do intervalo. Se não houver linha neste painel, ela foi desenhada em outro." },
  { "id": "regioes", "checkpoint": 3, "kind": "expr",
    "setup": "import pandas as pd\nimport matplotlib.pyplot as plt\nplt.close(\"all\")\nD = pd.DataFrame({\"data\": pd.to_datetime([\"2025-01-05\", \"2025-01-20\", \"2025-01-28\", \"2025-03-02\", \"2025-03-15\", \"2025-03-30\", \"2025-04-10\", \"2025-04-11\", \"2025-04-25\", \"2025-04-28\"]), \"regiao\": [\"Sul\", \"Norte\", \"Sul\", \"Centro\", \"Norte\", \"Sul\", \"Centro\", \"Sul\", \"Norte\", \"Sul\"], \"categoria\": [\"papel\", \"cadernos\", \"canetas\", \"papel\", \"cadernos\", \"canetas\", \"cadernos\", \"papel\", \"canetas\", \"cadernos\"], \"ticket\": [30.0, 52.0, 18.0, 41.0, 66.0, 22.0, 58.0, 35.0, 15.0, 47.0]})\nfig = painel_de_vendas(D)",
    "expr": "[[t.get_text() for t in fig.axes[1].get_xticklabels()], [float(p.get_height()) for p in fig.axes[1].patches]]",
    "expected": [["Sul", "Norte", "Centro"], [152.0, 133.0, 99.0]],
    "name": "Em cima à direita, as regiões da maior para a menor", "hint": "Ordene pelo total, não pelo nome; e confira em qual painel as barras foram parar." },
  { "id": "histograma", "checkpoint": 4, "kind": "expr",
    "setup": "import pandas as pd\nimport matplotlib.pyplot as plt\nplt.close(\"all\")\nD = pd.DataFrame({\"data\": pd.to_datetime([\"2025-01-05\", \"2025-01-20\", \"2025-01-28\", \"2025-03-02\", \"2025-03-15\", \"2025-03-30\", \"2025-04-10\", \"2025-04-11\", \"2025-04-25\", \"2025-04-28\"]), \"regiao\": [\"Sul\", \"Norte\", \"Sul\", \"Centro\", \"Norte\", \"Sul\", \"Centro\", \"Sul\", \"Norte\", \"Sul\"], \"categoria\": [\"papel\", \"cadernos\", \"canetas\", \"papel\", \"cadernos\", \"canetas\", \"cadernos\", \"papel\", \"canetas\", \"cadernos\"], \"ticket\": [30.0, 52.0, 18.0, 41.0, 66.0, 22.0, 58.0, 35.0, 15.0, 47.0]})\nfig = painel_de_vendas(D)",
    "expr": "[len(fig.axes[2].patches), sum(float(p.get_height()) for p in fig.axes[2].patches)]", "expected": [8, 10.0],
    "name": "Embaixo à esquerda, o histograma com 8 faixas e as 10 vendas", "hint": "O padrão do hist não é 8." },
  { "id": "categorias", "checkpoint": 5, "kind": "expr",
    "setup": "import pandas as pd\nimport matplotlib.pyplot as plt\nplt.close(\"all\")\nD = pd.DataFrame({\"data\": pd.to_datetime([\"2025-01-05\", \"2025-01-20\", \"2025-01-28\", \"2025-03-02\", \"2025-03-15\", \"2025-03-30\", \"2025-04-10\", \"2025-04-11\", \"2025-04-25\", \"2025-04-28\"]), \"regiao\": [\"Sul\", \"Norte\", \"Sul\", \"Centro\", \"Norte\", \"Sul\", \"Centro\", \"Sul\", \"Norte\", \"Sul\"], \"categoria\": [\"papel\", \"cadernos\", \"canetas\", \"papel\", \"cadernos\", \"canetas\", \"cadernos\", \"papel\", \"canetas\", \"cadernos\"], \"ticket\": [30.0, 52.0, 18.0, 41.0, 66.0, 22.0, 58.0, 35.0, 15.0, 47.0]})\nfig = painel_de_vendas(D)",
    "expr": "[t.get_text() for t in fig.axes[3].get_xticklabels()]", "expected": ["cadernos", "canetas", "papel"],
    "name": "Embaixo à direita, as categorias em ordem alfabética" },
  { "id": "medianas", "checkpoint": 5, "kind": "expr",
    "setup": "import pandas as pd\nimport matplotlib.pyplot as plt\nplt.close(\"all\")\nD = pd.DataFrame({\"data\": pd.to_datetime([\"2025-01-05\", \"2025-01-20\", \"2025-01-28\", \"2025-03-02\", \"2025-03-15\", \"2025-03-30\", \"2025-04-10\", \"2025-04-11\", \"2025-04-25\", \"2025-04-28\"]), \"regiao\": [\"Sul\", \"Norte\", \"Sul\", \"Centro\", \"Norte\", \"Sul\", \"Centro\", \"Sul\", \"Norte\", \"Sul\"], \"categoria\": [\"papel\", \"cadernos\", \"canetas\", \"papel\", \"cadernos\", \"canetas\", \"cadernos\", \"papel\", \"canetas\", \"cadernos\"], \"ticket\": [30.0, 52.0, 18.0, 41.0, 66.0, 22.0, 58.0, 35.0, 15.0, 47.0]})\nfig = painel_de_vendas(D)",
    "expr": "[float(fig.axes[3].lines[7 * i + 5].get_ydata()[0]) for i in range(3)]", "expected": [55.0, 18.0, 35.0], "tolerance": 1e-9,
    "name": "Cada caixa tem a mediana da sua categoria" },
  { "id": "intacta", "checkpoint": 1, "kind": "expr",
    "setup": "import pandas as pd\nimport matplotlib.pyplot as plt\nplt.close(\"all\")\nD = pd.DataFrame({\"data\": pd.to_datetime([\"2025-01-05\", \"2025-01-20\", \"2025-01-28\", \"2025-03-02\", \"2025-03-15\", \"2025-03-30\", \"2025-04-10\", \"2025-04-11\", \"2025-04-25\", \"2025-04-28\"]), \"regiao\": [\"Sul\", \"Norte\", \"Sul\", \"Centro\", \"Norte\", \"Sul\", \"Centro\", \"Sul\", \"Norte\", \"Sul\"], \"categoria\": [\"papel\", \"cadernos\", \"canetas\", \"papel\", \"cadernos\", \"canetas\", \"cadernos\", \"papel\", \"canetas\", \"cadernos\"], \"ticket\": [30.0, 52.0, 18.0, 41.0, 66.0, 22.0, 58.0, 35.0, 15.0, 47.0]})\nfig = painel_de_vendas(D)",
    "expr": "[list(D.columns), len(D), D.index.tolist()[:3]]", "expected": [["data", "regiao", "categoria", "ticket"], 10, [0, 1, 2]],
    "name": "A tabela recebida não muda" }
]
```

### Soluções erradas
```python name="agrupa pelo mês e perde fevereiro"
import matplotlib.pyplot as plt


def painel_de_vendas(df):
    fig, axs = plt.subplots(2, 2, figsize=(10, 7))
    mensal = df.groupby(df["data"].dt.to_period("M"))["ticket"].sum()
    mensal.plot(ax=axs[0, 0])
    axs[0, 0].set_title("Vendas por mês")
    por_regiao = df.groupby("regiao")["ticket"].sum().sort_values(ascending=False)
    axs[0, 1].bar(por_regiao.index, por_regiao.values)
    axs[0, 1].set_title("Vendas por região")
    axs[1, 0].hist(df["ticket"], bins=8)
    axs[1, 0].set_title("Distribuição do ticket")
    categorias = sorted(df["categoria"].unique())
    axs[1, 1].boxplot([df.loc[df["categoria"] == c, "ticket"] for c in categorias], tick_labels=categorias)
    axs[1, 1].set_title("Ticket por categoria")
    fig.suptitle("Painel de vendas")
    fig.tight_layout()
    return fig
```
```python name="linha mensal sem ax="
import matplotlib.pyplot as plt


def painel_de_vendas(df):
    fig, axs = plt.subplots(2, 2, figsize=(10, 7))
    mensal = df.set_index("data")["ticket"].resample("ME").sum()
    mensal.plot()
    axs[0, 0].set_title("Vendas por mês")
    por_regiao = df.groupby("regiao")["ticket"].sum().sort_values(ascending=False)
    axs[0, 1].bar(por_regiao.index, por_regiao.values)
    axs[0, 1].set_title("Vendas por região")
    axs[1, 0].hist(df["ticket"], bins=8)
    axs[1, 0].set_title("Distribuição do ticket")
    categorias = sorted(df["categoria"].unique())
    axs[1, 1].boxplot([df.loc[df["categoria"] == c, "ticket"] for c in categorias], tick_labels=categorias)
    axs[1, 1].set_title("Ticket por categoria")
    fig.suptitle("Painel de vendas")
    fig.tight_layout()
    return fig
```
```python name="barras no painel de baixo"
import matplotlib.pyplot as plt


def painel_de_vendas(df):
    fig, axs = plt.subplots(2, 2, figsize=(10, 7))
    mensal = df.set_index("data")["ticket"].resample("ME").sum()
    mensal.plot(ax=axs[0, 0])
    axs[0, 0].set_title("Vendas por mês")
    por_regiao = df.groupby("regiao")["ticket"].sum().sort_values(ascending=False)
    axs[1, 0].bar(por_regiao.index, por_regiao.values)
    axs[0, 1].set_title("Vendas por região")
    axs[1, 0].hist(df["ticket"], bins=8)
    axs[1, 0].set_title("Distribuição do ticket")
    categorias = sorted(df["categoria"].unique())
    axs[1, 1].boxplot([df.loc[df["categoria"] == c, "ticket"] for c in categorias], tick_labels=categorias)
    axs[1, 1].set_title("Ticket por categoria")
    fig.suptitle("Painel de vendas")
    fig.tight_layout()
    return fig
```
```python name="regiões em ordem alfabética"
import matplotlib.pyplot as plt


def painel_de_vendas(df):
    fig, axs = plt.subplots(2, 2, figsize=(10, 7))
    mensal = df.set_index("data")["ticket"].resample("ME").sum()
    mensal.plot(ax=axs[0, 0])
    axs[0, 0].set_title("Vendas por mês")
    por_regiao = df.groupby("regiao")["ticket"].sum()
    axs[0, 1].bar(por_regiao.index, por_regiao.values)
    axs[0, 1].set_title("Vendas por região")
    axs[1, 0].hist(df["ticket"], bins=8)
    axs[1, 0].set_title("Distribuição do ticket")
    categorias = sorted(df["categoria"].unique())
    axs[1, 1].boxplot([df.loc[df["categoria"] == c, "ticket"] for c in categorias], tick_labels=categorias)
    axs[1, 1].set_title("Ticket por categoria")
    fig.suptitle("Painel de vendas")
    fig.tight_layout()
    return fig
```
```python name="histograma com as faixas padrão"
import matplotlib.pyplot as plt


def painel_de_vendas(df):
    fig, axs = plt.subplots(2, 2, figsize=(10, 7))
    mensal = df.set_index("data")["ticket"].resample("ME").sum()
    mensal.plot(ax=axs[0, 0])
    axs[0, 0].set_title("Vendas por mês")
    por_regiao = df.groupby("regiao")["ticket"].sum().sort_values(ascending=False)
    axs[0, 1].bar(por_regiao.index, por_regiao.values)
    axs[0, 1].set_title("Vendas por região")
    axs[1, 0].hist(df["ticket"])
    axs[1, 0].set_title("Distribuição do ticket")
    categorias = sorted(df["categoria"].unique())
    axs[1, 1].boxplot([df.loc[df["categoria"] == c, "ticket"] for c in categorias], tick_labels=categorias)
    axs[1, 1].set_title("Ticket por categoria")
    fig.suptitle("Painel de vendas")
    fig.tight_layout()
    return fig
```
```python name="categorias na ordem em que aparecem"
import matplotlib.pyplot as plt


def painel_de_vendas(df):
    fig, axs = plt.subplots(2, 2, figsize=(10, 7))
    mensal = df.set_index("data")["ticket"].resample("ME").sum()
    mensal.plot(ax=axs[0, 0])
    axs[0, 0].set_title("Vendas por mês")
    por_regiao = df.groupby("regiao")["ticket"].sum().sort_values(ascending=False)
    axs[0, 1].bar(por_regiao.index, por_regiao.values)
    axs[0, 1].set_title("Vendas por região")
    axs[1, 0].hist(df["ticket"], bins=8)
    axs[1, 0].set_title("Distribuição do ticket")
    categorias = list(df["categoria"].unique())
    axs[1, 1].boxplot([df.loc[df["categoria"] == c, "ticket"] for c in categorias], tick_labels=categorias)
    axs[1, 1].set_title("Ticket por categoria")
    fig.suptitle("Painel de vendas")
    fig.tight_layout()
    return fig
```
```python name="plt.title no lugar de suptitle"
import matplotlib.pyplot as plt


def painel_de_vendas(df):
    fig, axs = plt.subplots(2, 2, figsize=(10, 7))
    mensal = df.set_index("data")["ticket"].resample("ME").sum()
    mensal.plot(ax=axs[0, 0])
    axs[0, 0].set_title("Vendas por mês")
    por_regiao = df.groupby("regiao")["ticket"].sum().sort_values(ascending=False)
    axs[0, 1].bar(por_regiao.index, por_regiao.values)
    axs[0, 1].set_title("Vendas por região")
    axs[1, 0].hist(df["ticket"], bins=8)
    axs[1, 0].set_title("Distribuição do ticket")
    categorias = sorted(df["categoria"].unique())
    axs[1, 1].boxplot([df.loc[df["categoria"] == c, "ticket"] for c in categorias], tick_labels=categorias)
    axs[1, 1].set_title("Ticket por categoria")
    plt.title("Painel de vendas")
    fig.tight_layout()
    return fig
```

## Passo 7 · Quiz · Painéis

### Pergunta
```python
fig, axs = plt.subplots(2, 2, sharey=True)
for ax, regiao in zip(axs, ["Centro", "Leste", "Norte", "Sul"]):
    ax.plot(dias, vendas[regiao])
```
O programa para com `AttributeError: 'numpy.ndarray' object has no attribute 'plot'`. Qual é a correção?
- [ ] Trocar `sharey=True` por `sharex=True`
- [x] Percorrer `axs.flat`, que entrega os quatro painéis um a um
- [ ] Trocar `ax.plot` por `plt.plot`, que funciona com arrays
- [ ] Usar `plt.subplots(2, 2, squeeze=False)`
> Numa grade 2 × 2, `axs` é uma matriz, e percorrê-la diretamente entrega as **linhas** da grade, que são arrays com dois painéis cada; daí o erro. `axs.flat` entrega cada painel, na ordem de leitura. O compartilhamento de eixo não muda a forma de `axs`. `plt.plot` desenharia tudo no Axes atual, o último. E `squeeze=False` só muda grades com dimensão 1: a 2 × 2 já é uma matriz.

### Pergunta
```python
fig, axs = plt.subplots(1, 2)
receita.plot()
pedidos.plot(ax=axs[0])
```
`receita` e `pedidos` são duas Series com índice de datas. Onde cada linha aparece?
- [ ] As duas no painel da esquerda
- [ ] `receita` numa figura nova e `pedidos` no painel da esquerda
- [x] `receita` no painel da direita e `pedidos` no da esquerda
- [ ] `receita` no painel da esquerda, porque é o primeiro, e `pedidos` também
> Uma Series sem `ax=` desenha no Axes atual do pyplot, que depois de `plt.subplots(1, 2)` é o último criado: o da direita. Quem abre uma figura nova sem `ax=` é o `.plot` de um DataFrame. O `pedidos.plot(ax=axs[0])` vai para onde foi mandado, a esquerda. Para não depender do "atual", passe sempre `ax=`.

### Pergunta
Uma figura tem dois painéis lado a lado: à esquerda, a receita mensal em mil reais (entre 40 e 60); à direita, o número de pedidos (entre 800 e 2 000). Foi criada com `plt.subplots(1, 2, sharey=True)`, e a curva da receita virou uma linha reta colada no chão. O que fazer?
- [x] Tirar o `sharey`: as duas medidas têm unidades diferentes, e cada painel precisa da sua escala, com a unidade no rótulo
- [ ] Manter o `sharey` e pôr os dois eixos em escala log
- [ ] Trocar para `sharex=True`, que compartilha o eixo dos valores
- [ ] Chamar `fig.tight_layout()`, que reajusta os limites dos painéis
> Compartilhar o eixo y só faz sentido quando os painéis medem a mesma coisa; aqui a escala de 0 a 2 000 esmaga uma série que varia entre 40 e 60. Com escala log compartilhada, as duas continuam em unidades diferentes no mesmo eixo, e a receita continua achatada. `sharex` é o eixo das datas, que já é o mesmo. E o `tight_layout` só ajusta os espaços entre os painéis, não os limites.
