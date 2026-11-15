---
slug: n5-m1-02-derivadas-e-gradiente
titulo: Derivadas e gradiente
descricao: Derivada como taxa de variação, derivada numérica, derivadas parciais, o vetor gradiente e por que ele aponta para a subida mais íngreme.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
xp: 110
tempo_min: 45
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Calcular derivadas de funções simples analiticamente e conferir com diferenças finitas
- Calcular derivadas parciais e o gradiente de funções de várias variáveis
- Interpretar o gradiente geometricamente e usar o gradiente negativo para descer uma função
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Derivada e sua interpretação; regras básicas (potência, soma, produto, exponencial, logaritmo); diferenças finitas centrais como verificador universal (`(f(x+h) - f(x-h)) / 2h`); parciais e gradiente de `f(x, y)`; curvas de nível e o gradiente perpendicular; um passo de descida à mão; a ferramenta `verificar_gradiente` que será usada no curso inteiro e no Nível 6.

**Exercícios previstos.** `derivada_numerica(f, x, h)` (`call` + `tolerance`); `gradiente_numerico(f, ponto)` (`call`); `gradiente_analitico_quadratica(A, b, x)` de `½xᵀAx − bᵀx` conferido com o numérico (`call`); `passo_de_descida(f, grad, x, taxa)` (`call`); quiz sobre a direção do gradiente.

**Erros comuns a cobrir.** `h` grande demais ou pequeno demais (erro de arredondamento); diferença para frente em vez de central; esquecer um termo do gradiente; interpretar o gradiente como ponto em vez de direção.
