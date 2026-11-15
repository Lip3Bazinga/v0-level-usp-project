---
slug: n5-m4-04-busca-de-hiperparametros
titulo: Busca de hiperparâmetros
descricao: GridSearchCV e RandomizedSearchCV sobre pipelines, espaços de busca, refit, inspeção de cv_results_ e o custo da busca.
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
- Definir espaços de busca para etapas de um Pipeline e rodar GridSearchCV e RandomizedSearchCV
- Ler cv_results_ e best_params_ e evitar o sobreajuste à validação
- Estimar o custo da busca e escolher entre grade e aleatória
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** `param_grid` com nomes `etapa__parametro`; `GridSearchCV(cv, scoring, refit)`; `RandomizedSearchCV` com distribuições e `n_iter`; `cv_results_` em DataFrame; o 'vencedor' é otimista (validação aninhada); escalas logarítmicas para `C`/`alpha`; tempo de busca = combinações × folds.

**Exercícios previstos.** `buscar_grade(pipeline, X, y, grade)` devolvendo melhores parâmetros em dados fixos (`call`); `buscar_aleatoria(..., n_iter, semente)` (`call`); `resumo_cv_results(busca)` com top-3 (`call`); `custo_da_busca(grade, k)` (`call`); quiz sobre grade vs aleatória.

**Erros comuns a cobrir.** Nome do parâmetro sem o prefixo da etapa; grade grande demais; escolher pelo teste; `refit=False` e depois `predict`.
