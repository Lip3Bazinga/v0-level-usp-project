---
slug: n5-m2-01-modelo-linear-e-mse
titulo: O modelo linear e o erro quadrático
descricao: Hipótese h(x) = Xw + b, custo MSE, superfície de custo em 2D e a solução de uma variável à mão.
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
- Implementar a predição linear vetorizada com coluna de 1s ou viés separado
- Calcular o MSE e visualizar a superfície de custo para um modelo de um atributo
- Derivar o gradiente do MSE em forma matricial
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Notação (`X` n×d, `w` d, `b`), predição `X @ w + b`, truque da coluna de 1s; MSE e sua superfície (bacia convexa); gradiente `(2/n) Xᵀ(Xw − y)`; conferência com o gradiente numérico; dados sintéticos com ruído gerados com semente (usados no módulo inteiro).

**Exercícios previstos.** `prever(X, w, b)` (`call` + `tolerance`); `mse(y, y_pred)` (`call`); `gradiente_mse(X, y, w, b)` conferido numericamente (`call` + `tolerance`); `superficie_de_custo(x, y, ws, bs)` devolvendo a grade (`call`); quiz sobre a forma do gradiente.

**Erros comuns a cobrir.** Esquecer o fator 2/n (afeta só a escala — explicar); `X @ w` com shapes errados; MSE somado em vez de médio; confundir `w` com `X`.
