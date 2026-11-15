---
slug: n2-m4-01-ler-e-escrever-texto
titulo: Ler e escrever arquivos de texto
descricao: open, modos, with, leitura linha a linha, escrita e append, encoding UTF-8.
dificuldade: intermediario
tipo: guiada
runtime: python
bibliotecas: []
xp: 100
tempo_min: 40
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Abrir arquivos com with nos modos r, w e a e explicar o que cada modo faz com o conteúdo
- Ler linha a linha sem carregar tudo na memória e remover o \n
- Escrever e anexar texto com encoding UTF-8 explícito
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** `open(caminho, modo, encoding="utf-8")`; `with` fecha sempre; `read`, `readlines`, iteração linha a linha; `write` não põe `\n`; `w` apaga, `a` anexa, `x` cria; `FileNotFoundError`; encoding e o acento quebrado no Windows. No sandbox os arquivos vivem em `/work`; a verificação usa `expr` lendo o arquivo gravado.

**Exercícios previstos.** `salvar_lista(caminho, itens)` e `carregar_lista(caminho)` (`expr`: `setup` chama salvar, `expr` lê o arquivo); `contar_linhas_nao_vazias(caminho)` com arquivo de dados fornecido (`path=dados.txt`; `call`); `anexar_registro(caminho, texto)` que preserva o conteúdo anterior (`expr`); quiz sobre modos e `with`.

**Erros comuns a cobrir.** Esquecer `encoding`; `w` em vez de `a` apagando dados; `readlines` sem `strip`; não fechar o arquivo (sem `with`); ler arquivo inexistente sem tratar.
