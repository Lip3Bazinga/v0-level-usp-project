---
slug: n4-m6-05-intervalos-de-confianca
titulo: Intervalos de confiança
descricao: IC para média (z e t) e para proporção, interpretação correta, largura em função de n e de confiança, e bootstrap.
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
- Calcular IC para média (t de Student) e para proporção com scipy
- Interpretar corretamente 'IC de 95 %' e refutar interpretações erradas
- Construir IC por bootstrap e comparar com o paramétrico
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Fórmulas, `scipy.stats.t.interval`/`norm.interval`, IC de proporção (Wald e Wilson citado); o que 95 % significa (simulação com 100 ICs: ~95 cobrem); margem de erro de pesquisas eleitorais ('2 pontos percentuais'); bootstrap percentílico; IC vs 'intervalo de previsão'.

**Exercícios previstos.** `ic_media(amostra, confianca)` (`call` + `tolerance`); `ic_proporcao(sucessos, n, confianca)` (`call`); `cobertura_simulada(mu, sigma, n, repeticoes, semente)` próximo de 0,95 (`call` + `tolerance 0.03`); `ic_bootstrap(amostra, estatistica, n_reamostras, semente)` (`call`); quiz com interpretações para marcar certo/errado.

**Erros comuns a cobrir.** 'Há 95 % de chance de a média estar no intervalo'; usar z com n pequeno e σ desconhecido; IC de proporção com p próximo de 0 ou 1 pelo Wald.
