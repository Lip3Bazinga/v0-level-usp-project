---
slug: n1-m5-04-tuplas-e-desempacotamento
titulo: Tuplas e desempacotamento
descricao: Sequências que não mudam, troca de valores em uma linha, registros simples e funções que devolvem mais de um valor.
dificuldade: iniciante
tipo: guiada
runtime: python
bibliotecas: []
xp: 90
tempo_min: 35
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Criar tuplas e explicar quando preferir uma tupla a uma lista
- Desempacotar tuplas em variáveis, inclusive em laços
- Devolver mais de um valor de uma função com tupla
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Tupla como lista imutável (`TypeError` ao atribuir); parênteses opcionais e a tupla de um elemento `(x,)`; desempacotamento `a, b = b, a`; lista de tuplas como tabela (`("Ana", 9.5)`); `for nome, nota in alunos`; função que devolve dois valores (`return minimo, maximo`). Quando usar: registro fixo, chave de dicionário (próxima lição), retorno múltiplo.

**Passos previstos.** Leitura (tuplas) → Exercício: `trocar(a, b)` e `min_max(lista)` devolvendo tupla (`call` com `type: tuple`) → Exercício: percorrer uma lista de tuplas `(produto, preco, quantidade)` e imprimir o total de cada linha (`io` exato) → Quiz (3 perguntas: tupla muda?; `(1)` vs `(1,)`; desempacotamento com quantidade errada).

**Erros comuns a cobrir.** `t[0] = 5`; `(1)` achando que é tupla; desempacotar 3 valores em 2 variáveis (`ValueError`); devolver lista onde o enunciado exige tupla (o caso `type: tuple` reprova).
