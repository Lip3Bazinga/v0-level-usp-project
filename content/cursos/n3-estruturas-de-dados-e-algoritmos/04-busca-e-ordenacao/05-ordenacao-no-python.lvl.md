---
slug: n3-m4-05-ordenacao-no-python
titulo: 'Ordenação no Python: sorted, key, estabilidade e Timsort'
descricao: Ordenar por múltiplos critérios com key e tuplas, inverter só um critério, functools.cmp_to_key e por que Timsort é rápido em dados reais.
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
- Ordenar listas de registros por vários critérios, mistos crescente/decrescente, com key
- Explorar a estabilidade para ordenações encadeadas
- Descrever o Timsort (runs, galloping) e quando ele é O(n)
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** `key` com tuplas `(-nota, nome)`; `operator.itemgetter`/`attrgetter`; ordenação em etapas aproveitando a estabilidade; `cmp_to_key` para comparadores legados; `reverse`; chaves caras calculadas uma vez (Schwartzian transform é o que `key` faz); Timsort: detecta runs ordenados, intercala, O(n) em dados quase ordenados; `sorted` vs `.sort()` e custo de memória.

**Exercícios previstos.** `ordenar_alunos(alunos)` por nota decrescente, idade crescente e nome (`call`); `ordenar_versoes(lista)` com chave que separa números (`"1.10.2" > "1.9"`) (`call`); `ordenar_por_frequencia(palavras)` com desempate alfabético (`call`); `comparador_personalizado` com `cmp_to_key` (`call`); quiz sobre estabilidade e `key` vs `cmp`.

**Erros comuns a cobrir.** `reverse=True` invertendo todos os critérios; chave que devolve tipos não comparáveis (`TypeError`); ordenar strings numéricas como texto; `lista.sort()` em expressão (`None`).
