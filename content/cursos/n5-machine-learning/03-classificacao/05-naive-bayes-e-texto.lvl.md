---
slug: n5-m3-05-naive-bayes-e-texto
titulo: Naive Bayes e classificação de texto
descricao: Bag of words, contagens e TF-IDF, o classificador Naive Bayes multinomial do zero com suavização de Laplace, e detecção de spam.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- scikit-learn
xp: 120
tempo_min: 50
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Transformar texto em vetores de contagem e TF-IDF com scikit-learn e do zero
- Implementar Naive Bayes multinomial com suavização e explicar a hipótese de independência
- Avaliar um classificador de spam com as métricas certas
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Tokenização simples, vocabulário, `CountVectorizer`, `TfidfVectorizer`; Bayes com produtório de probabilidades por palavra, log para evitar underflow, Laplace; por que 'ingênuo' funciona; pequeno corpus de mensagens em português fornecido; `MultinomialNB` para comparar; limitações (negação, ordem) como gancho para embeddings (Níveis 6 e 7).

**Exercícios previstos.** `bag_of_words(textos)` devolvendo vocabulário e matriz (`call`); `tf_idf(matriz)` (`call` + `tolerance`); `treinar_nb(X, y, alpha)` e `prever_nb` (`call`); `avaliar_spam(corpus)` com precisão/recall (`call` + `tolerance`); quiz sobre suavização.

**Erros comuns a cobrir.** Produto de probabilidades sem log (underflow); palavra ausente do vocabulário sem suavização (probabilidade zero); vocabulário construído com o teste (vazamento); tokenização sem `lower`.
