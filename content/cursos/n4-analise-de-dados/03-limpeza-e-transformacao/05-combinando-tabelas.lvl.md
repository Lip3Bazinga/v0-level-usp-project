---
slug: n4-m3-05-combinando-tabelas
titulo: 'Combinando tabelas: merge, join e concat'
descricao: Junções inner, left, right e outer, chaves com nomes diferentes, validação de cardinalidade, concat vertical e horizontal.
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
- Combinar tabelas com merge nos quatro tipos de junção e prever o número de linhas
- Usar validate e indicator para diagnosticar junções (muitos-para-muitos acidentais, chaves órfãs)
- Empilhar tabelas com concat e tratar índices e colunas diferentes
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** `merge(on, left_on/right_on, how, suffixes, validate="one_to_many", indicator=True)`; duplicação de linhas em junções muitos-para-muitos; `join` por índice; `concat(axis=0/1, ignore_index, keys)`; checar chaves antes (`isin`, `set` diferença); exemplo: pedidos × clientes × produtos.

**Exercícios previstos.** `pedidos_com_clientes(pedidos, clientes)` left join e contagem de órfãos (`expr`); `prever_linhas(a, b, how)` (`call`); detectar explosão muitos-para-muitos com `validate` e devolver a mensagem (`expr` + `raises MergeError`); `empilhar_meses(lista_de_dfs)` com `keys` (`expr`); quiz sobre `how`.

**Erros comuns a cobrir.** Junção inner silenciosamente descartando linhas; chaves com tipos diferentes (int vs str) não casando; `concat` com colunas desalinhadas gerando `NaN`; sufixos ambíguos.
