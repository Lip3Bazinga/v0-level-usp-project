---
slug: n3-m3-01-recursao-revisitada
titulo: Recursão revisitada
descricao: A pilha de chamadas por dentro, limite de recursão, recursão em listas e strings, recursão múltipla e conversão para iteração.
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
- Rastrear chamadas recursivas na pilha e prever a ordem das saídas
- Escrever funções recursivas sobre listas, strings e números com casos base corretos
- Converter uma recursão em laço com pilha explícita quando o limite de recursão é um problema
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Quadros de pilha, `sys.getrecursionlimit`, `RecursionError`; recursão sobre estruturas (soma de lista aninhada, achatar, inversão); recursão múltipla (Fibonacci ingênuo e sua explosão — gancho para memoização); recursão de cauda e por que o Python não a otimiza; converter para iteração com pilha explícita (lista como pilha).

**Exercícios previstos.** `achatar(lista_aninhada)` recursivo (`call` com profundidade 5 + `source uses recursion`); `contar_chamadas_fib(n)` instrumentado (`call` com n = 20 → 21891); `potencia_rapida(b, e)` por divisão do expoente (`call` com e = 10^6 e `source uses recursion`); `achatar_iterativo(lista)` com pilha explícita para profundidade 5 000 (`call` que estouraria a recursão); quiz sobre ordem de impressão antes/depois da chamada recursiva.

**Erros comuns a cobrir.** Caso base cobrindo só um dos tipos (int vs list); modificar a lista enquanto recursa sobre ela; `return` faltando no caminho recursivo; confundir profundidade com número de chamadas.
