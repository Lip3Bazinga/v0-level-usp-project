---
slug: n3-m2-04-melhor-pior-e-medio-caso-e-memoria
titulo: Melhor, pior e caso médio; custo de memória
descricao: Por que a busca linear é O(1) no melhor caso e O(n) no pior, custo amortizado do append, e análise de espaço.
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
- Analisar melhor, pior e caso médio de um algoritmo e dizer qual importa em cada situação
- Explicar o custo amortizado de list.append e de redimensionamento
- Estimar o custo de memória (espaço auxiliar) de um algoritmo e reconhecer soluções in-place
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Busca linear e os três casos; quando o pior caso importa (sistemas em tempo real, segurança) e quando o médio basta; amortização com a lista dinâmica do Python (dobrar a capacidade → O(1) amortizado) e com `pop()` vs `pop(0)`; espaço: entrada vs auxiliar, in-place (inversão de lista com dois índices) vs cópia; trocas tempo × espaço (tabela de memoização, `set` para `in`).

**Exercícios previstos.** `busca_linear_com_contagem(lista, alvo)` devolvendo o número de comparações e verificação dos três casos (`call`); `simular_lista_dinamica(n)` contando cópias ao dobrar (`call`); `inverter_in_place(lista)` sem lista auxiliar (`call` + `source not_calls reversed` + verificação de que a mesma lista foi alterada via `expr`); `espaco_auxiliar(algoritmo)` quiz-exercício classificando `"O(1)"`/`"O(n)"` (`call`); quiz.

**Erros comuns a cobrir.** Achar que 'caso médio' é a média do melhor e do pior; esquecer que `lista[:]` copia (espaço O(n)); considerar a recursão 'sem memória' (a pilha ocupa espaço).
