---
slug: n3-m4-06-ordenacoes-lineares
titulo: 'Ordenações em tempo linear: counting, bucket e radix'
descricao: 'Quando as chaves são inteiros limitados, dá para ordenar sem comparar: counting sort estável, bucket sort e radix sort LSD.'
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
- Implementar counting sort estável e explicar a condição para o custo O(n + k)
- Implementar radix sort LSD usando counting sort por dígito
- Enunciar o limite inferior Ω(n log n) de ordenações por comparação e por que as lineares escapam dele
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Limite inferior por árvore de decisão (informal); counting sort com acumulação de posições (estável); custo e memória em função de k; radix LSD para inteiros e strings de tamanho fixo (CPF, CEP); bucket sort para floats uniformes; quando usar (chaves pequenas, muitos dados) e quando não.

**Exercícios previstos.** `counting_sort(lista, k)` estável para registros `(chave, valor)` (`call` + `source not_calls sorted`); `radix_sort(lista)` para inteiros até 10^9 (`call` com 10^5 elementos + limite de tempo); `ordenar_ceps(lista)` (`call`); `histograma_de_notas(notas)` como aplicação do contador (`call`); quiz sobre a condição de k.

**Erros comuns a cobrir.** Counting sort percorrendo a lista de contagens de trás para frente errado (perde estabilidade); radix começando pelo dígito mais significativo sem agrupar; `k` igual ao máximo sem +1 (`IndexError`).
