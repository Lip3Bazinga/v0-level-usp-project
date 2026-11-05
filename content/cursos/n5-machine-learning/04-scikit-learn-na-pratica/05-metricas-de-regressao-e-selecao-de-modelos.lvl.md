---
slug: n5-m4-05-metricas-de-regressao-e-selecao-de-modelos
titulo: Métricas de regressão e seleção de modelos
descricao: MAE, RMSE, MAPE, R² e suas armadilhas, baselines (média, mediana, DummyRegressor), comparação justa entre modelos e intervalos para a diferença.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- pandas
- scikit-learn
xp: 110
tempo_min: 45
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Calcular e interpretar MAE, RMSE, MAPE e R² e escolher a adequada ao problema
- Comparar modelos contra uma baseline trivial e com validação cruzada repetida
- Reportar resultados com incerteza (desvio entre folds) e decidir se a diferença importa
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Métricas e unidades; RMSE penaliza grandes erros; MAPE e zeros; R² negativo; `DummyRegressor`/`DummyClassifier` como baseline obrigatória; `RepeatedKFold`; diferença entre modelos vs desvio entre folds; preferir o modelo mais simples quando empata; registrar o experimento (tabela de resultados).

**Exercícios previstos.** `metricas_regressao(y, y_pred)` (`call` + `tolerance`); `comparar_com_baseline(modelo, X, y)` (`call`); `tabela_de_experimentos(modelos, X, y, k, repeticoes)` (`expr` DataFrame com colunas fixas); `diferenca_e_relevante(scores_a, scores_b)` por teste pareado (`call`); quiz sobre R² negativo e MAPE.

**Erros comuns a cobrir.** Comparar RMSE e MAE como se fossem equivalentes; MAPE com `y = 0`; esquecer a baseline; escolher o modelo por uma única divisão.
