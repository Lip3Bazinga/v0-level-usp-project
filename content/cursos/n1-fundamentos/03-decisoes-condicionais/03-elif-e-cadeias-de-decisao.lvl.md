---
slug: n1-m3-03-elif-e-cadeias-de-decisao
titulo: elif e cadeias de decisão
descricao: Três ou mais caminhos com elif, a ordem das condições e faixas de valores.
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
- Escrever cadeias if/elif/else com várias faixas de valores
- Explicar por que a ordem das condições muda o resultado
- Converter uma tabela de faixas (nota, idade, temperatura) em código
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** `elif` como "senão, se"; apenas o primeiro bloco verdadeiro roda; condições de faixa em ordem crescente ou decrescente (e o bug de colocar `x > 0` antes de `x > 100`); `else` como "todo o resto". Tabela de conceito do ENEM/escola (A/B/C/D) como exemplo.

**Passos previstos.** Leitura (elif e ordem) → Exercício: função `conceito(nota)` devolvendo `"A"`, `"B"`, `"C"` ou `"D"` conforme a tabela do enunciado (`call` com casos nas bordas: 9.0, 8.99, 7.0, 5.0) → Exercício: classificar temperatura lida do teclado em `frio`, `agradável`, `quente` (`io` com três `stdin`) → Quiz (3 perguntas, uma delas "o que imprime" com a ordem errada) → Exercício: faixa etária para ingresso (meia-entrada por idade) com `call`.

**Erros comuns a cobrir.** Vários `if` independentes em vez de `elif` (imprime duas respostas); condições sobrepostas; esquecer o `else` e devolver `None`; borda errada (`>` em vez de `>=`).
