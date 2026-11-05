---
slug: n5-m3-04-knn
titulo: k-vizinhos mais próximos
descricao: Classificação por vizinhança, distância e escala, escolha de k, fronteiras irregulares, custo de predição e a maldição da dimensionalidade.
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
- Implementar kNN do zero (classificação e regressão) com votação e pesos por distância
- Escolher k por validação e explicar o efeito de k pequeno e grande na fronteira
- Explicar a maldição da dimensionalidade e o custo de predição do kNN
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Nenhum treino, toda a conta na predição; distâncias vetorizadas (lição de geometria); empates e k ímpar; pesos por distância; k vs fronteira (k=1 decora, k grande suaviza); padronização obrigatória; `KNeighborsClassifier`; em alta dimensão todas as distâncias ficam parecidas (experimento); estruturas de busca (KD-tree) citadas, ligação com o Nível 3.

**Exercícios previstos.** `knn_prever(X_treino, y_treino, X_novo, k)` (`call`); `knn_regressao` (`call` + `tolerance`); `acuracia_por_k(X_tr, y_tr, X_va, y_va, ks)` (`call`); `razao_distancias_por_dimensao(d, n, semente)` mostrando a convergência (`call` + `tolerance`); quiz sobre k par e escala.

**Erros comuns a cobrir.** Não padronizar; k par com empates; incluir o próprio ponto como vizinho ao avaliar no treino; laço duplo em Python para distâncias (tempo).
