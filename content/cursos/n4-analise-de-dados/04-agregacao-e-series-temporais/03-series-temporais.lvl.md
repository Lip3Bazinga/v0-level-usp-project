---
slug: n4-m4-03-series-temporais
titulo: 'Séries temporais: resample, rolling e deslocamento'
descricao: Índice de datas, seleção por período, reamostragem (diário → mensal), médias móveis, shift e variação percentual, sazonalidade básica.
dificuldade: intermediario
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- pandas
xp: 120
tempo_min: 50
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Indexar por datas, selecionar períodos e reamostrar com resample
- Calcular médias móveis, variação percentual e acumulados com rolling, pct_change e cumsum
- Comparar períodos (ano contra ano) e identificar sazonalidade simples por mês ou dia da semana
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** `DatetimeIndex`, `df.loc["2025-03"]`, `resample("ME").sum()`, `asfreq` e lacunas, `rolling(7).mean()`, `shift(1)`, `pct_change`, `cumsum`, `diff`; médias móveis para suavizar; sazonalidade por `dt.month`/`dayofweek` com `groupby`; comparação ano contra ano; aviso sobre dados faltantes em fins de semana.

**Exercícios previstos.** `total_mensal(df)` (`expr` dicionário mês → total); `media_movel(serie, janela)` (`expr` + `tolerance`); `variacao_ano_contra_ano(serie_mensal)` (`expr`); `perfil_semanal(df)` média por dia da semana em ordem seg→dom (`expr`); `preencher_lacunas_diarias(serie)` com `asfreq` + `ffill` (`expr`); quiz sobre `resample` vs `rolling`.

**Erros comuns a cobrir.** Índice de datas como texto (seleção por período falha); `rolling` sem `min_periods` gerando `NaN` iniciais inesperados; `pct_change` em série com zeros; `resample` em coluna não indexada por data.
