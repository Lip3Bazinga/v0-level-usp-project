---
slug: n1-m5-02-metodos-e-fatias
titulo: Métodos de lista e fatias
descricao: insert, remove, pop, sort, sorted, index e count, mais fatias [início:fim:passo] e cópias.
dificuldade: iniciante
tipo: guiada
runtime: python
bibliotecas: []
xp: 110
tempo_min: 45
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Usar os métodos mais comuns de lista e prever o que cada um devolve
- Extrair partes de uma lista com fatias, inclusive invertendo com passo negativo
- Diferenciar sort() de sorted() e cópia de referência
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Métodos que modificam no lugar (`append`, `insert`, `remove`, `pop`, `sort`, `reverse`) vs os que devolvem algo (`index`, `count`, `sorted`); fatias com fim exclusivo, omissões (`[:3]`, `[3:]`), passo e `[::-1]`; `lista2 = lista` aponta para a mesma lista (desenhar as etiquetas) e `lista[:]`/`list()` para copiar.

**Passos previstos.** Leitura (métodos) → Exercício: a partir de uma lista dada, executar uma sequência de operações e deixar a lista no estado pedido (`variable`) → Leitura (fatias e cópias) → Exercício: `metade_inicial(lista)`, `inverter(lista)` sem `reverse` e `a_cada_dois(lista)` (`call`; `source not_calls reverse`) → Quiz (3 perguntas: `sort` devolve `None`; `[1:3]`; cópia vs referência) → Exercício: remover um item só se existir, usando `in` antes de `remove` (`call`).

**Erros comuns a cobrir.** `lista = lista.sort()`; `remove` de item ausente (`ValueError`); `pop()` sem guardar o retorno quando era preciso; fatia `[1:3]` esperando 3 itens; modificar a "cópia" e ver a original mudar.
