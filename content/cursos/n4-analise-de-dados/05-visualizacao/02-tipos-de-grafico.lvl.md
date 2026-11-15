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
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Escolher o tipo de gráfico adequado ao tipo de pergunta e de variável
- Construir barras (inclusive agrupadas e horizontais), histogramas, boxplots e dispersões com matplotlib
- Ajustar bins, escalas (log) e ordenação de categorias para a leitura correta
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Tabela pergunta → gráfico; `bar/barh` com categorias ordenadas por valor, `hist` com bins e densidade, `boxplot` por grupo, `scatter` com tamanho e cor, escala log para dados assimétricos; por que a pizza engana e a alternativa (barras); anotar valores nas barras; cores com significado (uma cor de destaque).

**Exercícios previstos.** `barras_ordenadas(categorias, valores)` (`expr` conferindo a ordem dos ticks e as alturas via `ax.patches`); `histograma(dados, bins)` (`expr` conferindo `len(ax.patches)`); `boxplot_por_grupo(df, coluna, grupo)` (`expr`); `dispersao(x, y)` com rótulos (`expr` com `ax.collections`); quiz 'qual gráfico para esta pergunta'.

**Erros comuns a cobrir.** Barras com eixo y que não começa em zero; histograma com bins demais/de menos; linha ligando categorias sem ordem; pizza com 12 fatias.
