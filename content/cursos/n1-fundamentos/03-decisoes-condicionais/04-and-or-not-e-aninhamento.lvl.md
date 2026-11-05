---
slug: n1-m3-04-and-or-not-e-aninhamento
titulo: and, or, not e aninhamento
descricao: Combinar condições com operadores lógicos, usar in e aninhar decisões sem se perder.
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
- Combinar comparações com and, or e not e prever o resultado pela tabela-verdade
- Usar in para testar se um valor está em um texto ou lista
- Decidir entre aninhar ifs e combinar condições, mantendo o código legível
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Tabelas-verdade de `and`, `or` e `not`; precedência (`not` > `and` > `or`) e parênteses; `in` com strings (e listas, como antecipação); comparação encadeada `0 <= x <= 10`; `if` dentro de `if` e quando é melhor achatar com `and`. Curto-circuito como curiosidade (`x != 0 and 10 / x > 1`).

**Passos previstos.** Leitura (operadores lógicos) → Exercício: imprimir o valor de seis expressões lógicas (`io` exato) → Exercício: função `pode_dirigir(idade, tem_cnh)` e `ano_bissexto(ano)` (`call`, com os casos 1900, 2000, 2024, 2023) → Leitura (aninhamento) → Exercício: triagem de atendimento (prioridade por idade e gravidade) com decisões aninhadas (`call` com matriz de casos) → Quiz (3 perguntas).

**Erros comuns a cobrir.** `x == 1 or 2` (sempre verdadeiro); `not x == y` sem parênteses em casos ambíguos; aninhar quatro níveis quando um `and` resolve; bissexto só com `% 4`.
