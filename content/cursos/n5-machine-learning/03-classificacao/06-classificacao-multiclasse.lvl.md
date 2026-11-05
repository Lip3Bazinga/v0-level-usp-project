---
slug: n5-m3-06-classificacao-multiclasse
titulo: 'Classificação multiclasse: softmax, um-contra-todos e métricas'
descricao: Estender a logística com softmax e entropia cruzada categórica, estratégias OvR/OvO, matriz de confusão k×k e métricas macro/ponderadas, nos dígitos do scikit-learn.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- scikit-learn
xp: 120
tempo_min: 50
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Implementar softmax estável e a regressão logística multinomial do zero
- Aplicar um-contra-todos com classificadores binários e comparar com softmax
- Avaliar com matriz de confusão k×k e métricas macro/ponderadas nos dígitos (load_digits)
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Softmax (subtrair o máximo), one-hot, entropia cruzada categórica, gradiente `Xᵀ(P − Y)/n`; OvR e OvO; `load_digits` (8×8, disponível offline) como primeiro 'visão computacional'; matriz de confusão 10×10 e quais dígitos se confundem; macro vs ponderada; preparação direta para o MLP do Nível 6.

**Exercícios previstos.** `softmax(Z)` estável (`call` com valores grandes); `one_hot(y, k)` (`call`); `treinar_softmax(X, Y, taxa, epocas)` com acurácia ≥ 0,9 nos dígitos (`call`); `um_contra_todos(X, y, treinador)` (`call`); `pares_mais_confundidos(matriz)` (`call`); quiz sobre softmax e OvR.

**Erros comuns a cobrir.** Softmax sem estabilização (overflow); one-hot com índice fora; esquecer de normalizar pixels; OvR sem calibrar scores entre classificadores.
