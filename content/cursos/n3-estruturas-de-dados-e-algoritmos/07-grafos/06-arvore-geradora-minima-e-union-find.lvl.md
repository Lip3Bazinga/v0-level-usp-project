---
slug: n3-m7-06-arvore-geradora-minima-e-union-find
titulo: Árvore geradora mínima e union-find
descricao: Kruskal com union-find (compressão de caminho e união por tamanho), Prim com heap, e aplicações em redes e agrupamento.
dificuldade: intermediario
tipo: guiada
runtime: python
bibliotecas: []
xp: 120
tempo_min: 50
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Implementar union-find com compressão de caminho e união por tamanho
- Implementar Kruskal e Prim e explicar a propriedade do corte que os justifica
- Aplicar MST a problemas de conexão de custo mínimo e a agrupamento (single-linkage)
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Union-find (`encontrar` com compressão, `unir` por tamanho, custo quase constante); Kruskal: ordenar arestas e unir componentes; Prim: heap de arestas a partir de um vértice; propriedade do corte; aplicações: cabeamento, agrupamento por corte das maiores arestas (gancho para o Nível 5), componentes dinâmicos (conectividade online), detectar ciclo em não direcionado com union-find.

**Exercícios previstos.** Classe `UnionFind` (`expr` com 10^5 operações e limite de tempo); `kruskal(vertices, arestas)` devolvendo custo e arestas (`call`); `prim(grafo, inicio)` (`call`); `agrupar(pontos, k)` cortando as k−1 maiores arestas da MST (`call`); `conectividade_online(n, operacoes)` (`call`); quiz.

**Erros comuns a cobrir.** `encontrar` sem compressão em cadeia longa (tempo estoura); unir sem checar se já estão no mesmo conjunto; Kruskal esquecendo de ordenar; Prim adicionando vértice já na árvore.
