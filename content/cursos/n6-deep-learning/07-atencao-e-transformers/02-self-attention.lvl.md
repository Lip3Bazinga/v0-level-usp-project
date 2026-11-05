---
slug: n6-m7-02-self-attention
titulo: Self-attention
descricao: Consultas, chaves e valores, pontuações por produto escalar, escala por √d, softmax por linha e a soma ponderada; forward e backward em numpy para uma sequência.
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
- Implementar self-attention (Q, K, V, pontuações, softmax, saída) para uma cabeça
- Explicar a escala 1/√d e a interpretação dos pesos de atenção
- Implementar o backward da atenção e verificar numericamente
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** A ideia: cada posição pergunta (Q) e cada posição responde (K) e oferece (V); `A = softmax(QKᵀ/√d)`; por que a escala (variância das pontuações); saída `A V`; atenção como média ponderada dependente dos dados (vs RNN); visualizar `A` em uma frase; backward passo a passo (softmax por linha, produtos); custo O(T²).

**Exercícios previstos.** `atencao_forward(X, Wq, Wk, Wv)` (`call` + `tolerance`); `verificar_escala(d, semente)` comparando variâncias (`call`); `atencao_backward(dout, cache)` com grad check (`call`); `pesos_de_atencao(X, ...)` com linhas somando 1 (`call`); quiz sobre Q/K/V.

**Erros comuns a cobrir.** Softmax pelo eixo errado; esquecer a escala; transpor K errado; backward da softmax sem o termo de acoplamento.
