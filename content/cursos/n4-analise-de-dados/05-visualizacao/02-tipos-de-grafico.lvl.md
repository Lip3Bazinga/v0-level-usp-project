---
slug: n4-m5-02-tipos-de-grafico
titulo: Tipos de gráfico e quando usar cada um
descricao: Linha para tendência, barras para categorias, histograma e boxplot para distribuição, dispersão para relação, e o que não usar (pizza).
dificuldade: intermediario
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- pandas
- matplotlib
xp: 120
tempo_min: 50
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Escolher o tipo de gráfico adequado ao tipo de pergunta e de variável
- Construir barras (inclusive agrupadas e horizontais), histogramas, boxplots e dispersões com matplotlib
- Ajustar bins, escalas (log) e ordenação de categorias para a leitura correta
---

## Passo 1 · Leitura · Pergunta → gráfico

Uma papelaria fictícia com cinco filiais (Centro, Norte, Sul, Leste e Oeste) guarda as vendas de um ano. Antes de escolher o gráfico, escreva a **pergunta**: o tipo de gráfico sai dela, e não do gosto de quem desenha.

| Pergunta | Exemplo | Gráfico |
|---|---|---|
| Comparar categorias | total vendido por filial | barras, ordenadas pelo valor |
| Ver a distribuição de uma variável | valor de cada compra | histograma ou boxplot |
| Relacionar duas variáveis numéricas | preço do caderno × unidades vendidas | dispersão |
| Acompanhar a evolução no tempo | vendas de cada mês | linha |

Cada tipo tem um método no Axes, sempre num Axes próprio:

```python
ax.bar(filiais, totais)          # comparar categorias
ax.hist(compras, bins=12)        # distribuição
ax.scatter(precos, unidades)     # relação
ax.plot(meses, vendas_do_mes)    # evolução
```

Nas **barras**, o olho compara comprimentos a partir de uma base comum, e é isso que ele faz melhor. Ordenar pelo valor deixa a resposta à vista: a maior filial primeiro, a menor por último. A exceção são categorias com ordem natural (meses, faixas de idade), que mantêm essa ordem. Nomes longos ficam melhores em barras horizontais (`ax.barh`), e `ax.bar_label(barras)` escreve o valor em cima de cada barra.

A **linha** só faz sentido quando o eixo x tem ordem e o intervalo entre os pontos significa algo, como no tempo. Ligar as filiais por uma linha sugere uma tendência entre Centro e Norte que não existe: a ordem delas no eixo foi uma escolha de quem desenhou.

A **pizza** pede ao leitor que compare ângulos e áreas, e erramos bastante nisso. Com três fatias de 34 %, 33 % e 33 %, ninguém diz qual é a maior sem ler os números; com doze fatias, a legenda vira um jogo de achar a cor. As mesmas porcentagens em barras horizontais ordenadas respondem na hora. A próxima lição reescreve uma pizza assim.

Para ordenar barras, use o que o módulo de numpy ensinou: `np.argsort(-valores, kind="stable")` dá os índices do maior para o menor, e no empate mantém primeiro quem veio antes. Inverter `np.argsort(valores)` também ordena do maior para o menor, mas inverte a ordem dos empatados.

## Passo 2 · Exercício · Barras ordenadas
modo: lacunas

Complete as lacunas (`___`) para desenhar o total de cada filial em barras verticais, da maior para a menor.

### Instruções
1. `barras_ordenadas(categorias, valores)` devolve `(fig, ax)` com uma barra vertical por categoria.
2. As barras ficam em ordem decrescente de valor; no empate, a categoria que veio primeiro na entrada fica à esquerda.
3. Cada barra tem o rótulo da sua categoria e a altura do seu valor.
4. As listas recebidas não mudam.

### Código inicial
```python
import numpy as np
import matplotlib.pyplot as plt


def barras_ordenadas(categorias, valores):
    valores = np.asarray(valores, dtype=float)
    ordem = ___
    rotulos = [categorias[i] for i in ordem]
    fig, ax = plt.subplots()
    ax.___(___, valores[ordem])
    return fig, ax
```

### Solução
```python
import numpy as np
import matplotlib.pyplot as plt


def barras_ordenadas(categorias, valores):
    valores = np.asarray(valores, dtype=float)
    ordem = np.argsort(-valores, kind="stable")
    rotulos = [categorias[i] for i in ordem]
    fig, ax = plt.subplots()
    ax.bar(rotulos, valores[ordem])
    return fig, ax
```

### Dicas
1. `argsort` ordena do menor para o maior; o sinal de menos inverte o critério sem inverter os empates.
2. Barras verticais e horizontais são dois métodos diferentes do Axes.
3. Os rótulos precisam seguir a mesma ordem das alturas.

