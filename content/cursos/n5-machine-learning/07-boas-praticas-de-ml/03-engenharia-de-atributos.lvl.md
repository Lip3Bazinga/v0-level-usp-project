---
slug: n5-m7-03-engenharia-de-atributos
titulo: Engenharia de atributos
descricao: Transformações (log, binning, interações, datas, texto simples), codificação de categorias com alta cardinalidade (target encoding com validação), seleção de atributos e o que automatizar.
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
- Criar atributos a partir de datas, textos curtos, razões e interações e medir o ganho
- Codificar categorias de alta cardinalidade sem vazamento (target encoding com folds)
- Selecionar atributos com métodos de filtro, embutidos e por eliminação recursiva
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Atributos de data (dia da semana, feriado), razões (`renda/dívida`), log de assimétricos, `KBinsDiscretizer`, interações polinomiais; `TargetEncoder` do scikit-learn (com validação interna) vs o jeito ingênuo; seleção: filtro (`SelectKBest`), embutido (lasso, importâncias), `RFECV`; registrar atributos como código (`FunctionTransformer`).

**Exercícios previstos.** `atributos_de_data(df, coluna)` (`expr` conferindo colunas); `target_encoding_com_folds(X_cat, y, k, semente)` (`call` + `tolerance`); `ganho_de_atributo(pipeline, X, y, novo_atributo)` (`call`); `selecionar_rfecv(X, y)` (`call`); quiz sobre target encoding ingênuo.

**Erros comuns a cobrir.** Target encoding com o próprio alvo da linha (vazamento); criar centenas de atributos sem validar; binning com bordas do conjunto inteiro; esquecer de aplicar a mesma transformação em produção.
