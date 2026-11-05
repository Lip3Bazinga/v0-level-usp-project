---
slug: n1-m8-01-tipos-de-erro-e-tracebacks
titulo: Tipos de erro e como ler um traceback
descricao: Erros de sintaxe, de execução e de lógica; ValueError, TypeError, ZeroDivisionError, IndexError e KeyError; o traceback de baixo para cima.
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
- Classificar um problema como erro de sintaxe, de execução ou de lógica
- Reconhecer as exceções mais comuns pela mensagem e pela causa
- Ler um traceback com várias chamadas e apontar a linha responsável
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** As três famílias (sintaxe: nem roda; execução: para no meio; lógica: roda e dá resposta errada — a pior). Catálogo das exceções que o aluno já encontrou: `ValueError`, `TypeError`, `ZeroDivisionError`, `IndexError`, `KeyError`, `NameError`, `AttributeError`. Traceback com funções aninhadas: a última linha diz o quê, a cadeia acima diz onde e por qual caminho; "most recent call last" explicado.

**Passos previstos.** Leitura (famílias de erro) → Exercício: para cinco trechos, registrar o nome da exceção que cada um levanta (`variable`) → Leitura (anatomia do traceback) → Exercício: dado um traceback de três níveis no enunciado, registrar o número da linha e o nome da função onde o erro aconteceu (`variable`) → Quiz (3 perguntas) → Exercício: consertar um programa com um erro de execução e um de lógica (`call` + `io`).

**Erros comuns a cobrir.** Ler só a primeira linha do traceback; corrigir a linha errada (a chamadora em vez da chamada); achar que erro de lógica é "o Python errou"; confundir `KeyError` com `IndexError`.
