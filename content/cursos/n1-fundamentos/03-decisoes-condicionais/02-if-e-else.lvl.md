---
slug: n1-m3-02-if-e-else
titulo: if e else
descricao: 'O programa que escolhe um caminho: if, else, indentação e blocos.'
dificuldade: iniciante
tipo: guiada
runtime: python
bibliotecas: []
xp: 100
tempo_min: 40
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Escrever um if/else com indentação correta e prever qual bloco executa
- Explicar por que a indentação faz parte da sintaxe do Python
- Resolver problemas de duas saídas (par/ímpar, aprovado/reprovado, maior de dois)
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** `if condição:` com dois-pontos e bloco indentado (4 espaços); `else`; o que acontece com linhas fora do bloco; fluxograma de decisão; o `%` voltando para par/ímpar. Teste de mesa com os dois caminhos.

**Passos previstos.** Leitura (if/else e indentação) → Exercício: ler um número e imprimir `par` ou `ímpar` (`io` com três `stdin`) → Exercício: função `maior(a, b)` que devolve o maior (`call` com cinco casos, incluindo iguais e negativos — a função é apresentada como "receita com nome", antecipando o módulo 6 só o necessário: `def` + `return`) → Quiz (2 perguntas) → Exercício: aprovação por nota ≥ 6.0 lendo a nota (`io`; `source uses if`).

**Erros comuns a cobrir.** Esquecer os dois-pontos; indentação com tab e espaço misturados; `else` com condição (`else x > 5:`); linha que deveria estar no bloco e ficou fora; imprimir os dois resultados por falta de `else`.
