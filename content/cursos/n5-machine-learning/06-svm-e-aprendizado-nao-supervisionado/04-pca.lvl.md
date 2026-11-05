---
slug: n5-m6-04-pca
titulo: PCA do zero
descricao: Centralização, covariância, autovetores e SVD, variância explicada, projeção e reconstrução, e PCA para visualização e compressão.
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
- Implementar PCA por decomposição da covariância e por SVD e conferir com scikit-learn
- Escolher o número de componentes pela variância explicada e reconstruir os dados
- Usar PCA para visualizar dados de alta dimensão e como pré-processamento
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Direções de maior variância; centralizar, covariância, `np.linalg.eigh`, ordenar; SVD equivalente; variância explicada acumulada; projeção e reconstrução (erro); dígitos em 2D; eigenfaces nos dígitos; escala antes do PCA; PCA é linear (t-SNE/UMAP citados, não disponíveis).

**Exercícios previstos.** `pca_cov(X, k)` devolvendo componentes e variância explicada iguais ao scikit-learn a menos de sinal (`call` + `tolerance`); `pca_svd(X, k)` (`call`); `n_componentes_para(X, variancia)` (`call`); `reconstruir(X, componentes, media)` com erro decrescente em k (`call`); quiz sobre centralização e sinal dos componentes.

**Erros comuns a cobrir.** Não centralizar; comparar sinais dos autovetores; PCA sem padronizar atributos em escalas diferentes; interpretar componentes como atributos originais.
