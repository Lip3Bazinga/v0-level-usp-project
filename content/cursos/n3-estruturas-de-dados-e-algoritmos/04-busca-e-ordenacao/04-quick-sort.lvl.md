---
slug: n3-m4-04-quick-sort
titulo: Quick sort
descricao: Particionamento de Lomuto e Hoare, escolha do pivô, pior caso, versão aleatorizada e quickselect para o k-ésimo menor.
dificuldade: intermediario
tipo: guiada
runtime: python
bibliotecas: []
xp: 120
tempo_min: 50
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Implementar quick sort in-place com particionamento de Lomuto
- Explicar o pior caso O(n²), o papel do pivô e por que a versão aleatorizada é O(n log n) esperado
- Implementar quickselect para encontrar o k-ésimo menor em O(n) médio
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Particionar em torno do pivô (Lomuto com invariante; Hoare citado); recursão nas duas metades; pior caso com dados ordenados e pivô fixo; pivô aleatório/mediana de três; não é estável; in-place com O(log n) de pilha; quickselect (um ramo só) e sua relação com `statistics.median`; comparação prática com merge sort e com `sorted`.

**Exercícios previstos.** `particionar(lista, lo, hi)` devolvendo a posição final do pivô (`call` + `expr` conferindo o invariante); `quick_sort(lista)` in-place (`call` com 10^5 aleatórios + limite de tempo + `expr` de alteração in-place); `quick_sort_aleatorio` passando em lista já ordenada de 20 000 elementos (a versão com pivô fixo estoura tempo/recursão) (`call`); `k_esimo_menor(lista, k)` por quickselect (`call` + `source not_calls sorted`); quiz sobre pior caso.

**Erros comuns a cobrir.** Particionar e esquecer de colocar o pivô na posição final; recursão incluindo o pivô (laço infinito); `random.seed` ausente quando o enunciado exige determinismo; `k` 1-based vs 0-based.
