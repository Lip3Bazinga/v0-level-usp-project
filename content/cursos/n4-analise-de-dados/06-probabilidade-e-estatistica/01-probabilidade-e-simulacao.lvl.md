---
slug: n4-m6-01-probabilidade-e-simulacao
titulo: 'Probabilidade: regras e simulação'
descricao: Espaço amostral, eventos, regras da soma e do produto, independência, probabilidade condicional e Bayes, verificados por simulação.
dificuldade: intermediario
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- pandas
- scipy
xp: 110
tempo_min: 45
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Calcular probabilidades de eventos compostos com as regras básicas e por contagem
- Aplicar probabilidade condicional e o teorema de Bayes a um teste diagnóstico
- Confirmar resultados analíticos por simulação e explicar o erro de simulação
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Definições, regras, independência (e sua verificação), condicional, Bayes com o exemplo do teste de doença rara (valor preditivo positivo) e do problema de Monty Hall; simulação vetorizada com `default_rng`; aniversários em uma sala; comparação analítico × simulado.

**Exercícios previstos.** `prob_pelo_menos_um_seis(n_dados)` analítico (`call` + `tolerance`); `simular_monty_hall(n, semente)` devolvendo as taxas trocar/manter (`call` + `tolerance 0.02`); `bayes(prevalencia, sensibilidade, especificidade)` (`call` + `tolerance`); `prob_aniversario_igual(n)` (`call`); quiz sobre independência e condicional.

**Erros comuns a cobrir.** Somar probabilidades de eventos não disjuntos; confundir P(A|B) com P(B|A) (a falácia do promotor); simulação com n pequeno e conclusão forte.
