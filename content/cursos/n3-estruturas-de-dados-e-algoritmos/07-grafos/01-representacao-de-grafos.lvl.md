---
slug: n3-m7-01-representacao-de-grafos
titulo: Representação de grafos
descricao: Vértices e arestas, direcionado ou não, pesos, lista e matriz de adjacência, grau, e leitura de grafos a partir de arquivos.
dificuldade: intermediario
tipo: guiada
runtime: python
bibliotecas: []
xp: 100
tempo_min: 40
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Modelar problemas reais como grafos (mapas, redes sociais, dependências, tabuleiros)
- Implementar lista e matriz de adjacência e comparar custos de memória e de operações
- Construir um grafo a partir de uma lista de arestas em texto e calcular graus
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Terminologia; exemplos (amizades, voos, pré-requisitos de disciplinas da USP, labirinto em grade); `dict[str, list[str]]` e `dict[str, dict[str, float]]` para pesos; matriz com índices; custo de 'existe aresta?' e 'vizinhos de v' em cada representação; grafos implícitos (vizinhos de uma célula do tabuleiro calculados na hora); grau, grafos densos vs esparsos.

**Exercícios previstos.** `construir_grafo(arestas, direcionado)` (`call`); `grau(grafo, v)` e `graus_de_entrada(grafo)` (`call`); `lista_para_matriz(grafo, vertices)` e vice-versa (`call`); `vizinhos_na_grade(linhas, colunas, i, j)` (`call`); `tem_aresta` em ambas as representações com análise de custo (`call`); quiz.

**Erros comuns a cobrir.** Adicionar aresta só em um sentido em grafo não direcionado; vértices isolados ausentes do dicionário; matriz com índices de vértices não mapeados; arestas duplicadas.
