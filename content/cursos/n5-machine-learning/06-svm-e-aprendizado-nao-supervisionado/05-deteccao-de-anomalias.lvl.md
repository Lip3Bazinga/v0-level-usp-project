---
slug: n5-m6-05-deteccao-de-anomalias
titulo: Detecção de anomalias
descricao: Métodos baseados em distância, densidade (LOF), isolamento (IsolationForest) e reconstrução (PCA), com avaliação quando há poucos rótulos.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- scikit-learn
xp: 110
tempo_min: 45
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Aplicar z-score multivariado, LOF e IsolationForest e comparar suas detecções
- Usar o erro de reconstrução do PCA como pontuação de anomalia
- Avaliar detectores com poucos rótulos usando precisão em k e curva PR
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Anomalia vs outlier vs novidade; distância de Mahalanobis; `LocalOutlierFactor`; `IsolationForest` (por que isola anomalias com poucas divisões); reconstrução PCA; contaminação e limiar; avaliação com rótulos parciais (precisão@k); fraude em transações sintéticas como caso.

**Exercícios previstos.** `mahalanobis(X)` (`call` + `tolerance`); `anomalias_isolation_forest(X, contaminacao, semente)` (`call`); `erro_de_reconstrucao_pca(X, k)` (`call`); `precisao_em_k(scores, rotulos, k)` (`call`); `comparar_detectores(X, rotulos)` (`call`); quiz sobre contaminação.

**Erros comuns a cobrir.** Covariância singular em Mahalanobis; usar `fit_predict` do LOF em novos dados (precisa `novelty=True`); avaliar com acurácia; limiar fixo sem olhar a distribuição dos scores.
