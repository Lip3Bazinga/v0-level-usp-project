---
slug: n3-m6-03-heaps-e-filas-de-prioridade
titulo: Heaps e filas de prioridade
descricao: Heap binário em lista, subir e descer, heapify em O(n), heap sort, heapq e aplicações (top-k, fundir k listas, agenda de eventos).
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
- Implementar um min-heap em lista com inserção e extração em O(log n) e heapify em O(n)
- Usar heapq para top-k, fusão de k listas e agendamento por prioridade
- Explicar por que heap sort é O(n log n) e in-place, e comparar com BST para filas de prioridade
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Índices pai/filhos (`(i-1)//2`, `2i+1`, `2i+2`); propriedade de heap; `subir` e `descer`; `construir` em O(n) (de baixo para cima, prova informal); heap sort; `heapq` (`heappush`, `heappop`, `heapify`, `nlargest`, `merge`); max-heap por negação ou tupla `(prioridade, contador, item)` para estabilidade; aplicações: k maiores de 10^6, mediana em fluxo com dois heaps, simulação de eventos — e Dijkstra no próximo módulo.

**Exercícios previstos.** Classe `MinHeap` (`expr` com sequência de operações + `expr` verificando o invariante em todos os índices); `heap_sort(lista)` (`call` + `source not_calls sorted`); `k_maiores(lista, k)` em O(n log k) com `heapq` (`call` com 10^6 elementos e limite de tempo); `fundir_k_listas(listas)` (`call`); `mediana_em_fluxo(valores)` (`call`); quiz.

**Erros comuns a cobrir.** Descer trocando com o filho errado (deve ser o menor); `heapify` pela ordem errada; tupla com item não comparável em empate (`TypeError`) — usar contador; esquecer que `heapq` é min-heap.
