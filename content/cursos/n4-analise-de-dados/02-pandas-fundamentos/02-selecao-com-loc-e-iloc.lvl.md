---
slug: n4-m2-02-selecao-com-loc-e-iloc
titulo: Seleção com loc e iloc
descricao: Selecionar por rótulo e por posição, fatias inclusivas no loc, seleção de linhas e colunas simultânea e atribuição sem SettingWithCopyWarning.
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
- Selecionar linhas e colunas com loc (rótulos) e iloc (posições) e prever o tipo do resultado
- Atribuir valores a subconjuntos com loc sem o aviso de cópia
- Usar índices não numéricos (nomes, datas) para seleção
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** `df.loc[linhas, colunas]` e `df.iloc[...]`; fatias inclusivas no `loc`; Series vs DataFrame vs escalar conforme a seleção; `at`/`iat`; o `SettingWithCopyWarning` e a regra 'uma operação `loc` só'; `set_index("nome")` para selecionar por rótulo; seleção por lista de colunas.

**Exercícios previstos.** `selecionar(df)` devolvendo três fatias pedidas (`expr` comparando com `to_dict`); corrigir trecho com `df[df.x > 0]["y"] = 1` para `loc` (`expr` conferindo o resultado + ausência de warning via `warnings` no `setup`); `nota_do_aluno(df, nome, disciplina)` com índice por nome (`call`); quiz sobre inclusividade do `loc`.

**Erros comuns a cobrir.** `df.loc[0:2]` inclusivo surpreendendo; `iloc` com rótulo (`TypeError`); atribuição encadeada; `df["a", "b"]` em vez de `df[["a", "b"]]`.
