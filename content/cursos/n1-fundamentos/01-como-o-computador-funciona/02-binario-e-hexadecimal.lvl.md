---
slug: n1-m1-02-binario-e-hexadecimal
titulo: Binário e hexadecimal
descricao: Como contar em base 2 e base 16, converter de e para decimal e entender por que programadores usam hexadecimal.
dificuldade: iniciante
tipo: guiada
runtime: python
bibliotecas: []
xp: 90
tempo_min: 40
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Converter um número decimal pequeno para binário e de volta, à mão
- Ler um número hexadecimal e explicar por que ele é uma abreviação do binário
- Usar os prefixos 0b e 0x e as funções bin() e hex() do Python para conferir conversões
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Sistemas posicionais: o decimal que você já usa (unidades, dezenas, centenas) e a mesma ideia com potências de 2. Conversão decimal → binário por divisões sucessivas e binário → decimal pela soma das potências. Hexadecimal como "4 bits por dígito": por que cores em CSS são `#FF8800` e endereços de memória aparecem em hexa. No Python: `0b1011`, `0x1F`, `bin(11)`, `hex(31)`, `int("1011", 2)`.

**Passos previstos.** Leitura (contar em base 2) → Exercício: converter três números à mão e guardar os resultados em variáveis (`dez_em_binario = "1010"` etc.; verificação `variable`) → Leitura (hexadecimal) → Exercício: usar `bin()`/`hex()`/`int(..., 2)` para imprimir conversões pedidas (verificação `io` com saída exata no enunciado) → Quiz de 3 perguntas (quantos valores cabem em 8 bits, maior número de 4 bits, por que hexa).

**Erros comuns a cobrir.** Ler o binário de trás para frente nas divisões sucessivas; achar que `0b` faz parte do número; usar `int("1011")` sem a base e obter 1011; confundir `bin()` (devolve texto) com um número.
