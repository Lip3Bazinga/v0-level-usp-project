---
slug: n7-m4-03-re-ranking-e-busca-hibrida
titulo: Re-ranking e busca híbrida com BM25
descricao: BM25 do zero, fusão de rankings (RRF), re-ranking por relevância com o simulado, e quando a busca lexical ganha da vetorial.
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
- Implementar BM25 (TF saturado, IDF, normalização por tamanho) e comparar com a busca vetorial
- Fundir rankings com Reciprocal Rank Fusion e re-ranquear os top-n com um modelo
- Escolher a estratégia de recuperação pelos dados de avaliação (nomes, códigos, siglas vs semântica)
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Tokenização simples, IDF, saturação k1 e normalização b; onde o lexical vence (códigos de disciplina, siglas, nomes próprios); RRF; re-ranking com um 'cross-encoder' simulado (pontua pares pergunta-trecho); custo do re-ranking (só top-n); avaliação de cada combinação no conjunto.

**Exercícios previstos.** `bm25(corpus, consulta, k1, b)` (`call` + `tolerance`); `rrf(rankings, k)` (`call`); `reranquear(cliente, pergunta, trechos, n)` (`expr`); `comparar_estrategias(conjunto)` devolvendo recall@3 de vetorial, BM25, híbrida e híbrida+rerank (`expr`); quiz.

**Erros comuns a cobrir.** IDF sem suavização (termos em todos os docs); normalizar BM25 e cosseno e somar diretamente (escalas diferentes — por isso RRF); re-ranquear tudo (lento); tokenização diferente entre indexação e consulta.
