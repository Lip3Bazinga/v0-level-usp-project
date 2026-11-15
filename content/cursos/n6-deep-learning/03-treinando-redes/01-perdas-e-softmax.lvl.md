---
slug: n6-m3-01-perdas-e-softmax
titulo: Funções de perda, softmax e entropia cruzada
descricao: MSE para regressão, entropia cruzada binária e categórica, softmax estável, o gradiente 'p − y' e a implementação vetorizada com rótulos inteiros.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
xp: 110
tempo_min: 45
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Implementar softmax e entropia cruzada estáveis e vetorizadas para lotes
- Derivar e implementar o gradiente da combinação softmax + entropia cruzada (p − y)
- Escolher a perda pela tarefa e interpretar seu valor (perda de 'chute' = log k)
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** MSE, BCE, CCE; softmax com subtração do máximo; `log-softmax` estável (`logsumexp`); gradiente conjunto `(P − Y)/n`; rótulos inteiros com indexação avançada em vez de one-hot; perda inicial esperada `ln(k)` como teste de sanidade (dica do CS231n); perda com pesos por classe.

**Exercícios previstos.** `softmax(Z)` e `log_softmax(Z)` estáveis (`call` com valores de 1000); `entropia_cruzada(Z, y)` (`call` + `tolerance`); `grad_entropia_cruzada(Z, y)` conferido numericamente (`call`); `perda_de_chute(k)` (`call`); quiz sobre perda inicial.

**Erros comuns a cobrir.** `log(softmax)` em vez de `log_softmax`; esquecer de dividir por n; one-hot com `k` errado; gradiente sem subtrair 1 na classe correta.
