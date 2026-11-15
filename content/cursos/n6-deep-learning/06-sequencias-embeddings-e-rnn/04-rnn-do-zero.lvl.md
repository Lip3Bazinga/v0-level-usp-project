---
slug: n6-m6-04-rnn-do-zero
titulo: RNN do zero e backprop no tempo
descricao: Estado escondido recorrente, forward sobre uma sequência, backprop através do tempo (BPTT), gradientes que somem/explodem, clipping e truncamento, e geração caractere a caractere.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
xp: 140
tempo_min: 60
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Implementar a célula RNN e o forward sobre sequências com estado
- Implementar BPTT com verificação numérica e clipping de gradiente
- Demonstrar o gradiente que some/explode em função do comprimento e treinar um gerador de nomes
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** `h_t = tanh(W_xh x_t + W_hh h_{t−1} + b)`, saída por passo; desenrolar no tempo; BPTT acumulando gradientes em `W_hh` em todos os passos; norma do gradiente vs comprimento (potências de `W_hh`); clipping e truncamento; treinar nos nomes com contexto variável (vantagem sobre o MLP de janela fixa); amostragem com estado.

**Exercícios previstos.** `rnn_forward(params, X_seq, h0)` (`call` + `tolerance`); `rnn_backward(dout_seq, cache)` com grad check (`call`); `norma_do_gradiente_vs_comprimento(params, T)` crescendo/decaindo (`call`); `treinar_rnn(config)` com NLL abaixo do limiar (`call` + limite de tempo); `amostrar_rnn(params, itos, semente)` (`call`); quiz sobre BPTT.

**Erros comuns a cobrir.** Não acumular `dW_hh` ao longo do tempo; perder `dh` que vem do passo seguinte; esquecer o `tanh'`; clipping antes de somar os gradientes de todos os passos.
