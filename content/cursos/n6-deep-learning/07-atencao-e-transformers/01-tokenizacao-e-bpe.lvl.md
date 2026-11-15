---
slug: n6-m7-01-tokenizacao-e-bpe
titulo: Tokenização e BPE do zero
descricao: 'De caracteres a subpalavras: o algoritmo Byte Pair Encoding, treino do vocabulário, codificação e decodificação, e por que a tokenização explica várias esquisitices dos LLMs.'
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
- Implementar o treino do BPE (contar pares, mesclar o mais frequente) e a codificação/decodificação
- Medir a compressão (caracteres por token) e o efeito do tamanho do vocabulário
- Explicar efeitos da tokenização em LLMs (contagem de letras, línguas, números)
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Por que não caracteres (sequências longas) nem palavras (vocabulário infinito); BPE sobre bytes: contagem de pares adjacentes, mesclagem iterativa, `merges` ordenados; codificar aplicando as mesclas na ordem; decodificar concatenando; tokens especiais; compressão; tokenizadores reais (tiktoken) e exemplos de 'quantos r em morango'; português vs inglês em tokens por palavra.

**Exercícios previstos.** `contar_pares(ids)` (`call`); `mesclar(ids, par, novo_id)` (`call`); `treinar_bpe(texto, n_mesclas)` devolvendo `merges` (`call` com resultado determinístico); `codificar_bpe/decodificar_bpe` com ida e volta exata (`call` + `expr` roundtrip); `taxa_de_compressao(texto, merges)` (`call` + `tolerance`); quiz.

**Erros comuns a cobrir.** Aplicar mesclas fora da ordem de treino; contar pares sobrepostos errado (`aaa`); decodificar bytes inválidos sem `errors="replace"`; vocabulário treinado com texto de teste.
