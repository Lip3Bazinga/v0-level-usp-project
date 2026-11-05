---
slug: n3-m1-05-somatorios-logaritmos-e-crescimento
titulo: Somatórios, logaritmos e crescimento de funções
descricao: Somas aritméticas e geométricas, logaritmos como 'quantas vezes dá para dividir por 2', e comparação de taxas de crescimento.
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
- Calcular somatórios aritméticos e geométricos em forma fechada
- Interpretar log₂ n como o número de divisões pela metade e calculá-lo em código
- Ordenar funções por taxa de crescimento (constante, log, linear, n log n, quadrática, exponencial, fatorial)
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** 1 + 2 + … + n = n(n+1)/2 (Gauss) e por que o laço duplo é quadrático; soma geométrica 1 + 2 + 4 + … + 2^k; logaritmo como contagem de divisões (busca binária, altura de árvore); tabela comparando n = 10, 1 000, 1 000 000 para cada função; o que cabe em 1 segundo (≈10^7 operações simples em Python); exponencial e fatorial como "impossível além de 20–30".

**Exercícios previstos.** `soma_aritmetica(a1, an, n)` e `soma_geometrica(a, r, n)` (`call` com `tolerance`); `log2_inteiro(n)` por divisões sucessivas (`call`); `ordenar_por_crescimento(expressoes)` recebendo rótulos (`"n log n"`, `"2^n"`, …) e devolvendo-os em ordem (`call`); `cabe_em_um_segundo(funcao, n)` estimando com 10^7 (`call`); quiz com pares de funções para comparar.

**Erros comuns a cobrir.** Confundir log₂ com log₁₀ (só muda a constante — explicar); achar que n log n é "quase quadrático"; esquecer que 2^n cresce mais devagar que n! mas ambos são inviáveis.