### Verificação
```json
[
  { "id": "tipos", "checkpoint": 1, "kind": "expr",
    "setup": "import matplotlib.pyplot as plt\nplt.close(\"all\")\nr = barras_ordenadas([\"Centro\", \"Norte\", \"Sul\", \"Leste\", \"Oeste\"], [42.0, 18.5, 61.0, 27.0, 35.5])",
    "expr": "[type(parte).__name__ for parte in r]", "expected": ["Figure", "Axes"], "name": "Devolve (fig, ax)" },
  { "id": "quantas", "checkpoint": 1, "kind": "expr",
    "setup": "import matplotlib.pyplot as plt\nplt.close(\"all\")\nfig, ax = barras_ordenadas([\"Centro\", \"Norte\", \"Sul\", \"Leste\", \"Oeste\"], [42.0, 18.5, 61.0, 27.0, 35.5])",
    "expr": "[len(ax.patches), len(ax.lines)]", "expected": [5, 0],
    "name": "Uma barra por filial, sem linhas", "hint": "Categorias se comparam com retângulos, não com pontos ligados." },
  { "id": "ordem-rotulos", "checkpoint": 2, "kind": "expr",
    "setup": "import matplotlib.pyplot as plt\nplt.close(\"all\")\nfig, ax = barras_ordenadas([\"Centro\", \"Norte\", \"Sul\", \"Leste\", \"Oeste\"], [42.0, 18.5, 61.0, 27.0, 35.5])",
    "expr": "[t.get_text() for t in ax.get_xticklabels()]", "expected": ["Sul", "Centro", "Oeste", "Leste", "Norte"],
    "name": "As filiais da maior para a menor", "hint": "Os rótulos do eixo x precisam seguir a ordem das alturas." },
  { "id": "ordem-alturas", "checkpoint": 3, "kind": "expr",
    "setup": "import matplotlib.pyplot as plt\nplt.close(\"all\")\nfig, ax = barras_ordenadas([\"Centro\", \"Norte\", \"Sul\", \"Leste\", \"Oeste\"], [42.0, 18.5, 61.0, 27.0, 35.5])",
    "expr": "[float(p.get_height()) for p in ax.patches]", "expected": [61.0, 42.0, 35.5, 27.0, 18.5], "tolerance": 1e-9,
    "name": "As alturas em ordem decrescente" },
  { "id": "empate", "checkpoint": 2, "kind": "expr",
    "setup": "import matplotlib.pyplot as plt\nplt.close(\"all\")\nfig, ax = barras_ordenadas([\"Norte\", \"Sul\", \"Leste\", \"Oeste\"], [30.0, 50.0, 30.0, 10.0])",
    "expr": "[t.get_text() for t in ax.get_xticklabels()]", "expected": ["Sul", "Norte", "Leste", "Oeste"],
    "name": "No empate, quem veio primeiro fica à esquerda", "hint": "Inverter uma ordenação crescente também inverte os empatados." },
  { "id": "inteiros", "checkpoint": 3, "kind": "expr",
    "setup": "import matplotlib.pyplot as plt\nplt.close(\"all\")\nfig, ax = barras_ordenadas([\"a\", \"b\", \"c\"], [3, 9, 6])",
    "expr": "[[t.get_text() for t in ax.get_xticklabels()], [float(p.get_height()) for p in ax.patches]]",
    "expected": [["b", "c", "a"], [9.0, 6.0, 3.0]], "name": "Valores inteiros também funcionam" },
  { "id": "uma", "checkpoint": 3, "kind": "expr",
    "setup": "import matplotlib.pyplot as plt\nplt.close(\"all\")\nfig, ax = barras_ordenadas([\"Centro\"], [42.0])",
    "expr": "[[t.get_text() for t in ax.get_xticklabels()], [float(p.get_height()) for p in ax.patches]]",
    "expected": [["Centro"], [42.0]], "name": "Uma filial só" },
  { "id": "intacta", "checkpoint": 4, "kind": "expr",
    "setup": "import matplotlib.pyplot as plt\nplt.close(\"all\")\nC = [\"Centro\", \"Norte\", \"Sul\"]\nV = [42.0, 18.5, 61.0]\nfig, ax = barras_ordenadas(C, V)",
    "expr": "[C, V]", "expected": [["Centro", "Norte", "Sul"], [42.0, 18.5, 61.0]], "name": "As listas recebidas não mudam" }
]
```

### Soluções erradas
```python name="ordem crescente"
import numpy as np
import matplotlib.pyplot as plt


def barras_ordenadas(categorias, valores):
    valores = np.asarray(valores, dtype=float)
    ordem = np.argsort(valores, kind="stable")
    rotulos = [categorias[i] for i in ordem]
    fig, ax = plt.subplots()
    ax.bar(rotulos, valores[ordem])
    return fig, ax
```
```python name="inverte a ordem crescente"
import numpy as np
import matplotlib.pyplot as plt


def barras_ordenadas(categorias, valores):
    valores = np.asarray(valores, dtype=float)
    ordem = np.argsort(valores)[::-1]
    rotulos = [categorias[i] for i in ordem]
    fig, ax = plt.subplots()
    ax.bar(rotulos, valores[ordem])
    return fig, ax
```
```python name="barras horizontais"
import numpy as np
import matplotlib.pyplot as plt


def barras_ordenadas(categorias, valores):
    valores = np.asarray(valores, dtype=float)
    ordem = np.argsort(-valores, kind="stable")
    rotulos = [categorias[i] for i in ordem]
    fig, ax = plt.subplots()
    ax.barh(rotulos, valores[ordem])
    return fig, ax
```
```python name="linha ligando categorias"
import numpy as np
import matplotlib.pyplot as plt


def barras_ordenadas(categorias, valores):
    valores = np.asarray(valores, dtype=float)
    ordem = np.argsort(-valores, kind="stable")
    rotulos = [categorias[i] for i in ordem]
    fig, ax = plt.subplots()
    ax.plot(rotulos, valores[ordem])
    return fig, ax
```
```python name="rótulos na ordem original"
import numpy as np
import matplotlib.pyplot as plt


def barras_ordenadas(categorias, valores):
    valores = np.asarray(valores, dtype=float)
    ordem = np.argsort(-valores, kind="stable")
    rotulos = [categorias[i] for i in ordem]
    fig, ax = plt.subplots()
    ax.bar(categorias, valores[ordem])
    return fig, ax
```

