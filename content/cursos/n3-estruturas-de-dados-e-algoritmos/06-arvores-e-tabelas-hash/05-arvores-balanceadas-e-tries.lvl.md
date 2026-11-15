---
slug: n3-m6-05-arvores-balanceadas-e-tries
titulo: Árvores balanceadas e tries
descricao: Por que balancear (AVL por rotações, ideia das rubro-negras e B-trees), e a trie para prefixos e autocompletar.
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
- Implementar rotações e inserção em AVL mantendo a altura O(log n)
- Descrever a ideia das árvores rubro-negras e B-trees e onde são usadas (bancos de dados, sistemas de arquivos)
- Implementar uma trie com inserção, busca de prefixo e autocompletar
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Fator de balanceamento, rotações simples e duplas, inserção AVL com atualização de altura; rubro-negras e B-trees apenas conceitualmente (invariantes, por que discos gostam de B-trees); `bisect` + lista como alternativa pragmática; trie: nós com dicionário de filhos, `fim_de_palavra`, inserção, busca, `com_prefixo`, contagem, aplicação em autocompletar e corretor simples.

**Exercícios previstos.** `rotacao_esquerda`/`rotacao_direita` (`expr` conferindo estrutura); `AVL.inserir` com 10^4 inserções ordenadas resultando em altura ≤ 1,44 log₂ n (`expr`); `Trie` com `inserir`, `contem`, `com_prefixo` (`expr`); `autocompletar(trie, prefixo, k)` em ordem alfabética (`expr`); quiz sobre invariantes.

**Erros comuns a cobrir.** Atualizar altura antes de rotacionar; rotação dupla aplicada como simples; trie marcando prefixo como palavra; `com_prefixo` percorrendo a árvore inteira.
