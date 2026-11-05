---
slug: n3-m5-02-filas-e-deque
titulo: Filas e deque
descricao: FIFO com collections.deque, fila circular com array fixo, fila de duas pontas e janela deslizante com máximo em O(n).
dificuldade: intermediario
tipo: guiada
runtime: python
bibliotecas: []
xp: 110
tempo_min: 45
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Implementar uma fila circular sobre lista fixa com índices de início e fim
- Usar deque para fila, pilha e rotação com operações O(1) nas duas pontas
- Resolver o problema do máximo em janela deslizante com deque monotônica
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Por que `list.pop(0)` é O(n) e `deque.popleft` é O(1); fila circular com capacidade, `(fim + 1) % capacidade`, cheia vs vazia; `deque(maxlen=k)` para últimos k eventos; simulação de atendimento (fila de banco com tempos); janela deslizante com deque monotônica; BFS como aplicação (próximo módulo).

**Exercícios previstos.** `FilaCircular(capacidade)` com `enfileirar`/`desenfileirar` e `cheia`/`vazia` (`expr` + `raises`); `simular_atendimento(chegadas, duracao)` devolvendo tempo médio de espera (`call` + `tolerance`); `maximo_janela(lista, k)` em O(n) (`call` com 10^5 elementos e limite de tempo; versão O(nk) reprova); `ultimos_k(eventos, k)` com `maxlen` (`call`); quiz.

**Erros comuns a cobrir.** Fila circular sem distinguir cheia de vazia; `insert(0, x)` como enfileirar; deque monotônica removendo pelo lado errado; esquecer de descartar índices fora da janela.
