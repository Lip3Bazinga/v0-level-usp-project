---
slug: n7-m3-03-indices-vetoriais-aproximados
titulo: 'Índices vetoriais aproximados: IVF, HNSW e quantização'
descricao: Por que busca exata não escala, particionamento por clusters (IVF com k-means do Nível 5), grafos de proximidade (HNSW) como leitura, quantização de produto, e a troca recall × velocidade.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
xp: 120
tempo_min: 50
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Implementar um índice IVF simples (k-means + busca em nprobe partições) e medir recall contra a busca exata
- Descrever o HNSW e a quantização de produto em linhas gerais
- Escolher parâmetros (nlist, nprobe) pela troca recall × latência
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Recall@k como métrica de um índice aproximado; IVF: centróides por k-means, buscar só nas `nprobe` partições mais próximas; curva recall × tempo; HNSW (camadas, vizinhos, busca gulosa) em leitura com figura; quantização de produto (subvetores, codebooks) em uma página; bancos vetoriais (pgvector, FAISS) citados.

**Exercícios previstos.** classe `IndiceIVF(nlist, nprobe)` com `treinar`, `adicionar`, `buscar` (`expr`); `recall_em_k(resultados_aprox, resultados_exatos)` (`call` + `tolerance`); `curva_recall_tempo(indice, consultas, nprobes)` (`call`); `quantizar_subvetores(E, m, k)` simplificado (`call`); quiz.

**Erros comuns a cobrir.** Medir recall sem a referência exata; `nprobe` = `nlist` (é busca exata mais lenta); k-means com nlist maior que os dados; avaliar com as mesmas consultas usadas para treinar.
