---
slug: n6-m3-04-otimizadores
titulo: 'Otimizadores: momentum, RMSProp e Adam'
descricao: Por que SGD puro oscila, momentum e Nesterov, taxas adaptativas (AdaGrad, RMSProp), Adam com correção de viés e weight decay; comparação em uma função-teste e no MLP.
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
- Implementar SGD com momentum, RMSProp e Adam como classes com estado
- Comparar os otimizadores em uma função de vale alongado e no treino do MLP
- Explicar a correção de viés do Adam e a diferença entre L2 e weight decay desacoplado
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Oscilação em vales (visualização); momentum como média móvel do gradiente; RMSProp normalizando por magnitude; Adam = ambos com correção de viés nos primeiros passos; hiperparâmetros padrão (β₁ 0,9, β₂ 0,999, ε); AdamW; interface `Otimizador.passo(params, grads)` com estado por parâmetro; trajetórias comparadas.

**Exercícios previstos.** Classes `SGD`, `Momentum`, `RMSProp`, `Adam` com `passo` (`expr` comparando trajetórias com valores de referência + `tolerance`); `correcao_de_vies(m, v, t, b1, b2)` (`call`); `comparar_otimizadores(f, grad, x0, passos)` devolvendo qual chega mais perto (`call`); `treinar_mlp_com(otimizador)` com perda abaixo do limiar em menos épocas (`call`); quiz sobre β e ε.

**Erros comuns a cobrir.** Estado compartilhado entre parâmetros (um só `m`); esquecer `ε`; correção de viés com `t` começando em 0; weight decay aplicado dentro do momento (L2) quando se pede AdamW.
