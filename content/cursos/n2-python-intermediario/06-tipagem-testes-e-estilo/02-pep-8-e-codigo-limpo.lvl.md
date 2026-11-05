---
slug: n2-m6-02-pep-8-e-codigo-limpo
titulo: PEP 8 e código limpo
descricao: Nomes, espaçamento, tamanho de funções, comentários úteis, ferramentas (ruff, black) e refatorações pequenas.
dificuldade: intermediario
tipo: guiada
runtime: python
bibliotecas: []
xp: 90
tempo_min: 35
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Aplicar as regras principais da PEP 8 (nomes, indentação, linhas, importações)
- Refatorar funções longas em funções pequenas com nomes que dizem o que fazem
- Usar um formatador e um linter e explicar a diferença entre eles
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** As regras que importam no dia a dia (snake_case, PascalCase, CONSTANTES, 4 espaços, 79/99 colunas, imports no topo em grupos, espaços ao redor de operadores, `is None`); nomes reveladores; função faz uma coisa; comentários explicam "por quê", não "o quê"; números mágicos em constantes; `black`/`ruff` em um parágrafo (sem rodar no sandbox, mostrar saída).

**Exercícios previstos.** Refatorar `f(x,y)` com nomes de uma letra e laço de 40 linhas em três funções nomeadas (`call` para cada + `source defines_function` × 3); substituir números mágicos por constantes nomeadas (`variable` das constantes + `call`); quiz "qual nome segue a PEP 8" e "qual comentário é útil".

**Erros comuns a cobrir.** Nomes como `dados2`, `temp`, `x1`; comentário repetindo o código; funções de 100 linhas; `== None`; importação no meio do arquivo.
