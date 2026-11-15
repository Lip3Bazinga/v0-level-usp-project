---
slug: n5-m2-04-equacao-normal-e-solucao-exata
titulo: Equação normal e solução exata
descricao: Resolver a regressão em uma linha com álgebra, comparar com o gradiente descendente, custo computacional e problemas numéricos.
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
- Resolver a regressão linear pela equação normal e por np.linalg.lstsq
- Comparar a solução exata com a do gradiente descendente e explicar quando usar cada uma
- Reconhecer matrizes singulares (atributos colineares) e o papel da regularização
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** `w = (XᵀX)⁻¹Xᵀy` derivada do gradiente igual a zero; `solve` em vez de `inv`; `lstsq` e SVD em uma frase; custo O(d³) vs GD; colinearidade perfeita → singular → ridge resolve (próxima lição); verificação de que GD converge para a mesma solução.

**Exercícios previstos.** `equacao_normal(X, y)` (`call` + `tolerance`); `comparar_com_gd(X, y)` devolvendo a norma da diferença < 1e-3 (`call`); `detectar_singular(X)` (`call`); `tempo_relativo(d)` estimando quando a equação normal fica mais cara que GD (`call` + `tolerance` ampla); quiz.

**Erros comuns a cobrir.** `inv` em matriz mal condicionada; esquecer a coluna de 1s; comparar soluções sem padronizar igualmente; `X.T @ X` com X contendo o alvo.
