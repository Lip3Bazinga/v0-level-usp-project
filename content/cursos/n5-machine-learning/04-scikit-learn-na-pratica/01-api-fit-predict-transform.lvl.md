---
slug: n5-m4-01-api-fit-predict-transform
titulo: 'A API do scikit-learn: estimadores, transformadores e preditores'
descricao: A convenção fit/predict/transform/score, hiperparâmetros vs parâmetros aprendidos (sufixo _), clonagem e como escrever seu próprio estimador.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- pandas
- scikit-learn
xp: 100
tempo_min: 40
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Usar a API uniforme do scikit-learn e inspecionar parâmetros aprendidos
- Escrever um estimador próprio compatível (BaseEstimator, ClassifierMixin) e usá-lo com as ferramentas da biblioteca
- Explicar a diferença entre hiperparâmetros e parâmetros aprendidos
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Estimador, transformador, preditor; `fit` devolve `self`; `coef_`, `classes_`; `get_params/set_params`; `clone`; escrever `KNNProprio(BaseEstimator, ClassifierMixin)` reaproveitando o kNN do módulo anterior e verificando com `check_estimator` (parcial); `random_state` em tudo.

**Exercícios previstos.** `treinar_e_inspecionar(modelo, X, y)` devolvendo os atributos com `_` (`call`); classe `MediaPorClasse` estimador próprio (`expr` com `fit/predict` e `score`); `clonar_e_reajustar` (`expr`); quiz sobre `fit_transform` vs `transform`.

**Erros comuns a cobrir.** Acessar `coef_` antes do `fit` (`NotFittedError`); `fit_transform` no teste; alterar hiperparâmetros depois do `fit` sem reajustar; esquecer de devolver `self` no estimador próprio.
