---
slug: n6-m3-03-mini-batches-e-sgd
titulo: Mini-batches e SGD
descricao: Lotes, embaralhamento por época, tamanho do lote vs ruído e velocidade, e a relação entre taxa de aprendizado e tamanho do lote.
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
- Implementar a iteração por mini-batches com embaralhamento reproduzível
- Comparar perda por passo e por época para lotes de tamanhos diferentes
- Explicar a relação entre tamanho do lote, ruído do gradiente e taxa de aprendizado
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Gerador de lotes (índices embaralhados por época, último lote menor); curvas de perda suavizadas (média móvel); lote pequeno = mais passos ruidosos por época; regra prática de escalar a taxa com o lote; custo computacional e vetorização; `drop_last`.

**Exercícios previstos.** `gerar_lotes(n, tamanho, semente)` (`call` cobrindo todos os índices uma vez); `treinar_com_lotes(..., tamanho_lote)` devolvendo histórico (`call`); `comparar_tamanhos_de_lote(X, y, tamanhos)` (`call` + `tolerance` ampla); `suavizar(historico, janela)` (`call`); quiz sobre época vs passo.

**Erros comuns a cobrir.** Não embaralhar; embaralhar X e y separadamente; perda média do lote confundida com soma; taxa fixa ao mudar o lote.
