---
slug: n5-m2-02-gradiente-descendente-batch-e-estocastico
titulo: Gradiente descendente batch, mini-batch e estocástico
descricao: Treinar a regressão com GD completo, por mini-lotes e por exemplo; épocas, embaralhamento, curva de custo e comparação de convergência.
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
- Implementar o treino por gradiente descendente batch, mini-batch e estocástico
- Registrar e comparar as curvas de custo e explicar o ruído do SGD
- Escolher tamanho de lote e número de épocas com base nas curvas
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Loop de treino (épocas, embaralhar com semente, fatiar lotes, atualizar); batch vs mini-batch vs SGD em custo por passo e por época; ruído do SGD como vantagem (escapar de mínimos) e desvantagem (oscilação); decaimento da taxa; implementação que o Nível 6 reaproveita. Comparação com a solução exata.

**Exercícios previstos.** `treinar_batch(X, y, taxa, epocas)` devolvendo `w, b, historico` (`call` + `tolerance`); `treinar_minibatch(X, y, taxa, epocas, tamanho_lote, semente)` (`call`); `treinar_sgd` (`call` com `tolerance` ampla); `comparar_convergencia(historicos)` devolvendo qual chegou a custo < limiar primeiro (`call`); quiz sobre época vs passo.

**Erros comuns a cobrir.** Não embaralhar entre épocas; lotes com o último incompleto descartado sem querer; taxa igual para batch e SGD (SGD precisa menor); registrar o custo do lote como se fosse do conjunto.
