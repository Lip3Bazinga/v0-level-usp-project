---
slug: n6-m7-06-geracao-de-texto-e-amostragem
titulo: Geração de texto e amostragem
descricao: Decodificação autoregressiva, temperatura, top-k, top-p (nucleus), busca gulosa vs amostragem, repetição e o que 'alucinação' significa em um modelo de próximo token.
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
- Implementar a geração autoregressiva com janela de contexto deslizante
- Implementar temperatura, top-k e top-p e observar o efeito na diversidade e na coerência
- Explicar por que o modelo 'inventa' e relacionar isso com a distribuição de próximo token
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Loop de geração (últimos T tokens → logits → amostrar → anexar); temperatura (achatar/afiar); top-k e nucleus; guloso e repetição; sementes e reprodutibilidade; medir diversidade (tokens distintos) e NLL do texto gerado; o modelo não 'sabe' fatos: maximiza plausibilidade local — a ponte para o Nível 7 (RAG, avaliação).

**Exercícios previstos.** `gerar(params, ids_iniciais, n, temperatura, semente)` determinístico (`call`); `top_k_filtrar(logits, k)` e `top_p_filtrar(probs, p)` (`call` + `tolerance`); `diversidade(textos)` (`call`); `comparar_estrategias(params, prompt)` devolvendo repetição por estratégia (`call`); quiz sobre temperatura.

**Erros comuns a cobrir.** Temperatura aplicada após o softmax; top-p sem ordenar; esquecer de truncar o contexto a T (shape errado); amostrar com `np.random` sem a semente do enunciado.
