---
slug: n5-m3-01-regressao-logistica-do-zero
titulo: Regressão logística do zero
descricao: Sigmoide, fronteira de decisão linear, entropia cruzada, gradiente e treino por GD; comparação com LogisticRegression.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- scikit-learn
xp: 130
tempo_min: 55
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Implementar a regressão logística (predição, custo, gradiente, treino) em numpy
- Interpretar coeficientes como log-odds e desenhar a fronteira de decisão
- Comparar a implementação própria com LogisticRegression do scikit-learn
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Por que não usar regressão linear para classes; sigmoide e log-odds; entropia cruzada estável (`logaddexp`); gradiente `Xᵀ(σ(Xw) − y)/n`; treino com GD; fronteira `Xw + b = 0`; dados sintéticos (duas luas/blobs via scikit-learn) e um conjunto real pequeno (câncer de mama do `sklearn.datasets`, disponível offline); `LogisticRegression(penalty=None)` para comparar.

**Exercícios previstos.** `sigmoide` estável e `prever_proba(X, w, b)` (`call` + `tolerance`); `entropia_cruzada_binaria` estável (`call` com `p` próximo de 0 e 1); `gradiente_logistica` conferido numericamente (`call`); `treinar_logistica(X, y, taxa, epocas)` atingindo acurácia ≥ 0,9 nos dados fixos (`call`); `comparar_com_sklearn` com diferença de coeficientes < 0,05 (`call`); quiz sobre log-odds.

**Erros comuns a cobrir.** `np.log(0)`; usar MSE com sigmoide (não convexo); esquecer de padronizar (convergência lenta); interpretar `w` como probabilidade.
