---
slug: n1-m1-01-hardware-bits-e-bytes
titulo: Hardware, bits e bytes
descricao: O que há dentro do computador, como processador e memória conversam e por que tudo vira 0 e 1.
dificuldade: iniciante
tipo: guiada
runtime: python
bibliotecas: []
xp: 80
tempo_min: 30
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Nomear as partes principais de um computador (CPU, RAM, armazenamento, entrada e saída) e a função de cada uma
- Explicar o que é um bit e um byte e converter entre KB, MB e GB
- Descrever, em linhas gerais, como texto e imagens são guardados como números
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** O modelo simplificado de von Neumann: a CPU executa instruções, a RAM guarda dados e programas em uso, o SSD/HD guarda o que precisa sobreviver ao desligar, e teclado/tela são entrada e saída. Em seguida, o bit como a menor unidade (ligado/desligado), o byte como grupo de 8 bits, as unidades (KB, MB, GB) e dois exemplos concretos de codificação: letras como números (tabela ASCII/Unicode) e imagens como grades de pixels RGB.

**Passos previstos.** Leitura (hardware, com a analogia da cozinha: cozinheiro = CPU, bancada = RAM, despensa = armazenamento) → Leitura (bits, bytes e unidades) → Quiz de 3 perguntas → Exercício leve: executar `print(ord("A"))` e `print(chr(66))` e registrar na variável `codigo_a` o número que o Python mostrou (primeiro contato com o botão Verificar).

**Erros comuns a cobrir.** Confundir memória RAM com armazenamento ("meu computador tem 512 GB de memória"); achar que 1 KB = 1000 bytes é sempre errado (explicar os dois usos); esquecer as aspas em `ord(A)`.
