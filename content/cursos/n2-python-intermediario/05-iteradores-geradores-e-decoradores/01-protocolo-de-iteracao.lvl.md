---
slug: n2-m5-01-protocolo-de-iteracao
titulo: O protocolo de iteração
descricao: 'O que o for faz por baixo: iter(), next(), StopIteration e como criar sua própria classe iterável.'
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
- Explicar iterável vs iterador e usar iter() e next() manualmente
- Implementar __iter__ e __next__ em uma classe e usá-la em um for
- Prever quando um iterador se esgota e o que StopIteration significa
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** O `for` desaçucarado (`it = iter(x)`, `next(it)`, `StopIteration`); iterável (tem `__iter__`) vs iterador (tem `__next__` e se esgota); `__iter__` devolvendo `self`; a classe `Contagem(inicio, fim)`; iteradores preguiçosos e infinitos (`Naturais`) com `break`; `zip`, `enumerate`, `reversed` são iteradores.

**Exercícios previstos.** `Contagem(inicio, fim, passo)` iterável (`expr` com `list(...)` e com `next`); `CicloDeCores(lista)` infinito consumido com `itertools.islice` (`expr`); classe `Fila` iterável sobre uma lista interna sem expor a lista (`expr`); quiz sobre esgotamento de iterador e `iter` de lista.

**Erros comuns a cobrir.** `__next__` sem levantar `StopIteration` (laço infinito); `__iter__` que não devolve iterador; reutilizar um iterador esgotado esperando itens; alterar a coleção enquanto itera.
