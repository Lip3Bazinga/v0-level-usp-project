---
slug: n5-m5-02-florestas-aleatorias
titulo: Bagging e florestas aleatórias
descricao: Bootstrap e agregação, subamostragem de atributos, erro out-of-bag, por que a floresta reduz variância, e hiperparâmetros que importam.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- pandas
- scikit-learn
xp: 120
tempo_min: 50
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Implementar bagging de árvores do zero e medir a redução de variância
- Explicar o papel da subamostragem de atributos e usar o erro out-of-bag como validação
- Ajustar RandomForestClassifier/Regressor e seus hiperparâmetros principais
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Média de modelos instáveis reduz variância (simulação); bootstrap; `max_features=sqrt(d)` para descorrelacionar árvores; OOB como validação gratuita; `n_estimators` (mais raramente piora), `max_depth`, `min_samples_leaf`; paralelismo (`n_jobs`); quando florestas perdem (extrapolação em regressão, dados muito esparsos).

**Exercícios previstos.** `bagging_arvores(X, y, n, semente)` com `DecisionTreeClassifier` e votação (`call` com acurácia ≥ árvore única); `variancia_das_predicoes(modelo_factory, X, y, repeticoes)` mostrando queda (`call` + `tolerance`); `oob_score_manual(...)` próximo de `oob_score_` (`call` + `tolerance`); `extrapolacao_floresta(x, y)` demonstrando o platô (`call`); quiz sobre `max_features`.

**Erros comuns a cobrir.** Bootstrap sem reposição; usar OOB e teste como a mesma coisa; `n_estimators` pequeno demais para medir OOB; esperar que a floresta extrapole.
