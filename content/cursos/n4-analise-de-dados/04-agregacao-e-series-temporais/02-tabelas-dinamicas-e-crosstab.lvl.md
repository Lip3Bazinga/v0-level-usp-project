---
slug: n4-m4-02-tabelas-dinamicas-e-crosstab
titulo: Tabelas dinâmicas e tabelas de contingência
descricao: pivot_table com aggfunc, margins e fill_value, crosstab com normalização e a leitura de tabelas de dupla entrada.
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
- Construir tabelas dinâmicas com linhas, colunas, valores e totais
- Produzir tabelas de contingência com proporções por linha ou coluna
- Ler uma tabela de dupla entrada e extrair comparações corretas (evitando o paradoxo de Simpson)
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** `pivot_table(index, columns, values, aggfunc, margins, fill_value)`; `crosstab(a, b, normalize="index")`; porcentagens que somam 100 na direção certa; o paradoxo de Simpson com um exemplo real (admissões, tratamentos) como aviso sobre agregação; formatação para relatório (`round`, `style` citado).

**Exercícios previstos.** `vendas_mes_por_regiao(df)` com totais (`expr`); `proporcao_por_linha(df, a, b)` (`expr` + `tolerance`); `simpson(df)` devolvendo as taxas agregadas e por grupo que se invertem (`call`); quiz de leitura de tabela.

**Erros comuns a cobrir.** `normalize` na direção errada; `pivot_table` com `aggfunc` padrão (média) quando se queria soma; comparar grupos de tamanhos muito diferentes sem olhar o n.
