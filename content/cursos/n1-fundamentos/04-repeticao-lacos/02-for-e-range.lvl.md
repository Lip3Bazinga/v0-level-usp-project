---
slug: n1-m4-02-for-e-range
titulo: for e range
descricao: Repetir um número conhecido de vezes com for e range(início, fim, passo).
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
- Usar range com um, dois e três argumentos e prever a sequência gerada
- Escolher entre for e while conforme o problema
- Percorrer os caracteres de uma string com for
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** `for i in range(n)`: o fim é exclusivo; `range(inicio, fim)` e `range(inicio, fim, passo)` (inclusive passo negativo); a variável do laço; `for` sobre uma string; `for` quando se sabe quantas vezes, `while` quando depende de condição. `list(range(...))` para enxergar a sequência.

**Passos previstos.** Leitura (for e range) → Exercício: imprimir os pares de 2 a 20 e, depois, de 10 a 1 (`io` exato; `source uses for`) → Exercício: função `soma_ate(n)` que soma de 1 a n com `for` (`call`; `source not_uses while`) → Quiz (3 perguntas: `range(5)`, `range(1, 10, 3)`, última linha impressa) → Exercício: contar vogais de uma palavra percorrendo caractere por caractere (`call`).

**Erros comuns a cobrir.** `range(1, 10)` para ir até 10; `for i in range(len(x))` sem necessidade; alterar `i` dentro do laço achando que afeta o `range`; esquecer os dois-pontos.
