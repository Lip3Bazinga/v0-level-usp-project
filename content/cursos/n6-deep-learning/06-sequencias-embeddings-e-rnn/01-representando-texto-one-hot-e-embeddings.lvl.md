---
slug: n6-m6-01-representando-texto-one-hot-e-embeddings
titulo: 'Representando texto: one-hot e embeddings'
descricao: Vocabulário de caracteres e de palavras, one-hot e sua esparsidade, tabela de embeddings como camada treinável, similaridade entre vetores e o gradiente de uma consulta à tabela.
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
- Construir vocabulários e codificar/decodificar sequências de caracteres
- Implementar uma camada de embedding com forward (indexação) e backward (acumulação)
- Calcular similaridades entre embeddings e explicar o que elas capturam após o treino
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** `stoi`/`itos`; one-hot e por que `onehot @ W` é só indexar a linha; embedding como tabela (V × d) treinável; backward = somar o gradiente nas linhas usadas (`np.add.at`); similaridade de cosseno; vizinhos mais próximos; o corpus de nomes brasileiros (fornecido) usado pelo módulo inteiro; tokens especiais `<ini>`/`<fim>`.

**Exercícios previstos.** `construir_vocabulario(textos)` (`call`); `codificar/decodificar` (`call`); `embedding_forward(E, indices)` e `embedding_backward(dout, indices, V)` com `np.add.at` e grad check (`call` + `tolerance`); `vizinhos(E, idx, k)` (`call`); quiz sobre esparsidade.

**Erros comuns a cobrir.** Backward com indexação direta `dE[idx] += ...` (índices repetidos não acumulam); vocabulário construído com o teste; esquecer tokens especiais; comparar embeddings não normalizados.
