---
slug: n6-m6-05-lstm-e-gru
titulo: LSTM e GRU
descricao: Portas de esquecimento, entrada e saída, o estado de célula como 'rodovia' do gradiente, GRU como simplificação, e por que mesmo assim os transformers venceram.
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
- Implementar o forward da célula LSTM e explicar o papel de cada porta
- Explicar como o estado de célula aditivo mitiga o gradiente que some
- Comparar LSTM, GRU e RNN simples em custo e capacidade, e listar as limitações que motivaram a atenção
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Equações da LSTM com portas sigmoides e candidato tanh; o caminho aditivo `c_t = f·c_{t−1} + i·g` e seu gradiente; GRU; bidirecionais e empilhadas em uma frase; aplicações históricas (tradução seq2seq) e o gargalo do vetor único — a motivação da atenção; backward da LSTM fica como leitura (derivação fornecida) e passo opcional em PyTorch.

**Exercícios previstos.** `lstm_forward(params, X_seq)` (`call` + `tolerance`); `gradiente_pelo_estado_de_celula(f_seq)` mostrando produto de portas (`call`); `gru_forward` (`call`); `contar_parametros(tipo, d_in, d_h)` (`call`); quiz de 4 perguntas.

**Erros comuns a cobrir.** Portas com `tanh` em vez de sigmoide; esquecer o `tanh` na saída `h = o · tanh(c)`; concatenação `[h, x]` na ordem errada em relação aos pesos; contar parâmetros sem os 4 blocos.
