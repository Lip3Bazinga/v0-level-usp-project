---
slug: n3-m6-01-arvores-binarias-e-percursos
titulo: Árvores binárias e percursos
descricao: Terminologia, representação com nós, altura e tamanho recursivos, percursos em pré/em/pós-ordem e por níveis, e árvores de expressão.
dificuldade: intermediario
tipo: guiada
runtime: python
bibliotecas: []
xp: 110
tempo_min: 45
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Representar árvores binárias com nós e calcular altura, tamanho e folhas recursivamente
- Implementar os quatro percursos e prever a saída de cada um
- Avaliar e imprimir árvores de expressão aritmética
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Raiz, filhos, folhas, altura, profundidade, árvore cheia/completa; `No(valor, esq, dir)`; recursão natural em árvores (a maioria das funções tem 5 linhas); pré/em/pós-ordem e por níveis (fila); árvore de expressão `(3 + 4) * 2`; reconstruir árvore a partir de pré-ordem + em-ordem; serialização simples.

**Exercícios previstos.** `altura`, `tamanho`, `contar_folhas` (`expr` com árvores construídas no `setup`); os quatro percursos devolvendo listas (`expr`); `avaliar_expressao(raiz)` e `para_infixa(raiz)` com parênteses (`expr`); `reconstruir(pre, em)` (`expr`); `eh_simetrica(raiz)` (`expr`); quiz "qual percurso produz esta saída".

**Erros comuns a cobrir.** Altura de árvore vazia (−1 ou 0: o enunciado define); percurso por níveis com pilha em vez de fila; esquecer os parênteses na infixa; recursão sem tratar `None`.