## Passo 3 · Leitura · Distribuições: hist e boxplot

O gerente quer saber como se distribui o valor das compras: a maioria gasta pouco? Há compras muito grandes? Um **histograma** divide o eixo x em faixas (*bins*) e desenha um retângulo por faixa, com a altura igual à quantidade de valores que caíram nela.

```python
fig, ax = plt.subplots()
contagens, bordas, retangulos = ax.hist(compras, bins=12)
ax.set_xlabel("valor da compra (R$)")
ax.set_ylabel("frequência")
```

`ax.hist` devolve três coisas: as contagens, as bordas das faixas (uma a mais que as contagens) e os retângulos, que também ficam em `ax.patches`. Com `bins=12`, são 12 faixas de mesma largura entre o menor e o maior valor; sem `bins`, o padrão é 10. Também dá para passar as bordas: `bins=[0, 20, 40, 80]` cria três faixas. Cada faixa inclui a borda da esquerda e exclui a da direita, menos a última, que inclui as duas: o maior valor nunca fica de fora.

A quantidade de faixas muda a história. Com 200 faixas para 40 compras, quase todas ficam com 0 ou 1, e o desenho vira um pente sem forma. Com 3 faixas, uma distribuição com dois picos parece ter um só. Experimente alguns valores e escolha o que mostra a forma sem inventar detalhes. `density=True` troca a contagem pela densidade (a área total vira 1), útil para comparar grupos de tamanhos diferentes, mas o eixo y deixa de ser "quantas compras".

O **boxplot** resume a mesma distribuição em cinco números: a caixa vai do primeiro ao terceiro quartil, a linha no meio é a mediana, os bigodes vão até o último valor dentro de 1,5 IQR da caixa (a regra da lição de outliers) e os pontos além disso são desenhados soltos. Ele brilha na comparação de grupos lado a lado:

```python
ax.boxplot([centro, norte, sul], tick_labels=["Centro", "Norte", "Sul"])
```

O parâmetro antigo `labels` ainda funciona, com o aviso `MatplotlibDeprecationWarning: The 'labels' parameter of boxplot() has been renamed 'tick_labels' since Matplotlib 3.9; support for the old name will be dropped in 3.11.` Cada caixa acrescenta 7 linhas a `ax.lines`: a caixa, dois bigodes, duas pontas, a mediana e os pontos soltos.

Um cuidado: o `boxplot` não ignora `NaN`. Um grupo com um ausente sai com mediana `nan` e a caixa some do desenho, sem erro. Passe `serie.dropna()` para cada grupo.

## Passo 4 · Previsão · Quantos retângulos o hist desenha

O programa desenha histogramas dos mesmos sete valores com faixas diferentes e um boxplot de dois grupos. Leia sem executar e digite exatamente o que ele imprime.

### Código
```python
import matplotlib.pyplot as plt

dados = [1, 2, 2, 3, 3, 3, 9]

fig, ax = plt.subplots()
contagens, bordas, retangulos = ax.hist(dados, bins=4)
print(len(ax.patches), contagens.tolist())
print(bordas.tolist())

fig, ax = plt.subplots()
ax.hist(dados, bins=[0, 3, 10])
print([float(p.get_height()) for p in ax.patches])

fig, ax = plt.subplots()
ax.hist(dados)
print(len(ax.patches))

fig, ax = plt.subplots()
ax.boxplot([dados, [5, 6, 7]], tick_labels=["A", "B"])
print(len(ax.lines), [t.get_text() for t in ax.get_xticklabels()])
```

### Dicas
1. Com `bins=4`, as quatro faixas têm a mesma largura e vão do menor ao maior valor.
2. Cada faixa inclui a borda da esquerda; só a última inclui também a da direita.
3. Sem `bins`, o padrão é 10 faixas; cada caixa do boxplot tem 7 linhas.

### Saída esperada
```text
4 [3.0, 3.0, 0.0, 1.0]
[1.0, 3.0, 5.0, 7.0, 9.0]
[3.0, 4.0]
10
14 ['A', 'B']
```

## Passo 5 · Exercício · Histograma e boxplot

Duas funções para o relatório da papelaria: a distribuição do valor das compras e a comparação das filiais.

### Instruções
1. `histograma(dados, bins)` devolve `(fig, ax)` com um histograma de `dados`; `bins` pode ser o número de faixas ou a lista de bordas, e a altura de cada retângulo é a contagem da faixa.
2. No histograma, o rótulo do eixo y é `"frequência"`.
3. `boxplot_por_grupo(df, coluna, grupo)` devolve `(fig, ax)` com uma caixa por valor de `df[grupo]`, em ordem alfabética, e o nome de cada grupo como marca do eixo x.
4. Cada caixa resume os valores de `coluna` daquele grupo, sem os ausentes (`NaN`).
5. O rótulo do eixo y do boxplot é o nome da coluna, e `df` não muda.

### Código inicial
```python
import matplotlib.pyplot as plt


def histograma(dados, bins):
    pass


def boxplot_por_grupo(df, coluna, grupo):
    pass
```

### Solução
```python
import matplotlib.pyplot as plt


def histograma(dados, bins):
    fig, ax = plt.subplots()
    ax.hist(dados, bins=bins)
    ax.set_ylabel("frequência")
    return fig, ax


def boxplot_por_grupo(df, coluna, grupo):
    grupos = sorted(df[grupo].unique())
    valores = [df.loc[df[grupo] == nome, coluna].dropna() for nome in grupos]
    fig, ax = plt.subplots()
    ax.boxplot(valores, tick_labels=grupos)
    ax.set_ylabel(coluna)
    return fig, ax
```

