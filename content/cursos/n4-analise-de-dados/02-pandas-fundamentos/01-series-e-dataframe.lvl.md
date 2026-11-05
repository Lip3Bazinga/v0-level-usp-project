---
slug: n4-m2-01-series-e-dataframe
titulo: Series e DataFrame
descricao: As duas estruturas do pandas, índices, dtypes, criação a partir de dicionários e listas, head/info/describe.
dificuldade: intermediario
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- pandas
xp: 100
tempo_min: 40
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Criar Series e DataFrames a partir de listas e dicionários e inspecioná-los (shape, dtypes, head, describe)
- Explicar o papel do índice e alinhar operações entre Series pelo índice
- Converter entre DataFrame, dicionário e array numpy
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** `pd.Series` com índice rotulado, operações alinhadas pelo índice (e `NaN` quando falta); `pd.DataFrame` de dicionário de listas e de lista de dicionários; `columns`, `index`, `dtypes`, `shape`, `head`, `info`, `describe`; `to_dict`, `to_numpy`, `set_index`/`reset_index`; dtypes `object` vs `string`, `category` citado.

**Exercícios previstos.** `criar_tabela_de_alunos(dados)` com colunas na ordem exigida (`expr` conferindo `list(df.columns)` e `df.shape`); `resumo(df)` devolvendo dicionário com média e máximo por coluna numérica (`call`); alinhamento de duas Series com índices diferentes registrando em `soma_alinhada` (`expr` `to_dict`); `para_registros(df)` (`call`); quiz sobre índice e `NaN` no alinhamento.

**Erros comuns a cobrir.** Esquecer que operações alinham por índice (resultado cheio de `NaN`); colunas com tamanhos diferentes no dicionário (`ValueError`); confundir `df["col"]` (Series) com `df[["col"]]` (DataFrame).
