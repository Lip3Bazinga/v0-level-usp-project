---
slug: n3-m7-04-ordenacao-topologica
titulo: Ordenação topológica
descricao: 'Ordenar tarefas com dependências: algoritmo de Kahn (graus de entrada) e DFS com pós-ordem invertida; detectar impossibilidade.'
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
- Implementar a ordenação topológica por Kahn e por DFS
- Detectar dependências cíclicas e reportá-las
- Aplicar a ordem topológica a grades curriculares, builds e planilhas (células dependentes)
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** DAG; Kahn com fila de grau zero (e fila de prioridade para ordem lexicográfica); DFS com pós-ordem invertida; detecção de ciclo (sobrou vértice); aplicações: pré-requisitos de disciplinas, `make`, dependências de pacotes (`pip`), células de planilha; caminho mais longo em DAG (menor número de semestres).

**Exercícios previstos.** `ordem_topologica_kahn(grafo)` com desempate lexicográfico (`call`); `ordem_topologica_dfs(grafo)` (`call` aceitando qualquer ordem válida via verificação `expr` que checa as restrições); `detectar_ciclo(grafo)` devolvendo um ciclo (`call`); `minimo_de_semestres(prerequisitos)` (`call`); quiz.

**Erros comuns a cobrir.** Esquecer vértices sem arestas; Kahn sem decrementar os graus; DFS sem inverter a pós-ordem; não reportar ciclo e devolver ordem parcial.
