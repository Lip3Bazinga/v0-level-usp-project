---
slug: n5-m5-03-gradient-boosting
titulo: Gradient boosting por dentro
descricao: Boosting como ajuste sequencial aos resíduos, taxa de aprendizado e número de estágios, uma implementação didática para regressão, e HistGradientBoosting do scikit-learn.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- pandas
- scikit-learn
xp: 130
tempo_min: 55
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Implementar gradient boosting de regressão do zero com árvores rasas sobre os resíduos
- Explicar o papel da taxa de aprendizado, do número de estágios e da parada antecipada
- Usar HistGradientBoostingClassifier/Regressor com early stopping e interpretar a curva de validação por estágio
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Modelo aditivo; resíduos como gradiente negativo do MSE; cada árvore corrige a anterior com `shrinkage`; sobreajuste com muitos estágios e a parada antecipada; versão para classificação em uma página (gradiente da logística); `HistGradientBoosting` (binning, rápido, trata ausentes); XGBoost/LightGBM citados (não disponíveis no sandbox); comparação com florestas (viés vs variância).

**Exercícios previstos.** `boosting_regressao(X, y, n_estagios, taxa, profundidade)` devolvendo predições e histórico de erro (`call` + `tolerance`); `estagios_otimos(historico_validacao)` (`call`); `comparar_floresta_boosting(X, y)` em dados fixos (`call`); `hgb_com_parada(X, y)` devolvendo `n_iter_` ≤ máximo (`call`); quiz sobre taxa × estágios.

**Erros comuns a cobrir.** Ajustar a nova árvore ao alvo em vez de ao resíduo; taxa 1,0 com muitos estágios (sobreajuste); parar cedo demais por ruído na validação; comparar com floresta sem ajustar hiperparâmetros de ambos.
