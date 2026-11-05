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
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Gerar gráficos direto de Series e DataFrames com .plot e seus tipos
- Montar figuras com vários painéis (subplots) com eixos compartilhados e layout ajustado
- Produzir um painel de quatro gráficos a partir de uma mesma tabela
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** `df.plot(kind=...)`, `df.plot.bar(stacked=True)`, `serie.plot()` com índice de datas; `plt.subplots(2, 2, sharex=True)`, `ax` como array, `fig.tight_layout()`, `fig.suptitle`; passar `ax=` para o pandas; pequenos múltiplos para comparar grupos.

**Exercícios previstos.** `painel_de_vendas(df)` com 4 painéis (linha mensal, barras por região, histograma de ticket, boxplot por categoria) (`expr` conferindo `len(fig.axes) == 4` e os títulos); `pequenos_multiplos(df, grupo)` (`expr`); `barras_empilhadas(tabela)` (`expr`); quiz sobre `sharex` e `tight_layout`.

**Erros comuns a cobrir.** Esquecer `ax=` e criar figuras soltas; `ax[0]` em grade 2×2 (`ax[0, 0]`); rótulos sobrepostos sem `tight_layout`; datas no eixo sem ordenar.
