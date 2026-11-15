---
slug: n3-m4-02-ordenacoes-elementares
titulo: 'Ordenações elementares: bolha, seleção e inserção'
descricao: Três algoritmos O(n²) implementados e comparados, com invariantes, contagem de trocas e os casos em que a inserção é a melhor escolha.
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
- Implementar bubble sort, selection sort e insertion sort in-place
- Enunciar o invariante de cada um e contar comparações/trocas
- Explicar por que insertion sort é O(n) em dados quase ordenados e é usado dentro do Timsort
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Os três algoritmos com animação em tabela (estado após cada passagem); invariantes ('os k maiores estão no lugar', 'o prefixo está ordenado'); contagem de comparações e trocas; bolha com parada antecipada; estabilidade (quem preserva a ordem de iguais); insertion sort adaptativo; o que `lista.sort()` faz por baixo (Timsort = merge + insertion em runs).

**Exercícios previstos.** `bubble_sort`, `selection_sort`, `insertion_sort` in-place (`call` + `source not_calls sorted`/`sort` + `expr` confirmando alteração in-place); `contar_trocas_selection(lista)` (`call`); `insertion_sort_com_contagem(lista)` devolvendo comparações para lista ordenada (n−1) e invertida (`call`); `eh_estavel(algoritmo)` testando com tuplas (`call`); quiz.

**Erros comuns a cobrir.** `range(n)` interno sem encolher (funciona, mas não aprende o invariante — o caso de contagem de comparações pega); troca sem variável temporária errada (em Python `a, b = b, a` resolve — mostrar); esquecer a parada antecipada quando o enunciado exige O(n) no melhor caso.
