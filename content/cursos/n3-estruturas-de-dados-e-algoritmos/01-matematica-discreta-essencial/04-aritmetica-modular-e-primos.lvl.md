---
slug: n3-m1-04-aritmetica-modular-e-primos
titulo: Aritmética modular, divisibilidade e primos
descricao: Resto, congruências, MDC com Euclides, crivo de Eratóstenes, exponenciação modular e onde isso aparece (hash, criptografia, datas).
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
- Usar % e congruências para problemas cíclicos (dias da semana, dígitos verificadores)
- Implementar o algoritmo de Euclides e o crivo de Eratóstenes
- Implementar exponenciação modular rápida e explicar seu custo logarítmico
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Propriedades do resto, congruência; dígito verificador do CPF como aplicação; MDC por Euclides (e por que termina rápido), MMC; primos, teste de primalidade até √n, crivo de Eratóstenes; exponenciação modular por quadrados sucessivos (`pow(a, b, m)`) como primeiro algoritmo O(log n) com prova informal; menção a RSA e a `hash()`.

**Exercícios previstos.** `mdc(a, b)` recursivo e `mmc` (`call`); `digito_verificador_cpf(nove_digitos)` (`call`); `crivo(n)` devolvendo a lista de primos até n com teste de desempenho para n = 200 000 (`call` com tempo limite); `pot_mod(base, exp, mod)` sem `pow` de três argumentos (`call` com expoentes de 10^18 e `source not_calls pow`); quiz sobre congruência e sobre o custo de Euclides.

**Erros comuns a cobrir.** Testar divisores até n em vez de √n; crivo marcando múltiplos a partir de 2·p em vez de p²; `%` com negativos (Python devolve não negativo — mostrar); exponenciação ingênua estourando o tempo.
