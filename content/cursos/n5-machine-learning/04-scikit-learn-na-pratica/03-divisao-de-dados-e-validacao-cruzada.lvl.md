---
slug: n5-m4-03-divisao-de-dados-e-validacao-cruzada
titulo: Treino, validação, teste e validação cruzada
descricao: train_test_split estratificado, o papel de cada conjunto, k-fold, StratifiedKFold, cross_val_score e validação para séries temporais e grupos.
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
- Dividir os dados com estratificação e reservar o teste para uma única avaliação final
- Executar validação cruzada k-fold e interpretar média e desvio das pontuações
- Escolher o esquema de validação adequado (estratificado, por grupo, temporal)
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Por que separar; `train_test_split(stratify, random_state)`; k-fold, `StratifiedKFold`, `cross_val_score`/`cross_validate`, `GroupKFold` (pacientes com várias linhas), `TimeSeriesSplit`; variância entre folds; o teste é tocado uma vez; validação cruzada aninhada citada.

**Exercícios previstos.** `dividir(X, y, semente)` com proporções de classe preservadas (`call` + `tolerance`); `cv_media_desvio(pipeline, X, y, k)` (`call` + `tolerance`); `esquema_recomendado(descricao)` (`call`); `validacao_por_grupo(pipeline, X, y, grupos)` (`call`); `validacao_temporal(pipeline, X, y)` (`call`); quiz sobre o papel do teste.

**Erros comuns a cobrir.** Avaliar várias vezes no teste; k-fold sem estratificar em desbalanceado; embaralhar série temporal; grupos divididos entre treino e validação.