### Dicas
1. O número de retângulos do histograma é o número de faixas.
2. Os nomes das marcas e as listas de valores precisam sair da mesma lista de grupos, na mesma ordem.
3. A mediana de uma lista com `NaN` é `nan`.

### Verificação
```json
[
  { "id": "h-tipos", "checkpoint": 1, "kind": "expr",
    "setup": "import matplotlib.pyplot as plt\nplt.close(\"all\")\nr = histograma([12.0, 15.5, 18.0, 22.0, 25.0, 31.0, 33.5, 38.0, 41.0, 47.0, 52.0, 75.0], 5)",
    "expr": "[type(parte).__name__ for parte in r]", "expected": ["Figure", "Axes"], "name": "histograma devolve (fig, ax)" },
  { "id": "h-bins", "checkpoint": 1, "kind": "expr",
    "setup": "import matplotlib.pyplot as plt\nplt.close(\"all\")\nfig, ax = histograma([12.0, 15.5, 18.0, 22.0, 25.0, 31.0, 33.5, 38.0, 41.0, 47.0, 52.0, 75.0], 5)",
    "expr": "[float(p.get_height()) for p in ax.patches]", "expected": [4.0, 3.0, 3.0, 1.0, 1.0],
    "name": "Com bins=5, cinco faixas com as contagens certas", "hint": "Use o número de faixas recebido, e a altura é uma contagem." },
  { "id": "h-bordas", "checkpoint": 1, "kind": "expr",
    "setup": "import matplotlib.pyplot as plt\nplt.close(\"all\")\nfig, ax = histograma([12.0, 15.5, 18.0, 22.0, 25.0, 31.0, 33.5, 38.0, 41.0, 47.0, 52.0, 75.0], [0, 20, 40, 80])",
    "expr": "[float(p.get_height()) for p in ax.patches]", "expected": [3.0, 5.0, 4.0],
    "name": "Com a lista de bordas, três faixas" },
  { "id": "h-total", "checkpoint": 1, "kind": "expr",
    "setup": "import matplotlib.pyplot as plt\nplt.close(\"all\")\nfig, ax = histograma([1.0, 2.0, 2.5, 3.0, 8.0, 8.5, 9.0, 9.5], 4)",
    "expr": "[len(ax.patches), sum(float(p.get_height()) for p in ax.patches)]", "expected": [4, 8.0],
    "name": "As alturas somam o número de valores" },
  { "id": "h-rotulo", "checkpoint": 2, "kind": "expr",
    "setup": "import matplotlib.pyplot as plt\nplt.close(\"all\")\nfig, ax = histograma([1.0, 2.0, 3.0], 3)",
    "expr": "ax.get_ylabel()", "expected": "frequência", "name": "O eixo y se chama frequência" },
  { "id": "b-ordem", "checkpoint": 3, "kind": "expr",
    "setup": "import numpy as np\nimport pandas as pd\nimport matplotlib.pyplot as plt\nplt.close(\"all\")\nD = pd.DataFrame({\"filial\": [\"Sul\", \"Centro\", \"Norte\", \"Sul\", \"Centro\", \"Norte\", \"Sul\", \"Centro\", \"Norte\", \"Sul\"], \"ticket\": [30.0, 12.0, 50.0, 34.0, 18.0, np.nan, 40.0, 20.0, 46.0, 36.0]})\nfig, ax = boxplot_por_grupo(D, \"ticket\", \"filial\")",
    "expr": "[t.get_text() for t in ax.get_xticklabels()]", "expected": ["Centro", "Norte", "Sul"],
    "name": "As filiais em ordem alfabética", "hint": "A ordem em que os grupos aparecem na tabela não é alfabética." },
  { "id": "b-caixas", "checkpoint": 3, "kind": "expr",
    "setup": "import numpy as np\nimport pandas as pd\nimport matplotlib.pyplot as plt\nplt.close(\"all\")\nD = pd.DataFrame({\"filial\": [\"Sul\", \"Centro\", \"Norte\", \"Sul\", \"Centro\", \"Norte\", \"Sul\", \"Centro\", \"Norte\", \"Sul\"], \"ticket\": [30.0, 12.0, 50.0, 34.0, 18.0, np.nan, 40.0, 20.0, 46.0, 36.0]})\nfig, ax = boxplot_por_grupo(D, \"ticket\", \"filial\")",
    "expr": "len(ax.lines)", "expected": 21, "name": "Três caixas, com 7 linhas cada" },
  { "id": "b-medianas", "checkpoint": 4, "kind": "expr",
    "setup": "import numpy as np\nimport pandas as pd\nimport matplotlib.pyplot as plt\nplt.close(\"all\")\nD = pd.DataFrame({\"filial\": [\"Sul\", \"Centro\", \"Norte\", \"Sul\", \"Centro\", \"Norte\", \"Sul\", \"Centro\", \"Norte\", \"Sul\"], \"ticket\": [30.0, 12.0, 50.0, 34.0, 18.0, np.nan, 40.0, 20.0, 46.0, 36.0]})\nfig, ax = boxplot_por_grupo(D, \"ticket\", \"filial\")",
    "expr": "[float(ax.lines[7 * i + 5].get_ydata()[0]) for i in range(3)]", "expected": [18.0, 48.0, 35.0], "tolerance": 1e-9,
    "name": "A mediana de cada caixa é a da sua filial, sem os ausentes",
    "hint": "Confira se cada caixa recebeu os valores do grupo escrito embaixo dela, e o que um NaN faz com a mediana." },
  { "id": "b-um-grupo", "checkpoint": 3, "kind": "expr",
    "setup": "import pandas as pd\nimport matplotlib.pyplot as plt\nplt.close(\"all\")\nD = pd.DataFrame({\"filial\": [\"Leste\", \"Leste\", \"Leste\"], \"ticket\": [10.0, 30.0, 20.0]})\nfig, ax = boxplot_por_grupo(D, \"ticket\", \"filial\")",
    "expr": "[[t.get_text() for t in ax.get_xticklabels()], float(ax.lines[5].get_ydata()[0])]", "expected": [["Leste"], 20.0],
    "name": "Uma filial só" },
  { "id": "b-rotulo", "checkpoint": 5, "kind": "expr",
    "setup": "import numpy as np\nimport pandas as pd\nimport matplotlib.pyplot as plt\nplt.close(\"all\")\nD = pd.DataFrame({\"filial\": [\"Sul\", \"Centro\", \"Norte\", \"Sul\", \"Centro\", \"Norte\", \"Sul\", \"Centro\", \"Norte\", \"Sul\"], \"ticket\": [30.0, 12.0, 50.0, 34.0, 18.0, np.nan, 40.0, 20.0, 46.0, 36.0]})\nfig, ax = boxplot_por_grupo(D, \"ticket\", \"filial\")",
    "expr": "ax.get_ylabel()", "expected": "ticket", "name": "O eixo y tem o nome da coluna medida" },
  { "id": "b-intacto", "checkpoint": 5, "kind": "expr",
    "setup": "import numpy as np\nimport pandas as pd\nimport matplotlib.pyplot as plt\nplt.close(\"all\")\nD = pd.DataFrame({\"filial\": [\"Sul\", \"Centro\", \"Norte\", \"Sul\", \"Centro\", \"Norte\", \"Sul\", \"Centro\", \"Norte\", \"Sul\"], \"ticket\": [30.0, 12.0, 50.0, 34.0, 18.0, np.nan, 40.0, 20.0, 46.0, 36.0]})\nfig, ax = boxplot_por_grupo(D, \"ticket\", \"filial\")",
    "expr": "[len(D), int(D[\"ticket\"].isna().sum()), D[\"filial\"].tolist()[:3]]", "expected": [10, 1, ["Sul", "Centro", "Norte"]],
    "name": "A tabela recebida não muda" }
]
```

