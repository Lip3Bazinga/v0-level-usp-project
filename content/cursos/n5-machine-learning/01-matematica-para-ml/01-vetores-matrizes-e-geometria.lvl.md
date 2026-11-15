---
slug: n5-m1-01-vetores-matrizes-e-geometria
titulo: Vetores, matrizes e geometria dos dados
descricao: Dados como pontos em R^n, normas e distâncias, produto escalar e ângulo, projeções, matrizes como transformações e a matriz de projeto X.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
xp: 100
tempo_min: 40
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Representar um conjunto de dados como matriz X (n × d) e um vetor de alvos y
- Calcular normas, distâncias e similaridade de cosseno e interpretá-las geometricamente
- Explicar matrizes como transformações lineares e calcular projeções
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** A matriz de projeto, linhas como observações e colunas como atributos; norma L1/L2 e distâncias (base de kNN e k-means); produto escalar como similaridade; projeção de um vetor sobre outro (base de PCA); matrizes como transformações (rotação, escala) visualizadas; `X @ w` como 'cada linha vezes os pesos'; rank e colinearidade em uma frase.

**Exercícios previstos.** `distancias_a_todos(X, x)` vetorizado (`call` + `tolerance` + `source not_uses for`); `cosseno_par_a_par(X)` (`call`); `projetar(v, u)` (`call`); `aplicar_transformacao(pontos, M)` (`call`); `atributos_colineares(X)` por rank (`call`); quiz sobre shapes de `X @ w`.

**Erros comuns a cobrir.** Confundir linhas e colunas de X; `norm` sem `axis`; divisão por norma zero no cosseno; `(n,)` vs `(n, 1)` em `X @ w`.
