---
slug: n1-m2-04-strings-e-f-strings
titulo: Strings e f-strings
descricao: Juntar textos, medir com len(), repetir com * e montar mensagens com f-strings e formatação de casas decimais.
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
- Concatenar e repetir strings e medir o tamanho com len()
- Montar mensagens com f-strings incluindo expressões e variáveis
- Formatar números com casas decimais fixas dentro de uma f-string
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** String como sequência de caracteres; `+` concatena e `*` repete; `len()`; não dá para somar texto com número (`TypeError`) — daí a conversão `str()` ou, melhor, a f-string. F-strings com variáveis e expressões (`f"{preco * 2}"`), com `:.2f` para duas casas e `:,` para milhar como aperitivo (o módulo 7 aprofunda).

**Passos previstos.** Leitura (strings e operadores) → Exercício: montar `saudacao` a partir de `nome` e `sobrenome` com espaço no meio e imprimir o tamanho (`variable` + `io`) → Leitura (f-strings) → Exercício: imprimir um recibo com nome, quantidade e total calculado dentro da f-string, com duas casas decimais (`io` exato; `source uses f_string`) → Quiz (2 perguntas) → Exercício: linha decorativa `"=" * 20` ao redor de um título (`io`).

**Erros comuns a cobrir.** `"Idade: " + 20` (TypeError); esquecer o `f` antes das aspas e imprimir as chaves literalmente; `{preco:.2f}` fora da f-string; espaço faltando na concatenação.
