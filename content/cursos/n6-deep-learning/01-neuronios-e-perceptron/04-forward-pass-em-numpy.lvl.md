---
slug: n6-m1-04-forward-pass-em-numpy
titulo: Forward pass de uma camada em numpy
descricao: Camada densa como X @ W + b, shapes em lote, inicialização, empilhar camadas e medir a perda; a rede como função pura.
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
- Implementar camadas densas vetorizadas para lotes e prever os shapes de cada tensor
- Empilhar camadas com ativações em uma função forward e calcular a perda
- Inicializar pesos com escala adequada e observar o efeito nas ativações
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Convenção (n, d_in) @ (d_in, d_out) + (d_out,) com broadcasting; `forward(params, X)` como função pura (facilita backprop e testes); perda MSE/entropia cruzada no fim; inicialização (zeros é ruim: simetria; aleatória pequena; escala ~1/√d_in — Xavier/He citados, aprofundados depois); histograma das ativações por camada.

**Exercícios previstos.** `camada_densa(X, W, b)` (`call` + shapes); `inicializar(dims, semente)` com shapes corretos (`call`); `forward_mlp(params, X, ativacao)` devolvendo saída e cache (`call` + `tolerance`); `estatisticas_de_ativacao(params, X)` mostrando colapso com escala errada (`call`); quiz sobre shapes.

**Erros comuns a cobrir.** `W` com shape transposto; viés com shape (d_out, 1); inicializar com zeros; esquecer a ativação da última camada (ou colocá-la onde a perda já a inclui).
