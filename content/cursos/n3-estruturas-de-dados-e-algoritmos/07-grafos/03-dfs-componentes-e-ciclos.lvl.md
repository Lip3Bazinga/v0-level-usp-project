---
slug: n3-m7-03-dfs-componentes-e-ciclos
titulo: DFS, componentes conexos e detecção de ciclos
descricao: Busca em profundidade recursiva e iterativa, componentes conexos, detecção de ciclo em grafos direcionados (cores) e não direcionados, e bipartição.
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
- Implementar DFS recursiva e iterativa e explicar a ordem de visita
- Encontrar componentes conexos e detectar ciclos em grafos direcionados e não direcionados
- Verificar se um grafo é bipartido com coloração em duas cores
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** DFS recursiva (e o limite de recursão em grafos grandes → iterativa com pilha); tempos de entrada/saída; componentes conexos rotulando; ciclo em não direcionado (aresta para visitado que não é o pai) e em direcionado (branco/cinza/preto: aresta para cinza); bipartição por 2-coloração via BFS/DFS; preenchimento de regiões (flood fill) em imagens.

**Exercícios previstos.** `dfs_ordem(grafo, origem)` (`call`); `componentes(grafo)` devolvendo lista de listas ordenadas (`call`); `tem_ciclo_direcionado(grafo)` com cores (`call`); `tem_ciclo_nao_direcionado(grafo)` (`call`); `eh_bipartido(grafo)` (`call`); `contar_ilhas(grade)` (`call` com grade 500×500 e DFS iterativa obrigatória por tempo/recursão); quiz.

**Erros comuns a cobrir.** Detectar ciclo em não direcionado sem excluir o pai; usar 'visitado' booleano para ciclo em direcionado (falso positivo com arestas cruzadas); DFS iterativa marcando visitado ao empilhar e produzindo ordem diferente da recursiva (o enunciado define qual ordem é esperada).
