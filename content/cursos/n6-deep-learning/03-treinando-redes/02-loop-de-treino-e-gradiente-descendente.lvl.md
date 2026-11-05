---
slug: n6-m3-02-loop-de-treino-e-gradiente-descendente
titulo: O loop de treino
descricao: 'Forward, perda, backward, atualização: o loop canônico, registro de métricas de treino e validação, e os testes de sanidade antes de treinar de verdade.'
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
xp: 120
tempo_min: 50
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Escrever o loop de treino com registro de perda e acurácia em treino e validação
- 'Aplicar os testes de sanidade: perda inicial, sobreajustar um lote minúsculo, gradiente numérico'
- Organizar o código em funções puras (forward, perda, backward, passo) reutilizáveis
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** O loop como contrato; histórico por época; os três testes de sanidade (perda inicial ≈ ln k; decorar 10 exemplos até perda ~0; grad check); separar dados de validação; semente; imprimir a cada N passos; salvar o melhor estado (dicionário de arrays).

**Exercícios previstos.** `loop_de_treino(forward, backward, params, dados, config)` com histórico (`call` + `tolerance`); `sobreajustar_lote(params, X_pequeno, y_pequeno)` atingindo perda < 0,01 (`call`); `checar_gradiente(forward, params, X, y)` com erro relativo < 1e-5 (`call`); `melhor_estado(historico, estados)` (`call`); quiz sobre os testes de sanidade.

**Erros comuns a cobrir.** Avaliar validação com dropout/batchnorm em modo de treino (gancho); registrar perda do último lote como da época; não fixar semente; copiar parâmetros por referência ao salvar o melhor estado.
