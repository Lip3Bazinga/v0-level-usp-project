---
slug: n3-m4-01-busca-linear-e-binaria
titulo: Busca linear e busca binária
descricao: Implementar busca binária sem bugs (invariantes), variantes (primeira ocorrência, limite inferior) e o módulo bisect.
dificuldade: intermediario
tipo: guiada
runtime: python
bibliotecas: []
xp: 110
tempo_min: 45
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Implementar busca binária iterativa correta usando um invariante explícito
- 'Escrever as variantes: primeira/última ocorrência e ''menor índice com valor ≥ x'''
- Aplicar busca binária 'na resposta' em problemas de otimização monotônica
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Busca linear e quando ela basta; busca binária com invariante ('o alvo, se existe, está em [lo, hi)'), por que `meio = (lo + hi) // 2` e os bugs famosos (laço infinito, off-by-one); `bisect_left`/`bisect_right` e `insort`; busca binária na resposta (menor capacidade de caminhão que entrega em d dias; raiz quadrada inteira); custo O(log n) e a condição: dados ordenados.

**Exercícios previstos.** `busca_binaria(lista, alvo)` (`call` com listas de 1, 2 e 10^6 elementos, ausentes e presentes nas pontas); `primeira_ocorrencia` e `limite_inferior` (`call`); `raiz_inteira(n)` para n = 10^18 (`call` + limite de tempo); `menor_capacidade(pesos, dias)` (`call`); quiz "o que acontece com `hi = meio` vs `meio - 1`".

**Erros comuns a cobrir.** `hi = meio` com `lo <= hi` (laço infinito); buscar em lista não ordenada; `(lo + hi) / 2` float; devolver `meio` da última iteração em vez de −1.
