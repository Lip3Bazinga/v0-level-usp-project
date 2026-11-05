---
slug: n1-m4-03-acumuladores-e-contadores
titulo: Acumuladores e contadores
descricao: Somar, contar, calcular média e encontrar o maior valor com uma variável que acumula a cada volta.
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
- Implementar somatório, contagem e média com acumuladores inicializados corretamente
- Encontrar o maior e o menor valor de uma sequência sem usar max() e min()
- Explicar onde inicializar o acumulador e por que
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** O padrão acumulador: inicializar antes do laço (`total = 0`), atualizar dentro (`total += x`), usar depois. Contador como acumulador de 1 em 1; média = soma / quantidade (cuidado com divisão por zero); maior/menor com inicialização pelo primeiro elemento (ou com um valor impossível e por que isso é frágil). Acumulador de texto (`resultado += letra`).

**Passos previstos.** Leitura (acumuladores) → Exercício: `media_de_notas(n)` lendo `n` notas (`io` com `stdin`) → Exercício: `maior_de(lista)` e `menor_de(lista)` sem `max`/`min` (`call`; `source not_calls max`) → Quiz (2 perguntas) → Exercício: fatorial com acumulador multiplicativo (`call`, incluindo `0! = 1`).

**Erros comuns a cobrir.** Inicializar o acumulador dentro do laço; inicializar `maior = 0` e falhar com negativos; média com `n = 0`; produto inicializado em 0.
