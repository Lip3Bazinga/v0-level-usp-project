---
slug: n1-m2-05-input-e-conversoes
titulo: input e conversões
descricao: Ler o que a pessoa digita com input(), converter texto em número e montar seus primeiros programas interativos.
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
- Ler texto do usuário com input() e explicar por que o resultado é sempre uma string
- Converter entradas com int() e float() e prever quando a conversão falha
- Escrever um programa completo que lê dados, calcula e imprime um resultado formatado
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** `input()` devolve texto, sempre; a mensagem de prompt; `int()` e `float()` para converter (e `ValueError` quando o texto não é número — a lição 6 e o módulo 8 tratam); `str()` no caminho inverso. Padrão "ler → converter → calcular → imprimir". Entrada com vírgula decimal (erro clássico brasileiro: `float("1,75")`).

**Passos previstos.** Leitura (input e o tipo do resultado) → Exercício: ler nome e cidade e imprimir uma frase (`io` com `stdin` e saída exata) → Exercício: ler dois números e imprimir soma e média com duas casas (`io` com dois conjuntos de `stdin`) → Quiz (2 perguntas: tipo de `input()`; o que `int("3.5")` faz) → Exercício: calculadora de idade em dias a partir do ano de nascimento e ano atual lidos (`io` com dois cenários).

**Erros comuns a cobrir.** `idade = input(...)` e depois `idade + 1`; `int(input())` com texto não numérico; usar vírgula em vez de ponto; imprimir a mensagem de prompt com `print` e depois `input()` sem texto (funciona, mas a saída muda e o caso `io` reprova — reforçar que o enunciado define a saída).
