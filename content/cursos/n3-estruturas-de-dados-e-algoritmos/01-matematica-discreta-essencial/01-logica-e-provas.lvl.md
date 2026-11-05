---
slug: n3-m1-01-logica-e-provas
titulo: Lógica proposicional e provas
descricao: Proposições, implicação, equivalências, quantificadores e os tipos de prova (direta, contrapositiva, contradição, indução).
dificuldade: intermediario
tipo: guiada
runtime: python
bibliotecas: []
xp: 100
tempo_min: 45
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Construir tabelas-verdade de proposições compostas e identificar equivalências (De Morgan, contrapositiva)
- Traduzir afirmações com 'para todo' e 'existe' em código que as verifica
- Escrever uma prova por indução simples e implementar a verificação numérica da hipótese
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Proposições e conectivos; implicação e sua tabela (o caso 'falso implica qualquer coisa'); De Morgan e como ele aparece em `not (a and b)`; quantificadores e `all`/`any`; provas: direta, contrapositiva, por contradição (√2 irracional em prosa) e por indução (soma dos n primeiros ímpares = n²). Por que o programador precisa disso: invariantes de laço são provas por indução.

**Exercícios previstos.** `tabela_verdade(expressao)` para expressões com `and/or/not` sobre p, q (`call`); `verificar_de_morgan()` testando as 4 combinações (`call`); `soma_impares(n)` e checagem de `n**2` para n até 1000 (`call`); `invariante_busca(lista, alvo)` que implementa busca linear retornando também a prova de que o alvo não está nos índices anteriores (`call`); quiz sobre implicação e contrapositiva.

**Erros comuns a cobrir.** Achar que 'se chove então molha' implica 'se molha então chove'; De Morgan com `not a and not b`; indução sem o caso base; confundir 'existe' com 'para todo' na negação.