### Soluções erradas
```python name="ignora os bins"
import matplotlib.pyplot as plt


def histograma(dados, bins):
    fig, ax = plt.subplots()
    ax.hist(dados)
    ax.set_ylabel("frequência")
    return fig, ax


def boxplot_por_grupo(df, coluna, grupo):
    grupos = sorted(df[grupo].unique())
    valores = [df.loc[df[grupo] == nome, coluna].dropna() for nome in grupos]
    fig, ax = plt.subplots()
    ax.boxplot(valores, tick_labels=grupos)
    ax.set_ylabel(coluna)
    return fig, ax
```
```python name="densidade no lugar da contagem"
import matplotlib.pyplot as plt


def histograma(dados, bins):
    fig, ax = plt.subplots()
    ax.hist(dados, bins=bins, density=True)
    ax.set_ylabel("frequência")
    return fig, ax


def boxplot_por_grupo(df, coluna, grupo):
    grupos = sorted(df[grupo].unique())
    valores = [df.loc[df[grupo] == nome, coluna].dropna() for nome in grupos]
    fig, ax = plt.subplots()
    ax.boxplot(valores, tick_labels=grupos)
    ax.set_ylabel(coluna)
    return fig, ax
```
```python name="uma barra por valor"
import matplotlib.pyplot as plt


def histograma(dados, bins):
    fig, ax = plt.subplots()
    ax.bar(range(len(dados)), dados)
    ax.set_ylabel("frequência")
    return fig, ax


def boxplot_por_grupo(df, coluna, grupo):
    grupos = sorted(df[grupo].unique())
    valores = [df.loc[df[grupo] == nome, coluna].dropna() for nome in grupos]
    fig, ax = plt.subplots()
    ax.boxplot(valores, tick_labels=grupos)
    ax.set_ylabel(coluna)
    return fig, ax
```
```python name="grupos na ordem em que aparecem"
import matplotlib.pyplot as plt


def histograma(dados, bins):
    fig, ax = plt.subplots()
    ax.hist(dados, bins=bins)
    ax.set_ylabel("frequência")
    return fig, ax


def boxplot_por_grupo(df, coluna, grupo):
    grupos = list(df[grupo].unique())
    valores = [df.loc[df[grupo] == nome, coluna].dropna() for nome in grupos]
    fig, ax = plt.subplots()
    ax.boxplot(valores, tick_labels=grupos)
    ax.set_ylabel(coluna)
    return fig, ax
```
```python name="nomes ordenados, valores não"
import matplotlib.pyplot as plt


def histograma(dados, bins):
    fig, ax = plt.subplots()
    ax.hist(dados, bins=bins)
    ax.set_ylabel("frequência")
    return fig, ax


def boxplot_por_grupo(df, coluna, grupo):
    grupos = df[grupo].unique()
    valores = [df.loc[df[grupo] == nome, coluna].dropna() for nome in grupos]
    fig, ax = plt.subplots()
    ax.boxplot(valores, tick_labels=sorted(grupos))
    ax.set_ylabel(coluna)
    return fig, ax
```
```python name="não tira os ausentes"
import matplotlib.pyplot as plt


def histograma(dados, bins):
    fig, ax = plt.subplots()
    ax.hist(dados, bins=bins)
    ax.set_ylabel("frequência")
    return fig, ax


def boxplot_por_grupo(df, coluna, grupo):
    grupos = sorted(df[grupo].unique())
    valores = [df.loc[df[grupo] == nome, coluna] for nome in grupos]
    fig, ax = plt.subplots()
    ax.boxplot(valores, tick_labels=grupos)
    ax.set_ylabel(coluna)
    return fig, ax
```
```python name="eixo y com o nome do grupo"
import matplotlib.pyplot as plt


def histograma(dados, bins):
    fig, ax = plt.subplots()
    ax.hist(dados, bins=bins)
    ax.set_ylabel("frequência")
    return fig, ax


def boxplot_por_grupo(df, coluna, grupo):
    grupos = sorted(df[grupo].unique())
    valores = [df.loc[df[grupo] == nome, coluna].dropna() for nome in grupos]
    fig, ax = plt.subplots()
    ax.boxplot(valores, tick_labels=grupos)
    ax.set_ylabel(grupo)
    return fig, ax
```

