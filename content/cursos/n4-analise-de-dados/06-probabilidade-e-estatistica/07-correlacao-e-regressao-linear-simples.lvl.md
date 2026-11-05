---
slug: n4-m6-07-correlacao-e-regressao-linear-simples
titulo: Correlação e regressão linear simples
descricao: Covariância, correlação de Pearson e Spearman, correlação não é causação, ajuste de reta, R², resíduos e previsão.
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
- Calcular e interpretar correlação de Pearson e Spearman e reconhecer quando cada uma é adequada
- Ajustar uma regressão linear simples, interpretar coeficientes e R² e analisar resíduos
- Distinguir correlação, causação e variáveis de confusão com exemplos
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Covariância e correlação, o quarteto de Anscombe (sempre plotar), Spearman para monotônicas; regressão por mínimos quadrados (`scipy.stats.linregress` e a equação normal da lição de álgebra), interpretação de intercepto e inclinação com unidades, R², resíduos (padrões = modelo errado), previsão e extrapolação; causação: confusão (sorvete e afogamentos), causalidade reversa; gancho para o Nível 5.

**Exercícios previstos.** `correlacoes(x, y)` Pearson e Spearman (`call` + `tolerance`); `anscombe_resumo(conjuntos)` mostrando estatísticas iguais (`call`); `regressao_simples(x, y)` devolvendo a, b, R² (`call` + `tolerance`); `prever(modelo, x_novo)` com aviso de extrapolação (`call`); `residuos_padrao(x, y)` detectando curvatura via correlação resíduo × x² (`call`); quiz sobre causação.

**Erros comuns a cobrir.** Inferir causa de correlação; Pearson em relação não linear; interpretar R² como 'acurácia'; extrapolar fora do intervalo dos dados.
