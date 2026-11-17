---
slug: n6-m5-01-convolucao-2d-do-zero
titulo: Convolução 2D do zero
descricao: Filtros, correlação cruzada, padding e stride, filtros clássicos (bordas, blur), shapes de saída e a implementação com laços e depois vetorizada (im2col).
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
- Implementar a convolução 2D com padding e stride e prever o shape da saída
- Aplicar filtros clássicos a imagens e interpretar o resultado
- Vetorizar a convolução com im2col e comparar a velocidade
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Filtro deslizante (correlação cruzada, que todo mundo chama de convolução); fórmula do shape `(n + 2p − k)/s + 1`; filtros de Sobel e média aplicados aos dígitos; múltiplos canais e filtros (tensor 4D); im2col transformando a convolução em uma multiplicação de matrizes; compartilhamento de pesos e invariância a translação como motivação.

**Exercícios previstos.** `conv2d_laco(imagem, filtro, padding, stride)` (`call` + `tolerance`); `shape_de_saida(n, k, p, s)` (`call`); `aplicar_sobel(imagem)` (`call`); `im2col(X, k, p, s)` e `conv2d_rapida` igual à de laço (`call` + limite de tempo); quiz sobre padding 'same'.

**Erros comuns a cobrir.** Inverter o filtro (convolução verdadeira) sem necessidade; shape de saída com arredondamento errado; padding só de um lado; im2col com colunas na ordem errada.
