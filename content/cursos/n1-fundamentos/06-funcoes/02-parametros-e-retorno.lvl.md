---
slug: n1-m6-02-parametros-e-retorno
titulo: Parâmetros e retorno
descricao: 'Funções que recebem dados e devolvem resultados: a diferença decisiva entre return e print.'
dificuldade: iniciante
tipo: guiada
runtime: python
bibliotecas: []
xp: 120
tempo_min: 50
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Definir funções com parâmetros e chamá-las com argumentos
- Devolver valores com return e usá-los em expressões e outras chamadas
- Explicar a diferença entre imprimir e devolver e prever o valor de uma função sem return
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Parâmetros como variáveis que nascem na chamada; argumentos posicionais; `return` encerra a função e entrega um valor; função sem `return` devolve `None`; usar o retorno em contas (`dobro(dobro(3))`); devolver mais de um valor (tupla); `print` dentro de função é efeito, não resultado — a verificação `call` só enxerga o retorno. Diagrama de chamada com setas de ida (argumentos) e volta (retorno).

**Passos previstos.** Leitura (parâmetros) → Exercício: `area_retangulo(base, altura)`, `celsius_para_fahrenheit(c)`, `eh_maior_de_idade(idade)` (`call`) → Leitura (return vs print) → Exercício: consertar três funções que imprimem em vez de devolver (`call` + `source not_calls print` dentro das funções) → Quiz (3 perguntas: valor de função sem return; linha após o return; print vs return) → Exercício: `dividir(a, b)` devolvendo quociente e resto como tupla (`call`, `type: tuple`).

**Erros comuns a cobrir.** `print` no lugar de `return`; código depois do `return` (inalcançável); esquecer de usar o valor devolvido (`soma(2, 3)` sem atribuir); chamar com número errado de argumentos (`TypeError`).
