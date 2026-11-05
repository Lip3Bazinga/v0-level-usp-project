---
slug: n2-m5-04-funcoes-de-ordem-superior-e-closures
titulo: Funções de ordem superior e closures
descricao: Funções que devolvem funções, variáveis capturadas, nonlocal e functools.partial.
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
- Escrever funções que devolvem funções e explicar o que uma closure captura
- Usar nonlocal para alterar uma variável capturada
- Criar funções especializadas com functools.partial
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Função interna lembrando o escopo onde nasceu (`fabrica_multiplicador(3)`); o que é capturado (variável, não valor — o bug clássico do laço com lambdas); `nonlocal` para contadores; `partial`; closures como alternativa leve a classes com um método. Base direta para decoradores.

**Exercícios previstos.** `fabrica_multiplicador(n)` e `fabrica_validador(minimo, maximo)` (`expr`); `contador()` devolvendo função que incrementa com `nonlocal` (`expr` com várias chamadas); corrigir o laço que cria lambdas capturando `i` (`expr` esperando `[0, 1, 2]`); `partial` para `potencia(base, expoente)` virar `quadrado` (`expr`); quiz sobre `nonlocal` vs `global`.

**Erros comuns a cobrir.** `UnboundLocalError` sem `nonlocal`; capturar a variável do laço; devolver `funcao()` em vez de `funcao`; `partial` com argumentos na ordem errada.
