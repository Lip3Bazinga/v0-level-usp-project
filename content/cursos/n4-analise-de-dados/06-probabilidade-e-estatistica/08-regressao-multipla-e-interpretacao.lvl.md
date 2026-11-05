---
slug: n4-m6-08-regressao-multipla-e-interpretacao
titulo: Regressão múltipla e interpretação
descricao: Várias variáveis explicativas, variáveis categóricas (dummies), interpretação 'mantendo o resto constante', multicolinearidade e diagnóstico.
dificuldade: intermediario
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- pandas
- scipy
xp: 120
tempo_min: 50
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Ajustar regressão múltipla com numpy (equação normal) e com scikit-learn e interpretar cada coeficiente
- Codificar variáveis categóricas com dummies e evitar a armadilha das dummies
- Diagnosticar multicolinearidade e resíduos e comparar modelos por R² ajustado
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** `y = b0 + b1x1 + b2x2 + …`, interpretação ceteris paribus; `pd.get_dummies(drop_first=True)`; `LinearRegression` do scikit-learn como primeira aparição da API `fit/predict` (gancho para o Nível 5); R² ajustado; multicolinearidade (correlação entre explicativas, VIF simples); resíduos vs ajustados; exemplo: preço de aluguel por área, quartos e bairro.

**Exercícios previstos.** `regressao_multipla(X, y)` pela equação normal devolvendo coeficientes (`call` + `tolerance`); `preparar_dummies(df, colunas)` (`expr` conferindo colunas); `ajustar_sklearn(df, alvo)` devolvendo `coef_` e `intercept_` (`call` + `tolerance`); `r2_ajustado(r2, n, p)` (`call`); `vif(X)` (`call`); quiz sobre interpretação de coeficiente de dummy.

**Erros comuns a cobrir.** Todas as dummies (matriz singular); interpretar coeficiente sem unidade; comparar coeficientes de variáveis em escalas diferentes; R² subindo sempre que se adiciona variável.
