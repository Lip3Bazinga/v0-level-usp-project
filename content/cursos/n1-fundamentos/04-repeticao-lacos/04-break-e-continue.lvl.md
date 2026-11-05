---
slug: n1-m4-04-break-e-continue
titulo: break e continue
descricao: Sair do laço no meio, pular uma volta e o padrão while True com sentinela para validar entradas.
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
- Usar break para encerrar um laço antes da condição e continue para pular uma iteração
- Escrever o padrão while True + break para repetir até uma entrada válida
- Reescrever um laço com flag booleana usando break e vice-versa
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** `break` sai do laço mais interno; `continue` pula para a próxima volta; o padrão `while True:` com `break` para menus e validação de entrada; `else` do laço como curiosidade opcional; quando `break` deixa o código mais claro e quando esconde a lógica.

**Passos previstos.** Leitura (break e continue) → Exercício: ler números até digitar `fim` e imprimir a quantidade lida (`io`) → Exercício: imprimir de 1 a 20 pulando múltiplos de 3 com `continue` (`io` exato + `source uses for`; o uso de `continue` é conferido na revisão do enunciado, pois não há regra de AST para ele) → Quiz (3 perguntas) → Exercício: pedir uma nota entre 0 e 10 até ser válida e só então imprimir `Nota registrada: X` (`io` com `stdin` contendo entradas inválidas antes da válida).

**Erros comuns a cobrir.** `break` fora de laço (SyntaxError); `continue` antes de atualizar o contador em um `while` (laço infinito); usar `break` para sair de um `if`; validar só uma vez em vez de repetir.
