---
slug: n6-m2-01-grafo-computacional-e-derivadas-locais
titulo: Grafo computacional e derivadas locais
descricao: Toda expressão é um grafo; cada nó conhece sua derivada local; a regra da cadeia percorre o grafo de trás para frente. Feito à mão antes de automatizar.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
xp: 110
tempo_min: 45
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Desenhar o grafo computacional de uma expressão e anotar a derivada local de cada nó
- Propagar gradientes de trás para frente à mão e conferir numericamente
- Explicar por que o gradiente de um nó usado duas vezes é a soma das contribuições
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Expressão `L = (a*b + c) * f` como grafo; derivadas locais de `+` (1, 1), `*` (o outro operando), `tanh` (1 − t²); propagação reversa acumulando; o caso de uma variável usada em dois lugares (soma); conferência com diferenças finitas; vocabulário: forward, backward, `grad`.

**Exercícios previstos.** `derivadas_locais(op, a, b)` (`call`); `backprop_manual(a, b, c, f)` devolvendo os quatro gradientes (`call` + `tolerance`); `gradiente_variavel_repetida(x)` para `y = x*x + x` (`call`); `verificar_numericamente(f, ponto, grad)` (`call`); quiz sobre acumulação.

**Erros comuns a cobrir.** Sobrescrever o gradiente em vez de somar; esquecer de multiplicar pelo gradiente que vem de cima; derivada local do produto com o operando errado.
