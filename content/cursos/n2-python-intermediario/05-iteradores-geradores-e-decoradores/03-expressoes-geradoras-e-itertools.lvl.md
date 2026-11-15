---
slug: n2-m5-03-expressoes-geradoras-e-itertools
titulo: Expressões geradoras e itertools
descricao: Geradores em uma linha, sum/any/all/max sobre geradores e as ferramentas de itertools para combinar sequências.
dificuldade: intermediario
tipo: guiada
runtime: python
bibliotecas: []
xp: 100
tempo_min: 40
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Escrever expressões geradoras e usá-las com sum, any, all, min e max
- Escolher entre compreensão de lista e expressão geradora conforme o uso
- Usar itertools (count, cycle, islice, chain, groupby, accumulate, takewhile) em pipelines
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** `(x * 2 for x in dados)` vs `[...]`; `sum(x for x in ...)` sem parênteses extras; `any`/`all` com curto-circuito; `itertools.count`, `cycle`, `islice`, `chain`, `accumulate`, `takewhile`, `dropwhile`, `groupby` (ordenado), `pairwise`; quando materializar (`list`) e quando não.

**Exercícios previstos.** `soma_quadrados_pares(n)` com expressão geradora (`call` + `source not_uses list_comprehension`); `primeiro_que(cond, iteravel)` com `next` e padrão (`expr`); `media_movel(valores, k)` com `islice`/`accumulate` ou janela (`call`); `agrupar_consecutivos(lista)` com `groupby` (`call`); quiz "o que imprime" com `any` e gerador esgotado.

**Erros comuns a cobrir.** Reutilizar a expressão geradora; `len(gerador)`; `groupby` sem ordenar; `sum([...])` criando lista desnecessária quando o enunciado pede gerador.
