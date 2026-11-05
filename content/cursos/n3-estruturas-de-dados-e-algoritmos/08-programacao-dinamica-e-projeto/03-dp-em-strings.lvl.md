---
slug: n3-m8-03-dp-em-strings
titulo: Programação dinâmica em strings
descricao: Subsequência comum mais longa, distância de edição (Levenshtein), alinhamento e aplicações em corretores e diff.
dificuldade: intermediario
tipo: guiada
runtime: python
bibliotecas: []
xp: 120
tempo_min: 50
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Implementar LCS e distância de edição com tabelas bidimensionais
- Reconstruir a subsequência e a sequência de edições a partir da tabela
- Aplicar a distância de edição a sugestão de correção e o LCS a um diff simples
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Recorrência da LCS (igual: diagonal + 1; diferente: max das vizinhas), tabela e reconstrução; distância de edição com inserção/remoção/substituição; `diff` de linhas com LCS; corretor: palavra do dicionário com menor distância; menção a alinhamento de sequências em bioinformática e ao `difflib`; custo O(nm) e redução para duas linhas.

**Exercícios previstos.** `lcs(a, b)` devolvendo tamanho e uma subsequência (`call`); `distancia_edicao(a, b)` (`call` com strings de 2 000 caracteres e limite de tempo); `sugerir_correcao(palavra, dicionario)` (`call`); `diff_linhas(antes, depois)` com marcas `+`/`-` (`call`); quiz sobre a recorrência.

**Erros comuns a cobrir.** Índices da tabela desalinhados com os da string (linha 0 = string vazia); reconstrução escolhendo a direção errada no empate; distância sem o caso base da string vazia.
