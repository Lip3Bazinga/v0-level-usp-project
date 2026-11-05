---
slug: n1-m6-04-argumentos-padrao-e-nomeados
titulo: Argumentos padrão e nomeados
descricao: Parâmetros opcionais com valor padrão, chamadas com nome dos argumentos e o cuidado com listas como padrão.
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
- Definir parâmetros com valor padrão e chamar funções omitindo-os
- Usar argumentos nomeados para deixar chamadas legíveis e fora de ordem
- Explicar por que uma lista como valor padrão causa bugs e como evitar
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** `def saudacao(nome, saudacao="Olá")`; padrões ficam no fim; chamadas nomeadas `print(a, b, sep=", ")` como exemplo que o aluno já usou; mistura de posicionais e nomeados; o padrão mutável (`def adicionar(item, lista=[])`) e a solução com `None`. `*args` apenas citado (Nível 2).

**Passos previstos.** Leitura (padrões e nomeados) → Exercício: `formatar_preco(valor, moeda="R$", casas=2)` (`call` com combinações posicionais e nomeadas) → Exercício: consertar `adicionar_tarefa(tarefa, lista=[])` usando `None` (`call` chamando duas vezes sem a lista e exigindo listas independentes) → Quiz (3 perguntas: padrão antes de obrigatório; nomeado fora de ordem; padrão mutável).

**Erros comuns a cobrir.** Parâmetro padrão antes de obrigatório (SyntaxError); nomeado antes de posicional; padrão mutável compartilhado; chamar com nome de parâmetro inexistente (`TypeError`).
