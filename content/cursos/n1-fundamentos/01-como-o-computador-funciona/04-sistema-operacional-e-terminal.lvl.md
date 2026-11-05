---
slug: n1-m1-04-sistema-operacional-e-terminal
titulo: Sistema operacional e terminal
descricao: O que o sistema operacional faz, como navegar por pastas no terminal e como rodar um arquivo Python no seu computador.
dificuldade: iniciante
tipo: guiada
runtime: python
bibliotecas: []
xp: 80
tempo_min: 35
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Explicar o papel do sistema operacional (processos, arquivos, dispositivos) em uma frase para cada
- Usar os comandos básicos do terminal para listar, entrar em pastas e executar um arquivo .py
- Instalar o Python e um editor no seu próprio computador seguindo um roteiro por sistema
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** O sistema operacional como gerente: processos (vários programas ao mesmo tempo), sistema de arquivos (pastas, caminhos absolutos e relativos, extensões) e dispositivos. O terminal como forma de conversar com o SO por texto: `pwd`/`cd`, `ls`/`dir`, `mkdir`, `python arquivo.py`, `python --version`. Roteiro curto de instalação (Windows: instalador oficial com "Add to PATH"; Linux: `apt`; macOS: `brew`) e do VS Code com a extensão Python. Deixar claro que a plataforma não exige instalação, mas que o aluno deve saber rodar fora dela.

**Passos previstos.** Leitura (o que o SO faz) → Leitura (terminal e caminhos, com uma tabela Windows vs. Linux/macOS) → Quiz de 3 perguntas (o que `cd ..` faz; qual comando roda um arquivo; diferença entre caminho absoluto e relativo) → Leitura (instalação no seu computador) → Exercício leve: gravar em variáveis o comando que lista arquivos no Linux e o que executa `jogo.py` (verificação `variable` com texto exato no enunciado).

**Erros comuns a cobrir.** Digitar `python` no terminal e achar que o programa "não abre" por não saber sair do REPL (`exit()`); confundir a pasta do terminal com a pasta do arquivo; confundir `python` e `python3`.
