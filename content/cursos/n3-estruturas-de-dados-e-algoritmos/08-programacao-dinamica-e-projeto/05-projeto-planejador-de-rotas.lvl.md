---
slug: n3-m8-05-projeto-planejador-de-rotas
titulo: 'Projeto final: planejador de rotas do campus'
descricao: Leia o mapa do campus, encontre caminhos mínimos, ordene visitas com dependências, otimize uma agenda com orçamento de tempo e responda consultas rapidamente.
dificuldade: intermediario
tipo: guiada
runtime: python
bibliotecas: []
xp: 300
tempo_min: 240
publicada: false
projeto: true
solucao_apos_tentativas: 3
objetivos:
- Modelar um mapa real como grafo ponderado e implementar Dijkstra com reconstrução de caminho
- Combinar ordenação topológica, programação dinâmica (mochila) e heaps em um sistema único
- Escolher estruturas de dados que atendam limites de tempo com entradas de dezenas de milhares de nós
- Entregar funções com assinaturas fixas que passam em casos funcionais e de desempenho
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Projeto exigido para o certificado. Entrada: arquivo de texto com locais (nome, tipo) e caminhos (origem, destino, minutos, acessível). Funções exigidas: `carregar_mapa(texto) -> Mapa`, `menor_rota(mapa, origem, destino, apenas_acessivel=False) -> (minutos, caminho)` (Dijkstra com heap), `locais_a_ate(mapa, origem, minutos) -> lista ordenada` (Dijkstra limitado), `ordem_de_visitas(tarefas, dependencias)` (topológica com desempate), `agenda_otima(mapa, origem, tarefas, orcamento_min)` (mochila 0/1 sobre o tempo de deslocamento + duração, maximizando prioridade), `top_k_mais_proximos(mapa, origem, k)` (heap) e `componentes_isolados(mapa)` (union-find ou DFS). Dados de exemplo acompanham o enunciado (campus da USP de Ribeirão Preto simplificado, ~60 locais) e um gerador para testes grandes.

**Passos previstos.** Leitura (especificação, formato, exemplos e critérios) → carregar e representar (`call`) → `menor_rota` com e sem acessibilidade (`call` + limite de tempo em 2×10^4 nós) → `locais_a_ate` e `top_k` (`call`) → `ordem_de_visitas` com ciclo reportado (`call` + `raises`) → `agenda_otima` (`call`) → `componentes_isolados` (`call`) → quiz de autoavaliação.

**Erros comuns a cobrir.** Dijkstra sem heap estourando o tempo; esquecer de filtrar arestas não acessíveis; mochila usando apenas a duração sem o deslocamento; ordem topológica sem desempate alfabético; componentes contados com vértices isolados faltando.
