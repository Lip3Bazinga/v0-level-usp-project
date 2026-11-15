---
slug: n4-m6-06-testes-de-hipotese
titulo: 'Testes de hipótese: t, qui-quadrado e p-valor'
descricao: H0 e H1, p-valor, erro tipo I e II, teste t (uma amostra, duas amostras, pareado), qui-quadrado de independência, tamanho de efeito e as armadilhas do p-valor.
dificuldade: intermediario
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- pandas
- scipy
xp: 130
tempo_min: 55
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Formular H0/H1, executar testes t e qui-quadrado com scipy e interpretar o p-valor
- Reportar tamanho de efeito (d de Cohen, diferença com IC) junto com o p-valor
- Reconhecer p-hacking, múltiplas comparações e a diferença entre significância estatística e prática
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** A lógica do teste; `ttest_1samp`, `ttest_ind` (Welch), `ttest_rel`, `chi2_contingency`; p-valor como P(dados tão extremos | H0); α, erros tipo I/II, poder (simulado); tamanho de efeito; teste A/B de um site; múltiplas comparações e Bonferroni; checagem de suposições (normalidade aproximada, variâncias); alternativas não paramétricas (Mann-Whitney) citadas.

**Exercícios previstos.** `teste_t_duas_amostras(a, b)` devolvendo estatística, p-valor e d de Cohen (`call` + `tolerance`); `teste_ab(conversoes_a, n_a, conversoes_b, n_b)` com qui-quadrado (`call`); `teste_pareado(antes, depois)` (`call`); `poder_simulado(diferenca, sigma, n, alpha, repeticoes, semente)` (`call` + `tolerance 0.03`); `corrigir_bonferroni(p_valores, alpha)` (`call`); quiz sobre interpretação do p-valor.

**Erros comuns a cobrir.** 'p = 0,03 significa 3 % de chance de H0 ser verdadeira'; teste pareado tratado como independente; rodar 20 testes e reportar o significativo; não reportar o efeito.