## Passo 6 · Leitura · Relações e escalas

Para saber se cadernos mais caros vendem menos, cada produto vira um ponto: preço no eixo x, unidades no y. É a **dispersão**:

```python
fig, ax = plt.subplots()
ax.scatter(precos, unidades, s=estoque, c="#0072B2", alpha=0.6)
ax.set_xlabel("preço (R$)")
ax.set_ylabel("unidades vendidas")
```

`s` controla a **área** de cada ponto (um número para todos ou um por ponto), o que acrescenta uma terceira variável; `c` é a cor; `alpha` deixa os pontos translúcidos, e onde muitos se sobrepõem a mancha fica mais escura. Os pontos ficam numa coleção: `ax.collections[0].get_offsets()` devolve os pares `(x, y)`. Não troque a dispersão por `ax.plot(precos, unidades)`: a linha liga os produtos na ordem da tabela e desenha um zigue-zague sem significado.

Agora, o faturamento anual de oito lojas fictícias vai de R\$ 2 mil a R\$ 900 mil. Em escala linear, a maior barra ocupa o eixo inteiro e as quatro menores viram riscos rentes ao chão. Em **escala logarítmica**, cada marca do eixo vale dez vezes a anterior (1 mil, 10 mil, 100 mil), e lojas de tamanhos muito diferentes cabem no mesmo desenho:

```python
ax.bar(lojas, faturamento)
ax.set_yscale("log")
ax.set_ylabel("faturamento (R$, escala log)")
```

Diga no rótulo que a escala é log: quem lê pela altura acha que a maior loja vende "o dobro" da média quando vende cem vezes mais. E cuidado com zero e negativos. O logaritmo de zero não existe, e o matplotlib não reclama: uma barra de altura 0 numa escala log simplesmente não aparece, e o eixo começa perto do menor valor positivo. O leitor nunca fica sabendo que existia uma loja sem faturamento. Por isso, antes de pôr um eixo em log, confira que todos os valores são positivos e, se não forem, escolha outra forma de mostrar (por exemplo, separe os zeros e diga quantos são). A escala `"symlog"` aceita zero e negativos, mas é difícil de ler e fica para casos especiais.

Por fim, cor com significado. Pintar cada barra de uma cor não diz nada; pintar todas de cinza e só a filial em análise de laranja (`color=["#999999", "#E69F00", "#999999"]`) diz "olhe esta". A próxima lição volta às cores, pensando em quem não distingue vermelho de verde.

## Passo 7 · Exercício · Dispersão e escala log

Duas funções: uma dispersão com rótulos e barras em escala log que recusam valores impossíveis de mostrar.

### Instruções
1. `dispersao(x, y, rotulo_x, rotulo_y)` devolve `(fig, ax)` com um único conjunto de pontos (`scatter`), um ponto por par `(x[i], y[i])`, e nenhuma linha.
2. Os eixos da dispersão têm os rótulos `rotulo_x` e `rotulo_y`.
3. `barras_log(categorias, valores)` devolve `(fig, ax)` com uma barra vertical por categoria, na ordem recebida, com o eixo y em escala logarítmica.
4. Se algum valor for zero ou negativo, `barras_log` levanta `ValueError` com uma mensagem que contenha `"positivos"`, antes de criar qualquer figura.

### Código inicial
```python
import matplotlib.pyplot as plt


def dispersao(x, y, rotulo_x, rotulo_y):
    pass


def barras_log(categorias, valores):
    pass
```

### Solução
```python
import matplotlib.pyplot as plt


def dispersao(x, y, rotulo_x, rotulo_y):
    fig, ax = plt.subplots()
    ax.scatter(x, y)
    ax.set_xlabel(rotulo_x)
    ax.set_ylabel(rotulo_y)
    return fig, ax


def barras_log(categorias, valores):
    if any(v <= 0 for v in valores):
        raise ValueError("a escala log só mostra valores positivos")
    fig, ax = plt.subplots()
    ax.bar(categorias, valores)
    ax.set_yscale("log")
    return fig, ax
```

### Dicas
1. Pontos soltos ficam em `ax.collections`; o que `plot` desenha fica em `ax.lines`.
2. Escala log no eixo das alturas, não no das categorias; os valores continuam os originais.
3. Zero também não tem logaritmo; valide antes de abrir a figura.

