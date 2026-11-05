---
slug: n6-m6-02-modelo-de-bigramas
titulo: Modelo de linguagem por bigramas (makemore)
descricao: Contar pares de caracteres, suavização, amostrar nomes novos, avaliar com log-verossimilhança negativa, e depois o mesmo modelo como uma rede de uma camada treinada por gradiente.
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
- Construir o modelo de bigramas por contagem, com suavização, e amostrar sequências
- Avaliar modelos de linguagem com NLL média e perplexidade
- Treinar o bigrama como rede neural (one-hot → logits → softmax) e mostrar que converge para as contagens
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Matriz de contagens 27×27 dos nomes; normalizar em probabilidades; `rng.choice` com `p` para amostrar; NLL e perplexidade como métricas (o quanto o modelo 'se surpreende'); suavização; a versão neural: `W` 27×27, logits, softmax, NLL, gradiente, treino; regularização de `W` equivale à suavização; o 'makemore' parte 1 completo.

**Exercícios previstos.** `contar_bigramas(nomes, stoi)` (`call`); `probabilidades(contagens, suavizacao)` (`call` + `tolerance`); `amostrar(P, itos, semente, n)` com saída determinística (`call`); `nll_media(P, nomes)` (`call`); `treinar_bigrama_neural(nomes, passos, taxa)` com NLL ≈ contagem (`call` + `tolerance`); quiz sobre perplexidade.

**Erros comuns a cobrir.** Esquecer o token de fim (nomes infinitos); normalizar pelo eixo errado; NLL calculada com `log` de probabilidade zero; amostrar com `argmax` (sempre o mesmo nome).
