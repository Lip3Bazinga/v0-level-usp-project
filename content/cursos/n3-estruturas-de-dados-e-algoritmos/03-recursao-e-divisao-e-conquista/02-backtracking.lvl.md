---
slug: n3-m3-02-backtracking
titulo: 'Backtracking: explorar e desfazer'
descricao: Gerar subconjuntos, permutações e combinações, resolver N-rainhas e sudoku pequeno com escolha → recursão → desfazer.
dificuldade: intermediario
tipo: guiada
runtime: python
bibliotecas: []
xp: 130
tempo_min: 55
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Implementar o esqueleto escolher/recursar/desfazer para gerar subconjuntos, permutações e combinações
- Resolver problemas de restrição (N-rainhas, soma de subconjuntos) com poda
- Estimar o tamanho do espaço de busca e justificar a necessidade de poda
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** O padrão: caminho parcial, escolhas candidatas, `caminho.append` → recursão → `caminho.pop`; árvore de decisões desenhada para subconjuntos de {1,2,3}; permutações com marcação de usados; combinações com índice inicial; N-rainhas com conjuntos de colunas e diagonais ocupadas (poda); soma de subconjuntos; sudoku 4×4 como exercício final; comparação com `itertools` (que faz o mesmo em C).

**Exercícios previstos.** `subconjuntos(lista)` em ordem lexicográfica de índices (`call`); `permutacoes(lista)` sem `itertools` (`call` + `source not_uses import`); `n_rainhas(n)` devolvendo o número de soluções (`call` com n = 8 → 92, limite de tempo); `soma_subconjuntos(numeros, alvo)` devolvendo uma solução ou `None` com poda por soma parcial (`call`); `resolver_sudoku4(grade)` (`call`); quiz sobre a ordem de `append`/`pop`.

**Erros comuns a cobrir.** Esquecer o `pop` (desfazer); guardar `caminho` em vez de `caminho[:]` na solução (todas as soluções viram a mesma lista); poda com condição invertida; permutações com elementos repetidos sem tratar.
