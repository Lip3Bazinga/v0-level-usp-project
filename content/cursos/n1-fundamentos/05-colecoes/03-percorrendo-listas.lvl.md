---
slug: n1-m5-03-percorrendo-listas
titulo: Percorrendo listas
descricao: for sobre elementos, enumerate para índice e valor, zip para listas paralelas e os perigos de alterar durante a iteração.
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
- Percorrer listas com for, enumerate e zip e escolher a forma adequada
- Construir uma nova lista a partir de outra (filtrar e transformar) com laço
- Explicar por que remover itens enquanto percorre dá errado e como evitar
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** `for x in lista` vs `for i in range(len(lista))` vs `enumerate` (quando você precisa do índice); `zip` para duas listas lado a lado (nomes e notas); construir listas novas (filtrar pares, dobrar valores) com acumulador de lista; `sum`, `min`, `max` como atalhos; o bug clássico de `remove` dentro do `for`.

**Passos previstos.** Leitura (formas de percorrer) → Exercício: imprimir um ranking numerado a partir de uma lista de nomes com `enumerate(start=1)` (`io` exato) → Exercício: `apenas_pares(lista)` e `dobrados(lista)` devolvendo listas novas (`call`) → Exercício: `media_ponderada(notas, pesos)` com `zip` (`call` com `tolerance`) → Quiz (3 perguntas, incluindo "o que imprime" ao remover durante o for) → Exercício: `remover_negativos(lista)` sem alterar a lista original (`call` + `expr` conferindo que a original ficou intacta).

**Erros comuns a cobrir.** Remover durante a iteração (pula elementos); `enumerate` com a ordem `(valor, indice)` trocada; `zip` com listas de tamanhos diferentes; alterar a lista de entrada quando o enunciado pede uma nova.
