---
slug: n2-m6-05-git-basico
titulo: 'git básico: versionando seu trabalho'
descricao: init, add, commit, log, diff, status, .gitignore e a mentalidade de commits pequenos com mensagens claras.
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
- Explicar o modelo do git (diretório de trabalho, staging, repositório) e os comandos do ciclo básico
- Escrever mensagens de commit úteis e commits pequenos
- Usar .gitignore e desfazer alterações com restore e revert
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Lição de leitura com quiz e exercício de simulação (não há git no sandbox): por que versionar; o modelo em três áreas; `init`, `status`, `add`, `commit -m`, `log --oneline`, `diff`, `restore`, `revert`; `.gitignore` (`.venv`, `__pycache__`, `.env`); mensagens no imperativo em pt-BR; tutorial passo a passo para repetir no computador com o projeto da agenda.

**Exercícios previstos.** Quiz de 5 perguntas (staging; o que `commit` grava; como ver o histórico; como ignorar arquivos; diferença entre `restore` e `revert`); exercício: implementar `simular_git(comandos)` que mantém o estado de um mini repositório (arquivos modificados → staged → commitados) e devolve o `status` final (`call` com sequências de comandos).

**Erros comuns a cobrir.** Commitar `.env` e `.venv`; `git add .` sem olhar o `status`; mensagem "ajustes"; commits gigantes; `git commit` sem `add`.
