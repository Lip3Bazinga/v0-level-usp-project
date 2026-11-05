---
slug: n5-m7-01-vazamento-de-dados
titulo: Vazamento de dados e validação honesta
descricao: Os tipos de vazamento (alvo, temporal, pré-processamento, duplicatas), como detectá-los e como o pipeline e a divisão correta os evitam.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- pandas
- scikit-learn
xp: 110
tempo_min: 45
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Identificar vazamento de alvo, temporal e de pré-processamento em um código de ML
- Corrigir o fluxo para que toda transformação seja ajustada só no treino
- Criar um teste automático que detecta desempenho 'bom demais'
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Atributos que contêm o futuro (data de cancelamento para prever cancelamento); padronização/imputação/seleção de atributos antes da divisão; duplicatas em treino e teste; séries temporais embaralhadas; sinais de alerta (AUC 0,99); checklist; `Pipeline` + `cross_val_score` como defesa estrutural.

**Exercícios previstos.** `encontrar_vazamento(codigo)` quiz-exercício com trechos (`call` devolvendo os identificadores); `corrigir_fluxo(X, y)` reescrevendo um fluxo com vazamento em pipeline, com desempenho caindo para o valor honesto (`call` + `tolerance`); `atributos_suspeitos(df, alvo)` por correlação quase perfeita (`call`); `detectar_duplicatas_entre_conjuntos(X_tr, X_te)` (`call`); quiz.

**Erros comuns a cobrir.** `fit_transform` no conjunto inteiro; seleção de atributos com o alvo antes da validação; alvo derivado de uma coluna de entrada; comemorar métricas perfeitas.
