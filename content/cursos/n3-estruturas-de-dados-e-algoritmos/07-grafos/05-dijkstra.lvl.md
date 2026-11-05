---
slug: n3-m7-05-dijkstra
titulo: 'Dijkstra: menor caminho com pesos'
descricao: Relaxamento, fila de prioridade com heapq, entradas obsoletas, reconstrução do caminho, por que falha com pesos negativos e menção a Bellman-Ford e A*.
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
- Implementar Dijkstra com heapq e tratar entradas obsoletas na fila
- Reconstruir o caminho mínimo e justificar a correção (invariante do vértice extraído)
- Explicar a falha com pesos negativos e descrever Bellman-Ford e A* em linhas gerais
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Distâncias tentativas, relaxamento, extrair o mais próximo com heap, ignorar entradas obsoletas (comparar com a distância atual); custo O((V + E) log V); predecessores; prova informal; contraexemplo com peso negativo; Bellman-Ford (V−1 rodadas) e A* (heurística admissível) como leitura; aplicação: mapa de ruas com tempos, rotas de ônibus, roteamento de rede.

**Exercícios previstos.** `dijkstra(grafo, origem)` devolvendo distâncias (`call` com grafo de 10^4 vértices e limite de tempo; versão O(V²) com lista reprova); `caminho_minimo(grafo, origem, destino)` (`call`); `menor_tempo_de_viagem(ruas, origem, destino)` lendo as arestas de um texto no formato `origem;destino;minutos` (`call`); `bellman_ford(grafo, origem)` detectando ciclo negativo (`call`); quiz sobre entradas obsoletas.

**Erros comuns a cobrir.** Marcar visitado ao inserir no heap; não ignorar entradas obsoletas (resultado certo, mas custo maior — o enunciado mede o número de extrações); relaxar com `<=`; aplicar Dijkstra com pesos negativos.
