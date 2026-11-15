---
slug: n2-m6-06-git-colaborativo
titulo: 'git colaborativo: branches, merge e pull requests'
descricao: Trabalhar em paralelo com branches, resolver conflitos, GitHub, pull requests e revisão de código.
dificuldade: intermediario
tipo: guiada
runtime: python
bibliotecas: []
xp: 80
tempo_min: 30
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Criar branches, alternar entre elas e integrar com merge
- Resolver um conflito de merge lendo as marcações do git
- Descrever o fluxo de pull request e os pontos de uma boa revisão de código
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Leitura com quiz: `branch`, `switch -c`, `merge`, conflitos (`<<<<<<<`, `=======`, `>>>>>>>`), `remote`, `push`/`pull`, fork, pull request, revisão (comentários construtivos, checklist: testes passam? nomes? comportamento?), proteção da branch principal, CI em um parágrafo (os testes rodam a cada PR — exatamente o que o repositório da própria plataforma faz).

**Exercícios previstos.** Quiz de 5 perguntas; exercício: `resolver_conflito(texto, escolha)` que recebe um arquivo com marcações de conflito e devolve a versão com o lado escolhido (`call` com `"nosso"`/`"deles"`/`"ambos"`); exercício: `ordenar_commits_por_branch(log)` a partir de um `git log` simplificado (`call`).

**Erros comuns a cobrir.** Trabalhar direto na `main`; commitar as marcações de conflito; `push --force` em branch compartilhada; PR gigante sem descrição.
