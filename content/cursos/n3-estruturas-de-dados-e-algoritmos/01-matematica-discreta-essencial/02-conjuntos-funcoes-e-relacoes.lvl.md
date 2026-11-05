---
slug: n3-m1-02-conjuntos-funcoes-e-relacoes
titulo: Conjuntos, funções e relações
descricao: Operações com conjuntos, produto cartesiano, funções injetoras/sobrejetoras/bijetoras e relações de equivalência e ordem.
dificuldade: intermediario
tipo: guiada
runtime: python
bibliotecas: []
xp: 100
tempo_min: 40
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Aplicar operações de conjuntos e o princípio da inclusão-exclusão
- Classificar funções como injetoras, sobrejetoras ou bijetoras a partir de seu mapeamento
- Reconhecer relações de equivalência (partições) e de ordem (ordenação topológica) em dados
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Conjuntos (revisão do `set`) e inclusão-exclusão para 2 e 3 conjuntos; produto cartesiano com `itertools.product`; funções como dicionários (domínio → contradomínio), injetora (sem repetição de valores), sobrejetora, bijetora (inversível — gancho para hashing e criptografia); relações como conjuntos de pares, reflexiva/simétrica/transitiva; classes de equivalência (gancho para union-find); ordem parcial (gancho para ordenação topológica).

**Exercícios previstos.** `inclusao_exclusao(a, b, c)` (`call`); `classificar_funcao(mapa, contradominio)` devolvendo `"injetora"`, `"sobrejetora"`, `"bijetora"` ou `"nenhuma"` (`call`); `eh_equivalencia(pares, elementos)` (`call`); `classes_de_equivalencia(pares, elementos)` devolvendo partições ordenadas (`call`); quiz sobre inversa e bijeção.

**Erros comuns a cobrir.** Inclusão-exclusão esquecendo de somar a interseção tripla de volta; checar transitividade só nos pares dados sem combinar; confundir domínio e imagem.
