---
slug: n6-m5-04-arquiteturas-classicas
titulo: 'Arquiteturas clássicas: de LeNet a ResNet'
descricao: LeNet, AlexNet, VGG, Inception, ResNet (conexões residuais e por que destravam a profundidade), transfer learning e o que mudou com os transformers de visão.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
xp: 90
tempo_min: 35
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Descrever as ideias centrais de LeNet, VGG, Inception e ResNet
- Explicar por que conexões residuais facilitam o treino de redes profundas
- Explicar transfer learning e quando ajustar só a cabeça ou toda a rede
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Lição de leitura com quiz e um exercício de contagem: linha do tempo e ImageNet; VGG (3×3 empilhados), Inception (ramos paralelos), ResNet (`y = F(x) + x`, gradiente que passa direto — demonstrado com a derivada do bloco); batchnorm em CNNs; transfer learning (congelar, ajustar); ViT em um parágrafo; custo computacional e GPUs (por que o curso treina em 8×8).

**Exercícios previstos.** `bloco_residual_forward(x, F)` e demonstração de que o gradiente de identidade é 1 (`call` + `tolerance`); `parametros_vgg_simplificada(config)` (`call`); `estrategia_de_transfer(tamanho_dados, similaridade)` (`call`); quiz de 5 perguntas.

**Erros comuns a cobrir.** Achar que mais camadas sempre ajuda (sem residual, degrada); transfer learning com normalização diferente da rede base; ajustar tudo com poucos dados.
