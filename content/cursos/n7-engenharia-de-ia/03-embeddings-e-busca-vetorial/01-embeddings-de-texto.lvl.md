---
slug: n7-m3-01-embeddings-de-texto
titulo: Embeddings de texto
descricao: Do embedding de token (Nível 6) ao embedding de frase, modelos de embedding e suas dimensões, normalização, e um modelo de embedding simulado (hash + projeção) para os exercícios.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
xp: 100
tempo_min: 40
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Explicar o que um embedding de frase representa e como é obtido de um modelo
- Normalizar embeddings e calcular similaridade de cosseno em lote
- Usar o embedding simulado fornecido e saber trocá-lo por um modelo real
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Ponte com o Nível 6 (embeddings de token, média/pooling → frase); modelos de embedding e dimensões; o `embedding_simulado(texto) -> vetor` fornecido (bag of n-grams com hashing + projeção fixa, determinístico, captura sobreposição lexical e sinônimos de uma lista); normalização L2; cosseno vs produto interno; distâncias e seus limites (negação, ironia); custo de embutir documentos.

**Exercícios previstos.** `embutir(textos)` com normalização (`call` shapes e normas); `similaridade(a, b)` e `matriz_de_similaridade(E)` (`call` + `tolerance`); `mais_similares(consulta, textos, k)` (`call`); `pares_proximos(textos, limiar)` (`call`); quiz sobre cosseno vs euclidiana.

**Erros comuns a cobrir.** Comparar embeddings de modelos diferentes; esquecer de normalizar; interpretar similaridade 0,7 sem calibrar por tarefa; embutir texto maior que o limite do modelo.
