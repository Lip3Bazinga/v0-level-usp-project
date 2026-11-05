---
slug: n4-m2-04-novas-colunas-e-apply
titulo: Novas colunas, apply, map e operações vetorizadas
descricao: Criar colunas derivadas, assign, apply por linha e por coluna, map com dicionário, np.where e pd.cut para faixas.
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
- Criar colunas derivadas com operações vetorizadas e assign
- Usar map, apply e np.where para transformar valores e explicar o custo de apply por linha
- Discretizar valores em faixas com pd.cut e qcut
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** `df["total"] = df.preco * df.qtd`; `assign`; `Series.map(dicionario)`; `apply` com função (coluna) e `axis=1` (linha, lento); `np.where`/`np.select` para condições; `pd.cut` com rótulos e `qcut` por quantis; `rank`; preferir vetorizado > `map` > `apply`.

**Exercícios previstos.** `adicionar_total_e_desconto(df)` (`expr` + `tolerance`); `faixa_etaria(df)` com `pd.cut` e rótulos exatos (`expr` `value_counts().to_dict()`); `classificar_risco(df)` com `np.select` (`expr`); substituir um `apply(axis=1)` por operação vetorizada mantendo o resultado (`expr` + limite de tempo com 10^6 linhas); quiz sobre `map` vs `apply`.

**Erros comuns a cobrir.** `apply(axis=1)` em tabelas grandes; `cut` com bordas que excluem o mínimo (`right`/`include_lowest`); `map` com chave ausente gerando `NaN` silencioso; alterar a coluna original em vez de criar outra quando o enunciado pede.
