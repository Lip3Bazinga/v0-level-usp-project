---
slug: n1-m3-01-booleanos-e-comparacoes
titulo: Booleanos e comparações
descricao: True e False, os operadores de comparação e como uma expressão vira uma resposta sim/não.
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
- Avaliar expressões com ==, !=, <, >, <= e >= e prever True ou False
- Diferenciar = (atribuição) de == (comparação)
- Guardar o resultado de uma comparação em uma variável booleana e usá-la
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** O tipo `bool` e os seis operadores de comparação; comparação de strings (ordem alfabética e diferença entre maiúsculas e minúsculas); `=` vs `==`; variáveis booleanas com nomes que leem como perguntas (`eh_maior`, `tem_estoque`); `bool()` de valores vazios como curiosidade (0, "", None são "falsos").

**Passos previstos.** Leitura (bool e comparações) → Exercício: prever e imprimir oito comparações (`io` exato) → Exercício: a partir de `idade`, `saldo` e `preco` criar `pode_votar`, `pode_comprar` e `eh_adulto` (`variable` com `type: bool`) → Quiz (3 perguntas: `"a" < "b"`, `5 == 5.0`, `=` vs `==`).

**Erros comuns a cobrir.** `if x = 5` (SyntaxError); `"10" == 10` (False, tipos diferentes); comparar `"Maria" == "maria"`; escrever `pode_votar = "True"` como texto.
