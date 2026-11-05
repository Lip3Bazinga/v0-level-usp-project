---
slug: n1-m6-06-recursao-introdutoria
titulo: 'Recursão: funções que chamam a si mesmas'
descricao: Caso base, caso recursivo e a pilha de chamadas com fatorial, soma de lista e contagem regressiva.
dificuldade: iniciante
tipo: guiada
runtime: python
bibliotecas: []
xp: 120
tempo_min: 50
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Identificar caso base e caso recursivo em uma definição
- Escrever funções recursivas simples (fatorial, soma, potência, inversão de string)
- Rastrear as chamadas na pilha e explicar o RecursionError
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Definição recursiva (`n! = n × (n−1)!`, `0! = 1`); a função chama a si mesma com um problema menor; sem caso base, `RecursionError`; a pilha de chamadas desenhada (empilha até o caso base, desempilha devolvendo); recursão vs laço (mesmo resultado, estilos diferentes); limite de profundidade. O Nível 3 aprofunda (divisão e conquista, backtracking).

**Passos previstos.** Leitura (caso base e recursivo) → Exercício: `fatorial(n)` recursivo (`call` + `source uses recursion` + `not_uses for`/`while`) → Exercício: `soma_lista(lista)` e `inverter(texto)` recursivas (`call` + `source uses recursion`) → Quiz (3 perguntas: o que falta; quantas chamadas; o que imprime) → Exercício: `potencia(base, expoente)` recursiva com expoente 0 como base (`call`).

**Erros comuns a cobrir.** Esquecer o caso base; caso base que nunca é atingido (`n - 2` com ímpar); não devolver o resultado da chamada recursiva (`fatorial(n - 1)` sem `return`); usar laço quando o enunciado exige recursão.