### Verificação
```json
[
  { "id": "d-colecao", "checkpoint": 1, "kind": "expr",
    "setup": "import matplotlib.pyplot as plt\nplt.close(\"all\")\nfig, ax = dispersao([12.0, 8.5, 20.0, 15.0], [130, 210, 45, 90], \"preço (R$)\", \"unidades vendidas\")",
    "expr": "[len(ax.collections), len(ax.lines)]", "expected": [1, 0],
    "name": "Um conjunto de pontos e nenhuma linha", "hint": "Uma linha ligaria os produtos na ordem da tabela." },
  { "id": "d-pontos", "checkpoint": 1, "kind": "expr",
    "setup": "import matplotlib.pyplot as plt\nplt.close(\"all\")\nfig, ax = dispersao([12.0, 8.5, 20.0, 15.0], [130, 210, 45, 90], \"preço (R$)\", \"unidades vendidas\")",
    "expr": "ax.collections[0].get_offsets().tolist()", "expected": [[12.0, 130.0], [8.5, 210.0], [20.0, 45.0], [15.0, 90.0]],
    "name": "Cada ponto é um par (preço, unidades)", "hint": "O primeiro argumento vai para o eixo x." },
  { "id": "d-rotulos", "checkpoint": 2, "kind": "expr",
    "setup": "import matplotlib.pyplot as plt\nplt.close(\"all\")\nfig, ax = dispersao([12.0, 8.5, 20.0, 15.0], [130, 210, 45, 90], \"preço (R$)\", \"unidades vendidas\")",
    "expr": "[ax.get_xlabel(), ax.get_ylabel()]", "expected": ["preço (R$)", "unidades vendidas"], "name": "Os rótulos dos dois eixos" },
  { "id": "l-escala", "checkpoint": 3, "kind": "expr",
    "setup": "import matplotlib.pyplot as plt\nplt.close(\"all\")\nfig, ax = barras_log([\"A\", \"B\", \"C\", \"D\"], [2000, 45000, 900000, 12000])",
    "expr": "[ax.get_yscale(), ax.get_xscale()]", "expected": ["log", "linear"],
    "name": "O eixo y está em escala log, o x não", "hint": "As alturas estão no eixo y." },
  { "id": "l-alturas", "checkpoint": 3, "kind": "expr",
    "setup": "import matplotlib.pyplot as plt\nplt.close(\"all\")\nfig, ax = barras_log([\"A\", \"B\", \"C\", \"D\"], [2000, 45000, 900000, 12000])",
    "expr": "[float(p.get_height()) for p in ax.patches]", "expected": [2000.0, 45000.0, 900000.0, 12000.0],
    "name": "As alturas são os valores originais, na ordem recebida", "hint": "Quem transforma é a escala; os dados não mudam." },
  { "id": "l-rotulos", "checkpoint": 3, "kind": "expr",
    "setup": "import matplotlib.pyplot as plt\nplt.close(\"all\")\nfig, ax = barras_log([\"A\", \"B\", \"C\", \"D\"], [2000, 45000, 900000, 12000])",
    "expr": "[t.get_text() for t in ax.get_xticklabels()]", "expected": ["A", "B", "C", "D"], "name": "As categorias na ordem recebida" },
  { "id": "l-zero", "checkpoint": 4, "kind": "expr",
    "setup": "import matplotlib.pyplot as plt\nplt.close(\"all\")",
    "expr": "barras_log([\"A\", \"B\", \"C\"], [2000, 0, 900000])", "raises": "ValueError", "message_contains": "positivos",
    "name": "Um valor zero é recusado", "hint": "Zero não tem logaritmo: a barra sumiria sem aviso." },
  { "id": "l-negativo", "checkpoint": 4, "kind": "expr",
    "setup": "import matplotlib.pyplot as plt\nplt.close(\"all\")",
    "expr": "barras_log([\"A\", \"B\"], [-5, 10])", "raises": "ValueError", "message_contains": "positivos",
    "name": "Um valor negativo é recusado" },
  { "id": "l-sem-figura", "checkpoint": 4, "kind": "expr",
    "setup": "import matplotlib.pyplot as plt\nplt.close(\"all\")\ntry:\n    barras_log([\"A\", \"B\"], [0, 10])\nexcept ValueError:\n    pass",
    "expr": "len(plt.get_fignums())", "expected": 0,
    "name": "Nenhuma figura fica aberta quando os valores são recusados", "hint": "Valide antes de criar a figura." }
]
```

