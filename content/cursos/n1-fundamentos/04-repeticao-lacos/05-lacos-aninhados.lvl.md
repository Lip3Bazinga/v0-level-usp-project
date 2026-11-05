---
slug: n1-m4-05-lacos-aninhados
titulo: Laços aninhados
descricao: 'Um laço dentro do outro: tabuadas, grades, padrões com asteriscos e como contar as iterações.'
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
- Escrever laços aninhados e prever a ordem em que os pares (i, j) aparecem
- Calcular quantas vezes o bloco interno executa
- Montar saídas em grade (tabuada, triângulo de asteriscos) com print e end
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Para cada volta do laço externo, o interno roda inteiro; teste de mesa com pares `(i, j)`; `print(..., end=" ")` para montar linhas; a tabuada completa; triângulos e retângulos de `*`; contar iterações (n × m) como primeira intuição de custo (Nível 3).

**Passos previstos.** Leitura (laços aninhados) → Exercício: tabuada de 1 a 3 no formato exato do enunciado (`io`) → Exercício: triângulo de asteriscos de altura `n` (`io` com dois `stdin`) → Quiz (3 perguntas: ordem dos pares; quantas linhas; o que imprime) → Exercício: função `pares_que_somam(lista, alvo)` que conta pares `(i < j)` cuja soma é o alvo (`call`).

**Erros comuns a cobrir.** Usar a mesma variável nos dois laços; `print` sem `end` quebrando a linha; contar pares duas vezes (`i` e `j` percorrendo tudo); confundir qual laço controla linhas e qual controla colunas.
