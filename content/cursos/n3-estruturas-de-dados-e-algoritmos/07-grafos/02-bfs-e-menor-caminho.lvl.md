---
slug: n3-m7-02-bfs-e-menor-caminho
titulo: BFS e menor caminho sem pesos
descricao: Busca em largura com fila, distâncias por camadas, reconstrução do caminho com predecessores, e BFS em grades e em estados.
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
- Implementar BFS com deque e conjunto de visitados e produzir distâncias e predecessores
- Reconstruir o menor caminho e provar informalmente por que BFS o encontra
- Aplicar BFS a labirintos em grade e a espaços de estados (quebra-cabeças)
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Fila, visitados ao enfileirar (não ao desenfileirar), camadas = distâncias; predecessores e reconstrução invertida; BFS em grade (labirinto) com movimentos 4-direções; BFS em estados (jarros de água, trocar uma letra por vez); BFS multi-fonte; custo O(V + E); comparação com DFS para 'existe caminho'.

**Exercícios previstos.** `bfs(grafo, origem)` devolvendo distâncias (`call`); `menor_caminho(grafo, origem, destino)` (`call` com caminhos inexistentes → `None`); `resolver_labirinto(grade)` com `#` e `.` (`call`); `menor_numero_de_trocas(inicio, fim, dicionario)` em escada de palavras (`call`); `distancia_ate_mais_proximo(grade, alvos)` multi-fonte (`call`); quiz sobre visitado ao enfileirar.

**Erros comuns a cobrir.** Marcar visitado ao desenfileirar (duplicatas na fila, custo explode); usar pilha (vira DFS); lista como fila (`pop(0)`); reconstruir o caminho sem inverter.
