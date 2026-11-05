---
slug: n1-m2-03-numeros-e-operadores
titulo: Números e operadores
descricao: Soma, subtração, multiplicação, divisão, divisão inteira, resto e potência, com precedência e arredondamento.
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
- Usar +, -, *, /, //, % e ** e prever o tipo do resultado
- Aplicar a precedência dos operadores e usar parênteses para alterá-la
- Resolver problemas simples com resto da divisão (par/ímpar, dígitos, troco)
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Os sete operadores aritméticos; `/` sempre devolve float; `//` e `%` para dividir "do jeito da escola" (quociente e resto); `**` para potência; precedência (potência → multiplicação/divisão → soma/subtração) e parênteses; `round()`, `abs()`, e os operadores de atribuição composta (`+=`). Exemplos com dinheiro (centavos para evitar float) e tempo (segundos → minutos e segundos com `//` e `%`).

**Passos previstos.** Leitura (operadores e tipos dos resultados) → Exercício: calcular e imprimir seis expressões dadas (`io` exato) → Exercício: converter segundos em `h:m:s` a partir de uma variável `total_segundos` (verificação `variable` para `horas`, `minutos`, `segundos`) → Quiz (3 perguntas: valor de `7 // 2`, `7 % 2`, `2 ** 3 * 2`) → Exercício: calcular o troco de uma compra em notas de 50, 20, 10, 5 e 1 (`variable`).

**Erros comuns a cobrir.** Usar `/` e obter `3.0` onde se esperava `3`; esquecer parênteses em `(a + b) / 2`; confundir `^` com potência; `%` como porcentagem.
