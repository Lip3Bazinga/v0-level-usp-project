---
slug: n4-m1-04-algebra-linear-basica
titulo: Álgebra linear básica com numpy
descricao: Produto escalar e matricial (@), transposta, inversa e solução de sistemas (np.linalg), normas e a regressão por mínimos quadrados como aperitivo.
dificuldade: intermediario
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
- Calcular produto escalar, produto matricial e transposta e distinguir * de @
- Resolver sistemas lineares com np.linalg.solve e explicar por que não inverter a matriz
- Ajustar uma reta por mínimos quadrados com a equação normal
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Vetores e matrizes como arrays; `@` vs `*`; `.T`; `np.linalg.solve`, `inv` (e por que evitar), `det`, `norm`; sistemas de equações (mistura de ingredientes); projeção e a equação normal `(XᵀX)⁻¹Xᵀy` com `lstsq`; autovalores citados (gancho para PCA no Nível 5). Preparação para o Nível 5 e 6.

**Exercícios previstos.** `produto_escalar(a, b)` e `cosseno(a, b)` (`call` + `tolerance`); `resolver_sistema(A, b)` (`call`); `ajustar_reta(x, y)` devolvendo `(a, b)` pela equação normal (`call` + `tolerance` + `source not_calls polyfit`); `eh_ortogonal(Q)` (`call`); quiz sobre dimensões compatíveis.

**Erros comuns a cobrir.** `*` em vez de `@`; shapes `(n,)` vs `(n, 1)`; inverter matriz singular; esquecer a coluna de 1s na equação normal.
