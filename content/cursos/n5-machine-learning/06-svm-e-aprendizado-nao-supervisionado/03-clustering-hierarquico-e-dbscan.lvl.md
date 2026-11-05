---
slug: n5-m6-03-clustering-hierarquico-e-dbscan
titulo: Clustering hierárquico e DBSCAN
descricao: Dendrogramas e critérios de ligação, corte da árvore, DBSCAN com eps e min_samples, ruído, e comparação entre os três métodos.
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
- Executar clustering aglomerativo com diferentes ligações e cortar o dendrograma
- Implementar DBSCAN do zero e explicar pontos núcleo, borda e ruído
- Escolher o método de clustering conforme a forma dos grupos e a presença de ruído
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Aglomerativo (single, complete, average, Ward) e o dendrograma (`scipy.cluster.hierarchy`); corte por distância ou por k; DBSCAN (núcleo/borda/ruído, eps por gráfico de k-distâncias); forma arbitrária e ruído; comparação em quatro conjuntos sintéticos; métricas sem rótulo (silhueta) e com rótulo (ARI) citadas.

**Exercícios previstos.** `aglomerativo(X, k, ligacao)` com rótulos equivalentes ao scikit-learn via ARI = 1 (`call`); `dbscan(X, eps, min_samples)` do zero igual ao scikit-learn (`call` com ARI); `eps_sugerido(X, k)` pelo joelho das k-distâncias (`call` + `tolerance`); `metodo_recomendado(descricao)` (`call`); quiz.

**Erros comuns a cobrir.** Single linkage encadeando tudo; DBSCAN sem padronizar; `eps` escolhido sem olhar as distâncias; tratar ruído (−1) como cluster.
