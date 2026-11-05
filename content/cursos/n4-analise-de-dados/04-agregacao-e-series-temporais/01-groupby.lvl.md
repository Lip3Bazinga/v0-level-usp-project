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
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Agrupar por uma ou mais colunas e calcular várias estatísticas com agg nomeado
- Usar transform para criar colunas alinhadas (desvio da média do grupo) e filter para selecionar grupos
- Interpretar o resultado com MultiIndex e achatá-lo com reset_index
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** O modelo split-apply-combine; `groupby("col")["x"].mean()`; `agg(total=("valor", "sum"), media=("valor", "mean"), n=("id", "count"))`; `transform("mean")` para comparar cada linha com seu grupo; `filter(lambda g: len(g) >= 5)`; `size` vs `count`; `groupby` com `pd.Grouper` por mês (gancho); `nunique`; ordenar o resultado.

**Exercícios previstos.** `vendas_por_vendedor(df)` com `agg` nomeado (`expr` `to_dict`); `desvio_da_media_do_grupo(df)` com `transform` (`expr` + `tolerance`); `grupos_frequentes(df, minimo)` com `filter` (`expr`); `ranking_por_categoria(df)` com `rank` dentro do grupo (`expr`); quiz sobre `size` vs `count` e `transform` vs `agg`.

**Erros comuns a cobrir.** `agg` com dicionário gerando colunas MultiIndex difíceis; `count` ignorando `NaN` quando se queria `size`; `apply` lento onde `agg` basta; esquecer `reset_index`.
