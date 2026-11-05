---
slug: n1-m6-01-definir-e-chamar
titulo: Definir e chamar funções
descricao: Dar nome a um bloco de código com def, chamar quantas vezes quiser e organizar o programa em partes.
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
- Definir funções com def e chamá-las pelo nome
- Explicar a diferença entre definir e executar uma função
- Organizar um programa repetitivo em funções reutilizáveis
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Função como receita com nome: `def nome():` + bloco; a definição não executa nada; a chamada `nome()`; ordem (definir antes de chamar); funções que só imprimem; eliminar repetição copiando o bloco uma vez só; nomes verbais (`mostrar_menu`, `calcular_total`). Rastrear a execução no teste de mesa (pular para dentro da função e voltar).

**Passos previstos.** Leitura (def e chamada) → Exercício: definir `linha()` que imprime 20 traços e `cabecalho()` que usa `linha()` duas vezes ao redor de um título, chamando ao final (`io` exato; `source defines_function`) → Exercício: refatorar um programa com três blocos iguais para uma função chamada três vezes (`io` + `source defines_function` + `source calls`) → Quiz (3 perguntas: o que acontece sem os parênteses; chamar antes de definir; para que serve `def`).

**Erros comuns a cobrir.** Chamar sem parênteses; definir dentro de um laço sem querer; indentação errada deixando linhas fora da função; chamar antes do `def`; nome da função diferente do pedido (o caso `defines_function` reprova).