### Soluções erradas
```python name="linha no lugar de pontos"
import matplotlib.pyplot as plt


def dispersao(x, y, rotulo_x, rotulo_y):
    fig, ax = plt.subplots()
    ax.plot(x, y)
    ax.set_xlabel(rotulo_x)
    ax.set_ylabel(rotulo_y)
    return fig, ax


def barras_log(categorias, valores):
    if any(v <= 0 for v in valores):
        raise ValueError("a escala log só mostra valores positivos")
    fig, ax = plt.subplots()
    ax.bar(categorias, valores)
    ax.set_yscale("log")
    return fig, ax
```
```python name="x e y trocados"
import matplotlib.pyplot as plt


def dispersao(x, y, rotulo_x, rotulo_y):
    fig, ax = plt.subplots()
    ax.scatter(y, x)
    ax.set_xlabel(rotulo_x)
    ax.set_ylabel(rotulo_y)
    return fig, ax


def barras_log(categorias, valores):
    if any(v <= 0 for v in valores):
        raise ValueError("a escala log só mostra valores positivos")
    fig, ax = plt.subplots()
    ax.bar(categorias, valores)
    ax.set_yscale("log")
    return fig, ax
```
```python name="rótulos trocados"
import matplotlib.pyplot as plt


def dispersao(x, y, rotulo_x, rotulo_y):
    fig, ax = plt.subplots()
    ax.scatter(x, y)
    ax.set_xlabel(rotulo_y)
    ax.set_ylabel(rotulo_x)
    return fig, ax


def barras_log(categorias, valores):
    if any(v <= 0 for v in valores):
        raise ValueError("a escala log só mostra valores positivos")
    fig, ax = plt.subplots()
    ax.bar(categorias, valores)
    ax.set_yscale("log")
    return fig, ax
```
```python name="log no eixo x"
import matplotlib.pyplot as plt


def dispersao(x, y, rotulo_x, rotulo_y):
    fig, ax = plt.subplots()
    ax.scatter(x, y)
    ax.set_xlabel(rotulo_x)
    ax.set_ylabel(rotulo_y)
    return fig, ax


def barras_log(categorias, valores):
    if any(v <= 0 for v in valores):
        raise ValueError("a escala log só mostra valores positivos")
    fig, ax = plt.subplots()
    ax.bar(categorias, valores)
    ax.set_xscale("log")
    return fig, ax
```
```python name="desenha o logaritmo dos valores"
import numpy as np
import matplotlib.pyplot as plt


def dispersao(x, y, rotulo_x, rotulo_y):
    fig, ax = plt.subplots()
    ax.scatter(x, y)
    ax.set_xlabel(rotulo_x)
    ax.set_ylabel(rotulo_y)
    return fig, ax


def barras_log(categorias, valores):
    if any(v <= 0 for v in valores):
        raise ValueError("a escala log só mostra valores positivos")
    fig, ax = plt.subplots()
    ax.bar(categorias, np.log10(valores))
    return fig, ax
```
```python name="deixa o zero passar"
import matplotlib.pyplot as plt


def dispersao(x, y, rotulo_x, rotulo_y):
    fig, ax = plt.subplots()
    ax.scatter(x, y)
    ax.set_xlabel(rotulo_x)
    ax.set_ylabel(rotulo_y)
    return fig, ax


def barras_log(categorias, valores):
    if any(v < 0 for v in valores):
        raise ValueError("a escala log só mostra valores positivos")
    fig, ax = plt.subplots()
    ax.bar(categorias, valores)
    ax.set_yscale("log")
    return fig, ax
```
```python name="valida depois de abrir a figura"
import matplotlib.pyplot as plt


def dispersao(x, y, rotulo_x, rotulo_y):
    fig, ax = plt.subplots()
    ax.scatter(x, y)
    ax.set_xlabel(rotulo_x)
    ax.set_ylabel(rotulo_y)
    return fig, ax


def barras_log(categorias, valores):
    fig, ax = plt.subplots()
    if any(v <= 0 for v in valores):
        raise ValueError("a escala log só mostra valores positivos")
    ax.bar(categorias, valores)
    ax.set_yscale("log")
    return fig, ax
```

## Passo 8 · Quiz · Qual gráfico para esta pergunta

### Pergunta
O gerente pergunta: "o valor das 2 000 compras de novembro tem uma cauda de compras muito grandes?". Qual gráfico responde melhor?
- [ ] Uma linha com o valor de cada compra, na ordem do número do pedido
- [x] Um histograma do valor das compras, com rótulo e unidade no eixo x
- [ ] Uma pizza com a fatia de cada faixa de valor
- [ ] Barras com uma barra por compra, ordenadas pelo valor
> A pergunta é sobre a distribuição de uma variável, e o histograma mostra a forma dela, inclusive a cauda (um boxplot também serviria). A linha liga pedidos cuja ordem não significa nada; a pizza obriga a comparar ângulos e esconde a ordem das faixas; 2 000 barras viram uma mancha, e ordenadas ainda escondem quantas compras há em cada faixa de valor.

### Pergunta
Com 40 medidas de um sensor, `ax.hist(medidas, bins=200)` produziu um desenho com quase todos os retângulos de altura 0 ou 1. O que fazer?
- [ ] Passar `density=True`, que corrige a altura dos retângulos
- [x] Usar bem menos faixas (algo perto de 6 a 10) e comparar algumas escolhas
- [ ] Pôr o eixo y em escala log para os retângulos baixos aparecerem
- [ ] Trocar o histograma por uma linha ligando as 40 medidas
> Com mais faixas do que medidas, cada faixa recebe 0 ou 1 valor e a forma da distribuição some. Menos faixas agrupam os valores e a forma reaparece. `density=True` só reescala o eixo y: os retângulos continuam com 0 ou 1 medida. A escala log nem desenha as faixas com 0. A linha liga as medidas na ordem em que chegaram, que não é a pergunta.

### Pergunta
Um relatório traz uma pizza com as vendas de 12 categorias de produto, cinco delas com fatias entre 7 % e 9 %. O leitor precisa dizer qual dessas cinco vendeu mais. Qual reescrita ajuda?
- [ ] A mesma pizza em 3D, com as fatias destacadas
- [ ] A pizza com uma legenda maior, ao lado
- [x] Barras horizontais ordenadas da maior para a menor, com a porcentagem escrita em cada uma
- [ ] Uma linha ligando as 12 categorias em ordem alfabética
> Comprimentos a partir de uma base comum são fáceis de comparar, e a ordenação põe a resposta em sequência; a porcentagem escrita resolve diferenças pequenas. O 3D distorce as áreas (a fatia da frente parece maior); a legenda maior não muda a dificuldade de comparar ângulos parecidos; e a linha sugere uma tendência entre categorias cuja ordem alfabética não significa nada.
