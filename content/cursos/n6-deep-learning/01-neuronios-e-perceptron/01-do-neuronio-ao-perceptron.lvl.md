---
slug: n6-m1-01-do-neuronio-ao-perceptron
titulo: Do neurônio biológico ao perceptron
descricao: A inspiração biológica, o neurônio artificial (pesos, viés, ativação), o algoritmo de aprendizado do perceptron e sua garantia de convergência para dados separáveis.
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
- Descrever o neurônio artificial como soma ponderada seguida de ativação
- Implementar o algoritmo do perceptron e observar a convergência em dados linearmente separáveis
- Relacionar o perceptron com a regressão logística do Nível 5
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Breve história (McCulloch-Pitts, Rosenblatt); `z = w·x + b`, degrau; a regra de atualização do perceptron e sua interpretação geométrica (mover a fronteira na direção do erro); convergência garantida se separável; a logística como perceptron 'suave' treinável por gradiente; portas lógicas AND/OR com perceptron.

**Exercícios previstos.** `perceptron_prever(X, w, b)` (`call`); `treinar_perceptron(X, y, epocas)` convergindo em AND e OR com zero erros (`call`); `fronteira(w, b)` devolvendo dois pontos da reta (`call` + `tolerance`); `erros_por_epoca(X, y)` decrescendo (`call`); quiz sobre a regra de atualização.

**Erros comuns a cobrir.** Rótulos 0/1 vs −1/+1 na regra de atualização; não embaralhar e ficar preso; esquecer o viés; esperar convergência no XOR.
