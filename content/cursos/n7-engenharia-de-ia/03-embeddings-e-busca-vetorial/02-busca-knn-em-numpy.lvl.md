---
slug: n7-m3-02-busca-knn-em-numpy
titulo: Busca por vizinhos mais próximos em numpy
descricao: Busca exata por força bruta vetorizada, top-k com argpartition, busca em lote, filtros por metadados e o custo em função do número de documentos.
dificuldade: avancado
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
- Implementar busca exata vetorizada com top-k eficiente (argpartition)
- Combinar busca vetorial com filtros por metadados
- Medir o custo da busca exata e estimar quando um índice aproximado é necessário
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** `E @ q` para todos os documentos; `argpartition` vs `argsort` (reaproveita o Nível 3); busca em lote `E @ Q.T`; filtros pré e pós (metadados em arrays booleanos); classe `IndiceExato` com `adicionar`, `buscar(q, k, filtro)`; medição de tempo vs N e a fronteira dos milhões.

**Exercícios previstos.** `top_k(scores, k)` com `argpartition` e ordem final correta (`call`); classe `IndiceExato` (`expr` com buscas e filtros); `buscar_em_lote(E, Q, k)` (`call` + limite de tempo com 10⁵ × 128); `tempo_por_consulta(n, d)` estimado (`call` + `tolerance`); quiz.

**Erros comuns a cobrir.** `argsort` completo para k pequeno (lento); filtro aplicado depois do top-k (retorna menos de k); embeddings não normalizados com produto interno; cópias do índice a cada busca.
