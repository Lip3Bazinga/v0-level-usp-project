---
slug: n4-m6-03-estatistica-descritiva
titulo: Estatística descritiva
descricao: Média, mediana, moda, desvio padrão, quantis, assimetria, resumo de cinco números e a escolha da medida certa para dados assimétricos.
dificuldade: intermediario
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- pandas
- scipy
xp: 100
tempo_min: 40
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Calcular e interpretar medidas de posição e dispersão com numpy e pandas
- Escolher entre média e mediana (e entre desvio e IQR) conforme a assimetria
- Resumir um conjunto de dados em uma tabela e um parágrafo de interpretação
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Medidas, `describe`, `quantile`, `skew`; renda média vs mediana no Brasil (PNAD) como exemplo central; `ddof` (populacional vs amostral); coeficiente de variação; resumo de cinco números e o boxplot; média ponderada; o que um desvio padrão 'significa'.

**Exercícios previstos.** `resumo_descritivo(serie)` devolvendo dicionário com as medidas exatas (`call` + `tolerance`); `medida_central_recomendada(serie)` por regra de assimetria (`call`); `comparar_grupos(df, valor, grupo)` com mediana e IQR por grupo (`expr`); `media_ponderada(valores, pesos)` (`call`); quiz sobre média vs mediana.

**Erros comuns a cobrir.** `np.std` (ddof=0) vs `pd.Series.std` (ddof=1) sem perceber; média em dados com outliers; moda em dados contínuos; interpretar desvio sem a unidade.
