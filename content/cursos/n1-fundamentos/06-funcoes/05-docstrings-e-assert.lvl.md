---
slug: n1-m6-05-docstrings-e-assert
titulo: Docstrings e assert
descricao: Documentar o que a função faz e testar com assert antes de dizer que está pronta.
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
- Escrever docstrings curtas com o que a função recebe e devolve
- Escrever testes com assert para casos normais e de borda
- Explicar como um assert que falha ajuda a achar o erro
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Docstring entre três aspas na primeira linha da função e `help()`; o que descrever (o que faz, parâmetros, retorno, exemplo); `assert expressao, mensagem`; organizar os testes em uma função `testar()`; escolher casos: típico, borda (0, vazio, negativo), inválido; a mentalidade "escreva o teste antes da função" com um exemplo guiado. Antecipa o módulo 8.

**Passos previstos.** Leitura (docstrings) → Exercício: adicionar docstring a duas funções dadas (`expr` conferindo `funcao.__doc__` não vazio e contendo palavra-chave do enunciado) → Leitura (assert e casos de borda) → Exercício: escrever `testar_eh_par()` com pelo menos quatro asserts, incluindo 0 e negativo (`source calls` ... e `expr` que executa `testar_eh_par()` sem erro; mutante via `expr` que redefine `eh_par` errada e espera `AssertionError`) → Quiz (3 perguntas) → Exercício: implementar `arredondar_nota(nota)` para passar nos asserts fornecidos no enunciado (`call`).

**Erros comuns a cobrir.** Docstring como comentário `#`; `assert` com parênteses e vírgula (`assert (x, "msg")` sempre passa); testar só o caso feliz; assert comparando float com `==` sem arredondar.
