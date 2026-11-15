---
slug: n4-m1-03-broadcasting-e-operacoes
titulo: Broadcasting e operações entre arrays
descricao: As regras de broadcasting, np.newaxis, operações linha a linha e coluna a coluna, concatenação e empilhamento.
dificuldade: intermediario
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
xp: 110
tempo_min: 45
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Enunciar as regras de broadcasting e prever o shape do resultado
- Centralizar e escalar colunas de uma matriz sem laços
- Concatenar e empilhar arrays (concatenate, vstack, hstack, stack)
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Regras (alinhar pela direita, dimensão 1 estica); `(n, m) - (m,)` centraliza colunas; `[:, np.newaxis]` para operar por linha; tabela de distâncias entre todos os pares com broadcasting; `concatenate`, `vstack`, `hstack`, `stack`, `split`; `np.tile`/`repeat`.

**Exercícios previstos.** `prever_shape(a_shape, b_shape)` devolvendo o shape ou `None` (`call`); `padronizar_colunas(m)` (`call` + `tolerance` + `source not_uses for`); `matriz_de_distancias(pontos)` n×n (`call` com 500 pontos, limite de tempo); `juntar_tabelas(a, b)` (`call`); quiz com quatro pares de shapes.

**Erros comuns a cobrir.** Tentar `(n, m) - (n,)` (precisa de `[:, None]`); confundir `vstack` e `hstack`; laço duplo para distâncias (tempo estoura).
