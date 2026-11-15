---
slug: n3-m8-04-gulosos-vs-dp
titulo: Algoritmos gulosos vs programação dinâmica
descricao: Quando a escolha local ótima basta (escalonamento de intervalos, Huffman, troco canônico) e quando não (mochila 0/1, troco arbitrário).
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
- Implementar escalonamento de intervalos, mochila fracionária e codificação de Huffman
- Reconhecer quando um guloso é correto (argumento de troca) e construir contraexemplos quando não é
- Escolher entre guloso, DP e busca completa dado um problema novo
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Seleção de atividades (ordenar por fim), mochila fracionária, troco com moedas canônicas vs não canônicas (contraexemplo), Huffman com heap (compressão); o argumento de troca em uma página; tabela de decisão: guloso (prova de troca) → DP (sobreposição + subestrutura) → backtracking/branch-and-bound; menção a heurísticas e aproximação (gancho para ML/otimização).

**Exercícios previstos.** `maximo_de_atividades(intervalos)` (`call`); `mochila_fracionaria(itens, capacidade)` (`call` + `tolerance`); `huffman(frequencias)` devolvendo os comprimentos dos códigos e o custo total (`call`); `troco_guloso_falha(moedas, valor)` que devolve um contraexemplo comparando com a DP (`call`); quiz com quatro problemas para classificar.

**Erros comuns a cobrir.** Ordenar atividades por início; mochila fracionária com itens inteiros; Huffman com desempate não determinístico (o enunciado fixa a regra); aplicar guloso em troco arbitrário.
