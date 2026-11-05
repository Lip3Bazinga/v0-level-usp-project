---
slug: n7-m6-01-avaliacao-de-sistemas-com-llm
titulo: Avaliação de sistemas com LLM
descricao: Conjuntos de avaliação, rubricas, LLM como juiz (e seus vieses), métricas automáticas, testes de regressão e avaliação contínua em produção.
dificuldade: avancado
tipo: guiada
runtime: python
bibliotecas: []
xp: 120
tempo_min: 50
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Construir um conjunto de avaliação representativo com rubricas e respostas de referência
- Implementar avaliação por juiz simulado com rubrica e medir concordância com rótulos humanos
- Montar testes de regressão e um painel de métricas por versão de prompt/modelo
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Por que 'parece bom' não basta; cobertura (casos fáceis, difíceis, adversariais, fora de escopo); rubricas (1–5 por critério); juiz com rubrica e os vieses (posição, verbosidade, auto-preferência); concordância (kappa) com rótulos humanos fornecidos; métricas automáticas (exatidão, sobreposição) onde cabem; regressão por versão (reaproveita versionamento de prompts); amostragem de produção para avaliação contínua.

**Exercícios previstos.** `estratificar_conjunto(casos)` por categoria (`call`); `julgar_com_rubrica(cliente_juiz, caso, resposta, rubrica)` (`expr`); `kappa_de_cohen(a, b)` (`call` + `tolerance`); `detectar_vies_de_posicao(cliente_juiz, pares)` (`expr`); `painel_por_versao(resultados)` (`call`); quiz.

**Erros comuns a cobrir.** Avaliar com os mesmos exemplos usados para escrever o prompt; juiz sem rubrica; concluir com 10 exemplos; não versionar o conjunto de avaliação.
