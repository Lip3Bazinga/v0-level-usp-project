---
slug: n3-m4-03-merge-sort
titulo: Merge sort
descricao: 'Ordenação por intercalação: implementação recursiva e iterativa (bottom-up), estabilidade e custo n log n com memória O(n).'
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
- Implementar merge sort recursivo com a função de intercalação estável
- Implementar a versão bottom-up (iterativa) e comparar com a recursiva
- Justificar o custo O(n log n) e o espaço O(n) e aplicar o merge em 'juntar k listas ordenadas'
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Divisão até listas de 1, intercalação linear com dois índices, estabilidade (`<=` no merge), árvore de recursão e custo; versão bottom-up (runs de 1, 2, 4…); espaço auxiliar; merge sort em listas ligadas (gancho) e em dados externos (arquivos grandes); aplicação: fundir k listas ordenadas (com heap na lição de heaps).

**Exercícios previstos.** `intercalar(a, b)` estável (`call` com tuplas iguais); `merge_sort(lista)` devolvendo nova lista (`call` com 10^5 elementos + limite de tempo); `merge_sort_bottom_up(lista)` (`call`; para garantir que não há recursão, um caso `expr` reduz `sys.setrecursionlimit(50)` no `setup` e ordena 10^4 elementos); `ordenar_por_chave(registros, chave)` com merge estável por campo (`call`); quiz sobre estabilidade.

**Erros comuns a cobrir.** `>` no merge (perde a estabilidade); fatias repetidas criando cópias desnecessárias (ok para a lição, comentar o custo); esquecer de anexar o restante de uma das listas; recursão sem caso base para lista vazia.
