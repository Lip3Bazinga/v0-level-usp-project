---
slug: n4-m2-03-filtros-e-ordenacao
titulo: Filtros, ordenação e consultas
descricao: Máscaras booleanas em DataFrames, isin, between, str.contains, query, sort_values por várias colunas e nlargest.
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
- Filtrar linhas combinando condições com &, |, ~, isin, between e métodos de string
- Ordenar por uma ou mais colunas com direções diferentes
- Responder perguntas de negócio simples com filtros e nlargest/nsmallest
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Máscaras com parênteses; `isin`, `between`, `.str.contains(case=False)`, `.str.startswith`; `query("idade > 30 and cidade == 'SP'")`; `sort_values(["a", "b"], ascending=[False, True])`; `nlargest`; `value_counts`; encadear com `.pipe` citado; um conjunto de dados de vendas embutido no enunciado.

**Exercícios previstos.** `clientes_sp_acima_de(df, idade)` (`call` devolvendo lista de ids); `produtos_com(df, termo)` insensível a maiúsculas (`call`); `top_vendedores(df, n)` ordenando por total decrescente e nome (`call`); `faixa_de_preco(df, minimo, maximo)` com `between` (`call`); quiz sobre `~` e `isin`.

**Erros comuns a cobrir.** `and`/`or` em máscaras; `sort_values` sem `ascending` como lista; `str.contains` com regex especial (`.`, `(`) sem `regex=False`; filtrar e esquecer `reset_index`.
