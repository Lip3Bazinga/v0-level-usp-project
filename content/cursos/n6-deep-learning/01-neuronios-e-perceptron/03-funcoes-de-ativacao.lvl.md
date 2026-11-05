---
slug: n6-m1-03-funcoes-de-ativacao
titulo: Funções de ativação
descricao: Sigmoide, tanh, ReLU e variantes (Leaky, GELU), suas derivadas, saturação, neurônios mortos e a escolha por camada.
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
- Implementar as ativações e suas derivadas vetorizadas e conferi-las numericamente
- Explicar saturação de gradiente na sigmoide/tanh e neurônios mortos na ReLU
- Escolher a ativação por camada (escondidas vs saída) conforme a tarefa
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Fórmulas, gráficos e derivadas; faixa de saída e centralização em zero; saturação (gradiente → 0 nas pontas) e o problema do gradiente que some; ReLU e esparsidade, neurônios mortos e Leaky ReLU; GELU como curiosidade (transformers); saída: sigmoide (binário), softmax (multiclasse), identidade (regressão).

**Exercícios previstos.** `sigmoide`, `tanh_`, `relu`, `leaky_relu` e derivadas (`call` + `tolerance` + verificação numérica); `fracao_saturada(z, ativacao, limiar)` (`call`); `neuronios_mortos(ativacoes)` (`call`); `ativacao_recomendada(camada, tarefa)` (`call`); quiz sobre derivadas.

**Erros comuns a cobrir.** Derivada da ReLU em 0 (convenção); `tanh` implementada com overflow; sigmoide na camada escondida de rede profunda; softmax em saída binária com um só neurônio.
