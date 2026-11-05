---
slug: n7-m7-03-monitoramento-e-drift
titulo: Monitoramento e detecção de drift
descricao: Logs de predição, métricas operacionais (latência, erros, custo), drift de dados (PSI, KS) e de conceito, alertas, e o ciclo de retreino.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- scipy
xp: 110
tempo_min: 45
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Registrar predições com entradas, saídas, versão e latência de forma estruturada
- Detectar drift de dados com PSI e teste KS e drift de desempenho quando há rótulos atrasados
- Definir limiares de alerta e um procedimento de retreino e validação
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Log estruturado (JSON por linha) de cada predição; painel de métricas operacionais; distribuição de referência vs produção; PSI por atributo e KS (`scipy.stats.ks_2samp`); drift de conceito quando os rótulos chegam (semanas depois); alertas com limiares e janela; retreino com validação contra o modelo atual (champion/challenger); custos de LLM monitorados do mesmo jeito.

**Exercícios previstos.** `registrar_predicao(log, entrada, saida, versao, latencia)` e `resumo_operacional(log)` (`call`); `psi(referencia, producao, bins)` (`call` + `tolerance`); `drift_por_atributo(X_ref, X_prod)` com KS (`call`); `avaliar_desempenho_atrasado(log, rotulos)` (`call`); `decidir_retreino(metricas, limiares)` (`call`); quiz.

**Erros comuns a cobrir.** Monitorar só latência; PSI com bins definidos na produção; alertar em qualquer variação (ruído); retreinar sem validar contra o modelo atual.
