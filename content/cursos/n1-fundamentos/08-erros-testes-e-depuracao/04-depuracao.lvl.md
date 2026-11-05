---
slug: n1-m8-04-depuracao
titulo: 'Depuração: encontrando o bug'
descricao: Reproduzir, isolar, inspecionar com print, reduzir o problema e usar o teste de mesa para achar bugs de lógica.
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
- Seguir um roteiro de depuração (reproduzir, isolar, inspecionar, corrigir, testar de novo)
- Usar print estratégico e o teste de mesa para localizar bugs de lógica
- Corrigir programas com bugs plantados sem reescrevê-los do zero
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Roteiro de cinco passos; `print(f"{variavel=}")` para inspecionar; comentar metades do código (busca binária do bug — gancho para o Nível 3); explicar o código em voz alta (pato de borracha); comparar o que esperava com o que aconteceu, linha a linha; reler o enunciado. Um aviso sobre não "consertar" até passar no teste sem entender.

**Passos previstos.** Leitura (o roteiro) → Exercício "bug 1": média que divide pelo tamanho errado (off-by-one) — `call` → Exercício "bug 2": acumulador inicializado dentro do laço — `call` → Exercício "bug 3": condição com `and` em vez de `or` numa validação — `call` → Quiz (3 perguntas) → Exercício "bug 4": função que altera a lista do chamador sem querer — `call` + `expr` que confere que a entrada não mudou.

**Erros comuns a cobrir.** Trocar linhas aleatoriamente até passar; apagar o teste que falha; deixar os `print` de depuração na versão final (os casos `io` reprovam); consertar um bug criando outro por não rodar os testes anteriores.
