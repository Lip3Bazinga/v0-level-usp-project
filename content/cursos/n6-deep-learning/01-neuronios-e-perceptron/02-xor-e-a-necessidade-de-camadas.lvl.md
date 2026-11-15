---
slug: n6-m1-02-xor-e-a-necessidade-de-camadas
titulo: O problema do XOR e a necessidade de camadas
descricao: Por que uma camada linear não resolve XOR, como uma camada escondida cria novas representações, e o teorema da aproximação universal em uma página.
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
- Demonstrar que nenhum perceptron resolve XOR e explicar geometricamente
- Construir à mão uma rede de duas camadas que resolve XOR
- Explicar informalmente o teorema da aproximação universal e seus limites práticos
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Separabilidade linear; o XOR e a prova por exaustão; uma camada escondida com dois neurônios ReLU/degrau cujos pesos são dados e o aluno confere; a camada escondida como mudança de coordenadas (visualizada); aproximação universal (ideia de 'degraus') e por que profundidade ajuda; composição de funções lineares continua linear (por que precisa de não linearidade).

**Exercícios previstos.** `tentar_perceptron_xor()` devolvendo o mínimo de erros possível (1) (`call`); `rede_xor_manual(x)` com pesos fornecidos (`call` para as 4 entradas); `composicao_linear_e_linear(W1, W2)` devolvendo a matriz única equivalente (`call`); `aproximar_degraus(f, n_degraus)` com soma de ReLUs (`call` + `tolerance`); quiz.

**Erros comuns a cobrir.** Esquecer a não linearidade entre camadas; pesos do XOR manual com sinal trocado; confundir 'pode aproximar' com 'vai aprender'.
