---
slug: n5-m1-05-probabilidade-e-maxima-verossimilhanca
titulo: Probabilidade e máxima verossimilhança
descricao: Modelos probabilísticos, verossimilhança, log-verossimilhança, por que minimizar MSE é MLE gaussiana e por que a perda logística é MLE de Bernoulli.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
xp: 100
tempo_min: 40
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Escrever a verossimilhança de um modelo simples e maximizá-la numericamente
- Explicar a relação entre MSE e verossimilhança gaussiana e entre perda logística e Bernoulli
- Interpretar as saídas de um modelo como probabilidades e calibrá-las em um exemplo
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Estimar p de uma moeda por MLE (analítico e numérico); log para transformar produto em soma; Bernoulli → entropia cruzada binária; gaussiana → MSE; MLE da média e da variância; o que 'probabilidade prevista' significa e um diagrama de calibração simples; MAP e regularização como 'prior' em uma frase (gancho para ridge).

**Exercícios previstos.** `log_verossimilhanca_bernoulli(p, dados)` e `mle_moeda(dados)` (`call` + `tolerance`); `mle_gaussiana(dados)` (`call`); `entropia_cruzada(y, p)` vetorizada e estável (`call`); `curva_de_calibracao(y, p, bins)` (`call`); quiz sobre log-verossimilhança.

**Erros comuns a cobrir.** `log(0)` sem clipe; confundir verossimilhança com probabilidade dos parâmetros; maximizar em vez de minimizar o negativo; variância MLE com `ddof=1`.
