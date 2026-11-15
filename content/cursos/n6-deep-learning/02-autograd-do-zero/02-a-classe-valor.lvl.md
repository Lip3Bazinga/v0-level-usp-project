---
slug: n6-m2-02-a-classe-valor
titulo: 'A classe Valor: dados, gradiente e operações'
descricao: Implementar Valor com __add__, __mul__, __radd__, __rmul__, __neg__, __sub__, registrando os filhos e a função _backward de cada operação.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
xp: 130
tempo_min: 55
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Implementar a classe Valor com dado, grad, filhos e operação, usando os métodos especiais do Nível 2
- Registrar em cada operação a closure _backward que distribui o gradiente aos filhos
- Construir expressões com Valor e inspecionar o grafo resultante
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** A classe (`dado`, `grad = 0`, `_anteriores`, `_op`, `_backward`); `__add__` e `__mul__` criando o nó de saída e definindo `_backward` como closure que soma nos filhos; `__radd__`/`__rmul__` para `2 * v`; `__neg__`, `__sub__`; `__repr__`; conversão automática de números; desenhar o grafo (função `rastrear`).

**Exercícios previstos.** Classe `Valor` com `+`, `*`, `-`, negação e operandos numéricos (`expr` com expressões mistas); `_backward` de `+` e `*` testados isoladamente (`expr` setando `grad` da saída e chamando `_backward`); `rastrear(raiz)` devolvendo nós e arestas (`expr` contando); quiz sobre `__rmul__`.

**Erros comuns a cobrir.** `_backward` com `=` em vez de `+=`; esquecer `__rmul__` (`2 * v` falha); `grad` compartilhado entre instâncias (atributo de classe); filhos guardados como lista com duplicatas quando `v + v`.
