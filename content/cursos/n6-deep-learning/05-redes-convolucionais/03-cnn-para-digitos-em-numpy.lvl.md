---
slug: n6-m5-03-cnn-para-digitos-em-numpy
titulo: Uma CNN pequena para dígitos em numpy
descricao: Montar conv → ReLU → pool → densa → softmax, treinar nos dígitos 8×8 com Adam, comparar com o MLP e visualizar filtros e mapas de ativação.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- scikit-learn
xp: 140
tempo_min: 60
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Montar e treinar uma CNN completa em numpy com os blocos implementados
- Comparar acurácia e número de parâmetros com o MLP do módulo anterior
- Visualizar filtros aprendidos e mapas de ativação para interpretar a rede
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Arquitetura mínima (1 conv com 8 filtros 3×3, pool 2×2, densa, softmax); forward/backward encadeados; treino lento em numpy (poucas épocas, lote pequeno) com meta de ≥ 96 %; comparação de parâmetros e invariância a deslocamento (teste com imagens deslocadas); filtros como imagens; mapas de ativação por exemplo; passo opcional em PyTorch (não verificado).

**Exercícios previstos.** `montar_cnn(semente)` com contagem de parâmetros exata (`call`); `treinar_cnn(config)` com acurácia ≥ 0,96 e limite de tempo (`call`); `robustez_a_deslocamento(modelo, X, y)` comparando CNN vs MLP (`call`); `mapas_de_ativacao(modelo, imagem)` (`call` shapes); quiz sobre parâmetros.

**Erros comuns a cobrir.** Esquecer de achatar antes da densa (ou achatar na ordem errada); treinar com lote grande demais para o tempo do sandbox; comparar com MLP sem a mesma divisão; pooling sem ReLU antes.
