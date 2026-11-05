---
slug: n7-m2-03-templates-e-versionamento-de-prompts
titulo: Templates, variáveis e versionamento de prompts
descricao: 'Prompts como código: templates com variáveis, escape de dados, biblioteca de prompts com versão, testes de regressão e registro de qual versão gerou cada resposta.'
dificuldade: avancado
tipo: guiada
runtime: python
bibliotecas: []
xp: 100
tempo_min: 40
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Implementar templates de prompt com variáveis obrigatórias e escape de dados do usuário
- Versionar prompts e registrar a versão usada em cada chamada
- Escrever testes de regressão para prompts com casos fixos
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** `string.Template`/f-strings com validação de variáveis faltantes; escapar delimitadores no dado do usuário; `PromptVersionado(nome, versao, template)`; registro (`logging`) de nome+versão+hash; testes (`unittest`) que rodam casos fixos contra o simulado e falham se a saída mudar; organização em arquivos (`prompts/`); changelog de prompts.

**Exercícios previstos.** `renderizar(template, variaveis)` levantando `VariavelFaltante` (`call` + `raises`); `escapar_dados(texto, delimitador)` (`call`); classe `BibliotecaDePrompts` com `obter(nome, versao)` e `ultima` (`expr`); suíte `unittest` de regressão para um prompt (`unittest expect: pass` + mutante que muda o template e deve falhar); quiz.

**Erros comuns a cobrir.** Dado do usuário contendo o delimitador (quebra o prompt — e é o início do prompt injection); variáveis não preenchidas silenciosas; mudar prompt em produção sem versão; testes que dependem de aleatoriedade.
