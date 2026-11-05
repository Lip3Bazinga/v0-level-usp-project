---
slug: n1-m5-01-listas
titulo: Listas
descricao: 'Guardar vários valores em ordem: criar, acessar por índice, medir, acrescentar e alterar.'
dificuldade: iniciante
tipo: guiada
runtime: python
bibliotecas: []
xp: 100
tempo_min: 40
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Criar listas, acessar elementos por índice positivo e negativo e alterar posições
- Usar len(), append() e in e prever IndexError
- Explicar que uma lista pode mudar (mutável) e o que isso implica
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Lista como sequência mutável de qualquer tipo; índices começam em 0; índice negativo conta do fim; `len`; `append`; `in`; alterar `lista[i] = x`; `IndexError`; lista vazia e lista de listas (breve). Diferença entre a lista e a string (imutável) como gancho para o módulo 7.

**Passos previstos.** Leitura (listas e índices) → Exercício: criar `compras` com os itens do enunciado, acrescentar um, trocar o segundo e imprimir o último (`variable` + `io`) → Exercício: função `ultimo_e_primeiro(lista)` devolvendo uma lista com os dois (`call`) → Quiz (3 perguntas: `lista[-1]`, `len`, o que dá `lista[3]` com 3 itens) → Exercício: montar uma lista com `n` números lidos do teclado via `append` (`io`).

**Erros comuns a cobrir.** `lista[len(lista)]`; `lista.append(a, b)`; achar que `append` devolve a nova lista (`lista = lista.append(x)` vira `None`); confundir `lista[0]` com o primeiro "número 1".
