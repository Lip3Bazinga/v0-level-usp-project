---
slug: n1-m6-03-escopo
titulo: Escopo de variáveis
descricao: Variáveis locais e globais, por que uma função não enxerga a outra e por que evitar global.
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
- Diferenciar variáveis locais e globais e prever NameError e UnboundLocalError
- Passar dados por parâmetro e devolver por return em vez de usar variáveis globais
- Explicar o que a palavra-chave global faz e por que raramente é boa ideia
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Cada chamada tem suas próprias variáveis (locais), que somem no fim; a função lê globais, mas atribuir cria uma local nova (o `UnboundLocalError` de `contador += 1`); `global` existe, funciona e é fonte de bugs; a regra prática: entra por parâmetro, sai por `return`. Teste de mesa com dois quadros (global e local).

**Passos previstos.** Leitura (escopo) → Exercício "o que imprime": prever a saída de três programas e registrar em variáveis (`variable`) → Exercício: refatorar uma função que usa `global saldo` para receber e devolver o saldo (`call` + `source` sem `global`: verificar via `expr` que a variável global não mudou) → Quiz (3 perguntas) → Exercício: `aplicar_desconto(preco, percentual)` puro, sem tocar em variáveis externas (`call` + `expr`).

**Erros comuns a cobrir.** Usar uma variável local fora da função; esperar que a função altere o argumento numérico (`x = 5; dobrar(x)` não muda `x`); `global` para "resolver"; mesmo nome dentro e fora e confusão de qual mudou.
