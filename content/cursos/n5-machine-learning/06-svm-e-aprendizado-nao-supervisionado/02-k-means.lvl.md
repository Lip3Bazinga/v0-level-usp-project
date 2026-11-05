---
slug: n5-m6-02-k-means
titulo: k-means do zero
descricao: Inércia, atribuição e atualização, inicialização k-means++, escolha de k (cotovelo, silhueta), limitações e aplicações (segmentação, compressão de cores).
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- scikit-learn
xp: 120
tempo_min: 50
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Implementar k-means com inicialização k-means++ e critério de convergência
- Escolher k com inércia e coeficiente de silhueta e reconhecer os limites de cada critério
- Aplicar k-means a segmentação de clientes e a quantização de cores de uma imagem
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Objetivo (inércia), o algoritmo de Lloyd, mínimos locais e `n_init`, k-means++; cotovelo e silhueta (`silhouette_score`); formas que o k-means não pega (anéis, densidades diferentes); escala; aplicações: segmentação de clientes (RFM) e compressão de cores (array de pixels sintético).

**Exercícios previstos.** `kmeans(X, k, semente)` devolvendo centróides e rótulos com inércia igual à do scikit-learn em dados fixos (`call` + `tolerance`); `kmeans_mais_mais_init(X, k, semente)` (`call`); `escolher_k_silhueta(X, ks)` (`call`); `quantizar_cores(imagem, k)` (`call`); quiz sobre mínimos locais.

**Erros comuns a cobrir.** Inicialização aleatória única; convergência por número fixo de iterações sem checar mudança; clusters vazios sem tratamento; comparar rótulos entre execuções (permutação).
