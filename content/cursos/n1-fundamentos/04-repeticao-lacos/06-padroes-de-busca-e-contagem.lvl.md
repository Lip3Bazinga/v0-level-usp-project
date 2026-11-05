---
slug: n1-m4-06-padroes-de-busca-e-contagem
titulo: Padrões de busca e contagem
descricao: Encontrar o primeiro, verificar se existe, contar ocorrências e checar se todos ou algum cumprem uma condição.
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
- Implementar busca do primeiro elemento que satisfaz uma condição, com flag ou break
- Contar ocorrências e verificar 'todos' e 'algum' com laços
- Reconhecer esses padrões em problemas novos e escolher o adequado
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Quatro padrões que aparecem em todo programa: existe? (flag booleana começando em `False`), qual é o primeiro? (índice ou valor, `break` ao achar, `-1`/`None` se não achar), quantos? (contador com `if`), todos/algum (flag começando em `True`/`False`). Primeiro contato com `in`, `count` e `index` como atalhos que o módulo 5 formaliza — e por que vale saber fazer na mão.

**Passos previstos.** Leitura (os quatro padrões lado a lado) → Exercício: `primeiro_negativo(lista)` devolvendo o índice ou `-1` (`call`) → Exercício: `conta_pares(lista)` e `todos_positivos(lista)` (`call`, incluindo lista vazia) → Quiz (3 perguntas) → Exercício: `eh_primo(n)` testando divisores de 2 até `n - 1` com `break` (`call` com 1, 2, 9, 17, 25).

**Erros comuns a cobrir.** Flag inicializada com o valor errado; `return` dentro do laço devolvendo cedo demais (`todos_positivos` devolvendo `True` no primeiro positivo); `eh_primo(1)` devolvendo `True`; esquecer o caso de lista vazia.
