---
slug: n3-m3-03-divisao-e-conquista
titulo: Divisão e conquista
descricao: 'Dividir, resolver e combinar: máximo recursivo, contagem de inversões, par de pontos mais próximo (versão simplificada) e a ideia do merge sort.'
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
- Estruturar um algoritmo em dividir/resolver/combinar e identificar o custo de cada etapa
- Implementar busca binária recursiva e contagem de inversões em O(n log n)
- Montar a recorrência do algoritmo e reconhecer o padrão 2T(n/2) + O(n)
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** O esquema geral e a recorrência; máximo de lista por divisão (didático); busca binária recursiva como divisão com um só ramo (T(n) = T(n/2) + 1); intercalação de listas ordenadas (`intercalar`) e contagem de inversões (quantos pares fora de ordem) em O(n log n) — a prova de que merge sort funciona; exponenciação rápida revisitada; menção a Karatsuba e Strassen como curiosidade.

**Exercícios previstos.** `maximo_dc(lista)` (`call` + `source uses recursion`); `busca_binaria_rec(lista, alvo, ini, fim)` (`call`); `intercalar(a, b)` linear (`call` + limite de tempo com 10^5 elementos); `contar_inversoes(lista)` (`call` com lista de 20 000 elementos, versão quadrática reprova por tempo); quiz sobre a recorrência.

**Erros comuns a cobrir.** Dividir em n/2 e n/2 esquecendo o elemento do meio; intercalar com `pop(0)` (quadrático); recursão que não reduz o problema (`fim` igual); contar inversões só entre vizinhos.
