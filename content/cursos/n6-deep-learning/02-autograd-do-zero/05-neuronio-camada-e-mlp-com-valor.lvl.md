---
slug: n6-m2-05-neuronio-camada-e-mlp-com-valor
titulo: Neurônio, camada e MLP com Valor
descricao: Classes Neuronio, Camada e MLP sobre Valor, parâmetros, um loop de treino completo em um conjunto pequeno e a visualização da perda caindo.
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
- Construir Neuronio, Camada e MLP sobre Valor com um método parametros()
- Treinar o MLP com gradiente descendente em um conjunto pequeno e ver a perda cair
- Diagnosticar o treino (taxa de aprendizado, gradientes zerados) com o grafo
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** `Neuronio(n_entradas)` com pesos aleatórios e `tanh`; `Camada`; `MLP([3, 4, 4, 1])`; `parametros()` achatado; loop: forward → perda MSE → `zero_grad` → `backward` → `p.dado -= taxa * p.grad`; o conjunto de 4 exemplos do micrograd; perda caindo abaixo de um limiar; o custo de escalares (milhares de objetos) como motivação para a vetorização do módulo 4.

**Exercícios previstos.** Classes com contagem exata de parâmetros (`expr`: `len(mlp.parametros()) == 41` para [3,4,4,1]); `treinar(mlp, X, y, taxa, passos)` com perda final < 0,05 em semente fixa (`expr` + `tolerance`); `diagnosticar(historico)` (`call`); `prever(mlp, X)` com sinais corretos (`expr`); quiz sobre `zero_grad` e taxa.

**Erros comuns a cobrir.** Esquecer `zero_grad` (gradientes acumulam e o treino diverge); atualizar com `+`; taxa alta demais para `tanh`; `parametros()` devolvendo cópias (atualização não afeta a rede).
