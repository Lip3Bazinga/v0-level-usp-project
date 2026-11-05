---
slug: n3-m3-04-recorrencias-e-teorema-mestre
titulo: Recorrências e o Teorema Mestre
descricao: Resolver T(n) = aT(n/b) + f(n) pelos três casos do Teorema Mestre e por árvore de recursão, com verificação numérica.
dificuldade: intermediario
tipo: guiada
runtime: python
bibliotecas: []
xp: 100
tempo_min: 40
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Identificar a, b e f(n) em uma recorrência a partir do código
- Aplicar os três casos do Teorema Mestre a recorrências comuns
- Verificar numericamente uma solução de recorrência simulando T(n)
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Árvore de recursão (níveis, trabalho por nível, soma) para 2T(n/2) + n, T(n/2) + 1 e 2T(n/2) + 1; o Teorema Mestre como atalho com os três casos e exemplos (busca binária, merge sort, Karatsuba 3T(n/2) + n, Strassen); recorrências que não se encaixam (T(n−1) + n) resolvidas por expansão; verificação numérica com memoização.

**Exercícios previstos.** `simular_recorrencia(a, b, f, n)` computando T(n) com memoização (`call`); `teorema_mestre(a, b, k)` para f(n) = n^k devolvendo a classe como string (`call` com os três casos); `identificar_parametros(codigo_id)` associando trechos a (a, b, f) (`call`); quiz com quatro recorrências.

**Erros comuns a cobrir.** Trocar a e b; aplicar o Teorema Mestre a T(n−1) + …; esquecer o log no caso 2; comparar f(n) com n^(log_b a) errado.
