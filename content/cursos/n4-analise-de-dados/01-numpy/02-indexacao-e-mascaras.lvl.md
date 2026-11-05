---
slug: n4-m1-02-indexacao-e-mascaras
titulo: Indexação, fatias e máscaras booleanas
descricao: Fatias em 2D, visualizações vs cópias, indexação por listas e por condições, np.where e atribuição por máscara.
dificuldade: intermediario
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
xp: 110
tempo_min: 45
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Selecionar linhas, colunas e blocos de arrays 2D e explicar quando a fatia é uma vista
- Filtrar e substituir valores com máscaras booleanas e np.where
- Combinar condições com &, | e ~ e contar elementos que as satisfazem
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** `a[1:3, ::2]`, `a[:, 0]`; fatia é vista (alterar afeta o original) e `.copy()`; indexação por lista de índices (cópia); máscaras (`a > 0`), `&`/`|`/`~` com parênteses, `np.where(cond, x, y)`, `np.nonzero`, `np.any/all`; substituir outliers; `argmax/argsort`.

**Exercícios previstos.** `extrair_bloco(m)` (`call`); demonstrar vista vs cópia preenchendo `vista_altera` e `copia_altera` (`variable`); `substituir_negativos(a, valor)` com máscara (`call` + `source not_uses for`); `clientes_elegiveis(idades, rendas)` com duas condições (`call`); `top_k_indices(a, k)` com `argsort` (`call`); quiz sobre `and` vs `&`.

**Erros comuns a cobrir.** `a[a > 0 and a < 5]` (ValueError: use `&`); esquecer parênteses nas condições; alterar uma fatia e mudar o original sem querer; `where` com um só argumento.
