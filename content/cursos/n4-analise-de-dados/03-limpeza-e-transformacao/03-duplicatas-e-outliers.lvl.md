---
slug: n4-m3-03-duplicatas-e-outliers
titulo: Duplicatas e outliers
descricao: duplicated/drop_duplicates com subset e keep, detecção de outliers por IQR e z-score, winsorização e a decisão de manter, remover ou marcar.
dificuldade: intermediario
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- pandas
xp: 110
tempo_min: 45
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Identificar duplicatas exatas e por chave e escolher qual registro manter
- Detectar outliers por IQR e z-score e explicar a diferença entre erro de dado e valor extremo legítimo
- Tratar outliers por remoção, limitação (clip) ou marcação
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** `duplicated(subset, keep)`; ordenar antes para manter o mais recente; outliers: regra 1,5·IQR, z-score com média/desvio (sensível aos próprios outliers), mediana/MAD citado; `clip`; boxplot como diagnóstico (gancho); quando um outlier é a resposta (fraude) e não o ruído; registrar decisões.

**Exercícios previstos.** `remover_duplicatas_mais_recente(df)` (`expr`); `outliers_iqr(serie)` devolvendo índices (`call`); `outliers_zscore(serie, limiar)` (`call`); `limitar(df, coluna)` com `clip` nos percentis 1 e 99 (`expr` + `tolerance`); quiz sobre IQR vs z-score.

**Erros comuns a cobrir.** `drop_duplicates()` sem `subset` quando a chave é parcial; remover outliers e recalcular limites repetidamente até não sobrar nada; z-score com desvio zero; apagar outliers sem olhar se são erros.
