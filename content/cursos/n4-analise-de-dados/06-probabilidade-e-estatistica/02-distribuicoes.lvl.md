---
slug: n4-m6-02-distribuicoes
titulo: 'Distribuições: binomial, Poisson, uniforme, normal e exponencial'
descricao: Variáveis aleatórias, esperança e variância, as distribuições mais usadas com scipy.stats, a regra 68-95-99,7 e quantis.
dificuldade: intermediario
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- pandas
- scipy
xp: 120
tempo_min: 50
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Identificar a distribuição adequada a um fenômeno (contagem, tempo entre eventos, medida contínua)
- Calcular probabilidades e quantis com scipy.stats (pmf, pdf, cdf, ppf) e esperança/variância
- Comparar um histograma de dados com a densidade teórica
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Variável aleatória, E[X], Var[X]; binomial (n, p), Poisson (λ), uniforme, normal (μ, σ) e a regra empírica, exponencial; `scipy.stats.binom/poisson/norm/expon` com `pmf/pdf/cdf/ppf/rvs`; z-score; ajustar normal a dados (`norm.fit`) e comparar; quando a normal não serve (renda, tempos).

**Exercícios previstos.** `prob_binomial(n, p, k)` e comparação com simulação (`call` + `tolerance`); `prob_normal_entre(mu, sigma, a, b)` (`call`); `quantil_normal(mu, sigma, p)` para 'nota de corte dos 5 % melhores' (`call`); `chamadas_por_hora_poisson(lam, k)` (`call`); `esperanca_variancia(valores, probabilidades)` (`call`); quiz sobre a regra 68-95-99,7.

**Erros comuns a cobrir.** `pmf` em distribuição contínua; `cdf(b) - cdf(a)` com `a` e `b` trocados; usar variância onde se pede desvio; assumir normalidade por hábito.
