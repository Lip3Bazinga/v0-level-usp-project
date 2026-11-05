---
slug: n3-m5-01-pilhas
titulo: Pilhas
descricao: LIFO com lista, balanceamento de parênteses, avaliação de expressões em notação polonesa reversa e conversão infixa → posfixa.
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
- Implementar uma pilha com operações O(1) e usá-la para balanceamento de delimitadores
- Avaliar expressões em notação posfixa e converter infixa para posfixa (shunting-yard)
- Reconhecer a pilha de chamadas como uma pilha e simular recursão com pilha explícita
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** `Pilha` com `empilhar`, `desempilhar`, `topo`, `vazia` sobre `list` (append/pop no fim — por que não no início); balanceamento de `()[]{}`; avaliação de RPN; algoritmo shunting-yard com precedência; desfazer/refazer (duas pilhas); navegação de histórico; simulação de DFS com pilha (gancho para grafos).

**Exercícios previstos.** Classe `Pilha` (`expr` + `raises` ao desempilhar vazia); `balanceado(texto)` (`call`); `avaliar_rpn(tokens)` (`call` com `tolerance`); `infixa_para_posfixa(tokens)` (`call`); `editor_com_desfazer(comandos)` (`call`); quiz.

**Erros comuns a cobrir.** `pop(0)` como pilha (quadrático); checar só a contagem de parênteses sem a ordem (`)(`); operandos na ordem errada na subtração RPN; precedência de `^` à direita.
