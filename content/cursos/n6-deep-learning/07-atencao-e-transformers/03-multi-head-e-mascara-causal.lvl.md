---
slug: n6-m7-03-multi-head-e-mascara-causal
titulo: Multi-head attention e máscara causal
descricao: Várias cabeças em paralelo com projeções menores, concatenação e projeção de saída, a máscara triangular que impede olhar o futuro, e a atenção em lotes.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
xp: 130
tempo_min: 55
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Implementar multi-head attention com reshape/transposição em lotes
- Aplicar a máscara causal com −inf antes do softmax e explicar por que ela é necessária para modelar linguagem
- Contar parâmetros e custo da atenção em função de T, d e número de cabeças
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Cabeças como subespaços; tensores (B, T, d) → (B, h, T, d/h); máscara triangular inferior (`np.triu` com −inf); por que o treino paralelo exige a máscara (cada posição prevê a próxima); projeção de saída; dropout na atenção citado; verificação de que a posição t não depende de t+1 (teste de causalidade).

**Exercícios previstos.** `dividir_em_cabecas(X, h)` e `juntar_cabecas` (`call` shapes e roundtrip); `atencao_causal(Q, K, V)` (`call` + `tolerance`); `teste_de_causalidade(modelo, X)` mudando o futuro e conferindo que o passado não muda (`call`); `multi_head_forward(params, X)` (`call`); `custo_atencao(T, d, h)` (`call`); quiz.

**Erros comuns a cobrir.** Máscara com 0 em vez de −inf (ainda vaza); mascarar depois do softmax; transposição de eixos errada ao juntar cabeças; esquecer a projeção de saída.
