---
slug: n5-m3-02-metricas-de-classificacao
titulo: Métricas de classificação
descricao: Matriz de confusão, acurácia e sua armadilha, precisão, recall, F1, especificidade, e a escolha da métrica pelo custo dos erros.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- scikit-learn
xp: 120
tempo_min: 50
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Construir a matriz de confusão e calcular todas as métricas derivadas do zero
- Explicar por que acurácia engana em classes desbalanceadas e escolher a métrica pelo custo dos erros
- Usar classification_report e confusion_matrix do scikit-learn e interpretá-los
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** TP/FP/FN/TN; acurácia em 99 % de negativos; precisão vs recall (fraude: recall; spam: precisão), F1 e Fβ; especificidade; macro/micro/ponderada em multiclasse; `classification_report`; custo esperado com matriz de custos; relato honesto.

**Exercícios previstos.** `matriz_de_confusao(y, y_pred)` e `metricas(y, y_pred)` do zero (`call` + `tolerance` + `source not_calls accuracy_score` e `not_calls precision_score`); `metrica_recomendada(cenario)` (`call`); `custo_esperado(y, y_pred, matriz_custo)` (`call`); `f_beta(y, y_pred, beta)` (`call`); quiz com matrizes de confusão para calcular.

**Erros comuns a cobrir.** Trocar linhas e colunas da matriz; precisão com denominador zero; reportar acurácia em desbalanceado; macro vs ponderada confundidas.
