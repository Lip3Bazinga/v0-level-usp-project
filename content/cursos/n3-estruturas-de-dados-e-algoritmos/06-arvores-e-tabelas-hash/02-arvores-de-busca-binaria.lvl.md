---
slug: n3-m6-02-arvores-de-busca-binaria
titulo: Árvores de busca binária
descricao: Inserção, busca, mínimo/máximo, sucessor, remoção com os três casos, validação e o problema do desbalanceamento.
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
- Implementar inserção, busca e remoção (três casos) em uma BST
- Validar se uma árvore é BST usando limites e explicar por que checar só os filhos não basta
- Mostrar que a BST degenera em lista com entrada ordenada e medir o custo
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Invariante da BST; busca e inserção O(h); em-ordem produz ordenado (tree sort); mínimo/máximo e sucessor; remoção: folha, um filho, dois filhos (substituir pelo sucessor); validação com intervalos (min, max); altura média com inserção aleatória ≈ 2 ln n vs degeneração com entrada ordenada; `k`-ésimo menor com contagem de subárvore.

**Exercícios previstos.** Classe `BST` com `inserir`, `buscar`, `em_ordem` (`expr`); `remover` nos três casos (`expr` conferindo o em-ordem resultante); `eh_bst(raiz)` com árvore 'quase BST' que engana a verificação ingênua (`expr`); `altura_media(n, semente)` vs inserção ordenada (`call`); `k_esimo_menor(raiz, k)` (`expr`); quiz sobre remoção com dois filhos.

**Erros comuns a cobrir.** Validar só `esq.valor < no.valor < dir.valor`; remoção perdendo a subárvore do nó removido; inserir duplicatas sem política definida (o enunciado define: ignorar); sucessor procurado do lado errado.
