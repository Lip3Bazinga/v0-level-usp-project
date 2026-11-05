---
slug: n4-m3-04-dados-tidy-melt-e-pivot
titulo: 'Dados tidy: melt, pivot e stack'
descricao: O princípio tidy (uma variável por coluna, uma observação por linha), converter tabelas largas em longas e vice-versa.
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
- Reconhecer tabelas largas e longas e explicar por que o formato longo facilita agregação e gráficos
- Converter entre os formatos com melt e pivot/pivot_table
- Separar e combinar colunas (split/expand, str.cat) para atingir o formato tidy
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Os três princípios tidy (Wickham) com exemplos de planilhas brasileiras (meses como colunas, 'ano_semestre' como uma coluna); `melt(id_vars, value_vars, var_name, value_name)`; `pivot` (chave única) vs `pivot_table` (agrega); `stack/unstack` em uma frase; `str.split(expand=True)`; `MultiIndex` mínimo.

**Exercícios previstos.** `para_longo(df_largo)` (`expr` comparando `to_dict("records")`); `para_largo(df_longo)` (`expr`); `separar_ano_semestre(df)` (`expr`); `tidy_notas(df)` combinando `melt` + conversão numérica (`expr`); quiz sobre `pivot` vs `pivot_table`.

**Erros comuns a cobrir.** `pivot` com chaves duplicadas (`ValueError`); esquecer `id_vars` e perder a chave; valores numéricos virando texto após `melt` de colunas mistas; `unstack` sem resetar o índice.
