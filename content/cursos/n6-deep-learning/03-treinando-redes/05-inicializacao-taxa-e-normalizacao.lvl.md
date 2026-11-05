---
slug: n6-m3-05-inicializacao-taxa-e-normalizacao
titulo: Inicialização, taxa de aprendizado e normalização
descricao: Xavier e He, o que acontece com ativações e gradientes em redes profundas mal inicializadas, agendamento da taxa (warmup, cosseno), Batch Normalization e Layer Normalization com forward e backward.
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
- Implementar inicializações Xavier e He e medir estatísticas de ativação por camada
- Implementar agendamentos de taxa de aprendizado (passo, cosseno, warmup)
- Implementar BatchNorm e LayerNorm com forward e backward e explicar os modos treino/avaliação
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Variância das ativações camada a camada; Xavier (tanh) e He (ReLU) com justificativa de variância; gradientes que somem/explodem em 10 camadas; agendamentos; BatchNorm (média/variância do lote, γ, β, estatísticas móveis para avaliação) e seu backward (derivado passo a passo); LayerNorm (por exemplo, não por lote — a que os transformers usam); onde colocar a normalização.

**Exercícios previstos.** `inicializar_he(dims, semente)` com estatísticas de ativação estáveis em 10 camadas (`call` + `tolerance`); `agendar_taxa(tipo, passo, total, base)` (`call`); `batchnorm_forward(X, gamma, beta, eps)` e `batchnorm_backward(dout, cache)` conferido numericamente (`call` + `tolerance`); `layernorm_forward/backward` (`call`); `modo_avaliacao(bn, X)` usando estatísticas móveis (`call`); quiz sobre treino vs avaliação.

**Erros comuns a cobrir.** Inicialização pequena demais (ativações colapsam em 0) ou grande demais (saturam); BatchNorm em avaliação usando o lote; backward da normalização ignorando a dependência da média/variância em x; LayerNorm normalizando pelo eixo errado.
