---
slug: n6-m5-02-camadas-conv-e-pooling-com-backward
titulo: Camadas conv e pooling com backward
descricao: Backward da convolução (gradiente do filtro e da entrada) via im2col, max pooling e seu backward (roteamento), campo receptivo e contagem de parâmetros.
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
- Implementar forward e backward da camada convolucional e verificar numericamente
- Implementar max pooling com backward e explicar o roteamento do gradiente
- Calcular campo receptivo e número de parâmetros de uma pilha conv/pool
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Backward via im2col (a convolução vira densa: `dW = colsᵀ @ dout`, `dcols = dout @ Wᵀ`, `col2im` somando sobreposições); max pooling (máscara do máximo); campo receptivo crescendo com profundidade; parâmetros de conv (k·k·c_in·c_out + c_out) vs densa; batchnorm 2D citado.

**Exercícios previstos.** `conv_backward(dout, cache)` com grad check (`call` + `tolerance`); `col2im(cols, shape, k, p, s)` (`call`); `maxpool_forward/backward` (`call`); `campo_receptivo(arquitetura)` (`call`); `contar_parametros(arquitetura)` (`call`); quiz.

**Erros comuns a cobrir.** `col2im` sobrescrevendo em vez de somar; pooling backward distribuindo o gradiente para todos os elementos; esquecer o viés por filtro; campo receptivo sem considerar stride.
