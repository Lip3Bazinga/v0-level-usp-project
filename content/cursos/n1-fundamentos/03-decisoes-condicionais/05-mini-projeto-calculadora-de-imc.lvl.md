---
slug: n1-m3-05-mini-projeto-calculadora-de-imc
titulo: 'Mini-projeto: calculadora de IMC'
descricao: Um programa completo que lê peso e altura, calcula o IMC e classifica o resultado com validação de entrada.
dificuldade: iniciante
tipo: guiada
runtime: python
bibliotecas: []
xp: 150
tempo_min: 90
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Dividir um problema em funções pequenas (calcular, classificar, formatar)
- Validar entradas e dar mensagens claras para valores inválidos
- Entregar um programa que passa em todos os casos de verificação do enunciado
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Primeiro programa "de verdade" do curso, montado em passos: `calcular_imc(peso, altura)` com arredondamento em 1 casa; `classificar_imc(imc)` com a tabela da OMS (abaixo do peso < 18.5, normal < 25, sobrepeso < 30, obesidade); validação (peso e altura positivos; altura em metros, não em centímetros — detectar `altura > 3` e avisar); o programa principal lendo os dados e imprimindo o relatório no formato exato do enunciado.

**Passos previstos.** Leitura (especificação e exemplos de entrada/saída) → Exercício: `calcular_imc` (`call` com `tolerance`) → Exercício: `classificar_imc` (`call` nas bordas 18.5, 24.9, 25, 29.9, 30) → Exercício: validação `entrada_valida(peso, altura)` (`call`) → Exercício: programa principal com `io` em quatro cenários (normal, sobrepeso, altura em cm, peso negativo) → Quiz de revisão do módulo (3 perguntas).

**Erros comuns a cobrir.** Dividir por altura sem elevar ao quadrado; comparar bordas com `>` em vez de `>=`; imprimir com número de casas diferente do pedido; validar depois de calcular; esquecer de converter a entrada.
