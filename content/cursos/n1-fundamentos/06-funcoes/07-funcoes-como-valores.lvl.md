---
slug: n1-m6-07-funcoes-como-valores
titulo: 'Funções como valores: lambda, map, filter e sorted'
descricao: Passar funções como argumento, escrever lambdas curtas e usar map, filter e sorted com key.
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
- Guardar uma função em variável e passá-la como argumento para outra função
- Escrever lambdas de uma expressão e saber quando preferir def
- Usar map, filter e sorted(key=...) para transformar, filtrar e ordenar coleções
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Funções são valores (`f = len; f("abc")`); funções que recebem funções (`aplicar(funcao, lista)`); `lambda` para uma expressão só; `map` e `filter` (convertidos com `list`) e a equivalência com compreensões; `sorted(lista, key=...)` para ordenar por um critério (tuplas por nota, strings por tamanho); `reverse=True`. Preparação para N2 (decoradores) e N5 (passar funções de custo).

**Passos previstos.** Leitura (funções como valores) → Exercício: `aplicar_a_todos(funcao, lista)` e uso com uma função própria (`call`) → Exercício: reescrever duas compreensões com `map`/`filter` e lambda (`call` + `source uses lambda`) → Quiz (3 perguntas) → Exercício: ordenar `alunos` (lista de tuplas) por nota decrescente e por nome com `sorted(key=lambda ...)` (`call`; `source uses lambda`).

**Erros comuns a cobrir.** `lambda` com `return` ou várias linhas; passar `funcao()` (o resultado) em vez de `funcao`; esquecer o `list()` em volta do `map`; `key=nota` chamando a função em vez de passar.
