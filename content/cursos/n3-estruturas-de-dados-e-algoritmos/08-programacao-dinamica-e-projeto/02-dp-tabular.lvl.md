---
slug: n3-m8-02-dp-tabular
titulo: Programação dinâmica tabular
descricao: 'Preencher tabelas de baixo para cima: mochila 0/1, soma máxima de subarranjo, subsequência crescente mais longa e reconstrução da solução.'
dificuldade: intermediario
tipo: guiada
runtime: python
bibliotecas: []
xp: 130
tempo_min: 55
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Converter uma solução memoizada em tabela iterativa e reduzir memória quando possível
- Resolver mochila 0/1, Kadane e LIS com DP tabular
- Reconstruir a solução (quais itens, qual subsequência) a partir da tabela
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Da recursão à ordem de preenchimento; mochila 0/1 com tabela n × W e versão com uma linha (percorrendo W ao contrário); Kadane como DP de uma dimensão; LIS em O(n²) e a versão O(n log n) com `bisect` (patience); reconstrução com tabela de escolhas; estimativa de custo pela dimensão da tabela.

**Exercícios previstos.** `mochila(pesos, valores, capacidade)` devolvendo valor e itens escolhidos (`call` com 200 itens e capacidade 10^4, limite de tempo); `mochila_1d` (`call` + verificação de memória via `expr` do tamanho da tabela); `soma_maxima_subarranjo(lista)` com índices (`call`); `lis(lista)` em O(n log n) para 10^5 elementos (`call` com limite de tempo); quiz sobre a ordem de preenchimento.

**Erros comuns a cobrir.** Percorrer W crescente na versão 1D (item usado duas vezes); tabela indexada com off-by-one; reconstrução sem guardar as escolhas; LIS devolvendo o tamanho da tabela em vez da subsequência.
